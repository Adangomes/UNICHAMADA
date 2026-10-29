!macro customInstall
  ; Cria o atalho para o Painel de TI na Área de Trabalho passando o argumento --modo=ti
  CreateShortCut "$DESKTOP\UniChamada — Painel TI.lnk" "$INSTDIR\UniChamada.exe" "--modo=ti"
!macroend

!macro customUnInstall
  ; Remove o atalho do Painel de TI quando o usuário desinstalar o programa
  Delete "$DESKTOP\UniChamada — Painel TI.lnk"
!macroend