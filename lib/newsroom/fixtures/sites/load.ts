// load.ts — reads a captured site fixture from disk and shapes it as the `SiteSources`
// `proposeCharter` expects. No network: the HTML and (at most one) stylesheet were captured by
// hand, once — see README.md in this directory for when, from where, and with what command.
//
// The set of stylesheets that reaches `proposeCharter` is decided by the REAL `stylesheetHrefs`
// from charter-fetch.ts, not a copy of its logic here. That is deliberate: it is what makes
// charter-fixtures.test.ts a true PIN of production behaviour rather than a test of a
// hand-rolled stand-in. Today `stylesheetHrefs` keeps same-host sheets only, so a fixture whose
// captured stylesheet lives on another host (heidi.news, served from its own CDN) is captured
// anyway but held back by the loader — exactly mirroring what `collectSiteSources` would do live.
// The day that filter lifts (task 2 of this chantier), this loader starts passing it through with
// no code change here: only the pinned numbers in charter-fixtures.test.ts move.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { stylesheetHrefs } from "../../charter-fetch.ts";
import type { SiteSources } from "../../charter.ts";

const DIR = import.meta.dir;

/**
 * The page URL used at capture time, and the href of the one stylesheet captured alongside it
 * (when the capture command found one). Kept as a small explicit table rather than re-derived
 * from the HTML at load time: three fixtures do not warrant re-parsing, and a hardcoded href is
 * one a reviewer can check against README.md by eye.
 */
const FIXTURES: Record<string, { url: string; cssHref?: string }> = {
  "heidi-news": {
    url: "https://www.heidi.news/",
    cssHref:
      "https://heidi-17455.kxcdn.com/assets/heidi-8cc89e35b42fa6e471837638cc00c4c708e4b33db81e43c9de7882418a2d2fff.css",
  },
  "therecord-media": {
    url: "https://therecord.media/",
    cssHref: "https://therecord.media/_next/static/chunks/3t3yknc51puyw.css",
  },
  "restofworld-org": {
    url: "https://restofworld.org/",
    cssHref:
      "https://restofworld.org/wp-content/themes/orbis/static-assets/dist/css/page.min.css?ver=gei88-page",
  },
};

/**
 * Load a captured site as `SiteSources`, filtered through today's real stylesheet-selection
 * rule. Throws on an unknown name or a missing fixture file — a pinning test that silently ran
 * on nothing would be worse than one that fails to start.
 */
export function loadSiteFixture(name: string): SiteSources {
  const fixture = FIXTURES[name];
  if (!fixture) throw new Error(`no site fixture named "${name}"`);

  const html = readFileSync(join(DIR, `${name}.html`), "utf8");

  const sheets: { href: string; css: string }[] = [];
  if (fixture.cssHref) {
    // Same rule `collectSiteSources` applies live: only a stylesheet the real filter would have
    // kept gets attached. `stylesheetHrefs` returns absolute, deduped hrefs in document order.
    const kept = stylesheetHrefs(html, fixture.url).includes(fixture.cssHref);
    if (kept) {
      sheets.push({
        href: fixture.cssHref,
        css: readFileSync(join(DIR, `${name}.css`), "utf8"),
      });
    }
  }

  return { url: fixture.url, html, sheets };
}
