/**
 * The Remotion composition: `DotStripFrame` at the current frame, drawn only once the embedded faces are in,
 * every frame's words read back against those faces and the widths Bun measured (`useEmbeddedFaces`).
 */

import { AbsoluteFill, useCurrentFrame } from "remotion";
// Zone kit: the shared copies (`shared/chart-video/`, identical to the chart-video skill's assets) — the Remotion
// bundle resolves `#shared/*` from the root's package.json; a relative path into skills/ resolves only from proof/.
import { useEmbeddedFaces } from "#shared/chart-video/embedded-faces.ts";
import type { EmbeddedFace } from "#shared/chart-video/face-coverage.ts";
import { DotStripFrame, type DotStripFrameProps } from "./DotStripFrame";

export type DirectedDotStripVideoProps = DotStripFrameProps & { faces: EmbeddedFace[] };

export function DirectedDotStripVideo(props: DirectedDotStripVideoProps) {
  const frame = useCurrentFrame();
  const { ready, ref } = useEmbeddedFaces<SVGSVGElement>(props.faces);
  return <AbsoluteFill style={{ backgroundColor: props.colours?.ground }}>{ready ? <DotStripFrame {...props} at={frame} svgRef={ref} /> : null}</AbsoluteFill>;
}
