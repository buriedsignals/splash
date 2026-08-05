// AN INSTALL THAT CANNOT BE UPDATED IS A FORK (registry E21).
//
// Measured 2026-08-05: bootstrap.sh step 2 downloads the source only `if [ ! -d "$DEST" ]`, there
// is no update script, and no documentation mentions one. A newsroom that installs Splash today
// keeps that version forever — every fix shipped afterwards, including the four made the same day
// (a preflight that lied about a key, a French journey producing an English chart, a delivery a
// model could fabricate, an approval a model could forge), never reaches them.
//
// For an MIT release whose whole promise is "your newsroom runs this", that is not a rough edge.
//
// WHAT THE UPDATE MUST NOT DO, which is why this is opt-in and guarded rather than automatic: the
// install directory holds things the JOURNALIST owns and we never wrote — their keys (.env), their
// house style (NEWSROOM-PROFILE.md, brand.json, newsroom.json) and their delivered visuals
// (exports/). An update that replaces the tree must carry those across, and must refuse rather than
// guess when it finds something it does not recognise. Losing a newsroom's keys to a version bump
// would be a worse defect than the one being fixed.
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sh = readFileSync(
  join(import.meta.dir, "..", "..", "install", "bootstrap.sh"),
  "utf8",
);
/** Comments stripped: these assertions are about what the script DOES. Its own header explains the
 *  rules in prose, and matching that prose fails on correct code — paid three times in one day. */
const code = sh.replace(/^\s*#.*$/gm, "");

describe("the installer can update an existing install", () => {
  it("offers an update path at all", () => {
    expect(code).toContain("SPLASH_UPDATE");
  });

  it("preserves everything the journalist owns, by name", () => {
    // Named individually rather than by a wildcard: a rule that says "keep what looks personal"
    // is a rule nobody can check. Each of these has a reason to exist in the install directory.
    for (const owned of [
      ".env", // their keys
      "NEWSROOM-PROFILE.md", // their house style
      "brand.json", // its machine-readable cache
      "newsroom.json", // the decor, including the chosen runtime
      "exports", // the visuals they have already delivered
    ])
      expect(code).toContain(owned);
  });

  it("keeps the no-update default — an update is a decision, never a side effect", () => {
    // Re-running the installer to recover from a failed step must not silently replace the tree
    // underneath a newsroom. The download stays gated on the directory being absent.
    expect(code).toMatch(/if \[ ! -d "\$DEST" \]/);
  });

  it("says what version is installed, so 'am I up to date' is answerable", () => {
    expect(code).toContain("SPLASH_VERSION");
  });
});

// BEHAVIOURAL: the assertions above read the script. What matters is whether a real update keeps a
// real newsroom's files, so this runs the actual step against a fake install and a fake archive —
// no network, no repo. The failure being guarded is one that would cost a newsroom their keys.
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync as read, existsSync } from "node:fs";
import { tmpdir } from "node:os";

/** The carry-across loop AS IT IS SHIPPED, extracted from bootstrap.sh rather than retyped.
 *  A first version of these cases pasted the loop into the test — which would keep passing while
 *  the script drifted, the exact "the test agrees with a copy, not the code" defect this project
 *  paid for three times in one day. Extracting means the assertions below are about what a
 *  newsroom actually runs. */
function shippedCarryAcross(): string {
  const owned = sh.match(/^SPLASH_OWNED=\(.*$/m);
  const loop = sh.match(
    /^\s*for owned in "\$\{SPLASH_OWNED\[@\]\}"; do\n[\s\S]*?^\s*done$/m,
  );
  if (!owned || !loop)
    throw new Error(
      "bootstrap.sh no longer carries the SPLASH_OWNED loop this test exists to exercise",
    );
  return `${owned[0]}\n${loop[0]}`;
}

describe("a real update keeps what the journalist owns", () => {
  it("carries keys, house style and exports into the new tree", () => {
    const work = mkdtempSync(join(tmpdir(), "splash-update-"));
    const dest = join(work, "Splash");
    // An install as a newsroom really has it: our files plus theirs.
    mkdirSync(join(dest, "exports", "budget-2026"), { recursive: true });
    writeFileSync(join(dest, ".env"), "DATAWRAPPER_API_TOKEN=their-key\n");
    writeFileSync(join(dest, "NEWSROOM-PROFILE.md"), "---\nlang: \"fr\"\n---\n");
    writeFileSync(join(dest, "newsroom.json"), '{"runtime":"goose"}');
    writeFileSync(join(dest, "exports", "budget-2026", "chart.png"), "delivered");
    writeFileSync(join(dest, "OLD-FILE.md"), "shipped by the old version");

    // A fake "archive": the new tree, already unzipped, standing in for the download.
    const tmp = mkdtempSync(join(work, "dl-"));
    const newTree = join(tmp, "splash-main");
    mkdirSync(newTree, { recursive: true });
    writeFileSync(join(newTree, "NEW-FILE.md"), "shipped by the new version");

    // The carry-across + swap, lifted verbatim from bootstrap.sh's 2b.
    const script = `set -euo pipefail
DEST="${dest}"
new_tree="${newTree}"
${shippedCarryAcross()}
printf '%s\\n' "main" > "$new_tree/.splash-version"
rm -rf "$DEST.previous"; mv "$DEST" "$DEST.previous"; mv "$new_tree" "$DEST"
`;
    const r = Bun.spawnSync(["bash", "-c", script]);
    expect(r.stderr.toString()).toBe("");
    expect(r.exitCode).toBe(0);

    // Theirs, kept — byte for byte.
    expect(read(join(dest, ".env"), "utf8")).toContain("their-key");
    expect(read(join(dest, "NEWSROOM-PROFILE.md"), "utf8")).toContain('lang: "fr"');
    expect(read(join(dest, "newsroom.json"), "utf8")).toContain("goose");
    expect(read(join(dest, "exports", "budget-2026", "chart.png"), "utf8")).toBe("delivered");
    // Ours, replaced.
    expect(existsSync(join(dest, "NEW-FILE.md"))).toBe(true);
    expect(existsSync(join(dest, "OLD-FILE.md"))).toBe(false);
    // And the old install is still there to fall back on.
    expect(read(join(`${dest}.previous`, "OLD-FILE.md"), "utf8")).toContain("old version");
  });

  it("skips an owned file the newsroom never created, rather than failing", () => {
    const work = mkdtempSync(join(tmpdir(), "splash-update-bare-"));
    const dest = join(work, "Splash");
    mkdirSync(dest, { recursive: true });
    writeFileSync(join(dest, ".env"), "K=v\n"); // no profile, no exports — a fresh newsroom
    const newTree = join(work, "splash-main");
    mkdirSync(newTree, { recursive: true });
    const script = `set -euo pipefail
DEST="${dest}"
new_tree="${newTree}"
${shippedCarryAcross()}
`;
    const r = Bun.spawnSync(["bash", "-c", script]);
    expect(r.exitCode).toBe(0);
    expect(read(join(newTree, ".env"), "utf8")).toBe("K=v\n");
    expect(existsSync(join(newTree, "NEWSROOM-PROFILE.md"))).toBe(false);
  });
});
