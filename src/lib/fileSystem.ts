import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile, writeFile } from '@tauri-apps/plugin-fs';

/**
 * Check if the application is running within a Tauri webview.
 * In Tauri v2, we check for multiple indicators including the internal bridge.
 */
export const isTauri = () => {
  const win = window as any;
  return win.__TAURI_INTERNALS__ !== undefined || win.__TAURI__ !== undefined;
};

interface SaveOptions {
  description?: string;
  accept?: Record<string, string[]>;
  suggestedName?: string;
}

/**
 * Robust "Save As" utility that handles:
 * 1. Tauri File System (Desktop App)
 * 2. Browser File System Access API (Modern Desktop Browsers)
 * 3. Standard Download Fallback (Legacy/Mobile/Iframe restricted)
 */
export async function saveAs(
  content: string | Blob,
  filename: string,
  options: SaveOptions = {}
): Promise<void> {
  const { description = 'File', accept = { 'application/octet-stream': ['*'] } } = options;
  const suggestedName = options.suggestedName || filename;

  // --- 1. TAURI INTEGRATION ---
  if (isTauri()) {
    console.debug('[FileSystem] Tauri environment detected. Attempting native save dialog.');
    try {
      const filters = Object.entries(accept).map(([name, extensions]) => ({
        name: description,
        extensions: extensions.map(e => e.replace('.', ''))
      }));

      const filePath = await save({
        defaultPath: suggestedName,
        filters
      });

      if (filePath) {
        console.debug(`[FileSystem] Saving to native path: ${filePath}`);
        if (typeof content === 'string') {
          await writeTextFile(filePath, content);
        } else {
          const buffer = await content.arrayBuffer();
          await writeFile(filePath, new Uint8Array(buffer));
        }
        return;
      } else {
        console.debug('[FileSystem] User cancelled native save dialog.');
        return;
      }
    } catch (err) {
      console.error('[FileSystem] Tauri native save failed. This usually means the "dialog" or "fs" plugin is not enabled in your tauri.conf.json.', err);
      // Fall through to browser methods
    }
  } else {
    console.debug('[FileSystem] Standard browser environment detected (non-Tauri).');
  }

  // --- 2. BROWSER FILE SYSTEM ACCESS API ---
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: suggestedName,
        types: [{
          description,
          accept
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.warn('File System Access API failed, falling back to standard download:', err);
    }
  }

  // --- 3. STANDARD BROWSER DOWNLOAD (FALLBACK) ---
  const blob = content instanceof Blob ? content : new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
