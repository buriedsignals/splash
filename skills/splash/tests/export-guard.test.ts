import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertShippable,
  assertDelivered,
  isHostedUrl,
} from "../src/export-guard";
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

// `dir` became REQUIRED with the export receipt (registry E19): the guard signs the folder it lets
// through, so it must be handed one. These cases test the SHAPE rule and do not care which folder
// — a throwaway keeps each one isolated, and nothing they assert changes.
const tmpDir = () => mkdtempSync(join(tmpdir(), "export-guard-"));

// An embed delivery is validated AGAINST ITS FILE — `assertDelivered` reads EMBED_URL.txt and
// checks the URL's shape. That check used to be skipped whenever `dir` was absent, which is most
// of the time in these unit cases; making `dir` required (registry E19) turned it on everywhere.
// That is an improvement, not an obstacle: the cases that hand over an embed now have to hand over
// a real one.
function tmpDirWithEmbed(url = "https://datawrapper.dwcdn.net/abc12/1/"): string {
  const d = tmpDir();
  writeFileSync(join(d, "EMBED_URL.txt"), url);
  return d;
}

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

  // IMPORTANT: "shown" and "approved" have to name the same bytes (Task 8). A report that
  // carries shownSha256 (the shape a real gate.ts approval always has) but whose value has
  // drifted from approvedHash must not ship.
  it("passes when shownSha256 equals approvedHash — the shape a real gate.ts approval writes", () => {
    expect(() =>
      assertShippable(
        rep({ approvedHash: "abc123", shownSha256: "abc123" }),
        "p1",
      ),
    ).not.toThrow();
  });

  it("refuses when shownSha256 does not match approvedHash — approved bytes nobody was shown", () => {
    expect(() =>
      assertShippable(
        rep({ approvedHash: "abc123", shownSha256: "stale-hash" }),
        "p1",
      ),
    ).toThrow(/shownSha256 !== approvedHash/);
  });
});

describe("assertDelivered", () => {
  it("accepts a static delivery of a single image, no html", () => {
    expect(() =>
      assertDelivered(["chart.png"], { format: "static", form: null, dir: tmpDir() }),
    ).not.toThrow();
  });
  it("accepts an interactive delivery of just interactive.html (no static.html)", () => {
    expect(() =>
      assertDelivered(["interactive.html"], {
        format: "interactive",
        form: "html", dir: tmpDir() }),
    ).not.toThrow();
  });
  it("refuses a static delivery that is an empty folder", () => {
    expect(() => assertDelivered([], { format: "static", form: null, dir: tmpDir() })).toThrow(
      /exactly one image file/,
    );
  });
  it("refuses a static delivery carrying an .html file", () => {
    expect(() =>
      assertDelivered(["chart.png", "static.html"], {
        format: "static",
        form: null, dir: tmpDir() }),
    ).toThrow(/must not include an \.html file/);
  });
  it("refuses a static delivery with extra companion files", () => {
    expect(() =>
      assertDelivered(["chart.png", "README.txt"], {
        format: "static",
        form: null, dir: tmpDir() }),
    ).toThrow(/exactly the media file/);
  });
  it("refuses a static delivery given a non-null form", () => {
    expect(() =>
      assertDelivered(["chart.png"], {
        format: "static",
        form: "html" as unknown as null, dir: tmpDir() }),
    ).toThrow(/takes no form/);
  });
  it("accepts a video delivery of a single .mp4", () => {
    expect(() =>
      assertDelivered(["clip.mp4"], { format: "video", form: null, dir: tmpDir() }),
    ).not.toThrow();
  });
  it("refuses a video delivery with no .mp4", () => {
    expect(() =>
      assertDelivered(["clip.mov"], { format: "video", form: null, dir: tmpDir() }),
    ).toThrow(/exactly one \.mp4 file/);
  });
  it("accepts a scrolly delivery of just scrolly.html", () => {
    expect(() =>
      assertDelivered(["scrolly.html"], { format: "scrolly", form: "html", dir: tmpDir() }),
    ).not.toThrow();
  });
  it("refuses a scrolly delivery carrying interactive.html instead of scrolly.html", () => {
    expect(() =>
      assertDelivered(["interactive.html"], {
        format: "scrolly",
        form: "html", dir: tmpDir() }),
    ).toThrow(/scrolly\.html/);
  });
  it("accepts an interactive code-source delivery of a runnable bundle dir listing", () => {
    expect(() =>
      assertDelivered(["package.json", "vite.config.ts", "src/App.tsx"], {
        format: "interactive",
        form: "code-source", dir: tmpDir() }),
    ).not.toThrow();
  });
  it("refuses an interactive code-source delivery missing vite.config.ts", () => {
    expect(() =>
      assertDelivered(["package.json", "src/App.tsx"], {
        format: "interactive",
        form: "code-source", dir: tmpDir() }),
    ).toThrow(/runnable source bundle/);
  });
  it("refuses an interactive code-source delivery that is an empty folder", () => {
    expect(() =>
      assertDelivered([], { format: "interactive", form: "code-source", dir: tmpDir() }),
    ).toThrow(/non-empty source-bundle directory/);
  });
  it("accepts an interactive embed delivery with a recorded hosted-URL artifact", () => {
    expect(() =>
      assertDelivered(["EMBED_URL.txt"], {
        format: "interactive",
        form: "embed", dir: tmpDirWithEmbed() }),
    ).not.toThrow();
  });
  it("refuses an interactive embed delivery with nothing recorded", () => {
    expect(() =>
      assertDelivered([], { format: "interactive", form: "embed", dir: tmpDir() }),
    ).toThrow(/recorded hosted-URL artifact/);
  });
  // The faked-delivery bug (QA Wave 11): the run handed over the pre-export PRODUCTION output
  // (the interactive.html / static.png the producer built) and called the embed form delivered.
  // A form-c embed delivery is the recorded hosted URL, never the produced artifact — mirror the
  // static/video "exactly the media file" strictness: the folder must be EXACTLY EMBED_URL.txt.
  it("refuses an embed delivery that hands over the pre-export production output instead of EMBED_URL.txt", () => {
    expect(() =>
      assertDelivered(["interactive.html"], {
        format: "scrolly",
        form: "embed", dir: tmpDir() }),
    ).toThrow(/EMBED_URL\.txt/);
  });
  it("refuses an embed delivery with EMBED_URL.txt plus a stray produced file", () => {
    expect(() =>
      assertDelivered(["EMBED_URL.txt", "static.png"], {
        format: "interactive",
        form: "embed", dir: tmpDirWithEmbed() }),
    ).toThrow(/exactly EMBED_URL\.txt/);
  });
  it("accepts an embed delivery whose EMBED_URL.txt holds a resolvable https URL (hosted-DW publicUrl)", () => {
    const dir = mkdtempSync(join(tmpdir(), "splash-embed-url-ok-"));
    try {
      writeFileSync(
        join(dir, "EMBED_URL.txt"),
        "https://www.datawrapper.de/_/AbCdE/\n",
      );
      expect(() =>
        assertDelivered(["EMBED_URL.txt"], {
          format: "interactive",
          form: "embed",
          dir }),
      ).not.toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("refuses an embed delivery whose EMBED_URL.txt is blank / not an https URL", () => {
    const dir = mkdtempSync(join(tmpdir(), "splash-embed-url-blank-"));
    try {
      writeFileSync(join(dir, "EMBED_URL.txt"), "   \n");
      expect(() =>
        assertDelivered(["EMBED_URL.txt"], {
          format: "interactive",
          form: "embed",
          dir }),
      ).toThrow(/resolvable https URL/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("refuses an interactive/scrolly delivery with no form chosen", () => {
    expect(() =>
      assertDelivered(["interactive.html"], {
        format: "interactive",
        form: null, dir: tmpDir() }),
    ).toThrow(/requires a form/);
  });
});

describe("assertDelivered — the build folder is not a delivery", () => {
  it("refuses an html hand-over that still carries the build's own files, naming every one", () => {
    expect(() =>
      assertDelivered(
        ["interactive.html", "config.json", "native-source.json"],
        {
          format: "interactive",
          form: "html", dir: tmpDir() },
      ),
    ).toThrow(/config\.json/);
    expect(() =>
      assertDelivered(
        ["interactive.html", "config.json", "native-source.json"],
        {
          format: "interactive",
          form: "html", dir: tmpDir() },
      ),
    ).toThrow(/hand(ed)? over/);
  });

  it("accepts the sanctioned html export — exactly the html file", () => {
    expect(() =>
      assertDelivered(["interactive.html"], {
        format: "interactive",
        form: "html", dir: tmpDir() }),
    ).not.toThrow();
  });

  it("accepts a runnable source bundle with its config.json — the measured exemption", () => {
    expect(() =>
      assertDelivered(
        ["package.json", "vite.config.ts", "config.json", "index.html"],
        {
          format: "scrolly",
          form: "code-source", dir: tmpDir() },
      ),
    ).not.toThrow();
  });

  it("keeps refusing a lone html copy as a code-source bundle — the older rule still stands", () => {
    expect(() =>
      assertDelivered(["interactive.html"], {
        format: "interactive",
        form: "code-source", dir: tmpDir() }),
    ).toThrow(/package\.json/);
  });
});

describe("isHostedUrl — a recorded embed URL must look resolvable", () => {
  it("accepts a real fly.dev host URL", () => {
    expect(
      isHostedUrl("https://my-newsroom-embeds.fly.dev/eu-rents-2025/"),
    ).toBe(true);
  });
  it("accepts a Datawrapper hosted URL", () => {
    expect(isHostedUrl("https://datawrapper.dwcdn.net/XXXXX/1/")).toBe(true);
  });
  it("rejects blank / whitespace", () => {
    expect(isHostedUrl("   ")).toBe(false);
    expect(isHostedUrl("")).toBe(false);
  });
  it("rejects a non-https scheme", () => {
    expect(isHostedUrl("http://insecure.example.com/x/")).toBe(false);
    expect(isHostedUrl("ftp://foo.bar/")).toBe(false);
  });
  it("rejects a bare/local host with no domain", () => {
    expect(isHostedUrl("https://localhost/x")).toBe(false);
    expect(isHostedUrl("https://placeholder")).toBe(false);
  });
  it("rejects non-string input", () => {
    expect(isHostedUrl(undefined as unknown as string)).toBe(false);
    expect(isHostedUrl(null as unknown as string)).toBe(false);
  });
});
