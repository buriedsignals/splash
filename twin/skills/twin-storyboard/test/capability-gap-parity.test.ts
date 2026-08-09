/**
 * The one place a cross-skill import is legitimate: asserting two DELIBERATE duplicates still
 * agree (`skills/splash-twin/test/helper-parity.test.ts` is the pattern this file follows, and
 * `skills/splash-twin/test/no-cross-skill-imports.test.ts` excludes every skill's own `test/`
 * directory from the "no import leaves the skill" guard for exactly this reason).
 *
 * `twin-storyboard/scripts/capability-gap.mjs` is a byte-for-byte-intended duplicate of
 * `splash-twin/scripts/preflight.mjs`'s own `capabilityGap` — carried, not imported, so
 * `twin-storyboard` stays copy-pasteable on its own. This file is the guard against the risk that
 * buys: the two copies silently drifting apart.
 */
import { describe, it, expect } from "bun:test";
import { capabilityGap as storyboardCapabilityGap } from "../scripts/capability-gap.mjs";
import { capabilityGap as preflightCapabilityGap } from "../../splash-twin/scripts/preflight.mjs";

const OPEN = {
  id: "map",
  opens: "map beats",
  available: true,
  reason: "MapTiler answered 200",
};
const CLOSED = {
  id: "map",
  opens: "map beats",
  available: false,
  reason: "no MapTiler key",
};

describe("capabilityGap — twin-storyboard's copy agrees with splash-twin's original", () => {
  it("should agree a closed capability produces the same reason line", () => {
    const capabilities = { map: CLOSED };
    expect(storyboardCapabilityGap(capabilities, "map")).toEqual(
      preflightCapabilityGap(capabilities, "map"),
    );
    expect(storyboardCapabilityGap(capabilities, "map")).toBe(
      "map beats are unavailable: no MapTiler key",
    );
  });

  it("should agree an open capability returns null", () => {
    const capabilities = { map: OPEN };
    expect(storyboardCapabilityGap(capabilities, "map")).toEqual(
      preflightCapabilityGap(capabilities, "map"),
    );
    expect(storyboardCapabilityGap(capabilities, "map")).toBeNull();
  });

  it("should agree an unrecognised medium returns null on both, rather than inventing a gap", () => {
    const capabilities = { map: CLOSED };
    expect(storyboardCapabilityGap(capabilities, "chart")).toEqual(
      preflightCapabilityGap(capabilities, "chart"),
    );
    expect(storyboardCapabilityGap({}, "map")).toEqual(
      preflightCapabilityGap({}, "map"),
    );
  });

  it("should agree across the full {map, datawrapper, hostedEmbed} × {open, closed, absent} matrix", () => {
    const rows = {
      map: { open: OPEN, closed: CLOSED },
      datawrapper: {
        open: {
          id: "datawrapper",
          opens: "Datawrapper beats",
          available: true,
          reason: "ok",
        },
        closed: {
          id: "datawrapper",
          opens: "Datawrapper beats",
          available: false,
          reason: "no token",
        },
      },
      hostedEmbed: {
        open: {
          id: "hosted-embed",
          opens: "the hosted embed delivery form",
          available: true,
          reason: "ok",
        },
        closed: {
          id: "hosted-embed",
          opens: "the hosted embed delivery form",
          available: false,
          reason: "no producer",
        },
      },
    };
    for (const medium of Object.keys(rows) as Array<keyof typeof rows>) {
      for (const state of ["open", "closed"] as const) {
        const capabilities = { [medium]: rows[medium][state] };
        expect(storyboardCapabilityGap(capabilities, medium)).toEqual(
          preflightCapabilityGap(capabilities, medium),
        );
      }
    }
  });
});
