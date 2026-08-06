import { describe, expect, it } from "bun:test";
import type { BrowserProbeResult } from "../../lib/newsroom/probe.ts";
import {
  DEFAULT_NEWSROOM_STATE,
  type NewsroomState,
} from "../../lib/newsroom/state.ts";
import { preflightModel, type PreflightModel } from "./model.ts";

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

function capability(m: PreflightModel, id: string) {
  return [...m.engines, ...m.delivery].find((c) => c.id === id);
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

describe("the capabilities the page offers", () => {
  it("offers every engine and every delivery target, split by kind", () => {
    const m = model();
    expect(m.engines.map((c) => c.id)).toContain("chart-native");
    expect(m.delivery.map((c) => c.id)).toContain("embed-cloudflare");
    expect(m.engines.every((c) => c.kind === "engine")).toBe(true);
    expect(m.delivery.every((c) => c.kind === "delivery")).toBe(true);
  });

  it("shows a declared-but-unbuilt adapter as unavailable, with its reason, and never as a blocker", () => {
    const m = model({
      state: state({ capabilities: { "embed-fly": { enabled: true } } }),
    });
    const fly = capability(m, "embed-fly");
    expect(fly?.available).toBe(false);
    expect(fly?.status).toBe("disabled");
    expect(fly?.reason).not.toBe("");
    expect(m.blockers.map((b) => b.id)).not.toContain("embed-fly");
  });

  it("reports an enabled capability whose key is missing as a blocker, in newsroom language", () => {
    const m = model({
      state: state({ capabilities: { "dw-chart": { enabled: true } } }),
    });
    expect(capability(m, "dw-chart")?.status).toBe("missing");
    expect(m.blockers.map((b) => b.id)).toEqual(["dw-chart"]);
    expect(m.blockers[0]!.reason).toContain("Datawrapper charts");
  });

  it("never reports a capability the newsroom did not enable — not green, not red", () => {
    const m = model({ env: { DATAWRAPPER_API_TOKEN: "x" } });
    expect(capability(m, "dw-chart")?.status).toBe("disabled");
    expect(capability(m, "dw-chart")?.reason).toBe("");
    expect(m.blockers).toEqual([]);
  });

  it("keeps the portable package always ready — no host configured is a working path", () => {
    const m = model({
      state: state({ capabilities: { zip: { enabled: true } } }),
    });
    expect(capability(m, "zip")?.status).toBe("ready");
  });

  it("carries each capability's fields so the page can nest them under their checkbox", () => {
    const m = model();
    expect(capability(m, "embed-cloudflare")?.fields).toEqual([
      "CLOUDFLARE_API_TOKEN",
      "CLOUDFLARE_ACCOUNT_ID",
      "SPLASH_EMBED_PROJECT",
    ]);
    expect(capability(m, "chart-native")?.fields).toEqual([]);
  });

  it("reports a live check that could not reach the provider as degraded, never as invalid", () => {
    const m = model({
      state: state({
        capabilities: {
          "dw-chart": {
            enabled: true,
            lastVerified: { at: "2026-07-26T10:00:00Z", result: "unreachable" },
          },
        },
      }),
      env: { DATAWRAPPER_API_TOKEN: "tok" },
    });
    expect(capability(m, "dw-chart")?.status).toBe("unverified");
    expect(m.blockers).toEqual([]);
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

  it("counts the three states the page summarises", () => {
    const m = model({
      state: state({
        capabilities: {
          "chart-native": { enabled: true },
          "dw-chart": { enabled: true },
        },
      }),
      resolveDep: () => true,
      probeBrowser: BROWSER_READY,
    });
    expect(m.summary.ready).toBe(1);
    expect(m.summary.missing).toBe(1);
    expect(m.summary.degraded).toBe(0);
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

// The page lets a journalist tick a capability that the SAVED state has disabled — and must then
// say what that tick means ("Missing: needs a MapTiler key"), without the client re-implementing
// readiness. So the model carries both: the status as saved, and the status this capability
// WOULD have if it were on.
describe("the status a capability would have if it were ticked", () => {
  it("says what a currently-disabled capability is missing", () => {
    const m = model();
    expect(capability(m, "map-native")?.status).toBe("disabled");
    expect(capability(m, "map-native")?.statusIfEnabled).toBe("missing");
  });

  it("says ready when the key is already in .env, so ticking it is instantly green", () => {
    const m = model({ env: { DATAWRAPPER_API_TOKEN: "tok" } });
    expect(capability(m, "dw-chart")?.statusIfEnabled).toBe("ready");
  });

  it("stays honest for a capability that is only declared", () => {
    expect(capability(model(), "embed-fly")?.statusIfEnabled).toBe("disabled");
  });
});

// Issue #5's actual complaint is the VOCABULARY: readiness explains itself with env var names
// ("needs VITE_MAPTILER_KEY or REMOTION_MAPTILER_KEY"), which is right for a log and wrong for the
// page a journalist reads. The model therefore also names WHICH FIELDS are missing, so the page
// can say "Needs: MapTiler key" and put the var name in the technical detail where it belongs.
describe("what is missing, in the page's own words", () => {
  it("names the fields a capability still needs, not its env vars", () => {
    expect(capability(model(), "map-native")?.missingFields).toEqual([
      "VITE_MAPTILER_KEY",
    ]);
    expect(capability(model(), "embed-cloudflare")?.missingFields).toEqual([
      "CLOUDFLARE_API_TOKEN",
      "CLOUDFLARE_ACCOUNT_ID",
      "SPLASH_EMBED_PROJECT",
    ]);
  });

  it("names nothing when the keys are in place — a missing DEPENDENCY is not a missing field", () => {
    const m = model({ env: { VITE_MAPTILER_KEY: "mt" } });
    expect(capability(m, "map-native")?.missingFields).toEqual([]);
    expect(capability(m, "image-native")?.missingFields).toEqual([]);
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
