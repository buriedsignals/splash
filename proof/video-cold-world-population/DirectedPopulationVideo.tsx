// The Remotion composition: `PopulationFrame` at the current frame, drawn only once the embedded faces are in.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useEmbeddedFaces } from "../../skills/chart-video/assets/embedded-faces";
import type { EmbeddedFace } from "../../skills/chart-video/assets/face-coverage";
import { PopulationFrame, type PopulationFrameProps } from "./PopulationFrame";

export type DirectedPopulationVideoProps = PopulationFrameProps & { faces: EmbeddedFace[] };

export function DirectedPopulationVideo(props: DirectedPopulationVideoProps) {
  const frame = useCurrentFrame();
  const { ready, ref } = useEmbeddedFaces<SVGSVGElement>(props.faces);
  return <AbsoluteFill style={{ backgroundColor: props.colours?.ground }}>{ready ? <PopulationFrame {...props} at={frame} svgRef={ref} /> : null}</AbsoluteFill>;
}
