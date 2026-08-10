import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, writeFile, rm, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  offerForms,
  materialise,
  ownedFileForInsertion,
  exportDirFor,
  substituteKeys,
} from "../scripts/deliver.mjs";

// A hand-over payload, module-scope, because EVERY delivery needs one: G4 closes into
// `export/<beat>/HANDOVER.md` the way every other gate closes into a file. `materialise` used to
// return early when the caller passed none, so every form worked without one — and the run that
// produced A11 ("name the files, say where they go, give the advice") would have produced it again.
// Every field below is already recorded during the exchange: placement and credit are hand fields
// 4 and 5, alt is in the component, the caveat is the limits field.
const handover = {
  placement: "after the paragraph on winter rainfall, article web, full width",
  alt: "Rainfall in Annemasse fell in three of the last four winters",
  credit: "Source: MeteoSwiss, as of 2026-08-10",
  caveat: "four winters is a short window",
};

let beatDir: string, exportDir: string;
beforeEach(async () => {
  const base = await mkdtemp(join(tmpdir(), "beat-"));
  beatDir = join(base, "1-rainfall");
  exportDir = join(base, "export");
  await mkdir(join(beatDir, "renders"), { recursive: true });
  await mkdir(exportDir, { recursive: true });
  await writeFile(join(beatDir, "renders", "still.png"), "png-bytes");
  await writeFile(join(beatDir, "renders", "still.svg"), "<svg/>");
  await writeFile(
    join(beatDir, "Rainfall.tsx"),
    "export const Rainfall = () => null;",
  );
  await writeFile(join(beatDir, "data.json"), "[]");
  // G3 has closed for this fixture: the journalist was shown the render and approved it.
  // `offerForms` refuses to name a single delivery form before that file exists.
  await writeFile(join(beatDir, "APPROVED.md"), "seen at full size, approved");
});
afterEach(async () => {
  await rm(join(beatDir, ".."), { recursive: true, force: true });
});

describe("offerForms — Gate 3 before Gate 4", () => {
  // Delivery cannot honestly be discussed before the journalist has SEEN the thing being
  // delivered. The run discussed it twice before it could -- once before production began, once
  // inside the Gate-3 approval question itself ("hosted embed = closed") -- and both statements
  // were wrong and had to be retracted the moment this function was finally called. The forms are
  // this function's output; they are not knowable without it. So calling it early fails loudly.
  it("should refuse to name a single form before the beat has been approved", async () => {
    await rm(join(beatDir, "APPROVED.md"));
    expect(() =>
      offerForms({ beatDir, medium: "chart", genre: "static" }),
    ).toThrow(/has not been approved yet/);
  });

  it("should say what it looked for, so the refusal is actionable", async () => {
    await rm(join(beatDir, "APPROVED.md"));
    expect(() =>
      offerForms({ beatDir, medium: "chart", genre: "static" }),
    ).toThrow(/APPROVED\.md/);
  });

  it("should refuse a call that names no beat directory at all", () => {
    expect(() => offerForms({ medium: "chart", genre: "static" })).toThrow(
      /needs the beat directory/,
    );
  });
});

describe("offerForms", () => {
  it("should offer the owned file, a CMS insertion, and the source bundle for a static chart", () => {
    const ids = offerForms({ beatDir, medium: "chart", genre: "static" }).map(
      (f) => f.id,
    );
    expect(ids).toEqual(["owned-file", "cms-insertion", "source-bundle"]);
  });

  // The owner names source-bundle in none of the three per-genre lists they asked for: it is a
  // developer artifact. It is KEPT, because it works and a newsroom with a developer wants it, and
  // TAGGED, so the delivery question can offer the journalist-facing forms as the real choice and
  // mention this one in a line below them.
  it("should tag the source bundle as a developer artifact, in every genre, and tag nothing else", () => {
    for (const genre of ["static", "web", "video", "scrolly"]) {
      for (const form of offerForms({ beatDir, medium: "chart", genre, env: {} })) {
        expect(form.audience).toBe(form.id === "source-bundle" ? "developer" : undefined);
      }
    }
  });

  it("should never offer an embed for a static beat", () => {
    expect(
      offerForms({ beatDir, medium: "chart", genre: "static" }).map((f) => f.id),
    ).not.toContain("embed");
  });

  it("should describe what each form gives, so the choice is informed", () => {
    for (const form of offerForms({ beatDir, medium: "chart", genre: "static" })) {
      expect(form.gives.split(/\s+/).length).toBeGreaterThan(4);
    }
  });

  // Direct coverage of the genre-rejection path itself — the three tests above only ever call
  // offerForms with genre "static", so none of them would notice if this check stopped reading
  // the given genre at all. "print" stands in for a genre this project has never built a producer
  // for — unlike "video", which is now a real, deliverable genre (see the tests below).
  it("should refuse to offer anything for a genre it does not know", () => {
    expect(() => offerForms({ beatDir, medium: "chart", genre: "print" })).toThrow(
      "print",
    );
  });

  it("should offer the owned file, the source bundle, and a CMS insertion for a web chart with no Cloudflare credentials", () => {
    const ids = offerForms({ beatDir, medium: "chart", genre: "web", env: {} }).map(
      (f) => f.id,
    );
    expect(ids).toEqual(["owned-file", "source-bundle", "cms-insertion"]);
  });

  it("should offer the owned file, a CMS insertion, and the source bundle for a video chart", () => {
    const ids = offerForms({ beatDir, medium: "chart", genre: "video", env: {} }).map(
      (f) => f.id,
    );
    expect(ids).toEqual(["owned-file", "cms-insertion", "source-bundle"]);
  });

  // A hosted embed serves a PAGE. A static beat's PNG and a video beat's mp4 are not pages, so
  // "embed" stays wired to the two genres that ship one. cms-insertion is different — it prepares a
  // payload around a file, which those genres do have — and widening it was the follow-up this
  // file's own comment had promised.
  it("should never offer an embed for static or video — neither ships a page to host", () => {
    for (const genre of ["static", "video"]) {
      const ids = offerForms({ beatDir, medium: "chart", genre, env: {} }).map(
        (f) => f.id,
      );
      expect(ids).not.toContain("embed");
    }
  });

  it("should never offer the hosted embed for a web chart when no Cloudflare credential is set", () => {
    const ids = offerForms({ beatDir, medium: "chart", genre: "web", env: {} }).map(
      (f) => f.id,
    );
    expect(ids).not.toContain("embed");
  });

  it("should never offer the hosted embed when only the account id is set, missing the token", () => {
    const ids = offerForms({ beatDir, medium: "chart",
      genre: "web",
      env: { CLOUDFLARE_ACCOUNT_ID: "acct" },
    }).map((f) => f.id);
    expect(ids).not.toContain("embed");
  });

  it("should never offer the hosted embed when only the token is set, missing the account id", () => {
    const ids = offerForms({ beatDir, medium: "chart",
      genre: "web",
      env: { CLOUDFLARE_API_TOKEN: "tok" },
    }).map((f) => f.id);
    expect(ids).not.toContain("embed");
  });

  it("should offer the hosted embed for a web chart once both Cloudflare credentials are set", () => {
    const ids = offerForms({ beatDir, medium: "chart",
      genre: "web",
      env: { CLOUDFLARE_ACCOUNT_ID: "acct", CLOUDFLARE_API_TOKEN: "tok" },
    }).map((f) => f.id);
    expect(ids).toEqual([
      "owned-file",
      "source-bundle",
      "embed",
      "cms-insertion",
    ]);
  });

  it("should describe the CMS insertion form honestly, naming that nothing is inserted automatically", () => {
    const cmsForm = offerForms({ beatDir, medium: "chart", genre: "web", env: {} }).find(
      (f) => f.id === "cms-insertion",
    );
    expect(cmsForm?.gives).toMatch(/not yet wired to a live CMS/);
  });
});

describe("materialise", () => {
  it("should write only the owned file when that form is chosen", async () => {
    const written = await materialise({
      form: "owned-file",
      genre: "static",
      beatDir,
      exportDir,
      handover,
    });
    const files = await readdir(exportDir);
    expect(files).toContain("still.png");
    expect(files).toContain("still.svg");
    expect(files).not.toContain("package.json");
    // The two rendered files, plus HANDOVER.md — G4 closes into that file, so it is part of every
    // delivery rather than an extra a caller may skip.
    expect(files).toContain("HANDOVER.md");
    expect(written).toHaveLength(3);
  });

  // The shared copyTree helper is exercised at depth by the source-bundle test below; this
  // pins that the owned-file path walks a nested subdirectory under "renders" identically,
  // rather than assuming the shared helper "presumably" behaves the same there too.
  it("should copy a subdirectory nested inside renders when the owned-file form is chosen", async () => {
    await mkdir(join(beatDir, "renders", "social"), { recursive: true });
    await writeFile(
      join(beatDir, "renders", "social", "insta.png"),
      "png-bytes",
    );

    const written = await materialise({
      form: "owned-file",
      genre: "static",
      beatDir,
      exportDir,
      handover,
    });

    const files = await readdir(exportDir);
    expect(files).toContain("social");
    const nested = await readdir(join(exportDir, "social"));
    expect(nested).toContain("insta.png");
    expect(written).toContain(join(exportDir, "social", "insta.png"));
  });

  it("should write a runnable bundle only when the source form is chosen", async () => {
    await materialise({
      form: "source-bundle",
      genre: "static",
      beatDir,
      exportDir,
      handover,
    });
    const files = await readdir(exportDir);
    expect(files).toContain("package.json");
    expect(files).toContain("Rainfall.tsx");
    // The already-rendered PNG/SVG belong to the owned-file form, not the source bundle —
    // a "renders" leftover here would mean the chosen form isn't the only thing built.
    expect(files).not.toContain("renders");
  });

  it("should refuse a form that was never offered", async () => {
    await expect(
      materialise({ form: "embed", genre: "static", beatDir, exportDir, handover }),
    ).rejects.toThrow("not an offered form");
  });

  // A form id that exists under one genre must not be accepted for a different genre just
  // because the id matches — the check is on the {form, genre} PAIR, never on the form id
  // alone. "owned-file" is a real id in FORMS_BY_GENRE.static, but genre "print" offers nothing
  // (no producer or delivery table for it), so it must be refused exactly like an id that never
  // existed anywhere.
  it("should refuse a form that exists for a different genre than the one given", async () => {
    await expect(
      materialise({ form: "owned-file", genre: "print", beatDir, exportDir, handover }),
    ).rejects.toThrow("not an offered form");
  });

  // Probe: refusing an unoffered form is a validation failure, not a delivery — it must not
  // destroy a form the journalist already has sitting in exportDir.
  it("should leave an already-delivered form untouched when a later choice is refused", async () => {
    await materialise({
      form: "owned-file",
      genre: "static",
      beatDir,
      exportDir,
      handover,
    });

    await expect(
      materialise({ form: "embed", genre: "static", beatDir, exportDir, handover }),
    ).rejects.toThrow("not an offered form");

    const files = await readdir(exportDir);
    expect(files).toContain("still.png");
    expect(files).toContain("still.svg");
  });

  // Probe: a beat directory can carry a subdirectory other than "renders" (an "assets" folder
  // holding a logo, say), and that subdirectory can itself nest further (an "icons" folder
  // inside it). copyFile throws on a directory — the source-bundle form must walk the whole
  // tree, at every depth, not just the first level.
  it("should copy a subdirectory nested two levels deep inside the beat, not throw on it", async () => {
    await mkdir(join(beatDir, "assets", "icons"), { recursive: true });
    await writeFile(join(beatDir, "assets", "logo.svg"), "<svg/>");
    await writeFile(join(beatDir, "assets", "icons", "pin.svg"), "<svg/>");

    const written = await materialise({
      form: "source-bundle",
      genre: "static",
      beatDir,
      exportDir,
      handover,
    });

    const files = await readdir(exportDir);
    expect(files).toContain("assets");
    const nested = await readdir(join(exportDir, "assets"));
    expect(nested).toContain("logo.svg");
    expect(nested).toContain("icons");
    const deeper = await readdir(join(exportDir, "assets", "icons"));
    expect(deeper).toContain("pin.svg");
    expect(written).toContain(join(exportDir, "assets", "logo.svg"));
    expect(written).toContain(join(exportDir, "assets", "icons", "pin.svg"));
  });

  // Probe: a journalist can change their mind. The second materialise must not leave the
  // first form's files sitting alongside the new one — only the chosen form is delivered.
  it("should clear a previous choice's files when a different form is materialised next", async () => {
    await materialise({
      form: "owned-file",
      genre: "static",
      beatDir,
      exportDir,
      handover,
    });
    expect(await readdir(exportDir)).toContain("still.png");

    await materialise({
      form: "source-bundle",
      genre: "static",
      beatDir,
      exportDir,
      handover,
    });
    const files = await readdir(exportDir);
    expect(files).not.toContain("still.png");
    expect(files).not.toContain("still.svg");
    expect(files).toContain("package.json");
  });

  // Probe: "bun install && bun run build" is a claim, not decoration. The build script the
  // bundle ships must actually run and produce something, not name a file that never exists.
  it("should ship a build script that genuinely runs and bundles the component", async () => {
    await materialise({
      form: "source-bundle",
      genre: "static",
      beatDir,
      exportDir,
      handover,
    });

    const files = await readdir(exportDir);
    expect(files).toContain("build.ts");

    // Runs the package.json "build" script by name, not the file directly — this is the
    // exact command the "gives" promise names ("bun install && bun run build").
    const proc = Bun.spawnSync(["bun", "run", "build"], { cwd: exportDir });
    expect(proc.exitCode).toBe(0);

    const dist = await readdir(join(exportDir, "dist"));
    expect(dist).toContain("Rainfall.js");
  });

  // The generic materialise path (both branches) must honour "web" and "video" exactly as it
  // does "static" — this is the defect the genre table fix closes: before it, both genres threw
  // "not an offered form" for every form id, however the renders/ directory was populated.
  for (const genre of ["web", "video"]) {
    it(`should write only the owned file for a ${genre} beat when that form is chosen`, async () => {
      const written = await materialise({
        form: "owned-file",
        genre,
        beatDir,
        exportDir,
        handover,
      });
      const files = await readdir(exportDir);
      expect(files).toContain("still.png");
      expect(files).toContain("still.svg");
      expect(files).not.toContain("package.json");
      // The beat's two rendered files, plus HANDOVER.md — G4 closes into that file.
      expect(files).toContain("HANDOVER.md");
      expect(written).toHaveLength(3);
    });

    it(`should write a runnable bundle for a ${genre} beat when the source form is chosen`, async () => {
      await materialise({ form: "source-bundle", genre, beatDir, exportDir, handover });
      const files = await readdir(exportDir);
      expect(files).toContain("package.json");
      expect(files).toContain("Rainfall.tsx");
      expect(files).not.toContain("renders");
    });
  }
});

// A fake of the same four-call Cloudflare sequence `test/deploy-embed.test.ts` exercises directly
// — duplicated rather than imported, the same "a skill's own test files don't share fixtures
// across files" shape the rest of this codebase already uses. This is only ever reached through
// `materialise`, so it only needs to prove the plumbing gets there and back with the right URL.
function fakeCloudflare() {
  const fetchFn = async (url: string, init?: RequestInit) => {
    const path = new URL(url).pathname;
    if (path.endsWith("/upload-token")) {
      return new Response(
        JSON.stringify({ success: true, result: { jwt: "fake-jwt" } }),
      );
    }
    if (path === "/client/v4/pages/assets/check-missing") {
      const body = JSON.parse(init!.body as string);
      return new Response(
        JSON.stringify({ success: true, result: body.hashes }),
      );
    }
    if (path === "/client/v4/pages/assets/upload") {
      return new Response(
        JSON.stringify({
          success: true,
          result: { successful_key_count: 1, unsuccessful_keys: [] },
        }),
      );
    }
    if (path.endsWith("/deployments") && init?.method === "POST") {
      return new Response(
        JSON.stringify({
          success: true,
          result: { url: "https://deadbeef.some-project.pages.dev" },
        }),
      );
    }
    if (path.endsWith("/projects") && init?.method === "POST") {
      return new Response(JSON.stringify({ success: true, result: {} }));
    }
    throw new Error(
      `fakeCloudflare: unhandled call ${init?.method ?? "GET"} ${path}`,
    );
  };
  return fetchFn;
}

describe("materialise — hosted embed and CMS insertion (web genre)", () => {
  let webBeatDir: string, webExportDir: string;
  beforeEach(async () => {
    const base = await mkdtemp(join(tmpdir(), "web-beat-"));
    webBeatDir = join(base, "1-rainfall-web");
    webExportDir = join(base, "export");
    await mkdir(join(webBeatDir, "renders"), { recursive: true });
    await writeFile(
      join(webBeatDir, "renders", "rainfall.html"),
      "<!doctype html><html><body><h1>rainfall</h1></body></html>",
    );
  });
  afterEach(async () => {
    await rm(join(webBeatDir, ".."), { recursive: true, force: true });
  });

  it("should refuse to materialise the embed form without a Cloudflare credential", async () => {
    await expect(
      materialise({
        form: "embed",
        genre: "web",
        beatDir: webBeatDir,
        exportDir: webExportDir,
        env: {},
        handover,
      }),
    ).rejects.toThrow("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN");
  });

  it("should write only EMBED_URL.txt, holding the live deployment URL, when the embed form is chosen", async () => {
    const written = await materialise({
      form: "embed",
      genre: "web",
      beatDir: webBeatDir,
      exportDir: webExportDir,
      env: { CLOUDFLARE_ACCOUNT_ID: "acct", CLOUDFLARE_API_TOKEN: "tok" },
      fetchFn: fakeCloudflare(),
      handover,
    });
    // Dotfiles filtered: `materialise` leaves a `.delivered-from` receipt naming the beat, which
    // is bookkeeping (it is what refuses a SECOND beat delivering over this one), not a delivered
    // file. `written` below is the real "only one file was delivered" assertion, and it is unfiltered.
    const files = (await readdir(webExportDir)).filter((f) => !f.startsWith("."));
    expect(files.sort()).toEqual(["EMBED_URL.txt", "HANDOVER.md"]);
    const url = await Bun.file(join(webExportDir, "EMBED_URL.txt")).text();
    expect(url.trim()).toBe("https://deadbeef.some-project.pages.dev");
    expect(written).toEqual([
      join(webExportDir, "EMBED_URL.txt"),
      join(webExportDir, "HANDOVER.md"),
    ]);
  });

  it("should refuse to materialise embed when renders/ holds more than one file", async () => {
    await writeFile(join(webBeatDir, "renders", "extra.html"), "<p>extra</p>");
    await expect(
      materialise({
        form: "embed",
        genre: "web",
        beatDir: webBeatDir,
        exportDir: webExportDir,
        env: { CLOUDFLARE_ACCOUNT_ID: "acct", CLOUDFLARE_API_TOKEN: "tok" },
        fetchFn: fakeCloudflare(),
        handover,
      }),
    ).rejects.toThrow("expected exactly one file");
  });

  it("should write a CMS-INSERTION.md document, never touch a network, when cms-insertion is chosen", async () => {
    const written = await materialise({
      form: "cms-insertion",
      genre: "web",
      beatDir: webBeatDir,
      exportDir: webExportDir,
      env: {},
      // A fetchFn that throws on any call — proves this form makes zero network calls, unlike
      // "embed" right above it.
      fetchFn: async () => {
        throw new Error("cms-insertion must never call fetch");
      },
      handover,
    });
    const files = (await readdir(webExportDir)).filter((f) => !f.startsWith("."));
    expect(files.sort()).toEqual(["CMS-INSERTION.md", "HANDOVER.md"]);
    const doc = await Bun.file(join(webExportDir, "CMS-INSERTION.md")).text();
    expect(doc).toContain("UNPROVEN");
    expect(doc).toContain("<h1>rainfall</h1>"); // the beat's own HTML made it into the payload
    expect(written).toEqual([
      join(webExportDir, "CMS-INSERTION.md"),
      join(webExportDir, "HANDOVER.md"),
    ]);
  });

  it("should honour a caller-supplied cms option, building a livingdocs insertion instead of the we-publish default", async () => {
    await materialise({
      form: "cms-insertion",
      genre: "web",
      beatDir: webBeatDir,
      exportDir: webExportDir,
      env: {},
      cms: { kind: "livingdocs", articleId: "real-article-id" },
      handover,
    });
    const doc = await Bun.file(join(webExportDir, "CMS-INSERTION.md")).text();
    expect(doc).toContain("insertComponent");
    expect(doc).toContain("real-article-id");
  });

  it("should refuse to materialise cms-insertion when renders/ holds two files of the genre's own kind", async () => {
    await writeFile(join(webBeatDir, "renders", "extra.html"), "<p>extra</p>");
    await expect(
      materialise({
        form: "cms-insertion",
        genre: "web",
        beatDir: webBeatDir,
        exportDir: webExportDir,
        env: {},
        handover,
      }),
    ).rejects.toThrow(/two \.html files/);
  });

  it("should clear a previously materialised embed when cms-insertion is chosen next", async () => {
    await materialise({
      form: "embed",
      genre: "web",
      beatDir: webBeatDir,
      exportDir: webExportDir,
      env: { CLOUDFLARE_ACCOUNT_ID: "acct", CLOUDFLARE_API_TOKEN: "tok" },
      fetchFn: fakeCloudflare(),
      handover,
    });
    expect(
      (await readdir(webExportDir)).filter((f) => !f.startsWith(".")).sort(),
    ).toEqual(["EMBED_URL.txt", "HANDOVER.md"]);

    await materialise({
      form: "cms-insertion",
      genre: "web",
      beatDir: webBeatDir,
      exportDir: webExportDir,
      env: {},
      handover,
    });
    const files = (await readdir(webExportDir)).filter((f) => !f.startsWith("."));
    expect(files.sort()).toEqual(["CMS-INSERTION.md", "HANDOVER.md"]);
  });
});

// A static beat legitimately holds TWO rendered files -- still.png and still.svg -- and the
// single-file guard read that as ambiguity, which is why cms-insertion could not be offered for
// static at all. It is not ambiguity: for an insertion the vector is the answer and the raster is
// the fallback, and a per-genre preference table is the difference between "two files" and a
// decision.
describe("ownedFileForInsertion — which file goes to the CMS", () => {
  it("should pick the SVG from a static beat that holds both an SVG and a PNG", async () => {
    expect(await ownedFileForInsertion(beatDir, "static")).toBe("still.svg");
  });

  it("should fall to the PNG when the beat rendered no vector", async () => {
    await rm(join(beatDir, "renders", "still.svg"));
    expect(await ownedFileForInsertion(beatDir, "static")).toBe("still.png");
  });

  it("should name what it found when nothing matches the genre's own kind", async () => {
    await rm(join(beatDir, "renders", "still.svg"));
    await rm(join(beatDir, "renders", "still.png"));
    await expect(ownedFileForInsertion(beatDir, "static")).rejects.toThrow(
      /found nothing/,
    );
  });

  // Two candidates at the WINNING extension is a real editorial choice, and this function may not
  // make it. Two at a lower-preference extension is not: the preferred one already answered.
  it("should refuse two files at the extension it settled on", async () => {
    await writeFile(join(beatDir, "renders", "other.svg"), "<svg/>");
    await expect(ownedFileForInsertion(beatDir, "static")).rejects.toThrow(
      /two \.svg files/,
    );
  });

  it("should refuse a genre it holds no preference for rather than guess", async () => {
    await expect(ownedFileForInsertion(beatDir, "print")).rejects.toThrow(
      /no insertion preference/,
    );
  });
});

// The delivery phase closes into a file, like every other phase. What the journalist got before
// this was two filenames and two sizes: no statement of which file goes where, no alt text, no
// credit line, no restatement of the caveat the beat's own subtitle already carried.
describe("HANDOVER.md — what the journalist actually receives", () => {

  it("should be written beside the chosen form, naming every delivered file", async () => {
    const written = await materialise({
      form: "owned-file",
      genre: "static",
      beatDir,
      exportDir,
      env: {},
      handover,
    });
    const doc = await Bun.file(join(exportDir, "HANDOVER.md")).text();
    for (const path of written) {
      if (path.endsWith("HANDOVER.md")) continue;
      expect(doc).toContain(path.split("/").pop()!);
    }
    expect(written).toContain(join(exportDir, "HANDOVER.md"));
  });

  it("should say which file goes to the CMS, not merely list them", async () => {
    await materialise({ form: "owned-file", genre: "static", beatDir, exportDir, env: {}, handover });
    const doc = await Bun.file(join(exportDir, "HANDOVER.md")).text();
    expect(doc).toContain("still.svg");
    expect(doc).toContain("the one to give the CMS");
  });

  it("should read back the placement, the alt text, the credit line and the caveat", async () => {
    await materialise({ form: "owned-file", genre: "static", beatDir, exportDir, env: {}, handover });
    const doc = await Bun.file(join(exportDir, "HANDOVER.md")).text();
    expect(doc).toContain(handover.placement);
    expect(doc).toContain(handover.alt);
    expect(doc).toContain(handover.credit);
    expect(doc).toContain(handover.caveat);
  });

  it("should be written for the source bundle too, not only the owned file", async () => {
    const written = await materialise({
      form: "source-bundle",
      genre: "static",
      beatDir,
      exportDir,
      env: {},
      handover,
    });
    expect(written).toContain(join(exportDir, "HANDOVER.md"));
  });

  // G4 CLOSES INTO A FILE, like every other gate. `withHandover` used to return early whenever the
  // caller passed no payload, so every delivery form worked without one — and `whereIs` called the
  // story done regardless. The run that produced A11 (two filenames and two sizes, no placement, no
  // alt text, no credit line) would have produced it again, silently.
  //
  // RED, in a copy of the tree under /tmp, with the early return restored:
  //   error: expect(received).rejects.toThrow(expected)
  //   Received promise resolved instead of rejected
  //   (fail) should refuse a delivery that hands nothing back to read out
  //   (fail) should say what to hand in, naming where each field was already recorded
  it("should refuse a delivery that hands nothing back to read out", async () => {
    await expect(
      materialise({
        form: "owned-file",
        genre: "static",
        beatDir,
        exportDir,
        env: {},
      }),
    ).rejects.toThrow(/closes into export\/<beat>\/HANDOVER\.md/);
  });

  it("should say what to hand in, naming where each field was already recorded", async () => {
    await expect(
      materialise({ form: "owned-file", genre: "static", beatDir, exportDir, env: {} }),
    ).rejects.toThrow(/placement and credit are hand fields 4 and 5/);
  });
});

// A STORY HAS MORE THAN ONE BEAT — and until this block existed, nothing in this repository put two
// of them in one story. `materialise` clears its `exportDir` on every call (the gotcha above, and it
// is right per beat); one story-level `export/` shared by every beat made that wipe reach ACROSS
// beats, so DELIVERING THE SECOND BEAT DESTROYED THE FIRST — silently, at the last phase of the
// journey, with the second delivery reporting success. Every other test in this file uses one beat
// and one exportDir, which is exactly why the whole suite stayed green over it.
//
// RED, in a copy of the tree under /tmp, with the two mechanisms mutated back to the shape the
// toolchain actually had — `exportDirFor` returning the story-level `join(storyDir, "export")`, and
// `materialise` skipping the receipt check before its wipe:
//
//   688 |     expect(await readdir(exportDirFor(storyDir, "1-rainfall"))).toContain("still.png");
//                                                                          ^
//   error: expect(received).toContain(expected)
//   Expected to contain: "still.png"
//   Received: [ "Temperature.tsx", "package.json", "APPROVED.md", ".delivered-from", "build.ts" ]
//
//   (fail) a story has more than one beat > should keep the first beat's delivered files when a second beat delivers
//   (fail) a story has more than one beat > should give each beat its own directory under export/
//   (fail) a story has more than one beat > should refuse, rather than wipe, when another beat's delivery is already there
//    47 pass, 3 fail
describe("a story has more than one beat", () => {
  let storyDir: string, beatTwo: string;

  beforeEach(async () => {
    storyDir = join(beatDir, "..");
    beatTwo = join(storyDir, "2-temperature");
    await mkdir(join(beatTwo, "renders"), { recursive: true });
    await writeFile(join(beatTwo, "renders", "still.png"), "png-bytes-two");
    await writeFile(join(beatTwo, "renders", "still.svg"), "<svg id='two'/>");
    await writeFile(join(beatTwo, "Temperature.tsx"), "export const T = () => null;");
    await writeFile(join(beatTwo, "APPROVED.md"), "seen at full size, approved");
  });

  it("should keep the first beat's delivered files when a second beat delivers", async () => {
    await materialise({
      form: "owned-file",
      genre: "static",
      beatDir,
      exportDir: exportDirFor(storyDir, "1-rainfall"),
      handover,
    });
    await materialise({
      form: "source-bundle",
      genre: "static",
      beatDir: beatTwo,
      exportDir: exportDirFor(storyDir, "2-temperature"),
      handover,
    });

    expect(await readdir(exportDirFor(storyDir, "1-rainfall"))).toContain("still.png");
    expect(await readdir(exportDirFor(storyDir, "2-temperature"))).toContain("build.ts");
  });

  it("should give each beat its own directory under export/", async () => {
    await materialise({
      form: "owned-file",
      genre: "static",
      beatDir,
      exportDir: exportDirFor(storyDir, "1-rainfall"),
      handover,
    });
    await materialise({
      form: "owned-file",
      genre: "static",
      beatDir: beatTwo,
      exportDir: exportDirFor(storyDir, "2-temperature"),
      handover,
    });

    const delivered = (await readdir(join(storyDir, "export"))).sort();
    expect(delivered).toEqual(["1-rainfall", "2-temperature"]);
  });

  // The mechanical half: `exportDirFor` tells a caller where a beat delivers, and the receipt makes
  // the WRONG directory fail loudly instead of destroying what is already in it. A caller that hands
  // two different beats the same directory is refused on the second call, before anything is wiped.
  it("should refuse, rather than wipe, when another beat's delivery is already there", async () => {
    const shared = join(storyDir, "export");
    await materialise({ form: "owned-file", genre: "static", beatDir, exportDir: shared, handover });

    await expect(
      materialise({ form: "owned-file", genre: "static", beatDir: beatTwo, exportDir: shared, handover }),
    ).rejects.toThrow(/would destroy it/);

    expect(await readdir(shared)).toContain("still.png");
    expect(await readFile(join(shared, "still.png"), "utf8")).toBe("png-bytes");
  });

  it("should still let the same beat change its mind in its own directory", async () => {
    const mine = exportDirFor(storyDir, "1-rainfall");
    await materialise({ form: "owned-file", genre: "static", beatDir, exportDir: mine, handover });
    await materialise({ form: "source-bundle", genre: "static", beatDir, exportDir: mine, handover });

    const files = await readdir(mine);
    expect(files).not.toContain("still.png");
    expect(files).toContain("package.json");
  });
});

/**
 * RULING R1b, CLAUSE 4 — the delivered key is a SECOND, domain-restricted key.
 *
 * It was advice in a docblock while the code read `MAPTILER_DELIVERY_KEY || MAPTILER_KEY`, and the
 * audit measured what that meant on the machine this was built on: `twin/.env` holds only
 * `MAPTILER_KEY`, so **every delivery substituted the unrestricted development key** and nothing
 * refused, warned or recorded it. MapTiler cannot restrict an account's default key, and it
 * invalidates ALL of an account's keys at 100% of its spending limit — so the fallback's blast
 * radius is every map in every article the newsroom has already published.
 *
 * The three states below are the whole contract, and the third is the one that used to be silent.
 */
describe("substituteKeys — R1b clause 4, the delivered key", () => {
  const page = 'style.json?key=__MAPTILER' + '_KEY__"';

  it("should substitute the second, domain-restricted key", () => {
    expect(substituteKeys(page, { MAPTILER_DELIVERY_KEY: "restricted-key" })).toBe(
      'style.json?key=restricted-key"',
    );
  });

  it("should leave the placeholder alone when no key is configured at all", () => {
    // Not a silent failure: the delivered page renders its complete fallback layer, exactly as it
    // does offline or with JavaScript off. The live layer never boots, which is the honest outcome
    // for a delivery nobody gave a key to.
    expect(substituteKeys(page, {})).toBe(page);
  });

  it("should REFUSE to deliver the development key, naming both ways forward", () => {
    expect(() => substituteKeys(page, { MAPTILER_KEY: "development-key" })).toThrow(
      /MAPTILER_DELIVERY_KEY is not set/,
    );
    // The refusal has to be actionable, or it is just an obstacle: it names the second key, where
    // to create it, and the alternative of delivering the fallback layer.
    expect(() => substituteKeys(page, { MAPTILER_KEY: "development-key" })).toThrow(
      /restricted to the newsroom's own origins/,
    );
  });

  it("should prefer the delivery key even when the development key is also set", () => {
    expect(
      substituteKeys(page, { MAPTILER_DELIVERY_KEY: "restricted-key", MAPTILER_KEY: "development-key" }),
    ).toBe('style.json?key=restricted-key"');
  });
});
