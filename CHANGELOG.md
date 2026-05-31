# Changelog

## 2026-05-31
- Hinzugefügt: **Single‑Row HUD** Umschalter in OverlaySettings, ermöglicht die Anzeige der HUD‑Widgets in einer horizontalen Zeile.
- Implementiert: **Zentrierung der HUD‑Inhalte**, wenn der Single‑Row‑Modus aktiv ist (`justify-center`).
- Aktualisiert: Widget‑**Resize‑Logik**:
  - Mindestbreite jetzt auf 120 px festgelegt.
  - Mindestgröße von 40 px bleibt für das Verkleinern erlaubt.
  - Breite im Single‑Row‑Modus unbegrenzt; Höhe im Single‑Row‑Modus auf Standardgröße begrenzt.
- Ursprüngliche Größengrenzen wiederhergestellt, wenn der Single‑Row‑Modus deaktiviert ist, sodass Widgets ihre Standardgrößen einhalten.
- Overlay‑Rendering angepasst, um gespeicherte Widget‑Abmessungen zu verwenden und Zoom, Hintergrund‑Deckkraft und Unschärfe zu berücksichtigen.
- Layout‑Reset korrigiert, sodass auch die Widget‑Größen zurückgesetzt werden.
- UI‑Stil und CSS‑Klassen für das neue Layout‑Verhalten aktualisiert.
- Entfernt: Alle Blur‑bezogenen CSS‑Klassen und Inline‑Stile (`backdrop-blur*`, `backdropFilter`) aus `Overlay.tsx` und `OverlaySettings.tsx`.
- Entfernt: UI‑Einstellungen für Widget‑Blur aus den Overlay‑Einstellungen.
- Aktualisiert: Hintergrund- und Toast‑Designs, verwenden nun opaque dunkle Hintergründe ohne Blur‑Effekte.


## 2026-05-30
- Erste Implementierung von Widget‑Größenanpassung und Synchronisation im Layout‑Editor.
- Overlay‑Settings‑Persistenz und IPC‑Kommunikation hinzugefügt.
- Reset‑Funktion für Positionen und Größen implementiert.
- Mindestgrößen‑Constraints für Widgets hinzugefügt.

_Dieses Projekt verwendet semantische Versionskontrolle. Zukünftige Änderungen werden hier dokumentiert._
