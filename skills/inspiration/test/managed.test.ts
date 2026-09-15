import { describe, it, expect } from "bun:test";
import {
  searchWithAccount,
  KEY_STATUS_TIMEOUT_MS,
  OPERATION_TIMEOUT_MS,
} from "../scripts/managed.mjs";

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
  const runEngineFn = async (path, args, stdin, options) => {
    engineCalls.push({ path, args, stdin, options });
    const answer = args[0] === "keys" ? status : run;
    if (answer instanceof Error) throw answer;
    return answer;
  };
  const searchFn = async (options) => {
    directCalls.push(options);
    return DIRECT;
  };
  return { engineCalls, directCalls, runEngineFn, searchFn };
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

describe("searchWithAccount", () => {
  it("should search directly when Splash is not under Engine", async () => {
    const f = fakes({});
    expect(
      await searchWithAccount({
        query: "floods",
        env: {},
        runEngineFn: f.runEngineFn,
        searchFn: f.searchFn,
      }),
    ).toEqual(DIRECT);
    expect(f.engineCalls).toEqual([]);
    expect(f.directCalls).toEqual([{ query: "floods" }]);
  });

  it("should search directly when no account is stored", async () => {
    const f = fakes({ status: stored(false) });
    expect(
      await searchWithAccount({
        query: "floods",
        env: { SPLASH_BSIG_PATH: BSIG },
        runEngineFn: f.runEngineFn,
        searchFn: f.searchFn,
      }),
    ).toEqual(DIRECT);
    expect(f.engineCalls.map((c) => c.args)).toEqual([
      ["keys", "status", "INFOVIZ_TOKEN"],
    ]);
  });

  it("should search directly when Engine does not know the credential", async () => {
    const f = fakes({
      status: {
        exitCode: 1,
        events: [{ event: "error", message: "unknown key" }],
      },
    });
    expect(
      await searchWithAccount({
        query: "floods",
        env: { SPLASH_BSIG_PATH: BSIG },
        runEngineFn: f.runEngineFn,
        searchFn: f.searchFn,
      }),
    ).toEqual(DIRECT);
  });

  it("should search directly when the status check itself fails", async () => {
    const f = fakes({ status: new Error("Engine timed out") });
    expect(
      await searchWithAccount({
        query: "floods",
        env: { SPLASH_BSIG_PATH: BSIG },
        runEngineFn: f.runEngineFn,
        searchFn: f.searchFn,
      }),
    ).toEqual(DIRECT);
  });

  it("should run the Engine operation with the query JSON-encoded when an account is stored", async () => {
    const subject = 'floods "in" $HOME\nand `rain`';
    const f = fakes({
      status: stored(true),
      run: ran({ ...ACCOUNT, query: subject }),
    });
    const result = await searchWithAccount({
      query: subject,
      env: { SPLASH_BSIG_PATH: BSIG },
      runEngineFn: f.runEngineFn,
      searchFn: f.searchFn,
    });
    expect(result.quota.limit).toBe(10);
    expect(f.directCalls).toEqual([]);
    expect(f.engineCalls[0].options).toEqual({
      timeoutMs: KEY_STATUS_TIMEOUT_MS,
    });
    expect(f.engineCalls[1].path).toBe(BSIG);
    expect(f.engineCalls[1].args).toEqual([
      "run",
      "splash",
      "inspiration-search",
    ]);
    expect(JSON.parse(f.engineCalls[1].stdin)).toEqual({
      parameters: { query: subject },
    });
    expect(f.engineCalls[1].options).toEqual({
      timeoutMs: OPERATION_TIMEOUT_MS,
    });
  });

  it("should report an Engine failure after the operation started, without a second search", async () => {
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
    const result = await searchWithAccount({
      query: "floods",
      env: { SPLASH_BSIG_PATH: BSIG },
      runEngineFn: f.runEngineFn,
      searchFn: f.searchFn,
    });
    expect(result).toEqual({
      ok: false,
      reason: "engine-failed",
      detail: "splash operation inspiration-search exited with code 1",
    });
    expect(f.directCalls).toEqual([]);
  });

  it("should report unreadable operation output as an Engine failure", async () => {
    const f = fakes({
      status: stored(true),
      run: {
        exitCode: 0,
        events: [{ event: "result", data: { stdout: "not json" } }],
      },
    });
    const result = await searchWithAccount({
      query: "floods",
      env: { SPLASH_BSIG_PATH: BSIG },
      runEngineFn: f.runEngineFn,
      searchFn: f.searchFn,
    });
    expect(result.reason).toBe("engine-failed");
    expect(f.directCalls).toEqual([]);
  });

  it("should let the direct search refuse an empty subject without asking Engine anything", async () => {
    const f = fakes({ status: stored(true) });
    await searchWithAccount({
      query: "  ",
      env: { SPLASH_BSIG_PATH: BSIG },
      runEngineFn: f.runEngineFn,
      searchFn: f.searchFn,
    });
    expect(f.engineCalls).toEqual([]);
    expect(f.directCalls).toEqual([{ query: "  " }]);
  });
});
