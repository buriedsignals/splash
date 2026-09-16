/**
 * L2 — THE ONE THING THE PROPOSAL DECIDED AND NEVER WROTE DOWN.
 *
 * `docs/splash/2026-09-17-editorial-exchange-audit.md` gap 2, measured: no `interaction` field
 * existed in `REQUIRED_SCALARS`, in `REQUIRED_SLOT_FIELDS` or in any `STORYBOARD.md`. The visual
 * catalogue has carried an `interaction { kind, promise }` on every medium/format pair since it was
 * written, and nothing downstream ever read it — `visualCatalogueEntries` itself had no caller
 * outside this test directory. So the journalist chose a web beat, the catalogue said what a web
 * beat PROMISES a reader ("every reading can expose an exact value by hover, tap, or keyboard while
 * the static argument remains readable without JavaScript"), and the promise reached neither the
 * menu they read nor the slot they closed.
 *
 * Two halves, and both are asserted here: the candidate a journalist reads carries the catalogue's
 * own interaction for the pair it would be produced as, and the slot cannot close gate 2 without
 * recording it.
 *
 * MUTATIONS, run and verified (task 4 of `docs/superpowers/plans/2026-09-17-editorial-chain.md`):
 *   - drop `interaction` from the row `formatCandidateRows` builds → "should give every format
 *     candidate the catalogue's interaction" red.
 *   - remove `"interaction"` from `REQUIRED_SLOT_FIELDS` → "should make interaction a field gate 2
 *     cannot close without" red, and the closing case below stays green, which is the tell that it
 *     is the LIST being asserted rather than one fixture.
 *   - re-orphan `visualCatalogueEntries` (render the menu without looking the pair up) → "should be
 *     reached from production code and not only from a test" red.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  formatCandidates,
  formatCandidateRows,
  visualCatalogueEntries,
} from "../scripts/propose.mjs";
import {
  REQUIRED_SLOT_FIELDS,
  checkStoryboard,
  parseStoryboard,
} from "../scripts/gate-contract.mjs";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");

const CANDIDATES = [
  {
    type: "Bar and column",
    format: "static",
    why: "the ten ranked, largest first",
  },
  {
    type: "Line",
    format: "web",
    why: "the reader asks any year for its own value",
  },
  {
    type: "Slope (slopegraph)",
    format: "video",
    why: "the two years arrive in order",
  },
];

describe("a candidate carries its interaction", () => {
  it("should give every format candidate the catalogue's interaction for its medium and format", () => {
    const rows = formatCandidateRows({
      medium: "chart",
      candidates: CANDIDATES,
    });
    expect(rows).toHaveLength(3);
    for (const candidate of rows) {
      const entry = visualCatalogueEntries().find(
        (e) => e.id === candidate.catalogueId,
      );
      expect(entry, candidate.type).toBeTruthy();
      expect(candidate.interaction, candidate.type).toEqual(entry!.interaction);
    }
  });

  it("should carry no interaction for a candidate that has not named a format yet", () => {
    const [row] = formatCandidateRows({
      medium: "chart",
      candidates: [{ type: "Bar and column", why: "the ten ranked" }],
    });
    expect(row.catalogueId).toBeNull();
    expect(row.interaction).toBeNull();
  });

  it("should put the promise in front of the journalist, in the catalogue's own words", () => {
    const text = formatCandidates({ medium: "chart", candidates: CANDIDATES });
    const web = visualCatalogueEntries().find(
      (e) => e.id === "chart.line.web",
    )!;
    expect(text).toContain(web.interaction.promise);
  });

  it("should be reached from production code and not only from a test", () => {
    const callers: string[] = [];
    (function walk(dir: string) {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name === "test") continue;
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (
          /\.mjs$/.test(entry.name) &&
          readFileSync(path, "utf8").includes("visualCatalogueEntries(")
        )
          callers.push(path);
      }
    })(join(ROOT, "skills"));
    expect(
      callers.some((p) => p.endsWith("storyboard/scripts/propose.mjs")),
    ).toBe(true);
    expect(callers.length).toBeGreaterThan(0);
  });

  it("should make interaction a field gate 2 cannot close without", () => {
    expect(REQUIRED_SLOT_FIELDS).toContain("interaction");
  });

  it("should refuse a slot that records no interaction, naming that field and no other", () => {
    const withOut = STORYBOARD.replace(/\n    interaction: explore/, "");
    const errors = checkStoryboard(parseStoryboard(withOut).meta);
    expect(errors.join("\n")).toMatch(/interaction/);
    expect(checkStoryboard(parseStoryboard(STORYBOARD).meta)).toEqual([]);
  });

  it("should refuse an interaction outside the catalogue's four kinds", () => {
    const wrong = STORYBOARD.replace(
      "interaction: explore",
      "interaction: wiggle",
    );
    expect(checkStoryboard(parseStoryboard(wrong).meta).join("\n")).toMatch(
      /interaction/,
    );
  });
});

// A storyboard that closes gate 2, written out here rather than read off the corpus: this file is
// about the CONTRACT, and a fixture that travels with the test cannot be broken by a story.
const STORYBOARD = `---
takeaway: "The six countries under sixty years are all in sub-Saharan Africa."
grounding: supported
subject: "the six countries under sixty years"
comparison: "each country against every other"
limits: "period life expectancy, 2023"
placement: "inside the article"
credit: "Our World in Data"
effectiveDate: "2026-09-17"
language: "en"
slots:
  - id: 1-life-expectancy
    proves: "that the six under sixty are all in one region"
    medium: map
    format: web
    reachable: yes
    candidates: ["Choropleth"]
    intent: "show a level over a territory"
    interaction: explore
    chosen: "Choropleth"
    producer: custom
---
`;
