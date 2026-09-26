/**
 * pwaAutoReload — guarantees a shipped update actually reaches the running client.
 *
 * VitePWA is configured `autoUpdate` + `skipWaiting` + `clientsClaim`, so a new
 * service worker installs and takes control on the next visit. But the ALREADY
 * loaded tab keeps running the OLD bundle until it reloads — which is exactly why
 * a fix that is live in source can still appear "not fixed" on an installed
 * PWA/app (e.g. the lock screen showing the old UI). Per AGENTS.md §2.11 stale
 * shells are prohibited: when a new SW takes control we reload the page ONCE
 * (guarded so it can never loop).
 */
export function initPwaAutoReload(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  // Was the page already controlled by a SW at load time? If yes, a later
  // controllerchange means an UPDATE replaced it → reload to pick up new assets.
  // If no (first-ever install), the first controllerchange is just the initial
  // claim — do NOT reload (that would be a pointless refresh on first load).
  const hadControllerAtLoad = Boolean(navigator.serviceWorker.controller);
  let reloading = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !hadControllerAtLoad) return;
    reloading = true;
    window.location.reload();
  });
}
