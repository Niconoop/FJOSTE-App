import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Compass, MapPin, Calendar, Clock, Server, Gamepad2, 
  Users, Sparkles, Download, CheckCircle2, ChevronLeft, ChevronRight,
  Layers, ArrowRight, Image as ImageIcon, RotateCcw, Eye
} from 'lucide-react';
import { toast } from 'sonner';

import { RoutePlanner, type RouteWaypoint } from './RoutePlanner';
import { COMMON_CITIES } from '../data/ets2Cities';
import { useTheme } from '../context/ThemeContext';

interface RoutePlannerExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrganizer?: string;
  initialTitle?: string;
  initialStartDate?: string;
  initialServer?: string;
  initialGame?: string;
  initialStartCity?: string;
  initialStartCompany?: string;
  initialEndCity?: string;
  initialEndCompany?: string;
  initialWaypoints?: RouteWaypoint[];
}

export const RoutePlannerExportModal: React.FC<RoutePlannerExportModalProps> = ({
  isOpen,
  onClose,
  initialOrganizer = 'Open Pipe Club',
  initialTitle = 'Community Konvoi',
  initialStartDate,
  initialServer = 'Simulation 1',
  initialGame = 'ETS2',
  initialStartCity = '',
  initialStartCompany = '',
  initialEndCity = '',
  initialEndCompany = '',
  initialWaypoints = [],
}) => {
  const { appearance } = useTheme();
  const accentColor = appearance?.accentColor || '#f59e0b';

  // Helper to get formatted default date (e.g. today 18:00 or next Friday 18:00)
  const getDefaultDateTime = () => {
    if (initialStartDate) {
      try {
        const d = new Date(initialStartDate);
        if (!isNaN(d.getTime())) {
          return d.toISOString().slice(0, 16);
        }
      } catch {}
    }
    const d = new Date();
    d.setHours(18, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  // Form State
  const [organizer, setOrganizer] = useState(initialOrganizer);
  const [eventTitle, setEventTitle] = useState(initialTitle);
  const [startDateStr, setStartDateStr] = useState(getDefaultDateTime);
  const [server, setServer] = useState(initialServer);
  const [game, setGame] = useState(initialGame);
  const [startCity, setStartCity] = useState(initialStartCity);
  const [startCompany, setStartCompany] = useState(initialStartCompany);
  const [endCity, setEndCity] = useState(initialEndCity);
  const [endCompany, setEndCompany] = useState(initialEndCompany);

  // Planner & Export State
  const [waypoints, setWaypoints] = useState<RouteWaypoint[]>(initialWaypoints);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTabMobile, setActiveTabMobile] = useState<'form' | 'map'>('form');

  const [generatedFile, setGeneratedFile] = useState<File | null>(null);
  const [generatedPreviewUrl, setGeneratedPreviewUrl] = useState<string | null>(null);
  const [generatedMeta, setGeneratedMeta] = useState<{
    distanceKm: number;
    durationMinutes: number;
    startCity: string;
    endCity: string;
    startCompany?: string;
    endCompany?: string;
  } | null>(null);

  // Keep ISO start date in sync for RoutePlanner poster
  const isoStartDate = useMemo(() => {
    try {
      const d = new Date(startDateStr);
      return !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
    } catch {
      return new Date().toISOString();
    }
  }, [startDateStr]);

  // Clean up object URL on unmount or replace
  useEffect(() => {
    return () => {
      if (generatedPreviewUrl) {
        URL.revokeObjectURL(generatedPreviewUrl);
      }
    };
  }, [generatedPreviewUrl]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Sync cities from waypoints if available
  const handleWaypointsChange = (wps: RouteWaypoint[]) => {
    setWaypoints(wps);
    if (wps.length > 0 && (!startCity || startCity === 'Start')) {
      const first = wps[0].name;
      if (first) setStartCity(first);
    }
    if (wps.length > 1 && (!endCity || endCity === 'Ziel')) {
      const last = wps[wps.length - 1].name;
      if (last) setEndCity(last);
    }
  };

  // Called when 4K Route Image is captured
  const handleRouteGenerated = (file: File, meta: any) => {
    if (generatedPreviewUrl) {
      URL.revokeObjectURL(generatedPreviewUrl);
    }
    const newUrl = URL.createObjectURL(file);
    setGeneratedFile(file);
    setGeneratedPreviewUrl(newUrl);
    setGeneratedMeta(meta);
    if (meta.startCity && (!startCity || startCity === 'Start')) setStartCity(meta.startCity);
    if (meta.endCity && (!endCity || endCity === 'Ziel')) setEndCity(meta.endCity);
  };

  // Download generated image helper
  const handleDownload = () => {
    if (!generatedFile && !generatedPreviewUrl) {
      toast.error('Es wurde noch kein Routenbild generiert. Klicke auf der Karte auf "4K Routenbild generieren".');
      return;
    }

    try {
      const sCity = generatedMeta?.startCity || startCity || 'Start';
      const eCity = generatedMeta?.endCity || endCity || 'Ziel';
      const rawTitle = (eventTitle || `${sCity}_nach_${eCity}`).trim();
      const safeTitle = rawTitle.replace(/[^a-zA-Z0-9_\-\u00C0-\u017F]/g, '_');
      const filename = `OPC_${safeTitle}_4K_Route.jpg`;

      const downloadUrl = generatedPreviewUrl || (generatedFile ? URL.createObjectURL(generatedFile) : '');
      if (!downloadUrl) return;

      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success('4K-Routenbild heruntergeladen!', {
        description: filename,
      });
    } catch (err: any) {
      toast.error(`Download fehlgeschlagen: ${err.message || 'Unbekannter Fehler'}`);
    }
  };

  // Quick Date setters
  const setQuickDate = (type: 'today' | 'tomorrow' | 'friday') => {
    const d = new Date();
    if (type === 'tomorrow') {
      d.setDate(d.getDate() + 1);
    } else if (type === 'friday') {
      const currentDay = d.getDay();
      const daysUntilFriday = (5 - currentDay + 7) % 7 || 7;
      d.setDate(d.getDate() + daysUntilFriday);
    }
    d.setHours(18, 0, 0, 0);
    setStartDateStr(d.toISOString().slice(0, 16));
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="route-export-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-2xl p-2 sm:p-4 md:p-6 overflow-hidden select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.94, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.96, y: 10, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="relative w-full h-[96vh] max-w-[98vw] 2xl:max-w-[1800px] flex flex-col rounded-3xl border border-white/15 bg-[#07090e] shadow-[0_30px_90px_rgba(0,0,0,0.95)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Header Bar */}
          <div className="h-16 px-4 sm:px-6 border-b border-white/10 bg-black/50 backdrop-blur-md flex items-center justify-between shrink-0 z-30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Compass size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-unbounded text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                    Routenplaner & 4K-Bild-Export
                  </h1>
                  <span className="hidden sm:inline-flex text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-widest">
                    Event-Team
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 hidden md:block">
                  Passe Veranstalter, Datum und Titel an – alle Angaben fließen live in das gerenderte 4K-Routenposter ein.
                </p>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Mobile View Toggle */}
              <div className="flex md:hidden items-center bg-white/5 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveTabMobile('form')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                    activeTabMobile === 'form' ? 'bg-amber-500 text-black' : 'text-slate-400'
                  }`}
                >
                  Poster-Daten
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabMobile('map')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                    activeTabMobile === 'map' ? 'bg-amber-500 text-black' : 'text-slate-400'
                  }`}
                >
                  Karte
                </button>
              </div>

              {/* Quick Download Button if image is already generated */}
              {generatedFile && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
                  title="Generiertes 4K-Routenbild herunterladen"
                >
                  <Download size={14} />
                  <span>Poster herunterladen</span>
                </button>
              )}

              {/* Close Modal Button */}
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-white/15 border border-white/15 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Schließen (Esc)"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Main Content Area (Split Sidebar + Full Map) */}
          <div className="flex-1 min-h-0 flex relative overflow-hidden">
            {/* Left Sidebar: Poster & Event Form */}
            <div
              className={`transition-all duration-300 z-20 flex flex-col border-r border-white/10 bg-[#090c14]/95 backdrop-blur-xl ${
                // Mobile visibility
                activeTabMobile === 'form' ? 'flex' : 'hidden md:flex'
              } ${
                // Desktop collapsible width
                isSidebarOpen ? 'w-full md:w-[380px] lg:w-[410px] shrink-0' : 'w-0 overflow-hidden border-r-0'
              }`}
            >
              {/* Sidebar Header */}
              <div className="p-4 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-white/[0.01]">
                <div className="flex items-center gap-2">
                  <Layers size={15} className="text-amber-400" />
                  <span className="font-unbounded text-xs font-bold text-white uppercase tracking-wider">
                    Poster- & Eventdaten
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                  title="Sidebar einklappen"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 sm:space-y-5 no-scrollbar">
                {/* Note Banner */}
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 leading-relaxed">
                  <div className="font-bold flex items-center gap-1.5 text-amber-400 mb-0.5">
                    <Sparkles size={12} />
                    Dynamisches 4K-Branding
                  </div>
                  Trage hier die Daten ein, die auf der Infokarte oben rechts und im Banner unten im 4K-Routenbild angezeigt werden sollen.
                </div>

                {/* Organizer / Veranstalter */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Users size={12} className="text-amber-400" /> Veranstalter / Organisator
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="z.B. Open Pipe Club"
                      value={organizer}
                      onChange={(e) => setOrganizer(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:border-amber-400/50 focus:bg-white/[0.07] outline-none transition-all"
                    />
                    {organizer !== 'Open Pipe Club' && (
                      <button
                        type="button"
                        onClick={() => setOrganizer('Open Pipe Club')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-amber-400 hover:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20"
                      >
                        OPC Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Event Title */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Compass size={12} className="text-amber-400" /> Konvoi- / Event-Titel
                  </label>
                  <input
                    type="text"
                    placeholder="z.B. Freitags-Convoy oder Alpen-Tour"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:border-amber-400/50 focus:bg-white/[0.07] outline-none transition-all"
                  />
                  <p className="text-[9px] text-slate-500">Erscheint groß im unteren Kino-Banner des Bildes.</p>
                </div>

                {/* Date & Time Picker */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Clock size={12} className="text-amber-400" /> Startzeit & Datum (UTC)
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setQuickDate('today')}
                        className="text-[9px] font-bold text-slate-400 hover:text-white bg-white/5 px-1.5 py-0.5 rounded"
                      >
                        Heute
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickDate('friday')}
                        className="text-[9px] font-bold text-slate-400 hover:text-white bg-white/5 px-1.5 py-0.5 rounded"
                      >
                        Fr
                      </button>
                    </div>
                  </div>
                  <input
                    type="datetime-local"
                    value={startDateStr}
                    onChange={(e) => setStartDateStr(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400/50 focus:bg-white/[0.07] outline-none transition-all cursor-pointer [color-scheme:dark]"
                  />
                </div>

                {/* Server & Game */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Server size={12} className="text-amber-400" /> Server
                    </label>
                    <input
                      type="text"
                      list="server-suggestions"
                      placeholder="Simulation 1"
                      value={server}
                      onChange={(e) => setServer(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-amber-400/50 outline-none transition-all"
                    />
                    <datalist id="server-suggestions">
                      <option value="Simulation 1" />
                      <option value="Simulation 2" />
                      <option value="ProMods" />
                      <option value="Arcade" />
                      <option value="Event Server" />
                    </datalist>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Gamepad2 size={12} className="text-amber-400" /> Spiel
                    </label>
                    <select
                      value={game}
                      onChange={(e) => setGame(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400/50 outline-none transition-all cursor-pointer"
                    >
                      <option value="ETS2" className="bg-[#0b0e17]">ETS2</option>
                      <option value="ATS" className="bg-[#0b0e17]">ATS</option>
                    </select>
                  </div>
                </div>

                {/* Quick Waypoints to Cities Sync */}
                {waypoints.length >= 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (waypoints[0]?.name) setStartCity(waypoints[0].name);
                      if (waypoints[waypoints.length - 1]?.name) setEndCity(waypoints[waypoints.length - 1].name);
                      toast.success(`Orte übernommen: ${waypoints[0]?.name} ➔ ${waypoints[waypoints.length - 1]?.name}`);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    <span>Von Wegpunkten übernehmen ({waypoints[0]?.name} ➔ {waypoints[waypoints.length - 1]?.name})</span>
                  </button>
                )}

                {/* Start Ort: City & Company */}
                <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                      <MapPin size={12} className="text-emerald-400" /> Start-Ort
                    </label>
                    {waypoints[0]?.name && (
                      <span className="text-[9px] text-slate-500">
                        Wegpunkt: <b className="text-slate-300">{waypoints[0].name}</b>
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Start-Stadt (z.B. Berlin)"
                      value={startCity}
                      onChange={(e) => setStartCity(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-emerald-400/50 outline-none transition-all"
                    />
                    <input
                      type="text"
                      placeholder="Start-Firma (Optional)"
                      value={startCompany}
                      onChange={(e) => setStartCompany(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-emerald-400/50 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* End Ort: City & Company */}
                <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
                      <MapPin size={12} className="text-rose-400" /> Ziel-Ort
                    </label>
                    {waypoints.length > 1 && waypoints[waypoints.length - 1]?.name && (
                      <span className="text-[9px] text-slate-500">
                        Wegpunkt: <b className="text-slate-300">{waypoints[waypoints.length - 1].name}</b>
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Ziel-Stadt (z.B. Hamburg)"
                      value={endCity}
                      onChange={(e) => setEndCity(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-rose-400/50 outline-none transition-all"
                    />
                    <input
                      type="text"
                      placeholder="Ziel-Firma (Optional)"
                      value={endCompany}
                      onChange={(e) => setEndCompany(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-rose-400/50 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Generated Image Card (if present) */}
                {generatedPreviewUrl && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                        <ImageIcon size={13} /> 4K-Routenbild bereit
                      </span>
                      <span className="text-[9px] font-bold text-slate-400">3840 × 2160 UHD</span>
                    </div>

                    <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/60 shadow-inner group">
                      <img
                        src={generatedPreviewUrl}
                        alt="Generierte Route"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownload}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                      >
                        <Download size={13} />
                        Bild herunterladen
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar Footer */}
              <div className="p-4 border-t border-white/[0.08] bg-black/40 flex items-center justify-between shrink-0">
                <span className="text-[10px] text-slate-500">
                  {waypoints.length} {waypoints.length === 1 ? 'Wegpunkt' : 'Wegpunkte'} auf der Karte
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      setActiveTabMobile('map');
                    } else {
                      toast.info('Setze Wegpunkte auf der Karte oder klicke auf "4K Routenbild generieren"');
                    }
                  }}
                  className="md:hidden flex items-center gap-1.5 text-xs font-bold text-amber-400"
                >
                  Zur Karte <ArrowRight size={13} />
                </button>
              </div>
            </div>

            {/* Collapsed Sidebar Toggle (Desktop) */}
            {!isSidebarOpen && (
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="hidden md:flex absolute top-4 left-4 z-30 p-2.5 rounded-2xl bg-black/80 hover:bg-black border border-white/20 text-amber-400 hover:text-amber-300 shadow-2xl backdrop-blur-xl transition-all cursor-pointer items-center gap-2"
                title="Poster-Datenleiste ausklappen"
              >
                <ChevronRight size={18} />
                <span className="text-[10px] font-black uppercase tracking-wider pr-1">Poster-Daten</span>
              </button>
            )}

            {/* Right Map Canvas Area: RoutePlanner */}
            <div
              className={`flex-1 h-full relative overflow-hidden ${
                activeTabMobile === 'map' ? 'flex' : 'hidden md:flex'
              }`}
            >
              <RoutePlanner
                isFullscreen={true}
                onToggleFullscreen={() => {}}
                organizer={organizer}
                eventTitle={eventTitle}
                startDate={isoStartDate}
                server={server}
                game={game}
                startCity={startCity}
                startCompany={startCompany}
                endCity={endCity}
                endCompany={endCompany}
                initialWaypoints={waypoints}
                onWaypointsChange={handleWaypointsChange}
                onRouteGenerated={handleRouteGenerated}
                onExportImage={handleRouteGenerated}
                captureButtonText="4K Routenbild generieren"
                hideCloseButton={true}
              />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
