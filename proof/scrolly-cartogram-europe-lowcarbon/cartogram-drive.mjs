// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   morph    each country from its territory (0) to its equal tile (1)                  0..1
//   subject  the subject country picked out on the map, the others stepping back         0..1
//   area     the area-weighted counter                                                   0..1
//   country  the country-mean counter                                                    0..1
//   classes  the ramp arriving class by class, lowest first, over neutral tiles           0..1
//   missing  the country with no reading named                                          0..1
//
// THE MORPH IS AN AFFINE MAP PER COUNTRY. A country's group is translated and scaled from its shape's box
// to its tile; the shape fades into a rect drawn in that same box over the last third of the travel, so
// the reader watches Russia shrink and Malta swell into two tiles of one size. Strokes do not scale.
// Names are placed on the group's box in the reader's own pixels, read back through the SVG's own
// screen matrix, and appear once the tiles have landed — a name only fits a tile.

export function applyCartogramState(root, state, context) {
  const carrier = root.querySelector("[data-cartogram]");
  if (!carrier) return;
  if (context.resized || !root.__carto) seatCartogram(root, carrier);
  const c = root.__carto;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const m = ease(clamp(state.morph));
  const shapeOut = clamp((m - 0.62) / 0.3);
  const n = c.fills.classes.length;
  // The frame fitted between the overlays and widened to the stage: the map runs edge to edge.
  const vb = fitViewBox({ x: 0, y: 0, w: c.width, h: c.height }, { width: c.stage.clientWidth, height: c.stage.clientHeight }, c.insets);
  c.field.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  c.field.setAttribute("preserveAspectRatio", "none");
  const stage = c.stage.getBoundingClientRect();
  const matrix = c.field.getScreenCTM();

  // ALL NAMES OR NONE. On a phone some three-letter codes fit a 26px tile and some do not; a grid naming
  // half its countries reads as a grid whose other half is unknown. The test is every tile at once.
  const namesFit = !!matrix && c.countries.every((k) => k.nameWidth + 4 <= k.tile.w * matrix.a && k.nameHeight <= k.tile.h * matrix.d);
  root.dataset.namesFit = namesFit ? "1" : "0";

  for (const country of c.countries) {
    const { box, tile } = country;
    const sx = 1 + (tile.w / box.w - 1) * m;
    const sy = 1 + (tile.h / box.h - 1) * m;
    const x = box.x + (tile.x - box.x) * m;
    const y = box.y + (tile.y - box.y) * m;
    country.group.setAttribute("transform", `translate(${x - box.x * sx} ${y - box.y * sy}) scale(${sx} ${sy})`);
    country.shape.style.opacity = String(1 - shapeOut);
    country.rect.style.opacity = String(shapeOut);

    const dim = country.iso === c.subject ? 1 : 1 - 0.7 * state.subject;
    country.group.style.opacity = String(dim);

    // Classes: on the map every country shows its class; on the tiles the ramp returns class by class.
    let fill = country.classIndex === null ? null : c.fills.classes[country.classIndex];
    if (fill !== null) {
      const reached = clamp(state.classes * n - country.classIndex);
      const onTiles = m;
      const showClass = 1 - onTiles * (1 - reached);
      fill = mix(c.fills.neutral, fill, showClass);
      country.shape.setAttribute("fill", fill);
      country.rect.setAttribute("fill", fill);
      country.name.style.color = showClass > 0.5 && country.classIndex >= n / 2 ? c.ink.light : c.ink.dark;
    }

    if (matrix) {
      const cx = x + (box.w * sx) / 2;
      const cy = y + (box.h * sy) / 2;
      const px = matrix.a * cx + matrix.c * cy + matrix.e - stage.left;
      const py = matrix.b * cx + matrix.d * cy + matrix.f - stage.top;
      country.name.style.left = `${px}px`;
      country.name.style.top = `${py}px`;
      country.name.style.opacity = String(namesFit ? clamp((m - 0.8) / 0.2) : 0);
    }
  }
  c.context.style.opacity = String(1 - m);
  c.sea.style.opacity = String(1 - m);
  for (const swatch of c.swatches) {
    const i = Number(swatch.dataset.classSwatch);
    swatch.style.opacity = String(m > 0.5 ? clamp(state.classes * n - i) : 1);
  }

  for (const [node, value] of [
    [c.byArea, state.area],
    [c.byCountry, state.country],
  ]) {
    const target = Number(node.dataset.value);
    const text = node.dataset.template.replace("{n}", (target * clamp(value * 2)).toFixed(1).replace(".", ","));
    if (node.textContent !== text) node.textContent = text;
    node.style.opacity = String(value);
  }
  // The panel is as visible as the most visible counter in it: an empty panel reads as a hole in the map.


  // Notes seated beside their country, inside the stage.
  const seatNote = (note, iso, value) => {
    const country = c.countries.find((k) => k.iso === iso);
    note.style.opacity = String(value);
    if (!country || !matrix || value <= 0) return;
    const r = country.group.getBoundingClientRect();
    let left = r.left - stage.left + r.width / 2 - note.offsetWidth / 2;
    let top = r.top - stage.top + r.height / 2 - note.offsetHeight / 2;
    // Inside the band the overlays leave free, never under the counters or the key.
    left = Math.min(Math.max(left, c.insets.left), stage.width - c.insets.right - note.offsetWidth);
    top = Math.min(Math.max(top, c.insets.top), stage.height - c.insets.bottom - note.offsetHeight);
    note.style.left = `${left}px`;
    note.style.top = `${top}px`;
  };
  seatNote(c.subjectNote, c.subject, state.subject);
  seatNote(c.missingNote, c.missingIso, state.missing);
  if (c.missingIso && state.missing > 0) {
    const r = c.countries.find((k) => k.iso === c.missingIso).group.getBoundingClientRect();
    c.missingNote.style.top = `${Math.min(r.bottom - stage.top + 6, stage.height - c.missingNote.offsetHeight)}px`;
  }
}

function mix(a, b, t) {
  const pa = [1, 3, 5].map((i) => Number.parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => Number.parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

function seatCartogram(root, carrier) {
  const data = JSON.parse(carrier.getAttribute("data-cartogram"));
  const stage = root.querySelector('[data-part="stage"]');
  const field = root.querySelector('[data-part="field"]');
  const countries = data.countries.map((k) => {
    const group = field.querySelector(`[data-country="${k.iso}"]`);
    const name = root.querySelector(`[data-name="${k.iso}"]`);
    name.style.opacity = "1";
    return {
      ...k,
      group,
      shape: group.querySelector('[data-part="shape"]'),
      rect: group.querySelector('[data-part="tile"]'),
      name,
      nameWidth: name.offsetWidth,
      nameHeight: name.offsetHeight,
    };
  });
  root.__carto = {
    ...data,
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
    stage,
    field,
    countries,
    context: field.querySelector('[data-part="context"]'),
    sea: field.querySelector('[data-part="sea"]'),
    byArea: root.querySelector('[data-part="by-area"]'),
    byCountry: root.querySelector('[data-part="by-country"]'),
    subjectNote: root.querySelector('[data-part="subject-note"]'),
    missingNote: root.querySelector('[data-part="missing-note"]'),
    missingIso: data.countries.find((k) => k.classIndex === null)?.iso ?? null,
    swatches: Array.from(root.querySelectorAll("[data-class-swatch]")),
  };
}
