import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, BarChart3, Loader2, TrendingUp, Users, Route, Coins, FileText, ChevronRight, Activity, UserCheck, UserX, Clock, Calendar, Eye, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { apiService } from '../services/api';
import { getAvatarUrl } from '../config';

const Reports = () => {
  const { token } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [weeklyReport, setWeeklyReport] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [view, setView] = useState<'current' | 'archive'>('current');
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const viewReportDetails = async (reportId: string) => {
    setLoadingReport(true);
    try {
      const res = await apiService.getReportDetails(reportId);
      setSelectedReport(res.data);
    } catch {
      toast.error("Fehler beim Laden des Berichts");
    } finally {
      setLoadingReport(false);
    }
  };

  const loadData = async () => {
    try {
      const [r, s, w] = await Promise.all([
        apiService.getReports(),
        apiService.getStats(),
        apiService.getWeeklyReport()
      ]);
      setReports(Array.isArray(r.data) ? r.data : []);
      setStats(s.data);
      setWeeklyReport(w.data);
    } catch (err) {
      console.error("Failed to load reports", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [token]);

  const exportReport = async (reportId: string, format: 'csv' | 'pdf') => {
    setExporting(true);
    try {
      const r = await apiService.exportReport(reportId, format);
      const blob = format === 'pdf' ? r.data : new Blob([r.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-${reportId}.${format}`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} Report exportiert`);
    } catch { 
      toast.error("Fehler beim Export"); 
    } finally { 
      setExporting(false); 
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
      <p className="text-slate-500 font-unbounded text-[10px] font-bold uppercase tracking-widest animate-pulse">Lade Berichte...</p>
    </div>
  );

  return (
    <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-unbounded text-2xl font-bold text-white tracking-tight italic">Berichte</h1>
          <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest">Wöchentliche Auswertung & Archiv</p>
        </div>
        
        <div className="flex items-center gap-1 bg-[#000000] p-1 rounded-xl border border-white/5">
          <button 
            onClick={() => setView('current')} 
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all hover-glow ${view === 'current' ? 'bg-primary text-black' : 'text-slate-500 hover:text-white'}`}
          >
            Aktuell
          </button>
          <button 
            onClick={() => setView('archive')} 
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all hover-glow ${view === 'archive' ? 'bg-primary text-black' : 'text-slate-500 hover:text-white'}`}
          >
            Archiv
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'current' ? (
          <motion.div 
            key="current"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* Weekly KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card flex items-center gap-4 hover-glow transition-all">
                <div className="p-3 rounded-xl bg-primary/10"><Users className="w-5 h-5 text-primary" /></div>
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Gesamt</p>
                  <p className="text-xl font-black text-white">{weeklyReport?.total_members || stats?.members || "0"}</p>
                </div>
              </div>
              <div className="glass-card flex items-center gap-4 hover-glow transition-all">
                <div className="p-3 rounded-xl bg-emerald-500/10"><UserCheck className="w-5 h-5 text-emerald-400" /></div>
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Aktiv (7d)</p>
                  <p className="text-xl font-black text-emerald-400">{weeklyReport?.active_members || "0"}</p>
                </div>
              </div>
              <div className="glass-card flex items-center gap-4 hover-glow transition-all">
                <div className="p-3 rounded-xl bg-red-500/10"><UserX className="w-5 h-5 text-red-400" /></div>
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Inaktiv</p>
                  <p className="text-xl font-black text-red-400">{weeklyReport?.inactive_members || "0"}</p>
                </div>
              </div>
              <div className="glass-card flex items-center gap-4 hover-glow transition-all">
                <div className="p-3 rounded-xl bg-amber-500/10"><Coins className="w-5 h-5 text-amber-400" /></div>
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Gesamt $</p>
                  <p className="text-xl font-black text-white">{weeklyReport?.total_revenue ? `${(weeklyReport.total_revenue / 1000).toFixed(0)}k` : stats?.revenue ? `${(stats.revenue / 1000).toFixed(0)}k` : "0"}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Activity Chart */}
              <div className="lg:col-span-2 glass-card hover-glow transition-all">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="font-unbounded text-xs font-bold text-white uppercase tracking-widest italic">Aktivitäts-Trend</h3>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-tighter">Letzte 7 Tage • Erledigte Jobs</p>
                  </div>
                  <Activity className="text-primary w-4 h-4 opacity-50" />
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.weekly_activity || [
                      { day: 'Mo', jobs: 12 }, { day: 'Di', jobs: 19 }, { day: 'Mi', jobs: 15 },
                      { day: 'Do', jobs: 22 }, { day: 'Fr', jobs: 30 }, { day: 'Sa', jobs: 25 }, { day: 'So', jobs: 18 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} dy={10} />
                      <YAxis hide />
                      <Tooltip 
                        cursor={{ fill: '#ffffff05' }}
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '10px' }}
                      />
                      <Bar dataKey="jobs" radius={[4, 4, 0, 0]} barSize={40}>
                        { [1,2,3,4,5,6,7].map((_, i) => <Cell key={i} fill={i === 4 ? '#22D1EE' : '#22D1EE30'} />) }
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Driver Activity Table */}
              <div className="glass-card overflow-hidden !p-0 flex flex-col h-[400px]">
                <div className="p-5 border-b border-white/5 flex items-center justify-between bg-black/80">
                  <h3 className="font-unbounded text-[10px] font-black text-white uppercase tracking-widest italic">Fahrer-Aktivität</h3>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 border border-primary/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[8px] font-black text-primary uppercase tracking-tighter">Live</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-white/5">
                  {(weeklyReport?.members || []).map((m: any) => (
                    <div key={m.id} className="p-4 hover:bg-black/60 transition-colors flex items-center justify-between hover-glow">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-black border border-white/5 overflow-hidden">
                          {getAvatarUrl(m.avatar_url) ? <img src={getAvatarUrl(m.avatar_url)!} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-primary/20" />}
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-white leading-none mb-1">{m.name}</p>
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${m.active ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"}`}>
                            {m.active ? "Aktiv" : "Inaktiv"}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] font-black text-white italic">{Math.round(m.total_km).toLocaleString()} KM</p>
                        <div className="flex items-center justify-end gap-3 mt-1">
                          <span className="text-[9px] font-bold text-emerald-500/80 tracking-tighter">{Math.round(m.total_revenue || 0).toLocaleString()} $</span>
                          <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                            <Clock size={10} className="text-slate-600" />
                            {m.last_job_days !== null ? `${m.last_job_days}d` : "Nie"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!weeklyReport?.members || weeklyReport.members.length === 0) && (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 p-10 text-center">
                      <Users size={32} className="mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-widest leading-tight">Keine Aktivitätsdaten für diese Woche</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="archive"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-unbounded text-xs font-bold text-white uppercase tracking-widest italic">Gespeicherte Berichte</h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Archiviert für 12 Monate</p>
            </div>

            {reports.length === 0 ? (
              <div className="glass-card flex flex-col items-center justify-center py-20 opacity-30 border-dashed border-2">
                <Calendar size={48} className="mb-4" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Keine archivierten Reports gefunden</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {reports.map((rep: any) => (
                  <motion.div 
                    key={rep.id} 
                    className="glass-card flex items-center justify-between group hover:border-white/20 transition-all hover-glow"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-black border border-white/5 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                        <FileText size={24} className="text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-white mb-1">{rep.title}</h4>
                        <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider flex-wrap">
                          <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-slate-400">{rep.type}</span>
                          <span>Zeitraum: {rep.period}</span>
                          {rep.created_at && <span>Erstellt: {new Date(rep.created_at).toLocaleDateString("de-DE")}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button 
                        onClick={() => viewReportDetails(rep.id)}
                        disabled={loadingReport}
                        className="flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary hover:bg-white/5 rounded-xl transition-all disabled:opacity-50 hover-glow"
                      >
                        {loadingReport ? <Loader2 size={12} className="animate-spin" /> : <><Eye size={12} /> Ansehen</>}
                      </button>
                      <button 
                        onClick={() => exportReport(rep.id, 'csv')}
                        disabled={exporting}
                        className="flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary hover:bg-white/5 rounded-xl transition-all disabled:opacity-50 hover-glow"
                      >
                        {exporting ? <Loader2 size={12} className="animate-spin" /> : <><Download size={12} /> CSV</>}
                      </button>
                      <button 
                        onClick={() => exportReport(rep.id, 'pdf')}
                        disabled={exporting}
                        className="flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary hover:bg-white/5 rounded-xl transition-all disabled:opacity-50 border border-transparent hover:border-primary/20 hover-glow"
                      >
                        {exporting ? <Loader2 size={12} className="animate-spin" /> : <><Download size={12} /> PDF</>}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-black/90 border border-white/10 rounded-2xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col backdrop-blur-md"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                <div>
                  <h3 className="font-unbounded text-xs font-black text-white uppercase tracking-tight italic">{selectedReport.title}</h3>
                  <p className="text-[9px] text-primary font-black uppercase tracking-widest italic mt-1">{selectedReport.period}</p>
                </div>
                <button 
                  onClick={() => setSelectedReport(null)}
                  className="p-2 text-slate-500 hover:text-white bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Driver Stats Table */}
              <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
                {selectedReport.members.length === 0 ? (
                  <div className="py-20 text-center opacity-30">
                    <Users size={36} className="mx-auto mb-2 text-slate-600" />
                    <p className="text-[10px] font-black uppercase tracking-widest italic">Keine Fahrer-Aktivitäten in dieser Woche</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-[9px] font-black text-slate-500 uppercase tracking-widest italic">
                          <th className="pb-3">Fahrer</th>
                          <th className="pb-3 text-center">Jobs</th>
                          <th className="pb-3 text-right">Strecke</th>
                          <th className="pb-3 text-right">Umsatz</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {selectedReport.members.map((m: any, idx: number) => (
                          <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                            <td className="py-4 text-[11px] font-black text-white italic uppercase">{m.name}</td>
                            <td className="py-4 text-[10px] font-bold text-center text-slate-400">{m.jobs_count}</td>
                            <td className="py-4 text-[10px] font-black text-right text-white italic">{Math.round(m.total_km).toLocaleString()} KM</td>
                            <td className="py-4 text-[10px] font-black text-right text-emerald-400 italic">{Math.round(m.total_revenue).toLocaleString()} $</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Reports;
