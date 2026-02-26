import React, { useState } from 'react';
import { Trash, Eye, Plus, Search, Image as ImageIcon } from '../Icons';

export default function GalleryView({
  profiles, notes, onLoadNote, onLoadProfile,
  onDeleteNote, onDeleteProfile, onCreateNote, onOpenViewer,
}) {
  const [search, setSearch] = useState('');

  const filteredProfiles = profiles.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredNotes = notes.filter(n =>
    !search || n.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="gallery-full">
      <div className="gallery-full-title">Gallery</div>
      <div className="gallery-full-subtitle">Browse your profiles and notes, or create something new.</div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 360, marginBottom: 24 }}>
        <Search width={14} height={14} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--text-muted)' }} />
        <input
          className="prop-input"
          style={{ width: '100%', paddingLeft: 30, paddingTop: 6, paddingBottom: 6, fontSize: 13 }}
          placeholder="Search by name or tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Profiles */}
      <div className="gallery-full-section">
        <div className="gallery-full-section-title">
          Profiles
          <span className="text-xs text-muted" style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
            Reusable layouts — click to create a new note
          </span>
        </div>

        {filteredProfiles.length === 0 ? (
          <div className="gallery-empty">
            <ImageIcon width={36} height={36} />
            <p>{search ? 'No matching profiles' : 'No profiles saved yet'}</p>
          </div>
        ) : (
          <div className="gallery-full-grid">
            {filteredProfiles.map(p => (
              <div key={p.id} className="gallery-full-card" onClick={() => onLoadProfile(p.id)}>
                {p.previewUrl ? (
                  <img className="gallery-full-card-thumb" src={p.previewUrl} alt={p.name} />
                ) : (
                  <div className="gallery-full-card-thumb flex-center" style={{ color: 'var(--text-muted)' }}>
                    <ImageIcon width={28} height={28} />
                  </div>
                )}
                <div className="gallery-full-card-info">
                  <div className="gallery-full-card-name">{p.name}</div>
                  <div className="gallery-full-card-meta">
                    {(p.tags || []).length > 0 && <span>{p.tags.join(', ')}</span>}
                    {(p.tags || []).length > 0 && ' — '}
                    {formatDate(p.updatedAt)}
                  </div>
                </div>
                <div className="profile-card-actions">
                  <button className="btn btn-icon btn-ghost btn-sm btn-danger" title="Delete profile"
                    onClick={(e) => { e.stopPropagation(); onDeleteProfile(p.id); }}>
                    <Trash width={12} height={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="gallery-full-section">
        <div className="gallery-full-section-title">
          Notes
          <span className="text-xs text-muted" style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
            Your saved sticky notes
          </span>
        </div>

        {filteredNotes.length === 0 ? (
          <div className="gallery-empty">
            <ImageIcon width={36} height={36} />
            <p>{search ? 'No matching notes' : 'No notes saved yet'}</p>
            {!search && (
              <button className="btn btn-primary btn-sm" onClick={onCreateNote}>
                <Plus width={12} height={12} /> Create your first note
              </button>
            )}
          </div>
        ) : (
          <div className="gallery-full-grid">
            {filteredNotes.map(n => (
              <div key={n.id} className="gallery-full-card" onClick={() => onLoadNote(n.id)}>
                {n.previewUrl ? (
                  <img className="gallery-full-card-thumb" src={n.previewUrl} alt={n.name} />
                ) : (
                  <div className="gallery-full-card-thumb flex-center" style={{ color: 'var(--text-muted)' }}>
                    <span style={{ fontSize: 28 }}>📝</span>
                  </div>
                )}
                <div className="gallery-full-card-info">
                  <div className="gallery-full-card-name">{n.name}</div>
                  <div className="gallery-full-card-meta">{formatDate(n.updatedAt)}</div>
                </div>
                <div className="profile-card-actions">
                  <button className="btn btn-icon btn-ghost btn-sm" title="Open as sticky note"
                    onClick={(e) => { e.stopPropagation(); onOpenViewer(n.id); }}>
                    <Eye width={12} height={12} />
                  </button>
                  <button className="btn btn-icon btn-ghost btn-sm btn-danger" title="Delete note"
                    onClick={(e) => { e.stopPropagation(); onDeleteNote(n.id); }}>
                    <Trash width={12} height={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
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
  return d.toLocaleDateString();
}
