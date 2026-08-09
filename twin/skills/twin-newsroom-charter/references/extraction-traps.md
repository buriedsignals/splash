# Extraction traps a real site's markup and CSS exposed

Four specific parsing failures, each found by running an early version of this skill against a
real newsroom's real HTML/CSS rather than a hand-written fixture, each now pinned by a test in
`test/extract.test.ts`. Read this before changing any regex in `scripts/extract.mjs` — every one
of these looked like a reasonable simplification until a real site's actual markup broke it.

## 1. A custom property whose NAME contains "background" is not a background declaration

nzz.ch's stylesheet declares:

```css
:root.dark {
  --articleBackground: black;
  --articleBackground: #ffffff;
}
```

An early version of `extractBackgroundDeclarations` matched `background(?:-color)?\s*:\s*` with
no boundary before it, so it fired partway through the identifier `--article**Background**: …` —
the regex engine doesn't know `--articleBackground` is one token; it just sees the literal
substring `Background: #ffffff` sitting inside it and matches. The result was a phantom "the page
background is `#ffffff`" reading attributed to a custom property that has nothing to do with a
`background:` CSS property at all.

**Fix**: a negative lookbehind, `(?<![\w-])background(?:-color)?\s*:\s*`, refuses to match when
the character immediately before `background` is a word character or a hyphen — which is exactly
the shape of sitting inside a longer identifier. `extractRootCustomProperties`, which reads
`--name: value` pairs deliberately rather than scanning for the word "background", never had this
bug; the two are tested against the same fixture in `extract.test.ts` specifically so a change to
either one that reopens this gets caught by both.

## 2. Splitting a `var(--x, Fallback)` font stack on commas produces two fake font names

heidi.news's stylesheet declares:

```css
body {
  font-family: var(--lt-font-sans, Roboto) !important;
}
```

Naively splitting the declaration's value on `,` produces `["var(--lt-font-sans", "Roboto)
!important"]`. Neither fragment is a real, resolved font name — but without a check for stray
parentheses, the second fragment (`Roboto)!important`, after trimming) passes every other filter
and gets reported as if it were a clean `Roboto` declaration. It looks plausible. It is not what
the site actually resolves to (the real value depends on whatever `--lt-font-sans` evaluates to
elsewhere, which this skill deliberately does not chase — see
`references/site-declarations.md`'s closing section).

**Fix**: `isGenericFontToken` rejects any candidate name still carrying a `(` or `)` after
splitting — a real font name never contains one, so a paren surviving the split is proof the split
landed inside a function call, not between two real stack entries. The `!important` suffix is also
stripped before the generic check runs, so it doesn't itself get mistaken for part of a name.

## 3. A qualified selector's declaration is real evidence but not "the" default

lemonde.fr's stylesheet declares:

```css
html.short-video,
html.short-video body {
  background: #000;
}
```

This is a completely real, syntactically ordinary CSS rule — and an early version of `chooseGround`
happily picked it as lemonde.fr's "ground" colour, because it was simply the first background
declaration found anywhere in the fetched CSS. It's black. lemonde.fr is not a black newsroom;
this rule only applies while a short-video player component is active. The failure mode is exactly
what rule 3 in `SKILL.md` names: a real, evidence-backed value that is nonetheless the wrong answer
to the question actually being asked, presented with the same confidence as a correct one.

**Fix**: `isUnqualifiedSelector` in `derive-charter.mjs` only accepts a background rule (or a
custom-property hint) for `ground` when the selector, split on commas, contains a BARE `html`,
`body`, or `:root` — never a class-qualified or descendant form. A qualified rule is still
collected and returned in `candidates.backgroundDecls`, visible to anyone who wants to see every
declaration this skill found; it's simply never auto-picked as *the* answer. The same restriction
applies to the `brandColor` custom-property fallback, for the identical reason.

## 4. A generic UI-library variable can match a brand-name-shaped hint by accident

nzz.ch's stylesheet declares `:root { --swiper-theme-color: #007aff }` — a real custom property,
with "theme" right there in its name. An early version of the brand-colour name hint
(`/brand|primary|accent|theme|highlight/i`) matched it, and reported nzz.ch's brand colour as
`#007aff` — which is not NZZ's colour at all, it's the Swiper carousel library's own stock default
blue, present on every site that ships Swiper with no customisation.

**Fix**: the hint list was narrowed to `brand`/`primary`/`accent` only. "theme" and "highlight" are
common enough in third-party widget CSS (carousels, calendars, embedded players) that they cost
more false positives from vendor code than they gain from the rare newsroom design token actually
named that way. The result on nzz.ch: `brandColor` correctly resolves to `null` — the honest
outcome, given nothing on the page or in its fetched stylesheets is confidently the newsroom's own
declared brand colour.
