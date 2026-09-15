// twin/skills/chart-web/assets/carry.ts
//
// ANOTHER THING A READER CAN DO TO A PICTURE WITHOUT A SCRIPT, AND IT IS THE SAME MECHANISM.
//
// (Not numbered. `descend.ts` and `floor.ts` both call themselves the eighth; an ordinal in a header
// is a fact that goes stale without anyone editing the file it is in.)
//
// `filter.ts` says what may LEAVE the picture. `stack.ts` says what may MOVE in it. `level.ts` says
// what the picture may be MEASURED AGAINST. `withdraw.ts` says what may be TAKEN OUT of a sum.
// `fold.ts` says what may be LAID OVER what is drawn. `brush.ts` says which SPAN of an axis is
// chosen. `trace.ts` says what may be FOLLOWED through an image. `descend.ts` says what may BECOME
// THE WHOLE. `floor.ts` says what the picture may STAND ON. `benchmark.ts` says what each row is
// JUDGED AGAINST. `datum.ts` says what the picture is MEASURED FROM. This file says **which member
// of a REPEATED SET is carried into every other member's own frame** — one series, stamped into
// every panel of a facet grid at once, on the grid's own shared scale, unchanged. All of them are
// native radio inputs plus CSS generated at build time (`:checked` and `:has()` on the enclosing
// figure, no listener, no state, not one byte of JavaScript), because that is the only kind of
// control this format can promise still works with the script absent.
//
// WHERE IT COMES FROM, AND WHY IT IS SMALL MULTIPLES' OWN AND NOBODY ELSE'S.
//
// Faceting is not a chart type; `chart-beat/references/types/small-multiples.md` opens by saying so.
// It is the decision to TRADE ONE RICH PICTURE FOR MANY IDENTICAL ONES, and everything it buys rests
// on one thing: the panels share a scale. The sheet's single non-negotiable is exactly that — "same
// domain, same axis, same units, on every single panel, full stop, even if that means some panels
// look nearly flat" — and its one failure mode is the moment a panel is fitted to its own data.
//
// So the honesty is bought with a frame, and a frame is a wall. THE GRID MAKES EVERY PANEL
// COMPARABLE AND PUTS EVERY COMPARISON OUT OF REACH: two curves in two boxes never meet, and
// everything that lives at a meeting — who was ahead, for how long, the year the order changed — is
// structurally absent. Not omitted for space. Unreachable, because the panels ARE the type.
//
// Six panels hide fifteen pairs. Drawing them all on a plate is thirty-six panels, which is the
// combinatorial blow-up that made anyone reach for a facet grid in the first place; the other escape
// is the overlay the type sheet names as the thing faceting exists to avoid. A carry is the third
// answer, and only an interactive page can give it: stamp ONE of the six into all six frames, leave
// the grid otherwise untouched, and every crossing the wall was hiding becomes a place where a line
// enters or leaves a mountain.
//
// THREE PROPERTIES, AND EACH ONE IS THE TYPE'S:
//
//   1. ONE ACT, SIX LAYDOWNS. The gesture does not compare two things, it compares one thing to
//      everything, in one move — because a facet grid's unit is not a mark, it is a frame, and there
//      are several of them.
//   2. THE GUEST IS DRAWN FROM THE SET OF HOSTS. The carried member is itself one of the panels, so
//      its own panel shows the silhouette lying exactly under its own line and the reader can SEE
//      that the shape they are reading in five frames is the shape they are reading in the sixth.
//      That reflexivity is what keeps the shared scale honest under the control: there is no second
//      scale to get wrong, because the guest is already on this one.
//   3. NOTHING MOVES. Not a panel, not a name, not a value, not the scale. The owner's first ruling —
//      labels that move under a control read as a bug — costs this file nothing, because a carry adds
//      a shape and subtracts nothing.
//
// WHY IT IS A NEW FILE AND NOT AN OPTION IN ONE OF THE OTHERS.
//
// `fold.ts` is the near miss and the distinction is exact. A fold says "what may be LAID OVER what is
// drawn — one half of a picture, carried across and put down on the other half at its own measured
// values". One guest, ONE HOST, ONE FRAME: its option carries a single outline and a single `host`.
// A facet grid has no single frame. Expressing this control with folds is one option per (guest,
// host) pair — thirty of them for six panels — and the whole reading, *this shape against the entire
// grid at once*, would be gone. The gesture lives at the level of the GRID, which is the level
// `fold.ts` does not have.
//
// `benchmark.ts` fails the other way. It says "what each row is JUDGED AGAINST — one target per row,
// confined to that row's own track, and the verdict every row earns under it". Three differences and
// any one is fatal: its target is ONE SCALAR PER ROW where this is one whole series shared by every
// panel; its target comes from OUTSIDE the data — a bullet's target is the editorial decision that
// sheet warns about — where this one is inside the drawn set by construction; and it produces a
// VERDICT where a carry produces a SHAPE the reader reads themselves.
//
// `level.ts` lays ONE CONSTANT ACROSS ONE PLOT, and its `LevelMark` carries exactly one coordinate
// for exactly that reason. A carried member is a curve, and it is laid into every plot.
//
// WHAT IT EMITS `chart-level-…` IDS AND `data-level-note` FOR, WHICH IS NOT A COPY-PASTE SLIP.
//
// `interaction-plan.ts` discovers what a page SHIPS off the markup and never off a declaration —
// that is the whole point of it — and the two strings it looks for on a control of this shape are
// the id prefix `chart-level-` and the sentence carried on `data-level-note`. `aim.ts` emits
// `chart-stack-…`/`data-stack-note` for the same reason and says so in its own header. Those two
// strings are the format's DISCOVERY CHANNEL, not a claim about which file generated the rules: a
// carry is the yardstick's nearest measured kin (both answer "against what", both owe the reader a
// sentence carrying the derived reading their geometry cannot draw), and `defaultPrintedText` strips
// `data-level-note` from the default state so this control's sentences are measured as REVEALED
// rather than counted as already printed. Everything this file draws carries its own `data-carry-…`
// names, because those are read by nothing but the stylesheet it generates.

/** One reading of the carried member, in the grid's own units. */
export type CarryPoint = { year: number; value: number };

/** What one panel earns against the carried member — the derived reading its silhouette cannot
 *  draw. Baked in the runner from the frozen file, never formatted in the browser
 *  (`chart-web/references/directed-interaction.md`, rule 4). */
export type CarryVerdict = { panel: string; text: string };

/** One member of the set a reader may carry into every frame. */
export type CarryOption = {
  /** The panel this option carries. MUST be one of the drawn panels — see the refusal below. */
  key: string;
  /** The pill's words. */
  label: string;
  /** What a screen reader hears. Must CONTAIN `label` — WCAG 2.5.3. */
  announce: string;
  /** The sentence this option owes the reader, carrying readings the plate does not print. */
  note: string;
  /** The carried member's own readings. Refused unless identical to the series that panel draws. */
  series: CarryPoint[];
  /** One verdict per drawn panel, exactly — including the carried panel's own. */
  verdicts: CarryVerdict[];
};

export type CarryDeclaration = {
  label: string;
  noneLabel: string;
  noneAnnounce: string;
  options: CarryOption[];
};

/** The reserved slug of the untouched option — the grid on its own, which IS the plate. */
export const CARRY_NONE_SLUG = "none";

/** Lowercase, hyphenated, ASCII — the same slugging every file in this family does, so a key with a
 *  space or an accent in it cannot become two different ids in the markup and the stylesheet. */
export function carrySlugOf(key: string): string {
  return String(key)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function carryOptionId(idPrefix: string, slug: string): string {
  return `${idPrefix}${slug}`;
}

export function carryOptionsForMarkup(
  declaration: CarryDeclaration | null | undefined,
  idPrefix: string,
): {
  id: string;
  slug: string;
  label: string;
  announce: string;
  isNone: boolean;
}[] {
  if (!declaration) return [];
  return [
    {
      id: carryOptionId(idPrefix, CARRY_NONE_SLUG),
      slug: CARRY_NONE_SLUG,
      label: declaration.noneLabel,
      announce: declaration.noneAnnounce,
      isNone: true,
    },
    ...declaration.options.map((option) => ({
      id: carryOptionId(idPrefix, carrySlugOf(option.key)),
      slug: carrySlugOf(option.key),
      label: option.label,
      announce: option.announce,
      isNone: false,
    })),
  ];
}

/**
 * THE SENTENCE EACH OPTION OWES THE READER, AND THE DEFAULT GETS NONE.
 *
 * `datum.ts` requires one for its untouched option and gives the reason: there, the untouched state
 * is a reference somebody chose, as chosen as every other. Here it is not. The untouched state is the
 * ABSENCE of the gesture — the grid with nothing carried into it — so a sentence about it would be a
 * caption on a non-event, which is exactly what `filter.ts`, `stack.ts`, `level.ts` and `floor.ts`
 * refuse. This file sides with those four, and it is the shape of the control that decides it, not a
 * preference.
 */
export function carryNotesForMarkup(
  declaration: CarryDeclaration | null | undefined,
): { slug: string; text: string }[] {
  if (!declaration) return [];
  return declaration.options.map((option) => ({
    slug: carrySlugOf(option.key),
    text: option.note,
  }));
}

/** Every silhouette this declaration draws, panel by panel, ready to be emitted as paths: one per
 *  (option, panel) pair, all on the grid's own single projection. */
export function carryShapes(
  declaration: CarryDeclaration | null | undefined,
  panels: string[],
): { slug: string; panel: string; series: CarryPoint[] }[] {
  if (!declaration) return [];
  const out: { slug: string; panel: string; series: CarryPoint[] }[] = [];
  for (const option of declaration.options) {
    const slug = carrySlugOf(option.key);
    for (const panel of panels)
      out.push({ slug, panel, series: option.series });
  }
  return out;
}

/** Every verdict this declaration draws, in the order the panels are drawn — one text per (option,
 *  panel) pair, so a panel is never left wearing the verdict a previous option gave it. */
export function carryVerdicts(
  declaration: CarryDeclaration | null | undefined,
  panels: string[],
): { slug: string; panel: string; text: string }[] {
  if (!declaration) return [];
  const out: { slug: string; panel: string; text: string }[] = [];
  for (const option of declaration.options) {
    const slug = carrySlugOf(option.key);
    const byPanel = new Map(option.verdicts.map((v) => [v.panel, v.text]));
    for (const panel of panels)
      out.push({ slug, panel, text: byPanel.get(panel) as string });
  }
  return out;
}

/**
 * WHAT IS REFUSED, AND WHY EACH ONE IS A PICTURE THAT WOULD LIE.
 *
 * Handed what the beat actually DRAWS — the panels, in the order it draws them, each with the series
 * it draws — plus the grid's own years and its shared ceiling. The same discipline
 * `assertFilterDeclaration`, `assertLevelDeclaration`, `assertFoldDeclaration` and
 * `assertDatumDeclaration` hold: a control that promises more than the plate can show is refused
 * before anything is rendered.
 */
export function assertCarryDeclaration(
  declaration: CarryDeclaration,
  {
    hosts,
    years,
    ceiling,
  }: {
    /** Every panel the beat draws, in drawing order, with the series it actually draws. */
    hosts: { key: string; series: CarryPoint[] }[];
    /** The grid's own shared x domain, in order. */
    years: number[];
    /** The grid's own shared y ceiling, in the data's units. */
    ceiling: number;
  },
): void {
  const where = "carry declaration";
  if (
    !declaration ||
    typeof declaration !== "object" ||
    Array.isArray(declaration)
  )
    throw new Error(
      `${where}: expected an object, got ${JSON.stringify(declaration)}`,
    );
  for (const field of ["label", "noneLabel", "noneAnnounce"] as const)
    if (typeof declaration[field] !== "string" || !declaration[field].trim())
      throw new Error(
        `${where}: \`${field}\` must be the beat's own words — a control with no ${field} is a ` +
          "pill a reader is asked to press on trust",
      );
  if (!declaration.noneAnnounce.includes(declaration.noneLabel))
    throw new Error(
      `${where}: the untouched option announces ${JSON.stringify(declaration.noneAnnounce)}, which ` +
        `does not contain its visible label ${JSON.stringify(declaration.noneLabel)} — WCAG 2.5.3`,
    );
  if (!Array.isArray(declaration.options) || declaration.options.length < 1)
    throw new Error(
      `${where}: needs at least one member to carry, got ${declaration.options?.length ?? 0}. A grid ` +
        "with nothing to carry into it declares no carry.",
    );
  if (!Array.isArray(hosts) || hosts.length < 2)
    throw new Error(
      `${where}: a carry needs a REPEATED SET to be carried through, got ${hosts?.length ?? 0} ` +
        "panel(s). One frame is not a grid, and a shape laid into one frame is a fold (`fold.ts`).",
    );
  if (!Array.isArray(years) || years.length < 2)
    throw new Error(
      `${where}: the grid's shared years must be a list, got ${JSON.stringify(years)}`,
    );
  if (!Number.isFinite(ceiling) || ceiling <= 0)
    throw new Error(
      `${where}: the grid's shared ceiling must be a positive number, got ${ceiling}`,
    );

  const hostByKey = new Map(hosts.map((h) => [h.key, h.series]));
  if (hostByKey.size !== hosts.length)
    throw new Error(
      `${where}: the drawn panels are not unique — ${JSON.stringify(hosts.map((h) => h.key))}`,
    );

  const seen = new Map<string, string>();
  for (const option of declaration.options) {
    if (!option || typeof option !== "object")
      throw new Error(
        `${where}: every option is an object, got ${JSON.stringify(option)}`,
      );
    if (typeof option.label !== "string" || !option.label.trim())
      throw new Error(
        `${where}: every option needs a label — got ${JSON.stringify(option)}`,
      );
    const slug = carrySlugOf(option.key);
    if (!slug)
      throw new Error(
        `${where}: the key ${JSON.stringify(option.key)} slugs to an empty string — rename it`,
      );
    if (slug === CARRY_NONE_SLUG)
      throw new Error(
        `${where}: the key ${JSON.stringify(option.key)} slugs to "${CARRY_NONE_SLUG}", the reserved ` +
          "id of the untouched grid — rename it",
      );
    if (seen.has(slug))
      throw new Error(
        `${where}: ${JSON.stringify(seen.get(slug))} and ${JSON.stringify(option.label)} both slug to ` +
          `${JSON.stringify(slug)} — one radio would drive both`,
      );
    seen.set(slug, option.label);
    for (const field of ["announce", "note"] as const)
      if (typeof option[field] !== "string" || !option[field].trim())
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} has no \`${field}\` — a shape whose ` +
            "answer is only a picture leaves a keyboard reader with nothing",
        );
    if (!option.announce.includes(option.label))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} announces ${JSON.stringify(option.announce)}, ` +
          "which does not contain its own visible label — an accessible name that does not contain " +
          "the visible one is the WCAG 2.5.3 failure, and a reader speaking what they see cannot " +
          "reach this option",
      );

    // THE GUEST IS A MEMBER OF THE SET, AND THIS IS THE REFUSAL THAT MAKES THE GESTURE WHAT IT IS.
    //
    // The obvious extra pill is an average of the panels, or a target from outside the data. Both
    // are refused here, and the reason is not tidiness. A carried shape is read in five frames and
    // CHECKED in the sixth — its own — where it lies exactly under the line it was copied from. A
    // guest with no panel of its own is the only shape on the page a reader cannot verify against
    // itself, and a facet grid's whole claim is that every panel is the same kind of thing drawn the
    // same way. An external target judged against every row is a different gesture with its own file
    // (`benchmark.ts`), and it is a different reading: a verdict, not a shape.
    if (!hostByKey.has(option.key))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} carries ${JSON.stringify(option.key)}, which ` +
          `is not one of the ${hosts.length} panels this grid draws (${hosts.map((h) => h.key).join(", ")}). ` +
          "A carry stamps ONE MEMBER OF THE REPEATED SET into every other member's frame, so the " +
          "reader can check the carried shape against its own panel. A shape with no panel of its " +
          "own — an average, a target, a projection — is the one shape on the page nothing verifies; " +
          "judge rows against an outside target with `benchmark.ts` instead.",
      );

    if (!Array.isArray(option.series))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} carries no series`,
      );

    // THE CARRIED SHAPE IS ON THE GRID'S OWN SCALE, VALUE FOR VALUE — THE TYPE'S FAILURE MODE, MADE
    // MECHANICAL, AND NO OTHER FILE IN THIS FAMILY CAN MAKE IT.
    //
    // `chart-beat/references/types/small-multiples.md`: "letting each panel scale itself
    // independently to its own data ... is the single fastest way to make the whole exercise
    // pointless". The tempting bug on THIS control is the same bug wearing a different hat: refit
    // the carried curve to each host's own range so it "fits" the box it is being laid into. The
    // declaration is refused unless the carried series is IDENTICAL to the series that panel already
    // draws, so the lie cannot be written down in the first place.
    const own = hostByKey.get(option.key) as CarryPoint[];
    if (option.series.length !== own.length)
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} carries ${option.series.length} readings and ` +
          `its own panel draws ${own.length}. The carried shape IS the panel's shape; two lengths ` +
          "is two series wearing one name.",
      );
    for (let i = 0; i < own.length; i += 1) {
      const point = option.series[i];
      if (
        !point ||
        !Number.isFinite(point.value) ||
        !Number.isFinite(point.year)
      )
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} carries a reading with no year or no ` +
            `value — ${JSON.stringify(point)}`,
        );
      if (point.year !== years[i])
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} carries ${point.year} where the grid draws ` +
            `${years[i]}. A carried series that does not cover the grid's own years cannot share its ` +
            "axis at all — a panel with a missing year is not a multiple, and neither is a shape " +
            "laid into one.",
        );
      if (point.value !== own[i].value)
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} carries ${point.value} for ${point.year} ` +
            `and its own panel draws ${own[i].value}. The whole premise of a facet grid is one scale ` +
            "for every panel; a carried shape refitted to the box it is laid into is per-panel " +
            "scaling under another name, and it would make five panels lie at once.",
        );
      if (point.value < 0 || point.value > ceiling)
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} carries ${point.value} in ${point.year}, ` +
            `outside the shared scale 0-${ceiling}. A silhouette clipped at the top of the frame ` +
            "reads as a country that plateaued.",
        );
    }

    // EXACTLY ONE VERDICT PER DRAWN PANEL. A panel this option cannot speak for does not fall silent:
    // it keeps the verdict the previous option gave it, which is a sentence about a comparison
    // nobody is looking at any more.
    if (!Array.isArray(option.verdicts))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} carries no verdicts`,
      );
    const mine = new Map<string, string>();
    for (const verdict of option.verdicts) {
      if (!verdict || typeof verdict.panel !== "string")
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} carries a verdict with no panel — ` +
            JSON.stringify(verdict),
        );
      if (typeof verdict.text !== "string" || !verdict.text.trim())
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} gives ${JSON.stringify(verdict.panel)} no ` +
            "words. A panel that says nothing under a carry is a frame the control abandoned.",
        );
      if (!hostByKey.has(verdict.panel))
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} judges ${JSON.stringify(verdict.panel)}, ` +
            "which this grid does not draw",
        );
      if (mine.has(verdict.panel))
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} judges ${JSON.stringify(verdict.panel)} ` +
            "twice — one panel cannot earn two verdicts against one carried shape",
        );
      mine.set(verdict.panel, verdict.text);
    }
    for (const host of hosts)
      if (!mine.has(host.key))
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} has no verdict for ` +
            `${JSON.stringify(host.key)}. A panel this option cannot speak for keeps the verdict the ` +
            "previous option gave it — a sentence about a comparison nobody is looking at.",
        );

    // AND A VERDICT THAT DOES NOT DISTINGUISH TWO PANELS STANDING DIFFERENTLY IS A SENTENCE ABOUT
    // NOTHING. The verdicts are baked in the runner from the frozen file and nothing in this format
    // re-derives a baked string — so a `verdictOf` that returned one constant, or a copy-paste that
    // gave two rows the same line, would ship six identical captions under six different pictures
    // and no check would see it. This does not re-derive the words (it cannot: they are the beat's
    // own French). It holds the one relation that IS mechanical: two panels whose year-by-year
    // standing against the carried member DIFFERS must not carry the same verdict. Two panels that
    // stand the same way legitimately share one — three countries above the guest in all fifteen
    // years should read alike, and do.
    const patternOf = (host: { key: string; series: CarryPoint[] }) =>
      host.key === option.key
        ? "self"
        : host.series.map((point, i) => (point.value > option.series[i].value ? "1" : "0")).join("");
    const byText = new Map<string, { key: string; pattern: string }[]>();
    for (const host of hosts) {
      const text = mine.get(host.key) as string;
      if (!byText.has(text)) byText.set(text, []);
      byText.get(text)!.push({ key: host.key, pattern: patternOf(host) });
    }
    for (const [text, sharing] of byText) {
      const patterns = new Set(sharing.map((s) => s.pattern));
      if (patterns.size > 1)
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} gives ${sharing.map((s) => JSON.stringify(s.key)).join(" and ")} ` +
            `the same verdict ${JSON.stringify(text)}, and they do not stand the same way against it ` +
            `(${[...patterns].join(" vs ")}, year by year, 1 = above). A caption that is true of two ` +
            "panels with different pictures is a caption the reader cannot use.",
        );
    }

    // AND THE QUESTION THE CONTROL ASKS, HELD TO AN ANSWER. This control's question is *who was
    // ahead, and when did that change*. An option under which no panel ever changes side has drawn a
    // second shape and answered with the ranking the shared ceiling already prints: the reader lays
    // the curve into six frames and learns the order they could already read off the six heights.
    let crossings = 0;
    for (const host of hosts) {
      if (host.key === option.key) continue;
      const above = host.series.map(
        (point, i) => point.value > option.series[i].value,
      );
      for (let i = 1; i < above.length; i += 1)
        if (above[i] !== above[i - 1]) crossings += 1;
    }
    if (crossings === 0)
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} is never crossed by any of the other ` +
          `${hosts.length - 1} panels — not once in ${years.length} years. The question this control ` +
          "asks is who was ahead and when that changed; an option every panel keeps the same side of " +
          "answers it with the ranking the shared ceiling already prints.",
      );
  }

  // TWO PILLS, ONE PICTURE. Two members with the same curve carry the same silhouette into the same
  // frames, and the reader operates the control and watches nothing change.
  const options = declaration.options;
  for (let i = 0; i < options.length; i += 1)
    for (let j = i + 1; j < options.length; j += 1) {
      const a = options[i].series;
      const b = options[j].series;
      if (
        a.length === b.length &&
        a.every((point, k) => point.value === b[k].value)
      )
        throw new Error(
          `${where}: ${JSON.stringify(options[i].label)} and ${JSON.stringify(options[j].label)} carry ` +
            "the same series, reading for reading — two pills, one picture",
        );
    }
}

/**
 * THE STYLESHEET, AND IT IS THE WHOLE MECHANISM. Pure CSS: `:has()` on the scope plus `:checked` on
 * a real radio. No script runs, so the control works with JavaScript off exactly as it works with it
 * on — and the empty string returned for a beat with no declaration is what makes "no dead CSS"
 * literal rather than aspirational.
 *
 * THE BLANKET IS EMITTED FIRST, AND THAT IS DEFENCE RATHER THAN THE MECHANISM — MEASURED, NOT
 * ASSUMED. Every rule inside an option's `:has()` scope scores (1,2,0) against the (0,2,0) blanket,
 * so specificity already decides it. Driven: a build of `proof/web-small-multiples-solar-eu-six`
 * with all three blanket rules moved AFTER every option's rules lights the same 6 silhouettes, the
 * same 6 verdicts and the same 0 washes — the mutation STAYS GREEN. Order is kept anyway because it
 * stops mattering only while the blanket stays unscoped: give it a `:has()` of its own and the two
 * score the same, at which point emission order is the whole mechanism. A sankey on this branch
 * rendered green with zero ribbons lit for exactly that.
 *
 * AND NOTHING HERE SETS `fill` OR `stroke`. An option's rules set `opacity` and nothing else, because
 * `${scope}:has(#id:checked) [data-carry-shape="X"]` weighs (1,2,0) and would silently beat the
 * format's own `.mark-active { fill: … }` at (0,1,0) — the reader would point at a panel and nothing
 * would answer. Every colour on this page is painted once, at low specificity, by the beat.
 *
 * WHY OPACITY AND NOT `display`. The owner's fourth ruling: the change of state interpolates when it
 * can, and `display` is the one property that cannot. Every silhouette and every verdict is rendered
 * in every state and revealed by opacity, so choosing a country fades one grid's worth of shapes in
 * while the panels' own washes fade out, in the same breath, over one duration.
 */
export function carryCss(
  declaration: CarryDeclaration | null | undefined,
  {
    scope,
    idPrefix,
    fadeMs,
  }: {
    scope: string;
    idPrefix: string;
    /** How long a silhouette takes to arrive. Honoured only under `no-preference` — the whole
     *  transition lives inside the query rather than being overridden back, so under `reduce` there
     *  is no transition to resolve at all. */
    fadeMs: number;
  },
): string {
  if (!declaration) return "";
  const ease = "cubic-bezier(0.4, 0, 0.2, 1)";
  const lines: string[] = [
    `/* The carry this beat declared: ${declaration.options.length} member(s) of the grid over`,
    `   ${JSON.stringify(declaration.label)}. Radios plus :checked/:has(), generated once at build`,
    `   time — the same mechanism filter.ts narrows with, and the reason this control needs no`,
    `   script and survives one being blocked. */`,
    `${scope} [data-carry-shape] { opacity: 0; }`,
    `${scope} [data-carry-verdict] { opacity: 0; }`,
    `${scope} [data-carry-own] { opacity: 1; }`,
    `${scope} [data-level-note] { display: none; }`,
    `@media (prefers-reduced-motion: no-preference) {`,
    `  ${scope} [data-carry-shape] { transition: opacity ${fadeMs}ms ${ease}; }`,
    `  ${scope} [data-carry-verdict] { transition: opacity ${fadeMs}ms ${ease}; }`,
    `  ${scope} [data-carry-own] { transition: opacity ${fadeMs}ms ${ease}; }`,
    `}`,
  ];
  for (const option of declaration.options) {
    const slug = carrySlugOf(option.key);
    const at = `${scope}:has(#${carryOptionId(idPrefix, slug)}:checked)`;
    lines.push(
      `${at} [data-carry-shape="${slug}"] { opacity: 1; }`,
      `${at} [data-carry-verdict="${slug}"] { opacity: 1; }`,
      // The panel's own wash steps aside for the shape being laid into it. Two translucent hills
      // read through one another as a third hill that is in neither country's data.
      `${at} [data-carry-own] { opacity: 0; }`,
      `${at} [data-level-note="${slug}"] { display: revert; }`,
    );
  }
  return lines.join("\n");
}

/**
 * The control's own chrome, emitted ONLY for a beat that declared a carry.
 *
 * A DELIBERATE COPY of the segmented treatment `render-web.mjs` gives `.chart-filter`, `floorChromeCss`
 * gives `.chart-floor` and `datumChromeCss` gives `.chart-datum`, BYTE FOR BYTE in its selected-pill
 * rule. The owner has refused that pill three times in three forms and a repair is coming as one pass
 * over all of them; a local variation would be the only one left behind when it lands. The cost of
 * the copy is stated rather than hidden: the format's own block is emitted only for a beat that
 * declared a FILTER, which a beat using this file has not and must not — nothing leaves a facet grid,
 * and a grid that hid a panel would be a comparison with a hole in it.
 *
 * `.options` takes `flex: 0 1 auto` and not `1 1 auto`: the third ruling, and the measurement behind
 * it is 1240 px of frame around 490 px of pills.
 */
export function carryChromeCss({ scope }: { scope: string }): string {
  return `
${scope} .chart-carry {
  flex: 0 0 auto;
  margin: 6px 0 0;
  padding: 0;
  border: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  align-items: center;
  font-size: var(--filter-size);
}
/* float:left is the HTML spec's own opt-out from becoming the "rendered legend" the browser lifts
   into the fieldset's border — inside a flex container the float itself does nothing. Without it the
   legend takes a row of its own, which this format's window-fit rule pays for in plot height. */
${scope} .chart-carry legend { float: left; font-weight: 600; padding: 0; color: var(--ink); }
${scope} .chart-carry .options { display: inline-flex; flex: 0 1 auto; flex-wrap: wrap; gap: 4px 12px; align-items: center; }
${scope} .chart-carry label { position: relative; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; color: var(--muted); }
${scope} .chart-carry input { cursor: pointer; margin: 0; }

/* THE SENTENCE THE CONTROL OWES THE READER. Its row is reserved whether or not a country is carried,
   so choosing one never moves the grid underneath it. role="status" is on the container rather than
   on each note: the notes come and go by display, and a live region that itself comes and goes
   announces nothing. */
${scope} .carry-notes {
  flex: 0 0 auto;
  margin: 2px 0 0;
  min-height: 3em;
  font-size: var(--source-size);
  color: var(--muted);
}
${scope} .carry-notes p { margin: 0; }

@supports selector(:has(*)) {
  ${scope} .chart-carry .options {
    gap: 0;
    padding: 2px;
    border: 1px solid var(--grid);
    border-radius: 999px;
  }
  ${scope} .chart-carry label {
    gap: 0;
    padding: 5px 12px;
    border-radius: 999px;
    line-height: 1.2;
    white-space: nowrap;
    transition: background-color 120ms ease, color 120ms ease;
  }
  ${scope} .chart-carry label input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    -webkit-appearance: none;
    appearance: none;
  }
  ${scope} .chart-carry label:hover { color: var(--ink); }
  ${scope} .chart-carry label:has(input:checked) { background: var(--ink); color: var(--ground); }
  ${scope} .chart-carry label:has(input:focus-visible) { outline: 2px solid var(--ink); outline-offset: 2px; }
}
`.trim();
}
