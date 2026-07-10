import { describe, it, expect } from "bun:test";
import { assertShippable, assertDelivered } from "../src/export-guard";
import type { ProduceReport } from "../src/producer-spec";

const rep = (over: Partial<ProduceReport["results"][0]>): ProduceReport => ({
  results: [
    {
      id: "p1",
      producer: "chart-native",
      format: "static",
      status: "produced",
      reviewed: true,
      renderApproved: true,
      ...over,
    },
  ],
});

describe("assertShippable", () => {
  it("passes a produced + reviewed + render-approved proposal", () => {
    expect(() => assertShippable(rep({}), "p1")).not.toThrow();
  });
  it("refuses a produced-but-unreviewed proposal", () => {
    expect(() => assertShippable(rep({ reviewed: false }), "p1")).toThrow(
      /not render-reviewed/,
    );
  });
  it("refuses a produced-but-unapproved proposal", () => {
    expect(() => assertShippable(rep({ renderApproved: false }), "p1")).toThrow(
      /not render-approved/,
    );
  });
  it("refuses an unproduced proposal", () => {
    expect(() =>
      assertShippable(rep({ status: "failed", renderApproved: false }), "p1"),
    ).toThrow(/not produced/);
  });
});

describe("assertDelivered", () => {
  it("accepts a static delivery of a single image, no html", () => {
    expect(() =>
      assertDelivered(["chart.png"], { format: "static", form: null }),
    ).not.toThrow();
  });
  it("accepts an interactive delivery of just interactive.html (no static.html)", () => {
    expect(() =>
      assertDelivered(["interactive.html"], {
        format: "interactive",
        form: "html",
      }),
    ).not.toThrow();
  });
  it("refuses a static delivery that is an empty folder", () => {
    expect(() => assertDelivered([], { format: "static", form: null })).toThrow(
      /exactly one image file/,
    );
  });
  it("refuses a static delivery carrying an .html file", () => {
    expect(() =>
      assertDelivered(["chart.png", "static.html"], {
        format: "static",
        form: null,
      }),
    ).toThrow(/must not include an \.html file/);
  });
  it("refuses a static delivery with extra companion files", () => {
    expect(() =>
      assertDelivered(["chart.png", "README.txt"], {
        format: "static",
        form: null,
      }),
    ).toThrow(/exactly the media file/);
  });
  it("refuses a static delivery given a non-null form", () => {
    expect(() =>
      assertDelivered(["chart.png"], {
        format: "static",
        form: "html" as unknown as null,
      }),
    ).toThrow(/takes no form/);
  });
  it("accepts a video delivery of a single .mp4", () => {
    expect(() =>
      assertDelivered(["clip.mp4"], { format: "video", form: null }),
    ).not.toThrow();
  });
  it("refuses a video delivery with no .mp4", () => {
    expect(() =>
      assertDelivered(["clip.mov"], { format: "video", form: null }),
    ).toThrow(/exactly one \.mp4 file/);
  });
  it("accepts a scrolly delivery of just scrolly.html", () => {
    expect(() =>
      assertDelivered(["scrolly.html"], { format: "scrolly", form: "html" }),
    ).not.toThrow();
  });
  it("refuses a scrolly delivery carrying interactive.html instead of scrolly.html", () => {
    expect(() =>
      assertDelivered(["interactive.html"], {
        format: "scrolly",
        form: "html",
      }),
    ).toThrow(/scrolly\.html/);
  });
  it("accepts an interactive code-source delivery of a non-empty bundle dir listing", () => {
    expect(() =>
      assertDelivered(["package.json", "src/App.tsx"], {
        format: "interactive",
        form: "code-source",
      }),
    ).not.toThrow();
  });
  it("refuses an interactive code-source delivery that is an empty folder", () => {
    expect(() =>
      assertDelivered([], { format: "interactive", form: "code-source" }),
    ).toThrow(/non-empty source-bundle directory/);
  });
  it("accepts an interactive embed delivery with a recorded hosted-URL artifact", () => {
    expect(() =>
      assertDelivered(["EMBED_URL.txt"], {
        format: "interactive",
        form: "embed",
      }),
    ).not.toThrow();
  });
  it("refuses an interactive embed delivery with nothing recorded", () => {
    expect(() =>
      assertDelivered([], { format: "interactive", form: "embed" }),
    ).toThrow(/recorded hosted-URL artifact/);
  });
  it("refuses an interactive/scrolly delivery with no form chosen", () => {
    expect(() =>
      assertDelivered(["interactive.html"], {
        format: "interactive",
        form: null,
      }),
    ).toThrow(/requires a form/);
  });
});
