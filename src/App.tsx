import { useState, useEffect, useCallback, lazy, Suspense, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Bell, Users, LayoutDashboard, Newspaper, Image as ImageIcon, Map as MapIcon, FileText, Settings, X, Minus, Route, LogOut, MessageSquare, Calendar, Menu, Square, Bot, Download, CheckCircle, AlertTriangle, ChevronRight, Monitor } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import OverlayPage from './pages/Overlay';

// Lazy load heavy components
const Map = lazy(() => import('./pages/Map'));
const Admin = lazy(() => import('./pages/Admin'));
const Profile = lazy(() => import('./pages/Profile'));
const Stats = lazy(() => import('./pages/Stats'));
const Team = lazy(() => import('./pages/Team'));
const Reports = lazy(() => import('./pages/Reports'));
const Events = lazy(() => import('./pages/Events'));
const Gallery = lazy(() => import('./pages/Gallery'));
const News = lazy(() => import('./pages/News'));
const Chat = lazy(() => import('./pages/Chat'));
const AfkBot = lazy(() => import('./pages/AfkBot'));
const OverlaySettings = lazy(() => import('./pages/OverlaySettings'));
const Applications = lazy(() => import('./pages/Applications'));
const Database = lazy(() => import('./pages/Database').then(m => ({ default: m.DatabasePage })));

import { useAuth } from './context/AuthContext';
import { AnimatedBackground } from './components/AnimatedBackground';
import { apiService } from './services/api';
import { API_BASE_URL, getAvatarUrl } from './config';
import { toast } from 'sonner';

const PAGE_ORDER = [
  'dashboard',
  'events',
  'news',
  'chat',
  'gallery',
  'statistiken',
  'team',
  'afkbot',
  'profile',
  'reports',
  'admin',
  'applications',
  'database'
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%'
  }),
  center: {
    x: 0
  },
  exit: (direction: number) => ({
    x: direction < 0 ? '100%' : '-100%'
  })
};

function App() {
  const { user, loading, logout, hasRole } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [pageState, setPageState] = useState({ current: currentPage, prev: null as string | null });

  if (currentPage !== pageState.current) {
    setPageState({ current: currentPage, prev: pageState.current });
  }

  const prevIdx = PAGE_ORDER.indexOf(pageState.prev || 'dashboard');
  const currIdx = PAGE_ORDER.indexOf(pageState.current);
  const direction = currIdx >= prevIdx ? 1 : -1;

  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | number | 'me'>('me');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifPos, setNotifPos] = useState<{ top: number; right: number } | null>(null);
  const [serverOnline, setServerOnline] = useState(true);
  const [rpcActive, setRpcActive] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');
  const [navbarMode, setNavbarMode] = useState<'text' | 'icon' | 'hamburger'>('text');
  const [pendingNewsCreate, setPendingNewsCreate] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 1250) {
        setNavbarMode('hamburger');
      } else if (w < 1600) {
        setNavbarMode('icon');
      } else {
        setNavbarMode('text');
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [isOverlayRoute, setIsOverlayRoute] = useState(() => window.location.hash.startsWith('#overlay'));

  useEffect(() => {
    const handleHashChange = () => {
      setIsOverlayRoute(window.location.hash.startsWith('#overlay'));
    };
    window.addEventListener('hashchange', handleHashChange);
    // Trigger once manually to cover immediate loads
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (isOverlayRoute) {
      document.documentElement.classList.add('is-overlay');
      document.body?.classList.add('is-overlay-body');
      return;
    }
    document.body?.classList.remove('is-overlay-body');
    // Immer dunkler Modus aktiv
    document.documentElement.classList.remove('light');
  }, [isOverlayRoute]);

  useEffect(() => {
    if (!loading) {
      try {
        const { ipcRenderer } = window.require('electron');
        if (ipcRenderer) {
          ipcRenderer.send('app-ready');
        }
      } catch (e) { }
    }
  }, [loading]);

  useEffect(() => {
    try {
      const { ipcRenderer } = window.require('electron');
      if (ipcRenderer) {
        if (currentPage !== 'chat' && currentPage !== 'profile' && currentPage !== 'events') {
          ipcRenderer.send('rpc-page-changed', currentPage);
        }
      }
    } catch (e) { }
  }, [currentPage]);

  const [telemetry, setTelemetry] = useState<any>(null);
  const [pluginStatus, setPluginStatus] = useState<any[]>([]);
  const [showPluginPopup, setShowPluginPopup] = useState(false);
  const [installingPlugin, setInstallingPlugin] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [installStatus, setInstallStatus] = useState('');
  const [targetMapId, setTargetMapId] = useState<string | number | null>(null);
  const [showUpdatePopup, setShowUpdatePopup] = useState(false);
  const [updateVersion, setUpdateVersion] = useState('');
  const [updateNotes, setUpdateNotes] = useState('');
  const [updatingApp, setUpdatingApp] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateStatus, setUpdateStatus] = useState('');
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  useEffect(() => {
    const checkServer = async () => {
      try {
        // Check the actual API base URL instead of hardcoded localhost
        await fetch(API_BASE_URL, { mode: 'no-cors', cache: 'no-cache' });
        setServerOnline(true);
      } catch (err) {
        setServerOnline(false);
      }
    };
    checkServer();
    const interval = setInterval(checkServer, 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      const { ipcRenderer } = window.require('electron');
      if (ipcRenderer) {
        ipcRenderer.invoke('rpc-status').then(setRpcActive).catch(() => { });
        const listener = (_: any, status: boolean) => setRpcActive(status);
        ipcRenderer.on('rpc-status-changed', listener);

        const rpcErrorListener = (_: any, errorType: string) => {
          if (errorType === 'eperm') {
            toast.error(
              "Discord läuft als Administrator. Bitte starte Discord neu ohne Administratorrechte, damit sich der Tracker verbinden kann.",
              { duration: 8000 }
            );
          }
        };
        ipcRenderer.on('rpc-error', rpcErrorListener);

        ipcRenderer.invoke('telemetry-status').then(setTelemetry).catch(() => { });
        let lastUpdate = 0;
        let lastConnected = false;
        const teleListener = (_: any, data: any) => {
          const now = Date.now();
          const isConnectionChanged = (data?.connected ?? false) !== lastConnected;
          if (isConnectionChanged || now - lastUpdate >= 1000) {
            setTelemetry(data);
            lastUpdate = now;
            lastConnected = data?.connected ?? false;
          }
        };
        ipcRenderer.on('telemetry-update', teleListener);

        ipcRenderer.invoke('overlay-status').then(setIsOverlayOpen).catch(() => { });
        const overlayListener = (_: any, status: boolean) => setIsOverlayOpen(status);
        ipcRenderer.on('overlay-status-changed', overlayListener);

        // Real-time Job Notifications
        const jobEventListener = (_: any, event: any) => {
          console.log("App: Notification erhalten", event);
          let title = '';
          let content = '';

          if (event.type === 'system') {
            title = `🔔 ${event.title || 'System'}`;
            content = event.content || '';
          } else {
            title = event.type === 'start' ? 'Job Gestartet' : event.type === 'delivered' ? 'Job Abgeliefert' : event.type === 'cancelled' ? 'Job Abgebrochen' : event.type === 'resumed' ? 'Job Fortgesetzt' : title;
            content = event.type === 'start'
              ? `${event.cargo} von ${event.source} nach ${event.dest}`
              : `Fahrt beendet. Status: ${event.type === 'delivered' ? 'Erfolgreich' : 'Abgebrochen'}`;
          }

          const newNotif = {
            id: Date.now(),
            title: title,
            content: content,
            time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr',
            read: false
          };

          // Trigger visual toast notifications
          if (event.type === 'system') {
            toast(event.title || 'System-Meldung', {
              description: event.content || '',
              duration: 5000,
              className: 'custom-toast toast-resumed frosted-card',
            });
          } else if (event.type === 'start' || event.type === 'delivered') {
            const toastClass = event.type === 'start' ? 'toast-start' : 'toast-resumed';
            toast.success(title, {
              description: content,
              duration: 5000,
              className: `custom-toast ${toastClass} frosted-card`,
            });
          } else if (event.type === 'cancelled') {
            toast.error(title, {
              description: content,
              duration: 5000,
              className: 'custom-toast toast-cancelled frosted-card',
            });
          } else if (event.type === 'resumed') {
            toast.info(title, {
              description: content,
              duration: 5000,
              className: 'custom-toast frosted-card',
            });
          }

          if (event.type !== 'system' && event.type !== 'chat' && event.type !== 'chat_group') {
            setNotifications(prev => [newNotif, ...prev]);
            // Play sound for real-time notifications
            const audio = new Audio('sounds/start.mp3');
            audio.volume = 0.15;
            audio.play().catch(() => { });
          }
        };
        ipcRenderer.on('job-notification', jobEventListener);

        const soundListener = (_: any, soundFile: string) => {
          const soundEnabled = localStorage.getItem('afk_sound_enabled') !== 'false';
          if (!soundEnabled) return;

          const audio = new Audio(`sounds/${soundFile}`);
          audio.volume = 0.3; // Leiser machen
          audio.play().catch(err => console.error('Audio play error:', err));
        };
        ipcRenderer.on('play-sound', soundListener);

        const playNotificationSound = () => {
          const audio = new Audio('sounds/start.mp3');
          audio.volume = 0.15;
          audio.play().catch(() => { });
        };

        // Initial AFK Bot Config Sync
        const savedHotkey = localStorage.getItem('afk_hotkey') || 'F9';
        const savedInterval = localStorage.getItem('afk_interval') || '60';

        let drivingTextsList = ['Fahre...', 'Auf Achse!', 'Immer weiter...'];
        const savedDriving = localStorage.getItem('afk_driving_texts');
        if (savedDriving) {
          try { drivingTextsList = JSON.parse(savedDriving); } catch (e) { }
        } else {
          const single = localStorage.getItem('afk_driving_text');
          if (single) drivingTextsList = [single];
        }

        let pausedTextsList = ['Bin kurz AFK', 'Pause...', '/fix'];
        const savedPaused = localStorage.getItem('afk_paused_texts');
        if (savedPaused) {
          try { pausedTextsList = JSON.parse(savedPaused); } catch (e) { }
        } else {
          const single = localStorage.getItem('afk_paused_text');
          if (single) pausedTextsList = [single];
        }

        try {
          ipcRenderer.send('afk-configure', {
            interval: Number(savedInterval) * 1000,
            drivingTexts: drivingTextsList,
            pausedTexts: pausedTextsList,
            hotkey: savedHotkey
          });
        } catch (e) { }

        // Check Plugin Status
        const checkPlugins = async () => {
          try {
            const status = await ipcRenderer.invoke('check-plugin-status');
            setPluginStatus(status);

            const missing = status.some((s: any) => !s.installed);
            const ignored = localStorage.getItem('ignore_plugin_warning') === 'true';

            if (missing && !ignored) {
              setShowPluginPopup(true);
            }
          } catch (e) { }
        };
        checkPlugins();

        const checkAppUpdate = async () => {
          try {
            const updateInfo = await ipcRenderer.invoke('check-app-update');
            if (updateInfo && updateInfo.updateAvailable) {
              setUpdateVersion(updateInfo.latestVersion);
              setUpdateNotes(updateInfo.releaseNotes);
              setShowUpdatePopup(true);
            }
          } catch (e) { }
        };
        checkAppUpdate();

        return () => {
          ipcRenderer.removeListener('rpc-status-changed', listener);
          ipcRenderer.removeListener('rpc-error', rpcErrorListener);
          ipcRenderer.removeListener('telemetry-update', teleListener);
          ipcRenderer.removeListener('job-notification', jobEventListener);
          ipcRenderer.removeListener('play-sound', soundListener);
          ipcRenderer.removeListener('overlay-status-changed', overlayListener);
        }
      }
    } catch (e) {
      console.warn("Electron IPC not available");
    }
  }, []);

  const installPlugin = (gameId: string) => {
    setInstallingPlugin(true);
    setInstallProgress(0);
    setInstallStatus('Initialisierung...');

    try {
      const { ipcRenderer } = window.require('electron');

      const progressListener = (_: any, data: any) => {
        setInstallProgress(data.progress);
        setInstallStatus(data.status);

        if (data.progress === 100 && data.success) {
          ipcRenderer.removeListener('install-plugin-progress', progressListener);
          setTimeout(async () => {
            const newStatus = await ipcRenderer.invoke('check-plugin-status');
            setPluginStatus(newStatus);
            if (!newStatus.some((s: any) => !s.installed)) {
              setShowPluginPopup(false);
            }
            setInstallingPlugin(false);
          }, 1500);
        } else if (data.error) {
          ipcRenderer.removeListener('install-plugin-progress', progressListener);
          setInstallingPlugin(false);
          toast.error("Fehler: " + data.status);
        }
      };

      ipcRenderer.on('install-plugin-progress', progressListener);
      ipcRenderer.send('install-plugin', gameId);

    } catch (e) {
      console.error(e);
      setInstallingPlugin(false);
    }
  };

  const installAppUpdate = () => {
    setUpdatingApp(true);
    setUpdateProgress(0);
    setUpdateStatus('Initialisierung...');

    try {
      const { ipcRenderer } = window.require('electron');

      const progressListener = (_: any, data: any) => {
        setUpdateProgress(data.progress);
        setUpdateStatus(data.status);

        if (data.progress === 100 && data.success) {
          ipcRenderer.removeListener('install-update-progress', progressListener);
        } else if (data.error) {
          ipcRenderer.removeListener('install-update-progress', progressListener);
          setUpdatingApp(false);
          toast.error("Fehler bei der Aktualisierung: " + data.status);
        }
      };

      ipcRenderer.on('install-update-progress', progressListener);
      ipcRenderer.send('install-app-update');
    } catch (e: any) {
      console.error(e);
      setUpdatingApp(false);
      toast.error("Fehler bei der Aktualisierung: " + e.message);
    }
  };

  const ignorePluginWarning = () => {
    localStorage.setItem('ignore_plugin_warning', 'true');
    setShowPluginPopup(false);
  };

  const [notifications, setNotifications] = useState<any[]>([]);

  const lastProcessedId = useRef<string | number | null>(localStorage.getItem('last_notif_id'));
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showNotifications && notifRef.current && !notifRef.current.contains(event.target as Node)) {
        const bellButton = document.getElementById('notif-bell');
        if (bellButton && bellButton.contains(event.target as Node)) return;

        handleMarkAllRead();
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  useEffect(() => {
    if (showNotifications) {
      const bell = document.getElementById('notif-bell');
      const r = bell?.getBoundingClientRect();
      if (r) setNotifPos({ top: r.bottom + 16, right: 24 });
    }
  }, [showNotifications]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await apiService.getNotifications();
      if (Array.isArray(res.data)) {
        const formatted = res.data.map((n: any) => {
          let title = n.type === 'application' ? 'Bewerbung' : (n.type === 'chat' || n.type === 'chat_group') ? n.text : 'System';
          let content = n.text;

          if (n.type === 'chat' || n.type === 'chat_group') {
            // Capitalize first letter
            title = n.text.charAt(0).toUpperCase() + n.text.slice(1);
            content = `${n.data?.message || n.text}`;
          }

          return {
            id: n.id,
            title,
            content,
            time: new Date(n.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + ' Uhr',
            read: n.read,
            type: n.type,
            relatedId: n.ref_id
          };
        });

        // Detect new notifications for overlay
        if (formatted.length > 0) {
          const newest = formatted[0];
          const lastId = lastProcessedId.current;

          if (lastId !== null && newest.id !== lastId && !newest.read) {
            try {
              window.require('electron').ipcRenderer.send('job-notification', {
                type: 'system',
                id: newest.id,
                title: newest.title,
                content: newest.content
              });

              // Play sound for new API notifications
              const audio = new Audio('sounds/start.mp3');
              audio.volume = 0.15;
              audio.play().catch(() => { });
            } catch (e) { }
          }
          if (newest.id !== lastId) {
            lastProcessedId.current = newest.id;
            localStorage.setItem('last_notif_id', String(newest.id));
          }
        }

        setNotifications(formatted);
      }
    } catch (err) {
      console.error("App: Fehler beim Laden der Benachrichtigungen", err);
    }
  }, [user]);

  useEffect(() => {
    // Only run this logic in the main window, not in the overlay window
    const isOverlay = window.location.hash.startsWith('#overlay');
    if (isOverlay) return;

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Alle 30 Sek prüfen
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await apiService.markAllNotificationsRead();
      setNotifications(n => n.map(x => ({ ...x, read: true })));
      try {
        window.require('electron').ipcRenderer.send('clear-notifications');
      } catch (e) { }
    } catch (err) { }
  };

  const [selectedId, setSelectedId] = useState<any>(null);

  const handleNotificationClick = (n: any) => {
    setShowNotifications(false);
    handleMarkAllRead();

    if (n.relatedId) {
      setSelectedId(n.relatedId);
    }

    switch (n.type) {
      case 'chat':
      case 'chat_group':
        setCurrentPage('chat');
        break;
      case 'news':
        setCurrentPage('news');
        break;
      case 'event':
        setCurrentPage('events');
        break;
      case 'application':
        setCurrentPage('applications');
        break;
    }
  };

  const viewProfile = (id: string | number) => {
    setSelectedMemberId(id);
    setCurrentPage('profile');
  };

  const viewOnMap = (id: string | number) => {
    setTargetMapId(id);
    setCurrentPage('map');
  };

  const getAvatarUrlLocal = (url?: string) => getAvatarUrl(url);

  const isOverlay = window.location.hash.startsWith('#overlay');

  if (isOverlay) {
    return <OverlayPage telemetry={telemetry} />;
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6" />
      <h2 className="text-white font-unbounded text-lg font-bold animate-pulse italic tracking-tighter">OPEN PIPE CLUB HUB</h2>
    </div>
  );

  if (!user) {
    if (showRegister) return <Register onSwitchToLogin={() => setShowRegister(false)} />;
    return <Login onSwitchToRegister={() => setShowRegister(true)} />;
  }

  const isAdmin = (user as any)?.is_admin || user?.role?.isAdmin || user?.role === 'admin';
  const HR_ROLES = ["hr team", "hr-team", "personal team", "personal-team"];
  const canSeeAdmin = isAdmin || hasRole(HR_ROLES);

  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'events', name: 'Events', icon: Calendar },
    { id: 'news', name: 'News', icon: Newspaper },
    { id: 'chat', name: 'Chat', icon: MessageSquare },
    { id: 'map', name: 'Karte', icon: MapIcon },
    { id: 'gallery', name: 'Galerie', icon: ImageIcon },
    { id: 'statistiken', name: 'Statistiken', icon: Route },
    { id: 'team', name: 'Team', icon: Users },
    { id: 'afkbot', name: 'AFK Bot', icon: Bot },
    { id: 'overlay-settings', name: 'Overlay', icon: Monitor },
  ];

  if (canSeeAdmin) {
    navItems.push({ id: 'admin', name: 'Admin', icon: Settings });
  }

  return (
    <div className="h-screen overflow-hidden bg-background text-slate-200 font-outfit selection:bg-primary/30 selection:text-white">
      <AnimatedBackground activePage={currentPage} />

      {/* Top Window Control Bar / Drag bar */}
      <nav className="fixed top-0 left-0 right-0 h-20 z-40 flex items-center justify-between px-6 transition-all duration-300 ease-in-out">
        {/* Internal ambient backdrop + glass layer. Both live INSIDE the nav's
            own layer (not a separate fixed layer) so the glass can blur them the
            same way the in-content frosted-cards blur their siblings. A plain
            fixed navbar cannot reliably sample the page behind it in the
            packaged build, so we blur an internal colourful sibling instead. */}
        <div className="absolute inset-0 -z-10 overflow-hidden" style={{ WebkitAppRegion: 'drag' }}>
          <div className="bg-blob-1 absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full" />
          <div className="bg-blob-2 absolute -top-28 right-0 w-[24rem] h-[24rem] rounded-full" />
          <div className="bg-blob-3 absolute -top-24 left-1/3 w-[22rem] h-[22rem] rounded-full" />
        </div>
        <div className="glass-nav absolute inset-0 -z-10" />

        {/* Left side: hamburger menu for mobile, and Logo / Navigation for desktop */}
        <div className="flex items-center gap-6 min-w-0" style={{ WebkitAppRegion: 'no-drag' }}>
          <div className="flex items-center gap-3 shrink-0">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`${navbarMode === 'hamburger' ? 'block' : 'hidden'} p-2 text-slate-300 hover:text-white bg-[#0f111a]/60 backdrop-blur-md rounded-xl border border-[#f59e0b]/20 hover:border-amber-400 transition-all`}
              onClick={() => setMenuOpen(!menuOpen)}
              data-testid="hamburger-btn"
            >
              <Menu size={20} />
            </motion.button>

            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <img src="logo.png" alt="Open Pipe Club Logo" className="h-10 w-10 rounded-lg object-contain shrink-0" />
              <span className="font-['Unbounded'] font-bold text-lg tracking-tight text-white hidden sm:block">Open Pipe Club</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className={`${navbarMode === 'hamburger' ? 'hidden' : 'flex'} items-center gap-0.5 border-l border-white/10 pl-4 min-w-0 overflow-x-auto no-scrollbar`}>
            {navItems.map((item) => {
              const isActive = currentPage === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  title={item.name}
                  className={`transition-all duration-300 whitespace-nowrap flex items-center justify-center ${navbarMode === 'icon'
                    ? `p-2 rounded-xl ${isActive ? 'text-amber-400 bg-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`
                    : `px-2.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${isActive ? 'text-amber-400 bg-white/5' : 'text-slate-300 hover:text-white hover:bg-white/10'}`
                    }`}
                >
                  {navbarMode === 'icon' ? <Icon size={16} className="shrink-0" /> : item.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right side: telemetry status, notifications, controls */}
        <div className="flex items-center gap-3 shrink-0" style={{ WebkitAppRegion: 'no-drag' }}>
          {/* Combined Status Pill */}
          <div className="hidden sm:flex flex-row bg-[#080a14]/65 backdrop-blur-md border border-white/5 rounded-xl px-3 py-1 gap-3 items-center shadow-md">
            <div className="flex flex-row gap-2 border-r border-white/10 pr-3">
              <div className="flex items-center gap-1.5" title={serverOnline ? "Server Online" : "Server Offline"}>
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${serverOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse' : 'bg-red-500'}`}></span>
                <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest leading-none">API</span>
              </div>
              <div className="flex items-center gap-1.5" title={rpcActive ? "Discord RPC Aktiv" : "Discord RPC Aus"}>
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${rpcActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse' : 'bg-red-500'}`}></span>
                <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest leading-none">RPC</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5" title={telemetry?.gameVersion > 0 ? "SDK Verbunden" : "SDK Nicht Verbunden"}>
              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${telemetry?.gameVersion > 0 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse' : 'bg-red-500'}`}></span>
              <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest leading-none">SDK</span>
            </div>
          </div>

          {/* Bell */}
          <motion.button
            id="notif-bell"
            onClick={() => {
              if (showNotifications) handleMarkAllRead();
              setShowNotifications(!showNotifications);
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`p-2 rounded-xl transition-all relative ${showNotifications ? 'bg-primary/20 text-primary' : 'text-slate-400 hover:text-white hover:bg-primary/10'}`}
          >
            <Bell size={18} />
            {notifications.some(n => !n.read) && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-background animate-pulse" />
            )}
          </motion.button>

          {/* Notification Dropdown */}
          {createPortal(
            <AnimatePresence>
              {showNotifications && notifPos && (
                <motion.div
                  ref={notifRef}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  className="fixed w-80 frosted-card !rounded-2xl !p-0 shadow-[0_40px_100px_rgba(0,0,0,0.9)] z-[100] overflow-hidden"
                  style={{ top: notifPos.top, right: notifPos.right, border: "2px solid rgba(245,158,11,0.2) !important" }}
                >
                  <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <h3 className="font-unbounded text-[9px] font-black text-white uppercase tracking-widest italic">Info-Zentrale</h3>
                      <button onClick={fetchNotifications} className="p-1 hover:text-primary transition-colors">
                        <Route size={10} className="rotate-90" />
                      </button>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto no-scrollbar divide-y divide-white/5">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell size={24} className="mx-auto mb-3 text-slate-700 opacity-20" />
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic opacity-50">Keine neuen Meldungen</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`p-4 transition-all hover:bg-white/[0.04] cursor-pointer group/notif ${!n.read ? 'bg-primary/[0.03]' : 'opacity-60'}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <p className={`text-[11px] font-black uppercase tracking-tight group-hover/notif:text-primary transition-colors ${!n.read ? 'text-primary' : 'text-slate-300'}`}>{n.title}</p>
                            <span className="text-[9px] font-bold text-slate-400">{n.time}</span>
                          </div>
                          <p className={`text-[11px] font-medium leading-relaxed ${!n.read ? 'text-slate-300' : 'text-slate-400'}`}>{n.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body
          )}

          {/* User Profile */}
          {user && (
            <button
              onClick={() => { setCurrentPage('profile'); setSelectedMemberId('me'); }}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/5 transition-all group shrink-0"
              title={user.username}
            >
              <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                {getAvatarUrlLocal(user.avatar_url) ? (
                  <img src={getAvatarUrlLocal(user.avatar_url)!} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary/20 flex items-center justify-center text-[10px] text-primary font-black italic">
                    {user.username?.charAt(0)}
                  </div>
                )}
              </div>
              <span className="hidden sm:inline text-xs font-bold text-slate-350 group-hover:text-white transition-colors max-w-[100px] truncate">{user.username}</span>
            </button>
          )}

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
            title="Abmelden"
          >
            <LogOut size={18} />
          </button>



          {/* Window controls */}
          <div className="flex items-center ml-2 border-l border-white/10 pl-2">
            <button
              onClick={() => { try { (window as any).electronAPI.minimizeWindow() } catch (e) { } }}
              className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            >
              <Minus size={18} />
            </button>
            <button
              onClick={() => { try { (window as any).electronAPI.maximizeWindow() } catch (e) { } }}
              className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            >
              <Square size={16} />
            </button>
            <button
              onClick={() => { try { (window as any).electronAPI.closeWindow() } catch (e) { } }}
              className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 h-screen w-full overflow-hidden transition-all duration-300 ease-in-out">
        <div className="w-full h-full">
          <AnimatePresence initial={false} mode="wait" custom={direction}>
          <motion.div
            key={currentPage}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
              exit: { x: { duration: 0.1, ease: [0.16, 1, 0.3, 1] } }
            }}
              className={
                currentPage === 'map'
                  ? "absolute inset-0 w-full h-full overflow-hidden"
                  : currentPage === 'chat'
                    ? "absolute inset-0 w-full h-full pt-20 overflow-hidden"
                    : currentPage === 'profile'
                      ? "absolute inset-0 w-full h-full overflow-y-auto overflow-x-hidden no-scrollbar"
                      : "absolute inset-0 w-full h-full overflow-y-auto overflow-x-hidden no-scrollbar px-6 max-w-[1600px] mx-auto pt-28 pb-10"
              }
          >
            <Suspense fallback={
              <div className="flex items-center justify-center h-[60vh]">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            }>
              {currentPage === 'dashboard' && <Dashboard onViewProfile={viewProfile} onNavigate={setCurrentPage} onNewsCreate={() => { setPendingNewsCreate(true); setCurrentPage('news'); }} telemetry={telemetry} />}
              {currentPage === 'team' && <Team onViewProfile={viewProfile} />}
              {currentPage === 'statistiken' && <Stats />}
              {currentPage === 'admin' && canSeeAdmin && <Admin onViewProfile={viewProfile} onNavigate={setCurrentPage} />}
              {currentPage === 'applications' && hasRole(['admin', 'management']) && <Suspense fallback={<div>Lädt...</div>}><Applications /></Suspense>}
              {currentPage === 'database' && isAdmin && <Database onBack={() => setCurrentPage('admin')} />}
              {currentPage === 'events' && <Events selectedId={selectedId} onClearSelectedId={() => setSelectedId(null)} />}
              {currentPage === 'map' && <Map onViewProfile={viewProfile} initialSelectedId={targetMapId} onClearInitialId={() => setTargetMapId(null)} theme={theme} />}
              {currentPage === 'news' && <News selectedId={selectedId} onClearSelectedId={() => setSelectedId(null)} openCreate={pendingNewsCreate} onConsumeCreate={() => setPendingNewsCreate(false)} />}
              {currentPage === 'gallery' && <Gallery />}
              {currentPage === 'chat' && <Chat selectedChannelId={selectedId} onClearSelectedId={() => setSelectedId(null)} />}
              {currentPage === 'profile' && <Profile memberId={selectedMemberId} onBack={() => setCurrentPage('dashboard')} telemetry={telemetry} onViewOnMap={viewOnMap} />}
              {currentPage === 'afkbot' && <AfkBot />}
              {currentPage === 'reports' && <Reports />}
              {currentPage === 'overlay-settings' && <OverlaySettings />}
            </Suspense>
          </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Menu Sidebar - Moved to bottom for absolute top-layer priority */}
      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-[10000] no-drag">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="absolute inset-0 bg-black/30"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="absolute top-0 left-0 bottom-0 w-[300px] bg-zinc-950 border-r border-white/5 p-6 pt-6 shadow-2xl flex flex-col gap-3 no-drag pointer-events-auto overflow-hidden"
            >
              {/* Internal ambient + glass layer (same-layer blur, like the cards,
                  because a fixed overlay can't reliably sample the page behind it) */}
              <div className="absolute inset-0 -z-10 overflow-hidden">
                <div className="bg-blob-1 absolute -top-20 -left-10 w-64 h-64 rounded-full" />
                <div className="bg-blob-2 absolute -bottom-10 right-0 w-64 h-64 rounded-full" />
              </div>
              <div className="absolute inset-0 -z-10 bg-zinc-950/70 backdrop-blur-xl" />
              <div className="flex items-center justify-between mb-8 no-drag">
                <div className="flex items-center gap-3">
                  <img src="logo.png" alt="Open Pipe Club Logo" className="w-8 h-8 object-contain" />
                  <span className="font-unbounded font-bold text-xs tracking-tight uppercase text-white">Drivers Hub</span>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen(false);
                  }}
                  className="w-12 h-12 flex items-center justify-center -mr-3 text-slate-400 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 rounded-2xl transition-all no-drag pointer-events-auto relative z-[10001] active:scale-95"
                  title="Menü schließen"
                >
                  <X size={28} />
                </button>
              </div>
              <div className="flex flex-col gap-2 overflow-y-auto no-scrollbar pr-2 no-drag">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentPage(item.id);
                      setMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-4 rounded-xl flex items-center gap-4 transition-all duration-300 no-drag pointer-events-auto ${currentPage === item.id
                      ? 'bg-amber-400/10 text-amber-400 font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                      }`}
                  >
                    <item.icon size={20} />
                    <span className="text-sm font-semibold">{item.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Plugin Installation Popup */}
      <AnimatePresence>
        {showPluginPopup && (
          <div className="fixed inset-0 z-[11000] flex items-center justify-center p-6 no-drag">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowPluginPopup(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.8)]"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0" />

              <div className="p-8">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <Download className="text-primary" size={32} />
                </div>

                <h2 className="text-xl font-unbounded font-bold text-white text-center mb-2 uppercase tracking-tight">Plugin fehlt</h2>
                <p className="text-slate-400 text-center text-sm mb-8 leading-relaxed">
                  Für eine einwandfreie Telemetrie-Übertragung wird das SCS-Plugin benötigt. Möchtest du es jetzt installieren?
                </p>

                <div className="space-y-4">
                  {pluginStatus.filter(p => !p.installed).map(game => (
                    <div key={game.gameId} className="space-y-3 p-5 bg-white/[0.03] border border-white/5 rounded-2xl transition-all hover:bg-white/[0.05]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-amber-500/10 rounded-xl">
                            <AlertTriangle size={18} className="text-amber-500" />
                          </div>
                          <span className="text-[11px] font-black text-white uppercase tracking-[0.15em]">{game.gameName}</span>
                        </div>
                        {!installingPlugin && (
                          <button
                            onClick={() => installPlugin(game.gameId)}
                            className="px-5 py-2.5 bg-primary text-black text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/80 transition-all hover:scale-105 active:scale-95 shadow-[0_10px_20px_rgba(245, 158, 11,0.2)]"
                          >
                            Installieren
                          </button>
                        )}
                      </div>

                      {installingPlugin && (
                        <div className="space-y-2.5 pt-2">
                          <div className="flex justify-between items-end">
                            <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] animate-pulse">{installStatus}</span>
                            <span className="text-[10px] font-black text-white/40 tabular-nums">{installProgress}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${installProgress}%` }}
                              transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                              className="h-full bg-gradient-to-r from-primary/50 to-primary shadow-[0_0_15px_rgba(245, 158, 11,0.5)]"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex flex-col gap-3">
                  <button
                    onClick={ignorePluginWarning}
                    className="w-full py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all"
                  >
                    Ignorieren & Nicht mehr anzeigen
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowPluginPopup(false)}
                className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-all"
              >
                <X size={20} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* App Update Installation Popup */}
      <AnimatePresence>
        {showUpdatePopup && (
          <div className="fixed inset-0 z-[11000] flex items-center justify-center p-6 no-drag">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => { if (!updatingApp) setShowUpdatePopup(false); }}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.8)]"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0" />

              <div className="p-8">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <Download className="text-primary" size={32} />
                </div>

                <h2 className="text-xl font-unbounded font-bold text-white text-center mb-2 uppercase tracking-tight">App Update</h2>
                <p className="text-slate-400 text-center text-sm mb-4 leading-relaxed">
                  Eine neue Version ({updateVersion}) des Open Pipe Club Trackers ist verfügbar.
                </p>

                {updateNotes && (
                  <div className="mb-6 p-4 bg-white/[0.02] border border-white/5 rounded-2xl max-h-36 overflow-y-auto no-scrollbar text-xs text-slate-400 leading-relaxed">
                    <p className="font-bold text-white mb-1 uppercase tracking-wider text-[9px]">Changelog:</p>
                    <div className="whitespace-pre-line">{updateNotes}</div>
                  </div>
                )}

                <div className="space-y-4">
                  {!updatingApp ? (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowUpdatePopup(false)}
                        className="flex-1 py-3 bg-white/5 text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all border border-white/5 active:scale-95"
                      >
                        Später
                      </button>
                      <button
                        onClick={installAppUpdate}
                        className="flex-1 py-3 bg-primary text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/80 transition-all hover:scale-105 active:scale-95 shadow-[0_10px_20px_rgba(245, 158, 11,0.2)]"
                      >
                        Jetzt Updaten
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 p-5 bg-white/[0.03] border border-white/5 rounded-2xl">
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-end">
                          <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] animate-pulse">{updateStatus}</span>
                          <span className="text-[10px] font-black text-white/40 tabular-nums">{updateProgress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${updateProgress}%` }}
                            transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                            className="h-full bg-gradient-to-r from-primary/50 to-primary shadow-[0_0_15px_rgba(245, 158, 11,0.5)]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {!updatingApp && (
                <button
                  onClick={() => setShowUpdatePopup(false)}
                  className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div >
  );
}

export default App;