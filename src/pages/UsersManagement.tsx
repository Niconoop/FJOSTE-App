import { useEffect, useState, useCallback } from 'react';
import { Key, Link2, Unlink, RefreshCw, Trash2, Crown, Loader2, Check, X, Search, User, MapPin, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

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
  hidden: { opacity: 1, y: 12, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 220,
      damping: 24
    }
  }
};

const UsersManagement = ({ onViewProfile }: { onViewProfile: (id: string | number) => void }) => {
  const { token, isAdmin } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [linkModal, setLinkModal] = useState<any>(null);
  const [editingTmpId, setEditingTmpId] = useState<string | null>(null);
  const [tmpIdDraft, setTmpIdDraft] = useState("");
  const [truckyRoles, setTruckyRoles] = useState<any[]>([]);
  const [roleModal, setRoleModal] = useState<any>(null);
  const [deleteModal, setDeleteModal] = useState<any>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [resetPasswordModal, setResetPasswordModal] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  const [search, setSearch] = useState("");

  const h = { Authorization: `Bearer ${token}` };

  const loadAll = useCallback(async () => {
    const safeGet = async (url: string) => {
      try { return (await axios.get(url, { headers: h })).data; }
      catch { return null; }
    };

    const usersData = await safeGet(`${API}/management/users`);
    if (usersData) setUsers(usersData);

    const membersData = await safeGet(`${API}/members`);
    if (membersData) setDrivers(membersData?.data || membersData || []);

    const defaultRoles = [
      { id: 1, name: 'Inhaber' },
      { id: 2, name: 'Stv. Inhaber' },
      { id: 3, name: 'Admin' },
      { id: 4, name: 'Management' },
      { id: 5, name: 'Personal-Team' },
      { id: 6, name: 'Event-Team' },
      { id: 7, name: 'Modding-Team' },
      { id: 8, name: 'Fahrer' },
      { id: 9, name: 'Probefahrer' }
    ];
    setTruckyRoles(defaultRoles);

    setLoading(false);
  }, [token]);


  useEffect(() => { loadAll(); }, [loadAll]);

  const syncRoles = async () => {
    setSyncing(true);
    try {
      await loadAll();
      toast.success("Rollen erfolgreich geladen");
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
      await axios.put(`${API}/management/users/${userId}/password`, { new_password: newPassword }, { headers: h });
      toast.success("Passwort erfolgreich zurückgesetzt");
      setResetPasswordModal(null);
      setNewPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.response?.data?.error || "Fehler beim Zurücksetzen");
    } finally {
      setResettingPassword(false);
    }
  };

  const toggleAdminRole = async (userId: string, currentIsAdmin: boolean) => {
    const newRole = currentIsAdmin ? "Fahrer" : "Admin";
    try {
      await axios.put(`${API}/management/users/${userId}/role?role=${encodeURIComponent(newRole)}`, {}, { headers: h });
      toast.success(`Admin-Rechte ${newRole === 'Admin' ? 'erteilt' : 'entzogen'}`);
      setRoleModal((prev: any) => ({ ...prev, is_admin: newRole === 'Admin', role: newRole }));
      loadAll();
    } catch { toast.error("Fehler beim Rollenwechsel"); }
  };

  const setTruckyRole = async (userId: string, roleName: string) => {
    try {
      await axios.put(`${API}/management/users/${userId}/role?role=${encodeURIComponent(roleName)}`, {}, { headers: h });
      toast.success(`Rolle zu ${roleName} geändert`);
      setRoleModal(null);
      loadAll();
    } catch { toast.error("Fehler beim Rollenwechsel"); }
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

  const filteredUsers = users.filter(u => (u.username || "").toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-1">
        <div className="flex items-center gap-3">
          <div className="w-1 h-4 bg-amber-400 rounded-full" />
          <h1 className="font-unbounded text-2xl font-bold text-amber-400 uppercase tracking-tight italic">Benutzer-Management</h1>
        </div>
        <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest">Verwalte Benutzer, Rollen und Trucky-Verknüpfungen.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="w-5 h-5 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Benutzer suchen..."
          className="w-full bg-white/[0.03] border border-white/10 hover:border-white/20 text-white placeholder:text-slate-600 rounded-full h-12 pl-12 pr-4 focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 transition-all outline-none text-sm font-medium backdrop-blur-sm"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        )}
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="frosted-card !p-0 overflow-hidden border-2 border-[#f59e0b]/20 bg-[#000000] shadow-xl">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-1 h-4 bg-amber-400 rounded-full" />
            <h2 className="font-unbounded text-sm font-bold text-amber-400 uppercase tracking-widest">Alle Benutzer</h2>
          </div>
          <button onClick={syncRoles} disabled={syncing} className="flex items-center gap-2 text-[10px] font-black uppercase text-amber-400 tracking-widest hover:bg-amber-400/10 px-3 py-1.5 rounded-xl transition-all hover-glow border border-amber-400/10">
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            Rollen Synchronisieren
          </button>
        </div>

        {loading ? (
          [1, 2, 3, 4].map(i => (
            <div key={i} className="p-6 border-b border-white/5 last:border-0 animate-pulse flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/5 shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="h-4 bg-white/5 rounded w-1/4" />
                <div className="h-3 bg-white/5 rounded w-1/3" />
              </div>
              <div className="flex gap-2 shrink-0">
                <div className="w-8 h-8 rounded-lg bg-white/5" />
                <div className="w-8 h-8 rounded-lg bg-white/5" />
                <div className="w-8 h-8 rounded-lg bg-white/5" />
                <div className="w-8 h-8 rounded-lg bg-white/5" />
              </div>
            </div>
          ))
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 opacity-30">
            <p className="text-[10px] font-bold uppercase tracking-widest">{search ? "Keine Benutzer für diese Suche" : "Keine Benutzer gefunden"}</p>
          </div>
        ) : (
          <motion.div variants={containerVariants} className="divide-y divide-white/5">
            {filteredUsers.map(u => (
              <motion.div key={u.id} variants={itemVariants} className="p-6 hover:bg-black/40 transition-colors group border-b border-white/5 last:border-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center text-white font-black shrink-0 overflow-hidden group-hover:border-amber-400 transition-colors">
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
        )}
      </motion.div>

      <AnimatePresence>
        {linkModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setLinkModal(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#000000] border-2 border-[#f59e0b]/20 rounded-[32px] !p-0 overflow-hidden shadow-2xl backdrop-blur-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
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
                    <X size={14} className="text-slate-700" />
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
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#000000] border-2 border-[#f59e0b]/20 rounded-[32px] !p-0 overflow-hidden shadow-2xl backdrop-blur-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
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
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#000000] border-2 border-[#f59e0b]/20 rounded-[32px] !p-0 overflow-hidden shadow-2xl backdrop-blur-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
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
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#000000] border-2 border-[#f59e0b]/20 rounded-[32px] !p-0 overflow-hidden shadow-2xl backdrop-blur-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
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
    </div>
  );
};

export default UsersManagement;
