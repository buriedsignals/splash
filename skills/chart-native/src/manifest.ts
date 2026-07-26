// chart-native's producer manifest — self-registers with the shared registry on import
// (skills/splash/src/register-producers.ts imports this for its side effect). The
// scriptPath / skillDir / threadsChannel values are exactly what adapters.ts's SCRIPT /
// SKILL_DIR / CHANNEL_THREADED_PRODUCERS used to hard-code, now colocated with the engine.
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { registerProducer } from "../../../lib/core/registry";
import { nativeSpecErrors } from "./spec-to-config";
import { NATIVE_TYPES } from "./native-types";

const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

registerProducer({
  name: "chart-native",
  // The single-format CLI vocabulary chart-native's produce-from-spec.mjs accepts
  // (scrolly is owned by the scrolly engine and fails hard here — see adapters.ts header).
  formats: ["static", "interactive", "video"],
  types: NATIVE_TYPES.map((t) => ({
    id: t.id,
    ...(t.deferred ? { deferred: t.deferred } : {}),
  })),
  validate: nativeSpecErrors,
  execution: "subprocess",
  subprocess: {
    scriptPath: join(skillDir, "scripts/produce-from-spec.mjs"),
    skillDir,
    // A native chart renders at the channel's size/aspect (Slice 2): SPLASH_CHANNEL is threaded.
    threadsChannel: true,
  },
});
