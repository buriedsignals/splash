// twin/skills/chart-video/scripts/choreography.mjs
//
// EVERY EVENT CHANGES THE PICTURE — EXCEPT A FINAL HOLD, WHICH BY DEFINITION CHANGES NOTHING. A
// directed video is the static beat's subject choreographed, not its plate replayed
// (`references/directed-type-choreography.md`). The runner computes the picture's state at the end
// of each event of the timing contract — a fill, a window, a count, a filter — and this refuses the
// event a viewer would sit through while nothing moves, with one named exception: a `hold` in the
// LAST position plays no gesture of its own (the motion grammar's own rule), so its
// state must EQUAL the one before it, and a hold whose state differs is refused just as loudly — it
// would mean the hold is smuggling in a gesture the timing contract never named. A `hold` anywhere
// but last carries no such exemption. The scrolly's `assertStates` is the same rule for a card.

export function assertEventStates(states, events) {
  if (states.length !== events.length)
    throw new Error(`${states.length} states for ${events.length} events: one state closes each event`);
  states.forEach((state, i) => {
    for (const [key, value] of Object.entries(state))
      if (typeof value !== "number" || !Number.isFinite(value))
        throw new Error(`${events[i]}.${key} is ${JSON.stringify(value)}; every field of a state must be a finite number`);
    if (i > 0) {
      const before = states[i - 1];
      const keys = new Set([...Object.keys(before), ...Object.keys(state)]);
      const unchanged = [...keys].every((k) => before[k] === state[k]);
      const isFinalHold = i === states.length - 1 && events[i] === "hold";
      if (isFinalHold && !unchanged)
        throw new Error(
          `hold changes the picture: its state differs from ${events[i - 1]}'s, but the last event of ` +
            `a beat plays no gesture of its own — it is the frame a viewer actually reads, held still ` +
            `(references/directed-type-choreography.md)`,
        );
      if (!isFinalHold && unchanged)
        throw new Error(
          `${events[i]} changes nothing: its state is ${events[i - 1]}'s. Give it a gesture of its own — ` +
            `reveal, filter, zoom, reorder, rescale, count, compare, trace, name — or fold it into ` +
            `${events[i - 1]} (references/directed-type-choreography.md)`,
        );
    }
  });
  return states;
}
