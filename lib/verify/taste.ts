// The "needs-human-eye" lane.
//
// This project already ran the experiment: S4c decomposed judge opinion into five semantic
// dimensions and measured inter-judge kappa, and its own conclusion (spec
// 2026-07-23-s4c-dimension-judges-kappa-design.md, "Goals" 5) is that kappa measures a
// judge's SELF-CONSISTENCY, not correctness, until human labels exist. Stacking a second
// model on the first would manufacture confidence rather than verification.
//
// So the axes no mechanism can settle are not graded here. They are DETECTED as risks —
// with the measurement that raised them — and routed to the one instrument that can see the
// ceiling: the human editor who already signs off (skills/splash/src/editorial-signoff.ts).
//
// The type is the guard. TasteRiskSignal has no `outcome`, no `severity`, no `pass`: there
// is no field a model could write a verdict into, so "risk" cannot quietly become "fine".
import type { CaptureRecord, TasteRiskSignal } from "./types";

// Marks per 100 css px of component width. A slope with 18 marks across 1152px sits at 1.6;
// a chart at 8 is dense enough that whether it still READS is a judgement about the subject,
// not a threshold — which is exactly when a human should look.
export const DENSITY_MARKS_PER_100PX = 8;

// Weighted RGB distance (2,4,3 — the cheap approximation of perceived difference). Measured
// against real palettes: the codebase's own #1b7f79 / #d95f02 pair scores ~345, while a pair
// a reader would struggle to separate (#1b7f79 / #1d8a80) scores ~25.
export const MIN_COLOUR_SEPARATION = 90;

// Share of the confirmed takeaway's content words the rendered title also uses. Below this,
// the title may be a fine editorial rewrite or may have drifted off the confirmed point —
// a distinction no token count can make, which is why it is a risk and not a finding.
export const TAKEAWAY_OVERLAP_FLOOR = 0.3;

// Below this share of the confirmed takeaway's content words, the title carries a PART of what
// was confirmed. Distinct from TAKEAWAY_OVERLAP_FLOOR, which measures DIVERGENCE: "half the
// takeaway" shares far more than 30% of its words with the whole, so the divergence floor is
// structurally blind to it — as is any overlap measure to a title that ADDS words. Both forms
// the sweep measured (13/83) pass the existing threshold.
export const TAKEAWAY_COVERAGE_FLOOR = 0.6;

// The accessible-name prefix map-native's own components always prepend to a rendered title —
// furniture the reader never confirmed anything about, not a journalist's claim. Construction
// sites, all five identical (verified 2026-07-29, `grep -n "Interactive map:"
// skills/map-native/src/*.tsx`): ChoroplethMap.tsx:486, CartogramMap.tsx:353, RouteMap.tsx:516,
// HexGridMap.tsx:368, DotDensityMap.tsx:420 — each `config.title ? \`Interactive map:
// ${config.title}\` : ...`. Not a named export anywhere: the value is hand-copied five times in
// skills/map-native/src with no shared symbol to import, and lib/verify may not reach into
// skills/ regardless (spec §4.1, lib/core/channel-policy.ts:3-4) — so this constant is the
// closest thing to one, cited at its real construction sites rather than invented blind.
// Exempted from title-overrun ONLY (stripped before the ADDED-words check below): it must not
// touch title-partial-coverage or title-takeaway-divergence, and a genuine overrun appearing
// AFTER the prefix must still fire (bench: "carries the engine prefix AND still overruns").
export const MAP_NATIVE_TITLE_PREFIX = "Interactive map: ";

// Share of the publication container the component actually fills.
export const WHITESPACE_FILL_FLOOR = 0.35;

// Words carried by almost every sentence: counting them as overlap would make any two
// strings look related and silence the detector.
//
// Four languages, not one. This list was English-only, and the newsrooms this tool is built
// for publish in fr/de/it as well (NEWSROOM-PROFILE.example.md declares `lang: fr, en, de,
// it…`; lib/newsroom/language.ts resolves a CONTENT language distinct from the interface
// one). A French or German function word longer than two letters therefore counted as
// CONTENT and inflated the overlap — which silences the detector on a real divergence rather
// than making it noisy. Measured: "Der Anteil erreicht 70 %" titled "Die über 55-Jährigen
// übersteigen 55 % der Fälle" scored 0.33 and stayed quiet on the English-only list, and
// scores 0.00 here (the bench is in taste.test.ts, on real strings from this repo's runs).
//
// One union rather than a list chosen per language: lib/verify only imports lib/core, and
// the content language lives in lib/newsroom. The cost of the union is negligible — a French
// function word inside an English title is a rare word.
const STOPWORDS = new Set([
  // en
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "was",
  "were",
  "with",
  "every",
  "all",
  "than",
  "this",
  // fr
  "les",
  "des",
  "une",
  "dans",
  "sur",
  "pour",
  "par",
  "aux",
  "est",
  "sont",
  "ont",
  "été",
  "plus",
  "moins",
  "que",
  "qui",
  "ses",
  "son",
  "leur",
  "leurs",
  "cette",
  "ces",
  "entre",
  "chez",
  "avec",
  "sans",
  "mais",
  "donc",
  "tous",
  "toutes",
  "tout",
  "toute",
  "autre",
  "autres",
  "même",
  "très",
  // de
  "der",
  "die",
  "das",
  "den",
  "dem",
  "ein",
  "eine",
  "einen",
  "einem",
  "einer",
  "und",
  "oder",
  "aber",
  "auch",
  "mit",
  "von",
  "für",
  "auf",
  "aus",
  "bei",
  "nach",
  "über",
  "unter",
  "sind",
  "war",
  "waren",
  "hat",
  "haben",
  "wird",
  "werden",
  "nicht",
  "noch",
  "alle",
  "allen",
  "mehr",
  "sehr",
  "zum",
  "zur",
  "als",
  "dass",
  // it
  "del",
  "della",
  "dei",
  "delle",
  "degli",
  "con",
  "per",
  "non",
  "che",
  "come",
  "alla",
  "allo",
  "alle",
  "agli",
  "stato",
  "stata",
  "più",
  "meno",
  "tra",
  "fra",
  "gli",
  "una",
  "uno",
  "questo",
  "questa",
  "questi",
  "queste",
  "anche",
  "tutti",
  "tutte",
  "suo",
  "sua",
]);

function contentWords(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
}

function rgbOf(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function colourSeparation(a: string, b: string): number | null {
  const x = rgbOf(a);
  const y = rgbOf(b);
  if (!x || !y) return null;
  const dr = x[0] - y[0];
  const dg = x[1] - y[1];
  const db = x[2] - y[2];
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
}

export type TasteInput = {
  captures: CaptureRecord[];
  confirmedTakeaway: string;
  /** The title as actually RENDERED. Absent when nothing was captured to read it from —
   *  a missing title is a furniture finding, not a matter of taste. */
  renderedTitle?: string;
};

/** Detect risks. Never a verdict: each signal carries the number that raised it. */
export function detectTasteRisks(input: TasteInput): TasteRiskSignal[] {
  const out: TasteRiskSignal[] = [];

  // Density and whitespace are judged at EVERY captured breakpoint: a chart that breathes
  // on a 1600px desktop and suffocates at 360px is the normal case, not the exception.
  const dense: string[] = [];
  const empty: string[] = [];
  for (const c of input.captures) {
    if (c.rootBox.width > 0 && c.marks > 0) {
      const per100 = (c.marks / c.rootBox.width) * 100;
      if (per100 > DENSITY_MARKS_PER_100PX)
        dense.push(
          `[${c.breakpoint}] ${c.marks} marks across ${Math.round(c.rootBox.width)}px (${per100.toFixed(1)} per 100px, risk above ${DENSITY_MARKS_PER_100PX})`,
        );
    }
    const containerArea = c.cssViewport.width * c.cssViewport.height;
    const rootArea = c.rootBox.width * c.rootBox.height;
    if (containerArea > 0 && rootArea / containerArea < WHITESPACE_FILL_FLOOR)
      empty.push(
        `[${c.breakpoint}] the component fills ${(100 * rootArea) / containerArea < 1 ? "<1" : Math.round((100 * rootArea) / containerArea)}% of its ${c.cssViewport.width}x${c.cssViewport.height} container`,
      );
  }
  if (dense.length)
    out.push({
      dimension: "density",
      detector: `marks per 100px > ${DENSITY_MARKS_PER_100PX}`,
      evidence: dense,
      routedTo: "human-signoff",
    });
  if (empty.length)
    out.push({
      dimension: "whitespace",
      detector: `component fills < ${Math.round(WHITESPACE_FILL_FLOOR * 100)}% of its container`,
      evidence: empty,
      routedTo: "human-signoff",
    });

  // Palette adjacency, over the colours ACTUALLY painted — harvested from the live render
  // rather than read off a config. This codebase has already paid for the difference: a
  // grep of a single-file bundle once "proved" a palette that was not the one on screen.
  const colours = [...new Set(input.captures.flatMap((c) => c.markColours))];
  const tooClose: string[] = [];
  for (let i = 0; i < colours.length; i++)
    for (let j = i + 1; j < colours.length; j++) {
      const d = colourSeparation(colours[i]!, colours[j]!);
      if (d !== null && d < MIN_COLOUR_SEPARATION)
        tooClose.push(
          `${colours[i]} and ${colours[j]} are ${Math.round(d)} apart (risk below ${MIN_COLOUR_SEPARATION})`,
        );
    }
  if (tooClose.length)
    out.push({
      dimension: "palette-adjacency",
      detector: `weighted RGB separation < ${MIN_COLOUR_SEPARATION}`,
      evidence: tooClose,
      routedTo: "human-signoff",
    });

  // Title vs the takeaway the journalist confirmed. The project's own audit lists this as a
  // recurring divergence with no clean mechanical lever — precisely why it belongs here
  // rather than in the findings list.
  if (input.renderedTitle?.trim()) {
    const takeaway = contentWords(input.confirmedTakeaway);
    const title = contentWords(input.renderedTitle);
    if (takeaway.size > 0) {
      const shared = [...takeaway].filter((w) => title.has(w)).length;
      const overlap = shared / takeaway.size;
      if (overlap < TAKEAWAY_OVERLAP_FLOOR)
        out.push({
          dimension: "title-takeaway-divergence",
          detector: `shared content words < ${TAKEAWAY_OVERLAP_FLOOR}`,
          evidence: [
            `title "${input.renderedTitle}" shares ${shared}/${takeaway.size} content words with the confirmed takeaway "${input.confirmedTakeaway}"`,
          ],
          routedTo: "human-signoff",
        });

      // D16 (spec §4.2): SIGNAL, never block. The divergence check above measures OVERLAP
      // against a low floor (0.3) — it detects a title that has drifted OFF the confirmed
      // point, not one that carries only PART of it: "half the takeaway" shares well over 30%
      // of its words with the whole, so the divergence floor stays quiet. Nor can an overlap
      // measure see a title that ADDS a claim ("9 biennial years" → "decade after decade") —
      // words gained, none lost, overlap unchanged. Both forms the sweep measured (13/83) pass
      // the existing threshold, which is why this is a second check, not a lower floor.
      if (shared / takeaway.size < TAKEAWAY_COVERAGE_FLOOR)
        out.push({
          dimension: "title-partial-coverage",
          detector: `shared content words < ${TAKEAWAY_COVERAGE_FLOOR} of the confirmed takeaway`,
          evidence: [input.confirmedTakeaway, input.renderedTitle],
          routedTo: "human-signoff",
        });
      // A title may legitimately be SHORTER. It may not legitimately assert MORE than was
      // confirmed: "9 biennial years" → "decade after decade" is a claim nobody signed.
      //
      // The engine's own accessible-name prefix (MAP_NATIVE_TITLE_PREFIX) is exempted here,
      // and only here: it is stripped before tokenizing the "added" side, so it never counts
      // as an addition — but a real addition AFTER the prefix still does, because the strip
      // only ever removes a literal leading match, never a mid-string word.
      const titleBeyondEnginePrefix = input.renderedTitle.startsWith(
        MAP_NATIVE_TITLE_PREFIX,
      )
        ? input.renderedTitle.slice(MAP_NATIVE_TITLE_PREFIX.length)
        : input.renderedTitle;
      const added = [...contentWords(titleBeyondEnginePrefix)].filter(
        (w) => !takeaway.has(w),
      );
      if (added.length > 0 && shared === takeaway.size)
        out.push({
          dimension: "title-overrun",
          detector:
            "title adds content words the confirmed takeaway does not have",
          evidence: [input.confirmedTakeaway, input.renderedTitle],
          routedTo: "human-signoff",
        });
    }
  }

  return out;
}

/** The two strings, one under the other, for a human to read at the moment they decide.
 *
 *  No percentage: a coverage number invites an argument about the metric instead of a look at
 *  the title, and the decision belongs to the journalist either way (spec §4.2). Filters its
 *  own input rather than trusting the caller to pre-filter — the two title dimensions are the
 *  only ones with evidence shaped `[takeaway, title]`; any other dimension's evidence would be
 *  read wrong here. */
export function juxtaposeTitleAndTakeaway(
  signals: TasteRiskSignal[],
): string[] {
  const out: string[] = [];
  for (const s of signals) {
    if (
      s.dimension !== "title-partial-coverage" &&
      s.dimension !== "title-overrun"
    )
      continue;
    const [takeaway, title] = s.evidence;
    out.push(
      s.dimension === "title-overrun"
        ? "the title says more than you confirmed — read both:"
        : "the title carries part of what you confirmed — read both:",
      `  you confirmed: ${takeaway}`,
      `  the title reads: ${title}`,
    );
  }
  return out;
}
