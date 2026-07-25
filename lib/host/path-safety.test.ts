import { describe, it, expect } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { checkOutDir, outDirRefusal } from "./path-safety";

const scratch = (): string => mkdtempSync(join(tmpdir(), "host-outdir-"));

const CLI = join(import.meta.dir, "cli.ts");

async function cli(
  args: string[],
  stdin: string,
  cwd?: string,
): Promise<{ code: number; out: string; err: string }> {
  const p = Bun.spawn(["bun", CLI, ...args], {
    stdin: new TextEncoder().encode(stdin),
    stdout: "pipe",
    stderr: "pipe",
    ...(cwd ? { cwd } : {}),
  });
  const [out, err] = await Promise.all([
    new Response(p.stdout).text(),
    new Response(p.stderr).text(),
  ]);
  return { code: await p.exited, out, err };
}

function renderRequest(outDir: string): string {
  return JSON.stringify({
    engine: "chart-native",
    spec: { nativeType: "bar" },
    format: "static",
    channel: "article-web",
    outDir,
    id: "el1",
  });
}

describe("checkOutDir — the destructive boundary of the façade", () => {
  it("refuses a relative path, because it would resolve against the host's cwd", () => {
    const r = checkOutDir(".");
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.message).toContain("absolute");
  });

  it("refuses an empty or non-string outDir", () => {
    expect(checkOutDir("").ok).toBe(false);
    expect(checkOutDir("   ").ok).toBe(false);
  });

  it("refuses a filesystem root and a dangerously shallow path", () => {
    expect(checkOutDir("/").ok).toBe(false);
    expect(checkOutDir("/etc").ok).toBe(false);
    expect(checkOutDir(homedir()).ok).toBe(false);
    expect(checkOutDir(tmpdir()).ok).toBe(false);
  });

  it("refuses an ancestor of the process working directory", () => {
    const r = checkOutDir(join(process.cwd(), ".."));
    expect(r.ok).toBe(false);
  });

  it("accepts a fresh path under a deep enough directory", () => {
    const r = checkOutDir(join(scratch(), "elements", "el1"));
    expect(r.ok).toBe(true);
  });

  it("accepts an existing directory holding only artifacts a produce could have written", () => {
    const dir = join(scratch(), "elements", "el1");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "static.png"), "x");
    writeFileSync(join(dir, "config.json"), "{}");
    writeFileSync(join(dir, "native-source.json"), "{}");
    mkdirSync(join(dir, "frames"));
    expect(checkOutDir(dir).ok).toBe(true);
  });

  it("refuses — without deleting — a directory holding entries no produce writes", () => {
    const dir = join(scratch(), "victim");
    mkdirSync(join(dir, "sub"), { recursive: true });
    writeFileSync(join(dir, "keep.txt"), "important");
    writeFileSync(join(dir, "sub", "deep.txt"), "deep");

    const r = checkOutDir(dir);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.message).toContain("keep.txt");
    // The probe is non-destructive: nothing moved.
    expect(readdirSync(dir).sort()).toEqual(["keep.txt", "sub"]);
    expect(existsSync(join(dir, "sub", "deep.txt"))).toBe(true);
  });

  // The probe matches by ARTIFACT NAME, not by extension. An extension allowlist
  // (`png|html|mp4|json`) accepts a photo library, a budget spreadsheet and a wedding
  // video, and — worst case — a run directory whose only entry is `run.json`, the
  // manifest the README calls the run's single source of truth. Each case below pairs
  // the verdict with a filesystem assertion, because a guard that refuses while the
  // files are already gone has refused nothing.
  it("refuses — without deleting — a run directory whose only entry is run.json", () => {
    const dir = join(scratch(), "runs", "2026-07-24-annemasse");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "run.json"), '{"elements":[]}');

    const r = checkOutDir(dir);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.message).toContain("run.json");
    expect(readdirSync(dir)).toEqual(["run.json"]);
    expect(readFileSync(join(dir, "run.json"), "utf8")).toBe('{"elements":[]}');
  });

  it("refuses — without deleting — user files whose extensions a produce uses but whose names it never writes", () => {
    const dir = join(scratch(), "Pictures", "2026");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "IMG_0001.png"), "photo");
    writeFileSync(join(dir, "budget-2026.json"), '{"eur":1}');
    writeFileSync(join(dir, "wedding.mp4"), "video");
    writeFileSync(join(dir, "index.html"), "<p>album</p>");

    const r = checkOutDir(dir);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    for (const name of [
      "IMG_0001.png",
      "budget-2026.json",
      "wedding.mp4",
      "index.html",
    ])
      expect(existsSync(join(dir, name))).toBe(true);
    expect(readdirSync(dir).sort()).toEqual([
      "IMG_0001.png",
      "budget-2026.json",
      "index.html",
      "wedding.mp4",
    ]);
  });

  it("refuses — without deleting — a frames/ subdirectory holding something no produce wrote", () => {
    const dir = join(scratch(), "elements", "el1");
    mkdirSync(join(dir, "frames", "originals"), { recursive: true });
    writeFileSync(join(dir, "scrolly.html"), "<html></html>");
    writeFileSync(join(dir, "frames", "f0.jpg"), "jpeg");
    writeFileSync(join(dir, "frames", "originals", "negative.dng"), "raw");

    const r = checkOutDir(dir);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.message).toContain("frames/originals");
    expect(existsSync(join(dir, "frames", "originals", "negative.dng"))).toBe(
      true,
    );
    expect(existsSync(join(dir, "frames", "f0.jpg"))).toBe(true);
  });

  it("refuses — without deleting — a non-producible FILE directly inside frames/", () => {
    const dir = join(scratch(), "elements", "el1");
    mkdirSync(join(dir, "frames"), { recursive: true });
    writeFileSync(join(dir, "frames", "negative.dng"), "raw");

    const r = checkOutDir(dir);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.message).toContain("frames/negative.dng");
    expect(existsSync(join(dir, "frames", "negative.dng"))).toBe(true);
  });

  // The counterweight: the fix must not be "refuse everything". Each name below is
  // written by a real produce (see the ARTIFACT NAMES table in path-safety.ts), so a
  // re-produce over a prior output set has to keep working.
  it("accepts a genuine prior produce output set — a re-produce must keep working", () => {
    const cases: Record<string, string[]> = {
      "chart-native static": [
        "static.png",
        "config.json",
        "native-source.json",
        "brand-concerns.json",
      ],
      "chart-native interactive": [
        "interactive.html",
        "interactive.png",
        "config.json",
        "native-source.json",
      ],
      "chart-native video": [
        "landscape.mp4",
        "video-landscape-still.png",
        "video-landscape-final.png",
        "video-verify.json",
        "config.json",
        "native-source.json",
      ],
      "map-native static": ["static.png", "theme.png", "contrast-static.png"],
      "map-native interactive": [
        "interactive.html",
        "interactive.png",
        "contrast-interactive.png",
        "source-manifest.json",
        "config.json",
        "responsive-360.png",
        "responsive-768.png",
        "responsive-1100.png",
        "responsive-1600.png",
        "a11y.png",
      ],
      "map-native video": [
        "portrait.mp4",
        "video-portrait-still.png",
        "video-verify.json",
      ],
      scrolly: ["scrolly.html", "source-manifest.json", "config.json"],
    };
    for (const [label, names] of Object.entries(cases)) {
      const dir = join(scratch(), "elements", "el1");
      mkdirSync(dir, { recursive: true });
      for (const n of names) writeFileSync(join(dir, n), "x");
      const r = checkOutDir(dir);
      if (!r.ok) throw new Error(`${label} was refused: ${r.message}`);
      // Non-destructive probe: accepting does not delete either.
      expect(readdirSync(dir).sort()).toEqual([...names].sort());
    }
  });

  it("accepts an image-native output set, frames/*.jpg included", () => {
    const dir = join(scratch(), "elements", "el1");
    mkdirSync(join(dir, "frames"), { recursive: true });
    writeFileSync(join(dir, "scrolly.html"), "<html></html>");
    writeFileSync(join(dir, "prep-report.json"), "{}");
    writeFileSync(join(dir, "source-manifest.json"), "{}");
    writeFileSync(join(dir, "config.json"), "{}");
    for (const f of ["f0.jpg", "f1.jpg", "frame_2.jpg", "frame-3.jpg"])
      writeFileSync(join(dir, "frames", f), "jpeg");
    const r = checkOutDir(dir);
    if (!r.ok) throw new Error(`refused: ${r.message}`);
    expect(readdirSync(join(dir, "frames")).length).toBe(4);
  });

  // dw-chart / map-dw name their static PNG `<id>.png` from the request's own id
  // (skills/dw-chart/src/manifest.ts:27, skills/map-dw/src/manifest.ts:28), so the
  // producible name depends on the id the request carries — and ONLY on that id.
  it("accepts <id>.png for the id the request names, and refuses another id's png", () => {
    const dir = join(scratch(), "elements", "el1");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "el1.png"), "x");
    expect(checkOutDir(dir, "el1").ok).toBe(true);

    const other = checkOutDir(dir, "el2");
    expect(other.ok).toBe(false);
    if (other.ok) throw new Error("unreachable");
    expect(other.message).toContain("el1.png");
    expect(existsSync(join(dir, "el1.png"))).toBe(true);

    // No id in the request: an arbitrary png stem stays a stranger.
    expect(checkOutDir(dir).ok).toBe(false);
    // An unsafe id is not honoured as a name source either.
    expect(checkOutDir(dir, "../el1").ok).toBe(false);
    expect(existsSync(join(dir, "el1.png"))).toBe(true);
  });

  it("refuses a path that exists and is not a directory", () => {
    const dir = scratch();
    const file = join(dir, "notes.md");
    writeFileSync(file, "hello");
    const r = checkOutDir(file);
    expect(r.ok).toBe(false);
    expect(existsSync(file)).toBe(true);
  });

  it("is not defeated by `..` segments", () => {
    const r = checkOutDir(join(homedir(), "..", ".."));
    expect(r.ok).toBe(false);
  });

  it("is not defeated by a symlink pointing at a protected directory", () => {
    const dir = scratch();
    const link = join(dir, "shortcut");
    symlinkSync(homedir(), link);
    const r = checkOutDir(link);
    expect(r.ok).toBe(false);
  });

  it("resolves before deciding, so a symlinked deep directory is judged on its target", () => {
    const target = join(scratch(), "elements", "el1");
    mkdirSync(target, { recursive: true });
    writeFileSync(join(target, "keep.txt"), "important");
    const link = join(scratch(), "link");
    symlinkSync(target, link);
    const r = checkOutDir(link);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.message).toContain("keep.txt");
    expect(existsSync(join(target, "keep.txt"))).toBe(true);
  });
});

describe("outDirRefusal — a typed invalid-request, never a throw", () => {
  it("refuses a render payload with an unsafe outDir", () => {
    const r = outDirRefusal({ outDir: "." });
    expect(r).toBeDefined();
    expect(r!.ok).toBe(false);
    if (r!.ok) throw new Error("unreachable");
    expect(r!.code).toBe("invalid-request");
  });

  it("stays out of the way of payloads that carry no outDir string", () => {
    expect(outDirRefusal({})).toBeUndefined();
    expect(outDirRefusal({ outDir: 42 })).toBeUndefined();
    expect(outDirRefusal(null)).toBeUndefined();
    expect(outDirRefusal("not an object")).toBeUndefined();
  });
});

describe("the reviewer's reproductions, through the CLI", () => {
  it("an outDir naming a directory of unrelated content is refused, and nothing is deleted", async () => {
    const dir = join(scratch(), "victim");
    mkdirSync(join(dir, "sub"), { recursive: true });
    writeFileSync(join(dir, "keep.txt"), "important");
    writeFileSync(join(dir, "sub", "deep.txt"), "deep");

    const r = await cli(["verb", "render"], renderRequest(dir));
    expect(r.code).toBe(1);
    const body = JSON.parse(r.out);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("invalid-request");
    expect(existsSync(join(dir, "keep.txt"))).toBe(true);
    expect(existsSync(join(dir, "sub", "deep.txt"))).toBe(true);
  });

  it('{"outDir":"."} run from a populated directory is refused, and nothing is deleted', async () => {
    const cwd = join(scratch(), "cwd");
    mkdirSync(join(cwd, "sub"), { recursive: true });
    writeFileSync(join(cwd, "keep.txt"), "important");
    writeFileSync(join(cwd, "sub", "deep.txt"), "deep");

    const r = await cli(["verb", "render"], renderRequest("."), cwd);
    expect(r.code).toBe(1);
    const body = JSON.parse(r.out);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("invalid-request");
    expect(body.message).toContain("absolute");
    expect(existsSync(join(cwd, "keep.txt"))).toBe(true);
    expect(existsSync(join(cwd, "sub", "deep.txt"))).toBe(true);
  });

  // The two reproductions from the residual review, which the extension allowlist
  // answered with {"ok": true} and exit 0 while the files went away.
  it("a run directory holding only run.json is refused, and run.json survives", async () => {
    const dir = join(scratch(), "runs", "2026-07-24-annemasse");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "run.json"), '{"elements":[]}');

    const r = await cli(["verb", "render"], renderRequest(dir));
    expect(r.code).toBe(1);
    const body = JSON.parse(r.out);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("invalid-request");
    expect(body.message).toContain("run.json");
    expect(readdirSync(dir)).toEqual(["run.json"]);
    expect(readFileSync(join(dir, "run.json"), "utf8")).toBe('{"elements":[]}');
  });

  it("a photo/document folder is refused, and every user file survives", async () => {
    const dir = join(scratch(), "Pictures", "2026");
    mkdirSync(join(dir, "frames", "originals"), { recursive: true });
    writeFileSync(join(dir, "IMG_0001.png"), "photo");
    writeFileSync(join(dir, "budget-2026.json"), '{"eur":1}');
    writeFileSync(join(dir, "wedding.mp4"), "video");
    writeFileSync(join(dir, "frames", "originals", "negative.dng"), "raw");

    const r = await cli(["verb", "render"], renderRequest(dir));
    expect(r.code).toBe(1);
    const body = JSON.parse(r.out);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("invalid-request");
    expect(existsSync(join(dir, "IMG_0001.png"))).toBe(true);
    expect(existsSync(join(dir, "budget-2026.json"))).toBe(true);
    expect(existsSync(join(dir, "wedding.mp4"))).toBe(true);
    expect(existsSync(join(dir, "frames", "originals", "negative.dng"))).toBe(
      true,
    );
  });
});
