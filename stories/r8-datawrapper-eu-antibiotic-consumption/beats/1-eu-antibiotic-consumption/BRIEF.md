# Beat 1 — the EU mean against its 2030 target

**Proves.** That the EU population-weighted mean consumption of antibacterials for systemic use is
above its own 2019 baseline and 4.4 DDD per 1 000 inhabitants per day above the target the Council
set for 2030, and that the only years it came near that target were the two pandemic years.

**Medium / format / size.** chart / static / landscape, on screen.

**Producer.** Datawrapper (`d3-lines`), chosen at the G2-producer gate. The treatment is an
ordinary line chart with a reference rule — no bespoke geometry, no baked plate, nothing this
toolchain would have to draw itself.

**Marks.** One line, twelve points, read out of the frozen `source/data.csv` row
`A,P_THAB,EU27_2020`. No cell is retyped; the reader strips Eurostat's own trailing flag and skips
its `:` sentinel, and this row carries neither.

**The rule.** A dashed horizontal range annotation at 15.9, labelled `2030 target — 15.9`, in the
house accent. This is the whole reason the beat is a line and not three columns: the target is a
level the series has to reach down to, and a level is drawn, not asserted.

**Colours.** `PALETTE.md`, one level up: ground `#16191B`, accent `#D4A853`, 8.01:1.

**Credit.** `Eurostat (sdg_03_70), compiled by ECDC through ESAC-Net`, effective 2026-03-05.

**Caveat printed on the chart.** The pandemic years are not policy, and the EU mean is
population-weighted and partly imputed.
