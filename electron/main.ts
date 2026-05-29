import { app, BrowserWindow, ipcMain, dialog, screen, globalShortcut } from 'electron'
import { exec, execSync, spawn } from 'node:child_process'
import net from 'node:net'
import DiscordRPC from 'discord-rpc'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import crypto from 'node:crypto'
import https from 'node:https'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Optimize Electron RAM footprint
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=128');
app.commandLine.appendSwitch('process-per-site');
app.commandLine.appendSwitch('disable-speech-api');
app.commandLine.appendSwitch('disable-voice-input');
app.commandLine.appendSwitch('disable-notifications');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null;
let overlayWin: BrowserWindow | null = null;
let logoWin: BrowserWindow | null = null;
let driversWin: BrowserWindow | null = null;
let eventWin: BrowserWindow | null = null;

function safeSend(winInstance: BrowserWindow | null, channel: string, ...args: any[]) {
  if (winInstance && !winInstance.isDestroyed() && winInstance.webContents && !winInstance.webContents.isDestroyed()) {
    try {
      winInstance.webContents.send(channel, ...args);
    } catch (e) {
      console.error(`Failed to send to window:`, e);
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

let isOverlayLocked = true;
let isOverlayActive = false;

let overlaySettings: any = {
  showLogo: true,
  showMainHud: true,
  showDrivers: true,
  showEvent: true
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

function loadSettings() {
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

      isOverlayLocked = true; // Always locked on app start
      isOverlayActive = saved.isOverlayActive !== undefined ? saved.isOverlayActive : false;
      if (saved.overlaySettings !== undefined) {
        overlaySettings = saved.overlaySettings;
      }
      console.log('📦 Settings: Einstellungen geladen');
    }
  } catch (e) {
    console.error('❌ Settings: Fehler beim Laden der Einstellungen', e);
  }
}

function saveSettings() {
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
      isOverlayLocked,
      isOverlayActive,
      overlaySettings
    };
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('❌ Settings: Fehler beim Speichern der Einstellungen', e);
  }
}

loadSettings();



function createWindow() {
  app.name = 'FJOSTE App';
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'FJOSTE App',
    icon: path.join(process.env.VITE_PUBLIC, 'logo.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js'),
      spellcheck: false
    },
    autoHideMenuBar: true,
    backgroundColor: '#050507',
    frame: false,
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(process.env.DIST, 'index.html'))
  }

  win.webContents.on('did-finish-load', () => {
    win?.show();
    setTimeout(loginRpc, 3000);
  });
}

ipcMain.on('window-close', () => app.quit())
ipcMain.on('window-minimize', () => win?.minimize())
ipcMain.on('window-maximize', () => {
  if (win?.isMaximized()) win.unmaximize()
  else win?.maximize()
})

ipcMain.on('job-notification', (_, data) => {
  win?.webContents.send('job-notification', data);
  if (overlayWin && !overlayWin.isDestroyed()) {
    overlayWin.webContents.send('job-notification', data);
  }
});


// Discord RPC
const clientId = '1447245757232058510';
let rpc: any = null;
let isRpcConnected = false;
let telemetryData: any = null;
let lastTelemetryUpdate = 0;
const TELEMETRY_UPDATE_INTERVAL = 40; // ms
let currentCity: string | null = null;

function updateRpc() {
  if (!rpc || !isRpcActive || !isRpcConnected) return;

  let details = 'FJOSTE App';
  let state = 'Bereit für die Fahrt';
  let activity: any = {
    details: details,
    state: state,
    largeImageKey: 'fjoste',
    largeImageText: 'FJOSTE Tracker',
    instance: false,
    buttons: [
      { label: "FJOSTE Website", url: "https://www.fjostegroup.de" },
      ...(currentUsername ? [{ label: "Fahrer Profil", url: `https://www.fjostegroup.de/driver/${currentUsername}` }] : [])
    ]
  };

  const hasGameData = telemetryData && !telemetryData.error && telemetryData.gameVersion > 0;
  if (hasGameData) {
    const truck = telemetryData.brand && telemetryData.model ? `${telemetryData.brand} ${telemetryData.model}` : 'Im Truck';
    const speed = Math.round(telemetryData.speed || 0);
    const pauseText = telemetryData.paused ? '⏸️ PAUSIERT | ' : '';

    let serverName = "Singleplayer";
    const isMultiplayer = telemetryData.multiplayerTimeOffset && telemetryData.multiplayerTimeOffset !== 0;
    if (isMultiplayer) {
      const title = (telemetryData.activeTitle || "").toLowerCase();
      const isTruckersMP = title.includes('truckersmp') ||
        title.includes('euro truck simulator 2 multiplayer') ||
        title.includes('ets2mp') ||
        title.includes('atsmp');
      if (isTruckersMP) {
        const parsedServer = getTruckersMPActiveServer(telemetryData.gameType === 2 ? "ATS" : "ETS2");
        serverName = parsedServer || "TruckersMP";
      } else {
        serverName = "Multiplayer";
      }
    }

    if (!rpcStartTime) rpcStartTime = new Date();
    activity.startTimestamp = rpcStartTime;

    if (telemetryData.cargo && telemetryData.source && telemetryData.dest) {
      activity.details = `${pauseText}🚚 ${truck} | [${serverName}]`;
      activity.state = `📍 ${telemetryData.source} -> ${telemetryData.dest} (📦 ${telemetryData.cargo})`;
    } else {
      activity.details = `${pauseText}🚛 ${truck} | [${serverName}]`;
      activity.state = `🛣️ Auf Achse (${speed} km/h)`;
    }
  } else {
    rpcStartTime = null;
  }

  rpc.setActivity(activity).catch((err: any) => console.error('🎮 RPC: Fehler beim Setzen der Activity:', err));
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
  if (!isRpcActive) return;
  if (rpcTimeout) clearTimeout(rpcTimeout);

  if (rpc) {
    try { await rpc.destroy(); } catch (e) { }
    rpc = null;
  }

  console.log('🎮 RPC: Verbindungsversuch...');

  try {
    rpc = new DiscordRPC.Client({ transport: 'ipc' });
    rpc.on('ready', () => {
      console.log('🎮 RPC: Bereit!');
      isRpcConnected = true;
      updateRpc();
      win?.webContents.send('rpc-status-changed', true);
    });
    rpc.on('error', (err: any) => {
      if (err.message === 'Could not connect') {
        console.log('🎮 RPC: Verbindung zu Discord fehlgeschlagen (Discord läuft wahrscheinlich nicht).');
      } else {
        console.error('🎮 RPC: Fehler:', err);
      }
      isRpcConnected = false;
      win?.webContents.send('rpc-status-changed', false);
    });
    await rpc.login({ clientId });
  } catch (err: any) {
    if (err.message !== 'Could not connect') {
      console.error('🎮 RPC: Login-Fehler:', err);
    } else {
      checkDiscordPermissionError().then((isEperm) => {
        if (isEperm) {
          console.error('🎮 RPC: Verbindungsfehler EPERM. Discord läuft vermutlich als Administrator, während dieser Tracker als normaler Benutzer läuft.');
          win?.webContents.send('rpc-error', 'eperm');
        }
      });
    }
    isRpcConnected = false;
    win?.webContents.send('rpc-status-changed', false);
    if (isRpcActive) {
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

ipcMain.on('set-auth-username', (_, username) => {
  console.log('👤 Benutzer erkannt:', username);
  currentUsername = username;
  updateRpc();
});

const rpcInterval = setInterval(updateRpc, 15000);

// Telemetry Polling
const telemetryScript = `
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
                        result["heading"] = BitConverter.ToDouble(raw, 2232);

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

while($true) {
    try {
        [SCSTelemetry]::GetData() | ConvertTo-Json -Compress
    } catch {
        Write-Output '{"error":"ps_error"}'
    }
    Start-Sleep -Milliseconds 40
}
`;

const telemetryTempPath = path.join(app.getPath('temp'), 'fjoste_telemetry_v6.ps1');
let telemetryProcess: any = null;

function startTelemetryBridge() {
  if (telemetryProcess) return;

  // Force write script every time to ensure latest version
  try { fs.writeFileSync(telemetryTempPath, telemetryScript, 'utf8'); } catch (e) { }

  telemetryProcess = spawn('powershell', [
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', telemetryTempPath
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
        // Send updates if data changed
        if (Date.now() - lastTelemetryUpdate > TELEMETRY_UPDATE_INTERVAL || JSON.stringify(parsed) !== JSON.stringify(telemetryData)) {
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
    setTimeout(startTelemetryBridge, 5000);
  });
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

const BACKEND_URL = 'https://api.fjostegroup.de/api';

async function handleTrackingLogic(current: any, prev: any) {
  if (!userToken) return;

  if (!current.connected) return;

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
  }

  // 1. Position Update (every 5 seconds)
  if (current.connected && (now - lastPositionSent > 5000)) {
    lastPositionSent = now;
    console.log(`📍 Tracking: Sende Position (${current.source || 'Fahrt'})`);

    let serverName = "Singleplayer";
    const isMultiplayer = current.multiplayerTimeOffset && current.multiplayerTimeOffset !== 0;
    if (isMultiplayer) {
      const title = (current.activeTitle || "").toLowerCase();
      const isTruckersMP = title.includes('truckersmp') ||
        title.includes('euro truck simulator 2 multiplayer') ||
        title.includes('ets2mp') ||
        title.includes('atsmp');
      if (isTruckersMP) {
        const parsedServer = getTruckersMPActiveServer(current.gameType === 2 ? "ATS" : "ETS2");
        serverName = parsedServer || "TruckersMP";
      } else {
        serverName = "Multiplayer";
      }
    }

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

    win?.webContents.send('job-update', jobData);
  }

  prevJobActive = isJobActive;
}

ipcMain.on('set-auth-token', (_, token) => {
  console.log(`🔑 Auth: Token erhalten (${token ? 'Vorhanden' : 'Gelöscht'})`);
  userToken = token;
});



function registerOverlayShortcut() {
  if (!globalShortcut.isRegistered('CommandOrControl+Shift+L')) {
    try {
      globalShortcut.register('CommandOrControl+Shift+L', () => {
        isOverlayLocked = !isOverlayLocked;
        saveSettings();
        if (overlayWin && !overlayWin.isDestroyed()) {
          overlayWin.setIgnoreMouseEvents(isOverlayLocked, { forward: true });
          overlayWin.webContents.send('overlay-lock-changed', isOverlayLocked);
          updateOverlayWindowVisibility(telemetryData);
          if (!isOverlayLocked && isOverlayActive) {
            overlayWin.show();
            overlayWin.focus();
          }
        }
      });
      console.log('⌨️ Shortcut: Globaler Hotkey registriert');
    } catch (e) {
      console.error('Failed to register global shortcut:', e);
    }
  }
}

function updateOverlayStatus() {
  const isOpen = isOverlayActive || !!(logoWin || driversWin || eventWin);
  win?.webContents.send('overlay-status-changed', isOpen);
  
  if (!isOpen) {
    try {
      globalShortcut.unregister('CommandOrControl+Shift+L');
    } catch (e) { }
  }
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
  if (overlayWin) {
    overlayWin.focus();
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
    show: false, // Start hidden to prevent startup DWM composition lag
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false, // Ensure page doesn't lag when game is in focus
    },
  });

  overlayWin.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`🖥️ [Overlay Console] ${message} (at ${sourceId}:${line})`);
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    overlayWin.loadURL(`${process.env.VITE_DEV_SERVER_URL}#overlay-main`);
  } else {
    overlayWin.loadFile(path.join(process.env.DIST, 'index.html'), { hash: 'overlay-main' });
  }

  overlayWin.webContents.on('did-finish-load', () => {
    overlayWin?.setIgnoreMouseEvents(isOverlayLocked, { forward: true });
    overlayWin?.webContents.send('overlay-lock-changed', isOverlayLocked);
    overlayWin?.webContents.send('overlay-settings-updated', overlaySettings);
    if (telemetryData) {
      overlayWin?.webContents.send('telemetry-update', telemetryData);
    }
  });

  overlayWin.once('ready-to-show', () => {
    updateOverlayWindowVisibility(telemetryData);
  });

  // Register hotkey if not already registered
  registerOverlayShortcut();

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

  registerOverlayShortcut();

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
    overlayWin.setIgnoreMouseEvents(locked, { forward: true });
    overlayWin.webContents.send('overlay-lock-changed', locked);
    updateOverlayWindowVisibility(telemetryData);
    if (!locked && isOverlayActive) {
      overlayWin.show();
      overlayWin.focus();
    }
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

  let pool = isDriving ? afkConfig.drivingTexts : afkConfig.pausedTexts;
  if (!pool || pool.length === 0) {
    pool = isDriving ? afkConfig.pausedTexts : afkConfig.drivingTexts;
  }
  if (!pool || pool.length === 0) return;

  const text = pool[Math.floor(Math.random() * pool.length)];
  console.log(`🤖 AFK-Bot: Sende Nachricht... "${text}" (Fahren: ${!!isDriving})`);

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
    
    $wshell = New-Object -ComObject WScript.Shell
    # Sonderzeichen für SendKeys maskieren
    $cleanText = "${text}".Replace("{", "{{}").Replace("}", "{}}").Replace("+", "{+}").Replace("^", "{^}").Replace("%", "{%}").Replace("~", "{~}").Replace("(", "{(}").Replace(")", "{)}")
    $wshell.SendKeys($cleanText)
    
    Start-Sleep -m 500
    
    # Enter senden via keybd_event (sicherer als SendKeys in Spielen)
    [WindowHelper]::keybd_event(0x0D, 0, 0, 0) # Enter Down
    Start-Sleep -m 50
    [WindowHelper]::keybd_event(0x0D, 0, 2, 0) # Enter Up
} else {
    Write-Host "FENSTER NICHT ERKANNT: $title"
}
`;

  const tempPath = path.join(app.getPath('temp'), 'afk_task.ps1');
  fs.writeFileSync(tempPath, psScript, 'utf8');

  exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempPath}"`, (err, stdout) => {
    if (stdout) console.log('💻 PowerShell:', stdout.trim());
    if (err) console.error('❌ PowerShell Fehler:', err);
  });
}

function toggleAfkBot() {
  isAfkRunning = !isAfkRunning;

  if (isAfkRunning) {
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
    try { globalShortcut.unregister(lastAfkHotkey); } catch(e){}
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

app.on('before-quit', () => {
  isRpcActive = false;
  if (rpcTimeout) clearTimeout(rpcTimeout);
  clearInterval(rpcInterval);
  if (afkIntervalId) clearInterval(afkIntervalId);
  if (afkStartTimeout) clearTimeout(afkStartTimeout);

  if (telemetryProcess) {
    try {
      // Force kill the whole process tree (PowerShell + children) on Windows
      const pid = telemetryProcess.pid;
      if (pid) {
        execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
      }
    } catch (e) {
      try { telemetryProcess.kill('SIGKILL'); } catch (e2) { }
    }
  }

  if (rpc) {
    try {
      rpc.clearActivity();
      rpc.destroy();
    } catch (e) { }
    rpc = null;
  }
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
    const repo = 'Niconoop/FJOSTE-App';
    const apiUrl = `https://api.github.com/repos/${repo}/releases/latest`;
    const options = {
      headers: {
        'User-Agent': 'FJOSTE-App'
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
  const tempUpdatePath = path.join(app.getPath('temp'), 'FJOSTE-Tracker-Update.exe');

  if (fs.existsSync(tempUpdatePath)) {
    try {
      fs.unlinkSync(tempUpdatePath);
    } catch (e) { }
  }

  const file = fs.createWriteStream(tempUpdatePath, { highWaterMark: 1024 * 1024 });
  const options = {
    headers: {
      'User-Agent': 'FJOSTE-App',
      'Accept': 'application/octet-stream'
    }
  };

  https.get(url, options, (response) => {
    if (response.statusCode === 301 || response.statusCode === 302) {
      downloadAndApplyUpdate(response.headers.location as string, event);
      return;
    }

    if (response.statusCode !== 200) {
      event.sender.send('install-update-progress', { progress: 0, status: `Download Fehler: HTTP ${response.statusCode}`, error: true });
      return;
    }

    const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
    let downloadedBytes = 0;
    let lastUpdate = 0;

    response.on('data', (chunk) => {
      downloadedBytes += chunk.length;
      if (totalBytes > 0) {
        const now = Date.now();
        if (now - lastUpdate > 100 || downloadedBytes === totalBytes) {
          lastUpdate = now;
          const percent = Math.floor((downloadedBytes / totalBytes) * 70) + 20; // 20% to 90%
          event.sender.send('install-update-progress', { progress: percent, status: 'Downloade Update...' });
        }
      }
    });

    response.pipe(file);

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
        const updateBatPath = path.join(app.getPath('temp'), 'fjoste_update.bat');

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
  }).on('error', (err) => {
    try { fs.unlinkSync(tempUpdatePath); } catch (e) { }
    event.sender.send('install-update-progress', { progress: 0, status: `Download Fehler: ${err.message}`, error: true });
  });
}

ipcMain.on('install-app-update', async (event) => {
  const repo = 'Niconoop/FJOSTE-App';
  const apiUrl = `https://api.github.com/repos/${repo}/releases/latest`;
  const options = {
    headers: {
      'User-Agent': 'FJOSTE-App'
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
  createWindow();
  if (isOverlayActive) {
    syncOverlayWindows();
  }
})
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  // Kill Telemetry Process
  if (telemetryProcess) {
    try {
      telemetryProcess.kill();
      // Force kill on windows if needed
      if (telemetryProcess.pid) {
        exec(`taskkill /pid ${telemetryProcess.pid} /f /t`);
      }
    } catch (e) { }
  }

  // Kill RPC
  if (rpc) {
    try { rpc.destroy(); } catch (e) { }
  }
})
