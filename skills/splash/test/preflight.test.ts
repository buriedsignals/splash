import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  mkdtemp,
  mkdir,
  writeFile,
  rm,
  readFile,
  readdir,
} from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import {
  runPreflight,
  assertPreflightReady,
  capabilityGap,
} from "../scripts/preflight.mjs";

const okFetch = async () => new Response("{}", { status: 200 });
const rejectingFetch = async () => new Response("Invalid key", { status: 403 });
let root: string;

// Source of truth for "what a real Splash root needs": the same file preflight.mjs reads.
const ROOT_TEMPLATE_PACKAGE_JSON = join(
  import.meta.dirname,
  "..",
  "assets",
  "root-template",
  "package.json",
);
const ROOT_TEMPLATE_SHARED_DIR = join(
  import.meta.dirname,
  "..",
  "assets",
  "root-template",
  "shared",
);

async function declaredDependencyNames(): Promise<string[]> {
  const pkg = JSON.parse(await readFile(ROOT_TEMPLATE_PACKAGE_JSON, "utf8"));
  return Object.keys(pkg.dependencies ?? {});
}

// Every vendored craft file the root template ships under shared/, relative to that directory —
// the same manifest preflight.mjs itself derives from the template, not a hand-kept list that
// could drift from it.
async function declaredSharedFiles(): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(ROOT_TEMPLATE_SHARED_DIR, {
      recursive: true,
      withFileTypes: true,
    });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) =>
      relative(
        ROOT_TEMPLATE_SHARED_DIR,
        join((entry as any).parentPath ?? (entry as any).path, entry.name),
      ),
    );
}

// A stub package shaped the way `bun install` actually leaves one — a present node_modules with
// nothing usable inside it is exactly the bug this suite pins, so "installed" here means "a real
// package is there", not "a directory exists".
//
// The `package.json` is not decoration. This stub used to be an `index.js` alone, which Node's
// resolver accepts and which therefore satisfied the old `Bun.resolveSync` check. `checkDependencies`
// now looks for the package's own manifest in the root's OWN tree, because resolution walks up into
// ancestor `node_modules` and reported a completely empty root as fully installed (see
// `resolveDepInTree`'s header, and `preflight-resolves-in-the-tree.test.ts`). Every real package has
// a manifest; a fixture that omitted it was modelling something npm never produces.
async function installResolvableDependency(name: string): Promise<void> {
  const dir = join(root, "node_modules", name);
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "package.json"),
    JSON.stringify({ name, version: "0.0.0", main: "index.js" }),
  );
  await writeFile(join(dir, "index.js"), "export default {};\n");
}

// Stubs every vendored shared file the template declares, so a test that only cares about
// dependency RESOLUTION does not fail on a check it isn't exercising.
async function installAllSharedFiles(): Promise<void> {
  for (const relPath of await declaredSharedFiles()) {
    const dest = join(root, "shared", relPath);
    await mkdir(join(dest, ".."), { recursive: true });
    await writeFile(dest, "// stub\n");
  }
}

// Installs everything checkDependencies needs so a test can focus purely on the newsroom check or
// on capabilities without also having to reason about the dependency check.
async function installEverything(): Promise<void> {
  for (const name of await declaredDependencyNames()) {
    await installResolvableDependency(name);
  }
  await installAllSharedFiles();
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "splash-root-"));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const complete = `---
name: Heidi.news
url: https://www.heidi.news
language: fr
brandColor: "#0B7A75"
ground: "#FFFFFF"
typefaces: "Source Serif"
---
`;

const declined = `---
decision: declined
---

The newsroom was asked whether to derive a house profile and said no. This is a recorded choice,
not a missing default.
`;

describe("runPreflight — dependencies and the newsroom's identity are the only hard stops", () => {
  it("should report not ready when node_modules is absent", async () => {
    await writeFile(join(root, "NEWSROOM.md"), complete);
    const report = await runPreflight({ root, env: {}, fetchFn: okFetch });
    expect(report.ready).toBe(false);
    expect(report.blockers.map((b) => b.id)).toContain("dependencies");
  });

  it("should report not ready, naming newsroom-profile, when NEWSROOM.md is absent", async () => {
    await installEverything();
    const report = await runPreflight({ root, env: {}, fetchFn: okFetch });
    const newsroom = report.checks.find((c) => c.id === "newsroom-profile");
    expect(newsroom?.status).toBe("missing");
    expect(report.ready).toBe(false);
    expect(report.blockers.map((b) => b.id)).toContain("newsroom-profile");
  });

  it("should report not ready when NEWSROOM.md exists but cannot be parsed", async () => {
    await installEverything();
    await writeFile(join(root, "NEWSROOM.md"), `\n${complete}`);
    const report = await runPreflight({ root, env: {}, fetchFn: okFetch });
    const newsroom = report.checks.find((c) => c.id === "newsroom-profile");
    expect(newsroom?.status).toBe("fail");
    expect(newsroom?.detail).toContain("front matter");
    expect(report.ready).toBe(false);
  });

  it("should report not ready when NEWSROOM.md is present but incomplete", async () => {
    await installEverything();
    await writeFile(join(root, "NEWSROOM.md"), "---\nname: X\n---\n");
    const report = await runPreflight({ root, env: {}, fetchFn: okFetch });
    expect(report.checks.find((c) => c.id === "newsroom-profile")?.status).toBe(
      "fail",
    );
    expect(report.ready).toBe(false);
  });

	it("should be ready when dependencies resolve and NEWSROOM.md is complete, even with no keys set at all", async () => {
    await installEverything();
    await writeFile(join(root, "NEWSROOM.md"), complete);
    const report = await runPreflight({ root, env: {}, fetchFn: okFetch });
    expect(report.ready).toBe(true);
		expect(report.blockers).toEqual([]);
	});

	it("reads newsroom identity from the Engine-owned external path, not the source checkout", async () => {
		await installEverything();
		await writeFile(join(root, "NEWSROOM.md"), "---\nname: wrong checkout identity\n---\n");
		const newsroomRoot = await mkdtemp(join(tmpdir(), "splash-newsroom-"));
		try {
			const newsroomPath = join(newsroomRoot, "NEWSROOM.md");
			await writeFile(newsroomPath, complete);
			const report = await runPreflight({ root, newsroomPath, env: {}, fetchFn: okFetch });
			expect(report.ready).toBe(true);
			expect(report.checks.find((c) => c.id === "newsroom-profile")?.profile?.name).toBe("Heidi.news");
		} finally {
			await rm(newsroomRoot, { recursive: true, force: true });
		}
	});
});

describe("runPreflight — the newsroom's identity has three honest outcomes, not two", () => {
  it("should report `declined`, distinct from both `pass` and `missing`, when NEWSROOM.md records a decline", async () => {
    await installEverything();
    await writeFile(join(root, "NEWSROOM.md"), declined);
    const report = await runPreflight({ root, env: {}, fetchFn: okFetch });
    const newsroom = report.checks.find((c) => c.id === "newsroom-profile");
    expect(newsroom?.status).toBe("declined");
    expect(newsroom?.status).not.toBe("pass");
    expect(newsroom?.status).not.toBe("missing");
    expect(newsroom?.status).not.toBe("fail");
  });

  it("should treat `declined` as an answered question — ready, exactly like `pass`", async () => {
    await installEverything();
    await writeFile(join(root, "NEWSROOM.md"), declined);
    const report = await runPreflight({ root, env: {}, fetchFn: okFetch });
    expect(report.ready).toBe(true);
    expect(report.blockers).toEqual([]);
  });

  // MUTATION PROOF 4: a declined theme must be distinguishable from a missing one by a later
  // phase. Both leave a story able to proceed (readiness), but they are NOT the same fact — a
  // later reader must be able to tell "the journalist was asked and said no" apart from "nobody
  // was ever asked". Collapsing them to the same status would be exactly the silent-default bug
  // this design exists to prevent.
  it("MUTATION: declined and missing must not collapse to the same status", async () => {
    await installEverything();

    await writeFile(join(root, "NEWSROOM.md"), declined);
    const declinedReport = await runPreflight({
      root,
      env: {},
      fetchFn: okFetch,
    });
    const declinedStatus = declinedReport.checks.find(
      (c) => c.id === "newsroom-profile",
    )?.status;

    await rm(join(root, "NEWSROOM.md"));
    const missingReport = await runPreflight({
      root,
      env: {},
      fetchFn: okFetch,
    });
    const missingStatus = missingReport.checks.find(
      (c) => c.id === "newsroom-profile",
    )?.status;

    expect(declinedStatus).toBe("declined");
    expect(missingStatus).toBe("missing");
    expect(declinedStatus).not.toBe(missingStatus);
  });
});

describe("runPreflight — capabilities, not a verdict", () => {
  // MUTATION PROOF 1: a chart-only story with no MapTiler key must reach production. Before this
  // rebuild, a missing MAPTILER_KEY made `ok` false unconditionally — the whole session refused to
  // proceed over a key a chart-only story would never touch. Now `ready` depends only on the two
  // hard stops above; a closed capability narrows the menu, it never blocks the journey.
  it("MUTATION 1: should stay ready with no MAPTILER_KEY and no DATAWRAPPER_TOKEN set at all", async () => {
    await installEverything();
    await writeFile(join(root, "NEWSROOM.md"), complete);
    const report = await runPreflight({ root, env: {}, fetchFn: okFetch });
    expect(report.ready).toBe(true);
    expect(report.capabilities.map.available).toBe(false);
    expect(report.capabilities.datawrapper.available).toBe(false);
  });

  it("should report the map capability open when MAPTILER_KEY probes green", async () => {
    await installEverything();
    await writeFile(join(root, "NEWSROOM.md"), complete);
    const report = await runPreflight({
      root,
      env: { MAPTILER_KEY: "k" },
      fetchFn: okFetch,
    });
    expect(report.capabilities.map.available).toBe(true);
    expect(report.ready).toBe(true);
  });

  it("should keep the session ready even when a present MapTiler key is rejected (403) — closed capability, not a blocker", async () => {
    await installEverything();
    await writeFile(join(root, "NEWSROOM.md"), complete);
    const report = await runPreflight({
      root,
      env: { MAPTILER_KEY: "present-but-stale" },
      fetchFn: rejectingFetch,
    });
    expect(report.capabilities.map.available).toBe(false);
    expect(report.capabilities.map.reason).toContain("403");
    expect(report.ready).toBe(true);
  });

  it("should report the datawrapper capability open when DATAWRAPPER_TOKEN probes green", async () => {
    await installEverything();
    await writeFile(join(root, "NEWSROOM.md"), complete);
    const report = await runPreflight({
      root,
      env: { DATAWRAPPER_TOKEN: "t" },
      fetchFn: okFetch,
    });
    expect(report.capabilities.datawrapper.available).toBe(true);
  });

  it("should report the hosted-embed capability closed when only one of its two credentials is set", async () => {
    await installEverything();
    await writeFile(join(root, "NEWSROOM.md"), complete);
    const report = await runPreflight({
      root,
      env: { CLOUDFLARE_API_TOKEN: "anything" },
      fetchFn: okFetch,
    });
    expect(report.capabilities.hostedEmbed.available).toBe(false);
    expect(report.capabilities.hostedEmbed.reason).toContain(
      "CLOUDFLARE_ACCOUNT_ID",
    );
  });

  // `SKILL.md`'s capability table said this row was "hardcoded closed, never probed" and "not yet
  // built", while `runPreflight` probed it for real and `offerForms` offers the `embed` form the
  // moment both credentials resolve. A model reading that row told a journalist a hosted embed was
  // unavailable while delivery would have offered it -- a delivery constraint that came from
  // nowhere, which is the one absolute in that same file's never-list. Two assertions, because the
  // sentence was false in two different ways.
  it("should open the hosted-embed capability when both credentials probe green — it IS probed", async () => {
    await installEverything();
    await writeFile(join(root, "NEWSROOM.md"), complete);
    const report = await runPreflight({
      root,
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct",
        CLOUDFLARE_API_TOKEN: "tok",
      },
      fetchFn: okFetch,
    });
    expect(report.capabilities.hostedEmbed.available).toBe(true);
    expect(report.capabilities.hostedEmbed).toMatchObject({
      companionScriptUrl: "https://splash-scroller-def0b17f603285ef4336.pages.dev",
      whitelistOptional: true,
    });
  });

  it("should carry a probed capability's own rejection, rather than a fixed sentence", async () => {
    await installEverything();
    await writeFile(join(root, "NEWSROOM.md"), complete);
    const report = await runPreflight({
      root,
      env: { CLOUDFLARE_ACCOUNT_ID: "acct", CLOUDFLARE_API_TOKEN: "tok" },
      fetchFn: rejectingFetch,
    });
    expect(report.capabilities.hostedEmbed.available).toBe(false);
    expect(report.capabilities.hostedEmbed.reason).toContain("403");
  });

  // And the prose that describes it, held to what the code does. This is the guard that would have
  // caught the row itself, not merely its behaviour.
  //
  // RED, in a copy of the tree under /tmp, with the old row restored:
  //   error: expect(received).not.toMatch(expected)
  //   Expected substring: not /never probed|not yet built|hardcoded closed/
  //   Received: "| Cloudflare Pages | the hosted embed delivery form | never — optional, and not
  //              yet built: this row is hardcoded closed, never probed |"
  //   (fail) should not claim in prose that a capability it probes is never probed
  it("should not claim in prose that a capability it probes is never probed", async () => {
    const skill = readFileSync(join(import.meta.dirname, "..", "SKILL.md"), "utf8");
    const rows = skill
      .split(/\r?\n/)
      .filter((line) => /^\| *(`MAPTILER_KEY`|`DATAWRAPPER_TOKEN`|Cloudflare Pages)/.test(line));
    expect(rows.length).toBe(3);
    for (const row of rows) {
      expect(row).not.toMatch(/never probed|not yet built|hardcoded closed/);
    }
  });

  // MUTATION PROOF 3: an engine-style .env must be recognised. A working engine `.env` uses
  // VITE_MAPTILER_KEY / REMOTION_MAPTILER_KEY / MAPTILER_API_KEY and DATAWRAPPER_API_TOKEN, never
  // this project's own short names — before this rebuild, that root reported "missing" on a
  // machine that plainly has the key.
  it("MUTATION 3: should open the map capability from VITE_MAPTILER_KEY alone, the engine's own name", async () => {
    await installEverything();
    await writeFile(join(root, "NEWSROOM.md"), complete);
    const report = await runPreflight({
      root,
      env: { VITE_MAPTILER_KEY: "engine-key" },
      fetchFn: okFetch,
    });
    expect(report.capabilities.map.available).toBe(true);
  });

  it("MUTATION 3: should open the datawrapper capability from DATAWRAPPER_API_TOKEN alone, the engine's own name", async () => {
    await installEverything();
    await writeFile(join(root, "NEWSROOM.md"), complete);
    const report = await runPreflight({
      root,
      env: { DATAWRAPPER_API_TOKEN: "engine-token" },
      fetchFn: okFetch,
    });
    expect(report.capabilities.datawrapper.available).toBe(true);
  });

  it("should prefer the canonical MAPTILER_KEY over an alias when both are set", async () => {
    await installEverything();
    await writeFile(join(root, "NEWSROOM.md"), complete);
    let seenKey = "";
    const capturing = async (url: string) => {
      seenKey = String(url);
      return new Response("{}", { status: 200 });
    };
    await runPreflight({
      root,
      env: { MAPTILER_KEY: "canonical-key", VITE_MAPTILER_KEY: "alias-key" },
      fetchFn: capturing,
    });
    expect(seenKey).toContain("canonical-key");
    expect(seenKey).not.toContain("alias-key");
  });
});

describe("assertPreflightReady — mechanical enforcement, not prose a caller has to remember", () => {
  it("should throw, naming every blocker, when the report is not ready", async () => {
    const report = await runPreflight({ root, env: {}, fetchFn: okFetch });
    expect(() => assertPreflightReady(report)).toThrow("dependencies");
  });

  it("should not throw when the report is ready, even with every capability closed", async () => {
    await installEverything();
    await writeFile(join(root, "NEWSROOM.md"), complete);
    const report = await runPreflight({ root, env: {}, fetchFn: okFetch });
    expect(() => assertPreflightReady(report)).not.toThrow();
  });
});

describe("capabilityGap — the seam a later phase reads before offering a medium", () => {
  // MUTATION PROOF 2: a map story with no MapTiler key must be told maps are unavailable, rather
  // than that its environment failed. Before this rebuild there was no such seam at all — a
  // missing key surfaced as a generic environment failure indistinguishable from a broken install.
  it("MUTATION 2: should say map beats are unavailable, and must never say the environment failed", async () => {
    await installEverything();
    await writeFile(join(root, "NEWSROOM.md"), complete);
    const report = await runPreflight({ root, env: {}, fetchFn: okFetch });
    const gap = capabilityGap(report.capabilities, "map");
    expect(gap).toContain("map beats are unavailable");
    expect(gap?.toLowerCase()).not.toContain("environment");
    expect(gap?.toLowerCase()).not.toContain("failed");
  });

  it("should return null when the capability is open", async () => {
    await installEverything();
    await writeFile(join(root, "NEWSROOM.md"), complete);
    const report = await runPreflight({
      root,
      env: { MAPTILER_KEY: "k" },
      fetchFn: okFetch,
    });
    expect(capabilityGap(report.capabilities, "map")).toBeNull();
  });

  it("should return null for a medium it has no opinion about, rather than inventing a gap", () => {
    expect(capabilityGap({}, "chart")).toBeNull();
  });
});

describe("runPreflight — dependency-checking behaviour carried over unchanged", () => {
  it("should report dependencies as fail, naming the missing vendored craft file, when packages resolve but shared/ is absent — the toolkit-not-portable gap (TRIAL-THREE-BEATS.md §4, PROOF.md §1)", async () => {
    await writeFile(join(root, "NEWSROOM.md"), complete);
    for (const name of await declaredDependencyNames()) {
      await installResolvableDependency(name);
    }
    // shared/ is deliberately never created here — the exact shape of a root whose
    // node_modules is fine but whose vendored craft code never arrived.
    const report = await runPreflight({ root, env: {}, fetchFn: okFetch });
    const check = report.checks.find((c) => c.id === "dependencies");
    expect(check?.status).toBe("fail");
    expect(check?.detail).toContain("shared/chart-beat/render-still.mjs");
    expect(report.ready).toBe(false);
  });

  it("should report dependencies as fail, naming only the shared file actually missing, when the rest of shared/ is present", async () => {
    await writeFile(join(root, "NEWSROOM.md"), complete);
    for (const name of await declaredDependencyNames()) {
      await installResolvableDependency(name);
    }
    const declaredShared = await declaredSharedFiles();
    expect(declaredShared).toContain(
      join("chart-beat", "inspect-render.mjs"),
    );
    for (const relPath of declaredShared) {
      if (relPath === join("chart-beat", "inspect-render.mjs")) continue;
      const dest = join(root, "shared", relPath);
      await mkdir(join(dest, ".."), { recursive: true });
      await writeFile(dest, "// stub\n");
    }
    const report = await runPreflight({ root, env: {}, fetchFn: okFetch });
    const check = report.checks.find((c) => c.id === "dependencies");
    expect(check?.status).toBe("fail");
    expect(check?.detail).toContain(
      "shared/chart-beat/inspect-render.mjs",
    );
    expect(check?.detail).not.toContain("render-still.mjs");
    expect(report.ready).toBe(false);
  });

  it("should report dependencies as fail, naming the package, when node_modules exists but a declared dependency does not resolve", async () => {
    await writeFile(join(root, "NEWSROOM.md"), complete);
    const declared = await declaredDependencyNames();
    // node_modules exists — the old bug's trigger — but one declared package
    // was never actually installed into it (the @resvg/resvg-js shape from
    // the proof run: present directory, absent resolution).
    const [unresolved, ...rest] = declared;
    for (const name of rest) {
      await installResolvableDependency(name);
    }
    const report = await runPreflight({ root, env: {}, fetchFn: okFetch });
    const check = report.checks.find((c) => c.id === "dependencies");
    expect(check?.status).toBe("fail");
    expect(check?.detail).toContain(unresolved);
    expect(report.ready).toBe(false);
  });

  // PREFLIGHT OFFERS, it does not accept the value. New setup routes to the protected Engine page;
  // the retained legacy .env writer must never reappear in canonical guidance.
  it("should carry, on every capability row, an Engine setup remedy naming that row's own credential ID", async () => {
    await writeFile(join(root, "NEWSROOM.md"), complete);
    const report = await runPreflight({ root, env: {}, fetchFn: okFetch });
    const expected: Record<string, string> = {
      map: "MAPTILER_KEY",
      datawrapper: "DATAWRAPPER_TOKEN",
      hostedEmbed: "CLOUDFLARE_ACCOUNT_ID",
    };
    expect(Object.keys(report.capabilities).sort()).toEqual(
      Object.keys(expected).sort(),
    );
    for (const [id, variable] of Object.entries(expected)) {
      const row = report.capabilities[id];
      expect(row.fill).toBeTruthy();
      expect(row.fill).toContain(variable);
      expect(row.fill).toContain("Splash Readiness");
      expect(row.fill).not.toContain(".env");
    }
  });

  // The parsed profile used to be discarded here, and SKILL.md said preflight runs "silently when
  // ready" — so a journalist first heard what their own NEWSROOM.md said nine phases later.
  it("should carry the parsed newsroom profile on the check, not only its status", async () => {
    await writeFile(join(root, "NEWSROOM.md"), complete);
    const report = await runPreflight({ root, env: {}, fetchFn: okFetch });
    const check = report.checks.find((c) => c.id === "newsroom-profile");
    expect(check?.status).toBe("pass");
    expect(check?.profile?.name).toBe("Heidi.news");
    expect(check?.profile?.brandColor).toBe("#0B7A75");
  });

  it("should carry the profile on a declined stub too, so the decline can be read back as the decision it is", async () => {
    await writeFile(
      join(root, "NEWSROOM.md"),
      "---\ndecision: declined\n---\n",
    );
    const report = await runPreflight({ root, env: {}, fetchFn: okFetch });
    const check = report.checks.find((c) => c.id === "newsroom-profile");
    expect(check?.status).toBe("declined");
    expect(check?.profile?.decision).toBe("declined");
  });

  // The seventh, OPTIONAL field. Its absence is a fact to state ("no house credit convention is
  // recorded, so credit is asked per story"), never an error — every NEWSROOM.md written before it
  // existed stays valid.
  it("should read a house credit convention when one is recorded, and stay valid without one", async () => {
    await writeFile(
      join(root, "NEWSROOM.md"),
      complete
        .replace("---\n$", "")
        .replace(
          'typefaces: "Source Serif"',
          'typefaces: "Source Serif"\ncredit: "Source : {source} · Heidi.news"',
        ),
    );
    const withCredit = await runPreflight({ root, env: {}, fetchFn: okFetch });
    expect(
      withCredit.checks.find((c) => c.id === "newsroom-profile")?.profile
        ?.credit,
    ).toContain("Heidi.news");
    expect(
      withCredit.checks.find((c) => c.id === "newsroom-profile")?.status,
    ).toBe("pass");

    await writeFile(join(root, "NEWSROOM.md"), complete);
    const without = await runPreflight({ root, env: {}, fetchFn: okFetch });
    const check = without.checks.find((c) => c.id === "newsroom-profile");
    expect(check?.status).toBe("pass");
    expect(check?.profile?.credit).toBeUndefined();
  });

  it("should report dependencies as fail, naming @resvg/resvg-js, when the rasteriser is not resolvable — the original incident this suite pins", async () => {
    await writeFile(join(root, "NEWSROOM.md"), complete);
    const declared = await declaredDependencyNames();
    expect(declared).toContain("@resvg/resvg-js");
    for (const name of declared) {
      if (name === "@resvg/resvg-js") continue;
      await installResolvableDependency(name);
    }
    const report = await runPreflight({ root, env: {}, fetchFn: okFetch });
    const check = report.checks.find((c) => c.id === "dependencies");
    expect(check?.status).toBe("fail");
    expect(check?.detail).toContain("@resvg/resvg-js");
    expect(report.ready).toBe(false);
  });
});
