import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The kit's own example writes { name: code, label: nameOf(code) } and subject.mjs prints label ?? name,
// so the code-not-name guard must read the printed name, not the key (gx-connected-scatter video mvg11,
// 12B, 2026-11-18: refused twice for "AUT", "BEL"… while the page would have printed Austria, Belgium).
const kit = join(import.meta.dir, "..", "craft", "video", "connected-scatter");

for (const format of ["video", "static"]) {
  describe(`connected-scatter ${format} code-not-name guard`, () => {
    it("should check the printed label, not the entity key", () => {
      const src = readFileSync(join(kit, "..", "..", format, "connected-scatter", "render-beat.mjs"), "utf8");
      expect(src).toMatch(/assertNoAggregates\([^\n]*String\(e\.label \?\? e\.name\)/);
    });
  });
}
