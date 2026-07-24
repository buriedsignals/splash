import { describe, it, expect } from "bun:test";
import { capabilities } from "./capabilities";
import { VERBS, VISUAL_FORMATS, CHANNELS } from "../core/vocabulary";
import { VERB_ERROR_CODES } from "../core/verbs/types";

describe("capabilities — the contract describes itself", () => {
  it("declares every verb in the closed vocabulary, and which have bodies", () => {
    const c = capabilities();
    expect(c.verbs.map((v) => v.name)).toEqual([...VERBS]);
    expect(c.verbs.filter((v) => v.implemented).map((v) => v.name)).toEqual([
      "render",
    ]);
  });

  it("derives its enumerations from the vocabulary — never a local copy", () => {
    const c = capabilities();
    expect(c.vocabulary.formats).toEqual([...VISUAL_FORMATS]);
    expect(c.vocabulary.channels).toEqual([...CHANNELS]);
    expect(c.errorCodes).toEqual([...VERB_ERROR_CODES]);
  });

  it("describes render's payload, with the enums a host must respect", () => {
    const render = capabilities().verbs.find((v) => v.name === "render")!;
    const byName = Object.fromEntries(
      (render.payload ?? []).map((f) => [f.name, f]),
    );
    expect(Object.keys(byName).sort()).toEqual(
      ["channel", "engine", "format", "id", "outDir", "spec"].sort(),
    );
    expect(byName.format.enum).toEqual([...VISUAL_FORMATS]);
    expect(byName.channel.enum).toEqual([...CHANNELS]);
    // spec is OPAQUE by contract (I3) — declared, never described.
    expect(byName.spec.type).toBe("unknown");
  });

  it("is JSON-serializable without loss (I6)", () => {
    const c = capabilities();
    expect(JSON.parse(JSON.stringify(c))).toStrictEqual(c);
  });
});
