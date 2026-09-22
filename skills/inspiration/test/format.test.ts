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
        {
          title: "Mapping the floods",
          source: "Reuters Graphics",
          date: "2022-09-01T00:00:00+00:00",
          url: "https://example.org/a",
          image: null,
        },
        {
          title: "Europe's floods",
          source: "Financial Times",
          date: "2024-06-12T00:00:00+00:00",
          url: "https://example.org/b",
          image: null,
        },
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
      items: [
        {
          title: "Heat",
          source: "The Guardian",
          date: null,
          url: "https://example.org/h",
          image: null,
        },
      ],
    });
    expect(text.split("\n")[0]).toBe("1 published visual for “heat”:");
    expect(text).toContain("1. [Heat](https://example.org/h) — The Guardian");
  });

  it("should keep a title with brackets and a link with parentheses intact as markdown", () => {
    const text = formatInspiration({
      ok: true,
      query: "x",
      quota: QUOTA,
      items: [
        {
          title: "Floods [interactive]",
          source: null,
          date: null,
          url: "https://example.org/a_(b) c",
          image: null,
        },
      ],
    });
    expect(text).toContain(
      "1. [Floods \\[interactive\\]](https://example.org/a_%28b%29%20c) — newsroom unknown",
    );
  });

  it("should say plainly when the gallery has nothing on the subject", () => {
    expect(
      formatInspiration({ ok: true, query: "floods", items: [], quota: QUOTA }),
    ).toBe(
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
      formatInspiration({
        ok: false,
        reason: "limit-reached",
        query: "floods",
        quota: {
          limit: 5,
          remaining: 0,
          resetsAt: "2026-09-14T00:00:00+00:00",
        },
      }),
    ).toBe(
      "The gallery's daily limit is reached (5 searches a day). It resets at 2026-09-14T00:00:00+00:00.",
    );
  });

  it("should fall back to midnight UTC when the reset time is unknown", () => {
    expect(
      formatInspiration({
        ok: false,
        reason: "limit-reached",
        query: "floods",
        quota: { limit: null, remaining: 0, resetsAt: null },
      }),
    ).toBe("The gallery's daily limit is reached. It resets at midnight UTC.");
  });

  it("should name why the gallery could not be reached", () => {
    expect(
      formatInspiration({
        ok: false,
        reason: "unreachable",
        detail: "timed out after 15000ms",
      }),
    ).toBe("The gallery could not be reached (timed out after 15000ms).");
  });

  it("should report an unexpected answer with its status", () => {
    expect(
      formatInspiration({
        ok: false,
        reason: "unexpected-response",
        status: 503,
      }),
    ).toBe(
      "The gallery answered with status 503, so there is no list to show.",
    );
  });

  it("should ask for a subject when there was none", () => {
    expect(formatInspiration({ ok: false, reason: "empty-query" })).toBe(
      "Name a subject to search for.",
    );
  });

  it("should ask for a shorter subject when it was too long", () => {
    expect(
      formatInspiration({ ok: false, reason: "query-too-long", limit: 1000 }),
    ).toBe("Keep the subject under 1000 characters.");
  });

  it("should escape a source that looks like a markdown link so it cannot become a live link", () => {
    const text = formatInspiration({
      ok: true,
      query: "x",
      quota: QUOTA,
      items: [
        {
          title: "A",
          source: "[Click](https://evil.example)",
          date: null,
          url: "https://example.org/a",
          image: null,
        },
      ],
    });
    expect(text).not.toContain("[Click](https://evil.example)");
    expect(text).toContain("\\[Click\\](https://evil.example)");
  });

  it("should escape angle brackets in a title so a script tag renders as text", () => {
    const text = formatInspiration({
      ok: true,
      query: "x",
      quota: QUOTA,
      items: [
        {
          title: "<script>alert(1)</script>",
          source: null,
          date: null,
          url: "https://example.org/a",
          image: null,
        },
      ],
    });
    expect(text).not.toContain("<script>");
    expect(text).toContain("\\<script\\>alert(1)\\</script\\>");
  });

  it("should not let a trailing backslash in the url escape away the link's closing parenthesis", () => {
    const text = formatInspiration({
      ok: true,
      query: "x",
      quota: QUOTA,
      items: [
        {
          title: "A",
          source: null,
          date: null,
          url: "https://example.org/a\\",
          image: null,
        },
      ],
    });
    const line = text.split("\n").find((l) => l.startsWith("1. "));
    expect(line).toBe("1. [A](https://example.org/a%5C) — newsroom unknown");
  });

  it("should show a date only when it is a real yyyy-mm-dd date", () => {
    const text = formatInspiration({
      ok: true,
      query: "x",
      quota: QUOTA,
      items: [
        {
          title: "A",
          source: "Reuters Graphics",
          date: "not-a-date",
          url: "https://example.org/a",
          image: null,
        },
      ],
    });
    expect(text).toContain("1. [A](https://example.org/a) — Reuters Graphics");
    expect(text).not.toContain("not-a-date");
  });

  it("should append the reset time to the quota line when the last search spent the final one", () => {
    const text = formatInspiration({
      ok: true,
      query: "floods",
      items: [],
      quota: { limit: 5, remaining: 0, resetsAt: "2026-09-14T00:00:00+00:00" },
    });
    expect(text).toBe(
      "Nothing in the gallery for “floods”.\n\n0 of 5 searches left today. It resets at 2026-09-14T00:00:00+00:00.",
    );
  });

  it("should fall back to midnight UTC on the quota line when the reset time is unknown", () => {
    const text = formatInspiration({
      ok: true,
      query: "floods",
      items: [],
      quota: { limit: null, remaining: 0, resetsAt: null },
    });
    expect(text).toBe(
      "Nothing in the gallery for “floods”.\n\n0 searches left today. It resets at midnight UTC.",
    );
  });
});

const RECONNECT =
  "Your Navigator account needs reconnecting: Indicator Labs → Connected services → Navigator → Connect.";

describe("formatInspiration and the Navigator account", () => {
  it("should ask to reconnect when the token was refused", () => {
    expect(formatInspiration({ ok: false, reason: "invalid-token" })).toBe(
      RECONNECT,
    );
  });

  it("should put the reconnect sentence before an anonymous list", () => {
    const text = formatInspiration({
      ok: true,
      query: "floods",
      items: [],
      quota: { limit: 5, remaining: 4, resetsAt: null },
      accountNeedsReconnect: true,
    });
    expect(text).toBe(
      `${RECONNECT}\n\nNothing in the gallery for “floods”.\n\n4 of 5 searches left today.`,
    );
  });

  it("should put the reconnect sentence before an anonymous failure", () => {
    const text = formatInspiration({
      ok: false,
      reason: "limit-reached",
      query: "floods",
      quota: { limit: 5, remaining: 0, resetsAt: null },
      accountNeedsReconnect: true,
    });
    expect(text).toBe(
      `${RECONNECT}\n\nThe gallery's daily limit is reached (5 searches a day). It resets at midnight UTC.`,
    );
  });
});

/**
 * D2 — A SIGNED-IN JOURNALIST WAS GIVEN FIVE AND TOLD NOTHING.
 *
 * `bsig auth login` answers "signed in as … (lab tier) — PAT stored in the keychain", and the
 * searches that follow are still the anonymous five a day, because Engine only hands the MCP server
 * `OSINT_NAV_API_KEY` when a Navigator account is connected inside Indicator Labs. That is the
 * design; the silence around it is not. Measured on 2026-09-22: signed in, the count ran 5, 4, 3,
 * 2, 1, 0 with no word anywhere about why the account was not in play.
 *
 * The gallery's own ration is the only thing this file may state as fact, so it states which one
 * was applied and stops there.
 */
describe("which ration the search ran under", () => {
  it("says an anonymous search was anonymous, and what would change it", () => {
    const text = formatInspiration({
      ok: true,
      query: "floods",
      account: "anonymous",
      items: [{ title: "A flood map", source: "A newsroom", date: "2026-01-01", url: "https://example.org/x" }],
      quota: { limit: 5, remaining: 4, resetsAt: null },
    });
    expect(text).toContain("4 of 5 searches left today.");
    expect(text).toContain("anonymous");
    expect(text).toContain("Indicator Labs");
  });

  it("says nothing extra when the account is the one searching", () => {
    const text = formatInspiration({
      ok: true,
      query: "floods",
      account: "navigator",
      items: [{ title: "A flood map", source: "A newsroom", date: "2026-01-01", url: "https://example.org/x" }],
      quota: { limit: 10, remaining: 9, resetsAt: null },
    });
    expect(text).toContain("9 of 10 searches left today.");
    expect(text).not.toContain("anonymous");
  });
});
