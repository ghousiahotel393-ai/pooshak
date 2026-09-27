/**
 * chunkReload — self-heal for "Importing a module script failed" / stale code-split chunks.
 *
 * After a deploy, the freshly-served index.html references NEW content-hashed chunk files.
 * A tab that was opened on the OLD build still asks for OLD chunk URLs; those 404 once the
 * deploy rotates them, and any `import()` (a lazy route, a dynamic vendor import) throws a
 * ChunkLoadError. The permanent fix is to reload ONCE so the browser fetches the fresh
 * index.html + chunk manifest — guarded so a genuinely persistent failure can never loop.
 */

const RELOAD_TS_KEY = 'zpos_chunk_reload_ts';
// If we auto-reloaded within this window and it STILL fails, treat it as persistent and stop
// (show the fallback UI) instead of looping. A stale chunk that appears later in the session
// (> window) can still self-heal again.
const RELOAD_WINDOW_MS = 15000;

export function isChunkLoadError(err: unknown): boolean {
  if (!err) return false;
  const anyErr = err as any;
  const name = String(anyErr?.name || '');
  const msg = String(anyErr?.message || anyErr || '');
  if (name === 'ChunkLoadError') return true;
  return /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|dynamically imported module|Loading chunk [\d]+ failed|Loading CSS chunk/i.test(
    msg
  );
}

/**
 * Trigger exactly one guarded reload. Returns true if a reload was started (caller should
 * stop rendering / swallow the error), false if we already reloaded recently (caller should
 * surface the error to the fallback UI).
 */
export function tryChunkReload(): boolean {
  if (typeof window === 'undefined') return false;
  let last = 0;
  try {
    last = Number(window.sessionStorage.getItem(RELOAD_TS_KEY) || 0);
  } catch {
    /* sessionStorage unavailable — fall through and attempt a single reload */
  }
  const now = Date.now();
  if (now - last < RELOAD_WINDOW_MS) {
    // We already reloaded moments ago and it failed again → persistent problem, don't loop.
    return false;
  }
  try {
    window.sessionStorage.setItem(RELOAD_TS_KEY, String(now));
  } catch {
    /* ignore */
  }
  window.location.reload();
  return true;
}
