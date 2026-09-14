// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   bars     the two totals as bars; the radar waits                                                    0..1
//   trace0   the subject's polygon traced spoke by spoke, clockwise from twelve o'clock                  0..n
//   trace1   the other country's polygon, the same way                                                   0..n
//   merge    every spoke travelling to its family's angle, its share to the family's sum                 0..1
//   scale    the ceiling tightened from the first to the second ring value; a share past it rests on the
//            ceiling, marked open                                                                         0..1
//   note     which header note is read                                                                    0..5
//
// EVERYTHING IS LAID OUT IN THE READER'S PIXELS on each paint: the wheel takes the radius the stage leaves once
// the spoke labels have their room, and every label sits outside the ceiling on its own spoke's angle.

export function applyRadarState(root, state, context) {
  const carrier = root.querySelector("[data-radar]");
  if (!carrier) return;
  if (context.resized || !root.__radar) seatRadar(root, carrier);
  const c = root.__radar;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  c.svg.setAttribute("viewBox", `0 0 ${SW} ${SH}`);

  const n = c.spokes.length;
  const bars = clamp(state.bars);
  const wheel = 1 - bars;
  const merge = ease(clamp(state.merge));
  const scaleT = ease(clamp(state.scale));
  const ceiling = lerp(c.ceilings[0], c.ceilings[1], scaleT);

  // ── the wheel ──
  const labelW = Math.max(...c.spokeLabels.map((l) => l.offsetWidth));
  const labelH = c.spokeLabels[0].offsetHeight;
  // A narrow stage lets the side labels overhang the ring on their halo, for a wheel a reader can read, and seats the
  // wheel low, so its centre — where the small shares are — stands below the resting card.
  const narrow = SW < 560;
  const radius = narrow
    ? Math.max(40, Math.min(SH / 2 - labelH - 10, SW / 2 - 44))
    : Math.max(40, Math.min(SH / 2 - labelH - 10, Math.max(SW / 2 - labelW - 14, SW * 0.3)));
  const cx = SW / 2;
  const cy = narrow ? SH - radius - labelH - 12 : SH / 2;
  const base = (i) => (i / n) * Math.PI * 2 - Math.PI / 2;
  // The three families stand a third of a turn apart, the first on the middle of its own spokes: two
  // triangles a reader can compare, not a lopsided wedge.
  const firstMembers = c.spokes.map((s, i) => [s, i]).filter(([s]) => s.family === 0).map(([, i]) => base(i));
  const anchor = firstMembers.reduce((a, b) => a + b, 0) / firstMembers.length;
  const familyAngle = c.families.map((_, f) => anchor + (f * Math.PI * 2) / c.families.length);
  const turn = (from, to, t) => from + ((((to - from + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * t);
  const angles = c.spokes.map((s, i) => turn(base(i), familyAngle[s.family], merge));

  for (const ring of c.rings) {
    set(ring.node, { cx, cy, r: radius * ring.f, opacity: wheel });
  }
  c.spokeLines.forEach((line, i) => {
    set(line, { x1: cx, y1: cy, x2: cx + Math.cos(angles[i]) * radius, y2: cy + Math.sin(angles[i]) * radius, opacity: wheel });
  });
  // The ceiling's number, between the first two spokes, just inside the ring: one crossfades into the other.
  const ca = base(0) + Math.PI / n;
  c.ceilingLabels.forEach((node, k) => {
    Object.assign(node.style, {
      left: `${cx + Math.cos(ca) * (radius - 6)}px`,
      top: `${cy + Math.sin(ca) * (radius - 6)}px`,
      transform: "translate(-100%, -50%)",
      opacity: String(wheel * (k === 0 ? 1 - scaleT : scaleT)),
    });
  });

  // ── the polygons ──
  const traces = [state.trace0, state.trace1];
  c.polygons.forEach((poly, k) => {
    const pts = c.spokes.map((s, i) => {
      const grown = ease(clamp(traces[k] - i));
      const v = lerp(s.shares[k], c.families[s.family].shares[k], merge) * grown;
      const over = v > ceiling;
      const rr = (Math.min(v, ceiling) / ceiling) * radius;
      return { x: cx + Math.cos(angles[i]) * rr, y: cy + Math.sin(angles[i]) * rr, over, grown };
    });
    const drawn = clamp(traces[k]);
    poly.path.setAttribute("d", `M ${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ")} Z`);
    poly.path.setAttribute("opacity", String(drawn * wheel));
    poly.path.setAttribute("fill-opacity", String((k === 0 ? 0.18 : 0.22) * clamp(traces[k] - n + 1)));
    poly.vertices.forEach((dot, i) => {
      // A share the ceiling cannot hold rests on it as an open ring.
      set(dot, { cx: pts[i].x, cy: pts[i].y, r: pts[i].over ? 4 : 2.2, fill: pts[i].over ? c.ground : c.hues[k], opacity: pts[i].grown * wheel });
    });
  });

  // ── the labels: outside the ceiling, on the spoke's own angle ──
  const place = (node, angle, on) => {
    const out = radius + 12;
    const x = cx + Math.cos(angle) * out;
    const y = cy + Math.sin(angle) * out;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const w = node.offsetWidth;
    const h = node.offsetHeight;
    let left = Math.abs(cos) < 0.25 ? x - w / 2 : cos > 0 ? x : x - w;
    const top = sin < -0.75 ? y - h : sin > 0.75 ? y : y - h / 2;
    left = Math.max(0, Math.min(SW - w, left));
    Object.assign(node.style, { left: `${left}px`, top: `${top}px`, textAlign: Math.abs(cos) < 0.25 ? "center" : cos > 0 ? "left" : "right", opacity: String(on) });
  };
  c.spokeLabels.forEach((node, i) => {
    place(node, angles[i], wheel * (1 - clamp(merge * 2)));
    node.querySelectorAll("[data-value]").forEach((v) => {
      v.style.opacity = String(clamp(traces[Number(v.dataset.value)] - i));
    });
  });
  c.familyLabels.forEach((node, f) => place(node, familyAngle[f], wheel * clamp(merge * 2 - 1)));

  // ── the totals ──
  const most = Math.max(...c.totals);
  const barTop = SH * 0.12;
  c.bars.forEach((bar, k) => {
    const nameW = Math.max(...c.bars.map((b) => b.name.offsetWidth)) + 12;
    const full = SW - nameW - c.bars[0].value.offsetWidth - 20;
    const w = (c.totals[k] / most) * full * clamp(bars * 1.2);
    const rowTop = barTop + k * 44;
    Object.assign(bar.node.style, { left: "0px", top: `${rowTop}px`, width: `${SW}px`, opacity: String(bars) });
    Object.assign(bar.bar.style, { left: `${nameW}px`, top: "2px", width: `${w}px` });
    Object.assign(bar.value.style, { left: `${nameW + w + 8}px`, top: "0px" });
  });

  c.notes.forEach((node, k) => {
    node.style.opacity = String(clamp(1 - Math.abs(state.note - k)));
  });

  function set(el, attrs) {
    for (const [key, v] of Object.entries(attrs)) el.setAttribute(key, String(v));
  }
}

function seatRadar(root, carrier) {
  const data = root.__radarData || (root.__radarData = JSON.parse(carrier.getAttribute("data-radar")));
  const stage = root.querySelector('[data-part="stage"]');
  const q = (sel) => stage.querySelector(sel);
  const qa = (sel) => Array.from(stage.querySelectorAll(sel));
  root.__radar = {
    ...data,
    stage,
    svg: q('[data-part="field"]'),
    rings: qa("[data-ring]").map((node) => ({ node, f: Number(node.dataset.ring) })),
    spokeLines: data.spokes.map((_, i) => q(`[data-spoke="${i}"]`)),
    polygons: data.hues.map((_, k) => {
      const g = q(`[data-polygon="${k}"]`);
      return { path: g.querySelector("path"), vertices: data.spokes.map((__, i) => g.querySelector(`[data-vertex="${i}"]`)) };
    }),
    ceilingLabels: data.ceilings.map((_, i) => q(`[data-ceiling="${i}"]`)),
    spokeLabels: data.spokes.map((_, i) => q(`[data-spoke-label="${i}"]`)),
    familyLabels: data.families.map((_, i) => q(`[data-family-label="${i}"]`)),
    bars: data.totals.map((_, i) => {
      const node = q(`[data-bar="${i}"]`);
      return { node, name: node.querySelector('[data-part="bar-name"]'), bar: node.querySelector('[data-part="bar"]'), value: node.querySelector('[data-part="bar-value"]') };
    }),
    notes: data.notes.map((k) => root.querySelector(`[data-note="${k}"]`)),
  };
}
