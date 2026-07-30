import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  SHOWN_DIR,
  presentArtifact,
  shownCovers,
  shownReceipt,
} from "./presentation";
import { NO_VIEWER_VAR } from "./preview";

// SPLASH_NO_VIEWER keeps the tests from launching a browser on a developer's machine — and it is
// the honest path, not a stub: `present` records "path-printed" with the reason it fell back.
const ENV = { [NO_VIEWER_VAR]: "1" };

function withArtifact(bytes: string): { dir: string; path: string } {
  const dir = mkdtempSync(join(tmpdir(), "splash-presentation-"));
  const path = join(dir, "interactive.html");
  writeFileSync(path, bytes);
  return { dir, path };
}

test("presenting an artifact writes a receipt carrying its bytes and how it was shown", () => {
  const a = withArtifact("<html>one</html>");
  try {
    const r = presentArtifact(a.path, ENV);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.path).toBe(a.path);
    expect(r.value.sha256).toHaveLength(64);
    expect(r.value.presentedAs).toBe("path-printed");
    expect(r.value.fallbackReason).toContain(NO_VIEWER_VAR);
    expect(existsSync(join(a.dir, SHOWN_DIR, "interactive.html.json"))).toBe(
      true,
    );
  } finally {
    rmSync(a.dir, { recursive: true, force: true });
  }
});

test("the receipt is read back, and it covers the bytes that were actually shown", () => {
  const a = withArtifact("<html>one</html>");
  try {
    const shown = presentArtifact(a.path, ENV);
    expect(shown.ok).toBe(true);
    if (!shown.ok) return;
    expect(shownReceipt(a.path)?.sha256).toBe(shown.value.sha256);
    expect(shownCovers(a.path, shown.value.sha256)).toBeNull();
  } finally {
    rmSync(a.dir, { recursive: true, force: true });
  }
});

test("bytes nobody was shown are refused, and the refusal routes to showing them", () => {
  const a = withArtifact("<html>one</html>");
  try {
    const r = shownCovers(a.path, "0".repeat(64));
    expect(r).not.toBeNull();
    expect(r!.code).toBe("render-not-shown");
    expect(r!.route?.command).toContain("present --path");
  } finally {
    rmSync(a.dir, { recursive: true, force: true });
  }
});

test("an artifact that CHANGED since it was shown is refused as a different subject", () => {
  const a = withArtifact("<html>one</html>");
  try {
    presentArtifact(a.path, ENV);
    writeFileSync(a.path, "<html>two</html>");
    const after = Bun.hash; // not used — recompute through the module under test
    const r = shownCovers(a.path, shownReceipt(a.path)!.sha256);
    // The receipt still covers the OLD bytes, so a caller asking about the OLD digest passes;
    // what must refuse is asking about the CURRENT ones.
    expect(r).toBeNull();
    const current = new Bun.CryptoHasher("sha256")
      .update("<html>two</html>")
      .digest("hex");
    const r2 = shownCovers(a.path, current);
    expect(r2).not.toBeNull();
    expect(r2!.code).toBe("approval-subject-mismatch");
    expect(r2!.message).toContain("changed");
    void after;
  } finally {
    rmSync(a.dir, { recursive: true, force: true });
  }
});

test("presenting a file that is not there is a refusal, never a receipt for nothing", () => {
  const r = presentArtifact("/nope/nowhere.html", ENV);
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.code).toBe("engine-failed");
});
