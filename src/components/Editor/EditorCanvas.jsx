import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef, useState } from 'react';
import * as fabric from 'fabric';
import { createId } from '../../utils/schemas';
import { Image as ImageIcon } from '../Icons';

// ═══════════════════════════════════════════════════════════════
// Custom TextRegion — Textbox with a visible background rect
// ═══════════════════════════════════════════════════════════════
class TextRegion extends fabric.Textbox {
  static type = 'TextRegion';

  constructor(text, options = {}) {
    super(text, {
      fontFamily: 'Segoe UI',
      fontSize: 15,
      fill: '#1a1a1a',
      textAlign: 'left',
      lineHeight: 1.45,
      padding: 10,
      splitByGrapheme: false,
      ...options,
    });
    this.regionId = options.regionId || createId();
    this.regionType = options.regionType || 'writing';
    this.bgFill = options.bgFill ?? 'rgba(255,255,255,0.88)';
    this.bgStroke = options.bgStroke ?? 'rgba(0,0,0,0.10)';
    this.bgStrokeWidth = options.bgStrokeWidth ?? 1;
    this.bgRadius = options.bgRadius ?? 6;
    this.regionPadding = options.regionPadding ?? 10;
    this.linkUrl = options.linkUrl || '';
    this.linkLabel = options.linkLabel || '';
    this.minHeight = options.minHeight || 40;

    // Visual settings
    this.borderColor = '#8b5cf6';
    this.cornerColor = '#8b5cf6';
    this.cornerStyle = 'circle';
    this.cornerSize = 8;
    this.transparentCorners = false;
    this.borderScaleFactor = 1.5;
  }

  _render(ctx) {
    const pad = this.regionPadding;
    const w = this.width + pad * 2;
    const h = Math.max(this.height, this.minHeight) + pad * 2;
    const x = -this.width / 2 - pad;
    const y = -this.height / 2 - pad;
    const r = Math.min(this.bgRadius, Math.min(w, h) / 2);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();

    if (this.bgFill && this.bgFill !== 'transparent') {
      ctx.fillStyle = this.bgFill;
      ctx.fill();
    }
    if (this.bgStrokeWidth > 0 && this.bgStroke && this.bgStroke !== 'transparent') {
      ctx.strokeStyle = this.bgStroke;
      ctx.lineWidth = this.bgStrokeWidth;
      ctx.stroke();
    }
    ctx.restore();

    super._render(ctx);
  }

  toObject(propertiesToInclude = []) {
    return {
      ...super.toObject(propertiesToInclude),
      regionId: this.regionId,
      regionType: this.regionType,
      bgFill: this.bgFill,
      bgStroke: this.bgStroke,
      bgStrokeWidth: this.bgStrokeWidth,
      bgRadius: this.bgRadius,
      regionPadding: this.regionPadding,
      linkUrl: this.linkUrl,
      linkLabel: this.linkLabel,
      minHeight: this.minHeight,
    };
  }

  // Required for fabric v6 deserialization (undo/redo via loadFromJSON)
  static async fromObject(object) {
    const text = object.text || '';
    return new TextRegion(text, { ...object });
  }
}

// Register the class
fabric.classRegistry.setClass(TextRegion);
fabric.classRegistry.setSVGClass(TextRegion);

// ═══════════════════════════════════════════════════════════════
// EditorCanvas component
// ═══════════════════════════════════════════════════════════════
const EditorCanvas = forwardRef(function EditorCanvas(
  { activeTool, onToolChange, onSelectionChange, onChange, onCanvasEmptyChange, zoom, onZoomChange, canvasEmpty },
  ref
) {
  const containerRef = useRef(null);
  const canvasElRef = useRef(null);
  const fcRef = useRef(null); // Fabric canvas instance
  const bgImageRef = useRef(null); // Background image object
  const [isDragOver, setIsDragOver] = useState(false);
  const drawingRef = useRef(null); // For region drawing
  const historyRef = useRef({ stack: [], index: -1, paused: false });
  const activeToolRef = useRef(activeTool);

  activeToolRef.current = activeTool;

  // ── Initialize canvas ──
  useEffect(() => {
    if (!canvasElRef.current || fcRef.current) return;

    const container = containerRef.current;
    const cw = container.clientWidth - 2;
    const ch = container.clientHeight - 2;

    const fc = new fabric.Canvas(canvasElRef.current, {
      width: cw,
      height: ch,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
      stopContextMenu: true,
    });

    fc.backgroundColor = '#ffffff';
    fcRef.current = fc;

    // ── Selection events ──
    fc.on('selection:created', handleSelection);
    fc.on('selection:updated', handleSelection);
    fc.on('selection:cleared', () => onSelectionChange(null));

    // ── Object modification events ──
    fc.on('object:modified', () => { onChange(); pushHistory(); });
    fc.on('text:changed', () => { onChange(); });

    // ── Drawing region tool ──
    fc.on('mouse:down', onMouseDown);
    fc.on('mouse:move', onMouseMove);
    fc.on('mouse:up', onMouseUp);

    // ── Zoom with mouse wheel ──
    fc.on('mouse:wheel', (opt) => {
      opt.e.preventDefault();
      const delta = opt.e.deltaY;
      let newZoom = fc.getZoom();
      newZoom *= 0.999 ** delta;
      newZoom = Math.min(Math.max(0.1, newZoom), 5);
      fc.zoomToPoint(new fabric.Point(opt.e.offsetX, opt.e.offsetY), newZoom);
      onZoomChange(newZoom);
      fc.requestRenderAll();
    });

    pushHistory();

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth - 2;
      const h = container.clientHeight - 2;
      fc.setDimensions({ width: w, height: h });
      fc.requestRenderAll();
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      fc.dispose();
      fcRef.current = null;
    };
  }, []);

  // ── Selection handler ──
  function handleSelection(e) {
    const obj = e?.selected?.[0];
    if (!obj) { onSelectionChange(null); return; }

    if (obj === bgImageRef.current) {
      onSelectionChange({
        type: 'backgroundImage',
        left: obj.left,
        top: obj.top,
        scaleX: obj.scaleX,
        scaleY: obj.scaleY,
        angle: obj.angle,
        opacity: obj.opacity,
      });
    } else if (obj instanceof TextRegion) {
      onSelectionChange({
        type: obj.regionType === 'link' ? 'linkRegion' : 'textRegion',
        regionId: obj.regionId,
        regionType: obj.regionType,
        left: Math.round(obj.left),
        top: Math.round(obj.top),
        width: Math.round(obj.width * obj.scaleX),
        height: Math.round(obj.height * obj.scaleY),
        fontFamily: obj.fontFamily,
        fontSize: obj.fontSize,
        fontWeight: obj.fontWeight,
        fill: obj.fill,
        textAlign: obj.textAlign,
        lineHeight: obj.lineHeight,
        bgFill: obj.bgFill,
        bgStroke: obj.bgStroke,
        bgStrokeWidth: obj.bgStrokeWidth,
        bgRadius: obj.bgRadius,
        regionPadding: obj.regionPadding,
        linkUrl: obj.linkUrl,
        linkLabel: obj.linkLabel,
        text: obj.text,
        opacity: obj.opacity,
      });
    }
  }

  // ── Mouse handlers for region drawing ──
  function onMouseDown(opt) {
    const tool = activeToolRef.current;
    if (tool !== 'addWriting' && tool !== 'addLink') return;

    const fc = fcRef.current;
    if (!fc) return;

    const pointer = fc.getScenePoint(opt.e);
    fc.selection = false;

    const rect = new fabric.Rect({
      left: pointer.x,
      top: pointer.y,
      width: 0,
      height: 0,
      fill: 'rgba(139,92,246,0.12)',
      stroke: '#8b5cf6',
      strokeWidth: 1.5,
      strokeDashArray: [5, 3],
      selectable: false,
      evented: false,
    });

    fc.add(rect);
    drawingRef.current = { rect, startX: pointer.x, startY: pointer.y, type: tool === 'addLink' ? 'link' : 'writing' };
  }

  function onMouseMove(opt) {
    if (!drawingRef.current) return;
    const fc = fcRef.current;
    const pointer = fc.getScenePoint(opt.e);
    const { rect, startX, startY } = drawingRef.current;

    const x = Math.min(startX, pointer.x);
    const y = Math.min(startY, pointer.y);
    const w = Math.abs(pointer.x - startX);
    const h = Math.abs(pointer.y - startY);

    rect.set({ left: x, top: y, width: w, height: h });
    fc.requestRenderAll();
  }

  function onMouseUp(opt) {
    if (!drawingRef.current) return;
    const fc = fcRef.current;
    const { rect, startX, startY, type } = drawingRef.current;

    fc.remove(rect);
    drawingRef.current = null;
    fc.selection = true;

    const pointer = fc.getScenePoint(opt.e);
    const w = Math.abs(pointer.x - startX);
    const h = Math.abs(pointer.y - startY);

    if (w < 20 || h < 20) {
      // Too small, ignore
      onToolChange('select');
      return;
    }

    const region = new TextRegion(type === 'link' ? 'Click to open link' : '', {
      left: Math.min(startX, pointer.x),
      top: Math.min(startY, pointer.y),
      width: w,
      regionType: type,
      minHeight: h,
      bgFill: type === 'link' ? 'rgba(139,92,246,0.10)' : 'rgba(255,255,255,0.88)',
      bgStroke: type === 'link' ? 'rgba(139,92,246,0.3)' : 'rgba(0,0,0,0.10)',
    });

    fc.add(region);
    fc.setActiveObject(region);
    fc.requestRenderAll();
    onChange();
    onCanvasEmptyChange(false);
    pushHistory();
    onToolChange('select');
  }

  // ── History (undo/redo) ──
  function pushHistory() {
    const fc = fcRef.current;
    if (!fc || historyRef.current.paused) return;
    const json = fc.toJSON(['regionId', 'regionType', 'bgFill', 'bgStroke', 'bgStrokeWidth', 'bgRadius', 'regionPadding', 'linkUrl', 'linkLabel', 'minHeight', '_isBgImage', '_assetHash', '_assetPath', '_assetUrl', '_originalName']);
    const { stack, index } = historyRef.current;
    // Truncate any redo states
    const newStack = stack.slice(0, index + 1);
    newStack.push(JSON.stringify(json));
    // Limit history
    if (newStack.length > 50) newStack.shift();
    historyRef.current = { stack: newStack, index: newStack.length - 1, paused: false };
  }

  function restoreHistory(idx) {
    const fc = fcRef.current;
    if (!fc) return;
    const { stack } = historyRef.current;
    if (idx < 0 || idx >= stack.length) return;
    historyRef.current.paused = true;
    historyRef.current.index = idx;

    const json = JSON.parse(stack[idx]);
    fc.loadFromJSON(json).then(() => {
      // Re-identify background image
      bgImageRef.current = null;
      fc.getObjects().forEach(obj => {
        if (obj._isBgImage) bgImageRef.current = obj;
      });
      fc.requestRenderAll();
      historyRef.current.paused = false;
    });
  }

  // ── Drag & drop image ──
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); };
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) return;

    const res = await window.api?.importImageFromPath(file.path);
    if (res?.success) {
      await loadBgImage(res.data);
    }
  };

  // ── Load background image ──
  async function loadBgImage(assetData) {
    const fc = fcRef.current;
    if (!fc) return;

    // Remove existing background
    if (bgImageRef.current) {
      fc.remove(bgImageRef.current);
      bgImageRef.current = null;
    }

    const img = await fabric.FabricImage.fromURL(assetData.assetUrl, { crossOrigin: 'anonymous' });

    // Scale to fit canvas
    const cw = fc.width;
    const ch = fc.height;
    const scale = Math.min(cw / img.width, ch / img.height, 1) * 0.85;

    img.set({
      left: (cw - img.width * scale) / 2,
      top: (ch - img.height * scale) / 2,
      scaleX: scale,
      scaleY: scale,
      selectable: true,
      evented: true,
      hasControls: true,
      borderColor: '#8b5cf6',
      cornerColor: '#8b5cf6',
      cornerStyle: 'circle',
      cornerSize: 8,
      transparentCorners: false,
    });

    // Store asset data on the image
    img._isBgImage = true;
    img._assetHash = assetData.assetHash;
    img._assetPath = assetData.assetPath;
    img._assetUrl = assetData.assetUrl;
    img._originalName = assetData.originalName;

    fc.add(img);
    fc.sendObjectToBack(img);
    bgImageRef.current = img;
    fc.setActiveObject(img);
    fc.requestRenderAll();
    onChange();
    onCanvasEmptyChange(false);
    pushHistory();
  }

  // ── Imperative API exposed to parent ──
  useImperativeHandle(ref, () => ({
    setBackgroundImage: (assetData) => loadBgImage(assetData),

    serialize: () => {
      const fc = fcRef.current;
      if (!fc) return {};

      const objects = fc.getObjects();
      const bg = bgImageRef.current;
      const regions = objects.filter(o => o instanceof TextRegion);

      return {
        canvas: {
          width: fc.width,
          height: fc.height,
          backgroundColor: fc.backgroundColor || '#ffffff',
        },
        backgroundImage: bg ? {
          assetHash: bg._assetHash,
          assetPath: bg._assetPath,
          assetUrl: bg._assetUrl,
          originalName: bg._originalName,
          naturalWidth: bg.width,
          naturalHeight: bg.height,
          left: bg.left,
          top: bg.top,
          scaleX: bg.scaleX,
          scaleY: bg.scaleY,
          angle: bg.angle || 0,
          opacity: bg.opacity ?? 1,
        } : null,
        regions: regions.map((r, i) => ({
          id: r.regionId,
          type: r.regionType,
          x: r.left,
          y: r.top,
          width: r.width * (r.scaleX || 1),
          height: r.height * (r.scaleY || 1),
          zIndex: i,
          style: {
            fontFamily: r.fontFamily,
            fontSize: r.fontSize,
            fontWeight: r.fontWeight,
            color: r.fill,
            textAlign: r.textAlign,
            lineHeight: r.lineHeight,
            padding: r.regionPadding,
            backgroundColor: r.bgFill,
            borderColor: r.bgStroke,
            borderWidth: r.bgStrokeWidth,
            borderRadius: r.bgRadius,
          },
          text: r.text,
          linkUrl: r.linkUrl || '',
          linkLabel: r.linkLabel || '',
          opacity: r.opacity ?? 1,
          minHeight: r.minHeight,
        })),
        regionContent: regions.reduce((acc, r) => {
          acc[r.regionId] = { text: r.text, linkUrl: r.linkUrl, linkLabel: r.linkLabel };
          return acc;
        }, {}),
      };
    },

    deserialize: async (data) => {
      const fc = fcRef.current;
      if (!fc) return;

      // Clear canvas
      fc.clear();
      bgImageRef.current = null;
      fc.backgroundColor = data.canvas?.backgroundColor || '#ffffff';

      // Load background image
      if (data.backgroundImage?.assetUrl) {
        try {
          const url = data.backgroundImage.assetUrl;
          const img = await fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' });
          img.set({
            left: data.backgroundImage.left || 0,
            top: data.backgroundImage.top || 0,
            scaleX: data.backgroundImage.scaleX || 1,
            scaleY: data.backgroundImage.scaleY || 1,
            angle: data.backgroundImage.angle || 0,
            opacity: data.backgroundImage.opacity ?? 1,
            selectable: true, evented: true, hasControls: true,
            borderColor: '#8b5cf6', cornerColor: '#8b5cf6',
            cornerStyle: 'circle', cornerSize: 8, transparentCorners: false,
          });
          img._isBgImage = true;
          img._assetHash = data.backgroundImage.assetHash;
          img._assetPath = data.backgroundImage.assetPath;
          img._assetUrl = data.backgroundImage.assetUrl;
          img._originalName = data.backgroundImage.originalName;
          fc.add(img);
          fc.sendObjectToBack(img);
          bgImageRef.current = img;
        } catch (e) {
          console.error('Failed to load background image:', e);
        }
      }

      // Load regions
      const content = data.regionContent || {};
      for (const r of (data.regions || [])) {
        const c = content[r.id] || {};
        const region = new TextRegion(c.text || r.text || '', {
          left: r.x,
          top: r.y,
          width: r.width,
          regionId: r.id,
          regionType: r.type,
          fontFamily: r.style?.fontFamily || 'Segoe UI',
          fontSize: r.style?.fontSize || 15,
          fontWeight: r.style?.fontWeight || 'normal',
          fill: r.style?.color || '#1a1a1a',
          textAlign: r.style?.textAlign || 'left',
          lineHeight: r.style?.lineHeight || 1.45,
          regionPadding: r.style?.padding || 10,
          bgFill: r.style?.backgroundColor || 'rgba(255,255,255,0.88)',
          bgStroke: r.style?.borderColor || 'rgba(0,0,0,0.10)',
          bgStrokeWidth: r.style?.borderWidth ?? 1,
          bgRadius: r.style?.borderRadius ?? 6,
          linkUrl: c.linkUrl || r.linkUrl || '',
          linkLabel: c.linkLabel || r.linkLabel || '',
          opacity: r.opacity ?? 1,
          minHeight: r.minHeight || r.height || 40,
        });
        fc.add(region);
      }

      fc.requestRenderAll();
      onCanvasEmptyChange(fc.getObjects().length === 0);
      pushHistory();
    },

    exportImage: (options = {}) => {
      const fc = fcRef.current;
      if (!fc) return null;

      // Deselect before export
      fc.discardActiveObject();
      fc.requestRenderAll();

      const multiplier = options.multiplier || 1;
      const format = options.format || 'png';

      // Handle transparent background option
      const origBg = fc.backgroundColor;
      if (options.transparent) {
        fc.backgroundColor = 'transparent';
        fc.requestRenderAll();
      }

      // Find bounding box of all objects
      const objects = fc.getObjects();
      if (objects.length === 0) {
        if (options.transparent) { fc.backgroundColor = origBg; fc.requestRenderAll(); }
        return null;
      }

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      objects.forEach(obj => {
        const bounds = obj.getBoundingRect();
        minX = Math.min(minX, bounds.left);
        minY = Math.min(minY, bounds.top);
        maxX = Math.max(maxX, bounds.left + bounds.width);
        maxY = Math.max(maxY, bounds.top + bounds.height);
      });

      // Add small padding
      const pad = 2;
      minX = Math.max(0, minX - pad);
      minY = Math.max(0, minY - pad);
      maxX = Math.min(fc.width, maxX + pad);
      maxY = Math.min(fc.height, maxY + pad);

      const result = fc.toDataURL({
        format,
        quality: 1,
        multiplier,
        left: minX,
        top: minY,
        width: maxX - minX,
        height: maxY - minY,
      });

      // Restore background after export
      if (options.transparent) {
        fc.backgroundColor = origBg;
        fc.requestRenderAll();
      }

      return result;
    },

    clear: () => {
      const fc = fcRef.current;
      if (!fc) return;
      fc.clear();
      fc.backgroundColor = '#ffffff';
      bgImageRef.current = null;
      fc.requestRenderAll();
      onCanvasEmptyChange(true);
      pushHistory();
    },

    setZoom: (level) => {
      const fc = fcRef.current;
      if (!fc) return;
      fc.setZoom(level);
      fc.requestRenderAll();
    },

    undo: () => {
      const h = historyRef.current;
      if (h.index > 0) restoreHistory(h.index - 1);
    },

    redo: () => {
      const h = historyRef.current;
      if (h.index < h.stack.length - 1) restoreHistory(h.index + 1);
    },

    deleteSelected: () => {
      const fc = fcRef.current;
      if (!fc) return;
      const active = fc.getActiveObjects();
      if (!active.length) return;
      active.forEach(obj => {
        if (obj === bgImageRef.current) bgImageRef.current = null;
        fc.remove(obj);
      });
      fc.discardActiveObject();
      fc.requestRenderAll();
      onChange();
      onCanvasEmptyChange(fc.getObjects().length === 0);
      pushHistory();
    },

    updateSelectedObject: (key, value) => {
      const fc = fcRef.current;
      if (!fc) return;
      const obj = fc.getActiveObject();
      if (!obj) return;

      // Map property names
      const fabricKey = {
        fill: 'fill',
        fontFamily: 'fontFamily',
        fontSize: 'fontSize',
        fontWeight: 'fontWeight',
        textAlign: 'textAlign',
        lineHeight: 'lineHeight',
        bgFill: 'bgFill',
        bgStroke: 'bgStroke',
        bgStrokeWidth: 'bgStrokeWidth',
        bgRadius: 'bgRadius',
        regionPadding: 'regionPadding',
        opacity: 'opacity',
        linkUrl: 'linkUrl',
        linkLabel: 'linkLabel',
        left: 'left',
        top: 'top',
        angle: 'angle',
      }[key] || key;

      obj.set(fabricKey, value);
      if (key === 'fontSize' || key === 'fontFamily' || key === 'fontWeight' || key === 'lineHeight') {
        obj.initDimensions();
      }
      fc.requestRenderAll();
    },

    selectObject: (objData) => {
      const fc = fcRef.current;
      if (!fc) return;
      const objects = fc.getObjects();
      const target = objects.find(o =>
        (o instanceof TextRegion && o.regionId === objData?.regionId) ||
        (o === bgImageRef.current && objData?.type === 'backgroundImage')
      );
      if (target) {
        fc.setActiveObject(target);
        fc.requestRenderAll();
      }
    },

    reorderObject: (fromIdx, toIdx) => {
      const fc = fcRef.current;
      if (!fc) return;
      const objects = fc.getObjects();
      if (fromIdx < 0 || fromIdx >= objects.length || toIdx < 0 || toIdx >= objects.length) return;
      const obj = objects[fromIdx];
      fc.moveObjectTo(obj, toIdx);
      fc.requestRenderAll();
      pushHistory();
    },

    getObjects: () => {
      const fc = fcRef.current;
      if (!fc) return [];
      return fc.getObjects().map((obj, i) => {
        if (obj._isBgImage) return { type: 'backgroundImage', name: obj._originalName || 'Background', index: i };
        if (obj instanceof TextRegion) return {
          type: obj.regionType === 'link' ? 'linkRegion' : 'textRegion',
          regionId: obj.regionId,
          name: obj.text?.slice(0, 20) || (obj.regionType === 'link' ? 'Link Region' : 'Text Region'),
          index: i,
        };
        return { type: 'unknown', name: 'Object', index: i };
      });
    },

    getCanvas: () => fcRef.current,
  }));

  return (
    <div
      ref={containerRef}
      className="canvas-area"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ cursor: activeTool !== 'select' ? 'crosshair' : undefined }}
    >
      <canvas ref={canvasElRef} />

      {isDragOver && (
        <div className="canvas-drop-overlay">
          Drop image to set as background
        </div>
      )}

      {canvasEmpty && !isDragOver && (
        <div className="canvas-empty-state">
          <ImageIcon width={48} height={48} />
          <p>Drag & drop an image, or click Import</p>
          <small>PNG, JPG, or WebP — this becomes your note background</small>
        </div>
      )}

      {/* Zoom controls */}
      <div className="zoom-controls">
        <button className="btn btn-icon btn-ghost btn-sm" onClick={() => onZoomChange(Math.max(0.1, zoom - 0.1))}>−</button>
        <span className="zoom-label">{Math.round(zoom * 100)}%</span>
        <button className="btn btn-icon btn-ghost btn-sm" onClick={() => onZoomChange(Math.min(5, zoom + 0.1))}>+</button>
        <button className="btn btn-ghost btn-sm" onClick={() => onZoomChange(1)} style={{ fontSize: 10, marginLeft: 2 }}>Reset</button>
      </div>
    </div>
  );
});

export default EditorCanvas;
