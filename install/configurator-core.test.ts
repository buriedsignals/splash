import { test, expect } from "bun:test";
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

const MT = process.env.VITE_MAPTILER_KEY;
const DW = process.env.DATAWRAPPER_API_TOKEN;
const AN = process.env.ANTHROPIC_API_KEY;

test.skipIf(!MT)(
  "verifyMapTiler: true for the real key, false for a bad one",
  async () => {
    expect(await verifyMapTiler(MT!)).toBe(true);
    expect(await verifyMapTiler("not-a-real-key")).toBe(false);
  },
);

test.skipIf(!DW)(
  "verifyDatawrapper: true for the real token, false for a bad one",
  async () => {
    expect(await verifyDatawrapper(DW!)).toBe(true);
    expect(await verifyDatawrapper("not-a-real-token")).toBe(false);
  },
);

test.skipIf(!AN)(
  "verifyAnthropic: true for the real key, false for a bad one",
  async () => {
    expect(await verifyAnthropic(AN!)).toBe(true);
    expect(await verifyAnthropic("sk-ant-not-real")).toBe(false);
  },
);
