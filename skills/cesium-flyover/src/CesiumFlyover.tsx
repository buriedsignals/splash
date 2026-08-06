// 3D flyover — cinematic terrain video rendered with CesiumJS inside Remotion.
//
// WHY THIS SHAPE (the gotcha that costs a day if ignored): Cesium's globe does NOT draw in a
// standalone headless Chromium harness — the skybox renders, the globe emits zero draw commands
// and `globe.tilesLoaded` never turns true. It DOES draw when Remotion drives the frame loop,
// under four non-negotiables:
//   1. viewer.useDefaultRenderLoop = false        — we advance frames by hand
//   2. viewer.render() per tick, NEVER scene.render() — scene.render() skips frame-init, so tile
//      streaming never advances and the globe never appears. The single most important line.
//   3. contextOptions.webgl.preserveDrawingBuffer = true — or Remotion's screenshot is blank
//   4. delayRender() around init AND every frame, with a generous timeoutInMilliseconds — cold
//      tiles routinely exceed Remotion's default.
// The MapTiler key must be UNRESTRICTED: a domain-locked key 403s from headless Chrome.
//
// Cesium itself is loaded from its CDN at render time (see loadCesium) — it is NOT an npm
// dependency of this repo. That keeps ~40 MB of engine + assets out of the tree, at the price of
// a network requirement at render time (see SKILL notes on the local-first tradeoff).
//
// Camera math and the proven parameter values come from the 3d-flyover reference skill
// (Buried Signals); SKILL.md "What is proven here" records what has actually rendered in this
// repository, and output-proof/ holds the artefact.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AbsoluteFill,
  cancelRender,
  continueRender,
  delayRender,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  bearing,
  makePathWalker,
  smoothFlightPath,
  type LngLat,
} from "./flight-path";

export type FlyoverMode = "landscape" | "city";
export type { LngLat } from "./flight-path";

export type CesiumFlyoverConfig = {
  /** "landscape" = MapTiler terrain + satellite. "city" = Google Photorealistic 3D Tiles. */
  mode?: FlyoverMode;
  /** Camera route as [longitude, latitude][] — sparse, intentional control points. */
  path: LngLat[];
  /** Chaikin passes: 2 = tight corridor, 3 = default, 4 = softer. */
  pathSmoothingPasses?: number;
  /** Absolute altitudes in metres ASL (terrain-independent). */
  altitudeStart?: number;
  altitudeEnd?: number;
  /** Heading is aimed at a real point this far ahead on the path — smooths the heading. */
  lookAheadKm?: number;
  /** How far the camera travels. Speed = travelKm / durationInSeconds. */
  travelKm?: number;
  /** MapLibre-style pitch: 90 = level with the horizon. Converted to Cesium's convention. */
  pitchFromNadir?: number;
  verticalExaggeration?: number;
  /** City mode only — lower refines the mesh at real download cost. 4 hero, 6-8 wide. */
  maximumScreenSpaceError?: number;
  /** Optional headline burned into the frame. */
  title?: string;
  /** Optional source/credit line, alongside the provider attribution Cesium draws itself. */
  sourceName?: string;
};

const MAPTILER_KEY = process.env.REMOTION_MAPTILER_KEY;
const GOOGLE_MAPS_API_KEY = process.env.REMOTION_GOOGLE_MAPS_API_KEY;
const CESIUM_VERSION = "1.143";
const CESIUM_CDN = `https://cesium.com/downloads/cesiumjs/releases/${CESIUM_VERSION}/Build/Cesium/`;

// Helicopter lean into the turn. Bank is derived from the turn rate of the look-ahead bearing,
// so on a smoothed path it eases in and out instead of twitching.
const MAX_BANK = 0.13;
const BANK_GAIN = 0.6;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

const loadCesium = () =>
  new Promise<any>((resolve, reject) => {
    if ((window as any).Cesium) return resolve((window as any).Cesium);
    // CESIUM_BASE_URL must be set BEFORE the script is injected — Cesium reads it on load
    // to resolve its own workers and assets.
    (window as any).CESIUM_BASE_URL = CESIUM_CDN;
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = `${CESIUM_CDN}Widgets/widgets.css`;
    document.head.appendChild(css);
    const script = document.createElement("script");
    script.src = `${CESIUM_CDN}Cesium.js`;
    script.onload = () => resolve((window as any).Cesium);
    script.onerror = () =>
      reject(
        new Error(
          `Failed to load CesiumJS ${CESIUM_VERSION} from ${CESIUM_CDN}`,
        ),
      );
    document.head.appendChild(script);
  });

export const CesiumFlyover: React.FC<CesiumFlyoverConfig> = ({
  mode = "landscape",
  path,
  pathSmoothingPasses = 3,
  altitudeStart = 4600,
  altitudeEnd = 4300,
  lookAheadKm = 1.5,
  travelKm = 13,
  pitchFromNadir = 76,
  verticalExaggeration = 1.1,
  maximumScreenSpaceError = 8,
  title,
  sourceName,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const viewerRef = useRef<any>(null);
  const tilesetRef = useRef<any>(null);
  const frame = useCurrentFrame();
  const { durationInFrames, fps, width, height } = useVideoConfig();
  const [ready, setReady] = useState(false);
  const [handle] = useState(() =>
    delayRender(`cesium init: ${mode}`, { timeoutInMilliseconds: 120000 }),
  );
  const walker = useMemo(
    () => makePathWalker(smoothFlightPath(path, pathSmoothingPasses)),
    [path, pathSmoothingPasses],
  );

  const setCamera = (C: any, viewer: any, progress: number) => {
    // Walk the curve by arc length so ground speed stays constant.
    const maxTravel = Math.max(0, walker.lengthKm - lookAheadKm * 2);
    const cameraDistance = Math.min(travelKm, maxTravel) * progress;
    const camera = walker.along(cameraDistance);
    const aim = walker.along(cameraDistance + lookAheadKm);
    const aim2 = walker.along(cameraDistance + lookAheadKm * 2);
    const heading = bearing(camera, aim);
    let headingDelta = bearing(aim, aim2) - heading;
    while (headingDelta > Math.PI) headingDelta -= 2 * Math.PI;
    while (headingDelta < -Math.PI) headingDelta += 2 * Math.PI;
    viewer.camera.setView({
      destination: C.Cartesian3.fromDegrees(
        camera[0],
        camera[1],
        lerp(altitudeStart, altitudeEnd, progress),
      ),
      orientation: {
        heading,
        // Cesium pitch: 0 = horizon, negative = down (inverse of MapLibre).
        pitch: C.Math.toRadians(-(90 - pitchFromNadir)),
        roll: clamp(headingDelta * BANK_GAIN, -MAX_BANK, MAX_BANK),
      },
    });
  };

  const tilesAreLoaded = (viewer: any) => {
    if (mode === "landscape") return viewer.scene.globe.tilesLoaded;
    return Boolean(tilesetRef.current?.tilesLoaded);
  };

  // Frame-gating on REAL tile availability, bounded so a stuck tile cannot hang the render
  // (the same invariant map-native applies to MapLibre: settle OR give up, never wait forever).
  const settle = (viewer: any) =>
    new Promise<void>((resolve) => {
      let stable = 0;
      let ticks = 0;
      const tick = () => {
        viewer.render();
        ticks++;
        stable = tilesAreLoaded(viewer) ? stable + 1 : 0;
        if (stable > 8 || ticks > 600) {
          viewer.render();
          resolve();
        } else {
          setTimeout(tick, 8);
        }
      };
      tick();
    });

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      if (mode === "landscape" && !MAPTILER_KEY) {
        throw new Error(
          "Set REMOTION_MAPTILER_KEY (unrestricted key). Create one at https://cloud.maptiler.com/account/keys/",
        );
      }
      if (mode === "city" && !GOOGLE_MAPS_API_KEY) {
        throw new Error(
          "Set REMOTION_GOOGLE_MAPS_API_KEY. Create a Map Tiles API key at https://developers.google.com/maps/documentation/tile/get-api-key",
        );
      }
      // Google's Map Tiles policy allows promotional videos about the application only, capped
      // at 30 seconds and marked as such. This ceiling is enforced, not documented.
      if (mode === "city" && durationInFrames / fps > 30) {
        throw new Error(
          "Google Photorealistic 3D Tiles compositions must not exceed 30 seconds",
        );
      }

      const C = await loadCesium();
      const viewer = new C.Viewer(containerRef.current, {
        baseLayer: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        animation: false,
        timeline: false,
        fullscreenButton: false,
        infoBox: false,
        selectionIndicator: false,
        contextOptions: { webgl: { preserveDrawingBuffer: true } },
      });

      if (mode === "landscape") {
        viewer.imageryLayers.addImageryProvider(
          new C.UrlTemplateImageryProvider({
            url: `https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=${MAPTILER_KEY}`,
            maximumLevel: 20,
          }),
        );
        viewer.terrainProvider = await C.CesiumTerrainProvider.fromUrl(
          `https://api.maptiler.com/tiles/terrain-quantized-mesh-v2/?key=${MAPTILER_KEY}`,
          { requestVertexNormals: true },
        );
        viewer.creditDisplay.addStaticCredit(
          new C.Credit(
            '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a>',
            true,
          ),
        );
      }

      if (mode === "city") {
        // Never show both surfaces: the Google mesh replaces the globe entirely.
        viewer.scene.globe.show = false;
        const tileset = await C.Cesium3DTileset.fromUrl(
          `https://tile.googleapis.com/v1/3dtiles/root.json?key=${GOOGLE_MAPS_API_KEY}`,
          { showCreditsOnScreen: true, maximumScreenSpaceError },
        );
        viewer.scene.primitives.add(tileset);
        tilesetRef.current = tileset;
      }

      viewer.useDefaultRenderLoop = false;
      viewer.scene.skyAtmosphere.show = true;
      viewer.scene.fog.enabled = true;
      viewer.scene.globe.enableLighting = false;
      viewer.scene.verticalExaggeration = verticalExaggeration;
      (window as any).__SPLASH_FLYOVER__ = { C, mode };
      viewerRef.current = viewer;
      setCamera(C, viewer, 0);
      await settle(viewer);
      setReady(true);
      continueRender(handle);
    })().catch((error) => cancelRender(error));
  }, [durationInFrames, fps, handle, mode]);

  useEffect(() => {
    if (!ready) return;
    const frameHandle = delayRender(`cesium ${mode} frame ${frame}`, {
      timeoutInMilliseconds: 60000,
    });
    const C = (window as any).__SPLASH_FLYOVER__.C;
    const viewer = viewerRef.current;
    const progress = durationInFrames <= 1 ? 0 : frame / (durationInFrames - 1);
    setCamera(C, viewer, progress);
    settle(viewer).then(() => continueRender(frameHandle));
  }, [ready, frame, durationInFrames, mode]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <div ref={containerRef} style={{ width, height, position: "absolute" }} />
      {title ? (
        <div
          style={{
            position: "absolute",
            left: 40,
            top: 36,
            maxWidth: width * 0.7,
            color: "#ffffff",
            font: "700 44px/1.15 system-ui, sans-serif",
            textShadow: "0 2px 12px rgba(0,0,0,0.85)",
          }}
        >
          {title}
        </div>
      ) : null}
      {sourceName ? (
        <div
          style={{
            position: "absolute",
            left: 40,
            // Clear of Cesium's own credit strip, which is drawn at the very bottom of the
            // canvas and must stay visible and unobstructed.
            bottom: 56,
            color: "#ffffff",
            font: "500 20px/1.2 system-ui, sans-serif",
            textShadow: "0 1px 8px rgba(0,0,0,0.9)",
          }}
        >
          {sourceName}
        </div>
      ) : null}
      {mode === "city" ? (
        <div
          style={{
            position: "absolute",
            top: 20,
            right: 24,
            color: "white",
            font: "500 18px/1.2 sans-serif",
            textShadow: "0 1px 4px black",
          }}
        >
          For promotional purposes only
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
