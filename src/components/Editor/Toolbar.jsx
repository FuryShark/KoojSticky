import React from 'react';
import { Cursor, TextIcon, LinkIcon, Undo, Redo, Image as ImageIcon } from '../Icons';

export default function Toolbar({ activeTool, onToolChange, zoom, onZoomChange, onUndo, onRedo, onImportImage }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      {/* Tool group */}
      <div className="btn-group">
        <button
          className={`btn btn-icon btn-sm ${activeTool === 'select' ? 'btn-active' : ''}`}
          onClick={() => onToolChange('select')}
          title="Select tool (V)"
        >
          <Cursor />
        </button>
        <button
          className={`btn btn-icon btn-sm ${activeTool === 'addWriting' ? 'btn-active' : ''}`}
          onClick={() => onToolChange('addWriting')}
          title="Add text region — click & drag on canvas"
        >
          <TextIcon />
        </button>
        <button
          className={`btn btn-icon btn-sm ${activeTool === 'addLink' ? 'btn-active' : ''}`}
          onClick={() => onToolChange('addLink')}
          title="Add link region — click & drag on canvas"
        >
          <LinkIcon />
        </button>
      </div>

      <div className="header-sep" />

      {/* Import */}
      <button className="btn btn-sm" onClick={onImportImage} title="Import background image">
        <ImageIcon /> Import
      </button>

      <div className="header-sep" />

      {/* Undo / Redo */}
      <button className="btn btn-icon btn-ghost btn-sm" onClick={onUndo} title="Undo (Ctrl+Z)">
        <Undo />
      </button>
      <button className="btn btn-icon btn-ghost btn-sm" onClick={onRedo} title="Redo (Ctrl+Y)">
        <Redo />
      </button>
    </div>
  );
}
