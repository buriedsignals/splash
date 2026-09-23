/**
 * THE ROOT A JOURNALIST WORKS IN IS NOT THE ROOT THE SKILL LIVES IN.
 *
 * In a checkout they are one tree — `skills/`, `proof/` and `stories/` together — so a scaffold
 * could resolve everything against its own `../../..` and be right about all of it. An installed
 * root is not a checkout: it vendors `shared/`, it holds the journalist's stories, and the Engine
 * projects the skills somewhere else entirely.
 *
 * Measured 2026-09-23, taking a real story's map into an installed root: the only way to reach it
 * was `--beat ../../../../.local/share/splash-stories/stories/…/beats/…`, and that traversal then
 * travelled INTO the written beat as its own recorded path, because `BEAT_PATH` is measured from
 * the same root. Every path the beat records about itself was wrong from the first line.
 *
 * So there are two roots now, and this holds both halves at once, on a temporary root that has no
 * `skills/` and no `proof/` — the shape an installed root actually has:
 *   · the beat lands where the journalist is working, and records the path it actually has;
 *   · the type sheet and the worked example are still found, in the skill's own checkout.
 */
import { describe, expect, it } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { workingRoot } from "../../../shared/design-base/working-root.mjs";

const ROOT = join(import.meta.dirname, "..", "..", "..");

/** An installed stories root: `shared/`, the journalist's stories, and nothing else. */
function installedRoot(): string {
  const home = mkdtempSync(join(tmpdir(), "splash-working-root-"));
  writeFileSync(
    join(home, "package.json"),
    JSON.stringify({
      name: "splash-root",
      type: "module",
      imports: { "#shared/*": "./shared/*" },
    }),
  );
  symlinkSync(join(ROOT, "shared"), join(home, "shared"));
  mkdirSync(join(home, "stories", "a-story", "beats"), { recursive: true });
  // The still a video or a web beat is derived from, which those scaffolds require to exist.
  mkdirSync(join(home, "stories", "a-story", "beats", "a-still"), { recursive: true });
  // The frozen data the still carries, which a video or a web beat is derived from.
  writeFileSync(
    join(home, "stories", "a-story", "beats", "a-still", "data.csv"),
    "iso3,value\nBGR,38.4\n",
  );
  // The story's own answers, which every scaffold refuses to guess — recorded at the story root, the
  // way a real story records them, so `readPalette`'s walk up from the beat finds them.
  writeFileSync(
    join(home, "stories", "a-story", "PALETTE.md"),
    `---\nground: "#16191B"\naccent: "#D4A853"\naccents: #5B8A8A\norigin: newsroom\n---\n`,
  );
  return home;
}

/** One real type per scaffold, read off the skill's own sheets so a renamed type cannot rot this.
 *  `except` names the types a scaffold refuses on their own merits (map-web writes the live two-layer
 *  plumbing, and a cartogram has no basemap to put under it). */
function firstType(skill: string, { sub = [] as string[], except = [] as string[] } = {}): string {
  const dir = join(ROOT, "skills", skill, "references", "types", ...sub);
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .map((f) => f.replace(/\.md$/, ""))
    .filter((t) => !except.includes(t))
    .sort()[0];
}

type Scaffold = {
  name: string;
  script: string;
  type: string;
  /** Whether this scaffold names a worked example in its sheets, i.e. has `workedExampleOf`. */
  adapts: boolean;
};

const SCAFFOLDS: Scaffold[] = [
  {
    name: "chart-beat",
    script: "chart-beat/scripts/scaffold-static-beat.mjs",
    // Named: a type whose worked example this scaffold can actually adapt. `area` is first
    // alphabetically and its proof carries plumbing the rewrite does not recognise — a real gap in
    // the catalogue, and not this file's subject.
    type: "bar-and-column",
    adapts: true,
  },
  {
    name: "map-beat",
    script: "map-beat/scripts/scaffold-static-map-beat.mjs",
    // Named for the same reason: `cartogram` is first and draws no basemap, so it has no bake.mjs.
    type: "choropleth",
    adapts: true,
  },
  {
    name: "scrolly",
    script: "scrolly/scripts/scaffold-scrolly-beat.mjs",
    type: firstType("scrolly"),
    adapts: true,
  },
  {
    name: "scrolly-map",
    script: "scrolly/scripts/scaffold-scrolly-map-beat.mjs",
    // Named, not first: this scaffold shares the scrolly sheets with the chart one and accepts only
    // the map types among them — a chart type's worked example carries no plan for it to adapt.
    type: "choropleth",
    adapts: true,
  },
  {
    name: "chart-video",
    script: "chart-video/scripts/scaffold-video-beat.mjs",
    type: firstType("chart-video"),
    adapts: false,
  },
  {
    name: "chart-web",
    script: "chart-web/scripts/scaffold-web-beat.mjs",
    type: firstType("chart-web"),
    adapts: false,
  },
  {
    name: "map-web",
    script: "map-web/scripts/scaffold-web-map-beat.mjs",
    type: firstType("map-web", { except: ["cartogram"] }),
    adapts: false,
  },
  {
    name: "map-video",
    script: "map-beat/scripts/scaffold-map-video-beat.mjs",
    type: firstType("map-beat", { sub: ["video"] }),
    adapts: false,
  },
];

describe("a scaffold aimed at an installed root", () => {
  it("covers every producer a journalist can be sent to", () => {
    expect(SCAFFOLDS.length).toBe(8);
  });

  for (const { name, script, type, adapts } of SCAFFOLDS) {
    it(`${name} records the beat's own path, not a climb out of the skill's checkout`, async () => {
      const mod = await import(join(ROOT, "skills", script));
      const home = installedRoot();
      const { beatDir, values } = mod.tokensFor({
        root: home,
        type,
        beat: "stories/a-story/beats/a-beat",
        staticBeat: "stories/a-story/beats/a-still",
        component: "ABeat",
      });
      expect(beatDir).toBe(join(home, "stories", "a-story", "beats", "a-beat"));
      expect(values.BEAT_PATH).toBe("stories/a-story/beats/a-beat");
      expect(values.BEAT_PATH).not.toContain("..");
    });

    if (adapts) {
      it(`${name} still finds its own worked example, which no installed root carries`, async () => {
        const mod = await import(join(ROOT, "skills", script));
        expect(mod.workedExampleOf(installedRoot(), type)).toMatch(/^proof\//);
      });

      /**
       * AND THE COPY TAKES THE NEW BEAT'S IDENTITY, not the proof's.
       *
       * A worked example spells its own location in its code — `// twin/proof/<beat>/beat.mjs` and
       * every path it records about itself — and the adapter renames that by measuring the source
       * against a root. Measured against the JOURNALIST'S root, `proof/<beat>` is a path that does
       * not exist there, so the rename matched nothing and the written beat kept calling itself by
       * the proof's name. Measured 2026-09-23 on the first scaffold run that worked at all.
       */
      it(`${name} renames the copy for the beat it is becoming`, async () => {
        const mod = await import(join(ROOT, "skills", script));
        const home = installedRoot();
        const beatPath = "stories/a-story/beats/a-beat";
        const fromBeat = mod.workedExampleOf(home, type);
        const adapted = mod.adaptFromBeat({
          root: home,
          fromBeat,
          beatPath,
          component: "ABeat",
          values: { Name: "ABeat", BEAT_PATH: beatPath },
        });
        const files = Object.entries((adapted.files ?? adapted) as Record<string, string>).filter(
          ([f]) => f.endsWith(".mjs"),
        );
        expect(files.length).toBeGreaterThan(0);
        // The provenance banner names the proof on purpose; the canonical `twin/` line must not.
        // How many there should be is read off the SOURCE beat, so a family whose runners carry no
        // such line (every scrolly one) is not quietly asserting nothing.
        const canonicalOf = (source: string) => /^\/\/ twin\/(.+)$/m.exec(source)?.[1] ?? null;
        const owed = files.filter(([file]) =>
          canonicalOf(readFileSync(join(ROOT, fromBeat, file), "utf8")),
        );
        for (const [file, source] of files) {
          const canonical = canonicalOf(source);
          if (canonical === null) continue;
          expect(`${file}: ${canonical}`).toBe(`${file}: ${beatPath}/${file}`);
        }
        expect(files.filter(([, source]) => canonicalOf(source)).length).toBe(owed.length);
      });
    }
  }

  /** And the question the CLI asks on the journalist's behalf, since nothing else does. */
  it("finds the root from anywhere inside it, and falls back where there is none", () => {
    const home = installedRoot();
    expect(workingRoot(join(home, "stories", "a-story", "beats", "a-still"), "/fallback")).toBe(home);
    expect(workingRoot(tmpdir(), "/fallback")).toBe("/fallback");
  });
});
