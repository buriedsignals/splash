// charter-render.ts — the SECOND attempt at reading a newsroom's house style: open the page in
// a real browser and read the CSS actually applied, for a site whose styles do not exist as a
// fetchable file at all.
//
// charter-fetch.ts's `collectSiteSources` is enough for heidi.news — its CSS is a linked file.
// It is not enough for a site whose styles are built by JavaScript at runtime: a Next.js app
// shipping hashed utility chunks (therecord.media, `lib/newsroom/fixtures/sites/README.md`)
// still LINKS a stylesheet in this particular case, so a bare fetch is not always blind — but a
// site whose `<link>` tags are only ADDED by client-side hydration, or whose colours live only
// in inline `style=""` attributes a runtime library writes onto the DOM, is invisible to a fetch
// no matter what it links. Nothing static can see what only exists after the page has run.
//
// Same total contract as `collectSiteSources`: never throws, always resolves to either the
// `SiteSources` shape `proposeCharter` reads, or `{ error }`. `proposeCharter` cannot tell which
// path fed it — that is the point, so the extraction logic (signal weights, the neutral test,
// the declared/inferred/none ladder) stays in ONE place regardless of how the bytes were read.
//
// The launch function is INJECTABLE (`opts.launch`), which is what makes the contract testable
// without a browser: a launch that throws must produce an error VALUE, never an exception,
// because the setup page this feeds is the one screen that must always render (see the test
// this file ships with). The real browser path — Playwright actually opening a real page — is
// proven by hand in the next task; running it here would put a ~93 MB Chromium download between
// a contributor and a green suite, so this module is imported by the test with `opts.launch`
// substituted and by nothing else in `bun test`.
//
// BOUNDED, and unevenly so — say plainly what is and is not covered, because a comment that
// claims a protection this file does not implement is the exact defect this chantier has
// already fixed twice (see charter-fetch.ts's own history: the same-host lift that opened an
// SSRF hole, closed by vetting every href before fetching it):
//   - The ENTRY address is vetted exactly like the static path. `normalizeSiteUrl` — the same
//     function, not a copy — runs before anything is launched, so the same forbidden-host list
//     (loopback, link-local metadata, RFC1918 ranges, a dotted quad embedded in a hostname)
//     refuses `http://169.254.169.254/` here too, before a browser is even opened.
//   - The LANDING address is vetted too, and this file used to claim that parity without having
//     it: a browser navigation follows redirects, so a pasted `https://redirector.example` that
//     302s to `http://169.254.169.254/latest/meta-data/` answered 200 and its body was read back
//     as the newsroom's page. `isPublicSiteAddress` — the same function the static path re-checks
//     every response with — now runs on `page.url()` straight after `goto`, BEFORE any CSS or
//     markup is pulled out of the page.
//   - What is NOT bounded: once the page is open, it is a real browser executing the page's own
//     JavaScript, and that script can issue requests of its own — a fetch, an image load, a
//     redirect — to whatever address it names. The static path vets every `<link>` href it is
//     about to fetch, one at a time, before fetching it (`collectSiteSources`); there is no
//     equivalent here, because a rendered page's outbound traffic is not a list of hrefs this
//     module reads in advance and can vet — it is arbitrary code running inside Chromium, and
//     stopping it would mean intercepting and re-vetting every request the page context makes,
//     which this task does not implement. The URL is one the journalist typed, not adversarial
//     input in this flow, but a malicious or compromised page opened this way could still probe
//     addresses on the operator's own network the way an unvetted stylesheet href could before
//     charter-fetch.ts's SSRF fix — this file does not close that door, and does not claim to.
import {
  isPublicSiteAddress,
  normalizeSiteUrl,
  type SiteSources,
} from "./charter-fetch.ts";

// ── Tuning knobs ──

/** How long a navigation is given before it counts as unreachable. */
export const RENDER_TIMEOUT_MS = 20_000;
/** Extra time after the network settles, for styles a framework injects just after load. */
export const RENDER_SETTLE_MS = 1_500;
/** How many applied stylesheets are kept, in the order the page lists them — same cap shape as
 *  `MAX_SHEETS` in charter-fetch.ts, so a page with dozens of injected sheets does not balloon
 *  the reading. */
export const MAX_RENDER_SHEETS = 8;
/** Per-sheet character cap — same purpose as `MAX_BYTES` in charter-fetch.ts. */
export const MAX_RENDER_SHEET_CHARS = 2_000_000;
/** Per-sheet rule cap applied INSIDE the page, before the text ever crosses back to Node — a
 *  pathological sheet with hundreds of thousands of rules must not stall serialisation. */
export const MAX_RULES_PER_SHEET = 4_000;

// ── The injectable browser seam ──
//
// Shaped after Playwright's own `Browser`/`Page` (the library already used by lib/verify/capture.ts
// for the render proofs), kept intentionally minimal — only what this module calls. A real
// Playwright `Browser`/`Page` satisfies this structurally; a test substitutes a plain object.

export type RenderResponse = { ok(): boolean; status(): number } | null;

export type RenderPage = {
  goto(
    url: string,
    opts: { waitUntil: "networkidle"; timeout: number },
  ): Promise<RenderResponse>;
  waitForTimeout(ms: number): Promise<void>;
  evaluate<T>(fn: (arg: unknown) => T, arg: unknown): Promise<T>;
  content(): Promise<string>;
  /** Synchronous in Playwright's own Page — the address the browser actually landed on, after
   *  any redirect. */
  url(): string;
  close(): Promise<void>;
};

export type RenderBrowser = {
  newPage(): Promise<RenderPage>;
  close(): Promise<void>;
};

export type LaunchFn = () => Promise<RenderBrowser>;

export type RenderOptions = {
  /** Injectable so the contract is testable with no browser (see the module comment). Defaults
   *  to a real Playwright Chromium, imported lazily so a machine with no browser installed only
   *  fails at CALL time, with a message naming what is missing — not at module load. */
  launch?: LaunchFn;
  timeoutMs?: number;
  settleMs?: number;
};

async function defaultLaunch(): Promise<RenderBrowser> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  return browser as unknown as RenderBrowser;
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// ── What is read inside the page ──

type AppliedStyles = {
  /** Stylesheets whose rule text could actually be read, in document order. `href` is the
   *  sheet's own href, or a fixed label for an inline `<style>` block. */
  sheets: { href: string; css: string }[];
  /** Hrefs of stylesheets the page applies but whose rules this origin refuses to hand back
   *  (a cross-origin sheet with no CORS headers — the browser's own same-origin policy, not a
   *  choice this module makes). */
  blockedHrefs: string[];
  /** Synthetic CSS built from computed styles of brand-carrying elements — a real reading, in
   *  the same declaration shape `scanCss` (charter.ts) already parses, so it flows through the
   *  identical signal detection as a literally-read stylesheet. Present only when reading rule
   *  text left something missing (see `readAppliedStyles`). */
  computedCss: string | null;
};

/**
 * Runs INSIDE the rendered page — written as one self-contained function with no closure over
 * module scope, because Playwright serialises it across the browser boundary (the same
 * discipline `lib/verify/capture.ts`'s `measureInPage` follows). It cannot be exercised by
 * `bun:test` (there is no DOM in that process) — it is proven by hand in the next task, opening
 * a real page.
 *
 * Two read strategies, matching the brief: PRIMARY reads the literal rule text of every applied
 * stylesheet (`document.styleSheets`), which is honest, unmodified CSS. FALLBACK — used only
 * when that leaves a gap (a cross-origin sheet the browser itself refuses to read, or no
 * readable stylesheet at all) — samples the COMPUTED style of the elements a brand colour
 * actually lives on (a link, a button/control, the masthead/logo, the page ground) and writes
 * them back as synthetic CSS declarations shaped exactly like the real ones `scanCss` parses,
 * so the same selector-based signal detection (masthead/link/control/ground) applies to a
 * computed reading exactly as it would to a literal one — no second classification scheme to
 * keep in sync with charter.ts's.
 */
/* c8 ignore start — executed inside the page, not in the test process */
function readAppliedStyles(rawArgs: unknown): AppliedStyles {
  const args = rawArgs as { maxRulesPerSheet: number };
  const sheets: { href: string; css: string }[] = [];
  const blockedHrefs: string[] = [];

  for (const sheet of Array.from(document.styleSheets)) {
    const href = sheet.href ?? "inline <style>";
    try {
      const rules = Array.from(sheet.cssRules ?? []).slice(
        0,
        args.maxRulesPerSheet,
      );
      const css = rules.map((r) => r.cssText).join("\n");
      if (css.trim()) sheets.push({ href, css });
    } catch {
      // A cross-origin stylesheet with no CORS headers throws reading `.cssRules` — the
      // browser's same-origin policy enforcing it, nothing this module decided. Named, not
      // swallowed: an inline `<style>` block (href === null) can never hit this branch, so
      // every entry here is a real, fetchable stylesheet the reading could not open.
      if (sheet.href) blockedHrefs.push(sheet.href);
    }
  }

  // FALLBACK: only when rule-text reading left a real gap — a blocked sheet, or nothing
  // readable at all. A page whose every sheet read cleanly has nothing to make up for.
  let computedCss: string | null = null;
  if (blockedHrefs.length > 0 || sheets.length === 0) {
    const selectorOf = (el: Element): string => {
      const cls = (el.getAttribute("class") ?? "").trim().split(/\s+/)[0];
      if (cls) return `.${cls}`;
      const id = el.getAttribute("id");
      if (id) return `#${id}`;
      return el.tagName.toLowerCase();
    };
    const rules: string[] = [];

    const link = document.querySelector("a[href]");
    if (link) {
      const c = getComputedStyle(link).color;
      if (c) rules.push(`a { color: ${c} }`);
    }

    const control = document.querySelector(
      'button, [class*="btn"], [class*="button"], [class*="cta"], [class*="badge"], [class*="tag"], [class*="pill"], [class*="chip"]',
    );
    if (control) {
      const c = getComputedStyle(control).backgroundColor;
      if (c) rules.push(`${selectorOf(control)} { background-color: ${c} }`);
    }

    const masthead = document.querySelector(
      '[class*="logo"], [class*="masthead"], [class*="brand"], [class*="wordmark"], [id*="logo"]',
    );
    if (masthead) {
      const svg =
        masthead.tagName.toLowerCase() === "svg"
          ? masthead
          : masthead.querySelector("svg");
      if (svg) {
        const fill = getComputedStyle(svg).fill;
        if (fill && fill !== "none")
          rules.push(`${selectorOf(masthead)} svg { fill: ${fill} }`);
      }
    }

    const groundColour = getComputedStyle(document.body).backgroundColor;
    if (groundColour) rules.push(`body { background-color: ${groundColour} }`);

    if (rules.length) computedCss = rules.join("\n");
  }

  return { sheets, blockedHrefs, computedCss };
}
/* c8 ignore stop */

// ── Node-side assembly: total, and readable without a browser ──

function toSiteSources(
  url: string,
  html: string,
  applied: AppliedStyles,
): SiteSources {
  const notes: string[] = [
    "this reading comes from opening the page in a browser and reading the CSS actually applied after the network settled, not from fetching a stylesheet file",
  ];

  const kept = applied.sheets.slice(0, MAX_RENDER_SHEETS);
  if (applied.sheets.length > MAX_RENDER_SHEETS)
    notes.push(
      `${applied.sheets.length} applied stylesheets were read after rendering; the first ${MAX_RENDER_SHEETS} were kept (a colour declared only in a later one was missed)`,
    );

  const sheets = kept.map((s) => ({
    href: s.href,
    css:
      s.css.length > MAX_RENDER_SHEET_CHARS
        ? s.css.slice(0, MAX_RENDER_SHEET_CHARS)
        : s.css,
  }));

  if (applied.blockedHrefs.length) {
    const shown = applied.blockedHrefs.slice(0, 5).join(", ");
    const more =
      applied.blockedHrefs.length > 5
        ? `, and ${applied.blockedHrefs.length - 5} more`
        : "";
    notes.push(
      applied.computedCss
        ? `${applied.blockedHrefs.length} stylesheet(s) the rendered page applies could not be read directly (cross-origin, no CORS headers): ${shown}${more} — the computed style of the page's own link/button/masthead/ground elements was sampled instead, where one existed`
        : `${applied.blockedHrefs.length} stylesheet(s) the rendered page applies could not be read directly (cross-origin, no CORS headers): ${shown}${more}, and no brand-carrying element could be found to read a computed style from instead — those declarations are simply absent from this reading`,
    );
  }

  if (applied.computedCss)
    sheets.push({
      href: "computed styles of the rendered page",
      css: applied.computedCss,
    });

  if (!sheets.length)
    notes.push(
      "no CSS could be read at all, even after rendering — the page may apply no styling of its own, or every stylesheet it applies is cross-origin and unreadable from within it",
    );

  return { url, html, sheets, notes };
}

/**
 * The second attempt: open `url` in a browser, wait for the network to settle, and read the CSS
 * actually applied — for a site whose styles a static fetch cannot see. Same return shape as
 * `collectSiteSources` (charter-fetch.ts), and total in the same way: nothing here throws, a
 * browser that will not start, a page that will not load, or a site that answers with an error
 * status all become `{ error }`.
 */
export async function renderSiteSources(
  rawUrl: string,
  opts: RenderOptions = {},
): Promise<SiteSources | { error: string }> {
  const url = normalizeSiteUrl(rawUrl);
  if (!url) return { error: `not a usable site address: ${rawUrl}` };

  const launch = opts.launch ?? defaultLaunch;
  let browser: RenderBrowser;
  try {
    browser = await launch();
  } catch (e) {
    return {
      error: `could not open a browser to render ${url}: ${errorMessage(e)}`,
    };
  }

  try {
    let page: RenderPage;
    try {
      page = await browser.newPage();
    } catch (e) {
      return {
        error: `could not open a page to render ${url}: ${errorMessage(e)}`,
      };
    }
    try {
      let response: RenderResponse;
      try {
        response = await page.goto(url, {
          waitUntil: "networkidle",
          timeout: opts.timeoutMs ?? RENDER_TIMEOUT_MS,
        });
      } catch (e) {
        return { error: `${url} could not be rendered: ${errorMessage(e)}` };
      }
      if (response && !response.ok())
        return { error: `${url} answered ${response.status()} when rendered` };

      // WHERE THE BROWSER LANDED, vetted before a byte of the page is read. `goto` follows
      // redirects, so the address vetted above is not necessarily the one answering — the same
      // hole the static path closed on its own responses, with the same check. Best-effort read
      // (a test's fake page may not implement `url()`), but a landing address that IS reported
      // and is non-public is a refusal, never a note.
      let finalUrl = url;
      try {
        finalUrl = page.url() || url;
      } catch {
        /* best-effort — the originally-vetted URL is a fine fallback */
      }
      if (!isPublicSiteAddress(finalUrl))
        return { error: `${url} redirected to a non-public address — refused` };

      const settleMs = opts.settleMs ?? RENDER_SETTLE_MS;
      if (settleMs > 0) {
        try {
          await page.waitForTimeout(settleMs);
        } catch {
          /* best-effort — not every fake page in a test implements this */
        }
      }

      let applied: AppliedStyles;
      try {
        applied = await page.evaluate(readAppliedStyles, {
          maxRulesPerSheet: MAX_RULES_PER_SHEET,
        });
      } catch (e) {
        return {
          error: `could not read the CSS applied to ${url}: ${errorMessage(e)}`,
        };
      }

      let html: string;
      try {
        html = await page.content();
      } catch (e) {
        return {
          error: `could not read the rendered markup of ${url}: ${errorMessage(e)}`,
        };
      }

      return toSiteSources(finalUrl, html, applied);
    } finally {
      try {
        await page.close();
      } catch {
        /* best-effort teardown */
      }
    }
  } finally {
    try {
      await browser.close();
    } catch {
      /* best-effort teardown */
    }
  }
}
