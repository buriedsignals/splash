import { expect, test } from "bun:test";
import { pickStoryFolder } from "../studio/folder-picker.mjs";

test("folder picker uses a fixed native command without credential environment", async () => {
  let invocation: any;
  const result = await pickStoryFolder({ platform: "darwin", which: () => "/usr/bin/osascript", env: { HOME: "/home/example", PATH: "/usr/bin", DATAWRAPPER_TOKEN: "fake-secret" }, spawn: (args: any, options: any) => {
    invocation = { args, options };
    return { stdout: new Response("/stories/My story/\n").body, exited: Promise.resolve(0), kill() {} };
  } });
  expect(result).toEqual({ status: "selected", path: "/stories/My story/" });
  expect(invocation.args).toHaveLength(3);
  expect(invocation.args[2]).toContain("choose folder");
  expect(JSON.stringify(invocation)).not.toContain("fake-secret");
});

test("cancelling the native dialog returns no path", async () => {
  const result = await pickStoryFolder({ platform: "darwin", which: () => "/usr/bin/osascript", spawn: () => ({ stdout: new Response("").body, exited: Promise.resolve(1), kill() {} }) });
  expect(result).toEqual({ status: "cancelled" });
});

test("hosts without a folder-dialog utility retain the typed-path route", async () => {
  expect(await pickStoryFolder({ platform: "linux", which: () => null })).toEqual({ status: "unavailable" });
});
