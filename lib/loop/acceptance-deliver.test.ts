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
import { deliver } from "./deliver";
import {
  gateStateOf,
  nextActions,
  provenanceHash,
  type RunManifest,
} from "./manifest";
import { generateKeyPairSync } from "node:crypto";
import { loadDecor, neutralDecor } from "../newsroom/decor";
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
    schemaVersion: 6,
    route: "embed",
    channel: "article-web",
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
          excluded: [],
          chosenId: "o1",
        },
      },
    ],
    events: [],
  };
  const el = base.elements[0]!;
  const provenance = provenanceHash(base, el);
  return {
    ...base,
    elements: [
      {
        ...el,
        artifact: {
          path: "elements/e1/static.png",
          sha256: "artifact-sha",
          provenanceHash: provenance,
          producedAt: "2026-07-25T00:00:00.000Z",
        },
        // Produced AND approved. Publishing is gated on an approval covering these exact bytes
        // now (lib/loop/deliver.ts), and this file's subject is the delivery itself — the
        // approval ceremony that WRITES this record is driven for real in
        // lib/loop/approve.test.ts and, end to end through spawned CLI calls, in
        // lib/host/journey.test.ts.
        approved: {
          signoffPath: "signoffs/e1.json",
          approvedProvenanceHash: provenance,
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
    // The fixture's chosen option carries no `format` (defaults to "static", same as
    // produce.ts), and its recorded artifact is elements/e1/static.png — so the archive entry
    // is index.png, never index.html. This used to read "index.html" regardless: the exact bug
    // docs/splash/proposal-brain-followups.md's "publishers serve everything as HTML" entry
    // described, caught here once PublishRequest started carrying a real `format`.
    //
    // "static" is a FILE genre (deliveryGenreFor), not an embed one: the CMS has a native image
    // field with its own alt-text field beside it, so the archive hands over the alt text
    // (ALT.txt) instead of an embed snippet — there is no EMBED.txt and no `snippet` on the
    // outcome for this format.
    expect(Object.keys(archive).sort()).toEqual([
      "ALT.txt",
      "README.md",
      "index.png",
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

  // The driver is the ONLY production caller of deliver(), and it used to leave the profile at
  // its `{}` default — so spec §3.5 (source/credit/lang come from NEWSROOM-PROFILE.md) held
  // only for tests that passed a profile by hand. A French newsroom's package said
  // "Provided by the newsroom" and lang "en". The profile now rides on the decor the driver
  // already receives, which is why this test goes through advance(), not through deliver().
  it("carries the newsroom's own source, credit and content language into the delivered package", async () => {
    const install = mkdtempSync(join(tmpdir(), "splash-newsroom-fr-"));
    writeFileSync(
      join(install, "NEWSROOM-PROFILE.md"),
      [
        "---",
        "lang: fr",
        "source:",
        "  name: Heidi.news",
        'credit: "Graphique : Heidi.news"',
        "---",
        "",
      ].join("\n"),
    );
    try {
      // The real decor of that install, read from disk — not a hand-built literal.
      const decor = loadDecor(install, { env: {} });
      const produced = producedRun();
      const run: RunManifest = {
        ...produced,
        elements: [
          {
            ...produced.elements[0]!,
            delivery: { requested: ["zip"], delivered: [] },
          },
        ],
      };

      const after = await advance(run, runDir, decor);
      expect(after.events).toHaveLength(0);
      const rec = after.elements[0]!.delivery!.delivered[0]!;
      const archive = unzipSync(readFileSync(join(runDir, rec.artifact!.path)));
      const meta = JSON.parse(
        new TextDecoder().decode(archive["metadata.json"]!),
      );
      expect(meta).toMatchObject({
        lang: "fr",
        source: "Heidi.news",
        credit: "Graphique : Heidi.news",
      });
    } finally {
      rmSync(install, { recursive: true, force: true });
    }
  });

  // The opt-in editorial gate of spec §3.10 was unreachable in production for the same reason:
  // requiredSigners lives in NEWSROOM-PROFILE.md, and the driver never read it. The legacy
  // path this supersedes (skills/splash/scripts/deploy-embed.mjs) DID enforce it, so the new
  // path was strictly weaker than the old one until the decor carried it.
  it("refuses to publish, through advance(), when the newsroom profile requires a sign-off", async () => {
    const install = mkdtempSync(join(tmpdir(), "splash-newsroom-signers-"));
    // A REAL Ed25519 SPKI key: brand-profile drops a signer whose key does not import, and a
    // requiredSigner with no registered signer is a parse error, not the gate under test.
    const publicBase64 = generateKeyPairSync("ed25519")
      .publicKey.export({ type: "spki", format: "der" })
      .toString("base64");
    writeFileSync(
      join(install, "NEWSROOM-PROFILE.md"),
      [
        "---",
        "signers:",
        `  - yvan:${publicBase64}`,
        "requiredSigners:",
        "  - yvan",
        "---",
        "",
      ].join("\n"),
    );
    try {
      const decor = loadDecor(install, { env: {} });
      const produced = producedRun();
      // The approval removed: this is the run of a newsroom whose editor has NOT signed off.
      const { approved: _approved, ...unapproved } = produced.elements[0]!;
      const run: RunManifest = {
        ...produced,
        elements: [
          { ...unapproved, delivery: { requested: ["zip"], delivered: [] } },
        ],
      };

      // Two independent refusals, and both matter. First the ROUTER: an unapproved artifact
      // owes the verification chain, so advance() never reaches the deliver branch at all —
      // whatever it does run, nothing is published.
      expect(nextActions(run)).toEqual(["capture"]);
      const after = await advance(run, runDir, decor);
      expect(after.elements[0]!.delivery!.delivered).toHaveLength(0);

      // Then the GATE itself, called directly, because a router is not a gate: deliver()
      // refuses in this newsroom's own terms, naming the sign-off it requires. This is the
      // half that proves the decor still reaches deliver — the reason this test exists.
      const refused = await deliver(
        run,
        run.elements[0]!,
        runDir,
        decor,
        decor.profile,
      );
      expect(refused.ok).toBe(false);
      if (!refused.ok) expect(refused.message).toContain("sign-off");
    } finally {
      rmSync(install, { recursive: true, force: true });
    }
  });
});
