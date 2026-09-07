// twin/shared/chart-beat/registers.mjs
//
// THE ONE INTERFACE BETWEEN THE DESIGN BASE'S TWO AXES.
//
// A TREATMENT is conditional and plural: it applies when the data has a shape, several apply to one
// beat, and an arbiter resolves them. A DIRECTION is global and exclusive: exactly one governs a
// beat, and directions never compose. They meet here and only here — a treatment names the REGISTER
// it writes into, a direction says what that register LOOKS like, and neither knows the other's
// internals.
//
// That is what lets a treatment compose across every direction and a direction apply across every
// treatment. The probes that produced this design proved the alternative by doing it wrong: they
// hard-coded `.toUpperCase()` at four call sites and an italic ternary at six, so each treatment
// silently knew whether its direction shouted. Adding a seventh direction would have meant editing
// every treatment.
//
// See `docs/splash/2026-09-07-design-base-treatments-and-directions-spec.md` §4, and the filed
// directions under `docs/design-base/directions/`.

/**
 * Six, and the list is CLOSED. A seventh register is a design decision taken across the whole
 * system — every direction must then answer for it — not a convenience added by whichever beat
 * happened to need one.
 */
export const REGISTERS = Object.freeze(["display", "eyebrow", "body", "axis", "annot", "value"]);

/**
 * INK IS A ROLE, NEVER A COLOUR, and this is the rule that keeps a dark direction legible.
 *
 * `doctrine/references/visual-system.md`: every visible non-data layer is computed from the
 * newsroom's own ground, never written as a literal — "a component that hard-codes `#FFFFFF` for
 * its background or `#1A1A1A` for its ink will render correctly for exactly one newsroom and
 * silently break for every other one." A direction that named a literal here would reintroduce
 * exactly that. `deriveFurniture` resolves these three against the real ground at draw time.
 */
const INK_ROLES = Object.freeze(["ink", "muted", "accent"]);

/**
 * A register resolved into the attributes an SVG `<text>` element actually takes.
 *
 * @param {{id?: string, registers: Record<string, object>}} direction
 * @param {string} name  one of `REGISTERS`
 * @returns {{fontFamily: string, fontSize: number, fontWeight: number, fontStyle: "normal"|"italic", letterSpacing: number, transform: string, ink: "ink"|"muted"|"accent"}}
 */
export function resolveRegister(direction, name) {
  if (!REGISTERS.includes(name))
    throw new Error(`no such register: ${name} — the six are ${REGISTERS.join(", ")}`);

  const spec = direction?.registers?.[name];
  if (!spec)
    throw new Error(
      `direction ${direction?.id ?? "(unnamed)"} defines no ${name} register, and a treatment is asking to write into it`,
    );

  if (!INK_ROLES.includes(spec.ink))
    throw new Error(
      `register ${name} asks for ink role "${spec.ink}", not one of ${INK_ROLES.join(", ")} — ` +
        `ink is a role resolved against the newsroom's ground, never a literal`,
    );

  return {
    fontFamily: spec.family,
    fontSize: spec.size,
    fontWeight: spec.weight,
    fontStyle: spec.italic ? "italic" : "normal",
    // `letterSpacing` reads back as the word "normal" when unset in CSS; a direction records the
    // number, so zero tracking compares against zero tracking.
    letterSpacing: spec.tracking ?? 0,
    transform: spec.transform ?? "none",
    ink: spec.ink,
  };
}

/**
 * The register's own case, applied here rather than at every call site.
 *
 * A treatment writes the words it means — "sous le niveau dès 2023" — and never learns whether the
 * direction governing this beat sets its annotations in capitals.
 */
export function applyCase(text, transform) {
  if (transform === "uppercase") return String(text).toUpperCase();
  if (transform === "lowercase") return String(text).toLowerCase();
  return text;
}
