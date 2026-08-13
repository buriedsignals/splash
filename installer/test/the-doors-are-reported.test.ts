/**
 * THE DOORS ARE REPORTED, NOT ASKED ABOUT — and reported from ONE source of truth.
 *
 * The owner expected the setup page to ask a question per AI host, and there correctly is none:
 * Goose, Codex and Gemini share one agents store, so `place-skills.mjs` wires it unconditionally.
 * But a page that then says nothing leaves him unable to tell a wired install
 * from an unwired one, or to see that a placement was REFUSED (a symlinked skills directory, a
 * name collision) — and a refusal is the one thing that install never works around.
 *
 * So the page reports. The danger in reporting is a second copy of the knowledge: a hard-coded
 * door path or host list in `configure.mjs` would be green on the day it was written and wrong on
 * the day the doors change. These guards pin both halves — that the knowledge is imported, and
 * that what is imported actually reaches the page.
 *
 * EACH GUARD WITH THE MUTATION THAT REDDENS IT, every one run in a copy under /tmp
 * (`/tmp/twin-mut`), never in this tree:
 *
 *   1. MUTATION: paste a door path literal into `configure.mjs`
 *      (`const doors = [join(HOME, ".agents", "skills")];`).
 *        (fail) the doors > should keep the door and host knowledge in place-skills.mjs alone
 *        error: expect(received).toEqual(expected)
 *        + "configure.mjs spells .agents/skills itself",
 *
 *   2. MUTATION: filter refusals out of the report (`.filter((r) => r.status !== "refused")` on
 *      the door's rows in `doorsSection`).
 *        (fail) the doors > should report a refusal, with its reason, rather than a silent absence
 *        error: expect(received).toContain(expected) · Expected to contain: "refused"
 *
 *   3. MUTATION: omit the store section (`DOORS.slice(0, 0).map(...)`).
 *        (fail) the doors > should report every door and every host
 *        error: expect(received).toContain(expected)
 *          Expected to contain: "<code>~/.agents/skills</code> — one flat link per skill"
 *
 *   4. MUTATION: ask `planPlacement` without `dryRun` from `doorsSection`.
 *        (fail) the doors > should place nothing while rendering the report
 *        error: expect(received).toBe(expected) · Expected: false · Received: true
 *
 * `doctor.mjs` independently resolves every expected link because it verifies the installed
 * machine rather than rendering the configuration plan.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DOORS, HOSTS, detectHosts, planPlacement } from "../place-skills.mjs";

const INSTALLER = resolve(import.meta.dirname, "..");
const TWIN = resolve(INSTALLER, "..");

let lab = "";
let root = "";
let home = "";
let pageUrl = "";
let page: ReturnType<typeof Bun.spawn> | null = null;
let html = "";

beforeAll(async () => {
  lab = mkdtempSync(join(tmpdir(), "splash-doors-"));
  root = join(lab, "root");
  home = join(lab, "home");
  mkdirSync(root, { recursive: true });
  mkdirSync(join(home, ".agents", "skills"), { recursive: true });
  symlinkSync(join(TWIN, "skills"), join(root, "skills"));

  // One detected host and one collision the installer must report without removing.
  mkdirSync(join(home, ".config", "goose"), { recursive: true });
  writeFileSync(
    join(home, ".agents", "skills", "palette"),
    "a file the journalist put here",
  );

  page = Bun.spawn(
    [
      "bun",
      join(INSTALLER, "configure.mjs"),
      "--root",
      root,
      "--home",
      home,
      "--headless",
      "--idle-ms",
      "120000",
    ],
    { stdout: "pipe", stderr: "pipe" },
  );
  const reader = page.stdout.getReader();
  const deadline = Date.now() + 20000;
  let buffer = "";
  while (!pageUrl && Date.now() < deadline) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += new TextDecoder().decode(value);
    const match = /SPLASH_CONFIGURE_URL=(\S+)/.exec(buffer);
    if (match) pageUrl = match[1].replace(/\/$/, "");
  }
  reader.releaseLock();
  if (!pageUrl)
    throw new Error(`the setup page never printed its URL: ${buffer}`);
  html = await (await fetch(`${pageUrl}/`)).text();
});

afterAll(() => {
  page?.kill();
  rmSync(lab, { recursive: true, force: true });
});

describe("the doors the page reports", () => {
  it("should keep the door and host knowledge in place-skills.mjs alone", () => {
    // Read as SOURCE TEXT, not as behaviour: the failure this defends against is somebody adding a
    // second, drifting list to the page. The strings are derived from `DOORS` itself, so a door
    // that moves moves this guard with it.
    const source = readFileSync(join(INSTALLER, "configure.mjs"), "utf8");
    const offenders: string[] = [];
    for (const door of DOORS) {
      const tail = door.dir("/HOME").replace("/HOME/", ""); // ".agents/skills"
      const [first, second] = tail.split("/");
      if (
        source.includes(tail) ||
        (source.includes(`"${first}"`) && source.includes(`"${second}"`))
      )
        offenders.push(`configure.mjs spells ${tail} itself`);
    }
    for (const host of HOSTS) {
      if (source.includes(`"${host.id}"`))
        offenders.push(`configure.mjs spells the host id ${host.id} itself`);
    }
    expect(offenders).toEqual([]);
  });

  it("should report every door and every host", () => {
    // Each door's OWN section, not merely its path somewhere on the page: the host table lists the
    // store each host reads, so this assertion checks the store's own rendered section rather than
    // merely finding its path in the host table.
    for (const door of DOORS)
      expect(html).toContain(`<code>${door.dir("~")}</code> — ${door.name}`);
    for (const host of HOSTS) expect(html).toContain(host.name);
  });

  it("should say, per host, whether it was found on this machine", () => {
    const detected = detectHosts({ home });
    // The fixture HOME has a Goose marker and no Codex/Gemini marker, so at least one host is
    // reported present and at least one absent — a report that could only ever say one of the two
    // is not a report.
    expect(detected.some((h) => h.detected)).toBe(true);
    expect(detected.some((h) => !h.detected)).toBe(true);
    expect(html).toContain("no trace of it");
  });

  it("should report a refusal, with its reason, rather than a silent absence", () => {
    expect(html).toContain("refused");
    expect(html).toContain("a real file is already there");
    expect(html).toContain("palette");
  });

  it("should place nothing while rendering the report", () => {
    // The collision must still be the journalist's file — the page reports,
    // `place-skills.mjs` places.
    expect(
      readFileSync(join(home, ".agents", "skills", "palette"), "utf8"),
    ).toBe("a file the journalist put here");
    expect(existsSync(join(home, ".agents", "skills", "map-beat"))).toBe(
      false,
    );
  });
});

describe("planPlacement, the report's own source", () => {
  it("should touch nothing in a dry run, and place everything without one", () => {
    const fresh = join(lab, "fresh-home");
    mkdirSync(fresh, { recursive: true });

    const planned = planPlacement({ root, home: fresh, dryRun: true });
    expect(planned.results.every((r) => r.status.startsWith("would-"))).toBe(
      true,
    );
    expect(existsSync(join(fresh, ".agents", "skills"))).toBe(false);

    const placed = planPlacement({ root, home: fresh, dryRun: false });
    expect(placed.results.some((r) => r.status === "linked")).toBe(true);
    expect(existsSync(join(fresh, ".claude", "skills", "splash"))).toBe(false);
    expect(
      existsSync(join(fresh, ".agents", "skills", "palette", "SKILL.md")),
    ).toBe(true);

    // Idempotent: a correct link already in place is left alone and reported as `ok`.
    const again = planPlacement({ root, home: fresh, dryRun: false });
    expect(again.results.every((r) => r.status === "ok")).toBe(true);
  });

  it("should place private parent installs below one product namespace", () => {
    const namespaced = join(lab, "namespaced-home");
    mkdirSync(namespaced, { recursive: true });

    const placed = planPlacement({
      root,
      home: namespaced,
      namespace: "splash",
      dryRun: false,
    });

    expect(placed.results.some((r) => r.status === "linked")).toBe(true);
    expect(
      existsSync(
        join(
          namespaced,
          ".agents",
          "skills",
          "splash",
          "palette",
          "SKILL.md",
        ),
      ),
    ).toBe(true);
    expect(
      existsSync(join(namespaced, ".agents", "skills", "palette")),
    ).toBe(false);
  });

  it("should reject an invalid private namespace", () => {
    expect(() =>
      planPlacement({
        root,
        home,
        namespace: "../splash",
        dryRun: true,
      }),
    ).toThrow("invalid skill namespace");
  });

  it("should refuse a user-managed agents skills directory", () => {
    const blocked = join(lab, "blocked-home");
    const managed = join(lab, "someone-elses-skills");
    mkdirSync(join(blocked, ".agents"), { recursive: true });
    mkdirSync(managed, { recursive: true });
    symlinkSync(managed, join(blocked, ".agents", "skills"));

    const result = planPlacement({ root, home: blocked, dryRun: false });
    expect(result.results.some((r) => r.status === "refused")).toBe(true);
    expect(result.results.some((r) => r.detail.includes("user-managed"))).toBe(
      true,
    );
    expect(existsSync(join(managed, "splash"))).toBe(false);
  });
});
