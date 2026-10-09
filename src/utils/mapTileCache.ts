import * as pmtiles from 'pmtiles';
import { API_URL } from '../config';

const DB_NAME = 'opc_map_tiles_cache_db';
const STORE_NAME = 'pmtiles_files';
const DB_VERSION = 1;

export interface CachedFileInfo {
  name: string;
  size: number;
  updatedAt: number;
}

export interface MapDownloadTarget {
  id: string;
  name: string;
  filename: string;
  approxSizeMb: number;
  category: 'core' | 'hq' | '3d';
  description: string;
}

export const MAP_DOWNLOAD_TARGETS: MapDownloadTarget[] = [
  {
    id: 'ets2_base',
    name: 'ETS2 Europa Straßennetz (Basis)',
    filename: 'ets2.pmtiles',
    approxSizeMb: 94.2,
    category: 'core',
    description: 'Vollständiges ETS2 Straßen-, Autobahn- und Städtenetzwerk',
  },
  {
    id: 'world',
    name: 'Welt- & Ländergrenzen',
    filename: 'world.pmtiles',
    approxSizeMb: 1.1,
    category: 'core',
    description: 'Küstenlinien, Gewässer und Staatsgrenzen',
  },
  {
    id: 'truckline_hq',
    name: 'TrucklineMP HQ (Dillenburg)',
    filename: 'ets2-truckline-hq.pmtiles',
    approxSizeMb: 0.45,
    category: 'hq',
    description: 'Truckline Hauptquartier B255 / A45 Hessen',
  },
  {
    id: 'truckersmp_hq',
    name: 'TruckersMP HQ (Wrocław)',
    filename: 'ets2-truckersmp-hq.pmtiles',
    approxSizeMb: 0.23,
    category: 'hq',
    description: 'TruckersMP Hauptquartier bei Breslau, Polen',
  },
  {
    id: 'footprints',
    name: '3D Gebäude-Footprints',
    filename: 'ets2-footprints.pmtiles',
    approxSizeMb: 24.1,
    category: '3d',
    description: '3D-Extrusionen und Industriegebäude',
  },
  {
    id: 'terrain',
    name: '3D Höhen- & Terrainmodell',
    filename: 'ets2-terrain.pmtiles',
    approxSizeMb: 60.5,
    category: '3d',
    description: 'Alpen- & Geländeprofil für 3D-Kartenansicht',
  },
  {
    id: 'contours',
    name: 'Höhenlinien (Konturen)',
    filename: 'ets2-contours.pmtiles',
    approxSizeMb: 69.4,
    category: '3d',
    description: 'Topografische Höhenlinien',
  },
];

// Custom PMTiles BlobSource for reading local offline slices
export class LocalBlobSource implements pmtiles.Source {
  private blob: Blob;
  private key: string;

  constructor(key: string, blob: Blob) {
    this.key = key;
    this.blob = blob;
  }

  getKey(): string {
    return this.key;
  }

  async getBytes(offset: number, length: number): Promise<pmtiles.RangeResponse> {
    const slice = this.blob.slice(offset, offset + length);
    const data = await slice.arrayBuffer();
    return { data };
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'name' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveMapTileBlob(filename: string, blob: Blob): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const record = {
      name: filename,
      blob,
      size: blob.size,
      updatedAt: Date.now(),
    };
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getMapTileBlob(filename: string): Promise<Blob | null> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(filename);
      req.onsuccess = () => {
        if (req.result && req.result.blob) {
          resolve(req.result.blob);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function deleteMapTileBlob(filename: string): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(filename);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {}
}

export async function getCachedFilesList(): Promise<Record<string, CachedFileInfo>> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const out: Record<string, CachedFileInfo> = {};
        for (const item of req.result || []) {
          out[item.name] = {
            name: item.name,
            size: item.size || 0,
            updatedAt: item.updatedAt || 0,
          };
        }
        resolve(out);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return {};
  }
}

export async function clearAllCachedFiles(): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {}
}

// Global protocol registry that registers offline blobs
let globalProtocol: pmtiles.Protocol | null = null;
const registeredSources = new Set<string>();

export function getSharedPmTilesProtocol(): pmtiles.Protocol {
  if (!globalProtocol) {
    globalProtocol = new pmtiles.Protocol();
  }
  return globalProtocol;
}

/**
 * Checks IndexedDB for any cached PMTiles and registers LocalBlobSource with protocol
 */
export async function syncOfflineMapSourcesWithProtocol(): Promise<number> {
  const protocol = getSharedPmTilesProtocol();
  const cached = await getCachedFilesList();
  const tileRoot = `${API_URL}/map/proxy`;
  let registeredCount = 0;

  for (const filename of Object.keys(cached)) {
    const fullUrl = `pmtiles://${tileRoot}/${filename}`;
    if (registeredSources.has(fullUrl)) continue;

    const blob = await getMapTileBlob(filename);
    if (blob) {
      // Protocol key matching pmtiles URL format
      const sourceKey = `${tileRoot}/${filename}`;
      const blobSource = new LocalBlobSource(sourceKey, blob);
      const instance = new pmtiles.PMTiles(blobSource);
      protocol.add(instance);
      registeredSources.add(fullUrl);
      registeredCount++;
    }
  }

  return registeredCount;
}

/**
 * Downloads a PMTiles file with progress reporting and saves it locally
 */
export async function downloadMapTileWithProgress(
  filename: string,
  onProgress?: (progress: { loaded: number; total: number; percent: number }) => void,
  signal?: AbortSignal,
): Promise<void> {
  const url = `${API_URL}/map/proxy/${filename}`;
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Download failed for ${filename}: HTTP ${response.status}`);
  }

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  let loaded = 0;

  if (!response.body) {
    const blob = await response.blob();
    await saveMapTileBlob(filename, blob);
    await syncOfflineMapSourcesWithProtocol();
    return;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loaded += value.length;
      if (onProgress && total > 0) {
        onProgress({
          loaded,
          total,
          percent: Math.round((loaded / total) * 100),
        });
      }
    }
  }

  const blob = new Blob(chunks, { type: 'application/octet-stream' });
  await saveMapTileBlob(filename, blob);
  await syncOfflineMapSourcesWithProtocol();
}
