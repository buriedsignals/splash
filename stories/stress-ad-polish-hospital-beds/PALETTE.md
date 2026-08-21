---
ground: "#FFFFFF"
accent: "#5B8A8A"
accents: "#B28D46"
origin: journalist
---

# The colours this story is drawn in

The delivery is a **static frame for print**. `proposePalette` was run and offered exactly two
options, both on the newsroom's own ground `#16191B`:

    house    ground #16191B  accent #D4A853  contrast 8.01:1  passes
    house-2  ground #16191B  accent #5B8A8A  contrast 4.58:1  passes
    recommended: house

Both pass, and nothing in the proposal knows this beat is going on paper. A near-black ground is
the newsroom's screen identity; laid down on a printed page it is a full-bleed flood of ink. The
answer here was given through the proposal's own escape ("something else — give me the two hex
codes"), which is why `origin` is `journalist` rather than `newsroom`.

Measured on the ground that was actually recorded, before it was written down:

    #5B8A8A on #FFFFFF   3.86:1   above the 3:1 non-text floor   — the accent that carries the argument
    #D4A853 on #FFFFFF   2.20:1   BELOW the floor                 — the house PRIMARY accent, unusable here
    #B28D46 on #FFFFFF   3.00:1   at the floor                    — `adjustToContrast("#D4A853", "#FFFFFF", 3)`

The house primary accent does not survive the ground change. That is not a judgement about the
newsroom's colour: `#D4A853` is a light gold chosen to sit on near-black, and it measures 8.01:1
there. It is the ground that moved. The recorded accent is therefore the newsroom's SECOND house
accent, which clears the floor on white as well as on black, and `accents` carries the nearest
passing variant of the primary for any later beat that needs a second series on this ground.

Nothing in the proposal measured any of this, because a proposal is built against the one ground
`NEWSROOM.md` records.
