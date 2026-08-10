/**
 * WHAT THIS GUARD CATCHES, AND WHAT IT PROVABLY DOES NOT.
 *
 * The three export sizes (ruling R2) are a CARRIED table: one `sizes.mjs` per craft skill, plus its
 * `shared/` mirror, because a skill directory must stay copy-pasteable on its own
 * (`no-cross-skill-imports.test.ts`). Carried data drifts. This is what stops it.
 *
 * IT WALKS, IT NEVER LISTS. `findAll(TWIN, "sizes.mjs")`, the same shape as
 * `render-still-parity.test.ts` — so the copy that lands in `twin-chart-video`, `twin-dw-beat` or
 * `twin-image-beat` is guarded the moment it lands, with nobody remembering to wire it up.
 * `helper-parity.test.ts`'s hand-written list is the standing counter-example: it turned the suite
 * red for a CORRECT change, and two agents kept a dead export alive to satisfy it.
 *
 * IT READS BY `import()`, NOT BY PARSING TEXT. A table is data; comparing its rendered values is
 * the only comparison worth making, and a text scan would go red on a reordered key. Runtime code
 * in this branch never crosses a skill boundary, and this is the test-only exception that rule
 * reserves — the same one `genre-shippability.test.ts:1-8` and `where.test.ts` already use.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COMPARE, AND WHY ──────────────────────────────────────────────
 *
 * **`typeScale` is NOT compared across copies, on purpose.** Two copies of `square` will carry the
 * same 1080x1080 and DIFFERENT type scales, and that is correct, not drift. The evidence is this
 * project drawing one chart type twice:
 *
 *     static-diverging-bar…  900 wide   PAD 40   title 24   axis tick 13
 *     vidz-diverging-bar…   1080 wide   PAD 72   title 38   axis tick 17
 *     ratio                   1.20x       1.80x     1.58x        1.31x
 *
 * Nothing scales at the frame's own 1.20x. A video types larger because it is watched small on a
 * phone; a static types smaller because it sits in an article at reading distance. A guard that
 * forced the two to agree would force exactly the defect the original Splash ships — one
 * `scale: 1.7` shared by square AND portrait (`skills/chart-native/remotion/src/Root.tsx:50-74`),
 * a number that cannot be right for both.
 *
 * So there is a real, named blind spot here: **change `square.typeScale` in one copy only and this
 * file stays GREEN.** That mutation was run and recorded as green deliberately (see the mutation
 * table below), so that nobody later reads the gap as an oversight and "fixes" it into a red. What
 * IS checked is the SHAPE of the field — finite, positive, present-or-absent — because
 * `twin-dw-beat`'s copy legitimately carries none at all (Datawrapper lays out type server-side)
 * and a copy carrying `typeScale: "large"` is a different kind of wrong from a copy carrying 1.4.
 *
 * ── OTHER THINGS IT CANNOT SEE ─────────────────────────────────────────────────────────────────
 *
 * 1. Whether any of the numbers are GOOD. `landscape.typeScale: 2.1` is defensible because
 *    `proof/static-carbon-footprint-spread/probe/` rendered it and a person opened it; nothing here
 *    re-does that, and nothing here could. A table can be internally consistent and ugly.
 * 2. Whether a beat USES the table. A component that kept `const FRAME = { width: 900 … }` beside a
 *    perfectly-parity-checked `sizes.mjs` passes every assertion below. That is Task 3's own guard's
 *    job, and for video it is `video-size-comes-from-the-composition.test.ts`.
 * 3. Aspect ratios. `landscape` being 16:9 is a fact about the row's two numbers, and if someone
 *    changes both copies to 1920x1000 in step this file is content. What it defends is that the
 *    copies AGREE, not that they are right — the deliberate division of labour with the probe.
 *
 * ── THE MUTATIONS THAT REDDEN IT ───────────────────────────────────────────────────────────────
 * Run in a copy of the tree outside it (invariant 4 of `twin/PLAN-2026-08-10.md`), 2026-08-10:
 *
 *   portrait.height 1920 -> 1922 in ONE copy         RED  — names the file, the row and the field
 *   add a fourth row `feed:` to ONE copy             RED  — the row-set assertion
 *   delete `landscape` from ONE copy                 RED  — the row-set assertion
 *   landscape.width 1920 -> 1921 in any copy         RED  — the even-dimension assertion
 *   rename the canonical sizes.mjs                   RED  — the premise, not silently green
 *   a shared/ mirror whose skill copy is gone        RED  — the orphan direction
 *   a beat imports a mirror that does not exist      RED  — the needed direction
 *   twin-dw-beat's copy grows `typeScale: "large"`   RED  — the shape check, value uncompared
 *   square.typeScale CHANGED in ONE copy            GREEN — DELIBERATELY. See above.
 *   delete a mirror NO beat imports                 GREEN — see the mirror assertion's own comment
 *
 * The last row is honest rather than comfortable: today no beat imports a `#shared` copy of the table yet
 * (the static beats reach the table in Task 3), so `twin-chart-beat`'s mirror exists ahead of its
 * consumers and deleting it fires nothing. It reddens the moment the first beat imports it, which
 * is the only moment its absence would actually break anything.
 */
import { describe, it, expect } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const TWIN = join(import.meta.dirname, "..", "..", "..");
const CANONICAL = join(
  TWIN,
  "skills",
  "twin-chart-beat",
  "scripts",
  "sizes.mjs",
);

// R2 read literally: landscape for YouTube and article web, portrait for stories, square for social
// posts. Written here as well as in every copy, so the guard has an outside opinion rather than
// deriving the answer from the thing it is checking.
const ROWS = ["landscape", "square", "portrait"];

function findAll(dir: string, basename: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".git") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) findAll(p, basename, out);
    else if (e.name === basename) out.push(p);
  }
  return out;
}

/** Every source file under a directory, for reading import specifiers out of `proof/`. */
function findAllSource(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".git") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) findAllSource(p, out);
    else if (/\.(mjs|ts|tsx|js|jsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

type Row = { width: number; height: number; typeScale?: number };
type Copy = {
  path: string;
  label: string;
  SIZES: Record<string, Row>;
  sizeFor: (n: string) => Row;
};

const paths = findAll(TWIN, "sizes.mjs");
const copies: Copy[] = [];
for (const path of paths) {
  const mod = await import(path);
  copies.push({
    path,
    label: relative(TWIN, path),
    SIZES: mod.SIZES,
    sizeFor: mod.sizeFor,
  });
}
const canonical = copies.find((c) => c.path === CANONICAL);

describe("the export-size table — every copy in the tree, discovered rather than listed", () => {
  it("should find the canonical copy carrying exactly the three rows R2 names", () => {
    // Without this, every comparison below can go vacuously green against a renamed or emptied
    // canonical file. `render-still-parity.test.ts:152-163` states the same discipline.
    expect(canonical).toBeDefined();
    expect(Object.keys(canonical!.SIZES).sort()).toEqual([...ROWS].sort());
  });

  it("should mirror into shared/ exactly where a beat reaches for it, and nowhere else", () => {
    // Deliberately NOT "at least N copies, where N is the number of craft skills using the table" —
    // the only mechanical way to count "craft skills using the table" is to count the copies, which
    // would make the assertion check itself.
    //
    // And deliberately not "every skill copy has a mirror" either, which is what this assertion
    // said first. That version was over-strict and was caught by its own stated reason: a mirror
    // exists because `proof/` beats reach craft helpers through the `#shared/*` alias
    // (`package.json:5-7`), and `twin-dw-beat` has no beat under `proof/` at all — its producer
    // talks to an API. Forcing a mirror there would have created a file nobody imports in order to
    // satisfy a rule whose reason did not apply. So the pairing is asserted in the two directions
    // that are actually true.
    const skillCopies = paths.filter(
      (p) => p.includes(join("skills", "")) && p.includes("scripts"),
    );
    expect(skillCopies.length).toBeGreaterThan(0);

    // (a) No ORPHAN mirror: a `shared/<skill>/sizes.mjs` whose skill copy has gone is a stale table
    // that beats would keep importing after the real one moved.
    const skillsWithCopy = new Set(
      skillCopies.map((p) => relative(join(TWIN, "skills"), p).split("/")[0]),
    );
    // Anchored at `twin/shared/`, not "any path containing shared/". The loose form also matched
    // `skills/splash-twin/assets/root-template/shared/…`, which is the VENDORED copy of this very
    // mirror — the one a `cp -r root-template/` install carries into a newsroom's root. Its skill
    // name came out as ".." and this assertion failed on a file that is byte-identical to the one
    // it was checking. That copy has its own guards (`root-template-shared.test.ts`, and the
    // whole-tree mirror assertion in `root-template-tells-the-truth.test.ts`).
    const liveMirror = join(TWIN, "shared") + "/";
    for (const p of paths.filter((p) => p.startsWith(liveMirror))) {
      const skill = relative(join(TWIN, "shared"), p).split("/")[0];
      expect([skill, "has a skill copy", skillsWithCopy.has(skill)]).toEqual([
        skill,
        "has a skill copy",
        true,
      ]);
    }

    // (b) A mirror EXISTS wherever a beat actually imports one. Read off `proof/`'s own import
    // specifiers rather than assumed, so adding the import without the mirror reddens here instead
    // of at the first render.
    const beatFiles = findAllSource(join(TWIN, "proof"));
    const wanted = new Set<string>();
    for (const f of beatFiles) {
      for (const m of readFileSync(f, "utf8").matchAll(
        /#shared\/([a-z0-9-]+)\/sizes\.mjs/g,
      ))
        wanted.add(m[1]);
    }
    for (const skill of wanted) {
      expect([
        skill,
        "mirrored",
        existsSync(join(TWIN, "shared", skill, "sizes.mjs")),
      ]).toEqual([skill, "mirrored", true]);
    }
  });

  it("should carry the identical SET of row names in every copy", () => {
    for (const copy of copies) {
      expect([copy.label, Object.keys(copy.SIZES).sort()]).toEqual([
        copy.label,
        [...ROWS].sort(),
      ]);
    }
  });

  it("should agree on width and height, row by row, with the canonical copy", () => {
    // Compared as ONE STRING per copy rather than field by field, and that is not a style choice.
    // The field-by-field form was written first, as `expect([label, row, "height", mine])`, and the
    // mutation run showed why it is wrong: bun's diff ELIDES the unchanged head of an array, so a
    // 1920 -> 1922 drift printed `- 1920 / + 1922` and named neither the file nor the row. A guard
    // whose failure does not say WHERE sends the reader looking through five copies by hand.
    const line = (label: string, table: Record<string, Row>) =>
      `${label} :: ` +
      ROWS.map((r) => `${r} ${table[r]?.width}x${table[r]?.height}`).join(
        " | ",
      );
    for (const copy of copies) {
      expect(line(copy.label, copy.SIZES)).toBe(
        line(copy.label, canonical!.SIZES),
      );
    }
  });

  it("should carry a typeScale that is either absent or a finite positive number", () => {
    // Present-and-valid-or-absent, never required: `twin-dw-beat`'s copy legitimately has none,
    // because Datawrapper lays out type server-side and nothing local reads a scale. The VALUE is
    // not compared across copies — see this file's header.
    for (const copy of copies) {
      for (const row of ROWS) {
        const scale = copy.SIZES[row].typeScale;
        if (scale === undefined) continue;
        expect([copy.label, row, Number.isFinite(scale) && scale > 0]).toEqual([
          copy.label,
          row,
          true,
        ]);
      }
    }
  });

  it("should carry only even integers as dimensions", () => {
    // The original's `assertRenderedSize` needs a 2px tolerance because article-web's 675 is odd
    // against a 2x rasteriser (`skills/splash/src/channel.ts:53-61`). An even table never needs
    // one, so the property is asserted rather than left as a comment for a future row to ignore.
    for (const copy of copies) {
      for (const row of ROWS) {
        for (const field of ["width", "height"] as const) {
          const v = copy.SIZES[row][field];
          expect([
            copy.label,
            row,
            field,
            Number.isInteger(v) && v % 2 === 0,
          ]).toEqual([copy.label, row, field, true]);
        }
      }
    }
  });

  it("should throw from sizeFor, naming all three, rather than defaulting to anything", () => {
    // The `readPalette` failure mode, on this axis: a chart produced at a size nobody chose looks
    // every bit as deliberate as one produced in a colour nobody chose.
    for (const copy of copies) {
      expect(copy.sizeFor("landscape")).toEqual(copy.SIZES.landscape);
      for (const bad of ["feed", "", "Landscape", undefined]) {
        let message = "";
        try {
          copy.sizeFor(bad as string);
        } catch (e) {
          message = (e as Error).message;
        }
        expect([
          copy.label,
          bad,
          message.includes("landscape, square, portrait"),
        ]).toEqual([copy.label, bad, true]);
      }
    }
  });

  it("should hand back a copy of the row, so a caller cannot mutate the table", () => {
    const row = canonical!.sizeFor("square");
    row.width = 4;
    expect(canonical!.SIZES.square.width).toBe(1080);
  });
});
