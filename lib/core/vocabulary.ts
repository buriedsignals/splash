// The canonical vocabulary of the execution contract. Nothing here imports upward into
// skills/ — that inversion is exactly what this file exists to end: lib/core/contract.ts
// and lib/core/registry.ts used to type-import VisualFormat/Channel from
// skills/splash/src/, which meant the new shell could not exist without the legacy
// orchestrator. skills/splash/src/producer-spec.ts and channel.ts now RE-EXPORT from
// here, so their ~46 existing importers are untouched, and VisualFormat stops being
// duplicated by hand between producer-spec.ts and channel.ts.
// See docs/superpowers/specs/2026-07-24-verb-contract-adapters-design.md §2.1.

// Every vocabulary below is declared ONCE, as a const array, with its union type DERIVED
// from it (the VERBS/Verb shape). That derivation is the whole point: a runtime shape gate
// (lib/core/verbs/index.ts's isRenderPayload) needs the values at runtime, and a
// hand-written second copy of the list is exactly the drift this file exists to abolish —
// a fifth format added to the union but not to the array would silently make the gate
// reject a valid payload. Deriving the type from the array makes the two impossible to
// disagree.
export const VISUAL_FORMATS = [
  "static",
  "interactive",
  "video",
  "scrolly",
] as const;
export type VisualFormat = (typeof VISUAL_FORMATS)[number];

// The canonical RENDER targets. A channel is no longer something a journalist picks: it is the
// resolution of a DESTINATION and a MEDIA ASPECT (channel-policy.ts's channelFor), which is the
// de-welding issue #1 asks for — "the current single-choice channel model conflates destination,
// format, and aspect ratio". The keys stay, because the whole render layer is addressed by them
// (SPLASH_CHANNEL, lib/verify/viewport.ts, assertRenderedSize); what changed is that they are
// DERIVED rather than chosen.
// (Distinct from skills/splash/src/channel.ts's CHANNELS map, which hangs each channel's
// aspect/size POLICY off these keys — the vocabulary is the keys, not the policy.)
export const CHANNELS = [
  "social-vertical",
  "social-feed",
  "article-web",
  "print-page",
] as const;
export type Channel = (typeof CHANNELS)[number];

// WHERE a deliverable lands. The first axis of issue #1, and the one that did not exist:
// `print` was not a channel at all, and the word was aliased onto article-web
// (skills/splash/src/channel.ts's CHANNEL_KEYWORDS), so asking for print silently returned a
// 1200x675 screen PNG.
export const DESTINATIONS = ["article-web", "social", "print"] as const;
export type Destination = (typeof DESTINATIONS)[number];

// WHAT SHAPE it has. The third axis — asked only on the branches that need it, and only after
// the editorial format is chosen (issue #1, stage 3). "responsive" is deliberately NOT here: it
// is what an interactive DOES inside its host, not a shape a journalist picks (see
// ChannelAspect in channel-policy.ts, which is the wider render-side union).
export const MEDIA_ASPECTS = [
  "portrait",
  "square",
  "landscape",
  "page",
] as const;
export type MediaAspect = (typeof MEDIA_ASPECTS)[number];

export function isDestination(v: unknown): v is Destination {
  return (
    typeof v === "string" && (DESTINATIONS as readonly string[]).includes(v)
  );
}

export function isMediaAspect(v: unknown): v is MediaAspect {
  return (
    typeof v === "string" && (MEDIA_ASPECTS as readonly string[]).includes(v)
  );
}

export function isVisualFormat(v: unknown): v is VisualFormat {
  return (
    typeof v === "string" && (VISUAL_FORMATS as readonly string[]).includes(v)
  );
}

export function isChannel(v: unknown): v is Channel {
  return typeof v === "string" && (CHANNELS as readonly string[]).includes(v);
}

// What a journalist actually walks away with. Two formats can differ (static vs interactive)
// and still be the SAME decision — an element embedded in the article. A video is a different
// artifact entirely (the only format whose file is not HTML — see lib/loop/produce.ts's
// artifactFileFor), and a scrolly takes over the reader's scroll for its own height rather than
// sitting in a box — a different READING, not a different hand-over: a scrolly is delivered as
// one self-contained HTML file of the embed genre, exactly like an interactive
// (lib/core/publishers.ts's DELIVERY_GENRE, proven end to end in lib/loop/scrolly-e2e.test.ts).
// "page" is therefore about what the journalist WALKS AWAY WITH as a reading experience, which
// is the only question this table answers; lib/brain/offer.ts uses it to keep the offer from
// being mono-format, and nothing routes delivery on it.
export type DeliverableKind = "element" | "motion" | "page";

// TOTAL over VisualFormat on purpose: adding a format to VISUAL_FORMATS must force a decision
// here rather than fall into a silent default.
export const DELIVERABLE_KIND: Record<VisualFormat, DeliverableKind> = {
  static: "element",
  interactive: "element",
  video: "motion",
  scrolly: "page",
};

// The CLOSED verb vocabulary. A closed enum is what makes "bounded verbs" mechanical
// rather than documentary: an operation outside this list is a refusal, not an
// improvisation. Only `render` has a body in B1 — capture (issue #10), review (#9) and
// publish (#4) are declared slots their own sub-project fills.
export const VERBS = ["render", "capture", "review", "publish"] as const;
export type Verb = (typeof VERBS)[number];

export function isVerb(v: unknown): v is Verb {
  return typeof v === "string" && (VERBS as readonly string[]).includes(v);
}
