# The single-medium case, and the four-track assembly extension

**START FROM THE SINGLE-MEDIUM CASE.** The three scrollies this toolchain produces are the **image
scrolly** — a sequence of the journalist's own photographs under travelling prose, which is what
most reporting actually wants — the **map scrolly**, and the **chart scrolly**: one chart on a fixed
stage, the scroll interpolating its own states continuously as prose cards travel over it (see
`references/types/` for the per-type sheets and `proof/scrolly-<type>-*` for the worked examples).
One medium, one fixed graphic, prose cards over it. A journalist with fourteen photographs asked why
an image scrolly had not been suggested, and the reasons were structural rather than editorial
(#38): the medium had no type sheet to enumerate, and this skill's own headline example was the
complicated one.

The data model was never in the way: `assemblyGap` returns `null` when `assembles` is empty, so a
slot with `medium: image, format: scrolly` and no assembly list is already legal and already
dispatches to one producer. Nothing had to be relaxed.

**The four-track assembly is an EXTENSION**, not the lesson. The seed carries it — an IMAGE, a drawn
diagram, a baked MAP and a real CHART — because the mechanism has to be shown surviving genuinely
different media, and that is worth having on disk. It is not the shape to reach for first, and
Splash does not aim to handle complex multi-track scrollies as its primary case.

**The four tracks are the point of this skill, not decoration on it.** The seed steps through a
drawn scene of a river gauge, a schematic of the instrument, a **baked basemap** with the station
marked on it, and a **chart of that station's own 366 daily readings** — real data, frozen beside
the beat, from the USGS National Water Information System. A picture and a diagram alone
demonstrated the mechanism but never the point: a **map** and a **chart** are media other skills in
this project already produce on their own, and assembling BOTH behind one narrative is the thing
none of them can do. `test/canon.test.ts` refuses a seed that loses either track.

**This is the one vehicle Splash publicly promises.** Chart beats ship static, web, video and
scrolly; maps ship the same four. Assembling two media at once is what only this skill does.
