// The snippet a newsroom pastes into its CMS — an iframe for the embed genre, the artifact's
// own tag (<img>/<video>) for the file genre. PURE — no I/O, no clock, no environment.
//
// An unknown placeholder is a REFUSAL, not a pass-through: a literal "{width}" left inside
// published HTML is a defect invisible from Splash and visible to the reader. That is the one
// opinion this module holds.
import { deliveryGenreFor, type DeliveryMetadata } from "../core/publishers";
import type { VisualFormat } from "../core/vocabulary";
import { fail, ok, type VerbResult } from "../core/verbs/types";

export type SnippetInput = {
  url: string;
  id: string;
  metadata: DeliveryMetadata;
  /** What the artifact IS. An embed genre gets an iframe; a file genre gets the tag its own
   * media type calls for — an iframe around a PNG loses the alt text this codebase fail-hards
   * everywhere else. */
  format: VisualFormat;
  /** The newsroom's tested template. Absent ⇒ DEFAULT_SNIPPET_TEMPLATE. */
  template?: string;
};

export const DEFAULT_SNIPPET_TEMPLATE =
  '<iframe src="{url}" title="{title}" width="{width}" height="{height}" style="border:0;max-width:100%" loading="lazy"></iframe>';

const RESPONSIVE_TEMPLATE =
  '<iframe src="{url}" title="{title}" style="border:0;width:100%;max-width:{width}px;aspect-ratio:16/9" loading="lazy"></iframe>';

// The file-genre templates. They carry {alt}, not {title}: a CMS field and a screen reader
// both read the alternative text, and it is the artifact's own accessible name — the iframe
// templates' {title} names a frame, which is a different thing.
export const IMAGE_SNIPPET_TEMPLATE =
  '<img src="{url}" alt="{alt}" width="{width}" style="max-width:100%;height:auto">';

export const VIDEO_SNIPPET_TEMPLATE =
  '<video src="{url}" controls playsinline aria-label="{alt}" width="{width}" style="max-width:100%;height:auto">{alt}</video>';

// Any brace-delimited token, not just alnum names: an underscore/hyphen/digit-bearing
// placeholder (e.g. "{utm_source}") must still be caught as unfillable rather than silently
// passed through — a narrower pattern was the original defect (fix round 1, critical 1).
const PLACEHOLDER = /\{([^{}]+)\}/g;

// A DOUBLED BRACE IS A TYPO, NOT AN ESCAPE SYNTAX. The ruling, written down because the module
// used to have none and the silence is what shipped the defect: `{{width}}` rendered `{700}` —
// the inner pair substituted, the outer pair published — which is the exact thing the header
// above says this module exists to prevent. Reading it as an escape would mean the ONE way to
// get a literal "{width}" into published HTML is a feature of the module that refuses it
// everywhere else, so it is refused instead: whoever fills `{{…}}` (Mustache, Handlebars, a CMS
// pass of its own) is not Splash, and half-filling somebody else's syntax is worse than saying so.
//
// Stated as the general rule rather than as a special case for `{{…}}`, because the doubled
// brace is one shape of one defect: EVERY brace in a template must belong to a placeholder
// Splash fills. `{url}}` shipped a trailing `}` the same way and was just as silent. Checked on
// the TEMPLATE, never on the rendered output — editorial text is substituted in, and a title
// that legitimately contains a brace must not be read as a broken template.
const DOUBLED = /\{\{[^{}]*\}\}/g;

/** What is wrong with the template's braces, phrased for the newsroom — or null if nothing is. */
function strayBraceProblem(template: string): string | null {
  if (!/[{}]/.test(template.replace(PLACEHOLDER, ""))) return null;
  // Named when they can be named: a newsroom fixes what it is shown, and the doubled token is
  // the shape it will actually recognise in its own template.
  const doubled = template.match(DOUBLED);
  return doubled
    ? `carries ${doubled.join(", ")}, and a doubled brace is a typo rather than an escape`
    : "carries a brace that is not part of a placeholder";
}

// Every substituted value lands inside an HTML attribute. Editorial text (a title quoting a
// source, a credit with an ampersand) is attacker-adjacent the moment it reaches a browser, so
// nothing is trusted — the URL included (fix round 1, critical 2).
function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderSnippet(input: SnippetInput): VerbResult<string> {
  const { metadata: m } = input;
  const genre = deliveryGenreFor(input.format);
  const responsive = m.height === "responsive";

  // A house template describes an EMBED — it is iframe-shaped by definition (that is what a
  // CMS's "embed code" field takes). Applied to a PNG it would wrap an image in an iframe, so
  // the file genre uses its own built-in tag and the template is not consulted at all.
  const template =
    genre === "file"
      ? input.format === "video"
        ? VIDEO_SNIPPET_TEMPLATE
        : IMAGE_SNIPPET_TEMPLATE
      : (input.template ??
        (responsive ? RESPONSIVE_TEMPLATE : DEFAULT_SNIPPET_TEMPLATE));

  // Braces first, before any other reading of the template. `"{{height}}".includes("{height}")`
  // is true, so the responsive rule below would otherwise answer a malformed template by
  // sending the newsroom to fix its sizing — the wrong instruction for the actual defect.
  const braceProblem = strayBraceProblem(template);
  if (braceProblem)
    return fail(
      "invalid-request",
      `snippet: the delivery template ${braceProblem} — Splash fills single-brace placeholders ` +
        `only, so every brace has to belong to one of them; a brace that does not would be ` +
        `published to the reader exactly as it stands`,
    );

  // A responsive sizing rule and a custom template that still demands {height} contradict each
  // other: only the newsroom can resolve which one wins, so this is a refusal, not a silent
  // empty attribute (fix round 1, important 3). The built-in RESPONSIVE_TEMPLATE is exempt — it
  // is chosen precisely because it carries no {height}. Bound to the embed genre: the file
  // genre never consults a template at all, so there is nothing to contradict.
  if (
    genre === "embed" &&
    responsive &&
    input.template !== undefined &&
    input.template.includes("{height}")
  )
    return fail(
      "invalid-request",
      `snippet: metadata.height is "responsive" but the supplied template still requires a fixed ` +
        `{height} — drop {height} from the template, or set metadata.height to a number instead of "responsive"`,
    );

  const values: Record<string, string> = {
    url: escapeHtmlAttr(input.url),
    id: escapeHtmlAttr(input.id),
    title: escapeHtmlAttr(m.title),
    // Available to the embed templates too: a newsroom template may legitimately want it, and
    // it was previously an "unknown placeholder" refusal.
    alt: escapeHtmlAttr(m.altText),
    source: escapeHtmlAttr(m.source),
    credit: escapeHtmlAttr(m.credit),
    lang: escapeHtmlAttr(m.lang),
    width: String(m.width ?? 700),
    height: responsive ? "" : String(m.height ?? 420),
  };

  const unknown: string[] = [];
  const rendered = template.replace(PLACEHOLDER, (whole, name: string) => {
    const v = values[name];
    if (v === undefined) {
      unknown.push(whole);
      return whole;
    }
    return v;
  });
  if (unknown.length)
    return fail(
      "invalid-request",
      `snippet: the delivery template carries ${unknown.join(", ")}, which Splash cannot fill — ` +
        `known placeholders are ${Object.keys(values)
          .map((k) => `{${k}}`)
          .join(", ")}`,
    );
  return ok(rendered);
}
