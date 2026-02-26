const { app, BrowserWindow, ipcMain, dialog, shell, screen, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { pathToFileURL } = require('url');

const isDev = !app.isPackaged;
const VITE_DEV_URL = 'http://localhost:5173';

// ── Data directories ────────────────────────────────────────────
let dataDir, assetsDir, profilesDir, notesDir;

function initDataDirs() {
  dataDir = isDev
    ? path.join(__dirname, '..', 'data')
    : path.join(app.getPath('userData'), 'data');
  assetsDir = path.join(dataDir, 'assets');
  profilesDir = path.join(dataDir, 'profiles');
  notesDir = path.join(dataDir, 'notes');
  [dataDir, assetsDir, profilesDir, notesDir].forEach(d =>
    fs.mkdirSync(d, { recursive: true })
  );
}

// ── Custom protocol for loading local assets ────────────────────
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'kooj',
    privileges: {
      bypassCSP: true,
      standard: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

function registerProtocol() {
  protocol.handle('kooj', (request) => {
    const url = new URL(request.url);
    let filePath;
    if (url.hostname === 'asset') {
      filePath = path.join(assetsDir, decodeURIComponent(url.pathname.slice(1)));
    } else if (url.hostname === 'profile-preview') {
      filePath = path.join(profilesDir, decodeURIComponent(url.pathname.slice(1)));
    } else if (url.hostname === 'note-preview') {
      filePath = path.join(notesDir, decodeURIComponent(url.pathname.slice(1)));
    } else {
      filePath = path.join(dataDir, decodeURIComponent(url.pathname.slice(1)));
    }
    return net.fetch(pathToFileURL(filePath).href);
  });
}

// ── Window management ───────────────────────────────────────────
let mainWindow = null;
const viewerWindows = new Map();

function createMainWindow() {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    width: Math.min(1440, sw - 80),
    height: Math.min(920, sh - 60),
    minWidth: 960,
    minHeight: 580,
    backgroundColor: '#0c0a14',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    title: 'KoojSticky',
    autoHideMenuBar: true,
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  if (isDev) {
    mainWindow.loadURL(VITE_DEV_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    viewerWindows.forEach(w => { if (!w.isDestroyed()) w.close(); });
  });
}

function createViewerWindow(noteId, noteData) {
  if (viewerWindows.has(noteId)) {
    const existing = viewerWindows.get(noteId);
    if (!existing.isDestroyed()) { existing.focus(); return; }
  }

  const prefs = noteData.windowPrefs || {};
  const display = screen.getPrimaryDisplay();
  const { width: sw, height: sh } = display.workAreaSize;
  const ww = prefs.lastWidth || 400;
  const wh = prefs.lastHeight || 400;

  const viewer = new BrowserWindow({
    width: ww,
    height: wh,
    x: prefs.lastX != null ? prefs.lastX : Math.floor((sw - ww) / 2),
    y: prefs.lastY != null ? prefs.lastY : Math.floor((sh - wh) / 2),
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: prefs.alwaysOnTop !== false,
    skipTaskbar: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  viewer.noteId = noteId;
  if (prefs.opacity != null && prefs.opacity < 1) {
    viewer.setOpacity(prefs.opacity);
  }

  viewer.once('ready-to-show', () => viewer.show());

  if (isDev) {
    viewer.loadURL(`${VITE_DEV_URL}/viewer.html?noteId=${noteId}`);
  } else {
    viewer.loadFile(path.join(__dirname, '..', 'dist', 'viewer.html'), {
      query: { noteId },
    });
  }

  // Persist position/size on move/resize
  let saveTimer = null;
  const savePosition = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (viewer.isDestroyed()) return;
      const bounds = viewer.getBounds();
      try {
        const notePath = path.join(notesDir, noteId, 'note.json');
        const note = JSON.parse(fs.readFileSync(notePath, 'utf8'));
        Object.assign(note.windowPrefs, {
          lastX: bounds.x, lastY: bounds.y,
          lastWidth: bounds.width, lastHeight: bounds.height,
        });
        fs.writeFileSync(notePath, JSON.stringify(note, null, 2));
      } catch (_) {}
    }, 300);
  };
  viewer.on('moved', savePosition);
  viewer.on('resized', savePosition);
  viewer.on('closed', () => viewerWindows.delete(noteId));
  viewerWindows.set(noteId, viewer);
}

// ── Helpers ─────────────────────────────────────────────────────
const MIME_MAP = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };

function importImageFile(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase().slice(1);
    if (!MIME_MAP[ext]) return { success: false, error: 'Unsupported format' };

    const buffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
    const assetFilename = `${hash}.${ext}`;
    const dest = path.join(assetsDir, assetFilename);
    if (!fs.existsSync(dest)) fs.copyFileSync(filePath, dest);

    return {
      success: true,
      data: {
        assetHash: hash,
        assetPath: assetFilename,
        assetUrl: `kooj://asset/${assetFilename}`,
        originalName: path.basename(filePath),
      },
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function updateProfileIndex() {
  try {
    const entries = fs.readdirSync(profilesDir, { withFileTypes: true });
    const profiles = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const data = JSON.parse(
          fs.readFileSync(path.join(profilesDir, entry.name, 'profile.json'), 'utf8')
        );
        profiles.push({
          id: data.id,
          name: data.name,
          tags: data.tags || [],
          updatedAt: data.updatedAt,
          previewUrl: fs.existsSync(path.join(profilesDir, entry.name, 'preview.png'))
            ? `kooj://profile-preview/${entry.name}/preview.png`
            : null,
        });
      } catch (_) {}
    }
    profiles.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    fs.writeFileSync(path.join(profilesDir, 'index.json'), JSON.stringify(profiles, null, 2));
  } catch (e) { console.error('Profile index update failed:', e); }
}

function updateNoteWindowPref(noteId, key, value) {
  try {
    const p = path.join(notesDir, noteId, 'note.json');
    const n = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!n.windowPrefs) n.windowPrefs = {};
    n.windowPrefs[key] = value;
    fs.writeFileSync(p, JSON.stringify(n, null, 2));
  } catch (_) {}
}

// ── IPC handlers ────────────────────────────────────────────────
function setupIPC() {
  // Image import
  ipcMain.handle('import-image', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Image',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths.length) return { success: false, canceled: true };
    return importImageFile(result.filePaths[0]);
  });

  ipcMain.handle('import-image-from-path', (_, filePath) => importImageFile(filePath));

  // Asset URL
  ipcMain.handle('get-asset-url', (_, assetPath) => `kooj://asset/${assetPath}`);

  // Directories
  ipcMain.handle('get-data-dir', () => dataDir);
  ipcMain.handle('get-assets-dir', () => assetsDir);

  // ── Notes CRUD ──
  ipcMain.handle('save-note', async (_, noteData) => {
    try {
      const noteDir = path.join(notesDir, noteData.id);
      fs.mkdirSync(noteDir, { recursive: true });
      noteData.updatedAt = new Date().toISOString();

      // Save preview if provided (extract before writing JSON to avoid bloat)
      let previewDataUrl = null;
      if (noteData._previewDataUrl) {
        previewDataUrl = noteData._previewDataUrl;
        delete noteData._previewDataUrl;
      }

      fs.writeFileSync(path.join(noteDir, 'note.json'), JSON.stringify(noteData, null, 2));

      if (previewDataUrl) {
        const base64 = previewDataUrl.replace(/^data:image\/\w+;base64,/, '');
        fs.writeFileSync(path.join(noteDir, 'preview.png'), Buffer.from(base64, 'base64'));
      }
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('load-note', async (_, noteId) => {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(notesDir, noteId, 'note.json'), 'utf8'));
      return { success: true, data };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('delete-note', async (_, noteId) => {
    try {
      fs.rmSync(path.join(notesDir, noteId), { recursive: true, force: true });
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('list-notes', async () => {
    try {
      const entries = fs.readdirSync(notesDir, { withFileTypes: true });
      const notes = [];
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        try {
          const data = JSON.parse(
            fs.readFileSync(path.join(notesDir, entry.name, 'note.json'), 'utf8')
          );
          notes.push({
            id: data.id, name: data.name, updatedAt: data.updatedAt, profileId: data.profileId,
            previewUrl: fs.existsSync(path.join(notesDir, entry.name, 'preview.png'))
              ? `kooj://note-preview/${entry.name}/preview.png`
              : null,
          });
        } catch (_) {}
      }
      notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      return { success: true, data: notes };
    } catch (e) { return { success: false, error: e.message }; }
  });

  // ── Profiles CRUD ──
  ipcMain.handle('save-profile', async (_, profileData, previewDataUrl) => {
    try {
      const pDir = path.join(profilesDir, profileData.id);
      fs.mkdirSync(pDir, { recursive: true });
      profileData.updatedAt = new Date().toISOString();
      if (previewDataUrl) {
        const b64 = previewDataUrl.replace(/^data:image\/\w+;base64,/, '');
        fs.writeFileSync(path.join(pDir, 'preview.png'), Buffer.from(b64, 'base64'));
        profileData.previewUrl = `kooj://profile-preview/${profileData.id}/preview.png`;
      }
      fs.writeFileSync(path.join(pDir, 'profile.json'), JSON.stringify(profileData, null, 2));
      updateProfileIndex();
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('load-profile', async (_, profileId) => {
    try {
      const data = JSON.parse(
        fs.readFileSync(path.join(profilesDir, profileId, 'profile.json'), 'utf8')
      );
      return { success: true, data };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('delete-profile', async (_, profileId) => {
    try {
      fs.rmSync(path.join(profilesDir, profileId), { recursive: true, force: true });
      updateProfileIndex();
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('list-profiles', async () => {
    try {
      const indexPath = path.join(profilesDir, 'index.json');
      if (fs.existsSync(indexPath)) {
        return { success: true, data: JSON.parse(fs.readFileSync(indexPath, 'utf8')) };
      }
      return { success: true, data: [] };
    } catch (e) { return { success: false, error: e.message }; }
  });

  // ── Export ──
  ipcMain.handle('export-image', async (_, dataUrl, defaultName) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Image',
      defaultPath: defaultName || 'koojsticky-export.png',
      filters: [
        { name: 'PNG Image', extensions: ['png'] },
        { name: 'WebP Image', extensions: ['webp'] },
      ],
    });
    if (result.canceled) return { success: false, canceled: true };
    try {
      const b64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(result.filePath, Buffer.from(b64, 'base64'));
      return { success: true, path: result.filePath };
    } catch (e) { return { success: false, error: e.message }; }
  });

  // ── Viewer / Window controls ──
  ipcMain.handle('open-viewer', async (_, noteId) => {
    try {
      const noteData = JSON.parse(
        fs.readFileSync(path.join(notesDir, noteId, 'note.json'), 'utf8')
      );
      createViewerWindow(noteId, noteData);
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('open-external', async (_, url) => {
    const allowed = ['http:', 'https:', 'mailto:'];
    try {
      const parsed = new URL(url);
      if (!allowed.includes(parsed.protocol)) return { success: false, error: 'Blocked protocol' };
      await shell.openExternal(url);
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('set-always-on-top', (event, value) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) { win.setAlwaysOnTop(value); if (win.noteId) updateNoteWindowPref(win.noteId, 'alwaysOnTop', value); }
  });

  ipcMain.handle('set-click-through', (event, value) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) { win.setIgnoreMouseEvents(value, { forward: true }); if (win.noteId) updateNoteWindowPref(win.noteId, 'clickThrough', value); }
  });

  ipcMain.handle('set-window-opacity', (event, value) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) { win.setOpacity(value); if (win.noteId) updateNoteWindowPref(win.noteId, 'opacity', value); }
  });

  // Temporarily toggle click-through without persisting (for escape mechanism)
  ipcMain.handle('set-ignore-mouse-temp', (event, value) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.setIgnoreMouseEvents(value, { forward: true });
  });

  ipcMain.handle('close-viewer', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
  });

  ipcMain.handle('open-note-in-editor', (_, noteId) => {
    if (mainWindow) { mainWindow.focus(); mainWindow.webContents.send('open-note-editor', noteId); }
  });

  ipcMain.handle('get-window-info', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return { noteId: win?.noteId || null, isViewer: win !== mainWindow };
  });
}

// ── Lifecycle ───────────────────────────────────────────────────
app.whenReady().then(() => {
  initDataDirs();
  registerProtocol();
  setupIPC();
  createMainWindow();
});

app.on('window-all-closed', () => app.quit());
