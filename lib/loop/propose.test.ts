import { test, expect } from "bun:test";
import { propose } from "./propose";
import type { RunManifest } from "./manifest";
import type { Decor } from "../newsroom/decor";

function withNumeric(numericColumns: string[]): RunManifest {
  return {
    runId: "r",
    schemaVersion: 2,
    input: { data: { path: "input/data-abc.csv", sha256: "a".repeat(64) } },
    orient: {
      profile: {
        columns: ["label", ...numericColumns],
        numericColumns,
        rowCount: 3,
      },
      supportsPoint: true,
    },
    elements: [{ id: "e1" }],
    events: [],
  };
}

test("propose offers slope + dumbbell for two time points, each with a why", () => {
  const opts = propose(withNumeric(["2015", "2024"]));
  expect(opts.map((o) => o.id)).toEqual(["slope", "dumbbell"]);
  expect(opts[0].why.length).toBeGreaterThan(20);
});
test("propose offers a line for three or more points", () => {
  const opts = propose(withNumeric(["2010", "2015", "2020"]));
  expect(opts.map((o) => o.nativeType)).toEqual(["line"]);
});
test("propose returns nothing before orient has run", () => {
  expect(
    propose({
      runId: "r",
      schemaVersion: 2,
      input: { data: { path: "input/data-abc.csv", sha256: "a".repeat(64) } },
      elements: [{ id: "e1" }],
      events: [],
    }),
  ).toEqual([]);
});

function decorWith(status: "ready" | "missing"): Decor {
  return {
    root: "/nowhere",
    state: {
      schemaVersion: 1,
      runtime: "claude",
      uiLang: "en",
      capabilities: { "chart-native": { enabled: status === "ready" } },
    },
    language: { ui: "en", content: "en" },
    readiness: [
      {
        id: "chart-native",
        label: "Charts built in-house (no account needed)",
        status,
        reason: status === "missing" ? "chart-native is not installed" : "",
        help: [],
      },
    ],
  };
}

test("every offered form names the capability it needs", () => {
  for (const option of propose(withNumeric(["a", "b"])))
    expect(option.requires).toEqual(["chart-native"]);
});

test("a form whose capability is missing is offered MARKED, never removed", () => {
  const offered = propose(withNumeric(["a", "b"]), decorWith("missing"));
  expect(offered.map((o) => o.id)).toEqual(["slope", "dumbbell"]);
  for (const option of offered) {
    expect(option.readiness?.status).toBe("missing");
    expect(option.readiness?.reason).toContain("not installed");
  }
});

test("a ready capability annotates without a reason", () => {
  for (const option of propose(withNumeric(["a", "b"]), decorWith("ready")))
    expect(option.readiness).toEqual({ status: "ready", reason: "" });
});

test("without a decor the offer is unannotated, exactly as before", () => {
  for (const option of propose(withNumeric(["a", "b"])))
    expect(option.readiness).toBeUndefined();
});
