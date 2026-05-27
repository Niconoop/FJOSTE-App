import { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { Gauge, Fuel, MapPin, Unlock, Clock, ShieldAlert, Package, Navigation, Timer, Map, Weight, Truck, Bell, Info, Users, Banknote, Calendar, Zap } from 'lucide-react';
import axios from 'axios';
import { API_URL, getAvatarUrl } from '../config';
import { motion, AnimatePresence } from 'framer-motion';


const Overlay = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [settings, setSettings] = useState<any>({
    showSpeed: true,
    showFuel: true,
    showLimit: true,
    showDamage: true,
    showRest: true,
    showGear: true,
    showCargo: true,
    showArrival: true,
    showDrivers: true,
    layout: 'card',
    position: 'top-left'
  });

  const [onlineDrivers, setOnlineDrivers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [clock, setClock] = useState(new Date());
  const [popups, setPopups] = useState<any[]>([]);
  const [isLocked, setIsLocked] = useState(true);
  const [prevOnlineDrivers, setPrevOnlineDrivers] = useState<any[]>([]);
  const [notifiedEvents, setNotifiedEvents] = useState<Set<number>>(new Set());

  const addPopup = (data: any) => {
    const id = Date.now() + Math.random();
    setPopups(prev => [...prev, { id, ...data }]);
    setTimeout(() => {
      setPopups(prev => prev.filter(p => p.id !== id));
    }, data.duration || 8000);
  };



  useEffect(() => {
    document.documentElement.classList.remove('light');
    document.body.style.background = 'transparent';
    document.body.style.backgroundColor = 'transparent';
    document.body.style.overflow = 'hidden';

    const { ipcRenderer } = window.require('electron');
    ipcRenderer.invoke('telemetry-status').then(setTelemetry);
    ipcRenderer.invoke('get-overlay-settings').then(setSettings);

    const teleListener = (_: any, data: any) => setTelemetry(data);
    const settingsListener = (_: any, s: any) => setSettings(s);

    const jobListener = (_: any, data: any) => {
      const id = data.id || Date.now();
      setPopups(prev => [...prev, { id, ...data }]);

      // Keep chat/system notifications longer (15s) than job events (8s)
      const duration = (data.type === 'system' || data.type === 'chat' || data.type === 'chat_group') ? 15000 : 8000;

      setTimeout(() => {
        setPopups(prev => prev.filter(p => p.id !== id));
      }, duration);
    };

    const clearListener = () => {
      setPopups([]);
    };

    ipcRenderer.on('telemetry-update', teleListener);
    ipcRenderer.on('overlay-settings-changed', settingsListener);
    ipcRenderer.on('job-notification', jobListener);
    ipcRenderer.on('clear-notifications', clearListener);

    const fetchDrivers = async () => {
      try {
        const res = await axios.get(`${API_URL}/trucky/live-map`);
        const data = Array.isArray(res.data) ? res.data : [];
        setOnlineDrivers(data.filter((d: any) => d.online));
      } catch (err) {
        console.error("Failed to fetch drivers", err);
      }
    };

    fetchDrivers();
    const driverInterval = setInterval(fetchDrivers, 60000);

    const fetchEvents = async () => {
      try {
        const res = await axios.get(`${API_URL}/events`);
        setEvents(Array.isArray(res.data) ? res.data.filter((e: any) => new Date(e.start_at) > new Date()) : []);
      } catch (err) { }
    };
    fetchEvents();
    const eventInterval = setInterval(fetchEvents, 300000);

    const fetchCities = async () => {
      try {
        const res = await axios.get('/ets2_cities.json');
        setCities(res.data);
      } catch (err) { }
    };
    fetchCities();

    const clockInterval = setInterval(() => setClock(new Date()), 1000);

    return () => {
      ipcRenderer.removeListener('telemetry-update', teleListener);
      ipcRenderer.removeListener('overlay-settings-changed', settingsListener);
      ipcRenderer.removeListener('job-notification', jobListener);
      ipcRenderer.removeListener('clear-notifications', clearListener);
      clearInterval(driverInterval);
      clearInterval(eventInterval);
      clearInterval(clockInterval);
    };
  }, []);

  // Notification: Driver Online Nearby
  useEffect(() => {
    if (!telemetry || !hasData || onlineDrivers.length === 0) return;
    
    // Find newly online drivers
    const newlyOnline = onlineDrivers.filter(d => 
        d.online && !prevOnlineDrivers.find(p => p.id === d.id)
    );
    
    newlyOnline.forEach(driver => {
        const loc = driver.live_location;
        if (loc && loc.x != null && loc.z != null) {
            const dx = telemetry.posX - loc.x;
            const dz = telemetry.posZ - loc.z;
            const dist = Math.sqrt(dx*dx + dz*dz);
            
            // 20km radius (game units)
            if (dist < 20000) {
                addPopup({
                    type: 'system',
                    title: 'Fahrer in der Nähe!',
                    content: `${driver.username || driver.name} ist gerade online gegangen.`,
                    duration: 10000
                });
            }
        }
    });
    
    setPrevOnlineDrivers(onlineDrivers);
  }, [onlineDrivers, telemetry?.posX, telemetry?.posZ]);

  // Notification: Upcoming Events
  useEffect(() => {
    const now = new Date();
    events.forEach(event => {
        const start = new Date(event.start_at);
        const diffMins = (start.getTime() - now.getTime()) / 60000;
        
        if (diffMins > 0 && diffMins <= 30 && !notifiedEvents.has(event.id)) {
            addPopup({
                type: 'system',
                title: 'Event steht an!',
                content: `${event.title} startet in ${Math.round(diffMins)} Minuten.`,
                duration: 15000
            });
            setNotifiedEvents(prev => new Set(prev).add(event.id));
        }
    });
  }, [events]);

  const hasData = telemetry && !telemetry.error && telemetry.gameVersion > 0;

  const getPositionClasses = () => {
    switch (settings.position) {
      case 'top-left': return 'top-10 left-10';
      case 'top-right': return 'top-10 right-10';
      case 'bottom-left': return 'bottom-10 left-10';
      case 'bottom-right': return 'bottom-10 right-10';
      case 'top-center': return 'top-10 left-1/2 -translate-x-1/2';
      case 'bottom-center': return 'bottom-10 left-1/2 -translate-x-1/2';
      default: return 'top-10 left-10';
    }
  };

  const getDriversPositionClasses = () => {
    const pos = settings.driversPosition || 'top-right';

    switch (pos) {
      case 'top-left': return 'top-10 left-10';
      case 'top-right': return 'top-10 right-10';
      case 'bottom-left': return 'bottom-10 left-10';
      case 'bottom-right': return 'bottom-10 right-10';
      case 'top-center': return 'top-10 left-1/2 -translate-x-1/2';
      case 'bottom-center': return 'bottom-10 left-1/2 -translate-x-1/2';
      default: return 'top-10 right-10';
    }
  };

  const formatRestTime = (mins: number) => {
    if (!mins || mins <= 0) return "Sofort";
    const h = Math.floor(mins / 60);
    const m = Math.floor(mins % 60);
    return `${h}h ${m}m`;
  };

  const getRealDuration = (gameSeconds: number) => {
    if (!gameSeconds || gameSeconds <= 0) return "-- Min";
    const realSeconds = gameSeconds / 15;
    const mins = Math.ceil(realSeconds / 60);
    if (mins < 60) return `${mins} Min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const getRealArrivalClock = (gameSeconds: number) => {
    if (!gameSeconds || gameSeconds < 30) return "--:--";
    const realSecondsRemaining = gameSeconds / 15;
    const arrivalDate = new Date(Date.now() + (realSecondsRemaining * 1000));
    return arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatGear = (gear: number) => {
    if (gear === 0) return 'N';
    if (gear < 0) return 'R' + Math.abs(gear);
    if (gear > 20 || gear < -10) return '--';
    return gear.toString();
  };

  const StatItem = ({ icon: Icon, value, label, color = "text-white" }: any) => (
    <div className="flex items-center gap-2 px-3 border-l border-white/10 first:border-l-0">
      <Icon size={14} className="text-slate-400 shrink-0" />
      <div className="flex flex-col">
        {label && <span className="text-[7px] text-slate-500 font-bold uppercase leading-none mb-0.5">{label}</span>}
        <span className={`text-[10px] font-black leading-none ${color}`}>{value}</span>
      </div>
    </div>
  );

  const handleMouseEnter = () => {
    if (!isLocked) {
      window.require('electron').ipcRenderer.send('set-ignore-mouse-events', false);
    }
  };

  const handleMouseLeave = () => {
    if (!isLocked) {
      window.require('electron').ipcRenderer.send('set-ignore-mouse-events', true, { forward: true });
    }
  };





  return (
    <div
      className="w-screen h-screen relative select-none overflow-hidden bg-transparent"
    >
      {/* Top Bar (Clock & Event Ticker) */}
      <div className="fixed top-0 left-0 right-0 h-8 flex items-center justify-between px-6 z-[1100]">
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 shadow-lg">
          <Clock size={10} className="text-primary" />
          <span className="text-[10px] font-black text-white tabular-nums">
            {clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {events.length > 0 && (
          <div className="flex items-center gap-2 bg-primary/20 backdrop-blur-md px-4 py-1 rounded-full border border-primary/20 shadow-[0_0_15px_rgba(43,161,185,0.2)] max-w-[400px] overflow-hidden">
            <Calendar size={10} className="text-primary shrink-0" />
            <div className="overflow-hidden whitespace-nowrap">
              <motion.p
                animate={{ x: [-100, 100] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="text-[9px] font-black text-white uppercase tracking-wider"
              >
                Nächstes Event: {events[0].title} @ {new Date(events[0].start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </motion.p>
            </div>
          </div>
        )}
      </div>

      {/* Popups Layer */}
      <div className="fixed top-10 left-1/2 -translate-x-1/2 flex flex-col gap-3 z-[1000] items-center pointer-events-none">
        {popups.map(p => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="px-6 py-4 rounded-2xl border border-white/20 bg-[#0a0a0a] backdrop-blur-3xl shadow-2xl flex items-center gap-4 min-w-[300px]"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${p.type === 'start' ? 'bg-primary/20 text-primary' : p.type === 'delivered' ? 'bg-emerald-500/20 text-emerald-400' : p.type === 'system' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
              {p.type === 'start' ? <Truck size={20} /> : p.type === 'delivered' ? <Navigation size={20} /> : p.type === 'system' ? <Bell size={20} /> : <ShieldAlert size={20} />}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-white leading-none mb-1">
                {p.type === 'start' ? 'Job Gestartet' : p.type === 'delivered' ? 'Job Abgeliefert' : p.type === 'system' ? (p.title || 'Benachrichtigung') : 'Job Abgebrochen'}
              </p>
              <p className="text-[10px] font-bold text-slate-400 italic">
                {p.type === 'start' ? `${p.cargo} nach ${p.dest}` : p.type === 'delivered' ? 'Gute Arbeit! Daten synchronisiert.' : p.type === 'system' ? p.content : 'Job-Status wurde aktualisiert.'}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: (hasData && telemetry?.paused) ? 0 : 1 }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`absolute ${getPositionClasses()} ${settings.layout === 'horizontal' ? 'rounded-full px-6 py-3 h-[60px] flex-row items-center' : 'rounded-[28px] p-5 flex-col w-[340px]'} border border-white/20 flex gap-3 shadow-2xl transition-all`}
        style={{
          backgroundColor: `rgba(10, 10, 15, ${(settings.opacity || 95) / 100})`,
          backgroundImage: `
            linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 100%),
            repeating-conic-gradient(rgba(255,255,255,0.03) 0 25%, transparent 0 50%) 50% / 1px 1px
          `,
          boxShadow: '0 20px 40px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.15)',
          ...(hasData && (telemetry.wearTruck > 10 || telemetry.wearCargo > 5) ? {
            borderColor: 'rgba(239, 68, 68, 0.4)',
            animation: 'pulse-red 2s infinite'
          } : {}),
          ...(hasData && telemetry.fuelRange < 150 ? {
            borderColor: 'rgba(245, 158, 11, 0.4)',
            animation: 'pulse-amber 2s infinite'
          } : {})
        } as any}
      >

        {hasData ? (
          settings.layout === 'horizontal' ? (
            <div className="flex items-center gap-1 whitespace-nowrap">
              <div className="flex items-center gap-3 pr-3">
                {settings.showGear && (
                  <span className="text-xl font-unbounded font-black text-primary leading-none">{formatGear(telemetry.gear)}</span>
                )}
                {settings.showSpeed && (
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-unbounded font-black text-white leading-none">{Math.round(telemetry.speed || 0)}</span>
                    <span className="text-[8px] font-black text-slate-500 italic">KMH</span>
                  </div>
                )}
                {settings.showLimit && telemetry.speedLimit > 1 && (
                  <div className="w-6 h-6 rounded-full border-2 border-red-600 bg-white flex items-center justify-center">
                    <span className="text-[8px] font-black text-black">{Math.round(telemetry.speedLimit)}</span>
                  </div>
                )}
              </div>

              {settings.showFuel && (
                <StatItem
                  icon={Fuel}
                  value={`${Math.round(telemetry.fuel)}L`}
                  label={`${Math.round(telemetry.fuelRange)} km`}
                  color={telemetry.fuelRange < 100 ? "text-amber-500" : "text-white"}
                />
              )}
              {settings.showArrival && (
                <>
                  <StatItem icon={Map} value={`${Math.round(telemetry.navDistance / 1000)} km`} label="Distanz" />
                  <StatItem icon={Timer} value={getRealDuration(telemetry.navTime)} label="Dauer" />
                  <StatItem icon={Navigation} value={getRealArrivalClock(telemetry.navTime)} label="Ankunft" color="text-primary" />
                </>
              )}
              {settings.showRest && <StatItem icon={Clock} value={formatRestTime(telemetry.nextRest)} label="Pause" />}
              {settings.showDamage && (
                <StatItem icon={ShieldAlert} value={`${Math.round(telemetry.wearTruck)}% / ${Math.round(telemetry.wearCargo)}%`} label="Schaden" color={telemetry.wearTruck > 10 ? "text-red-500" : "text-white"} />
              )}


              {settings.showCargo && telemetry.cargo && (
                <div className="flex items-center gap-2 px-3 border-l border-white/10 max-w-[150px]">
                  <Package size={14} className="text-primary shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-200 truncate italic leading-none mb-0.5">{telemetry.cargo}</span>
                    <span className="text-[8px] font-black text-slate-500 uppercase">{Math.round(telemetry.cargoMass)} t</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3 min-w-[300px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {settings.showGear && (
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <span className="text-2xl font-unbounded font-black text-primary leading-none">{formatGear(telemetry.gear)}</span>
                    </div>
                  )}
                  {settings.showSpeed && (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-unbounded font-black text-white tracking-tighter leading-none">{Math.round(telemetry.speed || 0)}</span>
                      <span className="text-[9px] font-black text-slate-500 uppercase italic">KM/H</span>
                    </div>
                  )}
                  {settings.showLimit && (
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full border-4 border-red-600 bg-white shadow-lg transition-opacity ${telemetry.speedLimit > 1 ? 'opacity-100' : 'opacity-0'}`}>
                      <span className="text-[11px] font-black text-black leading-none">{Math.round(telemetry.speedLimit || 0)}</span>
                    </div>
                  )}
                  {telemetry.cruiseControl > 1 && (
                    <div className="flex items-center gap-1 bg-emerald-500/20 px-2 py-1 rounded-lg border border-emerald-500/30">
                      <Zap size={10} className="text-emerald-400" />
                      <span className="text-[10px] font-black text-emerald-400">{Math.round(telemetry.cruiseControl)}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {settings.showFuel && (
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5">
                          <Fuel size={12} className="text-primary" />
                          <span className="text-[11px] font-bold tracking-tight">{Math.round(telemetry.fuel || 0)}L</span>
                        </div>
                        <span className={`text-[8px] font-black uppercase mt-0.5 ${telemetry.fuelRange < 100 ? 'text-amber-500' : 'text-slate-500'}`}>
                          {Math.round(telemetry.fuelRange)} km | {(telemetry.avgConsumption * 100).toFixed(1)} L/100
                        </span>
                      </div>
                    </div>
                  )}
                  <div className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm bg-white/5 ${telemetry.paused ? 'text-amber-500' : 'text-emerald-500 italic'}`}>
                    {telemetry.paused ? 'Pausiert' : 'Live'}
                  </div>
                </div>
              </div>

              {/* Centered Time & Arrival Display */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
                <div className="flex items-center gap-2 bg-white/5 px-4 py-1 rounded-full border border-white/10 shadow-lg backdrop-blur-md">
                   <Clock size={12} className="text-primary animate-pulse" />
                   <span className="text-sm font-unbounded font-black text-white tracking-widest">
                     {clock.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                   </span>
                </div>
                {telemetry.navTime > 0 && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                    <Navigation size={10} className="text-primary" />
                    <span className="text-[9px] font-black text-primary uppercase tracking-tighter">
                      ETA: {getRealArrivalClock(telemetry.navTime)}
                    </span>
                  </div>
                )}
              </div>

              {settings.showCargo && telemetry.cargo && (
                <div className="flex items-center justify-between bg-white/5 p-2 px-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Package size={12} className="text-primary shrink-0" />
                    <span className="text-[10px] font-bold text-slate-200 truncate italic">{telemetry.cargo}</span>
                  </div>
                  <div className="flex items-center gap-1.5 pl-3 border-l border-white/10">
                    <Weight size={12} className="text-slate-500" />
                    <span className="text-[10px] font-black text-white">{Math.round(telemetry.cargoMass)} t</span>
                  </div>
                  {telemetry.income > 0 && (
                    <div className="flex items-center gap-1.5 pl-3 border-l border-white/10">
                      <Banknote size={12} className="text-emerald-400" />
                      <span className="text-[10px] font-black text-emerald-400">{telemetry.income.toLocaleString('de-DE')} €</span>
                    </div>
                  )}
                </div>
              )}

              {settings.showArrival && telemetry.navTime > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/5 p-2 rounded-xl border border-white/5 flex items-center gap-2">
                    <Map size={12} className="text-slate-400" />
                    <div className="flex flex-col">
                      <span className="text-[7px] text-slate-500 font-bold uppercase leading-none mb-1">Distanz</span>
                      <span className="text-[10px] font-black text-white leading-none">{Math.round(telemetry.navDistance / 1000)} km</span>
                    </div>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl border border-white/5 flex items-center gap-2">
                    <Timer size={12} className="text-slate-400" />
                    <div className="flex flex-col">
                      <span className="text-[7px] text-slate-500 font-bold uppercase leading-none mb-1">Dauer (EZ)</span>
                      <span className="text-[10px] font-black text-white leading-none">{getRealDuration(telemetry.navTime)}</span>
                    </div>
                  </div>
                  <div className="bg-primary/10 p-2 rounded-xl border border-primary/20 flex items-center gap-2">
                    <Navigation size={12} className="text-primary" />
                    <div className="flex flex-col">
                      <span className="text-[7px] text-primary/70 font-bold uppercase leading-none mb-1">Ankunft</span>
                      <span className="text-[10px] font-black text-white leading-none">{getRealArrivalClock(telemetry.navTime)}</span>
                    </div>
                  </div>
                </div>
              )}

              {(settings.showDamage || settings.showRest) && (
                <div className="flex items-center gap-4 pt-1 px-1">
                  {settings.showDamage && (
                    <div className="flex items-center gap-2">
                      <ShieldAlert size={12} className={telemetry.wearTruck > 10 ? 'text-red-500' : 'text-slate-400'} />
                      <div className="flex gap-2">
                        <span className="text-[9px] font-bold text-slate-200">{Math.round(telemetry.wearTruck)}% <span className="text-slate-500 font-black text-[7px]">T</span></span>
                        <span className="text-[9px] font-bold text-slate-200">{Math.round(telemetry.wearCargo)}% <span className="text-slate-500 font-black text-[7px]">C</span></span>
                      </div>
                    </div>
                  )}
                  {settings.showRest && (
                    <div className="flex items-center gap-1.5 ml-auto">
                      <Clock size={12} className="text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-200">{formatRestTime(telemetry.nextRest)}</span>
                    </div>
                  )}
                </div>
              )}

            </div>
          )
        ) : (
          <div className={`${settings.layout === 'horizontal' ? 'px-10 h-full' : 'py-4 px-10'} flex flex-col items-center justify-center opacity-50`}>
            <Gauge size={settings.layout === 'horizontal' ? 16 : 24} className="text-white/20 mb-2 animate-pulse" />
            <p className="text-[10px] font-black text-white uppercase tracking-[0.2em] italic text-center leading-none">Telemetrie...</p>
          </div>
        )}
      </motion.div>

      {/* Drivers List Overlay */}
      {settings.showDrivers && onlineDrivers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{
            opacity: (hasData && telemetry?.paused) ? 0 : 1,
            y: (hasData && telemetry?.paused) ? -20 : 0
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`absolute ${getDriversPositionClasses()} rounded-[28px] border border-white/20 p-4 shadow-2xl flex flex-col gap-3 min-w-[200px] transition-all`}
          style={{
            backgroundColor: `rgba(10, 10, 15, ${(settings.opacity || 95) / 100})`,
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          } as any}
        >
          <div className="flex items-center gap-2 px-1 mb-0.5 opacity-80">
            <Users size={12} className="text-primary" />
            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white/70">Fahrer</span>
            <span className="ml-auto text-[8px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">{onlineDrivers.length}</span>
          </div>

          <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
            {onlineDrivers.map((driver) => (
              <div key={driver.id} className="group/driver flex items-center gap-2.5 hover:bg-white/5 rounded-xl p-1.5 transition-all">
                <div className={`w-7 h-7 rounded-lg bg-black border overflow-hidden shrink-0 ${driver.online ? 'border-emerald-500/40' : 'border-white/10'}`}>
                  {getAvatarUrl(driver.avatar_url) ? (
                    <img src={getAvatarUrl(driver.avatar_url)!} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary text-[10px] font-black">
                      {(driver.username || driver.name)?.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-white truncate leading-tight">{driver.username || driver.name || 'Unbekannt'}</p>
                  <p className="text-[8px] font-black text-primary truncate leading-tight mt-0.5 uppercase tracking-tight">
                    {driver.live_location?.city || driver.last_position?.city || 'Auf Achse'}
                    {(driver.live_location?.country || driver.last_position?.country) ? `, ${driver.live_location?.country || driver.last_position?.country}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}



      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--primary);
        }
        @keyframes pulse-red {
          0%, 100% { box-shadow: 0 20px 40px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.15); }
          50% { box-shadow: 0 20px 40px rgba(239, 68, 68, 0.4), inset 0 0 0 2px rgba(239, 68, 68, 0.6); }
        }
        @keyframes pulse-amber {
          0%, 100% { box-shadow: 0 20px 40px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.15); }
          50% { box-shadow: 0 20px 40px rgba(245, 158, 11, 0.4), inset 0 0 0 2px rgba(245, 158, 11, 0.6); }
        }
      `}</style>
    </div>
  );
};

export default Overlay;
