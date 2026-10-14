; Inicio automatico para todos los usuarios de la PC (HKLM Run).
; El alumno, con cuenta normal, no puede borrar esta entrada.
!macro customInstall
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "LabControlAgent" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}"'
!macroend

!macro customUnInstall
  DeleteRegValue HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "LabControlAgent"
!macroend
