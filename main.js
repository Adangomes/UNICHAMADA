const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { machineIdSync } = require('node-machine-id');
const cfg = require('./desktop-config');

// Necessário para as notificações do Windows funcionarem
app.setAppUserModelId('com.unichamada.desktop');

// Os dois "index.html" do sistema, embutidos no app
const MODOS = {
  professor: {
    titulo: 'UniChamada',
    arquivo: path.join(__dirname, 'index.html'),   // professor, coordenador acadêmico e alunos
    exigeLicenca: true
  },
  ti: {
    titulo: 'UniChamada — Painel TI',
    arquivo: path.join(__dirname, 'ti', 'index.html'), // coordenador de TI e funcionários
    exigeLicenca: cfg.EXIGIR_LICENCA_NO_TI
  }
};

const ARQUIVO_LICENCA = () => path.join(app.getPath('userData'), 'licenca.json');
const janelas = {};                    // uma janela por modo
let modoPendenteAtivacao = 'professor';

/* ---------- Utilidades ---------- */

function lerModo(argv) {
  // O atalho "UniChamada - Painel TI" passa o parâmetro --ti
  return argv.includes('--ti') ? 'ti' : 'professor';
}

function idDaMaquina() {
  // Hash do identificador do sistema (não expõe o ID original)
  return machineIdSync(false);
}

function lerLicenca() {
  try { return JSON.parse(fs.readFileSync(ARQUIVO_LICENCA(), 'utf8')); } catch { return null; }
}
function salvarLicenca(dados) {
  fs.mkdirSync(path.dirname(ARQUIVO_LICENCA()), { recursive: true });
  fs.writeFileSync(ARQUIVO_LICENCA(), JSON.stringify(dados));
}
function apagarLicenca() {
  try { fs.unlinkSync(ARQUIVO_LICENCA()); } catch { /* já não existe */ }
}

/* ---------- Validação da licença (função validar_licenca no Supabase) ---------- */

async function validarOnline(serial) {
  try {
    const resp = await fetch(`${cfg.SUPABASE_URL}/rest/v1/rpc/validar_licenca`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${cfg.SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ p_serial: serial, p_machine_id: idDaMaquina() })
    });
    if (!resp.ok) return { ok: false, erroRede: false, motivo: 'Erro ao validar a licença (' + resp.status + ').' };
    const dados = await resp.json();
    return { ok: !!dados.ok, erroRede: false, motivo: dados.motivo || '' };
  } catch {
    return { ok: false, erroRede: true, motivo: 'Sem conexão com a internet.' };
  }
}

/* ---------- Janelas ---------- */

function abrirJanelaDoModo(modo) {
  if (janelas[modo] && !janelas[modo].isDestroyed()) {
    if (janelas[modo].isMinimized()) janelas[modo].restore();
    janelas[modo].focus();
    return;
  }

  const def = MODOS[modo];
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: def.titulo,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,   // páginas não acessam o Node.js (mais seguro)
      nodeIntegration: false,
      sandbox: true
    }
  });
  janelas[modo] = win;

  // Links externos abrem no navegador padrão, nunca dentro do app
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) {
      e.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });

  win.loadFile(def.arquivo);
}

function abrirJanelaAtivacao(modo, mensagem) {
  modoPendenteAtivacao = modo;
  const win = new BrowserWindow({
    width: 480,
    height: 420,
    resizable: false,
    maximizable: false,
    title: 'Ativação — UniChamada',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile('licenca.html', { query: { msg: mensagem || '' } });
  return win;
}

/* ---------- Fluxo de abertura: a licença é checada ANTES de abrir qualquer tela ---------- */

async function iniciarModo(modo) {
  if (!MODOS[modo].exigeLicenca) {
    abrirJanelaDoModo(modo);
    return;
  }

  const lic = lerLicenca();

  if (!lic || !lic.serial) {
    abrirJanelaAtivacao(modo);
    return;
  }

  const res = await validarOnline(lic.serial);

  if (res.ok) {
    salvarLicenca({ ...lic, validadoEm: Date.now() });
    abrirJanelaDoModo(modo);
    return;
  }

  if (res.erroRede) {
    const limite = cfg.DIAS_TOLERANCIA_OFFLINE * 24 * 60 * 60 * 1000;
    if (lic.validadoEm && Date.now() - lic.validadoEm < limite) {
      abrirJanelaDoModo(modo); // sem internet, mas validado recentemente
      return;
    }
    dialog.showErrorBox('UniChamada', 'Não foi possível validar a licença. Conecte-se à internet e tente novamente.');
    app.quit();
    return;
  }

  // Licença recusada pelo servidor (bloqueada, expirada, outra máquina...)
  apagarLicenca();
  abrirJanelaAtivacao(modo, res.motivo);
}

/* ---------- Menu (Mac): não há atalhos do instalador, então os dois modos ficam no menu ---------- */

function criarMenus() {
  if (process.platform !== 'darwin') return;

  const itensModos = [
    { label: 'UniChamada (Professor/Aluno)', click: () => iniciarModo('professor') },
    { label: 'UniChamada — Painel TI', click: () => iniciarModo('ti') }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: app.name, submenu: [...itensModos, { type: 'separator' }, { role: 'quit', label: 'Sair' }] },
    { label: 'Editar', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'Janela', submenu: [{ role: 'minimize' }, { role: 'togglefullscreen' }] }
  ]));

  if (app.dock) app.dock.setMenu(Menu.buildFromTemplate(itensModos));
}

/* ---------- IPC (tela de ativação) ---------- */

ipcMain.handle('licenca:ativar', async (event, serial) => {
  const chave = String(serial || '').trim().toUpperCase();
  if (!/^UNI-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(chave)) {
    return { ok: false, motivo: 'Formato inválido. Use UNI-XXXX-XXXX-XXXX.' };
  }
  const res = await validarOnline(chave);
  if (!res.ok) return { ok: false, motivo: res.motivo };

  salvarLicenca({ serial: chave, validadoEm: Date.now() });
  const janela = BrowserWindow.fromWebContents(event.sender);
  abrirJanelaDoModo(modoPendenteAtivacao);   // abre o sistema primeiro...
  if (janela) janela.close();                // ...e só então fecha a janela de ativação
  return { ok: true };
});

/* ---------- Instância única: o segundo atalho abre o outro modo ---------- */

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => iniciarModo(lerModo(argv)));
  app.whenReady().then(() => {
    criarMenus();
    iniciarModo(lerModo(process.argv));
  });
  app.on('window-all-closed', () => app.quit());
}