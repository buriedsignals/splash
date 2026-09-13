import { describe, it, expect } from "bun:test";
import { formatInspiration } from "../scripts/format.mjs";

const QUOTA = { limit: 5, remaining: 4, resetsAt: "2026-09-14T00:00:00+00:00" };

describe("formatInspiration", () => {
  it("should number each visual with its link, newsroom and date, then the quota left", () => {
    const text = formatInspiration({
      ok: true,
      query: "floods",
      quota: QUOTA,
      items: [
        { title: "Mapping the floods", source: "Reuters Graphics", date: "2022-09-01T00:00:00+00:00", url: "https://example.org/a", image: null },
        { title: "Europe's floods", source: "Financial Times", date: "2024-06-12T00:00:00+00:00", url: "https://example.org/b", image: null },
      ],
    });
    expect(text).toBe(
      [
        "2 published visuals for “floods”:",
        "",
        "1. [Mapping the floods](https://example.org/a) — Reuters Graphics, 2022-09-01",
        "2. [Europe's floods](https://example.org/b) — Financial Times, 2024-06-12",
        "",
        "4 of 5 searches left today.",
      ].join("\n"),
    );
  });

  it("should say one visual in the singular", () => {
    const text = formatInspiration({
      ok: true,
      query: "heat",
      quota: QUOTA,
      items: [{ title: "Heat", source: "The Guardian", date: null, url: "https://example.org/h", image: null }],
    });
    expect(text.split("\n")[0]).toBe("1 published visual for “heat”:");
    expect(text).toContain("1. [Heat](https://example.org/h) — The Guardian");
  });

  it("should keep a title with brackets and a link with parentheses intact as markdown", () => {
    const text = formatInspiration({
      ok: true,
      query: "x",
      quota: QUOTA,
      items: [{ title: "Floods [interactive]", source: null, date: null, url: "https://example.org/a_(b) c", image: null }],
    });
    expect(text).toContain("1. [Floods \\[interactive\\]](https://example.org/a_%28b%29%20c) — newsroom unknown");
  });

  it("should say plainly when the gallery has nothing on the subject", () => {
    expect(formatInspiration({ ok: true, query: "floods", items: [], quota: QUOTA })).toBe(
      "Nothing in the gallery for “floods”.\n\n4 of 5 searches left today.",
    );
  });

  it("should leave out the quota line when the gallery did not report one", () => {
    const text = formatInspiration({
      ok: true,
      query: "floods",
      items: [],
      quota: { limit: null, remaining: null, resetsAt: null },
    });
    expect(text).toBe("Nothing in the gallery for “floods”.");
  });

  it("should give the daily limit and the reset time when the quota is spent", () => {
    expect(
      formatInspiration({ ok: false, reason: "limit-reached", query: "floods", quota: { limit: 5, remaining: 0, resetsAt: "2026-09-14T00:00:00+00:00" } }),
    ).toBe("The gallery's daily limit is reached (5 searches a day). It resets at 2026-09-14T00:00:00+00:00.");
  });

  it("should fall back to midnight UTC when the reset time is unknown", () => {
    expect(
      formatInspiration({ ok: false, reason: "limit-reached", query: "floods", quota: { limit: null, remaining: 0, resetsAt: null } }),
    ).toBe("The gallery's daily limit is reached. It resets at midnight UTC.");
  });

  it("should name why the gallery could not be reached", () => {
    expect(formatInspiration({ ok: false, reason: "unreachable", detail: "timed out after 15000ms" })).toBe(
      "infoviz.design could not be reached (timed out after 15000ms).",
    );
  });

  it("should report an unexpected answer with its status", () => {
    expect(formatInspiration({ ok: false, reason: "unexpected-response", status: 503 })).toBe(
      "infoviz.design answered with status 503, so there is no list to show.",
    );
  });

  it("should ask for a subject when there was none", () => {
    expect(formatInspiration({ ok: false, reason: "empty-query" })).toBe("Name a subject to search for.");
  });

  it("should ask for a shorter subject when it was too long", () => {
    expect(formatInspiration({ ok: false, reason: "query-too-long", limit: 1000 })).toBe(
      "Keep the subject under 1000 characters.",
    );
  });
});