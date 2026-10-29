; O atalho "UniChamada" (professor/aluno) já é criado pelo electron-builder (createDesktopShortcut: true).
; Aqui criamos o segundo atalho, que abre o mesmo programa em modo TI (parâmetro --ti).

!macro customInstall
  CreateShortCut "$DESKTOP\UniChamada - Painel TI.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "--ti" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0
!macroend

!macro customUnInstall
  Delete "$DESKTOP\UniChamada - Painel TI.lnk"
!macroend