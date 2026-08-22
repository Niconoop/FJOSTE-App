import { useState, useEffect, useRef } from 'react';
import { Monitor, Lock, Unlock, Sliders, SlidersHorizontal, RefreshCw, Check, Eye, EyeOff, LayoutTemplate, Palette, X, Pipette, ArrowUpDown, Keyboard, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
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

const DEFAULT_WIDGET_SIZES: Record<string, WidgetSize> = {
  logo: { w: 80, h: 80 },
  mainHud: { w: 384, h: 120 },
  event: { w: 288, h: 64 },
  drivers: { w: 192, h: 0 }, // 0 = auto‑height (flex column)
  spotify: { w: 280, h: 140 },
  gameMap: { w: 300, h: 200 }
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
  widgetOrder: ['logo', 'mainHud', 'event', 'drivers', 'spotify', 'gameMap'],
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
            : 'bg-[#18181b] border-white/10 text-white hover:border-amber-500/40'
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
      gameMap: { x: 40, y: 740 }
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
        return { ...defaults, ...JSON.parse(saved) };
      } catch (e) { }
    }
    return defaults;
  });

  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [rpcActive, setRpcActive] = useState(false);

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

  const [activeTab, setActiveTab] = useState<'overlay' | 'carplay'>('overlay');

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

  // Sync RPC status
  useEffect(() => {
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('rpc-get-status').then(setRpcActive).catch(() => { });
      const rpcListener = (_: any, status: boolean) => setRpcActive(status);
      ipcRenderer.on('rpc-active-changed', rpcListener);
      return () => {
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
      ipcRenderer.invoke('overlay-status').then(setIsOverlayOpen).catch(() => { });
      ipcRenderer.invoke('overlay-lock-status').then(setIsLocked).catch(() => { });

      const statusListener = (_: any, status: boolean) => setIsOverlayOpen(status);
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
    setIsOverlayOpen(prev => !prev);
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('overlay-toggle');
    } catch (e) {
      toast.error('Electron-Schnittstelle nicht verfügbar.');
    }
  };

  const toggleRpc = () => {
    const newState = !rpcActive;
    setRpcActive(newState);
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('rpc-toggle', newState).catch(() => { });
    } catch (e) {
      toast.error('Electron-Schnittstelle nicht verfügbar.');
    }
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
      gameMap: { x: 40, y: 740 }
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
    gameMap: 'Spielkarte'
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
        <span className="overline text-amber-400 mb-2 inline-block">Anpassung</span>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tighter text-white mt-2">
          Overlay-Einstellungen
        </h1>
        <p className="text-zinc-400 text-sm mt-3">Passe dein In-Game Overlay und die Discord RPC an</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Left Column: Settings and Controls */}
        <div className="xl:col-span-2 space-y-4">
          {/* System Services Toggles */}
          <div className="frosted-card bg-[#000000] border-2 border-[#f59e0b]/20 shadow-xl !p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-1 h-4 bg-amber-400 rounded-full" />
              <h2 className="font-unbounded text-sm font-bold text-amber-400 uppercase tracking-widest">
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

              {/* Discord RPC Toggle Switch */}
              <label className="flex items-center justify-between py-1 border-t border-white/5 pt-4 cursor-pointer group">
                <div>
                  <span className="text-xs text-slate-300 font-medium block">Discord Status (RPC)</span>
                  <span className="text-[9px] text-slate-500">Teilt deinen Fahr- & App-Status auf Discord</span>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rpcActive}
                    onChange={toggleRpc}
                    className="sr-only peer"
                  />
                  <div className="switch-toggle" />
                </div>
              </label>
            </div>
          </div>

          {/* Style Presets */}
          <div className="frosted-card bg-[#000000] border-2 border-[#f59e0b]/20 shadow-xl !p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-1 h-4 bg-amber-400 rounded-full" />
              <h2 className="font-unbounded text-sm font-bold text-amber-400 uppercase tracking-widest">
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
          <div className="frosted-card bg-[#000000] border-2 border-[#f59e0b]/20 shadow-xl !p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-1 h-4 bg-amber-400 rounded-full" />
              <h2 className="font-unbounded text-sm font-bold text-amber-400 uppercase tracking-widest">
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
                  className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-amber-400"
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
                  className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-amber-400"
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
                  { key: 'showGameMap', label: 'Spielkarte (ETS2)' }
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
          </div>

        </div>

        {/* Right Column: Status & Interactive Simulator */}
        <div className="xl:col-span-3 space-y-4">
          {/* Status and Action Buttons */}
          <div className="frosted-card bg-[#000000] border-2 border-[#f59e0b]/20 shadow-xl !p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-1 h-4 bg-amber-400 rounded-full" />
              <h2 className="font-unbounded text-sm font-bold text-amber-400 uppercase tracking-widest">
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
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
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
            <div className="frosted-card bg-[#000000] border-2 border-[#f59e0b]/20 shadow-xl !p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-1 h-4 bg-amber-400 rounded-full" />
              <h2 className="font-unbounded text-sm font-bold text-amber-400 uppercase tracking-widest">
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
            <div className="frosted-card bg-[#000000] border-2 border-[#f59e0b]/20 shadow-xl !p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-1 h-4 bg-amber-400 rounded-full" />
                <h2 className="font-unbounded text-sm font-bold text-amber-400 uppercase tracking-widest">
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
                    className="bg-zinc-900 border border-white/10 rounded-lg text-xs font-bold text-white px-2.5 py-1 outline-none cursor-pointer hover:border-amber-500/40 transition-all"
                  >
                    <option value="sim1">EU Simulation 1</option>
                    <option value="sim2">EU Simulation 2</option>
                    <option value="arc2">US Simulation</option>
                  </select>
                </div>
              </div>
            </div>

            {/* CarPlay Settings */}
            <div className="frosted-card bg-[#000000] border-2 border-[#f59e0b]/20 shadow-xl !p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-1 h-4 bg-amber-400 rounded-full" />
                <h2 className="font-unbounded text-sm font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
                  <LayoutGrid size={16} /> CarPlay-Einstellungen
                </h2>
              </div>
              <p className="text-[10px] text-slate-500 mb-4 uppercase tracking-wider leading-relaxed">
                Konfiguriere das CarPlay / Android Auto LKW-Zusatzdisplay:
              </p>

              <div className="space-y-4">
                {/* CarPlay Window Activation Toggle */}
                <label className="flex items-center justify-between cursor-pointer group py-0.5">
                  <div>
                    <span className="text-xs text-slate-300 group-hover:text-white transition-colors block">CarPlay-Fenster aktivieren</span>
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
                                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
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
                                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                                : 'bg-[#18181b] border-white/10 text-slate-400 hover:bg-[#27272a] hover:text-white'
                            }`}
                          >
                            {scale.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* CarPlay Notifications settings */}
                    <div className="space-y-2.5 pt-3 border-t border-white/5">
                      <span className="text-xs text-slate-400 font-medium block">
                        CarPlay Benachrichtigungen (Cockpit-Alerts)
                      </span>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
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
                          <label key={item.key} className="flex items-center justify-between cursor-pointer group py-0.5">
                            <div className="min-w-0 pr-2">
                              <span className="text-xs text-slate-350 group-hover:text-white transition-colors block truncate">{item.label}</span>
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
                    <div className="space-y-2.5 pt-3 border-t border-white/5">
                      <span className="text-xs text-slate-400 font-medium block flex items-center gap-1.5">
                        <Keyboard size={14} className="text-amber-400" /> CarPlay Tastatur-Steuerung (Hotkeys)
                      </span>
                      <p className="text-[9px] text-slate-500 leading-tight">
                        Klicke auf das Feld und drücke die gewünschte Tastenkombination (z.B. Strg+Alt+Taste), um sie aufzuzeichnen.
                      </p>

                      <div className="space-y-2 mt-2">
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
                )}
              </div>
            </div>

            {/* Interactive Screen Simulator */}
            <div className="frosted-card bg-[#000000] border-2 border-[#f59e0b]/20 shadow-xl !p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-4 bg-amber-400 rounded-full" />
                  <h2 className="font-unbounded text-sm font-bold text-amber-400 uppercase tracking-widest">
                    Bildschirm-Simulator
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('overlay')}
                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      activeTab === 'overlay'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'text-slate-400 hover:text-white border border-transparent'
                    }`}
                  >
                    Overlay-Layout
                  </button>
                  {settings.showCarPlay && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('carplay')}
                      className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        activeTab === 'carplay'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'text-slate-400 hover:text-white border border-transparent'
                      }`}
                    >
                      CarPlay-Layout
                    </button>
                  )}
                </div>
              </div>

              {activeTab === 'carplay' && settings.showCarPlay ? (
                <>
                  {/* Simulated CarPlay Splitscreen Box */}
                  <div
                    className="relative w-full aspect-[1024/380] rounded-2xl border-2 border-white/5 overflow-hidden shadow-[inset_0_4px_30px_rgba(0,0,0,0.9)] flex"
                    style={{
                      background: settings.carPlayTheme === 'titan'
                        ? 'linear-gradient(135deg, #1f232d 0%, #111317 100%)'
                        : undefined,
                      backgroundImage: settings.carPlayTheme !== 'titan'
                        ? 'radial-gradient(rgba(245, 158, 11, 0.05) 1px, transparent 1px)'
                        : undefined,
                      backgroundSize: '15px 15px',
                      backgroundColor: settings.carPlayTheme === 'light'
                        ? 'rgba(255, 255, 255, 0.5)'
                        : settings.carPlayTheme === 'dark'
                          ? '#000000'
                          : '#090b11',
                      color: settings.carPlayTheme === 'light' ? '#1e293b' : '#eceff1',
                    }}
                  >
                    {/* Left Sidebar Mock */}
                    <div className="w-12 h-full flex flex-col justify-between py-2 items-center bg-black/40 border-r border-white/5 shrink-0 text-[8px] font-black">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-white bg-black/60 px-1 py-0.5 rounded scale-75">12:00</span>
                        <div className="w-5 h-5 rounded-full border border-red-500 bg-white flex items-center justify-center text-[7px] text-black">80</div>
                      </div>
                      
                      <div className="flex flex-col gap-1.5 scale-75">
                        <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">🏠</div>
                        <div className="w-6 h-6 rounded-lg bg-white/5 text-slate-400 flex items-center justify-center">🎵</div>
                        <div className="w-6 h-6 rounded-lg bg-white/5 text-slate-400 flex items-center justify-center">💼</div>
                        <div className="w-6 h-6 rounded-lg bg-white/5 text-slate-400 flex items-center justify-center">🚚</div>
                      </div>

                      <div className="text-emerald-400 scale-75">📶</div>
                    </div>

                    {/* Main Preview layout */}
                    <div className="flex-1 p-3 flex flex-col justify-between overflow-hidden">
                      <div className="flex-1 grid grid-cols-12 gap-3.5">
                        {/* Left: GPS Map Widget preview */}
                        <div className="col-span-7 border border-white/10 rounded-xl bg-black/35 flex flex-col items-center justify-center text-center p-4">
                          <span className="text-[14px] text-amber-400 animate-pulse">🗺️</span>
                          <span className="text-[9px] font-black tracking-wider uppercase text-slate-300 mt-1">Live Map Widget</span>
                          <span className="text-[7.5px] text-slate-550 mt-0.5">Automatisches GPS Tracking</span>
                        </div>

                        {/* Right side widgets */}
                        <div className="col-span-5 flex flex-col gap-2.5 justify-between">
                          {/* Media Widget preview */}
                          <div className="flex-1 border border-white/10 rounded-xl bg-black/35 p-2 flex items-center gap-2">
                            <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-xs">🎵</div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[8px] font-black truncate text-white leading-none">Mock-Song</p>
                              <p className="text-[7px] font-bold text-slate-400 truncate mt-0.5">Künstler</p>
                              <div className="h-0.5 w-full bg-white/10 rounded-full mt-1.5 overflow-hidden">
                                <div className="h-full w-2/3 bg-amber-400" />
                              </div>
                            </div>
                          </div>

                          {/* Telemetry Widget preview */}
                          <div className="flex-1 border border-white/10 rounded-xl bg-black/35 p-2 flex items-center justify-between">
                            <div>
                              <span className="text-[7px] text-slate-400 block leading-none">TEMPO</span>
                              <span className="text-sm font-black text-white leading-none tracking-tight">84 KM/H</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[7px] text-slate-400 block leading-none">GANG</span>
                              <span className="text-[8.5px] font-black text-amber-400 uppercase">D12</span>
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
                    <span>Vorschau des CarPlay / Android Auto Splitscreens im virtuellen Modus.</span>
                    <span className="font-bold text-slate-400 bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                      AutoDash aktiv
                    </span>
                  </div>
                </>
              ) : (
                <>
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
                        borderColor: '#f59e0b',
                        opacity: 0.8
                      }}
                    />
                  )}
                  {draggingWidget && activeGuides.y !== null && (
                    <div
                      className="absolute inset-x-0 border-t border-dashed pointer-events-none z-30"
                      style={{
                        top: `${(activeGuides.y / SH) * 100}%`,
                        borderColor: '#f59e0b',
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverlaySettings;


