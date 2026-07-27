// The pure half of the We.Publish adapter: everything the adapter can say before it talks to
// anything. Same split as s3-sign.ts in L2 — the measured facts become assertions that need no
// server, and the network file stays small enough to read.
//
// See docs/superpowers/specs/2026-07-27-l3-wepublish-design.md §4.

/**
 * Escape a document so it can live inside a `srcdoc="…"` attribute.
 *
 * ORDER IS LOAD-BEARING: `&` first, then `"`. Escaping the quote first would produce `&quot;`,
 * and the ampersand pass would then rewrite that ampersand into `&amp;quot;` — the reader would
 * see the literal text `&quot;` inside the frame instead of a quote. Only these two characters
 * need escaping in a double-quoted attribute value; `<` and `>` are legal there and leaving them
 * alone keeps the payload smaller, which matters against the 1 MiB body ceiling (spec W14).
 */
export function srcdocEscape(document: string): string {
  return document.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/**
 * The comment that says "Splash owns this block".
 *
 * It exists for ONE decision: whether an article already sitting at the carrier slug may be
 * overwritten (spec §4.2). It is markup, so it is falsifiable by anyone editing the article by
 * hand — and that is fine, because it defends against an accidental slug COLLISION (a newsroom
 * article whose slug happens to look like ours), not against a deliberate act. The CMS has its
 * own access control for the second thing.
 */
export function ownershipMarker(id: string): string {
  return `<!-- splash:embed id="${id}" -->`;
}

/** Does this block's html belong to THIS element? Absent/foreign/partial ⇒ false. */
export function carriesMarker(
  html: string | undefined | null,
  id: string,
): boolean {
  if (!html) return false;
  // Whole-marker comparison, not a prefix scan: `splash-primes` must not be recognised as the
  // carrier of `primes`. The closing `" -->` is part of what is searched for, which is what
  // makes the id boundary exact.
  return html.includes(ownershipMarker(id));
}

/**
 * Escape a value for an HTML attribute. Used for the frame TITLE, which is editorial text: a
 * takeaway containing a quote would otherwise close the attribute early and spill the rest of
 * the sentence into the markup as bogus attributes.
 */
function attributeEscape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

export type BlockHtmlInput = {
  /** The self-contained artifact, exactly as produce() wrote it. */
  document: string;
  id: string;
  /** The frame's accessible name (WCAG 4.1.2) — the element's confirmed takeaway. */
  title: string;
  height: number;
};

/**
 * The HTML block's content: the ownership marker, then the artifact wrapped in an
 * `<iframe srcdoc>`.
 *
 * The srcdoc wrapper is not decoration (spec §4). Injecting the self-contained document raw
 * would put `<!doctype html><html><head>` inside the block's `<div>` — the innerHTML parser
 * discards those tags — and would leak the artifact's own `<style>` across the newsroom's whole
 * page. The frame gives the visual the same isolation an iframe to Cloudflare or S3 gives it,
 * which is the form the two other hosted adapters already deliver.
 */
export function buildBlockHtml(input: BlockHtmlInput): string {
  const srcdoc = srcdocEscape(input.document);
  const title = attributeEscape(input.title);
  return (
    `${ownershipMarker(input.id)}\n` +
    `<iframe title="${title}" srcdoc="${srcdoc}" ` +
    `style="width:100%;border:0" height="${input.height}" loading="lazy"></iframe>`
  );
}

/**
 * The carrier article's slug.
 *
 * DETERMINISTIC on purpose, and that is what buys the "same link after a revision" behaviour the
 * umbrella spec §3.7 describes: same element ⇒ same slug ⇒ the lookup finds the same article ⇒
 * updateArticle keeps the same id and url (measured, W12). It is also what makes the duplicate
 * slugs the API happily accepts (W10) a problem this adapter never creates.
 */
export function carrierSlug(prefix: string, id: string): string {
  return `${prefix}${id}`;
}
