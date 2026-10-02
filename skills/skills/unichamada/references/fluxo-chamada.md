# Fluxo da chamada

## Visão do professor

1. **Abrir chamada** (`js/professor/chamada.js`): escolhe a turma e inicia a chamada. O computador que abre a chamada é a referência de localização para o geofencing.
2. **Token rotativo:** o sistema gera um QR Code e um código de 6 caracteres que expiram e são renovados em loop (estilo TOTP), para impedir o compartilhamento de códigos antigos.
3. **Modo Telão** (`js/professor/telao.js`): janela secundária aberta com `window.open`, projetada na sala, exibindo o QR e o código atuais em rotação sincronizada com a janela principal.
4. **Acompanhamento em tempo real:** a lista de presenças atualiza sozinha via Realtime do Supabase.
5. **Encerramento e histórico** (`js/professor/historico.js`): o professor encerra a chamada e pode ajustar presenças/faltas, sempre com justificativa, mantendo um histórico auditável.

## Visão do aluno (`js/aluno/confirmar-presenca.js`)

O aluno só tem a presença registrada se passar por **todas** as etapas, nesta ordem:

| # | Etapa | O que valida |
| --- | --- | --- |
| 1 | Leitura do QR Code | Chamada existente e aberta |
| 2 | RA e e-mail | Aluno existe e está vinculado ao curso/turma |
| 3 | Captura de rosto (face-id) | Camada de validação facial (`js/utils/camera.js`) |
| 4 | Geolocalização | Aluno a até 100 m do computador que gerou a chamada |
| 5 | Código do telão | Código de 6 caracteres vigente no momento |

## Pontos de atenção

- **Código expirado:** se o aluno demorar, o código do telão muda; ele deve digitar o que está na tela no momento.
- **Permissões do navegador:** câmera e localização precisam ser autorizadas; sem elas a etapa falha.
- **Precisão do GPS:** em ambientes fechados a precisão cai; considere isso ao ajustar o raio.
- **Ajustes manuais:** qualquer alteração de presença pelo professor deve registrar justificativa.
