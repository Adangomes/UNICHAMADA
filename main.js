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

  // Verifica se o atalho acionado passou a flag de TI
  const modoTI = process.argv.includes('--ti');

  if (modoTI) {
    // Abre diretamente o painel de TI protegido pela chave serial
    mainWindow.loadFile(path.join(__dirname, 'ti/index.html'));
  } else {
    // Abre o fluxo acadêmico normal (Professores e Alunos)
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
  }
}

app.whenReady().then(createWindow);