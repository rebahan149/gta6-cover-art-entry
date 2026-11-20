// Golden Hour Cover Studio: the editor.
//
// Wires the page to the renderer in cover.js. The maker adds photos (read locally, never uploaded), places them
// into the cover's panels or spans one across all of them, crops the selected panel by dragging, scrolling or
// the zoom slider, picks a layout and a colour grade, letters a caption, and exports a PNG at a post size.
// A ?shot= query instead sets up a fixed scene for the entry's screenshots (./shots.js).
import { POST_SIZES, GRADES, LAYOUTS, TITLE_STYLES, buildPanelLayout, pointInPanel, drawCoverArt } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('stage-canvas');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const tray = document.getElementById('photo-tray');
const zoomRange = document.getElementById('zoom-range');

/** The whole studio state: the photos on the tray and the cover being made (art is cover.js's shape). */
export const studio = {
  photos: [], // { img, url, name }
  selectedPhoto: -1,
  selectedPanel: 0,
  sizeIndex: 0,
  art: {
    layout: 'hero',
    grade: 'vice',
    caption: 'Sunset Heist',
    billing: 'Starring you · Shot on location · A Golden Hour production',
    showBilling: true,
    showSeal: true,
    titlePos: 'bottom',
    titleStyle: 'sunset',
    titleScale: 1,
    span: null,
    panels: [],
  },
};

const currentSize = () => POST_SIZES[studio.sizeIndex];
const photoImages = () => studio.photos.map((p) => p.img);

/** Keeps art.panels as long as the current layout at the current size, preserving crops already made. */
export function ensurePanels() {
  const [w, h] = currentSize();
  const count = buildPanelLayout(studio.art.layout, w, h).length;
  while (studio.art.panels.length < count) studio.art.panels.push({ photo: -1, zoom: 1, ox: 0, oy: 0 });
  studio.art.panels.length = count;
  if (studio.selectedPanel >= count) studio.selectedPanel = 0;
}

/** Repaints the preview canvas at the current post size. */
export function redraw(highlight = true) {
  ensurePanels();
  const [w, h] = currentSize();
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  drawCoverArt(ctx, w, h, studio.art, photoImages(), { highlight: highlight ? studio.selectedPanel : -1 });
  syncZoomSlider();
}

/** Loads an image from a URL (a local file's object URL, or a bundled sample), resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Adds a loaded photo to the tray, selects it, and places it in the first empty panel if there is one. */
export function addPhoto(img, url, name) {
  studio.photos.push({ img, url, name });
  studio.selectedPhoto = studio.photos.length - 1;
  ensurePanels();
  if (studio.art.span) {
    studio.art.span.photo = studio.selectedPhoto;
  } else {
    const empty = studio.art.panels.findIndex((s) => s.photo < 0);
    const target = empty >= 0 ? empty : studio.selectedPanel;
    studio.art.panels[target].photo = studio.selectedPhoto;
    studio.selectedPanel = target;
  }
  renderTray();
  redraw();
  status.textContent = `${name} is on the cover. Drag on the cover to crop it.`;
}

/** Rebuilds the photo tray thumbnails, marking the selected photo. */
function renderTray() {
  tray.replaceChildren();
  studio.photos.forEach((photo, i) => {
    const figure = document.createElement('figure');
    if (i === studio.selectedPhoto) figure.className = 'selected';
    const img = document.createElement('img');
    img.src = photo.url;
    img.alt = photo.name;
    img.title = `Place ${photo.name}`;
    img.addEventListener('click', () => {
      studio.selectedPhoto = i;
      if (studio.art.span) studio.art.span.photo = i;
      renderTray();
      redraw();
    });
    const caption = document.createElement('figcaption');
    caption.textContent = photo.name;
    figure.append(img, caption);
    tray.append(figure);
  });
}

/** Builds a row of toggle chips (layout, grade, title style, post size) into a container. */
function buildChips(containerId, items, getCurrent, onPick) {
  const row = document.getElementById(containerId);
  row.replaceChildren();
  items.forEach((item) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = item.label;
    chip.setAttribute('aria-pressed', String(getCurrent() === item.id));
    chip.addEventListener('click', () => {
      onPick(item.id);
      buildChips(containerId, items, getCurrent, onPick);
      redraw();
    });
    row.append(chip);
  });
}

function buildAllChips() {
  buildChips('layout-row', LAYOUTS.map((l) => ({ id: l.id, label: l.name })),
    () => studio.art.layout, (id) => { studio.art.layout = id; ensurePanels(); });
  buildChips('grade-row', GRADES.map((g) => ({ id: g.id, label: g.name })),
    () => studio.art.grade, (id) => { studio.art.grade = id; });
  buildChips('title-style-row', Object.entries(TITLE_STYLES).map(([id, stops]) => ({ id, label: `${id[0].toUpperCase()}${id.slice(1)} title` })),
    () => studio.art.titleStyle, (id) => { studio.art.titleStyle = id; });
  buildChips('size-row', POST_SIZES.map(([w, h], i) => ({ id: i, label: `${w} × ${h}` })),
    () => studio.sizeIndex, (id) => {
      studio.sizeIndex = id;
      document.getElementById('export-button').textContent = `Export PNG · ${POST_SIZES[id][0]} × ${POST_SIZES[id][1]}`;
    });
}

/** The crop target the drag, wheel and slider all edit: the spanning photo, or the selected panel's slot. */
function cropTarget() {
  if (studio.art.span) return studio.art.span;
  ensurePanels();
  return studio.art.panels[studio.selectedPanel];
}

function syncZoomSlider() {
  const target = cropTarget();
  if (target) zoomRange.value = String(Math.round(target.zoom * 100));
}

// --- Photo adding: the file picker and the two bundled samples. -------------------------------
document.getElementById('photo-input').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    const url = URL.createObjectURL(file);
    addPhoto(await loadImage(url), url, file.name.replace(/\.[^.]+$/, ''));
  }
  e.target.value = '';
});
async function addSample(which, label) {
  const url = `samples/${which}.jpg`;
  addPhoto(await loadImage(url), url, label);
}
document.getElementById('sample-pier').addEventListener('click', () => addSample('pier', 'Pier sample'));
document.getElementById('sample-boulevard').addEventListener('click', () => addSample('boulevard', 'Boulevard sample'));

// --- Span mode: one photo sliced continuously across every panel. ------------------------------
document.getElementById('span-button').addEventListener('click', () => {
  if (studio.selectedPhoto < 0) { status.textContent = 'Add or select a photo first, then span it.'; return; }
  studio.art.span = { photo: studio.selectedPhoto, zoom: 1, ox: 0, oy: 0 };
  document.getElementById('span-button').hidden = true;
  document.getElementById('unspan-button').hidden = false;
  status.textContent = 'One photo now spans every panel. Drag on the cover to move it.';
  redraw();
});
document.getElementById('unspan-button').addEventListener('click', () => {
  studio.art.span = null;
  document.getElementById('span-button').hidden = false;
  document.getElementById('unspan-button').hidden = true;
  redraw();
});

// --- Caption and lettering controls. -----------------------------------------------------------
const captionInput = document.getElementById('caption-input');
captionInput.addEventListener('input', () => { studio.art.caption = captionInput.value; redraw(); });
const billingInput = document.getElementById('billing-input');
billingInput.addEventListener('input', () => { studio.art.billing = billingInput.value; redraw(); });
document.getElementById('title-pos').addEventListener('change', (e) => { studio.art.titlePos = e.target.value; redraw(); });
document.getElementById('title-size').addEventListener('input', (e) => { studio.art.titleScale = Number(e.target.value) / 100; redraw(); });
document.getElementById('seal-toggle').addEventListener('change', (e) => { studio.art.showSeal = e.target.checked; redraw(); });
document.getElementById('billing-toggle').addEventListener('change', (e) => { studio.art.showBilling = e.target.checked; redraw(); });

// --- Panel cropping: click to select and place, drag to pan, wheel and slider to zoom. ---------
function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const [w, h] = currentSize();
  return { x: ((event.clientX - rect.left) / rect.width) * w, y: ((event.clientY - rect.top) / rect.height) * h };
}

let drag = null;
canvas.addEventListener('pointerdown', (event) => {
  const point = canvasPoint(event);
  const [w, h] = currentSize();
  const panels = buildPanelLayout(studio.art.layout, w, h);
  const hit = panels.findIndex((panel) => pointInPanel(panel, point.x, point.y));
  if (hit >= 0) {
    studio.selectedPanel = hit;
    ensurePanels();
    if (!studio.art.span && studio.selectedPhoto >= 0 && studio.art.panels[hit].photo !== studio.selectedPhoto) {
      studio.art.panels[hit].photo = studio.selectedPhoto;
      status.textContent = `${studio.photos[studio.selectedPhoto].name} placed in panel ${hit + 1}.`;
    }
  }
  drag = { x: point.x, y: point.y };
  canvas.setPointerCapture(event.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const point = canvasPoint(event);
  const [w, h] = currentSize();
  const target = cropTarget();
  if (studio.art.span) {
    target.ox += (point.x - drag.x) / w;
    target.oy += (point.y - drag.y) / h;
  } else {
    const panel = buildPanelLayout(studio.art.layout, w, h)[studio.selectedPanel];
    target.ox += (point.x - drag.x) / panel.bbox.w;
    target.oy += (point.y - drag.y) / panel.bbox.h;
  }
  drag = point;
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  const target = cropTarget();
  target.zoom = Math.min(3.2, Math.max(1, target.zoom * (event.deltaY < 0 ? 1.06 : 0.94)));
  redraw();
}, { passive: false });
zoomRange.addEventListener('input', () => {
  cropTarget().zoom = Number(zoomRange.value) / 100;
  redraw();
});
document.getElementById('reset-panel').addEventListener('click', () => {
  Object.assign(cropTarget(), { zoom: 1, ox: 0, oy: 0 });
  redraw();
});

// --- Export: render the current size clean (no selection outline) and download the PNG. --------
document.getElementById('export-button').addEventListener('click', () => {
  const [w, h] = currentSize();
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  drawCoverArt(out.getContext('2d'), w, h, studio.art, photoImages(), { highlight: -1 });
  out.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `golden-hour-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    status.textContent = `Saved golden-hour-cover-${w}x${h}.png`;
  }, 'image/png');
});

// --- Start: wire the chips, paint the starter scene, then let a ?shot= scene take over. --------
buildAllChips();
ensurePanels();
redraw();
document.fonts.ready.then(() => redraw());

/** Sets up a screenshot scene: loads the named sample(s) and arranges them as the scene describes. */
async function prepareScene(shot, query) {
  const caption = query.get('caption') ?? 'Sunset Heist';
  studio.art.caption = caption;
  captionInput.value = caption;
  const sample = query.get('photo') ?? 'pier';
  if (query.get('size') === 'wide') studio.sizeIndex = 2;
  if (shot === 'cover' && query.get('mode') === 'panels') {
    // A per-panel scene (the wide shot): each panel crops its own photo, which frames better in 16:9.
    const first = await loadImage(`samples/${sample}.jpg`);
    const other = sample === 'pier' ? 'boulevard' : 'pier';
    const second = await loadImage(`samples/${other}.jpg`);
    studio.photos.push(
      { img: first, url: `samples/${sample}.jpg`, name: sample },
      { img: second, url: `samples/${other}.jpg`, name: other },
    );
    studio.selectedPhoto = 0;
    studio.art.layout = query.get('layout') ?? 'mosaic';
    studio.art.grade = query.get('grade') ?? 'neon';
    ensurePanels();
    studio.art.panels[0].photo = 0;
    studio.art.panels[1].photo = 1;
    studio.art.panels[1].zoom = 1.1;
    studio.art.panels[1].ox = 0.08;
    studio.art.panels[2].photo = 1;
    studio.art.panels[2].zoom = 1.8;
    studio.art.panels[2].oy = 2.6;
    studio.art.panels[3].photo = 1;
    studio.art.panels[3].oy = -0.05;
    studio.art.panels[3].ox = -0.15;
  } else if (shot === 'cover') {
    const img = await loadImage(`samples/${sample}.jpg`);
    studio.photos.push({ img, url: `samples/${sample}.jpg`, name: sample });
    studio.selectedPhoto = 0;
    studio.art.layout = query.get('layout') ?? (query.get('size') === 'wide' ? 'mosaic' : 'slant');
    studio.art.grade = query.get('grade') ?? (query.get('size') === 'wide' ? 'neon' : 'vice');
    studio.art.span = { photo: 0, zoom: 1, ox: 0, oy: 0 };
    document.getElementById('span-button').hidden = true;
    document.getElementById('unspan-button').hidden = false;
  } else {
    const first = await loadImage(`samples/${sample}.jpg`);
    const other = sample === 'pier' ? 'boulevard' : 'pier';
    const second = await loadImage(`samples/${other}.jpg`);
    studio.photos.push(
      { img: first, url: `samples/${sample}.jpg`, name: sample },
      { img: second, url: `samples/${other}.jpg`, name: other },
    );
    studio.selectedPhoto = 0;
    studio.art.layout = 'hero';
    ensurePanels();
    studio.art.panels[0].photo = 0;
    studio.art.panels[1].photo = 1;
    studio.art.panels[2].photo = 0;
    studio.art.panels[3].photo = 1;
    studio.art.panels[2].ox = 0.12;
    studio.art.panels[3].zoom = 1.25;
    studio.selectedPanel = 0;
  }
  buildAllChips();
  renderTray();
}

const shotQuery = new URLSearchParams(location.search);
if (shotQuery.get('shot')) runShot(shotQuery, { prepareScene, redraw });
