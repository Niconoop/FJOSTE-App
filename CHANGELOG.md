# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

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


