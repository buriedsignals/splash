import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const STORYBOARD = join(import.meta.dirname, "..");
const SKILLS = join(STORYBOARD, "..");
const ROOT = join(SKILLS, "..");
const CHOICE = join(STORYBOARD, "references", "chart-choice.md");
const EXCHANGE = join(STORYBOARD, "references", "exchange.md");
const SKILL = join(STORYBOARD, "SKILL.md");

const TYPE_SETS = [
  { skill: "chart-beat", dir: join(SKILLS, "chart-beat", "references", "types") },
  { skill: "map-beat", dir: join(SKILLS, "map-beat", "references", "types") },
];

function expectedLinks(): string[] {
  return TYPE_SETS.flatMap(({ skill, dir }) =>
    readdirSync(dir)
      .filter((name) => name.endsWith(".md") && name !== "README.md")
      .map((name) => `../../${skill}/references/types/${name}`),
  ).sort();
}

function linkedSheets(text: string): string[] {
  return [...text.matchAll(
    /\]\((\.\.\/\.\.\/(?:chart-beat|map-beat)\/references\/types\/[^)\s]+\.md)\)/g,
  )].map((match) => match[1]);
}

describe("the storyboard chart chooser", () => {
  it("should account for every local chart and map type sheet", () => {
    const text = readFileSync(CHOICE, "utf8");
    const expected = expectedLinks();
    const linked = new Set(linkedSheets(text));

    expect(expected.length).toBeGreaterThan(30);
    for (const sheet of expected) expect(linked.has(sheet)).toBe(true);
    for (const sheet of linked) expect(expected).toContain(sheet);
  });

  it("should only link to type sheets that resolve on disk", () => {
    const text = readFileSync(CHOICE, "utf8");
    for (const sheet of linkedSheets(text)) {
      expect(existsSync(resolve(dirname(CHOICE), sheet))).toBe(true);
    }
  });

  it("should give every intent a consecutive ranking starting at one", () => {
    const text = readFileSync(CHOICE, "utf8");
    const sections = text.split(/^## Intent: /m).slice(1);

    expect(sections.length).toBeGreaterThan(10);
    for (const section of sections) {
      const heading = section.split(/\r?\n/, 1)[0];
      const ranks = [...section.matchAll(/^\| (\d+) \| \[/gm)].map((match) =>
        Number(match[1]),
      );
      expect(ranks.length, heading).toBeGreaterThanOrEqual(2);
      expect(ranks, heading).toEqual(ranks.map((_, index) => index + 1));
    }
  });

  it("should stay advisory, story-led and separate from reachability", () => {
    const text = readFileSync(CHOICE, "utf8").replace(/\s+/g, " ");
    expect(text).toContain("A hard refusal removes a candidate");
    expect(text).toContain("Reachability is checked after editorial fit");
    expect(text).toContain("The agent may choose a lower-ranked form");
    expect(text).toContain("no external skill invocation or runtime dependency");
  });

  it("should be part of the exchange and keep Data2Story reference-only", () => {
    const exchange = readFileSync(EXCHANGE, "utf8");
    const skill = readFileSync(SKILL, "utf8");
    const readme = readFileSync(join(ROOT, "README.md"), "utf8").replace(/\s+/g, " ");

    expect(exchange).toContain("references/chart-choice.md");
    expect(skill).toContain("references/chart-choice.md");
    expect(readme).toContain(
      "does not install, invoke, or require Data2Story skills at runtime",
    );
  });

  it("resumes Goose directly when the localhost treatment gate resolves", () => {
    const exchange = readFileSync(EXCHANGE, "utf8").replace(/\s+/g, " ");
    expect(exchange).toContain("resolves the pending MCP tool call");
    expect(exchange).toContain("without asking the journalist to return to chat or type “Continue”");
    expect(exchange).not.toContain('On “Continue”');
  });
});
