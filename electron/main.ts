import { app, BrowserWindow, ipcMain, dialog, screen, globalShortcut, shell, net as electronNet, nativeImage } from 'electron'
import { exec, execSync, spawn } from 'node:child_process'
import net from 'node:net'
import DiscordRPC from 'discord-rpc'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import crypto from 'node:crypto'
import https from 'node:https'
import http from 'node:http'
import os from 'node:os'
import { validateMapDataDir } from './map-data-validator';
import { getRoute, verifyTurnPointsWithNodes } from './route-service';

// --- Sicherer Primitiv-Logger ---
const LOG_FILE = path.join(os.homedir(), 'Documents', 'openpipeclub_debug.log');
const writeToLog = (message: string) => {
  try {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${timestamp}] ${message}\n`);
  } catch (e) { /* Wenn das Loggen fehlschlägt, ist alles verloren */ }
};
// Log-Datei bei jedem Start leeren
try { fs.writeFileSync(LOG_FILE, '--- Open Pipe Club App Log ---\n'); } catch (e) { }
writeToLog('Logger initialisiert.');
// --- Ende Logger ---

// --- Globale Failsafes ---
process.on('uncaughtException', (error, origin) => {
  writeToLog(`FATAL: Uncaught Exception at: ${origin}\nERROR: ${error.message}\nSTACK: ${error.stack}`);
  app.quit();
});
process.on('unhandledRejection', (reason, promise) => {
  writeToLog(`FATAL: Unhandled Rejection. Reason: ${reason}`);
});
writeToLog('Globale Failsafes (uncaughtException, unhandledRejection) sind aktiv.');
// --- Ende Failsafes ---


const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Optimize Electron RAM footprint
// V8: heap ceiling set to 128MB with aggressive GC & optimize-for-size
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=128 --optimize-for-size --expose-gc');
// Coalesce same-origin windows into a single shared renderer process
app.commandLine.appendSwitch('process-per-site');
app.commandLine.appendSwitch('disable-site-isolation-trials');
app.commandLine.appendSwitch('renderer-process-limit', '1');

// Limit in-memory disk and media caches to 16MB
app.commandLine.appendSwitch('disk-cache-size', '16777216');
app.commandLine.appendSwitch('media-cache-size', '16777216');

// Memory pressure handling & disable unneeded subsystems
app.commandLine.appendSwitch('enable-features', 'TrimOnMemoryPressure');
app.commandLine.appendSwitch('disable-breakpad');
app.commandLine.appendSwitch('disable-speech-api');
app.commandLine.appendSwitch('disable-voice-input');
app.commandLine.appendSwitch('disable-notifications');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('no-first-run');
app.commandLine.appendSwitch('disable-features',
  'BackForwardCache,TranslateUI,AudioServiceOutOfProcess,MediaRouter,DialMediaRouteProvider,HardwareMediaKeyHandling,IntensiveWakeUpThrottling'
);

// Global working set & cache trimming
function trimAppMemory() {
  try {
    if (typeof (global as any).gc === 'function') {
      (global as any).gc();
    }
    BrowserWindow.getAllWindows().forEach((w) => {
      if (w && !w.isDestroyed()) {
        w.webContents?.session?.clearCache().catch(() => {});
      }
    });
    if (process.platform === 'win32') {
      try {
        (process as any).trimWorkingSet?.();
      } catch {}
    }
  } catch {}
}
// Periodically trim memory every 10 minutes
setInterval(trimAppMemory, 10 * 60 * 1000);

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null;
let splashWin: BrowserWindow | null = null;
let overlayWin: BrowserWindow | null = null;
let logoWin: BrowserWindow | null = null;
let driversWin: BrowserWindow | null = null;
let eventWin: BrowserWindow | null = null;
let carplayWin: BrowserWindow | null = null;
let carplayChild: any = null;
const isCarPlayMode = process.argv.includes('--carplay-mode');

// Read parent PID for clean process exiting in standalone mode
const parentPidArg = process.argv.find(arg => arg.startsWith('--parent-pid='));
const parentPid = parentPidArg ? parseInt(parentPidArg.split('=')[1], 10) : null;

if (isCarPlayMode && parentPid) {
  setInterval(() => {
    try {
      process.kill(parentPid, 0);
    } catch (e) {
      app.quit();
      process.exit(0);
    }
  }, 1000);
}


function safeSend(winInstance: BrowserWindow | null, channel: string, ...args: any[]) {
  if (winInstance && !winInstance.isDestroyed() && winInstance.webContents && !winInstance.webContents.isDestroyed()) {
    try {
      if (!winInstance.webContents.isLoadingMainFrame()) {
        winInstance.webContents.send(channel, ...args);
      }
    } catch (e: any) {
      // Ignoriere Fehler wenn Frame gerade neu geladen oder geschlossen wurde
    }
  }
}

let overlayX: number | null = null;
let overlayY: number | null = null;
let overlayW = 380;
let overlayH = 120;

let logoX: number | null = null;
let logoY: number | null = null;
let logoW = 140;
let logoH = 80;

let driversX: number | null = null;
let driversY: number | null = null;
let driversW = 320;
let driversH = 200;

let eventX: number | null = null;
let eventY: number | null = null;
let eventW = 280;
let eventH = 90;

let spotifyX: number | null = null;
let spotifyY: number | null = null;
let spotifyW = 280;
let spotifyH = 140;

let isOverlayLocked = true;
let isOverlayActive = false;

let overlaySettings: any = {
  showLogo: true,
  showMainHud: true,
  showDrivers: true,
  showEvent: true,
  showSpotify: true,
  showCarPlay: false,
  carPlayTheme: 'dark',
  carPlayHotkeys: {
    toggle: 'F9',
    next: 'Ctrl+Alt+Right',
    prev: 'Ctrl+Alt+Left',
    home: 'Ctrl+Alt+H',
    playPause: 'Ctrl+Alt+Space'
  }
};

const SETTINGS_PATH = path.join(app.getPath('userData'), 'overlay-settings.json');
const ACTIVE_JOB_PATH = path.join(app.getPath('userData'), 'active-job.json');
const OFFLINE_QUEUE_PATH = path.join(app.getPath('userData'), 'offline-job-queue.json');

export interface ActiveJobSession {
  jobId: string;
  jobDetails: string;
  cargo: string;
  source: string;
  dest: string;
  sourceCompany?: string;
  destCompany?: string;
  cargoMass: number;
  serverName: string | null;
  mode: string;
  game: string;
  startTime: number;
  startFuel: number;
  lastFuel?: number;
  totalRefueled?: number;
  startOdometer: number;
  startIncome: number;
  plannedDistance: number;
  startDeliveredRevenue?: number;
  startDeliveredXp?: number;
  totalSpeed: number;
  speedTicks: number;
  maxSpeed: number;
  routePoints: Array<{ game_x: number; game_y: number; game_z: number; speed: number; ts: string }>;
  lastRecordedPos: { x: number; y: number; z: number; time: number } | null;
  updatedAt: number;
}

export interface QueuedJobEvent {
  id: string;
  event: 'start' | 'delivered' | 'cancelled';
  jobId: string;
  payload: any;
  createdAt: number;
  attempts: number;
  lastAttempt?: number;
  lastError?: string;
}

let activeJobSession: ActiveJobSession | null = null;
let noCargoInWorldTicks = 0;
let isOfflineSyncing = false;
let offlineSyncInterval: NodeJS.Timeout | null = null;

function loadActiveJobSession(): ActiveJobSession | null {
  try {
    if (fs.existsSync(ACTIVE_JOB_PATH)) {
      const data = fs.readFileSync(ACTIVE_JOB_PATH, 'utf8');
      const parsed = JSON.parse(data);
      if (parsed && parsed.jobId && parsed.jobDetails) {
        writeToLog(`📦 ActiveJob: Gespeicherte Job-Sitzung geladen (${parsed.jobDetails}, ID: ${parsed.jobId})`);
        return parsed;
      }
    }
  } catch (e: any) {
    writeToLog(`⚠️ Fehler beim Laden von active-job.json: ${e.message}`);
  }
  return null;
}

function saveActiveJobSession(session: ActiveJobSession | null) {
  try {
    if (!session) {
      if (fs.existsSync(ACTIVE_JOB_PATH)) {
        fs.unlinkSync(ACTIVE_JOB_PATH);
        writeToLog('📦 ActiveJob: Aktive Job-Sitzung gelöscht (Job beendet)');
      }
      return;
    }
    fs.writeFileSync(ACTIVE_JOB_PATH, JSON.stringify(session, null, 2));
  } catch (e: any) {
    writeToLog(`⚠️ Fehler beim Speichern von active-job.json: ${e.message}`);
  }
}

function loadOfflineJobQueue(): QueuedJobEvent[] {
  try {
    if (fs.existsSync(OFFLINE_QUEUE_PATH)) {
      const data = fs.readFileSync(OFFLINE_QUEUE_PATH, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e: any) {
    writeToLog(`⚠️ Fehler beim Laden von offline-job-queue.json: ${e.message}`);
  }
  return [];
}

function saveOfflineJobQueue(queue: QueuedJobEvent[]) {
  try {
    fs.writeFileSync(OFFLINE_QUEUE_PATH, JSON.stringify(queue, null, 2));
  } catch (e: any) {
    writeToLog(`⚠️ Fehler beim Speichern von offline-job-queue.json: ${e.message}`);
  }
}

function enqueueJobEvent(payload: any) {
  const queue = loadOfflineJobQueue();
  const eventType = payload.event || 'job';
  const jobId = payload.job_id || currentJobId || crypto.randomUUID();

  // Deduplicate start events for the same job
  if (eventType === 'start') {
    const exists = queue.find(q => q.jobId === jobId && q.event === 'start');
    if (exists) return;
  }

  const item: QueuedJobEvent = {
    id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    event: eventType,
    jobId,
    payload,
    createdAt: Date.now(),
    attempts: 0
  };

  queue.push(item);
  saveOfflineJobQueue(queue);
  writeToLog(`📦 Offline: Job-Event '${eventType}' (${payload.cargo || 'Job ' + jobId}) lokal in Warteschlange gespeichert (Total: ${queue.length})`);

  safeSend(win, 'offline-queue-updated', { pendingCount: queue.length });
  safeSend(overlayWin, 'offline-queue-updated', { pendingCount: queue.length });
}

async function sendJobEventWithQueue(payload: any): Promise<boolean> {
  if (!userToken) {
    writeToLog(`⚠️ Kein Token vorhanden - reihe Job-Event '${payload.event}' in Offline-Queue ein`);
    enqueueJobEvent(payload);
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${BACKEND_URL}/desktop/job`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      writeToLog(`✅ Server-Tracking: Job-Event '${payload.event}' erfolgreich übertragen (${res.status})`);
      processOfflineJobQueue().catch(() => {});
      return true;
    } else {
      writeToLog(`❌ Server-Tracking: Server antwortete mit ${res.status} ${res.statusText} - Speichere lokal in Offline-Queue`);
      enqueueJobEvent(payload);
      return false;
    }
  } catch (err: any) {
    writeToLog(`❌ Server-Tracking Netzwerkfehler (${err.message}) - Speichere lokal in Offline-Queue`);
    enqueueJobEvent(payload);
    return false;
  }
}

async function processOfflineJobQueue() {
  if (isOfflineSyncing || !userToken) return;

  const queue = loadOfflineJobQueue();
  if (queue.length === 0) return;

  isOfflineSyncing = true;
  writeToLog(`🔄 Offline-Sync: Starte Übertragung von ${queue.length} wartenden Job-Events...`);

  let syncedCount = 0;
  const remainingQueue: QueuedJobEvent[] = [];

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    item.attempts++;
    item.lastAttempt = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`${BACKEND_URL}/desktop/job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify(item.payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        syncedCount++;
        writeToLog(`✅ Offline-Sync: Event '${item.event}' (Job ${item.jobId}) erfolgreich synchronisiert!`);
      } else if (res.status === 401) {
        writeToLog(`⚠️ Offline-Sync: Auth-Fehler (401) - Breche Synchronisation ab bis neuer Login erfolgt`);
        remainingQueue.push(item, ...queue.slice(i + 1));
        break;
      } else {
        writeToLog(`⚠️ Offline-Sync: Server meldete Fehler ${res.status} für Event '${item.event}'`);
        item.lastError = `HTTP ${res.status}`;
        remainingQueue.push(item);
      }
    } catch (err: any) {
      writeToLog(`❌ Offline-Sync Netzwerkfehler (${err.message}) - Halte ${queue.length - i} Events in der Queue`);
      item.lastError = err.message;
      remainingQueue.push(item, ...queue.slice(i + 1));
      break;
    }
  }

  saveOfflineJobQueue(remainingQueue);
  isOfflineSyncing = false;

  safeSend(win, 'offline-queue-updated', { pendingCount: remainingQueue.length });
  safeSend(overlayWin, 'offline-queue-updated', { pendingCount: remainingQueue.length });

  if (syncedCount > 0) {
    const notif = {
      type: 'system',
      title: 'Synchronisation erfolgreich',
      content: `${syncedCount} Offline-Fahrt(en) erfolgreich mit dem Server synchronisiert!`
    };
    safeSend(win, 'job-notification', notif);
    safeSend(overlayWin, 'job-notification', notif);
  }
}

export interface RpcSettings {
  enabled: boolean;
  preset: 'detailed' | 'compact' | 'privacy';
  showEtaCountdown: boolean;
  showCargoMass: boolean;
  showDamage: boolean;
  showNearbyPlayers: boolean;
  showLiveMapButton: boolean;
  showConvoyParty: boolean;
}

const defaultRpcSettings: RpcSettings = {
  enabled: true,
  preset: 'detailed',
  showEtaCountdown: true,
  showCargoMass: true,
  showDamage: false,
  showNearbyPlayers: true,
  showLiveMapButton: true,
  showConvoyParty: true,
};

let rpcSettings: RpcSettings = { ...defaultRpcSettings };
let isRpcActive = true;
let activeConvoy: {
  eventId: string | number;
  eventTitle: string;
  startCity: string;
  endCity: string;
  slug?: string;
  totalDrivers?: number;
} | null = null;
let currentUsername: string | null = null;

let userToken: string | null = null;
let currentJobId: string | null = null;
let lastJobDetails: string | null = null;
let prevJobActive = false;
let lastPositionSent = 0;
let rpcStartTime: Date | null = null;
let lastSeenNotifId: string | null = null;
let mapDataDir: string | null = path.join(app.getPath('documents'), 'Open Pipe Club', 'maps-data');

// Job Tracking Stats
let jobStartFuel = 0;
let jobLastFuel = 0;
let jobTotalRefueled = 0;
let jobStartTime = 0;
let jobStartOdometer = 0;
let jobStartIncome = 0;
let jobPlannedDistance = 0;
let jobStartDeliveredRevenue = 0;
let jobStartDeliveredXp = 0;
let jobTotalSpeed = 0;
let jobSpeedTicks = 0;
let jobMaxSpeed = 0;
let jobRoutePoints: Array<{ game_x: number; game_y: number; game_z: number; speed: number; ts: string }> = [];
let jobLastRecordedPos: { x: number; y: number; z: number; time: number } | null = null;
let lastRoutePointSent = 0;

async function loadSettings(isAppStart = false) {
  writeToLog('Attempting to load settings...');
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const data = fs.readFileSync(SETTINGS_PATH, 'utf8');
      const saved = JSON.parse(data);
      isRpcActive = saved.isRpcActive !== undefined ? saved.isRpcActive : isRpcActive;
      if (saved.rpcSettings) {
        rpcSettings = { ...defaultRpcSettings, ...saved.rpcSettings, enabled: isRpcActive };
      } else {
        rpcSettings.enabled = isRpcActive;
      }
      currentJobId = saved.currentJobId || null;
      lastJobDetails = saved.lastJobDetails || null;

      overlayX = saved.overlayX !== undefined ? saved.overlayX : null;
      overlayY = saved.overlayY !== undefined ? saved.overlayY : null;
      overlayW = saved.overlayW || 380;
      overlayH = saved.overlayH || 120;

      logoX = saved.logoX !== undefined ? saved.logoX : null;
      logoY = saved.logoY !== undefined ? saved.logoY : null;
      logoW = saved.logoW || 140;
      logoH = saved.logoH || 80;

      driversX = saved.driversX !== undefined ? saved.driversX : null;
      driversY = saved.driversY !== undefined ? saved.driversY : null;
      driversW = saved.driversW || 320;
      driversH = saved.driversH || 200;

      eventX = saved.eventX !== undefined ? saved.eventX : null;
      eventY = saved.eventY !== undefined ? saved.eventY : null;
      eventW = saved.eventW || 280;
      eventH = saved.eventH || 90;

      spotifyX = saved.spotifyX !== undefined ? saved.spotifyX : null;
      spotifyY = saved.spotifyY !== undefined ? saved.spotifyY : null;
      spotifyW = saved.spotifyW || 280;
      spotifyH = saved.spotifyH || 140;

      if (isAppStart) {
        isOverlayLocked = true; // Always locked on app start
      } else {
        isOverlayLocked = saved.isOverlayLocked !== undefined ? saved.isOverlayLocked : isOverlayLocked;
      }
      isOverlayActive = saved.isOverlayActive !== undefined ? saved.isOverlayActive : false;
      if (saved.overlaySettings !== undefined) {
        overlaySettings = {
          showLogo: true,
          showMainHud: true,
          showDrivers: true,
          showEvent: true,
          showSpotify: true,
          showTrafficLight: true,
          trafficLightVariant: 'compact',
          showCarPlay: false,
          carPlayTheme: 'dark',
          carPlayHotkeys: {
            toggle: 'F9',
            next: 'Ctrl+Alt+Right',
            prev: 'Ctrl+Alt+Left',
            home: 'Ctrl+Alt+H',
            playPause: 'Ctrl+Alt+Space'
          },
          ...saved.overlaySettings
        };
        if (saved.overlaySettings.showTacho !== undefined && saved.overlaySettings.showCarPlay === undefined) {
          overlaySettings.showCarPlay = saved.overlaySettings.showTacho;
        }
      }
      mapDataDir = saved.mapDataDir || path.join(app.getPath('documents'), 'Open Pipe Club', 'maps-data');
      writeToLog('📦 Settings: Einstellungen geladen');
    } else {
      writeToLog('Settings file does not exist, using defaults.');
    }

    // Load persisted active job session if available
    activeJobSession = loadActiveJobSession();
    if (activeJobSession) {
      currentJobId = activeJobSession.jobId;
      lastJobDetails = activeJobSession.jobDetails;
      jobStartTime = activeJobSession.startTime;
      jobStartFuel = activeJobSession.startFuel;
      jobLastFuel = activeJobSession.lastFuel ?? activeJobSession.startFuel;
      jobTotalRefueled = activeJobSession.totalRefueled ?? 0;
      jobStartOdometer = activeJobSession.startOdometer;
      jobStartIncome = activeJobSession.startIncome;
      jobPlannedDistance = activeJobSession.plannedDistance;
      jobStartDeliveredRevenue = activeJobSession.startDeliveredRevenue || 0;
      jobStartDeliveredXp = activeJobSession.startDeliveredXp || 0;
      jobTotalSpeed = activeJobSession.totalSpeed || 0;
      jobSpeedTicks = activeJobSession.speedTicks || 0;
      jobMaxSpeed = activeJobSession.maxSpeed || 0;
      jobRoutePoints = activeJobSession.routePoints || [];
      jobLastRecordedPos = activeJobSession.lastRecordedPos || null;
      activeJobServerName = activeJobSession.serverName;
      activeJobCargoMass = activeJobSession.cargoMass;
      writeToLog(`🚚 Aktive Job-Sitzung wiederhergestellt: ${activeJobSession.cargo} (${activeJobSession.source} -> ${activeJobSession.dest}) [Job-ID: ${currentJobId}]`);
    }

    // Start background offline job sync loop (runs every 25 seconds)
    if (!offlineSyncInterval) {
      offlineSyncInterval = setInterval(() => {
        processOfflineJobQueue().catch(() => {});
      }, 25000);
    }
  } catch (e: any) {
    writeToLog(`❌ Settings: Fehler beim Laden der Einstellungen: ${e.message}\nStack: ${e.stack}`);
  }
}

function saveSettings() {
  writeToLog('Attempting to save settings...');
  try {
    const data = {
      isRpcActive,
      rpcSettings,
      currentJobId,
      lastJobDetails,
      overlayX,
      overlayY,
      overlayW,
      overlayH,
      logoX,
      logoY,
      logoW,
      logoH,
      driversX,
      driversY,
      driversW,
      driversH,
      eventX,
      eventY,
      eventW,
      eventH,
      spotifyX,
      spotifyY,
      spotifyW,
      spotifyH,
      isOverlayLocked,
      isOverlayActive,
      overlaySettings,
      mapDataDir
    };
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2));
    writeToLog('📦 Settings: Einstellungen erfolgreich gespeichert');
  } catch (e: any) {
    writeToLog(`❌ Settings: Fehler beim Speichern der Einstellungen: ${e.message}\nStack: ${e.stack}`);
  }
}

let fsWatcher: any = null;
function watchSettingsFile() {
  if (fsWatcher) return;
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      let isUpdating = false;
      fsWatcher = fs.watch(SETTINGS_PATH, (eventType) => {
        if (eventType === 'change' && !isUpdating) {
          isUpdating = true;
          setTimeout(async () => {
            try {
              const oldShowCarPlay = overlaySettings?.showCarPlay;
              const oldHotkeys = JSON.stringify(overlaySettings?.carPlayHotkeys);
              
              await loadSettings(false);
              
              if (isCarPlayMode) {
                if (carplayWin && !carplayWin.isDestroyed()) {
                  safeSend(carplayWin, 'overlay-settings-updated', overlaySettings);
                }
                if (!overlaySettings.showCarPlay) {
                  app.quit();
                }
                if (oldHotkeys !== JSON.stringify(overlaySettings?.carPlayHotkeys)) {
                  registerCarPlayHotkeys();
                }
              } else {
                if (oldShowCarPlay !== overlaySettings.showCarPlay) {
                  safeSend(win, 'overlay-settings-updated', overlaySettings);
                  safeSend(overlayWin, 'overlay-settings-updated', overlaySettings);
                }
                if (oldHotkeys !== JSON.stringify(overlaySettings?.carPlayHotkeys) || oldShowCarPlay !== overlaySettings.showCarPlay) {
                  registerCarPlayHotkeys();
                }
              }
            } catch (err) {}
            isUpdating = false;
          }, 150);
        }
      });
    }
  } catch (e) {}
}



function createSplashScreen() {
  writeToLog('Creating splash screen...');
  splashWin = new BrowserWindow({
    width: 480,
    height: 380,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    center: true,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  let logoBase64 = '';
  try {
    const logoPath = path.join(process.env.VITE_PUBLIC, 'logo.png');
    if (fs.existsSync(logoPath)) {
      logoBase64 = fs.readFileSync(logoPath).toString('base64');
    }
  } catch (err: any) {
    writeToLog(`Failed to read logo.png for splash screen: ${err.message}`);
  }

  const splashHTML = `
<!DOCTYPE html>
<html>
<head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=Unbounded:wght@700;900&display=swap" rel="stylesheet">
  <style>
    body {
      margin: 0;
      padding: 0;
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      font-family: 'Outfit', sans-serif;
      overflow: hidden;
      -webkit-app-region: drag;
    }
    .card {
      width: 360px;
      height: 260px;
      background: rgba(0, 0, 0, 0.76);
      border: 1px solid rgba(245, 158, 11, 0.45);
      box-shadow: 0 0 4px rgba(245, 158, 11, 0.9),
                  0 0 12px rgba(245, 158, 11, 0.6);
      border-radius: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }
    .logo-container {
      position: relative;
      width: 80px;
      height: 80px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo-glow {
      position: absolute;
      width: 70px;
      height: 70px;
      background: #f59e0b;
      border-radius: 50%;
      filter: blur(25px);
      opacity: 0.55;
      animation: pulse 2s infinite ease-in-out;
    }
    .logo {
      position: relative;
      width: 76px;
      height: 76px;
      object-fit: contain;
      filter: drop-shadow(0 0 10px rgba(245, 158, 11,0.4));
    }
    .title {
      font-family: 'Unbounded', sans-serif;
      font-size: 22px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin: 0;
      text-shadow: 0 0 10px rgba(255,255,255,0.1);
    }
    .subtitle {
      font-size: 11px;
      font-weight: 600;
      color: #f59e0b;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-top: 4px;
      margin-bottom: 24px;
      opacity: 0.85;
    }
    .status {
      font-size: 12px;
      color: #64748b;
      letter-spacing: 0.5px;
      margin: 0;
      animation: pulse 1.5s infinite ease-in-out;
    }
    .progress-track {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: rgba(245, 158, 11, 0.08);
      overflow: hidden;
    }
    .progress-bar {
      position: absolute;
      height: 100%;
      width: 40%;
      background: linear-gradient(90deg, transparent, #f59e0b, transparent);
      animation: loading-slide 1.5s infinite linear;
      box-shadow: 0 0 10px rgba(245, 158, 11, 0.5), 0 0 4px rgba(245, 158, 11, 0.2);
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.4; transform: scale(0.96); }
      50% { opacity: 0.7; transform: scale(1.04); }
    }
    @keyframes loading-slide {
      0% {
        left: -40%;
      }
      100% {
        left: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-container">
      <div class="logo-glow"></div>
      ${logoBase64 ? `<img class="logo" src="data:image/png;base64,${logoBase64}" />` : `<div style="font-size: 40px;">🚚</div>`}
    </div>
    <div class="title">Open Pipe Club</div>
    <div class="subtitle">Tracker</div>
    <div class="status">Wird gestartet...</div>
    <div class="progress-track">
      <div class="progress-bar"></div>
    </div>
  </div>
</body>
</html>
  `;

  const tempSplashPath = path.join(app.getPath('temp'), 'openpipeclub_splash.html');
  try {
    fs.writeFileSync(tempSplashPath, splashHTML, 'utf8');
    splashWin.loadFile(tempSplashPath);
  } catch (err: any) {
    writeToLog(`Failed to write/load splash.html: ${err.message}`);
    // Fallback in case of disk write failures
    splashWin.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(splashHTML));
  }

  splashWin.on('closed', () => {
    try { fs.unlinkSync(tempSplashPath); } catch (e) { }
    splashWin = null;
  });
}

let isMainReady = false;
function showMainWindow() {
  if (isMainReady) return;
  isMainReady = true;
  writeToLog('Showing main window.');
  if (splashWin && !splashWin.isDestroyed()) {
    try {
      splashWin.destroy();
      splashWin = null;
    } catch (e: any) {
      writeToLog(`Failed to close splashWin: ${e.message}`);
    }
  }
  if (win && !win.isDestroyed()) {
    win.show();
    win.focus();
  }
}

ipcMain.on('app-ready', () => {
  writeToLog('IPC event "app-ready" received from renderer.');
  showMainWindow();
  safeSend(win, 'overlay-status-changed', isOverlayActive);
  safeSend(win, 'rpc-active-changed', isRpcActive);
  safeSend(win, 'rpc-settings-changed', rpcSettings);
  safeSend(win, 'rpc-status-changed', isRpcConnected);
});

function createWindow() {
  writeToLog('Creating main window...');
  app.name = 'Open Pipe Club App';
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Open Pipe Club App',
    icon: path.join(process.env.VITE_PUBLIC, 'logo.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.cjs'),
      spellcheck: false,
      webSecurity: false,
    },
    autoHideMenuBar: true,
    backgroundColor: '#050507',
    frame: false,
    show: false,
  })

  if (process.platform === 'win32') {
    win.setAppDetails({ appId: 'com.openpipeclub.app.main' });
  }

  // Intercept navigation requests and open external links in default browser
  win.webContents.on('will-navigate', (event, url) => {
    const isExternal = !url.startsWith('file://') && !url.startsWith(process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173');
    if (isExternal) {
      event.preventDefault();
      shell.openExternal(url).catch(() => { });
    }
  });

  // Intercept new window requests and open external links in default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    const isExternal = !url.startsWith('file://') && !url.startsWith(process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173');
    if (isExternal && (url.startsWith('http:') || url.startsWith('https:'))) {
      shell.openExternal(url).catch(() => { });
    }
    return { action: 'deny' };
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(process.env.DIST, 'index.html'))
  }

  win.webContents.on('did-finish-load', () => {
    writeToLog('Main window finished loading content.');
    // Set a fallback timer of 4 seconds in case React app fails to signal 'app-ready'
    setTimeout(showMainWindow, 4000);

    safeSend(win, 'overlay-status-changed', isOverlayActive);
    safeSend(win, 'rpc-active-changed', isRpcActive);
    safeSend(win, 'rpc-settings-changed', rpcSettings);
    safeSend(win, 'rpc-status-changed', isRpcConnected);

    writeToLog('Scheduling RPC login in 3 seconds.');
    setTimeout(loginRpc, 3000);
    // Clear HTTP cache every 30 minutes to prevent unbounded growth
    setInterval(() => {
      win?.webContents.session.clearCache().catch(() => { });
    }, 30 * 60 * 1000);
  });

  win.on('minimize', () => {
    setTimeout(trimAppMemory, 300);
  });

  win.on('closed', () => {
    isQuitting = true;
    win = null;
    closeCarPlayWindow();
    app.quit();
  });
}

ipcMain.on('window-close', (event) => {
  const targetWin = BrowserWindow.fromWebContents(event.sender) || win;
  writeToLog(`[IPC] window-close received. Target window exists: ${!!targetWin}`);
  if (targetWin) {
    targetWin.close();
  } else {
    app.quit();
  }
})
ipcMain.on('window-minimize', (event) => {
  const targetWin = BrowserWindow.fromWebContents(event.sender) || win;
  writeToLog(`[IPC] window-minimize received. Target window exists: ${!!targetWin}`);
  if (targetWin) {
    targetWin.minimize();
    setTimeout(trimAppMemory, 300);
  }
})
ipcMain.on('window-maximize', (event) => {
  const targetWin = BrowserWindow.fromWebContents(event.sender) || win;
  writeToLog(`[IPC] window-maximize received. Target window exists: ${!!targetWin}`);
  if (targetWin) {
    if (targetWin.isMaximized()) {
      targetWin.unmaximize();
    } else {
      targetWin.maximize();
    }
  }
})

ipcMain.on('job-notification', (_, data) => {
  win?.webContents.send('job-notification', data);
  if (overlayWin && !overlayWin.isDestroyed()) {
    overlayWin.webContents.send('job-notification', data);
  }
  if (carplayWin && !carplayWin.isDestroyed()) {
    carplayWin.webContents.send('job-notification', data);
  }
});


// Discord RPC
const clientId = '1449830003020922994';
let rpc: any = null;
let isRpcConnected = false;
let telemetryData: any = null;
let lastTelemetryUpdate = 0;
let lastWinTelemetryUpdate = 0;
let lastWinConnected = false;
const TELEMETRY_UPDATE_INTERVAL = 30; // ms (~33 FPS - spart 40% IPC & React Re-render Speicheroverhead)
let currentCity: string | null = null;
let currentAppPage = 'Dashboard';

function formatTruckName(brand?: string, model?: string): string {
  if (!brand && !model) return 'Truck';
  const rawBrand = (brand || '').trim();
  const cleanBrand = rawBrand
    .replace(/^daf$/i, 'DAF')
    .replace(/^iveco$/i, 'Iveco')
    .replace(/^man$/i, 'MAN')
    .replace(/^mercedes-benz|mercedes$/i, 'Mercedes-Benz')
    .replace(/^renault$/i, 'Renault')
    .replace(/^scania$/i, 'Scania')
    .replace(/^volvo$/i, 'Volvo')
    .replace(/^peterbilt$/i, 'Peterbilt')
    .replace(/^kenworth$/i, 'Kenworth')
    .replace(/^freightliner$/i, 'Freightliner')
    .replace(/^western star|westernstar$/i, 'Western Star')
    .replace(/^mack$/i, 'Mack')
    .replace(/^international$/i, 'International');

  let cleanModel = (model || '')
    .replace(/_/g, ' ')
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .trim();

  cleanModel = cleanModel
    .replace(/^S\s*2016/i, 'S-Serie')
    .replace(/^R\s*2016/i, 'R-Serie')
    .replace(/^Streamline/i, 'Streamline')
    .replace(/^Fh16\s*2012/i, 'FH16')
    .replace(/^Fh\s*2012/i, 'FH')
    .replace(/^Tg3/i, 'TGX')
    .replace(/^Tgx/i, 'TGX')
    .replace(/^Actros\s*2014/i, 'Actros MP4')
    .replace(/^Xf\s*106/i, 'XF Euro 6');

  const b = cleanBrand ? cleanBrand.charAt(0).toUpperCase() + cleanBrand.slice(1) : '';
  if (b && cleanModel) {
    if (cleanModel.toLowerCase().startsWith(b.toLowerCase())) {
      return cleanModel;
    }
    return `${b} ${cleanModel}`;
  }
  return b || cleanModel || 'Truck';
}

function formatCityName(city?: string): string {
  if (!city) return '';
  const trimmed = city.trim();
  return trimmed
    .split(/\s+/)
    .map((word, idx) => {
      if (idx > 0 && /^(am|an|der|im|in|und|de|la|du|von)$/i.test(word)) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

const MAJOR_CITIES_COORDS = [
  { name: 'Berlin', x: 10070, z: -9774 },
  { name: 'Hamburg', x: -1990, z: -17284 },
  { name: 'München', x: 1064, z: 12176 },
  { name: 'Frankfurt', x: -8990, z: 1153 },
  { name: 'Köln', x: -15009, z: -2927 },
  { name: 'Düsseldorf', x: -13577, z: -4599 },
  { name: 'Dortmund', x: -10883, z: -6379 },
  { name: 'Duisburg', x: -13801, z: -6466 },
  { name: 'Hannover', x: -2193, z: -9751 },
  { name: 'Bremen', x: -5185, z: -14018 },
  { name: 'Dresden', x: 11635, z: -1842 },
  { name: 'Leipzig', x: 6694, z: -4012 },
  { name: 'Nürnberg', x: 1090, z: 6061 },
  { name: 'Stuttgart', x: -6002, z: 8356 },
  { name: 'Mannheim', x: -9475, z: 5399 },
  { name: 'Kassel', x: -4149, z: -3625 },
  { name: 'Kiel', x: -1198, z: -23021 },
  { name: 'Rostock', x: 6190, z: -20280 },
  { name: 'Amsterdam', x: -19042, z: -11308 },
  { name: 'Rotterdam', x: -21286, z: -8191 },
  { name: 'Brüssel', x: -22100, z: -2415 },
  { name: 'Antwerpen', x: -21701, z: -5681 },
  { name: 'Paris', x: -30980, z: 5186 },
  { name: 'Calais', x: -30340, z: -4986 },
  { name: 'Lyon', x: -24006, z: 24200 },
  { name: 'Marseille', x: -24900, z: 36990 },
  { name: 'Bordeaux', x: -46139, z: 27274 },
  { name: 'London', x: -37740, z: -13268 },
  { name: 'Dover', x: -33322, z: -7884 },
  { name: 'Birmingham', x: -45951, z: -20423 },
  { name: 'Manchester', x: -44975, z: -28252 },
  { name: 'Liverpool', x: -47979, z: -27034 },
  { name: 'Milano', x: -5398, z: 28984 },
  { name: 'Roma', x: 7625, z: 50046 },
  { name: 'Torino', x: -12117, z: 27035 },
  { name: 'Verona', x: 3000, z: 29000 },
  { name: 'Wien', x: 20268, z: 10433 },
  { name: 'Salzburg', x: 10100, z: 15300 },
  { name: 'Innsbruck', x: 2600, z: 18700 },
  { name: 'Zürich', x: -12100, z: 17400 },
  { name: 'Bern', x: -15200, z: 20200 },
  { name: 'Genf', x: -21800, z: 23600 },
  { name: 'Prag', x: 16752, z: 1012 },
  { name: 'Warschau', x: 38240, z: -7550 },
  { name: 'Krakau', x: 34100, z: 5200 },
  { name: 'Bratislava', x: 22800, z: 11900 },
  { name: 'Budapest', x: 30700, z: 17900 },
  { name: 'Kopenhagen', x: 6700, z: -32000 },
  { name: 'Malmö', x: 8900, z: -32300 },
  { name: 'Göteborg', x: 8500, z: -43100 },
  { name: 'Stockholm', x: 24700, z: -45900 },
  { name: 'Oslo', x: 2600, z: -49800 }
];

function getClosestCityFromCoords(x?: number, z?: number): string | null {
  if (x === undefined || z === undefined || (x === 0 && z === 0)) return null;
  let closest: string | null = null;
  let minDistance = 35000;
  for (const c of MAJOR_CITIES_COORDS) {
    const dx = c.x - x;
    const dz = c.z - z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < minDistance) {
      minDistance = dist;
      closest = c.name;
    }
  }
  return closest;
}

function updateRpc() {
  if (!rpc || !isRpcActive || !isRpcConnected) return;

  const hasGameData = telemetryData && !telemetryData.error && telemetryData.gameVersion > 0;
  const isConvoy = !!activeConvoy;
  const preset = rpcSettings.preset || 'detailed';

  let activity: any = {
    largeImageKey: 'openpipeclub',
    largeImageText: 'Open Pipe Club Tracker',
    instance: false,
    buttons: []
  };

  const getButtonsForDrive = () => {
    if (preset === 'privacy' || !rpcSettings.showLiveMapButton) {
      return [
        { label: "Open Pipe Club Website", url: "https://openpipeclub.com" },
        ...(currentUsername ? [{ label: "Fahrer-Profil", url: `https://openpipeclub.com/driver/${encodeURIComponent(currentUsername)}` }] : [])
      ];
    }
    const buttons: Array<{ label: string; url: string }> = [];
    if (currentUsername) {
      buttons.push({ label: "📍 Live auf Map", url: `https://openpipeclub.com/map?driver=${encodeURIComponent(currentUsername)}` });
    }
    buttons.push({ label: "Open Pipe Club Website", url: "https://openpipeclub.com" });
    return buttons.slice(0, 2);
  };

  if (hasGameData) {
    const truck = formatTruckName(telemetryData.brand, telemetryData.model);
    const speed = Math.round(telemetryData.speed || 0);
    const serverName = resolveServerName(telemetryData) || 'Simulation';
    const gameName = telemetryData.gameType === 2 ? 'American Truck Simulator' : 'Euro Truck Simulator 2';
    const nearbyCount = typeof telemetryData.nearbyCount === 'number'
      ? telemetryData.nearbyCount
      : (Array.isArray(telemetryData.nearbyVehicles) ? telemetryData.nearbyVehicles.length : 0);

    activity.largeImageKey = telemetryData.gameType === 2 ? 'ats' : 'ets2';
    activity.largeImageText = `${gameName} • ${serverName}`;
    activity.smallImageKey = 'openpipeclub';
    activity.smallImageText = currentUsername ? `Open Pipe Club • ${currentUsername}` : 'Open Pipe Club VTC';

    // Time handling: ETA Countdown vs Elapsed
    // SCS SDK provides navTime in in-game seconds (Spielzeit).
    // Convert to real time based on ETS2 (1:19) / ATS (1:20) simulation scaling.
    if (!rpcStartTime) rpcStartTime = new Date();
    const isATS = telemetryData.gameType === 2;
    const highwayScale = isATS ? 20 : 19;

    let timeScale = highwayScale;
    if (telemetryData.navDistance && telemetryData.navDistance > 0 && telemetryData.navDistance <= 3000) {
      const distRatio = Math.max(0, Math.min(1, telemetryData.navDistance / 3000));
      timeScale = 3 + distRatio * (highwayScale - 3);
    }

    const realRemainingSecs = (telemetryData.navTime && !isNaN(telemetryData.navTime) && telemetryData.navTime > 0)
      ? Math.round(telemetryData.navTime / timeScale)
      : 0;
    const hasNavTime = realRemainingSecs >= 10;

    if (rpcSettings.showEtaCountdown && hasNavTime && !telemetryData.paused && preset !== 'privacy') {
      activity.endTimestamp = Math.floor(Date.now() / 1000) + realRemainingSecs;
      delete activity.startTimestamp;
    } else {
      activity.startTimestamp = rpcStartTime;
      delete activity.endTimestamp;
    }

    // Nearby players string
    const nearbyText = (rpcSettings.showNearbyPlayers && nearbyCount > 0 && preset !== 'privacy')
      ? ` • 👥 ${nearbyCount} im Umkreis`
      : '';

    // Damage string
    const wearTruckPct = Math.round(telemetryData.wearTruck || 0);
    const damageText = (rpcSettings.showDamage && wearTruckPct > 1 && preset === 'detailed')
      ? ` • 🛠️ ${wearTruckPct}%`
      : '';

    const hasCargo = telemetryData.cargo && telemetryData.cargo.trim().length > 0 && telemetryData.cargo.toLowerCase() !== 'none';
    const hasRoute = telemetryData.source && telemetryData.dest && telemetryData.source.trim().length > 0 && telemetryData.dest.trim().length > 0;

    // SCENARIO 1: ACTIVE CONVOY
    if (isConvoy && preset !== 'privacy') {
      activity.details = `🚩 Konvoi: ${activeConvoy!.eventTitle} • 🌐 ${serverName}`;
      const convoyRoute = (activeConvoy!.startCity && activeConvoy!.endCity)
        ? `📍 ${activeConvoy!.startCity} ➔ ${activeConvoy!.endCity}`
        : (hasRoute ? `📍 ${formatCityName(telemetryData.source)} ➔ ${formatCityName(telemetryData.dest)}` : `🛣️ Im Konvoi unterwegs`);

      activity.state = `${convoyRoute}${nearbyText}`;

      // Discord Party Badge
      if (rpcSettings.showConvoyParty) {
        activity.partyId = `opc_convoy_${activeConvoy!.eventId}`;
        activity.partySize = Math.max(1, (nearbyCount > 0 ? nearbyCount + 1 : (activeConvoy!.totalDrivers || 1)));
        activity.partyMax = Math.max(activity.partySize + 5, 50);
      }

      const slug = activeConvoy!.slug || activeConvoy!.eventTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const buttons: Array<{ label: string; url: string }> = [
        { label: "🚩 Konvoi ansehen", url: `https://openpipeclub.com/events/${slug}` }
      ];
      if (currentUsername && rpcSettings.showLiveMapButton) {
        buttons.push({ label: "📍 Live auf Map", url: `https://openpipeclub.com/map?driver=${encodeURIComponent(currentUsername)}` });
      } else {
        buttons.push({ label: "Open Pipe Club Website", url: "https://openpipeclub.com" });
      }
      activity.buttons = buttons.slice(0, 2);

    // SCENARIO 2: PAUSED
    } else if (telemetryData.paused) {
      activity.details = `⏸️ ${truck} • 🌐 ${serverName}`;
      if (hasCargo && hasRoute && preset !== 'privacy') {
        const src = formatCityName(telemetryData.source);
        const dst = formatCityName(telemetryData.dest);
        activity.state = `📍 ${src} ➔ ${dst} • ⏸️ Pausiert`;
      } else {
        activity.state = `⏸️ Pause im Spiel`;
      }
      activity.buttons = getButtonsForDrive();

    // SCENARIO 3: STREAMER / PRIVACY PRESET
    } else if (preset === 'privacy') {
      activity.details = `🚛 ${truck} • 🌐 ${serverName}`;
      activity.state = speed > 2 ? `🛣️ Auf Achse • ⚡ ${speed} km/h` : `🅿️ Rastplatz / Pause`;
      activity.buttons = [
        { label: "Open Pipe Club Website", url: "https://openpipeclub.com" },
        ...(currentUsername ? [{ label: "Fahrer-Profil", url: `https://openpipeclub.com/driver/${encodeURIComponent(currentUsername)}` }] : [])
      ];

    // SCENARIO 4: REGULAR CARGO TOUR
    } else if (hasCargo && hasRoute) {
      const src = formatCityName(telemetryData.source);
      const dst = formatCityName(telemetryData.dest);
      const cargo = telemetryData.cargo.trim();

      activity.details = `🚛 ${truck} • 🌐 ${serverName}`;

      if (preset === 'compact') {
        activity.state = `📍 ${src} ➔ ${dst}${nearbyText}`;
      } else {
        // Detailed
        let massInfo = '';
        if (rpcSettings.showCargoMass && telemetryData.cargoMass > 0) {
          massInfo = ` (${Math.round(telemetryData.cargoMass * 10) / 10} t)`;
        }
        let remainingKm = '';
        if (telemetryData.navDistance && telemetryData.navDistance > 1000) {
          remainingKm = ` [${Math.round(telemetryData.navDistance / 1000)} km]`;
        }
        activity.state = `📍 ${src} ➔ ${dst}${remainingKm} • 📦 ${cargo}${massInfo}${damageText}${nearbyText}`;
      }
      activity.buttons = getButtonsForDrive();

    // SCENARIO 5: FREEROAM / LEERFAHRT
    } else {
      activity.details = `🚛 ${truck} • 🌐 ${serverName}`;
      const resolvedCity = currentCity || getClosestCityFromCoords(telemetryData.posX, telemetryData.posZ);
      const locationPrefix = resolvedCity ? `🗺️ Bei ${resolvedCity} • ` : '';

      if (speed > 2) {
        activity.state = `${locationPrefix}Auf Achse • ⚡ ${speed} km/h${nearbyText}`;
      } else {
        activity.state = `${locationPrefix}Rastplatz / Leerfahrt${nearbyText}`;
      }
      activity.buttons = getButtonsForDrive();
    }

  } else {
    // DESKTOP APP MODE
    rpcStartTime = null;
    delete activity.endTimestamp;
    const pageNames: { [key: string]: string } = {
      'dashboard': '📊 Im Fahrer-Dashboard',
      'events': '📅 Konvois & Events',
      'news': '📰 Liest die Club-News',
      'chat': '💬 Im Firmenfunk & Chat',
      'map': '🗺️ Erkundet die Live-Karte',
      'gallery': '📸 In der Foto-Galerie',
      'statistiken': '📈 Prüft VTC-Statistiken',
      'stats': '📈 Prüft VTC-Statistiken',
      'team': '👥 Fahrer & Team-Übersicht',
      'afkbot': '🤖 Anti-AFK Assistent aktiv',
      'overlay-settings': '⚙️ Passt Overlay & App an',
      'admin': '🛡️ Im Management-Bereich',
      'profile': '👤 Betrachtet ein Fahrer-Profil',
      'applications': '📝 Prüft Bewerbungen',
      'reports': '📑 Liest Schadensberichte',
      'database': '🗄️ Verwaltet Datenbank'
    };
    const cleanPage = (currentAppPage || "").toLowerCase().trim();
    activity.details = '🏢 Open Pipe Club • Drivers Hub';
    if (pageNames[cleanPage]) {
      activity.state = pageNames[cleanPage];
    } else if (currentAppPage) {
      activity.state = currentAppPage;
    } else {
      activity.state = 'Bereit für die nächste Tour 🚛';
    }
    activity.largeImageKey = 'openpipeclub';
    activity.largeImageText = 'Open Pipe Club App';
    activity.smallImageKey = undefined;
    activity.smallImageText = undefined;
    activity.buttons = [
      { label: "Open Pipe Club Website", url: "https://openpipeclub.com" },
      ...(currentUsername
        ? [{ label: "Fahrer-Profil", url: `https://openpipeclub.com/driver/${encodeURIComponent(currentUsername)}` }]
        : [{ label: "Jetzt bewerben ✍️", url: "https://openpipeclub.com/apply" }])
    ];
  }

  // Guard against Discord RPC 128 character limits
  if (activity.details && activity.details.length > 125) {
    activity.details = activity.details.slice(0, 122) + '...';
  }
  if (activity.state && activity.state.length > 125) {
    activity.state = activity.state.slice(0, 122) + '...';
  }

  rpc.setActivity(activity).catch((err: any) => writeToLog(`🎮 RPC: Fehler beim Setzen der Activity: ${err.message}`));
}

function checkDiscordPermissionError(): Promise<boolean> {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      resolve(false);
      return;
    }
    const socket = net.createConnection('\\\\.\\pipe\\discord-ipc-0');
    socket.on('connect', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', (err: any) => {
      socket.destroy();
      if (err.code === 'EPERM') {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

let rpcTimeout: NodeJS.Timeout | null = null;

async function loginRpc() {
  if (!isRpcActive) {
    writeToLog('🎮 RPC: Login übersprungen, da RPC deaktiviert ist.');
    return;
  }
  if (rpc && isRpcConnected) {
    writeToLog('🎮 RPC: Bereits verbunden, nur Update wird ausgeführt.');
    updateRpc();
    return;
  }
  if (rpcTimeout) clearTimeout(rpcTimeout);

  if (rpc) {
    try {
      writeToLog('🎮 RPC: Bestehende RPC-Instanz wird zerstört.');
      await rpc.destroy();
    } catch (e: any) {
      writeToLog(`🎮 RPC: Fehler beim Zerstören der alten Instanz: ${e.message}`);
    }
    rpc = null;
  }

  writeToLog('🎮 RPC: Neuer Verbindungsversuch...');

  try {
    rpc = new DiscordRPC.Client({ transport: 'ipc' });

    rpc.on('ready', () => {
      writeToLog('🎮 RPC: Bereit! Verbindung erfolgreich hergestellt.');
      isRpcConnected = true;
      updateRpc();
      safeSend(win, 'rpc-status-changed', true);
    });

    rpc.on('error', (err: any) => {
      if (err.message === 'Could not connect') {
        writeToLog('🎮 RPC: Verbindung zu Discord fehlgeschlagen (Discord läuft wahrscheinlich nicht).');
      } else {
        writeToLog(`🎮 RPC: Unerwarteter Fehler: ${err.message}\nStack: ${err.stack}`);
      }
      isRpcConnected = false;
      safeSend(win, 'rpc-status-changed', false);
    });

    await rpc.login({ clientId });
    writeToLog('🎮 RPC: Login-Befehl abgesetzt. Warte auf "ready"-Event.');

  } catch (err: any) {
    writeToLog(`🎮 RPC: Kritischer Fehler im Login-Prozess: ${err.message}\nStack: ${err.stack}`);

    if (err.message === 'Could not connect') {
      checkDiscordPermissionError().then((isEperm) => {
        if (isEperm) {
          writeToLog('🎮 RPC: Verbindungsfehler EPERM. Discord läuft vermutlich als Administrator.');
          safeSend(win, 'rpc-error', 'eperm');
        }
      });
    }

    isRpcConnected = false;
    safeSend(win, 'rpc-status-changed', false);

    if (isRpcActive) {
      writeToLog('🎮 RPC: Nächster Verbindungsversuch in 30 Sekunden geplant.');
      rpcTimeout = setTimeout(loginRpc, 30000);
    }
  }
}

async function stopRpc() {
  isRpcConnected = false;
  if (rpcTimeout) {
    clearTimeout(rpcTimeout);
    rpcTimeout = null;
  }
  if (rpc) {
    try {
      await rpc.clearActivity();
      await rpc.destroy();
    } catch (e) { }
    rpc = null;
  }
  win?.webContents.send('rpc-status-changed', false);
}

ipcMain.handle('rpc-toggle', async (_, enabled) => {
  isRpcActive = enabled;
  rpcSettings.enabled = enabled;
  saveSettings();
  if (enabled) {
    loginRpc();
  } else {
    await stopRpc();
  }
  // Notify renderer of status change
  safeSend(win, 'rpc-active-changed', isRpcActive);
  safeSend(win, 'rpc-settings-changed', rpcSettings);
  safeSend(win, 'rpc-status-changed', isRpcConnected);
  return isRpcActive;
});

ipcMain.handle('rpc-get-status', () => isRpcActive);

ipcMain.handle('rpc-status', () => isRpcConnected);

ipcMain.handle('rpc-settings-get', () => rpcSettings);

ipcMain.handle('rpc-settings-update', async (_, updated: Partial<RpcSettings>) => {
  rpcSettings = { ...rpcSettings, ...updated };
  isRpcActive = rpcSettings.enabled;
  saveSettings();
  if (rpcSettings.enabled) {
    if (!isRpcConnected) {
      loginRpc();
    } else {
      updateRpc();
    }
  } else {
    await stopRpc();
  }
  safeSend(win, 'rpc-active-changed', isRpcActive);
  safeSend(win, 'rpc-settings-changed', rpcSettings);
  safeSend(win, 'rpc-status-changed', isRpcConnected);
  return rpcSettings;
});

ipcMain.on('rpc-set-active-convoy', (_, convoy) => {
  writeToLog(`🚩 RPC: Aktiver Konvoi gesetzt: ${convoy?.eventTitle || 'Unbekannt'}`);
  activeConvoy = convoy;
  updateRpc();
});

ipcMain.on('rpc-clear-active-convoy', () => {
  writeToLog('🚩 RPC: Aktiver Konvoi entfernt');
  activeConvoy = null;
  updateRpc();
});

ipcMain.on('rpc-update-city', (_, city) => {
  console.log('📍 RPC Standort Update:', city);
  currentCity = city;
  updateRpc();
});

ipcMain.on('rpc-page-changed', (_, page, details) => {
  let displayPage = '📊 Im Fahrer-Dashboard';
  const p = (page || '').toLowerCase().trim();

  if (p === 'profile') {
    if (details?.isSelf) {
      displayPage = '👤 Bearbeitet eigenes Profil';
    } else if (details?.username) {
      displayPage = `👤 Profil von ${details.username}`;
    } else {
      displayPage = '👤 Betrachtet ein Fahrer-Profil';
    }
  } else if (p === 'events') {
    if (details?.routePlanning || details?.planning) {
      displayPage = '🗺️ Plant eine Konvoi-Route';
    } else {
      displayPage = '📅 Konvois & Events';
    }
  } else if (p === 'chat') {
    if (details?.groupName) {
      displayPage = `💬 Funk: #${details.groupName}`;
    } else if (details?.chattingWith) {
      displayPage = `💬 Schreibt mit ${details.chattingWith}`;
    } else {
      displayPage = '💬 Im Firmenfunk & Chat';
    }
  } else if (p === 'dashboard') {
    displayPage = '📊 Im Fahrer-Dashboard';
  } else if (p === 'map') {
    displayPage = '🗺️ Erkundet die Live-Karte';
  } else if (p === 'overlay-settings' || p === 'overlaysettings') {
    displayPage = '⚙️ Passt die Einstellungen an';
  } else if (p === 'afkbot') {
    displayPage = '🤖 Anti-AFK Assistent aktiv';
  } else if (p === 'stats' || p === 'statistiken') {
    displayPage = '📈 Prüft VTC-Statistiken';
  } else if (p === 'gallery') {
    displayPage = '📸 In der Foto-Galerie';
  } else if (p === 'news') {
    displayPage = '📰 Liest die Club-News';
  } else if (p === 'team') {
    displayPage = '👥 Fahrer & Team-Übersicht';
  } else if (p === 'admin') {
    displayPage = '🛡️ Im Management-Bereich';
  } else if (p === 'applications') {
    displayPage = '📝 Prüft Bewerbungen';
  } else if (p === 'reports') {
    displayPage = '📑 Liest Schadensberichte';
  } else if (p === 'database') {
    displayPage = '🗄️ Verwaltet Datenbank';
  } else {
    displayPage = page ? `📌 ${page.charAt(0).toUpperCase() + page.slice(1)}` : '📊 Im Fahrer-Dashboard';
  }

  currentAppPage = displayPage;
  updateRpc();
});

ipcMain.on('set-auth-username', (_, username) => {
  console.log('👤 Benutzer erkannt:', username);
  currentUsername = username;
  updateRpc();
});

let isQuitting = false;
const rpcInterval = setInterval(updateRpc, 15000);

// Named Pipe Helper to send commands to OPCGameBridge plugin
function sendToPluginPipe(messageText: string): Promise<boolean> {
  return new Promise((resolve) => {
    const pipePath = '\\\\.\\pipe\\OPCCommandPipe';
    const client = net.connect(pipePath, () => {
      const payload = JSON.stringify({ text: messageText }) + '\n';
      client.write(payload, () => {
        client.end();
        resolve(true);
      });
    });
    client.on('error', () => {
      resolve(false);
    });
    client.setTimeout(1500, () => {
      client.destroy();
      resolve(false);
    });
  });
}

// Telemetry Polling
const telemetryScript = `
param(
    [int]$ParentPid = 0
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.IO.MemoryMappedFiles;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;
using System.Linq;

public class WinAPI {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
}

public class SCSTelemetry {
    private static MemoryMappedFile _routeMmf = null;
    private static MemoryMappedViewAccessor _routeAccessor = null;
    private static uint _lastRouteSeq = 0xFFFFFFFF;
    private static MemoryMappedFile _trafficMmf = null;
    private static MemoryMappedViewAccessor _trafficAccessor = null;
    private static uint _lastTrafficSeq = 0xFFFFFFFF;
    private static List<Dictionary<string, object>> _cachedTraffic = null;

    public static Dictionary<string, object> GetData() {
        var result = new Dictionary<string, object>();
        
        // Get Foreground Window Title
        try {
            var hwnd = WinAPI.GetForegroundWindow();
            var title = new StringBuilder(256);
            if (WinAPI.GetWindowText(hwnd, title, 256) > 0) {
                result["activeTitle"] = title.ToString();
            } else {
                result["activeTitle"] = "Unknown";
            }
        } catch {
            result["activeTitle"] = "Unknown";
        }

        // Get Active Steam User
        try {
            using (var key = Microsoft.Win32.Registry.CurrentUser.OpenSubKey("Software\\\\Valve\\\\Steam\\\\ActiveProcess")) {
                if (key != null) {
                    var activeUser = key.GetValue("ActiveUser");
                    if (activeUser != null) {
                        long activeUserId = Convert.ToInt64(activeUser);
                        if (activeUserId != 0) {
                            result["steamId"] = (activeUserId + 76561197960265728L).ToString();
                        }
                    }
                }
            }
        } catch { }

        try {
            using (var mmf = MemoryMappedFile.OpenExisting("Local\\\\SCSTelemetry")) {
                using (var accessor = mmf.CreateViewAccessor()) {
                    byte[] raw = new byte[8192];
                    accessor.ReadArray(0, raw, 0, 8192);

                    uint major = BitConverter.ToUInt32(raw, 44);
                    result["gameVersion"] = major;

                    if (major != 0) {
                        result["multiplayerTimeOffset"] = BitConverter.ToInt64(raw, 32);
                        result["gameType"] = BitConverter.ToUInt32(raw, 52);
                        result["speed"] = BitConverter.ToSingle(raw, 948) * 3.6f;
                        result["rpm"] = BitConverter.ToSingle(raw, 952);
                        result["fuel"] = BitConverter.ToSingle(raw, 1000);
                        float mass = BitConverter.ToSingle(raw, 748) / 1000f;
                        if (mass <= 0) {
                            float unitMass = BitConverter.ToSingle(raw, 944) / 1000f;
                            uint unitCount = BitConverter.ToUInt32(raw, 92);
                            if (unitMass > 0 && unitCount > 0) {
                                mass = unitMass * unitCount;
                            }
                        }
                        result["cargoMass"] = mass;
                        
                        float range = BitConverter.ToSingle(raw, 1008);
                        float avgCons = BitConverter.ToSingle(raw, 1004);
                        if (range <= 0 && avgCons > 0) {
                            range = BitConverter.ToSingle(raw, 1000) / avgCons;
                        }
                        result["fuelRange"] = range;
                        result["wearTruck"] = BitConverter.ToSingle(raw, 1048) * 100f;
                        result["wearCargo"] = BitConverter.ToSingle(raw, 1468) * 100f;
                        result["nextRest"] = BitConverter.ToInt32(raw, 500);
                        result["gear"] = BitConverter.ToInt32(raw, 508);
                        result["cruiseControl"] = BitConverter.ToSingle(raw, 512) * 3.6f;
                        result["navTime"] = BitConverter.ToSingle(raw, 1064);
                        result["navDistance"] = BitConverter.ToSingle(raw, 1060);
                        float rawSpeedLimit = BitConverter.ToSingle(raw, 1068);
                        float speedLimit = (rawSpeedLimit > 0 && !float.IsNaN(rawSpeedLimit) && !float.IsInfinity(rawSpeedLimit)) ? rawSpeedLimit * 3.6f : 0f;
                        result["speedLimit"] = (float)Math.Round(speedLimit);
                        result["avgConsumption"] = BitConverter.ToSingle(raw, 1004);
                        result["paused"] = raw[4] > 0;

                        result["brand"] = GetString(raw, 2364, 64);
                        result["model"] = GetString(raw, 2492, 64);
                        result["cargo"] = GetString(raw, 2620, 64);
                        result["dest"] = GetString(raw, 2748, 64);
                        result["dest_company"] = GetString(raw, 2876, 64);
                        result["source"] = GetString(raw, 3004, 64);
                        result["source_company"] = GetString(raw, 3132, 64);

                        result["posX"] = BitConverter.ToDouble(raw, 2200);
                        result["posY"] = BitConverter.ToDouble(raw, 2208);
                        result["posZ"] = BitConverter.ToDouble(raw, 2216);
                        result["heading"] = BitConverter.ToDouble(raw, 2224);
                        result["pitch"] = BitConverter.ToDouble(raw, 2232);
                        result["roll"] = BitConverter.ToDouble(raw, 2240);

                        result["income"] = BitConverter.ToUInt64(raw, 4000);
                        result["plannedDistance"] = BitConverter.ToUInt32(raw, 100);
                        result["odometer"] = BitConverter.ToSingle(raw, 1056);
                        result["jobDeliveredRevenue"] = BitConverter.ToInt64(raw, 4208);
                        result["jobDeliveredDistanceKm"] = BitConverter.ToSingle(raw, 1104);
                        result["jobDeliveredCargoDamage"] = BitConverter.ToSingle(raw, 1100) * 100f;
                        result["jobDeliveredEarnedXp"] = BitConverter.ToInt32(raw, 636);
                        result["jobMarket"] = GetString(raw, 3404, 32);

                        // Turn indicators, parking brake, lights, and system warnings from Zone 5 (booleans)
                        result["parkBrake"] = raw[1566] > 0;
                        result["blinkerLeftActive"] = raw[1578] > 0;
                        result["blinkerRightActive"] = raw[1579] > 0;
                        result["blinkerLeftOn"] = raw[1580] > 0;
                        result["blinkerRightOn"] = raw[1581] > 0;
                        result["lightsBeamLow"] = raw[1583] > 0;
                        result["lightsBeamHigh"] = raw[1584] > 0;
                        result["lightsHazard"] = raw[1588] > 0;
                        result["lightsBeacon"] = raw[1585] > 0;
                        result["fuelWarning"] = raw[1570] > 0;
                        result["airPressureWarning"] = raw[1568] > 0;
                        result["oilPressureWarning"] = raw[1572] > 0;
                        result["waterTemperatureWarning"] = raw[1573] > 0;
                        result["batteryVoltageWarning"] = raw[1574] > 0;

                        result["connected"] = true;

                        // Read OPCRouteData polyline from OPCGameBridge plugin if active
                        try {
                            if (_routeMmf == null) {
                                _routeMmf = MemoryMappedFile.OpenExisting("Local\\\\OPCRouteData");
                                _routeAccessor = _routeMmf.CreateViewAccessor();
                            }
                            uint magic = _routeAccessor.ReadUInt32(0);
                            if (magic == 0x4F505243) {
                                uint seq = _routeAccessor.ReadUInt32(12);
                                if (seq != _lastRouteSeq) {
                                    _lastRouteSeq = seq;
                                    uint count = _routeAccessor.ReadUInt32(8);
                                    if (count > 0 && count <= 2000) {
                                        var waypoints = new List<float[]>();
                                        for (uint i = 0; i < count; i++) {
                                            long offset = 68 + (i * 12);
                                            float wx = _routeAccessor.ReadSingle(offset);
                                            float wy = _routeAccessor.ReadSingle(offset + 4);
                                            float wz = _routeAccessor.ReadSingle(offset + 8);
                                            waypoints.Add(new float[] { wx, wy, wz });
                                        }
                                        result["routeWaypoints"] = waypoints;
                                        result["routeCount"] = count;
                                    } else {
                                        result["routeWaypoints"] = new List<float[]>();
                                        result["routeCount"] = 0;
                                    }
                                }
                                result["routeSeq"] = seq;
                            }
                        } catch {
                            if (_routeAccessor != null) { try { _routeAccessor.Dispose(); } catch {} _routeAccessor = null; }
                            if (_routeMmf != null) { try { _routeMmf.Dispose(); } catch {} _routeMmf = null; }
                            _lastRouteSeq = 0xFFFFFFFF;
                        }

                        // Read OPCTrafficData nearby vehicles from OPCGameBridge plugin if active
                        try {
                            if (_trafficMmf == null) {
                                _trafficMmf = MemoryMappedFile.OpenExisting("Local\\\\OPCTrafficData");
                                _trafficAccessor = _trafficMmf.CreateViewAccessor();
                            }
                            uint magic = _trafficAccessor.ReadUInt32(0);
                            if (magic == 0x4F505452) {
                                uint trafficSeq = _trafficAccessor.ReadUInt32(12);
                                if (trafficSeq != _lastTrafficSeq || _cachedTraffic == null) {
                                    _lastTrafficSeq = trafficSeq;
                                    uint count = _trafficAccessor.ReadUInt32(8);
                                    var vehicles = new List<Dictionary<string, object>>();
                                    if (count > 0 && count <= 1024) {
                                        for (uint i = 0; i < count; i++) {
                                            long offset = 64 + (i * 48);
                                            var v = new Dictionary<string, object>();
                                            v["id"] = _trafficAccessor.ReadUInt32(offset);
                                            v["x"] = _trafficAccessor.ReadSingle(offset + 4);
                                            v["y"] = _trafficAccessor.ReadSingle(offset + 8);
                                            v["z"] = _trafficAccessor.ReadSingle(offset + 12);
                                            v["heading"] = _trafficAccessor.ReadSingle(offset + 16);
                                            v["speed"] = _trafficAccessor.ReadSingle(offset + 20);
                                            v["width"] = _trafficAccessor.ReadSingle(offset + 24);
                                            v["height"] = _trafficAccessor.ReadSingle(offset + 28);
                                            v["length"] = _trafficAccessor.ReadSingle(offset + 32);
                                            v["isTrailer"] = _trafficAccessor.ReadByte(offset + 36) == 1;
                                            v["isTmp"] = _trafficAccessor.ReadByte(offset + 37) == 1;
                                            vehicles.Add(v);
                                        }
                                    }
                                    _cachedTraffic = vehicles;
                                }
                                result["nearbyVehicles"] = _cachedTraffic;
                                result["nearbyCount"] = _cachedTraffic.Count;
                            }
                        } catch {
                            if (_trafficAccessor != null) { try { _trafficAccessor.Dispose(); } catch {} _trafficAccessor = null; }
                            if (_trafficMmf != null) { try { _trafficMmf.Dispose(); } catch {} _trafficMmf = null; }
                            _lastTrafficSeq = 0xFFFFFFFF;
                            _cachedTraffic = null;
                        }
                    } else {
                        result["connected"] = false;
                        result["error"] = "no_data";
                    }
                }
            }
        } catch {
            result["error"] = "not_running";
        }
        return result;
    }

    private static string GetString(byte[] data, int offset, int length) {
        if (offset + length > data.Length) return "";
        int len = 0;
        while (len < length && data[offset + len] != 0) len++;
        if (len == 0) return "";
        byte[] sub = new byte[len];
        Array.Copy(data, offset, sub, 0, len);
        string s = Encoding.UTF8.GetString(sub);
        if (s.Contains("\uFFFD")) {
            return Encoding.GetEncoding(1252).GetString(sub).Trim();
        }
        return s.Trim();
    }
}
"@

$checkCounter = 0
while($true) {
    if ($ParentPid -gt 0 -and $checkCounter -eq 0) {
        $parent = Get-Process -Id $ParentPid -ErrorAction SilentlyContinue
        if (-not $parent) {
            exit
        }
    }
    $checkCounter = ($checkCounter + 1) % 50
    try {
        [SCSTelemetry]::GetData() | ConvertTo-Json -Compress
    } catch {
        Write-Output '{"error":"ps_error"}'
    }
    Start-Sleep -Milliseconds 20
}
`;

const telemetryTempPath = path.join(app.getPath('temp'), 'openpipeclub_telemetry_v6.ps1');
let telemetryProcess: any = null;
let cachedRouteWaypoints: any = null;

function getOrCompileTelemetryBridge(): string | null {
  const targetInUserData = path.join(app.getPath('userData'), 'opc-telemetry-bridge.exe');

  const possiblePaths = [
    path.join(process.resourcesPath || '', 'app.asar.unpacked', 'dist-electron', 'opc-telemetry-bridge.exe'),
    path.join(process.resourcesPath || '', 'opc-telemetry-bridge.exe'),
    path.join(__dirname, 'opc-telemetry-bridge.exe'),
    path.join(__dirname, '../electron/opc-telemetry-bridge.exe'),
    targetInUserData
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      // If path is inside an ASAR archive, Windows cannot execute it directly via spawn!
      if (p.includes('.asar') && !p.includes('.asar.unpacked')) {
        const unpacked = p.replace('.asar', '.asar.unpacked');
        if (fs.existsSync(unpacked)) {
          writeToLog(`Using unpacked native telemetry bridge: ${unpacked}`);
          return unpacked;
        }
        // Extract the executable from ASAR to userData so it exists as a real file on disk
        try {
          const exeBuffer = fs.readFileSync(p);
          let needWrite = true;
          if (fs.existsSync(targetInUserData)) {
            try {
              const currentSize = fs.statSync(targetInUserData).size;
              if (currentSize === exeBuffer.length) {
                needWrite = false;
              }
            } catch {}
          }
          if (needWrite) {
            fs.writeFileSync(targetInUserData, exeBuffer);
            writeToLog(`Extracted native telemetry bridge from asar to: ${targetInUserData}`);
          }
          return targetInUserData;
        } catch (e: any) {
          writeToLog(`Failed to extract telemetry bridge from asar: ${e.message}`);
          continue;
        }
      }
      return p;
    }
  }

  // Attempt compilation via csc.exe if source exists
  const cscPath = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
  const csCandidates = [
    path.join(process.resourcesPath || '', 'app.asar.unpacked', 'dist-electron', 'telemetry-bridge.cs'),
    path.join(process.resourcesPath || '', 'telemetry-bridge.cs'),
    path.join(__dirname, 'telemetry-bridge.cs'),
    path.join(__dirname, '../electron/telemetry-bridge.cs')
  ];
  let csSource = csCandidates.find(p => fs.existsSync(p));

  // If source is inside asar, extract it to userData so csc.exe can read it
  if (csSource && csSource.includes('.asar') && !csSource.includes('.asar.unpacked')) {
    const unpackedCs = csSource.replace('.asar', '.asar.unpacked');
    if (fs.existsSync(unpackedCs)) {
      csSource = unpackedCs;
    } else {
      try {
        const csBuffer = fs.readFileSync(csSource);
        const tempCsPath = path.join(app.getPath('userData'), 'telemetry-bridge.cs');
        fs.writeFileSync(tempCsPath, csBuffer);
        csSource = tempCsPath;
      } catch (e: any) {
        writeToLog(`Failed to extract cs source from asar: ${e.message}`);
        csSource = undefined;
      }
    }
  }

  const targetExe = path.join(app.getPath('userData'), 'opc-telemetry-bridge.exe');

  if (fs.existsSync(cscPath) && csSource) {
    try {
      execSync(`"${cscPath}" /nologo /optimize+ /platform:x64 /out:"${targetExe}" "${csSource}"`, { stdio: 'ignore' });
      if (fs.existsSync(targetExe)) {
        writeToLog(`Native telemetry bridge compiled successfully: ${targetExe}`);
        return targetExe;
      }
    } catch (e: any) {
      writeToLog(`Failed to compile telemetry-bridge.cs: ${e.message}`);
    }
  }

  return null;
}

function setupTelemetryListeners(proc: any) {
  if (!proc || !proc.stdout) return;
  proc.stdout.setEncoding('utf8');

  let stdoutBuffer = '';
  proc.stdout.on('data', (data: any) => {
    stdoutBuffer += data.toString();
    let boundary = stdoutBuffer.indexOf('\n');
    while (boundary !== -1) {
      const line = stdoutBuffer.substring(0, boundary).trim();
      stdoutBuffer = stdoutBuffer.substring(boundary + 1);
      boundary = stdoutBuffer.indexOf('\n');

      if (!line) continue;
      try {
        const parsed = JSON.parse(line);

        // Cache route waypoints only when newly received to prevent massive V8 IPC structured clone overhead (2000 items x 33 FPS)
        const isRouteUpdate = parsed.routeWaypoints !== undefined;
        if (isRouteUpdate) {
          cachedRouteWaypoints = parsed.routeWaypoints;
        }
        
        // Determine if a job is actually active (cargo loaded AND source/dest present)
        const cargo = (parsed.cargo || "").trim();
        const source = (parsed.source || "").trim();
        const dest = (parsed.dest || "").trim();
        const cargoValid = cargo.length > 0 && cargo.toLowerCase() !== 'none';
        const routeValid = source.length > 0 && dest.length > 0;
        parsed.jobActive = cargoValid && routeValid;
        
        // Send updates throttled by the update interval to prevent high CPU usage on IPC & frontend rendering
        const now = Date.now();
        if (isRouteUpdate || (now - lastTelemetryUpdate > TELEMETRY_UPDATE_INTERVAL)) {
          lastTelemetryUpdate = now;
          // Main window (App.tsx) only needs ~1Hz updates or on connection state change
          if (now - lastWinTelemetryUpdate >= 1000 || (parsed.connected !== lastWinConnected)) {
            lastWinTelemetryUpdate = now;
            if (lastWinConnected && !parsed.connected) {
              lastResolvedServerName = null;
              activeJobServerName = null;
            }
            lastWinConnected = !!parsed.connected;
            safeSend(win, 'telemetry-update', parsed);
          }
          safeSend(overlayWin, 'telemetry-update', parsed);
          safeSend(carplayWin, 'telemetry-update', parsed);
          broadcastCarPlaySse('telemetry-update', parsed);
        }

        // Standalone Tracking Logic - Runs every tick (internal 5s throttle)
        if (telemetryData === null) {
          const initialCargo = (parsed.cargo || "").trim();
          prevJobActive = initialCargo.length > 0 && initialCargo.toLowerCase() !== 'none';
        }
        handleTrackingLogic(parsed, telemetryData);

        const isCurrentlyMoving = parsed &&
          parsed.gameVersion > 0 &&
          Math.round(parsed.speed || 0) > 1;

        if (isCurrentlyMoving) {
          lastMovementTime = Date.now();
        }

        // Keep cached route waypoints in telemetryData for initial state queries (overlay-get-state)
        if (cachedRouteWaypoints && parsed.routeWaypoints === undefined) {
          parsed.routeWaypoints = cachedRouteWaypoints;
        }
        telemetryData = parsed;
        updateOverlayWindowVisibility(parsed);
      } catch (e: any) {
        console.error('❌ Telemetry: Fehler beim Parsen der Zeile:', e.message, 'Inhalt:', line);
      }
    }
  });

  if (proc.stderr) {
    proc.stderr.on('data', (data: any) => {
      console.error('❌ Telemetry Error:', data.toString());
    });
  }

  proc.on('exit', () => {
    telemetryProcess = null;
    lastResolvedServerName = null;
    activeJobServerName = null;
    if (!isQuitting) {
      setTimeout(startTelemetryBridge, 5000);
    }
  });
}

function startTelemetryBridge() {
  if (telemetryProcess) return;

  const nativeBridgeExe = getOrCompileTelemetryBridge();
  let bridgeStarted = false;

  if (nativeBridgeExe) {
    try {
      writeToLog(`Starting native telemetry bridge: ${nativeBridgeExe}`);
      telemetryProcess = spawn(nativeBridgeExe, [
        '--parent-pid=' + process.pid
      ], { windowsHide: true });
      bridgeStarted = true;
    } catch (err: any) {
      writeToLog(`Failed to spawn native bridge synchronously: ${err.message}`);
      telemetryProcess = null;
    }
  }

  if (!telemetryProcess) {
    writeToLog('Fallback: Starting PowerShell telemetry bridge');
    try { fs.writeFileSync(telemetryTempPath, telemetryScript, 'utf8'); } catch (e) { }
    try {
      telemetryProcess = spawn('powershell', [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', telemetryTempPath,
        '-ParentPid', process.pid.toString()
      ], { windowsHide: true });
    } catch (err: any) {
      writeToLog(`Failed to spawn PowerShell bridge: ${err.message}`);
      return;
    }
  }

  telemetryProcess.on('error', (err: any) => {
    writeToLog(`Telemetry bridge error: ${err.message}`);
    if (bridgeStarted) {
      bridgeStarted = false;
      try {
        if (telemetryProcess && !telemetryProcess.killed) {
          telemetryProcess.kill();
        }
      } catch {}
      telemetryProcess = null;
      writeToLog('Retrying with PowerShell telemetry bridge after native bridge failure...');
      try {
        fs.writeFileSync(telemetryTempPath, telemetryScript, 'utf8');
        telemetryProcess = spawn('powershell', [
          '-NoProfile',
          '-ExecutionPolicy', 'Bypass',
          '-File', telemetryTempPath,
          '-ParentPid', process.pid.toString()
        ], { windowsHide: true });
        setupTelemetryListeners(telemetryProcess);
      } catch (fbErr: any) {
        writeToLog(`Fallback PowerShell spawn failed: ${fbErr.message}`);
      }
    }
  });

  setupTelemetryListeners(telemetryProcess);
}

// TruckersMP Session Cache for API-based server detection
let truckersmpSession: { server_name?: string; online?: boolean } | null = null;
let lastTruckersmpPoll = 0;
const TRUCKERSMP_POLL_INTERVAL = 60000; // 60 seconds

async function pollTruckersMPSession() {
  if (!userToken) return;
  const now = Date.now();
  if (now - lastTruckersmpPoll < TRUCKERSMP_POLL_INTERVAL) return;
  lastTruckersmpPoll = now;

  try {
    const res = await fetch(`${BACKEND_URL}/truckersmp/my-session`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    if (res.ok) {
      truckersmpSession = await res.json();
    }
  } catch (e) {
    // silent
  }
}

function getTruckersMPActiveServer(game: string = "ETS2"): string | null {
  try {
    const docsPath = app.getPath('documents');
    const userProfile = process.env.USERPROFILE || '';
    const appData = process.env.APPDATA || '';
    const localAppData = process.env.LOCALAPPDATA || '';
    const folderName = game === "ATS" ? "ATSMP" : "ETS2MP";

    const candidateDirs = [
      path.join(docsPath, folderName, 'logs'),
      path.join(docsPath, folderName),
      path.join(userProfile, 'Documents', folderName, 'logs'),
      path.join(userProfile, 'Documents', folderName),
      path.join(docsPath, 'TrucklineMP', 'logs'),
      path.join(docsPath, 'TrucklineMP'),
      path.join(appData, 'TruckersMP', 'logs'),
      path.join(localAppData, 'TruckersMP', 'logs'),
    ];

    let allLogFiles: { fullPath: string; mtimeMs: number; isChat: boolean }[] = [];

    for (const dir of candidateDirs) {
      if (fs.existsSync(dir)) {
        try {
          const entries = fs.readdirSync(dir);
          for (const f of entries) {
            const lower = f.toLowerCase();
            const isLogOrTxt = lower.endsWith('.txt') || lower.endsWith('.log');
            if (
              isLogOrTxt &&
              (lower.startsWith('chat_') ||
                lower.startsWith('client_') ||
                lower.startsWith('log_spawning_') ||
                lower.startsWith('connection_'))
            ) {
              const fullPath = path.join(dir, f);
              try {
                const stat = fs.statSync(fullPath);
                allLogFiles.push({
                  fullPath,
                  mtimeMs: stat.mtimeMs,
                  isChat: lower.startsWith('chat_')
                });
              } catch (e) {}
            }
          }
        } catch (e) {}
      }
    }

    if (allLogFiles.length === 0) return null;

    allLogFiles.sort((a, b) => b.mtimeMs - a.mtimeMs);

    // 1. Prefer newest chat logs (up to 3 newest) - they contain explicit server names like "Connecting to Simulation 1 server..."
    const chatFiles = allLogFiles.filter(f => f.isChat).slice(0, 3);
    for (const fileObj of chatFiles) {
      try {
        const content = fs.readFileSync(fileObj.fullPath, 'utf8');
        const lines = content.split('\n');

        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i].trim();
          if (!line) continue;

          if (
            line.includes('Connecting to') ||
            line.includes('Connected to') ||
            line.includes('Spawning on') ||
            line.includes('Connection to')
          ) {
            const match = line.match(
              /(?:Connecting to|Connected to(?:\s*server:?)?|Spawning on)\s+(?:\[[^\]]*\]\s*)?([^(\r\n!]+)/i
            );
            if (match && match[1]) {
              let s = match[1]
                .replace(/\[.*?\]/g, '')
                .replace(/\s*server[\s\.]*$/i, '')
                .replace(/\.+$/, '')
                .trim();
              if (s && s.length >= 2 && !s.toLowerCase().includes("failed") && !s.toLowerCase().includes("offline")) {
                return s;
              }
            }
          }
        }
      } catch (e) {}
    }

    // 2. Fallback to client logs (up to 3 newest)
    const clientFiles = allLogFiles.filter(f => !f.isChat).slice(0, 3);
    for (const fileObj of clientFiles) {
      try {
        const content = fs.readFileSync(fileObj.fullPath, 'utf8');
        const lines = content.split('\n');

        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i].trim();
          if (!line) continue;

          if (
            line.includes('Connecting to') ||
            line.includes('Connected to') ||
            line.includes('Spawning on') ||
            line.includes('Connection to')
          ) {
            const match = line.match(
              /(?:Connecting to|Connected to(?:\s*server:?)?|Spawning on)\s+(?:\[[^\]]*\]\s*)?([^(\r\n!]+)/i
            );
            if (match && match[1]) {
              let s = match[1]
                .replace(/\[.*?\]/g, '')
                .replace(/\s*server[\s\.]*$/i, '')
                .replace(/\.+$/, '')
                .trim();
              // If it's an IP address or port, we know it's a TruckersMP server
              if (/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+(?::[0-9]+)?$/.test(s)) {
                return "Simulation 1";
              }
              if (s && s.length >= 2 && !s.toLowerCase().includes("failed") && !s.toLowerCase().includes("offline")) {
                return s;
              }
            }
          }
        }
      } catch (e) {}
    }
  } catch (e) {
    console.error('❌ Fehler beim Lesen der TruckersMP Logs:', e);
  }
  return null;
}

// Stable server-name resolution.
let lastResolvedServerName: string | null = null;
let activeJobServerName: string | null = null;

function resolveServerName(data: any): string {
  // 1. Check local TruckersMP client logs first (most immediate & accurate)
  const logServerName = getTruckersMPActiveServer(data?.gameType === 2 ? "ATS" : "ETS2");
  if (logServerName && logServerName.trim()) {
    lastResolvedServerName = logServerName.trim();
    return lastResolvedServerName;
  }

  // 2. Check API session
  const apiServerName = truckersmpSession?.server_name;
  if (apiServerName && apiServerName.trim()) {
    lastResolvedServerName = apiServerName.trim();
    return lastResolvedServerName;
  }

  // 3. If telemetry is connected and we previously resolved a valid server name, keep it
  if (lastResolvedServerName && data?.connected) {
    return lastResolvedServerName;
  }

  // 4. Check if native bridge or traffic plugin detected TruckersMP
  const hasTmpTraffic = data?.nearbyVehicles && Array.isArray(data.nearbyVehicles) && data.nearbyVehicles.some((v: any) => v.isTmp);
  if (data?.isTruckersMp || hasTmpTraffic) {
    lastResolvedServerName = "Simulation 1";
    return lastResolvedServerName;
  }

  // 5. Check SCS Convoy Mode
  const isConvoy = data && data.multiplayerTimeOffset && data.multiplayerTimeOffset !== 0;
  if (isConvoy) {
    return "Convoy";
  }

  return "Singleplayer";
}

const BACKEND_URL = process.env.VITE_BACKEND_URL 
  ? `${process.env.VITE_BACKEND_URL}/api` 
  : 'https://open-pipe-club-backend.nicohertling09.workers.dev/api';

let activeJobCargoMass = 0;

async function handleTrackingLogic(current: any, prev: any) {
  if (!current.connected) return;

  // Periodically poll TruckersMP session for Discord RPC
  pollTruckersMPSession();

  const cargo = (current.cargo || "").trim();
  const source = (current.source || "").trim();
  const dest = (current.dest || "").trim();
  const cargoValid = cargo.length > 0 && cargo.toLowerCase() !== 'none';
  const routeValid = source.length > 0 && dest.length > 0;

  // Only consider a job active if we have cargo AND both source and destination cities
  const isJobActive = cargoValid && routeValid;
  const jobDetails = isJobActive ? `${cargo}|${source}|${dest}` : null;
  const now = Date.now();

  // Maintain cargo mass across tick cycles while job is active
  if (current.cargoMass && current.cargoMass > 0) {
    activeJobCargoMass = current.cargoMass;
  } else if (isJobActive) {
    if (activeJobCargoMass > 0) {
      current.cargoMass = activeJobCargoMass;
    } else if (cargoValid) {
      activeJobCargoMass = 18.5;
      current.cargoMass = 18.5;
    }
  }
  const effectiveCargoMass = (current.cargoMass && current.cargoMass > 0) 
    ? current.cargoMass 
    : (activeJobCargoMass > 0 ? activeJobCargoMass : (isJobActive ? 18.5 : 0));

  const serverName = resolveServerName(current);
  const modeStr = (serverName && serverName !== "Singleplayer" && serverName !== "Convoy") ? "TruckersMP" : ((current.multiplayerTimeOffset && current.multiplayerTimeOffset !== 0) ? "Convoy" : "Singleplayer");
  const gameStr = current.gameType === 2 ? "ATS" : "ETS2";
  const steamIdVal = current.steamId || null;

  // Track stats and route points during active job
  if (isJobActive) {
    jobTotalSpeed += (current.speed || 0);
    jobSpeedTicks++;
    jobMaxSpeed = Math.max(jobMaxSpeed, current.speed || 0);

    // Continuous Fuel & Refuel Tracking
    const curFuel = current.fuel;
    if (typeof curFuel === 'number' && curFuel > 0) {
      if (jobLastFuel > 0 && curFuel > jobLastFuel) {
        const diff = curFuel - jobLastFuel;
        if (diff > 0.5) {
          jobTotalRefueled += diff;
          writeToLog(`⛽ Tankvorgang während Job erkannt: +${diff.toFixed(1)} L nachgetankt (Gesamt nachgetankt: ${jobTotalRefueled.toFixed(1)} L)`);
        }
      }
      jobLastFuel = curFuel;
      if (activeJobSession) {
        activeJobSession.lastFuel = jobLastFuel;
        activeJobSession.totalRefueled = jobTotalRefueled;
      }
    }

    // Continuous Route Point Recording
    if (current.posX != null && current.posZ != null) {
      const gx = Number(current.posX);
      const gy = Number(current.posZ);
      const gz = Number(current.posY || 0);
      const last = jobLastRecordedPos;
      const distMoved = last ? Math.sqrt(Math.pow(gx - last.x, 2) + Math.pow(gy - last.y, 2)) : 999;
      const timeDiff = last ? (now - last.time) : 99999;

      if (distMoved >= 35 || (timeDiff >= 4000 && (current.speed || 0) > 2)) {
        jobRoutePoints.push({
          game_x: gx,
          game_y: gy,
          game_z: gz,
          speed: Math.round(current.speed || 0),
          ts: new Date().toISOString()
        });

        // Keep memory & payload under control (max 1000 points)
        if (jobRoutePoints.length > 1000) {
          jobRoutePoints = jobRoutePoints.filter((_, idx) => idx % 2 === 0 || idx === jobRoutePoints.length - 1);
        }

        jobLastRecordedPos = { x: gx, y: gy, z: gz, time: now };
      }
    }
  }

  // 1. Position Update (every 5 seconds) - Sent if online with token
  if (userToken && current.connected && (now - lastPositionSent > 5000)) {
    lastPositionSent = now;
    console.log(`📍 Tracking: Sende Position (${current.source || 'Fahrt'})`);

    try {
      fetch(`${BACKEND_URL}/desktop/position`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          game_x: current.posX,
          game_y: current.posZ,
          game_z: current.posY,
          heading: current.heading,
          speed: current.speed,
          fuel: current.fuel,
          brand: current.brand,
          model: current.model,
          city: current.city || currentCity || null,
          server_name: serverName,
          game: gameStr,
          steam_id: steamIdVal,
          in_game: true,
          cargo: (current.cargo && current.cargo.toLowerCase() !== 'none') ? current.cargo : null,
          cargo_mass_kg: Math.round(effectiveCargoMass * 1000),
          source_city: current.source || null,
          destination_city: current.dest || null,
          source_company: current.source_company || null,
          destination_company: current.dest_company || null
        })
      }).then(res => {
        if (!res.ok) console.error(`❌ Tracking Fehler: ${res.status} ${res.statusText}`);
      }).catch(err => console.error("❌ Tracking Netzwerkfehler:", err.message));
    } catch (e) { }

    // 1b. Route-Punkt an Backend senden (Live-Backup)
    if (currentJobId && current.connected && (now - lastRoutePointSent > 8000)) {
      lastRoutePointSent = now;
      try {
        fetch(`${BACKEND_URL}/desktop/job-position`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
          },
          body: JSON.stringify({
            job_id: currentJobId,
            game_x: current.posX,
            game_y: current.posZ,
            game_z: current.posY,
            heading: current.heading,
            speed: current.speed,
            game: gameStr,
            ts: new Date().toISOString()
          })
        }).catch(() => { });
      } catch (e) { }
    }
  }

  // 2. Job Events: Start & Resume Handling
  if (isJobActive) {
    if (activeJobSession && activeJobSession.jobDetails === jobDetails) {
      // RESUME EXISTING JOB ACROSS RESTARTS / SAVES
      noCargoInWorldTicks = 0;
      if (currentJobId !== activeJobSession.jobId) {
        currentJobId = activeJobSession.jobId;
        lastJobDetails = activeJobSession.jobDetails;
        jobStartTime = activeJobSession.startTime;
        jobStartFuel = activeJobSession.startFuel;
        jobLastFuel = activeJobSession.lastFuel ?? activeJobSession.startFuel;
        jobTotalRefueled = activeJobSession.totalRefueled ?? 0;
        jobStartOdometer = activeJobSession.startOdometer;
        jobStartIncome = activeJobSession.startIncome;
        jobPlannedDistance = activeJobSession.plannedDistance;
        jobStartDeliveredRevenue = activeJobSession.startDeliveredRevenue || 0;
        jobStartDeliveredXp = activeJobSession.startDeliveredXp || 0;
        jobTotalSpeed = activeJobSession.totalSpeed || 0;
        jobSpeedTicks = activeJobSession.speedTicks || 0;
        jobMaxSpeed = activeJobSession.maxSpeed || 0;
        jobRoutePoints = activeJobSession.routePoints || [];
        jobLastRecordedPos = activeJobSession.lastRecordedPos || null;
        activeJobServerName = activeJobSession.serverName;
        activeJobCargoMass = activeJobSession.cargoMass;

        writeToLog(`🔄 Job Fortsetzung erkannt: ${cargo} (${source} -> ${dest}) [Job-ID: ${currentJobId}]`);
        const jobData = {
          type: 'resume',
          cargo: cargo,
          source: current.source,
          dest: current.dest
        };
        safeSend(win, 'job-notification', jobData);
        safeSend(overlayWin, 'job-notification', jobData);
      }

      // Keep active session updated
      activeJobSession.totalSpeed = jobTotalSpeed;
      activeJobSession.speedTicks = jobSpeedTicks;
      activeJobSession.maxSpeed = jobMaxSpeed;
      activeJobSession.routePoints = jobRoutePoints;
      activeJobSession.lastRecordedPos = jobLastRecordedPos;
      activeJobSession.lastFuel = jobLastFuel;
      activeJobSession.totalRefueled = jobTotalRefueled;
      activeJobSession.updatedAt = now;
      saveActiveJobSession(activeJobSession);
    } else if (jobDetails !== lastJobDetails) {
      // If a different job was already active and not delivered, cancel it first
      if (activeJobSession && activeJobSession.jobId) {
        writeToLog(`⚠️ Neuer Job gestartet, während alter Job ${activeJobSession.jobId} aktiv war - breche alten Job ab`);
        const cancelPayload = {
          event: "cancelled",
          job_id: activeJobSession.jobId,
          cargo: activeJobSession.cargo,
          source_city: activeJobSession.source,
          destination_city: activeJobSession.dest,
          ended_at: new Date().toISOString()
        };
        sendJobEventWithQueue(cancelPayload).catch(() => {});
      }

      currentJobId = crypto.randomUUID();
      lastJobDetails = jobDetails;
      activeJobServerName = (serverName && serverName !== "Singleplayer") ? serverName : (lastResolvedServerName || serverName);

      // Reset & Initialize Job Stats
      jobStartTime = Date.now();
      jobStartFuel = current.fuel || 0;
      jobLastFuel = jobStartFuel;
      jobTotalRefueled = 0;
      jobStartOdometer = current.odometer || 0;
      jobStartIncome = current.income || 0;
      jobPlannedDistance = current.plannedDistance || 0;
      jobStartDeliveredRevenue = current.jobDeliveredRevenue ? Number(current.jobDeliveredRevenue) : 0;
      jobStartDeliveredXp = current.jobDeliveredEarnedXp ? Number(current.jobDeliveredEarnedXp) : 0;
      jobTotalSpeed = 0;
      jobSpeedTicks = 0;
      jobMaxSpeed = 0;
      jobRoutePoints = [];
      noCargoInWorldTicks = 0;

      if (current.posX != null && current.posZ != null) {
        jobRoutePoints.push({
          game_x: Number(current.posX),
          game_y: Number(current.posZ),
          game_z: Number(current.posY || 0),
          speed: Math.round(current.speed || 0),
          ts: new Date().toISOString()
        });
        jobLastRecordedPos = { x: Number(current.posX), y: Number(current.posZ), z: Number(current.posY || 0), time: now };
      }

      activeJobSession = {
        jobId: currentJobId,
        jobDetails: jobDetails,
        cargo: cargo,
        source: current.source,
        dest: current.dest,
        sourceCompany: current.source_company || "",
        destCompany: current.dest_company || "",
        cargoMass: effectiveCargoMass,
        serverName: activeJobServerName,
        mode: modeStr,
        game: gameStr,
        startTime: jobStartTime,
        startFuel: jobStartFuel,
        lastFuel: jobLastFuel,
        totalRefueled: jobTotalRefueled,
        startOdometer: jobStartOdometer,
        startIncome: jobStartIncome,
        plannedDistance: jobPlannedDistance,
        startDeliveredRevenue: jobStartDeliveredRevenue,
        startDeliveredXp: jobStartDeliveredXp,
        totalSpeed: jobTotalSpeed,
        speedTicks: jobSpeedTicks,
        maxSpeed: jobMaxSpeed,
        routePoints: jobRoutePoints,
        lastRecordedPos: jobLastRecordedPos,
        updatedAt: now
      };
      saveActiveJobSession(activeJobSession);
      saveSettings();

      writeToLog(`🚚 Job Start erkannt: ${cargo} (${current.source} nach ${current.dest}) [Job-ID: ${currentJobId}]`);
      const jobData = {
        type: 'start',
        cargo: cargo,
        source: current.source,
        dest: current.dest
      };
      safeSend(win, 'job-notification', jobData);
      safeSend(overlayWin, 'job-notification', jobData);

      const startPayload = {
        event: "start",
        job_id: currentJobId,
        source_company: current.source_company,
        source_city: current.source,
        destination_company: current.dest_company,
        destination_city: current.dest,
        cargo: current.cargo,
        cargo_mass_kg: Math.round(effectiveCargoMass * 1000),
        planned_distance_km: current.plannedDistance || 0,
        distance_km: current.plannedDistance || 0,
        planned_income: current.income || 0,
        income: current.income || 0,
        truck: `${current.brand || ''} ${current.model || ''}`.trim() || "LKW",
        vehicle_brand_name: current.brand || "",
        vehicle_model_name: current.model || "",
        trailer: current.trailer || "Trailer",
        game: gameStr,
        server_name: serverName,
        mode: modeStr,
        started_at: new Date(jobStartTime).toISOString()
      };
      sendJobEventWithQueue(startPayload).catch(() => {});
    }
  }

  // 3. Job Delivered / Cancelled Detection
  if (!cargoValid && (activeJobSession || lastJobDetails !== null)) {
    // CRUCIAL SAFETY CHECK:
    // Player MUST be connected and loaded into a drivable truck in the game world!
    // If the game was closed, paused, or the player is in the main menu / profile selection / loading screen:
    // DO NOT touch activeJobSession! It must stay safely persisted on disk!
    const isInWorld = Boolean(current.connected && current.brand && current.brand.length > 0 && current.odometer > 0);

    if (!isInWorld) {
      // In loading screen, main menu, or game shut down -> Keep job safe on disk
      noCargoInWorldTicks = 0;
      return;
    }

    const session = activeJobSession || {
      jobId: currentJobId || crypto.randomUUID(),
      jobDetails: lastJobDetails || "",
      cargo: (lastJobDetails ? lastJobDetails.split('|')[0] : "Fracht"),
      source: (lastJobDetails ? lastJobDetails.split('|')[1] : ""),
      dest: (lastJobDetails ? lastJobDetails.split('|')[2] : ""),
      cargoMass: effectiveCargoMass,
      serverName: activeJobServerName,
      mode: modeStr,
      game: gameStr,
      startTime: jobStartTime || (now - 60000),
      startFuel: jobStartFuel,
      lastFuel: jobLastFuel,
      totalRefueled: jobTotalRefueled,
      startOdometer: jobStartOdometer,
      startIncome: jobStartIncome,
      plannedDistance: jobPlannedDistance,
      startDeliveredRevenue: jobStartDeliveredRevenue,
      startDeliveredXp: jobStartDeliveredXp,
      totalSpeed: jobTotalSpeed,
      speedTicks: jobSpeedTicks,
      maxSpeed: jobMaxSpeed,
      routePoints: jobRoutePoints,
      lastRecordedPos: jobLastRecordedPos,
      updatedAt: now
    };

    // Real Delivery Conditions:
    // 1. Direct gameplay event jobDelivered from SCS Telemetry SDK (via OPCGameBridge special_b.jobDelivered)
    const isDirectlyDelivered = current.jobDelivered === true;
    // 2. Incremental delivery revenue/XP higher than starting baseline of this job
    const baseRevenue = session.startDeliveredRevenue ?? jobStartDeliveredRevenue;
    const baseXp = session.startDeliveredXp ?? jobStartDeliveredXp;
    const hasNewDeliveryStats = Boolean(
      (current.jobDeliveredRevenue && current.jobDeliveredRevenue > baseRevenue) ||
      (current.jobDeliveredEarnedXp && current.jobDeliveredEarnedXp > baseXp)
    );
    // 3. Stopped directly inside destination delivery trigger (< 60m)
    const wasAtDeliveryPoint = Boolean(prev && prev.navDistance > 0 && prev.navDistance < 60 && (current.speed || 0) < 2);

    const isDelivered = isDirectlyDelivered || hasNewDeliveryStats || wasAtDeliveryPoint;

    if (isDelivered) {
      writeToLog(`🏁 Tracking: Job erfolgreich abgeschlossen (delivered) [Job-ID: ${session.jobId}]`);

      const elapsedMinutes = Math.max(1, Math.round((Date.now() - session.startTime) / 60000));
      const durationStr = elapsedMinutes < 60 ? `${elapsedMinutes}m` : `${Math.floor(elapsedMinutes / 60)}h ${elapsedMinutes % 60}m`;

      let distanceKm = 0;
      if (current.jobDeliveredDistanceKm && current.jobDeliveredDistanceKm > 0) {
        distanceKm = Math.round(current.jobDeliveredDistanceKm);
      } else if (session.startOdometer > 0 && current.odometer > session.startOdometer) {
        distanceKm = Math.round((current.odometer - session.startOdometer) * 10) / 10;
      } else if (session.plannedDistance > 0) {
        distanceKm = session.plannedDistance;
      }

      let income = 0;
      if (current.jobDeliveredRevenue && current.jobDeliveredRevenue > 0) {
        income = Number(current.jobDeliveredRevenue);
      } else if (session.startIncome > 0) {
        income = session.startIncome;
      } else if (distanceKm > 0) {
        income = Math.round(distanceKm * 35 + 250);
      }

      const avgSpeed = session.speedTicks > 0
        ? Math.round(session.totalSpeed / session.speedTicks)
        : (distanceKm > 0 && elapsedMinutes > 0 ? Math.min(120, Math.round(distanceKm / (elapsedMinutes / 60))) : 0);
      const maxSpeed = Math.round(session.maxSpeed);
      const finalFuel = (current.fuel && current.fuel > 0) ? current.fuel : (session.lastFuel || session.startFuel);
      const refueledLiters = session.totalRefueled ?? jobTotalRefueled ?? 0;
      const rawFuelUsed = (session.startFuel - finalFuel) + refueledLiters;
      const fuelUsed = Math.max(0, parseFloat(rawFuelUsed.toFixed(2)));
      const fuelEcon = (distanceKm > 0 && fuelUsed > 0) ? parseFloat(((fuelUsed / distanceKm) * 100).toFixed(1)) : 0;
      const pointsVal = (current.jobDeliveredEarnedXp && current.jobDeliveredEarnedXp > 0)
        ? current.jobDeliveredEarnedXp
        : (distanceKm > 0 ? Math.floor(distanceKm + (session.cargoMass * 15) + 50) : 0);

      const finalJobServerName = session.serverName || serverName;
      const finalJobModeStr = (finalJobServerName && finalJobServerName !== "Singleplayer" && finalJobServerName !== "Convoy")
        ? "TruckersMP"
        : ((current.multiplayerTimeOffset && current.multiplayerTimeOffset !== 0) ? "Convoy" : "Singleplayer");

      const deliveredPayload = {
        event: "delivered",
        job_id: session.jobId,
        cargo: session.cargo,
        source_city: session.source,
        destination_city: session.dest,
        source_company: current.source_company || session.sourceCompany || "",
        destination_company: current.dest_company || session.destCompany || "",
        cargo_mass_kg: Math.round(session.cargoMass * 1000),
        actual_distance_km: distanceKm,
        planned_distance_km: session.plannedDistance || distanceKm,
        actual_income: income,
        planned_income: session.startIncome || income,
        average_speed_kmh: avgSpeed,
        max_speed_kmh: maxSpeed,
        fuel_used_l: parseFloat(fuelUsed.toFixed(2)),
        fuel_economy_l100km: fuelEcon,
        damage_pct: current.jobDeliveredCargoDamage || current.wearCargo || 0,
        duration: durationStr,
        points: pointsVal,
        server_name: finalJobServerName,
        mode: finalJobModeStr,
        game: session.game || gameStr,
        truck: `${current.brand || ''} ${current.model || ''}`.trim() || "LKW",
        trailer: current.trailer || "Trailer",
        route: session.routePoints || [],
        started_at: new Date(session.startTime).toISOString(),
        ended_at: new Date().toISOString(),
        delivered_at: new Date().toISOString()
      };

      const jobData = {
        type: 'delivered',
        cargo: session.cargo,
        source: session.source,
        dest: session.dest
      };
      safeSend(win, 'job-notification', jobData);
      safeSend(overlayWin, 'job-notification', jobData);

      sendJobEventWithQueue(deliveredPayload).catch(() => {});

      // Clear session completely
      activeJobSession = null;
      saveActiveJobSession(null);
      activeJobServerName = null;
      activeJobCargoMass = 0;
      lastJobDetails = null;
      currentJobId = null;
      noCargoInWorldTicks = 0;
      jobStartDeliveredRevenue = 0;
      jobStartDeliveredXp = 0;
      saveSettings();

      // Reset stats
      jobStartFuel = 0;
      jobLastFuel = 0;
      jobTotalRefueled = 0;
      jobStartTime = 0;
      jobStartOdometer = 0;
      jobStartIncome = 0;
      jobPlannedDistance = 0;
      jobTotalSpeed = 0;
      jobSpeedTicks = 0;
      jobMaxSpeed = 0;
      jobRoutePoints = [];
      jobLastRecordedPos = null;

      // Clear route in CarPlay, Overlay, and Frontend
      cachedRouteWaypoints = null;
      if (telemetryData) {
        telemetryData.routeWaypoints = [];
        telemetryData.dest = "";
        telemetryData.source = "";
        telemetryData.dest_company = "";
        telemetryData.source_company = "";
        telemetryData.cargo = "";
        telemetryData.jobActive = false;
        telemetryData.navDistance = 0;
        telemetryData.navTime = 0;
        safeSend(carplayWin, 'telemetry-update', telemetryData);
        safeSend(overlayWin, 'telemetry-update', telemetryData);
        safeSend(win, 'telemetry-update', telemetryData);
        broadcastCarPlaySse('telemetry-update', telemetryData);
      }

      safeSend(win, 'job-update', jobData);
    } else {
      // Check if player is actively driving in the world without cargo
      const isInWorldDriving = isInWorld && !current.paused;

      if (isInWorldDriving) {
        noCargoInWorldTicks++;
        // If the player drives in-world without cargo for 6 consecutive ticks (~30s), they cancelled the job in game
        if (noCargoInWorldTicks >= 6) {
          writeToLog(`⚠️ Tracking: Job in-game abgebrochen (${session.cargo}, ID: ${session.jobId})`);

          const jobData = {
            type: 'cancelled',
            cargo: session.cargo,
            source: session.source,
            dest: session.dest
          };
          safeSend(win, 'job-notification', jobData);
          safeSend(overlayWin, 'job-notification', jobData);

          const cancelPayload = {
            event: "cancelled",
            job_id: session.jobId,
            cargo: session.cargo,
            source_city: session.source,
            destination_city: session.dest,
            ended_at: new Date().toISOString()
          };
          sendJobEventWithQueue(cancelPayload).catch(() => {});

          activeJobSession = null;
          saveActiveJobSession(null);
          activeJobServerName = null;
          activeJobCargoMass = 0;
          lastJobDetails = null;
          currentJobId = null;
          noCargoInWorldTicks = 0;
          jobStartDeliveredRevenue = 0;
          jobStartDeliveredXp = 0;
          saveSettings();

          jobStartFuel = 0;
          jobLastFuel = 0;
          jobTotalRefueled = 0;
          jobStartTime = 0;
          jobStartOdometer = 0;
          jobStartIncome = 0;
          jobPlannedDistance = 0;
          jobTotalSpeed = 0;
          jobSpeedTicks = 0;
          jobMaxSpeed = 0;
          jobRoutePoints = [];
          jobLastRecordedPos = null;

          // Clear route in CarPlay, Overlay, and Frontend
          cachedRouteWaypoints = null;
          if (telemetryData) {
            telemetryData.routeWaypoints = [];
            telemetryData.dest = "";
            telemetryData.source = "";
            telemetryData.dest_company = "";
            telemetryData.source_company = "";
            telemetryData.cargo = "";
            telemetryData.jobActive = false;
            telemetryData.navDistance = 0;
            telemetryData.navTime = 0;
            safeSend(carplayWin, 'telemetry-update', telemetryData);
            safeSend(overlayWin, 'telemetry-update', telemetryData);
            safeSend(win, 'telemetry-update', telemetryData);
            broadcastCarPlaySse('telemetry-update', telemetryData);
          }

          safeSend(win, 'job-update', jobData);
        }
      } else {
        // Player is paused -> keep counter reset
        noCargoInWorldTicks = 0;
      }
    }
  }

  prevJobActive = isJobActive;
}

ipcMain.on('set-auth-token', (_, token) => {
  console.log(`🔑 Auth: Token erhalten (${token ? 'Vorhanden' : 'Gelöscht'})`);
  userToken = token;
  if (token) {
    processOfflineJobQueue().catch(() => {});
  }
});

ipcMain.handle('get-offline-queue-status', () => {
  const queue = loadOfflineJobQueue();
  return {
    pendingCount: queue.length,
    isSyncing: isOfflineSyncing,
    hasActiveJob: !!activeJobSession
  };
});

ipcMain.handle('trigger-offline-sync', async () => {
  await processOfflineJobQueue();
  const queue = loadOfflineJobQueue();
  return {
    pendingCount: queue.length,
    isSyncing: isOfflineSyncing
  };
});



function updateOverlayStatus() {
  const isOpen = isOverlayActive || !!(logoWin || driversWin || eventWin);
  win?.webContents.send('overlay-status-changed', isOpen);
}

function updateOverlayWindowVisibility(data: any) {
  if (!overlayWin || overlayWin.isDestroyed()) return;

  // If overlay is disabled globally, keep it hidden
  if (!isOverlayActive) {
    if (overlayWin.isVisible()) {
      overlayWin.hide();
    }
    return;
  }

  // If overlay is not locked (Setup Mode), always show
  if (!isOverlayLocked) {
    if (!overlayWin.isVisible()) {
      overlayWin.showInactive();
    }
    return;
  }

  // Check telemetry-based visibility criteria
  if (!data || !data.connected || data.gameVersion === 0) {
    if (overlayWin.isVisible()) {
      overlayWin.hide();
    }
    return;
  }

  const activeTitle = (data.activeTitle || '').toLowerCase();
  const isGameActive =
    activeTitle.includes('euro truck simulator 2') ||
    activeTitle.includes('american truck simulator') ||
    activeTitle.includes('truckersmp');

  if (isGameActive) {
    if (!overlayWin.isVisible()) {
      overlayWin.showInactive();
    }
  } else {
    if (overlayWin.isVisible()) {
      overlayWin.hide();
    }
  }
}

function createSingleOverlayWindow() {
  if (overlayWin && !overlayWin.isDestroyed()) {
    updateOverlayWindowVisibility(telemetryData);
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.bounds;

  overlayWin = new BrowserWindow({
    x,
    y,
    width,
    height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    focusable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.cjs'),
      backgroundThrottling: false,
      webSecurity: false,
    },
  });

  overlayWin.setAlwaysOnTop(true, 'screen-saver');
  overlayWin.setBounds({ x, y, width, height });

  overlayWin.setBackgroundColor('#00000000');
  overlayWin.setIgnoreMouseEvents(true, { forward: true });

  if (process.env.VITE_DEV_SERVER_URL) {
    overlayWin.loadURL(`${process.env.VITE_DEV_SERVER_URL}#overlay-main`);
  } else {
    overlayWin.loadFile(path.join(process.env.DIST, 'index.html'), { hash: 'overlay-main' });
  }

  overlayWin.webContents.on('did-finish-load', () => {
    // Always ignore mouse events to allow clicking through the overlay window
    overlayWin?.setIgnoreMouseEvents(true, { forward: true });
    overlayWin?.webContents.send('overlay-lock-changed', isOverlayLocked);
    overlayWin?.webContents.send('overlay-settings-updated', overlaySettings);

    // Sync persisted positions on load
    const currentPositions = {
      logo: { x: logoX ?? 40, y: logoY ?? 40 },
      mainHud: { x: overlayX ?? 40, y: overlayY ?? 130 },
      event: { x: eventX ?? 40, y: eventY ?? 310 },
      drivers: { x: driversX ?? 40, y: driversY ?? 440 },
      spotify: { x: spotifyX ?? 40, y: spotifyY ?? 580 }
    };
    overlayWin?.webContents.send('overlay-positions-updated', currentPositions);

    if (telemetryData) {
      if (cachedRouteWaypoints && Array.isArray(cachedRouteWaypoints) && cachedRouteWaypoints.length > 0 && !telemetryData.routeWaypoints) {
        telemetryData.routeWaypoints = cachedRouteWaypoints;
      }
      overlayWin?.webContents.send('telemetry-update', telemetryData);
    }
  });

  overlayWin.once('ready-to-show', () => {
    updateOverlayWindowVisibility(telemetryData);
  });

  overlayWin.on('closed', () => {
    overlayWin = null;
    updateOverlayStatus();
  });

  updateOverlayStatus();
}

function syncOverlayWindows() {
  if (!isOverlayActive) {
    if (overlayWin && !overlayWin.isDestroyed()) {
      overlayWin.hide();
    }
    updateOverlayStatus();
    return;
  }

  if (!overlayWin || overlayWin.isDestroyed()) {
    createSingleOverlayWindow();
  } else {
    updateOverlayWindowVisibility(telemetryData);
    updateOverlayStatus();
  }
}

ipcMain.on('overlay-toggle', (_, explicitState?: boolean) => {
  isOverlayActive = typeof explicitState === 'boolean' ? explicitState : !isOverlayActive;
  saveSettings();
  syncOverlayWindows();
  updateOverlayStatus();
});

ipcMain.handle('overlay-status', () => {
  return isOverlayActive;
});

ipcMain.handle('overlay-lock-status', () => {
  return isOverlayLocked;
});

ipcMain.on('overlay-lock', (_, locked: boolean) => {
  isOverlayLocked = locked;
  saveSettings();
  if (overlayWin && !overlayWin.isDestroyed()) {
    overlayWin.setIgnoreMouseEvents(true, { forward: true }); // Keep ignore mouse events to be click-through
    overlayWin.webContents.send('overlay-lock-changed', locked);
    updateOverlayWindowVisibility(telemetryData);
  }
});

ipcMain.on('overlay-positions-updated', (_, positions) => {
  if (positions.logo) { logoX = positions.logo.x; logoY = positions.logo.y; }
  if (positions.mainHud) { overlayX = positions.mainHud.x; overlayY = positions.mainHud.y; }
  if (positions.drivers) { driversX = positions.drivers.x; driversY = positions.drivers.y; }
  if (positions.event) { eventX = positions.event.x; eventY = positions.event.y; }
  if (positions.spotify) { spotifyX = positions.spotify.x; spotifyY = positions.spotify.y; }
  saveSettings();
  if (overlayWin && !overlayWin.isDestroyed()) {
    overlayWin.webContents.send('overlay-positions-updated', positions);
  }
});

const mediaKeyTempPath = path.join(app.getPath('temp'), 'openpipeclub_mediakey.ps1');

function sendMediaKey(vkCode: number) {
  const scriptContent = `param([int]$vkCode)
$source = @"
using System;
using System.Runtime.InteropServices;
public class User32 {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, uint dwExtraInfo);
}
"@
try {
    Add-Type -TypeDefinition $source -ErrorAction SilentlyContinue
} catch {}
[User32]::keybd_event($vkCode, 0, 0, 0)
[User32]::keybd_event($vkCode, 0, 2, 0)
`;
  try {
    fs.writeFileSync(mediaKeyTempPath, scriptContent, 'utf8');
  } catch (e) {}

  exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${mediaKeyTempPath}" ${vkCode}`, (error) => {
    if (error) writeToLog(`Failed to send media key ${vkCode}: ${error.message}`);
  });
}

let lastCarPlayHotkeys: Record<string, string> = {};

function registerCarPlayHotkeys() {
  Object.values(lastCarPlayHotkeys).forEach(hk => {
    if (hk) {
      try {
        globalShortcut.unregister(hk);
      } catch (err) {
        writeToLog(`Failed to unregister hotkey ${hk}: ${err}`);
      }
    }
  });
  lastCarPlayHotkeys = {};

  if (!overlaySettings.showCarPlay) return;

  const keys = overlaySettings.carPlayHotkeys || {
    toggle: 'F9',
    next: 'Ctrl+Alt+Right',
    prev: 'Ctrl+Alt+Left',
    home: 'Ctrl+Alt+H',
    playPause: 'Ctrl+Alt+Space',
    navUp: 'Ctrl+Alt+Up',
    navDown: 'Ctrl+Alt+Down',
    navLeft: 'Ctrl+Alt+Left',
    navRight: 'Ctrl+Alt+Right',
    navEnter: 'Ctrl+Alt+Enter',
    navBack: 'Ctrl+Alt+Backspace'
  };

  const registerSafe = (keyName: string, accelerator: string, callback: () => void) => {
    if (!accelerator) return;
    try {
      globalShortcut.register(accelerator, callback);
      lastCarPlayHotkeys[keyName] = accelerator;
      writeToLog(`Registered hotkey ${keyName}: ${accelerator}`);
    } catch (err) {
      writeToLog(`Failed to register hotkey ${keyName} (${accelerator}): ${err}`);
    }
  };

  if (isCarPlayMode) {
    // Registrations for the CarPlay overlay window itself
    registerSafe('next', keys.next, () => {
      if (carplayWin && !carplayWin.isDestroyed()) {
        carplayWin.webContents.send('carplay-action', 'next');
      }
    });
    registerSafe('prev', keys.prev, () => {
      if (carplayWin && !carplayWin.isDestroyed()) {
        carplayWin.webContents.send('carplay-action', 'prev');
      }
    });
    registerSafe('home', keys.home, () => {
      if (carplayWin && !carplayWin.isDestroyed()) {
        carplayWin.webContents.send('carplay-action', 'home');
      }
    });
    registerSafe('playPause', keys.playPause, () => {
      sendMediaKey(0xB3);
    });
    registerSafe('navUp', keys.navUp || 'Ctrl+Alt+Up', () => {
      if (carplayWin && !carplayWin.isDestroyed()) {
        carplayWin.webContents.send('carplay-action', 'up');
      }
    });
    registerSafe('navDown', keys.navDown || 'Ctrl+Alt+Down', () => {
      if (carplayWin && !carplayWin.isDestroyed()) {
        carplayWin.webContents.send('carplay-action', 'down');
      }
    });
    registerSafe('navLeft', keys.navLeft || 'Ctrl+Alt+Left', () => {
      if (carplayWin && !carplayWin.isDestroyed()) {
        carplayWin.webContents.send('carplay-action', 'left');
      }
    });
    registerSafe('navRight', keys.navRight || 'Ctrl+Alt+Right', () => {
      if (carplayWin && !carplayWin.isDestroyed()) {
        carplayWin.webContents.send('carplay-action', 'right');
      }
    });
    registerSafe('navEnter', keys.navEnter || 'Ctrl+Alt+Enter', () => {
      if (carplayWin && !carplayWin.isDestroyed()) {
        carplayWin.webContents.send('carplay-action', 'enter');
      }
    });
    registerSafe('navBack', keys.navBack || 'Ctrl+Alt+Backspace', () => {
      if (carplayWin && !carplayWin.isDestroyed()) {
        carplayWin.webContents.send('carplay-action', 'back');
      }
    });
  } else {
    registerSafe('toggle', keys.toggle, () => {
      toggleCarPlayWindow();
    });
    registerSafe('next', keys.next, () => {
      if (carplayWin && !carplayWin.isDestroyed()) carplayWin.webContents.send('carplay-action', 'next');
    });
    registerSafe('prev', keys.prev, () => {
      if (carplayWin && !carplayWin.isDestroyed()) carplayWin.webContents.send('carplay-action', 'prev');
    });
    registerSafe('home', keys.home, () => {
      if (carplayWin && !carplayWin.isDestroyed()) carplayWin.webContents.send('carplay-action', 'home');
    });
    registerSafe('playPause', keys.playPause, () => {
      sendMediaKey(0xB3);
    });
    registerSafe('navUp', keys.navUp || 'Ctrl+Alt+Up', () => {
      if (carplayWin && !carplayWin.isDestroyed()) carplayWin.webContents.send('carplay-action', 'up');
    });
    registerSafe('navDown', keys.navDown || 'Ctrl+Alt+Down', () => {
      if (carplayWin && !carplayWin.isDestroyed()) carplayWin.webContents.send('carplay-action', 'down');
    });
    registerSafe('navLeft', keys.navLeft || 'Ctrl+Alt+Left', () => {
      if (carplayWin && !carplayWin.isDestroyed()) carplayWin.webContents.send('carplay-action', 'left');
    });
    registerSafe('navRight', keys.navRight || 'Ctrl+Alt+Right', () => {
      if (carplayWin && !carplayWin.isDestroyed()) carplayWin.webContents.send('carplay-action', 'right');
    });
    registerSafe('navEnter', keys.navEnter || 'Ctrl+Alt+Enter', () => {
      if (carplayWin && !carplayWin.isDestroyed()) carplayWin.webContents.send('carplay-action', 'enter');
    });
    registerSafe('navBack', keys.navBack || 'Ctrl+Alt+Backspace', () => {
      if (carplayWin && !carplayWin.isDestroyed()) carplayWin.webContents.send('carplay-action', 'back');
    });
  }
}

function toggleCarPlayWindow() {
  if (!carplayWin || carplayWin.isDestroyed()) {
    overlaySettings.showCarPlay = true;
    saveSettings();
    safeSend(win, 'overlay-settings-updated', overlaySettings);
    safeSend(overlayWin, 'overlay-settings-updated', overlaySettings);
    safeSend(win, 'carplay-status-changed', true);
    createCarPlayWindow();
  } else {
    safeSend(carplayWin, 'carplay-toggle-blackout');
  }
}

// RAM optimization: create window in-process instead of spawning a duplicate electron.exe
function spawnCarPlayProcess() {
  createCarPlayWindow();
}

function createCarPlayWindow() {
  if (carplayWin && !carplayWin.isDestroyed()) {
    if (!carplayWin.isVisible()) {
      carplayWin.showInactive();
    }
    safeSend(carplayWin, 'overlay-settings-updated', overlaySettings);
    return;
  }

  carplayWin = new BrowserWindow({
    width: 1024,
    height: 576,
    title: 'OPC CarPlay',
    icon: path.join(process.env.VITE_PUBLIC, 'logo.png'),
    frame: false,
    transparent: false,
    backgroundColor: '#000000',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.cjs'),
      backgroundThrottling: false,
      webSecurity: false,
    },
    minWidth: 640,
    minHeight: 360,
  });

  carplayWin.center();
  carplayWin.showInactive();

  const ASPECT_RATIO = 16 / 9;
  let isResizing = false;
  const enforceAspectRatio = () => {
    if (isResizing || !carplayWin || carplayWin.isDestroyed()) return;
    isResizing = true;
    const [width, height] = carplayWin.getSize();
    const newHeight = Math.round(width / ASPECT_RATIO);
    if (Math.abs(height - newHeight) > 1) {
      carplayWin.setSize(width, newHeight);
    }
    setTimeout(() => { isResizing = false; }, 50);
  };
  carplayWin.on('resize', enforceAspectRatio);

  if (process.platform === 'win32') {
    carplayWin.setAppDetails({ appId: 'com.openpipeclub.app.carplay' });
  }

  if (process.env.VITE_DEV_SERVER_URL) {
    carplayWin.loadURL(`${process.env.VITE_DEV_SERVER_URL}#overlay-carplay`);
  } else {
    carplayWin.loadFile(path.join(process.env.DIST, 'index.html'), { hash: 'overlay-carplay' });
  }

  carplayWin.webContents.on('did-finish-load', () => {
    if (telemetryData) {
      safeSend(carplayWin, 'telemetry-update', telemetryData);
    }
    safeSend(carplayWin, 'overlay-settings-updated', overlaySettings);
    carplayWin.showInactive();
    carplayWin.center();
  });

  carplayWin.once('ready-to-show', () => {
    carplayWin.showInactive();
    carplayWin.center();
  });

  carplayWin.on('closed', () => {
    carplayWin = null;
    if (!isQuitting && win && !win.isDestroyed()) {
      safeSend(win, 'carplay-status-changed', false);
    }
    if (isCarPlayMode) {
      app.quit();
    }
  });
}

function closeCarPlayWindow() {
  if (carplayWin && !carplayWin.isDestroyed()) {
    carplayWin.close();
  }
  carplayWin = null;
}

ipcMain.on('carplay-media-control', (_, action) => {
  if (action === 'play-pause') {
    sendMediaKey(0xB3);
  } else if (action === 'next') {
    sendMediaKey(0xB0);
  } else if (action === 'prev') {
    sendMediaKey(0xB1);
  }
});

ipcMain.on('overlay-settings-changed', (_, settings) => {
  const carPlayChanged = overlaySettings.showCarPlay !== settings.showCarPlay;
  const hotkeysChanged = JSON.stringify(overlaySettings.carPlayHotkeys) !== JSON.stringify(settings.carPlayHotkeys);
  overlaySettings = settings;
  saveSettings();
  overlayWin?.webContents.send('overlay-settings-updated', settings);
  if (carplayWin && !carplayWin.isDestroyed()) {
    carplayWin.webContents.send('overlay-settings-updated', settings);
  }
  broadcastCarPlaySse('overlay-settings-updated', settings);
  if (isOverlayActive) {
    syncOverlayWindows();
  }
  if (carPlayChanged || hotkeysChanged) {
    registerCarPlayHotkeys();
  }
  if (carPlayChanged) {
    if (settings.showCarPlay) {
      createCarPlayWindow();
    } else {
      closeCarPlayWindow();
    }
  } else if (settings.showCarPlay) {
    if (!carplayWin || carplayWin.isDestroyed()) {
      createCarPlayWindow();
    }
  }
});

ipcMain.on('overlay-reset-positions', () => {
  safeSend(overlayWin, 'overlay-positions-reset');
});

ipcMain.on('overlay-resize', (_, type, w, h) => {
  let targetWin: BrowserWindow | null = null;
  if (type === 'main') targetWin = overlayWin;
  else if (type === 'logo') targetWin = logoWin;
  else if (type === 'drivers') targetWin = driversWin;
  else if (type === 'event') targetWin = eventWin;
  if (targetWin) {
    targetWin.setSize(w, h);
    if (type === 'main') { overlayW = w; overlayH = h; }
    else if (type === 'logo') { logoW = w; logoH = h; }
    else if (type === 'drivers') { driversW = w; driversH = h; }
    else if (type === 'event') { eventW = w; eventH = h; }
    saveSettings();
  }
});

ipcMain.handle('overlay-get-state', () => {
  const currentPositions = {
    logo: { x: logoX ?? 40, y: logoY ?? 40 },
    mainHud: { x: overlayX ?? 40, y: overlayY ?? 130 },
    event: { x: eventX ?? 40, y: eventY ?? 310 },
    drivers: { x: driversX ?? 40, y: driversY ?? 440 },
    spotify: { x: spotifyX ?? 40, y: spotifyY ?? 580 }
  };
  if (telemetryData && cachedRouteWaypoints && Array.isArray(cachedRouteWaypoints) && cachedRouteWaypoints.length > 0 && (!telemetryData.routeWaypoints || telemetryData.routeWaypoints.length === 0)) {
    telemetryData.routeWaypoints = cachedRouteWaypoints;
  }
  return {
    lock: isOverlayLocked,
    settings: overlaySettings,
    positions: currentPositions,
    telemetry: telemetryData
  };
});

// ─── SMTC (Windows Media Session) ────────────────────────────────────────────
// Reads what is currently playing on Windows (Spotify, YouTube, etc.)
// via the System Media Transport Controls (SMTC) using a C# WinRT helper.

const SMTC_FRIENDLY_NAMES: Record<string, string> = {
  'player.exe': 'Spotify',
  'spotify.exe': 'Spotify',
  'spotify': 'Spotify',
  'msedge.exe': 'Browser',
  'chrome.exe': 'Chrome',
  'firefox.exe': 'Firefox',
  'vlc.exe': 'VLC',
  'music.exe': 'Musik',
  'wmplayer.exe': 'WMP',
};

function getFriendlyAppName(sourceAppId: string, fallback: string): string {
  if (!sourceAppId) return fallback;
  const lower = sourceAppId.toLowerCase();
  const withoutExt = lower.replace(/\.exe$/i, '');
  const base = withoutExt.split(/[\\/]/).pop() || withoutExt;
  return SMTC_FRIENDLY_NAMES[base] || SMTC_FRIENDLY_NAMES[lower] || fallback;
}

const smtcScript = `
$source = @'
using System;
using System.IO;
using System.Reflection;

public class WinRtHelper {
    public static string GetBase64(object streamObj, int maxSize) {
        try {
            if (streamObj == null) return "";
            
            Type bufferType = Type.GetType("Windows.Storage.Streams.Buffer, Windows, ContentType=WindowsRuntime");
            Type bufferInterface = Type.GetType("Windows.Storage.Streams.IBuffer, Windows, ContentType=WindowsRuntime");
            Type inputStreamInterface = Type.GetType("Windows.Storage.Streams.IInputStream, Windows, ContentType=WindowsRuntime");
            Type optionsType = Type.GetType("Windows.Storage.Streams.InputStreamOptions, Windows, ContentType=WindowsRuntime");
            
            if (bufferType == null || bufferInterface == null || inputStreamInterface == null || optionsType == null) {
                return "";
            }
            
            object buffer = Activator.CreateInstance(bufferType, new object[] { (uint)maxSize });
            
            MethodInfo readAsyncMethod = inputStreamInterface.GetMethod("ReadAsync", new Type[] { bufferInterface, typeof(uint), optionsType });
            if (readAsyncMethod == null) return "";
            
            object optionsVal = Enum.ToObject(optionsType, 0);
            object readAsyncOp = readAsyncMethod.Invoke(streamObj, new object[] { buffer, (uint)maxSize, optionsVal });
            if (readAsyncOp == null) return "";
            
            Type extType = Type.GetType("System.WindowsRuntimeSystemExtensions, System.Runtime.WindowsRuntime, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089");
            if (extType == null) return "";
            
            MethodInfo asTaskMethod = null;
            foreach (var m in extType.GetMethods()) {
                if (m.Name == "AsTask" && m.GetGenericArguments().Length == 2) {
                    asTaskMethod = m;
                    break;
                }
            }
            if (asTaskMethod == null) return "";
            
            var closedMethod = asTaskMethod.MakeGenericMethod(bufferInterface, typeof(uint));
            
            dynamic task = closedMethod.Invoke(null, new object[] { readAsyncOp });
            task.Wait();
            
            dynamic resultBuffer = task.Result;
            if (resultBuffer == null) return "";
            
            Type bufExtType = Type.GetType("System.Runtime.InteropServices.WindowsRuntime.WindowsRuntimeBufferExtensions, System.Runtime.WindowsRuntime, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089");
            if (bufExtType == null) return "";
            
            var toArrayMethod = bufExtType.GetMethod("ToArray", new Type[] { bufferInterface });
            if (toArrayMethod == null) return "";
            
            byte[] bytes = (byte[])toArrayMethod.Invoke(null, new object[] { resultBuffer });
            if (bytes == null || bytes.Length == 0) return "";
            
            return Convert.ToBase64String(bytes);
        } catch (Exception) {
            return "";
        }
    }
}
'@

try {
    Add-Type -TypeDefinition $source -ReferencedAssemblies "System.Core", "Microsoft.CSharp" -ErrorAction SilentlyContinue
} catch {}

Add-Type -AssemblyName System.Runtime.WindowsRuntime

# Force-load the WinRT namespaces
[void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media, ContentType=WindowsRuntime]

$asTaskGeneric = $null
foreach ($m in [System.WindowsRuntimeSystemExtensions].GetMethods()) {
    if ($m.Name -eq 'AsTask' -and $m.GetParameters().Count -eq 1 -and $m.GetParameters()[0].ParameterType.Name -like 'IAsyncOperation*') {
        $asTaskGeneric = $m
        break
    }
}

function Await($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(-1) | Out-Null
    return $netTask.Result
}

function GetThumbnailBase64($thumbnail) {
    try {
        $streamRef = $thumbnail.OpenReadAsync()
        $stream = Await $streamRef ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
        $res = [WinRtHelper]::GetBase64($stream, 262144)
        return $res
    } catch {
        return ''
    }
}

$lastTitle = ''
$lastThumb = ''
$thumbAttempts = 0

while ($true) {
    if ($ParentPid -gt 0) {
        $parent = Get-Process -Id $ParentPid -ErrorAction SilentlyContinue
        if (-not $parent) {
            exit
        }
    }
    try {
        $mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
        $session = $mgr.GetCurrentSession()
        if ($session) {
            $info = Await ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
            $timeline = $session.GetTimelineProperties()
            $playback = $session.GetPlaybackInfo()
            $t = if ($info.Title) { $info.Title -replace '"','' } else { '' }
            $a = if ($info.Artist) { $info.Artist -replace '"','' } else { '' }
            $al = if ($info.AlbumTitle) { $info.AlbumTitle -replace '"','' } else { '' }
            $pos = [long]$timeline.Position.TotalMilliseconds
            $dur = [long]$timeline.EndTime.TotalMilliseconds
            $playing = ($playback.PlaybackStatus -eq [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionPlaybackStatus]::Playing)
            $src = if ($session.SourceAppUserModelId) { $session.SourceAppUserModelId -replace '"','' } else { '' }
            $playing_str = if ($playing) { 'true' } else { 'false' }
            
            # Only re-fetch thumbnail when track changes (expensive) or if it was empty and we have retries left
            if ($t -ne $lastTitle) {
                $lastTitle = $t
                $lastThumb = ''
                $thumbAttempts = 0
            }
            if ($lastThumb -eq '' -and $thumbAttempts -lt 5) {
                $thumbAttempts++
                if ($info.Thumbnail) {
                    $lastThumb = GetThumbnailBase64 $info.Thumbnail
                }
            }
            Write-Output ('{"title":"' + $t + '","artist":"' + $a + '","album":"' + $al + '","progress":' + $pos + ',"duration":' + $dur + ',"isPlaying":' + $playing_str + ',"source":"' + $src + '","thumb":"' + $lastThumb + '"}')
        } else {
            $lastTitle = ''
            $lastThumb = ''
            $thumbAttempts = 0
            Write-Output '{"title":"","artist":"","album":"","progress":0,"duration":0,"isPlaying":false,"source":"","thumb":""}'
        }
    } catch {
        Write-Output '{"title":"","artist":"","album":"","progress":0,"duration":0,"isPlaying":false,"source":"","thumb":""}'
    }
    Start-Sleep -Milliseconds 2000
}
`;

const smtcTempPath = path.join(app.getPath('temp'), 'openpipeclub_smtc_v2.ps1');
let smtcProcess: any = null;
let lastSmtcData: any = null;

function startSmtcBridge() {
  if (smtcProcess) return;

  try { fs.writeFileSync(smtcTempPath, smtcScript, 'utf8'); } catch (e) { }

  smtcProcess = spawn('powershell', [
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', smtcTempPath,
    '-ParentPid', process.pid.toString()
  ]);

  smtcProcess.on('error', (err: any) => {
    writeToLog(`SMTC process error: ${err.message}`);
  });

  smtcProcess.stdout.setEncoding('utf8');

  let smtcBuffer = '';
  smtcProcess.stdout.on('data', (data: any) => {
    smtcBuffer += data.toString();
    let boundary = smtcBuffer.indexOf('\n');
    while (boundary !== -1) {
      const line = smtcBuffer.substring(0, boundary).trim();
      smtcBuffer = smtcBuffer.substring(boundary + 1);
      boundary = smtcBuffer.indexOf('\n');
      if (!line || !line.startsWith('{')) continue;
      try {
        lastSmtcData = JSON.parse(line);
        if (lastSmtcData && lastSmtcData.source) {
          lastSmtcData.source = getFriendlyAppName(lastSmtcData.source, lastSmtcData.source);
        }
        safeSend(win, 'smtc-update', lastSmtcData);
        safeSend(overlayWin, 'smtc-update', lastSmtcData);
        safeSend(carplayWin, 'smtc-update', lastSmtcData);
        broadcastCarPlaySse('smtc-update', lastSmtcData);
      } catch (e) { }
    }
  });

  smtcProcess.stderr.on('data', (data: any) => {
    console.warn('⚠️ SMTC:', data.toString().substring(0, 200));
  });

  smtcProcess.on('exit', () => {
    smtcProcess = null;
    if (!isQuitting) {
      setTimeout(startSmtcBridge, 5000);
    }
  });
}

startSmtcBridge();

ipcMain.handle('get-smtc-media', () => lastSmtcData);
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// CarPlay Local Web- & Telemetry Server (for Browser, Tablet & URL Access)
// ─────────────────────────────────────────────────────────────────────────────
let carplayServerPort = 8383;
let carplayServer: http.Server | null = null;
const carplaySseClients = new Set<http.ServerResponse>();
const mjpegClients = new Set<http.ServerResponse>();
let captureInterval: NodeJS.Timeout | null = null;
let isCapturing = false;

function startCaptureLoop() {
  if (captureInterval) return;

  if (!carplayWin || carplayWin.isDestroyed()) {
    createCarPlayWindow();
  } else if (carplayWin.isMinimized()) {
    carplayWin.restore();
    carplayWin.showInactive();
  }

  captureInterval = setInterval(async () => {
    if (mjpegClients.size === 0) {
      if (captureInterval) {
        clearInterval(captureInterval);
        captureInterval = null;
      }
      return;
    }

    if (isCapturing) return;
    if (!carplayWin || carplayWin.isDestroyed()) {
      createCarPlayWindow();
      return;
    }

    isCapturing = true;
    try {
      const image = await carplayWin.webContents.capturePage();
      const jpeg = image.toJPEG(75);

      const header = Buffer.from(`--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${jpeg.length}\r\n\r\n`);
      const footer = Buffer.from('\r\n');

      for (const client of mjpegClients) {
        try {
          client.write(header);
          client.write(jpeg);
          client.write(footer);
        } catch (e) {
          mjpegClients.delete(client);
        }
      }
    } catch (err) {
    } finally {
      isCapturing = false;
    }
  }, 33);
}

function getCarPlayStreamHtml(): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>OPC CarPlay Remote</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; -webkit-user-select: none; }
    html, body {
      width: 100%; height: 100%;
      background: #000;
      color: #fff;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    #viewport {
      position: relative;
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #000;
    }
    #screen-container {
      position: relative;
      width: 100%;
      max-width: 177.78vh; /* 16:9 Aspect Ratio */
      height: 56.25vw;
      max-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #000;
    }
    #screen {
      width: 100%;
      height: 100%;
      object-fit: fill;
      display: block;
      touch-action: none;
      cursor: pointer;
    }
    #toolbar {
      position: absolute;
      bottom: 12px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: rgba(18, 18, 20, 0.8);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 30px;
      opacity: 0.35;
      transition: opacity 0.3s ease;
      z-index: 100;
    }
    #toolbar:hover, #toolbar:active {
      opacity: 1;
    }
    .btn {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #f59e0b;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      padding: 6px 12px;
      border-radius: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .btn:hover, .btn:active {
      background: #f59e0b;
      color: #000;
    }
    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    #touch-ripple {
      position: absolute;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid #f59e0b;
      background: rgba(245, 158, 11, 0.3);
      transform: translate(-50%, -50%) scale(0);
      pointer-events: none;
      transition: transform 0.2s ease-out, opacity 0.25s ease-out;
      opacity: 0;
      z-index: 99;
    }
    #touch-ripple.active {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
    }
  </style>
</head>
<body>
  <div id="viewport">
    <div id="screen-container">
      <img id="screen" src="/api/carplay/live-stream" alt="CarPlay Live" />
      <div id="touch-ripple"></div>

      <div id="toolbar">
        <div class="status-dot" title="Live Stream Aktiv"></div>
        <button class="btn" id="btn-home">⌂ Home</button>
        <button class="btn" id="btn-prev">⏮</button>
        <button class="btn" id="btn-play">⏯</button>
        <button class="btn" id="btn-next">⏭</button>
        <button class="btn" id="btn-fullscreen">⛶ Vollbild</button>
      </div>
    </div>
  </div>

  <script>
    const screen = document.getElementById('screen');
    const ripple = document.getElementById('touch-ripple');
    const container = document.getElementById('screen-container');

    function sendAction(action) {
      fetch('/api/carplay/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      }).catch(() => {});
    }

    function sendMedia(action) {
      fetch('/api/carplay/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      }).catch(() => {});
    }

    document.getElementById('btn-home').addEventListener('click', (e) => { e.stopPropagation(); sendAction('home'); });
    document.getElementById('btn-prev').addEventListener('click', (e) => { e.stopPropagation(); sendMedia('prev'); });
    document.getElementById('btn-play').addEventListener('click', (e) => { e.stopPropagation(); sendMedia('play-pause'); });
    document.getElementById('btn-next').addEventListener('click', (e) => { e.stopPropagation(); sendMedia('next'); });

    document.getElementById('btn-fullscreen').addEventListener('click', (e) => {
      e.stopPropagation();
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
        else if (document.documentElement.webkitRequestFullscreen) document.documentElement.webkitRequestFullscreen();
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      }
    });

    function handlePointer(e) {
      const rect = screen.getBoundingClientRect();
      const normX = (e.clientX - rect.left) / rect.width;
      const normY = (e.clientY - rect.top) / rect.height;

      if (normX >= 0 && normX <= 1 && normY >= 0 && normY <= 1) {
        const cRect = container.getBoundingClientRect();
        ripple.style.left = (e.clientX - cRect.left) + 'px';
        ripple.style.top = (e.clientY - cRect.top) + 'px';
        ripple.classList.remove('active');
        void ripple.offsetWidth;
        ripple.classList.add('active');
        setTimeout(() => ripple.classList.remove('active'), 250);

        fetch('/api/carplay/input', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'click', normX, normY })
        }).catch(() => {});
      }
    }

    screen.addEventListener('pointerdown', handlePointer);

    screen.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = screen.getBoundingClientRect();
      const normX = (e.clientX - rect.left) / rect.width;
      const normY = (e.clientY - rect.top) / rect.height;
      fetch('/api/carplay/input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'wheel', normX, normY, deltaX: e.deltaX, deltaY: e.deltaY })
      }).catch(() => {});
    }, { passive: false });

    screen.addEventListener('error', () => {
      setTimeout(() => {
        screen.src = '/api/carplay/live-stream?t=' + Date.now();
      }, 1000);
    });
  </script>
</body>
</html>`;
}

const CARPLAY_MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function getLanIpAddress(): string {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const ifaceList = interfaces[name];
      if (!ifaceList) continue;
      for (const iface of ifaceList) {
        if (iface.family === 'IPv4' && !iface.internal) {
          if (iface.address.startsWith('192.168.') || iface.address.startsWith('10.') || iface.address.startsWith('172.')) {
            return iface.address;
          }
        }
      }
    }
    for (const name of Object.keys(interfaces)) {
      const ifaceList = interfaces[name];
      if (!ifaceList) continue;
      for (const iface of ifaceList) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  } catch (e) { }
  return '127.0.0.1';
}

function broadcastCarPlaySse(event: string, data: any) {
  if (carplaySseClients.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of carplaySseClients) {
    try {
      client.write(payload);
    } catch (e) {
      carplaySseClients.delete(client);
    }
  }
}

function serveDistFile(rawUrl: string, res: http.ServerResponse) {
  const distDir = process.env.DIST || path.join(__dirname, '../dist');
  let cleanPath = rawUrl.split('?')[0];
  if (cleanPath === '/' || cleanPath === '/carplay' || cleanPath === '/overlay-carplay' || cleanPath === '/overlay') {
    cleanPath = '/index.html';
  }
  const filePath = path.join(distDir, cleanPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = CARPLAY_MIME_TYPES[ext] || 'application/octet-stream';

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    try {
      const data = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
      return;
    } catch (e) { }
  }

  const indexPath = path.join(distDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    try {
      const data = fs.readFileSync(indexPath);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
      return;
    } catch (e) { }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
}

function handleCarPlayHttpRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const rawUrl = req.url || '/';
  const urlPath = rawUrl.split('?')[0];

  // 1. Live Window Stream (MJPEG for iPad & Browser)
  if (urlPath === '/api/carplay/live-stream' || urlPath === '/stream.mjpg') {
    res.writeHead(200, {
      'Content-Type': 'multipart/x-mixed-replace; boundary=--frame',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'close',
      'Pragma': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    });
    mjpegClients.add(res);
    startCaptureLoop();
    req.on('close', () => {
      mjpegClients.delete(res);
    });
    return;
  }

  // 2. Input Simulation (Touch & Click mapping onto the normal CarPlay window)
  if (urlPath === '/api/carplay/input' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        if (carplayWin && !carplayWin.isDestroyed()) {
          const [winWidth, winHeight] = carplayWin.getSize();
          const targetX = Math.max(0, Math.min(winWidth - 1, Math.round(data.normX * winWidth)));
          const targetY = Math.max(0, Math.min(winHeight - 1, Math.round(data.normY * winHeight)));

          if (data.type === 'click') {
            carplayWin.webContents.sendInputEvent({
              type: 'mouseMove',
              x: targetX,
              y: targetY,
            });
            carplayWin.webContents.sendInputEvent({
              type: 'mouseDown',
              x: targetX,
              y: targetY,
              button: 'left',
              clickCount: 1,
            });
            setTimeout(() => {
              if (carplayWin && !carplayWin.isDestroyed()) {
                carplayWin.webContents.sendInputEvent({
                  type: 'mouseUp',
                  x: targetX,
                  y: targetY,
                  button: 'left',
                  clickCount: 1,
                });
              }
            }, 35);
          } else if (data.type === 'wheel') {
            carplayWin.webContents.sendInputEvent({
              type: 'mouseWheel',
              x: targetX,
              y: targetY,
              deltaX: data.deltaX || 0,
              deltaY: data.deltaY || 0,
            });
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err: any) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 3. SSE Stream
  if (urlPath === '/api/carplay/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write(`event: init\ndata: ${JSON.stringify({
      settings: overlaySettings,
      telemetry: telemetryData,
      media: lastSmtcData,
    })}\n\n`);
    carplaySseClients.add(res);
    req.on('close', () => {
      carplaySseClients.delete(res);
    });
    return;
  }

  // 4. State Snapshot
  if (urlPath === '/api/carplay/state') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      settings: overlaySettings,
      telemetry: telemetryData,
      media: lastSmtcData,
    }));
    return;
  }

  // 5. URL info endpoint
  if (urlPath === '/api/carplay/url') {
    const lanIp = getLanIpAddress();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      port: carplayServerPort,
      lanIp,
      localUrl: `http://localhost:${carplayServerPort}`,
      networkUrl: `http://${lanIp}:${carplayServerPort}`,
    }));
    return;
  }

  // 4. Media action (POST)
  if (urlPath === '/api/carplay/media' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        if (parsed.action === 'play-pause') {
          sendMediaKey(0xB3);
        } else if (parsed.action === 'next') {
          sendMediaKey(0xB0);
        } else if (parsed.action === 'prev') {
          sendMediaKey(0xB1);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err: any) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 5. CarPlay action (POST)
  if (urlPath === '/api/carplay/action' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        if (parsed.action) {
          if (carplayWin && !carplayWin.isDestroyed()) {
            carplayWin.webContents.send('carplay-action', parsed.action);
          }
          broadcastCarPlaySse('carplay-action', parsed.action);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err: any) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 6. Verify turn nodes (POST)
  if (urlPath === '/api/carplay/verify-turns' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const candidateTurns = parsed.turnPoints || [];
        const verified = mapDataDir ? verifyTurnPointsWithNodes(candidateTurns, mapDataDir) : candidateTurns;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, turnPoints: verified }));
      } catch (err: any) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 8. Default: CarPlay Remote Stream Page (Only CarPlay, mirrors & controls normal window)
  if (urlPath === '/' || urlPath === '/carplay' || urlPath === '/index.html') {
    const html = getCarPlayStreamHtml();
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // 9. Static Web App Files / Vite Dev Proxy (for /standalone or assets)
  if (process.env.VITE_DEV_SERVER_URL) {
    try {
      const viteUrl = new URL(process.env.VITE_DEV_SERVER_URL);
      const proxyReq = http.request({
        hostname: viteUrl.hostname || 'localhost',
        port: Number(viteUrl.port) || 5173,
        path: req.url,
        method: req.method,
        headers: {
          ...req.headers,
          host: `${viteUrl.hostname}:${viteUrl.port}`,
        }
      }, (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
        proxyRes.pipe(res);
      });
      proxyReq.on('error', () => {
        serveDistFile(rawUrl, res);
      });
      req.pipe(proxyReq);
      return;
    } catch (e) {
      serveDistFile(rawUrl, res);
      return;
    }
  }

  serveDistFile(rawUrl, res);
}

function startCarPlayHttpServer(port = 8383) {
  if (isCarPlayMode) return;
  if (carplayServer) return;

  const server = http.createServer((req, res) => {
    handleCarPlayHttpRequest(req, res);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      writeToLog(`CarPlay HTTP server port ${port} in use, trying ${port + 1}...`);
      if (port < 8390) {
        startCarPlayHttpServer(port + 1);
      } else {
        startCarPlayHttpServer(0);
      }
    } else {
      writeToLog(`CarPlay HTTP server error: ${err.message}`);
    }
  });

  server.listen(port, '0.0.0.0', () => {
    const address = server.address();
    carplayServerPort = typeof address === 'object' && address ? address.port : port;
    carplayServer = server;
    const lanIp = getLanIpAddress();
    console.log(`🚗 [CarPlay Server] Live Web-Server active on http://localhost:${carplayServerPort}/#carplay (Network: http://${lanIp}:${carplayServerPort}/#carplay)`);
    writeToLog(`CarPlay Server started on port ${carplayServerPort}`);
  });
}

ipcMain.handle('get-carplay-url', () => {
  const lanIp = getLanIpAddress();
  return {
    port: carplayServerPort,
    lanIp,
    localUrl: `http://localhost:${carplayServerPort}`,
    networkUrl: `http://${lanIp}:${carplayServerPort}`,
  };
});

// Start bridge once
startTelemetryBridge();


ipcMain.handle('telemetry-status', () => telemetryData);

ipcMain.handle('read-live-streams', async () => {
  const userDocs = app.getPath('documents');
  const possiblePaths = [
    path.join(userDocs, 'Euro Truck Simulator 2', 'live_streams.sii'),
    path.join(userDocs, 'American Truck Simulator', 'live_streams.sii'),
    ...(process.env.USERPROFILE ? [
      path.join(process.env.USERPROFILE, 'Documents', 'Euro Truck Simulator 2', 'live_streams.sii'),
      path.join(process.env.USERPROFILE, 'Documents', 'American Truck Simulator', 'live_streams.sii'),
      path.join(process.env.USERPROFILE, 'OneDrive', 'Dokumente', 'Euro Truck Simulator 2', 'live_streams.sii'),
      path.join(process.env.USERPROFILE, 'OneDrive', 'Dokumente', 'American Truck Simulator', 'live_streams.sii'),
      path.join(process.env.USERPROFILE, 'OneDrive', 'Documents', 'Euro Truck Simulator 2', 'live_streams.sii'),
      path.join(process.env.USERPROFILE, 'OneDrive', 'Documents', 'American Truck Simulator', 'live_streams.sii'),
    ] : []),
  ];

  for (const siiPath of possiblePaths) {
    try {
      if (fs.existsSync(siiPath)) {
        const content = fs.readFileSync(siiPath, 'utf-8');
        if (content && content.includes('stream_data')) {
          console.log(`[LiveStreams] Auto-detected live_streams.sii at: ${siiPath}`);
          return { success: true, content, path: siiPath };
        }
      }
    } catch (err) {
      console.warn(`[LiveStreams] Could not read ${siiPath}:`, err);
    }
  }

  return { success: false, error: 'Keine live_streams.sii Datei im Dokumente-Ordner von ETS2 oder ATS gefunden.' };
});

function fetchIcyMetadata(streamUrl: string): Promise<{ title: string | null; stationName?: string }> {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(streamUrl);
      const reqLib = urlObj.protocol === 'https:' ? https : http;

      const req = reqLib.get(
        streamUrl,
        {
          headers: {
            'Icy-MetaData': '1',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) VLC/3.0.18',
          },
          timeout: 4000,
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            req.destroy();
            fetchIcyMetadata(res.headers.location).then(resolve);
            return;
          }

          const icyMetaInt = parseInt(res.headers['icy-metaint'] as string, 10);
          const icyName = (res.headers['icy-name'] as string) || undefined;

          if (!icyMetaInt || isNaN(icyMetaInt)) {
            req.destroy();
            resolve({ title: null, stationName: icyName });
            return;
          }

          let bytesRead = 0;
          let metaLength = 0;
          let metaBuffer = Buffer.alloc(0);
          let readingMeta = false;

          res.on('data', (chunk: Buffer) => {
            let offset = 0;

            while (offset < chunk.length) {
              if (!readingMeta) {
                const remainingAudio = icyMetaInt - bytesRead;
                const chunkAudio = Math.min(remainingAudio, chunk.length - offset);

                bytesRead += chunkAudio;
                offset += chunkAudio;

                if (bytesRead >= icyMetaInt) {
                  if (offset < chunk.length) {
                    metaLength = chunk[offset] * 16;
                    offset += 1;
                    bytesRead = 0;
                    if (metaLength > 0) {
                      readingMeta = true;
                      metaBuffer = Buffer.alloc(0);
                    }
                  }
                }
              } else {
                const remainingMeta = metaLength - metaBuffer.length;
                const chunkMeta = Math.min(remainingMeta, chunk.length - offset);

                metaBuffer = Buffer.concat([metaBuffer, chunk.slice(offset, offset + chunkMeta)]);
                offset += chunkMeta;

                if (metaBuffer.length >= metaLength) {
                  req.destroy();
                  const rawMeta = metaBuffer.toString('utf-8');
                  const match = rawMeta.match(/StreamTitle='([^']*)';/);
                  const title = match && match[1] ? match[1].trim() : null;
                  resolve({ title, stationName: icyName });
                  return;
                }
              }
            }
          });

          res.on('error', () => {
            req.destroy();
            resolve({ title: null, stationName: icyName });
          });
        }
      );

      req.on('error', () => {
        req.destroy();
        resolve({ title: null });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ title: null });
      });
    } catch (err) {
      resolve({ title: null });
    }
  });
}

const COVER_CACHE = new Map<string, string | null>();

async function fetchAlbumCover(term: string): Promise<string | null> {
  if (!term || term.trim().length < 3) return null;
  const cleanTerm = term.replace(/\(.*\)/g, '').replace(/\[.*\]/g, '').trim();
  if (COVER_CACHE.has(cleanTerm)) return COVER_CACHE.get(cleanTerm)!;

  return new Promise((resolve) => {
    try {
      const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanTerm)}&entity=song&limit=1`;
      https.get(searchUrl, { timeout: 3500 }, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (data && data.results && data.results.length > 0 && data.results[0].artworkUrl100) {
              const highRes = data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
              COVER_CACHE.set(cleanTerm, highRes);
              resolve(highRes);
              return;
            }
            COVER_CACHE.set(cleanTerm, null);
            resolve(null);
          } catch (e) {
      COVER_CACHE.set(cleanTerm, null);
            resolve(null);
          }
        });
      }).on('error', () => {
        COVER_CACHE.set(cleanTerm, null);
        resolve(null);
      });
    } catch (e) {
      resolve(null);
    }
  });
}

ipcMain.handle('get-route', async (_, sourceX: number, sourceZ: number, destX: number, destZ: number, heading?: number) => {
  if (!mapDataDir) {
    return { success: false as const, error: 'No map data directory configured' };
  }
  const result = getRoute(sourceX, sourceZ, destX, destZ, mapDataDir, heading);
  if (!result) {
    return { success: false as const, error: 'No route found' };
  }
  return {
    success: true as const,
    coordinates: result.coordinates,
    distanceMeters: result.distanceMeters,
    durationSeconds: result.durationSeconds,
    turnPoints: result.turnPoints,
    segmentLanes: result.segmentLanes,
  };
});

ipcMain.handle('verify-turn-nodes', async (_, turnPoints: any[]) => {
  if (!mapDataDir || !Array.isArray(turnPoints) || turnPoints.length === 0) {
    return turnPoints || [];
  }
  try {
    return verifyTurnPointsWithNodes(turnPoints, mapDataDir);
  } catch (e: any) {
    console.warn('[main] verify-turn-nodes error:', e.message);
    return turnPoints;
  }
});

// Anti AFK Bot
let afkIntervalId: NodeJS.Timeout | null = null;
let afkStartTimeout: NodeJS.Timeout | null = null;
let afkConfig: {
  interval: number;
  drivingTexts: string[];
  pausedTexts: string[];
  hotkey?: string;
} = {
  interval: 60000,
  drivingTexts: [],
  pausedTexts: [],
  hotkey: "F9"
};
let isAfkRunning = false;
let lastMovementTime = Date.now();

function playBotSound(type: 'start' | 'stop') {
  const fileName = type === 'start' ? 'start.mp3' : 'stop.mp3';
  win?.webContents.send('play-sound', fileName);
}

function runAfkTask() {
  if (telemetryData && telemetryData.paused) {
    console.log("🤖 AFK-Bot: Übersprungen, da das Spiel pausiert ist.");
    return;
  }

  const isDriving = telemetryData &&
    telemetryData.gameVersion > 0 &&
    Math.round(telemetryData.speed || 0) > 1;

  if (isDriving) {
    lastMovementTime = Date.now();
  }

  const stationaryTimeMs = Date.now() - lastMovementTime;
  const isStationaryOver2Min = stationaryTimeMs >= 120000;

  let pool = isStationaryOver2Min ? afkConfig.pausedTexts : afkConfig.drivingTexts;
  if (!pool || pool.length === 0) {
    pool = isStationaryOver2Min ? afkConfig.drivingTexts : afkConfig.pausedTexts;
  }
  if (!pool || pool.length === 0) return;

  const text = pool[Math.floor(Math.random() * pool.length)];

  if (isStationaryOver2Min) {
    console.log(`🤖 AFK-Bot: Sende Inaktivitäts-Nachricht... "${text}" (Stillstand: ${Math.round(stationaryTimeMs / 1000)}s)`);
  } else {
    console.log(`🤖 AFK-Bot: Sende Aktiv-Nachricht... "${text}" (Letzte Bewegung vor ${Math.round(stationaryTimeMs / 1000)}s)`);
  }

  // First attempt: Send via OPCGameBridge C++ Plugin Named Pipe
  sendToPluginPipe(text).then((sent) => {
    if (sent) {
      console.log('🤖 AFK-Bot: Nachricht erfolgreich via OPCGameBridge Named Pipe gesendet!');
      return;
    }

    // Fallback: PowerShell keyboard injection
    const escapedText = JSON.stringify(text);
    const psScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
  using System;
  using System.Runtime.InteropServices;
  public class WindowHelper {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);
    public static string GetActiveWindowTitle() {
        const int nChars = 256;
        IntPtr handle = GetForegroundWindow();
        System.Text.StringBuilder Buff = new System.Text.StringBuilder(nChars);
        if (GetWindowText(handle, Buff, nChars) > 0) return Buff.ToString();
        return "";
    }
  }
"@
$title = [WindowHelper]::GetActiveWindowTitle()
if ($title -match "Euro Truck Simulator 2" -or $title -match "TruckersMP") {
    $msg = ${escapedText}
    [System.Windows.Forms.Clipboard]::SetText($msg)
    
    # 0x59 = 'Y' Taste (Chat oeffnen)
    [WindowHelper]::keybd_event(0x59, 0, 0, 0)
    Start-Sleep -m 30
    [WindowHelper]::keybd_event(0x59, 0, 2, 0)
    
    Start-Sleep -m 400
    
    # Ctrl + V (Einfuegen)
    [WindowHelper]::keybd_event(0x11, 0, 0, 0) # Ctrl Down
    Start-Sleep -m 25
    [WindowHelper]::keybd_event(0x56, 0, 0, 0) # V Down
    Start-Sleep -m 25
    [WindowHelper]::keybd_event(0x56, 0, 2, 0) # V Up
    Start-Sleep -m 25
    [WindowHelper]::keybd_event(0x11, 0, 2, 0) # Ctrl Up
    
    Start-Sleep -m 150
    
    # 0x0D = Enter
    [WindowHelper]::keybd_event(0x0D, 0, 0, 0) # Enter Down
    Start-Sleep -m 30
    [WindowHelper]::keybd_event(0x0D, 0, 2, 0) # Enter Up
} else {
    Write-Host "FENSTER NICHT ERKANNT: $title"
}
`;

    const tempPath = path.join(app.getPath('temp'), 'afk_task.ps1');
    fs.writeFileSync(tempPath, '\uFEFF' + psScript, 'utf8');

    exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempPath}"`, (err, stdout) => {
      if (stdout) console.log('💻 PowerShell:', stdout.trim());
      if (err) console.error('❌ PowerShell Fehler:', err);
    });
  });
}

function toggleAfkBot() {
  isAfkRunning = !isAfkRunning;

  if (isAfkRunning) {
    lastMovementTime = Date.now();
    playBotSound('start');
    console.log("🤖 AFK-Bot gestartet. Erste Nachricht in 5s...");
    afkStartTimeout = setTimeout(() => {
      if (isAfkRunning) {
        runAfkTask();
        afkIntervalId = setInterval(runAfkTask, afkConfig.interval);
      }
    }, 5000);
  } else {
    playBotSound('stop');
    console.log("🤖 AFK-Bot gestoppt.");
    if (afkIntervalId) clearInterval(afkIntervalId);
    if (afkStartTimeout) clearTimeout(afkStartTimeout);
    afkIntervalId = null;
    afkStartTimeout = null;
  }

  win?.webContents.send('afk-status-changed', isAfkRunning);
}

let lastAfkHotkey: string | null = null;
ipcMain.on('afk-configure', (e, config) => {
  afkConfig = config;
  if (lastAfkHotkey) {
    try { globalShortcut.unregister(lastAfkHotkey); } catch (e) { }
  }
  if (config.hotkey) {
    try {
      globalShortcut.register(config.hotkey, toggleAfkBot);
      lastAfkHotkey = config.hotkey;
    } catch (e) { }
  }
});

ipcMain.on('afk-toggle', () => toggleAfkBot());
ipcMain.handle('afk-status', () => isAfkRunning);

ipcMain.handle('fetch-radio-metadata', async (_, streamUrl: string) => {
  if (!streamUrl) return { title: null, cover: null };
  const metadata = await fetchIcyMetadata(streamUrl);
  let cover: string | null = null;
  if (metadata.title) {
    cover = await fetchAlbumCover(metadata.title);
  }
  return { ...metadata, cover };
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// --- OPCGameBridge Plugin Management & R2 Download ---
const PLUGIN_UPDATE_URL = 'https://open-pipe-club-backend.nicohertling09.workers.dev/api/plugin/latest';
const PLUGIN_DLL_URL = 'https://open-pipe-club-backend.nicohertling09.workers.dev/api/plugin/download/OPCGameBridge.dll';
const PLUGIN_INI_URL = 'https://open-pipe-club-backend.nicohertling09.workers.dev/api/plugin/download/OPCGameBridge.ini';

async function fetchRemotePluginManifest(): Promise<any> {
  try {
    return await new Promise<any>((resolve) => {
      const url = `${PLUGIN_UPDATE_URL}?t=${Date.now()}`;
      const req = https.get(url, {
        headers: {
          'User-Agent': 'Open-Pipe-Club-App',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      }, (res) => {
        let body = '';
        if (res.statusCode !== 200) return resolve(null);
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(body)); } catch { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.setTimeout(4000, () => { req.destroy(); resolve(null); });
    });
  } catch {
    return null;
  }
}

function calculateFileSha256(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex').toLowerCase();
  } catch {
    return null;
  }
}

async function getPluginStatus() {
  const games = [
    { id: '227300', name: 'Euro Truck Simulator 2' },
    { id: '270880', name: 'American Truck Simulator' }
  ];

  const remoteManifest = await fetchRemotePluginManifest();
  const remoteHash = remoteManifest?.sha256 ? String(remoteManifest.sha256).toLowerCase() : null;
  const latestVersion = remoteManifest?.version || remoteManifest?.pluginVersion || '1.0.0';

  const results = [];

  for (const game of games) {
    try {
      let gamePath = '';
      try {
        const cmd = `powershell -Command "$v = Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Steam App ${game.id}' -ErrorAction SilentlyContinue; if ($v) { $v.InstallLocation }"`;
        gamePath = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      } catch (e) { }

      if (!gamePath || !fs.existsSync(gamePath)) {
        const commonPaths = [
          `C:\\Program Files (x86)\\Steam\\steamapps\\common\\${game.name}`,
          `D:\\SteamLibrary\\steamapps\\common\\${game.name}`,
          `E:\\SteamLibrary\\steamapps\\common\\${game.name}`,
          `F:\\SteamLibrary\\steamapps\\common\\${game.name}`,
        ];
        for (const p of commonPaths) {
          if (fs.existsSync(p)) {
            gamePath = p;
            break;
          }
        }
      }

      if (gamePath && fs.existsSync(gamePath)) {
        const pluginsPath = path.join(gamePath, 'bin', 'win_x64', 'plugins');
        const dllPath = path.join(pluginsPath, 'OPCGameBridge.dll');
        const legacyDllPath = path.join(pluginsPath, 'scs-telemetry.dll');

        const installed = fs.existsSync(dllPath);
        let updateAvailable = false;
        let localHash: string | null = null;

        if (installed) {
          localHash = calculateFileSha256(dllPath);
          if (remoteHash && localHash && remoteHash !== localHash) {
            updateAvailable = true;
          }
        } else if (fs.existsSync(legacyDllPath)) {
          updateAvailable = true;
        }

        results.push({
          gameId: game.id,
          gameName: game.name,
          installed,
          updateAvailable,
          latestVersion,
          gamePath,
          dllPath,
          localHash,
          remoteHash
        });
      }
    } catch (e) {
      console.error(`Failed to check plugin status for ${game.id}:`, e);
    }
  }

  return results;
}

ipcMain.handle('check-plugin-status', async () => {
  return await getPluginStatus();
});

ipcMain.on('install-plugin', async (event, gameId) => {
  const games = [
    { id: '227300', name: 'Euro Truck Simulator 2' },
    { id: '270880', name: 'American Truck Simulator' }
  ];
  const game = games.find(g => g.id === gameId);
  if (!game) {
    event.sender.send('install-plugin-progress', { progress: 0, status: 'Fehler: Spiel nicht gefunden', error: 'Game not found' });
    return;
  }

  event.sender.send('install-plugin-progress', { progress: 10, status: 'Suche Spiel-Verzeichnis...' });

  try {
    let gamePath = '';
    try {
      const cmd = `powershell -Command "$v = Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Steam App ${game.id}' -ErrorAction SilentlyContinue; if ($v) { $v.InstallLocation }"`;
      gamePath = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch (e) { }

    if (!gamePath || !fs.existsSync(gamePath)) {
      const commonPaths = [
        `C:\\Program Files (x86)\\Steam\\steamapps\\common\\${game.name}`,
        `D:\\SteamLibrary\\steamapps\\common\\${game.name}`,
        `E:\\SteamLibrary\\steamapps\\common\\${game.name}`,
        `F:\\SteamLibrary\\steamapps\\common\\${game.name}`,
      ];
      for (const p of commonPaths) {
        if (fs.existsSync(p)) {
          gamePath = p;
          break;
        }
      }
    }

    if (!gamePath || !fs.existsSync(gamePath)) {
      event.sender.send('install-plugin-progress', { progress: 0, status: 'Fehler: Spiel-Pfad nicht gefunden', error: 'Game path not found' });
      return;
    }

    const pluginsPath = path.join(gamePath, 'bin', 'win_x64', 'plugins');
    const dllPath = path.join(pluginsPath, 'OPCGameBridge.dll');
    const iniPath = path.join(pluginsPath, 'OPCGameBridge.ini');

    if (!fs.existsSync(pluginsPath)) {
      fs.mkdirSync(pluginsPath, { recursive: true });
    }

    const downloadFileNet = (url: string, dest: string, onProgress?: (p: number) => void): Promise<void> => {
      return new Promise((resolve, reject) => {
        const req = electronNet.request({ method: 'GET', url });
        req.setHeader('User-Agent', 'Open-Pipe-Club-App');
        req.setHeader('Cache-Control', 'no-cache');

        const tempFile = dest + '.tmp';
        if (fs.existsSync(tempFile)) {
          try { fs.unlinkSync(tempFile); } catch {}
        }
        const fileStream = fs.createWriteStream(tempFile);

        req.on('response', (res) => {
          if (res.statusCode !== 200) {
            fileStream.close();
            try { fs.unlinkSync(tempFile); } catch {}
            return reject(new Error(`Server Status ${res.statusCode}`));
          }
          const total = parseInt(res.headers['content-length'] as string || '0', 10);
          let loaded = 0;

          res.on('data', (chunk) => {
            loaded += chunk.length;
            fileStream.write(chunk);
            if (total > 0 && onProgress) {
              onProgress(Math.min(100, Math.round((loaded / total) * 100)));
            }
          });

          res.on('end', () => {
            fileStream.end();
          });

          res.on('error', (err) => {
            fileStream.close();
            try { fs.unlinkSync(tempFile); } catch {}
            reject(err);
          });
        });

        fileStream.on('finish', () => {
          fileStream.close();
          try {
            if (fs.existsSync(dest)) {
              fs.unlinkSync(dest);
            }
            fs.renameSync(tempFile, dest);
            resolve();
          } catch (copyErr: any) {
            try { fs.unlinkSync(tempFile); } catch {}
            if (copyErr.code === 'EBUSY' || copyErr.code === 'EPERM') {
              reject(new Error('Spiel läuft noch! Bitte schließe ETS2 / ATS vor der Installation.'));
            } else {
              reject(copyErr);
            }
          }
        });

        fileStream.on('error', (err) => {
          try { fs.unlinkSync(tempFile); } catch {}
          reject(err);
        });

        req.on('error', (err) => {
          fileStream.close();
          try { fs.unlinkSync(tempFile); } catch {}
          reject(err);
        });

        req.end();
      });
    };

    event.sender.send('install-plugin-progress', { progress: 30, status: 'Downloade OPCGameBridge.dll...' });
    await downloadFileNet(PLUGIN_DLL_URL, dllPath, (pct) => {
      const overall = Math.floor(30 + (pct * 0.4));
      event.sender.send('install-plugin-progress', { progress: overall, status: `Downloade Plugin (${pct}%)...` });
    });

    if (!fs.existsSync(iniPath)) {
      event.sender.send('install-plugin-progress', { progress: 80, status: 'Erstelle Konfiguration...' });
      try {
        await downloadFileNet(PLUGIN_INI_URL, iniPath);
      } catch {
      }
    }

    const legacyDll = path.join(pluginsPath, 'scs-telemetry.dll');
    if (fs.existsSync(legacyDll)) {
      try { fs.unlinkSync(legacyDll); } catch {}
    }

    event.sender.send('install-plugin-progress', { progress: 100, status: 'OPCGameBridge erfolgreich installiert!', success: true });
  } catch (e: any) {
    console.error(`Failed to install plugin for ${gameId}:`, e);
    event.sender.send('install-plugin-progress', { progress: 0, status: `Fehler: ${e.message}`, error: e.message });
  }
});

ipcMain.handle('check-app-update', async () => {
  const currentVersion = app.getVersion();

  const compareVersions = (v1: string, v2: string) => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 < p2) return -1;
      if (p1 > p2) return 1;
    }
    return 0;
  };

  // Check Cloudflare R2 Update Endpoint (No GitHub fallback)
  try {
    const r2Res = await new Promise<any>((resolve) => {
      const updateUrl = `https://open-pipe-club-backend.nicohertling09.workers.dev/api/updates/latest?t=${Date.now()}`;
      const req = https.get(updateUrl, {
        headers: {
          'User-Agent': 'Open-Pipe-Club-App',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      }, (res) => {
        let body = '';
        if (res.statusCode !== 200) return resolve(null);
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(body)); } catch { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.setTimeout(4000, () => { req.destroy(); resolve(null); });
    });

    if (r2Res && (r2Res.latestVersion || r2Res.version)) {
      const latestVersion = (r2Res.latestVersion || r2Res.version || '').replace(/^v/, '');
      const releaseNotes = r2Res.releaseNotes || '';
      let downloadUrl = r2Res.downloadUrl || 'https://open-pipe-club-backend.nicohertling09.workers.dev/api/updates/download/setup.exe';
      if (downloadUrl.includes('openpipeclub.com/download')) {
        downloadUrl = 'https://open-pipe-club-backend.nicohertling09.workers.dev/api/updates/download/setup.exe';
      }

      if (latestVersion && compareVersions(currentVersion, latestVersion) < 0) {
        return {
          updateAvailable: true,
          currentVersion,
          latestVersion,
          releaseNotes,
          downloadUrl
        };
      } else {
        return { updateAvailable: false, currentVersion, latestVersion };
      }
    }
    return { updateAvailable: false, currentVersion };
  } catch (err) {
    console.warn('Cloudflare R2 Update check failed:', err);
    return { updateAvailable: false, currentVersion, error: String(err) };
  }
});

function downloadAndApplyUpdate(url: string, event: any) {
  const tempUpdatePath = path.join(app.getPath('temp'), 'Open Pipe Club-Tracker-Update.exe');

  if (fs.existsSync(tempUpdatePath)) {
    try {
      fs.unlinkSync(tempUpdatePath);
    } catch (e) { }
  }

  const file = fs.createWriteStream(tempUpdatePath, { highWaterMark: 1024 * 1024 });

  const request = electronNet.request({
    method: 'GET',
    url: url,
  });

  request.setHeader('User-Agent', 'Open-Pipe-Club-App');
  request.setHeader('Accept', 'application/octet-stream');

  request.on('response', (response) => {
    if (response.statusCode !== 200) {
      event.sender.send('install-update-progress', { progress: 0, status: `Download Fehler: HTTP ${response.statusCode}`, error: true });
      file.close();
      try { fs.unlinkSync(tempUpdatePath); } catch (e) { }
      return;
    }

    const totalBytes = parseInt(response.headers['content-length'] as string || '0', 10);
    let downloadedBytes = 0;
    let lastUpdate = 0;

    response.on('data', (chunk) => {
      downloadedBytes += chunk.length;
      file.write(chunk);

      if (totalBytes > 0) {
        const now = Date.now();
        if (now - lastUpdate > 100 || downloadedBytes === totalBytes) {
          lastUpdate = now;
          const percent = Math.floor((downloadedBytes / totalBytes) * 70) + 20; // 20% to 90%
          event.sender.send('install-update-progress', { progress: percent, status: 'Downloade Update...' });
        }
      }
    });

    response.on('end', () => {
      file.end();
    });

    response.on('error', (err) => {
      event.sender.send('install-update-progress', { progress: 0, status: `Download Fehler: ${err.message}`, error: true });
      file.close();
      try { fs.unlinkSync(tempUpdatePath); } catch (e) { }
    });
  });

  request.on('error', (err) => {
    event.sender.send('install-update-progress', { progress: 0, status: `Netzwerkfehler: ${err.message}`, error: true });
    file.close();
    try { fs.unlinkSync(tempUpdatePath); } catch (e) { }
  });

  file.on('finish', () => {
    file.close();

    event.sender.send('install-update-progress', { progress: 95, status: 'Bereite Anwendung vor...' });

    if (!app.isPackaged) {
      setTimeout(() => {
        event.sender.send('install-update-progress', { progress: 100, status: 'Erfolgreich! (Dev-Mode Simulation)', success: true });
      }, 1500);
      return;
    }

    try {
      const isPortable = Boolean(process.env.PORTABLE_EXECUTABLE_FILE);
      const targetExe = process.env.PORTABLE_EXECUTABLE_FILE || app.getPath('exe');
      const exeName = path.basename(targetExe);
      const updateBatPath = path.join(app.getPath('temp'), 'openpipeclub_update.bat');

      let batContent = '';
      if (isPortable) {
        batContent = `@echo off
timeout /t 2 /nobreak > NUL
taskkill /f /im "${exeName}" > NUL 2>&1
:loop
copy /Y "${tempUpdatePath}" "${targetExe}" > NUL
if %errorlevel% neq 0 (
  timeout /t 1 /nobreak > NUL
  goto loop
)
start "" "${targetExe}"
del "%~f0"
`;
      } else {
        batContent = `@echo off
timeout /t 2 /nobreak > NUL
taskkill /f /im "${exeName}" > NUL 2>&1
timeout /t 1 /nobreak > NUL
start "" "${tempUpdatePath}"
del "%~f0"
`;
      }

      fs.writeFileSync(updateBatPath, batContent, 'utf8');

      const child = spawn('cmd.exe', ['/c', updateBatPath], {
        detached: true,
        windowsHide: true,
        stdio: 'ignore'
      });
      child.unref();

      event.sender.send('install-update-progress', { progress: 100, status: 'Update wird installiert. Starte neu...', success: true });

      setTimeout(() => {
        app.quit();
      }, 1000);
    } catch (err: any) {
      console.error('Failed to run update script:', err);
      event.sender.send('install-update-progress', { progress: 0, status: `Fehler beim Neustart: ${err.message}`, error: true });
    }
  });

  request.end();
}

ipcMain.on('install-app-update', async (event) => {
  const apiUrl = 'https://open-pipe-club-backend.nicohertling09.workers.dev/api/updates/latest';
  const options = {
    headers: {
      'User-Agent': 'Open-Pipe-Club-App'
    }
  };

  event.sender.send('install-update-progress', { progress: 10, status: 'Suche neueste Version auf Cloudflare R2...' });

  https.get(apiUrl, options, (res) => {
    let data = '';
    if (res.statusCode !== 200) {
      event.sender.send('install-update-progress', { progress: 0, status: `HTTP Fehler beim R2-Abruf: ${res.statusCode}`, error: true });
      return;
    }

    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const manifest = JSON.parse(data);
        const isPortable = Boolean(process.env.PORTABLE_EXECUTABLE_FILE);
        let downloadUrl = isPortable ? manifest.portableUrl : manifest.downloadUrl;

        if (!downloadUrl || downloadUrl.includes('openpipeclub.com/download')) {
          downloadUrl = isPortable
            ? 'https://open-pipe-club-backend.nicohertling09.workers.dev/api/updates/download/portable.exe'
            : 'https://open-pipe-club-backend.nicohertling09.workers.dev/api/updates/download/setup.exe';
        }

        event.sender.send('install-update-progress', { progress: 20, status: 'Starte Download von Cloudflare R2...' });
        downloadAndApplyUpdate(downloadUrl, event);

      } catch (e: any) {
        event.sender.send('install-update-progress', { progress: 0, status: `Fehler: ${e.message}`, error: true });
      }
    });
  }).on('error', (e) => {
    event.sender.send('install-update-progress', { progress: 0, status: `Netzwerkfehler: ${e.message}`, error: true });
  });
});

app.whenReady().then(async () => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.openpipeclub.app.main');
  }

  await loadSettings(true);
  watchSettingsFile();

  const mapDataValidation = validateMapDataDir(mapDataDir);
  if (!mapDataValidation.valid) {
    writeToLog(`Map data directory validation failed: ${mapDataValidation.error || 'Missing files: ' + mapDataValidation.missingFiles.join(', ')}`);
  }

  if (isCarPlayMode) {
    if (process.platform === 'win32') {
      app.setAppUserModelId('com.openpipeclub.app.carplay');
    }
    createCarPlayWindow();
    registerCarPlayHotkeys();
    return;
  }

  createSplashScreen();
  createWindow();
  if (isOverlayActive) {
    syncOverlayWindows();
  }
  if (overlaySettings && overlaySettings.showCarPlay) {
    spawnCarPlayProcess();
  }
  if (!isCarPlayMode) {
    registerCarPlayHotkeys();
    startCarPlayHttpServer(8383);
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// TruckersMP Custom UI & Backgrounds Management
// ─────────────────────────────────────────────────────────────────────────────

function getTmpTemplateDir(): string {
  const candidates = [
    path.join(process.cwd(), 'TMP UI - Open Pipe Club'),
    path.join(process.cwd(), '..', 'TMP UI - Open Pipe Club'),
    path.join(app.getPath('documents'), 'Open Pipe Club', 'TMP UI - Open Pipe Club'),
    path.join(__dirname, '..', '..', 'TMP UI - Open Pipe Club'),
    path.join(__dirname, '..', 'TMP UI - Open Pipe Club'),
    path.join(process.resourcesPath || '', 'TMP UI - Open Pipe Club')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

function getTruckersMpDataDir(): string | null {
  const candidates = [
    path.join(process.env.APPDATA || '', 'TruckersMP', 'installation', 'data'),
    path.join(process.env.LOCALAPPDATA || '', 'TruckersMP', 'installation', 'data'),
    'C:\\ProgramData\\TruckersMP\\data',
    path.join(process.env.APPDATA || '', 'TruckersMP', 'data'),
    path.join(process.env.LOCALAPPDATA || '', 'TruckersMP', 'data'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function copyDirRecursive(src: string, dest: string) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const tmpThumbCache = new Map<string, string>();
const TMP_THUMB_DIR = path.join(app.getPath('userData'), 'tmp_thumb_cache');
try { fs.mkdirSync(TMP_THUMB_DIR, { recursive: true }); } catch (e) { }

function getFastThumbnail(filePath: string, width = 320): string {
  try {
    if (!filePath || !fs.existsSync(filePath)) return '';
    const stat = fs.statSync(filePath);
    const key = `${filePath}_${stat.mtimeMs}_${width}`;
    if (tmpThumbCache.has(key)) {
      return tmpThumbCache.get(key)!;
    }

    const hash = crypto.createHash('md5').update(key).digest('hex');
    const diskPath = path.join(TMP_THUMB_DIR, `${hash}.jpg`);

    if (fs.existsSync(diskPath)) {
      const buf = fs.readFileSync(diskPath);
      const dataUrl = `data:image/jpeg;base64,${buf.toString('base64')}`;
      tmpThumbCache.set(key, dataUrl);
      return dataUrl;
    }

    const img = nativeImage.createFromPath(filePath);
    if (img.isEmpty()) return '';
    const resized = img.resize({ width, quality: 'good' });
    const jpegBuf = resized.toJPEG(75);
    try { fs.writeFileSync(diskPath, jpegBuf); } catch (e) { }
    const dataUrl = `data:image/jpeg;base64,${jpegBuf.toString('base64')}`;
    tmpThumbCache.set(key, dataUrl);
    return dataUrl;
  } catch (err) {
    return '';
  }
}

let cachedBaseSkinDataUrl = '';
let cachedCompanyBannerThumb = '';

function bufferFromDataUrl(dataUrl: string): Buffer {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64, 'base64');
}

function getClubFontPath(fontName: string): string | null {
  const candidates = [
    path.join(__dirname, '..', 'public', 'fonts', fontName),
    path.join(process.cwd(), 'public', 'fonts', fontName),
    path.join(process.cwd(), 'opc-app', 'public', 'fonts', fontName),
    path.join(process.resourcesPath, 'fonts', fontName),
    path.join(app.getAppPath(), 'public', 'fonts', fontName),
    path.join(getTmpTemplateDir(), 'shared_mod', 'fonts_opc', fontName),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function getCompanyBannerFiles(): { large: string; small: string } | null {
  const candidates = [
    path.join(__dirname, '..', 'public', 'images', 'truckers_white_final.png'),
    path.join(process.cwd(), 'public', 'images', 'truckers_white_final.png'),
    path.join(process.cwd(), 'opc-app', 'public', 'images', 'truckers_white_final.png'),
    path.join(app.getAppPath(), 'public', 'images', 'truckers_white_final.png'),
    path.join(getTmpTemplateDir(), 'shared_mod', 'ui_opc', 'truckers_white_final.png')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      const dir = path.dirname(c);
      return {
        large: c,
        small: path.join(dir, 'truckers_white_final_small.png')
      };
    }
  }
  return null;
}

ipcMain.handle('tmp-get-info', async () => {
  try {
    const dataDir = getTruckersMpDataDir();
    const templateDir = getTmpTemplateDir();

    // Template backgrounds: Folder is strictly a structural reference/idea, NOT an asset source
    const templateUiDir = path.join(templateDir, 'ets2_mod', 'ui');
    const templateBackgrounds: { name: string; slot: number; thumb: string; path: string; size: number }[] = [];

    // Installed backgrounds in TruckersMP
    const installedBackgrounds: { name: string; slot: number; thumb: string; path: string; size: number }[] = [];
    let isModInstalled = false;
    let installedSkinThumb: string | null = null;
    let isCompanyBannerInstalled = false;
    let isServerBannersInstalled = false;
    let isCustomFontInstalled = false;

    if (dataDir) {
      const installedUiDir = path.join(dataDir, 'ets2_mod', 'ui');
      if (fs.existsSync(installedUiDir)) {
        isModInstalled = true;
        const files = fs.readdirSync(installedUiDir);
        const bgFiles = files
          .filter(f => /^background\d+\.png$/i.test(f))
          .sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, ''), 10);
            const numB = parseInt(b.replace(/\D/g, ''), 10);
            return numA - numB;
          });

        for (const f of bgFiles) {
          const fullPath = path.join(installedUiDir, f);
          const slotNum = parseInt(f.replace(/\D/g, ''), 10);
          try {
            const thumb = getFastThumbnail(fullPath, 320);
            const stat = fs.statSync(fullPath);
            installedBackgrounds.push({
              name: f,
              slot: slotNum,
              thumb,
              path: fullPath,
              size: stat.size
            });
          } catch (e) { }
        }

        const skinPath = path.join(installedUiDir, 'ui_skin.png');
        if (fs.existsSync(skinPath)) {
          installedSkinThumb = getFastThumbnail(skinPath, 320);
        }
      }

      isCompanyBannerInstalled = fs.existsSync(path.join(dataDir, 'shared_mod', 'ui', 'truckers_white_final.png'));
      isServerBannersInstalled = fs.existsSync(path.join(dataDir, 'shared_mod', 'ui', 'server_item_0.png'));
      const installedOpenSans = path.join(dataDir, 'shared_mod', 'fonts', 'OpenSans.ttf');
      if (fs.existsSync(installedOpenSans)) {
        try {
          isCustomFontInstalled = fs.statSync(installedOpenSans).size !== 104120;
        } catch (e) { }
      }
    }

    if (!cachedBaseSkinDataUrl) {
      const baseSkinPath = path.join(templateUiDir, 'ui_skin.png');
      if (fs.existsSync(baseSkinPath)) {
        try {
          cachedBaseSkinDataUrl = nativeImage.createFromPath(baseSkinPath).toDataURL();
        } catch (e) { }
      }
    }
    const baseSkinDataUrl = cachedBaseSkinDataUrl;

    // Company Banner (truckers_white_final.png)
    if (!cachedCompanyBannerThumb) {
      const bannerFiles = getCompanyBannerFiles();
      if (bannerFiles && fs.existsSync(bannerFiles.large)) {
        try {
          cachedCompanyBannerThumb = getFastThumbnail(bannerFiles.large, 640);
        } catch (e) { }
      }
    }
    const companyBannerThumb = cachedCompanyBannerThumb;

    // Server Banners (Server 0..4, normal & selected)
    const serverNames = [
      'Server 1 • Simulation 1 [EU]',
      'Server 2 • Simulation 2',
      'Server 3 • Arcade [EU]',
      'Server 4 • ProMods [EU]',
      'Server 5 • Event / Special'
    ];

    const serverBanners: {
      index: number;
      name: string;
      normalThumb: string;
      normalPath: string;
      selectedThumb: string;
      selectedPath: string;
    }[] = [];

    const installedSharedUi = dataDir ? path.join(dataDir, 'shared_mod', 'ui') : null;

    for (let i = 0; i < 5; i++) {
      let normalThumb = '';
      let normalPath = '';
      let selectedThumb = '';
      let selectedPath = '';

      // Only display server banner if actually installed in TruckersMP data directory, NEVER from template folder
      const instNormal = installedSharedUi ? path.join(installedSharedUi, `server_item_${i}.png`) : '';
      if (instNormal && fs.existsSync(instNormal)) {
        normalThumb = getFastThumbnail(instNormal, 480);
        normalPath = instNormal;
      }

      const instSel = installedSharedUi ? path.join(installedSharedUi, `server_item_${i}_sel.png`) : '';
      if (instSel && fs.existsSync(instSel)) {
        selectedThumb = getFastThumbnail(instSel, 480);
        selectedPath = instSel;
      }

      serverBanners.push({
        index: i,
        name: serverNames[i],
        normalThumb,
        normalPath,
        selectedThumb,
        selectedPath
      });
    }

    return {
      success: true,
      dataDir,
      templateDir,
      isModInstalled,
      installedBackgrounds,
      templateBackgrounds,
      installedSkinThumb,
      baseSkinDataUrl,
      companyBannerThumb,
      isCompanyBannerInstalled,
      serverBanners,
      isServerBannersInstalled,
      isCustomFontInstalled
    };
  } catch (err: any) {
    console.error('Error in tmp-get-info:', err);
    return {
      success: false,
      error: err.message
    };
  }
});

ipcMain.handle('tmp-pick-image', async (_, multi = false) => {
  try {
    const result = await dialog.showOpenDialog({
      title: multi ? 'Hintergrundbilder auswählen' : 'Hintergrundbild auswählen',
      filters: [
        { name: 'Bilder (PNG, JPG, WEBP)', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }
      ],
      properties: multi ? ['openFile', 'multiSelections'] : ['openFile']
    });

    if (result.canceled || !result.filePaths.length) {
      return null;
    }

    const items: { path: string; name: string; thumb: string; size: number }[] = [];
    for (const fp of result.filePaths) {
      try {
        const thumb = getFastThumbnail(fp, 320);
        const stat = fs.statSync(fp);
        items.push({
          path: fp,
          name: path.basename(fp),
          thumb,
          size: stat.size
        });
      } catch (e) { }
    }

    return multi ? items : (items[0] || null);
  } catch (err: any) {
    console.error('Error in tmp-pick-image:', err);
    return null;
  }
});

ipcMain.handle('tmp-get-preview', async (_, filePath: string) => {
  if (!filePath || !fs.existsSync(filePath)) return '';
  return getFastThumbnail(filePath, 1280);
});

ipcMain.handle('tmp-get-image-data', async (_, filePath: string) => {
  if (!filePath || !fs.existsSync(filePath)) return '';
  try {
    const ext = path.extname(filePath).toLowerCase().replace('.', '') || 'png';
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : (ext === 'webp' ? 'image/webp' : 'image/png');
    const buf = fs.readFileSync(filePath);
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch (e) {
    return '';
  }
});

ipcMain.handle('tmp-select-directory', async () => {
  try {
    const res = await dialog.showOpenDialog({
      title: 'TruckersMP "data"-Verzeichnis auswählen',
      properties: ['openDirectory']
    });
    if (res.canceled || !res.filePaths.length) return null;
    return res.filePaths[0];
  } catch (e) {
    return null;
  }
});

ipcMain.handle('tmp-apply-skin', async (_, payload: {
  targetPath?: string;
  skinDataUrl?: string;
  useCompanyBanner?: boolean;
  useServerBanners?: boolean;
  serverBanners?: {
    index: number;
    normalPath?: string;
    normalDataUrl?: string;
    selectedPath?: string;
    selectedDataUrl?: string;
  }[];
  useAppFonts?: boolean;
  backgrounds: { slot?: number; dataUrl?: string; filePath?: string; templateSlot?: number }[];
}) => {
  try {
    const targetDir = payload.targetPath || getTruckersMpDataDir();
    if (!targetDir) {
      return { success: false, error: 'Kein TruckersMP Daten-Verzeichnis gefunden!' };
    }

    const templateDir = getTmpTemplateDir();
    const templateEts2Ui = path.join(templateDir, 'ets2_mod', 'ui');
    const ets2ModUi = path.join(targetDir, 'ets2_mod', 'ui');
    const sharedModUi = path.join(targetDir, 'shared_mod', 'ui');
    const sharedModFonts = path.join(targetDir, 'shared_mod', 'fonts');

    fs.mkdirSync(ets2ModUi, { recursive: true });
    fs.mkdirSync(sharedModUi, { recursive: true });

    // 1. Write ui_skin.png (Direct Buffer write, instant!)
    if (payload.skinDataUrl) {
      fs.writeFileSync(path.join(ets2ModUi, 'ui_skin.png'), bufferFromDataUrl(payload.skinDataUrl));
    } else {
      const baseSkin = path.join(templateEts2Ui, 'ui_skin.png');
      if (fs.existsSync(baseSkin)) {
        fs.copyFileSync(baseSkin, path.join(ets2ModUi, 'ui_skin.png'));
      }
    }

    // 2. Copy companion files from template
    if (fs.existsSync(templateEts2Ui)) {
      const companionFiles = ['authors.png', 'cursor.png', 'refresh.png', 'settings.png'];
      for (const f of companionFiles) {
        const src = path.join(templateEts2Ui, f);
        const dst = path.join(ets2ModUi, f);
        if (fs.existsSync(src)) {
          try { fs.copyFileSync(src, dst); } catch (e) { }
        }
      }
    }

    // 3. Clear existing background*.png in ets2ModUi to avoid orphaned files
    if (fs.existsSync(ets2ModUi)) {
      const currentFiles = fs.readdirSync(ets2ModUi);
      for (const f of currentFiles) {
        if (/^background\d+\.png$/i.test(f)) {
          try { fs.unlinkSync(path.join(ets2ModUi, f)); } catch (e) { }
        }
      }
    }

    // 4. Save backgrounds sequentially (fast copy or direct buffer write!)
    for (let i = 0; i < payload.backgrounds.length; i++) {
      const bg = payload.backgrounds[i];
      const outName = `background${i}.png`;
      const outPath = path.join(ets2ModUi, outName);

      if (bg.dataUrl && bg.dataUrl.startsWith('data:image')) {
        fs.writeFileSync(outPath, bufferFromDataUrl(bg.dataUrl));
      } else if (bg.filePath && fs.existsSync(bg.filePath) && !bg.filePath.includes('TMP UI - Open Pipe Club')) {
        if (bg.filePath.toLowerCase().endsWith('.png')) {
          fs.copyFileSync(bg.filePath, outPath);
        } else {
          const img = nativeImage.createFromPath(bg.filePath);
          fs.writeFileSync(outPath, img.toPNG());
        }
      }
    }

    // 5. Copy shared_mod general UI files (excluding server items and company banner)
    const templateShared = path.join(templateDir, 'shared_mod');
    if (fs.existsSync(templateShared)) {
      const tUi = path.join(templateShared, 'ui');
      if (fs.existsSync(tUi)) {
        const sFiles = fs.readdirSync(tUi);
        for (const f of sFiles) {
          if (/^server_item.*\.png$/i.test(f) || /^truckers_white_final.*\.png$/i.test(f)) {
            continue; // Handled separately below
          }
          const src = path.join(tUi, f);
          const dst = path.join(sharedModUi, f);
          if (fs.statSync(src).isFile()) {
            try { fs.copyFileSync(src, dst); } catch (e) { }
          }
        }
      }
    }

    // 5a. Firmenbanner (truckers_white_final.png & small)
    const bannerFiles = getCompanyBannerFiles();
    if (payload.useCompanyBanner !== false && bannerFiles && fs.existsSync(bannerFiles.large)) {
      try {
        fs.copyFileSync(bannerFiles.large, path.join(sharedModUi, 'truckers_white_final.png'));
        fs.copyFileSync(bannerFiles.large, path.join(ets2ModUi, 'truckers_white_final.png'));
        if (fs.existsSync(bannerFiles.small)) {
          fs.copyFileSync(bannerFiles.small, path.join(sharedModUi, 'truckers_white_final_small.png'));
          fs.copyFileSync(bannerFiles.small, path.join(ets2ModUi, 'truckers_white_final_small.png'));
        }
      } catch (e) {
        console.error('Error copying company banner:', e);
      }
    } else if (payload.useCompanyBanner === false) {
      ['truckers_white_final.png', 'truckers_white_final_small.png'].forEach(f => {
        const p1 = path.join(sharedModUi, f);
        const p2 = path.join(ets2ModUi, f);
        if (fs.existsSync(p1)) try { fs.unlinkSync(p1); } catch (e) { }
        if (fs.existsSync(p2)) try { fs.unlinkSync(p2); } catch (e) { }
      });
    }

    // 5b. Serverlisten-Banner (server_item_{0..4}.png & server_item_{0..4}_sel.png)
    if (payload.useServerBanners !== false) {
      const customItems = payload.serverBanners || [];

      for (let i = 0; i < 5; i++) {
        const item = customItems.find(x => x.index === i);

        // Normal (unselected)
        const targetNormal = path.join(sharedModUi, `server_item_${i}.png`);
        if (item?.normalDataUrl && item.normalDataUrl.startsWith('data:image')) {
          fs.writeFileSync(targetNormal, bufferFromDataUrl(item.normalDataUrl));
        } else if (item?.normalPath && fs.existsSync(item.normalPath) && !item.normalPath.includes('TMP UI - Open Pipe Club')) {
          if (item.normalPath.toLowerCase().endsWith('.png')) {
            fs.copyFileSync(item.normalPath, targetNormal);
          } else {
            fs.writeFileSync(targetNormal, nativeImage.createFromPath(item.normalPath).toPNG());
          }
        } else {
          // If no custom banner is set by user, remove modified file so TruckersMP defaults to vanilla
          if (fs.existsSync(targetNormal)) {
            try { fs.unlinkSync(targetNormal); } catch (e) { }
          }
        }

        // Selected
        const targetSel = path.join(sharedModUi, `server_item_${i}_sel.png`);
        if (item?.selectedDataUrl && item.selectedDataUrl.startsWith('data:image')) {
          fs.writeFileSync(targetSel, bufferFromDataUrl(item.selectedDataUrl));
        } else if (item?.selectedPath && fs.existsSync(item.selectedPath) && !item.selectedPath.includes('TMP UI - Open Pipe Club')) {
          if (item.selectedPath.toLowerCase().endsWith('.png')) {
            fs.copyFileSync(item.selectedPath, targetSel);
          } else {
            fs.writeFileSync(targetSel, nativeImage.createFromPath(item.selectedPath).toPNG());
          }
        } else {
          // If no custom banner is set by user, remove modified file so TruckersMP defaults to vanilla
          if (fs.existsSync(targetSel)) {
            try { fs.unlinkSync(targetSel); } catch (e) { }
          }
        }
      }
    } else {
      // Remove all server_item_*.png so vanilla banners appear
      for (let i = 0; i < 5; i++) {
        const p1 = path.join(sharedModUi, `server_item_${i}.png`);
        const p2 = path.join(sharedModUi, `server_item_${i}_sel.png`);
        if (fs.existsSync(p1)) try { fs.unlinkSync(p1); } catch (e) { }
        if (fs.existsSync(p2)) try { fs.unlinkSync(p2); } catch (e) { }
      }
    }

    // 6. Setup Ingame Fonts (Unbounded wie für Überschriften in der App)
    if (payload.useAppFonts !== false) {
      const unboundedPath = getClubFontPath('Unbounded.ttf');
      const templateFonts = path.join(templateDir, 'shared_mod', 'fonts');

      if (unboundedPath) {
        fs.mkdirSync(sharedModFonts, { recursive: true });

        // Unbounded: Die markante Schriftart wie für Überschriften in der App
        const fontTargets = [
          'OpenSans.ttf',
          'OpenSans-Semibold.ttf',
          'NotoSans-Regular.ttf',
          'NotoSans-Bold.ttf',
          'NotoSans-Italic.ttf',
          'NotoSans-BoldItalic.ttf',
          'NotoSansMono-Regular.ttf'
        ];
        for (const target of fontTargets) {
          try { fs.copyFileSync(unboundedPath, path.join(sharedModFonts, target)); } catch (e) { }
        }

        // Keep RobotoMono and fallbacks if present
        if (fs.existsSync(templateFonts)) {
          const roboto = path.join(templateFonts, 'RobotoMono.ttf');
          if (fs.existsSync(roboto)) {
            try { fs.copyFileSync(roboto, path.join(sharedModFonts, 'RobotoMono.ttf')); } catch (e) { }
          }
          const tFallback = path.join(templateFonts, 'fallback');
          const sFallback = path.join(sharedModFonts, 'fallback');
          if (fs.existsSync(tFallback)) {
            try { copyDirRecursive(tFallback, sFallback); } catch (e) { }
          }
        }
      }
    } else {
      // Standard TruckersMP Fonts: remove custom fonts so TruckersMP defaults are used
      if (fs.existsSync(sharedModFonts)) {
        try { fs.rmSync(sharedModFonts, { recursive: true, force: true }); } catch (e) { }
      }
    }

    return {
      success: true,
      path: ets2ModUi,
      backgroundCount: payload.backgrounds.length,
      useCompanyBanner: payload.useCompanyBanner !== false,
      useAppFonts: payload.useAppFonts !== false
    };
  } catch (err: any) {
    console.error('Error in tmp-apply-skin:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('tmp-open-folder', async (_, folderPath?: string) => {
  const p = folderPath || getTruckersMpDataDir();
  if (p && fs.existsSync(p)) {
    shell.openPath(p);
    return true;
  }
  return false;
});

ipcMain.handle('tmp-restore-vanilla', async () => {
  const dataDir = getTruckersMpDataDir();
  if (!dataDir) return { success: false, error: 'Kein TruckersMP Verzeichnis gefunden' };
  const ets2Mod = path.join(dataDir, 'ets2_mod');
  const sharedMod = path.join(dataDir, 'shared_mod');
  try {
    if (fs.existsSync(ets2Mod)) {
      fs.rmSync(ets2Mod, { recursive: true, force: true });
    }
    if (fs.existsSync(sharedMod)) {
      fs.rmSync(sharedMod, { recursive: true, force: true });
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('tmp-export-mod', async (_, payload: {
  skinDataUrl?: string;
  backgrounds: { slot?: number; dataUrl?: string; filePath?: string; templateSlot?: number }[];
}) => {
  try {
    const res = await dialog.showOpenDialog({
      title: 'Zielordner für TruckersMP Mod-Export wählen',
      properties: ['openDirectory', 'createDirectory']
    });
    if (res.canceled || !res.filePaths.length) return { success: false, canceled: true };

    const exportRoot = path.join(res.filePaths[0], 'TruckersMP_Custom_UI');
    const ets2ModUi = path.join(exportRoot, 'ets2_mod', 'ui');
    const sharedModUi = path.join(exportRoot, 'shared_mod', 'ui');
    const sharedModFonts = path.join(exportRoot, 'shared_mod', 'fonts');

    fs.mkdirSync(ets2ModUi, { recursive: true });
    fs.mkdirSync(sharedModUi, { recursive: true });

    const templateDir = getTmpTemplateDir();
    const templateEts2Ui = path.join(templateDir, 'ets2_mod', 'ui');

    if (payload.skinDataUrl) {
      const skinBuffer = nativeImage.createFromDataURL(payload.skinDataUrl).toPNG();
      fs.writeFileSync(path.join(ets2ModUi, 'ui_skin.png'), skinBuffer);
    }

    if (fs.existsSync(templateEts2Ui)) {
      for (const f of ['authors.png', 'cursor.png', 'refresh.png', 'settings.png']) {
        const src = path.join(templateEts2Ui, f);
        if (fs.existsSync(src)) fs.copyFileSync(src, path.join(ets2ModUi, f));
      }
    }

    for (let i = 0; i < payload.backgrounds.length; i++) {
      const bg = payload.backgrounds[i];
      const outPath = path.join(ets2ModUi, `background${i}.png`);
      if (bg.dataUrl && bg.dataUrl.startsWith('data:image')) {
        fs.writeFileSync(outPath, nativeImage.createFromDataURL(bg.dataUrl).toPNG());
      } else if (bg.filePath && fs.existsSync(bg.filePath)) {
        fs.writeFileSync(outPath, nativeImage.createFromPath(bg.filePath).toPNG());
      } else if (bg.templateSlot !== undefined) {
        const tBg = path.join(templateEts2Ui, `background${bg.templateSlot}.png`);
        if (fs.existsSync(tBg)) fs.copyFileSync(tBg, outPath);
      }
    }

    const templateShared = path.join(templateDir, 'shared_mod');
    if (fs.existsSync(templateShared)) {
      const tUi = path.join(templateShared, 'ui');
      if (fs.existsSync(tUi)) {
        for (const f of fs.readdirSync(tUi)) {
          const src = path.join(tUi, f);
          if (fs.statSync(src).isFile()) fs.copyFileSync(src, path.join(sharedModUi, f));
        }
      }
      const tFonts = path.join(templateShared, 'fonts');
      if (fs.existsSync(tFonts)) copyDirRecursive(tFonts, sharedModFonts);
    }

    shell.openPath(exportRoot);
    return { success: true, path: exportRoot };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

app.on('before-quit', async (e) => {
  if (isQuitting) return;
  e.preventDefault();
  isQuitting = true;

  console.log('🔌 App shutdown initiated. Cleaning up...');

  // Close CarPlay HTTP server, MJPEG stream & SSE clients
  if (captureInterval) {
    clearInterval(captureInterval);
    captureInterval = null;
  }
  for (const client of mjpegClients) {
    try { client.end(); } catch (err) { }
  }
  mjpegClients.clear();
  if (carplayServer) {
    for (const client of carplaySseClients) {
      try { client.end(); } catch (err) { }
    }
    carplaySseClients.clear();
    try { carplayServer.close(); } catch (err) { }
    carplayServer = null;
  }

  // 1. Clear all intervals and timeouts
  if (rpcTimeout) clearTimeout(rpcTimeout);
  clearInterval(rpcInterval);
  if (afkIntervalId) clearInterval(afkIntervalId);
  if (afkStartTimeout) clearTimeout(afkStartTimeout);

  // 2. Kill telemetry process tree
  if (telemetryProcess) {
    try {
      const pid = telemetryProcess.pid;
      if (pid) {
        execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
      }
    } catch (err) {
      try { telemetryProcess.kill('SIGKILL'); } catch (e2) { }
    }
    telemetryProcess = null;
  }

  // 3. Kill SMTC process tree
  if (smtcProcess) {
    try {
      const pid = smtcProcess.pid;
      if (pid) {
        execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
      }
    } catch (err) {
      try { smtcProcess.kill('SIGKILL'); } catch (e2) { }
    }
    smtcProcess = null;
  }

  // 3.5 Kill standalone CarPlay process if running
  if (carplayChild) {
    try {
      const pid = carplayChild.pid;
      if (pid) {
        execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
      }
    } catch (err) {
      try { carplayChild.kill('SIGKILL'); } catch (e2) { }
    }
    carplayChild = null;
  }

  // 4. Stop Discord RPC gracefully
  await stopRpc();

  // 5. Destroy all windows
  BrowserWindow.getAllWindows().forEach(win => {
    if (!win.isDestroyed()) {
      win.destroy();
    }
  });

  // 6. Quit app
  app.quit();
});