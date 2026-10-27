// THE TIME-SERIES PICTURE AT ONE FRAME — pure arithmetic over gesture-time-video-build.mjs's props, run by the
// composition in Chrome and by the runner in Bun. Browser-safe: it imports only the video scheduler's time half.
//
// Time maps linearly onto x through the window (x0, x1); the value (or rank) maps onto y through the fixed domain:
// no gesture moves the value axis. A series is drawn up to `play` (or `lead` when a trace draws it) of the whole
// span, its tip interpolated between readings, broken at its gaps.
import { fieldAt } from "./gesture-video.mjs";

/** Two #rrggbb colours mixed `t` of the way. */
export function blend(a, b, t) {
  const pa = [1, 3, 5].map((i) => Number.parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => Number.parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);

export function sceneAt(props, frame) {
  const f = (field) => fieldAt(props, field, frame);
  const P = props.plot;
  const [lo, hi] = props.domain;
  const x0 = f("x0");
  const x1 = f("x1");
  const X = (t) => P.left + ((t - x0) / (x1 - x0 || 1)) * (P.right - P.left);
  const Y = (v) => P.bottom - ((v - lo) / (hi - lo || 1)) * (P.bottom - P.top);
  const inside = (t) => t >= x0 - 1e-9 && t <= x1 + 1e-9;
  const span = props.t1 - props.t0 || 1;
  const grown = f("grown");
  const play = f("play");
  const lead = f("lead");
  const release = f("release");
  const g = props.plan.map((p) => f(p.field));
  const line = props.variant === "line" || props.variant === "bump-ranking-over-time";

  const series = props.series.map((s, i) => {
    const fr = s.traced ? lead : play;
    const to = props.t0 + fr * span;
    const runs = [];
    let run = [];
    let tip = null;
    const pts = s.pts;
    for (let j = 0; j < pts.length; j++) {
      const [t, y0, y1, gap] = pts[j];
      if (t > to + 1e-9) {
        const prev = pts[j - 1];
        if (prev && !prev[3] && !gap && run.length) {
          const u = (to - prev[0]) / (t - prev[0]);
          const p = [to, prev[1] + (y0 - prev[1]) * u, prev[2] + (y1 - prev[2]) * u];
          run.push(p);
          tip = p;
        }
        break;
      }
      if (gap) {
        if (run.length) runs.push(run);
        run = [];
        continue;
      }
      run.push([t, y0, y1]);
      tip = [t, y0, y1];
    }
    if (run.length) runs.push(run);
    const d = runs
      .map((r) =>
        line
          ? null
          : `${r.map((p, k) => `${k ? "L" : "M"}${X(p[0]).toFixed(1)},${Y(p[2]).toFixed(1)}`).join("")}${[...r].reverse().map((p) => `L${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join("")}Z`,
      )
      .filter(Boolean);
    const lines = runs.map((r) => r.map((p, k) => `${k ? "L" : "M"}${X(p[0]).toFixed(1)},${Y(p[2]).toFixed(1)}`).join(""));
    const back = f(`back${i}`);
    return {
      lines,
      bands: d,
      accent: f(`accent${i}`),
      ring: f(`ring${i}`),
      back,
      fr,
      tip: tip && { x: X(tip[0]), y: line || props.single ? Y(tip[2]) : Y((tip[1] + tip[2]) / 2), t: tip[0] },
      labelOpacity: fr >= 0.999 ? grown * (1 - 0.6 * back) : 0,
    };
  });

  // The playhead: the time a drawing series has reached, written at its tip while it draws.
  const drawing = series.findIndex((s, i) => s.fr > 0 && s.fr < 0.999 && s.tip && (props.series[i].traced || props.series[i].name === props.accent));
  const drawingAny = drawing >= 0 ? drawing : series.findIndex((s) => s.fr > 0 && s.fr < 0.999 && s.tip);
  let playhead = null;
  if (drawingAny >= 0) {
    const s = series[drawingAny];
    const key = [...props.keys].reverse().find(([t]) => t <= s.tip.t + 1e-9);
    if (key) playhead = { x: s.tip.x, y: s.tip.y, text: key[1], width: props.keyWidths[key[1]] };
  }

  const zoomedTicks = x1 - x0 < (props.t1 - props.t0 + (props.zoomSpan ?? props.t1 - props.t0)) / 2;
  const xTicks = (zoomedTicks && props.xTicks.zoom.length ? props.xTicks.zoom : props.xTicks.full).filter((k) => inside(k.t)).map((k) => ({ ...k, x: X(k.t) }));

  const items = props.items.map((it, k) => {
    const gk = clamp01(g[k] ?? 0);
    const out = { k, do: it.do, kind: it.kind, g: gk, show: gk };
    const pt = (p) => (p ? { x: X(p.t), y: Y(p.y), in: inside(p.t) } : null);
    if (it.at) out.at = pt(it.at);
    if (it.kind === "level") {
      out.a = pt(it.a);
      out.b = pt(it.b);
      out.reach = out.b.x + (out.a.x - out.b.x) * gk;
    }
    if (it.kind === "copy") {
      out.a = { x: X(it.a.t), y: Y(it.a.y0), in: inside(it.a.t) };
      out.b = { x: X(it.b.t), y: Y(it.b.y1), in: inside(it.b.t) };
      out.thick = Math.abs(Y(it.b.y1) - Y(it.b.y0)) * gk;
      out.bThick = Math.abs(Y(it.b.y1) - Y(it.b.y0));
    }
    if (it.kind === "crossing") out.points = it.points.map(pt);
    if (it.do === "bracket") {
      out.x0 = X(it.from);
      out.x1 = X(it.from) + (X(it.to) - X(it.from)) * gk;
    }
    if (it.do === "reference") {
      out.y = Y(it.value);
      out.reach = P.left + (P.right - P.left) * gk;
    }
    if (it.note) {
      const anchor = out.at ?? out.a ?? out.points?.[0] ?? null;
      const cut = it.linear ? (gk >= 1 ? 1 : 0) : gk;
      const hidden = anchor && !anchor.in;
      const zoomFade = it.do === "zoom" ? 1 - release : 1;
      out.note = {
        ...it.note,
        x: it.note.x !== undefined ? it.note.x : (anchor ? anchor.x : P.left) + it.note.dx,
        y: it.note.y !== undefined ? it.note.y : (anchor ? anchor.y : P.top) + it.note.dy,
        opacity: hidden ? 0 : cut * zoomFade,
        ax: anchor?.x,
        ay: anchor?.y,
      };
    }
    if (it.caption) out.captionOpacity = (it.linear ? (gk >= 1 ? 1 : 0) : gk) * (it.do === "zoom" ? 1 - release : 1);
    return out;
  });

  return {
    title: f("title"),
    furniture: f("furniture"),
    source: f("source"),
    grown,
    X,
    Y,
    series,
    playhead,
    xTicks,
    items,
  };
}
