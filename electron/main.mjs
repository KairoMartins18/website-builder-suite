// Processo principal do Electron: janela, persistência em arquivos e exportação.
import { app, BrowserWindow, dialog, ipcMain, Menu, nativeTheme, shell } from 'electron';
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEV_URL = process.env.VITE_DEV_SERVER_URL;
const isMac = process.platform === 'darwin';

app.setName('Website Builder Suite');
// Permite isolar os dados (testes automatizados, perfis separados).
if (process.env.WB_USER_DATA_DIR) app.setPath('userData', process.env.WB_USER_DATA_DIR);

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

// ---------------- armazenamento (um JSON por site) ----------------

const dataDir = () => path.join(app.getPath('userData'), 'sites');
const ID_RE = /^[a-z0-9]{4,40}$/i;

function sitePath(id) {
  if (typeof id !== 'string' || !ID_RE.test(id)) throw new Error('ID de site inválido');
  return path.join(dataDir(), `${id}.json`);
}

/** Escrita atômica: grava num temporário e renomeia (evita arquivo corrompido se o app fechar no meio). */
async function writeAtomic(file, data) {
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, data);
  await rename(tmp, file);
}

const toMeta = (s) => ({ id: s.id, name: s.name, createdAt: s.createdAt, updatedAt: s.updatedAt, templateId: s.templateId });

ipcMain.handle('sites:list', async () => {
  await mkdir(dataDir(), { recursive: true });
  const files = (await readdir(dataDir())).filter((f) => f.endsWith('.json'));
  const metas = [];
  for (const f of files) {
    try {
      metas.push(toMeta(JSON.parse(await readFile(path.join(dataDir(), f), 'utf8'))));
    } catch (err) {
      console.error('Arquivo de site ilegível:', f, err);
    }
  }
  return metas.sort((a, b) => b.updatedAt - a.updatedAt);
});

ipcMain.handle('sites:get', async (_e, id) => {
  try {
    return JSON.parse(await readFile(sitePath(id), 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return undefined;
    throw err;
  }
});

ipcMain.handle('sites:save', async (_e, site) => {
  await mkdir(dataDir(), { recursive: true });
  await writeAtomic(sitePath(site?.id), JSON.stringify(site));
});

ipcMain.handle('sites:delete', async (_e, id) => {
  const file = sitePath(id);
  if (!existsSync(file)) return;
  // Vai para a lixeira (recuperável) quando possível.
  await shell.trashItem(file).catch(() => rm(file, { force: true }));
});

// ---------------- exportação para pasta ----------------

const exportedDirs = new Set();

function safeJoin(root, rel) {
  if (typeof rel !== 'string' || !rel || path.isAbsolute(rel) || rel.split(/[\\/]/).includes('..')) throw new Error(`Caminho inválido: ${rel}`);
  return path.join(root, rel);
}

ipcMain.handle('export:site', async (e, { folderName, files }) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const res = await dialog.showOpenDialog(win, {
    title: 'Escolha onde salvar o site',
    buttonLabel: 'Exportar aqui',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (res.canceled || !res.filePaths[0]) return null;

  const name = String(folderName || 'site').replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim() || 'site';
  const target = path.join(res.filePaths[0], name);
  if (existsSync(target) && (await readdir(target)).length) {
    const { response } = await dialog.showMessageBox(win, {
      type: 'question',
      buttons: ['Substituir', 'Cancelar'],
      defaultId: 0,
      cancelId: 1,
      message: `A pasta "${name}" já existe.`,
      detail: 'Os arquivos do site serão substituídos.',
    });
    if (response !== 0) return null;
    await rm(target, { recursive: true, force: true });
  }
  for (const f of files) {
    const out = safeJoin(target, f.path);
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, typeof f.data === 'string' ? f.data : Buffer.from(f.data));
  }
  exportedDirs.add(target);
  return target;
});

// Só abre pastas/arquivos que o próprio app exportou nesta sessão.
ipcMain.handle('shell:openExported', async (_e, dir, file) => {
  if (!exportedDirs.has(dir)) throw new Error('Pasta não permitida');
  const p = file ? safeJoin(dir, file) : dir;
  if (!(await stat(p).catch(() => null))) throw new Error('Arquivo não encontrado');
  const err = await shell.openPath(p);
  if (err) throw new Error(err);
});

// ---------------- janela ----------------

let mainWindow = null;

function isAppUrl(url) {
  return DEV_URL ? url.startsWith(DEV_URL) : url.startsWith('file://');
}

function openExternal(url) {
  if (/^(https?|mailto|tel):/i.test(url)) void shell.openExternal(url);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: 'Website Builder Suite',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0d0f17' : '#f5f6fb',
    show: false,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });
  mainWindow = win;
  win.once('ready-to-show', () => {
    win.maximize();
    win.show();
  });

  // Links externos abrem no navegador padrão, nunca dentro do app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!isAppUrl(url)) {
      e.preventDefault();
      openExternal(url);
    }
  });
  win.webContents.session.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));

  // Antes de fechar, pede ao editor para salvar alterações pendentes.
  let allowClose = false;
  win.on('close', (e) => {
    if (allowClose) return;
    e.preventDefault();
    win.webContents.send('app:before-close');
    setTimeout(() => {
      allowClose = true;
      win.close();
    }, 4000);
  });
  ipcMain.removeAllListeners('app:close-ready');
  ipcMain.on('app:close-ready', () => {
    allowClose = true;
    win.close();
  });
  win.on('closed', () => {
    mainWindow = null;
  });

  if (DEV_URL) void win.loadURL(DEV_URL);
  else void win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

function buildMenu() {
  if (!isMac) {
    // No Windows/Linux o Chromium já trata copiar/colar; sem menu, os atalhos chegam ao editor.
    Menu.setApplicationMenu(null);
    return;
  }
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      { role: 'appMenu' },
      { label: 'Editar', submenu: [{ role: 'cut', label: 'Recortar' }, { role: 'copy', label: 'Copiar' }, { role: 'paste', label: 'Colar' }, { role: 'selectAll', label: 'Selecionar tudo' }] },
      { role: 'windowMenu', label: 'Janela' },
    ]),
  );
}

app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});
