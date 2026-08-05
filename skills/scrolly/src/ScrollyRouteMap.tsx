// ScrollyRouteMap — the browser scrolly for a ROUTE, driven by a `currentStep` prop.
//
// THE HOLE THIS CLOSES. Every other map type had a browser scrolly (six components); a route had
// none, so `MAP_SCROLLY_TYPES` refused one by name and a journalist with a trajectory to tell
// could produce a video of it but never a page a reader scrolls. `resolveRouteWalk` already
// produced, per step, the territory + camera + confirmed text — the walk existed, it just had no
// browser renderer to consume it.
//
// SCROLL-DRIVEN, NOT FRAME-DRIVEN, and that is the whole difference from RouteScrolly.tsx (the
// Remotion sibling this ports): there is no per-frame ramp to interpolate, so a step is a TARGET
// STATE — draw the route to this step's stop, fly there, highlight this step's territory — and
// MapLibre's own flight animates between them. Everything upstream (layout, walk, the step
// sequence and its sentinel refs) is SHARED with the video family rather than re-derived, which
// is the rule route-story.ts's own header sets out: one walk, computed once, threaded to every
// consumer, so a caption and a camera can never follow different orders.

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import * as turf from "@turf/turf";
import { flyToBeat } from "./scrolly-camera";
import {
  computeRouteReveal,
  resolveMapStyle,
  type RouteConfig,
  type RouteRevealLayout,
} from "../../map-native/src/route-geo";
import { resolveRouteWalk } from "../../map-native/src/route-story";
import { decodeWorldGeometry } from "./world-geometry";
import type { MapArcBeat } from "../../map-native/src/map-story";

// ---------------------------------------------------------------------------
// Key guard — fail fast, never log the key. Mirrors every sibling in this folder.
// ---------------------------------------------------------------------------
if (!import.meta.env.VITE_MAPTILER_KEY)
  throw new Error("VITE_MAPTILER_KEY missing");
maptilersdk.config.apiKey = import.meta.env.VITE_MAPTILER_KEY as string;

// Layer ids — stable, so a smoke gate can target them the way it targets the siblings'.
const ROUTE_BG_LAYER = "route-bg"; // the whole trajectory, faint: the reader sees where it goes
const ROUTE_LINE_LAYER = "route-line"; // the drawn portion
const TERRITORY_FILL_LAYER = "route-territory-fill";
const TERRITORY_LINE_LAYER = "route-territory-line";

const DIM_FILL_OPACITY = 0.08;
const ACTIVE_FILL_OPACITY = 0.35;

export interface ScrollyRouteConfig extends RouteConfig {
  type: "route";
  title?: string;
  description?: string;
  insight?: string;
  source?: { name: string; url: string };
  lang?: string;
  mapStyle?: string;
  brandHue?: string;
  brandPalette?: string[];
  /** The journalist's confirmed walk, anchored on territory keys — resolved ONCE into the shared
   *  walk below and threaded to captions (Scrolly.tsx) and camera/highlight (here) alike. */
  arcBeats?: MapArcBeat[];
}

interface CameraPoint {
  center: [number, number];
  zoom: number;
}

interface RouteMapState {
  map: InstanceType<typeof maptilersdk.Map>;
  /** Indexed by TERRITORY (0..N-1) — the two framing refs use `framingCamera`. */
  cameras: (CameraPoint | null)[];
  /** The whole-route frame, shown on the overview and the takeaway. */
  framingCamera: CameraPoint | null;
}

export const ScrollyRouteMap: React.FC<{
  config: ScrollyRouteConfig;
  currentStep: number;
}> = ({ config, currentStep }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const [mapState, setMapState] = useState<RouteMapState | null>(null);

  const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark";
  const routeInk = config.brandHue ?? (dark ? "#7dd3fc" : "#0b6fa4");
  const territoryInk = dark ? "#f4f4f5" : "#1a1a1a";

  // Layout + walk + line — derived ONCE (turf geometry is heavy) and shared with the caption
  // side, never re-derived per step.
  const { layout, walk, line, lineKm, world } = useMemo(() => {
    const w = decodeWorldGeometry(config.geometry, "route");
    const l: RouteRevealLayout = computeRouteReveal(config, w);
    const ln = turf.lineString(l.route);
    return {
      layout: l,
      walk: resolveRouteWalk(l, config.arcBeats),
      line: ln,
      lineKm: turf.length(ln, { units: "kilometers" }),
      world: w,
    };
  }, [config]);

  /**
   * ★ THE PROP IS A BEAT **REF**, NOT A STEP INDEX — the contract Scrolly.tsx passes every map
   * scrolly (`currentStep={currentBeatRef}`), and routeStoryToChapters' sentinels are what make
   * it readable: `-1` is the overview, `walk.length` is the takeaway, and `0..N-1` are the
   * territories. Reading it as a step index (which is what this component did first) collapses
   * the overview onto the first territory and makes the camera never move — the reduced-motion
   * guard refused the build by name for exactly that, before any of it reached a reader.
   */
  const isOverview = (ref: number) => ref === -1;
  const isTakeaway = (ref: number) => ref >= walk.length;

  /**
   * HOW FAR THE ROUTE IS DRAWN at a given ref — the one rule the camera and the line both read.
   *
   * The overview draws nothing: the reader is shown WHERE before being shown the journey. The
   * takeaway draws it all. A territory ref draws up to the NEXT territory's entry — the portion
   * of the journey this step covers.
   *
   * A CONFIRMED ARC draws the whole route from its first step, and that is not a shortcut — it
   * is the same decision RouteScrolly.tsx documents and for the same reason: a confirmed walk
   * follows the JOURNALIST'S order, which the physical line has no progress to animate along.
   * Once their argument begins, the trajectory is a given and each step pans to the territory
   * they named. Drawing "progress" in an order the line does not have would be a lie the reader
   * could see.
   */
  const revealAt = (ref: number): number => {
    if (isOverview(ref)) return 0;
    if (isTakeaway(ref)) return 1;
    const k = Math.max(0, Math.min(ref, walk.length - 1));
    if (walk[k]?.camera) return 1;
    return k + 1 < walk.length ? walk[k + 1].territory.stop : 1;
  };

  const territoryFeatures = (key: string): GeoJSON.Feature[] =>
    world.features.filter(
      (f) => String(f.properties?.iso_a3 ?? f.properties?.name ?? "") === key,
    ) as GeoJSON.Feature[];

  // ---------------------------------------------------------------------------
  // Init ONCE — ref guard against React Strict Mode's double-invoke, like the siblings.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current || startedRef.current) return;
    startedRef.current = true;

    const map = new maptilersdk.Map({
      container: containerRef.current,
      style: dark
        ? maptilersdk.MapStyle.DATAVIZ.DARK
        : maptilersdk.MapStyle.DATAVIZ.LIGHT,
      center: [
        (layout.bounds[0] + layout.bounds[2]) / 2,
        (layout.bounds[1] + layout.bounds[3]) / 2,
      ] as [number, number],
      zoom: 3,
      // Navigation fully disabled: the SCROLL drives the camera. Same posture as every sibling —
      // a reader who can also drag ends up somewhere the prose is not talking about.
      interactive: true,
      dragPan: false,
      scrollZoom: false,
      doubleClickZoom: false,
      touchZoomRotate: false,
      dragRotate: false,
      boxZoom: false,
      keyboard: false,
      attributionControl: {},
      navigationControl: false,
      geolocateControl: false,
      maptilerLogo: false,
      fadeDuration: 0,
    } as ConstructorParameters<typeof maptilersdk.Map>[0]);

    (window as unknown as Record<string, unknown>)["__map__"] = map;

    map.on("load", () => {
      // Every crossed territory, outlined from the start and filled only when its step arrives:
      // the reader can see the whole path's extent before the journey walks it.
      map.addSource("route-territories", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: layout.territories.flatMap((t) =>
            territoryFeatures(t.key).map((f) => ({
              ...f,
              properties: { ...f.properties, __key: t.key, __active: false },
            })),
          ),
        },
      });
      map.addLayer({
        id: TERRITORY_FILL_LAYER,
        type: "fill",
        source: "route-territories",
        paint: {
          "fill-color": routeInk,
          "fill-opacity": DIM_FILL_OPACITY,
        },
      });
      map.addLayer({
        id: TERRITORY_LINE_LAYER,
        type: "line",
        source: "route-territories",
        paint: {
          "line-color": territoryInk,
          "line-width": 0.6,
          "line-opacity": 0.35,
        },
      });

      // The full trajectory, faint — then the drawn portion on top of it.
      map.addSource("route-bg", { type: "geojson", data: line as never });
      map.addLayer({
        id: ROUTE_BG_LAYER,
        type: "line",
        source: "route-bg",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": routeInk,
          "line-width": 2,
          "line-opacity": 0.2,
        },
      });

      map.addSource("route-drawn", {
        type: "geojson",
        data: turf.lineSliceAlong(line, 0, 0.001) as never,
      });
      map.addLayer({
        id: ROUTE_LINE_LAYER,
        type: "line",
        source: "route-drawn",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": routeInk,
          "line-width": 4,
          "line-opacity": 0.95,
        },
      });

      // One camera per STEP, solved before any flight so a step never waits on geometry.
      // The rule mirrors RouteScrolly's stepSolutions exactly: a confirmed step frames its own
      // named territory; an unconfirmed one frames what has been drawn so far together with the
      // territory being entered; the framing steps take the whole route.
      const solve = (
        b: [number, number, number, number],
      ): CameraPoint | null => {
        const r = map.cameraForBounds(b as maptilersdk.LngLatBoundsLike, {
          padding: 64,
        });
        if (!r || !r.center) return null;
        const c = maptilersdk.LngLat.convert(r.center);
        return { center: [c.lng, c.lat], zoom: r.zoom ?? 2 };
      };
      // Keyed by REF, not by step index — see the sentinel note above. Index 0..N-1 are the
      // territories; the two framing refs are resolved by the reader below, since -1 cannot be
      // an array index.
      const cameras: (CameraPoint | null)[] = walk.map((w) => {
        if (w.camera) return solve(w.camera);
        // A DRAW step frames the territory it enters — its own footprint, not the cumulative
        // "everything drawn so far" extent the video family uses.
        //
        // Divergence from RouteScrolly.tsx, and deliberate. In a video the camera pulls back over
        // a cumulative extent while the line visibly draws, and the clock guarantees the reader
        // perceives motion. In a SCROLL the reader sets the pace: a step whose camera barely
        // moves reads as a page that failed to respond. It also makes the two paths agree — a
        // CONFIRMED step already frames its own named territory (routeArcCamera), and now an
        // unconfirmed one does too, so the walk does not change shape depending on whether a
        // journalist wrote it.
        const own = territoryFeatures(w.territory.key);
        if (!own.length) return solve(layout.bounds);
        return solve(
          turf.bbox(turf.featureCollection(own)) as [
            number,
            number,
            number,
            number,
          ],
        );
      });
      const framingCamera = solve(layout.bounds);

      const cam0 = framingCamera;
      if (cam0) map.jumpTo({ center: cam0.center, zoom: cam0.zoom });
      else
        map.fitBounds(layout.bounds as maptilersdk.LngLatBoundsLike, {
          padding: 48,
          duration: 0,
        });

      setMapState({ map, cameras, framingCamera });
    });

    return () => {
      map.remove();
      startedRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // On step change — draw to this step's stop, highlight its territory, fly there.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapState) return;
    const { map, cameras, framingCamera } = mapState;
    const ref = currentStep;

    (window as unknown as Record<string, unknown>)["__scrolly_step__"] = ref;

    const drawnKm = Math.max(0.001, lineKm * revealAt(ref));
    (
      map.getSource("route-drawn") as maptilersdk.GeoJSONSource | undefined
    )?.setData(turf.lineSliceAlong(line, 0, drawnKm) as never);

    // The active territory is the one this step is ABOUT — none on the two framing refs, so the
    // overview shows the whole extent without pretending to be about one country.
    const onTerritory = !isOverview(ref) && !isTakeaway(ref);
    const k = Math.max(0, Math.min(ref, walk.length - 1));
    const activeKey = onTerritory ? walk[k]?.territory.key ?? null : null;
    (
      map.getSource("route-territories") as maptilersdk.GeoJSONSource | undefined
    )?.setData({
      type: "FeatureCollection",
      features: layout.territories.flatMap((t) =>
        territoryFeatures(t.key).map((f) => ({
          ...f,
          properties: {
            ...f.properties,
            __key: t.key,
            __active: t.key === activeKey,
          },
        })),
      ),
    } as never);
    map.setPaintProperty(TERRITORY_FILL_LAYER, "fill-opacity", [
      "case",
      ["==", ["get", "__active"], true],
      ACTIVE_FILL_OPACITY,
      DIM_FILL_OPACITY,
    ] as never);

    const cam = onTerritory ? cameras[k] : framingCamera;
    if (cam) flyToBeat(map, cam);
  }, [mapState, currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      data-testid="scrolly-route-map"
      style={{ width: "100%", height: "100%" }}
    />
  );
};
