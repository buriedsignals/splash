/**
 * THE FOURTH FIX IN ONE WEEK THAT DID NOT TRAVEL, AND THE CHECK THAT MAKES THE FIFTH RED.
 *
 * A ruling landed on 2026-08-23: a world camera fills its box by WRAPPING, painting the world east
 * and west, every painted copy carrying its own marks. It was built into
 * `skills/map-web/scripts/render-web.mjs`, verified on the two beats that already had a full-turn
 * camera, and reported green. Hours later a new story arrived — a world choropleth of rabies deaths
 * reported to WHO — and its page covered 86.5% of the reader's window with ZERO painted copies,
 * while every guard in the tree stayed green.
 *
 * The cause, measured, and it is not about the wrap: A BEAT COPIES THE SEED, THE FIX WENT INTO THE
 * SKILL, AND THOSE ARE DIFFERENT FILES. The new story's own header names
 * `proof/mapgen-choropleth-web/render-web.mjs` and its own comment says so out loud — *"`renderMapWeb`
 * below is this beat's own copy of the format's generic machinery"*. Nine files in this tree assemble
 * a map-web page. Three carried the wrap and six emitted the pre-ruling layout, and nothing in the
 * repository could see the disagreement, because:
 *
 *   · `guard-copies-parity.test.ts` walks copies BETWEEN SKILLS, from a hand-typed list of paths. A
 *     beat is not a skill and a beat nobody has typed yet is not on any list — which is exactly the
 *     population a fix has to reach, since a NEW beat is where a fix fails to arrive.
 *   · `guard-catalogue.json` states a rule per SKILL (`states: { "map-web": "carried" }`). No entry
 *     in it can be about a file under `proof/` or `stories/`.
 *   · every driver in this format runs over a DELIVERED page, and a delivered page that was never
 *     re-rendered — or a beat that has not been written yet — has nothing to drive.
 *
 * Four fixes in a week failed to travel by this shape: the MapTiler credential alias (reached a
 * probe, then not its gate, then not the operation, then not the test gates), the derived sea (one
 * bake of three), the basemap theme (hard-coded in three skills, eight private copies in beats), and
 * this one. So this file asks the question none of them was asked:
 *
 *   IS THE CAPABILITY THE SKILL'S RENDERER CARRIES ALSO IN EVERY FILE THAT ASSEMBLES THIS FORMAT'S
 *   PAGE — and does every world camera in the tree actually deliver it?
 *
 * BOTH POPULATIONS ARE DERIVED, NEVER TYPED, because a typed population is how this hole was dug:
 *
 *   · the ASSEMBLERS are found by scanning the tree for the format's own page shell,
 *     `<div class="map-web-page">`. A file that emits it assembles a map-web page, whatever it is
 *     called and wherever it lives. `stories/stress-ab-emigration-flows` imports `renderMapWeb` from
 *     the skill instead of copying it — it never emits the shell itself, it is not an assembler, and
 *     it is the one beat in the tree that got the wrap ruling for free.
 *   · the CAPABILITY is the transitive call-closure of the wrap's own entry points inside the
 *     skill's renderer. A helper added to `repeatWorlds` tomorrow joins the set on its own and the
 *     copies go red until they carry it too. The entry points are named (a capability has a name);
 *     what implements them is read out of the code.
 *   · the WORLD CAMERAS are read off every `plate/geometry.json` on disk by their own longitude
 *     span, against `live-map.mjs`'s own `FULL_TURN_DEG` — the same derivation `spansTheWorld` and
 *     `cannotCover` make. A page with no copies cannot be asked why it has none; the plate beside it
 *     can.
 *
 * And the closure is checked IN BOTH DIRECTIONS. A requirement that cannot fire is worse than a
 * missing one, so `every function that speaks the capability's vocabulary is inside the closure` is
 * asserted too: a wrap helper reachable from nothing would otherwise sit outside the compared set
 * and drift in silence, which is this defect wearing the check's own coat.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { FULL_TURN_DEG } from "../assets/live-map.mjs";

const SKILL_RENDERER = join(
  import.meta.dirname,
  "..",
  "scripts",
  "render-web.mjs",
);
const TWIN = join(import.meta.dirname, "..", "..", "..");
/** Where a beat lives. `skills/` is walked too — the skill's own renderer is the reference, and a
 *  second assembler appearing under `skills/` would be a copy nobody registered either. */
const WALKED = ["proof", "stories", "skills", "shared"];
/** The format's own page shell. Every map-web page in this tree is wrapped in it, and nothing else
 *  in the tree emits it — which is what makes it the honest way to ask "does this file assemble one
 *  of our pages?" without a list of paths anybody has to remember to add to. */
const PAGE_SHELL = '<div class="map-web-page">';
/** The wrap capability's own surface, and the only thing on this page that is typed rather than
 *  derived: a capability has a name. `repeatWorlds` paints the copies, `worldTilingCss` is the
 *  stylesheet that makes them a tile, `requireBoxAspects` is what refuses a plate that cannot say
 *  how many copies its box needs. Everything they reach is found below. */
const ENTRY_POINTS = ["repeatWorlds", "worldTilingCss", "requireBoxAspects"];
/** The words this capability is written in. Used ONLY for the reverse check — that nothing in the
 *  skill's renderer speaks them from outside the closure. */
const VOCABULARY = /\bworldCopies\b|mw-world|data-world/;

function* filesUnder(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* filesUnder(path);
    else if (/\.(mjs|ts|tsx|js)$/.test(entry.name)) yield path;
  }
}

/** Every file in the tree that assembles one of this format's pages. Derived, and deliberately not
 *  restricted to a filename: the defect that earned this file lives in a file called
 *  `render-web.mjs`, and the next one need not. */
function pageAssemblers(): string[] {
  const found: string[] = [];
  for (const dir of WALKED)
    for (const file of filesUnder(join(TWIN, dir))) {
      // A `test/` directory QUOTES the shell — this file does, three lines up — and asserting about
      // it never delivers a page. Same carve-out `no-cross-skill-imports.test.ts` makes, for the
      // same reason.
      if (file.split(sep).includes("test")) continue;
      if (readFileSync(file, "utf8").includes(PAGE_SHELL)) found.push(file);
    }
  return found.sort();
}

/** A function's own doc comment and body, as written — the same reading
 *  `splash/test/guard-copies-parity.test.ts` compares skill copies with, and the doc comment is
 *  included for the same reason: it carries the defect that earned the rule, and a copy that kept
 *  the code and dropped the reasoning is a rule the next author deletes. */
function declaration(source: string, name: string): string | null {
  const at = source.search(
    new RegExp(`^(?:export )?(?:async )?function ${name}\\(`, "m"),
  );
  if (at < 0) return null;
  const comment = source.lastIndexOf("/**", at);
  const between =
    comment < 0
      ? "no comment"
      : source.slice(source.indexOf("*/", comment) + 2, at);
  const end = source.indexOf("\n}\n", at);
  if (end < 0) return null;
  return comment >= 0 && between.trim() === ""
    ? source.slice(comment, end + 2)
    : source.slice(at, end + 2);
}

/** Every function `source` declares, by name. */
function declaredFunctions(source: string): string[] {
  return [
    ...source.matchAll(
      /^(?:export )?(?:async )?function ([A-Za-z_$][\w$]*)\(/gm,
    ),
  ].map((m) => m[1]);
}

/** A declaration with its prose removed — the doc comment above it, the `//` notes inside it, and
 *  the `/* … *&#47;` blocks (including the CSS comments inside `worldTilingCss`'s own template). It is
 *  what the call walk reads, and it was written after measuring the alternative: scanning the prose
 *  too, `worldTilingCss`'s doc comment names `buildCss`, which dragged in `renderMapWeb`, `render`,
 *  `livePlan` and eleven more, and the "capability" became the whole file. */
function codeOf(declared: string): string {
  const at = declared.startsWith("/**") ? declared.indexOf("*/") + 2 : 0;
  return declared
    .slice(at)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n]*/g, " ");
}

/** THE CAPABILITY, DERIVED. Start at its named surface and follow every CALL into a function the
 *  same file declares, until nothing new is reached. This is what makes the set grow on its own when
 *  a helper is added: the author who adds one does not also have to remember a registry. */
function capabilityClosure(source: string): string[] {
  const declared = new Set(declaredFunctions(source));
  const closure = new Set<string>();
  const queue = [...ENTRY_POINTS];
  while (queue.length > 0) {
    const name = queue.shift() as string;
    if (closure.has(name)) continue;
    closure.add(name);
    const code = codeOf(declaration(source, name) ?? "");
    for (const call of new Set(
      [...code.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]),
    ))
      if (declared.has(call) && !closure.has(call)) queue.push(call);
  }
  return [...closure].sort();
}

const skillSource = readFileSync(SKILL_RENDERER, "utf8");
const CLOSURE = capabilityClosure(skillSource);
const ASSEMBLERS = pageAssemblers();
const shortName = (file: string) => relative(TWIN, file);

describe("the wrap capability, as the skill's own renderer declares it", () => {
  it("is a real set of functions and not an empty one", () => {
    // A closure that came back empty would make every assertion below vacuously true — the exact
    // false confirmation this file exists to refuse.
    expect(CLOSURE.length).toBeGreaterThanOrEqual(ENTRY_POINTS.length);
    for (const name of ENTRY_POINTS) expect(CLOSURE).toContain(name);
  });

  it("has no member the skill's renderer does not actually declare", () => {
    for (const name of CLOSURE)
      expect(
        `${name}: ${declaration(skillSource, name) ? "declared" : "MISSING"}`,
      ).toBe(`${name}: declared`);
  });

  it("holds every function in that renderer that speaks the capability's vocabulary", () => {
    // THE REVERSE DIRECTION, and it is what keeps this check from being a requirement that cannot
    // fire. A new wrap helper reachable from none of the entry points would sit outside the compared
    // set, drift copy by copy, and every assertion below would still pass.
    const outside: string[] = [];
    for (const name of declaredFunctions(skillSource)) {
      if (CLOSURE.includes(name)) continue;
      const body = declaration(skillSource, name);
      // `renderMapWeb` and `buildCss` are the CALLERS: every assembler has its own (its own props,
      // its own colours, its own furniture), so they are the seam the capability is wired into
      // rather than part of it. The wiring itself is asserted below.
      if (name === "renderMapWeb" || name === "buildCss") continue;
      if (body && VOCABULARY.test(body)) outside.push(name);
    }
    expect(
      `speaking the wrap's vocabulary from outside the closure: ${outside.join(", ")}`,
    ).toBe("speaking the wrap's vocabulary from outside the closure: ");
  });
});

describe("every file in the tree that assembles a map-web page", () => {
  it("is found by the page shell it emits, not by a list of paths", () => {
    // If this ever comes back with only the skill in it, the shell has been renamed and every
    // assertion below has quietly stopped applying to anything.
    expect(ASSEMBLERS.map(shortName)).toContain(shortName(SKILL_RENDERER));
    expect(ASSEMBLERS.length).toBeGreaterThan(1);
  });

  for (const file of ASSEMBLERS) {
    if (file === SKILL_RENDERER) continue;
    describe(shortName(file), () => {
      const source = readFileSync(file, "utf8");

      it("carries every function of the wrap capability", () => {
        const missing = CLOSURE.filter(
          (name) => declaration(source, name) === null,
        );
        expect(`${shortName(file)} is missing: ${missing.join(", ")}`).toBe(
          `${shortName(file)} is missing: `,
        );
      });

      it("carries them byte-identically with the skill's own renderer", () => {
        for (const name of CLOSURE) {
          const mine = declaration(source, name);
          if (mine === null) continue; // already reported by the assertion above
          expect(`${shortName(file)} :: ${name}\n${mine}`).toBe(
            `${shortName(file)} :: ${name}\n${declaration(skillSource, name)}`,
          );
        }
      });

      it("calls the capability rather than merely carrying it", () => {
        // A copy that holds the code and never runs it is `guard-wired-to-run`'s defect one level
        // down: byte-identical, catalogued, and dead. Callers are counted outside the functions'
        // own declarations, so a recursive mention inside `repeatLayer` cannot stand in for one.
        for (const name of ENTRY_POINTS) {
          const own = declaration(source, name) ?? "";
          const elsewhere = source.split(own).join("");
          expect(
            `${shortName(file)} calls ${name}: ${elsewhere.includes(`${name}(`)}`,
          ).toBe(`${shortName(file)} calls ${name}: true`);
        }
      });
    });
  }
});

/** Every beat in the tree with a baked plate, paired with the map-web pages it delivers. Derived by
 *  walking for `plate/geometry.json` — a beat directory is whatever holds one — and then for the
 *  delivered pages beside it. Nothing here is typed, so a story added tomorrow is measured the
 *  afternoon it renders. */
function bakedBeats(): { beat: string; span: number; pages: string[] }[] {
  const beats: { beat: string; span: number; pages: string[] }[] = [];
  for (const dir of ["proof", "stories"])
    for (const file of filesUnder(join(TWIN, dir))) void file;
  const walk = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      const path = join(dir, entry.name);
      if (!entry.isDirectory()) continue;
      const geometry = join(path, "plate", "geometry.json");
      if (existsSync(geometry)) {
        const bounds = JSON.parse(readFileSync(geometry, "utf8")).bounds;
        const span =
          Array.isArray(bounds) && bounds.length === 2
            ? Math.abs(bounds[1][0] - bounds[0][0])
            : 0;
        beats.push({ beat: path, span, pages: mapWebPagesIn(path) });
      }
      walk(path);
    }
  };
  for (const dir of ["proof", "stories"]) walk(join(TWIN, dir));
  return beats;
}

/** The delivered map-web pages inside a beat directory — recognised by the same page shell the
 *  assemblers are, so a scrolly's page (a different vehicle, with its own rule for the same ruling)
 *  is not counted here and a map-web page cannot be missed because it sits in an unusual folder. */
function mapWebPagesIn(beat: string): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === "plate") continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (
        entry.name.endsWith(".html") &&
        statSync(path).size < 64 * 1024 * 1024 &&
        readFileSync(path, "utf8").includes(PAGE_SHELL)
      )
        found.push(path);
    }
  };
  walk(beat);
  return found;
}

const BEATS = bakedBeats();

describe("a delivered page whose plate carries a full-turn camera", () => {
  it("has a population, read off the plates rather than declared", () => {
    // The check the wrap ruling could not have: the two beats it was verified on were the two
    // world cameras that existed at the time. This asks the tree.
    expect(BEATS.length).toBeGreaterThan(0);
  });

  for (const { beat, span, pages } of BEATS)
    for (const page of pages) {
      const world = span >= FULL_TURN_DEG;
      it(`${relative(TWIN, page)} paints ${world ? "the world east and west" : "one world"} (camera ${span.toFixed(1)}°)`, () => {
        const html = readFileSync(page, "utf8");
        // A WORLD IS PAINTED IN TWO LAYERS — the baked plate under `#mw-fallback` and this beat's own
        // marks under `.mw-overlay` — so the page carries `layers × copies` of `.mw-world`. Counting
        // the divs alone reports six copies where there are three; the primary in each layer is what
        // says how many layers there are, and it is read from the ATTRIBUTE (`\sdata-world=`) so the
        // stylesheet's own `[data-world="repeat"]` selector is not miscounted as markup.
        const painted = (html.match(/class="mw-world"/g) ?? []).length;
        const layers = (html.match(/\sdata-world="primary"/g) ?? []).length;
        const copies = layers > 0 ? painted / layers : painted;
        if (world) {
          // Both layers repeat, or the marks are on one world and the ground on three — the closed
          // defect exactly, in the other direction.
          expect(
            `${relative(TWIN, page)} whole copies: ${Number.isInteger(copies)}`,
          ).toBe(`${relative(TWIN, page)} whole copies: true`);
          // THE RABIES PAGE, in one assertion. A camera that spans a full turn cannot cover a box
          // wider than the world with one plate, so a page delivering ONE world is a page that shows
          // its own page ground beside the map — 86.5% of the window on the beat that earned this.
          expect(
            `${relative(TWIN, page)}: ${copies} painted world(s) for a ${span.toFixed(1)}° camera`,
          ).toBe(
            `${relative(TWIN, page)}: ${copies > 1 ? copies : "MORE THAN ONE"} painted world(s) for a ${span.toFixed(1)}° camera`,
          );
          // Odd, so the middle copy sits where the single world used to sit; an even count puts a
          // seam down the middle of the picture.
          expect(
            `${relative(TWIN, page)} copies odd: ${copies % 2 === 1}`,
          ).toBe(`${relative(TWIN, page)} copies odd: true`);
          // And every repeat is marked as one: the keyboard and the table do not multiply with the
          // copies, so each layer keeps exactly one primary and hands the rest `data-world="repeat"`.
          const repeats = (html.match(/\sdata-world="repeat"/g) ?? []).length;
          expect(`${relative(TWIN, page)} repeats: ${repeats}`).toBe(
            `${relative(TWIN, page)} repeats: ${painted - layers}`,
          );
        } else {
          // The other direction, and it is not symmetry for its own sake: a CONTINENT beat painting
          // a second copy of itself is the fit-padding defect this format closed two days before the
          // wrap ruling, and it would be painting bare basemap carrying none of the beat's marks.
          expect(
            `${relative(TWIN, page)}: ${copies} painted world(s) for a ${span.toFixed(1)}° camera`,
          ).toBe(
            `${relative(TWIN, page)}: 0 painted world(s) for a ${span.toFixed(1)}° camera`,
          );
        }
      });
    }
});

describe("the seed a beat copies", () => {
  const SEED = join(TWIN, "proof", "mapgen-choropleth-web", "render-web.mjs");

  it("is one of the assemblers this file measures", () => {
    // Named on purpose, and it is the only path typed in this file's assertions. Six beats in this
    // tree name it in their own headers as what they were copied from, so the seed being behind the
    // skill is not one file's problem — it is every beat written after the day it fell behind.
    expect(ASSEMBLERS.map(shortName)).toContain(shortName(SEED));
  });

  it("carries the whole capability, so a beat copied from it today wraps", () => {
    const source = readFileSync(SEED, "utf8");
    for (const name of CLOSURE)
      expect(`seed :: ${name}\n${declaration(source, name)}`).toBe(
        `seed :: ${name}\n${declaration(skillSource, name)}`,
      );
  });
});
