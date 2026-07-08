# Channel-driven format — Slice 1 (decision layer) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** Make the confirmed channel authoritative and explicit at the DECISION level — a structured
channel enum, a shared channel table, format reconciled+announced to the channel, the hard rules
(not-embed⇒never interactive; article/web⇒interactive default + static fallback), an aspect↔type guard,
and a fail-hard conformance that a shipped format ∈ allowedFormats(channel). Producer pixel-rendering of
every aspect (native 9:16 comps, channel→size threading) is **Slice 2**, out of scope here.

**Architecture:** One shared, pure channel model in `skills/atelier/src/channel.ts` (the cross-producer
hub — cross-skill imports already exist, e.g. `suggest-chart/eval/score.ts` imports `../../dw-chart`).
dw-chart's existing `export-aspect.ts` is refactored to consume it (single source of truth). suggest-chart
routing + eval, atelier SKILL.md prose, and format-selection.md are aligned to it.

**Tech Stack:** Bun, TypeScript, bun:test. Runtime English. No vendor mention.

## Global Constraints

- All identifiers/comments/commit messages **English**. No Claude/Anthropic mention anywhere.
- Bun only (never npm/node). Real values, no fabricated data/sources.
- Do NOT break existing drift/completeness tests: chart-native `native-types.test.ts` / `completeness.test.ts`;
  map-native `map-types.test.ts` / `map-completeness.test.ts`; eval `FAMILY_TYPES ⊆ CHART_TYPES`.
- `bun run check` must stay green (16/16) at the end of every task.
- Channel enum canonical values: `"social-vertical" | "social-feed" | "article-web"`.
- VisualFormat vocabulary is the code's: `"static" | "interactive" | "video" | "scrolly"` (producer-spec.ts:4).
  Map the spec's "image"→`static`; "interactive"→`interactive`+`scrolly`. `allowedFormats` returns this vocab.
- "portrait" target for social-vertical = **9:16** (Stories/Reels standard). Native 9:16 comps are Slice 2;
  Slice 1 only needs the table to SAY 9:16 and dw-chart static (which already renders 1080×1920) to honor it.

---

### Task 1: Shared channel model (`skills/atelier/src/channel.ts`)

**Files:**
- Create: `skills/atelier/src/channel.ts`
- Test: `skills/atelier/tests/channel.test.ts`

**Interfaces (Produces):**
```ts
export type Channel = "social-vertical" | "social-feed" | "article-web";
export type VisualFormat = "static" | "interactive" | "video" | "scrolly"; // re-export/align with producer-spec
export type ChannelAspect = "portrait" | "square" | "landscape" | "responsive";
export interface ChannelSize { width: number; height: number; } // pixels for a MEDIA render at that aspect
export interface ChannelEntry {
  aspect: ChannelAspect;          // media aspect for image/video
  mediaSize: ChannelSize;         // portrait 1080x1920 · square 1080x1080 · landscape 1200x675
  allowedFormats: VisualFormat[]; // social-* → [static, video]; article-web → [static, interactive, video, scrolly]
  interactiveDefault: boolean;    // true only for article-web
  interactiveAspect: ChannelAspect; // "responsive" for article-web; N/A otherwise (still "responsive")
}
export const CHANNELS: Record<Channel, ChannelEntry>;
export const ALL_CHANNELS: Channel[];
export function allowedFormats(channel: Channel): VisualFormat[];
export function isFormatAllowed(channel: Channel, format: VisualFormat): boolean;
export function mediaSize(channel: Channel): ChannelSize; // for image/video
export function normalizeChannel(freeText?: string): Channel; // maps legacy free-text keywords → enum; default "article-web"
```

- `CHANNELS`: `social-vertical → {aspect:"portrait", mediaSize:{1080,1920}, allowedFormats:["static","video"], interactiveDefault:false}` ·
  `social-feed → {aspect:"square", mediaSize:{1080,1080}, allowedFormats:["static","video"], ...}` ·
  `article-web → {aspect:"landscape", mediaSize:{1200,675}, allowedFormats:["static","interactive","video","scrolly"], interactiveDefault:true, interactiveAspect:"responsive"}`.
- `normalizeChannel` reuses the keyword sets currently in `dw-chart/src/export-aspect.ts` `CHANNEL_ASPECT`
  (feed/square→social-feed; social/vertical/story/stories/reel/reels/tiktok/shorts/portrait→social-vertical;
  web/article/embed/landscape/print/youtube→article-web). Trim+lowercase; unknown→`"article-web"`.

- [ ] **Step 1:** Write `channel.test.ts` — assert: each channel's allowedFormats (social excludes "interactive" & "scrolly"; article-web includes them); `isFormatAllowed("social-feed","interactive")===false`; `interactiveDefault` only true for article-web; `mediaSize` per channel; `normalizeChannel("Stories")==="social-vertical"`, `normalizeChannel("feed")==="social-feed"`, `normalizeChannel("article embed")==="article-web"`, `normalizeChannel(undefined)==="article-web"`.
- [ ] **Step 2:** Run → fails (module missing).
- [ ] **Step 3:** Implement `channel.ts`.
- [ ] **Step 4:** `bun test skills/atelier/tests/channel.test.ts` → passes.
- [ ] **Step 5:** Commit.

---

### Task 2: Refactor dw-chart `export-aspect.ts` to consume the shared model

**Files:**
- Modify: `skills/dw-chart/src/export-aspect.ts` (replace its private `CHANNEL_ASPECT`/`channelToAspect` with a call into `skills/atelier/src/channel.ts` `normalizeChannel` + `CHANNELS[ch].aspect`; keep `EXPORT_SIZES`, `ROW_DRIVEN_TYPES`, `isRowDriven`, `channelToExportSize` — the row-driven crop concern stays DW-specific).
- Test: `skills/dw-chart/tests/export-aspect.test.ts` (keep green; adjust only if a name moved).

**Interfaces (Consumes):** Task 1's `normalizeChannel`, `CHANNELS`.

- Keep `channelToExportSize(channel?, type?)` signature identical (produce.ts:80 depends on it). Internally:
  `aspect = CHANNELS[normalizeChannel(channel)].aspect`; `box = EXPORT_SIZES[aspect]`; row-driven ⇒ width-only.
- Verify the dw-chart tsconfig can import from `../../atelier/src/channel` (cross-skill import like score.ts). If a tsconfig `rootDir`/path issue blocks it, note it and use a relative import that tsc + bun both resolve (the produce `.mjs` run under bun/tsx).

- [ ] **Step 1:** Adjust `export-aspect.test.ts` to keep asserting `channelToExportSize("Stories","d3-lines")→portrait 1080×1920`, `("feed","d3-lines")→square 1080×1080`, `(undefined,"d3-bars")→width-only landscape`.
- [ ] **Step 2:** Run → still green on unchanged behavior (RED only if you renamed something).
- [ ] **Step 3:** Refactor to consume the shared model; delete the duplicated keyword map.
- [ ] **Step 4:** `bun test skills/dw-chart` (144+ pass, incl. real-API round-trips) + `bunx tsc` for dw-chart → green.
- [ ] **Step 5:** Commit.

---

### Task 3: suggest-chart routing + eval — channel restricts format, article/web interactive-default, aspect↔type guard, format scored

**Files:**
- Modify: `skills/suggest-chart/SKILL.md` (Format step §71-96 + the ChartSpec `channel` doc at line 121).
- Modify: `skills/suggest-chart/eval/score.ts` (`Expectation` +`channel?`,`format?`; new branch: fail if the spec's implied format ∉ allowedFormats(expect.channel); the spec's format is implied by producer per the code map — dw-chart/map-dw⇒static, chart-native⇒interactive|video, scrolly⇒scrolly — reuse adapters' mapping if present).
- Create: `skills/suggest-chart/eval/cases/vertical-social-column.json` (portrait channel ⇒ column/static, NOT a row-driven bar, NOT interactive) and `article-web-interactive.json` (article-web ⇒ interactive default + static fallback expected).
- Test: `skills/suggest-chart/eval/tests/score.test.ts` (add the format-restriction assertions).

**Interfaces (Consumes):** Task 1 `allowedFormats`, `isFormatAllowed`, `normalizeChannel`.

**Prose rules to add to suggest-chart SKILL.md Format step:**
1. The structured channel FIRST restricts the format set: **social-vertical / social-feed ⇒ format ∈ {static image, video} — NEVER interactive/scrolly**; **article-web ⇒ {static, interactive, video, scrolly}, DEFAULT interactive** (it wins unless a concrete reason not to), and **whenever interactive is chosen a static fallback that carries the claim is ALSO produced** (a11y invariant).
2. **Aspect↔type guard:** for a portrait or square channel, never choose a row-driven horizontal type (`d3-bars`, dot/arrow/range plots) — they can't take that aspect; route to a vertical **column** (or a portrait-composed media). (Ref the recyclage failure.)
3. Announce the chosen `{format, size, sub-format}` reconciled to the channel (the PROPOSITION does the surfacing; here just emit them).

- [ ] **Step 1:** Write score.test.ts cases: an expectation `{channel:"social-feed", ...}` with a spec whose producer implies `interactive` → `ok:false` (format not allowed); an `{channel:"article-web"}` interactive spec → allowed. A portrait-channel expectation with a row-driven `d3-bars` spec → flagged.
- [ ] **Step 2:** Run → fails (no channel/format branch yet).
- [ ] **Step 3:** Add `Expectation.channel?`,`Expectation.format?`; implement the allowedFormats check + the aspect↔type flag in `scoreSpec` using Task 1 helpers; add the two eval-case JSONs.
- [ ] **Step 4:** Update suggest-chart SKILL.md Format step with the 3 rules above (English prose).
- [ ] **Step 5:** `bun test skills/suggest-chart/eval` → green. Commit.

---

### Task 4: atelier SKILL.md — CADRAGE Q3 structured pick · PROPOSITION announce · EXPORT branching · narration

**Files:** Modify `skills/atelier/SKILL.md` (Q3 §50-59; PROPOSITION §79-113; EXPORT §206-254).

- **CADRAGE Q3** → a structured 3-way channel choice (multiple-choice, journalist's language): Social vertical (Stories/Reels) · Social feed (post) · Article web / embed. State that the pick maps to `skills/atelier/src/channel.ts` (deterministic size + allowed formats). Keep "always asked, both branches."
- **PROPOSITION** → after routing, announce for each opportunity the reconciled `{format, size, sub-format}` in plain language ("un chart INTERACTIF, responsive, explore-libre — calé sur ton article web ; refuser/changer ?"), vetoable. Hard rule surfaced: not-embed ⇒ image or video only.
- **Narration sub-format:** GUIDED branch ⇒ the AI picks the sub-format (grounded, announced, vetoable); DIRECT ⇒ the journalist names it (checked reachable first). Applies to interactive (explore vs scrolly) and video (camera/reveal modes).
- **EXPORT §6** → branch exactly on the model: image/video ⇒ hand over the media directly at the channel size + chosen sub-format (no delivery menu); interactive ⇒ the 3 deliveries (source code · static HTML · fly.io embed link). Fix the note that portrait mp4 is "9:16" to stay consistent (native 9:16 comes in Slice 2 — reference that here so the doc isn't lying).

- [ ] **Step 1:** Edit Q3 to the structured pick.
- [ ] **Step 2:** Edit PROPOSITION to announce `{format,size,sub-format}` + narration GUIDED/DIRECT rule.
- [ ] **Step 3:** Edit EXPORT §6 to the exact branching + note Slice-2 for native 9:16.
- [ ] **Step 4:** `bun test skills/atelier` → green (prose change; ensure no test parses these lines strictly). Commit.

---

### Task 5: `format-selection.md` — reframe around the channel

**Files:** Modify `knowledge/references/formats/format-selection.md`.

- Add a top gate: **the channel first constrains the allowed-format set** (table). Social ⇒ image/video only; article-web ⇒ all four, **default interactive**, with the static-fallback a11y invariant.
- Keep the static-first sources (Archie Tse / Malofiej) reframed as the **a11y-fallback grounding** (why the static fallback always ships), not a blanket veto on interactive for article-web.
- Cross-ref `skills/atelier/src/channel.ts` as the code source of truth.

- [ ] **Step 1:** Edit the doc (channel-first gate + reframed static-first + cross-ref). English, real URLs only.
- [ ] **Step 2:** Commit. (No test; it's KB prose — the suggest-chart eval covers the behavior.)

---

### Task 6: Fail-hard conformance — shipped format ∈ allowedFormats(channel)

**Files:**
- Modify: `skills/atelier/src/producer-spec.ts` (add optional `channel?: Channel` to `AcceptedProposal`).
- Modify: `skills/atelier/src/produce-all.ts` (or the adapters) — before/after producing a proposal, assert `isFormatAllowed(proposal.channel ?? "article-web", proposal.format)`; a violation is a hard failure recorded in the result (mirrors the existing drop-proof reporting), NOT a silent ship. Reuse the existing structured-report path.
- Test: `skills/atelier/tests/…` — a proposal `{channel:"social-feed", format:"interactive"}` fails; `{channel:"article-web", format:"interactive"}` passes; `{channel:"social-vertical", format:"video"}` passes.

**Interfaces (Consumes):** Task 1 `isFormatAllowed`.

- [ ] **Step 1:** Write the test (allowed/blocked matrix).
- [ ] **Step 2:** Run → fails.
- [ ] **Step 3:** Thread `channel` onto `AcceptedProposal`; add the fail-hard check in produce-all's loop; record a structured violation result.
- [ ] **Step 4:** `bun test skills/atelier` → green. Commit.

---

## Final: whole-branch review + e2e render-verify
- Whole-branch review (opus) against this plan's Global Constraints.
- Harness e2e (render-verify by eye): `recyclage-ranking` (vertical channel → must ship a portrait static column, not a landscape bar) + an article-web case (→ interactive default WITH a static fallback present) + confirm `geneve-loyers-video` no longer mis-routes to interactive (it should now be blocked from interactive by the social channel, routing to video/static — full 9:16 video render is Slice 2).
- `bun run check` 16/16.

## Self-review notes
- Slice 1 does NOT change native producer rendering — so a chart-native VIDEO for a social channel still
  renders 4:5, not 9:16. That's why Task 6 asserts format-set membership (catchable now) but NOT pixel
  aspect==channel for native video (Slice 2). dw-chart static portrait (1080×1920) DOES honor 9:16 today.
- Do not over-reach into producer mount sizing; that's Slice 2.
