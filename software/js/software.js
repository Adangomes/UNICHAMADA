document.addEventListener("DOMContentLoaded", () => {
  const btnDownload = document.getElementById("btn-download");
  const osBadge = document.getElementById("os-badge");
  const btnMainText = document.getElementById("btn-main-text");
  const btnSubText = document.getElementById("btn-sub-text");
  const osSize = document.getElementById("os-size");
  const osReq = document.getElementById("os-req");

  // Links diretos para os arquivos no GitHub Releases
  const macLink = "https://github.com/adangomes/UNICHAMADA/releases/download/v1.0.0/UniChamada-1.0.0-arm64.dmg";
  const winLink = "https://github.com/adangomes/UNICHAMADA/releases/download/v1.0.0/UniChamada-1.0.0-win.zip";

  // Identifica o sistema operacional do usuário
  const userAgent = navigator.userAgent || navigator.platform || window.navigator.userAgentData;

  if (/Mac|iPod|iPhone|iPad/.test(userAgent)) {
    // É usuário de Mac
    btnDownload.href = macLink;
    btnMainText.textContent = "Baixar para macOS";
    btnSubText.textContent = "UniChamada-1.0.0-arm64.dmg";
    osBadge.textContent = "Versão 1.0.0 • macOS (Apple Silicon)";
    osSize.textContent = "~110 MB";
    osReq.textContent = "Requer macOS 10.12+";
  } else {
    // Padrão para Windows
    btnDownload.href = winLink;
    btnMainText.textContent = "Baixar para Windows";
    btnSubText.textContent = "UniChamada-1.0.0-win.zip";
    osBadge.textContent = "Versão 1.0.0 • Windows (x64)";
    osSize.textContent = "~111 MB";
    osReq.textContent = "Requer Windows 10/11";
  }

  btnDownload.addEventListener("click", () => {
    console.log("Download do UniChamada iniciado com sucesso!");
  });
});
