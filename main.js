const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Verifica se o app foi aberto pelo atalho de TI (--modo=ti)
  const modoTI = process.argv.includes('--modo=ti');

  if (modoTI) {
    // Abre o index.html que está dentro da pasta /ti
    mainWindow.loadFile(path.join(__dirname, 'ti', 'index.html'));
  } else {
    // Abre o index.html principal (raiz) para professores/alunos
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});