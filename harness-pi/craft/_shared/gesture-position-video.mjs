// The Position family's video scheduler (craft/gestures/GRAMMAR.md §5): six events, the first two the scheduler's
// (`establish` — the title card; `reference` — the field arriving on its axis, marks appearing in rank order), the
// next three one composed gesture each (`reveal`, `subject`, `conclusion`), `hold` the conclusion, still. The
// conclusion shows the whole field (doctrine rule 9): whatever its gesture adds, a zoom or a filter before it is
// pulled back. A video takes exactly three gestures; a list of two is completed here BEFORE the core sees it, because
// the core's own completion may add a `count`, which a Position family refuses (positions do not add up).
//
// What this file returns is LOGICAL: one family state per event's end. The runner lays each out as a scene (measured
// in Bun); the frame interpolates two scenes (`lerpScenes`). Browser-safe: no Node module.
import { GestureRefusal, implicitAccent } from "./gesture-core.mjs";
import { VIDEO_EVENTS } from "./gesture-registry.mjs";
import { createPosition, lerpScenes } from "./gesture-family-position.mjs";
import { applyGesture, defaultNote } from "./gesture-position-static.mjs";

export const EVENTS = ["establish", "reference", ...VIDEO_EVENTS, "hold"];

/** A list of fewer than three, completed with a gesture this family draws: pull-back last, else reveal first, else
 *  a highlight of the takeaway's row. */
export function assertVideoThree(gestures, model, claim = {}) {
  if (!Array.isArray(gestures) || gestures.length >= 3) return;
  const has = (d) => gestures.some((g) => g?.do === d);
  const names = model.rows.map((r) => r.name);
  const subject = names.find((n) => String(claim.entity ?? claim.takeaway ?? "").toLowerCase().includes(n.toLowerCase())) ?? names[0];
  const gesture = !has("pull-back") ? { do: "pull-back" } : !has("reveal") ? { do: "reveal" } : { do: "highlight", mark: subject };
  throw new GestureRefusal("gestures", `a video takes exactly three gestures (reveal, subject, conclusion); this list has ${gestures.length}: add ${3 - gestures.length}, e.g. ${gesture.do}`, {
    add: { at: gesture.do === "pull-back" ? gestures.length : 0, gesture },
  });
}

/**
 * @returns { states: { establish, reference, reveal, subject, conclusion, hold }, notes: { reveal, subject, conclusion } }
 */
export function scheduleVideoPosition({ gestures, model, format = String, delta, domain, entities = [] }) {
  const position = createPosition({ model, domain });
  const fallback = defaultNote(model, format, delta ?? ((v) => format(v)));
  let state = position.rest();
  const implicit = implicitAccent(gestures);
  const accented = model.rows.some((r) => r.name === implicit) ? position.with(state, { accent: [implicit] }) : state;
  const states = { establish: position.with(position.rest(), { reveal: 0 }), reference: position.with(position.rest(), { reveal: 1 }) };
  const notes = {};
  state = accented;
  gestures.slice(0, 3).forEach((g, i) => {
    const event = VIDEO_EVENTS[i];
    const { state: next, note } = applyGesture({ position, state, g, i, model, entities, mode: "back", fallback });
    state = next;
    if (event === "conclusion") {
      // The whole field returns: what was zoomed or filtered comes back, what was shown stays marked.
      state = position.with(state, { domain: next.window ? [...position.rest().domain] : next.domain, window: null, factor: 1, back: [], hidden: [] });
    }
    states[event] = state;
    notes[event] = note?.text ? note : null;
  });
  for (const [k, e] of VIDEO_EVENTS.entries())
    if (k && states[e].window === null && states[VIDEO_EVENTS[k - 1]].compares.length && states[e].domain.join() !== states[VIDEO_EVENTS[k - 1]].domain.join() && !states[VIDEO_EVENTS[k - 1]].window)
      throw new GestureRefusal(`gestures[${k}]`, `moves the axis after a comparison, so the compared shots stand on two scales (no-float-baseline-rescale): drop it`, { remove: k });
  states.hold = states.conclusion;
  return { states, notes, position };
}

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/**
 * The primitives at one frame: the event the frame is in interpolates from the previous event's scene to its own;
 * between events the last scene holds. `scenes` are the runner's laid-out scenes, by event.
 */
export function primsAt({ scenes, timing }, frame) {
  let prev = scenes.establish;
  for (const e of EVENTS) {
    const { start, duration } = timing[e];
    if (frame < start) return prev.prims;
    if (frame < start + duration) return lerpScenes(prev, scenes[e], ease(Math.min(1, (frame - start) / Math.max(1, duration * 0.6))));
    prev = scenes[e];
  }
  return prev.prims;
}

/** The title card's and the credit's opacity at one frame. */
export function chromeAt({ timing }, frame) {
  const fade = (from, len) => Math.max(0, Math.min(1, (frame - from) / len));
  return { title: 1 - fade(timing.reference.start, 12), source: fade(timing.conclusion.start, 20) };
}
