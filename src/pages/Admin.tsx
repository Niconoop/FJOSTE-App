import { useEffect, useState, useCallback } from 'react';
import { Key, Users, Link2, Unlink, RefreshCw, Trash2, Crown, Loader2, ShieldCheck, ShieldOff, Check, X, Settings as SettingsIcon, User, MapPin, Inbox, BarChart3, Globe, Save, AlertTriangle, Server, Database, ExternalLink, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import Applications from './Applications';
import Reports from './Reports';

import { API_URL, getAvatarUrl } from '../config';

const API = API_URL;

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.04
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 220,
      damping: 24
    }
  }
};

const Admin = ({ onViewProfile, onNavigate }: { onViewProfile: (id: string | number) => void; onNavigate: (page: string) => void }) => {
  const { token, user, isAdmin, hasRole } = useAuth();
  const HR_ROLES = ["hr team", "hr-team", "personal team", "personal-team"];
  const canSeeAdmin = isAdmin || hasRole(HR_ROLES);
  const [tab, setTab] = useState("users");
  const [codes, setCodes] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [linkModal, setLinkModal] = useState<any>(null);
  const [applicationsOpen, setApplicationsOpen] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [editingTmpId, setEditingTmpId] = useState<string | null>(null);
  const [tmpIdDraft, setTmpIdDraft] = useState("");
  const [truckyRoles, setTruckyRoles] = useState<any[]>([]);
  const [roleModal, setRoleModal] = useState<any>(null);
  const [updatingRole, setUpdatingRole] = useState(false);
  const [vtcSettings, setVtcSettings] = useState<any>({
    name: "", motto: "", description: "", rules: "", discord: "", website: "", use_trucky_stats: false, about: "", requirements: ""
  });
  const [savingVtc, setSavingVtc] = useState(false);
  const [deleteModal, setDeleteModal] = useState<any>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [resetPasswordModal, setResetPasswordModal] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  const h = { Authorization: `Bearer ${token}` };

  const loadAll = useCallback(async () => {
    if (!canSeeAdmin) return;

    // Hilfsfunktion für sicheres Laden einzelner Endpunkte
    const safeGet = async (url: string) => {
      try { return (await axios.get(url, { headers: h })).data; }
      catch { return null; }
    };

    const codesData = await safeGet(`${API}/management/invite-codes`);
    if (codesData) setCodes(codesData);

    const usersData = await safeGet(`${API}/management/users`);
    if (usersData) setUsers(usersData);

    const membersData = await safeGet(`${API}/trucky/members`);
    if (membersData) setDrivers(membersData?.data || membersData || []);

    const appData = await safeGet(`${API}/settings/applications`);
    if (appData) setApplicationsOpen(appData.open);

    const rolesData = await safeGet(`${API}/trucky/roles`);
    if (rolesData) setTruckyRoles(rolesData);

    const vtcData = await safeGet(`${API}/management/vtc-settings`);
    if (vtcData) setVtcSettings((prev: any) => ({ ...prev, ...vtcData }));

  }, [token, canSeeAdmin]);


  useEffect(() => { loadAll(); }, [loadAll]);

  const generateCode = async () => {
    setGenerating(true);
    try {
      const r = await axios.post(`${API}/management/invite-codes`, {}, { headers: h });
      toast.success(`Code erstellt: ${r.data.code}`);
      loadAll();
    } catch { toast.error("Fehler beim Generieren"); }
    finally { setGenerating(false); }
  };

  const deleteCode = async (code: string) => {
    try {
      await axios.delete(`${API}/management/invite-codes/${code}`, { headers: h });
      toast.success("Code gelöscht");
      loadAll();
    } catch { toast.error("Fehler"); }
  };

  const syncRoles = async () => {
    setSyncing(true);
    try {
      const r = await axios.post(`${API}/management/users/sync-roles`, {}, { headers: h });
      toast.success(`${r.data.synced} User synchronisiert`);
      loadAll();
    } catch { toast.error("Sync fehlgeschlagen"); }
    finally { setSyncing(false); }
  };

  const linkUser = async (userId: string, driverId: string) => {
    try {
      await axios.post(`${API}/management/users/${userId}/link`, { trucky_driver_id: driverId }, { headers: h });
      toast.success("Erfolgreich verknüpft");
      setLinkModal(null);
      loadAll();
    } catch (err: any) { toast.error(err.response?.data?.detail || "Verknüpfung fehlgeschlagen"); }
  };

  const unlinkUser = async (userId: string) => {
    try {
      await axios.post(`${API}/management/users/${userId}/unlink`, {}, { headers: h });
      toast.success("Entknüpft");
      loadAll();
    } catch { toast.error("Fehler"); }
  };

  const deleteUser = async (userId: string) => {
    setDeletingUser(true);
    try {
      await axios.delete(`${API}/management/users/${userId}`, { headers: h });
      toast.success("User erfolgreich gelöscht");
      setDeleteModal(null);
      loadAll();
    } catch { toast.error("Fehler beim Löschen"); }
    finally { setDeletingUser(false); }
  };

  const resetPassword = async (userId: string) => {
    if (!newPassword || newPassword.length < 4) {
      toast.error("Passwort muss mindestens 4 Zeichen lang sein");
      return;
    }
    setResettingPassword(true);
    try {
      await axios.put(`${API}/management/users/${userId}/reset-password`, { new_password: newPassword }, { headers: h });
      toast.success("Passwort erfolgreich zurückgesetzt");
      setResetPasswordModal(null);
      setNewPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Fehler beim Zurücksetzen");
    } finally {
      setResettingPassword(false);
    }
  };

  const toggleAdminRole = async (userId: string, currentIsAdmin: boolean) => {
    const newRole = currentIsAdmin ? "driver" : "admin";
    try {
      await axios.put(`${API}/management/users/${userId}/role?role=${newRole}`, {}, { headers: h });
      toast.success(`Admin-Rechte ${newRole === 'admin' ? 'erteilt' : 'entzogen'}`);
      setRoleModal((prev: any) => ({ ...prev, is_admin: newRole === 'admin' }));
      loadAll();
    } catch { toast.error("Fehler beim Rollenwechsel"); }
  };

  const setTruckyRole = async (userId: string, roleName: string) => {
    setUpdatingRole(true);
    try {
      await axios.put(`${API}/management/users/${userId}/trucky-role?role=${encodeURIComponent(roleName)}`, {}, { headers: h });
      toast.success(`Rolle zu ${roleName} geändert`);
      setRoleModal(null);
      loadAll();
    } catch { toast.error("Fehler beim Rollenwechsel"); }
    finally { setUpdatingRole(false); }
  };

  const saveTmpId = async (userId: string) => {
    const id = parseInt(tmpIdDraft);
    if (!tmpIdDraft.trim() || isNaN(id)) {
      try {
        await axios.delete(`${API}/management/users/${userId}/truckersmp`, { headers: h });
        toast.success("TruckersMP ID entfernt");
        setEditingTmpId(null);
        loadAll();
      } catch { toast.error("Fehler beim Entfernen"); }
      return;
    }
    try {
      await axios.put(`${API}/management/users/${userId}/truckersmp`, { truckersmp_id: id }, { headers: h });
      toast.success(`TruckersMP ID auf ${id} gesetzt`);
      setEditingTmpId(null);
      loadAll();
    } catch (err: any) { toast.error(err.response?.data?.detail || "Fehler beim Speichern"); }
  };

  const saveVtcSettings = async () => {
    setSavingVtc(true);
    try {
      await axios.put(`${API}/management/vtc-settings`, vtcSettings, { headers: h });
      toast.success("VTC Einstellungen gespeichert");
    } catch { toast.error("Fehler beim Speichern"); }
    finally { setSavingVtc(false); }
  };

  const [syncingTrucky, setSyncingTrucky] = useState(false);

  const syncFromTrucky = async () => {
    setSyncingTrucky(true);
    try {
      const r = await axios.post(`${API}/management/vtc-settings/sync-trucky`, {}, { headers: h });
      setVtcSettings((prev: any) => ({ ...prev, ...r.data }));
      toast.success("Daten erfolgreich von Trucky geladen!");
    } catch { toast.error("Fehler beim Laden der Trucky-Daten"); }
    finally { setSyncingTrucky(false); }
  };

  if (!canSeeAdmin) {
    return <div className="flex items-center justify-center h-96 text-red-400 font-bold text-xs uppercase tracking-widest">Keine Admin-Rechte</div>;
  }

  const tabs = [
    { key: "users", label: "Benutzer", icon: Users },
    ...(isAdmin ? [{ key: "codes", label: "Einladungscodes", icon: Key }] : []),
    { key: "applications", label: "Bewerbungen", icon: Inbox },
    ...(isAdmin ? [{ key: "reports", label: "Berichte", icon: BarChart3 }] : []),
    ...(isAdmin ? [{ key: "vtc", label: "VTC Einstellungen", icon: Globe }] : []),
    ...(isAdmin ? [{ key: "system", label: "System-Tools", icon: Server }] : []),
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-10"
    >
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="font-unbounded text-2xl font-bold text-white tracking-tight">Management</h1>
          <p className="text-slate-500 font-medium mt-1">Zentrale Verwaltung deines Unternehmens.</p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="flex gap-1 bg-[#000000] rounded-2xl p-1.5 border-2 border-[#2ba1b9]/20 overflow-x-auto no-scrollbar shadow-inner">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shrink-0 hover-glow ${tab === t.key ? "bg-primary text-black shadow-[0_0_20px_rgba(34,209,238,0.3)]" : "text-slate-500 hover:text-white"
              }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          variants={containerVariants}
          initial="hidden"
          animate="show"
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {tab === "users" && (
            <motion.div variants={containerVariants} className="glass-card !p-0 overflow-hidden shadow-xl backdrop-blur-xl hover-glow transition-all border-2 border-[#2ba1b9]/20 bg-[#000000]">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
                <h2 className="font-unbounded text-sm font-bold text-white uppercase tracking-widest">Benutzer-Management</h2>
                <button onClick={syncRoles} disabled={syncing} className="flex items-center gap-2 text-[10px] font-black uppercase text-primary tracking-widest hover:bg-primary/10 px-3 py-1.5 rounded-xl transition-all hover-glow">
                  <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
                  Rollen Synchronisieren
                </button>
              </div>
              <motion.div variants={containerVariants} className="divide-y divide-white/5">
                {users.map(u => (
                  <motion.div key={u.id} variants={itemVariants} className="p-6 hover:bg-black/40 transition-colors group border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-black border-2 border-[#2ba1b9]/20 flex items-center justify-center text-white font-black shrink-0 overflow-hidden group-hover:border-primary transition-colors">
                        {getAvatarUrl(u.avatar_url) ? <img src={getAvatarUrl(u.avatar_url)!} className="w-full h-full object-cover" /> : <User size={24} className="text-slate-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => onViewProfile(u.trucky_driver_id || u.id)}
                            className="text-sm font-bold text-white tracking-tight hover:text-primary transition-colors"
                          >
                            {u.username}
                          </button>
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${u.is_admin ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-slate-500 bg-white/5 border-white/10"}`}>
                            {u.is_admin ? "Admin" : (u.role || "driver")}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          {u.truckersmp_id && <span className="text-red-500/70 flex items-center gap-1"><MapPin size={12} /> TMP #{u.truckersmp_id}</span>}
                          {u.trucky_driver_id && <span>Trucky #{u.trucky_driver_id}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setRoleModal(u)} className="p-2 text-slate-400 hover:text-amber-500 transition-all hover-glow" title="Rolle ändern"><Crown size={18} /></button>
                        <button onClick={() => { setEditingTmpId(u.id); setTmpIdDraft(u.truckersmp_id || ""); }} className="p-2 text-slate-400 hover:text-red-500 transition-all hover-glow" title="TMP ID setzen"><MapPin size={18} /></button>
                        {u.trucky_driver_id ? (
                          <button onClick={() => unlinkUser(u.id)} className="p-2 text-slate-400 hover:text-orange-500 transition-all hover-glow" title="Entknüpfen"><Unlink size={18} /></button>
                        ) : (
                          <button onClick={() => setLinkModal(u)} className="p-2 text-slate-400 hover:text-primary transition-all hover-glow" title="Verknüpfen"><Link2 size={18} /></button>
                        )}
                        {isAdmin && <button onClick={() => setDeleteModal(u)} className="p-2 text-slate-400 hover:text-red-600 transition-all hover-glow" title="Löschen"><Trash2 size={18} /></button>}
                        <button onClick={() => { setResetPasswordModal(u); setNewPassword(""); }} className="p-2 text-slate-400 hover:text-emerald-400 transition-all hover-glow" title="Passwort zurücksetzen"><Key size={18} /></button>
                      </div>
                    </div>
                    {editingTmpId === u.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mt-4 pt-4 border-t border-white/5 flex items-center gap-3 ml-16">
                        <input
                          value={tmpIdDraft}
                          onChange={e => setTmpIdDraft(e.target.value)}
                          placeholder="TruckersMP ID eingeben..."
                          className="bg-black/60 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:border-primary/30 outline-none flex-1 max-w-xs"
                          autoFocus
                        />
                        <button onClick={() => saveTmpId(u.id)} className="p-2 bg-primary text-black rounded-lg hover:scale-105 transition-all"><Check size={16} /></button>
                        <button onClick={() => setEditingTmpId(null)} className="p-2 text-slate-500 hover:text-white"><X size={16} /></button>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}

          {tab === "codes" && (
            <motion.div variants={containerVariants} className="glass-card p-8 backdrop-blur-xl shadow-xl hover-glow transition-all border-2 border-[#2ba1b9]/20 bg-[#000000]">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="font-unbounded text-sm font-bold text-white uppercase tracking-widest">Einladungscodes</h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">Generiere Codes für neue Mitglieder.</p>
                </div>
                <button onClick={generateCode} disabled={generating} className="bg-primary hover:bg-primary/90 text-black px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 hover-glow shadow-[0_0_20px_rgba(34,209,238,0.2)]">
                  {generating ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                  Neuer Code
                </button>
              </div>
              <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {codes.map(c => (
                  <motion.div key={c.code} variants={itemVariants} className="bg-[#000000] border-2 border-[#2ba1b9]/20 rounded-2xl p-4 flex items-center justify-between group hover:border-primary/60 transition-all hover-glow">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.used ? "bg-black/60" : "bg-primary/10 shadow-[0_0_15px_rgba(34,209,238,0.1)]"}`}>
                        <Key size={18} className={c.used ? "text-slate-600" : "text-primary"} />
                      </div>
                      <div>
                        <p className={`font-mono text-lg font-black tracking-widest ${c.used ? "text-slate-600 line-through" : "text-white"}`}>{c.code}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{c.used ? `Verwendet von ${c.used_by_name || 'unbekannt'}` : "Offen & Bereit"}</p>
                      </div>
                    </div>
                    {!c.used && <button onClick={() => deleteCode(c.code)} className="p-2 text-slate-700 hover:text-red-500 transition-all"><Trash2 size={16} /></button>}
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}

          {tab === "vtc" && (
            <motion.div variants={containerVariants} className="glass-card p-8 backdrop-blur-xl shadow-xl space-y-8 hover-glow transition-all border-2 border-[#2ba1b9]/20 bg-[#000000]">
              <div>
                <h2 className="font-unbounded text-sm font-bold text-white uppercase tracking-widest">VTC Management</h2>
                <p className="text-xs text-slate-500 mt-1">Verwalte die globalen Einstellungen deiner VTC.</p>
              </div>

              <motion.div variants={containerVariants} className="space-y-4">
                <motion.div variants={itemVariants} className="flex items-center justify-between p-6 bg-[#000000] border-2 border-[#2ba1b9]/20 rounded-3xl hover-glow transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${vtcSettings.use_trucky_stats ? "bg-primary/10 text-primary" : "bg-slate-500/10 text-slate-400"}`}>
                      <BarChart3 size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white uppercase tracking-tight">Trucky Statistiken</p>
                      <p className="text-xs text-slate-500 font-medium">{vtcSettings.use_trucky_stats ? "Daten werden von Trucky geladen." : "Eigene lokale Statistiken werden genutzt."}</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const next = !vtcSettings.use_trucky_stats;
                      setVtcSettings({ ...vtcSettings, use_trucky_stats: next });
                      try {
                        await axios.put(`${API}/management/vtc-settings`, { ...vtcSettings, use_trucky_stats: next }, { headers: h });
                        toast.success("Statistik-Modus geändert");
                      } catch { toast.error("Fehler beim Speichern"); }
                    }}
                    className={`relative w-16 h-8 rounded-full transition-all duration-500 p-1 ${vtcSettings.use_trucky_stats ? "bg-primary text-black" : "bg-slate-700"}`}
                  >
                    <div className={`w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-500 ${vtcSettings.use_trucky_stats ? "translate-x-8" : "translate-x-0"}`} />
                  </button>
                </motion.div>

                <motion.div variants={itemVariants} className="flex items-center justify-between p-6 bg-[#000000] border-2 border-[#2ba1b9]/20 rounded-3xl hover-glow transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${applicationsOpen ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                      {applicationsOpen ? <ShieldCheck size={24} /> : <ShieldOff size={24} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white uppercase tracking-tight">Öffentliche Bewerbungen</p>
                      <p className="text-xs text-slate-500 font-medium">{applicationsOpen ? "Jeder kann sich aktuell bewerben." : "Bewerbungsphase aktuell geschlossen."}</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      setToggling(true);
                      try {
                        const res = await axios.put(`${API}/settings/applications`, { open: !applicationsOpen }, { headers: h });
                        setApplicationsOpen(res.data.open);
                        toast.success(res.data.open ? "Bewerbungen geöffnet" : "Bewerbungen geschlossen");
                      } catch { toast.error("Fehler"); }
                      finally { setToggling(false); }
                    }}
                    disabled={toggling}
                    className={`relative w-16 h-8 rounded-full transition-all duration-500 p-1 ${applicationsOpen ? "bg-emerald-500" : "bg-slate-700"} ${toggling ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className={`w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-500 ${applicationsOpen ? "translate-x-8" : "translate-x-0"}`} />
                  </button>
                </motion.div>

                {/* About & Requirements Inputs */}
                <motion.div variants={itemVariants} className="space-y-4 pt-6 border-t border-white/5">
                  <h3 className="font-unbounded text-xs font-bold text-white uppercase tracking-widest">Inhalts-Overrides (Website & App)</h3>

                  <button
                    type="button"
                    onClick={syncFromTrucky}
                    disabled={syncingTrucky}
                    className="w-full bg-black/40 hover:bg-black/60 text-primary py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-2 border-primary/20 hover-glow"
                  >
                    {syncingTrucky ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    Daten von Trucky laden (Cache leeren)
                  </button>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Über Uns (About Us)</label>
                    <textarea
                      value={vtcSettings.about || ""}
                      onChange={e => setVtcSettings({ ...vtcSettings, about: e.target.value })}
                      placeholder="Schreibe hier etwas über die Spedition..."
                      className="w-full min-h-[120px] bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary/50 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Voraussetzungen (Requirements - Eine pro Zeile)</label>
                    <textarea
                      value={vtcSettings.requirements || ""}
                      onChange={e => setVtcSettings({ ...vtcSettings, requirements: e.target.value })}
                      placeholder="z.B. Mindestalter 16 Jahre&#10;Aktivität auf Discord&#10;Freundliches Auftreten"
                      className="w-full min-h-[120px] bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary/50 outline-none transition-all"
                    />
                  </div>

                  <button
                    onClick={saveVtcSettings}
                    disabled={savingVtc}
                    className="w-full bg-primary hover:bg-primary/90 text-black py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 hover-glow shadow-[0_0_20px_rgba(34,209,238,0.2)]"
                  >
                    {savingVtc ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    VTC Inhalts-Einstellungen Speichern
                  </button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}

          {tab === "applications" && <Applications />}
          {tab === "reports" && <Reports />}
          {tab === "system" && (
            <motion.div variants={containerVariants} className="space-y-6">
              <div className="glass-card p-8 backdrop-blur-xl shadow-xl hover-glow transition-all border-2 border-[#2ba1b9]/20 bg-[#000000]">
                <div className="mb-6">
                  <h2 className="font-unbounded text-sm font-bold text-white uppercase tracking-widest">System-Verwaltung</h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">Direkter Zugriff auf die Server- und Datenbank-Infrastruktur von FJOSTE.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <a
                    href="https://pm2.fjostegroup.de"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-5 p-6 bg-black/40 border border-[#2ba1b9]/20 rounded-2xl hover:border-primary/50 transition-all group hover-glow"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-[#2ba1b9]/10 border border-[#2ba1b9]/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Server size={24} className="text-[#2ba1b9]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-unbounded text-sm font-bold text-white uppercase tracking-tight group-hover:text-primary transition-colors">Server Manager</h3>
                        <ExternalLink size={12} className="text-slate-600 group-hover:text-primary transition-colors" />
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">PM2 Prozesse überwachen & verwalten</p>
                      <p className="text-[9px] font-bold text-slate-700 uppercase tracking-widest mt-2">pm2.fjostegroup.de</p>
                    </div>
                  </a>

                  <a
                    href="https://db.fjostegroup.de/_/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-5 p-6 bg-black/40 border border-emerald-500/20 rounded-2xl hover:border-emerald-500/50 transition-all group hover-glow"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Database size={24} className="text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-unbounded text-sm font-bold text-white uppercase tracking-tight group-hover:text-emerald-400 transition-colors">Datenbank Panel</h3>
                        <ExternalLink size={12} className="text-slate-600 group-hover:text-emerald-400 transition-colors" />
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">PocketBase Verwaltungsoberfläche</p>
                      <p className="text-[9px] font-bold text-slate-700 uppercase tracking-widest mt-2">db.fjostegroup.de</p>
                    </div>
                  </a>

                  <div
                    onClick={() => onNavigate('database')}
                    className="flex items-start gap-5 p-6 bg-black/40 border border-[#2ba1b9]/25 rounded-2xl hover:border-[#2ba1b9]/50 hover:bg-[#2ba1b9]/5 transition-all group cursor-pointer hover-glow"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-[#2ba1b9]/10 border border-[#2ba1b9]/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Database size={24} className="text-[#2ba1b9]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-unbounded text-sm font-bold text-white uppercase tracking-tight group-hover:text-[#2ba1b9] transition-colors">Interne Datenbank</h3>
                        <ChevronRight size={14} className="text-slate-600 group-hover:text-[#2ba1b9] transition-colors" />
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Integrierten Datenbank-Viewer öffnen</p>
                      <p className="text-[9px] font-bold text-slate-700 uppercase tracking-widest mt-2">Direkt im Drivers Hub verwalten</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {linkModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setLinkModal(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#000000] border-2 border-[#2ba1b9]/20 rounded-[32px] !p-0 overflow-hidden shadow-2xl backdrop-blur-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-white/5 bg-black/40">
                <h3 className="font-unbounded text-sm font-bold text-white uppercase tracking-widest italic">Fahrer Verknüpfen</h3>
                <p className="text-xs text-slate-500 mt-1">Wähle den passenden Trucky-Account für <span className="text-primary font-bold">{linkModal.username}</span>.</p>
              </div>
              <div className="max-h-[400px] overflow-y-auto divide-y divide-white/5">
                {Array.isArray(drivers) && drivers.filter(d => d && !d.is_local).map((d, idx) => (
                  <button
                    key={d.id || `driver-${idx}`}
                    onClick={() => {
                      const targetId = d.trucky_id || (d.id ? d.id.toString().replace('trucky_', '') : '');
                      if (targetId) linkUser(linkModal.id, targetId);
                      else toast.error("Ungültige Trucky ID");
                    }}
                    className="w-full p-4 flex items-center gap-3 hover:bg-primary/5 transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden border border-white/10">
                      {getAvatarUrl(d.avatar_url) ? (
                        <img src={getAvatarUrl(d.avatar_url)!} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                          {d.name ? d.name.toString().charAt(0) : '?'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white">{d.name || 'Unbekannt'}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {d.role?.name || d.role || 'Fahrer'} • ID {d.trucky_id || d.id || 'N/A'}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-slate-700" />
                  </button>
                ))}
                {(!Array.isArray(drivers) || drivers.filter(d => d && !d.is_local).length === 0) && (
                  <div className="p-10 text-center text-slate-500 text-xs font-bold uppercase tracking-widest">
                    Keine verfügbaren Trucky-Accounts gefunden
                  </div>
                )}
              </div>
              <div className="p-4 bg-black/40">
                <button onClick={() => setLinkModal(null)} className="w-full py-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-all">Abbrechen</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {roleModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setRoleModal(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#000000] border-2 border-[#2ba1b9]/20 rounded-[32px] !p-0 overflow-hidden shadow-2xl backdrop-blur-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-white/5 bg-black/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-unbounded text-sm font-bold text-white uppercase tracking-widest italic">Rolle Zuweisen</h3>
                    <p className="text-xs text-slate-500 mt-1">Status für <span className="text-primary font-bold">{roleModal.username}</span>.</p>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex items-center justify-between p-4 bg-black/40 border border-white/10 rounded-2xl">
                    <div>
                      <p className="text-[10px] font-black text-white uppercase tracking-widest">Admin Rechte</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">{roleModal.is_admin ? 'Eingeschaltet' : 'Ausgeschaltet'}</p>
                    </div>
                    <button
                      onClick={() => toggleAdminRole(roleModal.id, roleModal.is_admin)}
                      className={`relative w-12 h-6 rounded-full transition-all duration-300 p-1 ${roleModal.is_admin ? "bg-emerald-500" : "bg-slate-700"}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-lg transition-transform duration-300 ${roleModal.is_admin ? "translate-x-6" : "translate-x-0"}`} />
                    </button>
                  </div>
                )}
              </div>
              <div className="p-4 border-b border-white/5">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-3">Trucky Ränge</p>
                <div className="max-h-[300px] overflow-y-auto grid grid-cols-1 gap-1 pr-1">
                  {truckyRoles.filter(r => isAdmin || r.name.toLowerCase() === "fahrer" || r.name.toLowerCase() === "probefahrer").map(r => (
                    <button
                      key={r.id}
                      onClick={() => setTruckyRole(roleModal.id, r.name)}
                      className={`w-full p-3 flex items-center justify-between rounded-xl transition-all hover-glow ${(roleModal.role === r.name || roleModal.trucky_role === r.name)
                        ? 'bg-primary/20 border border-primary/30'
                        : 'hover:bg-black/40 border border-transparent'
                        }`}
                    >
                      <span className="text-xs font-bold text-white">{r.name}</span>
                      {(roleModal.role === r.name || roleModal.trucky_role === r.name) && <Check size={14} className="text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-black/40 border-t border-white/5">
                <button onClick={() => setRoleModal(null)} className="w-full py-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-all">Abbrechen</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete User Modal */}
      <AnimatePresence>
        {deleteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setDeleteModal(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#000000] border-2 border-[#2ba1b9]/20 rounded-[32px] !p-0 overflow-hidden shadow-2xl backdrop-blur-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6 mx-auto">
                  <AlertTriangle size={32} className="text-red-500" />
                </div>
                <h3 className="font-unbounded text-lg font-black text-white uppercase tracking-tight italic mb-2">User Löschen?</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-8">
                  Möchtest du <span className="text-white font-bold">{deleteModal.username}</span> wirklich aus dem System entfernen? Alle Daten gehen verloren.
                </p>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => deleteUser(deleteModal.id)}
                    disabled={deletingUser}
                    className="w-full bg-red-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                  >
                    {deletingUser ? <Loader2 size={18} className="animate-spin" /> : <><Trash2 size={18} /> Endgültig Löschen</>}
                  </button>
                  <button onClick={() => setDeleteModal(null)} className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">Abbrechen</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset Password Modal */}
      <AnimatePresence>
        {resetPasswordModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setResetPasswordModal(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#000000] border-2 border-[#2ba1b9]/20 rounded-[32px] !p-0 overflow-hidden shadow-2xl backdrop-blur-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <div className="p-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 mx-auto">
                  <Key size={32} className="text-primary" />
                </div>
                <h3 className="font-unbounded text-lg font-black text-white text-center uppercase tracking-tight italic mb-2">Passwort Reset</h3>
                <p className="text-sm text-slate-400 text-center leading-relaxed mb-6">
                  Neues Passwort für <span className="text-white font-bold">{resetPasswordModal.username}</span> vergeben.
                </p>

                <div className="space-y-4">
                  <input
                    type="text"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Neues Passwort (min. 4 Zeichen)"
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary/50 outline-none transition-all"
                    autoFocus
                  />
                  <div className="flex flex-col gap-2 mt-4">
                    <button
                      onClick={() => resetPassword(resetPasswordModal.id)}
                      disabled={resettingPassword}
                      className="w-full bg-primary text-black py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white transition-all flex items-center justify-center gap-2"
                    >
                      {resettingPassword ? <Loader2 size={18} className="animate-spin" /> : <><Check size={18} /> Speichern</>}
                    </button>
                    <button onClick={() => setResetPasswordModal(null)} className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">Abbrechen</button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Admin;
