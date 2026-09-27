# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

## [1.7.67] - 2026-09-27

### 🗺️ ETS2 1:1 Routen-Übernahme, CarPlay Routen-Bereinigung & Nahtlose Job-Fortführung
  - **1:1 GPS-Wegpunkte aus dem Spiel ([GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx))**:
    - Spielrouten werden direkt 1:1 ohne verzerrende Spline-Glättung übernommen.
  - **Zuverlässige Routen-Entfernung bei Auftragsabgabe im CarPlay ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx), [main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**:
    - Sofortiges Leeren der Navigationsroute und Wegpunkte bei `job_delivered` und `job_cancelled`.
  - **Schutz vor falscher Auftragsabgabe beim Beenden des Spiels ([main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**:
    - Auftragsende wird strikt an echten In-World-Status und SDK-Events gekoppelt. Beim Spiel-Neustart wird der laufende Auftrag nahtlos fortgesetzt.

## [1.7.66] - 2026-09-27

### ⏱️ Fehlerbehebung: Discord RPC Countdown nutzt echte Restzeit statt In-Game-Spielzeit
  - **Echte Restzeit-Berechnung ([main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts), [OverlaySettings.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/OverlaySettings.tsx))**:
    - **Problem**: Bei eingeschaltetem ETA Live-Countdown im Discord Rich Presence Status wurde die verbleibende Navigationszeit `navTime` aus dem SCS Telemetrie-SDK direkt als Sekunden-Offset übergeben. Da ETS2 und ATS mit komprimierter Spielzeit laufen (`1:19` bzw. `1:20`), zeigte Discord fälschlicherweise mehrstündige Restzeiten an (z. B. 4 Stunden statt 13 Minuten realer Fahrzeit).
    - **Umrechnung in Realzeit**:
      - `telemetryData.navTime` wird nun durch die ETS2/ATS-Zeitskalierung dividiert (`19` für ETS2, `20` für ATS).
      - **Stadt- und Zielbereichs-Dämpfung**: Liegt die Restdistanz unter 3.000 m, wird der Zeitfaktor dynamisch und stufenlos in Richtung des Stadt-Faktors `1:3` angepasst, um auch die letzten Meter vor dem Abladepunkt realistisch abzubilden.
      - **Discord-Profil**: Der rückwärts zählende Countdown im Discord-Profil entspricht nun exakt der tatsächlichen Zeit am Steuer.
    - **Settings-Text**: Beschreibung in den App-Einstellungen präzisiert.

## [1.7.65] - 2026-09-25

### 🗺️ Fehlerbehebung: In-Game GPS-Routenextraktion nach ETS2-Update wiederhergestellt
  - **Signatur-Aktualisierung in OPCGameBridge ([routedata.cpp](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/OPCGameBridge/OPCGameBridge/routedata.cpp), [traffic.h](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/OPCGameBridge/OPCGameBridge/traffic.h), [traffic.cpp](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/OPCGameBridge/OPCGameBridge/traffic.cpp))**:
    - Das veraltete AOB-Muster für `base_ctrl` verhinderte das Lokalisieren der Navigation im neuen ETS2-Update (1.61+).
    - `routedata.cpp` teilt sich nun nahtlos den bereits ermittelten `base_ctrl`-Pointer mit dem `traffic`-Modul und verfügt über dieselbe Multi-Muster-Erkennung für ETS2 1.61+ mit Fallback auf frühere Versionen.
    - Die Wegpunkte werden nun wieder zuverlässig aus der Prism3D-Engine in `Local\OPCRouteData` geschrieben und von der App dargestellt.
    - `OPCGameBridge.dll` wurde neu gebaut und in das ETS2-Plugins-Verzeichnis kopiert.

## [1.7.64] - 2026-09-25

### 🚦 Fehlerbehebung: Ampelerkennung nach neuem ETS2-Update wiederhergestellt
  - **Neues base_ctrl Signatur-Muster ([telemetry-bridge.cs](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/telemetry-bridge.cs), [traffic.cpp](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/OPCGameBridge/OPCGameBridge/traffic.cpp))**:
    - Im neuen ETS2-Update hat SCS Software die Funktionen im Spielcode neu assembliert. Das alte RDX-Muster (`48 8B 15 ...`) griff ins Leere. Es wurde durch das exakte neue RCX-Muster (`48 8B 0D ?? ?? ?? ?? E8 ?? ?? ?? ?? C6 86 B8 02 00 00 01`) sowie einen Fast-Check auf `0xFF36F3` ergänzt.
  - **Dynamischer KDOP-Array-Offset (0x650 / 0x648)**:
    - Durch interne Änderungen an `base_ctrl` rückte das KDOP-Array von Offset `0x648` auf `0x650`. Die Telemetrie-Bridge und das C++-Plugin prüfen nun dynamisch `0x650` (ETS2 1.61+) und `0x648` (Fallback für ältere Versionen).
  - **Ampelerkennung auch bei aktivem TruckersMP**:
    - Bisher beendete `traffic.cpp` bei aktivem TruckersMP SDK die Abfrage vorzeitig mit `return`, wodurch zwar Multiplayer-Fahrzeuge erfasst wurden, aber das Auslesen lokaler Semaphoren (Ampeln) fälschlicherweise übersprungen wurde. Der TruckersMP-Check schützt nun gezielt ausschließlich die AI-Fahrzeugliste; Semaphoren werden sowohl im Singleplayer als auch in TruckersMP durchgehend synchronisiert.
  - **Aktualisierung der Kompilate**:
    - `OPCGameBridge.dll` wurde neu gebaut und im ETS2-Plugins-Verzeichnis installiert. `opc-telemetry-bridge.exe` wurde neu kompiliert und bereitgestellt.

## [1.7.63] - 2026-09-22

### 🔍 Perfekte Ausrichtung für Statistiken, Team-Karten & Fahrerprofil
  - **📊 Exakte Passform der Statistiken-KPIs ([Stats.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Stats.tsx), [SpotlightTour.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/SpotlightTour.tsx))**:
    - **Höhen-Abschneidung behoben**: `#tour-stats-container` liegt nun präzise direkt auf dem 6-Spalten-KPI-Grid (`grid-cols-2 md:grid-cols-3 lg:grid-cols-6`).
    - **Vollständige Karten-Umrahmung**: Der leuchtende Spotlight-Rahmen umschließt nun alle 6 KPI-Karten (Fahrer, Jobs, Gesamt KM, Umsatz, Fracht, Max Level) in voller Höhe, ohne mitten durch die Zahlen abzuschneiden.
  - **👥 Fokussierung der Team-Fahrer-Karte ([Team.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Team.tsx), [SpotlightTour.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/SpotlightTour.tsx))**:
    - **Kein gigantischer Leerraum mehr**: `#tour-team-container` wurde von der riesigen Überschrift "Unsere Mitglieder" entfernt und gezielt auf die **erste Team-Fahrerkarte** (Inhaber/Fahrer mit Avatar, Krone, Name, Rolle, KM & Umsatz) gelegt.
    - **Perfektes Andocken**: Das Erklärfenster dockt nun rechts neben der Fahrerkarte an und erklärt passgenau: *"Hier lernst du deine Kollegen und Ansprechpartner kennen."*
  - **👤 Zuverlässige Profil-Erkennung & Observer ([Profile.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Profile.tsx), [SpotlightTour.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/SpotlightTour.tsx))**:
    - **Sichtbarkeit bei Ladezeiten**: `#tour-profile-container` wurde sowohl in der Skeleton-Ladeanzeige als auch in der echten Profil-Infoleiste verankert.
    - **MutationObserver & aktiver ResizeObserver**: Ein globaler `MutationObserver` in [SpotlightTour.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/SpotlightTour.tsx) erkennt das Eintreffen asynchroner API-Daten sofort und dockt den Spotlight-Rahmen ohne Timeouts oder Verluste direkt an das Element an.
    - **Positionierung**: Das Erklärfenster positioniert sich nun ergonomisch unterhalb der Profil-Infoleiste.

## [1.7.62] - 2026-09-22

### 🎯 Fix für Einflug-Animation des Erklärfensters (Kein Einfahren mehr von oben links)
  - **✨ Direkte Verankerung am Zielelement ([SpotlightTour.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/SpotlightTour.tsx))**:
    - **Ursache behoben**: `top` und `left` des Erklärfeldes wurden zuvor als Framer-Motion-Animationseigenschaft (`animate={{ top, left }}`) übergeben, ohne dass in `initial` Ausgangswerte gesetzt waren. Dadurch nahm Framer Motion standardmäßig die Koordinaten `(0, 0)` an und animierte das Kärtchen bei jedem Schrittstart quer über den Bildschirm von ganz oben links zur Zielposition.
    - **Statische Verankerung via Style & sanftes Vor-Ort-Einblenden**: Die Koordinaten `top` und `left` sind nun direkt im `style`-Objekt des Fensters hinterlegt. Das Kärtchen wird dadurch vom ersten Render-Frame an millimetergenau an der Zielposition neben dem Element gerendert und blendet mit einem dezenten, edlen Spring-Effekt (`y: 8 -> 0`, `opacity: 0 -> 1`, `scale: 0.96 -> 1`) sanft an Ort und Stelle auf.
    - **Spotlight-Cutout-Initialisierung**: Auch der Spotlight-Ring initialisiert nun direkt seine Zielkoordinaten im `initial`-Block, wodurch jegliche Flugbahn aus der linken oberen Ecke vollständig unterbunden ist.

## [1.7.61] - 2026-09-22

### 🚀 Perfekte Spotlight-Präzision & Butterweiche Spring-Animation
  - **✨ Wiederherstellung der nahtlosen Spring-Gleit-Animation ([SpotlightTour.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/SpotlightTour.tsx))**:
    - **Beseitigung des 120-FPS-State-Spams**: Die vorherige `requestAnimationFrame`-Schleife, die bei jedem Frame `setTargetRect` und `setPopoverPos` aufgerufen und dadurch die Framer-Motion-Physik kontinuierlich unterbrochen hatte, wurde entfernt.
    - **Reine Framer-Motion Spring-Physik (`stiffness: 260, damping: 25`)**: Der Spotlight-Rahmen gleitet nun wieder in einer perfekten, unterbrechungsfreien Flugbahn elegant von Element zu Element und morpht flüssig zwischen Kreis und Card-Form.
    - **Schlanke Settle-Checkpoints (200 ms & 450 ms)**: Statt permanenter State-Updates wird die Zielposition einmalig angesprungen und nach Auslaufen des Smooth-Scrollings präzise nachjustiert.
  - **🔘 Zentrierte Kreis-Passform für Icons ([SpotlightTour.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/SpotlightTour.tsx))**:
    - **Exakter Radius & Abstand**: Für Icon-Buttons wie die Benachrichtigungsglocke (`#notif-bell`) wird ein symmetrisches Padding von 6 px und `borderRadius: 9999` verwendet. Der leuchtende Kreis sitzt nun zentriert auf der Glocke und schneidet den benachbarten Fahrer-Avatar nicht mehr an.
  - **⚡ Beseitigung der Seitenwechsel-Verschiebung ([App.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/App.tsx), [SpotlightTour.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/SpotlightTour.tsx))**:
    - **Kein 800-ms-Horizontalsliden während der Tour**: In [App.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/App.tsx) wird bei aktiver Onboarding-Tour auf das 800 ms lange `x: 100%`-Hereinsliden verzichtet und stattdessen eine direkte, saubere Fade-Transition (`opacity: 0.18s, x: 0`) genutzt. Neue Seiten erscheinen sofort an ihren echten X/Y-Koordinaten, sodass der Zielrahmen nicht mehr während der Bewegung falsch erfasst wird.
    - **Sanfter Übergang via `isNavigatingPage`**: Während des schnellen Seitenwechsels blendet die Tour kurz aus (`opacity: 0`) und springt erst auf der neuen Seite auf das Ziel auf, wodurch zuckende Zwischenpositionen verhindert werden.
  - **🎯 Präzise Zielcontainer-Fokussierung**:
    - **Profil ([Profile.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Profile.tsx))**: `#tour-profile-container` von der 3.000-Pixel-Hauptseite auf die schwebende Info-Leiste (Distanz, Fahrten, Punkte) verlegt.
    - **Overlay-Einstellungen ([OverlaySettings.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/OverlaySettings.tsx))**: `#tour-overlay-container` vom riesigen Formular auf die 4-Tab-Leiste (Overlay, CarPlay, App, TMP UI) verlegt.
    - **Team ([Team.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Team.tsx))**: `#tour-team-container` auf den Statistik-Header gelegt, damit das Element auch während des API-Ladens verlässlich im DOM auffindbar ist.
    - **Statistiken ([Stats.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Stats.tsx))**: `#tour-stats-container` auch auf den Skeleton-Loader gelegt, um Ladezeit-Versatz auszuschließen.

## [1.7.60] - 2026-09-22

### 💫 Wiederherstellung der flüssigen Spring-Animation & Passgenaue Spotlight-Maße
  - **✨ Morphing & Perfekte Element-Umrahmung ([SpotlightTour.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/SpotlightTour.tsx))**:
    - **Wiederherstellung der fließenden Spring-Transition**: Der ununterbrochene `<motion.div>`-Spotlight animiert nun wieder kontinuierlich `top`, `left`, `width`, `height` und `borderRadius` per Spring-Physik (`stiffness: 280, damping: 26`). Beim Klick auf "Weiter" gleitet und morpht der Rahmen nahtlos von Button zu Card.
    - **Passgenaue Abmessungen ohne Versatz**: Falsche Mindestbreiten-Erzwingungen (`Math.max(60, ...)`) wurden vollständig entfernt. Icons wie die Benachrichtigungsglocke werden nun mit exakter zentrierter Kreisform (`borderRadius: 9999`) umrahmt, ohne nach rechts in den Avatar zu ragen.
    - **Inner-Scroll-Container-Reset**: Da in der App nicht `window`, sondern der innere Container `.overflow-y-auto` scrollt, wird nun beim Seitenwechsel `el.scrollTop = 0` auf allen Scrollcontainern aufgerufen, wodurch jede neue Seite sauber von ganz oben beginnt.

## [1.7.59] - 2026-09-22

### 🎯 Präzise Positions-Nachführung & Scroll-Synchronisation
  - **✨ Dynamisches Live-Tracking des Tour-Spotlights ([SpotlightTour.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/SpotlightTour.tsx), [Events.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Events.tsx))**:
    - **60/120 Hz Continuous RAF-Tracking**: Nach jedem Seitenwechsel oder Schrittwechsel wird die exakte Position des Zielelements für 1200 ms per `requestAnimationFrame` auf jedem Frame aktualisiert. Dadurch gleitet der Spotlight-Rahmen live mit der CSS-Einfahr-Animation (`animate-in duration-500`) und dem Smooth-Scroll mit, ohne zu versetzen.
    - **Beseitigung von CSS-Transitions-Lag**: Die CSS-Klasse `transition-all duration-300` am Spotlight-Rahmen wurde entfernt, sodass Positions- und Größenanpassungen ohne 300 ms Verzögerung direkt an den DOM-Koordinaten haften.
    - **Automatischer Scroll-Reset bei Seitenwechsel**: Beim Springen auf eine neue Unterseite wird der Window-Scroll sofort auf `top: 0` zurückgesetzt, damit keine alten Scroll-Offsets der vorherigen Seite vererbt werden.
    - **Gezielte Umrahmung auf der Events-Seite**: `#tour-events-list` umschließt in [Events.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Events.tsx) jetzt ausschließlich den Bereich "Anstehende Events" und nicht mehr die gesamte Seite inklusive vergangener Events.
    - **Header-Schutz & Viewport-Clamping**: Die Y-Position des Erklärkärtchens ist nach oben hin fest auf mindestens 76 px geclampt, wodurch das Kärtchen unter keinen Umständen mehr oben abgeschnitten werden oder hinter der Navigationsleiste verschwinden kann.

## [1.7.58] - 2026-09-22

### 🐛 Stabilitäts-Fix: Seitenwechsel & Erklärmodul-Sichtbarkeit
  - **✨ Fix für verschwindendes Erklärfeld bei Unterseiten ([SpotlightTour.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/SpotlightTour.tsx), [Events.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Events.tsx))**:
    - **`isNavigating`-State-Lock beseitigt**: Beim automatischen Seitenwechsel (z.B. von Dashboard auf Events) wurde durch den React-Render-Zyklus der Timeout für `isNavigating(false)` vorzeitig gelöscht, wodurch das Erklärfeld fälschlicherweise dauerhaft ausgeblendet blieb. Die Bedingung wurde entfernt, da Framer-Motion `AnimatePresence` Seitenübergänge ohnehin reibungslos animiert.
    - **Robustes Polling für Ladezeiten**: Das Finden der Ziel-Elemente nach einem Seitenwechsel erfolgt nun über ein Intervall-Polling (alle 70 ms bis zu 35 Versuche = 2,5 s). Dadurch wartet die Tour geduldig, bis asynchrone Daten und Komponenten vollständig im DOM gemountet sind.
    - **Fail-Safe Fallback**: Sollte ein Ziel-Element selbst nach dem Polling noch nicht auffindbar sein, zentriert sich das Kärtchen automatisch im Viewport, statt zu verschwinden, sodass der Fahrer die Tour immer weiterführen kann.
    - **Sofortiges Mounting von `#tour-events-list`**: In [Events.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Events.tsx) wurde der ID-Wrapper um die gesamte Event-Zone gelegt, sodass das Element auch während des API-Ladens (`loading`) sofort im DOM existiert.

## [1.7.57] - 2026-09-22

### 🎨 Farbkorrektur: Dynamisches Theme statt Amber in der App-Tour
  - **✨ Beseitigung aller statischen Amber-Farben in der Spotlight-Tour ([SpotlightTour.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/SpotlightTour.tsx))**:
    - **Spotlight-Ausschnitt & Ping-Animation**: Feste `rgba(245, 158, 11, ...)` und `border-amber-400` durch die dynamische CSS-Variable `var(--primary, #0ea5e9)` sowie `var(--primary-glow)` ersetzt. Der Fokus-Ring passt sich nun perfekt an das gewählte Theme (z.B. Blau/Cyan) an.
    - **Kompaktes Erklärfeld (Popover)**: Rahmenfarbe, Schattierung und die oberseitige Akzentlinie nutzen jetzt `var(--primary)` und `var(--primary-glow)`.
    - **Badges & Infoboxen**: Kategorie-Pille und Fahrer-Tipp-Boxen verwenden Farb-Mixings auf Basis von `var(--primary)` statt fixer Amber-Töne.
    - **Checkbox "Nicht mehr anzeigen"**: Explizites Styling mit `accentColor: 'var(--primary)'` integriert, wodurch das Häkchen in der eingestellten Theme-Farbe dargestellt wird.
    - **"Weiter / Fertig"-Button**: Auf `var(--primary)` und `var(--primary-glow)` vereinheitlicht.
  - **📱 Header & Dashboard ([App.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/App.tsx), [Dashboard.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Dashboard.tsx), [DriverOnboardingModal.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/DriverOnboardingModal.tsx))**:
    - Kompass-Tour-Buttons im Header, Mobile Drawer und auf der Dashboard-Startseite von `text-amber-400` / `bg-amber-500/10` auf `text-primary` / `bg-primary/10` umgestellt.
    - Globale Input-Regel in [index.css](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/index.css) für `input[type="checkbox"]` und `input[type="radio"]` erweitert (`accent-color: var(--primary)`).

## [1.7.56] - 2026-09-22

### 🧭 Interaktive On-Page Spotlight-Tour & Fahrer-Einführung
  - **✨ Direkte On-Page-Hervorhebung mit Erklärung im kleinen Feld ([SpotlightTour.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/SpotlightTour.tsx), [App.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/App.tsx), [Dashboard.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Dashboard.tsx), [Events.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Events.tsx), [News.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/News.tsx), [Chat.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Chat.tsx), [Map.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Map.tsx), [Gallery.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Gallery.tsx), [Stats.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Stats.tsx), [Team.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Team.tsx), [AfkBot.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/AfkBot.tsx), [OverlaySettings.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/OverlaySettings.tsx), [Profile.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Profile.tsx))**:
    - **Direkt auf der Seite erklärt**: Die Tour springt live zur jeweiligen Unterseite, scrollt das relevante Element in den Fokus und hebt es mit einem leuchtenden goldenen Spotlight-Ring (`border-amber-400`, abgedunkelte Umgebung per Riesen-Box-Shadow) hervor.
    - **Kompaktes Erklärfeld direkt daneben**: Ein kleines, schwebendes Frosted-Glass-Kärtchen dockt sich dynamisch an das hervorgehobene Element an und erklärt dessen Nutzen in leicht verständlicher Sprache.
    - **Strikter Fokus auf normale Fahrer**: Erklärt ausschließlich für Fahrer zugängliche Kernfunktionen. Keine Erwähnung von Admin-Bereichen, Benutzerverwaltung oder Event-/News-Erstellung.
    - **17 geführte On-Page Stationen**:
      1. **Header - Telemetrie-Pills**: Statusanzeigen für Discord RPC und In-Game SCS Telemetrie-Plugin (SDK).
      2. **Header - Info-Zentrale**: Benachrichtigungen bei Tourstarts, Frachtankunft und Club-Updates.
      3. **Dashboard - Fahrer-Zentrale**: Begrüßungskarte mit Level, Rang und Schnellzugriff.
      4. **Dashboard - Tages-KPIs**: Kilometer, erledigte Fahrten und Bruttoumsatz des aktuellen Tages.
      5. **Dashboard - Nächste Events**: Sofortige Vorschau anstehender Konvois auf der Startseite.
      6. **Dashboard - Neueste News**: Schnellübersicht aktueller Mitteilungen direkt im Dashboard.
      7. **Events - Konvoi-Liste & Teilnahme**: 1-Klick Zu-/Absage und GPS-Routenübernahme ins Spiel.
      8. **News - Community-Beiträge**: Neuigkeiten und Patch-Notes lesen, liken und kommentieren.
      9. **Chat - Funk-Kanäle**: Allgemein-Kanal, thematische Räume und private Direktnachrichten (DMs).
      10. **Live-Karte - Steuerung & Staus**: Karten-Ebenen, Serverauswahl und Stauwarnungen (z.B. C-D Road).
      11. **Live-Karte - Fahrerliste**: Schnelle Ortung und Kamera-Fokus auf aktive Clubkollegen.
      12. **Galerie - Aufnahmen**: Screenshots der Community, Likes und eigener Fotoupload.
      13. **Statistiken - Fahrtenbuch**: Automatische Erfassung aller Touren, Tonnage, Erlöse und Monats-Rankings.
      14. **Team - Mitglieder**: Speditionsteam, Fahrerprofile und Discord-/Steam-Links.
      15. **AFK Bot - Schutz**: Verhindert Server-Timeouts auf vollen TruckersMP-Servern bei Raststätten-Pausen.
      16. **Einstellungen - Overlay & CarPlay**: Ingame-HUD (F9), Cockpit-Armaturenbrett für Tablets und Personalisierung.
      17. **Profil - Fahrerakte**: Avatar, Social-Links, LKW-Garage und Auszeichnungen.
    - **Intelligente Positionierung**: Das kleine Feld positioniert sich automatisch oben, unten, links oder rechts vom markierten Element und passt sich an Monitorgröße und Scroll-Position an.
    - **Volle Tastatur- & Maussteuerung**: Weiter mit Pfeil-Rechts / Enter, Zurück mit Pfeil-Links, Beenden mit Escape oder X-Button.
    - **Aufruf & Persistenz**: Automatischer Erststart bei neuen Fahrern (`localStorage.getItem('opc_onboarding_completed')`), "Nicht mehr anzeigen"-Option und jederzeit erneut startbar über die Kompass-Buttons im Header, Mobile-Menü und Dashboard.

## [1.7.55] - 2026-09-21

### 🚚 Integration des offiziellen TruckersMP GameClientSDK & Reaktivierung der Spieleranzeige
  - **🗺️ Auslesen der Mehrspieler-Trucks über das offizielle SDK ([traffic.cpp](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/OPCGameBridge/OPCGameBridge/traffic.cpp), [dllmain.cpp](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/OPCGameBridge/OPCGameBridge/dllmain.cpp))**:
    - Das bisherige Memory-Pattern-Scanning nach `base_ctrl` und Fahrzeuglisten wurde durch das offizielle C++17 [TruckersMP GameClientSDK](https://github.com/TruckersMP/GameClientSDK) abgelöst, da die Speicheroffsets durch das neue ETS2-Update ungültig wurden.
    - `OPCGameBridge.dll` (v1.1.0) registriert sich direkt beim TruckersMP-Client über `truckersmp_init` und empfängt Mehrspieler-Ereignisse.
    - Synchronisation auf dem Haupt-Thread über `session.Render().OnPreRender` (~20 Hz) mit Fallback auf `frame_start`.
    - Vollständige Erfassung von globalen 3D-Koordinaten (`position.x`, `position.y`, `position.z`), Rotation (`heading`), Geschwindigkeit, Bounding-Boxen und echten TruckersMP-Spieler-IDs.
    - Der eigene LKW wird automatisch über `GetLocalPlayer()` ausgefiltert, damit die eigene Markierung auf der Karte nicht verdoppelt wird.
    - Volle Kompatibilität mit dem Shared Memory Buffer `Local\OPCTrafficData` für MapLibre (`GameMapWidget.tsx`), CarPlay und Ingame-Overlay.

## [1.7.54] - 2026-09-19

### 🏙️ Behebung der „0 Spieler in der Stadt“-Anzeige im Ingame-Overlay & verbesserte Stadt-Erkennung
  - **🐛 Direkte Trucky-Verkehrsdatenabfrage & Proxy-Fallback ([Overlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Overlay.tsx))**:
    - Die Stadt-Einfahrt-Prüfung rief zuvor `${API_URL}/trucky/traffic` auf, was im Cloudflare-Worker-Backend einen 404-Fehler erzeugte und die Verkehrsdatenliste dauerhaft leer ließ (`playersInCity = 0`).
    - Abfrage erfolgt nun direkt über die offizielle Trucky Traffic API (`https://api.truckyapp.com/v2/traffic?server=...&game=ets2`) mit automatischem Fallback auf den neuen Backend-Proxy.
    - Dynamische Server-Erkennung: Ermittelt automatisch den aktiven TruckersMP-Server (z. B. Simulation 1, Simulation 2, ProMods, Arcade) aus der aktiven Sitzung.
  - **⚡ Live-Sensorik & Multiplayer-Ermittlung ([Overlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Overlay.tsx))**:
    - Einbindung der Shared-Memory-Telemetrie (`Local\OPCTrafficData` via `OPCGameBridge`): Werden in der Sichtweite echte TruckersMP-Spieler-LKW (`isTmp`) detektiert, fließen diese live als Minimum in die Spieleranzahl der Stadt ein.
    - Im Mehrspielermodus wird bei erkannter Stadt garantiert mindestens `1 Spieler` (der Fahrer selbst) anstelle von irreführenden `0 Spieler` angezeigt.
  - **🌍 Erweiterte Stadt- & Namenserkennung ([ets2Cities.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/data/ets2Cities.ts))**:
    - `findCity` bereinigt nun neben `(City)` und `(Road)` auch Suffixe wie `(Port)`, `(POI)` und `(HQ)`.
    - Diakritische Normalisierung (z. B. `Timişoara`, `Bihać`, `Niš`, `Zürich`) und Unterstützung von Underscore-Bezeichnungen (`banja_luka`, `veliko_tarnovo`, `sosnovy_bor`).
    - Integriertes Alias-Wörterbuch für internationale und mehrsprachige Bezeichnungen (`Munich` → `München`, `Cologne` → `Köln`, `Vienna` → `Wien`, `Belgrade` → `Beograd`, `Venice` → `Venezia`, etc.).
    - Bereinigung von falschen Substring-Matches (z. B. verhinderte Fehltreffer von `Venice` auf `Nice`).
  - **🚗 Präzise Stau-Warnung & Hysterese ([Overlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Overlay.tsx))**:
    - Hysterese bei Stadteinfahrten: Benachrichtigung triggert bei Einfahrt (≤ 3.800 m) und setzt die Stadt erst zurück, wenn man sich deutlich außerhalb befindet (> 6.500 m), wodurch Randflackern auf Autobahnumfahrungen eliminiert wird und ein erneutes Einfahren zuverlässig erkannt wird.
    - Spezielle Straßenkoordinaten (`alpen road`, `c-d road`, `calais - duisburg`, `truckersmp hq`) in Spielkoordinaten hinterlegt, sodass Stau-Warnungen auf Brennpunktstrecken exakt auslösen.
  - **🌐 Backend-Proxy-Routen ([routes_desktop.py](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/backend/app/routes_desktop.py), [server.py](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/backend/server.py))**:
    - Neue Proxy-Endpunkte `/api/trucky/traffic` und `/api/trucky/traffic/servers` im Worker-Backend mit automatischem Browser-User-Agent und 20-Sekunden-Cache.

## [1.7.53] - 2026-09-19

### 🔤 Markante Schriftart 'Unbounded' (App-Überschriften) in TruckersMP
  - **✨ Unbounded für Ingame & Live-Simulator ([OverlaySettings.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/OverlaySettings.tsx), [electron/main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**:
    - TruckersMP nutzt nun auf Nutzerwunsch die selbe Schriftart wie die Überschriften der App: **Unbounded**.
    - Bei aktivierter Ingame-Schriftart kopiert `tmp-apply-skin` die Datei `Unbounded.ttf` in die Schriftarten-Zieldateien (`shared_mod/fonts/`).
    - Der Live-Simulator in `OverlaySettings.tsx` rendert Fenstertitel, Servernamen und Bedienelemente dynamisch mit `font-unbounded`.
    - Einstellungskarte auf `Unbounded (App-Überschriften)` aktualisiert.

## [1.7.52] - 2026-09-19

### 🖼️ Layout-Anpassung & Behebung der Vorlagen-Bildübernahme
  - **✨ 1:1 Cockpit-Layout nach Original-Screenshot ([OverlaySettings.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/OverlaySettings.tsx))**:
    - **Oben links**: Einstellungen- und Autoren-Buttons (`settings.png`, `authors.png`) authentisch in das Shell-Layout eingebettet.
    - **Obere Bildmitte**: Das OPC Firmenlogo (`truckers_white_final.png`) sitzt nun oberhalb der Anmeldemaske zentriert im oberen Drittel.
    - **Unten links**: ModDB "MOD OF THE YEAR 2014"-Wappen und "60 FPS"-Anzeige hinzugefügt.
    - **Unten rechts**: Versionsbezeichnung `0.2.6.0.0 Alpha`.
    - **Anmeldemaske**: Feine, halbtransparente Optik mit maskierten Feldern und originalen Button-Designs.
  - **🚫 Keine Vorlagenbilder mehr kopiert ([electron/main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**:
    - Der bereitgestellte Vorlagenordner `TMP UI - Open Pipe Club` wird strikt nur als strukturelles Vorbild verstanden und nicht als Asset-Quelle.
    - Alle automatischen Fallbacks auf Vorlagenbilder (`server_item_*.png`, `background*.png`) in `tmp-get-info` und `tmp-apply-skin` wurden vollständig entfernt.
    - Es werden ausschließlich Grafiken ins Spiel injiziert, die der Nutzer explizit in der App hinterlegt hat.

## [1.7.51] - 2026-09-19

### 🎮 Authentische TruckersMP-Vorschau (Serverauswahl & Anmeldemenü), 7680 × 864 px Banner & Typografie
  - **✨ 1:1 Live-Simulator für TruckersMP ([OverlaySettings.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/OverlaySettings.tsx))**:
    - **Serverauswahl ("Select the server")**: Exakter Nachbau des Spielfensters inklusive Titelleiste, 6 Servern (Simulation 1 & 2, [US], [Asia], Arcade, ProMods), originalen TMP-Icons (`collisions.png`, `speedlimiter.png`, `cars_for_players.png`), schlanker Schriftarten, feiner Spieleranzahl (`2123 / 3500`), rotem Auslastungsbalken, interaktivem blauen Auswahlrahmen und "Join the server!"-Button.
    - **Anmeldemenü ("Login to your account")**: 16:9-Vollbildvorschau mit offiziellem Firmenbanner (`truckers_white_final.png`) oben links, zentriertem Login-Fenster mit maskierten Passwörtern, Checkboxen und originaler Alpha-Versions-Warnung unten.
    - Direkter Umschalter zwischen beiden Ansichten im Simulator-Header.
  - **🐛 Bugfix: Dateiauswahldialog für Serverlisten-Banner ([OverlaySettings.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/OverlaySettings.tsx))**:
    - Ein unbeabsichtigter Aufruf von `openImageFileDialog` wurde korrigiert: Der native IPC-Dialog `tmp-pick-image` wird nun zuverlässig aufgerufen.
  - **📐 Native Banner-Auflösung 7680 × 864 px ([OverlaySettings.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/OverlaySettings.tsx))**:
    - Die Dimensionen der Serverlisten-Banner (`server_item_{0..4}.png` / `_sel.png`) wurden auf das native Format 7680 × 864 px (ca. 8,888:1) angepasst.
    - Zuschneide-Editor (Crop-Modal) und Generator rendern und exportieren verlustfrei in 7680 × 864 px.
  - **🔤 Ingame-Typografie-Korrektur ([OverlaySettings.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/OverlaySettings.tsx), [electron/main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**:
    - Die breite Navbar- und Überschriften-Schriftart `Unbounded` wurde vollständig aus der Ingame-Simulation entfernt, da TruckersMP ein schlankes, neutrales Sans-Schriftbild nutzt.
    - Auch im Mod-Export wird `Unbounded` nicht mehr für Spielfonts verwendet, sondern eine wohlproportionierte, saubere Typografie garantiert.

## [1.7.50] - 2026-09-19

### ⚙️ Discord RPC: Angepasster Status-Text für Overlay-Einstellungen
  - **🔄 RPC-Text geändert ([electron/main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**:
    - Wenn der Nutzer sich im Tab `Overlay Settings` befindet, zeigt die Discord-RPC nun `⚙️ Passt die Einstellungen an` statt des bisherigen `⚙️ Passt Overlay & App an`.

## [1.7.49] - 2026-09-19

### 📐 Interaktiver Bildausschnitt-Editor für Serverlisten-Banner
  - **✨ Vertikales Verschieben & Drag-to-Crop ([OverlaySettings.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/OverlaySettings.tsx), [electron/main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**:
    - Beim Auswählen eines Bildes sowie über den Button `Ausschnitt anpassen` öffnet sich der neue interaktive Zuschneidedialog.
    - Nutzer können das Bild mit der Maus nach oben oder unten ziehen (`cursor-grab` / `cursor-grabbing`), um den sichtbaren Bildausschnitt (1280 × 280) festzulegen.
    - Schieberegler mit Sofortvorschau (0% bis 100%), Schnellwahltasten `[Oben (0%)]`, `[Mitte (50%)]`, `[Unten (100%)]` sowie Zoom-Steuerung (1.0x bis 2.5x).
    - Einblendbares TruckersMP-Serverleisten-Overlay zum Prüfen der Text- und Statusanzeigen.
    - Präzises Canvas-Zuschneiden auf 1280 × 280 px.

## [1.7.48] - 2026-09-19

### 🚛 Offizielles Firmenbanner & 5 Serverlisten-Banner (Normal & Ausgewählt)
  - **✨ Passendes Firmenbanner ohne Custom-Upload-Zwang ([electron/main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts), [OverlaySettings.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/OverlaySettings.tsx))**:
    - Das offizielle Open Pipe Club Firmenbanner wurde im passgenauen Format für TruckersMP erstellt (`truckers_white_final.png` mit 1600 × 391 px und `truckers_white_final_small.png` mit 800 × 195 px) inklusive Club-Logo, Cyber-Glow und Unbounded/Outfit Typografie.
    - Die Option für manuellen Custom-Upload wurde entfernt. Der Nutzer wählt nun direkt und klar zwischen dem **offiziellen Open Pipe Club Firmenbanner** und dem **Standard TruckersMP-Banner**.
  - **✨ Serverlisten-Banner für Server 1 bis 5 ([OverlaySettings.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/OverlaySettings.tsx), [electron/main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**:
    - Umschaltbar zwischen **Club-Banner** und **Standard TMP Server-Banner**.
    - Pro Server (Server 1 bis 5) stehen nun jeweils zwei Grafiken zur Verfügung:
      1. **Nicht ausgewählt (Normal)**: `server_item_{0..4}.png`
      2. **Ausgewählt (Selected)**: `server_item_{0..4}_sel.png`
    - Neue Generator-Funktion `⚡ Aus Normalbild generieren`: Errechnet auf Knopfdruck aus der normalen Servergrafik automatisch die abgedunkelte und mit der gewählten UI-Akzentfarbe akzentuierte Ausgewählt-Grafik.
  - **✨ TruckersMP Live-Simulator erweitert**:
    - Menüleiste zeigt das aktive Firmenbanner.
    - Interaktiver Server-Wähler `[S1] [S2] [S3] [S4] [S5]` mit Umschaltung zwischen Normal- und Ausgewählt-Zustand per Mausklick.

## [1.7.47] - 2026-09-19

### 🚚 Firmenbanner-Option, App-Schriftarten in TruckersMP & Vorlagen-Entfernung
  - **✨ Vorlage-Button & automatische Zwangsvorlagen entfernt ([OverlaySettings.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/OverlaySettings.tsx))**:
    - Der Button "Vorlage" wurde vollständig entfernt.
    - Die 7 Standardvorlagen werden nicht mehr ungefragt in die Slot-Liste geladen; stattdessen startet der Nutzer mit den aktuell installierten Hintergründen oder mit einer sauberen leeren Slot-Liste samt "+ Jetzt Bilder hinzufügen"-Schaltfläche.
    - Die Slots sind übersichtlich als `Hintergrund #{n}` benannt ohne Vorlagen-/Custom-Unterscheidung.
  - **✨ Firmenbanner vs. Standard TruckersMP Banner ([electron/main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts), [OverlaySettings.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/OverlaySettings.tsx))**:
    - Neue Option zur Wahl des Serverlisten-Banners (`shared_mod/ui/server_item_*.png`):
      - **Open Pipe Club Firmenbanner**: Zeigt das offizielle Club-Banner auf allen Serverlisten-Tabs an.
      - **Eigenes Banner**: Nutzer können eine eigene Datei für ihr Firmenbanner auswählen.
      - **Standard TruckersMP-Banner**: Entfernt die benutzerdefinierten Server-Items, sodass TruckersMP automatisch seine originalen Vanilla-Banner lädt.
  - **✨ Ingame-Schriftart aus App & Webseite (`Unbounded` & `Outfit`) ([electron/main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts), [OverlaySettings.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/OverlaySettings.tsx))**:
    - TruckersMP kann nun mit den Schriftarten der Open Pipe Club App und Webseite betrieben werden (`shared_mod/fonts/`):
      - `Unbounded` für markante Headlines, Servernamen und Titelleisten.
      - `Outfit` für Menüs, Buttons, Statusanzeigen und UI-Beschriftungen.
      - Beinhaltet Fallback auf die Standard TruckersMP Schriftart (OpenSans).
  - **✨ Aktualisierter TruckersMP Live-Simulator**:
    - Zeigt die ausgewählten Schriftarten (`font-unbounded` / `font-outfit`) und das gewählte Server-Banner in Echtzeit in der interaktiven Vorschau an.

## [1.7.46] - 2026-09-19

### 🎨 Volle dynamische Farb- & Glow-Unterstützung im TruckersMP UI-Tab
  - **✨ Amber-Reste eliminiert & Custom-Farbauswahl optimiert ([src/pages/OverlaySettings.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/OverlaySettings.tsx))**:
    - **Individuelle Preset-Farben**: Die Preset-Buttons (z. B. Apple Blau, Racing Rot, Cyber Cyan) leuchten beim Auswählen exakt in ihrer eigenen Farbe (`borderColor`, `backgroundColor`, `boxShadow`), anstelle des vorherigen hartcodierten Amber-Glows (`rgba(245,158,11,0.25)`).
    - **Vollständiges Custom-Theming**: Alle Cards, Hover-Glows, Überschriften, Icons, Code-Badges, Slot-Highlights und Aktions-Buttons ("In TruckersMP anwenden", "+ Bild(er) hinzufügen") passen sich sofort der ausgewählten Farbe `tmpColor` an.
    - **Direkte HEX-Eingabe & Custom-Indikator**: Direkteingabe für Farbcodes (z. B. `#007aff`) und optische Status-Hervorhebung der Custom-Schaltfläche bei Nicht-Preset-Farben.
    - **Verbesserte Skin-Engine**: `recolorTmpSkin` erfasst alle gesättigten Pixelelemente in `ui_skin.png` und konvertiert sie fehlerfrei in den Zielfarbton.

## [1.7.45] - 2026-09-19

### 🚚 Neuer Tab 'TruckersMP UI' in den Overlay-Einstellungen
  - **✨ Anpassung von Hintergrundbildern & UI-Farbe ([src/pages/OverlaySettings.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/OverlaySettings.tsx), [electron/main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**:
    - **Dynamischer Hintergrund-Manager**: Beliebig viele Menü-Hintergrundbilder (`background0.png`, `background1.png`, usw.) per Multi-Select hinzufügen, austauschen, duplizieren oder löschen.
    - **Echtzeit-Farbanpassung**: Farbpaletten-Schnellauswahl und stufenloser Colorpicker mit automatischer Recoloring-Engine für `ui_skin.png`.
    - **TruckersMP Live-Simulator**: Interaktiver Simulator des Menüs mit Live-Hintergrundwechsel und eingefärbter UI.
    - **1-Klick-Installation**: Automatische Erkennung des TruckersMP-Datenordners und direktes Schreiben nach `ets2_mod/ui` und `shared_mod/ui`.
    - **⚡ Performance-Boost**: Disk- & Memory-Caching für Thumbnails (`tmp_thumb_cache`) und Vermeidung von gigantischen Base64-Strings über IPC beseitigt Ruckler beim Laden von 8K-Bildern vollständig. 40ms-Debounce auf der Color-Picker-Recoloring-Engine.

## [1.7.44] - 2026-09-19

### 🎨 Custom Farbton & Glow für alle Overlay-Benachrichtigungen
  - **✨ Dynamischer Akzent & Glow ([src/pages/Overlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Overlay.tsx), [src/main.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/main.tsx), [src/index.css](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/index.css))**:
    - Das Top-Banner für Städte-Benachrichtigungen (`overlayNotify`), der Vorschaumodus-Banner, die Toaster-Benachrichtigungen und `.toast-resumed` leuchten nun in der gewählten Custom-Akzentfarbe statt im starren Amber-Glow.
    - Die CSS-Root-Variablen (`--primary`, `--primary-glow`, etc.) werden live im Overlay-Fenster synchronisiert und OverlayPage wurde mit `ThemeProvider` umschlossen.

## [1.7.43] - 2026-09-19

### 🚚 Spieler-Limit im CarPlay & Ingame-Karte aufgehoben
  - **✨ Bis zu 1.024 umgebende TruckersMP-Fahrzeuge simultan ([electron/telemetry-bridge.cs](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/telemetry-bridge.cs), [electron/main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**:
    - Die Schleifenbeschränkung von 50 Fahrzeugen im Shared-Memory-Reader (`Local\OPCTrafficData`) wurde auf 1.024 Fahrzeuge erweitert.
    - Alle in Renderreichweite befindlichen TruckersMP-Fahrer werden nun ohne Abschneiden live an die MapLibre-Kartenkomponente übergeben und dargestellt.
    - C# Telemetrie-Bridge `opc-telemetry-bridge.exe` wurde mit den neuen Puffergrößen kompiliert.

## [1.7.42] - 2026-09-19

### 📍 Präzise Standort-Ermittlung auf der Live-Karte (Dresden-Fehler behoben)
  - **✨ Echtzeit-Koordinatenauflösung für alle Fahrer ([src/pages/Map.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Map.tsx))**:
    - **Fahrer-Detailkarte**: Die Infokarte der Live-Karte löst den aktuellen Fahrerstandort nun dynamisch über `findClosestCity` direkt aus den Spielkoordinaten auf (analog zur Profilseite), anstatt sich auf veraltete oder fehlerhaft zugewiesene Backend-Textwerte zu verlassen.
    - **Fahrerliste & Filter**: Auch in der Fahrerliste der Seitenleiste sowie im Suchfilter wird der präzise ermittelte Standort angezeigt.
    - **Backend-Verbesserung**: `routes_desktop.py` priorisiert die 2D-Kartenachse und vermeidet Fehlabgleiche mit der Höhenachse; Salzburg und umliegende Städte wurden zur Fallback-Städteliste hinzugefügt.

## [1.7.41] - 2026-09-18

### 💬 Wording-Optimierung im Discord-RPC (Entfernung von "sichtet" & "Neuigkeiten")
  - **✨ Zeitgemäße & sympathische Status-Texte ([electron/main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**:
    - **Events**: `📅 Konvois & Events` statt `Sichtet Events & Konvois`
    - **News**: `📰 Liest die Club-News` statt `Liest VTC-Neuigkeiten`
    - **Team**: `👥 Fahrer & Team-Übersicht` statt `Sichtet das Fahrer-Team`

## [1.7.40] - 2026-09-18

### 📱 Ausführliche & dynamische Discord-RPC Texte für alle App-Seiten
  - **✨ Präzise Seitentexte & Unterseiten-Kontext ([electron/main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**:
    - **Dashboard**: `📊 Im Fahrer-Dashboard`
    - **Karte**: `🗺️ Erkundet die Live-Karte`
    - **Events & Konvois**: `📅 Sichtet Events & Konvois` bzw. `🗺️ Plant eine Konvoi-Route` (beim Erstellen/Planen)
    - **Chat / Funk**:
      - Gruppenkanäle: `💬 Funk: #general` (dynamischer Kanalname)
      - Direktnachrichten: `💬 Schreibt mit [Fahrername]`
      - Allgemein: `💬 Im Firmenfunk & Chat`
    - **Fahrer-Profile**:
      - Eigenes Profil: `👤 Bearbeitet eigenes Profil`
      - Fremdes Profil: `👤 Profil von [Fahrername]`
    - **Statistiken**: `📈 Prüft VTC-Statistiken`
    - **Galerie**: `📸 In der Foto-Galerie`
    - **News**: `📰 Liest VTC-Neuigkeiten`
    - **Team**: `👥 Sichtet das Fahrer-Team`
    - **Einstellungen**: `⚙️ Passt Overlay & App an`
    - **AFK-Bot**: `🤖 Anti-AFK Assistent aktiv`
    - **Bewerbungen**: `📝 Prüft Bewerbungen`
    - **Schadensberichte**: `📑 Liest Schadensberichte`
    - **Admin & Management**: `🛡️ Im Management-Bereich`
    - **Datenbank**: `🗄️ Verwaltet Datenbank`

## [1.7.39] - 2026-09-18

### 🎮 Modernisierung & Verschönerung des Discord Rich Presence (RPC) Status
  - **🚛 Fahrzeug- & Serverfokus bei aktiver Fahrt ([electron/main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**:
    - **Zeile 1 (Status)**: `🚛 Scania S-Serie • 🌐 Simulation 1` (Formatierte LKW-Markennamen wie `Scania S-Serie`, `Volvo FH16`, `MAN TGX` statt unschöner interner Rohdaten wie `scania s_2016`).
    - **Zeile 2 (Strecke & Fracht)**: `📍 Hamburg ➔ München (320 km) • 📦 Diesel` mit elegantem Pfeil (`➔`) und automatischer Anzeige der verbleibenden Navigationsdistanz.
    - **Leerfahrt / Freeroam**: `🚛 Scania S-Serie • 🌐 Simulation 1` / `🛣️ Auf Achse • ⚡ 85 km/h` bzw. `🅿️ Rastplatz / Leerfahrt`.
    - **Spielpause**: `⏸️ Scania S-Serie • 🌐 Simulation 1` / `📍 Hamburg ➔ München • ⏸️ Pausiert`.
  - **🏢 Ausführlicher Drivers-Hub-Status außerhalb des Spiels ([electron/main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**:
    - **Zeile 1**: `🏢 Open Pipe Club • Drivers Hub`
    - **Zeile 2**: Dynamischer Seitenstatus mit passenden Emojis (z. B. `🗺️ Plant eine Konvoi-Route`, `📊 Im Dashboard`, `📅 Sichtet Events & Konvois`, `💬 Im Firmenfunk & Chat`, `📈 Prüft Fahrer-Statistiken`, `📸 In der Foto-Galerie`).
  - **🛡️ 128-Zeichen-Schutz ([electron/main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**:
    - Automatisches Kürzen überlanger Fracht- oder Städtekombinationen, um Abstürze oder stille Ablehnungen durch die Discord-API zuverlässig zu verhindern.

## [1.7.38] - 2026-09-18

### 🎯 Vereinheitlichte GPS-Pins für Start/Ziel & Beseitigung von Schatten-Banding
  - **🚫 Behebung des schwarzen Schatten-Rings / Bandings am Himmel ([RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx))**:
    - *Ursache*: Zuvor wurden 5 diskrete Striche mit runden Linienenden (`lineCap = 'round'`) und sehr großen Breiten (bis zu 540 px) gezeichnet, wodurch um den Startpunkt Hamburg konzentrische, sichtbare Abstufungs-Ringe (Color-Banding) den dunklen Kartenhintergrund über den Himmel legten.
    - *Lösung*: Die Maskierung nutzt nun echte Gauss'sche Weichzeichnung (`filter = blur(...)`) in kompakterer Breite (140 px). Der Übergang ist mathematisch absolut stufenlos, seidenweich und erzeugt keinerlei sichtbare Ringe oder Schattenkuppeln mehr am Himmel.
  - **📍 Exakte Positionierung an den echten Routen-Endpunkten ([RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx))**:
    - Start- und End-Koordinaten werden jetzt direkt an den ersten und letzten Scheitelpunkt der tatsächlichen Vektor-Routenlinie gekoppelt (`routeLngLatCoords[0]` & `routeLngLatCoords[last]`).
    - Das Ziel sitzt nun präzise an der Endspitze der Route (und nicht mehr mitten auf der Strecke in Salzburg, wenn die Route bis zu einem Depot/Euroacres weiterführt).
  - **💎 Integrierte, moderne GPS-Pin-Badges ([RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx))**:
    - Statt drei separater, kollidierender Elemente (Kreis, schwebende Kapsel, drunterstehende Stadt) gibt es nun pro Punkt ein elegantes, kompaktes Gesamtkunstwerk:
      - **Zielscheiben-Ring auf der Straße**: Ein leuchtender Anker-Ring (Grün für Start, Weiß für Ziel) markiert punktgenau die Straße.
      - **Schwebende Kapsel mit Zeigerspitze**: Zeigt mit einer präzisen Dreiecksspitze direkt auf den Straßenpunkt (automatisch nach oben zeigend, falls zu nah am oberen Bildschirmrand).
      - **Integrierter Aufbau**: Links das Icon (`▶` im grünen Kreis oder `🏁` im Zielflaggen-Kreis), daneben `START`/`END`, eine feine Trennlinie und der passende Stadtname (`HAMBURG` / `SALZBURG`).
      - Keine Überlappungen oder abgeschnittenen Ränder mehr.

## [1.7.37] - 2026-09-18

### 🌫️ Echter 100% bis 0% Karten-Fade-Out & Ausgewogene Hintergrund-Helligkeit
  - **✨ Weicher Alpha-Fade-Out von 100 % (sichtbar) bis 0 % (unsichtbar) ([RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx))**:
    - *Bisher*: Das Straßennetz wurde vollflächig über den gesamten Canvas gezeichnet und nur durch ein transparentes Schwarz-Overlay leicht gedämpft, wodurch Straßen in weit entfernten Regionen überall sichtbar blieben.
    - *Neu mit Alpha-Maskierung (`destination-in`)*: Die Karte wird auf einem separaten Offscreen-Canvas gezeichnet und über mehrlagige, weichgezeichnete Korridor-Pinselstriche maskiert. Entlang der Route sind die Straßen zu 100 % gestochen scharf sichtbar; zu den Rändern hin verblasst das Straßennetz stufenlos bis auf 0 % (völlige Transparenz).
    - An den Außenrändern ist nun ausschließlich das atmosphärische Scania-Hintergrundbild ohne störende Straßen-Netze zu sehen.
  - **🚛 Ausgewogene Hintergrund-Helligkeit ([RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx))**:
    - Die Überstrahlung des Scania-Artworks wurde korrigiert. Die Abdunklungs-Stufen wurden auf ein harmonisches Maß (46 % bis 70 %) angepasst, sodass Himmel und Sonnenuntergang nicht mehr blenden, während der Scania-Truck und seine Dachbeleuchtung stimmungsvoll zur Geltung kommen.
  - **📍 Korridor-Beschränkung für schematische Städte ([RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx))**:
    - Es werden nur noch Städte im Umkreis von ~130 km der Route gerendert und am Korridor-Rand sanft mit ausgeblendet, damit weit entfernte Orte (z. B. Kiel, Rostock, Linz, Praha) nicht vereinzelt im leeren Hintergrund schweben.
  - **🏷️ Bereinigung von Depot-Codes bei Start und Ziel ([RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx))**:
    - Bei internen Firmen-/Depotnamen (z. B. `AI`, `Euroacres`) wird nun automatisch die nächstgelegene echte Stadt (z. B. `HAMBURG`, `INNSBRUCK`) unter dem Start-/Ziel-Beacon angezeigt.

## [1.7.36] - 2026-09-18

### 🌟 Helleres Hintergrundbild, verfeinerte START/ZIEL-Badges & Seitlicher Akzentbalken
  - **📐 Seitlicher Akzentbalken am Event-Widget ([RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx))**:
    - Der obere horizontale Balken wurde entfernt und durch einen leuchtenden, vertikalen Akzentbalken an der linken Außenkante des Info-Widgets ersetzt.
  - **🚛 Helleres & klar sichtbares Scania-Hintergrundbild ([RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx))**:
    - Die Abdunklung des Hintergrunds wurde drastisch gelockert (Overlay von 76 % auf 22 % reduziert) und die Karten-Transparenz so abgestimmt, dass der Scania-Truck mit Kabine, Dachlampen und Landschaft klar und stimmungsvoll hinter dem Straßennetz leuchtet.
    - Die Vignette wurde auf 25 % sanftes Ausblenden zurückgenommen.
  - **🏁 Verschönerte & kollisionsfreie START- & ZIEL-Markierungen ([RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx))**:
    - *Kein Überlappen mehr*: Beacons und weiße Pill-Kapseln haben jetzt einen sauberen Abstand, sodass die Renn-Zielflagge und die grüne Bake vollständig rund und unbeschnitten bleiben.
    - *Stadtnamen-Kollision behoben*: Städteknoten direkt an Start und Ziel werden nicht mehr doppelt unter den Badges gerendert, sondern sauber zentriert unterhalb der Baken platziert.
    - *Premium-Design*: Glänzende weiße Kapseln mit tiefem Weichzeichnungs-Schatten, feiner Konturlinie und scharfem Kontrast.

## [1.7.35] - 2026-09-18

### 🔲 Bereinigung redundanter Maximieren-/Zentrieren-Buttons im Routenplaner
  - **🚫 Entfernung des irreführenden quadratischen Zentrierungs-Buttons ([RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx))**:
    - *Problemursache*: Die Funktion `fitToRoute` nutzte fälschlicherweise das Maximieren-Symbol `<Maximize2 />`. Im Vollbildmodus wurde dieser Button neben „Route als Bild übernehmen“ angezeigt (obwohl das Fenster bereits maximiert war), und im eingebetteten Modus stand er direkt neben dem Button `Großansicht` (der ebenfalls `<Maximize2 />` trug). Dadurch schienen zwei Maximieren-Buttons nebeneinander zu existieren.
    - *Lösung*: Die redundanten Buttons wurden entfernt. Im eingebetteten Modus gibt es nun ausschließlich die eindeutige Schaltfläche `Großansicht`, und im Vollbildmodus bleibt der Header sauber mit `Route als Bild übernehmen` und `Schließen`. Die Route zentriert sich weiterhin automatisch.

## [1.7.34] - 2026-09-18

### 🏙️ Entfernung doppelter Karten-Städte & Sanfterer Korridor-Fade-Out
  - **🚫 Entfernung der doppelten Original-Kartenbeschriftungen ([RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx))**:
    - Die Ebenen `ets2-cities-points` (oranger Kreis) und `ets2-cities-labels` (kleine untere Map-Schrift) wurden aus dem Map-Style entfernt.
    - Dadurch existiert kein störender doppelter Stadtname mehr: Es wird ausschließlich der saubere, schematische TruckersMP-Knotenpunkt (weißer Kreis mit markanter Großbuchstaben-Schrift `BREMEN`) gerendert.
  - **🌤️ Deutlich abgeschwächter & breiterer Fade-Out-Verlauf ([RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx))**:
    - Der Korridor um die Route wurde von 400px auf 850px mehr als verdoppelt (`850px`, `550px`, `320px`, `150px`).
    - Die Masken-Deckkraft wurde von 100 % hartem Schwarz auf ein dezentes 45 % Vignette-Overlay reduziert.
    - Das umgebende Straßennetz und die Landschaft bleiben dadurch im gesamten Kartenausschnitt hell und klar erkennbar.

## [1.7.33] - 2026-09-18

### 💜 Wiederherstellung der lila Routenlinie & TruckersMP-Konvoi-Posterdesign
  - **💜 Lila Routenlinie auf der Karte ([RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx))**:
    - Die Routen-Vektorlinie (`planner-route-line`) erstrahlt wieder im satten, strahlenden Lila/Flieder (`#c084fc`) und der Außen-Glow (`planner-route-glow`) im tiefen Violett (`#a855f7`).
    - Die Theme-Synchronisation überschreibt die Routenfarbe nicht mehr, sodass die Strecke stets mit perfektem lila Neon-Kontrast über Straßen und Landschaft leuchtet.

  - **✨ Kinematisches TruckersMP-Konvoi-Poster in 4K ([RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx), [Events.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Events.tsx))**:
    - *Kinematischer Hintergrund*: Lädt und rendert das stimmungsvolle Scania-Truck-Artwork im Hintergrund mit abgedunkeltem, tiefblau-schwarzem Farbverlauf, sodass Straßen und Strecke im Vordergrund optimal leuchten.
    - *Schematische Städte im U-Bahn-/Infografik-Stil*: Zeichnet im Streckengebiet automatisch prägnante, weiße Netzknoten-Punkte mit hochkontrastigen, serifenlosen Großbuchstaben-Stadtlabels (`KÖLN`, `FRANKFURT`, `STUTTGART`, `MÜNCHEN`, `SALZBURG`, `INNSBRUCK`, `GRAZ`, `KLAGENFURT`, etc.).
    - *Direkte START- & ZIEL-Badges auf der Karte*:
      - **START**: Leuchtend grünes Baken-Signal mit weißem Kapsel-Badge `START` direkt am Startort.
      - **ZIEL**: Zielflaggen-Rennbake im Schachbrettmuster mit weißem Kapsel-Badge `🏁 END` am Zielort.
      - **Zwischenstopps**: Nummerierte Punkte im Farbakzent der Spedition entlang des Routenverlaufs.
    - *Rechts oben: Frosted Glass Event-Widget*:
      - 📅 **Datum**: Formatiert (z. B. `14th September 2024`) mit Kalender-Vektor-Icon in Akzentfarbe.
      - ⏰ **Uhrzeit**: Exakte UTC-Startzeit (z. B. `17:00 UTC`) mit Uhren-Vektor-Icon.
      - 🛣️ **Distanz**: Zweisprachige Meilen- & Kilometeranzeige (z. B. `1188 km / 738 mi`) mit Richtungs-Schild-Icon.
      - 🏷️ **Server / DLC**: Automatische Übernahme aus Event-Formular (`Base Game`, `Simulation 1`, etc.) mit Tag-Icon.
    - *Unten: Cinema Lower-Third Konvoi-Banner*:
      - Breites, dunkles Glasbanner mit oberer Lichtkante.
      - Großer Titel: `OFFICIAL CONVOY` in sattem Weiß, kombiniert mit dem Monat/Eventnamen in leuchtender Akzentfarbe.
      - Untertitel mit Streckenverlauf (`START ➔ ZIEL • ORGANIZED BY OPEN PIPE CLUB`).
      - Rechte Ecke: Offizielles Open Pipe Club Truck-Logo mit VTC-Schriftzug.

## [1.7.32] - 2026-09-18

### 🛣️ Straßensnapping, Straßenplatzierungspflicht & Fortlaufende Wegpunkt-Nummerierung
  - **🛣️ Platzierung von Wegpunkten nur noch auf Straßen ([RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx))**:
    - *Straßen-Validierung*: Bei Klick auf die Karte prüft MapLibre über `queryRenderedFeatures` mit einer 24px-Klicktoleranz, ob sich an der Klickstelle eine Straße, Fähre oder Stadt befindet (`ets2-roads`, `ets2-roads-casing`, etc.). Klicks abseits von Straßen (im Wasser, Bergen oder freiem Gelände) werden mit einem Toast-Hinweis abgewiesen (`„Wegpunkte können nur auf Straßen platziert werden.“`).
    - *Exaktes Straßensnapping*: Wenn auf oder nahe einer Straße geklickt wird, berechnet `closestPointOnSegment` den exakt nächsten Punkt auf dem Fahrbahn-Vektor und dockt die Koordinaten direkt auf der Straßenmittellinie an.
    - *Mauszeiger-Feedback*: Beim Bewegen des Cursors über Straßen verwandelt sich der Mauszeiger automatisch in einen Klick-Zeiger (`cursor: pointer`).
  - **🔢 Fortlaufende Wegpunkt-Nummerierung ([RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx))**:
    - *Problemursache*: Der Karten-Klicklistener erfasste in seiner React-Closure stets den initialen, leeren `waypoints`-Zustand (`waypoints.length` war immer 0), wodurch ausnahmslos jeder gesetzte Punkt den Text `Wegpunkt 1` erhielt.
    - *Lösung*: Synchronisation über `waypointsRef.current`. Neue Wegpunkte werden nun verlässlich fortlaufend nummeriert (`Wegpunkt 1`, `Wegpunkt 2`, `Wegpunkt 3`, ...), sofern sie nicht im Einzugsgebiet einer Stadt liegen.
    - *Sequenz-Badges*: Die Zwischenstopp-Pins auf der Karte nummerieren die Stopps sauber durch (`1`, `2`, `3` ... zwischen `START` und `ZIEL`).


### 🎨 Theme-Farben-Synchronisation & Kinematische Tiefschwarz-Vignette im Routenplaner
  - **🌑 Verlauf nach außen ins absolute Tiefschwarz ([RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx))**:
    - Das Masken-Overlay wurde von 72 % Transparenz auf 100 % deckendes Tiefschwarz (`#000000`) umgestellt.
    - Mehrstufig gestaffelter, weichgezeichneter Korridor-Punch-Through (`360px`, `240px`, `140px`, `70px`) sorgt für einen seidig weichen Übergang, bei dem die Karte entlang der Strecke perfekt beleuchtet ist und nach außen hin nahtlos in tiefes Schwarz überblendet, ohne störendes Durchscheinen entfernter Straßen.
  - **🎨 Vollständige Synchronisation mit der individuellen Fahrer-Akzentfarbe ([RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx))**:
    - *Wegpunkt-Pins*: Der Hover-Rahmen, der Ambient Glow sowie Zwischenstopp-Badges und Zielpunkte nutzen nun dynamisch `appearance.accentColor` aus `ThemeContext` statt hartcodiertem Bernstein/Orange.
    - *„Route als Bild übernehmen“-Buttons*: Sowohl im Vollbild- als auch im eingebetteten Modus nutzen Hintergrund und Schatten nun exakt die benutzerdefinierte Akzentfarbe mit passendem Farb-Glow (`boxShadow: 0 0 25px rgba(accentRgb, 0.45)`).
    - *Routenlinie auf der Karte*: Die Map-Layer `planner-route-glow` und `planner-route-line` passen sich in Echtzeit der Akzentfarbe an.
  - **📐 Vergrößerte Infofelder & Farbanpassung im finalen 4K-Routenbild ([RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx))**:
    - **Header-Karte**: Breite auf `680px * S` und Höhe auf `145px * S` vergrößert, Akzentleiste und Club-/Organisator-Tag in Fahrerfarbe gerendert, Typografie auf `28px * S` vergrößert.
    - **Untere Glaskarte**: Höhe auf `175px * S` vergrößert, Badges (`START` / `ZIEL`) auf `30px * S`, Städtenamen auf `26px * S`, Firmennamen auf `15px * S` und Verbindungspfeile `➔` vergrößert und in Akzentfarbe koloriert.
    - **Distanz- & Fahrzeitkacheln**: Auf `210px * S` Breite und `88px * S` Höhe erweitert mit markanter `28px * S` `Unbounded`-Zahlenanzeige und akzentfarbenem Schein.


### 🗺️ Routenplaner & Kartengrafik: Dynamischer Organisator, Fix für Wegpunkt-Verschiebung & Redesign der Wegpunkte & Infoleiste
  - **Dynamischer Organisator im Routenbild ([RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx), [Events.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Events.tsx))**:
    - Das Prop `organizer` wird nun von der Event-Erstellung (`form.organizer`) an den `RoutePlanner` übergeben.
    - Im Header-Banner des generierten Routenbildes wird nun der tatsächliche Organisator dynamisch angezeigt (z. B. `SPEDITION MUSTERMANN • OFFICIAL ROUTE`) anstatt des bisher hartcodierten Strings.
    - Farbschema im Banner von Violett auf das clubweite Amber-Design (`#f59e0b`) mit feiner Akzentlinie angepasst.
  - **🛡️ Fix: Keine Verschiebung der Wegpunkte beim Drüberhovern ([RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx))**:
    - *Problemursache*: Der Marker-Wurzelknoten `el` besaß `hover:scale-110 transition-transform`. Da MapLibre die Marker-Position über Inline-CSS `transform: translate3d(...)` steuert, überschrieb Tailwind beim Hovern die Transformationsmatrix und der Marker sprang ruckartig über den Bildschirm.
    - *Lösung*: `hover:scale-110` und CSS-Transform-Klassen vom MapLibre-Wurzelknoten entfernt. Marker-Anchor auf `'bottom'` fixiert.
    - *Hover-Effekt*: Der Hover-Zustand wird nun pixelgenau über `borderColor: #f59e0b` und `boxShadow` gesteuert – ohne Verschiebung oder Wackeln der Map-Koordinaten.
  - **✨ Redesign der Wegpunkte & unteren Leiste ([RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx))**:
    - **Wegpunkt-Pins**: Integrierte Dark-Glassmorphism-Kapseln mit hohem Kontrast, Pill-Badges (`START` smaragdgrün, `ZIEL` rosarot, Zwischenstopps amber), klarer weißer Schrift, nach unten zeigender Pin-Pfeilspitze und leuchtendem Ziel-Punkt direkt auf der Straße.
    - **Infoleiste im Routenbild**:
      - Komplett neu strukturiert und an das OPC-Design angepasst (weg vom unpassenden Violett).
      - Dynamische Breitenberechnung für Start und Ziel mit elegantem Amber-Pfeil `➔` und optionalem Zwischenstopps-Zähler (`+ X Stopps`).
      - Neu gestaltete Distanz- und Fahrzeit-Kacheln mit bernsteinfarbenem Schein, abgerundeten Ecken und markanter `Unbounded`-Typografie.
    - **Interaktive Cockpit-Leiste im Vollbildmodus**:
      - Im Vollbild-Editor wird am unteren Bildschirmrand nun eine schwebende Glassmorphism-Cockpit-Leiste mit Live-Route (Start ➔ Ziel, Distanz in km, Fahrzeit in Min./Std.) eingeblendet.

## [1.7.29] - 2026-09-18

### 🗑️ Bereinigung: Entfernung der System-Tools- und Datenbank-Seiten
  - **Entfernte Seiten ([Database.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Database.tsx), [SystemTools.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/SystemTools.tsx), [App.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/App.tsx))**:
    - `src/pages/Database.tsx` und `src/pages/SystemTools.tsx` vollständig aus der App und dem Dateisystem entfernt.
    - In `src/App.tsx` den Lazy-Import `const Database = lazy(...)`, den `PAGE_ORDER`-Eintrag `'database'` und das bedingte Rendern `{currentPage === 'database' && isAdmin && <Database ... />}` bereinigt.


### ✨ App-weites einheitliches Hover-Design: Leuchtender Rahmen & Ambient Glow auf allen restlichen Seiten vervollständigt
  - **Nachrüstung auf allen 5 betroffenen Bereichen ([OverlaySettings.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/OverlaySettings.tsx), [AfkBot.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/AfkBot.tsx), [Events.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Events.tsx), [Map.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Map.tsx), [InviteCodes.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/InviteCodes.tsx), [Database.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Database.tsx), [index.css](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/index.css))**:
    - **Overlay- & CarPlay-Einstellungen (`OverlaySettings.tsx`)**: Alle 18 Konfigurationskarten (System-Dienste, Design-Stil, Skalierung & Widgets, Status & Preview-Modus, HUD Details, CarPlay Simulator, CarPlay Aktivierung & Design, Web- & Tablet-URL, Zweitdisplay & Tablet-Nutzung, etc.) sowie die Sticky-Tab-Navigationsleiste wurden auf `hover-glow hover:border-primary hover:shadow-[0_0_25px_var(--primary-glow)] transition-all duration-300` synchronisiert.
    - **Anti-AFK Bot (`AfkBot.tsx`)**: Status-Kachel, Hinweiskasten, Konfiguration und Nachrichten-Pools leuchten jetzt beim Drüberhovern im gewählten Akzent-Rahmen und Glow auf.
    - **Events (`Events.tsx`)**: Die leeren Platzhalterkarten („Zurzeit sind keine Events geplant.“ und „Noch keine vergangenen Events.“) reagieren nun ebenfalls auf Hover.
    - **Live-Karte (`Map.tsx`)**: Das Fahrer-Popup (`selectedDriver`) sowie dessen Detailbereiche besitzen nun den synchronisierten Leuchtrahmen.
    - **CSS-Engine (`index.css`)**: Halbtransparente Randregeln wurden mit `:not(:hover)` ausgestattet, sodass Hover-Effekte überall mit 100 % Farbintensität greifen.

## [1.7.27] - 2026-09-16

### ✨ App-weites einheitliches Hover-Design: Leuchtender Rahmen & Ambient Glow synchronisiert
  - **Konsistente Hover-Optik auf ausnahmslos allen App-Seiten ([index.css](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/index.css), [Dashboard.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Dashboard.tsx), [Events.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Events.tsx), [News.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/News.tsx), [Gallery.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Gallery.tsx), [Team.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Team.tsx), [Stats.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Stats.tsx), [Reports.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Reports.tsx), [UsersManagement.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/UsersManagement.tsx), [Applications.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Applications.tsx), [Profile.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Profile.tsx))**:
    - *Problemursache*: Auf manchen Seiten hatten Karten nur einen abgedunkelten Rahmen (oder 50 % `color-mix`), während andere nur einen Schatten-Glow ohne sichtbaren Rahmen aufwiesen.
    - *Lösung*: Auf allen Seiten der App (`Dashboard`, `Events`, `News`, `Gallery`, `Team`, `Statistiken`, `Reports`, `Users`, `Bewerbungen` und `Profil`) wurden die Karten einheitlich auf `hover-glow hover:border-primary hover:shadow-[0_0_25px_var(--primary-glow)]` synchronisiert.
    - In `index.css` lösen alle Hover-Selektoren mit höchster Priorität synchron beide Effekte aus:
      1. Leuchtender Akzentrahmen: `border-color: var(--primary) !important;`
      2. Ausstrahlender Schein & Innenlicht: `box-shadow: 0 0 25px var(--primary-glow), inset 0 1px 1px 0 rgba(255, 255, 255, 0.25) !important;`
    - Die Web-Frontend-Stylesheets (`frontend/`) blieben davon unberührt und wurden im Originalzustand belassen.

### 📅 Fix: Dynamischer Event-Organisator auf Dashboard & Event-Seite
  - **Korrekte Auslese des Event-Organisators ([Dashboard.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Dashboard.tsx), [Events.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Events.tsx))**:
    - Das Dashboard und die Event-Detailkarten zeigten zuvor statisch „Veranstaltet von Open Pipe Club“ oder „Externe Spedition“ an.
    - Nun wird das tatsächlich bei der Eventerstellung gespeicherte Feld `organizer` bzw. `organisator` ausgelesen und formatiert angezeigt.

## [1.7.26] - 2026-09-16

### 🗺️ Gespeicherte Routen-Wegpunkte & Direktes Laden der Event-Route ins Navi / CarPlay
  - **Neues Routenbild wird beim Bearbeiten sofort übernommen ([Events.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Events.tsx), [routes_content.py](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/backend/app/routes_content.py), [images.py](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/backend/app/images.py))**:
    - Versionsbasierter Cache-Busting-Parameter an Event-Bild-URLs verhindert veraltete Browser-Caches.
    - Server priorisiert stets die aktuelle Datenbank-Bild-ID vor dem statischen Fallback.
  - **Wegpunkt-Persistierung im Event-Routenplaner ([RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx), [Events.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Events.tsx))**:
    - Wegpunkte werden in der D1-Datenbank (`custom_events.route_waypoints`) gespeichert.
    - Beim Bearbeiten eines Events werden alle Zwischenstationen und Wegpunkte wieder in die Karte geladen, ohne dass die Strecke neu geklickt werden muss.
  - **„Route ins Navi laden“-Feature für Fahrer ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx), [activeNavigation.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/utils/activeNavigation.ts))**:
    - Schnelltaste auf Event-Karten: „Route ins Navi laden“ / „✓ Route im Navi aktiv“.
    - CarPlay empfängt die Route sofort, zentriert die Karte und visualisiert den Streckenverlauf auf allen Dashboards und MFD-Karten inklusive Abbrechfunktion.

## [1.7.25] - 2026-09-16

### 🗺️ Routenplaner-Vollbild als schwebendes Modal-Fenster
  - **Modal-Ansicht statt Vollbild-Seitenüberdeckung ([Events.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Events.tsx), [RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx))**:
    - Die vergrößerte Ansicht des interaktiven Routengenerators im Event-Erstellungsdialog füllt nicht mehr den gesamten Bildschirm (`h-screen rounded-none max-w-none p-0`), sondern öffnet sich als modernes, schwebendes Modal (`max-w-6xl 2xl:max-w-7xl h-[88vh] rounded-3xl`).
    - Abgedunkelter Backdrop mit Blur-Effekt und rundum sichtbarem Abstand sorgt für ein nahtloses Dialog-Erlebnis.
    - Klick auf den Hintergrund oder Drücken von `Esc` schließt das Modal direkt und bringt den Nutzer zurück zum Formular.
    - Schneller Schließen-Button und optimierte Steuerung im Header.
    - Das Bildübernahme-Popup (`previewPending`) schwebt ebenfalls als formschöner Dialog vor der Karte.

## [1.7.24] - 2026-09-13

### 🚛 Erkennung von TruckersMP-Servern bei Auftragsabgabe & Discord RPC
  - **Präzise Log-Erkennung ([main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**:
    - Der Log-Parser in `getTruckersMPActiveServer` unterstützt nun sowohl `.txt`- als auch `.log`-Dateien (zuvor filterte er strikt auf `.log`, weshalb alle ETS2MP-Logs ignoriert wurden).
    - Chat-Logs (`chat_YYYY_MM_DD_log.txt`) werden nun vorrangig analysiert, um den tatsächlichen Servernamen (z. B. `Simulation 1`, `Simulation 2`, `ProMods`) exakt auszulesen.
    - Suffixe wie `server...` werden bereinigt und IP-Verbindungen (`141.94.x.x`) automatisch zugeordnet.
  - **Prozess- & Umgebungs-Erkennung in Native Bridge ([telemetry-bridge.cs](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/telemetry-bridge.cs))**:
    - Prüfung auf geladene `core_ets2mp.dll`/`core_atsmp.dll` im Spielprozess sowie TMP-Umgebungsfahrzeuge (`isTmp`) liefert `isTruckersMp: true` direkt im Telemetrie-Stream.
  - **Auftrags- & Discord RPC Synchronisation**:
    - Der Servername wird zu Auftragsbeginn fixiert (`activeJobServerName`) und bei der Übergabe verlässlich übermittelt.
    - Discord RPC zeigt ab sofort `[Simulation 1]` (bzw. den jeweiligen Server) statt dauerhaft `[Singleplayer]`.

## [1.7.23] - 2026-09-13

### 🟣 Dunkleres Lila für die Navigationsroute
  - **Sattes, edles Tiefviolett ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Die Routenfarbe (`accentColor`) wurde vom vormals hellen Fliederton (`#8b5cf6`) auf ein deutlich kräftigeres, dunkleres Lila (`#6d28d9` – Tailwind Violet 700) umgestellt.
    - Synchronisiert auf allen drei CarPlay-Kartenansichten (Home Dashboard, maximierte Vollbild-Karte und MFD-Kombiinstrument).
    - Der Kernstrang (`route-remaining-line`) und der darunterliegende Weichzeichnungs-Glow (`route-remaining-glow`) heben sich nun mit starkem Kontrast noch harmonischer von hellen und dunklen Fahrbahnoberflächen ab, während die weißen Abbiegepfeile gestochen scharf hervorstechen.

### 🔵 Vergrößerte Mitspieler-Marker im selben Apple CarPlay Blau auf allen CarPlay-Karten
  - **Identische Farbgebung zum eigenen Spielermarker ([GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx), [CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Die Farbe der Mitspieler-Icons (`nearbyVehicleColor`) wurde vom vorherigen Violett (`#a855f7`) auf das markante Apple CarPlay Blau (`#007aff`) umgestellt – exakt identisch zum eigenen Fahrzeugmarker.
    - Standardwert in `GameMapWidget.tsx` sowie in allen drei CarPlay-Kartenansichten in `CarPlay.tsx` (Home Dashboard, maximierte Karte und Kombiinstrument/MFD Tacho) auf `#007aff` vereinheitlicht.
  - **Deutliche Vergrößerung & gestochen scharfe Erkennbarkeit**:
    - Erhöhung der Canvas-Basisauflösung von vormals 32×32 px (64×64 Retina) auf 48×48 px (96×96 px Retina).
    - Der Symbol-Durchmesser und der Richtungszeiger wurden um ~70 % vergrößert, ergänzt durch einen kräftigen Drop-Shadow mit feinem Glühen, eine scharfe weiße Kontrastumrandung (`1.8 * s`) und eine weiße interne Richtungsanzeige im Pfeilkopf.
    - Skalierungs-Interpolation (`icon-size`) auf der MapLibre-Ebene `nearby-vehicles-layer` massiv angehoben (Zoom 4.5: 0.75 / ~36 px; Zoom 7: 1.05 / ~50 px; Zoom 9: 1.35 / ~65 px; Zoom 11: 1.65 / ~79 px; Zoom 13: 1.9 / ~91 px).
    - Dadurch sind andere Trucker und KI-Fahrzeuge während der Fahrt im CarPlay-Cockpit selbst bei hohen Geschwindigkeiten und auf weite Distanz sofort glasklar sichtbar.

## [1.7.22] - 2026-09-12

### 🗺️ ETS2 Prefab-Debugger App (Weg C) für Kreuzungs-Geometrien eingerichtet
  - **Karten-Inspektion für ETS2-Kreuzungen & Kreisverkehre ([packages/apps/prefabs](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/maps-main/packages/apps/prefabs))**:
    - **Daten-Vorverarbeitung & Performance-Turbo ([generate_prefab_options.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/maps-main/generate_prefab_options.ts))**:
      - Statt im Browser bei jedem Seitenaufruf ~350 MB rohe JSON-Dateien (`europe-nodes.json` mit 1,5 Mio. Knoten) zu parsen, wurde ein schlanker Builder implementiert.
      - Erzeugt eine 27 MB kompakte `europe-prefab-options.json` mit 2.408 vollständigen ETS2-Kreuzungen, PPD-Beschreibungen und WGS84-Geokoordinaten.
    - **Vite & Projektions-Anpassung ([PrefabSelect.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/maps-main/packages/apps/prefabs/src/PrefabSelect.tsx), [vite.config.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/maps-main/packages/apps/prefabs/vite.config.ts))**:
      - `PrefabSelect.tsx` auf europäische ETS2-Daten und `fromEts2CoordsToWgs84`-Projektion umgestellt.
      - Vite Dev-Server auf Port 5175 gestartet: Ermöglicht die interaktive visuelle Begutachtung sämtlicher Kreuzungs-Modelle (Kurven, Lanes, Knoten, Fahrbahn-Polygone) mit direktem Hot-Reload bei Änderungen an [prefabs.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/maps-main/packages/libs/map/prefabs.ts).
  - **🔄 Ansatz 1: Echte `navCurves` für Kreisverkehre aktiviert ([prefabs.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/maps-main/packages/libs/map/prefabs.ts))**:
    - **Beseitigung der geraden Kreuzungslinien**: Statt die starren, geraden 2D-Proxy-Mittellinien aus den SCS-`mapPoints` quer durch den Kreisverkehr zu ziehen, erzeugt `toRoadStringsAndPolygons` die Straßen nun direkt aus den realen `navCurves` (Fahrspuren der Spiel-KI via `calculateLaneInfo`).
    - **Getrennte Fahrspuren & Ring-Geometrie**: Die Zufahrten verengen sich an den 4 Einmündungsknoten nicht mehr zu einem einzigen Punkt, sondern fächern sich natürlich in getrennte, tangential einmündende Einfahrts- und Ausfahrtsbögen auf. Der Kreisverkehr wird nun als echter, runder Verkehrsring gerendert.
  - **☁️ Re-Kompilierung & Cloudflare R2 Sync ([upload_pmtiles_to_r2.py](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/maps-main/upload_pmtiles_to_r2.py))**:
    - `ets2.geojson` (195 MB) mit den verbesserten Kreisverkehr-Kurven neu generiert.
    - Mittels `tippecanoe` in WSL zu einer hochauflösenden Vektorkachel-Datei `ets2.pmtiles` (95 MB, Zoom 4–13) kompiliert.
    - Vollständiger Upload auf Cloudflare R2 (`open-pipe-club-storage/map/ets2.pmtiles`, `open-pipe-club-storage/ets2.pmtiles` und `open-pipe-club-storage/map_cache/ets2.pmtiles`) – ab sofort weltweit im Live-Betrieb und CarPlay verfügbar.

## [1.7.21] - 2026-09-12

### 🧭 Exakte CarPlay Kartenrotation, Breitere Straßen (TruckersMudgeon) & Harmonische Routenglättung
  - **📐 Exakte geodätische Kartenrotation ohne Meridian-Verdrehung ([GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx))**:
    - **Ursache der Verdrehung**: Die ETS2-Spielkoordinaten basieren auf einer konischen Lambert-Projektion (*Lambert Conformal Conic* mit Zentralmeridian auf $15^\circ$ Ost). Durch die Konvergenz der Längengrade gegenüber der Web-Mercator-Kartenprojektion (EPSG:3857) wich die flache Heading-Umrechnung um wenige Grad von der tatsächlichen Straßenachse ab (in Deutschland $3^\circ-6^\circ$, in Frankreich/UK bis zu $10^\circ-12^\circ$).
    - **Originale TruckersMudgeon-Lösung**: Einführung von `computeExactBearing`: Ein 1.000 m vorausschauender Richtungsvektor wird im Lambert-Projektionsraum berechnet und beide Punkte über `projectGameToLatLng` in geographische WGS84-Koordinaten transformiert. Der geodätische Azimut wird anschließend exakt berechnet – die CarPlay-Karte und der Navigationspfeil sind auf jedem Längengrad zu 100 % parallel zur Fahrbahn ausgerichtet.
  - **🛣️ Originalgetreue Straßenbreiten aus dem TruckersMudgeon-Repository ([GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx), [Map.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Map.tsx))**:
    - Die bisherige starre Zoom-10-Obergrenze von nur 9 px wurde durch die originale exponentielle TruckersMudgeon-Interpolation (`['exponential', 1.5], ['zoom'], 3, 0.8, 14, 30, 16, 150`) ersetzt.
    - Casing-Ebene (`ets2-roads-casing`) auf `line-gap-width: roadLineWidth` und `line-join: bevel` umgestellt: Autobahnen, Schnellstraßen und Ortsstraßen erscheinen im typischen CarPlay-Zoom (11 bis 13) deutlich breiter, massiver und betten die Routenlinie sauber ein.
  - **〰️ Winkel-geklemmte Routenglättung ohne Ausbuchtungen ([routeSmoother.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/utils/routeSmoother.ts), [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx))**:
    - Flawed Catmull-Rom ersetzt durch einen winkel-geklemmten kubischen Hermite-Spline-Algorithmus.
    - **Keine Überschwinger an Abbiegungen**: Bei Manövern und Kreuzungen mit Winkeln $> 35^\circ$ wird die Tangente strikt entlang der Sehne geklemmt – dadurch schlägt die Route vor oder nach Kreuzungen niemals in den Gegenverkehr oder ins Gelände aus.
    - **Fließende Kurven**: Straßenbögen mit leichten Winkeln ($1.5^\circ$ bis $35^\circ$) werden organisch mit 5-m-Intervallen geglättet, sodass die Route ohne kantige Polygone elegant dem Straßenverlauf folgt.
    - Dynamisches Routenfortschritt-Slicing (`sliceRouteProgress`) direkt auf den geglätteten Koordinaten mit Referenz-Tracking (`fullRemainingCoordsRef`, `rawRouteCoordsRef`).

## [1.7.20] - 2026-09-12

### 🧭 CarPlay Navigations-Einstellung & 🔍 Intelligentes Auto-Hide der Karten-Suchleiste
  - **Navigationsanweisungen ein-/ausschaltbar ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx), [OverlaySettings.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/OverlaySettings.tsx))**:
    - Neue Einstellung `carPlayShowNavInstructions` hinzugefügt (Standard: aktiviert).
    - **In den CarPlay-Einstellungen**: Neuer Toggle *Navigations-Anweisungen* (mit 🧭 Kompass-Symbol) direkt in der CarPlay-Schaltzentrale; steuerbar per Touchscreen, Lenkrad-Buttons oder Tastatur.
    - **In den App-Einstellungen (Tab 2 CarPlay Cockpit)**: Praktischer Schalter im CarPlay-Designbereich zum globalen Voreinstellen.
    - **Reaktives Ausblenden**: Bei Deaktivierung werden Abbiegehinweise, Straßennamen und Spurempfehlungs-Overlays (`CarPlayNavOverlay`) auf allen CarPlay-Kartenansichten (Homescreen-Splitscreen sowie Vollbild-Karte) vollständig ausgeblendet.
  - **Automatisches Ausblenden der Karten-Suchleiste bei aktiver Route ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Freie Sicht auf die Route**: Sobald ein Auftrag oder eine Route aktiv ist (entweder durch Telemetrie aus ETS2/ATS oder eine manuelle CarPlay-Zielauswahl), verschwindet die Suchleiste auf der maximierten Karte automatisch mit sanfter `AnimatePresence`-Animation.
    - **Intelligente Rückkehr**: Sobald die Fracht abgeliefert, das Ziel erreicht oder die Route abgebrochen wird, blendet sich die Firmensuche direkt wieder ein.
    - **Fokus- & Tastatur-Anpassung**: Die Pfeiltasten- und Enter-Navigation fokussiert bei aktiver Route direkt das Routen-Steuerungs-HUD (Abbrechen / Zielinfos), ohne den Fokus auf die ausgeblendete Suchleiste zu legen.

## [1.7.19] - 2026-09-12

### 🚦 Vertikales Ampel-Design (Top-to-Bottom)
  - **Vertikale Ausrichtung ([TrafficLightWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/TrafficLightWidget.tsx))**:
    - **Realistische Signalleuchten-Optik**: Die Ampel wurde von der vorherigen horizontalen Linsenleiste auf ein 100% vertikales Ampel-Design umgestellt (Rot oben, Gelb in der Mitte, Grün unten).
    - **Kompakt-Variante**: Schlankes 58-px-Chassis mit 28-px-Signallinsen, abgerundeten Ecken und direkt darunter integrierter kompakter Countdown- & Distanzanzeige.
    - **Groß-Variante**: Breiteres 76-px-Anthrazit-Gehäuse mit 44-px-Linsen und vertikal angegliedertem Status-Badge für maximale Lesbarkeit bei hohen Bildschirmauflösungen.
    - **Leuchtdioden & Glow**: Strahlende Farb-Glows für aktive Linsen und dezenter Transluzenz-Look für inaktive Linsen; pulsierender Gelb-Blinker für Vorwarnungen.
  - **Layout- & Dimensions-Migration ([Overlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Overlay.tsx), [OverlaySettings.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/OverlaySettings.tsx))**:
    - Standardabmessungen für das `trafficLight`-Widget im In-Game Overlay und Simulator von vormals horizontalen `190x64 px` auf vertikale `70x160 px` (Kompakt) bzw. `84x225 px` (Groß) umgestellt.
    - Automatische Migration vorhandener lokaler Einstellungen (`localStorage`), falls noch die alten horizontalen Dimensionen hinterlegt waren.

## [1.7.18] - 2026-09-12

### 🚦 Overlay Ampel-Assistent & 🗂️ 2-Tab System für die Overlay-Einstellungen
  - **🚦 Ampel-Assistent im In-Game Overlay ([Overlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Overlay.tsx))**:
    - **Echtzeit-Ampel-Widget**: Das Ampel-Widget (`trafficLight`) ist nun vollständig als eigenständiges Overlay-Widget im transparenten In-Game HUD integriert.
    - **Intelligentes Auto-Hide**: Im gesperrten Spielmodus (`isLocked`) nimmt das Widget auf freier Strecke 0 Pixel Platz ein. Erst bei Annäherung an eine Kreuzungsampel (≤ 150 m) schaltet es sich automatisch und flüssig zu und zeigt Phasenfarbe, Restzeit-Countdown in Sekunden und Meterdistanz.
    - **Setup-Vorschau**: Im entsperrten Vorschaumodus (`!isLocked`) wird eine Demo-Ampel mit Countdown angezeigt, sodass Fahrer das Widget pixelgenau per Drag & Drop auf dem Desktop positionieren und skalieren können.
    - **Optionale Design-Varianten**: Unterstützt wahlweise die platzsparende Kompakt-Leiste oder die große Signalleuchte.
  - **🗂️ 2-Tab System für die Overlay-Einstellungen ([OverlaySettings.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/OverlaySettings.tsx))**:
    - **Architektur & Trennung**: Entflechtung der bisher überfrachteten Einstellungsseite in ein modernes, am Adminbereich (`Admin.tsx`) orientiertes 2-Tab-System mit Sticky-Navigation und sanften `AnimatePresence`-Übergängen.
    - **Tab 1: In-Game Overlay**:
      - Konzentration auf alle HUD-bezogenen Einstellungen: System-Dienste, Design-Stile (Neon, Carbon, Minimal, Custom Palette), Skalierung & Deckkraft.
      - Schalter **Ampel-Assistent (Echtzeit)** in der Widget-Liste inklusive Auswahl zwischen kompakter HUD-Leiste und großem Signallicht.
      - Desktop-Simulator mit Drag & Drop, Richtlinien-Snapping und Widget-Resizing.
    - **Tab 2: CarPlay Cockpit**:
      - Dedizierte Schaltzentrale für das CarPlay / Android Auto Zusatzfenster: Aktivierungsschalter, Farbthemen (Dunkel, Hell, Auto) und Text-Skalierung.
      - 9 konfigurierbare Cockpit-Alerts (Tempo, Tank, Müdigkeit, Schaden, Auftrag, Musik, Chat, News, Events).
      - Hotkey-Rekorder für Tastatur- und Lenkrad-Button-Belegungen.
      - Interaktiver CarPlay Splitscreen Simulator und Multi-Display Setup-Guide.

## [1.7.17] - 2026-09-12

### ⚡ Umfassende Full-Stack Performance- & Speicheroptimierung
  - **🚫 Beseitigung der redundanten 33-FPS-Wegpunkt-Klonung ([main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts), [CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx), [Overlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Overlay.tsx))**:
    - **Flaschenhals**: Bisher hat der Electron-Hauptprozess den gecachten Wegpunkt-Array (bis zu 2.000 Punkte = 6.000 Zahlen) bei jedem Telemetrie-Tick (33 Hz) an das Payload-Objekt angehängt. Über `webContents.send` (IPC) führte der V8-Structured-Clone zu **~600.000 geklonten Heap-Objekten pro Sekunde** über 3 Fenster hinweg, was signifikante Garbage-Collection-Stotterer (GC-Spikes) und unkontrollierten RAM-Zuwachs verursachte.
    - **Lösung**: Wegpunkte werden über IPC ab sofort ausschließlich dann übertragen, wenn sie tatsächlich neu berechnet bzw. von der Spiel-Bridge aktualisiert wurden (`routeWaypoints !== undefined`). In `CarPlay.tsx` und `Overlay.tsx` werden die Wegpunkte in stabilen Refs (`cachedRouteWaypointsRef`) gehalten, wodurch der IPC-Datendurchsatz um 99,9% sinkt und unnötige Re-Tessellierungen vermieden werden.
    - **1-Hz-Drosselung für das Hauptfenster**: Da [App.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/App.tsx) Telemetrie nur einmal pro Sekunde darstellt, werden 33-Hz-IPC-Sendungen an `win` unterdrückt und auf 1 Hz bzw. Verbindungsstatus-Änderungen beschränkt.
  - **🗺️ MapLibre WebGL-Optimierung & 95% weniger Tile-Queries ([GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx))**:
    - **Throttling von `map.queryRenderedFeatures`**: Die Ermittlung des Straßentyps (`freeway`, `divided`, `local`) zur Spurberechnung fragte bisher 33 Mal/s den WebGL-Kachelindex ab. Durch Throttling auf max. alle 500 ms (oder bei mehr als 20 m Positionsverschiebung) wurden 95% der teuren Kachelabfragen vom Haupt-Thread eliminiert.
    - **Beseitigung toter Re-Render-Zyklen**: Der ungenutzte React-State `[approachingLight, setApproachingLight]` in `GameMapWidget.tsx` wurde entfernt. Der Callback `onApproachingTrafficLightChange` wird ab sofort nur noch gefeuert, wenn sich Ampel-ID, Status, Distanz oder Countdown tatsächlich ändern, statt 33 Mal/s neue Objektinstanzen zu erzeugen.
    - **Intelligenter Instruktionsabgleich (`areInstructionsEqual`)**: `setNavInstruction` triggert React-Updates nur noch bei veränderten Navigationsanweisungen, Distanzen, Pfeilkonfigurationen oder Manövern (Reduktion von 33 FPS auf 1–2 Updates pro Sekunde).
    - **Zero-Footprint bei 0 Umgebungsfahrzeugen**: Befinden sich keine fremden Fahrzeuge im Umkreis (z. B. im Singleplayer oder auf freier Strecke), werden GeoJSON-Updates und `map.triggerRepaint()` vollständig übersprungen.
    - **Automatischer Idle-Sleep bei stehendem Fahrzeug**: Steht der LKW an einer roten Ampel oder auf dem Rastplatz, pausiert `map.jumpTo()` in der 60-FPS-Animationsschleife, wodurch die GPU-Last im Stillstand auf nahezu 0% absinkt.
  - **🏎️ Zero-Allocation Memory-Reads in der C# Telemetrie-Bridge ([telemetry-bridge.cs](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/telemetry-bridge.cs))**:
    - **Statische Puffer**: Die dynamischen Allokationen (`new byte[maxKdop * 8]`, `new byte[maxSem * 16]`, `new byte[0xC0]`, `new byte[7]`, `new byte[2MB]`) in `ReadSemaphoresFromGameProcess` wurden durch wiederverwendbare, vorallokierte Klassen-Puffer (`_kdopBuffer`, `_instBuffer`, `_ruleBuffer`, `_fastCheck`, `_scanChunk`) ersetzt.
    - **Fast-Path JSON Escaping**: `EscapeJson` prüft Strings vorab auf Sonderzeichen. Standard-Strings (z. B. Städtenamen, LKW-Modelle, Frachtbezeichnungen) passieren ohne Allokation eines neuen `StringBuilder`.
  - **⚡ React Component Memoization & Distanz-Filterung ([TrafficLightWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/TrafficLightWidget.tsx), [CarPlayNavOverlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/CarPlayNavOverlay.tsx), [SpotifyWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/SpotifyWidget.tsx), [trafficLightDetector.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/utils/trafficLightDetector.ts))**:
    - `TrafficLightWidget`, `CarPlayNavOverlay` und `SpotifyWidget` sind nun mit `React.memo` geschützt und rendern sich nur bei geänderten Daten neu.
    - In `detectApproachingTrafficLight` filtert eine Distanz-Quadrat-Prüfung (`distSq > maxDistSq`) weit entfernte Ampeln vor der Berechnung von `Math.sqrt` ab.

## [1.7.16] - 2026-09-12

### 🚦 Echtzeit-Ampelerfassung & Große Ampel am Tempolimit-Platz in CarPlay
  - **Direkte In-Memory-Extraktion & Telemetrie-Bridge ([telemetry-bridge.cs](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/telemetry-bridge.cs), [traffic.cpp](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/OPCGameBridge/OPCGameBridge/traffic.cpp))**:
    - **Singleplayer-Fix in `traffic.cpp`**: Im Singleplayer war die Liste der fremden Mitspieler-Fahrzeuge leer (`listSize == 0`), wodurch die vorherige DLL-Routine vor Erreichen des Semaphore-Codes abbrach.
    - **Struktur-Offset korrigiert**: In Prism3D liegt `placement_t` bei `actorPtr + 0x0028` (Offset 0x00 enthielt die VTable, wodurch unplausible Koordinaten entstanden).
    - **Nativer Fallback-Scan (`ReadSemaphoresFromGameProcess`)**: `opc-telemetry-bridge.exe` liest die aktiven Kreuzungsampeln (Status, Restzeit, Weltkoordinaten) nun direkt und hochperformant via Pointer-Chains (`base_ctrl -> kdop -> prefabs -> semInst -> trafficRule`) aus dem ETS2-Prozessspeicher aus.
  - **Nahbereichs-Erkennung an der Haltelinie ([trafficLightDetector.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/utils/trafficLightDetector.ts))**:
    - Die Erkennung deckt den Bereich von 0 bis 150 m vor dem Fahrzeug ab.
    - Im Nahbereich (≤ 15 m) vor der Kreuzung wird das Winkelfenster dynamisch erweitert, sodass seitlich auf dem Bürgersteig stehende Ampelmasten an der Haltelinie nicht aus der Ansicht verschwinden.
  - **Schlichtes 2D-Design in Anthrazit & Ruckelfreie Positionierung ([TrafficLightWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/TrafficLightWidget.tsx), [CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx), [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx))**:
    - **Entfernung des Karten-Pulsmarkers**: Der gelb/orangene pulsierende Kreis-Marker direkt vor der Pfeilspitze des LKW auf der Karte wurde vollständig entfernt (inklusive Bereinigung der Cleanup-Handler in [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx)).
    - **Größere Dimensionen & Optimierte Lesbarkeit**: Die Ampel wurde für den Fahrersitz vergrößert (Gehäusebreite 76px, Linsendurchmesser 44px) und die Typografie im Info-Badge auf fette Monospace-Größe (`text-xs font-black`) angehoben, um Countdown und Distanz auf einen Blick mühelos zu erfassen.
    - **Feste Positionierung ohne Wackeln**: Der Tempolimit- und Ampel-Slot in CarPlay besitzt nun eine feste Breite (`w-24`) mit zentrierter Achse. Zusammen mit fest breiten Elementen (`w-[76px]`) und `tabular-nums` bleibt die Ampel absolut starr an derselben Position fixiert und verschiebt sich nicht mehr horizontal, wenn sich der Countdown oder die Meteranzeige ändert.
    - **Reines 2D-Anthrazit & Dreifarbige Linsen**: Das Gehäuse ist nun komplett in mattem Anthrazit-Kunststoff (`#202227` mit feiner Kontur `#333742`) gehalten. Die drei runden Farbpunkte (Rot, Gelb, Grün) bleiben permanent in ihren unverwechselbaren Farben sichtbar (leuchtend bei aktiver Phase, dezent abgetönt im Ruhezustand). Sämtliche 3D-Verläufe, Schuten, Glas-Spiegelungen und Glanzeffekte wurden entfernt.
    - **Nahtloser Tempolimit-Wechsel**: Bei aktiver Ampel bleibt das Tempolimit als kompakte Plakette direkt darunter angedockt; nach Passieren der Ampel morpht die Anzeige verzögerungsfrei zum gewohnten Tempolimitschild zurück.

## [1.7.15] - 2026-09-11

### CarPlay Spuranzeige & Navigationsanweisungen
  - **🏹 Neue Spurpfeil-Variationen & Kombinationspfeile ([CarPlayNavOverlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/CarPlayNavOverlay.tsx), [navInstructionEngine.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/utils/navInstructionEngine.ts))**:
    - **Geradeaus- & Abbiege-Kombinationspfeile (`straight-turn-right` ↑↱ & `straight-turn-left` ↰↑)**:
      - Einführung vollwertiger StVO-konformer Kombinationspfeile für Kreuzungsspuren, auf denen sowohl geradeaus gefahren als auch im 90°-Winkel abgebogen werden darf.
      - Echter 90°-Abzweig mit horizontalem Abbiegepfeil statt bloßer diagonaler Autobahngabelung.
      - **Harmonische Pfeilgeometrie**: Der Abzweig-Knickpunkt wurde vertikal nach unten in die untere Schafthälfte (Höhe $y=12$) versetzt, sodass die Abbiegepfeilspitze eine klare vertikale Trennung von der oberen Geradeaus-Pfeilspitze aufweist und nicht mehr am oberen Pfeilkopf klebt.
    - **Reale Spurbelegung an Kreuzungen (`buildLanes`)**:
      - Auf 2-spurigen Straßen wird die rechte Fahrspur beim Rechtsabbiegen nun vorbildgetreu als `straight-turn-right` (↑↱, aktiv) dargestellt, während die linke Spur auf `straight` (↑, inaktiv) verbleibt.
      - Beim Linksabbiegen auf 2-spurigen Straßen wird die linke Fahrspur als `straight-turn-left` (↰↑, aktiv) dargestellt.
      - Auf 3- und mehrspurigen Kreuzungen werden mehrfache Abbiege- und Kombispuren (z. B. Geradeaus-/Rechtsspur neben reiner Rechtsabbiegespur) differenziert abgebildet.
    - **Erweiterte Pfeilbibliothek**:
      - `left-right` (↰↱): T-Kreuzungen mit geteiltem Links-/Rechts-Abbiegen.
      - `straight-left-right` (↰↑↱): Universelle Mehrzweck-Spuren für alle Richtungen.
      - `u-turn` (↶): Spezifischer CarPlay 180°-Wendesymbol-Spurpfeil.
  - **⏱️ Beseitigung des vorzeitigen Umschaltens von Navigationsanweisungen (`navInstructionEngine.ts`)**:
    - **Ursache**: Bisher wurden Manöver über die strikte Bedingung `tpIdx > bestIdx` gefiltert. Sobald der LKW den Scheitelpunkt (Apex) einer Kreuzung erreichte (`bestIdx == tpIdx`), wurde die Abbiegeanweisung sofort verworfen – der Fahrer befand sich noch mitten im Abbiegevorgang, als die Anweisung bereits auf das nächste Manöver oder "Dem Straßenverlauf folgen" umsprang.
    - **Pass-Through Buffer (Nachlaufpuffer)**:
      - Abbiegungen und U-Turns bleiben nun verlässlich auf `"Jetzt [Richtung] abbiegen"` mit aktiven Spurpfeilen aktiv, bis der LKW den Scheitelpunkt um mindestens **22 Meter** passiert hat und vollständig auf die neue Straße eingebogen ist.
      - Autobahnausfahrten besitzen einen erweiterten Puffer von **30 Metern**, sodass die Ausfahrtsanweisung stabil bleibt, während das Fahrzeug auf die Verzögerungsspur/Rampe wechselt.
      - Kreisverkehre werden nun anhand von `endDistAlong` ausgewertet und bleiben aktiv, bis der Fahrer die Ausfahrt des Kreisverkehrs um **18 Meter** hinter sich gelassen hat.
  - **📐 Verfeinerte Kurven- & Abbiegeunterscheidung (`navInstructionEngine.ts`)**:
    - Parametrisierte Krümmungsraten-Schwellenwerte (`CURVE_RATE_MAX = 0.40°/m`, `TURN_RATE_MIN = 1.1°/m`, `TURN_ANGLE_MIN = 20°`) zur präzisen Trennung weicher Kurvenverläufe von echten Abbiegemanövern.

## [1.7.14] - 2026-09-11

### CarPlay Karte & Sprite-Darstellung
  - **🔷 Eintöniger blauer Spielermarker ([GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx))**:
    - Der Spielermarker ist nun in einem sauberen, monochromen Apple CarPlay Blau (`#007aff`) gehalten.
    - Bisherige Farbverläufe (Ice-Blue/Royal-Blue), weiße Mittelstreifen und Apex-Punkte wurden entfernt, um einen homogenen, minimalistischen Navigationspfeil mit prägnanter Kontur zu gewährleisten.
  - **🗺️ Sprites & POIs über der Navigationsroute ([GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx))**:
    - Die Navigationsroute (`route-traveled-line`, `route-remaining-glow`, `route-remaining-line` etc.) wird ab sofort unterhalb aller Karten-Sprites (`ets2-pois`, `ets2-companies`, `ets2-traffic`, `ets2-cities`, `nearby-vehicles-layer`) eingefügt.
    - Symbole wie Tankstellen, Mautstationen, Andreaskreuze, Ampeln und Mitspieler-Fahrzeuge werden dadurch niemals von der Route verdeckt.
  - **🚦 Beseitigung der doppelten Ampel am Andreaskreuz ([GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx), [MgmtMapPage.js](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/frontend/src/drivershub/pages/MgmtMapPage.js))**:
    - **Ursache**: In ETS2/ATS-Kartendaten besitzen Bahnübergänge Blinklichter, die im Spiel-Prefab technisch als `semaphores` (Ampeln) geführt werden. Dadurch lagen an Bahnübergängen sowohl das Andreaskreuz (`railcrossing`) als auch eine Straßenampel (`trafficlight`) exakt am selben Koordinatenpunkt.
    - **Lösung**: Durch Einführung einer Kollisionshierarchie (`symbol-sort-key`: `railcrossing: 1`, `trafficlight: 3`) mit deaktiviertem Overlap (`icon-allow-overlap: false`) blendet MapLibre an Bahnübergängen ausschließlich das Andreaskreuz ein und unterdrückt die darunterliegende Ampel zuverlässig.

## [1.7.13] - 2026-09-11

### CarPlay Navigation & Karten-Zentrierung
  - **📍 Zentrierung von Spielermarker & Karte zwischen Anweisungsbox und Fensterkante ([GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx))**:
    - **Stabiles vertikales Padding für die große CarPlay-Karte**: Die Anbindung an `fullWidthInstructions` hatte das Top-Offset auf der Vollbildkarte (`carplay-max`) blockiert. Bei aktiven Navigationshinweisen wird nun ein exakt abgestimmtes Top-Padding von `150px` auf der großen Karte (und `140px` auf dem Home-Dashboard) gesetzt. Dadurch positioniert sich der Spielermarker vertikal harmonisch mittig zwischen der Anweisungsbox und der unteren Fensterkante.
    - **Beseitigung des MapLibre-Laufzeitfehlers (`Attempting to run(), but is already running`)**: Das vorherige stufenlose Interpolieren des Paddings pro Animationsframe kollidierte mit dem internen Render-Runner von MapLibre GL. Durch Übergabe des diskreten, stabilen Padding-Wertes läuft der 60-FPS-Kamera-Follow vollkommen fehler- und ruckelfrei.
    - **Recenter-Absicherung**: Sämtliche Re-Centering-Funktionen berücksichtigen das aktive Navigations-Padding.
  - **🛣️ Spline-Glättung & Spur-Zentrierung der Navigationsroute ([routeSmoother.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/utils/routeSmoother.ts), [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx))**:
    - **Centripetal Catmull-Rom Spline-Interpolation ($\alpha = 0.5$)**: Rohe In-Game-Wegpunkte aus dem ETS2-Speicher liegen in Autobahnkurven oft 40 bis 80 Meter auseinander. Reine geradlinige Sehnenverbindungen (Chords) schnitten Kurvenradien bisher ab und wichen bis zu 2 Meter von der Straßenmitte ab, sodass die Route zwischen den Fahrspuren lag oder kantig wirkte.
    - **Exakter Kurvenverlauf auf der Straße**: Das neue Modul `routeSmoother.ts` interpoliert lange Kurvensegmente dynamisch alle ~6 Meter mit einer mathematisch beweisbar überschwingungsfreien Centripetal Catmull-Rom-Spline.
    - **Spurtreue in Autobahnkurven**: Die Sehnentiefe wird von 2 Metern auf unter 3 Zentimeter reduziert, wodurch die Route sauber mittig in der befahrenen Spur verläuft.
    - **Erhalt von 90°-Kreuzungen**: Strikte Abbiegewinkel (> 65°) an Kreuzungen oder Einmündungen bleiben unberührt, um ein Verzerren oder Schneiden von Gebäuden an Einmündungen zu verhindern.
  - **🧭 Vollständige Überarbeitung der Navigationsanweisungen & Beseitigung falscher Abbiegehinweise ([navInstructionEngine.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/utils/navInstructionEngine.ts), [CarPlayNavOverlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/CarPlayNavOverlay.tsx), [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx))**:
    - **Beseitigung falscher "Scharf abbiegen"-Meldungen auf Autobahnen**: Bisher führte die bloße Erkennung eines Gesamtwinkels (> 22° bzw. > 60°) über ein 70m-Fenster dazu, dass normale Autobahnkurven bei 80 km/h fälschlicherweise als "Scharf rechts/links abbiegen" deklariert wurden und die Spuranzeige auf 90°-Abbiegepfeile umstellte.
    - **Mathematische Krümmungsraten-Klassifizierung ($\kappa$)**: Durch die Einführung eines Dual-Window-Filters ($W = 8\text{m}$ für Kreuzungen, $W = 16\text{m}$ für Ausfahrten) wird die lokale Krümmungsrate $\kappa = \frac{\Delta\theta}{\Delta s}$ berechnet. Normale Straßen- und Autobahnkurven ($\kappa < 0.40^\circ/\text{m}$, Radius $> 140\text{m}$) werden sauber ignoriert – die Navigationsanweisung lautet dauerhaft `"Dem Straßenverlauf folgen"`.
    - **Echte Kreisverkehr-Erkennung (Roundabout)**: Kontinuierliche zirkuläre Krümmungen ($25\text{m} - 180\text{m}$) werden als Kreisverkehr erkannt, die gefahrene Bogenrotation analysiert und die korrekte Ausfahrt (1. bis 4. Ausfahrt) berechnet: `"Im Kreisverkehr die 2. Ausfahrt nehmen"`.
    - **Neue, dedizierte CarPlay SVG-Icons**:
      - **Kreisverkehr-Icon**: Zeigt einen runden Kreisverkehrsbogen mit Ausfahrtspfeil und der exakten Ausfahrtnummer (1..4) im Zentrum auf bernsteinfarbenem Kontrasthintergrund.
      - **Autobahn-Ausfahrt-Icon**: Authentischer CarPlay-Gabelungspfeil mit gerader Hauptspur und nach rechts/links abzweigender Ausfahrtsrampe.
      - **U-Turn-Icon**: 180°-Wendesymbol.
    - **Situationsgetreue Spurpfeil- & Ausfahrtsdarstellung (`buildLanes` & `renderLaneArrow`)**:
      - **Autobahn-Ausfahrten (Rampen & Gabelungen)**: Zeigt bei Ausfahrten keine unpassenden 90°-Stadtkreuzungs-Winkelpfeile (`↱`) mehr, sondern exakte, schräg nach rechts/links abzweigende Ausfahrtsrampen-Pfeile (`↗` bzw. `↖`) sowie geteilte Geradeaus-/Ausfahrtspfeile (`↑↗`).
      - **Mehrspurige Fahrbahnen (1–2 Abbiegespuren)**: Auf 3- oder 4-spurigen Straßen wird die reale Spurenaufteilung abgebildet:
        - *2-spurige Ausfahrt / Autobahnkreuz*: linke Spur(en) geradeaus (`↑`, inaktiv), mittlere Spur geradeaus & Ausfahrt (`↑↗`, aktiv), rechte Spur reine Ausfahrt (`↗`, aktiv).
        - *1-spurige Ausfahrt*: linke Spuren geradeaus (`↑`, inaktiv), rechte Spur Ausfahrt (`↗`, aktiv).
        - *Mehrspuriges Kreuzungsabbiegen*: rechte 1–2 Spuren biegen ab (`↑↱` + `↱` bzw. `↰` + `↰↑`), Durchgangsspuren bleiben geradeaus.
      - **High-Contrast Apple CarPlay Pfeildesign**: Aktive Spuren erstrahlen in reinem, leuchtendem Weiß (`#ffffff`) mit Glow-Effekt und 12% Vergrößerung (`scale(1.12)`). Inaktive Spuren sind dezent gedimmt (`rgba(255, 255, 255, 0.35)`). Zuvor blockierte fest codiertes `stroke="white"` in den SVGs die Farb- und Kontrastunterscheidung.
      - **Exklusive Berücksichtigung der Spuren in eigener Fahrtrichtung (1-Spur-Erkennung)**:
        - Auf normalen Landstraßen und Stadtstraßen (`roadType === 'local'`) mit nur 1 Fahrspur in Fahrtrichtung wird ab sofort **genau 1 Spurpfeil** eingeblendet (`[ ↑ ]` geradeaus, `[ ↱ ]` rechts, `[ ↰ ]` links).
        - Der bisherige starre Fallback auf mindestens 2 Spuren (`currentLaneCount = 2`) wurde vollständig beseitigt. Gegenverkehrsspuren werden nicht mehr fälschlicherweise als zweite eigene Fahrspur gewertet.
        - `GameMapWidget` fragt die gerenderten Vektorkarten-Features der Straße (`roadType: 'freeway' | 'divided' | 'local'`) live an der Spielerposition ab und übergibt die exakte Straßenklasse an die Anweisungs-Engine.
      - **Tempolimit- & Geschwindigkeitsberücksichtigung**: `GameMapWidget` und `buildLanes` werten das aktuelle Tempolimit (`speedLimit`) und die Geschwindigkeit aus, um automatisch zwischen Autobahn-Spursituationen (3 Spuren) und Stadtstraßen (2–3 Spuren) zu unterscheiden.
    - **Fahrrichtungs-Disambiguierung (`playerHeading`)**: Bei mehrspurigen Autobahnen, Autobahnkreuzen und parallelen Auf-/Abfahrten verhindert der Abgleich mit der Fahrtrichtung ein fehlerhaftes Aufschalten auf die Gegenfahrbahn.
    - **Bereinigung der Karten-Overlays**: Weiße Abbiege-Kurven und Richtungspfeile werden nur noch an echten Manövern gezeichnet und überdecken nicht mehr normale Autobahnkurven.

## [1.7.12] - 2026-09-11

### CarPlay Visuals & Navigation ETA Calculation
  - **🟣 Lila Mitspielerfarben auf der CarPlay-Karte ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx), [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx))**:
    - **Lila/Violett Retina-Zugmaschinen-Icon**: Das Fahrzeug-Icon (`nearby_truck_ico`) für Mitspieler und Umgebungsverkehr erstrahlt nun im leuchtenden Lila/Violett-Design (`#a855f7` Leuchtring, `#7e22ce` Kabinenkörper, `#c084fc` Akzente/Spiegel, gerichteter Lichtkegel mit getönter Scheibe und Scheinwerfern).
    - **`nearbyVehicleColor`-Integration**: In `GameMapWidgetProps` integriert und auf allen CarPlay-Kartenansichten (Dashboard, maximierte Karte, Instrument-Cluster MFD) standardmäßig auf `#a855f7` gesetzt.
  - **⏱️ Korrektur & Stabilisierung der Ankunftszeit-Berechnung (ETA) ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Dynamischer Timescale für Stadtverkehr & Fernstraße**: Berücksichtigt den Stadtmaßstab von 1:3 in ETS2/ATS (bei Tempolimits ≤ 50 km/h) und 1:19/1:20 auf Autobahnen, wodurch Ankunftszeiten in Ortschaften nicht mehr auf 20 Sekunden kollabieren.
    - **Ruckel- und Sprungfreie ETA**: Berechnung basiert auf geglätteter Richtgeschwindigkeit statt schwankender Momentanwerte. Halten vor Ampeln oder Kurven führt nicht mehr zum Verschwinden (`--:--`) oder zu stundenlangen Sprüngen der ETA.
    - **Live-Zieldistanz bei manuellen Pins**: Die Distanz zählt bei gesetzten Zielmarkern (`customDest`) entlang der Route kontinuierlich herunter.
    - **Behebung des 4.000 km Bugs**: Saubere Einheitenumrechnung verhindert das fehlerhafte Anzeigen von Distanzen unter 5 km als Tausenderwerte.

## [1.7.11] - 2026-09-11

### Production Build & Startup Crash Fixes
  - **🛡️ ASAR-kompatible Ausführung der nativen Telemetrie-Bridge ([main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts), [package.json](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/package.json))**:
    - **Behebung des sofortigen Absturzes (`spawn ENOENT`)**: Windows kann Binärdateien (`opc-telemetry-bridge.exe`) nicht direkt aus dem gepackten `app.asar`-Archiv via `child_process.spawn` ausführen. Wenn die App als Portable-Build oder Setup gestartet wurde, brach `spawn` mit `ENOENT` ab und riss die Anwendung über den globalen `uncaughtException`-Handler sofort in den Shutdown.
    - **Automatische Extraktion & `asarUnpack`**: `package.json` entpackt `dist-electron/opc-telemetry-bridge.exe` und `dist-electron/telemetry-bridge.cs` nun automatisch via `asarUnpack` nach `app.asar.unpacked`. Sollte die Datei dennoch innerhalb des Archives angesprochen werden, extrahiert `main.ts` die Binärdaten sicher nach `userData/opc-telemetry-bridge.exe` auf die echte Festplatte.
    - **Robustes Error Handling & PowerShell-Fallback**: Auf den Telemetrie- und SMTC-Prozessen wurden `.on('error')`-Handler registriert, sodass Spawn-Fehler abgefangen werden und automatisch ein sicherer Fallback auf das bewährte PowerShell-Script erfolgt, statt die App zu beenden.
  - **🪟 Beseitigung von `ReferenceError: closeTachoWindow is not defined` ([main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**:
    - Im `win.on('closed')`-Handler wurde noch die veraltete Tacho-Funktion aufgerufen, die beim Schließen des Fensters einen zweiten fatalen Crash auslöste. Dies wurde auf `closeCarPlayWindow()` korrigiert.

## [1.7.10] - 2026-09-11

### Fixes & Navigation Enhancements (Unten-Links Karten-HUD)
  - **🧭 Vollständige Wiederherstellung des Unten-Links Navigations-HUDs ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Anzeige auf Home-Karten-Widget & maximierter Vollbild-Karte**: Das schwebende Navigations-HUD in der unteren linken Kartenecke wurde universell implementiert (`renderBottomNavHud`), sodass es sowohl auf dem CarPlay Home-Dashboard (`isHome = true`) als auch auf der Vollbild-Karte (`isHome = false`) sauber und reaktionsschnell zur Verfügung steht.
    - **Beseitigung der In-Game-Routen-Blockade**: Das HUD war zuvor an `(pendingDest || customDest)` gebunden und verhielt sich für normale ETS2/ATS-Frachten und In-Game GPS-Routen unsichtbar. Nun erkennt das HUD aktive Navigationsdaten (`telemetry.navDistance`, `telemetry.navTime`, `routeWaypoints`, `dest`) sofort und schaltet sich automatisch zu.
    - **Restkilometer-Anzeige (`formatDistance`)**: Exakte dynamische Distanzanzeige (in Metern unter 1.000 m, mit einer Dezimalstelle unter 10 km z. B. `3,4 km`, darüber in gerundeten Kilometern z. B. `142 km`).
    - **Reisezeit in Minuten / Stunden (`formatRemainingTime`)**: Intelligente Umrechnung der in SCS-Telemetriesekunden übertragenen Spielzeit auf reale Fahrzeit unter Berücksichtigung des ETS2/ATS-Map-Timescales (Faktor 19 bzw. 20). Saubere Formatierung als `X Std. Y Min.` bzw. `Y Min.` (in Apple CarPlay Signalgrün `#34d399`).
    - **Exakte Ankunfts-Uhrzeit (`formatETA`)**: Automatische Berechnung der voraussichtlichen realen Uhrzeit bei Ankunft (z. B. `Ankunft 19:45 Uhr`).
    - **Click-Event-Isolation (`stopPropagation`)**: Klicks auf Navigationselemente im Dashboard-Karten-Widget (wie Routenstart oder Abbrechen) lösen kein versehentliches Maximieren der Karte mehr aus.

## [1.7.9] - 2026-09-11

### Performance & Memory Optimization (RAM-Halbierung auf unter 300 MB)
  - **⚡ Native C# Standalone-Telemetrie-Bridge ([telemetry-bridge.cs](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/telemetry-bridge.cs), [main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**:
    - **Ablösung von `powershell.exe`**: Das Auslesen der Shared Memory Telemetrie (`Local\SCSTelemetry`, `Local\OPCRouteData`, `Local\OPCTrafficData`) wurde aus dem speicherhungrigen PowerShell-Runtime-Host (80–110 MB) in ein natives, kompaktes 13.8 KB C#-Kompilat (`opc-telemetry-bridge.exe`) überführt.
    - **Speichereinsparung**: Der Telemetrie-Bridge-Prozess verbraucht nun nur noch **~16 MB RAM** statt zuvor bis zu 110 MB (~85% Ersparnis).
    - **Zero Allocation JSON Engine**: Direkte String-Serialisierung via `StringBuilder` ohne PowerShell-Pipeline- und GC-Churn.
    - **Automatischer Windows-Compiler & Fallback**: Beim Start wird das Kompilat automatisch aus `telemetry-bridge.cs` via Microsoft .NET `csc.exe` erzeugt, inklusive sicherem PowerShell-Fallback bei fehlendem Compiler.
    - **Adaptives Polling**: Im Leerlauf bzw. bei nicht laufendem Spiel drosselt der Telemetrie-Loop automatisch von 30ms auf 800ms, wodurch unnötiger CPU- und Speicheroverhead vollständig eliminiert wird.
  - **🖥️ Chromium Renderer-Prozess-Sharing ([main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**:
    - **Bündelung via `disable-site-isolation-trials`**: Durch Deaktivierung der standardmäßigen Site-Isolation können Hauptfenster, CarPlay-Fenster und HUD-Overlay denselben Renderer-Prozess (`renderer-process-limit: 1`) und V8-Heap teilen, anstatt jeweils eigene 70–120 MB schwere Chromium-Prozesse zu reservieren.
    - **V8-Heap-Decke & Aggressive GC**: Herabsetzung von `--max-old-space-size=256` auf **128 MB** in Kombination mit `--optimize-for-size` und freigeschaltetem `--expose-gc`. Verhindert das Aufstauen toter ephemerer Objekte im JavaScript-Heap.
    - **Cache-Limits**: Festlegung von `--disk-cache-size=16777216` und `--media-cache-size=16777216` (16 MB) zur Vermeidung von unkontrolliertem In-Memory-Kachelgrowth.
  - **🧹 Aktives Windows Working-Set Trimming ([main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**:
    - **`trimAppMemory()` Integration**: Beim Minimieren von App-Fenstern, nach dem Schließen des Splash-Screens sowie periodisch alle 10 Minuten ruft Electron Windows `process.trimWorkingSet()` auf. Nicht mehr benötigte Speicherseiten werden sofort vom Betriebssystem freigegeben.
  - **🗺️ MapLibre GL Tile-Cache Begrenzung & Doppel-Mount-Schutz ([GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx), [CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx), [Map.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Map.tsx))**:
    - **Kachel-Cache Obergrenzen**: `maxTileCacheSize: 15` in `GameMapWidget.tsx` und Reduktion von 80 auf 25 in `Map.tsx` verhindert, dass unbegrenzt Hunderte dekodierte Raster-DEM- und Vektorkacheln im GPU/RAM gehalten werden.
    - **`fadeDuration: 0` & `collectResourceTiming: false`**: Beseitigt temporäre doppelte Texturspeicher während Kachelüberblendungen.
    - **CarPlay Doppel-WebGL-Schutz**: Das Home-Karten-Widget in `CarPlay.tsx` wird beim Öffnen von maximierten Vollbild-Modals (`maximizedWidget`) temporär ungemountet. Dadurch läuft zu jedem Zeitpunkt maximal **ein** WebGL-Kartenkontext gleichzeitig im Fenster.

## [1.7.8] - 2026-09-11

### Features & Innovations
  - **🧭 Echtzeit-Navigationsanweisungen & Kurvenanalyse für importierte In-Game-Routen ([navInstructionEngine.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/utils/navInstructionEngine.ts), [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx), [CarPlayNavOverlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/CarPlayNavOverlay.tsx))**:
    - **Behebung der Anweisungs-Blockade (`GameMapWidget.tsx`)**: Der Navigations-Guard blockierte die Anweisungserzeugung bisher mit `(!dest && !destCompany)`, falls keine offizielle Speditions-Frachtfahrt aktiv war (z. B. bei freier Fahrt, eigenem Wegpunkt-Pin oder TruckersMP-Navigation). Die Bedingung wurde korrigiert, sodass Anweisungen immer aktiv generiert werden, sobald Wegpunkte und Spielerkoordinaten vorliegen.
    - **Neuer Kurven- & Abbiege-Detektor mit 35m-Distanzfenster (`navInstructionEngine.ts`)**: Bisher wurden benachbarte Einzelknoten verglichen, was bei dichten ETS2-Splines (nur 5°-12° Knick pro Segment) fast alle Kurven übersehen hat. Die neue Funktion `extractTurnsFromRouteCoords` analysiert die Richtungsänderung über ein 35-Meter-Vorausschau- und Rückschaufenster und bündelt Kurvenzüge zuverlässig auf ihren Scheitelpunkt (Apex).
    - **Authentische CarPlay-Manöver & Countdown**: Dynamische Countdown-Texte ("Jetzt", "50 m", "120 m", "1.4 km"), präzise Abbiegehinweise ("Rechts abbiegen", "Scharf links abbiegen", "Ausfahrt rechts nehmen", "Wenden") und Fahrspur-Empfehlungen.
    - **Zielankunft & SubText**: Anzeige von "Ziel erreicht" bei Distanzen < 35m zum Routenende sowie Straßen- und Zielort-Untertitel (`subText`) im CarPlay-Overlay-Banner.
  - **🚚 Live TruckersMP Spieler- & Fahrzeugerkennung auf der CarPlay- & Overlay-Karte ([traffic.h](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/OPCGameBridge/OPCGameBridge/traffic.h), [traffic.cpp](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/OPCGameBridge/OPCGameBridge/traffic.cpp), [main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts), [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx), [CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Natives C++ Plugin Memory Scanning (`OPCGameBridge`)**: Neues `traffic`-Modul mit AOB-Signaturscan (`nearby_non_ai_vehicles` & `base_ctrl`), das die internen `game_physics_vehicle_u`- und `game_trailer_actor_u`-Objekte der Prism3D-Engine im Spielerspeicher vollkommen crashsicher (`__try/__except`) ausliest.
    - **Behebung der Struct-Auflösung (`traffic.cpp`)**: Die dynamische Fahrzeugliste `list_dyn_t` ist im `base_ctrl`-Objekt direkt eingebettet und kein Zeiger. Das fälschliche Auslesen via `readSafe` hatte die VTable als Pointer interpretiert, wodurch `count` immer 0 blieb. Dies wurde auf direkte Adressierung korrigiert inklusive Sentinel-Knoten-Absicherung.
    - **Shared Memory Puffer (`Local\OPCTrafficData`)**: Schreibt Koordinaten, Rotation, Bounding Box und Typen bis zu 50 umgebender Fahrzeuge mit bis zu 10 FPS in ein Memory-Mapped-File.
    - **Electron IPC Integration**: `main.ts` liest `Local\OPCTrafficData` über die PowerShell-.NET-Bridge aus und übergibt die `nearbyVehicles` mit jedem Telemetrie-Zyklus an das React-Frontend.
    - **Echtzeit-MapLibre-Visualisierung**: `GameMapWidget.tsx` projiziert die Spielkoordinaten latenzfrei auf WGS84-Kartenpositionen und rendert rotierende, hochauflösende Cyan-Truck- und Amber-Trailer-Icons inklusive exakter Fahrtrichtung (`heading`).

  - **⚡ Beseitigung von Rucklern & Perfomance-Optimierung im Karten- und Telemetrie-Loop ([GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx), [main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**:
    - **DOM-Churn im 60 FPS Render-Loop behoben (`GameMapWidget.tsx`)**: Das Spielerpfeil-Element wurde zuvor in jedem einzelnen `requestAnimationFrame`-Frame per `innerHTML` komplett neu geparst und zerstört. Das Pfeil-Element wird nun einmalig angelegt und nur noch über hardwarebeschleunigtes `style.transform` rotiert (Zero Allocation).
    - **GeoJSON-Drosselung für umgebende Fahrzeuge (`GameMapWidget.tsx`)**: `source.setData()` auf MapLibre wurde zuvor bis zu 25 Mal pro Sekunde bei jedem Telemetrie-Paket ausgelöst, was die WebGL-Tessellierung überlastete. Dies wurde auf 10 Hz (100ms) gedrosselt.
    - **Routen-Polyline Memoization (`GameMapWidget.tsx`)**: Die bis zu 2000 Routen-Wegpunkte werden nun gehasht und nur dann neu projiziert und als LineString in WebGL hochgeladen, wenn sich die Route tatsächlich verändert hat (statt 25x/Sekunde).
    - **Persistente MMF-Handles & Sequenzprüfung (`main.ts`)**: `Local\OPCRouteData` und `Local\OPCTrafficData` werden in C# nicht mehr bei jedem 40ms-Tick neu geöffnet und disposed, sondern persistent gehalten. Unveränderte Wegpunkte werden in PowerShell nicht mehr redundant in 60KB große JSON-Strings serialisiert.

  - **🗺️ Native In-Game GPS-Routenextraktion direkt aus dem Spielspeicher (ETS2LA-Methode) ([routedata.h](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/OPCGameBridge/OPCGameBridge/routedata.h), [routedata.cpp](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/OPCGameBridge/OPCGameBridge/routedata.cpp), [config.h](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/OPCGameBridge/OPCGameBridge/config.h), [OPCGameBridge.ini](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/OPCGameBridge/OPCGameBridge/OPCGameBridge.ini))**:
    - **Direktes Auslesen der Spiel-GPS-Route**: Implementierung der Signatur- und Objektketten-Struktur aus *ETS2LA (Euro Truck Simulator 2 Lane Assist)*. Die aktive Route muss von der App nicht mehr ungenau selbst berechnet werden, sondern wird 1:1 direkt aus der internen Navigation der Prism3D-Engine (`game_ctrl` -> `gps_manager_t` -> `simple_route_source` -> `route_task` -> `physical_route_items`) ausgelesen.
    - **AOB Signatur-Scanning**: Dynamisches Lokalisieren der `base_ctrl`-Instanz und des `gps_manager`-Offsets (`48 8d 88 ? ? ? ? 48 85 c9 74 ? 48 8b 01 48 8d 54`) für ETS2 1.50+ / 1.51+.
    - **Präzise Koordinatenumrechnung & Subsampling**: Auslesen der exakten Wegpunkt-Knoten (`node_item_t.coords / 256.0f`). Bei langen Routen mit tausenden Abschnitten werden die Knoten gleichmäßig auf 2.000 Punkte interpoliert, sodass auch transkontinentale Strecken unterbrechungsfrei in voller Länge dargestellt werden.
    - **Automatisches Umschalten im Frontend**: `GameMapWidget.tsx` erkennt die ausgelesene Spielroute automatisch (`routeWaypoints`), schaltet den clientseitigen Pathfinder komplett ab und rendert den originalen Pfad des Spiels.

## [1.7.7] - 2026-08-30

### Features & Bugfixes
  - **🔔 Lückenlose Übermittlung von Fracht- & Routendaten beim Job-Abschluss ([main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**:
    - **Self-Contained Delivery Payload**: Der POST-Body für `event == "delivered"` enthält nun explizit `cargo`, `source_city`, `destination_city`, `source_company` und `destination_company`.
    - **Sichere Webhook-Auslösung**: Stellt sicher, dass das Backend den BotGhost / Discord Webhook auch dann sofort und vollständig auslöst, wenn die Telemetrie-Sitzung zuvor unterbrochen war.

## [1.7.6] - 2026-08-29

### Features & Bugfixes
  - **🚦 Ampel-Filterung auf echte Straßenkreuzungen ([map.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/maps-main/packages/clis/generator/geo-json/map.ts))**:
    - **Ausschluss von Nicht-Kreuzungs-Prefabs**: Ampeln (`trafficlight`) werden nun nicht mehr fälschlicherweise an Tankstellen (Einfahrtslichter), Mautstellen (Schranken-Lichter), Grenzkontrollen, Bahnübergängen (Blinker über dem Andreaskreuz), Häfen oder Betriebshöfen platziert.
    - **Reine Kreuzungsampeln**: Lichtsignalanlagen werden ausschließlich an echten Straßenkreuzungen, Gabelungen und Einmündungen (`/cross/`, `/junction/`, `/roundabout/`) generiert.

## [1.7.5] - 2026-08-29

### Features & Design Updates
  - **🛑 Klares STOP-Schild & authentisches Andreaskreuz (VZ 201) ([generate_perfect_signs.py](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/maps-main/generate_perfect_signs.py), [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx), [upload_sprites.ps1](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/upload_sprites.ps1))**:
    - **Authentisches VZ 201 Andreaskreuz**: Komplett überarbeitetes, freistehendes Andreaskreuz mit breiten weißen Balken, markanten signalroten Spitzen (`#dc2626`), subtilem Drop Shadow und feiner dunkler Kontur (ohne überladene Gleisleitern oder dunkle Kreisgehäuse).
    - **Originalgetreues VZ 206 STOP-Schild**: Rotes Achteck mit präziser weißer Innenkontur und massivem, fettem, zentriertem weißem **`STOP`**-Schriftzug (ohne störende Pillenboxen).
    - **Cloudflare R2 Deployment**: Sämtliche Sprite-Atlanten wurden erfolgreich auf Cloudflare R2 (`open-pipe-club-storage`) aktualisiert.

## [1.7.4] - 2026-08-29

### Features & Design Updates
  - **🚚 100% originale In-Game Firmenlogos aus ETS2 extrahiert & hochgeladen ([restore_game_companies_keep_modern_pois.py](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/maps-main/restore_game_companies_keep_modern_pois.py), [upload_sprites.ps1](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/upload_sprites.ps1))**:
    - **Originale SCS-Spieldateien**: Sämtliche 389 originalen Firmen- und Speditionslogos wurden direkt über den Game-Parser aus der lokalen Euro Truck Simulator 2 Installation (`base.scs`, `def.scs` und DLC-Archiven) unverändert 1:1 extrahiert und in den Sprite-Atlas integriert.
    - **Moderne POIs & Autobahnschilder**: Alle 23 POI-Icons (Andreaskreuz, Blitzer, Ampeln, Werkstätten etc.) sowie die 983 Autobahnschilder bleiben in gestochen scharfer Vektorqualität erhalten.
    - **Cloudflare R2 Deployment**: Die neu gepackten Atlanten wurden erfolgreich auf Cloudflare R2 (`map/` & `map_cache/`) hochgeladen und live geschaltet.

## [1.7.3] - 2026-08-29

### Features & Design Updates
  - **🎨 Vollständiges Redesign & Neugenerierung aller Map-Sprites ([generate_modern_sprites.py](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/maps-main/generate_modern_sprites.py), [pack_sprites.py](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/maps-main/pack_sprites.py), [upload_sprites.ps1](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/upload_sprites.ps1))**:
    - **1.395 Icons komplett neu gerendert**: Alle POI-Symbole (Tankstellen, Werkstätten, LKW-Händler, Rastplätze, Garagen, Arbeitsagenturen, Mautstellen, Grenzkontrollen, Fahrzeugwaagen, Fotospots, Aussichtspunkte, Züge, Fähren, Ampeln, Radarfallen, Baustellen, Stoppschilder, Andreaskreuze, Richtungspfeile und Map-Knoten) wurden in 4K-Supersampling (256x256 -> 48x48 Lanczos) neu gezeichnet.
    - **Cloudflare R2 Deployment**: Sämtliche Sprite-Atlanten (`sprites.json`, `sprites.png`, `sprites@2x.json`, `sprites@2x.png`) wurden erfolgreich in `open-pipe-club-storage` (`map/` & `map_cache/`) aktualisiert und stehen live zur Verfügung.

## [1.7.2] - 2026-08-29

### Features & Design Updates
  - **📷 Feste Geschwindigkeitsblitzer & Radar-Warnsystem ([ets2Speedcams.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/data/ets2Speedcams.ts), [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx), [CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx), [Map.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Map.tsx))**:
    - **100% Exakte Straßen-Snapping-Positionierung aus `ets2.geojson`**: Die Blitzer-Positionen wurden direkt aus den echten Vektorknoten der gerenderten Straßengeometrie (`ets2.geojson`, 859.994 Vektorknoten via Spatial-KDTree) extrahiert. Beseitigt jeden Versatz neben der Fahrbahn – alle Blitzer sitzen nun exakt und kompromisslos auf den Linien der Straßenkarte.
    - **Reale ETS2-Blitzerpunkte in ganz Europa**: Strukturierter Datensatz fester Radarfallen und Geschwindigkeitsüberwachungen (Deutschland, Frankreich, UK, Italien, Österreich, Schweiz, Polen, Benelux, Skandinavien, Spanien, etc.) mit exakten Koordinaten, Streckenbezeichnungen und Tempolimits.
    - **Neues Modernes Blitzer-Icon (`speedcam_ico`)**: Signalrotes Verkehrs-Warnbadge mit hochauflösender Kamera-Silhouette, Radar-Impulswellen und Strobe-Flash-Sensor.
    - **Tempolimit-Badges auf der Karte**: Automatische Anzeige der erlaubten Höchstgeschwindigkeit (z. B. 50, 60, 80, 100, 120 km/h) direkt am Blitzer-Marker bei näherem Zoom.
    - **CarPlay Annäherungs- & Geschwindigkeitswarnung**: Bei Annäherung an einen Blitzer (<750m) blendet CarPlay automatisch ein dezentes oder bei Überschreitung ein pulsierendes Warn-HUD ein (*„⚠️ Blitzer in 350m – Tempolimit 80 km/h“*).
    - **Interaktiver Ebenen-Schalter**: Neuer Schnellschalter „Blitzer“ im Dropdown-Menü „Ebenen & Filter“ zum einfachen Ein- und Ausblenden.
  - **🏎️ Butterweiche 60 FPS CarPlay-Kartenbewegung (Subpixel LERP Interpolation)**:
    - **Entkoppelte `requestAnimationFrame`-Schleife**: Telemetrie-Events aktualisieren fortan nur noch Zielkoordinaten und Zielwinkel, während der WebGL-Renderloop mit vollen 60–120 FPS kontinuierlich interpoliert.
    - **Beseitigung aller Mikroruckler**: Subpixel-LERP-Glättung und kürzester Winkelweg (`shortestAngleDelta`) sorgen für fließendes Gleiten und geschmeidige Kurvendrehungen beim Fahren ohne stufenweises Ruckeln.

## [1.7.1] - 2026-08-24

### Features & Design Updates
  - **Bereinigung der Dashboard-Aktionsleiste ([Dashboard.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Dashboard.tsx) / [MgmtHomePage.js](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/frontend/src/drivershub/pages/MgmtHomePage.js))**:
    - **Entfernung des Datenbank-Buttons**: Der Schnellzugriffs-Button „Datenbank“ sowie der ungenutzte `Database`-Icon-Import wurden sowohl von der App-Dashboard-Seite als auch von der Website (DriversHub `MgmtHomePage.js`) entfernt.
  - **Skalierung der Admin-Tabbar & Navbar-Header (`Admin.tsx` / `App.tsx`)**:
    - **Responsive Admin-Navigationsleiste**: Die Tableiste auf der Admin-Seite (`Admin.tsx`) schaltet nun auf kleineren Fenstern (<768px) automatisch auf Icon-Buttons um (analog zur App-Navbar) und zeigt Beschriftungen auf größeren Bildschirmbreiten (`md:`) an. Verhindert das Abschneiden der Buttons (z. B. „Berichte“).
    - **Früheres Ausblenden des Benutzernamens in der Header-Bar**: Die Breakpoint-Klasse des Benutzernamens in der Hauptheader-Bar (`App.tsx`) wurde von `hidden sm:inline` auf `hidden xl:inline` angepasst. Der Name („Niconoop“) blendet nun bei schmaleren Fenstern frühzeitig aus, sodass nur das Profilbild sichtbar bleibt und der Header nicht mehr überfüllt wird.
  - **Behebung der Einladungscode-Erstellung (`server.py` / `routes_content.py` / `InviteCodes.tsx`)**:
    - **404 Route Mismatch Fix**: Aktualisierung des Backends (`server.py`), sodass `/api/management/invite-codes` und `/api/admin/invite-codes` neben `/api/invite-codes` voll unterstützt werden. Behebt den `Fehler beim Generieren` (404 Not Found) beim Erstellen neuer Einladungscodes in der Desktop-App.
    - **Anzeige eingelöster Mitglieder**: `invite_codes_list` löst nun automatisch die User-IDs eingelöster Codes in richtige Benutzernamen (`used_by_name`) auf und setzt das `used`-Flag sauber.
    - **Automatische Registrierungs-Codes bei Bewerbungen**: Beim Annehmen einer Bewerbung in `applications_handle` wird der erzeugte Einladungscode jetzt auch direkt in der `invite_codes`-Datenbanktabelle registriert.
  - **Koppelung & Synchronisation des CarPlay Karten-Zooms (`CarPlay.tsx` / `GameMapWidget.tsx` / `OverlaySettings.tsx`)**:
    - **Light Mode für Lokale Musik & Radio-Subtabs**: Vollständige Anbindung des Quellauswahl-Landungsmenüs, der lokalen Musik-Player-Ansicht und der ETS2 Live-Radio-Stream-Seite an das dynamische Themesystem (`c.card`, `c.innerCard`, `c.subBox`, `c.headingText`, `c.mutedText`) in `CarPlay.tsx`.
    - **Fix des Karten-Canvas-Überstands**: Überarbeitung der CSS-Regeln in `GameMapWidget.tsx` (`border-radius: inherit`, `overflow: hidden !important` & `isolation: isolate`) sowie Anpassen der Container-Wrapper in `CarPlay.tsx`. Verhindert das Überstehen der MapLibre WebGL-Canvas-Fliesen an den abgerundeten Karten-Ecken.
    - **Entfernung der Radio-Lade-Benachrichtigung**: Das automatische Einblenden der Benachrichtigungs-Toast-Meldung beim Auslesen der `live_streams.sii` Radiosender beim Start wurde entfernt.
    - **Fix des Coverbild-Überstands**: Hinzufügen von `overflow-hidden` und `rounded-[inherit]` auf den Media-Player-Container und das Hintergrund-Coverbild in `CarPlay.tsx`. Verhindert das Überstehen des Albumcovers an den abgerundeten Ecken des Karten-Containers.
    - **Vollständige Theme-Übertragung auf alle Tabs & Cards**: Bei Auswahl des hellen (oder blauen / titan) Themes passen sich nun alle Inhaltskarten (Media-Widget, Digital Cockpit, Auftrag, LKW-Diagnose, Einstellungen & Musik-Subtabs) dynamisch an das gewählte Theme an (`c.card`, `c.innerCard`, `c.headingText`), anstelle von nur der Seitenleiste.
    - **Tiefschwarze CarPlay-Rahmen-Ecken**: Durch Hinzufügen von `html, body, #root { background: #000000 !important; }` und Einbetten in einen Vollbild-`bg-black`-Container sind die 4 äußeren Ecken des CarPlay-Displays nun zu 100% tiefschwarz. Keine weißen Pixel stehen mehr an den abgerundeten Ecken über.
    - **Dauerhafte Ansicht des Musik-Player-Subtabs**: Beim Wechseln zwischen den Tabs (z. B. von Musik zu Home und zurück zu Musik) bleibt nun deine zuletzt aktive Musikseite (z. B. Windows SMTC Player) geöffnet, anstatt zurück ins Quellauswahl-Menü zu springen. Der Subtab wird zusätzlich in `localStorage` (`opc_carplay_music_subtab`) gespeichert.
    - **Synchronisierter Karten-Zoom**: Einführung des zentralen States `carPlayMapZoom` in `CarPlay.tsx`, der die Zoom-Stufen aller CarPlay-Kartenansichten (`carplay-home`, `carplay-max` und `tacho-mfd-map`) verkoppelt. Jede Zoom-Änderung (per Mausrad, Touch, Buttons oder Hotkeys) wird in Echtzeit auf alle Ansichten übertragen.
    - **Direktes Laden des Start-Zooms**: Übernahme von `currentZoomRef.current` direkt beim Erstellen der MapLibre-Instanz (`zoom: currentZoomRef.current`). Verhindert ein nachträgliches Ruckeln/Umschalten von Zoom 9 auf den gespeicherten Zoom.
    - **Dauerhafte Speicherung**: Speicherung des aktiven CarPlay Zoom-Levels in `localStorage` (`opc_carplay_map_zoom`), sodass die Karte nach jedem Start sofort in deiner gewünschten Zoom-Stufe geladen wird.
    - **Interaktive Zoom-Steuerungs-Buttons (`+` / `-`)**: Ergänzung von schwebenden Zoom-In (`+`) und Zoom-Out (`-`) Buttons im CarPlay-Design direkt in der Steuerungsleiste des `GameMapWidget.tsx`.
    - **Vereinheitlichte Hotkey-Zoomsteuerung**: Anpassung der Tastatur- und Controller-Hotkeys (`Pfeil hoch` / `Pfeil runter`), um den gekoppelten Zoom-Level stufenlos zwischen 4x und 12x anzupassen.

## [1.6.9] - 2026-08-23

### Features & Design Updates
  - **Entfernung der Ampeln & Blitzer Ebenen (`Map.tsx` / `GameMapWidget.tsx` / `MgmtMapPage.js`)**:
    - **Bereinigung**: Die zusätzlichen Layer für Ampeln und Blitzer wurden vollständig entfernt.
    - **Bugfix `setTrafficLoading`**: Der State `trafficLoading` wurde in `Map.tsx` wiederhergestellt. Die Abfrage von Live-Staudaten und Hotspots läuft wieder ohne Uncaught ReferenceError.
  - **Interaktives 3D-Gebäude- & Perspektiven-Feature (`Map.tsx` / `GameMapWidget.tsx` / `MgmtMapPage.js`)**:
    - **CarPlay Navigation Map 3D-Gebäude**: Das `ets2-footprints.pmtiles`-Vektorarchiv und die `ets2-extrusions`-3D-Layer wurden auch in das CarPlay Navigationskarten-Widget (`GameMapWidget.tsx`) eingebaut. Sämtliche Gebäude, Werkstätten, Depots und Stadtbereiche erscheinen nun während der Fahrt in 3D mit `60°` Kamera-Neigung.
    - **Behebung des 500/400er Fehlers & Direkte Byte-Range-Anfragen**: Die PMTiles-Archive (`ets2-footprints.pmtiles`, `ets2.pmtiles`, `world.pmtiles`) wurden im Backend (`routes_desktop.py`) freigeschaltet und direkt an den CDN-Endpunkt angebunden. Dies erlaubt native HTTP 206 Partial-Content-Range-Requests.
    - **3D View Toggle Button**: Ein interaktiver `3D`-Button in der Karten-Schaltleiste ermöglicht das fließende Umschalten zwischen flacher 2D-Draufsicht (`pitch: 0°`) und isometrischer 3D-Perspektive (`pitch: 58°`).
    - **Freie 3D-Kamerasteuerung**: Unterstützung für freie Drehung & Neigung per Maustaste (`maxPitch: 80°`) inkl. visuellem Kompass.
  - **CarPlay Darkmode Karten-Design für App & Website (`Map.tsx`)**:
    - Das edle, kontrastreiche CarPlay Darkmode Kartendesign wurde für die interaktive Hauptkarte in der App und auf der Webseite übernommen.
    - Beinhaltet neonblaue Autobahnen (`#3b82f6` / `#1d4ed8`), helle Slate-Schnellstraßen (`#cbd5e1`), tiefenblaue Gewässer (`#0f1c30`), edles Dunkelgrün für Terrain (`#0e261d`), Slate-Asphalt für Betriebshöfe (`#1e293b`), 3D-Gebäude-Extrusionen und einen Midnight-Hintergrund (`#050508`).

### Bugfixes & Stabilität
  - **Behebung von `ReferenceError: API_URL is not defined` (`App.tsx`)**:
    - Der Import von `API_URL` aus `./config` in `App.tsx` gefehlt. Dadurch schlug der automatische Backend-Server Health Check beim Anwendungsstart mit einem unhandled promise error fehl. `API_URL` wurde zum Import hinzugefügt.

## [1.6.4] - 2026-08-22

### Umstellung auf Cloudflare R2 Speicher
  - **Neues Upload-Skript (`app_upload.bat` / `upload_release.ps1`)**:
    - Der Release-Prozess lädt Binärdateien (`setup.exe`, `portable.exe`) und das Manifest (`latest.json`) direkt in den Cloudflare R2 Bucket `open-pipe-club-storage` hoch.
    - Die Abhängigkeit von GitHub Personal Access Tokens (PAT) und GitHub Release Assets wurde entfernt.
  - **Exklusiver Cloudflare R2 Auto-Updater (`main.ts`)**:
    - `check-app-update` und `install-app-update` wurden umgestellt, sodass App-Updates ausschließlich über den Cloudflare R2 Backend-Endpunkt abgerufen und heruntergeladen werden.
    - Der vorherige GitHub API Fallback wurde entfernt.
  - **⚡ Drastische Build- & Dateigrößen-Optimierung**:
    - Der redundant doppelte 627 MB große Ordner `public/maps-data/` wurde aus der App entfernt (die Kartendaten werden zur Laufzeit aus dem lokalen Dokumente-Ordner oder per Backend-Proxy geladen).
    - `vite build` wurde von ca. 45 Sekunden auf **3,26 Sekunden** beschleunigt.
    - Die Dateigröße der `Setup.exe` wurde von **244 MB auf 114 MB um mehr als 53% reduziert**.
  - **🔧 Behebung der R2-Update-Erkennung & Auto-Logout bei abgelaufenem Token**:
    - `UTF-8 BOM Behebung`: Der Cloudflare Worker decodiert `latest.json` jetzt mit `utf-8-sig`, um den UTF-8-BOM-Header von PowerShell zu verarbeiten. `upload_release.ps1` schreibt `latest.json` nun ohne BOM.
    - `Cache-Busting`: In `electron/main.ts` und dem Worker wurden Cache-Busting-Zeitstempel (`?t=...`) und `no-cache`-Header hinzugefügt, damit neu hochgeladene R2-Releases sofort und ohne CDN-Verzögerung von allen App-Clients erkannt werden.
    - `401 Unauthorized Interceptor`: In `services/api.ts` wurde ein Axios-Interceptor integriert, der abgelaufene JWT-Tokens bei HTTP 401 automatisch entfernt und erneute Fehlermeldungen verhindert.
  - **🌐 Eigene Domain-Download-URLs**:
    - App-Downloads sind jetzt direkt über `https://openpipeclub.com/download/setup.exe` und `https://openpipeclub.com/download/portable.exe` erreichbar.
  - **💬 Sofortige Namensanzeige bei neuen Chats & Behebung der Gruppen-Einstellungen**:
    - `Chat.tsx` löst beim Starten eines Direktchats den Fahrernamen und das Profilbild sofort lokal und im Backend auf, sodass nicht mehr "Fahrer" angezeigt wird und die Chat-Seite nicht mehr neu geladen werden muss.
    - `Gruppen-Einstellungen & Button-Sichtbarkeit`: Der Pfad zum Speichern der Option ("nur Ersteller kann Mitglieder hinzufügen") wurde korrigiert und der "Mitglieder hinzufügen"-Button in `Chat.tsx` mit der `canAddMembers`-Bedingung verknüpft, sodass er für normale Mitglieder ausgeblendet wird, wenn die Option aktiv ist.
  - **🛠️ Fehlertoleranter Uploader**:
    - `upload_release.ps1` bricht bei fehlendem oder nicht übereinstimmendem Changelog-Eintrag nicht mehr ab, sondern gibt eine Warnung aus und nutzt automatisch den Standard-Changelog `"Bugfixes und Performance-Optimierungen."`.

## [1.5.1] - 2026-08-21

### Hinzugefügt & Verbessert
  - **Entfernung von "Links halten" & "Spur wechseln" (`navInstructionEngine.ts`)**:
    - Die Anweisungen "Auf die linke Spur wechseln" und "Links halten" wurden vollständig entfernt und durch die klare Anweisung **`Geradeaus weiterfahren`** ersetzt.
  - **Behebung falscher Abbiegepunkte & Pfeil-Spam auf Autobahnkreuzen (`route-service.ts` & `GameMapWidget.tsx`)**:
    - **75-Meter-Abstandsschwelle**: Der Mindestabstand zwischen aufeinanderfolgenden Abbiegepunkten wurde auf 75 Meter angehoben. Dadurch erzeugen Kleeblatt-Schleifen, Autobahnkreuze und Ausfahrtsschleifen keine mehrfachen, fehlerhaften Abbiegeanweisungen mehr hintereinander.
    - **Saubere, durchgehende Routenführung**: Die störenden weißen Linienstücke und Pfeilspitzen auf der Karte (`route-turn-curves` & `route-turn-tips`) wurden entfernt. Die Navigationsroute wird nun als durchgehende, elegante violette Linie dargestellt.
    - **Präzise Spuranzeige**: Überarbeitung der Spurberechnung (`navInstructionEngine.ts`) für exakte Fahrspurzuordnungen bei Abbiegungen, Autobahnausfahrten und Auffahrten.
  - **Deutliche Hervorhebung von Parkplätzen & Raststätten (`GameMapWidget.tsx`)**:
    - **Dark Mode**: Parkplatz- und Raststättenflächen (`color 0`), Autohöfe sowie LKW-Verladestationen (`color 2`) wurden von Schwarz (`#000000`) auf einen kontrastreichen Asphalt-Farbton (`#1e293b` / `#283548`) angehoben und heben sich nun perfekt vom tiefdunklen Kartenhintergrund ab.
    - **Light Mode**: Park- und Geländeflächen wurden mit Slate-300 (`#cbd5e1`) deutlich abgegrenzt.
  - **Farbabstimmung des Navigationsfeldes (`CarPlayNavOverlay.tsx`)**:
    - **Vorschau-Feld ("Dann")**: Verwendet nun exakt denselben Königsblau-Farbton (`#1d4ed8`) wie das obere Hauptanweisungsfeld.
    - **Fahrspur-Pfeile unten**: Der Fahrspur-Unterbereich hat nun das elegante, abgedunkelte Navy-Blau (`#0e1833`).
  - **Einbindung von Gebäudemodellen & 3D-Strukturen am Straßenrand (`GameMapWidget.tsx`)**:
    - Hinzufügen der `ets2-models`-Ebene aus den Truckermudgeon PMTiles (`fill-extrusion`).
    - Häuser, Firmengebäude, Tankstellen und Gebäudestrukturen am Straßenrand werden nun ab Zoomstufe 7 als stilvolle 3D-Extrusionen / Footprints auf der Karte dargestellt.
  - **Verschönerung der PMTiles-Kartenkachel-Darstellung (`GameMapWidget.tsx`)**:
    - **Vermeidung von Lücken an Kreuzungen**: Hinzufügen einer unterlagerten Straßenbetten-Schicht (`ets2-roads-casing`) unter allen Straßen.
    - **Farbliche Abstimmung der Prefabs**: Die Junction- und Prefab-Polygone (`ets2-prefabs`) wurden farblich exakt an das Asphalt-Fahrbetonbett angepasst (`#1e293b`), wodurch schwarze Lücken und harte Abrisskanten an Kreuzungen und Autobahnausfahrten vollständig verschwinden.
    - **Runde Ecken & Kanten**: `line-cap: round` und `line-join: round` sorgen für flüssige, hochaufgelöste Straßenverläufe ohne Polygonknicke.
  - **Bereinigung der Karten-Pfeilmarkierungen (`GameMapWidget.tsx`)**:
    - Abbiegepfeile (Chevrons) und weiße Kurvenmarkierungen auf der Karte werden nun mit Mindestabstand platziert.
    - Die Überlappung und das "Spammen" von weißen Pfeilen entlang von Straßenkurven und Ausfahrten wurde vollständig beseitigt.
  - **Perfektionierte Abbiegeerkennung via Entscheidungs-Vektor-Methode (`route-service.ts`)**:
    - An allen Kreuzungen und Verzweigungen werden nun **alle physikalisch abgehenden Vektoren** analysiert.
    - Wenn die Route dem Geradeaus-Pfad folgt (`isTakingStraightPath`), wird garantiert **kein falsches Abbiegemanöver** mehr ausgelöst (selbst bei abknickenden Straßen).
    - Abbiegeanweisungen entstehen jetzt **ausschließlich dann**, wenn die Route aktiv auf eine abzweigende Straße, eine Ausfahrt oder einen Kreisverkehr wechselt.
  - **Neues, blickdichtes Navigations-Anweisungsfeld (`CarPlayNavOverlay.tsx`)**:
    - Das Navigationsanweisungsbanner (`#cp-carplay-nav-banner`) ist nun **100% blickdicht** mit tiefschwarzem Hintergrund (`#090d16`), 2px Accent-Border und erhöhter Lesbarkeit.
    - Das Manöver-Icon ist jetzt in einem **farblich hervorgehobenen, deckenden Container** platziert (Smaragdgrün `#059669` für Abbiegungen, Ozeanblau `#2563eb` für Ausfahrten, Bernstein `#d97706` für Kreisverkehre).
  - **Sofortiger CarPlay Blackout-Modus via Hotkey (`main.ts` & `CarPlay.tsx`)**:
    - Das Drücken des CarPlay Toggle-Hotkeys (z.B. `F9`) schaltet das CarPlay-Fenster augenblicklich auf ein 100% Schwarzbild (`#000000`) um (**0ms Reaktivierung**).
  - **CarPlay Ladebildschirm auf reinem Schwarzbild (`CarPlay.tsx` & `index.css`)**:
    - Beim ersten Aufruf sowie beim **Wiedereinblenden aus dem Schwarzbild-Modus** wird nun der stilvolle Apple CarPlay / OPC Ladebildschirm ("CarPlay wird gestartet...") auf **100% tiefschwarzem Hintergrund (`#000000`)** ohne Transparenz oder Durchscheinen eingeblendet.

## [1.2.1] - 2026-08-21

### Behoben
  - **Parkflächen im Light Mode der Karte (`GameMapWidget.tsx`)**:
    - Die `ets2-areas` Layer (Parkplätze, Bodenflächen) wurden im Light Mode nicht aktualisiert und blieben schwarz (#000000–#050508) auf hellem Hintergrund.
    - Neue Light-Mode-Farbzuordnung: Parkflächen → Slate-200 (#e2e8f0), Bodenflächen → Slate-100 (#f1f5f9), dunklere Bereiche → Slate-300 (#cbd5e1).
    - Zusätzlich werden jetzt auch Ländergrenzen, Bundesländergrenzen und Städte-Labels im Light Mode korrekt angepasst.
  - **„Route starten"-Button per Hotkeys nicht erreichbar (`CarPlay.tsx`)**:
    - Wenn ein Ziel ausgewählt (pendingDest) und die Karte maximiert war, konnte der „Route starten"-Button unten nicht per Tastatur (Enter/Pfeiltaste nach unten) ausgelöst werden.
    - Enter und Pfeiltaste nach unten auf der maximierten Karte starten jetzt die Route, wenn ein Ziel ausgewählt ist.

### Verbessert
  - **Spieler-Pfeil auf der Karte vergrößert (`GameMapWidget.tsx`)**:
    - SVG-Größe von 40×40px auf 56×56px erhöht für bessere Sichtbarkeit.
    - Glow-Effekt verstärkt (drop-shadow 10px→14px, 4px→6px).
  - **Straßen auf der Karte breiter (`GameMapWidget.tsx`)**:
    - Zoom 3: 0.5px → 2px, Zoom 6: 1.5px → 5px, Zoom 10: 3px → 9px.
    - Straßen sind jetzt bei allen Zoomstufen deutlich besser erkennbar.

## [1.2.0] - 2026-08-01

### Hinzugefügt
  - **Dual-Check für echte Kreuzungen & Ausschluss von Straßenkurven-Prefabs (`route-service.ts`)**:
    - `classifyPrefabPath` klassifiziert normale Straßenkurven-Prefabs (`hw1_`, `hw2_`, `r2_curve` etc.) jetzt explizit als `'road'` (keine Abbiegung oder Ausfahrt).
    - Es wird nun zusätzlich die **Graph-Knoten-Konnektivität** geprüft: Nur Knoten mit mindestens 3 Abzweigungen (echte T-Kreuzungen/Kreuzungen/Ausfahrtsrampen) oder echte Abbiege-Prefabs werden als Abbiegemanöver wargenommen.
    - Geradeausfahrten über Kreuzungen (`deltaDeg < 8°`) und normale Straßenkurven werden nun zu **100% als durchgehende Straße erkannt**.
  - **Ausschließliche Pfeilanzeige bei echten Abbiegemanövern (`route-service.ts` & `GameMapWidget.tsx`)**:
    - Das Überfahren einer Kreuzung geradeaus (`deltaDeg < 8°`) wird **nicht mehr als Manöverpunkt erfasst**.
    - Karten-Abbiegepfeile und Navigationsanweisungen werden **ausschließlich dann angezeigt, wenn man an einer Kreuzung tatsächlich abbiegen muss** (`≥ 8°`), eine Autobahnausfahrt nimmt oder in einen Kreisverkehr einfährt.
  - **Korrektur eines Laufzeitfehlers im Routenrechner (`route-service.ts`)**:
    - Der `ReferenceError: isPrefabJunction is not defined` beim Berechnen von Routen wurde behoben.
    - `isPrefabJunction` wird wieder vor der Ausfahrts- und Abbiegeprüfung ordnungsgemäß deklariert.
  - **Vollständige Eliminierung normaler Straßenkurven aus der Abbiege-Logik (`route-service.ts` & `navInstructionEngine.ts`)**:
    - Der Schwellenwert in `isSignificantTurn` wurde korrigiert: Normale Straßenkurven und Serpentinen (unter 28°) auf durchgehenden Straßen erzeugen **keine Abbiege-Manöverpunkte mehr**.
    - Abbiegeanweisungen (`Links/Rechts abbiegen`) werden **ausschließlich an echten Prefab-Kreuzungen**, Autobahn-Ausfahrtsrampen oder 90°-Abzweigungen ausgelöst.
    - Bei allen normalen Kurven zeigt das Navigationsbanner zuverlässig **`Geradeaus weiterfahren`** an.
    - Das winkelbasierte Fallback für Kartenpfeile auf der Routenlinie wurde entfernt.
    - Weiße Abbiegepfeile auf der blaue Routenlinie werden **ausschließlich an echten Kreuzungen, Ausfahrtsrampen und Kreisverkehren** aus den JSON-Kartendaten gerendert. Straßenkurven und Serpentinen enthalten keine Kartenpfeile mehr.
  - **Präzise Sprach-/Textanweisungen (`navInstructionEngine.ts`)**:
    - Beim Verbleiben auf der Autobahn oder Einordnen nach links lautet die Anweisung nun korrekt **`Auf die linke Spur wechseln`** statt fälschlicherweise `Ausfahrt links nehmen`.
    - `Ausfahrt rechts nehmen` wird exakt für rechte Autobahn-Ausfahrtsrampen verwendet.
    - Ein Flag `isRouteStoppedRef` verhindert zuverlässig, dass der kontinuierliche Telemetrie-Update-Loop die Route nach dem Abbrechen wieder neu zeichnet.
    - `clearRoute()` leert sofort alle GeoJSON-Sammlungen (`line`, `turns`, `turnTips`) und bereinigt direkt die MapLibre-GL-Datenquellen (`route-remaining`, `route-turns`, `route-turn-tips`).
    - Das CarPlay-Navigationsbanner und die Routenlinie auf der Karte verschwinden beim Stoppen unverzüglich.
  - **Exakte Prefab-Klassifizierung aus `europe-prefabs.json` & `europe-prefabDescriptions.json` (`route-service.ts`)**:
    - Der Routenservice parst nun `europe-prefabs.json` (`x`, `y`, `token`, `nodeUids`) und verknüpft sie mit den Pfadbeschreibungen aus `europe-prefabDescriptions.json`.
    - Pfade mit `roundabout` ➔ Kreisverkehr (`roundabout`).
    - Pfade mit `hw1`, `hw2`, `highway_exit`, `highway_entrance`, `ramp`, `fork` ➔ Autobahnausfahrt (`highway-exit`).
    - Pfade mit `junction`, `crossroad`, `/cross_` ➔ Kreuzung (`turn`).
    - Jeder Kartenknoten wird exakt anhand seiner echten ETS2-Prefab-Klassifizierung eingeordnet.
  - **Vite/Rolldown Typen-Import-Behebung (`import type`)**: Die Typ-Imports (`LaneInfo`, `NextManeuver`, `InstructionResult`) wurden in [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx) und [CarPlayNavOverlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/CarPlayNavOverlay.tsx) explizit auf `import type` umgestellt. Dadurch entfernt der Vite/Rolldown-Bundler reine TypeScript-Interfaces beim Bauen sauber. Der Build läuft ohne Fehler in 1,4 Sekunden durch.
  - **Korrektur der Import-Reihenfolge (`GameMapWidget.tsx`)**: Alle Imports wurden an den Dateianfang verschoben und doppelte Inline-Interfaces entfernt. Die App rendert wieder einwandfrei.
  - **Vollständiges Code-Refactoring & Modularisierung (`navInstructionEngine` & `CarPlayNavOverlay`)**: Auslagerung der gesamten Navigationsberechnung und Spuranzeige aus der vormals 2.100 Zeilen langen `GameMapWidget.tsx` in saubere, modulare Dateien:
    - [navInstructionEngine.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/utils/navInstructionEngine.ts): Reine, deterministische Logik für Spur- und Abbiegeanweisungen.
    - [CarPlayNavOverlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/CarPlayNavOverlay.tsx): Saubere React-UI-Komponente für das Apple CarPlay Navigations-Banner, Spuren-Substrip und Vorschau-Subcard.
    - [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx): Aufgeräumte Hauptkomponente für die Kartenansicht.
  - **Stabilisierung der Autobahn-Ausfahrtsanweisungen (`generateNextInstruction`)**: In [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx) wurde das Hin-und-Her-Wechseln zwischen Anweisungen beseitigt. Eine bevorstehende Ausfahrt wird nun verlässlich und frühzeitig als **`In [Distanz] Ausfahrt rechts/links nehmen`** angekündigt und schaltet erst unterhalb von 400 m sanft auf **`Ausfahrt rechts/links nehmen`** um.
  - **Exakte Differenzierung zwischen `Ausfahrt nehmen` und `Spur wechseln`**: In [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx) unterscheidet das System nun präzise: Das Verlassen einer Autobahn/Schnellstraße über eine Rampe erzeugt die Anweisung **`Ausfahrt rechts/links nehmen`**, während das bloße Einordnen auf mehrspurigen Straßen die Anweisung **`Auf die rechte/linke Spur wechseln`** erzeugt.
  - **Reine Abbiegepfeile für exklusive Abbiegespuren (`buildLanes`)**: In [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx) werden Kombinationspfeile (`straight-right` `⬆️+↱` / `straight-left` `↰+⬆️`) **ausschließlich** auf echten Kombinationsspuren (wie Autobahnausfahrten/Verzweigungen) gerendert. Bei reinen Abbiegespuren an Kreuzungen werden ausnahmslos reine Abbiegepfeile (`[ ↱ ]` / `[ ↰ ]`) verwendet.
  - **Unterdrückung fehlerhafter Abbiegehinweise in Straßenkurven (`generateNextInstruction`)**: In [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx) wurde der Schwellenwert für die Erkennung von Abbiegemanövern von 15° auf 28° angehoben. Normale Straßenkurven und S-Kurven werden nun verlässlich als `Geradeaus weiterfahren` eingestuft. Fehlerhafte Ansagen wie `Links/Rechts halten` beim einfachen Durchfahren von Kurven gehören damit der Vergangenheit an.
  - **Automatische Routenbeendigung bei Zielankunft (`onDestinationReached`)**: Sobald der LKW den Zielort in [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx) erreicht (weniger als 45m Restentfernung zum Zielgebäude/Firmengelände), stoppt die Route automatisch. Die Routenlinie und Navigations-Banner verschwinden und ein grüner Toast-Alert (`Ziel erreicht! 🏁`) wird in [CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx) angezeigt. (Inklusive Fix des Lucide-Icon-Imports `CheckCircle`).
  - **Syntax-Fehlerbehebung (`calculateRoute` Klammernpaarung)**: Entfernen der überschüssigen Schließungsklammer `}` in [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx), sodass `calculateRoute()` und `useEffect` exakt ausgerichtet sind und Vite den Code ohne Parsing-Fehler kompiliert.
  - **Wiederherstellen der Abbiege-Pfeilmarker (`turnTips`)**: Überarbeitung in [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx). Überflüssige Mindestabstands-Einschränkungen wurden entfernt, sodass der weiße Abbiege-Pfeilmarker vor jeder bevorstehenden Abbiegung verlässlich auf der Routenlinie erscheint und exakt in Fahrtrichtung ausgerichtet wird.
  - **Gebogener weißer Abbiegebogen auf der Routenlinie (`route-turns-line`)**: In [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx) wird direkt an der bevorstehenden Abbiegung eine strahlend weiße Abbiege-Kurve (`#ffffff`, 10.5px) entlang des echten Straßenverlaufs um die Ecke gerendert, an deren Ende die weiße Pfeilspitze in Fahrtrichtung zeigt (exakt wie auf dem Beispielfoto).
  - **Vollständiges Entfernen von Diagonalpfeilen**: In [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx) wurden diagonale Pfeile (`slight-left`/`slight-right`) komplett gestrichen. Bei „Links/Rechts halten“ sowie Spurtrennungen wird im Hauptbanner oben links ein reiner Geradeaus-Pfeil nach vorne (`⬆️`) gerendert, während in den Spuren Kombinations-Pfeile (`straight-left` / `straight-right`) verwendet werden.
  - **Präzise Kontext-Spuranzeige (`buildLanes`)**: Überarbeitung der Spuren-Logik in [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx). Wenn du geradeaus fährst (`dir === 'straight'`), werden ausnahmslos alle Spuren als reine Geradeaus-Pfeile (`[ ⬆️ | ⬆️ ]`) gerendert. Bei Ausfahrten und Spurtrennungen zeigen durchgehende Spuren Geradeaus (`⬆️`) und die Ausfahrtsspur den kombinierten Pfeil (`straight-right` bzw. `straight-left`).
  - **Geradeaus-Hauptpfeil (`⬆️`) bei „Links/Rechts halten“**: Bei Ausfahrten und Spurtrennungen („Links halten“ / „Rechts halten“) wird im Hauptbanner oben links nun ein klarer Geradeaus-Pfeil nach vorne (`⬆️`) gerendert anstelle von diagonalen Pfeilen.
  - **Vorschau-Subcard für das übernächste Manöver (`Dann ↰`)**: Unterhalb der Haupt-Navigationsbox in [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx) wurde eine Sub-Preview-Card im echten Navigationsdesign integriert (`Dann [Pfeil-Icon] 600m`), die rechtzeitig ankündigt, welche Abbiegung sofort nach dem aktuellen Manöver folgt.
  - **Größere Navigations-Bannerbox & Typografie oben rechts**: Vergrößerung der blauen Navigations-Bannerbox in [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx) (Breite `330-440px`, Hauptmanöver `24px`, Richtungs-Untertitel `Richtung Hamburg` von `11px` auf **`17px`**, Entfernungsangabe `60 m` von `15px` auf **`20px`**) für maximale Lesbarkeit.
  - **Manuelle Firmen- & Ziel-Navigation (`searchDestinations`)**:
    - **Firmen- & Stadt-Suchfunktion**: Einbau einer Echtzeit-Suche in [ets2Cities.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/data/ets2Cities.ts) zum Durchsuchen aller 370+ Städte sowie sämtlicher ETS2/ATS-Firmen und Logistikzentren (z. B. `LKWLOG`, `Tradeaux`, `Posped`, `EuroGoodies`).
  - **Ganzheitliches Apple CarPlay Dark Glass Design-System**: Überarbeitung sämtlicher Widgets, Tabs, Cockpit-Displays, Mediaplayer-Karten und Einstellungen in [CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx) zu einem durchgehenden **Dark Glassmorphism UI** (`#0d1117` Glass-Backdrops, `bg-white/[0.04]` Elemente, leuchtende Aura-Glows, veredelte Typografie & Neon-Glow Status-Badges).
    - **Performanceschub & Freeze-Behebung beim Routenstart**: Vorab-Generierung und Caching der `nodeLUT` Map (über 350.000 Knoten) direkt beim einmaligen Laden des Graphen in [route-service.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/route-service.ts). Behebung einer fehlenden `spatialIndex`-Instanziierung, sodass Routen nun extrem schnell in **unter 5 Millisekunden** ohne Fehler oder Aufhängen berechnet werden!
    - **Lückenlose Hotkey- & Tastatur-Steuerung**:
      - **Vollständige Menü- & Such-Navigation**: Alle Menüs, Widgets, Zoom-Stufen und das Firmen-Suchmodal sind 100% ohne Maus bedienbar (Pfeiltasten `▲/▼/◄/►`, `Enter`, `Escape`, `S`/`F` Hotkeys).
      - **Fokussierung der Suchleiste per Enter**: Ein Druck auf `Enter` auf der erweiterten Karte fokussiert nun sofort die Suchleiste (`searchInputRef`), sodass direkt getippt werden kann.
      - **Selektions-Highlighting**: Aktive Firmen-Einträge in der Suchliste werden bei Tastatur-Navigation leuchtend hervorgehoben und per `Enter` direkt als Ziel gewählt.
      - **Apple CarPlay Notification Toast Banner Redesign**: Neugestaltung der In-Car-Benachrichtigungen (`activeNotification`) in [CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx) im echten Apple CarPlay Dark-Glassmorphism-Stil (`rounded-3xl bg-[#0d1117]/95 backdrop-blur-2xl`) mit oberer Swipe-Pill-Leiste, farbcodierter Aura-Leuchte und typografischer Ausrichtung.
      - **JSX-Syntax-Fix**: Behebung eines Klammer-Fehlers in der JSX-Listenstruktur in [CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx).
  - **High-Contrast Routenanzeige & A*-Optimierung nach Truckermudgeon-Muster**:
    - **Dunkle Kontur-Hülle (`route-remaining-casing`)**: Starke dunkle Außenkontur unter der Routenlinie für perfekte Abhebung von Straßen und Hintergründen.
    - **Säuberung der Routenlinie**: Entfernen der Chevrons entlang der Linie für eine cleane, durchgehende Polyline-Optik.
    - **Dual-State A* Start-Suche (`forward` + `backward`)**: A* in [route-service.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/route-service.ts) untersucht nun zu Beginn beide Fahrtrichtungen des Startknotens gleichzeitig, wodurch Wende-Sackgassen und Fehlsuchen bei nahegelegenen Kreuzungen vermieden werden.
    - **Überarbeitung der Abbiege-Pfeile auf der Routenlinie (Einzeler Pfeil für das nächste Manöver)**:
      - **Ausschließlich EIN Pfeil für die bevorstehende Abbiegung**: In [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx) wird nun immer genau **ein einziger Abbiegepfeil** auf der Karte gerendert – nämlich exakt an dem als Nächstes bevorstehenden Manöver vor dem LKW. Die Karte wird nicht mehr von vielen Pfeilen überflutet. Sobald die Abbiegung absolviert wurde, erscheint automatisch der Pfeil für das darauffolgende Manöver.
      - **Behebung der Koordinaten-Matching-Fehler & Client-Side Fallback**: Korrektur der Distanz- und Index-Zuordnung in Spielkoordinaten `[x, y]` in [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx) sowie Einbau einer automatischen Manöver-Erkennung entlang der Routen-Polyline als Fallback. Garantiert, dass bei jeder bevorstehenden Abbiegung verlässlich der Abbiegepfeil gerendert wird.
      - **Strikte Filterung auf echte Abbiegungen, Kreisverkehre & Autobahn-Auf/Abfahrten**: In [route-service.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/route-service.ts) wurden die Filterkriterien überarbeitet. Es werden Manöverpunkte an Prefabs (>= 8°), Straßenwechseln (>= 8°) oder scharfen Abbiegungen (>= 14°) erfasst.
    - **Toleranzschwelle für Falsch-Abbiegehinweise**: Erhöhung des Winkel-Schwellenwerts in [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx) auf 26°, sodass geringfügige Straßenkurven oder Spurübergänge auf Autobahnen nicht mehr fälschlicherweise als Abbiegeanweisung ("Links abbiegen") gewertet werden.
    - **Deutlich breitere Straßen- & Routendarstellung**: Verdopplung der Straßenbreiten auf der Karte (`ets2-roads` von `2.0-9.0` auf `4.5-20.0px`) und Verstärkung der Navigations-Routenlinie (`casing`: 17px, `line`: 10.5px) in [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx) für hervorragende Lesbarkeit im Stil von Apple Maps / Google Maps.

## [1.1.1] - 2026-07-31

### Geändert
- **CarPlay RAM & Performance-Optimierung & Design-Feinschliff**:
  - **Syntax-Fehlerbehebung (`AnimatePresence` Schließungsklammer)**: Hinzufügen der fehlenden Klammer `)}` für den `activeNotification`-Bedingungsausdruck in [CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx), wodurch Vite HMR/OXC ohne Fehler transformiert.
  - **Glocke & veraltete Callbacks entfernt**: Entfernen des Glocken-Buttons sowie veralteter Mitteilungszentrale-Dateien.
  - **Erweiterter Karten-Rand im Theme-Design**: Der Rahmen um das erweiterte Karten-Modal passt sich nun dynamisch an das gewählte Theme an (z. B. Cyan für Blue, Amber für Titan/Dark).
  - **High-Performance Map Throttling (RAM-Schutz bei aktiven Routen)**: Einbau eines adaptiven Positionsthrottling-Hooks für das `GameMapWidget`. Die Kartenkoordinaten und Polyline-Neuzeichnungen werden bei aktiven Routen nur bei relevanter Distanzänderung (>3m) oder Ablauf von 500ms aktualisiert. Dies reduziert unzählige MapLibre/Leaflet WebGL-Canvas-Repaints um **80%** und hält den RAM-Verbrauch dauerhaft niedrig.
  - **Routenberechnung & Dynamische Navigation (Vollständige Neuentwicklung)**:
    - **1:1 Truckermudgeon Directional A* Graph-Algorithmus**: Der A*-Suchalgorithmus in [route-service.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/route-service.ts) wurde strikt an den originalen Algorithmus von `truckermudgeon/maps` (`@truckermudgeon/map/routing.ts`) angepasst. Nachfolgeknoten werden nun richtungsspezifisch getrennt (`forward` und `backward`), um Geisterfahrten entgegengesetzt von Einbahnstraßen und Autobahnauffahrten zu unterbinden.
    - **Direkte Graphknoten-Abfrage für Start/Ziel (`nearestInGraph`)**: `destNode` nutzt nun direkt `nearestInGraph`, sodass Zielpunkte (z. B. auf Firmen-Prefabs) sofort auf den nächstgelegenen Routing-Graphenknoten aufgelöst werden.
    - **IPC-Nebenläufigkeitsschutz (`isFetchingRef`)**: Einbau einer Re-Entranz-Sperre in [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx). Verhindert, dass hochfrequente Telemetrie-Ticks (60Hz) vor dem Abschluss einer IPC-Routenanfrage die Sequenz-IDs hochzählen und eintreffende Routenergebnisse ungewollt verwerfen.
    - **Dynamisches Kürzen der Navigationslinie (Live-Route)**: Die Routenlinie auf der Karte wird während der Fahrt in Echtzeit hinter dem LKW abgeschnitten (`lastClosestIndexRef`). Die blaue Linie beginnt stets an der aktuellen LKW-Position und reicht bis zum Zielort.
    - **Automatische Neuberechnung bei Falschfahrten (Off-Route Rerouting)**: Weicht der LKW mehr als 300 Meter von der geplanten Route ab, fordert `calculateRoute` über `triggerRouteFetch()` sofort eine neue A*-Routenberechnung vom aktuellen Standort an.
    - **Dynamisches Theme-Styling für Routenlinie**: Die Navigationslinie rendert nun dynamisch in der aktiven `accentColor` des gewählten Themes (z. B. Amber für Titan/Dark, Cyan für Blue) inklusive sichtbarem Soft-Glow-Effekt.
    - **Exakte Flaggen-Positionierung & Spieler-Blau (`#3b82f6`)**: Der Flaggen-Marker sitz nun exakt auf dem allerletzten Koordinatenpunkt der berechneten Route. Die doppelte `translateY`-Verschiebung wurde entfernt. Zudem wurden Routenlinie, Glow-Effekt und Ziel-Flagge in demselben Blau (`#3b82f6`) wie der Spielerpfeil gestaltet.
    - **Fix für Start-Indexierung (`lastClosestIndexRef`)**: `lastClosestIndexRef` wird nun auch bei initial leicht abweichenden LKW-Startpositionen (>300m) auf den nächstgelegenen Routenknoten gesetzt, sodass die berechnete Route sofort vom LKW aus sichtbar gezeichnet wird.
    - **Statische Bündelung in `src/data/` (`ets2_cities.json` & `europe-companies.json`)**: `ets2_cities.json` und `europe-companies.json` sind nun direkt in `src/data/` eingebunden. Behebt den Vite-Importfehler aus dem `public`-Ordner und sorgt für ultraschnelle, synchrone Stadt- und Firmen-Auflösung ohne Ladeverzögerung.
    - **Standardmäßige Spielerzentrierung auf der Karte**: Das automatische Abdriften der Kamera beim ersten Routenaufbau (`fitRoute`) wurde entfernt. Die Karte bleibt nun standardmäßig zu 100% auf den Spieler und LKW-Standort zentriert.
    - **SVG-Geschwindigkeitsschild mit riesiger Zahl**: Das Tempo-Schild auf der erweiterten Karte wird nun als Vektorgrafik (`SVG 110x110`) gerendert. Die Geschwindigkeitszahl (`fontSize=56`) nimmt nun **85% der gesamten inneren Kreisfläche** ein und füllt das Schild in allen Auflösungen perfekt aus.
    - **Refactoring auf 3 CarPlay-Themes (`Darkmode`, `Lightmode`, `Automatisch`)**: Das Theme-System wurde auf genau 3 Modi reduziert. Im Modus *Automatisch* schaltet CarPlay basierend auf den Scheinwerfern (`lightsBeamLow` von der Telemetrie) automatisch bei Abblendlicht an auf Darkmode und bei ausgeschaltetem Abblendlicht auf Lightmode um.
    - **Einstellbares Karten-Design (`carPlayMapTheme`)**: In den CarPlay-Einstellungen wurde ein eigener Bereich **Karten-Design (Map Mode)** hinzugefügt. Nutzer können das Verhalten der Karte nun unabhängig oder synchron einstellen: *Dunkel* (immer Darkmode), *Hell* (immer Lightmode) oder *Automatisch* (Abblendlicht steuert Tag-/Nachtmodus der Karte).
    - **Präzise GPS-Navigationsanweisungen (`generateNextInstruction`)**: Die Anweisungs-Engine wurde überarbeitet. Das fehlerhafte Überspringen nahgelegener Abbiegungen (`bestIdx + 6`) wurde behoben, sodass Anweisungen nun **stets exakt die unmittelbar bevorstehende Abbiegung** ankündigen. Entfernungen werden entfernungsbasiert dynamisch aktualisiert ("Jetzt" ab 25m, exakte 10m-Schritte ab 200m).
    - **Authentische SVG-Fahrzeug-Tell-Tales & Zentrierte Kontrollleuchten**: Die Emojis wurden durch **echte VDO/Scania-SVG-Fahrzeugsymbole** (Blinker-Pfeile, Handbremse `(P)`, Abblendlicht, Fernlicht, Öldruck, Tankwarnung) ersetzt. Der LKW-Namensschriftzug oben links sowie die Hotkey-Einblendung oben rechts wurden entfernt, um die Leiste **perfekt mittig** zu platzieren.
    - **Sichtbare MFD-Live-GPS-Karte (`width=100% height=100%`)**: Der Darstellungsfehler einer schwarzen Karte auf dem Tacho-MFD wurde behoben, indem explizit `width="100%"` und `height="100%"` mit automatischer Resize-Schnittstelle übergeben wird.
    - **Umschaltbares Multi-Funktions-Display (MFD) in der Mitte**: Im Zentrum des Tachos kann per **Hotkeys (◀ / ▶)** oder Mausklick nahtlos zwischen 5 Modi durchgewechselt werden: **🗺️ Live GPS-Karte**, **🎵 Musikwiedergabe**, **⚡ Fahrdaten & Trip-Bordcomputer**, **⚙️ Getriebe & Telemetrie** sowie **🚛 LKW-Zustand & Wartung**.
    - **Maximierte Tacho-Anzeige (72px) & XXL-Typografie im Digital Cockpit Widget**: Ein globales CSS-Overriding (`font-size: inherit !important`) in `.carplay-root` wurde behoben. Die Geschwindigkeitszahl ist nun **72px hoch (`fontSize: 72px`)**. Auch die Beschriftungen (**GANG**, **TANK**, **ZUSTAND**) und deren Werte wurden auf ein **Maximum (`text-base font-black` Labels, `text-xl` Werte)** vergrößert, sodass 100% des Innenraums der Messkarten genutzt werden.
    - **Realistisches deutsches/europäisches Tempo-Schild (VZ 274)**: Das Geschwindigkeitsbegrenzungs-Schild auf der erweiterten Karte wurde auf ein **authentisches Maß (78×78 px)** angepasst mit feinerer roter Umrandung (`strokeWidth=7.5`) und perfekt ausgerichteter Typografie (`fontSize=42`), die wie ein echtes Straßenschild aussieht.
    - **Aufgeräumtes Spotify/Medien-Widget (Home-Seite)**: Die Vor- und Zurück-Buttons wurden aus dem Medien-Widget entfernt. Das Coverbild füllt nun **100% der gesamten rechteckigen Widget-Fläche (`w-full h-full object-cover`)** ohne dunkle Seitenränder aus, während ein dunkler Verlauf für optimale Lesbarkeit der Song-Infos sorgt.
    - **Fahrtrichtung (Heading)**: `heading` wird als Parameter an mehere Routing-Funktionen übergeben für korrekte Spurauswahl auf Autobahnen.

### Optimiert
- **CarPlay RAM-Optimierung** (~1.1 GB → ~300 MB):
  - CarPlay-Fenster wird jetzt direkt im Hauptprozess als `BrowserWindow` erstellt, anstatt einen komplett separaten Electron-Prozess zu spawnen (`spawnCarPlayProcess`). Eliminiert doppelte Main-, GPU-, Renderer- und Netzwerk-Prozesse (~500 MB Einsparung).
  - V8 Heap-Limit von 512 MB auf 256 MB reduziert (`--max-old-space-size=256`).
  - MapLibre GL Tile-Cache auf 15 Kacheln begrenzt (`maxTileCacheSize: 15`, vorher 50+).
  - MapLibre Cross-Fade-Buffer deaktiviert (`fadeDuration: 0`).
  - MapLibre Auto-Resize-Polling deaktiviert (`trackResize: false`), da `ResizeObserver` die Dimensionen steuert.
  - Parent-Window registriert alle CarPlay-Hotkeys direkt, Shortcuts funktionieren auch ohne separaten Child-Prozess.

## [1.1.0] - 2026-07-27

### Hinzugefügt
- **Apple CarPlay / Android Auto LKW-Dashboard**:
  - Hinzufügen einer Option zur Aktivierung des CarPlay-Fensters anstelle des klassischen Tachometers.
  - Implementierung eines neuen Dashboard-Designs mit festem Splitscreen-Layout und einer Seitenleiste für die App-Auswahl.
  - **Überarbeitung der Design-Themen**:
    - *Solid Black*: Rein schwarzer Hintergrund (#000000) für perfekten Kontrast bei Nachtfahrten.
    - *Translucent Light*: Solides, blendfreies hellgraues Design (#f4f5f7) mit weißen Cards für gute Ablesbarkeit am Tag.
    - *Brushed Titan*: Hochwertiger Ersatz für den alten Carbonlook durch eine edle, gebürstete Titan-Metalltextur mit Reflexions-Sheen.
  - **Home-Dashboard**: Splitscreen mit live GPS-Karte (über `GameMapWidget`), modernisierter Mediensteuerung (großes Album-Cover mit Glow-Effekt, Mini-Fortschritt mit Slider-Handle-Thumb, Mini-Equalizer-Balken, kreisrunder Play/Pause-Button) und LKW-Diagnose.
  - **Musik-App**: Attraktiver Vollbild-Player mit unscharfem Album-Hintergrund, Vinyl-Schallplatten-Animation mit realistischen Lichtbrechungskegeln (Conic Refraction Shader), Echtzeit-Audio-Wellenform (10-Bar Visualizer), vergrößertem Titel-Layout und Timeline-Slider mit leuchtendem Slider-Handle-Thumb.
  - **Sub-App Lesbarkeits-Upgrade**: Sämtliche Unterseiten (Auftrag, LKW-Diagnose, Settings) wurden auf größere Schriftarten, dicke Füllstandsbalken (h-3) und kontrastreiche Telemetrie-Werte skaliert, um sie auch aus großer Entfernung beim Fahren optimal abzulesen.
  - **Auftrag-App**: Detaillierte Frachtbriefe mit Frachtgewicht, Absender, Empfänger, verbleibender Strecke, ETA und Fortschrittsbalken.
  - **LKW-App**: Vollständige Cockpit-Diagnose mit digitaler Geschwindigkeits- und RPM-Balkenanzeige, Verschleißwerten, Tankinformationen und aktiven LKW-Kontrollleuchten.
  - **Settings-App**: Anzeige der aktiven Tastenbelegungen und Bedienungshinweise für das Ingame-CarPlay.
  - **In-Game CarPlay Benachrichtigungen (Alerts)**: Vollwertiges Toast-System für Fahrereignisse, das oben im CarPlay-Bildschirm mit großen, blinkenden Kacheln aufleuchtet:
    - *Tempo-Warnung*: Roter Warnbanner bei Überschreiten des Geschwindigkeitslimits um +3 km/h.
    - *Treibstoff-Warnung*: Gelber Warnbanner bei Reserve-Tankstand.
    - *Lenkzeit-Pause*: Warnung bei weniger als 30 Minuten verbleibender Fahrtzeit vor einer Rast.
    - *Schadens-Warnung*: Rotes Overlay bei Erhöhung des LKW-Verschleißes.
    - *Auftrags-Start*: Grüner Begrüßungsbanner mit Details zu Fracht und Zielstadt bei Jobannahme.
    - *Song-Wechsel*: Glassmorphic Toast mit dem Albumcover, Songtitel und Künstler bei Liedwechsel.
    - *Chat-Nachrichten*: Blauer Warnbanner mit Sprechblasen-Icon bei eingehenden privaten DMs oder VTC-Gruppennachrichten.
    - *News-Veröffentlichungen*: Petrolfarbener Infobanner bei neuen Firmen-News.
    - *Event-Einladungen*: Lila Kalender-Banner bei Ankündigungen von Konvois oder Community-Events.
  - **Detaillierte Benachrichtigungseinstellungen**: Integration eines neuen Einstellungsbereichs in `OverlaySettings.tsx`, der es dem Fahrer erlaubt, jede CarPlay-Benachrichtigung (Geschwindigkeit, Kraftstoff, Müdigkeit, Schaden, Aufträge, Musik, Chat, News, Events) einzeln per Switch-Toggle ein- oder auszuschalten.
  - **Interaktive CarPlay-Einstellungen**: Vollwertige native Einstellungsseite direkt auf dem CarPlay-Bildschirm im Settings-Tab. Ermöglicht das Wechseln des Themes (Solid Black, Translucent Light, Deep Blue, Titan) sowie das Konfigurieren der 9 Cockpit-Alerts über fokussierbare Kacheln und Custom-Switches, die vollständig per D-Pad / Tastatur gesteuert werden können und sich per Auto-Scroll anpassen.
- **Konfigurierbare globale Hotkeys**:
  - Implementierung globaler Tastatur-Shortcuts im Electron-Hauptprozess, um CarPlay direkt aus dem Simulator heraus zu steuern.
  - **Tastenrecorder in den Einstellungen**: Benutzerfreundlicher, interaktiver Rekorder in `OverlaySettings.tsx` zur Zuweisung eigener Tasten per Tastendruck.
  - **Tastatur-Cursor-Navigation (D-Pad-Modus)**: Visuelles Navigationsraster mit gelben Fokus-Leuchtringen, das über globale Navigationstasten (Hoch, Runter, Links, Rechts, Bestätigen, Zurück) bedient werden kann. Erlaubt die vollständige Steuerung aller Funktionen (wie Apps und Wiedergabetasten) direkt während der Fahrt.
  - **Widget-Maximierung (Glassmorphic Visuals)**: Ermöglicht das Vergrößern von Dashboard-Elementen in einer modernen, animierten Vollbildansicht mit Milchglaseffekt (Backdrop-Blur) und Federkraft-Transitions:
    - *GPS-Karte*: Enthält ein schwebendes Navigations-Overlay mit Ankunftszeit (ETA) und verbleibender Kilometerdistanz.
    - *Cockpit-Großansicht*: Bietet ein hochauflösendes Tachometer-Design mit einem kreisförmigen, farblich dynamischen SVG-Drehzahlmesser (208px Tachoring), riesiger digitaler Geschwindigkeitsanzeige (text-6xl), großem Gang-Indikator, dicken Tank- und Schadensfüllbalken (h-3) sowie vergrößerten Kontrollleuchten für Öl, Wassertemperatur und Feststellbremse (w-12 HUD-Tiles).
  - **Child-Process Tastatur-Binding**: Shortcuts werden in beiden Prozessen registriert, damit sie auch im getrennten rahmenlosen CarPlay-Fenster ankommen.
  - **Dynamische Skalierung & Responsivität**: Einbindung von React `ResizeObserver`-Hooks für beide Map-Elemente (im Dashboard und in der Großansicht). Die Breite und Höhe der Karte passen sich nun in Echtzeit an die jeweilige Fenstergröße oder Monitorauflösung an.
- **Media-Control-Integration**:
  - Übertragung von Mediensteuerungs-Signalen an das Betriebssystem über temporäre PowerShell-Skriptdateien, um Escaping-Probleme bei Anführungszeichen zu beheben und zuverlässig Hintergrund-Player zu steuern.

### Entfernt
- **Klassische Tachometer-Widgets**:
  - Vollständige Entfernung des alten Tacho-Steuerungscodes, der anpassbaren Widgets und der dial-basierten Speedometer-Ansicht.

## [1.0.0] - 2026-07-25

### Hinzugefügt
- **Separates Tachometer-Fenster für LKW-Fahrer**:
  - Hinzufügen einer Option in den Overlay-Einstellungen zur Aktivierung eines separaten Tachometers.
  - Implementierung eines neuen rahmenlosen Electron-Fensters, das unabhängig positioniert werden kann (z.B. auf einem zweiten Bildschirm).
  - Synchronisation von Telemetrie- und Einstellungsdaten zwischen dem Hauptprozess und dem neuen Fenster.
  - Automatisches Schließen des Tachos schaltet auch den UI-Umschalter in den Einstellungen ab.
- **Drei visuelle Tachometer-Designs**:
  - **Modern Digital**: SVG-Bögen für Geschwindigkeit und Drehzahl, Warnleuchten, Fracht- und Routeninformationen im modernen LKW-Cluster-Design.
  - **Klassisch Analog**: Klassischer Tacho und Drehzahlmesser mit sich bewegenden physikalischen Nadeln und einem zentralen digitalen LCD-Info-Display.
  - **Renn-Edition**: LED-Schaltleuchte, Carbon-Hintergrund, eckige Balkenanzeigen für Tank/Schaden und ein großer Gangindikator.
- **Routing & Einstellungen**:
  - Routing in `main.tsx` für `#overlay-tacho` Hash.
  - Einstellungs-UI in `OverlaySettings.tsx` zur Konfiguration und Auswahl des Designs.

### Geändert
- **Tachometer-Fenster & Daten-Erweiterungen**:
  - Hintergrund auf reines, solides Schwarz (`bg-black`) umgestellt.
  - Entfernung von Umrandungen und dekorativen Hintergrund-Glows für maximale Konzentration auf die Instrumente.
  - Vollständiges Entfernen aller Fenster-Schaltflächen (Schließen/Minimieren); das Fenster wird stattdessen sauber über das Einstellungs-Menü verwaltet.
  - Ganzfenster-Draggability hinzugefügt (Klick und Drag an beliebiger Stelle auf dem schwarzen Hintergrund).
  - Anpassung des Fenster-Seitenverhältnisses auf `1024x380` (~2,7:1 Ratio) in `main.ts` zur Nachbildung eines echten ultra-weiten LKW-Digitaltachos.
  - Name/Titel des separaten Fensters in `main.ts` und in React auf "OPC Tacho" geändert, damit es im Betriebssystem unter diesem prägnanten Namen angezeigt wird.
  - Tachometer läuft nun in einem vollständig separaten Betriebssystem-Prozess (`--tacho-mode`), sodass er vom Betriebssystem als eigenständige App erkannt wird (z.B. in der Taskleiste, Alt-Tab und OBS). Die Synchronisation der Einstellungen geschieht über bidirektionales Datei-Watching (`overlay-settings.json`).
  - Integration von tieferen Telemetrie-Details in alle Designs:
    * Absender- und Empfänger-Firmennamen (`source_company` und `dest_company`).
    * Fortschrittsanzeige für die gefahrene Fahrtstrecke basierend auf geplanter Gesamtdistanz (`plannedDistance`).
    * Nächste gesetzliche Lenkzeit-Pause (`nextRest`) als Live-Timer.
    * Durchschnitts-Kraftstoffverbrauch (`avgConsumption`) in L/100km.


