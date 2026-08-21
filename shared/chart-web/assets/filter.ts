// twin/skills/chart-web/assets/filter.ts
//
// ONE FILTER VOCABULARY, DECLARED BY THE BEAT.
//
// WHY THIS FILE EXISTS, measured before it was written. Filters were an ad-hoc property of two
// formats and neither could be added or removed by a beat:
//
//   - `map-web` derived a filter from whether its points happened to carry more than one
//     `group`. The legend said "Filter by region" whatever the dimension really was, and the hiding
//     was FOUR hand-written selectors (`.pt`, `.point-label`, `svg.map circle[data-group]`,
//     `.region-table tbody tr`) — four chances to forget the fifth kind of element, which is
//     exactly how B6.18b happened: a filter hid the marks and left their labels on the map.
//   - `chart-web` hard-wired ONE story's dimension into the format's own stylesheet:
//     `#period-early` / `#period-late`, ids belonging to the seed's rainfall beat. Measured on the
//     committed pages the day this file was written: **21 of 21 chart x web pages ship 12 lines of
//     `.chart-filter` CSS and 3 `#period-*` dimming rules, and NOT ONE of them contains a
//     `<fieldset class="chart-filter">`.** Dead machinery in every delivered file — the second thing
//     the owner asked for ("no declaration means no markup, no script, no dead listener") stated as
//     a measurement rather than a worry.
//
// WHAT A BEAT DECLARES. One object, or nothing at all:
//
//     filter: {
//       label: "Filter by region",          // the fieldset's legend — the beat's own words
//       allLabel: "All regions",            // the unfiltered option's words
//       unit: "metro areas",                // the noun the derived note counts
//       options: [
//         { label: "Western Europe", keys: ["paris", "madrid", …] },
//         …
//       ],
//     }
//
// **An option is a NAMED SET OF DATA KEYS, and that is the whole vocabulary.** It is deliberately
// not three kinds of control, because the three things a beat legitimately filters on all reduce to
// it, and reducing them is what lets one mechanism, one stylesheet rule and one guard cover every
// type:
//
//   - a category column  →  keys: rows.filter(r => r.region === "west").map(r => r.key)
//   - a series           →  keys: rows.filter(r => r.series === "coal").map(r => r.key)
//   - a threshold        →  keys: rows.filter(r => r.value >= 5e6).map(r => r.key)
//
// A threshold as a set of named bands is a real control a reader can operate from the keyboard with
// no script; a slider is a second mechanism with its own no-JS story, its own focus behaviour and
// its own accessible name, bought for a capability the bands already give. So there is one kind.
//
// **`data-filter` is a TOKEN LIST, not a single slug**, so nested bands ("Above 5 M", "Above 10 M")
// are expressible without the options having to partition the data. The CSS matches with `~=`.
//
// HOW "everything that value drew disappears together" IS STRUCTURAL RATHER THAN REMEMBERED. Two
// halves, and it takes both:
//
//   1. **One selector, not a list of them.** `filterCss` emits, per option, ONE rule over
//      `[data-filter]` — every element carrying the vocabulary, whatever it is: a mark, a label, a
//      hit target, a table row, a subject note, or the kind of element nobody has drawn yet. There
//      is no per-element-type list to keep in step, which is the thing that came apart.
//   2. **The attributes are handed out, never typed.** A component spreads `attrsFor(key)` onto
//      every element it draws from a datum; `assertOneVocabulary` then reads the rendered markup
//      back and refuses any element carrying `data-key` without the `data-filter` the vocabulary
//      says that key has. A build cannot ship half a tagged datum.
//
// Neither half can see an element drawn from a datum that carries NO attributes at all — an
// orphan `<text>Paris</text>`. That is what the driven guard is for, and it is named here so this
// file is not trusted past its reach: `splash/test/filters-are-declared-or-absent.test.ts`
// walks every committed page in a real browser, clicks every option, and asserts that no element
// whose rendered text is a hidden datum's own name still has a client rect.
//
// THE READER-FACING CONSEQUENCE, and it is not optional. A filtered view is a PARTIAL view, and a
// beat's title states the whole claim. `filterNotes` derives one sentence per option from the
// beat's own frozen data — "Showing Southern Europe — 4 of 13 metro areas" — revealed by the same
// `:checked` mechanism that narrows the marks. The unfiltered option gets no note, because it IS
// the claim. A reader can therefore never be looking at a subset that presents itself as the total.
//
// DUPLICATED, NEVER SHARED. This file is vendored byte-identical into every format that can carry a
// reader-facing control, per the twin's method (`no-cross-skill-imports.test.ts`), and the copies
// are held in step by `splash/test/filter-vocabulary-parity.test.ts`. Nothing in it names a
// class, an id prefix or a format: the scope selector and the id prefix are arguments, because
// `chart-web` scopes on `.chart-figure` and `map-web` on `.map-web-page`.

/** One option: the beat's own words, and the data keys it keeps. */
export type FilterOption = { label: string; keys: string[] };

/** What a beat declares when it wants a filter. Absent/`null` means it wants none. */
export type FilterDeclaration = {
  /** The `<legend>` — what dimension this narrows on, in the beat's own words. */
  label: string;
  /** The unfiltered option's words. It is always first and always the default. */
  allLabel: string;
  /** The noun the derived note counts ("metro areas", "countries", "readings"). */
  unit: string;
  options: FilterOption[];
};

/** The reserved id of the unfiltered option. No declared option may slug to it. */
export const FILTER_ALL_SLUG = "all";

/**
 * A CSS-id-safe slug. The SAME string becomes the radio's `id`, the `data-filter` token every
 * drawn element carries, the token the generated selector quotes, and (on a map) the value the
 * live layer's own `setFilter` compares against. One vocabulary means one function, because the
 * last time two of those were derived differently — the raw group name HTML-escaped into a CSS
 * selector — `Central & Northern Europe` became `[data-group="Central &amp; Northern Europe"]`,
 * matched no element, and one of a beat's three filters emptied the whole map with nothing red.
 *
 *  @parity */
export function slugOf(text: string): string {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Refuses every declaration that would render a control that lies, before anything is drawn.
 *
 * `drawnKeys` is what the beat actually draws — the one list the counts and the emptiness check are
 * measured against, so an option naming keys that are not on the page is caught here rather than by
 * a reader clicking a chip and getting an empty picture.
 */
export function assertFilterDeclaration(
  declaration: FilterDeclaration,
  drawnKeys: string[],
): void {
  const where = "filter declaration";
  if (!declaration || typeof declaration !== "object")
    throw new Error(
      `${where}: expected an object, got ${JSON.stringify(declaration)}`,
    );
  for (const field of ["label", "allLabel", "unit"] as const)
    if (typeof declaration[field] !== "string" || !declaration[field].trim())
      throw new Error(
        `${where}: \`${field}\` must be the beat's own words — a filter with no ${field} renders an unnamed control`,
      );
  if (!Array.isArray(declaration.options) || declaration.options.length < 2)
    throw new Error(
      `${where}: needs at least two options to be a choice, got ${declaration.options?.length ?? 0}. A beat that does not need a filter declares none.`,
    );

  const drawn = new Set(drawnKeys);
  if (drawn.size !== drawnKeys.length)
    throw new Error(
      `${where}: the drawn keys are not unique — ${JSON.stringify(drawnKeys)}`,
    );

  const seen = new Map<string, string>();
  for (const option of declaration.options) {
    if (typeof option?.label !== "string" || !option.label.trim())
      throw new Error(
        `${where}: every option needs a label — got ${JSON.stringify(option)}`,
      );
    const slug = slugOf(option.label);
    if (!slug)
      throw new Error(
        `${where}: the option ${JSON.stringify(option.label)} slugs to an empty string — rename it`,
      );
    if (slug === FILTER_ALL_SLUG)
      throw new Error(
        `${where}: the option ${JSON.stringify(option.label)} slugs to "${FILTER_ALL_SLUG}", the reserved id of the unfiltered option — rename it`,
      );
    if (seen.has(slug))
      throw new Error(
        `${where}: ${JSON.stringify(seen.get(slug))} and ${JSON.stringify(option.label)} both slug to ${JSON.stringify(slug)} — one radio would narrow to both`,
      );
    seen.set(slug, option.label);

    if (!Array.isArray(option.keys))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} has no \`keys\` array`,
      );
    const unknown = option.keys.filter((k) => !drawn.has(k));
    if (unknown.length)
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} names ${unknown.length} key(s) the beat does not draw (${unknown.slice(0, 5).join(", ")}) — the chip would narrow to a picture that is not there`,
      );
    const kept = option.keys.filter((k) => drawn.has(k));
    if (kept.length === 0)
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} keeps none of the ${drawn.size} drawn data — a chip that empties the view is not a reading`,
      );
    if (kept.length === drawn.size && declaration.options.length > 1)
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} keeps every one of the ${drawn.size} drawn data — that is the unfiltered view under a second name (${JSON.stringify(declaration.allLabel)} already is it)`,
      );
  }
}

/**
 * The index every other function in this file reads: data key -> the option slugs it belongs to,
 * in declaration order. Built ONCE per render and threaded, so the attribute a component writes,
 * the selector the stylesheet quotes and the count the note prints cannot be derived three ways.
 */
export function buildFilterIndex(
  declaration: FilterDeclaration | null | undefined,
  drawnKeys: string[],
): Map<string, string[]> {
  const index = new Map<string, string[]>();
  if (!declaration) return index;
  assertFilterDeclaration(declaration, drawnKeys);
  for (const key of drawnKeys) index.set(key, []);
  for (const option of declaration.options) {
    const slug = slugOf(option.label);
    for (const key of option.keys) index.get(key)!.push(slug);
  }
  return index;
}

/**
 * THE ONE THING A COMPONENT CALLS. Spread it onto EVERY element drawn from a datum — its mark, its
 * label, its hit target, its table row, its own sentence in the furniture. Two elements from one
 * datum that do not both carry this are the defect this vocabulary exists to make impossible, and
 * `assertOneVocabulary` reads the rendered markup back to say so.
 *
 * With no filter declared it returns `{}` — no attribute, no residue, nothing for a stylesheet to
 * find. That is the "removable" half of the owner's instruction, at the level of a single element.
 */
export function attrsFor(
  index: Map<string, string[]>,
  key: string,
): Record<string, string> {
  if (index.size === 0) return {};
  const slugs = index.get(key);
  if (!slugs)
    throw new Error(
      `filter: nothing was drawn for the key ${JSON.stringify(key)} — attrsFor was called with a key the index does not know, so the element would be invisible under every option`,
    );
  return { "data-key": key, "data-filter": slugs.join(" ") };
}

/**
 * The stylesheet, and it is the whole hiding mechanism.
 *
 * ONE rule per option, over `[data-filter]` — never a list of element types. Whatever a beat draws
 * from a datum is covered the moment it carries the attribute, including the kind of element that
 * does not exist yet. `~=` matches one whitespace-separated token, so a datum may belong to several
 * options (nested bands) without the options having to partition the data.
 *
 * Pure CSS: `:has()` on the scope plus `:checked` on a real radio. No script runs, so the control
 * works with JavaScript off exactly as it works with it on — and the empty string returned for a
 * beat with no declaration is what makes "no dead CSS" literal rather than aspirational.
 */
export function filterCss(
  declaration: FilterDeclaration | null | undefined,
  { scope, idPrefix }: { scope: string; idPrefix: string },
): string {
  if (!declaration) return "";
  const lines: string[] = [
    `/* The filter this beat declared: ${declaration.options.length} options over ${JSON.stringify(declaration.label)}.`,
    `   One rule per option, over [data-filter] — every element drawn from a hidden datum goes with it. */`,
    `${scope} [data-filter-note] { display: none; }`,
  ];
  for (const option of declaration.options) {
    const slug = slugOf(option.label);
    lines.push(
      `${scope}:has(#${idPrefix}-${slug}:checked) [data-filter]:not([data-filter~="${slug}"]) { display: none; }`,
      `${scope}:has(#${idPrefix}-${slug}:checked) [data-filter-note="${slug}"] { display: revert; }`,
    );
  }
  return lines.join("\n");
}

/** The radio id for an option's slug, and for the unfiltered option. One function, three readers. */
export function filterOptionId(idPrefix: string, slug: string): string {
  return `${idPrefix}-${slug}`;
}

/**
 * The options a component draws, in reading order: the unfiltered one first, because that is the
 * state the beat renders in and the one that carries the whole claim.
 */
export function filterOptionsForMarkup(
  declaration: FilterDeclaration | null | undefined,
  idPrefix: string,
): { id: string; slug: string; label: string; isAll: boolean }[] {
  if (!declaration) return [];
  return [
    {
      id: filterOptionId(idPrefix, FILTER_ALL_SLUG),
      slug: FILTER_ALL_SLUG,
      label: declaration.allLabel,
      isAll: true,
    },
    ...declaration.options.map((option) => {
      const slug = slugOf(option.label);
      return {
        id: filterOptionId(idPrefix, slug),
        slug,
        label: option.label,
        isAll: false,
      };
    }),
  ];
}

/**
 * THE READER-FACING CONSEQUENCE, derived rather than written.
 *
 * A narrowed view is a partial view, and the title above it states the total. One sentence per
 * option, revealed by the same `:checked` that narrows the marks, counting the option's own kept
 * data against everything the beat draws — both numbers read off the beat's frozen data, never
 * typed by an author who might edit one and not the other.
 *
 * The unfiltered option gets NO note on purpose: it is not a subset of anything, and a sentence
 * under it would be furniture that says nothing.
 */
export function filterNotes(
  declaration: FilterDeclaration | null | undefined,
  drawnKeys: string[],
): { slug: string; text: string }[] {
  if (!declaration) return [];
  const drawn = new Set(drawnKeys);
  return declaration.options.map((option) => {
    const kept = option.keys.filter((k) => drawn.has(k)).length;
    return {
      slug: slugOf(option.label),
      text: `Showing ${option.label} — ${kept} of ${drawn.size} ${declaration.unit}.`,
    };
  });
}

/**
 * Reads the RENDERED markup back and refuses a half-tagged datum.
 *
 * The failure it exists for: a component spreads `attrsFor` onto the mark and types the label by
 * hand, so filtering hides the circle and leaves the name floating over the map (B6.18b, found by a
 * person clicking a chip). Every element carrying `data-key` must carry the `data-filter` the
 * vocabulary says that key has — no attribute, a stale one, or one from a different datum all
 * throw, naming the tag and both strings.
 *
 * WHAT IT CANNOT SEE, so it is not trusted past it: an element drawn from a datum that carries no
 * attributes at all is invisible to any markup scan. The driven guard is what covers that, by
 * looking for the datum's own NAME still on screen.
 */
export function assertOneVocabulary(
  markup: string,
  index: Map<string, string[]>,
): void {
  if (index.size === 0) {
    const stray = markup.match(/\sdata-filter(?:-note)?=/);
    if (stray)
      throw new Error(
        `filter: this beat declares no filter, but its markup carries a ${stray[0].trim()} attribute — declare the filter or drop the attribute; a residue is how a beat ends up with a control nobody can operate`,
      );
    return;
  }
  const tags = markup.match(/<[a-zA-Z][^>]*>/g) ?? [];
  let tagged = 0;
  for (const tag of tags) {
    const key = tag.match(/\sdata-key="([^"]*)"/);
    if (!key) continue;
    const expected = index.get(key[1]);
    if (!expected)
      throw new Error(
        `filter: an element carries data-key="${key[1]}", which is not one of the ${index.size} drawn data — ${tag.slice(0, 120)}`,
      );
    const actual = tag.match(/\sdata-filter="([^"]*)"/);
    if (!actual)
      throw new Error(
        `filter: an element drawn from "${key[1]}" carries no data-filter, so a narrowed view would leave it behind while its siblings disappear — ${tag.slice(0, 120)}`,
      );
    if (actual[1] !== expected.join(" "))
      throw new Error(
        `filter: an element drawn from "${key[1]}" carries data-filter="${actual[1]}" where the vocabulary says "${expected.join(" ")}" — two derivations of one string is how a filter narrows to the wrong set`,
      );
    tagged++;
  }
  if (tagged === 0)
    throw new Error(
      `filter: ${index.size} data are filterable and NOT ONE element in the markup carries data-key — the control would be drawn over a picture it cannot narrow`,
    );
}
