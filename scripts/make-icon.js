/**
 * Generate a simple KoojSticky app icon (256x256 PNG + ICO)
 * Uses only Node.js built-in modules.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 256;
const OUT_DIR = path.join(__dirname, '..', 'build');

// ── Color palette ──
const BG      = [255, 222, 89];   // Sticky-note yellow
const FOLD    = [230, 190, 50];   // Darker fold
const SHADOW  = [200, 165, 40];   // Fold shadow edge
const TEXT_C  = [100, 80, 20];    // Brown text lines
const BORDER  = [220, 185, 60];   // Subtle border

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

function blend(c1, c2, t) {
  return [
    Math.round(c1[0] * (1 - t) + c2[0] * t),
    Math.round(c1[1] * (1 - t) + c2[1] * t),
    Math.round(c1[2] * (1 - t) + c2[2] * t),
  ];
}

function generatePixels() {
  const pixels = Buffer.alloc(SIZE * SIZE * 4);
  const margin = 20;
  const radius = 18;
  const foldSize = 48;
  const noteL = margin, noteT = margin;
  const noteR = SIZE - margin, noteB = SIZE - margin;
  const noteW = noteR - noteL, noteH = noteB - noteT;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const idx = (y * SIZE + x) * 4;
      let r = 0, g = 0, b = 0, a = 0;

      // Check if inside the note rectangle (with rounded corners, minus fold)
      const inNoteX = x >= noteL && x <= noteR;
      const inNoteY = y >= noteT && y <= noteB;

      // Fold triangle area: top-right corner
      const foldX = noteR - foldSize;
      const foldY = noteT + foldSize;
      const inFoldCut = x > foldX && y < foldY && (x - foldX) + (foldY - y) > foldSize;

      // Rounded corners check
      let inRounded = true;
      if (inNoteX && inNoteY) {
        // Top-left corner
        if (x < noteL + radius && y < noteT + radius) {
          inRounded = dist(x, y, noteL + radius, noteT + radius) <= radius;
        }
        // Bottom-left corner
        if (x < noteL + radius && y > noteB - radius) {
          inRounded = dist(x, y, noteL + radius, noteB - radius) <= radius;
        }
        // Bottom-right corner
        if (x > noteR - radius && y > noteB - radius) {
          inRounded = dist(x, y, noteR - radius, noteB - radius) <= radius;
        }
        // Top-right is the fold, no rounding needed
      }

      if (inNoteX && inNoteY && inRounded && !inFoldCut) {
        // Inside the note body
        [r, g, b] = BG;
        a = 255;

        // Subtle border
        const bw = 2;
        if (x < noteL + bw || x > noteR - bw || y < noteT + bw || y > noteB - bw) {
          [r, g, b] = BORDER;
        }

        // Draw "text lines" in the middle area
        const lineStartX = noteL + 35;
        const lineEndX = noteR - 55;
        const lineStartY = noteT + 55;
        const lineSpacing = 28;
        const lineH = 4;
        const lineLengths = [1.0, 0.85, 0.7, 0.92, 0.6];

        for (let li = 0; li < lineLengths.length; li++) {
          const ly = lineStartY + li * lineSpacing;
          const lEnd = lineStartX + (lineEndX - lineStartX) * lineLengths[li];
          if (y >= ly && y < ly + lineH && x >= lineStartX && x <= lEnd) {
            [r, g, b] = TEXT_C;
            a = 180;
          }
        }

        // Drop shadow at bottom and right edge (subtle)
        const shadowSize = 5;
        if (y > noteB - shadowSize) {
          const t = (y - (noteB - shadowSize)) / shadowSize;
          a = Math.round(255 * (1 - t * 0.3));
        }
      }

      // Draw the fold triangle
      if (x >= foldX && y <= foldY && x <= noteR && y >= noteT && !inFoldCut) {
        // This is the edge near the fold — keep it as note body
      }

      // The fold flap itself
      if (inFoldCut && x <= noteR + 2 && y >= noteT - 2) {
        // Fold triangle: map position within the fold
        const fx = (x - foldX) / foldSize;
        const fy = (foldY - y) / foldSize;
        if (fx + fy <= 1.05) {
          const shade = 0.7 + 0.3 * fy;
          [r, g, b] = blend(SHADOW, FOLD, shade);
          a = 255;

          // Fold diagonal line
          if (Math.abs(fx + fy - 1.0) < 0.04) {
            [r, g, b] = SHADOW;
          }
        }
      }

      // Soft drop shadow behind the note
      if (a === 0) {
        const shOff = 4;
        const sNL = noteL + shOff, sNT = noteT + shOff;
        const sNR = noteR + shOff, sNB = noteB + shOff;
        if (x >= sNL && x <= sNR && y >= sNT && y <= sNB) {
          const edgeDist = Math.min(x - sNL, sNR - x, y - sNT, sNB - y);
          if (edgeDist >= 0) {
            const shadowAlpha = Math.min(40, edgeDist * 8);
            r = 0; g = 0; b = 0; a = shadowAlpha;
          }
        }
      }

      pixels[idx]     = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
      pixels[idx + 3] = a;
    }
  }
  return pixels;
}

// ── PNG encoder (minimal, using built-in zlib) ──
function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const typeB = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([typeB, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(pixels, w, h) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // IDAT — filter type 0 (none) for each row
  const rawRows = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    rawRows[y * (1 + w * 4)] = 0; // filter byte
    pixels.copy(rawRows, y * (1 + w * 4) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const compressed = zlib.deflateSync(rawRows, { level: 9 });

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── ICO encoder ──
function encodeICO(pngBuf) {
  // ICO header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);   // reserved
  header.writeUInt16LE(1, 2);   // type: icon
  header.writeUInt16LE(1, 4);   // 1 image

  // Directory entry: 16 bytes
  const entry = Buffer.alloc(16);
  entry[0] = 0;     // width (0 = 256)
  entry[1] = 0;     // height (0 = 256)
  entry[2] = 0;     // color palette
  entry[3] = 0;     // reserved
  entry.writeUInt16LE(1, 4);    // color planes
  entry.writeUInt16LE(32, 6);   // bits per pixel
  entry.writeUInt32LE(pngBuf.length, 8);   // size of PNG data
  entry.writeUInt32LE(6 + 16, 12);         // offset to PNG data

  return Buffer.concat([header, entry, pngBuf]);
}

// ── Main ──
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

console.log('Generating 256x256 icon...');
const pixels = generatePixels();
const pngBuf = encodePNG(pixels, SIZE, SIZE);
const icoBuf = encodeICO(pngBuf);

fs.writeFileSync(path.join(OUT_DIR, 'icon.png'), pngBuf);
fs.writeFileSync(path.join(OUT_DIR, 'icon.ico'), icoBuf);
console.log(`Wrote build/icon.png (${pngBuf.length} bytes)`);
console.log(`Wrote build/icon.ico (${icoBuf.length} bytes)`);
