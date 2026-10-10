; ==============================================================================
; Open Pipe Club App - Custom NSIS Installer Configuration
; ==============================================================================

!macro customHeader
  ; Custom Branding Text at the bottom of the installer wizard
  BrandingText "Open Pipe Club • Spedition & Telemetrie Tracker • openpipeclub.com"

  ; Custom German Strings & Titles
  !define MUI_WELCOMEPAGE_TITLE "Willkommen beim Open Pipe Club Setup"
  !define MUI_WELCOMEPAGE_TEXT "Dieser Assistent führt dich durch die Installation der Open Pipe Club App (Telemetrie-Tracker, In-Game CarPlay & Speditionssystem).$\r$\n$\r$\nEs wird empfohlen, Euro Truck Simulator 2 oder American Truck Simulator vor Beginn der Installation zu schließen.$\r$\n$\r$\nKlicke auf 'Weiter', um fortzufahren."

  !define MUI_FINISHPAGE_TITLE "Installation erfolgreich abgeschlossen!"
  !define MUI_FINISHPAGE_TEXT "Die Open Pipe Club App wurde erfolgreich auf deinem Computer eingerichtet.$\r$\n$\r$\nViel Spaß auf den Straßen Europas und Amerikas!"
  !define MUI_FINISHPAGE_RUN_TEXT "Open Pipe Club App jetzt starten"

  !define MUI_UNCONFIRMPAGE_TEXT_TOP "Die Open Pipe Club App wird vollständig von deinem Computer entfernt."
!macroend

!macro customInit
  ; Gracefully close any running instance of the app before installing
  nsExec::Exec 'taskkill /F /IM "Open Pipe Club App.exe" /T'
  nsExec::Exec 'taskkill /F /IM "opc-telemetry-bridge.exe" /T'
!macroend

!macro customUnInstall
  ; Gracefully close any running instance before uninstalling
  nsExec::Exec 'taskkill /F /IM "Open Pipe Club App.exe" /T'
  nsExec::Exec 'taskkill /F /IM "opc-telemetry-bridge.exe" /T'
!macroend
