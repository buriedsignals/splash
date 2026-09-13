// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field:
//   marker   the thick pale 2015 bars, and the 2015 name              0..1
//   measure  the thin saturated 2024 bars, and the 2024 name          0..1
//   verdict  every row's change in points                             0..1
//
// THE TWO STATE NAMES ARE SEATED IN THE READER'S OWN PIXELS, on the first paint and after every resize.
// The 2015 name ends where its bar ends; when that would run past the track's own start it starts at
// the track instead. The 2024 name starts where its bar ends; when it would touch the 2015 name it
// takes a line of its own above — on a phone the two marks are thirty pixels apart.

export function applyBulletState(root, state, context) {
  if (context.resized) seatBulletKey(root);
  for (const bar of root.querySelectorAll('[data-part="marker"]')) bar.style.transform = `translateY(-50%) scaleX(${state.marker})`;
  for (const bar of root.querySelectorAll('[data-part="measure"]')) bar.style.transform = `translateY(-50%) scaleX(${state.measure})`;
  const set = (name, value) => {
    for (const node of root.querySelectorAll(`[data-part="${name}"]`)) node.style.opacity = String(value);
  };
  set("marker-label", state.marker);
  set("measure-label", state.measure);
  set("verdict", state.verdict);
}

export function seatBulletKey(root) {
  const key = root.querySelector('[data-part="key"]');
  const marker = root.querySelector('[data-part="marker-label"]');
  const measure = root.querySelector('[data-part="measure-label"]');
  if (!key || !marker || !measure) return;
  const lineHeight = marker.offsetHeight;

  // Reset to the rendered seats before measuring.
  marker.style.left = "";
  marker.style.right = marker.dataset.right ?? (marker.dataset.right = marker.style.right);
  marker.style.bottom = "0px";
  measure.style.bottom = "0px";
  key.style.height = `${lineHeight}px`;

  const track = key.getBoundingClientRect();
  let m = marker.getBoundingClientRect();
  if (m.left < track.left) {
    marker.style.right = "auto";
    marker.style.left = "0px";
    m = marker.getBoundingClientRect();
  }
  const s = measure.getBoundingClientRect();
  if (s.left < m.right + 8) {
    key.style.height = `${lineHeight * 2}px`;
    measure.style.bottom = `${lineHeight}px`;
  }
}
