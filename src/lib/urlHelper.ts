/**
 * Universal helper to open links in the correct environment.
 * For Electron, it uses IPC to open the system's default browser.
 * For Web/PWA, it uses window.open.
 */
export const openExternalLink = (url: string) => {
  const electron = (window as any)?.electronAPI;

  if (electron) {
    if (typeof electron.shell?.openExternal === 'function') {
      electron.shell.openExternal(url);
      return;
    }
    if (typeof electron.openExternal === 'function') {
      electron.openExternal(url);
      return;
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * Specifically for email links
 */
export const openMail = (email: string) => {
  openExternalLink(`mailto:${email}`);
};
