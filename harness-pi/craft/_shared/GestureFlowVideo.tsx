/** The flow family's Remotion composition: the frame at the current frame, once the embedded faces are in. */
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useEmbeddedFaces } from "#shared/chart-video/embedded-faces.ts";
import { GestureFlowFrame } from "./GestureFlowFrame.tsx";

export function GestureFlowVideo(props: any) {
  const frame = useCurrentFrame();
  const { ready, ref } = useEmbeddedFaces<SVGSVGElement>(props.faces);
  return <AbsoluteFill style={{ backgroundColor: props.colours?.ground }}>{ready ? <GestureFlowFrame {...props} at={frame} svgRef={ref} /> : null}</AbsoluteFill>;
}
