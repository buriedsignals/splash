import { describe, expect, it } from "bun:test";
import type { NewsroomCapability } from "../../lib/newsroom/capabilities.ts";
import type { BrowserProbeResult } from "../../lib/newsroom/probe.ts";
import {
  capabilityReadiness,
  readinessBlockers,
} from "../../lib/newsroom/readiness.ts";
import {
  DEFAULT_NEWSROOM_STATE,
  type NewsroomState,
} from "../../lib/newsroom/state.ts";
import {
  describeCapability,
  preflightModel,
  type PreflightModel,
} from "./model.ts";

// The "declared but not built" exemplar. No capability in the shipped registry is only-declared
// any more (Fly.io, the last one, was dropped — lib/newsroom/capabilities.test.ts's "every
// capability the page offers is actually built") — this local stub — the same one
// lib/newsroom/readiness.test.ts uses — is what stands in for one, fed through the REAL
// capabilityReadiness/readinessBlockers/describeCapability rather than the real registry.
const UNBUILT: NewsroomCapability = {
  id: "embed-nowhere",
  label: "A destination that is declared but not built",
  kind: "delivery",
  env: [],
  envHelp: {},
  criticalDeps: null,
  implemented: false,
};

// chart-native's criticalDeps include "remotion", which also runs the real browser probe
// (a filesystem stat) unless stubbed — pinning it here keeps this test's result independent of
// whatever happens to be extracted under skills/chart-native/node_modules/.remotion on the
// machine running it. Same DI pattern as resolveDep, see lib/newsroom/readiness.test.ts.
const BROWSER_READY = (): BrowserProbeResult => ({
  status: "ready",
  executablePath: "/stub/chrome-headless-shell",
});

function state(over: Partial<NewsroomState> = {}): NewsroomState {
  return { ...DEFAULT_NEWSROOM_STATE, capabilities: {}, ...over };
}

function model(
  over: Parameters<typeof preflightModel>[0] = {},
): PreflightModel {
  return preflightModel({ state: state(), env: {}, ...over });
}

function field(m: PreflightModel, name: string) {
  return m.fields.find((f) => f.name === name);
}

// Task 5 (2026-08-06): only a DELIVERY destination is still a ticked `PreflightCapability` row —
// an engine renders from `producible` instead (see the `producible` helper below).
function capability(m: PreflightModel, id: string) {
  return m.delivery.find((c) => c.id === id);
}

function producible(m: PreflightModel, id: string) {
  return m.producible.find((p) => p.id === id);
}

describe("the credential fields the page asks for", () => {
  it("asks for a shared credential ONCE, naming every capability it serves", () => {
    const dw = field(model(), "DATAWRAPPER_API_TOKEN");
    expect(
      model().fields.filter((f) => f.name === "DATAWRAPPER_API_TOKEN"),
    ).toHaveLength(1);
    expect(dw?.capabilities.sort()).toEqual(["dw-chart", "map-dw"]);
  });

  it("asks for the MapTiler key once, not once per mirror name", () => {
    const m = model();
    expect(m.fields.filter((f) => f.name.includes("MAPTILER"))).toHaveLength(1);
    expect(field(m, "VITE_MAPTILER_KEY")?.capabilities.sort()).toEqual([
      "map-native",
      "scrolly",
    ]);
  });

  it("never uses the env var name as a field's own label — that is issue #5's complaint", () => {
    for (const f of model().fields) {
      expect(f.label).not.toBe(f.name);
      expect(f.label.length).toBeGreaterThan(0);
    }
    // "Where do I get this?" is the question a CREDENTIAL raises, and every credential answers
    // it. A settings field (an S3 bucket name) is a value the newsroom already knows; its own
    // label is the guidance, and the registry has no envHelp entry for it by construction.
    for (const f of model().fields.filter((f) => f.destination === "env"))
      expect(f.help.length).toBeGreaterThan(0);
  });

  it("marks a credential already present in .env as configured", () => {
    const m = model({ env: { DATAWRAPPER_API_TOKEN: "dw-secret-value" } });
    expect(field(m, "DATAWRAPPER_API_TOKEN")?.configured).toBe(true);
    expect(field(m, "VITE_MAPTILER_KEY")?.configured).toBe(false);
  });

  it("NEVER carries a secret's value — the page shows that it is set, never what it is", () => {
    const m = model({
      env: {
        DATAWRAPPER_API_TOKEN: "dw-secret-value",
        CLOUDFLARE_API_TOKEN: "cf-secret-value",
        CLOUDFLARE_ACCOUNT_ID: "acct-1234",
        VITE_MAPTILER_KEY: "mt-secret-value",
      },
    });
    const serialized = JSON.stringify(m);
    expect(serialized).not.toContain("dw-secret-value");
    expect(serialized).not.toContain("cf-secret-value");
    expect(serialized).not.toContain("mt-secret-value");
    // Non-secret identifiers are not secrets, but the model still does not echo them: the page
    // re-collects them the same way, and one rule is easier to keep than two.
    expect(serialized).not.toContain("acct-1234");
  });

  // Decision (2026-08-06): the production keys are asked outright. A newsroom should not have to
  // tick a box to be allowed to hand over the token it already has. Publication destinations keep
  // asking on choice — a newsroom that delivers a file has no S3 account to give.
  it("marks the production keys as asked upfront, and only those", () => {
    const m = model();
    const upfront = m.fields
      .filter((f) => f.upfront)
      .map((f) => f.name)
      .sort();
    expect(upfront).toEqual(["DATAWRAPPER_API_TOKEN", "VITE_MAPTILER_KEY"]);
    for (const f of m.fields)
      if (f.name.startsWith("CLOUDFLARE_") || f.name.startsWith("SPLASH_S3_"))
        expect(f.upfront).toBe(false);
  });

  // There is no tick left to gate the ASK at all (Task 5, 2026-08-06 — the checkbox itself is
  // gone, not only its effect on the field). The two keys are still there on a bare fresh state.
  it("asks for them on a completely fresh, unconfigured install", () => {
    const m = model({ state: state({}) });
    const names = m.fields.filter((f) => f.upfront).map((f) => f.name);
    expect(names).toContain("DATAWRAPPER_API_TOKEN");
    expect(names).toContain("VITE_MAPTILER_KEY");
  });

  it("is PURE — an injected empty env wins over a populated process.env", () => {
    process.env.SPLASH_MODEL_PURITY_PROBE = "x";
    try {
      const m = preflightModel({ state: state(), env: {} });
      expect(m.fields.every((f) => !f.configured)).toBe(true);
    } finally {
      delete process.env.SPLASH_MODEL_PURITY_PROBE;
    }
  });
});

describe("what the newsroom will be able to produce — no tick, ever (Task 5, 2026-08-06)", () => {
  it("derives what the newsroom can produce from what is configured", () => {
    const m = model({ env: { DATAWRAPPER_API_TOKEN: "t" } });
    const byId = Object.fromEntries(m.producible.map((p) => [p.id, p]));
    expect(byId["chart-native"]!.available).toBe(true); // no account needed
    expect(byId["dw-chart"]!.available).toBe(true); // its token is set
    expect(byId["map-native"]!.available).toBe(false); // no MapTiler key here
    expect(byId["map-native"]!.opensWith).toContain("MapTiler");
  });

  // The submission stops carrying a tick list at all, and so does the model: there is no
  // `engines` array left to render as checkboxes.
  it("no longer carries a ticked engines list", () => {
    expect(Object.keys(model())).not.toContain("engines");
  });

  it("names the checkbox caption, not the plain label, as the producible row's own words", () => {
    const m = model();
    expect(producible(m, "dw-chart")?.label).toBe("With a Datawrapper account");
    expect(producible(m, "chart-native")?.label).toBe(
      "In-house, no account needed (includes video)",
    );
  });

  // A live check that could not REACH the provider is not a failure (readiness.ts's own rule) —
  // withholding it from the constat would tell a journalist their key is broken when it may well
  // still work.
  it("counts an engine whose last check could not reach the provider as available", () => {
    const m = model({
      state: state({
        capabilities: {
          "dw-chart": {
            enabled: true, // vestigial for an engine — readiness.ts ignores it now
            lastVerified: { at: "2026-07-26T10:00:00Z", result: "unreachable" },
          },
        },
      }),
      env: { DATAWRAPPER_API_TOKEN: "tok" },
    });
    expect(producible(m, "dw-chart")?.available).toBe(true);
  });

  // The old blocker-and-checkbox system reported an unticked engine as neither ready nor
  // failing; the new one reports it as UNAVAILABLE outright, in `producible`, and never as a
  // BLOCKER — blockers are for a publishing choice, which an engine is not.
  it("lists an unconfigured engine as unavailable in producible, never as a blocker", () => {
    const m = model({ env: {} });
    expect(producible(m, "dw-chart")?.available).toBe(false);
    expect(producible(m, "dw-chart")?.opensWith).toContain("Datawrapper");
    expect(m.blockers.map((b) => b.id)).not.toContain("dw-chart");
  });

  it("names nothing when the keys are in place — a missing DEPENDENCY is not a missing field", () => {
    const m = model({ env: { VITE_MAPTILER_KEY: "mt" } });
    expect(producible(m, "map-native")?.opensWith).toBeUndefined();
    expect(producible(m, "image-native")?.opensWith).toBeUndefined();
  });

  it("counts every engine once, matching the registry's own engine list", () => {
    const m = model();
    expect(m.producible).toHaveLength(6);
    expect(m.producible.map((p) => p.id).sort()).toEqual(
      [
        "dw-chart",
        "map-dw",
        "chart-native",
        "map-native",
        "scrolly",
        "image-native",
      ].sort(),
    );
  });
});

describe("the delivery destinations the page still gates on a choice", () => {
  it("offers every delivery target, all of kind delivery", () => {
    const m = model();
    expect(m.delivery.map((c) => c.id)).toContain("embed-cloudflare");
    expect(m.delivery.every((c) => c.kind === "delivery")).toBe(true);
  });

  it("shows a declared-but-unbuilt adapter as unavailable, with its reason, and never as a blocker", () => {
    const st = state({
      capabilities: { "embed-nowhere": { enabled: true } },
    });
    const readiness = capabilityReadiness(UNBUILT, st, { env: {} });
    const fly = describeCapability(UNBUILT, readiness, readiness, st, {});
    expect(fly.available).toBe(false);
    expect(fly.status).toBe("disabled");
    expect(fly.reason).not.toBe("");
    expect(readinessBlockers([readiness]).map((b) => b.id)).not.toContain(
      "embed-nowhere",
    );
  });

  // Task 5 (2026-08-06): the OLD "never reports a capability the newsroom did not enable" rule —
  // the one just retired for engines — is exactly what a DELIVERY destination keeps: it is a
  // choice, not a want, so an unchosen one stays disabled whatever credentials sit beside it.
  it("never reports an unchosen delivery destination — not green, not red", () => {
    const m = model({
      env: {
        CLOUDFLARE_API_TOKEN: "x",
        CLOUDFLARE_ACCOUNT_ID: "y",
        SPLASH_EMBED_PROJECT: "z",
      },
    });
    expect(capability(m, "embed-cloudflare")?.status).toBe("disabled");
    expect(capability(m, "embed-cloudflare")?.reason).toBe("");
    expect(m.blockers).toEqual([]);
  });

  it("keeps the portable package always ready — no host configured is a working path", () => {
    const m = model({
      state: state({ capabilities: { zip: { enabled: true } } }),
    });
    expect(capability(m, "zip")?.status).toBe("ready");
  });

  it("carries each destination's fields so the page can nest them under their choice", () => {
    const m = model();
    expect(capability(m, "embed-cloudflare")?.fields).toEqual([
      "CLOUDFLARE_API_TOKEN",
      "CLOUDFLARE_ACCOUNT_ID",
      "SPLASH_EMBED_PROJECT",
    ]);
  });

  // Delivery never had a caption of its own — capabilityRow falls back to `label` for it.
  it("has no checkbox caption distinct from its label", () => {
    expect(capability(model(), "zip")?.choice).toBeUndefined();
  });
});

describe("the rest of the decor the page renders", () => {
  it("leads in English on a fresh install (#6) and offers the runtimes", () => {
    const m = model();
    expect(m.language.ui).toBe("en");
    expect(m.runtimes.map((r) => r.id)).toContain("claude");
    expect(m.runtime).toBe("claude");
  });

  it("keeps the language a migrated newsroom already works in", () => {
    expect(model({ state: state({ uiLang: "fr" }) }).language.ui).toBe("fr");
  });

  it("reports the content language as read-only when the profile already exists", () => {
    expect(model({ profileExists: true }).profileExists).toBe(true);
    expect(model({ profileExists: false }).profileExists).toBe(false);
  });

  it("carries the section to focus, so ?section= can open on what is missing", () => {
    expect(model({ focus: "embed-cloudflare" }).focus).toBe("embed-cloudflare");
    expect(model().focus).toBeUndefined();
  });

  // The summary now counts EVERY capability's real readiness (engines included — they are always
  // in play), not only whichever ones a fixture happened to tick before this task.
  it("counts the three states the page summarises", () => {
    const m = model({
      env: {
        DATAWRAPPER_API_TOKEN: "t",
        VITE_MAPTILER_KEY: "k",
      },
      resolveDep: () => true,
      probeBrowser: BROWSER_READY,
    });
    // Every one of the 6 engines resolves ready with both keys present and every dependency
    // stubbed ready; no delivery destination was chosen, so none of the 5 counts either way.
    expect(m.summary.ready).toBe(6);
    expect(m.summary.missing).toBe(0);
    expect(m.summary.degraded).toBe(0);
  });

  it("counts an engine missing its key as missing in the summary", () => {
    const m = model({
      env: { DATAWRAPPER_API_TOKEN: "t" }, // no MapTiler key
      resolveDep: () => true,
      probeBrowser: BROWSER_READY,
    });
    expect(m.summary.missing).toBeGreaterThan(0);
  });
});

// The runtime's own sign-in — declared by the registry, never a capability. The page shows one
// login field for the SELECTED runtime, but the journalist can switch runtimes before saving, so
// `configured` must be correct for every runtime the page can offer, not only the one it opened
// with (Finding 1: switching runtimes used to report a configured key as missing).
describe("the runtime's own login", () => {
  it("reports the selected runtime's login as configured when its env var is set", () => {
    const m = model({
      state: state({ runtime: "claude" }),
      env: { ANTHROPIC_API_KEY: "sk-ant-x" },
    });
    expect(m.login?.name).toBe("ANTHROPIC_API_KEY");
    expect(m.login?.configured).toBe(true);
  });

  it("reports the selected runtime's login as NOT configured when its env var is unset", () => {
    const m = model({ state: state({ runtime: "claude" }), env: {} });
    expect(m.login?.name).toBe("ANTHROPIC_API_KEY");
    expect(m.login?.configured).toBe(false);
  });

  it("reports null for a runtime that declares no login", () => {
    expect(model({ state: state({ runtime: "goose" }) }).login).toBeNull();
  });

  // NEVER carries the value — same rule as every other credential (probe.ts's isSet), asserted
  // here because a login is not routed through collectFields like the rest of the credentials.
  it("never echoes the login's actual value — only whether it is set", () => {
    const serialized = JSON.stringify(
      model({
        state: state({ runtime: "claude" }),
        env: { ANTHROPIC_API_KEY: "sk-ant-super-secret" },
      }),
    );
    expect(serialized).not.toContain("sk-ant-super-secret");
  });

  // Finding 1's fix: EVERY runtime's login carries its own `configured`, not only the one the
  // page happened to be served with — a journalist who set up Gemini earlier and reopens the
  // page on Claude must see Gemini reported as configured the instant they pick it, without a
  // round trip to the server.
  it("carries a configured flag PER RUNTIME, independent of which one is selected", () => {
    const m = model({
      state: state({ runtime: "claude" }),
      env: { GEMINI_API_KEY: "gk-x" },
    });
    const runtime = (id: string) => m.runtimes.find((r) => r.id === id);
    expect(runtime("gemini")?.login?.configured).toBe(true);
    expect(runtime("claude")?.login?.configured).toBe(false);
  });

  it("carries null for every runtime that declares no login, in the runtimes list too", () => {
    const m = model();
    for (const id of ["goose", "goose-desktop", "claude-desktop"])
      expect(m.runtimes.find((r) => r.id === id)?.login).toBeNull();
  });
});

// I1: `selectable` is what the radio must gate on — `verified` alone let a Windows install pick a
// macOS-only app (goose-desktop, claude-desktop ship no .ps1), type its keys, sit through the
// whole install, and only then die at bootstrap.ps1's dispatch.
describe("runtime selectability is platform-scoped (I1)", () => {
  it("offers the macOS-only desktop apps on macOS, not on Windows", () => {
    const mac = model({ platform: "darwin" });
    expect(mac.runtimes.find((r) => r.id === "goose-desktop")?.selectable).toBe(
      true,
    );
    expect(
      mac.runtimes.find((r) => r.id === "claude-desktop")?.selectable,
    ).toBe(true);

    const win = model({ platform: "win32" });
    expect(win.runtimes.find((r) => r.id === "goose-desktop")?.selectable).toBe(
      false,
    );
    expect(
      win.runtimes.find((r) => r.id === "claude-desktop")?.selectable,
    ).toBe(false);
  });

  it("still offers the four CLI runtimes on Windows — each ships a .ps1", () => {
    const win = model({ platform: "win32" });
    for (const id of ["claude", "codex", "gemini", "goose"])
      expect(win.runtimes.find((r) => r.id === id)?.selectable).toBe(true);
  });

  it("verified alone is not enough — selectable is false without a module for the platform", () => {
    const win = model({ platform: "win32" });
    const goose = win.runtimes.find((r) => r.id === "goose-desktop")!;
    expect(goose.verified).toBe(true);
    expect(goose.selectable).toBe(false);
  });
});

// The page lets a journalist choose a delivery destination the SAVED state has not chosen — and
// must then say what that choice means ("Missing: needs a Cloudflare token"), without the client
// re-implementing readiness. So the model carries both: the status as saved, and the status this
// destination WOULD have if it were chosen. An engine has no such preview any more: there is
// nothing left to choose, so `producible.available` already IS the real answer.
describe("the status a delivery destination would have if it were chosen", () => {
  it("says what a currently-unchosen destination is missing, if it were chosen", () => {
    const m = model();
    expect(capability(m, "embed-cloudflare")?.status).toBe("disabled");
    expect(capability(m, "embed-cloudflare")?.statusIfEnabled).toBe("missing");
  });

  it("says ready when the keys are already in .env, so choosing it is instantly green", () => {
    const m = model({
      env: {
        CLOUDFLARE_API_TOKEN: "tok",
        CLOUDFLARE_ACCOUNT_ID: "acct",
        SPLASH_EMBED_PROJECT: "proj",
      },
    });
    expect(capability(m, "embed-cloudflare")?.statusIfEnabled).toBe("ready");
  });

  it("stays honest for a capability that is only declared", () => {
    // Choosing an unbuilt capability must not make it read as ready — capabilityReadiness
    // answers "disabled" for `!implemented` before it even looks at `enabled`, and this is
    // that guarantee surfacing through the model's own field.
    const st = state();
    const allOn = state({
      capabilities: { "embed-nowhere": { enabled: true } },
    });
    const readiness = capabilityReadiness(UNBUILT, st, { env: {} });
    const ifEnabled = capabilityReadiness(UNBUILT, allOn, { env: {} });
    const fly = describeCapability(UNBUILT, readiness, ifEnabled, st, {});
    expect(fly.statusIfEnabled).toBe("disabled");
  });
});

// Issue #5's actual complaint is the VOCABULARY: readiness explains itself with env var names
// ("needs VITE_MAPTILER_KEY or REMOTION_MAPTILER_KEY"), which is right for a log and wrong for the
// page a journalist reads. The model therefore also names WHICH FIELDS are missing, so the page
// can say "Needs: MapTiler key" and put the var name in the technical detail where it belongs.
// The page had the profile under its hand and showed none of it: it replaced the whole section
// with a sentence telling the journalist to open a text editor. The model carries the values so
// the page can show them.
describe("the newsroom profile the model carries", () => {
  it("carries the profile the install already has", () => {
    const m = model({
      profile: {
        name: "Heidi.news",
        url: "https://heidi.news",
        palette: ["#0A5C36", "#C8102E"],
        lang: "fr",
        theme: "dark",
      },
    });
    expect(m.profile?.name).toBe("Heidi.news");
    expect(m.profile?.palette?.[0]).toBe("#0A5C36");
    expect(m.profile?.theme).toBe("dark");
  });

  // A profile that declares little is not an error: no theme means a light ground, no url means a
  // credit without a link. The model passes through what is there and invents nothing.
  it("passes a minimal profile through without inventing fields", () => {
    const m = model({ profile: { name: "Le Temps" } });
    expect(m.profile?.name).toBe("Le Temps");
    expect(m.profile?.palette).toBeUndefined();
    expect(m.profile?.theme).toBeUndefined();
  });

  it("reports no profile when the install has none", () => {
    expect(model().profile).toBeNull();
  });
});

describe("what is missing, in the page's own words", () => {
  it("names the field a delivery destination still needs, not its env vars", () => {
    expect(capability(model(), "embed-cloudflare")?.missingFields).toEqual([
      "CLOUDFLARE_API_TOKEN",
      "CLOUDFLARE_ACCOUNT_ID",
      "SPLASH_EMBED_PROJECT",
    ]);
  });

  // A23's page half. Readiness now answers `missing` for a destination whose non-secret
  // identifiers are unfilled; a blocker the page cannot name falls back to readiness's own
  // sentence, which speaks in `newsroom.json` keys — the vocabulary this whole section exists to
  // avoid. The fields are already on the page (destination "settings"), so it names them.
  it("names an unfilled destination setting, not only a missing key", () => {
    const m = model({
      state: state({ capabilities: { "embed-s3": { enabled: true } } }),
      env: {
        SPLASH_S3_ACCESS_KEY_ID: "id",
        SPLASH_S3_SECRET_ACCESS_KEY: "secret",
      },
    });
    expect(capability(m, "embed-s3")?.status).toBe("missing");
    expect(capability(m, "embed-s3")?.missingFields).toEqual([
      "endpoint",
      "region",
      "bucket",
      "publicBaseUrl",
    ]);
  });

  it("stops naming a setting once the newsroom has filled it", () => {
    const m = model({
      state: state({
        capabilities: {
          "embed-s3": {
            enabled: true,
            settings: {
              endpoint: "https://s3.example.org",
              region: "auto",
              bucket: "newsroom",
              publicBaseUrl: "https://cdn.example.org",
            },
          },
        },
      }),
      env: {
        SPLASH_S3_ACCESS_KEY_ID: "id",
        SPLASH_S3_SECRET_ACCESS_KEY: "secret",
      },
    });
    expect(capability(m, "embed-s3")?.status).toBe("ready");
    expect(capability(m, "embed-s3")?.missingFields).toEqual([]);
  });
});
