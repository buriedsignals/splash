// The one place this slice is actually WIRED: writeManifest → assertInvariants → the ledger
// invariant. Everything else in lib/source/ is available to the gates; this is enforced today.
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readManifest,
  writeManifest,
  type RunManifest,
} from "../loop/manifest";
import { publicSourceView } from "./redact";

function runWith(sources?: unknown): { run: RunManifest; path: string } {
  const dir = mkdtempSync(join(tmpdir(), "source-policy-"));
  writeFileSync(join(dir, "data.csv"), "city,value\nGenève,449\n");
  const run = {
    runId: "r1",
    schemaVersion: 6,
    route: "embed",
    channel: "article-web",
    input: { data: { path: "data.csv", sha256: "a".repeat(64) } },
    elements: [],
    events: [],
    ...(sources ? { sources } : {}),
  } as unknown as RunManifest;
  return { run, path: join(dir, "run.json") };
}

test("should persist a declared source ledger through a write and read", () => {
  const { run, path } = runWith({
    mode: "real",
    data: { kind: "local", label: "Relevés communaux 2024" },
  });
  writeManifest(path, run);
  const reopened = readManifest(path);
  expect(reopened.sources).toEqual({
    mode: "real",
    data: { kind: "local", label: "Relevés communaux 2024" },
  });
});

test("should keep writing a manifest that declares no source at all", () => {
  // Every run recorded before this field existed, and every run that has not reached the
  // source question yet. Absent is not invalid — it is simply undeclared.
  const { run, path } = runWith();
  expect(() => writeManifest(path, run)).not.toThrow();
  expect(readManifest(path).sources).toBeUndefined();
});

test("should refuse to write a manifest whose synthetic source claims a real run", () => {
  const { run, path } = runWith({
    mode: "real",
    data: { kind: "synthetic", label: "Jeu de démonstration" },
  });
  expect(() => writeManifest(path, run)).toThrow(/synthetic-in-real-run/);
});

test("should write the same synthetic run once it calls itself a test", () => {
  const { run, path } = runWith({
    mode: "test",
    data: { kind: "synthetic", label: "Jeu de démonstration" },
  });
  expect(() => writeManifest(path, run)).not.toThrow();
});

test("should refuse to write a public source with no url", () => {
  const { run, path } = runWith({ data: { kind: "public", label: "OFS" } });
  expect(() => writeManifest(path, run)).toThrow(/missing-url/);
});

test("should refuse an unknown field inside a recorded declaration", () => {
  // writeManifest does not re-parse, so the WRITE refuses this for the field it is missing…
  const { run, path } = runWith({ data: { kind: "local", name: "Relevés" } });
  expect(() => writeManifest(path, run)).toThrow(/missing-label/);
  // …and the READ refuses the same shape for the field it does not know. Both directions are
  // closed, which is what "migrate without silently widening what is valid" asks for: a
  // `{ name }` source (the shape lib/core/conformance-l0.ts uses) never parses as a valid
  // declaration carrying no label.
  writeFileSync(
    path,
    JSON.stringify({
      runId: "r1",
      schemaVersion: 6,
      route: "embed",
      channel: "article-web",
      input: {},
      elements: [],
      events: [],
      sources: { mode: "real", data: { kind: "local", name: "Relevés" } },
    }),
  );
  expect(() => readManifest(path)).toThrow();
});

test("should never persist an internal reference into the public source view of a run", () => {
  const { run, path } = runWith({
    data: {
      kind: "private",
      label: "Données internes",
      internalRef: "/Volumes/nas/salaires-internes-2024.csv",
    },
  });
  writeManifest(path, run);
  const reopened = readManifest(path);
  // The manifest is the PRIVATE ledger — the reference belongs there and stays there.
  expect(reopened.sources?.data?.internalRef).toContain("nas");
  // What leaves the newsroom is the projection, and it carries none of it.
  const view = publicSourceView(reopened.sources!, "fr");
  if (!view.ok) throw new Error(view.message);
  expect(JSON.stringify(view.value)).not.toContain("nas");
});
