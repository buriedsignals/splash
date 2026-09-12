# order-is-chosen-from-the-answer

- kind: imported
- name: Rows follow their own sequence where they have one; otherwise they are ordered by the answer
- applies: the beat draws two or more bars whose categories carry no declared sequence
- draws: axis
- priority: 2
- evidence: ons-gov-uk-visualisations-dvc3148-fig02-index-html
- evidence: datawrapper-de-4dmeg
- detect: where the beat declares a sequence, the rows are in it; where it declares none, the rows
  are monotone in the quantity the beat's own claim is about

## The rule

The sequence is the argument when there is a sequence. When there is not, the order is a decision,
and it should be taken from the answer.

## And it corrects the doctrine

`skills/chart-beat/references/types/waterfall.md` says: *rows stay in story order, never resorted by
magnitude — the sequence itself is the argument, and sorting it by size answers a different, less
interesting question.*

**That is right for a time bridge and wrong for a contributions bridge**, and ONS is the proof.
Twelve COICOP divisions have no sequence at all — there is no order in which "restaurants and
hotels" comes before "clothing and footwear" — so sorting by signed contribution, `+0.05` down to
`−0.06`, does not destroy an argument. It supplies one. The deleted CPI twin makes it sharper: it
sorts the other way, falls first, because its headline ended down.

Datawrapper holds the other half of the rule: income-statement order on one plate, calendar order on
another, editorial order within groups on a third. Where a sequence exists it is obeyed.

## What limits it

**"The answer" is the beat's, not the renderer's.** A grouped bar comparing two series can be ordered
by either series or by their difference, and which one depends on what the copy claims. The treatment
says the order is a decision taken from the claim; it does not decide the claim.

**And alphabetical is a sequence nobody declared.** It is the order data arrives in, and it reads as
neutrality while being an arbitrary answer to a question the reader did not ask. Where a beat has a
real sequence — dates, an accounting order, a hierarchy — it is declared and this treatment stands
aside.

## Correction — same group-shaped predicate, same repair

ONS's twelve COICOP divisions are twelve bars in one series, not groups, and the DVP specimen that
supplies this rule's negative case — three columns in alphabetical order, "reads flatter for it" —
has no groups either. The predicate now counts bars (`facts.barCount`), summed out of `groups` where
a beat declares them, so nothing that offered this rule before stops offering it.
