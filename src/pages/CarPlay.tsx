import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { API_URL, getAvatarUrl } from '../config';
import { Home, Music, Briefcase, Truck, Settings, Play, Pause, SkipForward, SkipBack, Compass, AlertTriangle, Battery, Thermometer, Gauge, Fuel, MapPin, Navigation, Volume2, VolumeX, Info, Wifi, WifiOff, MessageSquare, Newspaper, Calendar, Clock, Zap, Wrench, Search, X, Check, CheckCircle, Monitor, Disc, Radio, Upload, ListMusic, Plus, Minus, RefreshCw, ArrowLeft, Keyboard, Delete, CornerDownLeft, Map as MapIcon, ChevronLeft, ChevronRight, Activity, ShieldCheck, LayoutGrid, Send, Users, CalendarDays, ExternalLink, MessageCircle, Sliders } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { AnimatedBackground } from '../components/AnimatedBackground';
import SpotifyWidget from '../components/SpotifyWidget';
import GameMapWidget, { type GameMapWidgetHandle } from '../components/GameMapWidget';
import { TruckSideView } from '../components/TruckSideView';
import { searchDestinations, findCompany, findCity, type DestinationSearchResult } from '../data/ets2Cities';
import { type SpeedcamAlertInfo } from '../data/ets2Speedcams';
import { TrafficLightWidget } from '../components/TrafficLightWidget';
import type { ApproachingTrafficLight } from '../utils/trafficLightDetector';
import {
  getActiveEventRoute,
  setActiveEventRoute,
  clearActiveEventRoute,
  ACTIVE_ROUTE_CHANGED_EVENT,
  type ActiveEventRoute,
} from '../utils/activeNavigation';

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
  lightsParking?: boolean;
  wipers?: boolean;
  fuelWarning?: boolean;
  airPressureWarning?: boolean;
  oilPressureWarning?: boolean;
  waterTemperatureWarning?: boolean;
  batteryVoltageWarning?: boolean;
  electricEnabled?: boolean;
  engineEnabled?: boolean;
  trailerAttached?: boolean;
  routeWaypoints?: [number, number, number][] | [number, number][];
  nearbyVehicles?: any[];
  semaphores?: any[];
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
  carPlayAspectRatio?: '16:9' | '4:3' | '16:10' | '21:9' | 'free';
  carPlayShowNavInstructions?: boolean;
  carPlayHqOverlay?: 'truckline' | 'truckersmp' | 'all' | 'none';
  carPlayIgnitionSleep?: boolean;
  carPlayHotkeys: {
    toggle: string;
    next: string;
    prev: string;
    home: string;
    playPause: string;
    volumeUp?: string;
    volumeDown?: string;
    volumeMute?: string;
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

const DEFAULT_SETTINGS: OverlaySettings = {
  showCarPlay: true,
  carPlayTheme: 'dark',
  carPlayMapTheme: 'auto',
  carPlayTextScale: 'medium',
  carPlayAspectRatio: '16:9',
  carPlayShowNavInstructions: true,
  carPlayHqOverlay: 'truckline',
  carPlayIgnitionSleep: false,
  carPlayHotkeys: {
    toggle: 'F9',
    next: 'Ctrl+Alt+Right',
    prev: 'Ctrl+Alt+Left',
    home: 'Ctrl+Alt+H',
    playPause: 'Ctrl+Alt+Space',
    volumeUp: 'Ctrl+Alt+PageUp',
    volumeDown: 'Ctrl+Alt+PageDown',
    volumeMute: 'Ctrl+Alt+M'
  }
};

const TABS = ['home', 'map', 'music', 'job', 'truck', 'control', 'settings', 'chat', 'events', 'apps'] as const;
type Tab = typeof TABS[number];
export type RecentAppId = Tab | 'music-windows' | 'music-radio' | 'music-local';

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

interface ChatQuickTemplate {
  id: string;
  text: string;
  category: string;
  icon: string;
}

const CHAT_QUICK_TEMPLATES: ChatQuickTemplate[] = [
  { id: '1', text: 'Moin zusammen! 👋', category: 'Grüße', icon: '👋' },
  { id: '2', text: 'Gute Fahrt an alle! 🚛💨', category: 'Grüße', icon: '🚛' },
  { id: '3', text: 'CB-Funk Check, hört mich wer? 📻', category: 'Funk', icon: '📻' },
  { id: '4', text: 'Reihe mich im Konvoi ein 🚚', category: 'Konvoi', icon: '🚚' },
  { id: '5', text: 'Stau / Gefahr voraus! ⚠️', category: 'Verkehr', icon: '⚠️' },
  { id: '6', text: 'Überholen frei! 👍', category: 'Verkehr', icon: '👍' },
  { id: '7', text: 'Fahre rechts ran / Pause 🅿️', category: 'Pause', icon: '🅿️' },
  { id: '8', text: 'Muss kurz tanken ⛽', category: 'Pause', icon: '⛽' },
  { id: '9', text: 'LKW beschädigt / Panne 🛠️', category: 'Notfall', icon: '🛠️' },
  { id: '10', text: 'Bin am Ziel angekommen! 🏁', category: 'Status', icon: '🏁' },
  { id: '11', text: 'Bin kurz AFK ⏳', category: 'Status', icon: '⏳' },
  { id: '12', text: 'Schönen Feierabend! 🍻', category: 'Grüße', icon: '🍻' },
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
      <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-zinc-950 via-zinc-900 to-black border border-primary/50 flex items-center justify-center shrink-0 shadow-[0_0_8px_var(--primary-glow)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,var(--primary-glow),transparent_70%)] pointer-events-none" />
        <div className="w-2 h-2 rounded-full bg-black border border-primary/60 flex items-center justify-center z-10">
          <Disc size={6} className="text-primary" />
        </div>
      </div>
    );
  }

  if (size === 'md') {
    return (
      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-zinc-950 via-amber-950/80 to-zinc-900 border border-amber-500/50 flex items-center justify-center shrink-0 shadow-[0_0_15px_var(--primary-glow)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,var(--primary-glow),transparent_70%)] pointer-events-none" />
        <div className="w-4 h-4 rounded-full bg-black/95 border border-amber-400/60 flex flex-col items-center justify-center z-10 shadow-inner">
          <Disc size={10} className="text-amber-400 animate-[spin_8s_linear_infinite]" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-2xl bg-gradient-to-br from-amber-950/40 via-zinc-950 to-black border border-amber-500/30 text-amber-400 flex flex-col items-center justify-center p-4 text-center shadow-[0_0_35px_var(--primary-glow-subtle)] relative overflow-hidden">
      {/* Large Spinning CD Disc Placeholder */}
      <div className="relative w-32 h-32 rounded-full bg-gradient-to-tr from-zinc-950 via-amber-900/40 to-zinc-900 border-2 border-amber-500/50 flex items-center justify-center shadow-[0_0_30px_var(--primary-glow)] mb-3 group">
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,var(--primary-glow),transparent_70%)] pointer-events-none" />
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

// Web Audio API singleton for low-latency, real-time frequency analysis
let globalAudioCtx: AudioContext | null = null;
let globalAnalyser: AnalyserNode | null = null;
const attachedAudioNodes = new WeakSet<HTMLAudioElement>();
let systemAudioStream: MediaStream | null = null;
let systemAudioSourceNode: MediaStreamAudioSourceNode | null = null;
let isSystemAudioConnecting = false;

export async function ensureSystemAudioVisualizerSource() {
  if (systemAudioSourceNode || isSystemAudioConnecting) return;
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) return;

  const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtxClass) return;

  isSystemAudioConnecting = true;
  try {
    if (!globalAudioCtx) {
      globalAudioCtx = new AudioCtxClass();
      globalAnalyser = globalAudioCtx.createAnalyser();
      globalAnalyser.fftSize = 64; // 32 frequency bins, minimal CPU footprint (<0.05% CPU)
      globalAnalyser.smoothingTimeConstant = 0.8; // natural analog-meter damping
    }

    if (globalAudioCtx.state === 'suspended') {
      await globalAudioCtx.resume().catch(() => {});
    }

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });

    // CRITICAL: Stop video tracks immediately so Electron spends 0 GPU/CPU on video rendering
    stream.getVideoTracks().forEach(track => track.stop());

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length > 0) {
      systemAudioStream = stream;
      systemAudioSourceNode = globalAudioCtx.createMediaStreamSource(stream);
      // Connect ONLY to analyser; DO NOT connect to globalAudioCtx.destination to prevent echo
      systemAudioSourceNode.connect(globalAnalyser);
    }
  } catch (err) {
    // Permission denied, cancelled, or not supported
  } finally {
    isSystemAudioConnecting = false;
  }
}

export function connectAudioElementToVisualizer(audio: HTMLAudioElement | null) {
  if (!audio || typeof window === 'undefined') return;
  // CRITICAL: Cross-origin audio (e.g. internet radio streams) will be completely SILENCED
  // by Chromium if passed to createMediaElementSource() without CORS headers from the stream host!
  if (audio.src && (audio.src.startsWith('http://') || audio.src.startsWith('https://')) && !audio.src.startsWith(window.location.origin)) {
    return;
  }
  const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtxClass) return;

  try {
    if (!globalAudioCtx) {
      globalAudioCtx = new AudioCtxClass();
      globalAnalyser = globalAudioCtx.createAnalyser();
      globalAnalyser.fftSize = 64; // 32 frequency bins, minimal CPU footprint (<0.05% CPU)
      globalAnalyser.smoothingTimeConstant = 0.8; // natural analog-meter damping
    }

    if (globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume().catch(() => {});
    }

    if (!attachedAudioNodes.has(audio)) {
      const source = globalAudioCtx.createMediaElementSource(audio);
      source.connect(globalAnalyser);
      // Connect source directly to destination so audio plays without passing through the global analyser.
      // NEVER connect globalAnalyser to destination, as systemAudioSourceNode connects to it and would create an echo!
      source.connect(globalAudioCtx.destination);
      attachedAudioNodes.add(audio);
    }
  } catch (err) {
    // Already attached or cross-origin restrictions
  }
}

/**
 * Extracts embedded album artwork (ID3v2 APIC for MP3, METADATA_BLOCK_PICTURE for FLAC) from audio files.
 * Reads only the first 2MB for near-instant execution (<5ms per song).
 */
export async function extractAudioCover(file: File): Promise<string | undefined> {
  try {
    const slice = file.slice(0, 2 * 1024 * 1024);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // 1. Check ID3v2 (MP3)
    if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
      const version = bytes[3];
      const tagSize = ((bytes[6] & 0x7f) << 21) | ((bytes[7] & 0x7f) << 14) | ((bytes[8] & 0x7f) << 7) | (bytes[9] & 0x7f);
      let pos = 10;
      const end = Math.min(tagSize + 10, bytes.length - 10);

      while (pos < end) {
        if (bytes[pos] === 0) break; // Padding
        let frameId = '';
        let frameSize = 0;
        let headerSize = 10;

        if (version >= 3) {
          frameId = String.fromCharCode(bytes[pos], bytes[pos + 1], bytes[pos + 2], bytes[pos + 3]);
          frameSize = version === 4
            ? ((bytes[pos + 4] & 0x7f) << 21) | ((bytes[pos + 5] & 0x7f) << 14) | ((bytes[pos + 6] & 0x7f) << 7) | (bytes[9] & 0x7f)
            : (bytes[pos + 4] << 24) | (bytes[pos + 5] << 16) | (bytes[pos + 6] << 8) | bytes[pos + 7];
        } else if (version === 2) {
          headerSize = 6;
          frameId = String.fromCharCode(bytes[pos], bytes[pos + 1], bytes[pos + 2]);
          frameSize = (bytes[pos + 3] << 16) | (bytes[pos + 4] << 8) | bytes[pos + 5];
        }

        if (frameSize <= 0 || pos + headerSize + frameSize > bytes.length) break;

        if (frameId === 'APIC' || frameId === 'PIC') {
          let p = pos + headerSize;
          const frameEnd = p + frameSize;
          const encoding = bytes[p++];
          
          let mime = 'image/jpeg';
          if (frameId === 'APIC') {
            let mimeStr = '';
            while (p < frameEnd && bytes[p] !== 0) {
              mimeStr += String.fromCharCode(bytes[p++]);
            }
            p++; // Skip null terminator
            if (mimeStr) mime = mimeStr.toLowerCase();
          } else {
            // ID3v2.2 PIC format: 3-char image format
            const fmt = String.fromCharCode(bytes[p++], bytes[p++], bytes[p++]).toLowerCase();
            mime = fmt === 'png' ? 'image/png' : 'image/jpeg';
          }

          p++; // Skip picture type (1 byte)

          // Skip description null terminator based on encoding
          if (encoding === 1 || encoding === 2) {
            // UTF-16: terminated by 0x00 0x00
            while (p + 1 < frameEnd && !(bytes[p] === 0 && bytes[p + 1] === 0)) p += 2;
            p += 2;
          } else {
            // ISO-8859-1 or UTF-8: terminated by 0x00
            while (p < frameEnd && bytes[p] !== 0) p++;
            p++;
          }

          if (p < frameEnd) {
            const picBytes = bytes.slice(p, frameEnd);
            const blob = new Blob([picBytes], { type: mime });
            return URL.createObjectURL(blob);
          }
        }

        pos += headerSize + frameSize;
      }
    }

    // 2. Check FLAC
    if (bytes[0] === 0x66 && bytes[1] === 0x4c && bytes[2] === 0x61 && bytes[3] === 0x43) {
      let offset = 4;
      while (offset < bytes.length - 4) {
        const header = bytes[offset];
        const isLast = (header & 0x80) !== 0;
        const blockType = header & 0x7f;
        const blockSize = (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];

        if (blockType === 6) { // PICTURE block
          let p = offset + 4;
          p += 4; // Skip picture type (4 bytes)
          const mimeLen = (bytes[p] << 24) | (bytes[p + 1] << 16) | (bytes[p + 2] << 8) | bytes[p + 3];
          p += 4;
          let mime = '';
          for (let i = 0; i < mimeLen; i++) mime += String.fromCharCode(bytes[p++]);
          const descLen = (bytes[p] << 24) | (bytes[p + 1] << 16) | (bytes[p + 2] << 8) | bytes[p + 3];
          p += 4 + descLen;
          p += 16; // Skip width (4), height (4), depth (4), colors (4)
          const dataLen = (bytes[p] << 24) | (bytes[p + 1] << 16) | (bytes[p + 2] << 8) | bytes[p + 3];
          p += 4;
          if (p + dataLen <= bytes.length) {
            const picBytes = bytes.slice(p, p + dataLen);
            const blob = new Blob([picBytes], { type: mime || 'image/jpeg' });
            return URL.createObjectURL(blob);
          }
        }

        offset += 4 + blockSize;
        if (isLast) break;
      }
    }
  } catch (err) {
    console.warn('Cover extraction failed for file:', file.name, err);
  }
  return undefined;
}

// --- ULTRA-LIGHTWEIGHT GPU-ACCELERATED HTML5 CANVAS AUDIO VISUALIZER (0% CPU, 0 REACT RENDERS) ---
const SMTCVisualizer: React.FC<{ isPlaying: boolean; barsCount?: number; className?: string; isDark?: boolean }> = ({
  isPlaying,
  barsCount = 28,
  className = '',
  isDark = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const center = (barsCount - 1) / 2;
    const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#f59e0b';

    const drawBars = (heightPercents: number[]) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = primary;

      const totalBars = barsCount;
      const spacing = 3;
      const totalSpacing = (totalBars - 1) * spacing;
      const barWidth = Math.max(2.5, (w - totalSpacing) / totalBars);

      for (let i = 0; i < totalBars; i++) {
        const pct = heightPercents[i] || 10;
        const barH = Math.max(3, Math.round((pct / 100) * (h - 2)));
        const x = i * (barWidth + spacing);
        const y = h - barH;

        ctx.beginPath();
        if (typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(x, y, barWidth, barH, 2);
        } else {
          ctx.rect(x, y, barWidth, barH);
        }
        ctx.fill();
      }
    };

    if (!isPlaying) {
      drawBars(Array.from({ length: barsCount }, () => 10));
      return;
    }

    // Connect Windows system audio loopback so real Spotify/SMTC playback frequency data is received
    ensureSystemAudioVisualizerSource();

    let frameId: number;
    let lastTime = 0;
    const freqData = new Uint8Array(32);
    let currentHeights = Array.from({ length: barsCount }, () => 10);
    let isResting = false;

    // Zero-overhead resting check: If music is stopped/paused, paint resting baseline once and exit immediately
    if (!isPlaying) {
      drawBars(currentHeights);
      return;
    }

    const animate = (time: number) => {
      // Pause drawing if window is in background or hidden
      if (document.hidden) {
        frameId = 0;
        return;
      }

      // Adaptive frame throttling: ~32 fps (31ms) during active playback, ~10 fps (95ms) when audio is idle/resting
      const requiredDelta = isResting ? 95 : 31;
      if (time - lastTime > requiredDelta) {
        lastTime = time;

        let hasRealAudio = false;
        if (globalAnalyser) {
          globalAnalyser.getByteFrequencyData(freqData);
          let sum = 0;
          for (let i = 0; i < 32; i++) {
            sum += freqData[i];
          }
          if (sum > 4) hasRealAudio = true;
        }

        if (hasRealAudio) {
          isResting = false;
          for (let i = 0; i < barsCount; i++) {
            // Low frequencies (bass) in the center, high frequencies (treble) on the outer edges
            const distFromCenter = Math.abs(i - center) / (center || 1);
            const binIndex = Math.min(31, Math.max(0, Math.floor(Math.pow(distFromCenter, 1.2) * 31)));
            const trebleBoost = 1 + distFromCenter * 0.45;
            const rawVal = (freqData[binIndex] || 0) * trebleBoost;
            currentHeights[i] = Math.min(100, Math.max(12, Math.round((rawVal / 255) * 100)));
          }
          drawBars(currentHeights);
        } else {
          // Fade down to resting baseline
          let decaying = false;
          for (let i = 0; i < barsCount; i++) {
            if (currentHeights[i] > 10) {
              currentHeights[i] = Math.max(10, Math.round(currentHeights[i] * 0.88));
              decaying = true;
            }
          }

          if (decaying) {
            isResting = false;
            drawBars(currentHeights);
          } else if (!isResting) {
            // Once resting baseline is reached, draw once and completely pause canvas redraws
            isResting = true;
            drawBars(currentHeights);
          }
        }
      }
      frameId = requestAnimationFrame(animate);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        if (frameId) {
          cancelAnimationFrame(frameId);
          frameId = 0;
        }
      } else if (isPlaying && !frameId) {
        frameId = requestAnimationFrame(animate);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    frameId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frameId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isPlaying, barsCount]);

  return (
    <div className={`flex items-end justify-center h-8 px-3 py-1 ${className}`}>
      <canvas
        ref={canvasRef}
        width={barsCount * 8 + (barsCount - 1) * 3}
        height={32}
        className="w-full max-w-[280px] h-full"
      />
    </div>
  );
};

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
  const { appearance } = useTheme();
  const [telemetry, setTelemetry] = useState<Telemetry>({ connected: false } as Telemetry);
  const telemetryRef = useRef<Telemetry>(telemetry);
  telemetryRef.current = telemetry;
  const [media, setMedia] = useState<SmtcData | null>(null);
  const [settings, setSettings] = useState<OverlaySettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const lastActiveAppRef = useRef<RecentAppId>('home');

  // Music Mode Sub-Tabs ('windows' | 'local' | 'radio')
  const [musicSubTab, setMusicSubTab] = useState<'windows' | 'local' | 'radio'>(() => {
    try {
      const saved = localStorage.getItem('opc_carplay_music_subtab');
      if (saved && ['windows', 'local', 'radio'].includes(saved)) {
        return saved as 'windows' | 'local' | 'radio';
      }
    } catch (e) {}
    return 'windows';
  });

  useEffect(() => {
    try {
      localStorage.setItem('opc_carplay_music_subtab', musicSubTab);
    } catch (e) {}
  }, [musicSubTab]);

  // Active logged-in user profile for Driver status & chat identity
  const user = useMemo(() => {
    try {
      const rawCached = localStorage.getItem('opc_cached_user');
      if (rawCached) return JSON.parse(rawCached);
      const rawUser = localStorage.getItem('user');
      if (rawUser) return JSON.parse(rawUser);
    } catch (e) {}
    return null;
  }, []);

  // Android Auto Style Recent Apps in Taskbar (Top 3 most recently used apps, excluding 'home' dashboard)
  // Differentiates SMTC ('music-windows'), Live-Radio ('music-radio'), and Lokale Musik ('music-local')
  const [recentApps, setRecentApps] = useState<RecentAppId[]>(() => {
    try {
      const saved = localStorage.getItem('openpipeclub_carplay_recent_apps');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter(t => [
            'map', 'music', 'music-windows', 'music-radio', 'music-local',
            'job', 'truck', 'control', 'settings', 'chat', 'events'
          ].includes(t));
          if (valid.length >= 3) return valid.slice(0, 3) as RecentAppId[];
        }
      }
    } catch (e) {}
    return ['map', 'music-windows', 'truck'];
  });

  const openApp = useCallback((tab: Tab, subMode?: 'windows' | 'local' | 'radio') => {
    if (tab === 'apps') {
      setActiveTab('apps');
      setContentIndex(0);
      return;
    }
    if (tab === 'home') {
      setActiveTab('home');
      setContentIndex(0);
      return;
    }
    setActiveTab(tab);
    setContentIndex(0);
    const effectiveSubMode = tab === 'music' ? (subMode || musicSubTab || 'windows') : undefined;
    if (tab === 'music' && subMode) {
      setMusicSubTab(subMode);
    }
    const recentId: RecentAppId = tab === 'music'
      ? (`music-${effectiveSubMode}` as RecentAppId)
      : tab;

    lastActiveAppRef.current = recentId;

    setRecentApps(prev => {
      const filtered = prev.filter(t => t !== recentId && t !== 'home' && t !== 'apps');
      const updated = [recentId, ...filtered].slice(0, 3);
      try {
        localStorage.setItem('openpipeclub_carplay_recent_apps', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    setSidebarIndex(1);
  }, [musicSubTab]);

  const handleAndroidAutoMenuButton = useCallback(() => {
    // Android Auto Zyklus:
    // 1. Wenn man in einer App ist (z. B. Navigation, Musik, Job, etc.) -> Erst zum Dashboard ('home')
    // 2. Wenn man auf dem Dashboard ('home') ist -> Zum App-Raster ('apps')
    // 3. Wenn man im App-Raster ('apps') ist -> Zurück zum Dashboard ('home')
    if (activeTab === 'home') {
      setActiveTab('apps');
    } else if (activeTab === 'apps') {
      openApp('home');
    } else {
      openApp('home');
    }
  }, [activeTab, openApp]);
  const [timeString, setTimeString] = useState('12:00');

  // Synchronized map zoom level across all CarPlay map views (persisted in localStorage)
  const [carPlayMapZoom, setCarPlayMapZoom] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('opc_carplay_map_zoom');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 4 && parsed <= 13) return parsed;
      }
    } catch (e) {}
    return 9;
  });

  useEffect(() => {
    try {
      localStorage.setItem('opc_carplay_map_zoom', carPlayMapZoom.toString());
    } catch (e) {}
  }, [carPlayMapZoom]);

  // Calculate active theme mode (dark vs light) based on 3 themes: dark, light, or auto (low beam headlights)
  const isLowBeamOn = telemetry.connected ? (telemetry.lightsBeamLow ?? false) : true;
  const activeTheme: 'dark' | 'light' = settings.carPlayTheme === 'auto'
    ? (isLowBeamOn ? 'dark' : 'light')
    : (settings.carPlayTheme === 'light' ? 'light' : 'dark');
  const isLight = activeTheme === 'light';

  const mapThemeSetting = settings.carPlayMapTheme || 'auto';
  const activeMapTheme: 'dark' | 'light' = mapThemeSetting === 'auto'
    ? (settings.carPlayTheme === 'light' ? 'light' : (isLowBeamOn ? 'dark' : 'light'))
    : (mapThemeSetting === 'light' ? 'light' : 'dark');

  // Responsive sidebar scaling & aspect ratio category
  const [sidebarScale, setSidebarScale] = useState(1);
  const [aspectCategory, setAspectCategory] = useState<'4:3' | '16:10' | '16:9' | '21:9' | 'narrow'>('16:9');
  // Android Auto Taskbar Position: 'side' (left) for landscape/widescreen displays, 'bottom' for narrow / 4:3 / portrait / square displays
  const [taskbarPosition, setTaskbarPosition] = useState<'side' | 'bottom'>('side');
  // Dynamic App Raster Grid Columns (3 or 5 depending on aspect ratio and screen width)
  const [appGridCols, setAppGridCols] = useState<number>(5);
  const appGridColsRef = useRef<number>(5);

  // LKW-Zündungs- & Stromversorgungs-Status (Electric & Engine)
  const isIgnitionOn = useMemo(() => {
    if (!telemetry.connected) return true; // Ohne aktive Telemetrie immer bedienbar
    if (typeof telemetry.electricEnabled === 'boolean') {
      return telemetry.electricEnabled;
    }
    if (typeof telemetry.engineEnabled === 'boolean') {
      return telemetry.engineEnabled;
    }
    return (telemetry.rpm > 50) || (telemetry.speed > 0);
  }, [telemetry.connected, telemetry.electricEnabled, telemetry.engineEnabled, telemetry.rpm, telemetry.speed]);

  // Manuelles Aufwecken durch Berührung während Zündung aus
  const [manualWake, setManualWake] = useState<boolean>(false);
  const prevIgnitionRef = useRef<boolean>(true);

  useEffect(() => {
    // Sobald die Zündung eingeschaltet wird, den manuellen Wake zurücksetzen und Wake-Animation abspielen
    if (isIgnitionOn && !prevIgnitionRef.current) {
      setManualWake(false);
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 700);
      return () => clearTimeout(timer);
    }
    prevIgnitionRef.current = isIgnitionOn;
  }, [isIgnitionOn]);

  // CarPlay geht in Standby (Bildschirm aus): entweder per Hotkey-Blackout oder wenn Zündung aus
  const isCarPlaySleeping = Boolean(
    isBlackout ||
    (settings.carPlayIgnitionSleep &&
    telemetry.connected &&
    !isIgnitionOn &&
    !manualWake &&
    activeTab !== 'settings')
  );

  // Real-time tracking refs for zero-overhead event throttling
  const activeTabRef = useRef<Tab>(activeTab);
  activeTabRef.current = activeTab;
  const isCarPlaySleepingRef = useRef<boolean>(isCarPlaySleeping);
  isCarPlaySleepingRef.current = isCarPlaySleeping;

  // Real-time ETA state
  const [liveRemainingSeconds, setLiveRemainingSeconds] = useState<number | null>(null);

  // Speed Camera (Blitzer) proximity alert state
  const [speedcamAlert, setSpeedcamAlert] = useState<SpeedcamAlertInfo | null>(null);

  // Traffic Light (Ampel) proximity alert state
  const [approachingTrafficLight, setApproachingTrafficLight] = useState<ApproachingTrafficLight | null>(null);

  // Focus and maximized state
  const [focusZone, setFocusZone] = useState<'sidebar' | 'content'>('sidebar');
  const [sidebarIndex, setSidebarIndex] = useState(0);
  const [contentIndex, setContentIndex] = useState(0);
  const [maximizedWidget, setMaximizedWidget] = useState<'map' | null>(null);
  const [mapTabFocus, setMapTabFocus] = useState<'map' | 'search' | 'bottom-nav'>('map');

  // Truck Multi-Page state (0: Cockpit & Antrieb, 1: Bordcomputer & Tank, 2: Diagnose & Status)
  const [truckPage, setTruckPage] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('opc_carplay_truck_page');
      if (saved) {
        const p = parseInt(saved, 10);
        if (p >= 0 && p <= 3) return p;
      }
    } catch (e) {}
    return 0;
  });

  useEffect(() => {
    try {
      localStorage.setItem('opc_carplay_truck_page', String(truckPage));
    } catch (e) {}
  }, [truckPage]);

  // Settings Multi-Page state (0: Design & Display, 1: Fahrt-Warnungen, 2: Meldungen & System)
  const [settingsPage, setSettingsPage] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('opc_carplay_settings_page');
      if (saved) {
        const p = parseInt(saved, 10);
        if (p >= 0 && p <= 2) return p;
      }
    } catch (e) {}
    return 0;
  });

  useEffect(() => {
    try {
      localStorage.setItem('opc_carplay_settings_page', String(settingsPage));
    } catch (e) {}
  }, [settingsPage]);

  // Local Music Player State
  const [localTracks, setLocalTracks] = useState<{ id: string; name: string; url: string; file: File; coverUrl?: string }[]>([]);
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
  const [lastAudioSource, setLastAudioSource] = useState<'smtc' | 'radio' | 'local'>('smtc');
  const [radioVolume, setRadioVolume] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('opc_carplay_radio_volume');
      if (saved !== null) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) return parsed;
      }
    } catch (e) {}
    return 0.5;
  });
  const prevRadioVolumeRef = useRef<number>(0.5);
  const [volumeHud, setVolumeHud] = useState<{ show: boolean; volume: number; isMuted: boolean } | null>(null);
  const volumeHudTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerVolumeHud = useCallback((vol: number, isMuted: boolean) => {
    setVolumeHud({ show: true, volume: vol, isMuted });
    if (volumeHudTimerRef.current) clearTimeout(volumeHudTimerRef.current);
    volumeHudTimerRef.current = setTimeout(() => {
      setVolumeHud(null);
    }, 1500);
  }, []);

  const adjustRadioVolume = useCallback((delta: number) => {
    setRadioVolume((prev) => {
      let next = Math.round((prev + delta) * 100) / 100;
      next = Math.max(0, Math.min(1, next));
      if (next > 0) prevRadioVolumeRef.current = next;
      if (radioAudioRef.current) {
        radioAudioRef.current.volume = next;
      }
      try { localStorage.setItem('opc_carplay_radio_volume', String(next)); } catch (e) {}
      triggerVolumeHud(next, next === 0);
      return next;
    });
  }, [triggerVolumeHud]);

  const toggleMuteRadio = useCallback(() => {
    setRadioVolume((prev) => {
      let next: number;
      if (prev > 0) {
        prevRadioVolumeRef.current = prev;
        next = 0;
      } else {
        next = prevRadioVolumeRef.current > 0 ? prevRadioVolumeRef.current : 0.5;
      }
      if (radioAudioRef.current) {
        radioAudioRef.current.volume = next;
      }
      try { localStorage.setItem('opc_carplay_radio_volume', String(next)); } catch (e) {}
      triggerVolumeHud(next, next === 0);
      return next;
    });
  }, [triggerVolumeHud]);

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
      if (isCarPlaySleepingRef.current) return;
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
  const [virtualKbTarget, setVirtualKbTarget] = useState<'radio' | 'city' | 'chat'>('radio');
  const [kbRow, setKbRow] = useState<number>(0);
  const [kbCol, setKbCol] = useState<number>(0);
  const [kbMode, setKbMode] = useState<'abc' | '123'>('abc');
  const [chatInput, setChatInput] = useState<string>('');
  const sendChatMessageRef = useRef<(() => void) | null>(null);

  // Open virtual keyboard on target input focus/click (always opens unconditionally across all tabs)
  const openVirtualKeyboard = useCallback((target: 'radio' | 'city' | 'chat' = 'radio') => {
    setVirtualKbTarget(target);
    setIsVirtualKbOpen(true);
    setKbRow(0);
    setKbCol(0);
  }, []);

  const handleVirtualKeyPress = useCallback((key: string) => {
    let updateFn: React.Dispatch<React.SetStateAction<string>>;
    if (virtualKbTarget === 'radio') updateFn = setRadioSearch;
    else if (virtualKbTarget === 'chat') updateFn = setChatInput;
    else updateFn = setSearchQuery;

    if (key === 'BACKSPACE') {
      updateFn((prev) => prev.slice(0, -1));
    } else if (key === 'CLEAR') {
      updateFn('');
    } else if (key === 'SPACE') {
      updateFn((prev) => prev + ' ');
    } else if (key === 'ENTER') {
      if (virtualKbTarget === 'chat') {
        sendChatMessageRef.current?.();
      }
      setIsVirtualKbOpen(false);
    } else if (key === 'CLOSE') {
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

  // Auto scroll list item when focused via hotkeys/keyboard (Instant 60 FPS scrolling)
  useEffect(() => {
    if ((activeTab === 'music' || activeTab === 'chat' || activeTab === 'events' || activeTab === 'settings') && focusZone === 'content') {
      const focusedElement = document.querySelector('[data-item-focused="true"]');
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      }
    }
  }, [contentIndex, activeTab, focusZone, musicSubTab, settingsPage]);

  // Auto scroll app raster item when focused via hotkeys/keyboard
  useEffect(() => {
    if (activeTab === 'apps' && focusZone === 'content') {
      const focusedElement = document.querySelector('[data-app-focused="true"]');
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      }
    }
  }, [contentIndex, activeTab, focusZone]);

  // Local Audio Handlers
  const handleLocalFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    e.target.value = '';
    const newTracks = await Promise.all(
      files.map(async (file, idx) => {
        const coverUrl = await extractAudioCover(file);
        return {
          id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name.replace(/\.[^/.]+$/, ""),
          url: URL.createObjectURL(file),
          file,
          coverUrl,
        };
      })
    );
    setLocalTracks((prev) => [...prev, ...newTracks]);
  };

  const togglePlayLocal = () => {
    setLastAudioSource('local');
    if (!localAudioRef.current || localTracks.length === 0) return;
    if (isLocalPlaying) {
      localAudioRef.current.pause();
      setIsLocalPlaying(false);
    } else {
      connectAudioElementToVisualizer(localAudioRef.current);
      localAudioRef.current.play().catch(() => {});
      setIsLocalPlaying(true);
    }
  };

  const playLocalTrack = (index: number) => {
    if (index < 0 || index >= localTracks.length) return;
    setLastAudioSource('local');
    setCurrentLocalIndex(index);
    setIsLocalPlaying(true);
    setTimeout(() => {
      if (localAudioRef.current) {
        connectAudioElementToVisualizer(localAudioRef.current);
        localAudioRef.current.play().catch(() => {});
      }
    }, 50);
  };

  // Radio Audio Handlers & Playback Engine
  useEffect(() => {
    const audio = radioAudioRef.current;
    if (!audio) return;

    if (isRadioPlaying && activeRadio?.url) {
      if (audio.src !== activeRadio.url) {
        audio.src = activeRadio.url;
      }
      const effectiveVol = radioVolume > 0 ? radioVolume : 0.5;
      audio.volume = Math.max(0, Math.min(1, effectiveVol));
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (err.name === 'AbortError') return;
          console.warn('Radio stream playback failed:', err);
          setIsRadioPlaying(false);
          showNotification({
            type: 'music',
            title: 'Radio-Stream offline',
            message: `Wiedergabe von "${activeRadio.name}" fehlgeschlagen. Stream eventuell offline.`,
            color: 'bg-[#18181b]/95 border-rose-500/40 backdrop-blur-md shadow-rose-950/40',
            icon: <Radio size={22} className="text-rose-400" />
          });
        });
      }
    } else {
      audio.pause();
    }
  }, [activeRadio?.url, isRadioPlaying]);

  useEffect(() => {
    if (radioAudioRef.current) {
      radioAudioRef.current.volume = Math.max(0, Math.min(1, radioVolume));
    }
  }, [radioVolume]);

  useEffect(() => {
    if (isRadioPlaying) setLastAudioSource('radio');
  }, [isRadioPlaying]);

  useEffect(() => {
    if (isLocalPlaying) setLastAudioSource('local');
  }, [isLocalPlaying]);

  useEffect(() => {
    if (media?.isPlaying && !isRadioPlaying && !isLocalPlaying) setLastAudioSource('smtc');
  }, [media?.isPlaying, isRadioPlaying, isLocalPlaying]);

  const togglePlayRadio = (station?: RadioStation) => {
    setLastAudioSource('radio');
    const target = station || activeRadio || radioStations[0];
    if (!target) return;

    if (activeRadio?.id === target.id && isRadioPlaying) {
      setIsRadioPlaying(false);
    } else {
      if (radioVolume === 0) {
        const restored = prevRadioVolumeRef.current > 0 ? prevRadioVolumeRef.current : 0.5;
        setRadioVolume(restored);
        if (radioAudioRef.current) radioAudioRef.current.volume = restored;
        try { localStorage.setItem('opc_carplay_radio_volume', String(restored)); } catch (e) {}
      }
      setActiveRadio(target);
      setIsRadioPlaying(true);
    }
  };

  const playPrevRadioStation = () => {
    setLastAudioSource('radio');
    if (filteredRadioStations.length === 0) return;
    const curIdx = activeRadio ? filteredRadioStations.findIndex(s => s.id === activeRadio.id) : 0;
    const prevIdx = (curIdx - 1 + filteredRadioStations.length) % filteredRadioStations.length;
    const target = filteredRadioStations[prevIdx];
    if (target) {
      togglePlayRadio(target);
      if (musicSubTab === 'radio') {
        setContentIndex(prevIdx + 3);
        setFocusZone('content');
      }
    }
  };

  const playNextRadioStation = () => {
    setLastAudioSource('radio');
    if (filteredRadioStations.length === 0) return;
    const curIdx = activeRadio ? filteredRadioStations.findIndex(s => s.id === activeRadio.id) : -1;
    const nextIdx = (curIdx + 1) % filteredRadioStations.length;
    const target = filteredRadioStations[nextIdx];
    if (target) {
      togglePlayRadio(target);
      if (musicSubTab === 'radio') {
        setContentIndex(nextIdx + 3);
        setFocusZone('content');
      }
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
        }
      }
    };
    reader.readAsText(file);
  };

  // Custom Navigation Destination state (Company & City Search)
  const [customDest, setCustomDest] = useState<{ dest: string; destCompany?: string; title: string; x?: number; z?: number } | null>(null);
  const [customRouteInfo, setCustomRouteInfo] = useState<{ distanceMeters: number; durationSeconds: number } | null>(null);
  const [pendingDest, setPendingDest] = useState<{ dest: string; destCompany?: string; title: string; x?: number; z?: number } | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'companies' | 'cities'>('all');
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(0);
  const [maxMapFocus, setMaxMapFocus] = useState<'map' | 'search' | 'bottom-nav'>('map');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto scroll map search item when navigated via hotkeys/keyboard/controller
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const selectedEl = document.querySelector('[data-search-selected="true"]');
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [searchSelectedIndex, searchQuery, searchFilter]);

  // Route active state: true if custom navigation destination, active event route, or active in-game telemetry route
  const [activeEventRoute, setActiveEventRouteState] = useState<ActiveEventRoute | null>(() => getActiveEventRoute());

  const isRouteActive = Boolean(
    activeEventRoute ||
    customDest ||
    (telemetry.connected && (
      ((telemetry as any).routeWaypoints && (telemetry as any).routeWaypoints.length > 0) ||
      (telemetry.navDistance && telemetry.navDistance > 0) ||
      (telemetry.navTime && telemetry.navTime > 0) ||
      (telemetry.jobActive && (
        (telemetry.dest && telemetry.dest.trim().length > 0 && telemetry.dest.toLowerCase() !== 'none')
      ))
    ))
  );

  const startPendingRoute = useCallback(() => {
    if (!pendingDest) return;
    const dest = pendingDest;
    setCustomDest(dest);
    setPendingDest(null);
    setMapTabFocus('map');
    setMaxMapFocus('map');
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
  }, [pendingDest]);

  useEffect(() => {
    const handleActiveRouteChange = (e: any) => {
      const newRoute = e.detail ?? getActiveEventRoute();
      setActiveEventRouteState(newRoute);
      if (newRoute) {
        showNotification({
          title: '🏁 Event-Route geladen!',
          message: `${newRoute.eventTitle}: ${newRoute.startCity} → ${newRoute.endCity}`,
          icon: <Navigation size={18} />,
          color: '#10b981',
        });
        setTimeout(() => {
          mapWidgetRef.current?.recenter();
          maxMapWidgetRef.current?.recenter();
        }, 150);
      }
    };
    window.addEventListener(ACTIVE_ROUTE_CHANGED_EVENT, handleActiveRouteChange);
    return () => window.removeEventListener(ACTIVE_ROUTE_CHANGED_EVENT, handleActiveRouteChange);
  }, []);

  const effectiveRouteWaypoints = useMemo(() => {
    if (activeEventRoute && activeEventRoute.gameCoords && activeEventRoute.gameCoords.length > 0) {
      return activeEventRoute.gameCoords;
    }
    if (customDest) {
      return undefined;
    }
    if (telemetry.connected) {
      const wp = (telemetry as any).routeWaypoints;
      if (Array.isArray(wp) && wp.length > 0) return wp;
      return [];
    }
    return undefined;
  }, [activeEventRoute, customDest, telemetry.connected, (telemetry as any).routeWaypoints]);

  const effectiveDest = customDest ? customDest.dest : (activeEventRoute ? activeEventRoute.endCity : ((telemetry.connected && telemetry.jobActive) ? telemetry.dest : undefined));
  const effectiveDestCompany = customDest ? customDest.destCompany : (activeEventRoute ? activeEventRoute.endCompany : ((telemetry.connected && telemetry.jobActive) ? telemetry.dest_company : undefined));
  const effectiveSource = activeEventRoute ? (activeEventRoute.startCompany ? `${activeEventRoute.startCity} (${activeEventRoute.startCompany})` : activeEventRoute.startCity) : ((telemetry.connected && telemetry.jobActive) ? telemetry.source : undefined);

  useEffect(() => {
    if (isRouteActive) {
      if (maxMapFocus === 'search') setMaxMapFocus('map');
      if (mapTabFocus === 'search') setMapTabFocus('map');
    }
  }, [isRouteActive, maxMapFocus, mapTabFocus]);

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
  const cachedRouteWaypointsRef = useRef<any>(null);

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

  // Responsive sidebar scaling & aspect ratio detection
  useEffect(() => {
    const updateDimensionsAndScale = () => {
      const currentWidth = window.innerWidth;
      const currentHeight = window.innerHeight;
      const ratio = currentWidth / Math.max(1, currentHeight);

      // 1. Manuelle Aspect-Ratio-Einstellung aus den CarPlay-Einstellungen
      const manualRatio = settings.carPlayAspectRatio;
      if (manualRatio && manualRatio !== 'free') {
        if (manualRatio === '4:3') {
          setAspectCategory('4:3');
          setTaskbarPosition('bottom');
        } else if (manualRatio === '16:10') {
          setAspectCategory('16:10');
          setTaskbarPosition('bottom');
        } else if (manualRatio === '16:9') {
          setAspectCategory('16:9');
          setTaskbarPosition('side');
        } else if (manualRatio === '21:9') {
          setAspectCategory('21:9');
          setTaskbarPosition('side');
        }
      } else {
        // 2. Freier Modus / Automatische Erkennung anhand des Seitenverhältnisses:
        // Bildschirme mit Seitenverhältnis < 1.72 (16:10 = 1.60, 4:3 = 1.33, iPad, quadratisch, hochkant) -> Taskbar UNTEN
        // Echte Breitbild-/Ultrawide-Displays (>= 1.72, wie 16:9 = 1.78, 21:9 = 2.33) -> Taskbar AM RAND (links)
        if (ratio < 1.18) {
          setAspectCategory('narrow');
          setTaskbarPosition('bottom');
        } else if (ratio < 1.48) {
          setAspectCategory('4:3');
          setTaskbarPosition('bottom');
        } else if (ratio < 1.72) {
          setAspectCategory('16:10');
          setTaskbarPosition('bottom');
        } else if (ratio < 2.05) {
          setAspectCategory('16:9');
          setTaskbarPosition('side');
        } else {
          setAspectCategory('21:9');
          setTaskbarPosition('side');
        }
      }

      // Skalierung dynamisch berechnen
      const wScale = currentWidth / 1024;
      const hScale = currentHeight / 576;
      const combinedScale = Math.min(wScale, hScale);
      const scale = Math.max(0.72, Math.min(1.2, combinedScale));
      setSidebarScale(scale);

      // 3. Dynamische Spaltenanzahl für das App-Raster (appGridCols):
      // Auf 4:3, narrow oder schmaleren Displays (< 820px) nutzen wir ein perfektes 3x3 Raster (3 Spalten).
      // Auf Breitbildformaten (16:10, 16:9, 21:9 mit Breite >= 820px) nutzen wir ein 5-Spalten-Raster.
      let effRatio = '16:9';
      if (manualRatio && manualRatio !== 'free') {
        effRatio = manualRatio;
      } else {
        if (ratio < 1.18) effRatio = 'narrow';
        else if (ratio < 1.48) effRatio = '4:3';
        else if (ratio < 1.72) effRatio = '16:10';
        else if (ratio < 2.05) effRatio = '16:9';
        else effRatio = '21:9';
      }

      const calculatedCols = (effRatio === '4:3' || effRatio === 'narrow' || currentWidth < 820) ? 3 : 5;
      setAppGridCols(calculatedCols);
      appGridColsRef.current = calculatedCols;
    };

    updateDimensionsAndScale();
    window.addEventListener('resize', updateDimensionsAndScale);
    return () => window.removeEventListener('resize', updateDimensionsAndScale);
  }, [settings.carPlayAspectRatio]);

  // --- In-Car Chat App State & Handlers ---
  const [chatChannels, setChatChannels] = useState<any[]>([]);
  const [activeChatChannel, setActiveChatChannel] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatSending, setChatSending] = useState<boolean>(false);
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [showChatTemplates, setShowChatTemplates] = useState<boolean>(false);
  const [templateNavIndex, setTemplateNavIndex] = useState<number>(0);
  const chatMessagesEndRef = useRef<HTMLDivElement | null>(null);

  const loadChatChannels = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API_URL}/chat/channels`, { headers });
      const ch = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setChatChannels(ch);
      if (ch.length > 0) {
        setActiveChatChannel((prev: any) => prev || ch[0]);
      }
    } catch (e) {
      console.warn('CarPlay Chat: Kanäle konnten nicht geladen werden', e);
    }
  }, []);

  const loadChatMessages = useCallback(async (channelId?: number) => {
    const targetId = channelId || activeChatChannel?.id;
    if (!targetId) return;
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API_URL}/chat/channels/${targetId}/messages`, { headers });
      const msgs = Array.isArray(res.data) ? res.data : [];
      setChatMessages(msgs);
    } catch (e) {
      console.warn('CarPlay Chat: Nachrichten konnten nicht geladen werden', e);
    }
  }, [activeChatChannel]);

  useEffect(() => {
    if (activeTab === 'chat') {
      loadChatChannels();
    }
  }, [activeTab, loadChatChannels]);

  useEffect(() => {
    if (activeTab !== 'chat' || !activeChatChannel?.id || isCarPlaySleeping) return;
    loadChatMessages();
    const interval = setInterval(() => {
      if (!isCarPlaySleepingRef.current) {
        loadChatMessages();
      }
    }, 3500);
    return () => clearInterval(interval);
  }, [activeTab, activeChatChannel?.id, isCarPlaySleeping, loadChatMessages]);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  const handleSendChatMessage = async (presetText?: string) => {
    const text = (presetText !== undefined ? presetText : chatInput).trim();
    if (!text || !activeChatChannel?.id || chatSending) return;
    setChatSending(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(`${API_URL}/chat/channels/${activeChatChannel.id}/messages`, { content: text }, { headers });
      if (res.data) {
        setChatMessages(prev => [...prev, res.data]);
      }
      if (presetText === undefined) {
        setChatInput('');
      }
    } catch (e) {
      console.error('CarPlay Chat Send Error:', e);
      showNotification({
        title: 'Fehler beim Senden',
        message: 'Der Funkspruch konnte nicht übertragen werden.',
        icon: <MessageSquare size={18} />,
        color: '#ef4444',
      });
    } finally {
      setChatSending(false);
    }
  };

  useEffect(() => {
    sendChatMessageRef.current = () => handleSendChatMessage();
  });

  // --- In-Car Events & Konvois App State & Handlers ---
  const [carPlayEvents, setCarPlayEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState<boolean>(false);
  const [selectedCarPlayEvent, setSelectedCarPlayEvent] = useState<any | null>(null);
  const [selectedEventModal, setSelectedEventModal] = useState<any | null>(null);

  const loadCarPlayEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API_URL}/events`, { headers });
      const list = Array.isArray(res.data) ? res.data : [];
      const sorted = list.sort((a: any, b: any) => new Date(a.start_date || 0).getTime() - new Date(b.start_date || 0).getTime());
      setCarPlayEvents(sorted);
      if (sorted.length > 0) {
        setSelectedCarPlayEvent((prev: any) => prev || sorted[0]);
      }
    } catch (e) {
      console.warn('CarPlay Events Error:', e);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'events') {
      loadCarPlayEvents();
    }
  }, [activeTab, loadCarPlayEvents]);

  const handleLoadCarPlayEventToNavi = (event: any) => {
    if (!event) return;
    let wps: any[] = [];
    if (event.route_waypoints) {
      try {
        wps = typeof event.route_waypoints === 'string' ? JSON.parse(event.route_waypoints) : event.route_waypoints;
      } catch (err) {
        console.warn('Parse route waypoints error:', err);
      }
    }
    if (!wps || wps.length === 0) {
      if (event.start_city) {
        const c1 = findCity(event.start_city);
        if (c1) wps.push({ id: 'wp_s', name: event.start_city, lat: c1.lat, lng: c1.lng, gx: c1.x, gz: c1.z });
      }
      if (event.end_city) {
        const c2 = findCity(event.end_city);
        if (c2) wps.push({ id: 'wp_e', name: event.end_city, lat: c2.lat, lng: c2.lng, gx: c2.x, gz: c2.z });
      }
    }

    if (!wps || wps.length === 0) {
      showNotification({
        title: '⚠️ Keine Route vorhanden',
        message: 'Für dieses Event sind keine Orts-Koordinaten hinterlegt.',
        icon: <AlertTriangle size={18} />,
        color: '#f59e0b',
      });
      return;
    }

    const full = setActiveEventRoute({
      eventId: event.id,
      eventTitle: event.title || `${event.start_city} → ${event.end_city}`,
      startCity: event.start_city || '',
      startCompany: event.start_company || '',
      endCity: event.end_city || '',
      endCompany: event.end_company || '',
      waypoints: wps,
    });

    if (full) {
      showNotification({
        title: '🏁 Event-Route geladen!',
        message: `${event.title || 'Event'}: ${event.start_city} → ${event.end_city}`,
        icon: <Navigation size={18} />,
        color: '#10b981',
      });
      setSelectedEventModal(null);
      openApp('map');
    }
  };

  const prevLiveRemainingRef = useRef<number | null>(null);

  // Helper to calculate realistic, stable remaining driving seconds based strictly on allowed speed
  const calculateRemainingSeconds = () => {
    const curTel = telemetryRef.current;
    const isATS = (curTel as any)?.gameType === 2;
    const highwayScale = isATS ? 20 : 19;

    // Erlaubte Geschwindigkeit (speed limit) exclusively - NEVER momentary driving speed
    const allowedSpeedKmh = curTel.speedLimit && curTel.speedLimit >= 20
      ? Math.max(30, Math.min(130, curTel.speedLimit))
      : 80; // Standard Truck Legal Limit (80 km/h in Europe / default highway)

    // In ETS2/ATS, cities have 1:3 scale (speed limit <= 50 km/h) while highways have 1:19/1:20 scale (speed limit >= 80 km/h)
    const cityFactor = Math.max(0, Math.min(1, (80 - allowedSpeedKmh) / 30));
    const dynamicScale = highwayScale - cityFactor * (highwayScale - 3);
    const allowedSpeedMps = (allowedSpeedKmh * 1000) / 3600;

    // Case 1: Custom Destination
    if (customDest) {
      let remMeters = customRouteInfo?.distanceMeters || 0;
      const destCoords = (customDest.x != null && customDest.z != null)
        ? { x: customDest.x, z: customDest.z }
        : (customDest.destCompany
          ? (findCompany(customDest.destCompany, customDest.dest) || findCity(customDest.dest))
          : findCity(customDest.dest));

      const pX = (curTel as any)?.posX;
      const pZ = (curTel as any)?.posZ;

      if (destCoords && pX != null && pZ != null) {
        const dx = destCoords.x - pX;
        const dz = destCoords.z - pZ;
        const directDist = Math.hypot(dx, dz);
        if (directDist > 0) {
          const estimatedRoadDist = directDist * 1.25;
          remMeters = remMeters > 0 ? Math.min(remMeters, estimatedRoadDist) : estimatedRoadDist;
        }
      } else if (curTel.navDistance && curTel.navDistance > 0) {
        remMeters = curTel.navDistance;
      }

      if (remMeters > 0) {
        return Math.max(15, Math.round((remMeters / allowedSpeedMps) / dynamicScale));
      }
      return customRouteInfo?.durationSeconds || null;
    }

    // Case 2: In-Game SCS Navigation
    // Calculate ETA strictly based on remaining distance and the legal allowed speed
    if (curTel.navDistance && curTel.navDistance > 0) {
      return Math.max(10, Math.round(curTel.navDistance / (allowedSpeedMps * dynamicScale)));
    }

    // Fallback: If navDistance is not available, scale navTime from game
    if (curTel.navTime && curTel.navTime > 0) {
      return Math.max(10, Math.round(curTel.navTime / dynamicScale));
    }

    return null;
  };

  // Real-time ETA calculation based on remaining distance and cruising speed
  useEffect(() => {
    const hasNav = Boolean(
      telemetry.connected && (
        (telemetry.navDistance && telemetry.navDistance > 0) ||
        (telemetry.navTime && telemetry.navTime > 0) ||
        customDest ||
        ((telemetry as any).routeWaypoints && (telemetry as any).routeWaypoints.length > 0) ||
        (telemetry.dest && telemetry.dest.trim().length > 0 && telemetry.dest.toLowerCase() !== 'none')
      )
    );

    if (!hasNav) {
      setLiveRemainingSeconds(null);
      prevLiveRemainingRef.current = null;
      return;
    }

    const updateETA = () => {
      const calcSec = calculateRemainingSeconds();
      if (calcSec !== null && calcSec > 0) {
        if (prevLiveRemainingRef.current === null || Math.abs(prevLiveRemainingRef.current - calcSec) >= 2) {
          prevLiveRemainingRef.current = calcSec;
          setLiveRemainingSeconds(calcSec);
        }
      }
    };

    updateETA();

    const interval = setInterval(() => {
      setLiveRemainingSeconds(prev => {
        if (prev !== null && prev > 1) {
          return prev - 1;
        }
        return prev;
      });
      updateETA();
    }, 1000);

    return () => clearInterval(interval);
  }, [telemetry.connected, Boolean(telemetry.navDistance && telemetry.navDistance > 0), Boolean(telemetry.navTime && telemetry.navTime > 0), Boolean(customDest), customRouteInfo]);

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
    if (activeTab === 'home') return 2;
    if (activeTab === 'music') {
      if (musicSubTab === 'radio') return 3 + filteredRadioStations.length + (activeRadio ? 7 : 0);
      if (musicSubTab === 'local') return 1 + localTracks.length;
      return 3;
    }
    if (activeTab === 'truck') return 3;
    if (activeTab === 'control') return 8;
    if (activeTab === 'settings') {
      if (settingsPage === 0) return 14;
      if (settingsPage === 1) return 5;
      if (settingsPage === 2) return 5;
      return 14;
    }
    if (activeTab === 'map') return 1;
    if (activeTab === 'apps') return 10; // 10 apps in Android Auto app grid drawer
    if (activeTab === 'chat') return Math.max(chatChannels.length, 1) + 4;
    if (activeTab === 'events') return Math.max(carPlayEvents.length, 1) + 2;
    if (activeTab === 'job') return 1;
    return 0;
  };

  const handleNav = (dir: string) => {
    // Global hotkey actions
    if (dir === 'recenter' || dir === 'center') {
      mapWidgetRef.current?.recenter();
      maxMapWidgetRef.current?.recenter();
      showNotification({
        type: 'system',
        title: 'GPS zentriert',
        message: 'Karte auf aktuelle LKW-Position zentriert.',
        icon: <Navigation size={20} className="text-sky-400" />,
        color: 'bg-[#18181b]/95 border-sky-500/40 backdrop-blur-md shadow-sky-950/40',
      });
      return;
    }

    if (dir === 'fit-route' || dir === 'fit') {
      mapWidgetRef.current?.fitRoute();
      maxMapWidgetRef.current?.fitRoute();
      return;
    }

    if (dir === 'cancel-route' || dir === 'clear-route') {
      mapWidgetRef.current?.clearRoute();
      maxMapWidgetRef.current?.clearRoute();
      setCustomDest(null);
      setCustomRouteInfo(null);
      setPendingDest(null);
      showNotification({
        type: 'system',
        title: 'Navigation beendet',
        message: 'Aktive Route wurde gelöscht.',
        icon: <X size={20} className="text-rose-400" />,
        color: 'bg-[#18181b]/95 border-rose-500/40 backdrop-blur-md shadow-rose-950/40',
      });
      return;
    }

    if (dir === 'zoom-in') {
      setCarPlayMapZoom(prev => Math.min(prev + 1, 13));
      return;
    }

    if (dir === 'zoom-out') {
      setCarPlayMapZoom(prev => Math.max(prev - 1, 4));
      return;
    }

    if (dir === 'radio-next') {
      playNextRadioStation();
      return;
    }

    if (dir === 'radio-prev') {
      playPrevRadioStation();
      return;
    }

    if (dir === 'volume-up') {
      adjustRadioVolume(0.05);
      return;
    }

    if (dir === 'volume-down') {
      adjustRadioVolume(-0.05);
      return;
    }

    if (dir === 'volume-mute') {
      toggleMuteRadio();
      return;
    }

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
        if (dir === 'up' || dir === 'prev') {
          setSearchSelectedIndex((prev) => Math.max(0, prev - 1));
          return;
        }
        if (dir === 'down' || dir === 'next') {
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
              x: item.x,
              z: item.z,
            };
            setPendingDest(dest);
            setSearchQuery('');
            searchInputRef.current?.blur();
            setTimeout(() => {
              const map = (maxMapWidgetRef.current || mapWidgetRef.current) as any;
              if (map && 'focusDestinationByGameCoords' in map) {
                if (item.x != null && item.z != null) {
                  map.focusDestinationByGameCoords(item.x, item.z);
                } else {
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
              }
            }, 50);
          }
          return;
        }
        return;
      }

      if (maxMapFocus === 'bottom-nav') {
        if (dir === 'up' || dir === 'right' || dir === 'back') {
          setMaxMapFocus('map');
          return;
        }
        if (dir === 'enter') {
          if (pendingDest && !customDest) {
            const dest = pendingDest;
            setCustomDest(dest);
            setPendingDest(null);
            setMaxMapFocus('map');
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
          if (customDest) {
            setCustomDest(null);
            setCustomRouteInfo(null);
            mapWidgetRef.current?.clearRoute();
            maxMapWidgetRef.current?.clearRoute();
            setMaxMapFocus('map');
            showNotification({
              type: 'system',
              title: 'Navigation beendet',
              message: 'Aktive Route wurde abgebrochen.',
              icon: <X size={20} className="text-rose-400" />,
              color: 'bg-[#18181b]/95 border-rose-500/40 backdrop-blur-md shadow-rose-950/40',
            });
            return;
          }
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
        if (dir === 'left') {
          if (pendingDest || customDest) {
            setMaxMapFocus('bottom-nav');
            return;
          }
          maxMapWidgetRef.current?.recenter();
          mapWidgetRef.current?.recenter();
          return;
        }
        if (dir === 'home') {
          maxMapWidgetRef.current?.recenter();
          mapWidgetRef.current?.recenter();
          return;
        }
        if (dir === 'right') {
          if (!isRouteActive) {
            setMaxMapFocus('search');
          } else {
            setMaxMapFocus('bottom-nav');
          }
          return;
        }
        if (dir === 'enter') {
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
          if (customDest || isRouteActive) {
            setMaxMapFocus('bottom-nav');
            return;
          }
          setMaxMapFocus('search');
          openVirtualKeyboard('city');
          searchInputRef.current?.focus();
          return;
        }
        if (dir === 'up') { setCarPlayMapZoom(prev => Math.min(prev + 1, 13)); return; }
        if (dir === 'down') { setCarPlayMapZoom(prev => Math.max(prev - 1, 4)); return; }
        if (dir === 'back') {
          if (pendingDest) {
            setPendingDest(null);
            return;
          }
          setMaximizedWidget(null);
          setMaxMapFocus('map');
          return;
        }
      }
      return;
    }


    if (dir === 'back') {
      if (showChatTemplates) {
        setShowChatTemplates(false);
        return;
      }
      if (activeTab === 'apps') {
        const lastApp = lastActiveAppRef.current || 'home';
        if (lastApp === 'music-windows') openApp('music', 'windows');
        else if (lastApp === 'music-radio') openApp('music', 'radio');
        else if (lastApp === 'music-local') openApp('music', 'local');
        else openApp(lastApp as Tab);
        setFocusZone('content');
        return;
      }
      if (focusZone === 'content') {
        setFocusZone('sidebar');
      } else {
        openApp('home');
        setSidebarIndex(1);
      }
      return;
    }

    if (focusZone === 'sidebar') {
      // 4 sidebar items: index 0 is App Launcher grid button, indices 1..3 are recentApps[0..2]
      if (taskbarPosition === 'bottom') {
        // Horizontal Taskbar Navigation (left/right navigate, up enters content)
        if (dir === 'left') setSidebarIndex(prev => (prev - 1 + 4) % 4);
        else if (dir === 'right') setSidebarIndex(prev => (prev + 1) % 4);
        else if (dir === 'up') {
          const count = getContentElementsCount();
          if (count > 0) {
            setFocusZone('content');
            setContentIndex(0);
          }
        }
      } else {
        // Vertical Taskbar Navigation (up/down navigate, right enters content)
        if (dir === 'up') setSidebarIndex(prev => (prev - 1 + 4) % 4);
        else if (dir === 'down') setSidebarIndex(prev => (prev + 1) % 4);
        else if (dir === 'right') {
          const count = getContentElementsCount();
          if (count > 0) {
            setFocusZone('content');
            setContentIndex(0);
          }
        }
      }
      
      if (dir === 'enter') {
        if (sidebarIndex === 0) {
          handleAndroidAutoMenuButton();
          setFocusZone('content');
          setContentIndex(0);
        } else {
          const targetApp = recentApps[sidebarIndex - 1] || 'home';
          if (targetApp === 'music-windows') openApp('music', 'windows');
          else if (targetApp === 'music-radio') openApp('music', 'radio');
          else if (targetApp === 'music-local') openApp('music', 'local');
          else openApp(targetApp as Tab);
          setSidebarIndex(1);
        }
      }
      return;
    }

    const count = getContentElementsCount();
    if (activeTab === 'home') {
      if (contentIndex === 0) {
        if (dir === 'up') setCarPlayMapZoom(prev => Math.min(prev + 1, 13));
        else if (dir === 'down') setCarPlayMapZoom(prev => Math.max(prev - 1, 4));
        else if (dir === 'left') { setFocusZone('sidebar'); setSidebarIndex(0); }
        else if (dir === 'right') { setContentIndex(1); }
        else if (dir === 'enter') { openApp('map'); setSidebarIndex(1); }
      } else if (contentIndex === 1) {
        if (dir === 'left') setContentIndex(0);
        else if (dir === 'up' || dir === 'down') setContentIndex(0);
        else if (dir === 'enter') {
          openApp('music', 'windows');
          setSidebarIndex(1);
        }
      }
    } else if (activeTab === 'map') {
      const isSearching = searchQuery.trim().length > 0;
      if (isSearching) {
        const allResults = searchDestinations(searchQuery);
        const filtered = allResults.filter((r) => {
          if (searchFilter === 'companies') return r.type === 'company';
          if (searchFilter === 'cities') return r.type === 'city';
          return true;
        });

        if (dir === 'back') {
          setSearchQuery('');
          searchInputRef.current?.blur();
          setMapTabFocus('map');
          return;
        }
        if (dir === 'up' || dir === 'prev') {
          setSearchSelectedIndex((prev) => Math.max(0, prev - 1));
          return;
        }
        if (dir === 'down' || dir === 'next') {
          setSearchSelectedIndex((prev) => Math.min(Math.max(0, filtered.length - 1), prev + 1));
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
          if (filtered.length > 0 && searchSelectedIndex >= 0 && searchSelectedIndex < filtered.length) {
            const item = filtered[searchSelectedIndex];
            const dest = { dest: item.cityName, destCompany: item.companyName, title: item.title, x: item.x, z: item.z };
            setPendingDest(dest);
            setSearchQuery('');
            searchInputRef.current?.blur();
            setMapTabFocus('bottom-nav');
            setTimeout(() => {
              const map = (maxMapWidgetRef.current || mapWidgetRef.current) as any;
              if (map && 'focusDestinationByGameCoords' in map) {
                if (item.x != null && item.z != null) {
                  map.focusDestinationByGameCoords(item.x, item.z);
                } else {
                  const company = findCompany(dest.destCompany || '', dest.dest);
                  if (company) { map.focusDestinationByGameCoords(company.x, company.z); }
                  else { const city = findCity(dest.dest); if (city) map.focusDestination(city.lng, city.lat); }
                }
              }
            }, 50);
          }
          return;
        }
        return;
      }

      if (mapTabFocus === 'search') {
        if (dir === 'left' || dir === 'back') {
          setMapTabFocus('map');
          return;
        }
        if (dir === 'down') {
          if (pendingDest || customDest || isRouteActive) {
            setMapTabFocus('bottom-nav');
          } else {
            setMapTabFocus('map');
          }
          return;
        }
        if (dir === 'up') {
          setSearchSelectedIndex(0);
          return;
        }
        if (dir === 'enter') {
          openVirtualKeyboard('city');
          searchInputRef.current?.focus();
          return;
        }
        return;
      }

      if (mapTabFocus === 'bottom-nav') {
        if (dir === 'up' || dir === 'right') {
          setMapTabFocus('map');
          return;
        }
        if (dir === 'back') {
          if (pendingDest) {
            setPendingDest(null);
            setMapTabFocus('map');
            return;
          }
          setMapTabFocus('map');
          return;
        }
        if (dir === 'enter') {
          if (pendingDest && !customDest) {
            startPendingRoute();
            return;
          }
          handleNavRef.current('cancel-route');
          setMapTabFocus('map');
          return;
        }
        return;
      }

      // mapTabFocus === 'map'
      if (dir === 'enter') {
        if (pendingDest && !customDest) {
          startPendingRoute();
          return;
        }
      }
      if (dir === 'up') setCarPlayMapZoom(prev => Math.min(prev + 1, 16));
      else if (dir === 'down') {
        if (pendingDest || customDest || isRouteActive) {
          setMapTabFocus('bottom-nav');
        } else {
          setCarPlayMapZoom(prev => Math.max(prev - 1, 4));
        }
      }
      else if (dir === 'left') {
        if (pendingDest || customDest || isRouteActive) {
          setMapTabFocus('bottom-nav');
        } else {
          setFocusZone('sidebar');
          setSidebarIndex(1);
        }
      }
      else if (dir === 'back') {
        if (pendingDest) {
          setPendingDest(null);
          return;
        }
        setFocusZone('sidebar');
        setSidebarIndex(1);
      }
      else if (dir === 'right') {
        if (pendingDest || isRouteActive) {
          setMapTabFocus('bottom-nav');
        } else {
          setMapTabFocus('search');
        }
      }
    } else if (activeTab === 'music') {
      if (dir === 'back') {
        if (focusZone === 'content') {
          setFocusZone('sidebar');
          setSidebarIndex(1);
        } else {
          setActiveTab('home');
          setSidebarIndex(0);
        }
        return;
      }

      // Direct sub-player navigation ('windows', 'local', 'radio')
      if (musicSubTab === 'radio') {
        const totalStations = filteredRadioStations.length;
        const deckStart = 3 + totalStations;

        if (contentIndex === 0) {
          // 0: Search
          if (dir === 'left') { setFocusZone('sidebar'); setSidebarIndex(1); }
          else if (dir === 'right') setContentIndex(1);
          else if (dir === 'down') {
            if (totalStations > 0) setContentIndex(3);
            else if (activeRadio) setContentIndex(deckStart + 1);
          }
          else if (dir === 'enter') openVirtualKeyboard('radio');
        } else if (contentIndex === 1) {
          // 1: Auto-Scan
          if (dir === 'left') setContentIndex(0);
          else if (dir === 'right') setContentIndex(2);
          else if (dir === 'down') {
            if (totalStations > 1) setContentIndex(4);
            else if (totalStations === 1) setContentIndex(3);
            else if (activeRadio) setContentIndex(deckStart + 1);
          }
          else if (dir === 'enter') autoLoadSii();
        } else if (contentIndex === 2) {
          // 2: Import
          if (dir === 'left') setContentIndex(1);
          else if (dir === 'down') {
            if (totalStations > 1) setContentIndex(4);
            else if (totalStations === 1) setContentIndex(3);
            else if (activeRadio) setContentIndex(deckStart + 1);
          }
          else if (dir === 'enter') siiFileInputRef.current?.click();
        } else if (contentIndex >= 3 && contentIndex < deckStart) {
          // 3..3+N-1: Stations Grid (2 columns: left = 3, 5, 7; right = 4, 6, 8)
          const sIdx = contentIndex - 3;
          const col = sIdx % 2;

          if (dir === 'left') {
            if (sIdx === 0) {
              setFocusZone('sidebar');
              setSidebarIndex(1);
            } else {
              setContentIndex(prev => prev - 1);
            }
          } else if (dir === 'right') {
            if (contentIndex + 1 < deckStart) {
              setContentIndex(prev => prev + 1);
            }
          } else if (dir === 'up') {
            if (sIdx === 0) {
              setContentIndex(0); // Search
            } else if (sIdx === 1) {
              setContentIndex(1); // Auto-Scan
            } else {
              setContentIndex(prev => Math.max(3, prev - 2)); // 1 row up
            }
          } else if (dir === 'down') {
            if (contentIndex + 2 < deckStart) {
              setContentIndex(prev => prev + 2); // 1 row down
            } else if (contentIndex + 1 < deckStart && col === 0) {
              setContentIndex(prev => prev + 1); // Last card if odd count
            } else if (activeRadio) {
              setContentIndex(deckStart + 1); // Play/pause button in player deck
            }
          } else if (dir === 'enter') {
            const targetStation = filteredRadioStations[sIdx];
            if (targetStation) togglePlayRadio(targetStation);
          }
        } else if (contentIndex >= deckStart && contentIndex < deckStart + 7) {
          // Bottom Player Deck (deckStart+0: Prev, +1: Play/Pause, +2: Next, +3: Mute, +4: Vol-, +5: Slider, +6: Vol+)
          const bIdx = contentIndex - deckStart;

          if (dir === 'left') {
            if (bIdx === 0) { setFocusZone('sidebar'); setSidebarIndex(1); }
            else if (bIdx === 5) {
              if (radioVolume <= 0.05) setContentIndex(deckStart + 4);
              else adjustRadioVolume(-0.05);
            }
            else setContentIndex(prev => prev - 1);
          } else if (dir === 'right') {
            if (bIdx === 5) {
              if (radioVolume >= 0.95) setContentIndex(deckStart + 6);
              else adjustRadioVolume(0.05);
            }
            else if (bIdx < 6) setContentIndex(prev => prev + 1);
          } else if (dir === 'up') {
            if (totalStations > 0) setContentIndex(deckStart - 1);
            else setContentIndex(1);
          } else if (dir === 'down') {
            if (bIdx === 5) setContentIndex(deckStart + 3);
          } else if (dir === 'enter') {
            if (bIdx === 0) playPrevRadioStation();
            else if (bIdx === 1) togglePlayRadio();
            else if (bIdx === 2) playNextRadioStation();
            else if (bIdx === 3 || bIdx === 5) toggleMuteRadio();
            else if (bIdx === 4) adjustRadioVolume(-0.05);
            else if (bIdx === 6) adjustRadioVolume(0.05);
          }
        }
      } else if (musicSubTab === 'local') {
        const totalLocalItems = 1 + localTracks.length;

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
            localFileInputRef.current?.click();
          } else if (contentIndex >= 1) {
            playLocalTrack(contentIndex - 1);
          }
        }
      } else if (musicSubTab === 'windows') {
        if (dir === 'left') {
          if (contentIndex === 0) { setFocusZone('sidebar'); setSidebarIndex(1); }
          else setContentIndex(prev => prev - 1);
        } else if (dir === 'right') {
          if (contentIndex < 2) setContentIndex(prev => prev + 1);
        } else if (dir === 'up') {
          setContentIndex(0);
        } else if (dir === 'down') {
          setContentIndex(1);
        } else if (dir === 'enter') {
          if (contentIndex === 0) {
            if (lastAudioSource === 'local') playLocalTrack((currentLocalIndex - 1 + localTracks.length) % localTracks.length);
            else if (lastAudioSource === 'radio') playPrevRadioStation();
            else sendMediaAction('prev');
          } else if (contentIndex === 1) {
            if (lastAudioSource === 'local') togglePlayLocal();
            else if (lastAudioSource === 'radio') togglePlayRadio();
            else sendMediaAction('play-pause');
          } else if (contentIndex === 2) {
            if (lastAudioSource === 'local') playLocalTrack((currentLocalIndex + 1) % localTracks.length);
            else if (lastAudioSource === 'radio') playNextRadioStation();
            else sendMediaAction('next');
          }
        }
      }
    } else if (activeTab === 'truck') {
      if (dir === 'left') {
        if (truckPage > 0) setTruckPage(prev => prev - 1);
        else { setFocusZone('sidebar'); setSidebarIndex(1); }
      } else if (dir === 'right') {
        if (truckPage < 2) setTruckPage(prev => prev + 1);
      } else if (dir === 'enter') {
        setTruckPage(prev => (prev + 1) % 3);
      } else if (dir === 'back') {
        setFocusZone('sidebar');
        setSidebarIndex(1);
      }
    } else if (activeTab === 'control') {
      const detail: { dir: string; handled: boolean } = { dir, handled: false };
      window.dispatchEvent(new CustomEvent('truck-nav', { detail }));
      if (!detail.handled && (dir === 'left' || dir === 'back')) {
        setFocusZone('sidebar');
        setSidebarIndex(1);
      }
    } else if (activeTab === 'settings') {
      if (dir === 'back') {
        setFocusZone('sidebar');
        setSidebarIndex(1);
        return;
      }

      if (dir === 'next-tab') {
        setSettingsPage(prev => (prev + 1) % 3);
        setContentIndex(0);
        return;
      }
      if (dir === 'prev-tab') {
        setSettingsPage(prev => (prev - 1 + 3) % 3);
        setContentIndex(0);
        return;
      }

      // If contentIndex === -1: Header Tab Bar is focused!
      if (contentIndex === -1) {
        if (dir === 'left') {
          if (settingsPage > 0) setSettingsPage(prev => prev - 1);
          else { setFocusZone('sidebar'); setSidebarIndex(1); }
        } else if (dir === 'right') {
          if (settingsPage < 2) setSettingsPage(prev => prev + 1);
        } else if (dir === 'down' || dir === 'enter') {
          setContentIndex(0);
        }
        return;
      }

      if (settingsPage === 0) {
        // Page 0: Design & Display (14 items: 0..2 Theme, 3..5 Map, 6..9 HQ, 10..12 Scale, 13 Standby)
        if (dir === 'left') {
          if (contentIndex === 0 || contentIndex === 6 || contentIndex === 13) {
            setFocusZone('sidebar');
            setSidebarIndex(1);
          } else {
            setContentIndex(prev => prev - 1);
          }
        } else if (dir === 'right') {
          if (contentIndex === 5 || contentIndex === 12 || contentIndex === 13) {
            // End of row
          } else {
            setContentIndex(prev => prev + 1);
          }
        } else if (dir === 'down') {
          if (contentIndex === 0) setContentIndex(6);
          else if (contentIndex === 1) setContentIndex(7);
          else if (contentIndex === 2) setContentIndex(8);
          else if (contentIndex === 3) setContentIndex(10);
          else if (contentIndex === 4) setContentIndex(11);
          else if (contentIndex === 5) setContentIndex(12);
          else if (contentIndex >= 6 && contentIndex <= 12) setContentIndex(13);
        } else if (dir === 'up') {
          if (contentIndex <= 5) {
            setContentIndex(-1); // Enter Header Tabs
          } else if (contentIndex === 6) setContentIndex(0);
          else if (contentIndex === 7) setContentIndex(1);
          else if (contentIndex === 8 || contentIndex === 9) setContentIndex(2);
          else if (contentIndex === 10) setContentIndex(3);
          else if (contentIndex === 11) setContentIndex(4);
          else if (contentIndex === 12) setContentIndex(5);
          else if (contentIndex === 13) setContentIndex(6);
        } else if (dir === 'enter') {
          if (contentIndex < 3) {
            updateSetting('carPlayTheme', ['dark', 'light', 'auto'][contentIndex] as any);
          } else if (contentIndex < 6) {
            updateSetting('carPlayMapTheme', ['dark', 'light', 'auto'][contentIndex - 3] as any);
          } else if (contentIndex < 10) {
            updateSetting('carPlayHqOverlay', ['truckline', 'truckersmp', 'all', 'none'][contentIndex - 6] as any);
          } else if (contentIndex < 13) {
            updateSetting('carPlayTextScale', ['small', 'medium', 'large'][contentIndex - 10] as any);
          } else if (contentIndex === 13) {
            updateSetting('carPlayIgnitionSleep', !settings.carPlayIgnitionSleep);
          }
        }
      } else if (settingsPage === 1) {
        // Page 1: Fahrt-Warnungen (5 items: 2 columns: left 0, 2, 4; right 1, 3)
        const keys = [
          'carPlayShowNavInstructions',
          'carPlayNotifySpeed',
          'carPlayNotifyFuel',
          'carPlayNotifyRest',
          'carPlayNotifyDamage'
        ];
        if (dir === 'left') {
          if (contentIndex % 2 === 0) {
            setFocusZone('sidebar');
            setSidebarIndex(1);
          } else {
            setContentIndex(prev => prev - 1);
          }
        } else if (dir === 'right') {
          if (contentIndex % 2 === 0 && contentIndex + 1 < 5) {
            setContentIndex(prev => prev + 1);
          }
        } else if (dir === 'down') {
          if (contentIndex + 2 < 5) setContentIndex(prev => prev + 2);
          else if (contentIndex === 2 || contentIndex === 3) setContentIndex(4);
        } else if (dir === 'up') {
          if (contentIndex <= 1) {
            setContentIndex(-1); // Enter Header Tabs
          } else {
            setContentIndex(prev => prev - 2);
          }
        } else if (dir === 'enter') {
          const k = keys[contentIndex];
          const curr = settings[k as keyof OverlaySettings] !== false;
          updateSetting(k as any, !curr);
        }
      } else if (settingsPage === 2) {
        // Page 2: Meldungen & System (5 notification toggles in vertical list)
        const keys = [
          'carPlayNotifyCargo',
          'carPlayNotifyMusic',
          'carPlayNotifyChat',
          'carPlayNotifyNews',
          'carPlayNotifyEvent'
        ];
        if (dir === 'left') {
          setFocusZone('sidebar');
          setSidebarIndex(1);
        } else if (dir === 'down') {
          setContentIndex(prev => Math.min(4, prev + 1));
        } else if (dir === 'up') {
          if (contentIndex === 0) {
            setContentIndex(-1); // Enter Header Tabs
          } else {
            setContentIndex(prev => prev - 1);
          }
        } else if (dir === 'enter') {
          const k = keys[contentIndex];
          const curr = settings[k as keyof OverlaySettings] !== false;
          updateSetting(k as any, !curr);
        }
      }
    } else if (activeTab === 'apps') {
      // 9 Apps arranged dynamically based on screen ratio/cols
      const appLaunchers: (() => void)[] = [
        () => openApp('map'),
        () => openApp('music', 'windows'),
        () => openApp('music', 'radio'),
        () => openApp('music', 'local'),
        () => openApp('job'),
        () => openApp('truck'),
        () => openApp('control'),
        () => openApp('chat'),
        () => openApp('events'),
        () => openApp('settings'),
      ];
      const totalApps = appLaunchers.length; // 10
      const cols = appGridColsRef.current || appGridCols || 5;
      const currentCol = contentIndex % cols;
      const currentRow = Math.floor(contentIndex / cols);
      const totalRows = Math.ceil(totalApps / cols);

      if (dir === 'left') {
        if (currentCol === 0) {
          if (taskbarPosition === 'side') {
            setFocusZone('sidebar');
            setSidebarIndex(0);
          }
        } else {
          setContentIndex(prev => Math.max(0, prev - 1));
        }
      } else if (dir === 'right') {
        if (currentCol < cols - 1 && contentIndex + 1 < totalApps) {
          setContentIndex(prev => prev + 1);
        }
      } else if (dir === 'down') {
        const nextRowIndex = contentIndex + cols;
        if (nextRowIndex < totalApps) {
          setContentIndex(nextRowIndex);
        } else if (currentRow < totalRows - 1) {
          // Falls in der Ziel-Zeile kein App-Slot darunter liegt (z. B. Spalte 4 bei 5 Spalten):
          // Springe auf die letzte App der unteren Zeile (Index 8)
          setContentIndex(totalApps - 1);
        } else if (taskbarPosition === 'bottom') {
          // Unten angekommen und Taskbar liegt unten: Fokus in die Taskbar übergeben
          setFocusZone('sidebar');
          setSidebarIndex(0);
        }
      } else if (dir === 'up') {
        const prevRowIndex = contentIndex - cols;
        if (prevRowIndex >= 0) {
          setContentIndex(prevRowIndex);
        }
      } else if (dir === 'enter') {
        const launch = appLaunchers[contentIndex];
        if (launch) launch();
      }
    } else if (activeTab === 'chat') {
      if (showChatTemplates) {
        const totalTemplates = CHAT_QUICK_TEMPLATES.length;
        const cols = 2;
        if (dir === 'left') {
          if (templateNavIndex % cols === 1) {
            setTemplateNavIndex((prev) => prev - 1);
          } else {
            setShowChatTemplates(false);
          }
        } else if (dir === 'right') {
          if (templateNavIndex % cols === 0 && templateNavIndex + 1 < totalTemplates) {
            setTemplateNavIndex((prev) => prev + 1);
          }
        } else if (dir === 'up') {
          if (templateNavIndex >= cols) {
            setTemplateNavIndex((prev) => prev - cols);
          }
        } else if (dir === 'down') {
          if (templateNavIndex + cols < totalTemplates) {
            setTemplateNavIndex((prev) => prev + cols);
          }
        } else if (dir === 'enter') {
          const tpl = CHAT_QUICK_TEMPLATES[templateNavIndex];
          if (tpl) {
            handleSendChatMessage(tpl.text);
            setShowChatTemplates(false);
          }
        } else if (dir === 'back') {
          setShowChatTemplates(false);
        }
        return;
      }

      const numChannels = chatChannels.length;
      const tplBtnIdx = numChannels;
      const inputIdx = numChannels + 1;
      const sendIdx = numChannels + 2;
      const refreshIdx = numChannels + 3;

      if (dir === 'left') {
        if (contentIndex < numChannels || numChannels === 0) {
          setFocusZone('sidebar');
          setSidebarIndex(0);
        } else if (contentIndex === tplBtnIdx) {
          setContentIndex(Math.max(0, Math.min(activeChatChannel ? chatChannels.findIndex(c => c.id === activeChatChannel.id) : 0, numChannels - 1)));
        } else if (contentIndex === inputIdx) {
          setContentIndex(tplBtnIdx);
        } else if (contentIndex === sendIdx) {
          setContentIndex(inputIdx);
        } else if (contentIndex === refreshIdx) {
          setContentIndex(Math.max(0, Math.min(activeChatChannel ? chatChannels.findIndex(c => c.id === activeChatChannel.id) : 0, numChannels - 1)));
        }
      } else if (dir === 'right') {
        if (contentIndex < numChannels || numChannels === 0) {
          setContentIndex(tplBtnIdx);
        } else if (contentIndex === tplBtnIdx) {
          setContentIndex(inputIdx);
        } else if (contentIndex === inputIdx) {
          setContentIndex(sendIdx);
        }
      } else if (dir === 'up') {
        if (contentIndex < numChannels) {
          setContentIndex(prev => Math.max(0, prev - 1));
        } else if (contentIndex === refreshIdx) {
          // at top
        } else {
          setContentIndex(refreshIdx);
        }
      } else if (dir === 'down') {
        if (contentIndex < numChannels) {
          setContentIndex(prev => Math.min(Math.max(0, numChannels - 1), prev + 1));
        } else if (contentIndex === refreshIdx) {
          setContentIndex(tplBtnIdx);
        }
      } else if (dir === 'enter') {
        if (numChannels === 0) {
          loadChatChannels();
        } else if (contentIndex < numChannels) {
          const selectedCh = chatChannels[contentIndex];
          if (selectedCh) {
            setActiveChatChannel(selectedCh);
            loadChatMessages(selectedCh.id);
          }
        } else if (contentIndex === tplBtnIdx) {
          setShowChatTemplates((prev) => !prev);
          setTemplateNavIndex(0);
        } else if (contentIndex === inputIdx) {
          openVirtualKeyboard('chat');
        } else if (contentIndex === sendIdx) {
          handleSendChatMessage();
        } else if (contentIndex === refreshIdx) {
          loadChatChannels();
          if (activeChatChannel) loadChatMessages(activeChatChannel.id);
        }
      } else if (dir === 'back') {
        setFocusZone('sidebar');
        setSidebarIndex(0);
      }
    } else if (activeTab === 'events') {
      const numEvents = carPlayEvents.length;
      const navBtnIdx = numEvents;
      const refreshIdx = numEvents + 1;

      if (dir === 'left') {
        if (contentIndex < numEvents || numEvents === 0) {
          setFocusZone('sidebar');
          setSidebarIndex(0);
        } else {
          setContentIndex(Math.max(0, Math.min(selectedCarPlayEvent ? carPlayEvents.findIndex(e => e.id === selectedCarPlayEvent.id) : 0, numEvents - 1)));
        }
      } else if (dir === 'right') {
        if (contentIndex < numEvents || numEvents === 0) {
          if (selectedCarPlayEvent) {
            setContentIndex(navBtnIdx);
          } else {
            setContentIndex(refreshIdx);
          }
        }
      } else if (dir === 'up') {
        if (contentIndex < numEvents) {
          const nextIdx = Math.max(0, contentIndex - 1);
          setContentIndex(nextIdx);
          if (carPlayEvents[nextIdx]) {
            setSelectedCarPlayEvent(carPlayEvents[nextIdx]);
          }
        } else if (contentIndex === navBtnIdx) {
          setContentIndex(refreshIdx);
        }
      } else if (dir === 'down') {
        if (contentIndex < numEvents) {
          const nextIdx = Math.min(Math.max(0, numEvents - 1), contentIndex + 1);
          setContentIndex(nextIdx);
          if (carPlayEvents[nextIdx]) {
            setSelectedCarPlayEvent(carPlayEvents[nextIdx]);
          }
        } else if (contentIndex === refreshIdx && selectedCarPlayEvent) {
          setContentIndex(navBtnIdx);
        }
      } else if (dir === 'enter') {
        if (numEvents === 0) {
          loadCarPlayEvents();
        } else if (contentIndex < numEvents) {
          const evt = carPlayEvents[contentIndex];
          if (evt) {
            if (selectedCarPlayEvent?.id === evt.id) {
              handleLoadCarPlayEventToNavi(evt);
            } else {
              setSelectedCarPlayEvent(evt);
            }
          }
        } else if (contentIndex === navBtnIdx) {
          if (selectedCarPlayEvent) {
            handleLoadCarPlayEventToNavi(selectedCarPlayEvent);
          }
        } else if (contentIndex === refreshIdx) {
          loadCarPlayEvents();
        }
      } else if (dir === 'back') {
        setFocusZone('sidebar');
        setSidebarIndex(0);
      }
    } else if (activeTab === 'job') {
      if (dir === 'left' || dir === 'back') {
        setFocusZone('sidebar');
        setSidebarIndex(0);
      }
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
        if (showChatTemplates) {
          setShowChatTemplates(false);
          e.preventDefault();
          return;
        }
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

      // Direct CarPlay Audio & Radio Hotkeys
      if (!isInput) {
        // Ctrl + In-Game ETS2 Radio Hotkeys (Sender vor/zurück, Lautstärke +/-)
        if (e.ctrlKey) {
          if (e.code === 'PageDown' || e.key === 'PageDown' || e.code === 'BracketLeft' || e.key === '[' || e.key === 'ü' || e.key === 'Ü') {
            e.preventDefault();
            playNextRadioStation();
            return;
          }
          if (e.code === 'PageUp' || e.key === 'PageUp' || e.code === 'Quote' || e.key === "'" || e.key === 'ä' || e.key === 'Ä') {
            e.preventDefault();
            playPrevRadioStation();
            return;
          }
          if (e.code === 'BracketRight' || e.key === ']' || e.key === '+' || e.code === 'NumpadAdd' || e.key === '*' || e.key === '=') {
            e.preventDefault();
            adjustRadioVolume(0.05);
            return;
          }
          if (e.code === 'Backslash' || e.key === '\\' || e.key === '#' || e.code === 'NumpadSubtract' || e.key === '-') {
            e.preventDefault();
            adjustRadioVolume(-0.05);
            return;
          }
        }

        if (activeTab === 'control') {
          if (e.key === 'Tab') {
            handleNavRef.current(e.shiftKey ? 'prev-tab' : 'next-tab');
            e.preventDefault();
            return;
          }
        }

        if (e.key === 'PageUp' || e.key === ']' || e.key === 'AudioVolumeUp') {
          handleNavRef.current('volume-up');
          e.preventDefault();
          return;
        }
        if (e.key === 'PageDown' || e.key === '[' || e.key === 'AudioVolumeDown') {
          handleNavRef.current('volume-down');
          e.preventDefault();
          return;
        }
        if (e.key === 'm' || e.key === 'M' || e.key === 'AudioVolumeMute') {
          handleNavRef.current('volume-mute');
          e.preventDefault();
          return;
        }
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

  // Digital clock update - live minute updates without redundant per-second root component re-renders
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const nextTime = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      setTimeString(prev => prev === nextTime ? prev : nextTime);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

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

    // --- Web / Browser Mode Fallback (Tablet, Smartphone, Browser Window) ---
    if (!ipcRenderer) {
      const getCarPlayApiBase = (): string => {
        const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
        const hostname = window.location.hostname || 'localhost';
        const port = window.location.port;
        if (port === '5173') {
          return `${protocol}//${hostname}:8383`;
        }
        return `${protocol}//${hostname}${port ? `:${port}` : ':8383'}`;
      };

      const sseUrl = `${getCarPlayApiBase()}/api/carplay/stream`;
      let eventSource: EventSource | null = null;
      let telemetryRaf: number | null = null;

      try {
        eventSource = new EventSource(sseUrl);

        eventSource.addEventListener('init', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            if (data.settings) setSettings(data.settings);
            if (data.telemetry) {
              if (data.telemetry.routeWaypoints) {
                cachedRouteWaypointsRef.current = data.telemetry.routeWaypoints;
              }
              setTelemetry(data.telemetry);
            }
            if (data.media?.title) setMedia(data.media);
            if (data.appearance && typeof data.appearance === 'object') {
              setBgSyncTick(t => t + 1);
            }
          } catch (err) { }
        });

        let sseLastRenderTimestamp = 0;
        eventSource.addEventListener('telemetry-update', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            if (data) {
              if (data.routeWaypoints !== undefined) {
                cachedRouteWaypointsRef.current = data.routeWaypoints;
              } else if (cachedRouteWaypointsRef.current) {
                data.routeWaypoints = cachedRouteWaypointsRef.current;
              }
            }
            pendingTelemetry.current = data;

            // Smart Tab Throttling for SSE: When in app drawer, settings or background tabs, avoid high-frequency 60 FPS re-renders
            const currentTab = activeTabRef.current;
            const isDrivingView = currentTab === 'home' || currentTab === 'truck' || currentTab === 'map';
            const isSleeping = isCarPlaySleepingRef.current;
            const now = performance.now();
            const throttleMs = currentTab === 'apps' ? 500 : (isSleeping ? 1000 : 250);

            if (!isDrivingView && (now - sseLastRenderTimestamp < throttleMs)) {
              return;
            }

            if (!telemetryRaf) {
              telemetryRaf = requestAnimationFrame(() => {
                if (pendingTelemetry.current) {
                  sseLastRenderTimestamp = performance.now();
                  if (pendingTelemetry.current.connected) {
                    setTelemetry(pendingTelemetry.current);
                  } else {
                    setTelemetry(prev => ({ ...prev, connected: false }));
                  }
                  pendingTelemetry.current = null;
                }
                telemetryRaf = null;
              });
            }
          } catch (err) { }
        });

        eventSource.addEventListener('overlay-settings-updated', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            if (data) setSettings(data);
          } catch (err) { }
        });

        eventSource.addEventListener('app-appearance-updated', () => {
          setBgSyncTick(t => t + 1);
        });

        eventSource.addEventListener('smtc-update', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            setMedia(data?.title ? data : null);
          } catch (err) { }
        });

        eventSource.addEventListener('carplay-action', (e: MessageEvent) => {
          try {
            const action = JSON.parse(e.data);
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
          } catch (err) { }
        });
      } catch (err) {
        console.warn('CarPlay EventSource connection failed:', err);
      }

      return () => {
        if (eventSource) eventSource.close();
        if (telemetryRaf) cancelAnimationFrame(telemetryRaf);
      };
    }

    // Get initial state
    ipcRenderer.invoke('overlay-get-state').then((state: any) => {
      if (state) {
        if (state.settings) setSettings(state.settings);
        if (state.telemetry && state.telemetry.connected) {
          if (state.telemetry.routeWaypoints) {
            cachedRouteWaypointsRef.current = state.telemetry.routeWaypoints;
          }
          setTelemetry(state.telemetry);
        }
      }
    }).catch(() => {});

    ipcRenderer.invoke('get-smtc-media').then((d: SmtcData | null) => {
      if (d?.title) setMedia(d);
    }).catch(() => {});

    // Listen to updates with V-Sync aligned requestAnimationFrame & intelligent throttling
    let telemetryRaf: number | null = null;
    let lastRenderTimestamp = 0;
    let lastTelemetrySpeed = 0;
    let lastTelemetryRpm = 0;
    let lastTelemetryGear = 0;

    const telemetryListener = (_: any, data: Telemetry) => {
      if (data) {
        if (data.routeWaypoints !== undefined) {
          cachedRouteWaypointsRef.current = data.routeWaypoints;
        } else if (cachedRouteWaypointsRef.current) {
          data.routeWaypoints = cachedRouteWaypointsRef.current;
        }
      }
      pendingTelemetry.current = data;

      // Smart Tab Throttling: When on non-driving views (chat, settings, events, music) or in sleep mode,
      // throttle React component re-renders to 4 Hz (250ms) to save up to 85% CPU / GC cycles.
      const currentTab = activeTabRef.current;
      const isDrivingView = currentTab === 'home' || currentTab === 'truck' || currentTab === 'map';
      const isSleeping = isCarPlaySleepingRef.current;
      const now = performance.now();
      const throttleMs = currentTab === 'apps' ? 500 : (isSleeping ? 1000 : 250);

      if ((!isDrivingView || isSleeping) && (now - lastRenderTimestamp < throttleMs)) {
        return; // Throttled cleanly in non-driving tabs
      }

      // Zero-Cost Stationary Check: When truck is stopped and engine is idle, skip redundant 60 FPS re-renders
      if (data && isDrivingView && !isSleeping && data.speed === 0 && lastTelemetrySpeed === 0 && Math.abs(data.rpm - lastTelemetryRpm) < 25 && data.gear === lastTelemetryGear) {
        if (now - lastRenderTimestamp < 250) {
          return; // Skip redundant stationary frame
        }
      }

      if (!telemetryRaf) {
        telemetryRaf = requestAnimationFrame(() => {
          if (pendingTelemetry.current) {
            lastRenderTimestamp = performance.now();
            const cur = pendingTelemetry.current;
            lastTelemetrySpeed = cur.speed || 0;
            lastTelemetryRpm = cur.rpm || 0;
            lastTelemetryGear = cur.gear || 0;

            if (cur.connected) {
              setTelemetry(cur);
            } else {
              setTelemetry(prev => ({ ...prev, connected: false }));
            }
            pendingTelemetry.current = null;
          }
          telemetryRaf = null;
        });
      }
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
        if (searchQuery.trim().length > 0 && (activeTab === 'map' || maximizedWidget === 'map')) {
          handleNavRef.current('next');
          return;
        }
        if (activeTab === 'control') {
          handleNavRef.current('next-tab');
          return;
        }
        if (activeTab === 'music' && musicSubTab === 'radio') {
          playNextRadioStation();
          return;
        }
        if (activeTab === 'music' && musicSubTab === 'local') {
          playLocalTrack((currentLocalIndex + 1) % Math.max(1, localTracks.length));
          return;
        }
        setActiveTab(prev => {
          const idx = TABS.indexOf(prev);
          const nextTab = TABS[(idx + 1) % TABS.length];
          const tabList: Tab[] = ['home', 'music', 'job', 'truck', 'settings'];
          setSidebarIndex(tabList.indexOf(nextTab));
          return nextTab;
        });
      } else if (action === 'prev') {
        if (searchQuery.trim().length > 0 && (activeTab === 'map' || maximizedWidget === 'map')) {
          handleNavRef.current('prev');
          return;
        }
        if (activeTab === 'control') {
          handleNavRef.current('prev-tab');
          return;
        }
        if (activeTab === 'music' && musicSubTab === 'radio') {
          playPrevRadioStation();
          return;
        }
        if (activeTab === 'music' && musicSubTab === 'local') {
          playLocalTrack((currentLocalIndex - 1 + localTracks.length) % Math.max(1, localTracks.length));
          return;
        }
        setActiveTab(prev => {
          const idx = TABS.indexOf(prev);
          const prevTab = TABS[(idx - 1 + TABS.length) % TABS.length];
          const tabList: Tab[] = ['home', 'music', 'job', 'truck', 'settings'];
          setSidebarIndex(tabList.indexOf(prevTab));
          return prevTab;
        });
      } else if (action === 'toggle-blackout') {
        handleToggleBlackout();
      } else if (['up', 'down', 'left', 'right', 'enter', 'back', 'volume-up', 'volume-down', 'volume-mute', 'radio-next', 'radio-prev'].includes(action)) {
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
        color = 'bg-[#18181b]/95 border-sky-500/40 backdrop-blur-md shadow-sky-950/40';
        icon = <MessageSquare size={22} className="text-sky-400" />;
        shouldShow = settings.carPlayNotifyChat !== false;
      } else if (event.type === 'system') {
        type = 'system';
        title = event.title || 'System-Info';
        message = event.content || '';
        color = 'bg-[#18181b]/95 border-amber-500/40 backdrop-blur-md shadow-[0_0_15px_var(--primary-glow-subtle)]';
        icon = <Info size={22} className="text-amber-400" />;
      } else if (event.type === 'news') {
        type = 'news';
        title = event.title || 'News-Update';
        message = event.content || '';
        color = 'bg-[#18181b]/95 border-teal-500/40 backdrop-blur-md shadow-teal-950/40';
        icon = <Newspaper size={22} className="text-teal-400" />;
        shouldShow = settings.carPlayNotifyNews !== false;
      } else if (event.type === 'event') {
        type = 'event';
        title = event.title || 'Event-Ankündigung';
        message = event.content || '';
        color = 'bg-[#18181b]/95 border-purple-500/40 backdrop-blur-md shadow-purple-950/40';
        icon = <Calendar size={22} className="text-purple-400" />;
        shouldShow = settings.carPlayNotifyEvent !== false;
      } else if (event.type === 'delivered' || event.type === 'cancelled') {
        cachedRouteWaypointsRef.current = null;
        mapWidgetRef.current?.clearRoute();
        maxMapWidgetRef.current?.clearRoute();
        setCustomDest(null);
        setCustomRouteInfo(null);
        setPendingDest(null);
        return;
      } else if (event.type === 'start' || event.type === 'resumed') {
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

    // Global direct keyboard event listener for responsive in-car hotkeys
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const tag = activeEl?.tagName?.toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea';

      if (e.key === 'Escape') {
        e.preventDefault();
        handleNavRef.current('back');
        return;
      }

      if (isInput && e.key !== 'Enter' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') {
        return;
      }

      // Ctrl + In-Game ETS2 Radio Hotkeys (Sender vor/zurück, Lautstärke +/-)
      if (e.ctrlKey && !isInput) {
        if (e.code === 'PageDown' || e.key === 'PageDown' || e.code === 'BracketLeft' || e.key === '[' || e.key === 'ü' || e.key === 'Ü') {
          e.preventDefault();
          handleNavRef.current('radio-next');
          return;
        }
        if (e.code === 'PageUp' || e.key === 'PageUp' || e.code === 'Quote' || e.key === "'" || e.key === 'ä' || e.key === 'Ä') {
          e.preventDefault();
          handleNavRef.current('radio-prev');
          return;
        }
        if (e.code === 'BracketRight' || e.key === ']' || e.key === '+' || e.code === 'NumpadAdd' || e.key === '*' || e.key === '=') {
          e.preventDefault();
          handleNavRef.current('volume-up');
          return;
        }
        if (e.code === 'Backslash' || e.key === '\\' || e.key === '#' || e.code === 'NumpadSubtract' || e.key === '-') {
          e.preventDefault();
          handleNavRef.current('volume-down');
          return;
        }
      }

      if (e.key === 'ArrowUp' || e.key === 'Up') {
        e.preventDefault();
        handleNavRef.current('up');
      } else if (e.key === 'ArrowDown' || e.key === 'Down') {
        e.preventDefault();
        handleNavRef.current('down');
      } else if (e.key === 'ArrowLeft' || e.key === 'Left') {
        e.preventDefault();
        handleNavRef.current('left');
      } else if (e.key === 'ArrowRight' || e.key === 'Right') {
        e.preventDefault();
        handleNavRef.current('right');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleNavRef.current('enter');
      } else if (e.key === 'Backspace' && !isInput) {
        e.preventDefault();
        handleNavRef.current('back');
      } else if (e.key === 'PageUp' || e.key === ']' || e.key === 'AudioVolumeUp') {
        e.preventDefault();
        handleNavRef.current('volume-up');
      } else if (e.key === 'PageDown' || e.key === '[' || e.key === 'AudioVolumeDown') {
        e.preventDefault();
        handleNavRef.current('volume-down');
      } else if ((e.key === 'm' || e.key === 'M' || e.key === 'AudioVolumeMute') && !isInput) {
        e.preventDefault();
        handleNavRef.current('volume-mute');
      } else if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') {
        handleNavRef.current('zoom-in');
      } else if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract') {
        handleNavRef.current('zoom-out');
      } else if ((e.key === 'c' || e.key === 'C' || e.key === 'r' || e.key === 'R') && !isInput) {
        handleNavRef.current('recenter');
      } else if ((e.key === 'f' || e.key === 'F') && !isInput) {
        handleNavRef.current('fit-route');
      } else if ((e.key === 'x' || e.key === 'X') && !isInput) {
        handleNavRef.current('cancel-route');
      } else if ((e.key === 's' || e.key === 'S') && !isInput) {
        if (maximizedWidget === 'map') {
          setMaxMapFocus('search');
          searchInputRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (telemetryRaf) cancelAnimationFrame(telemetryRaf);
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
  const isOverspeed = Boolean(data.speedLimit && data.speedLimit > 0 && speed > data.speedLimit + 2);

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
            color: 'bg-[#18181b]/95 border-rose-500/40 backdrop-blur-md shadow-rose-950/40'
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
            color: 'bg-[#18181b]/95 border-amber-500/40 backdrop-blur-md shadow-[0_0_15px_var(--primary-glow-subtle)]'
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
            color: 'bg-[#18181b]/95 border-yellow-500/40 backdrop-blur-md shadow-yellow-950/40'
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
          color: 'bg-[#18181b]/95 border-rose-500/40 backdrop-blur-md shadow-rose-950/40'
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
          color: 'bg-[#18181b]/95 border-emerald-500/40 backdrop-blur-md shadow-emerald-950/40'
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
          color: 'bg-[#18181b]/95 border-zinc-700/50 backdrop-blur-md shadow-black/60'
        });
      }
      prevSongTitle.current = media.title;
    } else if (!media) {
      prevSongTitle.current = '';
    }
  }, [media?.title, settings.carPlayNotifyMusic]);

  const sendMediaAction = (action: 'play-pause' | 'next' | 'prev') => {
    try {
      if ((window as any).require) {
        const { ipcRenderer } = (window as any).require('electron');
        if (ipcRenderer) {
          ipcRenderer.send('carplay-media-control', action);
          return;
        }
      }
    } catch (e) {}

    // Fallback for Web/Browser mode
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const hostname = window.location.hostname || 'localhost';
    const port = window.location.port === '5173' ? '8383' : (window.location.port || '8383');
    fetch(`${protocol}//${hostname}:${port}/api/carplay/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    }).catch(() => {});
  };

  // Format functions
  const formatDistance = (dist: number | null | undefined, isKm = false) => {
    if (!dist || isNaN(dist) || dist <= 0) return '0 km';
    if (dist < 1000 && !isKm) return `${Math.round(dist)} m`;
    const kmVal = isKm ? dist : dist / 1000;
    if (kmVal < 10) {
      return `${kmVal.toFixed(1).replace('.', ',')} km`;
    }
    return `${Math.round(kmVal).toLocaleString('de-DE')} km`;
  };

  const formatRemainingTime = (seconds: number | null | undefined) => {
    if (!seconds || isNaN(seconds) || seconds <= 0) return '0 Min.';
    const totalM = Math.max(1, Math.round(seconds / 60));
    const h = Math.floor(totalM / 60);
    const m = totalM % 60;
    if (h > 0) {
      return m > 0 ? `${h} Std. ${m} Min.` : `${h} Std.`;
    }
    return `${m} Min.`;
  };

  const formatETA = (seconds: number | null | undefined) => {
    if (!seconds || isNaN(seconds) || seconds <= 0) return '--:--';
    const etaDate = new Date(Date.now() + seconds * 1000);
    return etaDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
  };

  const getRemainingSeconds = () => {
    if (liveRemainingSeconds !== null && liveRemainingSeconds > 0) {
      return liveRemainingSeconds;
    }
    return calculateRemainingSeconds();
  };

  const renderBottomNavHud = (isHome = false, focused = false) => {
    const remainingSec = getRemainingSeconds();
    const remainingDist = (customDest && customRouteInfo?.distanceMeters)
      ? (() => {
          const destCoords = customDest.destCompany
            ? (findCompany(customDest.destCompany, customDest.dest) || findCity(customDest.dest))
            : findCity(customDest.dest);
          const pX = (telemetry as any)?.posX;
          const pZ = (telemetry as any)?.posZ;
          if (destCoords && pX != null && pZ != null) {
            const d = Math.hypot(destCoords.x - pX, destCoords.z - pZ) * 1.25;
            return Math.min(customRouteInfo.distanceMeters, d);
          }
          return customRouteInfo.distanceMeters;
        })()
      : (data.navDistance && data.navDistance > 0 ? data.navDistance : null);

    const hasInGameRoute = Boolean(
      telemetry.connected && (
        (data.navDistance && data.navDistance > 0) ||
        (data.navTime && data.navTime > 0) ||
        ((telemetry as any).routeWaypoints && (telemetry as any).routeWaypoints.length > 0) ||
        (data.dest && data.dest.trim().length > 0 && data.dest.toLowerCase() !== 'none')
      )
    );

    const hasNav = Boolean(pendingDest || customDest || activeEventRoute || hasInGameRoute);
    if (!hasNav) return null;

    const isDark = activeMapTheme === 'dark';
    const bgStyle = isDark ? '#27272a' : '#ffffff';
    const borderStyle = isDark ? '1px solid #3f3f46' : '1px solid #e4e4e7';
    const textColor = isDark ? '#fafafa' : '#18181b';
    const subtextColor = isDark ? '#a1a1aa' : '#71717a';
    const dividerColor = isDark ? '#52525b' : '#d4d4d8';

    // Case 1: Pending destination confirmation
    if (pendingDest && !customDest) {
      return (
        <motion.div
          key={isHome ? "home-pending-nav" : "bottom-pending-nav"}
          initial={{ opacity: 0, y: 10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.96 }}
          transition={{ type: 'spring', duration: 0.25, bounce: 0.1 }}
          onClick={(e) => e.stopPropagation()}
          className={`absolute ${isHome ? 'bottom-2.5 left-2.5 max-w-[95%] p-2 gap-2 rounded-xl text-xs' : 'bottom-3 left-3 p-3 gap-3 rounded-2xl text-sm'} flex items-center z-40 shadow-xl backdrop-blur-md transition-all ${
            focused || (!isHome && (maxMapFocus === 'bottom-nav' || mapTabFocus === 'bottom-nav')) ? 'ring-4 ring-amber-500 scale-[1.02] shadow-[0_0_25px_var(--primary-glow)]' : ''
          }`}
          style={{ background: bgStyle, border: borderStyle }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <CompanyIcon
              companyName={pendingDest.destCompany}
              title={pendingDest.title}
              type={pendingDest.destCompany ? 'company' : 'city'}
              size={isHome ? 'md' : 'lg'}
              activeMapTheme={activeMapTheme}
            />
            <div className="min-w-0">
              <div className={`font-bold truncate ${textColor}`}>{pendingDest.title}</div>
              <div className={`truncate text-[10px] md:text-xs ${subtextColor}`}>
                {pendingDest.destCompany ? `Firma in ${pendingDest.dest}` : pendingDest.dest}
              </div>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              startPendingRoute();
            }}
            className={`shrink-0 bg-blue-600 hover:bg-blue-500 text-white font-bold ${isHome ? 'px-2.5 py-1 text-xs rounded-lg' : 'px-4 py-2 text-sm rounded-xl'} shadow-md transition-all cursor-pointer ${
              focused || (!isHome && (maxMapFocus === 'bottom-nav' || mapTabFocus === 'bottom-nav')) ? 'ring-2 ring-white scale-105 shadow-[0_0_15px_rgba(59,130,246,0.8)]' : ''
            }`}
          >
            Route starten
          </button>
        </motion.div>
      );
    }

    // Case 2: Active Navigation (Custom Route or In-Game Route)
    const timeStr = remainingSec ? formatRemainingTime(remainingSec) : '--';
    const distStr = remainingDist ? formatDistance(remainingDist) : '--';
    const etaStr = remainingSec ? formatETA(remainingSec) : '--:--';

    return (
      <motion.div
        key={isHome ? "home-bottom-nav" : "bottom-nav"}
        initial={{ opacity: 0, y: 10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.96 }}
        transition={{ type: 'spring', duration: 0.25, bounce: 0.1 }}
        onClick={(e) => e.stopPropagation()}
        className={`absolute ${isHome ? 'bottom-2.5 left-2.5 px-3 py-2 gap-2.5 rounded-xl' : 'bottom-3 left-3 px-4 py-3 gap-3 rounded-2xl'} flex items-center z-40 shadow-xl backdrop-blur-md transition-all select-none ${
          !isHome && maxMapFocus === 'bottom-nav' ? 'ring-4 ring-amber-500 scale-[1.02] shadow-[0_0_25px_var(--primary-glow)]' : ''
        }`}
        style={{ background: bgStyle, border: borderStyle }}
      >
        {customDest || activeEventRoute ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              mapWidgetRef.current?.clearRoute();
              maxMapWidgetRef.current?.clearRoute();
              if (activeEventRoute) {
                clearActiveEventRoute();
                setActiveEventRouteState(null);
                showNotification({
                  title: 'Event-Route beendet',
                  message: 'Die Route wurde aus dem Navi entfernt.',
                  icon: <X size={18} />,
                  color: '#ef4444',
                });
              }
              setCustomDest(null);
              setCustomRouteInfo(null);
              setPendingDest(null);
            }}
            className={`${isHome ? 'w-7 h-7' : 'w-9 h-9'} rounded-full flex items-center justify-center transition-all shrink-0 hover:scale-110 active:scale-95 cursor-pointer ${
              focused || (!isHome && maxMapFocus === 'bottom-nav') ? 'ring-2 ring-rose-400 scale-110' : ''
            }`}
            style={{
              background: isDark ? '#3f3f46' : '#f4f4f5',
              color: isDark ? '#e4e4e7' : '#18181b',
            }}
            title={activeEventRoute ? "Event-Route beenden" : "Navigation abbrechen"}
          >
            <svg width={isHome ? 14 : 18} height={isHome ? 14 : 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        ) : (
          <div
            className={`${isHome ? 'w-7 h-7' : 'w-8 h-8'} rounded-full bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.3)]`}
            title={data.dest ? `Ziel: ${data.dest}` : 'Navigation aktiv'}
          >
            <Navigation size={isHome ? 14 : 16} className="rotate-45" />
          </div>
        )}

        <div className="w-px h-4 md:h-5" style={{ background: dividerColor }} />

        {/* Remaining Time & Distance */}
        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Time remaining */}
          <span className={`${isHome ? 'text-xs md:text-sm' : 'text-sm md:text-base'} font-black font-mono tracking-tight text-emerald-400`}>
            {timeStr}
          </span>
          <span className="text-xs font-bold" style={{ color: subtextColor }}>·</span>
          {/* Distance remaining */}
          <span className={`${isHome ? 'text-xs md:text-sm' : 'text-sm md:text-base'} font-black font-mono tracking-tight`} style={{ color: textColor }}>
            {distStr}
          </span>
        </div>

        <div className="w-px h-4 md:h-5" style={{ background: dividerColor }} />

        {/* Arrival Time (ETA) */}
        <div className="flex items-center gap-1">
          <span className={`${isHome ? 'text-[10px]' : 'text-xs'} font-semibold font-mono uppercase tracking-wider`} style={{ color: subtextColor }}>
            Ankunft
          </span>
          <span className={`${isHome ? 'text-xs md:text-sm' : 'text-sm md:text-base'} font-black font-mono tracking-tight`} style={{ color: textColor }}>
            {etaStr}
          </span>
        </div>
      </motion.div>
    );
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

  // Unified Active Cover Art (Handles SMTC Windows Media/Spotify base64, ETS2 Live Radio covers & station logos, and Local Music covers)
  const albumArtSrc = useMemo(() => {
    if (lastAudioSource === 'local' || isLocalPlaying) {
      return localTracks[currentLocalIndex]?.coverUrl || null;
    }
    if ((lastAudioSource === 'radio' || isRadioPlaying) && activeRadio) return radioCoverUrl || getRadioLogoUrl(activeRadio);
    if (!media?.thumb) return null;
    if (media.thumb.startsWith('data:') || media.thumb.startsWith('http')) return media.thumb;
    const mime = media.thumb.startsWith('iVBOR') ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${media.thumb}`;
  }, [lastAudioSource, isLocalPlaying, isRadioPlaying, activeRadio, radioCoverUrl, media?.thumb, localTracks, currentLocalIndex]);

  // Theme styling logic
  const getThemeClasses = () => {
    const th = settings.carPlayTheme === 'auto'
      ? activeTheme
      : (settings.carPlayTheme || 'dark');
    switch (th) {
      case 'light':
        return {
          wrapper: 'bg-[#f1f3f6] text-[#1e293b] border-slate-300 shadow-inner',
          sidebar: 'bg-[#e2e7ec] border-r border-slate-300 text-[#334155]',
          activeTab: 'bg-primary text-white shadow-md border border-primary/40 shadow-[0_0_10px_var(--primary-glow-subtle)] font-bold',
          inactiveTab: 'text-slate-500 hover:bg-slate-300/50 hover:text-slate-900',
          card: 'bg-white/90 backdrop-blur-md border border-slate-250 shadow-lg rounded-3xl text-[#1e293b] overflow-hidden',
          innerCard: 'bg-slate-100/90 border border-slate-250 text-slate-800 shadow-sm rounded-2xl overflow-hidden',
          subBox: 'bg-slate-200/80 border border-slate-300 text-slate-900 rounded-xl',
          badge: 'bg-primary/15 text-primary border-primary/30',
          mutedText: 'text-slate-500 font-medium',
          accentText: 'text-primary font-bold',
          headingText: 'text-slate-900 font-black',
          progressBg: 'bg-slate-200 border border-slate-300',
          progressFill: 'bg-primary shadow-sm',
          glow: 'shadow-[0_0_15px_var(--primary-glow)] border-primary/30'
        };
      case 'blue':
        return {
          wrapper: 'bg-[#0b132b] text-slate-100 border-[#1c2541]',
          sidebar: 'bg-[#1c2541]/90 border-r border-slate-800/40 text-slate-300 border-r-sky-500/20',
          activeTab: 'bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-lg shadow-sky-500/10',
          inactiveTab: 'text-slate-400 hover:bg-[#1c2541]/40 hover:text-white',
          card: 'bg-[#1c2541]/90 backdrop-blur-sm border border-sky-500/20 shadow-xl rounded-3xl text-slate-100 overflow-hidden',
          innerCard: 'bg-[#0b132b]/80 border border-sky-500/15 text-slate-200 rounded-2xl overflow-hidden',
          subBox: 'bg-[#0b132b]/60 border border-sky-500/10 text-white rounded-xl',
          badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
          mutedText: 'text-slate-400 font-medium',
          accentText: 'text-sky-400 font-bold',
          headingText: 'text-white font-black',
          progressBg: 'bg-[#0b132b]/80 border border-white/5',
          progressFill: 'bg-sky-500 shadow-md shadow-sky-500/20',
          glow: 'shadow-[0_0_15px_rgba(14,165,233,0.2)] border-sky-500/20'
        };
      case 'titan':
        return {
          wrapper: 'bg-gradient-to-br from-[#1e222b] to-[#111318] text-[#eceff1] border-[#374151] relative overflow-hidden',
          sidebar: 'bg-[#151921] border-r border-[#374151] text-[#9ca3af]',
          activeTab: 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_10px_var(--primary-glow)]',
          inactiveTab: 'text-[#9ca3af] hover:bg-[#202530] hover:text-white',
          card: 'bg-[#1a1e26]/95 backdrop-blur-sm border border-[#374151] shadow-xl rounded-3xl text-[#eceff1] overflow-hidden',
          innerCard: 'bg-[#12151b]/90 border border-[#374151]/60 text-[#eceff1] rounded-2xl overflow-hidden',
          subBox: 'bg-[#0d1015]/80 border border-[#374151]/40 text-white rounded-xl',
          badge: 'bg-primary/15 text-primary border border-primary/25',
          mutedText: 'text-[#9ca3af] font-medium',
          accentText: 'text-primary font-bold',
          headingText: 'text-white font-black',
          progressBg: 'bg-black/40 border border-white/5',
          progressFill: 'bg-primary shadow-md shadow-[0_0_12px_var(--primary-glow)]',
          glow: 'shadow-[0_0_15px_var(--primary-glow)] border-primary/30'
        };
      case 'dark':
      default:
        return {
          wrapper: 'bg-black text-slate-100 border-zinc-900',
          sidebar: 'bg-black border-r border-zinc-800/80 text-slate-400',
          activeTab: 'bg-primary/20 text-primary border border-primary/40 shadow-md shadow-[0_0_12px_var(--primary-glow)]',
          inactiveTab: 'text-slate-400 hover:bg-zinc-800/50 hover:text-white',
          card: 'bg-[#0d1117]/95 backdrop-blur-sm border border-white/10 shadow-xl rounded-3xl text-slate-100 overflow-hidden',
          innerCard: 'bg-[#080a0f] border border-white/[0.08] text-white rounded-2xl overflow-hidden',
          subBox: 'bg-black/60 border border-white/10 text-white rounded-xl',
          badge: 'bg-primary/15 text-primary border border-primary/30',
          mutedText: 'text-zinc-400 font-medium',
          accentText: 'text-primary font-bold',
          headingText: 'text-white font-black',
          progressBg: 'bg-black/50 border border-zinc-700/40',
          progressFill: 'bg-primary shadow-[0_0_12px_var(--primary-glow)]',
          glow: 'shadow-[0_0_15px_var(--primary-glow)] border-primary/30'
        };
    }
  };

  // Official Music App Logos
  const renderSourceLogo = (sourceName?: string, size = 18) => {
    const s = (sourceName || '').toLowerCase();
    if (s.includes('spotify')) {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0 drop-shadow-sm" title="Spotify">
          <circle cx="12" cy="12" r="11" fill="#1DB954" />
          <path d="M17.5 15.5c-.2.3-.6.4-.9.2-2.5-1.5-5.6-1.9-9.3-1-.4.1-.7-.1-.8-.5-.1-.4.1-.7.5-.8 4.1-1 7.6-.5 10.3 1.2.3.2.4.6.2.9zm1.2-2.7c-.2.4-.7.5-1.1.3-2.9-1.8-7.3-2.3-10.7-1.3-.4.1-.9-.1-1-.6-.1-.4.1-.9.6-1 3.9-1.2 8.7-.6 12 1.4.3.2.4.8.2 1.2zm.1-2.8C15.3 7.9 9.5 7.7 6.1 8.7c-.5.2-1.1-.1-1.2-.6-.2-.5.1-1.1.6-1.2 4-1.2 10.4-1 14.3 1.3.5.3.6.9.3 1.4-.3.4-.9.6-1.3.4z" fill="#000" />
        </svg>
      );
    }
    if (s.includes('youtube')) {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0 drop-shadow-sm" title="YouTube">
          <rect x="2" y="5" width="20" height="14" rx="4" fill="#FF0000" />
          <path d="M10 9l5 3-5 3V9z" fill="#FFFFFF" />
        </svg>
      );
    }
    if (s.includes('apple')) {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0 drop-shadow-sm" title="Apple Music">
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#FA243C" />
          <path d="M15 6v7.5a2.5 2.5 0 11-2-2.45V8l-5 1.5v6a2.5 2.5 0 11-2-2.45V8.5a1 1 0 01.7-.95l7-2.1A1 1 0 0115 6z" fill="#FFFFFF" />
        </svg>
      );
    }
    if (s.includes('radio')) {
      return (
        <div className="flex items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400 p-0.5 shrink-0" title="Live-Radio">
          <Radio size={Math.max(12, size - 4)} className="text-emerald-400 stroke-[2.4]" />
        </div>
      );
    }
    if (s.includes('lokal') || s.includes('local')) {
      return (
        <div className="flex items-center justify-center rounded-md bg-indigo-500/20 text-indigo-400 p-0.5 shrink-0" title="Lokale Musik">
          <ListMusic size={Math.max(12, size - 4)} className="text-indigo-400 stroke-[2.4]" />
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center rounded-md bg-white/10 text-white p-0.5 shrink-0">
        <Music size={Math.max(12, size - 4)} className="stroke-[2.2]" />
      </div>
    );
  };

  // Clean corrupted Unicode characters (e.g., replacement diamond �)
  const cleanMediaString = (val?: string) => {
    if (!val) return '';
    return val.replace(/\uFFFD/g, 'ü');
  };

  // Dynamic Cover Brightness Detection (white text on dark cover, black text on bright cover - without dark plaque)
  const [coverIsDark, setCoverIsDark] = useState<boolean>(true);
  useEffect(() => {
    if (!albumArtSrc) {
      setCoverIsDark(!isLight);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 12;
        canvas.height = 12;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 12, 12);
        const data = ctx.getImageData(0, 0, 12, 12).data;
        let totalBrightness = 0;
        for (let i = 0; i < data.length; i += 4) {
          totalBrightness += (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
        }
        const avg = totalBrightness / (data.length / 4);
        setCoverIsDark(avg < 135);
      } catch (e) {
        setCoverIsDark(!isLight);
      }
    };
    img.onerror = () => setCoverIsDark(!isLight);
    img.src = albumArtSrc;
  }, [albumArtSrc, isLight]);

  // Listen for storage & window focus to sync customBgImage changes immediately across windows
  const [bgSyncTick, setBgSyncTick] = useState(0);
  const [directBgImage, setDirectBgImage] = useState<string>('');

  useEffect(() => {
    let unmounted = false;
    const onSync = () => setBgSyncTick(t => t + 1);

    try {
      const electron = typeof window !== 'undefined' && (window as any).require ? (window as any).require('electron') : null;
      if (electron?.ipcRenderer) {
        electron.ipcRenderer.invoke('get-app-appearance').then((data: any) => {
          if (!unmounted && data?.customBgImage) {
            setDirectBgImage(data.customBgImage);
          }
        }).catch(() => {});

        const onAppAppearanceUpdated = (_: any, data: any) => {
          if (!unmounted && data?.customBgImage) {
            setDirectBgImage(data.customBgImage);
          }
          setBgSyncTick(t => t + 1);
        };
        electron.ipcRenderer.on('app-appearance-updated', onAppAppearanceUpdated);

        window.addEventListener('focus', onSync);
        window.addEventListener('storage', onSync);
        return () => {
          unmounted = true;
          electron.ipcRenderer.removeListener('app-appearance-updated', onAppAppearanceUpdated);
          window.removeEventListener('focus', onSync);
          window.removeEventListener('storage', onSync);
        };
      } else if (typeof window !== 'undefined') {
        const apiPort = window.location.port === '5173' ? '8383' : (window.location.port || '8383');
        const apiBase = `${window.location.protocol}//${window.location.hostname}:${apiPort}`;
        fetch(`${apiBase}/api/carplay/state`)
          .then(res => res.json())
          .then(data => {
            if (!unmounted && data?.appearance?.customBgImage) {
              setDirectBgImage(data.appearance.customBgImage);
            }
          })
          .catch(() => {});
      }
    } catch (e) {}

    window.addEventListener('focus', onSync);
    window.addEventListener('storage', onSync);
    return () => {
      unmounted = true;
      window.removeEventListener('focus', onSync);
      window.removeEventListener('storage', onSync);
    };
  }, []);

  // Resolves the custom background image from ThemeContext or direct state
  const effectiveBgImage = useMemo(() => {
    if (appearance?.customBgImage && appearance.customBgImage.trim() !== '') {
      return appearance.customBgImage.trim();
    }
    if (directBgImage && directBgImage.trim() !== '') {
      return directBgImage.trim();
    }
    try {
      const raw = localStorage.getItem('openpipeclub_app_appearance');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.customBgImage && parsed.customBgImage.trim() !== '') {
          return parsed.customBgImage.trim();
        }
      }
      const direct = localStorage.getItem('openpipeclub_custom_bg') || localStorage.getItem('customBgImage');
      if (direct && direct.trim() !== '') {
        return direct.trim();
      }
    } catch (e) {}
    return '';
  }, [appearance?.customBgImage, directBgImage, bgSyncTick]);

  // CarPlay Wallpaper Renderer: uses custom app background ONLY in app raster, or atmospheric glow for other tabs
  const renderCarPlayWallpaper = (isAppRaster = false) => {
    if (isAppRaster && effectiveBgImage) {
      const isDark = !isLight;
      const userDim = (appearance?.bgDim ?? 65) / 100;

      // In darkmode, noticeably darken via both CSS filter brightness and deep opacity
      const dimOpacity = isDark
        ? Math.min(0.94, Math.max(0.78, userDim + 0.18))
        : Math.min(0.55, userDim * 0.6);

      const brightnessVal = isDark ? 0.32 : 0.92;
      const blurVal = appearance?.bgBlur ?? 0;

      return (
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit] z-0"
          style={{ transform: 'translateZ(0)', willChange: 'transform' }}
        >
          <img
            src={effectiveBgImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-all duration-300 pointer-events-none select-none"
            style={{
              filter: `${blurVal > 0 ? `blur(${blurVal}px)` : ''} brightness(${brightnessVal}) contrast(${isDark ? 1.08 : 1.0})`.trim(),
              transform: blurVal > 0 ? 'scale(1.06)' : 'none',
              willChange: 'filter, transform',
            }}
          />
          {/* Darkmode extra dimming overlay */}
          <div
            className="absolute inset-0 pointer-events-none transition-colors duration-300"
            style={{
              backgroundColor: `rgba(0, 0, 0, ${dimOpacity})`,
            }}
          />
          {/* Deep Darkmode Vignette: edges are dark, center subtle */}
          {isDark && (
            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-300 bg-gradient-to-t from-black/80 via-black/20 to-black/60"
            />
          )}
        </div>
      );
    }
    if (isLight) {
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit] z-0 bg-gradient-to-br from-[#e8edf5] via-[#f1f5f9] to-[#e2e8f0]">
          <div className="absolute -top-32 left-1/4 w-[500px] h-[350px] rounded-full bg-primary/10 blur-[80px]" />
          <div className="absolute -bottom-32 right-1/4 w-[500px] h-[350px] rounded-full bg-sky-400/10 blur-[90px]" />
        </div>
      );
    }
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit] z-0">
        <AnimatedBackground isAbsolute={true} ignoreCustomImage={true} />
      </div>
    );
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
        onPlay={() => connectAudioElementToVisualizer(localAudioRef.current)}
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
        html, body, #root {
          background-color: ${isCarPlaySleeping ? '#000000' : isLight ? '#eef2f6' : '#000000'} !important;
          background: ${isCarPlaySleeping ? '#000000' : isLight ? '#eef2f6' : '#000000'} !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
        .carplay-standby-overlay {
          background-color: #000000 !important;
          background: #000000 !important;
          z-index: 9999990 !important;
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
        }
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
      <div className={`w-screen h-screen ${isCarPlaySleeping ? 'bg-black' : isLight ? 'bg-[#eef2f6]' : 'bg-black'} overflow-hidden flex items-center justify-center p-0 m-0 relative`}>
        <div 
          data-aspect={aspectCategory}
          data-taskbar-pos={taskbarPosition}
          className={`w-full h-full flex ${taskbarPosition === 'bottom' ? 'flex-col' : 'flex-row'} select-none font-outfit rounded-none sm:rounded-3xl overflow-hidden border-2 shadow-2xl relative ${isLight ? 'carplay-light' : ''} ${c.wrapper} carplay-root`}
        >
      {/* CarPlay Alert Notification Toast Banner (Unified Apple CarPlay Dark Glass Pill Banner) */}
      <AnimatePresence>
        {activeNotification && (() => {
          const badgeMap: Record<string, { label: string; accent: string; bgIcon: string; borderGlow: string }> = {
            music: { label: 'MEDIENWIEDERGABE', accent: 'text-primary', bgIcon: 'bg-primary/20 text-primary border-primary/40', borderGlow: 'border-primary/40 shadow-[0_0_30px_var(--primary-glow)]' },
            speed: { label: 'GESCHWINDIGKEITS-WARNUNG', accent: 'text-rose-400', bgIcon: 'bg-rose-500/20 text-rose-400 border-rose-500/40', borderGlow: 'border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.3)]' },
            fuel: { label: 'KRAFTSTOFF-RESERVE', accent: 'text-primary', bgIcon: 'bg-primary/20 text-primary border-primary/40', borderGlow: 'border-primary/40 shadow-[0_0_30px_var(--primary-glow)]' },
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
              className={`absolute top-0 z-[99999] w-[460px] max-w-[92vw] rounded-3xl bg-[#0d1117]/95 backdrop-blur-md border ${badge.borderGlow} p-3.5 flex flex-col gap-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.9)] text-white cursor-pointer hover:scale-[1.01] transition-all`}
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

      {/* CarPlay Floating Volume HUD Indicator */}
      <AnimatePresence>
        {volumeHud?.show && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 16, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            style={{ x: '-50%', left: '50%' }}
            className="absolute top-0 z-[99998] min-w-[280px] sm:min-w-[340px] rounded-2xl bg-[#0d1117]/95 backdrop-blur-2xl border border-emerald-500/30 px-4 py-3 flex items-center gap-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.85)] pointer-events-none"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
              volumeHud.isMuted || volumeHud.volume === 0
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
            }`}>
              {volumeHud.isMuted || volumeHud.volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono font-black">
                <span className="text-zinc-400 tracking-wider">RADIO LAUTSTÄRKE</span>
                <span className={volumeHud.isMuted || volumeHud.volume === 0 ? 'text-rose-400' : 'text-emerald-400'}>
                  {volumeHud.isMuted || volumeHud.volume === 0 ? 'STUMMGESCHALTET' : `${Math.round(volumeHud.volume * 100)}%`}
                </span>
              </div>
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/5">
                <div
                  className={`h-full rounded-full transition-all duration-100 ${
                    volumeHud.isMuted || volumeHud.volume === 0
                      ? 'w-0 bg-rose-500'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                  }`}
                  style={{ width: `${Math.round(volumeHud.volume * 100)}%` }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Titanium brushed pattern if titan theme active */}
      {settings.carPlayTheme === 'titan' && (
        <div className="titan-pattern absolute inset-0 pointer-events-none opacity-[0.25]" />
      )}

      {/* Taskbar Navigation: Auto-switches between Left Sidebar (Landscape) and Bottom Bar (Narrow / 4:3 / Square) */}
      <div 
        className={`drag flex ${
          taskbarPosition === 'bottom'
            ? 'flex-row items-center justify-between px-3 py-1.5 w-full order-last z-30 border-t'
            : 'flex-col items-center justify-between py-2 sm:py-3.5 h-full z-10 shrink-0 border-r overflow-y-auto no-scrollbar'
        } select-none ${c.sidebar}`}
        style={{ 
          ...(taskbarPosition === 'bottom'
            ? {
                height: `${Math.round(58 * sidebarScale)}px`,
                minHeight: `${Math.round(48 * sidebarScale)}px`,
              }
            : {
                width: `${Math.round(76 * sidebarScale)}px`,
                minWidth: `${Math.round(60 * sidebarScale)}px`,
              }),
          ...(isCarPlaySleeping ? { display: 'none' } : {}),
        }}
      >
        {/* Left / Top Section: Digital Clock */}
        <div className={`flex ${taskbarPosition === 'bottom' ? 'flex-row items-center shrink-0' : 'flex-col items-center'}`}>
          <span 
            className={`font-black tracking-tight px-2 py-0.5 rounded-lg border ${
              isLight
                ? 'text-slate-800 bg-white/80 border-slate-300/80 shadow-sm'
                : 'text-white bg-black/40 border-white/10'
            }`}
            style={{ fontSize: `${13 * sidebarScale}px` }}
          >
            {timeString}
          </span>
        </div>

        {/* Center Section: App Grid Launcher + Top 3 Recent Apps */}
        <div className={`flex ${taskbarPosition === 'bottom' ? 'flex-row gap-2.5 sm:gap-3 items-center mx-auto' : 'flex-col gap-2 sm:gap-3 my-auto items-center'}`}>
          {/* 1. Dedicated App Launcher Button (Grid / All Apps) */}
          <button
            onClick={() => {
              handleAndroidAutoMenuButton();
              setSidebarIndex(0);
              setFocusZone('sidebar');
            }}
            title={activeTab === 'apps' ? 'Dashboard anzeigen' : activeTab === 'home' ? 'Alle Apps anzeigen' : 'Dashboard anzeigen'}
            className={`rounded-2xl flex items-center justify-center transition-all cursor-pointer relative group ${
              activeTab === 'apps' 
                ? 'bg-primary text-white shadow-[0_0_20px_var(--primary-glow)] scale-105 border border-primary/50' 
                : 'text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5 bg-zinc-900/60'
            } ${
              focusZone === 'sidebar' && sidebarIndex === 0
                ? 'ring-4 ring-inset ring-primary scale-105 border-primary bg-primary/25 shadow-[0_0_18px_var(--primary-glow)]'
                : ''
            }`}
            style={{
              width: `${Math.max(36, Math.round((taskbarPosition === 'bottom' ? 44 : 50) * sidebarScale))}px`,
              height: `${Math.max(36, Math.round((taskbarPosition === 'bottom' ? 44 : 50) * sidebarScale))}px`,
            }}
          >
            <LayoutGrid size={Math.round((taskbarPosition === 'bottom' ? 20 : 22) * sidebarScale)} className="transition-transform group-hover:scale-110" />
            {activeTab === 'apps' && (
              <span className={`absolute ${taskbarPosition === 'bottom' ? '-bottom-1 left-2 right-2 h-1 rounded-t' : '-left-1.5 w-1 h-5 rounded-r'} bg-primary shadow-[0_0_8px_var(--primary-glow)]`} />
            )}
          </button>

          {/* Subtle separator */}
          <div className={`${taskbarPosition === 'bottom' ? 'w-px h-6 mx-0.5' : 'w-6 h-px my-0.5'} bg-white/10 rounded-full`} />

          {/* 2. Top 3 Most Recent Apps (Dynamically updated with distinct SMTC, Radio & Local Music tabs) */}
          {recentApps.slice(0, 3).map((tabId, idx) => {
            const metaMap: Record<RecentAppId, { icon: any; label: string; tab: Tab; subMode?: 'windows' | 'local' | 'radio' }> = {
              home: { icon: Home, label: 'Cockpit & Dashboard', tab: 'home' },
              map: { icon: MapIcon, label: 'Navigation & Karte', tab: 'map' },
              music: { icon: Music, label: 'Medien & Audio', tab: 'music', subMode: 'windows' },
              'music-windows': { icon: Music, label: 'Medienplayer / SMTC', tab: 'music', subMode: 'windows' },
              'music-radio': { icon: Radio, label: 'Live-Radio', tab: 'music', subMode: 'radio' },
              'music-local': { icon: ListMusic, label: 'Lokale Musik', tab: 'music', subMode: 'local' },
              job: { icon: Briefcase, label: 'Fracht & Auftrag', tab: 'job' },
              truck: { icon: Truck, label: 'LKW Diagnose', tab: 'truck' },
              control: { icon: Sliders, label: 'LKW-Steuerung', tab: 'control' },
              settings: { icon: Settings, label: 'Einstellungen', tab: 'settings' },
              chat: { icon: MessageSquare, label: 'Funk & Chat', tab: 'chat' },
              events: { icon: Calendar, label: 'Events & Konvois', tab: 'events' },
              apps: { icon: LayoutGrid, label: 'Apps', tab: 'apps' },
            };
            const meta = metaMap[tabId] || { icon: Home, label: 'App', tab: 'home' };
            const Icon = meta.icon;
            const active =
              tabId === 'music-windows'
                ? activeTab === 'music' && musicSubTab === 'windows'
                : tabId === 'music-radio'
                ? activeTab === 'music' && musicSubTab === 'radio'
                : tabId === 'music-local'
                ? activeTab === 'music' && musicSubTab === 'local'
                : activeTab === tabId;
            const isFocused = focusZone === 'sidebar' && sidebarIndex === idx + 1;
            const iconSize = Math.round((taskbarPosition === 'bottom' ? 19 : 20) * sidebarScale);

            return (
              <button
                key={tabId}
                onClick={() => {
                  openApp(meta.tab, meta.subMode);
                  setSidebarIndex(1);
                  setFocusZone('sidebar');
                }}
                title={meta.label}
                className={`rounded-2xl flex items-center justify-center transition-all cursor-pointer relative ${
                  active ? c.activeTab : c.inactiveTab
                } ${
                  isFocused ? 'ring-4 ring-inset ring-primary scale-105 border-primary bg-primary/20 shadow-[0_0_15px_var(--primary-glow)]' : ''
                }`}
                style={{
                  width: `${Math.max(34, Math.round((taskbarPosition === 'bottom' ? 42 : 46) * sidebarScale))}px`,
                  height: `${Math.max(34, Math.round((taskbarPosition === 'bottom' ? 42 : 46) * sidebarScale))}px`,
                }}
              >
                <Icon size={iconSize} />
                {active && (
                  <span className={`absolute ${taskbarPosition === 'bottom' ? '-bottom-1 left-2 right-2 h-1 rounded-t' : '-left-1.5 w-1 h-4 rounded-r'} bg-primary shadow-[0_0_8px_var(--primary-glow)]`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Right / Bottom placeholder for balanced spacing */}
        <div className={`shrink-0 ${taskbarPosition === 'bottom' ? 'w-10' : 'h-4'}`} />
      </div>

      {/* Main Display Area */}
      <div className="flex-1 h-full p-2.5 overflow-hidden relative z-10 flex flex-col justify-center" style={isCarPlaySleeping ? { display: 'none' } : undefined}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.18 }}
            className="w-full h-full flex flex-col justify-between"
          >
            {/* --- ANDROID AUTO APP RASTER / APP DRAWER TAB --- */}
            {activeTab === 'apps' && (
              <div className="w-full h-full flex flex-col justify-center items-center overflow-hidden p-3 sm:p-6 relative rounded-2xl sm:rounded-3xl bg-[#050608]">
                {/* App Wallpaper Background from OPC Main App */}
                {renderCarPlayWallpaper(true)}

                {/* 9 App Raster Grid: Dynamic Columns & Generous Padding to Prevent Any Clipping */}
                <div
                  style={{
                    gridTemplateColumns: `repeat(${appGridCols}, minmax(0, 1fr))`,
                  }}
                  className="w-full max-w-4xl grid gap-3.5 sm:gap-6 px-6 sm:px-8 py-4 sm:py-6 overflow-y-auto no-scrollbar items-center justify-center relative z-10 my-auto"
                >
                  {[
                    {
                      id: 'map',
                      title: 'Navigation',
                      icon: Navigation,
                      iconBg: 'bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-blue-500/25',
                      action: () => openApp('map'),
                    },
                    {
                      id: 'music-windows',
                      title: 'Medienplayer',
                      icon: Music,
                      iconBg: 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/25',
                      action: () => openApp('music', 'windows'),
                    },
                    {
                      id: 'music-radio',
                      title: 'Live-Radio',
                      icon: Radio,
                      iconBg: 'bg-gradient-to-tr from-violet-600 to-purple-500 shadow-violet-500/25',
                      action: () => openApp('music', 'radio'),
                    },
                    {
                      id: 'music-local',
                      title: 'Lokale Musik',
                      icon: ListMusic,
                      iconBg: 'bg-gradient-to-tr from-pink-600 to-rose-500 shadow-pink-500/25',
                      action: () => openApp('music', 'local'),
                    },
                    {
                      id: 'job',
                      title: 'Auftrag',
                      icon: Briefcase,
                      iconBg: 'bg-gradient-to-tr from-sky-600 to-cyan-500 shadow-sky-500/25',
                      action: () => openApp('job'),
                    },
                    {
                      id: 'truck',
                      title: 'LKW Diagnose',
                      icon: Truck,
                      iconBg: 'bg-gradient-to-tr from-amber-600 to-orange-500 shadow-orange-500/25',
                      action: () => openApp('truck'),
                    },
                    {
                      id: 'control',
                      title: 'LKW-Steuerung',
                      icon: Sliders,
                      iconBg: 'bg-gradient-to-tr from-cyan-600 to-blue-500 shadow-cyan-500/25',
                      action: () => openApp('control'),
                    },
                    {
                      id: 'chat',
                      title: 'Funk & Chat',
                      icon: MessageSquare,
                      iconBg: 'bg-gradient-to-tr from-purple-600 to-indigo-500 shadow-purple-500/25',
                      action: () => openApp('chat'),
                    },
                    {
                      id: 'events',
                      title: 'Events & Konvois',
                      icon: Calendar,
                      iconBg: 'bg-gradient-to-tr from-teal-600 to-emerald-500 shadow-teal-500/25',
                      action: () => openApp('events'),
                    },
                    {
                      id: 'settings',
                      title: 'Einstellungen',
                      icon: Settings,
                      iconBg: 'bg-gradient-to-tr from-zinc-600 to-slate-500 shadow-zinc-500/25',
                      action: () => openApp('settings'),
                    },
                  ].map((app, idx) => {
                    const AppIcon = app.icon;
                    const isFocused = focusZone === 'content' && contentIndex === idx;

                    return (
                      <div
                        key={app.id}
                        data-app-focused={isFocused ? 'true' : undefined}
                        onClick={app.action}
                        className={`group relative flex flex-col items-center justify-center p-3 sm:p-5 rounded-3xl bg-black/45 hover:bg-black/65 border border-white/10 hover:border-primary/60 hover:shadow-[0_0_25px_var(--primary-glow)] hover:z-20 backdrop-blur-md transition-all duration-200 cursor-pointer ${
                          isFocused
                            ? 'ring-4 ring-inset ring-primary scale-[1.04] border-primary bg-primary/20 shadow-[0_0_30px_var(--primary-glow)] z-20'
                            : 'hover:scale-[1.03] hover:shadow-2xl'
                        }`}
                        style={{ transform: 'translateZ(0)', willChange: 'transform' }}
                      >
                        {/* Big App Icon */}
                        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl ${app.iconBg} flex items-center justify-center text-white shadow-xl transition-transform duration-300 group-hover:scale-110`}>
                          <AppIcon size={30} className="sm:w-8 sm:h-8 drop-shadow-md" />
                        </div>

                        {/* Clean App Title */}
                        <span className="mt-2 text-xs sm:text-sm font-bold text-zinc-200 group-hover:text-white tracking-tight text-center truncate max-w-full drop-shadow">
                          {app.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* --- HOME DASHBOARD TAB --- */}
            {activeTab === 'home' && (
              <div className="w-full h-full relative rounded-2xl sm:rounded-3xl overflow-hidden p-1 sm:p-1.5">
                {/* App Wallpaper Background from OPC Main App */}
                {renderCarPlayWallpaper()}

                <div className={`grid ${aspectCategory === 'narrow' ? 'grid-cols-1' : 'grid-cols-12'} gap-2.5 sm:gap-3 h-full relative z-10 p-0.5`}>
                  {/* Left Side: Map Widget – click to open full map tab */}
                  <div
                    onClick={() => openApp('map')}
                    className={`${aspectCategory === 'narrow' ? 'h-1/2' : aspectCategory === '4:3' ? 'col-span-6 lg:col-span-7' : 'col-span-7'} h-full flex flex-col cursor-pointer transition-all duration-300 rounded-3xl ${
                      isLight
                        ? 'bg-white/80 hover:bg-white/95 border-slate-300/80 hover:border-primary/60 hover:shadow-[0_0_20px_var(--primary-glow)] shadow-lg'
                        : 'bg-black/40 hover:bg-black/50 border-white/10 hover:border-primary/60 hover:shadow-[0_0_20px_var(--primary-glow)] shadow-2xl'
                    } hover:z-20 backdrop-blur-xl overflow-hidden ${
                      focusZone === 'content' && contentIndex === 0
                        ? 'ring-4 ring-inset ring-primary scale-[1.01] border-primary shadow-[0_0_20px_var(--primary-glow)] z-20'
                        : 'hover:scale-[1.005]'
                    } relative`}
                  >
                    <div ref={setMapContainerRef} className={`flex-1 relative ${isLight ? 'bg-slate-200' : 'bg-black'} overflow-hidden rounded-[inherit]`}>
                      {!maximizedWidget && (
                        <GameMapWidget
                          ref={mapWidgetRef}
                          gameX={(telemetry as any).posX ?? (telemetry as any).gameX}
                          gameY={(telemetry as any).posZ ?? (telemetry as any).gameY}
                          heading={telemetry.connected ? telemetry.heading : undefined}
                          currentSpeed={telemetry.connected ? telemetry.speed : 0}
                          speedLimit={telemetry.connected ? telemetry.speedLimit : 0}
                          routeWaypoints={effectiveRouteWaypoints}
                          source={effectiveSource}
                          dest={effectiveDest}
                          destCompany={effectiveDestCompany}
                          navDistance={telemetry.connected ? telemetry.navDistance : undefined}
                          connected={telemetry.connected}
                          themeMode={activeMapTheme}
                          accentColor="#6d28d9"
                          width={mapDims.w}
                          height={mapDims.h}
                          mapId="carplay-home"
                          hqOverlay={settings.carPlayHqOverlay || 'truckline'}
                          zoom={carPlayMapZoom}
                          onZoomChange={setCarPlayMapZoom}
                          showInstructions={settings.carPlayShowNavInstructions !== false}
                          fullWidthInstructions
                          showSpeedcams={true}
                          onSpeedcamAlert={setSpeedcamAlert}
                          onRouteCalculated={setCustomRouteInfo}
                          nearbyVehicles={telemetry.connected ? (telemetry as any).nearbyVehicles : undefined}
                          nearbyVehicleColor="#007aff"
                          semaphores={telemetry.connected ? (telemetry as any).semaphores : undefined}
                          onApproachingTrafficLightChange={setApproachingTrafficLight}
                          enableTerrain3D={false}
                          pitch={38}
                          paused={isCarPlaySleeping || activeTab !== 'home' || maximizedWidget !== null}
                          targetFps={20}
                        />
                      )}

                      {/* Speedcam Warning Alert HUD Floating Banner (Home Dashboard) */}
                      <AnimatePresence>
                        {speedcamAlert && (
                          <motion.div
                            initial={{ opacity: 0, y: -15, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -15, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute top-2.5 left-1/2 -translate-x-1/2 z-40 pointer-events-none max-w-[90%]"
                          >
                            <div
                              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-2xl backdrop-blur-xl border shadow-2xl transition-all ${
                                speedcamAlert.isSpeeding
                                  ? 'bg-rose-950/90 border-rose-500/90 text-rose-100 shadow-[0_0_25px_rgba(244,63,94,0.65)] animate-pulse'
                                  : 'bg-zinc-950/90 border-primary/50 text-white shadow-[0_0_15px_var(--primary-glow)]'
                              }`}
                            >
                              <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-white shrink-0 shadow-md ${
                                speedcamAlert.isSpeeding ? 'bg-rose-600' : 'bg-primary'
                              }`}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                                  <circle cx="12" cy="13" r="3"/>
                                </svg>
                              </div>
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-black uppercase tracking-wider font-mono truncate">
                                    {speedcamAlert.isSpeeding ? '⚠️ BLITZER' : '📷 BLITZER'}
                                  </span>
                                  <span className="text-[9.5px] font-extrabold px-1.5 py-0.2 rounded bg-black/60 border border-white/10 font-mono text-white">
                                    {speedcamAlert.distanceMeters}m
                                  </span>
                                </div>
                                <div className="text-[9.5px] font-mono text-zinc-300 truncate">
                                  Limit: <strong className="text-white">{speedcamAlert.camera.speedLimit} km/h</strong>
                                  {speedcamAlert.isSpeeding && (
                                    <span className="text-rose-400 font-extrabold ml-1">(+{speedcamAlert.overspeedKmh})</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Bottom-left Navigation HUD (Home Dashboard) */}
                      <AnimatePresence>
                        {renderBottomNavHud(true)}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Right Side: Media and Mini Telemetry */}
                  <div className={`${aspectCategory === 'narrow' ? 'h-1/2' : aspectCategory === '4:3' ? 'col-span-6 lg:col-span-5' : 'col-span-5'} flex flex-col justify-between h-full gap-2.5 sm:gap-3 relative z-10`}>
                    {/* Media card */}
                    <div
                      onClick={() => openApp('music', 'windows')}
                      className={`relative flex-1 flex flex-col justify-between cursor-pointer transition-all duration-300 rounded-3xl ${
                        isLight
                          ? 'bg-white/85 hover:bg-white/95 border-slate-300/80 hover:border-primary/60 shadow-lg text-slate-900'
                          : 'bg-black/40 hover:bg-black/50 border-white/10 hover:border-primary/60 shadow-2xl text-white'
                      } hover:shadow-[0_0_20px_var(--primary-glow)] backdrop-blur-xl p-3.5 group overflow-hidden hover:z-20 ${
                        focusZone === 'content' && contentIndex === 1
                          ? 'ring-4 ring-inset ring-primary scale-[1.01] border-primary shadow-[0_0_20px_var(--primary-glow)] z-20'
                          : 'hover:scale-[1.005]'
                      }`}
                    >
                      {/* Full Cover Image with smooth song transition animation */}
                      <AnimatePresence mode="wait">
                        {albumArtSrc ? (
                          <motion.div
                            key={albumArtSrc}
                            initial={{ opacity: 0, scale: 1.05 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.35, ease: 'easeOut' }}
                            className="absolute inset-0 z-0 overflow-hidden rounded-[inherit] pointer-events-none"
                          >
                            <img
                              src={albumArtSrc}
                              alt={media?.title || ''}
                              className="w-full h-full object-cover scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/50 pointer-events-none" />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="no-cover"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="absolute inset-0 z-0 bg-gradient-to-br from-black/60 via-black/40 to-black/70 overflow-hidden rounded-[inherit]"
                          />
                        )}
                      </AnimatePresence>

                      {/* TOP ROW & ACTIVE MEDIA DISPLAY (Unified for SMTC, Local Music & ETS2 Live Radio) */}
                      {(() => {
                        const activeTitle = (lastAudioSource === 'local' && localTracks[currentLocalIndex])
                          ? localTracks[currentLocalIndex].name
                          : (lastAudioSource === 'radio' && activeRadio)
                          ? (radioSongTitle || activeRadio.name)
                          : isLocalPlaying && localTracks[currentLocalIndex]
                          ? localTracks[currentLocalIndex].name
                          : isRadioPlaying && activeRadio
                          ? (radioSongTitle || activeRadio.name)
                          : media?.title;

                        const activeArtist = (lastAudioSource === 'local')
                          ? 'Lokale Audiodatei'
                          : (lastAudioSource === 'radio' && activeRadio)
                          ? (radioSongTitle ? `${activeRadio.name} • ${activeRadio.genre}` : `${activeRadio.genre} • ${activeRadio.bitrate} kbps`)
                          : isLocalPlaying
                          ? 'Lokale Audiodatei'
                          : isRadioPlaying && activeRadio
                          ? (radioSongTitle ? `${activeRadio.name} • ${activeRadio.genre}` : `${activeRadio.genre} • ${activeRadio.bitrate} kbps`)
                          : media?.artist;

                        const activeSource = (lastAudioSource === 'local' || isLocalPlaying)
                          ? 'LOKALE MUSIK'
                          : (lastAudioSource === 'radio' || isRadioPlaying)
                          ? 'ETS2 LIVE-RADIO'
                          : (media?.source || 'SPOTIFY');

                        const isAnyActive = lastAudioSource === 'radio'
                          ? isRadioPlaying
                          : lastAudioSource === 'local'
                          ? isLocalPlaying
                          : (isLocalPlaying || isRadioPlaying || Boolean(media?.isPlaying));

                        return (
                          <>
                            <div className="relative z-20 flex items-center justify-between pointer-events-none">
                              <span className={`text-[9.5px] font-extrabold uppercase tracking-widest flex items-center gap-1.5 ${
                                coverIsDark ? 'text-primary drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]' : 'text-slate-900'
                              }`}>
                                <Music size={13} className={coverIsDark ? 'text-primary' : 'text-slate-900'} /> Mediaplayer
                              </span>
                              {activeTitle && (
                                <div className="flex items-center drop-shadow-md">
                                  {renderSourceLogo(activeSource, 20)}
                                </div>
                              )}
                            </div>

                            {/* BOTTOM ROW: Track Info, Timeline & Controls Floating Directly Over Cover */}
                            {activeTitle ? (
                              <div className="relative z-20 flex flex-col gap-2 pointer-events-none">
                                {/* Song Title & Artist with crossfade transition on song change */}
                                <AnimatePresence mode="wait">
                                  <motion.div
                                    key={`${cleanMediaString(activeTitle)}-${cleanMediaString(activeArtist)}`}
                                    initial={{ opacity: 0, y: 7 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -7 }}
                                    transition={{ duration: 0.22, ease: 'easeOut' }}
                                  >
                                    <h3 className={`text-lg font-black truncate tracking-tight ${
                                      coverIsDark
                                        ? 'text-white drop-shadow-[0_2px_8px_rgba(0,0,0,1)]'
                                        : 'text-slate-950 drop-shadow-[0_1px_3px_rgba(255,255,255,0.9)]'
                                    }`}>
                                      {cleanMediaString(activeTitle)}
                                    </h3>
                                    <p className={`text-xs font-extrabold truncate mt-0.5 ${
                                      coverIsDark
                                        ? 'text-zinc-200 drop-shadow-[0_2px_6px_rgba(0,0,0,1)]'
                                        : 'text-slate-800 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]'
                                    }`}>
                                      {cleanMediaString(activeArtist)}
                                    </p>
                                  </motion.div>
                                </AnimatePresence>

                                {/* Timeline & Controls Row */}
                                <div className="flex items-center gap-3 w-full pointer-events-auto">
                                  {/* Timeline */}
                                  <div className="flex-1 flex items-center gap-2">
                                    <span className={`text-[10px] font-mono font-black shrink-0 ${
                                      coverIsDark ? 'text-primary drop-shadow-[0_2px_4px_rgba(0,0,0,1)]' : 'text-slate-900 drop-shadow-none'
                                    }`}>
                                      {(lastAudioSource === 'local' || isLocalPlaying) ? formatMediaTime(localProgress) : (lastAudioSource === 'radio' || isRadioPlaying) ? 'LIVE' : formatMediaTime(media?.progress, media?.duration)}
                                    </span>
                                    <div className={`h-2 flex-1 rounded-full overflow-hidden ${isLight ? 'bg-slate-200 border border-slate-300' : 'bg-black/80 border border-white/15'} relative shadow-md`}>
                                      <div
                                        className="h-full rounded-full transition-all duration-300 bg-primary shadow-[0_0_10px_var(--primary-glow)]"
                                        style={{
                                          width: (lastAudioSource === 'local' || isLocalPlaying) && localDuration > 0
                                            ? `${(localProgress / localDuration) * 100}%`
                                            : (lastAudioSource === 'radio' || isRadioPlaying)
                                            ? (isRadioPlaying ? '100%' : '0%')
                                            : media
                                            ? `${getProgressPercent(media.progress, media.duration)}%`
                                            : '0%',
                                          backgroundColor: 'var(--primary)'
                                        }}
                                      />
                                    </div>
                                    <span className={`text-[10px] font-mono font-bold shrink-0 ${
                                      coverIsDark ? 'text-zinc-300 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]' : 'text-slate-700 drop-shadow-none'
                                    }`}>
                                      {(lastAudioSource === 'local' || isLocalPlaying) ? formatMediaTime(localDuration) : (lastAudioSource === 'radio' || isRadioPlaying) ? 'STREAM' : media?.duration ? formatMediaTime(media.duration) : '--:--'}
                                    </span>
                                  </div>

                                  {/* Controls Cluster: Play/Pause Only */}
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (lastAudioSource === 'local') togglePlayLocal();
                                        else if (lastAudioSource === 'radio') togglePlayRadio();
                                        else if (isLocalPlaying) togglePlayLocal();
                                        else if (isRadioPlaying) togglePlayRadio();
                                        else sendMediaAction('play-pause');
                                      }}
                                      className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl ${
                                        isAnyActive
                                          ? 'bg-primary text-[var(--primary-foreground)] shadow-[0_0_15px_var(--primary-glow)] border border-white/30'
                                          : isLight
                                          ? 'bg-white/80 text-slate-800 border border-slate-300 hover:bg-white backdrop-blur-md'
                                          : 'bg-black/75 text-white border border-white/20 hover:bg-black/90 backdrop-blur-md'
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

                    {/* Redesigned Streamlined Digital Cockpit Widget (Speed, Gear & RPM Only - No Popup) */}
                    <div
                      className={`p-3.5 flex-1 flex flex-col justify-between transition-all duration-300 rounded-3xl ${
                        isLight
                          ? 'bg-white/85 hover:bg-white/95 border-slate-300/80 hover:border-primary/50 shadow-lg text-slate-900'
                          : 'bg-black/40 hover:bg-black/50 border-white/10 hover:border-primary/50 shadow-2xl text-white'
                      } hover:shadow-[0_0_20px_var(--primary-glow)] backdrop-blur-xl overflow-hidden relative select-none hover:z-20`}
                    >
                      {/* Header: Title, Telemetry Status & Truck Model / Limit */}
                      <div className={`flex items-center justify-between border-b ${isLight ? 'border-slate-200' : 'border-white/[0.08]'} pb-2 mb-2 z-10`}>
                        <div className="flex items-center gap-2">
                          <span className="text-[9.5px] font-black uppercase tracking-widest text-amber-400 font-mono flex items-center gap-1.5 bg-black/40 border border-white/10 px-2.5 py-0.5 rounded-lg shadow-sm">
                            <Gauge size={13} className="text-amber-400" /> DIGITAL COCKPIT
                          </span>
                          {telemetry.connected ? (
                            <span className="flex items-center gap-1.5 text-[8.5px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
                            </span>
                          ) : (
                            <span className="text-[8.5px] font-mono font-bold text-zinc-500 bg-white/[0.03] border border-white/[0.06] px-2 py-0.5 rounded-md">
                              STANDBY
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {data.cruiseControl && data.cruiseControl > 0 ? (
                            <span className="text-[8.5px] font-mono font-extrabold text-sky-400 bg-sky-500/10 border border-sky-500/25 px-2 py-0.5 rounded-md">
                              CRUISE {Math.round(data.cruiseControl)}
                            </span>
                          ) : null}
                          <span className="font-mono text-[9.5px] font-bold text-zinc-300 truncate max-w-[130px] bg-white/[0.04] border border-white/[0.08] px-2.5 py-0.5 rounded-lg shadow-inner">
                            {data.brand || 'LKW'} {data.model || ''}
                          </span>
                        </div>
                      </div>

                      {/* Main Section: Geschwindigkeit & Ganganzeige Side-by-Side */}
                      <div className="grid grid-cols-12 gap-2.5 items-stretch flex-1 z-10 min-h-0 mb-2">
                        {/* Left Column: Geschwindigkeit */}
                        <div className={`col-span-7 rounded-2xl ${isLight ? 'bg-slate-100/90 border-slate-250 shadow-sm' : 'bg-black/40 border-white/10 shadow-lg'} backdrop-blur-xl p-3 flex flex-col justify-between relative overflow-hidden group`}>
                          <div className="flex items-center justify-between z-10">
                            <span className={`text-[9px] font-mono font-black uppercase tracking-wider ${c.mutedText} flex items-center gap-1`}>
                              TEMPO
                            </span>
                            {data.speedLimit && data.speedLimit > 0 ? (
                              <div
                                className={`w-6 h-6 rounded-full bg-white border-2 border-red-600 flex items-center justify-center text-zinc-950 font-black font-mono text-[9px] shadow-sm leading-none shrink-0 ${
                                  isOverspeed ? 'animate-bounce shadow-[0_0_10px_rgba(244,63,94,0.6)]' : ''
                                }`}
                                title={`Tempolimit: ${Math.round(data.speedLimit)} km/h`}
                              >
                                {Math.round(data.speedLimit)}
                              </div>
                            ) : (
                              <span className="text-[8px] font-mono text-zinc-600">FREI</span>
                            )}
                          </div>

                          <div className="my-auto flex items-baseline gap-1.5 z-10">
                            <span
                              className={`font-black font-mono tracking-tight tabular-nums leading-none ${
                                isOverspeed
                                  ? 'text-rose-400 animate-pulse'
                                  : isLight
                                  ? 'text-slate-900 drop-shadow-none'
                                  : 'text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]'
                              }`}
                              style={{ fontSize: 'clamp(32px, 4.2vw, 48px)' }}
                            >
                              {Math.round(speed)}
                            </span>
                            <span className="text-xs font-black uppercase font-mono tracking-wider text-amber-400">
                              KM/H
                            </span>
                          </div>

                          {/* Subtle bottom speed progress bar */}
                          <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden z-10">
                            <div
                              className={`h-full transition-all duration-200 rounded-full ${
                                isOverspeed
                                  ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]'
                                  : 'bg-primary shadow-[0_0_8px_var(--primary-glow)]'
                              }`}
                              style={{ width: `${Math.min(100, (speed / 120) * 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Right Column: Ganganzeige */}
                        <div className={`col-span-5 rounded-2xl ${isLight ? 'bg-slate-100/90 border-slate-250 shadow-sm' : 'bg-black/40 border-white/10 shadow-lg'} backdrop-blur-xl p-3 flex flex-col justify-between items-center text-center relative overflow-hidden group`}>
                          <div className="w-full flex items-center justify-between z-10">
                            <span className={`text-[9px] font-mono font-black uppercase tracking-wider ${c.mutedText}`}>
                              GANG
                            </span>
                            <span className={`text-[8px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                              gear > 0
                                ? 'text-amber-400 bg-amber-500/10'
                                : gear < 0
                                ? 'text-rose-400 bg-rose-500/10'
                                : 'text-emerald-400 bg-emerald-500/10'
                            }`}>
                              {gear > 0 ? 'DRIVE' : gear < 0 ? 'REV' : 'NEUT'}
                            </span>
                          </div>

                          <div className="my-auto flex items-center justify-center z-10">
                            <span
                              className={`font-black font-mono tracking-tight leading-none px-3.5 py-0.5 rounded-2xl border shadow-lg ${
                                gear > 0
                                  ? 'text-primary bg-primary/15 border-primary/35 shadow-[0_0_20px_var(--primary-glow)]'
                                  : gear < 0
                                  ? 'text-rose-300 bg-rose-500/20 border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.35)]'
                                  : 'text-emerald-300 bg-emerald-500/15 border-emerald-500/35 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                              }`}
                              style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', minWidth: '60px' }}
                            >
                              {gear > 0 ? `D${gear}` : gear < 0 ? `R${Math.abs(gear)}` : 'N'}
                            </span>
                          </div>

                          <div className="text-[8px] font-mono font-bold text-zinc-500 uppercase z-10 truncate max-w-full">
                            {data.parkBrake ? 'PARKBREMSE' : gear > 0 ? 'VORWÄRTS' : gear < 0 ? 'RÜCKWÄRTS' : 'LEERLAUF'}
                          </div>
                        </div>
                      </div>

                      {/* Bottom Row: Drehzahl (RPM) with Modern Segmented Rev-Counter Bar */}
                      <div className="rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl shadow-lg p-2.5 flex flex-col gap-1.5 z-10">
                        <div className="flex items-center justify-between text-[9px] font-mono">
                          <span className={`font-black uppercase tracking-wider ${c.mutedText} flex items-center gap-1.5`}>
                            <Zap size={12} className="text-amber-400" /> DREHZAHL
                          </span>
                          <div className="flex items-center gap-2">
                            <span className={`text-[8px] font-mono font-extrabold uppercase px-1.5 py-0.2 rounded border ${
                              rpm > 1800
                                ? 'text-rose-400 bg-rose-500/20 border-rose-500/40 animate-pulse'
                                : rpm >= 900 && rpm <= 1500
                                ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
                                : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                            }`}>
                              {rpm > 1800 ? 'HIGH RPM' : rpm >= 900 && rpm <= 1500 ? 'ECO ZONE' : 'POWER'}
                            </span>
                            <span className="font-black text-white tabular-nums">
                              {Math.round(rpm)} <span className="text-amber-400 text-[8.5px] font-bold">U/MIN</span>
                            </span>
                          </div>
                        </div>

                        {/* Segmented LED Rev Counter Bar */}
                        <div className="flex gap-1 h-2.5 w-full bg-black/60 p-0.5 rounded-lg border border-white/[0.08] shadow-inner">
                          {Array.from({ length: 20 }).map((_, i) => {
                            const activeBars = Math.round((Math.min(2500, rpm) / 2500) * 20);
                            const isActive = i < activeBars;
                            const isRedline = i >= 15; // 1875+ RPM
                            const isPower = i >= 11 && i < 15; // 1375-1875 RPM
                            return (
                              <div
                                key={i}
                                className={`flex-1 rounded-xs transition-all duration-150 ${
                                  isActive
                                    ? isRedline
                                      ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]'
                                      : isPower
                                      ? 'bg-primary shadow-[0_0_8px_var(--primary-glow)]'
                                      : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]'
                                    : 'bg-white/[0.04]'
                                }`}
                              />
                            );
                          })}
                        </div>

                        {/* Scale labels */}
                        <div className="flex justify-between text-[7.5px] font-mono font-bold text-zinc-500 px-0.5 leading-none">
                          <span>0</span>
                          <span className="text-emerald-400/90 font-black">1000 ECO</span>
                          <span>1800</span>
                          <span className="text-rose-400/90 font-black">2500 RPM</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* --- MUSIC TAB (SUB-PLAYERS) --- */}
            {activeTab === 'music' && (
              <div className="h-full flex flex-col animate-fade-in overflow-hidden gap-2">
                {/* --- MODE 1: WINDOWS SMTC MEDIA (UNIFIED DISPLAY FOR LOCAL & RADIO AS WELL) --- */}
                {musicSubTab === 'windows' && (
                  <div className="flex-1 flex flex-col min-h-0">
                    {/* Unified Active Track Display */}
                    {(() => {
                      const displayTitle = (lastAudioSource === 'local' && localTracks[currentLocalIndex])
                        ? localTracks[currentLocalIndex].name
                        : (lastAudioSource === 'radio' && activeRadio)
                        ? (radioSongTitle || activeRadio.name)
                        : isLocalPlaying && localTracks[currentLocalIndex]
                        ? localTracks[currentLocalIndex].name
                        : isRadioPlaying && activeRadio
                        ? (radioSongTitle || activeRadio.name)
                        : media?.title;

                      const displayArtist = (lastAudioSource === 'local')
                        ? 'Lokale Audiodatei'
                        : (lastAudioSource === 'radio' && activeRadio)
                        ? (radioSongTitle ? `${activeRadio.name} • ${activeRadio.genre}` : `${activeRadio.genre} • ${activeRadio.bitrate} kbps`)
                        : isLocalPlaying
                        ? 'Lokale Audiodatei'
                        : isRadioPlaying && activeRadio
                        ? (radioSongTitle ? `${activeRadio.name} • ${activeRadio.genre}` : `${activeRadio.genre} • ${activeRadio.bitrate} kbps`)
                        : media?.artist;

                      const displaySource = (lastAudioSource === 'local' || isLocalPlaying)
                        ? 'LOKALE MUSIK'
                        : (lastAudioSource === 'radio' || isRadioPlaying)
                        ? 'ETS2 LIVE-RADIO'
                        : (media?.source || 'SPOTIFY');

                      const isAnyPlaying = lastAudioSource === 'radio'
                        ? isRadioPlaying
                        : lastAudioSource === 'local'
                        ? isLocalPlaying
                        : (isLocalPlaying || isRadioPlaying || media?.isPlaying);

                      if (!displayTitle) {
                        return (
                          <div className={`flex-1 flex flex-col items-center justify-center p-6 text-center ${c.card} relative`}>
                            <div className="w-18 h-18 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3 shadow-lg">
                              <Music size={36} className="text-amber-400 animate-pulse" />
                            </div>
                            <h3 className={`text-xl font-black ${c.headingText} mb-1.5 tracking-tight`}>Keine aktive Medienwiedergabe</h3>
                            <p className={`text-xs max-w-[320px] leading-relaxed ${c.mutedText}`}>
                              Starte Spotify, spiele lokale Musik oder schalte das ETS2 Live-Radio ein.
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className={`flex-1 flex flex-col relative overflow-hidden ${c.card}`}>
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

                          {/* TOP RIGHT CORNER: Player Source Logo */}
                          <div className="absolute top-3 right-3 z-30 flex items-center drop-shadow-lg">
                            {renderSourceLogo(displaySource, 24)}
                          </div>

                          {/* Crisp Album Cover or Station Logo with song transition animation */}
                          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none p-0 overflow-hidden">
                            <AnimatePresence mode="wait">
                              {albumArtSrc ? (
                                <motion.div
                                  key={albumArtSrc}
                                  initial={{ opacity: 0, scale: 0.94 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 1.04 }}
                                  transition={{ duration: 0.35, ease: 'easeOut' }}
                                  className="relative h-full aspect-square flex items-center justify-center"
                                >
                                  <img
                                    src={albumArtSrc}
                                    alt={displayTitle}
                                    className="h-full w-full object-cover shadow-[0_20px_50px_rgba(0,0,0,0.9)]"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40 pointer-events-none" />
                                </motion.div>
                              ) : ((lastAudioSource === 'radio' || isRadioPlaying) && activeRadio) ? (
                                <motion.div
                                  key={activeRadio.id}
                                  initial={{ opacity: 0, scale: 0.94 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 1.04 }}
                                  transition={{ duration: 0.25 }}
                                  className="relative h-full aspect-square flex items-center justify-center p-4"
                                >
                                  <RadioLogoImage src={getRadioLogoUrl(activeRadio)} name={activeRadio.name} size="lg" />
                                </motion.div>
                              ) : (
                                <motion.div
                                  key="placeholder"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="h-full aspect-square bg-zinc-900 flex flex-col items-center justify-center"
                                >
                                  <Disc size={64} className="text-amber-400/60 mb-2" />
                                  <span className="text-xs font-black uppercase text-zinc-400 tracking-wider font-mono">{displaySource}</span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* CENTER OVERLAY: Song Title & Artist shifted down with crossfade animation */}
                          <div className="absolute inset-x-0 bottom-24 sm:bottom-28 z-20 flex flex-col items-center justify-end px-4 text-center pointer-events-none">
                            <div className="max-w-[92%] sm:max-w-[84%] flex flex-col items-center gap-1.5 pointer-events-auto">
                              <AnimatePresence mode="wait">
                                <motion.div
                                  key={`${cleanMediaString(displayTitle)}-${cleanMediaString(displayArtist)}`}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ duration: 0.25, ease: 'easeOut' }}
                                  className="flex flex-col items-center gap-1.5 max-w-full"
                                >
                                  <h2 className={`text-2xl sm:text-3xl font-black truncate tracking-tight text-center max-w-full transition-colors duration-300 ${
                                    coverIsDark
                                      ? 'text-white drop-shadow-[0_4px_16px_rgba(0,0,0,1)]'
                                      : 'text-slate-950 drop-shadow-[0_2px_8px_rgba(255,255,255,0.9)]'
                                  }`}>
                                    {cleanMediaString(displayTitle)}
                                  </h2>
                                  <p className={`text-sm sm:text-base font-extrabold truncate text-center max-w-full transition-colors duration-300 ${
                                    coverIsDark
                                      ? 'text-zinc-200 drop-shadow-[0_2px_8px_rgba(0,0,0,1)]'
                                      : 'text-slate-800 drop-shadow-[0_1px_4px_rgba(255,255,255,0.9)]'
                                  }`}>
                                    {cleanMediaString(displayArtist)}
                                  </p>
                                </motion.div>
                              </AnimatePresence>
                              {/* Live Audio Spectrum Visualizer - in an elevated glass container */}
                              <div className={`mt-2.5 px-3 py-1.5 rounded-2xl border backdrop-blur-xl transition-all shadow-xl flex items-center justify-center w-full max-w-md ${
                                coverIsDark
                                  ? 'bg-black/60 border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.6)]'
                                  : 'bg-white/80 border-slate-200/90 shadow-[0_8px_24px_rgba(0,0,0,0.08)]'
                              }`}>
                                <SMTCVisualizer isPlaying={Boolean(isAnyPlaying)} isDark={coverIsDark} className="w-full" />
                              </div>
                            </div>
                          </div>

                          {/* BOTTOM OVERLAY: Playback Buttons + Timeline */}
                          <div className="absolute bottom-2.5 left-4 right-4 z-30 flex flex-col gap-2">
                            <div className="flex items-center justify-center gap-5">
                              <button
                                onClick={() => {
                                  if (lastAudioSource === 'local') playLocalTrack((currentLocalIndex - 1 + localTracks.length) % localTracks.length);
                                  else if (lastAudioSource === 'radio') playPrevRadioStation();
                                  else if (isLocalPlaying) playLocalTrack((currentLocalIndex - 1 + localTracks.length) % localTracks.length);
                                  else if (isRadioPlaying) playPrevRadioStation();
                                  else sendMediaAction('prev');
                                }}
                                className={`w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border backdrop-blur-md active:scale-90 transition-all cursor-pointer shadow-lg ${
                                  focusZone === 'content' && contentIndex === 0
                                    ? 'ring-4 ring-inset ring-primary scale-110 bg-primary text-[var(--primary-foreground)] border-primary shadow-[0_0_20px_var(--primary-glow)]'
                                    : 'border-white/20'
                                }`}
                              >
                                <SkipBack size={16} />
                              </button>

                              <button
                                onClick={() => {
                                  if (lastAudioSource === 'local') togglePlayLocal();
                                  else if (lastAudioSource === 'radio') togglePlayRadio();
                                  else if (isLocalPlaying) togglePlayLocal();
                                  else if (isRadioPlaying) togglePlayRadio();
                                  else sendMediaAction('play-pause');
                                }}
                                className={`w-11 h-11 rounded-full flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl ${
                                  focusZone === 'content' && contentIndex === 1
                                    ? 'ring-4 ring-inset ring-primary scale-110 shadow-[0_0_25px_var(--primary-glow)]'
                                    : ''
                                } ${
                                  isAnyPlaying
                                    ? 'bg-primary text-[var(--primary-foreground)] shadow-[0_0_18px_var(--primary-glow)] border-2 border-white/30'
                                    : 'bg-black/75 text-white border-2 border-white/20 hover:bg-black/90 backdrop-blur-md'
                                }`}
                              >
                                {isAnyPlaying ? <Pause size={19} className="fill-current" /> : <Play size={19} className="fill-current ml-0.5" />}
                              </button>

                              <button
                                onClick={() => {
                                  if (lastAudioSource === 'local') playLocalTrack((currentLocalIndex + 1) % localTracks.length);
                                  else if (lastAudioSource === 'radio') playNextRadioStation();
                                  else if (isLocalPlaying) playLocalTrack((currentLocalIndex + 1) % localTracks.length);
                                  else if (isRadioPlaying) playNextRadioStation();
                                  else sendMediaAction('next');
                                }}
                                className={`w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border backdrop-blur-md active:scale-90 transition-all cursor-pointer shadow-lg ${
                                  focusZone === 'content' && contentIndex === 2
                                    ? 'ring-4 ring-inset ring-primary scale-110 bg-primary text-[var(--primary-foreground)] border-primary shadow-[0_0_20px_var(--primary-glow)]'
                                    : 'border-white/20'
                                }`}
                              >
                                <SkipForward size={16} />
                              </button>
                            </div>

                            {/* Timeline Slider */}
                            <div className="flex items-center gap-3 w-full">
                              <span className="text-[11px] font-mono font-black text-amber-400 shrink-0 min-w-[36px] text-left drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                                {(lastAudioSource === 'local' || isLocalPlaying) ? formatMediaTime(localProgress) : (lastAudioSource === 'radio' || isRadioPlaying) ? 'LIVE' : media ? formatMediaTime(media.progress, media.duration) : 'LIVE'}
                              </span>

                              <div className="relative flex-1 h-3 flex items-center">
                                <div className="h-2 w-full rounded-full overflow-hidden bg-black/70 border border-white/15 relative shadow-md">
                                  <div
                                    className="h-full rounded-full transition-all duration-300 bg-primary shadow-[0_0_12px_var(--primary-glow)]"
                                    style={{
                                      width: (lastAudioSource === 'local' || isLocalPlaying) && localDuration > 0
                                        ? `${(localProgress / localDuration) * 100}%`
                                        : (lastAudioSource === 'radio' || isRadioPlaying)
                                        ? (isRadioPlaying ? '100%' : '0%')
                                        : media
                                        ? `${getProgressPercent(media.progress, media.duration)}%`
                                        : '0%',
                                      backgroundColor: 'var(--primary)'
                                    }}
                                  />
                                </div>
                              </div>

                              <span className="text-[11px] font-mono font-bold text-zinc-300 shrink-0 min-w-[36px] text-right drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                                {(lastAudioSource === 'local' || isLocalPlaying) ? formatMediaTime(localDuration) : (lastAudioSource === 'radio' || isRadioPlaying) ? 'STREAM' : media?.duration ? formatMediaTime(media.duration) : '--:--'}
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
                  <div className="w-full h-full relative rounded-2xl sm:rounded-3xl overflow-hidden p-1 sm:p-1.5 flex flex-col font-['Outfit',sans-serif]">
                    {/* App Wallpaper Background from OPC Main App */}
                    {renderCarPlayWallpaper()}

                    <div className={`flex-1 flex flex-col p-3.5 sm:p-4 rounded-3xl ${isLight ? 'bg-white/90 border-slate-250 shadow-xl text-slate-900' : 'bg-black/40 border-white/10 shadow-2xl text-white'} backdrop-blur-md overflow-hidden justify-between relative z-10 m-0.5 min-h-0`}>
                      {/* Header */}
                      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10 shrink-0 relative z-20 gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isLight
                              ? 'bg-slate-100 border border-slate-200 text-slate-800 shadow-sm'
                              : 'bg-gradient-to-tr from-pink-600 to-rose-500 shadow-md shadow-pink-500/25 text-white'
                          }`}>
                            <Disc size={18} className="stroke-[2.2] drop-shadow-md" />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-pink-300 bg-pink-500/20 border border-pink-500/30 px-2.5 py-1 rounded-full shrink-0">
                            {localTracks.length} Songs
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <label className={`px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 active:scale-95 text-white text-xs font-mono font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg shadow-pink-600/30 transition-all shrink-0 border border-pink-400/30 ${
                            focusZone === 'content' && contentIndex === 0
                              ? 'ring-4 ring-pink-400 scale-105 shadow-[0_0_20px_rgba(244,63,94,0.6)]'
                              : ''
                          }`}>
                            <Plus size={13} />
                            <span className="hidden sm:inline">Laden</span>
                            <input ref={localFileInputRef} type="file" multiple accept="audio/*" onChange={handleLocalFilesSelect} className="hidden" />
                          </label>
                        </div>
                      </div>

                      {localTracks.length > 0 ? (
                        <div className="grid grid-cols-12 gap-3.5 flex-1 min-h-0 overflow-hidden">
                          {/* Left Column: Playlist (5 Cols) */}
                          <div className="col-span-5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl p-3 flex flex-col justify-between min-h-0 shadow-xl overflow-hidden">
                            <div className="mb-2 shrink-0 flex items-center justify-between">
                              <span className="text-[10px] font-mono font-black text-blue-400 uppercase tracking-widest">
                                📑 TITEL-LISTE
                              </span>
                              <span className="text-[9px] font-mono text-zinc-400">
                                Track {currentLocalIndex + 1} / {localTracks.length}
                              </span>
                            </div>

                            <div className="flex-1 overflow-y-auto no-scrollbar space-y-1.5 min-h-0 pr-0.5">
                              {localTracks.map((t, idx) => {
                                const isCurrent = idx === currentLocalIndex;
                                const isTrackFocused = focusZone === 'content' && contentIndex === idx + 1;
                                return (
                                  <button
                                    key={t.id}
                                    onClick={() => playLocalTrack(idx)}
                                    data-item-focused={isTrackFocused ? "true" : undefined}
                                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all duration-200 cursor-pointer select-none ${
                                      isTrackFocused
                                        ? 'ring-4 ring-blue-500 scale-[1.01] border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.6)] z-20 bg-blue-500/30 text-white font-bold'
                                        : isCurrent
                                        ? 'bg-amber-500/20 border-amber-500/50 text-white font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                                        : 'bg-black/40 border-white/5 text-zinc-300 hover:bg-white/[0.06] hover:border-white/15'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      {t.coverUrl ? (
                                        <img src={t.coverUrl} alt="" className="w-6 h-6 rounded-md object-cover shrink-0 border border-white/10" />
                                      ) : (
                                        <span className={`text-xs font-mono font-bold w-5 shrink-0 ${isCurrent ? 'text-amber-400' : 'text-zinc-500'}`}>
                                          {idx + 1}.
                                        </span>
                                      )}
                                      <span className="text-xs font-semibold truncate text-zinc-100">
                                        {t.name}
                                      </span>
                                    </div>
                                    {isCurrent && isLocalPlaying && (
                                      <span className="text-[9px] font-mono font-black text-amber-400 flex items-center gap-1 shrink-0 ml-2 animate-pulse">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                        SPIELT
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            <div className={`mt-2 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-white/10'} shrink-0`}>
                              <label className={`w-full py-2.5 rounded-xl border text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 ${
                                isLight
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500 shadow-md shadow-blue-600/25'
                                  : 'bg-white/[0.08] hover:bg-white/[0.15] border-white/15 text-white shadow-md'
                              }`}>
                                <Plus size={14} className="stroke-[2.5]" /> Mehr Songs hinzufügen
                                <input type="file" multiple accept="audio/*" onChange={handleLocalFilesSelect} className="hidden" />
                              </label>
                            </div>
                          </div>

                          {/* Right Column: Player Deck (7 Cols) */}
                          <div className="col-span-7 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl p-4 sm:p-5 flex flex-col justify-between min-h-0 shadow-xl">
                            {/* Track Artwork & Info Deck */}
                            <div className="flex items-center gap-4">
                              {localTracks[currentLocalIndex]?.coverUrl ? (
                                <div className={`w-24 h-24 rounded-2xl overflow-hidden shrink-0 shadow-2xl shadow-blue-500/30 border border-white/20 relative group ${isLocalPlaying ? 'ring-2 ring-blue-400/80 shadow-[0_0_20px_rgba(59,130,246,0.5)]' : ''}`}>
                                  <img
                                    src={localTracks[currentLocalIndex].coverUrl}
                                    alt={localTracks[currentLocalIndex].name}
                                    className="w-full h-full object-cover"
                                  />
                                  {isLocalPlaying && (
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
                                      <Disc size={28} className="text-white drop-shadow-md animate-spin" style={{ animationDuration: '4s' }} />
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className={`w-24 h-24 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-2xl shadow-blue-500/30 border border-white/10 ${isLocalPlaying ? 'ring-2 ring-blue-400/50' : ''}`}>
                                  <Disc size={46} className={`drop-shadow-lg ${isLocalPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '5s' }} />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[9px] font-mono font-black uppercase tracking-widest text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md">
                                    {isLocalPlaying ? '▶ JETZT WIEDERGABE' : '⏸ PAUSIERT'}
                                  </span>
                                  <span className="text-[9px] font-mono text-zinc-400">
                                    Track {currentLocalIndex + 1} von {localTracks.length}
                                  </span>
                                </div>
                                <h3 className="text-base sm:text-lg font-black text-white truncate leading-tight">
                                  {localTracks[currentLocalIndex]?.name || 'Titel'}
                                </h3>
                                <p className="text-xs font-mono text-zinc-400 truncate mt-1">
                                  {localTracks[currentLocalIndex]?.file.name}
                                </p>
                              </div>
                            </div>

                            {/* Timeline Scrubber */}
                            <div className="my-auto py-2">
                              <div className="flex items-center justify-between text-xs font-mono font-bold mb-1.5">
                                <span className="text-amber-400">{formatMediaTime(localProgress)}</span>
                                <span className="text-zinc-400">{formatMediaTime(localDuration)}</span>
                              </div>
                              <div className="relative flex items-center">
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
                                  className="w-full accent-amber-500 cursor-pointer h-2 bg-black/60 rounded-lg border border-white/10"
                                />
                              </div>
                            </div>

                            {/* Controls Bar: Transport + Volume */}
                            <div className="flex items-center justify-between pt-2 border-t border-white/10">
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => playLocalTrack((currentLocalIndex - 1 + localTracks.length) % localTracks.length)}
                                  className="w-12 h-12 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 border border-white/10 text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
                                  title="Vorheriger Song"
                                >
                                  <SkipBack size={18} />
                                </button>
                                <button
                                  onClick={togglePlayLocal}
                                  className="w-16 h-13 rounded-2xl bg-primary hover:bg-primary/90 active:scale-95 text-[var(--primary-foreground)] font-black flex items-center justify-center transition-all cursor-pointer shadow-xl shadow-[var(--primary-glow)]"
                                  title={isLocalPlaying ? "Pausieren" : "Abspielen"}
                                >
                                  {isLocalPlaying ? <Pause size={22} className="stroke-[2.5]" /> : <Play size={22} className="ml-1 stroke-[2.5]" />}
                                </button>
                                <button
                                  onClick={() => playLocalTrack((currentLocalIndex + 1) % localTracks.length)}
                                  className="w-12 h-12 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 border border-white/10 text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
                                  title="Nächster Song"
                                >
                                  <SkipForward size={18} />
                                </button>
                              </div>

                              {/* Volume Slider */}
                              <div className="flex items-center gap-2.5 bg-black/50 border border-white/10 px-3 py-2 rounded-2xl min-w-[150px]">
                                <Volume2 size={16} className="text-amber-400 shrink-0" />
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
                                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-white/20 rounded-lg"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                          <div className={`w-20 h-20 rounded-3xl ${isLight ? 'bg-blue-50 border border-blue-200 text-blue-600 shadow-sm' : 'bg-blue-500/10 border border-blue-500/20 text-blue-400 shadow-xl'} flex items-center justify-center mb-4`}>
                            <Disc size={42} />
                          </div>
                          <h3 className={`text-lg font-black ${isLight ? 'text-slate-900' : 'text-white'} mb-2`}>Keine lokalen Songs geladen</h3>
                          <p className={`text-xs ${isLight ? 'text-slate-600 font-medium' : 'text-zinc-400'} max-w-sm mb-6 leading-relaxed`}>
                            Wähle Musikdateien (.mp3, .flac, .wav) von deiner Festplatte aus, um deine persönliche Musiksammlung direkt im Cockpit abzuspielen.
                          </p>
                          <label 
                            style={{ backgroundColor: '#2563eb', backgroundImage: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)', color: '#ffffff' }}
                            className="px-6 py-3.5 rounded-2xl font-mono font-black uppercase text-xs tracking-wider cursor-pointer shadow-xl shadow-blue-600/40 hover:opacity-95 transition-all flex items-center gap-2.5 active:scale-95 border border-blue-400/40 text-white select-none z-20"
                          >
                            <Plus size={18} className="text-white shrink-0 stroke-[2.5]" />
                            <span className="text-white font-black tracking-wider">Musikdateien auswählen</span>
                            <input type="file" multiple accept="audio/*" onChange={handleLocalFilesSelect} className="hidden" />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* --- MODE 3: ETS2 LIVE-RADIO STREAMS --- */}
                {musicSubTab === 'radio' && (
                  <div className="w-full h-full relative rounded-2xl sm:rounded-3xl overflow-hidden p-1 sm:p-1.5 flex flex-col font-['Outfit',sans-serif]">
                    {/* App Wallpaper Background from OPC Main App */}
                    {renderCarPlayWallpaper()}

                    <div className={`flex-1 flex flex-col p-3.5 sm:p-4 rounded-3xl ${isLight ? 'bg-white/90 border-slate-250 shadow-xl text-slate-900' : 'bg-black/40 border-white/10 shadow-2xl text-white'} backdrop-blur-md overflow-hidden justify-between relative z-10 m-0.5 min-h-0`}>
                      {/* Header */}
                      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10 shrink-0 relative z-20 gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isLight
                              ? 'bg-slate-100 border border-slate-200 text-slate-800 shadow-sm'
                              : 'bg-gradient-to-tr from-violet-600 to-purple-500 shadow-md shadow-violet-500/25 text-white'
                          }`}>
                            <Radio size={18} className="stroke-[2.2] drop-shadow-md" />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-violet-300 bg-violet-500/20 border border-violet-500/30 px-2.5 py-1 rounded-full shrink-0">
                            {filteredRadioStations.length} Sender
                          </span>
                        </div>

                        {/* Search & Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div
                            onClick={() => openVirtualKeyboard('radio')}
                            className={`relative min-w-[130px] sm:min-w-[180px] rounded-xl transition-all ${
                              focusZone === 'content' && contentIndex === 0
                                ? 'ring-4 ring-violet-400 scale-105 shadow-[0_0_20px_rgba(139,92,246,0.5)]'
                                : ''
                            }`}
                          >
                            <Search size={13} className="absolute left-2.5 top-2 text-zinc-400" />
                            <input
                              type="text"
                              value={radioSearch}
                              onFocus={() => openVirtualKeyboard('radio')}
                              onChange={(e) => setRadioSearch(e.target.value)}
                              placeholder="Sender / Genre..."
                              className="w-full bg-black/50 border border-white/15 focus:border-violet-400 rounded-xl py-1.5 pl-7 pr-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none font-mono shadow-inner cursor-pointer"
                            />
                          </div>

                          <button
                            onClick={autoLoadSii}
                            className={`px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 active:scale-95 text-white text-xs font-mono font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-lg shadow-violet-600/30 transition-all shrink-0 border border-violet-400/30 ${
                              focusZone === 'content' && contentIndex === 1
                                ? 'ring-4 ring-violet-400 scale-105 shadow-[0_0_20px_rgba(139,92,246,0.5)]'
                                : ''
                            }`}
                            title="live_streams.sii aus ETS2 Ordner automatisch auslesen"
                          >
                            <RefreshCw size={12} />
                            <span className="hidden md:inline">Auto-Scan</span>
                          </button>

                          <label className={`px-2.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] active:scale-95 text-white text-xs font-mono font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all shrink-0 border border-white/15 ${
                            focusZone === 'content' && contentIndex === 2
                              ? 'ring-4 ring-inset ring-primary scale-105 shadow-[0_0_20px_var(--primary-glow)]'
                              : ''
                          }`}>
                            <Upload size={12} />
                            <span className="hidden md:inline">Import</span>
                            <input ref={siiFileInputRef} type="file" accept=".sii,.txt" onChange={handleSiiFileUpload} className="hidden" />
                          </label>
                        </div>
                      </div>

                      {/* Station Grid */}
                      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar grid grid-cols-2 gap-2.5 p-0.5">
                        {filteredRadioStations.map((st, idx) => {
                          const isCurrent = activeRadio?.id === st.id;
                          const stLogo = getRadioLogoUrl(st);
                          const isItemFocused = focusZone === 'content' && contentIndex === idx + 3;
                          return (
                            <button
                              key={st.id}
                              onClick={() => togglePlayRadio(st)}
                              data-item-focused={isItemFocused ? "true" : undefined}
                              className={`group p-3 rounded-2xl border text-left flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-md select-none ${
                                isItemFocused
                                  ? 'ring-4 ring-emerald-400 scale-[1.02] border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.5)] z-20 bg-emerald-500/25 text-white font-bold'
                                  : isCurrent && isRadioPlaying
                                  ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400'
                                  : isLight
                                  ? 'bg-white/90 border-slate-250 hover:border-emerald-500/50 hover:bg-slate-100 text-slate-900 shadow-sm'
                                  : 'bg-black/50 border-white/10 hover:border-emerald-500/40 hover:bg-white/[0.06]'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1.5 min-w-0">
                                <div className="flex items-center gap-2.5 truncate min-w-0">
                                  <RadioLogoImage
                                    src={stLogo}
                                    name={st.name}
                                    size="sm"
                                    className={`w-6 h-6 rounded-lg object-contain ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-black/60 border-white/10'} p-0.5 border shrink-0`}
                                  />
                                  <span className={`text-xs font-black truncate ${isLight && !(isItemFocused || (isCurrent && isRadioPlaying)) ? 'text-slate-900 group-hover:text-slate-900' : 'text-white'}`}>{st.name}</span>
                                </div>
                                {st.favorite && (
                                  <span className="text-[9px] bg-amber-500/20 border border-amber-500/40 text-amber-400 px-1.5 py-0.5 rounded-md font-mono font-bold shrink-0">
                                    ★
                                  </span>
                                )}
                              </div>
                              <div className={`flex items-center justify-between text-[9.5px] font-mono ${isLight && !(isItemFocused || (isCurrent && isRadioPlaying)) ? 'text-slate-600' : 'text-zinc-400'} mt-2`}>
                                <span className="truncate max-w-[120px]">{st.genre}</span>
                                <span className={`font-bold ${isLight ? 'text-primary' : 'text-amber-400'}`}>{st.bitrate} kbps</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Bottom Active Stream Deck */}
                      {activeRadio && (() => {
                        const deckStart = 3 + filteredRadioStations.length;
                        return (
                        <div className={`mt-3 p-3.5 rounded-2xl ${isLight ? 'bg-white/90 border-slate-250 text-slate-900 shadow-xl' : 'bg-black/60 border-white/15 text-white shadow-2xl'} backdrop-blur-xl flex items-center justify-between shrink-0`}>
                          <div className="flex items-center gap-3.5 min-w-0">
                            <RadioLogoImage
                              src={getRadioLogoUrl(activeRadio)}
                              name={activeRadio.name}
                              size="md"
                              className={`w-12 h-12 rounded-xl object-contain ${isLight ? 'bg-slate-100 border-slate-250' : 'bg-black/70 border-white/10'} p-1 border shrink-0 shadow-md`}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-[8.5px] font-mono font-black uppercase px-2 py-0.5 rounded-md tracking-wider ${
                                  isRadioPlaying
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                                    : 'bg-white/10 text-zinc-400 border border-white/10'
                                }`}>
                                  {isRadioPlaying ? (radioSongTitle ? 'LIVE TRACK' : 'LIVE ON AIR') : 'PAUSIERT'}
                                </span>
                                <span className={`text-[9px] font-mono font-bold ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>{activeRadio.bitrate} kbps</span>
                              </div>
                              <h4 className={`text-sm font-black truncate mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                {radioSongTitle || activeRadio.name}
                              </h4>
                              {radioSongTitle && (
                                <p className="text-[10px] text-emerald-500 font-bold truncate mt-0.5 font-mono">
                                  Sender: {activeRadio.name}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              data-item-focused={focusZone === 'content' && contentIndex === deckStart + 0 ? "true" : undefined}
                              onClick={playPrevRadioStation}
                              className={`w-10 h-10 rounded-xl active:scale-95 border flex items-center justify-center transition-all cursor-pointer shadow-md ${
                                isLight
                                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-250 text-slate-800'
                                  : 'bg-white/[0.06] hover:bg-white/[0.14] border-white/10 text-white'
                              } ${
                                focusZone === 'content' && contentIndex === deckStart + 0
                                  ? 'ring-2 ring-emerald-400 scale-105 bg-emerald-500/30 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] z-10'
                                  : ''
                              }`}
                              title="Vorheriger Sender (⏮)"
                            >
                              <SkipBack size={16} />
                            </button>

                            <button
                              type="button"
                              data-item-focused={focusZone === 'content' && contentIndex === deckStart + 1 ? "true" : undefined}
                              onClick={() => togglePlayRadio()}
                              className={`px-4 h-11 rounded-xl flex items-center justify-center font-black transition-all cursor-pointer shadow-lg active:scale-95 ${
                                focusZone === 'content' && contentIndex === deckStart + 1
                                  ? 'ring-4 ring-emerald-400 scale-110 shadow-[0_0_25px_rgba(16,185,129,0.6)] z-10'
                                  : ''
                              } ${
                                isRadioPlaying
                                  ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.5)]'
                                  : 'bg-primary hover:bg-primary/90 text-[var(--primary-foreground)] shadow-[0_0_15px_var(--primary-glow)]'
                              }`}
                              title={isRadioPlaying ? "Radio stoppen" : "Radio starten"}
                            >
                              {isRadioPlaying ? <Pause size={20} className="stroke-[2.5]" /> : <Play size={20} className="ml-0.5 stroke-[2.5]" />}
                            </button>

                            <button
                              type="button"
                              data-item-focused={focusZone === 'content' && contentIndex === deckStart + 2 ? "true" : undefined}
                              onClick={playNextRadioStation}
                              className={`w-10 h-10 rounded-xl active:scale-95 border flex items-center justify-center transition-all cursor-pointer shadow-md ${
                                isLight
                                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-250 text-slate-800'
                                  : 'bg-white/[0.06] hover:bg-white/[0.14] border-white/10 text-white'
                              } ${
                                focusZone === 'content' && contentIndex === deckStart + 2
                                  ? 'ring-2 ring-emerald-400 scale-105 bg-emerald-500/30 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] z-10'
                                  : ''
                              }`}
                              title="Nächster Sender (⏭)"
                            >
                              <SkipForward size={16} />
                            </button>

                            {/* Mute Button (deckStart + 3) */}
                            <button
                              type="button"
                              data-item-focused={focusZone === 'content' && contentIndex === deckStart + 3 ? "true" : undefined}
                              onClick={toggleMuteRadio}
                              className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                                isLight
                                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-250 text-slate-700'
                                  : 'bg-black/50 border-white/10 text-zinc-400 hover:text-white'
                              } ${
                                focusZone === 'content' && contentIndex === deckStart + 3
                                  ? 'ring-2 ring-emerald-400 text-white bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                                  : ''
                              }`}
                              title={radioVolume === 0 ? "Stummschaltung aufheben" : "Stummschalten (M)"}
                            >
                              {radioVolume === 0 ? <VolumeX size={15} className="text-rose-400" /> : <Volume2 size={15} className="text-emerald-500" />}
                            </button>

                            {/* Volume Down Button (deckStart + 4) */}
                            <button
                              type="button"
                              data-item-focused={focusZone === 'content' && contentIndex === deckStart + 4 ? "true" : undefined}
                              onClick={() => adjustRadioVolume(-0.05)}
                              className={`w-8 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                                isLight
                                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-250 text-slate-700'
                                  : 'bg-black/50 border-white/10 text-zinc-400 hover:text-white'
                              } ${
                                focusZone === 'content' && contentIndex === deckStart + 4
                                  ? 'ring-2 ring-emerald-400 text-white bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                                  : ''
                              }`}
                              title="Lautstärke verringern (-5%)"
                            >
                              <Minus size={13} />
                            </button>

                            {/* Volume Slider Control (deckStart + 5) */}
                            <div
                              data-item-focused={focusZone === 'content' && contentIndex === deckStart + 5 ? "true" : undefined}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                                isLight
                                  ? 'bg-slate-100/90 border-slate-250 text-slate-800'
                                  : 'bg-black/50 border-white/10 text-white'
                              } ${
                                focusZone === 'content' && contentIndex === deckStart + 5
                                  ? 'ring-2 ring-emerald-400 bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.5)] border-emerald-400'
                                  : ''
                              }`}
                              title="Lautstärke anpassen (Hotkeys: [ / ] oder BildAuf/BildAb)"
                            >
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
                                  try { localStorage.setItem('opc_carplay_radio_volume', String(v)); } catch (err) {}
                                  triggerVolumeHud(v, v === 0);
                                }}
                                className="w-16 sm:w-24 accent-emerald-500 cursor-pointer h-1.5 bg-white/20 rounded-lg"
                              />
                              <span className="text-[10px] font-mono font-bold w-7 text-right text-zinc-300">
                                {Math.round(radioVolume * 100)}%
                              </span>
                            </div>

                            {/* Volume Up Button (deckStart + 6) */}
                            <button
                              type="button"
                              data-item-focused={focusZone === 'content' && contentIndex === deckStart + 6 ? "true" : undefined}
                              onClick={() => adjustRadioVolume(0.05)}
                              className={`w-8 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                                isLight
                                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-250 text-slate-700'
                                  : 'bg-black/50 border-white/10 text-zinc-400 hover:text-white'
                              } ${
                                focusZone === 'content' && contentIndex === deckStart + 6
                                  ? 'ring-2 ring-emerald-400 text-white bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                                  : ''
                              }`}
                              title="Lautstärke erhöhen (+5%)"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* --- JOB INFO TAB --- */}
            {activeTab === 'job' && (
              <div className="w-full h-full relative rounded-2xl sm:rounded-3xl overflow-hidden p-1 sm:p-1.5 flex flex-col font-['Outfit',sans-serif]">
                {/* App Wallpaper Background from OPC Main App */}
                {renderCarPlayWallpaper()}

                <div className={`flex-1 flex flex-col p-4 sm:p-5 rounded-3xl ${isLight ? 'bg-white/90 border-slate-250 shadow-xl text-slate-900' : 'bg-black/40 border-white/10 shadow-2xl text-white'} backdrop-blur-md overflow-hidden justify-between relative z-10 m-0.5`}>
                  {/* Header */}
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10 shrink-0 relative z-10">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isLight
                          ? 'bg-slate-100 border border-slate-200 text-slate-800 shadow-sm'
                          : 'bg-gradient-to-tr from-sky-600 to-cyan-500 shadow-md shadow-sky-500/25 text-white'
                      }`}>
                        <Briefcase size={18} className="stroke-[2.2] drop-shadow-md" />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-sky-300 bg-sky-500/20 border border-sky-500/30 px-2.5 py-1 rounded-full">
                        {data.cargo && data.cargo.toLowerCase() !== 'none' ? 'FRACHT AKTIV' : 'KEIN AUFTRAG'}
                      </span>
                    </div>
                    {data.income > 0 && (
                      <div className="text-right bg-emerald-500/15 border border-emerald-500/30 px-4 py-1.5 rounded-2xl shadow-lg backdrop-blur-md">
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
                        <div className={`col-span-7 rounded-2xl ${isLight ? 'bg-slate-100/90 border-slate-250 text-slate-900' : 'bg-black/40 border-white/10 text-white'} backdrop-blur-xl p-4 flex flex-col justify-between shadow-xl`}>
                          <span className="text-[9px] font-black font-mono text-primary uppercase tracking-widest block mb-1">FRACHTGUT</span>
                          <p className={`text-2xl font-black leading-tight truncate drop-shadow-md ${isLight ? 'text-slate-900' : 'text-white'}`}>{data.cargo}</p>
                          {data.cargoMass > 0 && (
                            <div className="mt-2.5">
                              <span className={`text-xs font-mono font-bold inline-flex items-center gap-1.5 ${isLight ? 'bg-slate-200/80 text-slate-800 border-slate-300' : 'bg-black/60 text-white border-white/10'} px-3 py-1.5 rounded-xl border shadow-inner`}>
                                ⚖️ <span className="text-primary font-black">{data.cargoMass.toFixed(1)}</span> Tonnen
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="col-span-5 flex flex-col gap-3">
                          {data.navDistance > 0 && (
                            <div className={`rounded-2xl ${isLight ? 'bg-slate-100/90 border-slate-250 text-slate-900' : 'bg-black/40 border-white/10 text-white'} backdrop-blur-xl p-3.5 flex-1 flex items-center gap-3.5 shadow-xl`}>
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                                isLight ? 'bg-slate-200 border border-slate-300 text-blue-600' : 'bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-blue-500/25'
                              }`}>
                                <Navigation size={20} />
                              </div>
                              <div className="min-w-0">
                                <span className={`text-[9px] font-black font-mono ${isLight ? 'text-sky-600' : 'text-sky-400'} uppercase tracking-widest`}>VERBLEIBEND</span>
                                <p className={`text-xl font-black leading-tight font-mono mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                  {formatDistance(data.navDistance)}
                                </p>
                                {getRemainingSeconds() ? (
                                  <span className={`text-[10px] font-bold ${isLight ? 'text-slate-500' : 'text-zinc-400'} font-mono`}>noch {formatRemainingTime(getRemainingSeconds()!)}</span>
                                ) : null}
                              </div>
                            </div>
                          )}
                          {data.plannedDistance && data.plannedDistance > 0 && (
                            <div className={`rounded-2xl ${isLight ? 'bg-slate-100/90 border-slate-250 text-slate-900' : 'bg-black/40 border-white/10 text-white'} backdrop-blur-xl p-3.5 flex-1 flex items-center gap-3.5 shadow-xl`}>
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                                isLight ? 'bg-slate-200 border border-slate-300 text-slate-700' : 'bg-gradient-to-tr from-zinc-700 to-zinc-600 text-zinc-200 shadow-zinc-600/25'
                              }`}>
                                <MapPin size={20} />
                              </div>
                              <div className="min-w-0">
                                <span className={`text-[9px] font-black font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'} uppercase tracking-widest`}>GEPLANTE STRECKE</span>
                                <p className={`text-xl font-black leading-tight font-mono mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                  {formatDistance(data.plannedDistance, true)}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Absender/Empfänger + Start/Ziel */}
                      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
                        <div className={`rounded-2xl ${isLight ? 'bg-slate-100/90 border-slate-250 text-slate-900' : 'bg-black/40 border-white/10 text-white'} backdrop-blur-xl p-4 space-y-2.5 shadow-xl flex flex-col justify-center`}>
                          {data.source_company && (
                            <div className="flex items-center justify-between">
                              <span className={`text-[9.5px] font-black font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'} uppercase tracking-wider`}>Absender</span>
                              <p className={`text-xs font-black truncate max-w-[160px] ${isLight ? 'bg-slate-200/80 text-slate-900 border-slate-300' : 'bg-black/50 text-white border-white/10'} px-2.5 py-1 rounded-xl border`}>{data.source_company}</p>
                            </div>
                          )}
                          {data.dest_company && (
                            <div className="flex items-center justify-between">
                              <span className="text-[9.5px] font-black font-mono text-primary uppercase tracking-wider">Empfänger</span>
                              <p className={`text-xs font-black truncate max-w-[160px] ${isLight ? 'bg-primary/10 text-primary border-primary/30' : 'bg-primary/15 text-primary border-primary/30'} px-2.5 py-1 rounded-xl border`}>{data.dest_company}</p>
                            </div>
                          )}
                          {!data.source_company && !data.dest_company && (
                            <p className={`text-xs ${isLight ? 'text-slate-400' : 'text-zinc-500'} font-bold text-center font-mono`}>Keine Firmendaten verfügbar</p>
                          )}
                        </div>

                        <div className={`rounded-2xl ${isLight ? 'bg-slate-100/90 border-slate-250 text-slate-900' : 'bg-black/40 border-white/10 text-white'} backdrop-blur-xl p-4 flex flex-col justify-center gap-3 shadow-xl`}>
                          <div className="flex items-center gap-3.5">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                              isLight ? 'bg-slate-200 border border-slate-300 text-emerald-600' : 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-500/25'
                            }`}>
                              <MapPin size={18} />
                            </div>
                            <div className="min-w-0">
                              <span className={`text-[9px] font-black font-mono ${isLight ? 'text-emerald-600' : 'text-emerald-400'} uppercase tracking-widest`}>STARTORT</span>
                              <p className={`text-base font-black leading-tight truncate mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>{data.source || '—'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3.5">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                              isLight ? 'bg-slate-200 border border-slate-300 text-amber-600' : 'bg-gradient-to-tr from-amber-600 to-orange-500 text-white shadow-orange-500/25'
                            }`}>
                              <Navigation size={18} />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[9px] font-black font-mono text-primary uppercase tracking-widest">ZIELORT</span>
                              <p className={`text-base font-black leading-tight truncate mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>{data.dest || '—'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative z-10">
                      <div className={`w-20 h-20 rounded-3xl ${isLight ? 'bg-slate-100 border border-slate-200 text-sky-600 shadow-md' : 'bg-gradient-to-tr from-sky-600 to-cyan-500 shadow-2xl shadow-sky-500/30 text-white'} flex items-center justify-center mb-3.5`}>
                        <Briefcase size={38} className="drop-shadow-md animate-pulse" />
                      </div>
                      <h3 className={`text-lg font-black font-mono uppercase tracking-wider mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>Kein aktiver Auftrag</h3>
                      <p className={`text-xs max-w-[300px] leading-relaxed font-medium ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                        Nimm am LKW-Terminal einen Auftrag an, um Frachtbrief und Routenverlauf hier live einzusehen.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- TRUCK DIAGNOSTICS & MULTI-PAGE COCKPIT TAB --- */}
            {activeTab === 'truck' && (
              <div className="w-full h-full relative rounded-2xl sm:rounded-3xl overflow-hidden p-1 sm:p-1.5 flex flex-col font-['Outfit',sans-serif]">
                {/* App Wallpaper Background from OPC Main App */}
                {renderCarPlayWallpaper()}

                <div className={`flex-1 flex flex-col p-4 rounded-3xl ${isLight ? 'bg-white/90 border-slate-250 shadow-xl text-slate-900' : 'bg-black/40 border-white/10 shadow-2xl text-white'} backdrop-blur-md overflow-hidden justify-between relative select-none z-10 m-0.5`}>
                  {/* Background Aura Glows */}
                  <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/15 rounded-full blur-3xl pointer-events-none" />

                  {/* Header: Title, Page Switcher and LKW Status */}
                  <div className="flex items-center justify-between mb-2 border-b border-white/10 pb-2 shrink-0 relative z-20">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isLight
                          ? 'bg-slate-100 border border-slate-200 text-slate-800 shadow-sm'
                          : 'bg-gradient-to-tr from-amber-600 to-orange-500 shadow-md shadow-orange-500/25 text-white'
                      }`}>
                        <Truck size={18} className="stroke-[2.2] drop-shadow-md" />
                      </div>
                      <div className="flex items-center gap-2">
                        {telemetry.connected ? (
                          <span className="flex items-center gap-1 text-[8.5px] font-mono font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
                          </span>
                        ) : (
                          <span className="text-[8.5px] font-mono font-bold text-zinc-500 bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 rounded-full">
                            STANDBY
                          </span>
                        )}
                        <span className="text-[10px] font-mono font-bold text-primary bg-primary/15 border border-primary/30 px-2 py-0.5 rounded-full shrink-0">
                          {truckPage + 1}/3
                        </span>
                        {telemetry.connected && data.brand && (
                          <span className="text-[10px] font-mono text-zinc-300 font-bold hidden sm:inline-block">
                            {data.brand} {data.model || ''}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Integrated Automotive Cluster Dock Page Switcher */}
                    <div className={`flex items-center gap-1.5 ${isLight ? 'bg-slate-100/90 border-slate-250 shadow-md text-slate-800' : 'bg-black/50 border-white/10 shadow-2xl text-white'} backdrop-blur-md border p-1.5 rounded-2xl`}>
                      {/* Prev Arrow */}
                      <button
                        onClick={() => setTruckPage(prev => (prev - 1 + 3) % 3)}
                        className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-primary/20 active:scale-95 border border-white/[0.08] hover:border-primary/40 flex items-center justify-center text-zinc-300 hover:text-primary transition-all cursor-pointer group"
                        title="Vorherige Seite (←)"
                      >
                        <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                      </button>

                      {/* 3 Segmented Page Pills */}
                      <div className="flex items-center gap-1">
                        {[
                          { id: 0, label: 'Cockpit', num: '01', icon: Gauge },
                          { id: 1, label: 'Bordcomputer', num: '02', icon: Fuel },
                          { id: 2, label: 'Diagnose', num: '03', icon: Wrench },
                        ].map(tab => {
                          const Icon = tab.icon;
                          const isActive = truckPage === tab.id;
                          return (
                            <button
                              key={tab.id}
                              onClick={() => setTruckPage(tab.id)}
                              className={`px-3.5 py-1.5 rounded-xl font-mono text-xs transition-all duration-200 cursor-pointer flex items-center gap-2 select-none ${
                                isActive
                                  ? 'bg-primary text-[var(--primary-foreground)] font-black shadow-[0_0_18px_var(--primary-glow)] scale-[1.02]'
                                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.08] border border-transparent'
                              }`}
                            >
                              <Icon size={14} className={isActive ? 'text-[var(--primary-foreground)] stroke-[2.4]' : 'text-zinc-400'} />
                              <span className="font-black tracking-tight">{tab.label}</span>
                              <span className={`text-[8.5px] px-1 py-0.2 rounded font-mono font-bold ${isActive ? 'bg-black/25 text-[var(--primary-foreground)]' : 'bg-white/10 text-zinc-400'}`}>
                                {tab.num}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Next Arrow */}
                      <button
                        onClick={() => setTruckPage(prev => (prev + 1) % 3)}
                        className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-primary/20 active:scale-95 border border-white/[0.08] hover:border-primary/40 flex items-center justify-center text-zinc-300 hover:text-primary transition-all cursor-pointer group"
                        title="Nächste Seite (→)"
                      >
                        <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>

                  {!telemetry.connected ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative z-10">
                      <div className={`w-16 h-16 rounded-2xl ${isLight ? 'bg-slate-100 border-slate-250 text-primary' : 'bg-white/[0.04] border-white/10 text-primary'} border flex items-center justify-center mb-3 shadow-lg backdrop-blur-xl`}>
                        <Truck size={32} className="text-primary animate-pulse" />
                      </div>
                      <h3 className={`text-base font-black font-mono uppercase tracking-wider mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>Keine Telemetrie-Verbindung</h3>
                      <p className={`text-xs max-w-[340px] leading-relaxed font-medium ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                        Starte Euro Truck Simulator 2 oder American Truck Simulator mit dem Telemetrie-Plugin, um Fahrzeug-Diagnose in Echtzeit anzuzeigen.
                      </p>
                    </div>
                  ) : (
                    /* Multi-Page Content Area */
                    <div className="flex-1 flex flex-col min-h-0 relative z-10">
                      <AnimatePresence mode="wait">
                        {/* ============================================================ */}
                        {/* SEITE 1: COCKPIT & ANTRIEB (Große Instrumente & Fahrdynamik) */}
                        {/* ============================================================ */}
                        {truckPage === 0 && (
                          <motion.div
                            key="page-cockpit"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.18 }}
                            className="flex-1 grid grid-cols-12 gap-3.5 min-h-0 items-stretch"
                          >
                            {/* Left Side: Massive Speedometer Hero Card */}
                            <div className="col-span-6 rounded-2xl bg-black/40 border border-white/10 hover:border-primary/50 hover:shadow-[0_0_20px_var(--primary-glow)] backdrop-blur-xl p-5 flex flex-col justify-between relative overflow-hidden group shadow-xl hover:z-20 transition-all">
                              {/* Top Bar: Limit Badge & Tempomat */}
                              <div className="flex items-center justify-between z-10 border-b border-white/[0.08] pb-2">
                                <span className={`text-[10px] font-mono font-black uppercase tracking-wider ${c.mutedText} flex items-center gap-1.5`}>
                                  <Gauge size={13} className="text-primary" /> GESCHWINDIGKEIT & LIMIT
                                </span>
                                {data.speedLimit && data.speedLimit > 0 ? (
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-7 h-7 rounded-full bg-white border-2 border-red-600 flex items-center justify-center text-zinc-950 font-black font-mono text-xs shadow-md leading-none shrink-0 ${
                                        isOverspeed ? 'animate-bounce shadow-[0_0_12px_rgba(244,63,94,0.7)]' : ''
                                      }`}
                                      title={`Tempolimit: ${Math.round(data.speedLimit)} km/h`}
                                    >
                                      {Math.round(data.speedLimit)}
                                    </div>
                                    <span className="text-[9px] font-mono font-bold text-zinc-400">LIMIT</span>
                                  </div>
                                ) : (
                                  <span className="text-[9px] font-mono text-zinc-500 font-bold">FREIE FAHRT</span>
                                )}
                              </div>

                              {/* Center Hero: Giant Digital Speedometer Readout */}
                              <div className="my-auto flex flex-col items-center justify-center py-2 z-10 text-center">
                                <div className="flex items-baseline justify-center gap-2">
                                  <span
                                    className={`font-black font-mono tracking-tighter tabular-nums leading-none drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] ${
                                      isOverspeed ? 'text-rose-400 animate-pulse' : 'text-white'
                                    }`}
                                    style={{ fontSize: '84px', lineHeight: '1' }}
                                  >
                                    {Math.round(data.speed || 0)}
                                  </span>
                                  <span className="text-xl font-black uppercase font-mono tracking-widest text-primary">
                                    KM/H
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono font-bold text-zinc-400 mt-1 uppercase tracking-wider">
                                  {isOverspeed ? '⚠️ TEMPOLIMIT ÜBERSCHRITTEN' : 'AKTUELLES FAHRTEMPO'}
                                </span>
                              </div>

                              {/* Bottom: Speed Bar & Status Badges */}
                              <div className="space-y-2 z-10">
                                <div className="w-full h-2 bg-black/80 rounded-full overflow-hidden border border-white/10 p-0.5 shadow-inner">
                                  <div
                                    className={`h-full transition-all duration-200 rounded-full ${
                                      isOverspeed
                                        ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.9)]'
                                        : 'bg-primary shadow-[0_0_10px_var(--primary-glow)]'
                                    }`}
                                    style={{ width: `${Math.min(100, ((data.speed || 0) / 130) * 100)}%` }}
                                  />
                                </div>
                                <div className="flex items-center justify-between text-[9.5px] font-mono pt-1">
                                  <span className={`px-2 py-0.5 rounded-lg border font-bold ${
                                    data.cruiseControl && data.cruiseControl > 0
                                      ? 'text-sky-300 bg-sky-500/15 border-sky-500/30'
                                      : 'text-zinc-500 bg-white/[0.03] border-white/[0.06]'
                                  }`}>
                                    {data.cruiseControl && data.cruiseControl > 0 ? `TEMPOMAT: ${Math.round(data.cruiseControl)} KM/H` : 'TEMPOMAT: AUS'}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-lg border font-bold ${
                                    data.parkBrake
                                      ? 'text-rose-400 bg-rose-500/15 border-rose-500/30'
                                      : 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
                                  }`}>
                                    {data.parkBrake ? 'PARKBREMSE AKTIV' : 'FAHRBEREIT'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Right Side: Massive Gear Indicator & Rev-Counter Cluster */}
                            <div className="col-span-6 rounded-2xl bg-black/40 border border-white/10 hover:border-primary/50 hover:shadow-[0_0_20px_var(--primary-glow)] backdrop-blur-xl p-5 flex flex-col justify-between relative overflow-hidden group shadow-xl hover:z-20 transition-all">
                              {/* Top Half: Huge Gear Readout */}
                              <div className="flex flex-col justify-between border-b border-white/[0.08] pb-3 z-10">
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`text-[10px] font-mono font-black uppercase tracking-wider ${c.mutedText} flex items-center gap-1.5`}>
                                    <Settings size={13} className="text-primary" /> GETRIEBE & FAHRSTUFE
                                  </span>
                                  <span className={`text-[9px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${
                                    (data.gear || 0) > 0
                                      ? 'text-primary bg-primary/15 border-primary/35'
                                      : (data.gear || 0) < 0
                                      ? 'text-rose-300 bg-rose-500/20 border-rose-500/40'
                                      : 'text-emerald-300 bg-emerald-500/15 border-emerald-500/35'
                                  }`}>
                                    {(data.gear || 0) > 0 ? 'VORWÄRTSGANG' : (data.gear || 0) < 0 ? 'RÜCKWÄRTS' : 'LEERLAUF'}
                                  </span>
                                </div>

                                <div className="flex items-center justify-center gap-4 my-2">
                                  <span
                                    className={`font-black font-mono tracking-tight leading-none px-6 py-1.5 rounded-2xl border-2 shadow-2xl ${
                                      (data.gear || 0) > 0
                                        ? 'text-primary bg-primary/20 border-primary/50 shadow-[0_0_30px_var(--primary-glow)]'
                                        : (data.gear || 0) < 0
                                        ? 'text-rose-300 bg-rose-500/25 border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.45)]'
                                        : 'text-emerald-300 bg-emerald-500/20 border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.35)]'
                                    }`}
                                    style={{ fontSize: '56px', minWidth: '100px', textAlign: 'center' }}
                                  >
                                    {(data.gear || 0) > 0 ? `D${data.gear}` : (data.gear || 0) < 0 ? `R${Math.abs(data.gear || 0)}` : 'N'}
                                  </span>
                                </div>
                              </div>

                              {/* Bottom Half: Full-Width RPM Gauge */}
                              <div className="flex flex-col gap-2 pt-2 z-10">
                                <div className="flex items-center justify-between">
                                  <span className={`text-[10px] font-mono font-black uppercase tracking-wider ${c.mutedText} flex items-center gap-1.5`}>
                                    <Zap size={13} className="text-primary" /> MOTORDREHZAHL
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[8.5px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                                      (data.rpm || 0) > 1800
                                        ? 'text-rose-400 bg-rose-500/20 border-rose-500/40 animate-pulse'
                                        : (data.rpm || 0) >= 900 && (data.rpm || 0) <= 1500
                                        ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
                                        : 'text-primary bg-primary/10 border-primary/20'
                                    }`}>
                                      {(data.rpm || 0) > 1800 ? 'HIGH RPM' : (data.rpm || 0) >= 900 && (data.rpm || 0) <= 1500 ? 'ECO ZONE' : 'POWER'}
                                    </span>
                                    <span className="text-2xl font-black font-mono text-white tabular-nums">
                                      {Math.round(data.rpm || 0)} <span className="text-xs text-primary">U/MIN</span>
                                    </span>
                                  </div>
                                </div>

                                {/* 24-Segment LED Rev Counter Bar */}
                                <div className="flex gap-1 h-3.5 w-full bg-black/80 p-0.5 rounded-xl border border-white/10 shadow-inner">
                                  {Array.from({ length: 24 }).map((_, i) => {
                                    const activeBars = Math.round((Math.min(2500, data.rpm || 0) / 2500) * 24);
                                    const isActive = i < activeBars;
                                    const isRedline = i >= 18; // 1875+ RPM
                                    const isPower = i >= 14 && i < 18; // 1450-1875 RPM
                                    return (
                                      <div
                                        key={i}
                                        className={`flex-1 rounded-xs transition-all duration-150 ${
                                          isActive
                                            ? isRedline
                                              ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]'
                                              : isPower
                                              ? 'bg-primary shadow-[0_0_8px_var(--primary-glow)]'
                                              : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]'
                                            : 'bg-white/[0.04]'
                                        }`}
                                      />
                                    );
                                  })}
                                </div>

                                <div className="flex justify-between text-[8px] font-mono font-bold text-zinc-500 px-0.5">
                                  <span>0</span>
                                  <span className="text-emerald-400">1000 ECO</span>
                                  <span>1600</span>
                                  <span className="text-rose-400">2500 RPM</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* ============================================================ */}
                        {/* SEITE 2: BORDCOMPUTER & TANK (Große 2x2 Kacheln)              */}
                        {/* ============================================================ */}
                        {truckPage === 1 && (
                          <motion.div
                            key="page-trip"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.18 }}
                            className="flex-1 grid grid-cols-2 gap-3.5 min-h-0 items-stretch"
                          >
                            {/* Card 1: Tankstand */}
                            <div className={`rounded-2xl ${isLight ? 'bg-slate-100/90 border-slate-200/90 text-slate-800' : 'bg-black/40 border-white/10 text-white'} backdrop-blur-xl p-4 flex flex-col justify-between shadow-xl relative overflow-hidden group`}>
                              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 z-10">
                                <span className={`text-[10px] font-mono font-black uppercase tracking-wider ${c.mutedText} flex items-center gap-1.5`}>
                                  <Fuel size={14} className="text-amber-400" /> KRAFTSTOFFTANK
                                </span>
                                <span className={`text-[8.5px] font-mono font-black uppercase px-2 py-0.5 rounded-lg border ${
                                  data.fuelWarning
                                    ? 'text-rose-300 bg-rose-500/20 border-rose-500/40 animate-pulse'
                                    : 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
                                }`}>
                                  {data.fuelWarning ? '⚠️ RESERVE' : '✅ TANKSTAND OK'}
                                </span>
                              </div>

                              <div className="my-auto flex items-baseline gap-2 z-10">
                                <span style={{ fontSize: '52px' }} className={`font-mono font-black ${isLight ? 'text-slate-900' : 'text-white'} leading-none tabular-nums tracking-tight`}>
                                  {Math.round(data.fuel || 0)}
                                </span>
                                <span className="text-lg font-black font-mono text-primary">
                                  LITER
                                </span>
                              </div>

                              {/* 10-Segment Fuel Gauge Bar */}
                              <div className="space-y-1.5 z-10">
                                <div className="flex gap-1 h-2.5 w-full bg-black/80 rounded-lg p-0.5 border border-white/10 shadow-inner">
                                  {Array.from({ length: 10 }).map((_, i) => {
                                    const activeBars = Math.round((Math.min(400, data.fuel || 0) / 400) * 10);
                                    const isActive = i < activeBars;
                                    return (
                                      <div
                                        key={i}
                                        className={`flex-1 rounded-xs transition-all ${
                                          isActive
                                            ? i < 2
                                              ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]'
                                              : 'bg-primary shadow-[0_0_6px_var(--primary-glow)]'
                                            : 'bg-white/[0.04]'
                                        }`}
                                      />
                                    );
                                  })}
                                </div>
                                <div className="text-[9px] font-mono text-zinc-400 truncate">
                                  {data.fuelWarning ? 'Nächste Tankstelle ansteuern' : 'Fahrzeug ausreichend betankt'}
                                </div>
                              </div>
                            </div>

                            {/* Card 2: Restreichweite */}
                            <div className={`rounded-2xl ${isLight ? 'bg-slate-100/90 border-slate-200/90 text-slate-800' : 'bg-black/40 border-white/10 text-white'} backdrop-blur-xl p-4 flex flex-col justify-between shadow-xl relative overflow-hidden group`}>
                              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 z-10">
                                <span className={`text-[10px] font-mono font-black uppercase tracking-wider ${c.mutedText} flex items-center gap-1.5`}>
                                  <Navigation size={14} className="text-sky-400" /> RESTREICHWEITE
                                </span>
                                <span className="text-[8.5px] font-mono font-black text-sky-300 bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 rounded-lg">
                                  {(data.fuelRange || 0) > 400 ? 'LANGSTRECKE' : 'NACHTANKEN'}
                                </span>
                              </div>

                              <div className="my-auto flex items-baseline gap-2 z-10">
                                <span style={{ fontSize: '52px' }} className={`font-mono font-black ${isLight ? 'text-slate-900' : 'text-white'} leading-none tabular-nums tracking-tight`}>
                                  {Math.round(data.fuelRange || 0)}
                                </span>
                                <span className="text-lg font-black font-mono text-sky-400">
                                  KM
                                </span>
                              </div>

                              <div className="space-y-1.5 z-10">
                                <div className="w-full h-2.5 bg-black/80 rounded-lg overflow-hidden border border-white/10 p-0.5 shadow-inner">
                                  <div
                                    className="h-full bg-gradient-to-r from-sky-500 to-sky-300 rounded-md shadow-[0_0_8px_rgba(56,189,248,0.7)] transition-all duration-300"
                                    style={{ width: `${Math.min(100, Math.max(5, ((data.fuelRange || 0) / 1000) * 100))}%` }}
                                  />
                                </div>
                                <div className="text-[9px] font-mono text-zinc-400 truncate">
                                  Berechnete Reichweite basierend auf aktuellem Fahrstil
                                </div>
                              </div>
                            </div>

                            {/* Card 3: Ø Kraftstoffverbrauch */}
                            <div className={`rounded-2xl ${isLight ? 'bg-slate-100/90 border-slate-200/90 text-slate-800' : 'bg-black/40 border-white/10 text-white'} backdrop-blur-xl p-4 flex flex-col justify-between shadow-xl relative overflow-hidden group`}>
                              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 z-10">
                                <span className={`text-[10px] font-mono font-black uppercase tracking-wider ${c.mutedText} flex items-center gap-1.5`}>
                                  <Activity size={14} className="text-emerald-400" /> Ø VERBRAUCH
                                </span>
                                <span className="text-[8.5px] font-mono font-black text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                                  DIESEL-EFFIZIENZ
                                </span>
                              </div>

                              <div className="my-auto flex items-baseline gap-2 z-10">
                                <span style={{ fontSize: '52px' }} className={`font-mono font-black ${isLight ? 'text-slate-900' : 'text-white'} leading-none tabular-nums tracking-tight`}>
                                  {data.avgConsumption && data.avgConsumption > 0 ? (data.avgConsumption * 100).toFixed(1) : '—'}
                                </span>
                                <span className="text-lg font-black font-mono text-emerald-400">
                                  L / 100 KM
                                </span>
                              </div>

                              <div className="text-[9px] font-mono text-zinc-400 truncate z-10">
                                Echtzeit-Durchschnittsverbrauch des LKW-Motors
                              </div>
                            </div>

                            {/* Card 4: Rest-Lenkzeit & Pause */}
                            <div className={`rounded-2xl ${isLight ? 'bg-slate-100/90 border-slate-200/90 text-slate-800' : 'bg-black/40 border-white/10 text-white'} backdrop-blur-xl p-4 flex flex-col justify-between shadow-xl relative overflow-hidden group`}>
                              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 z-10">
                                <span className={`text-[10px] font-mono font-black uppercase tracking-wider ${c.mutedText} flex items-center gap-1.5`}>
                                  <Clock size={14} className="text-purple-400" /> LENKZEIT & PAUSE
                                </span>
                                <span className={`text-[8.5px] font-mono font-black uppercase px-2 py-0.5 rounded-lg border ${
                                  (data.nextRest || 0) > 60
                                    ? 'text-purple-300 bg-purple-500/15 border-purple-500/30'
                                    : 'text-primary bg-primary/20 border-primary/40 animate-pulse'
                                }`}>
                                  {(data.nextRest || 0) > 60 ? 'LENKZEIT OK' : 'PAUSE ERFORDERLICH'}
                                </span>
                              </div>

                              <div className="my-auto flex items-baseline gap-2 z-10">
                                <span style={{ fontSize: '38px' }} className={`font-mono font-black ${isLight ? 'text-slate-900' : 'text-white'} leading-none tracking-tight`}>
                                  {data.nextRest && data.nextRest > 0 ? formatRemainingTime(data.nextRest * 60) : 'KEINE PAUSE'}
                                </span>
                              </div>

                              <div className="text-[9px] font-mono text-zinc-400 truncate z-10">
                                Verbleibende Fahrzeit bis zur nächsten gesetzlichen Ruhepause
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* ============================================================ */}
                        {/* SEITE 3: DIAGNOSE & ZUSTAND (Große Schadens- & Sensor-Kacheln)*/}
                        {/* ============================================================ */}
                        {truckPage === 2 && (
                          <motion.div
                            key="page-diagnostics"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.18 }}
                            className="flex-1 flex flex-col justify-between gap-3.5 min-h-0"
                          >
                            {/* Top Row: 2 Big Damage / Health Cards */}
                            <div className="grid grid-cols-2 gap-3.5 flex-1 min-h-0">
                              {/* Card 1: LKW-Zustand */}
                              <div className={`rounded-2xl ${isLight ? 'bg-slate-100/90 border-slate-200/90 text-slate-800' : 'bg-black/40 border-white/10 text-white'} backdrop-blur-xl p-4 flex flex-col justify-between shadow-xl relative overflow-hidden group`}>
                                <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 z-10">
                                  <span className={`text-[10px] font-mono font-black uppercase tracking-wider ${c.mutedText} flex items-center gap-1.5`}>
                                    <Wrench size={14} className="text-primary" /> LKW-VERSCHLEISS & CHASSIS
                                  </span>
                                  <span className={`text-[8.5px] font-mono font-black uppercase px-2 py-0.5 rounded-lg border ${
                                    (data.wearTruck || 0) > 15
                                      ? 'text-rose-400 bg-rose-500/20 border-rose-500/40 animate-pulse'
                                      : (data.wearTruck || 0) > 5
                                      ? 'text-primary bg-primary/15 border-primary/30'
                                      : 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
                                  }`}>
                                    {(data.wearTruck || 0) > 15 ? '⚠️ REPARATUR NÖTIG' : (data.wearTruck || 0) > 5 ? '🟡 LEICHTER VERSCHLEISS' : '🟢 TOP-ZUSTAND'}
                                  </span>
                                </div>

                                <div className="my-auto flex items-baseline gap-2 z-10">
                                  <span style={{ fontSize: '48px' }} className={`font-mono font-black ${isLight ? 'text-slate-900' : 'text-white'} leading-none tabular-nums tracking-tight`}>
                                    {(100 - (data.wearTruck || 0)).toFixed(1)}%
                                  </span>
                                  <span className="text-lg font-black font-mono text-emerald-400">
                                    OK
                                  </span>
                                </div>

                                <div className="space-y-1.5 z-10">
                                  <div className="w-full h-2.5 bg-black/80 rounded-lg overflow-hidden border border-white/10 p-0.5 shadow-inner">
                                    <div
                                      className={`h-full rounded-md transition-all duration-500 ${
                                        (data.wearTruck || 0) > 15
                                          ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                                          : (data.wearTruck || 0) > 5
                                          ? 'bg-primary shadow-[0_0_8px_var(--primary-glow)]'
                                          : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                                      }`}
                                      style={{ width: `${Math.max(5, 100 - (data.wearTruck || 0))}%` }}
                                    />
                                  </div>
                                  <div className="text-[9px] font-mono text-zinc-400 truncate">
                                    Motor-, Getriebe-, Reifen- & Kabinenabnutzung: {(data.wearTruck || 0).toFixed(1)}%
                                  </div>
                                </div>
                              </div>

                              {/* Card 2: Frachtschaden */}
                              <div className={`rounded-2xl ${isLight ? 'bg-slate-100/90 border-slate-200/90 text-slate-800' : 'bg-black/40 border-white/10 text-white'} backdrop-blur-xl p-4 flex flex-col justify-between shadow-xl relative overflow-hidden group`}>
                                <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 z-10">
                                  <span className={`text-[10px] font-mono font-black uppercase tracking-wider ${c.mutedText} flex items-center gap-1.5`}>
                                    <Briefcase size={14} className="text-purple-400" /> FRACHTSICHERHEIT & LADUNG
                                  </span>
                                  <span className={`text-[8.5px] font-mono font-black uppercase px-2 py-0.5 rounded-lg border ${
                                    (data.wearCargo || 0) > 0
                                      ? 'text-rose-400 bg-rose-500/20 border-rose-500/40 animate-pulse'
                                      : 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
                                  }`}>
                                    {(data.wearCargo || 0) > 0 ? '⚠️ FRACHTBEEINTRÄCHTIGUNG' : '✅ 100% UNBESCHÄDIGT'}
                                  </span>
                                </div>

                                <div className="my-auto flex flex-col justify-center z-10">
                                  <div className="flex items-baseline gap-2">
                                    <span style={{ fontSize: '48px' }} className={`font-mono font-black ${isLight ? 'text-slate-900' : 'text-white'} leading-none tabular-nums tracking-tight`}>
                                      {(data.wearCargo || 0).toFixed(1)}%
                                    </span>
                                    <span className="text-lg font-black font-mono text-rose-400">
                                      SCHADEN
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-mono font-bold text-zinc-300 mt-1 truncate">
                                    Ladung: <strong className="text-white">{data.cargo && data.cargo.toLowerCase() !== 'none' ? data.cargo : 'Keine Ladung aktiv'}</strong>
                                  </span>
                                </div>

                                <div className="space-y-1.5 z-10">
                                  <div className="w-full h-2.5 bg-black/80 rounded-lg overflow-hidden border border-white/10 p-0.5 shadow-inner">
                                    <div
                                      className={`h-full rounded-md transition-all duration-500 ${
                                        (data.wearCargo || 0) > 0
                                          ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                                          : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                                      }`}
                                      style={{ width: `${Math.max(5, (data.wearCargo || 0))}%` }}
                                    />
                                  </div>
                                  <div className="text-[9px] font-mono text-zinc-400 truncate">
                                    {(data.wearCargo || 0) > 0 ? 'Schadensabzug bei Frachtablieferung droht' : 'Frachtgut befindet sich in sicherem Zustand'}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Bottom Section: 5 Spacious System Warning Sensor Tiles */}
                            <div className="grid grid-cols-5 gap-2.5 z-10 shrink-0">
                              {[
                                { label: 'ÖLDRUCK', status: data.oilPressureWarning ? 'KRITISCH' : 'OPTIMAL', warn: !!data.oilPressureWarning, icon: AlertTriangle, desc: 'Motoröldruck' },
                                { label: 'KÜHLWASSER', status: data.waterTemperatureWarning ? 'ÜBERHITZT' : 'NORMAL', warn: !!data.waterTemperatureWarning, icon: Thermometer, desc: 'Kühlkreislauf' },
                                { label: 'BREMSLUFT', status: data.airPressureWarning ? 'DRUCKVERLUST' : 'VOLLE KRAFT', warn: !!data.airPressureWarning, icon: Gauge, desc: 'Druckluftkreis' },
                                { label: 'BORDELEKTRIK', status: data.batteryVoltageWarning ? 'UNTERSPANNUNG' : '24V BEREIT', warn: !!data.batteryVoltageWarning, icon: Zap, desc: 'Batteriesystem' },
                                { label: 'HANDBREMSE', status: data.parkBrake ? 'FESTGESTELLT' : 'GELÖST', warn: false, isPark: !!data.parkBrake, icon: ShieldCheck, desc: 'Feststellbremse' },
                              ].map((sensor, idx) => {
                                const IconComp = sensor.icon;
                                return (
                                  <div
                                    key={idx}
                                    className={`p-3 rounded-2xl border transition-all flex flex-col justify-between ${
                                      sensor.warn
                                        ? 'bg-rose-950/40 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse'
                                        : isLight
                                        ? 'bg-slate-100/90 border-slate-200/90 hover:border-slate-300 shadow-sm'
                                        : 'bg-black/40 border-white/10 hover:border-white/20 backdrop-blur-xl shadow-md'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <IconComp size={16} className={sensor.warn ? 'text-rose-400' : sensor.isPark ? 'text-primary' : 'text-emerald-400'} />
                                      <span className={`text-[8px] font-mono font-black px-1.5 py-0.5 rounded-md ${
                                        sensor.warn
                                          ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                                          : sensor.isPark
                                          ? 'bg-primary/25 text-primary border-primary/40'
                                          : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                      }`}>
                                        {sensor.status}
                                      </span>
                                    </div>
                                    <div>
                                      <div className={`text-[10px] font-black font-mono tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{sensor.label}</div>
                                      <div className="text-[8px] font-mono text-zinc-400 mt-0.5">{sensor.desc}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Floating Side Edge Page Navigators */}
                      <button
                        onClick={() => setTruckPage(prev => (prev - 1 + 3) % 3)}
                        className="absolute -left-2 top-1/2 -translate-y-1/2 z-30 w-8 h-16 rounded-r-2xl bg-black/70 hover:bg-primary/25 active:scale-95 backdrop-blur-xl border border-white/10 hover:border-primary/50 flex items-center justify-center text-zinc-400 hover:text-primary transition-all opacity-40 hover:opacity-100 shadow-2xl cursor-pointer group"
                        title="Vorherige Seite (←)"
                      >
                        <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                      </button>

                      <button
                        onClick={() => setTruckPage(prev => (prev + 1) % 3)}
                        className="absolute -right-2 top-1/2 -translate-y-1/2 z-30 w-8 h-16 rounded-l-2xl bg-black/70 hover:bg-primary/25 active:scale-95 backdrop-blur-xl border border-white/10 hover:border-primary/50 flex items-center justify-center text-zinc-400 hover:text-primary transition-all opacity-40 hover:opacity-100 shadow-2xl cursor-pointer group"
                        title="Nächste Seite (→)"
                      >
                        <ChevronRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
                      </button>
                      {/* Bottom Interactive Pagination Bar */}
                      <div className="flex items-center justify-center gap-2 pt-2 shrink-0 z-20">
                        {[
                          { id: 0, label: 'Cockpit & Antrieb' },
                          { id: 1, label: 'Bordcomputer & Tank' },
                          { id: 2, label: 'Diagnose & Zustand' },
                        ].map((item) => {
                          const isActive = truckPage === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => setTruckPage(item.id)}
                              className={`h-2 transition-all duration-300 rounded-full cursor-pointer flex items-center ${
                                isActive
                                  ? 'w-10 bg-primary shadow-[0_0_12px_var(--primary-glow)]'
                                  : 'w-2.5 bg-white/20 hover:bg-white/40'
                              }`}
                              title={`Seite ${item.id + 1}: ${item.label}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- LKW-STEUERUNG & ADAPTIVE SEITENANSICHT STANDALONE APP ('control') --- */}
            {activeTab === 'control' && (
              <div className="w-full h-full relative rounded-2xl sm:rounded-3xl overflow-hidden p-1 sm:p-1.5 flex flex-col font-['Outfit',sans-serif]">
                {/* App Wallpaper Background from OPC Main App */}
                {renderCarPlayWallpaper()}

                <div className={`flex-1 flex flex-col p-3.5 sm:p-4 rounded-3xl ${isLight ? 'bg-white/90 border-slate-250 shadow-xl text-slate-900' : 'bg-black/45 border-white/10 shadow-2xl text-white'} backdrop-blur-md overflow-hidden justify-between relative z-10 m-0.5`}>
                  <TruckSideView
                    telemetry={telemetry}
                    isLight={isLight}
                    focusZone={focusZone}
                    contentIndex={contentIndex}
                    showHeader={true}
                  />
                </div>
              </div>
            )}

            {/* --- SETTINGS TAB (MULTI-PAGE AUTOMOTIVE COCKPIT DESIGN) --- */}
            {activeTab === 'settings' && (
              <div className="w-full h-full relative rounded-2xl sm:rounded-3xl overflow-hidden p-1 sm:p-1.5 flex flex-col font-['Outfit',sans-serif]">
                {/* App Wallpaper Background from OPC Main App */}
                {renderCarPlayWallpaper()}

                <div className={`flex-1 flex flex-col p-3.5 sm:p-4 rounded-3xl ${isLight ? 'bg-white/90 border-slate-250 shadow-xl text-slate-900' : 'bg-black/45 border-white/10 shadow-2xl text-white'} backdrop-blur-md overflow-hidden justify-between relative z-10 m-0.5`}>
                  {/* Settings Header with Segmented Page Switcher Dock */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 shrink-0 relative z-20 gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 shrink-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isLight
                          ? 'bg-slate-100 border border-slate-200 text-slate-800 shadow-sm'
                          : 'bg-gradient-to-tr from-zinc-700 to-slate-600 shadow-md shadow-zinc-600/25 text-white'
                      }`}>
                        <Settings size={18} className="stroke-[2.2] drop-shadow-md" />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-primary bg-primary/15 border border-primary/30 px-2.5 py-1 rounded-full shrink-0">
                        {settingsPage + 1}/3
                      </span>
                    </div>

                    {/* Segmented Page Switcher */}
                    <div className={`flex items-center gap-1.5 ${isLight ? 'bg-slate-100/90 border-slate-250 shadow-md text-slate-800' : 'bg-black/50 border-white/10 shadow-2xl text-white'} backdrop-blur-md border p-1 rounded-2xl shrink-0`}>
                      <button
                        onClick={() => setSettingsPage(prev => (prev - 1 + 3) % 3)}
                        className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-primary/20 active:scale-95 border border-white/[0.08] hover:border-primary/40 flex items-center justify-center text-zinc-300 hover:text-primary transition-all cursor-pointer group shrink-0"
                        title="Vorherige Seite (←)"
                      >
                        <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                      </button>

                      <div className="flex items-center gap-1">
                        {[
                          { id: 0, label: 'Design', num: '01', icon: Monitor },
                          { id: 1, label: 'Warnungen', num: '02', icon: AlertTriangle },
                          { id: 2, label: 'System', num: '03', icon: Activity },
                        ].map(tab => {
                          const Icon = tab.icon;
                          const isActive = settingsPage === tab.id;
                          const isTabFocused = focusZone === 'content' && contentIndex === -1 && isActive;
                          return (
                            <button
                              key={tab.id}
                              data-item-focused={isTabFocused ? "true" : undefined}
                              onClick={() => { setSettingsPage(tab.id); setContentIndex(0); }}
                              className={`px-2 sm:px-2.5 py-1 rounded-lg font-mono text-xs transition-all duration-200 cursor-pointer flex items-center gap-1.5 select-none shrink-0 ${
                                isTabFocused
                                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-black bg-primary text-[var(--primary-foreground)] font-black shadow-[0_0_18px_var(--primary-glow)] scale-105'
                                  : isActive
                                  ? 'bg-primary text-[var(--primary-foreground)] font-black shadow-[0_0_15px_var(--primary-glow)] scale-[1.02]'
                                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.08] border border-transparent'
                              }`}
                            >
                              <Icon size={13} className={isActive ? 'text-[var(--primary-foreground)] stroke-[2.4]' : 'text-zinc-400'} />
                              <span className="font-black tracking-tight">{tab.label}</span>
                              <span className={`text-[8px] px-1 py-0.2 rounded font-mono font-bold ${isActive ? 'bg-black/25 text-[var(--primary-foreground)]' : 'bg-white/10 text-zinc-400'}`}>
                                {tab.num}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => setSettingsPage(prev => (prev + 1) % 3)}
                        className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-primary/20 active:scale-95 border border-white/[0.08] hover:border-primary/40 flex items-center justify-center text-zinc-300 hover:text-primary transition-all cursor-pointer group shrink-0"
                        title="Nächste Seite (→)"
                      >
                        <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>

                  {/* Multi-Page Content Area with AnimatePresence (Strict Overflow-Hidden, No Scrollbars) */}
                  <div className="flex-1 flex flex-col min-h-0 relative z-10 overflow-hidden">
                    <AnimatePresence mode="wait">
                      {/* ============================================================ */}
                      {/* SEITE 1: DESIGN, THEMES & ANZEIGE */}
                      {/* ============================================================ */}
                      {settingsPage === 0 && (
                        <motion.div
                          key="settings-page-0"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.18 }}
                          className="flex flex-col justify-between flex-1 min-h-0 overflow-hidden gap-2"
                        >
                          {/* Upper 2x2 Grid for the 4 Option Boxes */}
                          <div className="grid grid-cols-2 gap-2 flex-1 min-h-0 overflow-hidden">
                            {/* Box 1: CarPlay Theme */}
                            <div className="rounded-xl bg-black/40 border border-white/10 backdrop-blur-xl p-2.5 shadow-md flex flex-col justify-between min-h-0 overflow-hidden">
                              <span className="text-[9.5px] font-mono font-black text-amber-400 uppercase tracking-widest block truncate mb-1">
                                🎨 CARPLAY-FARBDESIGN
                              </span>
                              <div className="grid grid-cols-3 gap-1.5 flex-1 min-h-0">
                                {[
                                  { id: 'dark', label: 'Dunkel', desc: 'Nacht', icon: '🌙' },
                                  { id: 'light', label: 'Hell', desc: 'Tag', icon: '☀️' },
                                  { id: 'auto', label: 'Auto', desc: 'Licht', icon: '🌗' }
                                ].map((theme, themeIdx) => {
                                  const isActive = settings.carPlayTheme === theme.id;
                                  const isItemFocused = focusZone === 'content' && contentIndex === themeIdx;
                                  return (
                                    <button
                                      key={theme.id}
                                      type="button"
                                      data-item-focused={isItemFocused ? "true" : undefined}
                                      onClick={() => updateSetting('carPlayTheme', theme.id as any)}
                                      className={`p-1.5 rounded-xl text-center border transition-all cursor-pointer flex flex-col justify-center items-center h-full min-h-0 ${
                                        isItemFocused
                                          ? 'ring-2 ring-primary bg-primary/30 border-primary shadow-[0_0_15px_var(--primary-glow)] scale-[1.02] z-10'
                                          : isActive
                                          ? 'border-primary bg-primary/20 shadow-[0_0_12px_var(--primary-glow)] ring-1 ring-inset ring-primary'
                                          : 'bg-black/50 border-white/10 hover:bg-white/[0.08]'
                                      }`}
                                    >
                                      <span className="text-base sm:text-lg mb-0.5">{theme.icon}</span>
                                      <span className={`text-[10px] sm:text-xs font-black uppercase tracking-wider block truncate w-full ${isActive ? 'text-primary' : 'text-white'}`}>
                                        {theme.label}
                                      </span>
                                      <span className="text-[8px] font-medium text-zinc-400 block truncate w-full hidden sm:block">
                                        {theme.desc}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Box 2: Map Theme */}
                            <div className="rounded-xl bg-black/40 border border-white/10 backdrop-blur-xl p-2.5 shadow-md flex flex-col justify-between min-h-0 overflow-hidden">
                              <span className="text-[9.5px] font-mono font-black text-blue-400 uppercase tracking-widest block truncate mb-1">
                                🗺️ KARTEN-DESIGN
                              </span>
                              <div className="grid grid-cols-3 gap-1.5 flex-1 min-h-0">
                                {[
                                  { id: 'dark', label: 'Dunkel', desc: 'Vektor', icon: '🌑' },
                                  { id: 'light', label: 'Hell', desc: 'Tageskarte', icon: '🌕' },
                                  { id: 'auto', label: 'Auto', desc: 'Sensor', icon: '🔄' }
                                ].map((mapTheme, mapIdx) => {
                                  const isActive = (settings.carPlayMapTheme || 'auto') === mapTheme.id;
                                  const isItemFocused = focusZone === 'content' && contentIndex === 3 + mapIdx;
                                  return (
                                    <button
                                      key={mapTheme.id}
                                      type="button"
                                      data-item-focused={isItemFocused ? "true" : undefined}
                                      onClick={() => updateSetting('carPlayMapTheme', mapTheme.id as any)}
                                      className={`p-1.5 rounded-xl text-center border transition-all cursor-pointer flex flex-col justify-center items-center h-full min-h-0 ${
                                        isItemFocused
                                          ? 'ring-2 ring-blue-400 bg-blue-500/30 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-[1.02] z-10'
                                          : isActive
                                          ? 'border-blue-500 bg-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.35)] ring-1 ring-inset ring-blue-500'
                                          : 'bg-black/50 border-white/10 hover:bg-white/[0.08]'
                                      }`}
                                    >
                                      <span className="text-base sm:text-lg mb-0.5">{mapTheme.icon}</span>
                                      <span className={`text-[10px] sm:text-xs font-black uppercase tracking-wider block truncate w-full ${isActive ? 'text-blue-300' : 'text-white'}`}>
                                        {mapTheme.label}
                                      </span>
                                      <span className="text-[8px] font-medium text-zinc-400 block truncate w-full hidden sm:block">
                                        {mapTheme.desc}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Box 3: Multiplayer HQ Overlay */}
                            <div className="rounded-xl bg-black/40 border border-white/10 backdrop-blur-xl p-2.5 shadow-md flex flex-col justify-between min-h-0 overflow-hidden">
                              <span className="text-[9.5px] font-mono font-black text-amber-400 uppercase tracking-widest block truncate mb-1">
                                🏢 MULTIPLAYER HQ OVERLAY
                              </span>
                              <div className="grid grid-cols-4 gap-1.5 flex-1 min-h-0">
                                {[
                                  { id: 'truckline', label: 'Truckline', desc: 'Dillenburg', icon: '🚚' },
                                  { id: 'truckersmp', label: 'TMP HQ', desc: 'Wrocław', icon: '🚛' },
                                  { id: 'all', label: 'Beide', desc: 'Alle HQs', icon: '🏢' },
                                  { id: 'none', label: 'Keins', desc: 'Vanilla', icon: '🌐' }
                                ].map((item, hqIdx) => {
                                  const isActive = (settings.carPlayHqOverlay || 'truckline') === item.id;
                                  const isItemFocused = focusZone === 'content' && contentIndex === 6 + hqIdx;
                                  return (
                                    <button
                                      key={item.id}
                                      type="button"
                                      data-item-focused={isItemFocused ? "true" : undefined}
                                      onClick={() => updateSetting('carPlayHqOverlay', item.id as any)}
                                      className={`p-1 rounded-xl text-center border transition-all cursor-pointer flex flex-col justify-center items-center h-full min-h-0 ${
                                        isItemFocused
                                          ? 'ring-2 ring-amber-400 bg-amber-500/30 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-[1.02] z-10'
                                          : isActive
                                          ? 'border-amber-500 bg-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.35)] ring-1 ring-amber-500'
                                          : 'bg-black/50 border-white/10 hover:bg-white/[0.08]'
                                      }`}
                                    >
                                      <span className="text-base sm:text-lg mb-0.5">{item.icon}</span>
                                      <span className={`text-[9.5px] sm:text-[10.5px] font-black uppercase tracking-tight block truncate w-full ${isActive ? 'text-amber-300' : 'text-white'}`}>
                                        {item.label}
                                      </span>
                                      <span className="text-[7.5px] font-medium text-zinc-400 block truncate w-full hidden sm:block">
                                        {item.desc}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Box 4: Cockpit Textgröße */}
                            <div className="rounded-xl bg-black/40 border border-white/10 backdrop-blur-xl p-2.5 shadow-md flex flex-col justify-between min-h-0 overflow-hidden">
                              <span className="text-[9.5px] font-mono font-black text-primary uppercase tracking-widest block truncate mb-1">
                                🔤 COCKPIT TEXTGRÖSSE
                              </span>
                              <div className="grid grid-cols-3 gap-1.5 flex-1 min-h-0">
                                {[
                                  { id: 'small', label: 'Klein', desc: 'Kompakt' },
                                  { id: 'medium', label: 'Normal', desc: 'Standard' },
                                  { id: 'large', label: 'Groß', desc: 'Lesbarkeit' }
                                ].map((scale, scaleIdx) => {
                                  const isActive = settings.carPlayTextScale === scale.id;
                                  const isItemFocused = focusZone === 'content' && contentIndex === 10 + scaleIdx;
                                  return (
                                    <button
                                      key={scale.id}
                                      type="button"
                                      data-item-focused={isItemFocused ? "true" : undefined}
                                      onClick={() => updateSetting('carPlayTextScale', scale.id as any)}
                                      className={`p-1.5 rounded-xl text-center border transition-all cursor-pointer flex flex-col justify-center items-center h-full min-h-0 ${
                                        isItemFocused
                                          ? 'ring-2 ring-primary bg-primary/30 border-primary shadow-[0_0_15px_var(--primary-glow)] scale-[1.02] z-10'
                                          : isActive
                                          ? 'border-primary bg-primary/20 shadow-[0_0_12px_var(--primary-glow)] ring-1 ring-inset ring-primary'
                                          : 'bg-black/50 border-white/10 hover:bg-white/[0.08]'
                                      }`}
                                    >
                                      <span className={`text-[10px] sm:text-xs font-black uppercase tracking-wider block truncate w-full ${isActive ? 'text-primary' : 'text-white'}`}>
                                        {scale.label}
                                      </span>
                                      <span className="text-[8px] text-zinc-400 font-mono block truncate w-full hidden sm:block">
                                        {scale.desc}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Bottom Standby Bar (Box 5: Zündungs-Automatik) */}
                          <div
                            data-item-focused={focusZone === 'content' && contentIndex === 13 ? "true" : undefined}
                            onClick={() => updateSetting('carPlayIgnitionSleep', !settings.carPlayIgnitionSleep)}
                            className={`rounded-xl border p-2 sm:p-2.5 shadow-lg backdrop-blur-xl flex items-center justify-between transition-all cursor-pointer select-none shrink-0 ${
                              focusZone === 'content' && contentIndex === 13
                                ? 'ring-2 ring-primary bg-primary/25 border-primary shadow-[0_0_18px_var(--primary-glow)] scale-[1.01] z-10'
                                : settings.carPlayIgnitionSleep
                                ? 'bg-primary/15 border-primary/40 hover:bg-primary/20'
                                : 'bg-black/40 border-white/10 opacity-75 hover:opacity-100 hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 shadow-sm ${
                                settings.carPlayIgnitionSleep
                                  ? 'bg-primary text-[var(--primary-foreground)] font-black shadow-[0_0_12px_var(--primary-glow)]'
                                  : 'bg-white/[0.06] border border-white/10 text-zinc-400'
                              }`}>
                                ⚡
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black font-mono text-white tracking-tight truncate">
                                    Zündungs-Automatik (Display-Standby)
                                  </span>
                                  <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                                    settings.carPlayIgnitionSleep
                                      ? 'bg-primary/20 text-primary border border-primary/40'
                                      : 'bg-white/10 text-zinc-400 border border-white/10'
                                  }`}>
                                    {settings.carPlayIgnitionSleep ? 'STANDBY BEI MOTOR AUS' : 'DAUERHAFT AN'}
                                  </span>
                                </div>
                                <p className="text-[10px] text-zinc-400 font-medium truncate mt-0.5 hidden sm:block">
                                  Schaltet das Display & Cockpit automatisch in Ruhezustand, sobald Zündung und Motor aus sind.
                                </p>
                              </div>
                            </div>

                            {/* Toggle Switch */}
                            <div className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 shrink-0 ml-2 ${
                              settings.carPlayIgnitionSleep ? 'bg-primary shadow-[0_0_12px_var(--primary-glow)]' : 'bg-white/20'
                            }`}>
                              <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                                settings.carPlayIgnitionSleep ? 'translate-x-5' : 'translate-x-0'
                              }`} />
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* ============================================================ */}
                      {/* SEITE 2: FAHRT-WARNUNGEN (SICHERHEITS- & COCKPIT-ALERTS) */}
                      {/* ============================================================ */}
                      {settingsPage === 1 && (
                        <motion.div
                          key="settings-page-1"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.18 }}
                          className="grid grid-cols-2 gap-2 flex-1 min-h-0 overflow-hidden"
                        >
                          {[
                            {
                              key: 'carPlayShowNavInstructions',
                              label: 'Navigations-Hinweise',
                              desc: 'Abbiege-Pfeile, Spuren und Distanzen im HUD',
                              icon: '🧭',
                              color: 'text-sky-400'
                            },
                            {
                              key: 'carPlayNotifySpeed',
                              label: 'Tempolimit-Warnung',
                              desc: 'Optischer Alarm bei Geschwindigkeitsübertretung',
                              icon: '⚠️',
                              color: 'text-rose-400'
                            },
                            {
                              key: 'carPlayNotifyFuel',
                              label: 'Kraftstoff-Reserve',
                              desc: 'Alarmierung bei kritischem Tankfüllstand',
                              icon: '⛽',
                              color: 'text-amber-400'
                            },
                            {
                              key: 'carPlayNotifyRest',
                              label: 'Lenkzeit & Ruhepause',
                              desc: 'Müdigkeitswarnung vor Fahrzeitüberschreitung',
                              icon: '🕐',
                              color: 'text-blue-400'
                            },
                            {
                              key: 'carPlayNotifyDamage',
                              label: 'LKW- & Frachtschaden',
                              desc: 'Alarm bei Verschleiß oder Unfallschaden > 5%',
                              icon: '🔧',
                              color: 'text-rose-400'
                            }
                          ].map((item, idx) => {
                            const isChecked = settings[item.key as keyof OverlaySettings] !== false;
                            const isItemFocused = focusZone === 'content' && contentIndex === idx;

                            return (
                              <div
                                key={item.key}
                                data-item-focused={isItemFocused ? "true" : undefined}
                                onClick={() => updateSetting(item.key as any, !isChecked)}
                                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 shadow-md select-none backdrop-blur-xl min-h-0 ${
                                  idx === 4 ? 'col-span-2' : ''
                                } ${
                                  isItemFocused
                                    ? 'ring-2 ring-primary bg-primary/25 border-primary shadow-[0_0_15px_var(--primary-glow)] scale-[1.01] z-10'
                                    : isChecked
                                    ? 'bg-black/50 border-white/20 hover:border-white/30'
                                    : 'bg-black/30 border-white/5 opacity-70 hover:opacity-100'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-base shrink-0 shadow-sm">
                                    {item.icon}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-black font-mono text-white tracking-tight truncate">
                                      {item.label}
                                    </div>
                                    <div className="text-[9px] text-zinc-400 font-medium truncate mt-0.5 hidden sm:block">
                                      {item.desc}
                                    </div>
                                  </div>
                                </div>

                                {/* Touch Switch */}
                                <div className="relative shrink-0 flex items-center ml-2">
                                  <div className={`w-10 h-5.5 rounded-full transition-all duration-300 relative ${isChecked ? 'bg-primary shadow-[0_0_10px_var(--primary-glow)]' : 'bg-zinc-800 border border-white/10'}`}>
                                    <div className={`w-4.5 h-4.5 rounded-full bg-white absolute top-0.5 transition-all duration-300 shadow-md ${isChecked ? 'left-[19px]' : 'left-0.5'}`} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </motion.div>
                      )}

                      {/* ============================================================ */}
                      {/* SEITE 3: MELDUNGEN, COMMUNITY & SYSTEM-STATUS */}
                      {/* ============================================================ */}
                      {settingsPage === 2 && (
                        <motion.div
                          key="settings-page-2"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.18 }}
                          className="grid grid-cols-12 gap-2.5 flex-1 min-h-0 overflow-hidden"
                        >
                          {/* Left Column (7 Cols): Media & Community Notifications */}
                          <div className="col-span-7 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl p-2.5 shadow-xl flex flex-col justify-between overflow-hidden">
                            <div>
                              <span className="text-[9.5px] font-mono font-black text-purple-400 uppercase tracking-widest block mb-0.5">
                                🔔 MELDUNGEN & BENACHRICHTIGUNGEN
                              </span>
                              <p className="text-[10px] text-zinc-400 font-medium mb-1.5">
                                Pop-up Einblendungen während der Fahrt anpassen.
                              </p>
                            </div>

                            <div className="space-y-1.5 overflow-hidden flex-1">
                              {[
                                { key: 'carPlayNotifyCargo', label: 'Auftragswarnung', desc: 'Fracht- & Liefertermine', icon: '📦' },
                                { key: 'carPlayNotifyMusic', label: 'Songwechsel', desc: 'Titel-Popup bei Trackwechsel', icon: '🎵' },
                                { key: 'carPlayNotifyChat', label: 'Chat- & Funknachrichten', desc: 'Live-Meldungen im Team-Funk', icon: '💬' },
                                { key: 'carPlayNotifyNews', label: 'Firmen-News', desc: 'VTC-Ankündigungen & Neuigkeiten', icon: '📰' },
                                { key: 'carPlayNotifyEvent', label: 'Speditionsevents', desc: 'Erinnerungen an Konvois & Touren', icon: '📅' }
                              ].map((item, idx) => {
                                const isChecked = settings[item.key as keyof OverlaySettings] !== false;
                                const isItemFocused = focusZone === 'content' && contentIndex === idx;
                                return (
                                  <div
                                    key={item.key}
                                    data-item-focused={isItemFocused ? "true" : undefined}
                                    onClick={() => updateSetting(item.key as any, !isChecked)}
                                    className={`px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                      isItemFocused
                                        ? 'ring-2 ring-primary bg-primary/25 border-primary shadow-[0_0_12px_var(--primary-glow)] scale-[1.01] z-10'
                                        : isChecked
                                        ? 'bg-black/50 border-white/15'
                                        : 'bg-black/30 border-white/5 opacity-60'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-sm shrink-0">{item.icon}</span>
                                      <div className="min-w-0">
                                        <div className="text-xs font-bold text-white truncate">{item.label}</div>
                                        <div className="text-[9px] text-zinc-400 truncate">{item.desc}</div>
                                      </div>
                                    </div>
                                    <div className="relative shrink-0 flex items-center">
                                      <div className={`w-8 h-4.5 rounded-full transition-all duration-300 relative ${isChecked ? 'bg-primary shadow-[0_0_8px_var(--primary-glow)]' : 'bg-zinc-800 border border-white/10'}`}>
                                        <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all duration-300 shadow-sm ${isChecked ? 'left-[15px]' : 'left-0.5'}`} />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Right Column (5 Cols): System Status & Driving Tips */}
                          <div className="col-span-5 flex flex-col justify-between gap-2 min-h-0">
                            {/* System Status Card */}
                            <div className="rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl p-2.5 shadow-xl flex-1 flex flex-col justify-between">
                              <span className="text-[9.5px] font-mono font-black text-emerald-400 uppercase tracking-widest block mb-1">
                                ℹ️ SYSTEM & TELEMETRIE
                              </span>
                              <div className="space-y-1.5 font-mono text-xs">
                                <div className="bg-black/50 border border-white/10 rounded-xl p-2 flex items-center justify-between">
                                  <span className="text-zinc-400 text-[9.5px]">TELEMETRIE</span>
                                  <span className={`text-[9.5px] font-bold flex items-center gap-1.5 ${telemetry.connected ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${telemetry.connected ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                                    {telemetry.connected ? 'VERBUNDEN' : 'STANDBY'}
                                  </span>
                                </div>
                                <div className="bg-black/50 border border-white/10 rounded-xl p-2 flex items-center justify-between">
                                  <span className="text-zinc-400 text-[9.5px]">OPC CLIENT</span>
                                  <span className="text-[9.5px] text-white font-bold">V1.7.90</span>
                                </div>
                                <div className="bg-black/50 border border-white/10 rounded-xl p-2 flex items-center justify-between">
                                  <span className="text-zinc-400 text-[9.5px]">OVERLAY HUD</span>
                                  <span className="text-[9.5px] font-bold text-primary">AKTIV</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            )}
            {/* --- MAP TAB --- */}
            {activeTab === 'map' && (
              <div className="w-full h-full relative rounded-2xl sm:rounded-3xl overflow-hidden p-1 sm:p-1.5 flex flex-col font-['Outfit',sans-serif]">
                {/* App Wallpaper Background from OPC Main App */}
                {renderCarPlayWallpaper()}

                <div className={`flex-1 w-full h-full relative overflow-hidden rounded-3xl ${isLight ? 'bg-slate-200 border-slate-300 shadow-xl' : 'bg-neutral-950 border-white/10 shadow-2xl'} border relative z-10 m-0.5`}>
                {/* Top Search Bar */}
                <AnimatePresence>
                  {!isRouteActive && (
                    <motion.div
                      initial={{ opacity: 0, y: -20, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.96 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="absolute top-4 left-4 z-50 flex flex-col gap-1.5 pointer-events-auto min-w-[380px] max-w-[520px]"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          onClick={() => setMapTabFocus('search')}
                          className={`relative flex-1 rounded-2xl transition-all ${
                            mapTabFocus === 'search'
                              ? 'ring-4 ring-inset ring-primary bg-primary/20 scale-[1.01] shadow-[0_0_20px_var(--primary-glow)]'
                              : ''
                          }`}
                        >
                          <Search size={18} className="absolute left-4 top-4 text-zinc-400" />
                          <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onFocus={() => { setMapTabFocus('search'); openVirtualKeyboard('city'); }}
                            onClick={() => { setMapTabFocus('search'); openVirtualKeyboard('city'); }}
                            onChange={(e) => { setSearchQuery(e.target.value); setSearchSelectedIndex(0); }}
                            placeholder="Firma oder Stadt suchen..."
                            className="w-full bg-[#0d1117]/95 backdrop-blur-md border border-white/15 rounded-2xl py-3.5 pl-12 pr-10 text-base font-medium text-white placeholder-zinc-400 focus:outline-none focus:border-amber-500 shadow-2xl transition-all cursor-pointer"
                          />
                          {searchQuery && (
                            <button
                              onClick={() => { setSearchQuery(''); setSearchSelectedIndex(0); }}
                              className="absolute right-3.5 top-3.5 text-zinc-400 hover:text-white cursor-pointer transition-colors"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      </div>

                      {searchQuery.trim().length > 0 && (
                        <div className="w-full bg-[#0d1117]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden max-h-80 overflow-y-auto divide-y divide-white/5">
                          <div className="flex items-center gap-1.5 p-2 bg-white/[0.02] border-b border-white/10">
                            <button onClick={() => { setSearchFilter('all'); setSearchSelectedIndex(0); }} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${searchFilter === 'all' ? 'bg-blue-600 text-white font-bold shadow-md' : 'bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-white'}`}>Alle</button>
                            <button onClick={() => { setSearchFilter('companies'); setSearchSelectedIndex(0); }} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${searchFilter === 'companies' ? 'bg-blue-600 text-white font-bold shadow-md' : 'bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-white'}`}>Firmen</button>
                            <button onClick={() => { setSearchFilter('cities'); setSearchSelectedIndex(0); }} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${searchFilter === 'cities' ? 'bg-blue-600 text-white font-bold shadow-md' : 'bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-white'}`}>Städte</button>
                          </div>
                          {(() => {
                            const allResults = searchDestinations(searchQuery);
                            const filtered = allResults.filter(r => {
                              if (searchFilter === 'companies') return r.type === 'company';
                              if (searchFilter === 'cities') return r.type === 'city';
                              return true;
                            });
                            if (filtered.length === 0) return <div className="p-4 text-center text-xs text-zinc-400 font-medium">Keine Treffer für "{searchQuery}"</div>;
                            return filtered.map((item, idx) => {
                              const isSelected = idx === searchSelectedIndex;
                              return (
                                <div
                                  key={idx}
                                  data-search-selected={isSelected ? "true" : undefined}
                                  onClick={() => {
                                    const dest = { dest: item.cityName, destCompany: item.companyName, title: item.title, x: item.x, z: item.z };
                                    setPendingDest(dest);
                                    setSearchQuery('');
                                    setMapTabFocus('bottom-nav');
                                    setTimeout(() => {
                                      const map = (maxMapWidgetRef.current || mapWidgetRef.current) as any;
                                      if (map && 'focusDestinationByGameCoords' in map) {
                                        if (item.x != null && item.z != null) {
                                          map.focusDestinationByGameCoords(item.x, item.z);
                                        } else {
                                          const company = findCompany(dest.destCompany || '', dest.dest);
                                          if (company) { map.focusDestinationByGameCoords(company.x, company.z); }
                                          else { const city = findCity(dest.dest); if (city) map.focusDestination(city.lng, city.lat); }
                                        }
                                      }
                                    }, 50);
                                  }}
                                  className={`flex items-center gap-3 px-3.5 py-3 cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-blue-600/35 border-l-4 border-l-blue-400 ring-2 ring-inset ring-blue-400 font-bold text-white shadow-lg'
                                      : 'hover:bg-white/[0.04]'
                                  }`}
                                >
                                  <CompanyIcon companyName={item.type === 'company' ? item.companyName : undefined} title={item.title} type={item.type} size="md" />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-white truncate">{item.title}</div>
                                    <div className="text-[11px] text-zinc-400 truncate">{item.subtitle}</div>
                                  </div>
                                  <div className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{item.type === 'company' ? 'Firma' : 'Stadt'}</div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Full Map */}
                <div ref={setMaxMapContainerRef} className="absolute inset-0">
                  <GameMapWidget
                    ref={maxMapWidgetRef}
                    gameX={(telemetry as any).posX ?? (telemetry as any).gameX}
                    gameY={(telemetry as any).posZ ?? (telemetry as any).gameY}
                    heading={telemetry.connected ? telemetry.heading : undefined}
                    currentSpeed={telemetry.connected ? telemetry.speed : 0}
                    speedLimit={telemetry.connected ? telemetry.speedLimit : 0}
                    routeWaypoints={effectiveRouteWaypoints}
                    source={effectiveSource}
                    dest={effectiveDest}
                    destCompany={effectiveDestCompany}
                    navDistance={telemetry.connected ? telemetry.navDistance : undefined}
                    connected={telemetry.connected}
                    themeMode={activeMapTheme}
                    accentColor="#6d28d9"
                    width={maxMapDims.w}
                    height={maxMapDims.h}
                    mapId="carplay-maptab"
                    hqOverlay={settings.carPlayHqOverlay || 'truckline'}
                    zoom={carPlayMapZoom}
                    onZoomChange={setCarPlayMapZoom}
                    showInstructions={settings.carPlayShowNavInstructions !== false}
                    showSpeedcams={true}
                    onSpeedcamAlert={setSpeedcamAlert}
                    onRouteCalculated={setCustomRouteInfo}
                    nearbyVehicles={telemetry.connected ? (telemetry as any).nearbyVehicles : undefined}
                    nearbyVehicleColor="#007aff"
                    semaphores={telemetry.connected ? (telemetry as any).semaphores : undefined}
                    onApproachingTrafficLightChange={setApproachingTrafficLight}
                    enableTerrain3D={false}
                    pitch={38}
                    paused={isCarPlaySleeping || activeTab !== 'map' || maximizedWidget !== null}
                    targetFps={30}
                    onDestinationReached={() => {
                      setCustomDest(null);
                      setCustomRouteInfo(null);
                      showNotification({
                        title: 'Ziel erreicht! 🏁',
                        message: 'Du bist erfolgreich an deinem Zielort angekommen.',
                        icon: <CheckCircle size={18} />,
                        color: '#10b981',
                      });
                    }}
                  />
                </div>

                {/* Speedcam HUD */}
                <AnimatePresence>
                  {speedcamAlert && (
                    <motion.div
                      initial={{ opacity: 0, y: -20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                    >
                      <div className={`flex items-center gap-3.5 px-4 py-2.5 rounded-2xl backdrop-blur-md border shadow-2xl transition-all ${speedcamAlert.isSpeeding ? 'bg-rose-950/90 border-rose-500/90 text-rose-100 shadow-[0_0_35px_rgba(244,63,94,0.7)] animate-pulse' : 'bg-zinc-950/90 border-primary/50 text-white shadow-[0_0_25px_var(--primary-glow)]'}`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-white shrink-0 shadow-lg ${speedcamAlert.isSpeeding ? 'bg-rose-600' : 'bg-primary'}`}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>
                          </svg>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-wider font-mono">{speedcamAlert.isSpeeding ? '⚠️ GESCHWINDIGKEITSBLITZER' : '📷 FESTBLITZER VORAUS'}</span>
                            <span className="text-[11px] font-black px-2 py-0.5 rounded bg-black/60 border border-white/10 font-mono text-white">in {speedcamAlert.distanceMeters} m</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11.5px] font-mono mt-0.5">
                            <span className="text-zinc-300">Tempolimit: <strong className="text-white">{speedcamAlert.camera.speedLimit} km/h</strong> auf {speedcamAlert.camera.road}</span>
                            {speedcamAlert.isSpeeding && <span className="text-rose-400 font-black">(+{speedcamAlert.overspeedKmh} km/h zu schnell!)</span>}
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white border-2 border-rose-600 flex items-center justify-center text-slate-950 font-black text-xs font-mono shrink-0 shadow-md">{speedcamAlert.camera.speedLimit}</div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Speed Limit / Traffic Light HUD */}
                <div className="absolute left-6 top-1/2 -translate-y-1/2 w-24 z-40 pointer-events-none drop-shadow-[0_10px_25px_rgba(0,0,0,0.85)] flex flex-col items-center">
                  <AnimatePresence mode="wait">
                    {approachingTrafficLight ? (
                      <motion.div key="hero-tl" initial={{ opacity: 0, scale: 0.82, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.82, y: -15 }} transition={{ type: 'spring', damping: 22, stiffness: 280 }} className="w-24 flex flex-col items-center gap-2">
                        <TrafficLightWidget trafficLight={approachingTrafficLight} variant="large" />
                        {telemetry.connected && telemetry.speedLimit > 0 && (
                          <div className="w-12 h-12 rounded-full bg-white border-[4.5px] border-red-600 flex items-center justify-center text-slate-950 font-black text-sm shadow-[0_4px_16px_rgba(0,0,0,0.7)] font-sans tracking-tight shrink-0">{Math.round(telemetry.speedLimit)}</div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div key="speed-sign-maptab" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} transition={{ duration: 0.2 }} className="w-24 flex flex-col items-center">
                        {telemetry.connected && telemetry.speedLimit > 0 ? (
                          <svg width="78" height="78" viewBox="0 0 80 80" className={telemetry.speed > telemetry.speedLimit ? 'animate-pulse' : ''}>
                            <circle cx="40" cy="40" r="36" fill="#ffffff" stroke={telemetry.speed > telemetry.speedLimit ? '#e11d48' : '#dc2626'} strokeWidth="7.5" />
                            <text x="40" y="53" textAnchor="middle" fontSize="42" fontWeight="900" fontFamily="Arial, Helvetica, sans-serif" fill="#09090b" letterSpacing="-2">{Math.round(telemetry.speedLimit)}</text>
                          </svg>
                        ) : (
                          <div className="w-16 h-16 rounded-full border-2 border-white/10 bg-black/40 flex items-center justify-center text-zinc-500 font-black text-xl font-mono">--</div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Bottom Nav HUD */}
                <AnimatePresence>
                  {renderBottomNavHud(false, mapTabFocus === 'bottom-nav')}
                </AnimatePresence>
                </div>
              </div>
            )}

            {/* --- IN-CAR CHAT & FUNK APP TAB (DRIVING OPTIMIZED) --- */}
            {activeTab === 'chat' && (
              <div className="w-full h-full relative rounded-2xl sm:rounded-3xl overflow-hidden p-1 sm:p-1.5 flex flex-col font-['Outfit',sans-serif]">
                {/* App Wallpaper Background from OPC Main App */}
                {renderCarPlayWallpaper()}

                <div className={`flex-1 flex flex-col p-3.5 sm:p-4 rounded-3xl ${isLight ? 'bg-white/90 border-slate-250 shadow-xl text-slate-900' : 'bg-black/40 border-white/10 shadow-2xl text-white'} backdrop-blur-md overflow-hidden justify-between relative z-10 m-0.5`}>
                  {/* Header: Driver Callsign & Top Channel Switcher */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 shrink-0 relative z-10 gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isLight
                          ? 'bg-slate-100 border border-slate-200 text-slate-800 shadow-sm'
                          : 'bg-gradient-to-tr from-purple-600 to-indigo-500 shadow-md shadow-purple-500/20 text-white'
                      }`}>
                        <MessageSquare size={17} className="stroke-[2.2] drop-shadow-md" />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        {activeChatChannel && (
                          <span className="text-[10px] font-mono font-bold text-primary bg-primary/15 border border-primary/30 px-2.5 py-0.5 rounded-full shrink-0">
                            #{activeChatChannel.name || 'allgemein'}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-zinc-300 font-semibold truncate bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full shrink-0">
                          Rufname: <strong className={`${isLight ? 'text-slate-900' : 'text-white'}`}>{user?.username || 'OPC Driver'}</strong>
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {telemetry.connected ? `${Math.round(telemetry.speed || 0)} km/h` : 'Bereit'}
                        </span>
                      </div>
                    </div>

                    {/* Header Right: Active Channel Badge & Refresh */}
                    <div className="flex items-center gap-2 shrink-0">
                      {activeChatChannel && (
                        <span className="text-xs font-mono font-black text-primary bg-primary/15 border border-primary/40 px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                          Kanal: #{activeChatChannel.name || activeChatChannel.id}
                        </span>
                      )}
                      <button
                        onClick={() => {
                          loadChatChannels();
                          if (activeChatChannel) loadChatMessages(activeChatChannel.id);
                        }}
                        data-item-focused={focusZone === 'content' && contentIndex === chatChannels.length + 3 ? 'true' : undefined}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer shadow-sm active:scale-95 ${
                          focusZone === 'content' && contentIndex === chatChannels.length + 3
                            ? 'bg-primary/40 border-primary text-white ring-2 ring-primary scale-[1.02] shadow-[0_0_15px_var(--primary-glow)]'
                            : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/15 text-zinc-300 hover:text-white'
                        }`}
                        title="Kanäle & Nachrichten aktualisieren"
                      >
                        <RefreshCw size={13} />
                        <span className="hidden sm:inline">Aktualisieren</span>
                      </button>
                    </div>
                  </div>

                  {/* Main Grid: Left = Kanalauswahl (CB-Channels), Right = Messages & Input */}
                  <div className="grid grid-cols-12 gap-3 flex-1 min-h-0 relative z-10 overflow-hidden">
                    {/* Left Column (4 Cols): CB-Funk Kanalauswahl */}
                    <div className="col-span-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl p-3 flex flex-col justify-between min-h-0 shadow-xl overflow-hidden">
                      <div className="mb-2.5 shrink-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                            <MessageSquare size={13} className="text-primary" /> CB-FUNK KANÄLE
                          </span>
                          <span className="text-[9px] font-mono text-zinc-400 font-bold bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                            {chatChannels.length} Kanäle
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                          Kanal für Funkverkehr & Chat wählen:
                        </p>
                      </div>

                      {/* Prominent Channel Selection Cards */}
                      <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 min-h-0 pr-0.5">
                        {chatChannels.length > 0 ? (
                          chatChannels.map((channel, idx) => {
                            const isActive = activeChatChannel?.id === channel.id;
                            const isFocused = focusZone === 'content' && contentIndex === idx;
                            return (
                              <button
                                key={channel.id}
                                type="button"
                                onClick={() => {
                                  setActiveChatChannel(channel);
                                  loadChatMessages(channel.id);
                                }}
                                data-item-focused={isFocused ? 'true' : undefined}
                                className={`w-full p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between gap-2.5 shadow-md select-none ${
                                  isFocused
                                    ? 'bg-primary/30 border-primary ring-2 ring-primary shadow-[0_0_20px_var(--primary-glow)] scale-[1.02]'
                                    : isActive
                                    ? 'bg-primary/20 border-primary shadow-[0_0_20px_var(--primary-glow)] ring-1 ring-primary/60 scale-[1.01]'
                                    : 'bg-black/50 border-white/10 hover:border-primary/40 hover:bg-white/[0.06] active:scale-98'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                    isFocused || isActive
                                      ? 'bg-primary text-[var(--primary-foreground)] shadow-md'
                                      : 'bg-white/[0.06] border border-white/10 text-zinc-300'
                                  }`}>
                                    <MessageSquare size={17} />
                                  </div>
                                  <div className="min-w-0">
                                    <span className={`text-xs sm:text-sm font-black font-mono block truncate ${
                                      isFocused || isActive ? 'text-white' : 'text-zinc-200'
                                    }`}>
                                      #{channel.name || `Kanal ${channel.id}`}
                                    </span>
                                    <span className="text-[9.5px] font-mono text-zinc-400 block truncate mt-0.5">
                                      {isActive ? 'Aktiver Funkkanal' : 'Tippen zum Verbinden'}
                                    </span>
                                  </div>
                                </div>

                                {isActive ? (
                                  <span className="flex items-center gap-1.5 text-[9px] font-mono font-black text-emerald-400 uppercase bg-emerald-500/15 border border-emerald-500/30 px-2 py-1 rounded-lg shrink-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    AKTIV
                                  </span>
                                ) : (
                                  <span className="text-xs text-zinc-500 font-mono">→</span>
                                )}
                              </button>
                            );
                          })
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-zinc-400">
                            <MessageSquare size={24} className="text-zinc-500 mb-2" />
                            <p className="text-xs font-mono">Keine Kanäle gefunden</p>
                            <button
                              type="button"
                              onClick={loadChatChannels}
                              data-item-focused={focusZone === 'content' && contentIndex === 0 ? 'true' : undefined}
                              className={`mt-3 px-3 py-1.5 rounded-xl border text-white text-xs font-mono font-bold transition-all ${
                                focusZone === 'content' && contentIndex === 0
                                  ? 'bg-primary/50 border-primary ring-2 ring-primary scale-[1.03] shadow-[0_0_15px_var(--primary-glow)]'
                                  : 'bg-primary/30 border-primary/40 hover:bg-primary/40'
                              }`}
                            >
                              Kanäle laden
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Driver Rufname & CB Status */}
                      <div className="mt-2.5 pt-2.5 border-t border-white/10 shrink-0">
                        <div className="p-3 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-between">
                          <div className="min-w-0">
                            <span className="text-[8.5px] font-mono font-black uppercase tracking-wider text-primary block">
                              RUFNAME
                            </span>
                            <span className="text-xs font-black font-mono text-white truncate block">
                              {user?.username || 'OPC Driver'}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[8.5px] font-mono font-bold text-zinc-400 block uppercase">
                              STATUS
                            </span>
                            <span className="text-[10px] font-mono font-black text-emerald-400 flex items-center gap-1 justify-end">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> ON AIR
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column (8 Cols): Live Message Stream & Direct Input */}
                    <div className="col-span-8 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl p-3 flex flex-col justify-between min-h-0 shadow-xl overflow-hidden relative">
                      {/* Message Log */}
                      <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 p-1 min-h-0">
                        {chatMessages.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-2">
                              <MessageSquare size={24} />
                            </div>
                            <p className="text-sm font-bold font-mono text-white">Noch keine Funksprüche im Kanal #{activeChatChannel?.name || 'allgemein'}</p>
                            <p className="text-xs text-zinc-400 mt-1 max-w-xs">Wähle links einen CB-Kanal aus oder nutze die Tastatur!</p>
                          </div>
                        ) : (
                          chatMessages.map((msg, i) => {
                            const isMe = user?.username && (msg.user_name === user.username || msg.username === user.username);
                            const senderName = msg.user_name || msg.username || 'Fahrer';
                            const timeStr = msg.created_at
                              ? new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                              : '';

                            return (
                              <div
                                key={msg.id || i}
                                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}
                              >
                                <div className="flex items-center gap-1.5 mb-0.5 px-1">
                                  <MessageSquare size={11} className="text-primary shrink-0 opacity-80" />
                                  <span className={`text-[10px] font-mono font-bold ${isMe ? 'text-primary' : 'text-primary'}`}>
                                    {senderName}
                                  </span>
                                  {timeStr && <span className="text-[9px] text-zinc-500 font-mono">{timeStr}</span>}
                                </div>
                                <div
                                  className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed break-words shadow-md ${
                                    isMe
                                      ? 'bg-primary text-[var(--primary-foreground)] rounded-br-xs border border-primary/40'
                                      : 'bg-black/60 text-zinc-100 rounded-bl-xs border border-white/10'
                                  }`}
                                >
                                  {msg.content}
                                </div>
                              </div>
                            );
                          })
                        )}
                        <div ref={chatMessagesEndRef} />
                      </div>

                      {/* Floating Message Templates Popover */}
                      <AnimatePresence>
                        {showChatTemplates && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 15 }}
                            transition={{ duration: 0.18, ease: 'easeOut' }}
                            className="absolute inset-x-3 bottom-[64px] z-30 bg-[#090b11]/95 border border-primary/40 rounded-2xl p-3 shadow-2xl backdrop-blur-xl flex flex-col gap-2 max-h-[82%]"
                          >
                            <div className="flex items-center justify-between pb-2 border-b border-white/10 shrink-0">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
                                  <Zap size={14} />
                                </div>
                                <div>
                                  <span className="text-[11px] font-black font-mono uppercase tracking-wider text-white block">
                                    Schnellfunk & Vorlagen
                                  </span>
                                  <span className="text-[9px] font-mono text-zinc-400 block">
                                    Funkspruch antippen zum direkten Senden an #{activeChatChannel?.name || 'Kanal'}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowChatTemplates(false)}
                                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
                                title="Schließen"
                              >
                                <X size={14} />
                              </button>
                            </div>

                            {/* Template Grid */}
                            <div className="grid grid-cols-2 gap-2 overflow-y-auto no-scrollbar min-h-0 p-0.5">
                              {CHAT_QUICK_TEMPLATES.map((tpl, tIdx) => {
                                const isFocused = showChatTemplates && templateNavIndex === tIdx;
                                return (
                                  <button
                                    key={tpl.id}
                                    type="button"
                                    onClick={() => {
                                      handleSendChatMessage(tpl.text);
                                      setShowChatTemplates(false);
                                    }}
                                    data-item-focused={isFocused ? 'true' : undefined}
                                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer select-none active:scale-98 ${
                                      isFocused
                                        ? 'bg-primary/40 border-primary ring-2 ring-primary shadow-[0_0_15px_var(--primary-glow)] scale-[1.01]'
                                        : 'bg-black/50 border-white/10 hover:border-primary/50 hover:bg-white/[0.08]'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-sm shrink-0">{tpl.icon}</span>
                                      <div className="min-w-0">
                                        <span className="text-xs font-black font-mono text-white block truncate leading-tight">
                                          {tpl.text}
                                        </span>
                                        <span className="text-[8.5px] font-mono text-zinc-400 uppercase block">
                                          {tpl.category}
                                        </span>
                                      </div>
                                    </div>
                                    <Send size={12} className="text-primary shrink-0 opacity-70" />
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Direct Message Input Bar with Quick Templates Button */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSendChatMessage();
                        }}
                        className="flex items-center gap-2 shrink-0 pt-2 border-t border-white/10"
                      >
                        {/* Schnellfunk / Nachrichtenvorlagen Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowChatTemplates((prev) => !prev);
                            setTemplateNavIndex(0);
                          }}
                          title="Schnellfunk & Nachrichtenvorlagen öffnen"
                          data-item-focused={focusZone === 'content' && !showChatTemplates && contentIndex === chatChannels.length ? 'true' : undefined}
                          className={`h-11 px-3.5 rounded-xl border flex items-center gap-2 text-xs font-mono font-black transition-all cursor-pointer shadow-md shrink-0 active:scale-95 ${
                            showChatTemplates
                              ? 'bg-primary/35 border-primary text-white ring-2 ring-primary scale-[1.02] shadow-[0_0_18px_var(--primary-glow)]'
                              : focusZone === 'content' && contentIndex === chatChannels.length
                              ? 'bg-primary/40 border-primary text-white ring-2 ring-primary scale-[1.03] shadow-[0_0_18px_var(--primary-glow)]'
                              : 'bg-primary/20 hover:bg-primary/30 border-primary/40 text-primary'
                          }`}
                        >
                          <Zap size={18} className="text-amber-400" />
                          <span className="hidden sm:inline">VORLAGEN</span>
                        </button>

                        <input
                          type="text"
                          value={chatInput}
                          onClick={() => openVirtualKeyboard('chat')}
                          onFocus={() => openVirtualKeyboard('chat')}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder={activeChatChannel ? `Funkspruch an #${activeChatChannel.name || 'Funk'}...` : 'Kanal wählen...'}
                          data-item-focused={focusZone === 'content' && contentIndex === chatChannels.length + 1 ? 'true' : undefined}
                          className={`flex-1 h-11 bg-black/60 border rounded-xl px-3.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none transition-all shadow-inner font-mono cursor-pointer ${
                            focusZone === 'content' && contentIndex === chatChannels.length + 1
                              ? 'border-primary ring-2 ring-primary bg-primary/10 shadow-[0_0_15px_var(--primary-glow)]'
                              : 'border-white/15 focus:border-primary'
                          }`}
                        />

                        <button
                          type="submit"
                          disabled={chatSending || !chatInput.trim() || !activeChatChannel}
                          data-item-focused={focusZone === 'content' && contentIndex === chatChannels.length + 2 ? 'true' : undefined}
                          className={`h-11 px-4 rounded-xl font-mono font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 active:scale-95 ${
                            focusZone === 'content' && contentIndex === chatChannels.length + 2
                              ? 'bg-primary text-[var(--primary-foreground)] ring-2 ring-primary shadow-[0_0_20px_var(--primary-glow)] scale-[1.03]'
                              : 'bg-primary text-[var(--primary-foreground)] hover:brightness-110 shadow-[0_0_15px_var(--primary-glow)]'
                          }`}
                        >
                          <Send size={15} />
                          <span>Senden</span>
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- IN-CAR EVENTS & KONVOIS APP TAB (COCKPIT THEMED) --- */}
            {activeTab === 'events' && (
              <div className="w-full h-full relative rounded-2xl sm:rounded-3xl overflow-hidden p-1 sm:p-1.5 flex flex-col font-['Outfit',sans-serif]">
                {/* Background Wallpaper matching App Raster */}
                {renderCarPlayWallpaper()}

                <div className={`flex-1 flex flex-col p-4 rounded-3xl ${isLight ? 'bg-white/90 border-slate-250 shadow-xl text-slate-900' : 'bg-black/40 border-white/10 shadow-2xl text-white'} backdrop-blur-md overflow-hidden justify-between relative z-10 m-0.5`}>
                  {/* Atmospheric Glow */}
                  <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

                  {/* Header: Status Pill & Refresh */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 shrink-0 relative z-10">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isLight
                          ? 'bg-slate-100 border border-slate-200 text-slate-800 shadow-sm'
                          : 'bg-gradient-to-tr from-teal-600 to-emerald-500 shadow-md shadow-teal-500/20 text-white'
                      }`}>
                        <Calendar size={17} className="stroke-[2.2] drop-shadow-md" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-teal-300 bg-teal-500/20 border border-teal-500/30 px-2.5 py-0.5 rounded-full shrink-0">
                          {carPlayEvents.length} Anstehende Events
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={loadCarPlayEvents}
                      disabled={eventsLoading}
                      data-item-focused={focusZone === 'content' && contentIndex === carPlayEvents.length + 1 ? 'true' : undefined}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer shadow-sm active:scale-95 backdrop-blur-md ${
                        focusZone === 'content' && contentIndex === carPlayEvents.length + 1
                          ? 'bg-emerald-600/40 border-emerald-400 text-white ring-2 ring-emerald-400 scale-[1.02] shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                          : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/15 text-zinc-300 hover:text-white'
                      }`}
                      title="Events aktualisieren"
                    >
                      <RefreshCw size={13} className={eventsLoading ? 'animate-spin text-emerald-400' : ''} />
                      <span>Aktualisieren</span>
                    </button>
                  </div>

                  {/* Main Content: 12-Column Grid Matching Cockpit Design */}
                  <div className="grid grid-cols-12 gap-3 flex-1 min-h-0 relative z-10 overflow-hidden">
                    {/* Left Column (5 Cols): Scrollable Event List */}
                    <div className="col-span-5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl p-2.5 flex flex-col gap-2 overflow-y-auto no-scrollbar min-h-0 shadow-xl">
                      <span className="text-[9.5px] font-mono font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5 px-1 pt-1">
                        <Calendar size={13} className="text-amber-400" /> GEPLANTE KONVOIS
                      </span>

                      {eventsLoading && carPlayEvents.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4 text-zinc-400">
                          <RefreshCw size={24} className="animate-spin text-emerald-400 mb-2" />
                          <p className="text-xs font-mono font-bold text-white">Lade Events...</p>
                        </div>
                      ) : carPlayEvents.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4 text-zinc-400">
                          <Calendar size={28} className="text-emerald-400/40 mb-2" />
                          <p className="text-xs font-mono font-bold text-white">Keine Events gefunden</p>
                          <p className="text-[10px] text-zinc-400 mt-1">Schau bald wieder rein!</p>
                        </div>
                      ) : (
                        carPlayEvents.map((evt, idx) => {
                          const startDate = evt.start_date ? new Date(evt.start_date) : null;
                          const dateStr = startDate ? startDate.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' }) : 'TBA';
                          const timeStr = startDate ? startDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'TBA';
                          const isSelected = selectedCarPlayEvent?.id === evt.id;
                          const isNavActive = activeEventRoute?.eventId === evt.id;
                          const isFocused = focusZone === 'content' && contentIndex === idx;

                          return (
                            <div
                              key={evt.id}
                              onClick={() => setSelectedCarPlayEvent(evt)}
                              data-item-focused={isFocused ? 'true' : undefined}
                              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 backdrop-blur-md ${
                                isFocused
                                  ? 'bg-emerald-500/30 border-emerald-400 ring-2 ring-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.4)] scale-[1.01]'
                                  : isSelected
                                  ? 'bg-emerald-500/20 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/40'
                                  : 'bg-black/40 hover:bg-white/[0.06] border-white/10 text-zinc-300'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  {evt.event_type || 'Konvoi'}
                                </span>
                                <div className="flex items-center gap-1 text-[9.5px] font-mono text-emerald-400 font-bold">
                                  <Clock size={11} />
                                  <span>{dateStr} {timeStr}</span>
                                </div>
                              </div>
                              <h4 className="text-xs font-black text-white truncate">{evt.title}</h4>
                              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 truncate">
                                <span className="text-blue-300 truncate">{evt.start_city || 'Start'}</span>
                                <span className="text-zinc-600 px-1">➔</span>
                                <span className="text-emerald-300 truncate">{evt.end_city || 'Ziel'}</span>
                              </div>
                              {isNavActive && (
                                <span className="text-[9px] font-mono font-black text-emerald-400 bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded text-center">
                                  ● ROUTE AKTIV IN NAVIGATION
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Right Column (7 Cols): Selected Event Mission Control */}
                    <div className="col-span-7 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl p-4 flex flex-col justify-between min-h-0 shadow-xl overflow-hidden relative">
                      {selectedCarPlayEvent ? (
                        <div className="flex flex-col justify-between h-full gap-3">
                          {/* Event Header */}
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-[9.5px] font-mono font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                {selectedCarPlayEvent.event_type || 'Konvoi'}
                              </span>
                              {selectedCarPlayEvent.server && (
                                <span className="text-[9.5px] font-mono text-zinc-300 bg-black/60 border border-white/10 px-2 py-0.5 rounded-md">
                                  🖥️ {selectedCarPlayEvent.server}
                                </span>
                              )}
                              {selectedCarPlayEvent.start_date && (
                                <span className="text-[9.5px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                                  🕒 {new Date(selectedCarPlayEvent.start_date).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} MEZ
                                </span>
                              )}
                            </div>
                            <h3 className="text-base font-black text-white tracking-tight leading-tight">
                              {selectedCarPlayEvent.title}
                            </h3>
                          </div>

                          {/* Route Ribbon */}
                          <div className="bg-black/50 border border-white/10 backdrop-blur-md rounded-xl p-3 flex items-center justify-between text-xs font-mono font-bold">
                            <div className="flex items-center gap-1.5 text-zinc-200 min-w-0">
                              <MapPin size={14} className="text-blue-400 shrink-0" />
                              <div className="truncate">
                                <span className="text-[9px] text-zinc-500 block">ABFAHRT</span>
                                <span className="text-white truncate">{selectedCarPlayEvent.start_city || 'Start'}</span>
                                {selectedCarPlayEvent.start_company && (
                                  <span className="text-zinc-400 text-[10px] ml-1">({selectedCarPlayEvent.start_company})</span>
                                )}
                              </div>
                            </div>
                            <span className="text-amber-400 font-mono text-xs px-2 shrink-0">➔➔➔</span>
                            <div className="flex items-center gap-1.5 text-emerald-300 min-w-0 text-right justify-end">
                              <div className="truncate">
                                <span className="text-[9px] text-zinc-500 block">ZIEL</span>
                                <span className="text-emerald-300 truncate">{selectedCarPlayEvent.end_city || 'Ziel'}</span>
                                {selectedCarPlayEvent.end_company && (
                                  <span className="text-zinc-400 text-[10px] ml-1">({selectedCarPlayEvent.end_company})</span>
                                )}
                              </div>
                              <MapPin size={14} className="text-emerald-400 shrink-0" />
                            </div>
                          </div>

                          {/* Description / Briefing Sub-Box */}
                          <div className="bg-black/50 border border-white/10 backdrop-blur-md rounded-xl p-3 flex-1 overflow-y-auto no-scrollbar min-h-0">
                            <span className="text-[9px] font-mono font-black uppercase text-amber-400 tracking-wider block mb-1">
                              BRIEFING & INFOS
                            </span>
                            <p className="text-xs text-zinc-300 font-medium leading-relaxed whitespace-pre-wrap">
                              {selectedCarPlayEvent.information || selectedCarPlayEvent.description || 'Keine weiteren Details für dieses Event hinterlegt.'}
                            </p>
                            {selectedCarPlayEvent.rules && (
                              <div className="mt-2 pt-2 border-t border-white/5">
                                <span className="text-[9px] font-mono font-black uppercase text-zinc-400 tracking-wider block mb-1">REGELN</span>
                                <p className="text-[11px] text-zinc-400 whitespace-pre-wrap">{selectedCarPlayEvent.rules}</p>
                              </div>
                            )}
                          </div>

                          {/* Action CTA: In Navigation Laden */}
                          <button
                            onClick={() => handleLoadCarPlayEventToNavi(selectedCarPlayEvent)}
                            data-item-focused={focusZone === 'content' && contentIndex === carPlayEvents.length ? 'true' : undefined}
                            className={`w-full py-3 rounded-xl font-mono font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-98 ${
                              focusZone === 'content' && contentIndex === carPlayEvents.length
                                ? 'ring-2 ring-emerald-300 scale-[1.02] shadow-[0_0_25px_rgba(16,185,129,0.5)] ' + (
                                    activeEventRoute?.eventId === selectedCarPlayEvent.id
                                      ? 'bg-emerald-600/50 text-white border border-emerald-400'
                                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                                  )
                                : activeEventRoute?.eventId === selectedCarPlayEvent.id
                                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/25'
                            }`}
                          >
                            <Navigation size={16} />
                            <span>{activeEventRoute?.eventId === selectedCarPlayEvent.id ? 'ROUTE IST AKTIV IN NAVIGATION' : 'IN NAVIGATION LADEN'}</span>
                          </button>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
                          <Calendar size={36} className="text-emerald-400/30 mb-2" />
                          <h4 className="text-sm font-mono font-bold text-white">Kein Event ausgewählt</h4>
                          <p className="text-xs text-zinc-400 mt-1">Wähle links ein Event aus der Liste, um Route und Details anzuzeigen.</p>
                        </div>
                      )}
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
            className="absolute inset-0 z-50 bg-[#090b11]/85 backdrop-blur-md flex flex-col"
          >
            <div ref={setMaxMapContainerRef} className="flex-1 relative overflow-hidden bg-neutral-950">
              {/* Inline Top Search Input & Floating Results Dropdown (Only on Maximized Map, Hidden when route is active) */}
              <AnimatePresence>
                {!isRouteActive && (
                  <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.96 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="absolute top-4 left-4 z-50 flex flex-col gap-1.5 pointer-events-auto min-w-[420px] max-w-[560px]"
                  >
                    <div className="flex items-center gap-2">
                  <div
                    onClick={() => setMaxMapFocus('search')}
                    className={`relative flex-1 rounded-2xl transition-all ${
                      maxMapFocus === 'search'
                        ? 'ring-4 ring-inset ring-primary bg-primary/20 scale-[1.01] shadow-[0_0_20px_var(--primary-glow)]'
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
                      className="w-full bg-[#0d1117]/95 backdrop-blur-md border border-white/15 rounded-2xl py-3.5 pl-12 pr-10 text-base font-medium text-white placeholder-zinc-400 focus:outline-none focus:border-amber-500 shadow-2xl transition-all cursor-pointer"
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
                  <div className="w-full bg-[#0d1117]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden max-h-80 overflow-y-auto divide-y divide-white/5">
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
                        return (
                          <div
                            key={idx}
                            data-search-selected={isSelected ? "true" : undefined}
                            onClick={() => {
                              const dest = {
                                dest: item.cityName,
                                destCompany: item.companyName,
                                title: item.title,
                                x: item.x,
                                z: item.z,
                              };
                              setPendingDest(dest);
                              setSearchQuery('');
                              setTimeout(() => {
                                const map = (maxMapWidgetRef.current || mapWidgetRef.current) as any;
                                if (map && 'focusDestinationByGameCoords' in map) {
                                  if (item.x != null && item.z != null) {
                                    map.focusDestinationByGameCoords(item.x, item.z);
                                  } else {
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
                                }
                              }, 50);
                            }}
                            className={`flex items-center gap-3 px-3.5 py-3 cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-blue-600/35 border-l-4 border-l-blue-400 ring-2 ring-inset ring-blue-400 font-bold text-white shadow-lg'
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
                  </motion.div>
                )}
              </AnimatePresence>

              <GameMapWidget
                ref={maxMapWidgetRef}
                gameX={(telemetry as any).posX ?? (telemetry as any).gameX}
                gameY={(telemetry as any).posZ ?? (telemetry as any).gameY}
                heading={telemetry.connected ? telemetry.heading : undefined}
                currentSpeed={telemetry.connected ? telemetry.speed : 0}
                speedLimit={telemetry.connected ? telemetry.speedLimit : 0}
                routeWaypoints={effectiveRouteWaypoints}
                source={effectiveSource}
                dest={effectiveDest}
                destCompany={effectiveDestCompany}
                navDistance={telemetry.connected ? telemetry.navDistance : undefined}
                connected={telemetry.connected}
                themeMode={activeMapTheme}
                accentColor="#6d28d9"
                width={maxMapDims.w}
                height={maxMapDims.h}
                mapId="carplay-max"
                hqOverlay={settings.carPlayHqOverlay || 'truckline'}
                zoom={carPlayMapZoom}
                onZoomChange={setCarPlayMapZoom}
                showInstructions={settings.carPlayShowNavInstructions !== false}
                showSpeedcams={true}
                onSpeedcamAlert={setSpeedcamAlert}
                onRouteCalculated={setCustomRouteInfo}
                nearbyVehicles={telemetry.connected ? (telemetry as any).nearbyVehicles : undefined}
                nearbyVehicleColor="#007aff"
                semaphores={telemetry.connected ? (telemetry as any).semaphores : undefined}
                onApproachingTrafficLightChange={setApproachingTrafficLight}
                enableTerrain3D={false}
                pitch={38}
                paused={isCarPlaySleeping || maximizedWidget !== 'map'}
                targetFps={30}
                onDestinationReached={() => {
                  setCustomDest(null);
                  setCustomRouteInfo(null);
                  showNotification({
                    title: 'Ziel erreicht! 🏁',
                    message: 'Du bist erfolgreich an deinem Zielort angekommen.',
                    icon: <CheckCircle size={18} />,
                    color: '#10b981',
                  });
                }}
              />

              {/* Speedcam Warning Alert HUD Floating Banner (Maximized Map) */}
              <AnimatePresence>
                {speedcamAlert && (
                  <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ duration: 0.25 }}
                    className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                  >
                    <div
                      className={`flex items-center gap-3.5 px-4 py-2.5 rounded-2xl backdrop-blur-md border shadow-2xl transition-all ${
                        speedcamAlert.isSpeeding
                          ? 'bg-rose-950/90 border-rose-500/90 text-rose-100 shadow-[0_0_35px_rgba(244,63,94,0.7)] animate-pulse'
                          : 'bg-zinc-950/90 border-primary/50 text-white shadow-[0_0_25px_var(--primary-glow)]'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-white shrink-0 shadow-lg ${
                        speedcamAlert.isSpeeding ? 'bg-rose-600' : 'bg-primary'
                      }`}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                          <circle cx="12" cy="13" r="3"/>
                        </svg>
                      </div>

                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wider font-mono">
                            {speedcamAlert.isSpeeding ? '⚠️ GESCHWINDIGKEITSBLITZER' : '📷 FESTBLITZER VORAUS'}
                          </span>
                          <span className="text-[11px] font-black px-2 py-0.5 rounded bg-black/60 border border-white/10 font-mono text-white">
                            in {speedcamAlert.distanceMeters} m
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11.5px] font-mono mt-0.5">
                          <span className="text-zinc-300">
                            Tempolimit: <strong className="text-white">{speedcamAlert.camera.speedLimit} km/h</strong> auf {speedcamAlert.camera.road}
                          </span>
                          {speedcamAlert.isSpeeding && (
                            <span className="text-rose-400 font-black">
                              (+{speedcamAlert.overspeedKmh} km/h zu schnell!)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="w-8 h-8 rounded-full bg-white border-2 border-rose-600 flex items-center justify-center text-slate-950 font-black text-xs font-mono shrink-0 shadow-md">
                        {speedcamAlert.camera.speedLimit}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Authentic European Speed Limit Sign (VZ 274) OR Large Traffic Light (Ampel) */}
              <div className="absolute left-6 top-1/2 -translate-y-1/2 w-24 z-40 pointer-events-none drop-shadow-[0_10px_25px_rgba(0,0,0,0.85)] flex flex-col items-center">
                <AnimatePresence mode="wait">
                  {approachingTrafficLight ? (
                    <motion.div
                      key="hero-traffic-light"
                      initial={{ opacity: 0, scale: 0.82, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.82, y: -15 }}
                      transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                      className="w-24 flex flex-col items-center gap-2"
                    >
                      <TrafficLightWidget
                        trafficLight={approachingTrafficLight}
                        variant="large"
                      />
                      {/* Docked Authentic Speed Limit Roundel when available */}
                      {telemetry.connected && telemetry.speedLimit > 0 && (
                        <div className="w-12 h-12 rounded-full bg-white border-[4.5px] border-red-600 flex items-center justify-center text-slate-950 font-black text-sm shadow-[0_4px_16px_rgba(0,0,0,0.7)] font-sans tracking-tight shrink-0">
                          {Math.round(telemetry.speedLimit)}
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="standard-speed-limit"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{ duration: 0.2 }}
                      className="w-24 flex flex-col items-center"
                    >
                      {telemetry.connected && telemetry.speedLimit > 0 ? (
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
                            {Math.round(telemetry.speedLimit)}
                          </text>
                        </svg>
                      ) : (
                        <div className="w-16 h-16 rounded-full border-2 border-white/10 bg-black/40 flex items-center justify-center text-zinc-500 font-black text-xl font-mono">--</div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom-left Navigation HUD (Maximized Map) */}
              <AnimatePresence>
                {renderBottomNavHud(false)}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* EVENT DETAILS POPUP MODAL (IN-CAR OVERVIEW) */}
      <AnimatePresence>
        {selectedEventModal && (
          <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-black/75 border border-white/20 backdrop-blur-md rounded-3xl max-w-xl w-full p-5 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedEventModal(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X size={18} />
              </button>

              {/* Modal Header */}
              <div className="flex items-center gap-3 mb-3 pr-10">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 shadow-xl shadow-teal-500/25 flex items-center justify-center text-white shrink-0">
                  <Calendar size={22} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-400 bg-teal-500/10 border border-teal-500/25 px-2 py-0.5 rounded-md">
                    {selectedEventModal.event_type || 'Konvoi'}
                  </span>
                  <h2 className="text-lg font-black text-white tracking-tight truncate mt-1">
                    {selectedEventModal.title}
                  </h2>
                </div>
              </div>

              {/* Modal Content Scroll Area */}
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-3.5 pr-1">
                {/* Route Banner */}
                <div className="p-3 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-between gap-3 text-xs font-bold">
                  <div className="flex items-center gap-2 text-zinc-200">
                    <MapPin size={15} className="text-blue-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-zinc-500 uppercase font-mono">Start</div>
                      <div className="font-extrabold text-white">{selectedEventModal.start_city || 'Start'}</div>
                      {selectedEventModal.start_company && <div className="text-[10px] text-zinc-400">{selectedEventModal.start_company}</div>}
                    </div>
                  </div>
                  <span className="text-teal-400 text-sm font-mono">➔➔➔</span>
                  <div className="flex items-center gap-2 text-zinc-200 text-right">
                    <div>
                      <div className="text-[10px] text-zinc-500 uppercase font-mono">Ziel</div>
                      <div className="font-extrabold text-emerald-400">{selectedEventModal.end_city || 'Ziel'}</div>
                      {selectedEventModal.end_company && <div className="text-[10px] text-zinc-400">{selectedEventModal.end_company}</div>}
                    </div>
                    <MapPin size={15} className="text-emerald-400 shrink-0" />
                  </div>
                </div>

                {/* Key Event Facts Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">Datum & Uhrzeit</span>
                    <span className="font-bold text-white mt-0.5 block">
                      {selectedEventModal.start_date
                        ? new Date(selectedEventModal.start_date).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' MEZ'
                        : 'TBA'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">Server</span>
                    <span className="font-bold text-white mt-0.5 block truncate">
                      {selectedEventModal.server || 'Beliebig / Sim 1'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">Spiel</span>
                    <span className="font-bold text-white mt-0.5 block truncate">
                      {selectedEventModal.game || 'ETS2'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">Organisator</span>
                    <span className="font-bold text-white mt-0.5 block truncate">
                      {selectedEventModal.organizer || 'Open Pipe Club'}
                    </span>
                  </div>
                </div>

                {/* Detailed Information */}
                {selectedEventModal.information && (
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-xs">
                    <span className="text-[10px] text-teal-400 uppercase font-bold tracking-wider block mb-1">
                      Informationen & Ablauf
                    </span>
                    <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {selectedEventModal.information}
                    </p>
                  </div>
                )}

                {/* Rules */}
                {selectedEventModal.rules && (
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-xs">
                    <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider block mb-1">
                      Regeln & Voraussetzungen
                    </span>
                    <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {selectedEventModal.rules}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Actions Footer */}
              <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  onClick={() => setSelectedEventModal(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-zinc-300 transition-all cursor-pointer"
                >
                  Schließen
                </button>
                <button
                  onClick={() => handleLoadCarPlayEventToNavi(selectedEventModal)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer shadow-emerald-600/30"
                >
                  <Navigation size={14} />
                  <span>In Navigation laden</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ON-SCREEN VIRTUAL KEYBOARD OVERLAY (CARPLAY FULL WIDTH) */}
      <AnimatePresence>
        {isVirtualKbOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed inset-x-2 bottom-2 z-[999999] bg-[#0d1117]/98 backdrop-blur-md border border-white/20 rounded-3xl p-3.5 shadow-[0_25px_60px_rgba(0,0,0,0.98)] flex flex-col gap-3 pointer-events-auto"
          >
            {/* Header / Input Live Preview Box */}
            <div className="flex items-center justify-between bg-black/80 border border-white/15 rounded-2xl px-4 py-2.5 shadow-inner">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  onClick={() => setVirtualKbTarget((prev) => (prev === 'radio' ? 'city' : prev === 'city' ? 'chat' : 'radio'))}
                  title="Zwischen Radio-Suche, Stadt-Suche & Chat wechseln"
                  className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 text-xs font-mono font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  <Keyboard size={16} />
                  <span>{virtualKbTarget === 'radio' ? '📻 RADIO' : virtualKbTarget === 'city' ? '🏙️ STADT' : '💬 CHAT'}</span>
                </button>
                <div className="flex items-center min-w-0 flex-1">
                  <span className="text-base font-black font-mono text-white tracking-wider truncate">
                    {virtualKbTarget === 'radio'
                      ? (radioSearch || 'Radio-Sender suchen...')
                      : virtualKbTarget === 'city'
                      ? (searchQuery || 'Stadt / Firma suchen...')
                      : (chatInput || 'Funkspruch eingeben...')}
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
                            ? 'ring-4 ring-inset ring-primary bg-primary text-[var(--primary-foreground)] font-black scale-[1.03] z-20 border-primary shadow-[0_0_25px_var(--primary-glow)]'
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
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
              <div className="w-20 h-20 rounded-3xl bg-zinc-950/80 border border-white/10 flex items-center justify-center shadow-[0_0_35px_var(--primary-glow)] relative p-3 overflow-hidden backdrop-blur-md">
                <img
                  src="logo.png"
                  alt="Open Pipe Club Logo"
                  className="w-full h-full object-contain drop-shadow-[0_0_12px_var(--primary-glow)]"
                />
              </div>
            </div>
            <h1 className="text-2xl font-black font-['Unbounded',sans-serif] text-white tracking-wider uppercase mb-1">
              Open Pipe Club
            </h1>
            <p className="text-[11px] font-bold text-primary font-mono uppercase tracking-[0.3em] mb-7">
              CarPlay Dashboard
            </p>
            <div className="w-44 h-1.5 bg-white/10 rounded-full overflow-hidden relative shadow-inner">
              <div className="absolute top-0 bottom-0 w-1/2 bg-primary rounded-full animate-carplay-slide shadow-[0_0_10px_var(--primary-glow)]" />
            </div>
            <span className="text-[11px] font-mono text-zinc-500 mt-3 animate-pulse">CarPlay wird gestartet...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VEHICLE IGNITION STANDBY / SLEEP SCREEN */}
      <AnimatePresence>
        {isCarPlaySleeping && (
          <motion.div
            key="ignition-standby-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={() => {
              if (isBlackout) {
                setIsBlackout(false);
                setIsLoading(true);
                setTimeout(() => setIsLoading(false), 700);
              } else {
                setManualWake(true);
              }
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: '#000000',
              background: '#000000',
              zIndex: 9999999,
            }}
            className="flex flex-col items-center justify-between p-8 select-none cursor-pointer overflow-hidden font-['Outfit',sans-serif] bg-black"
          >

            {/* Ambient Background Aura with gentle breathing pulse */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-primary/[0.04] rounded-full blur-3xl pointer-events-none animate-pulse"
              style={{
                zIndex: 1,
              }}
            />

            {/* Top Bar: Vehicle Info & Status - hidden */}
            <div className="w-full flex items-center justify-between z-10 max-w-4xl" style={{ display: 'none' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-primary">
                  <Zap size={18} />
                </div>
                <div>
                  <div className="text-sm font-mono font-black text-white tracking-tight">
                    {telemetry.brand ? `${data.brand} ${data.model || ''}` : 'FAHRZEUG-COCKPIT'}
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                    Zündung ausgeschaltet • Standby-Modus
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-[9.5px] font-mono font-bold text-primary bg-primary/10 border border-primary/25 px-3 py-1 rounded-xl">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  ZÜNDUNG-STANDBY
                </span>
              </div>
            </div>

            {/* Center: Large Ambient Digital Clock */}
            <div className="flex flex-col items-center justify-center text-center my-auto z-10">
              <div className="text-7xl sm:text-8xl md:text-9xl font-black font-mono text-white/90 tracking-tight drop-shadow-[0_0_40px_rgba(255,255,255,0.12)] flex items-center justify-center">
                <span>{timeString.split(':')[0] || '12'}</span>
                <span className="inline-block animate-pulse duration-1000 mx-1 text-white/80">:</span>
                <span>{timeString.split(':')[1] || '00'}</span>
              </div>
              <div className="mt-3 text-xs sm:text-sm font-mono uppercase tracking-[0.25em] text-zinc-500 font-bold">
                {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </div>

              {(() => {
                const standbyMedia = (() => {
                  if ((lastAudioSource === 'radio' || isRadioPlaying) && activeRadio) {
                    return {
                      icon: <Radio size={16} className="text-emerald-400 shrink-0" />,
                      title: radioSongTitle || activeRadio.name,
                      subtitle: radioSongTitle ? `${activeRadio.name} • ${activeRadio.genre}` : (activeRadio.genre || 'ETS2 Live-Radio')
                    };
                  }
                  if ((lastAudioSource === 'local' || isLocalPlaying) && localTracks[currentLocalIndex]) {
                    return {
                      icon: <Disc size={16} className="text-blue-400 shrink-0" />,
                      title: localTracks[currentLocalIndex].name,
                      subtitle: 'Lokale Musik'
                    };
                  }
                  if (media && media.title) {
                    return {
                      icon: <Music size={16} className="text-primary shrink-0" />,
                      title: media.title,
                      subtitle: media.artist
                    };
                  }
                  if (activeRadio) {
                    return {
                      icon: <Radio size={16} className="text-emerald-400 shrink-0" />,
                      title: radioSongTitle || activeRadio.name,
                      subtitle: activeRadio.genre || 'ETS2 Live-Radio'
                    };
                  }
                  return null;
                })();

                if (!standbyMedia) return null;

                return (
                  <div className="mt-7 flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/[0.04] border border-white/10 max-w-md shadow-xl backdrop-blur-md">
                    {standbyMedia.icon}
                    <span className="text-xs font-mono text-zinc-300 truncate">
                      {standbyMedia.title} {standbyMedia.subtitle && <span className="text-zinc-500">— {standbyMedia.subtitle}</span>}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Bottom Footer: Wake Hint - hidden */}
            <div className="flex items-center gap-2.5 text-[11px] font-mono text-zinc-400 bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 px-5 py-2.5 rounded-2xl transition-all z-10 shadow-xl" style={{ display: 'none' }}>
              <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
              <span>Bildschirm antippen zum temporären Aufwecken • Reaktiviert sich automatisch bei Zündung</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MANUAL WAKE PILL (When ignition is off but user manually woke the screen) */}
      {manualWake && !isIgnitionOn && settings.carPlayIgnitionSleep && telemetry.connected && (
        <button
          onClick={() => setManualWake(false)}
          className="fixed top-3 right-5 z-[99999] flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-xs font-mono font-bold shadow-2xl backdrop-blur-xl cursor-pointer transition-all active:scale-95"
          title="CarPlay wieder in Standby versetzen"
        >
          <Zap size={13} className="text-primary" />
          <span>Zündung aus • In Standby versetzen</span>
        </button>
      )}

      </div>

    </>
  );
}
