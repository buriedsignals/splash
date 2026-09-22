/**
 * THE SCAFFOLD ENFORCED THE FILE'S EXISTENCE AND IGNORED ITS CONTENTS.
 *
 * Ruling R-A: a production run is produced in ONE art direction, composed once from `NEWSROOM.md`
 * and the story's subject, written at the story root beside `PALETTE.md`, read by the still, the
 * video, the page and the scrolly alike, redefined by none. `assertRunDirection` has refused to
 * scaffold a beat whose `DIRECTION.md` is unreachable since the rule was written — and then the
 * runner it handed the journalist looped over `docs/design-base/directions`, the three filed demo
 * directions, and produced three pages in three palettes and three type ladders for a story that
 * had already chosen one.
 *
 * Found 2026-09-23 by rendering a real story's second export and looking at the output, not by
 * reading the code: the refusal and the template are eighty lines apart and each is right about its
 * own half. `a-production-run-has-one-direction.test.ts` could not see it either — it walks the
 * repository's `stories/`, and a journalist's story lives in the install root.
 *
 * Held here on the WRITTEN FILE rather than on the template string, because the defect was in the
 * gap between what the scaffold checked and what it wrote.
 */
import { describe, it, expect, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scaffoldBeat } from "../scripts/scaffold-web-beat.mjs";
import { composeRunDirection, writeRunDirection } from "#shared/design-base/run-direction.mjs";
import { filedDirections } from "#shared/design-base/index.mjs";

const REPO = join(import.meta.dirname, "..", "..", "..");
const made: string[] = [];
afterEach(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** A story root carrying a real composed `DIRECTION.md`, a `PALETTE.md` and one static sibling. */
function story() {
  const root = mkdtempSync(join(tmpdir(), "one-direction-"));
  made.push(root);
  const beats = join(root, "beats");
  mkdirSync(join(beats, "sibling"), { recursive: true });
  writeFileSync(
    join(root, "PALETTE.md"),
    '---\nground: "#16191B"\naccent: "#D4A853"\norigin: newsroom\n---\n\n# The colours this story is drawn in\n',
  );
  writeFileSync(join(beats, "sibling", "data.csv"), "code,value\nROU,1\n");
  const { chosen } = composeRunDirection({
    newsroom: { ground: "#16191B", accent: "#D4A853", origin: "newsroom" },
    filed: filedDirections(),
    subject: "measles cases concentrated in one EU country",
    textPerRegister: { display: "A", eyebrow: "B", body: "C", axis: "", annot: "", value: "" },
  });
  writeRunDirection(root, chosen);
  return root;
}

function runnerFor({ filed }: { filed: boolean }): string {
  const root = filed ? REPO : story();
  const beat = filed ? `proof/.direction-probe-${process.pid}` : "beats/ranking";
  const staticBeat = filed ? "proof/web-bar-top-emitters-2024" : "beats/sibling";
  if (filed) made.push(join(REPO, beat));
  scaffoldBeat({ root, type: "bar-and-column", beat, staticBeat, filed });
  return readFileSync(join(root, beat, "render-directions-web.mjs"), "utf8");
}

describe("the runner a journalist is handed", () => {
  it("reads the run's one direction, and never the three filed ones", () => {
    const runner = runnerFor({ filed: false });
    expect(runner).toContain("readRunDirection(HERE)");
    expect(runner).not.toContain("design-base/directions");
    expect(runner).not.toMatch(/"design-base", "directions"/);
  });

  it("renders exactly one page, named after the beat rather than after a palette", () => {
    const runner = runnerFor({ filed: false });
    // One entry in the list the render loop walks — the loop itself is unchanged, so a beat that
    // grows a second page later does not have to rewrite it.
    expect(runner).toMatch(/const directions = \[\{ id: "ranking",/);
    expect(runner).not.toContain('"creme"');
    expect(runner).not.toContain('"nocturne"');
  });

  it("leaves no token unfilled, so the two branches cannot drift apart unnoticed", () => {
    expect(runnerFor({ filed: false })).not.toMatch(/%%[A-Za-z_]+%%/);
    expect(runnerFor({ filed: true })).not.toMatch(/%%[A-Za-z_]+%%/);
  });

  it("still gives the catalogue its three, which is R-A's own named exception", () => {
    const runner = runnerFor({ filed: true });
    expect(runner).toContain("design-base");
    expect(runner).toContain("directions");
    expect(runner).not.toContain("readRunDirection");
  });
});
