document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("app-container");

  const releases = {
    mac: {
      name: "macOS (Apple Silicon)",
      file: "UniChamada-1.0.0-arm64.dmg",
      url: "https://github.com/adangomes/UNICHAMADA/releases/download/v1.0.0/UniChamada-1.0.0-arm64.dmg",
      size: "~110 MB",
      req: "macOS 10.12+"
    },
    win: {
      name: "Windows (x64)",
      file: "UniChamada-1.0.0-win.zip",
      url: "https://github.com/adangomes/UNICHAMADA/releases/download/v1.0.0/UniChamada-1.0.0-win.zip",
      size: "~111 MB",
      req: "Windows 10/11"
    }
  };

  const userAgent = navigator.userAgent || navigator.platform || window.navigator.userAgentData;
  const isMac = /Mac|iPod|iPhone|iPad/.test(userAgent);
  
  const primaryOS = isMac ? releases.mac : releases.win;
  const secondaryOS = isMac ? releases.win : releases.mac;
  const primaryLabel = isMac ? "Baixar para macOS" : "Baixar para Windows";
  const secondaryLabel = isMac ? "Baixar para Windows (ZIP)" : "Baixar para macOS (DMG)";

  container.innerHTML = `
    <div class="download-card">
      <div class="card-top-info">
        <div class="os-badge">
          <span class="dot"></span>
          <span>Versão 1.0.0 • Detecção Inteligente (${primaryOS.name})</span>
        </div>
      </div>

      <h1 class="app-title">UniChamada Desktop</h1>
      <p class="app-description">
        Aplicativo acadêmico oficial para controle de chamadas e painel administrativo de TI com máxima performance e sincronização nativa.
      </p>

      <!-- Botões de Download com IDÊNTICO design de alto nível (Simetria Sênior) -->
      <div class="download-actions-grid">
        <!-- Botão Principal em Destaque -->
        <a href="${primaryOS.url}" class="btn-download-pro" id="primary-btn">
          <div class="btn-content">
            <span class="btn-title-text">${primaryLabel}</span>
            <span class="btn-subtitle-text">${primaryOS.file} (${primaryOS.size})</span>
          </div>
          <div class="btn-icon-box">
            <span>↓</span>
          </div>
        </a>

        <!-- Botão Secundário com o MESMO visual imponente -->
        <a href="${secondaryOS.url}" class="btn-download-pro secondary">
          <div class="btn-content">
            <span class="btn-title-text">${secondaryLabel}</span>
            <span class="btn-subtitle-text">${secondaryOS.file} (${secondaryOS.size})</span>
          </div>
          <div class="btn-icon-box">
            <span>↓</span>
          </div>
        </a>
      </div>

      <!-- Rodapé Técnico -->
      <div class="card-meta-footer">
        <span>Requisitos recomendados: ${primaryOS.req}</span>
        <span>Build 1.0.0 • Estável</span>
      </div>
    </div>
  `);

  const primaryBtn = document.getElementById("primary-btn");
  if (primaryBtn) {
    primaryBtn.addEventListener("click", () => {
      console.log(`[UniChamada]: Download iniciado para ${primaryOS.name}`);
    });
  }
});
