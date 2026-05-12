import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile, writeFile } from '@tauri-apps/plugin-fs';

/**
 * Check if the application is running within a Tauri webview.
 */
export const isTauri = () => (window as any).__TAURI__ !== undefined;

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
        if (typeof content === 'string') {
          await writeTextFile(filePath, content);
        } else {
          const buffer = await content.arrayBuffer();
          await writeFile(filePath, new Uint8Array(buffer));
        }
        return;
      } else {
        // User cancelled
        return;
      }
    } catch (err) {
      console.warn('Tauri Save Dialog failed, falling back:', err);
    }
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
