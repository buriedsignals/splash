# Channel-driven format — Slice 2 (producer rendering) — Implementation Plan

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Producers render at the channel's size/aspect — social-vertical → true 9:16 (1080×1920),
social-feed → square, article-web → landscape — for static/video/interactive; render ONLY the channel's
aspect; fail-hard if rendered aspect ≠ channel. Spec:
`docs/superpowers/specs/2026-07-08-channel-driven-format-slice-2-design.md`.

## Global Constraints
- English identifiers/comments/commits. No Claude/Anthropic mention. Bun only. No fabricated data.
- `bun run check` 16/16 at each task end. Do NOT break drift tests (native-types, completeness, map-types).
- Channel enum `social-vertical|social-feed|article-web`; sizes portrait 1080×1920 · square 1080×1080 ·
  landscape 1200×675 (from `skills/splash/src/channel.ts` `CHANNELS[*].mediaSize`).
- Absent channel ⇒ default `article-web` (landscape) — back-compat, producers still work with no channel arg.
- 9:16 = **repoint** existing Portrait comps 1350→1920 (drop 4:5, no channel uses it), NOT a 4th aspect.

---

### Task 1: shared render-size accessors/assert + thread channel through the adapter
**Files:** `skills/splash/src/channel.ts`, `skills/splash/tests/channel.test.ts`, `skills/splash/src/adapters.ts`.
**Produces:**
```ts
export function channelAspect(channel: Channel): ChannelAspect; // = CHANNELS[channel].aspect
export function renderSize(channel: Channel): ChannelSize;       // = CHANNELS[channel].mediaSize
// throws Error (or returns a violation string) when actual !== expected mediaSize
export function assertRenderedSize(actualW: number, actualH: number, channel: Channel): void;
```
- `adapters.ts` `dispatchFileBased`/`realDispatch` (~:185-205): for chart-native + map-native, append the
  proposal's `channel` (default `"article-web"`) to the dispatched argv (a 5th positional arg) OR as env
  `SPLASH_CHANNEL`. Pick whichever the entry scripts read most cleanly; document it. dw-chart/map-dw
  dispatch unchanged.
- [ ] Test `channelAspect`/`renderSize`/`assertRenderedSize` (pass on match, fail on 1080×1350 vs a
  social-vertical 1080×1920). [ ] Test adapters passes channel (unit around the argv builder). [ ] Commit.

### Task 2: chart-native renders at channel size + 9:16 (depends on T1)
**Files:** `skills/chart-native/scripts/produce-from-spec.mjs`, `scripts/produce.mjs`, `vite.config.ts`,
`src/mount.tsx`, `remotion/src/Root.tsx`, `src/core/format.ts`.
- **Thread:** `produce-from-spec.mjs` forwards the channel arg to `produce.mjs`; `produce.mjs` reads it
  (default article-web).
- **Video aspect gating:** replace the unconditional triple (`produce.mjs:136-140`) with the SINGLE comp
  matching `channelAspect(channel)` — portrait→`${X}Portrait`, square→`${X}Square`, landscape→`${X}Reveal`.
- **Static sizing:** add `__MEDIA_W__`/`__MEDIA_H__` defines in `vite.config.ts` from `renderSize(channel)`;
  read them at `mount.tsx:166` (the injected-config `<Comp width height>` — NOT the ~40 sample literals).
- **9:16:** in `remotion/src/Root.tsx`, change every `${X}Portrait` comp `height={1350}`→`height={1920}`.
  Tune `scale`/`plotAspect` (prefer a single adjustment in `core/format.ts resolveFrame` for tall canvases;
  per-comp `scale` only if a family needs it) so 9:16 reads well.
- **Render-verify (by eye):** produce a social-vertical **line** chart → static PNG is 1080×1920 and reads
  well; a 9:16 **video** still reads well. Repeat for **bar, scatter, part-to-whole (pie/stacked),
  distribution (histogram/beeswarm)**. Produce a social-feed chart → square; article-web → landscape.
  Confirm ONLY the channel aspect is emitted (no stray square/landscape mp4 for a vertical run).
- [ ] `bun test skills/chart-native` green (drift tests intact). [ ] `bunx tsc` clean. [ ] Commit.

### Task 3: map-native renders at channel size + 9:16 (depends on T1; parallel to T2)
**Files:** `skills/map-native/scripts/produce.mjs`, `remotion/src/Root.tsx`, `src/core/map-format.ts` (if
tuning needed).
- **Thread + gate:** `produce.mjs` reads the channel arg (default article-web); gate `VIDEO_COMPS`/
  `storyComps()`/`SCROLLY_COMPS` to the single comp matching `channelAspect(channel)`.
- **Static sizing:** size the static/interactive build to `renderSize(channel)` (map static currently
  1280×720 — thread the channel size in; mirror T2's define approach if map uses Vite the same way).
- **9:16:** `remotion/src/Root.tsx` Portrait comps `height 1350→1920`; `resolveMapFrame` already adapts.
- **Render-verify (by eye):** a social-vertical **choropleth** + **symbol** map → 1080×1920, furniture
  (title/legend/source) fits; social-feed → square; article-web → landscape. Only the channel aspect emitted.
- [ ] `bun test skills/map-native` green (map-types drift intact). [ ] `bunx tsc` clean. [ ] Commit.

### Task 4: fail-hard conformance — rendered aspect == channel (depends on T2, T3)
**Files:** `skills/chart-native/scripts/produce.mjs`, `skills/map-native/scripts/produce.mjs`, a small
shared probe (reuse `assertRenderedSize` from T1).
- After the render, before export, assert: static `static.png` pixel WxH == `renderSize(channel)`; video
  selected-comp dims == `renderSize(channel)`. Wire fail-hard like `snap-contrast` (`produce.mjs:116-120`,
  `process.exit(1)` on violation). A cheap PNG-dimension probe (read the IHDR / use an existing image lib
  already in deps) for static; the comp dims are known in-code for video.
- [ ] Test: a deliberately wrong-sized static → produce exits non-zero. [ ] Verify GREEN on a correct
  channel-sized render (produce exits 0). [ ] Commit.

### Task 5: splash SKILL.md EXPORT — produce the one channel aspect
**Files:** `skills/splash/SKILL.md`.
- EXPORT §6 VIDEO branch (~:299-310): change "producer emits three aspect ratios … pick one at EXPORT" →
  "the producer renders the ONE aspect the channel requires (social-vertical→9:16, feed→square,
  article-web→landscape); hand over that mp4." Remove the Slice-1 4:5 caveat (9:16 now real).
- [ ] `bun test skills/splash` green. [ ] Commit.

## Final
- Whole-branch review (opus) vs these constraints. Fix findings (one fixer for all).
- Harness e2e render-verify: `geneve-loyers-video` (social-vertical) → a true 9:16 video (the Slice-1
  gap); a feed case → square; an article-web case → landscape. Render-verify by eye.
- `bun run check` 16/16.

## Self-review notes
- Do NOT refactor Root.tsx to a factory (follow-up ticket). Repoint only.
- The static define approach assumes the produce path renders via `mount.tsx:166` only — confirmed by
  grounding; the sample literals are a separate path.
- If a family looks bad at 9:16 after a global `resolveFrame` tune, adjust that family's `scale` and
  render-verify — don't leave a broken tall render.
