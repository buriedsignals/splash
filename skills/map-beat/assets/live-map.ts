// A LIVE MAP, MOUNTED ONCE, HELD STILL UNTIL EVERY FRAME IS PAINTED.
//
// Renderer A (spec §4.3, spike task-4-report.md): the plan's layers are mounted onto a real
// MapLibre map, drawn from a real MapTiler style and real tiles — not baked into a plate and
// replayed. The map is created once per composition instance, at the plan's own camera; the camera
// never moves after that (`fitBoundsOptions: { animate: false }`), and every frame after the first
// calls the caller's `paint(map, frame)` to change paint/layout properties only. Measured pixel-
// identical to the baked still (to rounding) under `--gl=swangle` — the software rasteriser that
// render is MANDATED to use (`render-video-map.mjs` passes it on every spawn); the GPU path
// (`--gl=angle`) is faster but introduces anti-aliasing noise a still-comparison guard cannot
// tolerate, and is not deterministic across two runs the way swangle measured.
//
// `mount` and `transform` are injected rather than imported from `#shared/map-beat/*`: a skill asset
// may not import out of its own skill (`no-cross-skill-imports.test.ts`), so the proof composition —
// which has already imported `mountPlan` and `transformStyle` from the shared tree — hands them in
// as props instead.
//
// `styleUrl` is expected to resolve through the local MapTiler proxy (`maptiler-proxy.mjs`): the
// fetched style document's `glyphs` field has therefore already had its key stripped by the proxy,
// so it is reused as-is rather than rebuilt here.

import { useEffect, useRef, useState } from "react";
import { cancelRender, continueRender, delayRender } from "remotion";
import maplibregl from "maplibre-gl";

/** The plan this file needs to know about, and nothing more — the rest of a real plan (`layers`,
 *  `style`, …) is opaque to this file and handled entirely by the injected `mount`. */
export interface LiveMapPlan {
  camera: { bounds: maplibregl.LngLatBoundsLike };
  [key: string]: unknown;
}

export type MountPlan = (map: maplibregl.Map, plan: LiveMapPlan) => void;

export type TransformStyle = (
  styleDoc: unknown,
  options: { tints: unknown; glyphs: unknown; keepLabels: RegExp[] },
) => maplibregl.StyleSpecification;

/** A render this long past the boot's own timeout is already past `render-video-map.mjs`'s
 *  `--timeout=180000` for the whole frame, so a handle held longer than that only delays a failure
 *  that has already happened. */
const HANDLE_TIMEOUT_MS = 170_000;

/** Strips the query string off every URL-shaped run of text in `message`, so an error that quotes a
 *  MapTiler request URL — the proxy's own upstream fetch failure can do exactly that — never carries
 *  a key into a saved render log. */
function withoutQueryStrings(message: string): string {
  return message.replace(/(https?:\/\/[^\s"')]+?)\?[^\s"')]*/g, "$1");
}

function sanitizedError(err: unknown): Error {
  const message = err instanceof Error ? err.message : String(err);
  return new Error(withoutQueryStrings(message));
}

function waitIdle(map: maplibregl.Map): Promise<void> {
  return new Promise((resolve) => {
    map.once("idle", () => resolve());
    map.triggerRepaint();
  });
}

export function useLiveMap({
  plan,
  styleUrl,
  tints,
  frame,
  paint,
  mount,
  transform,
}: {
  plan: LiveMapPlan;
  styleUrl: string;
  tints: unknown;
  frame: number;
  paint: (map: maplibregl.Map, frame: number) => void;
  mount: MountPlan;
  transform: TransformStyle;
}) {
  // `RefObject<HTMLDivElement | null>` — React 19's own type for a container ref created with a
  // `null` initial value (`useRef`'s `T | null` overload); the composition hands this straight to a
  // `<div ref={...}>`, which accepts exactly this shape.
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [boot] = useState(() =>
    delayRender("map boot", { timeoutInMilliseconds: HANDLE_TIMEOUT_MS }),
  );
  const booted = useRef(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(styleUrl);
      const doc = await res.json();
      const style = transform(doc, {
        tints,
        glyphs: doc.glyphs,
        keepLabels: [],
      });
      style.transition = { duration: 0, delay: 0 };
      const map = new maplibregl.Map({
        container: container.current!,
        style,
        interactive: false,
        attributionControl: false,
        fadeDuration: 0,
        preserveDrawingBuffer: true,
        bounds: plan.camera.bounds,
        fitBoundsOptions: { padding: 0, animate: false },
      });
      map.on("error", (e) => cancelRender(sanitizedError(e?.error ?? e)));
      await new Promise<void>((resolve) =>
        map.once("style.load", () => resolve()),
      );
      mount(map, plan);
      await waitIdle(map);
      mapRef.current = map;
      setReady(true);
    })().catch((err) => cancelRender(sanitizedError(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const handle = delayRender(`frame ${frame}`, {
      timeoutInMilliseconds: HANDLE_TIMEOUT_MS,
    });
    paint(map, frame);
    waitIdle(map).then(() => {
      continueRender(handle);
      if (!booted.current) {
        booted.current = true;
        continueRender(boot);
      }
    });
  }, [frame, ready]);

  return container;
}
