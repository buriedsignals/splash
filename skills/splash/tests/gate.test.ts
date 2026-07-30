import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyRenderGate } from "../src/gate";
import type { ProduceReport } from "../src/producer-spec";
import { presentArtifact } from "../../../lib/loop/presentation";
import { NO_VIEWER_VAR } from "../../../lib/loop/preview";

const SHOWN_ENV = { [NO_VIEWER_VAR]: "1" };

function artifact(bytes: string): { dir: string; path: string } {
  const dir = mkdtempSync(join(tmpdir(), "splash-gate-shown-"));
  const path = join(dir, "static.png");
  writeFileSync(path, bytes);
  return { dir, path };
}

const report = (): ProduceReport => ({
  results: [
    {
      id: "p1",
      producer: "chart-native",
      format: "static",
      status: "produced",
      reviewed: true,
      renderApproved: false,
    },
  ],
});

describe("applyRenderGate", () => {
  it("sets renderApproved + a content hash on the named produced proposal", () => {
    const a = artifact("PNGDATA");
    try {
      presentArtifact(a.path, SHOWN_ENV);
      const out = applyRenderGate(
        report(),
        "p1",
        new TextEncoder().encode("PNGDATA"),
        a.path,
      );
      expect(out.results[0].renderApproved).toBe(true);
      expect(out.results[0].approvedHash).toMatch(/^[0-9a-f]{64}$/);
    } finally {
      rmSync(a.dir, { recursive: true, force: true });
    }
  });
  it("refuses to approve a proposal that is not produced", () => {
    const a = artifact("");
    try {
      const r = report();
      r.results[0].status = "failed";
      expect(() => applyRenderGate(r, "p1", new Uint8Array(), a.path)).toThrow(
        /not produced/,
      );
    } finally {
      rmSync(a.dir, { recursive: true, force: true });
    }
  });
  it("throws on an unknown id", () => {
    const a = artifact("");
    try {
      expect(() =>
        applyRenderGate(report(), "nope", new Uint8Array(), a.path),
      ).toThrow(/unknown proposal/);
    } finally {
      rmSync(a.dir, { recursive: true, force: true });
    }
  });
  it("refuses to approve a produced-but-unreviewed proposal (Gate 3a before 3b)", () => {
    const a = artifact("");
    try {
      const r = report();
      r.results[0].reviewed = false;
      expect(() => applyRenderGate(r, "p1", new Uint8Array(), a.path)).toThrow(
        /not render-reviewed/,
      );
    } finally {
      rmSync(a.dir, { recursive: true, force: true });
    }
  });
  it("preserves the report's generatedAt across the approval write (the provenance anchor)", () => {
    const a = artifact("PNGDATA");
    try {
      presentArtifact(a.path, SHOWN_ENV);
      const r: ProduceReport = {
        generatedAt: "2026-07-12T08:00:00.000Z",
        ...report(),
      };
      const out = applyRenderGate(
        r,
        "p1",
        new TextEncoder().encode("PNGDATA"),
        a.path,
      );
      expect(out.generatedAt).toBe("2026-07-12T08:00:00.000Z");
    } finally {
      rmSync(a.dir, { recursive: true, force: true });
    }
  });
});

describe("applyRenderGate — approval binds to what was shown", () => {
  it("refuses to approve a render nobody has been shown, and routes to showing it", () => {
    const a = artifact("PNGDATA");
    try {
      const r = report();
      r.results[0]!.reviewed = true;
      expect(() =>
        applyRenderGate(r, "p1", new TextEncoder().encode("PNGDATA"), a.path),
      ).toThrow(/nobody has been shown/);
    } finally {
      rmSync(a.dir, { recursive: true, force: true });
    }
  });

  it("approves when the very bytes that were shown are the bytes being approved", () => {
    const a = artifact("PNGDATA");
    try {
      presentArtifact(a.path, SHOWN_ENV);
      const r = report();
      r.results[0]!.reviewed = true;
      const out = applyRenderGate(
        r,
        "p1",
        new TextEncoder().encode("PNGDATA"),
        a.path,
      );
      expect(out.results[0]!.renderApproved).toBe(true);
      expect(out.results[0]!.shownSha256).toBe(out.results[0]!.approvedHash);
    } finally {
      rmSync(a.dir, { recursive: true, force: true });
    }
  });

  it("refuses when the visual moved between being shown and being approved", () => {
    const a = artifact("PNGDATA");
    try {
      presentArtifact(a.path, SHOWN_ENV);
      writeFileSync(a.path, "PNGDATA-v2");
      const r = report();
      r.results[0]!.reviewed = true;
      expect(() =>
        applyRenderGate(
          r,
          "p1",
          new TextEncoder().encode("PNGDATA-v2"),
          a.path,
        ),
      ).toThrow(/has changed since it was last shown/);
    } finally {
      rmSync(a.dir, { recursive: true, force: true });
    }
  });
});
