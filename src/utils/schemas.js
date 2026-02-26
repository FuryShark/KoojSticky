export function createId() {
  return crypto.randomUUID();
}

export function now() {
  return new Date().toISOString();
}

export function createProfile(overrides = {}) {
  const id = createId();
  return {
    id,
    name: overrides.name || 'Untitled Profile',
    tags: overrides.tags || [],
    createdAt: now(),
    updatedAt: now(),
    canvas: {
      width: overrides.canvasWidth || 800,
      height: overrides.canvasHeight || 600,
      backgroundColor: overrides.canvasBg || '#ffffff',
    },
    backgroundImage: overrides.backgroundImage || null,
    regions: overrides.regions || [],
    ...overrides,
    id,
  };
}

export function createNote(overrides = {}) {
  const id = createId();
  return {
    id,
    name: overrides.name || 'Untitled Note',
    createdAt: now(),
    updatedAt: now(),
    profileId: overrides.profileId || null,
    canvas: overrides.canvas || {
      width: 800,
      height: 600,
      backgroundColor: '#ffffff',
    },
    backgroundImage: overrides.backgroundImage || null,
    regions: overrides.regions || [],
    regionContent: overrides.regionContent || {},
    windowPrefs: {
      lastX: null,
      lastY: null,
      lastWidth: 400,
      lastHeight: 400,
      alwaysOnTop: true,
      clickThrough: false,
      opacity: 1.0,
      ...(overrides.windowPrefs || {}),
    },
    ...overrides,
    id,
  };
}

export function createRegion(type = 'writing', overrides = {}) {
  return {
    id: createId(),
    type,
    x: 50,
    y: 50,
    width: 250,
    height: 120,
    zIndex: 0,
    style: {
      fontFamily: 'Segoe UI',
      fontSize: 15,
      fontWeight: 'normal',
      color: '#1a1a1a',
      textAlign: 'left',
      lineHeight: 1.45,
      padding: 10,
      backgroundColor: 'rgba(255,255,255,0.88)',
      borderColor: 'rgba(0,0,0,0.10)',
      borderWidth: 1,
      borderRadius: 6,
    },
    text: '',
    linkUrl: '',
    linkLabel: '',
    ...overrides,
  };
}

export const FONT_FAMILIES = [
  'Segoe UI',
  'Arial',
  'Verdana',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Trebuchet MS',
  'Tahoma',
  'Comic Sans MS',
  'Impact',
];

export const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

export function extractUrls(text) {
  if (!text) return [];
  return [...text.matchAll(URL_REGEX)].map(m => m[0]);
}
