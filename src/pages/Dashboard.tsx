import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Briefcase, Route, Coins, Calendar, Truck, ArrowRight, MapPin, Monitor } from 'lucide-react';
import { apiService } from '../services/api';
import { getAvatarUrl } from '../config';

interface KpiProps {
  icon: any;
  label: string;
  value: string | number | undefined;
  color?: string;
  delay?: number;
}

const KpiCard = ({ icon: Icon, label, value, color = "#22D1EE", delay = 0 }: KpiProps) => (
  <motion.div
    initial={{ opacity: 0, y: 30, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ type: "spring", stiffness: 180, damping: 18, delay }}
    whileHover={{ y: -4, scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    className="glass-card group transition-colors relative overflow-hidden cursor-default"
  >
    {/* Colorful Top Accent Border */}
    <div
      className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl transition-all duration-300 group-hover:h-[4px]"
      style={{ backgroundColor: color }}
    />

    <div className="flex items-center gap-2.5 mb-3">
      <motion.div
        className="p-2.5 rounded-xl"
        style={{ backgroundColor: `${color}15` }}
        whileHover={{ scale: 1.15, rotate: 8 }}
        transition={{ type: "spring", stiffness: 300, damping: 12 }}
      >
        <Icon className="w-4.5 h-4.5" style={{ color }} />
      </motion.div>
      <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">{label}</span>
    </div>
    <div
      className="font-unbounded text-2xl font-bold text-white tracking-tighter transition-all duration-300 text-glow-hover"
      style={{ '--glow-color': `${color}55` } as React.CSSProperties}
    >
      {typeof value === "number" ? value.toLocaleString("de-DE") : value ?? "--"}
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
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 20 } }
};

const Dashboard = ({ onViewProfile, onNavigate, telemetry }: { onViewProfile: (id: string | number) => void; onNavigate: (page: string) => void, telemetry?: any }) => {
  const [stats, setStats] = useState<any>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      apiService.getStats().then(r => setStats(r.data)),
      apiService.getDashboard().then(r => {
        const data = r.data;
        const members = data?.member_chart || [];
        const totalRevenue = members.reduce((s: number, m: any) => s + (m.revenue || 0), 0);
        const totalKm = members.reduce((s: number, m: any) => s + (m.distance_km || 0), 0);
        const totalJobs = members.reduce((s: number, m: any) => s + (m.jobs_count || 0), 0);
        setDashboard({ ...data, totalRevenue, totalKm, totalJobs });
      }),
      Promise.all([
        apiService.getEvents().catch(() => ({ data: [] })),
        apiService.getCustomEvents().catch(() => ({ data: [] }))
      ]).then(([res1, res2]) => {
        const all = [
          ...(Array.isArray(res1.data) ? res1.data : []),
          ...(Array.isArray(res2.data) ? res2.data : [])
        ];
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const sorted = all
          .filter(e => e.start_date && new Date(e.start_date) >= startOfToday)
          .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
        setEvents(sorted.slice(0, 4));
      }),
      apiService.getRecentJobs().then(r => {
        setRecentJobs(Array.isArray(r.data) ? r.data : []);
      }),
      apiService.getNews().then(r => {
        const data = Array.isArray(r.data) ? r.data : [];
        setNews(data.slice(0, 1));
      })
    ]).finally(() => {
      setLoading(false);
    });
  }, []);

  const isGameRunning = telemetry && !telemetry.error;
  const hasData = isGameRunning && telemetry.gameVersion > 0;

  const displayJobs = stats?.jobs || stats?.total_jobs || dashboard?.totalJobs || 0;
  const displayKm = stats?.distance || stats?.total_driven_distance_km || dashboard?.totalKm || 0;
  const displayRev = stats?.revenue || stats?.total_revenue || dashboard?.totalRevenue || 0;

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="font-unbounded text-2xl font-bold text-white tracking-tight">Dashboard</h1>
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
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest bg-[#000000] px-3 py-1.5 rounded-lg border border-white/5">Live Data</div>
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
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="animate-pulse bg-white/5 border border-white/5 rounded-2xl h-24" />
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column Skeletons */}
              <div className="space-y-6">
                <div className="glass-card hover-glow h-[240px] flex flex-col justify-between">
                  <div className="animate-pulse bg-white/5 rounded h-4 w-32" />
                  <div className="animate-pulse bg-white/5 rounded-2xl h-32" />
                </div>
                <div className="glass-card hover-glow h-[180px] flex flex-col justify-between">
                  <div className="animate-pulse bg-white/5 rounded h-4 w-32" />
                  <div className="animate-pulse bg-white/5 rounded-2xl h-24" />
                </div>
              </div>

              {/* Right Column Skeletons */}
              <div className="glass-card hover-glow h-full min-h-[440px] flex flex-col justify-between">
                <div className="animate-pulse bg-white/5 rounded h-4 w-32" />
                <div className="space-y-3 flex-1 mt-6">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="animate-pulse bg-white/5 border border-white/5 rounded-2xl h-16" />
                  ))}
                </div>
              </div>
            </div>

            {/* Map banner skeleton */}
            <div className="animate-pulse bg-white/5 border border-white/5 rounded-2xl h-16" />

            {/* Overlay banner skeleton */}
            <div className="animate-pulse bg-white/5 border border-white/5 rounded-2xl h-16" />

            {/* Recent Jobs Skeletons */}
            <div className="glass-card hover-glow">
              <div className="animate-pulse bg-white/5 rounded h-4 w-32 mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse bg-white/5 border border-white/5 rounded-2xl h-24" />
                ))}
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
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard icon={Users} label="Mitglieder" value={stats?.members ?? (dashboard?.member_chart?.length || 0)} delay={0.02} />
              <KpiCard icon={Briefcase} label="Jobs" value={displayJobs.toLocaleString("de-DE")} color="#0EA5E9" delay={0.04} />
              <KpiCard icon={Route} label="Gesamt km" value={displayKm ? `${Math.round(displayKm / 1000)}k` : '0k'} color="#06B6D4" delay={0.06} />
              <KpiCard icon={Coins} label="Umsatz" value={displayRev ? (displayRev >= 1000000 ? `${(displayRev / 1000000).toFixed(1)}M` : `${Math.round(displayRev / 1000)}k`) : '0k'} color="#10b981" delay={0.08} />
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Events & News */}
              <div className="space-y-6">
                {/* Upcoming Events */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.05 }}
                  className="glass-card hover-glow"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-unbounded text-xs font-bold text-white uppercase tracking-widest">Nächste Termine</h2>
                    <motion.button
                      onClick={() => onNavigate('events')}
                      whileHover={{ x: 3 }}
                      className="text-[10px] text-[#22D1EE] font-bold uppercase tracking-widest hover:underline flex items-center gap-1"
                    >
                      Alle <ArrowRight className="w-3 h-3" />
                    </motion.button>
                  </div>
                  {events.length === 0 ? (
                    <div className="h-40 flex items-center justify-center border-2 border-dashed border-white/5 rounded-2xl text-slate-600 text-xs font-bold">Keine Termine</div>
                  ) : (
                    <motion.div className="space-y-3" variants={staggerContainer} initial="hidden" animate="show">
                      {events.map(e => (
                        <motion.div
                          key={e.id}
                          variants={staggerChild}
                          onClick={() => onNavigate('events')}
                          whileHover={{ y: -3, scale: 1.015, borderColor: "rgba(43, 161, 185, 0.25)" }}
                          whileTap={{ scale: 0.99 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          className="flex items-center gap-4 p-4 rounded-2xl bg-black border border-white/[0.08] transition-colors group cursor-pointer"
                        >
                          <motion.div
                            className="p-3 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors"
                            whileHover={{ rotate: 8, scale: 1.1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 12 }}
                          >
                            <Calendar className="w-5 h-5 text-amber-400" />
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-bold truncate mb-1">
                              {typeof e.title === 'object' ? e.title.name : e.title}
                            </p>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {new Date(e.start_date).toLocaleDateString("de-DE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} Uhr
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </motion.div>

                {/* Latest News */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.07 }}
                  className="glass-card hover-glow"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-unbounded text-xs font-bold text-white uppercase tracking-widest">Neueste News</h2>
                    <motion.button
                      onClick={() => onNavigate('news')}
                      whileHover={{ x: 3 }}
                      className="text-[10px] text-[#22D1EE] font-bold uppercase tracking-widest hover:underline flex items-center gap-1"
                    >
                      Alle <ArrowRight className="w-3 h-3" />
                    </motion.button>
                  </div>
                  {news.length === 0 ? (
                    <div className="h-40 flex items-center justify-center border-2 border-dashed border-white/5 rounded-2xl text-slate-600 text-xs font-bold">Keine News</div>
                  ) : (
                    <motion.div className="space-y-3" variants={staggerContainer} initial="hidden" animate="show">
                      {news.map(n => (
                        <motion.div
                          key={n.id}
                          variants={staggerChild}
                          onClick={() => onNavigate('news')}
                          whileHover={{ y: -3, scale: 1.015, borderColor: "rgba(43, 161, 185, 0.25)" }}
                          whileTap={{ scale: 0.99 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          className="flex items-center gap-4 p-4 rounded-2xl bg-black border border-white/[0.08] transition-colors group cursor-pointer"
                        >
                          <motion.div
                            className="p-3 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors"
                            whileHover={{ rotate: 8, scale: 1.1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 12 }}
                          >
                            <Truck className="w-5 h-5 text-emerald-400" />
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

              {/* Right Column: Top Drivers */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.09 }}
                className="glass-card hover-glow"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-unbounded text-xs font-bold text-white uppercase tracking-widest">Top Fahrer</h2>
                  <motion.button
                    onClick={() => onNavigate('statistiken')}
                    whileHover={{ x: 3 }}
                    className="text-[10px] text-[#22D1EE] font-bold uppercase tracking-widest hover:underline flex items-center gap-1"
                  >
                    Stats <ArrowRight className="w-3 h-3" />
                  </motion.button>
                </div>
                <motion.div className="space-y-3" variants={staggerContainer} initial="hidden" animate="show">
                  {(dashboard?.top_drivers || [1, 2, 3]).map((d: any, i: number) => (
                    <motion.div
                      key={d.id || i}
                      variants={staggerChild}
                      onClick={() => d.id && onViewProfile(d.id)}
                      whileHover={{ y: -3, scale: 1.015, borderColor: "rgba(43, 161, 185, 0.25)" }}
                      whileTap={{ scale: 0.99 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-black border border-white/[0.08] transition-colors group cursor-pointer"
                    >
                      <motion.span
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black text-white ${i === 0 ? "bg-amber-500" : i === 1 ? "bg-slate-400" : "bg-amber-700"}`}
                        whileHover={{ scale: 1.15, rotate: -8 }}
                        transition={{ type: "spring", stiffness: 350, damping: 12 }}
                      >
                        {d.rank || i + 1}
                      </motion.span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-bold truncate mb-1">{d.name || "Lädt..."}</p>
                        <p className="text-[11px] text-slate-500 font-medium">{d.role || "Fahrer"}</p>
                      </div>
                      <span className="text-sm font-black text-emerald-400 tracking-tighter italic">
                        {d.total_revenue ? `${(d.total_revenue / 1000).toFixed(0)}k $` : "--"}
                      </span>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            </div>

            {/* Map Banner */}
            <motion.div
              onClick={() => onNavigate('map')}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
              whileHover={{ y: -3, scale: 1.008 }}
              whileTap={{ scale: 0.995 }}
              className="glass-card hover-glow flex items-center justify-between !py-4 group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <motion.div whileHover={{ scale: 1.15, rotate: 12 }} transition={{ type: "spring", stiffness: 300, damping: 12 }}>
                  <MapPin className="w-5 h-5 text-primary" />
                </motion.div>
                <div>
                  <h2 className="font-unbounded text-xs font-bold text-white group-hover:text-primary transition-colors uppercase tracking-wider">Live Karte</h2>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">Fahrer in Echtzeit auf der Route verfolgen</p>
                </div>
              </div>
              <motion.div
                initial={{ x: 0 }}
                whileHover={{ x: 4 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                <ArrowRight className="w-4 h-4 text-primary" />
              </motion.div>
            </motion.div>

            {/* Overlay Banner */}
            <motion.div
              onClick={() => onNavigate('overlay-settings')}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.12 }}
              whileHover={{ y: -3, scale: 1.008 }}
              whileTap={{ scale: 0.995 }}
              className="glass-card hover-glow flex items-center justify-between !py-4 group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <motion.div whileHover={{ scale: 1.15, rotate: 12 }} transition={{ type: "spring", stiffness: 300, damping: 12 }}>
                  <Monitor className="w-5 h-5 text-primary" />
                </motion.div>
                <div>
                  <h2 className="font-unbounded text-xs font-bold text-white group-hover:text-primary transition-colors uppercase tracking-wider">ETS2 In-Game Overlay</h2>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">Transparentes, modulares Telemetrie-Overlay direkt im Spiel anzeigen und anpassen</p>
                </div>
              </div>
              <motion.div
                initial={{ x: 0 }}
                whileHover={{ x: 4 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                <ArrowRight className="w-4 h-4 text-primary" />
              </motion.div>
            </motion.div>

            {/* Recent Jobs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.14 }}
              className="glass-card hover-glow group transition-colors"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-unbounded text-xs font-bold text-white uppercase tracking-widest">Letzte Jobs</h2>
                <Truck className="w-4 h-4 text-slate-600" />
              </div>
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                variants={staggerContainer}
                initial="hidden"
                animate="show"
              >
                {recentJobs.slice(0, 6).map((job, i) => (
                  <motion.div
                    key={i}
                    variants={staggerChild}
                    onClick={() => job.driver_id && onViewProfile(job.driver_id)}
                    whileHover={{ y: -3, scale: 1.015, borderColor: "rgba(43, 161, 185, 0.25)" }}
                    whileTap={{ scale: 0.99 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="flex items-start gap-4 p-4 rounded-2xl bg-black border border-white/[0.08] transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-black border border-white/5 flex items-center justify-center shrink-0 overflow-hidden">
                      {getAvatarUrl(job.driver_avatar) ? <img src={getAvatarUrl(job.driver_avatar)!} className="w-full h-full object-cover" /> : <Truck className="w-5 h-5 text-slate-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate mb-1">{job.driver_name}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium truncate mb-2">
                        <MapPin className="w-2.5 h-2.5" />
                        {job.source_city_name} → {job.destination_city_name}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-tighter italic">
                        <span className="text-emerald-400">{Math.round(job.revenue || 0).toLocaleString()} $</span>
                        <span className="text-slate-400">{Math.round(job.driven_distance_km || 0)} KM</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


export default Dashboard;