import { describe, it, expect, beforeEach, afterEach } from "bun:test";
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

describe("the zip publisher", () => {
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

  it("should produce byte-identical archives across two runs", async () => {
    const a = await zipPublisher.publish(request());
    const b = await zipPublisher.publish(request());
    const digest = (r: unknown) =>
      Buffer.from(
        sha256(readFileSync((r as { value: { path: string } }).value.path)),
      ).toString("hex");
    expect(digest(a)).toEqual(digest(b));
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
