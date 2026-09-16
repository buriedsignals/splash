// THE MAP × WEB SCAFFOLD HAD NO GUARD AT ALL, and it writes the first 50% of every live-map beat.
//
// Two things are held here, and they are the two the scaffold can break silently.
//
//   1. EVERY DECLARED HOLE THROWS WHEN UNFILLED. The cold read of this path named the refusing hole
//      "the strongest enforcement in the whole path", and it is only that while every hole actually
//      refuses. The old templates shipped inert placeholders — `const title = "SCAFFOLD";` renders a
//      page with the word SCAFFOLD in its headline and nothing goes red. Proved in two halves that
//      compose: every `SCAFFOLD` marker outside a comment is a CALL to the file's own one-line
//      helper, and that helper, extracted and executed, throws for each declared hole name.
//   2. A GENERATED SKELETON IS WELL-FORMED. Every file transpiles, no `%%TOKEN%%` survives the fill,
//      and the component carries the landmarks the format's own machinery reads off the markup —
//      `data-plate`, `.map-layer`, `#mw-live-plan`, `data-stack-note`, `data-mark` and `data-detail`.
//      A scaffold that writes markup the guards cannot see is worse than one that writes none.
//
// What this file deliberately does NOT hold: that the scaffold writes ENOUGH. The line between
// plumbing and judgement is an editorial one — the owner's standing condition is that a generator
// must not constrain the beat's originality — and a test that pinned the generated line count would
// turn the next author's better idea into a red.

import { describe, it, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  scaffoldBeat,
  componentNameOf,
  dataFileOf,
  TYPES,
  NOT_A_LIVE_MAP,
} from "../scripts/scaffold-web-map-beat.mjs";

const REPO = join(import.meta.dirname, "..", "..", "..");

/**
 * A throwaway beat, generated INSIDE the repository rather than under the system temp directory:
 * the generated `.tsx` is imported and rendered by one of these tests, and a component outside the
 * tree cannot resolve `react/jsx-dev-runtime`. Dot-prefixed, which the scaffold's own beat-name rule
 * allows and which keeps it out of every corpus sweep; removed whether the test passes or not.
 */
let counter = 0;
function fixture(): { root: string; beat: string; cleanup: () => void } {
  const beat = `.scaffold-probe-${process.pid}-${counter++}`;
  const dir = join(REPO, "proof", beat);
  rmSync(dir, { recursive: true, force: true });
  return { root: REPO, beat: `proof/${beat}`, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

/** The other half: a root that is NOT this repository, for the refusals about the static sibling. */
function bareRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "map-scaffold-"));
  const statics = join(root, "proof", "static-flow-map-danube");
  mkdirSync(statics, { recursive: true });
  writeFileSync(join(statics, "PALETTE.md"), "# Palette\n\nground: #fff\n");
  writeFileSync(join(statics, "data.csv"), "code,km\nDEU,523\n");
  return root;
}

const generate = (f: { root: string; beat: string }, over: Record<string, string> = {}) =>
  scaffoldBeat({
    root: f.root,
    type: "flow-map",
    beat: f.beat,
    staticBeat: "proof/static-flow-map-ukraine-protection",
    ...over,
  });

const beatDirOf = (f: { root: string; beat: string }) => join(f.root, f.beat);
const componentOf = (f: { root: string; beat: string }) =>
  readdirSync(beatDirOf(f)).find((x) => /^Directed.*Web\.tsx$/.test(x)) as string;

/** What is left of a line once its comments are gone — a `SCAFFOLD` in prose is guidance, not a hole. */
const stripComments = (line: string) =>
  line
    .replace(/\{\s*\/\*[\s\S]*$/, "")
    .replace(/\/\*[\s\S]*$/, "")
    .replace(/(^|[^:"'`])\/\/.*$/, "$1")
    .replace(/^\s*\*.*$/, "");

/** Every `SCAFFOLD("…")` hole name a generated file declares. */
const holeNamesIn = (source: string) =>
  [...source.matchAll(/\bSCAFFOLD\("([^"]+)"\)/g)].map((m) => m[1]);

/** The landmarks the format's own machinery reads off a live-map page's markup. Each one is a
 *  mechanism somewhere else in the tree, not a style: the frozen fallback, the live map's box, the
 *  plan the live layer parses, and the table that carries the gesture with no script. */
const LANDMARKS = [
  'className="chart-figure"',
  'className="chart-header"',
  'className="chart-plot"',
  'data-plate=""',
  'className="map-layer"',
  'id="mw-live-plan"',
  'className="mw-readings"',
];

describe("the map × web scaffold — every hole refuses, and the skeleton is well-formed", () => {
  it("should write exactly the six files a live-map beat starts from", () => {
    const f = fixture();
    try {
      const name = componentNameOf(f.beat.replace("proof/", ""), "flow-map");
      expect(generate(f).sort()).toEqual(
        ["BRIEF.md", `Directed${name}Web.tsx`, "PALETTE.md", "bake.mjs", "camera.ts", "render-directions-web.mjs"].sort(),
      );
    } finally {
      f.cleanup();
    }
  });

  it("should leave no unreplaced token behind — a `%%Name%%` that survives the fill ships in the page", () => {
    const f = fixture();
    try {
      for (const file of generate(f)) {
        const source = readFileSync(join(beatDirOf(f), file), "utf8");
        expect({ file, tokens: source.match(/%%[A-Za-z_]+%%/g) ?? [] }).toEqual({ file, tokens: [] });
      }
    } finally {
      f.cleanup();
    }
  });

  it("should generate source every file of which parses", () => {
    const f = fixture();
    try {
      for (const file of generate(f)) {
        if (file.endsWith(".md")) continue;
        const loader = file.endsWith(".tsx") ? "tsx" : file.endsWith(".ts") ? "ts" : "js";
        const source = readFileSync(join(beatDirOf(f), file), "utf8");
        expect(() => new Bun.Transpiler({ loader }).transformSync(source)).not.toThrow();
      }
    } finally {
      f.cleanup();
    }
  });

  it("should declare every hole as a refusal — never as an inert placeholder a page could print", () => {
    // The rule, stated once: a `SCAFFOLD` in CODE (not in a comment) is either a call to the file's
    // own throwing helper, that helper's declaration, or a SENTINEL the same file refuses on. The
    // old templates failed this — `const title = "SCAFFOLD";` renders a page with SCAFFOLD in its
    // headline and nothing goes red.
    const f = fixture();
    try {
      const offenders: string[] = [];
      for (const file of generate(f)) {
        if (file.endsWith(".md")) continue;
        const source = readFileSync(join(beatDirOf(f), file), "utf8");
        const lines = source.split("\n");
        for (const [i, raw] of lines.entries()) {
          const code = stripComments(raw);
          if (!code.includes("SCAFFOLD")) continue;
          if (/\bSCAFFOLD\s*=|function SCAFFOLD\b|throw new Error\(`SCAFFOLD:|throw new Error\("SCAFFOLD:/.test(code)) continue;
          if (/\bSCAFFOLD\(/.test(code)) continue;
          // A sentinel is allowed only where the file itself refuses on it.
          const sentinel = code.match(/const ([A-Z_][A-Z_0-9]*) = "SCAFFOLD"/)?.[1];
          if (sentinel && new RegExp(`${sentinel} === "SCAFFOLD"\\) SCAFFOLD\\(`).test(source)) continue;
          offenders.push(`${file}:${i + 1} ${raw.trim()}`);
        }
      }
      expect(offenders).toEqual([]);
    } finally {
      f.cleanup();
    }
  });

  it("should throw for EVERY declared hole name, in both generated code files", () => {
    const f = fixture();
    try {
      const written = generate(f);
      for (const file of ["render-directions-web.mjs", written.find((x) => x.endsWith(".tsx")) as string]) {
        const source = readFileSync(join(beatDirOf(f), file), "utf8");
        const names = holeNamesIn(source);
        // A file the scaffold wrote with no hole at all would pass every other assertion here.
        expect({ file, holes: names.length > 0 }).toEqual({ file, holes: true });

        // The file's own helper, extracted and executed — the single mechanism every hole calls.
        const declaration =
          source.match(/const SCAFFOLD = \(what\) => \{[\s\S]*?\n\};/)?.[0] ??
          source.match(/function SCAFFOLD\(what: string\): never \{[\s\S]*?\n\}/)?.[0];
        expect({ file, helper: Boolean(declaration) }).toEqual({ file, helper: true });
        const helper = new Function(
          `${(declaration as string).replace(/: string\): never/, ")")}\nreturn SCAFFOLD;`,
        )() as (what: string) => never;

        for (const name of names)
          expect(() => helper(name)).toThrow(
            new RegExp(`^SCAFFOLD: .*${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
          );
      }
    } finally {
      f.cleanup();
    }
  });

  it("should refuse to render the generated component rather than produce a page that looks finished", async () => {
    const f = fixture();
    try {
      generate(f);
      const file = componentOf(f);
      const module = await import(`${join(beatDirOf(f), file)}?probe=${Date.now()}`);
      const Component = module[file.replace(/\.tsx$/, "")];
      expect(typeof Component).toBe("function");
      expect(() => renderToStaticMarkup(createElement(Component, {} as never))).toThrow(/^SCAFFOLD: .* has no /);
    } finally {
      f.cleanup();
    }
  });

  it("should refuse BEFORE the plate bake — a runner that bakes three plates then refuses costs a key and minutes", () => {
    const f = fixture();
    try {
      generate(f);
      const source = readFileSync(join(beatDirOf(f), "render-directions-web.mjs"), "utf8");
      const firstHole = source.indexOf("SCAFFOLD(\"eyebrow\")");
      const firstBake = source.indexOf("ensurePlate(id,");
      expect(firstHole).toBeGreaterThan(-1);
      expect(firstBake).toBeGreaterThan(-1);
      expect(firstHole).toBeLessThan(firstBake);
    } finally {
      f.cleanup();
    }
  });

  it("should carry every landmark the format's own machinery reads off the markup", () => {
    const f = fixture();
    try {
      generate(f);
      const component = readFileSync(join(beatDirOf(f), componentOf(f)), "utf8");
      for (const landmark of LANDMARKS)
        expect({ landmark, present: component.includes(landmark) }).toEqual({ landmark, present: true });
      for (const landmark of ["data-mark={row.key}", "data-detail={row.detail}", "data-stack-note", 'role="status"'])
        expect({ landmark, present: component.includes(landmark) }).toEqual({ landmark, present: true });
    } finally {
      f.cleanup();
    }
  });

  it("should refuse a beat folder that already exists, and never merge into one", () => {
    const f = fixture();
    try {
      generate(f);
      expect(() => generate(f)).toThrow(/already exists/);
    } finally {
      f.cleanup();
    }
  });

  it("should refuse a type with no sheet, and refuse the one type that is not a live map", () => {
    const f = fixture();
    try {
      expect(() => generate(f, { type: "waffle" })).toThrow(/--type must be one of the eight map types/);
      for (const type of NOT_A_LIVE_MAP) {
        expect(TYPES).toContain(type);
        expect(() => generate(f, { type })).toThrow(/is not a live map/);
      }
    } finally {
      f.cleanup();
    }
  });

  it("should refuse a static sibling that carries no palette and no frozen data", () => {
    const root = bareRoot();
    try {
      const bare = join(root, "proof", "static-flow-map-bare");
      mkdirSync(bare, { recursive: true });
      const at = { root, beat: "proof/web-flow-map-danube" };
      expect(() => generate(at, { staticBeat: "proof/static-flow-map-bare" })).toThrow(/carries no PALETTE.md/);
      writeFileSync(join(bare, "PALETTE.md"), "# Palette\n");
      expect(() => generate(at, { staticBeat: "proof/static-flow-map-bare" })).toThrow(/carries no frozen data/);
      // And the happy path on a root that is not this repository, so the refusals above are not vacuous.
      expect(() => generate(at, { staticBeat: "proof/static-flow-map-danube" })).not.toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("should refuse a beat that is not directly under proof/", () => {
    const root = bareRoot();
    try {
      expect(() =>
        generate({ root, beat: "proof/nested/web-flow-map-danube" }, { staticBeat: "proof/static-flow-map-danube" }),
      ).toThrow(/directly under proof\//);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("should derive the component name from the beat's subject, never from its type", () => {
    expect(componentNameOf("web-dot-density-europe-stations", "dot-density")).toBe("EuropeStations");
    expect(componentNameOf("web-flow-map-danube", "flow-map")).toBe("Danube");
  });

  it("should prefer data.csv, then any csv, then any json that is not the shapes file", () => {
    const root = bareRoot();
    try {
      const dir = join(root, "proof", "static-flow-map-danube");
      expect(dataFileOf(dir)).toBe("data.csv");
      rmSync(join(dir, "data.csv"));
      writeFileSync(join(dir, "shapes.geojson"), "{}");
      writeFileSync(join(dir, "route.json"), "[]");
      expect(dataFileOf(dir)).toBe("route.json");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("should hold every beat this skill has shipped to the same skeleton the scaffold now writes", () => {
    // THE SCAFFOLD IS ONLY HONEST WHILE THE SHIPPED CORPUS AGREES WITH IT. If a future beat finds a
    // better arrangement, this is the line that has to be argued and moved — deliberately, not by a
    // template quietly drifting away from what authors actually write.
    const proof = join(REPO, "proof");
    const live = readdirSync(proof)
      .filter((d) => d.startsWith("web-"))
      .filter((d) => readdirSync(join(proof, d)).includes("bake.mjs"));
    expect(live.length).toBeGreaterThanOrEqual(7);
    for (const beat of live) {
      const file = readdirSync(join(proof, beat)).find((x) => /^Directed.*Web\.tsx$/.test(x)) as string;
      const source = readFileSync(join(proof, beat, file), "utf8");
      for (const landmark of LANDMARKS)
        expect({ beat, landmark, present: source.includes(landmark) }).toEqual({ beat, landmark, present: true });
    }
  });

  it("should point at the file that actually owns the three radius behaviours", () => {
    // The cold read found SKILL.md naming `assets/live-map.mjs`; `radiusPaintOf` — the one place a
    // `radius` strategy becomes a paint value — is in `mount.mjs`, which `live-map.mjs` imports.
    const skill = readFileSync(join(REPO, "skills", "map-web", "SKILL.md"), "utf8");
    const line = skill.split("\n").find((l) => l.includes("Three radius behaviours")) as string;
    expect(line).toContain("mount.mjs");
    expect(readFileSync(join(REPO, "skills", "map-web", "assets", "mount.mjs"), "utf8")).toContain(
      "export function radiusPaintOf(",
    );
  });
});
