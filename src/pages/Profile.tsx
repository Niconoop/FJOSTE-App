import { useEffect, useState, useCallback, useMemo } from 'react';
import { ArrowLeft, ArrowRight, MapPin, Route, Coins, Weight, Award, Globe, Clock, Truck, ChevronDown, ExternalLink, User, Lock, Save, Loader2, Check, Calendar, Package, Gauge, Star, Camera, Trash2, AlertTriangle, X, Timer, Zap, Fuel } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { de } from 'date-fns/locale/de';
import { apiService } from '../services/api';
import { API_URL, API_BASE_URL, getAvatarUrl } from '../config';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, AreaChart, Area
} from "recharts";

const CHART_COLORS = ["#2ba1b9", "#0EA5E9", "#38BDF8", "#7DD3FC", "#06B6D4", "#67E8F9", "#155E75", "#164E63"];

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-black/90 border border-white/5 backdrop-blur-md rounded-xl px-4 py-3 text-[10px] shadow-2xl">
      <p className="text-white font-black uppercase tracking-widest mb-1 italic">{label}</p>
      {payload.map((e: any, i: number) => (
        <p key={i} style={{ color: e.color || "#2ba1b9" }} className="font-bold italic uppercase">
          {e.name}: {typeof e.value === "number" ? e.value.toLocaleString("de-DE") : e.value}
        </p>
      ))}
    </div>
  );
};

const SettingsContent = ({ isSelf, editUsername, setEditUsername, editTmpId, setEditTmpId, saving, handleSave, oldPassword, setOldPassword, newPassword, setNewPassword, confirmPassword, setConfirmPassword, changingPwd, token, setShowDeleteModal, user, handleDeleteAccount, deleting, deleteConfirmText, setDeleteConfirmText, logout }: any) => {
  if (!isSelf) return null;
  return (
    <>
      <h2 className="font-unbounded text-xs font-bold text-white uppercase tracking-widest border-b border-white/5 pb-4 mb-6">Profil bearbeiten</h2>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Anzeigename</label>
          <input value={editUsername} onChange={e => setEditUsername(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary/30 outline-none" />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">TruckersMP ID</label>
          <input value={editTmpId} onChange={e => setEditTmpId(e.target.value)} placeholder="Z.B. 5635834" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary/30 outline-none" />
        </div>
        <button disabled={saving} className="w-full bg-white text-black py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-primary transition-all flex items-center justify-center gap-2">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Profil Speichern</>}
        </button>
      </form>

      <div className="mt-10 pt-10 border-t border-white/5">
        <h2 className="font-unbounded text-xs font-bold text-white uppercase tracking-widest mb-6">Passwort ändern</h2>
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (newPassword !== confirmPassword) return toast.error("Passwörter stimmen nicht überein");
          try {
            await axios.put(`${API_URL}/auth/password`, {
              old_password: oldPassword,
              new_password: newPassword
            }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Passwort erfolgreich geändert");
            setOldPassword(""); setNewPassword(""); setConfirmPassword("");
          } catch { toast.error("Altes Passwort nicht korrekt"); }
        }} className="space-y-4">
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
            <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} placeholder="Aktuelles Passwort" className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:border-primary/30 outline-none" />
          </div>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Neues Passwort" className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:border-primary/30 outline-none" />
          </div>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Passwort bestätigen" className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:border-primary/30 outline-none" />
          </div>
          <button disabled={changingPwd} className="w-full bg-primary/10 border border-primary/20 text-primary py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-primary/20 transition-all flex items-center justify-center gap-2">
            {changingPwd ? <Loader2 size={16} className="animate-spin" /> : "Passwort aktualisieren"}
          </button>
        </form>
      </div>

      <div className="mt-10 pt-10 border-t border-red-500/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
            <AlertTriangle size={16} className="text-red-500" />
          </div>
          <div>
            <h2 className="font-unbounded text-[10px] font-bold text-red-500 uppercase tracking-widest">Gefahrenzone</h2>
            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">Kontoverwaltung & Löschung</p>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 font-medium leading-relaxed mb-6">
          Wenn du dein Konto löschst, werden alle deine Daten, Statistiken und Fahrten unwiderruflich entfernt. Diese Aktion kann nicht rückgängig gemacht werden.
        </p>
        <button 
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="w-full bg-red-500/5 border border-red-500/10 text-red-500 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-500/10 transition-all flex items-center justify-center gap-2 group"
        >
          <Trash2 size={14} className="group-hover:rotate-12 transition-transform" />
          Konto unwiderruflich löschen
        </button>
      </div>
    </>
  );
};

const DetailRow = ({ label, value, icon: Icon }: any) => {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 italic">
        {Icon && <Icon className="w-3.5 h-3.5 text-primary" />}
        {label}
      </span>
      <span className="text-xs font-bold text-white italic">{value}</span>
    </div>
  );
};

const JobCard = ({ job, onSelect }: any) => {
  return (
    <div className="glass-card !p-0 overflow-hidden hover:border-[#2ba1b9]/20 hover-glow transition-all group/job">
      <button onClick={() => onSelect(job)} className="w-full text-left p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
            <Truck className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0 sm:hidden">
             <p className="text-sm font-bold text-white truncate italic uppercase tracking-tight">{job.source_city_name} → {job.destination_city_name}</p>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="hidden sm:block text-sm font-bold text-white truncate italic uppercase tracking-tight">{job.source_city_name} → {job.destination_city_name}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 italic">
            <span className="flex items-center gap-1 shrink-0"><Package size={12} /> {job.cargo_name || 'Fracht'}</span>
            <span className="shrink-0">{job.cargo_mass_t ? `${Math.round(job.cargo_mass_t)} T` : '--'}</span>
            <span className="shrink-0">{Math.round(job.driven_distance_km)} KM</span>
            <span className="text-emerald-400 shrink-0">{Math.round(job.revenue).toLocaleString()} $</span>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-white/5">
          <div className="flex items-center gap-3">
            <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter italic ${(job.status === 'delivered' || job.status === 'completed') && job.revenue >= 0 ? 'bg-emerald-500/20 text-emerald-500' : (job.status === 'cancelled' || job.revenue < 0) ? 'bg-red-500/20 text-red-500' : 'bg-primary/20 text-primary'}`}>
               {(job.status === 'delivered' || job.status === 'completed') && job.revenue >= 0 ? 'Geliefert' : (job.status === 'cancelled' || job.revenue < 0) ? 'Abgebrochen' : 'Fahrt'}
            </div>
            <span className="text-[10px] font-bold text-slate-600 uppercase italic">
               {new Date(job.completed_at || job.ended_at || job.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-700 group-hover:text-primary transition-all group-hover:translate-x-1" />
        </div>
      </button>
    </div>
  );
};

const Profile = ({ memberId, onBack, telemetry, onViewOnMap }: { memberId: string | number | 'me', onBack: () => void, telemetry?: any, onViewOnMap?: (id: string | number) => void }) => {
  const { token, user, logout } = useAuth();
  const isSelf = memberId === 'me' || memberId == user?.user_id || memberId == user?.id || memberId == user?.trucky_driver_id;
  const isTelemetryActive = isSelf && telemetry && !telemetry.error && telemetry.gameVersion > 0;

  const [driver, setDriver] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [liveData, setLiveData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [editUsername, setEditUsername] = useState("");
  const [editTmpId, setEditTmpId] = useState("");
  const [localStats, setLocalStats] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);

  const targetId = useMemo(() => {
    return memberId === 'me' ? (user?.user_id || user?.id) : memberId;
  }, [memberId, user]);
  
  const mergedStats = useMemo(() => {
    // Custom Points & Level Calculation based on stats
    const dist = Number(driver?.total_driven_distance_km || 0);
    const rev = Number(driver?.total_revenue || 0);
    const cargo = Number(driver?.total_cargo_mass_t || 0);
    const completedCount = jobs.filter(j => j.status === 'delivered' || j.status === 'completed').length;
    
    const pts = Math.floor(dist + (cargo * 15) + (completedCount * 50));
    const lvl = Math.floor(pts / 2500) + 1;
    
    return {
      distance: dist,
      revenue: rev,
      cargo: cargo,
      points: pts,
      level: lvl
    };
  }, [driver, jobs]);

  const lastJob = useMemo(() => jobs.length > 0 ? jobs[0] : null, [jobs]);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };
    try {
      // 1. Load member data from single member endpoint (already merged in backend)
      const memberRes = await axios.get(`${API_URL}/trucky/member/${encodeURIComponent(targetId)}`, { headers });
      const me = memberRes.data;

      if (me) {
        setDriver(me);
        // 2. Load jobs (already merged in backend)
        try {
          const jobsRes = await axios.get(`${API_URL}/trucky/member/${encodeURIComponent(targetId)}/jobs`, { headers });
          
          let tJobs: any[] = Array.isArray(jobsRes.data) ? jobsRes.data : (jobsRes.data?.data || []);
          let dJobs: any[] = []; 
          
          // Map desktop jobs to a similar format as Trucky jobs for consistency
          const normalizedDesktop = dJobs.map((j: any) => ({
             ...j,
             source_city_name: j.source_city || "Unbekannt",
             destination_city_name: j.destination_city || "Unbekannt",
             cargo_name: j.cargo || "Fracht",
             driven_distance_km: Number(j.actual_distance_km || j.planned_distance_km || 0),
             revenue: Number(j.actual_income || j.planned_income || 0),
             cargo_mass_t: Number(j.cargo_mass_kg || 0) / 1000,
             vehicle_brand_name: j.truck || "LKW",
             average_speed_kmh: Number(j.average_speed_kmh || 0),
             fuel_used_l: Number(j.fuel_used_l || 0),
             status: j.status // "delivered", "cancelled", "running"
          }));

          // Normalize Trucky jobs to match Desktop format
          const normalizedTrucky = tJobs.map((j: any) => {
            // Map Trucky status values to our standard format
            let mappedStatus = 'running';
            if (j.status) {
              const status = j.status.toLowerCase();
              if (status.includes('deliver') || status.includes('complet') || status.includes('finish')) {
                mappedStatus = 'delivered';
              } else if (status.includes('cancel') || status.includes('skip') || status.includes('interrup')) {
                mappedStatus = 'cancelled';
              }
            }
            
            return {
              ...j,
              source_city_name: j.source_city_name || "Unbekannt",
              destination_city_name: j.destination_city_name || "Unbekannt",
              cargo_name: j.cargo_name || "Fracht",
              driven_distance_km: Number(j.driven_distance_km || 0),
              revenue: Number(j.revenue || 0),
              cargo_mass_t: Number(j.cargo_mass_t || 0),
              vehicle_brand_name: j.vehicle_brand_name || "LKW",
              average_speed_kmh: Number(j.average_speed_kmh || 0),
              fuel_used_l: Number(j.fuel_used_l || 0),
              status: mappedStatus
            };
          });

          // Filter Trucky jobs to remove those that are already in Desktop jobs
          const desktopJobKeys = new Set<string>();
          normalizedDesktop.forEach((job: any) => {
            const distance = Math.round(job.driven_distance_km * 10) / 10;
            const revenue = Math.round(job.revenue);
            const key = `${job.source_city_name}|${job.destination_city_name}|${distance}|${revenue}`;
            desktopJobKeys.add(key);
          });

          const filteredTruckyJobs = normalizedTrucky.filter((job: any) => {
            const distance = Math.round(job.driven_distance_km * 10) / 10;
            const revenue = Math.round(job.revenue);
            const key = `${job.source_city_name}|${job.destination_city_name}|${distance}|${revenue}`;
            return !desktopJobKeys.has(key);
          });

          const combined = [...filteredTruckyJobs, ...normalizedDesktop];
          combined.sort((a, b) => {
            const getTS = (j: any) => {
                const val = j.stop_timestamp || j.delivered_at || j.ended_at || j.created_at;
                if (!val) return 0;
                if (typeof val === 'number') return val < 10000000000 ? val * 1000 : val;
                return new Date(val).getTime() || 0;
            };
            return getTS(b) - getTS(a);
          });

          setJobs(combined);
        } catch (e) {
          console.error("Jobs load error", e);
        }
      } else if (isSelf) {
        setDriver({ name: user?.username, id: 0 });
        // Try loading only desktop jobs
        try {
          const res = await axios.get(`${API_URL}/desktop/jobs`, { headers });
          const dJobs = res.data || [];
          const normalizedDesktop = dJobs.map((j: any) => ({
             ...j,
             source_city_name: j.source_city || "Unbekannt",
             destination_city_name: j.destination_city || "Unbekannt",
             cargo_name: j.cargo || "Fracht",
             driven_distance_km: Number(j.actual_distance_km || j.planned_distance_km || 0),
             revenue: Number(j.actual_income || j.planned_income || 0),
             cargo_mass_t: Number(j.cargo_mass_kg || 0) / 1000,
             vehicle_brand_name: j.truck || "LKW",
             average_speed_kmh: Number(j.average_speed_kmh || 0),
             fuel_used_l: Number(j.fuel_used_l || 0),
             status: j.status
          }));
          setJobs(normalizedDesktop);
        } catch {}
      }

      if (isSelf) {
        setEditUsername(user?.username || "");
        setEditTmpId(user?.truckersmp_id ? String(user.truckersmp_id) : "");
      }

      // 3. Load live position
      const mapRes = await axios.get(`${API_URL}/trucky/live-map`, { headers });
      if (Array.isArray(mapRes.data)) {
        const live = mapRes.data.find((m: any) => m.id == targetId || (m.trucky_id && m.trucky_id == targetId));
        setLiveData(live);
      }
      // 4. Load local stats
      try {
        const statsRes = await axios.get(`${API_URL}/stats/member/${targetId === 'me' ? user?.user_id : targetId}`, { headers });
        setLocalStats(statsRes.data);
      } catch {}

    } catch { }
    finally { setLoading(false); }
  }, [targetId, token, isSelf, user]);

  const distanceChart = useMemo(() => {
    return jobs.filter(j => j.status === 'delivered' || j.status === 'completed').slice(0, 10).reverse().map(j => ({
      name: `${(j.source_city_name || "?").slice(0, 6)}→${(j.destination_city_name || "?").slice(0, 6)}`,
      Distanz: Math.round(j.driven_distance_km || 0),
    }));
  }, [jobs]);

  const cargoChart = useMemo(() => {
    const map: any = {};
    jobs.filter(j => j.status === 'delivered' || j.status === 'completed').forEach(j => {
      const c = j.cargo_name || "Unbekannt";
      map[c] = (map[c] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, value: count }));
  }, [jobs]);

  const revenueChart = useMemo(() => {
    return jobs.filter(j => j.status === 'delivered' || j.status === 'completed').slice(0, 10).reverse().map(j => ({
      name: `${(j.source_city_name || "?").slice(0, 6)}→${(j.destination_city_name || "?").slice(0, 6)}`,
      Einnahmen: j.revenue || 0,
    }));
  }, [jobs]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    try {
      const { ipcRenderer } = window.require('electron');
      if (ipcRenderer) {
        if (driver?.name) {
          ipcRenderer.send('rpc-page-changed', 'profile', { username: driver.name, isSelf });
        } else {
          ipcRenderer.send('rpc-page-changed', 'profile', { isSelf });
        }
      }
    } catch (e) {}
  }, [driver?.name, isSelf]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put(`${API_URL}/auth/profile`, {
        username: editUsername,
        truckersmp_id: parseInt(editTmpId) || 0,
      });
      toast.success("Profil erfolgreich aktualisiert");
      setTimeout(() => window.location.reload(), 1000);
    } catch { toast.error("Fehler beim Speichern"); }
    finally { setSaving(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== user?.username) return toast.error("Bitte bestätige deinen Benutzernamen");
    setDeleting(true);
    try {
      await apiService.deleteProfile();
      toast.success("Konto erfolgreich gelöscht");
      logout();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.message || "Fehler beim Löschen des Kontos";
      toast.error(msg);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    setSaving(true);
    try {
      await axios.post(`${API_URL}/auth/avatar`, formData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success("Profilbild erfolgreich aktualisiert");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) { 
      const msg = err.response?.data?.detail || "Fehler beim Hochladen des Bildes";
      toast.error(msg); 
    } finally { 
      setSaving(false); 
    }
  };

  const getAvatarUrlLocal = (url?: string) => getAvatarUrl(url);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 size={40} className="text-primary animate-spin mb-4" />
      <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Profil wird geladen...</p>
    </div>
  );

  return (
    <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button onClick={onBack} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all group">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Zurück
      </button>

      <div className="glass-card !p-8 hover-glow">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="relative group/avatar">
            <div className={`w-32 h-32 rounded-full bg-black border-4 overflow-hidden shadow-2xl relative z-10 transition-all duration-500 ${liveData?.online ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-[profile-pulse_2s_infinite]' : 'border-white/5'}`}>
              {getAvatarUrlLocal(isSelf ? (user?.avatar_url || driver?.avatar_url) : driver?.avatar_url) ? (
                <img src={getAvatarUrlLocal(isSelf ? (user?.avatar_url || driver?.avatar_url) : driver?.avatar_url)!} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/20 flex items-center justify-center text-4xl font-black text-primary">{(driver?.name || user?.username)?.charAt(0)}</div>
              )}
            </div>
            {isSelf && (
              <label className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-all cursor-pointer rounded-full">
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                <div className="flex flex-col items-center gap-1">
                  <Camera size={24} className="text-white" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-white">Ändern</span>
                </div>
              </label>
            )}
          </div>

          <div className="text-center md:text-left flex-1">
            <div className="flex flex-col md:flex-row md:items-center gap-3 justify-center md:justify-start">
              <h1 className="font-unbounded text-3xl font-black text-white tracking-tight uppercase italic">{driver?.name || user?.username}</h1>
              <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest w-fit mx-auto md:mx-0">{driver?.role?.name || 'Fahrer'}</span>
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 mt-4">
              <div className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                <Award size={14} className="text-amber-500" />
                Level {mergedStats.level}
              </div>
              <div className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                <MapPin size={14} className="text-primary" />
                {driver?.country || 'Europa'}
              </div>
              <div className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                <Truck size={14} className="text-slate-600" />
                Letzter Job: { lastJob ? (() => {
                    const val = lastJob.stop_timestamp || lastJob.delivered_at || lastJob.ended_at || lastJob.created_at;
                    const date = typeof val === 'number' 
                      ? new Date(val < 10000000000 ? val * 1000 : val) 
                      : new Date(val);
                    return formatDistanceToNow(date, { addSuffix: true, locale: de });
                  })() : 'Nie' }
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="w-full lg:w-1/3 space-y-8 order-1">
          {/* Live Session Card (Visible for everyone if online) */}
          {(isTelemetryActive || liveData?.online) && (
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="glass-card bg-gradient-to-br from-black to-blue-600/5 border-[#22D1EE]/20 space-y-4 hover-glow"
             >
                <div className="flex items-center justify-between">
                   <h2 className="font-unbounded text-xs font-bold text-white uppercase tracking-widest">Live Session</h2>
                   <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Aktiv</span>
                      </div>
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">
                        {isTelemetryActive ? "Lokal" : (liveData?.server_name || "Simulation")}
                      </span>
                   </div>
                </div>
                
                <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3 mb-3">
                       <Truck size={16} className="text-[#22D1EE]" />
                       <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            {((isTelemetryActive ? telemetry?.brand : liveData?.brand) || "LKW") + " " + ((isTelemetryActive ? telemetry?.model : liveData?.model) || "")}
                          </p>
                          {(isTelemetryActive ? telemetry?.cargo : liveData?.job?.cargo) && (
                            <p className="text-[9px] text-[#22D1EE] font-bold uppercase tracking-widest mt-0.5 truncate">
                              📦 {isTelemetryActive ? telemetry.cargo : liveData.job.cargo}
                              {((isTelemetryActive ? telemetry.cargoMass : liveData.job.cargo_mass) || 0) > 0 && 
                                ` (${(isTelemetryActive ? telemetry.cargoMass : liveData.job.cargo_mass).toFixed(1)} T)`}
                            </p>
                          )}
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                         <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Tempo</p>
                         <p className="text-sm font-black text-white italic">
                            {Math.round(isTelemetryActive ? (telemetry?.speed || 0) : (liveData?.speed || 0))} 
                            <span className="text-[9px] not-italic text-slate-500 ml-1">KM/H</span>
                         </p>
                      </div>
                      <div>
                         <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Sprit</p>
                         <p className="text-sm font-black text-white italic">
                            {Math.round(isTelemetryActive ? (telemetry?.fuel || 0) : (liveData?.fuel || 0))} 
                            <span className="text-[9px] not-italic text-slate-500 ml-1">L</span>
                         </p>
                      </div>
                   </div>
                </div>

                {(isTelemetryActive ? (telemetry.source && telemetry.dest) : (liveData?.job?.source && liveData?.job?.destination)) && (
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Aktuelle Route</p>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-bold text-white truncate max-w-[80px]">
                          {isTelemetryActive ? telemetry.source : liveData.job.source}
                       </span>
                       <ArrowRight size={10} className="text-slate-600" />
                       <span className="text-[10px] font-bold text-white truncate max-w-[80px]">
                          {isTelemetryActive ? telemetry.dest : liveData.job.destination}
                       </span>
                    </div>
                  </div>
                )}
             </motion.div>
          )}

          {/* Location Card */}
          <div 
            className="glass-card space-y-6 cursor-pointer hover:border-primary/30 hover-glow transition-colors group"
            onClick={() => onViewOnMap?.(targetId)}
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h2 className="font-unbounded text-xs font-bold text-white uppercase tracking-widest">Standort</h2>
              <ExternalLink size={14} className="text-slate-600 group-hover:text-primary transition-colors" />
            </div>
            {liveData?.online ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Online</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-white leading-tight">{liveData.live_location?.city || "Unbekannte Stadt"}{liveData.live_location?.country ? `, ${liveData.live_location.country}` : ""}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{liveData.live_location?.server_name || "Server unbekannt"}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Offline</span>
                </div>
                {liveData?.last_position ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-slate-300 leading-tight">{liveData.last_position.city || "Letzte Position"}{liveData.last_position.country ? `, ${liveData.last_position.country}` : ""}</p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                          Zuletzt gesehen: {new Date(liveData.last_position.updated_at).toLocaleString("de-DE", { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Keine Standortdaten verfügbar</p>
                )}
              </div>
            )}
          </div>

          <div className="glass-card space-y-6 hover-glow">
            <h2 className="font-unbounded text-xs font-bold text-white uppercase tracking-widest border-b border-white/5 pb-4">Statistiken</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-black/60 border border-white/5 rounded-2xl">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Distanz</p>
                <p className="text-lg font-black text-white italic">{Math.round(mergedStats.distance).toLocaleString()} <span className="text-[10px] text-slate-500 not-italic">KM</span></p>
              </div>
              <div className="p-4 bg-black/60 border border-white/5 rounded-2xl">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Umsatz</p>
                <p className="text-lg font-black text-emerald-400 italic">{Math.round(mergedStats.revenue).toLocaleString()} <span className="text-[10px] text-slate-500 not-italic">$</span></p>
              </div>
              <div className="p-4 bg-black/60 border border-white/5 rounded-2xl">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Fracht</p>
                <p className="text-lg font-black text-amber-500 italic">{Math.round(mergedStats.cargo).toLocaleString()} <span className="text-[10px] text-slate-500 not-italic">T</span></p>
              </div>
              <div className="p-4 bg-black/60 border border-white/5 rounded-2xl">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Punkte</p>
                <p className="text-lg font-black text-primary italic">{mergedStats.points} <span className="text-[10px] text-slate-500 not-italic">PT</span></p>
              </div>
            </div>
          </div>

          {/* Settings Section (Desktop) */}
          {isSelf && (
            <div className="hidden lg:block glass-card hover-glow">
              <SettingsContent 
                isSelf={isSelf}
                editUsername={editUsername}
                setEditUsername={setEditUsername}
                editTmpId={editTmpId}
                setEditTmpId={setEditTmpId}
                saving={saving}
                handleSave={handleSave}
                oldPassword={oldPassword}
                setOldPassword={setOldPassword}
                newPassword={newPassword}
                setNewPassword={setNewPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                changingPwd={changingPwd}
                token={token}
                setShowDeleteModal={setShowDeleteModal}
                user={user}
                handleDeleteAccount={handleDeleteAccount}
                deleting={deleting}
                deleteConfirmText={deleteConfirmText}
                setDeleteConfirmText={setDeleteConfirmText}
                logout={logout}
              />
            </div>
          )}
        </div>

        <div className="w-full lg:w-2/3 space-y-6 order-2">
          {/* Charts Row */}
          {jobs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card shadow-xl hover-glow">
                <h3 className="font-unbounded text-[10px] font-black text-white uppercase tracking-widest border-b border-white/5 pb-4 mb-4">Distanz pro Job</h3>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distanceChart} barSize={16}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 8, fontWeight: 900 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={40} />
                      <YAxis tick={{ fill: "#475569", fontSize: 8, fontWeight: 900 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                      <Bar dataKey="Distanz" fill="#2ba1b9" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card shadow-xl hover-glow">
                <h3 className="font-unbounded text-[10px] font-black text-white uppercase tracking-widest border-b border-white/5 pb-4 mb-4">Frachtarten</h3>
                <div className="h-44 flex items-center">
                  <div className="flex-1 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={cargoChart} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={4} dataKey="value" strokeWidth={0}>
                          {cargoChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-1.5 pr-2">
                    {cargoChart.slice(0, 4).map((c: any, i: number) => (
                      <div key={c.name} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter truncate w-20 italic">{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card md:col-span-2 shadow-xl hover-glow">
                <h3 className="font-unbounded text-[10px] font-black text-white uppercase tracking-widest border-b border-white/5 pb-4 mb-4">Umsatzentwicklung</h3>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueChart}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2ba1b9" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#2ba1b9" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 8, fontWeight: 900 }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" height={30} />
                      <YAxis tick={{ fill: "#475569", fontSize: 8, fontWeight: 900 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="Einnahmen" stroke="#2ba1b9" fill="url(#revGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>
          )}

          <div className="glass-card min-h-[400px] hover-glow">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
              <h2 className="font-unbounded text-xs font-bold text-white uppercase tracking-widest">Letzte Fahrten</h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{jobs.length} Fahrten registriert</span>
              </div>
            </div>
            <div className="space-y-3">
              {jobs.map((j, i) => <JobCard key={i} job={j} onSelect={setSelectedJob} />)}
              {jobs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 opacity-20">
                  <Truck size={48} className="mb-4" />
                  <p className="font-bold uppercase tracking-widest text-xs">Keine Fahrten gefunden</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Settings Section (Mobile) */}
        {isSelf && (
          <div className="lg:hidden w-full glass-card hover-glow order-3">
            <SettingsContent 
              isSelf={isSelf}
              editUsername={editUsername}
              setEditUsername={setEditUsername}
              editTmpId={editTmpId}
              setEditTmpId={setEditTmpId}
              saving={saving}
              handleSave={handleSave}
              oldPassword={oldPassword}
              setOldPassword={setOldPassword}
              newPassword={newPassword}
              setNewPassword={setNewPassword}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              changingPwd={changingPwd}
              token={token}
              setShowDeleteModal={setShowDeleteModal}
              user={user}
              handleDeleteAccount={handleDeleteAccount}
              deleting={deleting}
              deleteConfirmText={deleteConfirmText}
              setDeleteConfirmText={setDeleteConfirmText}
              logout={logout}
            />
          </div>
        )}
      </div>
      <style>{`
        @keyframes profile-pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6); }
          70% { box-shadow: 0 0 0 15px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
      `}</style>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 20 }}
              className="glass-card w-full max-w-md !p-0 overflow-hidden shadow-2xl border-red-500/20" 
              onClick={e => e.stopPropagation()}
            >
              <div className="p-8 bg-gradient-to-br from-red-500/10 to-transparent">
                <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mb-6 mx-auto">
                  <AlertTriangle size={32} className="text-red-500" />
                </div>
                <h3 className="font-unbounded text-lg font-black text-white text-center uppercase tracking-tight italic mb-2">Bist du sicher?</h3>
                <p className="text-sm text-slate-400 text-center leading-relaxed mb-8">
                  Dein Konto und alle damit verbundenen Daten werden <span className="text-red-500 font-bold uppercase italic">unwiderruflich gelöscht</span>. Dies kann nicht rückgängig gemacht werden.
                </p>

                <div className="space-y-4">
                  <div className="bg-black/20 border border-white/5 rounded-2xl p-4">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 text-center">Bestätige durch Eingabe von <span className="text-white">"{user?.username}"</span></p>
                    <input 
                      type="text" 
                      value={deleteConfirmText}
                      onChange={e => setDeleteConfirmText(e.target.value)}
                      placeholder="Benutzername eingeben"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white text-center focus:border-red-500/30 outline-none transition-all"
                      autoFocus
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={handleDeleteAccount}
                      disabled={deleting || deleteConfirmText !== user?.username}
                      className="w-full bg-red-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-600 disabled:opacity-30 disabled:grayscale transition-all flex items-center justify-center gap-2"
                    >
                      {deleting ? <Loader2 size={20} className="animate-spin" /> : <><Trash2 size={20} /> Ja, Konto jetzt löschen</>}
                    </button>
                    <button 
                      onClick={() => setShowDeleteModal(false)}
                      className="w-full py-4 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Job Detail Modal */}
      <AnimatePresence>
        {selectedJob && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setSelectedJob(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass-card w-full max-w-2xl !p-0 overflow-hidden shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              {/* Background Glow */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full -mr-40 -mt-40 blur-[100px]" />
              
              <div className="p-8 space-y-6 relative z-10">
                <div className="flex items-center justify-between">
                  <h3 className="font-unbounded text-xl font-black text-white uppercase tracking-tight italic flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Truck className="w-6 h-6 text-primary" />
                    </div>
                    Fahrt-Details
                  </h3>
                  <button onClick={() => setSelectedJob(null)} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                    <X size={20} className="text-slate-500" />
                  </button>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-2xl p-6 shadow-inner flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5 italic">Start</p>
                      <span className="text-base text-white font-bold italic uppercase">{selectedJob.source_city_name}</span>
                      <p className="text-slate-500 text-[10px] font-bold uppercase italic opacity-50">{selectedJob.source_company_name}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-1 opacity-20">
                     <ArrowRight size={24} className="text-primary" />
                  </div>
                  
                  <div className="flex items-center gap-4 text-right md:flex-row-reverse md:text-left">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5 italic">Ziel</p>
                      <span className="text-base text-white font-bold italic uppercase">{selectedJob.destination_city_name}</span>
                      <p className="text-slate-500 text-[10px] font-bold uppercase italic opacity-50">{selectedJob.destination_company_name}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-xl italic ${
                    (selectedJob.status === "delivered" || selectedJob.status === "completed") && selectedJob.revenue >= 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : (selectedJob.status === "cancelled" || selectedJob.revenue < 0) ? "bg-red-500/10 text-red-400 border border-red-500/20"
                    : "bg-primary/10 text-primary border border-primary/20"
                  }`}>
                    {(selectedJob.status === "delivered" || selectedJob.status === "completed") && selectedJob.revenue >= 0 ? "Abgeschlossen" : (selectedJob.status === "cancelled" || selectedJob.revenue < 0) ? "Abgebrochen" : "Fahrt"}
                  </span>
                  {selectedJob.game?.code && (
                    <span className="text-[10px] font-black text-slate-500 px-4 py-1.5 bg-white/5 rounded-xl uppercase tracking-widest italic">{selectedJob.game.code}</span>
                  )}
                </div>

                <div className="bg-black/40 border border-white/5 rounded-2xl p-6 shadow-inner grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
                  <div className="space-y-2">
                    <DetailRow icon={Package} label="Fracht" value={selectedJob.cargo_name} />
                    <DetailRow icon={Weight} label="Gewicht" value={selectedJob.cargo_mass_t ? `${selectedJob.cargo_mass_t.toFixed(1)} t` : null} />
                    <DetailRow icon={Truck} label="Fahrzeug" value={selectedJob.vehicle_brand_name ? `${selectedJob.vehicle_brand_name} ${selectedJob.vehicle_model_name || ""}` : null} />
                    <DetailRow icon={Package} label="Trailer" value={selectedJob.trailer_name} />
                    <DetailRow icon={Route} label="Distanz" value={selectedJob.driven_distance_km ? `${Math.round(selectedJob.driven_distance_km).toLocaleString("de-DE")} km` : null} />
                    <DetailRow icon={Timer} label="Fahrzeit" value={selectedJob.duration} />
                  </div>
                  <div className="space-y-2">
                    <DetailRow icon={Coins} label="Einnahmen" value={selectedJob.revenue ? `${Math.round(selectedJob.revenue).toLocaleString("de-DE")} $` : null} />
                    <DetailRow icon={Zap} label="Punkte" value={selectedJob.points} />
                    <DetailRow icon={Gauge} label="Avg. Speed" value={selectedJob.average_speed_kmh ? `${Math.round(selectedJob.average_speed_kmh)} km/h` : null} />
                    <DetailRow icon={Fuel} label="Verbrauch" value={selectedJob.fuel_used_l ? `${Math.round(selectedJob.fuel_used_l)} L` : null} />
                    <DetailRow icon={Calendar} label="Gestartet" value={selectedJob.started_at ? new Date(selectedJob.started_at).toLocaleString("de-DE") : null} />
                    <DetailRow icon={Calendar} label="Beendet" value={(selectedJob.completed_at || selectedJob.ended_at) ? new Date(selectedJob.completed_at || selectedJob.ended_at).toLocaleString("de-DE") : null} />
                  </div>
                </div>

                {selectedJob.public_url && (
                  <a
                    href={selectedJob.public_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-primary/10 border border-primary/20 rounded-2xl py-4 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/20 transition-all italic shadow-lg"
                  >
                    <ExternalLink size={16} />
                    Auf Trucky ansehen
                  </a>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
