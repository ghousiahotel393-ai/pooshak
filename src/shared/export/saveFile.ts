/**
 * saveFile — THE single cross-platform file-save primitive for every export.
 *
 * Why this exists: a plain `URL.createObjectURL` + `<a download>.click()` is a
 * no-op inside a Capacitor native WebView (the `download` attribute is ignored)
 * and unreliable in an installed/standalone PWA (esp. iOS). That silently made
 * "Export as PDF/Excel/CSV/Print" appear to succeed while writing nothing.
 *
 * This helper routes the SAME blob to the correct platform mechanism:
 *   - Capacitor native (Android/iOS): write to Documents via @capacitor/filesystem,
 *     then surface it through @capacitor/share so the user can save/open/send it.
 *   - Installed / standalone PWA that supports Web Share with files: use it.
 *   - Everything else (desktop browser, Electron): the standard anchor download,
 *     which works reliably there.
 *
 * It returns how the file was delivered (or 'cancelled'/'failed') so callers can
 * show an ACCURATE toast instead of a false "exported successfully".
 */

export type SaveMethod =
  | 'capacitor-share'
  | 'capacitor-write'
  | 'web-share'
  | 'download'
  | 'cancelled'
  | 'failed';

export interface SaveFileResult {
  method: SaveMethod;
  path?: string;
  error?: string;
}

function isCapacitorNative(): boolean {
  const cap = (typeof window !== 'undefined' && (window as any).Capacitor) || null;
  return !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
}

function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  const mm = typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = (window.navigator as any)?.standalone === true;
  return Boolean(mm || iosStandalone);
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

function anchorDownload(blob: Blob, filename: string): SaveFileResult {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return { method: 'download' };
}

async function saveViaCapacitor(blob: Blob, filename: string): Promise<SaveFileResult> {
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');
  const base64 = await blobToBase64(blob);

  // Write to app Documents so the file persists and has a shareable URI.
  const write = await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Documents,
    recursive: true,
  });
  const uri = write.uri;

  // Surface it so the user can save/open/send it. If the OS share sheet is
  // dismissed the file is already written to Documents — still a success.
  try {
    const canShare = await Share.canShare();
    if (canShare?.value) {
      await Share.share({ title: filename, text: filename, url: uri });
      return { method: 'capacitor-share', path: uri };
    }
  } catch (e: any) {
    if (e && /cancel/i.test(String(e?.message))) {
      return { method: 'capacitor-write', path: uri };
    }
    // fall through — file is still written
  }
  return { method: 'capacitor-write', path: uri };
}

async function saveViaWebShare(blob: Blob, filename: string, mime: string): Promise<SaveFileResult | null> {
  const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
  if (!nav || typeof File === 'undefined' || typeof nav.canShare !== 'function' || typeof nav.share !== 'function') {
    return null;
  }

  // 1. Try sharing with the file's primary mime type
  let file = new File([blob], filename, { type: mime });
  let canShare = false;
  try {
    canShare = Boolean(nav.canShare({ files: [file] }));
  } catch {
    canShare = false;
  }

  // 2. If rejected (common on iOS WebKit for .xlsx / .csv), try generic binary mime
  if (!canShare && mime !== 'application/octet-stream') {
    try {
      file = new File([blob], filename, { type: 'application/octet-stream' });
      canShare = Boolean(nav.canShare({ files: [file] }));
    } catch {
      canShare = false;
    }
  }

  // 3. If canShare still false, try without explicit mime type
  if (!canShare) {
    try {
      file = new File([blob], filename);
      canShare = Boolean(nav.canShare({ files: [file] }));
    } catch {
      canShare = false;
    }
  }

  if (!canShare) return null;

  try {
    await nav.share({ files: [file], title: filename });
    return { method: 'web-share' };
  } catch (e: any) {
    // AbortError => user cancelled / dismissed the share sheet
    if (e && (e.name === 'AbortError' || /abort|cancel/i.test(String(e?.message)))) {
      return { method: 'cancelled' };
    }
    console.warn('[saveFile] Web Share failed, falling back:', e);
    return null;
  }
}

/**
 * Save a blob to the device using the best mechanism for the current platform.
 * MUST be called from a user gesture (button click) for share/download to work.
 */
export async function saveFile(blob: Blob, filename: string, mime = 'application/octet-stream'): Promise<SaveFileResult> {
  try {
    if (isCapacitorNative()) {
      try {
        return await saveViaCapacitor(blob, filename);
      } catch (e: any) {
        console.error('[saveFile] Capacitor save failed, no browser fallback on native:', e);
        return { method: 'failed', error: e?.message || 'Native file save failed' };
      }
    }

    // Installed / standalone PWA (esp. iOS) — a raw <a download> is unreliable there, so
    // prefer Web Share. On a REGULAR browser tab (desktop or mobile web) do NOT use Web Share:
    // export generation is async, so by the time share() is called the transient user-gesture
    // has expired and it throws — which previously made "Export as PDF" silently do nothing.
    // Regular browsers download reliably via the anchor, so use that.
    if (isStandalonePWA()) {
      const shared = await saveViaWebShare(blob, filename, mime);
      if (shared) return shared;
    }

    // Desktop browser / mobile web / Electron / fallback: standard anchor download.
    return anchorDownload(blob, filename);
  } catch (e: any) {
    console.error('[saveFile] failed:', e);
    return { method: 'failed', error: e?.message || String(e) };
  }
}
