// The Length family adapter (craft/gestures/GRAMMAR.md §4): bars or stems from one zero baseline on one value axis.
// It answers where marks are in a given state; the format schedulers decide when states show. Pure geometry,
// browser-safe (the video bundle and the scrolly drive import it): no Node module, no native code.
//
// A state is a flat record: { order, domain, emphasis, compare, bracket, window, factorPrinted, reference }.
// Rows may carry a negative value (the optional sign diverging-bar will need); the baseline is always value 0.

const GAP = 0.2;

export function createLength({ rows, frame, orientation = "columns" }) {
  const valueOf = new Map(rows.map((r) => [r.name, r.value]));
  const lo = Math.min(0, ...rows.map((r) => r.value));
  const hi = Math.max(0, ...rows.map((r) => r.value));

  const rest = () => ({
    order: rows.map((r) => r.name),
    domain: [lo, hi || 1],
    emphasis: {},
    compare: null,
    bracket: null,
    window: null,
    factorPrinted: false,
    reference: null,
  });

  const with_ = (state, patch) => ({
    ...state,
    ...patch,
    emphasis: { ...state.emphasis, ...(patch.emphasis ?? {}) },
  });

  const span = orientation === "columns" ? frame.width : frame.height;
  const depth = orientation === "columns" ? frame.height : frame.width;

  /** Distance from the plot's value origin edge to value v, in px, for a state's domain. */
  const along = (v, state) => ((v - state.domain[0]) / (state.domain[1] - state.domain[0])) * depth;

  function rect(id, state) {
    const index = state.order.indexOf(id);
    if (index < 0) throw new Error(`${id} is not a drawn row`);
    const slot = span / state.order.length;
    const start = index * slot + (slot * GAP) / 2;
    const thick = slot * (1 - GAP);
    const base = along(0, state);
    const tip = along(valueOf.get(id), state);
    const [from, to] = [Math.min(base, tip), Math.max(base, tip)];
    if (orientation === "columns")
      return { x: frame.x + start, y: frame.y + frame.height - to, width: thick, height: to - from };
    return { x: frame.x + from, y: frame.y + start, width: to - from, height: thick };
  }

  /** Where a word, ring or leader attaches: the tip of the bar (its top for columns, its end for rows). */
  function anchor(id, state) {
    const r = rect(id, state);
    const negative = valueOf.get(id) < 0;
    if (orientation === "columns") return { x: r.x + r.width / 2, y: negative ? r.y + r.height : r.y, bbox: r };
    return { x: negative ? r.x : r.x + r.width, y: r.y + r.height / 2, bbox: r };
  }

  /** A copy of `id`'s length laid in `target`'s band, beside it, from the baseline — the compare gesture's mark. */
  function copyOnto(id, target, state) {
    const t = rect(target, state);
    const own = rect(id, state);
    if (orientation === "columns") return { x: t.x + t.width / 2, y: own.y, width: t.width / 2, height: own.height };
    return { x: own.x, y: t.y + t.height / 2, width: own.width, height: t.height / 2 };
  }

  function order(state, how) {
    const ids = Array.isArray(how)
      ? how
      : [...state.order].sort((a, b) => (how === "ascending" ? valueOf.get(a) - valueOf.get(b) : valueOf.get(b) - valueOf.get(a)));
    return with_(state, { order: ids });
  }

  /** A zoom onto a few rows: the domain tops at their largest value. Its factor must be printed (invariants). */
  function window(state, ids) {
    const top = Math.max(...ids.map((id) => Math.abs(valueOf.get(id)))) || 1;
    return with_(state, { domain: [Math.min(0, ...ids.map((id) => valueOf.get(id))), top], window: [...ids], factorPrinted: false });
  }

  const factor = (state) => (rest().domain[1] - rest().domain[0]) / (state.domain[1] - state.domain[0]);

  const normal = (s) =>
    JSON.stringify({
      ...s,
      emphasis: Object.fromEntries(Object.entries(s.emphasis).sort(([a], [b]) => a.localeCompare(b))),
    });
  const equal = (a, b) => normal(a) === normal(b);

  /**
   * The family's locks over a sequence of states, as the type sheets name them: one scale for everything compared
   * (no-float-baseline-rescale), and a zoom prints its factor (no-let-camera-magnification).
   */
  function invariants(states) {
    let comparedOn = null;
    states.forEach((s, i) => {
      if (s.window && !s.factorPrinted)
        throw new Error(
          `state ${i} zooms ×${factor(s).toFixed(1)} without printing it (no-let-camera-magnification): write the factor in the zoom's note`,
        );
      if (comparedOn && !s.window && (s.domain[0] !== comparedOn[0] || s.domain[1] !== comparedOn[1]))
        throw new Error(
          `state ${i} rescales the axis after a comparison, so the compared shots stand on two scales (no-float-baseline-rescale)`,
        );
      if (s.compare || s.bracket) comparedOn ??= s.domain;
    });
  }

  function derive(op, ids, state = rest()) {
    const v = ids.map((id) => valueOf.get(id));
    const whole = rows.reduce((t, r) => t + r.value, 0);
    switch (op) {
      case "sum":
        return v.reduce((t, x) => t + x, 0);
      case "diff":
        return v[0] - v[1];
      case "ratio":
        return v[0] / v[1];
      case "share":
        return v.reduce((t, x) => t + x, 0) / whole;
      case "rank":
        return [...rows].sort((a, b) => b.value - a.value).findIndex((r) => r.name === ids[0]) + 1;
      case "count":
        return ids.length;
      default:
        throw new Error(`no ${op} on the Length family`);
    }
  }

  return {
    family: "length",
    orientation,
    rest,
    with: with_,
    valueAxis: (state = rest()) => ({ kind: "linear", from0: state.domain[0] <= 0 && state.domain[1] >= 0, domain: state.domain }),
    baselineOf: () => "zero-edge",
    rect,
    anchor,
    copyOnto,
    order,
    window,
    factor,
    equal,
    invariants,
    derive,
    transpose: () => createLength({ rows, frame, orientation: orientation === "columns" ? "rows" : "columns" }),
  };
}
