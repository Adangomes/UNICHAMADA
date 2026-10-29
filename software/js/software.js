document.addEventListener("DOMContentLoaded", () => {
  const btnDownload = document.getElementById("btn-download");

  if (btnDownload) {
    btnDownload.addEventListener("click", () => {
      console.log("Download do UniChamada iniciado...");
    });
  }
});
