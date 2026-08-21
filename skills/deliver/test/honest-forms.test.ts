/**
 * ROUND-FIVE FINDING Y4, Y13 and one line of Y17: A FORM WAS OFFERED WHERE IT COULD NOT WORK.
 *
 * Measured by the controller against `stories/stress-y-rural-broadband`, a delegated Datawrapper
 * still whose `renders/` holds one file, a PNG:
 *
 *     ownedFileForInsertion(beatDir, "static")  -> chart.png
 *     readFile(..., "utf8")                     -> length 73479, U+FFFD 30131
 *
 * `offerForms` listed `cms-insertion` as `available: true`, and it is the form that story's
 * journalist asked for by name. Choosing it built an insertion payload out of 30,131 Unicode
 * replacement characters and wrote it into a document headed "the mutation this beat's own HTML
 * would send". The same beat was offered `source-bundle`, whose promise is "a folder with this
 * chart's component and data, plus a real build.ts that bun install and bun run build actually
 * execute" — the beat has no component, and the build script this file ships throws on it. And its
 * hand-over described `chart.png` as "a raster copy, for a system that cannot take the vector",
 * pointing the newsroom at a vector file that was never rendered.
 *
 * One shape, three forms: THE OFFER WAS DERIVED FROM THE FORMAT ALONE AND NEVER FROM THE BEAT.
 * The fix derives each from the delivered material, so a form that cannot work is not offered and
 * a document does not promise a file that does not exist.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  insertionMarkupVerdict,
  materialise,
  offerForms,
} from "../scripts/deliver.mjs";
import { formatHandover } from "../scripts/format-handover.mjs";
import { approveCurrentOutput } from "./output-review-fixture";

const STORIES = resolve(import.meta.dirname, "..", "..", "..", "stories");

// The two frozen round-five stories the acceptance criterion names, with the review binding each
// one's own OUTPUT-REVIEW.json already records. Both are static beats; they differ only in what
// their producer actually rendered, which is the whole point.
const Y = {
  storiesRoot: STORIES,
  storyId: "stress-y-rural-broadband",
  outputId: "1-coverage-vs-size",
  planVersion: 1,
  findingIds: ["coverage-does-not-follow-size", "one-reading-above-the-ceiling"],
  format: "static",
  medium: "chart",
  env: {},
};

const W = {
  storiesRoot: STORIES,
  storyId: "stress-w-quay-photographs",
  outputId: "1-quay-sequence",
  planVersion: 1,
  findingIds: ["W-letterbox-bar-contrast", "W-panorama-box-share", "W-typeface-not-read"],
  format: "static",
  medium: "chart",
  env: {},
};

const formNamed = (forms: any[], id: string) => forms.find((form) => form.id === id);

const Y_PNG = join(STORIES, Y.storyId, "beats", Y.outputId, "renders", "chart.png");
const W_SVG = join(STORIES, W.storyId, "beats", W.outputId, "renders", "still.svg");

describe("insertionMarkupVerdict — measured on the bytes, not guessed from the name", () => {
  it("should refuse the real PNG that produced 30,131 replacement characters", () => {
    const verdict = insertionMarkupVerdict(readFileSync(Y_PNG));
    expect(verdict.markup).toBe(false);
    expect(verdict.reason).toMatch(/not text/i);
  });

  it("should accept the real SVG a static image beat rendered", () => {
    expect(insertionMarkupVerdict(readFileSync(W_SVG))).toEqual({ markup: true, reason: null });
  });

  // ISOLATES THE STRICT DECODE, and nothing else. A real PNG is refused by two of the three
  // measurements at once (it is not valid UTF-8 AND it is full of NUL bytes), so dropping the
  // refusing decoder leaves the PNG case green on the NUL branch and proves nothing about the
  // decode. These bytes are markup that opens with a real element and carries no NUL — an SVG
  // saved in Latin-1, which is a file a newsroom really has — and only the strict decode sees them.
  it("should refuse markup whose bytes are not UTF-8, with no NUL to give it away", () => {
    const latin1 = Buffer.from([0x3c, 0x73, 0x76, 0x67, 0x3e, 0x52, 0x68, 0xf4, 0x6e, 0x65]);
    const verdict = insertionMarkupVerdict(latin1);
    expect(verdict.markup).toBe(false);
    expect(verdict.reason).toMatch(/not valid UTF-8/);
  });

  // A file that decodes cleanly is still not markup. Nothing in the CMS payload can be built out of
  // a body with no element in it, and "it decoded" is not the question the form asks.
  it("should refuse text that carries no element at all", () => {
    const verdict = insertionMarkupVerdict(Buffer.from("png-bytes", "utf8"));
    expect(verdict.markup).toBe(false);
    expect(verdict.reason).toMatch(/not markup/i);
  });
});

describe("offerForms — a form is offered only where the beat can honour it", () => {
  it("should not offer CMS insertion for a beat whose only render is a picture", () => {
    const cms = formNamed(offerForms(Y), "cms-insertion");
    expect(cms.available).toBe(false);
    expect(cms.reason).toContain("chart.png");
  });

  it("should tell the journalist which form carries this beat instead", () => {
    expect(formNamed(offerForms(Y), "cms-insertion").reason).toContain("The file itself");
  });

  it("should not offer a runnable source bundle for a beat that has no component", () => {
    const bundle = formNamed(offerForms(Y), "source-bundle");
    expect(bundle.available).toBe(false);
    expect(bundle.reason).toMatch(/no component/i);
  });

  it("should still offer both forms for a beat that rendered a vector and wrote a component", () => {
    const forms = offerForms(W);
    expect(formNamed(forms, "cms-insertion").available).toBe(true);
    expect(formNamed(forms, "source-bundle").available).toBe(true);
  });

  it("should keep the file itself available for both — an owned file needs nothing of either", () => {
    expect(formNamed(offerForms(Y), "owned-file").available).toBe(true);
    expect(formNamed(offerForms(W), "owned-file").available).toBe(true);
  });
});

describe("materialise — the refusal is at the payload, not only at the menu", () => {
  let tempRoot: string, beatDir: string;

  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "honest-forms-"));
    beatDir = join(tempRoot, "story", "beats", "1-coverage-vs-size");
    await mkdir(join(beatDir, "renders"), { recursive: true });
    // The real bytes, from the real story: this is the file the controller measured.
    await copyFile(Y_PNG, join(beatDir, "renders", "chart.png"));
    await writeFile(join(beatDir, "spec.json"), "{}");
    await approveCurrentOutput(beatDir);
  });

  afterEach(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const call = (form: string) =>
    materialise({
      form,
      format: "static",
      storiesRoot: join(tempRoot),
      storyId: "story",
      outputId: "1-coverage-vs-size",
      planVersion: 1,
      findingIds: ["finding-test-1"],
      env: {},
      handover: {
        language: "en",
        placement: "under the headline claim",
        alt: "Coverage does not follow the size of a municipality",
        credit: "Source: not stated",
        caveat: "six municipalities returned no figure",
      },
    });

  it("should refuse to build an insertion payload out of a picture", async () => {
    await expect(call("cms-insertion")).rejects.toThrow(/not text/i);
  });

  it("should refuse a source bundle whose build script would find nothing to build", async () => {
    await expect(call("source-bundle")).rejects.toThrow(/no component/i);
  });
});

describe("HANDOVER.md — no file is described by a file that was not delivered", () => {
  const fields = {
    format: "static",
    language: "en",
    placement: "under the headline claim",
    alt: "Coverage does not follow the size of a municipality",
    credit: "Source: not stated",
  };

  it("should not promise a vector when the beat delivered only a raster", () => {
    const doc = formatHandover({ ...fields, files: ["export/1/chart.png"] });
    expect(doc).not.toContain("cannot take the vector");
    expect(doc).toMatch(/no vector/i);
  });

  it("should keep the raster's role as the fallback when a vector really is there", () => {
    const doc = formatHandover({ ...fields, files: ["export/1/still.png", "export/1/still.svg"] });
    expect(doc).toContain("cannot take the vector");
  });

  it("should say the same thing in French", () => {
    const doc = formatHandover({ ...fields, language: "fr", files: ["export/1/chart.png"] });
    expect(doc).not.toContain("ne prend pas le vectoriel");
    expect(doc).toMatch(/pas de version vectorielle/i);
  });
});
