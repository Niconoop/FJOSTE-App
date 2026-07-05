import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Send, Hash, MessageCircle, Trash2, Loader2, Menu, X, Plus, LogOut as LogOutIcon, UserPlus, ChevronRight } from 'lucide-react';
import { apiService } from '../services/api';
import { toast } from 'sonner';
import axios from 'axios';
import { API_URL, getAvatarUrl } from '../config';
import { motion, AnimatePresence } from 'framer-motion';

const Chat = ({ selectedChannelId, onClearSelectedId }: any) => {
  const { user, isAdmin, hasRole } = useAuth();
  const HR_ROLES = ["hr team", "hr-team", "personal team", "personal-team"];
  const canManageChat = isAdmin || hasRole(HR_ROLES);
  const [channels, setChannels] = useState<any[]>([]);
  const [activeChannel, setActiveChannel] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const knownIds = useRef(new Set());
  const pollRef = useRef<any>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [busyGroup, setBusyGroup] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load basic data
  useEffect(() => {
    const loadBasics = async () => {
      try {
        const [cRes, uRes] = await Promise.all([
          axios.get(`${API_URL}/chat/channels`),
          axios.get(`${API_URL}/management/users`)
        ]);
        const ch = Array.isArray(cRes.data) ? cRes.data : [];
        setChannels(ch);
        if (ch.length > 0 && !activeChannel && !selectedChannelId) setActiveChannel(ch[0]);
        setUsers(Array.isArray(uRes.data) ? uRes.data : []);
      } catch { }
    };
    loadBasics();
  }, []);

  useEffect(() => {
    if (selectedChannelId && channels.length > 0) {
      const target = channels.find(c => String(c.id) === String(selectedChannelId));
      if (target) {
        setActiveChannel(target);
      }
      onClearSelectedId?.();
    }
  }, [selectedChannelId, channels, onClearSelectedId]);

  const loadMessages = useCallback(async (since?: string) => {
    if (!activeChannel) return;
    const url = since
      ? `${API_URL}/chat/channels/${activeChannel.id}/messages?since=${since}`
      : `${API_URL}/chat/channels/${activeChannel.id}/messages`;

    try {
      const r = await axios.get(url);
      const msgs = Array.isArray(r.data) ? r.data : [];
      if (since) {
        const newMsgs = msgs.filter(m => !knownIds.current.has(m.id));
        if (newMsgs.length > 0) {
          newMsgs.forEach(m => knownIds.current.add(m.id));
          setMessages(prev => [...prev, ...newMsgs]);
        }
      } else {
        knownIds.current = new Set(msgs.map(m => m.id));
        setMessages(msgs);
      }
    } catch { }
  }, [activeChannel]);

  useEffect(() => {
    if (!activeChannel) return;
    loadMessages();
    pollRef.current = setInterval(() => {
      const last = messages.length > 0 ? messages[messages.length - 1].created_at : undefined;
      loadMessages(last);
    }, 3500);
    return () => clearInterval(pollRef.current);
  }, [activeChannel, loadMessages, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    try {
      const { ipcRenderer } = window.require('electron');
      if (ipcRenderer) {
        if (activeChannel) {
          if (activeChannel.is_group) {
            ipcRenderer.send('rpc-page-changed', 'chat', { groupName: activeChannel.name });
          } else {
            ipcRenderer.send('rpc-page-changed', 'chat', { chattingWith: activeChannel.name });
          }
        } else {
          ipcRenderer.send('rpc-page-changed', 'chat');
        }
      }
    } catch (e) { }
  }, [activeChannel]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeChannel) return;
    setSending(true);
    try {
      const r = await axios.post(`${API_URL}/chat/channels/${activeChannel.id}/messages`, { content: input });
      const msg = r.data;
      if (!knownIds.current.has(msg.id)) {
        knownIds.current.add(msg.id);
        setMessages(prev => [...prev, msg]);
      }
      setInput("");
    } catch { toast.error("Fehler beim Senden"); }
    finally { setSending(false); }
  };

  const startDM = async (peerId: number) => {
    try {
      const r = await axios.post(`${API_URL}/chat/channels`, { peer_user_id: peerId });
      const ch = r.data;
      setChannels(prev => prev.find(c => c.id === ch.id) ? prev : [...prev, ch]);
      setActiveChannel(ch);
      setDrawerOpen(false);
    } catch { toast.error("Chat konnte nicht gestartet werden"); }
  };

  const handleDeleteMessage = async (msgId: string | number) => {
    try {
      await axios.delete(`${API_URL}/chat/messages/${msgId}`);
      setMessages(prev => prev.filter(m => m.id !== msgId));
      knownIds.current.delete(msgId);
      toast.success("Nachricht gelöscht");
    } catch { toast.error("Fehler beim Löschen"); }
  };

  const submitCreateGroup = async () => {
    if (!groupName.trim() || selectedMemberIds.length === 0) return;
    setBusyGroup(true);
    try {
      const r = await axios.post(`${API_URL}/chat/groups`, { name: groupName, member_ids: selectedMemberIds });
      const ch = r.data;
      const cRes = await axios.get('http://127.0.0.1:8000/api/chat/channels');
      setChannels(cRes.data);
      setActiveChannel(ch);
      setShowCreateGroup(false);
      setGroupName("");
      setSelectedMemberIds([]);
      toast.success("Gruppe erfolgreich erstellt");
    } catch { toast.error("Fehler beim Erstellen der Gruppe"); }
    finally { setBusyGroup(false); }
  };

  const submitAddMembers = async () => {
    if (selectedMemberIds.length === 0 || !activeChannel) return;
    setBusyGroup(true);
    try {
      await axios.post(`${API_URL}/chat/channels/${activeChannel.id}/members`, { member_ids: selectedMemberIds });
      // Refresh channel info to update member list
      const cRes = await axios.get(`${API_URL}/chat/channels`);
      const updatedChannels = cRes.data;
      setChannels(updatedChannels);
      const updatedActive = updatedChannels.find((c: any) => c.id === activeChannel.id);
      if (updatedActive) setActiveChannel(updatedActive);

      setShowAddMembers(false);
      setSelectedMemberIds([]);
      toast.success("Mitglieder hinzugefügt");
    } catch { toast.error("Fehler beim Hinzufügen der Mitglieder"); }
    finally { setBusyGroup(false); }
  };

  const leaveGroup = async () => {
    if (!activeChannel) return;
    setBusyGroup(true);
    try {
      await axios.post(`${API_URL}/chat/channels/${activeChannel.id}/leave`);
      const cRes = await axios.get(`${API_URL}/chat/channels`);
      const chs = cRes.data;
      setChannels(chs);
      setActiveChannel(chs.length > 0 ? chs[0] : null);
      setShowLeaveConfirm(false);
      toast.success("Gruppe verlassen");
    } catch { toast.error("Fehler beim Verlassen der Gruppe"); }
    finally { setBusyGroup(false); }
  };

  const deleteChat = async () => {
    if (!activeChannel) return;
    setBusyGroup(true);
    try {
      await axios.delete(`${API_URL}/chat/channels/${activeChannel.id}`);
      const cRes = await axios.get(`${API_URL}/chat/channels`);
      const chs = cRes.data;
      setChannels(chs);
      setActiveChannel(chs.length > 0 ? chs[0] : null);
      setShowDeleteConfirm(false);
      toast.success("Chat gelöscht");
    } catch { toast.error("Fehler beim Löschen des Chats"); }
    finally { setBusyGroup(false); }
  };

  const getAvatarUrlLocal = (url?: string) => getAvatarUrl(url);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Heute";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Gestern";
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
  };

  let lastDate = "";

  return (
    <div className="flex h-[calc(100vh-140px)] glass-card !p-0 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 relative shadow-2xl backdrop-blur-xl">
      {/* Sidebar */}
      <div className={`w-64 border-r-2 border-[#2ba1b9]/20 bg-[#000000] backdrop-blur-3xl flex flex-col shrink-0 transition-all duration-300 ${drawerOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"} absolute md:static inset-y-0 z-40 shadow-2xl`}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="font-unbounded text-[10px] font-black text-white uppercase tracking-widest italic">Kanäle</h2>
          <button onClick={() => setShowCreateGroup(true)} className="p-1.5 hover:bg-primary/10 rounded-lg text-primary transition-all">
            <Plus size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1 no-scrollbar">
          {channels.map(ch => {
            const isDM = !ch.is_group;
            const peerAvatar = isDM ? ch.avatar_url : null;

            return (
              <button
                key={ch.id}
                onClick={() => { setActiveChannel(ch); setDrawerOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all hover-glow ${activeChannel?.id === ch.id ? "bg-primary/10 text-primary border border-primary/20" : "text-slate-500 hover:text-white hover:bg-black/40 border border-transparent"}`}
              >
                {isDM ? (
                  <div className="w-5 h-5 rounded-full bg-black border border-white/10 overflow-hidden shrink-0">
                    {getAvatarUrlLocal(peerAvatar) ? <img src={getAvatarUrlLocal(peerAvatar)!} className="w-full h-full object-cover" /> : <MessageCircle size={14} className="m-auto mt-0.5" />}
                  </div>
                ) : (
                  <Hash size={16} className="shrink-0" />
                )}
                <span className="truncate flex-1 text-left">{ch.name}</span>
              </button>
            );
          })}

          <div className="pt-6">
            <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest ml-3 mb-3 italic">Mitglieder</p>
            {users.filter(u => u.id !== user?.user_id).map(u => (
              <button
                key={u.id}
                onClick={() => startDM(u.id)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-white hover:bg-black/40 transition-all truncate"
              >
                <div className="w-5 h-5 rounded-full bg-black border border-white/5 overflow-hidden">
                  {u.avatar_url ? <img src={getAvatarUrlLocal(u.avatar_url)!} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-primary/20" />}
                </div>
                {u.username}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#000000]">
        {/* Chat Header */}
        <div className="h-16 border-b border-white/10 flex items-center px-6 shrink-0 bg-[#000000] gap-4">
          <button onClick={() => setDrawerOpen(true)} className="md:hidden p-2 hover:bg-white/5 rounded-xl text-slate-500">
            <Menu size={20} />
          </button>
          <div className="flex-1">
            <h3 className="font-unbounded text-xs font-black text-white uppercase tracking-widest italic flex items-center gap-2">
              {activeChannel ? (activeChannel.is_group ? <Hash size={14} className="text-primary" /> : <MessageCircle size={14} className="text-primary" />) : null}
              {activeChannel?.name || "Wähle einen Chat"}
            </h3>
            {activeChannel?.is_group && activeChannel.members_info && (
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter mt-0.5">
                {activeChannel.members_info.length} Mitglieder
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeChannel?.is_custom_group && (
              <button
                onClick={() => {
                  // Pre-select existing members to show who is already in
                  const existingIds = activeChannel.members || [];
                  setSelectedMemberIds([]); // Start fresh for "new" members or handle logic in modal
                  setShowAddMembers(true);
                }}
                className="p-2 text-slate-500 hover:text-primary transition-all"
                title="Mitglieder hinzufügen"
              >
                <UserPlus size={18} />
              </button>
            )}
            {activeChannel?.is_custom_group && (
              <button
                onClick={() => setShowLeaveConfirm(true)}
                className="p-2 text-slate-500 hover:text-red-500 transition-all"
                title="Gruppe verlassen"
              >
                <LogOutIcon size={18} />
              </button>
            )}
            {activeChannel && !activeChannel.is_group && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-slate-500 hover:text-red-500 transition-all"
                title="Chat löschen"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2 no-scrollbar">
          {messages.map(msg => {
            const isOwn = msg.user_id === user?.user_id;
            const dateStr = formatDate(msg.created_at);
            let showDate = false;
            if (dateStr !== lastDate) { showDate = true; lastDate = dateStr; }

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex items-center gap-4 my-6 opacity-30">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white">{dateStr}</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                )}
                <div className={`flex ${isOwn ? "justify-end" : "justify-start"} group`}>
                  <div className={`flex gap-3 max-w-[80%] ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                    {!isOwn && (
                      <div className="w-8 h-8 rounded-full bg-black border border-white/5 overflow-hidden shrink-0 mt-1">
                        {(() => {
                          const msgAvatar = users.find(u => u.id === msg.user_id)?.avatar_url || msg.avatar_url;
                          const finalUrl = getAvatarUrlLocal(msgAvatar);
                          return finalUrl ? (
                            <img src={finalUrl} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-primary/20 flex items-center justify-center text-[10px] font-black text-primary">
                              {msg.username?.charAt(0)}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    <div className={`space-y-1 ${isOwn ? "items-end" : "items-start"}`}>
                      {!isOwn && (<p className="text-[10px] font-black text-primary uppercase tracking-widest ml-1 flex items-center gap-1">{msg.username} <span className="text-[9px] font-normal text-slate-400 uppercase">({users.find(u => u.id === msg.user_id)?.role?.name ?? users.find(u => u.id === msg.user_id)?.role ?? ''})</span></p>)}
                      <div className={`px-4 py-2.5 rounded-2xl text-sm relative transition-all ${isOwn ? "bg-primary text-black font-bold shadow-[0_5px_15px_rgba(34,209,238,0.2)] rounded-tr-none" : "bg-[#000000] border-2 border-[#2ba1b9]/20 text-slate-200 rounded-tl-none hover:border-[#2ba1b9]/60"}`}>
                        {msg.content}
                        <div className={`flex items-center gap-2 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
                          <span className={`text-[8px] font-black uppercase tracking-tighter ${isOwn ? "text-black/40" : "text-slate-600"}`}>
                            {new Date(msg.created_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {(canManageChat || isOwn) && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-red-500"
                            >
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {activeChannel && (
          <div className="p-6 bg-[#000000] border-t border-white/10">
            <form onSubmit={handleSend} className="chat-form flex gap-3 items-center bg-black border-2 border-[#2ba1b9]/20 rounded-2xl p-2 focus-within:border-primary transition-all shadow-inner">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Deine Nachricht..."
                className="flex-1 bg-transparent border-none outline-none ring-0 focus:ring-0 px-4 text-sm text-white placeholder:text-slate-600"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="w-10 h-10 rounded-xl bg-primary text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Modals (Create Group, etc) */}
      <AnimatePresence>
        {showCreateGroup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6" onClick={() => { setShowCreateGroup(false); setSelectedMemberIds([]); }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#000000] border-2 border-[#2ba1b9]/20 rounded-[32px] p-8 w-full max-w-md shadow-2xl backdrop-blur-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="font-unbounded text-sm font-bold text-white uppercase tracking-widest italic mb-6">Neue Gruppe erstellen</h3>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Gruppenname</label>
                  <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Z.B. Event-Team" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary/30 outline-none" autoFocus />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Mitglieder auswählen</label>
                  <div className="max-h-48 overflow-y-auto space-y-1 bg-black/20 rounded-xl p-2 border border-white/5 no-scrollbar">
                    {users.filter(u => u.id !== user?.user_id).map(u => (
                      <button
                        key={u.id}
                        onClick={() => setSelectedMemberIds(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-bold transition-all ${selectedMemberIds.includes(u.id) ? "bg-primary/10 text-primary" : "text-slate-500 hover:bg-black/40"}`}
                      >
                        {u.username}
                        {selectedMemberIds.includes(u.id) && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setShowCreateGroup(false); setSelectedMemberIds([]); }} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Abbrechen</button>
                  <button onClick={submitCreateGroup} disabled={busyGroup} className="flex-1 bg-white text-black py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-primary transition-all flex items-center justify-center gap-2">
                    {busyGroup ? <Loader2 size={16} className="animate-spin" /> : "Erstellen"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showAddMembers && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6" onClick={() => { setShowAddMembers(false); setSelectedMemberIds([]); }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#000000] border-2 border-[#2ba1b9]/20 rounded-[32px] p-8 w-full max-w-md shadow-2xl backdrop-blur-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="font-unbounded text-sm font-bold text-white uppercase tracking-widest italic mb-2">Mitglieder hinzufügen</h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-6 ml-1">Gruppe: {activeChannel?.name}</p>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Neue Mitglieder auswählen</label>
                  <div className="max-h-64 overflow-y-auto space-y-1 bg-black/20 rounded-xl p-2 border border-white/5 no-scrollbar">
                    {users.filter(u => u.id !== user?.user_id && !(activeChannel.members || []).includes(u.id)).map(u => (
                      <button
                        key={u.id}
                        onClick={() => setSelectedMemberIds(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-bold transition-all ${selectedMemberIds.includes(u.id) ? "bg-primary/10 text-primary" : "text-slate-500 hover:bg-black/40"}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full overflow-hidden bg-slate-800">
                            {u.avatar_url ? <img src={getAvatarUrlLocal(u.avatar_url)!} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-primary/10" />}
                          </div>
                          {u.username}
                        </div>
                        {selectedMemberIds.includes(u.id) && <Check size={14} />}
                      </button>
                    ))}
                    {users.filter(u => u.id !== user?.user_id && !(activeChannel.members || []).includes(u.id)).length === 0 && (
                      <p className="text-center py-8 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Alle Mitglieder sind bereits in der Gruppe</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setShowAddMembers(false); setSelectedMemberIds([]); }} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Abbrechen</button>
                  <button onClick={submitAddMembers} disabled={busyGroup || selectedMemberIds.length === 0} className="flex-1 bg-white text-black py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-primary transition-all flex items-center justify-center gap-2 disabled:opacity-30">
                    {busyGroup ? <Loader2 size={16} className="animate-spin" /> : "Hinzufügen"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showLeaveConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setShowLeaveConfirm(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="glass-card w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <LogOutIcon className="text-red-500" size={32} />
              </div>
              <h3 className="font-unbounded text-sm font-bold text-white text-center uppercase tracking-widest italic mb-2">Gruppe verlassen?</h3>
              <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest mb-8">Möchtest du "{activeChannel?.name}" wirklich verlassen?</p>
              <div className="flex gap-3">
                <button onClick={() => setShowLeaveConfirm(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Abbrechen</button>
                <button onClick={leaveGroup} disabled={busyGroup} className="flex-1 bg-red-500 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-600 transition-all flex items-center justify-center gap-2">
                  {busyGroup ? <Loader2 size={16} className="animate-spin" /> : "Verlassen"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showDeleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setShowDeleteConfirm(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="glass-card w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Trash2 className="text-red-500" size={32} />
              </div>
              <h3 className="font-unbounded text-sm font-bold text-white text-center uppercase tracking-widest italic mb-2">Chat löschen?</h3>
              <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest mb-8">Dieser Chat wird unwiderruflich gelöscht.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Abbrechen</button>
                <button onClick={deleteChat} disabled={busyGroup} className="flex-1 bg-red-500 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-600 transition-all flex items-center justify-center gap-2">
                  {busyGroup ? <Loader2 size={16} className="animate-spin" /> : "Löschen"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Check = ({ size }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;

export default Chat;
