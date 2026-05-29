import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="glass-card hover-glow group transition-all"
  >
    <div className="flex items-center gap-2.5 mb-3">
      <div className="p-2 rounded-xl" style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">{label}</span>
    </div>
    <div className="font-unbounded text-2xl font-bold text-white tracking-tighter">
      {typeof value === "number" ? value.toLocaleString("de-DE") : value ?? "--"}
    </div>
  </motion.div>
);

const Dashboard = ({ onViewProfile, onNavigate, telemetry }: { onViewProfile: (id: string | number) => void; onNavigate: (page: string) => void, telemetry?: any }) => {
  const [stats, setStats] = useState<any>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  useEffect(() => {
    apiService.getStats().then(r => setStats(r.data)).catch(() => {});
    apiService.getDashboard().then(r => {
      const data = r.data;
      const members = data?.member_chart || [];
      const totalRevenue = members.reduce((s: number, m: any) => s + (m.revenue || 0), 0);
      const totalKm = members.reduce((s: number, m: any) => s + (m.distance_km || 0), 0);
      const totalJobs = members.reduce((s: number, m: any) => s + (m.jobs_count || 0), 0);
      setDashboard({ ...data, totalRevenue, totalKm, totalJobs });
    }).catch(() => {});
    Promise.all([
      apiService.getEvents(),
      apiService.getCustomEvents()
    ]).then(([res1, res2]) => {
      const all = [
        ...(Array.isArray(res1.data) ? res1.data : []),
        ...(Array.isArray(res2.data) ? res2.data : [])
      ];
      // Sortiere nach Datum (aufsteigend) und nimm nur zukünftige
      const sorted = all
        .filter(e => new Date(e.start_date) >= new Date())
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
      setEvents(sorted.slice(0, 4));
    }).catch(() => {});
    apiService.getRecentJobs().then(r => {
      setRecentJobs(Array.isArray(r.data) ? r.data : []);
    }).catch(() => {});
    apiService.getNews().then(r => {
      const data = Array.isArray(r.data) ? r.data : [];
      setNews(data.slice(0, 1));
    }).catch(() => {});
  }, []);

  const isGameRunning = telemetry && !telemetry.error;
  const hasData = isGameRunning && telemetry.gameVersion > 0;

  // Fallback values from either stats object or pre-calculated dashboard totals
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

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users} label="Mitglieder" value={stats?.members ?? (dashboard?.member_chart?.length || 0)} delay={0.1} />
        <KpiCard icon={Briefcase} label="Jobs" value={displayJobs.toLocaleString("de-DE")} color="#0EA5E9" delay={0.2} />
        <KpiCard icon={Route} label="Gesamt km" value={displayKm ? `${Math.round(displayKm / 1000)}k` : '0k'} color="#06B6D4" delay={0.3} />
        <KpiCard icon={Coins} label="Umsatz" value={displayRev ? (displayRev >= 1000000 ? `${(displayRev / 1000000).toFixed(1)}M` : `${Math.round(displayRev / 1000)}k`) : '0k'} color="#10b981" delay={0.4} />
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Events & News */}
        <div className="space-y-6">
          {/* Upcoming Events */}
          <div className="glass-card hover-glow">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-unbounded text-xs font-bold text-white uppercase tracking-widest">Nächste Termine</h2>
              <button onClick={() => onNavigate('events')} className="text-[10px] text-[#22D1EE] font-bold uppercase tracking-widest hover:underline flex items-center gap-1">
                Alle <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {events.length === 0 ? (
              <div className="h-40 flex items-center justify-center border-2 border-dashed border-white/5 rounded-2xl text-slate-600 text-xs font-bold">Keine Termine</div>
            ) : (
              <div className="space-y-3">
                {events.map(e => (
                  <div 
                    key={e.id} 
                    onClick={() => onNavigate('events')}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-black/80 border border-white/5 hover:border-[#2ba1b9]/30 transition-all group cursor-pointer"
                  >
                    <div className="p-3 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                      <Calendar className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-bold truncate mb-1">
                        {typeof e.title === 'object' ? e.title.name : e.title}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {new Date(e.start_date).toLocaleDateString("de-DE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} Uhr
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Latest News */}
          <div className="glass-card hover-glow">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-unbounded text-xs font-bold text-white uppercase tracking-widest">Neueste News</h2>
              <button onClick={() => onNavigate('news')} className="text-[10px] text-[#22D1EE] font-bold uppercase tracking-widest hover:underline flex items-center gap-1">
                Alle <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {news.length === 0 ? (
              <div className="h-40 flex items-center justify-center border-2 border-dashed border-white/5 rounded-2xl text-slate-600 text-xs font-bold">Keine News</div>
            ) : (
              <div className="space-y-3">
                {news.map(n => (
                  <div 
                    key={n.id} 
                    onClick={() => onNavigate('news')}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-black/80 border border-white/5 hover:border-[#2ba1b9]/30 transition-all group cursor-pointer"
                  >
                    <div className="p-3 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                      <Truck className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-bold truncate mb-1">
                        {n.title}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {new Date(n.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })} • {n.author || "Team"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Top Drivers */}
        <div className="glass-card hover-glow">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-unbounded text-xs font-bold text-white uppercase tracking-widest">Top Fahrer</h2>
            <button onClick={() => onNavigate('statistiken')} className="text-[10px] text-[#22D1EE] font-bold uppercase tracking-widest hover:underline flex items-center gap-1">
              Stats <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3">
            {(dashboard?.top_drivers || [1,2,3]).map((d: any, i: number) => (
              <div 
                key={d.id || i} 
                onClick={() => d.id && onViewProfile(d.id)}
                className="flex items-center gap-4 p-4 rounded-2xl bg-black/80 border border-white/5 hover:border-[#2ba1b9]/30 transition-all group cursor-pointer"
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black text-white ${i === 0 ? "bg-amber-500" : i === 1 ? "bg-slate-400" : "bg-amber-700"}`}>
                  {d.rank || i+1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-bold truncate mb-1">{d.name || "Lädt..."}</p>
                  <p className="text-[11px] text-slate-500 font-medium">{d.role || "Fahrer"}</p>
                </div>
                <span className="text-sm font-black text-emerald-400 tracking-tighter italic">
                  {d.total_revenue ? `${(d.total_revenue / 1000).toFixed(0)}k $` : "--"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map Banner */}
      <div 
        onClick={() => onNavigate('map')}
        className="glass-card hover-glow flex items-center justify-between !py-4 group cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-primary group-hover:scale-110 transition-transform duration-300" />
          <div>
            <h2 className="font-unbounded text-xs font-bold text-white group-hover:text-primary transition-colors uppercase tracking-wider">Live Karte</h2>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Fahrer in Echtzeit auf der Route verfolgen</p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform duration-300" />
      </div>

      {/* Overlay Banner */}
      <div 
        onClick={() => onNavigate('overlay-settings')}
        className="glass-card hover-glow flex items-center justify-between !py-4 group cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <Monitor className="w-5 h-5 text-primary group-hover:scale-110 transition-transform duration-300" />
          <div>
            <h2 className="font-unbounded text-xs font-bold text-white group-hover:text-primary transition-colors uppercase tracking-wider">ETS2 In-Game Overlay</h2>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Transparentes, modulares Telemetrie-Overlay direkt im Spiel anzeigen und anpassen</p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform duration-300" />
      </div>

      {/* Recent Jobs */}
      <div className="glass-card hover-glow group transition-all">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-unbounded text-xs font-bold text-white uppercase tracking-widest">Letzte Jobs</h2>
          <Truck className="w-4 h-4 text-slate-600" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentJobs.slice(0, 6).map((job, i) => (
            <div 
              key={i} 
              onClick={() => job.driver_id && onViewProfile(job.driver_id)}
              className="flex items-start gap-4 p-4 rounded-2xl bg-black/80 border border-white/5 hover:border-[#2ba1b9]/30 transition-all cursor-pointer"
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


export default Dashboard;
