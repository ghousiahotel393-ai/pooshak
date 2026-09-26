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
  const nav = navigator as any;
  if (typeof File === 'undefined' || typeof nav.canShare !== 'function' || typeof nav.share !== 'function') {
    return null;
  }
  const file = new File([blob], filename, { type: mime });
  if (!nav.canShare({ files: [file] })) return null;
  try {
    await nav.share({ files: [file], title: filename });
    return { method: 'web-share' };
  } catch (e: any) {
    // AbortError => user cancelled the share sheet.
    if (e && (e.name === 'AbortError' || /abort|cancel/i.test(String(e?.message)))) {
      return { method: 'cancelled' };
    }
    return null; // let caller fall back to anchor download
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

    // Installed/standalone PWA (esp. iOS) — anchor download is unreliable there.
    if (isStandalonePWA()) {
      const shared = await saveViaWebShare(blob, filename, mime);
      if (shared) return shared;
    }

    // Desktop browser + Electron: reliable.
    return anchorDownload(blob, filename);
  } catch (e: any) {
    console.error('[saveFile] failed:', e);
    return { method: 'failed', error: e?.message || String(e) };
  }
}
