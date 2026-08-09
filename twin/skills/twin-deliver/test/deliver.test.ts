import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, writeFile, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { offerForms, materialise } from "../scripts/deliver.mjs";

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
});
afterEach(async () => {
  await rm(join(beatDir, ".."), { recursive: true, force: true });
});

describe("offerForms", () => {
  it("should offer the owned file and the source bundle for a static chart", () => {
    const ids = offerForms({ medium: "chart", genre: "static" }).map(
      (f) => f.id,
    );
    expect(ids).toEqual(["owned-file", "source-bundle"]);
  });

  it("should never offer an embed for a static beat", () => {
    expect(
      offerForms({ medium: "chart", genre: "static" }).map((f) => f.id),
    ).not.toContain("embed");
  });

  it("should describe what each form gives, so the choice is informed", () => {
    for (const form of offerForms({ medium: "chart", genre: "static" })) {
      expect(form.gives.split(/\s+/).length).toBeGreaterThan(4);
    }
  });

  // Direct coverage of the genre-rejection path itself — the three tests above only ever call
  // offerForms with genre "static", so none of them would notice if this check stopped reading
  // the given genre at all. "print" stands in for a genre this project has never built a producer
  // for — unlike "video", which is now a real, deliverable genre (see the tests below).
  it("should refuse to offer anything for a genre it does not know", () => {
    expect(() => offerForms({ medium: "chart", genre: "print" })).toThrow(
      "print",
    );
  });

  it("should offer the owned file, the source bundle, and a CMS insertion for a web chart with no Cloudflare credentials", () => {
    const ids = offerForms({ medium: "chart", genre: "web", env: {} }).map(
      (f) => f.id,
    );
    expect(ids).toEqual(["owned-file", "source-bundle", "cms-insertion"]);
  });

  it("should offer the owned file and the source bundle for a video chart", () => {
    const ids = offerForms({ medium: "chart", genre: "video", env: {} }).map(
      (f) => f.id,
    );
    expect(ids).toEqual(["owned-file", "source-bundle"]);
  });

  it("should never offer an embed or a CMS insertion for static or video — neither genre is wired to either form yet", () => {
    for (const genre of ["static", "video"]) {
      const ids = offerForms({ medium: "chart", genre, env: {} }).map(
        (f) => f.id,
      );
      expect(ids).not.toContain("embed");
      expect(ids).not.toContain("cms-insertion");
    }
  });

  it("should never offer the hosted embed for a web chart when no Cloudflare credential is set", () => {
    const ids = offerForms({ medium: "chart", genre: "web", env: {} }).map(
      (f) => f.id,
    );
    expect(ids).not.toContain("embed");
  });

  it("should never offer the hosted embed when only the account id is set, missing the token", () => {
    const ids = offerForms({
      medium: "chart",
      genre: "web",
      env: { CLOUDFLARE_ACCOUNT_ID: "acct" },
    }).map((f) => f.id);
    expect(ids).not.toContain("embed");
  });

  it("should never offer the hosted embed when only the token is set, missing the account id", () => {
    const ids = offerForms({
      medium: "chart",
      genre: "web",
      env: { CLOUDFLARE_API_TOKEN: "tok" },
    }).map((f) => f.id);
    expect(ids).not.toContain("embed");
  });

  it("should offer the hosted embed for a web chart once both Cloudflare credentials are set", () => {
    const ids = offerForms({
      medium: "chart",
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
    const cmsForm = offerForms({ medium: "chart", genre: "web", env: {} }).find(
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
    });
    const files = await readdir(exportDir);
    expect(files).toContain("still.png");
    expect(files).toContain("still.svg");
    expect(files).not.toContain("package.json");
    expect(written).toHaveLength(2);
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
      materialise({ form: "embed", genre: "static", beatDir, exportDir }),
    ).rejects.toThrow("not an offered form");
  });

  // A form id that exists under one genre must not be accepted for a different genre just
  // because the id matches — the check is on the {form, genre} PAIR, never on the form id
  // alone. "owned-file" is a real id in FORMS_BY_GENRE.static, but genre "print" offers nothing
  // (no producer or delivery table for it), so it must be refused exactly like an id that never
  // existed anywhere.
  it("should refuse a form that exists for a different genre than the one given", async () => {
    await expect(
      materialise({ form: "owned-file", genre: "print", beatDir, exportDir }),
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
    });

    await expect(
      materialise({ form: "embed", genre: "static", beatDir, exportDir }),
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
    });
    expect(await readdir(exportDir)).toContain("still.png");

    await materialise({
      form: "source-bundle",
      genre: "static",
      beatDir,
      exportDir,
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
      });
      const files = await readdir(exportDir);
      expect(files).toContain("still.png");
      expect(files).toContain("still.svg");
      expect(files).not.toContain("package.json");
      expect(written).toHaveLength(2);
    });

    it(`should write a runnable bundle for a ${genre} beat when the source form is chosen`, async () => {
      await materialise({ form: "source-bundle", genre, beatDir, exportDir });
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
    });
    const files = await readdir(webExportDir);
    expect(files).toEqual(["EMBED_URL.txt"]);
    const url = await Bun.file(join(webExportDir, "EMBED_URL.txt")).text();
    expect(url.trim()).toBe("https://deadbeef.some-project.pages.dev");
    expect(written).toEqual([join(webExportDir, "EMBED_URL.txt")]);
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
    });
    const files = await readdir(webExportDir);
    expect(files).toEqual(["CMS-INSERTION.md"]);
    const doc = await Bun.file(join(webExportDir, "CMS-INSERTION.md")).text();
    expect(doc).toContain("UNPROVEN");
    expect(doc).toContain("<h1>rainfall</h1>"); // the beat's own HTML made it into the payload
    expect(written).toEqual([join(webExportDir, "CMS-INSERTION.md")]);
  });

  it("should honour a caller-supplied cms option, building a livingdocs insertion instead of the we-publish default", async () => {
    await materialise({
      form: "cms-insertion",
      genre: "web",
      beatDir: webBeatDir,
      exportDir: webExportDir,
      env: {},
      cms: { kind: "livingdocs", articleId: "real-article-id" },
    });
    const doc = await Bun.file(join(webExportDir, "CMS-INSERTION.md")).text();
    expect(doc).toContain("insertComponent");
    expect(doc).toContain("real-article-id");
  });

  it("should refuse to materialise cms-insertion when renders/ holds more than one file", async () => {
    await writeFile(join(webBeatDir, "renders", "extra.html"), "<p>extra</p>");
    await expect(
      materialise({
        form: "cms-insertion",
        genre: "web",
        beatDir: webBeatDir,
        exportDir: webExportDir,
        env: {},
      }),
    ).rejects.toThrow("expected exactly one file");
  });

  it("should clear a previously materialised embed when cms-insertion is chosen next", async () => {
    await materialise({
      form: "embed",
      genre: "web",
      beatDir: webBeatDir,
      exportDir: webExportDir,
      env: { CLOUDFLARE_ACCOUNT_ID: "acct", CLOUDFLARE_API_TOKEN: "tok" },
      fetchFn: fakeCloudflare(),
    });
    expect(await readdir(webExportDir)).toEqual(["EMBED_URL.txt"]);

    await materialise({
      form: "cms-insertion",
      genre: "web",
      beatDir: webBeatDir,
      exportDir: webExportDir,
      env: {},
    });
    const files = await readdir(webExportDir);
    expect(files).toEqual(["CMS-INSERTION.md"]);
  });
});
