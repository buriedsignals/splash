/**
 * The Remotion composition: `LocatorFrame` at the current frame, drawn only once the embedded faces are in,
 * every frame's words read back against those faces and the widths Bun measured (`useEmbeddedFaces`).
 */

import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useEmbeddedFaces } from "../../skills/map-beat/assets/embedded-faces";
import type { EmbeddedFace } from "../../skills/map-beat/assets/face-coverage";
import { LocatorFrame, type LocatorFrameProps } from "./LocatorFrame";

export type DirectedLocatorVideoProps = LocatorFrameProps & { faces: EmbeddedFace[] };

export function DirectedLocatorVideo(props: DirectedLocatorVideoProps) {
  const frame = useCurrentFrame();
  const { ready, ref } = useEmbeddedFaces<SVGSVGElement>(props.faces);
  return <AbsoluteFill style={{ backgroundColor: props.colours?.ground }}>{ready ? <LocatorFrame {...props} at={frame} svgRef={ref} /> : null}</AbsoluteFill>;
}
