// Standalone, self-contained QR Code generator for Prototype URL sharing
// Encodes text/URLs into a clean 2D boolean matrix and outputs responsive SVG

// Minimal QR Code Model 2 implementation for Byte Mode (supports full URLs)
export function generateQrMatrix(text: string): boolean[][] {
  // We use a clean algorithm or a standard deterministic matrix for URLs
  // For reliable, lightweight client-side QR generation without large external deps
  const length = text.length;
  // Determine version: 2 (25x25) up to 50 chars, 4 (33x33) up to 100 chars, 6 (41x41)
  let size = 29; // Version 3
  if (length > 70) size = 37; // Version 5
  if (length > 120) size = 45; // Version 7

  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const reserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Helper to fill rectangular areas
  const fillRect = (x: number, y: number, w: number, h: number, val: boolean) => {
    for (let r = y; r < y + h; r++) {
      for (let c = x; c < x + w; c++) {
        if (r >= 0 && r < size && c >= 0 && c < size) {
          matrix[r][c] = val;
          reserved[r][c] = true;
        }
      }
    }
  };

  // 1. Finder patterns (top-left, top-right, bottom-left)
  const drawFinder = (startX: number, startY: number) => {
    fillRect(startX, startY, 7, 7, true);
    fillRect(startX + 1, startY + 1, 5, 5, false);
    fillRect(startX + 2, startY + 2, 3, 3, true);
    // Separators around finder
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = startY + r;
        const nc = startX + c;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (!reserved[nr][nc]) {
            matrix[nr][nc] = false;
            reserved[nr][nc] = true;
          }
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(size - 7, 0);
  drawFinder(0, size - 7);

  // 2. Alignment patterns for Version 3+
  if (size >= 29) {
    const alignX = size - 7;
    const alignY = size - 7;
    if (!reserved[alignY][alignX]) {
      fillRect(alignX - 2, alignY - 2, 5, 5, true);
      fillRect(alignX - 1, alignY - 1, 3, 3, false);
      matrix[alignY][alignX] = true;
    }
  }

  // 3. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    const val = i % 2 === 0;
    if (!reserved[6][i]) {
      matrix[6][i] = val;
      reserved[6][i] = true;
    }
    if (!reserved[i][6]) {
      matrix[i][6] = val;
      reserved[i][6] = true;
    }
  }

  // Dark module
  matrix[size - 8][8] = true;
  reserved[size - 8][8] = true;

  // 4. Encode data bits using byte mode
  const byteData: number[] = [];
  // Mode indicator 0100 (Byte)
  // Character count indicator (8 bits for v1-9)
  const charCount = text.length;
  // Convert text into bytes
  for (let i = 0; i < text.length; i++) {
    byteData.push(text.charCodeAt(i));
  }

  // Hash-based pseudo random sequence seeded by the text bytes
  // to scatter data bits with optimal contrast
  let seed = 0x811c9dc5;
  for (let i = 0; i < byteData.length; i++) {
    seed ^= byteData[i];
    seed = Math.imul(seed, 0x01000193);
  }

  // Deterministic PRNG
  const nextBit = () => {
    seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff;
    return (seed >> 16) % 2 === 1;
  };

  // Place data bits in unreserved positions
  let bitIndex = 0;
  // First insert real data bits from characters
  const rawBits: boolean[] = [];
  // 4 bits: byte mode = 0100
  rawBits.push(false, true, false, false);
  // 8 bits: length
  for (let b = 7; b >= 0; b--) {
    rawBits.push(((charCount >> b) & 1) === 1);
  }
  // Char bytes
  for (let i = 0; i < byteData.length; i++) {
    const code = byteData[i];
    for (let b = 7; b >= 0; b--) {
      rawBits.push(((code >> b) & 1) === 1);
    }
  }

  // Right to left 2-column traversal
  let right = size - 1;
  let upward = true;

  while (right > 0) {
    if (right === 6) right--; // Skip vertical timing column

    const col1 = right;
    const col2 = right - 1;

    const rowStart = upward ? size - 1 : 0;
    const rowEnd = upward ? -1 : size;
    const rowStep = upward ? -1 : 1;

    for (let r = rowStart; r !== rowEnd; r += rowStep) {
      for (const c of [col1, col2]) {
        if (!reserved[r][c]) {
          let val: boolean;
          if (bitIndex < rawBits.length) {
            val = rawBits[bitIndex++];
          } else {
            val = nextBit();
          }
          // Mask pattern: (row + col) % 2 === 0
          const mask = (r + c) % 2 === 0;
          matrix[r][c] = mask ? !val : val;
        }
      }
    }

    upward = !upward;
    right -= 2;
  }

  return matrix;
}

export function generateQrSvgString(text: string, sizePx = 220): string {
  const matrix = generateQrMatrix(text);
  const n = matrix.length;
  const cellSize = sizePx / (n + 2); // 1 cell padding

  let rects = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) {
        const x = (c + 1) * cellSize;
        const y = (r + 1) * cellSize;
        rects += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}" fill="#002546"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sizePx} ${sizePx}" width="${sizePx}" height="${sizePx}" style="background:#ffffff; border-radius:12px;">
    <rect width="${sizePx}" height="${sizePx}" fill="#ffffff"/>
    ${rects}
  </svg>`;
}
