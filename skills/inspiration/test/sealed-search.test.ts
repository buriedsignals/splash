import { describe, it, expect } from "bun:test";
import { encodeSealedResult, sealedSearch } from "../scripts/sealed-search.mjs";

const LIST = {
  ok: true,
  query: "floods",
  items: [],
  quota: { limit: 10, remaining: 9, resetsAt: null },
};
const ANON = {
  ok: true,
  query: "floods",
  items: [],
  quota: { limit: 5, remaining: 4, resetsAt: null },
};

function recorder(answers) {
  const calls: any[] = [];
  const searchFn = async (options) => {
    calls.push(options);
    return answers[calls.length - 1];
  };
  return { calls, searchFn };
}

describe("sealedSearch", () => {
  it("should search once with the token Engine injected", async () => {
    const { calls, searchFn } = recorder([LIST]);
    const result = await sealedSearch(
      { query: "floods" },
      { searchFn, env: { INFOVIZ_TOKEN: "tok-123" } },
    );
    expect(result).toEqual(LIST);
    expect(calls).toEqual([{ query: "floods", token: "tok-123" }]);
  });

  it("should run exactly one anonymous search when the token is refused, and say so", async () => {
    const { calls, searchFn } = recorder([
      { ok: false, reason: "invalid-token" },
      ANON,
    ]);
    const result = await sealedSearch(
      { query: "floods" },
      { searchFn, env: { INFOVIZ_TOKEN: "expired" } },
    );
    expect(result).toEqual({ ...ANON, accountNeedsReconnect: true });
    expect(calls).toEqual([
      { query: "floods", token: "expired" },
      { query: "floods" },
    ]);
  });

  it("should not search again for any other failure", async () => {
    const limit = {
      ok: false,
      reason: "limit-reached",
      query: "floods",
      quota: { limit: 10, remaining: 0, resetsAt: null },
    };
    const { calls, searchFn } = recorder([limit]);
    expect(
      await sealedSearch(
        { query: "floods" },
        { searchFn, env: { INFOVIZ_TOKEN: "tok" } },
      ),
    ).toEqual(limit);
    expect(calls).toHaveLength(1);
  });

  it("should refuse a request with any field other than query", async () => {
    const { searchFn } = recorder([LIST]);
    await expect(
      sealedSearch({ query: "floods", token: "x" }, { searchFn, env: {} }),
    ).rejects.toThrow(/closed contract/);
  });
});

describe("encodeSealedResult", () => {
  it("should decode back to the exact result", () => {
    const result = {
      ok: true,
      query: "floods",
      items: [
        {
          title: "flood-risk-map-england",
          url: "https://example.org/inundation_forecast_2024",
        },
      ],
      quota: { limit: 10, remaining: 9, resetsAt: null },
    };
    const decoded = JSON.parse(
      Buffer.from(encodeSealedResult(result), "base64").toString("utf8"),
    );
    expect(decoded).toEqual(result);
  });

  it("should never contain an underscore or a hyphen", () => {
    const result = {
      ok: true,
      query: "floods",
      items: [
        {
          title: "flood-risk-map-england",
          url: "https://example.org/inundation_forecast_2024",
        },
      ],
      quota: { limit: 10, remaining: 9, resetsAt: null },
    };
    const encoded = encodeSealedResult(result);
    expect(encoded).not.toContain("_");
    expect(encoded).not.toContain("-");
  });
});
