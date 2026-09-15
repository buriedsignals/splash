// A LIVE MAP, MOUNTED ONCE, HELD STILL UNTIL EVERY FRAME IS PAINTED.
//
// Renderer A (spec §4.3, spike task-4-report.md): the plan's layers are mounted onto a real
// MapLibre map, drawn from a real MapTiler style and real tiles — not baked into a plate and
// replayed. The map is created once per composition instance, at the plan's own boot camera
// (`bootOptionsOf`): a fixed plan's `bounds` never moves after that (`fitBoundsOptions: { animate:
// false }`); a moving-camera plan's `view` is only the first frame's position, and every frame after
// the first calls the caller's `paint(map, frame)`, which is free to `jumpTo` a new camera as well as
// change paint/layout properties. A fixed plan is measured pixel-identical to the baked still (to
// rounding) under `--gl=swangle` — the software rasteriser that render is MANDATED to use
// (`render-video-map.mjs` passes it on every spawn); the GPU path (`--gl=angle`) is faster but
// introduces anti-aliasing noise a still-comparison guard cannot tolerate, and is not deterministic
// across two runs the way swangle measured.
//
// A frame is only released once `settleFrame` sees BOTH an idle map AND every tile loaded
// (`areTilesLoaded()`) — MapLibre can go idle with a tile still in flight, and releasing that frame to
// Remotion bakes the half-loaded tile into the output.
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
 *  `style`, …) is opaque to this file and handled entirely by the injected `mount`. A `view` boots a
 *  moving camera at its first center/zoom, ready for `paint(map, frame)` to `jumpTo` on every later
 *  frame; a `bounds` boots a fixed camera framed once and never moved. */
export interface LiveMapPlan {
  camera: {
    bounds?: maplibregl.LngLatBoundsLike;
    view?: { center: [number, number]; zoom: number };
  };
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

/** The map constructor's boot options for `plan.camera`: a moving-camera plan's `view` wins over a
 *  fixed plan's `bounds` (a plan can carry both while migrating), boots the fixed plan unanimated and
 *  unpadded (matching the baked plate's own framing), and refuses a plan with neither. */
export function bootOptionsOf(plan: LiveMapPlan) {
  const camera = plan.camera as {
    view?: { center: [number, number]; zoom: number };
    bounds?: maplibregl.LngLatBoundsLike;
  };
  if (camera?.view)
    return { center: camera.view.center, zoom: camera.view.zoom };
  if (camera?.bounds)
    return {
      bounds: camera.bounds,
      fitBoundsOptions: { padding: 0 as const, animate: false as const },
    };
  throw new Error("a live map plan needs camera.view or camera.bounds");
}

/** Waits for the map to go idle, and while a tile is still loading waits for idle again — up to
 *  `attempts` times — before refusing to release the frame. A frame handed to Remotion with a tile
 *  still in flight bakes a half-loaded tile into the output; better to fail the render than ship
 *  that. */
export async function settleFrame(
  map: Pick<maplibregl.Map, "once" | "triggerRepaint" | "areTilesLoaded">,
  { attempts = 5 } = {},
): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    await new Promise<void>((resolve) => {
      map.once("idle", () => resolve());
      map.triggerRepaint();
    });
    if (map.areTilesLoaded()) return;
  }
  throw new Error("a frame was released with a tile still loading");
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
        ...bootOptionsOf(plan),
      });
      map.on("error", (e) => cancelRender(sanitizedError(e?.error ?? e)));
      await new Promise<void>((resolve) =>
        map.once("style.load", () => resolve()),
      );
      map.setProjection({ type: "mercator" });
      mount(map, plan);
      await settleFrame(map);
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
    settleFrame(map)
      .then(() => {
        continueRender(handle);
        if (!booted.current) {
          booted.current = true;
          continueRender(boot);
        }
      })
      .catch((err) => cancelRender(sanitizedError(err)));
  }, [frame, ready]);

  return container;
}
