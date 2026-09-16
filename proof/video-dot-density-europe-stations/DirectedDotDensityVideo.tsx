/**
 * The Remotion composition: the live MapTiler map driven by the frame, and `DotFrame`'s overlay over it, drawn only once
 * the embedded faces are in, every frame's words read back against those faces and the widths Bun measured
 * (`useEmbeddedFaces`).
 *
 * THE MAP IS MOUNTED ONCE AND DRIVEN IN NUMBERS, as the scrolly pilot's scroll drives it: at every frame every bound
 * paint is set from `mapStateAt` (a paint already at its value is left alone by MapLibre), then `useLiveMap` holds the
 * frame until the map is idle with every tile loaded. The plan reaches MapTiler only through the runner's local proxy
 * (`mapPlanProxied`, written into the props file at render time and never committed); with no proxied plan there is no
 * map.
 */

import type maplibregl from "maplibre-gl";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { mountPlan } from "#shared/map-beat/mount.mjs";
import { bindState } from "#shared/map-beat/scrolly.mjs";
import { transformStyle } from "#shared/map-beat/style.mjs";
import { useEmbeddedFaces } from "../../skills/map-beat/assets/embedded-faces";
import type { EmbeddedFace } from "../../skills/map-beat/assets/face-coverage";
import {
  type LiveMapPlan,
  type MountPlan,
  type TransformStyle,
  useLiveMap,
} from "../../skills/map-beat/assets/live-map";
import { DotFrame, type DotFrameProps } from "./DotFrame";
import { mapStateAt } from "./scene.mjs";

type ProxiedPlan = LiveMapPlan & {
  styleUrl: string;
  tints: unknown;
  layers: Array<{ id: string; bindings?: Record<string, unknown> }>;
};

export type DirectedDotDensityVideoProps = DotFrameProps & {
  faces: EmbeddedFace[];
  /** The map plan with its MapTiler URLs pointed at the render's proxy — `null` when no render is running. */
  mapPlanProxied: ProxiedPlan | null;
};

function LiveDotMapOn(
  props: DirectedDotDensityVideoProps & { plan: ProxiedPlan; at: number },
) {
  const { plan } = props;
  const container = useLiveMap({
    plan,
    styleUrl: plan.styleUrl,
    tints: plan.tints,
    frame: props.at,
    mount: mountPlan as unknown as MountPlan,
    transform: transformStyle as unknown as TransformStyle,
    paint: (map: maplibregl.Map, frame: number) => {
      const state = mapStateAt(props as never, frame);
      for (const layer of plan.layers)
        for (const property in layer.bindings ?? {})
          map.setPaintProperty(
            layer.id,
            property,
            bindState(layer.bindings?.[property], state),
            { validate: false },
          );
    },
  });
  return <div ref={container} style={{ position: "absolute", inset: 0 }} />;
}

function LiveDotMap(props: DirectedDotDensityVideoProps & { at: number }) {
  if (!props.mapPlanProxied) return null;
  return <LiveDotMapOn {...props} plan={props.mapPlanProxied} />;
}

export function DirectedDotDensityVideo(props: DirectedDotDensityVideoProps) {
  const frame = useCurrentFrame();
  const { ready, ref } = useEmbeddedFaces<SVGSVGElement>(props.faces);
  return (
    <AbsoluteFill style={{ backgroundColor: props.colours?.ground }}>
      {ready ? (
        <DotFrame
          {...props}
          at={frame}
          liveMap={(at) => <LiveDotMap {...props} at={at} />}
          svgRef={ref}
        />
      ) : null}
    </AbsoluteFill>
  );
}
