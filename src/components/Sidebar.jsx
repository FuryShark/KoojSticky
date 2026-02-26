import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Grid, Plus, Trash, Eye, ChevronUp, ChevronDown, Image as ImageIcon, TextIcon, LinkIcon, Search } from './Icons';

export default function Sidebar({
  profiles, notes, currentNoteId, canvasRef, selectedObject,
  onLoadNote, onLoadProfile, onDeleteNote, onDeleteProfile,
  onCreateNote, onSelectLayer, onReorderLayer, onOpenViewer,
}) {
  const [tab, setTab] = useState('gallery'); // 'gallery' | 'layers'
  const [layerObjects, setLayerObjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Refresh layers when tab changes or selection changes
  useEffect(() => {
    if (tab === 'layers' && canvasRef?.current) {
      setLayerObjects(canvasRef.current.getObjects());
    }
  }, [tab, selectedObject, canvasRef]);

  const refreshLayers = useCallback(() => {
    if (canvasRef?.current) {
      setLayerObjects(canvasRef.current.getObjects());
    }
  }, [canvasRef]);

  // Filter profiles by search
  const filteredProfiles = profiles.filter(p =>
    !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredNotes = notes.filter(n =>
    !searchQuery || n.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="sidebar">
      {/* Tabs */}
      <div className="sidebar-tabs">
        <button className={`sidebar-tab ${tab === 'gallery' ? 'active' : ''}`} onClick={() => setTab('gallery')}>
          <Grid width={12} height={12} style={{ marginRight: 4, verticalAlign: -1 }} /> Gallery
        </button>
        <button className={`sidebar-tab ${tab === 'layers' ? 'active' : ''}`} onClick={() => { setTab('layers'); refreshLayers(); }}>
          <Layers width={12} height={12} style={{ marginRight: 4, verticalAlign: -1 }} /> Layers
        </button>
      </div>

      {/* Content */}
      <div className="sidebar-content">
        {tab === 'gallery' && (
          <>
            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <Search width={12} height={12} style={{ position: 'absolute', left: 8, top: 8, color: 'var(--text-muted)' }} />
              <input
                className="prop-input"
                style={{ width: '100%', paddingLeft: 26, fontSize: 11 }}
                placeholder="Search profiles & notes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* New note button */}
            <button className="btn btn-sm" style={{ width: '100%', marginBottom: 12, justifyContent: 'center' }} onClick={onCreateNote}>
              <Plus width={12} height={12} /> New Note
            </button>

            {/* Profiles */}
            <div className="sidebar-section-title">Profiles ({filteredProfiles.length})</div>
            {filteredProfiles.length === 0 ? (
              <div className="text-xs text-muted" style={{ padding: '8px 4px', textAlign: 'center' }}>
                {searchQuery ? 'No matching profiles' : 'No profiles yet — save your first layout'}
              </div>
            ) : (
              <div className="profile-grid">
                {filteredProfiles.map(p => (
                  <div key={p.id} className="profile-card" onClick={() => onLoadProfile(p.id)}>
                    {p.previewUrl ? (
                      <img className="profile-card-thumb" src={p.previewUrl} alt={p.name} />
                    ) : (
                      <div className="profile-card-thumb flex-center" style={{ color: 'var(--text-muted)' }}>
                        <ImageIcon width={20} height={20} />
                      </div>
                    )}
                    <div className="profile-card-info">
                      <div className="profile-card-name">{p.name}</div>
                      <div className="profile-card-date">{formatDate(p.updatedAt)}</div>
                    </div>
                    <div className="profile-card-actions">
                      <button className="btn btn-icon btn-ghost btn-sm btn-danger" title="Delete profile"
                        onClick={(e) => { e.stopPropagation(); onDeleteProfile(p.id); }}>
                        <Trash width={11} height={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Notes */}
            <div className="sidebar-section-title" style={{ marginTop: 8 }}>Notes ({filteredNotes.length})</div>
            {filteredNotes.length === 0 ? (
              <div className="text-xs text-muted" style={{ padding: '8px 4px', textAlign: 'center' }}>
                {searchQuery ? 'No matching notes' : 'No saved notes yet'}
              </div>
            ) : (
              <div>
                {filteredNotes.map(n => (
                  <div key={n.id}
                    className={`note-item ${n.id === currentNoteId ? 'active' : ''}`}
                    onClick={() => onLoadNote(n.id)}>
                    <div className="note-item-icon">
                      {n.previewUrl ? (
                        <img src={n.previewUrl} alt="" />
                      ) : (
                        <span style={{ fontSize: 14 }}>📝</span>
                      )}
                    </div>
                    <div className="note-item-info">
                      <div className="note-item-name">{n.name}</div>
                      <div className="note-item-meta">{formatDate(n.updatedAt)}</div>
                    </div>
                    <div className="note-item-actions">
                      <button className="btn btn-icon btn-ghost btn-sm" title="Open as sticky note"
                        onClick={(e) => { e.stopPropagation(); onOpenViewer(n.id); }}>
                        <Eye width={11} height={11} />
                      </button>
                      <button className="btn btn-icon btn-ghost btn-sm btn-danger" title="Delete note"
                        onClick={(e) => { e.stopPropagation(); onDeleteNote(n.id); }}>
                        <Trash width={11} height={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'layers' && (
          <>
            <div className="sidebar-section-title">
              Canvas Objects ({layerObjects.length})
              <button className="btn btn-ghost btn-sm" onClick={refreshLayers}
                style={{ marginLeft: 'auto', padding: '1px 5px', fontSize: 10 }}>
                Refresh
              </button>
            </div>

            {layerObjects.length === 0 ? (
              <div className="text-xs text-muted" style={{ padding: '16px 4px', textAlign: 'center' }}>
                Canvas is empty — add an image or region
              </div>
            ) : (
              <div>
                {[...layerObjects].reverse().map((obj, i) => {
                  const realIdx = layerObjects.length - 1 - i;
                  const isSelected =
                    (selectedObject?.type === 'backgroundImage' && obj.type === 'backgroundImage') ||
                    (selectedObject?.regionId && selectedObject.regionId === obj.regionId);

                  return (
                    <div key={obj.regionId || `layer-${realIdx}`}
                      className={`layer-item ${isSelected ? 'active' : ''}`}
                      onClick={() => onSelectLayer(obj)}>
                      <span className="layer-item-icon">
                        {obj.type === 'backgroundImage' ? '🖼' : obj.type === 'linkRegion' ? '🔗' : '📝'}
                      </span>
                      <span className="layer-item-name">{obj.name || 'Object'}</span>
                      <span className="layer-item-actions">
                        <button className="btn btn-icon btn-ghost btn-sm"
                          title="Move up"
                          disabled={realIdx >= layerObjects.length - 1}
                          onClick={(e) => { e.stopPropagation(); onReorderLayer(realIdx, realIdx + 1); refreshLayers(); }}>
                          <ChevronUp width={10} height={10} />
                        </button>
                        <button className="btn btn-icon btn-ghost btn-sm"
                          title="Move down"
                          disabled={realIdx <= 0}
                          onClick={(e) => { e.stopPropagation(); onReorderLayer(realIdx, realIdx - 1); refreshLayers(); }}>
                          <ChevronDown width={10} height={10} />
                        </button>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString();
}
