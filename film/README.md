# The launch film

Nineteen and seven tenths seconds, 1920×1080, 60 fps, silent — the same shape as the Spotlight and
Mycroft launch films.

**The picture is the landing itself, not a reconstruction of it.** Everything the hero
does is WebGL on the page's shared canvas, and its choreography is scripted gesture by
gesture in `landing/index.html`: the loading screen clipped away by the rising paper,
the webs climbing, the wall settling, the papers lifting off the chapter, the field of
plates coming at the camera. None of that survives being rebuilt. So the page is opened
in a real browser with a real GPU, the interface is switched off, the journey is
played, and the viewport is screencast. Remotion then lays the film's own words over
that recording, and ends on the mark.

## Two commands, in this order

```
bun film/capture.mjs      # drives the real page, records film/public/stage.mp4
bun film/render.mjs       # lays the type over it, writes film/splash-launch.mp4
```

`capture.mjs` opens a headed Chrome — it will take over the screen for about half a
minute. `render.mjs` alone is enough for any change to the words or the cut; the
recording only has to be redone when the landing itself changes.

```
bun film/render.mjs --still-only        # the last frame, on its own
bun film/render.mjs --frame 400         # look at any other frame
bunx remotion studio film/index.ts --public-dir film/public
```

## What is switched off, and what is not

Off: the bar, the menu, the dek, the buttons, the funder line, the loading screen's own
rosette and wordmark, and the page's own headlines — `Don't publish a wall of text`, `It's time to make a splash`, `The case /
Four reasons to get visual` and the four cards. The film says its own words in their
place.

The page is opened at **`?archives=WORLD&plates=56`**.

`plates=56` is twice the twenty-eight a reader gets. Twenty-eight is what the section is
designed to carry — enough for the depth to read as populated, few enough that the
redrawing stays inside its budget on a laptop also running a raymarched hero one section
up. The room is FILMED, not read: nobody has to keep up with it and the machine doing the
filming is doing nothing else. The module's redraw budget is per frame and not per tile,
so twice the tiles is twice the transform writes and the same painting — measured after,
the take still holds 91% of the compositor's casts, and the step-to-step unevenness in
the push came out at 9% of the mean against 15% at twenty-eight. Clamped 8–96 in
`landing/index.html`, and reached by nothing but the query.

 As for the shelf: a reader gets the front pages of the
country they are standing in, which is the landing's own argument and a good one; a film
is not addressed to one country, so it stands on the American, British and Swiss shelves
at once — *Titanic Sinks Four Hours After Hitting Iceberg*, *5 Held in Plot to Bug
Democrats' Office*, *The Truth*, *Our Thalidomide Children*, *Chute de Saddam Hussein*.
That shelf is reached by nothing else: not by clock, not by language, only by name. It
is a two-line addition to `shelfFor` in `landing/modules/hero.js` — see the note there.

On: everything else, untouched. It is turned off with `opacity`, never `display` — the
choreography measures these elements, and an element that is not laid out is an element
whose measurement is wrong.

## The cut

The beats below are not invented; they are where the page already is, measured off the
recording's own luminance. In footage time:

| | |
|---|---|
| 0.0 → 2.4 | the loading screen, which carries no face — just its ink |
| 2.4 → 3.7 | the paper climbs and clips that ink away: the papers arrive |
| 3.7 → 10.6 | the wall of front pages — American, British and Swiss at once |
| 10.6 → 11.7 | the crossing: the papers lift off the chapter |
| 11.7 → 13.55 | the field arriving on its own clock, while the beat gate is crossed |
| 13.55 → 19.55 | one push on one curve, unbroken across the last three lines |
| 17.87 → 19.55 | and the turn, which belongs to the last line and to nothing else |

`capture.mjs` stamps its own take and writes those marks to
`film/public/stage-marks.json`, so a re-cut reads them rather than re-measuring them.

The film enters at 2.25 — on the paper's first edge. It does not open on the mark: the
loading screen keeps its mechanism and loses its face, because the mark is the film's
ENDING and a mark shown twice means less the second time. Over that:

> The story is there, **buried in 500 lines of copy.** — on the wall
> Your evidence is **nine paragraphs down.** — on the wall, out as the paper lifts
> Help people **see what matters.** — over the crossing
> Turn the evidence into **maps, charts, and video.** — over the field of plates
> **Go make a splash.** — and the room accelerates under it, then the mark

One ground for the whole film, the ink, so the type keeps one pairing throughout: paper
for what is said, amber for what is meant. That is the landing's own move, where
"Don't publish" stands in paper and "a wall of text" drops into amber under it.

## Files

| | |
|---|---|
| `capture.mjs` | drives and records the real page → `public/stage.mp4` |
| `timing.ts` | every beat of the cut, and the only place a frame number is written |
| `house.ts` | the landing's closed palette |
| `typefaces.ts` | Bricolage Grotesque and Space Grotesk, as bytes — **generated**, see `scripts/fetch-typefaces.mjs` |
| `load-typefaces.ts` | puts them in the document before the first frame is painted |
| `StageFootage.tsx` | plays the recording, and gives it up for the mark |
| `Script.tsx` | the five lines, and how a line arrives |
| `Wordmark.tsx` | the rosette and the word |
| `SplashLaunch.tsx` | the assembly |
| `render.mjs` | the still, then the mp4, both verified from their own bytes |

## Two things worth knowing before editing

**The typefaces are embedded, not linked.** A stylesheet fetched over the network is
not guaranteed to have arrived before the first frame is painted, and a frame painted
in the fallback face exports without complaint. `load-typefaces.ts` holds a
`delayRender` handle until every face has decoded.

**Nothing drives the field of plates until the last line. That is the point.** The walk runs on a clock,
not on the scroll — the module says so itself: *the drawings have to come on their own
or the frame sits empty behind the line until a wheel is turned*. Left alone it fills
the room and keeps its cruise, which is a continuous advance with nothing in it to
stumble on.

Two ways of driving it were tried and both put a step in the picture, and both were the
driving rather than the page. Wheel gestures are jumps: Chrome applies the whole delta
on one frame. And a continuous `scrollTo` walks into the chapter's own beat gate —
crossing `__csBeats.y1` makes the page snap the scroll back and lock it for the length
of the beat transition, after which a time-based travel resumes far ahead of where it
was left; `travel` then goes backwards for one frame and the module re-deals all
twenty-eight tiles at the near wall. That was the flash at 17.5s.

The acceleration under the last line goes through that same gate, on purpose and alone:
one scroll to its far side, then a wait on the page's own two flags (`__locked` off,
`__csFree` on) before anything is driven. Nothing is driven DURING the lock, which is
the whole of what went wrong before. **The travel is one curve; only the turn is an event.** `p(u) = u²·⁶` over six seconds,
from the moment the chapter hands the page back — unbroken across the last three lines,
with nothing beginning under any of them.

What may not begin at a sentence is the ACCELERATION. An earlier cut lined the scroll
push up with the fourth line and the spiral with the fifth, and two accelerations that
each begin under a sentence do not read as a room speeding up: they read as a room
changing gear every time a sentence arrives, and the sentence reads as the cause. The
linear term had to go too — `p(u) = c·u + …` was there to match a slope at a junction
that no longer exists, and at the START of a push there is no slope to match, so a curve
leaving at `c·R/T` stepped the room from drift to drift-plus-something on one frame.
`uⁿ` leaves at zero. Measured on the recording, the field's motion now climbs
monotonically with no plateau and no step anywhere in it, and the lines are simply spaced
against it.

The ROTATION is the one event left, and it is the event the last line names: it opens at
4.3s into the push, on the frame the fifth line lands, and runs to the end. Its own
progress is renormalised over what is left, and each tile raises that to its own
exponent — so the turn opens at zero speed for each of them, at its own moment, rather
than switching on for fifty-six at once.

**Pace is set by duration and by the shape of the curve, not by reach.** Measured on the
page at 1920×1080: the chapter is 5378 tall, the beat mark sits 60px into it, and the
exit arms at eight tenths — so there are about 4100px of scroll to spend and no more.

**The tiles leave on spirals of their own, and the push had to be halved to let them.**
Not the field turning as one piece — that was the first try, a rotation and a blow-up on
a wrapper around `.avfield`, and it turned every DRAWING with it. A chart lying on its
side is not a chart, and twenty-eight of them turning together is one plate spinning, not
a room emptying. The tiles keep facing the camera and it is their PATH that spirals: one
reach, one sweep and one EXPONENT each, drawn from a seeded stream, so they leave at
different moments and gather speed at different rates. Same hand of rotation for all —
different directions is not a spiral, it is a scatter.

Each tile turns between one and three quarters and six whole times on its way out
(600–2160°), and reaches out between 1.35× and 3× its own radius. Those two trade
against each other: a tile thrown far covers its whole arc off the edge of the frame,
where a whirl cannot be seen, so the reach was pulled back when the sweep went up.

It is written on the `translate` PROPERTY, not into `transform`: the module rewrites
`transform` on every tile on every frame, so anything written there is gone by the next.
And each tile's own place is read back OUT of that transform string rather than off its
box — `getBoundingClientRect` on twenty-eight elements is twenty-eight forced layouts a
frame in the one moment the film needs the frame rate, and the string already carries x,
y and z in the same space `translate` adds into. The perspective then does the rest for
free: a tile near the camera has a large z, so the same offset is a much larger sweep on
the glass.

The push's exponent was six and is three. At six the room ended so fast that it evacuated
the field on its own: by the time the spiral was a third of the way in there were two
tiles left to spiral, and what read was not a room emptying but a room already empty. Two
mechanisms were doing the same job and the push was winning.

**And nothing is resampled: one cast, one frame, at 60 fps.** Chrome casts on its
compositor's clock, sixty a second, and this page holds nearly all of them — measured on
a full take, 1176 casts in 19.8s, 89% of them carrying a new paint. It does not run at
twenty-five; that number came from counting duplicates in a 30 fps resample and reading
them backwards. The resample was the whole problem: asking for 25 or 30 out of a
jittering 60 makes ffmpeg choose, per slot, whichever cast is nearest, so the picture
advances by two paints, then three, then two. Measured on the take before the fix, under
the push: 13.2, 12.1, 12.4, 15.8, 11.0, 13.1, 9.5 … alternating, frame after frame — a
step-to-step swing of 30–50% of the mean. Laid down one cast per frame it is 15%,
against 10% for the metric's own noise on the still wall.

**Nothing is laid between the recording and the type.** A band of ink under the words
stood there for one pass and came straight back out: the wall is already dark enough to
read against, so the band bought no legibility and flattened the page's own picture.

**The render runs at concurrency 1.** Every frame pulls a frame out of `stage.mp4`, and
several ffmpeg extractions racing on one file is how a render ends up with a frame from
the wrong second in it.
