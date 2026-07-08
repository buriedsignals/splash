import { test, expect } from "bun:test";
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
  embedApp: "",
  flyToken: "",
};

test("serializeEnv emits every service key in KEY=value form", () => {
  const env = serializeEnv(base);
  expect(env).toContain("VITE_MAPTILER_KEY=MT");
  expect(env).toContain("REMOTION_MAPTILER_KEY=MT");
  expect(env).toContain("DATAWRAPPER_API_TOKEN=DW");
});

test("serializeEnv OMITS ANTHROPIC_API_KEY when blank (subscription/OAuth path)", () => {
  expect(serializeEnv(base)).not.toContain("ANTHROPIC_API_KEY");
});

test("serializeEnv INCLUDES ANTHROPIC_API_KEY when provided (API-key path)", () => {
  expect(serializeEnv({ ...base, anthropic: "sk-ant-X" })).toContain(
    "ANTHROPIC_API_KEY=sk-ant-X",
  );
});

test("only Claude Code is verified; others are coming-soon", () => {
  expect(RUNTIMES.claude.verified).toBe(true);
  expect(RUNTIMES.codex.verified).toBe(false);
});

test("configurator HTML has the fields + the subscription note", () => {
  const h = renderConfiguratorHtml();
  expect(h).toContain('name="maptiler"');
  expect(h).toContain('name="datawrapper"');
  expect(h).toContain('name="anthropic"');
  expect(h.toLowerCase()).toContain("subscription"); // "leave blank if you use a subscription"
});
