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

const PLACEHOLDER = /\{([a-zA-Z]+)\}/g;

export function renderSnippet(input: SnippetInput): VerbResult<string> {
  const { metadata: m } = input;
  const responsive = m.height === "responsive";
  const template =
    input.template ??
    (responsive ? RESPONSIVE_TEMPLATE : DEFAULT_SNIPPET_TEMPLATE);

  const values: Record<string, string> = {
    url: input.url,
    id: input.id,
    title: m.title,
    source: m.source,
    credit: m.credit,
    lang: m.lang,
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
