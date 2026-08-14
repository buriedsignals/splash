import { afterEach, describe, expect, test } from "bun:test";
import { lstat, mkdtemp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { enrolEngine } from "../enrol-engine.mjs";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function fixture({ createStories = true } = {}) {
  const root = await realpath(await mkdtemp(join(tmpdir(), "splash,enrol-")));
  roots.push(root);
  const storiesRoot = join(root, "external-stories");
  if (createStories) await mkdir(storiesRoot);
  const bsig = join(root, "bsig");
  await writeFile(bsig, "fixture\n", { mode: 0o755 });
  return { root, storiesRoot, bsig };
}

describe("development Engine adoption", () => {
  test("the shell wrapper leaves skill mutation inside Engine apply", async () => {
    const script = await readFile(join(import.meta.dirname, "../install.sh"), "utf8");
    expect(script).toContain("--skill-namespace");
    expect(script).not.toMatch(/^\s*bun .*place-skills\.mjs/m);
    expect(script).not.toMatch(/^\s*mkdir -p "\$STORIES_ROOT"/m);
    expect(script).toContain(
      "unset BUN_OPTIONS BUN_INSPECT_PRELOAD BUN_INSPECT_NOTIFY NODE_OPTIONS NODE_PATH",
    );
    expect(script).not.toContain("BUN_INSPECT_PRELOAD=");
  });

  test("leaves creation of a missing stories root to Engine apply", async () => {
    const { root, storiesRoot, bsig } = await fixture({ createStories: false });
    const runCommand = async (command: string[]) => {
      if (command.includes("adopt"))
        return {
          exitCode: 0,
          stderr: "",
          stdout: `${JSON.stringify({ event: "result", data: { product: "splash", verb: "adopt", plan_path: join(root, "plan.json") } })}\n`,
        };
      return {
        exitCode: 0,
        stderr: "",
        stdout: `${JSON.stringify({ event: "result", data: { product: "splash", steps: [
          { id: "smoke-splash-no-value-operation", outcome: "executed" },
          { id: "project-splash-skills", outcome: "executed" },
        ] } })}\n`,
      };
    };
    const result = await enrolEngine({ root, storiesRoot, bsig, runCommand });
    expect(result.storiesRoot).toBe(storiesRoot);
    await expect(lstat(storiesRoot)).rejects.toMatchObject({ code: "ENOENT" });
  });

  test("plans and applies a transaction containing the pre-activation smoke", async () => {
    const { root, storiesRoot, bsig } = await fixture();
    const calls: Array<{ command: string[]; stdin?: string }> = [];
    const runCommand = async (
      command: string[],
      options: { stdin?: string } = {},
    ) => {
      calls.push({ command, stdin: options.stdin });
      if (command.includes("adopt"))
        return {
          exitCode: 0,
          stderr: "",
          stdout:
            JSON.stringify({
              event: "result",
              data: {
                product: "splash",
                verb: "adopt",
                plan_path: join(root, "splash-adopt.json"),
              },
            }) + "\n",
        };
      if (command.includes("apply"))
        return {
          exitCode: 0,
          stderr: "",
          stdout:
            JSON.stringify({
              event: "result",
              data: {
                product: "splash",
                steps: [
                  {
                    id: "smoke-splash-no-value-operation",
                    outcome: "executed",
                  },
                  { id: "project-splash-skills", outcome: "executed" },
                ],
              },
            }) + "\n",
        };
      throw new Error("unexpected command");
    };
    const result = await enrolEngine({ root, storiesRoot, bsig, runCommand });
    expect(result.adopted).toBe(true);
    expect(result.sourceMode).toBe("development");
    expect(calls).toHaveLength(2);
    expect(calls[0].command).toContain("--install-path");
    expect(calls[0].command).toContain(root);
    expect(calls[0].command).toContain("--stories-root");
    expect(calls[0].command).toContain(storiesRoot);
    expect(result.storiesRoot).toBe(storiesRoot);
    expect(calls[0].command).toContain("--newsroom-path");
    expect(calls[0].command).toContain(result.newsroomPath);
    expect(
      calls[0].command.some((arg) => arg.startsWith("install_path=")),
    ).toBe(false);
    expect(calls[1].stdin).toBeUndefined();
  });

  test("passes an optional private skill namespace through the same Engine plan", async () => {
    const { root, storiesRoot, bsig } = await fixture();
    const commands: string[][] = [];
    const runCommand = async (command: string[]) => {
      commands.push(command);
      if (command.includes("adopt"))
        return {
          exitCode: 0,
          stderr: "",
          stdout: `${JSON.stringify({ event: "result", data: { product: "splash", verb: "adopt", plan_path: join(root, "plan.json") } })}\n`,
        };
      return {
        exitCode: 0,
        stderr: "",
        stdout: `${JSON.stringify({ event: "result", data: { product: "splash", steps: [
          { id: "smoke-splash-no-value-operation", outcome: "executed" },
          { id: "project-splash-skills", outcome: "skipped" },
        ] } })}\n`,
      };
    };
    const result = await enrolEngine({
      root,
      storiesRoot,
      bsig,
      skillNamespace: "splash",
      runCommand,
    });
    expect(commands[0]).toContain("--skill-namespace");
    expect(commands[0]).toContain("splash");
    expect(result.skillNamespace).toBe("splash");
  });

  test("does not apply when adoption is refused", async () => {
    const { root, storiesRoot, bsig } = await fixture();
    let calls = 0;
    await expect(
      enrolEngine({
        root,
        storiesRoot,
        bsig,
        runCommand: async () => {
          calls++;
          return {
            exitCode: 1,
            stdout: "",
            stderr: "development source refused",
          };
        },
      }),
    ).rejects.toThrow("refused Splash adoption");
    expect(calls).toBe(1);
  });

  test("reports Engine's structured apply failure without reflecting raw output", async () => {
    const { root, storiesRoot, bsig } = await fixture();
    let calls = 0;
    await expect(
      enrolEngine({
        root,
        storiesRoot,
        bsig,
        runCommand: async () => {
          calls++;
          if (calls === 1) {
            return {
              exitCode: 0,
              stderr: "",
              stdout: `${JSON.stringify({ event: "result", data: { product: "splash", verb: "adopt", plan_path: join(root, "plan.json") } })}\n`,
            };
          }
          return {
            exitCode: 1,
            stderr: "",
            stdout: `${JSON.stringify({ event: "error", message: "extension parent is unavailable" })}\nraw candidate detail\n`,
          };
        },
      }),
    ).rejects.toThrow(
      "Engine failed to apply Splash adoption: extension parent is unavailable",
    );
    expect(calls).toBe(2);
  });

  test("requires an already installed Engine without starting a downloader", async () => {
    const { root, storiesRoot } = await fixture();
    await expect(enrolEngine({ root, storiesRoot, bsig: "" })).rejects.toThrow(
      "Engine is required for Splash development setup",
    );
  });
});
