---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them. These are exactly the two values
`render.mjs` named as hex literals until now, so the migrated render comes out unchanged.

`palette`'s `renewables` convention (`#1B7F4B`) DOES match this beat's subject — the share of
electricity generated from renewables — and it was not taken. That is recorded here rather than
silently resolved: a subject convention is offered as a **departure** from the house theme, never
applied over it, and this beat has always drawn the house teal. Recording what the beat draws is
the point of this file; changing the hue is a decision for the journalist, and it is now one edit
away in one place instead of a hex literal in a runner.

The accent is spent once, on the subject row's stem and dot; every other row is the furniture's own
`muted`, which `deriveFurniture` derives from `ground`, and every value label stays in `ink` because
a saturated mark colour does not clear the 4.5:1 text floor. Delete this file and the render
refuses, naming every directory it searched.
