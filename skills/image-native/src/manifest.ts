// image-native's producer manifest (C5) — self-registers with the shared registry on
// import. A FILE-BASED producer: dispatch routes an accepted image-native proposal to its
// own produce.mjs with the standard <config> <outDir> <format> shape, no channel threaded
// (matching adapters.ts's CHANNEL_THREADED_PRODUCERS exclusion).
//
// validate delegates to the engine's own render-free conformance check. The manifest's
// validate contract is errors-only and format-free; image-native's conformance frame floor
// differs per format (spec §6.3), and v1 SHIPS "scrolly" ONLY (static/video are follow-ups,
// interactive is a non-goal — an image sequence has no data to explore). So validation here
// uses the v1 format, "scrolly". Format-parameterised validation is Task 8's uniform-path
// job (validate-gate.ts already runs the format-scoped check on the routed path).
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { registerProducer } from "../../../lib/core/registry";
import { checkImageConformance, type ImageStory } from "./image-story";
import { IMAGE_NATIVE_V1_FORMAT_MESSAGE } from "./format-support";

const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

registerProducer({
  name: "image-native",
  // The engine's grid is static/video/scrolly (never interactive); v1 CLI ships scrolly.
  formats: ["scrolly"],
  unsupportedFormatMessage: IMAGE_NATIVE_V1_FORMAT_MESSAGE,
  validate: (spec) =>
    checkImageConformance(spec as ImageStory, { format: "scrolly" }),
  execution: "subprocess",
  subprocess: {
    scriptPath: join(skillDir, "scripts/produce.mjs"),
    skillDir,
    threadsChannel: false,
  },
});
