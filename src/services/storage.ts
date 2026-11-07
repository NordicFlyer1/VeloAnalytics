import { getActivitySignature } from '../lib/utils';

/**
 * Simple IndexedDB wrapper for storing large activity data.
 */
const DB_NAME = 'VeloAnalyticsDB';
const STORE_NAME = 'activities';
const DB_VERSION = 1;

export async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function saveActivityData(id: string, data: any): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put({ id, data });

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      } catch (err) {
        reject(err);
      }
    });
  } catch (err) {
    console.warn(`[IndexedDB] Could not save activity data for ${id}:`, err);
  }
}

export async function getActivityData(id: string): Promise<any> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result?.data || null);
        transaction.onerror = () => reject(transaction.error);
      } catch (err) {
        reject(err);
      }
    });
  } catch (err) {
    console.warn(`[IndexedDB] Could not get activity data for ${id}:`, err);
    return null;
  }
}

export async function deleteActivityData(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      } catch (err) {
        reject(err);
      }
    });
  } catch (err) {
    console.warn(`[IndexedDB] Could not delete activity data for ${id}:`, err);
  }
}

export async function getAllHistory(): Promise<any[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve((request.result || []).map((r: any) => r.data));
        transaction.onerror = () => reject(transaction.error);
      } catch (err) {
        reject(err);
      }
    });
  } catch (err) {
    console.warn('[IndexedDB] Could not get all history:', err);
    return [];
  }
}

export async function saveAllHistory(history: any[]): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        // Clear existing data first
        store.clear();
        
        for (const activity of history) {
          store.put({ id: activity.id, data: activity });
        }

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      } catch (err) {
        reject(err);
      }
    });
  } catch (err) {
    console.warn('[IndexedDB] Could not save all history:', err);
  }
}

export interface StoredFitFile {
  id: string;
  fileName: string;
  blob: Blob;
}

export async function getAllStoredFitFiles(): Promise<StoredFitFile[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const results: StoredFitFile[] = [];
          const rows = request.result || [];
          const seenSignatures = new Set<string>();
          const duplicateIdsToDelete: string[] = [];

          for (const row of rows) {
            const data = row.data;
            if (data && data.originalFile) {
              const fileName = data.originalFileName || data.fullSummary?.name || `${row.id}.fit`;
              const safeName = fileName.toLowerCase().endsWith('.fit') || fileName.toLowerCase().endsWith('.csv') 
                ? fileName 
                : `${fileName}.fit`;
              const blob = data.originalFile instanceof Blob 
                ? data.originalFile 
                : new Blob([data.originalFile], { type: 'application/octet-stream' });

              const sig = getActivitySignature({
                fullSummary: data.fullSummary,
                duration: data.fullSummary?.duration,
                distance: data.fullSummary?.distance,
                originalFileName: fileName,
                garminActivityId: data.garminActivityId
              });

              if (seenSignatures.has(sig)) {
                // Duplicate ride session detected in storage
                duplicateIdsToDelete.push(row.id);
                continue;
              }
              seenSignatures.add(sig);

              results.push({ id: row.id, fileName: safeName, blob });
            }
          }

          // Asynchronously clean up stale duplicate rows in background
          if (duplicateIdsToDelete.length > 0) {
            try {
              const cleanupTx = db.transaction(STORE_NAME, 'readwrite');
              const cleanupStore = cleanupTx.objectStore(STORE_NAME);
              for (const dupId of duplicateIdsToDelete) {
                cleanupStore.delete(dupId);
              }
            } catch (cleanupErr) {
              console.warn('[IndexedDB] Background cleanup of duplicate rows failed:', cleanupErr);
            }
          }

          resolve(results);
        };
        transaction.onerror = () => reject(transaction.error);
      } catch (err) {
        reject(err);
      }
    });
  } catch (err) {
    console.warn('[IndexedDB] Could not get all stored fit files:', err);
    return [];
  }
}
