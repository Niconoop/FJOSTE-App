import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Briefcase, Route, Coins, Calendar, Truck, ArrowRight, 
  MapPin, Monitor, Award, Sparkles, UserCheck, Plus, ShieldAlert, Settings, Package, Newspaper} from 'lucide-react';
import { apiService } from '../services/api';
import { getAvatarUrl } from '../config';
import { useAuth } from '../context/AuthContext';
import { getCachedData, setCachedData } from '../utils/cache';

interface KpiProps {
  icon: any;
  label: string;
  value: string | number | undefined;
  color?: string;
  delay?: number;
}

const KpiCard = ({ icon: Icon, label, value, color = "#f59e0b", delay = 0 }: KpiProps) => (
  <motion.div
    initial={{ opacity: 1, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className="frosted-card p-4"
  >
    <div className="flex justify-between items-start">
      <div>
        <p className="text-xs text-slate-400 uppercase font-semibold">{label}</p>
        <p className="text-2xl font-bold text-white">
          {value}
        </p>
      </div>
      <Icon className="w-5 h-5 text-slate-500" />
    </div>
  </motion.div>
);

/* Reusable stagger container + child variants */
const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06 }
  }
};

const staggerChild = {
  hidden: { opacity: 1, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 20 } }
};

const Dashboard = ({ onViewProfile, onNavigate, onNewsCreate, telemetry }: { onViewProfile: (id: string | number) => void; onNavigate: (page: string) => void; onNewsCreate?: () => void; telemetry?: any }) => {
  const { user, isAdmin, hasRole } = useAuth();
  const [stats, setStats] = useState<any>(() => getCachedData('dashboard_stats'));
  const [dashboard, setDashboard] = useState<any>(() => getCachedData('dashboard_main'));
  const [events, setEvents] = useState<any[]>(() => getCachedData('dashboard_events') || []);
  const [news, setNews] = useState<any[]>(() => getCachedData('dashboard_news') || []);
  const [recentJobs, setRecentJobs] = useState<any[]>(() => getCachedData('dashboard_jobs') || []);
  const [personalDriver, setPersonalDriver] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(() => !getCachedData('dashboard_stats'));
  const [truckersmpSession, setTruckersmpSession] = useState<any>(null);

  useEffect(() => {
    // Poll TruckersMP session every 60s
    const fetchSession = async () => {
      try {
        const res = await apiService.getMyTruckersMPSession();
        setTruckersmpSession(res.data);
      } catch (e) {
        // ignore if not logged in
      }
    };
    fetchSession();
    const interval = setInterval(fetchSession, 60000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    setLoading(true);
    const isHR = isAdmin || (hasRole && hasRole(["hr team", "hr-team", "personal team", "personal-team"]));
    const targetId = user?.user_id || user?.id;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const timers: ReturnType<typeof setTimeout>[] = [];

    const runCritical = () => {
      return Promise.allSettled([
        apiService.getStats().then(r => {
          setStats(r.data);
          setCachedData('dashboard_stats', r.data);
        }),
        apiService.getDashboard().then(r => {
          const data = r.data;
          const members = data?.member_chart || [];
          const totalRevenue = members.reduce((s: number, m: any) => s + (m.revenue || 0), 0);
          const totalKm = members.reduce((s: number, m: any) => s + (m.distance_km || 0), 0);
          const totalJobs = members.reduce((s: number, m: any) => s + (m.jobs_count || 0), 0);
          const dashObj = { ...data, totalRevenue, totalKm, totalJobs };
          setDashboard(dashObj);
          setCachedData('dashboard_main', dashObj);
        }),
      ]);
    };

    const runSecondary = () => {
      return Promise.all([
        Promise.all([
          apiService.getEvents().catch(() => ({ data: [] })),
          apiService.getCustomEvents().catch(() => ({ data: [] }))
        ]).then(([res1, res2]) => {
          const all = [
            ...(Array.isArray(res1.data) ? res1.data : []),
            ...(Array.isArray(res2.data) ? res2.data : [])
          ];
          const sorted = all
            .filter((e: any) => e.start_date && new Date(e.start_date).getTime() >= startOfToday.getTime())
            .sort((a: any, b: any) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
          const sliceEvents = sorted.slice(0, 4);
          setEvents(sliceEvents);
          setCachedData('dashboard_events', sliceEvents);
        }),
        apiService.getRecentJobs().then(r => {
          const jobsData = Array.isArray(r.data) ? r.data : [];
          setRecentJobs(jobsData);
          setCachedData('dashboard_jobs', jobsData);
        }),
        apiService.getNews().then(r => {
          const data = Array.isArray(r.data) ? r.data : [];
          const sliceNews = data.slice(0, 1);
          setNews(sliceNews);
          setCachedData('dashboard_news', sliceNews);
        }),
        targetId ? apiService.getMember(targetId).then(r => setPersonalDriver(r.data)) : Promise.resolve(),
        isHR ? apiService.getApplications().then(r => setApplications(r.data)) : Promise.resolve()
      ]);
    };

    Promise.allSettled([runCritical()])
      .then(() => {
        return new Promise<void>(resolve => {
          const timer = setTimeout(() => {
            runSecondary().then(resolve);
          }, 200);
          timers.push(timer);
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user, isAdmin, hasRole]);

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 5) return "Gute Nacht";
    if (hr < 12) return "Guten Morgen";
    if (hr < 18) return "Guten Tag";
    return "Guten Abend";
  };

  const getRoleBadge = () => {
    if (user?.is_admin) {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 text-[9px] font-black uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.1)]">
          System-Administrator
        </span>
      );
    }
    const isHR = hasRole && hasRole(["hr team", "hr-team", "personal team", "personal-team"]);
    if (isHR) {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 text-[9px] font-black uppercase tracking-widest bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.15)]">
          Personalabteilung (HR)
        </span>
      );
    }
    const isEvent = hasRole && hasRole(["event team", "event-team"]);
    if (isEvent) {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-[#f59e0b] border border-amber-500/20 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.1)]">
          Event-Team
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 text-[9px] font-black uppercase tracking-widest bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 rounded-full">
        {typeof user?.role === 'object' ? user?.role?.name : (user?.role || "Fahrer")}
      </span>
    );
  };

  const isGameRunning = telemetry && !telemetry.error;
  const hasData = isGameRunning && telemetry.gameVersion > 0;

  const displayJobs = stats?.jobs || stats?.total_jobs || dashboard?.totalJobs || 0;
  const displayKm = stats?.distance || stats?.total_driven_distance_km || dashboard?.totalKm || 0;
  const displayRev = stats?.revenue || stats?.total_revenue || dashboard?.totalRevenue || 0;

  const isHR = isAdmin || (hasRole && hasRole(["hr team", "hr-team", "personal team", "personal-team"]));
  const isEvent = isAdmin || (hasRole && hasRole(["event team", "event-team"]));
  const NEWS_ROLES = ["admin", "management", "inhaber", "projektleitung", "leitung", "leader", "co-leader", "event team", "event-team", "modding team", "modding-team", "hr team", "hr-team", "personal team", "personal-team", "media team", "media-team", "presse"];
  const canManageNews = isAdmin || (hasRole && hasRole(NEWS_ROLES));

  return (
    <div className="space-y-8 pb-10">
      {/* Title & Telemetry Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isGameRunning && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.1)] ${hasData ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-amber-400 bg-amber-500/10 border-amber-500/20"}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${hasData ? "bg-emerald-500" : "bg-amber-500"}`} />
              {hasData ? "In-Game Telemetrie Aktiv" : "Warte auf Spieldaten..."}
            </motion.div>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
             {/* Personalized Welcome Hero Card */}
             <div className="frosted-card p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-white/5 rounded-2xl overflow-hidden animate-pulse">
               <div className="flex items-center gap-4 md:gap-6 z-10">
                 <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/5 border border-white/5 shrink-0" />
                 <div className="space-y-2.5 md:space-y-2">
                   <div className="h-3 bg-white/5 rounded w-24" />
                   <div className="h-6 bg-white/5 rounded w-56" />
                   <div className="h-3 bg-white/5 rounded w-40" />
                 </div>
               </div>
               <div className="flex flex-wrap gap-3 z-10 w-full sm:w-auto md:justify-end">
                 <div className="h-10 bg-white/5 rounded-xl w-full sm:w-32" />
                 <div className="h-10 bg-white/5 rounded-xl w-full sm:w-32" />
               </div>
             </div>

             {/* Personal Driver Stats Grid */}
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
               {[1, 2, 3, 4].map(i => (
                 <div key={i} className="frosted-card p-4 animate-pulse">
                   <div className="h-3 bg-white/5 rounded w-24 mb-3" />
                   <div className="h-7 bg-white/5 rounded w-20" />
                 </div>
               ))}
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               {/* Upcoming Events */}
               <div className="lg:col-span-2">
                 <div className="flex items-center gap-3 mb-6">
                   <div className="w-1 h-4 bg-amber-400 rounded-full" />
                   <div className="h-4 bg-white/5 rounded w-40 animate-pulse" />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                   {[1, 2, 3, 4].map(i => (
                     <div key={i} className="frosted-card p-5 rounded-2xl border border-white/5 animate-pulse flex flex-col">
                       <div className="flex-grow space-y-3">
                         <div className="h-2 bg-white/5 rounded w-24" />
                         <div className="h-4 bg-white/5 rounded w-32" />
                         <div className="space-y-2 pt-2">
                           <div className="h-3 bg-white/5 rounded w-full" />
                           <div className="h-3 bg-white/5 rounded w-3/4" />
                         </div>
                       </div>
                       <div className="border-t border-white/5 mt-4 pt-4 space-y-2">
                         <div className="h-3 bg-white/5 rounded w-full" />
                         <div className="h-3 bg-white/5 rounded w-2/3" />
                       </div>
                       <div className="h-10 bg-white/5 rounded-lg mt-4" />
                     </div>
                   ))}
                 </div>
               </div>

               {/* Latest News */}
               <div className="lg:col-span-2">
                 <div className="flex items-center gap-3 mb-6">
                   <div className="w-1 h-4 bg-amber-400 rounded-full" />
                   <div className="h-4 bg-white/5 rounded w-40 animate-pulse" />
                 </div>
                 <div className="space-y-3">
                   {[1].map(i => (
                     <div key={i} className="frosted-card flex items-center gap-4 p-4 rounded-2xl border border-white/5 animate-pulse">
                       <div className="p-3 rounded-xl bg-white/5 w-11 h-11 shrink-0" />
                       <div className="flex-1 min-w-0 space-y-2">
                         <div className="h-4 bg-white/5 rounded w-1/2" />
                         <div className="h-3 bg-white/5 rounded w-1/3" />
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             </div>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            {/* Personalized Welcome Hero Card */}
            <motion.div
              variants={staggerChild}
              className="relative frosted-card p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden shadow-2xl border border-white/5 rounded-2xl"
            >
              <div className="flex items-center gap-4 md:gap-6 z-10">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                  {user?.avatar_url ? (
                    <img src={getAvatarUrl(user.avatar_url)} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#f59e0b]/20 flex items-center justify-center text-2xl font-black text-[#f59e0b] italic">
                      {user?.username?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="space-y-1 md:space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-xl md:text-3xl font-unbounded font-black italic uppercase tracking-wider text-white">
                      {getGreeting()}, {user?.username}!
                    </h2>
                    {getRoleBadge()}
                  </div>
                  <p className="text-zinc-400 text-xs md:text-sm font-medium">
                    Willkommen zurück.
                  </p>
                </div>
              </div>

              {/* Role Dependent Action Board */}
              <div className="flex flex-wrap gap-3 z-10 w-full sm:w-auto md:flex-1 md:min-w-0 md:justify-end">
                {isHR && (
                  <button
                    onClick={() => onNavigate('applications')}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900/50 border border-white/10 hover:bg-white/10 text-xs font-bold uppercase tracking-widest text-white transition-all"
                  >
                    <UserCheck className="w-4 h-4" />
                    Bewerbungen
                  </button>
                )}
                {isEvent && (
                  <button
                    onClick={() => onNavigate('events')}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 text-black text-xs font-bold uppercase tracking-widest transition-all hover:bg-amber-500"
                  >
                    <Plus className="w-4 h-4" />
                    Event Planen
                  </button>
                )}
                {canManageNews && (
                  <button
                    onClick={onNewsCreate}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 text-black text-xs font-bold uppercase tracking-widest transition-all hover:bg-amber-500"
                  >
                    <Newspaper className="w-4 h-4" />
                    News erstellen
                  </button>
                )}
              </div>
            </motion.div>

            {/* Personal Driver Stats Grid */}
            {personalDriver && (
              <motion.div variants={staggerChild} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-4 bg-amber-400 rounded-full" />
                  <h3 className="font-unbounded text-sm font-bold text-amber-400 uppercase tracking-widest">Deine persönlichen Fahrdaten</h3>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard icon={Route} label="Deine Kilometer" value={`${Math.round(personalDriver.total_driven_distance_km || 0).toLocaleString("de-DE")} KM`} />
                  <KpiCard icon={Truck} label="Deine Fahrten" value={`${(personalDriver.total_jobs || 0).toLocaleString("de-DE")} Jobs`} />
                  <KpiCard icon={Coins} label="Dein Umsatz" value={`${Math.round(personalDriver.total_revenue || 0).toLocaleString("de-DE")} $`} />
                  <KpiCard icon={Award} label="Dein Rang & Level" value={`Lv. ${personalDriver.level || 1}`} />
                </div>
              </motion.div>
            )}



            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upcoming Events */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-4 bg-amber-400 rounded-full" />
                    <h2 className="font-unbounded text-sm font-bold text-amber-400 uppercase tracking-widest">Nächste Termine</h2>
                  </div>
                  <motion.button
                    onClick={() => onNavigate('events')}
                    whileHover={{ x: 3 }}
                    className="text-xs text-amber-400 font-bold uppercase tracking-widest hover:underline flex items-center gap-1"
                  >
                    Alle <ArrowRight className="w-3 h-3" />
                  </motion.button>
                </div>
                {events.length === 0 ? (
                  <div className="h-40 flex items-center justify-center border-2 border-dashed border-white/10 rounded-xl text-slate-500 text-xs font-bold">Keine Termine</div>
                ) : (
                  <motion.div 
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                    variants={staggerContainer}
                    initial="hidden"
                    animate="show"
                  >
                    {events.map(e => (
                      <motion.div
                        key={e.id}
                        variants={staggerChild}
                        onClick={() => window.open(`https://www.openpipeclub.com/events/${e.slug || (typeof e.title === 'object' ? e.title.name : e.title).toLowerCase().replace(/\s+/g, '-')}`, '_blank')}
                        className="frosted-card p-5 rounded-2xl border border-white/5 hover:border-amber-400/40 transition-all group cursor-pointer flex flex-col"
                      >
                        <div className="flex-grow space-y-4">
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Veranstaltet von Open Pipe Club</p>
                          <h3 className="text-white font-bold text-lg uppercase">{typeof e.title === 'object' ? e.title.name : e.title}</h3>
                          
                          <div className="space-y-3 text-xs">
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full bg-slate-500 mr-3"></div>
                              <div>
                                <p className="text-slate-500 uppercase font-semibold text-[10px]">Abfahrt</p>
                                <p className="text-white font-bold">{e.start_city || 'TBA'}</p>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full bg-amber-400 mr-3"></div>
                              <div>
                                <p className="text-slate-500 uppercase font-semibold text-[10px]">Ziel</p>
                                <p className="text-white font-bold">{e.end_city || 'TBA'}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-white/10 mt-4 pt-4 text-xs space-y-2">
                          <div className="flex justify-between">
                            <p className="text-slate-500 uppercase font-semibold text-[10px]">Zeitplan</p>
                            <p className="text-white font-medium">{new Date(e.start_date).toLocaleDateString("de-DE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} Uhr</p>
                          </div>
                          <div className="flex justify-between">
                            <p className="text-slate-500 uppercase font-semibold text-[10px]">Kategorie</p>
                            <p className="text-white font-bold uppercase">{e.category || 'Convoy'}</p>
                          </div>
                        </div>
                        
                        <button 
                          onClick={(ev) => {
                            ev.stopPropagation();
                            window.open(`https://www.openpipeclub.com/events/${e.slug || (typeof e.title === 'object' ? e.title.name : e.title).toLowerCase().replace(/\s+/g, '-')}`, '_blank');
                          }}
                          className="w-full mt-4 bg-amber-400 text-black text-xs font-bold uppercase py-3 rounded-lg hover:bg-amber-500 transition-colors flex items-center justify-center gap-2"
                        >
                          More Details <ArrowRight className="w-3 h-3" />
                        </button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Latest News */}
              <motion.div
                initial={{ opacity: 1, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.07 }}
                className="lg:col-span-2"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-4 bg-amber-400 rounded-full" />
                    <h2 className="font-unbounded text-sm font-bold text-amber-400 uppercase tracking-widest">Neueste News</h2>
                  </div>
                  <motion.button
                    onClick={() => onNavigate('news')}
                    whileHover={{ x: 3 }}
                    className="text-xs text-amber-400 font-bold uppercase tracking-widest hover:underline flex items-center gap-1"
                  >
                    Alle <ArrowRight className="w-3 h-3" />
                  </motion.button>
                </div>
                {news.length === 0 ? (
                  <div className="h-40 flex items-center justify-center border-2 border-dashed border-white/10 rounded-xl text-slate-500 text-xs font-bold">Keine News</div>
                ) : (
                  <motion.div className="space-y-3" variants={staggerContainer} initial="hidden" animate="show">
                    {news.map(n => (
                      <motion.div
                        key={n.id}
                        variants={staggerChild}
                        onClick={() => onNavigate('news')}
                        whileHover={{ y: -3, scale: 1.015 }}
                        whileTap={{ scale: 0.99 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="frosted-card flex items-center gap-4 p-4 rounded-2xl border border-white/5 hover:border-amber-400/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.06)] transition-all group cursor-pointer"
                      >
                        <motion.div
                          className="p-3 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors"
                          whileHover={{ rotate: 8, scale: 1.1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 12 }}
                        >
                          <Package className="w-5 h-5 text-emerald-400" />
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-bold truncate mb-1">
                            {n.title}
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {new Date(n.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })} • {n.author || "Team"}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;