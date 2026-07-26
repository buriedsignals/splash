import { test, expect } from "bun:test";
import { appendEvent, type RunManifest, type RunEvent } from "./manifest";

function base(): RunManifest {
  return {
    runId: "r",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: {},
    elements: [{ id: "e" }],
    events: [],
  };
}
function ev(i: number): RunEvent {
  return {
    at: "2026-01-01T00:00:00.000Z",
    kind: "failure",
    action: "produce",
    message: `fail ${i}`,
  };
}

test("appendEvent adds an event without mutating the input", () => {
  const m = base();
  const m2 = appendEvent(m, ev(1));
  expect(m.events.length).toBe(0);
  expect(m2.events.length).toBe(1);
});

test("appendEvent ring-caps to the last N events", () => {
  let m = base();
  for (let i = 0; i < 60; i++) m = appendEvent(m, ev(i), 50);
  expect(m.events.length).toBe(50);
  expect(m.events[0].message).toBe("fail 10");
  expect(m.events[49].message).toBe("fail 59");
});

test("appendEvent does not advance element state", () => {
  const m2 = appendEvent(base(), ev(1));
  expect(m2.elements[0].artifact).toBeUndefined();
});
