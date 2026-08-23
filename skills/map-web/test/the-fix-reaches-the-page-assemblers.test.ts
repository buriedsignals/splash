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

/** Just past the `)` closing the parameter list that starts at or after `from`. */
function paramsEnd(text: string, from: number): number {
  let i = text.indexOf("(", from);
  if (i < 0) return -1;
  let depth = 0;
  for (; i < text.length; i++) {
    const c = text[i];
    if (c === "\\") {
      i++;
      continue;
    }
    if (c === "(") depth++;
    else if (c === ")") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

/** Just past the `}` closing the block that starts at or after `from`, brace-matched with strings,
 *  template literals (and their `${…}` holes), comments and regex literals all tracked.
 *
 *  IT IS NOT "THE FIRST `\n}\n`", and the difference is not cosmetic: `worldTilingCss` RETURNS a
 *  stylesheet, and a stylesheet is full of lines that are exactly `}`. Measured while writing this
 *  file — the cheap reading stopped 4 001 bytes early, at the closing brace of the function's own
 *  destructured parameter, so the "byte-identical" comparison below covered a 951-byte prefix of a
 *  4 952-byte function and every line of the tiling CSS was outside it. A comparison that silently
 *  covers a fifth of what it names is the shape of defect this whole file is about. */
function blockEnd(text: string, from: number): number {
  let i = text.indexOf("{", from);
  if (i < 0) return -1;
  const stack: string[] = [];
  let depth = 0;
  for (; i < text.length; i++) {
    const c = text[i];
    if (c === "\\") {
      i++;
      continue;
    }
    const mode = stack[stack.length - 1];
    if (mode === "'" || mode === '"') {
      if (c === mode) stack.pop();
      continue;
    }
    if (mode === "`") {
      if (c === "`") stack.pop();
      else if (c === "$" && text[i + 1] === "{") {
        stack.push("${");
        i++;
      }
      continue;
    }
    if (mode === "//") {
      if (c === "\n") stack.pop();
      continue;
    }
    if (mode === "/*") {
      if (c === "*" && text[i + 1] === "/") {
        stack.pop();
        i++;
      }
      continue;
    }
    if (mode === "/") {
      if (c === "[") stack.push("[");
      else if (c === "/") stack.pop();
      continue;
    }
    if (mode === "[") {
      if (c === "]") stack.pop();
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      stack.push(c);
      continue;
    }
    if (c === "/" && text[i + 1] === "/") {
      stack.push("//");
      i++;
      continue;
    }
    if (c === "/" && text[i + 1] === "*") {
      stack.push("/*");
      i++;
      continue;
    }
    if (c === "/") {
      const before = text.slice(0, i).trimEnd().slice(-1);
      if (before === "" || "=([{,;:!&|?+-*%~^<>".includes(before)) {
        stack.push("/");
        continue;
      }
    }
    if (c === "{") {
      depth++;
      continue;
    }
    if (c === "}") {
      if (mode === "${") {
        stack.pop();
        continue;
      }
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
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
  const end = blockEnd(source, paramsEnd(source, at));
  if (end < 0) return null;
  const comment = source.lastIndexOf("/**", at);
  const between =
    comment < 0
      ? "no comment"
      : source.slice(source.indexOf("*/", comment) + 2, at);
  return comment >= 0 && between.trim() === ""
    ? source.slice(comment, end)
    : source.slice(at, end);
}

/** THE MODULE-LEVEL CONSTANTS A COMPARED SPAN DECIDES WITH, appended to it — the same reading, and
 *  for the same reason, as `guard-copies-parity.test.ts`'s own `constantsBehind`. `repeatWorlds`
 *  reads `FALLBACK_LAYER` and `OVERLAY_LAYER`, the two regexes that say WHICH layers repeat, and
 *  they live outside every function that uses them: a copy whose `FALLBACK_LAYER` had drifted would
 *  repeat the wrong element while the function bodies stayed byte-identical. */
function constantsBehind(source: string, span: string): string {
  const found: string[] = [];
  for (const token of new Set(span.match(/\b[A-Z][A-Z0-9_]{2,}\b/g) ?? [])) {
    const declared = new RegExp(`^const ${token} = .*;$`, "m").exec(source);
    if (declared) found.push(declared[0]);
  }
  return found.sort().join("\n");
}

/** What this file compares, copy against copy: the declaration and the constants it decides with. */
function comparable(source: string, name: string): string | null {
  const span = declaration(source, name);
  if (span === null) return null;
  const constants = constantsBehind(source, span);
  return constants
    ? `${span}\n// constants it decides with:\n${constants}`
    : span;
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
    // EVERY MENTION IN THE CODE, not every call. `repeatWorlds` hands `useCopyOf` to `repeatLayer`
    // as a value — `repeatLayer(withIds, FALLBACK_LAYER, copies, useCopyOf)` — and a walk that only
    // followed `name(` left the plate-copying half of the capability out of the set entirely. It was
    // caught by RUNNING the copies (`useCopyOf is not defined`), which is the argument for the drive
    // below over any amount of static reading. The prose is stripped first, so a doc comment that
    // merely names a neighbour does not drag it in.
    const code = codeOf(declaration(source, name) ?? "");
    for (const token of new Set(code.match(/\b[A-Za-z_$][\w$]*\b/g) ?? []))
      if (declared.has(token) && !closure.has(token)) queue.push(token);
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
          const mine = comparable(source, name);
          if (mine === null) continue; // already reported by the assertion above
          expect(`${shortName(file)} :: ${name}\n${mine}`).toBe(
            `${shortName(file)} :: ${name}\n${comparable(skillSource, name)}`,
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

      it("threads the copy count's own input into the props it hands the painter", () => {
        // THE ONE LINE THE PAINTER NEEDS AND THE PARITY CHECK CANNOT SEE. `requireBoxAspects` reads
        // `props.geometry.boxAspects`; a runner that builds `props.geometry` as a hand-typed field
        // list can carry every function of this capability, byte for byte, and still throw the first
        // time a world camera reaches it — which is what happened to the rabies beat on 2026-08-23,
        // with advice ("re-bake it") that spends a MapTiler key and changes nothing, because the bake
        // had already written the field. The two fields are one derivation: a hand-typed
        // `props.geometry` that names `cannotCover` must name `boxAspects` too. A runner that hands
        // the whole loaded plate geometry over (`geometry,` / `{ ...geometry, points }`) carries both
        // by construction and is not asked.
        for (const at of [...source.matchAll(/\bgeometry:\s*\{/g)]) {
          const literal = source.slice(
            at.index ?? 0,
            blockEnd(source, (at.index ?? 0) + "geometry:".length),
          );
          if (!literal.includes("cannotCover")) continue;
          expect(
            `${shortName(file)}: a typed props.geometry names cannotCover and boxAspects: ${literal.includes("boxAspects")}`,
          ).toBe(
            `${shortName(file)}: a typed props.geometry names cannotCover and boxAspects: true`,
          );
        }
      });
    });
  }
});

// ── EXERCISING EVERY COPY, BECAUSE THE BEATS CANNOT ──────────────────────────────────────────────
//
// The wrap ruling was verified on the two beats that had a full-turn camera. It was then propagated
// to six more whose cameras span 59°, 66°, 0.1°, 83°, 18° and 34° — so `worldCopies` is 1 in all six
// and the code path CANNOT EXECUTE on any of them. Byte-identity says the copies are the same text;
// it does not say the text works, and the propagation commit's own message said out loud that every
// stylesheet was unchanged. That is a capability certified by a population incapable of exercising
// it, and it is the same shape as a requirement that cannot fire.
//
// So each copy is RUN, on a world-shaped fixture, out of its own file's bytes: the closure's
// declarations and the constants behind them are lifted and evaluated on their own, with no import
// and no beat. Every copy therefore has evidence of its own, whatever camera its beat happens to
// have — and the fixture is deliberately the awkward case the format actually ships (a choropleth
// whose pointer target is `.pt-small`, marks that answer by their painted shape, one label).

/** A two-layer page in the shape `repeatWorlds` requires: the baked plate under `#mw-fallback`, this
 *  beat's marks under `.mw-overlay`, one mark carrying every channel the ruling talks about — a
 *  `data-key` to answer with, a `data-detail` the censuses count it by, a `title` for the reader with
 *  no JavaScript, an `aria-label` for the keyboard. */
const WORLD_FIXTURE_HTML =
  '<div class="map-web-page"><div class="mw-stage"><div class="mw-viewport">' +
  '<div id="mw-fallback" class="mw-fallback"><svg class="map" viewBox="0 0 1200 815">' +
  '<image href="data:image/png;base64,AA"/>' +
  '<path class="region pt-small" data-key="NGA" d="M0 0"><title>Nigeria — 54.5</title></path>' +
  "</svg></div>" +
  '<div class="mw-overlay">' +
  '<button class="pt-small" data-key="NGA" data-detail="Nigeria — 54.5" aria-label="Nigeria" title="Nigeria — 54.5"></button>' +
  '<span class="point-label">Nigeria</span>' +
  "</div></div></div></div>";

/** The stylesheet a copy reads its own answer out of. `.pt-small` is pointer-active and `.pt` is
 *  active only under `html.mw-live`, which is the discrimination `pointerActiveOverlayClasses` was
 *  written for — a copy that ignored the live qualifier would carry the wrong marks. */
const WORLD_FIXTURE_CSS =
  ".mw-overlay { pointer-events: none; }\n" +
  ".mw-overlay .pt-small { pointer-events: auto; }\n" +
  "html.mw-live .mw-overlay .pt { pointer-events: auto; }";

type WrapApi = {
  repeatWorlds: (html: string, copies: number, css: string) => string;
  worldTilingCss: (a: {
    frame: { width: number; height: number };
    worldCopies: number;
  }) => string;
  requireBoxAspects: (geometry: unknown) => unknown;
  pointerActiveOverlayClasses: (css: string) => Set<string>;
};

/** THIS FILE'S OWN COPY OF THE CAPABILITY, EVALUATED. Its declarations and the constants they decide
 *  with are lifted out and run as a standalone script — no `import`, so a renderer's module-level
 *  work (reading a palette, resolving maplibre, its CLI block) never runs and nothing is written. */
function wrapApiOf(source: string): WrapApi {
  const declarations = CLOSURE.map((name) =>
    (declaration(source, name) ?? "").replace(/^export /m, ""),
  );
  const constants = [...source.matchAll(/^const [A-Z][A-Z0-9_]* = .*;$/gm)]
    .map((m) => m[0])
    .filter((line) => {
      const named = /^const ([A-Z][A-Z0-9_]*)/.exec(line)?.[1] ?? "";
      return declarations.some((d) => new RegExp(`\\b${named}\\b`).test(d));
    });
  const script = `${constants.join("\n")}\n${declarations.join("\n")}\nreturn { ${CLOSURE.join(", ")} };`;
  return new Function(script)() as WrapApi;
}

/** What one copy does to the fixture. */
function driveWrap(source: string) {
  const api = wrapApiOf(source);
  const out = api.repeatWorlds(WORLD_FIXTURE_HTML, 3, WORLD_FIXTURE_CSS);
  const n = (re: RegExp) => (out.match(re) ?? []).length;
  return {
    painted: n(/class="mw-world"/g),
    layers: n(/\sdata-world="primary"/g),
    repeats: n(/\sdata-world="repeat"/g),
    pointable: n(/data-key="NGA"/g),
    counted: n(/data-detail=/g),
    tooltips: n(/title="Nigeria/g) + n(/<title>Nigeria/g),
    unfocusable: n(/tabindex="-1"/g),
    uses: n(/<use /g),
    labels: n(/point-label/g),
    unchangedAtOne:
      api.repeatWorlds(WORLD_FIXTURE_HTML, 1, WORLD_FIXTURE_CSS) ===
      WORLD_FIXTURE_HTML,
    tiling: api.worldTilingCss({
      frame: { width: 1200, height: 815 },
      worldCopies: 3,
    }),
    tilingAtOne: api.worldTilingCss({
      frame: { width: 1200, height: 815 },
      worldCopies: 1,
    }),
    marks: [...api.pointerActiveOverlayClasses(WORLD_FIXTURE_CSS)]
      .sort()
      .join(","),
    keepsBoxAspects: JSON.stringify(
      api.requireBoxAspects({
        boxAspects: { narrowest: 1.317, widest: 2.572 },
      }),
    ),
    refusesWithoutBoxAspects: (() => {
      try {
        api.requireBoxAspects({});
        return false;
      } catch {
        return true;
      }
    })(),
  };
}

const REFERENCE_DRIVE = driveWrap(skillSource);

describe("every copy of the capability, run on a world it will never meet in its own beat", () => {
  it("paints three worlds out of the skill's own renderer, and that is the reading the copies are held to", () => {
    // The reference, asserted in full rather than derived from a copy — otherwise nine files agreeing
    // on a broken answer would pass. Two layers repeat, so six `.mw-world` for three copies.
    expect(REFERENCE_DRIVE).toMatchObject({
      painted: 6,
      layers: 2,
      repeats: 4,
      // Six pointable marks: the primary's path and button, plus one `<use>` and one button per
      // repeat. This is the number the ruling is about — a repeat a reader can point at.
      pointable: 6,
      // ONE. The keyboard and the accessible table do not multiply with the copies.
      counted: 1,
      // Six: every copy keeps the tooltip a reader gets with the script off, on both layers — three
      // `<title>` children on the painted shapes and three `title=` attributes on the buttons.
      tooltips: 6,
      unfocusable: 2,
      uses: 4,
      labels: 3,
      unchangedAtOne: true,
      tilingAtOne: "",
      marks: "pt-small",
      keepsBoxAspects: '{"narrowest":1.317,"widest":2.572}',
      refusesWithoutBoxAspects: true,
    });
    expect(REFERENCE_DRIVE.tiling).toContain(".mw-world {");
    expect(REFERENCE_DRIVE.tiling).toContain("height: 100cqh;");
    expect(REFERENCE_DRIVE.tiling).toContain("calc(100% / 3)");
  });

  for (const file of ASSEMBLERS) {
    if (file === SKILL_RENDERER) continue;
    it(`${shortName(file)} does exactly the same`, () => {
      expect({
        file: shortName(file),
        ...driveWrap(readFileSync(file, "utf8")),
      }).toEqual({
        file: shortName(file),
        ...REFERENCE_DRIVE,
      });
    });
  }

  it("says how much of its own evidence comes from a beat, and refuses to certify a copy on bytes alone", () => {
    // THE COORDINATOR'S QUESTION, ASSERTED. A capability whose whole verification population has
    // `worldCopies = 1` is certified by nothing. This names the split rather than leaving it to be
    // discovered: today two of the ten assemblers have a beat with a full-turn camera, so eight are
    // covered only by the drive above — and if the drive were ever deleted or narrowed, that eight
    // becomes ten and this assertion is the one that says so.
    const worldCameras = new Set(
      BEATS.filter(({ span }) => span >= FULL_TURN_DEG).map(({ beat }) => beat),
    );
    const exercisedByItsOwnBeat = ASSEMBLERS.filter((file) =>
      [...worldCameras].some((beat) => file.startsWith(beat + sep)),
    );
    const exercisedByTheDrive = ASSEMBLERS.filter(
      (file) => driveWrap(readFileSync(file, "utf8")).painted === 6,
    );
    const certifiedByBytesAlone = ASSEMBLERS.filter(
      (file) =>
        !exercisedByItsOwnBeat.includes(file) &&
        !exercisedByTheDrive.includes(file),
    );
    expect(
      `certified by byte-comparison alone: ${certifiedByBytesAlone.map(shortName).join(", ")}`,
    ).toBe("certified by byte-comparison alone: ");
    expect(exercisedByTheDrive.length).toBe(ASSEMBLERS.length);
    expect(exercisedByItsOwnBeat.length).toBeLessThan(ASSEMBLERS.length);
  });
});

describe("the painter and the derivation reach the same files", () => {
  it("is nobody's asymmetry: every file that declares one declares the other", () => {
    // Measured on 2026-08-23, and it is the finding underneath this whole file: the DERIVATION
    // (`cannotCover`, in `delivery-frame.mjs`) was distributed to seven files and the PAINTER
    // (`repeatWorlds`) to two. A beat could therefore be right that it needs to wrap, print the
    // sentence saying so, and have nothing able to do it — which is precisely the page that covered
    // 66.7% of its window while announcing that it filled it by repeating the world.
    const painters: string[] = [];
    for (const dir of WALKED)
      for (const file of filesUnder(join(TWIN, dir))) {
        if (file.split(sep).includes("test")) continue;
        if (
          /^(?:export )?function repeatWorlds\(/m.test(
            readFileSync(file, "utf8"),
          )
        )
          painters.push(file);
      }
    expect(painters.map(shortName).sort()).toEqual(
      ASSEMBLERS.map(shortName).sort(),
    );
  });
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
