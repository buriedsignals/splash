# exits-are-drawn

- kind: derived
- name: An entity that leaves the ranking is drawn to where it left, not dropped from the plate
- applies: the beat's ranking has two or more states and its membership changes between them
- draws: annot
- priority: 7
- detect: the count of distinct entities drawn equals the count of distinct entities across ALL
  states, not the count present in every state; and an entity absent from the final state carries
  its mark to its last position in the quiet register
- provenBy: proof/static-bump-emitter-rank/renders/*.png

## The rule

Draw everyone who was ever in the ranking. An entity that leaves is taken to where it left and
quietened, not removed.

## Why it needs no published precedent

Membership per state is a fact the beat's own data carries. A ranking that draws only the entities
present throughout discards its own churn, and a reader cannot tell an entity that was never there
from one that fell out.

**And the beat itself gave the tell.** Before this treatment, `static-bump-emitter-rank` drew the six
countries that held a top-ten place in every year from 1990 to 2024, said so in its subtitle — *only
the 6 countries that held a top-10 place in every year are drawn; other countries hold the ranks left
empty* — and then carried a caption underneath: *India had already passed the United Kingdom in 1991
and Ukraine in 1992, which have since left the top 10.* A graphic that has to name in prose what it
discarded is discarding the wrong thing.

## The ceiling this measures

The proposal that raised this treatment asked for a ceiling on churn and stated plainly that it had
not been measured. Measured here:

| | |
| --- | ---: |
| entities in a top-ten place at some point, 1990–2024 | **16** |
| entities in one in every year | **6** |
| churn | **62 %** |

And the plate stays readable, because **the ranks are the constraint, not the entities**: ten slots
exist at any moment however many entities pass through them. A bump chart's crowding is bounded by
its rank axis, not by its membership. The ceiling the proposal was looking for is on the number of
entities that can be NAMED at one edge, which is a labelling problem the arbiter already owns.

## What limits it

**A one-year visitor is a flicker.** Kuwait held tenth place in 1991 alone and France in 1998–1999.
They are drawn, because they were there, and at 35 years across a 900 px plot each is a stub a few
pixels wide. That is honest and it is not informative; a beat that wanted them suppressed would need
a declared minimum tenure, which this treatment does not invent.

**And "quiet" is the direction's word, not this treatment's.** ProPublica greys and strikes through;
what the register system does here is drop the exit to the furniture's muted ink. The treatment says
the entity stays; the direction says what quiet looks like.
