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
  it("is migration-only while retaining the canonical legacy names", async () => {
    const text = await readFile(EXAMPLE, "utf8");
    expect(text).toContain("New installations use Engine's operating-system credential broker");
    expect(text).toContain("Retain a legacy .env only long enough");
    expect(text).toContain("never reads or");
    expect(text).toContain("accepts values");
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
