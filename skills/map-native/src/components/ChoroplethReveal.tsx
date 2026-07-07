// ChoroplethReveal — Remotion composition for choropleth reveal.
// Follows the HarnessCheck harness: per-frame delayRender → setPaintProperty → map.once('idle') → continueRender.
// Regions reveal in ascending-value order (stagger by bin index), blank at frame 0.

import React, { useEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { computeChoropleth, type ChoroplethData } from "../choropleth-geo";
import {
  easedRevealProgress,
  revealFillOpacity,
  revealCameraPlan,
} from "../reveal";
import { resolveScene, TITLE_SCENE_FRAMES } from "../video-scene";
import { TitleCard } from "./StoryCards";
import { resolveMapFrame } from "../core/map-format";
import { MapFrame } from "../core/MapFrame";
import { NO_DATA_COLOR } from "../theme/colors";
import { legendTheme } from "../theme/legend-theme";
import { fmtBin } from "../core/legend-format";

maptilersdk.config.apiKey = process.env.REMOTION_MAPTILER_KEY as string;

const NUM_BINS = 5;

// A type alias (not an interface) so it is assignable to Remotion's
// `Props extends Record<string, unknown>` constraint on <Composition>.
export type ChoroplethRevealProps = {
  config: ChoroplethData & {
    title?: string;
    unit?: string;
    scaleType?: "sequential" | "diverging";
    palette?: string | string[];
  };
};

export const ChoroplethReveal: React.FC<ChoroplethRevealProps> = ({
  config,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  // This composition does not yet thread mapStyle/dark — the basemap is always
  // DATAVIZ.LIGHT (see the Map init below), so the legend always uses the light theme.
  const theme = legendTheme(false);
  const mapFrame = resolveMapFrame(width, height, {
    titleLines: 2,
    hasDescription: !!(config as any).description,
    legendHeight: NUM_BINS * 18 + 18,
  });
  const [mapState, setMapState] = useState<{
    map: InstanceType<typeof maptilersdk.Map>;
    bins: { min: number; max: number; color: string }[];
    numBins: number;
  } | null>(null);
  const [handle] = useState(() => delayRender("choropleth-reveal-init"));

  // Init map once — imperative, same pattern as HarnessCheck
  useEffect(() => {
    if (!ref.current || started.current) return;
    started.current = true;

    const m = new maptilersdk.Map({
      container: ref.current,
      style: maptilersdk.MapStyle.DATAVIZ.LIGHT,
      center: [10, 50] as [number, number],
      zoom: 3,
      interactive: false,
      attributionControl: false,
      navigationControl: false,
      geolocateControl: false,
      maptilerLogo: false,
      fadeDuration: 0,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    } as ConstructorParameters<typeof maptilersdk.Map>[0] & {
      canvasContextAttributes: unknown;
    });

    m.on("load", () => {
      // Remove symbol layers (labels)
      const layers = m.getStyle()?.layers ?? [];
      for (const layer of layers) {
        if (layer.type === "symbol") m.removeLayer(layer.id);
      }

      // Fetch world GeoJSON via Remotion staticFile (served from remotion/public/)
      fetch(staticFile("geo/world.geojson"))
        .then((r) => r.json())
        .then((worldGeoJson: GeoJSON.FeatureCollection) => {
          const layout = computeChoropleth(config, worldGeoJson, "iso_a3", {
            bins: NUM_BINS,
            scaleType: config.scaleType ?? "sequential",
            palette: config.palette,
          });

          // Enrich features with value + bin index (ascending order)
          const sortedBins = [...layout.bins].sort((a, b) => a.min - b.min);
          const coloredWorld: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: worldGeoJson.features.map((f, i) => {
              const joined = layout.joined[i];
              const binIdx =
                joined.value !== null
                  ? sortedBins.findIndex(
                      (b, bi) =>
                        joined.value! < b.max || bi === sortedBins.length - 1,
                    )
                  : -1;
              return {
                ...f,
                properties: {
                  ...f.properties,
                  __value: joined.value,
                  __hasData: joined.value !== null,
                  __binIdx: binIdx,
                },
              };
            }),
          };

          m.addSource("choropleth-world", {
            type: "geojson",
            data: coloredWorld,
          });

          // Build fill-color expression
          const colorExpr: unknown[] = [
            "case",
            ["==", ["get", "__hasData"], false],
            NO_DATA_COLOR,
          ];
          for (let i = 0; i < sortedBins.length - 1; i++) {
            colorExpr.push(["<", ["get", "__value"], sortedBins[i].max]);
            colorExpr.push(sortedBins[i].color);
          }
          colorExpr.push(sortedBins[sortedBins.length - 1].color);

          m.addLayer({
            id: "choropleth-fill",
            type: "fill",
            source: "choropleth-world",
            paint: {
              "fill-color": colorExpr as never,
              "fill-opacity": 0, // start blank
            },
          });

          m.addLayer({
            id: "choropleth-stroke",
            type: "line",
            source: "choropleth-world",
            paint: {
              "line-color": "#ffffff",
              "line-width": 0.5,
              "line-opacity": 0.6,
            },
          });

          const plan = revealCameraPlan(
            layout.bounds as [number, number, number, number],
          );
          m.fitBounds(plan.bounds, { padding: mapFrame.pad, duration: 0 });

          m.once("idle", () => {
            setMapState({ map: m, bins: sortedBins, numBins: NUM_BINS });
            continueRender(handle);
          });
        })
        .catch((err) => {
          console.error("ChoroplethReveal: failed to load world GeoJSON", err);
          continueRender(handle);
        });
    });
  }, [handle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scene: title card fades out, furniture fades in over the crossfade window.
  const scene = resolveScene(frame, { titleSceneEndFrame: TITLE_SCENE_FRAMES });

  // Legend — sequential/diverging bin scale (swatch + min–max) + unit label. Populated from
  // the same sortedBins used to build the fill-color expression above.
  useEffect(() => {
    const el = legendRef.current;
    if (!el || !mapState) return;
    const bins = mapState.bins;
    // Bins are evenly spaced (see computeChoropleth) — the width of any one bin IS the gap
    // between adjacent boundaries, giving fmtBin enough decimal precision for distinct labels.
    const minGap = bins.length ? bins[0].max - bins[0].min : undefined;
    const unit = config.unit ?? "";
    const header = `
      <div style="font:600 11px/1.2 sans-serif;color:${theme.ink};margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em">
        ${unit}
      </div>`;
    const swatches = bins
      .map(
        (b) => `
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
          <span style="display:inline-block;width:14px;height:14px;background:${b.color};border-radius:2px;box-shadow:0 0 0 1px ${theme.stroke};flex-shrink:0"></span>
          <span style="font:11px/1.2 sans-serif;color:${theme.sub}">${fmtBin(b.min, { minGap })}–${fmtBin(b.max, { minGap })}</span>
        </div>`,
      )
      .join("");
    el.innerHTML = header + swatches;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapState, theme]);

  // Per-frame update — drive fill-opacity reveal, gated by idle
  useEffect(() => {
    if (!mapState) return;
    const { map } = mapState;
    const h = delayRender(`choropleth-frame-${frame}`);

    const progress = easedRevealProgress(
      frame - TITLE_SCENE_FRAMES,
      durationInFrames - TITLE_SCENE_FRAMES,
    );
    // Only data-bearing regions are painted and animated. No-data regions are
    // NOT painted (opacity 0) — they show the default MapTiler basemap, exactly
    // like the ocean and like the symbol map's basemap. Nothing but the data
    // countries carries colour, and only they animate.
    map.setPaintProperty("choropleth-fill", "fill-opacity", [
      "case",
      ["==", ["get", "__hasData"], false],
      0, // no-data: unpainted → default basemap
      revealFillOpacity(progress), // data: ramps 0 → 0.85
    ] as never);
    map.once("idle", () => continueRender(h));
    map.triggerRepaint();
  }, [mapState, frame, durationInFrames]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#f4f4f4" }}>
      <style>{`.maplibregl-ctrl-bottom-left,.maplibregl-ctrl-bottom-right,.maplibregl-ctrl-attrib,.maptiler-logo{display:none!important}`}</style>
      <MapFrame
        title={(config as any).title ?? ""}
        description={(config as any).description}
        source={(config as any).source ?? { name: "" }}
        width={width}
        height={height}
        responsive={false}
        frame={mapFrame}
        furnitureOpacity={scene.furnitureOpacity}
      >
        <div ref={ref} style={{ width, height, position: "absolute" }} />
      </MapFrame>

      {/* Legend — bottom-right, fades in with the furniture */}
      <div
        ref={legendRef}
        data-testid="map-legend"
        style={{
          position: "absolute",
          bottom: 16,
          right: 16,
          zIndex: 10,
          background: theme.bg,
          padding: "10px 12px",
          borderRadius: 6,
          boxShadow: "0 1px 6px rgba(0,0,0,.12)",
          minWidth: 120,
          opacity: scene.furnitureOpacity,
          pointerEvents: "none",
        }}
      />

      {scene.titleOpacity > 0 && (config as any).title && (
        <TitleCard
          text={(config as any).title}
          description={(config as any).description}
          opacity={scene.titleOpacity}
        />
      )}
    </AbsoluteFill>
  );
};
