# The spine, end to end, on a real story

Run on 6 August 2026. **Wall clock: 44 minutes**, preflight to committed export, by one agent under
a hard deadline. Everything below happened; nothing here is a rehearsal.

**Story:** Swiss territorial CO₂ emissions, 1950–2024. **Data:** the Global Carbon Budget 2025
series for Switzerland, downloaded live from Our World in Data
(`ourworldindata.org/grapher/annual-co2-emissions-per-country.csv?country=~CHE`, 167 real rows,
1858–2024). **Article:** there is no published third-party piece behind this — the framing in
`source/article.md` was written here, honestly, as a journalist would write it from that series.
Task 11 allows that; it is stated so nobody later mistakes it for a citation.

Evidence in this folder: `proof/co2-suisse/co2-suisse-still.png` (the final render),
`proof/co2-suisse/STORYBOARD.md`, `proof/co2-suisse/BRIEF.md`, `proof/co2-suisse/EmissionsLine.tsx`
(the bespoke component). The Splash root itself lives
outside the repo, in a temp directory, as required.

---

## 1. Preflight — verbatim

```json
{
  "ok": true,
  "checks": [
    { "id": "dependencies",     "status": "pass", "detail": "root dependencies are installed" },
    { "id": "newsroom-profile", "status": "pass", "detail": "NEWSROOM.md is complete" },
    { "id": "maptiler-key",     "status": "pass", "detail": "MapTiler answered 200" }
  ]
}
```

Green on the first run. `NEWSROOM.md` was written by hand from `NEWSROOM.example.md` (Heidi.news,
`fr`, brand `#0B7A75`, ground `#FFFFFF`).

**And the preflight is wrong.** It reported `dependencies: pass` on a root where the very next
step — the only render this sub-project ships — cannot run:

```
FAILS: Cannot find module '@resvg/resvg-js'
```

`assets/root-template/package.json` declares react, react-dom and three d3 packages. It does not
declare `@resvg/resvg-js`, which `chart-beat/scripts/render-still.mjs` imports at module load
and whose header says it comes "from the root's own dependencies". It does not. The check tests
`node_modules` exists, not that the things the twin imports resolve. A journalist would hit this on
their first chart, after being told the environment was fine. I ran `bun add @resvg/resvg-js` to
continue, which is exactly the "designed around" the never-list forbids — so it is recorded here
rather than passed over.

A second, smaller version of the same gap: the twin's skills are not installed into the root at all.
The beat component has to import `render-still.mjs` by absolute path into the repo. There is no
answer yet for how a journalist's root reaches the craft skill's code.

## 2. Intake

`freezeSource` wrote `source/article.md`, `source/data.csv`, `source/profile.json` in one call, said
nothing, and asked nothing. `profile.json` correctly typed `Year` and `Annual CO₂ emissions` as
numbers, 0 missing, 167 rows, min/max 1858–2024 and 146 560–46 204 920. This phase is the least
friction in the whole journey.

## 3. The editorial exchange

Full transcript in `proof/STORYBOARD.md` (the prose under the front matter is the actual dialogue).
Played as a journalist with opinions, not a cooperative fixture. The load-bearing moments:

- **Restitution caught a wrong premise in both directions.** I ranked three claims; the journalist
  rejected one as "a limit, not a claim" — correctly — and then asserted the emissions peak was
  2005. It is 1973 (46,20 Mt against 2005's 45,83 Mt). Checking the frozen data settled it in one
  exchange. Movement ① is worth its cost: this misreading would otherwise have been designed into
  the accent.
- **The takeaway is the title, verbatim.** `takeaway:` and the rendered `<text>` are the same
  string. The drift failure the twin's predecessor kept committing is structurally impossible when
  the same field feeds both.
- **The five questions each changed the drawing.** Q1 ("who is the subject?") produced *the 2024
  point, not the peak* — which is why the peak is muted grey and the endpoint carries the accent.
  Q2 produced the 1967 reference line, which is the entire reason this beat is not the seed. Q4
  ("what does the text already say?") is why the peak marker reads `pic de 1973` and never states
  46,2 Mt.
- **`checkStoryboard` returned `[]` on the first try**, and `whereIs` moved `framing → production`
  off the filesystem alone. Both gates are cheap and neither got in the way.

## 4. The reference loop — where the doctrine was silent

`doctrine/references/reference-set.md` ships four rows: NYT Upshot dot-marks, the Washington
Post's coronavirus simulations, an NYT 3D reconstruction, a Vox map cut. **Not one of them is a long
time series read back against a historical level** — the argument structure I actually had. The set
is honest about being four rows instead of six, and about owing a static in-article example; what it
does not say is that its four rows cluster on marks, simulation and motion, so a plain
line-against-a-benchmark — probably the single most common newsroom chart argument — has no entry.

`exchange.md` says live research runs "when the argument structure is new to the set". It does not
say what that costs. Verifying one reference to `reference-set.md`'s own standard — look at the real
pixels *and* read the caption beside them, after three documented rounds of getting that wrong —
does not fit inside a beat. **I did not run it, and I am not pretending I did.** I showed two rows
whose lesson transfers by analogy, said out loud that neither is the same structure, and the
journalist took one (NYT Upshot: the annotation states the claim, it is not a bare rule). That
lesson is visible in the render — but it arrived by analogy, not by reference.

**The gap, named:** the reference loop is called quality lever number one and it is the one movement
with no affordable path when the set misses. Either the set grows to cover common argument
structures, or the loop needs a cheaper verification tier that is honest about being cheaper.

## 5. Production — two cycles, no stall

Budget is three. It took **two**.

**Cycle 1** rendered clean, passed every test the skill has, and was wrong in two ways that only the
PNG showed:

1. **The scale anchored itself at zero.** `yTickValues`'s odd-step nudge pushed the ceiling from 55
   to 60 while the floor snapped 4,9 down to 0 — producing a `[0, 30, 60]` axis on data spanning
   10–46. A third of the frame empty, the peak squashed, the decline drawn as a shrug. This is the
   exact failure `static-discipline.md` describes in prose, written into the seed's own tick
   function, and it survived because nobody had rendered it against data whose floor sits near a
   step boundary.
2. **The `30` gridline landed 20 px from the 1967 reference at 32,5** — a decorative rule sitting
   beside the one line the reader has to see, with its label crowding the reference's label.

**Cycle 2** fixed both with one idea: *make the reference the middle tick*. The scale is fitted
(floor rounded, never flooring to zero), the middle tick is 32,5, and the middle gridline is not
drawn because the dashed reference rule is already there. The reference label then dropped its
number — the axis states it once. Rendered, looked at, and it holds: the crossing is legible, the
slope is honest, nothing collides.

## 6. What the checklist caught, and what it missed

`inspectSvg` on the final SVG: 12 text fills, all pass — ink 21:1, muted `#616161` 6,19:1, muted
axis `#747474` 4,67:1, accent `#0B7A75` 5,18:1 — `altText.present: true`, `rootTitle: false`. Green.

**It was green on cycle 1 too.** Neither of the two real defects is a contrast, alt-text or
root-`<title>` question, so the tool had nothing to say about the only problems that existed. That
is not a criticism of the tool — it is the whole argument of `static-discipline.md`'s closing
section, demonstrated: *the render is the verification, the checklist is a floor under it.* A run
that trusted `inspectSvg` would have shipped a zero-anchored chart under a title about a decline.

**Still wrong in the final PNG, on the record:**

- The `2024` x tick duplicates the `2024 ·` in the end label. Q4's own rule, violated inside the
  chart rather than against the text. Left in because an unanchored right end reads worse; a real
  session would have asked.
- `Mt` appears on the top tick and again in the end label — stated twice, where the doctrine says
  once.
- The crossing is genuinely narrow (32,07 against 32,53, 1,4 %). The chart does not oversell it,
  which is right, but a reader has to look. No layout fixes that; the data is what it is.

## 7. Delivery

`offerForms({medium: "chart", genre: "static"})` returned two: `owned-file` and `source-bundle`.
Chose `owned-file`; `materialise` wrote `export/still.png` and `export/still.svg` and nothing else.
`whereIs` then returned `{"phase":"done","missing":[]}`. Clean, and lazy in the right way.

---

## The verdict this document owes SP7

**What worked.** The five questions are not disguised parameter collection — every one of them
changed the drawing, and I can point at the pixel each changed. The accent is on 2024 because a
journalist said so; the peak is grey and silent because a journalist said the text next to it
already carries that number. A registry could not have produced that: "put the accent on the
subject, and the subject is not the maximum" is not expressible as a config field, because the
config would have to be filled in by the same judgment the question harvests. And bespoke code paid
for itself in one move — the reference-as-middle-tick fix is three lines in a component I own, and
would have been a feature request against a chart type.

**What was worse than a registry.** The seed's `yTickValues` is doctrine crystallised into code, and
I copied it into a new component and inherited its zero-anchoring bug — a bug the doctrine's own
prose explicitly forbids. A registry has one tick function; fix it once and every chart is fixed.
Here the defect propagates by copy-paste into every beat anybody writes, silently, and each one has
to rediscover it by looking at a render. `seed-anatomy.md` warns against parameterising the seed; it
does not say what to do when the seed's *pure* functions are the part worth sharing and the copy is
the part that rots. That is the strongest argument against this branch that this run produced, and
it showed up on the very first story.

**What the doctrine did not tell me when I needed it.** Three things, in order of cost: the
reference loop has no affordable fallback when the set misses the argument structure (§4); nothing
says how a Splash root reaches the craft skill's code, so the component imports it by absolute path
into the repo (§1); and nothing anywhere states which parts of the seed are meant to be copied and
which are meant to be shared — which is the same question as the paragraph above, and the one SP7
should answer first.
