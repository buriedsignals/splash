import { describe, it, expect, afterAll } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync, rmSync } from "node:fs";
import {
  createChart,
  setData,
  patchChart,
  publishChart,
  exportPng,
  deleteChart,
} from "../src/datawrapper";

const hasToken = !!process.env.DATAWRAPPER_API_TOKEN;
let createdId = "";

describe("datawrapper client (real API)", () => {
  it("requires the token", () => {
    expect(hasToken).toBe(true); // FAIL LOUD if .env missing — no mock
  });

  it("runs the full create→data→patch→publish→export-png chain", async () => {
    const id = await createChart("atelier client test", "column-chart");
    createdId = id;
    expect(id).toMatch(/^[A-Za-z0-9]{5}$/);
    await setData(id, "year,value\n2021,3\n2022,5\n2023,4\n");
    await patchChart(id, {
      metadata: { visualize: { "base-color": "#0072B2" } },
    });
    const url = await publishChart(id);
    expect(url).toContain("datawrapper");
    const out = join(tmpdir(), `atelier-${id}.png`);
    const bytes = await exportPng(id, out);
    expect(existsSync(out)).toBe(true);
    expect(bytes).toBeGreaterThan(1000);
    rmSync(out, { force: true });
  }, 60000);
});

afterAll(async () => {
  if (createdId) await deleteChart(createdId);
});
