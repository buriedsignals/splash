// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option AFTER
// `reveal.mjs`, whose `fitViewBox` it calls.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   tops     the largest stations across Europe, dotted and labelled with their capacity              0..1
//   country  the subject's country outlined, the one with no reported generation                     0..1
//   zoom     the camera from Europe onto the region around the station, the country's oblasts appearing 0..1
//   places   the three classes of place named: countries, settlements, water                         0..1
//   subject  the station ringed and named                                                            0..1
//   limit    the database's limit stated                                                               0..1
//
// THE CAMERA IS THE VIEWBOX travelling between the two boxes, fitted to the stage. Every label is HTML, seated on its
// point through the SVG's screen matrix each paint, so words keep their register's size while the map grows. Labels
// are placed subject first; a label that would touch one already placed tries its other sides, then steps back.

export function applyLocatorState(root, state, context) {
  const carrier = root.querySelector("[data-locator]");
  if (!carrier) return;
  if (!root.__locator) seatLocator(root, carrier);
  const c = root.__locator;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;

  // The camera travels in log space so the zoom reads as a steady approach rather than a sudden plunge.
  const z = ease(clamp(state.zoom));
  const scale = Math.exp(lerp(Math.log(c.europeBox.w), Math.log(c.zoomBox.w), z));
  const t = (c.europeBox.w - scale) / (c.europeBox.w - c.zoomBox.w || 1);
  const box = {
    x: lerp(c.europeBox.x, c.zoomBox.x, t),
    y: lerp(c.europeBox.y, c.zoomBox.y, t),
    w: scale,
    h: lerp(c.europeBox.h, c.zoomBox.h, t),
  };
  const vb = fitViewBox(box, { width: SW, height: SH }, { top: 0, right: 0, bottom: 0, left: 0 });
  // The close-up centres the station, both ways. On a narrow stage the whole of Europe is taller than the stars of
  // card one, so before the zoom they are held in the upper part, easing to the centre as the camera closes.
  const narrow = SW < 560;
  const starsY = c.stations.reduce((sum, s) => sum + s.y, 0) / c.stations.length;
  vb.x += z * (c.subject.x - (vb.x + 0.5 * vb.w));
  vb.y += (narrow ? 1 : z) * (lerp(starsY, c.subject.y, z) - (vb.y + lerp(narrow ? 0.3 : 0.5, 0.5, z) * vb.h));
  c.svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  c.svg.setAttribute("preserveAspectRatio", "none");
  const ppu = SW / vb.w;
  const px = (x) => (x - vb.x) * ppu;
  const py = (y) => (y - vb.y) * ppu;

  const tops = clamp(state.tops);
  const country = clamp(state.country);
  const places = clamp(state.places);
  const subject = clamp(state.subject);
  for (const s of c.stations) {
    s.el.setAttribute("r", String(Math.max(2.5, Math.sqrt(s.mw / 6000) * 9) / ppu));
    s.el.setAttribute("opacity", String(tops * (1 - z)));
  }
  for (const [iso, node] of c.countries) node.setAttribute("opacity", iso === c.subjectCountry ? "1" : String(1 - 0.35 * country * (1 - z)));
  c.outline.setAttribute("opacity", String(country));
  // The oblasts come with the close-up: at the scale of Europe they are a grey smear inside the country.
  c.regions.setAttribute("opacity", String(clamp((z - 0.5) * 2)));
  c.subjectRing.setAttribute("r", String(lerp(5, 9, subject) / ppu));
  c.subjectRing.setAttribute("opacity", String(Math.max(subject, tops * (1 - z))));
  c.subjectDot.setAttribute("r", String(3 / ppu));
  for (const d of c.placeDots) {
    d.setAttribute("r", String(2.6 / ppu));
    d.setAttribute("opacity", String(places * z));
  }

  const want = {
    station: tops * (1 - z),
    area: places * z,
    place: places * z,
    water: places * z,
  };
  // The marks themselves are obstacles: a label is never laid over a station's dot.
  const placed = c.stations
    .filter(() => tops * (1 - z) > 0.01)
    .map((s) => {
      const rr = Math.max(2.5, Math.sqrt(s.mw / 6000) * 9) + 2;
      return { l: px(s.x) - rr, t: py(s.y) - rr, r: px(s.x) + rr, b: py(s.y) + rr };
    });
  const order = [...c.labels].sort((a, b) => rank(a.kind) - rank(b.kind));
  for (const l of order) {
    const on = l.kind === "subject" ? Math.max(subject, tops * (1 - z)) : want[l.kind];
    const node = l.el;
    if (on <= 0.01) {
      node.style.opacity = "0";
      continue;
    }
    const x = px(l.x);
    const y = py(l.y);
    const w = node.offsetWidth;
    const h = node.offsetHeight;
    // A label clears its own mark: a station's dot grows with its capacity, so its gap does too.
    const markR = l.kind === "station" || (l.kind === "subject" && tops * (1 - z) > 0.01) ? Math.max(2.5, Math.sqrt(l.mw / 6000) * 9) + 2 : 0;
    const gap = l.kind === "area" || l.kind === "water" ? 0 : Math.max(7, markR + 4);
    const sides = l.kind === "area" || l.kind === "water" ? [[-0.5, -0.5]] : [[0, -0.5], [-1, -0.5], [-0.5, -1], [-0.5, 0], [0, -1], [-1, 0]];
    let seat = null;
    for (const [ox, oy] of sides) {
      const left = x + ox * w + (ox === 0 ? gap : ox === -1 ? -gap : 0);
      const top = y + oy * h + (oy === 0 ? gap : oy === -1 ? -gap : 0);
      const b = { l: left, t: top, r: left + w, b: top + h };
      if (b.l < 2 || b.t < 2 || b.r > SW - 2 || b.b > SH - 2) continue;
      if (placed.some((p) => b.l < p.r && b.r > p.l && b.t < p.b && b.b > p.t)) continue;
      seat = b;
      break;
    }
    if (!seat) {
      node.style.opacity = "0";
      continue;
    }
    placed.push(seat);
    node.style.left = `${seat.l}px`;
    node.style.top = `${seat.t}px`;
    node.style.opacity = String(on);
  }

  const notes = { topNote: tops * (1 - country), countryNote: country * (1 - z), zoomNote: z * (1 - places), subjectNote: subject * (1 - clamp(state.limit)), limitNote: clamp(state.limit) };
  for (const [key, node] of Object.entries(c.notes)) node.style.opacity = String(notes[key]);
}

function rank(kind) {
  return { subject: 0, station: 1, place: 2, area: 3, water: 4 }[kind];
}

function seatLocator(root, carrier) {
  const data = JSON.parse(carrier.getAttribute("data-locator"));
  const stage = root.querySelector('[data-part="stage"]');
  const svg = stage.querySelector('[data-part="field"]');
  root.__locator = {
    ...data,
    stage,
    svg,
    countries: Array.from(svg.querySelectorAll("[data-country]")).map((n) => [n.dataset.country, n]),
    outline: svg.querySelector('[data-part="country-outline"]'),
    regions: svg.querySelector('[data-part="regions"]'),
    stations: data.stations.map((s) => ({ ...s, el: svg.querySelector(`[data-station="${s.id}"]`) })),
    placeDots: Array.from(svg.querySelectorAll("[data-place-dot]")),
    subjectRing: svg.querySelector('[data-part="subject-ring"]'),
    subjectDot: svg.querySelector('[data-part="subject-dot"]'),
    labels: data.labels.map((l) => ({ ...l, el: stage.querySelector(`[data-label="${l.id}"]`) })),
    notes: Object.fromEntries(Array.from(root.querySelectorAll("[data-note]")).map((n) => [n.dataset.note, n])),
  };
}
