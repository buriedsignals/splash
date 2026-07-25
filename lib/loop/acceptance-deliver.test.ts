// End-to-end, offline proof of the deliver step: a produced element gets published to `zip`,
// the archive on disk holds the four documented entries, and — the part that actually matters —
// revising the angle drops the element back OUT of "delivered" and back onto "produce".
//
// The brief for this task shipped a hand-authored fixture (lib/loop/fixtures/produced-run.json)
// carrying a PASTED provenanceHash, generated once by a scratch script. That fixture is a landmine:
// provenanceHash(run, el) folds in input hashes, cadrage answers, angle and chosenId (see
// manifest.ts), and canonical-hash's own serialization. Any of those shapes moving forward would
// silently rot the pasted value — the fixture would then fail with the artifact reading "stale"
// on the FIRST assertion, which looks exactly like a real regression in the delivery path this
// test exists to guard, not what it actually is (a fixture that fell out of sync). Building the
// manifest here and calling provenanceHash(...) live, the same way lib/loop/deliver.test.ts and
// lib/loop/acceptance.test.ts already do, keeps the hash correct by construction and keeps this
// test's failures meaningful.
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { unzipSync } from "fflate";
import { advance } from "./driver";
import {
  gateStateOf,
  nextActions,
  provenanceHash,
  type RunManifest,
} from "./manifest";
import { neutralDecor } from "../newsroom/decor";
import { DEFAULT_NEWSROOM_STATE } from "../newsroom/state";
import { registerAllPublishers } from "../delivery";
import { resetPublishersForTest } from "../core/publishers";

let runDir: string;

beforeEach(() => {
  // Independent of test file order — see lib/loop/deliver.test.ts for why.
  resetPublishersForTest();
  registerAllPublishers();
  runDir = mkdtempSync(join(tmpdir(), "splash-e2e-deliver-"));
  mkdirSync(join(runDir, "elements", "e1"), { recursive: true });
  writeFileSync(join(runDir, "elements", "e1", "static.png"), "artifact-bytes");
});
afterEach(() => rmSync(runDir, { recursive: true, force: true }));

const decor = () => ({
  ...neutralDecor(),
  state: {
    ...DEFAULT_NEWSROOM_STATE,
    capabilities: { zip: { enabled: true } },
  },
});

// A produced run: angle confirmed, form chosen, artifact fresh — a real manifest shape, built
// the same way every other loop test builds one, not read from a static file.
function producedRun(): RunManifest {
  const base: RunManifest = {
    runId: "r-e2e-deliver",
    schemaVersion: 3,
    input: { data: { path: "input/data.csv", sha256: "input-sha" } },
    orient: {
      profile: { columns: ["a"], numericColumns: ["a"], rowCount: 3 },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway: "Housing costs rose fastest in Annemasse.",
          altInsight: "Rents outpaced wages three years running.",
          unit: "CHF",
        },
        proposal: {
          options: [{ id: "o1", nativeType: "line", why: "trend over time" }],
          chosenId: "o1",
        },
      },
    ],
    events: [],
  };
  const el = base.elements[0]!;
  return {
    ...base,
    elements: [
      {
        ...el,
        artifact: {
          path: "elements/e1/static.png",
          sha256: "artifact-sha",
          provenanceHash: provenanceHash(base, el),
          producedAt: "2026-07-25T00:00:00.000Z",
        },
      },
    ],
  };
}

describe("delivering a produced element, end to end and offline", () => {
  it("should publish to zip, then fall back out of delivered once the angle is revised", async () => {
    const produced = producedRun();
    // The journalist chooses the destination — that decision is the caller's, not the driver's.
    let run: RunManifest = {
      ...produced,
      elements: [
        {
          ...produced.elements[0]!,
          delivery: { requested: ["zip"], delivered: [] },
        },
      ],
    };
    expect(nextActions(run)).toEqual(["deliver"]);

    run = await advance(run, runDir, decor());
    expect(gateStateOf(run, run.elements[0]!)).toBe("delivered");

    const rec = run.elements[0]!.delivery!.delivered[0]!;
    const archive = unzipSync(readFileSync(join(runDir, rec.artifact!.path)));
    expect(Object.keys(archive).sort()).toEqual([
      "EMBED.txt",
      "README.md",
      "index.html",
      "metadata.json",
    ]);

    // The revisitable beat: changing the emphasis must not leave the state claiming the
    // published package is current.
    const revised = {
      ...run,
      elements: [
        {
          ...run.elements[0]!,
          angle: { ...run.elements[0]!.angle!, emphasis: "Genève" },
        },
      ],
    };
    expect(gateStateOf(revised, revised.elements[0]!)).toBe("stale");
    expect(nextActions(revised)).toEqual(["produce"]);
  });
});
