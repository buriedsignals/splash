import { afterEach, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { produceSealed } from "../scripts/sealed-produce.mjs";

const roots: string[] = [];

afterEach(async () => {
  delete process.env.DATAWRAPPER_TOKEN;
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

test("sealed Datawrapper production reads the canonical spec.json and injects only the broker token", async () => {
  const storiesRoot = await mkdtemp(
    join(tmpdir(), "splash-sealed-datawrapper-"),
  );
  roots.push(storiesRoot);
  const beat = join(storiesRoot, "story", "beats", "chart");
  await mkdir(beat, { recursive: true });
  await writeFile(
    join(beat, "spec.json"),
    `${JSON.stringify({ takeaway: "Fixture", format: "web" })}\n`,
  );
  process.env.DATAWRAPPER_TOKEN = "broker-datawrapper-canary";
  let observed: any = null;

  const result = await produceSealed(
    {
      storiesRoot,
      storyId: "story",
      outputId: "chart",
      format: "static",
      size: "landscape",
    },
    {
      produceFn: async (spec, options) => {
        observed = { spec, options };
        return { format: "static", chartId: "chart-id" };
      },
    },
  );

  expect(observed.spec).toEqual({ takeaway: "Fixture", format: "static" });
  expect(observed.options).toMatchObject({
    storiesRoot,
    storyId: "story",
    outputId: "chart",
    size: "landscape",
    token: "broker-datawrapper-canary",
  });
  expect(result).toEqual({ format: "static", chartId: "chart-id" });
});

test("sealed Datawrapper production rejects extra request fields before production", async () => {
  let called = false;
  await expect(
    produceSealed(
      {
        storiesRoot: "/tmp/stories",
        storyId: "story",
        outputId: "chart",
        format: "static",
        size: "landscape",
        token: "caller-token",
      },
      {
        produceFn: async () => {
          called = true;
        },
      },
    ),
  ).rejects.toThrow("closed contract");
  expect(called).toBe(false);
});
