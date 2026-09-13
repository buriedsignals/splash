/**
 * Two things a directed type beat needs from the vehicle, and that no beat should wire for itself:
 *
 *   1. THE FURNITURE IS SET IN THE DIRECTION'S REGISTERS. The eyebrow, the title, every card's prose
 *      and the credit are the page's own words, and a filed direction decides their face, size,
 *      weight, tracking and case — exactly as it does on the static plate and the web page.
 *   2. ONE VISUAL, REVEALED BY THE SCROLL. A type beat shows one chart and the steps are successive
 *      readings of it. The visual is a single persistent element, driven by the scaffold's own
 *      `data-progress`; the beat supplies the states and the function that paints one.
 */
import { describe, it, expect, setDefaultTimeout } from "bun:test";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderScrolly } from "../scripts/render-scrolly.mjs";
import { stateAt, lerpState } from "../assets/reveal.mjs";

setDefaultTimeout(60000);

const OUT = "/tmp/scrolly-test-directed";

const TYPE = {
  eyebrow: {
    fontFamily: '"Open Sans", Helvetica, Arial, sans-serif',
    fontSize: "10px",
    fontWeight: 600,
    fontStyle: "normal",
    letterSpacing: "1.9px",
    textTransform: "uppercase",
    color: "#1757B6",
  },
  display: {
    fontFamily: '"Merriweather", Georgia, serif',
    fontSize: "30px",
    fontWeight: 700,
    fontStyle: "normal",
    letterSpacing: "-0.2px",
    textTransform: "none",
    color: "#000000",
  },
  body: {
    fontFamily: '"Open Sans", Helvetica, Arial, sans-serif',
    fontSize: "13px",
    fontWeight: 400,
    fontStyle: "normal",
    letterSpacing: "0px",
    textTransform: "none",
    color: "#555555",
  },
  source: {
    fontFamily: '"Open Sans", Helvetica, Arial, sans-serif',
    fontSize: "13px",
    fontWeight: 400,
    fontStyle: "normal",
    letterSpacing: "0px",
    textTransform: "none",
    color: "#555555",
  },
};

const steps = [
  {
    id: "a",
    prose: ["Première lecture."],
    frame: createElement("div", null, "A"),
  },
  {
    id: "b",
    prose: ["Deuxième lecture."],
    frame: createElement("div", null, "B"),
  },
];

async function page(extra: Record<string, unknown>, name: string) {
  const { outPath } = await renderScrolly({
    steps,
    title: "Un titre dirigé",
    source: "Source : un fichier gelé",
    ground: "#FFFCEE",
    outDir: OUT,
    name,
    ...extra,
  });
  return readFile(outPath, "utf8");
}

/** The inline style of the first tag matching `open`, as written in the page. */
function styleOf(html: string, open: RegExp) {
  const tag = open.exec(html)?.[0] ?? "";
  return /style="([^"]*)"/.exec(tag)?.[1] ?? "";
}

describe("renderScrolly — a directed page sets its furniture in the direction's registers", () => {
  it("should write the eyebrow above the title, in the eyebrow register", async () => {
    const html = await page(
      { type: TYPE, eyebrow: "Climat · Suisse" },
      "eyebrow.html",
    );
    const header = html.slice(
      html.indexOf('<header class="scrolly-header">'),
      html.indexOf("</header>"),
    );
    expect(header.indexOf("Climat · Suisse")).toBeGreaterThan(-1);
    expect(header.indexOf("Climat · Suisse")).toBeLessThan(
      header.indexOf("<h2"),
    );
    expect(styleOf(header, /<p class="scrolly-eyebrow"[^>]*>/)).toContain(
      "text-transform:uppercase",
    );
  });

  it("should set the title in the display register", async () => {
    const html = await page({ type: TYPE }, "display.html");
    const style = styleOf(html, /<h2[^>]*>/);
    expect(style).toContain("font-size:30px");
    expect(style).toContain("Merriweather");
  });

  it("should set every card's prose in the body register", async () => {
    const html = await page({ type: TYPE }, "body.html");
    const paragraphs = [
      ...html.matchAll(/<div class="step-panel"[^>]*>\s*<p([^>]*)>/g),
    ].map((m) => m[1]);
    expect(paragraphs.length).toBe(steps.length);
    for (const p of paragraphs) expect(p).toContain("font-size:13px");
  });

  it("should set the credit in the source register", async () => {
    const html = await page({ type: TYPE }, "source.html");
    expect(styleOf(html, /<p class="source"[^>]*>/)).toContain(
      "font-size:13px",
    );
  });

  it("should declare the language the words are written in", async () => {
    const html = await page({ type: TYPE, lang: "fr" }, "lang.html");
    expect(html).toContain('<html lang="fr">');
  });

  it("should refuse a register value that could break out of its style attribute", async () => {
    const hostile = {
      ...TYPE,
      display: { ...TYPE.display, fontFamily: 'x"><script>alert(1)</script>' },
    };
    await expect(page({ type: hostile }, "hostile.html")).rejects.toThrow(
      "register",
    );
  });
});

// ---------------------------------------------------------------------------------------------

const DRIVER = `function applyTest(root, state) { root.style.opacity = String(state.shown); }`;
const visual = createElement(
  "div",
  { className: "test-visual" },
  "the one picture",
);

describe("renderScrolly — one visual, revealed by the scroll", () => {
  it("should carry the visual exactly once, however many steps read it", async () => {
    const html = await page(
      {
        reveal: {
          element: visual,
          states: [{ shown: 0 }, { shown: 1 }],
          driver: DRIVER,
          apply: "applyTest",
        },
      },
      "reveal-once.html",
    );
    expect(html.match(/<div data-reveal="visual"/g)?.length).toBe(1);
    expect(html.match(/the one picture/g)?.length).toBe(1);
  });

  it("should inline the beat's states and the function that paints one", async () => {
    const html = await page(
      {
        reveal: {
          element: visual,
          states: [{ shown: 0 }, { shown: 1 }],
          driver: DRIVER,
          apply: "applyTest",
        },
      },
      "reveal-inline.html",
    );
    expect(html).toContain("function applyTest(root, state)");
    expect(html).toContain('[{"shown":0},{"shown":1}]');
    expect(html).toContain("initReveal(");
  });

  it("should refuse one state per step to be missing", async () => {
    await expect(
      page(
        {
          reveal: {
            element: visual,
            states: [{ shown: 0 }],
            driver: DRIVER,
            apply: "applyTest",
          },
        },
        "short.html",
      ),
    ).rejects.toThrow("one state per step");
  });

  it("should refuse a state field that is not a finite number", async () => {
    await expect(
      page(
        {
          reveal: {
            element: visual,
            states: [{ shown: 0 }, { shown: "1" }],
            driver: DRIVER,
            apply: "applyTest",
          },
        },
        "nan.html",
      ),
    ).rejects.toThrow("finite number");
  });

  it("should refuse a painting function the driver does not define", async () => {
    await expect(
      page(
        {
          reveal: {
            element: visual,
            states: [{ shown: 0 }, { shown: 1 }],
            driver: DRIVER,
            apply: "applyOther",
          },
        },
        "undefined-apply.html",
      ),
    ).rejects.toThrow("applyOther");
  });

  it("should refuse a painting function name that is not a plain identifier", async () => {
    await expect(
      page(
        {
          reveal: {
            element: visual,
            states: [{ shown: 0 }, { shown: 1 }],
            driver: DRIVER,
            apply: "a();alert(1)",
          },
        },
        "bad-name.html",
      ),
    ).rejects.toThrow("identifier");
  });
});

describe("reveal — the state at a position along the steps", () => {
  const states = [{ v: 0 }, { v: 10 }, { v: 20 }];

  it("should return the first state before the first step", () => {
    expect(stateAt(states, -1, false).v).toBe(0);
  });

  it("should return the last state past the last step", () => {
    expect(stateAt(states, 7, false).v).toBe(20);
  });

  it("should land exactly on a step's own state at its own position", () => {
    expect(stateAt(states, 1, false).v).toBe(10);
  });

  it("should pass halfway between two states halfway between their steps", () => {
    expect(stateAt(states, 1.5, false).v).toBeCloseTo(15, 5);
  });

  it("should snap to the nearer step when the reader asked for no motion", () => {
    expect(stateAt(states, 1.4, true).v).toBe(10);
  });

  it("should interpolate every field of a state", () => {
    expect(lerpState({ a: 0, b: 2 }, { a: 4, b: 6 }, 0.5)).toEqual({
      a: 2,
      b: 4,
    });
  });
});

describe("renderScrolly — a title ladder, like the static plate's", () => {
  const forms = ["La forme longue du titre, qui ne tient que sur un écran large", "La forme courte"];

  it("should write the longest form, so a reader without a script gets the whole headline", async () => {
    const html = await page({ type: TYPE, title: forms }, "ladder-first.html");
    expect(html).toMatch(/<h2[^>]*>La forme longue du titre, qui ne tient que sur un écran large<\/h2>/);
  });

  it("should carry every form on the title, for the scaffold to choose from", async () => {
    const html = await page({ type: TYPE, title: forms }, "ladder-forms.html");
    const tag = /<h2[^>]*>/.exec(html)?.[0] ?? "";
    expect(tag).toContain("data-title-forms=");
    expect(tag).toContain("La forme courte");
  });

  it("should refuse an empty ladder", async () => {
    await expect(page({ type: TYPE, title: [] }, "ladder-empty.html")).rejects.toThrow("title");
  });
});
