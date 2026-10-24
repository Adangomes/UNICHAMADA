# CHANGELOG - Modulo Mousepad / Trackpad Remoto

Todas as alterações, adições e especificações técnicas do módulo **Mousepad** (Controle Remoto Touch) do sistema **UniChamadas** estão documentadas neste arquivo.

---

## [1.0.0] - 2026-10-23

### 🚀 Adicionado
- **Interface Mobile Web (`mousepad/index.html`):**
  - Layout dark com estática *glassmorphism* otimizado para navegação mobile.
  - Bloqueio de zoom acidental via meta tag `viewport` (`user-scalable=no`).
  - Painel interativo `<canvas>` mapeado para touch events de tela cheia.
  - Indicadores e guia de gestos rápidos para apresentação.

- **Sistema de Feedback Visual Neon (`mousepad/css/trackpad.css` & `mousepad/js/trackpad.js`):**
  - Rastreamento dinâmico de gestos com renderização de partículas luminosas em tempo real.
  - Cores dinâmicas com brilho neon em tons cyano (`#00f0ff`) e roxo (`#7000ff`).
  - Animação e física de partículas no canvas (esmaecimento e redução gradual de escala).

- **Gestos de Controle Remoto:**
  - **Movimento (1 dedo):** Transmissão de deltas de deslocamento $(dX, dY)$ para navegação fluida do cursor na tela principal.
  - **Scroll (2 dedos):** Rolagem vertical de página em tempo real.
  - **Clique (1 toque rápido):** Emissão de evento de clique direto no elemento focado sob as coordenadas do cursor.

- **Comunicação Web Síncrona via Supabase Realtime:**
  - Integração via canal Broadcast `unichamadas_trackpad` para envio ultrarrápido de payloads leves sem necessidade de persistência em banco.
  - Módulo receptor desacoplado (`js/utils/trackpad-receptor.js`) integrado ao sistema principal sem ferir a arquitetura da SPA.

---

### 🏗️ Estrutura do Módulo

```text
UNICHAMADA/
└── mousepad/
    ├── css/
    │   └── trackpad.css       # Estilos da interface do trackpad e guia
    ├── js/
    │   └── trackpad.js        # Captura de gestos, efeito neon e emissão Realtime
    ├── skills/
    │   └── CHANGELOG.md       # Histórico de alterações e especificações
    └── index.html             # Endpoint do controle remoto web