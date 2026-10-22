import { describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hasSession, type SessionKey, sessionDir } from "../src/sessions.ts";

const key = (over: Partial<SessionKey> = {}): SessionKey => ({
  story: "demo",
  owner: "persona:designer",
  slot: "1",
  attempt: 1,
  ...over,
});

describe("session keys", () => {
  it("should place a session under its story, owner, slot and attempt", () => {
    expect(sessionDir("/run", key())).toBe(
      "/run/.splash-harness/sessions/demo/persona-designer/1-1",
    );
  });

  it("should give the designer's review of slot 2 a different session from slot 1", () => {
    expect(sessionDir("/run", key({ slot: "2" }))).not.toBe(
      sessionDir("/run", key()),
    );
  });

  it("should give a routed-back revision a fresh attempt directory", () => {
    const first = sessionDir(
      "/run",
      key({ owner: "skill:chart-beat", attempt: 1 }),
    );
    const second = sessionDir(
      "/run",
      key({ owner: "skill:chart-beat", attempt: 2 }),
    );
    expect(second).not.toBe(first);
  });

  it("should report a session only once a session file exists in its directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "splash-sessions-"));
    expect(hasSession(root, key())).toBe(false);
    await mkdir(sessionDir(root, key()), { recursive: true });
    expect(hasSession(root, key())).toBe(false);
    await writeFile(join(sessionDir(root, key()), "s.jsonl"), "{}\n");
    expect(hasSession(root, key())).toBe(true);
  });
});
