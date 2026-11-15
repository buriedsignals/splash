// `const tickLabel = (v) => tickLabel(format, v)` in the time web runner shadowed the import it meant to call and
// called itself instead. JavaScriptCore runs a strict-mode tail call without growing the stack, so the render did not
// overflow — it spun forever, and every line/area web beat hung until the craft cap. No kit file may bind a name to an
// arrow that calls that same name.
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dir, "..", "craft", "_shared");
const files = readdirSync(dir).filter((f) => /\.(mjs|ts|tsx)$/.test(f));

describe("the shared kit files", () => {
  it("should never bind a name to an arrow that calls that same name", () => {
    const found = files.flatMap((f) =>
      [...readFileSync(join(dir, f), "utf8").matchAll(/\bconst\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*(\w+)\s*\(/g)]
        .filter((m) => m[1] === m[2])
        .map((m) => `${f}: ${m[0]}`),
    );
    expect(found).toEqual([]);
  });
});
