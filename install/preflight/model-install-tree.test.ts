import { afterAll, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { preflightModel } from "./model.ts";
import { resolveSkillsRoot } from "./skills-root.ts";
import { DEFAULT_NEWSROOM_STATE } from "../../lib/newsroom/state.ts";

// A packed install, reduced to what the probe reads: the engine directories under .dist/skills,
// and their dependencies at .dist/node_modules. Nothing is installed under skills/ — which is
// exactly the shape that made the page lie.
const root = mkdtempSync(join(tmpdir(), "splash-install-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

function pkg(name: string): void {
  const dir = join(root, ".dist", "node_modules", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name, version: "0.0.0", main: "index.js" }),
  );
  writeFileSync(join(dir, "index.js"), "module.exports = {};\n");
}

for (const engine of ["chart-native", "image-native"])
  mkdirSync(join(root, ".dist", "skills", engine), { recursive: true });
mkdirSync(join(root, "skills", "chart-native"), { recursive: true });
for (const name of ["react", "vite", "remotion", "sharp"]) pkg(name);

test("an engine whose dependencies are installed reads ready on a packed install", () => {
  const model = preflightModel({
    state: {
      ...DEFAULT_NEWSROOM_STATE,
      capabilities: { "image-native": { enabled: true } },
    },
    env: {},
    skillsRoot: resolveSkillsRoot(root),
  });
  const photo = model.engines.find((e) => e.id === "image-native")!;
  expect(photo.status).toBe("ready");
});

// The mutation: point the probe back at the source tree — the state before this task — and the
// same install must report missing. A test that stays green with the defect restored proves
// nothing about the defect.
test("probing the source tree instead reports it missing (the defect this closes)", () => {
  const model = preflightModel({
    state: {
      ...DEFAULT_NEWSROOM_STATE,
      capabilities: { "image-native": { enabled: true } },
    },
    env: {},
    skillsRoot: join(root, "skills"),
  });
  expect(model.engines.find((e) => e.id === "image-native")!.status).toBe(
    "missing",
  );
});
