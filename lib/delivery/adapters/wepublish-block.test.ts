import { describe, it, expect } from "bun:test";
import {
  srcdocEscape,
  ownershipMarker,
  carriesMarker,
  buildBlockHtml,
  carrierSlug,
} from "./wepublish-block";
import { isSafeId } from "../../core/id-safety";

describe("srcdocEscape", () => {
  it("should escape the ampersand before the quote, so a quote is never double-escaped", () => {
    // Escaping `"` first would turn `"` into `&quot;` and the following `&`-pass would then
    // rewrite ITS ampersand, yielding `&amp;quot;` — the artifact would render the literal
    // text `&quot;` inside the frame instead of a quote character.
    expect(srcdocEscape(`&"`)).toBe("&amp;&quot;");
  });

  it("should leave a document with no ampersand or quote untouched", () => {
    expect(srcdocEscape("<p>hello</p>")).toBe("<p>hello</p>");
  });

  it("should survive a round-trip through an HTML attribute decode", () => {
    const doc = `<!doctype html><html lang="fr"><head><style>a{content:"é & ü"}</style></head><body><script>if(1&&2){document.title="x"}<\/script></body></html>`;
    const escaped = srcdocEscape(doc);
    // What a browser does when it reads the srcdoc attribute back.
    const decoded = escaped.replace(/&quot;/g, '"').replace(/&amp;/g, "&");
    expect(decoded).toBe(doc);
  });

  it("should not leave a bare double quote that would terminate the attribute early", () => {
    const escaped = srcdocEscape(`<a href="x">`);
    expect(escaped.includes('"')).toBe(false);
  });
});

describe("ownershipMarker / carriesMarker", () => {
  it("should recognise its own marker", () => {
    const html = `${ownershipMarker("primes")}\n<iframe></iframe>`;
    expect(carriesMarker(html, "primes")).toBe(true);
  });

  it("should REFUSE to recognise the marker of a different element", () => {
    // The refusal this predicate exists for: another Splash element's carrier is not this
    // element's to overwrite either.
    const html = `${ownershipMarker("autre")}\n<iframe></iframe>`;
    expect(carriesMarker(html, "primes")).toBe(false);
  });

  it("should be false on an article the newsroom wrote itself", () => {
    expect(carriesMarker("<p>Un papier de la rédaction.</p>", "primes")).toBe(
      false,
    );
  });

  it("should be false on empty or absent content", () => {
    expect(carriesMarker("", "primes")).toBe(false);
    expect(carriesMarker(undefined, "primes")).toBe(false);
  });

  it("should not match a partial id (a prefix must not pass for the whole)", () => {
    const html = ownershipMarker("primes-cantonales");
    expect(carriesMarker(html, "primes")).toBe(false);
  });
});

describe("buildBlockHtml", () => {
  const doc = `<!doctype html><html><body><p>"é"</p></body></html>`;

  it("should lead with the ownership marker, so the next publish can recognise its own carrier", () => {
    const html = buildBlockHtml({
      document: doc,
      id: "primes",
      title: "Les primes montent",
      height: 520,
    });
    expect(html.startsWith(ownershipMarker("primes"))).toBe(true);
    expect(carriesMarker(html, "primes")).toBe(true);
  });

  it("should carry the whole document inside the srcdoc, escaped", () => {
    const html = buildBlockHtml({
      document: doc,
      id: "primes",
      title: "T",
      height: 520,
    });
    expect(html).toContain(`srcdoc="${srcdocEscape(doc)}"`);
  });

  it("should title the frame, because an iframe's title is its accessible name (WCAG 4.1.2)", () => {
    const html = buildBlockHtml({
      document: doc,
      id: "primes",
      title: `Les "primes" & les cantons`,
      height: 520,
    });
    // The title is attribute-escaped too — an unescaped quote would end the attribute and
    // spill editorial text into the markup as bogus attributes.
    expect(html).toContain(`title="Les &quot;primes&quot; &amp; les cantons"`);
  });

  it("should not let the document's own markup escape the srcdoc attribute", () => {
    const hostile = `<p title="x"></iframe><script>alert(1)<\/script>`;
    const html = buildBlockHtml({
      document: hostile,
      id: "primes",
      title: "T",
      height: 400,
    });
    // The property that matters is CONTAINMENT, not the absence of angle brackets: `<` and `>`
    // are legal inside a quoted attribute value, so the document's own `</iframe>` is inert
    // there. Only an unescaped `"` could terminate the attribute early — so the check is that
    // everything after the srcdoc value's closing quote is the tag's own tail, with no leaked
    // document content in it.
    const openedAt = html.indexOf(' srcdoc="') + ' srcdoc="'.length;
    const closedAt = html.indexOf('"', openedAt);
    const tail = html.slice(closedAt + 1);
    expect(tail).toBe(
      ` style="width:100%;border:0" height="400" loading="lazy"></iframe>`,
    );
    // And the whole hostile document really is inside that one attribute.
    expect(html.slice(openedAt, closedAt)).toBe(srcdocEscape(hostile));
  });
});

describe("carrierSlug", () => {
  it("should be deterministic — the same element publishes to the same article, hence the same URL", () => {
    expect(carrierSlug("splash-", "primes")).toBe("splash-primes");
    expect(carrierSlug("splash-", "primes")).toBe(
      carrierSlug("splash-", "primes"),
    );
  });

  it("should stay a safe id, so it can never address something other than itself", () => {
    expect(isSafeId(carrierSlug("splash-", "primes"))).toBe(true);
  });

  it("should tolerate an empty prefix", () => {
    expect(carrierSlug("", "primes")).toBe("primes");
  });
});
