// twin/skills/scrolly/scripts/live-map-cards.mjs
//
// THE FROZEN CARD IMAGES UNDER A LIVE SCROLLY MAP, the pure half. A live map scrolly carries one image per
// text card, baked from the same plan at the card's own camera and state, so a reader without a key, without
// a script, or before the live map is drawn still reads each card (addendum 2026-09-15 §2.5). What every such
// beat shares — the shapes and sizes the images are baked at, their names, the hash that says when to re-bake,
// the check that a page carries its own images, the markup and CSS that choose among them — lives here, and
// what the images picture (plan, cameras, words, assertions) stays in the beat.
//
// The browser and encoder half is `live-map-cards-bake.mjs`. This file imports no browser, so its tests run
// in the fast lane.
//
// INTERFACE
//   MEASURED_VIEWPORTS, SHAPE_ASPECTS, SCALES, BLANK_IMAGE    the measured shapes and densities
//   evenFrom(min, stage)                                      a baked length whose centred crop is whole pixels
//   bakeSizesFor(stages, aspects?)                            the two bake sizes from the two measured stages
//   cardImageStem / cardImageName                             where a direction's card image lives
//   variantsOf(scales?)                                       every [shape, scale] a card is baked in
//   blankCards(count, card?)                                  the draft page's images, before any bake
//   planHashOf(inputs)                                        sha256 of what the pixels depend on
//   sha256Of(bytes)
//   checkCardImages({ id, inlined, record, others })          why a page's images are not its own bakes
//   shapeSelectionCss(scope, reference)                       one shape shown, chosen by the stage's aspect
//   noScriptCss(scope, lastCard, alsoShown)                   the last card's picture without a script
//   CardImages({ fallbacks, first })                          the `<picture>` per card and shape
//   KEY_PLACEHOLDER, localPageOf(page), keyedPage(html, key, name)   the git-ignored local copy with the key in it

import { createHash } from "node:crypto";
import { createElement } from "react";

/** THE STAGES THE IMAGES ARE BAKED AT, measured on the direction's own rendered page: `wide` at a 1280 × 800
 *  viewport, `tall` at 375 × 812. */
export const MEASURED_VIEWPORTS = { wide: { width: 1280, height: 800 }, tall: { width: 375, height: 812 } };

/** THE LIVE MAP FITS THE PLAN'S REFERENCE GROUND by the stage's height when the stage is wider than the
 *  reference and by its width otherwise (`zoomShiftFor`). So `wide` keeps the measured stage's height and is
 *  baked wider (aspect 2.5), `tall` keeps its width and is baked taller (0.47). Shown `object-fit: cover` and
 *  centred, each image is then scaled by exactly the live map's own zoom shift on every stage whose aspect lies
 *  between the reference's and its own, and not scaled at all on the measured stage: the frozen card and the
 *  live map meet to the pixel (choropleth pilot, round 4). */
export const SHAPE_ASPECTS = { wide: 2.5, tall: 0.47 };

/** TWO DENSITIES PER CARD, 2x AND 1x: a 1x screen shown the 2x picture at half size reads the map's words thinner
 *  than the live 1x canvas that replaces them (owner, 2026-09-15: « les fonts changent »). */
export const SCALES = [2, 1];

/** A one-pixel transparent GIF: the draft page's card images, which publish the same layout (the images are
 *  absolutely placed) before anything is baked. */
export const BLANK_IMAGE = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

/** A length at least `min` whose difference from `stage` is even, so the centred crop falls on whole pixels. */
export function evenFrom(min, stage) {
  const n = Math.ceil(min);
  return (n - stage) % 2 === 0 ? n : n + 1;
}

export function bakeSizesFor(stages, aspects = SHAPE_ASPECTS) {
  for (const shape of ["wide", "tall"])
    if (!(stages?.[shape]?.width > 0 && stages[shape].height > 0))
      throw new Error(`the ${shape} stage measured ${JSON.stringify(stages?.[shape])}: a card image cannot be baked for a stage with no size`);
  return {
    wide: { width: evenFrom(stages.wide.height * aspects.wide, stages.wide.width), height: stages.wide.height },
    tall: { width: stages.tall.width, height: evenFrom(stages.tall.width / aspects.tall, stages.tall.height) },
  };
}

/** Where a direction's card image lives. Always handed the direction's id, never built as a closure inside the
 *  direction loop (see `checkCardImages`). */
export const cardImageStem = (id, shape, scale) => `${id}-${shape}@${scale}x`;
export const cardImageName = (id, k, shape, scale, ext = "webp") => `${cardImageStem(id, shape, scale)}-${k + 1}.${ext}`;

export const variantsOf = (scales = SCALES) => ["wide", "tall"].flatMap((shape) => scales.map((scale) => [shape, scale]));

/** `card` is what the beat's driver reads off a baked card (`cardOf` in `renderWithCardImages`), zeroed: the
 *  draft page runs its scripts, and a driver reading a missing field would throw there. */
export function blankCards(count, card = { zoom: 0 }) {
  const blankShape = { size: { width: 1, height: 1 }, cards: Array.from({ length: count }, () => structuredClone(card)) };
  return {
    fallbacks: Array.from({ length: count }, () => ({ wide: { x1: BLANK_IMAGE, x2: BLANK_IMAGE }, tall: { x1: BLANK_IMAGE, x2: BLANK_IMAGE } })),
    shapes: { wide: blankShape, tall: blankShape },
  };
}

export const sha256Of = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** THE CARD IMAGES ARE BAKED ONLY WHEN WHAT THEY PICTURE HAS CHANGED. `inputs` carries everything the pixels
 *  depend on: the plan (key-free), the sizes, the stage ground, the scales, the style document (key taken back
 *  out), the MapLibre version and the digest of the code that mounts and bakes it. */
export function planHashOf(inputs) {
  return createHash("sha256").update(JSON.stringify(inputs)).digest("hex");
}

/**
 * WHY A PAGE'S CARD IMAGES ARE NOT ITS OWN BAKES — an empty list when they are.
 *
 * `inlined` is every image the page is about to carry, `{ name, sha256 }`, hashed from the very bytes that are
 * inlined. `record` is this direction's bake record, whose `images` map each file name to the sha256 taken off
 * the file right after it was encoded. `others` is every other direction's record.
 *
 * The check compares digests, never megabyte data-URI strings, and names each image it refuses and why:
 *   - a name that is not this direction's stem;
 *   - bytes that differ from what the bake recorded for that name;
 *   - bytes that are another direction's recorded image;
 *   - two cards carrying the same bytes.
 *
 * THE NOCTURNE REFUSAL OF 2026-09-15 is what this replaced. The pilot's guard built two sets of base64 data URIs
 * from two separate reads and a `filter` closure over the loop's `id`, and answered one undifferentiated
 * sentence. It refused nocturne once right after a fresh bake; the same files, read again by an offline replay
 * and by a second run, were all nocturne's own and unique. Whatever differed was computed inside that one
 * process, and the sentence could not say which of its two conditions fired.
 */
export function checkCardImages({ id, inlined, record, others = [] }) {
  const problems = [];
  const stem = `${id}-`;
  const images = record?.images ?? {};
  const seen = new Map();
  const foreign = new Map();
  for (const other of others) for (const [name, sha] of Object.entries(other.images ?? {})) foreign.set(sha, name);
  for (const { name, sha256 } of inlined) {
    if (!name.startsWith(stem)) problems.push(`${name} is not named for ${id}`);
    if (images[name] === undefined) problems.push(`${name} has no digest in ${id}'s bake record`);
    else if (images[name] !== sha256) problems.push(`${name} is not the bytes ${id}'s bake recorded (${sha256.slice(0, 12)} read, ${images[name].slice(0, 12)} baked)`);
    if (foreign.has(sha256)) problems.push(`${name} carries the same bytes as ${foreign.get(sha256)}`);
    if (seen.has(sha256)) problems.push(`${name} carries the same bytes as ${seen.get(sha256)}`);
    else seen.set(sha256, name);
  }
  return problems;
}

/** WHICH SHAPE OF CARD IMAGE, read off the STAGE's own aspect with a container query: the live map fits the
 *  reference ground by the stage's height when the stage is wider than the reference and by its width
 *  otherwise, and each shape is baked for one of the two. */
export function shapeSelectionCss(scope, reference) {
  return (
    `${scope} [data-part="stage"]{container-type:size}` +
    `@container (aspect-ratio < ${reference.width}/${reference.height}){${scope} [data-shape="wide"]{display:none}}` +
    `@container (aspect-ratio >= ${reference.width}/${reference.height}){${scope} [data-shape="tall"]{display:none}}`
  );
}

/** THE NO-SCRIPT PICTURE IS THE LAST CARD: every card image hidden, the last one shown, and the furniture the
 *  beat names (`alsoShown`, selectors inside `scope`) brought to full opacity. Carried in a `<noscript>` whose
 *  own box is `display: none`, or it becomes a grid item. */
export function noScriptCss(scope, lastCard, alsoShown = []) {
  return `${scope} [data-fallback]{opacity:0!important}` + [`[data-fallback="${lastCard}"]`, ...alsoShown].map((s) => `${scope} ${s}`).join(",") + "{opacity:1!important}";
}

/** EACH CARD AT THE READER'S DENSITY, chosen by a media query and not by `srcset`'s `2x`: Chrome treats an inlined
 *  data URI as already cached and so always takes the densest candidate, which gave a 1x screen the 2x bake
 *  anyway (measured 2026-09-15). Fitted `cover` and centred. THE MARKUP IS CARD `first`: the page is megabytes
 *  of inlined images and its scripts come after them, so the first paint must already be the first card. */
export function CardImages({ fallbacks, first }) {
  return fallbacks.flatMap((card, k) =>
    ["wide", "tall"].map((shape) =>
      createElement(
        "picture",
        { key: `${shape}${k}` },
        createElement("source", { media: "(min-resolution: 1.5dppx)", srcSet: card[shape].x2 }),
        createElement("img", {
          "data-fallback": k,
          "data-shape": shape,
          src: card[shape].x1,
          alt: "",
          style: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: k === first ? 1 : 0 },
        }),
      ),
    ),
  );
}

export const KEY_PLACEHOLDER = "__MAPTILER" + "_KEY__";

/** WHERE A DIRECTION'S LOCAL, KEYED COPY LIVES: beside its page, `renders/<id>.local.html`, git-ignored
 *  (the `.gitignore` rule for renders/*.local.html under proof). The committed page carries the placeholder, because the repository is public;
 *  the local copy is what a page opened from disk needs to show a live map (owner, 2026-09-15). */
export function localPageOf(pagePath) {
  if (!pagePath.endsWith(".html") || pagePath.endsWith(".local.html")) throw new Error(`${pagePath} is not a committed page`);
  return pagePath.replace(/\.html$/, ".local.html");
}

/** The page's HTML with the key substituted, refused loudly when there is no key or nothing to substitute: a local
 *  copy without a live map would look like a broken page. */
export function keyedPage(html, key, name = "the page") {
  if (!key)
    throw new Error(`no MapTiler key in the environment to write ${name}'s local copy: load the worktree's .env (set -a && . ./.env && set +a)`);
  if (!html.includes(KEY_PLACEHOLDER)) throw new Error(`${name} carries no ${KEY_PLACEHOLDER} placeholder — is it a live map page?`);
  return html.split(KEY_PLACEHOLDER).join(key);
}
