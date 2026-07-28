import { describe, it, expect } from "bun:test";
import { chooseForm } from "./choose";
import {
  provenanceHash,
  stalenessOf,
  type FormOption,
  type RunElement,
  type RunManifest,
} from "./manifest";

// A buildable option: chart-native is the one engine LOOP_BUILDABLE_ENGINES names today.
function buildable(over: Partial<FormOption> = {}): FormOption {
  return {
    id: "o1",
    nativeType: "line",
    engine: "chart-native",
    format: "static",
    why: "w",
    ...over,
  };
}

function elementWith(options: FormOption[], over: Partial<RunElement> = {}) {
  const el: RunElement = {
    id: "e1",
    angle: { confirmedTakeaway: "T", altInsight: "A", unit: "u" },
    proposal: { options, excluded: [] },
    ...over,
  };
  return el;
}

function runWith(el: RunElement): RunManifest {
  return {
    runId: "r1",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: { path: "input/data.csv", sha256: "abc" } },
    orient: {
      profile: { columns: ["a"], numericColumns: ["a"], rowCount: 2 },
      supportsPoint: true,
    },
    elements: [el],
    events: [],
  };
}

describe("chooseForm — the journalist's choice, written by code", () => {
  it("should write the chosen id onto the proposal", () => {
    const el = elementWith([buildable(), buildable({ id: "o2" })]);
    const r = chooseForm(el, "o2");
    expect(r.ok).toBe(true);
    expect((r as { value: RunElement }).value.proposal!.chosenId).toBe("o2");
  });

  it("should not mutate the element it was handed", () => {
    const el = elementWith([buildable()]);
    chooseForm(el, "o1");
    expect(el.proposal!.chosenId).toBeUndefined();
  });

  it("should refuse an id that is not in the offer, naming what was offered", () => {
    const el = elementWith([buildable(), buildable({ id: "o2" })]);
    const r = chooseForm(el, "o3");
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    const message = (r as { message: string }).message;
    expect(message).toContain("o3");
    expect(message).toContain("o1");
    expect(message).toContain("o2");
  });

  it("should refuse before anything has been proposed", () => {
    const { proposal: _none, ...el } = elementWith([buildable()]);
    const r = chooseForm(el as RunElement, "o1");
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
  });

  it("should refuse an empty offer, carrying the brain's own refusal", () => {
    const el = elementWith([]);
    el.proposal!.refusal = "you asked for a video, and nothing can build one";
    const r = chooseForm(el, "o1");
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain(
      "nothing can build one",
    );
  });

  it("should refuse a form nothing can build, in the words the offer showed", () => {
    const el = elementWith([
      buildable({
        id: "map1",
        engine: "map-native",
        readiness: {
          status: "missing",
          reason: "nothing can build a map-native form yet",
        },
      }),
    ]);
    const r = chooseForm(el, "map1");
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain(
      "nothing can build a map-native form yet",
    );
  });

  it("should refuse an unbuildable form that carries no mark at all", () => {
    // A hand-authored manifest can hold an option the brain never marked. The dead end is a
    // fact about production, not about the mark, so the refusal must still land.
    const el = elementWith([buildable({ id: "map1", engine: "map-native" })]);
    const r = chooseForm(el, "map1");
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain("map-native");
  });

  it("should refuse an unbuildable form whose mark is BLANK, in the engine's own words", () => {
    // `readiness.reason` is typed as a plain string, so "" is a manifest anyone could hand-author.
    // The refusal is decided by the ENGINE, never by whether a sentence happens to be filled in:
    // a blank mark that suppressed the refusal would dead-end the run in silence.
    const el = elementWith([
      buildable({
        id: "map1",
        engine: "map-native",
        readiness: { status: "missing", reason: "   " },
      }),
    ]);
    const r = chooseForm(el, "map1");
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain("map-native");
  });

  it("should accept a MARKED form the loop can still build — the mark warns, it does not forbid", () => {
    // P1: the offer showed the mark, the journalist read it and chose anyway. A capability the
    // newsroom left switched off is a newsroom decision, not an impossibility — refusing here
    // would turn a warning into a veto.
    const el = elementWith([
      buildable({
        readiness: {
          status: "disabled",
          reason: "Charts built in-house is not turned on for this newsroom",
        },
      }),
    ]);
    const r = chooseForm(el, "o1");
    expect(r.ok).toBe(true);
  });

  it("should keep delivery records already on the element", () => {
    const el = elementWith([buildable()], {
      delivery: {
        requested: ["zip"],
        delivered: [
          {
            publisherId: "zip",
            kind: "package",
            publishedAt: "1980-01-01T00:00:00.000Z",
            deliveredProvenanceHash: "old",
          },
        ],
      },
    });
    const r = chooseForm(el, "o1");
    expect(r.ok).toBe(true);
    expect((r as { value: RunElement }).value.delivery!.delivered.length).toBe(
      1,
    );
  });

  it("should make a produced artifact stale when the choice moves", () => {
    // The back-edge already in manifest.ts, reached through the decision writer: no new
    // invalidation mechanism, the provenance hash does the work.
    const chosen = elementWith([buildable(), buildable({ id: "o2" })], {
      proposal: {
        options: [buildable(), buildable({ id: "o2" })],
        excluded: [],
        chosenId: "o1",
      },
    });
    const run = runWith(chosen);
    const produced: RunElement = {
      ...chosen,
      artifact: {
        path: "elements/e1/static.png",
        sha256: "d",
        provenanceHash: provenanceHash(run, chosen),
        producedAt: "1980-01-01T00:00:00.000Z",
      },
    };
    expect(stalenessOf({ ...run, elements: [produced] }, produced)).toBe(false);

    const r = chooseForm(produced, "o2");
    expect(r.ok).toBe(true);
    const moved = (r as { value: RunElement }).value;
    expect(stalenessOf({ ...run, elements: [moved] }, moved)).toBe(true);
  });
});
