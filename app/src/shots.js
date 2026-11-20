// Fixed scenes for the entry's screenshots. shots.json names each shot as a query on the app:
//   ?shot=cover&photo=pier&caption=Sunset%20Heist    the cover alone, filling the frame
//   ?shot=editor&photo=boulevard&caption=...        the editor with a cover composed in it
// `photo` picks the bundled sample (samples/<photo>.jpg), `caption` the title, and optional `layout`, `grade`
// and `size=wide` params vary the scene. window.__shotReady is set once the scene is painted with the display
// font loaded, so the screenshot waits for the real lettering.
export async function runShot(query, api) {
  const shot = query.get('shot');
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await api.prepareScene(shot, query);
  await document.fonts.ready;
  api.redraw(shot !== 'cover');
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
