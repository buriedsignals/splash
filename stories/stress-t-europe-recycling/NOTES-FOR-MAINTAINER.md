# Notes for the maintainer

Defects and rough edges found while running this story. **Not for the journalist** — nothing here
was said to them, and nothing here belongs in `export/`. Each entry names the phase it was found in.

## Found at production

No name-to-shape-key step exists anywhere in this toolchain. A frozen csv keyed by country NAME ("Holland", "Belgiumm") cannot reach a shapefile keyed by ADM0_A3 without an alias table the beat author writes by hand. The join guards catch a table that is wrong; nothing helps build one.

## Found at production

The delivered owned-file form for a video copies the whole of renders/ into export/, so the newsroom received video-props.json (247 KB of internal props, base64 plate inside) and four QA frames — one of which shows a half-built map — described in HANDOVER.md as "a raster copy, for a system that cannot take the vector".

## Found at production

map-beat ships no size table, so gate 2c's size pin reaches nothing in the producer. This beat carried #shared/chart-video/sizes.mjs to honour size: portrait, and applied the type floor and the safe band inside its own component because both shared guards read rendered markup a browser-rendered video never yields.

## Found at production

decollide is exported from render-still.mjs, which imports @resvg/resvg-js at module load. A Remotion-bundled video component cannot import that module, so decollide is unreachable from every video format in this tree; label placement in a video is still done by hand.

CLOSED 2026-08-21: every skill that draws its own geometry now carries scripts/decollide.mjs, the same function in a module that imports nothing. splash/test/decollide-is-reachable.test.ts walks them and pins the premise.

## Found at production

claimViolations only knows one claim shape — the subject is BELOW a comparison and below its neighbours — with no way to ask the opposite. A takeaway whose subject is a maximum has to write its own check.

CLOSED 2026-08-21: `claimViolations` takes a `direction` (`"below"`, the default and the seed's claim unchanged, or `"above"`). A two-ended claim is two calls, one per end. This beat's producer now makes both instead of carrying `extremesViolations`.

## Found at production

plateFollowsGround returns true for a NaN plate luminance: its only escape is plate == null, and NaN is not null. A plate that was never actually decoded therefore passes the guard whose own header says a value that was not read must not travel as a value that was.

## Found at production

verify-map.mjs declares export function surfaceLuminance twice, byte for byte (around lines 119 and 161). Bun accepts it; the second declaration wins.

## Found at delivery

The closing format offer tells the journalist "Name one, or say you are done", and recordFormatAnswer accepts only "declined" or "taken" — the word the offer puts in their mouth is rejected by the recorder.

## Found at production

A map label clipped by the plate is silent — this beat measured its own two label boxes against the plate by hand, in its own component, after a delivered frame read "Mac…" and "18.4".

CLOSED 2026-08-21: `labelsClippedByPlate` (`map-beat`/`map-web`/`scrolly`, `scripts/detect-label-clipped-by-plate.mjs`) is that check in the skill, called by map-beat's own video seed. This beat still carries its own `assertLabelFits`, because a story may not import out of a skill; the decision it makes is now the skill's, and the catalogue's, rather than only this file's.
