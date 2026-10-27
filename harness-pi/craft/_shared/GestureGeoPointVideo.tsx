/**
 * The Remotion composition of the point-map gesture video: `GestureGeoPointFrame` at the current frame, drawn only
 * once the embedded faces are in and the baked plate has decoded (a frame must never be released on a blank map).
 */
import { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from "remotion";
import { useEmbeddedFaces } from "#shared/chart-video/embedded-faces.ts";
import type { EmbeddedFace } from "#shared/chart-video/face-coverage.ts";
import { GestureGeoPointFrame, type GestureGeoPointFrameProps } from "./GestureGeoPointFrame.tsx";

export type GestureGeoPointVideoProps = GestureGeoPointFrameProps & { faces: EmbeddedFace[] };

export function GestureGeoPointVideo(props: GestureGeoPointVideoProps) {
  const frame = useCurrentFrame();
  const { ready, ref } = useEmbeddedFaces<SVGSVGElement>(props.faces);
  const [plate] = useState(() => delayRender("the baked plate decodes"));
  const [decoded, setDecoded] = useState(false);
  useEffect(() => {
    const href = props.geometry?.plate;
    if (!href) {
      setDecoded(true);
      continueRender(plate);
      return;
    }
    const img = new Image();
    img.onload = img.onerror = () => {
      setDecoded(true);
      continueRender(plate);
    };
    img.src = href;
  }, []);
  return <AbsoluteFill style={{ backgroundColor: props.colours?.water }}>{ready && decoded ? <GestureGeoPointFrame {...props} at={frame} svgRef={ref} /> : null}</AbsoluteFill>;
}
