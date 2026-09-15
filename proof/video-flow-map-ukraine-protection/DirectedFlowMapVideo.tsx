/**
 * The Remotion composition: the live MapTiler map driven by the frame, and `FlowFrame`'s overlay over it, drawn only
 * once the embedded faces are in, every frame's words read back against those faces and the widths Bun measured
 * (`useEmbeddedFaces`).
 *
 * THE MAP IS MOUNTED ONCE AND DRIVEN IN NUMBERS, as the scrolly pilot's scroll drives it: at every frame every bound
 * paint is set from `mapStateAt`, then `useLiveMap` holds the frame until the map is idle with every tile loaded. The
 * plan reaches MapTiler only through the runner's local proxy (`mapPlanProxied`, written into the props file at render
 * time and never committed); with no proxied plan there is no map.
 *
 * THE TRACE: each band's line is its own GeoJSON source; when a band's drawn share changes, its arc cut at that share
 * (`arcAt`) is handed to the source (`setData`). A GeoJSON source counts as loading until the worker has re-tiled it,
 * so the frame is not released with the previous line.
 */

import type maplibregl from "maplibre-gl";
import { useRef } from "react";
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
import { FlowFrame, type FlowFrameProps } from "./FlowFrame";
import { arcAt, mapStateAt } from "./scene.mjs";

type PlanLayer = {
  id: string;
  bindings?: Record<string, unknown>;
  data?: { features: Array<{ geometry: { coordinates: number[][] } }> };
  cumulative?: number[];
};

type ProxiedPlan = LiveMapPlan & {
  styleUrl: string;
  tints: unknown;
  layers: PlanLayer[];
};

export type DirectedFlowMapVideoProps = FlowFrameProps & {
  faces: EmbeddedFace[];
  /** The map plan with its MapTiler URLs pointed at the render's proxy — `null` when no render is running. */
  mapPlanProxied: ProxiedPlan | null;
};

const BAND = "band-";

function LiveFlowMapOn(
  props: DirectedFlowMapVideoProps & { plan: ProxiedPlan; at: number },
) {
  const { plan } = props;
  /** The drawn share each band's source holds — the full arc as mounted. */
  const held = useRef(new Map<string, number>());
  const container = useLiveMap({
    plan,
    styleUrl: plan.styleUrl,
    tints: plan.tints,
    frame: props.at,
    mount: mountPlan as unknown as MountPlan,
    transform: transformStyle as unknown as TransformStyle,
    paint: (map: maplibregl.Map, frame: number) => {
      const state = mapStateAt(props as never, frame) as Record<string, number>;
      for (const layer of plan.layers) {
        for (const property in layer.bindings ?? {})
          map.setPaintProperty(
            layer.id,
            property,
            bindState(layer.bindings?.[property], state),
            { validate: false },
          );
        if (!layer.id.startsWith(BAND)) continue;
        const t = state[`drawn${layer.id.slice(BAND.length)}`];
        if ((held.current.get(layer.id) ?? 1) === t) continue;
        const line = arcAt(
          layer.data!.features[0].geometry.coordinates,
          layer.cumulative!,
          t,
        );
        (map.getSource(layer.id) as maplibregl.GeoJSONSource).setData({
          type: "FeatureCollection",
          features:
            line.length < 2
              ? []
              : [
                  {
                    type: "Feature",
                    properties: {},
                    geometry: { type: "LineString", coordinates: line },
                  },
                ],
        });
        held.current.set(layer.id, t);
      }
    },
  });
  return <div ref={container} style={{ position: "absolute", inset: 0 }} />;
}

function LiveFlowMap(props: DirectedFlowMapVideoProps & { at: number }) {
  if (!props.mapPlanProxied) return null;
  return <LiveFlowMapOn {...props} plan={props.mapPlanProxied} />;
}

export function DirectedFlowMapVideo(props: DirectedFlowMapVideoProps) {
  const frame = useCurrentFrame();
  const { ready, ref } = useEmbeddedFaces<SVGSVGElement>(props.faces);
  return (
    <AbsoluteFill style={{ backgroundColor: props.colours?.ground }}>
      {ready ? (
        <FlowFrame
          {...props}
          at={frame}
          liveMap={(at) => <LiveFlowMap {...props} at={at} />}
          svgRef={ref}
        />
      ) : null}
    </AbsoluteFill>
  );
}
