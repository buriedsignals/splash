/**
 * THE DOORS ARE REPORTED, NOT ASKED ABOUT — and reported from ONE source of truth.
 *
 * The owner expected the setup page to ask a question per AI host, and there correctly is none:
 * two doors cover all five hosts and no key differs between them, so `place-skills.mjs` wires both
 * unconditionally. But a page that then says nothing leaves him unable to tell a wired install
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
 *      (`const doors = [join(HOME, ".claude", "skills"), join(HOME, ".agents", "skills")];`).
 *        (fail) the doors > should keep the door and host knowledge in place-skills.mjs alone
 *        error: expect(received).toEqual(expected)
 *        + "configure.mjs spells .claude/skills itself",
 *        + "configure.mjs spells .agents/skills itself",
 *
 *   2. MUTATION: filter refusals out of the report (`.filter((r) => r.status !== "refused")` on
 *      the door's rows in `doorsSection`).
 *        (fail) the doors > should report a refusal, with its reason, rather than a silent absence
 *        error: expect(received).toContain(expected) · Expected to contain: "refused"
 *
 *   3. MUTATION: render only the first door (`DOORS.slice(0, 1).map(...)`).
 *        (fail) the doors > should report every door and every host
 *        error: expect(received).toContain(expected)
 *          Expected to contain: "<code>~/.agents/skills</code> — one flat link per skill"
 *
 *   4. MUTATION: ask `planPlacement` without `dryRun` from `doorsSection`.
 *        (fail) the doors > should place nothing while rendering the report
 *        error: expect(received).toBe(expected) · Expected: false · Received: true
 *
 * WHAT IT DOES NOT CLOSE: `doctor.mjs` still spells both door paths itself. That is a THIRD copy of
 * the same knowledge, older than this change and out of its scope — named here so it is a known
 * debt rather than a discovery.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  cpSync,
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
  cpSync(join(TWIN, ".claude-plugin"), join(root, ".claude-plugin"), {
    recursive: true,
  });

  // Two machines' worth of trouble, both of which `place-skills.mjs` refuses by design:
  //   - a skills directory that is itself a symlink (user-managed — placing through it would
  //     mutate whatever repository it points into)
  //   - a real file sitting on a name we would link (never removed)
  mkdirSync(join(home, ".claude"), { recursive: true });
  mkdirSync(join(lab, "someone-elses-skills"), { recursive: true });
  symlinkSync(
    join(lab, "someone-elses-skills"),
    join(home, ".claude", "skills"),
  );
  writeFileSync(
    join(home, ".agents", "skills", "twin-palette"),
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
      const tail = door.dir("/HOME").replace("/HOME/", ""); // ".claude/skills", ".agents/skills"
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
    // door each host reads, so a page rendering only the first door still contains both paths. The
    // first draft of this guard asserted the path alone and stayed green under exactly that
    // mutation — it was measured, not reasoned about, and the assertion moved.
    for (const door of DOORS)
      expect(html).toContain(`<code>${door.dir("~")}</code> — ${door.name}`);
    for (const host of HOSTS) expect(html).toContain(host.name);
  });

  it("should say, per host, whether it was found on this machine", () => {
    const detected = detectHosts({ home });
    // The fixture HOME has `~/.claude` and `~/.agents` and nothing else, so at least one host is
    // reported present and at least one absent — a report that could only ever say one of the two
    // is not a report.
    expect(detected.some((h) => h.detected)).toBe(true);
    expect(detected.some((h) => !h.detected)).toBe(true);
    expect(html).toContain("no trace of it");
  });

  it("should report a refusal, with its reason, rather than a silent absence", () => {
    expect(html).toContain("refused");
    expect(html).toContain("this skills directory is a symlink");
    expect(html).toContain("a real file is already there");
    expect(html).toContain("twin-palette");
  });

  it("should place nothing while rendering the report", () => {
    // The door directory that was refused must still be the journalist's own symlink, and the
    // collision must still be their file — the page reports, `place-skills.mjs` places.
    expect(existsSync(join(lab, "someone-elses-skills", "splash-twin"))).toBe(
      false,
    );
    expect(
      readFileSync(join(home, ".agents", "skills", "twin-palette"), "utf8"),
    ).toBe("a file the journalist put here");
    expect(existsSync(join(home, ".agents", "skills", "twin-map-beat"))).toBe(
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
    expect(existsSync(join(fresh, ".claude", "skills"))).toBe(false);

    const placed = planPlacement({ root, home: fresh, dryRun: false });
    expect(placed.results.some((r) => r.status === "linked")).toBe(true);
    expect(existsSync(join(fresh, ".claude", "skills", "splash-twin"))).toBe(
      true,
    );
    expect(
      existsSync(join(fresh, ".agents", "skills", "twin-palette", "SKILL.md")),
    ).toBe(true);

    // Idempotent: a correct link already in place is left alone and reported as `ok`.
    const again = planPlacement({ root, home: fresh, dryRun: false });
    expect(again.results.every((r) => r.status === "ok")).toBe(true);
  });
});
