import { describe, expect, it } from "bun:test";
import {
  bindState,
  stateFieldsIn,
  validateScrollyPlan,
} from "#shared/map-beat/scrolly.mjs";

const reveal = ["interpolate", ["linear"], { $state: "classes" }, 0, 0, 1, 1];

describe("scrolly paint bindings", () => {
  it("should replace a state token with the field's current number", () => {
    expect(bindState(reveal, { classes: 0.25 })).toEqual([
      "interpolate",
      ["linear"],
      0.25,
      0,
      0,
      1,
      1,
    ]);
  });

  it("should leave the value it was given untouched", () => {
    bindState(reveal, { classes: 0.25 });
    expect(reveal[2]).toEqual({ $state: "classes" });
  });

  it("should list every state field a value reads", () => {
    expect(
      stateFieldsIn(["*", { $state: "a" }, ["+", { $state: "b" }, 1]]).sort(),
    ).toEqual(["a", "b"]);
  });

  it("should refuse a token whose field no state carries", () => {
    const plan = {
      layers: [
        { id: "fills", bindings: { "fill-opacity": { $state: "fade" } } },
      ],
    };
    expect(
      validateScrollyPlan(plan, [
        { camX: 0.5, camY: 0.5, camZoom: 3, classes: 1 },
      ]),
    ).toEqual([
      'layer "fills": "fill-opacity" reads state field "fade", which card 1 does not carry',
    ]);
  });

  it("should refuse a card with no camera", () => {
    expect(validateScrollyPlan({ layers: [] }, [{ classes: 1 }])).toEqual([
      "card 1 carries no camera (camX, camY, camZoom) — the map would stay where the previous card left it",
    ]);
  });

  it("should refuse a binding that reads feature data, which reloads the tiles on every frame", () => {
    const plan = {
      layers: [
        {
          id: "classes",
          bindings: {
            "fill-opacity": ["*", { $state: "classes" }, ["match", ["get", "iso_a2"], "AL", 1, 0]],
          },
        },
      ],
    };
    const out = validateScrollyPlan(plan, [{ camX: 0.5, camY: 0.5, camZoom: 3, classes: 1 }]);
    expect(out).toHaveLength(1);
    expect(out[0]).toContain('layer "classes": "fill-opacity" reads feature data (get)');
  });

  it("should throw when a token names a field the state does not carry", () => {
    expect(() => bindState({ $state: "gone" }, {})).toThrow(/gone/);
  });
});
