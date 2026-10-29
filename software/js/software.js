document.addEventListener("DOMContentLoaded", () => {
  const btnDownload = document.getElementById("btn-download");
  const osBadge = document.getElementById("os-badge");
  const osIcon = document.getElementById("os-icon");
  const osSize = document.getElementById("os-size");
  const osReq = document.getElementById("os-req");

  // Links diretos para os arquivos que você vai colocar no GitHub Releases
  const macLink = "https://github.com/adangomes/UNICHAMADA/releases/download/v1.0.0/UniChamada-1.0.0-arm64.dmg";
  const winLink = "https://github.com/adangomes/UNICHAMADA/releases/download/v1.0.0/UniChamada-1.0.0-win.zip";

  // Identifica o sistema operacional do usuário
  const userAgent = navigator.userAgent || navigator.platform || window.navigator.userAgentData;

  if (/Mac|iPod|iPhone|iPad/.test(userAgent)) {
    // É usuário de Mac
    btnDownload.href = macLink;
    btnDownload.textContent = "Baixar UniChamada para macOS (.dmg)";
    osBadge.textContent = "Versão 1.0.0 • macOS (Apple Silicon)";
    osIcon.textContent = "🍏";
    osSize.textContent = "Tamanho: ~110 MB";
    osReq.textContent = "Requer macOS 10.12 ou superior";
  } else {
    // Padrão para Windows
    btnDownload.href = winLink;
    btnDownload.textContent = "Baixar UniChamada para Windows (.zip)";
    osBadge.textContent = "Versão 1.0.0 • Windows (x64)";
    osIcon.textContent = "💻";
    osSize.textContent = "Tamanho: ~111 MB";
    osReq.textContent = "Requer Windows 10/11";
  }

  btnDownload.addEventListener("click", () => {
    console.log("Download do UniChamada iniciado com sucesso!");
  });
});
