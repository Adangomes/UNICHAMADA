document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("app-container");

  // Links oficiais apontando para o GitHub Releases v1.0.0
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

  // Detecção Inteligente de OS do Utilizador
  const userAgent = navigator.userAgent || navigator.platform || window.navigator.userAgentData;
  const isMac = /Mac|iPod|iPhone|iPad/.test(userAgent);
  
  const targetOS = isMac ? releases.mac : releases.win;
  const altOS = isMac ? releases.win : releases.mac;
  const altKey = isMac ? 'Windows' : 'macOS';

  // Montagem Limpa e Dinâmica via JavaScript (Sem poluir o HTML)
  container.innerHTML = `
    <div class="download-card">
      <div class="card-top-info">
        <div class="os-badge">
          <span class="dot"></span>
          <span>Versão 1.0.0 • ${targetOS.name}</span>
        </div>
      </div>

      <h1 class="app-title">UniChamada Desktop</h1>
      <p class="app-description">
        Aplicativo oficial para gerenciamento de chamadas e painel administrativo em ambiente acadêmico com alto desempenho e sincronização em tempo real.
      </p>

      <!-- Botão de Download Principal -->
      <a href="${targetOS.url}" class="btn-download-main" id="main-download-btn">
        <div class="btn-content">
          <span class="btn-title-text">Baixar para ${isMac ? 'macOS' : 'Windows'}</span>
          <span class="btn-subtitle-text">${targetOS.file}</span>
        </div>
        <div class="btn-icon-wrapper">
          <span>↓</span>
        </div>
      </a>

      <!-- Metadados -->
      <div class="card-meta-footer">
        <span>Requisitos: ${targetOS.req}</span>
        <span>Tamanho: ${targetOS.size}</span>
      </div>

      <!-- Alternativa de Sistema -->
      <div class="platform-switch">
        <p>Procura a versão para outro sistema?</p>
        <div class="platform-links">
          <a href="${altOS.url}">Baixar para ${altKey} (${altOS.file.split('.').pop().toUpperCase()})</a>
        </div>
      </div>
    </div>
  `;

  // Listener de Telemetria / Evento de Clique
  const downloadBtn = document.getElementById("main-download-btn");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      console.log(`[UniChamada Sênior]: Download iniciado para ${targetOS.name}`);
    });
  }
});
