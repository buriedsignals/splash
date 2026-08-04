// What a journalist is told when their confirmed beats cannot drive a route's video.
//
// THE FINDING THIS CLOSES. The reachability audit (docs/splash/reachability-audit-2026-08-03.md
// §1.1) marks route as the ONLY map type whose default video mode throws `arcBeats` away — every
// other type honours them — and its own legend ranks that above a hard refusal in severity:
// « produit un artefact diminué sans le dire ». The journalist confirmed a storyboard; the film
// ignores it; nothing says so.
//
// WHAT IS *NOT* WRONG HERE, and must not be "fixed". The camera genuinely cannot honour the
// beats: a route's animation IS the line drawing itself through every crossed territory in
// geographic order, so "walk 2 of 3" is not expressible and reordering would draw the line out
// of order (RouteReveal.tsx:159, story-comps.mjs). That argument holds. The defect is the
// SILENCE, not the behaviour — so the fix is an admission, not a new renderer.
import { describe, it, expect } from "bun:test";
import { routeArcNotice } from "./route-arc-notice";

describe("routeArcNotice", () => {
  it("should speak when a route video carries confirmed beats", () => {
    const notice = routeArcNotice({
      type: "route",
      format: "video",
      arcBeats: [{ region: "Genève" }, { region: "Vaud" }],
    });
    expect(notice).not.toBeNull();
    // It must name what is lost, why, and what to do instead — a warning that only says
    // "beats ignored" leaves the journalist unable to act on it.
    expect(notice!).toContain("beats");
    expect(notice!.toLowerCase()).toContain("scrolly");
  });

  it("should name the beats' PROSE, not only the camera", () => {
    // The camera argument covers the camera. Each beat also carries text the journalist wrote,
    // and that is what disappears without a trace — saying "the camera cannot follow them"
    // would understate the loss.
    const notice = routeArcNotice({
      type: "route",
      format: "video",
      arcBeats: [{ region: "Genève", text: "Ici, 4 000 frontaliers" }],
    })!;
    expect(notice.toLowerCase()).toMatch(/text|prose|wrote/);
  });

  it("should stay silent when the route video carries no beats", () => {
    // Nothing was confirmed, so nothing is lost. A warning here would be noise on the
    // ordinary path, which is how warnings stop being read.
    expect(
      routeArcNotice({ type: "route", format: "video", arcBeats: [] }),
    ).toBeNull();
    expect(routeArcNotice({ type: "route", format: "video" })).toBeNull();
  });

  it("should stay silent for a route SCROLLY, which honours the beats", () => {
    // RouteScrolly walks discrete steps and has a real seam for an arc. Warning there would
    // tell the journalist their storyboard was dropped when it was in fact used.
    expect(
      routeArcNotice({
        type: "route",
        format: "scrolly",
        arcBeats: [{ region: "Genève" }],
      }),
    ).toBeNull();
  });

  it("should stay silent for every other type's video, which honours the beats", () => {
    for (const type of [
      "choropleth",
      "symbol",
      "locator",
      "dot-density",
      "hex-grid",
      "cartogram",
    ])
      expect(
        routeArcNotice({ type, format: "video", arcBeats: [{ region: "X" }] }),
      ).toBeNull();
  });
});
