// F2 — NEWSROOM BRAND PROFILE (house style, first cut: colours only).
//
// A small newsroom won't publish off-brand charts, so on-brand output is close to
// essential for adoption. Splash's default is auto-colour (subject-fit Okabe-Ito);
// this adds an OPT-IN house palette, set once per project (mirroring the fly.io
// "install 1× puis boucle" model). Colours only in this cut — fonts/logo deferred.
//
// The hard part is brand × a11y: a house colour may not be CVD-safe. Policy (b),
// brand-first + warning (decided): the brand colour is applied AS CHOSEN and marked
// `brandExplicit`, so the produce-time a11y guards downgrade a CVD/contrast failure
// to a render-review concern instead of rewriting the colour or hard-failing. Absent
// or invalid brand.json → null → today's auto path, unchanged.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { resolveThemeBg, bgIsDark } from "../../chart-native/src/core/tokens";
import { honoursBaseColor } from "../../chart-native/src/base-colour-reach";
import { importSignerPublicKey, type EditorSigner } from "./editorial-signoff";

export interface BrandProfile {
  /** ordered brand hues (#rrggbb); palette[0] is the primary house colour (may be empty) */
  palette: string[];
  /** optional accent hue (#rrggbb) */
  accent?: string;
  /** default attribution reused across visuals (a per-visual source overrides it) */
  source?: { name: string; url?: string };
  /** default deliverable language (BCP-47) */
  lang?: string;
  /** credit label template ("{name}" placeholder); empty = derived from lang by the producer */
  credit?: string;
  /** house theme, generalized to an ARBITRARY ground: "light" (default) · "dark" · or any
   * #rrggbb background (grey, navy, house pink…). Charts DERIVE their furniture + heatmap ramp
   * from the resolved ground (themeColors/heatmapRamp); MAPS snap it to a basemap by luminance
   * (dark-ish → dataviz-dark, else dataviz-light) AND carry the resolved ground for map furniture.
   * Applied to chart-native + map-native + map-scrolly (map-dw + dw-chart have their own theming
   * — follow-up). A per-element mapStyle / themeBg always overrides it. */
  theme?: string;
  /** registered editor public keys for the editorial sign-off gate (S4d) */
  signers?: EditorSigner[];
  /** signer ids whose editorial sign-off the export path REQUIRES (subset of signers' ids) */
  requiredSigners?: string[];
}

const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * Assemble a validated BrandProfile from loosely-typed fields (shared by the JSON and the
 * markdown parsers). Non-hex palette entries are dropped; an accent alone (no palette) is not a
 * brand. Returns null unless at least ONE usable field is present (palette / source / lang /
 * credit / signers) — so a newsroom that only wants a default source but no house colour is still valid.
 */
function buildProfile(fields: {
  palette?: unknown;
  accent?: unknown;
  source?: unknown;
  lang?: unknown;
  credit?: unknown;
  theme?: unknown;
  signers?: unknown;
  requiredSigners?: unknown;
}): BrandProfile | null {
  const palette = Array.isArray(fields.palette)
    ? fields.palette.filter(
        (c): c is string => typeof c === "string" && HEX.test(c),
      )
    : [];
  const accent =
    typeof fields.accent === "string" && HEX.test(fields.accent)
      ? fields.accent
      : undefined;
  let source: { name: string; url?: string } | undefined;
  if (fields.source && typeof fields.source === "object") {
    const s = fields.source as Record<string, unknown>;
    if (typeof s.name === "string" && s.name.trim()) {
      source = { name: s.name.trim() };
      if (typeof s.url === "string" && s.url.trim()) source.url = s.url.trim();
    }
  }
  const lang =
    typeof fields.lang === "string" && fields.lang.trim()
      ? fields.lang.trim()
      : undefined;
  const credit =
    typeof fields.credit === "string" && fields.credit.trim()
      ? fields.credit.trim()
      : undefined;
  // Accepted theme values: the "dark"/"light" presets OR any #rrggbb ground (an arbitrary house
  // background — grey, navy, pink…); anything else is dropped (never a silent arbitrary theme).
  // Trimmed like the other scalars so a `"dark "` typo still resolves. "light" is the default, but
  // it is kept when declared so a newsroom can pin an explicit light house theme too.
  const themeRaw =
    typeof fields.theme === "string" ? fields.theme.trim() : fields.theme;
  const theme =
    themeRaw === "dark" ||
    themeRaw === "light" ||
    (typeof themeRaw === "string" && HEX.test(themeRaw))
      ? themeRaw
      : undefined;
  const signers: EditorSigner[] = Array.isArray(fields.signers)
    ? fields.signers.flatMap((s): EditorSigner[] => {
        if (!s || typeof s !== "object") return [];
        const rec = s as Record<string, unknown>;
        const id = rec.id;
        const publicKey = rec.publicKey;
        if (
          typeof id !== "string" ||
          !id.trim() ||
          typeof publicKey !== "string"
        )
          return [];
        if (!importSignerPublicKey(publicKey)) {
          console.warn(
            `brand-profile: dropping signer '${id}' — public key is not a valid Ed25519 SPKI key`,
          );
          return [];
        }
        return [{ id: id.trim(), publicKey }];
      })
    : [];
  const requiredSigners: string[] = Array.isArray(fields.requiredSigners)
    ? fields.requiredSigners
        .filter(
          (x): x is string => typeof x === "string" && x.trim().length > 0,
        )
        .map((x) => x.trim())
    : [];
  for (const req of requiredSigners) {
    if (!signers.some((s) => s.id === req))
      throw new Error(
        `brand-profile: requiredSigner '${req}' not registered in signers`,
      );
  }
  if (
    palette.length === 0 &&
    !source &&
    !lang &&
    !credit &&
    !theme &&
    signers.length === 0
  )
    return null;
  const p: BrandProfile = { palette };
  if (accent) p.accent = accent;
  if (source) p.source = source;
  if (lang) p.lang = lang;
  if (credit) p.credit = credit;
  if (theme) p.theme = theme;
  if (signers.length) p.signers = signers;
  if (requiredSigners.length) p.requiredSigners = requiredSigners;
  return p;
}

/**
 * Parse + validate a brand.json string (the machine cache). Returns null when malformed or with
 * no usable field (so the caller falls back to the auto subject-fit path). Pure.
 */
export function parseBrandProfile(text: string): BrandProfile | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return buildProfile({
    palette: o.palette,
    accent: o.accent,
    source: o.source,
    lang: o.lang,
    credit: o.credit,
    theme: o.theme,
    signers: o.signers,
    requiredSigners: o.requiredSigners,
  });
}

/**
 * Load the per-project brand profile (`<projectDir>/brand.json`). Missing file →
 * null (today's auto behaviour, unchanged). Any read/parse problem → null (never
 * throws — a broken brand file must not break production).
 */
export function loadBrandProfile(projectDir: string): BrandProfile | null {
  const path = join(projectDir, "brand.json");
  if (!existsSync(path)) return null;
  try {
    return parseBrandProfile(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Seed a producer spec's colour from the brand palette and mark it brandExplicit —
 * the thread `brand.json → spec → the produce guards` (policy b). The spec keeps an
 * already-chosen baseColor; otherwise it takes the primary house hue. `brandExplicit`
 * is set ONLY when the resulting colour is a genuine house colour (in the palette or
 * the accent) — so an auto subject-fit colour never gains the a11y bypass. Pure.
 */
export function seedBrandColor<
  T extends { baseColor?: string; brandExplicit?: boolean },
>(spec: T, brand: BrandProfile): T {
  const baseColor = spec.baseColor ?? brand.palette[0];
  const isHouseColour =
    brand.palette.includes(baseColor) || brand.accent === baseColor;
  return { ...spec, baseColor, brandExplicit: isHouseColour };
}

// ── Journalist-facing markdown profile (NEWSROOM-PROFILE.md) ──
// The newsroom edits a friendly markdown file; the tool reads clean JSON. This parses the YAML
// frontmatter of NEWSROOM-PROFILE.md into a BrandProfile with a small dependency-free parser
// over the KNOWN, constrained schema (no general YAML). Comments are stripped quote-aware, so a
// quoted hex `"#0A5C36"` survives while a trailing `# note` is dropped.

// Strip a YAML line comment: a `#` that is NOT inside a quoted span AND is at line-start or
// preceded by whitespace (so an unquoted `http://x#frag` and a quoted `"#0A5C36"` both survive,
// while a trailing `  # note` is dropped). Handles both single and double quotes.
function stripComment(line: string): string {
  let inQuote: '"' | "'" | null = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuote) {
      if (c === inQuote) inQuote = null;
    } else if (
      (c === '"' || c === "'") &&
      (i === 0 || /[\s:-]/.test(line[i - 1]))
    ) {
      // A quote OPENS a span only at value-start (line-start or after whitespace / `:` / a list
      // `-`). A quote mid-token (an apostrophe in "L'Observatoire") is a literal, not a delimiter.
      inQuote = c;
    } else if (c === "#" && (i === 0 || /\s/.test(line[i - 1]))) {
      return line.slice(0, i);
    }
  }
  return line;
}

// Strip a surrounding pair of matching single or double quotes (YAML scalars accept both).
function unquote(v: string): string {
  const t = v.trim();
  if (
    t.length >= 2 &&
    ((t.startsWith('"') && t.endsWith('"')) ||
      (t.startsWith("'") && t.endsWith("'")))
  )
    return t.slice(1, -1);
  return t;
}

/**
 * Parse the YAML frontmatter of a NEWSROOM-PROFILE.md into a BrandProfile. Reads only the known
 * fields (palette list, accent, source.name/url, lang, credit, signers, requiredSigners); unknown keys are ignored. No
 * frontmatter, or no usable field → null. Pure.
 */
export function parseNewsroomMarkdown(md: string): BrandProfile | null {
  const fm = md.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/);
  if (!fm) return null;
  const lines = fm[1].split(/\r?\n/).map(stripComment);
  const fields: {
    palette?: string[];
    accent?: string;
    source?: { name?: string; url?: string };
    lang?: string;
    credit?: string;
    theme?: string;
    signers?: { id: string; publicKey: string }[];
    requiredSigners?: string[];
  } = {};
  let i = 0;
  while (i < lines.length) {
    const kv = lines[i].match(/^([A-Za-z_]+):[ \t]*(.*)$/);
    if (!kv) {
      i++;
      continue;
    }
    const key = kv[1];
    const val = kv[2].trim();
    if (key === "palette" && val === "") {
      const items: string[] = [];
      i++;
      // Collect indented `- item` entries; SKIP blank / comment-only lines (they became "" after
      // stripComment) rather than ending the list on them; stop at the next dedented key.
      while (i < lines.length) {
        if (lines[i].trim() === "") {
          i++;
          continue;
        }
        const m = lines[i].match(/^[ \t]+-[ \t]*(.*)$/);
        if (!m) break;
        items.push(unquote(m[1]));
        i++;
      }
      fields.palette = items;
      continue;
    }
    if (key === "source" && val === "") {
      const src: { name?: string; url?: string } = {};
      i++;
      // Indented `name:`/`url:` lines; skip blanks + unknown indented keys; stop at a dedent.
      while (i < lines.length) {
        if (lines[i].trim() === "") {
          i++;
          continue;
        }
        if (!/^[ \t]/.test(lines[i])) break;
        const sm = lines[i].trim().match(/^([A-Za-z_]+):[ \t]*(.*)$/);
        if (sm && (sm[1] === "name" || sm[1] === "url"))
          src[sm[1]] = unquote(sm[2]);
        i++;
      }
      fields.source = src;
      continue;
    }
    if (key === "signers" && val === "") {
      const items: { id: string; publicKey: string }[] = [];
      i++;
      while (i < lines.length) {
        if (lines[i].trim() === "") {
          i++;
          continue;
        }
        const m = lines[i].match(/^[ \t]+-[ \t]*(.*)$/);
        if (!m) break;
        const raw = unquote(m[1]);
        const colon = raw.indexOf(":"); // split on the FIRST colon (base64 has none)
        if (colon > 0)
          items.push({
            id: raw.slice(0, colon).trim(),
            publicKey: raw.slice(colon + 1).trim(),
          });
        i++;
      }
      fields.signers = items;
      continue;
    }
    if (key === "requiredSigners" && val === "") {
      const items: string[] = [];
      i++;
      while (i < lines.length) {
        if (lines[i].trim() === "") {
          i++;
          continue;
        }
        const m = lines[i].match(/^[ \t]+-[ \t]*(.*)$/);
        if (!m) break;
        items.push(unquote(m[1]).trim());
        i++;
      }
      fields.requiredSigners = items;
      continue;
    }
    if (
      val !== "" &&
      (key === "accent" ||
        key === "lang" ||
        key === "credit" ||
        key === "theme")
    )
      fields[key] = unquote(val);
    i++;
  }
  return buildProfile(fields);
}

/**
 * Load the per-project newsroom profile. NEWSROOM-PROFILE.md (the journalist's source of truth)
 * wins: it is parsed and its BrandProfile written to `brand.json` (the machine cache, inspectable)
 * before being returned. If only `brand.json` exists, that is read. Neither → null. Never throws
 * (a broken profile must not break production; a failed cache write is ignored).
 */
export function loadNewsroomProfile(projectDir: string): BrandProfile | null {
  const mdPath = join(projectDir, "NEWSROOM-PROFILE.md");
  if (existsSync(mdPath)) {
    let profile: BrandProfile | null;
    try {
      profile = parseNewsroomMarkdown(readFileSync(mdPath, "utf8"));
    } catch {
      return null;
    }
    if (profile) {
      try {
        writeFileSync(
          join(projectDir, "brand.json"),
          JSON.stringify(profile, null, 2) + "\n",
        );
      } catch {
        // best-effort cache; the in-memory profile is authoritative
      }
    } else {
      // A present-but-unparseable profile is silent branding loss — warn (never throw) so the
      // journalist can fix it, instead of shipping unbranded output with no diagnostic.
      console.warn(
        `[splash] NEWSROOM-PROFILE.md present but no usable profile parsed — house style NOT applied. Check the frontmatter in ${mdPath}.`,
      );
    }
    return profile;
  }
  return loadBrandProfile(projectDir);
}

// Producers whose colour is a single baseColor (charts). The house palette[0] → baseColor.
const CHART_COLOUR_PRODUCERS = new Set(["chart-native", "dw-chart"]);
// Producers whose colour is a RAMP / FILL keyed off a house hue (maps). The house palette is
// carried as brandHue (primary) + brandPalette (for categorical) and the map colour paths derive
// their ramp/fill from it — see skills/map-native/src/theme/house-ramp.ts.
const MAP_COLOUR_PRODUCERS = new Set(["map-native", "map-dw"]);

// How this element's colour is modelled, so the merge seeds the right field. Scrolly is a
// pass-through: a chart-scrolly (spec carries `nativeType`) colours like a chart, a map-scrolly
// (spec carries `type`) like a map. Producer omitted (direct/tested use) → chart default.
function colourKind(
  producer: string | undefined,
  spec: { nativeType?: unknown; type?: unknown },
): "chart" | "map" | "none" {
  if (producer === undefined || CHART_COLOUR_PRODUCERS.has(producer))
    return "chart";
  if (MAP_COLOUR_PRODUCERS.has(producer)) return "map";
  if (producer === "scrolly") return spec.nativeType != null ? "chart" : "map";
  return "none";
}

/**
 * Merge a newsroom profile's fields onto a producer spec — the newsroom DEFAULTS, with the
 * per-element EXPLICIT choice always winning. `source` and `lang` fill only the gaps (universal;
 * an absent value takes the profile's). Colour (only for the colour-consuming producers; when
 * `opts.producer` is omitted, colour applies — the direct-use default): the house `palette[0]`
 * is the newsroom default and OVERRIDES the suggester's AUTO subject-fit colour, because an auto
 * pick is not an editorial choice — the whole point of a house palette is to replace it. For a
 * CHART that means overriding the auto `baseColor`; for a MAP it means overriding the auto ramp
 * `palette` (carried as brandHue/brandPalette AND the auto `palette` CLEARED, since the map colour
 * paths only derive a house ramp/fill when no explicit palette is set). It DEFERS only to a
 * journalist's EXPLICIT per-element colour, flagged `baseColorExplicit`, which is kept (and marked
 * brandExplicit if it happens to be a house hue). An overridden house colour is always brandExplicit
 * (policy b: kept as chosen, a11y downgraded to a render-review concern). A DIVERGING map scale is
 * the one exception: its registry palette is kept and the house colour is not applied (a sequential
 * house luminance ramp cannot encode a signed midpoint — a house diverging ramp is a follow-up).
 * `credit` is carried on the profile for the producer to consume (the lang-derived label already
 * gives the right format per language); a custom-template application is a producer-side
 * follow-up. Null profile → spec unchanged. Pure.
 */
export function mergeProfileDefaults<
  T extends {
    baseColor?: string;
    brandExplicit?: boolean;
    baseColorExplicit?: boolean;
    brandHue?: string;
    brandPalette?: string[];
    nativeType?: string;
    type?: string;
    mapStyle?: string;
    themeBg?: string;
    accent?: string;
    source?: { name: string; url?: string };
    lang?: string;
  },
>(spec: T, profile: BrandProfile | null, opts?: { producer?: string }): T {
  // Non-throwing on a null/non-object spec: a malformed spec must fall through to the validation
  // gate (which fails it loud), never crash the batch (drop-proof) when a profile is present.
  if (!profile || !spec || typeof spec !== "object" || Array.isArray(spec))
    return spec;
  let out = spec;
  const kind = colourKind(opts?.producer, out);
  // A chart-native type that encodes with a frozen role/categorical palette (waterfall,
  // diverging, pie, …) cannot paint its MARKS with the house hue — stamping baseColor/
  // brandExplicit for one announces a colour the render structurally cannot honour on its
  // data marks (D26: a magenta waterfall was proposed AND confirmed, and the chart shipped
  // the increase/decrease/total role palette instead). Read from the engine
  // (honoursBaseColor), never restated here. This narrows ONLY the baseColor/brandExplicit
  // stamp below — accent (a separate editorial-highlight hue Slope also reads, even though
  // Slope is furniture-only for baseColor) and themeBg (furniture, not marks) must still
  // derive from the house profile for these types, so `kind` itself stays untouched.
  const paintsMarksWithHue =
    opts?.producer !== "chart-native" ||
    typeof out.nativeType !== "string" ||
    honoursBaseColor(out.nativeType);
  if (profile.palette.length > 0 && kind !== "none" && paintsMarksWithHue) {
    if (out.baseColorExplicit === true) {
      // The journalist named a colour for THIS element — keep it. For a chart, seedBrandColor
      // keeps the baseColor (brandExplicit if it's a house hue). For a map, the journalist's own
      // palette is already on the spec — leave it untouched.
      if (kind === "chart") out = seedBrandColor(out, profile);
    } else if (kind === "chart") {
      // Auto subject-fit colour (or none) → the house palette is the default and overrides it.
      out = { ...out, baseColor: profile.palette[0], brandExplicit: true };
    } else {
      // Map. The house hue/palette OVERRIDES the suggester's AUTO subject-fit `palette` — an auto
      // pick is not an editorial choice (mirrors the chart branch overriding the auto baseColor).
      // The map colour paths only derive a house ramp/fill when `palette` is UNSET (an explicit
      // palette always wins downstream), so we must CLEAR that auto palette here, otherwise the
      // house colour silently never applies (proven: a live run shipped a purple choropleth despite
      // a green house profile).
      // EXCEPTION — DIVERGING: a diverging scale encodes a signed midpoint (warm↔cool) that a
      // single-hue house LUMINANCE ramp cannot represent. Keep the registry diverging palette and
      // do NOT apply the house colour (a house diverging ramp built from two house hues is a
      // follow-up). scaleType lives on ramp specs; single-hue types have none → never diverging.
      const diverging =
        (out as { scaleType?: string }).scaleType === "diverging";
      if (!diverging) {
        out = {
          ...out,
          brandHue: profile.palette[0],
          brandPalette: profile.palette,
          brandExplicit: true,
        };
        delete (out as { palette?: unknown }).palette;
      }
    }
  }
  // Story accent: a brand accent becomes the editorial-emphasis hue for the charts that render one
  // (Slope/Lollipop/Histogram/RadialBar/Bump read config.accent). Charts without an accent-use site
  // ignore it; absent profile.accent → nothing set (byte-identical). Not applied to maps.
  if (profile.accent && kind === "chart")
    out = { ...out, accent: profile.accent };
  // Newsroom theme (house default): a newsroom pins `theme` ONCE (a "dark" preset or any #rrggbb
  // ground) → every visual inherits it. The resolved GROUND hex (null for the light default) drives
  // both branches; the ground's luminance snaps a map to its light/dark basemap.
  const themeBg = resolveThemeBg(profile.theme);
  // MAP basemap: applies to the map producers that render from a `mapStyle` token (map-native +
  // map-scrolly); map-dw's dark basemap is a Datawrapper-side mechanism the token does not drive
  // (follow-up), so it is excluded. Snap the arbitrary ground to the only two basemaps MapTiler
  // ships (light/dark) BY LUMINANCE. Also carry the resolved ground on the spec so map FURNITURE
  // can derive from it (a later agent wires the map furniture). A per-element override always wins.
  if (
    profile.theme &&
    kind === "map" &&
    (opts?.producer === "map-native" || opts?.producer === "scrolly")
  ) {
    if (out.mapStyle === undefined) {
      out = {
        ...out,
        mapStyle: bgIsDark(profile.theme) ? "dataviz-dark" : "dataviz-light",
      };
    }
    if (themeBg && out.themeBg === undefined) {
      out = { ...out, themeBg };
    }
  }
  // CHART theme: a non-light `theme` → chart-native (and a chart-scrolly track) derive their
  // furniture + heatmap ramp from the resolved ground (ChartFrame + each component via
  // themeColors(config.themeBg)). dw-chart is excluded (Datawrapper has its own theming — follow-up,
  // like map-dw). A per-element `themeBg` always wins. Only set when the ground is non-light (a
  // "light" theme resolves to null → no themeBg → byte-identical light default).
  if (
    themeBg &&
    kind === "chart" &&
    (opts?.producer === "chart-native" || opts?.producer === "scrolly") &&
    out.themeBg === undefined
  ) {
    out = { ...out, themeBg };
  }
  // IMAGE-SCROLLY theme (review F4 — same class as the 2026-07-14 chart/map threading): the
  // engine plumbing already derives scaffold + matte from `story.themeBg`; only this merge
  // threads it. colourKind() is "none" for image-native (no data marks to colour), so this
  // rides OUTSIDE the palette branches. Per-element value always wins.
  if (
    themeBg &&
    opts?.producer === "image-native" &&
    out.themeBg === undefined
  ) {
    out = { ...out, themeBg };
  }
  if (out.source === undefined && profile.source)
    out = { ...out, source: profile.source };
  if (out.lang === undefined && profile.lang)
    out = { ...out, lang: profile.lang };
  return out;
}
