import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CANDIDATES_FILE,
  exportPrecondition,
  productionPrecondition,
} from "./preconditions";

function tmp(): string {
  return mkdtempSync(join(tmpdir(), "splash-preconditions-"));
}

test("a directory with no ranked menu refuses production, and the refusal routes", () => {
  const dir = tmp();
  try {
    const r = productionPrecondition(dir);
    expect(r).not.toBeNull();
    expect(r!.code).toBe("no-candidates-menu");
    expect(r!.message).toContain(dir);
    expect(r!.route?.step).toContain("ranked list");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a directory that holds the menu passes — null, never an ok-shaped object", () => {
  const dir = tmp();
  try {
    writeFileSync(join(dir, CANDIDATES_FILE), "[]");
    expect(productionPrecondition(dir)).toBeNull();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a folder still carrying the build's own files is not an export, and every one is named", () => {
  const r = exportPrecondition(
    ["interactive.html", "config.json", "native-source.json"],
    { format: "interactive", form: "html" },
  );
  expect(r).not.toBeNull();
  expect(r!.code).toBe("production-folder-handed-over");
  expect(r!.message).toContain("config.json");
  expect(r!.message).toContain("native-source.json");
  expect(r!.route?.command).toContain("export-code.mjs");
});

test("the sanctioned html export — exactly the html file — passes", () => {
  expect(
    exportPrecondition(["interactive.html"], {
      format: "interactive",
      form: "html",
    }),
  ).toBeNull();
  expect(
    exportPrecondition(["scrolly.html"], { format: "scrolly", form: "html" }),
  ).toBeNull();
});

test("a runnable source bundle keeps its config.json — the one exemption, and it is measured", () => {
  // bundle-source.mjs writes config.json at the bundle root on purpose, and the README it
  // generates tells the newsroom to edit that very file. Refusing it would fail the delivery
  // form whose whole point is that the newsroom owns the source.
  expect(
    exportPrecondition(
      [
        "package.json",
        "vite.config.ts",
        "config.json",
        "index.html",
        "README.md",
      ],
      { format: "interactive", form: "code-source" },
    ),
  ).toBeNull();
});

test("a static hand-over carrying the report is refused too — the rule is not html-only", () => {
  const r = exportPrecondition(["static.png", "report.json"], {
    format: "static",
    form: null,
  });
  expect(r).not.toBeNull();
  expect(r!.message).toContain("report.json");
});

test("an embed hand-over of exactly the recorded URL passes", () => {
  expect(
    exportPrecondition(["EMBED_URL.txt"], {
      format: "interactive",
      form: "embed",
    }),
  ).toBeNull();
});

test("an empty listing is not a production folder — it is an empty folder, and a different problem", () => {
  expect(exportPrecondition([], { format: "video", form: null })).toBeNull();
});
