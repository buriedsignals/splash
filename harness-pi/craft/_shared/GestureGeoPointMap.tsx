/**
 * The point / line / field map DRAWN FROM A DECLARATION, shared by the web, scrolly and video formats of the four
 * point maps (symbol, flow, locator, contour). The basemap is the static kit's baked MapTiler plate (one image, never
 * a live map); the marks are SVG in the plate's own view units, so the geometry is the static plate's geometry,
 * projected once in Bun by the type's runner (`geometry`). A state (gesture-geo-point-family.mjs) only says which
 * marks are in the accent, ringed, stepped back or not yet arrived, which camera box the picture stands at, and which
 * notes are written — the drawing never decides any of it.
 *
 * Doctrine kept from the per-type kits: one accent carries the subject; a mark off the subject is ringed in ink,
 * never recoloured in a second hue; the step-back is a fade, nothing moves; a circle's AREA is its value (the radii
 * come from the static runner's square-root scale); a band's WIDTH is its value; a contour line is a true isoline.
 */

export type GeoMark = {
  name: string;
  kind: "circle" | "band" | "point" | "subject" | "line" | "summit";
  x: number;
  y: number;
  r?: number;
  d?: string;
  w?: number;
  label: string;
  detail: string;
};
export type Geometry = {
  variant: string;
  W: number;
  H: number;
  plate: string;
  marks: GeoMark[];
  origin?: { x: number; y: number; r: number; label: string } | null;
  furniture?: { text: string; x: number; y: number; kind: "area" | "water" }[];
  references?: { value: number; d: string }[];
  whole: { x: number; y: number; w: number; h: number };
};
export type Roles = {
  accent: string[];
  rings: string[];
  back: string[];
  hidden: string[];
  lines: number[];
};
export type Inks = {
  accent: string;
  neutral: string;
  ring: string;
  ground: string;
  water: string;
};

/** A box's view of the plate: the whole camera, or a close-up `factor` times closer around `focus`. */
export function boxOf(
  G: Geometry,
  focus: string[] | null,
  factor: number | null,
) {
  if (!focus?.length || !factor) return G.whole;
  const at = G.marks.filter((m) => focus.includes(m.name));
  if (!at.length) return G.whole;
  const xs = at.map((m) => m.x);
  const ys = at.map((m) => m.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const w = G.whole.w / factor;
  const h = G.whole.h / factor;
  const x = Math.max(0, Math.min(G.W - w, cx - w / 2));
  const y = Math.max(0, Math.min(G.H - h, cy - h / 2));
  return { x, y, w, h };
}

/** The SVG body of one picture: plate, marks with their roles, the origin node, the reference lines. */
export function GeoPointMarks({
  G,
  roles,
  inks,
  keyOf,
  indexed = false,
}: {
  G: Geometry;
  roles: Roles;
  inks: Inks;
  keyOf?: (name: string) => string;
  indexed?: boolean;
}) {
  const accent = new Set(roles.accent);
  const rings = new Set(roles.rings);
  const back = new Set(roles.back);
  const hidden = new Set(roles.hidden);
  const opacity = (m: GeoMark) =>
    hidden.has(m.name) ? 0 : back.has(m.name) ? 0.22 : 1;
  const stroke = (m: GeoMark) =>
    accent.has(m.name)
      ? inks.accent
      : rings.has(m.name)
        ? inks.ring
        : inks.neutral;
  const ordered = [...G.marks].sort(
    (a, b) =>
      Number(accent.has(a.name) || rings.has(a.name)) -
      Number(accent.has(b.name) || rings.has(b.name)),
  );
  const data = (m: GeoMark) => ({ ...(keyOf ? { "data-mark": keyOf(m.name) } : {}), ...(indexed ? { "data-geo-i": G.marks.indexOf(m) } : {}) });
  return (
    <g>
      <image
        href={G.plate}
        x={0}
        y={0}
        width={G.W}
        height={G.H}
        preserveAspectRatio="none"
      />
      {ordered.map((m, i) => {
        const o = opacity(m);
        const on = accent.has(m.name) || rings.has(m.name);
        if (m.kind === "circle")
          return (
            <circle
              key={i}
              {...data(m)}
              cx={m.x}
              cy={m.y}
              r={Math.max(0.9, m.r ?? 1)}
              fill="none"
              stroke={stroke(m)}
              strokeWidth={on ? 1.6 : 0.8}
              vectorEffect="non-scaling-stroke"
              opacity={o * (on ? 1 : 0.75)}
            />
          );
        if (m.kind === "band")
          return (
            <path
              key={i}
              {...data(m)}
              d={m.d}
              fill="none"
              stroke={stroke(m)}
              strokeWidth={m.w}
              strokeLinecap="butt"
              opacity={o}
            />
          );
        if (m.kind === "line")
          return (
            <path
              key={i}
              {...data(m)}
              d={m.d}
              fill="none"
              stroke={accent.has(m.name) ? inks.accent : inks.neutral}
              strokeWidth={accent.has(m.name) ? 2.4 : 1}
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              opacity={o}
            />
          );
        if (m.kind === "summit" || m.kind === "subject")
          return (
            <g key={i} {...data(m)} opacity={o}>
              <circle cx={m.x} cy={m.y} r={m.r ?? 3} fill={inks.accent} />
              <circle
                cx={m.x}
                cy={m.y}
                r={(m.r ?? 3) * 2.2}
                fill="none"
                stroke={inks.accent}
                strokeWidth={1.4}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        return (
          <circle
            key={i}
            {...data(m)}
            cx={m.x}
            cy={m.y}
            r={m.r ?? 2.2}
            fill={inks.ground}
            stroke={on ? stroke(m) : inks.ring}
            strokeWidth={on ? 1.8 : 1}
            vectorEffect="non-scaling-stroke"
            opacity={o}
          />
        );
      })}
      {(G.references ?? []).map((r, i) => (
        <path
          key={`ref${i}`}
          data-reference={r.value}
          {...(indexed ? { "data-reference-i": i } : {})}
          d={r.d}
          fill="none"
          stroke={inks.accent}
          strokeWidth={2.4}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          opacity={roles.lines.includes(r.value) ? 1 : 0}
        />
      ))}
      {G.origin ? (
        <g>
          <circle
            cx={G.origin.x}
            cy={G.origin.y}
            r={G.origin.r}
            fill={inks.ground}
          />
          <circle
            cx={G.origin.x}
            cy={G.origin.y}
            r={G.origin.r}
            fill="none"
            stroke={inks.ring}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ) : null}
    </g>
  );
}

/** The words a picture prints over the map: [{ text, x, y (view units), accent, kind }]. */
export function wordsOf(
  G: Geometry,
  roles: Roles,
  notes: { marks: string[]; text: string; kind: string }[],
  named: string[],
) {
  const hidden = new Set(roles.hidden);
  const accent = new Set(roles.accent);
  const out: {
    text: string;
    x: number;
    y: number;
    accent: boolean;
    kind: string;
  }[] = [];
  const at = (name: string) => G.marks.find((m) => m.name === name);
  const written = new Set<string>();
  for (const n of notes) {
    if (n.kind === "set") continue;
    const m = at(n.marks[0]);
    if (!m || hidden.has(m.name) || written.has(m.name)) continue;
    written.add(m.name);
    // A note on a named place is written after its name (a locator's subject, a settlement, a band's host).
    const named_ = m.kind === "subject" || m.kind === "point" || m.kind === "band";
    out.push({
      text: named_ && !n.text.includes(m.name) ? `${m.name} · ${n.text}` : n.text,
      x: m.x,
      y: m.y,
      accent: accent.has(m.name),
      kind: "note",
    });
  }
  for (const name of named) {
    const m = at(name);
    if (!m || hidden.has(name) || written.has(name)) continue;
    written.add(name);
    out.push({
      text: m.label,
      x: m.x,
      y: m.y,
      accent: accent.has(name),
      kind: "name",
    });
  }
  // The furniture a type always names: a flow's node and widest bands, a locator's places, a contour's line values.
  // A summit is named only by a gesture (its value is the claim's figure).
  if (G.origin)
    out.push({
      text: G.origin.label,
      x: G.origin.x,
      y: G.origin.y,
      accent: false,
      kind: "origin",
    });
  for (const m of G.marks)
    if (
      (m.kind === "point" ||
        m.kind === "subject" ||
        // A fan names its widest bands (a quarter of the widest or more) at their ends.
        (m.kind === "band" && (m.w ?? 0) >= 0.25 * Math.max(...G.marks.map((b) => b.w ?? 0))) ||
        m.kind === "line") &&
      !written.has(m.name) &&
      !hidden.has(m.name)
    )
      out.push({
        text: m.label,
        x: m.x,
        y: m.y,
        accent: accent.has(m.name) || m.kind === "subject",
        kind: m.kind,
      });
  for (const f of G.furniture ?? [])
    out.push({ text: f.text, x: f.x, y: f.y, accent: false, kind: f.kind });
  return out;
}
