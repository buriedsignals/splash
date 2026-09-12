# the-set-a-claim-adds-up-is-drawn-as-a-set

- kind: derived
- name: When the headline adds a named set of marks together, the set is bracketed and its sum is printed on the bracket
- applies: the beat declares a comparison set of two or more marks that sits contiguous in the drawn order
- draws: axis, annot
- priority: 8
- detect: the delivered artifact carries a mark spanning the comparison set's band and a text run
  within one line-height of it naming the set's sum
- provenBy: proof/static-bar-top-emitters-2024/renders/*.png

## The rule

A headline of the form *"X is more than the next five put together"* asserts an arithmetic fact
about a SUBSET of the marks on the plate. Draw the subset: a bracket under the marks it names, the
sum printed on the bracket, and the reference rule stopping where the set stops.

## Why it needs no published precedent

`proof/static-bar-top-emitters-2024/render.mjs` **already computes the set** — it adds countries
below the subject one at a time and stops at the first one that would carry the running total past
the subject's own, so "the next five" is a search whose answer would be a different number on
different data. The plate then drew a rule at the subject's level and named the five countries in a
caption. Nothing marked WHICH five columns they were.

That is `crossing-marked`'s argument again, and the same exemption applies: the two-publication
floor exists to stop a newsroom's HABIT being copied without its logic. Applied to a fact the beat's
own data carries and its own title claims, it refuses honest work.

## What it found the first time it was drawn

The reference rule ran the full width of the plot, over all ten columns. Four of them — Iran, Saudi
Arabia, South Korea, Germany — are in no sum the headline makes, and the rule crossing them says
they are. The rule now stops at the right edge of the last column in the set, which is both smaller
and truer, and the four columns beyond it are left saying what they are: the rest of the top ten.

## What limits it

The set has to be CONTIGUOUS in the drawn order for a bracket to name it. "China against the next
five" brackets; "China against Japan, Iran and Germany" does not, and would need the members marked
individually or the claim rewritten. The predicate tests contiguity rather than assuming it, so a
scattered set gets no bracket instead of a wrong one.

And the bracket costs the plate its silence about the marks OUTSIDE the set: a reader now sees a
group where the data has only a ranking. It is worth it exactly while the headline is about the
group and no longer.
