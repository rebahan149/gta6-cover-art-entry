// Golden Hour Cover Studio: the cover renderer.
//
// Everything the exported PNG shows is drawn here, in cover coordinates, by drawCoverArt: a multi-panel layout of
// the maker's own photos (one photo spanning every panel, or a photo per panel, each cropped by its own zoom and
// offset), a Vice City colour grade, bold display lettering for the caption, an optional studio seal and billing
// line. The editor (main.js) and the screenshot scenes (shots.js) both render through this one function, so what
// the maker sees is exactly what exports.

/** The three post sizes the studio exports, as [width, height]. */
export const POST_SIZES = [
  [1080, 1080],
  [1080, 1350],
  [1920, 1080],
];

/** Colour grades: a canvas filter for the photos, an overlay wash, and the mood name shown in the editor. */
export const GRADES = [
  {
    id: 'vice', name: 'Vice Sunset',
    filter: 'saturate(1.35) contrast(1.08) brightness(1.03)',
    wash: [[0, 'rgba(255, 138, 61, 0.10)'], [0.55, 'rgba(255, 62, 130, 0.10)'], [1, 'rgba(64, 14, 110, 0.28)']],
  },
  {
    id: 'neon', name: 'Neon Nights',
    filter: 'saturate(1.55) contrast(1.16) hue-rotate(-10deg)',
    wash: [[0, 'rgba(0, 229, 255, 0.10)'], [0.6, 'rgba(255, 0, 170, 0.10)'], [1, 'rgba(8, 0, 40, 0.34)']],
  },
  {
    id: 'golden', name: 'Golden Hour',
    filter: 'sepia(0.32) saturate(1.30) contrast(1.05) brightness(1.04)',
    wash: [[0, 'rgba(255, 190, 60, 0.12)'], [1, 'rgba(120, 40, 0, 0.22)']],
  },
  {
    id: 'teal', name: 'Midnight Teal',
    filter: 'saturate(1.12) contrast(1.12) hue-rotate(14deg)',
    wash: [[0, 'rgba(0, 90, 110, 0.14)'], [1, 'rgba(0, 10, 30, 0.36)']],
  },
  {
    id: 'ink', name: 'Poster Ink',
    filter: 'grayscale(1) contrast(1.28) brightness(1.02)',
    wash: [[0, 'rgba(255, 120, 60, 0.06)'], [1, 'rgba(0, 0, 0, 0.30)']],
  },
  { id: 'none', name: 'No Grade', filter: '', wash: [] },
];

/** Title gradient styles for the caption lettering. */
export const TITLE_STYLES = {
  sunset: ['#fff6b7', '#ffc44d', '#ff5e7a', '#c44dff'],
  chrome: ['#ffffff', '#cfd6e4', '#7d8aa5', '#f4f7ff'],
  neon: ['#a8fff4', '#2ee6ff', '#ff4fd8', '#7a2bff'],
};

const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

/** Panel layouts. Each builder returns polygons in cover coordinates; panels are drawn full-bleed with white
 *  separators, the classic poster-collage look. */
export const LAYOUTS = [
  {
    id: 'hero', name: 'Hero Strip',
    build(w, h) {
      const heroH = h * 0.56, cellW = w / 3;
      return [rect(0, 0, w, heroH),
        rect(0, heroH, cellW, h - heroH), rect(cellW, heroH, cellW, h - heroH), rect(2 * cellW, heroH, cellW, h - heroH)];
    },
  },
  {
    id: 'grid', name: 'Comic Grid',
    build(w, h) {
      const rowH = h * 0.34, colW = w / 2;
      return [rect(0, 0, colW, rowH), rect(colW, 0, colW, rowH),
        rect(0, rowH, colW, rowH), rect(colW, rowH, colW, rowH),
        rect(0, 2 * rowH, w, h - 2 * rowH)];
    },
  },
  {
    id: 'slant', name: 'Slanted',
    build(w, h) {
      const rowH = h * 0.60, lean = w * 0.07, cellW = w / 3;
      // Dividers lean left as they drop; the last panel's top corner reaches past the right edge so its slanted
      // side lands exactly on the corner and no background wedge shows.
      const quad = (i) => {
        const x0 = i * cellW, x1 = (i + 1) * cellW + (i === 2 ? lean : 0);
        return [[x0, 0], [x1, 0], [x1 - lean, rowH], [x0 - lean, rowH]];
      };
      return [quad(0), quad(1), quad(2), rect(0, rowH, w, h - rowH)];
    },
  },
  {
    id: 'mosaic', name: 'Mosaic',
    build(w, h) {
      const leftW = w * 0.44, topH = h * 0.68;
      return [rect(0, 0, leftW, topH),
        rect(leftW, 0, w - leftW, topH / 2), rect(leftW, topH / 2, w - leftW, topH / 2),
        rect(0, topH, w, h - topH)];
    },
  },
];

/** Builds the panels of a layout at a cover size: polygon, bounding box, centre and a Path2D each. */
export function buildPanelLayout(layoutId, w, h) {
  const layout = LAYOUTS.find((l) => l.id === layoutId) ?? LAYOUTS[0];
  return layout.build(w, h).map((points) => {
    const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
    const bbox = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    const path = new Path2D();
    points.forEach(([x, y], i) => (i === 0 ? path.moveTo(x, y) : path.lineTo(x, y)));
    path.closePath();
    return { points, bbox, cx: bbox.x + bbox.w / 2, cy: bbox.y + bbox.h / 2, path };
  });
}

/** Ray-casting point-in-polygon, for clicking a panel in the editor. */
export function pointInPanel(panel, x, y) {
  const pts = panel.points;
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** The cover-fit rectangle of an image inside a target box, with the maker's zoom and offset applied. Offsets are
 *  fractions of the box size, so 0.1 pans by a tenth of the panel. */
function fitImageRect(img, box, zoom, ox, oy) {
  const scale = Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
  let x = box.x + (box.w - dw) / 2 + ox * box.w;
  let y = box.y + (box.h - dh) / 2 + oy * box.h;
  // An offset slides the crop but never opens a gap: the photo always covers its box.
  x = Math.min(box.x, Math.max(box.x + box.w - dw, x));
  y = Math.min(box.y, Math.max(box.y + box.h - dh, y));
  return { x, y, w: dw, h: dh };
}

/** A drawn sunset scene for a panel with no photo yet: gradient sky, sun disc and palm silhouettes. */
function paintEmptyPanel(ctx, panel, grade) {
  const { bbox } = panel;
  ctx.save();
  ctx.clip(panel.path);
  const sky = ctx.createLinearGradient(0, bbox.y, 0, bbox.y + bbox.h);
  sky.addColorStop(0, '#3a1c5e');
  sky.addColorStop(0.55, '#b83280');
  sky.addColorStop(1, '#ff8a3d');
  ctx.fillStyle = sky;
  ctx.fillRect(bbox.x, bbox.y, bbox.w, bbox.h);
  const sunR = Math.min(bbox.w, bbox.h) * 0.20;
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath();
  ctx.arc(panel.cx, bbox.y + bbox.h * 0.62, sunR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(20, 6, 34, 0.9)';
  ctx.fillRect(bbox.x, bbox.y + bbox.h * 0.62, bbox.w, bbox.h * 0.38);
  // Palm silhouettes: a leaning trunk and five fronds, drawn from the panel's lower corner.
  const px = bbox.x + bbox.w * 0.16, py = bbox.y + bbox.h;
  const topX = px + bbox.w * 0.10, topY = py - bbox.h * 0.52;
  ctx.strokeStyle = 'rgba(16, 4, 28, 0.95)';
  ctx.lineWidth = Math.max(3, bbox.w * 0.016);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.quadraticCurveTo(px + bbox.w * 0.02, py - bbox.h * 0.3, topX, topY);
  ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (0.08 + i * 0.21);
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(a) * bbox.w * 0.16, topY - Math.sin(a) * bbox.h * 0.10 - bbox.h * 0.05,
      topX + Math.cos(a) * bbox.w * 0.26, topY - Math.sin(a) * bbox.h * 0.06 + bbox.h * 0.05);
    ctx.stroke();
  }
  ctx.restore();
}

/** Wraps the caption into at most two balanced lines that fit maxWidth, shrinking from startSize. */
function wrapTitleLines(ctx, text, maxWidth, startSize) {
  const words = text.split(/\s+/).filter(Boolean);
  let size = startSize;
  const fits = (lines) => lines.every((line) => ctx.measureText(line).width <= maxWidth);
  while (size > 14) {
    ctx.font = `${size}px Anton, sans-serif`;
    if (words.length === 1) {
      if (fits(words)) return { lines: words, size };
    } else {
      // Try every split point and keep the most balanced one that fits.
      let best = null;
      for (let i = 1; i < words.length; i++) {
        const lines = [words.slice(0, i).join(' '), words.slice(i).join(' ')];
        if (fits(lines)) {
          const imbalance = Math.abs(ctx.measureText(lines[0]).width - ctx.measureText(lines[1]).width);
          if (!best || imbalance < best.imbalance) best = { lines, imbalance };
        }
      }
      if (best) return { lines: best.lines, size };
      if (fits([text])) return { lines: [text], size };
    }
    size -= 4;
  }
  ctx.font = `${size}px Anton, sans-serif`;
  return { lines: [text], size };
}

/** Letters the caption across the cover: gradient-filled Anton capitals with a dark outline and a soft shadow.
 *  Returns the height of the block drawn, so the billing line can sit clear of it. */
function letterTitle(ctx, w, h, art, grade) {
  const text = (art.caption ?? '').trim().toUpperCase();
  if (!text) return 0;
  const stops = TITLE_STYLES[art.titleStyle] ?? TITLE_STYLES.sunset;
  const startSize = h * 0.135 * (art.titleScale ?? 1);
  const { lines, size } = wrapTitleLines(ctx, text, w * 0.92, startSize);
  const lineHeight = size * 1.04;
  const blockH = lineHeight * lines.length;
  // Bottom titles sit on a baseline near the foot and stack upward; top titles hang from the top edge.
  const lastBaseline = art.titlePos === 'top' ? h * 0.055 + size + (lines.length - 1) * lineHeight : h - h * 0.075;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  try { ctx.letterSpacing = `${Math.round(size * 0.01)}px`; } catch { /* older canvas: spacing is a nicety */ }
  lines.forEach((line, i) => {
    const yy = lastBaseline - (lines.length - 1 - i) * lineHeight;
    const grad = ctx.createLinearGradient(0, yy - size, 0, yy + size * 0.18);
    stops.forEach((c, j) => grad.addColorStop(j / (stops.length - 1), c));
    ctx.font = `${size}px Anton, sans-serif`;
    ctx.shadowColor = 'rgba(12, 0, 26, 0.55)';
    ctx.shadowBlur = size * 0.16;
    ctx.shadowOffsetY = size * 0.05;
    ctx.lineWidth = size * 0.075;
    ctx.strokeStyle = '#22103a';
    ctx.lineJoin = 'round';
    ctx.strokeText(line, w / 2, yy);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = grad;
    ctx.fillText(line, w / 2, yy);
  });
  ctx.restore();
  return blockH;
}

/** The studio seal: an original gold-ring badge with a star and the studio's name lettered around the rim. */
export function drawStudioSeal(ctx, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#1d0b31';
  ctx.fill();
  ctx.lineWidth = r * 0.10;
  ctx.strokeStyle = '#ffd76a';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
  ctx.lineWidth = r * 0.035;
  ctx.strokeStyle = 'rgba(255, 215, 106, 0.75)';
  ctx.stroke();
  // Five-pointed star at the centre.
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r * 0.34 : r * 0.145;
    const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffd76a';
  ctx.fill();
  // Rim lettering.
  ctx.fillStyle = '#ffe9a8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const letter = (word, from, to, flip) => {
    ctx.font = `${r * 0.185}px Anton, sans-serif`;
    [...word].forEach((ch, i) => {
      const a = from + ((to - from) * (i + 0.5)) / word.length;
      ctx.save();
      ctx.translate(cx + Math.cos(a) * r * 0.885, cy + Math.sin(a) * r * 0.885);
      ctx.rotate(a + (flip ? -Math.PI / 2 : Math.PI / 2));
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    });
  };
  letter('GOLDEN HOUR', Math.PI * 1.08, Math.PI * 1.92, false);
  letter('COVER STUDIO', Math.PI * 0.62, Math.PI * 0.08, true);
  ctx.restore();
}

/** The billing line: small letterspaced capitals along the foot of the cover, movie-poster style. */
function letterBilling(ctx, w, h, art, titleBlockH) {
  const text = (art.billing ?? '').trim().toUpperCase();
  if (!text || !art.showBilling) return;
  ctx.save();
  // Letterspaced capitals run wide: shrink from the house size until the line fits inside the cover.
  let size = Math.max(13, h * 0.021);
  const setFont = () => {
    ctx.font = `600 ${size}px system-ui, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(size * 0.22)}px`; } catch { /* spacing unsupported: text still reads */ }
  };
  setFont();
  while (size > 9 && ctx.measureText(text).width > w * 0.94) { size -= 1; setFont(); }
  ctx.textAlign = 'center';
  const y = h - h * 0.028;
  ctx.shadowColor = 'rgba(10, 0, 22, 0.8)';
  ctx.shadowBlur = size * 0.5;
  ctx.fillStyle = 'rgba(255, 244, 214, 0.92)';
  ctx.fillText(text, w / 2, y);
  ctx.restore();
}

/**
 * Draws the whole cover onto ctx at w x h.
 * art: { layout, grade, caption, billing, showBilling, showSeal, titlePos, titleStyle, titleScale,
 *        span: null | {photo, zoom, ox, oy}, panels: [{photo, zoom, ox, oy}] }
 * photos: array of images (naturalWidth/naturalHeight). options: { highlight: panel index or -1 } (editor only).
 */
export function drawCoverArt(ctx, w, h, art, photos, options = {}) {
  const grade = GRADES.find((g) => g.id === art.grade) ?? GRADES[0];
  const panels = buildPanelLayout(art.layout, w, h);
  // Attach each panel's slot by index for paintPanel.
  const withSlots = panels.map((p, i) => Object.assign(p, { slotIndex: i }));
  art.panels.forEach((slot, i) => { if (withSlots[i]) withSlots[i].slot = slot; });

  ctx.fillStyle = '#160a26';
  ctx.fillRect(0, 0, w, h);
  const border = Math.max(5, w * 0.0075);
  for (const panel of withSlots) paintPanelSlot(ctx, panel, art, photos, grade, border);
  // Grade wash and vignette over the whole collage.
  if (grade.wash.length) {
    const wash = ctx.createLinearGradient(0, 0, 0, h);
    grade.wash.forEach(([stop, colour]) => wash.addColorStop(stop, colour));
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);
  }
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
  vig.addColorStop(0, 'rgba(8, 0, 18, 0)');
  vig.addColorStop(1, 'rgba(8, 0, 18, 0.30)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  if (art.showSeal) drawStudioSeal(ctx, w - w * 0.085, h * 0.085 + (art.titlePos === 'top' ? h * 0.16 : 0), Math.min(w, h) * 0.062);
  const titleH = letterTitle(ctx, w, h, art, grade);
  letterBilling(ctx, w, h, art, titleH);

  if (options.highlight >= 0 && withSlots[options.highlight]) {
    ctx.save();
    ctx.setLineDash([16, 11]);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#ffd76a';
    ctx.stroke(withSlots[options.highlight].path);
    ctx.restore();
  }
  return panels;
}

/** Paints one panel using its pre-attached slot (kept separate so drawCoverArt stays readable). */
function paintPanelSlot(ctx, panel, art, photos, grade, border) {
  const span = art.span;
  const slot = panel.slot ?? { photo: -1, zoom: 1, ox: 0, oy: 0 };
  ctx.save();
  ctx.clip(panel.path);
  if (span && photos[span.photo]) {
    const img = photos[span.photo];
    const r = fitImageRect(img, { x: 0, y: 0, w: ctx.canvas.width, h: ctx.canvas.height }, span.zoom, span.ox, span.oy);
    ctx.filter = grade.filter || 'none';
    ctx.drawImage(img, r.x, r.y, r.w, r.h);
    ctx.filter = 'none';
  } else if (photos[slot.photo]) {
    const img = photos[slot.photo];
    const r = fitImageRect(img, panel.bbox, slot.zoom, slot.ox, slot.oy);
    ctx.filter = grade.filter || 'none';
    ctx.drawImage(img, r.x, r.y, r.w, r.h);
    ctx.filter = 'none';
  } else {
    paintEmptyPanel(ctx, panel, grade);
  }
  const shade = ctx.createLinearGradient(0, panel.bbox.y, 0, panel.bbox.y + panel.bbox.h);
  shade.addColorStop(0, 'rgba(10, 0, 24, 0.20)');
  shade.addColorStop(0.25, 'rgba(10, 0, 24, 0)');
  shade.addColorStop(0.8, 'rgba(10, 0, 24, 0)');
  shade.addColorStop(1, 'rgba(10, 0, 24, 0.22)');
  ctx.fillStyle = shade;
  ctx.fillRect(panel.bbox.x, panel.bbox.y, panel.bbox.w, panel.bbox.h);
  ctx.restore();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = border;
  ctx.lineJoin = 'round';
  ctx.stroke(panel.path);
}
