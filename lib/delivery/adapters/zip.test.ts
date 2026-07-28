import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { unzipSync, strFromU8 } from "fflate";
import { sha256 } from "@noble/hashes/sha2.js";
import { zipPublisher } from "./zip";
import type { PublishRequest } from "../../core/publishers";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "splash-zip-"));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function request(): PublishRequest {
  const artifact = join(root, "interactive.html");
  writeFileSync(artifact, "<html><body>chart</body></html>");
  const outDir = join(root, "out");
  mkdirSync(outDir, { recursive: true });
  return {
    artifactPath: artifact,
    id: "primes",
    format: "interactive",
    metadata: {
      title: "Primes cantonales",
      altText: "Les primes montent",
      source: "OFSP",
      credit: "Heidi.news",
      lang: "fr",
      width: 700,
      height: 420,
    },
    settings: { publisherId: "zip" },
    credentials: {},
    outDir,
  };
}

function staticRequest(): PublishRequest {
  const artifact = join(root, "static.png");
  writeFileSync(artifact, "PNG-BYTES");
  const outDir = join(root, "out");
  mkdirSync(outDir, { recursive: true });
  return {
    artifactPath: artifact,
    id: "primes",
    format: "static",
    metadata: {
      title: "Primes cantonales",
      altText: "Les primes montent",
      source: "OFSP",
      credit: "Heidi.news",
      lang: "fr",
      width: 700,
      height: 420,
    },
    settings: { publisherId: "zip" },
    credentials: {},
    outDir,
  };
}

describe("the zip publisher, file genre", () => {
  it("should package the file and the alt text, and no embed code at all", async () => {
    const r = await zipPublisher.publish(staticRequest());
    expect(r.ok).toBe(true);
    const outcome = (r as { value: { path: string; snippet?: string } }).value;
    expect(outcome.snippet).toBeUndefined();

    const entries = unzipSync(new Uint8Array(readFileSync(outcome.path)));
    expect(Object.keys(entries).sort()).toEqual([
      "ALT.txt",
      "README.md",
      "index.png",
      "metadata.json",
    ]);
    expect(strFromU8(entries["ALT.txt"]!)).toBe("Les primes montent\n");
    const readme = strFromU8(entries["README.md"]!);
    // French, because the request's metadata.lang is "fr" — these three assertions used to
    // name the English strings and were the record of registry A25. The language table itself
    // is exercised in zip-lang.test.ts; here it only has to be the newsroom's.
    expect(readme).toContain("champ image");
    expect(readme).toContain("ALT.txt");
    expect(readme).not.toContain("<iframe");
    expect(readme).not.toContain("Déposez `index.png` là où");
  });

  it("should name the video field for a video", async () => {
    const req = { ...staticRequest(), format: "video" as const };
    const r = await zipPublisher.publish(req);
    expect(r.ok).toBe(true);
    const entries = unzipSync(
      new Uint8Array(
        readFileSync((r as { value: { path: string } }).value.path),
      ),
    );
    expect(Object.keys(entries)).toContain("index.mp4");
    expect(strFromU8(entries["README.md"]!)).toContain("champ vidéo");
  });

  it("should leave the embed genre's archive byte-identical", async () => {
    const a = await zipPublisher.publish(request());
    const first = readFileSync((a as { value: { path: string } }).value.path);
    const b = await zipPublisher.publish(request());
    const second = readFileSync((b as { value: { path: string } }).value.path);
    expect(Buffer.from(first).equals(Buffer.from(second))).toBe(true);
    const entries = unzipSync(new Uint8Array(first));
    expect(Object.keys(entries).sort()).toEqual([
      "EMBED.txt",
      "README.md",
      "index.html",
      "metadata.json",
    ]);
  });
});

describe("the zip publisher", () => {
  // lib/loop/deliver.ts puts the newsroom's snippetTemplate in `settings` for EVERY publisher,
  // and only the cloudflare adapter read it: a newsroom whose CMS strips iframes configured a
  // template, asked for a portable package, and found an <iframe> in EMBED.txt anyway. Spec
  // §3.3: EMBED.txt is the snippet rendered from the profile's template.
  it("should render EMBED.txt from the newsroom's own template when one is configured", async () => {
    const r = await zipPublisher.publish({
      ...request(),
      settings: {
        publisherId: "zip",
        snippetTemplate:
          '<div data-splash="{id}" data-src="{url}">{title}</div>',
      },
    });
    expect(r.ok).toBe(true);
    const zipPath = (r as { value: { path: string } }).value.path;
    const embed = strFromU8(
      unzipSync(readFileSync(zipPath))["EMBED.txt"] as Uint8Array,
    );
    expect(embed.trim()).toBe(
      '<div data-splash="primes" data-src="YOUR-URL-HERE">Primes cantonales</div>',
    );
    expect(embed).not.toContain("<iframe");
    // The same snippet is what the README tells the newsroom to paste, and what the outcome
    // carries back to the manifest — one rendering, not three.
    const readme = strFromU8(
      unzipSync(readFileSync(zipPath))["README.md"] as Uint8Array,
    );
    expect(readme).toContain('<div data-splash="primes"');
  });

  it("should write an archive holding exactly the four documented entries", async () => {
    const r = await zipPublisher.publish(request());
    expect(r.ok).toBe(true);
    const zipPath = (r as { value: { path: string } }).value.path;
    const entries = Object.keys(unzipSync(readFileSync(zipPath))).sort();
    expect(entries).toEqual([
      "EMBED.txt",
      "README.md",
      "index.html",
      "metadata.json",
    ]);
  });

  // Regression: before PublishRequest carried `format`, every artifact was archived as
  // "index.html" regardless of what it actually was — a static PNG served (and named) as HTML.
  it("should archive a static artifact as index.png, not index.html", async () => {
    const artifact = join(root, "chart.png");
    writeFileSync(artifact, "not-real-png-bytes");
    const outDir = join(root, "out");
    mkdirSync(outDir, { recursive: true });
    const r = await zipPublisher.publish({
      ...request(),
      artifactPath: artifact,
      format: "static",
    });
    expect(r.ok).toBe(true);
    const zipPath = (r as { value: { path: string } }).value.path;
    const entries = Object.keys(unzipSync(readFileSync(zipPath))).sort();
    expect(entries).toContain("index.png");
    expect(entries).not.toContain("index.html");
  });

  it("should keep archiving an interactive artifact as index.html", async () => {
    const r = await zipPublisher.publish({
      ...request(),
      format: "interactive",
    });
    expect(r.ok).toBe(true);
    const zipPath = (r as { value: { path: string } }).value.path;
    const entries = Object.keys(unzipSync(readFileSync(zipPath))).sort();
    expect(entries).toContain("index.html");
  });

  it("should produce byte-identical archives across two runs", async () => {
    const a = await zipPublisher.publish(request());
    const b = await zipPublisher.publish(request());
    const digest = (r: unknown) =>
      Buffer.from(
        sha256(readFileSync((r as { value: { path: string } }).value.path)),
      ).toString("hex");
    expect(digest(a)).toEqual(digest(b));
  });

  // The in-process determinism test above cannot catch a byte encoding that depends on the
  // host's local-time getters — both publishes there share one process, one TZ. This one runs
  // the SAME publish in three real subprocesses, each pinned to a different TZ (a positive
  // offset, a negative one, and the +14 extreme), and compares the resulting archive bytes.
  // Regression target: fflate's DOS-time encoder reads local-time getters off whatever Date
  // FIXED_MTIME is; a UTC-instant-derived Date (`Date.UTC(...)`) yields different local
  // components — and therefore different encoded bytes — per timezone.
  it("should produce byte-identical archives across different host timezones (real subprocess)", () => {
    const zipModulePath = new URL("./zip.ts", import.meta.url).pathname;
    const script = `
      import { zipPublisher } from ${JSON.stringify(zipModulePath)};
      import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
      import { join } from "node:path";
      import { tmpdir } from "node:os";
      import { sha256 } from "@noble/hashes/sha2.js";

      const root = mkdtempSync(join(tmpdir(), "splash-zip-tz-"));
      const artifact = join(root, "interactive.html");
      writeFileSync(artifact, "<html><body>chart</body></html>");
      const outDir = join(root, "out");
      mkdirSync(outDir, { recursive: true });
      const r = await zipPublisher.publish({
        artifactPath: artifact,
        id: "primes",
        format: "interactive",
        metadata: {
          title: "Primes cantonales",
          altText: "Les primes montent",
          source: "OFSP",
          credit: "Heidi.news",
          lang: "fr",
          width: 700,
          height: 420,
        },
        settings: { publisherId: "zip" },
        credentials: {},
        outDir,
      });
      if (!r.ok) {
        console.error(JSON.stringify(r));
        process.exit(1);
      }
      process.stdout.write(Buffer.from(sha256(readFileSync(r.value.path))).toString("hex"));
    `;

    const digestUnderTz = (tz: string) =>
      execFileSync("bun", ["-e", script], {
        env: { ...process.env, TZ: tz },
        encoding: "utf8",
      }).trim();

    const utc = digestUnderTz("UTC");
    const mexicoCity = digestUnderTz("America/Mexico_City"); // UTC-6
    const kiritimati = digestUnderTz("Pacific/Kiritimati"); // UTC+14, the extreme

    expect(mexicoCity).toEqual(utc);
    expect(kiritimati).toEqual(utc);
  });

  it("should carry the alt text into metadata.json", async () => {
    const r = await zipPublisher.publish(request());
    const zipPath = (r as { value: { path: string } }).value.path;
    const meta = JSON.parse(
      strFromU8(unzipSync(readFileSync(zipPath))["metadata.json"]!),
    );
    expect(meta.altText).toBe("Les primes montent");
    expect(meta.id).toBe("primes");
  });

  it("should refuse an artifact path that does not exist, without writing an archive", async () => {
    const req = request();
    const r = await zipPublisher.publish({
      ...req,
      artifactPath: join(root, "absent.html"),
    });
    expect(r).toMatchObject({ ok: false, code: "engine-failed" });
    expect(existsSync(join(req.outDir, "primes.zip"))).toBe(false);
  });

  it("should report kind package with no url", async () => {
    const r = await zipPublisher.publish(request());
    expect(r).toMatchObject({
      ok: true,
      value: { publisherId: "zip", kind: "package", url: undefined },
    });
  });

  it("should refuse an id carrying a path traversal segment, without writing an archive", async () => {
    const req = request();
    const r = await zipPublisher.publish({ ...req, id: "../../evil" });
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect(existsSync(join(root, "..", "..", "evil.zip"))).toBe(false);
  });
});
