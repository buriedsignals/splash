// The Remotion composition: `WorldPopulationFrame` at the current frame, drawn only once the embedded faces are in.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useEmbeddedFaces } from "../../skills/chart-video/assets/embedded-faces";
import type { EmbeddedFace } from "../../skills/chart-video/assets/face-coverage";
import { WorldPopulationFrame, type WorldPopulationFrameProps } from "./WorldPopulationFrame";

export type DirectedWorldPopulationVideoProps = WorldPopulationFrameProps & { faces: EmbeddedFace[] };

export function DirectedWorldPopulationVideo(props: DirectedWorldPopulationVideoProps) {
  const frame = useCurrentFrame();
  const { ready, ref } = useEmbeddedFaces<SVGSVGElement>(props.faces);
  return <AbsoluteFill style={{ backgroundColor: props.colours?.ground }}>{ready ? <WorldPopulationFrame {...props} at={frame} svgRef={ref} /> : null}</AbsoluteFill>;
}
