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
  // the given genre at all.
  it("should refuse to offer anything for a genre it does not know", () => {
    expect(() => offerForms({ medium: "chart", genre: "video" })).toThrow(
      "static genre only",
    );
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
  // alone. "owned-file" is a real id in FORMS_BY_GENRE.static, but genre "video" offers nothing
  // (SP1 has one genre), so it must be refused exactly like an id that never existed anywhere.
  it("should refuse a form that exists for a different genre than the one given", async () => {
    await expect(
      materialise({ form: "owned-file", genre: "video", beatDir, exportDir }),
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
});
