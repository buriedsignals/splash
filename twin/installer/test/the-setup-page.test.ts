/**
 * THE SETUP PAGE, DRIVEN END TO END — a real `configure.mjs` on a real loopback port, POSTed to
 * exactly the way a browser would, against a real fixture newsroom site on another loopback port.
 * Nothing here is stubbed except the far end of the network, which is a server this file starts.
 *
 * WHAT IT DEFENDS, and the mutation that reddens each — every one run in a copy under /tmp
 * (`/tmp/twin-mut`), never in this tree:
 *
 *   1. THE DERIVATION PROPOSES; IT NEVER WRITES. `newsroom-charter`'s rule 2 is that
 *      `deriveCharter` has no write path — and this page is its caller, so the rule has to hold
 *      here too. `/derive` is driven against a site that declares a full charter, and the root is
 *      then checked for a `NEWSROOM.md` and a `.env`: neither may exist. Only `/submit` writes.
 *      MUTATION: have `/derive` write `NEWSROOM.md` from the proposal before returning it.
 *        (fail) the derivation > should write nothing at all, whatever the site declares
 *        error: expect(received).toBe(expected) · Expected: false · Received: true
 *
 *   2. AN UNDECLARED FIELD BECOMES A QUESTION, NEVER A DEFAULT. Driven against a site that
 *      declares nothing derivable: every field comes back as a question and no value is proposed.
 *      MUTATION: fall back to `#0B7A75`/`#FFFFFF` when the site declares no colours.
 *        (fail) the derivation > should turn what the site does not declare into questions
 *        error: expect(received).toEqual(expected)
 *        + "brandColor",
 *        + "ground",
 *
 *   3. A URL THIS PAGE WILL NOT FETCH IS REFUSED BEFORE ANY FETCH. Bun's `fetch` reads `file://`
 *      URLs — measured, `fetch("file:///tmp/x.html")` answers 200 with the file's contents — so
 *      without a scheme check "read my newsroom's site" would read any file this process can reach.
 *      MUTATION: drop the `httpUrl` check in `derive` and pass the raw url through.
 *        (fail) the derivation > should refuse a scheme it will not fetch, and read no local file
 *        error: expect(received).toBe(expected) · Expected: false · Received: true
 *
 *   4. A SITE THAT DOES NOT ANSWER IS A READABLE MESSAGE, NOT A HANG AND NOT AN EMPTY SUCCESS.
 *      MUTATION: return `{ok: true, applied: [], questions: []}` on the failure branch.
 *        (fail) the derivation > should report an unreachable site as a readable failure
 *        error: expect(received).toBe(expected) · Expected: false · Received: true
 *
 *   5. THE CMS CREDENTIAL IS SHAPE-CHECKED AND NEVER CLAIMED TO BE VERIFIED. It goes through the
 *      same `recordKey` path at 0600 as every other key; an unknown CMS is refused even when
 *      `/submit` is POSTed directly, because a payload arriving on a socket does not get to decide
 *      what is written; and `/verify` never reports it as "accepted" the way a probed key is.
 *      MUTATION: accept any `CMS_KIND` (`if (false)` in place of the `CMS_KINDS.includes` check).
 *        (fail) the CMS credential > should refuse a CMS nothing downstream can build a mutation for
 *        error: expect(received).toBe(expected) · Expected: false · Received: true
 *
 * WHAT IT DOES NOT COVER, named rather than implied: the page's own DOM script. Which values are
 * proposals and which are questions is decided on the server for exactly that reason — so it is
 * covered here — but the click handler that copies a confirmed value into an empty input, and the
 * CMS-shape line that adapts to the chosen kind, are driven by a browser this suite does not start.
 * They were driven by hand against a running page; a headless-browser guard for them is not here.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { createServer } from "node:http";
import {
  existsSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  cpSync,
  statSync,
} from "node:fs";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const INSTALLER = resolve(import.meta.dirname, "..");
const TWIN = resolve(INSTALLER, "..");

// A fixture newsroom site. `/` declares a full charter; `/silent` declares nothing derivable.
const RICH_HTML = `<!doctype html><html lang="fr"><head>
<meta charset="utf-8"><title>La Gazette du Lac</title>
<meta name="theme-color" content="#0B7A75">
<link rel="alternate" hreflang="de-CH" href="/de">
<link rel="stylesheet" href="/house.css">
</head><body></body></html>`;
const RICH_CSS = `:root{--brand-primary:#0B7A75;--accent-warm:#C1440E}
html,body{background:#FFFDF7}
h1{font-family:"Source Serif 4",Georgia,serif}
p{font-family:"Source Serif 4",Georgia,serif}
nav{font-family:"Source Sans 3",system-ui,sans-serif}
footer{font-family:"Source Sans 3",system-ui,sans-serif}`;
const SILENT_HTML = `<!doctype html><html><head><meta charset="utf-8"><title></title></head><body></body></html>`;

let site: ReturnType<typeof createServer>;
let siteUrl = "";
let pageUrl = "";
let page: ReturnType<typeof Bun.spawn> | null = null;
let root = "";
let home = "";
let lab = "";
/** A local file the page must never be talked into reading. */
let localFile = "";

async function post(path: string, body: unknown) {
  const response = await fetch(`${pageUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await response.json()) as any;
}

beforeAll(async () => {
  lab = mkdtempSync(join(tmpdir(), "splash-setup-page-"));
  root = join(lab, "root");
  home = join(lab, "home");
  mkdirSync(root, { recursive: true });
  mkdirSync(home, { recursive: true });
  // A Splash root the page can load its skills out of, without copying fifteen skill trees: the
  // page resolves `<root>/skills/<id>/scripts/…`, and a symlinked `skills` resolves exactly the
  // same way an installed one does.
  symlinkSync(join(TWIN, "skills"), join(root, "skills"));
  cpSync(join(TWIN, ".claude-plugin"), join(root, ".claude-plugin"), {
    recursive: true,
  });

  localFile = join(lab, "not-a-newsroom.html");
  await Bun.write(
    localFile,
    `<html lang="xx"><head><meta name="theme-color" content="#123456"></head></html>`,
  );

  site = createServer((req, res) => {
    if (req.url === "/house.css")
      res.writeHead(200, { "content-type": "text/css" }).end(RICH_CSS);
    else if (req.url?.startsWith("/silent"))
      res.writeHead(200, { "content-type": "text/html" }).end(SILENT_HTML);
    else res.writeHead(200, { "content-type": "text/html" }).end(RICH_HTML);
  });
  await new Promise<void>((done) => site.listen(0, "127.0.0.1", () => done()));
  siteUrl = `http://127.0.0.1:${(site.address() as any).port}`;

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
  // The page prints its own URL, which is what makes it drivable without a browser.
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
});

afterAll(() => {
  page?.kill();
  site?.close();
  rmSync(lab, { recursive: true, force: true });
});

describe("the derivation the page offers", () => {
  it("should propose every value the site declares, each beside the declaration it was read from", async () => {
    const result = await post("/derive", { url: `${siteUrl}/` });
    expect(result.ok).toBe(true);
    const byField = Object.fromEntries(
      result.applied.map((row: any) => [row.field, row]),
    );
    expect(byField.brandColor.value).toBe("#0b7a75");
    expect(byField.brandColor.evidence).toContain('content="#0B7A75"');
    expect(byField.ground.value).toBe("#fffdf7");
    expect(byField.ground.evidence).toContain("#FFFDF7");
    // The extended model is derived too, not left for the journalist to type.
    expect(byField.languages.value).toBe("fr, de");
    expect(byField.languages.evidence).toContain('hreflang="de-CH"');
    expect(byField.accents.value).toBe("#c1440e");
    expect(byField.accents.evidence).toContain("--accent-warm");
    // Every proposed row carries its source; a value with no evidence is an assertion, not a
    // proposal, and this page exists to stop the journalist being handed one.
    for (const row of result.applied) {
      expect(row.source).toBeTruthy();
      expect(row.evidence).toBeTruthy();
    }
  });

  it("should write nothing at all, whatever the site declares", async () => {
    await post("/derive", { url: `${siteUrl}/` });
    expect(existsSync(join(root, "NEWSROOM.md"))).toBe(false);
    expect(existsSync(join(root, ".env"))).toBe(false);
  });

  it("should turn what the site does not declare into questions", async () => {
    const result = await post("/derive", { url: `${siteUrl}/silent` });
    expect(result.ok).toBe(true);
    expect(result.questions.map((q: any) => q.field).sort()).toEqual([
      "brandColor",
      "ground",
      "languages",
      "name",
      "typefaces",
    ]);
    // Nothing but the address itself is proposed — no default colour wearing a measurement's
    // authority, which is the one failure the charter skill exists to prevent.
    expect(result.applied.map((row: any) => row.field)).toEqual(["url"]);
    for (const question of result.questions)
      expect(question.question).toContain("does not declare");
  });

  it("should refuse a scheme it will not fetch, and read no local file", async () => {
    const result = await post("/derive", { url: `file://${localFile}` });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("file://");
    expect(JSON.stringify(result)).not.toContain("#123456");
    expect(result.askInstead.length).toBeGreaterThan(0);
  });

  it("should report an unreachable site as a readable failure, and leave the form usable", async () => {
    const started = Date.now();
    const result = await post("/derive", { url: "http://127.0.0.1:1/" });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("could not be read");
    expect(result.askInstead.length).toBeGreaterThan(0);
    expect(Date.now() - started).toBeLessThan(15000); // bounded, never a hang
  });
});

describe("the CMS credential", () => {
  it("should offer exactly the CMS kinds the delivery form can build a mutation for", async () => {
    const html = await (await fetch(`${pageUrl}/`)).text();
    const { CMS_KINDS } = await import(
      join(TWIN, "skills", "deliver", "scripts", "cms-insert.mjs")
    );
    const offered = [...html.matchAll(/<option value="([^"]+)">/g)].map(
      (m) => m[1],
    );
    expect(offered).toEqual(CMS_KINDS);
  });

  it("should refuse a CMS nothing downstream can build a mutation for", async () => {
    const payload = {
      CMS_KIND: "wordpress",
      CMS_ENDPOINT: "https://cms.test/api",
      CMS_TOKEN: "t",
    };
    const verified = await post("/verify", payload);
    expect(verified.rejected).toContain("CMS_KIND");
    // And refused again at `/submit`, which is the endpoint that actually writes: the browser is
    // not the gate, the server is.
    const submitted = await post("/submit", payload);
    expect(submitted.ok).toBe(false);
    expect(existsSync(join(root, ".env"))).toBe(false);
  });

  it("should refuse half a credential rather than record a token nothing can use", async () => {
    const verified = await post("/verify", { CMS_TOKEN: "t" });
    expect(verified.rejected.sort()).toEqual(["CMS_ENDPOINT", "CMS_KIND"]);
    expect(existsSync(join(root, ".env"))).toBe(false);
  });

  it("should never claim the credential was checked, unlike every probed key", async () => {
    const verified = await post("/verify", {
      CMS_KIND: "livingdocs",
      CMS_ENDPOINT: "https://cms.test/api",
      CMS_TOKEN: "t",
    });
    const line = verified.lines.find((l: string) => l.startsWith("CMS:"));
    expect(line).toContain("WITHOUT any check");
    expect(line).toContain("not a proven integration");
    expect(line).not.toContain("accepted");
  });

  it("should write the credential through recordKey, at 0600, like every other secret", async () => {
    const result = await post("/submit", {
      name: "La Gazette",
      url: "https://gazette.test",
      languages: "fr, de",
      brandColor: "#0B7A75",
      accents: "#C1440E",
      ground: "#FFFDF7",
      typefaces: "Source Serif 4, Source Sans 3",
      CMS_KIND: "we-publish",
      CMS_ENDPOINT: "https://cms.test/graphql",
      CMS_TOKEN: "tok-123",
    });
    expect(result.ok).toBe(true);

    const env = readFileSync(join(root, ".env"), "utf8");
    expect(env).toContain("CMS_KIND=we-publish");
    expect(env).toContain("CMS_ENDPOINT=https://cms.test/graphql");
    expect(env).toContain("CMS_TOKEN=tok-123");
    expect(statSync(join(root, ".env")).mode & 0o777).toBe(0o600);

    // And the profile it wrote is read back by the SAME reader preflight uses, carrying the
    // extended model: several languages, more than one accent.
    const {
      parseNewsroom,
      validateNewsroom,
      newsroomLanguages,
      newsroomAccents,
    } = await import(
      join(TWIN, "skills", "splash", "scripts", "newsroom.mjs")
    );
    const profile = parseNewsroom(
      readFileSync(join(root, "NEWSROOM.md"), "utf8"),
    );
    expect(validateNewsroom(profile)).toEqual([]);
    expect(newsroomLanguages(profile)).toEqual(["fr", "de"]);
    expect(newsroomAccents(profile)).toEqual(["#0B7A75", "#C1440E"]);
  });
});
