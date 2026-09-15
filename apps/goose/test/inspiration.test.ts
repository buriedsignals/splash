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

// Engine redacts every emitted NDJSON line with this same pattern before the caller ever sees it —
// simulated here against the whole event line, exactly as Engine would apply it.
const ENGINE_REDACTION = /(?:cj_|on_|sk-|fw_)[A-Za-z0-9_-]{8,}/g;

function encodeSealedResult(result: any): string {
  return Buffer.from(JSON.stringify(result), "utf8").toString("base64");
}

// The sealed entry's real envelope (`{"b64": ...}`), run through Engine's own redaction the way a
// raw result never survives — base64 has no `_`/`-`, so it comes back untouched.
const ran = (result: any) => {
  const stdout = `${JSON.stringify({ b64: encodeSealedResult(result) })}\n`;
  const eventLine = JSON.stringify({ event: "result", data: { stdout } });
  const event = JSON.parse(eventLine.replace(ENGINE_REDACTION, "[redacted]"));
  return { exitCode: 0, events: [{ event: "progress" }, event] };
};

// A run whose stdout is the PLAIN result, unenveloped — what a search would look like without the
// base64 wrapper, and through Engine's redaction as it really runs.
const ranUnenveloped = (result: any) => {
  const stdout = `${JSON.stringify(result)}\n`;
  const eventLine = JSON.stringify({ event: "result", data: { stdout } });
  const event = JSON.parse(eventLine.replace(ENGINE_REDACTION, "[redacted]"));
  return { exitCode: 0, events: [{ event: "progress" }, event] };
};

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
      detail: "Indicator Labs reported an error",
    });
    expect(f.directCalls).toEqual([]);
  });

  it("should say it took too long when the run throws a timeout", async () => {
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
    expect(result).toEqual({
      ok: false,
      reason: "engine-failed",
      detail: "it took too long",
    });
    expect(f.directCalls).toEqual([]);
  });

  it("should say it took too long when Engine reports its own operation timeout", async () => {
    const f = fakes({
      status: stored(true),
      run: {
        exitCode: 1,
        events: [
          {
            event: "error",
            message: 'execpolicy: "splash-operation" exceeded its 45s timeout',
          },
        ],
      },
    });
    const service = createInspirationService({
      bsigPath: BSIG,
      invokeEngineFn: f.invokeEngineFn,
      searchFn: f.searchFn,
    });
    const result = await service.search("floods");
    expect(result).toEqual({
      ok: false,
      reason: "engine-failed",
      detail: "it took too long",
    });
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
    const result = await service.search("floods");
    expect(result).toEqual({
      ok: false,
      reason: "engine-failed",
      detail: "Indicator Labs reported an error",
    });
    expect(f.directCalls).toEqual([]);
  });

  it("should never put Engine's raw remedy text in the result", async () => {
    const f = fakes({
      status: stored(true),
      run: new Error("run `bsig keys set INFOVIZ_TOKEN`, then retry"),
    });
    const service = createInspirationService({
      bsigPath: BSIG,
      invokeEngineFn: f.invokeEngineFn,
      searchFn: f.searchFn,
    });
    const result = await service.search("floods");
    expect(JSON.stringify(result)).not.toContain("bsig keys set INFOVIZ_TOKEN");
    expect(result.detail).toBe("Indicator Labs reported an error");
  });

  it("should decode a redacted, enveloped result exactly, including urls and titles Engine's own redaction would otherwise mangle", async () => {
    const target = {
      ok: true,
      query: "floods",
      items: [
        {
          title: "flood-risk-map-england",
          source: "Reuters Graphics",
          date: "2024-01-01",
          url: "https://example.org/inundation_forecast_2024",
          image: null,
        },
      ],
      quota: { limit: 10, remaining: 9, resetsAt: null },
    };
    const f = fakes({ status: stored(true), run: ran(target) });
    const service = createInspirationService({
      bsigPath: BSIG,
      invokeEngineFn: f.invokeEngineFn,
      searchFn: f.searchFn,
    });
    expect(await service.search("floods")).toEqual(target);
  });

  it("should report a plain, unenveloped run result as unreadable without a second search", async () => {
    const f = fakes({ status: stored(true), run: ranUnenveloped(ACCOUNT) });
    const service = createInspirationService({
      bsigPath: BSIG,
      invokeEngineFn: f.invokeEngineFn,
      searchFn: f.searchFn,
    });
    const result = await service.search("floods");
    expect(result).toEqual({
      ok: false,
      reason: "engine-failed",
      detail: "Indicator Labs reported an error",
    });
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

  it("should search directly, without asking Engine, when the subject is only a next-line character", async () => {
    const f = fakes({ status: stored(true) });
    const service = createInspirationService({
      bsigPath: BSIG,
      invokeEngineFn: f.invokeEngineFn,
      searchFn: f.searchFn,
    });
    const query = "\u0085";
    await service.search(query);
    expect(f.engineCalls).toEqual([]);
    expect(f.directCalls).toEqual([{ query }]);
  });

  it("should search directly, without asking Engine, when the subject contains a NUL", async () => {
    const f = fakes({ status: stored(true) });
    const service = createInspirationService({
      bsigPath: BSIG,
      invokeEngineFn: f.invokeEngineFn,
      searchFn: f.searchFn,
    });
    const query = "flood\u0000maps";
    await service.search(query);
    expect(f.engineCalls).toEqual([]);
    expect(f.directCalls).toEqual([{ query }]);
  });

  it("should strip a trailing next-line character from the subject sent to Engine", async () => {
    const f = fakes({ status: stored(true), run: ran(ACCOUNT) });
    const service = createInspirationService({
      bsigPath: BSIG,
      invokeEngineFn: f.invokeEngineFn,
      searchFn: f.searchFn,
    });
    await service.search("flood maps\u0085");
    expect(JSON.parse(f.engineCalls[1].stdin)).toEqual({
      parameters: { query: "flood maps" },
    });
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
    // An MCP client gives up on a tool call after 60 s; both bounds together leave it 10 s of margin.
    expect(KEY_STATUS_TIMEOUT_MS + OPERATION_TIMEOUT_MS).toBeLessThanOrEqual(
      50_000,
    );
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
    const result = await service.search("floods");
    expect(result).toEqual({
      ok: false,
      reason: "engine-failed",
      detail: "Indicator Labs reported an error",
    });
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
