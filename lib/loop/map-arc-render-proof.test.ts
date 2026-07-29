import { test, expect } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mapNativeConfigErrors } from "../../skills/map-native/src/validate-config";

// THE PROOF that a map scrolly walks the journalist's CONFIRMED regions, in the order he
// confirmed them, with the sentences he wrote — read off the built page's step nodes.
//
// WHAT IT PINS. A QA sweep found a validated config producing a materially wrong render: the
// scrolly's map track never forwarded `arcBeats` to its deriver (neither the caption
// derivation in Scrolly.tsx nor the camera computation in ScrollyMap/ScrollySymbolMap), so a
// confirmed multi-region walk collapsed to the five-region salience default — and the caption
// composer then labelled whichever region came LAST "the lowest", though another region held
// the minimum. Two of this project's standing rules broken at once: the journalist's words
// ship as the journalist's, and a validated config never silently produces a different
// artifact. The sweep caught it only by an improvised manual screenshot review.
//
// WHY IT IS READ FROM THE DOM. A scrolly computes its captions in the browser, from the config
// the bundle bakes in — so the captions are not IN the bundle, and grepping the built
// single-file HTML for them proves nothing either way. This repo already wrote that rule down
// after a false alarm on a palette. Same discipline as lib/loop/beats-render-proof.test.ts,
// whose readRenderedSteps this mirrors.
//
// WHY IT DOES NOT GO THROUGH THE LOOP. assembleScrolly refuses an authored plan on the map
// track outright (MAP_TRACK_BEATS_REFUSAL) — the V2 brief has no map-arc field yet. The
// defect lives on the V1 path (validate-gate → the scrolly producer), so the proof drives the
// producer exactly as that path does: scripts/produce.mjs, one real Vite single-file build
// plus the producer's own reduced-motion snap, then a third browser to read the page.
//
// TWO HALVES, as every proof in this roster has: the render below is opt-in
// (SPLASH_PROVE_MAP_ARC=1), and the fixture-validity half at the foot of the file is ALWAYS
// ON — it is what keeps this proof from going quietly vacuous, because a fixture whose
// confirmed order happens to match the salience order would pass while proving nothing.
const RUN_IT = process.env.SPLASH_PROVE_MAP_ARC === "1";
const proof = RUN_IT ? test : test.skip;

const SCROLLY_DIR = join(import.meta.dir, "..", "..", "skills", "scrolly");

// The data: renewables share by country. Salience (the default walk) would open on Norway and
// descend by value, capped at five regions.
const ROWS = [
  { code: "NOR", share: 99 },
  { code: "SWE", share: 68 },
  { code: "DEU", share: 59 },
  { code: "GBR", share: 48 },
  { code: "ESP", share: 44 },
  { code: "ITA", share: 41 },
  { code: "FRA", share: 27 },
  { code: "POL", share: 21 },
];

// The journalist's CONFIRMED walk: north to south, six regions, deliberately NOT the salience
// order. Poland — the minimum — sits THIRD, and Italy closes the walk on a middling value: a
// composer that reads rank off position would caption Italy "le plus bas" and be wrong, which
// is the sweep's Lazio/Calabria finding exactly. Two regions with data (GBR, ESP) are left out
// of the argument on purpose: the arc is the journalist's selection, not the data's.
const ARC = [
  {
    region: "NOR",
    role: "establish" as const,
    text: "La Norvège tire la quasi-totalité de son électricité de ses barrages.",
  },
  {
    region: "SWE",
    role: "build" as const,
    text: "La Suède suit de près, hydraulique et éolien mêlés.",
  },
  {
    region: "POL",
    role: "build" as const,
    text: "La Pologne, elle, n'a presque pas quitté le charbon.",
  },
  {
    region: "DEU",
    role: "build" as const,
    text: "L'Allemagne a basculé plus vite que ses voisins ne l'avaient prévu.",
  },
  {
    region: "FRA",
    role: "turn" as const,
    text: "La France fait exception : son électricité est décarbonée sans être renouvelable.",
  },
  {
    region: "ITA",
    role: "payoff" as const,
    text: "Et au sud, l'Italie avance, sans jamais rattraper le nord.",
  },
];

function arcConfig() {
  return {
    title: "Le renouvelable, du nord au sud de l'Europe",
    description: "Part du renouvelable dans l'électricité, par pays, 2024",
    valueUnit: "%",
    basemap: "world",
    regionKey: "code",
    valueField: "share",
    lang: "fr",
    source: {
      name: "Ember Global Electricity Review 2025",
      url: "https://ourworldindata.org/grapher/share-electricity-renewables",
    },
    rows: ROWS,
    arcBeats: ARC,
  };
}

// Opens the built page and returns the text of its narrative steps, in order.
async function readRenderedSteps(pagePath: string): Promise<string[]> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    const tab = await browser.newPage({
      viewport: { width: 1200, height: 900 },
    });
    // domcontentloaded, not networkidle: the page fetches basemap tiles for as long as it is
    // open, and the captions this proof reads are computed without them.
    await tab.goto(`file://${pagePath}`, { waitUntil: "domcontentloaded" });
    await tab.waitForSelector("[data-step-index]", { timeout: 60_000 });
    return await tab.$$eval("[data-step-index]", (nodes) =>
      nodes.map((n) => (n.textContent ?? "").replace(/\s+/g, " ").trim()),
    );
  } finally {
    await browser.close();
  }
}

proof(
  "a real map scrolly walks the confirmed regions, in the confirmed order, in the journalist's words",
  async () => {
    const runDir = mkdtempSync(join(tmpdir(), "map-arc-render-proof-"));
    const configPath = join(runDir, "config.json");
    writeFileSync(configPath, JSON.stringify(arcConfig(), null, 2));

    // The config is VALIDATED before it is rendered — the sweep's premise, and half the
    // defect: it passed here and was then ignored downstream.
    expect(mapNativeConfigErrors(arcConfig())).toEqual([]);

    const outDir = join(runDir, "out");
    execFileSync("bun", ["scripts/produce.mjs", configPath, outDir], {
      cwd: SCROLLY_DIR,
      stdio: "inherit",
    });

    const steps = await readRenderedSteps(join(outDir, "scrolly.html"));
    // Print what was actually read. A proof that only says "pass" leaves the next person to
    // rebuild the page to find out what it saw — and the walk is the evidence.
    console.log(
      "[map-arc proof] rendered walk:\n  " + steps.join("\n  ") + "\n",
    );

    // 1. EVERY confirmed region's claim reached the page, verbatim.
    const positions = ARC.map((b) =>
      steps.findIndex((s) => s.includes(b.text)),
    );
    expect(
      positions.every((p) => p >= 0),
      `missing claims: ${ARC.filter((_, i) => positions[i]! < 0)
        .map((b) => b.region)
        .join(", ")} — rendered walk was: ${steps.join(" | ")}`,
    ).toBe(true);

    // 2. …in the CONFIRMED order (strictly increasing step positions).
    expect(positions).toEqual([...positions].sort((a, b) => a - b));

    // 3. …and the salience walk did not survive underneath it. "le plus bas" / "le plus élevé"
    //    are the descriptors the derived walk paints; under a confirmed arc the engine has
    //    computed no ranking and may assert none.
    const walk = steps.join(" • ");
    expect(walk).not.toMatch(/le plus bas|le plus élevé/);

    // 4. …and no region the journalist left OUT of the argument narrates itself.
    for (const code of ["GBR", "ESP"])
      expect(walk).not.toContain(
        ROWS.find((r) => r.code === code)!.share + " %",
      );

    rmSync(runDir, { recursive: true, force: true });
  },
  900_000,
);

// ALWAYS ON — the half that needs neither browser nor build, and the half that keeps the proof
// above honest. A confirmed arc that happened to match the salience walk would pass every
// assertion up there while proving nothing at all, so the fixture's own falsifiability is
// asserted here, on every commit.
test("the fixture can actually fail: the confirmed walk is not the walk the data would pick", () => {
  const config = arcConfig();

  // (a) It is a VALID config — the sweep's premise. A fixture that never passed validation
  //     would be testing a different bug.
  expect(mapNativeConfigErrors(config)).toEqual([]);

  // (b) Every confirmed region exists in the data (so the arc is honourable, not a typo).
  const codes = ROWS.map((r) => r.code);
  for (const b of ARC) expect(codes).toContain(b.region);

  // (c) The confirmed ORDER differs from the salience order (value, descending) — otherwise a
  //     dropped plan would be invisible on the page.
  const salience = [...ROWS]
    .sort((a, b) => b.share - a.share)
    .map((r) => r.code);
  const confirmed = ARC.map((b) => b.region);
  expect(confirmed).not.toEqual(salience.filter((c) => confirmed.includes(c)));

  // (d) The LAST confirmed region is not the minimum, and the FIRST reveal after it is not the
  //     maximum — the two facts a position-reading composer would assert wrongly. This is the
  //     Lazio-called-"le plus bas" finding, encoded.
  const valueOf = (code: string) => ROWS.find((r) => r.code === code)!.share;
  const minInArc = Math.min(...confirmed.map(valueOf));
  expect(valueOf(confirmed[confirmed.length - 1]!)).not.toBe(minInArc);

  // (e) The arc leaves regions WITH DATA out of the argument, so "shows every region it has"
  //     cannot be mistaken for "walks the confirmed plan".
  expect(confirmed.length).toBeLessThan(ROWS.length);
});
