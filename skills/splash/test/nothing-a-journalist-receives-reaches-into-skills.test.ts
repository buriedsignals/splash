/**
 * WHAT A JOURNALIST RECEIVES MUST NOT REACH INTO `skills/`.
 *
 * `../../skills/<skill>/…` is correct in exactly one place: a worked example at `proof/<beat>/`,
 * two levels under a checkout that also holds `skills/`. Every other copy of that line is wrong
 * twice — a story beat sits at `stories/<story>/beats/<beat>/`, where `../../` is the story folder,
 * and an installed stories root has no `skills/` at any depth, because it vendors `shared/` and the
 * Engine projects the skills into its own namespaced store.
 *
 * Measured 2026-09-23: the four adapting scaffolds copied that line into a real story's beat
 * verbatim, and the beat died on its first import. `eachThroughSkillScript` now rewrites it on the
 * way out. This runs each scaffold's own adapter over every catalogue beat it accepts and reads what
 * it actually produced — the only way to see the path a journalist takes, since the `.tmpl` files
 * are the path almost nobody takes.
 *
 * The `.ts`/`.tsx` assets are a separate, named population: a bundler reads them, and a bundler
 * cannot follow a specifier that only exists at runtime. They are counted here rather than rewritten
 * into something that would not build, so the debt is a number in a test and not a surprise.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const PROOF = join(ROOT, "proof");

/** The line itself: a specifier that climbs out of the beat and into `skills/`. */
const REACH = /from\s+"(?:\.\.\/)+skills\//;

/** A scrolly MAP beat carries its layers in a plan; a scrolly chart beat has none. */
const PLAN = /(?:^|-)plan\.mjs$/;

function beatsWith(predicate: (entries: string[]) => boolean): string[] {
  return readdirSync(PROOF, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .filter((e) => predicate(readdirSync(join(PROOF, e.name))))
    .map((e) => `proof/${e.name}`)
    .sort();
}

/** `{ file: content }` for everything an adapter handed back that is a file. */
function filesOf(adapted: Record<string, unknown>): [string, string][] {
  const files = (adapted.files ?? adapted) as Record<string, string>;
  return Object.entries(files).filter(([name]) =>
    /\.(mjs|tsx?|json)$/.test(name),
  );
}

type Adapter = {
  name: string;
  from: string[];
  adapt: (fromBeat: string) => Record<string, unknown>;
};

async function adapters(): Promise<Adapter[]> {
  const chart = await import(
    join(ROOT, "skills", "chart-beat", "scripts", "scaffold-static-beat.mjs")
  );
  const map = await import(
    join(ROOT, "skills", "map-beat", "scripts", "scaffold-static-map-beat.mjs")
  );
  const scrolly = await import(
    join(ROOT, "skills", "scrolly", "scripts", "scaffold-scrolly-beat.mjs")
  );
  const scrollyMap = await import(
    join(ROOT, "skills", "scrolly", "scripts", "scaffold-scrolly-map-beat.mjs")
  );
  const beatPath = "stories/a-story/beats/a-beat";
  const values = { Name: "ABeat", BEAT_PATH: beatPath };
  return [
    {
      name: "chart-beat/scaffold-static-beat.mjs",
      // A static CHART beat: the runner, and no bake — a bake is what makes it a map.
      from: beatsWith(
        (e) => e.includes("render-directions.mjs") && !e.includes("bake.mjs"),
      ),
      adapt: (fromBeat) =>
        chart.adaptFromBeat({
          root: ROOT,
          fromBeat,
          beatPath,
          component: "ABeat",
        }),
    },
    {
      name: "map-beat/scaffold-static-map-beat.mjs",
      from: beatsWith(
        (e) => e.includes("render-directions.mjs") && e.includes("bake.mjs"),
      ),
      adapt: (fromBeat) =>
        map.adaptFromBeat({
          root: ROOT,
          fromBeat,
          beatPath,
          component: "ABeat",
        }),
    },
    {
      name: "scrolly/scaffold-scrolly-beat.mjs",
      // A scrolly CHART beat: no plan of its own — a plan is what carries a map's layers.
      from: beatsWith(
        (e) =>
          e.includes("render-directions-scrolly.mjs") && !e.some((f) => PLAN.test(f)),
      ),
      adapt: (fromBeat) =>
        scrolly.adaptFromBeat({ root: ROOT, fromBeat, values }),
    },
    {
      name: "scrolly/scaffold-scrolly-map-beat.mjs",
      from: beatsWith(
        (e) =>
          e.includes("render-directions-scrolly.mjs") && e.some((f) => PLAN.test(f)),
      ),
      adapt: (fromBeat) =>
        scrollyMap.adaptFromBeat({ root: ROOT, fromBeat, values }),
    },
  ];
}

/** Every file an adapter produced, over every beat it accepts — with the ones it refuses skipped,
 *  since a scaffold's own preconditions are its own business and are held elsewhere. */
async function produced(): Promise<
  { scaffold: string; beat: string; file: string; source: string }[]
> {
  const out: {
    scaffold: string;
    beat: string;
    file: string;
    source: string;
  }[] = [];
  for (const { name, from, adapt } of await adapters()) {
    for (const beat of from) {
      let adapted: Record<string, unknown>;
      try {
        adapted = adapt(beat);
      } catch {
        continue;
      }
      for (const [file, source] of filesOf(adapted))
        out.push({ scaffold: name, beat, file, source });
    }
  }
  return out;
}

describe("the code a scaffold writes into a story", () => {
  it("adapts real catalogue beats, so this file cannot pass by producing nothing", async () => {
    const all = await produced();
    expect(all.length).toBeGreaterThanOrEqual(40);
    expect(new Set(all.map((p) => p.scaffold)).size).toBe(4);
  });

  it("reaches into no skills/ from any module it writes", async () => {
    const reaching = (await produced())
      .filter(({ file }) => file.endsWith(".mjs"))
      .filter(({ source }) => REACH.test(source))
      .map(({ scaffold, beat, file }) => `${scaffold} ← ${beat}/${file}`);
    expect([...new Set(reaching)]).toEqual([]);
  });

  /**
   * THE BUNDLED HALF, counted and not rewritten. A `.tsx` component is read by Remotion's bundler
   * and a `.ts` vocabulary by the web renderer's; neither can follow `await import(skillScriptFrom(…))`,
   * so the answer for these is to vendor what they need into `shared/`, not to rewrite the line.
   * Pinning the count keeps that debt from growing while it waits.
   */
  it("names the bundled files that still do, so the debt cannot quietly grow", async () => {
    const reaching = (await produced())
      .filter(({ file }) => /\.tsx?$/.test(file))
      .filter(({ source }) => REACH.test(source))
      .map(({ scaffold }) => scaffold);
    expect([...new Set(reaching)].sort()).toEqual([]);
  });

  /** And the templates, which are the same promise on the path fewer journalists take. */
  it("ships no scaffold template that reaches into skills/ from a module", () => {
    const reaching: string[] = [];
    for (const skill of readdirSync(join(ROOT, "skills"), {
      withFileTypes: true,
    })) {
      if (!skill.isDirectory()) continue;
      const assets = join(ROOT, "skills", skill.name, "assets");
      if (!existsSync(assets)) continue;
      for (const dir of readdirSync(assets).filter((d) =>
        d.endsWith("-scaffold"),
      )) {
        for (const file of readdirSync(join(assets, dir)).filter((f) =>
          f.endsWith(".mjs.tmpl"),
        )) {
          const source = readFileSync(join(assets, dir, file), "utf8");
          if (REACH.test(source))
            reaching.push(`${skill.name}/assets/${dir}/${file}`);
        }
      }
    }
    expect(reaching.sort()).toEqual([]);
  });
});
