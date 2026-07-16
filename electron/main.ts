import { app, BrowserWindow, ipcMain, dialog, screen, globalShortcut, shell, net as electronNet } from 'electron'
import { exec, execSync, spawn } from 'node:child_process'
import net from 'node:net'
import DiscordRPC from 'discord-rpc'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import crypto from 'node:crypto'
import https from 'node:https'
import os from 'node:os'

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
// V8: lower heap ceiling + prefer smaller code over peak speed
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=96 --optimize-for-size');
// One renderer process shared across same-origin pages
app.commandLine.appendSwitch('process-per-site');
// Disable APIs the app doesn't use
app.commandLine.appendSwitch('disable-speech-api');
app.commandLine.appendSwitch('disable-voice-input');
app.commandLine.appendSwitch('disable-notifications');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('no-first-run');
// Disable Chromium subsystems that carry invisible RAM overhead
// BackForwardCache keeps full rendered pages in RAM for back/forward – useless in a SPA
// AudioServiceOutOfProcess spins up a separate audio process – keep it in-process
// MediaRouter / DialMediaRouteProvider / HardwareMediaKeyHandling – not needed
// IntensiveWakeUpThrottling – Chrome feature that, after 5 min in background, throttles ALL
//   timers to fire at most once per minute. Without this disabled, notification polling
//   (every 30s) would be delayed up to 60s when the user is gaming.
app.commandLine.appendSwitch('disable-features',
  'BackForwardCache,TranslateUI,AudioServiceOutOfProcess,MediaRouter,DialMediaRouteProvider,HardwareMediaKeyHandling,IntensiveWakeUpThrottling'
);

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null;
let splashWin: BrowserWindow | null = null;
let overlayWin: BrowserWindow | null = null;
let logoWin: BrowserWindow | null = null;
let driversWin: BrowserWindow | null = null;
let eventWin: BrowserWindow | null = null;

function safeSend(winInstance: BrowserWindow | null, channel: string, ...args: any[]) {
  if (winInstance && !winInstance.isDestroyed() && winInstance.webContents && !winInstance.webContents.isDestroyed()) {
    try {
      winInstance.webContents.send(channel, ...args);
    } catch (e: any) {
      writeToLog(`Failed to send to window: ${e.message}`);
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
  showSpotify: true
};

const SETTINGS_PATH = path.join(app.getPath('userData'), 'overlay-settings.json');

let isRpcActive = true;
let currentUsername: string | null = null;

let userToken: string | null = null;
let currentJobId: string | null = null;
let lastJobDetails: string | null = null;
let prevJobActive = false;
let lastPositionSent = 0;
let rpcStartTime: Date | null = null;
let lastSeenNotifId: string | null = null;

// Job Tracking Stats
let jobStartFuel = 0;
let jobTotalSpeed = 0;
let jobSpeedTicks = 0;
let jobMaxSpeed = 0;

async function loadSettings() {
  writeToLog('Attempting to load settings...');
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const data = fs.readFileSync(SETTINGS_PATH, 'utf8');
      const saved = JSON.parse(data);
      isRpcActive = saved.isRpcActive !== undefined ? saved.isRpcActive : isRpcActive;
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

      isOverlayLocked = true; // Always locked on app start
      isOverlayActive = saved.isOverlayActive !== undefined ? saved.isOverlayActive : false;
      if (saved.overlaySettings !== undefined) {
        overlaySettings = {
          showLogo: true,
          showMainHud: true,
          showDrivers: true,
          showEvent: true,
          showSpotify: true,
          ...saved.overlaySettings
        };
      }
      writeToLog('📦 Settings: Einstellungen geladen');
    } else {
      writeToLog('Settings file does not exist, using defaults.');
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
      overlaySettings
    };
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2));
    writeToLog('📦 Settings: Einstellungen erfolgreich gespeichert');
  } catch (e: any) {
    writeToLog(`❌ Settings: Fehler beim Speichern der Einstellungen: ${e.message}\nStack: ${e.stack}`);
  }
}

loadSettings();



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
      splashWin.close();
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

    writeToLog('Scheduling RPC login in 3 seconds.');
    setTimeout(loginRpc, 3000);
    // Clear HTTP cache every 30 minutes to prevent unbounded growth
    setInterval(() => {
      win?.webContents.session.clearCache().catch(() => { });
    }, 30 * 60 * 1000);
  });

  win.on('closed', () => {
    win = null;
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
});


// Discord RPC
const clientId = '1449830003020922994';
let rpc: any = null;
let isRpcConnected = false;
let telemetryData: any = null;
let lastTelemetryUpdate = 0;
const TELEMETRY_UPDATE_INTERVAL = 40; // ms
let currentCity: string | null = null;
let currentAppPage = 'Dashboard';

function updateRpc() {
  if (!rpc || !isRpcActive || !isRpcConnected) return;

  let details = 'Open Pipe Club App';
  let state = 'Bereit für die Fahrt';
  let activity: any = {
    details: details,
    state: state,
    largeImageKey: 'openpipeclub',
    largeImageText: 'Open Pipe Club Tracker',
    instance: false,
    buttons: [
      { label: "Open Pipe Club Website", url: "https://openpipeclub.com" },
      ...(currentUsername ? [{ label: "Fahrer Profil", url: `https://openpipeclub.com/driver/${currentUsername}` }] : [])
    ]
  };

  const hasGameData = telemetryData && !telemetryData.error && telemetryData.gameVersion > 0;
  if (hasGameData) {
    const truck = telemetryData.brand && telemetryData.model ? `${telemetryData.brand} ${telemetryData.model}` : 'Im Truck';
    const speed = Math.round(telemetryData.speed || 0);
    const pauseText = telemetryData.paused ? '⏸️ PAUSIERT | ' : '';

    const serverName = resolveServerName(telemetryData);

    if (!rpcStartTime) rpcStartTime = new Date();
    activity.startTimestamp = rpcStartTime;

    // Game Specific Assets
    activity.largeImageKey = telemetryData.gameType === 2 ? 'ats' : 'ets2';
    activity.largeImageText = telemetryData.gameType === 2 ? 'American Truck Simulator' : 'Euro Truck Simulator 2';
    activity.smallImageKey = 'openpipeclub';
    activity.smallImageText = 'Open Pipe Club';

    if (telemetryData.cargo && telemetryData.source && telemetryData.dest) {
      activity.details = `${pauseText}🚚 ${truck} | [${serverName}]`;
      activity.state = `📍 ${telemetryData.source} -> ${telemetryData.dest} (📦 ${telemetryData.cargo})`;
    } else {
      activity.details = `${pauseText}🚛 ${truck} | [${serverName}]`;
      activity.state = `🛣️ Auf Achse (${speed} km/h)`;
    }
  } else {
    rpcStartTime = null;
    const pageNames: { [key: string]: string } = {
      'dashboard': 'Im Dashboard 📊',
      'events': 'Plant ein Event 📅',
      'news': 'Liest die News 📰',
      'chat': 'Im Firmen-Chat 💬',
      'map': 'Auf der Live-Karte 🗺️',
      'gallery': 'In der Galerie 🖼️',
      'statistiken': 'Prüft Statistiken 📈',
      'team': 'Sichtet das Team 👥',
      'afkbot': 'Anti-AFK Bot aktiv 🤖',
      'overlay-settings': 'Konfiguriert das Overlay ⚙️',
      'admin': 'Im Admin-Bereich 🛡️',
      'profile': 'Betrachtet Profil 👤',
      'applications': 'Sichtet Bewerbungen 📝',
      'reports': 'Liest Schadensberichte 📑',
      'database': 'Verwaltet die Datenbank 🗄️'
    };
    const cleanPage = (currentAppPage || "").toLowerCase().trim();
    activity.details = 'Im Drivers Hub';
    activity.state = pageNames[cleanPage] || currentAppPage || 'Bereit für die Fahrt';
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
  saveSettings();
  if (enabled) {
    loginRpc();
  } else {
    await stopRpc();
  }
  // Notify renderer of status change
  win?.webContents.send('rpc-status-changed', isRpcActive);
  return isRpcActive;
});

ipcMain.handle('rpc-get-status', () => isRpcActive);

ipcMain.handle('rpc-status', () => isRpcConnected);

ipcMain.on('rpc-update-city', (_, city) => {
  console.log('📍 RPC Standort Update:', city);
  currentCity = city;
  updateRpc();
});

ipcMain.on('rpc-page-changed', (_, page, details) => {
  let displayPage = 'Dashboard';
  if (page === 'profile') {
    if (details?.isSelf) {
      displayPage = 'Bearbeitet sein Profil';
    } else if (details?.username) {
      displayPage = `Schaut das Profil von ${details.username} an`;
    } else {
      displayPage = 'Schaut sich ein Profil an';
    }
  } else if (page === 'events') {
    if (details?.planning) {
      displayPage = 'Erstellt ein Event';
    } else {
      displayPage = 'Schaut sich Events an';
    }
  } else if (page === 'chat') {
    displayPage = 'Chattet mit jemandem';
  } else if (page === 'Dashboard' || page === 'dashboard') {
    displayPage = 'Im Dashboard';
  } else if (page === 'Map' || page === 'map') {
    displayPage = 'Schaut auf die Karte';
  } else if (page === 'OverlaySettings' || page === 'AfkBot' || page === 'overlay-settings' || page === 'afkbot') {
    displayPage = 'In den Einstellungen';
  } else if (page === 'Stats' || page === 'stats') {
    displayPage = 'Schaut sich Statistiken an';
  } else if (page === 'Gallery' || page === 'gallery') {
    displayPage = 'Schaut sich die Galerie an';
  } else if (page === 'News' || page === 'news') {
    displayPage = 'Schaut sich Neuigkeiten an';
  } else if (page === 'Team' || page === 'team') {
    displayPage = 'Schaut sich das Team an';
  } else if (page === 'Admin' || page === 'admin') {
    displayPage = 'Im Admin-Bereich';
  } else {
    displayPage = page.charAt(0).toUpperCase() + page.slice(1);
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
                        result["speedLimit"] = BitConverter.ToSingle(raw, 1068) * 3.6f;
                        result["cargoMass"] = BitConverter.ToSingle(raw, 748) / 1000f;
                        
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

                        result["income"] = BitConverter.ToUInt64(raw, 4000);
                        result["plannedDistance"] = BitConverter.ToUInt32(raw, 100);
                        result["connected"] = true;
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
    Start-Sleep -Milliseconds 40
}
`;

const telemetryTempPath = path.join(app.getPath('temp'), 'openpipeclub_telemetry_v6.ps1');
let telemetryProcess: any = null;

function startTelemetryBridge() {
  if (telemetryProcess) return;

  // Force write script every time to ensure latest version
  try { fs.writeFileSync(telemetryTempPath, telemetryScript, 'utf8'); } catch (e) { }

  telemetryProcess = spawn('powershell', [
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', telemetryTempPath,
    '-ParentPid', process.pid.toString()
  ]);

  telemetryProcess.stdout.setEncoding('utf8');

  let stdoutBuffer = '';
  telemetryProcess.stdout.on('data', (data: any) => {
    stdoutBuffer += data.toString();
    let boundary = stdoutBuffer.indexOf('\n');
    while (boundary !== -1) {
      const line = stdoutBuffer.substring(0, boundary).trim();
      stdoutBuffer = stdoutBuffer.substring(boundary + 1);
      boundary = stdoutBuffer.indexOf('\n');

      if (!line) continue;
      try {
        const parsed = JSON.parse(line);
        // Send updates throttled by the update interval to prevent high CPU usage on IPC & frontend rendering
        if (Date.now() - lastTelemetryUpdate > TELEMETRY_UPDATE_INTERVAL) {
          lastTelemetryUpdate = Date.now();
          safeSend(win, 'telemetry-update', parsed);
          safeSend(overlayWin, 'telemetry-update', parsed);
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

        telemetryData = parsed;
        updateOverlayWindowVisibility(parsed);
      } catch (e: any) {
        console.error('❌ Telemetry: Fehler beim Parsen der Zeile:', e.message, 'Inhalt:', line);
      }
    }
  });

  telemetryProcess.stderr.on('data', (data: any) => {
    console.error('❌ Telemetry PowerShell Error:', data.toString());
  });

  telemetryProcess.on('exit', () => {
    telemetryProcess = null;
    if (!isQuitting) {
      setTimeout(startTelemetryBridge, 5000);
    }
  });
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
    const folderName = game === "ATS" ? "ATSMP" : "ETS2MP";
    const logsDir = path.join(docsPath, folderName, 'logs');
    if (!fs.existsSync(logsDir)) return null;

    const files = fs.readdirSync(logsDir)
      .filter(f => f.startsWith('client_') && f.endsWith('.log'));

    if (files.length === 0) return null;

    // Sort by modification time desc to get the newest log
    files.sort((a, b) => {
      try {
        return fs.statSync(path.join(logsDir, b)).mtimeMs - fs.statSync(path.join(logsDir, a)).mtimeMs;
      } catch (e) {
        return 0;
      }
    });

    const newestFile = path.join(logsDir, files[0]);
    const content = fs.readFileSync(newestFile, 'utf8');
    const lines = content.split('\n');

    // Scan backwards for the latest server connection log line
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (line.includes('Connecting to') || line.includes('Connected to')) {
        const match = line.match(/Connecting to .*? \(([^)]+)\)/) || line.match(/Connected to (.*?)(?:\!|$)/);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
    }
  } catch (e) {
    console.error('❌ Fehler beim Lesen der TruckersMP Logs:', e);
  }
  return null;
}

// Stable server-name resolution.
// The raw detection (activeTitle / API / logs) is not available on every tick,
// which made the display flicker between the real server name, "TruckersMP" and
// "Multiplayer". We cache the last concrete server name while a multiplayer
// session is active so only the server is shown, consistently.
let lastResolvedServerName: string | null = null;

function resolveServerName(data: any): string {
  const isMultiplayer = data && data.multiplayerTimeOffset && data.multiplayerTimeOffset !== 0;
  if (!isMultiplayer) {
    lastResolvedServerName = null;
    return "Singleplayer";
  }

  const apiServerName = truckersmpSession?.server_name;
  const parsedServer = apiServerName || getTruckersMPActiveServer(data.gameType === 2 ? "ATS" : "ETS2");

  if (parsedServer) {
    lastResolvedServerName = parsedServer;
    return parsedServer;
  }

  // No concrete server name available this tick: keep the last known one to
  // avoid flickering between generic fallbacks.
  return lastResolvedServerName || "TruckersMP";
}

const BACKEND_URL = 'https://api.openpipeclub.com/api';

async function handleTrackingLogic(current: any, prev: any) {
  if (!userToken) return;

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

  // Track stats during active job
  if (isJobActive) {
    jobTotalSpeed += (current.speed || 0);
    jobSpeedTicks++;
    jobMaxSpeed = Math.max(jobMaxSpeed, current.speed || 0);
  }

  // 1. Position Update (every 5 seconds)
  if (current.connected && (now - lastPositionSent > 5000)) {
    lastPositionSent = now;
    console.log(`📍 Tracking: Sende Position (${current.source || 'Fahrt'})`);

    const serverName = resolveServerName(current);

    const gameStr = current.gameType === 2 ? "ATS" : "ETS2";
    const steamIdVal = current.steamId || null;

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
          city: current.source || current.dest || null,
          server_name: serverName,
          game: gameStr,
          steam_id: steamIdVal,
          in_game: true
        })
      }).then(res => {
        if (!res.ok) console.error(`❌ Tracking Fehler: ${res.status} ${res.statusText}`);
      }).catch(err => console.error("❌ Tracking Netzwerkfehler:", err.message));
    } catch (e) { }
  }

  // 2. Job Events
  // Job Start / Resume Detection
  if (isJobActive && jobDetails !== lastJobDetails) {
    currentJobId = crypto.randomUUID();
    lastJobDetails = jobDetails;

    // Reset Job Stats
    jobStartFuel = current.fuel || 0;
    jobTotalSpeed = 0;
    jobSpeedTicks = 0;
    jobMaxSpeed = 0;

    saveSettings(); // Persist new job state

    console.log(`🚚 Job Start erkannt: ${cargo} nach ${current.dest}`);
    const jobData = {
      type: 'start',
      cargo: cargo,
      source: current.source,
      dest: current.dest
    };
    win?.webContents.send('job-notification', jobData);
    overlayWin?.webContents.send('job-notification', jobData);

    try {
      fetch(`${BACKEND_URL}/desktop/job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          event: "start",
          job_id: currentJobId,
          source_company: current.source_company,
          source_city: current.source,
          destination_company: current.dest_company,
          destination_city: current.dest,
          cargo: current.cargo,
          cargo_mass_kg: Math.round((current.cargoMass || 0) * 1000),
          distance_km: current.plannedDistance,
          income: current.income,
          truck: `${current.brand} ${current.model}`,
          trailer: current.trailer || "Trailer",
          started_at: new Date().toISOString()
        })
      }).catch(() => { });
    } catch (e) { }
  }

  // Job Delivered/Cancelled
  // Improved: Only trigger if the cargo is actually GONE (not just loading/menu)
  if (!cargoValid && lastJobDetails !== null) {
    const prevDetails = lastJobDetails.split('|');
    const event = (prev && prev.navDistance < 2000) ? "delivered" : "cancelled";
    console.log(`🏁 Tracking: Job Ende (${event})`);

    const jobData = {
      type: event,
      cargo: prevDetails[0],
      source: prevDetails[1],
      dest: prevDetails[2]
    };

    win?.webContents.send('job-notification', jobData);
    overlayWin?.webContents.send('job-notification', jobData);

    // Calculate final stats
    const avgSpeed = jobSpeedTicks > 0 ? Math.round(jobTotalSpeed / jobSpeedTicks) : 0;
    const fuelUsed = Math.max(0, jobStartFuel - current.fuel);

    try {
      fetch(`${BACKEND_URL}/desktop/job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          event: event,
          job_id: currentJobId,
          average_speed_kmh: avgSpeed,
          max_speed_kmh: jobMaxSpeed,
          fuel_used_l: parseFloat(fuelUsed.toFixed(2)),
          ended_at: new Date().toISOString()
        })
      }).catch(() => { });
    } catch (e) { }

    lastJobDetails = null;
    currentJobId = null;
    saveSettings();

    // Reset stats
    jobStartFuel = 0;
    jobTotalSpeed = 0;
    jobSpeedTicks = 0;
    jobMaxSpeed = 0;

    win?.webContents.send('job-update', jobData);
  }

  prevJobActive = isJobActive;
}

ipcMain.on('set-auth-token', (_, token) => {
  console.log(`🔑 Auth: Token erhalten (${token ? 'Vorhanden' : 'Gelöscht'})`);
  userToken = token;
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
  const { width, height } = primaryDisplay.bounds;

  overlayWin = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    focusable: false, // Prevent the overlay from taking focus from other windows/games
    show: false, // Start hidden to prevent startup DWM composition lag
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.cjs'),
      backgroundThrottling: false, // Ensure page doesn't lag when game is in focus
      webSecurity: false,
    },
  });

  // Ensure it ignores mouse events immediately on creation to prevent blocking window controls
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

ipcMain.on('overlay-toggle', () => {
  isOverlayActive = !isOverlayActive;
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

ipcMain.on('overlay-settings-changed', (_, settings) => {
  overlaySettings = settings;
  saveSettings();

  overlayWin?.webContents.send('overlay-settings-updated', settings);

  if (isOverlayActive) {
    syncOverlayWindows();
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

// The overlay renderer registers its IPC listeners only after React has mounted,
// while the initial state was previously pushed during `did-finish-load`
// (which fires before the listeners exist). On a cold start (uncached bundle)
// that push is missed, so the overlay started unconfigured until a restart.
// Letting the renderer explicitly request the current state on mount closes
// that race regardless of load/cache timing.
ipcMain.handle('overlay-get-state', () => {
  const currentPositions = {
    logo: { x: logoX ?? 40, y: logoY ?? 40 },
    mainHud: { x: overlayX ?? 40, y: overlayY ?? 130 },
    event: { x: eventX ?? 40, y: eventY ?? 310 },
    drivers: { x: driversX ?? 40, y: driversY ?? 440 },
    spotify: { x: spotifyX ?? 40, y: spotifyY ?? 580 }
  };
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

const smtcScript = `
param(
    [int]$ParentPid = 0
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$source = @"
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
"@

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
        safeSend(overlayWin, 'smtc-update', lastSmtcData);
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

// Start bridge once
startTelemetryBridge();


ipcMain.handle('telemetry-status', () => telemetryData);

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

  const psScript = `
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
    # 0x59 ist der Code für die 'Y' Taste
    [WindowHelper]::keybd_event(0x59, 0, 0, 0) # Down
    Start-Sleep -m 100
    [WindowHelper]::keybd_event(0x59, 0, 2, 0) # Up
    
    Start-Sleep -m 800
    
    # Text in die Zwischenablage kopieren (unterstützt Emojis)
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.Clipboard]::SetText(@"
${text}
"@, [System.Windows.Forms.TextDataFormat]::UnicodeText)
    
    Start-Sleep -m 200
    
    # Ctrl+V zum Einfügen (0xA2 = LCtrl, 0x56 = V)
    [WindowHelper]::keybd_event(0xA2, 0, 0, 0)      # LCtrl Down
    [WindowHelper]::keybd_event(0x56, 0, 0, 0)      # V Down
    Start-Sleep -m 50
    [WindowHelper]::keybd_event(0x56, 0, 2, 0)      # V Up
    [WindowHelper]::keybd_event(0xA2, 0, 2, 0)      # LCtrl Up
    
    Start-Sleep -m 500
    
    # Enter senden via keybd_event
    [WindowHelper]::keybd_event(0x0D, 0, 0, 0) # Enter Down
    Start-Sleep -m 50
    [WindowHelper]::keybd_event(0x0D, 0, 2, 0) # Enter Up
} else {
    Write-Host "FENSTER NICHT ERKANNT: $title"
}
`;

  const tempPath = path.join(app.getPath('temp'), 'afk_task.ps1');
  // Manually add the UTF-8 BOM to ensure PowerShell reads the file with the correct encoding for special characters.
  fs.writeFileSync(tempPath, '\uFEFF' + psScript, 'utf8');

  exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempPath}"`, (err, stdout) => {
    if (stdout) console.log('💻 PowerShell:', stdout.trim());
    if (err) console.error('❌ PowerShell Fehler:', err);
  });
}

function toggleAfkBot() {
  isAfkRunning = !isAfkRunning;

  if (isAfkRunning) {
    lastMovementTime = Date.now(); // reset on start
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})


const PLUGIN_URL = 'https://github.com/RenCloud/scs-sdk-plugin/releases/download/V.1.12.1/release_v_1_12_1.zip';

async function getPluginStatus() {
  const games = [
    { id: '227300', name: 'Euro Truck Simulator 2' },
    { id: '270880', name: 'American Truck Simulator' }
  ];

  const results = [];

  for (const game of games) {
    try {
      let gamePath = '';
      try {
        const cmd = `powershell -Command "$v = Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Steam App ${game.id}' -ErrorAction SilentlyContinue; if ($v) { $v.InstallLocation }"`;
        gamePath = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      } catch (e) { }

      if (gamePath && fs.existsSync(gamePath)) {
        const pluginsPath = path.join(gamePath, 'bin', 'win_x64', 'plugins');
        const dllPath = path.join(pluginsPath, 'scs-telemetry.dll');
        const installed = fs.existsSync(dllPath);

        results.push({
          gameId: game.id,
          gameName: game.name,
          installed,
          gamePath
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

  try {
    let gamePath = '';
    try {
      const cmd = `powershell -Command "$v = Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Steam App ${game.id}' -ErrorAction SilentlyContinue; if ($v) { $v.InstallLocation }"`;
      gamePath = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch (e) { }

    if (gamePath && fs.existsSync(gamePath)) {
      const pluginsPath = path.join(gamePath, 'bin', 'win_x64', 'plugins');
      const dllPath = path.join(pluginsPath, 'scs-telemetry.dll');

      if (!fs.existsSync(pluginsPath)) {
        fs.mkdirSync(pluginsPath, { recursive: true });
      }

      const tempZip = path.join(app.getPath('temp'), 'scs_plugin.zip');
      const tempExtract = path.join(app.getPath('temp'), 'scs_plugin_ext');

      // Step 1: Download
      event.sender.send('install-plugin-progress', { progress: 20, status: 'Downloade Plugin...' });
      execSync(`powershell -Command "Invoke-WebRequest -Uri '${PLUGIN_URL}' -OutFile '${tempZip}'"`);

      // Step 2: Extract
      event.sender.send('install-plugin-progress', { progress: 60, status: 'Entpacke Dateien...' });
      execSync(`powershell -Command "Expand-Archive -Path '${tempZip}' -DestinationPath '${tempExtract}' -Force"`);

      // Step 3: Copy
      event.sender.send('install-plugin-progress', { progress: 90, status: 'Installiere DLL...' });
      const copyCmd = `powershell -Command "$dll = Get-ChildItem -Path '${tempExtract}' -Filter 'scs-telemetry.dll' -Recurse | Where-Object { $_.FullName -match 'Win64' -or $_.FullName -match 'x64' } | Select-Object -First 1; if ($dll) { Copy-Item -Path $dll.FullName -Destination '${dllPath}' -Force } else { throw 'DLL not found in ZIP' }"`;
      execSync(copyCmd);

      event.sender.send('install-plugin-progress', { progress: 100, status: 'Installation erfolgreich!', success: true });
    } else {
      event.sender.send('install-plugin-progress', { progress: 0, status: 'Fehler: Pfad nicht gefunden', error: 'Game path not found' });
    }
  } catch (e: any) {
    console.error(`Failed to install plugin for ${gameId}:`, e);
    event.sender.send('install-plugin-progress', { progress: 0, status: 'Fehler bei der Installation', error: e.message });
  }
});

ipcMain.handle('check-app-update', async () => {
  return new Promise((resolve) => {
    const currentVersion = app.getVersion();
    const repo = 'Niconoop/Open-Pipe-Club';
    const apiUrl = `https://api.github.com/repos/${repo}/releases/latest`;
    const options = {
      headers: {
        'User-Agent': 'Open-Pipe-Club-App'
      }
    };

    https.get(apiUrl, options, (res) => {
      let data = '';
      if (res.statusCode !== 200) {
        return resolve({ updateAvailable: false, error: `HTTP ${res.statusCode}` });
      }

      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          const latestVersion = release.tag_name.replace(/^v/, '');
          const releaseNotes = release.body || '';

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

          if (compareVersions(currentVersion, latestVersion) < 0) {
            resolve({
              updateAvailable: true,
              currentVersion,
              latestVersion,
              releaseNotes
            });
          } else {
            resolve({ updateAvailable: false, currentVersion, latestVersion });
          }
        } catch (e: any) {
          resolve({ updateAvailable: false, error: e.message });
        }
      });
    }).on('error', (e) => {
      resolve({ updateAvailable: false, error: e.message });
    });
  });
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
      const targetExe = process.env.PORTABLE_EXECUTABLE_FILE || app.getPath('exe');
      const exeName = path.basename(targetExe);
      const updateBatPath = path.join(app.getPath('temp'), 'openpipeclub_update.bat');

      const batContent = `@echo off\r\n` +
        `timeout /t 2 /nobreak > NUL\r\n` +
        `taskkill /f /im "${exeName}" > NUL 2>&1\r\n` +
        `:loop\r\n` +
        `copy /Y "${tempUpdatePath}" "${targetExe}" > NUL\r\n` +
        `if %errorlevel% neq 0 (\r\n` +
        `  timeout /t 1 /nobreak > NUL\r\n` +
        `  goto loop\r\n` +
        `)\r\n` +
        `start "" "${targetExe}"\r\n` +
        `del "%~f0"\r\n`;

      fs.writeFileSync(updateBatPath, batContent, 'utf8');

      const child = spawn('cmd.exe', ['/c', updateBatPath], {
        detached: true,
        windowsHide: true,
        stdio: 'ignore'
      });
      child.unref();

      event.sender.send('install-update-progress', { progress: 100, status: 'Update abgeschlossen. Starte neu...', success: true });

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
  const repo = 'Niconoop/Open-Pipe-Club';
  const apiUrl = `https://api.github.com/repos/${repo}/releases/latest`;
  const options = {
    headers: {
      'User-Agent': 'Open-Pipe-Club-App'
    }
  };

  event.sender.send('install-update-progress', { progress: 10, status: 'Suche neueste Version...' });

  https.get(apiUrl, options, (res) => {
    let data = '';
    if (res.statusCode !== 200) {
      event.sender.send('install-update-progress', { progress: 0, status: `HTTP Fehler: ${res.statusCode}`, error: true });
      return;
    }

    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const release = JSON.parse(data);
        const asset = release.assets?.find((a: any) => a.name.endsWith('.exe') && !a.name.includes('Setup'));

        if (!asset) {
          event.sender.send('install-update-progress', { progress: 0, status: 'Keine .exe Datei im neuesten Release gefunden.', error: true });
          return;
        }

        event.sender.send('install-update-progress', { progress: 20, status: 'Starte Download...' });
        downloadAndApplyUpdate(asset.browser_download_url, event);

      } catch (e: any) {
        event.sender.send('install-update-progress', { progress: 0, status: `Fehler: ${e.message}`, error: true });
      }
    });
  }).on('error', (e) => {
    event.sender.send('install-update-progress', { progress: 0, status: `Netzwerkfehler: ${e.message}`, error: true });
  });
});

app.whenReady().then(() => {
  createSplashScreen();
  createWindow();
  if (isOverlayActive) {
    syncOverlayWindows();
  }
})
app.on('before-quit', async (e) => {
  if (isQuitting) return;
  e.preventDefault();
  isQuitting = true;

  console.log('🔌 App shutdown initiated. Cleaning up...');

  // 1. Clear all intervals and timeouts
  isRpcActive = false;
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