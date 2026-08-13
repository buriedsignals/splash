import { describe, it, expect } from "bun:test";
import {
  createChart,
  setChartData,
  patchMetadata,
  publishChart,
  exportChartPng,
  getChart,
} from "../scripts/dw-client.mjs";

describe("createChart", () => {
  it("should POST to /v3/charts with the bearer token and the chart body", async () => {
    let capturedUrl;
    let capturedInit;
    const fetchFn = async (url, init) => {
      capturedUrl = String(url);
      capturedInit = init;
      return new Response(JSON.stringify({ id: "aBcDe" }), { status: 200 });
    };
    const result = await createChart(
      { title: "T", type: "d3-lines", language: "en-US" },
      "secret-token",
      fetchFn,
    );
    expect(capturedUrl).toBe("https://api.datawrapper.de/v3/charts");
    expect(capturedInit.method).toBe("POST");
    expect(capturedInit.headers.Authorization).toBe("Bearer secret-token");
    expect(JSON.parse(capturedInit.body)).toEqual({
      title: "T",
      type: "d3-lines",
      language: "en-US",
    });
    expect(result.id).toBe("aBcDe");
  });

  it("should throw with the status and body on a non-2xx response, never swallow it", async () => {
    const fetchFn = async () => new Response("bad title", { status: 400 });
    await expect(
      createChart(
        { title: "", type: "d3-lines", language: "en-US" },
        "t",
        fetchFn,
      ),
    ).rejects.toThrow(/400/);
  });
});

describe("setChartData", () => {
  it("should PUT the CSV body with a text/csv content type", async () => {
    let capturedInit;
    let capturedUrl;
    const fetchFn = async (url, init) => {
      capturedUrl = String(url);
      capturedInit = init;
      return new Response(null, { status: 204 });
    };
    await setChartData("aBcDe", "a,b\n1,2", "token", fetchFn);
    expect(capturedUrl).toBe("https://api.datawrapper.de/v3/charts/aBcDe/data");
    expect(capturedInit.method).toBe("PUT");
    expect(capturedInit.headers["Content-Type"]).toBe("text/csv");
    expect(capturedInit.body).toBe("a,b\n1,2");
  });

  it("should throw on a failed upload", async () => {
    const fetchFn = async () => new Response("nope", { status: 422 });
    await expect(
      setChartData("aBcDe", "a,b", "token", fetchFn),
    ).rejects.toThrow(/422/);
  });

  it("should reject a chart ID that could escape or select another API path", async () => {
    let called = false;
    await expect(
      setChartData("../me", "a,b", "token", async () => {
        called = true;
        return new Response(null, { status: 204 });
      }),
    ).rejects.toThrow(/one provider ID segment/);
    expect(called).toBe(false);
  });
});

describe("patchMetadata", () => {
  it("should PATCH the chart with the metadata wrapped in { metadata }", async () => {
    let capturedInit;
    const fetchFn = async (_url, init) => {
      capturedInit = init;
      return new Response(JSON.stringify({ id: "aBcDe" }), { status: 200 });
    };
    await patchMetadata(
      "aBcDe",
      { describe: { intro: "x" } },
      "token",
      fetchFn,
    );
    expect(capturedInit.method).toBe("PATCH");
    expect(JSON.parse(capturedInit.body)).toEqual({
      metadata: { describe: { intro: "x" } },
    });
  });
});

describe("publishChart", () => {
  it("should POST to /publish and return the public URL", async () => {
    let capturedUrl;
    const fetchFn = async (url) => {
      capturedUrl = String(url);
      return new Response(
        JSON.stringify({ publicUrl: "//datawrapper.dwcdn.net/aBcDe/1/" }),
        { status: 200 },
      );
    };
    const result = await publishChart("aBcDe", "token", fetchFn);
    expect(capturedUrl).toBe(
      "https://api.datawrapper.de/v3/charts/aBcDe/publish",
    );
    expect(result.publicUrl).toBe("//datawrapper.dwcdn.net/aBcDe/1/");
  });
});

describe("exportChartPng", () => {
  it("should GET the export endpoint and return the raw bytes", async () => {
    let capturedUrl;
    const bytes = new Uint8Array([137, 80, 78, 71]);
    const fetchFn = async (url) => {
      capturedUrl = String(url);
      return new Response(bytes, { status: 200 });
    };
    const result = await exportChartPng("aBcDe", "token", fetchFn);
    expect(capturedUrl).toContain(
      "https://api.datawrapper.de/v3/charts/aBcDe/export/png?",
    );
    expect(capturedUrl).toContain("unit=px");
    expect(Array.from(result)).toEqual([137, 80, 78, 71]);
  });

  it("should include an explicit height in the query when given", async () => {
    let capturedUrl;
    const fetchFn = async (url) => {
      capturedUrl = String(url);
      return new Response(new Uint8Array(), { status: 200 });
    };
    await exportChartPng("aBcDe", "token", fetchFn, { height: 500 });
    expect(capturedUrl).toContain("height=500");
  });
});

describe("getChart", () => {
  it("should GET the chart by id", async () => {
    let capturedUrl;
    const fetchFn = async (url) => {
      capturedUrl = String(url);
      return new Response(JSON.stringify({ id: "aBcDe" }), { status: 200 });
    };
    const result = await getChart("aBcDe", "token", fetchFn);
    expect(capturedUrl).toBe("https://api.datawrapper.de/v3/charts/aBcDe");
    expect(result.id).toBe("aBcDe");
  });
});

describe("request deadlines", () => {
  it("should time out a request even when fetch ignores the abort signal", async () => {
    let signal;
    const fetchFn = (_url, init) => {
      signal = init.signal;
      return new Promise(() => {});
    };
    await expect(
      createChart(
        { title: "T", type: "d3-lines", language: "en" },
        "token",
        fetchFn,
        { timeoutMs: 20 },
      ),
    ).rejects.toThrow(/request timed out after 20ms/);
    expect(signal.aborted).toBe(true);
  });

  it("should time out a stalled successful JSON body", async () => {
    const fetchFn = async () => ({
      ok: true,
      status: 200,
      json: () => new Promise(() => {}),
    });
    await expect(
      getChart("aBcDe", "token", fetchFn, { timeoutMs: 20 }),
    ).rejects.toThrow(/response body timed out after 20ms/);
  });

  it("should time out a stalled PNG body", async () => {
    const fetchFn = async () => ({
      ok: true,
      status: 200,
      arrayBuffer: () => new Promise(() => {}),
    });
    await expect(
      exportChartPng("aBcDe", "token", fetchFn, { timeoutMs: 20 }),
    ).rejects.toThrow(/response body timed out after 20ms/);
  });
});

describe("against the real Datawrapper API", () => {
  const token = process.env.DATAWRAPPER_TOKEN ?? "";
  if (!token) {
    console.log(
      "Skipping real Datawrapper round-trip: DATAWRAPPER_TOKEN is not set in the environment.",
    );
  }

  it.skipIf(!token)(
    "should create, set data on, patch, publish and export a real chart",
    async () => {
      const chart = await createChart(
        {
          title: "dw-beat client test",
          type: "d3-lines",
          language: "en-US",
        },
        token,
        fetch,
      );
      expect(chart.id).toBeTruthy();
      await setChartData(chart.id, "year,value\n2000,1\n2010,9", token, fetch);
      await patchMetadata(
        chart.id,
        { describe: { intro: "test" } },
        token,
        fetch,
      );
      const published = await publishChart(chart.id, token, fetch);
      expect(published.publicUrl ?? published.data?.publicUrl).toBeTruthy();
      const png = await exportChartPng(chart.id, token, fetch, {
        width: 400,
        height: 300,
      });
      expect(png.length).toBeGreaterThan(0);
    },
    30000,
  );
});
