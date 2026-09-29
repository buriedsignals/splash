# A web page that is known to collide

`dumbbell-creme.html` is `proof/web-dumbbell-life-expectancy-gains/renders/creme.html` as it was
committed at cbcc34e3, before issue #78 fixed it: at 375 px ten of its annotations print over
other words. `dumbbell-creme.expected.txt` is what the annotation guard reported for it then, with
the path rewritten to this copy.

It is frozen on purpose. `skills/chart-web/test/verify-web-annotations.test.ts` drives verify-web on
it to prove the verifier catches real collisions in the guard's own words — a proof that must not
depend on the demo corpus still containing a defect. Do not re-render it.
