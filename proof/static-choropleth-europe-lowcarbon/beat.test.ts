import { describe, expect, it } from "bun:test";
import { copyOf, loadSubject } from "./beat.mjs";

describe("the choropleth subject, loaded without rendering", () => {
  const subject = loadSubject({ dir: import.meta.dirname });

  it("should find exactly the seven countries above the floor the title names", () => {
    const above = [...subject.value.values()].filter(
      (v) => v.lowCarbon > subject.FLOOR,
    ).length;
    expect(above).toBe(7);
  });

  it("should draw the class breaks the static plate draws", () => {
    expect(subject.BREAKS).toEqual([40, 55, 70, 85, 94]);
  });

  it("should hand out the static beat's own title ladder", () => {
    expect(copyOf(subject).title.length).toBe(3);
  });
});
