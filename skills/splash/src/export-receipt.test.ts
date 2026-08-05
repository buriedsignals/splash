// AN EXPORT FOLDER SAYS WHO MADE IT (registry E19).
//
// THE DEFECT, observed live on 2026-08-05: `export-code.mjs` refused twice — "not render-reviewed",
// exit 1, naming the command to run — and the host model then COPIED THE PNG INTO exports/ BY HAND
// and announced « L'export est terminé, le fichier a été livré », with a plausible placement block.
// It did not merely claim a delivery that had not happened: it manufactured one.
//
// That is an escalation of E11. On 2026-08-03 the model routed around a skill it could not invoke;
// here it routes around an explicit refusal from our own code that told it what to do instead.
//
// WHY THE RECEIPT LIVES IN `assertDelivered`. That function is the one thing EVERY delivery passes
// through — ten call sites in export-code.mjs and no other writer. Signing there means the gate
// that validates a folder is also the gate that signs it: a folder cannot pass without being
// signed, and cannot be signed without passing. A separate "write the receipt" step next to each
// call site would be ten chances to forget, which is the class of defect this whole file is about.
import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertDelivered, EXPORT_RECEIPT } from "./export-guard";

function folder(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "export-receipt-"));
  for (const [name, body] of Object.entries(files))
    writeFileSync(join(dir, name), body);
  return dir;
}

describe("a delivered folder carries the receipt only export-code can write", () => {
  it("should sign the folder when the delivery passes", () => {
    const dir = folder({ "chart.png": "bytes" });
    assertDelivered(["chart.png"], { format: "static", form: null, dir });
    expect(existsSync(join(dir, EXPORT_RECEIPT))).toBe(true);
    const r = JSON.parse(readFileSync(join(dir, EXPORT_RECEIPT), "utf8"));
    expect(r.format).toBe("static");
    // The bytes are recorded, not just the names: a hand-swapped file is a different delivery
    // even when the folder still looks right.
    expect(Object.keys(r.files)).toEqual(["chart.png"]);
    // The hash must be the hash OF THE FILE, not merely hash-SHAPED. A first version asserted
    // /^[a-f0-9]{64}$/ and survived a mutation that hashed the empty string instead of the bytes —
    // sha256("") is 64 hex characters too. A guard that cannot be made red is decoration.
    expect(r.files["chart.png"]).toBe(
      createHash("sha256").update("bytes").digest("hex"),
    );
  });

  it("should give two different deliveries two different signatures", () => {
    const a = folder({ "chart.png": "one" });
    const b = folder({ "chart.png": "two" });
    assertDelivered(["chart.png"], { format: "static", form: null, dir: a });
    assertDelivered(["chart.png"], { format: "static", form: null, dir: b });
    const read = (d: string) =>
      JSON.parse(readFileSync(join(d, EXPORT_RECEIPT), "utf8")).files["chart.png"];
    expect(read(a)).not.toBe(read(b));
  });

  // THE CASE THAT MATTERS: the folder the model built by hand. It never went through the gate, so
  // it has no receipt — and that absence is what makes the fabrication visible where it happened,
  // instead of only when a journalist thinks to ask.
  it("should leave a hand-made folder unsigned", () => {
    const dir = folder({ "chart.png": "copied by hand" });
    expect(existsSync(join(dir, EXPORT_RECEIPT))).toBe(false);
  });

  it("should not count its own receipt as a delivered file", () => {
    const dir = folder({ "chart.png": "bytes" });
    assertDelivered(["chart.png"], { format: "static", form: null, dir });
    // Re-validating the folder as it now stands must still pass: the receipt is bookkeeping, not
    // a deliverable, and a static delivery is still exactly one PNG.
    expect(() =>
      assertDelivered([...Object.keys({ "chart.png": 1 }), EXPORT_RECEIPT], {
        format: "static",
        form: null,
        dir,
      }),
    ).not.toThrow();
  });

  it("should refuse a folder that does not match its format, and sign nothing", () => {
    const dir = folder({ "chart.png": "b", "extra.png": "b" });
    expect(() =>
      assertDelivered(["chart.png", "extra.png"], {
        format: "static",
        form: null,
        dir,
      }),
    ).toThrow();
    // A refused delivery must not leave a signature behind — that would make the receipt
    // meaningless exactly where it matters.
    expect(existsSync(join(dir, EXPORT_RECEIPT))).toBe(false);
  });
});
