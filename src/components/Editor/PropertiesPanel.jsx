import React from 'react';
import { FONT_FAMILIES } from '../../utils/schemas';

export default function PropertiesPanel({ selectedObject, onPropertyChange, canvasRef }) {
  if (!selectedObject) {
    return (
      <div className="props-panel">
        <div className="props-header">Properties</div>
        <div className="props-empty">
          <svg width="32" height="32" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="2" y="2" width="12" height="12" rx="2" />
            <path d="M6 6h4M6 8h4M6 10h2" />
          </svg>
          <span>Select an object on the canvas<br />to edit its properties</span>
        </div>
      </div>
    );
  }

  const p = selectedObject;
  const isText = p.type === 'textRegion' || p.type === 'linkRegion';
  const isBg = p.type === 'backgroundImage';
  const isLink = p.type === 'linkRegion';

  const set = (key) => (e) => {
    const val = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
    onPropertyChange(key, val);
  };
  const setNum = (key) => (e) => onPropertyChange(key, parseFloat(e.target.value) || 0);

  return (
    <div className="props-panel">
      <div className="props-header">
        {isBg ? 'Background Image' : isLink ? 'Link Region' : 'Text Region'}
      </div>
      <div className="props-content">

        {/* ── Background image properties ── */}
        {isBg && (
          <>
            <div className="props-group">
              <div className="props-group-title">Transform</div>
              <div className="prop-row-half">
                <div className="prop-field">
                  <span className="prop-field-label">X</span>
                  <input className="prop-input prop-input-num" type="number" value={Math.round(p.left || 0)} onChange={setNum('left')} />
                </div>
                <div className="prop-field">
                  <span className="prop-field-label">Y</span>
                  <input className="prop-input prop-input-num" type="number" value={Math.round(p.top || 0)} onChange={setNum('top')} />
                </div>
              </div>
              <div className="prop-row-half">
                <div className="prop-field">
                  <span className="prop-field-label">Scale X</span>
                  <input className="prop-input prop-input-num" type="number" step="0.05" value={+(p.scaleX || 1).toFixed(3)} onChange={setNum('scaleX')} />
                </div>
                <div className="prop-field">
                  <span className="prop-field-label">Scale Y</span>
                  <input className="prop-input prop-input-num" type="number" step="0.05" value={+(p.scaleY || 1).toFixed(3)} onChange={setNum('scaleY')} />
                </div>
              </div>
              <div className="prop-row">
                <span className="prop-label">Rotation</span>
                <input className="prop-input prop-input-num" type="number" step="1" value={Math.round(p.angle || 0)} onChange={setNum('angle')} />
                <span className="text-xs text-muted">deg</span>
              </div>
              <div className="prop-row">
                <span className="prop-label">Opacity</span>
                <input type="range" min="0" max="1" step="0.05" value={p.opacity ?? 1} onChange={setNum('opacity')} style={{ flex: 1, accentColor: 'var(--accent)' }} />
                <span className="text-xs text-muted" style={{ minWidth: 28, textAlign: 'right' }}>{Math.round((p.opacity ?? 1) * 100)}%</span>
              </div>
            </div>
            <button className="btn btn-danger btn-sm" style={{ width: '100%' }} onClick={() => canvasRef.current?.deleteSelected()}>
              Remove Background
            </button>
          </>
        )}

        {/* ── Text / Link region properties ── */}
        {isText && (
          <>
            {/* Typography */}
            <div className="props-group">
              <div className="props-group-title">Typography</div>
              <div className="prop-row">
                <span className="prop-label">Font</span>
                <select className="prop-input" value={p.fontFamily || 'Segoe UI'} onChange={set('fontFamily')}>
                  {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="prop-row">
                <span className="prop-label">Size</span>
                <input className="prop-input prop-input-num" type="number" min="6" max="200" value={p.fontSize || 15} onChange={setNum('fontSize')} />
                <span className="text-xs text-muted">px</span>
              </div>
              <div className="prop-row">
                <span className="prop-label">Weight</span>
                <select className="prop-input" value={p.fontWeight || 'normal'} onChange={set('fontWeight')}>
                  <option value="normal">Normal</option>
                  <option value="bold">Bold</option>
                  <option value="100">Thin</option>
                  <option value="300">Light</option>
                  <option value="500">Medium</option>
                  <option value="600">Semibold</option>
                  <option value="800">Extra Bold</option>
                </select>
              </div>
              <div className="prop-row">
                <span className="prop-label">Color</span>
                <input type="color" className="prop-input-color" value={p.fill || '#1a1a1a'} onChange={set('fill')} />
                <input className="prop-input" value={p.fill || '#1a1a1a'} onChange={set('fill')} style={{ flex: 1 }} />
              </div>
              <div className="prop-row">
                <span className="prop-label">Align</span>
                <div className="btn-group">
                  {['left', 'center', 'right'].map(a => (
                    <button key={a} className={`btn btn-sm ${p.textAlign === a ? 'btn-active' : ''}`}
                      onClick={() => onPropertyChange('textAlign', a)} style={{ textTransform: 'capitalize', minWidth: 44 }}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <div className="prop-row">
                <span className="prop-label">Line H.</span>
                <input className="prop-input prop-input-num" type="number" min="0.5" max="4" step="0.05" value={p.lineHeight || 1.45} onChange={setNum('lineHeight')} />
              </div>
            </div>

            {/* Region style */}
            <div className="props-group">
              <div className="props-group-title">Region Style</div>
              <div className="prop-row">
                <span className="prop-label">Fill</span>
                <input type="color" className="prop-input-color"
                  value={rgbaToHex(p.bgFill)} onChange={(e) => onPropertyChange('bgFill', hexToRgba(e.target.value, getAlpha(p.bgFill)))} />
                <input className="prop-input" value={p.bgFill || ''} onChange={set('bgFill')} style={{ flex: 1 }} />
              </div>
              <div className="prop-row">
                <span className="prop-label">Border</span>
                <input type="color" className="prop-input-color"
                  value={rgbaToHex(p.bgStroke)} onChange={(e) => onPropertyChange('bgStroke', hexToRgba(e.target.value, getAlpha(p.bgStroke)))} />
                <input className="prop-input prop-input-num" type="number" min="0" max="10" step="0.5" value={p.bgStrokeWidth ?? 1} onChange={setNum('bgStrokeWidth')} />
              </div>
              <div className="prop-row">
                <span className="prop-label">Radius</span>
                <input className="prop-input prop-input-num" type="number" min="0" max="50" value={p.bgRadius ?? 6} onChange={setNum('bgRadius')} />
              </div>
              <div className="prop-row">
                <span className="prop-label">Padding</span>
                <input className="prop-input prop-input-num" type="number" min="0" max="50" value={p.regionPadding ?? 10} onChange={setNum('regionPadding')} />
              </div>
              <div className="prop-row">
                <span className="prop-label">Opacity</span>
                <input type="range" min="0" max="1" step="0.05" value={p.opacity ?? 1} onChange={setNum('opacity')} style={{ flex: 1, accentColor: 'var(--accent)' }} />
                <span className="text-xs text-muted" style={{ minWidth: 28, textAlign: 'right' }}>{Math.round((p.opacity ?? 1) * 100)}%</span>
              </div>
            </div>

            {/* Link settings */}
            {isLink && (
              <div className="props-group">
                <div className="props-group-title">Link</div>
                <div className="prop-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
                  <span className="prop-label">URL</span>
                  <input className="prop-input" placeholder="https://..." value={p.linkUrl || ''} onChange={set('linkUrl')} />
                </div>
                <div className="prop-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
                  <span className="prop-label">Label (optional)</span>
                  <input className="prop-input" placeholder="Display text" value={p.linkLabel || ''} onChange={set('linkLabel')} />
                </div>
              </div>
            )}

            {/* Delete */}
            <button className="btn btn-danger btn-sm" style={{ width: '100%', marginTop: 8 }}
              onClick={() => canvasRef.current?.deleteSelected()}>
              Delete Region
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Color utility helpers ──
function rgbaToHex(rgba) {
  if (!rgba || rgba === 'transparent') return '#ffffff';
  if (rgba.startsWith('#')) return rgba.length > 7 ? rgba.slice(0, 7) : rgba;
  const m = rgba.match(/[\d.]+/g);
  if (!m) return '#ffffff';
  const [r, g, b] = m.map(Number);
  return '#' + [r, g, b].map(c => Math.round(c).toString(16).padStart(2, '0')).join('');
}

function getAlpha(rgba) {
  if (!rgba || rgba === 'transparent') return 0;
  if (rgba.startsWith('#')) return 1;
  const m = rgba.match(/[\d.]+/g);
  return m && m.length >= 4 ? parseFloat(m[3]) : 1;
}

function hexToRgba(hex, alpha = 1) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
