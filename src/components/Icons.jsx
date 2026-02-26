import React from 'react';

const s = (d, w = 16, h = 16, extra = {}) => (props) => (
  <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...extra} {...props}>
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
);

export const Cursor = s(
  <><path d="M3 3l4.5 13 2-5.5L15 8z" fill="currentColor" stroke="none" /><path d="M3 3l4.5 13 2-5.5L15 8z" /></>
);
export const TextIcon = s("M4 4h8M8 4v8");
export const LinkIcon = s(
  <><path d="M9 5H7a3 3 0 000 6h2" /><path d="M7 11h2a3 3 0 000-6H7" /><line x1="5" y1="8" x2="11" y2="8" /></>
);
export const ZoomIn = s(<><circle cx="7.5" cy="7.5" r="5" /><path d="M12 12l3.5 3.5M7.5 5.5v4M5.5 7.5h4" /></>);
export const ZoomOut = s(<><circle cx="7.5" cy="7.5" r="5" /><path d="M12 12l3.5 3.5M5.5 7.5h4" /></>);
export const Save = s("M4 2h8l2 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2zM10 2v4H6V2M4 10h8");
export const Download = s("M8 2v9M4.5 7.5L8 11l3.5-3.5M3 13h10");
export const Eye = s(<><path d="M1.5 8s2.5-5 6.5-5 6.5 5 6.5 5-2.5 5-6.5 5S1.5 8 1.5 8z" /><circle cx="8" cy="8" r="2" /></>);
export const Undo = s("M4 6h6a3 3 0 010 6H8M4 6l3-3M4 6l3 3");
export const Redo = s("M12 6H6a3 3 0 000 6h2M12 6l-3-3M12 6l-3 3");
export const Trash = s("M3 4h10M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M12 4l-.6 8.4a1.5 1.5 0 01-1.5 1.6H6.1a1.5 1.5 0 01-1.5-1.6L4 4");
export const Plus = s("M8 3v10M3 8h10");
export const X = s("M4 4l8 8M12 4l-8 8");
export const Pin = s("M8 2v2M4.5 6.5L3 8l5 5 1.5-1.5M5 7l4 4M7 5h4v4M11 5l2-2");
export const Ghost = s(
  <><path d="M2 14V7a6 6 0 1112 0v7l-2-2-2 2-2-2-2 2-2-2z" /><circle cx="5.5" cy="7.5" r="0.8" fill="currentColor" stroke="none" /><circle cx="10.5" cy="7.5" r="0.8" fill="currentColor" stroke="none" /></>
);
export const Pencil = s("M12.5 3.5a1.4 1.4 0 00-2 0L4 10l-1 3 3-1 6.5-6.5a1.4 1.4 0 000-2z");
export const Image = s(
  <><rect x="2" y="2" width="12" height="12" rx="2" /><circle cx="5.5" cy="5.5" r="1.2" /><path d="M14 10l-3-3-7 7" /></>
);
export const Layers = s("M2 8l6 3 6-3M2 11l6 3 6-3M2 5l6 3 6-3");
export const Grid = s("M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z");
export const ChevronUp = s("M4 10l4-4 4 4");
export const ChevronDown = s("M4 6l4 4 4-4");
export const FolderOpen = s(
  <><path d="M2 13V5a2 2 0 012-2h3l2 2h3a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2z" /></>
);
export const StickyNote = s(
  <><path d="M14 10l-4 4H4a2 2 0 01-2-2V4a2 2 0 012-2h8a2 2 0 012 2v6z" /><path d="M14 10h-4v4" /></>
);
export const Maximize = s("M4 14h-2v-2M14 4v-2h-2M2 4v-2h2M12 14h2v-2");
export const Search = s(<><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></>);
