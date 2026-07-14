import { test, expect } from "bun:test";
import { writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  serializeEnv,
  renderConfiguratorHtml,
  RUNTIMES,
  verifyMapTiler,
  verifyDatawrapper,
  verifyAnthropic,
} from "./configurator-core.ts";

const base = {
  runtime: "claude",
  maptiler: "MT",
  datawrapper: "DW",
  anthropic: "",
  embedApp: "",
  flyToken: "",
};

test('serializeEnv emits every service key in double-quoted KEY="value" form', () => {
  const env = serializeEnv(base);
  expect(env).toContain('VITE_MAPTILER_KEY="MT"');
  expect(env).toContain('REMOTION_MAPTILER_KEY="MT"');
  expect(env).toContain('DATAWRAPPER_API_TOKEN="DW"');
});

test("serializeEnv OMITS ANTHROPIC_API_KEY when blank (subscription/OAuth path)", () => {
  expect(serializeEnv(base)).not.toContain("ANTHROPIC_API_KEY");
  // whitespace-only is still blank
  expect(serializeEnv({ ...base, anthropic: "   " })).not.toContain(
    "ANTHROPIC_API_KEY",
  );
});

test("serializeEnv INCLUDES ANTHROPIC_API_KEY when provided (API-key path)", () => {
  expect(serializeEnv({ ...base, anthropic: "sk-ant-X" })).toContain(
    'ANTHROPIC_API_KEY="sk-ant-X"',
  );
});

test("serializeEnv quotes a value containing a space (modern fly.io token) intact", () => {
  const env = serializeEnv({ ...base, flyToken: "FlyV1 fm2_abc==,fm1r_xyz" });
  expect(env).toContain('FLY_API_TOKEN="FlyV1 fm2_abc==,fm1r_xyz"');
});

test("serializeEnv trims and strips quote/newline that would corrupt the .env file", () => {
  const env = serializeEnv({
    ...base,
    maptiler: "  MT  ",
    embedApp: 'a"b\nc',
  });
  expect(env).toContain('VITE_MAPTILER_KEY="MT"'); // trimmed
  expect(env).toContain('ATELIER_EMBED_APP="abc"'); // " and \n dropped
  expect(env).not.toContain("\nc"); // no injected extra env line
});

test("serialized .env sources cleanly in bash with a spaced fly token (launcher contract)", () => {
  // The macOS/Linux launcher does `set -a && . ./.env` — the exact failure that unquoted values
  // caused. Prove the quoted form survives a real bash source.
  const env = serializeEnv({
    ...base,
    maptiler: "MTKEY",
    flyToken: "FlyV1 fm2_realmacaroon==",
  });
  const p = join(tmpdir(), `atelier-env-test-${process.pid}.env`);
  writeFileSync(p, env);
  try {
    // Mirror the launcher exactly: `set -a && . ./.env && set +a`.
    const script = `set -a; . '${p}'; set +a; printf '%s|%s' "$VITE_MAPTILER_KEY" "$FLY_API_TOKEN"`;
    const r = Bun.spawnSync(["bash", "-c", script]);
    expect(r.exitCode).toBe(0); // unquoted space used to abort sourcing with exit 127
    expect(r.stdout.toString()).toBe("MTKEY|FlyV1 fm2_realmacaroon==");
  } finally {
    rmSync(p, { force: true });
  }
});

test("configurator HTML marks MapTiler/Datawrapper required and confirms on a blank required key", () => {
  const h = renderConfiguratorHtml();
  expect(h).toContain("(required for maps)");
  expect(h).toContain("(required for Datawrapper charts)");
  expect(h).toContain("confirm("); // soft warn/confirm before saving with a blank required key
  expect(h).toContain(".trim()"); // pasted keys are trimmed client-side
});

test("all four runtimes are verified (codex proven; gemini + goose enabled by decision)", () => {
  expect(RUNTIMES.claude.verified).toBe(true);
  expect(RUNTIMES.codex.verified).toBe(true); // proven end-to-end 2026-07-13 (discovery + nested skill invocation)
  expect(RUNTIMES.gemini.verified).toBe(true); // enabled by decision; Layer A proven, Layer B pending a paid tier
  expect(RUNTIMES.goose.verified).toBe(true); // enabled by decision; Layer A proven + drove the flow, Layer B cut by Gemini quota
});

test("configurator HTML has the fields + the subscription note", () => {
  const h = renderConfiguratorHtml();
  expect(h).toContain('name="maptiler"');
  expect(h).toContain('name="datawrapper"');
  expect(h).toContain('name="anthropic"');
  expect(h.toLowerCase()).toContain("subscription"); // "leave blank if you use a subscription"
});

test("configurator HTML's submit handler refuses to show Saved on a non-2xx /submit response", () => {
  expect(renderConfiguratorHtml()).toContain("if(!r.ok)");
});

const MT = process.env.VITE_MAPTILER_KEY;
const DW = process.env.DATAWRAPPER_API_TOKEN;
const AN = process.env.ANTHROPIC_API_KEY;

test.skipIf(!MT)(
  "verifyMapTiler: true for the real key, false for a bad one",
  async () => {
    expect(await verifyMapTiler(MT!)).toBe(true);
    expect(await verifyMapTiler("not-a-real-key")).toBe(false);
  },

  60000, // real-API round-trips flake past the 5s default under gate contention
);

test.skipIf(!DW)(
  "verifyDatawrapper: true for the real token, false for a bad one",
  async () => {
    expect(await verifyDatawrapper(DW!)).toBe(true);
    expect(await verifyDatawrapper("not-a-real-token")).toBe(false);
  },

  60000, // real-API round-trips flake past the 5s default under gate contention
);

test.skipIf(!AN)(
  "verifyAnthropic: true for the real key, false for a bad one",
  async () => {
    expect(await verifyAnthropic(AN!)).toBe(true);
    expect(await verifyAnthropic("sk-ant-not-real")).toBe(false);
  },

  60000, // real-API round-trips flake past the 5s default under gate contention
);

test("verify* returns null (unreachable), NOT false, when the provider can't be reached", async () => {
  // A valid key behind a filtering proxy / offline / TLS interception makes fetch throw. That
  // must read as 'couldn't reach', never 'invalid' — else a valid key is permanently blocked.
  const realFetch = globalThis.fetch;
  globalThis.fetch = (() => {
    throw new Error("network down");
  }) as typeof fetch;
  try {
    expect(await verifyMapTiler("some-key")).toBeNull();
    expect(await verifyDatawrapper("some-token")).toBeNull();
    expect(await verifyAnthropic("sk-ant-some")).toBeNull();
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("verify* still returns false for a genuinely blank key (never fetches)", async () => {
  expect(await verifyMapTiler("")).toBe(false);
  expect(await verifyDatawrapper("   ")).toBe(false);
  expect(await verifyAnthropic("")).toBe(false);
});
