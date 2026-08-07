// cesium-flyover's producer manifest — self-registers with the shared registry on import.
// A FILE-BASED producer with the standard <config> <outDir> <format> shape.
//
// ONE FORMAT. Not a v1 subset waiting to be widened: a flyover IS camera movement through
// terrain, so there is no still of one and nothing to explore interactively. The refusal the
// CLI prints for the other three format words is the same knowledge, said where a caller who
// never reaches the CLI can read it.
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { registerProducer } from "../../../lib/core/registry";
import type { GestureVocabulary } from "../../../lib/core/gestures";
import { flyoverConfigErrors, FLYOVER_TYPE } from "./validate-config";

const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// What a flyover makes move, measured from CesiumFlyover.tsx's own per-frame work: the camera
// position walks the path by arc length, the heading aims at a look-ahead point and the roll
// banks into the turn — one continuous, non-beat camera move driven by the clip's progress
// fraction. That is `push`, the same name RouteReveal's continuous zoom/pitch lerp carries.
//
// NOTHING ELSE. No data enters, nothing grows, nothing is highlighted and no sentence is ever
// painted — the terrain is simply there and the camera moves through it. Hence `reveal` alone:
// there is no `story` and no `stepped` here, because there are no beats to step through.
// Declaring one would promise a caption surface this component does not have.
const FLYOVER_GESTURES: GestureVocabulary = {
  reveal: ["push"],
};

registerProducer({
  name: "cesium-flyover",
  formats: ["video"],
  types: [{ id: FLYOVER_TYPE, gestures: FLYOVER_GESTURES }],
  unsupportedFormatMessage:
    "cesium-flyover renders video and nothing else: a flyover is camera movement through terrain, " +
    "so there is no static frame of one worth shipping and no interactive globe to hand a reader. " +
    'For a still or an explorable map of the same place, dispatch map-native ("locator" or ' +
    '"choropleth"); for a scroll-driven story, dispatch the "scrolly" producer.',
  validate: flyoverConfigErrors,
  execution: "subprocess",
  subprocess: {
    scriptPath: join(skillDir, "scripts/produce.mjs"),
    skillDir,
    // The producer reads SPLASH_CHANNEL to refuse a portrait/square channel by name (its two
    // compositions are landscape-only) rather than letterboxing one silently.
    threadsChannel: true,
  },
});
