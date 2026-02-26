const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Image import
  importImage: () => ipcRenderer.invoke('import-image'),
  importImageFromPath: (p) => ipcRenderer.invoke('import-image-from-path', p),
  getAssetUrl: (p) => ipcRenderer.invoke('get-asset-url', p),

  // Directories
  getDataDir: () => ipcRenderer.invoke('get-data-dir'),
  getAssetsDir: () => ipcRenderer.invoke('get-assets-dir'),

  // Notes
  saveNote: (data) => ipcRenderer.invoke('save-note', data),
  loadNote: (id) => ipcRenderer.invoke('load-note', id),
  deleteNote: (id) => ipcRenderer.invoke('delete-note', id),
  listNotes: () => ipcRenderer.invoke('list-notes'),

  // Profiles
  saveProfile: (data, previewDataUrl) => ipcRenderer.invoke('save-profile', data, previewDataUrl),
  loadProfile: (id) => ipcRenderer.invoke('load-profile', id),
  deleteProfile: (id) => ipcRenderer.invoke('delete-profile', id),
  listProfiles: () => ipcRenderer.invoke('list-profiles'),

  // Export
  exportImage: (dataUrl, name) => ipcRenderer.invoke('export-image', dataUrl, name),

  // Viewer / window
  openViewer: (noteId) => ipcRenderer.invoke('open-viewer', noteId),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  setAlwaysOnTop: (v) => ipcRenderer.invoke('set-always-on-top', v),
  setClickThrough: (v) => ipcRenderer.invoke('set-click-through', v),
  setIgnoreMouseTemp: (v) => ipcRenderer.invoke('set-ignore-mouse-temp', v),
  setWindowOpacity: (v) => ipcRenderer.invoke('set-window-opacity', v),
  closeViewer: () => ipcRenderer.invoke('close-viewer'),
  openNoteInEditor: (noteId) => ipcRenderer.invoke('open-note-in-editor', noteId),
  getWindowInfo: () => ipcRenderer.invoke('get-window-info'),

  // Events from main
  onOpenNoteEditor: (cb) => {
    ipcRenderer.on('open-note-editor', (_, noteId) => cb(noteId));
  },
});
