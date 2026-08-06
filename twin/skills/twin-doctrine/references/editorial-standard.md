# The editorial standard

This is the test every visible layer of a graphic must pass before it ships. It is not a style
preference — it is what separates a graphic that argues from a graphic that decorates.

## The five jobs a layer is allowed to do

A pixel that is visible in the final render exists to do exactly one of five jobs:

1. **Encode data.** It is a mark whose position, length, area or colour stands for a value — a
   bar, a line, a bubble, a shaded region. Remove it and a number disappears with it.
2. **Supply context.** It tells the reader what they are looking at without which the encoded
   data is unreadable — an axis, a unit, a scale, a baseline, a date range, a source line. Remove
   it and the numbers are still on the page, but they no longer mean anything.
3. **Establish hierarchy.** It tells the reader where to look first — a title's weight, a
   subject's colour against a neutral field, a size difference between a headline number and a
   supporting one. Remove it and every mark competes for attention equally, which is to say the
   reader has no guide at all.
4. **Support verification.** It lets a skeptical reader check the claim against its evidence — a
   footnote, a sample size, a "as of" date, a source name a reader could actually go look up.
   Remove it and the graphic is asking to be believed rather than showing its work.
5. **Direct attention.** It points the reader at the specific evidence the sentence next to it is
   about — a callout, an annotation, an endpoint label, a highlighted series. Remove it and the
   reader has to do the work of finding the evidence themselves, which most readers will not do.

## The test

**If removing a layer does not reduce comprehension, remove it.** This is not asked once at the
end as a cleanup pass — it is the standing question against every element from the first sketch.
A watermark, a drop shadow, a background texture, a decorative icon, a gradient that does not
encode a quantity: each of these earns its place only by clearing this bar, and almost none of
them do. The default is off. An element is added because the argument needs it, never because
the canvas looked empty.

This is a stricter test than "does it look bad without it." A legend box can look tidy and still
fail the test, if a direct label on the line would communicate the same fact faster and with one
fewer thing to decode. A rounded corner can look modern and still fail the test, because it
encodes nothing and directs nothing. The standard is not aesthetic minimalism for its own sake —
it is that every layer left on the canvas is a claim on the reader's attention, and an
unjustified claim is a tax on the one thing the graphic actually needs, which is for the reader to
understand the evidence.

## Where visual interest actually comes from

A graphic that follows the test above is not thereby dull. Visual interest in an editorial
graphic comes from four sources, none of which is ornament:

- **Sequencing.** The order in which evidence arrives — a chart that builds one series before
  adding the second, a map that draws its defining line at the moment history reaches it, a
  scroll that reveals the trend before it reveals the exception. Sequencing is pacing applied to
  argument, and pacing is what makes a graphic feel authored rather than dumped on the page.
- **Comparison.** Two things placed so their difference is felt rather than computed — an
  endpoint next to a baseline, a small quantity drawn at true scale beside a much larger one, a
  before against an after in the same frame. A comparison the reader does not have to do
  arithmetic to see is doing more narrative work than any amount of colour could.
- **Annotation.** A line, a callout, a shaded band that names what the data already shows —
  not decoration layered on top of the chart, but the chart's own argument made explicit at the
  one place the reader needs it stated. Annotation is where the "so what" of a graphic actually
  lives.
- **The arrival of evidence.** Withholding the full picture until the reader has enough context to
  read it — a reveal, a scroll step, a beat that adds one new fact at a time instead of one
  overwhelming frame. This is the single most reliable source of felt "interest" in an
  explanatory graphic, and it costs nothing in ink.

Ornament — texture, gradient without quantity, chrome, a font flourish, a drop shadow — produces
interest for exactly as long as it takes the reader to notice it is not telling them anything.
Sequencing, comparison, annotation and the arrival of evidence keep producing it for as long as
the reader keeps reading, because each one is doing the work the graphic exists to do in the
first place: making a claim, and showing why it is true.

## How this standard is used

Every production skill in this twin reads this file before it writes a line of rendering code —
not as a checklist run after the fact, but as the frame the first sketch is drawn inside. When a
beat brief proposes an element, the standard is the question asked of every layer that element
will carry: what job is this doing, and would comprehension survive its removal. `anti-patterns.md`
names the recurring failures of this test by their usual shape; `visual-system.md` names the
concrete rules — colour, contrast, furniture — that keep an element compliant with it once it
exists on the canvas.
