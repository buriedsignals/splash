# Channel-driven format — Slice 2 (producer rendering) — design

**Status:** approved direction (Rémy chose "Slice 2"). Extends the Slice-1 decision layer
(`2026-07-08-channel-driven-format-export-design.md`). Slice 1 made the channel authoritative at the
DECISION level; Slice 2 makes the PRODUCERS actually render at the channel's size + aspect.

**Goal:** a produced deliverable's pixel size/aspect matches its confirmed channel — social-vertical →
**true 9:16 (1080×1920)**, social-feed → square (1080×1080), article-web → landscape — for static, video,
and interactive; render ONLY the channel's aspect (not all three); and fail-hard if the rendered aspect
doesn't match the channel.

## Problem (from the Slice-2 grounding)

- The channel table already declares social-vertical = **9:16 / 1080×1920**, but the native video
  producers only ship a **4:5 / 1080×1350 "portrait"** — and **4:5 maps to no channel at all**.
- `AcceptedProposal.channel` is **dropped at the adapter boundary** (`adapters.ts:185-188` passes only
  spec/outDir/format) — it reaches no producer script today. So nothing sizes by channel.
- Producers render ALL aspects unconditionally (chart video triple `produce.mjs:136-140`; map
  `VIDEO_COMPS`); the aspect is hand-picked at EXPORT. Static is baked at a fixed 840×480 (chart) /
  1280×720 (map). No render-time check that output aspect == channel.

## Design

### 1. 9:16 = repoint, not a 4th aspect
Since no channel targets 4:5, change the existing native **Portrait** compositions' `height 1350 → 1920`
(chart-native `remotion/src/Root.tsx`, 41 comps; map-native, 43 comps). `core/format.ts resolveFrame`
already centers the plot into a band on tall canvases (`if availH>idealH: pad grows`), so the content
math holds; a `scale`/`plotAspect` tuning pass makes row-heavy types read well at 9:16. Drop 4:5 (no
consumer). The comp id stays `…Portrait`; only the height (and maybe `scale`) changes → no registry/drift
break (no drift test enumerates comp dims). dw-chart's static portrait is ALREADY 1080×1920 (reference).

### 2. Thread `channel` through the producer chain (the plumbing)
Per producer: `adapters.ts` (add channel to the dispatched argv/env) → `produce-from-spec.mjs` (forward)
→ `produce.mjs` (accept a `channel` arg). No schema change — `AcceptedProposal.channel` already exists;
it's dropped, so we stop dropping it.

### 3. Render ONLY the channel's aspect
`produce.mjs` gates on the channel's aspect (`CHANNELS[channel].aspect`):
- **Video:** select the single comp whose aspect matches (portrait→the 9:16 comp, etc.) instead of the
  unconditional triple. Cuts render cost from 3 mp4s to 1 — offsets the taller 9:16 render.
- **Static/interactive:** size the one Vite build to the channel via a build-time define
  (`__MEDIA_W__`/`__MEDIA_H__` in `vite.config.ts`) read at `mount.tsx:166` (the injected-config render
  path — the ~40 per-type literals below it render committed SAMPLES, not the produce path).

### 4. Fail-hard conformance: rendered aspect == channel
A new produce-time step (wired like `snap-contrast` in `produce.mjs`, `process.exit(1)` before export):
- **Static:** the produced `static.png` pixel WxH == `CHANNELS[channel].mediaSize`.
- **Video:** the selected comp's dims == `CHANNELS[channel].mediaSize`.
Shared assert lives beside `mediaSize` in `channel.ts`.

### 5. Absent channel = back-compat
When no channel is passed (legacy / no-channel proposals), default to `article-web` (landscape) — matches
`normalizeChannel`'s default and today's behavior. Producers keep working with no channel arg.

## What changes where

- `skills/splash/src/channel.ts` — a `channelAspect(channel)`/`renderSize(channel)` accessor (mediaSize
  exists) + `assertRenderedSize(actual, channel)` (throws/returns violation). + tests.
- `skills/chart-native/`: `remotion/src/Root.tsx` (Portrait 1350→1920), `core/format.ts` (scale tuning),
  `scripts/produce.mjs` (channel arg, aspect gating, mount-size define), `vite.config.ts` (+2 defines),
  `src/mount.tsx:166` (read defines), `scripts/produce-from-spec.mjs` (forward channel).
- `skills/map-native/`: mirror — `remotion/src/Root.tsx` (Portrait 1350→1920), `scripts/produce.mjs`
  (channel arg, aspect gating, static size), `core/map-format.ts` if needed.
- `skills/splash/src/adapters.ts` — thread `p.channel` into the dispatched argv for both native producers.
- `skills/splash/SKILL.md` EXPORT §6 — "produce the one channel aspect" (not "produce 3, pick 1");
  remove the Slice-1 4:5 caveat.
- New conformance step in both `produce.mjs` (fail-hard aspect==channel).

## Scope / boundaries

- **Repoint, not factory-refactor.** The grounding recommends refactoring Root.tsx's 123/43 literal comps
  to a loop; that's a larger risk. Slice 2 does the low-risk repoint + notes the factory refactor (and its
  coverage drift test) as a follow-up.
- **Render-verify representative families** (line, bar, scatter, part-to-whole, distribution + 2 map
  types) at 9:16, not all 41 — the shared `resolveFrame`/`resolveMapFrame` mean families inherit the math.
- **Out of scope (separate tickets):** wiring the subject/altInsight conformance checks to produce
  (Wave-2 R2 backlog); dw-chart's twin blue-guard gap; the Root.tsx factory refactor.

## Testing

- Unit: `renderSize`/`channelAspect`/`assertRenderedSize` per channel; the 9:16 mediaSize.
- Produce-time: aspect==channel fail-hard (a static.png at the wrong size fails; a mismatched video comp
  fails).
- Render-verify (by eye): social-vertical → a 1080×1920 chart PNG + a 9:16 video still that reads well;
  social-feed → square; article-web → landscape; per the representative families. Confirm only the
  channel's aspect is produced (no stray landscape/square mp4s for a vertical channel).
- `bun run check` 16/16.
