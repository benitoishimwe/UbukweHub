import { openDB } from 'idb';

const DB_NAME = 'ubukwe-offline';
const DB_VERSION = 1;

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('offline-queue')) {
          const store = db.createObjectStore('offline-queue', { keyPath: 'id', autoIncrement: true });
          store.createIndex('status', 'status');
        }
        if (!db.objectStoreNames.contains('inventory-cache')) {
          db.createObjectStore('inventory-cache', { keyPath: 'item_id' });
        }
        if (!db.objectStoreNames.contains('events-cache')) {
          db.createObjectStore('events-cache', { keyPath: 'event_id' });
        }
      },
    });
  }
  return dbPromise;
}

// Queue a transaction for offline sync
export async function queueOfflineTransaction(txData) {
  const db = await getDB();
  await db.add('offline-queue', {
    ...txData,
    status: 'pending',
    queued_at: new Date().toISOString(),
  });
}

// Get all pending transactions
export async function getPendingTransactions() {
  const db = await getDB();
  return db.getAllFromIndex('offline-queue', 'status', 'pending');
}

// Mark transaction as synced
export async function markSynced(id) {
  const db = await getDB();
  const tx = await db.get('offline-queue', id);
  if (tx) {
    await db.put('offline-queue', { ...tx, status: 'synced', synced_at: new Date().toISOString() });
  }
}

// Cache inventory items
export async function cacheInventory(items) {
  const db = await getDB();
  const tx = db.transaction('inventory-cache', 'readwrite');
  await Promise.all(items.map((item) => tx.store.put(item)));
  await tx.done;
}

// Get cached inventory
export async function getCachedInventory() {
  const db = await getDB();
  return db.getAll('inventory-cache');
}

// Service Worker registration
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((reg) => console.log('[SW] Registered:', reg.scope))
        .catch((err) => console.warn('[SW] Registration failed:', err));
    });
  }
}

// Online/offline detection
export function setupConnectivityListener(onOnline, onOffline) {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

// Sync pending transactions when back online
export async function syncPendingTransactions(apiCreateFn) {
  const pending = await getPendingTransactions();
  const results = [];
  for (const item of pending) {
    try {
      await apiCreateFn(item);
      await markSynced(item.id);
      results.push({ id: item.id, success: true });
    } catch (err) {
      results.push({ id: item.id, success: false, error: err.message });
    }
  }
  return results;
}
