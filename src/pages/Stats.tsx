import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Route, Weight, Coins, Briefcase, Award } from 'lucide-react';
import { apiService } from '../services/api';
import { getAvatarUrl } from '../config';

const CYAN = "#f59e0b";
const AMBER = "#f59e0b";
const EMERALD = "#10b981";
const PURPLE = "#8b5cf6";
const PIE_COLORS = [CYAN, "#0EA5E9", AMBER, EMERALD, PURPLE, "#ec4899"];

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#000000] border-2 border-[#f59e0b]/20 rounded-xl px-3 py-2 text-[10px]">
      <p className="text-white font-bold mb-1 uppercase tracking-wider">{label}</p>
      {payload.map((e: any, i: number) => (
        <p key={i} style={{ color: e.color }} className="font-medium">
          {e.name}: {typeof e.value === "number" ? e.value.toLocaleString("de-DE") : e.value}
        </p>
      ))}
    </div>
  );
};

const KpiCard = ({ icon: Icon, label, value, sub, color = CYAN }: any) => (
  <div className="frosted-card shadow-lg border border-white/5 group">
    <div className="flex items-center gap-2.5 mb-3">
      <div className="p-2 rounded-xl" style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{label}</span>
    </div>
    <div className="font-unbounded text-xl font-bold text-white tracking-tighter">{value}</div>
    {sub && <p className="text-[10px] text-slate-500 mt-1 font-medium">{sub}</p>}
  </div>
);

const Stats = () => {
  const [data, setData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      apiService.getDashboard(),
      apiService.getStats(),
      apiService.getTeam()
    ]).then(([dRes, sRes, tRes]) => {
      const dash = dRes.data;
      const teamData = tRes.data?.data || tRes.data || [];

      const rawMemberList = (dash?.member_chart && dash.member_chart.length > 0)
        ? dash.member_chart
        : (Array.isArray(teamData) ? teamData : []);

      // Use mergedStats or direct member total fields for consistent data parity
      const enriched = rawMemberList.map((m: any) => {
        const ms = m.mergedStats || {};
        return {
          ...m,
          name: m.name || m.username || "Fahrer",
          jobs_count: ms.jobs ?? m.total_jobs ?? m.jobs_count ?? m.jobs ?? 0,
          revenue: ms.revenue ?? m.total_revenue ?? m.revenue ?? 0,
          distance_km: ms.distance ?? m.total_driven_distance_km ?? m.distance_km ?? 0,
          cargo_mass_t: ms.cargo ?? m.total_cargo_mass_t ?? m.cargo_mass_t ?? 0,
          level: ms.level ?? m.level ?? 1,
          points: ms.points ?? m.points ?? 0
        };
      });

      setData({ ...dash, member_chart: enriched });
      setStats(sRes.data);
    }).catch(() => { });
  }, []);

  const members = data ? data.member_chart : [];

  const calcRev = members.reduce((s: number, m: any) => s + (m.revenue || 0), 0);
  const calcKm = members.reduce((s: number, m: any) => s + (m.distance_km || 0), 0);
  const calcJobs = members.reduce((s: number, m: any) => s + (m.jobs_count || 0), 0);
  const calcCargo = members.reduce((s: number, m: any) => s + (m.cargo_mass_t || 0), 0);

  const distSorted = [...members].sort((a, b) => b.distance_km - a.distance_km);
  const revSorted = [...members].sort((a, b) => b.revenue - a.revenue);
  const levelSorted = [...members].sort((a, b) => b.level - a.level);

  // Fallback to calculated values if stats from server is missing/zero
  const displayJobs = stats?.jobs || stats?.total_jobs || calcJobs;
  const displayKm = stats?.distance || stats?.total_driven_distance_km || calcKm;
  const displayRev = stats?.revenue || stats?.total_revenue || calcRev;
  const displayCargo = stats?.cargo_mass_t || stats?.total_cargo_mass_t || calcCargo;

  const pie = members.filter((m: any) => m.revenue > 0).map((m: any, i: number) => ({
    name: m.name,
    value: m.revenue,
    fill: PIE_COLORS[i % PIE_COLORS.length],
    pct: calcRev > 0 ? ((m.revenue / calcRev) * 100).toFixed(1) : "0"
  }));

  const abbrev = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return v >= 10_000 ? `${Math.round(v / 1_000)}k` : `${(v / 1_000).toFixed(1)}k`;
    return `${v}`;
  };

  const Chart = ({ title, data: d, dataKey, color, gradId, unit }: any) => (
    <div className="frosted-card border border-white/5 shadow-xl">
      <h3 className="font-unbounded text-xs font-bold text-white mb-6 uppercase tracking-widest">{title}</h3>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={d} margin={{ top: 8, right: 8, left: -8, bottom: 8 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={1} />
                <stop offset="95%" stopColor={color} stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: "#475569", fontSize: 10, fontWeight: 'bold' }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={48}
            />
            <YAxis
              tick={{ fill: "#475569", fontSize: 10, fontWeight: 'bold' }}
              axisLine={false}
              tickLine={false}
              width={44}
              allowDecimals={false}
              domain={[0, (max: number) => Math.ceil(max * 1.1)]}
              tickFormatter={abbrev}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey={dataKey} name={unit} fill={`url(#${gradId})`} radius={[6, 6, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-16">
        <span className="overline text-amber-400 mb-2 inline-block">Analyse</span>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tighter text-white mt-2">VTC Statistiken</h1>
        {data && <p className="text-zinc-400 text-sm mt-3">{stats?.members ?? members.length} Fahrer im Überblick.</p>}
      </div>

      <AnimatePresence mode="wait">
        {!data ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            {/* KPI Skeletons */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="animate-pulse bg-white/5 border border-white/5 rounded-2xl h-24" />
              ))}
            </div>

            {/* Charts Skeletons */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="animate-pulse bg-white/5 border border-white/5 rounded-2xl h-80" />
              <div className="animate-pulse bg-white/5 border border-white/5 rounded-2xl h-80" />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-10"
          >
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-4 bg-amber-400 rounded-full" />
                <h2 className="font-unbounded text-sm font-bold text-amber-400 uppercase tracking-widest">
                  Überblick
                </h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <KpiCard icon={Users} label="Fahrer" value={stats?.members ?? members.length} />
                <KpiCard icon={Briefcase} label="Jobs" value={displayJobs.toLocaleString("de-DE")} color="#0EA5E9" />
                <KpiCard icon={Route} label="Gesamt KM" value={displayKm ? `${Math.round(displayKm / 1000)}k` : '0k'} color={CYAN} />
                <KpiCard icon={Coins} label="Umsatz" value={displayRev ? (displayRev >= 1000000 ? `${(displayRev / 1000000).toFixed(1)}M` : `${Math.round(displayRev / 1000)}k`) : '0k'} color={EMERALD} />
                <KpiCard icon={Weight} label="Fracht" value={`${Math.round(displayCargo).toLocaleString("de-DE")} t`} color={AMBER} />
                <KpiCard icon={Award} label="Max Level" value={levelSorted[0]?.level || 0} color={PURPLE} />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-4 bg-amber-400 rounded-full" />
                <h2 className="font-unbounded text-sm font-bold text-amber-400 uppercase tracking-widest">
                  Leistung pro Fahrer
                </h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Chart title="Kilometer pro Fahrer" data={distSorted.slice(0, 8)} dataKey="distance_km" color={CYAN} gradId="gKm" unit="km" />
                <Chart title="Umsatz pro Fahrer ($)" data={revSorted.slice(0, 8)} dataKey="revenue" color={EMERALD} gradId="gRev" unit="Umsatz" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-4 bg-amber-400 rounded-full" />
                <h2 className="font-unbounded text-sm font-bold text-amber-400 uppercase tracking-widest">
                  Umsatz & Rangliste
                </h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="frosted-card border border-white/5 shadow-xl lg:col-span-1">
                <h3 className="font-unbounded text-xs font-bold text-white mb-6 uppercase tracking-widest text-center">Umsatzverteilung</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" strokeWidth={0}>
                        {pie.map((e: any, i: number) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {pie.slice(0, 4).map((d: any) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-slate-500">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
                      {d.name}
                    </div>
                  ))}
                </div>
              </div>

              <div className="frosted-card border border-white/5 shadow-xl lg:col-span-3">
                <h3 className="font-unbounded text-xs font-bold text-white mb-6 uppercase tracking-widest">Detaillierte Fahrer-Rangliste (Top 10)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] border-b border-white/5">
                        <th className="pb-4">#</th>
                        <th className="pb-4">Fahrer</th>
                        <th className="pb-4 text-right">Jobs</th>
                        <th className="pb-4 text-right">Distanz</th>
                        <th className="pb-4 text-right">Fracht (t)</th>
                        <th className="pb-4 text-right">Umsatz</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {revSorted.slice(0, 10).map((m, i) => (
                        <tr key={i} className="group hover:bg-primary/5 transition-colors">
                          <td className="py-4">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${i === 0 ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'bg-zinc-900 border border-white/5 text-slate-500'}`}>
                              {i + 1}
                            </span>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-xs font-black text-primary overflow-hidden">
                                {getAvatarUrl(m.avatar_url) ? <img src={getAvatarUrl(m.avatar_url)!} className="w-full h-full object-cover" /> : m.name.charAt(0)}
                              </div>
                              <span className="text-sm font-bold text-white italic">{m.name}</span>
                            </div>
                          </td>
                          <td className="py-4 text-right text-xs font-bold text-slate-400">{m.jobs_count || m.jobs || 0}</td>
                          <td className="py-4 text-right text-xs font-bold text-slate-400">{Math.round(m.distance_km).toLocaleString()} km</td>
                          <td className="py-4 text-right text-xs font-bold text-amber-500/80">{Math.round(m.cargo_mass_t || 0).toLocaleString()} t</td>
                          <td className="py-4 text-right text-sm font-black text-emerald-400 italic tracking-tight">{Math.round(m.revenue).toLocaleString()} $</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Stats;

