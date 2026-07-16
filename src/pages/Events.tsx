import { useEffect, useState, useMemo, useCallback, Component } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, MapPin, Plus, Trash2, Loader2, ChevronDown, Clock, Users, UserPlus, UserMinus, List, CalendarDays, ChevronLeft, ChevronRight, Upload, X as XIcon, Image as ImageIcon, LayoutGrid, Calendar as CalendarIcon, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { API_URL, getAvatarUrl } from "../config";

// --- UTILITY FUNCTIONS ---

const formatDate = (dateStr) => {
  if (!dateStr) return { day: '??', month: '???' };
  const date = new Date(dateStr);
  return {
    day: date.toLocaleDateString("de-DE", { day: "2-digit" }),
    month: date.toLocaleDateString("de-DE", { month: "short" }).toUpperCase(),
  };
};

const formatTime = (dateStr) => {
  if (!dateStr) return "TBA";
  return new Date(dateStr).toLocaleTimeString("de-DE", {
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin"
  }) + " MEZ";
};

const formatLongDateTime = (d) => d ? new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Datum & Uhrzeit wählen...";

const slugify = (text) => {
  if (!text) return '';
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
};

const handleEventClick = (event) => {
  const eventUrl = `https://www.openpipeclub.com/events/${slugify(event.title || '')}`;
  window.open(eventUrl, '_blank');
};

// --- ANIMATION VARIANTS ---

const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06 }
  }
};

const staggerChild = {
  hidden: { opacity: 1, y: 18, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 260, damping: 20 } }
};

// --- ERROR BOUNDARY ---

class ErrorBoundary extends Component<{ children: any }, { error: string | null }> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  render() {
    if (this.state.error) return (
      <div className="frosted-card border-2 border-[#f59e0b]/20 flex flex-col items-center justify-center py-16 text-center">
        <p className="text-red-400 font-bold text-sm mb-2">Fehler beim Laden der Events</p>
        <p className="text-slate-600 text-xs">{this.state.error}</p>
        <button onClick={() => this.setState({ error: null })} className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs text-slate-400 transition-all">Erneut versuchen</button>
      </div>
    );
    return this.props.children;
  }
}

// --- NEW EVENT CARD ---

const NewEventCard = ({ event }: any) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!event.start_date) return;
    const calculateTimeLeft = () => {
      const diff = new Date(event.start_date) - new Date();
      if (diff <= 0) { setTimeLeft("Event läuft"); return; }
      const d = Math.floor(diff / 864e5), h = Math.floor(diff % 864e5 / 36e5), m = Math.floor(diff % 36e5 / 6e4);
      if (d > 30) { const mo = Math.floor(d / 30); setTimeLeft(`in ${mo} Monat${mo > 1 ? 'en' : ''}`); }
      else if (d > 7) { const w = Math.floor(d / 7); setTimeLeft(`in ${w} Woche${w > 1 ? 'n' : ''}`); }
      else if (d > 0) setTimeLeft(`in ${d} Tag${d > 1 ? 'en' : ''}`);
      else if (h > 0) setTimeLeft(`in ${h} Std.`);
      else if (m > 0) setTimeLeft(`in ${m} Min.`);
      else setTimeLeft("in Kürze");
    };
    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(interval);
  }, [event.start_date]);

  const { day, month } = formatDate(event.start_date);
  const coverUrl = event.cover_url?.startsWith("http") ? event.cover_url : event.cover_url ? getAvatarUrl(event.cover_url) : `https://source.unsplash.com/random/400x300?truck,${event.id}`;
  const coordinator = event.is_custom ? "Open Pipe Club" : (event.company_name || "Externe Spedition");

  return (
    <motion.div variants={staggerChild} onClick={() => handleEventClick(event)} className="bg-[#0b0b0c] rounded-2xl overflow-hidden group border border-zinc-900 transition-all duration-300 hover:border-amber-400/40 hover:shadow-[0_0_25px_rgba(245,158,11,0.12)] flex flex-col cursor-pointer h-full">
      <div className="relative h-44 overflow-hidden shrink-0">
        <img src={coverUrl} alt={event.title || event.start_city} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0c] via-transparent to-black/30" />
        <div className="absolute top-4 left-4 bg-zinc-950/80 backdrop-blur-md rounded-xl w-14 h-14 flex flex-col items-center justify-center text-white border border-zinc-800 shadow-md">
          <span className="text-xl font-bold tracking-tighter leading-none">{day}</span>
          <span className="text-[9px] font-black uppercase text-amber-400 mt-0.5">{month}</span>
        </div>
      </div>
      <div className="p-5 flex-grow flex flex-col justify-between">
        <h3 className="text-base font-extrabold text-white group-hover:text-amber-400 transition-colors duration-200 uppercase tracking-wider mb-5 line-clamp-2">{event.title || `${event.start_city} to ${event.end_city}`}</h3>
        <div className="space-y-4">
          <div className="border-t border-zinc-900/60 pt-4 grid grid-cols-2 gap-x-4">
            <div><p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">ORGANISATOR</p><p className="text-xs font-bold text-white mt-1 truncate">{coordinator}</p></div>
            <div className="text-right"><p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">UHRZEIT</p><p className="text-xs font-bold text-white mt-1">{formatTime(event.start_date)}</p></div>
          </div>
          {timeLeft && <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl p-3 text-center"><p className="text-[9px] text-amber-400 uppercase tracking-widest font-black">Countdown</p><p className="text-sm font-black text-white italic mt-0.5">{timeLeft}</p></div>}
        </div>
      </div>
    </motion.div>
  );
};

// --- EVENT DETAIL MODAL ---

const EventDetail = ({ event, participants, isJoined, canDelete, onDelete, onJoin, onLeave, onClose }: any) => {
  if (!event) return null;
  const coverUrl = event.cover_url?.startsWith("http") ? event.cover_url : event.cover_url ? getAvatarUrl(event.cover_url) : `https://source.unsplash.com/random/800x400?truck,${event.id}`;
  const coordinator = event.is_custom ? "Open Pipe Club" : (event.company_name || "Externe Spedition");

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex items-start justify-center p-6 pt-20 bg-black/90 backdrop-blur-xl overflow-y-auto" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} transition={{ type: "spring", stiffness: 380, damping: 28 }} className="frosted-card w-full max-w-4xl !p-0 overflow-hidden shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
        <div className="relative h-64 bg-zinc-900">
          <img src={coverUrl} alt={event.title} className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0c] via-transparent" />
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-slate-300 hover:text-white transition-colors"><XIcon size={20} /></button>
        </div>
        <div className="p-8 -mt-20 relative">
          <h1 className="text-3xl font-extrabold text-white uppercase tracking-wider">{event.title || `${event.start_city} to ${event.end_city}`}</h1>
          <div className="flex items-center gap-6 mt-3 text-sm text-zinc-400">
            <div className="flex items-center gap-2"><Calendar size={14} className="text-amber-400" /> {formatLongDateTime(event.start_date)}</div>
            <div className="flex items-center gap-2"><Users size={14} className="text-amber-400" /> {participants.length} Teilnehmer</div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <p className="text-zinc-300">{event.information || "Keine weiteren Informationen verfügbar."}</p>
              </div>
              {event.route_url && <a href={getAvatarUrl(event.route_url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 hover:text-amber-300">Route ansehen <ExternalLink size={14} /></a>}
            </div>
            <div className="space-y-6">
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-zinc-500">Organisator:</span> <span className="font-bold text-white">{coordinator}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Start:</span> <span className="font-bold text-white">{event.start_city || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Ziel:</span> <span className="font-bold text-white">{event.end_city || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Server:</span> <span className="font-bold text-white">{event.server || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Spiel:</span> <span className="font-bold text-white">{event.game || 'N/A'}</span></div>
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">Teilnehmer ({participants.length})</h3>
                <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                  {participants.map(p => <div key={p.id} className="flex items-center gap-2"><img src={getAvatarUrl(p.avatar_url)} className="w-6 h-6 rounded-full" /> <span className="text-sm text-zinc-300">{p.username}</span></div>)}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {isJoined ? <button onClick={() => onLeave(event.id)} className="w-full text-center px-4 py-3 bg-red-500/20 text-red-400 rounded-xl font-bold text-sm hover:bg-red-500/30 transition-all flex items-center justify-center gap-2"><UserMinus size={16} /> Abmelden</button>
                  : <button onClick={() => onJoin(event.id)} className="w-full text-center px-4 py-3 bg-green-500/20 text-green-400 rounded-xl font-bold text-sm hover:bg-green-500/30 transition-all flex items-center justify-center gap-2"><UserPlus size={16} /> Anmelden</button>}
                {canDelete && <button onClick={() => { onDelete(event.id); onClose(); }} className="w-full text-center px-4 py-2 bg-zinc-800 text-zinc-400 rounded-xl font-bold text-xs hover:bg-zinc-700 transition-all flex items-center justify-center gap-2"><Trash2 size={14} /> Löschen</button>}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- CALENDAR VIEW ---
const CalendarView = ({ events, month, setMonth }) => {
  const today = new Date();
  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const startDay = (startOfMonth.getDay() + 6) % 7; // Monday is 0
  const daysInMonth = endOfMonth.getDate();

  const eventsByDate = useMemo(() => {
    const map = new Map();
    events.forEach(event => {
      const date = new Date(event.start_date).toDateString();
      if (!map.has(date)) map.set(date, []);
      map.get(date).push(event);
    });
    return map;
  }, [events]);

  const changeMonth = (offset) => {
    setMonth(new Date(month.getFullYear(), month.getMonth() + offset, 1));
  };

  return (
    <div className="bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl p-4 md:p-6">
      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center justify-between bg-black/30 rounded-full p-1">
          <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-white/10 text-zinc-400 transition-colors"><ChevronLeft size={20} /></button>
          <h3 className="text-base md:text-lg font-bold text-white tracking-wide uppercase mx-4 md:mx-6">{month.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</h3>
          <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-white/10 text-zinc-400 transition-colors"><ChevronRight size={20} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 md:gap-4 mb-3">
        {['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'].map(day => (
          <div key={day} className="text-center text-xs font-bold text-zinc-500 tracking-widest">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = new Date(month.getFullYear(), month.getMonth(), day);
          const dateString = date.toDateString();
          const dayEvents = eventsByDate.get(dateString) || [];
          const isToday = date.toDateString() === today.toDateString();

          // Special view for today with a single event
          if (isToday && dayEvents.length === 1) {
            const event = dayEvents[0];
            const coverUrl = event.cover_url?.startsWith("http") ? event.cover_url : event.cover_url ? getAvatarUrl(event.cover_url) : `https://source.unsplash.com/random/400x300?truck,${event.id}`;
            return (
              <div key={day} onClick={() => handleEventClick(event)} className="relative bg-zinc-900 rounded-xl md:rounded-2xl overflow-hidden group border-2 border-amber-400/80 h-20 md:h-28 cursor-pointer shadow-[0_0_25px_rgba(245,158,11,0.2)]">
                <img src={coverUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-40 group-hover:opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <span className={`absolute top-1.5 left-2 md:top-2 md:left-3 text-sm font-bold text-amber-400`}>{day}</span>
                <div className="absolute bottom-0 left-0 right-0 p-1.5 md:p-2">
                  <p className="text-white text-[10px] md:text-xs font-bold truncate">{event.title}</p>
                </div>
              </div>
            )
          }

          return (
            <div key={day} className={`relative bg-black/40 rounded-xl md:rounded-2xl p-2 h-20 md:h-28 transition-all duration-300 group hover:bg-black/60 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] ${isToday ? 'border border-amber-400/30' : 'border border-transparent'}`}>
              <span className={`text-sm font-bold ${isToday ? 'text-amber-400' : 'text-zinc-400'}`}>{day}</span>
              <div className="absolute inset-0 top-8 p-1.5 space-y-1 overflow-y-auto">
                {dayEvents.map(event => (
                  <div key={event.id} onClick={() => handleEventClick(event)} className="bg-zinc-900/70 hover:bg-zinc-800 text-white text-[10px] md:text-xs font-semibold p-1.5 rounded-md truncate cursor-pointer transition-colors">
                    {event.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


// --- MAIN EVENTS COMPONENT ---

export default function Events({ selectedId, onClearSelectedId }: any) {
  const { token, user, isAdmin, hasRole } = useAuth();
  const EVENT_ROLES = ["event team", "event-team", "hr team", "hr-team", "personal team", "personal-team"];
  const canManageEvents = isAdmin || hasRole(EVENT_ROLES);

  const [events, setEvents] = useState<any[]>([]);
  const [rsvps, setRsvps] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState("list");
  const [calMonth, setCalMonth] = useState(new Date());

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [form, setForm] = useState({ title: "", event_type: "Convoy", start_date: "", start_city: "", end_city: "", server: "", game: "ETS2", information: "" });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [routeFile, setRouteFile] = useState<File | null>(null);

  const [showPickerModal, setShowPickerModal] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [pickerTime, setPickerTime] = useState("18:00");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const h = { Authorization: `Bearer ${token}` };
      const [tr, cu, rs] = await Promise.all([
        axios.get(`${API_URL}/trucky/events`, { headers: h }).catch(e => { console.error("Trucky Error:", e); return { data: [] }; }),
        axios.get(`${API_URL}/events/custom`, { headers: h }).catch(e => { console.error("Custom Events Error:", e); return { data: [] }; }),
        axios.get(`${API_URL}/events/rsvps`, { headers: h }).catch(e => { console.error("RSVP Error:", e); return { data: {} }; }),
      ]);
      const all = [...(Array.isArray(tr.data) ? tr.data : []), ...(Array.isArray(cu.data) ? cu.data : [])];
      setEvents(all.sort((a, b) => new Date(a.start_date || 0).getTime() - new Date(b.start_date || 0).getTime()));
      setRsvps(rs.data || {});
    } catch (e: any) {
      setError("Daten konnten nicht geladen werden.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    try {
      const { ipcRenderer } = window.require('electron');
      if (ipcRenderer) ipcRenderer.send('rpc-page-changed', 'events', { planning: showForm });
    } catch (e) { }
  }, [showForm]);

  useEffect(() => {
    if (selectedId && !loading && events.length > 0) {
      const target = events.find(e => String(e.id) === String(selectedId));
      if (target) handleEventClick(target); // Open external URL
      onClearSelectedId?.();
    }
  }, [selectedId, loading, events, onClearSelectedId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.start_date) return toast.error("Titel und Datum sind Pflicht");
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (coverFile) fd.append("cover", coverFile);
      if (routeFile) fd.append("route", routeFile);
      await axios.post(`${API_URL}/events`, fd, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } });
      toast.success("Event erfolgreich geplant!");
      setShowForm(false);
      setForm({ title: "", event_type: "Convoy", start_date: "", start_city: "", end_city: "", server: "", game: "ETS2", information: "" });
      setCoverFile(null); setRouteFile(null);
      loadAll();
    } catch { toast.error("Fehler beim Erstellen des Events"); }
    finally { setSubmitting(false); }
  };

  const handleRsvp = async (eid: string | number, action: 'join' | 'leave') => {
    const optimisticRsvps = { ...rsvps };
    const eventRsvps = optimisticRsvps[eid] || [];
    if (action === 'join') {
      optimisticRsvps[eid] = [...eventRsvps, { id: user?.user_id, username: user?.username, avatar_url: user?.avatar_url }];
    } else {
      optimisticRsvps[eid] = eventRsvps.filter(p => p.id !== user?.user_id);
    }
    setRsvps(optimisticRsvps);

    try {
      if (action === 'join') {
        await axios.post(`${API_URL}/events/${eid}/rsvp`, {}, { headers: { Authorization: `Bearer ${token}` } });
        toast.success("Angemeldet!");
      } else {
        await axios.delete(`${API_URL}/events/${eid}/rsvp`, { headers: { Authorization: `Bearer ${token}` } });
        toast.success("Abgemeldet");
      }
      loadAll(); // Reload to be sure
    } catch {
      toast.error(`Fehler bei der ${action === 'join' ? 'An' : 'Ab'}meldung`);
      loadAll(); // Revert optimistic update on error
    }
  };

  const handleDelete = async (eid: string | number) => {
    if (!window.confirm("Soll dieses Event wirklich gelöscht werden?")) return;
    try {
      await axios.delete(`${API_URL}/events/${eid}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Event gelöscht");
      loadAll();
    } catch { toast.error("Fehler beim Löschen"); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'route') => {
    if (e.target.files?.[0]) {
      if (type === 'cover') setCoverFile(e.target.files[0]);
      else setRouteFile(e.target.files[0]);
    }
  };

  const handlePickerConfirm = () => {
    const [h, m] = pickerTime.split(':').map(Number);
    const newDate = new Date(pickerDate);
    newDate.setHours(h, m);
    setForm({ ...form, start_date: newDate.toISOString() });
    setShowPickerModal(false);
  };

  const isJoined = (eid: string | number) => (rsvps[eid] || []).some((p: any) => p.id === user?.user_id);
  const getParticipants = (eid: string | number) => rsvps[eid] || [];

  const upcomingEvents = useMemo(() => events.filter(e => new Date(e.start_date) >= new Date()), [events]);
  const pastEvents = useMemo(() => events.filter(e => new Date(e.start_date) < new Date()).sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()), [events]);

  return (
    <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-16">
        <span className="overline text-amber-400 mb-2 inline-block">Veranstaltungen</span>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tighter text-white mt-2">Terminkalender</h1>
        {!loading && <p className="text-zinc-400 text-sm mt-3">{events.length} {events.length === 1 ? "Event" : "Events"} in der Übersicht.</p>}
      </div>

      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-1 bg-[#0b0b0c] p-1.5 rounded-full border border-zinc-900 shadow-lg">
          <button onClick={() => setView("list")} className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 ${view === "list" ? "bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] text-[#050507] shadow-md" : "text-zinc-400 hover:text-white"}`}><LayoutGrid size={13} /> Liste</button>
          <button onClick={() => setView("calendar")} className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 ${view === "calendar" ? "bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] text-[#050507] shadow-md" : "text-zinc-400 hover:text-white"}`}><CalendarIcon size={13} /> Kalender</button>
        </div>
        {canManageEvents && <button onClick={() => setShowForm(!showForm)} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${showForm ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-amber-400 text-black"}`}>{showForm ? <XIcon size={16} /> : <Plus size={16} />}{showForm ? "Abbrechen" : "Event planen"}</button>}
      </div>

      <ErrorBoundary>
        {loading && <div className="flex justify-center items-center py-20"><Loader2 className="animate-spin text-amber-400" size={32} /></div>}
        {error && <div className="text-center py-20 text-red-400">{error}</div>}
        {!loading && !error && (
          <AnimatePresence mode="wait">
            <motion.div key={view} initial={{ opacity: 1, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {view === 'list' && (
                <div className="space-y-12">
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-1 h-4 bg-amber-400 rounded-full" />
                      <h2 className="font-unbounded text-sm font-bold text-amber-400 uppercase tracking-widest">
                        Anstehende Events
                      </h2>
                    </div>
                    {upcomingEvents.length > 0 ? (
                      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {upcomingEvents.map(event => <NewEventCard key={event.id} event={event} />)}
                      </motion.div>
                    ) : (
                      <div className="text-center py-16 frosted-card border-dashed border-zinc-800">
                        <p className="text-zinc-400">Zurzeit sind keine Events geplant.</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-1 h-4 bg-amber-400 rounded-full" />
                      <h2 className="font-unbounded text-sm font-bold text-amber-400 uppercase tracking-widest">
                        Vergangene Events
                      </h2>
                    </div>
                    {pastEvents.length > 0 ? (
                      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pastEvents.slice(0, 6).map(event => <NewEventCard key={event.id} event={event} />)}
                      </motion.div>
                    ) : (
                      <div className="text-center py-16 frosted-card border-dashed border-zinc-800">
                        <p className="text-zinc-400">Noch keine vergangenen Events.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {view === 'calendar' && (
                <CalendarView events={events} month={calMonth} setMonth={setCalMonth} />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </ErrorBoundary>

      {/* --- Modals --- */}

      {/* --- Create Event Modal (Portal to escape stacking context) --- */}
      {showForm && createPortal(
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-start justify-center pt-6 sm:pt-10 pb-4 sm:pb-6 px-3 sm:px-6 bg-black/85 backdrop-blur-xl overflow-y-auto" onClick={() => setShowForm(false)}>
            <motion.div
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="bg-[#000000] border-2 border-[#f59e0b]/20 rounded-[24px] sm:rounded-[32px] w-full max-w-2xl max-h-[calc(100vh-2.5rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9),0_0_60px_rgba(245,158,11,0.08)] my-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Header with gradient accent */}
              <div className="relative p-4 sm:p-6 md:p-8 pb-4 sm:pb-5 bg-gradient-to-b from-amber-400/5 to-transparent border-b border-white/5 shrink-0">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
                    <CalendarDays size={22} className="text-amber-400" />
                  </div>
                  <div>
                    <h2 className="font-unbounded text-base sm:text-lg font-bold text-white uppercase tracking-tight">Neues Event planen</h2>
                    <p className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5">Erstelle ein eigenes Event für dein Team.</p>
                  </div>
                </div>
              </div>

              {/* Form Body */}
              <form id="create-event-form" onSubmit={handleCreate} className="p-4 sm:p-6 md:p-8 pt-4 sm:pt-6 space-y-4 sm:space-y-5 flex-1 min-h-0 overflow-y-auto no-scrollbar">
                {/* Title & Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={11} className="text-amber-400/60" /> Event-Titel</label>
                    <input type="text" placeholder="z.B. Freitags-Convoy" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 focus:bg-white/[0.05] outline-none transition-all duration-300" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><List size={11} className="text-amber-400/60" /> Event-Typ</label>
                    <select value={form.event_type} onChange={e => setForm({ ...form, event_type: e.target.value })} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white focus:border-amber-400/40 outline-none transition-all duration-300 appearance-none cursor-pointer">
                      <option className="bg-zinc-900">Convoy</option>
                      <option className="bg-zinc-900">Interne Schulung</option>
                      <option className="bg-zinc-900">Sonstiges</option>
                    </select>
                  </div>
                </div>

                {/* Date Picker Trigger */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Clock size={11} className="text-amber-400/60" /> Datum & Uhrzeit</label>
                  <div className="relative group">
                    <input type="text" readOnly value={formatLongDateTime(form.start_date)} onClick={() => setShowPickerModal(true)} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white placeholder:text-slate-600 cursor-pointer focus:border-amber-400/40 outline-none transition-all duration-300 group-hover:border-amber-400/20" placeholder="Datum & Uhrzeit wählen..." required />
                    <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 group-hover:text-amber-400 transition-colors" />
                  </div>
                </div>

                {/* Route: Start → End */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><MapPin size={11} className="text-emerald-400/60" /> Startort</label>
                    <input type="text" placeholder="z.B. Berlin" value={form.start_city} onChange={e => setForm({ ...form, start_city: e.target.value })} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 outline-none transition-all duration-300" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><MapPin size={11} className="text-red-400/60" /> Zielort</label>
                    <input type="text" placeholder="z.B. München" value={form.end_city} onChange={e => setForm({ ...form, end_city: e.target.value })} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 outline-none transition-all duration-300" />
                  </div>
                </div>

                {/* Server & Game */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Users size={11} className="text-amber-400/60" /> Server</label>
                    <input type="text" placeholder="z.B. Simulation 1" value={form.server} onChange={e => setForm({ ...form, server: e.target.value })} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 outline-none transition-all duration-300" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">🎮 Spiel</label>
                    <select value={form.game} onChange={e => setForm({ ...form, game: e.target.value })} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white focus:border-amber-400/40 outline-none transition-all duration-300 appearance-none cursor-pointer">
                      <option className="bg-zinc-900">ETS2</option>
                      <option className="bg-zinc-900">ATS</option>
                    </select>
                  </div>
                </div>

                {/* Information */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zusätzliche Informationen</label>
                  <textarea placeholder="Beschreibe das Event, Regeln, Treffpunkt, etc..." value={form.information} onChange={e => setForm({ ...form, information: e.target.value })} className="w-full min-h-[80px] sm:min-h-[100px] bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 outline-none transition-all duration-300 resize-y" />
                </div>

                {/* File Uploads */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <label className="group flex items-center gap-3 p-3 sm:p-4 bg-white/[0.02] border border-dashed border-white/10 rounded-xl cursor-pointer hover:border-amber-400/30 hover:bg-amber-400/[0.02] transition-all duration-300">
                    <div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <ImageIcon size={18} className="text-amber-400/70" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs font-bold block truncate ${coverFile ? 'text-white' : 'text-slate-500'}`}>{coverFile ? coverFile.name : 'Cover-Bild hochladen'}</span>
                      <span className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">Optional • PNG, JPG</span>
                    </div>
                    {coverFile && <XIcon size={14} className="text-slate-500 hover:text-red-400 shrink-0" onClick={(e) => { e.preventDefault(); setCoverFile(null); }} />}
                    <input type="file" onChange={e => handleFileSelect(e, 'cover')} className="hidden" accept="image/*" />
                  </label>
                  <label className="group flex items-center gap-3 p-3 sm:p-4 bg-white/[0.02] border border-dashed border-white/10 rounded-xl cursor-pointer hover:border-amber-400/30 hover:bg-amber-400/[0.02] transition-all duration-300">
                    <div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Upload size={18} className="text-amber-400/70" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs font-bold block truncate ${routeFile ? 'text-white' : 'text-slate-500'}`}>{routeFile ? routeFile.name : 'Route hochladen'}</span>
                      <span className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">Optional • Bild-Datei</span>
                    </div>
                    {routeFile && <XIcon size={14} className="text-slate-500 hover:text-red-400 shrink-0" onClick={(e) => { e.preventDefault(); setRouteFile(null); }} />}
                    <input type="file" onChange={e => handleFileSelect(e, 'route')} className="hidden" accept=".png,.jpg,.jpeg" />
                  </label>
                </div>

                {/* Cover Image Preview */}
                {coverFile && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="rounded-2xl overflow-hidden border border-white/10">
                    <img src={URL.createObjectURL(coverFile)} alt="Cover Preview" className="w-full h-40 object-cover opacity-80" />
                  </motion.div>
                )}
              </form>

              {/* Footer */}
              <div className="p-4 sm:p-6 md:p-8 pt-3 sm:pt-4 border-t border-white/5 bg-black/40 flex items-center justify-between shrink-0">
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all rounded-xl hover:bg-white/5">Abbrechen</button>
                <button type="submit" form="create-event-form" disabled={submitting} className="px-7 py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-black rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                  {submitting ? <><Loader2 className="animate-spin" size={16} /> Erstelle...</> : <><Plus size={16} /> Event erstellen</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}

      {/* --- Date & Time Picker Modal (Portal) --- */}
      {showPickerModal && createPortal(
      <AnimatePresence>
        {showPickerModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/85 backdrop-blur-xl" onClick={() => setShowPickerModal(false)}>
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="bg-[#000000] border-2 border-[#f59e0b]/20 rounded-[32px] w-full max-w-sm overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9),0_0_60px_rgba(245,158,11,0.08)]"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative p-6 pb-4 bg-gradient-to-b from-amber-400/5 to-transparent border-b border-white/5">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
                    <Clock size={20} className="text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-unbounded text-sm font-bold text-white uppercase tracking-widest">Datum & Uhrzeit</h3>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">Wähle den Zeitpunkt für dein Event.</p>
                  </div>
                </div>
              </div>

              {/* Date & Time Inputs */}
              <div className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><CalendarDays size={11} className="text-amber-400/60" /> Datum</label>
                  <input type="date" value={pickerDate.toISOString().split('T')[0]} onChange={e => setPickerDate(new Date(e.target.value))} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-400/40 outline-none transition-all duration-300 [color-scheme:dark]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Clock size={11} className="text-amber-400/60" /> Uhrzeit (24h)</label>
                  <input type="time" value={pickerTime} onChange={e => setPickerTime(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-400/40 outline-none transition-all duration-300 [color-scheme:dark]" />
                </div>

                {/* Preview of selected date/time */}
                {pickerDate && (
                  <div className="bg-amber-400/5 border border-amber-400/15 rounded-xl p-3 text-center">
                    <p className="text-[9px] text-amber-400/70 uppercase tracking-widest font-black mb-1">Ausgewählt</p>
                    <p className="text-sm font-bold text-white">{pickerDate.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    <p className="text-xs text-amber-400 font-bold mt-0.5">{pickerTime} Uhr MEZ</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-white/5 bg-black/40 flex items-center justify-between">
                <button type="button" onClick={() => setShowPickerModal(false)} className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all rounded-xl hover:bg-white/5">Abbrechen</button>
                <button type="button" onClick={handlePickerConfirm} className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all duration-300">Bestätigen</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}
    </div>
  );
}