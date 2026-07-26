// map-native's producer manifest — self-registers with the shared registry on import.
// Dispatch data (scriptPath / skillDir / threadsChannel) is colocated with the engine
// here, replacing adapters.ts's hard-coded SCRIPT / SKILL_DIR / CHANNEL_THREADED maps.
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { registerProducer } from "../../../lib/core/registry";
import { mapNativeConfigErrors } from "./validate-config";
import { MAP_TYPES } from "./map-types";

const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

registerProducer({
  name: "map-native",
  // Single-format CLI vocabulary map-native's produce.mjs accepts (scrolly is the scrolly
  // engine's; it fails hard here too — see adapters.ts header).
  formats: ["static", "interactive", "video"],
  types: MAP_TYPES.map((id) => ({ id })),
  validate: mapNativeConfigErrors,
  execution: "subprocess",
  subprocess: {
    scriptPath: join(skillDir, "scripts/produce.mjs"),
    skillDir,
    // A native map renders at the channel's size/aspect (Slice 2): SPLASH_CHANNEL is threaded.
    threadsChannel: true,
  },
});
