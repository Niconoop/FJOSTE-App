import { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, MapPin, Route, Coins, Weight, Award, Globe, Clock, Truck, ChevronDown, ExternalLink, User, Lock, Save, Loader2, Check, Calendar, Package, Gauge, Star, Camera, Trash2, AlertTriangle, X, Timer, Zap, Fuel, Instagram, Youtube, Twitch, Twitter, Navigation } from 'lucide-react';
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

const CHART_COLORS = ["#f59e0b", "#0EA5E9", "#38BDF8", "#7DD3FC", "#06B6D4", "#67E8F9", "#155E75", "#164E63"];

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-black/90 border border-white/5 backdrop-blur-md rounded-xl px-4 py-3 text-[10px] shadow-2xl">
      <p className="text-white font-black uppercase tracking-widest mb-1 italic">{label}</p>
      {payload.map((e: any, i: number) => (
        <p key={i} style={{ color: e.color || "#f59e0b" }} className="font-bold italic uppercase">
          {e.name}: {typeof e.value === "number" ? e.value.toLocaleString("de-DE") : e.value}
        </p>
      ))}
    </div>
  );
};

const SettingsContent = ({ isSelf, editUsername, setEditUsername, editTmpId, setEditTmpId, bio, setBio, instagram, setInstagram, youtube, setYoutube, twitch, setTwitch, tiktok, setTiktok, twitter, setTwitter, website, setWebsite, saving, handleSave, oldPassword, setOldPassword, newPassword, setNewPassword, confirmPassword, setConfirmPassword, changingPwd, token, setShowDeleteModal, user, handleDeleteAccount, deleting, deleteConfirmText, setDeleteConfirmText, logout }: any) => {
  if (!isSelf) return null;
  return (
    <>
      <div className="border-l-2 border-primary pl-4 mb-6">
        <h3 className="text-[10px] font-black text-primary uppercase tracking-widest">EINSTELLUNGEN</h3>
      </div>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block italic">Anzeigename</label>
          <input value={editUsername} onChange={e => setEditUsername(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 focus:bg-white/[0.05] outline-none transition-all duration-300 italic" />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block italic">TruckersMP ID</label>
          <input value={editTmpId} onChange={e => setEditTmpId(e.target.value)} placeholder="Z.B. 5635834" className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 focus:bg-white/[0.05] outline-none transition-all duration-300 italic" />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block italic">Biografie / Info</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Erzähle etwas über dich..." className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 focus:bg-white/[0.05] outline-none transition-all duration-300 italic min-h-[100px]" />
        </div>

        <div className="pt-4 border-t border-white/5 space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Social Links</h3>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block italic">Instagram URL</label>
            <input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="https://instagram.com/..." className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 focus:bg-white/[0.05] outline-none transition-all duration-300 italic" />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block italic">YouTube URL</label>
            <input value={youtube} onChange={e => setYoutube(e.target.value)} placeholder="https://youtube.com/..." className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 focus:bg-white/[0.05] outline-none transition-all duration-300 italic" />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block italic">Twitch URL</label>
            <input value={twitch} onChange={e => setTwitch(e.target.value)} placeholder="https://twitch.tv/..." className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 focus:bg-white/[0.05] outline-none transition-all duration-300 italic" />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block italic">TikTok URL</label>
            <input value={tiktok} onChange={e => setTiktok(e.target.value)} placeholder="https://tiktok.com/@..." className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 focus:bg-white/[0.05] outline-none transition-all duration-300 italic" />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block italic">Twitter / X URL</label>
            <input value={twitter} onChange={e => setTwitter(e.target.value)} placeholder="https://x.com/..." className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 focus:bg-white/[0.05] outline-none transition-all duration-300 italic" />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block italic">Website URL</label>
            <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 focus:bg-white/[0.05] outline-none transition-all duration-300 italic" />
          </div>
        </div>

        <button disabled={saving} className="w-full bg-primary text-black py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-white transition-all flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(245,158,11,0.2)] italic">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Profil Speichern</>}
        </button>
      </form>

      <div className="mt-10 pt-10 border-t border-white/5">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-4 italic">Passwort ändern</h3>
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (newPassword !== confirmPassword) return toast.error("Passwörter stimmen nicht überein");
          setChangingPwd(true);
          try {
            await axios.put(`${API_URL}/auth/password`, {
              old_password: oldPassword,
              new_password: newPassword
            }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Passwort erfolgreich geändert");
            setOldPassword(""); setNewPassword(""); setConfirmPassword("");
          } catch { toast.error("Altes Passwort nicht korrekt"); }
          finally { setNewPassword(""); setConfirmPassword(""); setChangingPwd(false); }
        }} className="space-y-4">
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
            <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} placeholder="Aktuelles Passwort" className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 focus:bg-white/[0.05] outline-none transition-all duration-300 italic" />
          </div>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Neues Passwort" className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 focus:bg-white/[0.05] outline-none transition-all duration-300 italic" />
          </div>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Passwort bestätigen" className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 focus:bg-white/[0.05] outline-none transition-all duration-300 italic" />
          </div>
          <button disabled={changingPwd} className="w-full border border-white/10 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-white/5 transition-all flex items-center justify-center gap-2 italic">
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
            <h2 className="font-unbounded text-[10px] font-bold text-red-500 uppercase tracking-widest italic">Gefahrenzone</h2>
            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter italic">Kontoverwaltung & Löschung</p>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 font-medium leading-relaxed mb-6 italic">
          Wenn du dein Konto löschst, werden alle deine Daten, Statistiken und Fahrten unwiderruflich entfernt. Diese Aktion kann nicht rückgängig gemacht werden.
        </p>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="w-full bg-red-500/5 border border-red-500/10 text-red-500 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-500/10 transition-all flex items-center justify-center gap-2 group italic"
        >
          <Trash2 size={14} className="group-hover:rotate-12 transition-transform" />
          Konto unwiderruflich löschen
        </button>
      </div>
    </>
  );
};

const JobCard = ({ job, onSelect }: any) => {
  return (
    <div className="frosted-card !p-0 overflow-hidden hover:border-[#f59e0b]/20 hover-glow transition-all group/job">
      <button onClick={() => onSelect(job)} className="w-full text-left p-3 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
            <Truck className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0 sm:hidden">
            <p className="text-[13px] font-bold text-white truncate italic uppercase tracking-tight">{job.source_city_name} → {job.destination_city_name}</p>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="hidden sm:block text-[13px] font-bold text-white truncate italic uppercase tracking-tight">{job.source_city_name} → {job.destination_city_name}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 italic">
            <span className="flex items-center gap-1 shrink-0"><Package size={11} /> {job.cargo_name || 'Fracht'}</span>
            <span className="shrink-0">{job.cargo_mass_t ? `${Math.round(job.cargo_mass_t)} T` : '--'}</span>
            <span className="shrink-0">{Math.round(job.driven_distance_km)} KM</span>
            <span className="text-emerald-400 shrink-0">{Math.round(job.revenue).toLocaleString()} $</span>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-1.5 sm:mt-0 pt-1.5 sm:pt-0 border-t sm:border-0 border-white/5">
          <div className="flex items-center gap-3">
            <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter italic ${(job.status === 'delivered' || job.status === 'completed') && job.revenue >= 0 ? 'bg-emerald-500/20 text-emerald-500' : (job.status === 'cancelled' || job.revenue < 0) ? 'bg-red-500/20 text-red-500' : 'bg-primary/20 text-primary'}`}>
              {(job.status === 'delivered' || job.status === 'completed') && job.revenue >= 0 ? 'Geliefert' : (job.status === 'cancelled' || job.revenue < 0) ? 'Abgebrochen' : 'Fahrt'}
            </div>
            <span className="text-[9px] font-bold text-slate-600 uppercase italic">
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
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [twitch, setTwitch] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [twitter, setTwitter] = useState("");
  const [website, setWebsite] = useState("");
  const [bio, setBio] = useState("");
  const [localStats, setLocalStats] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [truckersmpSession, setTruckersmpSession] = useState<any>(null);
  const [jobPage, setJobPage] = useState(0);
  const JOBS_PER_PAGE = 8;

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
      level: lvl,
      jobs: Number(driver?.total_jobs || jobs.length || 0)
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
  const portalRoot = typeof document !== 'undefined' ? document.body : null;

  const loadData = useCallback(async () => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };
    try {
      // 1. Load member data from single member endpoint (already merged in backend)
      const memberRes = await axios.get(`${API_URL}/trucky/member/${encodeURIComponent(targetId)}`, { headers });
      const me = memberRes.data;

      if (me) {
        setDriver(me);
        setBio(me.bio || "");
        if (isSelf) {
          const socials = me.socials || {};
          setInstagram(socials.instagram || "");
          setYoutube(socials.youtube || "");
          setTwitch(socials.twitch || "");
          setTiktok(socials.tiktok || "");
          setTwitter(socials.twitter || "");
          setWebsite(socials.website || "");
        }
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
        } catch { }
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
      } catch { }

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

  useEffect(() => { setJobPage(0); }, [jobs.length]);

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
    } catch (e) { }
  }, [driver?.name, isSelf]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put(`${API_URL}/auth/profile`, {
        username: editUsername,
        truckersmp_id: parseInt(editTmpId) || 0,
        instagram,
        youtube,
        twitch,
        tiktok,
        twitter,
        website,
        bio
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

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setSaving(true);
    try {
      await axios.post(`${API_URL}/auth/banner`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success("Banner erfolgreich aktualisiert");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Fehler beim Hochladen des Bildes";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const getBannerUrl = (url?: string | null) => {
    if (!url) return "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1920";
    return getAvatarUrl(url);
  };

  const getAvatarUrlLocal = (url?: string) => getAvatarUrl(url);

  const openJobOnWebsite = (job: any) => {
    if (!job?.id) return;
    const driverId = driver?.id || driver?.trucky_id || targetId;
    const url = `https://www.openpipeclub.com/job/${job.id}`;
    window.open(url, "_blank");
  };

  if (loading) return (
    <div className="space-y-8 pb-10 animate-pulse">
      {/* Banner */}
      <div className="relative w-full h-[35vh] sm:h-[45vh] bg-black overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
      </div>

      <div className="max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Horizontale Infoleiste */}
        <div className="relative z-10 -mt-8 sm:-mt-10 border border-white/5 rounded-2xl py-6 px-8 shadow-2xl shadow-black/95 mb-12 frosted-card">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
            <div className="sm:border-r border-white/5 last:border-0 sm:pr-6 space-y-2">
              <div className="h-2 bg-white/5 rounded w-20 mx-auto sm:mx-0" />
              <div className="h-4 bg-white/5 rounded w-24 mx-auto sm:mx-0" />
            </div>
            <div className="sm:border-r border-white/5 last:border-0 sm:px-6 space-y-2">
              <div className="h-2 bg-white/5 rounded w-20 mx-auto sm:mx-0" />
              <div className="h-4 bg-white/5 rounded w-24 mx-auto sm:mx-0" />
            </div>
            <div className="sm:pl-6 space-y-2">
              <div className="h-2 bg-white/5 rounded w-20 mx-auto sm:mx-0" />
              <div className="h-4 bg-white/5 rounded w-24 mx-auto sm:mx-0" />
            </div>
          </div>
        </div>

        {/* 2-Spalten-Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Linke Spalte */}
          <div className="lg:col-span-8 space-y-8">
            <div className="frosted-card !p-6 sm:!p-8 space-y-6">
              <div className="h-4 w-40 bg-white/5 rounded" />
              <div className="space-y-2">
                <div className="h-3 bg-white/5 rounded w-full" />
                <div className="h-3 bg-white/5 rounded w-5/6" />
              </div>
            </div>
            <div className="frosted-card !p-6 sm:!p-8 space-y-4">
              <div className="h-4 w-32 bg-white/5 rounded" />
              {[1, 2].map(i => <div key={i} className="h-20 bg-white/5 rounded-2xl" />)}
            </div>
            <div className="frosted-card !p-6 sm:!p-8 space-y-4">
              <div className="h-4 w-36 bg-white/5 rounded" />
              <div className="h-40 bg-white/5 rounded-2xl" />
            </div>
          </div>

          {/* Rechte Spalte */}
          <div className="lg:col-span-4 space-y-8">
            <div className="frosted-card !p-6 space-y-4">
              <div className="h-4 w-28 bg-white/5 rounded" />
              <div className="h-24 bg-white/5 rounded-2xl" />
            </div>
            <div className="frosted-card !p-6 space-y-4">
              <div className="h-4 w-24 bg-white/5 rounded" />
              {[1, 2, 3, 4].map(i => <div key={i} className="h-3 bg-white/5 rounded w-full" />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const finalAvatar = getAvatarUrlLocal(isSelf ? (user?.avatar_url || driver?.avatar_url) : driver?.avatar_url);
  const finalBanner = getBannerUrl(isSelf ? (user?.custom_banner_url || driver?.custom_banner_url) : driver?.custom_banner_url);

  const lastJobTime = lastJob ? (() => {
    const val = lastJob.stop_timestamp || lastJob.delivered_at || lastJob.ended_at || lastJob.created_at;
    const date = typeof val === 'number'
      ? new Date(val < 10000000000 ? val * 1000 : val)
      : new Date(val);
    return formatDistanceToNow(date, { addSuffix: true, locale: de });
  })() : 'Nie';

  const totalJobPages = Math.max(1, Math.ceil(jobs.length / JOBS_PER_PAGE));
  const safeJobPage = Math.min(jobPage, totalJobPages - 1);
  const pagedJobs = jobs.slice(safeJobPage * JOBS_PER_PAGE, safeJobPage * JOBS_PER_PAGE + JOBS_PER_PAGE);

  return (
    <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header-Bereich (Full Width Banner) */}
      <div className="relative w-full h-[35vh] sm:h-[45vh] shadow-2xl overflow-hidden bg-black">
        <img src={finalBanner} alt="Profile Banner" className="w-full h-full object-cover filter brightness-[0.4] scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

        {/* Zurück Button (floating overlay at top-left) */}
        <div className="absolute top-24 lg:top-24 left-4 sm:left-6 lg:left-8 z-50">
          <button onClick={onBack} className="inline-flex items-center gap-2 text-slate-400 hover:text-white group bg-black/60 backdrop-blur-md px-5 py-2 rounded-full border border-white/10 hover:border-primary/40 transition-all cursor-pointer shadow-lg hover:bg-black/80 italic">
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Zurück</span>
          </button>
        </div>

        {/* Banner Edit Button */}
        {isSelf && (
          <label className="absolute top-24 lg:top-24 right-4 z-50 flex items-center gap-2 bg-black/60 hover:bg-black/80 backdrop-blur-md px-3.5 py-2 rounded-full border border-white/10 hover:border-primary/40 transition-all cursor-pointer shadow-lg">
            <input type="file" className="hidden" accept="image/*" onChange={handleBannerUpload} />
            <Camera size={14} className="text-primary" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Banner ändern</span>
          </label>
        )}

        <div className="absolute inset-0 flex flex-col items-center justify-end text-center p-6 sm:p-8 pb-10">
          {/* Avatar Container */}
          <div className="relative group/avatar mb-4">
            <div className={`w-28 h-28 rounded-full bg-black border-4 overflow-hidden shadow-2xl relative transition-all duration-500 shrink-0 ${liveData?.online ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-[profile-pulse_2s_infinite]' : 'border-white/5'}`}>
              {finalAvatar ? (
                <img src={finalAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/20 flex items-center justify-center text-3xl font-black text-primary italic">{(driver?.name || user?.username)?.charAt(0)}</div>
              )}
            </div>
            {isSelf && (
              <label className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-all cursor-pointer rounded-full">
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                <div className="flex flex-col items-center gap-1">
                  <Camera size={20} className="text-white" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-white">Ändern</span>
                </div>
              </label>
            )}
          </div>

          <h1 className="font-unbounded text-xl sm:text-3xl font-black text-white tracking-wider uppercase leading-none max-w-4xl drop-shadow-xl italic mb-1">
            {driver?.name || user?.username}
          </h1>

          <p className="text-xs mt-1.5 font-black uppercase tracking-widest text-primary drop-shadow-md italic">
            {driver?.role?.name || 'Fahrer'}
          </p>
        </div>
      </div>

      {/* Content Container (Widescreen layout) */}
      <div className="max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Horizontale Infoleiste (Floating over cover image bottom edge) */}
        <div className="relative z-10 -mt-8 sm:-mt-10 border border-white/5 rounded-2xl py-6 px-8 shadow-2xl shadow-black/95 mb-12 frosted-card">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
            <div className="sm:border-r border-white/5 last:border-0 sm:pr-6">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">GESAMT-DISTANZ</p>
              <p className="text-base font-black text-white uppercase mt-1 truncate">{Math.round(mergedStats.distance).toLocaleString()} KM</p>
            </div>
            <div className="sm:border-r border-white/5 last:border-0 sm:px-6">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">FAHRTEN</p>
              <p className="text-base font-black text-white uppercase mt-1 truncate">{mergedStats.jobs} Fahrten</p>
            </div>
            <div className="sm:pl-6">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">PUNKTE</p>
              <p className="text-base font-black text-primary uppercase mt-1 truncate">{mergedStats.points.toLocaleString()} PT</p>
            </div>
          </div>
        </div>

        {/* 2-Spalten-Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Linke Spalte: Biografie, Letzte Fahrten & Charts */}
          <div className="lg:col-span-8 space-y-8">
            <div className="frosted-card !p-6 sm:!p-8 space-y-6 hover-glow">
              <div className="border-l-2 border-primary pl-4">
                <h3 className="text-xs font-black text-primary uppercase tracking-widest italic">BIOGRAFIE & INFO</h3>
              </div>
              <div className="text-sm text-slate-400 leading-relaxed whitespace-pre-line max-w-none italic">
                {driver?.bio || "Diese(r) Fahrer(in) hat noch keine Biografie hinterlegt."}
              </div>
            </div>

            {/* Letzte Fahrten */}
            <div className="frosted-card min-h-[400px] !p-6 sm:!p-8 hover-glow">
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                <div className="border-l-2 border-primary pl-4">
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-widest italic">LETZTE FAHRTEN</h3>
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">{jobs.length} Fahrten registriert</span>
              </div>
              <div className="space-y-2">
                {pagedJobs.map((j, i) => <JobCard key={i} job={j} onSelect={openJobOnWebsite} />)}
                {jobs.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 opacity-20">
                    <Truck size={48} className="mb-4" />
                    <p className="font-black uppercase tracking-widest text-[10px] italic">Keine Fahrten gefunden</p>
                  </div>
                )}
              </div>

              {totalJobPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => setJobPage(p => Math.max(0, p - 1))}
                    disabled={safeJobPage === 0}
                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    Zurück
                  </button>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-2">
                    {safeJobPage + 1} / {totalJobPages}
                  </span>
                  <button
                    onClick={() => setJobPage(p => Math.min(totalJobPages - 1, p + 1))}
                    disabled={safeJobPage >= totalJobPages - 1}
                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    Weiter
                  </button>
                </div>
              )}
            </div>

            {/* Charts Row */}
            {jobs.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div initial={{ opacity: 1, y: 20 }} animate={{ opacity: 1, y: 0 }} className="frosted-card shadow-xl hover-glow">
                  <div className="border-l-2 border-primary pl-4 mb-4">
                    <h3 className="text-[10px] font-black text-primary uppercase tracking-widest italic">DISTANZ PRO JOB</h3>
                  </div>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={distanceChart} barSize={16}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                        <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 8, fontWeight: 900 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={40} />
                        <YAxis tick={{ fill: "#475569", fontSize: 8, fontWeight: 900 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                        <Bar dataKey="Distanz" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 1, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="frosted-card shadow-xl hover-glow">
                  <div className="border-l-2 border-primary pl-4 mb-4">
                    <h3 className="text-[10px] font-black text-primary uppercase tracking-widest italic">FRACHTARTEN</h3>
                  </div>
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

                <motion.div initial={{ opacity: 1, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="frosted-card md:col-span-2 shadow-xl hover-glow">
                  <div className="border-l-2 border-primary pl-4 mb-4">
                    <h3 className="text-[10px] font-black text-primary uppercase tracking-widest italic">UMSATZENTWICKLUNG</h3>
                  </div>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueChart}>
                        <defs>
                          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                        <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 8, fontWeight: 900 }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" height={30} />
                        <YAxis tick={{ fill: "#475569", fontSize: 8, fontWeight: 900 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="Einnahmen" stroke="#f59e0b" fill="url(#revGrad)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              </div>
            )}
          </div>

          {/* Rechte Spalte: Info-Karten & Live Status & Einstellungen */}
          <div className="lg:col-span-4 space-y-6">
            {/* Live Session Card */}
            {(isTelemetryActive || liveData?.online || liveData?.last_position) && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="frosted-card bg-gradient-to-br from-black to-blue-600/5 border-primary/20 space-y-4 hover-glow">
                <div className="flex items-center justify-between">
                  <div className="border-l-2 border-primary pl-4">
                    <h3 className="text-[10px] font-black text-primary uppercase tracking-widest italic">LIVE SESSION</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${(isTelemetryActive || liveData?.online) ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" : "bg-slate-600"}`} />
                    <span className={`text-[9px] font-black uppercase tracking-widest italic ${(isTelemetryActive || liveData?.online) ? "text-emerald-400" : "text-slate-600"}`}>
                      {(isTelemetryActive || liveData?.online) ? "Aktiv" : "Offline"}
                    </span>
                  </div>
                </div>
                {(isTelemetryActive || liveData?.online) ? (
                  <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-4">
                    <div className="flex items-center gap-3">
                      <Truck size={16} className="text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate italic uppercase">
                          {((isTelemetryActive ? telemetry?.brand : liveData?.brand) || "LKW") + " " + ((isTelemetryActive ? telemetry?.model : liveData?.model) || "")}
                        </p>
                        {((isTelemetryActive ? telemetry?.cargo : liveData?.job?.cargo)) && (
                          <p className="text-[9px] text-primary font-black uppercase tracking-widest mt-0.5 truncate">
                            📦 {isTelemetryActive ? telemetry.cargo : liveData.job.cargo}
                            {((isTelemetryActive ? telemetry.cargoMass : liveData.job.cargo_mass) || 0) > 0 && ` (${(isTelemetryActive ? telemetry.cargoMass : liveData.job.cargo_mass).toFixed(1)} T)`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                      <div>
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5 italic">Tempo</p>
                        <p className="text-sm font-black text-white italic">{Math.round(isTelemetryActive ? (telemetry?.speed || 0) : (liveData?.speed || 0))} <span className="text-[9px] text-slate-500 not-italic ml-1 uppercase">KM/H</span></p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5 italic">Sprit</p>
                        <p className="text-sm font-black text-white italic">{Math.round(isTelemetryActive ? (telemetry?.fuel || 0) : (liveData?.fuel || 0))} <span className="text-[9px] text-slate-500 not-italic ml-1 uppercase">L</span></p>
                      </div>
                    </div>
                  </div>
                ) : liveData?.last_position ? (
                  <div className="p-4 bg-black/40 border border-white/5 rounded-2xl">
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2 italic">Zuletzt gesehen</p>
                    <p className="text-xs font-bold text-slate-300 italic">{formatDistanceToNow(new Date(liveData.last_position.updated_at), { addSuffix: true, locale: de })}</p>
                  </div>
                ) : null}

                {(isTelemetryActive ? (telemetry.source && telemetry.dest) : (liveData?.job?.source && liveData?.job?.destination)) && (
                  <div
                    onClick={() => onViewOnMap?.(targetId)}
                    className="p-3 bg-white/5 rounded-xl border border-white/5 flex flex-col gap-2 shadow-inner hover:bg-primary/5 hover:border-primary/30 transition-all cursor-pointer group/loc"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <MapPin size={12} className="text-primary shrink-0" />
                        <span className="text-[10px] font-bold text-white truncate italic">
                          {isTelemetryActive ? telemetry.source : liveData.job.source}
                          {isTelemetryActive && telemetry.dest ? ` → ${telemetry.dest}` : (liveData.job.destination ? ` → ${liveData.job.destination}` : "")}
                        </span>
                      </div>
                      <ExternalLink size={12} className="text-slate-600 group-hover/loc:text-primary transition-colors" />
                    </div>
                  </div>
                )}

                {(liveData?.online || liveData?.last_position) && (
                  <button
                    onClick={() => onViewOnMap?.(targetId)}
                    className="w-full mt-1 flex items-center justify-center gap-2 py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-xl text-primary text-[10px] font-black uppercase tracking-widest italic transition-all group/mapbtn"
                  >
                    <Navigation size={14} className="group-hover/mapbtn:translate-x-0.5 group-hover/mapbtn:-translate-y-0.5 transition-transform" />
                    Position auf Karte
                  </button>
                )}
              </motion.div>
            )}

            {/* Weitere Details */}
            <div className="frosted-card !p-6 hover-glow">
              <div className="border-l-2 border-primary pl-4 mb-4">
                <h3 className="text-[10px] font-black text-primary uppercase tracking-widest italic">WEITERE DETAILS</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs border-b border-white/5 pb-3">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">STANDORT</span>
                  <span className="text-white font-black uppercase truncate max-w-[180px]">
                    {liveData?.live_location?.city || liveData?.last_position?.city || driver?.country || 'Europa'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-white/5 pb-3">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">LEVEL</span>
                  <span className="text-white font-black uppercase">Level {mergedStats.level}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-white/5 pb-3">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">TRUCKERSMP ID</span>
                  <span className="text-primary font-black uppercase">{user?.truckersmp_id || driver?.truckersmp_id || "Keine ID"}</span>
                </div>
                {driver?.trucklinemp_id ? (
                  <div className="flex justify-between items-center text-xs border-b border-white/5 pb-3">
                    <span className="text-slate-500 font-bold uppercase tracking-wider">TRUCKLINEMP ID</span>
                    <span className="text-primary font-black uppercase">{driver.trucklinemp_id}</span>
                  </div>
                ) : null}
                <div className="flex justify-between items-center text-xs border-b border-white/5 pb-3">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">BEIGETRETEN</span>
                  <span className="text-white font-black uppercase">
                    {driver?.created_at ? new Date(driver.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" }) : "--"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">LETZTE AKTIVITÄT</span>
                  <span className="text-white font-black uppercase">{lastJobTime}</span>
                </div>
              </div>
            </div>

            {/* Social Media Links */}
            {driver?.socials && Object.entries(driver.socials).some(([k, v]) => k !== 'website' && v) && (
              <div className="frosted-card !p-6 hover-glow">
                <div className="border-l-2 border-primary pl-4 mb-4">
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-widest italic">SOCIAL MEDIA</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {driver.socials.instagram && (
                    <a href={driver.socials.instagram} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 border border-white/10 rounded-xl hover:border-primary/50 text-slate-400 hover:text-white transition-all flex items-center justify-center" title="Instagram">
                      <Instagram size={14} className="text-[#E1306C]" />
                    </a>
                  )}
                  {driver.socials.youtube && (
                    <a href={driver.socials.youtube} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 border border-white/10 rounded-xl hover:border-primary/50 text-slate-400 hover:text-white transition-all flex items-center justify-center" title="YouTube">
                      <Youtube size={14} className="text-[#FF0000]" />
                    </a>
                  )}
                  {driver.socials.twitch && (
                    <a href={driver.socials.twitch} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 border border-white/10 rounded-xl hover:border-primary/50 text-slate-400 hover:text-white transition-all flex items-center justify-center" title="Twitch">
                      <Twitch size={14} className="text-[#9146FF]" />
                    </a>
                  )}
                  {driver.socials.tiktok && (
                    <a href={driver.socials.tiktok} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 border border-white/10 rounded-xl hover:border-primary/50 text-slate-400 hover:text-white transition-all flex items-center justify-center" title="TikTok">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.74-3.94-1.72-.01 2.92.01 5.84-.02 8.75-.18 2.26-1.5 4.49-3.76 5.3-2.28.87-4.99.39-6.81-1.21-1.93-1.68-2.61-4.52-1.58-6.91.93-2.26 3.32-3.83 5.79-3.78.01 1.34 0 2.68.01 4.02-1.35-.07-2.79.52-3.41 1.75-.63 1.22-.32 2.92.74 3.79.99.85 2.53.82 3.48-.09.58-.53.84-1.34.83-2.12-.02-3.92-.01-7.84-.01-11.77-.02-.85-.01-1.7-.02-2.55z" /></svg>
                    </a>
                  )}
                  {driver.socials.twitter && (
                    <a href={driver.socials.twitter} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 border border-white/10 rounded-xl hover:border-primary/50 text-slate-400 hover:text-white transition-all flex items-center justify-center" title="Twitter / X">
                      <Twitter size={14} className="text-white" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Settings Section (Desktop) */}
            {isSelf && (
              <div className="hidden lg:block frosted-card hover-glow">
                <SettingsContent
                  isSelf={isSelf}
                  editUsername={editUsername}
                  setEditUsername={setEditUsername}
                  editTmpId={editTmpId}
                  setEditTmpId={setEditTmpId}
                  bio={bio}
                  setBio={setBio}
                  instagram={instagram}
                  setInstagram={setInstagram}
                  youtube={youtube}
                  setYoutube={setYoutube}
                  twitch={twitch}
                  setTwitch={setTwitch}
                  tiktok={tiktok}
                  setTiktok={setTiktok}
                  twitter={twitter}
                  setTwitter={setTwitter}
                  website={website}
                  setWebsite={setWebsite}
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

          {/* Settings Section (Mobile) */}
          {isSelf && (
            <div className="lg:hidden w-full frosted-card hover-glow order-3">
              <SettingsContent
                isSelf={isSelf}
                editUsername={editUsername}
                setEditUsername={setEditUsername}
                editTmpId={editTmpId}
                setEditTmpId={setEditTmpId}
                bio={bio}
                setBio={setBio}
                instagram={instagram}
                setInstagram={setInstagram}
                youtube={youtube}
                setYoutube={setYoutube}
                twitch={twitch}
                setTwitch={setTwitch}
                tiktok={tiktok}
                setTiktok={setTiktok}
                twitter={twitter}
                setTwitter={setTwitter}
                website={website}
                setWebsite={setWebsite}
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
      </div>

      <style>{`
        @keyframes profile-pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6); }
          70% { box-shadow: 0 0 0 15px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
      `}</style>

      {portalRoot && createPortal(
        <AnimatePresence>
          {showDeleteModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 backdrop-blur-md"
              onClick={() => setShowDeleteModal(false)}
            >
              <div className="relative flex min-h-full items-center justify-center p-4 sm:p-6">
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className="relative z-[101] w-[min(92vw,32rem)] frosted-card !p-0 overflow-hidden shadow-2xl border-red-500/20"
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        portalRoot
      )}

    </div>
  );
};

export default Profile;
