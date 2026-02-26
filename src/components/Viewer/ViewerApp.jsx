import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import { extractUrls } from '../../utils/schemas';
import { X, Pin, Ghost, Pencil } from '../Icons';

export default function ViewerApp() {
  const canvasElRef = useRef(null);
  const containerRef = useRef(null);
  const fcRef = useRef(null);
  const [noteData, setNoteData] = useState(null);
  const [alwaysOnTop, setAlwaysOnTop] = useState(true);
  const [clickThrough, setClickThrough] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const regionsRef = useRef([]);
  const [linkRegions, setLinkRegions] = useState([]);

  // Click-through escape refs
  const clickThroughRef = useRef(false);
  const isOverControlsRef = useRef(false);

  // ── Load note on mount ──
  useEffect(() => {
    (async () => {
      const info = await window.api?.getWindowInfo();
      if (!info?.noteId) return;

      const res = await window.api?.loadNote(info.noteId);
      if (res?.success) {
        setNoteData(res.data);
        setAlwaysOnTop(res.data.windowPrefs?.alwaysOnTop !== false);
        setClickThrough(res.data.windowPrefs?.clickThrough || false);
        setOpacity(res.data.windowPrefs?.opacity ?? 1);
      }
    })();
  }, []);

  // ── Render canvas when note data is loaded ──
  useEffect(() => {
    if (!noteData || !canvasElRef.current) return;

    const container = containerRef.current;
    const cw = container.clientWidth;
    const ch = container.clientHeight;

    if (fcRef.current) {
      fcRef.current.dispose();
    }

    const fc = new fabric.Canvas(canvasElRef.current, {
      width: cw,
      height: ch,
      backgroundColor: 'transparent',
      selection: false,
      interactive: false,
    });
    fcRef.current = fc;

    renderNote(fc, noteData, cw, ch);

    // Handle resize
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      fc.setDimensions({ width: w, height: h });
      fc.clear();
      renderNote(fc, noteData, w, h);
    });
    ro.observe(container);

    return () => { ro.disconnect(); fc.dispose(); fcRef.current = null; };
  }, [noteData]);

  // ── Click-through escape: temporarily disable when mouse enters control area ──
  useEffect(() => {
    clickThroughRef.current = clickThrough;
    if (!clickThrough) {
      isOverControlsRef.current = false;
      return;
    }

    // Ensure window-level click-through is applied (needed when restoring from saved prefs)
    window.api?.setClickThrough(true);

    const handleMouseMove = (e) => {
      if (!clickThroughRef.current) return;

      // Check if mouse is in control area (top-right) or opacity slider (bottom-center)
      const inControlArea = e.clientY < 50 && e.clientX > window.innerWidth - 180;
      const inOpacityArea = e.clientY > window.innerHeight - 50 &&
        e.clientX > window.innerWidth / 2 - 100 && e.clientX < window.innerWidth / 2 + 100;
      const inInteractiveArea = inControlArea || inOpacityArea;

      if (inInteractiveArea && !isOverControlsRef.current) {
        isOverControlsRef.current = true;
        window.api?.setIgnoreMouseTemp(false);
      } else if (!inInteractiveArea && isOverControlsRef.current) {
        isOverControlsRef.current = false;
        window.api?.setIgnoreMouseTemp(true);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      isOverControlsRef.current = false;
    };
  }, [clickThrough]);

  // ── Render note to canvas ──
  async function renderNote(fc, data, cw, ch) {
    if (!data) return;

    fc.backgroundColor = data.canvas?.backgroundColor || 'transparent';
    const regionInfos = [];

    // Calculate scale to fit
    const srcW = data.canvas?.width || 800;
    const srcH = data.canvas?.height || 600;
    const scale = Math.min(cw / srcW, ch / srcH, 1);
    const offsetX = (cw - srcW * scale) / 2;
    const offsetY = (ch - srcH * scale) / 2;

    // Background image
    if (data.backgroundImage?.assetUrl) {
      try {
        const img = await fabric.FabricImage.fromURL(data.backgroundImage.assetUrl, { crossOrigin: 'anonymous' });
        img.set({
          left: offsetX + (data.backgroundImage.left || 0) * scale,
          top: offsetY + (data.backgroundImage.top || 0) * scale,
          scaleX: (data.backgroundImage.scaleX || 1) * scale,
          scaleY: (data.backgroundImage.scaleY || 1) * scale,
          angle: data.backgroundImage.angle || 0,
          opacity: data.backgroundImage.opacity ?? 1,
          selectable: false,
          evented: false,
        });
        fc.add(img);
      } catch (e) { console.error('Viewer: failed to load bg image', e); }
    }

    // Regions
    const content = data.regionContent || {};
    for (const r of (data.regions || [])) {
      const c = content[r.id] || {};
      const text = c.text || r.text || '';
      const pad = r.style?.padding || 10;
      const radius = r.style?.borderRadius ?? 6;

      // Background rect
      const rectX = offsetX + (r.x || 0) * scale;
      const rectY = offsetY + (r.y || 0) * scale;
      const rectW = (r.width || 200) * scale;
      const rectH = (r.minHeight || r.height || 80) * scale;

      const bgFill = r.style?.backgroundColor || 'rgba(255,255,255,0.88)';
      const bgStroke = r.style?.borderColor || 'rgba(0,0,0,0.10)';
      const bgStrokeW = r.style?.borderWidth ?? 1;

      const rect = new fabric.Rect({
        left: rectX,
        top: rectY,
        width: rectW,
        height: rectH,
        fill: bgFill,
        stroke: bgStroke,
        strokeWidth: bgStrokeW,
        rx: radius * scale,
        ry: radius * scale,
        selectable: false,
        evented: false,
      });
      fc.add(rect);

      // Text
      if (text) {
        const textObj = new fabric.Textbox(text, {
          left: rectX + pad * scale,
          top: rectY + pad * scale,
          width: rectW - pad * 2 * scale,
          fontFamily: r.style?.fontFamily || 'Segoe UI',
          fontSize: (r.style?.fontSize || 15) * scale,
          fontWeight: r.style?.fontWeight || 'normal',
          fill: r.style?.color || '#1a1a1a',
          textAlign: r.style?.textAlign || 'left',
          lineHeight: r.style?.lineHeight || 1.45,
          selectable: false,
          evented: false,
          opacity: r.opacity ?? 1,
        });
        fc.add(textObj);
      }

      // Track link regions and URL-containing text regions
      const urls = r.type === 'link' && (c.linkUrl || r.linkUrl)
        ? [c.linkUrl || r.linkUrl]
        : extractUrls(text);

      if (urls.length > 0) {
        regionInfos.push({
          x: rectX, y: rectY, w: rectW, h: rectH, urls,
        });
      }
    }

    regionsRef.current = regionInfos;
    setLinkRegions([...regionInfos]);
    fc.requestRenderAll();
  }

  // ── Controls ──
  const toggleAlwaysOnTop = useCallback(async () => {
    const val = !alwaysOnTop;
    setAlwaysOnTop(val);
    await window.api?.setAlwaysOnTop(val);
  }, [alwaysOnTop]);

  const toggleClickThrough = useCallback(async () => {
    const val = !clickThrough;
    setClickThrough(val);
    await window.api?.setClickThrough(val);
  }, [clickThrough]);

  const handleOpacityChange = useCallback(async (e) => {
    const val = parseFloat(e.target.value);
    setOpacity(val);
    await window.api?.setWindowOpacity(val);
  }, []);

  const openInEditor = useCallback(async () => {
    const info = await window.api?.getWindowInfo();
    if (info?.noteId) {
      await window.api?.openNoteInEditor(info.noteId);
    }
  }, []);

  const close = useCallback(() => {
    window.api?.closeViewer();
  }, []);

  return (
    <div className="viewer-root">
      <div ref={containerRef} className="viewer-canvas-wrap">
        <canvas ref={canvasElRef} />
      </div>

      {/* Link region overlays — clickable even in drag mode */}
      {linkRegions.map((r, i) => (
        <div
          key={i}
          className="viewer-link-overlay"
          style={{
            position: 'absolute',
            left: r.x,
            top: r.y,
            width: r.w,
            height: r.h,
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (r.urls.length === 1) {
              window.api?.openExternal(r.urls[0]);
            } else {
              r.urls.forEach(url => window.api?.openExternal(url));
            }
          }}
        />
      ))}

      {/* Controls — appear on hover */}
      <div className="viewer-controls">
        <button className={`viewer-btn ${alwaysOnTop ? 'active' : ''}`} onClick={toggleAlwaysOnTop} title="Always on top">
          <Pin />
        </button>
        <button className={`viewer-btn ${clickThrough ? 'active' : ''}`} onClick={toggleClickThrough} title="Click-through mode">
          <Ghost />
        </button>
        <button className="viewer-btn" onClick={openInEditor} title="Edit in editor">
          <Pencil />
        </button>
        <button className="viewer-btn" onClick={close} title="Close">
          <X />
        </button>
      </div>

      {/* Opacity slider — appears on hover */}
      <div className="viewer-opacity-slider">
        <label>Opacity</label>
        <input type="range" min="0.1" max="1" step="0.05" value={opacity} onChange={handleOpacityChange} />
        <span className="text-xs text-muted" style={{ minWidth: 28 }}>{Math.round(opacity * 100)}%</span>
      </div>

      {/* Resize corner */}
      <div className="viewer-resize" />
    </div>
  );
}
