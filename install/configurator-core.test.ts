import { test, expect } from "bun:test";
import { writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  serializeEnv,
  renderConfiguratorHtml,
  RUNTIMES,
} from "./configurator-core.ts";

const base = {
  runtime: "claude",
  maptiler: "MT",
  datawrapper: "DW",
  anthropic: "",
  embedProject: "",
  cloudflareToken: "",
  cloudflareAccount: "",
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

test("serializeEnv quotes a value containing a space intact", () => {
  // Some provider credentials carry a literal space; unquoted values silently broke the
  // POSIX launcher, so the quoting must survive regardless of which provider is configured.
  const env = serializeEnv({ ...base, cloudflareToken: "tok en with spaces" });
  expect(env).toContain('CLOUDFLARE_API_TOKEN="tok en with spaces"');
});

test("serializeEnv trims and strips quote/newline that would corrupt the .env file", () => {
  const env = serializeEnv({
    ...base,
    maptiler: "  MT  ",
    embedProject: 'a"b\nc',
  });
  expect(env).toContain('VITE_MAPTILER_KEY="MT"'); // trimmed
  expect(env).toContain('SPLASH_EMBED_PROJECT="abc"'); // " and \n dropped
  expect(env).not.toContain("\nc"); // no injected extra env line
});

test("serialized .env sources cleanly in bash with a spaced token value (launcher contract)", () => {
  // The macOS/Linux launcher does `set -a && . ./.env` — the exact failure that unquoted values
  // caused. Prove the quoted form survives a real bash source.
  const env = serializeEnv({
    ...base,
    maptiler: "MTKEY",
    cloudflareToken: "tok en with spaces",
  });
  const p = join(tmpdir(), `splash-env-test-${process.pid}.env`);
  writeFileSync(p, env);
  try {
    // Mirror the launcher exactly: `set -a && . ./.env && set +a`.
    const script = `set -a; . '${p}'; set +a; printf '%s|%s' "$VITE_MAPTILER_KEY" "$CLOUDFLARE_API_TOKEN"`;
    const r = Bun.spawnSync(["bash", "-c", script]);
    expect(r.exitCode).toBe(0); // unquoted space used to abort sourcing with exit 127
    expect(r.stdout.toString()).toBe("MTKEY|tok en with spaces");
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
