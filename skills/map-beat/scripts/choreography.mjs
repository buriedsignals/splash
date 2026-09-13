// twin/skills/chart-video/scripts/choreography.mjs
//
// EVERY EVENT CHANGES THE PICTURE. A directed video is the static beat's subject choreographed, not
// its plate replayed (`references/directed-type-choreography.md`). The runner computes the picture's
// state at the end of each event of the timing contract — a fill, a window, a count, a filter — and
// this refuses the event a viewer would sit through while nothing moves. The scrolly's `assertStates`
// is the same rule for a card.

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
      if ([...keys].every((k) => before[k] === state[k]))
        throw new Error(
          `${events[i]} changes nothing: its state is ${events[i - 1]}'s. Give it a gesture of its own — ` +
            `reveal, filter, zoom, reorder, rescale, count, compare, trace, name — or fold it into ` +
            `${events[i - 1]} (references/directed-type-choreography.md)`,
        );
    }
  });
  return states;
}
