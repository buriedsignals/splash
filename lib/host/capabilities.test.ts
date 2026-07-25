import { describe, it, expect } from "bun:test";
// The composition root, bound rather than side-effect imported: without the registrations
// the registry is empty and every derived engine list would be silently empty too — the
// failure mode §4.4 of the spec calls out as the vicious one, because the suite stays green
// while the shipped declaration is dead.
import { ENGINES_REGISTERED } from "../loop/engines";
import { capabilities } from "./capabilities";
import { allProducers } from "../core/registry";
import { VERBS, VISUAL_FORMATS, CHANNELS } from "../core/vocabulary";
import { VERB_ERROR_CODES, type RenderPayload } from "../core/verbs/types";
import { HOST_ERROR_CODES } from "./errors";

describe("capabilities — the contract describes itself", () => {
  it("declares every verb in the closed vocabulary, and which have bodies", () => {
    expect(ENGINES_REGISTERED).toBe(true);
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
    expect(c.errorCodes.verb).toEqual([...VERB_ERROR_CODES]);
  });

  it("declares the host-level codes too, from their own single source", () => {
    const c = capabilities();
    expect(c.errorCodes.host).toEqual([...HOST_ERROR_CODES]);
    // The codes a host actually meets from the façade, not only from a verb.
    for (const code of ["usage", "no-run", "invalid-run", "stale-schema"])
      expect(c.errorCodes.host).toContain(code);
  });

  it("declares the engines from the registry, each with the formats it honours", () => {
    const c = capabilities();
    const registered = allProducers();
    expect(registered.length).toBeGreaterThan(0);
    expect(c.vocabulary.engines.map((e) => e.name).sort()).toEqual(
      registered.map((m) => m.name).sort(),
    );
    for (const engine of c.vocabulary.engines) {
      const manifest = registered.find((m) => m.name === engine.name)!;
      expect(engine.formats).toEqual([...manifest.formats]);
      // Every declared format is in the closed vocabulary a host reads above.
      for (const f of engine.formats)
        expect(VISUAL_FORMATS as readonly string[]).toContain(f);
    }
  });

  it("lets a host construct a request from the declaration alone", () => {
    const render = capabilities().verbs.find((v) => v.name === "render")!;
    const byName = Object.fromEntries(
      (render.payload ?? []).map((f) => [f.name, f]),
    );
    // `engine` without an enum was undiscoverable: a host reading only `verbs` had no way to
    // know which engines exist.
    expect(byName.engine.enum).toBeDefined();
    expect(byName.engine.enum!.length).toBeGreaterThan(0);
    expect(byName.engine.enum).toEqual(
      capabilities().vocabulary.engines.map((e) => e.name),
    );
    expect(byName.format.enum).toEqual([...VISUAL_FORMATS]);
    expect(byName.channel.enum).toEqual([...CHANNELS]);
    // spec is OPAQUE by contract (I3) — declared, never described.
    expect(byName.spec.type).toBe("unknown");
  });

  it("declares exactly the fields RenderPayload carries — a new field is a compile error", () => {
    // This object is typed by RenderPayload's own keys, so adding a payload field breaks
    // BOTH the declaration (Record<keyof RenderPayload, …> in capabilities.ts) and this
    // test at compile time. The previous hardcoded name list agreed only with itself.
    const expected: Record<keyof RenderPayload, true> = {
      engine: true,
      spec: true,
      format: true,
      channel: true,
      outDir: true,
      id: true,
    };
    const render = capabilities().verbs.find((v) => v.name === "render")!;
    expect((render.payload ?? []).map((f) => f.name).sort()).toEqual(
      Object.keys(expected).sort(),
    );
    for (const field of render.payload ?? []) expect(field.required).toBe(true);
  });

  it("is JSON-serializable without loss (I6)", () => {
    const c = capabilities();
    expect(JSON.parse(JSON.stringify(c))).toStrictEqual(c);
  });
});
