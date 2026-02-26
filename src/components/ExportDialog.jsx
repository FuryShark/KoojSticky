import React, { useState } from 'react';
import { X } from './Icons';

export default function ExportDialog({ onExport, onClose }) {
  const [format, setFormat] = useState('png');
  const [multiplier, setMultiplier] = useState(2);
  const [transparent, setTransparent] = useState(false);

  return (
    <div className="dialog-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dialog">
        <div className="flex-between" style={{ marginBottom: 18 }}>
          <div className="dialog-title">Export Image</div>
          <button className="btn btn-icon btn-ghost btn-sm" onClick={onClose}><X /></button>
        </div>

        <div className="dialog-row">
          <span className="dialog-label">Format</span>
          <div className="radio-group">
            <button className={`radio-btn ${format === 'png' ? 'active' : ''}`} onClick={() => setFormat('png')}>PNG</button>
            <button className={`radio-btn ${format === 'webp' ? 'active' : ''}`} onClick={() => setFormat('webp')}>WebP</button>
          </div>
        </div>

        <div className="dialog-row">
          <span className="dialog-label">Scale</span>
          <div className="radio-group">
            {[1, 2, 4].map(s => (
              <button key={s} className={`radio-btn ${multiplier === s ? 'active' : ''}`} onClick={() => setMultiplier(s)}>
                {s}x
              </button>
            ))}
          </div>
        </div>

        <div className="dialog-row">
          <label className="checkbox-row">
            <input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} />
            Transparent background (if applicable)
          </label>
        </div>

        <div className="dialog-actions">
          <button className="btn btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={() => onExport({ format, multiplier, transparent })}>
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
