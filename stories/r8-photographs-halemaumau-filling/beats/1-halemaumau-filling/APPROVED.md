# Beat 1 — approved

**Gate 3.** The artefact was surfaced and looked at:
`stories/r8-photographs-halemaumau-filling/beats/1-halemaumau-filling/renders/still.png`,
1920 x 1080 — the size `BRIEF.md` pins and the size `assertDeliveredSize` measures off the
delivered PNG's own IHDR, not off the numbers that drew it.

**Is it true?** Yes, and it is careful about what it claims. Every figure on the frame is the
observatory's own, quoted from its 16 July 2026 *Volcano Watch*, and the footer says so in the
reader's own words: *"nothing here is computed by us."* The photographs are the observatory's, in
the desk's order, letterboxed and never cropped. G1 returned `unverifiable` and the storyboard says
why.

**Is it readable at the size it claims?** Yes. At 1920 px read in a 900 px article column the
smallest token is 29 px = 13.6 CSS px, over the `landscape` row's 26 px floor, and
`assertTypeFloor` measures the rendered markup rather than the multiplier. The lead photograph —
the webcam pair that carries the whole argument — draws at 394 x 447 inside its box, and the two
frames inside it are separately legible: the deep dark bowl above, the raised pale plain below.

Approved with four things recorded rather than fixed. Three of the four are the format's and one is
this beat's own, and it was found by looking at the first render.

1. **The first render shipped a credit collision with every guard green.** "USGS webcam images — no
   photographer stated" measures 623 px against a 536 px column and ran 87 px into the next
   photograph's credit. `photosDeclareAltAndCredit` answered `missingCredit: 0`, `assertTypeFloor`
   passed, `graphicFillsItsFrame` passed at 76.1% against a 66.4% floor. Nothing in this format
   measures a run overflowing its own box: `decollide` in `render-still.mjs` resolves VERTICAL
   collisions and has no caller here, and the seed draws a credit as one unwrapped `<text>`. This
   beat wraps its credits and asserts the property itself (`runsOutsideTheirColumns` in
   `render.mjs`), mutation-tested: unwrap the credit and it reddens naming the run, the pixel it
   ends at and the pixel it was allowed to.
2. **One consistent box costs the panorama 56% of its box height.** 536 x 197 inside 536 x 447,
   with 125 px bars above and below. That is the discipline working as written — letterbox, never
   crop — and it is also why the 12 August frame, the one that says the eruption is still going, is
   the smallest picture on the page. Recorded, not fixed.
3. **The letterbox bars are `grid`, `#404244`, which measures 1.75:1 against this newsroom's
   `#16191B` ground.** Nothing in `image-beat` measures `grid` against anything. Here it happens to
   read, because two of the three photographs are bright; the panorama's dark rocky foreground and
   its own bottom bar are the one edge a reader has to look for.
4. **The typeface is `Helvetica, Arial, sans-serif` and nobody chose it.** `TYPEFACE.md` records the
   answer and the measurement behind it — Space Grotesk is not installed on this machine, Courier
   New is — and this format has no `useTypeface`, no `readTypeface` and no `familyResolves`, so the
   record does not reach the render. Named in the hand-over.

**Would a desk print it?** Yes. It is one clear argument, the evidence is first-party and public
domain, the licence and the provenance are on the frame, and the one photograph nobody can
attribute says so where a reader can see it.
