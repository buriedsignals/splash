import { afterEach, describe, expect, it } from "bun:test";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// The real tree is checked by CI's own "Verify the landing inventory" step (`bun run landing:check`);
// this file proves the check itself can tell a consistent landing page from a drifted one.

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const scratch: string[] = [];

afterEach(() => {
  for (const root of scratch.splice(0))
    rmSync(root, { recursive: true, force: true });
});

const HEADER =
  "<!-- twin/landing/shared/header.html -->\n<nav>bar</nav>\n<!-- /twin/landing/shared/header.html -->\n";
const CATALOGUE = '{"treatments":[{"medium":"chart","label":"Bars"}]}\n';

/** A whole scratch root — the script, a catalogue, the shared bar and every page the check reads —
 *  so the only thing that can fail is the landing page under test, never a missing file. */
function scaffold(indexBody: string) {
  const root = mkdtempSync(join(tmpdir(), "splash-landing-cli-"));
  scratch.push(root);
  mkdirSync(join(root, "scripts"), { recursive: true });
  mkdirSync(join(root, "landing", "shared"), { recursive: true });
  mkdirSync(join(root, "landing", "docs"), { recursive: true });
  mkdirSync(join(root, "catalog"), { recursive: true });
  copyFileSync(
    join(ROOT, "scripts", "landing.mjs"),
    join(root, "scripts", "landing.mjs"),
  );
  writeFileSync(join(root, "catalog", "visual-catalog.json"), CATALOGUE);
  writeFileSync(join(root, "landing", "shared", "header.html"), HEADER);
  const index = `${HEADER}${indexBody}`;
  writeFileSync(join(root, "landing", "index.html"), index);
  writeFileSync(join(root, "landing", "inspiration.html"), HEADER);
  writeFileSync(join(root, "landing", "docs", "index.html"), HEADER);
  const run = Bun.spawnSync(["bun", "scripts/landing.mjs", "--check"], {
    cwd: root,
  });
  return {
    run,
    stderr: run.stderr.toString(),
    index,
    landingPath: join(root, "landing", "index.html"),
  };
}

describe("the landing drift check", () => {
  it("passes a scratch landing page that agrees with its catalogue", () => {
    // The positive control: without it, the divergent case below could be red for any reason at all
    // (a missing file, a crash) and still read as "drift detected".
    const { run, stderr } = scaffold(
      '<p>1 forms</p>\n<button data-form="Bars" data-skill="chart-beat">Bars</button>\n',
    );
    expect(stderr).toBe("");
    expect(run.exitCode).toBe(0);
  });

  it("exits 1 naming the drift for a divergent landing page, and leaves the page alone", () => {
    // The same scaffold with the catalogue's one form relabelled on the page: the card reads one
    // name and declares another, and the declared one is not in the catalogue.
    const { run, stderr, index, landingPath } = scaffold(
      '<p>1 forms</p>\n<button data-form="Columns" data-skill="chart-beat">Bars</button>\n',
    );
    expect(run.exitCode).toBe(1);
    expect(stderr).toContain("landing/index.html has drifted");
    expect(stderr).toContain('card reads "Bars" but declares "Columns"');
    expect(stderr).toContain('chart-beat form "Columns" matches 0 catalogue treatments');
    expect(readFileSync(landingPath, "utf8")).toBe(index);
  });
});
