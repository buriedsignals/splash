/**
 * ROUND-FOUR FINDING 10 (P8): preflight and `offerForms` told the journalist two different things
 * about the same credential, and both skills' documented rules held while they did it.
 *
 *   preflight  : hostedEmbed {available: false, reason: "Cloudflare answered 403"}
 *   offerForms : [embed] Deploy and receive embed code   (no `available: false`, no reason)
 *
 * `offerForms` checked for the PRESENCE of the two environment variables. Presence is not
 * permission, and the whole point of preflight's probe is that it measures the difference.
 *
 * REPRODUCED LIVE, against api.cloudflare.com, on a real beat of
 * `stories/stress-p-transport-ridership` — both variables set, the token one the account does not
 * honour:
 *
 *   preflight probe    -> {"ok":false,"status":400,"detail":"Cloudflare answered 400"}
 *   offerForms embed   -> {"id":"embed", ..., "available":true}
 *
 * HOW THEY ARE RECONCILED, and why this direction. The alternative was to argue that a
 * present-but-refused credential should still be offered, and the measurement is what settles it:
 * `materialise` makes a real network call for this form and nothing else, so an offer taken here
 * fails there, after the journalist chose it. A menu row that cannot be honoured is not an offer.
 * The probe's own words are carried into the row, so the journalist reads ONE account of the same
 * fact wherever they meet it.
 *
 * WHAT DID NOT CHANGE. `offerForms` stays synchronous and makes no network call of its own — the
 * reason its doc comment gives for the presence check ("cheap to call on every turn") is a real
 * constraint and it is kept. The probe result is CARRIED IN, in the same `capabilities` shape
 * `otherFormatsFor` already takes, by the caller that already ran preflight this session. With no
 * capabilities passed, the presence check is exactly what it was.
 *
 * MUTATION-CHECKED: drop the `capabilities` branch from `offerForms` ->
 *   (fail) should refuse the form preflight measured as refused, in preflight's own words
 *   expect(received).toBe(expected)  Expected: false  Received: true
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { offerForms } from "../scripts/deliver.mjs";
import {
  approveCurrentOutput,
  TEST_FINDING_IDS,
  TEST_PLAN_VERSION,
} from "./output-review-fixture";

const PRESENT = {
  CLOUDFLARE_ACCOUNT_ID: "0123456789abcdef0123456789abcdef",
  CLOUDFLARE_API_TOKEN: "a-token-that-is-present",
};

/** What `runPreflight` writes into `capabilities.hostedEmbed` when the probe is refused. */
const REFUSED = {
  hostedEmbed: {
    id: "hosted-embed",
    opens: "the hosted embed delivery form",
    available: false,
    reason: "Cloudflare answered 403",
    companionScriptUrl: null,
    whitelistOptional: true,
    fill: "CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN — record the non-secret account ID under Newsroom, then verify and save a Pages token under Credentials in Splash Readiness setup",
  },
};

const OPEN = {
  hostedEmbed: { ...REFUSED.hostedEmbed, available: true, reason: "Cloudflare answered 200" },
};

let tempRoot: string;
let identity: { storiesRoot: string; storyId: string; outputId: string };

beforeEach(async () => {
  tempRoot = await mkdtemp(join(tmpdir(), "hosted-embed-"));
  const beatDir = join(tempRoot, "story", "beats", "1-rainfall");
  await mkdir(join(beatDir, "renders"), { recursive: true });
  await writeFile(join(beatDir, "renders", "still.html"), "<!doctype html>");
  await approveCurrentOutput(beatDir);
  identity = {
    storiesRoot: dirname(dirname(dirname(beatDir))),
    storyId: basename(dirname(dirname(beatDir))),
    outputId: basename(beatDir),
  };
});
afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

function embedRow(options: Record<string, unknown>) {
  const forms = offerForms({
    ...identity,
    medium: "chart",
    format: "web",
    planVersion: TEST_PLAN_VERSION,
    findingIds: TEST_FINDING_IDS,
    ...options,
  });
  return forms.find((form) => form.id === "embed");
}

describe("the hosted embed form says what preflight measured", () => {
  it("should refuse the form preflight measured as refused, in preflight's own words", () => {
    const row = embedRow({ env: PRESENT, capabilities: REFUSED });

    expect(row?.available).toBe(false);
    expect(row?.reason).toContain("Cloudflare answered 403");
  });

  it("should never say the credential is missing when the credential is present and refused", () => {
    // The wrong repair would be to reuse the not-configured sentence, which tells a journalist
    // with a working setup to go and add the two variables they already have.
    const row = embedRow({ env: PRESENT, capabilities: REFUSED });

    expect(row?.reason).not.toContain("is not configured");
    expect(row?.reason).not.toContain("add CLOUDFLARE_ACCOUNT_ID");
  });

  it("should offer the form when the probe answered yes", () => {
    expect(embedRow({ env: PRESENT, capabilities: OPEN })?.available).toBe(true);
  });

  it("should keep the setup reason when the credentials are absent, whatever a probe said", () => {
    const row = embedRow({ env: {}, capabilities: OPEN });

    expect(row?.available).toBe(false);
    expect(row?.reason).toContain("CLOUDFLARE_ACCOUNT_ID");
  });

  it("should fall back to the presence check when no probe result is handed in", () => {
    // A caller with no preflight in hand is not told a lie either way: the form stays visible and
    // `materialise`'s own network call is where a rejected token fails loudly. This is the
    // behaviour that existed before the fix, kept deliberately rather than by omission.
    expect(embedRow({ env: PRESENT })?.available).toBe(true);
    expect(embedRow({ env: {} })?.available).toBe(false);
  });

  it("should agree with the capability row on every combination, which is the property that failed", () => {
    for (const capabilities of [REFUSED, OPEN]) {
      const row = embedRow({ env: PRESENT, capabilities });
      expect(row?.available).toBe(capabilities.hostedEmbed.available);
    }
  });

  it("should leave every other form alone — a shut credential narrows one row, never the menu", () => {
    const forms = offerForms({
      ...identity,
      medium: "chart",
      format: "web",
      planVersion: TEST_PLAN_VERSION,
      findingIds: TEST_FINDING_IDS,
      env: PRESENT,
      capabilities: REFUSED,
    });

    for (const form of forms.filter((one) => one.id !== "embed")) {
      expect(form.available).toBe(true);
    }
  });
});
