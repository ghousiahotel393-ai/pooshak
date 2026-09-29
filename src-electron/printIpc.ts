import { ipcMain, BrowserWindow, app } from 'electron';
import { join } from 'path';
import { platform } from 'os';

export function registerPrintIpc(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('print:printRaw', async (_event, printerName: string, data: number[]) => {
    try {
      const { execFile } = await import('child_process');
      const { promisify } = await import('util');
      const execFileAsync = promisify(execFile);

      const buffer = Buffer.from(data);
      const tempPath = join(app.getPath('temp'), `zpos-print-${Date.now()}.bin`);
      const fs = await import('fs/promises');
      await fs.writeFile(tempPath, buffer);

      if (platform() === 'win32') {
        await execFileAsync('cmd.exe', ['/c', `copy /b "${tempPath}" "\\\\.\\${printerName}"`]);
      } else {
        await execFileAsync('lp', ['-d', printerName, '-o', 'raw', tempPath]);
      }

      await fs.unlink(tempPath);
      return true;
    } catch (err) {
      console.error('[Electron] Print failed:', err);
      return false;
    }
  });

  ipcMain.handle('print:getPrinters', async () => {
    const win = getMainWindow();
    try {
      if (win && !win.isDestroyed()) {
        const printers = await win.webContents.getPrintersAsync();
        return printers.map((p) => ({
          name: p.name,
          displayName: p.displayName || p.name,
          isDefault: !!p.isDefault,
        }));
      }
    } catch (err) {
      console.warn('[Electron] getPrintersAsync fallback:', err);
    }
    try {
      const { execFile } = await import('child_process');
      const { promisify } = await import('util');
      const execFileAsync = promisify(execFile);

      if (platform() === 'win32') {
        const { stdout } = await execFileAsync('wmic', ['printer', 'get', 'name']);
        return stdout.split('\n').map(s => s.trim()).filter(s => s && s !== 'Name').map(name => ({ name, displayName: name, isDefault: false }));
      } else {
        const { stdout } = await execFileAsync('lpstat', ['-a']);
        return stdout.split('\n').map(line => line.split(' ')[0]).filter(Boolean).map(name => ({ name, displayName: name, isDefault: false }));
      }
    } catch {
      return [];
    }
  });

  ipcMain.handle('print:printHtml', async (_event, html: string, options?: { silent?: boolean; printerName?: string; is58mm?: boolean; isA4?: boolean }) => {
    let printWin: BrowserWindow | null = null;
    try {
      printWin = new BrowserWindow({
        show: false,
        width: 400,
        height: 600,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: false,
        },
      });

      const encoded = Buffer.from(html, 'utf-8').toString('base64');
      await printWin.loadURL(`data:text/html;charset=utf-8;base64,${encoded}`);

      await new Promise((resolve) => setTimeout(resolve, 300));

      let targetPrinter = options?.printerName?.trim() || '';
      if (!targetPrinter) {
        try {
          const printers = await printWin.webContents.getPrintersAsync();
          const def = printers.find(p => p.isDefault) || printers[0];
          if (def) targetPrinter = def.name;
        } catch {}
      }

      const isSilent = options?.silent ?? true;

      return await new Promise((resolve) => {
        if (!printWin || printWin.isDestroyed()) {
          resolve({ success: false, error: 'Print window destroyed' });
          return;
        }

        printWin.webContents.print(
          {
            silent: isSilent,
            printBackground: true,
            deviceName: targetPrinter || undefined,
            margins: { marginType: 'none' },
            pageSize: options?.is58mm
              ? { width: 58000, height: 297000 }
              : options?.isA4
              ? 'A4'
              : { width: 80000, height: 297000 },
          },
          (success, failureReason) => {
            if (printWin && !printWin.isDestroyed()) {
              printWin.close();
              printWin = null;
            }
            if (!success) {
              console.warn('[Electron] Print failed:', failureReason);
            }
            resolve({ success, failureReason });
          }
        );
      });
    } catch (err: any) {
      if (printWin && !printWin.isDestroyed()) {
        try { printWin.close(); } catch {}
      }
      console.error('[Electron] printHtml failed:', err);
      return { success: false, error: err?.message || String(err) };
    }
  });
}
