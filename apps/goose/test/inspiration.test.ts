import { describe, it, expect } from "bun:test";
import {
  createInspirationService,
  KEY_STATUS_TIMEOUT_MS,
  OPERATION_TIMEOUT_MS,
} from "../inspiration.mjs";

const BSIG = "/Applications/Indicator Labs.app/Contents/Resources/bsig";
const DIRECT = {
  ok: true,
  query: "floods",
  items: [],
  quota: { limit: 5, remaining: 4, resetsAt: null },
};
const ACCOUNT = {
  ok: true,
  query: "floods",
  items: [],
  quota: { limit: 10, remaining: 9, resetsAt: null },
};

function fakes({ status, run }: { status?: any; run?: any }) {
  const engineCalls: any[] = [];
  const directCalls: any[] = [];
  const invokeEngineFn = async (path, args, stdin, options) => {
    engineCalls.push({ path, args, stdin, options });
    const answer = args[0] === "keys" ? status : run;
    if (answer instanceof Error) throw answer;
    return answer;
  };
  const searchFn = async (options) => {
    directCalls.push(options);
    return DIRECT;
  };
  return { engineCalls, directCalls, invokeEngineFn, searchFn };
}

const stored = (value: boolean) => ({
  exitCode: 0,
  events: [{ event: "result", data: { id: "INFOVIZ_TOKEN", stored: value } }],
});
const ran = (result: any) => ({
  exitCode: 0,
  events: [
    { event: "progress" },
    { event: "result", data: { stdout: `${JSON.stringify(result)}\n` } },
  ],
});

describe("createInspirationService", () => {
  it("should search directly without an Engine path", async () => {
    const f = fakes({});
    const service = createInspirationService({
      bsigPath: undefined,
      invokeEngineFn: f.invokeEngineFn,
      searchFn: f.searchFn,
    });
    expect(await service.search("floods")).toEqual(DIRECT);
    expect(f.engineCalls).toEqual([]);
  });

  it("should search directly when no account is stored", async () => {
    const f = fakes({ status: stored(false) });
    const service = createInspirationService({
      bsigPath: BSIG,
      invokeEngineFn: f.invokeEngineFn,
      searchFn: f.searchFn,
    });
    expect(await service.search("floods")).toEqual(DIRECT);
    expect(f.engineCalls.map((c) => c.args)).toEqual([
      ["keys", "status", "INFOVIZ_TOKEN"],
    ]);
  });

  it("should search directly when Engine does not know the credential", async () => {
    const f = fakes({
      status: {
        exitCode: 1,
        events: [{ event: "error", message: "unknown key id" }],
      },
    });
    const service = createInspirationService({
      bsigPath: BSIG,
      invokeEngineFn: f.invokeEngineFn,
      searchFn: f.searchFn,
    });
    expect(await service.search("floods")).toEqual(DIRECT);
  });

  it("should search directly when the status check throws", async () => {
    const f = fakes({
      status: new Error("Engine executable is not a real executable file"),
    });
    const service = createInspirationService({
      bsigPath: BSIG,
      invokeEngineFn: f.invokeEngineFn,
      searchFn: f.searchFn,
    });
    expect(await service.search("floods")).toEqual(DIRECT);
  });

  it("should run the Engine operation with the trimmed subject when an account is stored", async () => {
    const f = fakes({ status: stored(true), run: ran(ACCOUNT) });
    const service = createInspirationService({
      bsigPath: BSIG,
      invokeEngineFn: f.invokeEngineFn,
      searchFn: f.searchFn,
    });
    const result = await service.search('  floods "in" $HOME\nand `rain`  ');
    expect(result).toEqual(ACCOUNT);
    expect(f.directCalls).toEqual([]);
    expect(f.engineCalls[1].path).toBe(BSIG);
    expect(f.engineCalls[1].args).toEqual([
      "run",
      "splash",
      "inspiration-search",
    ]);
    expect(JSON.parse(f.engineCalls[1].stdin)).toEqual({
      parameters: { query: 'floods "in" $HOME\nand `rain`' },
    });
  });

  it("should report a failed run without a second search", async () => {
    const f = fakes({
      status: stored(true),
      run: {
        exitCode: 1,
        events: [
          {
            event: "error",
            message: "splash operation inspiration-search exited with code 1",
          },
        ],
      },
    });
    const service = createInspirationService({
      bsigPath: BSIG,
      invokeEngineFn: f.invokeEngineFn,
      searchFn: f.searchFn,
    });
    expect(await service.search("floods")).toEqual({
      ok: false,
      reason: "engine-failed",
      detail: "splash operation inspiration-search exited with code 1",
    });
    expect(f.directCalls).toEqual([]);
  });

  it("should report a run that throws without a second search", async () => {
    const f = fakes({
      status: stored(true),
      run: new Error("Engine credential operation timed out"),
    });
    const service = createInspirationService({
      bsigPath: BSIG,
      invokeEngineFn: f.invokeEngineFn,
      searchFn: f.searchFn,
    });
    const result = await service.search("floods");
    expect(result.reason).toBe("engine-failed");
    expect(f.directCalls).toEqual([]);
  });

  it("should report unreadable run output without a second search", async () => {
    const f = fakes({
      status: stored(true),
      run: {
        exitCode: 0,
        events: [{ event: "result", data: { stdout: "not json" } }],
      },
    });
    const service = createInspirationService({
      bsigPath: BSIG,
      invokeEngineFn: f.invokeEngineFn,
      searchFn: f.searchFn,
    });
    expect((await service.search("floods")).reason).toBe("engine-failed");
    expect(f.directCalls).toEqual([]);
  });

  it("should let the direct search refuse an empty subject without asking Engine", async () => {
    const f = fakes({ status: stored(true) });
    const service = createInspirationService({
      bsigPath: BSIG,
      invokeEngineFn: f.invokeEngineFn,
      searchFn: f.searchFn,
    });
    await service.search("   ");
    expect(f.engineCalls).toEqual([]);
    expect(f.directCalls).toEqual([{ query: "   " }]);
  });

  it("should keep the status check and the run within a client's patience", async () => {
    const f = fakes({ status: stored(true), run: ran(ACCOUNT) });
    const service = createInspirationService({
      bsigPath: BSIG,
      invokeEngineFn: f.invokeEngineFn,
      searchFn: f.searchFn,
    });
    await service.search("floods");
    expect(f.engineCalls[0].options).toEqual({
      timeoutMs: KEY_STATUS_TIMEOUT_MS,
    });
    expect(f.engineCalls[1].options).toEqual({
      timeoutMs: OPERATION_TIMEOUT_MS,
    });
  });

  it("should report a well-formed-but-empty run result as unreadable without a second search", async () => {
    const f = fakes({
      status: stored(true),
      run: {
        exitCode: 0,
        events: [{ event: "result", data: { stdout: '{"ok":true}\n' } }],
      },
    });
    const service = createInspirationService({
      bsigPath: BSIG,
      invokeEngineFn: f.invokeEngineFn,
      searchFn: f.searchFn,
    });
    expect((await service.search("floods")).reason).toBe("engine-failed");
    expect(f.directCalls).toEqual([]);
  });

  it("should format with the skill's own words", async () => {
    const f = fakes({});
    const service = createInspirationService({
      bsigPath: undefined,
      invokeEngineFn: f.invokeEngineFn,
      searchFn: f.searchFn,
    });
    expect(service.format(DIRECT)).toBe(
      "Nothing in the gallery for “floods”.\n\n4 of 5 searches left today.",
    );
  });
});
