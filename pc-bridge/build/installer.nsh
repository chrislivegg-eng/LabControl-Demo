; Inicio automatico para todos los usuarios de la PC (HKLM Run).
; El alumno, con cuenta normal, no puede borrar esta entrada.
!macro customInstall
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "LabControlAgent" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}"'
  ; Tarea vigilante: si cierran el agente, Windows lo vuelve a abrir (build/vigilante.ps1).
  nsExec::ExecToLog 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\resources\vigilante.ps1" -Exe "$INSTDIR\${APP_EXECUTABLE_FILENAME}"'
!macroend

!macro customUnInstall
  DeleteRegValue HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "LabControlAgent"
  nsExec::ExecToLog 'schtasks.exe /Delete /TN "LabControl Agent - Vigilante" /F'
!macroend
