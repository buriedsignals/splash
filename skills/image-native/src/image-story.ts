// image-native — the data contract for a journalist-supplied image sequence and its
// render-free conformance. Pure: no images, no DOM, no I/O. Mirrors the scrolly
// conformance style (a string[] of human-readable violations; empty = valid).
// Spec: docs/superpowers/specs/2026-07-10-image-scrolly-design.md §5, §6.

export interface ImageCredit {
  name: string;
  url?: string;
  licence?: string;
}

export interface ImageStep {
  id: string;
  frameRef: string; // raw image filename, resolved relative to ImageStory.imageDir
  caption: string; // article-derived, self-contained, NEVER a verbatim excerpt
  alt: string; // what is VISIBLE — journalist-supplied, distinct from caption (WCAG 1.1.1)
  credit: ImageCredit; // per-frame photo credit — a different axis from the module source
  sourcePassage: string; // the matched article passage — the tripwire's reference
  fit?: "crop" | "canvas-frame"; // per-frame override of ImageStory.fit
  align?: "left" | "right" | "center";
}

export interface ImageStory {
  title: string; // the insight — persistent header, never a caption
  description: string; // intro caption (what/when/where)
  source: { name: string; url?: string }; // ARTICLE/DATA provenance (≠ per-frame credit)
  frames: ImageStep[];
  keyFrame: number; // index of the representative frame → static export
  fit: "canvas-frame" | "crop"; // project default (canvas-frame is the safe editorial default)
  lang?: string;
  imageDir: string; // root for resolving frameRefs (suggest-image → engine handoff)
}

export function checkImageConformance(
  _story: ImageStory,
  _opts?: { overlapThreshold?: number },
): string[] {
  return [];
}
