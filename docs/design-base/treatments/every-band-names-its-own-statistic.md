# every-band-names-its-own-statistic

- kind: imported
- name: Each part of a summary is named on the plate, in words, including the whisker's own rule
- applies: the beat draws one or more distribution summaries
- draws: annot
- priority: 7
- evidence: nature-com-articles-nmeth-2813-figures-1
- evidence: nsidc-org-sea-ice-today-sea-ice-tools-charctic-interactive-sea-ice-gra
- detect: the delivered artifact carries text naming the median, the interval the box spans and the
  rule the whisker follows — against the parts themselves, or in a reading line where the plate has
  no room beside them

## The rule

A summary whose parts are not named is a rectangle the reader is asked to take on trust.

## The two publications, and how differently they do it

Nature writes the anatomy onto the figure itself: `Q1`, `m`, `Q3` on the box, `Whiskers` over the
extending rules, `Outliers` over the detached dots, and the three spans `1.5 × IQR`, `IQR`,
`1.5 × IQR` bracketed across the top. **The fence's arithmetic is on the picture rather than in a
caption.** NSIDC names each band in its legend, in words — `Interquartile Range`, not "typical
range" and not an unlabelled swatch.

`boxplot.md` says this form is only ever as honest as its stated whisker rule, which makes the naming
part of the claim rather than part of the decoration.

## The editorial adaptation, and why it is not a betrayal of the rule

Nature's figure is ABOUT the form, so it names every part on every box. A news beat is about its
subject, so the anatomy is named ONCE — on the first summary the reader meets — and the other
summaries inherit it by identical geometry. That is the same move `100.datavizproject.com`'s viz6
makes with its key ("teach the key once, on one row, where the positions are"), reached
independently in another family.

What may not be dropped is the whisker's rule. `1,5 × IQR` is the sentence that separates a whisker
that means something from a whisker drawn to the data's own extreme, which is this type's named
honesty failure.

## Where it can be written — four positions tried, three drawn and refused

Nature names every part ON the box. That figure is about the FORM; a beat's boxes are its subject,
and on the beat this was filed from every box also carries its own readings beside it. Measured, in
order:

1. **Beside the first box.** The arbiter dropped `médiane` and `50 % des années` onto the sample
   dots, correctly.
2. **The empty top-left corner.** 100px of room against a 146px legend — the 1960s, the plate's
   second-highest decade, is standing in it.
3. **The empty top-right corner.** Drawn, and worse than nothing: a box glyph inside the plot above
   the 2010s column reads as the 2010s having a second, stranger summary.
4. **Its own gutter at the left**, outside the band scale. Costs 162px of panel and STILL sits
   inside the value range, so the glyph lines up with the 7,0 gridline and reads as a box at seven
   tonnes.

**A legend that can be mistaken for data is not a legend.** So the statistics are named in the
header, in words, in a `Lecture :` line — which is NSIDC's own answer rather than Nature's, and
NSIDC is one of the two publications under this rule. The whisker's arithmetic stays in it.
