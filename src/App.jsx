import React, { useState, useCallback, useRef, useEffect } from 'react';
import EditorCanvas from './components/Editor/EditorCanvas';
import Toolbar from './components/Editor/Toolbar';
import PropertiesPanel from './components/Editor/PropertiesPanel';
import Sidebar from './components/Sidebar';
import ExportDialog from './components/ExportDialog';
import ProfileSaveDialog from './components/ProfileSaveDialog';
import GalleryView from './components/Gallery/GalleryView';
import { StickyNote } from './components/Icons';
import { createNote, createProfile, createId, now } from './utils/schemas';

export default function App() {
  const canvasRef = useRef(null);

  // ── State ──
  const [mode, setMode] = useState('editor'); // 'editor' | 'gallery'
  const [currentNote, setCurrentNote] = useState(() => createNote({ name: 'Untitled Note' }));
  const [profiles, setProfiles] = useState([]);
  const [notes, setNotes] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [activeTool, setActiveTool] = useState('select');
  const [showExport, setShowExport] = useState(false);
  const [showProfileSave, setShowProfileSave] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [canvasEmpty, setCanvasEmpty] = useState(true);

  // ── Load data on mount ──
  useEffect(() => {
    refreshProfiles();
    refreshNotes();

    // Listen for "open note in editor" from viewer windows
    if (window.api?.onOpenNoteEditor) {
      window.api.onOpenNoteEditor(async (noteId) => {
        await loadNoteById(noteId);
        setMode('editor');
      });
    }
  }, []);

  // ── Toast helper ──
  const toast = useCallback((message, type = 'info') => {
    const id = createId();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);

  // ── Data refresh ──
  const refreshProfiles = useCallback(async () => {
    const res = await window.api?.listProfiles();
    if (res?.success) setProfiles(res.data);
  }, []);

  const refreshNotes = useCallback(async () => {
    const res = await window.api?.listNotes();
    if (res?.success) setNotes(res.data);
  }, []);

  // ── Note CRUD ──
  const saveCurrentNote = useCallback(async () => {
    if (!canvasRef.current) return;
    const canvasData = canvasRef.current.serialize();
    const previewDataUrl = canvasRef.current.exportImage({ multiplier: 0.5, format: 'png' });

    const noteData = {
      ...currentNote,
      updatedAt: now(),
      canvas: canvasData.canvas,
      backgroundImage: canvasData.backgroundImage,
      regions: canvasData.regions,
      regionContent: canvasData.regionContent,
      _previewDataUrl: previewDataUrl,
    };

    const res = await window.api?.saveNote(noteData);
    if (res?.success) {
      setCurrentNote(noteData);
      setHasChanges(false);
      refreshNotes();
      toast('Note saved', 'success');
    } else {
      toast('Failed to save note', 'error');
    }
  }, [currentNote, toast, refreshNotes]);

  const loadNoteById = useCallback(async (noteId) => {
    const res = await window.api?.loadNote(noteId);
    if (res?.success) {
      setCurrentNote(res.data);
      setHasChanges(false);
      // Deserialize to canvas after state update
      setTimeout(() => {
        if (canvasRef.current) {
          canvasRef.current.deserialize(res.data);
        }
      }, 50);
      setMode('editor');
    } else {
      toast('Failed to load note', 'error');
    }
  }, [toast]);

  const createNewNote = useCallback(() => {
    const note = createNote({ name: 'Untitled Note' });
    setCurrentNote(note);
    setHasChanges(false);
    if (canvasRef.current) canvasRef.current.clear();
    setMode('editor');
    setCanvasEmpty(true);
  }, []);

  const deleteNoteById = useCallback(async (noteId) => {
    const res = await window.api?.deleteNote(noteId);
    if (res?.success) {
      refreshNotes();
      toast('Note deleted', 'info');
      if (currentNote.id === noteId) createNewNote();
    }
  }, [currentNote, refreshNotes, createNewNote, toast]);

  // ── Profile CRUD ──
  const saveProfile = useCallback(async (profileInfo) => {
    if (!canvasRef.current) return;
    const canvasData = canvasRef.current.serialize();
    const previewDataUrl = canvasRef.current.exportImage({ multiplier: 0.5, format: 'png' });

    const profile = createProfile({
      ...profileInfo,
      canvasWidth: canvasData.canvas.width,
      canvasHeight: canvasData.canvas.height,
      canvasBg: canvasData.canvas.backgroundColor,
      backgroundImage: canvasData.backgroundImage,
      regions: canvasData.regions.map(r => ({
        ...r,
        text: profileInfo.includeContent ? r.text : '',
      })),
      canvas: canvasData.canvas,
    });

    const res = await window.api?.saveProfile(profile, previewDataUrl);
    if (res?.success) {
      refreshProfiles();
      setCurrentNote(prev => ({ ...prev, profileId: profile.id }));
      toast('Profile saved', 'success');
    } else {
      toast('Failed to save profile', 'error');
    }
  }, [refreshProfiles, toast]);

  const loadFromProfile = useCallback(async (profileId) => {
    const res = await window.api?.loadProfile(profileId);
    if (!res?.success) { toast('Failed to load profile', 'error'); return; }

    const prof = res.data;
    const note = createNote({
      name: `${prof.name} — Note`,
      profileId: prof.id,
      canvas: prof.canvas,
      backgroundImage: prof.backgroundImage,
      regions: prof.regions.map(r => ({ ...r })),
      regionContent: {},
    });

    setCurrentNote(note);
    setHasChanges(false);
    setTimeout(() => {
      if (canvasRef.current) canvasRef.current.deserialize(note);
    }, 50);
    setMode('editor');
    toast('Created note from profile', 'success');
  }, [toast]);

  const updateCurrentProfile = useCallback(async () => {
    if (!canvasRef.current || !currentNote.profileId) return;
    const canvasData = canvasRef.current.serialize();
    const previewDataUrl = canvasRef.current.exportImage({ multiplier: 0.5, format: 'png' });

    // Load existing profile to preserve name, tags, etc.
    const existing = await window.api?.loadProfile(currentNote.profileId);
    if (!existing?.success) { toast('Profile not found', 'error'); return; }

    const profile = {
      ...existing.data,
      updatedAt: now(),
      canvas: canvasData.canvas,
      backgroundImage: canvasData.backgroundImage,
      regions: canvasData.regions.map(r => ({ ...r, text: '' })),
    };

    const res = await window.api?.saveProfile(profile, previewDataUrl);
    if (res?.success) {
      refreshProfiles();
      toast('Profile updated', 'success');
    } else {
      toast('Failed to update profile', 'error');
    }
  }, [currentNote, refreshProfiles, toast]);

  const deleteProfileById = useCallback(async (profileId) => {
    const res = await window.api?.deleteProfile(profileId);
    if (res?.success) {
      refreshProfiles();
      toast('Profile deleted', 'info');
    }
  }, [refreshProfiles, toast]);

  // ── Viewer ──
  const openViewer = useCallback(async () => {
    // Save first if needed
    if (hasChanges) await saveCurrentNote();
    const res = await window.api?.openViewer(currentNote.id);
    if (!res?.success) toast('Save the note first before viewing', 'warning');
  }, [currentNote, hasChanges, saveCurrentNote, toast]);

  // ── Export ──
  const handleExport = useCallback(async (options) => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.exportImage(options);
    const name = `${currentNote.name || 'export'}-${options.multiplier}x.${options.format}`;
    const res = await window.api?.exportImage(dataUrl, name);
    if (res?.success) {
      toast(`Exported to ${res.path}`, 'success');
    } else if (!res?.canceled) {
      toast('Export failed', 'error');
    }
    setShowExport(false);
  }, [currentNote, toast]);

  // ── Canvas callbacks ──
  const onCanvasChange = useCallback(() => {
    setHasChanges(true);
    setCanvasEmpty(false);
  }, []);

  const onSelectionChange = useCallback((obj) => {
    setSelectedObject(obj);
  }, []);

  const onPropertyChange = useCallback((key, value) => {
    if (canvasRef.current && selectedObject) {
      canvasRef.current.updateSelectedObject(key, value);
      setSelectedObject(prev => prev ? { ...prev, [key]: value } : null);
      setHasChanges(true);
    }
  }, [selectedObject]);

  const onZoomChange = useCallback((newZoom) => {
    setZoom(newZoom);
    if (canvasRef.current) canvasRef.current.setZoom(newZoom);
  }, []);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 's') { e.preventDefault(); saveCurrentNote(); }
      if (ctrl && e.key === 'e') { e.preventDefault(); setShowExport(true); }
      if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); canvasRef.current?.undo(); }
      if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); canvasRef.current?.redo(); }
      if (e.key === 'Delete' && !e.target.closest('input, textarea, [contenteditable]')) {
        canvasRef.current?.deleteSelected();
      }
      if (e.key === 'Escape') {
        setActiveTool('select');
        setShowExport(false);
        setShowProfileSave(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [saveCurrentNote]);

  // ── Note name change ──
  const onNoteNameChange = useCallback((e) => {
    setCurrentNote(prev => ({ ...prev, name: e.target.value }));
    setHasChanges(true);
  }, []);

  // ── Render ──
  if (mode === 'gallery') {
    return (
      <div className="app-layout gallery-mode">
        <header className="app-header">
          <div className="app-logo"><StickyNote width={20} height={20} /> KoojSticky</div>
          <div className="header-sep" />
          <button className="btn btn-sm" onClick={() => setMode('editor')}>Back to Editor</button>
          <div className="header-spacer" />
          <button className="btn btn-primary btn-sm" onClick={createNewNote}>New Note</button>
        </header>
        <GalleryView
          profiles={profiles}
          notes={notes}
          onLoadNote={loadNoteById}
          onLoadProfile={loadFromProfile}
          onDeleteNote={deleteNoteById}
          onDeleteProfile={deleteProfileById}
          onCreateNote={createNewNote}
          onOpenViewer={async (noteId) => {
            const res = await window.api?.openViewer(noteId);
            if (!res?.success) toast('Failed to open viewer', 'error');
          }}
        />

        {/* Toasts */}
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <div className="app-logo"><StickyNote width={20} height={20} /> KoojSticky</div>
        <div className="header-sep" />
        <input
          className="note-name-input"
          value={currentNote.name}
          onChange={onNoteNameChange}
          placeholder="Note name..."
        />
        <div className="header-sep" />
        <Toolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          zoom={zoom}
          onZoomChange={onZoomChange}
          onUndo={() => canvasRef.current?.undo()}
          onRedo={() => canvasRef.current?.redo()}
          onImportImage={async () => {
            const res = await window.api?.importImage();
            if (res?.success) {
              canvasRef.current?.setBackgroundImage(res.data);
              setHasChanges(true);
              setCanvasEmpty(false);
            }
          }}
        />
        <div className="header-spacer" />
        <button className="btn btn-sm" onClick={() => setMode('gallery')}>Gallery</button>
        <button className="btn btn-sm" onClick={() => setShowProfileSave(true)} disabled={canvasEmpty}>Save Profile</button>
        {currentNote.profileId && (
          <button className="btn btn-sm" onClick={updateCurrentProfile} disabled={canvasEmpty}>Update Profile</button>
        )}
        <button className="btn btn-sm" onClick={() => setShowExport(true)} disabled={canvasEmpty}>
          Export
        </button>
        <button className="btn btn-sm" onClick={openViewer} disabled={canvasEmpty}>View</button>
        <button className={`btn btn-primary btn-sm ${hasChanges ? '' : ''}`} onClick={saveCurrentNote}>
          Save{hasChanges ? ' *' : ''}
        </button>
      </header>

      {/* Sidebar */}
      <Sidebar
        profiles={profiles}
        notes={notes}
        currentNoteId={currentNote.id}
        canvasRef={canvasRef}
        selectedObject={selectedObject}
        onLoadNote={loadNoteById}
        onLoadProfile={loadFromProfile}
        onDeleteNote={deleteNoteById}
        onDeleteProfile={deleteProfileById}
        onCreateNote={createNewNote}
        onSelectLayer={(obj) => {
          canvasRef.current?.selectObject(obj);
        }}
        onReorderLayer={(fromIdx, toIdx) => {
          canvasRef.current?.reorderObject(fromIdx, toIdx);
          setHasChanges(true);
        }}
        onOpenViewer={async (noteId) => {
          const res = await window.api?.openViewer(noteId);
          if (!res?.success) toast('Failed to open viewer', 'error');
        }}
      />

      {/* Canvas */}
      <EditorCanvas
        ref={canvasRef}
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onSelectionChange={onSelectionChange}
        onChange={onCanvasChange}
        onCanvasEmptyChange={setCanvasEmpty}
        zoom={zoom}
        onZoomChange={onZoomChange}
        canvasEmpty={canvasEmpty}
      />

      {/* Properties */}
      <PropertiesPanel
        selectedObject={selectedObject}
        onPropertyChange={onPropertyChange}
        canvasRef={canvasRef}
      />

      {/* Dialogs */}
      {showExport && (
        <ExportDialog
          onExport={handleExport}
          onClose={() => setShowExport(false)}
        />
      )}

      {showProfileSave && (
        <ProfileSaveDialog
          defaultName={currentNote.name}
          onSave={(info) => { saveProfile(info); setShowProfileSave(false); }}
          onClose={() => setShowProfileSave(false)}
        />
      )}

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>
        ))}
      </div>
    </div>
  );
}
