import React, { useState, useCallback } from 'react';
import { X } from './Icons';

export default function ProfileSaveDialog({ defaultName, onSave, onClose }) {
  const [name, setName] = useState(defaultName || 'Untitled Profile');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [includeContent, setIncludeContent] = useState(false);

  const addTag = useCallback(() => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags(prev => [...prev, t]);
    }
    setTagInput('');
  }, [tagInput, tags]);

  const removeTag = useCallback((tag) => {
    setTags(prev => prev.filter(t => t !== tag));
  }, []);

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
    if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(prev => prev.slice(0, -1));
    }
  };

  return (
    <div className="dialog-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dialog">
        <div className="flex-between" style={{ marginBottom: 18 }}>
          <div className="dialog-title">Save as Profile</div>
          <button className="btn btn-icon btn-ghost btn-sm" onClick={onClose}><X /></button>
        </div>

        <div className="dialog-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
          <span className="dialog-label">Profile Name</span>
          <input
            className="prop-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My awesome layout..."
            autoFocus
          />
        </div>

        <div className="dialog-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
          <span className="dialog-label">Tags (press Enter to add)</span>
          <div className="tag-input-wrap">
            {tags.map(t => (
              <span key={t} className="tag-chip">
                {t} <button onClick={() => removeTag(t)}>&times;</button>
              </span>
            ))}
            <input
              className="tag-input"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder={tags.length === 0 ? 'anime, cute, sticky...' : ''}
            />
          </div>
        </div>

        <div className="dialog-row" style={{ marginTop: 4 }}>
          <label className="checkbox-row">
            <input type="checkbox" checked={includeContent} onChange={(e) => setIncludeContent(e.target.checked)} />
            Include current text content in profile
          </label>
        </div>

        <div className="dialog-actions">
          <button className="btn btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={() => onSave({ name, tags, includeContent })} disabled={!name.trim()}>
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
}
