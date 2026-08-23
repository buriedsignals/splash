import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";
import { RECORDABLE_KEYS } from "../scripts/keys.mjs";

const EXAMPLE = new URL("../../../.env.example", import.meta.url);

function names(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z][A-Z0-9_]*)=/)?.[1])
    .filter((name): name is string => Boolean(name));
}

describe("the environment example", () => {
  it("is migration-only while retaining the canonical legacy names", async () => {
    const text = await readFile(EXAMPLE, "utf8");
    expect(text).toContain(
      "Do not copy this file for a new managed installation",
    );
    expect(text).toContain("operating-system");
    expect(names(text)).toEqual([
      "MAPTILER_KEY",
      "MAPTILER_DELIVERY_KEY",
      "DATAWRAPPER_TOKEN",
      "CLOUDFLARE_ACCOUNT_ID",
      "CLOUDFLARE_API_TOKEN",
      "CMS_KIND",
      "CMS_ENDPOINT",
      "CMS_TOKEN",
    ]);
  });

  // THE NAMES `recordKey` ACCEPTS ARE THE NAMES THIS FILE ADVERTISES, checked rather than assumed.
  // Until 2026-08-23 that list was the alias table's own key set, which conflated two facts: which
  // credentials this toolchain reads, and which of them have a second name. Splitting them left
  // `RECORDABLE_KEYS` as a typed list, so it is held to something — the migration reference a
  // journalist actually copies from. Order is not the claim (the example groups Cloudflare's account
  // id before its token); membership is.
  it("advertises exactly the names recordKey will write", async () => {
    const text = await readFile(EXAMPLE, "utf8");
    expect([...names(text)].sort()).toEqual([...RECORDABLE_KEYS].sort());
  });

  it("does not advertise retired Fly.io or alias-only variables", async () => {
    const text = await readFile(EXAMPLE, "utf8");
    for (const retired of [
      "SPLASH_EMBED_APP",
      "FLY_API_TOKEN",
      "VITE_MAPTILER_KEY",
      "REMOTION_MAPTILER_KEY",
      "DATAWRAPPER_API_TOKEN",
    ]) {
      expect(text).not.toContain(`${retired}=`);
    }
  });
});
