// WHERE A DEFECT IN THIS TOOLCHAIN GOES, so that it does not go to the journalist.
//
// `SKILL.md`'s never-list carries the rule as an absolute — *"a defect in this toolchain is written
// to `stories/<slug>/NOTES-FOR-MAINTAINER.md` and never spoken to the journalist"* — and
// `twin-deliver`'s `formatHandover` throws at any maintainer-facing sentence and names that file as
// where it belongs instead. Measured: **nothing in the tree wrote it.** It was a convention a model
// was asked to honour, in a project whose own account is that a prose rule is its softest surface,
// pointed at by a refusal that could not tell it where to put what it had just refused.
//
// So this is the other end of that throw. It is deliberately the smallest thing that can be true:
// an append, to the story root, of text somebody wanted recorded.
//
// TWO REFUSALS, and both are the rule rather than defensiveness:
//
//   - the note goes to the STORY ROOT, never into `export/`. `export/` is what the newsroom
//     receives; a note about our own code travelling inside a delivery is the same failure as
//     saying it out loud, one directory further along.
//   - an empty note is refused. "Recorded" has to mean something was written down.
//
// It APPENDS. A run finds more than one defect — the run this file exists because of found three —
// and a second note overwriting the first is a note lost.

import { appendFile, mkdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const FILE = "NOTES-FOR-MAINTAINER.md";

const HEADER = `# Notes for the maintainer

Defects and rough edges found while running this story. **Not for the journalist** — nothing here
was said to them, and nothing here belongs in \`export/\`. Each entry names the phase it was found in.
`;

/**
 * Appends one note to `<storyDir>/NOTES-FOR-MAINTAINER.md`, creating the file with its own header
 * the first time. Returns the path written, so a caller can say where it went without guessing at
 * the convention.
 *
 * `phase` is the phase the note was found in — `whereIs`'s own vocabulary, so a maintainer reading
 * the file later knows where to look. It is required for the same reason the hand-over's fields
 * are: a note with no location is a note somebody has to reconstruct.
 */
export async function recordMaintainerNote({ storyDir, phase, note }) {
  if (!storyDir) throw new Error("recordMaintainerNote needs the story directory");
  if (!phase || !String(phase).trim()) {
    throw new Error("a maintainer note needs the phase it was found in — the phase whereIs reports");
  }
  if (!note || !String(note).trim()) {
    throw new Error("a maintainer note with nothing in it is not a record — write what was wrong");
  }

  // `export/` is the newsroom's. A note about our own code must not travel inside a delivery, which
  // is the same failure as speaking it to the journalist, one directory further along.
  const target = resolve(storyDir);
  if (target.split(/[\\/]/).includes("export")) {
    throw new Error(
      `a maintainer note goes to the story root, never inside export/ — export/ is what the newsroom receives (given ${storyDir})`,
    );
  }

  await mkdir(target, { recursive: true });
  const path = join(target, FILE);
  const existing = await readFile(path, "utf8").catch(() => null);
  const opening = existing === null ? HEADER : "";
  await appendFile(path, `${opening}\n## Found at ${String(phase).trim()}\n\n${String(note).trim()}\n`);
  return path;
}
