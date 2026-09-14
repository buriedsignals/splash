// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   morph       each country from its territory (0) to its equal tile (1)                          0..1
//   size        each equal tile resized to a square whose area is the electricity its country produces 0..1
//   subject     the subject country picked out on the map, the others stepping back                 0..1
//   area        the area-weighted counter                                                           0..1
//   country     the country-mean counter                                                            0..1
//   production  the production-weighted counter                                                     0..1
//   rule        the three means on one rule, the tiles stepping back                                0..1
//   missing     the country with no reading named, its tile ringed                                  0..1
//
// THE MORPH IS AN AFFINE MAP PER COUNTRY. A country's group is translated and scaled from its shape's box
// to its tile; the shape fades into a rect drawn in that same box over the last third of the travel, so
// the reader watches Russia shrink and Malta swell into two tiles of one size. The resize is the same map
// onto a square centred in the tile, its side the tile's short side times the square root of the country's
// share of the largest producer. Strokes do not scale.
// Names are placed on the group's box in the reader's own pixels, read back through the SVG's own screen
// matrix. On the equal tiles they are shown all or none, set smaller when a phone's tiles need it; on the
// resized tiles a name is shown where its own square holds it.
//
// ON A PHONE the card reads over the middle of the stage, so the frame is fitted into the stage's upper part
// and the geography runs on beneath the card.

export function applyCartogramState(root, state, context) {
  const carrier = root.querySelector("[data-cartogram]");
  if (!carrier) return;
  if (context.resized || !root.__carto) seatCartogram(root, carrier);
  const c = root.__carto;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const m = ease(clamp(state.morph));
  const size = ease(clamp(state.size));
  const ruleOn = clamp(state.rule);
  const shapeOut = clamp((m - 0.62) / 0.3);
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  const narrow = SW < 560;
  // On a phone the top keeps a line for the missing country's note, which would otherwise sit over the northern tiles.
  const insets = narrow ? { top: c.missingNote.offsetHeight + 6, right: 0, bottom: SH * 0.44, left: 0 } : c.insets;
  const vb = fitViewBox({ x: 0, y: 0, w: c.width, h: c.height }, { width: SW, height: SH }, insets);
  c.field.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  c.field.setAttribute("preserveAspectRatio", "none");
  const stage = c.stage.getBoundingClientRect();
  const matrix = c.field.getScreenCTM();
  const px = (v) => (matrix ? v * matrix.a : v);

  // ALL NAMES OR NONE on the equal tiles, at one size: the largest that every tile holds, never below 70 %.
  const fitOf = (k, w, h) => Math.min(1, (px(w) - 4) / k.nameWidth, px(h) / k.nameHeight);
  const gridScale = Math.min(...c.countries.map((k) => fitOf(k, k.tile.w, k.tile.h)));
  const gridNames = gridScale >= 0.7;
  root.dataset.namesFit = gridNames ? "1" : "0";

  for (const country of c.countries) {
    const { box, tile } = country;
    const side = country.twh > 0 ? Math.min(tile.w, tile.h) * Math.sqrt(country.twh / c.maxTwh) : Math.min(tile.w, tile.h);
    const target = country.classIndex === null
      ? tile
      : { x: tile.x + (tile.w - side) / 2, y: tile.y + (tile.h - side) / 2, w: side, h: side };
    const tw = tile.w + (target.w - tile.w) * size;
    const th = tile.h + (target.h - tile.h) * size;
    const tx = tile.x + (target.x - tile.x) * size;
    const ty = tile.y + (target.y - tile.y) * size;
    const sx = 1 + (tw / box.w - 1) * m;
    const sy = 1 + (th / box.h - 1) * m;
    const x = box.x + (tx - box.x) * m;
    const y = box.y + (ty - box.y) * m;
    country.group.setAttribute("transform", `translate(${x - box.x * sx} ${y - box.y * sy}) scale(${sx} ${sy})`);
    country.shape.style.opacity = String(1 - shapeOut);
    country.rect.style.opacity = String(shapeOut);

    const dim = (country.iso === c.subject ? 1 : 1 - 0.7 * state.subject) * (1 - 0.82 * ruleOn);
    country.group.style.opacity = String(dim);
    if (country.classIndex === null) {
      country.rect.setAttribute("stroke", mix(c.ink.muted, c.ink.dark, state.missing));
      country.rect.setAttribute("stroke-width", String(1 + state.missing));
    }

    if (matrix) {
      const cx = x + (box.w * sx) / 2;
      const cy = y + (box.h * sy) / 2;
      country.name.style.left = `${matrix.a * cx + matrix.c * cy + matrix.e - stage.left}px`;
      country.name.style.top = `${matrix.b * cx + matrix.d * cy + matrix.f - stage.top}px`;
      const own = fitOf(country, tw, th);
      const scale = (1 - size) * gridScale + size * Math.min(1, own);
      const shown = (1 - size) * (gridNames ? 1 : 0) + size * (own >= 0.85 ? 1 : 0);
      country.name.style.transform = `translate(-50%, -50%) scale(${Math.min(1, scale).toFixed(3)})`;
      country.name.style.opacity = String(clamp((m - 0.8) / 0.2) * shown * (1 - ruleOn));
    }
  }
  c.context.style.opacity = String(1 - m);
  c.sea.style.opacity = String(1 - m);

  for (const [node, value] of [
    [c.byArea, state.area],
    [c.byProduction, state.production],
    [c.byCountry, state.country],
  ]) {
    const target = Number(node.dataset.value);
    const text = node.dataset.template.replace("{n}", (target * clamp(value * 2)).toFixed(1).replace(".", ","));
    if (node.textContent !== text) node.textContent = text;
    node.style.opacity = String(value);
  }

  // The rule clear of the card: on a phone in the middle of the frame's upper band, on a wide stage near its top.
  if (matrix) {
    const midY = narrow ? matrix.d * (c.height / 2) + matrix.f - stage.top : SH * 0.14 + c.rule.offsetHeight / 2;
    Object.assign(c.rule.style, { top: `${midY - c.rule.offsetHeight / 2}px`, opacity: String(ruleOn) });
  }

  // The subject's note beside its country; the missing country's note in the stage's top corner, clear of the card.
  const subject = c.countries.find((k) => k.iso === c.subject);
  c.subjectNote.style.opacity = String(state.subject);
  if (subject && state.subject > 0) {
    const r = subject.group.getBoundingClientRect();
    const left = Math.min(Math.max(r.left - stage.left + r.width / 2 - c.subjectNote.offsetWidth / 2, 0), stage.width - c.subjectNote.offsetWidth);
    const top = Math.min(Math.max(r.top - stage.top + r.height / 2 - c.subjectNote.offsetHeight / 2, 0), stage.height - c.subjectNote.offsetHeight);
    Object.assign(c.subjectNote.style, { left: `${left}px`, top: `${top}px` });
  }
  Object.assign(c.missingNote.style, { left: `${stage.width - c.missingNote.offsetWidth}px`, top: "0px", opacity: String(state.missing) });
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
    byProduction: root.querySelector('[data-part="by-production"]'),
    rule: root.querySelector('[data-part="rule"]'),
    maxTwh: Math.max(...data.countries.map((k) => k.twh)),
    subjectNote: root.querySelector('[data-part="subject-note"]'),
    missingNote: root.querySelector('[data-part="missing-note"]'),
    missingIso: data.countries.find((k) => k.classIndex === null)?.iso ?? null,
    swatches: Array.from(root.querySelectorAll("[data-class-swatch]")),
  };
}
