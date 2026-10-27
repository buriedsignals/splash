// The Remotion entry point. `render-beat.mjs` hands this file to the CLI (through `_shared/video.mjs`).
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
