/**
 * TWO RECORDS THAT AGREE TO FIVE DECIMAL PLACES ARE BOTH MEASURING THE SITE, NOT THE PIECE.
 *
 * THE DEFECT, MEASURED, AND THE ONLY GUARD THAT COULD HAVE CAUGHT IT. `harvest.mjs` photographs the
 * largest painted `svg | canvas | figure img` and calls it the graphic. On several sites that
 * element is the wordmark — `100.datavizproject.com` serves `logo-100.svg` at 280 x 80 — and the
 * pixel route then falls back to the whole page. What it reports is the site's chrome: a fixed
 * navigation bar, a promotional banner, a cookie strip.
 *
 * Three separate harvests found this independently and none of them found it by looking. It is
 * invisible to the eye because the numbers are PLAUSIBLE: Ferdio's nav bar is `#3274DA`, the same
 * blue its charts are drawn in. What gives it away is arithmetic. Two DIFFERENT pieces cannot
 * produce the same colour at the same coverage to five decimal places — unless what was measured
 * was not the pieces. Seven `(hex, share)` pairs were bit-identical across four Information is
 * Beautiful records, and for two of them the entire top ten contained no pixel of the graphic.
 *
 * `doctrine/references/reference-set.md` has a rule for this shape of error — look at the actual
 * pixels — and here it is not enough. The eye confirms a plausible number. Only the comparison
 * refutes it.
 */
import { describe, it, expect } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const REFS = join(ROOT, "docs", "design-base", "references");

/** Two shares this close are the same share: a coverage fraction over ~10^6 pixels does not
 *  coincide by chance. */
const SAME_SHARE = 1e-9;
/** Below this many shared entries two records may legitimately agree — a white ground and a black
 *  ink are common property. */
const SUSPICIOUS_OVERLAP = 3;

const dirsIn = (p: string) =>
  existsSync(p) ? readdirSync(p).filter((n) => statSync(join(p, n)).isDirectory()) : [];

/**
 * Two urls are the same PAGE when they differ only in scheme, `www.` or a trailing slash.
 *
 * Measured: ProPublica's *Workers' Compensation Reforms by State* is filed twice on purpose — under
 * `heatmap` for its state x year matrix and under `paired` for the three dated cartograms above it,
 * two real forms on one page. The two records agree on twenty colours to five decimals because they
 * ARE the same page, and one was filed as `http://` and the other as `https://`. A comparison that
 * cannot see that reports the corpus's most deliberate entry as its worst defect.
 *
 * This does not let the same piece count twice for evidence: the floor counts PUBLICATIONS, read off
 * the host, so ProPublica counts once whether it is filed once or twice.
 */
function samePage(a: string, b: string): boolean {
  const key = (u: string) => {
    const parsed = new URL(u);
    return parsed.hostname.replace(/^www\./, "") + parsed.pathname.replace(/\/$/, "");
  };
  return key(a) === key(b);
}

type Record_ = { family: string; id: string; url: string; entries: Array<{ hex: string; share: number }> };

function records(): Record_[] {
  const out: Record_[] = [];
  for (const family of dirsIn(REFS))
    for (const id of dirsIn(join(REFS, family))) {
      const path = join(REFS, family, id, "measured.json");
      if (!existsSync(path)) continue;
      const r = JSON.parse(readFileSync(path, "utf8"));
      if (r.routes?.pixel?.state !== "ok" || !r.pixel) continue;
      const entries = [...(r.pixel.chromatic ?? []), ...(r.pixel.neutral ?? [])].map((c: any) => ({
        hex: c.hex,
        share: c.share,
      }));
      out.push({ family, id, url: r.url, entries });
    }
  return out;
}

describe("the pixel route", () => {
  it("should never give two different pieces the same colour at the same coverage", () => {
    const all = records();
    const findings: string[] = [];

    for (let i = 0; i < all.length; i += 1)
      for (let j = i + 1; j < all.length; j += 1) {
        const a = all[i];
        const b = all[j];
        if (samePage(a.url, b.url)) continue;
        const shared = a.entries.filter((x) =>
          b.entries.some((y) => y.hex === x.hex && Math.abs(y.share - x.share) < SAME_SHARE),
        );
        if (shared.length >= SUSPICIOUS_OVERLAP)
          findings.push(
            `${a.family}/${a.id} and ${b.family}/${b.id} share ${shared.length} colours at ` +
              `identical coverage (${shared.slice(0, 3).map((s) => `${s.hex} ${(s.share * 100).toFixed(2)}%`).join(", ")}) — ` +
              `two different pieces cannot do that; both measured the site around them`,
          );
      }

    expect(findings).toEqual([]);
  });
});
