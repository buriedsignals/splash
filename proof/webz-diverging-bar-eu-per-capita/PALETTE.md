---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them.

`palette`'s subject-fit branch was checked and does not apply. `matchConvention` holds
conventions for renewables, fossil fuel, water and heat; this beat's subject — the CHANGE in a
country's CO₂ emissions per person between two years — matches none of them. A rise and a fall are
directions, not substances, and there is no grounded convention for "the change in a quantity". When
no convention applies, the house theme wins.

**The two sign fills, and why the second one is not a hue.** `references/types/diverging-bar.md`
asks for exactly two colourblind-safe fills, one per sign. A recorded palette carries ONE accent, so
the two fills here are the accent — spent on the RISE, the single sign the headline is about — and
the furniture's own `muted`, which `deriveFurniture` derives from `ground`, for the 26 falls. Both
already clear their contrast floor against the ground, they are separated by saturation rather than
by hue (so they stay distinct under every CVD simulation, which a red/green pair would not), and
neither is a colour nobody chose — which a second invented hue would be.

The consequence, written down because it breaks a habit this corpus otherwise holds: **on this type
colour encodes the SIGN, so the accent cannot ALSO be held back to mark the subject.** Here that
costs nothing, because the subject IS the only row on the positive side — the accent lands on it
either way. The row's own name is set bold as the second, redundant signal, so a reader who cannot
tell the two fills apart still finds the subject by weight and by direction.
