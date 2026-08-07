import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

// WIRING AND WAKING, on the real chain.
//
// tests/source-provenance.test.ts proves the confrontation; this proves the SPINE performs it —
// deleting the call from produce-all.mjs leaves the pure tests green and turns these red. Same
// reason produce-all-place-provenance.test.ts exists: this repo has paid more than once for a
// guard whose verification path avoided the wiring.
//
// The last block is the one that matters most. DEFECT B (source-guard.ts) has been in the tree,
// wired, and unreachable in practice: it compares the shipped source against `sourceHint`, and a
// run that never threaded the hint disarmed it for free. Here the receipt makes the threading
// compulsory, and the SAME run then fails DEFECT B on the collapse it was written for. A dormant
// guard that stays green when woken proves nothing — this is it firing.
const CLI = resolve(import.meta.dir, "../scripts/produce-all.mjs");
const WRITER = resolve(
  import.meta.dir,
  "../../suggest-article/scripts/save-opportunities.mjs",
);

const QUOTE = "les frontaliers ont presque doublé depuis 2015";
const GENERIC = "Chiffres tels que rapportés dans cet article";

function fixture(
  over: Record<string, unknown> = {},
  specOver: Record<string, unknown> = {},
) {
  const dir = mkdtempSync(join(tmpdir(), "splash-source-"));
  const outDir = join(dir, "out");
  mkdirSync(outDir, { recursive: true });
  const accepted = join(dir, "accepted.json");
  writeFileSync(
    accepted,
    JSON.stringify([
      {
        id: "frontaliers",
        producer: "chart-native",
        format: "static",
        channel: "article-web",
        confirmedTakeaway: "Les frontaliers ont presque doublé depuis 2015.",
        skillsInvoked: ["splash:cadrage-direct"],
        anchor: { quote: QUOTE },
        spec: {
          nativeType: "line",
          title: "Frontaliers",
          altInsight: "a",
          unit: "u",
          data: "year,n\n2015,40\n2023,73",
          source: { name: GENERIC },
          ...specOver,
        },
        ...over,
      },
    ]),
  );
  return { dir, outDir, accepted };
}

/** The receipt written by the SANCTIONED WRITER, not hand-planted — so these tests also prove the
 *  two halves agree about the file's shape.
 *
 *  It carries a SECOND claim the article credited to nobody, which is what an ordinary article
 *  looks like and is also what keeps these tests honest: with one attributed opportunity and
 *  nothing else, L3 (total absence) fires on the same fixture as L1 and a disabled L1 stays
 *  invisible. Measured by mutation — the single-opportunity version of this file stayed green
 *  with L1 removed. */
function writeReceipt(dir: string, hint: unknown) {
  execFileSync(
    "bun",
    [
      WRITER,
      dir,
      "--payload",
      JSON.stringify({
        proposals: [
          {
            claim: "Les frontaliers sont passés de 40k à 73k",
            intent: "Comment les frontaliers ont-ils augmenté ?",
            anchor: { quote: QUOTE, paragraphIndex: 3 },
            ...(hint ? { sourceHint: hint } : { noSourceNamed: true }),
          },
          {
            claim: "Le budget a dépassé de 40 %",
            intent: "De combien le budget a-t-il dépassé ?",
            noSourceNamed: true,
          },
        ],
      }),
    ],
    { encoding: "utf8" },
  );
}

// TWO SURFACES, and the difference is load-bearing. A batch-terminal gate refusal (①-④) goes to
// stderr and stops the run before any engine; a per-proposal validation failure rides the REPORT
// on stdout, because produceAll is drop-proof — one bad element must not kill its siblings. The
// receipt gate speaks on `err`, DEFECT B on `out`, and a test that watched only one of them would
// call the other silent.
function run(f: { dir: string; outDir: string; accepted: string }) {
  const p = Bun.spawnSync(["bun", CLI, f.accepted, f.outDir, f.dir]);
  return {
    code: p.exitCode,
    err: p.stderr.toString(),
    out: p.stdout.toString(),
  };
}

describe("produce-all — an attribution the proposal did not carry stops the batch", () => {
  it("refuses, naming the organisation the article credited", () => {
    const f = fixture();
    try {
      writeReceipt(f.dir, { name: "Insee" });
      const r = run(f);
      expect(r.code).toBe(1);
      expect(r.err).toContain("Insee");
      // A refusal deviates: it names the act that resolves it.
      expect(r.err).toContain("credit what the article credited");
    } finally {
      rmSync(f.dir, { recursive: true, force: true });
    }
  });

  it("says nothing when the analysis recorded that the article named nobody", () => {
    const f = fixture();
    try {
      writeReceipt(f.dir, null);
      const r = run(f);
      expect(r.err).not.toContain("credit what the article credited");
    } finally {
      rmSync(f.dir, { recursive: true, force: true });
    }
  });

  it("says nothing at all on a run that persisted no article analysis", () => {
    const f = fixture();
    try {
      const r = run(f);
      expect(r.err).not.toContain("credit what the article credited");
    } finally {
      rmSync(f.dir, { recursive: true, force: true });
    }
  });

  it("refuses an attribution the article never gave, so inventing one is not the way past", () => {
    const f = fixture({ sourceHint: { name: "Eurostat" } });
    try {
      writeReceipt(f.dir, { name: "Insee" });
      const r = run(f);
      expect(r.code).toBe(1);
      expect(r.err).toContain("Eurostat");
    } finally {
      rmSync(f.dir, { recursive: true, force: true });
    }
  });
});

// --- THE POINT OF THE WHOLE EXERCISE ---------------------------------------------------------
describe("the guard that was dormant now fires on the real chain", () => {
  it("threading the hint the receipt demands makes DEFECT B refuse the collapse it was written for", () => {
    // The run the QA finding described: the article credits Insee, the deliverable ships the
    // generic honest-fallback, and the named organisation is gone. Before the receipt, omitting
    // `sourceHint` made this pass in silence.
    const f = fixture({ sourceHint: { name: "Insee" } });
    try {
      writeReceipt(f.dir, { name: "Insee" });
      const r = run(f);
      expect(r.code).toBe(1);
      expect(r.out).toContain("generic honest-fallback");
      expect(r.out).toContain("Insee");
      expect(r.out).toContain('"status": "failed"');
    } finally {
      rmSync(f.dir, { recursive: true, force: true });
    }
  });

  it("and passes that guard once the deliverable actually credits the organisation", () => {
    const f = fixture(
      { sourceHint: { name: "Insee" } },
      { source: { name: "Insee" } },
    );
    try {
      writeReceipt(f.dir, { name: "Insee" });
      const r = run(f);
      // It may still fail further down (no engine key in this sandbox) — what it must NOT do is
      // raise either source refusal.
      expect(r.out).not.toContain("generic honest-fallback");
      expect(r.err).not.toContain("credit what the article credited");
    } finally {
      rmSync(f.dir, { recursive: true, force: true });
    }
  });

  it("omitting the record is not the way to pass: no hint, and the run stops before any engine", () => {
    const f = fixture();
    try {
      writeReceipt(f.dir, { name: "Insee" });
      const r = run(f);
      expect(r.code).toBe(1);
      // Refused at the gate, so nothing was half-built for a later step to work around.
      expect(r.err).toContain("carries no `sourceHint`");
    } finally {
      rmSync(f.dir, { recursive: true, force: true });
    }
  });
});
