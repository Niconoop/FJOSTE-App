import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Home, Music, Briefcase, Truck, Settings, Play, Pause, SkipForward, SkipBack, Compass, AlertTriangle, Battery, Thermometer, Gauge, Fuel, MapPin, Navigation, Volume2, VolumeX, Info, Wifi, WifiOff, MessageSquare, Newspaper, Calendar, Clock, Zap, Wrench, Search, X, Check, CheckCircle, Monitor, Disc, Radio, Upload, ListMusic, Plus, RefreshCw, ArrowLeft, Keyboard, Delete, CornerDownLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SpotifyWidget from '../components/SpotifyWidget';
import GameMapWidget, { type GameMapWidgetHandle } from '../components/GameMapWidget';
import { searchDestinations, findCompany, findCity, type DestinationSearchResult } from '../data/ets2Cities';

interface Telemetry {
  connected: boolean;
  gameVersion: number;
  speed: number;
  speedLimit: number;
  cruiseControl: number;
  gear: number;
  rpm: number;
  fuel: number;
  fuelRange: number;
  cargo: string;
  cargoMass: number;
  source: string;
  dest: string;
  navDistance: number;
  navTime: number;
  income: number;
  brand: string;
  model: string;
  wearTruck: number;
  wearCargo: number;
  paused: boolean;
  gameType?: number;
  dest_company?: string;
  source_company?: string;
  avgConsumption?: number;
  nextRest?: number;
  plannedDistance?: number;
  parkBrake?: boolean;
  blinkerLeftActive?: boolean;
  blinkerRightActive?: boolean;
  blinkerLeftOn?: boolean;
  blinkerRightOn?: boolean;
  lightsBeamLow?: boolean;
  lightsBeamHigh?: boolean;
  lightsHazard?: boolean;
  lightsBeacon?: boolean;
  fuelWarning?: boolean;
  airPressureWarning?: boolean;
  oilPressureWarning?: boolean;
  waterTemperatureWarning?: boolean;
  batteryVoltageWarning?: boolean;
}

interface SmtcData {
  title: string;
  artist: string;
  album: string;
  progress: number;
  duration: number;
  isPlaying: boolean;
  source: string;
  thumb: string; // base64
}

interface OverlaySettings {
  showCarPlay: boolean;
  carPlayTheme: 'dark' | 'light' | 'auto';
  carPlayMapTheme?: 'dark' | 'light' | 'auto';
  carPlayTextScale: 'small' | 'medium' | 'large';
  carPlayHotkeys: {
    toggle: string;
    next: string;
    prev: string;
    home: string;
    playPause: string;
  };
}

const DEFAULT_SETTINGS: OverlaySettings = {
  showCarPlay: true,
  carPlayTheme: 'dark',
  carPlayMapTheme: 'auto',
  carPlayTextScale: 'medium',
  carPlayHotkeys: {
    toggle: 'F9',
    next: 'Ctrl+Alt+Right',
    prev: 'Ctrl+Alt+Left',
    home: 'Ctrl+Alt+H',
    playPause: 'Ctrl+Alt+Space'
  }
};

const TABS = ['home', 'music', 'job', 'truck', 'settings'] as const;
type Tab = typeof TABS[number];

interface RadioStation {
  id: number;
  url: string;
  name: string;
  genre: string;
  language: string;
  bitrate: string;
  favorite: boolean;
  logo?: string;
}

const DEFAULT_ETS2_STATIONS: RadioStation[] = [
  { id: 1, url: 'https://stream.radioparadise.com/aac-320', name: 'Radio Paradise', genre: 'Rock / Eclectic', language: 'EN', bitrate: '320', favorite: true, logo: 'https://icon.horse/icon/radioparadise.com' },
  { id: 2, url: 'https://stream.rockantenne.de/rockantenne/stream/mp3', name: 'ROCK ANTENNE', genre: 'Classic & Modern Rock', language: 'DE', bitrate: '192', favorite: true, logo: 'https://icon.horse/icon/rockantenne.de' },
  { id: 3, url: 'https://swr-swr3-live.cast.addradio.de/swr/swr3/live/mp3/128/stream.mp3', name: 'SWR3 Live', genre: 'Pop & Chart Hits', language: 'DE', bitrate: '128', favorite: false, logo: 'https://icon.horse/icon/swr3.de' },
  { id: 4, url: 'https://dispatcher.rndfnk.com/br/br24/live/mp3/low', name: 'BR24 Nachrichten', genre: 'News & Info', language: 'DE', bitrate: '128', favorite: false, logo: 'https://icon.horse/icon/br.de' },
  { id: 5, url: 'https://sunshinelive.hoerradar.de/sunshinelive-live-mp3-hq', name: 'sunshine live', genre: 'Electronic & Dance', language: 'DE', bitrate: '192', favorite: true, logo: 'https://icon.horse/icon/sunshine-live.de' },
  { id: 6, url: 'https://stream.radiotrucker.com/live', name: 'Radio Trucker Live', genre: 'Country & Trucking', language: 'EN', bitrate: '192', favorite: true, logo: 'https://icon.horse/icon/radiotrucker.com' },
  { id: 7, url: 'https://bigfm-de-hz-2-stream.radiohost.de/bigfm-de_mp3-128', name: 'bigFM Germany', genre: 'Hip-Hop / Top 40', language: 'DE', bitrate: '128', favorite: false, logo: 'https://icon.horse/icon/bigfm.de' },
];

const LOGO_CACHE = new Map<string, string | null>();

function getRadioLogoUrl(st?: RadioStation | null): string | null {
  if (!st) return null;
  if (st.logo) return st.logo;
  if (!st.url) return null;
  if (LOGO_CACHE.has(st.url)) return LOGO_CACHE.get(st.url)!;

  let logoUrl: string | null = null;
  try {
    const rawUrl = st.url.trim();
    const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `http://${rawUrl}`);
    let host = parsed.hostname
      .replace(/^stream\./i, '')
      .replace(/^live\./i, '')
      .replace(/^dispatcher\./i, '')
      .replace(/^radio\./i, '');
    if (host) {
      logoUrl = `https://icon.horse/icon/${host}`;
    }
  } catch (e) {
    // Ignore invalid URL parsing
  }

  LOGO_CACHE.set(st.url, logoUrl);
  return logoUrl;
}

function parseSiiStreams(content: string): RadioStation[] {
  const stations: RadioStation[] = [];
  const regex = /stream_data\[(\d+)\]:\s*"([^"]+)"/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const id = parseInt(match[1], 10);
    const rawData = match[2];
    const parts = rawData.split('|');
    if (parts.length >= 2) {
      const url = parts[0] ? parts[0].trim() : '';
      const name = parts[1] ? parts[1].trim() : `Sender #${id + 1}`;
      const genre = parts[2] ? parts[2].trim() : 'Radio';
      const language = parts[3] ? parts[3].trim() : 'ALL';
      const bitrate = parts[4] ? parts[4].trim() : '128';
      const favorite = parts[5] === '1';
      const logo = parts[6] && parts[6].startsWith('http') ? parts[6].trim() : undefined;

      stations.push({
        id,
        url,
        name,
        genre,
        language,
        bitrate,
        favorite,
        logo
      });
    }
  }
  return stations;
}

function RadioLogoImage({ src, name, size = 'sm', className = '' }: { src: string | null; name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const [failed, setFailed] = useState(false);

  const initials = useMemo(() => {
    if (!name) return 'RAD';
    const clean = name.trim().replace(/^radio\s+/i, '').replace(/\s+radio$/i, '').trim();
    const words = clean.split(/\s+/);
    if (words.length >= 2 && words[0] && words[1]) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [name]);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        className={className}
        onError={() => setFailed(true)}
      />
    );
  }

  if (size === 'sm') {
    return (
      <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-zinc-950 via-amber-950/80 to-zinc-900 border border-amber-500/50 flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.3)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(245,158,11,0.4),transparent_70%)] pointer-events-none" />
        <div className="w-2 h-2 rounded-full bg-black border border-amber-400/60 flex items-center justify-center z-10">
          <Disc size={6} className="text-amber-400" />
        </div>
      </div>
    );
  }

  if (size === 'md') {
    return (
      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-zinc-950 via-amber-950/80 to-zinc-900 border border-amber-500/50 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.35)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(245,158,11,0.4),transparent_70%)] pointer-events-none" />
        <div className="w-4 h-4 rounded-full bg-black/95 border border-amber-400/60 flex flex-col items-center justify-center z-10 shadow-inner">
          <Disc size={10} className="text-amber-400 animate-[spin_8s_linear_infinite]" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-2xl bg-gradient-to-br from-amber-950/40 via-zinc-950 to-black border border-amber-500/30 text-amber-400 flex flex-col items-center justify-center p-4 text-center shadow-[0_0_35px_rgba(245,158,11,0.2)] relative overflow-hidden">
      {/* Large Spinning CD Disc Placeholder */}
      <div className="relative w-32 h-32 rounded-full bg-gradient-to-tr from-zinc-950 via-amber-900/40 to-zinc-900 border-2 border-amber-500/50 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.35)] mb-3 group">
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(245,158,11,0.4),transparent_70%)] pointer-events-none" />
        <div className="w-12 h-12 rounded-full bg-black/95 border-2 border-amber-400/60 flex flex-col items-center justify-center shadow-2xl z-10">
          <Disc size={22} className="text-amber-400 animate-[spin_8s_linear_infinite]" />
          <span className="text-[8px] font-black font-mono text-amber-300 mt-0.5">{initials}</span>
        </div>
      </div>
      <span className="text-lg font-black text-white font-mono tracking-tight max-w-[90%] truncate">{name}</span>
      <span className="text-[10px] font-bold text-amber-400/90 font-mono mt-0.5 uppercase tracking-wider">{initials} LIVE CD STREAM</span>
    </div>
  );
}

const CompanyIcon = ({
  companyName,
  title,
  type,
  size = 'md',
  activeMapTheme = 'dark',
}: {
  companyName?: string;
  title: string;
  type?: 'company' | 'city';
  size?: 'md' | 'lg';
  activeMapTheme?: string;
}) => {
  const [imgError, setImgError] = useState(false);
  const initial = (title || '?').charAt(0).toUpperCase();

  const isCompany = type === 'company';
  const sizeClasses = size === 'lg' ? 'w-10 h-10 text-lg' : 'w-8 h-8 text-xs';

  if (!companyName || imgError) {
    const bgClass =
      size === 'lg'
        ? activeMapTheme === 'dark'
          ? 'bg-blue-500/20 text-blue-300'
          : 'bg-blue-500/15 text-blue-700'
        : isCompany
        ? 'bg-amber-500/20 text-amber-300'
        : 'bg-blue-500/20 text-blue-300';

    return (
      <div className={`${sizeClasses} rounded-lg flex items-center justify-center shrink-0 font-black ${bgClass}`}>
        {initial}
      </div>
    );
  }

  return (
    <div className={`${sizeClasses} rounded-lg flex items-center justify-center shrink-0 overflow-hidden bg-black/20`}>
      <img
        src={`/company-icons/${companyName.toLowerCase()}.png`}
        alt={title}
        className="w-full h-full object-contain"
        onError={() => setImgError(true)}
      />
    </div>
  );
};

const KB_ROWS_ABC = [
  ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O', 'P', 'BACKSPACE'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'ENTER'],
  ['Y', 'X', 'C', 'V', 'B', 'N', 'M', '.', '-', 'CLEAR'],
  ['MODE', 'SPACE', 'CLOSE']
];

const KB_ROWS_123 = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'BACKSPACE'],
  ['!', '@', '#', '$', '%', '&', '*', '(', ')', 'ENTER'],
  ['+', '-', '=', '/', '?', ':', ';', ',', '.', 'CLEAR'],
  ['MODE', 'SPACE', 'CLOSE']
];

// --- FUTURISTIC SVG SPEEDOMETER GAUGE COMPONENT ---
function SpeedometerGauge({
  speed,
  speedLimit,
  cruiseControl,
  compact = false
}: {
  speed: number;
  speedLimit?: number;
  cruiseControl?: number;
  compact?: boolean;
}) {
  const displaySpeed = Math.round(speed || 0);
  const maxSpeed = 120; // 120 km/h scale for Euro Truck / American Truck
  const pct = Math.min(1, Math.max(0, displaySpeed / maxSpeed));

  const radius = 38;
  const stroke = 5;
  const circ = 2 * Math.PI * radius; // 238.76
  const arcLength = circ * 0.68; // ~245 deg arc
  const dashOffset = arcLength - pct * arcLength;
  const isOverspeed = !!(speedLimit && speedLimit > 0 && displaySpeed > speedLimit + 2);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between p-2.5 bg-[#0d1017] border border-white/[0.08] rounded-2xl shadow-lg overflow-hidden group">
      {/* Header with Traffic Sign Speed Limit Badge */}
      <div className="w-full flex items-center justify-between border-b border-white/[0.08] pb-1 text-[8.5px] font-mono font-black text-zinc-400">
        <span className="flex items-center gap-1 text-amber-400 uppercase tracking-wider">
          <Gauge size={11} className="text-amber-400" /> TACHOMETER
        </span>
        {speedLimit && speedLimit > 0 ? (
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border font-mono font-black text-[8.5px] ${
            isOverspeed
              ? 'bg-rose-500/25 text-rose-300 border-rose-500/50 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.6)]'
              : 'bg-white/10 text-zinc-200 border-white/20'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full inline-block shrink-0 ${isOverspeed ? 'bg-rose-400 animate-ping' : 'bg-amber-400'}`} />
            <span>LIMIT {Math.round(speedLimit)}</span>
          </div>
        ) : (
          <span className="text-[8px] text-zinc-500 font-mono">FREI</span>
        )}
      </div>

      {/* SVG Arc Gauge Hero */}
      <div className="relative my-auto flex items-center justify-center w-36 h-24">
        <svg className="w-full h-full transform -rotate-[122deg] overflow-visible" viewBox="0 0 100 100">
          {/* Background Track Arc */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={stroke}
            strokeDasharray={`${arcLength} ${circ}`}
            strokeLinecap="round"
          />
          {/* Active Speed Progress Arc */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={isOverspeed ? '#f43f5e' : pct > 0.75 ? '#f59e0b' : '#38bdf8'}
            strokeWidth={stroke}
            strokeDasharray={`${arcLength} ${circ}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="transition-all duration-300 drop-shadow-[0_0_10px_rgba(56,189,248,0.6)]"
          />
        </svg>

        {/* Center Speed Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pt-1">
          <span
            className={`font-black tracking-tighter font-mono tabular-nums leading-none drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] ${
              isOverspeed ? 'text-rose-400 animate-pulse' : 'text-white'
            }`}
            style={{ fontSize: compact ? '40px' : '44px' }}
          >
            {displaySpeed}
          </span>
          <span className="text-[8.5px] font-black uppercase tracking-widest text-amber-400 font-mono mt-0.5">KM / H</span>
        </div>
      </div>

      {/* Bottom Cruise Control Bar */}
      <div className="w-full flex items-center justify-between text-[8.5px] font-mono bg-black/60 px-2.5 py-1 rounded-xl border border-white/10">
        <span className="text-zinc-400">TEMPOMAT:</span>
        <span className={`font-bold font-mono ${cruiseControl && cruiseControl > 0 ? 'text-sky-400' : 'text-zinc-500'}`}>
          {cruiseControl && cruiseControl > 0 ? `${Math.round(cruiseControl)} KM/H` : 'AUS'}
        </span>
      </div>
    </div>
  );
}

export default function CarPlayPage() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBlackout, setIsBlackout] = useState<boolean>(false);
  const [telemetry, setTelemetry] = useState<Telemetry>({ connected: false } as Telemetry);
  const [media, setMedia] = useState<SmtcData | null>(null);
  const [settings, setSettings] = useState<OverlaySettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [timeString, setTimeString] = useState('12:00');

  // Calculate active theme mode (dark vs light) based on 3 themes: dark, light, or auto (low beam headlights)
  const isLowBeamOn = telemetry.connected ? (telemetry.lightsBeamLow ?? false) : true;
  const activeTheme: 'dark' | 'light' = settings.carPlayTheme === 'auto'
    ? (isLowBeamOn ? 'dark' : 'light')
    : (settings.carPlayTheme === 'light' ? 'light' : 'dark');

  const mapThemeSetting = settings.carPlayMapTheme || 'auto';
  const activeMapTheme: 'dark' | 'light' = mapThemeSetting === 'auto'
    ? (isLowBeamOn ? 'dark' : 'light')
    : (mapThemeSetting === 'light' ? 'light' : 'dark');

  // Responsive sidebar scaling
  const [sidebarScale, setSidebarScale] = useState(1);

  // Real-time ETA state
  const [liveRemainingSeconds, setLiveRemainingSeconds] = useState<number | null>(null);

  // Focus and maximized state
  const [focusZone, setFocusZone] = useState<'sidebar' | 'content'>('sidebar');
  const [sidebarIndex, setSidebarIndex] = useState(0);
  const [contentIndex, setContentIndex] = useState(0);
  const [maximizedWidget, setMaximizedWidget] = useState<'map' | 'diagnostics' | null>(null);
  const [mfdMode, setMfdMode] = useState<number>(0);

  // Music Mode Sub-Tabs ('menu' | 'windows' | 'local' | 'radio')
  const [musicSubTab, setMusicSubTab] = useState<'menu' | 'windows' | 'local' | 'radio'>('menu');

  // Local Music Player State
  const [localTracks, setLocalTracks] = useState<{ id: string; name: string; url: string; file: File }[]>([]);
  const [currentLocalIndex, setCurrentLocalIndex] = useState<number>(0);
  const [isLocalPlaying, setIsLocalPlaying] = useState<boolean>(false);
  const [localProgress, setLocalProgress] = useState<number>(0);
  const [localDuration, setLocalDuration] = useState<number>(0);
  const [localVolume, setLocalVolume] = useState<number>(0.8);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const localFileInputRef = useRef<HTMLInputElement | null>(null);
  const siiFileInputRef = useRef<HTMLInputElement | null>(null);

  // Radio Player State
  const [radioStations, setRadioStations] = useState<RadioStation[]>(DEFAULT_ETS2_STATIONS);
  const [activeRadio, setActiveRadio] = useState<RadioStation | null>(null);
  const [isRadioPlaying, setIsRadioPlaying] = useState<boolean>(false);
  const [radioVolume, setRadioVolume] = useState<number>(0.8);
  const [radioSearch, setRadioSearch] = useState<string>('');
  const [selectedRadioGenre, setSelectedRadioGenre] = useState<string>('all');
  const [radioSongTitle, setRadioSongTitle] = useState<string | null>(null);
  const [radioCoverUrl, setRadioCoverUrl] = useState<string | null>(null);
  const radioAudioRef = useRef<HTMLAudioElement | null>(null);

  // Live ICY Radio Metadata Polling Effect (Fetch live song title & album cover art currently playing on radio station)
  useEffect(() => {
    if (!isRadioPlaying || !activeRadio?.url) {
      setRadioSongTitle(null);
      setRadioCoverUrl(null);
      return;
    }

    let isMounted = true;
    const updateMetadata = async () => {
      try {
        const api = (window as any).electronAPI;
        let res: any = null;
        if (api && typeof api.invoke === 'function') {
          res = await api.invoke('fetch-radio-metadata', activeRadio.url);
        } else if ((window as any).require) {
          const { ipcRenderer } = (window as any).require('electron');
          res = await ipcRenderer.invoke('fetch-radio-metadata', activeRadio.url);
        }

        if (isMounted && res) {
          if (res.title) setRadioSongTitle(res.title);
          if (res.cover) setRadioCoverUrl(res.cover);
        }
      } catch (err) {}
    };

    updateMetadata();
    const interval = setInterval(updateMetadata, 7000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isRadioPlaying, activeRadio?.url]);

  // On-Screen Virtual Keyboard State
  const [isVirtualKbOpen, setIsVirtualKbOpen] = useState<boolean>(false);
  const [virtualKbTarget, setVirtualKbTarget] = useState<'radio' | 'city'>('radio');
  const [kbRow, setKbRow] = useState<number>(0);
  const [kbCol, setKbCol] = useState<number>(0);
  const [kbMode, setKbMode] = useState<'abc' | '123'>('abc');

  // Open virtual keyboard on target input focus/click (always opens unconditionally across all tabs)
  const openVirtualKeyboard = useCallback((target: 'radio' | 'city' = 'radio') => {
    setVirtualKbTarget(target);
    setIsVirtualKbOpen(true);
    setKbRow(0);
    setKbCol(0);
  }, []);

  const handleVirtualKeyPress = useCallback((key: string) => {
    let updateFn: React.Dispatch<React.SetStateAction<string>>;
    if (virtualKbTarget === 'radio') updateFn = setRadioSearch;
    else updateFn = setSearchQuery;

    if (key === 'BACKSPACE') {
      updateFn((prev) => prev.slice(0, -1));
    } else if (key === 'CLEAR') {
      updateFn('');
    } else if (key === 'SPACE') {
      updateFn((prev) => prev + ' ');
    } else if (key === 'ENTER' || key === 'CLOSE') {
      setIsVirtualKbOpen(false);
    } else if (key === 'MODE') {
      setKbMode((prev) => (prev === 'abc' ? '123' : 'abc'));
    } else {
      updateFn((prev) => prev + key);
    }
  }, [virtualKbTarget]);

  // Memoize filtered radio stations for high-performance rendering & zero stutter
  const filteredRadioStations = useMemo(() => {
    if (!radioSearch.trim()) return radioStations;
    const query = radioSearch.toLowerCase();
    return radioStations.filter(
      (s) => s.name.toLowerCase().includes(query) || s.genre.toLowerCase().includes(query)
    );
  }, [radioStations, radioSearch]);

  // Auto scroll music list item when focused via hotkeys/keyboard (Instant 60 FPS scrolling)
  useEffect(() => {
    if (activeTab === 'music' && focusZone === 'content') {
      const focusedElement = document.querySelector('[data-item-focused="true"]');
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      }
    }
  }, [contentIndex, activeTab, focusZone, musicSubTab]);

  // Local Audio Handlers
  const handleLocalFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    const newTracks = files.map((file, idx) => ({
      id: `${Date.now()}-${idx}`,
      name: file.name.replace(/\.[^/.]+$/, ""),
      url: URL.createObjectURL(file),
      file,
    }));
    setLocalTracks((prev) => [...prev, ...newTracks]);
  };

  const togglePlayLocal = () => {
    if (!localAudioRef.current || localTracks.length === 0) return;
    if (isLocalPlaying) {
      localAudioRef.current.pause();
      setIsLocalPlaying(false);
    } else {
      localAudioRef.current.play().catch(() => {});
      setIsLocalPlaying(true);
    }
  };

  const playLocalTrack = (index: number) => {
    if (index < 0 || index >= localTracks.length) return;
    setCurrentLocalIndex(index);
    setIsLocalPlaying(true);
    setTimeout(() => {
      if (localAudioRef.current) {
        localAudioRef.current.play().catch(() => {});
      }
    }, 50);
  };

  // Radio Audio Handlers & Playback Engine
  useEffect(() => {
    if (!radioAudioRef.current) return;
    if (isRadioPlaying && activeRadio) {
      radioAudioRef.current.src = activeRadio.url;
      radioAudioRef.current.load();
      const playPromise = radioAudioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Radio stream playback failed:', err);
          setIsRadioPlaying(false);
          showNotification({
            type: 'music',
            title: 'Radio-Stream offline',
            message: `Wiedergabe von "${activeRadio.name}" fehlgeschlagen. Stream eventuell offline.`,
            color: 'bg-[#18181b]/95 border-rose-500/40 backdrop-blur-2xl shadow-rose-950/40',
            icon: <Radio size={22} className="text-rose-400" />
          });
        });
      }
    } else {
      radioAudioRef.current.pause();
    }
  }, [activeRadio, isRadioPlaying]);

  const togglePlayRadio = (station?: RadioStation) => {
    const target = station || activeRadio || radioStations[0];
    if (!target) return;

    if (activeRadio?.id === target.id && isRadioPlaying) {
      setIsRadioPlaying(false);
    } else {
      setActiveRadio(target);
      setIsRadioPlaying(true);
    }
  };

  const autoLoadSii = useCallback(async () => {
    try {
      if (window.electronAPI?.invoke) {
        const res: any = await window.electronAPI.invoke('read-live-streams');
        if (res && res.success && res.content) {
          const parsed = parseSiiStreams(res.content);
          if (parsed.length > 0) {
            setRadioStations(parsed);
            localStorage.setItem('opc_ets2_radio_stations', JSON.stringify(parsed));
            showNotification({
              type: 'music',
              title: 'ETS2/ATS Radio Auto-Ausgelesen',
              message: `${parsed.length} Sender direkt aus live_streams.sii geladen!`,
              color: '#10b981',
              icon: <Radio size={16} />
            });
            return true;
          }
        }
      }
    } catch (e) {
      console.warn('Auto-loading live_streams.sii failed:', e);
    }
    return false;
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('opc_ets2_radio_stations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRadioStations(parsed);
        }
      } catch (e) {
        // ignore
      }
    }
    autoLoadSii();
  }, [autoLoadSii]);

  const handleSiiFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parseSiiStreams(text);
        if (parsed.length > 0) {
          setRadioStations(parsed);
          localStorage.setItem('opc_ets2_radio_stations', JSON.stringify(parsed));
          showNotification({
            type: 'music',
            title: 'ETS2 Radio geladen',
            message: `${parsed.length} Radiosender erfolgreich aus live_streams.sii importiert!`,
            color: '#f59e0b',
            icon: <Radio size={16} />
          });
        }
      }
    };
    reader.readAsText(file);
  };

  // Custom Navigation Destination state (Company & City Search)
  const [customDest, setCustomDest] = useState<{ dest: string; destCompany?: string; title: string } | null>(null);
  const [pendingDest, setPendingDest] = useState<{ dest: string; destCompany?: string; title: string } | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'companies' | 'cities'>('all');
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(0);
  const [maxMapFocus, setMaxMapFocus] = useState<'map' | 'search'>('map');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // In-Car notification banner state
  const [activeNotification, setActiveNotification] = useState<CarPlayNotification | null>(null);
  const notificationTimeoutRef = useRef<any>(null);

  const showNotification = (notif: Omit<CarPlayNotification, 'id'>) => {
    const id = Math.random().toString();
    const newNotif = { ...notif, id };
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    setActiveNotification(newNotif);
    notificationTimeoutRef.current = setTimeout(() => {
      setActiveNotification(null);
    }, 6000);
  };

  // Responsive dimensions for dynamic Map resizing
  const [mapContainerRef, setMapContainerRef] = useState<HTMLDivElement | null>(null);
  const [mapDims, setMapDims] = useState({ w: 520, h: 335 });
  const [maxMapContainerRef, setMaxMapContainerRef] = useState<HTMLDivElement | null>(null);
  const [maxMapDims, setMaxMapDims] = useState({ w: 924, h: 290 });
  const mapWidgetRef = useRef<GameMapWidgetHandle>(null);
  const maxMapWidgetRef = useRef<GameMapWidgetHandle>(null);

  useEffect(() => {
    if (!mapContainerRef) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setMapDims({ w: Math.floor(width), h: Math.floor(height) });
      }
    });
    observer.observe(mapContainerRef);
    return () => observer.disconnect();
  }, [mapContainerRef]);

  useEffect(() => {
    if (!maxMapContainerRef) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setMaxMapDims({ w: Math.floor(width), h: Math.floor(height) });
      }
    });
    observer.observe(maxMapContainerRef);
    return () => observer.disconnect();
  }, [maxMapContainerRef]);

  // Responsive sidebar scaling
  useEffect(() => {
    const updateSidebarScale = () => {
      const baseWidth = 1024;
      const currentWidth = window.innerWidth;
      const scale = Math.max(0.8, Math.min(1.15, currentWidth / baseWidth));
      setSidebarScale(scale);
    };

    updateSidebarScale();
    window.addEventListener('resize', updateSidebarScale);
    return () => window.removeEventListener('resize', updateSidebarScale);
  }, []);

  const prevLiveRemainingRef = useRef<number | null>(null);
  const liveRemainingRafRef = useRef<number | null>(null);

  // Real-time ETA calculation based on current speed and remaining distance
  useEffect(() => {
    if (!telemetry.connected || telemetry.navDistance <= 0 || telemetry.speed < 5) {
      setLiveRemainingSeconds(null);
      prevLiveRemainingRef.current = null;
      return;
    }

    const updateETA = () => {
      const speedMps = telemetry.speed / 3.6;
      if (speedMps <= 0) {
        setLiveRemainingSeconds(null);
        prevLiveRemainingRef.current = null;
        return;
      }
      const remainingSeconds = telemetry.navDistance / speedMps;
      const rounded = Math.max(0, Math.round(remainingSeconds));
      if (prevLiveRemainingRef.current !== rounded) {
        prevLiveRemainingRef.current = rounded;
        setLiveRemainingSeconds(rounded);
      }
    };

    updateETA();

    const tick = () => {
      updateETA();
      liveRemainingRafRef.current = window.setTimeout(tick, 1000);
    };
    liveRemainingRafRef.current = window.setTimeout(tick, 1000);

    return () => {
      if (liveRemainingRafRef.current) {
        clearTimeout(liveRemainingRafRef.current);
      }
    };
  }, [telemetry.connected, telemetry.navDistance, telemetry.speed]);

  const pendingTelemetry = useRef<Telemetry | null>(null);
  const handleNavRef = useRef<(dir: string) => void>(() => {});

  const updateSetting = <K extends keyof OverlaySettings>(key: K, value: OverlaySettings[K]) => {
    const updated = {
      ...settings,
      [key]: value
    };
    setSettings(updated);
    localStorage.setItem('openpipeclub_overlay_settings', JSON.stringify(updated));
    try {
      const { ipcRenderer } = (window as any).require('electron');
      if (ipcRenderer) {
        ipcRenderer.send('overlay-settings-changed', updated);
      }
    } catch (e) {}
  };

  const getContentElementsCount = () => {
    if (activeTab === 'home') return media ? 4 : 2;
    if (activeTab === 'music') return media ? 3 : 0;
    if (activeTab === 'settings') return 18;
    return 0;
  };

  // --- Settings Navigation Model ---
  type SettingsNavCol = 'left' | 'right';

  interface SettingsNavState {
    col: SettingsNavCol;
    leftRow: number; // 0..2 for theme/mapTheme/textScale
    leftCol: number; // 0..2 within the 3-button row
    rightRow: number; // 0..8 for toggles
  }

  const getInitialSettingsNav = (): SettingsNavState => ({
    col: 'left',
    leftRow: 0,
    leftCol: 0,
    rightRow: 0,
  });

  const settingsNavToContentIndex = (nav: SettingsNavState): number => {
    if (nav.col === 'left') {
      return nav.leftRow * 3 + nav.leftCol;
    }
    return 9 + nav.rightRow;
  };

  const contentIndexToSettingsNav = (idx: number): SettingsNavState => {
    if (idx < 9) {
      return { col: 'left', leftRow: Math.floor(idx / 3), leftCol: idx % 3, rightRow: 0 };
    }
    return { col: 'right', leftRow: 0, leftCol: 0, rightRow: idx - 9 };
  };

  const isSettingsFocused = (col: SettingsNavCol, row: number, colIdx = 0): boolean => {
    if (activeTab !== 'settings' || focusZone !== 'content') return false;
    const expected = contentIndexToSettingsNav(contentIndex);
    if (expected.col !== col) return false;
    if (col === 'left') return expected.leftRow === row && expected.leftCol === colIdx;
    return expected.rightRow === row;
  };

  const setSettingsNav = (nav: SettingsNavState) => {
    setContentIndex(settingsNavToContentIndex(nav));
  };

  const updateSettingsFocus = (updater: (nav: SettingsNavState) => SettingsNavState) => {
    const current = contentIndexToSettingsNav(contentIndex);
    setSettingsNav(updater(current));
  };

  const navigateSettingsUp = () => {
    updateSettingsFocus((nav) => {
      if (nav.col === 'left') {
        if (nav.leftRow > 0) return { ...nav, leftRow: nav.leftRow - 1 };
        return { ...nav, leftRow: 2 };
      }
      if (nav.rightRow > 0) return { ...nav, rightRow: nav.rightRow - 1 };
      return { ...nav, rightRow: 8 };
    });
  };

  const navigateSettingsDown = () => {
    updateSettingsFocus((nav) => {
      if (nav.col === 'left') {
        if (nav.leftRow < 2) return { ...nav, leftRow: nav.leftRow + 1 };
        return { ...nav, leftRow: 0 };
      }
      if (nav.rightRow < 8) return { ...nav, rightRow: nav.rightRow + 1 };
      return { ...nav, rightRow: 0 };
    });
  };

  const navigateSettingsLeft = () => {
    updateSettingsFocus((nav) => {
      if (nav.col === 'left') {
        if (nav.leftCol > 0) return { ...nav, leftCol: nav.leftCol - 1 };
        setFocusZone('sidebar');
        setSidebarIndex(4);
        return nav;
      }
      if (nav.rightRow < 3) {
        return { ...nav, col: 'left', leftRow: nav.rightRow, leftCol: 2 };
      }
      setFocusZone('sidebar');
      setSidebarIndex(4);
      return nav;
    });
  };

  const navigateSettingsRight = () => {
    updateSettingsFocus((nav) => {
      if (nav.col === 'left') {
        if (nav.leftCol < 2) return { ...nav, leftCol: nav.leftCol + 1 };
        if (nav.leftRow < 3) {
          return { ...nav, col: 'right', rightRow: nav.leftRow };
        }
        setFocusZone('sidebar');
        setSidebarIndex(4);
        return nav;
      }
      setFocusZone('sidebar');
      setSidebarIndex(4);
      return nav;
    });
  };

  const activateSettingsItem = () => {
    if (contentIndex < 3) updateSetting('carPlayTheme', ['dark', 'light', 'auto'][contentIndex] as any);
    else if (contentIndex < 6) updateSetting('carPlayMapTheme', ['dark', 'light', 'auto'][contentIndex - 3] as any);
    else if (contentIndex < 9) updateSetting('carPlayTextScale', ['small', 'medium', 'large'][contentIndex - 6] as any);
    else {
      const keys = [
        'carPlayNotifySpeed',
        'carPlayNotifyFuel',
        'carPlayNotifyRest',
        'carPlayNotifyDamage',
        'carPlayNotifyCargo',
        'carPlayNotifyMusic',
        'carPlayNotifyChat',
        'carPlayNotifyNews',
        'carPlayNotifyEvent'
      ];
      const key = keys[contentIndex - 9];
      updateSetting(key as any, settings[key as keyof OverlaySettings] === false);
    }
  };

  const handleNav = (dir: string) => {
    if (isVirtualKbOpen) {
      const rows = kbMode === 'abc' ? KB_ROWS_ABC : KB_ROWS_123;
      const currentRow = rows[kbRow] || [];
      
      if (dir === 'back') {
        setIsVirtualKbOpen(false);
        return;
      }
      if (dir === 'up') {
        const nextR = Math.max(0, kbRow - 1);
        setKbRow(nextR);
        setKbCol(c => Math.min(c, (rows[nextR] || []).length - 1));
        return;
      }
      if (dir === 'down') {
        const nextR = Math.min(rows.length - 1, kbRow + 1);
        setKbRow(nextR);
        setKbCol(c => Math.min(c, (rows[nextR] || []).length - 1));
        return;
      }
      if (dir === 'left') {
        setKbCol(c => Math.max(0, c - 1));
        return;
      }
      if (dir === 'right') {
        setKbCol(c => Math.min(currentRow.length - 1, c + 1));
        return;
      }
      if (dir === 'enter') {
        const key = currentRow[kbCol];
        if (key) handleVirtualKeyPress(key);
        return;
      }
      return;
    }

    if (maximizedWidget === 'map') {
      const isSearching = searchQuery.trim().length > 0;
      if (isSearching) {
        const results = searchDestinations(searchQuery).filter((r) => {
          if (searchFilter === 'companies') return r.type === 'company';
          if (searchFilter === 'cities') return r.type === 'city';
          return true;
        });

        if (dir === 'back') {
          setSearchQuery('');
          searchInputRef.current?.blur();
          return;
        }
        if (dir === 'up') {
          setSearchSelectedIndex((prev) => Math.max(0, prev - 1));
          return;
        }
        if (dir === 'down') {
          setSearchSelectedIndex((prev) => Math.min(Math.max(0, results.length - 1), prev + 1));
          return;
        }
        if (dir === 'left') {
          setSearchFilter((prev) => (prev === 'cities' ? 'companies' : prev === 'companies' ? 'all' : 'cities'));
          setSearchSelectedIndex(0);
          return;
        }
        if (dir === 'right') {
          setSearchFilter((prev) => (prev === 'all' ? 'companies' : prev === 'companies' ? 'cities' : 'all'));
          setSearchSelectedIndex(0);
          return;
        }
        if (dir === 'enter') {
          if (results.length > 0 && searchSelectedIndex >= 0 && searchSelectedIndex < results.length) {
            const item = results[searchSelectedIndex];
            const dest = {
              dest: item.cityName,
              destCompany: item.companyName,
              title: item.title,
            };
            setPendingDest(dest);
            setSearchQuery('');
            searchInputRef.current?.blur();
            setTimeout(() => {
              const map = maxMapWidgetRef.current as any;
              if (map && 'focusDestinationByGameCoords' in map) {
                const company = findCompany(dest.destCompany || '', dest.dest);
                if (company) {
                  map.focusDestinationByGameCoords(company.x, company.z);
                } else {
                  const city = findCity(dest.dest);
                  if (city) {
                    map.focusDestination(city.lng, city.lat);
                  }
                }
              }
            }, 50);
          }
          return;
        }
        return;
      }

      if (maxMapFocus === 'search') {
        if (dir === 'left' || dir === 'back') {
          setMaxMapFocus('map');
          return;
        }
        if (dir === 'enter') {
          openVirtualKeyboard('city');
          searchInputRef.current?.focus();
          return;
        }
        if (dir === 'down') {
          setMaxMapFocus('map');
          return;
        }
      } else {
        // maxMapFocus === 'map'
        if (dir === 'right') {
          setMaxMapFocus('search');
          return;
        }
        if (dir === 'enter') {
          // If a pending destination exists, start the route via Enter
          if (pendingDest && !customDest) {
            const dest = pendingDest;
            setCustomDest(dest);
            setPendingDest(null);
            showNotification({
              title: 'Route gestartet',
              message: `Navigation zu ${dest.title} gestartet!`,
              icon: <Navigation size={18} />,
              color: '#3b82f6',
            });
            setTimeout(() => {
              mapWidgetRef.current?.recenter();
              maxMapWidgetRef.current?.recenter();
            }, 100);
            return;
          }
          setMaxMapFocus('search');
          openVirtualKeyboard('city');
          searchInputRef.current?.focus();
          return;
        }
        if (dir === 'up') { maxMapWidgetRef.current?.zoomIn(); return; }
        if (dir === 'down') {
          // If a pending destination exists, start the route via Down
          if (pendingDest && !customDest) {
            const dest = pendingDest;
            setCustomDest(dest);
            setPendingDest(null);
            showNotification({
              title: 'Route gestartet',
              message: `Navigation zu ${dest.title} gestartet!`,
              icon: <Navigation size={18} />,
              color: '#3b82f6',
            });
            setTimeout(() => {
              mapWidgetRef.current?.recenter();
              maxMapWidgetRef.current?.recenter();
            }, 100);
            return;
          }
          maxMapWidgetRef.current?.zoomOut();
          return;
        }
        if (dir === 'back') { setMaximizedWidget(null); setMaxMapFocus('map'); return; }
      }
      return;
    }

    if (maximizedWidget === 'diagnostics') {
      if (dir === 'back') { setMaximizedWidget(null); return; }
      if (dir === 'left' || dir === 'up') { setMfdMode(prev => (prev - 1 + 5) % 5); return; }
      if (dir === 'right' || dir === 'down' || dir === 'enter') { setMfdMode(prev => (prev + 1) % 5); return; }
      return;
    }

    if (dir === 'back') {
      if (focusZone === 'content') {
        setFocusZone('sidebar');
      } else {
        setActiveTab('home');
        setSidebarIndex(0);
      }
      return;
    }

    if (focusZone === 'sidebar') {
      if (dir === 'up') setSidebarIndex(prev => (prev - 1 + 5) % 5);
      else if (dir === 'down') setSidebarIndex(prev => (prev + 1) % 5);
      else if (dir === 'right') {
        const count = getContentElementsCount();
        if (count > 0) {
          setFocusZone('content');
          setContentIndex(0);
        }
      } else if (dir === 'enter') {
        const tabList: Tab[] = ['home', 'music', 'job', 'truck', 'settings'];
        setActiveTab(tabList[sidebarIndex]);
      }
      return;
    }

    const count = getContentElementsCount();
    if (activeTab === 'home') {
      if (contentIndex === 0) {
        if (dir === 'up') mapWidgetRef.current?.zoomIn();
        else if (dir === 'down') mapWidgetRef.current?.zoomOut();
        else if (dir === 'left') { setFocusZone('sidebar'); setSidebarIndex(0); }
        else if (dir === 'right') { setFocusZone('content'); setContentIndex(1); }
        else if (dir === 'enter') setMaximizedWidget('map');
      } else if (contentIndex === 1) {
        if (dir === 'left') setContentIndex(0);
        else if (dir === 'down') setContentIndex(2);
        else if (dir === 'enter') { setActiveTab('music'); setSidebarIndex(1); }
      } else if (contentIndex === 2) {
        if (dir === 'left') setContentIndex(0);
        else if (dir === 'up') setContentIndex(1);
        else if (dir === 'enter') setMaximizedWidget('diagnostics');
      }
    } else if (activeTab === 'music') {
      if (dir === 'back') {
        if (musicSubTab !== 'menu') {
          setMusicSubTab('menu');
          setContentIndex(0);
        } else {
          setFocusZone('sidebar');
          setSidebarIndex(1);
        }
        return;
      }

      if (musicSubTab === 'menu') {
        if (dir === 'left') {
          if (contentIndex > 0) setContentIndex(prev => prev - 1);
          else { setFocusZone('sidebar'); setSidebarIndex(1); }
        } else if (dir === 'right') {
          if (contentIndex < 2) setContentIndex(prev => prev + 1);
        } else if (dir === 'up') {
          setContentIndex(0);
        } else if (dir === 'down') {
          setContentIndex(2);
        } else if (dir === 'enter') {
          if (contentIndex === 0) setMusicSubTab('windows');
          else if (contentIndex === 1) setMusicSubTab('local');
          else if (contentIndex === 2) setMusicSubTab('radio');
          setContentIndex(0);
        }
      } else {
        // Sub-player navigation ('windows', 'local', 'radio')
        if (musicSubTab === 'radio') {
          const totalRadioItems = 4 + filteredRadioStations.length;

          if (dir === 'left') {
            if (contentIndex === 3) setContentIndex(2);
            else if (contentIndex === 2) setContentIndex(1);
            else if (contentIndex === 1) setContentIndex(0);
            else if (contentIndex === 0) {
              setFocusZone('sidebar');
              setSidebarIndex(1);
            } else if (contentIndex >= 4) {
              if (contentIndex % 2 === 1) {
                setContentIndex(prev => prev - 1);
              } else {
                setFocusZone('sidebar');
                setSidebarIndex(1);
              }
            }
          } else if (dir === 'right') {
            if (contentIndex === 0) setContentIndex(1);
            else if (contentIndex === 1) setContentIndex(2);
            else if (contentIndex === 2) setContentIndex(3);
            else if (contentIndex === 3) setContentIndex(filteredRadioStations.length > 0 ? 4 : 3);
            else if (contentIndex >= 4) {
              if (contentIndex % 2 === 0 && contentIndex + 1 < totalRadioItems) {
                setContentIndex(prev => prev + 1);
              }
            }
          } else if (dir === 'down') {
            if (contentIndex === 0) setContentIndex(1);
            else if (contentIndex === 1) setContentIndex(2);
            else if (contentIndex === 2 || contentIndex === 3) setContentIndex(filteredRadioStations.length > 0 ? 4 : contentIndex);
            else {
              const nextRow = contentIndex + 2;
              if (nextRow < totalRadioItems) {
                setContentIndex(nextRow);
              } else if (contentIndex % 2 === 0 && contentIndex + 1 < totalRadioItems) {
                setContentIndex(contentIndex + 1);
              }
            }
          } else if (dir === 'up') {
            if (contentIndex >= 6) {
              setContentIndex(prev => prev - 2);
            } else if (contentIndex === 4 || contentIndex === 5) {
              setContentIndex(1);
            } else if (contentIndex === 2 || contentIndex === 3) {
              setContentIndex(1);
            } else if (contentIndex === 1) {
              setContentIndex(0);
            }
          } else if (dir === 'enter') {
            if (contentIndex === 0) {
              setMusicSubTab('menu');
              setContentIndex(0);
            } else if (contentIndex === 1) {
              openVirtualKeyboard('radio');
            } else if (contentIndex === 2) {
              autoLoadSii();
            } else if (contentIndex === 3) {
              siiFileInputRef.current?.click();
            } else if (contentIndex >= 4) {
              const targetStation = filteredRadioStations[contentIndex - 4];
              if (targetStation) togglePlayRadio(targetStation);
            }
          }
        } else if (musicSubTab === 'local') {
          const totalLocalItems = 2 + localTracks.length;

          if (dir === 'left') {
            setFocusZone('sidebar');
            setSidebarIndex(1);
          } else if (dir === 'right') {
            if (contentIndex < totalLocalItems - 1) setContentIndex(prev => prev + 1);
          } else if (dir === 'down') {
            if (contentIndex < totalLocalItems - 1) setContentIndex(prev => prev + 1);
          } else if (dir === 'up') {
            if (contentIndex > 0) setContentIndex(prev => prev - 1);
          } else if (dir === 'enter') {
            if (contentIndex === 0) {
              setMusicSubTab('menu');
              setContentIndex(0);
            } else if (contentIndex === 1) {
              localFileInputRef.current?.click();
            } else if (contentIndex >= 2) {
              playLocalTrack(contentIndex - 2);
            }
          }
        } else if (musicSubTab === 'windows') {
          if (dir === 'left') {
            if (contentIndex === 0) { setFocusZone('sidebar'); setSidebarIndex(1); }
            else setContentIndex(prev => prev - 1);
          } else if (dir === 'right') {
            if (contentIndex < 3) setContentIndex(prev => prev + 1);
          } else if (dir === 'up') {
            setContentIndex(0);
          } else if (dir === 'down') {
            if (contentIndex === 0) setContentIndex(2);
          } else if (dir === 'enter') {
            if (contentIndex === 0) {
              setMusicSubTab('menu');
              setContentIndex(0);
            } else if (contentIndex === 1) {
              if (isLocalPlaying) playLocalTrack((currentLocalIndex - 1 + localTracks.length) % localTracks.length);
              else sendMediaAction('prev');
            } else if (contentIndex === 2) {
              if (isLocalPlaying) togglePlayLocal();
              else if (isRadioPlaying) togglePlayRadio();
              else sendMediaAction('play-pause');
            } else if (contentIndex === 3) {
              if (isLocalPlaying) playLocalTrack((currentLocalIndex + 1) % localTracks.length);
              else sendMediaAction('next');
            }
          }
        }
      }
    } else if (activeTab === 'settings') {
      if (dir === 'up') navigateSettingsUp();
      else if (dir === 'down') navigateSettingsDown();
      else if (dir === 'left') navigateSettingsLeft();
      else if (dir === 'right') navigateSettingsRight();
      else if (dir === 'enter') activateSettingsItem();
    }
  };

  useEffect(() => {
    handleNavRef.current = handleNav;
  });

  // Global Keyboard / Hotkey Event Listener for full hardware & keyboard control
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      if (e.key === 'Escape') {
        if (isSearchOpen) {
          setIsSearchOpen(false);
          e.preventDefault();
          return;
        }
        if (maximizedWidget) {
          setMaximizedWidget(null);
          e.preventDefault();
          return;
        }
        handleNavRef.current('back');
        return;
      }

      // Quick hotkey (K) to toggle On-Screen Virtual Keyboard from ANY tab
      if (!isInput && (e.key === 'k' || e.key === 'K')) {
        setIsVirtualKbOpen((prev) => !prev);
        e.preventDefault();
        return;
      }

      // Quick hotkey (S or F) to open Company Search
      if (!isInput && (e.key === 's' || e.key === 'S' || e.key === 'f' || e.key === 'F')) {
        setIsSearchOpen(true);
        e.preventDefault();
        return;
      }

      if (isInput) {
        if (e.key === 'ArrowDown') {
          handleNavRef.current('down');
          e.preventDefault();
        } else if (e.key === 'ArrowUp') {
          handleNavRef.current('up');
          e.preventDefault();
        } else if (e.key === 'Enter') {
          handleNavRef.current('enter');
          e.preventDefault();
        }
        return;
      }

      const isArrowUp = e.key === 'ArrowUp';
      const isArrowDown = e.key === 'ArrowDown';
      const isArrowLeft = e.key === 'ArrowLeft';
      const isArrowRight = e.key === 'ArrowRight';

      if (isArrowUp) { handleNavRef.current('up'); e.preventDefault(); }
      else if (isArrowDown) { handleNavRef.current('down'); e.preventDefault(); }
      else if (isArrowLeft) { handleNavRef.current('left'); e.preventDefault(); }
      else if (isArrowRight) { handleNavRef.current('right'); e.preventDefault(); }
      else if (e.key === 'Enter' || e.key === ' ') { handleNavRef.current('enter'); e.preventDefault(); }
      else if (e.key === 'Backspace' || e.key === 'Escape') { handleNavRef.current('back'); e.preventDefault(); }
    };


    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, maximizedWidget]);

  // Digital clock update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Auto scroll settings container to focused element
  useEffect(() => {
    if (activeTab === 'settings' && focusZone === 'content') {
      const nav = contentIndexToSettingsNav(contentIndex);
      if (nav.col === 'right') {
        const container = document.querySelector('.scrollbar-thin');
        const focusedElement = container?.children[nav.rightRow] as HTMLElement;
        if (container && focusedElement) {
          const cTop = container.scrollTop;
          const cBot = cTop + container.clientHeight;
          const eTop = focusedElement.offsetTop;
          const eBot = eTop + focusedElement.clientHeight;

          if (eTop < cTop) {
            container.scrollTop = eTop;
          } else if (eBot > cBot) {
            container.scrollTop = eBot - container.clientHeight;
          }
        }
      }
    }
  }, [contentIndex, activeTab, focusZone]);

  // Sync state on mount and register listeners
  useEffect(() => {
    document.title = 'OPC CarPlay';
    document.documentElement.classList.add('is-overlay');
    document.documentElement.classList.remove('light');
    document.body?.classList.add('is-overlay-body');

    const elements = [document.body, document.documentElement, document.getElementById('root')];
    elements.forEach(el => {
      if (el) {
        el.style.setProperty('background', 'transparent', 'important');
        el.style.setProperty('background-color', 'transparent', 'important');
        el.style.setProperty('background-image', 'none', 'important');
      }
    });

    let ipcRenderer: any = null;
    try {
      if ((window as any).require) {
        ipcRenderer = (window as any).require('electron').ipcRenderer;
      }
    } catch (e) {
      console.warn('IPC renderer is not available.');
    }

    if (!ipcRenderer) return;

    // Get initial state
    ipcRenderer.invoke('overlay-get-state').then((state: any) => {
      if (state) {
        if (state.settings) setSettings(state.settings);
        if (state.telemetry && state.telemetry.connected) setTelemetry(state.telemetry);
      }
    }).catch(() => {});

    ipcRenderer.invoke('get-smtc-media').then((d: SmtcData | null) => {
      if (d?.title) setMedia(d);
    }).catch(() => {});

    // Listen to updates
    const telemetryListener = (_: any, data: Telemetry) => {
      pendingTelemetry.current = data;
    };
    ipcRenderer.on('telemetry-update', telemetryListener);

    const settingsListener = (_: any, updated: any) => {
      if (updated) setSettings(updated);
    };
    ipcRenderer.on('overlay-settings-updated', settingsListener);

    const smtcListener = (_: any, mediaData: SmtcData) => {
      setMedia(mediaData?.title ? mediaData : null);
    };
    ipcRenderer.on('smtc-update', smtcListener);

    const handleToggleBlackout = () => {
      setIsBlackout(prev => {
        const nextState = !prev;
        if (!nextState) {
          setIsLoading(true);
          setTimeout(() => {
            setIsLoading(false);
          }, 1000);
        }
        return nextState;
      });
    };

    // CarPlay hotkeys action listener
    const actionListener = (_: any, action: string) => {
      if (action === 'home') {
        setActiveTab('home');
        setFocusZone('sidebar');
        setSidebarIndex(0);
      } else if (action === 'next') {
        setActiveTab(prev => {
          const idx = TABS.indexOf(prev);
          const nextTab = TABS[(idx + 1) % TABS.length];
          const tabList: Tab[] = ['home', 'music', 'job', 'truck', 'settings'];
          setSidebarIndex(tabList.indexOf(nextTab));
          return nextTab;
        });
      } else if (action === 'prev') {
        setActiveTab(prev => {
          const idx = TABS.indexOf(prev);
          const prevTab = TABS[(idx - 1 + TABS.length) % TABS.length];
          const tabList: Tab[] = ['home', 'music', 'job', 'truck', 'settings'];
          setSidebarIndex(tabList.indexOf(prevTab));
          return prevTab;
        });
      } else if (action === 'toggle-blackout') {
        handleToggleBlackout();
      } else if (['up', 'down', 'left', 'right', 'enter', 'back'].includes(action)) {
        handleNavRef.current(action);
      }
    };
    ipcRenderer.on('carplay-action', actionListener);

    const blackoutListener = () => {
      handleToggleBlackout();
    };
    ipcRenderer.on('carplay-toggle-blackout', blackoutListener);

    const jobNotificationListener = (_: any, event: any) => {
      if (!event) return;
      
      let type: CarPlayNotification['type'] = 'cargo';
      let title = event.title || 'Meldung';
      let message = event.content || '';
      let color = 'bg-[#18181b]/95 border-zinc-700/40 backdrop-blur-xl shadow-black/50';
      let icon = <Info size={24} className="text-sky-400" />;
      let shouldShow = true;

      if (event.type === 'chat' || event.type === 'chat_group') {
        type = 'chat';
        title = event.title || 'Neue Nachricht';
        message = event.content || '';
        color = 'bg-[#18181b]/95 border-sky-500/40 backdrop-blur-2xl shadow-sky-950/40';
        icon = <MessageSquare size={22} className="text-sky-400" />;
        shouldShow = settings.carPlayNotifyChat !== false;
      } else if (event.type === 'system') {
        type = 'system';
        title = event.title || 'System-Info';
        message = event.content || '';
        color = 'bg-[#18181b]/95 border-amber-500/40 backdrop-blur-2xl shadow-amber-950/40';
        icon = <Info size={22} className="text-amber-400" />;
      } else if (event.type === 'news') {
        type = 'news';
        title = event.title || 'News-Update';
        message = event.content || '';
        color = 'bg-[#18181b]/95 border-teal-500/40 backdrop-blur-2xl shadow-teal-950/40';
        icon = <Newspaper size={22} className="text-teal-400" />;
        shouldShow = settings.carPlayNotifyNews !== false;
      } else if (event.type === 'event') {
        type = 'event';
        title = event.title || 'Event-Ankündigung';
        message = event.content || '';
        color = 'bg-[#18181b]/95 border-purple-500/40 backdrop-blur-2xl shadow-purple-950/40';
        icon = <Calendar size={22} className="text-purple-400" />;
        shouldShow = settings.carPlayNotifyEvent !== false;
      } else if (event.type === 'start' || event.type === 'delivered' || event.type === 'cancelled' || event.type === 'resumed') {
        return; 
      }

      if (shouldShow) {
        showNotification({
          type,
          title,
          message,
          icon,
          color
        });
      }
    };
    ipcRenderer.on('job-notification', jobNotificationListener);

    return () => {
      ipcRenderer.removeListener('telemetry-update', telemetryListener);
      ipcRenderer.removeListener('overlay-settings-updated', settingsListener);
      ipcRenderer.removeListener('smtc-update', smtcListener);
      ipcRenderer.removeListener('carplay-action', actionListener);
      ipcRenderer.removeListener('carplay-toggle-blackout', blackoutListener);
      ipcRenderer.removeListener('job-notification', jobNotificationListener);
    };
  }, []);

  // Auto-hide loading screen after initial startup phase
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Throttled telemetry loop (Optimized for maximum CPU/GPU efficiency)
  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    let timerId: any = null;
    const tick = () => {
      if (pendingTelemetry.current) {
        if (pendingTelemetry.current.connected) {
          setTelemetry(pendingTelemetry.current);
        } else {
          setTelemetry(prev => ({ ...prev, connected: false }));
        }
        pendingTelemetry.current = null;
      }

      const currentTab = activeTabRef.current;
      const intervalMs = (currentTab === 'home' || currentTab === 'truck') ? 100 : 1000;
      timerId = setTimeout(tick, intervalMs);
    };

    tick();
    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  // Telemetry notifications trigger effect
  const wasSpeeding = useRef(false);
  const hadFuelWarning = useRef(false);
  const hadRestWarning = useRef(false);
  const prevSongTitle = useRef('');
  const prevWear = useRef(0);
  const prevCargo = useRef('');
  const isFirstLoad = useRef(true);

  // Initialize values
  const data = telemetry;
  const speed = Math.max(0, data.speed);
  const gear = data.gear;
  const rpm = Math.max(0, data.rpm);

  useEffect(() => {
    if (isFirstLoad.current) {
      prevWear.current = data.wearTruck;
      prevCargo.current = data.cargo || '';
      prevSongTitle.current = media?.title || '';
      isFirstLoad.current = false;
      return;
    }

    // 1. Overspeed Warnung
    // 1. Overspeed Warnung
    if (data.speedLimit > 0 && speed > data.speedLimit + 3) {
      if (!wasSpeeding.current) {
        if (settings.carPlayNotifySpeed !== false) {
          showNotification({
            type: 'speed',
            title: 'Geschwindigkeit überschritten!',
            message: `Du fährst ${Math.round(speed)} km/h bei erlaubten ${data.speedLimit} km/h.`,
            icon: <AlertTriangle size={22} className="text-rose-400" />,
            color: 'bg-[#18181b]/95 border-rose-500/40 backdrop-blur-2xl shadow-rose-950/40'
          });
        }
        wasSpeeding.current = true;
      }
    } else if (data.speedLimit > 0 && speed <= data.speedLimit) {
      wasSpeeding.current = false;
    }

    // 2. Fuel Warning
    if (data.fuelWarning) {
      if (!hadFuelWarning.current) {
        if (settings.carPlayNotifyFuel !== false) {
          showNotification({
            type: 'fuel',
            title: 'Kraftstoff-Reserve!',
            message: `Nächste Tankstelle ansteuern. Reichweite: ca. ${Math.round(data.fuelRange)} km.`,
            icon: <Fuel size={22} className="text-amber-400" />,
            color: 'bg-[#18181b]/95 border-amber-500/40 backdrop-blur-2xl shadow-amber-950/40'
          });
        }
        hadFuelWarning.current = true;
      }
    } else {
      hadFuelWarning.current = false;
    }

    // 3. Pause
    if (data.nextRest && data.nextRest > 0 && data.nextRest <= 30) {
      if (!hadRestWarning.current) {
        if (settings.carPlayNotifyRest !== false) {
          showNotification({
            type: 'rest',
            title: 'Lenkzeit-Pause erforderlich!',
            message: `Bitte in den nächsten ${Math.round(data.nextRest)} Minuten pausieren.`,
            icon: <AlertTriangle size={22} className="text-yellow-400" />,
            color: 'bg-[#18181b]/95 border-yellow-500/40 backdrop-blur-2xl shadow-yellow-950/40'
          });
        }
        hadRestWarning.current = true;
      }
    } else if (data.nextRest && data.nextRest > 40) {
      hadRestWarning.current = false;
    }

    // 4. Wear / Schaden (increase by more than 0.5%)
    if (data.wearTruck - prevWear.current >= 0.5) {
      if (settings.carPlayNotifyDamage !== false) {
        showNotification({
          type: 'damage',
          title: 'Fahrzeugschaden registriert!',
          message: `LKW-Verschleiß hat sich auf ${data.wearTruck.toFixed(1)}% erhöht.`,
          icon: <Truck size={22} className="text-rose-400" />,
          color: 'bg-[#18181b]/95 border-rose-500/40 backdrop-blur-2xl shadow-rose-950/40'
        });
      }
      prevWear.current = data.wearTruck;
    } else if (data.wearTruck < prevWear.current) {
      // Repaired
      prevWear.current = data.wearTruck;
    }

    // 5. Cargo / Auftrag
    if (data.cargo && data.cargo.toLowerCase() !== 'none' && data.cargo !== prevCargo.current) {
      if (settings.carPlayNotifyCargo !== false) {
        showNotification({
          type: 'cargo',
          title: 'Neuer Auftrag gestartet!',
          message: `Ladung: ${data.cargo} (${data.cargoMass.toFixed(1)}t) nach ${data.dest || 'Unbekannt'}.`,
          icon: <Briefcase size={22} className="text-emerald-400" />,
          color: 'bg-[#18181b]/95 border-emerald-500/40 backdrop-blur-2xl shadow-emerald-950/40'
        });
      }
      prevCargo.current = data.cargo;
    } else if (!data.cargo || data.cargo.toLowerCase() === 'none') {
      prevCargo.current = '';
    }
  }, [speed, data.speedLimit, data.fuelWarning, data.nextRest, data.wearTruck, data.cargo, settings.carPlayNotifySpeed, settings.carPlayNotifyFuel, settings.carPlayNotifyRest, settings.carPlayNotifyDamage, settings.carPlayNotifyCargo]);

  // 6. Media Track change
  useEffect(() => {
    if (media && media.title && media.title !== prevSongTitle.current) {
      if (settings.carPlayNotifyMusic !== false) {
        showNotification({
          type: 'music',
          title: media.title,
          message: media.artist,
          icon: <Music size={22} className="text-amber-400" />,
          color: 'bg-[#18181b]/95 border-zinc-700/50 backdrop-blur-2xl shadow-black/60'
        });
      }
      prevSongTitle.current = media.title;
    } else if (!media) {
      prevSongTitle.current = '';
    }
  }, [media?.title, settings.carPlayNotifyMusic]);

  const sendMediaAction = (action: 'play-pause' | 'next' | 'prev') => {
    try {
      const { ipcRenderer } = (window as any).require('electron');
      ipcRenderer.send('carplay-media-control', action);
    } catch (e) {}
  };

  // Format functions
  const formatDistance = (meters: number) => {
    if (!meters || isNaN(meters)) return '0 km';
    return `${Math.round(meters / 1000)} km`;
  };

  const formatRemainingTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0 min';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const formatETA = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '--:--';
    const etaDate = new Date(Date.now() + seconds * 1000);
    return etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
  };

  const getRemainingSeconds = () => {
    if (liveRemainingSeconds !== null && liveRemainingSeconds > 0) {
      return liveRemainingSeconds;
    }
    if (data.navTime && data.navTime > 0) {
      const isATS = data.gameType === 2;
      const timeScale = isATS ? 20 : 19;
      return data.navTime / timeScale;
    }
    return null;
  };

  const formatMediaTime = (val: any, referenceDuration?: number) => {
    const num = Number(val) || 0;
    if (num <= 0) return '0:00';

    const refD = Number(referenceDuration) || 0;
    let sec = num;

    if (refD > 10000000 || num > 10000000) {
      sec /= 10000000;
    } else if (refD > 1000 || num > 10000) {
      sec /= 1000;
    }

    const totalSeconds = Math.floor(sec);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getProgressPercent = (p?: any, d?: any) => {
    const numP = Number(p) || 0;
    const numD = Number(d) || 0;
    if (numD <= 0) return 0;

    let pSec = numP;
    let dSec = numD;

    if (numD > 10000000) {
      pSec /= 10000000;
      dSec /= 10000000;
    } else if (numD > 1000) {
      pSec /= 1000;
      dSec /= 1000;
    } else if (numP > 10000) {
      pSec /= 1000;
    }

    if (dSec <= 0) return 0;
    const pct = (pSec / dSec) * 100;
    return Math.min(100, Math.max(0, isNaN(pct) ? 0 : pct));
  };

  // Unified Active Cover Art (Handles SMTC Windows Media/Spotify base64, ETS2 Live Radio covers & station logos)
  const albumArtSrc = useMemo(() => {
    if (isLocalPlaying) return null;
    if (isRadioPlaying && activeRadio) return radioCoverUrl || getRadioLogoUrl(activeRadio);
    if (!media?.thumb) return null;
    if (media.thumb.startsWith('data:') || media.thumb.startsWith('http')) return media.thumb;
    const mime = media.thumb.startsWith('iVBOR') ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${media.thumb}`;
  }, [isLocalPlaying, isRadioPlaying, activeRadio, radioCoverUrl, media?.thumb]);

  // Theme styling logic
  const getThemeClasses = () => {
    const th = settings.carPlayTheme || 'dark';
    switch (th) {
      case 'light':
        return {
          wrapper: 'bg-[#f4f5f7] text-[#1e293b] border-slate-300 shadow-inner',
          sidebar: 'bg-[#e4e7eb] border-r border-slate-350 text-[#334155]',
          activeTab: 'bg-amber-500/20 text-amber-600 shadow-md border border-amber-500/30 shadow-amber-500/5',
          inactiveTab: 'text-slate-500 hover:bg-slate-300/40 hover:text-[#1e293b]',
          card: 'bg-white border border-slate-250 shadow-sm rounded-2xl text-[#1e293b]',
          badge: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
          mutedText: 'text-slate-500 font-medium',
          accentText: 'text-amber-600 font-bold',
          progressBg: 'bg-black/10 border border-black/5',
          progressFill: 'bg-amber-500 shadow-sm',
          glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)] border-amber-500/30'
        };
      case 'blue':
        return {
          wrapper: 'bg-[#0b132b] text-slate-100 border-[#1c2541]',
          sidebar: 'bg-[#1c2541]/90 border-r border-slate-800/40 text-slate-300 border-r-sky-500/20',
          activeTab: 'bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-lg shadow-sky-500/10',
          inactiveTab: 'text-slate-400 hover:bg-[#1c2541]/40 hover:text-white',
          card: 'bg-[#1c2541]/50 border border-sky-500/10 rounded-2xl text-slate-100 backdrop-blur-md',
          badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
          mutedText: 'text-slate-400',
          accentText: 'text-sky-400',
          progressBg: 'bg-[#0b132b]/80 border border-white/5',
          progressFill: 'bg-sky-500 shadow-md shadow-sky-500/20',
          glow: 'shadow-[0_0_15px_rgba(14,165,233,0.2)] border-sky-500/20'
        };
      case 'titan':
        return {
          wrapper: 'bg-gradient-to-br from-[#1e222b] to-[#111318] text-[#eceff1] border-[#374151] relative overflow-hidden',
          sidebar: 'bg-[#151921] border-r border-[#374151] text-[#9ca3af]',
          activeTab: 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.25)]',
          inactiveTab: 'text-[#9ca3af] hover:bg-[#202530] hover:text-white',
          card: 'bg-[#1a1e26]/90 border border-[#374151] rounded-2xl text-[#eceff1] shadow-lg',
          badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          mutedText: 'text-[#9ca3af]',
          accentText: 'text-amber-400',
          progressBg: 'bg-black/40 border border-white/5',
          progressFill: 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-md shadow-amber-500/20',
          glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)] border-amber-500/20'
        };
      case 'dark':
      default:
        return {
          wrapper: 'bg-black text-slate-100 border-zinc-900',
          sidebar: 'bg-black border-r border-zinc-800/80 text-slate-400',
          activeTab: 'bg-amber-500/15 text-amber-400 border border-amber-500/40 shadow-md shadow-amber-500/10',
          inactiveTab: 'text-slate-400 hover:bg-zinc-800/50 hover:text-white',
          card: 'bg-[#18181b] border border-zinc-700/60 rounded-2xl text-slate-100 shadow-lg',
          badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          mutedText: 'text-zinc-400',
          accentText: 'text-amber-400',
          progressBg: 'bg-black/50 border border-zinc-700/40',
          progressFill: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-yellow-300 shadow-[0_0_12px_rgba(250,204,21,0.8)]',
          glow: 'shadow-[0_0_15px_rgba(245,158,11,0.2)] border-amber-500/30'
        };
    }
  };

  const c = getThemeClasses();

  const textScaleMap: Record<string, number> = {
    small: 0.8,
    medium: 1.0,
    large: 1.5,
  };
  const cpScale = textScaleMap[settings.carPlayTextScale || 'medium'] || 1.0;

  return (
    <>
      {/* Persistent Audio Engines for Local & Radio streams (stay mounted across all tabs) */}
      <audio
        ref={localAudioRef}
        src={localTracks[currentLocalIndex]?.url}
        onTimeUpdate={() => {
          if (localAudioRef.current) {
            setLocalProgress(localAudioRef.current.currentTime);
            setLocalDuration(localAudioRef.current.duration || 0);
          }
        }}
        onEnded={() => {
          if (localTracks.length > 0) {
            const next = (currentLocalIndex + 1) % localTracks.length;
            playLocalTrack(next);
          }
        }}
      />
      <audio
        ref={radioAudioRef}
        src={activeRadio?.url}
        onError={() => {
          setIsRadioPlaying(false);
          showNotification({
            type: 'music',
            title: 'Radio-Stream Fehler',
            message: `Wiedergabe von ${activeRadio?.name || 'Sender'} fehlgeschlagen.`,
            color: '#ef4444',
            icon: <Radio size={16} />
          });
        }}
      />
      <style>{`
        .carplay-root {
          --cp-scale: ${cpScale};
        }
        .carplay-root .text-\[7px\] { font-size: calc(7px * var(--cp-scale)) !important; }
        .carplay-root .text-\[7\.5px\] { font-size: calc(7.5px * var(--cp-scale)) !important; }
        .carplay-root .text-\[8px\] { font-size: calc(8px * var(--cp-scale)) !important; }
        .carplay-root .text-\[8\.5px\] { font-size: calc(8.5px * var(--cp-scale)) !important; }
        .carplay-root .text-\[9px\] { font-size: calc(9px * var(--cp-scale)) !important; }
        .carplay-root .text-\[10px\] { font-size: calc(10px * var(--cp-scale)) !important; }
        .carplay-root .text-\[11px\] { font-size: calc(11px * var(--cp-scale)) !important; }
        .carplay-root .text-\[12px\] { font-size: calc(12px * var(--cp-scale)) !important; }
        .carplay-root .text-\[13px\] { font-size: calc(13px * var(--cp-scale)) !important; }
        .carplay-root .text-\[14px\] { font-size: calc(14px * var(--cp-scale)) !important; }
        .carplay-root .text-\[15px\] { font-size: calc(15px * var(--cp-scale)) !important; }
        .carplay-root .text-\[16px\] { font-size: calc(16px * var(--cp-scale)) !important; }
        .carplay-root .text-\[18px\] { font-size: calc(18px * var(--cp-scale)) !important; }
        .carplay-root .text-\[20px\] { font-size: calc(20px * var(--cp-scale)) !important; }
        .carplay-root .text-\[22px\] { font-size: calc(22px * var(--cp-scale)) !important; }
        .carplay-root .text-\[24px\] { font-size: calc(24px * var(--cp-scale)) !important; }
        .carplay-root .text-\[28px\] { font-size: calc(28px * var(--cp-scale)) !important; }
        .carplay-root .text-\[32px\] { font-size: calc(32px * var(--cp-scale)) !important; }
        .carplay-root .text-\[42px\] { font-size: calc(42px * var(--cp-scale)) !important; }
        .carplay-root .text-\[72px\] { font-size: calc(72px * var(--cp-scale)) !important; }
        .carplay-root .text-\[80px\] { font-size: calc(80px * var(--cp-scale)) !important; }
        .carplay-root .text-xs { font-size: calc(12px * var(--cp-scale)) !important; }
        .carplay-root .text-sm { font-size: calc(14px * var(--cp-scale)) !important; }
        .carplay-root .text-base { font-size: calc(16px * var(--cp-scale)) !important; }
        .carplay-root .text-lg { font-size: calc(18px * var(--cp-scale)) !important; }
        .carplay-root .text-xl { font-size: calc(20px * var(--cp-scale)) !important; }
        .carplay-root .text-2xl { font-size: calc(24px * var(--cp-scale)) !important; }
        .carplay-root .text-3xl { font-size: calc(30px * var(--cp-scale)) !important; }
        .carplay-root .text-4xl { font-size: calc(36px * var(--cp-scale)) !important; }
        .carplay-root .text-5xl { font-size: calc(48px * var(--cp-scale)) !important; }
        .carplay-root .text-6xl { font-size: calc(60px * var(--cp-scale)) !important; }
      `}</style>
      <div 
        className={`w-screen h-screen flex select-none font-outfit rounded-3xl overflow-hidden border-2 shadow-2xl relative ${c.wrapper} carplay-root`}
      >
      {/* CarPlay Alert Notification Toast Banner (Unified Apple CarPlay Dark Glass Pill Banner) */}
      <AnimatePresence>
        {activeNotification && (() => {
          const badgeMap: Record<string, { label: string; accent: string; bgIcon: string; borderGlow: string }> = {
            music: { label: 'MEDIENWIEDERGABE', accent: 'text-amber-400', bgIcon: 'bg-amber-500/20 text-amber-400 border-amber-500/40', borderGlow: 'border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.25)]' },
            speed: { label: 'GESCHWINDIGKEITS-WARNUNG', accent: 'text-rose-400', bgIcon: 'bg-rose-500/20 text-rose-400 border-rose-500/40', borderGlow: 'border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.3)]' },
            fuel: { label: 'KRAFTSTOFF-RESERVE', accent: 'text-amber-400', bgIcon: 'bg-amber-500/20 text-amber-400 border-amber-500/40', borderGlow: 'border-amber-500/40 shadow-[0_0_30px_rgba(251,191,36,0.3)]' },
            rest: { label: 'LENKZEITPAUSE', accent: 'text-yellow-400', bgIcon: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40', borderGlow: 'border-yellow-500/40 shadow-[0_0_30px_rgba(234,179,8,0.3)]' },
            damage: { label: 'SCHADENS-MELDUNG', accent: 'text-rose-400', bgIcon: 'bg-rose-500/20 text-rose-400 border-rose-500/40', borderGlow: 'border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.3)]' },
            cargo: { label: 'AUFTRAGS-UPDATE', accent: 'text-emerald-400', bgIcon: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', borderGlow: 'border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.3)]' },
            chat: { label: 'CHAT-NACHRICHT', accent: 'text-sky-400', bgIcon: 'bg-sky-500/20 text-sky-400 border-sky-500/40', borderGlow: 'border-sky-500/40 shadow-[0_0_30px_rgba(14,165,233,0.3)]' },
            news: { label: 'FIRMEN-NEWS', accent: 'text-teal-400', bgIcon: 'bg-teal-500/20 text-teal-400 border-teal-500/40', borderGlow: 'border-teal-500/40 shadow-[0_0_30px_rgba(20,184,166,0.3)]' },
            event: { label: 'SPEDITIONSEVENT', accent: 'text-purple-400', bgIcon: 'bg-purple-500/20 text-purple-400 border-purple-500/40', borderGlow: 'border-purple-500/40 shadow-[0_0_30px_rgba(168,85,247,0.3)]' },
            system: { label: 'SYSTEM-INFO', accent: 'text-blue-400', bgIcon: 'bg-blue-500/20 text-blue-400 border-blue-500/40', borderGlow: 'border-blue-500/40 shadow-[0_0_30px_rgba(59,130,246,0.3)]' },
          };
          const badge = badgeMap[activeNotification.type] || {
            label: 'HINWEIS',
            accent: 'text-amber-400',
            bgIcon: 'bg-white/10 text-white border-white/20',
            borderGlow: 'border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)]',
          };

          return (
            <motion.div
              initial={{ opacity: 0, y: -70, scale: 0.92 }}
              animate={{ opacity: 1, y: 16, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 350, damping: 26 }}
              onClick={() => setActiveNotification(null)}
              style={{ x: '-50%', left: '50%' }}
              className={`absolute top-0 z-[99999] w-[460px] max-w-[92vw] rounded-3xl bg-[#0d1117]/95 backdrop-blur-2xl border ${badge.borderGlow} p-3.5 flex flex-col gap-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.9)] text-white cursor-pointer hover:scale-[1.01] transition-all`}
            >
              {/* Top CarPlay Pill Indicator */}
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto" />

              <div className="flex items-center gap-3.5 px-1">
                {activeNotification.type === 'music' && albumArtSrc ? (
                  <img src={albumArtSrc} alt="" className="w-11 h-11 rounded-2xl object-cover border border-white/20 shadow-lg shrink-0" />
                ) : (
                  <div className={`w-11 h-11 rounded-2xl ${badge.bgIcon} border flex items-center justify-center shrink-0 shadow-lg`}>
                    {activeNotification.icon}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${badge.accent} font-mono`}>
                      {badge.label}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-500 font-bold">SCHLIESSEN ✕</span>
                  </div>
                  <h3 className="text-sm font-black text-white leading-tight truncate mt-0.5">
                    {activeNotification.title}
                  </h3>
                  <p className="text-xs font-semibold text-zinc-300 truncate mt-0.5">
                    {activeNotification.message}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Titanium brushed pattern if titan theme active */}
      {settings.carPlayTheme === 'titan' && (
        <div className="titan-pattern absolute inset-0 pointer-events-none opacity-[0.25]" />
      )}

      {/* Sidebar Navigation */}
      <div 
        className={`drag flex flex-col items-center py-4 justify-between z-10 shrink-0 select-none ${c.sidebar}`}
        style={{ 
          width: `${80 * sidebarScale}px`,
          minWidth: `${70 * sidebarScale}px`,
        }}
      >
        <div className="flex flex-col items-center gap-1">
          {/* Digital Clock */}
          <span 
            className="font-black tracking-tight text-white mb-3 bg-black/35 px-2 py-0.5 rounded-lg border border-white/5"
            style={{ fontSize: `${14 * sidebarScale}px` }}
          >
            {timeString}
          </span>

          {/* Speed Limit indicator */}
          {data.connected && data.speedLimit > 0 ? (
            <div 
              className="rounded-full border-4 border-red-500 bg-white flex items-center justify-center font-black shadow-md mb-2"
              style={{
                width: `${40 * sidebarScale}px`,
                height: `${40 * sidebarScale}px`,
                fontSize: `${12 * sidebarScale}px`,
              }}
            >
              {Math.round(data.speedLimit)}
            </div>
          ) : (
            <div 
              className="rounded-full border border-white/10 bg-black/40 flex items-center justify-center text-slate-500 mb-2"
              style={{
                width: `${40 * sidebarScale}px`,
                height: `${40 * sidebarScale}px`,
                fontSize: `${12 * sidebarScale}px`,
              }}
            >
              --
            </div>
          )}
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-col gap-2.5">
          {[
            { id: 'home', icon: Home, label: 'Home' },
            { id: 'music', icon: Music, label: 'Musik' },
            { id: 'job', icon: Briefcase, label: 'Auftrag' },
            { id: 'truck', icon: Truck, label: 'LKW' },
            { id: 'settings', icon: Settings, label: 'Settings' }
          ].map((tab, idx) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            const isFocused = focusZone === 'sidebar' && sidebarIndex === idx;
            const iconSize = Math.round(20 * sidebarScale);
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as Tab);
                  setSidebarIndex(idx);
                  setFocusZone('sidebar');
                }}
                title={tab.label}
                className={`rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                  active ? c.activeTab : c.inactiveTab
                } ${
                  isFocused ? 'ring-4 ring-amber-500 scale-105 border-amber-400 bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.4)]' : ''
                }`}
                style={{
                  width: `${48 * sidebarScale}px`,
                  height: `${48 * sidebarScale}px`,
                }}
              >
                <Icon size={iconSize} />
              </button>
            );
          })}
        </div>

        {/* Connection status */}
        <div className="flex items-center justify-center mt-2">
          {telemetry.connected ? (
            <div className="flex flex-col items-center gap-0.5 text-emerald-400 cursor-help" title="ETS2 SDK Verbunden">
              <Wifi size={Math.round(14 * sidebarScale)} className="animate-pulse" />
              <span className="font-black uppercase tracking-wider" style={{ fontSize: `${7 * sidebarScale}px` }}>ON</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-0.5 text-rose-500 cursor-help" title="LKW-Spiel nicht aktiv">
              <WifiOff size={Math.round(14 * sidebarScale)} />
              <span className="font-black uppercase tracking-wider" style={{ fontSize: `${7 * sidebarScale}px` }}>OFF</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Display Area */}
      <div className="flex-1 h-full p-2.5 overflow-hidden relative z-10 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.18 }}
            className="w-full h-full flex flex-col justify-between"
          >
            {/* --- HOME DASHBOARD TAB --- */}
            {activeTab === 'home' && (
              <div className="grid grid-cols-12 gap-3 h-full">
                {/* Left Side: Map Widget */}
                <div
                  onClick={() => setMaximizedWidget('map')}
                  className={`col-span-7 h-full flex flex-col cursor-pointer transition-all duration-300 rounded-2xl border ${
                    focusZone === 'content' && contentIndex === 0
                      ? 'ring-4 ring-amber-500 scale-[1.01] border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.45)] z-20'
                      : 'hover:scale-[1.005] hover:border-zinc-600 border border-zinc-800 shadow-lg'
                  } relative bg-black overflow-hidden`}
                >
                  <div ref={setMapContainerRef} className="flex-1 relative bg-black overflow-hidden">
                    <GameMapWidget
                      ref={mapWidgetRef}
                      gameX={(telemetry as any).posX ?? (telemetry as any).gameX}
                      gameY={(telemetry as any).posZ ?? (telemetry as any).gameY}
                      heading={telemetry.connected ? telemetry.heading : undefined}
                      source={telemetry.connected ? telemetry.source : undefined}
                      dest={customDest ? customDest.dest : (telemetry.connected ? telemetry.dest : undefined)}
                      destCompany={customDest ? customDest.destCompany : (telemetry.connected ? telemetry.dest_company : undefined)}
                      navDistance={telemetry.connected ? telemetry.navDistance : undefined}
                      connected={telemetry.connected}
                      themeMode={activeMapTheme}
                      accentColor="#8b5cf6"
                      width={mapDims.w}
                      height={mapDims.h}
                      mapId="carplay-home"
                      showInstructions
                    />
                  </div>
                </div>

                {/* Right Side: Media and Mini Telemetry */}
                <div className="col-span-5 flex flex-col justify-between h-full gap-3">
                  {/* Media card */}
                  <div
                    onClick={() => {
                      setActiveTab('music');
                      setSidebarIndex(1);
                    }}
                    className={`relative flex-1 flex flex-col justify-between cursor-pointer transition-all duration-300 rounded-3xl overflow-hidden bg-[#0d1117]/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-3.5 group ${
                      focusZone === 'content' && contentIndex === 1
                        ? 'ring-4 ring-amber-500 scale-[1.01] border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)] z-20'
                        : 'hover:scale-[1.005] hover:border-white/20'
                    }`}
                  >
                    {/* Full Cover Image filling 100% of the entire widget area */}
                    {albumArtSrc ? (
                      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                        <img
                          src={albumArtSrc}
                          alt={media?.title || ''}
                          className="w-full h-full object-cover transition-all duration-700 scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/50 pointer-events-none" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 z-0 bg-gradient-to-br from-zinc-950 via-[#0d1117] to-zinc-900" />
                    )}

                    {/* TOP ROW & ACTIVE MEDIA DISPLAY (Unified for SMTC, Local Music & ETS2 Live Radio) */}
                    {(() => {
                      const activeTitle = isLocalPlaying && localTracks[currentLocalIndex]
                        ? localTracks[currentLocalIndex].name
                        : isRadioPlaying && activeRadio
                        ? (radioSongTitle || activeRadio.name)
                        : media?.title;

                      const activeArtist = isLocalPlaying
                        ? 'Lokale Audiodatei'
                        : isRadioPlaying && activeRadio
                        ? (radioSongTitle ? `${activeRadio.name} • ${activeRadio.genre}` : `${activeRadio.genre} • ${activeRadio.bitrate} kbps`)
                        : media?.artist;

                      const activeSource = isLocalPlaying
                        ? 'LOKALE MUSIK'
                        : isRadioPlaying
                        ? 'ETS2 LIVE-RADIO'
                        : (media?.source || 'SPOTIFY');

                      const isAnyActive = isLocalPlaying || isRadioPlaying || Boolean(media?.isPlaying);

                      return (
                        <>
                          <div className="relative z-20 flex items-center justify-between pointer-events-none">
                            <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-amber-400 flex items-center gap-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                              <Music size={13} className="text-amber-400" /> Mediaplayer
                            </span>
                            {activeTitle && (
                              <span className="text-[8.5px] font-black uppercase tracking-widest text-amber-300 bg-black/75 border border-amber-500/30 px-2.5 py-0.5 rounded-lg font-mono backdrop-blur-md shadow-lg">
                                {activeSource}
                              </span>
                            )}
                          </div>

                          {/* BOTTOM ROW: Track Info, Timeline & Controls Floating Directly Over Cover */}
                          {activeTitle ? (
                            <div className="relative z-20 flex flex-col gap-2 pointer-events-none">
                              {/* Song Title & Artist */}
                              <div>
                                <h3 className="text-lg font-black text-white truncate tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">
                                  {activeTitle}
                                </h3>
                                <p className="text-xs font-extrabold text-amber-400 truncate mt-0.5 drop-shadow-[0_2px_6px_rgba(0,0,0,1)]">
                                  {activeArtist}
                                </p>
                              </div>

                              {/* Timeline & Controls Row */}
                              <div className="flex items-center gap-3 w-full pointer-events-auto">
                                {/* Timeline */}
                                <div className="flex-1 flex items-center gap-2">
                                  <span className="text-[10px] font-mono font-black text-amber-400 shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                                    {isLocalPlaying ? formatMediaTime(localProgress) : isRadioPlaying ? 'LIVE' : formatMediaTime(media?.progress, media?.duration)}
                                  </span>
                                  <div className="h-2 flex-1 rounded-full overflow-hidden bg-black/80 border border-white/15 relative shadow-md">
                                    <div
                                      className="h-full rounded-full transition-all duration-300 bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)]"
                                      style={{
                                        width: isLocalPlaying && localDuration > 0
                                          ? `${(localProgress / localDuration) * 100}%`
                                          : isRadioPlaying
                                          ? '100%'
                                          : media
                                          ? `${getProgressPercent(media.progress, media.duration)}%`
                                          : '0%',
                                        backgroundColor: '#fbbf24'
                                      }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-mono font-bold text-zinc-300 shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                                    {isLocalPlaying ? formatMediaTime(localDuration) : isRadioPlaying ? 'STREAM' : media?.duration ? formatMediaTime(media.duration) : '--:--'}
                                  </span>
                                </div>

                                {/* Controls Cluster: Play/Pause Only */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isLocalPlaying) togglePlayLocal();
                                      else if (isRadioPlaying) togglePlayRadio();
                                      else sendMediaAction('play-pause');
                                    }}
                                    className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl ${
                                      isAnyActive
                                        ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-yellow-300 text-slate-950 shadow-yellow-400/30 border border-yellow-200'
                                        : 'bg-black/75 text-white border border-white/20 hover:bg-black/90 backdrop-blur-md'
                                    } ${
                                      focusZone === 'content' && contentIndex === 2 && activeTab === 'home'
                                        ? 'ring-4 ring-amber-500 scale-110 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                                        : ''
                                    }`}
                                  >
                                    {isAnyActive ? <Pause size={15} className="fill-current" /> : <Play size={15} className="fill-current ml-0.5" />}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="relative z-20 flex flex-col items-center justify-center py-4 text-center pointer-events-none">
                              <Music size={28} className="text-zinc-600 mb-1.5 animate-pulse" />
                              <h4 className="text-sm font-black text-white">Keine Medienwiedergabe</h4>
                              <p className="text-[10px] text-zinc-400 font-bold">Klicke hier, um Musik oder Radio zu starten</p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Redesigned Digital Cockpit Widget (Apple CarPlay Ultra-Dark Glass UI) */}
                  <div
                    onClick={() => setMaximizedWidget('diagnostics')}
                    className={`p-4 flex-1 flex flex-col justify-between cursor-pointer transition-all duration-300 rounded-3xl bg-[#080a0f]/95 backdrop-blur-2xl border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.95)] overflow-hidden relative group ${
                      focusZone === 'content' && contentIndex === 3
                        ? 'ring-4 ring-amber-500 scale-[1.01] border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.5)] z-20 bg-[#0d1017]'
                        : 'hover:scale-[1.005] hover:border-white/20'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5 mb-1 z-10">
                      <span className="text-[9.5px] font-black uppercase tracking-widest text-amber-400 font-mono flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-xl">
                        <Truck size={14} className="text-amber-400" /> DIGITAL COCKPIT
                      </span>
                      <span className="font-mono text-xs font-bold text-white truncate max-w-[180px] bg-white/[0.04] border border-white/[0.08] px-3 py-1 rounded-xl shadow-sm">
                        {data.brand || 'LKW'} {data.model || ''}
                      </span>
                    </div>

                    {/* Main Cockpit Display Grid */}
                    <div className="grid grid-cols-12 gap-3.5 items-stretch flex-1 z-10 my-1">
                      {/* Left: Speedometer Arc Gauge */}
                      <div className="col-span-5 flex flex-col h-full">
                        <SpeedometerGauge
                          speed={speed}
                          speedLimit={data.speedLimit}
                          cruiseControl={data.cruiseControl}
                          compact={true}
                        />
                      </div>

                      {/* Right: Gang, Restreichweite, Zustand (Massive Full-Width Cards & Typography) */}
                      <div className="col-span-7 flex flex-col justify-between gap-2.5 h-full py-0.5">
                        {/* Gang */}
                        <div className="flex-1 flex items-center justify-between bg-[#0d1017] px-4 py-2 rounded-2xl border border-white/[0.08] shadow-md">
                          <span className="text-xs font-black text-zinc-300 uppercase tracking-wider font-mono shrink-0">Gang</span>
                          <span className="text-lg font-black text-amber-300 bg-amber-500/15 border border-amber-500/30 px-3 py-0.5 rounded-xl font-mono leading-none shrink-0 whitespace-nowrap shadow-sm">
                            {gear > 0 ? `D${gear}` : gear < 0 ? `R${Math.abs(gear)}` : 'N'}
                          </span>
                        </div>

                        {/* Restreichweite */}
                        <div className="flex-1 flex items-center justify-between bg-[#0d1017] px-4 py-2 rounded-2xl border border-white/[0.08] shadow-md">
                          <span className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 shrink-0 font-mono">
                            <Fuel size={15} className="text-amber-400 shrink-0" /> Tank
                          </span>
                          <span className="text-base font-black text-white font-mono tabular-nums shrink-0 whitespace-nowrap">
                            {Math.round(data.fuelRange)} km
                          </span>
                        </div>

                        {/* Zustand */}
                        <div className="flex-1 flex items-center justify-between bg-[#0d1017] px-4 py-2 rounded-2xl border border-white/[0.08] shadow-md">
                          <span className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 shrink-0 font-mono">
                            <Wrench size={15} className="text-amber-400 shrink-0" /> Zustand
                          </span>
                          <span className={`text-xs font-black px-3 py-0.5 rounded-xl font-mono leading-none shrink-0 whitespace-nowrap shadow-sm ${
                            data.wearTruck >= 20
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                              : data.wearTruck >= 5
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          }`}>
                            {Math.round(100 - data.wearTruck)}% OK
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* --- MUSIC TAB (3 LARGE BUTTONS MENU + SUB-PLAYERS) --- */}
            {activeTab === 'music' && (
              <div className="h-full flex flex-col animate-fade-in overflow-hidden gap-2">
                {/* MODE 0: 3 LARGE CARPLAY/ANDROID AUTO APP CARDS SELECTION LANDING PAGE */}
                {musicSubTab === 'menu' && (
                  <div className="flex-1 flex flex-col justify-between p-2 animate-fade-in overflow-hidden relative">
                    <div className="grid grid-cols-3 gap-4 flex-1 min-h-0 items-stretch">
                      {/* Button 1: Windows SMTC / Spotify */}
                      <button
                        onClick={() => { setMusicSubTab('windows'); setContentIndex(0); }}
                        className={`group relative border rounded-3xl p-6 flex flex-col justify-between text-left transition-all duration-300 cursor-pointer shadow-[0_20px_50px_rgba(0,0,0,0.95)] ${
                          focusZone === 'content' && contentIndex === 0
                            ? 'ring-4 ring-amber-500 scale-[1.02] border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.5)] z-20 bg-[#0d1017]'
                            : 'bg-[#080a0f]/95 hover:bg-[#0f131b] border-white/[0.08] hover:border-amber-500/40 hover:scale-[1.01]'
                        }`}
                      >
                        <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] group-hover:bg-amber-500/10 group-hover:border-amber-500/30 text-amber-400 flex items-center justify-center transition-all duration-300 shrink-0">
                          <Monitor size={26} className="stroke-[2.2]" />
                        </div>
                        <div className="my-auto">
                          <h3 className="text-xl font-black text-white tracking-tight leading-tight group-hover:text-amber-300 transition-colors">
                            Windows Media
                          </h3>
                          <p className="text-xs font-semibold text-zinc-400 mt-1.5 leading-relaxed">
                            Spotify, Chrome & System-Audio
                          </p>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-white/[0.08] text-xs font-bold text-amber-400/90 group-hover:text-amber-300 font-mono transition-colors">
                          <span>Öffnen</span>
                          <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                      </button>

                      {/* Button 2: Lokale Musik */}
                      <button
                        onClick={() => { setMusicSubTab('local'); setContentIndex(0); }}
                        className={`group relative border rounded-3xl p-6 flex flex-col justify-between text-left transition-all duration-300 cursor-pointer shadow-[0_20px_50px_rgba(0,0,0,0.95)] ${
                          focusZone === 'content' && contentIndex === 1
                            ? 'ring-4 ring-blue-500 scale-[1.02] border-blue-400 shadow-[0_0_35px_rgba(59,130,246,0.5)] z-20 bg-[#0d1017]'
                            : 'bg-[#080a0f]/95 hover:bg-[#0f131b] border-white/[0.08] hover:border-blue-500/40 hover:scale-[1.01]'
                        }`}
                      >
                        <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] group-hover:bg-blue-500/10 group-hover:border-blue-500/30 text-blue-400 flex items-center justify-center transition-all duration-300 shrink-0">
                          <Disc size={26} className="stroke-[2.2]" />
                        </div>
                        <div className="my-auto">
                          <h3 className="text-xl font-black text-white tracking-tight leading-tight group-hover:text-blue-300 transition-colors">
                            Lokale Musik
                          </h3>
                          <p className="text-xs font-semibold text-zinc-400 mt-1.5 leading-relaxed">
                            MP3, FLAC & WAV Dateien
                          </p>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-white/[0.08] text-xs font-bold text-blue-400/90 group-hover:text-blue-300 font-mono transition-colors">
                          <span>Öffnen</span>
                          <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                      </button>

                      {/* Button 3: ETS2 Live Radio */}
                      <button
                        onClick={() => { setMusicSubTab('radio'); setContentIndex(0); }}
                        className={`group relative border rounded-3xl p-6 flex flex-col justify-between text-left transition-all duration-300 cursor-pointer shadow-[0_20px_50px_rgba(0,0,0,0.95)] ${
                          focusZone === 'content' && contentIndex === 2
                            ? 'ring-4 ring-emerald-500 scale-[1.02] border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.5)] z-20 bg-[#0d1017]'
                            : 'bg-[#080a0f]/95 hover:bg-[#0f131b] border-white/[0.08] hover:border-emerald-500/40 hover:scale-[1.01]'
                        }`}
                      >
                        <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 text-emerald-400 flex items-center justify-center transition-all duration-300 shrink-0">
                          <Radio size={26} className="stroke-[2.2]" />
                        </div>
                        <div className="my-auto">
                          <h3 className="text-xl font-black text-white tracking-tight leading-tight group-hover:text-emerald-300 transition-colors">
                            ETS2 Live-Radio
                          </h3>
                          <p className="text-xs font-semibold text-zinc-400 mt-1.5 leading-relaxed">
                            Web-Streams & Sendersuche
                          </p>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-white/[0.08] text-xs font-bold text-emerald-400/90 group-hover:text-emerald-300 font-mono transition-colors">
                          <span>Öffnen</span>
                          <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* --- MODE 1: WINDOWS SMTC MEDIA (UNIFIED DISPLAY FOR LOCAL & RADIO AS WELL) --- */}
                {musicSubTab === 'windows' && (
                  <div className="flex-1 flex flex-col min-h-0">
                    {/* Unified Active Track Display */}
                    {(() => {
                      const displayTitle = isLocalPlaying && localTracks[currentLocalIndex]
                        ? localTracks[currentLocalIndex].name
                        : isRadioPlaying && activeRadio
                        ? (radioSongTitle || activeRadio.name)
                        : media?.title;

                      const displayArtist = isLocalPlaying
                        ? 'Lokale Audiodatei'
                        : isRadioPlaying && activeRadio
                        ? (radioSongTitle ? `${activeRadio.name} • ${activeRadio.genre}` : `${activeRadio.genre} • ${activeRadio.bitrate} kbps`)
                        : media?.artist;

                      const displaySource = isLocalPlaying
                        ? 'LOKALE MUSIK'
                        : isRadioPlaying
                        ? 'ETS2 LIVE-RADIO'
                        : (media?.source || 'SPOTIFY');

                      const isAnyPlaying = isLocalPlaying || isRadioPlaying || media?.isPlaying;

                      if (!displayTitle) {
                        return (
                          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center rounded-2xl bg-black/95 backdrop-blur-2xl border border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.95)] relative">
                            {/* Floating Back Arrow */}
                            <button
                              onClick={() => { setMusicSubTab('menu'); setContentIndex(0); }}
                              title="Quelle wechseln"
                              className={`absolute top-3 left-3 z-40 w-10 h-10 rounded-full bg-black/70 backdrop-blur-md border flex items-center justify-center cursor-pointer transition-all ${
                                focusZone === 'content' && contentIndex === 0
                                  ? 'ring-4 ring-amber-500 scale-110 bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.8)]'
                                  : 'border-white/20 text-white hover:bg-black/90 hover:scale-105 shadow-xl'
                              }`}
                            >
                              <ArrowLeft size={20} className="stroke-[2.5]" />
                            </button>
                            <div className="w-18 h-18 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3 shadow-lg">
                              <Music size={36} className="text-amber-400 animate-pulse" />
                            </div>
                            <h3 className="text-xl font-black text-white mb-1.5 tracking-tight">Keine aktive Medienwiedergabe</h3>
                            <p className="text-xs max-w-[320px] leading-relaxed text-zinc-400 font-bold">
                              Starte Spotify, spiele lokale Musik oder schalte das ETS2 Live-Radio ein.
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="flex-1 flex flex-col relative overflow-hidden rounded-2xl bg-black border border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.95)]">
                          {/* Floating Back Arrow */}
                          <button
                            onClick={() => { setMusicSubTab('menu'); setContentIndex(0); }}
                            title="Quelle wechseln"
                            className={`absolute top-3 left-3 z-40 w-10 h-10 rounded-full bg-black/70 backdrop-blur-md border flex items-center justify-center cursor-pointer transition-all ${
                              focusZone === 'content' && contentIndex === 0
                                ? 'ring-4 ring-amber-500 scale-110 bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.8)]'
                                : 'border-white/20 text-white hover:bg-black/90 hover:scale-105 shadow-xl'
                            }`}
                          >
                            <ArrowLeft size={20} className="stroke-[2.5]" />
                          </button>
                          {/* Ambient Extension Background */}
                          {albumArtSrc ? (
                            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                              <img
                                src={albumArtSrc}
                                alt=""
                                className="w-full h-full object-cover blur-3xl opacity-75 scale-125 transition-all duration-1000"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/50" />
                            </div>
                          ) : (
                            <div className="absolute inset-0 z-0 bg-gradient-to-br from-zinc-950 via-black to-zinc-900" />
                          )}

                          {/* TOP RIGHT CORNER: Player Source Badge */}
                          <div className="absolute top-3 right-3 z-30 bg-black/75 backdrop-blur-md border border-amber-500/30 px-3 py-1 rounded-xl shadow-lg">
                            <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 font-mono">
                              {displaySource}
                            </span>
                          </div>

                          {/* Crisp Album Cover or Station Logo */}
                          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none p-0 overflow-hidden">
                            {albumArtSrc ? (
                              <div className="relative h-full aspect-square flex items-center justify-center">
                                <img
                                  src={albumArtSrc}
                                  alt={displayTitle}
                                  className="h-full w-full object-cover shadow-[0_20px_50px_rgba(0,0,0,0.9)]"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40 pointer-events-none" />
                              </div>
                            ) : isRadioPlaying && activeRadio ? (
                              <div className="relative h-full aspect-square flex items-center justify-center p-4">
                                <RadioLogoImage src={null} name={activeRadio.name} size="lg" />
                              </div>
                            ) : (
                              <div className="h-full aspect-square bg-zinc-900 flex flex-col items-center justify-center">
                                <Disc size={64} className="text-amber-400/60 mb-2" />
                                <span className="text-xs font-black uppercase text-zinc-400 tracking-wider font-mono">{displaySource}</span>
                              </div>
                            )}
                          </div>

                          {/* CENTER OVERLAY: Song Title & Artist */}
                          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 text-center pointer-events-none mb-14">
                            <div className="max-w-[85%]">
                              <h2 className="text-2xl font-black text-white truncate tracking-tight drop-shadow-[0_4px_16px_rgba(0,0,0,1)]">
                                {displayTitle}
                              </h2>
                              <p className="text-sm font-extrabold text-amber-400 truncate mt-1 drop-shadow-[0_2px_12px_rgba(0,0,0,1)]">
                                {displayArtist}
                              </p>
                            </div>
                          </div>

                          {/* BOTTOM OVERLAY: Playback Buttons + Timeline */}
                          <div className="absolute bottom-2.5 left-4 right-4 z-30 flex flex-col gap-2">
                            <div className="flex items-center justify-center gap-5">
                              <button
                                onClick={() => {
                                  if (isLocalPlaying) playLocalTrack((currentLocalIndex - 1 + localTracks.length) % localTracks.length);
                                  else sendMediaAction('prev');
                                }}
                                className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/20 backdrop-blur-md active:scale-90 transition-all cursor-pointer shadow-lg"
                              >
                                <SkipBack size={16} />
                              </button>

                              <button
                                onClick={() => {
                                  if (isLocalPlaying) togglePlayLocal();
                                  else if (isRadioPlaying) togglePlayRadio();
                                  else sendMediaAction('play-pause');
                                }}
                                className={`w-11 h-11 rounded-full flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl ${
                                  isAnyPlaying
                                    ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-yellow-300 text-slate-950 shadow-yellow-400/40 border-2 border-yellow-200'
                                    : 'bg-black/75 text-white border-2 border-white/20 hover:bg-black/90 backdrop-blur-md'
                                }`}
                              >
                                {isAnyPlaying ? <Pause size={19} className="fill-current" /> : <Play size={19} className="fill-current ml-0.5" />}
                              </button>

                              <button
                                onClick={() => {
                                  if (isLocalPlaying) playLocalTrack((currentLocalIndex + 1) % localTracks.length);
                                  else sendMediaAction('next');
                                }}
                                className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/20 backdrop-blur-md active:scale-90 transition-all cursor-pointer shadow-lg"
                              >
                                <SkipForward size={16} />
                              </button>
                            </div>

                            {/* Timeline Slider */}
                            <div className="flex items-center gap-3 w-full">
                              <span className="text-[11px] font-mono font-black text-amber-400 shrink-0 min-w-[36px] text-left drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                                {isLocalPlaying ? formatMediaTime(localProgress) : media ? formatMediaTime(media.progress, media.duration) : 'LIVE'}
                              </span>

                              <div className="relative flex-1 h-3 flex items-center">
                                <div className="h-2 w-full rounded-full overflow-hidden bg-black/70 border border-white/15 relative shadow-md">
                                  <div
                                    className="h-full rounded-full transition-all duration-300 bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)]"
                                    style={{
                                      width: isLocalPlaying && localDuration > 0
                                        ? `${(localProgress / localDuration) * 100}%`
                                        : isRadioPlaying
                                        ? '100%'
                                        : media
                                        ? `${getProgressPercent(media.progress, media.duration)}%`
                                        : '0%',
                                      backgroundColor: '#fbbf24'
                                    }}
                                  />
                                </div>
                              </div>

                              <span className="text-[11px] font-mono font-bold text-zinc-300 shrink-0 min-w-[36px] text-right drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                                {isLocalPlaying ? formatMediaTime(localDuration) : isRadioPlaying ? 'STREAM' : media?.duration ? formatMediaTime(media.duration) : '--:--'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* --- MODE 2: LOKALE MUSIK PLAYER --- */}
                {musicSubTab === 'local' && (
                  <div className="flex-1 flex flex-col bg-[#0d1117]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 overflow-hidden justify-between shadow-2xl">
                    {localTracks.length > 0 ? (
                      <div className="flex flex-col h-full justify-between gap-2">
                        <div className="bg-black/60 border border-white/10 rounded-xl p-2.5 flex items-center gap-3">
                          <button
                            onClick={() => { setMusicSubTab('menu'); setContentIndex(0); }}
                            title="Quelle wechseln"
                            className={`w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border flex items-center justify-center cursor-pointer shrink-0 transition-all ${
                              focusZone === 'content' && contentIndex === 0
                                ? 'ring-4 ring-amber-500 scale-105 bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                                : 'border-white/20 text-white hover:bg-black/80'
                            }`}
                          >
                            <ArrowLeft size={18} className="stroke-[2.5]" />
                          </button>
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg">
                            <Disc size={20} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider font-mono">Lokaler Song ({currentLocalIndex + 1} / {localTracks.length})</span>
                            <h3 className="text-sm font-black text-white truncate leading-tight">{localTracks[currentLocalIndex]?.name}</h3>
                            <span className="text-[10px] text-zinc-400 font-mono truncate block">{localTracks[currentLocalIndex]?.file.name}</span>
                          </div>
                          <label className={`px-3 py-1.5 rounded-xl text-white text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md transition-all shrink-0 ${
                            focusZone === 'content' && contentIndex === 1
                              ? 'ring-4 ring-blue-500 bg-blue-500 scale-105 shadow-[0_0_20px_rgba(59,130,246,0.6)]'
                              : 'bg-blue-600 hover:bg-blue-500'
                          }`}>
                            <Plus size={14} /> Musik laden
                            <input ref={localFileInputRef} type="file" multiple accept="audio/*" onChange={handleLocalFilesSelect} className="hidden" />
                          </label>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto border border-white/10 rounded-xl bg-black/40 divide-y divide-white/5 p-1">
                          {localTracks.map((t, idx) => {
                            const isTrackFocused = focusZone === 'content' && contentIndex === idx + 2;
                            return (
                              <button
                                key={t.id}
                                onClick={() => playLocalTrack(idx)}
                                data-item-focused={isTrackFocused ? "true" : undefined}
                                className={`w-full p-2 rounded-lg flex items-center justify-between text-left transition-all cursor-pointer ${
                                  isTrackFocused
                                    ? 'ring-4 ring-blue-500 scale-[1.02] border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.6)] z-20 bg-blue-500/25 text-white font-bold'
                                    : idx === currentLocalIndex
                                    ? 'bg-amber-500/20 text-amber-400 font-bold border border-amber-500/40'
                                    : 'hover:bg-white/5 text-zinc-300'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <span className="text-xs font-mono font-bold w-5">{idx + 1}.</span>
                                  <span className="text-xs truncate">{t.name}</span>
                                </div>
                                {idx === currentLocalIndex && isLocalPlaying ? (
                                  <span className="text-[9px] font-mono font-black text-amber-400 animate-pulse">SPIELT...</span>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>

                        <div className="bg-black/80 border border-white/10 rounded-xl p-3 flex flex-col gap-2 shrink-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => playLocalTrack((currentLocalIndex - 1 + localTracks.length) % localTracks.length)}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
                              >
                                <SkipBack size={14} />
                              </button>
                              <button
                                onClick={togglePlayLocal}
                                className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black flex items-center justify-center transition-all cursor-pointer shadow-lg"
                              >
                                {isLocalPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                              </button>
                              <button
                                onClick={() => playLocalTrack((currentLocalIndex + 1) % localTracks.length)}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
                              >
                                <SkipForward size={14} />
                              </button>
                            </div>

                            <div className="flex items-center gap-2 min-w-[140px]">
                              <Volume2 size={14} className="text-zinc-400" />
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={localVolume}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value);
                                  setLocalVolume(v);
                                  if (localAudioRef.current) localAudioRef.current.volume = v;
                                }}
                                className="w-full accent-amber-500 cursor-pointer h-1 bg-white/20 rounded-lg"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                            <span>{formatMediaTime(localProgress)}</span>
                            <input
                              type="range"
                              min="0"
                              max={localDuration || 100}
                              value={localProgress}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setLocalProgress(val);
                                if (localAudioRef.current) localAudioRef.current.currentTime = val;
                              }}
                              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-white/20 rounded-lg"
                            />
                            <span>{formatMediaTime(localDuration)}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative">
                        <button
                          onClick={() => { setMusicSubTab('menu'); setContentIndex(0); }}
                          title="Quelle wechseln"
                          className={`absolute top-0 left-0 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border flex items-center justify-center cursor-pointer transition-all ${
                            focusZone === 'content' && contentIndex === 0
                              ? 'ring-4 ring-amber-500 scale-105 bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                              : 'border-white/20 text-white hover:bg-black/80'
                          }`}
                        >
                          <ArrowLeft size={18} className="stroke-[2.5]" />
                        </button>
                        <Disc size={40} className="text-zinc-600 mb-3" />
                        <h3 className="text-base font-black text-white mb-1">Keine lokalen Songs geladen</h3>
                        <p className="text-xs text-zinc-400 max-w-[280px] mb-4">
                          Wähle Musikdateien (.mp3, .flac, .wav) von deiner Festplatte aus.
                        </p>
                        <label className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase text-xs tracking-wider cursor-pointer shadow-lg transition-all">
                          Dateien auswählen
                          <input type="file" multiple accept="audio/*" onChange={handleLocalFilesSelect} className="hidden" />
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* --- MODE 3: ETS2 LIVE-RADIO STREAMS --- */}
                {musicSubTab === 'radio' && (
                  <div className="flex-1 min-h-0 flex flex-col bg-[#0d1117]/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-3.5 overflow-hidden justify-between shadow-[0_20px_50px_rgba(0,0,0,0.9)] gap-3">
                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        onClick={() => { setMusicSubTab('menu'); setContentIndex(0); }}
                        title="Quelle wechseln"
                        className={`w-10 h-10 rounded-2xl bg-[#0d1117]/90 backdrop-blur-2xl border flex items-center justify-center cursor-pointer shrink-0 transition-all ${
                          focusZone === 'content' && contentIndex === 0
                            ? 'ring-4 ring-amber-500 scale-105 bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/40'
                            : 'border-white/20 text-white hover:border-amber-500/50 hover:scale-105 shadow-md'
                        }`}
                      >
                        <ArrowLeft size={18} className="stroke-[2.5]" />
                      </button>
                      <div
                        onClick={() => openVirtualKeyboard('radio')}
                        className={`relative flex-1 flex items-center gap-1.5 p-0.5 rounded-2xl cursor-pointer transition-all ${
                          focusZone === 'content' && contentIndex === 1
                            ? 'ring-4 ring-amber-400 bg-amber-500/20 scale-[1.01] shadow-[0_0_20px_rgba(245,158,11,0.6)]'
                            : ''
                        }`}
                      >
                        <div className="relative flex-1">
                          <Search size={15} className="absolute left-3.5 top-2.5 text-zinc-400" />
                          <input
                            type="text"
                            value={radioSearch}
                            onFocus={() => openVirtualKeyboard('radio')}
                            onChange={(e) => setRadioSearch(e.target.value)}
                            placeholder="Sender oder Genre suchen..."
                            className="w-full bg-[#0d1117]/90 border border-white/15 rounded-2xl py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-amber-500 cursor-pointer shadow-inner"
                          />
                        </div>
                      </div>
                              <button
                                onClick={autoLoadSii}
                                className={`px-3 py-2 rounded-2xl text-white text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg transition-all shrink-0 border ${
                                  focusZone === 'content' && contentIndex === 2
                                    ? 'ring-4 ring-emerald-400 bg-emerald-500 border-emerald-300 scale-105 shadow-[0_0_20px_rgba(52,211,153,0.6)]'
                                    : 'bg-emerald-600/80 hover:bg-emerald-500 border-emerald-500/40 text-emerald-100'
                                }`}
                                title="live_streams.sii aus ETS2 Ordner automatisch auslesen"
                              >
                                <RefreshCw size={13} /> Auto-Scan
                              </button>
                              <label className={`px-3.5 py-2 rounded-2xl text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg transition-all shrink-0 border ${
                                focusZone === 'content' && contentIndex === 3
                                  ? 'ring-4 ring-amber-400 bg-amber-400 border-amber-300 scale-105 shadow-[0_0_20px_rgba(245,158,11,0.6)]'
                                  : 'bg-amber-500 hover:bg-amber-400 border-amber-400/50'
                              }`}>
                                <Upload size={14} /> Importieren
                                <input ref={siiFileInputRef} type="file" accept=".sii,.txt" onChange={handleSiiFileUpload} className="hidden" />
                              </label>
                            </div>

                            <div className="flex-1 min-h-0 overflow-y-auto border border-white/10 rounded-2xl bg-black/40 p-2.5 grid grid-cols-2 gap-2.5 transform-gpu">
                              {filteredRadioStations.map((st, idx) => {
                                const isCurrent = activeRadio?.id === st.id;
                                const stLogo = getRadioLogoUrl(st);
                                const isItemFocused = focusZone === 'content' && contentIndex === idx + 4;
                                return (
                                  <button
                                    key={st.id}
                                    onClick={() => togglePlayRadio(st)}
                                    data-item-focused={isItemFocused ? "true" : undefined}
                                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all duration-300 cursor-pointer shadow-md ${
                                      isItemFocused
                                        ? 'ring-4 ring-amber-500 scale-[1.02] border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.6)] z-20 bg-amber-500/25 text-white font-bold'
                                        : isCurrent && isRadioPlaying
                                        ? 'bg-amber-500/15 border-amber-500/70 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                                        : 'bg-[#0d1117]/80 backdrop-blur-xl border-white/10 hover:border-amber-500/40 hover:bg-white/[0.05] text-zinc-200'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-1 min-w-0">
                                      <div className="flex items-center gap-2.5 truncate min-w-0">
                                        <RadioLogoImage
                                          src={stLogo}
                                          name={st.name}
                                          size="sm"
                                          className="w-5 h-5 rounded-md object-contain bg-black/60 p-0.5 border border-white/10 shrink-0"
                                        />
                                        <span className="text-xs font-black truncate">{st.name}</span>
                                      </div>
                                      {st.favorite && (
                                        <span className="text-[9px] bg-amber-500/20 border border-amber-500/40 text-amber-400 px-1.5 py-0.5 rounded-md font-mono font-bold shrink-0">
                                          ★
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center justify-between text-[9.5px] font-mono text-zinc-400 mt-1.5">
                                      <span className="truncate max-w-[100px]">{st.genre}</span>
                                      <span className="font-bold text-amber-400/80">{st.bitrate} kbps</span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>

                            {activeRadio && (
                              <div className="bg-[#0d1117]/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-3 shadow-[0_20px_50px_rgba(0,0,0,0.9)] flex items-center justify-between">
                                <div className="flex items-center gap-3 min-w-0">
                                  <RadioLogoImage
                                    src={getRadioLogoUrl(activeRadio)}
                                    name={activeRadio.name}
                                    size="md"
                                    className="w-10 h-10 rounded-xl object-contain bg-black/60 p-1 border border-white/10 shrink-0 shadow-md"
                                  />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[8px] font-black uppercase text-amber-400 font-mono tracking-widest bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md">
                                        {isRadioPlaying ? (radioSongTitle ? '🎵 LIVE TRACK' : 'LIVE STREAM') : 'PAUSIERT'}
                                      </span>
                                      <span className="text-[8.5px] font-mono text-zinc-400 font-bold">{activeRadio.bitrate} kbps</span>
                                    </div>
                                    <h4 className="text-xs font-black text-white truncate mt-0.5">
                                      {radioSongTitle || activeRadio.name}
                                    </h4>
                                    {radioSongTitle && (
                                      <p className="text-[10px] text-amber-300/80 font-bold truncate mt-0.5 font-mono">
                                        Sender: {activeRadio.name}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2 w-28 bg-black/40 border border-white/10 px-2.5 py-1.5 rounded-xl">
                                    <Volume2 size={13} className="text-amber-400 shrink-0" />
                                    <input
                                      type="range"
                                      min="0"
                                      max="1"
                                      step="0.05"
                                      value={radioVolume}
                                      onChange={(e) => {
                                        const v = parseFloat(e.target.value);
                                        setRadioVolume(v);
                                        if (radioAudioRef.current) radioAudioRef.current.volume = v;
                                      }}
                                      className="w-full accent-amber-500 cursor-pointer h-1.5 bg-white/20 rounded-lg"
                                    />
                                  </div>

                                  <button
                                    onClick={() => togglePlayRadio()}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all cursor-pointer shadow-lg ${
                                      isRadioPlaying
                                        ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-amber-500/30'
                                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/15'
                                    }`}
                                  >
                                    {isRadioPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
              </div>
            )}
               {/* --- JOB INFO TAB --- */}
            {activeTab === 'job' && (
              <div className="h-full flex flex-col overflow-hidden">
                <div className="flex-1 flex flex-col p-5 bg-[#080a0f]/95 backdrop-blur-2xl border border-white/[0.08] rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden justify-between relative">
                  {/* Subtle Background Aura Glow */}
                  <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                  {/* Header */}
                  <div className="flex items-center justify-between mb-3.5 border-b border-white/[0.08] pb-3 shrink-0 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-amber-400 shadow-md">
                        <Briefcase size={20} className="stroke-[2.2]" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-white tracking-tight font-mono">AKTIVER FRACHTBRIEF</h2>
                        <p className="text-[10px] text-amber-400/90 font-extrabold uppercase tracking-widest font-mono mt-0.5">Echtzeit-Logistikdaten</p>
                      </div>
                    </div>
                    {data.income > 0 && (
                      <div className="text-right bg-emerald-500/10 border border-emerald-500/30 px-4 py-1.5 rounded-2xl shadow-lg">
                        <span className="text-[9px] font-extrabold text-emerald-400 font-mono uppercase tracking-widest block leading-none">Auszahlung</span>
                        <span className="text-xl font-black text-emerald-300 font-mono leading-tight mt-0.5 block">
                          € {new Intl.NumberFormat('de-DE').format(data.income)}
                        </span>
                      </div>
                    )}
                  </div>

                  {data.cargo && data.cargo.toLowerCase() !== 'none' ? (
                    <div className="flex-1 flex flex-col gap-3 min-h-0 relative z-10">
                      {/* Frachtgut + Reststrecke */}
                      <div className="grid grid-cols-12 gap-3 shrink-0">
                        <div className="col-span-7 bg-[#0d1017] border border-white/[0.08] rounded-2xl p-4 flex flex-col justify-between shadow-lg">
                          <span className="text-[9px] font-black font-mono text-amber-400 uppercase tracking-widest block mb-1">FRACHTGUT</span>
                          <p className="text-2xl font-black text-white leading-tight truncate drop-shadow-md">{data.cargo}</p>
                          {data.cargoMass > 0 && (
                            <div className="mt-2.5">
                              <span className="text-xs text-white font-mono font-bold inline-flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-xl border border-white/10 shadow-inner">
                                ⚖️ <span className="text-amber-400 font-black">{data.cargoMass.toFixed(1)}</span> Tonnen
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="col-span-5 flex flex-col gap-3">
                          {data.navDistance > 0 && (
                            <div className="bg-[#0d1017] border border-white/[0.08] rounded-2xl p-3.5 flex-1 flex items-center gap-3.5 shadow-lg">
                              <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0 shadow-md">
                                <Navigation size={20} className="text-sky-400" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-[9px] font-black font-mono text-sky-400 uppercase tracking-widest">VERBLEIBEND</span>
                                <p className="text-xl font-black text-white leading-tight font-mono mt-0.5">
                                  {formatDistance(data.navDistance)}
                                </p>
                                {getRemainingSeconds() ? (
                                  <span className="text-[10px] font-bold text-zinc-400 font-mono">noch {formatRemainingTime(getRemainingSeconds()!)}</span>
                                ) : null}
                              </div>
                            </div>
                          )}
                          {data.plannedDistance && data.plannedDistance > 0 && (
                            <div className="bg-[#0d1017] border border-white/[0.08] rounded-2xl p-3.5 flex-1 flex items-center gap-3.5 shadow-lg">
                              <div className="w-10 h-10 rounded-2xl bg-zinc-500/15 border border-zinc-500/30 flex items-center justify-center shrink-0 shadow-md">
                                <MapPin size={20} className="text-zinc-300" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-[9px] font-black font-mono text-zinc-400 uppercase tracking-widest">GEPLANTE STRECKE</span>
                                <p className="text-xl font-black text-white leading-tight font-mono mt-0.5">
                                  {formatDistance(data.plannedDistance)}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Absender/Empfänger + Start/Ziel */}
                      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
                        <div className="bg-[#0d1017] border border-white/[0.08] rounded-2xl p-4 space-y-2.5 shadow-lg flex flex-col justify-center">
                          {data.source_company && (
                            <div className="flex items-center justify-between">
                              <span className="text-[9.5px] font-black font-mono text-zinc-400 uppercase tracking-wider">Absender</span>
                              <p className="text-xs font-black text-white truncate max-w-[160px] bg-white/[0.04] px-2.5 py-1 rounded-xl border border-white/10">{data.source_company}</p>
                            </div>
                          )}
                          {data.dest_company && (
                            <div className="flex items-center justify-between">
                              <span className="text-[9.5px] font-black font-mono text-amber-400 uppercase tracking-wider">Empfänger</span>
                              <p className="text-xs font-black text-amber-300 truncate max-w-[160px] bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">{data.dest_company}</p>
                            </div>
                          )}
                          {!data.source_company && !data.dest_company && (
                            <p className="text-xs text-zinc-500 font-bold text-center font-mono">Keine Firmendaten verfügbar</p>
                          )}
                        </div>

                        <div className="bg-[#0d1017] border border-white/[0.08] rounded-2xl p-4 flex flex-col justify-center gap-3 shadow-lg">
                          <div className="flex items-center gap-3.5">
                            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-md">
                              <MapPin size={18} className="text-emerald-400" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[9px] font-black font-mono text-emerald-400 uppercase tracking-widest">STARTORT</span>
                              <p className="text-base font-black text-white leading-tight truncate mt-0.5">{data.source || '—'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3.5">
                            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-md">
                              <Navigation size={18} className="text-amber-400" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[9px] font-black font-mono text-amber-400 uppercase tracking-widest">ZIELORT</span>
                              <p className="text-base font-black text-white leading-tight truncate mt-0.5">{data.dest || '—'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative z-10">
                      <div className="w-20 h-20 rounded-3xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-3.5 shadow-2xl backdrop-blur-xl">
                        <Briefcase size={38} className="text-amber-400/80 animate-pulse" />
                      </div>
                      <h3 className="text-lg font-black text-white font-mono uppercase tracking-wider mb-1">Kein aktiver Auftrag</h3>
                      <p className="text-xs max-w-[300px] leading-relaxed text-zinc-400 font-medium">
                        Nimm am LKW-Terminal einen Auftrag an, um Frachtbrief und Routenverlauf hier live einzusehen.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- TRUCK DIAGNOSTICS TAB (REAL SDK TELEMETRY ONLY) --- */}
            {activeTab === 'truck' && (
              <div className="h-full flex flex-col overflow-hidden">
                <div className="flex-1 flex flex-col p-3.5 bg-[#080a0f]/95 backdrop-blur-2xl border border-white/[0.08] rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden justify-between relative">
                  {/* Background Aura Glows */}
                  <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                  {/* Header */}
                  <div className="flex items-center justify-between mb-2 border-b border-white/[0.08] pb-2 shrink-0 relative z-10">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-amber-400 shadow-md">
                        <Truck size={18} className="stroke-[2.2]" />
                      </div>
                      <div>
                        <h2 className="text-sm font-black text-white tracking-tight font-mono">FAHRZEUG-COCKPIT & DIAGNOSE</h2>
                        <p className="text-[9.5px] text-amber-400/90 font-extrabold uppercase tracking-widest font-mono">
                          {telemetry.connected ? `${data.brand || 'LKW'} ${data.model || ''}` : 'NICHT VERBUNDEN'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-mono font-black px-3 py-1 rounded-xl border shadow-md ${
                        !telemetry.connected
                          ? 'text-amber-300 bg-amber-500/15 border-amber-500/30'
                          : (data.wearTruck || 0) > 10
                          ? 'text-rose-300 bg-rose-500/15 border-rose-500/40 animate-pulse'
                          : 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
                      }`}>
                        {!telemetry.connected ? '⚡ STANDBY (TELEMETRIE INAKTIV)' : (data.wearTruck || 0) > 10 ? '⚠️ SERVICE ERFORDERLICH' : '✅ ZUSTAND OK'}
                      </span>
                    </div>
                  </div>

                  {!telemetry.connected ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative z-10">
                      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-3 shadow-2xl backdrop-blur-xl">
                        <Truck size={32} className="text-amber-400/80 animate-pulse" />
                      </div>
                      <h3 className="text-base font-black text-white font-mono uppercase tracking-wider mb-1">Keine Telemetrie-Verbindung</h3>
                      <p className="text-xs max-w-[340px] leading-relaxed text-zinc-400 font-medium">
                        Starte Euro Truck Simulator 2 oder American Truck Simulator mit dem Telemetrie-Plugin, um Fahrzeug-Diagnose in Echtzeit anzuzeigen.
                      </p>
                    </div>
                  ) : (
                    /* 100% Space-Optimized 2-Row Layout */
                    <div className="flex-1 flex flex-col gap-2.5 min-h-0 relative z-10">
                      {/* TOP ROW: Live Cockpit Instrument Gauges */}
                      <div className="grid grid-cols-12 gap-2.5 flex-1 min-h-0">
                        {/* Speedometer & Speed Limit Card */}
                        <div className="col-span-5 flex flex-col min-h-0">
                          <SpeedometerGauge
                            speed={data.speed || 0}
                            speedLimit={data.speedLimit}
                            cruiseControl={data.cruiseControl}
                          />
                        </div>

                        {/* Gear & RPM Tachometer Card */}
                        <div className="col-span-4 bg-[#0d1017] border border-white/[0.08] rounded-2xl p-2.5 flex flex-col justify-between shadow-lg">
                          <div className="flex items-center justify-between border-b border-white/[0.08] pb-1 text-[8.5px] font-mono font-black text-zinc-400">
                            <span className="text-amber-400 uppercase tracking-wider">ANTRIEB & GANG</span>
                            <span className="text-zinc-400 font-mono">{Math.round(data.rpm || 0)} U/MIN</span>
                          </div>

                          <div className="my-auto text-center flex flex-col items-center justify-center py-1">
                            <span className="text-2xl font-black text-amber-300 bg-amber-500/15 border border-amber-500/40 px-4 py-1 rounded-xl font-mono leading-none shadow-md inline-block">
                              {(data.gear || 0) > 0 ? `D${data.gear}` : (data.gear || 0) < 0 ? `R${Math.abs(data.gear || 0)}` : 'N'}
                            </span>
                            <span className="text-[8.5px] font-black text-zinc-400 font-mono uppercase tracking-widest mt-1.5">AKTUELLE FAHRSTUFE</span>
                          </div>

                          {/* RPM Bar */}
                          <div className="space-y-0.5">
                            <div className="flex justify-between text-[8px] font-mono font-black text-zinc-400">
                              <span>MOTORDREHZAHL</span>
                              <span className="text-white font-mono">{Math.round(data.rpm || 0)} RPM</span>
                            </div>
                            <div className="h-1.5 w-full bg-black/80 rounded-full overflow-hidden border border-white/10 p-0.5">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${(data.rpm || 0) > 2000 ? 'bg-rose-500' : (data.rpm || 0) > 1500 ? 'bg-amber-400' : 'bg-sky-400'}`}
                                style={{ width: `${Math.min(100, Math.max(4, ((data.rpm || 0) / 2500) * 100))}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Tank & Wear Summary Card */}
                        <div className="col-span-3 bg-[#0d1017] border border-white/[0.08] rounded-2xl p-2.5 flex flex-col justify-between shadow-lg">
                          <div className="flex items-center justify-between border-b border-white/[0.08] pb-1 text-[8.5px] font-mono font-black text-amber-400">
                            <span className="uppercase tracking-wider">ÜBERSICHT</span>
                            <span className="text-emerald-400 font-mono">{(100 - (data.wearTruck || 0)).toFixed(0)}% OK</span>
                          </div>

                          <div className="space-y-1.5 my-auto">
                            <div className="bg-black/60 border border-white/10 rounded-xl p-1.5 px-2 flex items-center justify-between text-[11px] font-mono">
                              <span className="text-zinc-400 text-[9px]">REICHWEITE</span>
                              <span className="font-black text-amber-300">{Math.round(data.fuelRange || 0)} KM</span>
                            </div>
                            <div className="bg-black/60 border border-white/10 rounded-xl p-1.5 px-2 flex items-center justify-between text-[11px] font-mono">
                              <span className="text-zinc-400 text-[9px]">TANK</span>
                              <span className="font-black text-white">{Math.round(data.fuel || 0)} L</span>
                            </div>
                          </div>

                          <div className="bg-black/60 border border-white/10 rounded-xl p-1 text-center text-[8.5px] font-mono">
                            <span className={`font-bold ${data.parkBrake ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {data.parkBrake ? 'PARKBREMSE AKTIV' : 'FAHRBEREIT'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* BOTTOM ROW: Detailed Diagnostics Columns */}
                      <div className="grid grid-cols-12 gap-2.5 flex-1 min-h-0">
                        {/* Schadensanalyse */}
                        <div className="col-span-4 bg-[#0d1017] border border-white/[0.08] rounded-2xl p-2.5 flex flex-col justify-between shadow-lg">
                          <div className="flex items-center justify-between border-b border-white/[0.08] pb-1 text-[8.5px] font-black font-mono text-amber-400 uppercase tracking-widest">
                            <span className="flex items-center gap-1"><Wrench size={11} /> SCHADENSANALYSE</span>
                            <span className="text-white font-mono font-black">{(100 - (data.wearTruck || 0)).toFixed(0)}% OK</span>
                          </div>

                          <div className="space-y-2 my-auto">
                            <div>
                              <div className="flex justify-between text-[8.5px] font-mono font-black text-zinc-300 mb-0.5">
                                <span>LKW-ABNUTZUNG</span>
                                <span className={(data.wearTruck || 0) > 15 ? 'text-rose-400 font-mono' : 'text-zinc-400 font-mono'}>
                                  {typeof data.wearTruck === 'number' ? data.wearTruck.toFixed(1) : '0.0'}%
                                </span>
                              </div>
                              <div className="h-1.5 w-full bg-black/80 rounded-full overflow-hidden border border-white/10 p-0.5">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${(data.wearTruck || 0) > 15 ? 'bg-rose-500' : 'bg-emerald-400'}`}
                                  style={{ width: `${Math.max(4, data.wearTruck || 0)}%` }}
                                />
                              </div>
                            </div>

                            {data.cargo && data.cargo.toLowerCase() !== 'none' && (
                              <div>
                                <div className="flex justify-between text-[8.5px] font-mono font-black text-zinc-300 mb-0.5">
                                  <span>FRACHTSCHADEN</span>
                                  <span className={data.wearCargo && data.wearCargo > 0 ? 'text-rose-400 font-mono' : 'text-emerald-400 font-mono'}>
                                    {typeof data.wearCargo === 'number' ? data.wearCargo.toFixed(1) : '0.0'}%
                                  </span>
                                </div>
                                <div className="h-1.5 w-full bg-black/80 rounded-full overflow-hidden border border-white/10 p-0.5">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${data.wearCargo && data.wearCargo > 0 ? 'bg-rose-500' : 'bg-emerald-400'}`}
                                    style={{ width: `${Math.max(4, data.wearCargo || 0)}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="bg-black/60 border border-white/10 rounded-xl p-1.5 flex justify-between items-center text-[8.5px] font-mono">
                            <span className="font-bold text-zinc-400">REST-ZUSTAND:</span>
                            <span className="font-mono font-black text-emerald-400">{(100 - (data.wearTruck || 0)).toFixed(0)}%</span>
                          </div>
                        </div>

                        {/* Kraftstoff & Verbrauch */}
                        <div className="col-span-4 bg-[#0d1017] border border-white/[0.08] rounded-2xl p-2.5 flex flex-col justify-between shadow-lg">
                          <div className="flex items-center justify-between border-b border-white/[0.08] pb-1 text-[8.5px] font-black font-mono text-amber-400 uppercase tracking-widest">
                            <span className="flex items-center gap-1"><Fuel size={11} /> KRAFTSTOFF</span>
                            <span className={`px-1.5 py-0.5 rounded border ${
                              data.fuelWarning
                                ? 'text-rose-300 bg-rose-500/15 border-rose-500/40'
                                : 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
                            }`}>
                              {data.fuelWarning ? 'RESERVE' : 'OK'}
                            </span>
                          </div>

                          <div className="space-y-1.5 my-auto">
                            <div className="bg-black/60 border border-white/10 rounded-xl p-1.5 px-2 flex justify-between items-center text-[11px] font-mono">
                              <div className="flex items-center gap-1.5">
                                <Fuel size={12} className={data.fuelWarning ? 'text-rose-400 animate-pulse' : 'text-amber-400'} />
                                <span className="text-[8.5px] font-black text-zinc-200">TANKSTAND</span>
                              </div>
                              <span className="font-black text-white">{typeof data.fuel === 'number' ? Math.round(data.fuel) : 0} L</span>
                            </div>

                            <div className="bg-black/60 border border-white/10 rounded-xl p-1.5 px-2 flex justify-between items-center text-[11px] font-mono">
                              <div className="flex items-center gap-1.5">
                                <Gauge size={12} className="text-sky-400" />
                                <span className="text-[8.5px] font-black text-zinc-200">Ø VERBRAUCH</span>
                              </div>
                              <div className="text-right">
                                <span className="font-black text-white">
                                  {typeof data.avgConsumption === 'number' && data.avgConsumption > 0
                                    ? (data.avgConsumption * 100).toFixed(1)
                                    : '—'}
                                </span>
                                <span className="text-[7.5px] text-sky-400 block font-mono leading-none">L/100 KM</span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-black/60 border border-white/10 rounded-xl p-1.5 flex justify-between items-center text-[8.5px] font-mono">
                            <span className="font-bold text-zinc-400">REICHWEITE:</span>
                            <span className="font-mono font-black text-amber-400">{typeof data.fuelRange === 'number' ? Math.round(data.fuelRange) : 0} KM</span>
                          </div>
                        </div>

                        {/* Systemstatus Warning Indicators */}
                        <div className="col-span-4 bg-[#0d1017] border border-white/[0.08] rounded-2xl p-2.5 flex flex-col justify-between shadow-lg">
                          <div className="flex items-center justify-between border-b border-white/[0.08] pb-1 text-[8.5px] font-black font-mono text-amber-400 uppercase tracking-widest">
                            <span className="flex items-center gap-1"><Info size={11} /> SYSTEMSTATUS</span>
                            <span className="text-emerald-400 font-bold">SDK LIVE</span>
                          </div>

                          <div className="grid grid-cols-1 gap-1 my-auto">
                            {[
                              { label: 'KRAFTSTOFF', warn: !!data.fuelWarning, icon: Fuel },
                              { label: 'ÖLDRUCK', warn: !!data.oilPressureWarning, icon: AlertTriangle },
                              { label: 'KÜHLWASSER', warn: !!data.waterTemperatureWarning, icon: Thermometer },
                              { label: 'BATTERIE', warn: !!data.batteryVoltageWarning, icon: Zap },
                              { label: 'BREMSLUFT', warn: !!data.airPressureWarning, icon: Gauge },
                            ].map((item, idx) => {
                              const IconComp = item.icon;
                              return (
                                <div key={idx} className="bg-black/60 border border-white/10 rounded-lg py-0.5 px-2 flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <IconComp size={11} className={item.warn ? 'text-rose-400 animate-pulse' : 'text-zinc-400'} />
                                    <span className="text-[8px] font-black font-mono text-zinc-300">{item.label}</span>
                                  </div>
                                  <span className={`text-[7.5px] font-mono font-black px-1.5 py-0.2 rounded ${
                                    item.warn
                                      ? 'text-rose-400 bg-rose-500/20 border border-rose-500/40 animate-pulse'
                                      : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'
                                  }`}>
                                    {item.warn ? 'WARNUNG' : 'OK'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          <div className="bg-black/60 border border-white/10 rounded-xl p-1.5 flex justify-between items-center text-[8.5px] font-mono">
                            <span className="font-bold text-zinc-400">PARKBREMSE:</span>
                            <span className={`font-mono font-black ${data.parkBrake ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {data.parkBrake ? 'AKTIV' : 'GELÖST'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- SETTINGS TAB --- */}
            {activeTab === 'settings' && (
              <div className="h-full flex flex-col overflow-hidden">
                <div className="flex-1 flex flex-col p-4 bg-[#0d1117]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden justify-between relative">
                  {/* Subtle Background Aura Glow */}
                  <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                  {/* Settings Header */}
                  <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-3 shrink-0 relative z-10">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 border border-amber-400/40 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/25">
                        <Settings size={20} className="fill-current" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-white tracking-tight">CarPlay Einstellungen</h2>
                        <p className="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest mt-0.5">Design, Textgröße & Alert-Benachrichtigungen</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 flex-1 overflow-hidden min-h-0 relative z-10">
                    {/* Left: Design & Text */}
                    <div className="space-y-2.5 flex flex-col justify-between">
                      {/* CarPlay Theme Selection */}
                      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-xl">
                        <span className="text-[9.5px] font-extrabold text-amber-400 uppercase tracking-widest block mb-2">CarPlay-Design</span>
                        <div className="grid grid-cols-3 gap-2">
                           {[
                             { id: 'dark', label: 'Dunkel', desc: 'Darkmode', accent: 'bg-zinc-950 border-zinc-800' },
                             { id: 'light', label: 'Hell', desc: 'Lightmode', accent: 'bg-slate-200 border-slate-300 text-slate-950' },
                             { id: 'auto', label: 'Automatisch', desc: 'Abblendlicht steuert Tag/Nacht', accent: 'bg-gradient-to-r from-zinc-900 to-slate-200 border-amber-500/50' }
                           ].map((theme, i) => {
                             const isFocused = isSettingsFocused('left', 0, i);
                             const isActive = settings.carPlayTheme === theme.id;
                             return (
                               <button
                                 key={theme.id}
                                 type="button"
                                 onClick={() => updateSetting('carPlayTheme', theme.id as any)}
                                 className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                                   isActive
                                     ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                                     : `${theme.accent} border-transparent hover:border-white/20`
                                 } ${isFocused ? 'ring-2 ring-amber-500 scale-[1.02] z-10' : ''}`}
                               >
                                 <span className={`text-[9.5px] font-black uppercase tracking-wider block ${isActive ? 'text-amber-400' : 'text-white'}`}>
                                   {theme.label}
                                 </span>
                                 <span className="text-[8px] font-bold text-zinc-400 block truncate">
                                   {theme.desc}
                                 </span>
                               </button>
                             );
                           })}
                        </div>
                      </div>

                      {/* Map Theme Selection */}
                      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-xl">
                        <span className="text-[9.5px] font-extrabold text-blue-400 uppercase tracking-widest block mb-2">Karten-Design (Map Mode)</span>
                        <div className="grid grid-cols-3 gap-2">
                           {[
                             { id: 'dark', label: 'Dunkel', desc: 'Dunkle Karte', accent: 'bg-zinc-950 border-zinc-800' },
                             { id: 'light', label: 'Hell', desc: 'Helle Karte', accent: 'bg-slate-200 border-slate-300 text-slate-950' },
                             { id: 'auto', label: 'Automatisch', desc: 'Abblendlicht steuert Tag/Nacht', accent: 'bg-gradient-to-r from-zinc-900 to-slate-200 border-blue-500/50' }
                           ].map((mapTheme, i) => {
                             const isFocused = isSettingsFocused('left', 1, i);
                             const isActive = (settings.carPlayMapTheme || 'auto') === mapTheme.id;
                             return (
                               <button
                                 key={mapTheme.id}
                                 type="button"
                                 onClick={() => updateSetting('carPlayMapTheme', mapTheme.id as any)}
                                 className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                                   isActive
                                     ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                                     : `${mapTheme.accent} border-transparent hover:border-white/20`
                                 } ${isFocused ? 'ring-2 ring-amber-500 scale-[1.02] z-10' : ''}`}
                               >
                                 <span className={`text-[9.5px] font-black uppercase tracking-wider block ${isActive ? 'text-amber-400' : 'text-white'}`}>
                                   {mapTheme.label}
                                 </span>
                                 <span className="text-[8px] font-bold text-zinc-400 block truncate">
                                   {mapTheme.desc}
                                 </span>
                               </button>
                             );
                           })}
                        </div>
                      </div>

                      {/* Text Scale */}
                      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-xl">
                        <span className="text-[9.5px] font-extrabold text-amber-400 uppercase tracking-widest block mb-2">Textgröße</span>
                        <div className="grid grid-cols-3 gap-2">
                           {[
                             { id: 'small', label: 'Klein', size: 'text-xs' },
                             { id: 'medium', label: 'Normal', size: 'text-sm' },
                             { id: 'large', label: 'Groß', size: 'text-base' }
                           ].map((scale, i) => {
                             const isFocused = isSettingsFocused('left', 2, i);
                             const isActive = settings.carPlayTextScale === scale.id;
                             return (
                               <button
                                 key={scale.id}
                                 type="button"
                                 onClick={() => updateSetting('carPlayTextScale', scale.id as any)}
                                 className={`p-2.5 rounded-xl text-center border transition-all cursor-pointer ${
                                   isActive
                                     ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                                     : 'bg-black/40 border-white/10 hover:bg-white/[0.06]'
                                 } ${isFocused ? 'ring-2 ring-amber-500 scale-[1.02] z-10' : ''}`}
                               >
                                 <span className={`font-black uppercase tracking-wider block ${isActive ? 'text-amber-400' : 'text-zinc-300'} ${scale.size}`}>
                                   {scale.label}
                                 </span>
                               </button>
                             );
                           })}
                        </div>
                      </div>

                      {/* Keyboard Navigation Info */}
                      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-xl">
                        <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1.5">Tastatur-Steuerung</span>
                        <div className="flex items-center justify-between text-[9.5px] text-zinc-300 font-bold">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono bg-black/60 px-2 py-0.5 rounded-md text-[8.5px] font-black text-amber-400 border border-white/10">↑↓←→</span>
                            <span>Navigation</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono bg-black/60 px-2 py-0.5 rounded-md text-[8.5px] font-black text-amber-400 border border-white/10">Enter</span>
                            <span>Auswählen</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Notifications (Scrollable with Auto-Scroll on Keyboard/Focus Navigation) */}
                    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 flex flex-col justify-between shadow-xl min-h-0 overflow-hidden">
                      <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest block mb-2 shrink-0">Cockpit-Alerts</span>
                      
                      <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin">
                         {[
                           { key: 'carPlayNotifySpeed', label: 'Geschwindigkeitswarnung', icon: '⚠️' },
                           { key: 'carPlayNotifyFuel', label: 'Kraftstoffwarnung', icon: '⛽' },
                           { key: 'carPlayNotifyRest', label: 'Lenkzeitwarnung', icon: '🕐' },
                           { key: 'carPlayNotifyDamage', label: 'Schadenswarnung', icon: '🔧' },
                           { key: 'carPlayNotifyCargo', label: 'Auftragswarnung', icon: '📦' },
                           { key: 'carPlayNotifyMusic', label: 'Songwechsel', icon: '🎵' },
                           { key: 'carPlayNotifyChat', label: 'Chatnachrichten', icon: '💬' },
                           { key: 'carPlayNotifyNews', label: 'Firmen-News', icon: '📰' },
                           { key: 'carPlayNotifyEvent', label: 'Speditionsevents', icon: '📅' }
                         ].map((item, index) => {
                           const isFocused = isSettingsFocused('right', index);
                           const isChecked = settings[item.key as keyof OverlaySettings] !== false;
                           return (
                             <div
                               key={item.key}
                               ref={(el) => {
                                 if (el && isFocused) {
                                   el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                                 }
                               }}
                               onClick={() => updateSetting(item.key as any, !isChecked)}
                               className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
                                 isFocused
                                   ? 'ring-2 ring-amber-500 bg-amber-500/20 border-amber-400 shadow-md z-10 scale-[1.01]'
                                   : 'bg-black/40 border-white/10 hover:bg-white/[0.06]'
                               }`}
                             >
                               <div className="flex items-center gap-2 min-w-0">
                                 <span className="text-sm shrink-0">{item.icon}</span>
                                 <span className={`text-[10.5px] font-black uppercase tracking-wider truncate ${isFocused ? 'text-amber-400' : 'text-slate-200'}`}>
                                   {item.label}
                                 </span>
                               </div>
                               
                               <div className="relative shrink-0 flex items-center ml-2">
                                 <div className={`w-8 h-4.5 rounded-full transition-all duration-300 relative ${isChecked ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'bg-zinc-800 border border-white/10'}`}>
                                   <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all duration-300 shadow-sm ${isChecked ? 'left-[15px]' : 'left-0.5'}`} />
                                 </div>
                               </div>
                             </div>
                           );
                         })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Maximized Overlay Modals */}
      <AnimatePresence>
        {maximizedWidget === 'map' && (
          <motion.div
            initial={{ opacity: 0, y: 35, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 35, scale: 0.98 }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0.12 }}
            className="absolute inset-0 z-50 bg-[#090b11]/85 backdrop-blur-2xl flex flex-col"
          >
            <div ref={setMaxMapContainerRef} className="flex-1 relative overflow-hidden bg-neutral-950">
              {/* Inline Top Search Input & Floating Results Dropdown (Only on Maximized Map) */}
              <div className="absolute top-4 left-4 z-50 flex flex-col gap-1.5 pointer-events-auto min-w-[420px] max-w-[560px]">
                <div className="flex items-center gap-2">
                <div
                  onClick={() => setMaxMapFocus('search')}
                  className={`relative flex-1 rounded-2xl transition-all ${
                    maxMapFocus === 'search'
                      ? 'ring-4 ring-amber-400 bg-amber-500/20 scale-[1.01] shadow-[0_0_20px_rgba(245,158,11,0.6)]'
                      : ''
                  }`}
                >
                  <Search size={18} className="absolute left-4 top-4 text-zinc-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onFocus={() => {
                      setMaxMapFocus('search');
                      openVirtualKeyboard('city');
                    }}
                    onClick={() => {
                      setMaxMapFocus('search');
                      openVirtualKeyboard('city');
                    }}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSearchSelectedIndex(0);
                    }}
                    placeholder="Firma oder Stadt suchen..."
                    className="w-full bg-[#0d1117]/95 backdrop-blur-2xl border border-white/15 rounded-2xl py-3.5 pl-12 pr-10 text-base font-medium text-white placeholder-zinc-400 focus:outline-none focus:border-amber-500 shadow-2xl transition-all cursor-pointer"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSearchSelectedIndex(0);
                      }}
                      className="absolute right-3.5 top-3.5 text-zinc-400 hover:text-white cursor-pointer transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                </div>

                 {/* Floating Results Dropdown List directly under Search Bar */}
                 {searchQuery.trim().length > 0 && (
                   <div className="w-full bg-[#0d1117]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden max-h-80 overflow-y-auto divide-y divide-white/5">
                    {/* Category Filter Tabs */}
                    <div className="flex items-center gap-1.5 p-2 bg-white/[0.02] border-b border-white/10">
                      <button
                        onClick={() => { setSearchFilter('all'); setSearchSelectedIndex(0); }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                          searchFilter === 'all'
                            ? 'bg-blue-600 text-white font-bold shadow-md'
                            : 'bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-white'
                        }`}
                      >
                        Alle
                      </button>
                      <button
                        onClick={() => { setSearchFilter('companies'); setSearchSelectedIndex(0); }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                          searchFilter === 'companies'
                            ? 'bg-blue-600 text-white font-bold shadow-md'
                            : 'bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-white'
                        }`}
                      >
                        Firmen
                      </button>
                      <button
                        onClick={() => { setSearchFilter('cities'); setSearchSelectedIndex(0); }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                          searchFilter === 'cities'
                            ? 'bg-blue-600 text-white font-bold shadow-md'
                            : 'bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-white'
                        }`}
                      >
                        Städte
                      </button>
                    </div>

                    {(() => {
                      const allResults = searchDestinations(searchQuery);
                      const filtered = allResults.filter(r => {
                        if (searchFilter === 'companies') return r.type === 'company';
                        if (searchFilter === 'cities') return r.type === 'city';
                        return true;
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="p-4 text-center text-xs text-zinc-400 font-medium">
                            Keine Treffer für "{searchQuery}"
                          </div>
                        );
                      }

                       return filtered.map((item, idx) => {
                         const isSelected = idx === searchSelectedIndex;
                         const initial = (item.title || '?').charAt(0).toUpperCase();
                         const companyLogo = item.type === 'company' && item.companyName
                           ? `/company-icons/${item.companyName.toLowerCase()}.png`
                           : null;
                         return (
                           <div
                             key={idx}
                              onClick={() => {
                                const dest = {
                                  dest: item.cityName,
                                  destCompany: item.companyName,
                                  title: item.title,
                                };
                                setPendingDest(dest);
                                setSearchQuery('');
                                setTimeout(() => {
                                  const map = maxMapWidgetRef.current as any;
                                  if (map && 'focusDestinationByGameCoords' in map) {
                                    const company = findCompany(dest.destCompany || '', dest.dest);
                                    if (company) {
                                      map.focusDestinationByGameCoords(company.x, company.z);
                                    } else {
                                      const city = findCity(dest.dest);
                                      if (city) {
                                        map.focusDestination(city.lng, city.lat);
                                      }
                                    }
                                  }
                                }, 50);
                              }}
                             className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all ${
                               isSelected
                                 ? 'bg-white/[0.08]'
                                 : 'hover:bg-white/[0.04]'
                             }`}
                           >
                              <CompanyIcon
                                companyName={item.type === 'company' ? item.companyName : undefined}
                                title={item.title}
                                type={item.type}
                                size="md"
                              />
                             <div className="flex-1 min-w-0">
                               <div className="text-xs font-bold text-white truncate">{item.title}</div>
                               <div className="text-[11px] text-zinc-400 truncate">{item.subtitle}</div>
                             </div>
                             <div className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                               {item.type === 'company' ? 'Firma' : 'Stadt'}
                             </div>
                           </div>
                         );
                       });
                    })()}
                  </div>
                )}
              </div>

              <GameMapWidget
                ref={maxMapWidgetRef}
                gameX={(telemetry as any).posX ?? (telemetry as any).gameX}
                gameY={(telemetry as any).posZ ?? (telemetry as any).gameY}
                heading={telemetry.connected ? telemetry.heading : undefined}
                source={telemetry.connected ? telemetry.source : undefined}
                dest={customDest ? customDest.dest : (telemetry.connected ? telemetry.dest : undefined)}
                destCompany={customDest ? customDest.destCompany : (telemetry.connected ? telemetry.dest_company : undefined)}
                navDistance={telemetry.connected ? telemetry.navDistance : undefined}
                connected={telemetry.connected}
                themeMode={activeMapTheme}
                accentColor="#8b5cf6"
                width={maxMapDims.w}
                height={maxMapDims.h}
                mapId="carplay-max"
                showInstructions
                onDestinationReached={() => {
                  setCustomDest(null);
                  showNotification({
                    title: 'Ziel erreicht! 🏁',
                    message: 'Du bist erfolgreich an deinem Zielort angekommen.',
                    icon: <CheckCircle size={18} />,
                    color: '#10b981',
                  });
                }}
              />

              {/* Authentic European Speed Limit Sign (VZ 274 Realistic Proportion) */}
              <div className="absolute left-6 top-1/2 -translate-y-1/2 z-40 pointer-events-none drop-shadow-[0_10px_25px_rgba(0,0,0,0.85)]">
                <svg
                  width="78"
                  height="78"
                  viewBox="0 0 80 80"
                  className={
                    telemetry.connected && telemetry.speedLimit > 0 && telemetry.speed > telemetry.speedLimit
                      ? 'animate-pulse'
                      : ''
                  }
                >
                  {/* Outer Red Ring */}
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    fill="#ffffff"
                    stroke={
                      telemetry.connected && telemetry.speedLimit > 0 && telemetry.speed > telemetry.speedLimit
                        ? '#e11d48'
                        : '#dc2626'
                    }
                    strokeWidth="7.5"
                  />
                  {/* Authentic Traffic Sign Number */}
                  <text
                    x="40"
                    y="53"
                    textAnchor="middle"
                    fontSize="42"
                    fontWeight="900"
                    fontFamily="Arial, Helvetica, sans-serif"
                    fill="#09090b"
                    letterSpacing="-2"
                  >
                    {telemetry.connected && telemetry.speedLimit > 0 ? Math.round(telemetry.speedLimit) : '80'}
                  </text>
                </svg>
              </div>

              {(pendingDest || customDest) && (
                <motion.div
                  key="bottom-nav"
                  initial={false}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.96 }}
                  transition={{ type: 'spring', duration: 0.25, bounce: 0.1 }}
                  className="absolute bottom-3 left-3 flex items-center gap-3 rounded-2xl px-4 py-3 z-40 bg-zinc-900"
                  style={{
                    background: activeMapTheme === 'dark' ? '#27272a' : '#ffffff',
                    border: activeMapTheme === 'dark' ? '1px solid #3f3f46' : '1px solid #e4e4e7',
                    boxShadow: 'none',
                  }}
                >
                {pendingDest && !customDest && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <CompanyIcon
                        companyName={pendingDest.destCompany}
                        title={pendingDest.title}
                        type={pendingDest.destCompany ? 'company' : 'city'}
                        size="lg"
                        activeMapTheme={activeMapTheme}
                      />
                      <div className="min-w-0">
                        <div className={`text-sm font-bold truncate ${activeMapTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{pendingDest.title}</div>
                        <div className={`text-xs truncate ${activeMapTheme === 'dark' ? 'text-zinc-400' : 'text-gray-500'}`}>
                          {pendingDest.destCompany ? `Firma in ${pendingDest.dest}` : pendingDest.dest}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const dest = pendingDest;
                        setCustomDest(dest);
                        setPendingDest(null);
                        showNotification({
                          title: 'Route gestartet',
                          message: `Navigation zu ${dest.title} gestartet!`,
                          icon: <Navigation size={18} />,
                          color: '#3b82f6',
                        });
                        setTimeout(() => {
                          mapWidgetRef.current?.recenter();
                          maxMapWidgetRef.current?.recenter();
                        }, 100);
                      }}
                      className={`shrink-0 bg-blue-600 hover:bg-blue-500 ${activeMapTheme === 'dark' ? 'text-white' : 'text-gray-900'} text-sm font-bold px-4 py-2 rounded-xl shadow-md transition-all cursor-pointer`}
                    >
                      Route starten
                    </button>
                  </div>
                )}

                {customDest && !pendingDest && (
                  <>
                    <button
                      onClick={() => {
                        mapWidgetRef.current?.clearRoute();
                        maxMapWidgetRef.current?.clearRoute();
                        setCustomDest(null);
                        setPendingDest(null);
                      }}
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0"
                      style={{
                        background: activeMapTheme === 'dark' ? '#3f3f46' : '#f4f4f5',
                        color: activeMapTheme === 'dark' ? '#e4e4e7' : '#18181b',
                      }}
                      title="Navigation abbrechen"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>

                    <div className="w-px h-5" style={{ background: activeMapTheme === 'dark' ? '#52525b' : '#d4d4d8' }} />

                    <div className="flex items-center gap-2">
                      <span className="text-base font-black font-mono tracking-tight" style={{ color: activeMapTheme === 'dark' ? '#fafafa' : '#18181b' }}>
                        {getRemainingSeconds() ? formatRemainingTime(getRemainingSeconds()!) : '--'}
                      </span>
                      <span className="text-sm font-bold" style={{ color: activeMapTheme === 'dark' ? '#a1a1aa' : '#71717a' }}>·</span>
                      <span className="text-base font-black font-mono tracking-tight" style={{ color: activeMapTheme === 'dark' ? '#fafafa' : '#18181b' }}>
                        {formatDistance(data.navDistance) || '--'}
                      </span>
                    </div>

                    <div className="w-px h-5" style={{ background: activeMapTheme === 'dark' ? '#52525b' : '#d4d4d8' }} />

                    <span className="text-base font-black font-mono tracking-tight" style={{ color: activeMapTheme === 'dark' ? '#fafafa' : '#18181b' }}>
                      {getRemainingSeconds() ? formatETA(getRemainingSeconds()!) : '--:--'}
                    </span>
                  </>
                )}
              </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* --- FULLSCREEN MINIMALIST PURE-BLACK TRUCK DIGITAL INSTRUMENT CLUSTER (TACHO HUD) --- */}
        {maximizedWidget === 'diagnostics' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0.05 }}
            className="fixed inset-0 z-[99999] bg-black p-4 flex flex-col justify-between overflow-hidden shadow-2xl font-outfit select-none"
          >
            {/* TOP STATUS STRIP: CENTERED REAL SVG VEHICLE TELL-TALE INDICATORS ON PURE BLACK */}
            <div className="flex justify-center items-center border-b border-zinc-900 pb-2 shrink-0 w-full">
              <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-900 px-4 py-1.5 rounded-xl shadow-inner">
                {[
                  {
                    id: 'left',
                    active: data.blinkerLeftOn,
                    color: 'text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]',
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                      </svg>
                    ),
                  },
                  {
                    id: 'beamLow',
                    active: data.lightsBeamLow,
                    color: 'text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]',
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5A7 7 0 0 1 12 19V5z" fill="currentColor" fillOpacity="0.2"/>
                        <line x1="5" y1="9" x2="8" y2="10" />
                        <line x1="4" y1="12" x2="8" y2="12" />
                        <line x1="5" y1="15" x2="8" y2="14" />
                      </svg>
                    ),
                  },
                  {
                    id: 'beamHigh',
                    active: data.lightsBeamHigh,
                    color: 'text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.9)]',
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M13 5A7 7 0 0 1 13 19V5z" fill="currentColor" fillOpacity="0.3"/>
                        <line x1="4" y1="8" x2="9" y2="8" />
                        <line x1="3" y1="12" x2="9" y2="12" />
                        <line x1="4" y1="16" x2="9" y2="16" />
                      </svg>
                    ),
                  },
                  {
                    id: 'beacon',
                    active: data.lightsBeacon,
                    color: 'text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)]',
                    icon: <AlertTriangle size={17} />,
                  },
                  {
                    id: 'brake',
                    active: data.parkBrake,
                    color: 'text-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.9)]',
                    icon: (
                      <div className="font-mono font-black text-[11px] border-2 border-current rounded-full w-5 h-5 flex items-center justify-center leading-none">
                        P
                      </div>
                    ),
                  },
                  {
                    id: 'fuel',
                    active: data.fuelWarning,
                    color: 'text-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.9)]',
                    icon: <Fuel size={17} />,
                  },
                  {
                    id: 'oil',
                    active: data.oilPressureWarning,
                    color: 'text-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.9)]',
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 16c0 2.21 1.79 4 4 4s4-1.79 4-4c0-2.5-4-7.1-4-7.1S6 13.5 6 16z" />
                      </svg>
                    ),
                  },
                  {
                    id: 'right',
                    active: data.blinkerRightOn,
                    color: 'text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]',
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z" />
                      </svg>
                    ),
                  },
                ].map((ind) => (
                  <div
                    key={ind.id}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all border ${
                      ind.active
                        ? `${ind.color} bg-black border-zinc-700 scale-105`
                        : 'text-zinc-800 bg-transparent border-transparent opacity-20'
                    }`}
                  >
                    {ind.icon}
                  </div>
                ))}
              </div>
            </div>

            {/* MAIN 3-COLUMN PURE-BLACK INSTRUMENT CLUSTER */}
            <div className="flex-1 grid grid-cols-12 gap-4 min-h-0 py-2">
              {/* === LEFT WING: MINIMALIST SPEEDOMETER DIAL === */}
              <div className="col-span-4 bg-black border border-zinc-900 rounded-2xl p-4 flex flex-col justify-between shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2 z-10">
                  <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest flex items-center gap-1.5 font-mono">
                    <Gauge size={14} /> GESCHWINDIGKEIT
                  </span>
                  {data.speedLimit > 0 && (
                    <div className="w-8 h-8 rounded-full bg-white border-2 border-red-600 flex items-center justify-center text-black font-black text-xs shadow-md">
                      {Math.round(data.speedLimit)}
                    </div>
                  )}
                </div>

                {/* Minimalist Circular Speedometer Core */}
                <div className="flex-1 flex flex-col items-center justify-center py-2 z-10">
                  <div className="relative w-52 h-52 rounded-full border-2 border-zinc-800 bg-black flex flex-col items-center justify-center shadow-[0_0_40px_rgba(0,0,0,1)]">
                    <span
                      className="font-black text-white leading-none tracking-tighter font-mono tabular-nums no-cp-scale drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]"
                      style={{ fontSize: '80px', lineHeight: '1' }}
                    >
                      {Math.round(speed)}
                    </span>
                    <span className="text-xs font-black uppercase tracking-widest text-amber-400 mt-2 font-mono">KM / H</span>
                  </div>

                  {/* Minimalist Speed Bar */}
                  <div className="w-full mt-4 space-y-1">
                    <div className="flex gap-1 h-3 w-full bg-zinc-950 p-0.5 rounded border border-zinc-900">
                      {Array.from({ length: 16 }).map((_, i) => {
                        const activeBars = Math.round((Math.min(140, speed) / 140) * 16);
                        const isActive = i < activeBars;
                        const isHighSpeed = i >= 10;
                        return (
                          <div
                            key={i}
                            className={`flex-1 rounded-xs transition-all duration-150 ${
                              isActive
                                ? isHighSpeed
                                  ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                                  : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                                : 'bg-zinc-900/60'
                            }`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-[8.5px] font-mono text-zinc-600 font-black px-0.5">
                      <span>0</span>
                      <span>40</span>
                      <span>80</span>
                      <span>120</span>
                      <span>140 KM/H</span>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-2.5 flex items-center justify-between z-10">
                  <span className="text-[9.5px] font-black text-zinc-400 uppercase tracking-wider font-mono">TEMPOMAT</span>
                  <span className={`text-xs font-mono font-black ${data.cruiseControl && data.cruiseControl > 0 ? 'text-emerald-400' : 'text-zinc-600'}`}>
                    {data.cruiseControl && data.cruiseControl > 0 ? `${Math.round(data.cruiseControl)} KM/H [AKTIV]` : 'OFF'}
                  </span>
                </div>
              </div>

              {/* === CENTER WING: MULTI-FUNCTION DISPLAY (MFD) === */}
              <div className="col-span-4 bg-black border border-zinc-900 rounded-2xl p-2.5 flex flex-col justify-between shadow-2xl relative overflow-hidden">
                {/* MFD Content Area */}
                <div className="flex-1 flex flex-col min-h-0 relative z-10">
                  {/* Mode 0: Live GPS Navigation Map */}
                  {mfdMode === 0 && (
                    <div className="w-full h-full flex-1 flex flex-col rounded-xl overflow-hidden border border-zinc-900 relative bg-black">
                      <GameMapWidget
                        ref={maxMapWidgetRef}
                        gameX={(telemetry as any).posX ?? (telemetry as any).gameX}
                        gameY={(telemetry as any).posZ ?? (telemetry as any).gameY}
                        heading={telemetry.connected ? telemetry.heading : undefined}
                        source={telemetry.connected ? telemetry.source : undefined}
                        dest={customDest ? customDest.dest : (telemetry.connected ? telemetry.dest : undefined)}
                        destCompany={customDest ? customDest.destCompany : (telemetry.connected ? telemetry.dest_company : undefined)}
                        navDistance={telemetry.connected ? telemetry.navDistance : undefined}
                        connected={telemetry.connected}
                        themeMode={activeMapTheme}
                        accentColor="#8b5cf6"
                        width="100%"
                        height="100%"
                        mapId="tacho-mfd-map"
                        showInstructions
                        fullWidthInstructions
                      />
                    </div>
                  )}

                  {/* Mode 1: Musikwiedergabe */}
                  {mfdMode === 1 && (
                    <div className="w-full h-full flex flex-col justify-between p-4 rounded-xl border border-zinc-900 bg-black relative overflow-hidden">
                      {albumArtSrc && (
                        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-30">
                          <img src={albumArtSrc} alt="" className="w-full h-full object-cover blur-2xl scale-125" />
                        </div>
                      )}
                      <div className="relative z-10 flex items-center justify-between border-b border-zinc-900 pb-2">
                        <span className="text-[9.5px] font-black uppercase text-amber-400 tracking-widest flex items-center gap-1.5 font-mono">
                          <Music size={14} /> MEDIENWIEDERGABE
                        </span>
                        <span className="text-[8.5px] font-black uppercase text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded font-mono">
                          {media?.source || 'SPOTIFY'}
                        </span>
                      </div>

                      {media ? (
                        <div className="relative z-10 my-auto text-center space-y-2">
                          <h3 className="text-lg font-black text-white truncate drop-shadow">{media.title}</h3>
                          <p className="text-xs font-bold text-amber-400 truncate">{media.artist}</p>

                          {/* Timeline Progress */}
                          {media.duration > 0 && (
                            <div className="space-y-1 pt-2">
                              <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800 p-0.5">
                                <div
                                  className="h-full bg-amber-400 rounded-full"
                                  style={{ width: `${getProgressPercent(media.progress, media.duration)}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[9px] font-mono font-black text-zinc-400">
                                <span>{formatMediaTime(media.progress, media.duration)}</span>
                                <span>{formatMediaTime(media.duration)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="relative z-10 my-auto text-center text-zinc-600 text-xs font-black uppercase font-mono">
                          Keine aktive Musikwiedergabe
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mode 2: Fahrdaten & Trip Computer */}
                  {mfdMode === 2 && (
                    <div className="w-full h-full flex flex-col justify-between p-3.5 rounded-xl border border-zinc-900 bg-black space-y-2">
                      <span className="text-[9.5px] font-black uppercase text-amber-400 tracking-widest block border-b border-zinc-900 pb-1.5 font-mono">
                        ⚡ FAHRDATEN & TRIP BORDCOMPUTER
                      </span>
                      <div className="grid grid-cols-2 gap-2 my-auto">
                        <div className="bg-zinc-950 border border-zinc-900 p-2.5 rounded-xl text-center">
                          <span className="text-[8.5px] font-black text-zinc-400 uppercase block mb-0.5">Ø VERBRAUCH</span>
                          <span className="text-lg font-black text-white font-mono block">
                            {data.avgConsumption ? `${(data.avgConsumption * 100).toFixed(1)}` : '—'}
                          </span>
                          <span className="text-[8px] font-black text-amber-400 font-mono">L / 100 KM</span>
                        </div>

                        <div className="bg-zinc-950 border border-zinc-900 p-2.5 rounded-xl text-center">
                          <span className="text-[8.5px] font-black text-zinc-400 uppercase block mb-0.5">REST-LENKZEIT</span>
                          <span className="text-lg font-black text-amber-400 font-mono block">
                            {data.nextRest && data.nextRest > 0 ? formatRemainingTime(data.nextRest * 60) : '—'}
                          </span>
                          <span className="text-[8px] font-black text-zinc-500 font-mono">BIS PAUSE</span>
                        </div>

                        <div className="bg-zinc-950 border border-zinc-900 p-2.5 rounded-xl text-center">
                          <span className="text-[8.5px] font-black text-zinc-400 uppercase block mb-0.5">REICHWEITE</span>
                          <span className="text-lg font-black text-white font-mono block">
                            {Math.round(data.fuelRange)} km
                          </span>
                          <span className="text-[8px] font-black text-emerald-400 font-mono">TANK OK</span>
                        </div>

                        <div className="bg-zinc-950 border border-zinc-900 p-2.5 rounded-xl text-center">
                          <span className="text-[8.5px] font-black text-zinc-400 uppercase block mb-0.5">Ø TEMPO</span>
                          <span className="text-lg font-black text-zinc-600 font-mono block">—</span>
                          <span className="text-[8px] font-black text-zinc-600 font-mono">KM / H</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mode 3: Getriebe & Telemetrie */}
                  {mfdMode === 3 && (
                    <div className="w-full h-full flex flex-col justify-between p-3.5 rounded-xl border border-zinc-900 bg-black space-y-2">
                      <span className="text-[9.5px] font-black uppercase text-amber-400 tracking-widest block border-b border-zinc-900 pb-1.5 font-mono">
                        ⚙️ GETRIEBE & SYSTEM-DRUCK
                      </span>
                      <div className="bg-zinc-950 border border-zinc-900 p-3 rounded-xl text-center my-auto">
                        <span className="text-[8.5px] font-mono font-black text-zinc-500 uppercase block mb-0.5">FAHRSTUFE</span>
                        <span className="text-5xl font-black text-amber-400 font-mono block tracking-wider drop-shadow">
                          {gear > 0 ? `D${gear}` : gear < 0 ? `R${Math.abs(gear)}` : 'N'}
                        </span>
                        <span className="text-[8px] font-mono text-zinc-500 uppercase block mt-1">AUTOMATIC SHIFTING</span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 text-center text-[8.5px]">
                        <div className="bg-zinc-950 p-1.5 rounded-lg border border-zinc-900">
                          <span className="text-zinc-500 block font-mono">KÜHLWASSER</span>
                          <span className={`text-xs font-black font-mono ${data.waterTemperatureWarning ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {data.waterTemperatureWarning ? 'WARN' : 'OK'}
                          </span>
                        </div>
                        <div className="bg-zinc-950 p-1.5 rounded-lg border border-zinc-900">
                          <span className="text-zinc-500 block font-mono">ÖLDRUCK</span>
                          <span className={`text-xs font-black font-mono ${data.oilPressureWarning ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {data.oilPressureWarning ? 'WARN' : 'OK'}
                          </span>
                        </div>
                        <div className="bg-zinc-950 p-1.5 rounded-lg border border-zinc-900">
                          <span className="text-zinc-500 block font-mono">BREMSLUFT</span>
                          <span className={`text-xs font-black font-mono ${data.airPressureWarning ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {data.airPressureWarning ? 'WARN' : 'OK'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mode 4: Truck Fahrzeug-Info & Zustand */}
                  {mfdMode === 4 && (
                    <div className="w-full h-full flex flex-col justify-between p-3.5 rounded-xl border border-zinc-900 bg-black space-y-2">
                      <span className="text-[9.5px] font-black uppercase text-amber-400 tracking-widest block border-b border-zinc-900 pb-1.5 font-mono">
                        🚛 FAHRZEUG-STATUS & ZUSTAND
                      </span>
                      <div className="space-y-2 my-auto">
                        <div className="bg-zinc-950 border border-zinc-900 p-2 rounded-xl flex justify-between items-center">
                          <span className="text-xs font-black text-zinc-300 font-mono">MOTOR & GETRIEBE</span>
                          <span className="text-xs font-mono font-black text-emerald-400">
                            {(100 - data.wearTruck).toFixed(0)}% OK
                          </span>
                        </div>

                        <div className="bg-zinc-950 border border-zinc-900 p-2 rounded-xl flex justify-between items-center">
                          <span className="text-xs font-black text-zinc-300 font-mono">FRACHTSCHADEN</span>
                          <span className={`text-xs font-mono font-black ${data.wearCargo && data.wearCargo > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {data.wearCargo ? `${data.wearCargo.toFixed(0)}%` : '0%'}
                          </span>
                        </div>

                        <div className="bg-zinc-950 border border-zinc-900 p-2 rounded-xl flex justify-between items-center">
                          <span className="text-xs font-black text-zinc-300 font-mono">FRACHT-STATUS</span>
                          <span className="text-xs font-mono font-black text-amber-400 truncate max-w-[140px]">
                            {data.cargo || 'KEINE LADUNG'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* MFD Mode Selector Tabs */}
                <div className="grid grid-cols-5 gap-1 pt-2 shrink-0 border-t border-zinc-900 z-10">
                  {[
                    { id: 0, label: 'Karte', icon: MapPin },
                    { id: 1, label: 'Musik', icon: Music },
                    { id: 2, label: 'Trip', icon: Zap },
                    { id: 3, label: 'Getriebe', icon: Settings },
                    { id: 4, label: 'LKW', icon: Truck },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = mfdMode === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setMfdMode(tab.id)}
                        className={`py-1 px-1 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer border ${
                          isActive
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                            : 'bg-zinc-950 border-zinc-900 text-zinc-600 hover:text-zinc-300'
                        }`}
                      >
                        <Icon size={12} className={isActive ? 'text-amber-400' : 'text-zinc-600'} />
                        <span className="text-[7.5px] font-black uppercase tracking-wider mt-0.5 font-mono">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* === RIGHT WING: MINIMALIST TACHOMETER DIAL & GANG === */}
              <div className="col-span-4 bg-black border border-zinc-900 rounded-2xl p-4 flex flex-col justify-between shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2 z-10">
                  <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest flex items-center gap-1.5 font-mono">
                    <Zap size={14} /> DREHZAHL RPM
                  </span>
                  <span className={`text-[8.5px] font-mono font-black px-2 py-0.5 rounded border ${
                    rpm > 1800
                      ? 'text-rose-400 bg-rose-500/20 border-rose-500/50 animate-pulse'
                      : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                  }`}>
                    {rpm > 1800 ? 'HIGH RPM' : 'ECO DRIVE'}
                  </span>
                </div>

                {/* Minimalist Circular Tachometer Core */}
                <div className="flex-1 flex flex-col items-center justify-center py-2 z-10">
                  <div className="relative w-52 h-52 rounded-full border-2 border-zinc-800 bg-black flex flex-col items-center justify-center shadow-[0_0_40px_rgba(0,0,0,1)]">
                    <span
                      className="font-black text-white leading-none tracking-tighter font-mono tabular-nums no-cp-scale drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]"
                      style={{ fontSize: '72px', lineHeight: '1' }}
                    >
                      {Math.round(rpm)}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mt-1 font-mono">RPM</span>

                    {/* Integrated Digital Gear Badge */}
                    <div className="mt-2 bg-amber-500/20 border border-amber-500/40 px-3.5 py-0.5 rounded-lg">
                      <span className="text-base font-black text-amber-400 font-mono">
                        {gear > 0 ? `D${gear}` : gear < 0 ? `R${Math.abs(gear)}` : 'N'}
                      </span>
                    </div>
                  </div>

                  {/* Minimalist RPM Bar */}
                  <div className="w-full mt-4 space-y-1">
                    <div className="flex gap-1 h-3 w-full bg-zinc-950 p-0.5 rounded border border-zinc-900">
                      {Array.from({ length: 16 }).map((_, i) => {
                        const activeBars = Math.round((Math.min(2500, rpm) / 2500) * 16);
                        const isActive = i < activeBars;
                        const isWarning = i >= 11;
                        const isEco = i < 9;
                        return (
                          <div
                            key={i}
                            className={`flex-1 rounded-xs transition-all duration-150 ${
                              isActive
                                ? isWarning
                                  ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                                  : isEco
                                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                                  : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                                : 'bg-zinc-900/60'
                            }`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-[8.5px] font-mono text-zinc-600 font-black px-0.5">
                      <span>0</span>
                      <span className="text-emerald-400">1000 ECO</span>
                      <span>1800</span>
                      <span className="text-rose-400">2500 RPM</span>
                    </div>
                  </div>
                </div>

                {/* Minimalist Tank & Zustand Strip */}
                <div className="space-y-2 bg-zinc-950 border border-zinc-900 rounded-xl p-2.5 z-10">
                  <div>
                    <div className="flex justify-between text-[8.5px] font-mono font-black text-zinc-300 mb-0.5">
                      <span>TANK: {Math.round(data.fuel)}L</span>
                      <span className="text-amber-400">{Math.round(data.fuelRange)} KM</span>
                    </div>
                    <div className="flex gap-0.5 h-2 w-full bg-black rounded-sm overflow-hidden p-0.5 border border-zinc-900">
                      {Array.from({ length: 10 }).map((_, i) => {
                        const activeBars = Math.round((Math.min(400, data.fuel) / 400) * 10);
                        return (
                          <div
                            key={i}
                            className={`flex-1 rounded-xs transition-all ${
                              i < activeBars
                                ? data.fuelWarning
                                  ? 'bg-rose-500'
                                  : 'bg-amber-400'
                                : 'bg-zinc-900/40'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[8.5px] font-mono font-black text-zinc-300 mb-0.5">
                      <span>ZUSTAND</span>
                      <span className={data.wearTruck > 10 ? 'text-rose-400' : 'text-emerald-400'}>
                        {(100 - data.wearTruck).toFixed(0)}% OK
                      </span>
                    </div>
                    <div className="flex gap-0.5 h-2 w-full bg-black rounded-sm overflow-hidden p-0.5 border border-zinc-900">
                      {Array.from({ length: 10 }).map((_, i) => {
                        const activeBars = Math.round((Math.max(0, 100 - data.wearTruck) / 100) * 10);
                        return (
                          <div
                            key={i}
                            className={`flex-1 rounded-xs transition-all ${
                              i < activeBars
                                ? data.wearTruck > 10
                                  ? 'bg-rose-500'
                                  : 'bg-emerald-400'
                                : 'bg-zinc-900/40'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* ON-SCREEN VIRTUAL KEYBOARD OVERLAY (CARPLAY FULL WIDTH) */}
      <AnimatePresence>
        {isVirtualKbOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed inset-x-2 bottom-2 z-[999999] bg-[#0d1117]/98 backdrop-blur-2xl border border-white/20 rounded-3xl p-3.5 shadow-[0_25px_60px_rgba(0,0,0,0.98)] flex flex-col gap-3 pointer-events-auto"
          >
            {/* Header / Input Live Preview Box */}
            <div className="flex items-center justify-between bg-black/80 border border-white/15 rounded-2xl px-4 py-2.5 shadow-inner">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  onClick={() => setVirtualKbTarget((prev) => (prev === 'radio' ? 'city' : 'radio'))}
                  title="Zwischen Radio-Suche & Stadt-Suche wechseln"
                  className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 text-xs font-mono font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  <Keyboard size={16} />
                  <span>{virtualKbTarget === 'radio' ? '📻 RADIO' : '🏙️ STADT'}</span>
                </button>
                <div className="flex items-center min-w-0 flex-1">
                  <span className="text-base font-black font-mono text-white tracking-wider truncate">
                    {virtualKbTarget === 'radio' ? (radioSearch || 'Radio-Sender suchen...') : (searchQuery || 'Stadt / Firma suchen...')}
                  </span>
                  <span className="w-2.5 h-5 bg-amber-400 ml-1 animate-pulse shrink-0 rounded-xs" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleVirtualKeyPress('CLEAR')}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold font-mono transition-all cursor-pointer border border-white/10"
                >
                  LÖSCHEN
                </button>
                <button
                  onClick={() => setIsVirtualKbOpen(false)}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer border border-white/10"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Keyboard Key Grid - Spans 100% Width */}
            <div className="flex flex-col gap-2 w-full">
              {(kbMode === 'abc' ? KB_ROWS_ABC : KB_ROWS_123).map((row, rIdx) => (
                <div key={rIdx} className="flex w-full gap-2 justify-between">
                  {row.map((key, cIdx) => {
                    const isFocused = kbRow === rIdx && kbCol === cIdx;
                    let label: React.ReactNode = key;
                    let flexClass = 'flex-1 h-12 text-base font-black';

                    if (key === 'BACKSPACE') {
                      label = <Delete size={20} />;
                      flexClass = 'flex-[1.5] h-12 text-xs font-black';
                    } else if (key === 'ENTER') {
                      label = <CornerDownLeft size={20} />;
                      flexClass = 'flex-[1.5] h-12 text-xs font-black';
                    } else if (key === 'SPACE') {
                      label = '␣ LEERZEICHEN';
                      flexClass = 'flex-[5] h-12 text-xs font-black';
                    } else if (key === 'MODE') {
                      label = kbMode === 'abc' ? '123 / SYM' : 'ABC';
                      flexClass = 'flex-[2] h-12 text-xs font-black';
                    } else if (key === 'CLOSE') {
                      label = 'SCHLIESSEN';
                      flexClass = 'flex-[2] h-12 text-xs font-black';
                    } else if (key === 'CLEAR') {
                      label = 'LÖSCHEN';
                      flexClass = 'flex-[1.5] h-12 text-xs font-black';
                    }

                    return (
                      <button
                        key={cIdx}
                        onClick={() => {
                          setKbRow(rIdx);
                          setKbCol(cIdx);
                          handleVirtualKeyPress(key);
                        }}
                        className={`${flexClass} rounded-2xl border flex items-center justify-center transition-all cursor-pointer shadow-lg ${
                          isFocused
                            ? 'ring-4 ring-amber-400 bg-amber-400 text-slate-950 font-black scale-[1.03] z-20 border-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.9)]'
                            : 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CARPLAY STARTUP LOADING SCREEN OVERLAY */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 bg-black z-[9999998] flex flex-col items-center justify-center font-['Outfit',sans-serif] p-6 text-center select-none"
          >
            <div className="relative w-24 h-24 mb-5 flex items-center justify-center">
              <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-2xl animate-pulse" />
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500/20 to-amber-600/5 border border-amber-500/30 flex items-center justify-center shadow-[0_0_35px_rgba(245,158,11,0.25)] relative">
                <Truck className="w-10 h-10 text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
              </div>
            </div>
            <h1 className="text-2xl font-black font-['Unbounded',sans-serif] text-white tracking-wider uppercase mb-1">
              Open Pipe Club
            </h1>
            <p className="text-[11px] font-bold text-amber-400 font-mono uppercase tracking-[0.3em] mb-7">
              CarPlay Dashboard
            </p>
            <div className="w-44 h-1.5 bg-white/10 rounded-full overflow-hidden relative shadow-inner">
              <div className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 rounded-full animate-carplay-slide shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
            </div>
            <span className="text-[11px] font-mono text-zinc-500 mt-3 animate-pulse">CarPlay wird gestartet...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INSTANT CARPLAY BLACKOUT OVERLAY */}
      {isBlackout && (
        <div className="fixed inset-0 bg-black z-[9999999] pointer-events-auto cursor-none flex items-center justify-center select-none" />
      )}

    </>
  );
}
