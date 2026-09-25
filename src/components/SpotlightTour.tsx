import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronRight, ChevronLeft, CheckCircle2, Sparkles, Compass, Lightbulb
} from 'lucide-react';

export interface TourStep {
  id: string;
  pageId: string;
  target: string;
  category: string;
  title: string;
  description: string;
  tip?: string;
  preferredPosition?: 'bottom' | 'top' | 'right' | 'left';
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'status-pills',
    pageId: 'dashboard',
    target: '#tour-status-pills',
    category: 'Status & Telemetrie',
    title: 'Live-Telemetrie & Status',
    description:
      'Diese Indikatoren zeigen dir den Echtzeit-Status: RPC leuchtet grün, wenn Discord aktiv ist. SDK wird grün, sobald ETS2/ATS läuft und deine Fahrtdaten (Tempo, Fracht, Tank, Ort) automatisch ausgelesen werden.',
    tip: 'Bleibt das SDK rot, überprüfe beim App-Start, ob das OPCGameBridge-Plugin installiert ist.',
    preferredPosition: 'bottom',
  },
  {
    id: 'notif-bell',
    pageId: 'dashboard',
    target: '#notif-bell',
    category: 'Info-Zentrale',
    title: 'Benachrichtigungen & Info-Zentrale',
    description:
      'Hier erhältst du automatische Push-Meldungen bei Tourstart, Ankunft, neuen Konvoi-Einladungen und wichtigen Club-Ankündigungen.',
    tip: 'Ein roter Punkt signalisiert dir ungelesene Mitteilungen.',
    preferredPosition: 'bottom',
  },
  {
    id: 'dashboard-hero',
    pageId: 'dashboard',
    target: '#tour-dashboard-hero',
    category: 'Dashboard',
    title: 'Deine Fahrer-Schaltzentrale',
    description:
      'Dein persönlicher Begrüßungsbereich zeigt dir deinen Fahrer-Namen, deine Speditions-Rolle und deinen Begrüßungstext. Von hier aus kannst du diese Einführungstour jederzeit erneut starten.',
    tip: 'Über das Fahrer-Menü oben rechts oder die Profil-Seite erreichst du deine persönlichen Einstellungen.',
    preferredPosition: 'bottom',
  },
  {
    id: 'dashboard-kpis',
    pageId: 'dashboard',
    target: '#tour-dashboard-kpis',
    category: 'Dashboard',
    title: 'Deine persönlichen Fahrdaten',
    description:
      'Hier siehst du deine gesamten persönlichen Leistungen im Überblick: Gefahrene Gesamtkilometer, absolvierte Aufträge, erzielter Bruttoumsatz und dein aktuelles Fahrer-Level.',
    tip: 'Die Werte aktualisieren sich automatisch bei jeder übermittelten Frachtablieferung.',
    preferredPosition: 'bottom',
  },
  {
    id: 'dashboard-events',
    pageId: 'dashboard',
    target: '#tour-dashboard-events',
    category: 'Dashboard',
    title: 'Nächste Termine & Events',
    description:
      'Die nächsten Club-Touren direkt im Blick: Sieh Veranstalter, Titel, Start- und Zielort sowie den Abfahrtszeitpunkt. Ein Klick auf ein Event öffnet alle Details.',
    tip: 'Klicke auf „Alle“, um direkt zum Terminkalender der App zu wechseln.',
    preferredPosition: 'top',
  },
  {
    id: 'dashboard-news',
    pageId: 'dashboard',
    target: '#tour-dashboard-news',
    category: 'Dashboard',
    title: 'Neueste Mitteilungen',
    description:
      'Verpasse keine offiziellen Speditions-Updates. Hier siehst du die aktuellsten News-Beiträge und Ankündigungen direkt auf dem Dashboard.',
    tip: 'Klicke auf einen Beitrag, um ihn direkt im News-Bereich aufzurufen.',
    preferredPosition: 'top',
  },
  {
    id: 'events-list',
    pageId: 'events',
    target: '#tour-events-list',
    category: 'Events & Konvois',
    title: 'Konvois, Anmeldung & GPS-Route',
    description:
      'Hier findest du alle offiziellen Speditionstouren. Melde dich mit 1 Klick für ein Event an oder wieder ab und übernehme vorbereitete GPS-Routen direkt in dein Ingame-Navi!',
    tip: 'Wechsle oben zwischen Listen- und Kalender-Ansicht und beachte empfohlene Server und Funkkanäle.',
    preferredPosition: 'top',
  },
  {
    id: 'news-grid',
    pageId: 'news',
    target: '#tour-news-grid',
    category: 'News',
    title: 'VTC-News & Ankündigungen',
    description:
      'Lies offizielle Neuigkeiten der Speditionsleitung und halte dich über Club-Updates und Mitteilungen auf dem Laufenden.',
    tip: 'Klicke bei längeren Beiträgen auf „Weiterlesen“, um den vollständigen Artikeltext aufzuklappen.',
    preferredPosition: 'top',
  },
  {
    id: 'chat-sidebar',
    pageId: 'chat',
    target: '#tour-chat-sidebar',
    category: 'Club-Funk',
    title: 'Funk-Kanäle & Direktnachrichten',
    description:
      'Der eingebaute Club-Funk: Nutze die Standard-Kanäle für den täglichen Schnack auf der Autobahn oder schreibe einzelnen Kollegen private Direktnachrichten (DMs).',
    tip: 'Über das Plus-Symbol kannst du auch eigene Gruppenchats für dich und deine Mitfahrer anlegen.',
    preferredPosition: 'right',
  },
  {
    id: 'map-controls',
    pageId: 'map',
    target: '#tour-map-controls',
    category: 'Live-Karte',
    title: 'Interaktive Karte & Stau-Warner',
    description:
      'Die Live-Karte ortet alle Clubmitglieder in Echtzeit auf den TruckersMP-Servern. Zudem warnt sie dich vor Staus und hohem Verkehrsaufkommen auf Strecken wie der C-D Road (Duisburg–Calais).',
    tip: 'Über „Ebenen & Filter“ kannst du Stauzonen, die 3D-Ansicht und deinen TruckersMP-Server wählen.',
    preferredPosition: 'right',
  },
  {
    id: 'map-sidebar',
    pageId: 'map',
    target: '#tour-map-sidebar',
    category: 'Live-Karte',
    title: 'Fahrerliste & Kamera-Fokus',
    description:
      'Hier siehst du alle Kollegen, die aktuell auf Achse sind. Ein Klick auf einen Fahrer zentriert die Karte sofort auf seine Position mit Live-Tempo und Frachtinfo.',
    tip: 'Nutze das Suchfeld, um gezielt nach bestimmten Fahrernamen oder TruckersMP-IDs zu filtern.',
    preferredPosition: 'left',
  },
  {
    id: 'gallery-container',
    pageId: 'gallery',
    target: '#tour-gallery-container',
    category: 'Galerie',
    title: 'Community-Galerie & Schnappschüsse',
    description:
      'Teile deine schönsten LKW-Momente: Lade eigene Screenshots von Raststätten, Werkstatt-Tunings oder Konvois mit Bildunterschrift hoch und betrachte die Aufnahmen deiner Kollegen.',
    tip: 'Ein Klick auf ein Bild öffnet es in voller Auflösung in der Lightbox.',
    preferredPosition: 'top',
  },
  {
    id: 'stats-container',
    pageId: 'statistiken',
    target: '#tour-stats-container',
    category: 'Statistiken',
    title: 'Fahrtenbuch & Fahrer-Rangliste',
    description:
      'Hier siehst du die aggregierten Leistungsdaten des Clubs: Gesamtkilometer, Jobs, Frachttonnage und Gesamtumsatz sowie die Top-10-Rangliste der aktivsten Fahrer.',
    tip: 'Schließe Aufträge im Spiel ab, um mit deinen Kilometern und Umsätzen in der Rangliste aufzusteigen.',
    preferredPosition: 'bottom',
  },
  {
    id: 'team-container',
    pageId: 'team',
    target: '#tour-team-container',
    category: 'Team',
    title: 'Speditions-Team & Kollegen',
    description:
      'Hier lernst du deine Kollegen und Ansprechpartner kennen, übersichtlich strukturiert nach Speditionsrollen samt bisheriger Fahrstrecke und erwirtschaftetem Umsatz.',
    tip: 'Klicke auf eine Fahrer-Karte, um sein vollständiges Profil mit Biografie, Social Links und TruckersMP-ID aufzurufen.',
    preferredPosition: 'bottom',
  },
  {
    id: 'afkbot-card',
    pageId: 'afkbot',
    target: '#tour-afkbot-card',
    category: 'Anti-AFK Bot',
    title: 'Schutz vor Server-Kicks',
    description:
      'Verhindert automatische Inaktivitäts-Kicks auf vollen TruckersMP-Servern während deiner Raststätten-Pausen: Der Bot sendet in festgelegten Intervallen Chat-Nachrichten ins Spiel, solange ETS2 aktiv ist.',
    tip: 'Passe den Hotkey und deine Nachrichten in der Konfiguration frei an. Parke deinen LKW stets sicher auf Rastplätzen!',
    preferredPosition: 'right',
  },
  {
    id: 'overlay-container',
    pageId: 'overlay-settings',
    target: '#tour-overlay-container',
    category: 'Overlay & CarPlay',
    title: 'Ingame-HUD & CarPlay-Cockpit',
    description:
      'Passe dein transparentes Ingame-HUD (Taste F9 im Spiel) oder dein CarPlay-Armaturenbrett für Tablets und Zweitmonitore individuell an. Wähle Designs, Farben und Widgets frei aus.',
    tip: 'Mit der Taste F9 kannst du das Ingame-Overlay jederzeit während der Fahrt ein- und ausblenden.',
    preferredPosition: 'bottom',
  },
  {
    id: 'profile-container',
    pageId: 'profile',
    target: '#tour-profile-container',
    category: 'Fahrerprofil',
    title: 'Dein Profil & Fahrerakte',
    description:
      'Verwalte deine persönlichen Fahrer-Daten: Lade einen Avatar und Banner hoch, trage deine Social Links und deine TruckersMP-ID ein und überprüfe deine letzten Fahrten samt Leistungsdiagrammen.',
    tip: 'Deine persönliche Biografie kannst du direkt auf deiner Profilseite eintragen und bearbeiten.',
    preferredPosition: 'bottom',
  },
];

interface SpotlightTourProps {
  isActive: boolean;
  currentPage: string;
  onNavigate: (pageId: string) => void;
  onClose: () => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export const SpotlightTour: React.FC<SpotlightTourProps> = ({
  isActive,
  currentPage,
  onNavigate,
  onClose,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number; placement: string } | null>(null);
  const [isNavigatingPage, setIsNavigatingPage] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(true);
  const [popoverDimensions, setPopoverDimensions] = useState<{ width: number; height: number }>({ width: 350, height: 370 });

  const popoverRef = useRef<HTMLDivElement>(null);
  const step = TOUR_STEPS[currentStepIndex];
  const totalSteps = TOUR_STEPS.length;
  const retryIntervalRef = useRef<any>(null);
  const settleTimeoutRef1 = useRef<any>(null);
  const settleTimeoutRef2 = useRef<any>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const targetElementRef = useRef<Element | null>(null);

  // Dynamically measure actual rendered size of popover
  useLayoutEffect(() => {
    if (popoverRef.current) {
      const h = popoverRef.current.offsetHeight;
      const w = popoverRef.current.offsetWidth;
      if (h > 0 && w > 0 && (Math.abs(h - popoverDimensions.height) > 4 || Math.abs(w - popoverDimensions.width) > 4)) {
        setPopoverDimensions({ width: w, height: h });
      }
    }
  });

  const measureElement = useCallback(() => {
    let el = targetElementRef.current;
    if (!el || !document.body.contains(el)) {
      el = document.querySelector(step?.target || '');
      targetElementRef.current = el;
    }
    if (!el) return;

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    const targetInfo: TargetRect = {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      bottom: rect.bottom,
      right: rect.right,
    };
    setTargetRect(targetInfo);

    // Compute popover position using real or estimated dimensions
    const actualWidth = popoverRef.current?.offsetWidth || popoverDimensions.width || 350;
    const actualHeight = popoverRef.current?.offsetHeight || popoverDimensions.height || 370;
    const margin = 16;
    const headerHeight = 76; // Top-Nav height + margin
    const screenPad = 16;

    // Available space on all 4 sides of the target element
    const spaceBottom = window.innerHeight - targetInfo.bottom - screenPad;
    const spaceTop = targetInfo.top - headerHeight - screenPad;
    const spaceRight = window.innerWidth - targetInfo.right - screenPad;
    const spaceLeft = targetInfo.left - screenPad;

    const fitsBottom = spaceBottom >= actualHeight + margin;
    const fitsTop = spaceTop >= actualHeight + margin;
    const fitsRight = spaceRight >= actualWidth + margin;
    const fitsLeft = spaceLeft >= actualWidth + margin;

    let placement = step?.preferredPosition || 'bottom';

    // Comprehensive fallback if preferred side does not fit
    if (placement === 'bottom' && !fitsBottom) {
      if (fitsRight) placement = 'right';
      else if (fitsTop) placement = 'top';
      else if (fitsLeft) placement = 'left';
      else placement = spaceTop > spaceBottom ? 'top' : 'bottom';
    } else if (placement === 'top' && !fitsTop) {
      if (fitsRight) placement = 'right';
      else if (fitsBottom) placement = 'bottom';
      else if (fitsLeft) placement = 'left';
      else placement = spaceBottom > spaceTop ? 'bottom' : 'top';
    } else if (placement === 'right' && !fitsRight) {
      if (fitsBottom) placement = 'bottom';
      else if (fitsLeft) placement = 'left';
      else if (fitsTop) placement = 'top';
      else placement = 'bottom';
    } else if (placement === 'left' && !fitsLeft) {
      if (fitsRight) placement = 'right';
      else if (fitsBottom) placement = 'bottom';
      else if (fitsTop) placement = 'top';
      else placement = 'bottom';
    }

    let top = 0;
    let left = 0;

    switch (placement) {
      case 'bottom':
        top = targetInfo.bottom + margin;
        left = targetInfo.left + targetInfo.width / 2 - actualWidth / 2;
        break;
      case 'top':
        top = targetInfo.top - actualHeight - margin;
        left = targetInfo.left + targetInfo.width / 2 - actualWidth / 2;
        break;
      case 'right':
        top = targetInfo.top;
        left = targetInfo.right + margin;
        break;
      case 'left':
        top = targetInfo.top;
        left = targetInfo.left - actualWidth - margin;
        break;
      default:
        top = targetInfo.bottom + margin;
        left = targetInfo.left;
    }

    // Safety Clamps: NEVER allow popover to bleed off-screen or behind the header!
    top = Math.max(headerHeight, Math.min(window.innerHeight - actualHeight - screenPad, top));
    left = Math.max(screenPad, Math.min(window.innerWidth - actualWidth - screenPad, left));

    setPopoverPos({ top, left, placement });
  }, [step, popoverDimensions]);

  const startTracking = useCallback((el: Element) => {
    targetElementRef.current = el;

    try {
      const rect = el.getBoundingClientRect();
      if (rect.top < 80 || rect.bottom > window.innerHeight - 20) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    } catch (e) {
      // ignore
    }

    // Initial measurement
    measureElement();

    // Attach ResizeObserver to the element
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }
    resizeObserverRef.current = new ResizeObserver(() => {
      measureElement();
    });
    resizeObserverRef.current.observe(el);

    // Settle checks after smooth scrolling finishes
    if (settleTimeoutRef1.current) clearTimeout(settleTimeoutRef1.current);
    if (settleTimeoutRef2.current) clearTimeout(settleTimeoutRef2.current);

    settleTimeoutRef1.current = setTimeout(() => {
      measureElement();
    }, 200);

    settleTimeoutRef2.current = setTimeout(() => {
      measureElement();
    }, 450);
  }, [measureElement]);

  // Position calculation with robust polling retry
  const updatePosition = useCallback(() => {
    if (!step) return;

    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current);
      retryIntervalRef.current = null;
    }

    const checkElement = (isFinalAttempt = false) => {
      const el = document.querySelector(step.target);
      if (el) {
        setIsNavigatingPage(false);
        startTracking(el);
        return true;
      }
      if (isFinalAttempt) {
        setIsNavigatingPage(false);
        // Fallback: show popover safely in viewport center
        setTargetRect(null);
        setPopoverPos({
          top: Math.max(80, window.innerHeight / 2 - 130),
          left: Math.max(16, window.innerWidth / 2 - 175),
          placement: 'center',
        });
      }
      return false;
    };

    // Immediate attempt
    if (checkElement()) return;

    // Retry checking every 50ms for up to 100 attempts (~5s) to allow page mount & API load
    let attempts = 0;
    retryIntervalRef.current = setInterval(() => {
      attempts++;
      const found = checkElement(attempts >= 100);
      if (found || attempts >= 100) {
        if (retryIntervalRef.current) {
          clearInterval(retryIntervalRef.current);
          retryIntervalRef.current = null;
        }
      }
    }, 50);
  }, [step, startTracking]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
        retryIntervalRef.current = null;
      }
      if (settleTimeoutRef1.current) clearTimeout(settleTimeoutRef1.current);
      if (settleTimeoutRef2.current) clearTimeout(settleTimeoutRef2.current);
      if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
    };
  }, []);

  // Switch page if needed and update position
  useEffect(() => {
    if (!isActive || !step) return;

    if (step.pageId && step.pageId !== currentPage) {
      setIsNavigatingPage(true);
      // Reset scroll on all scroll containers in the app
      document.querySelectorAll('.overflow-y-auto').forEach((el) => {
        el.scrollTop = 0;
      });
      window.scrollTo({ top: 0, behavior: 'instant' as any });
      onNavigate(step.pageId);
    }
    updatePosition();
  }, [isActive, currentStepIndex, currentPage, step, onNavigate, updatePosition]);

  // MutationObserver on document.body to react immediately when dynamic elements or cards mount
  useEffect(() => {
    if (!isActive || !step) return;

    const mutationObserver = new MutationObserver(() => {
      const el = document.querySelector(step.target);
      if (el) {
        if (el !== targetElementRef.current || !targetRect) {
          setIsNavigatingPage(false);
          startTracking(el);
        } else {
          measureElement();
        }
      }
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      mutationObserver.disconnect();
    };
  }, [isActive, step, targetRect, startTracking, measureElement]);

  // Window scroll and resize listeners
  useEffect(() => {
    if (!isActive || !step) return;

    const handleUpdate = () => {
      measureElement();
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [isActive, step, measureElement]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleFinish();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, currentStepIndex]);

  const handleNext = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleFinish = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('opc_onboarding_completed', 'true');
      } catch (e) {
        // ignore
      }
    }
    onClose();
  };

  if (!isActive || !step) return null;

  const isSmallIcon = targetRect ? targetRect.width <= 48 && targetRect.height <= 48 : false;
  const pad = isSmallIcon ? 6 : 8;

  return (
    <div className="fixed inset-0 z-[10000] pointer-events-none no-drag">
      {/* 1. Spotlight Cutout Box (with huge box-shadow to dim surroundings) */}
      <AnimatePresence>
        {targetRect && (
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.92,
              top: Math.max(0, targetRect.top - pad),
              left: Math.max(0, targetRect.left - pad),
              width: targetRect.width + pad * 2,
              height: targetRect.height + pad * 2,
              borderRadius: isSmallIcon ? 9999 : 20,
            }}
            animate={{
              opacity: isNavigatingPage ? 0 : 1,
              scale: isNavigatingPage ? 0.95 : 1,
              top: Math.max(0, targetRect.top - pad),
              left: Math.max(0, targetRect.left - pad),
              width: targetRect.width + pad * 2,
              height: targetRect.height + pad * 2,
              borderRadius: isSmallIcon ? 9999 : 20,
            }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 25,
            }}
            className="fixed pointer-events-none"
            style={{
              border: '2px solid var(--primary, #0ea5e9)',
              boxShadow: '0 0 0 9999px rgba(3, 5, 12, 0.75), 0 0 35px var(--primary-glow, rgba(14, 165, 233, 0.6)), 0 0 15px var(--primary, #0ea5e9)',
              zIndex: 10000,
            }}
          >
            {/* Animated Pulse Ring */}
            <div
              className="absolute inset-0 rounded-[inherit] border-2 animate-ping"
              style={{ borderColor: 'var(--primary, #0ea5e9)', opacity: 0.35 }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Floating Explanation Card (Das kleine Feld daneben) */}
      <AnimatePresence mode="wait">
        {popoverPos && !isNavigatingPage && (
          <motion.div
            ref={popoverRef}
            key={step.id}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="fixed pointer-events-auto z-[10005] w-[350px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-92px)] overflow-y-auto bg-[#0a0d1a]/95 rounded-2xl p-5 backdrop-blur-2xl text-slate-200"
            style={{
              top: popoverPos.top,
              left: popoverPos.left,
              border: '1px solid color-mix(in srgb, var(--primary, #0ea5e9) 35%, transparent)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.9), 0 0 30px var(--primary-glow, rgba(14,165,233,0.25))',
            }}
          >
            {/* Top Accent Line */}
            <div
              className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
              style={{
                background: 'linear-gradient(90deg, transparent, var(--primary, #0ea5e9), transparent)',
                boxShadow: '0 0 10px var(--primary-glow, rgba(14,165,233,0.5))',
              }}
            />

            {/* Header / Badges */}
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider font-['Unbounded']"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--primary, #0ea5e9) 15%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--primary, #0ea5e9) 30%, transparent)',
                    color: 'var(--primary, #0ea5e9)',
                  }}
                >
                  <Compass size={11} className="animate-spin-slow" />
                  {step.category}
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  {currentStepIndex + 1}/{totalSteps}
                </span>
              </div>

              <button
                onClick={handleFinish}
                title="Tour beenden"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Title */}
            <h4 className="font-['Unbounded'] font-bold text-white text-sm uppercase tracking-tight mb-2">
              {step.title}
            </h4>

            {/* Description */}
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              {step.description}
            </p>

            {/* Pro Tip Box */}
            {step.tip && (
              <div
                className="p-2.5 rounded-xl text-[11px] leading-snug flex items-start gap-2 mb-3.5"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--primary, #0ea5e9) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--primary, #0ea5e9) 25%, transparent)',
                  color: 'color-mix(in srgb, var(--primary, #0ea5e9) 30%, #ffffff)',
                }}
              >
                <Lightbulb size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--primary, #0ea5e9)' }} />
                <span>{step.tip}</span>
              </div>
            )}

            {/* Footer Navigation Bar */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
              {/* Checkbox Don't show again */}
              <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-400 hover:text-slate-200 select-none">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="rounded border-white/20 bg-white/5 w-3.5 h-3.5 cursor-pointer"
                  style={{ accentColor: 'var(--primary, #0ea5e9)' }}
                />
                <span>Nicht mehr anzeigen</span>
              </label>

              {/* Prev / Next buttons */}
              <div className="flex items-center gap-1.5">
                {currentStepIndex > 0 && (
                  <button
                    onClick={handlePrev}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                    title="Zurück"
                  >
                    <ChevronLeft size={16} />
                  </button>
                )}

                <button
                  onClick={handleNext}
                  style={{
                    backgroundColor: 'var(--primary, #0ea5e9)',
                    boxShadow: '0 0 15px var(--primary-glow, rgba(14,165,233,0.35))',
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-black text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 hover:brightness-110 hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <span>{currentStepIndex === totalSteps - 1 ? 'Fertig' : 'Weiter'}</span>
                  {currentStepIndex === totalSteps - 1 ? (
                    <CheckCircle2 size={13} />
                  ) : (
                    <ChevronRight size={13} />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SpotlightTour;
