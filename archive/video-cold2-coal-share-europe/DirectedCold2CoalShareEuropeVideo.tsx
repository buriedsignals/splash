/**
 * The Remotion composition: the live MapTiler map driven by the frame, `Cold2CoalShareEuropeFrame`'s overlay over it, drawn only
 * once the embedded faces are in.
 *
 * THE MAP IS MOUNTED ONCE AND DRIVEN IN NUMBERS: at every frame the camera jumps to `mapStateAt`'s and every bound
 * paint is set from the same state, then `useLiveMap` holds the frame until the map is idle with every tile loaded.
 * The plan reaches MapTiler only through the runner's local proxy (`mapPlanProxied`, written into the props file at
 * render time and never committed); with no proxied plan there is no map.
 */

import { AbsoluteFill, useCurrentFrame } from "remotion";
import { mountPlan } from "#shared/map-beat/mount.mjs";
import { bindState, viewOf } from "#shared/map-beat/scrolly.mjs";
import { transformStyle } from "#shared/map-beat/style.mjs";
import { useEmbeddedFaces } from "../../skills/map-beat/assets/embedded-faces";
import type { EmbeddedFace } from "../../skills/map-beat/assets/face-coverage";
import { type LiveMapPlan, type MountPlan, type TransformStyle, useLiveMap } from "../../skills/map-beat/assets/live-map";
import { Cold2CoalShareEuropeFrame, type Cold2CoalShareEuropeFrameProps } from "./Cold2CoalShareEuropeFrame";
import { mapStateAt } from "./scene.mjs";

type ProxiedPlan = LiveMapPlan & { styleUrl: string; tints: unknown; layers: Array<{ id: string; bindings?: Record<string, unknown> }> };

export type DirectedCold2CoalShareEuropeVideoProps = Cold2CoalShareEuropeFrameProps & {
  faces: EmbeddedFace[];
  /** The map plan with its MapTiler URLs pointed at the render's proxy — `null` when no render is running. */
  mapPlanProxied: ProxiedPlan | null;
};

function LiveMap(props: DirectedCold2CoalShareEuropeVideoProps & { plan: ProxiedPlan; at: number }) {
  const { plan } = props;
  const container = useLiveMap({
    plan,
    styleUrl: plan.styleUrl,
    tints: plan.tints,
    frame: props.at,
    mount: mountPlan as unknown as MountPlan,
    transform: transformStyle as unknown as TransformStyle,
    paint: (map, frame) => {
      const state = mapStateAt(props as never, frame);
      map.jumpTo(viewOf(state));
      for (const layer of plan.layers)
        for (const property in layer.bindings ?? {}) map.setPaintProperty(layer.id, property, bindState(layer.bindings?.[property], state), { validate: false });
    },
  });
  return <div ref={container} style={{ position: "absolute", inset: 0 }} />;
}

export function DirectedCold2CoalShareEuropeVideo(props: DirectedCold2CoalShareEuropeVideoProps) {
  const frame = useCurrentFrame();
  const { ready, ref } = useEmbeddedFaces<SVGSVGElement>(props.faces);
  return (
    <AbsoluteFill style={{ backgroundColor: props.colours?.ground }}>
      {ready ? <Cold2CoalShareEuropeFrame {...props} at={frame} liveMap={(at) => (props.mapPlanProxied ? <LiveMap {...props} plan={props.mapPlanProxied} at={at} /> : null)} svgRef={ref} /> : null}
    </AbsoluteFill>
  );
}
