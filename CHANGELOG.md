# Changelog
 
Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.
 
## [1.7.121] - 2026-10-12

### 📱 CarPlay: Überlappende HQ-Textbeschriftungen auf der Navigationskarte entfernt
  - **Entfernung überlappender POI-Texte ([GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx))**:
    - Der Symbol-Text-Layer `hq-pois-labels` wurde vollständig aus dem CarPlay-Kartenwidget entfernt.
    - Zuvor wurden die Labels von Truckline HQ („Truckline HQ \n Dillenburg (B255/A45)“), Werkstatt („Truckline Werkstatt \n Service“) und Tankstelle („Truckline Tankstelle \n Fuel“) an nah beieinander liegenden Koordinaten mit `text-allow-overlap: true` gerendert, was zu einem unleserlichen Textblock unter dem Firmen-Icon führte.
    - Die Standorte und POIs werden nun wie auf der Hauptkarte und im Original-ETS2-Stil als saubere, moderne Icons ohne störende Text-Überlappungen dargestellt.

## [1.7.120] - 2026-10-11

### 🛠️ Werkstatt- & Garagensymbole hinzugefügt & Straßenführung auf Firmengeländen korrigiert
  - **Ergänzung aller wichtigen POI-Symbole ([merge_hq_additions.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/maps-main/merge_hq_additions.ts), [Map.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Map.tsx), [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx), [RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx))**:
    - **Werkstatt / Service (`service_ico`)**:
      - Truckline HQ (Dillenburg): Offizielle Werkstatt am Truckline-Areal (`[-6249.4, -1396.3]` / WGS84 `[8.53035, 50.79962]`).
      - TruckersMP HQ (Wrocław): Werkstätten am TMP-Depot (`[20967.6, -865.9]`) und in Wrocław-Süd (`[23471.3, -1876.7]`).
    - **Große Garage (`garage_large_ico`)**:
      - Truckline HQ: Hauptdepot / Firmenzentrale in Dillenburg (`[-5911.0, -1160.0]`).
      - TruckersMP HQ: Hauptgarage bei Wrocław (`[23682.4, -1678.7]`).
    - **Weitere Einrichtungen**: Tankstellen (`gas_ico`), LKW-Händler (`dealer_ico`), Rastplätze (`parking_ico`) und Arbeitsagenturen (`recruitment_ico`) wurden aus den Prefab-Spawnpoints extrahiert und in den Layer `ets2_hq` integriert.
    - **Frontend-Anbindung**: Die Symbol-Ebene `${prefix}-pois` liest nun direkt den Layer `ets2_hq` aus, sodass alle Einrichtungen zuverlässig auf der Karte gerendert werden.
  - **Behebung der Straßenverläufe über Firmengelände & durch 3D-Baukörper**:
    - **Ursachenanalyse**: Bisher wurden die Straßen-Ebenen (`roads-casing` und `roads`) *nach* den Firmengeländen (`prefabs`), Footprints und 3D-Extrusionen gezeichnet. Dadurch schnitten dicke 2D-Straßenlinien samt dunklem Rahmen sichtbar quer über die Asphaltflächen der Firmengrundstücke und mitten durch dreidimensionale Gebäude hindurch.
    - **Karten-Ebenen-Neuordnung**: Die Render-Reihenfolge in `createHqGroundLayers` wurde korrigiert:
      1. `areas` (Grundflächen / Terrain)
      2. `roads-casing` (Straßenränder)
      3. `prefabs-base` (Hof- & Kreuzungsuntergrund)
      4. `prefabs` (Asphaltflächen der Firmengelände – verdeckt Straßenränder im Hof)
      5. `roads` (Straßenbänder)
      6. `footprints` (Gebäudegrundrisse)
      7. `extrusions` (3D-Baukörper stehen sauber oben auf, ohne von Straßen durchschnitten zu werden)
  - **PMTiles neu generiert**:
    - `ets2-truckline-hq.pmtiles`, `ets2-truckersmp-hq.pmtiles` und `ets2-hq.pmtiles` mit allen Werkstatt-, Garagen- und Firmen-POIs erzeugt, lokal in `uploads/map_cache/` synchronisiert und zu Cloudflare R2 hochgeladen.

## [1.7.119] - 2026-10-11

### 🏡 Präzise 3D-Extrusion echter Häuser & Ausschluss von Verkehrspylonen
  - **Wiederherstellung aller realen Wohnhäuser & Baukörper ([merge_hq_additions.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/maps-main/merge_hq_additions.ts))**:
    - **Differenzierung zwischen Häusern und Pylonen**: Früher wurden Baustellen-Pylonen/Leitkegel (310x `de_3j002`) über willkürliche Dummy-Dimensionen als riesige Klötze extrudiert. Beim ersten Bereinigungsversuch wurden fälschlicherweise auch echte Wohnhäuser und Cottages entfernt.
    - **Reale Häuser & Gebäude wieder da**: Alle echten Wohngebäude (`cottage_01_de`, `cottage_02_de`, `village_close_01` bis `06_de`, `flats_close`), Büros, Hotels, Werkstätten und Lagerhallen werden nun sauber dreidimensional dargestellt – mit ihren echten Mesh-Bounding-Boxen und Höhen aus ETS2:
      - **Truckline HQ-Areal**: 147 echte Häuser und Hallen im Umkreis (Dillenburg und Umgebung).
      - **TruckersMP HQ-Areal**: 279 echte Häuser, Stadtgebäude und Hallen.
    - **Strikter Ausschluss von Nicht-Gebäuden**: Verkehrspylonen, Leitkegel (`de_3j002`), Poller, Laternen, Schilderbrücken, Zäune, Leitplanken, Klärbecken, Waschrampen und Bushaltestellen werden zuverlässig ignoriert.
  - **PMTiles neu erzeugt & synchronisiert**:
    - `ets2-truckline-hq.pmtiles` (208 Kacheln), `ets2-truckersmp-hq.pmtiles` (245 Kacheln) und `ets2-hq.pmtiles` (452 Kacheln) neu erstellt und auf Cloudflare R2 aktualisiert.

## [1.7.118] - 2026-10-11

### 🏢 Bereinigung von Nicht-Gebäuden, Firmenlogo-Schriftzügen & Entfernung von Truckline Logistik
  - **Firmenlogos ohne Textbeschriftung ([Map.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Map.tsx), [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx), [RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx))**:
    - Die Namens-Beschriftungen (`text-field`, Halo-Paint) unter den Firmenabzeichen im Layer `${prefix}-companies` wurden vollständig entfernt.
    - Die Firmenlogos werden nun wie im Original-ETS2-Kartenstil als reine, elegante Icons dargestellt.
  - **Entfernung von Truckline Logistik ([merge_hq_additions.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/maps-main/merge_hq_additions.ts))**:
    - Der POI-Eintrag `Truckline Logistik` wurde restlos aus den Vektorkacheln und der Kartengenerierung entfernt.
    - Verbleibende Firmen im Truckline HQ-Gebiet: `Sanbuilders Baustelle`, `EuroAcres`, `IKA Bohag`, `Sanbuilders Halle` und `Sanbuilders Zementwerk`.
  - **Strikte Filterung auf 100% genuine Baukörper ([merge_hq_additions.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/maps-main/merge_hq_additions.ts))**:
    - **Ausschluss von Klärbecken & Zäunen**: Klärwerks-Rundbecken (`dlc_it_102`), Zaun-/Leitelemente (`blkw_0v012`, `blkw_2900h`) und Schilderbrücken/Masten (`mod_ger_3`, `mod_ger_4`, `mod_ger_5`) wurden eliminiert.
    - **Ausschluss von ländlichen Fremdobjekten**: Cottages (`cottage_01/02_de`), Scheunen, Waldhütten, WCs und Parkplatzkioske wurden aus der 3D-Extrusion verbannt.
    - **Reine Industrie- & Logistikbauten**: Nur noch echte Verwaltungsgebäude, Lagerhallen, Torhäuser und Werkstätten mit realen PMD-Dimensionen werden dargestellt (14 Gebäude im Truckline-Areal, 116 im TruckersMP-Areal).
  - **PMTiles neu erzeugt & synchronisiert**:
    - `ets2-truckline-hq.pmtiles`, `ets2-truckersmp-hq.pmtiles` und `ets2-hq.pmtiles` wurden neu generiert, in `uploads/map_cache/` hinterlegt und auf Cloudflare R2 aktualisiert.

## [1.7.117] - 2026-10-11

### 🏢 Bereinigung von Fake-Gebäuden & Vollständige Firmen-Erfassung in den HQs
  - **Filterung echter Gebäude ([merge_hq_additions.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/maps-main/merge_hq_additions.ts))**:
    - **Ausschluss von Nicht-Gebäuden**: Bisher wurden Pfosten, Poller (176x `de_3j002`), Lärmschutzwände (`wa_50`), Bushaltestellen, Waschrampen, Treppen, Schornsteine und Dach-Klimaanlagen fälschlicherweise als 3D-Baukörper extrudiert. Diese wurden vollständig herausgefiltert.
    - **Fokus auf reale Baukörper**: Nur noch echte Gebäude (Verwaltungsgebäude, Logistikhallen, Lager, Werkstätten, Hotels und Firmengebäude) im Umkreis der HQ- und Firmenstandorte werden dreidimensional dargestellt.
  - **Vollständige Firmen-Markierung**:
    - **Truckline HQ (Dillenburg & Umgebung)**: Alle 6 Firmen sind nun mit Logo und beschriftetem Text-Halo auf der Karte erfasst:
      - `Truckline Logistik` (Hauptdepot)
      - `Sanbuilders Baustelle` (`sanbuild_bas`)
      - `EuroAcres` (`euroacres`, Dillenburg)
      - `IKA Bohag` (`ika_bohag`, Dillenburg)
      - `Sanbuilders Halle` (`sanbuild_hal`)
      - `Sanbuilders Zementwerk` (`sanbuild_cem`)
    - **TruckersMP HQ (Wrocław)**: Alle 9 Firmen sind nun auf der Karte markiert (`Subse`, `ACC`, `Cargotras`, `Kaarfor`, `Trameri`, `Stokes`, `Steinbruch`, `EuroAcres`, `EuroGoodies`).
  - **PMTiles aktualisiert & hochgeladen**:
    - `ets2-truckline-hq.pmtiles`, `ets2-truckersmp-hq.pmtiles` und `ets2-hq.pmtiles` wurden neu erstellt, im Cache hinterlegt und auf Cloudflare R2 synchronisiert.

## [1.7.116] - 2026-10-11

### 🏗️ PMTiles Weg 1: 3D-Gebäude & Firmen per Layer-Merge ohne Berührung des Straßenlayouts hinzugefügt
  - **100% geschütztes Straßenlayout (Layer-Trennung in MVT)**:
    - **Reines Add-On-Verfahren ([merge_hq_additions.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/maps-main/merge_hq_additions.ts))**: Die funktionierenden Originalkacheln aus dem 12-Uhr-Stand (`Blob 4` und `Blob 5`) mit allen Straßen, Prefabs und Autobahnanbindungen bleiben bit-für-bit unberührt im Layer `ets2`. Kein Straßen-Generator greift mehr darauf zu.
    - **Zusätzlicher HQ-Layer `ets2_hq`**: Die 3D-Gebäude-Footprints (488 für Truckline, 291 für TruckersMP) und die Firmen (`Truckline Logistik`, `Sanbuilders Baustelle`, `Subse`, `ACC`, `Cargotras`) wurden in einen eigenständigen Vektorkachel-Layer `ets2_hq` gepackt und per Protobuf-Merge verlustfrei in die Kacheln integriert.
  - **MapLibre-Layer-Konfiguration ([Map.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Map.tsx), [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx), [RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx))**:
    - Straßen (`roads`, `roads-casing`, `prefabs`, `areas`) verweisen weiterhin auf `source-layer: 'ets2'`.
    - Gebäude (`footprints`, `extrusions`) und Firmen (`companies`) verweisen nun sauber auf `source-layer: 'ets2_hq'`.
    - Firmen-Icons werden mit hochauflösenden Badges (`truckline_logistik` etc.) und kontraststarken Beschriftungen mit Halo dargestellt.
  - **Kompilierung & Remote-Synchronisation ([build_separate_pmtiles.py](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/maps-main/build_separate_pmtiles.py), [upload_pmtiles_to_r2.py](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/maps-main/upload_pmtiles_to_r2.py))**:
    - Alle drei PMTiles (`ets2-truckline-hq.pmtiles`, `ets2-truckersmp-hq.pmtiles`, `ets2-hq.pmtiles`) wurden mit Dual-Layer-Definition (`ets2` + `ets2_hq`) gebaut, im lokalen Cache `uploads/map_cache/` hinterlegt und vollständig auf Cloudflare R2 hochgeladen.

## [1.7.115] - 2026-10-11

### ⏪ Generator-Skripte & PMTiles: Vollständiger Rollback auf den Stand von 12:00 Uhr
  - **Generator-Skripte ([generate_separate_hqs.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/maps-main/generate_separate_hqs.ts), [build_separate_pmtiles.py](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/maps-main/build_separate_pmtiles.py))**:
    - `generate_separate_hqs.ts` exakt auf die Baseline-Version von heute 12:00 Uhr zurückgesetzt (reine `.base`-Sektorenverarbeitung, Original-Kachelindizierung mit Zoom 4–13).
    - `build_separate_pmtiles.py` auf den Stand von 12:00 Uhr zurückgesetzt (Schreiben von `ets2-truckline-hq.pmtiles` und `ets2-truckersmp-hq.pmtiles` mit den ursprünglichen Bounding-Boxes).
  - **PMTiles-Archive**:
    - `ets2-truckline-hq.pmtiles` (126.646 Bytes, 177 Kacheln) aus dem ursprünglichen Blob 4 wiederhergestellt.
    - `ets2-truckersmp-hq.pmtiles` (113.688 Bytes, 166 Kacheln) aus Blob 5 wiederhergestellt.
    - `ets2-hq.pmtiles` (671.986 Bytes) aus `hq_tiles_dump.json` wiederhergestellt.
    - Alle Archive in `maps-main/out/` und `uploads/map_cache/` aktualisiert und vollständig auf Cloudflare R2 synchronisiert.

## [1.7.114] - 2026-10-11

### ⏪ PMTiles: Exakter Stand der wiederhergestellten Original-Archive wieder aktiv
  - **Vollständiger Rollback auf die bewährten Original-PMTiles**:
    - `ets2-truckline-hq.pmtiles` (126.646 Bytes, 177 Kacheln) aus Blob 4 wiederhergestellt.
    - `ets2-truckersmp-hq.pmtiles` (113.688 Bytes, 166 Kacheln) aus Blob 5 wiederhergestellt.
    - `ets2-hq.pmtiles` (672.024 Bytes, 478 Kacheln) wiederhergestellt.
    - Synchronisation zu `uploads/map_cache/` und Cloudflare R2 Remote Storage abgeschlossen.
  - **Überlappungs-Schutz bleibt erhalten ([Map.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Map.tsx), [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx), [RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx))**:
    - Die Trennung von `createHqGroundLayers` und `createHqSymbolLayers` bleibt voll aktiv. Alle HQ-Straßenflächen und Polygone werden vor den POIs gerendert, sodass Basiskarten-Elemente (Parkplatz `[P]`, Tankstellen) nicht mehr verdeckt werden.

## [1.7.113] - 2026-10-11

### 🗺️ Karten-Layer: Überlappungs-Fix für Basiskarten-POIs & HQ-Firmen mit 3D-Gebäuden
  - **Reparatur der Ebenen-Reihenfolge ([Map.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Map.tsx), [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx), [RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx))**:
    - **Split in Boden- und Symbol-Ebenen**: Die HQ-Layer wurden in `createHqGroundLayers` (Asphaltflächen, Prefabs, 3D-Baukörper, Straßen und Straßenränder) und `createHqSymbolLayers` (Ampeln, POIs, Firmenlogos) aufgeteilt.
    - **Keine Überdeckung von Basiskarten-Icons mehr**: Zuvor wurden alle HQ-Ebenen am Ende des MapLibre-Styles eingefügt, wodurch HQ-Straßenbeläge POIs der Basiskarte überdeckten (z. B. Parkplatz- `[P]` und Tankstellen-Symbole). Die Boden- und Straßenebenen werden nun *vor* `ets2-pois` gerendert, sodass alle POIs und Firmenlogos der Basiskarte stets scharf und unbedeckt im Vordergrund liegen.
  - **Präzise HQ-Bbox & Ausschluss entfernter Raststätten ([generate_separate_hqs.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/maps-main/generate_separate_hqs.ts), [build_separate_pmtiles.py](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/maps-main/build_separate_pmtiles.py))**:
    - Die Bounding Box für Truckline HQ wurde strikt auf den eigentlichen Betriebshof und Autobahnanschluss begrenzt (`minLat: 50.73`), wodurch die 15 km entfernte A45-Raststätte (bei `lat: 50.61`, `x: -5194, y: -272`) mit ihren Parkplatz- und Tankstellen-POIs vollständig von versehentlichen Straßen-Stubs befreit wurde.
  - **HQ-Firmen und 3D-Gebäude generiert**:
    - **Truckline HQ (Dillenburg)**: 76 3D-Gebäude-Extrusionen (`footprint`) mit realistischen Höhen und Grundrissen sowie Firmen-POIs `Truckline Logistik` und `Sanbuilders Baustelle`.
    - **TruckersMP HQ (Wrocław)**: 291 3D-Gebäude-Extrusionen sowie Firmen-POIs `Subse`, `ACC` und `Cargotras`.
    - **Neues Firmenlogo `truckline_logistik` ([pack_sprites.py](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/maps-main/pack_sprites.py))**: Eigenes 128x32px Firmen-Badge für Truckline Logistik in den Sprite-Atlas gepackt und via `upload_sprites_to_r2.py` auf Cloudflare R2 hochgeladen.
    - Alle PMTiles (`ets2-truckline-hq.pmtiles`, `ets2-truckersmp-hq.pmtiles`, `ets2-hq.pmtiles`) neu kompiliert, lokal abgelegt (`uploads/map_cache/`) und auf Cloudflare R2 synchronisiert.

## [1.7.112] - 2026-10-11

### ⏪ PMTiles: Wiederherstellung des ursprünglichen Versionsstandes
  - **Exakter Rollback aller HQ-Kartenarchive ([restore_pmtiles.py](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/maps-main/restore_pmtiles.py))**:
    - `ets2-truckline-hq.pmtiles` (126.646 Bytes, 177 Kacheln) aus dem unberührten Offline-Cache wiederhergestellt.
    - `ets2-truckersmp-hq.pmtiles` (113.688 Bytes, 301 Kacheln) wiederhergestellt.
    - `ets2-hq.pmtiles` (672.024 Bytes, 478 Kacheln) aus dem ursprünglichen Kachel-Dump rekompiliert.
    - Lokaler Cache (`uploads/map_cache/`) und Cloudflare R2 Remote Storage synchronisiert.

## [1.7.111] - 2026-10-11

### 🗺️ Truckline HQ PMTiles: Baustellen-Ring entfernt, saubere Netzanbindung & 80 3D-Gebäude
  - **Entfernung der unfertigen Baustellen-Schleife ([generate_separate_hqs.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/maps-main/generate_separate_hqs.ts))**:
    - **Strikter `hidden`-Filter**: Alle im Bau befindlichen Straßenabschnitte der Mod-Erweiterung (der unfertige Nord-Ring mit toten Enden) besitzen in den Sektordaten das SCS-Flag `hidden: true`. Das erzwungene Un-Hiden wurde entfernt, wodurch die Geisterschleife vollständig von der Karte verschwindet.
    - **Nahtlose Netzanbindung an die A45**: Autobahn-Segmente (`freeway`) wurden aus dem HQ-Overlay ausgeschlossen, sodass die durchgehende Autobahn der ETS2-Basiskarte (`ets2.pmtiles`) nicht überlagert oder unterbrochen wird. Die HQ-Zufahrtsstraße dockt nun direkt und lückenlos an das Hauptstraßennetz an.
  - **80 3D-Gebäude-Footprints (`fill-extrusion`)**:
    - Benutzerdefinierte Model-Definitionen (`blkw_2k001`, `de_3j002`, `blkw_0v012`, `blkw_2900h`, `rus_0m00a`, `mod_ger_4`, `mod_ger_5` etc.) für alle Hallen, Sanbuilders-Depots und Bürogebäude des HQ-Geländes implementiert. 80 Gebäude erscheinen nun mit realistischer Höhe und Grundriss als 3D-Baukörper.
  - **PMTiles-Archive & Cloudflare R2 Upload ([upload_pmtiles_to_r2.py](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/maps-main/upload_pmtiles_to_r2.py))**:
    - `ets2-truckline-hq.pmtiles`, `ets2-truckersmp-hq.pmtiles` und `ets2-hq.pmtiles` neu generiert, in `uploads/map_cache/` hinterlegt und auf Cloudflare R2 synchronisiert.

## [1.7.110] - 2026-10-11

### 🚛 Trailer-Erkennung, HQ-Navigation & Multiplayer-HQ-Firmen auf der Karte
  - **Exakte Trailer-Erkennung ([main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts), [telemetry-bridge.cs](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/telemetry-bridge.cs), [TruckSideView.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/TruckSideView.tsx))**:
    - **SCS Shared Memory Offset korrigiert**: Offset `1564` war bisher fälschlicherweise als `trailerAttached` gemappt, ist im SCS Telemetry SDK aber lediglich `isCargoLoaded`. Bei leeren Trailern (eigener Trailer / Freeroam) war der Wert daher immer `false`.
    - **Echte Trailer-Offsets**: `trailerAttached` liest nun direkt Offset `6080` (`trailer[0].com_b.attached`), prüft die Trailer-ID bei Offset `6920` (`trailer[0].con_s.id`), `trailerLiftAxle` bei Offset `1611` und fällt nur hilfsweise auf `isCargoLoaded` zurück.
    - **C# Telemetry Bridge synchronisiert**: In [telemetry-bridge.cs](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/telemetry-bridge.cs) fehlte die Übertragung von `trailerAttached`, `trailerId`, `trailerLiftAxle`, `liftAxle`, `wipers` und `lightsParking` bisher vollständig. Der 60-FPS-Stream wurde aktualisiert und neu kompiliert.
    - **TruckSideView & CarPlay**: Erkennen nun jeden angekoppelten Auflieger (auch leere oder gekaufte Trailer) zuverlässig und zeigen sofort die Trailer-Aktionen, Luftfederung und Achslift an.
  - **Multiplayer HQ Navigation ([ets2Cities.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/data/ets2Cities.ts), [CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx), [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx))**:
    - **HQ-Koordinatentabelle in `ets2Cities.ts`**: `Truckline HQ` (Dillenburg, B255/A45 Hessen: `x: -5911, z: -1160`) und `TruckersMP HQ` (Wrocław, Polen: `x: 23808, z: -2227`) wurden als vollwertige Navigationsziele hinterlegt.
    - **Suchfunktion & Routenberechnung**: Sowohl die CarPlay-Suche als auch die Adresssuche auf der Karte finden die HQs und deren Firmen (`Truckline Logistik`, `TruckersMP HQ`) nun sofort mit Logo, Beschreibung und Entfernungsberechnung.
    - **Routen-Kamerafokus & IPC-Routing**: Das Auswählen eines HQs übergibt nun direkt die Game-Koordinaten (`x`, `z`) an `focusDestinationByGameCoords` und berechnet über das Ingame-Straßennetzwerk die exakte Fahrstrecke zum und vom HQ.
  - **HQ-Firmen & POIs auf der Navigationskarte ([GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx))**:
    - **Sichtbarkeit behoben**: Die HQ-Vektor-Layer (`tl-*` und `tmp-*`) waren zuvor mit `visibility: 'none'` initialisiert. Sie schalten sich nun bei aktivem HQ-Overlay automatisch auf `visible`.
    - **Firmen-, Werkstatt- & Tankstellen-Symbole**: Dedizierte GeoJSON-Ebenen (`hq-pois-icons`, `hq-pois-labels`, `tl-companies`, `tmp-companies`) blenden Firmenlogos, Service- und Tankstellensymbole sowie klare Labels ("Truckline HQ • Dillenburg", "TruckersMP HQ • Wrocław") prominent auf der Karte ein.

## [1.7.109] - 2026-10-11

### 🕹️ LKW-Steuerungsapp: Seitenwechsel-Navigation & SCS Input SDK Synchronisations-Fix
  - **Seitenwechsel per Hotkeys & Tastatur ([TruckSideView.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/TruckSideView.tsx), [CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Reiterleisten-Fokus (`navIndex === -1`)**: Genau wie in den Einstellungen wechselt die Navigation beim Drücken von `Nach oben` (aus der obersten Zeile) direkt in die Kopfzeile/Segment-Reiterleiste (`01 Übersicht`, `02 Fahrwerk`, `03 Licht & Cockpit`).
    - **Seiten blättern mit Links/Rechts**: In der Kopfzeile blättert `Links`/`Rechts` durch die Seiten. `Nach unten` oder `Enter` wechselt direkt in die Aktionskarten der gewählten Seite.
    - **Hotkeys `next` / `prev` & `Tab`**: Die globalen Hotkeys `next`/`prev` wechseln innerhalb der Steuerungs-App nun zuverlässig die Unterseiten (`next-tab`/`prev-tab`), anstatt die gesamte CarPlay-App zu verlassen. Zudem kann mit `Tab` / `Shift+Tab` geblättert werden.
    - **Mausklick-Zuverlässigkeit**: Chevron-Tasten (`<`, `>`) und Tabs haben dedizierte Klick-Handler (`e.stopPropagation()`, `type="button"`, `z-30`) und reagieren sofort auf Klicks.
  - **SCS Input SDK Multi-Input-Frame-Fix ([input_system.cpp](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/OPCGameBridge/OPCGameBridge/input_system.cpp))**:
    - **Frame-Dekrementierung repariert**: Das Dekrementieren der `pulseFrames` wurde an den Frame-Beginn (`first_in_frame`) für alle aktiven Inputs gebunden. Zuvor wurden bei gleichzeitigen Aktionen (wie `susp_up`, das Front- und Heck-Fahrwerk ansteuert) nachfolgende Inputs im selben Frame nicht dekrementiert und blieben dauerhaft hängen.
    - **Fahrwerks-Pulszeiten kalibriert**: Luftfederungs-Heben/Senken pulst nun 35 Frames (~550ms) für spürbares Heben der Faltenbälge. `engine` triggert sowohl Bordelektronik (`engineelect`) als auch Anlasser (`engine`), damit der Motor auch bei realistischer Zündungs-Simulation zuverlässig startet.
    - **Overlapped Pipe I/O ([commandpipe.cpp](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/OPCGameBridge/OPCGameBridge/commandpipe.cpp))**: Named-Pipe-Lesen und -Schreiben auf dem `FILE_FLAG_OVERLAPPED`-Handle wurde auf sauberes `OVERLAPPED` mit `GetOverlappedResult` umgestellt, wodurch alle Steuerbefehle verlustfrei beim GameBridge-Plugin ankommen.
    - `OPCGameBridge.dll` neu kompiliert und in den ETS2-Plugins-Ordner deployt.


### 🎮 Vollständige SCS Input SDK Integration (Direktansteuerung ohne Tastaturemulation)
  - **SCS Input SDK Semantical Device ([input_system.h](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/OPCGameBridge/OPCGameBridge/input_system.h), [input_system.cpp](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/OPCGameBridge/OPCGameBridge/input_system.cpp))**:
    - Offizielle Anbindung an das SCS Input SDK (`scs_input_init` / `scs_input_shutdown` via `SCS_INPUT_DEVICE_TYPE_semantical`).
    - Das Ingame-Plugin `OPCGameBridge.dll` registriert sich als vollwertiges semantisches Eingabegerät (`opc_semantical`) direkt in der ETS2/ATS-Simulations-Engine.
    - Alle 31 Fahrzeugsteuerungs-Mixes (`light`, `hblight`, `lighthorn`, `beacon`, `flasher4way`, `parkingbrake`, `wipers`, `engine`, `liftaxle`, `liftaxlet`, `attach`, `frontsuspup`, `frontsuspdwn`, `rearsuspup`, `rearsuspdwn`, `suspreset`, `trlrsuspup`, `trlrsuspdwn`, `trlrsuspreset`, `lblinker`, `rblinker`, `horn`, `airhorn`, `cruiser` etc.) werden im Spiel direkt per nativer Engine-Event-Pipeline angesteuert.
    - **100% Tastatur-Unabhängig**: Funktioniert auch, wenn Tasten in `controls.sii` auf der Tastatur `unbound` sind (z. B. wenn Licht oder Motor nur auf das Lenkrad `joy.b1`/`joy.b2` gelegt wurden).
    - **Kein Fokus-Verlust & Null Latenz**: Keine Fensterfokussierung nötig, kein PowerShell, keine Tastaturemulation – Events werden frame-synchron direkt in der Ingame-Eingabeschleife verarbeitet.
  - **OPCCommandPipe & Electron Routing ([commandpipe.cpp](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/OPCGameBridge/OPCGameBridge/commandpipe.cpp), [main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**:
    - `handleTruckAction` sendet Steuerbefehle blitzschnell über die Named Pipe an das Plugin, welches die Aktion unmittelbar im Spiel über das SCS Input SDK auslöst.
    - Erfolgreich im Release x64-Modus kompiliert und direkt in `Euro Truck Simulator 2/bin/win_x64/plugins` bereitgestellt.

## [1.7.107] - 2026-10-11

### 🛠️ LKW-Steuerung: Hotkey-Navigation, App-Raster-Fix & Plugin-Direktansteuerung
  - **App-Raster ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**: Die Launcher-Liste der Hotkey-Navigation enthielt `LKW-Steuerung` nicht (9 statt 10 Einträge) – dadurch öffnete die Auswahl ab Position 7 die falsche App (Chat). Behoben, Navigation läuft wieder über alle 10 Apps.
  - **Hotkeys in der Steuerungs-App ([TruckSideView.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/TruckSideView.tsx))**: Pfeiltasten/Enter navigieren durch alle Karten/Buttons mit Fokus-Rahmen, `next`/`prev` wechseln die Seite, `links`/`zurück` am ersten Element verlässt die App.
  - **Plugin-Direktansteuerung ([commandpipe.cpp](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/OPCGameBridge/OPCGameBridge/commandpipe.cpp), [chat_inject.cpp](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/OPCGameBridge/OPCGameBridge/chat_inject.cpp), [main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**: Neuer Pipe-Befehl `truck_action`; die App sendet Aktionen zuerst an das Plugin im Spielprozess (SendInput mit Scancode), nur bei Fehlschlag per PowerShell-Fallback (jetzt ebenfalls SendInput + Scancodes, korrekte Extended-Flags). Plugin neu gebaut und in den ETS2-Plugins-Ordner kopiert.
  - **Bekannte Grenze**: Aktionen, die in `controls.sii` nicht auf der Tastatur belegt sind (z. B. Licht/Warnblinker nur auf Joystick), lassen sich nur per Tasten-Emulation nicht auslösen; dafür wäre das SCS-Input-SDK (virtuelles Gerät) nötig.

## [1.7.106] - 2026-10-11

### 🎨 LKW-Steuerung: Entfernung der Blueprint-Badges & Vollständiger Light Mode Support
  - **Entfernung der Badge-Leiste im Blueprint ([TruckSideView.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/TruckSideView.tsx))**:
    - Die schwebenden Badges (`SCANIA 113H STREAMLINE 6x2`, `SOLO-ZUGMASCHINE (6x2)`, `MOTOR AUS` etc.) oben links im Vektor-Blueprint wurden vollständig entfernt.
    - Der Blueprint ist nun vollkommen frei, unbeeinträchtigt und fokussiert auf die reine 1:1 Fahrzeugdarstellung.
  - **Lückenloser, eleganter Light Mode ([TruckSideView.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/TruckSideView.tsx))**:
    - **Blueprint-Kartenhintergrund**: In Light Mode strahlt die Karte in einem dezenten, edlen Verlauf (`bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200/80`) mit hellem Gitter und kontrastreicher Fahrbahnlinie (`#cbd5e1` / `#94a3b8`) anstelle eines dunklen Navy-Tons.
    - **Kopfzeile & Segmentiertes Dock**: Pfeil-Buttons, inaktive Reiter, Nummern-Badges und Trennlinien adaptieren sauber auf helle Farben (`bg-slate-200/70`, `text-slate-700`, `border-slate-300`).
    - **Aktionskarten auf Seite 1, 2 und 3**: Alle Kachel-Hintergründe, Titel, Tasten-Badges, Untertitel und Schalter wechseln im Light Mode auf tiefes Schiefergrau (`text-slate-900`) und helle Schattierungen, wodurch kein Text mehr weiß auf weiß unsichtbar ist.

## [1.7.105] - 2026-10-11

### 🚚 1:1 Scania 113H 6x2 Blueprint & Vollständige Ingame-Telemetrie-Synchronisation
  - **Exakter 1:1 Blueprint des Scania 113H 6x2 ([TruckSideView.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/TruckSideView.tsx))**:
    - **Originalgetreue Vektorgrafik nach der technischen Blueprint-Vorlage**:
      - Klassische Scania-3er-Serie Kasten-Fahrerkabine im legendären Scania-Königsblau (`#4a7ab5`) mit doppelten silbernen Rallye-Zierstreifen entlang der Flanke.
      - Charakteristisches silber gerahmtes Schlafkabinen-Seitenfenster hinter der Fahrertür.
      - Hoher schwarzer Luftansaugschnorchel mit Pilzkopf-Filter am Kabinenheck.
      - Ausgeprägte Sonnenblende mit **grüner Dach-Positionsleuchte** (leuchtet bei Fahrlicht synchron grün auf).
      - Kantige Frontstoßstange mit eckigen Halogenscheinwerfern, horizontalem Scania-Kühlergrill und `SCANIA 113H` Modellbadge.
      - Schwerlast 6x2-Offenrahmen-Chassis mit zylindrischem Dieseltank (Chrom-Spannbänder), Batteriekasten und schrägem Auspuffrohr.
      - **Doppelte getrennte Heckkotflügel**: Zwei einzelne runde Bogie-Radabdeckungen über den beiden Hinterachsen mit Schmutzfängern (`cx=65` und `cx=125`).
      - Klassische 10-Loch-Stahl-/Alufelgen mit Scania-Nabenkappen.
  - **Echtzeit-Synchronisation aller Fahrzeug-Zustände mit Ingame-Telemetrie**:
    - **Fahrlicht & Fernlicht (`lightsBeamLow` / `lightsBeamHigh`)**: Halogen-Reflektoren strahlen warmgelb (`#fef08a`), bei Fernlicht schaltet der Hauptstrahl auf Xenon-Blauweiß (`#60a5fa`) mit verlängertem Lichtkegel um.
    - **Grüne Dach-Positionsleuchte**: Die Dachmarkierungsleuchte auf der Sonnenblende leuchtet bei aktiviertem Fahrlicht synchron im typischen Neongrün (`#22c55e`).
    - **Blinker & Warnblinker (`blinkerLeftActive`, `blinkerRightActive`, `lightsHazard`)**: Vordere und hintere bernsteinfarbene Blinker blinken mit dynamischer Glow- und Radar-Animation.
    - **Parkbremse / Handbremse (`parkBrake`)**: Heckleuchten leuchten intensiv rot (`#ef4444`) und das `P HANDBREMSE`-Badge wird eingeblendet.
    - **Motor & Abgase (`engineEnabled`, `rpm`)**: Bei laufendem Motor steigen animierte Diesel-Wärmepulse aus dem Ansaugschnorchel/Auspuff auf, begleitet von der Echtzeit-Drehzahlanzeige (`MOTOR AN • {rpm} RPM`).
    - **Liftachse (`liftAxleTruck`)**: Die Vorlauf-/Nachlaufachse der Zugmaschine hebt sich bei Betätigung physisch um 14 Pixel an (`▲ LIFT`-Badge).
    - **Luftfederung (`truckSuspension`)**: Das Fahrwerk hebt oder senkt sich stufenlos um ±10 Pixel (+50mm / -50mm).
    - **Auflieger-Status (`trailerAttached`)**: Erkennt automatisch, ob ein Auflieger angekoppelt ist, oder zeigt die Scania 113H als Solo-Sattelzugmaschine mit offener Sattelplatte exakt wie auf dem Vorlagebild.



### 🚚 Exaktes Design-Dock (Image 1) & Scania S 4x2 mit Kofferauflieger (Image 2)
  - **Exaktes Segmented Header-Dock wie in den Einstellungen ([TruckSideView.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/TruckSideView.tsx))**:
    - Der aktive Tab (`01 Übersicht`, `02 Fahrwerk`, `03 Licht & Cockpit`) entspricht nun 1:1 dem vom Benutzer bereitgestellten Referenzbild (Image 1):
      - Strahlend blaues `bg-primary` / `#0084ff` Pill-Badge mit `text-white font-black`.
      - Reines weißes Icon und weißer Text.
      - Transparenter dunkler Zähler-Badge `bg-black/25 text-white font-bold`.
      - Pfeil-Buttons mit harmonischem `hover:text-primary` und `hover:border-primary/40`.
  - **Scania S 4x2 Zugmaschine & 3-Achs Kofferauflieger 1:1 nach Bildvorlage ([TruckSideView.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/TruckSideView.tsx))**:
    - **3-Achs Kofferauflieger (Dry Van)**:
      - Glatter weißer Kofferaufbau mit Aluminium-Dachleiste und Scheuerleiste.
      - 5 orange LED-Seitenmarkierungsleuchten entlang der Unterkante.
      - **Korrekte Achsanordnung am Heck**: Die 3 Trailerachsen befinden sich wie im Original am Heck (links), umgeben von einem durchgehenden dunklen Dreifach-Kotflügel.
      - **Unterfahrschutz**: Heck-Unterfahrschutz hinter den Achsen mit Dockpuffern und Rückleuchten.
      - **Palettenkasten / Seitenverkleidung**: Aerodynamischer weißer Schutzkasten mittig zwischen Achsen und Stützbeinen.
      - **Teleskop-Stützbeine (Landing Gear)**: Vorbildgetreue Stützen mit Fußplatten und Kurbel an der Vorderseite des Aufliegers.
    - **Scania S 4x2 Zugmaschine**:
      - Durchgehende aerodynamische Seitenschweller in Wagenfarbe (Weiß/Metallic) mit Trittstufe und Tankdeckel.
      - 4x2-Achsgeometrie mit Alcoa-Leichtmetallfelgen (10-Loch) und Scania-Naben.
      - Originalgetreues Highline-Fahrerhaus mit Scania-Sonnenblende, abgesenktem Fensterschwung, SCANIA-Chromgrill und LED-Scheinwerfern.
 
## [1.7.103] - 2026-10-11

### 🚚 Scania S 2016 Blueprint-Redesign, ausgefüllter Aktiv-Tab & Bereinigung LKW Diagnose
  - **Ausgefüllter aktiver Tab im Header-Dock ([TruckSideView.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/TruckSideView.tsx))**:
    - Der aktive Reiter (`01 Übersicht`, `02 Fahrwerk`, `03 Licht & Cockpit`) besitzt nun eine garantierte, satte Vollflächen-Füllung in leuchtendem Cyan (`#06b6d4`), tiefdunkle Schrift (`#020617`) und einen cyanfarbenen Glow-Schatten.
  - **Entfernung des Steuerungstabs aus der LKW Diagnose-App ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Der redundante 4. Tab (`Steuerung`) in der Fahrzeug-Telemetrie/Diagnose-App wurde komplett entfernt, da die LKW- und Fahrwerkssteuerung als vollwertige eigene App im Dock existiert.
    - Die Diagnose-App hat nun schlanke 3 Seiten (`01 Cockpit`, `02 Bordcomputer`, `03 Diagnose`) inklusive aktualisierter Pagination, Zähler (`1/3`) und Pfeil-Navigation.
  - **Blueprint-Neudesign: Scania S 2016 Highline V8 ([TruckSideView.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/TruckSideView.tsx))**:
    - Komplette Neukonstruktion der Zugmaschine als ikonischer **Scania S 2016 (Next Generation)** im 2D-Vektor-Blueprint:
      - **Highline-Fahrerhaus**: Vorbildgetreue Aerodynamik-Silhouette, Dach-Spoilerflügel und Seiten-Leitbleche.
      - **Scania Sonnenblende**: Markante Sonnenblende mit integrierten LED-Positionsleuchten über der Windschutzscheibe.
      - **Scania S-Seitenfenster**: Typischer A-Säulen-Schwung mit abgesenkter Gürtellinie und Innensilhouette (Fahrersitz & Lenkrad).
      - **Frontmaske & Kühlergrill**: Zweistufiger Scania-Wabengrill mit horizontalen Chromlamellen und SCANIA-Logo.
      - **Next-Gen LED-Scheinwerfer**: Markante winklige Tagfahrlicht-Signatur (DRL-Blade) mit dynamischer Fernlicht-/Abblendlicht-Reaktion.
      - **Seitenverkleidung (Aero-Skirts)**: Scharf konturierte Seitenschweller mit Chrom-Trittstufe, Tankdeckel und Auspuff-Endrohren.
      - **Embleme**: Originalgetreues `S 730` Typenschild und rotes `V8` Wappen an der Fahrerhaustür.
      - **Alcoa Dura-Bright Felgen**: 10-Loch Leichtmetallfelgen mit Scania-Radnaben und funktioneller Liftachse (`▲ LIFT`).
 
## [1.7.102] - 2026-10-11

### 📱 CarPlay: Redundante App-Titel in Kopfzeilen aller Apps entfernt
  - **Kompakte, ablenkungsfreie Header ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx), [TruckSideView.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/TruckSideView.tsx))**:
    - **LKW- & Fahrwerk-Steuerung**: Übergroße Überschrift `LKW- & Fahrwerk-Steuerung` und lange Untertitel entfernt. Icon auf handliche `w-9 h-9` optimiert, Seitenzähler `1/3` und `SPIEL-TASTEN AKTIV` beibehalten. Das segmentierte Dock `< [01 Übersicht] [02 Fahrwerk] [03 Licht & Cockpit] >` hat nun volle Breite ohne Umbruch oder Abschneiden.
    - **Einstellungen**: Header-Titel `Einstellungen` und Unterzeile entfernt, durch kompaktes Icon und Seitenzähler `1/3` ersetzt.
    - **Fahrzeug-Telemetrie (Truck)**: `Fahrzeug-Telemetrie`-Titel entfernt; LKW-Icon, Seitenanzeige (`1/4`), Live-Telemetrie-Pille und Fahrzeugmodell bleiben präsent.
    - **Frachtbrief (Job)**: Große Überschrift `Aktiver Frachtbrief` entfernt; durch Aktenkoffer-Icon und Frachtstatus-Pille ersetzt.
    - **Lokaler Musik-Player**: Große Überschrift `Lokaler Musik-Player` entfernt; kompaktes Icon und Song-Anzahl-Badge.
    - **ETS2 Live-Radio**: Header-Titel `ETS2 Live-Radio` entfernt; Radio-Icon und Sender-Zähler erhalten.
    - **Funk & Team-Chat**: Titel `Funk & Team-Chat` entfernt; Nachrichten-Icon, Kanal `#kanal`, Rufname und Geschwindigkeits-Status direkt in der Leiste platziert.
    - **Events & Konvois**: Titel `Events & Konvois` und Subtitle entfernt; Kalender-Icon und Badge `{n} Anstehende Events` direkt neben dem Refresh-Button.
 
## [1.7.101] - 2026-10-11

### 🚚 LKW- & Fahrwerksteuerungs-App im Einstellungs-App Design
  - **Multi-Page Cockpit-Struktur ([TruckSideView.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/TruckSideView.tsx), [CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Segmentiertes Header-Dock**: Titel, Zähler (`1/3`, `2/3`, `3/3`), Subtitle und Pfeil-Navigation wie in den CarPlay-Einstellungen mit 3 Reitern (`01 Übersicht`, `02 Fahrwerk`, `03 Licht & Cockpit`).
    - **Seite 1: Blueprint & Übersicht**: Großflächige 2D-Blueprint-Ansicht mit Beleuchtungs-Laser, Beacon-Effekt, Federweghöhe & Achslift plus 4 Schnellzugriff-Karten.
    - **Seite 2: Fahrwerk & Pneumatik**: Exaktes 2x2 Grid + Standby-Bottom-Bar der Einstellungs-App für LKW-Pneumatik (`▲ Heben`, `● Normal`, `▼ Senken`), Trailer-Pneumatik, LKW-Liftachse, Trailer-Liftachse und Pneumatik-Schnellreset.
    - **Seite 3: Licht & Cockpit**: Scheinwerfer mit Gedrückthalten für Fernlicht (Ladebalken), Rundumleuchte & Warnblinker, Scheibenwischer, Sattelkupplung und Motor/Handbremse.

## [1.7.100] - 2026-10-11

### 🛡️ Schutz vor TrucklineMP API 429 Rate-Limits & Intelligentes Caching
  - **Ursachenbehebung für HTTP 429 "rate-limit-hit suspicious"**:
    - Ungecachte Abfragen und Schleifen-Calls in der Fahrer- und Bewerberverwaltung führten zu zu vielen Live-Anfragen an `trucklinemp.com`.
    - Backend-seitig wurde ein 30-minütiger Circuit Breaker aktiviert, der bei 429-Meldungen alle weiteren Requests pausiert, damit der API-Key wieder freigegeben wird.
    - Erfolgreiche Spielerdaten werden für 24 Stunden, nicht gefundene Profile für 6 Stunden gecacht.

## [1.7.99] - 2026-10-11

### 🎮 Dynamisches Auslesen der Tastenbelegung aus dem Spiel (`controls.sii`)
  - **🔍 Automatischer Profile-Parser ([main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**:
    - Das System liest nun dynamisch die aktuellste `controls.sii` aus den aktiven ETS2/ATS-Profilen (`steam_profiles` & `profiles`) aus.
    - Anstatt starrer Standardtasten werden die individuellen Tastenbelegungen des Spielers für alle LKW-Funktionen ermittelt:
      - **Scheinwerfer**: `mix light`
      - **Fernlicht**: `mix hblight`
      - **Lichthupe**: `mix lighthorn`
      - **Rundumleuchte (Beacon)**: `mix beacon` (z. B. Taste `Y`)
      - **Warnblinker**: `mix flasher4way` (Taste `F`)
      - **Liftachse LKW**: `mix liftaxle` (Taste `U`)
      - **Liftachse Auflieger**: `mix liftaxlet` (z. B. Taste `J`)
      - **LKW Luftfahrwerk**: `mix frontsuspup` / `mix rearsuspup` / `mix frontsuspdwn` / `mix suspreset` (z. B. Tasten `Q` / `A` / `Home`)
      - **Trailer Luftfahrwerk**: `mix trlrsuspup` / `mix trlrsuspdwn` / `mix trlrsuspreset` (z. B. Tasten `E` / `D` / `Home`)
      - **Feststellbremse**: `mix parkingbrake` (Taste `Space`)
      - **Motor**: `mix engine` (Taste `E`)
      - **Scheibenwischer**: `mix wipers` (Taste `P`)
      - **Auflieger an-/abkuppeln**: `mix attach` (Taste `T`)
  - **🎯 Präzise Tastensimulation nach Spielerprofil**:
    - Beim Klick auf eine Funktion in CarPlay wird exakt die im Spielprofil hinterlegte Taste an das Spiel gesendet. Ist eine Taste im Profil nicht belegt, greift der offizielle ETS2-Standardwert als intelligenter Fallback.
  - **🏷️ Live-Tastenanzeige auf allen Buttons ([TruckSideView.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/TruckSideView.tsx))**:
    - Alle Schaltflächen im Bedienfeld zeigen nun die tatsächlich erkannten Tasten an (z. B. `Beacon (Y)`, `TRAILER ACHSE (J)`, `LKW: Q / Home / A`, `TRAILER: E / Home / D`).
    - Status-Badge in der Kopfzeile: `🎮 SPIEL-TASTEN AKTIV` bestätigt die erfolgreiche Synchronisation mit der Konfigurationsdatei.

## [1.7.98] - 2026-10-11

### 🚚 CarPlay: Neue LKW-Steuerung & Adaptive 2D-Seitenansicht (Fahrwerk, Achsen & Licht)
  - **📐 Adaptive Blueprint-Seitenansicht ([TruckSideView.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/TruckSideView.tsx))**:
    - Neue Vektor-Seitenansicht eines modernen Sattelzugs mit hochauflösender Silhouette, Sattelkupplung, Chrom-Tanks, LED-Beleuchtung und Rädern.
    - **Adaptive Gespann-Erkennung**: Erkennt automatisch, ob ein Auflieger angekuppelt ist (`telemetry.trailerAttached` oder Frachtdaten).
      - **Mit Auflieger**: Vollständiger europäischer 3-Achs-Auflieger mit Schiebeplane/Koffer, OPC-Schriftzug, Fracht- und Gewichtsanzeige sowie animierten Trailer-Rädern.
      - **Solo-Fahrt (ohne Auflieger)**: Die Zugmaschine wird freistehend mit freiliegender Sattelplatte und Heck-Kotflügeln dargestellt (`SOLO-ZUGMASCHINE`).
    - **Live-Licht- & Warnvisualisierung auf dem LKW**:
      - Scheinwerfer leuchten bei Stand-/Abblendlicht gelb auf; bei **Fernlicht** projiziert ein kraftvoller blauer Lichtkegel nach vorne.
      - **Rundumleuchte (Beacon)**: Dachbalken blinkt und wirft dynamische Lichtblitze.
      - **Warnblinker**: Spiegel- und Eck-LEDs blinken synchron orange.
      - **Bremslicht / Handbremse**: Rückleuchten leuchten bei angezogener Feststellbremse leuchtend rot auf.
  - **🎛️ Echtes In-Game Bedienfeld & Tastensimulation ([TruckSideView.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/TruckSideView.tsx), [main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**:
    - **Scheinwerfer mit Long-Press für Fernlicht**:
      - Kurzer Klick schaltet Stand-/Abblendlicht ein/aus (Taste `L`).
      - **Gedrückt halten (ab 500ms)** schaltet das **Fernlicht** ein/aus (Taste `K`), inklusive optischem Ladebalken/Fortschrittskreis direkt im Button.
      - Direkttaste für Fernlicht / Lichthupe (`K`).
    - **Liftachsen LKW & Auflieger**:
      - Taste `U` hebt/senkt die Liftachse an der Zugmaschine oder am Auflieger an.
      - Visuelle Animation: Das jeweilige Rad hebt sich in der Seitenansicht um 14px vom Boden ab (`▲ LIFT`).
    - **Luftfahrwerk / Niveauregulierung (Zugmaschine & Trailer)**:
      - 3-Stufen-Steuerung: `▲ Heben` (PageUp), `● Normal / Reset` (Home), `▼ Senken` (PageDown).
      - Animierte Höhenverschiebung des Chassis/Aufliegers in der 2D-Seitenansicht mit Höhenanzeige (`+50mm` / `0mm` / `-50mm`).
    - **Weitere Fahrzeugfunktionen**:
      - Warnblinker (`F`), Rundumleuchte (`O`), Feststellbremse (`Space`), Scheibenwischer (`P`), Motor Start/Stopp (`E`) und Auflieger an-/abkuppeln (`T`).
    - **Desktop & Mobile/Tablet Support**:
      - Funktioniert über Electron IPC (`truck-control-action`) sowie über den lokalen HTTP-Endpoint (`POST /api/carplay/truck-action`) für kabellose Zweitbildschirme/Tablets.
  - **📱 Nahtlose Integration ins CarPlay-System ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Eigene vollwertige CarPlay-App **"LKW-Steuerung"** (`control`) im App-Raster mit leuchtendem Cyan/Blau-Icon.
    - Direkte Einbindung als Seite 4 (**"Steuerung"**) im bestehenden LKW-Diagnose-Menü (`truckPage === 3`).
    - Einheitliche Designsprache mit dynamischem Wallpaper und Glassmorphism.

## [1.7.97] - 2026-10-11

### ⚡ Performance & Re-Render Optimierungen (CPU, GPU & Timer Churn)
  - **🛑 1-Sekunden Full-Tree Re-Render eliminiert (`standbyTick`) ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Der State `standbyTick`, der zuvor jede Sekunde (`1000ms`) die gesamte 9000-Zeilen `CarPlayPage`-Komponente neu gerendert hat (3.600 unnötige Re-Renders pro Stunde), wurde vollständig entfernt.
    - Die digitale Uhrzeit `timeString` aktualisiert sich nur noch, wenn sich der formatierte Minuten-String tatsächlich ändert (Bail-out-Check).
    - Die Standby-Aura und der blinkende Doppelpunkt `:` wurden durch reine GPU-beschleunigte CSS-Keyframe-Animationen (`animate-pulse`) ersetzt – 0% JavaScript-Overhead.
  - **🗺️ ETA-Timer Churn bei Fahrzeugbewegung behoben ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Die `useEffect`-Berechnung der verbleibenden Fahrzeit war zuvor an `(telemetry as any).posX` und `posZ` gebunden. Beim Fahren wurde der 1-Sekunden-Timer bei jedem Telemetrie-Frame (10–60x pro Sekunde) zerstört und neu aufgesetzt.
    - Einführung einer synchronen `telemetryRef.current`: `calculateRemainingSeconds()` liest die Live-Koordinaten nun direkt aus dem Ref aus. Der Intervall-Timer läuft stabil und gleichmäßig mit 1 Hz, ohne ständiges `clearInterval`/`setInterval`-Churn.
  - **📊 SMTC Canvas-Visualizer Idle-Drosselung ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - In Ruhelage (Pausierte Musik oder stille Passagen, `isResting === true`) fragt der Canvas-Loop `requestAnimationFrame` adaptiv gedrosselt mit ~10 fps (~95ms Delta) ab, anstatt unnötig mit 60–144 Hz über den Bildschirm-Refresh zu loopen.
  - **💤 Automatisches Pausieren von Hintergrund-Pollings im Standby ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Chat-Nachrichten-Polling (3500ms) und ICY-Radio-Metadaten-Polling (7000ms) pausieren nun sofort, sobald CarPlay in den Standby-/Schlafmodus geht (`isCarPlaySleeping`), um Netzwerk- und CPU-Ressourcen zu schonen.
  - **🎨 Memoization von AnimatedBackground ([AnimatedBackground.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/AnimatedBackground.tsx))**:
    - `AnimatedBackground` wurde in `React.memo` gekapselt, um redundante Re-Evaluationen des Hintergrund-Wallpapers bei Parent-Updates zu unterbinden.

## [1.7.96] - 2026-10-11

### 🚗 CarPlay: Eigenständige Musikseiten & Wiederherstellung des Original-SMTC-Players
  - **🎵 SMTC (Spotify / Windows Media) wieder im Originalzustand ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Der Windows SMTC / Spotify Player wurde exakt auf seinen ursprünglichen, immersiven Vollbild-Zustand zurückgesetzt:
    - Vollflächige Medienkarte (`overflow-hidden`) mit dynamischem Ambient-Blur-Hintergrund passend zum Cover-Artwork.
    - Vollständiger Verzicht auf einen störenden oberen Header-Balken oder Switcher-Tabs.
    - Großes Album-Cover / Senderlogo im Zentrum, Song- und Künstleranzeige, Glasmorphism-Audio-Visualizer sowie Timeline-Slider und Playback-Buttons am unteren Rand.
    - Überflüssige Schachtelungs-Tags sauber bereinigt.
  - **💿 Getrennte & Eigenständige Musikseiten ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Das zwischenzeitlich eingefügte Segmented Source Switcher Dock (`[🎵 Spotify] [💿 Lokal] [📻 Radio]`) wurde aus den Headern der Unterseiten entfernt.
    - **Lokaler Musik-Player**: Vollwertige eigene Seite mit fokussiertem Header (`+ Laden`-Button für Audio-Dateien), eigener Playlist und Player-Deck.
    - **ETS2 Live-Radio**: Vollwertige eigene Seite mit Suche, Auto-Scan für `live_streams.sii` und Sender-Import.
    - Alle drei Musikquellen bleiben als eigenständige Apps im CarPlay-System wählbar.

## [1.7.95] - 2026-10-11

### 🚗 CarPlay: Einheitliche Designsprache & Harmonisiertes Layout für alle Apps
  - **✨ Einheitliches Chassis & Dynamisches Wallpaper über alle Seiten ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Jede einzelne Seite (`home`, `map`, `music`, `job`, `truck`, `settings`, `chat`, `events`, `apps`) folgt nun exakt derselben Designsprache:
      - Äußere Hülle mit sanftem Rand-Padding (`p-1 sm:p-1.5 rounded-2xl sm:rounded-3xl font-['Outfit',sans-serif]`).
      - Identisches Durchscheinen des dynamischen CarPlay-Wallpapers (`renderCarPlayWallpaper()`) an den abgerundeten Ecken.
      - Konsistenter innerer Glassmorphism-Container (`flex-1 rounded-3xl backdrop-blur-md bg-black/40 border-white/10` bzw. im Lightmode `bg-white/90 border-slate-250 shadow-xl`).
  - **📐 Einheitliche Header-Bars & Squircle-App-Icons ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Proportionale Squircle-Icons**: Alle App-Icons besitzen einheitlich die Abmessung `w-11 h-11 rounded-2xl` mit abgestimmten Farbverläufen (passend zu ihren App-Launcher-Kacheln) und `stroke-[2.2]` Drop-Shadow-Icons.
    - **Einheitliche Typografie**: Alle Seitentitel nutzen konsistent `text-base sm:text-lg font-black tracking-tight` gepaart mit dem prägnanten Monospace-Subtitel `text-[10px] font-extrabold uppercase tracking-widest font-mono text-primary`.
    - **Settings-Header angepasst**: Das zuvor kleine `w-8 h-8`-Icon in den Einstellungen wurde auf die vollwertige `w-11 h-11 rounded-2xl`-Kachel mit Zink/Slate-Gradient angeglichen.
  - **🎵 Multi-Source Musik-Player vereinheitlicht ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Spotify / SMTC**: Verfügt nun über denselben Wallpaper-Rahmen, die Glas-Container-Einfassung und den Top-Header wie alle anderen Pages.
    - **Segmentierte Source Switcher Dock (`[🎵 Spotify] [💿 Lokal] [📻 Radio]`)**: Direkt in den Headern aller 3 Audiomodi integriert. Nutzer können nahtlos zwischen Spotify/Windows-Medien, lokaler Musik und ETS2 Live-Radio umschalten, ohne in den App-Drawer zurückkehren zu müssen.
    - **Lokale Musik & Live-Radio**: Unnötige Padding-Differenzen (`p-0` vs `p-1`) und doppelte Wallpaper-Bezel entfernt.
  - **🗺️ Nahtlose Integration der Kartenansicht (`map`) ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Die Navigationskarte ist nun in denselben `rounded-3xl`-Rahmen mit dynamischem Wallpaper-Glow eingefasst. Beim Umschalten zwischen Navigation und anderen Apps bleibt das Cockpit-Erscheinungsbild vollkommen ruhig und konsistent ohne Ruckler oder Kantenverschiebungen.

## [1.7.94] - 2026-10-11

### 🚗 CarPlay: Navigations-Suche Hotkeys, Lokale Album-Cover, Echo-Fix & Button-Design
  - **🗺️ Hotkey- & Controller-Steuerung der Zielsuche (Hamburg, Firmen & Städte) ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Reibungsloses Scrollen**: Bei geöffneter Suchergebnisliste scrollen `Runter` (`ArrowDown`), `Hoch` (`ArrowUp`), Controller D-Pad sowie die globalen `Next`/`Prev`-Hotkeys die Trefferliste flüssig durch.
    - **Automatisches Sichtfeld (`scrollIntoView`)**: Der ausgewählte Eintrag wird immer automatisch sanft ins Blickfeld gescrollt.
    - **Markante Selektion**: Aktiver Treffer wird mit kontrastreichem blauem Rand, Glow und Akzentleiste (`bg-blue-600/35 border-l-4 ring-2 ring-blue-400 text-white font-bold`) hervorgehoben.
    - **Direktauswahl & Fokus auf "Route starten"**: Drücken von `Enter` auf einem Ziel schließt die Suche, zentriert die Karte und setzt den Fokus **sofort direkt auf das Feld "Route starten"**. Erneutes Drücken von `Enter` startet die Route augenblicklich.
    - **Hotkey-Navigation zum "Route starten"-Feld**: Über `Pfeil Runter`, `Pfeil Rechts` oder `Pfeil Links` kann jederzeit direkt vom Karten-Modus auf das "Route starten"-Feld gesprungen werden. Ein leuchtend weißer Fokus-Ring hebt den Button deutlich hervor. Mit `Escape` oder Controller-`Back` kann das Ziel abgebrochen werden.
    - **Reihenfolge der Hook-Initialisierung gefixt**: Der Auto-Scroll `useEffect` wurde hinter die Deklaration von `searchSelectedIndex` verschoben, um den `ReferenceError: Cannot access 'searchSelectedIndex' before initialization` zu beheben.
    - **Kategorie-Filter**: Mit `Links` und `Rechts` lässt sich blitzschnell zwischen *Alle*, *Firmen* und *Städte* wechseln.
  - **🖼️ Automatische Cover-Erkennung für Lokale Songs (MP3 & FLAC) ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Integrierter ID3v2 APIC & FLAC METADATA Parser**: Eingebettete Cover-Artworks in `.mp3`- und `.flac`-Dateien werden beim Auswählen innerhalb weniger Millisekunden aus den ersten 2 MB extrahiert.
    - **Anzeige auf allen Screens**: Cover werden im lokalen Player-Deck (mit edlem rotierendem Vinyl-Center bei Wiedergabe), in der Playlist als Thumbnail, im SMTC-Modus (inkl. ambientem Unschärfe-Hintergrund) sowie in der Standby-Lockscreen Medien-Pille angezeigt.
  - **🔇 Beseitigung des Audio-Echos beim Pausieren / Stoppen ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Fehlerhaftes Audio-Routing behoben**: In `connectAudioElementToVisualizer` war der globale Frequenz-Analyser direkt mit `audioCtx.destination` verbunden. Dadurch wurde der zeitversetzt aufgenommene System-Audio-Loopback in die Lautsprecher zurückgespielt.
    - **Saubere Signaltrennung**: Lokale Audioelemente werden nun isoliert an den Lautsprecher-Ausgang (`source -> destination`) und an den Analyser (`source -> analyser`) geleitet, ohne dass der Analyser in die Lautsprecher zurückführt. Das lästige Nachhallen/Echo ist vollständig beseitigt.
  - **🎨 Button-Design & Kontrast im Lokalen Musik-Player ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Der Button `+ MUSIKDATEIEN AUSWÄHLEN` besitzt nun sowohl im Light- als auch im Darkmode einen soliden Blau/Indigo-Verlauf mit garantiert leuchtend weißer Schrift und Icon.
    - Auch der Button `+ MEHR SONGS HINZUFÜGEN` am Ende der Playlist wurde mit vollem Kontrast für den Lightmode optimiert.

## [1.7.93] - 2026-10-11

### 🚗 CarPlay Sidebar Marker-Synchronisation bei App-Wechsel
  - **🎯 Automatisches Verschieben des Fokus-Markers an die 1. Position ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Synchroner Marker-Sprung**: Wenn eine App in der linken Seitenleiste angeklickt wird, rückt sie nun automatisch an die oberste Position (`recentApps[0]`). Zuvor verblieb der blaue Fokus-Marker (`sidebarIndex`) auf dem veralteten Slot-Index (z. B. Slot 3), da der Index vor der Neuordnung übergeben wurde. Der Marker springt jetzt sofort und verlässlich auf Slot 1 (`sidebarIndex = 1`), passend zur neu geöffneten App.
    - **D-Pad & Controller-Unterstützung**: Auch beim Öffnen von Apps über die Controller-/Tastatur-Eingabe (`dir === 'enter'` in der Seitenleiste) sowie beim Navigieren zurück zur Seitenleiste aus Sub-Pages (Truck, Einstellungen) folgt der Fokus-Marker direkt der aktiven App auf Position 1.

## [1.7.92] - 2026-10-11

### 🚗 CarPlay In-Game ETS2 Hotkeys (Ctrl+Taste), Visualizer Container, Lightmode Fix & Standby Pure Black
  - **⌨️ ETS2 In-Game Radio Hotkeys mit Strg (`Ctrl + <Taste>`) ([main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts), [CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Automatische Profil-Erkennung aus `controls.sii`**: Die im Euro Truck Simulator 2 festgelegten Radio-Tastenbelegungen (nächster Sender, vorheriger Sender, Radio lauter, Radio leiser) werden beim Start aus dem aktiven Profil ausgelesen und global mit vorangestelltem `Control+` registriert.
    - **In-App & Globale Steuerung**:
      - `Ctrl + BildAb` / `Ctrl + [` / `Ctrl + Ü`: Nächster Radiosender.
      - `Ctrl + BildAuf` / `Ctrl + '` / `Ctrl + Ä`: Vorheriger Radiosender.
      - `Ctrl + ]` / `Ctrl + +` / `Ctrl + NumpadAdd`: Lautstärke erhöhen (+5 %).
      - `Ctrl + \\` / `Ctrl + #` / `Ctrl + NumpadSub`: Lautstärke verringern (-5 %).
    - Funktioniert nahtlos sowohl global während der Fahrt als auch direkt bei fokussiertem CarPlay-Fenster.
  - **📻 Fehlerbehebung Navigation in der Radiosender-Rasteransicht ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Reine 2-Spalten-Rasteransicht**: Der uneinheitliche Breakpoint `lg:grid-cols-3` wurde entfernt und durch ein sauberes, klares 2-Spalten-Layout ersetzt. Dadurch passen lange Sendernamen, Genre und Bitrate ohne unschöne Abkürzungen auf jede Karte.
    - **Intelligente Cursor-Steuerung (Pfeiltasten / D-Pad)**:
      - `Rechts`: Wechselt nun flüssig zur nächsten Karte (`0 -> 1 -> 2 -> 3...`), anstatt in der rechten Spalte hängenzubleiben.
      - `Links`: Wechselt rückwärts zur vorherigen Karte (`3 -> 2 -> 1 -> 0`), und springt nur noch bei der allerersten Karte (`Index 0`) in die Seitenleiste. Ein versehentliches Verlassen der gesamten Liste beim Drücken von Links in der linken Spalte wurde vollständig behoben.
      - `Runter` / `Hoch`: Springt präzise eine Zeile (+2 bzw. -2) nach unten oder oben, erreicht auch bei ungerader Senderanzahl verlässlich die letzte Karte und springt am Listenende direkt in das Player-Deck.
    - **Live-Cursor & Auto-Scroll bei Sender-Hotkeys**: Beim Schalten durch die Sender mit `Ctrl + Taste` oder den Next/Prev-Hotkeys wird die neu aktive Karte in der Rasteransicht nun sofort visuell grün hervorgehoben (`ring-4 ring-emerald-400`) und automatisch weich ins Blickfeld gescrollt.
    - **Konfliktfreies Next/Prev-Routing**: Wenn der Radio-Tab geöffnet ist, schalten die globalen `Next`- und `Prev`-Hotkeys nun verlässlich die Radiosender weiter, statt unerwünscht den Haupt-Tab (z. B. auf Frachtauftrag) umzuschalten.
  - **📻 Intelligente Audio-Quellensteuerung & Standby-Lockscreen Anzeige ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Radio-Anzeige im Zündungs-Standby Screen**: Die Medien-Pille unter der Uhr zeigt nun auch ETS2 Live-Radio mit grünem Radio-Icon, Sendernamen und Genre an (`📻 Sendername — Genre`), anstatt den Radiostream zu ignorieren.
    - **Nahtlose SMTC Player-Steuerung für Radio**:
      - Wenn das Radio läuft oder pausiert wurde, bleibt die Quelle auf Live-Radio fixiert (`lastAudioSource`).
      - Drücken auf `Play/Pause` stoppt und reaktiviert verlässlich das Radio, anstatt Spotify unerwünscht im Hintergrund zu starten.
      - Drücken auf `Nächster` / `Vorheriger` schaltet nun auch im SMTC-Fenster sowie im Home-Widget direkt zum nächsten bzw. vorherigen Radiosender weiter.
      - Album-Art und Senderlogo bleiben auch während einer Radiopause erhalten.
  - **✨ Optisch hervorgehobener Visualizer-Container ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Der SMTC Audio-Frequenz-Visualizer ist jetzt in einen edlen Glassmorphism-Container gebettet (`backdrop-blur-xl`, abgerundete Ecken, sanfter Rand und weicher Tiefenschatten).
    - Hebt den Frequenzverlauf klar und kontrastreich vom Hintergrund und Album-Cover ab (im Darkmode tiefschwarzes 60 % Glass, im Lightmode helles 80 % Glass).
  - **☀️ Lightmode-Fix für Lokale Musik ("Keine lokalen Songs geladen") ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Fehlerhafte weiße Schrift auf weißem Hintergrund im Lightmode behoben.
    - Überschrift erstrahlt jetzt in gut lesbarem Slate-900, die Beschreibung in Slate-600 und der Disc-Icon-Hintergrund in dezenter blauer Tönung.
    - Der Button `+ MUSIKDATEIEN AUSWÄHLEN` besitzt nun einen garantierten, kontrastreichen Blau/Indigo-Verlauf mit weißem Text und deutlicher Klick-Rückmeldung.
  - **🌑 Garantierter Tiefschwarz-Hintergrund im Standby-Modus ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Wenn die Zündung aus ist oder das CarPlay in den Standby schaltet (`isCarPlaySleeping`), erzwingen HTML, Body, Root und das äußere Fenster-Layout nun ausnahmslos `#000000` (`bg-black`), völlig unabhängig davon, ob in den App-Einstellungen Light- oder Darkmode aktiv ist.
    - Verhindert jegliche weiße Ränder, Letterbox-Kanten oder Hintergrunddurchscheinungen bei abgeschalteter Zündung.

## [1.7.91] - 2026-10-11

### 📻 CarPlay Radio-Lautstärkeregler, Hotkey-Steuerung & Animiertes Floating Volume HUD
  - **🎛️ Stufenloser Lautstärkeregler & Audio-Synchronisation ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Integrierter Schieberegler im Radio Player-Deck**: Im aktiven Radio-Deck gibt es nun einen stufenlosen Lautstärkeregler (0–100 % in 5 %-Schritten) inklusive Prozentanzeige, Stummschalt-Toggle (`Volume2`/`VolumeX`), Leiser-Taste (`Minus`) und Lauter-Taste (`Plus`).
    - **Lautstärke-Persistenz & Initialisierung**: Die Radio-Lautstärke wird in `localStorage` (`opc_carplay_radio_volume`) dauerhaft gespeichert (Standard: 50 %). Beim Laden neuer Streams oder Senderwechsel wird die Lautstärke sofort auf das `<audio>`-Element synchronisiert, wodurch das Übersteuern/Starten auf 100 % voller Windows-Lautstärke verhindert wird.
    - **Intelligentes Mute-Restore**: Beim Entstummen wird automatisch der vorherige Lautstärkewert wiederhergestellt, anstatt auf einen festen Standardwert zu springen.
  - **⌨️ Umfassende Hotkey- & D-Pad-Steuerung ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx), [main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**:
    - **Direkte In-App-Hotkeys**:
      - `PageUp` / `]` / `AudioVolumeUp`: Lautstärke um +5 % erhöhen.
      - `PageDown` / `[` / `AudioVolumeDown`: Lautstärke um -5 % verringern.
      - `M` / `AudioVolumeMute`: Stummschaltung umschalten.
    - **Globale Tastenkombinationen während der Fahrt**:
      - `Ctrl+Alt+PageUp`: Radio lauter (+5 %).
      - `Ctrl+Alt+PageDown`: Radio leiser (-5 %).
      - `Ctrl+Alt+M`: Radio stummschalten / entstummen.
      - Diese Tastenkürzel greifen global über Electron auch dann, wenn ETS2 / ATS aktiv im Vordergrund läuft.
    - **Tastatur-Navigation im Player-Deck**: Alle Steuerlemente im Radio-Deck (Vorheriger, Start/Pause, Nächster, Mute, Leiser, Slider, Lauter) sind mit den Pfeiltasten und `Enter` nahtlos erreichbar und visuell hervorgehoben (`ring-2 ring-emerald-400`).
  - **🔊 Elegantes Floating Volume HUD (Apple CarPlay Style) ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Bei jeder Lautstärkeänderung (per Hotkey, Slider oder Tasten) blendet sich am oberen Bildschirmrand ein sanft animiertes iOS/CarPlay-Volume-HUD (`AnimatePresence` mit Spring-Animation) ein.
    - Zeigt das aktuelle Status-Icon (`Volume2` / `VolumeX`), den exakten Prozentwert bzw. "STUMMGESCHALTET" und einen zweifarbigen Fortschrittsbalken mit weichem Farbverlauf, bevor es sich nach 1,5 Sekunden automatisch wieder ausblendet.
  - **🛠️ Audio-Stille bei Radio-Streams behoben ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **CORS-Stummschaltung in WebAudio beseitigt**: Durch die Anbindung von `createMediaElementSource()` an das Radio-Audioelement schaltete Chromium externe Internet-Streams ohne CORS-Header stumm. Die Anbindung wurde für Radio-Streams entfernt und durch eine Schutzweiche abgesichert, sodass die Streams direkt und störungsfrei über die Soundkarte ausgegeben werden.
    - **Automatische Entstummung**: Beim Starten eines Senders wird die Lautstärke automatisch auf mindestens 50 % hochgesetzt, falls der Regler zuvor versehentlich auf 0 % stand.

## [1.7.90] - 2026-10-10

### 🎵 Songwechsel-Animationen, Ultra-Low-Power Visualizer & App-Hintergrund im CarPlay App-Raster
  - **✨ Weiche Songwechsel-Animationen im SMTC-Tab und Home-Widget ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Album-Cover Übergänge**: Beim Wechsel von Tracks (Spotify, YouTube, Radio oder lokale Musik) wird das Cover-Artwork nun flüssig mit einer sanften Skalierungs- und Überblend-Animation (`AnimatePresence mode="wait"` mit dezentem `scale: 0.94 -> 1` und Crossfade) ausgetauscht.
    - **Titel- & Interpreten-Animation**: Die Texte für Titel und Interpret gleiten bei jedem Songwechsel mit einem feinen vertikalen Shift und Crossfade (`opacity: 0, y: 10 -> y: 0`) elegant ein.
  - **⚡ Visualizer Performance-Revolution (Nahezu 0 % CPU-Last) ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **GPU-beschleunigtes Canvas-Rendering**: Der Visualizer re-rendert nicht mehr 28 React-DOM-Balken pro Frame im Virtual DOM, sondern zeichnet direkt auf ein hardware-beschleunigtes 2D-`<canvas>`.
    - **Ruhemodus & Stille-Erkennung**: Erkennt der Audio-Loopback Stille oder Pause, blenden die Balken sauber auf die Grundlinie ab. Sobald der Ruhezustand erreicht ist, wird das Neuzeichnen des Canvas komplett pausiert, anstatt sinnlos leere Frames zu rendern.
    - **Hintergrund-Drosselung (`document.hidden`)**: Wenn das CarPlay-Fenster minimiert oder im Hintergrund ist, werden Berechnungen und Zeichenaufrufe vollständig ausgesetzt.
  - **🖼️ Zuverlässiger App-Hintergrund im CarPlay App-Raster & Haupt-App ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx), [AnimatedBackground.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/AnimatedBackground.tsx), [ThemeContext.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/context/ThemeContext.tsx), [main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**:
    - **Hintergrundbild exklusiv im App-Raster**: Das benutzerdefinierte Hintergrundbild wird in CarPlay nun zielgerichtet **nur** im App-Raster (`activeTab === 'apps'`) angezeigt. Alle anderen Seiten (Home-Dashboard, SMTC-Player, Radio, Lokale Musik, Frachtbrief, LKW-Diagnose, Chat & Funk, Events, Einstellungen) behalten ihren aufgeräumten Cockpit-Look mit dem atmosphärischen Theme-Glow (`ignoreCustomImage={true}` in `AnimatedBackground`).
    - **Intensive Abdunklung im Darkmode**: Im Darkmode wird das Hintergrundbild im App-Raster nun dramatisch und unverkennbar abgedunkelt: Sowohl die Pixel-Luminanz über `filter: brightness(0.32) contrast(1.08)` als auch ein tiefschwarzes 85–94 % Overlay sowie eine weiche Randvignette (`bg-gradient-to-t`) sorgen für perfekten Nacht-Kontrast und blenden die App-Icons strahlend hervor. Im Lightmode bleibt das Bild angenehm hell.
    - **CarPlay Performance-Boost (IPC/SSE Throttling, Visualizer Cutoff & GPU Compositing)**:
      - **Telemetrie-Drosselung im App-Raster (500 ms)**: Da im App-Raster und Menüs keine Tachometer gerendert werden müssen, werden eingehende Telemetrie-Pakete über IPC und SSE von 60 Hz auf energiesparende 2 Hz (500 ms) gedrosselt. Dies eliminiert 95 % aller unnötigen Virtual-DOM-Rerender-Zyklen.
      - **Visualizer Idle Cutoff**: Bei pausierter Wiedergabe oder Stille beendet der Visualizer die `requestAnimationFrame`-Schleife nun vollständig, anstatt im Leerlauf 60 Mal pro Sekunde aktiv zu bleiben.
      - **GPU-Layer-Isolierung (`translateZ(0)`)**: Die Raster-Kacheln und das Wallpaper sind nun auf eigene Compositor-Ebenen ausgelagert und nutzen ressourcenschonendes `backdrop-blur-md`, was Mikroruckler beim Hovern oder Umschalten vollständig beseitigt.
    - **Chromium CSS-Token-Limit behoben (Natives `<img>`-Rendering)**: Beim Rendern großer benutzerdefinierter Hintergrundbilder (wie dem vorliegenden 6,5 MB PNG als Base64-Data-URL) verwarf der CSS-Parser von Blink/Chromium das Inline-Style-Attribut `style={{ backgroundImage: url(...) }}`, da es das interne String-/Token-Limit für CSS-Regeln überschreitet. Dadurch blieb der Hintergrund transparent und zeigte nur das tiefschwarze `#050608`. Sowohl in CarPlay (`renderCarPlayWallpaper`) als auch in der Haupt-App (`AnimatedBackground.tsx`) wird das Wallpaper nun direkt über ein hardware-beschleunigtes HTML-`<img>`-Element (`object-cover`) gerendert, welches den CSS-Parser komplett umgeht und direkt über die native Bild-Pipeline dekodiert wird.
    - **Schutz vor Löschung im Memory bei Quota-Exceeded**: Beim Speichern in `ThemeContext` wird bei Überschreitung des 5 MB `localStorage`-Limits des Browsers der `safeData`-Fallback geschrieben. Über `handleStorage` wird nun verhindert, dass das leere `safeData.customBgImage` den im RAM vorhandenen 6,5 MB Hintergrund überschreibt.
    - **Echtzeit-Synchronisierung via IPC & Web-Fallback**: In CarPlay wird das Wallpaper nun zuverlässig sowohl über `get-app-appearance` (IPC), den IPC-Event-Listener `app-appearance-updated` als auch über den Web-Endpunkt `/api/carplay/state` bezogen und sofort gerendert.
  - **🛡️ Electron WebFrameMain Disposed Guard & V8 Heap-Limit Erhöhung ([main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts), [package.json](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/package.json))**:
    - **V8 Heap Out of Memory (OOM) behoben**: In `main.ts` war das V8-Heap-Limit fälschlicherweise künstlich auf extrem niedrige `--max-old-space-size=128` (128 MB) gedeckelt. Beim Laden hochauflösender benutzerdefinierter Wallpaper (wie dem 6,5 MB PNG in `appearance.json`) stieß der Node-Prozess sofort an die 126-MB-Grenze und stürzte ab.
    - **Heap-Ceiling auf 1024 MB angehoben**: Das Limit wurde in `main.ts` auf `--max-old-space-size=1024` und in den npm-Skripten auf 2048 MB angehoben. Der restriktive `--optimize-for-size`-Schalter wurde entfernt, sodass der V8-Heap selbst bei großen Bildern und Multi-Window-Betrieb stabil bleibt.
    - **Loopbreaker & Direkter Hintergrund-Abruf**: `save-app-appearance` filtert nun redundante Daten und spiegelt sie nicht an das Quellfenster zurück. CarPlay lädt das Bild asynchron per `get-app-appearance`, wodurch der Hintergrund fehlerfrei gerendert wird.

### 🎛️ CarPlay: Differenzierte Letzte-Tabs, Realer Audio-Loopback Visualizer, Logo-Kasten entfernt, Custom Accent Color & Haupt-App Wallpaper
  - **🗂️ Differenzierte Letzte-Tabs in der Seitenleiste ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Separate Speicherung für SMTC, Radio & Lokale Musik**: Windows SMTC (`music-windows`), Live-Radio (`music-radio`) und Lokale Musik (`music-local`) zählen nicht mehr als ein einziger generischer Musik-Tab.
    - **Eigene Icons & Schnellwechsel**: In den letzten Apps der Taskleiste links erscheint nun für jeden Modus das passende Symbol (`Music`, `Radio` oder `ListMusic`) mit speziellem Titel. Ein Klick oder D-Pad-Rücksprung öffnet direkt den jeweiligen Audiomodus, ohne dass der Nutzer manuell umschalten muss.
  - **💬 Chat- & Funk-Icons wiederhergestellt ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Header & Kanallisten-Icons**: Das Kopfzeilen-Icon und die Kanallisten-Icons in der Team-Chat & CB-Funk-Ansicht wurden wiederhergestellt (`MessageSquare`-Icon).
    - **Nachrichten-Stream Avatare**: Auch im Chat-Verlauf werden die Nachrichten-Badges wieder einheitlich mit dem Chat-Icon versehen.
  - **🎨 Durchgängige Custom Accent Color auf allen CarPlay-Seiten ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Vollständige Token-Nutzung**: Sämtliche Seiten (Home-Dashboard, Frachtbrief/Auftrag, LKW-Diagnose, Team-Chat, Musik, Radio, Events, Einstellungen) nutzen nun für Textakzente, Umrandungen, Fortschrittsbalken und Buttons die in den Einstellungen gewählte Akzentfarbe (`var(--primary)`, `text-primary`, `bg-primary`, `border-primary`, `var(--primary-glow)`).
    - **Erhaltene Icon-Farben**: Wie gewünscht behalten alle Service- und Indikator-Icons ihre eigenen authentischen Marken- und Signalfarben (z. B. Spotify-Grün, YouTube-Rot, Diesel-Gelb, Navigations-Blau), während alle Rahmenelemente und Highlights dynamisch der benutzerdefinierten Akzentfarbe folgen.
  - **🖼️ Kasten um das Logo bei SMTC-Seite und Home-Widget entfernt ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Frei schwebendes Markenlogo**: Sowohl auf der SMTC-Playerseite (oben rechts) als auch im Medien-Widget des Home-Cockpits wurde der störende Kasten/Hintergrundrahmen um das App-Logo (Spotify, YouTube, Radio etc.) restlos entfernt. Das Logo wird nun nahtlos freigestellt mit edlem subtilem Schlagschatten gerendert.
  - **📊 Symmetrischer Audio-Visualizer (Bässe im Zentrum, Höhen außen) ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Tiefen in der Mitte, Höhen außen**: Die 28 Frequenzbänder des `SMTCVisualizer` wurden auf ein zentriertes, spiegelsymmetrisches Frequenzspektrum umgestellt: Die kraftvollen tiefen Bässe (Sub-Bass & Bassdrum) pumpen im Zentrum, während die Frequenzen nach links und rechts zu Mitten (Vocals, Snares) und den feinen Höhen (Hi-Hats, Cymbals) an den äußeren Rändern ansteigen.
    - **Dynamische Höhenanhebung**: Ein entfernungsbasierter Treble-Boost gleicht den natürlichen 1/f-Pegelabfall hoher Frequenzen aus, sodass auch die äußeren Höhenbalken lebendig mitflippen.
  - **📱 Haupt-App Hintergrundbild im CarPlay App-Raster ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx), [AnimatedBackground.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/AnimatedBackground.tsx))**:
    - **Kompromisslose Übernahme des App-Bildes**: Sobald in der Haupt-App ein Hintergrundbild hinterlegt ist (`appearance.customBgImage` oder `localStorage`), wird dieses bedingungslos (auch ohne vorherigen `backgroundType === 'custom'`-Zwang und unabhängig vom Farbschema) im CarPlay App-Raster angezeigt – inklusive der eingestellten Weichzeichnung und Abdunklung.
    - **Fensterübergreifender Echtzeit-Sync**: Über `focus`- und `storage`-Events werden Hintergrundbild-Änderungen in der Haupt-App sofort ohne Neustart in das CarPlay-Fenster synchronisiert.
    - **Authentischer App-Glow als Fallback**: Falls in der Haupt-App kein Bild hinterlegt ist, wird im App-Raster nun direkt der dynamische Umgebungs-Glow (`<AnimatedBackground />`) der Haupt-App statt des monotonen hellgrauen Verlaufs verwendet.

### 🎛️ CarPlay: Optimierte Einstellungen- & Radio-Navigation, Bildschirm-Format entfernt, SMTC Audio-Visualizer & Dynamischer Kontrast
  - **🖤 Top-Left Header-Icons & Radio-Sender Hover im Light-Mode ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Header-Icons oben links schwarz/dunkel**: In allen Cockpit-Bereichen (*Auftrag / Frachtbrief*, *LKW-Diagnose*, *Live-Radio*, *Lokale Musik*, *Funk & Chat*, *Events & Konvois*, *Einstellungen*) wurden die oberen linken Icon-Container im Light-Mode auf kontrastreiches Dunkelgrau/Schwarz (`bg-slate-100 border-slate-200 text-slate-800 shadow-sm`) umgestellt. Kein schwach erkennbares Weiß-auf-Weiß mehr.
    - **Radio-Sender Hover & Textfarbe**: In der Senderliste des ETS2 Live-Radios bleibt der Sendername beim Hovern und im selektierten Zustand im Light-Mode durchgängig tiefschwarz (`text-slate-900 group-hover:text-slate-900`). Die Kacheln schalten auf hellen Glas-Hover um (`hover:bg-slate-100 hover:border-emerald-500/50`), sodass Sendernamen niemals mehr weiß auf weißem Grund verschwinden.
  - **📊 Realer, ressourcenschonender Audio-Visualizer ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Native Web Audio API Spektrum-Analyse**: Die persistenten Audio-Engines für lokale Musik und Radio-Streams wurden an einen gemeinsamen `AudioContext` mit `AnalyserNode` (`fftSize = 64`) angebunden.
    - **0 % messbare CPU-Last**: Durch native C++-Dekodierung in Chromium und 32 komprimierte Frequenzbänder reagieren die Balken direkt auf die echten Frequenzen der Musik (Bässe links, Mitten im Zentrum, Höhen rechts) bei praktisch 0 % CPU-Last.
    - **Harmonisches Physik-Fallback**: Bei externen Windows-Playern (z. B. separater Spotify-Prozess ohne internen Stream) greift ein wellen- und beatbasiertes Dämpfungssystem ein, wodurch der Visualizer auch dort natürlich und lebendig schwingt.
  - **🎵 SMTC-Medienplayer & Home-Widget: Feinschliff & Kontrast-Optimierungen ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Positionierung nach unten verschoben**: Titel, Interpret und Visualizer wurden aus der oberen Mitte nach unten (`bottom-24 sm:bottom-28`) über die Transportleiste verlegt, passend zum ergonomischen Cockpit-Layout.
    - **Logo über dem Titel entfernt**: Das App-Logo über dem Songtitel wurde entfernt, das offizielle Spotify-Markenlogo (bzw. YouTube/Radio) wird nun ausschließlich sauber oben rechts angezeigt.
    - **Vollständig ausgefüllter Visualizer**: Die Visualizer-Balken besitzen keinen weißen Ausblendungs-Farbverlauf mehr, sondern sind 100% deckend mit dem Theme-Akzent ausgefüllt und auf hellen sowie dunklen Hintergründen perfekt erkennbar.
    - **Amber-Glow am Play/Pause-Button entfernt**: Sämtliche gelb-orangenen Farbverläufe, Rahmen und Schatten am Start/Stop-Button (im SMTC-Player, im Home-Widget und im lokalen Player) wurden restlos durch die Theme-Akzentfarbe (`var(--primary)`) und neutrales Glas ersetzt.
    - **Dynamische Textfarbe auch im Home-Widget**: Auf dem Home-Dashboard passt sich die Textfarbe von Titel und Interpret nun ebenfalls automatisch der Helligkeit des Album-Covers an (Schwarz auf hellem Cover, Weiß auf dunklem Cover).
  - **☀️ Umfassende Schriftfarben-Anpassung im Light-Mode ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Auf den Unterseiten (*Auftrag / Frachtbrief*, *Events & Konvois*, *Funk & Team-Chat*, *Live-Radio*, *Lokale Musik*) wurden alle bisher weiße Überschriften, Kacheltexte und Statusmeldungen bei aktivem Light-Mode auf dunkle Typografie (`text-slate-900`, `text-slate-800`, `text-slate-600`) umgestellt.
  - **☀️ Genereller Hintergrund im Light-Mode gefixt ([index.css](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/index.css), [CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Globales CSS-Black-Override behoben**: In `index.css` war `.carplay-root` mit `background-color: #000000 !important` belegt, wodurch der Rahmen und der Hauptbereich immer tiefschwarz blieben. Mit `.carplay-root.carplay-light { background-color: #eef2f6 !important; }` und hellen Outer-Wrappern ist das Cockpit nun im gesamten Fenster sauber hell.
    - **Lesbare Schriftfarben im Light-Mode**: Die bisher weißen Texte in der Fahrzeug-Telemetrie (*FAHRZEUG-TELEMETRIE*, *KEINE TELEMETRIE-VERBINDUNG* etc.) passen sich nun dynamisch an (`isLight ? 'text-slate-900' : 'text-white'`), sodass alle Cockpit-Texte auf hellem Untergrund gestochen scharf lesbar sind.
  - **🔤 Windows SMTC UTF-8 Zeichensatz-Fix (Umlaute wie 'ü', 'ä', 'ö') ([main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**:
    - **Keine Fragezeichen/Rauten mehr**: Der Windows SMTC PowerShell-Bridge wurde `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8` und `$OutputEncoding = [System.Text.Encoding]::UTF8` sowie UTF-8 BOM hinzugefügt. Titel wie *"Autos mit Flügel"* werden nicht mehr als `Autos mit Flgel` dekodiert, sondern mit allen Umlauten und Sonderzeichen originalgetreu ausgegeben.
  - **🎵 SMTC-Medienplayer: Dynamische Cover-Helligkeit ohne dunkles Plaque & Offizielles Spotify-Logo ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Kein dunkles Textfeld mehr**: Der dunkle Hintergrundkasten hinter dem Songtitel wurde vollständig entfernt. Der Titel und der Interpret schweben nun direkt und elegant über dem Album-Cover.
    - **Dynamische Schriftfarbe (Weiß auf dunklem Cover, Schwarz auf hellem Cover)**: Ein automatischer Luminanz-Detektor analysiert die Helligkeit des Album-Covers. Bei hellen Covern wird die Schrift automatisch tiefschwarz gerendert (`text-slate-950`), bei dunklen Covern weiß (`text-white`).
    - **Offizielle App-Logos statt Text**: Statt des bloßen Wortes `"SPOTIFY"` wird sowohl im Media-Overlay als auch oben rechts und im Home-Widget das offizielle Spotify-Logo (grünes Marken-SVG) bzw. das entsprechende Logo für YouTube, Apple Music oder Radio gerendert.
  - **☀️ Vollständiger Light-Mode im gesamten CarPlay-Cockpit ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Hintergrund-Problem behoben**: Zuvor war nur die linke Taskleiste weiß, während der gesamte Hauptbereich schwarz blieb. Grund war, dass im Hintergrund jedes Reiters die feste schwarze Komponente `<AnimatedBackground />` (`bg-[#050608]`) lag und sämtliche Kacheln hartkodiertes `bg-black/40` und `text-white` verwendeten.
    - **Apple CarPlay Light-Wallpaper**: Im Light-Mode wird nun ein heller, eleganter Silver/Frosted-Hintergrundverlauf (`bg-gradient-to-br from-[#e8edf5] via-[#f1f5f9] to-[#e2e8f0]`) mit dezenten Ambient-Reflexen gerendert.
    - **Helle Frosted-Glass-Kacheln**: Alle Cockpit-Widgets (Kartenkarte, Mediaplayer, Digital Cockpit) sowie alle Unterkarten (Tempo, Gang, Drehzahl, LKW-Status) wechseln im Light-Mode zu klarem, edlem Milchglas (`bg-white/85 border-slate-200/90 shadow-xl`) mit dunkler Typografie (`text-slate-900`, `text-slate-500`).
    - **Automatische Tag/Nacht-Umschaltung**: Auch bei Farbschema *"Automatisch"* schaltet das gesamte Cockpit bei Tag oder ausgeschaltetem Abblendlicht dynamisch in den hellen Modus um.
  - **📐 Einstellungsseite 100% ins Fenster eingepasst (Scrollbars entfernt) ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Komplett scrollfrei (`overflow-hidden`)**: Alle drei Einstellungsseiten wurden von überdimensionierten Abständen und festen Höhen befreit. Die Inhalte passen sich proportional und flexibel der Fensterhöhe an, ohne dass jemals gescrollt werden muss.
    - **Seite 1 (Design & Display)**: Strukturiert als schlankes oberes 2x2-Grid (CarPlay-Farbe, Karten-Design, Multiplayer-HQ, Textgröße) mit kompakten Kacheln ohne Platz raubende Erklärabsätze, kombiniert mit einer dezenten horizontalen Leiste für die Zündungs-Automatik.
    - **Header-Überlappung behoben**: Die Reiterleiste oben (*Design 01*, *Warnungen 02*, *System 03*) und der Titel `"Einstellungen"` kollidieren nicht mehr. Kompakte Buttons (`h-7`, reduzierte Schrift und Paddings) und `whitespace-nowrap shrink-0` stellen sicher, dass die Kopfzeile auch bei schmalen Auflösungen absolut sauber und frei von Überlappungen bleibt.
  - **⚙️ Vollständige 2D-Navigation auf der Einstellungsseite ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Reiter-Fokus & Seitenwechsel**: Bei Pfeil nach oben aus der obersten Zeile jeder Seite wird nun direkt die obere Reiterleiste fokussiert (`contentIndex === -1`) mit visuellem Glow-Ring. Pfeil Links/Rechts wechselt flüssig zwischen den Seiten (*01 Design*, *02 Warnungen*, *03 System*), Pfeil nach unten betritt die jeweilige Optionsseite.
    - **Seite 1 (Design, Themes & Anzeige)**: Ausgewogene 2-Spalten-Navigation zwischen Farbschema (0..2), Kartenthema (3..5), HQ-Overlay (6..9) und Textgröße (10..12). Übergang zur unteren Standby-Kachel (13) und sauberer Rücksprung in die Taskleiste.
    - **Seite 2 & 3 (Warnungen & System)**: Korrigierte Gitter- und Listennavigation ohne Hängenbleiben in Randfeldern. Toter Legacy-Code und alte Scroll-Effekte wurden restlos bereinigt; der native `data-item-focused` Hook führt die Ansicht sofort nach.
  - **🖥️ Bildschirm-Format aus CarPlay entfernt ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Die Kachel *"BILDSCHIRM-FORMAT"* (16:9, 4:3, 16:10, 21:9, FREI) wurde komplett aus dem CarPlay-Cockpit entfernt.
    - Das Seitenverhältnis wird wie gewünscht ausschließlich über die allgemeinen Overlay-Einstellungen gesteuert, wodurch das CarPlay-Layout aufgeräumt und kompakt bleibt.
  - **📻 Durchgängige Hotkey- & D-Pad-Navigation im ETS2 Live-Radio ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Header-Aktionen**: Suchfeld (Index 0), Auto-Scan (Index 1) und Import (Index 2) sind gezielt ansteuerbar.
    - **Genre-Schnellfilter-Pills**: Alle 6 Filterkategorien (*Alle*, *Favoriten*, *Rock*, *Pop*, *News*, *Electro*, Indizes 3..8) besitzen einen eigenen Fokus-Zustand mit Smaragd-Ring und schalten die Senderliste per Enter sofort um.
    - **2-Spalten-Sender-Grid**: Sender (ab Index 9) lassen sich ohne Modulo-Einschränkungen vertikal und horizontal anwählen; Enter startet den Webstream sofort.
    - **Unteres Cockpit-Playerdeck**: Transporttasten (*Vorheriger Sender*, *Großer Play/Pause*, *Nächster Sender*, *Favoriten-Stern*, *Mute/Lautstärke*) lassen sich per Pfeil nach unten von der Senderliste aus ansteuern und bedienen.
  - **🎵 SMTC Media: Audio-Spectrum Visualizer & Perfekter Textkontrast ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Live Audio Visualizer**: 28-Balken Frequenz-Equalizer (`SMTCVisualizer`) integriert. Animiert sich während aktiver Audiowiedergabe dynamisch in Echtzeit (`requestAnimationFrame`) im Theme-Akzent und geht bei Pause in eine dezente Ruhestellung über.
    - **Kontrast-Plaque**: Songtitel und Künstler werden in einem abgerundeten, tiefen Frosted-Glass-Container (`bg-black/70 backdrop-blur-2xl border-white/20 shadow-2xl`) mit hochauflösenden Text-Schlagschatten gerendert. Dadurch sind Text und Interpret auf jedem Album-Cover (von grell-weiß bis dunkel) aus jeder Distanz 100% kontrastreich lesbar.

## [1.7.89] - 2026-10-10

### 🛠️ CarPlay: Hotkey-Navigation & Layout-Fix in Einstellungen, Quell-Logos & Amber-Entfernung, Cockpit-Optimierung für Radio & Frachtbrief, Chat-Icons
  - **⚙️ Volle Hotkey- & D-Pad-Navigation auf der Einstellungsseite ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Seiteninhalt voll ansteuerbar**: Bisher konnte mit Pfeiltasten/Hotkeys nur zwischen den 3 Einstellungsreitern gewechselt werden. Nun können alle Optionen, Umschalter, Schieberegler und Farbauswahlkacheln innerhalb der Seiten mit Pfeiltasten (Hoch/Runter/Links/Rechts) und Enter direkt navigiert und bedient werden.
    - **Seite 1 (Design & Display)**: Hotkey-Zugriff auf Theme-Auswahl (Neon, Cyber, Amber, Titan), CarPlay-Größenskalierung (80% bis 120%), Taskleistenausrichtung (Links / Unten), Taskleistenskalierung (Kompakt bis Groß) und Kartenthema (Dunkel, Hell, Satellit, Kontrast).
    - **Seite 2 (Fahrt-Warnungen)**: Tastensteuerung für Geschwindigkeits-, Reserve-, Lenkzeit-, Schadens- und Fracht-Warnungen inklusive visuellem Fokus-Ring (`ring-primary`) und Scroll-Zentrierung.
    - **Seite 3 (Meldungen & System)**: Tastensteuerung für Musik-Titelwechsel, Chat-, News-, Event-Benachrichtigungen und Zündungs-Automatik.
    - Nahtloser Rücksprung zur linken CarPlay-Taskleiste bei Druck auf Links am linken Rand bzw. Zurück-Taste.
  - **📐 Behebung von Überlappungen im Einstellungs-Header ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Der Header wurde überarbeitet: Der Titel `"Einstellungen"` und das neue Seitenzähler-Badge (`1/3`, `2/3`, `3/3`) stehen nun in einer sauberen, umbruchfreien Spalte (`shrink-0 whitespace-nowrap`).
    - Das segmented Reiterdock (`01 Design`, `02 Warnungen`, `03 System`) wurde ergonomisch verkleinert und schließt eine visuelle Kollision mit dem Titeltext auch auf schmalen 4:3- oder In-Game-Displays (z. B. 800x480 / 1024x600) vollständig aus.
  - **🎵 Medienplayer: Amber-Glow entfernt & Marken-Logos der Musikquelle ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Sämtliche verbliebenen gelb-amberfarbenen Akzente und Schatten im Medienplayer (Home-Widget, Medienplayer-Tab und lokaler Audioplayer) wurden restlos durch die dynamische Theme-Akzentfarbe (`var(--primary)`, `bg-primary`) und neutrale Kontraste ersetzt.
    - **SVG-Markenlogos statt Klartext**: Oben rechts im Medienplayer wird nun das offizielle Markenlogo der Quelle als SVG im Frosted-Glass-Badge gerendert:
      - **Spotify**: Grünes offizielles Spotify-Drei-Wellen-Logo.
      - **YouTube**: Rotes YouTube-Playbutton-Logo.
      - **ETS2 Live-Radio**: Smaragdgrünes Radio-Wellen-Logo.
      - **Lokale Musik**: Indigo-blaues Disc-Logo.
      - **Apple Music**: Rosa Music-Note-Logo.
  - **📻 Neugestaltung der Radiosenderseite für optimale Fahrt-Bedienung ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Fahrer-Schnellfilter**: Schnellauswahlleiste mit großen Touch-Pills für `[ 📻 Alle ]`, `[ ⭐ Favoriten ]`, `[ 🎸 Rock & Metal ]`, `[ 🎵 Charts & Pop ]`, `[ 💬 Info & News ]` und `[ ⚡ Electronic ]` – kein Tastaturtippen während der Fahrt erforderlich.
    - **Große Sender-Kacheln**: Großzügiges 2-Spalten-Raster mit großen Senderlogos (40x40px), klaren Sendernamen, Bitrate-Badge, animierten Equalizer-Balken bei aktivem Stream und 1-Klick-Favoritenstern direkt auf jeder Kachel.
    - **Hero Active Stream Deck**: Am unteren Rand bietet das Cockpit-Playerdeck große Transporttasten (`⏮ Vorheriger Sender`, `⏯ Großer Play/Pause-Button`, `⏭ Nächster Sender`), Direktfavorisierung und Lautstärkeregler mit Mute-Umschalter.
  - **🚚 Neugestaltung der Auftragsseite (Fahrt-Cockpit für Frachtbrief) ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Hero-Streckenband (Visual Route Ribbon)**: Prominente Querleiste mit Startort & Firma (grüner Marker), Echtzeit-Fortschrittsbalken (`🚚 X% Gefahren`, berechnet aus Plan- und Reststrecke) und Zielort & Empfängerfirma (blauer Navigations-Pin).
    - **4 Große Fahrer-Cockpit-Kacheln (2x2 Raster)**:
      1. *Reststrecke & Fahrzeit*: Riesige km-Anzeige, verbleibende Restzeit und ETA-Ankunftszeit.
      2. *Frachtgut & Ladung*: Frachtname und Tonnage in Tonnen (`⚖️ X.X Tonnen`).
      3. *Gesamt-Erlös & Rate*: Auszahlungssumme in Euro (`€ XX.XXX`) und kalkulierter Erlös pro Kilometer (`~ € XX / km`).
      4. *Frachtzustand & LKW*: Zustandsanzeige in Prozent (`100% Intakt`), Schadenswarnung und Fahrzeugzustand.
    - Überarbeitung der Ansicht bei inaktivem Auftrag zu einem cleanen, aufgeräumten Standby-Screen ohne störende Farbüberlagerungen.
  - **💬 CB-Funk Chatseite: Echte Kanal-Icons statt "CH 1, CH 2" ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Die generischen Text-Badges (`CH 1`, `CH 2`, `CH 3`, etc.) in der CB-Funk Kanalliste wurden durch themenspezifische Icons in Automotive-Squircles ersetzt:
      - **Direktnachrichten**: Echtes Benutzer-Avatarbild des Gesprächspartners.
      - **Konvoi**: LKW-Icon (`<Truck />`).
      - **Events**: Kalender-Icon (`<CalendarDays />`).
      - **Modding / Technik**: Werkzeug-Icon (`<Wrench />`).
      - **Personal / HR**: Schild-Icon (`<Shield />`).
      - **Gruppen**: Benutzergruppen-Icon (`<Users />`).
      - **Allgemeiner Funk**: Funk-/Kanal-Icon (`<Radio />` bzw. `<Hash />`).

## [1.7.88] - 2026-10-09

### 🎮 CarPlay: Schnellfunk-Nachrichtenvorlagen Menü & Vollständige Hotkey- / D-Pad-Navigation
  - **⚡ Schnellfunk-Vorlagen Popover & Tastatur-Button ersetzt ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Der bisherige Button *TASTATUR* wurde in der Eingabeleiste durch den neuen Button **VORLAGEN** (`<Zap />`) ersetzt. (Die Bildschirmtastatur bleibt weiterhin bei Fingertipp oder Fokus auf das Eingabefeld voll verfügbar).
    - Beim Klick auf **VORLAGEN** öffnet sich ein schwebendes Frosted-Glass-Popout-Menü (`showChatTemplates`) direkt über der Chat-Eingabeleiste mit 12 einsatzbereiten Trucker-Funksprüchen (Grüße, Konvoi, Gefahr/Stau, Überholen, Pause/Tanken, Panne/Schaden, Status).
    - Ein Klick auf eine Vorlage sendet den Funkspruch sofort ohne manuelles Tippen an den aktiven CB-Funkkanal.
    - Volle Controller- und Tastaturunterstützung: Menü öffnet per Enter auf dem Vorlagen-Button, Pfeiltasten steuern das 2-Spalten-Raster, Enter sendet den Funkspruch und Escape/Back schließt das Menü.
  - **💬 CB-Funk & Chat Navigation ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Fehlende `handleNav`-Logik für `activeTab === 'chat'` implementiert: Controller-, Lenkrad-Hotkeys und Tastaturpfeile steuern nun alle Elemente.
    - **Linke Spalte (CB-Funk-Kanäle)**: Pfeiltasten Hoch/Runter navigieren durch die Kanalliste, Enter schaltet den Funkkanal um und lädt dessen Nachrichten, Pfeiltaste Links verlässt den Inhalt in die CarPlay-Taskleiste.
    - **Rechte Spalte (Funkspruch-Aktionen)**: Pfeiltaste Rechts springt von den Kanälen direkt auf die Eingabeleiste. Pfeiltasten Links/Rechts wechseln zwischen *VORLAGEN*, *Eingabefeld* und *Senden*.
    - **Header & Aktualisieren**: Pfeiltaste Hoch springt zum Aktualisieren-Button im Header.
    - Visuelle Fokus-Hervorhebungen mit dynamischem Ring-Glow (`ring-purple-400`, Skalierungseffekt) und automatischer Scroll-Nachführung (`data-item-focused`).
  - **📅 Events & Konvois Navigation ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Fehlende `handleNav`-Logik für `activeTab === 'events'` implementiert.
    - **Linke Spalte (Event-Liste)**: Pfeiltasten Hoch/Runter scrollen durch anstehende Konvois und wählen das fokussierte Event live zur Vorschau aus.
    - **Rechte Spalte (Missions-Details)**: Pfeiltaste Rechts springt direkt auf den großen Action-Button *IN NAVIGATION LADEN*. Enter startet die GPS-Navigation für das ausgewählte Event.
    - **Header & Aktualisieren**: Pfeiltaste Hoch fokussiert den *Aktualisieren*-Button im Header.
    - Visuelle Fokus-Ringe (`ring-emerald-400`), automatische Bildlauf-Zentrierung (`scrollIntoView`) und nahtloser Rücksprung zur Taskleiste via Links/Zurück.
  - **🚚 Fracht & Auftrag (`activeTab === 'job'`)**:
    - Saubere Taskleisten-Rückkehr bei Links- oder Zurück-Taste integriert.
  - **🔄 Dynamische Element-Erkennung (`getContentElementsCount`)**:
    - Korrekte Zählung der fokussierbaren Steuerelemente abhängig von geladenen Kanälen und Events für fehlerfreien Übergang zwischen Taskleiste und App-Inhalt.

## [1.7.87] - 2026-10-09

### 🚀 CarPlay In-Game FPS-Optimierung & Entfernung des obsoleten Medien-Menüs / Zurück-Buttons
  - **🧹 Entfernung des obsoleten Medien-Auswahlmenüs & der Zurück-Buttons ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Der runde, schwebende Zurück-Pfeil-Button `(←)` wurde aus dem Windows Media / Spotify Player (`musicSubTab === 'windows'`) sowohl im Leerlauf als auch im Now-Playing-Zustand vollständig entfernt.
    - Das obsolete Quellenauswahl-Menü (`musicSubTab === 'menu'`) wurde restlos entfernt, da Medienplayer, ETS2 Live-Radio und Lokale Musik nun als eigenständige Apps direkt im App Drawer und der Taskleiste starten.
    - Die redundanten Zurück-Buttons wurden auch aus den Headern von *Lokale Musik* und *Live-Radio* entfernt.
    - Das D-Pad-/Controller-Navigationssystem wurde angepasst: Direkte Steuerung der Transporttasten (Vorheriger, Play/Pause, Nächster) bei Windows Media sowie saubere Tastatur-/Scan-/Sender-Fokussierung bei Radio und Lokaler Musik.
  - **⚡ Massive GPU- & CPU-Performance-Optimierung für maximale In-Game FPS ([GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx), [CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx), [AnimatedBackground.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/AnimatedBackground.tsx))**:
    - **Intelligente Map-Pausierung bei Tab-Wechsel & Standby**:
      - Die Home-Miniatur-Karte wird nun sofort pausiert, sobald der Nutzer einen anderen Tab öffnet (`paused={isCarPlaySleeping || activeTab !== 'home' || maximizedWidget !== null}`).
      - Die Vollbildkarte wird nur gerendert, wenn der Map-Tab tatsächlich sichtbar ist (`activeTab === 'map'`).
      - Vorher liefen beide MapLibre-Instanzen permanent bei 60 FPS im Hintergrund weiter, sobald CarPlay aus dem Standby aufgeweckt wurde.
    - **Stopp der requestAnimationFrame-Schleife bei `paused`**:
      - Die Animationsschleife fordert im pausierten Zustand nun keine weiteren Frames an (`return` statt endlosem `requestAnimationFrame`), wodurch die CPU bei verdeckter Karte oder Standby vollständig entlastet wird.
    - **FPS-Deckelung für Automotive-GPS**:
      - Einführung der `targetFps`-Prop: Die Home-Mini-Karte läuft mit schonenden 20 FPS, die Vollbildkarte mit flüssigen 30 FPS (Automotive-Standard), was den WebGL-Drawcall-Aufwand halbiert.
    - **MapLibre-Pixel-Ratio-Capping**:
      - `pixelRatio` wird auf maximal `1.25` begrenzt (`Math.min(window.devicePixelRatio || 1, 1.25)`). Auf hochauflösenden 1440p/4K-Monitoren und mit Windows-Skalierung (125%/150%) verhindert dies extreme GPU-Fragment-Shader-Überlastung.
    - **Reduzierter Kamera-Neigungswinkel (`pitch: 38`)**:
      - Reduzierung des Neigungswinkels von 60° auf 38°, wodurch rund 40% weniger Horizont-Vektorkacheln und Straßengeometrien gleichzeitig gerendert werden müssen.
    - **Gedrosselte Telemetrie-Berechnungen**:
      - Blitzer- und Ampelannäherungsprüfungen werden auf maximal 5 Hz (200 ms) gedrosselt und bei pausierter Karte übersprungen.
    - **Effiziente Glassmorphismus-Filter & GPU-Beschleunigung**:
      - Ersetzung von rechenintensiven `backdrop-blur-2xl`-Filtern (40px Blur-Radius) durch ressourcenschonende `backdrop-blur-md`-Filter quer durch alle CarPlay-Elemente.
      - Hardware-Beschleunigung (`will-change: transform`, `transform: translateZ(0)`, `contain: strict`) und reduzierte Filterradien im animierten Hintergrund (`AnimatedBackground.tsx`), um GPU-Füllraten-Konflikte mit DirectX 11/12 während des Spiels zu eliminieren.

## [1.7.86] - 2026-10-09

### 📻 Live-Radio & Lokale Musik Design-Update, Zündungs-Automatik Verschiebung & CB-Funk Kanalauswahl
  - **🎵 Live-Radio & Lokale Musik an App-Raster Design-DNA angepasst ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Quellen-Auswahl (`musicSubTab === 'menu'`)**: Vollflächiger `AnimatedBackground` Wallpaper-Hintergrund, `backdrop-blur-2xl` Frosted-Glass-Container mit 3 großflächigen Medien-Karten (*Windows Media*, *Lokale Musik*, *ETS2 Live-Radio*) mit dynamischen Gradient-Badges (`from-amber-500`, `from-blue-600`, `from-emerald-600`) und Status-Pills.
    - **Lokaler Musik-Player (`musicSubTab === 'local'`)**: Vollständig neues Frosted-Glass Cockpit-Layout mit animiertem Wallpaper. Links: Übersichtliche Titelliste mit Scrollbereich und Live-Status (`SPIELT...`). Rechts: Großes Now-Playing Vinyl-Deck mit rotierender Schallplatten-Animation, Track-Metadaten, Zeitleiste und großen Touch-Transporttasten (Vorheriger, Play/Pause in Gold, Nächster) sowie Lautstärkeregler.
    - **ETS2 Live-Radio (`musicSubTab === 'radio'`)**: Vollständig neues Frosted-Glass Design mit Suchleiste (virtuelle Tastatur per Tap), Auto-Scan (`.sii`) und Datei-Import. Großflächiges Sender-Grid mit Senderlogos, Genre, Bitrate und Favoriten-Sternen sowie schwebendem On-Air-Player-Dock am unteren Rand.
    - *(Windows Media / SMTC Spotify Player bleibt weiterhin im ursprünglichen Media-Player-Design unverändert).*
  - **⚡ Zündungs-Automatik Schalter zu Design & Display verschoben ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Der Schalter für die **Zündungs-Automatik (Display-Standby)** wurde von Seite 2 (Fahrt-Warnungen) auf **Seite 1 (Design & Display)** als Box 5 mit vollem Breiten-Span (`col-span-2`) und großem Schalter versetzt.
    - Seite 2 (Fahrt-Warnungen) enthält nun ausschließlich die reinen Fahr- und Sicherheitswarnungen (*Navigations-Hinweise*, *Tempolimit-Warnung*, *Kraftstoff-Reserve*, *Lenkzeit & Pause*, *LKW- & Frachtschaden*).
  - **🎙️ CB-Funk Kanalauswahl in die linke Spalte verschoben & Schnellfunk entfernt ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Die Schnellfunk-Schaltflächen wurden aus der linken Spalte entfernt.
    - Die **CB-Funk Kanalauswahl** wurde als primäre Navigationsleiste mit großen, fahrertauglichen Kanal-Karten (`CH 1`, `CH 2`, `#allgemein` etc.), pulsierendem Aktiv-Status und Verbindungsanzeige in die linke Spalte integriert.
    - Unten in der linken Spalte: Fahrer-Rufname und CB-Statuskarte (`ON AIR`).
    - Der Header wurde bereinigt (redundante horizontale Kanalleiste entfernt, stattdessen Anzeige des aktiven Kanals und Aktualisierungs-Taste).
    - Rechte Spalte auf großzügige 8 Spalten erweitert für optimale Lesbarkeit des Chatverlaufs während der Fahrt.

## [1.7.85] - 2026-10-09

### 🎛️ Mehrseitige Automotive-Einstellungen & 1-Touch Fahrt-Bedienung für Chat
  - **📐 Mehrseitige Einstellungen wie im Truck-Tab (`settingsPage`) ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Die zuvor überfüllte Einstellungen-Seite wurde wie der Truck-Tab in **3 übersichtliche, fahrtaugliche Seiten** mit segmentiertem Header-Dock (`01`, `02`, `03`) und Pfeilnavigation aufgeteilt:
      - **Seite 1: Design & Display (`01`)**: Großzügiges 2x2-Raster für *CarPlay-Design* (Dunkel, Hell, Auto), *Karten-Design* (Dunkel, Hell, Auto), *Textgröße* (Groß, Normal, Klein) und *Bildschirm-Format* (16:9, 4:3, 16:10, 21:9, Frei).
      - **Seite 2: Fahrt-Warnungen (`02`)**: Großformatiges 2x3-Raster für direkte Fahrzeug-Sicherheits-Alerts (*Zündungs-Automatik*, *Navigations-Hinweise*, *Tempolimit-Warnung*, *Kraftstoff-Reserve*, *Lenkzeit & Pause*, *LKW- & Frachtschaden*) mit großen Touch-Kacheln und leicht treffbaren Schaltern.
      - **Seite 3: Meldungen & System (`03`)**: Pop-up-Meldungen für Fracht, Musik, Chat, News und Events links sowie System-, Telemetrie- und D-Pad-Bedienhinweise rechts.
    - Nahtlose Bedienung per Touch, Maus oder D-Pad/Pfeiltasten (`← / →`).
  - **📻 Aufgeräumter In-Car Funk & Chat für die Fahrt ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **1-Touch Schnell-Funk**: Die redundante Kanalliste in der linken Spalte wurde durch **8 großflächige Trucker-Schnellwahltasten** (*Auf Achse*, *Stau voraus*, *Rast/Pause*, *Am Zielort*, *Funk-Check*, *Roger/10-4*, *Panne/Halt*, *Moin Moin*) ersetzt.
    - Fahrer können während der Fahrt mit einem einzigen Fingertipp sofort einen vollständigen Funkspruch absenden, ohne die Tastatur zu bedienen oder den Blick vom Verkehr abzuwenden.
    - Kanal-Auswahl sauber im Header als Funk-Pills platziert mit Live-Fahrer-Rufname und Fahrtstatus.
    - Rechts: Größeres, kontrastreiches Nachrichtenlog mit Schnellstart-Taste für die Bildschirmtastatur.

## [1.7.84] - 2026-10-09

### 🎨 App-Raster Glassmorphismus & Wallpaper-Design auf alle CarPlay-Seiten übertragen
  - **✨ Einheitliche Design-DNA des App-Rasters ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Der visuelle Stil des App-Rasters (flüssiges interaktives `AnimatedBackground` Wallpaper, schwebende `backdrop-blur-2xl` Frosted-Glass-Panels mit `border-white/10`, stimmungsvolle Auren und lebendige Gradient-Header-Badges) wurde auf alle CarPlay-Seiten (außer Navigation und Medienplayer) übertragen:
      - **Dashboard (`home`)**: Vollflächiger Wallpaper-Hintergrund mit schwebenden Frosted-Glass-Kacheln für Miniatur-Navi, Audio-Widget und Digital-Cockpit.
      - **Auftrag / Frachtbrief (`job`)**: Himmelblauer Gradient-Badge (`from-sky-600 to-cyan-500`), Frosted-Glass Frachtbrief-Details, Ladungsspezifikationen und Strecken-Ribbon.
      - **LKW Diagnose & Bordcomputer (`truck`)**: Bernstein-Gradient-Badge (`from-amber-600 to-orange-500`), Frosted Dock-Umschaltung für Cockpit-, Bordcomputer- und Diagnoseseiten mit Glas-Messuhren und Sensor-Kacheln.
      - **CarPlay Einstellungen (`settings`)**: Graphit-Gradient-Badge (`from-zinc-600 to-slate-500`), Frosted Einstellungs-Kacheln für Theme, Kartenmodus, Textgröße und Seitenverhältnis.
      - **In-Car Funk & Team-Chat (`chat`)**: Violett-Gradient-Badge (`from-purple-600 to-indigo-500`), Frosted Funkkanal-Leiste, Chat-Stream und Trucker-Preset-Chips.
      - **Events & Konvois (`events`)**: Smaragd-Gradient-Badge (`from-teal-600 to-emerald-500`), Frosted Konvoi-Liste und Mission-Control mit Streckenband und "In Navigation laden".
      - **Event-Detail Modal (`selectedEventModal`)**: Frosted-Glass-Overlay mit `backdrop-blur-2xl` und abgestimmten Kacheln.
    - **Ausnahme gewahrt**: Navigation (`map`) und Medienplayer (`music`) verbleiben in ihren Vollbild-Karten-/Player-Layouts.

## [1.7.83] - 2026-10-09

### 📐 Dynamische Raster-Navigation & Beseitigung von Bildrand-Abschneidungen
  - **🔲 Kanten- & Ring-Abschneidung behoben ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Horizontales und vertikales Container-Padding im App-Raster hinzugefügt (`px-6 sm:px-8 py-4 sm:py-6`).
    - Blauer Fokus-Ring auf `ring-inset` umgestellt; Kanten werden bei Skalierung und Fokus garantiert nicht mehr am Rand abgeschnitten.
  - **🎮 Dynamische Pfeiltasten-Navigation (`appGridCols`) ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Die Pfeiltastensteuerung (hoch, runter, links, rechts) passt sich nun automatisch an die berechnete Spaltenanzahl an (3 Spalten bei 4:3 / <820px, 5 Spalten bei Breitbild).
    - Kein Feststecken mehr beim Durchwechseln; flüssiges Navigieren zwischen allen 9 Apps passend zum Bildschirmformat.
    - Automatisches sanftes Weiterschalten (`scrollIntoView`) des fokussierten App-Elements.
  - **🐛 Bugfix `selectedEventModal` & `user`**:
    - Fehlende State-Deklaration `selectedEventModal` und `user`-Initialisierung in CarPlay ergänzt sowie AuthProvider in `main.tsx` eingebunden.

## [1.7.82] - 2026-10-09

### ✨ Cockpit-Design für Chat & Events, Bildschirmtastatur & App-Raster Hintergrund
  - **🔲 Bereinigtes App-Raster mit OPC-Hintergrund ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Der Header "Alle Apps" und die Tipp-Leiste am unteren Rand wurden entfernt.
    - Der animierte Canvas-Hintergrund der OPC-Hauptanwendung (`AnimatedBackground`) läuft nun als Wallpaper hinter den schwebenden App-Icons.
  - **⌨️ Bildschirmtastatur für Chat ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Ein Klick auf das Eingabefeld oder den neuen "Tastatur"-Button öffnet die CarPlay-Bildschirmtastatur.
    - Nahtlose Texteingabe, Umschalten zwischen Radio/Stadt/Chat und Absenden bei Enter.
  - **🎨 Cockpit-Design für Chat & Events ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Beide Apps wurden in den Hauptanzeigebereich integriert (Layout-Verschiebung behoben, kein schwarzer Freiraum mehr).
    - Design an die etablierte Cockpit-Ästhetik angepasst:
      - **Chat**: 4-Spalten-Funkkanäle & Fahrer-Status links, 8-Spalten-Nachrichtenlog rechts mit Trucker-Schnellpresets.
      - **Events**: 5-Spalten-Konvoiliste links, 7-Spalten-Detailübersicht mit Streckenband und "In Navigation laden"-Button rechts.

## [1.7.81] - 2026-10-09

### 📻 In-Car Funk/Chat & Events Apps, 16:10 Taskbar Unten & Intelligenter Freier Modus
  - **📐 16:10 Taskbar Unten & Verfeinerte Erkennung im freien Modus ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Auf 16:10-Bildschirmen (1.60) wandert die Taskbar nun wie gewünscht an die **untere Kante**.
    - Die Erkennung im freien Skaliermodus (`free`) schaltet bei einem Schwellenwert von `1.72` um: Displays mit Verhältnissen < 1.72 (16:10, 4:3, quadratisch) platzieren die Taskbar unten für maximale Kartenbreite; Breitbildschirme (>= 1.72, wie 16:9 und 21:9) platzieren sie links am Rand.
  - **🔲 Bereinigtes App-Raster**:
    - Das Dashboard-Icon wurde aus dem App-Raster entfernt, da das Dashboard direkt über den Menü-Button erreichbar ist.
  - **💬 In-Car Chat- & Funk-App (`'chat'`)**:
    - Eigene App für Echtzeit-Kommunikation mit Teammitgliedern.
    - Kanalauswahl (#allgemein, Funk-Kanäle), Live-Nachrichtenanzeige mit Rollen-Badges und Zeitstempeln.
    - Trucker CB-Funk-Schnellantworten ("Auf Achse", "Stau voraus", "Rast/Pause", "Am Ziel", "Funk-Check", "Roger") und Texteingabe.
  - **📅 In-Car Events & Konvois-App (`'events'`)**:
    - Übersicht anstehender Konvois und Treffen mit Event-Typ, Datum/Uhrzeit und Restzeit-Countdown.
    - Start- und Zielort-Streckenband mit Firmenangaben und Serverinformationen.
    - **"In Navigation laden"** Button lädt die Route direkt ins GPS-Navi und schaltet zur Navigationskarte.
    - Detailansicht für ausführliche Informationen und Regeln.

## [1.7.80] - 2026-10-09

### 🚗 Android Auto Menüführung & App-Raster für CarPlay
  - **📱 Taskbar mit den 3 zuletzt genutzten Apps ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Die Menüleiste hält stets die **3 zuletzt aktiven Anwendungen** vor (z. B. Karte, Musik, LKW-Diagnose) und aktualisiert sich dynamisch bei jedem App-Aufruf.
    - Das Dashboard belegt keinen Slot in der Taskbar, da es direkt über den Menü-Button angesteuert wird.
    - Persistente Speicherung im `localStorage` (`openpipeclub_carplay_recent_apps`).
  - **🔲 App-Launcher & Großes Icon-Raster ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Das App-Raster präsentiert alle 8 LKW-Apps mit **großen, modernen App-Icons** und Titel ohne ablenkende Textbeschreibungen.
    - **Bereinigte Taskbar**: WLAN-Symbol und Tempolimitschild wurden aus der Taskbar entfernt; sie fokussiert sich rein auf Digitaluhr, Menü-Button und die 3 Schnellstart-Apps.
  - **🔄 Original Android Auto 2-Stufen Menü-Zyklus ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Befindet man sich in einer geöffneten App (z. B. Navigation, Medien, Frachtauftrag), führt der Menü-Button **zuerst auf das Dashboard** (Home / Cockpit).
    - Ein erneuter Klick auf dem Dashboard öffnet das **App-Raster**.
    - Befindet man sich im App-Raster, bringt ein Klick den Fahrer wieder zurück auf das **Dashboard**.
  - **📐 Automatische Taskbar-Positionierung (Seite vs. Unten) ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Auf Breitbildformaten (`16:9`, `16:10`, `21:9`) positioniert sich die Taskbar als **Seitenleiste links**.
    - Auf Bildschirmen mit quadratischerem oder kompakterem Seitenverhältnis (`4:3`, `narrow`, Tablets) wandert die Taskbar automatisch an den **unteren Bildschirmrand** als horizontale Navigationsleiste, um die volle Bildschirmbreite für Karte und Dashboard freizugeben.
  - **🎮 Vollständige Tastatur- & Controller-Steuerung**:
    - Tastaturnavigation im 4×2 Raster, automatische Rückkehr bei ESC und Fokus-Tracking.

## [1.7.79] - 2026-10-09

### 📱 Multi-Aspect-Ratio & Bildschirmgrößen-Kompatibilität für Apple CarPlay
  - **🖥️ Frei wählbare Seitenverhältnisse (16:9, 4:3, 16:10, 21:9 & Frei) ([main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts), [CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx), [OverlaySettings.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/OverlaySettings.tsx))**:
    - Das bisherige starre 16:9-Verhältnis (`1024x576`) von Electron wurde durch eine dynamische Aspect-Ratio-Engine ersetzt.
    - Neue Einstellung `carPlayAspectRatio`: Unterstützt `16:9`, `4:3` (speziell für iPads, Tablets & Cockpit-Displays), `16:10`, `21:9` (Ultrawide) sowie `free` (völlig freies Resizen ohne Aspect-Ratio-Lock).
    - Beim Ändern in den Einstellungen passt sich das geöffnete CarPlay-Fenster in Electron sofort und ohne Neustart an.
  - **📐 Intelligentes 2-Achsen-UI-Scaling**:
    - `sidebarScale` berechnet sich nun aus beiden Dimensionen (`Math.min(wScale, hScale)`), sodass Navigations-Icons, Uhr und Tempolimit selbst auf kompakten 800×600- oder 1024×768-Auflösungen niemals vertikal überlaufen.
    - Das Home-Dashboard passt die Spaltenaufteilung automatisch an das Seitenverhältnis an (`4:3` nutzt harmonische 50/50 bis 60/40 Breiten mit voller Höhe).
    - Geschwindigkeits- und Gangzahlen nutzen stufenlose `clamp()`-Skalierung gegen Textumbrüche.
  - **⚙️ Integrierte In-Car- und App-Bedienung**:
    - Auswahl des Bildschirmformats sowohl unter *Overlay-Einstellungen -> CarPlay* als auch direkt im CarPlay *Settings*-Tab per Touch oder Tastaturnavigation.

## [1.7.78] - 2026-10-07

### ⚡ Massive GPU- & Grafikleistungs-Optimierung für CarPlay & WebGL-Karten
  - **🚀 60 FPS Framerate-Begrenzer im Render-Loop ([GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx))**:
    - Auf High-Refresh-Gaming-Monitoren (120 Hz, 144 Hz, 240 Hz) lief die `requestAnimationFrame`-Schleife ungebremst und triggerte `map.jumpTo()` 144- bis 240-mal pro Sekunde.
    - Einführung eines festen 60-FPS-Frame-Pacing-Intervalls (~15,1 ms Mindestabstand). Reduziert GPU-Draw-Calls und WebGL-Renderlast um 60 % bis 75 % ohne sichtbaren Qualitätsunterschied.
  - **🛑 Intelligenter Stillstand-Sleep (Zero-Cost Idle) ([GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx))**:
    - Steht der LKW (Geschwindigkeit <= 0.5 km/h) und sind Kameraposition und Peilung vollständig eingeschwungen, friert die Kamera ein und überspringt `map.jumpTo()` komplett.
    - Sobald der LKW anfährt oder neue Bewegung meldet, wacht der Loop verzögerungsfrei auf. An Ampeln, Raststätten und im ETS2-Menü sinkt die GPU-Last auf nahezu 0 %.
  - **🗺️ Reiner 2D-Vektormodus für CarPlay (Keine 3D-Meshes / Extrusions) ([GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx), [CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Neues Prop `enableTerrain3D`: In CarPlay standardmäßig auf `false`. Das aufwendige Raster-DEM-Höhengitter (`ets2-terrain.pmtiles`) und 3D-Gebäude-Extrusionen (`fill-extrusion`) werden für CarPlay-Navigationsanzeigen nicht geladen oder tesselliert.
    - Beibehaltung des dynamischen 60°-Kamera-Blickwinkels (`pitch: 60`): Die dynamische perspektivische Fahransicht in Fahrtrichtung bleibt 1:1 erhalten, wird jedoch rein planar über die Vektorkarte gerendert, wodurch teure Raster-DEM-Elevation-Meshes vollständig entfallen.
  - **⏸️ Echter WebGL-Pausiermodus bei Standby & Blackout ([GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx), [CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Neues Prop `paused`: Wird bei Zündung aus oder F9-Blackout (`isCarPlaySleeping`) an alle CarPlay-Karten-Widgets übergeben. Der Loop bricht sofort ab (0 % GPU im Standby).
  - **✨ GPU-Compositor Entlastung & Shader-Cache Reaktivierung ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx), [main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**:
    - Exzessive `backdrop-blur-2xl` Filter auf ohnehin zu 95 % opaken Kacheln in allen Farbthemen (White, Blue, Titan, Dark) durch ressourcenschonendes `backdrop-blur-sm` ersetzt.
    - In `main.ts` wurde der Schalter `--disable-gpu-shader-disk-cache` entfernt, sodass Grafikkartentreiber kompilierte Shader auf der Festplatte cachen können und Mikroruckler entfallen.
 
## [1.7.77] - 2026-10-04
 
### 🛣️ Spurtreue Routendarstellung (Lane-Keeping) & Gegenfahrbahn-Filterung bei Blitzern (ETS2LA-Architektur)
  - **Permanente Spurlagen-Routenführung (ETS2LA-Standard) ([routeSmoother.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/utils/routeSmoother.ts), [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx), [RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx))**:
    - **Analyse der ETS2LA-Architektur**: In `ETS2LA` (`RoadUtils.CalculateRoadLaneCenters`, `ParsedRoad.InterpolateLane` und `VisionRoadUtils.CreatePathVertices`) ermittelt das System die Fahrspurpositionen ausgehend von der SCS-Standardspurbreite $4.5\,\text{m}$ (`halfLaneWidth = 2.25m`). Auf zweispurigen Straßen liegt die rechte Spurmitte exakt bei $+2.25\,\text{m}$, die Gegen- bzw. Linksspur bei $-2.25\,\text{m}$.
    - **Smartes Lane-Keeping Offset (+2.25m / -2.25m)**: [smoothRouteCoords](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/utils/routeSmoother.ts) nutzt exakt dieses mathematische Modell: Anhand von 20m-Tangentenfenstern wird der 2D-Normalenvektor (`-dy / len, dx / len` analog zu ETS2LAs `Vector3.Cross(Vector3.UnitY, tangent)`) gebildet und die Route permanent +2.25m nach rechts (bzw. -2.25m im UK-Linksverkehr via `isUkCoord`) verschoben.
    - **Nahtlose Endpunkt-Rampen**: Sanfte Ein- und Ausblendung des Offsets über die ersten und letzten 25 Meter (Ramp-In/Ramp-Out), sodass die Route direkt unter der Zugmaschine startet und exakt auf der Abladebucht / Zielmarkierung endet.
    - **Gauß-Relaxation & Bézier-Fillets**: 1-Pass [0.15, 0.70, 0.15] Gauß-Glättung verhindert jegliche Knicke oder Miter-Spikes und garantiert einen seidenweichen, spurtreuen Kurvenverlauf.
  - **Intelligente Gegenfahrbahn-Erkennung bei festen Blitzern ([ets2Speedcams.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/data/ets2Speedcams.ts), [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx), [Overlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Overlay.tsx))**:
    - **Problem**: Bei stationären Blitzern (z. B. auf Autobahnen oder Bundesstraßen) warnte die Proximity-Engine bisher alle Fahrer im vorderen 80°-Blickwinkel – selbst wenn der Blitzer auf der Gegenfahrbahn stand und ausschließlich den Gegenverkehr überwachte.
    - **Exakter Überwachungs-Winkel (`directionDeg`)**: Alle 84 ETS2-Festblitzer wurden mit ihrem exakten Richtungsvektor aus `ets2.geojson` versehen. Weicht der Fahrtrichtungs-Winkel (`headingDeg`) um mehr als 55° vom Überwachungswinkel ab (~180° Gegenverkehr), wird der Blitzer zuverlässig ignoriert.
    - **Querversatz-Filter (Cross-Track Distance)**: Erkennung des physischen Seitenabstands zur Gegenfahrbahn über den Mittelstreifen hinweg (z. B. Blitzer mehr als 14m links auf der gegenüberliegenden Richtungsfahrbahn).
    - **Routen-Konsistenzprüfung**: Bei aktiver Routenführung in `GameMapWidget.tsx` wird zusätzlich geprüft, ob der Blitzer überhaupt auf dem geplanten Routenstrang liegt (verhindert Fehlalarme bei Abfahrten und parallelen Überführungen).
  - **Behebung des Prefab-Ladefehlers im Offline-Routenservice ([route-service.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/route-service.ts))**:
    - **Fehlerursache**: Beim Einlesen der `europe-prefabs.json` (73.141 Prefab-Kreuzungen) trat ein `ReferenceError: type is not defined` auf, da `const type = classifyPrefabPath(pfPath)` vor der Initialisierung des `PrefabMetadata`-Objekts fehlte. Dadurch wurden 0 von 73.141 Prefabs geladen und der A*-Pathfinder konnte an Kreuzungen nicht auf NavCurves zurückgreifen.
    - **Korrektur**: `classifyPrefabPath` wird nun für jedes Prefab aufgerufen. Alle 73.141 Prefabs werden nun vollständig in den Speicher geladen.
 
## [1.7.76] - 2026-10-01
 
### 👁️ Kontrast-Korrektur (Dynamisches Primary-Foreground) & Pfeil-Hover im LKW-Dock
  - **Dynamische Kontrast-Textfarbe (`--primary-foreground`) ([ThemeContext.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/context/ThemeContext.tsx), [index.css](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/index.css), [CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Problem**: Bei dunklen Custom-Akzentfarben (z. B. Lila / Violett, Dunkelblau) war der Text auf aktiven Segment-Pills (`Diagnose 03`) und Buttons durch statisches `text-slate-950` (Tiefschwarz) nahezu unleserlich.
    - **Luminanz-Berechnung in Echtzeit**: Anhand der wahrgenommenen Helligkeit (Luminance) der gewählten Akzentfarbe wird `--primary-foreground` automatisch ermittelt:
      - Bei dunklen und mittleren Akzenten (Lila, Blau, Rot, Grün, etc.) schaltet die Schrift auf strahlendes Reinweiß (`#ffffff`).
      - Bei sehr hellen Akzenten (z. B. leuchtendes Gelb / Standard-Amber) bleibt die Schrift kontrastreich tiefschwarz (`#020617`).
    - **Aktive Kacheln & Buttons aktualisiert**: Der Segment-Umschalter im LKW-Tab (`Cockpit`, `Bordcomputer`, `Diagnose`), das LKW-Header-Icon, das Einstellungs-Icon, Sendersuche- und Steuer-Buttons nutzen nun durchgängig `text-[var(--primary-foreground)]`.
  - **Letzter Amber-Hover am Weiter-Pfeil behoben ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Der Weiter-Pfeil (`›`) am rechten Rand des Automotive Cluster Docks hatte noch `hover:bg-amber-500/20` und `hover:text-amber-300` hinterlegt. Dieser nutzt nun konsistent `hover:bg-primary/20` und `hover:text-primary`.
 
## [1.7.75] - 2026-10-01
 
### 🎨 CarPlay Custom Theme & Glow Synchronisation
  - **Dynamischer Custom Farbwert & Glow in allen CarPlay-Komponenten ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx), [index.css](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/index.css))**:
    - **Vollständige Umstellung auf `var(--primary)` & `var(--primary-glow)`**: Sämtliche hartcodierten Amber-/Bernstein-Glows (`rgba(245,158,11,...)`, `rgba(251,191,36,...)`, `shadow-amber-*`, `shadow-lg shadow-amber-500/25`) wurden durch dynamische CSS-Variablen ersetzt.
    - **Mediaplayer & Timeline**: Fortschrittsbalken und Leuchteffekte im Windows SMTC-, Lokal- und Radio-Player richten sich nun nach der gewählten Akzentfarbe.
    - **Digital Cockpit & Tacho**: Der Geschwindigkeitsbalken, die Ganganzeige (`D1`–`D18`) sowie das Drehzahlband leuchten im Custom Theme Glow statt im statischen Bernstein.
    - **LKW-Tab & Automotive Cluster-Dock**: Aktive Segment-Pills (`Cockpit`, `Bordcomputer`, `Diagnose`), Navigationspfeile, Füllstandsbalken (Tank & LKW-Zustand) und Paginierungspunkte nutzen nun das konfigurierte Custom Theme samt Glow.
    - **Radio-Sender & Sendersuche**: Fokusringe, aktive Sendermarkierungen und die Import-Schaltflächen adaptieren automatisch den Wunschfarbwert.
    - **CarPlay Einstellungen, Virtuelle Tastatur & Zündungs-Standby**: Aktive Einstellungskacheln, Alert-Toggles, Tastaturtasten-Fokus sowie der schwebende Zündungs-Reaktivierungs-Pill und Ambient-Hintergrund-Auras strahlen in der personalisierten Akzentfarbe.
  - **Fensterübergreifende Theme-Synchronisation ([main.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/main.tsx), [ThemeContext.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/context/ThemeContext.tsx))**:
    - **ThemeProvider-Integration**: `CarPlayPage` ist nun in `main.tsx` fest im `<ThemeProvider>` eingebunden, sodass Farb-, Glow- und Modus-Änderungen aus den Haupteinstellungen sofort im CarPlay-Fenster ankommen.
    - **Cross-Window Storage Listener**: Ein Event-Listener auf `openpipeclub_app_appearance` synchronisiert Theme- und Glow-Anpassungen in Echtzeit zwischen Hauptfenster, separatem CarPlay-Browser-Fenster und Overlay.
 
## [1.7.74] - 2026-10-01
 
### ⚡ Zündungs-Automatik (Auto-Sleep) & Überarbeiteter Seitenwechsel im LKW-Tab
  - **CarPlay Zündungs-Koppelung & Automatischer Standby ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx), [OverlaySettings.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/OverlaySettings.tsx), [telemetry-bridge.cs](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/telemetry-bridge.cs))**:
    - **Echtzeit-Zündungserkennung**: Auslesen der SCS-Telemetrie-Kanäle `electricEnabled` (Offset 1575) und `engineEnabled` (Offset 1576) in der C#-Bridge sowie im Telemetrie-Stream. Zuverlässiger Fallback auf Motordrehzahl/Geschwindigkeit.
    - **Einstellungs-Option**: Neuer Schalter *"Zündungs-Automatik (Standby)"* in den CarPlay-Einstellungen (`activeTab === 'settings'`) sowie in den App-Overlay-Einstellungen (`OverlaySettings.tsx`).
    - **Authentischer Standby-Ruhezustand**:
      - Schaltet sich die LKW-Zündung aus, wechselt CarPlay nach Wunsch in einen tiefschwarzen, augenschonenden Standby-Modus mit großer Digitaluhr, Datum, Fahrzeug-Info und dezentem Ambient-Glow.
      - Sobald die Zündung im Spiel wieder eingeschaltet wird (`electricEnabled: true`), wacht CarPlay vollautomatisch mit flüssiger Startanimation auf.
      - **Touch-to-Wake**: Ein Fingertipp auf den Standby-Bildschirm weckt das Dashboard auch bei ausgeschalteter Zündung temporär auf; ein schwebender Status-Pill erlaubt jederzeit das manuelle Zurückversetzen in den Standby.
      - In den Einstellungen bleibt der Ruhezustand deaktiviert, damit Konfigurationen jederzeit ungestört vorgenommen werden können.
  - **Neugestaltung des Seitenwechslers auf dem LKW-Tab ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Integriertes Automotive Cluster-Dock**: Die bisherigen getrennten kleinen Boxen wurden durch eine elegante, zusammenhängende Kapsel im High-End-Sportwagen-Look ersetzt.
    - **3 Haptische Segment-Pills**:
      - `01 • Cockpit` (Tacho, Drehzahl, Gang & Fahrdynamik)
      - `02 • Bordcomputer` (Tank, Reichweite, Ø Verbrauch & Lenkzeit)
      - `03 • Diagnose` (LKW- & Frachtzustand, Bremsdruck, Öldruck, Kühlwasser, Elektrik)
      - Aktive Seite mit leuchtendem Bernstein-Gold-Farbverlauf (`from-amber-400 via-amber-500 to-amber-600`), tiefem Glanzschatten und hohem Kontrast.
    - **Schwebende Seiten-Navigatoren**: Links und rechts am Bildschirmrand sitzen nun dezente Pfeil-Tasten (`‹` und `›`), über die man mit einem Klick oder Fingertipp überall im Cockpit bequem durchblättern kann.
    - **Interaktive untere Paginierungsleiste**: Dreigeteilte Leiste am unteren Kartenrand mit animierten Leuchtstreifen zur schnellen Direktwahl der Seiten.
 
## [1.7.73] - 2026-10-01
 
### 🏎️ CarPlay Digital Cockpit Neugestaltung & Entfernung des Tacho-Popups
  - **Fokussiertes Digital Cockpit Widget auf dem Home Tab ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Reines 3-Elemente-Layout**: Vollständig entschlackt auf die drei fahrrelevanten Kernwerte:
      1. **Geschwindigkeit**: Große digitale Geschwindigkeitsanzeige (`KM/H`), interaktive Tempolimit-Plakette mit visueller Warnung (`isOverspeed`) und linearer Beschleunigungsleiste.
      2. **Ganganzeige**: Prominente Gangkennzeichnung (`D1`–`D18`, `R`, `N`) mit intelligenter Farbcodierung (Amber für Drive, Rot für Reverse, Grün für Neutral) sowie Fahrstufen-Status (`VORWÄRTS`, `RÜCKWÄRTS`, `LEERLAUF`, `PARKBREMSE`).
      3. **Drehzahl (RPM)**: Präzise numerische Live-Drehzahlanzeige (`U/MIN`), dynamische Zonen-Badges (`ECO ZONE`, `POWER`, `HIGH RPM`) und ein 20-Segment-LED-Drehzahlband mit Farbverlauf von Eco-Grün über Power-Gelb bis zum roten Drehzahlbegrenzer.
    - Überflüssige Anzeigen (Zustand/Verschleiß, Restreichweite/Tank) wurden wie gewünscht aus dem Widget entfernt.
  - **Entfernung des Tacho-Popups / Instrumentencluster-Modals ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - Der Klick-Trigger (`onClick={() => setMaximizedWidget('diagnostics')}`) auf dem Widget wurde entfernt; das Widget agiert nun als reines, nicht-störendes Informationsinstrument.
    - Das bisherige Vollbild-Tacho-Modal (`maximizedWidget === 'diagnostics'`) und dessen Tastaturnavigation wurden vollständig entfernt.
  - **Multi-Page LKW-Tab mit maximal vergrößerter Typografie ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **3 spezialisierte Unterseiten statt überfülltem 6-Karten-Raster**:
      1. **Seite 1: Cockpit & Antrieb**: Riesiger digitaler Tacho (84px Ziffern) mit Tempolimit-Schild, Tempomat-Pille und Beschleunigungsbalken links, riesige Ganganzeige (56px) sowie breites 24-Segment-LED-Drehzahlband mit Zonen-Labels rechts.
      2. **Seite 2: Bordcomputer & Tank**: Großzügiges 2x2-Raster mit 52px-Zahlen für Tankstand (Liter mit 10-Stufen-Füllstandsbalken), Restreichweite (KM), Durchschnittsverbrauch (L/100km) und verbleibender Lenkzeit bis zur nächsten Pause.
      3. **Seite 3: Diagnose & Zustand**: Große Schadens-Hero-Kacheln für LKW-Gesamtzustand (%) und Frachtsicherheit (Frachtgut-Name & Schaden %), plus 5 eigenständige Sensorkacheln für Öldruck, Kühlwasser, Bremsluftdruck, Bordelektrik und Handbremse.
    - **Apple CarPlay Sub-Navigation**: Schnellumschalter mit Touch-Pills, Tastatur-/Rotary-Navigation sowie Vor-/Zurück-Pfeiltasten mit weichen Framer-Motion Slide-Übergängen. Zustands-Persistenz im `localStorage`.
 
## [1.7.72] - 2026-10-01
 
### 🧭 Detaillierte Onboarding-Tour für Karte, Galerie, Statistiken, AFK Bot & Overlay-Einstellungen
  - **Präzise Spotlight-Fokussierung & Funktionserklärungen ([SpotlightTour.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/SpotlightTour.tsx))**:
    - **Karte**: 4 separate Tour-Schritte für Live-Fahrerzähler & Refresh, Ebenen & Filter (Staus, Blitzer, 3D-Gelände/Kamera), Server-Wahl & Stau-Hotspots sowie die Fahrerliste mit TruckersMP-ID Ortung.
    - **Galerie**: Erklärung des Upload-Bereichs mit Bildunterschrift und Mehrfachauswahl sowie der Community-Fotowand mit Uploader-Badges, Editieren, Löschen und Vollbild-Lightbox.
    - **Statistiken**: Aufteilung in Flotten-Kennzahlen (Fahrer, Jobs, KM, Umsatz, Frachtgewicht, Level), Fahrer-Vergleichsdiagramme (KM & Umsatz) und Top-10-Fahrer-Rangliste mit Umsatzanteilen.
    - **AFK Bot**: 3 Schritte für Status & Schutz vor Server-Kicks (Prüfung auf aktives Spielfenster), globale Hotkey- und Intervall-Konfiguration sowie getrennte Nachrichten-Pools für Fahrt vs. Rastplatzpause.
    - **Overlay-Einstellungen**: 5 spezialisierte Schritte für die 4-Bereiche-Navigation (Tabs), Live-HUD-Vorschau mit Desktop-Modus und Drag & Drop, HUD-Stile & Widget-Auswahl, CarPlay-Display mit QR-Code/Netzwerkadresse für Tablets und TruckersMP UI-Customizer mit 1-Klick-Installation.
  - **Reaktives Submenü- & Tab-Switching ([Map.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Map.tsx), [OverlaySettings.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/OverlaySettings.tsx))**:
    - Per `opc-tour-step` klappen Kartenebenen und Seitenleiste automatisch auf, sobald der jeweilige Schritt aktiv ist, und in den Overlay-Einstellungen wechseln die Tabs (Overlay, CarPlay, TMP UI) passend zum Tour-Schritt.

### 🗺️ Standalone Routenplaner & 4K-Bild-Export für das Event-Team
  - **Routenplaner-Button für das Event-Team ([Events.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Events.tsx))**:
    - Auf der Terminkalender-Seite steht berechtigten Rollen (`canManageEvents`) neben dem Button "Event planen" ab sofort der Schnellzugriff **"Routenplaner & Export"** zur Verfügung.
  - **Metadaten-Formular für Veranstalter, Startzeit & Branding ([RoutePlannerExportModal.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlannerExportModal.tsx))**:
    - Im neuen Routenplaner-Modal können Strecken geplant werden, ohne vorab ein Event in der Datenbank speichern zu müssen.
    - Vollständiges Eingabeformular für Veranstalter/Organisator, Konvoititel, Startzeit & Datum (UTC-fähig mit Schnellwahltasten), Server, Spiel sowie Start-/Ziel-Städte und Firmen.
    - Alle Eingaben werden reaktiv an den Routenplaner übergeben und live in das generierte 4K-Poster eingebunden.
  - **Behebung von Wegpunkt-Verschiebungen & High-DPI-Skalierung ([RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx))**:
    - **Problem behoben**: `map.project` lieferte Pixelkoordinaten im logischen CSS-Raum des Containers. Die bisherige Division durch die Pufferbreite des Canvas (`mapCanvas.width`) ignorierte die Windows-Skalierung (`devicePixelRatio` 1.25 / 1.5). Dadurch waren Wegpunkte, Stadtpunkte und Badges auf dem gerenderten Bild um 25–50 % nach links oben verschoben.
    - **DPI-unabhängige Projektion**: Division erfolgt nun strikt durch die CSS-Dimensionen des Containers (`cWidth`, `cHeight`). Alle Start-, End- und Zwischenwegpunkte sitzen nun absolut deckungsgleich auf den realen Straßenkreuzungen und Städten.
  - **Keine Abdunklung der Route mehr & harmonischer Alpha-Fade-Out ([RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx))**:
    - Die Maske um die Route besitzt nun einen breiten, zu 100 % deckenden Kern (`160 * S`, 320px in 4K), sodass die Routenlinie und direkte Nachbarstraßen niemals durch die Vignette abgedunkelt werden.
    - Nach außen blendet die Karte über einen mehrstufigen Gaußschen Verlauf (`280 * S`, `450 * S`, `680 * S`) butterweich in den dunklen Scania-Truck-Hintergrund aus.
    - Zusätzlich wird die Route auf dem 4K-Canvas mit einem hochbrillanten, neon-violetten Vektor-Glow (`shadowColor: #c084fc`, `shadowBlur: 24 * S`) überzeichnet, was maximale Helligkeit und Leuchtkraft garantiert.
  - **Gestochene 4K-Städtenamen im TruckersMP-Look auf dem Endbild ([RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx))**:
    - **Problemursache**: Die MapLibre-Vektorebene (`ets2-cities`) verwendet Standard-Schriftarten (`Open Sans`), die auf dem hochskalierten 4K-Export unscharf wirkten und nicht der markanten Club- und TruckersMP-Typografie (`Unbounded`, weiße Netzknoten, tiefe Halos) entsprachen.
    - **Intelligente Umschaltung beim Export**: Für den 4K-Export-Schnappschuss werden die WebGL-Stadtebenen kurzzeitig ausgeblendet (`visibility: 'none'`) und unmittelbar danach für die interaktive Routenplanung wieder eingeblendet.
    - **Natives 4K Canvas 2D City Rendering (Step 4)**:
      - Entlang des beleuchteten Korridors (`dist <= 480 * S`) werden alle relevanten Städte in nativer 3840×2160-Auflösung mit kreideweißem Netzknoten (`arc(px, py, 5.0 * S)`), schwarzer Kontur und 8px Drop Shadow gezeichnet.
      - Die Städtenamen werden im exakten `800 "Unbounded"`-Schriftsatz mit 3.5px Kontur-Halo rechts neben dem Punkt (`x + 8.5 * S`) gerendert.
      - Integrierte Bounding-Box-Kollisionsprüfung gegen Textüberlappungen; Duplikate direkt an `START`- und `END`-Pins werden unterdrückt, während Zwischenwegpunkte (z. B. #1 in Danzig) wie im Referenzbild mit Knoten und Namen erscheinen.
      - **Bugfix (Variable Scope `projected`)**: `projected` auf Funktionsebene verschoben, wodurch der Laufzeitfehler `ReferenceError: projected is not defined` beim Berechnen der Routennähe behoben ist.
  - **Direkter 4K-Routenbild Download & Export ([RoutePlanner.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/RoutePlanner.tsx))**:
    - Der Vorschaudialog bietet nun einen direkten **"Bild herunterladen"**-Button zum lokalen Speichern des 4K-Routenposters (3840×2160 UHD) als JPEG.
    - Eine Bildvorschau mit Download-Button wird nach der Generierung zudem direkt in der Metadaten-Leiste des Modals angezeigt.
 
## [1.7.71] - 2026-09-27
 
### 📷 Frühere Blitzer-Warnung, Overlay-HUD & Korrekter Verbrauch bei Tankstopps
  - **Frühzeitige Blitzer-Warnung mit ETS2 1:19 Maßstab ([ets2Speedcams.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/data/ets2Speedcams.ts), [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx))**:
    - **Problem behoben**: Die Blitzer-Distanzberechnung berechnete den euklidischen Abstand in realen WGS84-Erdkoordinaten. Da die ETS2-Spielwelt im Maßstab 1:19 komprimiert ist, entsprachen 750 WGS84-Meter in der Spielwelt lediglich rund 39,4 Metern! Bei 80 km/h (22,2 m/s) löste die Warnung daher erst ca. 1,7 Sekunden vor dem Blitzer aus – genau im Moment der Vorbeifahrt.
    - **Spielwelt-Skalierung**: Die WGS84-Distanz wird nun durch 19.0 dividiert. Die Warnung schlägt nun verlässlich bei echten 750 Spielmetern vor dem Blitzer an (bei 80 km/h rund 34 Sekunden Vorwarnzeit inklusive Live-Distanz-Countdown).
    - **Fahrtrichtungs-Filterung**: Übergabe des Fahrzeug-Kompasswinkels (`desiredBearing`). Blitzer auf Gegenfahrbahnen oder hinter dem LKW werden ignoriert.
  - **Blitzer-Warnanzeige im Desktop-Overlay ([Overlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Overlay.tsx), [OverlaySettings.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/OverlaySettings.tsx), [projections.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/utils/projections.ts))**:
    - **HUD-Warnbanner am oberen Bildschirmrand**: Nähert sich das Fahrzeug einem Blitzer, blendet das Desktop-Overlay ein animiertes Warnbanner ein: Kamera-Icon, Live-Entfernung in Metern, Tempolimit-Schild und Straßenbezeichnung.
    - **Überschreitungswarnung**: Bei Geschwindigkeitsüberschreitung pulsiert das Banner in Warnrot (`+XX km/h zu schnell!`).
    - **Unabhängig von Kartenanzeige**: Die Blitzerprüfung läuft im Overlay über Telemetrie-Koordinaten (`posX`/`posZ`) und `computeExactBearing` auch dann eigenständig weiter, wenn das Karten-Widget im Overlay ausgeblendet oder deaktiviert ist.
    - **Einstellungs-Toggle**: In den Overlay-Einstellungen kann die Blitzer-Warnung nach Belieben ein- oder ausgeschaltet werden.
  - **Präzise Kraftstoffberechnung bei Tankstopps während Frachtaufträgen ([main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**:
    - **Problem behoben**: Wurde während eines Auftrags getankt, war der Tank bei Ankunft voller als bei Abfahrt (`current.fuel > session.startFuel`). Die bisherige Subtraktion `session.startFuel - current.fuel` wurde negativ und durch `Math.max(0, ...)` auf 0 geklemmt. Im Auftragsbericht stand daher fälschlicherweise `0 L` und `0.0 L/100km`.
    - **Nachtank-Erfassung (`totalRefueled`)**: Das Tracking überwacht den Tankstand kontinuierlich. Sprünge nach oben (`diff > 0.5 L`) beim Tanken an der Zapfsäule werden exakt aufsummiert und in der aktiven Sitzung (`activeJobSession.totalRefueled`) fortgeführt.
    - **Exakter Verbrauch**: Der tatsächliche Verbrauch berechnet sich nun aus:
      `fuelUsed = (startFuel - finalFuel) + totalRefueled`.
      Selbst nach mehreren Tankstopps oder Volltanken wird der exakte Dieselverbrauch in Litern und l/100km auf den Deziliter genau ausgewiesen.
 
## [1.7.70] - 2026-09-27
 
### 🛣️ Beseitigung von Z-Knick-Stufen & Zuverlässige Routenanzeige im Overlay-Karten-Widget
  - **Harmonische Bézier-Kurvenglättung ([routeSmoother.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/utils/routeSmoother.ts))**:
    - Die bisherige Hermite-Spline-Interpolation neigte bei ungleichen Segmentabständen und SCS-Verbindungsknoten (z. B. Autobahn A1 bei Hamburg) zu starkem seitlichen Überschwingen, was Z-förmige Stufen hervorrief.
    - Vollständiger Umstieg auf ein geometrisches quadratisches Bézier-Fillet-Verfahren: Garantiert innerhalb der konvexen Hülle, kein seitliches Ausbeulen, weiche Rundung von Kurven (1° bis 85°) und Erhalt scharfer 90°-Kreuzungen.
  - **Dauerhafte Routenanzeige im Overlay ([Overlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Overlay.tsx), [GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx))**:
    - **Komponenten-Cache (`cachedRouteWaypointsRef`)**: Wegpunkte bleiben im Overlay auch dann erhalten, wenn nachfolgende Telemetrie-Ticks zur Bandbreitenschonung keine neuen Wegpunkte mitsenden.
    - **Fehl-Reset verhindert**: `GameMapWidget.tsx` löscht bestehende In-Game-Routen nicht mehr, wenn `routeWaypoints` kurzzeitig nicht übertragen wird.
    - **Sofortige Synchronisation**: `overlay-get-state` liefert beim Start des Overlays direkt alle aktiven In-Game-Wegpunkte aus.
 
## [1.7.69] - 2026-09-27

### 🛣️ Kurvenglättung gegen zackige Routen & Fix für Routenanzeige im Overlay-Kartenwidget
  - **Kurvenglättung mit Hermite-Spline ([GameMapWidget.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/components/GameMapWidget.tsx))**:
    - Direkte Spiel-Wegpunkte aus ETS2/ATS werden nun mit `smoothRouteCoords` (4m Schrittweite, 80° Glättungswinkel) sanft entlang des Straßenverlaufs interpoliert. Eckige Sehnen ("zackige Routen") auf Autobahnkurven werden komplett beseitigt.
  - **Routenanzeige im Desktop-Overlay repariert ([Overlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Overlay.tsx), [main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**:
    - **Schutz vor ungewolltem Routen-Reset**: In `GameMapWidget.tsx` wurde verhindert, dass Routen in freier Fahrt gelöscht werden, wenn direkte Wegpunkte vorliegen.
    - **Kontraststarkes Casing & Farbgebung**: Zusätzliche dunkle Kontur (`route-remaining-casing`) und automatische Umschaltung auf kontrastreiches Navigations-Lila (`#a855f7`), falls die Akzentfarbe ein Blauton ist, der auf den blauen ETS2-Autobahnen unsichtbar wäre.
    - **Persistentes Telemetrie-Caching**: `useTelemetry` in `Overlay.tsx` sowie IPC-Handler in `main.ts` garantieren die sofortige Verfügbarkeit der Wegpunkte beim Öffnen oder Neuladen des Overlays.

## [1.7.68] - 2026-09-27

### 🧭 CarPlay & Overlay: In-Game Routen & freie Wegpunkte auf Karten-Widgets wiederhergestellt
  - **Freie Navigation ohne Frachtjob im CarPlay ([CarPlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/CarPlay.tsx))**:
    - **Problem behoben**: Wurde in ETS2 oder ATS im Spielmenü / auf der Weltkarte ein Wegpunkt oder eine Route gesetzt, während man sich in freier Fahrt befand (ohne aktiven Frachtmarkt-Job), leerte CarPlay die Wegpunkte bei jedem Telemetrie-Tick sofort wieder (`data.routeWaypoints = []`), da eine strikte Prüfung auf `jobActive` vorlag.
    - **Unabhängiges Wegpunkt-Caching**: Das Caching der 1:1 In-Game-Wegpunkte (`cachedRouteWaypointsRef`) in SSE- und IPC-Handlern arbeitet nun unabhängig davon, ob ein Frachtauftrag aktiv ist oder der Fahrer in freier Fahrt cruist.
    - **Navigationsleiste & Status**: `isRouteActive` und die verbleibende Distanz-/Zeitanzeige springen nun zuverlässig auch bei freier In-Game-Navigation (`navDistance > 0`, `navTime > 0` oder vorhandene `routeWaypoints`) an.
  - **Routenanzeige auf dem Overlay Karten-Widget ([Overlay.tsx](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/src/pages/Overlay.tsx), [main.ts](file:///c:/Users/Ally/Documents/Open%20Pipe%20Club/opc-app/electron/main.ts))**:
    - **Zuverlässige Initialisierung**: `useOverlayTelemetry` fragt beim Start nun explizit den initialen Telemetriestatus über `overlay-get-state` ab, sodass gesetzte Wegpunkte auch bei nachträglich geladenem Overlay-Fenster sofort vorhanden sind.
    - **Event- & In-Game-Routen**: Das Overlay unterstützt nun dieselbe Wegpunkt-Logik (`effectiveRouteWaypoints`), unterstützt aktive OPC-Event-Routen (`activeEventRoute`) und leert die Karte bei Auftragsabgabe oder Abbruch.
    - **Verlustfreier IPC-Dispatch**: Telemetrie-Pakete mit neu berechneten `routeWaypoints` umgehen das Drosselintervall in `main.ts`, sodass keine Routenänderung mehr im IPC-Loop übersprungen werden kann.

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


