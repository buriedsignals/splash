import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  channelForElement,
  deliverableForElement,
  resolvedChannelForElement,
  type RunManifest,
} from "./manifest";
import { channelFor } from "../core/channel-policy";

// THE GUARD THE ARBITRAGE NAMED.
//
// `run.channel` was allowed to keep living beside `elements[].deliverable` on ONE stated ground:
// "the live question 'what channel is THIS element rendered at' is answered in one place only"
// (manifest.ts's own docstring). That is not a style preference — it is the whole reason the
// duplicate field is not a semantic fork. Two fields that mean overlapping things are safe
// exactly as long as one function reconciles them; the day a second caller reconciles them its
// own way, the run has two answers and nothing says which is the run's.
//
// The property had already eroded when this was written: five call sites unpacked `run.channel`
// themselves. Prose could not hold it, so this test does — a source scan, because the property
// IS about the source (how many places name the field), and no behavioural assertion can see it.
//
// ANY receiver, not just the bindings called `run` or `m`: a scan keyed to the names in use today
// passes the moment someone destructures or renames, which is not a guard, it is a coincidence.
const ANY_DOT_CHANNEL = /\.channel\b/;

// The two files allowed to name the field, and why each is not a second answer:
//   manifest.ts — the resolvers themselves. This is the "one place".
//   migrate.ts  — the CONVERSION's input. A v3 run had no deliverables, so materializeDeliverables
//                 reads the legacy field once to write the modern one. It answers nothing live.
const ALLOWED = new Set(["manifest.ts", "migrate.ts"]);

// Reads of a `.channel` that is NOT the manifest field. Each one is here because it was looked at
// and is something else; a new `.channel` anywhere in lib/loop or lib/host has to be looked at too,
// which is the point. Written as exact expressions, so widening one is a visible edit.
const NOT_THE_RUN_FIELD = [
  // The journalist's DECLARATION being written into a fresh manifest — the field's writer, and
  // the only place the value is chosen rather than consulted.
  "decl.channel",
  // A row of the resume REPORT, already resolved by deliverableForElement upstream.
  "el.channel",
];

function productionSources(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .map((f) => join(dir, f));
}

// CODE only. The property is about what the modules DO, and a comment explaining why they no
// longer read the field would otherwise be indistinguishable from reading it — which would push
// the next author towards not writing the explanation at all.
function code(line: string): string {
  const trimmed = line.trim();
  if (trimmed.startsWith("*") || trimmed.startsWith("/*")) return "";
  const comment = line.indexOf("//");
  return comment === -1 ? line : line.slice(0, comment);
}

describe("run.channel has exactly one reader", () => {
  test("no module outside the resolvers and the migration unpacks the run's default channel", () => {
    const offenders: string[] = [];
    // Resolved from this file, not from the cwd: the suite is run from `lib` and from the repo
    // root, and a scan that silently finds no files is a guard that silently passes.
    const loop = import.meta.dir;
    for (const dir of [loop, join(loop, "..", "host")]) {
      const found = productionSources(dir);
      expect(found.length).toBeGreaterThan(0);
      for (const path of found) {
        const name = path.split("/").pop()!;
        if (ALLOWED.has(name)) continue;
        readFileSync(path, "utf8")
          .split("\n")
          .forEach((line, i) => {
            const src = code(line);
            if (!ANY_DOT_CHANNEL.test(src)) return;
            if (NOT_THE_RUN_FIELD.some((expr) => src.includes(expr))) return;
            offenders.push(`${path}:${i + 1}: ${line.trim()}`);
          });
      }
    }
    expect(offenders).toEqual([]);
  });
});

const RUN: RunManifest = {
  runId: "r",
  schemaVersion: 4,
  route: "embed",
  channel: "social-vertical",
  input: {},
  elements: [{ id: "e1" }],
  events: [],
};

describe("the resolvers agree, because there is only one of them", () => {
  test("an element with no deliverable of its own resolves to the run's default, unpacked", () => {
    const el = RUN.elements[0]!;
    expect(deliverableForElement(RUN, el)).toEqual({
      destination: "social",
      aspect: "portrait",
    });
    expect(resolvedChannelForElement(RUN, el)).toBe("social-vertical");
    expect(channelForElement(RUN, el)).toBe("social-vertical");
  });

  test("a declared deliverable answers from itself, never from the run", () => {
    const el = { id: "e1", deliverable: { destination: "print" } } as const;
    const run = { ...RUN, elements: [el] } as RunManifest;
    expect(deliverableForElement(run, el)).toEqual({
      destination: "print",
      aspect: "page",
    });
    expect(resolvedChannelForElement(run, el)).toBe("print-page");
  });

  test("a shape still owed leaves the pair without an aspect, and no channel is guessed", () => {
    const el = { id: "e1", deliverable: { destination: "social" } } as const;
    const run = { ...RUN, elements: [el] } as RunManifest;
    expect(deliverableForElement(run, el)).toEqual({ destination: "social" });
    expect(resolvedChannelForElement(run, el)).toBeUndefined();
    // The TOTAL form still answers — the run's default stands in, which is what every read-only
    // reporter needs and what production (produce.ts) deliberately refuses to accept.
    expect(channelForElement(run, el)).toBe("social-vertical");
  });

  test("a run carrying no element at all is still the total resolver's question", () => {
    // propose() no longer asks it — it takes the live element as a required argument, and an
    // empty elements array routes to confirm-angle instead (driver.ts). The TOTAL form still has
    // to answer for the read-only reporters that walk a run before any element exists. Answering
    // it anywhere else is how the second reader came back last time.
    expect(channelForElement(RUN, undefined)).toBe("social-vertical");
  });

  test("unpacking and re-packing the run's default is the identity", () => {
    // Why the rewrite is meaning-preserving: destinationOf/aspectOf/channelFor round-trip
    // (lib/core/channel-policy.test.ts holds the bijection), so deriving the pair and rebuilding
    // the channel from it cannot move an element that declared nothing.
    const el = RUN.elements[0]!;
    const { destination, aspect } = deliverableForElement(RUN, el);
    expect(channelFor(destination, aspect!)).toBe(RUN.channel);
  });
});
