import { afterEach, describe, expect, it } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  deliveredArtifacts,
  verifyDeliveredArtifacts,
} from "../../image-beat/scripts/check-delivered-guards.mjs";

const scratch: string[] = [];
const TEST_LIMITS = {
  maxRoots: 16,
  maxEntries: 16,
  maxArtifacts: 16,
  maxDepth: 8,
  maxMarkerBytes: 64,
};

afterEach(() => {
  for (const root of scratch.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function fixtureDir(label: string) {
  const root = mkdtempSync(join(tmpdir(), `splash-${label}-`));
  scratch.push(root);
  return root;
}

function writeMarker(path: string) {
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(path, '<img src="data:image/png;base64,AQID">');
}

function reportedProblems(result: unknown) {
  expect(result && typeof result === "object" && "problems" in result).toBe(true);
  if (!result || typeof result !== "object" || !("problems" in result))
    return [];
  expect(Array.isArray(result.problems)).toBe(true);
  return Array.isArray(result.problems)
    ? result.problems.filter((problem) => typeof problem === "string")
    : [];
}

describe("delivered-artifact work is bounded", () => {
  it("reports a configured starting-root limit", () => {
    const root = fixtureDir("root-limit");
    writeMarker(join(root, "stories", "a", "beats", "a.html"));
    writeMarker(join(root, "stories", "b", "beats", "b.html"));

    expect(
      reportedProblems(
        verifyDeliveredArtifacts(root, undefined, {
          limits: { ...TEST_LIMITS, maxRoots: 1 },
        }),
      ).some((problem) => /root/i.test(problem)),
    ).toBe(true);
  });

  it("reports a configured traversal-depth limit", () => {
    const root = fixtureDir("depth-limit");
    writeMarker(join(root, "proof", "one", "two", "deep.html"));

    expect(
      reportedProblems(
        verifyDeliveredArtifacts(root, undefined, {
          limits: { ...TEST_LIMITS, maxDepth: 1 },
        }),
      ).some((problem) => /depth/i.test(problem)),
    ).toBe(true);
  });

  it("reports a configured visited-entry limit", () => {
    const root = fixtureDir("entry-limit");
    mkdirSync(join(root, "proof"), { recursive: true });
    for (const name of ["a.txt", "b.txt", "c.txt"])
      writeFileSync(join(root, "proof", name), name);

    expect(
      reportedProblems(
        verifyDeliveredArtifacts(root, undefined, {
          limits: { ...TEST_LIMITS, maxEntries: 2 },
        }),
      ).some((problem) => /entr|travers/i.test(problem)),
    ).toBe(true);
  });

  it("reports a configured accepted-artifact limit", () => {
    const root = fixtureDir("population-limit");
    writeMarker(join(root, "proof", "a.html"));
    writeMarker(join(root, "proof", "b.html"));

    expect(
      reportedProblems(
        verifyDeliveredArtifacts(root, undefined, {
          limits: { ...TEST_LIMITS, maxArtifacts: 1 },
        }),
      ).some((problem) => /artifact|population/i.test(problem)),
    ).toBe(true);
  });

  it("bounds marker inspection to configured bytes", () => {
    const root = fixtureDir("marker-limit");
    mkdirSync(join(root, "proof"), { recursive: true });
    writeFileSync(
      join(root, "proof", "late.html"),
      '12345678<img src="data:image/png;base64,AQID">',
    );
    const result: unknown = verifyDeliveredArtifacts(root, undefined, {
      limits: { ...TEST_LIMITS, maxMarkerBytes: 8 },
    });

    expect(
      result &&
        typeof result === "object" &&
        "inspectedArtifacts" in result &&
        result.inspectedArtifacts,
    ).toEqual([]);
  });

  it("reports overweight text after stat without marker inspection", () => {
    const root = fixtureDir("stat-first");
    mkdirSync(join(root, "proof"), { recursive: true });
    writeFileSync(join(root, "proof", "overweight.html"), "123456789");

    expect(
      reportedProblems(
        verifyDeliveredArtifacts(root, undefined, {
          limits: TEST_LIMITS,
          ceilingBytes: 8,
        }),
      ).some((problem) => /9 bytes exceeds 8/.test(problem)),
    ).toBe(true);
  });
});

describe("bounded walkers preserve the deliberate artifact population", () => {
  it("keeps all four copies byte-identical and covers proof, local, beats and export", () => {
    const project = resolve(import.meta.dirname, "..", "..", "..");
    const walkerSources = ["image-beat", "map-beat", "map-web", "scrolly"].map(
      (skill) =>
        readFileSync(
          join(project, "skills", skill, "scripts", "check-delivered-guards.mjs"),
          "utf8",
        ),
    );
    expect(new Set(walkerSources).size).toBe(1);

    const root = fixtureDir("artifact-population");
    const paths = [
      join(root, "proof", "proof.html"),
      join(root, "skills", "image-beat", "output-proof", "local.png"),
      join(root, "stories", "story", "beats", "beat.svg"),
      join(root, "stories", "story", "export", "export.html"),
    ];
    writeMarker(paths[0]);
    mkdirSync(resolve(paths[1], ".."), { recursive: true });
    writeFileSync(paths[1], "png");
    writeMarker(paths[2]);
    writeMarker(paths[3]);

    expect(deliveredArtifacts(root)).toEqual([...paths].sort());
  });
});
