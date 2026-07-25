// The embed snippet a newsroom pastes into its CMS. PURE — no I/O, no clock, no environment.
//
// An unknown placeholder is a REFUSAL, not a pass-through: a literal "{width}" left inside
// published HTML is a defect invisible from Splash and visible to the reader. That is the one
// opinion this module holds.
import type { DeliveryMetadata } from "../core/publishers";
import { fail, ok, type VerbResult } from "../core/verbs/types";

export type SnippetInput = {
  url: string;
  id: string;
  metadata: DeliveryMetadata;
  /** The newsroom's tested template. Absent ⇒ DEFAULT_SNIPPET_TEMPLATE. */
  template?: string;
};

export const DEFAULT_SNIPPET_TEMPLATE =
  '<iframe src="{url}" title="{title}" width="{width}" height="{height}" style="border:0;max-width:100%" loading="lazy"></iframe>';

const RESPONSIVE_TEMPLATE =
  '<iframe src="{url}" title="{title}" style="border:0;width:100%;max-width:{width}px;aspect-ratio:16/9" loading="lazy"></iframe>';

// Any brace-delimited token, not just alnum names: an underscore/hyphen/digit-bearing
// placeholder (e.g. "{utm_source}") must still be caught as unfillable rather than silently
// passed through — a narrower pattern was the original defect (fix round 1, critical 1).
const PLACEHOLDER = /\{([^{}]+)\}/g;

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
  const responsive = m.height === "responsive";
  const template =
    input.template ??
    (responsive ? RESPONSIVE_TEMPLATE : DEFAULT_SNIPPET_TEMPLATE);

  // A responsive sizing rule and a custom template that still demands {height} contradict each
  // other: only the newsroom can resolve which one wins, so this is a refusal, not a silent
  // empty attribute (fix round 1, important 3). The built-in RESPONSIVE_TEMPLATE is exempt — it
  // is chosen precisely because it carries no {height}.
  if (
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
