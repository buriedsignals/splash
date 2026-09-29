// A DIRECTION'S DISPLAY MAY STEP DOWN ON A PHONE — ONLY WHERE THE DIRECTION FILES IT (issue #85).
//
// `nocturne` sets its title at 32 px, uppercase, tracked 3.4 px. At 375 × 812 the committed corpus
// titles ran four to ten lines and 27 of the 40 web pages were taller than the window. The record
// now files `phoneDisplay: 22` (why 22 is written there) and `render-web.mjs` emits one width query
// below `PHONE_STEP_BELOW_PX` (why 480 is written there). What is held here is the structure: the
// record is read and written back, the step is the only thing emitted, and a direction that files
// none — `creme`, `rapport`, the seed with no direction at all — gets a stylesheet byte for byte
// what it was. The pixels were measured on the delivered pages, not here: identical at 480, 768,
// 1024, 1400 and 1600 on all forty `nocturne` pages, and changed at 375 only.
import { describe, it, expect } from "bun:test";
import { join } from "node:path";
import { readDirection, readDirectionFromMarkdown } from "#shared/design-base/read-direction.mjs";
import { renderRunDirection } from "#shared/design-base/run-direction.mjs";
import { buildCss, phoneTitleCss, PHONE_STEP_BELOW_PX } from "../scripts/render-web.mjs";
import { FURNITURE, PLOT } from "./row-floor-fixture.ts";

const DIRECTIONS = join(import.meta.dirname, "..", "..", "..", "docs", "design-base", "directions");
const filed = (id: string) => readDirection(join(DIRECTIONS, `${id}.md`));

describe("the record", () => {
  it("files a phone display on nocturne only, riding on the display register", () => {
    expect(filed("nocturne").registers.display.phone).toBe(22);
    expect(filed("creme").registers.display.phone).toBeUndefined();
    expect(filed("rapport").registers.display.phone).toBeUndefined();
  });

  it("refuses a step that does not step down, or steps below the body", () => {
    const record = (phone: number) =>
      [
        "- name: T",
        "- leadingSource: chosen",
        `- phoneDisplay: ${phone}`,
        "| register | family | size | weight | italic | tracking | case | ink | leading |",
        "| --- | --- | ---: | ---: | --- | ---: | --- | --- | ---: |",
        "| display | sans | 32 | 400 | no | 3.4 | uppercase | ink | 1 |",
        "| body | sans | 12.5 | 400 | no | 0 | none | muted | 1 |",
      ].join("\n");
    expect(readDirectionFromMarkdown(record(22), "t").registers.display.phone).toBe(22);
    expect(() => readDirectionFromMarkdown(record(32), "t")).toThrow(/smaller than its display/);
    expect(() => readDirectionFromMarkdown(record(12), "t")).toThrow(/larger than its body/);
  });

  it("is written back into a run's DIRECTION.md and read again, and absent where none is filed", () => {
    const chosen = (id: string) => {
      const d = filed(id);
      return { ...d, origin: "test", palette: { from: id }, colour: {} };
    };
    const noct = renderRunDirection(chosen("nocturne"));
    expect(noct).toContain("- phoneDisplay: 22\n");
    expect(readDirectionFromMarkdown(noct, "run").registers.display.phone).toBe(22);
    expect(renderRunDirection(chosen("creme"))).not.toContain("phoneDisplay");
  });
});

describe("the stylesheet", () => {
  const base = buildCss({ ...FURNITURE, plot: PLOT });

  it("is byte for byte unchanged for a direction that files no step, or for no direction", () => {
    expect(buildCss({ ...FURNITURE, plot: PLOT, direction: null })).toBe(base);
    expect(buildCss({ ...FURNITURE, plot: PLOT, direction: filed("creme") })).toBe(base);
    expect(buildCss({ ...FURNITURE, plot: PLOT, direction: filed("rapport") })).toBe(base);
    expect(base).not.toContain("PHONE STEP");
  });

  it("adds exactly the phone step for nocturne, and nothing else", () => {
    const step = phoneTitleCss(filed("nocturne"));
    const css = buildCss({ ...FURNITURE, plot: PLOT, direction: filed("nocturne") });
    expect(css.replace(step, "")).toBe(base);
    expect(PHONE_STEP_BELOW_PX).toBe(480);
    expect(step).toContain("@media (max-width: 479px) {");
    const rules = [...step.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => [m[1].trim(), m[2].trim()]);
    expect(rules).toEqual([
      [
        ".chart-title",
        "font-size: calc(var(--title-size, 32px) * 0.6875) !important;\n" +
          "    letter-spacing: 0.10625em !important;",
      ],
    ]);
  });
});
