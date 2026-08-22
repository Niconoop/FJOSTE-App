import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { createPortal } from 'react-dom';
import { Send, Hash, MessageCircle, Trash2, Loader2, Menu, X as XIcon, Plus, Search, LogOut as LogOutIcon, UserPlus, ChevronRight, Smile, Bold, Italic, Underline, Strikethrough, Code, Calendar, Shield, Wrench, Sparkles, Users } from 'lucide-react';
import { apiService } from '../services/api';
import { toast } from 'sonner';
import axios from 'axios';
import { API_URL, getAvatarUrl } from '../config';
import { motion, AnimatePresence } from 'framer-motion';

const EMOJI_CATEGORIES = [
  {
    name: "Trucker & Fahrt",
    emojis: ["🚛", "🚚", "🚗", "🚦", "🛣️", "⛽", "🔧", "🏁", "🗺️", "🅿️", "⚠️", "🚨", "⚡", "🏔️", "💨"]
  },
  {
    name: "Reaktionen & Stimmung",
    emojis: ["👍", "👎", "👏", "🙌", "❤️", "🔥", "💯", "🚀", "🎉", "✨", "🤝", "💪", "😎", "🥳", "💬"]
  },
  {
    name: "Smileys",
    emojis: ["😀", "😁", "😂", "🤣", "😃", "😄", "😅", "😆", "😉", "😊", "😋", "😍", "🤩", "😘", "😜"]
  }
];

// Helper to check if text contains ONLY emojis
const isOnlyEmojis = (str: string) => {
  if (!str) return false;
  const clean = str.trim();
  const emojiRegex = /^(\p{Extended_Pictographic}|\s)+$/u;
  return emojiRegex.test(clean);
};

// Formatted Message renderer with Jumbo Emoji support
const FormattedMessage = ({ text }: { text: string }) => {
  if (!text) return null;
  const trimmed = text.trim();

  // If message is ONLY emojis, render in Jumbo size!
  if (isOnlyEmojis(trimmed)) {
    const charCount = Array.from(trimmed.replace(/\s+/g, '')).length;
    const sizeClass = charCount <= 2 ? "text-5xl my-1" : charCount <= 5 ? "text-3xl my-1" : "text-2xl my-0.5";
    return <div className={`${sizeClass} leading-relaxed select-text tracking-wider`}>{trimmed}</div>;
  }

  // Parse formatting rules: **bold**, *italic*, <u>underline</u>, ~~strikethrough~~, `code`
  const parseFormatting = (input: string) => {
    let html = input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-amber-200/90">$1</em>')
      .replace(/_([^_]+)_/g, '<em class="italic text-amber-200/90">$1</em>')
      .replace(/~~(.*?)~~/g, '<del class="line-through opacity-60">$1</del>')
      .replace(/&lt;u&gt;(.*?)&lt;\/u&gt;/gi, '<u class="underline decoration-amber-400/60 decoration-2 underline-offset-2">$1</u>')
      .replace(/`([^`]+)`/g, '<code class="bg-black/50 border border-amber-500/20 px-1.5 py-0.5 rounded text-amber-400 font-mono text-xs">$1</code>');

    return { __html: html };
  };

  return (
    <div
      className="text-sm font-medium leading-relaxed break-words text-slate-100 select-text"
      dangerouslySetInnerHTML={parseFormatting(text)}
    />
  );
};

const Chat = ({ selectedChannelId, onClearSelectedId }: any) => {
  const { user, isAdmin, hasRole } = useAuth();
  const HR_ROLES = ["hr team", "hr-team", "personal team", "personal-team"];
  const canManageChat = isAdmin || hasRole(HR_ROLES);
  const [channels, setChannels] = useState<any[]>([]);
  const [activeChannel, setActiveChannel] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const knownIds = useRef(new Set());
  const pollRef = useRef<any>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [busyGroup, setBusyGroup] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [search, setSearch] = useState("");

  // Load basic data
  useEffect(() => {
    const loadBasics = async () => {
      // 1. Load channels (isolated so user permission errors do not block chat loading)
      try {
        const cRes = await axios.get(`${API_URL}/chat/channels`);
        const ch = Array.isArray(cRes.data) ? cRes.data : (cRes.data?.data || []);
        setChannels(ch);
        if (ch.length > 0 && !activeChannel && !selectedChannelId) setActiveChannel(ch[0]);
      } catch (err) {
        console.error("Fehler beim Laden der Chat-Kanäle:", err);
      }

      // 2. Load users for DM/group selection (admin list with fallback to public members list)
      try {
        let uList: any[] = [];
        try {
          const uRes = await axios.get(`${API_URL}/management/users`);
          uList = Array.isArray(uRes.data) ? uRes.data : (uRes.data?.data || []);
        } catch {
          const mRes = await axios.get(`${API_URL}/members`);
          uList = Array.isArray(mRes.data) ? mRes.data : (mRes.data?.data || []);
        }
        setUsers(uList);
      } catch (err) {
        console.error("Fehler beim Laden der Mitgliederliste:", err);
      }
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

      // Re-fetch all channels so the channels state has full peer_name and members_info
      let fullChannels: any[] = [];
      try {
        const cRes = await axios.get(`${API_URL}/chat/channels`);
        fullChannels = cRes.data || [];
        if (Array.isArray(fullChannels) && fullChannels.length > 0) {
          setChannels(fullChannels);
        }
      } catch (e) { }

      let activeCh = fullChannels.find((c: any) => String(c.id) === String(ch.id)) || ch;

      // If activeCh is missing driver name/avatar, construct from users list
      const targetUser = users.find(u => String(u.id) === String(peerId) || String(u.user_id) === String(peerId));
      if (targetUser) {
        const peerName = targetUser.username || targetUser.name || "Fahrer";
        activeCh = {
          ...activeCh,
          name: peerName,
          peer_name: peerName,
          peer_user_id: targetUser.id || targetUser.user_id,
          peer_avatar: targetUser.custom_avatar_url || targetUser.avatar_url,
          members_info: activeCh.members_info || [
            { id: user?.user_id || user?.id, username: user?.username },
            { id: targetUser.id || targetUser.user_id, username: peerName, avatar_url: targetUser.custom_avatar_url || targetUser.avatar_url }
          ]
        };
      }

      setChannels(prev => {
        const exists = prev.some(c => String(c.id) === String(activeCh.id));
        return exists ? prev.map(c => String(c.id) === String(activeCh.id) ? activeCh : c) : [...prev, activeCh];
      });
      setActiveChannel(activeCh);
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
      const cRes = await axios.get(`${API_URL}/chat/channels`);
      const updatedChannels = cRes.data;
      setChannels(updatedChannels);
      const createdCh = updatedChannels.find((c: any) => String(c.id) === String(r.data?.id)) || {
        id: r.data?.id,
        name: groupName,
        is_group: 1,
        is_custom_group: 1,
        created_by: user?.user_id || user?.id,
        members: selectedMemberIds
      };
      setActiveChannel(createdCh);
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

  const handleRemoveMember = async (memberId: any) => {
    if (!activeChannel) return;
    try {
      setBusyGroup(true);
      const res = await axios.post(`${API_URL}/chat/channels/${activeChannel.id}/remove-member`, { user_id: memberId });
      const updatedMembers = (activeChannel.members || []).filter((m: any) => String(m) !== String(memberId));
      const updatedMembersInfo = (activeChannel.members_info || []).filter((m: any) => String(m.id) !== String(memberId));
      
      if (res.data?.deleted || updatedMembers.length <= 1) {
        toast.success("Gruppe wurde gelöscht (weniger als 2 Mitglieder)");
        const cRes = await axios.get(`${API_URL}/chat/channels`);
        const chs = cRes.data;
        setChannels(chs);
        setActiveChannel(chs.length > 0 ? chs[0] : null);
        setShowMembersModal(false);
      } else {
        toast.success("Mitglied aus der Gruppe entfernt");
        const newActive = { ...activeChannel, members: updatedMembers, members_info: updatedMembersInfo };
        setActiveChannel(newActive);
        setChannels(prev => prev.map(ch => ch.id === activeChannel.id ? newActive : ch));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || "Fehler beim Entfernen");
    } finally {
      setBusyGroup(false);
    }
  };

  const handleToggleSettings = async (onlyOwnerCanAdd: boolean) => {
    if (!activeChannel) return;
    try {
      const val = onlyOwnerCanAdd ? 1 : 0;
      await axios.post(`${API_URL}/api/chat/channels/${activeChannel.id}/settings`, { only_owner_can_add: val }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('opc_token')}` }
      });
      toast.success(onlyOwnerCanAdd ? "Nur Ersteller kann neue Mitglieder hinzufügen" : "Jedes Mitglied kann neue Mitglieder hinzufügen");
      const newActive = { ...activeChannel, only_owner_can_add: val };
      setActiveChannel(newActive);
      setChannels(prev => prev.map(ch => ch.id === activeChannel.id ? newActive : ch));
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || "Fehler beim Speichern");
    }
  };

  const getAvatarUrlLocal = (url?: string) => getAvatarUrl(url);

  const getRoleColor = (role?: any) => {
    if (!role) return '#94a3b8';
    const r = String(typeof role === 'object' ? role.name || '' : role).toLowerCase();
    if (r.includes('inhaber') || r.includes('owner') || r.includes('leitung') || r.includes('management')) return '#f59e0b';
    if (r.includes('admin') || r.includes('developer') || r.includes('entwickler')) return '#ef4444';
    if (r.includes('personal') || (r !== 'fahrer' && r !== 'probefahrer' && r !== 'driver' && /\bhr\b/.test(r))) return '#3b82f6';
    if (r.includes('event')) return '#a855f7';
    if (r.includes('mod')) return '#10b981';
    return '#94a3b8';
  };

  const getUserRole = (userId: any, msg?: any) => {
    const foundUser = users.find(u => String(u.id) === String(userId) || u.username === msg?.username);
    let r: any = (foundUser as any)?.role_obj?.name || (typeof (foundUser as any)?.role === 'object' ? (foundUser as any)?.role?.name : (foundUser as any)?.role);
    if (!r || r === 'driver') {
      r = typeof msg?.role === 'object' ? msg.role.name : msg?.role;
    }
    if (!r) r = 'Fahrer';
    if (r === 'driver') r = 'Fahrer';
    if (r === 'admin') r = 'Admin';
    return String(r);
  };

  const getUserRoleColor = (userId: any, msg?: any) => {
    const r = getUserRole(userId, msg);
    return getRoleColor(r);
  };

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

  const STANDARD_NAMES = ["allgemein", "konvois", "event-team", "personal-team", "hr-team", "modding-team", "management"];

  const isStandardChannel = (ch: any) => {
    if (!ch) return false;
    const name = (ch.name || "").toLowerCase().trim();
    return STANDARD_NAMES.includes(name);
  };

  const isCustomGroupChannel = (ch: any) => {
    if (!ch) return false;
    if (isStandardChannel(ch)) return false;
    const isCustom = ch.is_custom_group === 1 || ch.is_custom_group === "1" || ch.is_custom_group === true;
    const isGrp = ch.is_group === 1 || ch.is_group === "1" || ch.is_group === true;
    const memCount = getChannelMemberIds(ch).length;
    const hasMultipleMembers = memCount > 2;
    const isExplicitGroup = Boolean(ch.created_by && ch.name && ch.name !== "Direktnachricht");
    return isCustom || isGrp || hasMultipleMembers || isExplicitGroup;
  };

  const isDmChannel = (ch: any) => {
    if (!ch) return false;
    if (isStandardChannel(ch)) return false;
    if (isCustomGroupChannel(ch)) return false;
    return true;
  };

  const getChannelMemberIds = (ch: any) => {
    if (!ch) return [];
    if (Array.isArray(ch.members_info) && ch.members_info.length > 0) {
      return ch.members_info.map((m: any) => String(m.id));
    }
    if (Array.isArray(ch.members)) {
      return ch.members.map((m: any) => String(m));
    }
    if (typeof ch.members === 'string' && ch.members !== '*') {
      try {
        return JSON.parse(ch.members).map((m: any) => String(m));
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  const getDmPeer = (ch: any) => {
    if (!ch) return { name: "Direktnachricht", avatar: null };
    const currentUserId = String(user?.user_id || user?.id || user?.uid || "").trim();
    const currentUsername = String(user?.username || "").trim().toLowerCase();

    // 1. Check members_info
    if (Array.isArray(ch.members_info) && ch.members_info.length > 0) {
      const peerObj = ch.members_info.find((m: any) =>
        String(m.id) !== currentUserId &&
        String(m.user_id || m.id) !== currentUserId &&
        String(m.username || "").trim().toLowerCase() !== currentUsername
      );
      if (peerObj) {
        return {
          name: peerObj.username || peerObj.name || (ch.name && ch.name !== "Direktnachricht" ? ch.name : "Fahrer"),
          avatar: peerObj.avatar_url || peerObj.custom_avatar_url || ch.peer_avatar || null
        };
      }
    }

    // 2. Extract member IDs
    let memIds: any[] = [];
    if (Array.isArray(ch.members)) {
      memIds = [...ch.members];
    } else if (typeof ch.members === 'string' && ch.members !== '*') {
      try { memIds = JSON.parse(ch.members); } catch (e) { memIds = []; }
    }
    if (ch.peer_user_id) memIds.push(ch.peer_user_id);

    const peerId = memIds.find(mId =>
      String(mId) !== currentUserId
    ) || memIds[0];

    if (peerId) {
      const uObj = users.find(u =>
        String(u.id) === String(peerId) ||
        String(u.user_id || u.id) === String(peerId) ||
        String(u.uid || "") === String(peerId)
      );
      if (uObj) {
        return {
          name: uObj.username || uObj.name || (ch.name && ch.name !== "Direktnachricht" ? ch.name : "Fahrer"),
          avatar: uObj.custom_avatar_url || uObj.avatar_url || ch.peer_avatar || null
        };
      }
    }

    // 3. Fallback to channel name if it's a specific username
    const channelName = ch.name && ch.name !== "Direktnachricht" ? ch.name : null;
    if (channelName) {
      const uObj = users.find(u => (u.username || "").trim().toLowerCase() === channelName.trim().toLowerCase());
      if (uObj) {
        return {
          name: uObj.username,
          avatar: uObj.custom_avatar_url || uObj.avatar_url || ch.peer_avatar || null
        };
      }
      return { name: channelName, avatar: ch.peer_avatar || null };
    }

    // 4. Fallback to peer_name on channel object
    if (ch.peer_name && ch.peer_name !== "Direktnachricht") {
      return { name: ch.peer_name, avatar: ch.peer_avatar || null };
    }

    return { name: "Fahrer", avatar: ch.peer_avatar || null };
  };

  const getComputedMembers = (ch: any) => {
    if (!ch) return [];
    let rawList: any[] = [];
    if (Array.isArray(ch.members_info) && ch.members_info.length > 0) {
      rawList = ch.members_info
        .filter((m: any) => Boolean(m))
        .map((m: any) => {
          const mId = m.id || m.user_id || m.uid;
          const uObj = users.find(u => String(u.id) === String(mId) || String(u.user_id) === String(mId)) || m;
          return {
            ...m,
            id: mId || Math.random(),
            username: uObj?.username || m.username || "Fahrer",
            avatar_url: uObj?.custom_avatar_url || uObj?.avatar_url || m.avatar_url,
            role: getUserRole(mId, uObj)
          };
        });
    } else {
      let memIds: any[] = [];
      if (Array.isArray(ch.members)) {
        memIds = ch.members;
      } else if (typeof ch.members === 'string' && ch.members !== '*') {
        try { memIds = JSON.parse(ch.members); } catch (e) { memIds = []; }
      }
      if (Array.isArray(memIds) && memIds.length > 0) {
        rawList = memIds.filter(mId => Boolean(mId)).map(mId => {
          const uObj = users.find(u => String(u.id) === String(mId) || String(u.user_id) === String(mId));
          return {
            id: mId,
            username: uObj?.username || "Fahrer",
            avatar_url: uObj?.custom_avatar_url || uObj?.avatar_url || `/api/auth/avatar/${mId}`,
            role: getUserRole(mId, uObj)
          };
        });
      } else if (ch.is_group === 1 || ch.is_group === "1" || ch.is_group === true || isStandardChannel(ch)) {
        rawList = (users || []).map(uObj => ({
          id: uObj.id || uObj.user_id,
          username: uObj.username || "Fahrer",
          avatar_url: uObj.custom_avatar_url || uObj.avatar_url || `/api/auth/avatar/${uObj.id}`,
          role: getUserRole(uObj.id || uObj.user_id, uObj)
        }));
      }
    }

    if (isStandardChannel(ch)) {
      const chName = (ch.name || "").toLowerCase().trim();
      if (chName === 'allgemein' || chName === 'konvois') {
        return rawList;
      }
      return rawList.filter((m: any) => {
        if (!m) return false;
        const uRole = String(m.role || getUserRole(m.id, m) || "").toLowerCase();
        const isRealAdmin = ['admin', 'inhaber', 'owner', 'management', 'leitung'].some(k => uRole.includes(k));
        if (isRealAdmin) return true;
        if (chName.includes('event')) return uRole.includes('event');
        if (chName.includes('personal') || chName.includes('hr')) {
          return uRole.includes('personal') || (uRole !== 'fahrer' && uRole !== 'probefahrer' && uRole !== 'driver' && /\bhr\b/.test(uRole));
        }
        if (chName.includes('modding') || chName.includes('mod')) return uRole.includes('modding') || uRole.includes('mod');
        if (chName.includes('management') || chName.includes('leitung')) return uRole.includes('management') || uRole.includes('inhaber') || uRole.includes('admin');
        return false;
      });
    }

    return rawList;
  };

  const activeMembers = getComputedMembers(activeChannel);

  const isCreatorOrAdmin = Boolean(
    activeChannel && (
      String(user?.user_id || user?.id) === String(activeChannel.created_by) || canManageChat
    )
  );

  const canAddMembers = Boolean(
    isCustomGroupChannel(activeChannel) && (
      !activeChannel?.only_owner_can_add || isCreatorOrAdmin
    )
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden relative">

      {/* Drawer Overlay for Mobile */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
        />
      )}

      {/* Sidebar */}
      <div className={`w-64 border-r border-white/5 bg-black/40 backdrop-blur-2xl flex flex-col shrink-0 transition-all duration-300 ${drawerOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"} absolute md:static top-0 bottom-0 z-40`}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="font-unbounded text-[10px] font-black text-white uppercase tracking-widest italic">Kanäle</h2>
          <button onClick={() => setShowCreateGroup(true)} className="p-1.5 hover:bg-amber-400/10 rounded-lg text-amber-400 transition-all">
            <Plus size={18} />
          </button>
        </div>
        <div className="p-4 border-b border-white/5">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Suchen..."
              className="w-full bg-black/30 border border-white/5 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-primary/30 outline-none transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
          {/* Standard Kanäle */}
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2 mb-2 italic">Standard Kanäle</p>
            <div className="space-y-1">
              {channels
                .filter(ch => isStandardChannel(ch) && (ch.name || "").toLowerCase().includes(search.trim().toLowerCase()))
                .map(ch => {
                  const lowerName = (ch.name || "").toLowerCase();
                  const renderChannelIcon = () => {
                    if (lowerName.includes('event')) return <Calendar size={16} className="shrink-0 text-amber-400" />;
                    if (lowerName.includes('personal') || lowerName.includes('hr')) return <Shield size={16} className="shrink-0 text-amber-400" />;
                    if (lowerName.includes('modding') || lowerName.includes('mod')) return <Wrench size={16} className="shrink-0 text-amber-400" />;
                    return <Hash size={16} className="shrink-0 text-amber-500/80" />;
                  };

                  return (
                    <button
                      key={ch.id}
                      onClick={() => { setActiveChannel(ch); setDrawerOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all hover-glow ${activeChannel?.id === ch.id ? "bg-primary/10 text-primary border border-primary/20" : "text-slate-400 hover:text-white hover:bg-black/40 border border-transparent"}`}
                    >
                      {renderChannelIcon()}
                      <span className="truncate flex-1 text-left">{ch.name}</span>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Gruppenchats */}
          <div>
            <div className="flex items-center justify-between px-2 mb-2">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Gruppenchats</p>
              <button onClick={() => setShowCreateGroup(true)} className="p-1 hover:bg-amber-400/10 rounded-lg text-amber-400 transition-all" title="Gruppe erstellen">
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-1">
              {channels
                .filter(ch => isCustomGroupChannel(ch) && (ch.name || "").toLowerCase().includes(search.trim().toLowerCase()))
                .map(ch => (
                  <button
                    key={ch.id}
                    onClick={() => { setActiveChannel(ch); setDrawerOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all hover-glow ${activeChannel?.id === ch.id ? "bg-primary/10 text-primary border border-primary/20" : "text-slate-400 hover:text-white hover:bg-black/40 border border-transparent"}`}
                  >
                    <Users size={16} className="shrink-0 text-amber-400" />
                    <span className="truncate flex-1 text-left">{ch.name}</span>
                  </button>
                ))}
            </div>
          </div>

          {/* Direktnachrichten */}
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2 mb-2 italic">Direktnachrichten</p>
            <div className="space-y-1">
              {channels
                .filter(ch => isDmChannel(ch))
                .map(ch => {
                  const peer = getDmPeer(ch);
                  if (search.trim() && !peer.name.toLowerCase().includes(search.trim().toLowerCase())) return null;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => { setActiveChannel(ch); setDrawerOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all hover-glow ${activeChannel?.id === ch.id ? "bg-primary/10 text-primary border border-primary/20" : "text-slate-400 hover:text-white hover:bg-black/40 border border-transparent"}`}
                    >
                      <div className="w-5 h-5 rounded-full bg-black border border-white/10 overflow-hidden shrink-0">
                        {peer.avatar ? (
                          <img src={getAvatarUrlLocal(peer.avatar)!} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-amber-400/20 flex items-center justify-center text-[9px] font-black text-amber-400 uppercase">
                            {peer.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <span className="truncate flex-1 text-left">{peer.name}</span>
                    </button>
                  );
                })}

              {users
                .filter(u => {
                  const curId = String(user?.user_id || user?.id || user?.uid || "").trim();
                  const curName = String(user?.username || "").trim().toLowerCase();
                  if (curId && (String(u.id) === curId || String(u.user_id) === curId)) return false;
                  if (curName && String(u.username || "").trim().toLowerCase() === curName) return false;
                  return true;
                })
                .filter(u => !channels.some(ch =>
                  isDmChannel(ch) && (
                    ch.members_info?.some((m: any) => String(m.id) === String(u.id) || String(m.user_id) === String(u.id)) ||
                    getChannelMemberIds(ch).includes(String(u.id)) ||
                    (ch.peer_user_id && String(ch.peer_user_id) === String(u.id))
                  )
                ))
                .filter(u => (u.username || "").toLowerCase().includes(search.trim().toLowerCase()))
                .map(u => (
                  <button
                    key={u.id}
                    onClick={() => startDM(u.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-white hover:bg-black/40 transition-all truncate border border-transparent"
                  >
                    <div className="w-5 h-5 rounded-full bg-black border border-white/5 overflow-hidden shrink-0">
                      {u.avatar_url ? <img src={getAvatarUrlLocal(u.avatar_url)!} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-primary/20 flex items-center justify-center text-[9px] font-black text-amber-400">{u.username?.charAt(0)}</div>}
                    </div>
                    <span className="truncate">{u.username}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white/[0.05] backdrop-blur-2xl backdrop-saturate-150">
        {/* Chat Header */}
        <div className="min-h-[4.5rem] py-3 border-b border-white/5 flex items-center px-6 shrink-0 bg-black/20 gap-4 overflow-visible">
          <button onClick={() => setDrawerOpen(true)} className="md:hidden p-2 hover:bg-white/5 rounded-xl text-slate-500">
            <Menu size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="font-unbounded text-xs font-black text-white uppercase tracking-widest italic flex items-center gap-2 leading-normal">
              {activeChannel ? (
                isCustomGroupChannel(activeChannel) ? (
                  <Users size={14} className="text-amber-400 shrink-0" />
                ) : isStandardChannel(activeChannel) ? (
                  <Hash size={14} className="text-amber-400 shrink-0" />
                ) : (
                  (() => {
                    const peer = getDmPeer(activeChannel);
                    return peer.avatar ? (
                      <div className="w-5 h-5 rounded-full overflow-hidden border border-white/10 shrink-0">
                        <img src={getAvatarUrlLocal(peer.avatar)!} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <MessageCircle size={14} className="text-amber-400 shrink-0" />
                    );
                  })()
                )
              ) : null}
              <span className="truncate">{activeChannel ? (isDmChannel(activeChannel) ? getDmPeer(activeChannel).name : activeChannel.name) : "Wähle einen Chat"}</span>
            </h3>
            {Boolean(activeChannel && (isStandardChannel(activeChannel) || isCustomGroupChannel(activeChannel) || activeChannel.is_group === 1 || activeChannel.is_group === "1" || activeChannel.is_group === true)) && activeMembers.length > 0 && (
              <button
                onClick={() => setShowMembersModal(true)}
                className="flex items-center gap-2 text-left group/m hover:opacity-90 transition-all mt-1"
                title="Alle Mitglieder anzeigen"
              >
                <div className="flex items-center -space-x-2 overflow-hidden">
                  {activeMembers.slice(0, 3).map((m: any, idx: number) => (
                    <div
                      key={m?.id || m?.user_id || idx}
                      className="relative w-5 h-5 rounded-full border-2 border-zinc-950 bg-black overflow-hidden shrink-0 shadow-md transition-transform group-hover/m:scale-105"
                      style={{ zIndex: 3 - idx }}
                    >
                      {getAvatarUrlLocal(m?.avatar_url) ? (
                        <img src={getAvatarUrlLocal(m?.avatar_url)!} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-amber-400/20 flex items-center justify-center text-[8px] font-black text-amber-400 uppercase">
                          {(m?.username || "M").charAt(0)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <span className="text-[9px] font-bold text-slate-400 group-hover/m:text-amber-400 transition-colors uppercase tracking-tight">
                  {activeMembers.length > 3
                    ? `+${activeMembers.length - 3} (${activeMembers.length})`
                    : `${activeMembers.length} ${activeMembers.length === 1 ? 'Mitglied' : 'Mitglieder'}`}
                </span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Custom Group Chats: Add Members & Leave Group buttons */}
            {isCustomGroupChannel(activeChannel) && (
              <>
                <button
                  onClick={() => {
                    setSelectedMemberIds([]);
                    setShowAddMembers(true);
                  }}
                  className="p-2 text-slate-500 hover:text-primary transition-all"
                  title="Mitglieder hinzufügen"
                >
                  <UserPlus size={18} />
                </button>
                <button
                  onClick={() => setShowLeaveConfirm(true)}
                  className="p-2 text-slate-500 hover:text-red-500 transition-all"
                  title="Gruppe verlassen"
                >
                  <LogOutIcon size={18} />
                </button>
              </>
            )}
            {/* 1-on-1 Direct Messages: Delete Chat button */}
            {Boolean(activeChannel && !activeChannel.is_group && !isCustomGroupChannel(activeChannel)) && (
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
            const currentUserId = String(user?.user_id || user?.id || user?.uid || "").trim();
            const currentUsername = String(user?.username || "").trim().toLowerCase();
            const msgUserId = String(msg.user_id || msg.sender_id || "").trim();
            const msgUsername = String(msg.username || "").trim().toLowerCase();
            const isOwn = Boolean(
              (currentUserId && msgUserId && currentUserId === msgUserId) ||
              (currentUsername && msgUsername && currentUsername === msgUsername)
            );
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
                      {!isOwn && (
                        <div className="flex items-center gap-2 mb-1 ml-1 flex-wrap">
                          <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest italic">
                            {msg.username}
                          </p>
                          <span
                            className="text-[8px] font-black px-1.5 py-0.5 rounded bg-white/5 border uppercase tracking-widest font-unbounded leading-none text-center"
                            style={{ color: getUserRoleColor(msg.user_id, msg), borderColor: `${getUserRoleColor(msg.user_id, msg)}33` }}
                          >
                            {getUserRole(msg.user_id, msg)}
                          </span>
                        </div>
                      )}
                      <div className={`px-4 py-3 rounded-2xl text-sm relative transition-all border ${isOwn ? "bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border-amber-500/20 text-white rounded-tr-none" : "bg-white/[0.02] border-white/5 text-zinc-300 rounded-tl-none hover:border-white/10"}`}>
                        <FormattedMessage text={msg.content} />
                        <div className={`flex items-center gap-2 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
                          <span className={`text-[8px] font-black uppercase tracking-tighter ${isOwn ? "text-white/40" : "text-slate-600"}`}>
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
          <div className="p-6 bg-black/40 border-t border-white/5 relative">
            {showEmojiPicker && createPortal(
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                className="fixed frosted-card !p-0 !shadow-none z-[102] border border-white/10 w-80"
                style={{ bottom: 80, right: 24, background: "rgba(13,15,23,0.18) !important", backdropFilter: "blur(12px) saturate(160%) contrast(102%) !important", WebkitBackdropFilter: "blur(12px) saturate(160%) contrast(102%) !important" }}
              >
                <div className="flex items-center justify-between p-3 border-b border-white/5">
                  <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">Emojis wählen</span>
                  <button onClick={() => setShowEmojiPicker(false)} className="text-slate-500 hover:text-white p-1">
                    <X size={14} />
                  </button>
                </div>
                <div className="p-3 space-y-3 overflow-y-auto no-scrollbar max-h-72">
                  {EMOJI_CATEGORIES.map((cat, idx) => (
                    <div key={idx} className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">{cat.name}</span>
                      <div className="grid grid-cols-6 gap-1">
                        {cat.emojis.map((emoji, eIdx) => (
                          <button
                            key={eIdx}
                            type="button"
                            onClick={() => {
                              setInput(prev => prev + emoji);
                              setShowEmojiPicker(false);
                            }}
                            className="w-9 h-9 flex items-center justify-center text-lg hover:bg-white/10 rounded-xl transition-all hover:scale-125"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>,
              document.body
            )}

            <form onSubmit={handleSend} className="chat-form flex gap-2 items-center bg-white/[0.01] border border-white/5 rounded-2xl p-2 focus-within:border-[#f59e0b]/30 transition-all shadow-inner">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Deine Nachricht... (**fett**, *kursiv*, <u>unterstrichen</u>, ~~durchgestrichen~~, `code`)"
                className="flex-1 bg-transparent border-none outline-none ring-0 focus:ring-0 px-4 text-sm text-white placeholder:text-slate-600"
                style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
              />

              {/* Formatting Toolbar */}
              <div className="flex items-center gap-0.5 bg-black/40 border border-white/5 rounded-xl p-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setInput(prev => `${prev}**Fett**`)}
                  className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-white/5 rounded-lg transition-all"
                  title="Fett (**Text**)"
                >
                  <Bold size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setInput(prev => `${prev}*Kursiv*`)}
                  className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-white/5 rounded-lg transition-all"
                  title="Kursiv (*Text*)"
                >
                  <Italic size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setInput(prev => `${prev}<u>Unterstrichen</u>`)}
                  className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-white/5 rounded-lg transition-all"
                  title="Unterstrichen (<u>Text</u>)"
                >
                  <Underline size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setInput(prev => `${prev}~~Durchgestrichen~~`)}
                  className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-white/5 rounded-lg transition-all"
                  title="Durchgestrichen (~~Text~~)"
                >
                  <Strikethrough size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setInput(prev => `${prev}\`Code\``)}
                  className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-white/5 rounded-lg transition-all"
                  title="Code (`Text`)"
                >
                  <Code size={15} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowEmojiPicker(prev => !prev)}
                className={`p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-white/5 transition-all ${showEmojiPicker ? "text-amber-400 bg-white/5" : ""}`}
                title="Emoji auswählen"
              >
                <Smile size={20} />
              </button>

              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="w-10 h-10 rounded-xl bg-amber-400 hover:bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreateGroup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex items-start justify-center p-6 pt-28 bg-black/90 backdrop-blur-xl" onClick={() => { setShowCreateGroup(false); setSelectedMemberIds([]); }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="frosted-card bg-zinc-950/95 !p-0 overflow-hidden shadow-2xl border border-white/10 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                <h3 className="font-unbounded text-xs font-bold text-white uppercase italic tracking-widest">Neue Gruppe erstellen</h3>
                <button onClick={() => { setShowCreateGroup(false); setSelectedMemberIds([]); }} className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                  <XIcon size={18} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Gruppenname</label>
                  <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Z.B. Event-Team" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-400/30 outline-none transition-all" autoFocus />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Mitglieder auswählen</label>
                  <div className="max-h-48 overflow-y-auto space-y-1 bg-black/20 rounded-xl p-2 border border-white/5 no-scrollbar">
                    {users.filter(u => {
                      const curId = String(user?.user_id || user?.id || user?.uid || "").trim();
                      const curName = String(user?.username || "").trim().toLowerCase();
                      if (curId && (String(u.id) === curId || String(u.user_id) === curId)) return false;
                      if (curName && String(u.username || "").trim().toLowerCase() === curName) return false;
                      return (u.username || "").toLowerCase().includes(search.trim().toLowerCase());
                    }).map(u => (
                      <button
                        key={u.id}
                        onClick={() => setSelectedMemberIds(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-bold transition-all border ${selectedMemberIds.includes(u.id) ? "bg-amber-400/10 text-amber-400 border-amber-400/20" : "text-slate-500 hover:bg-black/40 border-transparent"}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full overflow-hidden bg-slate-800 border border-white/10 shrink-0">
                            {u.avatar_url ? <img src={getAvatarUrlLocal(u.avatar_url)!} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-amber-400/20" />}
                          </div>
                          <span>{u.username}</span>
                        </div>
                        {selectedMemberIds.includes(u.id) && <Check size={14} className="text-amber-400" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setShowCreateGroup(false); setSelectedMemberIds([]); }} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Abbrechen</button>
                  <button onClick={submitCreateGroup} disabled={busyGroup || !groupName.trim() || selectedMemberIds.length === 0} className="flex-1 bg-amber-400 text-black py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-white transition-all flex items-center justify-center gap-2 disabled:opacity-30">
                    {busyGroup ? <Loader2 size={16} className="animate-spin" /> : "Erstellen"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showAddMembers && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex items-start justify-center p-6 pt-28 bg-black/90 backdrop-blur-xl" onClick={() => { setShowAddMembers(false); setSelectedMemberIds([]); }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="frosted-card bg-zinc-950/95 !p-0 overflow-hidden shadow-2xl border border-white/10 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                <h3 className="font-unbounded text-xs font-bold text-white uppercase italic tracking-widest">Mitglieder hinzufügen</h3>
                <button onClick={() => { setShowAddMembers(false); setSelectedMemberIds([]); }} className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                  <XIcon size={18} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">Gruppe: {activeChannel?.name}</p>
                <div className="max-h-64 overflow-y-auto space-y-1 bg-black/20 rounded-xl p-2 border border-white/5 no-scrollbar">
                  {users.filter(u => {
                    const curId = String(user?.user_id || user?.id || user?.uid || "").trim();
                    const curName = String(user?.username || "").trim().toLowerCase();
                    if (curId && (String(u.id) === curId || String(u.user_id) === curId)) return false;
                    if (curName && String(u.username || "").trim().toLowerCase() === curName) return false;
                    return !getChannelMemberIds(activeChannel).includes(String(u.id));
                  }).map(u => (
                    <button
                      key={u.id}
                      onClick={() => setSelectedMemberIds(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-bold transition-all border ${selectedMemberIds.includes(u.id) ? "bg-amber-400/10 text-amber-400 border-amber-400/20" : "text-slate-500 hover:bg-black/40 border-transparent"}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full overflow-hidden bg-slate-800 border border-white/10 shrink-0">
                          {u.avatar_url ? <img src={getAvatarUrlLocal(u.avatar_url)!} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-amber-400/20" />}
                        </div>
                        <span>{u.username}</span>
                      </div>
                      {selectedMemberIds.includes(u.id) && <Check size={14} className="text-amber-400" />}
                    </button>
                  ))}
                  {users.filter(u => {
                    const curId = String(user?.user_id || user?.id || user?.uid || "").trim();
                    const curName = String(user?.username || "").trim().toLowerCase();
                    if (curId && (String(u.id) === curId || String(u.user_id) === curId)) return false;
                    if (curName && String(u.username || "").trim().toLowerCase() === curName) return false;
                    return !getChannelMemberIds(activeChannel).includes(String(u.id));
                  }).length === 0 && (
                    <p className="text-center py-8 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Alle Mitglieder sind bereits in der Gruppe</p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setShowAddMembers(false); setSelectedMemberIds([]); }} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Abbrechen</button>
                  <button onClick={submitAddMembers} disabled={busyGroup || selectedMemberIds.length === 0} className="flex-1 bg-amber-400 text-black py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-white transition-all flex items-center justify-center gap-2 disabled:opacity-30">
                    {busyGroup ? <Loader2 size={16} className="animate-spin" /> : "Hinzufügen"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showMembersModal && activeChannel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl" onClick={() => setShowMembersModal(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="frosted-card bg-zinc-950/95 !p-0 overflow-hidden shadow-2xl border border-white/10 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-black/40">
                <div>
                  <h3 className="font-unbounded text-xs font-black text-white uppercase italic tracking-widest flex items-center gap-2">
                    <Users size={16} className="text-amber-400" />
                    Mitglieder ({activeMembers.length})
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">{activeChannel.name}</p>
                </div>
                <button onClick={() => setShowMembersModal(false)} className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                  <XIcon size={18} />
                </button>
              </div>

              {/* Creator Settings Toggle */}
              {isCreatorOrAdmin && isCustomGroupChannel(activeChannel) && (
                <div className="px-6 py-3 border-b border-white/5 bg-amber-400/5 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1.5">
                    🔒 Nur Ersteller darf Mitglieder hinzufügen
                  </span>
                  <button
                    onClick={() => handleToggleSettings(!activeChannel.only_owner_can_add)}
                    className={`w-11 h-6 rounded-full p-1 flex items-center transition-all ${activeChannel.only_owner_can_add ? 'bg-amber-400 justify-end' : 'bg-zinc-800 justify-start'}`}
                  >
                    <div className="w-4 h-4 bg-zinc-950 rounded-full shadow-sm" />
                  </button>
                </div>
              )}

              <div className="p-6 max-h-[60vh] overflow-y-auto space-y-2 no-scrollbar">
                {activeMembers.map((m: any) => {
                  const displayRole = getUserRole(m.id, m);
                  const roleColor = getRoleColor(displayRole);
                  const canRemoveThisMember = isCreatorOrAdmin && String(m.id) !== String(activeChannel.created_by) && isCustomGroupChannel(activeChannel);

                  return (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-black border border-white/10 overflow-hidden shrink-0">
                          {m.avatar_url ? (
                            <img src={getAvatarUrlLocal(m.avatar_url)!} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-amber-400/20 flex items-center justify-center text-xs font-black text-amber-400 uppercase">
                              {(m.username || "M").charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white flex items-center gap-2">
                            {m.username}
                            {String(m.id) === String(activeChannel.created_by) && (
                              <span className="text-[8px] bg-amber-400/20 text-amber-400 border border-amber-400/30 px-1.5 py-0.5 rounded font-black uppercase">
                                Ersteller
                              </span>
                            )}
                          </p>
                          <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ color: roleColor }}>
                            {displayRole}
                          </p>
                        </div>
                      </div>

                      {canRemoveThisMember && (
                        <button
                          onClick={() => handleRemoveMember(m.id)}
                          disabled={busyGroup}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                          title="Aus Gruppe entfernen"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}

        {(showLeaveConfirm || showDeleteConfirm) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl" onClick={() => { setShowLeaveConfirm(false); setShowDeleteConfirm(false); }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="frosted-card w-full max-w-sm shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto border border-red-500/20">
                {showLeaveConfirm ? <LogOutIcon className="text-red-500" size={32} /> : <Trash2 className="text-red-500" size={32} />}
              </div>
              <h3 className="font-unbounded text-xs font-bold text-white text-center uppercase italic tracking-widest mb-2">
                {showLeaveConfirm ? "Gruppe verlassen?" : "Chat löschen?"}
              </h3>
              <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest mb-8">
                {showLeaveConfirm ? `Möchtest du "${activeChannel?.name}" wirklich verlassen?` : "Dieser Chat wird unwiderruflich gelöscht."}
              </p>
              <div className="flex gap-3">
                <button onClick={() => { setShowLeaveConfirm(false); setShowDeleteConfirm(false); }} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Abbrechen</button>
                <button onClick={showLeaveConfirm ? leaveGroup : deleteChat} disabled={busyGroup} className="flex-1 bg-red-500 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-600 transition-all flex items-center justify-center gap-2">
                  {busyGroup ? <Loader2 size={16} className="animate-spin" /> : "Bestätigen"}
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

