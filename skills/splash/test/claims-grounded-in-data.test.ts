/**
 * WHAT THIS GUARD CATCHES, AND WHAT IT PROVABLY DOES NOT.
 *
 * TWO DEFECT CLASSES, AND THIS FILE HOLDS A CHECK FOR EACH. Do not read either as covering the
 * other; they fail in opposite directions and one guard cannot see both.
 *
 *   CLASS 1 — A FALSE SENTENCE OVER TRUE NUMBERS. The data is real, frozen and correctly drawn;
 *   the sentence beside it asserts something the data does not support ("passed 8 billion in 2023"
 *   where the series crosses in 2022; "mid-60s" beside a label reading 69.4%). The claim and the
 *   data are both present and they disagree. **GUARD A** below (grounding) is for this class.
 *
 *   CLASS 2 — A TRUE SENTENCE OVER INVENTED NUMBERS. Three artifacts in `proof/comparison/` and
 *   `proof/trial/` render a Swiss net-migration series that exists NOWHERE in this repository —
 *   negatives at 1997/1998 at −1.9k and −3.4k, against a real frozen series whose negatives are
 *   1996/1997 at −5.807k and −6.834k with 1998 POSITIVE at +1.177k — and credit it to the Federal
 *   Statistical Office. A life-expectancy sibling draws an endpoint at 2024, a year its series does
 *   not contain. **Every internal consistency check passes on all of them**: the title agrees
 *   perfectly with the numbers beside it, because the render drew exactly what it claimed. What is
 *   wrong is that the numbers came from nowhere — the render read a CSV outside its own folder that
 *   no longer exists. GUARD A is structurally blind to this and always will be: it can only compare
 *   a claim against data that is present, and here nothing is present to compare against.
 *   **GUARD B** below (provenance) is for this class, and it asks a different, sharper question:
 *   does a committed artifact sit beside the script and the data that made it, and does that script
 *   read only files that are committed with it?
 *
 * ============================ GUARD A — GROUNDING (class 1) ============================
 *
 * The failure this defends against, in the project's own words: **a literal sitting where a
 * computation belongs.** A year typed instead of derived ("passed 8 billion in 2023" when the
 * frozen series crosses in 2022). A count asserted that the beat's own footnote contradicts. A
 * range wrong by five years. "Well under half" where the real figure is ~65%. Two sweeps measured
 * it: 12 of 55 beats carried a false claim, then 17 more defects across 109 rendered artifacts —
 * and every single one had the same cause, a value typed by hand instead of computed from the
 * data. Not one was caught by a test. The suite was green throughout, and every correction round
 * fixed instances and never the class. This file is the mechanical backstop for the one half of
 * that class a scan can actually reach: a NUMBER in a reader-facing string that the beat's own
 * frozen data cannot reproduce.
 *
 * THE CONTRACT, stated so it cannot be over-read. A flag from this guard does NOT mean "this
 * number is wrong". It means: **this number was typed, and nothing in the beat can tell you when
 * it stops being true.** `static-germany-electricity-bridge`'s alt text — "639 TWh in 2015 …
 * arriving at 496 TWh in 2024" — is flagged, and every one of those figures is correct today
 * (the audit re-derived them: 639.17 / 495.99, residual 1.1e-13). They are flagged because they
 * are sums the script computes and then does not use: move a row in `data.csv` and the chart
 * changes while the sentence beside it silently does not. That is the exact shape of every defect
 * on the list above, caught one state earlier — before the number goes wrong rather than after.
 * Anyone reading a failure from this guard as "the audit found this false" is reading it wrong.
 *
 * WHY GROUNDING AND NOT THE SIMPLER STRUCTURAL RULE, measured on this corpus rather than reasoned.
 * The obvious alternative is structural: a reader-facing string must contain no numeric literal at
 * all; numbers arrive only by interpolation. It was built first and measured over the same 62 beat
 * scripts. Measured 2026-08-09: across 118 reader-facing strings those scripts type **205 literal
 * numbers**; the structural rule flags every one of them — every year in a range, every
 * "100%-stacked", every correct interpolation's neighbours — against this guard's **34**, and it
 * cannot tell the 34 from the other 171, so it hands back a wall with no ranking inside it. A wall
 * gets disabled; this project has already discarded one mechanical estimator (a text-overflow width
 * model that flagged ~30 phantom clipped labels) for exactly that. Grounding earns the 6× reduction
 * by reading each beat's own frozen data and passing the 168 numbers that data can reproduce. These
 * counts move with the tree — one dropped while this guard was being written, when another agent
 * replaced `mapgen-choropleth-video`'s typed "41 countries" with a computed `altFor(geometry)` —
 * so the ratio, not the count, is what this file's own `describe` block asserts.
 *
 * WHAT IS SCANNED, AND WHAT IS NOT.
 *   - Files: `proof/<beat>/render.mjs`, `render-web.mjs`, `render-map.mjs`. Nothing else. In
 *     particular `proof/<beat>/render-still.mjs` is EXCLUDED and is not a beat script at all —
 *     all 11 copies in this corpus are byte-identical vendored copies of a skill's shared
 *     rasteriser (`skills/map-web/scripts/render-still.mjs` and one variant), checked by
 *     hash before this exclusion was written. Scanning them would read the renderer's own prose,
 *     not any beat's claim.
 *   - Props: `title`, `subtitle`, `alt`, `caveat`, `limits`, `caption` — the strings a reader or a
 *     screen reader actually receives.
 *   - Props are read both as `prop:` in an object and as a `const`/`let` whose own NAME is a
 *     reader-facing prop, because **19 of the 62 beat scripts** build the string first and pass it
 *     by shorthand (`title,`). The first draft read only `prop:` and was blind to all nineteen —
 *     including `webx-world-population`, the beat whose "passed 8 billion in ${…}" title is the
 *     model everything else should imitate.
 *   - `source` is DELIBERATELY NOT CHECKED, and this is the guard's largest self-imposed blind
 *     spot. Measured: `source` credits hold **172 literal numbers**, of which **74 would flag** —
 *     more than tripling this guard's output — and they are overwhelmingly provenance: a
 *     publication year "(2025)", an extraction date "extracted 9 August 2026", a map scale "1:10m",
 *     none of which the beat's data could ever reproduce. The cost is real and is named again
 *     below: a coverage year stated in a credit line ("2005–2024" over a file that stops in 2017)
 *     is invisible here unless the beat also says it in its alt text — which, in the one measured
 *     instance, it did.
 *
 * WHAT COUNTS AS A NUMBER, and the false positive that forced each rule. Every exclusion below was
 * added because it fired on real prose in this corpus, and each names its instance:
 *   - A digit run preceded by a word character, `.`, `,`, `:` or an apostrophe is not a number
 *     ("CO2", "v1.2").
 *   - An ordinal suffix disqualifies: "the 20th century" (`more-*`, `static-world-population`).
 *   - A following `:` disqualifies: "1:10m" (Natural Earth scale), "9:16".
 *   - A LETTER followed by a hyphen followed by digits disqualifies: "COVID-19"
 *     (`more-line-swiss-life-expectancy`), "mid-60s" (`static-renewables-shift`). The cost is
 *     stated plainly: "mid-60s" is one of the twelve documented false claims — the labels beside
 *     it read 69.4% — and this guard does not see it. It flags that same alt string seven other
 *     times, so the beat still goes red, but by a different sentence. A guard that catches the
 *     right beat for the wrong clause is not the same as one that catches the clause.
 *   - A DIGIT followed by a hyphen followed by digits reads as ONE range and only the HEAD is
 *     checked: "1979-80" (`weby-small-multiples`, an abbreviated year), "0-4 year-olds"
 *     (`static-swiss-age-pyramid`, an age band). Both are band labels, not data claims; checking
 *     the tail flagged both and neither was a defect. An en dash is NOT a hyphen for this rule, so
 *     "2005–2024" is read as two numbers and both ends are checked.
 *   - Thousands separators (`,` `'` `U+00A0` `U+202F`) bind only when followed by exactly three
 *     digits, so "$58,500, 78.0 years" reads as two numbers and not one; the first draft merged
 *     them into a single unparseable token.
 *   - Comments are stripped before extraction, by a scanner that respects string literals — a
 *     naive strip cut every `source:` line in half at the `//` of a URL.
 *
 * THE FOUR WAYS A NUMBER PASSES.
 *   1. INTERPOLATED. `${...}` in a template literal, or any non-string operand of a `+` chain, is
 *      not a literal at all — it is replaced by a marker before the number scan runs. This is the
 *      fix path the guard exists to push toward, and several beats already take it:
 *      `static-swiss-age-pyramid`'s alt interpolates its band totals and only its bare year "2023"
 *      is flagged.
 *   2. GROUNDED. The value equals some number in the beat's own frozen `.csv`/`.json`, rounded to
 *      0–4 decimal places, or that number after a ×10^±3/±6/±9 unit change rounded to 0–2 places
 *      (tonnes to megatonnes, people to millions). `.geojson` is excluded from the ground set on
 *      purpose: a country outline is tens of thousands of coordinates and would ground almost any
 *      number by accident.
 *   3. ASSERTED. The value appears as a numeric literal inside an `if (…)` condition whose body
 *      throws, in the same script — the "or asserted against it" half of the rule this guard
 *      implements. `video-cumulative-co2-area` is the model: it throws if the computed crossing
 *      year is not the one its title names. Measured on this corpus it rescues exactly **three**
 *      tokens, all of them counts that no cell in a CSV could ever hold and that the script
 *      nonetheless pins: `static-carbon-footprint-spread`'s "213 countries"
 *      (`if (rows.length !== 213) throw`) and `static-income-life-expectancy`'s "165 countries",
 *      twice (`if (points.length !== 165) throw`). Those three are the shape every flagged number
 *      below should be turned into.
 *   4. WAIVED. A `// grounded-by-hand: <value> — <reason>` comment anywhere in the same script,
 *      naming the exact value and giving a non-empty reason. For the genuine non-datum: the
 *      Richter scale's "roughly 32× the energy release" is a constant of the scale, not a reading
 *      from `quakes-symbol.csv`, and no amount of deriving will ever produce it.
 *
 *      **Four waivers exist as of 2026-08-09**, each re-verified as a non-datum before being
 *      granted: that Richter constant in `map-quake-symbol`, and three `100`s describing a
 *      100%-stacked chart's own normalisation (`static-electricity-mix-source` ×2,
 *      `webx-electricity-mix`). This paragraph previously said no beat carried one — written while
 *      that was true and left standing after it stopped being. That is precisely the class this
 *      file exists to mechanize, arriving in the file's own prose; the count is stated here so the
 *      next reader can check it, and it is asserted below so it cannot rot again unnoticed.
 *
 *      A waiver is keyed by **value AND the prop it appears in**, not by value alone. Keyed by
 *      value, waiving `100` in a beat's `limits` string would silence every future `100` anywhere
 *      in that same script — including a real one in its `alt`. The narrower key costs a waiver
 *      author nothing and closes the widest part of this escape hatch.
 *
 * WHAT IT PROVABLY DOES NOT CATCH. Read this before trusting a green run.
 *   - EVERY NON-NUMERIC FALSE CLAIM. Of the 17 false claims in the 2026-08-09 audit, this guard
 *     can reach at most the numeric ones. It is blind by construction to: an alt naming the wrong
 *     region for a map's densest cell (F5 — every number in that beat is exact, the ADJECTIVE is
 *     wrong); a credit naming an institution that does not publish the figure (F1, F13); "nearly a
 *     year" for a 0.72-year drop (F9); a marker called "nearby" that is the farthest one (F6);
 *     "well under half" and "almost entirely". Roughly a third of the documented class has no
 *     number in it at all.
 *   - A WRONG NUMBER THAT GROUNDS BY COINCIDENCE, and this is quantified rather than waved at. For
 *     each beat, the share of the integers 1..999 that its own frozen data grounds by accident was
 *     measured: the median beat grounds **6.7%**, but `map-quake-density` and `mapgen-hexgrid-web`
 *     ground **99.7%** (57,234 distinct values in a 14,000-row quake file) and the three Danube
 *     beats ground **91.1%**. **Six of 62 beats ground over 90%, ten over 50%** — on those this
 *     check is close to worthless for small integers and must not be read as coverage. This file
 *     asserts that measurement so the number in this comment cannot rot.
 *   - A TYPED YEAR THAT IS ALSO A YEAR IN THE FILE. "passed 8 billion in 2023" — the flagship
 *     example — grounds on "2023", because 2023 is a row in the series. The claim is about where
 *     the series CROSSES, which no presence check can evaluate. That defect is reachable only by
 *     rule 3, and only if someone writes the assertion.
 *   - ANNOTATION LABELS, AXIS TICKS AND LEGEND TEXT INSIDE `.tsx` COMPONENTS. Only the props
 *     handed in from the render script are read. A number typed into `WaterfallVideo.tsx` is
 *     invisible here.
 *   - `BRIEF.md`, `STORYBOARD.md` and every other prose file. The audit found four `BRIEF.md` row
 *     counts each exactly one too low and a storyboard "verification" line carrying two wrong
 *     figures; none of that is reachable from a render script.
 *   - THE WAIVER ITSELF. Rule 4 is an escape hatch and can be used to silence a real defect. It is
 *     greppable (`grounded-by-hand`) and it forces a written reason into the diff, which is all
 *     the protection it has.
 *   - A BEAT WITH NO FROZEN DATA AT ALL is reported as a distinct failure rather than skipped,
 *     because "nothing to check against" is the condition under which every one of these defects
 *     became unauditable in the first place.
 *
 * =========================== GUARD B — PROVENANCE (class 2) ===========================
 *
 * It is CHEAPER than guard A — it reads source and directory listings, never data — and on this
 * corpus it reaches a defect guard A cannot express at all. Two checks:
 *
 *   B1. EVERY RENDERED ARTIFACT SITS BESIDE THE SCRIPT THAT MADE IT. For every `.png`, `.html` and
 *   `.mp4` anywhere under `proof/`, walk up to `proof/` looking for a directory that holds a beat
 *   script. Measured today: **120 artifacts, 21 with no script in any ancestor** — 18 in
 *   `proof/comparison/`, 3 in `proof/trial/`. Those 21 are exactly the class-2 population: images
 *   nothing committed can regenerate, eight of them carrying an invented series under a real
 *   institution's name. The exemption is deliberate and narrow: a `SUPERSEDED.md` in the artifact's
 *   own directory that NAMES the file, either literally or by a `prefix*` glob. That file already
 *   exists in both directories — another agent wrote it while this guard was being built — so B1 is
 *   GREEN today and turns red the moment an undocumented artifact is dropped into an evidence
 *   folder. A green B1 is not a claim that those 21 images are sound; it is a claim that their
 *   standing is written down where a reader will find it.
 *
 *   B2. A BEAT SCRIPT READS ONLY FILES COMMITTED WITH IT. Every quoted filename appearing inside a
 *   `readFile`/`readFileSync` call must resolve to a file that exists somewhere under the beat's own
 *   directory. Measured today: **11 of 65 beat scripts fail**, every one of them a map beat reading
 *   `plate.png` and `geometry.json` — a baked basemap that defaults to `/tmp/map-twin/…` and that
 *   `find proof -name plate.png` shows is committed **zero** times. Those eleven delivered map
 *   artifacts cannot be regenerated from this repository; reproducing one needs a MapTiler key, a
 *   network and a warm cache. That is the same unreproducibility that produced class 2, sitting in
 *   the map half of the tree right now.
 *
 * WHAT GUARD B PROVABLY DOES NOT CATCH.
 *   - `readFile(dataPath)` where `dataPath = flag("--data", join(HERE, "data.csv"))` — the shape
 *     EVERY beat uses. The default is inside the folder, so B2 passes it, and nothing in the source
 *     records which path the committed render actually used. A run with `--data /tmp/anything` still
 *     produces a committed PNG that B2 calls clean. **This is the exact hole class 2 came through**,
 *     and closing it needs the render to stamp its input's path and hash into the artifact — a
 *     change to the renderers, not a test. Named here rather than papered over.
 *   - Whether the committed data is the RIGHT data. A beat can freeze a plausible CSV it invented.
 *     B1/B2 only prove something committed is being read.
 *   - Numbers typed into a component instead of read from anywhere at all: a literal array pasted
 *     into a `.tsx` has no `readFile` call for B2 to see. Guard A reaches those only if they surface
 *     in a render script's own prop strings.
 *   - `bake.mjs`, `interaction.mjs` and every non-`render*` script.
 *
 * =============================== PROVED IT CAN GO RED ===============================
 *
 * A test that stays green when the code breaks is worth nothing, so each rule was mutation-checked
 * in a COPY of the tree under `/tmp` (five beat directories plus `comparison/`), never in the shared
 * tree — one agent's mutation here previously turned the suite red for five other people.
 *
 *   M1, rule 2 — the real defect, reintroduced. `proof/migration/` is corrected today and passes.
 *   Putting back the documented pre-fix claim — title "Twice since **1990** … 1997 and 1998, at
 *   **−1.9** and **−3.4** thousand", against a frozen series that starts in 1991 and whose negative
 *   years are 1996/1997 at −5.807/−6.834 — turned it RED with exactly three findings: `1990`, `1.9`,
 *   `3.4`. It did NOT flag `1997` or `1998`; both are real years in that file. The guard caught the
 *   right beat by the invented values and the impossible start year, not by the wrong years.
 *   M2, rule 4 — `map-quake-symbol` is red today on the Richter constant "32×". Adding
 *   `// grounded-by-hand: 32 - the Richter scale's energy ratio …` turned it GREEN.
 *   M3, rule 3 — deleting `if (points.length !== 165) throw` from
 *   `static-income-life-expectancy/render.mjs` turned its "165 countries" RED in both the `limits`
 *   and the `alt` string (one finding became three). The assertion path is load-bearing, not decor.
 *   M4, guard B1 — copying an extra PNG into `comparison/` and renaming one entry in its
 *   `SUPERSEDED.md` turned B1 RED naming both files, `comparison/4-NEW-EVIDENCE.png` and
 *   `comparison/3-MIGRATION--twin.png`.
 *   M5, THE DECLARED BLIND SPOT, proved to be real rather than merely claimed. Replacing
 *   `webx-world-population`'s derived title — `` `World population passed 8 billion in
 *   ${eightBillionRow.year}` `` — with the literal "passed 8 billion in 2023" (the flagship false
 *   claim: the series crosses in 2022) left the guard **GREEN**, because 2023 is a row in that CSV.
 *   The limitation four paragraphs up is not hypothetical; it was executed.
 */
import { describe, it, expect } from "bun:test";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const PROOF_ROOT = join(import.meta.dirname, "..", "..", "..", "proof");

/** Directories under proof/ that hold evidence ABOUT the experiment, not a beat's own production. */
const NOT_A_BEAT = new Set(["comparison", "seance", "trial"]);

/**
 * The beat scripts. `render-still.mjs` is excluded on purpose — all 11 copies under proof/ are
 * vendored copies of a skill's shared rasteriser, verified by hash.
 */
const BEAT_SCRIPTS = new Set([
  "render.mjs",
  "render-web.mjs",
  "render-map.mjs",
]);

/** The strings a reader receives. `source` is excluded — see the header. */
const CLAIM_PROPS = ["title", "subtitle", "alt", "caveat", "limits", "caption"];

/** Stands in for an interpolated hole, so the number scan cannot see across it. */
const HOLE = "•";

/**
 * Strip `//` and block comments while respecting string and template literals. A naive strip cuts
 * every `source:` credit in half at the `//` of a URL.
 */
function stripComments(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`") {
      const q = c;
      out += c;
      i++;
      while (i < src.length) {
        if (src[i] === "\\") {
          out += src[i] + (src[i + 1] ?? "");
          i += 2;
          continue;
        }
        out += src[i];
        if (src[i] === q) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) {
        if (src[i] === "\n") out += "\n";
        i++;
      }
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

type ClaimString = { prop: string; literal: string; line: number };

/**
 * Read the expression that follows `prop:` and split it into LITERAL text and interpolated holes.
 * Handles string concatenation across lines (prettier wraps long credits and alt texts) and
 * template literals with `${…}`.
 */
function readExpression(
  text: string,
  start: number,
): { literal: string; end: number } {
  let i = start;
  const parts: string[] = [];
  let depth = 0;
  let sawSomething = false;
  while (i < text.length) {
    const c = text[i];
    if (c === '"' || c === "'" || c === "`") {
      sawSomething = true;
      const q = c;
      i++;
      let chunk = "";
      while (i < text.length) {
        const d = text[i];
        if (d === "\\") {
          chunk += text[i + 1] === "n" ? " " : (text[i + 1] ?? "");
          i += 2;
          continue;
        }
        if (d === q) {
          i++;
          break;
        }
        if (q === "`" && d === "$" && text[i + 1] === "{") {
          let k = i + 2;
          let dep = 1;
          while (k < text.length && dep > 0) {
            if (text[k] === "{") dep++;
            else if (text[k] === "}") {
              dep--;
              if (!dep) break;
            }
            k++;
          }
          chunk += HOLE;
          i = k + 1;
          continue;
        }
        chunk += d;
        i++;
      }
      parts.push(chunk);
      continue;
    }
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === "+" && sawSomething) {
      i++;
      continue;
    }
    // `;` is a terminator too. It was missing, and the consequence was not a wider read but a
    // SKIPPED claim: after `const title = "…";` the reader ran on past the semicolon, and the
    // caller's `lastIndex = Math.max(…, end)` then jumped over the NEXT claim declaration
    // entirely. Measured — a beat declaring `subtitle` immediately after `title` had its subtitle
    // scanned by nothing, and a false figure planted in it left this guard green. Found by an
    // agent writing a new beat, not by this file's own tests.
    if ((c === "," || c === "}" || c === ")" || c === ";") && depth === 0) break;
    // A computed operand: an identifier, a call, a ternary. Consume to the next top-level
    // `+` or terminator and record it as a hole.
    sawSomething = true;
    let expr = "";
    while (i < text.length) {
      const d = text[i];
      if (d === "(" || d === "[" || d === "{") depth++;
      if (d === ")" || d === "]" || d === "}") {
        if (depth === 0) break;
        depth--;
      }
      if (depth === 0 && (d === "," || d === ";" || (d === "+" && expr.trim()))) break;
      expr += d;
      i++;
    }
    parts.push(HOLE);
  }
  return { literal: parts.join(""), end: i };
}

function extractClaimStrings(src: string): ClaimString[] {
  const text = stripComments(src);
  const out: ClaimString[] = [];
  const re = new RegExp(
    `(?:^|[\\s{,(])(${CLAIM_PROPS.join("|")})\\s*:\\s*`,
    "gm",
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const { literal, end } = readExpression(text, re.lastIndex);
    if (literal.replace(new RegExp(HOLE, "g"), "").trim())
      out.push({
        prop: m[1],
        literal,
        line: text.slice(0, m.index).split("\n").length,
      });
    re.lastIndex = Math.max(re.lastIndex, end);
  }
  // 19 of the 65 beat scripts build the string first and pass it by shorthand (`title,`), so the
  // `prop:` scan above never sees it. A `const`/`let` whose own NAME is a reader-facing prop is
  // read the same way.
  const decl = new RegExp(
    `\\b(?:const|let)\\s+(${CLAIM_PROPS.join("|")})\\s*=\\s*`,
    "gm",
  );
  while ((m = decl.exec(text))) {
    const { literal, end } = readExpression(text, decl.lastIndex);
    if (literal.replace(new RegExp(HOLE, "g"), "").trim())
      out.push({
        prop: m[1],
        literal,
        line: text.slice(0, m.index).split("\n").length,
      });
    decl.lastIndex = Math.max(decl.lastIndex, end);
  }
  return out;
}

/**
 * A number token. Grouping separators bind only before exactly three digits, so
 * "$58,500, 78.0 years" reads as two numbers. The leading `-` is never consumed: "1979-80" and
 * "2005–2024" must read as two numbers, not one negative.
 */
const NUMBER = /(?<![\w.,:'’])\d+(?:[,'   ]\d{3})*(?:[.,]\d+)?/g;

type Token = { raw: string; value: number; index: number };

function numbersIn(text: string): Token[] {
  const out: Token[] = [];
  for (const m of text.matchAll(NUMBER)) {
    const idx = m.index ?? 0;
    const after = text.slice(idx + m[0].length, idx + m[0].length + 3);
    if (/^(st|nd|rd|th)\b/i.test(after)) continue; // "the 20th century"
    if (after.startsWith(":")) continue; // "1:10m", "9:16"
    const before2 = text.slice(Math.max(0, idx - 2), idx);
    if (/[A-Za-z]-$/.test(before2)) continue; // "COVID-19", "mid-60s"
    if (/\d-$/.test(before2)) continue; // the tail of "1979-80" / "0-4"
    const cleaned = m[0]
      .replace(/[,'   ](?=\d{3}\b)/g, "")
      .replace(/,(\d+)$/, ".$1");
    const value = Number(cleaned);
    if (Number.isFinite(value)) out.push({ raw: m[0], value, index: idx });
  }
  return out;
}

/** Every number in the beat's own frozen data. `.geojson` is excluded — see the header. */
function groundSet(beatDir: string): { values: Set<number>; files: string[] } {
  const files = readdirSync(beatDir).filter(
    (f) => /\.(csv|json)$/.test(f) && !f.endsWith(".geojson"),
  );
  const values = new Set<number>();
  for (const f of files)
    for (const m of readFileSync(join(beatDir, f), "utf8").matchAll(
      /-?\d+(?:\.\d+)?/g,
    ))
      values.add(Number(m[0]));
  return { values, files };
}

const UNIT_SCALES = [1e-9, 1e-6, 1e-3, 1e3, 1e6, 1e9];

function grounded(n: number, values: Set<number>): boolean {
  for (const v of values) {
    for (let d = 0; d <= 4; d++) {
      const f = 10 ** d;
      if (Math.abs(Math.round(v * f) / f - n) < 1e-9) return true;
    }
    for (const s of UNIT_SCALES) {
      const sv = v * s;
      for (let d = 0; d <= 2; d++) {
        const f = 10 ** d;
        if (Math.abs(Math.round(sv * f) / f - n) < 1e-9) return true;
      }
    }
  }
  return false;
}

/**
 * Numeric literals sitting inside an `if (…)` condition whose body throws — the beat asserting its
 * own claim against the data it just read.
 */
function assertedValues(src: string): Set<number> {
  const out = new Set<number>();
  const text = stripComments(src);
  for (const m of text.matchAll(/\bif\s*\(/g)) {
    let i = (m.index ?? 0) + m[0].length;
    let depth = 1;
    let cond = "";
    while (i < text.length && depth > 0) {
      if (text[i] === "(") depth++;
      else if (text[i] === ")") {
        depth--;
        if (!depth) break;
      }
      cond += text[i];
      i++;
    }
    const body = text.slice(i, i + 400);
    if (!/^\s*\)?\s*(\{[\s\S]*?)?\bthrow\b/.test(body)) continue;
    for (const n of cond.matchAll(/-?\d+(?:\.\d+)?/g)) out.add(Number(n[0]));
  }
  return out;
}

/**
 * `// grounded-by-hand: <prop>:<value> — <reason>`
 *
 * Keyed by PROP AND VALUE, never by value alone. An earlier version keyed on the value, which
 * meant waiving `100` for a beat's `limits` string silenced every future `100` anywhere in that
 * same script — including a real one in its `alt`, which is exactly the claim a reader depends on.
 * The prop costs the waiver's author four characters and closes the widest part of this hatch.
 *
 * A waiver with no prop is REJECTED rather than treated as a wildcard: a silently-broad waiver is
 * worse than a missing one, because it disarms the guard in the place nobody is looking.
 */
function waivedValues(src: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of src.matchAll(
    /grounded-by-hand:\s*([A-Za-z]+):\s*(-?[\d.,]+)\s*[—-]\s*(.+)/g,
  )) {
    const value = Number(m[2].replace(/,(?=\d{3}\b)/g, ""));
    const reason = m[3].trim();
    if (Number.isFinite(value) && reason) out.set(`${m[1]}:${value}`, reason);
  }
  return out;
}

type Finding = {
  beat: string;
  file: string;
  line: number;
  prop: string;
  raw: string;
  value: number;
  context: string;
};

type BeatScan = {
  beat: string;
  script: string;
  checked: number;
  literalTokens: number;
  findings: Finding[];
  dataFiles: string[];
};

function scanBeat(beat: string): BeatScan[] {
  const beatDir = join(PROOF_ROOT, beat);
  const scripts = readdirSync(beatDir).filter((f) => BEAT_SCRIPTS.has(f));
  if (!scripts.length) return [];
  const { values, files } = groundSet(beatDir);
  return scripts.map((script) => {
    const src = readFileSync(join(beatDir, script), "utf8");
    const asserted = assertedValues(src);
    const waived = waivedValues(src);
    const findings: Finding[] = [];
    let checked = 0;
    let literalTokens = 0;
    for (const s of extractClaimStrings(src)) {
      for (const t of numbersIn(s.literal)) {
        literalTokens++;
        checked++;
        if (files.length && grounded(t.value, values)) continue;
        if (asserted.has(t.value)) continue;
        if (waived.has(`${s.prop}:${t.value}`)) continue;
        const from = Math.max(0, t.index - 55);
        findings.push({
          beat,
          file: script,
          line: s.line,
          prop: s.prop,
          raw: t.raw,
          value: t.value,
          context: s.literal
            .slice(from, t.index + t.raw.length + 55)
            .replace(new RegExp(HOLE, "g"), "‹derived›")
            .trim(),
        });
      }
    }
    return { beat, script, checked, literalTokens, findings, dataFiles: files };
  });
}

const beats = readdirSync(PROOF_ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !NOT_A_BEAT.has(e.name))
  .map((e) => e.name)
  .filter((name) =>
    readdirSync(join(PROOF_ROOT, name)).some((f) => BEAT_SCRIPTS.has(f)),
  )
  .sort();

const scans = beats.flatMap(scanBeat);

describe("every number a beat shows a reader is reproducible from that beat's own frozen data", () => {
  for (const scan of scans) {
    it(`should ground every literal number in proof/${scan.beat}/${scan.script}`, () => {
      const detail = scan.findings
        .map((f) => `  line ${f.line} [${f.prop}] "${f.raw}" — …${f.context}…`)
        .join("\n");
      expect(
        scan.findings,
        scan.findings.length === 0
          ? ""
          : `proof/${scan.beat}/${scan.script} shows ${scan.findings.length} number(s) that its ` +
              `own frozen data (${scan.dataFiles.join(", ") || "NONE — the beat freezes no data"}) ` +
              `cannot reproduce at any rounding, and that no assertion in the script pins. Each is a ` +
              `literal sitting where a computation belongs: correct or not today, nothing will turn ` +
              `red when it stops being true. Fix by interpolating the computed value, by throwing ` +
              `if the data disagrees, or — for a genuine non-datum — by a ` +
              `"// grounded-by-hand: <value> — <reason>" comment.\n${detail}`,
      ).toEqual([]);
    });
  }

  it("should freeze data beside every beat that makes a numeric claim", () => {
    const naked = scans.filter(
      (s) => !s.dataFiles.length && s.literalTokens > 0,
    );
    expect(
      naked.map((s) => `${s.beat}/${s.script}`),
      "a beat that shows numbers and freezes no .csv/.json cannot be audited at all — the condition " +
        "under which every one of these defects went undetected in the first place",
    ).toEqual([]);
  });
});

// ===================== GUARD B — PROVENANCE (class 2) =====================

const ARTIFACT = /\.(png|html|mp4)$/i;

function walkFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walkFiles(p));
    else out.push(p);
  }
  return out;
}

/** A production render or an explicitly named measurement probe that writes its own artifacts. */
function isArtifactScript(name: string): boolean {
  return BEAT_SCRIPTS.has(name) || /-probe\.mjs$/.test(name);
}

/** The nearest ancestor directory (up to proof/) that holds the artifact's own script. */
function owningBeatDir(artifact: string): string | null {
  let dir = artifact.slice(0, artifact.lastIndexOf("/"));
  while (dir.startsWith(PROOF_ROOT)) {
    if (readdirSync(dir).some(isArtifactScript)) return dir;
    if (dir === PROOF_ROOT) return null;
    dir = dir.slice(0, dir.lastIndexOf("/"));
  }
  return null;
}

/**
 * A `SUPERSEDED.md` beside the artifact naming it — literally, or by a `prefix*` glob. This is the
 * only exemption from B1, and it forces the standing of an unreproducible image to be written where
 * a reader will find it.
 */
function documentedAsSuperseded(artifact: string): boolean {
  const dir = artifact.slice(0, artifact.lastIndexOf("/"));
  const name = artifact.slice(artifact.lastIndexOf("/") + 1);
  const notePath = join(dir, "SUPERSEDED.md");
  if (!existsSync(notePath)) return false;
  const note = readFileSync(notePath, "utf8");
  if (note.includes(name)) return true;
  for (const m of note.matchAll(/`([^`\s]*)\*([^`\s]*)`/g)) {
    const [, prefix, suffix] = m;
    if (prefix && name.startsWith(prefix) && name.endsWith(suffix)) return true;
  }
  return false;
}

const orphanArtifacts = walkFiles(PROOF_ROOT)
  .filter((f) => ARTIFACT.test(f))
  .filter((f) => owningBeatDir(f) === null)
  .filter((f) => !documentedAsSuperseded(f))
  .map((f) => f.slice(PROOF_ROOT.length + 1));

/** Quoted filenames appearing inside a `readFile`/`readFileSync` call. */
function readFilenames(src: string): string[] {
  const text = stripComments(src);
  const out: string[] = [];
  for (const m of text.matchAll(/\breadFile(?:Sync)?\s*\(/g)) {
    let i = (m.index ?? 0) + m[0].length;
    let depth = 1;
    let args = "";
    while (i < text.length && depth > 0) {
      if (text[i] === "(") depth++;
      else if (text[i] === ")") {
        depth--;
        if (!depth) break;
      }
      args += text[i];
      i++;
    }
    for (const q of args.matchAll(/["'`]([^"'`]*\.[A-Za-z0-9]{2,6})["'`]/g)) {
      const name = q[1];
      if (name === "utf8") continue;
      out.push(name.slice(name.lastIndexOf("/") + 1));
    }
  }
  return [...new Set(out)];
}

const uncommittedInputs = scans
  .map((scan) => {
    const beatDir = join(PROOF_ROOT, scan.beat);
    const present = new Set(
      walkFiles(beatDir).map((f) => f.slice(f.lastIndexOf("/") + 1)),
    );
    const src = readFileSync(join(beatDir, scan.script), "utf8");
    const missing = readFilenames(src).filter((n) => !present.has(n));
    return { beat: scan.beat, script: scan.script, missing };
  })
  .filter((r) => r.missing.length);

describe("a committed artifact can be regenerated from what is committed beside it", () => {
  it("should find a beat script in the ancestry of every rendered artifact under proof/", () => {
    expect(
      orphanArtifacts,
      "these rendered artifacts have no render script in any ancestor directory, so nothing in this " +
        "repository can reproduce them or check what they show. That is how a chart carrying an " +
        "invented series under a real institution's name survived here. Either move the artifact " +
        "beside the beat that made it, or record its standing in a SUPERSEDED.md that names the file.",
    ).toEqual([]);
  });

  for (const { beat, script, missing } of uncommittedInputs) {
    it(`should commit every file proof/${beat}/${script} reads`, () => {
      expect(
        missing,
        `proof/${beat}/${script} reads ${JSON.stringify(missing)}, which exist nowhere under ` +
          `proof/${beat}/. The delivered artifact was drawn over an input this repository does not ` +
          `hold, so it cannot be regenerated or audited from what is committed.`,
      ).toEqual([]);
    });
  }
});

/**
 * The measurements quoted in this file's header, asserted so they cannot rot into false prose —
 * which is the very class this guard exists for.
 */
describe("the measurements this guard's header quotes", () => {
  it("should flag far fewer tokens than the structural alternative", () => {
    const literals = scans.reduce((n, s) => n + s.literalTokens, 0);
    const flagged = scans.reduce((n, s) => n + s.findings.length, 0);
    // The structural rule ("no numeric literal in a reader-facing string") flags every literal.
    expect(literals).toBeGreaterThan(flagged * 3);
  });

  it("should record that a dense data file grounds almost any small integer", () => {
    const dense = groundSet(join(PROOF_ROOT, "map-quake-density")).values;
    let hits = 0;
    for (let k = 1; k < 1000; k++) if (grounded(k, dense)) hits++;
    expect(hits / 999).toBeGreaterThan(0.95);

    const sparse = groundSet(
      join(PROOF_ROOT, "static-renewables-shift"),
    ).values;
    let sparseHits = 0;
    for (let k = 1; k < 1000; k++) if (grounded(k, sparse)) sparseHits++;
    // Measured 6.2% on 2026-08-09; the median beat is 6.7%.
    expect(sparseHits / 999).toBeLessThan(0.15);
  });
});
