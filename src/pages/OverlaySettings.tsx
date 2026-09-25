import { useState, useEffect, useRef } from 'react';
import { Monitor, Lock, Unlock, Sliders, SlidersHorizontal, RefreshCw, Check, Eye, EyeOff, LayoutTemplate, Palette, X, Pipette, ArrowUpDown, Keyboard, LayoutGrid, Globe, Copy, ExternalLink, Smartphone, Wifi, Upload, Image as ImageIcon, Trash2, RotateCcw, Sparkles, Layers, CheckCircle2, Truck, FolderOpen, Maximize2, Plus, Download, HelpCircle, Type, Zap, Crop, ZoomIn, ZoomOut, Server, LogIn, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme, hexToRgbValues, DEFAULT_APPEARANCE } from '../context/ThemeContext';
import apiService from '../services/api';

interface Position {
  x: number;
  y: number;
}

interface Positions {
  [key: string]: Position;
}

interface WidgetSize {
  w: number; // width in pixels
  h: number; // height in pixels (0 = auto)
}

interface OverlaySettingsType {
  style: 'neon' | 'carbon' | 'minimal' | 'custom';
  layoutType: 'vertical' | 'horizontal' | 'grid';
  showLogo: boolean;
  showMainHud: boolean;
  showDrivers: boolean;
  showEvent: boolean;
  showSpotify: boolean;
  showGameMap: boolean;
  showTrafficLight?: boolean;
  trafficLightVariant?: 'compact' | 'large';
  widgetOrder: string[];
  zoom: number;
  bgOpacity: number;
  showGear: boolean;
  showSpeed: boolean;
  showFuel: boolean;
  showRemainingDistance: boolean;
  showETA: boolean;
  showCargo: boolean;
  showIncome: boolean;
  widgetSizes: Record<string, WidgetSize>;
  singleRowHud: boolean;
  customAccentColor: string;
  blockCollisions?: boolean;
  cityEntryNotify?: boolean;
  trafficJamNotify?: boolean;
  trafficServer?: string;
  showCarPlay: boolean;
  carPlayTheme: 'dark' | 'light' | 'auto';
  carPlayTextScale: 'small' | 'medium' | 'large';
  carPlayShowNavInstructions?: boolean;
  carPlayHotkeys: {
    toggle: string;
    next: string;
    prev: string;
    home: string;
    playPause: string;
  };
  carPlayNotifySpeed?: boolean;
  carPlayNotifyFuel?: boolean;
  carPlayNotifyRest?: boolean;
  carPlayNotifyDamage?: boolean;
  carPlayNotifyCargo?: boolean;
  carPlayNotifyMusic?: boolean;
  carPlayNotifyChat?: boolean;
  carPlayNotifyNews?: boolean;
  carPlayNotifyEvent?: boolean;
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

const DiscordIcon = ({ size = 18, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

const APP_ACCENT_PRESETS = [
  { name: 'Amber Orange', hex: '#f59e0b' },
  { name: 'Eiscyan (Neon)', hex: '#06b6d4' },
  { name: 'Smaragdgrün', hex: '#10b981' },
  { name: 'Apple Blau', hex: '#007aff' },
  { name: 'Cyber Violett', hex: '#8b5cf6' },
  { name: 'Sunset Pink', hex: '#ec4899' },
  { name: 'Racing Rot', hex: '#ef4444' },
  { name: 'Elektrogelb', hex: '#eab308' },
];

export interface TmpBgSlot {
  id: string;
  slot: number;
  name: string;
  thumb: string;
  dataUrl?: string;
  filePath?: string;
  isCustom?: boolean;
}

const TMP_COLOR_PRESETS = [
  { name: 'Open Pipe Club Gold', hex: '#f59e0b', desc: 'Standard Open Pipe Club Gold' },
  { name: 'Cyber Cyan', hex: '#06b6d4', desc: 'Leuchtendes Neon-Cyan' },
  { name: 'Racing Rot', hex: '#ef4444', desc: 'Sportliches Rennrot' },
  { name: 'Cyber Violett', hex: '#8b5cf6', desc: 'Kräftiges Neon-Lila' },
  { name: 'Smaragdgrün', hex: '#10b981', desc: 'Edles Smaragdgrün' },
  { name: 'Apple Blau', hex: '#007aff', desc: 'Klassisches Blau' },
  { name: 'Sunset Pink', hex: '#ec4899', desc: 'Leuchtendes Pink' },
  { name: 'Toxic Lime', hex: '#84cc16', desc: 'Frisches Giftgrün' },
  { name: 'Silberweiß / Titan', hex: '#e2e8f0', desc: 'Clean Silberweiß' },
];

const DEFAULT_WIDGET_SIZES: Record<string, WidgetSize> = {
  logo: { w: 80, h: 80 },
  mainHud: { w: 384, h: 120 },
  event: { w: 288, h: 64 },
  drivers: { w: 192, h: 0 }, // 0 = auto‑height (flex column)
  spotify: { w: 280, h: 140 },
  gameMap: { w: 300, h: 200 },
  trafficLight: { w: 70, h: 160 }
};

const getWidgetDefaultSize = (widget: string, singleRowHud: boolean): WidgetSize => {
  if (widget === 'mainHud') {
    return singleRowHud ? { w: 680, h: 52 } : { w: 384, h: 120 };
  }
  return DEFAULT_WIDGET_SIZES[widget] || { w: 80, h: 80 };
};

const hexToHsv = (hex: string) => {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;

  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, v = max;

  let d = max - min;
  s = max === 0 ? 0 : d / max;

  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(v * 100)
  };
};

const hsvToHex = (h: number, s: number, v: number): string => {
  s /= 100;
  v /= 100;
  let i = Math.floor(h / 60);
  let f = h / 60 - i;
  let p = v * (1 - s);
  let q = v * (1 - f * s);
  let t = v * (1 - (1 - f) * s);
  let r = 0, g = 0, b = 0;

  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }

  let rHex = Math.round(r * 255).toString(16).padStart(2, '0');
  let gHex = Math.round(g * 255).toString(16).padStart(2, '0');
  let bHex = Math.round(b * 255).toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
};

const hsvToRgb = (h: number, s: number, v: number) => {
  s /= 100;
  v /= 100;
  let i = Math.floor(h / 60);
  let f = h / 60 - i;
  let p = v * (1 - s);
  let q = v * (1 - f * s);
  let t = v * (1 - (1 - f) * s);
  let r = 0, g = 0, b = 0;

  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
};

const rgbToHsv = (r: number, g: number, b: number) => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(v * 100)
  };
};

const hexToRgb = (hex: string) => {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  return { r, g, b };
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = Math.min(255, Math.max(0, x)).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

const COLOR_PRESETS = [
  { name: 'Open Pipe Club Gold', hex: '#f59e0b', desc: 'Standard Open Pipe Club Gold' },
  { name: 'Electric Blue', hex: '#3b82f6', desc: 'Kräftiges Blau' },
  { name: 'Deep Purple', hex: '#8b5cf6', desc: 'Edles Violett' },
  { name: 'Neon Pink', hex: '#ec4899', desc: 'Leuchtendes Pink' },
  { name: 'Ruby Red', hex: '#ef4444', desc: 'Sportliches Rot' },
  { name: 'Sunset Orange', hex: '#f97316', desc: 'Warmes Orange' },
  { name: 'Gold Yellow', hex: '#eab308', desc: 'Klassisches Goldgelb' },
  { name: 'Acid Green', hex: '#10b981', desc: 'Giftiges Grün' },
  { name: 'Mint Fresh', hex: '#22c55e', desc: 'Frisches Mintgrün' },
  { name: 'White Silver', hex: '#e2e8f0', desc: 'Clean Silberweiß' }
];

const DEFAULT_SETTINGS: OverlaySettingsType = {
  style: 'neon',
  layoutType: 'vertical',
  showLogo: true,
  showMainHud: true,
  showDrivers: true,
  showEvent: true,
  showSpotify: true,
  showGameMap: true,
  showTrafficLight: true,
  trafficLightVariant: 'compact',
  widgetOrder: ['logo', 'mainHud', 'event', 'drivers', 'spotify', 'gameMap', 'trafficLight'],
  zoom: 100,
  bgOpacity: 80,
  showGear: true,
  showSpeed: true,
  showFuel: true,
  showRemainingDistance: true,
  showETA: true,
  showCargo: true,
  showIncome: true,
  widgetSizes: { ...DEFAULT_WIDGET_SIZES },
  singleRowHud: false,
  customAccentColor: '#f59e0b',
  blockCollisions: true,
  cityEntryNotify: true,
  trafficJamNotify: true,
  trafficServer: 'sim1',
  showCarPlay: false,
  carPlayTheme: 'dark',
  carPlayTextScale: 'medium',
  carPlayShowNavInstructions: true,
  carPlayHotkeys: {
    toggle: 'F9',
    next: 'Ctrl+Alt+Right',
    prev: 'Ctrl+Alt+Left',
    home: 'Ctrl+Alt+H',
    playPause: 'Ctrl+Alt+Space'
  }
};

const getPosKey = (isSingle: boolean) => isSingle ? 'openpipeclub_overlay_positions_single' : 'openpipeclub_overlay_positions';
const getSizeKey = (isSingle: boolean) => isSingle ? 'openpipeclub_overlay_widget_sizes_single' : 'openpipeclub_overlay_widget_sizes';

const HotkeyRecorder = ({ value, onChange }: { value: string; onChange: (val: string) => void }) => {
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    if (!recording) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;

      const parts: string[] = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');

      let key = e.key;
      if (key === ' ') {
        key = 'Space';
      } else if (key.startsWith('Arrow')) {
        key = key.replace('Arrow', '');
      } else if (key.length === 1) {
        key = key.toUpperCase();
      }

      parts.push(key);
      const accelerator = parts.join('+');

      onChange(accelerator);
      setRecording(false);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [recording]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setRecording(prev => !prev)}
        className={`px-3 py-1.5 rounded-lg border text-xs font-mono tracking-tight transition-all text-center min-w-[140px] cursor-pointer ${
          recording
            ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse'
            : 'bg-[#18181b] border-white/10 text-white hover:border-primary/40'
        }`}
      >
        {recording ? 'Drücke Taste...' : value || 'Keine Taste'}
      </button>
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="text-[10px] font-bold text-slate-500 hover:text-red-400 px-1 py-0.5"
          title="Löschen"
        >
          Löschen
        </button>
      )}
    </div>
  );
};

const OverlaySettings = () => {
  const [showColorModal, setShowColorModal] = useState(false);
  const [activeGuides, setActiveGuides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const [hsv, setHsv] = useState({ h: 190, s: 85, v: 93 });
  const svBoxRef = useRef<HTMLDivElement>(null);
  const hueSliderRef = useRef<HTMLDivElement>(null);
  const [pickerMode, setPickerMode] = useState<'hex' | 'rgb'>('hex');
  const [rInput, setRInput] = useState('34');
  const [gInput, setGInput] = useState('209');
  const [bInput, setBInput] = useState('238');
  const [hexInput, setHexInput] = useState('#f59e0b');
  const [settings, setSettings] = useState<OverlaySettingsType>(() => {
    const saved = localStorage.getItem('openpipeclub_overlay_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.widgetOrder && Array.isArray(parsed.widgetOrder)) {
          const missing = DEFAULT_SETTINGS.widgetOrder.filter(w => !parsed.widgetOrder.includes(w));
          parsed.widgetOrder = [...parsed.widgetOrder, ...missing];
        }
        const resolved = { ...DEFAULT_SETTINGS, ...parsed, blockCollisions: true };
        if (parsed.showTacho !== undefined && parsed.showCarPlay === undefined) {
          resolved.showCarPlay = parsed.showTacho;
        }
        return resolved;
      } catch (e) {
        return { ...DEFAULT_SETTINGS, blockCollisions: true };
      }
    }
    return { ...DEFAULT_SETTINGS, blockCollisions: true };
  });

  const [carPlayUrls, setCarPlayUrls] = useState<{
    port: number;
    lanIp: string;
    localUrl: string;
    networkUrl: string;
  } | null>(null);
  const [copiedUrlType, setCopiedUrlType] = useState<'local' | 'network' | null>(null);

  const [positions, setPositions] = useState<Positions>(() => {
    const savedSettings = localStorage.getItem('openpipeclub_overlay_settings');
    let isSingle = false;
    if (savedSettings) {
      try {
        isSingle = !!JSON.parse(savedSettings).singleRowHud;
      } catch (e) { }
    }
    const defaultPositions = {
      logo: { x: 40, y: 40 },
      mainHud: { x: 40, y: 130 },
      event: { x: 40, y: 310 },
      drivers: { x: 40, y: 440 },
      spotify: { x: 40, y: 580 },
      gameMap: { x: 40, y: 740 },
      trafficLight: { x: 440, y: 130 }
    };
    const saved = localStorage.getItem(getPosKey(isSingle));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { ...defaultPositions, ...parsed };
        }
      } catch (e) { }
    }
    return defaultPositions;
  });

  const [widgetSizes, setWidgetSizes] = useState<Record<string, WidgetSize>>(() => {
    const savedSettings = localStorage.getItem('openpipeclub_overlay_settings');
    let isSingle = false;
    if (savedSettings) {
      try {
        isSingle = !!JSON.parse(savedSettings).singleRowHud;
      } catch (e) { }
    }
    const defaults = { ...DEFAULT_WIDGET_SIZES };
    if (isSingle) {
      defaults.mainHud = { w: 680, h: 52 };
    }
    const saved = localStorage.getItem(getSizeKey(isSingle));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.trafficLight && (parsed.trafficLight.w > 100 || parsed.trafficLight.h < 100)) {
          parsed.trafficLight = { w: 70, h: 160 };
        }
        return { ...defaults, ...parsed };
      } catch (e) { }
    }
    return defaults;
  });

  const [isOverlayOpen, setIsOverlayOpen] = useState(() => {
    const saved = localStorage.getItem('openpipeclub_overlay_active');
    return saved !== null ? saved === 'true' : false;
  });
  const [isLocked, setIsLocked] = useState(true);
  const [rpcActive, setRpcActive] = useState(() => {
    const saved = localStorage.getItem('openpipeclub_rpc_active');
    return saved !== null ? saved === 'true' : true;
  });
  const [rpcSettings, setRpcSettings] = useState<RpcSettings>(() => {
    try {
      const saved = localStorage.getItem('openpipeclub_rpc_settings');
      if (saved) return JSON.parse(saved);
    } catch { }
    return {
      enabled: true,
      preset: 'detailed',
      showEtaCountdown: true,
      showCargoMass: true,
      showDamage: false,
      showNearbyPlayers: true,
      showLiveMapButton: true,
      showConvoyParty: true,
    };
  });

  // Resize handling state
  const [resizingWidget, setResizingWidget] = useState<string | null>(null);
  const resizeStartPos = useRef({ x: 0, y: 0 });
  const resizeStartSize = useRef<WidgetSize>({ w: 0, h: 0 });

  const previewRef = useRef<HTMLDivElement>(null);
  const [previewDims, setPreviewDims] = useState({ w: 480, h: 270 });

  // Custom Mouse Dragging State
  const [draggingWidget, setDraggingWidget] = useState<string | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const widgetStartPos = useRef({ x: 0, y: 0 });

  const [activeTab, setActiveTab] = useState<'overlay' | 'carplay' | 'app' | 'tmp-ui'>('overlay');
  const { appearance, updateAppearance, resetAppearance, effectiveGlowColor } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bgUrlInput, setBgUrlInput] = useState(appearance.customBgImage || '');
  const [appAccentHexInput, setAppAccentHexInput] = useState(appearance.accentColor || '#f59e0b');
  const [appGlowHexInput, setAppGlowHexInput] = useState(appearance.glowColor || '#f59e0b');

  useEffect(() => {
    setAppAccentHexInput(appearance.accentColor);
  }, [appearance.accentColor]);

  useEffect(() => {
    setAppGlowHexInput(appearance.glowColor);
  }, [appearance.glowColor]);

  useEffect(() => {
    setBgUrlInput(appearance.customBgImage || '');
  }, [appearance.customBgImage]);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Bitte wähle eine gültige Bilddatei (PNG, JPG, WebP) aus.');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Das Bild ist zu groß (maximal 8 MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        updateAppearance({ customBgImage: dataUrl, backgroundType: 'custom' });
        setBgUrlInput('');
        toast.success('Eigenes Hintergrundbild erfolgreich übernommen!');
      }
    };
    reader.onerror = () => {
      toast.error('Fehler beim Laden des Bildes.');
    };
    reader.readAsDataURL(file);
  };

  const handleApplyBgUrl = () => {
    if (!bgUrlInput.trim()) return;
    updateAppearance({ customBgImage: bgUrlInput.trim(), backgroundType: 'custom' });
    toast.success('Hintergrundbild-URL erfolgreich übernommen!');
  };

  const handleRemoveCustomBg = () => {
    updateAppearance({ customBgImage: '', backgroundType: 'glow' });
    setBgUrlInput('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.success('Eigenes Hintergrundbild entfernt. Standard-Glow aktiv.');
  };

  const handleAppAccentHexChange = (val: string) => {
    setAppAccentHexInput(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      updateAppearance({ accentColor: val });
    }
  };

  const handleAppGlowHexChange = (val: string) => {
    setAppGlowHexInput(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      updateAppearance({ glowColor: val, syncGlowWithAccent: false });
    }
  };

  // ─── TruckersMP UI Customization State & Logic ──────────────────────
  interface TmpServerBanner {
    index: number;
    name: string;
    normalThumb: string;
    normalPath?: string;
    normalDataUrl?: string;
    selectedThumb: string;
    selectedPath?: string;
    selectedDataUrl?: string;
  }

  interface BannerCropModalState {
    serverIndex: number;
    type: 'normal' | 'selected';
    rawImageSrc: string;
    filePath?: string;
    imageNaturalWidth: number;
    imageNaturalHeight: number;
    offsetYPercent: number; // 0 to 100
    zoom: number; // 1.0 to 2.5
    showMockOverlay: boolean;
  }

  const [tmpInfo, setTmpInfo] = useState<{
    dataDir: string | null;
    templateDir: string;
    isModInstalled: boolean;
    installedBackgrounds: { name: string; slot: number; thumb: string; size: number; path?: string }[];
    templateBackgrounds: { name: string; slot: number; thumb: string; size: number }[];
    installedSkinThumb: string | null;
    baseSkinDataUrl: string;
    companyBannerThumb?: string | null;
    isCompanyBannerInstalled?: boolean;
    serverBanners?: TmpServerBanner[];
    isServerBannersInstalled?: boolean;
    isCustomFontInstalled?: boolean;
  } | null>(null);

  const [tmpLoading, setTmpLoading] = useState(false);
  const [tmpApplying, setTmpApplying] = useState(false);
  const [tmpBgSlots, setTmpBgSlots] = useState<TmpBgSlot[]>([]);
  const [tmpColor, setTmpColor] = useState<string>(() => {
    return localStorage.getItem('openpipeclub_tmp_color') || '#f59e0b';
  });
  const [showTmpColorModal, setShowTmpColorModal] = useState(false);
  const [tmpHsv, setTmpHsv] = useState(() => hexToHsv(localStorage.getItem('openpipeclub_tmp_color') || '#f59e0b'));
  const [recoloredSkinUrl, setRecoloredSkinUrl] = useState<string>('');
  const [simActiveSlot, setSimActiveSlot] = useState<number>(0);
  const [tmpPreviewModalImage, setTmpPreviewModalImage] = useState<string | null>(null);
  const [customDataDir, setCustomDataDir] = useState<string>('');
  const [useCompanyBanner, setUseCompanyBanner] = useState<boolean>(() => {
    const saved = localStorage.getItem('openpipeclub_tmp_company_banner');
    return saved !== 'standard';
  });
  const [useServerBanners, setUseServerBanners] = useState<boolean>(() => {
    const saved = localStorage.getItem('openpipeclub_tmp_server_banners');
    return saved !== 'standard';
  });
  const [serverBanners, setServerBanners] = useState<TmpServerBanner[]>([]);
  const [activeServerIndex, setActiveServerIndex] = useState<number>(0);
  const [simSelectedServer, setSimSelectedServer] = useState<number>(0);
  const [simServerIsActive, setSimServerIsActive] = useState<boolean>(true);
  const [simViewMode, setSimViewMode] = useState<'servers' | 'login'>('servers');
  const [useAppFonts, setUseAppFonts] = useState<boolean>(() => {
    const saved = localStorage.getItem('openpipeclub_tmp_fonts');
    return saved !== 'false';
  });
  const tmpSvBoxRef = useRef<HTMLDivElement>(null);
  const tmpHueSliderRef = useRef<HTMLDivElement>(null);
  const [bannerCropModal, setBannerCropModal] = useState<BannerCropModalState | null>(null);
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const dragStartYRef = useRef(0);
  const dragStartPercentRef = useRef(50);
  const cropViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDraggingCrop) return;
    const onMouseMove = (e: MouseEvent) => {
      const dy = e.clientY - dragStartYRef.current;
      const viewportH = cropViewportRef.current?.clientHeight || 140;
      const deltaPercent = (dy / viewportH) * 80;
      const nextPercent = Math.max(0, Math.min(100, dragStartPercentRef.current - deltaPercent));
      setBannerCropModal(prev => prev ? { ...prev, offsetYPercent: nextPercent } : null);
    };
    const onMouseUp = () => {
      setIsDraggingCrop(false);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDraggingCrop]);

  const loadTmpInfo = async () => {
    try {
      setTmpLoading(true);
      const { ipcRenderer } = window.require('electron');
      const info = await ipcRenderer.invoke('tmp-get-info');
      setTmpInfo(info);
      if (info.dataDir) setCustomDataDir(info.dataDir);

      if (info.serverBanners && info.serverBanners.length > 0) {
        setServerBanners(info.serverBanners);
      }

      setTmpBgSlots(prev => {
        if (prev.length > 0) return prev;
        if (info.installedBackgrounds && info.installedBackgrounds.length > 0) {
          return info.installedBackgrounds.map((bg: any, idx: number) => ({
            id: `slot_${idx}_${Date.now()}_${idx}`,
            slot: idx,
            name: `background${idx}.png`,
            thumb: bg.thumb,
            templateSlot: bg.slot,
            filePath: bg.path
          }));
        }
        return [];
      });
    } catch (err) {
      console.error('Failed to load TMP info:', err);
    } finally {
      setTmpLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'tmp-ui' && !tmpInfo && !tmpLoading) {
      loadTmpInfo();
    }
  }, [activeTab]);

  const recolorTmpSkin = (baseImageSrc: string, hexColor: string): Promise<string> => {
    return new Promise((resolve) => {
      if (!baseImageSrc) return resolve('');
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(baseImageSrc);
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const targetHsv = hexToHsv(hexColor);

        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 15) continue;

          const r = data[i] / 255;
          const g = data[i + 1] / 255;
          const b = data[i + 2] / 255;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const d = max - min;
          if (d < 0.08) continue;

          let h = 0;
          switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
          const s = max === 0 ? 0 : d / max;
          const v = max;

          // Accent range in ui_skin.png (recolor any non-neutral accent elements)
          if (s > 0.15 && d >= 0.08) {
            const newRgb = hsvToRgb(targetHsv.h, Math.min(100, s * targetHsv.s), v * 100);
            data[i] = newRgb.r;
            data[i + 1] = newRgb.g;
            data[i + 2] = newRgb.b;
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(baseImageSrc);
      img.src = baseImageSrc;
    });
  };

  useEffect(() => {
    if (!tmpInfo?.baseSkinDataUrl) return;
    let isCancelled = false;

    const timer = setTimeout(async () => {
      try {
        const recolored = await recolorTmpSkin(tmpInfo.baseSkinDataUrl, tmpColor);
        if (!isCancelled) {
          setRecoloredSkinUrl(recolored);
        }
      } catch (e) {
        console.error('Recolor error:', e);
      }
    }, 40);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [tmpColor, tmpInfo?.baseSkinDataUrl]);

  const selectTmpColorPreset = (hex: string) => {
    setTmpColor(hex);
    setTmpHsv(hexToHsv(hex));
    localStorage.setItem('openpipeclub_tmp_color', hex);
  };

  const handleTmpSvMouseDown = (e: React.MouseEvent) => {
    const box = tmpSvBoxRef.current;
    if (!box) return;

    const updateColor = (clientX: number, clientY: number) => {
      const rect = box.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top));

      const s = Math.round((x / rect.width) * 100);
      const v = Math.round((1 - y / rect.height) * 100);

      setTmpHsv(prev => {
        const next = { ...prev, s, v };
        const hex = hsvToHex(next.h, next.s, next.v);
        setTmpColor(hex);
        localStorage.setItem('openpipeclub_tmp_color', hex);
        return next;
      });
    };

    updateColor(e.clientX, e.clientY);

    const onMouseMove = (moveEvent: MouseEvent) => {
      updateColor(moveEvent.clientX, moveEvent.clientY);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleTmpHueMouseDown = (e: React.MouseEvent) => {
    const slider = tmpHueSliderRef.current;
    if (!slider) return;

    const updateHue = (clientX: number) => {
      const rect = slider.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const h = Math.round((x / rect.width) * 360) % 360;

      setTmpHsv(prev => {
        const next = { ...prev, h };
        const hex = hsvToHex(next.h, next.s, next.v);
        setTmpColor(hex);
        localStorage.setItem('openpipeclub_tmp_color', hex);
        return next;
      });
    };

    updateHue(e.clientX);

    const onMouseMove = (moveEvent: MouseEvent) => {
      updateHue(moveEvent.clientX);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleAddCustomImages = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const items = await ipcRenderer.invoke('tmp-pick-image', true);
      if (!items || !items.length) return;

      const newSlots = [...tmpBgSlots];
      for (const item of items) {
        const newIdx = newSlots.length;
        newSlots.push({
          id: `slot_${newIdx}_${Date.now()}_${Math.random()}`,
          slot: newIdx,
          name: `background${newIdx}.png`,
          thumb: item.thumb,
          filePath: item.path,
          isCustom: true
        });
      }
      setTmpBgSlots(newSlots);
      toast.success(`${items.length} Hintergrundbild(er) hinzugefügt!`);
    } catch (err: any) {
      toast.error('Fehler beim Auswählen: ' + err.message);
    }
  };

  const handleReplaceSlotImage = async (index: number) => {
    try {
      const { ipcRenderer } = window.require('electron');
      const item = await ipcRenderer.invoke('tmp-pick-image', false);
      if (!item) return;

      setTmpBgSlots(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          thumb: item.thumb,
          filePath: item.path,
          isCustom: true
        };
        return updated;
      });
      toast.success(`Hintergrund Slot ${index + 1} aktualisiert!`);
    } catch (err: any) {
      toast.error('Fehler beim Ersetzen: ' + err.message);
    }
  };

  const handleOpenPreviewModal = async (slotItem: TmpBgSlot) => {
    if (slotItem.filePath) {
      try {
        const { ipcRenderer } = window.require('electron');
        const preview = await ipcRenderer.invoke('tmp-get-preview', slotItem.filePath);
        if (preview) {
          setTmpPreviewModalImage(preview);
          return;
        }
      } catch (e) { }
    }
    setTmpPreviewModalImage(slotItem.thumb);
  };

  const handleRemoveSlot = (index: number) => {
    if (tmpBgSlots.length <= 1) {
      toast.error('Mindestens ein Hintergrundbild muss vorhanden sein.');
      return;
    }
    setTmpBgSlots(prev => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.map((item, idx) => ({
        ...item,
        slot: idx,
        name: `background${idx}.png`
      }));
    });
    if (simActiveSlot >= tmpBgSlots.length - 1) {
      setSimActiveSlot(Math.max(0, tmpBgSlots.length - 2));
    }
    toast.info(`Slot ${index + 1} entfernt. Slots neu nummeriert.`);
  };

  const handleApplyToAllSlots = (index: number) => {
    const src = tmpBgSlots[index];
    if (!src) return;
    setTmpBgSlots(prev => prev.map((item) => ({
      ...item,
      thumb: src.thumb,
      dataUrl: src.dataUrl,
      filePath: src.filePath,
      templateSlot: src.templateSlot,
      isCustom: src.isCustom
    })));
    toast.success(`Bild von Slot ${index + 1} für alle Slots übernommen!`);
  };

  const handlePickServerBannerImage = async (serverIndex: number, type: 'normal' | 'selected') => {
    try {
      const { ipcRenderer } = window.require('electron');
      const item = await ipcRenderer.invoke('tmp-pick-image', false);
      if (!item) return;

      let rawSrc = '';
      try {
        rawSrc = await ipcRenderer.invoke('tmp-get-image-data', item.path);
      } catch (e) { }
      if (!rawSrc) rawSrc = item.thumb;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setBannerCropModal({
          serverIndex,
          type,
          rawImageSrc: rawSrc,
          filePath: item.path,
          imageNaturalWidth: img.width || 7680,
          imageNaturalHeight: img.height || 864,
          offsetYPercent: 50,
          zoom: 1.0,
          showMockOverlay: true
        });
      };
      img.onerror = () => {
        setServerBanners(prev => {
          const next = [...prev];
          if (!next[serverIndex]) return prev;
          if (type === 'normal') {
            next[serverIndex] = { ...next[serverIndex], normalThumb: item.thumb, normalPath: item.path };
          } else {
            next[serverIndex] = { ...next[serverIndex], selectedThumb: item.thumb, selectedPath: item.path };
          }
          return next;
        });
        toast.success(`Bild für Server ${serverIndex + 1} übernommen!`);
      };
      img.src = rawSrc;
    } catch (err: any) {
      toast.error('Fehler beim Auswählen: ' + err.message);
    }
  };

  const handleOpenCropExisting = async (serverIndex: number, type: 'normal' | 'selected') => {
    const item = serverBanners[serverIndex];
    if (!item) return;
    const filePath = type === 'normal' ? item.normalPath : item.selectedPath;
    const thumb = type === 'normal' ? item.normalThumb : item.selectedThumb;

    let rawSrc = '';
    if (filePath) {
      try {
        const { ipcRenderer } = window.require('electron');
        rawSrc = await ipcRenderer.invoke('tmp-get-image-data', filePath);
      } catch (e) { }
    }
    if (!rawSrc) rawSrc = thumb || '';
    if (!rawSrc) {
      toast.info('Bitte wähle zuerst ein Bild aus.');
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setBannerCropModal({
        serverIndex,
        type,
        rawImageSrc: rawSrc,
        filePath,
        imageNaturalWidth: img.width || 7680,
        imageNaturalHeight: img.height || 864,
        offsetYPercent: 50,
        zoom: 1.0,
        showMockOverlay: true
      });
    };
    img.src = rawSrc;
  };

  const handleApplyBannerCrop = () => {
    if (!bannerCropModal) return;
    const { serverIndex, type, rawImageSrc, filePath, imageNaturalWidth, imageNaturalHeight, offsetYPercent, zoom } = bannerCropModal;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // TruckersMP Native Server Banner Auflösung: 7680 × 864 px (ca. 8.888:1)
      const targetW = 7680;
      const targetH = 864;
      const targetRatio = targetW / targetH;

      let cropWidth = imageNaturalWidth / zoom;
      let cropHeight = cropWidth / targetRatio;

      if (cropHeight > imageNaturalHeight) {
        cropHeight = imageNaturalHeight / zoom;
        cropWidth = cropHeight * targetRatio;
      }

      const maxOffsetY = Math.max(0, imageNaturalHeight - cropHeight);
      const sy = (offsetYPercent / 100) * maxOffsetY;
      const maxOffsetX = Math.max(0, imageNaturalWidth - cropWidth);
      const sx = maxOffsetX / 2;

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, sx, sy, cropWidth, cropHeight, 0, 0, targetW, targetH);
      const croppedDataUrl = canvas.toDataURL('image/png');

      setServerBanners(prev => {
        const next = [...prev];
        if (!next[serverIndex]) return prev;
        if (type === 'normal') {
          next[serverIndex] = {
            ...next[serverIndex],
            normalThumb: croppedDataUrl,
            normalDataUrl: croppedDataUrl,
            normalPath: filePath
          };
        } else {
          next[serverIndex] = {
            ...next[serverIndex],
            selectedThumb: croppedDataUrl,
            selectedDataUrl: croppedDataUrl,
            selectedPath: filePath
          };
        }
        return next;
      });

      setBannerCropModal(null);
      toast.success(`Ausschnitt für Server ${serverIndex + 1} (${type === 'normal' ? 'Normal' : 'Ausgewählt'}) pixelgenau auf 7680 × 864 px skaliert!`);
    };
    img.src = rawImageSrc;
  };

  const handleGenerateSelectedBanner = (serverIndex: number) => {
    const item = serverBanners[serverIndex];
    if (!item) return;
    const src = item.normalThumb;
    if (!src) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width || 7680;
      canvas.height = img.height || 864;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Selected tint overlay (darker + subtle accent/blue tint)
      ctx.fillStyle = 'rgba(15, 30, 60, 0.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Selected highlight accent borders (wie im Spiel mit blauem Rand)
      ctx.strokeStyle = '#0080ff';
      ctx.lineWidth = Math.max(8, Math.round(canvas.height * 0.025));
      ctx.strokeRect(0, 0, canvas.width, canvas.height);

      const selDataUrl = canvas.toDataURL('image/png');
      setServerBanners(prev => {
        const next = [...prev];
        next[serverIndex] = {
          ...next[serverIndex],
          selectedThumb: selDataUrl,
          selectedDataUrl: selDataUrl,
          selectedPath: undefined
        };
        return next;
      });
      toast.success(`Ausgewählt-Grafik für ${item.name} generiert (7680 × 864 px)!`);
    };
    img.src = src;
  };

  const handleResetServerBanner = (serverIndex: number) => {
    setServerBanners(prev => {
      const next = [...prev];
      if (!next[serverIndex]) return prev;
      next[serverIndex] = {
        ...next[serverIndex],
        normalThumb: '',
        normalPath: undefined,
        normalDataUrl: undefined,
        selectedThumb: '',
        selectedPath: undefined,
        selectedDataUrl: undefined
      };
      return next;
    });
    toast.info(`Server ${serverIndex + 1} Banner entfernt (TMP Standard-Grafik aktiv).`);
  };

  const handleApplyToTruckersMp = async () => {
    try {
      setTmpApplying(true);
      // Give React/browser 50ms to paint the button spinner cleanly before heavy work
      await new Promise(r => setTimeout(r, 50));

      const { ipcRenderer } = window.require('electron');
      const payload = {
        targetPath: customDataDir || undefined,
        skinDataUrl: recoloredSkinUrl || undefined,
        useCompanyBanner,
        useServerBanners,
        serverBanners: serverBanners.map(s => ({
          index: s.index,
          normalPath: s.normalPath,
          normalDataUrl: s.normalDataUrl,
          selectedPath: s.selectedPath,
          selectedDataUrl: s.selectedDataUrl
        })),
        useAppFonts,
        backgrounds: tmpBgSlots.map(s => ({
          slot: s.slot,
          dataUrl: s.dataUrl,
          filePath: s.filePath
        }))
      };
      const res = await ipcRenderer.invoke('tmp-apply-skin', payload);
      if (res.success) {
        toast.success(`TruckersMP UI erfolgreich installiert! (${res.backgroundCount} Hintergründe, ${useCompanyBanner ? 'Firmenbanner' : 'TMP-Standardbanner'}, ${useServerBanners ? '5 Serverlisten-Banner' : 'TMP-Serverbanner'} & ${useAppFonts ? 'App-Fonts' : 'TMP-Fonts'})`);
        localStorage.setItem('openpipeclub_tmp_color', tmpColor);
        localStorage.setItem('openpipeclub_tmp_company_banner', useCompanyBanner ? 'company' : 'standard');
        localStorage.setItem('openpipeclub_tmp_server_banners', useServerBanners ? 'company' : 'standard');
        localStorage.setItem('openpipeclub_tmp_fonts', useAppFonts ? 'true' : 'false');
        setTmpInfo(prev => prev ? {
          ...prev,
          isModInstalled: true,
          isCompanyBannerInstalled: useCompanyBanner,
          isServerBannersInstalled: useServerBanners,
          isCustomFontInstalled: useAppFonts
        } : null);
      } else {
        toast.error(`Fehler bei der Installation: ${res.error}`);
      }
    } catch (err: any) {
      toast.error('Fehler: ' + err.message);
    } finally {
      setTmpApplying(false);
    }
  };

  const handleOpenTmpFolder = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const opened = await ipcRenderer.invoke('tmp-open-folder', customDataDir || undefined);
      if (!opened) {
        toast.error('Ordner konnte nicht geöffnet werden.');
      }
    } catch (err: any) {
      toast.error('Fehler: ' + err.message);
    }
  };

  const handleRestoreVanilla = async () => {
    if (!window.confirm('Möchtest du wirklich alle angepassten TMP UI Mods entfernen und das Original TruckersMP UI wiederherstellen?')) return;
    try {
      const { ipcRenderer } = window.require('electron');
      const res = await ipcRenderer.invoke('tmp-restore-vanilla');
      if (res.success) {
        toast.success('Original TruckersMP UI wiederhergestellt.');
        setTmpBgSlots([]);
        await loadTmpInfo();
      } else {
        toast.error('Fehler: ' + res.error);
      }
    } catch (err: any) {
      toast.error('Fehler: ' + err.message);
    }
  };

  const handleExportMod = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const payload = {
        skinDataUrl: recoloredSkinUrl || undefined,
        backgrounds: tmpBgSlots.map(s => ({
          slot: s.slot,
          dataUrl: s.dataUrl,
          filePath: s.filePath,
          templateSlot: s.templateSlot
        }))
      };
      const res = await ipcRenderer.invoke('tmp-export-mod', payload);
      if (res.success) {
        toast.success(`Mod erfolgreich exportiert nach: ${res.path}`);
      } else if (!res.canceled) {
        toast.error('Fehler beim Exportieren: ' + res.error);
      }
    } catch (err: any) {
      toast.error('Fehler: ' + err.message);
    }
  };

  const handleSelectCustomDataDir = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const selected = await ipcRenderer.invoke('tmp-select-directory');
      if (selected) {
        setCustomDataDir(selected);
        toast.success('TruckersMP Verzeichnis aktualisiert.');
      }
    } catch (e) { }
  };

  // Resize mouse events
  const onResizeStart = (e: React.MouseEvent, widgetKey: string) => {
    e.stopPropagation();
    setResizingWidget(widgetKey);
    resizeStartPos.current = { x: e.clientX, y: e.clientY };
    resizeStartSize.current = widgetSizes[widgetKey] ?? DEFAULT_WIDGET_SIZES[widgetKey];
  };

  useEffect(() => {
    if (!resizingWidget) return;
    const onMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeStartPos.current.x;
      const dy = e.clientY - resizeStartPos.current.y;

      const scaleX = previewDims.w / SW;
      const scaleY = previewDims.h / SH;
      const zoomFactor = settings.zoom / 100;

      const dxUnscaled = (dx / scaleX) / zoomFactor;
      const dyUnscaled = (dy / scaleY) / zoomFactor;

      const pos = positions[resizingWidget] || { x: 40, y: 40 };
      const defaultSize = getWidgetDefaultSize(resizingWidget, settings.singleRowHud);

      // Specific minimum bounds for each widget
      let minW = 40;
      let minH = 40;
      if (resizingWidget === 'logo') {
        minW = 40;
        minH = 40;
      } else if (resizingWidget === 'mainHud') {
        if (settings.singleRowHud) {
          minW = 450;
          minH = 40;
        } else {
          minW = 280;
          minH = 80;
        }
      } else if (resizingWidget === 'event') {
        minW = 180;
        minH = 40;
      } else if (resizingWidget === 'drivers') {
        minW = 150;
        minH = 80;
      } else if (resizingWidget === 'spotify') {
        minW = 180;
        minH = 80;
      } else if (resizingWidget === 'gameMap') {
        minW = 200;
        minH = 120;
      }

      const maxW = Infinity; // unlimited width even in single‑row mode
      const maxH = resizingWidget === 'mainHud' && settings.singleRowHud ? defaultSize.h : Infinity;

      // Enforce screen boundaries during resize: pos.x + newW * zoomFactor <= SW
      let limitMaxW = Math.min(maxW, Math.max(minW, (SW - pos.x) / zoomFactor));
      let limitMaxH = Math.min(maxH, Math.max(minH, (SH - pos.y) / zoomFactor));

      // Constrain by other active widgets to prevent overlapping during resize
      Object.keys(widgetSizes).forEach(other => {
        if (other === resizingWidget) return;
        if (!isWidgetEnabled(other)) return;

        const otherPos = positions[other] || { x: 40, y: 40 };
        const otherW = widgetSizes[other]?.w || 80;
        const otherH = widgetSizes[other]?.h || (other === 'drivers' ? 120 : getWidgetDefaultSize(other, settings.singleRowHud).h || 80);

        // Check vertical overlap for width constraint
        const verticalOverlap = Math.max(pos.y, otherPos.y) < Math.min(pos.y + resizeStartSize.current.h, otherPos.y + otherH);
        if (verticalOverlap && otherPos.x >= pos.x) {
          limitMaxW = Math.min(limitMaxW, otherPos.x - pos.x);
        }

        // Check horizontal overlap for height constraint
        const horizontalOverlap = Math.max(pos.x, otherPos.x) < Math.min(pos.x + resizeStartSize.current.w, otherPos.x + otherW);
        if (horizontalOverlap && otherPos.y >= pos.y) {
          limitMaxH = Math.min(limitMaxH, otherPos.y - pos.y);
        }
      });

      limitMaxW = Math.max(minW, limitMaxW);
      limitMaxH = Math.max(minH, limitMaxH);

      const newW = Math.min(limitMaxW, Math.max(minW, resizeStartSize.current.w + dxUnscaled));
      const newH = Math.min(limitMaxH, Math.max(minH, resizeStartSize.current.h + dyUnscaled));

      setWidgetSizes(prev => ({
        ...prev,
        [resizingWidget]: { w: newW, h: newH }
      }));
    };
    const onMouseUp = () => {
      setResizingWidget(null);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [resizingWidget, positions, settings.zoom, settings.singleRowHud, previewDims]);


  // Load/switch positions and sizes when singleRowHud changes
  useEffect(() => {
    const isSingle = settings.singleRowHud;
    const posKey = getPosKey(isSingle);
    const sizeKey = getSizeKey(isSingle);

    // 1. Positions
    const savedPos = localStorage.getItem(posKey);
    let resolvedPos = {
      logo: { x: 40, y: 40 },
      mainHud: { x: 40, y: 130 },
      event: { x: 40, y: 310 },
      drivers: { x: 40, y: 440 },
      spotify: { x: 40, y: 580 },
      gameMap: { x: 40, y: 740 }
    };
    if (savedPos) {
      try {
        const parsed = JSON.parse(savedPos);
        if (parsed && typeof parsed === 'object') {
          resolvedPos = parsed;
        }
      } catch (e) { }
    }
    setPositions(resolvedPos);

    // 2. Sizes
    const savedSizes = localStorage.getItem(sizeKey);
    let resolvedSizes = { ...DEFAULT_WIDGET_SIZES };
    if (isSingle) {
      resolvedSizes.mainHud = { w: 680, h: 52 };
    }
    if (savedSizes) {
      try {
        resolvedSizes = JSON.parse(savedSizes);
      } catch (e) { }
    }
    setWidgetSizes(resolvedSizes);

    // 3. Notify Electron
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('overlay-positions-updated', resolvedPos);
      ipcRenderer.send('overlay-settings-changed', { ...settings, widgetSizes: resolvedSizes });
    } catch (e) { }
  }, [settings.singleRowHud]);

  // Update and persist settings, widget sizes, and notify overlay
  useEffect(() => {
    const updatedSettings = { ...settings, widgetSizes };
    localStorage.setItem('openpipeclub_overlay_settings', JSON.stringify(updatedSettings));
    localStorage.setItem(getSizeKey(settings.singleRowHud), JSON.stringify(widgetSizes));
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('overlay-settings-changed', updatedSettings);
    } catch (e) { }
  }, [settings, widgetSizes]);

  // Sync RPC status & settings
  useEffect(() => {
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('rpc-settings-get').then((res: RpcSettings) => {
        if (res) {
          setRpcSettings(res);
          setRpcActive(res.enabled);
          localStorage.setItem('openpipeclub_rpc_settings', JSON.stringify(res));
          localStorage.setItem('openpipeclub_rpc_active', String(res.enabled));
        }
      }).catch(() => { });

      const settingsListener = (_: any, newSettings: RpcSettings) => {
        if (newSettings) {
          setRpcSettings(newSettings);
          setRpcActive(newSettings.enabled);
          localStorage.setItem('openpipeclub_rpc_settings', JSON.stringify(newSettings));
          localStorage.setItem('openpipeclub_rpc_active', String(newSettings.enabled));
        }
      };

      const rpcListener = (_: any, status: boolean) => {
        setRpcActive(status);
        setRpcSettings(prev => ({ ...prev, enabled: status }));
        localStorage.setItem('openpipeclub_rpc_active', String(status));
      };

      ipcRenderer.on('rpc-settings-changed', settingsListener);
      ipcRenderer.on('rpc-active-changed', rpcListener);
      return () => {
        ipcRenderer.removeListener('rpc-settings-changed', settingsListener);
        ipcRenderer.removeListener('rpc-active-changed', rpcListener);
      };
    } catch (e) { }
  }, []);

  // Sync CarPlay status
  useEffect(() => {
    try {
      const { ipcRenderer } = window.require('electron');
      const listener = (_: any, active: boolean) => {
        setSettings(prev => ({ ...prev, showCarPlay: active }));
      };
      ipcRenderer.on('carplay-status-changed', listener);
      return () => {
        ipcRenderer.removeListener('carplay-status-changed', listener);
      };
    } catch (e) { }
  }, []);

  // Fetch live CarPlay Server URLs
  useEffect(() => {
    const fetchCarPlayUrl = async () => {
      try {
        if ((window as any).require) {
          const { ipcRenderer } = (window as any).require('electron');
          if (ipcRenderer) {
            const res = await ipcRenderer.invoke('get-carplay-url');
            if (res && res.localUrl) {
              setCarPlayUrls(res);
              return;
            }
          }
        }
      } catch (e) { }

      try {
        const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
        const hostname = window.location.hostname || 'localhost';
        const port = window.location.port === '5173' ? '8383' : (window.location.port || '8383');
        const res = await fetch(`${protocol}//${hostname}:${port}/api/carplay/url`);
        if (res.ok) {
          const data = await res.json();
          setCarPlayUrls(data);
          return;
        }
      } catch (e) { }

      const host = window.location.hostname || 'localhost';
      setCarPlayUrls({
        port: 8383,
        lanIp: host,
        localUrl: `http://localhost:8383/#carplay`,
        networkUrl: `http://${host}:8383/#carplay`,
      });
    };
    fetchCarPlayUrl();
  }, []);

  const copyToClipboard = (text: string, type: 'local' | 'network') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedUrlType(type);
      toast.success(type === 'local' ? 'Lokale CarPlay-URL kopiert!' : 'WLAN/Tablet CarPlay-URL kopiert!');
      setTimeout(() => setCopiedUrlType(null), 2500);
    }).catch(() => {
      toast.error('Kopieren fehlgeschlagen');
    });
  };

  const openInBrowser = (url: string) => {
    try {
      if ((window as any).require) {
        const { shell } = (window as any).require('electron');
        if (shell) {
          shell.openExternal(url);
          return;
        }
      }
    } catch (e) { }
    window.open(url, '_blank');
  };

  // Sync text inputs and HSV coordinates when customAccentColor changes (e.g. preset clicked or typed)
  useEffect(() => {
    const color = settings.customAccentColor || '#f59e0b';
    setHexInput(color.toUpperCase());
    const { r, g, b } = hexToRgb(color);
    setRInput(String(r));
    setGInput(String(g));
    setBInput(String(b));

    // Only update HSV if it doesn't match the new customAccentColor to avoid dragging loops
    const currentHexFromHsv = hsvToHex(hsv.h, hsv.s, hsv.v);
    if (currentHexFromHsv.toLowerCase() !== color.toLowerCase()) {
      try {
        setHsv(hexToHsv(color));
      } catch (err) { }
    }
  }, [settings.customAccentColor]);

  const handleHexInputChange = (val: string) => {
    setHexInput(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      updateSetting('customAccentColor', val);
      setHsv(hexToHsv(val));
    }
  };

  const handleRgbInputChange = (channel: 'r' | 'g' | 'b', val: string) => {
    // Only allow digits
    const cleaned = val.replace(/\D/g, '');
    if (channel === 'r') setRInput(cleaned);
    if (channel === 'g') setGInput(cleaned);
    if (channel === 'b') setBInput(cleaned);

    const num = parseInt(cleaned, 10);
    if (!isNaN(num) && num >= 0 && num <= 255) {
      const r = channel === 'r' ? num : parseInt(rInput, 10) || 0;
      const g = channel === 'g' ? num : parseInt(gInput, 10) || 0;
      const b = channel === 'b' ? num : parseInt(bInput, 10) || 0;
      const hex = rgbToHex(r, g, b);
      updateSetting('customAccentColor', hex);
      setHsv(hexToHsv(hex));
    }
  };

  const handleEyeDropper = async () => {
    if (typeof window !== 'undefined' && 'EyeDropper' in window) {
      try {
        // @ts-ignore
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();
        const hex = result.sRGBHex;
        updateSetting('customAccentColor', hex);
        toast.success(`Farbe kopiert: ${hex}`);
      } catch (e) {
        console.warn("Eyedropper cancelled or failed", e);
      }
    } else {
      toast.toast ? toast.toast("Farbpipette wird in diesem Browser/System nicht unterstützt.") : toast.error("Farbpipette wird in diesem Browser/System nicht unterstützt.");
    }
  };

  // HSV Custom Color Picker Drag Handlers
  const handleSvMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!svBoxRef.current) return;

    const handleMove = (moveEvent: MouseEvent) => {
      if (!svBoxRef.current) return;
      const rect = svBoxRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, 1 - (moveEvent.clientY - rect.top) / rect.height));

      const newS = Math.round(x * 100);
      const newV = Math.round(y * 100);

      setHsv(prev => {
        const next = { ...prev, s: newS, v: newV };
        updateSetting('customAccentColor', hsvToHex(next.h, next.s, next.v));
        return next;
      });
    };

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    const rect = svBoxRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
    const newS = Math.round(x * 100);
    const newV = Math.round(y * 100);

    setHsv(prev => {
      const next = { ...prev, s: newS, v: newV };
      updateSetting('customAccentColor', hsvToHex(next.h, next.s, next.v));
      return next;
    });

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const handleHueMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!hueSliderRef.current) return;

    const handleMove = (moveEvent: MouseEvent) => {
      if (!hueSliderRef.current) return;
      const rect = hueSliderRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
      const newH = Math.round(x * 360);

      setHsv(prev => {
        const next = { ...prev, h: newH };
        updateSetting('customAccentColor', hsvToHex(next.h, next.s, next.v));
        return next;
      });
    };

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    const rect = hueSliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newH = Math.round(x * 360);

    setHsv(prev => {
      const next = { ...prev, h: newH };
      updateSetting('customAccentColor', hsvToHex(next.h, next.s, next.v));
      return next;
    });

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  // Sync overlay open / lock status
  useEffect(() => {
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('overlay-status').then((status: boolean) => {
        setIsOverlayOpen(status);
        localStorage.setItem('openpipeclub_overlay_active', String(status));
      }).catch(() => { });
      ipcRenderer.invoke('overlay-lock-status').then(setIsLocked).catch(() => { });

      const statusListener = (_: any, status: boolean) => {
        setIsOverlayOpen(status);
        localStorage.setItem('openpipeclub_overlay_active', String(status));
      };
      ipcRenderer.on('overlay-status-changed', statusListener);

      const lockListener = (_: any, locked: boolean) => setIsLocked(locked);
      ipcRenderer.on('overlay-lock-changed', lockListener);

      return () => {
        ipcRenderer.removeListener('overlay-status-changed', statusListener);
        ipcRenderer.removeListener('overlay-lock-changed', lockListener);
      };
    } catch (e) { }
  }, []);

  // Monitor preview element size to make coordinates calculation accurate
  useEffect(() => {
    if (previewRef.current) {
      const rect = previewRef.current.getBoundingClientRect();
      setPreviewDims({ w: rect.width, h: rect.height });
    }
    const handleResize = () => {
      if (previewRef.current) {
        const rect = previewRef.current.getBoundingClientRect();
        setPreviewDims({ w: rect.width, h: rect.height });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const toggleOverlay = () => {
    const next = !isOverlayOpen;
    setIsOverlayOpen(next);
    localStorage.setItem('openpipeclub_overlay_active', String(next));
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('overlay-toggle', next);
    } catch (e) {
      toast.error('Electron-Schnittstelle nicht verfügbar.');
    }
  };

  const updateRpcSetting = <K extends keyof RpcSettings>(key: K, value: RpcSettings[K]) => {
    const updated = { ...rpcSettings, [key]: value };
    if (key === 'enabled') {
      setRpcActive(value as boolean);
      localStorage.setItem('openpipeclub_rpc_active', String(value));
    }
    setRpcSettings(updated);
    localStorage.setItem('openpipeclub_rpc_settings', JSON.stringify(updated));
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('rpc-settings-update', { [key]: value }).catch(() => { });
    } catch (e) {
      toast.error('Electron-Schnittstelle nicht verfügbar.');
    }
  };

  const toggleRpc = () => {
    updateRpcSetting('enabled', !rpcActive);
  };

  const toggleLock = () => {
    const nextLock = !isLocked;
    setIsLocked(nextLock);
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('overlay-lock', nextLock);
    } catch (e) { }
  };

  const resetPositions = () => {
    if (activeTab === 'carplay') {
      toast.success('CarPlay-Layout hat ein festes Raster.');
      return;
    }

    const defaultPositions = {
      logo: { x: 40, y: 40 },
      mainHud: { x: 40, y: 130 },
      event: { x: 40, y: 310 },
      drivers: { x: 40, y: 440 },
      spotify: { x: 40, y: 580 },
      gameMap: { x: 40, y: 740 },
      trafficLight: { x: 440, y: 130 }
    };
    const defaultSizes = { ...DEFAULT_WIDGET_SIZES };
    if (settings.singleRowHud) {
      defaultSizes.mainHud = { w: 680, h: 52 };
    }
    setPositions(defaultPositions);
    setWidgetSizes(defaultSizes);
    localStorage.setItem(getPosKey(settings.singleRowHud), JSON.stringify(defaultPositions));
    localStorage.setItem(getSizeKey(settings.singleRowHud), JSON.stringify(defaultSizes));
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('overlay-reset-positions');
      ipcRenderer.send('overlay-positions-updated', defaultPositions);
      ipcRenderer.send('overlay-settings-changed', { ...settings, widgetSizes: defaultSizes });
      toast.success('Widget-Positionen und Größen zurückgesetzt.');
    } catch (e) {
      toast.success('Widget-Positionen und Größen lokal zurückgesetzt.');
    }
  };

  const updateSetting = <K extends keyof OverlaySettingsType>(key: K, value: OverlaySettingsType[K]) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const detectTrafficServer = async () => {
      try {
        const res = await apiService.getMyTruckersMPSession();
        if (cancelled) return;
        const serverName = (res.data as any)?.server_name;
        if (!serverName) return;
        const lower = String(serverName).toLowerCase();
        let mapped = 'sim1';
        if (lower.includes('simulation 2') || lower.includes('sim 2')) mapped = 'sim2';
        else if (lower.includes('us') || lower.includes('arc2') || lower.includes('arcade')) mapped = 'arc2';
        else if (lower.includes('simulation 1') || lower.includes('sim 1')) mapped = 'sim1';
        if ((settings.trafficServer || '') !== mapped) {
          updateSetting('trafficServer', mapped);
        }
      } catch (e) {
        // ignore
      }
    };
    detectTrafficServer();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const SW = window.screen.width || 1920;
  const SH = window.screen.height || 1080;

  const widgetLabels: Record<string, string> = {
    logo: 'Firmenlogo',
    mainHud: 'Haupt-HUD',
    event: 'Event-Widget',
    drivers: 'Fahrer Online',
    spotify: 'Spotify Widget',
    gameMap: 'Spielkarte',
    trafficLight: 'Ampel-Assistent'
  };



  // Custom Drag Event Handlers
  const handleMouseDown = (widget: string, e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingWidget(widget);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    widgetStartPos.current = {
      x: positions[widget]?.x ?? 40,
      y: positions[widget]?.y ?? 40
    };
  };

  const isWidgetEnabled = (wName: string) => {
    if (wName === 'logo') return settings.showLogo;
    if (wName === 'mainHud') return settings.showMainHud;
    if (wName === 'event') return settings.showEvent;
    if (wName === 'drivers') return settings.showDrivers;
    if (wName === 'spotify') return settings.showSpotify;
    if (wName === 'gameMap') return settings.showGameMap;
    if (wName === 'trafficLight') return settings.showTrafficLight !== false;
    return false;
  };

  useEffect(() => {
    if (!draggingWidget) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!previewRef.current) return;
      const rect = previewRef.current.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      // Calculate screen pixel change
      const dx = (e.clientX - dragStartPos.current.x) * (SW / w);
      const dy = (e.clientY - dragStartPos.current.y) * (SH / h);

      const rawLimitW = widgetSizes[draggingWidget]?.w || 100;
      const rawLimitH = widgetSizes[draggingWidget]?.h || 100;
      const zoomFactor = settings.zoom / 100;
      const limitW = rawLimitW * zoomFactor;
      const limitH = rawLimitH * zoomFactor;

      const rawNextX = widgetStartPos.current.x + dx;
      const rawNextY = widgetStartPos.current.y + dy;

      // Magnetic Snapping Logic
      const SNAP_DIST = 15; // snapping threshold in screen pixels
      let snappedX = rawNextX;
      let snappedY = rawNextY;
      let snapGuideX: number | null = null;
      let snapGuideY: number | null = null;

      // X Snap Targets
      const xTargets: { val: number; label: string }[] = [
        { val: 0, label: 'screen' },
        { val: 40, label: 'screen' },
        { val: SW / 2, label: 'screen' },
        { val: SW - 40, label: 'screen' },
        { val: SW, label: 'screen' }
      ];

      // Y Snap Targets
      const yTargets: { val: number; label: string }[] = [
        { val: 0, label: 'screen' },
        { val: 40, label: 'screen' },
        { val: SH / 2, label: 'screen' },
        { val: SH - 40, label: 'screen' },
        { val: SH, label: 'screen' }
      ];

      // Add other active widgets' edges and adjacency targets
      Object.keys(widgetSizes).forEach(other => {
        if (other === draggingWidget) return;
        if (!isWidgetEnabled(other)) return;

        const pos = positions[other] || { x: 40, y: 40 };
        const otherW = (widgetSizes[other]?.w || 80) * zoomFactor;
        const otherH = (widgetSizes[other]?.h || (other === 'drivers' ? 120 : getWidgetDefaultSize(other, settings.singleRowHud).h || 80)) * zoomFactor;

        // Snapping alignments
        xTargets.push({ val: pos.x, label: other }); // Left-to-Left
        xTargets.push({ val: pos.x + otherW / 2, label: other }); // Center-to-Center
        xTargets.push({ val: pos.x + otherW, label: other }); // Right-to-Right

        // Adjacency Snapping
        xTargets.push({ val: pos.x - limitW, label: other }); // Dragged right edge snaps to other left edge
        xTargets.push({ val: pos.x + otherW, label: other }); // Dragged left edge snaps to other right edge

        yTargets.push({ val: pos.y, label: other }); // Top-to-Top
        yTargets.push({ val: pos.y + otherH / 2, label: other }); // Middle-to-Middle
        yTargets.push({ val: pos.y + otherH, label: other }); // Bottom-to-Bottom

        // Adjacency Snapping
        yTargets.push({ val: pos.y - limitH, label: other }); // Dragged bottom edge snaps to other top edge
        yTargets.push({ val: pos.y + otherH, label: other }); // Dragged top edge snaps to other bottom edge
      });

      // Find closest X Snap
      let minDiffX = Infinity;
      xTargets.forEach(target => {
        // Dragged Left snaps to target: resulting x = target.val
        const diffL = Math.abs(rawNextX - target.val);
        if (diffL < SNAP_DIST && diffL < minDiffX) {
          minDiffX = diffL;
          snappedX = target.val;
          snapGuideX = target.val;
        }

        // Dragged Center snaps to target: resulting x = target.val - limitW / 2
        const diffC = Math.abs(rawNextX + limitW / 2 - target.val);
        if (diffC < SNAP_DIST && diffC < minDiffX) {
          minDiffX = diffC;
          snappedX = target.val - limitW / 2;
          snapGuideX = target.val;
        }

        // Dragged Right snaps to target: resulting x = target.val - limitW
        const diffR = Math.abs(rawNextX + limitW - target.val);
        if (diffR < SNAP_DIST && diffR < minDiffX) {
          minDiffX = diffR;
          snappedX = target.val - limitW;
          snapGuideX = target.val;
        }
      });

      // Find closest Y Snap
      let minDiffY = Infinity;
      yTargets.forEach(target => {
        // Dragged Top snaps to target: resulting y = target.val
        const diffT = Math.abs(rawNextY - target.val);
        if (diffT < SNAP_DIST && diffT < minDiffY) {
          minDiffY = diffT;
          snappedY = target.val;
          snapGuideY = target.val;
        }

        // Dragged Middle snaps to target: resulting y = target.val - limitH / 2
        const diffM = Math.abs(rawNextY + limitH / 2 - target.val);
        if (diffM < SNAP_DIST && diffM < minDiffY) {
          minDiffY = diffM;
          snappedY = target.val - limitH / 2;
          snapGuideY = target.val;
        }

        // Dragged Bottom snaps to target: resulting y = target.val - limitH
        const diffB = Math.abs(rawNextY + limitH - target.val);
        if (diffB < SNAP_DIST && diffB < minDiffY) {
          minDiffY = diffB;
          snappedY = target.val - limitH;
          snapGuideY = target.val;
        }
      });

      // Constrain within screen boundaries
      let nextX = Math.max(0, Math.min(SW - limitW, snappedX));
      let nextY = Math.max(0, Math.min(SH - limitH, snappedY));

      const currentPos = positions[draggingWidget] || { x: 40, y: 40 };
      let resolvedX = nextX;
      let resolvedY = nextY;

      // Collision Resolution (Permanently Enabled)
      if (true) {
        const getIntersectionArea = (
          x1: number, y1: number, w1: number, h1: number,
          x2: number, y2: number, w2: number, h2: number
        ) => {
          const minX = Math.max(x1, x2);
          const maxX = Math.min(x1 + w1, x2 + w2);
          const minY = Math.max(y1, y2);
          const maxY = Math.min(y1 + h1, y2 + h2);
          if (maxX > minX && maxY > minY) {
            return (maxX - minX) * (maxY - minY);
          }
          return 0;
        };

        // Check if moving on X increases overlap with any active widget
        let collisionX = false;
        for (const other of Object.keys(widgetSizes)) {
          if (other === draggingWidget) continue;
          if (!isWidgetEnabled(other)) continue;

          const otherPos = positions[other] || { x: 40, y: 40 };
          const otherW = (widgetSizes[other]?.w || 80) * zoomFactor;
          const otherH = (widgetSizes[other]?.h || (other === 'drivers' ? 120 : getWidgetDefaultSize(other, settings.singleRowHud).h || 80)) * zoomFactor;

          const prevOverlapX = getIntersectionArea(
            currentPos.x, currentPos.y, limitW, limitH,
            otherPos.x, otherPos.y, otherW, otherH
          );

          const newOverlapX = getIntersectionArea(
            nextX, currentPos.y, limitW, limitH,
            otherPos.x, otherPos.y, otherW, otherH
          );

          if (newOverlapX > prevOverlapX && newOverlapX > 0.01) {
            collisionX = true;
            break;
          }
        }

        if (collisionX) {
          resolvedX = currentPos.x;
          snapGuideX = null;
        }

        // Check if moving on Y increases overlap with any active widget (using resolvedX)
        let collisionY = false;
        for (const other of Object.keys(widgetSizes)) {
          if (other === draggingWidget) continue;
          if (!isWidgetEnabled(other)) continue;

          const otherPos = positions[other] || { x: 40, y: 40 };
          const otherW = (widgetSizes[other]?.w || 80) * zoomFactor;
          const otherH = (widgetSizes[other]?.h || (other === 'drivers' ? 120 : getWidgetDefaultSize(other, settings.singleRowHud).h || 80)) * zoomFactor;

          const prevOverlapY = getIntersectionArea(
            resolvedX, currentPos.y, limitW, limitH,
            otherPos.x, otherPos.y, otherW, otherH
          );

          const newOverlapY = getIntersectionArea(
            resolvedX, nextY, limitW, limitH,
            otherPos.x, otherPos.y, otherW, otherH
          );

          if (newOverlapY > prevOverlapY && newOverlapY > 0.01) {
            collisionY = true;
            break;
          }
        }

        if (collisionY) {
          resolvedY = currentPos.y;
          snapGuideY = null;
        }
      }

      // Update guidelines
      setActiveGuides({ x: snapGuideX, y: snapGuideY });

      const updated = {
        ...positions,
        [draggingWidget]: {
          x: Math.round(resolvedX),
          y: Math.round(resolvedY)
        }
      };

      setPositions(updated);
      localStorage.setItem(getPosKey(settings.singleRowHud), JSON.stringify(updated));

      try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send('overlay-positions-updated', updated);
      } catch (err) { }
    };

    const handleMouseUp = () => {
      setDraggingWidget(null);
      setActiveGuides({ x: null, y: null });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingWidget, positions, settings, widgetSizes]);

  // Dragging mouse events for CarPlay


  // Overlap Resolution logic for scaling changes
  const resolveOverlaps = (
    currentPositions: Positions,
    sizes: Record<string, WidgetSize>,
    zoom: number,
    singleRow: boolean
  ): Positions => {
    const zoomFactor = zoom / 100;
    const updated = { ...currentPositions };
    const keys = Object.keys(sizes).filter(k => isWidgetEnabled(k));

    // Run up to 10 iterations to solve cascading/chain collisions
    const ITERATIONS = 10;
    for (let iter = 0; iter < ITERATIONS; iter++) {
      let resolvedAny = false;
      for (let i = 0; i < keys.length; i++) {
        for (let j = i + 1; j < keys.length; j++) {
          const keyA = keys[i];
          const keyB = keys[j];

          const posA = updated[keyA] || { x: 40, y: 40 };
          const posB = updated[keyB] || { x: 40, y: 40 };

          const wA = (sizes[keyA]?.w || 80) * zoomFactor;
          const hA = (sizes[keyA]?.h || (keyA === 'drivers' ? 120 : getWidgetDefaultSize(keyA, singleRow).h || 80)) * zoomFactor;

          const wB = (sizes[keyB]?.w || 80) * zoomFactor;
          const hB = (sizes[keyB]?.h || (keyB === 'drivers' ? 120 : getWidgetDefaultSize(keyB, singleRow).h || 80)) * zoomFactor;

          const overlapX = Math.min(posA.x + wA, posB.x + wB) - Math.max(posA.x, posB.x);
          const overlapY = Math.min(posA.y + hA, posB.y + hB) - Math.max(posA.y, posB.y);

          if (overlapX > 0 && overlapY > 0) {
            resolvedAny = true;
            if (overlapX < overlapY) {
              // Push horizontally away from center
              const dir = (posA.x + wA / 2) < (posB.x + wB / 2) ? -1 : 1;
              const shift = (overlapX / 2) * dir;
              updated[keyA] = { ...updated[keyA], x: Math.max(0, Math.min(SW - wA, posA.x + shift)) };
              updated[keyB] = { ...updated[keyB], x: Math.max(0, Math.min(SW - wB, posB.x - shift)) };
            } else {
              // Push vertically away from middle
              const dir = (posA.y + hA / 2) < (posB.y + hB / 2) ? -1 : 1;
              const shift = (overlapY / 2) * dir;
              updated[keyA] = { ...updated[keyA], y: Math.max(0, Math.min(SH - hA, posA.y + shift)) };
              updated[keyB] = { ...updated[keyB], y: Math.max(0, Math.min(SH - hB, posB.y - shift)) };
            }
          }
        }
      }
      if (!resolvedAny) break;
    }
    return updated;
  };

  // Automatically shift overlapping widgets when zoom scale or widget sizes change
  useEffect(() => {
    setPositions(prev => {
      const resolved = resolveOverlaps(prev, widgetSizes, settings.zoom, settings.singleRowHud);
      const posKey = getPosKey(settings.singleRowHud);
      localStorage.setItem(posKey, JSON.stringify(resolved));
      try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send('overlay-positions-updated', resolved);
      } catch (err) { }
      return resolved;
    });
  }, [settings.zoom, settings.singleRowHud, widgetSizes]);

  return (
    <div className="space-y-4 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Title */}
      <div className="text-center mb-6">
        <span className="overline text-primary mb-2 inline-block">Anpassung</span>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tighter text-white mt-2">
          {activeTab === 'overlay' && 'Overlay-Einstellungen'}
          {activeTab === 'carplay' && 'CarPlay Cockpit-Einstellungen'}
          {activeTab === 'app' && 'App-Einstellungen'}
          {activeTab === 'tmp-ui' && 'TruckersMP UI-Anpassung'}
        </h1>
        <p className="text-zinc-400 text-sm mt-3">
          {activeTab === 'overlay' && 'Passe dein In-Game Overlay, HUD-Widgets und Positionen an'}
          {activeTab === 'carplay' && 'Konfiguriere das Apple CarPlay / Android Auto Zusatz-Display und Cockpit-Alerts'}
          {activeTab === 'app' && 'Passe das Erscheinungsbild, Akzentfarben, Hintergrund und System-Dienste der App an'}
          {activeTab === 'tmp-ui' && 'Passe Menühintergründe, UI-Farben und Akzente von TruckersMP an und installiere sie mit 1 Klick'}
        </p>
      </div>

      {/* 4-Tab Navigation Bar */}
      <div id="tour-overlay-container" className="flex items-center justify-center w-fit mx-auto max-w-full gap-1.5 backdrop-blur-xl bg-zinc-900/60 rounded-2xl p-1.5 border-2 border-primary/20 overflow-x-auto no-scrollbar sticky top-0 z-30 mb-8 shadow-2xl transition-all duration-300 hover:border-primary hover:shadow-[0_0_25px_var(--primary-glow)] hover-glow">
        {[
          { key: 'overlay', label: 'In-Game Overlay', icon: Monitor },
          { key: 'carplay', label: 'CarPlay Cockpit', icon: LayoutGrid },
          { key: 'app', label: 'App', icon: Palette },
          { key: 'tmp-ui', label: 'TruckersMP UI', icon: SlidersHorizontal },
        ].map(t => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key as any)}
              className={`px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2.5 shrink-0 hover-glow cursor-pointer ${
                active ? 'bg-primary text-black shadow-[0_0_20px_var(--primary-glow)]' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={16} className="shrink-0" />
              <span className="whitespace-nowrap">{t.label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overlay' && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 xl:grid-cols-5 gap-4"
          >
            {/* Left Column: Settings and Controls */}
            <div className="xl:col-span-2 space-y-4">
              {/* System Services Toggles */}
          <div className="frosted-card bg-[#000000] border-2 border-primary/20 shadow-xl !p-4 transition-all duration-300 hover:border-primary hover:shadow-[0_0_25px_var(--primary-glow)] hover-glow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-1 h-4 bg-primary rounded-full" />
              <h2 className="font-unbounded text-sm font-bold text-primary uppercase tracking-widest">
                System-Dienste
              </h2>
            </div>
            <div className="space-y-3">
              {/* Overlay Toggle Switch */}
              <label className="flex items-center justify-between py-1 cursor-pointer group">
                <div>
                  <span className="text-xs text-slate-300 font-medium block">Spiele-Overlay</span>
                  <span className="text-[9px] text-slate-500">Zeigt HUD-Widgets im Spiel an</span>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isOverlayOpen}
                    onChange={toggleOverlay}
                    className="sr-only peer"
                  />
                  <div className="switch-toggle" />
                </div>
              </label>
            </div>
          </div>

          {/* Style Presets */}
          <div className="frosted-card bg-[#000000] border-2 border-primary/20 shadow-xl !p-4 transition-all duration-300 hover:border-primary hover:shadow-[0_0_25px_var(--primary-glow)] hover-glow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-1 h-4 bg-primary rounded-full" />
              <h2 className="font-unbounded text-sm font-bold text-primary uppercase tracking-widest">
                Design-Stil
              </h2>
            </div>
              <div className="grid grid-cols-1 gap-2.5">
              {[
                {
                  id: 'neon',
                  title: 'Cyberpunk Neon',
                  desc: 'Leuchtendes Cyan/Magenta, weiche Glow-Effekte und dynamische abgerundete Balken.',
                  color: 'text-[#f59e0b]'
                },
                {
                  id: 'carbon',
                  title: 'Motorsport Carbon',
                  desc: 'Sportliche Carbonfaser-Optik, mattiertes Glas und bernsteinfarbene Akzente.',
                  color: 'text-amber-400'
                },
                {
                  id: 'minimal',
                  title: 'Minimal Clean',
                  desc: 'Dezente weiße Akzente, hochauflösendes Milchglas (Glassmorphic) und simple Formen.',
                  color: 'text-white'
                },
                {
                  id: 'custom',
                  title: 'Benutzerdefiniert (Custom)',
                  desc: 'Wähle deine eigene Akzentfarbe. Passe die Leuchteffekte und Anzeigen nach Belieben an.',
                  color: 'text-[var(--custom-accent-btn)]',
                  style: { '--custom-accent-btn': settings.customAccentColor || '#f59e0b' } as React.CSSProperties
                }
              ].map(preset => {
                const isSelected = settings.style === preset.id;
                const borderClass = isSelected
                  ? preset.id === 'neon' ? 'border-[#f59e0b] bg-[#f59e0b]/5'
                    : preset.id === 'carbon' ? 'border-amber-500 bg-amber-500/5'
                      : preset.id === 'custom' ? 'border-[var(--custom-accent-btn)] bg-[var(--custom-accent-btn-bg)]'
                        : 'border-white bg-white/5'
                  : 'border-white/5 bg-black/30 hover:border-white/10';

                const buttonStyle = preset.id === 'custom' ? {
                  '--custom-accent-btn': settings.customAccentColor || '#f59e0b',
                  '--custom-accent-btn-bg': `${settings.customAccentColor || '#f59e0b'}1a`
                } as React.CSSProperties : (preset as any).style || {};

                return (
                  <button
                    key={preset.id}
                    onClick={() => updateSetting('style', preset.id as any)}
                    className={`flex flex-col text-left p-4 rounded-2xl border transition-all relative overflow-hidden group cursor-pointer ${borderClass}`}
                    style={buttonStyle}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-sm font-bold text-white">{preset.title}</span>
                      {isSelected && <Check size={14} className={preset.color} />}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal">{preset.desc}</p>
                  </button>
                );
              })}
            </div>
            {settings.style === 'custom' && (
              <div className="relative">
                <button
                  onClick={() => setShowColorModal(prev => !prev)}
                  className="mt-4 w-full flex items-center justify-center gap-2 p-3 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/15 rounded-2xl text-xs text-slate-300 hover:text-white font-bold transition-all active:scale-95 cursor-pointer"
                >
                  <Palette size={14} style={{ color: settings.customAccentColor }} />
                  <span>Farbpalette öffnen</span>
                  <span
                    className="w-3 h-3 rounded-full border border-white/25 ml-1"
                    style={{ backgroundColor: settings.customAccentColor }}
                  />
                </button>

                <AnimatePresence>
                  {showColorModal && (
                    <>
                      {/* Soft dark backdrop for closing when clicking outside */}
                      <div
                        className="fixed inset-0 z-[9999] bg-black/40 cursor-default"
                        onClick={() => setShowColorModal(false)}
                      />

                      {/* Centered Color Picker Popover Container */}
                      <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none p-4">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 15 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 15 }}
                          transition={{ duration: 0.2 }}
                          className="pointer-events-auto w-[280px] bg-[#0c0c0e]/95 border-2 border-[var(--custom-accent)]/30 backdrop-blur-md rounded-3xl p-4 shadow-2xl overflow-hidden flex flex-col gap-4"
                          style={{
                            '--custom-accent': settings.customAccentColor || '#f59e0b',
                            '--custom-border': `${settings.customAccentColor || '#f59e0b'}33`
                          } as React.CSSProperties}
                        >
                          {/* Acrylic Noise */}
                          <div className="absolute inset-0 z-[-1] opacity-5 pointer-events-none" style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                          }} />

                          {/* Title & Close */}
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <div className="flex items-center gap-2 text-slate-300">
                              <Palette size={14} className="text-[var(--custom-accent)]" />
                              <span className="font-unbounded text-[9px] font-bold uppercase tracking-widest">Farbwähler</span>
                            </div>
                            <button
                              onClick={() => setShowColorModal(false)}
                              className="p-1 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </div>

                          {/* Saturation-Value Canvas */}
                          <div
                            ref={svBoxRef}
                            onMouseDown={handleSvMouseDown}
                            className="h-28 w-full rounded-xl relative overflow-hidden cursor-crosshair border border-white/10"
                            style={{
                              backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
                              backgroundImage: `
                                linear-gradient(to right, #fff, transparent),
                                linear-gradient(to top, #000, transparent)
                              `,
                              backgroundBlendMode: 'multiply'
                            }}
                          >
                            {/* Selector cursor */}
                            <div
                              className="w-3.5 h-3.5 rounded-full border-2 border-white absolute -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none"
                              style={{
                                left: `${hsv.s}%`,
                                top: `${100 - hsv.v}%`,
                                backgroundColor: settings.customAccentColor,
                                boxShadow: `0 0 10px ${settings.customAccentColor}, 0 0 4px rgba(0,0,0,0.8)`
                              }}
                            />
                          </div>

                          {/* Hue Slider (Rainbow) */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[8px] text-slate-500 uppercase font-black tracking-widest px-0.5">
                              <span>Farbton (Hue)</span>
                              <span className="font-mono">{hsv.h}°</span>
                            </div>
                            <div
                              ref={hueSliderRef}
                              onMouseDown={handleHueMouseDown}
                              className="h-2.5 w-full rounded-full relative cursor-ew-resize border border-white/10"
                              style={{
                                backgroundImage: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)'
                              }}
                            >
                              {/* Knob */}
                              <div
                                className="w-3.5 h-3.5 rounded-full border-2 border-white absolute -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none"
                                style={{
                                  left: `${(hsv.h / 360) * 100}%`,
                                  backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
                                  boxShadow: '0 0 4px rgba(0,0,0,0.6)'
                                }}
                              />
                            </div>
                          </div>

                          {/* Bottom Row Controls */}
                          <div className="flex items-center justify-between gap-2.5 pt-2 border-t border-white/5">
                            {/* Eyedropper & Preview */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Eyedropper Button */}
                              <button
                                onClick={handleEyeDropper}
                                title="Farbe vom Bildschirm wählen"
                                className="p-1.5 bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all active:scale-90 cursor-pointer"
                              >
                                <Pipette size={12} />
                              </button>

                              {/* Color Preview Swatch */}
                              <div
                                className="w-6 h-6 rounded-lg border border-white/15 shadow-inner shrink-0"
                                style={{ backgroundColor: settings.customAccentColor }}
                              />
                            </div>

                            {/* Inputs Panel (HEX or RGB) */}
                            <div className="flex-1 flex justify-center">
                              {pickerMode === 'hex' ? (
                                <div className="flex flex-col items-center">
                                  <input
                                    type="text"
                                    maxLength={7}
                                    value={hexInput}
                                    onChange={e => handleHexInputChange(e.target.value)}
                                    className="w-20 bg-black/40 border border-white/10 rounded-lg px-1 py-0.5 text-center text-[10px] text-white uppercase font-mono focus:border-[var(--custom-accent)] focus:outline-none"
                                  />
                                  <span className="text-[7px] text-slate-500 uppercase tracking-widest font-black mt-0.5">HEX</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 justify-center">
                                  <div className="flex flex-col items-center">
                                    <input
                                      type="text"
                                      maxLength={3}
                                      value={rInput}
                                      onChange={e => handleRgbInputChange('r', e.target.value)}
                                      className="w-9 bg-black/40 border border-white/10 rounded-lg px-0.5 py-0.5 text-center text-[10px] text-white font-mono focus:border-[var(--custom-accent)] focus:outline-none"
                                    />
                                    <span className="text-[7px] text-slate-500 uppercase tracking-widest font-black mt-0.5">R</span>
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <input
                                      type="text"
                                      maxLength={3}
                                      value={gInput}
                                      onChange={e => handleRgbInputChange('g', e.target.value)}
                                      className="w-9 bg-black/40 border border-white/10 rounded-lg px-0.5 py-0.5 text-center text-[10px] text-white font-mono focus:border-[var(--custom-accent)] focus:outline-none"
                                    />
                                    <span className="text-[7px] text-slate-500 uppercase tracking-widest font-black mt-0.5">G</span>
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <input
                                      type="text"
                                      maxLength={3}
                                      value={bInput}
                                      onChange={e => handleRgbInputChange('b', e.target.value)}
                                      className="w-9 bg-black/40 border border-white/10 rounded-lg px-0.5 py-0.5 text-center text-[10px] text-white font-mono focus:border-[var(--custom-accent)] focus:outline-none"
                                    />
                                    <span className="text-[7px] text-slate-500 uppercase tracking-widest font-black mt-0.5">B</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Format Toggle */}
                            <button
                              onClick={() => setPickerMode(prev => prev === 'hex' ? 'rgb' : 'hex')}
                              title="Farbformat umschalten"
                              className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors cursor-pointer shrink-0"
                            >
                              <ArrowUpDown size={12} />
                            </button>
                          </div>

                          {/* Swatches Grid */}
                          <div className="border-t border-white/5 pt-2 flex flex-col gap-1.5">
                            <span className="text-[7px] text-slate-500 uppercase font-black tracking-widest text-left">Presets</span>
                            <div className="grid grid-cols-5 gap-1.5">
                              {COLOR_PRESETS.map((preset) => {
                                const isActive = settings.customAccentColor?.toLowerCase() === preset.hex.toLowerCase();
                                return (
                                  <button
                                    key={preset.hex}
                                    onClick={() => updateSetting('customAccentColor', preset.hex)}
                                    title={preset.name}
                                    className={`w-6 h-6 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${isActive ? 'border-white bg-white/5' : 'border-white/5 hover:border-white/20 hover:scale-105'
                                      }`}
                                  >
                                    <span
                                      className="w-3.5 h-3.5 rounded-md shadow-sm block"
                                      style={{ backgroundColor: preset.hex }}
                                    />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Visibility and Zoom */}
          <div className="frosted-card bg-[#000000] border-2 border-primary/20 shadow-xl !p-4 transition-all duration-300 hover:border-primary hover:shadow-[0_0_25px_var(--primary-glow)] hover-glow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-1 h-4 bg-primary rounded-full" />
              <h2 className="font-unbounded text-sm font-bold text-primary uppercase tracking-widest">
                Skalierung & Widgets
              </h2>
            </div>

            <div className="space-y-4">
              {/* Zoom */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Overlay-Größe (Zoom)</span>
                  <span className="font-bold text-white tabular-nums">{settings.zoom}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={settings.zoom}
                  onChange={e => updateSetting('zoom', Number(e.target.value))}
                  className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-bold">
                  <span>50%</span>
                  <span>100%</span>
                  <span>150%</span>
                </div>
              </div>

              {/* Background Opacity */}
              <div className="space-y-2 pt-3 border-t border-white/5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Hintergrund-Deckkraft</span>
                  <span className="font-bold text-white tabular-nums">{settings.bgOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={settings.bgOpacity}
                  onChange={e => updateSetting('bgOpacity', Number(e.target.value))}
                  className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-bold">
                  <span>10% (Transparent)</span>
                  <span>100% (Solid)</span>
                </div>
              </div>



              {/* Single-Row HUD Toggle */}
              <div className="space-y-2 pt-3 border-t border-white/5">
                <label className="flex items-center justify-between py-1 cursor-pointer group">
                  <div>
                    <span className="text-xs text-slate-300 font-medium block">Einzelzeilen HUD</span>
                    <span className="text-[9px] text-slate-500">Zeigt HUD-Widgets in einer Zeile an</span>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={settings.singleRowHud}
                      onChange={() => updateSetting('singleRowHud', !settings.singleRowHud)}
                      className="sr-only peer"
                    />
                    <div className="switch-toggle" />
                  </div>
                </label>
              </div>



              {/* Widgets Visibility Toggles */}
              <div className="space-y-3 pt-3 border-t border-white/5">
                <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Widgets einblenden</h3>
                {[
                  { key: 'showLogo', label: 'Firmenlogo' },
                  { key: 'showMainHud', label: 'Haupt-HUD (Telemetriedaten)' },
                  { key: 'showEvent', label: 'Nächstes Event-Widget' },
                  { key: 'showSpotify', label: 'Spotify Widget' },
                  { key: 'showDrivers', label: 'Online-Fahrer Liste' },
                  { key: 'showGameMap', label: 'Spielkarte (ETS2)' },
                  { key: 'showTrafficLight', label: 'Ampel-Assistent (Echtzeit)' }
                ].map(item => {
                  const active = settings[item.key as keyof OverlaySettingsType] !== false;
                  return (
                    <label
                      key={item.key}
                      className="flex items-center justify-between cursor-pointer group py-0.5"
                    >
                      <span className="text-xs text-slate-300 group-hover:text-white transition-colors">{item.label}</span>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => updateSetting(item.key as any, !active)}
                          className="sr-only peer"
                        />
                        <div className="switch-toggle" />
                      </div>
                    </label>
                  );
                })}

                {/* Traffic Light Variant Selector */}
                {settings.showTrafficLight !== false && (
                  <div className="pt-2 border-t border-white/5 space-y-1.5">
                    <span className="text-[10px] text-slate-400 font-medium block">Ampel-Design</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: 'compact', label: 'Kompakt' },
                        { id: 'large', label: 'Groß' }
                      ].map(variant => (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => {
                            updateSetting('trafficLightVariant', variant.id as any);
                            const targetSize = variant.id === 'large' ? { w: 84, h: 225 } : { w: 70, h: 160 };
                            setWidgetSizes(prev => {
                              const updated = { ...prev, trafficLight: targetSize };
                              const isSingle = settings.singleRowHud || false;
                              localStorage.setItem(getSizeKey(isSingle), JSON.stringify(updated));
                              return updated;
                            });
                          }}
                          className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all text-center cursor-pointer ${
                            (settings.trafficLightVariant || 'compact') === variant.id
                              ? 'bg-primary/20 border-primary/50 text-primary shadow-[0_0_8px_var(--primary-glow)]'
                              : 'bg-[#18181b] border-white/10 text-slate-400 hover:bg-[#27272a] hover:text-white'
                          }`}
                        >
                          {variant.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Status & Interactive Simulator */}
        <div className="xl:col-span-3 space-y-4">
          {/* Status and Action Buttons */}
          <div className="frosted-card bg-[#000000] border-2 border-primary/20 shadow-xl !p-4 transition-all duration-300 hover:border-primary hover:shadow-[0_0_25px_var(--primary-glow)] hover-glow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-1 h-4 bg-primary rounded-full" />
              <h2 className="font-unbounded text-sm font-bold text-primary uppercase tracking-widest">
                Status & Preview-Modus
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-white leading-tight">
                  {isOverlayOpen ? 'Overlay läuft im Hintergrund' : 'Overlay ist geschlossen'}
                </p>
                <p className="text-[10px] text-slate-500 font-medium mt-1">
                  {isOverlayOpen
                    ? (isLocked ? 'Vorschau-Modus Inaktiv (wird nur im Spiel angezeigt)' : 'Vorschau-Modus Aktiv (sichtbar auf dem Desktop)')
                    : 'Starte das Overlay, um es zu positionieren'
                  }
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {isOverlayOpen && (
                  <button
                    onClick={toggleLock}
                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 active:scale-95 ${isLocked
                      ? 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                  >
                    {isLocked ? <Eye size={12} /> : <EyeOff size={12} />}
                    {isLocked ? 'Vorschau auf Desktop' : 'Vorschau ausblenden'}
                  </button>
                )}
                <button
                  onClick={resetPositions}
                  className="px-4 py-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95"
                >
                  <RefreshCw size={12} />
                  Reset Layout
                </button>
              </div>
            </div>

            <div className="mt-4 p-4 bg-primary/5 border border-primary/10 rounded-2xl">
              <p className="text-[11px] text-slate-300 leading-relaxed">
                💡 <strong>Desktop Vorschau:</strong> Aktiviere den Vorschau-Modus, um das transparente Overlay auf deinem Desktop sichtbar zu machen. Du kannst die Widgets dann im Simulator unten verschieben und siehst das Ergebnis sofort live an der echten Position.
              </p>
            </div>
            </div>

            {/* HUD Details */}
            <div className="frosted-card bg-[#000000] border-2 border-primary/20 shadow-xl !p-4 transition-all duration-300 hover:border-primary hover:shadow-[0_0_25px_var(--primary-glow)] hover-glow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-1 h-4 bg-primary rounded-full" />
              <h2 className="font-unbounded text-sm font-bold text-primary uppercase tracking-widest">
                HUD Details
              </h2>
            </div>
              <p className="text-[10px] text-slate-500 mb-4 uppercase tracking-wider leading-relaxed">
                Wähle die Werte für das Haupt-Widget:
              </p>

              <div className="space-y-3">
                {[
                  { key: 'showSpeed', label: 'Geschwindigkeit (KM/H)' },
                  { key: 'showGear', label: 'Gang-Anzeige' },
                  { key: 'showFuel', label: 'Tank & Reichweite' },
                  { key: 'showRemainingDistance', label: 'Rest-Kilometer (Navi)' },
                  { key: 'showETA', label: 'Ankunftszeit (ETA)' },
                  { key: 'showCargo', label: 'Fracht & Gewicht' },
                  { key: 'showIncome', label: 'Einnahmen' }
                ].map(item => {
                  const active = settings[item.key as keyof OverlaySettingsType] as boolean;
                  return (
                    <label
                      key={item.key}
                      className="flex items-center justify-between cursor-pointer group py-0.5"
                    >
                      <span className="text-xs text-slate-300 group-hover:text-white transition-colors">{item.label}</span>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => updateSetting(item.key as any, !active)}
                          className="sr-only peer"
                        />
                        <div className="switch-toggle" />
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Overlay Notifications & Traffic Settings */}
            <div className="frosted-card bg-[#000000] border-2 border-primary/20 shadow-xl !p-4 transition-all duration-300 hover:border-primary hover:shadow-[0_0_25px_var(--primary-glow)] hover-glow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-1 h-4 bg-primary rounded-full" />
                <h2 className="font-unbounded text-sm font-bold text-primary uppercase tracking-widest">
                  Benachrichtigungen & Stau-Warnungen
                </h2>
              </div>
              <p className="text-[10px] text-slate-500 mb-4 uppercase tracking-wider leading-relaxed">
                Stelle ein, worüber du im Overlay benachrichtigt werden möchtest:
              </p>

              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer group py-0.5">
                  <div>
                    <span className="text-xs text-slate-300 group-hover:text-white transition-colors block">Stadt-Betreten Benachrichtigung</span>
                    <span className="text-[9px] text-slate-500 block">Zeigt Spieleranzahl beim Einfahren in eine Stadt oben an</span>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={settings.cityEntryNotify !== false}
                      onChange={() => updateSetting('cityEntryNotify', settings.cityEntryNotify === false)}
                      className="sr-only peer"
                    />
                    <div className="switch-toggle" />
                  </div>
                </label>

                <label className="flex items-center justify-between cursor-pointer group py-0.5">
                  <div>
                    <span className="text-xs text-slate-300 group-hover:text-white transition-colors block">Stau-Warnung (TruckersMP)</span>
                    <span className="text-[9px] text-slate-500 block">Warnt im Overlay bei Annäherung an einen Stau</span>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={settings.trafficJamNotify !== false}
                      onChange={() => updateSetting('trafficJamNotify', settings.trafficJamNotify === false)}
                      className="sr-only peer"
                    />
                    <div className="switch-toggle" />
                  </div>
                </label>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs text-slate-300">TruckersMP Server</span>
                  <select
                    value={settings.trafficServer || 'sim1'}
                    onChange={(e) => updateSetting('trafficServer', e.target.value)}
                    className="bg-zinc-900 border border-white/10 rounded-lg text-xs font-bold text-white px-2.5 py-1 outline-none cursor-pointer hover:border-primary/40 transition-all"
                  >
                    <option value="sim1">EU Simulation 1</option>
                    <option value="sim2">EU Simulation 2</option>
                    <option value="arc2">US Simulation</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Interactive Screen Simulator */}
                <div className="frosted-card bg-[#000000] border-2 border-primary/20 shadow-xl !p-4 flex flex-col transition-all duration-300 hover:border-primary hover:shadow-[0_0_25px_var(--primary-glow)] hover-glow">
                  <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-4 bg-primary rounded-full" />
                      <h2 className="font-unbounded text-sm font-bold text-primary uppercase tracking-widest">
                        Bildschirm-Simulator (Overlay)
                      </h2>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                      Live Drag & Drop
                    </span>
                  </div>

                  {/* Simulated Desktop Box */}
                  <div
                    ref={previewRef}
                    className="relative w-full aspect-video bg-black/90 rounded-2xl border-2 border-white/5 overflow-hidden shadow-[inset_0_4px_30px_rgba(0,0,0,0.9)]"
                    style={{
                      backgroundImage: 'radial-gradient(rgba(245, 158, 11, 0.08) 1px, transparent 1px)',
                      backgroundSize: '20px 20px'
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                      <span className="font-unbounded text-3xl font-black uppercase tracking-widest italic select-none">OPEN PIPE CLUB SCREEN</span>
                    </div>

                    {/* Visual Guidelines for Snap Targets (only visible when dragging) */}
                    {draggingWidget && (
                      <>
                        {/* Center lines */}
                        <div className="absolute inset-y-0 left-1/2 border-l border-primary/20 border-dashed pointer-events-none" />
                        <div className="absolute inset-x-0 top-1/2 border-t border-primary/20 border-dashed pointer-events-none" />

                        {/* Margins */}
                        <div className="absolute inset-y-0 border-l border-white/[0.04] border-dashed pointer-events-none" style={{ left: `${(40 / SW) * 100}%` }} />
                        <div className="absolute inset-y-0 border-r border-white/[0.04] border-dashed pointer-events-none" style={{ right: `${(40 / SW) * 100}%` }} />
                        <div className="absolute inset-x-0 border-t border-white/[0.04] border-dashed pointer-events-none" style={{ top: `${(40 / SH) * 100}%` }} />
                        <div className="absolute inset-x-0 border-b border-white/[0.04] border-dashed pointer-events-none" style={{ bottom: `${(40 / SH) * 100}%` }} />
                      </>
                    )}

                    {/* Active Snap Guide Lines */}
                    {draggingWidget && activeGuides.x !== null && (
                      <div
                        className="absolute inset-y-0 border-l border-dashed pointer-events-none z-30"
                        style={{
                          left: `${(activeGuides.x / SW) * 100}%`,
                          borderColor: 'var(--primary)',
                          opacity: 0.8
                        }}
                      />
                    )}
                    {draggingWidget && activeGuides.y !== null && (
                      <div
                        className="absolute inset-x-0 border-t border-dashed pointer-events-none z-30"
                        style={{
                          top: `${(activeGuides.y / SH) * 100}%`,
                          borderColor: 'var(--primary)',
                          opacity: 0.8
                        }}
                      />
                    )}

                    {/* Render simulated widgets */}
                    {Object.keys(widgetSizes).map((widget) => {
                      const defaultSize = getWidgetDefaultSize(widget, settings.singleRowHud);
                      const size = widgetSizes[widget] ?? defaultSize;
                      const pos = positions[widget] || { x: 40, y: 40 };

                      const isEnabled = isWidgetEnabled(widget);

                      const scaleX = previewDims.w / SW;
                      const scaleY = previewDims.h / SH;
                      const zoomFactor = settings.zoom / 100;

                      const wPreview = size.w * scaleX * zoomFactor;
                      const displayH = size.h || (widget === 'drivers' ? 120 : defaultSize.h || 80);
                      const hPreview = displayH * scaleY * zoomFactor;

                      const xPreview = pos.x * scaleX;
                      const yPreview = pos.y * scaleY;

                      const themeStyles = {
                        neon: {
                          border: 'border-[#f59e0b]/40 shadow-[0_0_10px_rgba(245, 158, 11,0.1)]',
                          text: 'text-[#f59e0b]',
                          badge: 'bg-[#f59e0b]/10 text-[#f59e0b]',
                          style: {}
                        },
                        carbon: {
                          border: 'border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.1)]',
                          text: 'text-amber-400',
                          badge: 'bg-amber-500/10 text-amber-400',
                          style: {}
                        },
                        minimal: {
                          border: 'border-white/30 shadow-[0_0_10px_rgba(255,255,255,0.03)]',
                          text: 'text-white',
                          badge: 'bg-white/10 text-white',
                          style: {}
                        },
                        custom: {
                          border: 'border-[var(--preview-accent)] shadow-[0_0_10px_var(--preview-accent-glow)]',
                          text: 'text-[var(--preview-accent)]',
                          badge: 'bg-[var(--preview-accent-bg)] text-[var(--preview-accent)]',
                          style: {
                            '--preview-accent': settings.customAccentColor || '#f59e0b',
                            '--preview-accent-glow': `${settings.customAccentColor || '#f59e0b'}33`
                          } as React.CSSProperties
                        }
                      }[settings.style];

                      return (
                        <div
                          key={widget}
                          onMouseDown={(e) => isEnabled && handleMouseDown(widget, e)}
                          className={`absolute rounded-xl border flex flex-col items-center justify-center p-2 select-none group overflow-hidden ${isEnabled
                            ? `${themeStyles.border} cursor-grab active:cursor-grabbing hover:border-primary/80`
                            : 'border-dashed border-white/5 bg-white/[0.01] opacity-20 cursor-not-allowed'
                            }`}
                          style={{
                            left: 0,
                            top: 0,
                            transform: `translate3d(${xPreview}px, ${yPreview}px, 0)`,
                            width: wPreview,
                            height: hPreview,
                            backgroundColor: isEnabled
                              ? `rgba(0, 0, 0, ${settings.bgOpacity / 100})`
                              : undefined,
                            ...(isEnabled ? themeStyles.style : {})
                          }}
                        >
                          {/* Acrylic Noise Overlay */}
                          {isEnabled && <div className="acrylic-noise" />}
                          {/* Carbon Fiber Pattern Overlay */}
                          {isEnabled && settings.style === 'carbon' && <div className="carbon-pattern" />}

                          <span className={`relative z-10 text-[8px] font-black uppercase tracking-wider text-center ${isEnabled ? themeStyles.text : 'text-slate-500'}`}>
                            {widgetLabels[widget]}
                          </span>
                          {isEnabled && (
                            <>
                              <span className="relative z-10 text-[6.5px] font-bold text-slate-400 mt-1 tabular-nums bg-black/40 px-1 rounded">
                                x:{Math.round(pos.x)} y:{Math.round(pos.y)}
                              </span>
                              <div
                                className="absolute z-20 -right-1.5 -bottom-1.5 w-4 h-4 bg-primary cursor-se-resize rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                onMouseDown={(e) => onResizeStart(e, widget)}
                              />
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 text-[10px] text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span>Bewege die Widgets im virtuellen Bildschirm per Drag-and-drop.</span>
                    <span className="font-bold text-slate-400 bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                      Live-Sync aktiv
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'carplay' && (
            <motion.div
              key="carplay"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-1 xl:grid-cols-5 gap-4"
              >
                {/* Left Column: CarPlay Config */}
                <div className="xl:col-span-2 space-y-4">
                  {/* CarPlay Window Activation and Theme */}
                  <div className="frosted-card bg-[#000000] border-2 border-primary/20 shadow-xl !p-4 transition-all duration-300 hover:border-primary hover:shadow-[0_0_25px_var(--primary-glow)] hover-glow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-1 h-4 bg-primary rounded-full" />
                      <h2 className="font-unbounded text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                        <LayoutGrid size={16} /> CarPlay Aktivierung & Design
                      </h2>
                    </div>
                    <p className="text-[10px] text-slate-500 mb-4 uppercase tracking-wider leading-relaxed">
                      Konfiguriere das CarPlay / Android Auto LKW-Zusatzdisplay:
                    </p>

                    <div className="space-y-4">
                      {/* CarPlay Window Activation Toggle */}
                      <label className="flex items-center justify-between cursor-pointer group py-0.5">
                        <div>
                          <span className="text-xs text-slate-300 group-hover:text-white transition-colors block font-bold">CarPlay-Fenster aktivieren</span>
                          <span className="text-[9px] text-slate-500 block">Öffnet ein separates Apple CarPlay / Android Auto Zusatzfenster</span>
                        </div>
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={settings.showCarPlay}
                            onChange={() => updateSetting('showCarPlay', !settings.showCarPlay)}
                            className="sr-only peer"
                          />
                          <div className="switch-toggle" />
                        </div>
                      </label>

                      {settings.showCarPlay && (
                        <div className="space-y-4 pt-3 border-t border-white/5 animate-in fade-in duration-200">
                          {/* Theme selector */}
                          <div className="space-y-2">
                            <span className="text-xs text-slate-400 font-medium block">CarPlay Design-Theme</span>
                            <div className="grid grid-cols-3 gap-1.5">
                              {[
                                { id: 'dark', label: 'Dunkel (Dark)' },
                                { id: 'light', label: 'Hell (Light)' },
                                { id: 'auto', label: 'Automatisch' }
                              ].map(theme => (
                                <button
                                  key={theme.id}
                                  type="button"
                                  onClick={() => updateSetting('carPlayTheme', theme.id as any)}
                                  className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all text-center cursor-pointer ${
                                    settings.carPlayTheme === theme.id
                                      ? 'bg-primary/20 border-primary/50 text-primary shadow-[0_0_8px_var(--primary-glow)]'
                                      : 'bg-[#18181b] border-white/10 text-slate-400 hover:bg-[#27272a] hover:text-white'
                                  }`}
                                >
                                  {theme.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Text scale selector */}
                          <div className="space-y-2">
                            <span className="text-xs text-slate-400 font-medium block">CarPlay Text-Skalierung</span>
                            <div className="grid grid-cols-3 gap-1.5">
                              {[
                                { id: 'small', label: 'Klein (80%)' },
                                { id: 'medium', label: 'Mittel (100%)' },
                                { id: 'large', label: 'Groß (150%)' }
                              ].map(scale => (
                                <button
                                  key={scale.id}
                                  type="button"
                                  onClick={() => updateSetting('carPlayTextScale', scale.id as any)}
                                  className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all text-center cursor-pointer ${
                                    (settings.carPlayTextScale || 'medium') === scale.id
                                      ? 'bg-primary/20 border-primary/50 text-primary shadow-[0_0_8px_var(--primary-glow)]'
                                      : 'bg-[#18181b] border-white/10 text-slate-400 hover:bg-[#27272a] hover:text-white'
                                  }`}
                                >
                                  {scale.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Navigation Instructions Toggle */}
                          <label className="flex items-center justify-between cursor-pointer group py-1 border-t border-white/5 pt-3">
                            <div>
                              <span className="text-xs text-slate-300 group-hover:text-white transition-colors block font-bold">Navigationsanweisungen</span>
                              <span className="text-[9px] text-slate-500 block">Abbiegehinweise und Spurempfehlungen auf der CarPlay-Karte anzeigen</span>
                            </div>
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={settings.carPlayShowNavInstructions !== false}
                                onChange={() => updateSetting('carPlayShowNavInstructions', settings.carPlayShowNavInstructions === false)}
                                className="sr-only peer"
                              />
                              <div className="switch-toggle" />
                            </div>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CarPlay Web & Tablet Access URL Card */}
                  <div className="frosted-card bg-[#000000] border-2 border-primary/20 shadow-xl !p-4 transition-all duration-300 hover:border-primary hover:shadow-[0_0_25px_var(--primary-glow)] hover-glow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-4 bg-primary rounded-full" />
                        <h2 className="font-unbounded text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                          <Globe size={16} /> CarPlay Web- & Tablet-URL
                        </h2>
                      </div>
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-mono text-emerald-400 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Port {carPlayUrls?.port || 8383}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">
                      Streamt dein normales CarPlay-Fenster 1:1 direkt im Netzwerk. Du kannst das Cockpit auf deinem iPad, Tablet oder Smartphone per Touch fernsteuern – ohne ein 2. CarPlay starten zu müssen:
                    </p>

                    <div className="space-y-3">
                      {/* Local PC URL */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                            <Monitor size={12} className="text-primary" /> Lokale URL (Dieser PC & OBS)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-[#121214] p-1.5 rounded-xl border border-white/10">
                          <input
                            type="text"
                            readOnly
                            value={carPlayUrls?.localUrl || 'http://localhost:8383'}
                            className="bg-transparent text-xs text-primary font-mono px-2 py-1 w-full outline-none select-all"
                          />
                          <button
                            type="button"
                            onClick={() => copyToClipboard(carPlayUrls?.localUrl || 'http://localhost:8383', 'local')}
                            className="px-2.5 py-1 bg-primary/20 hover:bg-primary/30 text-primary text-[10px] font-black uppercase tracking-wider rounded-lg border border-primary/40 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                            title="In die Zwischenablage kopieren"
                          >
                            {copiedUrlType === 'local' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                            {copiedUrlType === 'local' ? 'Kopiert!' : 'Kopieren'}
                          </button>
                          <button
                            type="button"
                            onClick={() => openInBrowser(carPlayUrls?.localUrl || 'http://localhost:8383')}
                            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-slate-300 hover:text-white rounded-lg border border-white/10 transition-all cursor-pointer shrink-0"
                            title="Direkt im Browser öffnen"
                          >
                            <ExternalLink size={13} />
                          </button>
                        </div>
                      </div>

                      {/* WLAN / Tablet URL */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                            <Smartphone size={12} className="text-sky-400" /> WLAN / iPad-URL (Im Heimnetzwerk)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-[#121214] p-1.5 rounded-xl border border-white/10">
                          <input
                            type="text"
                            readOnly
                            value={carPlayUrls?.networkUrl || `http://${carPlayUrls?.lanIp || '192.168.x.x'}:8383`}
                            className="bg-transparent text-xs text-sky-300/90 font-mono px-2 py-1 w-full outline-none select-all"
                          />
                          <button
                            type="button"
                            onClick={() => copyToClipboard(carPlayUrls?.networkUrl || `http://${carPlayUrls?.lanIp || 'localhost'}:8383`, 'network')}
                            className="px-2.5 py-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 text-[10px] font-black uppercase tracking-wider rounded-lg border border-sky-500/40 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                            title="In die Zwischenablage kopieren"
                          >
                            {copiedUrlType === 'network' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                            {copiedUrlType === 'network' ? 'Kopiert!' : 'Kopieren'}
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/5 flex items-start gap-2 text-[10px] text-slate-400 leading-relaxed">
                        <Wifi size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>iPad-Tipp:</strong> Öffne die WLAN-URL in Safari auf deinem iPad und wähle „Zum Home-Bildschirm“. Du erhältst ein vollflächiges Touch-Cockpit, das dein normales PC-CarPlay steuert!
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* CarPlay Notifications settings */}
                  <div className="frosted-card bg-[#000000] border-2 border-primary/20 shadow-xl !p-4 transition-all duration-300 hover:border-primary hover:shadow-[0_0_25px_var(--primary-glow)] hover-glow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-1 h-4 bg-primary rounded-full" />
                      <h2 className="font-unbounded text-sm font-bold text-primary uppercase tracking-widest">
                        Cockpit-Alerts & Hinweise
                      </h2>
                    </div>
                    <p className="text-[10px] text-slate-500 mb-4 uppercase tracking-wider leading-relaxed">
                      Benachrichtigungen direkt auf dem CarPlay-Display:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
                      {[
                        { key: 'carPlayNotifySpeed', label: 'Geschwindigkeitswarnung', desc: 'Alert bei Überschreitung des Limits' },
                        { key: 'carPlayNotifyFuel', label: 'Treibstoffwarnung', desc: 'Alert bei Reserve-Füllstand' },
                        { key: 'carPlayNotifyRest', label: 'Müdigkeitswarnung', desc: 'Alert bei Lenkzeit-Pause < 30m' },
                        { key: 'carPlayNotifyDamage', label: 'Schadenswarnung', desc: 'Alert bei Erhöhung des LKW-Schadens' },
                        { key: 'carPlayNotifyCargo', label: 'Auftragswarnung', desc: 'Alert bei Annahme eines Auftrags' },
                        { key: 'carPlayNotifyMusic', label: 'Songwechsel', desc: 'Alert bei neuem Musiktitel' },
                        { key: 'carPlayNotifyChat', label: 'Chatnachrichten', desc: 'Alert bei privaten & Gruppen-DMs' },
                        { key: 'carPlayNotifyNews', label: 'Firmen-News', desc: 'Alert bei neuen Speditions-News' },
                        { key: 'carPlayNotifyEvent', label: 'Speditionsevents', desc: 'Alert bei neuen convoys & Events' }
                      ].map(item => (
                        <label key={item.key} className="flex items-center justify-between cursor-pointer group py-1 border-b border-white/[0.03]">
                          <div className="min-w-0 pr-2">
                            <span className="text-xs text-slate-300 group-hover:text-white transition-colors block truncate">{item.label}</span>
                            <span className="text-[8px] text-slate-500 group-hover:text-slate-400 transition-colors block truncate">{item.desc}</span>
                          </div>
                          <div className="relative shrink-0">
                            <input
                              type="checkbox"
                              checked={settings[item.key as keyof OverlaySettingsType] !== false}
                              onChange={() => updateSetting(item.key, settings[item.key as keyof OverlaySettingsType] === false)}
                              className="sr-only peer"
                            />
                            <div className="switch-toggle" />
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Hotkeys settings */}
                  <div className="frosted-card bg-[#000000] border-2 border-primary/20 shadow-xl !p-4 transition-all duration-300 hover:border-primary hover:shadow-[0_0_25px_var(--primary-glow)] hover-glow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-1 h-4 bg-primary rounded-full" />
                      <h2 className="font-unbounded text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                        <Keyboard size={16} /> Tastatur-Steuerung (Hotkeys)
                      </h2>
                    </div>
                    <p className="text-[9px] text-slate-500 leading-tight mb-3">
                      Klicke auf das Feld und drücke die gewünschte Tastenkombination, um sie für das Cockpit zu hinterlegen.
                    </p>

                    <div className="space-y-2">
                      {[
                        { key: 'toggle', label: 'CarPlay Ein/Ausblenden' },
                        { key: 'home', label: 'Home-Bildschirm' },
                        { key: 'playPause', label: 'Medien Play/Pause' },
                        { key: 'navUp', label: 'Navigation Hoch' },
                        { key: 'navDown', label: 'Navigation Runter' },
                        { key: 'navLeft', label: 'Navigation Links' },
                        { key: 'navRight', label: 'Navigation Rechts' },
                        { key: 'navEnter', label: 'Navigation Auswählen (Enter)' },
                        { key: 'navBack', label: 'Navigation Zurück' }
                      ].map(item => (
                        <div key={item.key} className="flex items-center justify-between py-1 border-b border-white/[0.02]">
                          <span className="text-xs text-slate-300 font-medium">{item.label}</span>
                          <HotkeyRecorder
                            value={settings.carPlayHotkeys?.[item.key as keyof typeof settings.carPlayHotkeys] || ''}
                            onChange={(val) => {
                              const currentHotkeys = settings.carPlayHotkeys || {
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
                              updateSetting('carPlayHotkeys', { ...currentHotkeys, [item.key]: val });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: CarPlay Simulator & Guide */}
                <div className="xl:col-span-3 space-y-4">
                  {/* Simulated CarPlay Splitscreen Box */}
                  <div className="frosted-card bg-[#000000] border-2 border-primary/20 shadow-xl !p-4 flex flex-col transition-all duration-300 hover:border-primary hover:shadow-[0_0_25px_var(--primary-glow)] hover-glow">
                    <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-4 bg-primary rounded-full" />
                        <h2 className="font-unbounded text-sm font-bold text-primary uppercase tracking-widest">
                          CarPlay Cockpit Simulator
                        </h2>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                        Theme: {settings.carPlayTheme.toUpperCase()}
                      </span>
                    </div>

                    <div
                      className="relative w-full aspect-[1024/380] rounded-2xl border-2 border-white/5 overflow-hidden shadow-[inset_0_4px_30px_rgba(0,0,0,0.9)] flex"
                      style={{
                        background: settings.carPlayTheme === 'titan'
                          ? 'linear-gradient(135deg, #1f232d 0%, #111317 100%)'
                          : undefined,
                        backgroundImage: settings.carPlayTheme !== 'titan'
                          ? 'radial-gradient(rgba(var(--app-glow-rgb, 245, 158, 11), 0.08) 1px, transparent 1px)'
                          : undefined,
                        backgroundSize: '15px 15px',
                        backgroundColor: settings.carPlayTheme === 'light'
                          ? '#f1f3f6'
                          : settings.carPlayTheme === 'blue'
                            ? '#0b132b'
                            : '#000000',
                        color: settings.carPlayTheme === 'light' ? '#1e293b' : '#eceff1',
                      }}
                    >
                      {/* Left Sidebar Mock */}
                      <div className={`w-12 h-full flex flex-col justify-between py-2 items-center border-r shrink-0 text-[8px] font-black ${
                        settings.carPlayTheme === 'light'
                          ? 'bg-[#e2e7ec] border-slate-300 text-[#334155]'
                          : 'bg-black/40 border-white/5 text-slate-400'
                      }`}>
                        <div className="flex flex-col items-center gap-1.5">
                          <span className={`px-1 py-0.5 rounded scale-75 ${
                            settings.carPlayTheme === 'light' ? 'bg-slate-300 text-slate-900' : 'text-white bg-black/60'
                          }`}>12:00</span>
                          <div className="w-5 h-5 rounded-full border border-red-500 bg-white flex items-center justify-center text-[7px] text-black font-bold">80</div>
                        </div>
                        
                        <div className="flex flex-col gap-1.5 scale-75">
                          <div className="w-6 h-6 rounded-lg bg-primary/20 text-primary border border-primary/30 flex items-center justify-center">🏠</div>
                          <div className="w-6 h-6 rounded-lg bg-black/5 text-slate-500 flex items-center justify-center">🎵</div>
                          <div className="w-6 h-6 rounded-lg bg-black/5 text-slate-500 flex items-center justify-center">💼</div>
                          <div className="w-6 h-6 rounded-lg bg-black/5 text-slate-500 flex items-center justify-center">🚚</div>
                        </div>

                        <div className="text-emerald-500 scale-75">📶</div>
                      </div>

                      {/* Main Preview layout */}
                      <div className="flex-1 p-3 flex flex-col justify-between overflow-hidden">
                        <div className="flex-1 grid grid-cols-12 gap-3.5">
                          {/* Left: GPS Map Widget preview */}
                          <div className={`col-span-7 border rounded-xl flex flex-col items-center justify-center text-center p-4 ${
                            settings.carPlayTheme === 'light'
                              ? 'bg-white border-slate-300 text-slate-900 shadow-sm'
                              : 'bg-black/35 border-white/10 text-slate-300'
                          }`}>
                            <span className="text-[14px] text-primary animate-pulse">🗺️</span>
                            <span className="text-[9px] font-black tracking-wider uppercase mt-1">Live Map Widget</span>
                            <span className="text-[7.5px] opacity-60 mt-0.5">Automatisches GPS Tracking</span>
                          </div>

                          {/* Right side widgets */}
                          <div className="col-span-5 flex flex-col gap-2.5 justify-between">
                            {/* Media Widget preview */}
                            <div className={`flex-1 border rounded-xl p-2 flex items-center gap-2 ${
                              settings.carPlayTheme === 'light'
                                ? 'bg-white border-slate-300 text-slate-900 shadow-sm'
                                : 'bg-black/35 border-white/10 text-white'
                            }`}>
                              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs">🎵</div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[8px] font-black truncate leading-none">Mock-Song</p>
                                <p className="text-[7px] font-bold opacity-60 truncate mt-0.5">Künstler</p>
                                <div className="h-0.5 w-full bg-black/10 rounded-full mt-1.5 overflow-hidden">
                                  <div className="h-full w-2/3 bg-primary" />
                                </div>
                              </div>
                            </div>

                            {/* Telemetry Widget preview */}
                            <div className={`flex-1 border rounded-xl p-2 flex items-center justify-between ${
                              settings.carPlayTheme === 'light'
                                ? 'bg-white border-slate-300 text-slate-900 shadow-sm'
                                : 'bg-black/35 border-white/10 text-white'
                            }`}>
                              <div>
                                <span className="text-[7px] opacity-60 block leading-none">TEMPO</span>
                                <span className="text-sm font-black leading-none tracking-tight">84 KM/H</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[7px] opacity-60 block leading-none">GANG</span>
                                <span className="text-[8.5px] font-black text-primary uppercase">D12</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-1 flex items-center justify-between text-[7px] text-slate-550 font-bold border-t border-white/5 pt-1">
                          <span>MOCK PREVIEW (1024x380)</span>
                          <span className="text-slate-400 font-black">Live-Dashboard</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 text-[10px] text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span>Vorschau des CarPlay / Android Auto Splitscreens im virtuellen Cockpit-Modus.</span>
                      <span className="font-bold text-slate-400 bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                        {settings.showCarPlay ? 'CarPlay Aktiv' : 'CarPlay Inaktiv'}
                      </span>
                    </div>
                  </div>

                  {/* Cockpit Usage Info Card */}
                  <div className="frosted-card bg-[#000000] border-2 border-primary/20 shadow-xl !p-5 transition-all duration-300 hover:border-primary hover:shadow-[0_0_25px_var(--primary-glow)] hover-glow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-1 h-4 bg-primary rounded-full" />
                      <h2 className="font-unbounded text-sm font-bold text-primary uppercase tracking-widest">
                        Zweitdisplay & Tablet-Nutzung
                      </h2>
                    </div>
                    <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                      <p>
                        Das CarPlay Cockpit wurde speziell als <strong>separates Zusatzdisplay</strong> für dein ETS2 / ATS Fahrerlebnis entwickelt:
                      </p>
                      <ul className="space-y-2 text-[11px] text-slate-400 list-disc list-inside">
                        <li>
                          <strong className="text-white">Zweiter Monitor / Mini-Screen:</strong> Ziehe das geöffnete CarPlay-Fenster einfach auf deinen zweiten Bildschirm oder ein kleines Display am Simulator-Rig.
                        </li>
                        <li>
                          <strong className="text-white">Kabelloser Tablet-Modus per URL:</strong> Öffne die oben angezeigte Netzwerk-URL auf deinem Tablet (iPad, Android) oder Smartphone im selben WLAN. Die Telemetrie synchronisiert sich in Echtzeit!
                        </li>
                        <li>
                          <strong className="text-white">Hotkeys & Lenkrad-Buttons:</strong> Belege die Tastatur-Hotkeys (z.B. Strg+Alt+Taste) direkt auf Knöpfe deines Lenkrads oder einer Button-Box, um durch das Cockpit zu schalten ohne die Hände vom Lenkrad zu nehmen.
                        </li>
                        <li>
                          <strong className="text-white">Adaptive Skalierung:</strong> Wähle die Textskalierung entsprechend der Auflösung deines Zweitbildschirms für beste Lesbarkeit bei Nachtfahrten.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'app' && (
              <motion.div
                key="app"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-1 xl:grid-cols-5 gap-6 max-w-7xl mx-auto"
              >
                {/* Hidden File Input for Background Image Upload */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageFileChange}
                  accept="image/*"
                  className="hidden"
                />

                {/* Left Column: System-Dienste, Akzentfarbe & Hintergrund-Optionen (3 Columns) */}
                <div className="xl:col-span-3 space-y-6">
                  {/* System Services: Discord RPC */}
                  <div className="frosted-card bg-[#000000] border-2 border-primary/20 shadow-xl !p-5 transition-all duration-300 hover:border-primary hover:shadow-[0_0_25px_var(--primary-glow)] hover-glow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-1 h-4 bg-primary rounded-full" />
                      <h2 className="font-unbounded text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                        <Sparkles size={16} /> System-Dienste & Integrationen
                      </h2>
                    </div>

                    <div className="bg-zinc-950/60 rounded-2xl border border-white/5 p-4 space-y-4">
                      {/* Master Switch Header */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-[#5865F2]/15 border border-[#5865F2]/40 flex items-center justify-center text-[#5865F2] shrink-0 shadow-lg shadow-[#5865F2]/10">
                            <DiscordIcon size={22} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-white tracking-wide">Discord Rich Presence (RPC)</span>
                              <span
                                className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                                  rpcActive
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-zinc-800 text-zinc-400 border border-white/5'
                                }`}
                              >
                                {rpcActive ? 'Aktiv' : 'Inaktiv'}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                              Teilt deinen Fahrstatus (LKW, Fracht, Route, Tempo & Konvoi) live in deinem Discord-Profil.
                            </p>
                          </div>
                        </div>
                        <label className="relative cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={rpcActive}
                            onChange={toggleRpc}
                            className="sr-only peer"
                          />
                          <div className="switch-toggle" />
                        </label>
                      </div>

                      {/* Expanded Options when Active */}
                      {rpcActive && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-3 border-t border-white/5 space-y-4"
                        >
                          {/* Presets Selection */}
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-2">
                              Status-Modus (Preset)
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {[
                                {
                                  id: 'detailed',
                                  title: '🌟 Detailliert',
                                  desc: 'Volle Telemetrie (Frachtgewicht, Rest-KM, Countdown & Radar)'
                                },
                                {
                                  id: 'compact',
                                  title: '⚡ Kompakt',
                                  desc: 'Schlanker Status (Nur LKW, Server und Route)'
                                },
                                {
                                  id: 'privacy',
                                  title: '🕶️ Streamer / Privacy',
                                  desc: 'Schutz vor Stream-Sniping: Zielort & Fracht bleiben geheim'
                                }
                              ].map((preset) => {
                                const isSelected = rpcSettings.preset === preset.id;
                                return (
                                  <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => updateRpcSetting('preset', preset.id as any)}
                                    className={`text-left p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                                      isSelected
                                        ? 'bg-[#5865F2]/15 border-[#5865F2] shadow-[0_0_15px_rgba(88,101,242,0.25)]'
                                        : 'bg-zinc-900/50 border-white/5 hover:border-white/20 hover:bg-zinc-900/80'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-white">{preset.title}</span>
                                      {isSelected && <Check size={14} className="text-[#5865F2]" />}
                                    </div>
                                    <p className="text-[10px] text-zinc-400 mt-1 leading-snug">{preset.desc}</p>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Feature Toggles */}
                          {rpcSettings.preset !== 'privacy' && (
                            <div className="space-y-2 pt-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1.5">
                                Erweiterte Telemetrie-Details
                              </label>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {/* ETA Countdown */}
                                <div className="p-2.5 rounded-xl bg-zinc-900/40 border border-white/5 flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <span className="text-xs font-bold text-white block">⏳ ETA Live-Countdown</span>
                                    <span className="text-[10px] text-zinc-400 block truncate">Restfahrzeit läuft im Profil rückwärts</span>
                                  </div>
                                  <label className="relative cursor-pointer shrink-0">
                                    <input
                                      type="checkbox"
                                      checked={rpcSettings.showEtaCountdown}
                                      onChange={(e) => updateRpcSetting('showEtaCountdown', e.target.checked)}
                                      className="sr-only peer"
                                    />
                                    <div className="switch-toggle" />
                                  </label>
                                </div>

                                {/* Cargo Mass */}
                                <div className="p-2.5 rounded-xl bg-zinc-900/40 border border-white/5 flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <span className="text-xs font-bold text-white block">📦 Frachtgewicht (Tonnen)</span>
                                    <span className="text-[10px] text-zinc-400 block truncate">z. B. (24.5 t) bei Ladung anzeigen</span>
                                  </div>
                                  <label className="relative cursor-pointer shrink-0">
                                    <input
                                      type="checkbox"
                                      checked={rpcSettings.showCargoMass}
                                      onChange={(e) => updateRpcSetting('showCargoMass', e.target.checked)}
                                      className="sr-only peer"
                                    />
                                    <div className="switch-toggle" />
                                  </label>
                                </div>

                                {/* TruckersMP Nearby Radar */}
                                <div className="p-2.5 rounded-xl bg-zinc-900/40 border border-white/5 flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <span className="text-xs font-bold text-white block">👥 TruckersMP Umkreis-Radar</span>
                                    <span className="text-[10px] text-zinc-400 block truncate">Spieler in der Nähe (GameClientSDK)</span>
                                  </div>
                                  <label className="relative cursor-pointer shrink-0">
                                    <input
                                      type="checkbox"
                                      checked={rpcSettings.showNearbyPlayers}
                                      onChange={(e) => updateRpcSetting('showNearbyPlayers', e.target.checked)}
                                      className="sr-only peer"
                                    />
                                    <div className="switch-toggle" />
                                  </label>
                                </div>

                                {/* Live Map Button */}
                                <div className="p-2.5 rounded-xl bg-zinc-900/40 border border-white/5 flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <span className="text-xs font-bold text-white block">📍 Live-Map Button</span>
                                    <span className="text-[10px] text-zinc-400 block truncate">Freunde können deine Fahrt verfolgen</span>
                                  </div>
                                  <label className="relative cursor-pointer shrink-0">
                                    <input
                                      type="checkbox"
                                      checked={rpcSettings.showLiveMapButton}
                                      onChange={(e) => updateRpcSetting('showLiveMapButton', e.target.checked)}
                                      className="sr-only peer"
                                    />
                                    <div className="switch-toggle" />
                                  </label>
                                </div>

                                {/* Convoy Party Badge */}
                                <div className="p-2.5 rounded-xl bg-zinc-900/40 border border-white/5 flex items-center justify-between gap-3 sm:col-span-2">
                                  <div className="min-w-0">
                                    <span className="text-xs font-bold text-white block">🚩 Konvoi-Gruppenanzeige (Discord Party)</span>
                                    <span className="text-[10px] text-zinc-400 block truncate">Zeigt Konvoi-Teilnehmer und Slot-Zahl bei VTC-Events an</span>
                                  </div>
                                  <label className="relative cursor-pointer shrink-0">
                                    <input
                                      type="checkbox"
                                      checked={rpcSettings.showConvoyParty}
                                      onChange={(e) => updateRpcSetting('showConvoyParty', e.target.checked)}
                                      className="sr-only peer"
                                    />
                                    <div className="switch-toggle" />
                                  </label>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Live Discord Status Widget Preview */}
                          <div className="pt-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[#5865F2] flex items-center gap-1.5 mb-2">
                              <DiscordIcon size={14} /> Discord Profil-Vorschau
                            </label>
                            <div className="bg-[#1e1f22] border border-[#5865F2]/30 rounded-xl p-3.5 shadow-2xl space-y-3 font-sans">
                              <div className="flex items-start gap-3.5">
                                {/* Large Game Icon with Small OPC Badge */}
                                <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 border border-white/10 flex items-center justify-center shrink-0 shadow-md overflow-visible">
                                  <Truck size={28} className="text-zinc-200" />
                                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#5865F2] border-2 border-[#1e1f22] flex items-center justify-center text-white shadow-sm">
                                    <DiscordIcon size={12} />
                                  </div>
                                </div>

                                {/* Activity Info */}
                                <div className="min-w-0 flex-1 space-y-0.5">
                                  <p className="text-xs font-extrabold text-white tracking-wide">Euro Truck Simulator 2</p>
                                  <p className="text-[11px] font-medium text-zinc-300 truncate">
                                    🚛 Scania 770S V8 • 🌐 Simulation 1
                                  </p>
                                  <p className="text-[11px] text-zinc-400 truncate">
                                    {rpcSettings.preset === 'privacy'
                                      ? '🛣️ Auf Achse • ⚡ 78 km/h'
                                      : rpcSettings.preset === 'compact'
                                        ? '📍 Hamburg ➔ Rotterdam' + (rpcSettings.showNearbyPlayers ? ' • 👥 14 im Umkreis' : '')
                                        : `📍 Hamburg ➔ Rotterdam [340 km] • 📦 24.5t Stahl${rpcSettings.showNearbyPlayers ? ' • 👥 14 im Umkreis' : ''}`}
                                  </p>
                                  <p className="text-[10px] text-zinc-400 font-mono flex items-center gap-1.5 pt-0.5">
                                    {rpcSettings.showEtaCountdown && rpcSettings.preset !== 'privacy' ? (
                                      <span className="text-emerald-400 font-semibold">⏳ Noch 00:28:14 verbleibend</span>
                                    ) : (
                                      <span>⏱️ 00:15:32 vergangen</span>
                                    )}
                                  </p>
                                </div>
                              </div>

                              {/* Interactive Buttons Preview */}
                              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                                {rpcSettings.showLiveMapButton && rpcSettings.preset !== 'privacy' ? (
                                  <>
                                    <div className="py-1.5 px-3 rounded-md bg-[#4e5058]/40 hover:bg-[#4e5058]/60 text-white text-[11px] font-bold text-center border border-white/5 transition-all">
                                      📍 Live auf Map
                                    </div>
                                    <div className="py-1.5 px-3 rounded-md bg-[#4e5058]/40 hover:bg-[#4e5058]/60 text-white text-[11px] font-bold text-center border border-white/5 transition-all">
                                      Open Pipe Club
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="py-1.5 px-3 rounded-md bg-[#4e5058]/40 hover:bg-[#4e5058]/60 text-white text-[11px] font-bold text-center border border-white/5 transition-all">
                                      Open Pipe Club
                                    </div>
                                    <div className="py-1.5 px-3 rounded-md bg-[#4e5058]/40 hover:bg-[#4e5058]/60 text-white text-[11px] font-bold text-center border border-white/5 transition-all">
                                      Fahrer-Profil
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* App Accent Color */}
                  <div className="frosted-card bg-[#000000] border-2 border-primary/20 shadow-xl !p-5 transition-all duration-300 hover:border-primary hover:shadow-[0_0_25px_var(--primary-glow)] hover-glow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-4 bg-primary rounded-full" />
                        <h2 className="font-unbounded text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                          <Palette size={16} /> App-Akzentfarbe
                        </h2>
                      </div>
                      {appearance.accentColor.toLowerCase() !== DEFAULT_APPEARANCE.accentColor.toLowerCase() && (
                        <button
                          type="button"
                          onClick={() => {
                            updateAppearance({ accentColor: DEFAULT_APPEARANCE.accentColor });
                            toast.success('Akzentfarbe auf Standard (Amber Orange) zurückgesetzt.');
                          }}
                          className="text-[10px] font-bold text-slate-400 hover:text-primary flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <RotateCcw size={12} /> Standard
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                      Wähle die primäre Akzentfarbe für Buttons, Menü-Highlights, Tacho-Markierungen und Rahmen in der gesamten Desktop-App:
                    </p>

                    {/* Color Presets Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
                      {APP_ACCENT_PRESETS.map(preset => {
                        const isSelected = appearance.accentColor.toLowerCase() === preset.hex.toLowerCase();
                        return (
                          <button
                            key={preset.hex}
                            type="button"
                            onClick={() => updateAppearance({ accentColor: preset.hex })}
                            className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                              isSelected
                                ? 'bg-white/10 border-white/40 shadow-lg'
                                : 'bg-zinc-950/60 border-white/5 hover:border-white/20 hover:bg-white/5'
                            }`}
                          >
                            <span
                              className="w-5 h-5 rounded-full shrink-0 shadow-md flex items-center justify-center border border-white/20"
                              style={{ backgroundColor: preset.hex }}
                            >
                              {isSelected && <Check size={12} className="text-black font-black" />}
                            </span>
                            <div className="min-w-0">
                              <span className="text-[11px] font-bold text-white block truncate">{preset.name}</span>
                              <span className="text-[9px] text-zinc-500 font-mono block uppercase">{preset.hex}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Hex / Color Input */}
                    <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-white/5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <label className="relative cursor-pointer group">
                          <div
                            className="w-9 h-9 rounded-xl border-2 border-white/20 shadow-md group-hover:scale-105 transition-transform"
                            style={{ backgroundColor: appearance.accentColor }}
                          />
                          <input
                            type="color"
                            value={appearance.accentColor}
                            onChange={(e) => updateAppearance({ accentColor: e.target.value })}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            title="Farbe auswählen"
                          />
                        </label>
                        <div>
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Individueller Farbwert</span>
                          <span className="text-xs text-white font-mono font-bold uppercase">{appearance.accentColor}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-black/60 rounded-lg border border-white/10 px-2.5 py-1">
                          <span className="text-xs text-zinc-500 font-mono mr-1">HEX</span>
                          <input
                            type="text"
                            value={appAccentHexInput}
                            onChange={(e) => handleAppAccentHexChange(e.target.value)}
                            placeholder="#f59e0b"
                            maxLength={7}
                            className="bg-transparent text-xs font-mono text-white outline-none w-20 uppercase"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Background Customization */}
                  <div className="frosted-card bg-[#000000] border-2 border-primary/20 shadow-xl !p-5 transition-all duration-300 hover:border-primary hover:shadow-[0_0_25px_var(--primary-glow)] hover-glow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-1 h-4 bg-primary rounded-full" />
                      <h2 className="font-unbounded text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                        <ImageIcon size={16} /> Hintergrund-Design
                      </h2>
                    </div>

                    <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                      Entscheide, wie der Hintergrund der Desktop-App aussehen soll:
                    </p>

                    {/* Background Type Selector (Glow vs Custom Image) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                      {/* Option 1: Standard Glow */}
                      <button
                        type="button"
                        onClick={() => updateAppearance({ backgroundType: 'glow' })}
                        className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                          appearance.backgroundType === 'glow'
                            ? 'bg-primary/10 border-primary shadow-[0_0_20px_var(--primary-glow)]'
                            : 'bg-zinc-950/60 border-white/5 hover:border-white/20 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <Sparkles size={14} className="text-primary" /> Standard-Atmosphäre
                          </span>
                          <span className={`text-[8.5px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${
                            appearance.backgroundType === 'glow' ? 'bg-primary text-black' : 'bg-zinc-800 text-zinc-400'
                          }`}>
                            Klassisch
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          Dunkles Design beibehalten und das bisherige Orange im Hintergrund farblich anpassen.
                        </p>
                      </button>

                      {/* Option 2: Custom Wallpaper */}
                      <button
                        type="button"
                        onClick={() => updateAppearance({ backgroundType: 'custom' })}
                        className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                          appearance.backgroundType === 'custom'
                            ? 'bg-primary/10 border-primary shadow-[0_0_20px_var(--primary-glow)]'
                            : 'bg-zinc-950/60 border-white/5 hover:border-white/20 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <Upload size={14} className="text-primary" /> Eigenes Hintergrundbild
                          </span>
                          <span className={`text-[8.5px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${
                            appearance.backgroundType === 'custom' ? 'bg-primary text-black' : 'bg-zinc-800 text-zinc-400'
                          }`}>
                            Individuell
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          Eigenes Bild von deinem PC hochladen oder eine Bild-URL einbinden mit Weichzeichner.
                        </p>
                      </button>
                    </div>

                    {/* Sub-Settings depending on selected backgroundType */}
                    {appearance.backgroundType === 'glow' ? (
                      /* GLOW SETTINGS */
                      <div className="space-y-4 pt-4 border-t border-white/5 animate-in fade-in duration-300">
                        {/* Sync with Accent Color Switch */}
                        <label className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950/60 border border-white/5 cursor-pointer group">
                          <div>
                            <span className="text-xs text-white font-bold block">Glow-Farbe an Akzentfarbe koppeln</span>
                            <span className="text-[10px] text-zinc-400 block">
                              Der Hintergrund-Glow übernimmt automatisch die gewählte Akzentfarbe ({appearance.accentColor})
                            </span>
                          </div>
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={appearance.syncGlowWithAccent}
                              onChange={(e) => updateAppearance({ syncGlowWithAccent: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="switch-toggle" />
                          </div>
                        </label>

                        {/* Separate Glow Color (if decoupled) */}
                        {!appearance.syncGlowWithAccent && (
                          <div className="p-4 rounded-xl bg-zinc-950/60 border border-white/5 space-y-3 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-white font-bold">Eigene Hintergrund-Glow-Farbe</span>
                              <span className="text-[10px] font-mono text-zinc-400 uppercase">{appearance.glowColor}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <label className="relative cursor-pointer">
                                <div
                                  className="w-9 h-9 rounded-xl border-2 border-white/20 shadow-md"
                                  style={{ backgroundColor: appearance.glowColor }}
                                />
                                <input
                                  type="color"
                                  value={appearance.glowColor}
                                  onChange={(e) => updateAppearance({ glowColor: e.target.value })}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                  title="Glow-Farbe wählen"
                                />
                              </label>
                              <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                                {APP_ACCENT_PRESETS.map(p => (
                                  <button
                                    key={p.hex}
                                    type="button"
                                    onClick={() => updateAppearance({ glowColor: p.hex })}
                                    className={`w-6 h-6 rounded-lg shrink-0 border transition-transform ${
                                      appearance.glowColor.toLowerCase() === p.hex.toLowerCase()
                                        ? 'border-white scale-110 shadow-md'
                                        : 'border-white/10 hover:scale-105'
                                    }`}
                                    style={{ backgroundColor: p.hex }}
                                    title={p.name}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Glow Intensity Slider */}
                        <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-white/5 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white">Glow-Intensität & Helligkeit</span>
                            <span className="font-mono text-primary font-black">{appearance.glowIntensity}%</span>
                          </div>
                          <input
                            type="range"
                            min="30"
                            max="100"
                            value={appearance.glowIntensity}
                            onChange={(e) => updateAppearance({ glowIntensity: Number(e.target.value) })}
                            className="w-full accent-primary cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                          />
                          <div className="flex justify-between text-[9px] text-zinc-500 font-bold uppercase">
                            <span>Dezent (30%)</span>
                            <span>Standard (90%)</span>
                            <span>Kräftig (100%)</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* CUSTOM WALLPAPER SETTINGS */
                      <div className="space-y-4 pt-4 border-t border-white/5 animate-in fade-in duration-300">
                        {/* Upload & URL Buttons */}
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row gap-2.5">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="flex-1 px-4 py-3 rounded-xl bg-primary text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-lg cursor-pointer"
                            >
                              <Upload size={16} /> Bild vom Computer wählen...
                            </button>
                            {appearance.customBgImage && (
                              <button
                                type="button"
                                onClick={handleRemoveCustomBg}
                                className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
                              >
                                <Trash2 size={15} /> Bild entfernen
                              </button>
                            )}
                          </div>

                          {/* URL Input */}
                          <div className="flex items-center gap-2">
                            <input
                              type="url"
                              value={bgUrlInput}
                              onChange={(e) => setBgUrlInput(e.target.value)}
                              placeholder="Oder Bild-URL einfügen (https://...)"
                              className="flex-1 bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-primary"
                            />
                            <button
                              type="button"
                              onClick={handleApplyBgUrl}
                              disabled={!bgUrlInput.trim()}
                              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shrink-0"
                            >
                              Laden
                            </button>
                          </div>
                        </div>

                        {/* Image Preview & Tweak Sliders */}
                        {appearance.customBgImage ? (
                          <div className="p-4 rounded-xl bg-zinc-950/60 border border-white/5 space-y-4">
                            {/* Wallpaper Thumbnail Preview */}
                            <div className="relative h-28 rounded-xl overflow-hidden border border-white/10">
                              <img
                                src={appearance.customBgImage}
                                alt="Hintergrund Vorschau"
                                className="w-full h-full object-cover"
                                style={{
                                  filter: appearance.bgBlur > 0 ? `blur(${appearance.bgBlur}px)` : 'none',
                                }}
                              />
                              <div
                                className="absolute inset-0"
                                style={{ backgroundColor: `rgba(0, 0, 0, ${appearance.bgDim / 100})` }}
                              />
                              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[9px] font-bold text-white border border-white/10">
                                Aktives Wallpaper
                              </div>
                            </div>

                            {/* Dimming Slider */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="font-bold text-white">Abdunklung (Lesbarkeit)</span>
                                <span className="font-mono text-primary font-bold">{appearance.bgDim}%</span>
                              </div>
                              <input
                                type="range"
                                min="20"
                                max="90"
                                value={appearance.bgDim}
                                onChange={(e) => updateAppearance({ bgDim: Number(e.target.value) })}
                                className="w-full accent-primary cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                              />
                              <p className="text-[10px] text-zinc-500">
                                Höhere Werte dunkeln das Bild ab, damit Menüs und Texte glasklar lesbar bleiben.
                              </p>
                            </div>

                            {/* Blur Slider */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="font-bold text-white">Weichzeichner (Tiefeneffekt)</span>
                                <span className="font-mono text-primary font-bold">{appearance.bgBlur} px</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="20"
                                value={appearance.bgBlur}
                                onChange={(e) => updateAppearance({ bgBlur: Number(e.target.value) })}
                                className="w-full accent-primary cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                              />
                              <p className="text-[10px] text-zinc-500">
                                Weichzeichnung erzeugt eine harmonische Tiefenschärfe hinter deinen Fenstern.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="p-6 rounded-xl border border-dashed border-white/10 text-center bg-zinc-950/40">
                            <ImageIcon size={28} className="mx-auto text-zinc-600 mb-2" />
                            <p className="text-xs text-zinc-400 font-bold">Noch kein Hintergrundbild gewählt</p>
                            <p className="text-[10px] text-zinc-500 mt-0.5">
                              Klicke oben auf „Bild vom Computer wählen...“ um dein Lieblingsfoto zu laden.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Live-Vorschau & Status (2 Columns) */}
                <div className="xl:col-span-2 space-y-6">
                  {/* Live Mini Preview Card */}
                  <div className="frosted-card bg-[#000000] border-2 border-primary/20 shadow-xl !p-5 transition-all duration-300 hover:border-primary hover:shadow-[0_0_25px_var(--primary-glow)] hover-glow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-1 h-4 bg-primary rounded-full" />
                      <h2 className="font-unbounded text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                        <Layers size={16} /> Live-Vorschau
                      </h2>
                    </div>

                    {/* Simulated Mini App Window */}
                    <div className="rounded-2xl border border-white/10 bg-[#07090e] p-4 relative overflow-hidden shadow-2xl space-y-3">
                      {/* Background simulation inside mockup */}
                      {appearance.backgroundType === 'custom' && appearance.customBgImage ? (
                        <>
                          <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{
                              backgroundImage: `url(${appearance.customBgImage})`,
                              filter: appearance.bgBlur > 0 ? `blur(${Math.min(appearance.bgBlur, 8)}px)` : 'none',
                            }}
                          />
                          <div
                            className="absolute inset-0"
                            style={{ backgroundColor: `rgba(0, 0, 0, ${appearance.bgDim / 100})` }}
                          />
                        </>
                      ) : (
                        <div
                          className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-60 pointer-events-none"
                          style={{
                            background: `radial-gradient(circle, ${effectiveGlowColor} 0%, transparent 70%)`,
                            filter: 'blur(30px)',
                          }}
                        />
                      )}

                      {/* Mockup Header */}
                      <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                          <span className="text-[10px] font-black text-white ml-2 tracking-wider">OPEN PIPE CLUB</span>
                        </div>
                        <span
                          className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full border shadow-sm"
                          style={{
                            backgroundColor: `${appearance.accentColor}25`,
                            color: appearance.accentColor,
                            borderColor: `${appearance.accentColor}50`,
                          }}
                        >
                          PROFIL AKTIV
                        </span>
                      </div>

                      {/* Mockup UI Elements */}
                      <div className="relative z-10 space-y-2.5 pt-1">
                        <div className="p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-between">
                          <div>
                            <span className="text-[11px] font-bold text-white block">Scania R730 V8 Streamline</span>
                            <span className="text-[9px] text-zinc-400 block">Hamburg → Rotterdam (24t Stahlrohre)</span>
                          </div>
                          <span
                            className="text-xs font-black px-2 py-1 rounded-lg"
                            style={{
                              backgroundColor: appearance.accentColor,
                              color: '#000000',
                            }}
                          >
                            84 KM/H
                          </span>
                        </div>

                        {/* Mock Button & Badge */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-black transition-all shadow-md"
                            style={{ backgroundColor: appearance.accentColor }}
                          >
                            Auftrag starten
                          </button>
                          <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] text-zinc-300 font-bold">
                            Discord RPC {rpcActive ? '✓' : '✗'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 text-[11px] text-zinc-400">
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span>Aktuelle Akzentfarbe:</span>
                        <span className="font-mono font-bold text-white uppercase">{appearance.accentColor}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span>Hintergrund-Modus:</span>
                        <span className="font-bold text-white">
                          {appearance.backgroundType === 'glow' ? 'Dynamischer Glow' : 'Eigenes Wallpaper'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>Discord Status (RPC):</span>
                        <span className={`font-bold ${rpcActive ? 'text-emerald-400' : 'text-zinc-500'}`}>
                          {rpcActive ? 'Aktiviert' : 'Deaktiviert'}
                        </span>
                      </div>
                    </div>

                    {/* Reset All Appearance Button */}
                    <button
                      type="button"
                      onClick={() => {
                        resetAppearance();
                        toast.success('Alle Design-Einstellungen auf Standard zurückgesetzt.');
                      }}
                      className="w-full mt-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <RotateCcw size={14} /> Design auf Werkseinstellungen
                    </button>
                  </div>

                  {/* Info Card */}
                  <div className="frosted-card bg-[#000000] border-2 border-primary/20 shadow-xl !p-5 transition-all duration-300 hover:border-primary hover:shadow-[0_0_25px_var(--primary-glow)] hover-glow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-1 h-4 bg-primary rounded-full" />
                      <h2 className="font-unbounded text-sm font-bold text-primary uppercase tracking-widest">
                        Hinweise & Speicherung
                      </h2>
                    </div>
                    <ul className="space-y-2 text-xs text-slate-400 list-disc list-inside leading-relaxed">
                      <li>
                        <strong className="text-white">Automatische Speicherung:</strong> Alle Design- und Farbänderungen werden sofort im lokalen Speicher deines PCs gesichert und bleiben auch nach Schließen der App dauerhaft erhalten.
                      </li>
                      <li>
                        <strong className="text-white">Kein Neustart erforderlich:</strong> Deine Anpassungen wirken sich in Echtzeit auf alle Bereiche der Benutzeroberfläche aus.
                      </li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tab 4: TruckersMP UI Anpassung */}
            {activeTab === 'tmp-ui' && (
              <motion.div
                key="tmp-ui"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                style={{
                  '--tmp-accent': tmpColor,
                  '--tmp-accent-glow': `${tmpColor}45`,
                  '--tmp-accent-dim': `${tmpColor}20`,
                } as React.CSSProperties}
                className="grid grid-cols-1 xl:grid-cols-5 gap-4"
              >
                {/* Left Column: Settings, Colors & Background Slots */}
                <div className="xl:col-span-2 space-y-4">
                  {/* System & Status Card */}
                  <div
                    className="frosted-card bg-[#000000] border-2 shadow-xl !p-4 transition-all duration-300 hover-glow"
                    style={{
                      borderColor: `${tmpColor}35`,
                      boxShadow: `0 10px 30px rgba(0,0,0,0.6)`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = tmpColor;
                      e.currentTarget.style.boxShadow = `0 0 25px ${tmpColor}45`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = `${tmpColor}35`;
                      e.currentTarget.style.boxShadow = `0 10px 30px rgba(0,0,0,0.6)`;
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-4 rounded-full" style={{ backgroundColor: tmpColor }} />
                        <h2 className="font-unbounded text-sm font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: tmpColor }}>
                          <Truck size={16} /> TruckersMP Installation
                        </h2>
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                        tmpInfo?.dataDir
                          ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                          : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                      }`}>
                        {tmpInfo?.dataDir ? 'Gefunden' : 'Nicht gefunden'}
                      </span>
                    </div>

                    <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Installationsordner:</span>
                        <span className="font-mono text-[10px] text-slate-300 truncate max-w-[200px]" title={customDataDir || tmpInfo?.dataDir || ''}>
                          {customDataDir || tmpInfo?.dataDir || 'Kein Pfad erkannt'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Aktueller Mod-Status:</span>
                        <span className={`font-bold text-[10px] flex items-center gap-1 ${tmpInfo?.isModInstalled ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {tmpInfo?.isModInstalled ? <CheckCircle2 size={12} /> : null}
                          {tmpInfo?.isModInstalled ? 'Modifikation installiert' : 'Standard / Keine Mod'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={handleOpenTmpFolder}
                        className="flex-1 py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <FolderOpen size={14} style={{ color: tmpColor }} /> Ordner im Explorer
                      </button>
                      <button
                        onClick={handleSelectCustomDataDir}
                        className="py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-slate-400 hover:text-white transition-all cursor-pointer"
                        title="Anderen TruckersMP-Datenordner wählen"
                      >
                        Pfad ändern
                      </button>
                    </div>
                  </div>

                  {/* UI Skin Colors Card */}
                  <div
                    className="frosted-card bg-[#000000] border-2 shadow-xl !p-4 transition-all duration-300 hover-glow"
                    style={{
                      borderColor: `${tmpColor}35`,
                      boxShadow: `0 10px 30px rgba(0,0,0,0.6)`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = tmpColor;
                      e.currentTarget.style.boxShadow = `0 0 25px ${tmpColor}45`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = `${tmpColor}35`;
                      e.currentTarget.style.boxShadow = `0 10px 30px rgba(0,0,0,0.6)`;
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-4 rounded-full" style={{ backgroundColor: tmpColor }} />
                        <h2 className="font-unbounded text-sm font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: tmpColor }}>
                          <Palette size={16} /> UI-Farbe & Akzente
                        </h2>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: tmpColor }} />
                        <span className="font-mono text-[10px] text-slate-300 font-bold">{tmpColor.toUpperCase()}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal mb-3">
                      Passe die Farbe von Menü-Titeln, Buttons, Tabs, Schiebereglern und Fensterrahmen an (<code style={{ color: tmpColor }}>ui_skin.png</code>).
                    </p>

                    {/* Color Presets Grid */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {TMP_COLOR_PRESETS.map(preset => {
                        const isSelected = tmpColor.toLowerCase() === preset.hex.toLowerCase();
                        return (
                          <button
                            key={preset.hex}
                            onClick={() => selectTmpColorPreset(preset.hex)}
                            style={isSelected ? {
                              borderColor: preset.hex,
                              backgroundColor: `${preset.hex}22`,
                              boxShadow: `0 0 16px ${preset.hex}60`
                            } : {}}
                            className={`p-2 rounded-xl border flex items-center gap-2 text-left transition-all cursor-pointer ${
                              isSelected
                                ? ''
                                : 'border-white/5 bg-white/[0.02] hover:border-white/15'
                            }`}
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/20 shadow-sm"
                              style={{ backgroundColor: preset.hex }}
                            />
                            <span className="text-[10px] font-bold text-white truncate">{preset.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Color Input & Picker Button */}
                    {(() => {
                      const isCustomColor = !TMP_COLOR_PRESETS.some(p => p.hex.toLowerCase() === tmpColor.toLowerCase());
                      return (
                        <div className="space-y-2">
                          <button
                            onClick={() => setShowTmpColorModal(true)}
                            style={isCustomColor ? {
                              borderColor: tmpColor,
                              backgroundColor: `${tmpColor}22`,
                              boxShadow: `0 0 16px ${tmpColor}50`
                            } : {}}
                            className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between gap-2 cursor-pointer ${
                              isCustomColor
                                ? 'text-white'
                                : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/10 hover:border-white/20 text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Palette size={14} style={{ color: tmpColor }} />
                              <span>Eigene Farbe (Colorpicker)</span>
                            </div>
                            {isCustomColor ? (
                              <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: tmpColor }} />
                                <span className="font-mono text-[10px] uppercase text-white font-bold">{tmpColor} (Aktiv)</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400">Farbrad öffnen</span>
                            )}
                          </button>

                          {/* Direct HEX Input */}
                          <div className="flex items-center gap-2">
                            <div
                              className="flex-1 flex items-center bg-black/60 rounded-xl border px-3 py-1.5 transition-colors"
                              style={{ borderColor: `${tmpColor}50` }}
                            >
                              <span className="text-[10px] text-slate-500 font-mono mr-2 font-bold">HEX</span>
                              <input
                                type="text"
                                value={tmpColor}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTmpColor(val);
                                  if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                                    setTmpHsv(hexToHsv(val));
                                    localStorage.setItem('openpipeclub_tmp_color', val);
                                  }
                                }}
                                placeholder="#007aff"
                                maxLength={7}
                                className="bg-transparent text-xs font-mono text-white outline-none w-full uppercase"
                              />
                            </div>
                            <button
                              onClick={() => setShowTmpColorModal(true)}
                              className="py-1.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                              style={{
                                borderColor: `${tmpColor}60`,
                                backgroundColor: `${tmpColor}18`,
                                color: '#fff'
                              }}
                            >
                              <SlidersHorizontal size={12} style={{ color: tmpColor }} />
                              <span>Farbrad</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Texture Preview Badge */}
                    {recoloredSkinUrl && (
                      <div className="mt-3 p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={recoloredSkinUrl}
                            alt="ui_skin.png"
                            className="w-8 h-8 rounded-lg border border-white/10 object-cover bg-black"
                          />
                          <div>
                            <span className="text-[10px] font-bold text-slate-200 block">Echtzeit-Textur</span>
                            <span className="text-[8px] text-slate-500 font-mono">ui_skin.png (512x512)</span>
                          </div>
                        </div>
                        <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                          Eingefärbt
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Firmenbanner Card */}
                  <div
                    className="frosted-card bg-[#000000] border-2 shadow-xl !p-4 transition-all duration-300 hover-glow"
                    style={{
                      borderColor: `${tmpColor}35`,
                      boxShadow: `0 10px 30px rgba(0,0,0,0.6)`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = tmpColor;
                      e.currentTarget.style.boxShadow = `0 0 25px ${tmpColor}45`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = `${tmpColor}35`;
                      e.currentTarget.style.boxShadow = `0 10px 30px rgba(0,0,0,0.6)`;
                    }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-1 h-4 rounded-full" style={{ backgroundColor: tmpColor }} />
                      <h2 className="font-unbounded text-sm font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: tmpColor }}>
                        <ImageIcon size={16} /> Firmenbanner (Hauptlogo)
                      </h2>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-xs font-bold text-white block">Menü- & Hauptbanner</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Wähle zwischen dem offiziellen Open Pipe Club Firmenbanner oder dem Standard TruckersMP-Banner.
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {/* Option A: Open Pipe Club Firmenbanner */}
                        <button
                          type="button"
                          onClick={() => {
                            setUseCompanyBanner(true);
                            localStorage.setItem('openpipeclub_tmp_company_banner', 'company');
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            useCompanyBanner
                              ? 'border-opacity-100 shadow-md'
                              : 'border-white/5 bg-white/[0.02] hover:border-white/15 opacity-70'
                          }`}
                          style={useCompanyBanner ? {
                            borderColor: tmpColor,
                            backgroundColor: `${tmpColor}12`
                          } : {}}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: useCompanyBanner ? tmpColor : '#64748b' }} />
                              Firmenbanner
                            </span>
                            {useCompanyBanner && (
                              <span className="text-[8px] font-black px-1.5 py-0.5 rounded text-black" style={{ backgroundColor: tmpColor }}>
                                AKTIV
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-slate-400">
                            Offizielles Club-Banner
                          </span>
                        </button>

                        {/* Option B: Standard TruckersMP Banner */}
                        <button
                          type="button"
                          onClick={() => {
                            setUseCompanyBanner(false);
                            localStorage.setItem('openpipeclub_tmp_company_banner', 'standard');
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            !useCompanyBanner
                              ? 'border-opacity-100 shadow-md'
                              : 'border-white/5 bg-white/[0.02] hover:border-white/15 opacity-70'
                          }`}
                          style={!useCompanyBanner ? {
                            borderColor: tmpColor,
                            backgroundColor: `${tmpColor}12`
                          } : {}}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: !useCompanyBanner ? tmpColor : '#64748b' }} />
                              Standard TMP
                            </span>
                            {!useCompanyBanner && (
                              <span className="text-[8px] font-black px-1.5 py-0.5 rounded text-black" style={{ backgroundColor: tmpColor }}>
                                AKTIV
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-slate-400">
                            Vanilla TruckersMP Logo
                          </span>
                        </button>
                      </div>

                      {/* Preview Firmenbanner if active */}
                      {useCompanyBanner && (
                        <div className="p-3 rounded-xl bg-black/60 border border-white/10 space-y-2">
                          <div className="w-full h-16 rounded-lg overflow-hidden border border-white/10 bg-zinc-950/80 flex items-center justify-center p-1 relative group">
                            <img
                              src={tmpInfo?.companyBannerThumb || '/images/truckers_white_final.png'}
                              alt="Open Pipe Club Firmenbanner"
                              className="max-h-full max-w-full object-contain filter drop-shadow-md"
                            />
                            <div className="absolute top-1 right-2 text-[8px] font-mono text-slate-500 bg-black/70 px-1.5 py-0.5 rounded">
                              1600 × 391 px
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[9px] text-slate-400">
                            <span className="flex items-center gap-1 text-emerald-400 font-medium">
                              <CheckCircle2 size={11} /> Passendes Club-Banner integriert
                            </span>
                            <span className="font-mono text-[8px] text-slate-500">
                              truckers_white_final.png
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Serverlisten-Banner Card (Server 1 bis 5) */}
                  <div
                    className="frosted-card bg-[#000000] border-2 shadow-xl !p-4 transition-all duration-300 hover-glow"
                    style={{
                      borderColor: `${tmpColor}35`,
                      boxShadow: `0 10px 30px rgba(0,0,0,0.6)`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = tmpColor;
                      e.currentTarget.style.boxShadow = `0 0 25px ${tmpColor}45`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = `${tmpColor}35`;
                      e.currentTarget.style.boxShadow = `0 10px 30px rgba(0,0,0,0.6)`;
                    }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-1 h-4 rounded-full" style={{ backgroundColor: tmpColor }} />
                      <h2 className="font-unbounded text-sm font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: tmpColor }}>
                        <Layers size={16} /> Serverlisten-Banner (Server 1 – 5)
                      </h2>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-xs font-bold text-white block">Serverlisten-Grafiken</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Jeder Server besitzt 2 Grafiken: Eine für den normalen Zustand und eine, wenn der Server ausgewählt ist.
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {/* Option A: Club Server-Banner */}
                        <button
                          type="button"
                          onClick={() => {
                            setUseServerBanners(true);
                            localStorage.setItem('openpipeclub_tmp_server_banners', 'company');
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            useServerBanners
                              ? 'border-opacity-100 shadow-md'
                              : 'border-white/5 bg-white/[0.02] hover:border-white/15 opacity-70'
                          }`}
                          style={useServerBanners ? {
                            borderColor: tmpColor,
                            backgroundColor: `${tmpColor}12`
                          } : {}}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: useServerBanners ? tmpColor : '#64748b' }} />
                              Club-Banner
                            </span>
                            {useServerBanners && (
                              <span className="text-[8px] font-black px-1.5 py-0.5 rounded text-black" style={{ backgroundColor: tmpColor }}>
                                AKTIV
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-slate-400">
                            Custom Server 1 – 5 Banner
                          </span>
                        </button>

                        {/* Option B: Standard TMP */}
                        <button
                          type="button"
                          onClick={() => {
                            setUseServerBanners(false);
                            localStorage.setItem('openpipeclub_tmp_server_banners', 'standard');
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            !useServerBanners
                              ? 'border-opacity-100 shadow-md'
                              : 'border-white/5 bg-white/[0.02] hover:border-white/15 opacity-70'
                          }`}
                          style={!useServerBanners ? {
                            borderColor: tmpColor,
                            backgroundColor: `${tmpColor}12`
                          } : {}}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: !useServerBanners ? tmpColor : '#64748b' }} />
                              Standard TMP
                            </span>
                            {!useServerBanners && (
                              <span className="text-[8px] font-black px-1.5 py-0.5 rounded text-black" style={{ backgroundColor: tmpColor }}>
                                AKTIV
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-slate-400">
                            Vanilla Server-Grafiken
                          </span>
                        </button>
                      </div>

                      {/* Per-Server Editor (Server 0..4) */}
                      {useServerBanners && (
                        <div className="p-3 rounded-xl bg-black/60 border border-white/10 space-y-3">
                          {/* Server Tabs */}
                          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-white/[0.03] border border-white/5 overflow-x-auto">
                            {[0, 1, 2, 3, 4].map(idx => {
                              const isActive = activeServerIndex === idx;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setActiveServerIndex(idx)}
                                  className={`flex-1 py-1.5 px-2 rounded-md text-[10px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                                    isActive
                                      ? 'text-black shadow-md'
                                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                                  }`}
                                  style={isActive ? {
                                    backgroundColor: tmpColor
                                  } : {}}
                                >
                                  Server {idx + 1}
                                </button>
                              );
                            })}
                          </div>

                          {/* 2 Banner Slots for Active Server: Normal vs. Selected */}
                          <div className="space-y-2.5">
                            {/* Normal (Nicht ausgewählt) Slot */}
                            <div className="p-2.5 rounded-lg bg-zinc-950/70 border border-white/10 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-white flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                  Nicht ausgewählt (Normal)
                                </span>
                                <span className="text-[8px] font-mono text-slate-500">
                                  server_item_{activeServerIndex}.png
                                </span>
                              </div>

                              <div className="w-full h-12 rounded overflow-hidden border border-white/10 bg-black flex items-center justify-center relative">
                                {serverBanners[activeServerIndex]?.normalThumb ? (
                                  <img
                                    src={serverBanners[activeServerIndex]?.normalThumb}
                                    alt={`Server ${activeServerIndex + 1} Normal`}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-[8px] text-slate-500 font-mono">Kein Bild geladen</span>
                                )}
                              </div>

                              <div className="flex items-center justify-between pt-0.5">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handlePickServerBannerImage(activeServerIndex, 'normal')}
                                    className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-bold text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                                  >
                                    <Upload size={10} /> Bild ändern
                                  </button>
                                  {serverBanners[activeServerIndex]?.normalThumb && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenCropExisting(activeServerIndex, 'normal')}
                                      className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-bold text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                                      title="Vertikalen Bildausschnitt nach oben oder unten verschieben"
                                    >
                                      <Crop size={10} /> Ausschnitt anpassen
                                    </button>
                                  )}
                                </div>
                                <span className="text-[8px] text-slate-500">
                                  Empfohlen: 1280 × 280 px
                                </span>
                              </div>
                            </div>

                            {/* Selected (Ausgewählt) Slot */}
                            <div className="p-2.5 rounded-lg bg-zinc-950/70 border border-white/10 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-white flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tmpColor }} />
                                  Ausgewählt (Selected)
                                </span>
                                <span className="text-[8px] font-mono text-slate-500">
                                  server_item_{activeServerIndex}_sel.png
                                </span>
                              </div>

                              <div className="w-full h-12 rounded overflow-hidden border border-white/10 bg-black flex items-center justify-center relative">
                                {serverBanners[activeServerIndex]?.selectedThumb ? (
                                  <img
                                    src={serverBanners[activeServerIndex]?.selectedThumb}
                                    alt={`Server ${activeServerIndex + 1} Selected`}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-[8px] text-slate-500 font-mono">Kein Bild geladen</span>
                                )}
                              </div>

                              <div className="flex items-center justify-between gap-1 pt-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => handlePickServerBannerImage(activeServerIndex, 'selected')}
                                    className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-bold text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                                  >
                                    <Upload size={10} /> Bild ändern
                                  </button>
                                  {serverBanners[activeServerIndex]?.selectedThumb && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenCropExisting(activeServerIndex, 'selected')}
                                      className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-bold text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                                      title="Vertikalen Bildausschnitt nach oben oder unten verschieben"
                                    >
                                      <Crop size={10} /> Ausschnitt anpassen
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleGenerateSelectedBanner(activeServerIndex)}
                                    className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-bold text-amber-300 hover:text-amber-200 transition-colors cursor-pointer flex items-center gap-1"
                                    title="Erzeugt automatisch die abgedunkelte Ausgewählt-Grafik mit blauem Akzentrand"
                                  >
                                    <Sparkles size={10} /> Aus Normalbild generieren
                                  </button>
                                </div>
                                <span className="text-[8px] text-slate-500">
                                  7680 × 864 px
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Reset Server Button */}
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => handleResetServerBanner(activeServerIndex)}
                              className="text-[9px] text-slate-400 hover:text-white flex items-center gap-1 hover:underline cursor-pointer"
                            >
                              <RotateCcw size={9} /> Server {activeServerIndex + 1} Banner entfernen (Standard TMP)
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ingame-Schriftart Section */}
                  <div
                    className="frosted-card bg-[#000000] border-2 shadow-xl !p-4 transition-all duration-300 hover-glow"
                    style={{
                      borderColor: `${tmpColor}35`,
                      boxShadow: `0 10px 30px rgba(0,0,0,0.6)`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = tmpColor;
                      e.currentTarget.style.boxShadow = `0 0 25px ${tmpColor}45`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = `${tmpColor}35`;
                      e.currentTarget.style.boxShadow = `0 10px 30px rgba(0,0,0,0.6)`;
                    }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-1 h-4 rounded-full" style={{ backgroundColor: tmpColor }} />
                      <h2 className="font-unbounded text-sm font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: tmpColor }}>
                        <Type size={16} /> Ingame-Schriftart
                      </h2>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <span className="text-xs font-bold text-white block">Interface-Typografie</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5 leading-relaxed">
                          Wähle, ob TruckersMP die markante Vereins-Schriftart (<span className="text-slate-200 font-semibold font-unbounded">Unbounded</span>) nutzen soll, wie sie in der gesamten App für Überschriften und das Branding verwendet wird.
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {/* Option A: Standard TMP (Vanilla) */}
                        <button
                          type="button"
                          onClick={() => {
                            setUseAppFonts(false);
                            localStorage.setItem('openpipeclub_tmp_fonts', 'false');
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            !useAppFonts
                              ? 'border-opacity-100 shadow-md'
                              : 'border-white/5 bg-white/[0.02] hover:border-white/15 opacity-70'
                          }`}
                          style={!useAppFonts ? {
                            borderColor: tmpColor,
                            backgroundColor: `${tmpColor}12`
                          } : {}}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: !useAppFonts ? tmpColor : '#64748b' }} />
                              Standard Ingame
                            </span>
                            {!useAppFonts && (
                              <span className="text-[8px] font-black px-1.5 py-0.5 rounded text-black" style={{ backgroundColor: tmpColor }}>
                                AKTIV
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-slate-400 font-sans">
                            OpenSans (Vanilla TMP)
                          </span>
                        </button>

                        {/* Option B: Unbounded (App-Überschriften) */}
                        <button
                          type="button"
                          onClick={() => {
                            setUseAppFonts(true);
                            localStorage.setItem('openpipeclub_tmp_fonts', 'true');
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            useAppFonts
                              ? 'border-opacity-100 shadow-md'
                              : 'border-white/5 bg-white/[0.02] hover:border-white/15 opacity-70'
                          }`}
                          style={useAppFonts ? {
                            borderColor: tmpColor,
                            backgroundColor: `${tmpColor}12`
                          } : {}}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-bold text-white flex items-center gap-1.5 font-unbounded">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: useAppFonts ? tmpColor : '#64748b' }} />
                              Unbounded
                            </span>
                            {useAppFonts && (
                              <span className="text-[8px] font-black px-1.5 py-0.5 rounded text-black" style={{ backgroundColor: tmpColor }}>
                                AKTIV
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-slate-400 font-unbounded">
                            App-Überschriften
                          </span>
                        </button>
                      </div>

                      <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between text-[9px] text-slate-400">
                        <span>
                          {useAppFonts
                            ? '✨ Markante Unbounded-Schriftart (wie für App-Überschriften) aktiv.'
                            : 'Original OpenSans-Schriftarten von TruckersMP bleiben aktiv.'}
                        </span>
                        <span className="font-mono text-[8px] text-slate-500">shared_mod/fonts/</span>
                      </div>
                    </div>
                  </div>

                  {/* Background Images Manager */}
                  <div
                    className="frosted-card bg-[#000000] border-2 shadow-xl !p-4 transition-all duration-300 hover-glow"
                    style={{
                      borderColor: `${tmpColor}35`,
                      boxShadow: `0 10px 30px rgba(0,0,0,0.6)`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = tmpColor;
                      e.currentTarget.style.boxShadow = `0 0 25px ${tmpColor}45`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = `${tmpColor}35`;
                      e.currentTarget.style.boxShadow = `0 10px 30px rgba(0,0,0,0.6)`;
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-4 rounded-full" style={{ backgroundColor: tmpColor }} />
                        <h2 className="font-unbounded text-sm font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: tmpColor }}>
                          <ImageIcon size={16} /> Menü-Hintergründe
                        </h2>
                      </div>
                      <span className="text-[10px] font-bold text-slate-300 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
                        {tmpBgSlots.length} {tmpBgSlots.length === 1 ? 'Bild' : 'Bilder'}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-normal mb-3">
                      TruckersMP zeigt beim Start und im Menü rotierende Wallpaper (<code style={{ color: tmpColor }}>background0.png</code> bis <code style={{ color: tmpColor }}>background{Math.max(0, tmpBgSlots.length - 1)}.png</code>). Du kannst beliebig viele Bilder hinzufügen!
                    </p>

                    {/* Action Bar */}
                    <div className="flex items-center gap-2 mb-3">
                      <button
                        onClick={handleAddCustomImages}
                        className="w-full py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer hover:brightness-110"
                        style={{
                          backgroundColor: tmpColor,
                          color: '#000',
                          boxShadow: `0 0 16px ${tmpColor}60`
                        }}
                      >
                        <Plus size={15} /> Bild(er) hinzufügen
                      </button>
                    </div>

                    {/* Slot List */}
                    {tmpBgSlots.length === 0 ? (
                      <div className="py-8 px-4 rounded-xl border border-dashed border-white/10 bg-white/[0.01] text-center flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${tmpColor}15`, color: tmpColor }}>
                          <ImageIcon size={24} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white mb-1">Noch keine Hintergründe hinzugefügt</h3>
                          <p className="text-xs text-slate-400 max-w-sm">
                            Füge deine eigenen Screenshots oder Bilder hinzu, die im TruckersMP Hauptmenü rotieren sollen.
                          </p>
                        </div>
                        <button
                          onClick={handleAddCustomImages}
                          className="mt-1 py-2 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer hover:brightness-110"
                          style={{
                            backgroundColor: tmpColor,
                            color: '#000',
                            boxShadow: `0 0 16px ${tmpColor}60`
                          }}
                        >
                          <Plus size={15} /> Jetzt Bilder hinzufügen
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 no-scrollbar">
                        {tmpBgSlots.map((slotItem, idx) => (
                          <div
                            key={slotItem.id || idx}
                            style={simActiveSlot === idx ? {
                              borderColor: `${tmpColor}80`,
                              backgroundColor: `${tmpColor}10`
                            } : {}}
                            className={`p-2.5 rounded-xl border transition-all ${
                              simActiveSlot === idx
                                ? 'shadow-md'
                                : 'border-white/5 bg-white/[0.02] hover:border-white/15'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {/* Thumbnail */}
                              <div
                                className="relative w-24 aspect-[16/9] rounded-lg overflow-hidden border border-white/10 bg-black shrink-0 cursor-pointer group"
                                onClick={() => setSimActiveSlot(idx)}
                                title="Klicken für Simulator-Vorschau"
                              >
                                {slotItem.thumb ? (
                                  <img
                                    src={slotItem.thumb}
                                    alt={slotItem.name}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
                                    Kein Bild
                                  </div>
                                )}
                                {simActiveSlot === idx && (
                                  <div
                                    className="absolute top-1 right-1 text-black text-[8px] font-black px-1 rounded shadow-sm"
                                    style={{ backgroundColor: tmpColor }}
                                  >
                                    AKTIV
                                  </div>
                                )}
                              </div>

                              {/* Info & Slot Label */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-bold text-white truncate">
                                    Hintergrund #{idx + 1}
                                  </span>
                                  <span className="font-mono text-[9px] text-slate-500">
                                    (background{idx}.png)
                                  </span>
                                </div>
                                <span className="text-[9px] text-slate-400 block truncate">
                                  {slotItem.filePath ? slotItem.filePath.split('\\').pop() : `Slot ${idx + 1}`}
                                </span>

                                {/* Slot Buttons */}
                                <div className="flex items-center gap-1.5 mt-2">
                                  <button
                                    onClick={() => handleReplaceSlotImage(idx)}
                                    className="px-2 py-1 rounded-md bg-white/[0.05] hover:bg-white/[0.1] border border-white/5 text-[9px] font-bold text-slate-300 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                                    title="Dieses Bild austauschen"
                                  >
                                    <Upload size={10} /> Ändern
                                  </button>
                                  {slotItem.thumb && (
                                    <button
                                      onClick={() => handleOpenPreviewModal(slotItem)}
                                      className="p-1 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white transition-colors cursor-pointer"
                                      title="Große Vorschau"
                                    >
                                      <Maximize2 size={11} />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleApplyToAllSlots(idx)}
                                    className="p-1 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white transition-colors cursor-pointer"
                                    title="Dieses Bild für alle Slots übernehmen"
                                  >
                                    <Copy size={11} />
                                  </button>
                                  {tmpBgSlots.length > 1 && (
                                    <button
                                      onClick={() => handleRemoveSlot(idx)}
                                      className="p-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors ml-auto cursor-pointer"
                                      title="Slot entfernen"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Actions & Simulated TruckersMP Screen */}
                <div className="xl:col-span-3 space-y-4">
                  {/* Primary Action Install Card */}
                  <div
                    className="frosted-card bg-[#000000] border-2 shadow-xl !p-5 transition-all duration-300 hover-glow"
                    style={{
                      borderColor: `${tmpColor}35`,
                      boxShadow: `0 10px 30px rgba(0,0,0,0.6)`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = tmpColor;
                      e.currentTarget.style.boxShadow = `0 0 25px ${tmpColor}45`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = `${tmpColor}35`;
                      e.currentTarget.style.boxShadow = `0 10px 30px rgba(0,0,0,0.6)`;
                    }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h2 className="font-unbounded text-base font-bold text-white uppercase tracking-widest flex items-center gap-2">
                          <Sparkles size={18} style={{ color: tmpColor }} /> TruckersMP UI Mod anwenden
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                          Installiert alle {tmpBgSlots.length} Menühintergründe, das UI-Skin, {useCompanyBanner ? 'das Firmenbanner' : 'das Standard TMP-Banner'} & {useAppFonts ? 'die Vereins-Schriftarten (Unbounded & Outfit)' : 'Standard-Schriftarten'}.
                        </p>
                      </div>

                      <button
                        onClick={handleApplyToTruckersMp}
                        disabled={tmpApplying}
                        style={{
                          backgroundColor: tmpColor,
                          color: '#000',
                          boxShadow: `0 0 25px ${tmpColor}65`
                        }}
                        className={`py-3.5 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer shrink-0 hover:brightness-110 ${
                          tmpApplying ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                        }`}
                      >
                        {tmpApplying ? (
                          <>
                            <RefreshCw size={16} className="animate-spin" />
                            <span>Installiere...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={16} />
                            <span>In TruckersMP anwenden</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <span className="text-slate-500 text-[10px]">
                        💡 Änderungen werden beim nächsten Start des TruckersMP Launchers automatisch geladen.
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleExportMod}
                          className="py-1.5 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download size={12} /> Mod exportieren
                        </button>
                        <button
                          onClick={handleRestoreVanilla}
                          className="py-1.5 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw size={12} /> Auf Standard-TMP
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Simulated TruckersMP Main Menu / Login Window */}
                  <div
                    className="frosted-card bg-[#000000] border-2 shadow-xl !p-4 transition-all duration-300 hover-glow"
                    style={{
                      borderColor: `${tmpColor}35`,
                      boxShadow: `0 10px 30px rgba(0,0,0,0.6)`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = tmpColor;
                      e.currentTarget.style.boxShadow = `0 0 25px ${tmpColor}45`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = `${tmpColor}35`;
                      e.currentTarget.style.boxShadow = `0 10px 30px rgba(0,0,0,0.6)`;
                    }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3 border-b border-white/5 pb-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-4 rounded-full" style={{ backgroundColor: tmpColor }} />
                        <h2 className="font-unbounded text-sm font-bold uppercase tracking-widest" style={{ color: tmpColor }}>
                          TruckersMP Live-Simulator
                        </h2>
                      </div>

                      {/* View Switcher: Serverauswahl vs. Anmeldemenü */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
                          <button
                            type="button"
                            onClick={() => setSimViewMode('servers')}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              simViewMode === 'servers'
                                ? 'text-black shadow-md'
                                : 'text-slate-400 hover:text-white'
                            }`}
                            style={simViewMode === 'servers' ? { backgroundColor: tmpColor } : {}}
                          >
                            <Server size={11} /> Serverauswahl
                          </button>
                          <button
                            type="button"
                            onClick={() => setSimViewMode('login')}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              simViewMode === 'login'
                                ? 'text-black shadow-md'
                                : 'text-slate-400 hover:text-white'
                            }`}
                            style={simViewMode === 'login' ? { backgroundColor: tmpColor } : {}}
                          >
                            <LogIn size={11} /> Anmeldemenü
                          </button>
                        </div>

                        {/* Background Switcher */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-slate-400 font-bold uppercase">Hintergrund:</span>
                          <div className="flex items-center gap-1">
                            {tmpBgSlots.map((_, i) => (
                              <button
                                key={i}
                                onClick={() => setSimActiveSlot(i)}
                                style={simActiveSlot === i ? {
                                  backgroundColor: tmpColor,
                                  color: '#000',
                                  boxShadow: `0 0 10px ${tmpColor}60`
                                } : {}}
                                className={`w-5 h-5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                                  simActiveSlot === i
                                    ? ''
                                    : 'bg-white/5 text-slate-400 hover:text-white'
                                }`}
                              >
                                {i + 1}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Realistic TMP Cockpit Viewport (16:9) */}
                    <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl flex items-center justify-center select-none bg-black">
                      {/* Active Background Image */}
                      {tmpBgSlots[simActiveSlot]?.thumb || tmpBgSlots[0]?.thumb ? (
                        <img
                          src={tmpBgSlots[simActiveSlot]?.thumb || tmpBgSlots[0]?.thumb}
                          alt="TMP Background"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-black" />
                      )}

                      {/* Subtle Dark Vignette */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/60 pointer-events-none" />

                      {/* ────────────────────────────────────────────────────────── */}
                      {/* Global Game Shell Elements (present on all screens)        */}
                      {/* ────────────────────────────────────────────────────────── */}

                      {/* Top-Left: Companion Settings & Authors Buttons */}
                      <div className="absolute top-2.5 left-3 sm:top-3.5 sm:left-4.5 z-30 flex items-center gap-1.5">
                        <button
                          type="button"
                          className="w-6 h-6 sm:w-7 sm:h-7 rounded-[3px] bg-[#16171c]/90 hover:bg-[#22242c] border border-white/20 hover:border-white/40 flex items-center justify-center shadow-lg transition-colors cursor-pointer"
                          title="Einstellungen"
                        >
                          <img src="/images/tmp/settings.png" alt="Settings" className="w-3.5 h-3.5 sm:w-4 sm:h-4 object-contain opacity-85" />
                        </button>
                        <button
                          type="button"
                          className="w-6 h-6 sm:w-7 sm:h-7 rounded-[3px] bg-[#16171c]/90 hover:bg-[#22242c] border border-white/20 hover:border-white/40 flex items-center justify-center shadow-lg transition-colors cursor-pointer"
                          title="Autoren / Community"
                        >
                          <img src="/images/tmp/authors.png" alt="Authors" className="w-3.5 h-3.5 sm:w-4 sm:h-4 object-contain opacity-85" />
                        </button>
                      </div>

                      {/* Bottom-Left: ModDB Badge & 60 FPS */}
                      <div className="absolute bottom-2 left-3 sm:bottom-3 sm:left-4 z-30 flex flex-col items-start gap-1 pointer-events-none">
                        <div className="flex items-center gap-1.5 opacity-90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                          <div className="relative flex flex-col items-center">
                            <svg width="22" height="26" viewBox="0 0 32 38" fill="none">
                              <path d="M16 0L32 6V18C32 29 16 38 16 38C16 38 0 29 0 18V6L16 0Z" fill="#991b1b" stroke="#dc2626" strokeWidth="1.5" />
                              <path d="M16 7L18.5 13H25L19.5 17L21.5 23L16 19.5L10.5 23L12.5 17L7 13H13.5L16 7Z" fill="#ffffff" />
                            </svg>
                            <span className="text-[5.5px] font-black tracking-tighter text-white uppercase bg-red-900 px-0.5 mt-[-3px] rounded-[1px] leading-tight border border-red-950">
                              MOD DB
                            </span>
                          </div>
                          <div className="flex flex-col leading-tight">
                            <span className="text-[6px] font-extrabold text-red-500 uppercase tracking-wider">MOD OF THE YEAR</span>
                            <span className="text-[7.5px] font-black text-white tracking-wide">2014</span>
                            <span className="text-[5px] font-bold text-zinc-400 uppercase tracking-tight">PLAYER'S CHOICE</span>
                          </div>
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-mono font-bold text-[#22c55e] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                          60 FPS
                        </span>
                      </div>

                      {/* Bottom-Right: Client Version */}
                      <div className="absolute bottom-2 right-3 sm:bottom-2.5 sm:right-4 z-30 pointer-events-none">
                        <span className="text-[8px] sm:text-[9px] font-mono text-zinc-500/80 drop-shadow">
                          0.2.6.0.0 Alpha
                        </span>
                      </div>

                      {/* ────────────────────────────────────────────────────────── */}
                      {/* VIEW 1: Authentische Serverauswahl ("Select the server")  */}
                      {/* ────────────────────────────────────────────────────────── */}
                      {simViewMode === 'servers' && (
                        <div
                          className="relative z-10 w-[92%] max-w-[620px] h-[86%] max-h-[430px] rounded-[4px] overflow-hidden border flex flex-col shadow-2xl"
                          style={{
                            backgroundColor: 'rgba(20, 21, 25, 0.95)',
                            borderColor: 'rgba(255, 255, 255, 0.12)',
                            boxShadow: '0 25px 60px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.8)'
                          }}
                        >
                          {/* Titlebar */}
                          <div className="px-3.5 py-1.5 bg-[#17181c] border-b border-[#282a32] flex items-center justify-between">
                            <span className={`${useAppFonts ? 'font-unbounded font-bold text-[10.5px]' : 'font-sans font-light text-[12px]'} text-zinc-300 tracking-normal`}>
                              Select the server
                            </span>
                            <button
                              type="button"
                              onClick={() => setSimViewMode('login')}
                              className="text-zinc-500 hover:text-white text-xs font-mono px-1 transition-colors cursor-pointer"
                              title="Zum Anmeldemenü wechseln"
                            >
                              ✕
                            </button>
                          </div>

                          {/* Server List Container */}
                          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 pr-1.5 custom-scrollbar">
                            {[
                              { id: 0, name: 'Simulation 1', online: true, playersCurrent: '2123', playersMax: '3500', load: 0.61, icons: ['collision', 'speed', 'car'] },
                              { id: 1, name: 'Simulation 2', online: true, playersCurrent: '194', playersMax: '3000', load: 0.07, icons: ['collision', 'car'] },
                              { id: 2, name: '[US] Simulation', online: true, playersCurrent: '5', playersMax: '1500', load: 0.01, icons: ['collision', 'car'] },
                              { id: 3, name: '[Asia] Simulation', online: true, playersCurrent: '20', playersMax: '1500', load: 0.02, icons: ['collision', 'car'] },
                              { id: 4, name: 'Arcade', online: true, playersCurrent: '66', playersMax: '500', load: 0.13, icons: ['car'] },
                              { id: 5, name: 'ProMods', online: true, playersCurrent: '482', playersMax: '2500', load: 0.20, icons: ['collision', 'speed', 'car'] }
                            ].map((srv) => {
                              const isSelected = simSelectedServer === srv.id;
                              const bannerData = isSelected
                                ? (serverBanners[srv.id]?.selectedThumb || serverBanners[srv.id]?.normalThumb)
                                : serverBanners[srv.id]?.normalThumb;

                              return (
                                <div
                                  key={srv.id}
                                  onClick={() => setSimSelectedServer(srv.id)}
                                  className={`relative w-full h-[54px] sm:h-[60px] overflow-hidden cursor-pointer transition-all duration-150 select-none flex items-center justify-between px-3.5 group ${
                                    isSelected
                                      ? 'border-2 border-[#0080ff] shadow-[0_0_15px_rgba(0,128,255,0.45)] z-10'
                                      : 'border border-[#2d2f38] hover:border-zinc-500 bg-[#16171b]'
                                  }`}
                                  title={`Klicken, um ${srv.name} auszuwählen`}
                                >
                                  {/* Background Server Graphic (7680 × 864 px) */}
                                  {useServerBanners && bannerData ? (
                                    <img
                                      src={bannerData}
                                      alt={`${srv.name} Banner`}
                                      className={`absolute inset-0 w-full h-full object-cover transition-opacity pointer-events-none ${
                                        isSelected ? 'opacity-85' : 'opacity-40 group-hover:opacity-60'
                                      }`}
                                    />
                                  ) : (
                                    <div className="absolute inset-0 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 opacity-60" />
                                  )}

                                  {/* Content Overlay */}
                                  <div className="relative z-10 flex flex-col justify-center">
                                    <span className={`${useAppFonts ? 'font-unbounded font-bold text-[13px] sm:text-[14px]' : 'font-sans font-light text-[14px] sm:text-[16px]'} text-white tracking-wide leading-snug drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]`}>
                                      {srv.name}
                                    </span>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className={`${useAppFonts ? 'font-unbounded text-[9px]' : 'font-sans text-[10px] sm:text-[11px]'} font-normal text-[#22c55e] mr-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]`}>
                                        Online
                                      </span>
                                      {srv.icons.includes('collision') && (
                                        <img
                                          src="/images/tmp/collisions.png"
                                          alt="Collisions"
                                          className="h-2.5 sm:h-3 w-5 sm:w-6 object-contain drop-shadow"
                                          title="Kollisionen aktiv"
                                        />
                                      )}
                                      {srv.icons.includes('speed') && (
                                        <img
                                          src="/images/tmp/speedlimiter.png"
                                          alt="Speed Limiter"
                                          className="h-2.5 sm:h-3 w-2.5 sm:w-3 object-contain drop-shadow"
                                          title="Geschwindigkeitsbegrenzer aktiv"
                                        />
                                      )}
                                      {srv.icons.includes('car') && (
                                        <img
                                          src="/images/tmp/cars_for_players.png"
                                          alt="Cars"
                                          className="h-2.5 sm:h-3 w-2.5 sm:w-3 object-contain drop-shadow"
                                          title="Spielerautos erlaubt"
                                        />
                                      )}
                                    </div>
                                  </div>

                                  {/* Right: Player Count */}
                                  <div className="relative z-10 text-right font-sans font-extralight drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                                    <span className="text-[17px] sm:text-[20px] text-white">
                                      {srv.playersCurrent}
                                    </span>
                                    <span className="text-[13px] sm:text-[15px] text-zinc-400 font-extralight ml-1">
                                      / {srv.playersMax}
                                    </span>
                                  </div>

                                  {/* Bottom Capacity Progress Bar */}
                                  <div
                                    className="absolute bottom-0 left-0 h-[2.5px] bg-red-600/90 pointer-events-none z-20"
                                    style={{ width: `${srv.load * 100}%` }}
                                  />
                                </div>
                              );
                            })}
                          </div>

                          {/* Dialog Footer Actions */}
                          <div className="h-11 bg-[#17181c] border-t border-[#282a32] px-3 flex items-center justify-between">
                            <button
                              type="button"
                              className="w-7 h-7 rounded-[3px] bg-[#24252a] hover:bg-[#303239] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer"
                              title="Serverliste aktualisieren"
                            >
                              <RotateCw size={13} />
                            </button>
                            <button
                              type="button"
                              className={`px-6 py-1.5 rounded-[3px] bg-[#28292e] hover:bg-[#33353c] border border-white/10 text-zinc-300 hover:text-white ${useAppFonts ? 'font-unbounded font-bold text-[10px]' : 'font-sans font-light text-[11px]'} tracking-wide transition-colors cursor-pointer`}
                            >
                              Join the server!
                            </button>
                            <div className="w-7" />
                          </div>
                        </div>
                      )}

                      {/* ────────────────────────────────────────────────────────── */}
                      {/* VIEW 2: Authentisches Anmeldemenü ("Login to your account")*/}
                      {/* ────────────────────────────────────────────────────────── */}
                      {simViewMode === 'login' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto">
                          {/* Upper-Center: Offizielles OPC Logo-Banner */}
                          {useCompanyBanner && (
                            <div className="absolute top-3 sm:top-5 md:top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center w-[60%] max-w-[480px]">
                              <img
                                src={tmpInfo?.companyBannerThumb || '/images/truckers_white_final.png'}
                                alt="Open Pipe Club Firmenlogo"
                                className="w-full object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]"
                              />
                            </div>
                          )}

                          {/* Centered Login Box */}
                          <div
                            className="relative z-20 w-[90%] max-w-[350px] rounded-[3px] p-4 text-left shadow-2xl border backdrop-blur-sm mt-16 sm:mt-20"
                            style={{
                              backgroundColor: 'rgba(20, 21, 24, 0.82)',
                              borderColor: 'rgba(255, 255, 255, 0.12)',
                              boxShadow: '0 20px 50px rgba(0,0,0,0.85)'
                            }}
                          >
                            {/* Window Header */}
                            <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-3">
                              <span className={`${useAppFonts ? 'font-unbounded font-bold text-[12px]' : 'font-sans font-light text-[13px]'} text-zinc-200 tracking-wide`}>
                                Login to your account
                              </span>
                              <button
                                type="button"
                                onClick={() => setSimViewMode('servers')}
                                className="text-zinc-500 hover:text-white text-xs font-mono px-1 transition-colors cursor-pointer"
                                title="Zur Serverauswahl wechseln"
                              >
                                ✕
                              </button>
                            </div>

                            {/* Masked Inputs */}
                            <div className="space-y-2">
                              <div className="h-7 px-2.5 rounded-[2px] bg-[#0c0d10]/90 border border-white/10 text-zinc-400 text-xs font-mono tracking-widest flex items-center select-none">
                                •••••••••••••••••••••••••
                              </div>
                              <div className="h-7 px-2.5 rounded-[2px] bg-[#0c0d10]/90 border border-white/10 text-zinc-400 text-xs font-mono tracking-widest flex items-center select-none">
                                ••••••••
                              </div>
                            </div>

                            {/* Checkbox Row & Login Button */}
                            <div className="flex items-center justify-between mt-3">
                              <div className="space-y-1">
                                <label className={`flex items-center gap-1.5 cursor-pointer select-none text-[10px] text-zinc-400 ${useAppFonts ? 'font-unbounded text-[8.5px]' : 'font-sans'}`}>
                                  <input type="checkbox" defaultChecked className="rounded-[2px] accent-amber-500 w-3 h-3" />
                                  Hide Email
                                </label>
                                <label className={`flex items-center gap-1.5 cursor-pointer select-none text-[10px] text-zinc-400 ${useAppFonts ? 'font-unbounded text-[8.5px]' : 'font-sans'}`}>
                                  <input type="checkbox" defaultChecked className="rounded-[2px] accent-amber-500 w-3 h-3" />
                                  Remember Me
                                </label>
                              </div>

                              <button
                                type="button"
                                onClick={() => setSimViewMode('servers')}
                                className={`px-4 py-1 rounded-[2px] bg-[#2a2b30] hover:bg-[#34363e] border border-white/15 text-zinc-300 hover:text-white ${useAppFonts ? 'font-unbounded font-bold text-[10px]' : 'font-sans text-[11px] font-normal'} transition-colors cursor-pointer shadow`}
                              >
                                Login
                              </button>
                            </div>

                            {/* Password Reset Links */}
                            <div className="mt-3.5 pt-2 text-[9px] text-zinc-400 font-sans border-t border-white/10 space-y-2">
                              <div>
                                <span className="text-[10px] text-zinc-300 block mb-0.5 font-light">Forgot your password?</span>
                                <span>No worries, <span className="text-amber-500/90 underline hover:text-amber-400 cursor-pointer">click here</span> reset your password.</span>
                              </div>
                              <div className="pt-1.5 border-t border-white/5">
                                <span className="text-[10px] text-zinc-300 block mb-0.5 font-light">New?</span>
                                <span>Don't have an account? <span className="text-amber-500/90 underline hover:text-amber-400 cursor-pointer">Click here</span> to create an account!</span>
                              </div>
                            </div>
                          </div>

                          {/* Bottom Alpha Warning Banner */}
                          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-[2px] bg-black/85 border border-white/5 text-center pointer-events-none max-w-[95%]">
                            <span className="font-mono text-[7.5px] sm:text-[8px] font-bold text-red-600 tracking-wider block">
                              ALPHA VERSION - PLEASE KEEP IN MIND THAT THIS VERSION MAY BE UNSTABLE AND MAY CONTAIN MAJOR BUGS!
                            </span>
                            <span className="font-mono text-[6.5px] sm:text-[7px] text-zinc-500 tracking-wider block mt-0.5">
                              THIS VERSION DOES NOT REPRESENT FINAL PRODUCT.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Modding Guide & Information */}
                  <div
                    className="frosted-card bg-[#000000] border-2 shadow-xl !p-4 transition-all duration-300 hover-glow"
                    style={{
                      borderColor: `${tmpColor}35`,
                      boxShadow: `0 10px 30px rgba(0,0,0,0.6)`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = tmpColor;
                      e.currentTarget.style.boxShadow = `0 0 25px ${tmpColor}45`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = `${tmpColor}35`;
                      e.currentTarget.style.boxShadow = `0 10px 30px rgba(0,0,0,0.6)`;
                    }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-1 h-4 rounded-full" style={{ backgroundColor: tmpColor }} />
                      <h2 className="font-unbounded text-sm font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: tmpColor }}>
                        <HelpCircle size={15} /> Wissenswertes zur TruckersMP UI
                      </h2>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-400 list-disc list-inside leading-relaxed">
                      <li>
                        <strong className="text-slate-200">Keine Spieldateien modifiziert:</strong> TruckersMP unterstützt native UI-Modifikationen über die Ordner <code style={{ color: tmpColor }}>ets2_mod/ui</code>, <code style={{ color: tmpColor }}>shared_mod/ui</code> und <code style={{ color: tmpColor }}>shared_mod/fonts</code>.
                      </li>
                      <li>
                        <strong className="text-slate-200">Serverlisten-Banner (7680 × 864 px):</strong> Die Grafiken der Serverauswahl (<code style={{ color: tmpColor }}>server_item_*.png</code>) werden im nativen Ultra-Wide Format (7680 × 864 px) exportiert. TruckersMP nutzt ein schlankes Sans-Interface (Open Sans / Outfit).
                      </li>
                      <li>
                        <strong className="text-slate-200">Beliebige Auflösung:</strong> Die Hintergründe werden automatisch in brillanter Qualität skaliert (1080p, 1440p, 4K bis 8K).
                      </li>
                      <li>
                        <strong className="text-slate-200">Dynamische Slot-Anzahl:</strong> TruckersMP liest sequentiell alle vorhandenen <code style={{ color: tmpColor }}>background&#123;n&#125;.png</code> Dateien aus. Du kannst 7, 9, 15 oder mehr Menübilder rotieren lassen.
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Popover Color Picker Modal for TMP UI */}
                <AnimatePresence>
                  {showTmpColorModal && (
                    <>
                      <div
                        className="fixed inset-0 z-[9999] bg-black/50 cursor-default"
                        onClick={() => setShowTmpColorModal(false)}
                      />
                      <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none p-4">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 15 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 15 }}
                          transition={{ duration: 0.2 }}
                          className="pointer-events-auto w-[300px] bg-[#0c0c0e]/95 border-2 backdrop-blur-md rounded-3xl p-4 shadow-2xl overflow-hidden flex flex-col gap-3"
                          style={{
                            borderColor: `${tmpColor}50`,
                            boxShadow: `0 20px 60px rgba(0,0,0,0.9), 0 0 35px ${tmpColor}35`
                          }}
                        >
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <div className="flex items-center gap-2 text-white">
                              <Palette size={14} style={{ color: tmpColor }} />
                              <span className="font-unbounded text-[10px] font-bold uppercase tracking-widest">
                                TMP UI Farbwähler
                              </span>
                            </div>
                            <button
                              onClick={() => setShowTmpColorModal(false)}
                              className="p-1 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          {/* SV Box */}
                          <div
                            ref={tmpSvBoxRef}
                            onMouseDown={handleTmpSvMouseDown}
                            className="h-28 w-full rounded-xl relative overflow-hidden cursor-crosshair border border-white/10"
                            style={{
                              backgroundColor: `hsl(${tmpHsv.h}, 100%, 50%)`,
                              backgroundImage: `
                                linear-gradient(to right, #fff, transparent),
                                linear-gradient(to top, #000, transparent)
                              `,
                              backgroundBlendMode: 'multiply'
                            }}
                          >
                            <div
                              className="w-3.5 h-3.5 rounded-full border-2 border-white absolute -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none"
                              style={{
                                left: `${tmpHsv.s}%`,
                                top: `${100 - tmpHsv.v}%`,
                                backgroundColor: tmpColor,
                                boxShadow: `0 0 10px ${tmpColor}, 0 0 4px rgba(0,0,0,0.8)`
                              }}
                            />
                          </div>

                          {/* Hue Slider */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[8px] text-slate-500 uppercase font-black tracking-widest px-0.5">
                              <span>Farbton</span>
                              <span className="font-mono">{tmpHsv.h}°</span>
                            </div>
                            <div
                              ref={tmpHueSliderRef}
                              onMouseDown={handleTmpHueMouseDown}
                              className="h-2.5 w-full rounded-full relative cursor-ew-resize border border-white/10"
                              style={{
                                backgroundImage: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)'
                              }}
                            >
                              <div
                                className="w-3.5 h-3.5 rounded-full border-2 border-white absolute -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none"
                                style={{
                                  left: `${(tmpHsv.h / 360) * 100}%`,
                                  backgroundColor: `hsl(${tmpHsv.h}, 100%, 50%)`,
                                  boxShadow: '0 0 4px rgba(0,0,0,0.6)'
                                }}
                              />
                            </div>
                          </div>

                          {/* Hex Input & Apply */}
                          <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                            <input
                              type="text"
                              value={tmpColor}
                              onChange={(e) => {
                                const v = e.target.value;
                                setTmpColor(v);
                                if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
                                  setTmpHsv(hexToHsv(v));
                                  localStorage.setItem('openpipeclub_tmp_color', v);
                                }
                              }}
                              className="flex-1 px-2.5 py-1.5 rounded-lg bg-black/60 border font-mono text-xs text-white uppercase text-center outline-none"
                              style={{ borderColor: `${tmpColor}50` }}
                            />
                            <button
                              onClick={() => setShowTmpColorModal(false)}
                              style={{
                                backgroundColor: tmpColor,
                                color: '#000',
                                boxShadow: `0 0 15px ${tmpColor}60`
                              }}
                              className="px-4 py-1.5 rounded-lg font-black text-xs uppercase tracking-wider transition-transform active:scale-95 cursor-pointer hover:brightness-110"
                            >
                              Fertig
                            </button>
                          </div>
                        </motion.div>
                      </div>
                    </>
                  )}
                </AnimatePresence>

                {/* Full-Screen Wallpaper Modal */}
                <AnimatePresence>
                  {tmpPreviewModalImage && (
                    <div
                      className="fixed inset-0 z-[10001] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 cursor-pointer"
                      onClick={() => setTmpPreviewModalImage(null)}
                    >
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="relative max-w-5xl max-h-[85vh] rounded-2xl overflow-hidden border-2 shadow-2xl"
                        style={{ borderColor: `${tmpColor}50` }}
                      >
                        <img
                          src={tmpPreviewModalImage}
                          alt="Wallpaper Preview"
                          className="w-full h-full object-contain max-h-[80vh]"
                        />
                        <button
                          onClick={() => setTmpPreviewModalImage(null)}
                          className="absolute top-3 right-3 p-2 rounded-full bg-black/70 hover:bg-black text-white transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                {/* Banner Vertical Crop & Position Modal */}
                <AnimatePresence>
                  {bannerCropModal && (
                    <div className="fixed inset-0 z-[10002] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="w-full max-w-2xl bg-[#0c0c0e]/95 border-2 rounded-3xl p-5 shadow-2xl overflow-hidden flex flex-col gap-4 text-white"
                        style={{
                          borderColor: `${tmpColor}60`,
                          boxShadow: `0 25px 70px rgba(0,0,0,0.9), 0 0 35px ${tmpColor}35`
                        }}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-2 h-5 rounded-full" style={{ backgroundColor: tmpColor }} />
                            <div>
                              <h3 className="font-unbounded text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                <Crop size={16} style={{ color: tmpColor }} /> Banner-Ausschnitt anpassen
                              </h3>
                              <span className="text-[10px] text-slate-400">
                                Server {bannerCropModal.serverIndex + 1} • {bannerCropModal.type === 'normal' ? 'Nicht ausgewählt (Normal)' : 'Ausgewählt (Selected)'}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setBannerCropModal(null)}
                            className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        {/* Instructional Hint */}
                        <p className="text-xs text-slate-300">
                          Ziehe das Bild im Vorschaubereich nach oben oder unten, oder nutze den Schieberegler, um den perfekten Ausschnitt (7680 × 864 px) festzulegen.
                        </p>

                        {/* Interactive Viewport (7680 × 864 px, ca. 8.888:1) */}
                        <div
                          ref={cropViewportRef}
                          onMouseDown={(e) => {
                            setIsDraggingCrop(true);
                            dragStartYRef.current = e.clientY;
                            dragStartPercentRef.current = bannerCropModal.offsetYPercent;
                          }}
                          className={`w-full aspect-[7680/864] rounded-xl overflow-hidden border-2 relative bg-zinc-950 select-none cursor-grab active:cursor-grabbing shadow-inner group ${
                            bannerCropModal.type === 'selected' ? 'border-[#0080ff] shadow-[0_0_20px_rgba(0,128,255,0.4)]' : ''
                          }`}
                          style={bannerCropModal.type !== 'selected' ? {
                            borderColor: tmpColor,
                            boxShadow: `0 0 25px ${tmpColor}30`
                          } : {}}
                        >
                          <img
                            src={bannerCropModal.rawImageSrc}
                            alt="Banner Crop Target"
                            draggable={false}
                            className={`w-full h-full object-cover pointer-events-none ${
                              bannerCropModal.type === 'selected' ? 'brightness-75' : ''
                            }`}
                            style={{
                              objectPosition: `50% ${bannerCropModal.offsetYPercent}%`,
                              transform: `scale(${bannerCropModal.zoom})`,
                              transformOrigin: `50% ${bannerCropModal.offsetYPercent}%`
                            }}
                          />

                          {/* Overlay badge with drag prompt */}
                          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm border border-white/15 text-[8px] font-mono text-slate-200 pointer-events-none shadow-md">
                            <ArrowUpDown size={10} style={{ color: tmpColor }} />
                            <span>Klicken & ziehen</span>
                          </div>

                          {/* Authentic TruckersMP Server Mock Overlay */}
                          {bannerCropModal.showMockOverlay && (
                            <div className="absolute inset-0 px-3.5 py-1.5 flex items-center justify-between pointer-events-none select-none z-10">
                              <div>
                                <span className="font-sans font-light text-[13px] sm:text-[15px] text-white tracking-wide block leading-snug drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                                  Simulation {bannerCropModal.serverIndex + 1}
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="font-sans text-[10px] font-normal text-[#22c55e] mr-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                                    Online
                                  </span>
                                  <img
                                    src="/images/tmp/collisions.png"
                                    alt="Collisions"
                                    className="h-2.5 w-5 object-contain drop-shadow"
                                  />
                                  <img
                                    src="/images/tmp/speedlimiter.png"
                                    alt="Speed"
                                    className="h-2.5 w-2.5 object-contain drop-shadow"
                                  />
                                  <img
                                    src="/images/tmp/cars_for_players.png"
                                    alt="Cars"
                                    className="h-2.5 w-2.5 object-contain drop-shadow"
                                  />
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="font-sans font-extralight drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                                  <span className="text-[16px] sm:text-[18px] text-white">2123</span>
                                  <span className="text-[12px] sm:text-[14px] text-zinc-400 font-extralight ml-1">/ 3500</span>
                                </div>
                                <span className="text-[8px] font-mono text-slate-400 block drop-shadow">
                                  7680 × 864 px
                                </span>
                              </div>

                              {/* Bottom Capacity Bar */}
                              <div className="absolute bottom-0 left-0 h-[2.5px] bg-red-600/90 w-[60%] pointer-events-none" />
                            </div>
                          )}
                        </div>

                        {/* Slider & Quick Buttons */}
                        <div className="space-y-2 bg-black/40 p-3 rounded-2xl border border-white/5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white flex items-center gap-1.5">
                              <ArrowUpDown size={13} style={{ color: tmpColor }} /> Vertikale Position:
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-300">
                              {Math.round(bannerCropModal.offsetYPercent)}% {bannerCropModal.offsetYPercent < 30 ? '(Oben)' : bannerCropModal.offsetYPercent > 70 ? '(Unten)' : '(Mitte)'}
                            </span>
                          </div>

                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={bannerCropModal.offsetYPercent}
                            onChange={(e) => setBannerCropModal(prev => prev ? { ...prev, offsetYPercent: Number(e.target.value) } : null)}
                            className="w-full cursor-pointer h-2 bg-white/10 rounded-lg"
                            style={{ accentColor: tmpColor }}
                          />

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setBannerCropModal(prev => prev ? { ...prev, offsetYPercent: 0 } : null)}
                                className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-colors cursor-pointer ${
                                  bannerCropModal.offsetYPercent === 0 ? 'border-white text-black' : 'border-white/10 bg-white/5 text-slate-300 hover:text-white'
                                }`}
                                style={bannerCropModal.offsetYPercent === 0 ? { backgroundColor: tmpColor } : {}}
                              >
                                Oben (0%)
                              </button>
                              <button
                                type="button"
                                onClick={() => setBannerCropModal(prev => prev ? { ...prev, offsetYPercent: 50 } : null)}
                                className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-colors cursor-pointer ${
                                  bannerCropModal.offsetYPercent === 50 ? 'border-white text-black' : 'border-white/10 bg-white/5 text-slate-300 hover:text-white'
                                }`}
                                style={bannerCropModal.offsetYPercent === 50 ? { backgroundColor: tmpColor } : {}}
                              >
                                Mitte (50%)
                              </button>
                              <button
                                type="button"
                                onClick={() => setBannerCropModal(prev => prev ? { ...prev, offsetYPercent: 100 } : null)}
                                className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-colors cursor-pointer ${
                                  bannerCropModal.offsetYPercent === 100 ? 'border-white text-black' : 'border-white/10 bg-white/5 text-slate-300 hover:text-white'
                                }`}
                                style={bannerCropModal.offsetYPercent === 100 ? { backgroundColor: tmpColor } : {}}
                              >
                                Unten (100%)
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Zoom Controls */}
                              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-white/5 border border-white/10">
                                <button
                                  type="button"
                                  onClick={() => setBannerCropModal(prev => prev ? { ...prev, zoom: Math.max(1.0, Math.round((prev.zoom - 0.1) * 10) / 10) } : null)}
                                  className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white text-[10px]"
                                  title="Zoom verkleinern"
                                >
                                  <ZoomOut size={12} />
                                </button>
                                <span className="font-mono text-[9px] text-slate-300 min-w-[28px] text-center font-bold">
                                  {bannerCropModal.zoom.toFixed(1)}x
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setBannerCropModal(prev => prev ? { ...prev, zoom: Math.min(2.5, Math.round((prev.zoom + 0.1) * 10) / 10) } : null)}
                                  className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white text-[10px]"
                                  title="Zoom vergrößern"
                                >
                                  <ZoomIn size={12} />
                                </button>
                              </div>

                              {/* Toggle Mock Overlay */}
                              <button
                                type="button"
                                onClick={() => setBannerCropModal(prev => prev ? { ...prev, showMockOverlay: !prev.showMockOverlay } : null)}
                                className={`px-2 py-1 rounded-lg text-[9px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                                  bannerCropModal.showMockOverlay ? 'border-white/30 text-white bg-white/10' : 'border-white/5 text-slate-400 bg-transparent'
                                }`}
                              >
                                <Eye size={10} /> Text-Overlay
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Footer Action Buttons */}
                        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
                          <button
                            type="button"
                            onClick={() => setBannerCropModal(null)}
                            className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                          >
                            Abbrechen
                          </button>
                          <button
                            type="button"
                            onClick={handleApplyBannerCrop}
                            style={{
                              backgroundColor: tmpColor,
                              color: '#000',
                              boxShadow: `0 0 20px ${tmpColor}50`
                            }}
                            className="px-5 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer hover:brightness-110 flex items-center gap-1.5"
                          >
                            <Sparkles size={14} /> Ausschnitt übernehmen (7680 × 864)
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    };

export default OverlaySettings;


