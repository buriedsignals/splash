import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";

const EXAMPLE = new URL("../../../.env.example", import.meta.url);

function names(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z][A-Z0-9_]*)=/)?.[1])
    .filter((name): name is string => Boolean(name));
}

describe("the environment example", () => {
  it("documents the canonical names accepted by the installer", async () => {
    expect(names(await readFile(EXAMPLE, "utf8"))).toEqual([
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
