import { useEffect, useState, useMemo, useCallback, Component } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, MapPin, Plus, Trash2, Loader2, ChevronDown, Clock, Users, List, CalendarDays, ChevronLeft, ChevronRight, Upload, X as XIcon, Image as ImageIcon, LayoutGrid, Calendar as CalendarIcon, Link2, Shield, MessageCircle, Pencil, UserPlus, UserCheck } from "lucide-react";
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

const NewEventCard = ({ event, onClick, canManageEvents, onEdit, onDelete, token, user, onToggleRsvp, rsvpLoading, isJoined }: any) => {
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
        {canManageEvents && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {event.is_custom && (
              <button
                onClick={() => onToggleRsvp?.(event)}
                disabled={rsvpLoading}
                title={isJoined ? "Abmelden" : "Für Event anmelden"}
                className={`p-2 bg-zinc-950/80 backdrop-blur-md rounded-xl border border-zinc-800 transition-colors ${rsvpLoading ? "text-amber-400 animate-pulse" : isJoined ? "text-emerald-400 hover:text-red-400" : "text-zinc-300 hover:text-amber-400"}`}
              >
                {rsvpLoading ? <Loader2 size={14} className="animate-spin" /> : isJoined ? <UserCheck size={14} /> : <UserPlus size={14} />}
              </button>
            )}
            <button onClick={() => onEdit?.(event)} title="Bearbeiten" className="p-2 bg-zinc-950/80 backdrop-blur-md rounded-xl text-zinc-300 hover:text-amber-400 border border-zinc-800 transition-colors">
              <Pencil size={14} />
            </button>
            <button onClick={() => onDelete?.(event)} title="Löschen" className="p-2 bg-zinc-950/80 backdrop-blur-md rounded-xl text-zinc-300 hover:text-red-400 border border-zinc-800 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        )}
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
  const { token, isAdmin, hasRole } = useAuth();
  const EVENT_ROLES = ["event team", "event-team", "hr team", "hr-team", "personal team", "personal-team"];
  const canManageEvents = isAdmin || hasRole(EVENT_ROLES);

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState("list");
  const [calMonth, setCalMonth] = useState(new Date());

  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const initialFormState = { title: "", event_type: "Convoy", organizer: "Open Pipe Club", start_date: "", start_city: "", start_company: "", end_city: "", end_company: "", server: "", game: "ETS2", information: "", rules: "", voice_link: "", external_url: "" };
  const [form, setForm] = useState(initialFormState);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [rsvpState, setRsvpState] = useState<Record<number, boolean>>({});
  const [rsvpLoadingId, setRsvpLoadingId] = useState<number | null>(null);
  const [routeFile, setRouteFile] = useState<File | null>(null);

  const [showPickerModal, setShowPickerModal] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [pickerTime, setPickerTime] = useState("18:00");
  const [pickerMonth, setPickerMonth] = useState(new Date());
  const [showHourPopover, setShowHourPopover] = useState(false);
  const [showMinPopover, setShowMinPopover] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const h = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/events`, { headers: h }).catch(e => { console.error("Events Error:", e); return { data: [] }; });
      const all = Array.isArray(res.data) ? res.data : [];
      setEvents(all.sort((a, b) => new Date(a.start_date || 0).getTime() - new Date(b.start_date || 0).getTime()));
    } catch (e: any) {
      setError("Daten konnten nicht geladen werden.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadRsvpStates = useCallback(async () => {
    if (!token) return;
    try {
      const h = { Authorization: `Bearer ${token}` };
      const { data } = await axios.get(`${API_URL}/events/rsvps`, { headers: h });
      const list = Array.isArray(data) ? data : (data?.rsvps || []);
      const map: Record<number, boolean> = {};
      list.forEach((r: any) => { if (r?.event_id != null) map[r.event_id] = true; });
      setRsvpState(map);
    } catch (e) {
      console.error("RSVP load error:", e);
    }
  }, [token]);

  useEffect(() => { loadAll(); loadRsvpStates(); }, [loadAll, loadRsvpStates]);

  const handleToggleRsvp = async (event: any) => {
    if (!event?.id || !token) return;
    const id = event.id;
    setRsvpLoadingId(id);
    try {
      if (rsvpState[id]) {
        await axios.delete(`${API_URL}/events/${id}/rsvp`, { headers: { Authorization: `Bearer ${token}` } });
        toast.success("Du wurdest abgemeldet");
        setRsvpState(prev => ({ ...prev, [id]: false }));
      } else {
        await axios.post(`${API_URL}/events/${id}/rsvp`, {}, { headers: { Authorization: `Bearer ${token}` } });
        toast.success("Du bist jetzt angemeldet!");
        setRsvpState(prev => ({ ...prev, [id]: true }));
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Fehler bei der Anmeldung");
    } finally {
      setRsvpLoadingId(null);
    }
  };

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
      setForm(initialFormState);
      setCoverFile(null); setRouteFile(null);
      loadAll();
    } catch { toast.error("Fehler beim Erstellen des Events"); }
    finally { setSubmitting(false); }
  };

  const openEdit = (event: any) => {
    const rawDate = event.start_date ? new Date(event.start_date) : null;
    setForm({
      title: event.title || "",
      event_type: event.event_type || "Convoy",
      organizer: event.organizer || event.organisator || (event.is_custom ? "Open Pipe Club" : (event.company_name || "Open Pipe Club")),
      start_date: rawDate ? rawDate.toISOString() : "",
      start_city: event.start_city || "",
      start_company: event.start_company || "",
      end_city: event.end_city || "",
      end_company: event.end_company || "",
      server: event.server || "",
      game: (event.game && typeof event.game === 'object' ? (event.game.code || event.game.name) : event.game) || "ETS2",
      information: event.information || "",
      rules: event.rules || "",
      voice_link: event.voice_link || "",
      external_url: event.external_url || "",
    });
    setEditingEvent(event);
    setShowForm(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || !form.title || !form.start_date) return toast.error("Titel und Datum sind Pflicht");
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (coverFile) fd.append("cover", coverFile);
      if (routeFile) fd.append("route", routeFile);
      await axios.put(`${API_URL}/events/${editingEvent.id}`, fd, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } });
      toast.success("Event aktualisiert!");
      setShowForm(false);
      setEditingEvent(null);
      setForm(initialFormState);
      setCoverFile(null); setRouteFile(null);
      loadAll();
    } catch { toast.error("Fehler beim Aktualisieren des Events"); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (event: any) => {
    if (!window.confirm(`Soll das Event "${event.title || event.start_city}" wirklich gelöscht werden?`)) return;
    try {
      await axios.delete(`${API_URL}/events/${event.id}`, { headers: { Authorization: `Bearer ${token}` } });
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
                        {upcomingEvents.map(event => <NewEventCard key={event.id} event={event} onClick={() => handleEventClick(event)} canManageEvents={canManageEvents} onEdit={openEdit} onDelete={handleDelete} token={token} onToggleRsvp={handleToggleRsvp} rsvpLoading={rsvpLoadingId === event.id} isJoined={!!rsvpState[event.id]} />)}
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
                        {pastEvents.slice(0, 6).map(event => <NewEventCard key={event.id} event={event} onClick={() => handleEventClick(event)} canManageEvents={canManageEvents} onEdit={openEdit} onDelete={handleDelete} token={token} onToggleRsvp={handleToggleRsvp} rsvpLoading={rsvpLoadingId === event.id} isJoined={!!rsvpState[event.id]} />)}
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-6 pt-6 sm:pt-10 pb-4 sm:pb-6 bg-black/80 backdrop-blur-xl overflow-y-auto"
              onClick={() => setShowForm(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 30, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 15, opacity: 0 }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                className="frosted-card w-full max-w-2xl max-h-[calc(100vh-2.5rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                <div className="relative p-5 sm:p-6 md:p-8 pb-5 sm:pb-6 bg-gradient-to-b from-amber-400/5 to-transparent border-b border-white/5 shrink-0">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
                      <CalendarDays size={20} className="text-amber-400" />
                    </div>
                    <div>
                      <h2 className="font-unbounded text-xs sm:text-sm font-bold text-white uppercase tracking-widest">{editingEvent ? "Event bearbeiten" : "Neues Event planen"}</h2>
                      <p className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5">Erstelle ein eigenes Event für dein Team.</p>
                    </div>
                  </div>
                </div>

                <form id="create-event-form" onSubmit={editingEvent ? handleUpdate : handleCreate} className="p-5 sm:p-6 md:p-8 pt-4 sm:pt-6 space-y-4 sm:space-y-5 flex-1 min-h-0 overflow-y-auto no-scrollbar">
                  {/* Title, Type & Organizer */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={11} className="text-amber-400/60" /> Event-Titel</label>
                      <input type="text" placeholder="z.B. Freitags-Convoy" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 focus:bg-white/[0.05] outline-none transition-all duration-300" required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Users size={11} className="text-amber-400/60" /> Organisator</label>
                      <input type="text" placeholder="z.B. Open Pipe Club" value={form.organizer} onChange={e => setForm({ ...form, organizer: e.target.value })} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 focus:bg-white/[0.05] outline-none transition-all duration-300" />
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

                  {/* Route: Start & End (Stadt & Firma) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><MapPin size={11} className="text-emerald-400/60" /> Start-Stadt</label>
                      <input type="text" placeholder="z.B. Berlin" value={form.start_city} onChange={e => setForm({ ...form, start_city: e.target.value })} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 outline-none transition-all duration-300" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><MapPin size={11} className="text-emerald-400/60" /> Start-Firma (Optional)</label>
                      <input type="text" placeholder="z.B. ITCC" value={form.start_company} onChange={e => setForm({ ...form, start_company: e.target.value })} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 outline-none transition-all duration-300" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><MapPin size={11} className="text-red-400/60" /> Ziel-Stadt</label>
                      <input type="text" placeholder="z.B. München" value={form.end_city} onChange={e => setForm({ ...form, end_city: e.target.value })} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 outline-none transition-all duration-300" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><MapPin size={11} className="text-red-400/60" /> Ziel-Firma (Optional)</label>
                      <input type="text" placeholder="z.B. EuroGoodies" value={form.end_company} onChange={e => setForm({ ...form, end_company: e.target.value })} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 outline-none transition-all duration-300" />
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
                      </select>
                    </div>
                  </div>

                  {/* Information */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zusätzliche Informationen</label>
                    <textarea placeholder="Beschreibe das Event, Regeln, Treffpunkt, etc..." value={form.information} onChange={e => setForm({ ...form, information: e.target.value })} className="w-full min-h-[80px] sm:min-h-[100px] bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 outline-none transition-all duration-300 resize-y" />
                  </div>

                  {/* Regeln */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Shield size={11} className="text-amber-400/60" /> Regeln</label>
                    <textarea placeholder="z.B. Abstand halten&#10;Anweisungen der Guides befolgen&#10;Kein Rammen" value={form.rules} onChange={e => setForm({ ...form, rules: e.target.value })} className="w-full min-h-[70px] sm:min-h-[90px] bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 outline-none transition-all duration-300 resize-y" />
                  </div>

                  {/* Links */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><MessageCircle size={11} className="text-indigo-400/60" /> Discord-Link</label>
                      <input type="url" placeholder="https://discord.gg/..." value={form.voice_link} onChange={e => setForm({ ...form, voice_link: e.target.value })} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 outline-none transition-all duration-300" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Link2 size={11} className="text-sky-400/60" /> Externe Eventseite</label>
                      <input type="url" placeholder="https://truckersmp.com/events/..." value={form.external_url} onChange={e => setForm({ ...form, external_url: e.target.value })} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 outline-none transition-all duration-300" />
                    </div>
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

                <div className="p-4 sm:p-6 md:p-8 pt-3 sm:pt-4 border-t border-white/5 flex items-center justify-between shrink-0">
                  <button type="button" onClick={() => { setShowForm(false); setEditingEvent(null); setCoverFile(null); setRouteFile(null); }} className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all rounded-xl hover:bg-white/5">Abbrechen</button>
                  <button type="submit" form="create-event-form" disabled={submitting} className="px-7 py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-black rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                    {submitting ? <><Loader2 className="animate-spin" size={16} /> {editingEvent ? "Speichere..." : "Erstelle..."}</> : <><Plus size={16} /> {editingEvent ? "Änderungen speichern" : "Event erstellen"}</>}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* --- Custom Date & Time Picker Modal (Portal) --- */}
      {showPickerModal && createPortal(
        <AnimatePresence>
          {showPickerModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-xl" onClick={() => setShowPickerModal(false)}>
              <motion.div
                initial={{ scale: 0.92, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 10, opacity: 0 }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                className="bg-[#0b0b0c] border-2 border-[#f59e0b]/25 rounded-[32px] w-full max-w-md overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9),0_0_60px_rgba(245,158,11,0.1)]"
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="relative p-6 pb-4 bg-gradient-to-b from-amber-400/10 to-transparent border-b border-white/5">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center shrink-0">
                        <CalendarDays size={20} className="text-amber-400" />
                      </div>
                      <div>
                        <h3 className="font-unbounded text-sm font-bold text-white uppercase tracking-widest">Datum & Uhrzeit</h3>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">Event-Termin individuell festlegen</p>
                      </div>
                    </div>
                    <button onClick={() => setShowPickerModal(false)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                      <XIcon size={18} />
                    </button>
                  </div>
                </div>

                <div className="p-5 sm:p-6 space-y-6 max-h-[calc(100vh-10rem)] overflow-y-auto no-scrollbar">
                  {/* Custom Date Picker */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-2xl p-2 px-3">
                      <button
                        type="button"
                        onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() - 1, 1))}
                        className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-amber-400 transition-colors"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <span className="text-xs font-bold text-white uppercase tracking-wider font-unbounded select-none">
                        {pickerMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 1))}
                        className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-amber-400 transition-colors"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>

                    {/* Weekday labels */}
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'].map(d => (
                        <span key={d} className="text-[10px] font-black text-amber-400/70 tracking-widest select-none">{d}</span>
                      ))}
                    </div>

                    {/* Day grid */}
                    <div className="grid grid-cols-7 gap-1.5">
                      {(() => {
                        const today = new Date();
                        const startOfMonth = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), 1);
                        const endOfMonth = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 0);
                        const startDay = (startOfMonth.getDay() + 6) % 7;
                        const daysInMonth = endOfMonth.getDate();

                        return (
                          <>
                            {Array.from({ length: startDay }).map((_, i) => (
                              <div key={`pad-${i}`} />
                            ))}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                              const day = i + 1;
                              const dObj = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), day);
                              const isSelected = pickerDate && dObj.toDateString() === pickerDate.toDateString();
                              const isToday = dObj.toDateString() === today.toDateString();

                              return (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => setPickerDate(dObj)}
                                  className={`h-9 w-full rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center ${
                                    isSelected
                                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-105'
                                      : isToday
                                      ? 'border border-amber-400/50 text-amber-400 bg-amber-400/10'
                                      : 'bg-white/[0.03] text-slate-200 hover:bg-amber-400/20 hover:text-white border border-white/5'
                                  }`}
                                >
                                  {day}
                                </button>
                              );
                            })}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Custom Time Selector */}
                  <div className="space-y-3 pt-3 border-t border-white/10">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 select-none">
                      <Clock size={12} className="text-amber-400" /> Startzeit (24h)
                    </label>

                    {/* Quick preset pills */}
                    <div className="grid grid-cols-4 gap-2">
                      {["18:00", "19:00", "20:00", "20:30"].map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setPickerTime(t)}
                          className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                            pickerTime === t
                              ? "bg-amber-400 text-black font-black shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                              : "bg-white/[0.04] text-slate-300 hover:bg-white/10 hover:text-white border border-white/5"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    {/* Custom Hour & Minute Popover Controls */}
                    <div className="grid grid-cols-2 gap-3 relative">
                      {/* Custom Hour Button & Popover */}
                      <div className="space-y-1 relative">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider select-none">Stunde</span>
                        <button
                          type="button"
                          onClick={() => { setShowHourPopover(!showHourPopover); setShowMinPopover(false); }}
                          className="w-full bg-black/60 border border-white/15 hover:border-amber-400/40 rounded-xl px-3 py-2 text-sm text-white font-bold flex items-center justify-between transition-all"
                        >
                          <span>{pickerTime.split(':')[0] || "18"} Uhr</span>
                          <ChevronDown size={14} className={`text-slate-400 transition-transform ${showHourPopover ? "rotate-180 text-amber-400" : ""}`} />
                        </button>
                        <AnimatePresence>
                          {showHourPopover && (
                            <motion.div
                              initial={{ opacity: 0, y: 6, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 6, scale: 0.95 }}
                              className="absolute left-0 right-0 bottom-full mb-1.5 z-[130] bg-[#0c0c0d] border-2 border-amber-400/30 rounded-2xl p-2 max-h-48 overflow-y-auto shadow-[0_20px_40px_rgba(0,0,0,0.9),0_0_25px_rgba(245,158,11,0.15)] no-scrollbar"
                            >
                              <div className="grid grid-cols-3 gap-1">
                                {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map(h => {
                                  const curH = pickerTime.split(':')[0] || "18";
                                  const isSel = curH === h;
                                  return (
                                    <button
                                      key={h}
                                      type="button"
                                      onClick={() => {
                                        const m = pickerTime.split(':')[1] || "00";
                                        setPickerTime(`${h}:${m}`);
                                        setShowHourPopover(false);
                                      }}
                                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        isSel
                                          ? "bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black shadow-md"
                                          : "text-slate-300 hover:bg-amber-400/20 hover:text-white"
                                      }`}
                                    >
                                      {h}:00
                                    </button>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Custom Minute Button & Popover */}
                      <div className="space-y-1 relative">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider select-none">Minute</span>
                        <button
                          type="button"
                          onClick={() => { setShowMinPopover(!showMinPopover); setShowHourPopover(false); }}
                          className="w-full bg-black/60 border border-white/15 hover:border-amber-400/40 rounded-xl px-3 py-2 text-sm text-white font-bold flex items-center justify-between transition-all"
                        >
                          <span>{pickerTime.split(':')[1] || "00"} Min</span>
                          <ChevronDown size={14} className={`text-slate-400 transition-transform ${showMinPopover ? "rotate-180 text-amber-400" : ""}`} />
                        </button>
                        <AnimatePresence>
                          {showMinPopover && (
                            <motion.div
                              initial={{ opacity: 0, y: 6, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 6, scale: 0.95 }}
                              className="absolute left-0 right-0 bottom-full mb-1.5 z-[130] bg-[#0c0c0d] border-2 border-amber-400/30 rounded-2xl p-2 max-h-48 overflow-y-auto shadow-[0_20px_40px_rgba(0,0,0,0.9),0_0_25px_rgba(245,158,11,0.15)] no-scrollbar"
                            >
                              <div className="grid grid-cols-3 gap-1">
                                {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map(m => {
                                  const curM = pickerTime.split(':')[1] || "00";
                                  const isSel = curM === m;
                                  return (
                                    <button
                                      key={m}
                                      type="button"
                                      onClick={() => {
                                        const h = pickerTime.split(':')[0] || "18";
                                        setPickerTime(`${h}:${m}`);
                                        setShowMinPopover(false);
                                      }}
                                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        isSel
                                          ? "bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black shadow-md"
                                          : "text-slate-300 hover:bg-amber-400/20 hover:text-white"
                                      }`}
                                    >
                                      :{m}
                                    </button>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* Selection summary */}
                  {pickerDate && (
                    <div className="bg-amber-400/10 border border-amber-400/20 rounded-2xl p-3 text-center">
                      <p className="text-[9px] text-amber-400 uppercase tracking-widest font-black mb-0.5">Ausgewählter Termin</p>
                      <p className="text-xs font-bold text-white">
                        {pickerDate.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-amber-400 font-extrabold mt-0.5">
                        {pickerTime} Uhr MEZ
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-5 border-t border-white/5 bg-black/60 flex items-center justify-between shrink-0">
                  <button type="button" onClick={() => setShowPickerModal(false)} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-all rounded-xl hover:bg-white/5">
                    Abbrechen
                  </button>
                  <button type="button" onClick={handlePickerConfirm} className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 text-black rounded-xl font-black text-xs uppercase tracking-wider hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all">
                    Termin Übernehmen
                  </button>
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
