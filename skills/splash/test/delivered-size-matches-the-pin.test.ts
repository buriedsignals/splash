/**
 * THE ONE ASSERTION THE WHOLE SIZE DECISION RESTS ON, MADE OVER THE TREE'S OWN ARTIFACTS.
 *
 * Gate 2c takes a size. The W4 audit measured what reached the producer: **0 of 17 chart statics,
 * 0 of 19 chart videos and 0 of 18 chart webs drew at a size from the table**, and no delivered
 * static was at a canonical size at all — the committed PNGs read 1800x1120 and 1800x1640, a
 * 900x560 element rasterised at `fitTo: width * 2`. Nothing threw, because `renderStill` compared
 * the element's drawn frame against the `width`/`height` it was HANDED and both came from the same
 * two literals in the beat's own render script.
 *
 * So this guard never reads code. It walks `proof/` for beats whose `BRIEF.md` PINS a size, finds
 * the artifacts those beats deliver, and reads each file's own IHDR. A beat that pins `landscape`
 * and ships 3840x2160 fails here whatever its source says.
 *
 * ── THE RATCHET, AND WHY IT IS A NUMBER RATHER THAN A LIST ────────────────────────────────────
 *
 * Most of the corpus has not moved yet. A list of exemptions rots — somebody adds a name to it and
 * the guard stops describing the tree. A COUNT cannot be added to without being noticed, and it may
 * only go down, so the guard says exactly how much of the migration is left and refuses to let it
 * grow. When it reaches zero, `renderStill`'s `scale` default of 2 retires with it and the two
 * rasterisers in `chart-beat` become one.
 *
 * ── WHY ONE COUNT BECAME TWO, 2026-08-10 ──────────────────────────────────────────────────────
 *
 * The count was 43, then 40, and most of what it counted was never going to move. **A web beat
 * takes no export size at all** — ruling R2's whole point is that a web chart fills the container
 * the newsroom gives it, so a pinned 1920x1080 would be a lie about a fluid frame — and **a scrolly
 * exports no frame**: its artifact is a page that is scrolled, and there is nothing whose IHDR
 * could be read. 29 of the 40 were one of those two. A number mixing "not done" with "not
 * applicable" cannot say when the work is finished, and this one would have bottomed out in the
 * high twenties and stayed there for ever, reading like a backlog.
 *
 * So the beats are SPLIT, and the split is derived from each beat's OWN GENRE rather than from a
 * list of names — a list stops covering whatever is added after it is written, which is the same
 * argument that made this a count in the first place. Every `BRIEF.md` in this corpus states its
 * medium and genre in its own first paragraph; `genreOf` reads that line, and a brief it cannot
 * read is a FAILURE naming the beat, never a silent "not applicable". Two beats had no such line
 * and one wrote it in prose no parser could take; all three were fixed in the brief, not exempted
 * here.
 *
 * `BEATS_OWING_A_PIN` is now the number that means something: beats whose delivered artifact IS a
 * frame — a PNG or an mp4 with fixed dimensions — and which have not pinned one. It reaches zero
 * when the migration is done. The other count is reported for the record and asserted from the
 * OTHER side: a genre that exports no frame must not pin one either, so the ratchet cannot be
 * gamed by pinning a size onto a web beat.
 *
 * ── THE MUTATIONS ─────────────────────────────────────────────────────────────────────────────
 * In an rsync of the tree under `/tmp/w4c3mut/`, never in this working tree. Baseline 4 pass/0 fail.
 *
 *   a migrated beat's PNG replaced by one 2x its pinned size   RED 3/1, naming the file and both
 *                                                                  sizes — the exact defect the
 *                                                                  corpus shipped
 *   `UNPINNED_BEATS` raised by one (the ratchet slipping)      RED 3/1
 *   every `size:` line deleted from every BRIEF                RED 2/2 — the premise AND the
 *                                                                  ratchet, so it cannot go
 *                                                                  vacuously green
 *   a pinned beat's BRIEF names a size the table does not have RED 2/2
 *
 * And for the split, in an rsync under `/tmp/mut-split/`:
 *
 *   `BEATS_OWING_A_PIN` lowered by one                         RED, listing the beats that owe
 *   the genre line deleted from one BRIEF                      RED naming that beat as
 *                                                                  unclassifiable — NOT a quiet
 *                                                                  promotion to "not applicable"
 *   a web beat given `size: landscape`                         RED from the other side
 *   `scrolly` added to the frame-exporting set                 RED twice — the seven scrollys are
 *                                                                  suddenly owed a pin they can
 *                                                                  never deliver, AND the genre is
 *                                                                  now on both sides at once. The
 *                                                                  second assertion was written
 *                                                                  because this mutation reddened
 *                                                                  only the ratchet on its first
 *                                                                  run, leaving the classification
 *                                                                  claiming to be complete.
 */
import { describe, it, expect } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import {
  SIZES,
  parseBriefFrontMatter,
  readPngSize,
} from "../../chart-beat/scripts/sizes.mjs";
import { GENRE_CATALOG } from "../../storyboard/scripts/genre-catalog.mjs";

const TWIN = join(import.meta.dirname, "..", "..", "..");
const PROOF = join(TWIN, "proof");

/**
 * How many beats that SHOULD pin an export size still have not. MAY ONLY GO DOWN, AND IT REACHES
 * ZERO — which the count it replaces never could.
 *
 * Measured 2026-08-10 off the tree: 76 beats hold a `BRIEF.md`; 43 are pinned and 33 are not, and
 * of those 33 only **4 owe a pin** — 29 are the genres that take none (a web chart fills its
 * container, a scrolly exports no frame).
 *
 * The four are `vidz-diverging-bar-eu-per-capita` and THREE MAP VIDEOS, and the three are one
 * finding rather than three arrears. `mapvid-hexgrid-quakes`, `mapvid-locator-geneva` and
 * `mapvid-dot-population` were each measured against every row of the video table and each refuses
 * all three: at the 30 px landscape floor their WORDS alone fill the band — 879 px of 910 for the
 * hex grid, 1191 px for the locator — and the removal ladder's last rung before R9 costs the
 * caveat, which on a map is the honesty line. Two of their siblings that ship both genres
 * (`map-quake-symbol`, `mapgen-choropleth-video`) pin and deliver their STATIC and refuse their
 * video for the same arithmetic.
 *
 * ── THE WORDS WERE SHORTENED, 2026-08-11, AND THE NUMBER DID NOT MOVE ─────────────────────────
 *
 * This paragraph used to end: "it comes down when those beats' words are shortened, which is an
 * editorial decision and not a migration." **That was a prediction and it is now measured false.**
 * The removal ladder gained R6, a rung that shortens a title and refuses a shortening that drops
 * what it asserts, and each of the four beats has its own `probe/size-budget.mjs` reproducing its
 * component's layout at every candidate frame. What they read:
 *
 *   locator      R6 FIRES — 3 title lines to 2 at landscape. The line is worth 90 px against a
 *                106 px gap, and spending the conclusion as well leaves 53 px of plate: a 53 x 53
 *                map in a 1920 px frame.
 *   dot map      R6 FIRES on one word, and a ONE-LINE title leaves 88 px of plate — 1.1% of the
 *                area this beat's 2,996 dots are drawn in.
 *   hex grid     R6 DECLINES at every frame: the shortest form that still makes the claim is 80
 *                characters against 85 and wraps the same. 58 px of plate at landscape.
 *   diverging    R6 DECLINES, and a title of NO HEIGHT would not close it either — 440 px of plot
 *                where one column of 27 rows needs 1,242. A fourth 4:5 row in the table, priced at
 *                the same 36 px floor every row carries, delivers a 10.3 px row pitch against a
 *                54 px lane. The beat is not waiting on a row.
 *
 * And on all four the refusal was re-measured with the caveat GONE, so it does not rest on the
 * honesty line: square and portrait still have no room for any of the three maps.
 *
 * So the number stays at four for a reason that is now closed rather than open. What would move the
 * three map videos is a landscape layout putting the plate BESIDE its words instead of between
 * them — this genre lays seven blocks in one column while a 1920 x 1080 frame offers 1750 px of
 * width against 910 px of band. That is a redraw of the genre, a person's decision, and not a rung.
 *
 * It is re-measured off the tree rather than decremented by hand each time, because several lots
 * migrate in parallel: a number typed from a stale read could go UP, which is the one thing a
 * ratchet exists to forbid.
 */
const BEATS_OWING_A_PIN = 4;

/**
 * Which genres deliver a FRAME — an artifact with fixed pixel dimensions that a pinned size can be
 * checked against, by reading the file's own bytes.
 *
 * Stated as a fact about the two genres rather than as a list of beats, and asserted below to cover
 * every genre `GENRE_CATALOG` knows, so a genre added to the catalog cannot default into "takes no
 * size" without somebody deciding it here.
 *
 *   static — a PNG. `readPngSize` reads its IHDR.
 *   video  — an mp4. Its dimensions come from `ffprobe`, and `assertDeliveredSize` takes them.
 *   web    — NO. Ruling R2: a web chart fills the container the newsroom gives it, so a pinned
 *            1920x1080 would be a claim about a frame that does not exist. `web-frame-is-fluid`
 *            is the guard for that genre, and it asserts the opposite property.
 *   scrolly— NO. The artifact is a page that is scrolled. There is no frame to measure.
 */
const GENRES_EXPORTING_A_FRAME = new Set(["static", "video"]);

/** The other side of the same decision, written out rather than inferred as "everything else", so a
 *  new genre in the catalog belongs to neither set until somebody says which. */
const TAKES_NO_SIZE = new Set(["web", "scrolly"]);

/** Every genre the storyboard's own catalog can reach, medium stripped off the pair key. */
const KNOWN_GENRES = new Set(
  Object.keys(GENRE_CATALOG).map((pair) => pair.slice(pair.indexOf("/") + 1)),
);

/**
 * THE BEAT'S GENRE, READ OUT OF THE BEAT'S OWN BRIEF.
 *
 * Every `BRIEF.md` in this corpus opens by naming its medium and its genre — `**Medium/genre:**
 * chart / static`, `**Medium / genre:** chart / **web**`, and in one French brief `**Médium /
 * genre :** chart / static`. The spelling wanders, the fact does not, so this reads the paragraph
 * rather than a fixed column: it takes everything up to the next blank line (a brief that wraps
 * mid-phrase is common and cost the first version of this reader two wrong answers), strips the
 * bold markers, and takes the first word after the slash.
 *
 * Returns `null` when it cannot find one, and every caller treats `null` as a FAILURE naming the
 * beat. That is the whole reason this is a derivation and not an exemption list: an unreadable
 * brief must never be promoted to "this beat takes no size".
 */
export function genreOf(brief: string): string | null {
  const marker =
    /\*\*\s*M[ée]d[iy]?um\s*\/?\s*genre\s*:?\s*\*\*\s*:?\s*([\s\S]*?)(?:\n\s*\n|$)/i.exec(
      brief,
    );
  if (!marker) return null;
  const paragraph = marker[1].replace(/\*\*/g, " ").replace(/\s+/g, " ");
  const afterSlash = paragraph.split("/")[1];
  if (!afterSlash) return null;
  const word = /[A-Za-z]+/.exec(afterSlash)?.[0]?.toLowerCase() ?? null;
  return word && KNOWN_GENRES.has(word) ? word : null;
}

function beatDirs(): string[] {
  if (!existsSync(PROOF)) return [];
  return readdirSync(PROOF, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => join(PROOF, e.name))
    .filter((d) => existsSync(join(d, "BRIEF.md")));
}

/** Every `.png` under a beat, at any depth — a beat's outputs live in its own folder. */
function pngsUnder(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) pngsUnder(p, out);
    else if (e.name.endsWith(".png")) out.push(p);
  }
  return out;
}

const beats = beatDirs().map((dir) => {
  const brief = readFileSync(join(dir, "BRIEF.md"), "utf8");
  return {
    dir,
    label: relative(TWIN, dir),
    pinned: parseBriefFrontMatter(brief)?.size ?? null,
    genre: genreOf(brief),
  };
});
const pinned = beats.filter((b) => b.pinned !== null);
const unclassified = beats.filter((b) => b.genre === null);
const owesAPin = beats.filter(
  (b) => b.pinned === null && GENRES_EXPORTING_A_FRAME.has(b.genre!),
);
const takesNoSize = beats.filter(
  (b) => b.genre !== null && !GENRES_EXPORTING_A_FRAME.has(b.genre),
);

describe("a beat that pins an export size delivers a file that measures it", () => {
  it("should find the beats and the pins, so nothing below can go vacuously green", () => {
    // 50 is the same floor `credit-anchors-to-the-frame-bottom.test.ts` uses for the same walk, and
    // for the same reason: a walk that silently stopped covering `proof/` would make every
    // assertion here trivially true.
    expect(beats.length).toBeGreaterThanOrEqual(50);
    expect(pinned.length).toBeGreaterThan(0);
  });

  it("should pin only sizes the toolchain exports", () => {
    for (const beat of pinned)
      expect([
        beat.label,
        beat.pinned,
        Object.keys(SIZES).includes(beat.pinned!),
      ]).toEqual([beat.label, beat.pinned, true]);
  });

  it("should deliver, from its own bytes, exactly the size it pins", () => {
    // Read off the FILE. Not off the render script's arguments, not off the component's constant —
    // those two agreed with each other for the whole of the corpus's life while the delivered PNG
    // was twice the size of both.
    //
    // `sizes/` is a beat's LOOKING directory: the other two sizes rendered side by side so a person
    // can compare them. Those are named after the size they carry and are excluded here by that
    // name, not by a path exemption, so a deliverable can never hide in one.
    //
    // A BAKED PLATE IS AN INPUT, NOT A DELIVERABLE, and the map genre is the first to bring one.
    // `proof/<beat>/plate*/plate.png` is a frozen basemap capture committed beside the beat's own
    // `data.csv` for exactly the reason the CSV is: a render reading its basemap from `/tmp` cannot
    // be reproduced or audited, and MapTiler restyles. It is drawn INTO the delivered frame at
    // whatever size the geography and the frame agree on, so its own dimensions are the bake's
    // business and have nothing to do with the pin. The test is structural rather than a name or a
    // path: a PNG that sits beside a `geometry.json` is a plate, because a plate is precisely the
    // pair of files a bake writes. A delivered artifact cannot hide there without somebody also
    // writing a camera record next to it.
    const isBakedPlate = (png: string) =>
      existsSync(join(png.slice(0, png.lastIndexOf("/")), "geometry.json"));
    const wrong: string[] = [];
    for (const beat of pinned) {
      const row = SIZES[beat.pinned as keyof typeof SIZES];
      for (const png of pngsUnder(beat.dir)) {
        const name = png.slice(png.lastIndexOf("/") + 1);
        if (Object.keys(SIZES).some((s) => name.includes(s))) continue;
        if (png.includes("/probe/")) continue;
        if (isBakedPlate(png)) continue;
        const got = readPngSize(readFileSync(png));
        if (got.width !== row.width || got.height !== row.height)
          wrong.push(
            `${relative(TWIN, png)} measures ${got.width}x${got.height}, pinned ${beat.pinned} = ${row.width}x${row.height}`,
          );
      }
    }
    expect(wrong).toEqual([]);
  });

  it("should read a genre out of every brief, so nothing is quietly excused", () => {
    // The load-bearing half of the split. A beat whose genre cannot be read is NOT "not
    // applicable" — it is unclassifiable, and it fails here by name until its own brief says what
    // it is. Without this the ratchet below could be walked to zero by deleting a line.
    expect(unclassified.map((b) => b.label)).toEqual([]);
  });

  it("should classify every genre the catalog can reach as exporting a frame or not", () => {
    // So a genre added to `GENRE_CATALOG` cannot default into "takes no size" unnoticed: it turns
    // this red until somebody decides which side it is on.
    const undecided = [...KNOWN_GENRES].filter(
      (g) => !GENRES_EXPORTING_A_FRAME.has(g) && !TAKES_NO_SIZE.has(g),
    );
    expect(undecided).toEqual([]);
    // And it cannot be on BOTH sides. Without this the two sets can be widened until every genre
    // is in each of them and every assertion above goes quietly green — which is exactly what the
    // "scrolly exports a frame" mutation did before this line: it turned the ratchet red, where it
    // belongs, but left the classification itself claiming to be complete.
    const both = [...KNOWN_GENRES].filter(
      (g) => GENRES_EXPORTING_A_FRAME.has(g) && TAKES_NO_SIZE.has(g),
    );
    expect(both).toEqual([]);
  });

  it("should have no more beats OWING a pin than the ratchet allows", () => {
    // The migration that is actually left, as a number that may only go down — and one that
    // REACHES ZERO, unlike the count of everything unpinned, which mixed the work with the 29
    // beats that will never take a size. Lower it in the same commit that migrates a beat; there
    // is no way to raise it without this line appearing in the diff.
    expect([
      owesAPin.length <= BEATS_OWING_A_PIN,
      owesAPin.length,
      owesAPin.map((b) => `${b.label} (${b.genre})`),
    ]).toEqual([
      true,
      owesAPin.length,
      owesAPin.map((b) => `${b.label} (${b.genre})`),
    ]);
  });

  it("should let no frameless genre pin a size it cannot deliver", () => {
    // The split asserted from the OTHER side, which is what stops the ratchet being gamed: pinning
    // `size: landscape` onto a web beat would drop it out of the count above while delivering
    // nothing measurable. A web chart fills its container (R2) and a scrolly exports no frame.
    const wrong = takesNoSize
      .filter((b) => b.pinned !== null)
      .map((b) => `${b.label} (${b.genre}) pins ${b.pinned}`);
    expect(wrong).toEqual([]);
  });

  it("should report the split, so the two numbers are on the record", () => {
    const unpinned = beats.filter((b) => b.pinned === null);
    console.log(
      `size pins: ${beats.length} beats — ${pinned.length} pinned, ${unpinned.length} not. ` +
        `Of those ${unpinned.length}: ${owesAPin.length} owe a pin ` +
        `(${owesAPin.map((b) => b.label.replace("proof/", "")).join(", ") || "none"}), ` +
        `${unpinned.length - owesAPin.length} take no export size at all ` +
        `(web fills its container, a scrolly exports no frame).`,
    );
    expect(owesAPin.length + (unpinned.length - owesAPin.length)).toBe(
      unpinned.length,
    );
  });
});

/**
 * THE OTHER HALF OF A PINNED SIZE: THE PLOT'S OWN SHAPE.
 *
 * `assertDeliveredSize` above holds the FRAME. It says nothing about what the frame did to the
 * drawing inside it, and that is by design — a chart can measure exactly 1080x1080, clear every
 * type floor, clip nothing and collide with nothing, and still have had its argument destroyed,
 * which is `proof/portrait-aspect-probe/`'s founding finding. `assertPlotAspect` is the guard for
 * that, and until 2026-08-11 **no video beat that pins a tall size called it**: the reason is
 * recorded in `proof/life-expectancy/BRIEF.md`, which measured its own delivered square plot at
 * 2.4:1 against a table that then recorded 0.8–1.8 for a line, so wiring the guard would have
 * refused a delivered artifact. The range was re-measured first (`proof/aspect-range-probe/`).
 *
 * WHY THIS IS A WALK OVER BRIEFS AND NOT A LIST OF TWO BEATS. The population it defends is "beats
 * whose pinned size is one `formForSize` does not exempt", and today that is exactly two — every
 * other beat pins landscape, where the verdict is `as-is` and the guard is a documented no-op. A
 * list of two names would stop describing the tree the moment a third beat pins square. The walk
 * reads each brief's own `size:` and `type:` and asks the table, so a new tall pin arrives already
 * guarded.
 *
 * THE MUTATIONS, in an rsync under `/tmp/.../mut4/`:
 *
 *   the `assertPlotAspect` call deleted from LifeExpectancyVideo.tsx    RED, naming the beat
 *   the line's ceiling put back to 1.8 (the table, not the beat)        the RENDER refuses:
 *        `life-expectancy: the plot is too FLAT at square — 808 x 402 is 2.01:1`. This is the
 *        reading that proves the wiring is live rather than merely present.
 *   the ceiling dropped to 1.0                                          `migration` refuses too:
 *        `788 x 507 is 1.55:1` — its square plot sits inside both the old range and the new one,
 *        which is why the first mutation does not reach it.
 */
import { formForSize } from "../../chart-beat/scripts/type-at-size.mjs";

const EXEMPT_VERDICTS = new Set(["as-is", "transpose"]);

const tallPins = beats
  .filter((b) => b.pinned !== null)
  .map((b) => {
    const front = parseBriefFrontMatter(
      readFileSync(join(b.dir, "BRIEF.md"), "utf8"),
    );
    return { ...b, type: front?.type ?? null };
  })
  .filter((b) => b.type !== null)
  .filter((b) => !EXEMPT_VERDICTS.has(formForSize(b.type!, b.pinned!).verdict));

describe("a beat pinned to a size its type does not walk through unclamped", () => {
  it("should find the beats whose pinned size actually reaches the clamp", () => {
    // Without this the assertion below goes vacuously green the day every brief loses its `type:`.
    expect(tallPins.length).toBeGreaterThan(0);
  });

  for (const beat of tallPins) {
    it(`should call assertPlotAspect somewhere in ${beat.label}`, () => {
      const sources = readdirSync(beat.dir).filter(
        (f) => f.endsWith(".tsx") || f.endsWith(".mjs"),
      );
      const calls = sources.filter((f) =>
        /assertPlotAspect\s*\(/.test(readFileSync(join(beat.dir, f), "utf8")),
      );
      expect([beat.label, beat.type, beat.pinned, calls.length > 0]).toEqual([
        beat.label,
        beat.type,
        beat.pinned,
        true,
      ]);
    });
  }
});
