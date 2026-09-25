import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronRight, ChevronLeft, Sparkles, Route,
  Users, Bot, Monitor, CheckCircle2, ArrowRight, ShieldCheck, Compass,
  Radio, Bell, Navigation, Gauge, Award, ExternalLink, ImageIcon, Newspaper, MessageSquare, Map as MapIcon
} from 'lucide-react';

export interface OnboardingStep {
  id: string;
  category: string;
  categoryBadge: string;
  title: string;
  pageId?: string;
  description: string;
  highlights: { icon: React.ElementType; title: string; text: string }[];
  proTip?: string;
  previewType: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    category: 'Willkommen',
    categoryBadge: 'STARTKLAR',
    title: 'Willkommen im Open Pipe Club',
    description:
      'Der Hub ist deine persönliche Schaltzentrale für ETS2 und ATS. Hier verwaltest du deine Touren, bleibst mit deinen Speditions-Kollegen im Kontakt, siehst alle Konvois und profitierst von vollautomatischer Telemetrie direkt aus dem Führerhaus.',
    highlights: [
      {
        icon: ShieldCheck,
        title: 'Vollautomatisch vernetzt',
        text: 'Deine Fahrten werden ohne lästiges Eintippen direkt über das SCS-Plugin erfasst.',
      },
      {
        icon: Users,
        title: 'Echte Gemeinschaft',
        text: 'Fahre gemeinsam mit Dutzenden Club-Fahrern auf TruckersMP oder im offiziellen Konvoi.',
      },
      {
        icon: Navigation,
        title: 'Cockpit & HUD',
        text: 'Mit dem Ingame-Overlay und CarPlay hast du alle wichtigen Daten immer im Blick.',
      },
    ],
    proTip: 'Du kannst diese Tour jederzeit über den Kompass-Button in der Kopfzeile oder im Dashboard erneut aufrufen.',
    previewType: 'welcome',
  },
  {
    id: 'status-bar',
    category: 'Status & Telemetrie',
    categoryBadge: 'LIVE-STATUS',
    title: 'Kopfzeile & Live-Telemetrie',
    description:
      'Ganz oben in der App siehst du jederzeit deine Systemverbindungen und die Info-Zentrale. Die Indikatoren zeigen dir auf einen Blick, ob dein Spiel und Discord optimal synchronisiert sind.',
    highlights: [
      {
        icon: Radio,
        title: 'RPC (Discord Rich Presence)',
        text: 'Leuchtet grün, wenn Discord aktiv ist und deinen aktuellen LKW, Server und Status anzeigt.',
      },
      {
        icon: Gauge,
        title: 'SDK (SCS Telemetrie-Plugin)',
        text: 'Wird grün, sobald ETS2/ATS läuft und LKW-Daten (Tempo, Fracht, Tank, Standort) empfangen werden.',
      },
      {
        icon: Bell,
        title: 'Info-Zentrale (Glocke)',
        text: 'Informiert dich in Echtzeit über gestartete/abgeschlossene Aufträge, Konvoi-Erinnerungen und Systemmeldungen.',
      },
    ],
    proTip: 'Sollte das SDK rot bleiben, prüfe in den Einstellungen oder beim App-Start, ob das OPCGameBridge-Plugin installiert ist.',
    previewType: 'status-bar',
  },
  {
    id: 'dashboard',
    category: 'Dashboard',
    categoryBadge: 'FAHRER-ZENTRALE',
    title: 'Dein persönliches Fahrer-Dashboard',
    pageId: 'dashboard',
    description:
      'Das Dashboard fasst alles zusammen, was für deinen Tag auf der Straße wichtig ist: Deine persönlichen Fahrleistungen, aktuelle Club-News und anstehende Speditionsevents.',
    highlights: [
      {
        icon: Route,
        title: 'Persönliche Fahrdaten',
        text: 'Deine gefahrenen Kilometer, abgelieferten Frachten, Umsatz und Level im schnellen Überblick.',
      },
      {
        icon: Newspaper,
        title: 'Neueste Mitteilungen',
        text: 'Wichtige Speditionsankündigungen und Patch-Notes direkt auf deiner Startseite.',
      },
      {
        icon: ArrowRight,
        title: 'Nächste Termine',
        text: 'Die nächsten Konvois und Treffen mit Startort, Ziel und Uhrzeit immer im Blick.',
      },
    ],
    proTip: 'Über den Kompass-Button kannst du diese Einführung oder die interaktive Tour jederzeit erneut aufrufen.',
    previewType: 'dashboard',
  },
  {
    id: 'events',
    category: 'Events & Konvois',
    categoryBadge: 'GEMEINSCHAFT',
    title: 'Club-Events & Konvois',
    pageId: 'events',
    description:
      'Gemeinsam rollt es sich am besten! Hier findest du alle offiziellen Speditionstouren, Community-Konvois und Sonderfahrten. Du kannst dich mit einem einzigen Klick an- oder abmelden und alle Streckeninformationen abrufen.',
    highlights: [
      {
        icon: CheckCircle2,
        title: 'An- & Abmeldung mit 1 Klick',
        text: 'Melde dich mit einem einfachen Klick für anstehende Touren an oder trage dich bei Verhinderung wieder aus.',
      },
      {
        icon: Navigation,
        title: 'Streckendaten & Treffpunkte',
        text: 'Start- und Zielstadt, Treffpunkt-Firma, Abfahrtszeit, Server und Funkkanal sind übersichtlich aufgelistet.',
      },
      {
        icon: Sparkles,
        title: 'In-Game Routen-Übernahme',
        text: 'Übernehme mit einem Klick die vorbereitete Konvoi-Route direkt in dein Ingame- und CarPlay-Navigationsgerät!',
      },
    ],
    proTip: 'Achte auf die im Event angegebene empfohlene LKW- und Trailer-Lackierung, damit wir im Konvoi einheitlich auftreten!',
    previewType: 'events',
  },
  {
    id: 'news',
    category: 'News',
    categoryBadge: 'AKTUELLES',
    title: 'Club-News & Ankündigungen',
    pageId: 'news',
    description:
      'Hier verpasst du keine Neuigkeiten aus dem Clubleben: Offizielle Ankündigungen, Updates zu App & Modding, neue Speditionspartner sowie Berichte der Speditionsleitung.',
    highlights: [
      {
        icon: Newspaper,
        title: 'Immer informiert',
        text: 'Wichtige Speditions-Mitteilungen und Patch-Notes direkt und ungefiltert lesen.',
      },
      {
        icon: MessageSquare,
        title: 'Ausführliche Beiträge',
        text: 'Lies Mitteilungen mit Datums- und Sichtbarkeitsanzeige und klappe lange Berichte mit 1 Klick auf.',
      },
      {
        icon: Award,
        title: 'Offizielle Mitteilungen',
        text: 'Erfahre sofort, wenn neue Meilensteine erreicht oder Aktionen im Club gestartet werden.',
      },
    ],
    proTip: 'Ein roter Punkt bei den Benachrichtigungen signalisiert dir, sobald eine neue wichtige Club-Nachricht veröffentlicht wurde.',
    previewType: 'news',
  },
  {
    id: 'chat',
    category: 'Chat',
    categoryBadge: 'CLUB-FUNK',
    title: 'Club-Funk & Chat-System',
    pageId: 'chat',
    description:
      'Der eingebaute Funk- und Chatbereich verbindet dich direkt mit allen Kollegen. Ob kurzer Schnack auf der Autobahn, Absprachen zur Route oder private Direktnachrichten.',
    highlights: [
      {
        icon: Radio,
        title: 'Öffentlicher Club-Kanal',
        text: 'Der zentrale Treffpunkt für alle Fahrer zum Plaudern, Fragen stellen und Austauschen.',
      },
      {
        icon: Users,
        title: 'Direktnachrichten (DMs)',
        text: 'Schreibe einzelnen Fahrern private Nachrichten für persönliche Absprachen.',
      },
      {
        icon: ImageIcon,
        title: 'Eigene Gruppenchats',
        text: 'Erstelle flexible Gruppenchats für dich und deine Mitfahrer für gemeinsame Touren.',
      },
    ],
    proTip: 'Nutze die Suchleiste im Funkbereich, um schnell nach bestimmten Kanälen oder Fahrerkollegen zu filtern.',
    previewType: 'chat',
  },
  {
    id: 'map',
    category: 'Live-Karte',
    categoryBadge: 'GPS & RADAR',
    title: 'Interaktive Live-Karte & Stau-Warner',
    pageId: 'map',
    description:
      'Die interaktive Weltkarte zeigt dir in Echtzeit, wo sich alle Clubmitglieder auf den TruckersMP-Servern befinden. Zudem warnt sie dich zuverlässig vor Staus auf berüchtigten Strecken.',
    highlights: [
      {
        icon: Navigation,
        title: 'Echtzeit-Ortung',
        text: 'Sieh alle aktiven Fahrer als Radar-Symbole auf der Karte inklusive Tempo, LKW-Modell und Fracht.',
      },
      {
        icon: MapIcon,
        title: 'Live TruckersMP Stau-Warner',
        text: 'Hotspots wie Duisburg-Calais (C-D Road) oder die Alpenstraße werden farbig nach Verkehrsaufkommen markiert.',
      },
      {
        icon: Compass,
        title: 'Server-Filter',
        text: 'Schalte flexibel zwischen Simulation 1, Simulation 2, ProMods und weiteren Servern um.',
      },
    ],
    proTip: 'Klicke auf einen Fahrer in der Fahrerliste der Karte, um die Kamera sofort auf seine Position zu zentrieren!',
    previewType: 'map',
  },
  {
    id: 'gallery',
    category: 'Galerie',
    categoryBadge: 'COMMUNITY',
    title: 'Galerie & Schnappschüsse',
    pageId: 'gallery',
    description:
      'Die Galerie ist das Fotoalbum des Open Pipe Club. Zeige deinen getunten LKW, atemberaubende Sonnenuntergänge in Skandinavien oder die besten Momente aus gemeinsamen Konvois.',
    highlights: [
      {
        icon: ImageIcon,
        title: 'Eigene Bilder hochladen',
        text: 'Lade deine besten Screenshots samt Bildunterschrift direkt aus dem Spiel hoch.',
      },
      {
        icon: Sparkles,
        title: 'Vollbild-Lightbox',
        text: 'Betrachte Bilder in voller Auflösung mit Uploader-Angabe und lass dich inspirieren.',
      },
      {
        icon: Award,
        title: 'Eigene Aufnahmen verwalten',
        text: 'Bearbeite Bildunterschriften oder bereinige eigene Screenshots jederzeit komfortabel.',
      },
    ],
    proTip: 'Schöne Rastplatz-Bilder bei Nacht oder stimmungsvolle Konvoi-Aufnahmen kommen in der Community besonders gut an!',
    previewType: 'gallery',
  },
  {
    id: 'statistiken',
    category: 'Statistiken',
    categoryBadge: 'FAHRTENBUCH',
    title: 'Speditions-Statistiken & Rangliste',
    pageId: 'statistiken',
    description:
      'Jeder Kilometer zählt! Das SCS-Telemetrie-Plugin protokolliert jeden abgeschlossenen Auftrag lückenlos. Verfolge die Gesamtleistung des Clubs und kämpfe dich in der Top-10-Rangliste nach oben.',
    highlights: [
      {
        icon: Route,
        title: 'Speditions-Gesamtdaten',
        text: 'Erfasst Gesamtkilometer, Job-Anzahl, Frachttonnage und erwirtschaftete Umsätze vollautomatisch.',
      },
      {
        icon: Award,
        title: 'Fahrer-Rangliste (Top 10)',
        text: 'Vergleiche deine Leistungen mit deinen Kollegen in der transparenten Bestenliste.',
      },
      {
        icon: Gauge,
        title: 'Vergleichende Diagramme',
        text: 'Übersichtliche Charts zeigen die gefahrenen Kilometer und Umsätze der aktivsten Fahrer.',
      },
    ],
    proTip: 'Schließe Aufträge im Spiel ab, um mit deinen gefahrenen Kilometern und Umsätzen in der Rangliste aufzusteigen.',
    previewType: 'statistiken',
  },
  {
    id: 'team',
    category: 'Team',
    categoryBadge: 'MITGLIEDER',
    title: 'Team-Übersicht & Kollegen',
    pageId: 'team',
    description:
      'Lerne die gesamte Mannschaft kennen: Hier findest du alle Fahrer, Teamleiter, Disponenten und Vorstände auf einen Blick.',
    highlights: [
      {
        icon: Users,
        title: 'Strukturierte Rollenübersicht',
        text: 'Finde deine Kollegen übersichtlich nach Speditionsrollen und Gruppen sortiert.',
      },
      {
        icon: ExternalLink,
        title: 'Fahrerprofile & Verknüpfungen',
        text: 'Öffne mit einem Klick das vollständige Profil mit Biografie, Social Links und TruckersMP-ID.',
      },
      {
        icon: ShieldCheck,
        title: 'Fahrleistungen auf einen Blick',
        text: 'Sieh direkt auf den Fahrerkarten die bisherige Gesamtdistanz und den erwirtschafteten Umsatz.',
      },
    ],
    proTip: 'Ein Klick auf eine Fahrerkarte öffnet sein detailliertes Profil mit Biografie und Statistiken.',
    previewType: 'team',
  },
  {
    id: 'afkbot',
    category: 'AFK Bot',
    categoryBadge: 'ANTI-KICK SCHUTZ',
    title: 'Anti-AFK Bot für entspannte Pausen',
    pageId: 'afkbot',
    description:
      'Kennst du das? Du stehst auf einem vollen TruckersMP-Server an einer Raststätte, willst dir schnell einen Kaffee holen und wirst wegen Inaktivität gekickt. Unser AFK-Bot bewahrt dich davor.',
    highlights: [
      {
        icon: Bot,
        title: 'Kick-Prävention',
        text: 'Sendet automatisierte Chat-Nachrichten an das Spiel, um Server-Timeouts während deiner Pausen zu verhindern.',
      },
      {
        icon: ShieldCheck,
        title: 'Intelligenter Fensterschutz',
        text: 'Prüft vor jedem Tastendruck, ob ETS2 oder TruckersMP das aktive Spielfenster im Vordergrund ist.',
      },
      {
        icon: Radio,
        title: 'Freie Konfiguration',
        text: 'Stelle Sendefrequenz, Hotkey und deine eigenen Nachrichten für Fahr- und Pausenzeiten individuell ein.',
      },
    ],
    proTip: 'Nutze den Bot fair und parke deinen LKW auf ausgewiesenen Rastplätzen oder Firmenhöfen, niemals mitten auf der Fahrbahn!',
    previewType: 'afkbot',
  },
  {
    id: 'overlay',
    category: 'Overlay & CarPlay',
    categoryBadge: 'COCKPIT & HUD',
    title: 'Ingame-Overlay, CarPlay & Einstellungen',
    pageId: 'overlay-settings',
    description:
      'Hol dir echtes Renn- und LKW-Feeling! Mit unserem transparenten Ingame-HUD und dem virtuellen CarPlay-Dashboard hast du alle Telemetriedaten direkt während der Fahrt vor Augen.',
    highlights: [
      {
        icon: Monitor,
        title: 'Ingame-HUD (Taste F9)',
        text: 'Blendet im Spiel einen transparenten Tacho, Restkilometer, Tankfüllstand, Schäden und Mitspieler ein.',
      },
      {
        icon: Gauge,
        title: 'CarPlay / Zweitbildschirm',
        text: 'Nutze ein Smartphone, Tablet oder einen zweiten Monitor als vollwertiges virtuelles Armaturenbrett.',
      },
      {
        icon: Sparkles,
        title: 'Volle Anpassbarkeit',
        text: 'Wähle aus Themes (Minimal, Neon, Cyberpunk, Classic) und passe HUD-Widgets per Drag & Drop an.',
      },
    ],
    proTip: 'Mit der Taste F9 kannst du das Ingame-Overlay jederzeit während der Fahrt blitzschnell ein- und ausblenden.',
    previewType: 'overlay',
  },
];

interface DriverOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (pageId: string) => void;
}

export const DriverOnboardingModal: React.FC<DriverOnboardingModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(true);

  const step = ONBOARDING_STEPS[currentStepIndex];
  const totalSteps = ONBOARDING_STEPS.length;
  const progressPercent = Math.round(((currentStepIndex + 1) / totalSteps) * 100);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex]);

  const handleNext = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleClose = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('opc_onboarding_completed', 'true');
      } catch (e) {
        // ignore
      }
    }
    onClose();
  };

  const handleJumpToPage = (pageId?: string) => {
    if (pageId) {
      onNavigate(pageId);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10500] flex items-center justify-center p-3 md:p-6 no-drag">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={handleClose}
      />

      {/* Main Container */}
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 25 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 25 }}
        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
        className="relative w-full max-w-4xl bg-[#090b14]/95 border border-white/10 rounded-3xl overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.9)] flex flex-col max-h-[92vh] text-slate-200"
        style={{
          boxShadow: '0 25px 80px rgba(0,0,0,0.85), 0 0 50px var(--primary-glow, rgba(14,165,233,0.15))',
        }}
      >
        {/* Top Accent Gradient Line */}
        <div
          className="absolute top-0 left-0 right-0 h-1 z-20"
          style={{
            background: 'linear-gradient(90deg, transparent, var(--primary, #0ea5e9), transparent)',
            boxShadow: '0 0 15px var(--primary-glow, rgba(14,165,233,0.5))',
          }}
        />

        {/* Header Bar */}
        <div className="px-6 pt-5 pb-3 border-b border-white/5 bg-white/[0.02] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Compass size={20} className="animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase font-['Unbounded']">
                  App-Einführung
                </span>
                <span className="text-[10px] text-slate-500 font-bold">•</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Open Pipe Club
                </span>
              </div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Funktionsübersicht für Fahrer
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Step Counter Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-slate-300">
              <span>Schritt {currentStepIndex + 1} von {totalSteps}</span>
              <span className="text-amber-400 font-black">({progressPercent}%)</span>
            </div>

            {/* Close Button */}
            <button
              onClick={handleClose}
              title="Tour beenden"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-all active:scale-95"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-white/5 relative overflow-hidden shrink-0">
          <motion.div
            initial={false}
            animate={{ width: `${progressPercent}%` }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="h-full bg-primary shadow-[0_0_12px_var(--primary-glow)]"
          />
        </div>

        {/* Topic Stepper Pills (Scrollable) */}
        <div className="px-6 py-2 border-b border-white/5 bg-black/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {ONBOARDING_STEPS.map((s, idx) => {
            const isActive = idx === currentStepIndex;
            const isCompleted = idx < currentStepIndex;
            return (
              <button
                key={s.id}
                onClick={() => setCurrentStepIndex(idx)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-primary text-black shadow-[0_0_15px_var(--primary-glow)]'
                    : isCompleted
                    ? 'bg-white/10 text-white hover:bg-white/15'
                    : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{idx + 1}.</span>
                <span>{s.category}</span>
                {isCompleted && <CheckCircle2 size={11} className="text-emerald-400" />}
              </button>
            );
          })}
        </div>

        {/* Modal Body / Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
            >
              {/* Left Column: Text & Features (7 cols) */}
              <div className="lg:col-span-7 space-y-5">
                {/* Category Badge & Title */}
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest mb-2 font-['Unbounded']">
                    <Sparkles size={12} />
                    {step.categoryBadge}
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight font-['Unbounded']">
                    {step.title}
                  </h3>
                </div>

                {/* Description */}
                <p className="text-sm leading-relaxed text-slate-300 font-normal">
                  {step.description}
                </p>

                {/* Key Feature Highlights */}
                <div className="space-y-2.5 pt-1">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Wichtigste Funktionen für dich
                  </h4>
                  <div className="space-y-2">
                    {step.highlights.map((h, i) => {
                      const Icon = h.icon;
                      return (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 hover:bg-white/[0.05] transition-all"
                        >
                          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
                            <Icon size={16} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-white block">
                              {h.title}
                            </span>
                            <span className="text-[11px] text-slate-400 leading-snug block">
                              {h.text}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pro Tip Box */}
                {step.proTip && (
                  <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 flex items-start gap-3 shadow-[0_0_20px_var(--primary-glow)]">
                    <span className="text-base leading-none mt-0.5">💡</span>
                    <div className="text-xs text-slate-200 leading-relaxed">
                      <strong className="text-primary font-bold uppercase tracking-wider text-[10px] block mb-0.5">
                        Fahrer-Tipp
                      </strong>
                      {step.proTip}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Visual Preview Widget (5 cols) */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center">
                <div className="w-full bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 rounded-3xl p-5 shadow-xl relative overflow-hidden">
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center justify-between">
                    <span>Live-Vorschau</span>
                    <span className="text-primary">{step.category}</span>
                  </div>

                  {/* Render Mockup Widget based on previewType */}
                  <PreviewWidget type={step.previewType} />

                  {/* Jump To Page Action Button */}
                  {step.pageId && (
                    <button
                      onClick={() => handleJumpToPage(step.pageId)}
                      className="mt-4 w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-primary hover:text-black text-slate-300 text-[11px] font-bold uppercase tracking-wider border border-white/10 hover:border-primary transition-all flex items-center justify-center gap-2 group"
                    >
                      <span>Zu dieser Seite wechseln</span>
                      <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Navigation Bar */}
        <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          {/* Don't show again checkbox */}
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-slate-200 select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-white/20 bg-white/5 w-4 h-4 cursor-pointer"
              style={{ accentColor: 'var(--primary, #0ea5e9)' }}
            />
            <span>Nicht mehr automatisch beim Start anzeigen</span>
          </label>

          {/* Buttons: Back / Next / Finish */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {currentStepIndex > 0 && (
              <button
                onClick={handlePrev}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft size={16} />
                <span>Zurück</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl bg-primary hover:brightness-110 text-black text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_20px_var(--primary-glow)] hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              <span>
                {currentStepIndex === totalSteps - 1 ? 'Tour beenden & Losfahren' : 'Weiter'}
              </span>
              {currentStepIndex === totalSteps - 1 ? (
                <CheckCircle2 size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

/* Visual Preview Mockups for each section */
const PreviewWidget: React.FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case 'welcome':
      return (
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-[#0e1222] border border-amber-500/20 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center font-bold text-lg font-['Unbounded']">
              OPC
            </div>
            <h5 className="font-['Unbounded'] font-black text-white text-xs uppercase tracking-tight">
              Open Pipe Club
            </h5>
            <p className="text-[10px] text-slate-400">
              Offizielle Spedition für ETS2 & ATS
            </p>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Community Aktiv
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
            <div className="p-2 rounded-xl bg-white/5 border border-white/5">
              <span className="text-slate-400 block">Touren</span>
              <strong className="text-white font-black text-xs">Voll erfasst</strong>
            </div>
            <div className="p-2 rounded-xl bg-white/5 border border-white/5">
              <span className="text-slate-400 block">Community</span>
              <strong className="text-white font-black text-xs">Aktiv vernetzt</strong>
            </div>
          </div>
        </div>
      );

    case 'status-bar':
      return (
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
              Header Status-Pills
            </span>
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                <span className="text-[10px] font-black text-white">RPC</span>
              </div>
              <span className="text-[9px] font-bold text-emerald-400 uppercase">Discord Verbunden</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                <span className="text-[10px] font-black text-white">SDK</span>
              </div>
              <span className="text-[9px] font-bold text-emerald-400 uppercase">Spiel erkannt (ETS2)</span>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5">
            <Bell size={18} className="text-amber-400 shrink-0" />
            <div className="text-[10px] text-amber-200">
              <strong className="block text-white">Info-Glocke:</strong>
              Meldungen bei Tourstart, Ankunft & Konvoi-Aufrufen
            </div>
          </div>
        </div>
      );

    case 'dashboard':
      return (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Heutige KM</span>
              <span className="text-base font-black text-white">1.428 km</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Aufträge</span>
              <span className="text-base font-black text-amber-400">4 Touren</span>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">TruckersMP Server:</span>
              <span className="text-emerald-400 font-bold">Simulation 1</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Aktueller Status:</span>
              <span className="text-white font-bold">Auf Achse 🚚</span>
            </div>
          </div>
        </div>
      );

    case 'events':
      return (
        <div className="space-y-2.5">
          <div className="p-3.5 rounded-2xl bg-[#0f1220] border border-amber-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">
                Samstags-Konvoi
              </span>
              <span className="text-[9px] text-slate-400 font-bold">20:00 Uhr</span>
            </div>
            <div className="text-xs font-bold text-white">
              Duisburg ➔ Hamburg
            </div>
            <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
              <Radio size={10} className="text-emerald-400" />
              <span>Funk: Kanal 19 (Sim 1)</span>
            </div>
            <div className="pt-2 border-t border-white/5 flex gap-1.5">
              <span className="flex-1 py-1 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-black text-center border border-emerald-500/30">
                Zusage (42)
              </span>
              <span className="flex-1 py-1 rounded bg-white/5 text-slate-400 text-[9px] font-bold text-center">
                Unsicher
              </span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center text-[10px] text-slate-300 flex items-center justify-center gap-1.5">
            <Navigation size={12} className="text-amber-400" />
            <span>Route per Knopfdruck ins Spiel laden</span>
          </div>
        </div>
      );

    case 'news':
      return (
        <div className="space-y-2.5">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[8px] font-black uppercase">
                Ankündigung
              </span>
              <span className="text-[9px] text-slate-400">Vor 2 Stunden</span>
            </div>
            <h6 className="text-xs font-bold text-white leading-tight">
              Neues Konvoi-Reglement & Herbst-Lackierung freigegeben
            </h6>
            <p className="text-[10px] text-slate-400 line-clamp-2">
              Alle Fahrer sind herzlich eingeladen, die neue Speditions-Skin zu testen...
            </p>
            <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-400">
              <span>❤️ 28 Likes</span>
              <span>💬 12 Kommentare</span>
            </div>
          </div>
        </div>
      );

    case 'chat':
      return (
        <div className="space-y-2">
          <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-2 text-[10px]">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-amber-500/30 flex items-center justify-center text-[8px] font-black text-amber-400">
                F
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <strong className="text-white">Freddy</strong>
                  <span className="text-[8px] px-1 rounded bg-white/10 text-slate-300">Fahrer</span>
                  <span className="text-[8px] text-slate-500">19:42</span>
                </div>
                <p className="text-slate-300 mt-0.5">
                  Treffen an der Raststätte Hannover Süd um 20:15 Uhr? 🚚💨
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 pt-1.5 border-t border-white/5">
              <div className="w-5 h-5 rounded-full bg-blue-500/30 flex items-center justify-center text-[8px] font-black text-blue-400">
                M
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <strong className="text-white">Max</strong>
                  <span className="text-[8px] text-slate-500">19:43</span>
                </div>
                <p className="text-slate-300 mt-0.5">
                  Bin dabei, tanke gerade noch kurz voll! 👍
                </p>
              </div>
            </div>
          </div>
        </div>
      );

    case 'map':
      return (
        <div className="space-y-2.5">
          <div className="p-3.5 rounded-2xl bg-[#090e1a] border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                Live Radar
              </span>
              <span className="text-amber-400 font-bold">14 Fahrer aktiv</span>
            </div>
            <div className="h-20 rounded-xl bg-slate-900/80 border border-white/5 relative overflow-hidden flex items-center justify-center">
              {/* Radar Grid Circles */}
              <div className="absolute w-16 h-16 rounded-full border border-amber-500/20" />
              <div className="absolute w-28 h-28 rounded-full border border-amber-500/10" />
              <div className="relative flex items-center gap-1 text-[10px] font-black text-amber-400 bg-black/60 px-2 py-1 rounded-lg border border-amber-500/30">
                <span>🚚 Dein LKW</span>
                <span className="text-white font-normal">• 85 km/h</span>
              </div>
            </div>
            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-[9px] text-red-300 flex items-center justify-between">
              <span>⚠️ C-D Road (Duisburg–Calais)</span>
              <strong className="text-red-400">Stau (78 Spieler)</strong>
            </div>
          </div>
        </div>
      );

    case 'gallery':
      return (
        <div className="space-y-2">
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/40 relative group">
            <div className="h-24 bg-gradient-to-tr from-amber-950/40 via-slate-900 to-indigo-950/40 flex items-center justify-center text-slate-500">
              <ImageIcon size={28} className="text-amber-500/40" />
            </div>
            <div className="p-2.5 bg-black/60 backdrop-blur-md flex items-center justify-between text-[10px]">
              <span className="font-bold text-white truncate">Sonnenaufgang in Schweden</span>
              <span className="text-amber-400 shrink-0 font-bold">❤️ 34</span>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-center text-[9px] text-slate-400">
            📸 Eigene Screenshots hochladen & präsentieren
          </div>
        </div>
      );

    case 'statistiken':
      return (
        <div className="space-y-2">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Gesamtdistanz:</span>
              <strong className="text-white">128.450 km</strong>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Abgelieferte Frachten:</span>
              <strong className="text-amber-400">142 Aufträge</strong>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Ranking im Club:</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[9px]">
                🏆 Rang #3
              </span>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center text-[9px] text-emerald-300">
            ✅ Vollautomatisch per SCS-Telemetrie erfasst
          </div>
        </div>
      );

    case 'team':
      return (
        <div className="space-y-2">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-black text-amber-400">
              OPC
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-white block truncate">Club-Gemeinschaft</span>
              <span className="text-[10px] text-slate-400 block">50+ aktive Fahrer & Freunde</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-[9px]">
            <div className="p-2 rounded-xl bg-white/5 border border-white/5">
              <span className="text-slate-400 block">Fahrerakten</span>
              <strong className="text-white">Profile ansehen</strong>
            </div>
            <div className="p-2 rounded-xl bg-white/5 border border-white/5">
              <span className="text-slate-400 block">Kontakte</span>
              <strong className="text-white">Discord & Steam</strong>
            </div>
          </div>
        </div>
      );

    case 'afkbot':
      return (
        <div className="space-y-2.5">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Bot size={14} className="text-amber-400" />
                Anti-Kick Bot
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-[8px] uppercase">
                Bereit
              </span>
            </div>
            <div className="p-2 rounded-xl bg-black/40 border border-white/5 text-[10px] space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Pausenzeit:</span>
                <span className="text-white font-bold">14 Min / 20 Min</span>
              </div>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="w-[70%] h-full bg-amber-400" />
              </div>
            </div>
            <p className="text-[9px] text-slate-400 text-center">
              🛡️ Verhindert ungewollte Server-Kicks bei Raststätten-Pausen
            </p>
          </div>
        </div>
      );

    case 'overlay':
      return (
        <div className="space-y-2.5">
          <div className="p-3.5 rounded-2xl bg-black/60 border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-white">Ingame HUD (F9)</span>
              <span className="text-amber-400 font-black">Live im Spiel</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#080b14] border border-white/10 text-center space-y-1">
              <div className="text-2xl font-black text-white font-['Unbounded']">
                88 <span className="text-xs text-amber-400 font-normal">KM/H</span>
              </div>
              <div className="flex justify-center gap-3 text-[9px] text-slate-400">
                <span>Gang: <strong>11</strong></span>
                <span>Schaden: <strong className="text-emerald-400">0%</strong></span>
                <span>Rest: <strong>420 km</strong></span>
              </div>
            </div>
            <div className="p-2 rounded-xl bg-white/5 text-center text-[9px] text-slate-300">
              📱 CarPlay-Modus: Tablet/Zweitbildschirm als Dashboard
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
};

export default DriverOnboardingModal;
