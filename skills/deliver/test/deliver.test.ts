import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  mkdtemp,
  mkdir,
  writeFile,
  rm,
  readdir,
  readFile,
  symlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import {
  offerForms as canonicalOfferForms,
  materialise as canonicalMaterialise,
  ownedFileForInsertion,
  exportDirFor as canonicalExportDirFor,
  substituteKeys,
  mapKeyState,
  embedCodeFor,
} from "../scripts/deliver.mjs";
import { cloudflareProjectName, cloudflareScrollerUrl } from "../scripts/deploy-embed.mjs";
import {
  offerFormsLegacyV1,
  materialiseLegacyV1,
} from "../scripts/delivery-compat-v1.mjs";
import { OUTPUT_REVIEW_FILE } from "../scripts/output-review.mjs";
import { readFileSync } from "node:fs";
import { replacementArtifacts } from "../scripts/delivery-replacement.mjs";
import {
  approveCurrentOutput,
  TEST_FINDING_IDS,
  TEST_PLAN_VERSION,
} from "./output-review-fixture";

// A hand-over payload, module-scope, because EVERY delivery needs one: G4 closes into
// `export/<beat>/HANDOVER.md` the way every other gate closes into a file. `materialise` used to
// return early when the caller passed none, so every form worked without one — and the run that
// produced A11 ("name the files, say where they go, give the advice") would have produced it again.
// Every field below is already recorded during the exchange: placement and credit are hand fields
// 4 and 5, alt is in the component, the caveat is the limits field.
const handover = {
  // `language` is one of them too, and it is the story's, read from STORYBOARD.md — the fixtures
  // below assert the English scaffold, so the fixture story is an English one. The French path is
  // driven end to end in its own case ("should write the hand-over in the story's own language").
  language: "en",
  placement: "after the paragraph on winter rainfall, article web, full width",
  alt: "Rainfall in Annemasse fell in three of the last four winters",
  credit: "Source: MeteoSwiss, as of 2026-08-10",
  caveat: "four winters is a short window",
};

function identityForBeat(beatDir: string) {
  const storyDir = dirname(dirname(beatDir));
  return {
    storiesRoot: dirname(storyDir),
    storyId: basename(storyDir),
    outputId: basename(beatDir),
  };
}

function exportDirFor(storyDir: string, outputId: string) {
  return canonicalExportDirFor({
    storiesRoot: dirname(storyDir),
    storyId: basename(storyDir),
    outputId,
  });
}

const offerFormsWithReview = (options: Record<string, any>) => {
  const { beatDir, exportDir: _exportDir, ...rest } = options;
  return canonicalOfferForms({ ...rest, ...identityForBeat(beatDir) });
};

const offerForms = (options: Record<string, any>) =>
  offerFormsLegacyV1({
    ...options,
    storiesRoot: options.beatDir
      ? identityForBeat(options.beatDir).storiesRoot
      : tempRoot,
    planVersion: TEST_PLAN_VERSION,
    findingIds: TEST_FINDING_IDS,
  });

// These cases exercise delivery behavior after review. Refresh their fixture record after any
// render setup; the review-gate cases below call the unwrapped public functions directly.
const materialise = async (options: Record<string, any>) => {
  if (options.beatDir) await approveCurrentOutput(options.beatDir);
  return materialiseLegacyV1({
    ...options,
    storiesRoot: options.beatDir
      ? identityForBeat(options.beatDir).storiesRoot
      : tempRoot,
    planVersion: TEST_PLAN_VERSION,
    findingIds: TEST_FINDING_IDS,
  });
};

const materialiseWithReview = (options: Record<string, any>) => {
  const { beatDir, exportDir: _exportDir, ...rest } = options;
  return canonicalMaterialise({ ...rest, ...identityForBeat(beatDir) });
};

let tempRoot: string, storyDir: string, beatDir: string, exportDir: string;
beforeEach(async () => {
  tempRoot = await mkdtemp(join(tmpdir(), "beat-"));
  storyDir = join(tempRoot, "story");
  beatDir = join(storyDir, "beats", "1-rainfall");
  exportDir = exportDirFor(storyDir, "1-rainfall");
  await mkdir(join(beatDir, "renders"), { recursive: true });
  await mkdir(exportDir, { recursive: true });
  await writeFile(join(beatDir, "renders", "still.png"), "png-bytes");
  await writeFile(join(beatDir, "renders", "still.svg"), "<svg/>");
  await writeFile(
    join(beatDir, "Rainfall.tsx"),
    "export const Rainfall = () => null;",
  );
  await writeFile(join(beatDir, "data.json"), "[]");
  // G3 has closed for this fixture: review and passing QA are bound to this exact render.
  await approveCurrentOutput(beatDir);
});
afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe("offerForms — Gate 3 before Gate 4", () => {
  // Delivery cannot honestly be discussed before the journalist has SEEN the thing being
  // delivered. The run discussed it twice before it could -- once before production began, once
  // inside the Gate-3 approval question itself ("hosted embed = closed") -- and both statements
  // were wrong and had to be retracted the moment this function was finally called. The forms are
  // this function's output; they are not knowable without it. So calling it early fails loudly.
  it("should refuse to name a single form before the beat has been approved", async () => {
    await rm(join(beatDir, OUTPUT_REVIEW_FILE));
    expect(() =>
      offerForms({ beatDir, medium: "chart", format: "static" }),
    ).toThrow(/no bound review/);
  });

  it("should say what it looked for, so the refusal is actionable", async () => {
    await rm(join(beatDir, OUTPUT_REVIEW_FILE));
    expect(() =>
      offerForms({ beatDir, medium: "chart", format: "static" }),
    ).toThrow(/OUTPUT-REVIEW\.json/);
  });

  it("should refuse a call that names no beat directory at all", () => {
    expect(() => offerForms({ medium: "chart", format: "static" })).toThrow(
      /needs the beat directory/,
    );
  });

  it("should require the caller's current plan binding", () => {
    expect(() =>
      offerFormsWithReview({ beatDir, medium: "chart", format: "static" }),
    ).toThrow(/current planVersion/);
  });

  it("should refuse a render changed after review", async () => {
    await writeFile(join(beatDir, "renders", "still.png"), "changed-png");
    expect(() =>
      offerForms({ beatDir, medium: "chart", format: "static" }),
    ).toThrow(/rendered draft changed/);
  });
});

describe("offerForms", () => {
  it("should keep the G4 prompt explicitly about a delivery form, not publication format", () => {
    const skill = readFileSync(
      join(import.meta.dirname, "..", "SKILL.md"),
      "utf8",
    );
    expect(skill).toContain("Which delivery form should Splash provide?");
    expect(skill).toMatch(/does not call this a publication-format choice/);
  });

  it("should reject the legacy runtime field even when canonical format is also present", () => {
    expect(() =>
      offerFormsWithReview({
        beatDir,
        medium: "chart",
        format: "static",
        genre: "static",
        planVersion: TEST_PLAN_VERSION,
        findingIds: TEST_FINDING_IDS,
      }),
    ).toThrow(/does not accept genre/);
  });

  it("should offer the owned file, a CMS insertion, and the source bundle for a static chart", () => {
    const ids = offerForms({ beatDir, medium: "chart", format: "static" }).map(
      (f) => f.id,
    );
    expect(ids).toEqual(["owned-file", "cms-insertion", "source-bundle"]);
  });

  // The owner names source-bundle in none of the three per-format lists they asked for: it is a
  // developer artifact. It is KEPT, because it works and a newsroom with a developer wants it, and
  // TAGGED, so the delivery question can offer the journalist-facing forms as the real choice and
  // mention this one in a line below them.
  it("should tag the source bundle as a developer artifact, in every format, and tag nothing else", () => {
    for (const format of ["static", "web", "video", "scrolly"]) {
      for (const form of offerForms({
        beatDir,
        medium: "chart",
        format,
        env: {},
      })) {
        expect(form.audience).toBe(
          form.id === "source-bundle" ? "developer" : undefined,
        );
      }
    }
  });

  it("should never offer an embed for a static beat", () => {
    expect(
      offerForms({ beatDir, medium: "chart", format: "static" }).map(
        (f) => f.id,
      ),
    ).not.toContain("embed");
  });

  it("should describe what each form gives, so the choice is informed", () => {
    for (const form of offerForms({
      beatDir,
      medium: "chart",
      format: "static",
    })) {
      expect(form.gives.split(/\s+/).length).toBeGreaterThan(4);
    }
  });

  it("should not promise an SVG when a static producer only made a PNG", () => {
    const owned = offerForms({
      beatDir,
      medium: "chart",
      format: "static",
    }).find((form) => form.id === "owned-file");
    expect(owned.gives).toContain("PNG");
    expect(owned.gives).toContain("when the producer made one");
    expect(owned.gives).not.toContain("a PNG and an SVG");
  });

  // Direct coverage of the format-rejection path itself — the three tests above only ever call
  // offerForms with format "static", so none of them would notice if this check stopped reading
  // the given format at all. "print" stands in for a format this project has never built a producer
  // for — unlike "video", which is now a real, deliverable format (see the tests below).
  it("should refuse to offer anything for a format it does not know", () => {
    expect(() =>
      offerForms({ beatDir, medium: "chart", format: "print" }),
    ).toThrow("print");
  });

  it("should keep hosted delivery visible but disabled when Cloudflare is not configured", () => {
    const forms = offerForms({
      beatDir,
      medium: "chart",
      format: "web",
      env: {},
    });
    expect(forms.map((form) => form.id)).toEqual([
      "owned-file",
      "source-bundle",
      "embed",
      "cms-insertion",
    ]);
    expect(forms.find((form) => form.id === "embed")).toMatchObject({
      available: false,
      reason: expect.stringContaining("CLOUDFLARE_ACCOUNT_ID"),
    });
  });

  it("should offer the owned file, a CMS insertion, and the source bundle for a video chart", () => {
    const ids = offerForms({
      beatDir,
      medium: "chart",
      format: "video",
      env: {},
    }).map((f) => f.id);
    expect(ids).toEqual(["owned-file", "cms-insertion", "source-bundle"]);
  });

  // A hosted embed serves a PAGE. A static beat's PNG and a video beat's mp4 are not pages, so
  // "embed" stays wired to the two formats that ship one. cms-insertion is different — it prepares a
  // payload around a file, which those formats do have — and widening it was the follow-up this
  // file's own comment had promised.
  it("should never offer an embed for static or video — neither ships a page to host", () => {
    for (const format of ["static", "video"]) {
      const ids = offerForms({ beatDir, medium: "chart", format, env: {} }).map(
        (f) => f.id,
      );
      expect(ids).not.toContain("embed");
    }
  });

  it("should disable the hosted embed for a web chart when no Cloudflare credential is set", () => {
    const embed = offerForms({
      beatDir,
      medium: "chart",
      format: "web",
      env: {},
    }).find((form) => form.id === "embed");
    expect(embed?.available).toBe(false);
  });

  it("should disable the hosted embed when only the account id is set, missing the token", () => {
    const embed = offerForms({
      beatDir,
      medium: "chart",
      format: "web",
      env: { CLOUDFLARE_ACCOUNT_ID: "acct" },
    }).find((form) => form.id === "embed");
    expect(embed).toMatchObject({
      available: false,
      reason: expect.stringContaining("CLOUDFLARE_API_TOKEN"),
    });
  });

  it("should disable the hosted embed when only the token is set, missing the account id", () => {
    const embed = offerForms({
      beatDir,
      medium: "chart",
      format: "web",
      env: { CLOUDFLARE_API_TOKEN: "tok" },
    }).find((form) => form.id === "embed");
    expect(embed).toMatchObject({
      available: false,
      reason: expect.stringContaining("CLOUDFLARE_ACCOUNT_ID"),
    });
  });

  it("should offer the hosted embed for a web chart once both Cloudflare credentials are set", () => {
    const forms = offerForms({
      beatDir,
      medium: "chart",
      format: "web",
      env: { CLOUDFLARE_ACCOUNT_ID: "acct", CLOUDFLARE_API_TOKEN: "tok" },
    });
    expect(forms.map((form) => form.id)).toEqual([
      "owned-file",
      "source-bundle",
      "embed",
      "cms-insertion",
    ]);
    expect(forms.find((form) => form.id === "embed")?.available).toBe(true);
  });

  it("should describe the CMS insertion form honestly, naming that nothing is inserted automatically", () => {
    const cmsForm = offerForms({
      beatDir,
      medium: "chart",
      format: "web",
      env: {},
    }).find((f) => f.id === "cms-insertion");
    expect(cmsForm?.gives).toMatch(/not yet wired to a live CMS/);
  });
});

describe("materialise", () => {
  it("should reject a caller-supplied Cloudflare project name on the canonical API", async () => {
    await expect(
      materialiseWithReview({
        form: "owned-file",
        format: "static",
        beatDir,
        projectName: "shared-project",
        handover,
        planVersion: TEST_PLAN_VERSION,
        findingIds: TEST_FINDING_IDS,
      }),
    ).rejects.toThrow(/does not accept projectName/);
    expect(await readdir(exportDir)).toEqual([]);
  });

  it("should reject the legacy runtime field before touching an existing delivery", async () => {
    await expect(
      materialiseWithReview({
        form: "owned-file",
        format: "static",
        genre: "static",
        beatDir,
        handover,
        planVersion: TEST_PLAN_VERSION,
        findingIds: TEST_FINDING_IDS,
      }),
    ).rejects.toThrow(/does not accept genre/);
    expect(await readdir(exportDir)).toEqual([]);
  });

  it("should enforce approval when materialise is called directly and preserve the last export", async () => {
    await writeFile(join(exportDir, "previous.txt"), "last-good");
    await rm(join(beatDir, OUTPUT_REVIEW_FILE));

    await expect(
      materialiseWithReview({
        form: "owned-file",
        format: "static",
        beatDir,
        exportDir,
        handover,
        planVersion: TEST_PLAN_VERSION,
        findingIds: TEST_FINDING_IDS,
      }),
    ).rejects.toThrow(/OUTPUT-REVIEW\.json/);

    expect(await readFile(join(exportDir, "previous.txt"), "utf8")).toBe(
      "last-good",
    );
  });

  it("should reject a stale render when called directly and preserve the last export", async () => {
    await writeFile(join(exportDir, "previous.txt"), "last-good");
    await writeFile(join(beatDir, "renders", "still.png"), "changed-png");

    await expect(
      materialiseWithReview({
        form: "owned-file",
        format: "static",
        beatDir,
        exportDir,
        handover,
        planVersion: TEST_PLAN_VERSION,
        findingIds: TEST_FINDING_IDS,
      }),
    ).rejects.toThrow(/rendered draft changed/);

    expect(await readFile(join(exportDir, "previous.txt"), "utf8")).toBe(
      "last-good",
    );
  });

  it("should reject an export directory outside the story without touching it", async () => {
    const outside = join(tempRoot, "outside");
    await mkdir(outside);
    await writeFile(join(outside, "sentinel.txt"), "keep-me");

    await expect(
      materialise({
        form: "owned-file",
        format: "static",
        beatDir,
        exportDir: outside,
        handover,
      }),
    ).rejects.toThrow(/export directory/);

    expect(await readFile(join(outside, "sentinel.txt"), "utf8")).toBe(
      "keep-me",
    );
  });

  it("should reject a symlinked export directory without touching its target", async () => {
    const outside = join(tempRoot, "outside");
    await mkdir(outside);
    await writeFile(join(outside, "sentinel.txt"), "keep-me");
    await rm(exportDir, { recursive: true });
    await symlink(outside, exportDir, "dir");

    await expect(
      materialise({
        form: "owned-file",
        format: "static",
        beatDir,
        exportDir,
        handover,
      }),
    ).rejects.toThrow(/symlink/);

    expect(await readFile(join(outside, "sentinel.txt"), "utf8")).toBe(
      "keep-me",
    );
  });

  it("should reject a symlinked story directory without touching its target", async () => {
    const realStory = join(tempRoot, "real-story");
    const realBeat = join(realStory, "beats", "1-linked");
    const linkedStory = join(tempRoot, "linked-story");
    await mkdir(join(realBeat, "renders"), { recursive: true });
    await writeFile(join(realBeat, "renders", "still.png"), "outside-render");
    await writeFile(join(realBeat, "APPROVED.md"), "approved");
    await symlink(realStory, linkedStory, "dir");

    await expect(
      materialise({
        form: "owned-file",
        format: "static",
        beatDir: join(linkedStory, "beats", "1-linked"),
        exportDir: exportDirFor(linkedStory, "1-linked"),
        handover,
      }),
    ).rejects.toThrow(/symlink/);

    expect(await readdir(realStory)).toEqual(["beats"]);
  });

  it("should reject a non-directory export target without replacing it", async () => {
    await rm(exportDir, { recursive: true });
    await writeFile(exportDir, "keep-me");

    await expect(
      materialise({
        form: "owned-file",
        format: "static",
        beatDir,
        exportDir,
        handover,
      }),
    ).rejects.toThrow(/non-directory/);

    expect(await readFile(exportDir, "utf8")).toBe("keep-me");
  });

  it("should refuse a symlink inside rendered source without reading its target", async () => {
    const outside = join(tempRoot, "outside-render.txt");
    await writeFile(outside, "private-data");
    await symlink(outside, join(beatDir, "renders", "linked.png"));
    await writeFile(join(exportDir, "previous.txt"), "last-good");

    await expect(
      materialise({
        form: "owned-file",
        format: "static",
        beatDir,
        exportDir,
        handover,
      }),
    ).rejects.toThrow(/symbolic link/);

    expect(await readFile(join(exportDir, "previous.txt"), "utf8")).toBe(
      "last-good",
    );
  });

  it("should refuse a symlinked renders directory without reading its target", async () => {
    const outsideRenders = join(tempRoot, "outside-renders");
    await mkdir(outsideRenders);
    await writeFile(join(outsideRenders, "still.png"), "private-data");
    await rm(join(beatDir, "renders"), { recursive: true });
    await symlink(outsideRenders, join(beatDir, "renders"), "dir");
    await writeFile(join(exportDir, "previous.txt"), "last-good");

    await expect(
      materialise({
        form: "owned-file",
        format: "static",
        beatDir,
        exportDir,
        handover,
      }),
    ).rejects.toThrow(/symlink/);

    expect(await readFile(join(exportDir, "previous.txt"), "utf8")).toBe(
      "last-good",
    );
  });

  it("should refuse a symlink inside a source bundle without reading its target", async () => {
    const outside = join(tempRoot, "outside-source.txt");
    await writeFile(outside, "private-data");
    await symlink(outside, join(beatDir, "linked-source.txt"));
    await writeFile(join(exportDir, "previous.txt"), "last-good");

    await expect(
      materialise({
        form: "source-bundle",
        format: "static",
        beatDir,
        exportDir,
        handover,
      }),
    ).rejects.toThrow(/symbolic link/);

    expect(await readFile(join(exportDir, "previous.txt"), "utf8")).toBe(
      "last-good",
    );
  });

  it("should preserve the last good export when a replacement fails", async () => {
    await rm(join(beatDir, "renders"), { recursive: true });
    await mkdir(join(beatDir, "renders"));
    await writeFile(join(beatDir, "renders", "index.html"), "<main>new</main>");
    await writeFile(join(exportDir, "previous.txt"), "last-good");

    await expect(
      materialise({
        form: "embed",
        format: "web",
        beatDir,
        exportDir,
        handover,
        env: {
          CLOUDFLARE_ACCOUNT_ID: "account",
          CLOUDFLARE_API_TOKEN: "token",
        },
        fetchFn: async () => {
          throw new Error("network down");
        },
      }),
    ).rejects.toThrow(/network down/);

    expect(await readFile(join(exportDir, "previous.txt"), "utf8")).toBe(
      "last-good",
    );
  });

  it("should serialize concurrent materialisations for the same output", async () => {
    await materialise({
      form: "owned-file",
      format: "static",
      beatDir,
      exportDir,
      handover,
    });

    const events: string[] = [];
    let releaseFirst: () => void;
    const firstMayPublish = new Promise<void>((resolvePublish) => {
      releaseFirst = resolvePublish;
    });
    let firstReachedRename: () => void;
    const firstAtRename = new Promise<void>((resolveRename) => {
      firstReachedRename = resolveRename;
    });

    const first = materialise({
      form: "source-bundle",
      format: "static",
      beatDir,
      exportDir,
      handover,
      replacementHooks: {
        beforeMovePrevious: async () => {
          events.push("first");
          firstReachedRename();
          await firstMayPublish;
        },
      },
    });
    await firstAtRename;
    const second = materialise({
      form: "owned-file",
      format: "static",
      beatDir,
      exportDir,
      handover,
      replacementHooks: {
        beforeMovePrevious: () => events.push("second"),
      },
    });
    await Bun.sleep(10);
    expect(events).toEqual(["first"]);
    releaseFirst();
    await Promise.all([first, second]);

    expect(events).toEqual(["first", "second"]);
    expect(await readdir(exportDir)).toContain("still.png");
    expect(await Bun.file(join(exportDir, "build.ts")).exists()).toBe(false);
  });

  it("should reconcile abandoned staging before starting a new delivery", async () => {
    const abandoned = replacementArtifacts(
      exportDir,
      "interrupted-build",
    ).stagingDir;
    await mkdir(abandoned);
    await writeFile(join(abandoned, "partial.txt"), "never publish this");

    await materialise({
      form: "owned-file",
      format: "static",
      beatDir,
      exportDir,
      handover,
    });

    expect(await readdir(dirname(exportDir))).not.toContain(
      basename(abandoned),
    );
    expect(await Bun.file(join(exportDir, "partial.txt")).exists()).toBe(false);
    expect(await readFile(join(exportDir, "still.png"), "utf8")).toBe(
      "png-bytes",
    );
  });

  it("should write only the owned file when that form is chosen", async () => {
    const written = await materialise({
      form: "owned-file",
      format: "static",
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
      format: "static",
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
      format: "static",
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
      materialise({
        form: "embed",
        format: "static",
        beatDir,
        exportDir,
        handover,
      }),
    ).rejects.toThrow("not an offered form");
  });

  // A form id that exists under one format must not be accepted for a different format just
  // because the id matches — the check is on the {form, format} PAIR, never on the form id
  // alone. "owned-file" is a real id in FORMS_BY_FORMAT.static, but format "print" offers nothing
  // (no producer or delivery table for it), so it must be refused exactly like an id that never
  // existed anywhere.
  it("should refuse a form that exists for a different format than the one given", async () => {
    await expect(
      materialise({
        form: "owned-file",
        format: "print",
        beatDir,
        exportDir,
        handover,
      }),
    ).rejects.toThrow("not an offered form");
  });

  // Probe: refusing an unoffered form is a validation failure, not a delivery — it must not
  // destroy a form the journalist already has sitting in exportDir.
  it("should leave an already-delivered form untouched when a later choice is refused", async () => {
    await materialise({
      form: "owned-file",
      format: "static",
      beatDir,
      exportDir,
      handover,
    });

    await expect(
      materialise({
        form: "embed",
        format: "static",
        beatDir,
        exportDir,
        handover,
      }),
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
      format: "static",
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
      format: "static",
      beatDir,
      exportDir,
      handover,
    });
    expect(await readdir(exportDir)).toContain("still.png");

    await materialise({
      form: "source-bundle",
      format: "static",
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
      format: "static",
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
  // does "static" — this is the defect the format table fix closes: before it, both formats threw
  // "not an offered form" for every form id, however the renders/ directory was populated.
  for (const format of ["web", "video"]) {
    it(`should write only the owned file for a ${format} beat when that form is chosen`, async () => {
      const written = await materialise({
        form: "owned-file",
        format,
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

    it(`should write a runnable bundle for a ${format} beat when the source form is chosen`, async () => {
      await materialise({
        form: "source-bundle",
        format,
        beatDir,
        exportDir,
        handover,
      });
      const files = await readdir(exportDir);
      expect(files).toContain("package.json");
      expect(files).toContain("Rainfall.tsx");
      expect(files).not.toContain("renders");
    });
  }
});

// A fake of the same project-create and direct-upload sequence `test/deploy-embed.test.ts` exercises directly
// — duplicated rather than imported, the same "a skill's own test files don't share fixtures
// across files" shape the rest of this codebase already uses. This is only ever reached through
// `materialise`, so it only needs to prove the plumbing gets there and back with the right URL.
function fakeCloudflare({ varyDeployments = false } = {}) {
  let deploymentNumber = 0;
  const deployments = new Map<
    string,
    { id: string; url: string; commitHash: string }
  >();
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
      deploymentNumber++;
      const parts = path.split("/");
      const projectName = parts[parts.indexOf("projects") + 1];
      const tag = varyDeployments ? `deploy-${deploymentNumber}` : "deadbeef";
      const deployment = {
        id: `deployment-${deploymentNumber}`,
        url: `https://${tag}.${projectName}.pages.dev`,
        commitHash: (init!.body as FormData).get("commit_hash") as string,
      };
      deployments.set(deployment.id, deployment);
      return new Response(
        JSON.stringify({
          success: true,
          result: {
            id: deployment.id,
            url: deployment.url,
            aliases: [`https://${projectName}.pages.dev`],
          },
        }),
      );
    }
    const deploymentMatch = path.match(/\/deployments\/(deployment-\d+)$/);
    if (deploymentMatch && init?.method !== "POST") {
      const deployment = deployments.get(deploymentMatch[1]);
      if (!deployment)
        throw new Error(`fakeCloudflare: missing ${deploymentMatch[1]}`);
      return new Response(
        JSON.stringify({
          success: true,
          result: {
            id: deployment.id,
            url: deployment.url,
            deployment_trigger: {
              metadata: { commit_hash: deployment.commitHash },
            },
          },
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

describe("materialise — hosted embed and CMS insertion (web format)", () => {
  let webTempRoot: string, webBeatDir: string, webExportDir: string;
  beforeEach(async () => {
    webTempRoot = await mkdtemp(join(tmpdir(), "web-beat-"));
    const webStoryDir = join(webTempRoot, "story");
    webBeatDir = join(webStoryDir, "beats", "1-rainfall-web");
    webExportDir = exportDirFor(webStoryDir, "1-rainfall-web");
    await mkdir(join(webBeatDir, "renders"), { recursive: true });
    await writeFile(
      join(webBeatDir, "renders", "rainfall.html"),
      "<!doctype html><html><body><h1>rainfall</h1></body></html>",
    );
    await writeFile(
      join(webBeatDir, "APPROVED.md"),
      "seen at full size, approved",
    );
  });
  afterEach(async () => {
    await rm(webTempRoot, { recursive: true, force: true });
  });

  it("should refuse to materialise the embed form without a Cloudflare credential", async () => {
    await expect(
      materialise({
        form: "embed",
        format: "web",
        beatDir: webBeatDir,
        exportDir: webExportDir,
        env: {},
        handover,
      }),
    ).rejects.toThrow("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN");
    expect(
      await Bun.file(join(webTempRoot, ".splash-instance-id")).exists(),
    ).toBe(false);
  });

  it("should write the stable URL, iframe code, and deployment receipt when deploy is chosen", async () => {
    const written = await materialise({
      form: "embed",
      format: "web",
      beatDir: webBeatDir,
      exportDir: webExportDir,
      env: { CLOUDFLARE_ACCOUNT_ID: "acct", CLOUDFLARE_API_TOKEN: "tok" },
      fetchFn: fakeCloudflare(),
      handover,
    });
    // Dotfiles filtered: `materialise` leaves a `.delivered-from` receipt naming the beat, which
    // is bookkeeping (it is what refuses a SECOND beat delivering over this one), not a delivered
    // file. `written` below is the real "only one file was delivered" assertion, and it is unfiltered.
    const files = (await readdir(webExportDir)).filter(
      (f) => !f.startsWith("."),
    );
    expect(files.sort()).toEqual([
      "DEPLOYMENT.json",
      "EMBED_CODE.html",
      "EMBED_URL.txt",
      "HANDOVER.md",
      "splash-iframe-scroller.js",
    ]);
    const url = await Bun.file(join(webExportDir, "EMBED_URL.txt")).text();
    const instanceId = (
      await readFile(join(webTempRoot, ".splash-instance-id"), "utf8")
    ).trim();
    const projectName = cloudflareProjectName(
      instanceId,
      "story",
      "1-rainfall-web",
    );
    // The address a journalist may paste straight into a CMS that accepts only a URL: it carries
    // the marker, because the CMS builds the iframe itself and `data-splash-embed` never survives.
    // DEPLOYMENT.json's own `publicUrl` stays unmarked — `deploy-embed.mjs` requires it to be
    // exactly the stable project URL, and a query string there fails reconciliation.
    expect(url.trim()).toBe(`https://${projectName}.pages.dev?splash`);
    // The `?splash` marker is what lets `splash-iframe-scroller.js` recognise this iframe when a
    // CMS has rebuilt the markup from a bare URL and the `data-splash-embed` attribute did not
    // survive — see that script's own header comment.
    expect(
      await Bun.file(join(webExportDir, "EMBED_CODE.html")).text(),
    ).toContain(
      `<iframe data-splash-embed src="https://${projectName}.pages.dev/?splash"`,
    );
    expect(
      JSON.parse(await readFile(join(webExportDir, "DEPLOYMENT.json"), "utf8")),
    ).toMatchObject({
      schemaVersion: 2,
      provider: "cloudflare-pages",
      storyId: "story",
      outputId: "1-rainfall-web",
      projectName,
      publicUrl: `https://${projectName}.pages.dev`,
      immutableDeploymentUrl: `https://deadbeef.${projectName}.pages.dev`,
      editableSource: "beats/1-rainfall-web/",
      stableAcrossRevisions: true,
    });
    expect(written).toEqual([
      join(webExportDir, "EMBED_URL.txt"),
      join(webExportDir, "EMBED_CODE.html"),
      join(webExportDir, "splash-iframe-scroller.js"),
      join(webExportDir, "DEPLOYMENT.json"),
      join(webExportDir, "HANDOVER.md"),
    ]);
  });

  it("should keep the public URL stable across two approved revisions", async () => {
    const fetchFn = fakeCloudflare({ varyDeployments: true });
    await materialise({
      form: "embed",
      format: "web",
      beatDir: webBeatDir,
      exportDir: webExportDir,
      env: { CLOUDFLARE_ACCOUNT_ID: "acct", CLOUDFLARE_API_TOKEN: "tok" },
      fetchFn,
      handover,
    });
    const first = JSON.parse(
      await readFile(join(webExportDir, "DEPLOYMENT.json"), "utf8"),
    );

    await writeFile(
      join(webBeatDir, "renders", "rainfall.html"),
      "<!doctype html><html><body><h1>revised rainfall</h1></body></html>",
    );
    await materialise({
      form: "embed",
      format: "web",
      beatDir: webBeatDir,
      exportDir: webExportDir,
      env: { CLOUDFLARE_ACCOUNT_ID: "acct", CLOUDFLARE_API_TOKEN: "tok" },
      fetchFn,
      handover,
    });
    const second = JSON.parse(
      await readFile(join(webExportDir, "DEPLOYMENT.json"), "utf8"),
    );

    expect(second.publicUrl).toBe(first.publicUrl);
    expect(second.projectName).toBe(first.projectName);
    expect(second.splashInstanceId).toBe(first.splashInstanceId);
    expect(second.immutableDeploymentUrl).not.toBe(
      first.immutableDeploymentUrl,
    );
  });

  it("should reuse a successful remote deployment after local publication fails", async () => {
    await materialise({
      form: "owned-file",
      format: "web",
      beatDir: webBeatDir,
      exportDir: webExportDir,
      handover,
    });
    const base = fakeCloudflare();
    let deploymentPosts = 0;
    const fetchFn = async (url: string, init?: RequestInit) => {
      if (
        new URL(url).pathname.endsWith("/deployments") &&
        init?.method === "POST"
      ) {
        deploymentPosts++;
      }
      return base(url, init);
    };

    await expect(
      materialise({
        form: "embed",
        format: "web",
        beatDir: webBeatDir,
        exportDir: webExportDir,
        env: { CLOUDFLARE_ACCOUNT_ID: "acct", CLOUDFLARE_API_TOKEN: "tok" },
        fetchFn,
        handover,
        replacementHooks: {
          beforePublishStaging: () => {
            throw new Error("local publication fault");
          },
        },
      }),
    ).rejects.toThrow(/local publication fault/);

    expect(await Bun.file(join(webExportDir, "rainfall.html")).exists()).toBe(
      true,
    );
    expect(await Bun.file(join(webExportDir, "EMBED_URL.txt")).exists()).toBe(
      false,
    );
    const exportRoot = dirname(webExportDir);
    const recordNames = (await readdir(exportRoot)).filter((name) =>
      name.includes("-hosted-deployment-"),
    );
    expect(recordNames).toHaveLength(2);
    const remoteRecords = await Promise.all(
      recordNames.map(async (name) =>
        JSON.parse(await readFile(join(exportRoot, name), "utf8"))),
    );
    expect(remoteRecords.map((record) => record.outputId).sort()).toEqual([
      "1-rainfall-web",
      "splash-iframe-scroller",
    ]);
    expect(remoteRecords.every((record) => record.state === "remote-complete")).toBe(true);

    await materialise({
      form: "embed",
      format: "web",
      beatDir: webBeatDir,
      exportDir: webExportDir,
      env: { CLOUDFLARE_ACCOUNT_ID: "acct", CLOUDFLARE_API_TOKEN: "tok" },
      fetchFn,
      handover,
    });

    expect(deploymentPosts).toBe(2);
    expect(
      await Bun.file(join(webExportDir, "EMBED_URL.txt")).text(),
    ).toContain(
      `https://${cloudflareProjectName(
        (
          await readFile(join(webTempRoot, ".splash-instance-id"), "utf8")
        ).trim(),
        "story",
        "1-rainfall-web",
      )}.pages.dev`,
    );
    const completedRecords = await Promise.all(
      recordNames.map(async (name) =>
        JSON.parse(await readFile(join(exportRoot, name), "utf8"))),
    );
    expect(completedRecords.every((record) => record.state === "local-complete")).toBe(true);
  });

  it("should refuse to materialise embed when renders/ holds more than one file", async () => {
    await writeFile(join(webBeatDir, "renders", "extra.html"), "<p>extra</p>");
    await expect(
      materialise({
        form: "embed",
        format: "web",
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
      format: "web",
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
    const files = (await readdir(webExportDir)).filter(
      (f) => !f.startsWith("."),
    );
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
      format: "web",
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

  it("should refuse to materialise cms-insertion when renders/ holds two files of the format's own kind", async () => {
    await writeFile(join(webBeatDir, "renders", "extra.html"), "<p>extra</p>");
    await expect(
      materialise({
        form: "cms-insertion",
        format: "web",
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
      format: "web",
      beatDir: webBeatDir,
      exportDir: webExportDir,
      env: { CLOUDFLARE_ACCOUNT_ID: "acct", CLOUDFLARE_API_TOKEN: "tok" },
      fetchFn: fakeCloudflare(),
      handover,
    });
    expect(
      (await readdir(webExportDir)).filter((f) => !f.startsWith(".")).sort(),
    ).toEqual([
      "DEPLOYMENT.json",
      "EMBED_CODE.html",
      "EMBED_URL.txt",
      "HANDOVER.md",
      "splash-iframe-scroller.js",
    ]);

    await materialise({
      form: "cms-insertion",
      format: "web",
      beatDir: webBeatDir,
      exportDir: webExportDir,
      env: {},
      handover,
    });
    const files = (await readdir(webExportDir)).filter(
      (f) => !f.startsWith("."),
    );
    expect(files.sort()).toEqual(["CMS-INSERTION.md", "HANDOVER.md"]);
  });
});

// A static beat legitimately holds TWO rendered files -- still.png and still.svg -- and the
// single-file guard read that as ambiguity, which is why cms-insertion could not be offered for
// static at all. It is not ambiguity: for an insertion the vector is the answer and the raster is
// the fallback, and a per-format preference table is the difference between "two files" and a
// decision.
describe("ownedFileForInsertion — which file goes to the CMS", () => {
  it("should pick the SVG from a static beat that holds both an SVG and a PNG", async () => {
    expect(await ownedFileForInsertion(beatDir, "static")).toBe("still.svg");
  });

  it("should fall to the PNG when the beat rendered no vector", async () => {
    await rm(join(beatDir, "renders", "still.svg"));
    expect(await ownedFileForInsertion(beatDir, "static")).toBe("still.png");
  });

  it("should name what it found when nothing matches the format's own kind", async () => {
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

  it("should refuse a format it holds no preference for rather than guess", async () => {
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
      format: "static",
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
    await materialise({
      form: "owned-file",
      format: "static",
      beatDir,
      exportDir,
      env: {},
      handover,
    });
    const doc = await Bun.file(join(exportDir, "HANDOVER.md")).text();
    expect(doc).toContain("still.svg");
    expect(doc).toContain("the one to give the CMS");
  });

  it("should read back the placement, the alt text, the credit line and the caveat", async () => {
    await materialise({
      form: "owned-file",
      format: "static",
      beatDir,
      exportDir,
      env: {},
      handover,
    });
    const doc = await Bun.file(join(exportDir, "HANDOVER.md")).text();
    expect(doc).toContain(handover.placement);
    expect(doc).toContain(handover.alt);
    expect(doc).toContain(handover.credit);
    expect(doc).toContain(handover.caveat);
  });

  it("should be written for the source bundle too, not only the owned file", async () => {
    const written = await materialise({
      form: "source-bundle",
      format: "static",
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
        format: "static",
        beatDir,
        exportDir,
        env: {},
      }),
    ).rejects.toThrow(/closes into export\/<beat>\/HANDOVER\.md/);
  });

  it("should say what to hand in, naming where each field was already recorded", async () => {
    await expect(
      materialise({
        form: "owned-file",
        format: "static",
        beatDir,
        exportDir,
        env: {},
      }),
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
  let multiBeatStoryDir: string, beatTwo: string;

  beforeEach(async () => {
    multiBeatStoryDir = join(beatDir, "..", "..");
    beatTwo = join(multiBeatStoryDir, "beats", "2-temperature");
    await mkdir(join(beatTwo, "renders"), { recursive: true });
    await writeFile(join(beatTwo, "renders", "still.png"), "png-bytes-two");
    await writeFile(join(beatTwo, "renders", "still.svg"), "<svg id='two'/>");
    await writeFile(
      join(beatTwo, "Temperature.tsx"),
      "export const T = () => null;",
    );
    await writeFile(
      join(beatTwo, "APPROVED.md"),
      "seen at full size, approved",
    );
  });

  it("should keep the first beat's delivered files when a second beat delivers", async () => {
    await materialise({
      form: "owned-file",
      format: "static",
      beatDir,
      exportDir: exportDirFor(multiBeatStoryDir, "1-rainfall"),
      handover,
    });
    await materialise({
      form: "source-bundle",
      format: "static",
      beatDir: beatTwo,
      exportDir: exportDirFor(multiBeatStoryDir, "2-temperature"),
      handover,
    });

    expect(
      await readdir(exportDirFor(multiBeatStoryDir, "1-rainfall")),
    ).toContain("still.png");
    expect(
      await readdir(exportDirFor(multiBeatStoryDir, "2-temperature")),
    ).toContain("build.ts");
  });

  it("should give each beat its own directory under export/", async () => {
    await materialise({
      form: "owned-file",
      format: "static",
      beatDir,
      exportDir: exportDirFor(multiBeatStoryDir, "1-rainfall"),
      handover,
    });
    await materialise({
      form: "owned-file",
      format: "static",
      beatDir: beatTwo,
      exportDir: exportDirFor(multiBeatStoryDir, "2-temperature"),
      handover,
    });

    const delivered = (await readdir(join(multiBeatStoryDir, "export"))).sort();
    expect(delivered).toEqual(["1-rainfall", "2-temperature"]);
  });

  // The mechanical half: `exportDirFor` gives the only directory a beat may replace. A caller that
  // hands materialise the story-level export directory is refused before that broad path is touched.
  it("should refuse the story-level export directory before touching it", async () => {
    const shared = join(multiBeatStoryDir, "export");
    await mkdir(shared, { recursive: true });
    await writeFile(join(shared, "sentinel.txt"), "keep-me");

    await expect(
      materialise({
        form: "owned-file",
        format: "static",
        beatDir,
        exportDir: shared,
        handover,
      }),
    ).rejects.toThrow(/export directory/);

    expect(await readFile(join(shared, "sentinel.txt"), "utf8")).toBe(
      "keep-me",
    );
  });

  it("should still let the same beat change its mind in its own directory", async () => {
    const mine = exportDirFor(multiBeatStoryDir, "1-rainfall");
    await materialise({
      form: "owned-file",
      format: "static",
      beatDir,
      exportDir: mine,
      handover,
    });
    await materialise({
      form: "source-bundle",
      format: "static",
      beatDir,
      exportDir: mine,
      handover,
    });

    const files = await readdir(mine);
    expect(files).not.toContain("still.png");
    expect(files).toContain("package.json");
  });
});

describe("exportDirFor", () => {
  it("should reject traversal, absolute, and multi-segment output IDs", () => {
    expect(() => exportDirFor(storyDir, "../outside")).toThrow(/outputId/);
    expect(() => exportDirFor(storyDir, "/tmp/outside")).toThrow(/outputId/);
    expect(() => exportDirFor(storyDir, "nested/beat")).toThrow(/outputId/);
  });
});

/**
 * RULING R1b, CLAUSE 4 — the delivered key SHOULD be the second, domain-restricted one.
 *
 * "Should" is the whole point, and for a while it was compiled into a hard block: with only
 * `MAPTILER_KEY` set, `substituteKeys` threw, so a journalist whose root held one key could not
 * deliver their own work. Ruling **R1** is the one that governs, and it went the other way, after
 * the owner was shown the cost: *"On a le droit d'utiliser pleinement MapTiler. Et garder l'export
 * du HTML pas grave pour la clé."* The delivered HTML carries the key, knowingly.
 *
 * So the contract below is: RECOMMEND, never block. The best key available goes in, `mapKeyState`
 * names which one, and the hand-over says plainly what the newsroom is shipping and what it costs
 * them — the recommendation is MADE, in the file they keep, rather than enforced in a refusal.
 *
 * MUTATION (run in a copy under /tmp): restore the throw, i.e. make `substituteKeys` refuse when
 * `MAPTILER_DELIVERY_KEY` is absent and `MAPTILER_KEY` is present. "should deliver the development
 * key rather than block" and the two hand-over tests below redden.
 */
describe("substituteKeys — R1b clause 4, the delivered key", () => {
  const page = "style.json?key=__MAPTILER" + '_KEY__"';

  it("should substitute the second, domain-restricted key", () => {
    expect(
      substituteKeys(page, { MAPTILER_DELIVERY_KEY: "restricted-key" }),
    ).toBe('style.json?key=restricted-key"');
  });

  it("should leave the placeholder alone when no key is configured at all", () => {
    // Not a silent failure: the delivered page renders its complete fallback layer, exactly as it
    // does offline or with JavaScript off. The live layer never boots, which is the honest outcome
    // for a delivery nobody gave a key to.
    expect(substituteKeys(page, {})).toBe(page);
  });

  it("should deliver the development key rather than block, when it is the only one", () => {
    expect(substituteKeys(page, { MAPTILER_KEY: "development-key" })).toBe(
      'style.json?key=development-key"',
    );
  });

  it("should name which key went in, so the hand-over can say so", () => {
    expect(mapKeyState(page, { MAPTILER_DELIVERY_KEY: "restricted-key" })).toBe(
      "restricted",
    );
    expect(mapKeyState(page, { MAPTILER_KEY: "development-key" })).toBe(
      "development",
    );
    expect(mapKeyState(page, {})).toBe("unkeyed");
    expect(mapKeyState("<p>no map here</p>", { MAPTILER_KEY: "k" })).toBe(
      "none",
    );
  });

  it("should prefer the delivery key even when the development key is also set", () => {
    expect(
      substituteKeys(page, {
        MAPTILER_DELIVERY_KEY: "restricted-key",
        MAPTILER_KEY: "development-key",
      }),
    ).toBe('style.json?key=restricted-key"');
  });
});

/**
 * THE RULE IS ABOUT A MAP, SO IT HAS TO READ THE ARTIFACT — the owner's run, 2026-08-10.
 *
 * Everything in the block above protects one thing: a published MAP carrying a key. The check read
 * the ENVIRONMENT alone, so it fired on a beat that was not a map at all — *"zéro occurrence de
 * maptiler, zéro emplacement de clé dans le fichier"* — and the run then routed around it. A rule
 * that fires where it cannot be protecting anything is what teaches a reader to route around it.
 *
 * Both halves are asserted here: the unit distinction (a page WITH a key slot is still decided on,
 * a page WITHOUT one is not), and the fixture nothing in this suite had — a real `materialise` of a
 * NON-MAP beat while a development key sits in the environment, which is the exact shape of the run
 * that failed.
 *
 * MUTATION (run in a copy under /tmp): delete the `if (!carriesMapKey(html)) return html;` line from
 * `substituteKeys`, so the decision is taken on `env` alone again. Both tests below redden.
 */
describe("the key rule reads the artifact, not the environment", () => {
  const chartPage = "<!doctype html><title>Rainfall</title><svg><rect/></svg>";
  const mapPage = "style.json?key=__MAPTILER" + '_KEY__"';

  it("should deliver a page with no key slot untouched, whatever keys are in the environment", () => {
    expect(substituteKeys(chartPage, { MAPTILER_KEY: "development-key" })).toBe(
      chartPage,
    );
    expect(
      substituteKeys(chartPage, { MAPTILER_DELIVERY_KEY: "restricted-key" }),
    ).toBe(chartPage);
    expect(substituteKeys(chartPage, {})).toBe(chartPage);
  });

  it("should still decide on a page that does carry a key slot", () => {
    // The scoping must not blunt the rule: the same environment, on a real map artifact, is still
    // handled — this is the line between "scoped" and "switched off".
    expect(
      substituteKeys(mapPage, { MAPTILER_DELIVERY_KEY: "restricted-key" }),
    ).toBe('style.json?key=restricted-key"');
    expect(substituteKeys(mapPage, {})).toContain("__MAPTILER" + "_KEY__");
  });

  it("should deliver a MAP beat on a development key, and say so in the hand-over", async () => {
    // R1: the delivered HTML carries the key, knowingly. R1b prefers the restricted one. The
    // journalist gets the delivery AND the statement of what it costs — never a refusal instead of
    // both.
    await rm(join(beatDir, "renders", "still.png"));
    await rm(join(beatDir, "renders", "still.svg"));
    await writeFile(join(beatDir, "renders", "map.html"), mapPage);

    await materialise({
      form: "owned-file",
      format: "web",
      beatDir,
      exportDir,
      env: { MAPTILER_KEY: "development-key" },
      handover,
    });

    expect(await readFile(join(exportDir, "map.html"), "utf8")).toBe(
      'style.json?key=development-key"',
    );
    const readme = await readFile(join(exportDir, "HANDOVER.md"), "utf8");
    expect(readme).toContain("development");
    expect(readme).toContain("100% of its spending limit");
    expect(readme).toContain("MAPTILER_DELIVERY_KEY");
  });

  it("should say the map is not live when no key was recorded at all", async () => {
    await rm(join(beatDir, "renders", "still.png"));
    await rm(join(beatDir, "renders", "still.svg"));
    await writeFile(join(beatDir, "renders", "map.html"), mapPage);

    await materialise({
      form: "owned-file",
      format: "web",
      beatDir,
      exportDir,
      env: {},
      handover,
    });

    expect(await readFile(join(exportDir, "HANDOVER.md"), "utf8")).toContain(
      "does not draw its map live",
    );
  });

  it("should say nothing about MapTiler in a hand-over for a beat that is not a map", async () => {
    await rm(join(beatDir, "renders", "still.png"));
    await rm(join(beatDir, "renders", "still.svg"));
    await writeFile(join(beatDir, "renders", "chart.html"), chartPage);

    await materialise({
      form: "owned-file",
      format: "web",
      beatDir,
      exportDir,
      env: { MAPTILER_KEY: "development-key" },
      handover,
    });

    expect(
      await readFile(join(exportDir, "HANDOVER.md"), "utf8"),
    ).not.toContain("MapTiler");
  });

  it("should deliver a non-map web beat while a development key sits in the environment", async () => {
    // THE FIXTURE THE RUN WOULD HAVE FAILED. A chart × web beat, one self-contained HTML, no map
    // anywhere in it — delivered with MAPTILER_KEY set, exactly as the owner's own root had it.
    await rm(join(beatDir, "renders", "still.png"));
    await rm(join(beatDir, "renders", "still.svg"));
    await writeFile(join(beatDir, "renders", "chart.html"), chartPage);

    const written = await materialise({
      form: "owned-file",
      format: "web",
      beatDir,
      exportDir,
      env: { MAPTILER_KEY: "development-key" },
      handover,
    });

    expect(written.some((p) => p.endsWith("chart.html"))).toBe(true);
    expect(await readFile(join(exportDir, "chart.html"), "utf8")).toBe(
      chartPage,
    );
  });
});

describe("embedCodeFor", () => {
  const url = "https://example-story.pages.dev/";
  const title = "Rainfall in Annemasse";

  it("should reference an absolute scroller URL and inline nothing, when one is given", () => {
    const html = embedCodeFor(url, title, {
      scrollerUrl: "https://cdn.example.com/splash-iframe-scroller.js",
    });
    expect(html).toContain(
      '<script src="https://cdn.example.com/splash-iframe-scroller.js"></script>',
    );
    // Nothing else: this is the one script tag, referencing the hosted file, no inline body.
    expect(html.match(/<script/g)?.length).toBe(1);
  });

  it("should inline the scroller's own source and emit no <script src=…> for it, when no URL is given", () => {
    const inlineSource = "window.splashScroller = { hi: true };";
    const html = embedCodeFor(url, title, { inlineSource });
    expect(html).toContain(`<script>\n${inlineSource}\n</script>`);
    expect(html).not.toMatch(/<script src=/);
  });

  it("should fail loudly, naming SPLASH_SCROLLER_URL, on a non-HTTPS scroller URL", () => {
    expect(() =>
      embedCodeFor(url, title, {
        scrollerUrl: "http://cdn.example.com/splash-iframe-scroller.js",
      }),
    ).toThrow(/SPLASH_SCROLLER_URL/);
  });

  it("should fail loudly, naming SPLASH_SCROLLER_URL, on a scroller URL carrying credentials", () => {
    expect(() =>
      embedCodeFor(url, title, {
        scrollerUrl:
          "https://user:pass@cdn.example.com/splash-iframe-scroller.js",
      }),
    ).toThrow(/SPLASH_SCROLLER_URL/);
  });

  it("should fail loudly, naming SPLASH_SCROLLER_URL, on an unparseable scroller URL", () => {
    expect(() =>
      embedCodeFor(url, title, { scrollerUrl: "not a url" }),
    ).toThrow(/SPLASH_SCROLLER_URL/);
  });

  it("should refuse to inline a source that contains </script — it would end the block early", () => {
    expect(() =>
      embedCodeFor(url, title, {
        inlineSource: "console.log('</script>');",
      }),
    ).toThrow(/<\/script/);
  });

  it("should refuse when neither a scroller URL nor an inline source is given", () => {
    expect(() => embedCodeFor(url, title, {})).toThrow(
      /scrollerUrl|inlineSource/,
    );
  });

  it("should keep the iframe itself identical across both modes: attribute, marker, height, title", () => {
    for (const options of [
      { scrollerUrl: "https://cdn.example.com/splash-iframe-scroller.js" },
      { inlineSource: "/* scroller */" },
    ]) {
      const html = embedCodeFor(url, title, options);
      expect(html).toContain("data-splash-embed");
      expect(html).toContain('src="https://example-story.pages.dev/?splash"');
      expect(html).toContain("height:600px");
      expect(html).toContain(`title="${title}"`);
      expect(html).toContain('loading="lazy"');
    }
  });
});

describe("materialise — embed form resolves the scroller via SPLASH_SCROLLER_URL", () => {
  let tempRoot2: string, beatDir2: string, exportDir2: string;
  beforeEach(async () => {
    tempRoot2 = await mkdtemp(join(tmpdir(), "scroller-url-beat-"));
    const storyDir = join(tempRoot2, "story");
    beatDir2 = join(storyDir, "beats", "1-rainfall-web");
    exportDir2 = exportDirFor(storyDir, "1-rainfall-web");
    await mkdir(join(beatDir2, "renders"), { recursive: true });
    await writeFile(
      join(beatDir2, "renders", "rainfall.html"),
      "<!doctype html><html><body><h1>rainfall</h1></body></html>",
    );
    await writeFile(
      join(beatDir2, "APPROVED.md"),
      "seen at full size, approved",
    );
  });
  afterEach(async () => {
    await rm(tempRoot2, { recursive: true, force: true });
  });

  it("should reference the hosted scroller URL when SPLASH_SCROLLER_URL is set", async () => {
    await materialise({
      form: "embed",
      format: "web",
      beatDir: beatDir2,
      exportDir: exportDir2,
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct",
        CLOUDFLARE_API_TOKEN: "tok",
        SPLASH_SCROLLER_URL:
          "https://cdn.example.com/splash-iframe-scroller.js",
      },
      fetchFn: fakeCloudflare(),
      handover,
    });
    const code = await Bun.file(join(exportDir2, "EMBED_CODE.html")).text();
    expect(code).toContain(
      '<script src="https://cdn.example.com/splash-iframe-scroller.js"></script>',
    );
  });

  it("should host and reference the companion automatically when SPLASH_SCROLLER_URL is not set", async () => {
    await materialise({
      form: "embed",
      format: "web",
      beatDir: beatDir2,
      exportDir: exportDir2,
      env: { CLOUDFLARE_ACCOUNT_ID: "acct", CLOUDFLARE_API_TOKEN: "tok" },
      fetchFn: fakeCloudflare(),
      handover,
    });
    const code = await Bun.file(join(exportDir2, "EMBED_CODE.html")).text();
    expect(code).toContain(
      `<script src="${cloudflareScrollerUrl("acct")}/"></script>`,
    );
    expect(code).not.toContain("splashScroller");
  });
});
