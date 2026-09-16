// twin/skills/map-web/assets/area-scale.ts
//
// WHAT THE SIZE OF A MARK IS A FUNCTION OF.
//
// `filter.ts` — vendored into this directory beside this file — says what may LEAVE a map. This one
// says what a mark's SIZE MEANS: the exponent that turns a value into a radius, and therefore the
// claim the picture makes about how much bigger the biggest place is. Native radio inputs plus CSS
// generated at build time (`:checked` and `:has()` on the enclosing figure, no listener, no state,
// not one byte of JavaScript), because that is the only kind of control this format can promise
// still works with the script absent.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHY IT EXISTS, AND IT IS THIS TYPE'S OWN NUMBER-ONE FAILURE RATHER THAN A DECORATION.
//
// `map-beat/references/types/proportional-symbol.md` states it in one sentence:
//
//     "don't linear-scale the radius: a symbol's radius must scale with the SQUARE ROOT of the
//     value, because it's the circle's AREA the eye actually compares. Sizing radius directly
//     proportional to value exaggerates every large value quadratically — a value 4x as big reads
//     as a circle roughly 16x the visual area instead of 4x. This is not a style preference; it is
//     a mechanically wrong scale, and it is the difference between an honest bubble map and a
//     misleading one."
//
// Every other map type in the catalogue hides something a reader could in principle go and look up:
// a choropleth hides its class bounds, a cartogram the geography it sacrificed, a flow map
// everything that is not the dominant flow. A SYMBOL MAP HIDES THE EXPONENT, and that absence is of
// a different kind, because it leaves no trace at all. The ranking is right under every law. The
// biggest circle is over the biggest place under every law. There is nothing on the page a reader
// could point at and say "that was a choice" — and yet the spread between the circles, which is the
// only thing the map is FOR, is a free parameter the author set in silence.
//
// A symbol map also has NO AXIS, which is what separates this from the same problem on a chart. A
// bar's length is recovered off a scale the reader can see and check; nothing on a symbol map can be
// checked against anything except a size legend the same exponent drew.
//
// A still can do exactly one thing about that: pick a law, draw it, print the law's name in the
// caveat, and ask to be trusted. This file is the other answer, the one only a page can give — the
// reader holds the exponent and watches the field re-size around an anchor that does not move.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHY IT IS A MAP FILE AND NOT A SEVENTEENTH CHART VOCABULARY, AND WHY IT IS NOT `weigh.ts`.
//
// `chart-web/assets/weigh.ts` is the near miss, and the distinction is exact. A weighing portions ONE
// ink budget out over a set of marks — how much of the page each mark is allowed — and the sizes it
// produces are then facts. This file does not redistribute anything: the budget is identical in every
// state (the largest mark is pinned to the same radius by the anchor refusal below), and what changes
// is the LAW that maps a value onto a size. Two controls could both be described as "the circles
// change size" and mean opposite things, which is precisely the mistake this tree has already paid
// for once — `map-web` REMOVED where `chart-web` DIMMED under one word — so the two live in two files
// with two names.
//
// `filter.ts` fails the other way and fails it cleanly: nothing leaves here. Every one of the drawn
// data is present, at its own place, in every state. A mark that shrank out of sight under a law is
// not filtered — it is ERASED BY THE LAW, which is a reading the control owes the reader in words,
// and `erasedUnder` is what derives it so a note cannot claim a number nobody counted.
//
// Nothing in this file imports out of this skill (`splash/test/no-cross-skill-imports.test.ts` fails
// loud on any specifier that does). In particular it does NOT reach for
// `chart-web/assets/control-chrome.ts`, which is the one place a directed control is drawn: it
// exports `areaScaleChromeSpec()` — the only two things that were ever this control's own, its class
// stem and the measured height its sentences need — and the BEAT, which is not a skill and may import
// across, hands that spec to `controlChromeCss`. No pill is copied, no chrome CSS is written twice,
// and this file has no opinion at all about what a chosen option looks like.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE SPELLINGS ARE THE FORMAT'S DISCOVERY CONTRACT, NOT THIS FILE'S TASTE.
//
// The radio ids are `chart-stack-<slug>` and the sentences sit on `data-stack-note`, exactly as
// `unit.ts`, `aim.ts` and `hold.ts` spell theirs. `interaction-plan.ts` reads radio ids starting
// `chart-stack-`/`mw-stack-` and sentences on `data-stack-note`; a fourth grammar with its own
// spellings would be invisible to the guards written to hold it, and a control the format cannot see
// is a control whose state nothing ever compares against the default.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT TRAVELS, AND WHY IT IS A TRANSFORM AND NOT A RADIUS.
//
// The owner's fourth standing arbitrage: a state change interpolates where it can. The obvious
// implementation sets `r` per option and lets it transition — `r` is an SVG2 geometry property and
// several engines do animate it. It is not the one taken here, for two reasons that are not about
// browser support:
//
//   1. `interaction.mjs` resolves the pointed mark off `cx`/`cy` read ONCE at initialisation. A scale
//      about each circle's OWN fill box leaves both untouched in every state by construction, so the
//      mark that answers a pointer is always the mark under it. Writing `r` would also be safe here;
//      the point is that the invariant is structural rather than remembered.
//   2. A uniform `scale()` cannot make a circle an ellipse. The trunk now holds the plot cell to its
//      own viewBox ratio, and this vocabulary must not be the thing that re-opens the anisotropy that
//      sweep closed — this beat's cell measured 2,107 before it. One factor, both axes, no exception.
//
// `vector-effect="non-scaling-stroke"` on the mark keeps the ring 1px under every factor, so an
// outline neither thickens as a circle grows nor vanishes as one shrinks.

/** One drawn datum: the key its mark carries, and the value the law turns into a radius. */
export type AreaScaleValue = { key: string; value: number };

/**
 * One law. The FIRST declared is the default — the picture the page ships in, the picture a reader
 * with no script never leaves, and the one the beat's title states a claim over.
 */
export type AreaScaleOption = {
  /** The slug is derived from THIS and never from the label — one derivation of one identity, the
   *  defect `filter.ts` records for having had two. */
  key: string;
  /** The pill's visible words, in the beat's own hand. */
  label: string;
  /** The exponent the ratio `value / maxValue` is raised to before it multiplies `maxRadius`. `0.5`
   *  is the honest area law; `1` is the radius law the type sheet calls mechanically wrong. */
  exponent: number;
  /** The radio's accessible name. Must contain `label` (WCAG 2.5.3, "label in name"). */
  announce: string;
  /** The sentence revealed under the control. Required on every option but the default, and refused
   *  ON the default: the untouched picture is not a counterfactual, it is the claim. */
  note?: string;
};

/** What a beat declares when it wants the reader to hold the exponent. Absent/`null` means none. */
export type AreaScaleDeclaration = {
  /** The `<legend>` — what the reader is choosing, in the beat's own words. */
  label: string;
  /** Every datum the map draws. The one list every ratio, every count and every emptiness check is
   *  measured against, so a note can never print a number derived from a different set. */
  values: AreaScaleValue[];
  /** The size legend's own reference magnitudes. They are part of the declaration and not of the
   *  beat, because a legend that does not re-scale with the marks is a legend that lies in every
   *  state but one — `assertOneAreaScale` reads the written page back to say so. */
  keyValues: AreaScaleValue[];
  /** The radius the LARGEST value is drawn at, in the beat's own geometry units. Every law is
   *  normalised to it, so the anchor is the same mark at the same size in every state. */
  maxRadius: number;
  /** Below this radius a circle is not a circle a reader can read. In the same geometry units. */
  floor: number;
  /** The two data the sentences compare: what the beat is about, and what it is read against. */
  subjectKey: string;
  referenceKey: string;
  /** At least two. The first MUST be the area law; see `assertAreaScaleDeclaration`. */
  options: AreaScaleOption[];
};

/** The one honest exponent, named rather than spelled `0.5` in four places. A circle's AREA is
 *  proportional to the square of its radius, so a radius proportional to the square root of the value
 *  is the only law under which the area a reader compares IS the quantity. */
export const AREA_LAW_EXPONENT = 0.5;

/** A CSS-id-safe slug, derived from the option's KEY and never from its label.
 *
 *  @parity-exempt: this family's slug is this file's own and the geo-* walk does not reach here; it
 *  is spelled identically to `filter.ts`'s on purpose, because the two must produce the same string
 *  from the same words if a beat ever carries both controls. */
export function areaScaleSlugOf(key: string): string {
  return String(key).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** The radio id for an option's slug. `chart-stack-` on purpose — see this file's header. */
export function areaScaleOptionId(idPrefix: string, slug: string): string {
  return `${idPrefix}-${slug}`;
}

/**
 * ONE VALUE'S RADIUS UNDER ONE LAW, normalised so the largest value always lands on `maxRadius`.
 *
 * The normalisation is not a convenience. It is what makes the control a control about the EXPONENT
 * rather than about the size of the map: with the anchor pinned, the only thing a reader sees change
 * is the spread between the marks, which is the single quantity the exponent decides. Without it
 * every option would also rescale the whole field, and a reader could not tell which of the two cues
 * had moved — two changes under one name, which is how a control stops being readable.
 */
export function radiusUnder(value: number, maxValue: number, maxRadius: number, exponent: number): number {
  if (!Number.isFinite(value) || value < 0)
    throw new Error(`area scale: ${value} is not a magnitude a circle can be drawn for`);
  if (!Number.isFinite(maxValue) || maxValue <= 0)
    throw new Error(`area scale: the largest value must be positive, got ${maxValue}`);
  if (!Number.isFinite(maxRadius) || maxRadius <= 0)
    throw new Error(`area scale: the anchor radius must be positive, got ${maxRadius}`);
  if (!Number.isFinite(exponent) || exponent <= 0)
    throw new Error(
      `area scale: the exponent must be a positive number, got ${exponent}. A zero or negative ` +
        "exponent draws every place the same size, or draws the smallest place biggest — neither is " +
        "a scale, and both rank the data differently from the data.",
    );
  return maxRadius * Math.pow(value / maxValue, exponent);
}

/** The largest value the declaration draws — the anchor every law is normalised against. */
export function maxValueOf(declaration: AreaScaleDeclaration): number {
  return declaration.values.reduce((most, v) => Math.max(most, v.value), 0);
}

/** Every drawn datum's radius under one law, keyed. What the stylesheet will actually emit. */
export function radiiUnder(declaration: AreaScaleDeclaration, option: AreaScaleOption): Map<string, number> {
  const maxValue = maxValueOf(declaration);
  const out = new Map<string, number>();
  for (const { key, value } of declaration.values)
    out.set(key, radiusUnder(value, maxValue, declaration.maxRadius, option.exponent));
  return out;
}

/** The legend's own radii under one law. Same arithmetic, same anchor — one function, so the key and
 *  the marks can never be sized by two derivations of one law. */
export function keyRadiiUnder(declaration: AreaScaleDeclaration, option: AreaScaleOption): Map<string, number> {
  const maxValue = maxValueOf(declaration);
  const out = new Map<string, number>();
  for (const { key, value } of declaration.keyValues)
    out.set(key, radiusUnder(value, maxValue, declaration.maxRadius, option.exponent));
  return out;
}

/** The biggest radius one legend swatch takes across EVERY declared law — what its box must be sized
 *  to, so the swatch grows inside a box that never changes and the words beside it never travel (the
 *  owner's first standing arbitrage, held by the drawing rather than by a promise). */
export function keyBoxRadius(declaration: AreaScaleDeclaration, keyKey: string): number {
  let most = 0;
  for (const option of declaration.options) {
    const r = keyRadiiUnder(declaration, option).get(keyKey);
    if (r === undefined)
      throw new Error(`area scale: ${JSON.stringify(keyKey)} is not a declared legend magnitude`);
    most = Math.max(most, r);
  }
  return most;
}

/**
 * THE NUMBER THE WHOLE CONTROL IS ABOUT: the ratio of AREAS a reader is shown between the subject and
 * the reference, under one law.
 *
 * Under the area law it equals the ratio of the values exactly, which is the definition of that law
 * being honest. Under any other it does not, and the size of the disagreement is the distortion
 * stated as a number — the thing no still of this map can print, because a still has only one law and
 * nothing to compare it with.
 */
export function shownAreaRatio(declaration: AreaScaleDeclaration, option: AreaScaleOption): number {
  const radii = radiiUnder(declaration, option);
  const subject = radii.get(declaration.subjectKey);
  const reference = radii.get(declaration.referenceKey);
  if (subject === undefined || reference === undefined)
    throw new Error(
      `area scale: the subject ${JSON.stringify(declaration.subjectKey)} or the reference ` +
        `${JSON.stringify(declaration.referenceKey)} is not among the drawn data`,
    );
  if (!(reference > 0))
    throw new Error(
      `area scale: the reference ${JSON.stringify(declaration.referenceKey)} is drawn at radius ` +
        `${reference} under ${JSON.stringify(option.label)} — a ratio against a mark with no area is ` +
        "not a reading",
    );
  return (subject / reference) ** 2;
}

/** The ratio of the two VALUES themselves — the truth every law is measured against, and the only
 *  number on this page that is the same in all three states. */
export function trueRatio(declaration: AreaScaleDeclaration): number {
  const byKey = new Map(declaration.values.map((v) => [v.key, v.value]));
  const subject = byKey.get(declaration.subjectKey);
  const reference = byKey.get(declaration.referenceKey);
  if (subject === undefined || reference === undefined || !(reference > 0))
    throw new Error("area scale: the subject and the reference must both be drawn, positive data");
  return subject / reference;
}

/**
 * THE DATA A LAW ERASES: every key whose mark would be drawn under the legibility floor.
 *
 * Not a rounding detail. A place drawn at a radius under the floor is, on the page, indistinguishable
 * from a place with no data — the same "correctness failure indistinguishable from data simply being
 * missing" the pictogram sheet names for a dropped remainder. The default law is refused outright if
 * it erases anything; a law offered as a COUNTEREXAMPLE may erase, and then it owes the reader the
 * count, derived here rather than typed so a sentence cannot quote a number nobody counted.
 */
export function erasedUnder(declaration: AreaScaleDeclaration, option: AreaScaleOption): string[] {
  const radii = radiiUnder(declaration, option);
  return declaration.values
    .filter(({ key }) => (radii.get(key) as number) < declaration.floor)
    .map(({ key }) => key);
}

/** Everything one option's sentence is allowed to claim, derived. */
export function areaScaleFacts(
  declaration: AreaScaleDeclaration,
  option: AreaScaleOption,
): { shown: number; truth: number; erased: string[] } {
  return {
    shown: shownAreaRatio(declaration, option),
    truth: trueRatio(declaration),
    erased: erasedUnder(declaration, option),
  };
}

/**
 * Refuses every declaration that would render a control the picture cannot honour, before anything is
 * drawn.
 *
 * `fr` is the beat's OWN number formatter — the same one that writes the sentences — because the
 * refusal below is that a note must CONTAIN the derived number, and a vocabulary that formatted it its
 * own way would demand a string the beat never writes. One formatter, one alphabet, one comma.
 */
export function assertAreaScaleDeclaration(
  declaration: AreaScaleDeclaration,
  { fr }: { fr: (value: number, decimals: number) => string },
): void {
  const where = "area scale declaration";
  if (!declaration || typeof declaration !== "object")
    throw new Error(`${where}: expected an object, got ${JSON.stringify(declaration)}`);
  if (typeof declaration.label !== "string" || !declaration.label.trim())
    throw new Error(
      `${where}: \`label\` must be the beat's own words — a control with no legend renders unnamed, ` +
        "and on this type the unnamed thing is the exponent itself",
    );
  if (!Array.isArray(declaration.values) || declaration.values.length < 2)
    throw new Error(`${where}: a scale over fewer than two data is not a scale`);
  const keys = declaration.values.map((v) => v.key);
  if (new Set(keys).size !== keys.length) throw new Error(`${where}: two drawn data share a key`);
  for (const { key, value } of declaration.values)
    if (!Number.isFinite(value) || value <= 0)
      throw new Error(
        `${where}: ${JSON.stringify(key)} is drawn for the value ${value}. A symbol map carries a ` +
          "real, sized magnitude at every place it marks — that is what separates it from a locator.",
      );
  if (!Array.isArray(declaration.keyValues) || declaration.keyValues.length === 0)
    throw new Error(
      `${where}: no legend magnitudes. A proportional symbol map has NO AXIS: the size legend is the ` +
        "only thing that tells a reader what an area means, and a control that changes what an area " +
        "means with no legend to re-scale is the exponent hidden a second time.",
    );
  const maxValue = maxValueOf(declaration);
  for (const { key, value } of declaration.keyValues) {
    if (!Number.isFinite(value) || value <= 0)
      throw new Error(`${where}: the legend magnitude ${JSON.stringify(key)} is ${value}`);
    if (value > maxValue)
      throw new Error(
        `${where}: the legend magnitude ${JSON.stringify(key)} is ${value}, larger than anything the ` +
          `map draws (${maxValue}). A swatch bigger than every mark is a ruler with no reading on it.`,
      );
  }
  if (!Number.isFinite(declaration.maxRadius) || declaration.maxRadius <= 0)
    throw new Error(`${where}: the anchor radius must be positive, got ${declaration.maxRadius}`);
  if (!Number.isFinite(declaration.floor) || declaration.floor <= 0)
    throw new Error(`${where}: the legibility floor must be positive, got ${declaration.floor}`);
  if (!(declaration.floor < declaration.maxRadius))
    throw new Error(
      `${where}: the legibility floor (${declaration.floor}) is not below the anchor radius ` +
        `(${declaration.maxRadius}), so every mark on the map is under it and the refusal below ` +
        "cannot distinguish an erased place from a drawn one",
    );
  if (declaration.subjectKey === declaration.referenceKey)
    throw new Error(
      `${where}: the subject and the reference are both ${JSON.stringify(declaration.subjectKey)} — ` +
        "every law would show a ratio of 1 and the sentences would say nothing",
    );
  if (!keys.includes(declaration.subjectKey) || !keys.includes(declaration.referenceKey))
    throw new Error(
      `${where}: the subject ${JSON.stringify(declaration.subjectKey)} and the reference ` +
        `${JSON.stringify(declaration.referenceKey)} must both be data the map draws`,
    );
  if (!Array.isArray(declaration.options) || declaration.options.length < 2)
    throw new Error(
      `${where}: needs at least two laws to be a choice, got ${declaration.options?.length ?? 0}. A ` +
        "beat that does not hand the reader the exponent declares none.",
    );

  const seenSlug = new Map<string, string>();
  const seenExponent = new Map<number, string>();

  declaration.options.forEach((option, index) => {
    const isDefault = index === 0;
    const at = `${where}: option ${JSON.stringify(option?.label ?? index)}`;
    if (typeof option?.label !== "string" || !option.label.trim())
      throw new Error(`${where}: every option needs a label — got ${JSON.stringify(option)}`);
    const slug = areaScaleSlugOf(option.key);
    if (!slug) throw new Error(`${at} slugs to an empty string — rename its key`);
    if (seenSlug.has(slug))
      throw new Error(
        `${at} and ${JSON.stringify(seenSlug.get(slug))} both slug to ${JSON.stringify(slug)} — one ` +
          "radio would drive both",
      );
    seenSlug.set(slug, option.label);

    // THE DEFAULT IS THE AREA LAW, AND THIS IS THE REFUSAL THE WHOLE FILE IS FOR.
    //
    // The first option is what the page ships in, what a reader with no script receives and never
    // leaves, what every screenshot of this beat shows, and what the title's claim is stated over. A
    // page whose resting state is a distorted scale has not handed the reader the exponent — it has
    // published the wrong map and put an alibi next to it.
    if (isDefault && Math.abs(option.exponent - AREA_LAW_EXPONENT) > 1e-12)
      throw new Error(
        `${at} is the DEFAULT and its exponent is ${option.exponent}, not ${AREA_LAW_EXPONENT}. The ` +
          "resting state of a proportional symbol map is the area law and nothing else: it is the " +
          "picture a reader with no script receives, the picture every still of this page shows, and " +
          "the picture the title's claim is made over. A control that offers the honest law as one " +
          "option among several has not exposed the exponent, it has published a misleading map with " +
          "an alibi beside it (map-beat/references/types/proportional-symbol.md).",
      );
    if (!Number.isFinite(option.exponent) || option.exponent <= 0)
      throw new Error(`${at} has the exponent ${option.exponent}, which draws no scale at all`);
    const twin = [...seenExponent.entries()].find(
      ([exponent]) => Math.abs(exponent - option.exponent) < 1e-12,
    );
    if (twin)
      throw new Error(
        `${at} and ${JSON.stringify(twin[1])} are both exponent ${option.exponent} — two names for ` +
          "one picture is one option and a spare pill",
      );
    seenExponent.set(option.exponent, option.label);

    if (typeof option.announce !== "string" || !option.announce.trim())
      throw new Error(
        `${at} has no \`announce\` — a control whose answer is only a picture leaves a keyboard ` +
          "reader with nothing",
      );
    if (!option.announce.includes(option.label))
      throw new Error(
        `${at} announces ${JSON.stringify(option.announce)}, which does not contain its own visible ` +
          "label — that is the WCAG 2.5.3 failure, and a reader speaking what they see cannot reach " +
          "this option",
      );

    if (isDefault && typeof option.note === "string" && option.note.trim())
      throw new Error(
        `${at} is the default and carries a note. The first option IS the picture the page ships in; ` +
          "a sentence revealed under it would be the title said a second time to a reader who never " +
          "chose anything.",
      );
    if (!isDefault && (typeof option.note !== "string" || !option.note.trim()))
      throw new Error(
        `${at} has no \`note\`. A law the reader asked for that is only a picture cannot be checked — ` +
          "and a reader who is not looking at the map gets nothing at all.",
      );

    // THE ANCHOR IS HELD. Every law puts the largest value on `maxRadius`, so the one cue that changes
    // between states is the SPREAD, which is the one thing the exponent decides.
    const radii = radiiUnder(declaration, option);
    const anchor = declaration.values.find((v) => v.value === maxValue) as AreaScaleValue;
    if (Math.abs((radii.get(anchor.key) as number) - declaration.maxRadius) > 1e-9)
      throw new Error(
        `${at} draws the largest datum ${JSON.stringify(anchor.key)} at ` +
          `${(radii.get(anchor.key) as number).toFixed(4)} where the anchor is ` +
          `${declaration.maxRadius}. With the anchor free, every option rescales the whole field as ` +
          "well as the spread, and a reader cannot tell which of the two cues moved.",
      );

    // A LAW RANKS THE PLACES THE WAY THE DATA DO. Checked against the drawn radii rather than reasoned
    // from the exponent's sign: this is the one assertion that survives someone editing `radiusUnder`.
    const byValue = [...declaration.values].sort((a, b) => b.value - a.value).map((v) => v.key);
    const byRadius = [...declaration.values]
      .sort((a, b) => (radii.get(b.key) as number) - (radii.get(a.key) as number))
      .map((v) => v.key);
    for (let i = 0; i < byValue.length; i += 1)
      if (byValue[i] !== byRadius[i])
        throw new Error(
          `${at} draws ${JSON.stringify(byRadius[i])} where the data rank ` +
            `${JSON.stringify(byValue[i])} — a law that reorders the places is a different map, not a ` +
            "different scale, and the reader was told only the scale had changed",
        );

    const facts = areaScaleFacts(declaration, option);

    // THE DEFAULT ERASES NOTHING. The honest law is also the one every reader without a script is left
    // with, so a datum it drew under the floor would be a datum this page simply does not publish —
    // and the beat's own total would count something the map does not show.
    if (isDefault && facts.erased.length)
      throw new Error(
        `${at} is the default and draws ${facts.erased.length} of ${declaration.values.length} data ` +
          `under the legibility floor of ${declaration.floor} ` +
          `(${facts.erased.slice(0, 5).join(", ")}). On the page those places are indistinguishable ` +
          "from places with no data, and this is the state a reader with no script never leaves. " +
          "Raise the anchor radius or state a coarser study set — do not ship a resting picture that " +
          "drops its own data.",
      );

    if (isDefault) return;

    // THE SENTENCE CARRIES THE DERIVED NUMBERS, NOT AN ADJECTIVE. "This scale exaggerates" is a claim
    // a reader cannot check; "shown 598,3 times bigger, for 24,5 times the capacity" is the
    // measurement, and the sentence is the only channel those two numbers are on.
    const shown = fr(facts.shown, 1);
    const truth = fr(facts.truth, 1);
    if (!option.note!.includes(shown))
      throw new Error(
        `${at} reveals a sentence that does not contain ${JSON.stringify(shown)}, the ratio of AREAS ` +
          "this law actually shows between the subject and the reference. A law offered as a " +
          "counterexample and described only in adjectives asks the reader to take the distortion on " +
          "trust, which is the thing the still already did.",
      );
    if (!option.note!.includes(truth))
      throw new Error(
        `${at} reveals a sentence that does not contain ${JSON.stringify(truth)}, the ratio of the ` +
          "VALUES themselves. A shown ratio with nothing to measure it against is a number, not a " +
          "reading.",
      );
    if (facts.erased.length && !option.note!.includes(fr(facts.erased.length, 0)))
      throw new Error(
        `${at} draws ${facts.erased.length} of ${declaration.values.length} data under the legibility ` +
          `floor (${facts.erased.slice(0, 5).join(", ")}) and its sentence does not say so. A state ` +
          "that silently removes places from a map is the one thing this control must never do " +
          "quietly — the count is derived from the beat's own frozen values, so print it.",
      );
  });
}

/** The options a component draws, in reading order: the default first. */
export function areaScaleOptionsForMarkup(
  declaration: AreaScaleDeclaration | null | undefined,
  idPrefix: string,
): { id: string; slug: string; label: string; announce: string; isDefault: boolean }[] {
  if (!declaration) return [];
  return declaration.options.map((option, index) => ({
    id: areaScaleOptionId(idPrefix, areaScaleSlugOf(option.key)),
    slug: areaScaleSlugOf(option.key),
    label: option.label,
    announce: option.announce,
    isDefault: index === 0,
  }));
}

/** The sentences, default excluded — the rule every sibling vocabulary holds. */
export function areaScaleNotesForMarkup(
  declaration: AreaScaleDeclaration | null | undefined,
): { slug: string; text: string }[] {
  if (!declaration) return [];
  return declaration.options
    .slice(1)
    .map((option) => ({ slug: areaScaleSlugOf(option.key), text: option.note as string }));
}

/**
 * THE STYLESHEET, AND IT IS THE WHOLE MECHANISM. Pure CSS: `:has()` on the scope plus `:checked` on a
 * real radio. No script runs, so the control works with JavaScript off exactly as it works with it on
 * — and the empty string returned for a beat with no declaration is what makes "no dead CSS" literal
 * rather than aspirational.
 *
 * THE SELECTORS ARE ORDERED, NOT WEIGHTED. `${scope} [data-symbol]` and `${scope} [data-symbol="fr"]`
 * score identically — an attribute selector with a value is still one attribute selector — so which
 * wins is source order and nothing else. Every blanket is emitted BEFORE the rules it backs, at the
 * top level and again inside each option's `:has()` scope. A sankey on this branch rendered green
 * with zero ribbons lit for getting exactly this backwards; here the same mistake would ship every
 * state's factor applied at once, which is to say the last one.
 *
 * NO SELECTOR IS GROUPED: a descendant prefix binds to the first selector of a group only, which is
 * the defect `stack.ts` records at length.
 */
export function areaScaleCss(
  declaration: AreaScaleDeclaration | null | undefined,
  { scope, idPrefix, travelMs }: { scope: string; idPrefix: string; travelMs: number },
): string {
  if (!declaration) return "";
  const round = (n: number) => Number(n.toFixed(4));
  const defaultOption = declaration.options[0];
  const baseRadii = radiiUnder(declaration, defaultOption);
  const baseKeyRadii = keyRadiiUnder(declaration, defaultOption);

  const lines: string[] = [
    `/* The scale law this beat declared: ${declaration.options.length} laws over ${JSON.stringify(declaration.label)}.`,
    `   Radios plus :checked/:has(), generated once at build time. The mark is drawn ONCE at the`,
    `   default law's radius and every other state is a uniform scale about its own fill box, so no`,
    `   cx/cy changes in any state and no circle can become an ellipse. */`,
    `${scope} [data-symbol] { transform-box: fill-box; transform-origin: 50% 50%; }`,
    `${scope} [data-key-symbol] { transform-box: fill-box; transform-origin: 50% 50%; }`,
    `${scope} [data-stack-note] { visibility: hidden; }`,
    `${scope} [data-symbol] { transform: scale(1); }`,
    `${scope} [data-key-symbol] { transform: scale(1); }`,
    `@media (prefers-reduced-motion: no-preference) {`,
    `  ${scope} [data-symbol] { transition: transform ${travelMs}ms cubic-bezier(0.4, 0, 0.2, 1); }`,
    `  ${scope} [data-key-symbol] { transition: transform ${travelMs}ms cubic-bezier(0.4, 0, 0.2, 1); }`,
    `}`,
  ];

  for (const option of declaration.options) {
    const slug = areaScaleSlugOf(option.key);
    const at = `${scope}:has(#${areaScaleOptionId(idPrefix, slug)}:checked)`;
    // The option's own blankets FIRST, then its factors. See this function's header.
    lines.push(`${at} [data-symbol] { transform: scale(1); }`);
    lines.push(`${at} [data-key-symbol] { transform: scale(1); }`);
    const radii = radiiUnder(declaration, option);
    for (const { key } of declaration.values) {
      const factor = (radii.get(key) as number) / (baseRadii.get(key) as number);
      if (Math.abs(factor - 1) > 1e-9)
        lines.push(`${at} [data-symbol="${key}"] { transform: scale(${round(factor)}); }`);
    }
    const keyRadii = keyRadiiUnder(declaration, option);
    for (const { key } of declaration.keyValues) {
      const factor = (keyRadii.get(key) as number) / (baseKeyRadii.get(key) as number);
      if (Math.abs(factor - 1) > 1e-9)
        lines.push(`${at} [data-key-symbol="${key}"] { transform: scale(${round(factor)}); }`);
    }
    if (option.note) lines.push(`${at} [data-stack-note="${slug}"] { visibility: visible; }`);
  }
  return lines.join("\n");
}

/**
 * Reads the WRITTEN PAGE back, which is the only place several of these refusals can be made.
 *
 * `descend.ts` earned this shape of guard by mutation and `aim.ts` paid for it a second time:
 * dropping the stylesheet call left every state drawn on top of every other, every attribute
 * perfectly correct, and every declaration-level check green.
 */
export function assertOneAreaScale(
  html: string,
  declaration: AreaScaleDeclaration | null | undefined,
  where = "this page",
): void {
  if (!declaration) return;
  const page = String(html);
  const slugs = declaration.options.map((option) => areaScaleSlugOf(option.key));
  const declaredKeys = new Set(declaration.values.map((v) => v.key));
  const declaredKeyKeys = new Set(declaration.keyValues.map((v) => v.key));

  const drawn = [...page.matchAll(/\sdata-symbol="([^"]*)"/g)].map((m) => m[1]);
  if (drawn.length === 0)
    throw new Error(
      `${where}: not one element carries \`data-symbol\`. The pills would be drawn over a field they ` +
        "cannot reach — the same fact `filter.ts` refuses as an option that tags nothing.",
    );
  for (const key of drawn)
    if (!declaredKeys.has(key))
      throw new Error(
        `${where}: the mark ${JSON.stringify(key)} is drawn and is not one of the ` +
          `${declaredKeys.size} declared data — its size is set by no rule, so it keeps the default ` +
          "law's radius in every state while everything around it re-sizes",
      );
  const undrawn = [...declaredKeys].filter((key) => !drawn.includes(key));
  if (undrawn.length)
    throw new Error(
      `${where}: ${undrawn.length} declared datum/data carry no drawn mark ` +
        `(${undrawn.slice(0, 5).join(", ")}) — the control's own counts and ratios are measured over ` +
        "a set the map does not draw",
    );

  // THE LEGEND RE-SCALES WITH THE MARKS, and this is the refusal this type needs most after the
  // default law itself. A proportional symbol map has no axis: if the size legend keeps the default
  // law's radii while the marks take another law's, then in two states out of three the only
  // instrument on the page for turning an area back into a quantity is calibrated to a scale nothing
  // is drawn in. That is worse than no legend at all, because a reader has no reason to doubt it.
  const swatches = [...page.matchAll(/\sdata-key-symbol="([^"]*)"/g)].map((m) => m[1]);
  if (swatches.length === 0)
    throw new Error(
      `${where}: the declaration names ${declaredKeyKeys.size} legend magnitude(s) and not one ` +
        "element carries `data-key-symbol`. The size legend would stand still while the marks " +
        "re-size, which is an instrument that reads the map correctly in exactly one of its states.",
    );
  for (const key of swatches)
    if (!declaredKeyKeys.has(key))
      throw new Error(
        `${where}: the legend swatch ${JSON.stringify(key)} is drawn and is not a declared magnitude`,
      );

  const need = (needle: string, why: string) => {
    if (!page.includes(needle)) throw new Error(`${where}: ${why} (missing \`${needle}\`)`);
  };
  need(
    "[data-symbol] { transform: scale(1); }",
    "no rule resets a mark's factor, so every state's scale would be applied at once",
  );
  need("[data-key-symbol] { transform: scale(1); }", "no rule resets a legend swatch's factor");
  need(
    "[data-symbol] { transform-box: fill-box; transform-origin: 50% 50%; }",
    "a mark would scale about the SVG's own origin instead of its own centre, which moves every place on the map",
  );
  need("[data-stack-note] { visibility: hidden; }", "every law's sentence would print at once");

  // AND THE BLANKETS MUST COME FIRST, which is a separate fact from their being present. Two
  // attribute selectors score identically; source order is the entire mechanism.
  const blanket = page.search(/\[data-symbol\]\s*\{\s*transform:\s*scale\(1\)/);
  const firstFactor = page.search(/\[data-symbol="[^"]*"\]\s*\{\s*transform:\s*scale\(/);
  if (firstFactor >= 0 && firstFactor < blanket)
    throw new Error(
      `${where}: the stylesheet sets a mark's own factor BEFORE the blanket that resets them all. The ` +
        "two selectors score identically, so the blanket would win and every state would draw the " +
        "default law's radii.",
    );

  for (const slug of slugs)
    if (!new RegExp(`#[\\w-]*${slug}:checked`).test(page))
      throw new Error(
        `${where}: nothing in the page's stylesheet reveals the law ${JSON.stringify(slug)}. A ` +
          "vocabulary a beat brings with it has to emit its own rules: without them every state is " +
          "drawn on top of every other and every attribute is still perfectly correct.",
      );

  for (const option of declaration.options.slice(1)) {
    const slug = areaScaleSlugOf(option.key);
    const at = `:has\\(#[\\w-]*${slug}:checked\\)`;
    if (!new RegExp(`${at} \\[data-symbol\\] \\{ transform: scale\\(1\\); \\}`).test(page))
      throw new Error(
        `${where}: choosing ${JSON.stringify(option.label)} would leave the default law's factors ` +
          "standing under it — the option's own blanket is missing, and two states would be drawn on " +
          "top of each other",
      );
    if (!new RegExp(`${at} \\[data-symbol="[^"]*"\\] \\{ transform: scale\\(`).test(page))
      throw new Error(`${where}: choosing ${JSON.stringify(option.label)} would re-size no mark at all`);
    if (!new RegExp(`${at} \\[data-key-symbol="[^"]*"\\] \\{ transform: scale\\(`).test(page))
      throw new Error(
        `${where}: choosing ${JSON.stringify(option.label)} re-sizes the marks and leaves the size ` +
          "legend at the default law's radii. The legend is the only instrument on a symbol map for " +
          "reading an area back as a quantity, and one calibrated to a scale nothing is drawn in is " +
          "worse than none at all.",
      );
    if (!new RegExp(`${at} \\[data-stack-note="${slug}"\\]`).test(page))
      throw new Error(`${where}: choosing ${JSON.stringify(option.label)} would reveal no sentence`);
  }
}

/**
 * THE ONLY TWO THINGS THAT WERE EVER THIS CONTROL'S OWN — its class stem and the height its sentences
 * need — handed to `chart-web/assets/control-chrome.ts` BY THE BEAT.
 *
 * Nothing here draws a pill, a legend, a rail or a note row. `control-chrome.ts` is the one place a
 * directed control is drawn and it carries the three measured cues of a chosen option (a wash, a ring,
 * darkened words) and the two flex measurements the owner arbitrated; a copy of it here would be the
 * twenty-first copy of a drawing that had to be fixed twenty times or not at all. This file may not
 * import it — no specifier may leave a skill — so the SPEC travels instead of the CSS, and the beat,
 * which is free to import across, makes the one call.
 *
 * `stacked` is not optional for this control. Its sentences carry two derived ratios and a count and
 * they wrap to different heights; revealed by `display` in an un-stacked row they would grow the row
 * and push the MAP down, which on this beat means every circle changes size for a reason that is not
 * the one the reader asked for.
 */
export function areaScaleChromeSpec(): {
  name: string;
  rail: "wrap";
} {
  return {
    name: "area-scale",
    rail: "wrap",
    // NOTHING TO HAND OVER ABOUT THE ROW, AND THAT IS THE REPAIR. This spec carried
    // `notes: { reserve: "4.5em", why, stacked: true }` — a hand-authored three-line height,
    // measured once at 375px. `control-chrome.ts` retired all three keys and now REFUSES a call
    // that still passes one, which is why this beat stopped rendering at all: every direction came
    // back `control chrome (area-scale): notes.reserve no longer exists`. The row is reserved by
    // stacking every sentence in one grid cell, so it is as deep as its own deepest sentence at
    // whatever width the reader's window happens to be, and there is no number here to carry to the
    // next subject.
  };
}
