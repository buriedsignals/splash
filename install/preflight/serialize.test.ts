import { describe, expect, it } from "bun:test";
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_NEWSROOM_STATE,
  type NewsroomState,
} from "../../lib/newsroom/state.ts";
import {
  envUpdates,
  mergeEnvFile,
  profileMarkdown,
  settingsUpdates,
  submittedState,
  type PreflightSubmission,
} from "./serialize.ts";

function submission(
  over: Partial<PreflightSubmission> = {},
): PreflightSubmission {
  return {
    runtime: "claude",
    uiLang: "en",
    enabled: [],
    credentials: {},
    ...over,
  };
}

describe("merging into .env — a blank field never destroys a configured key", () => {
  it("keeps the existing value when the field comes back empty", () => {
    const existing = 'DATAWRAPPER_API_TOKEN="already-there"\n';
    const merged = mergeEnvFile(existing, { DATAWRAPPER_API_TOKEN: "" });
    expect(merged).toContain('DATAWRAPPER_API_TOKEN="already-there"');
  });

  it("updates an existing key IN PLACE rather than appending a second line", () => {
    const merged = mergeEnvFile('DATAWRAPPER_API_TOKEN="old"\n', {
      DATAWRAPPER_API_TOKEN: "new",
    });
    expect(merged.match(/DATAWRAPPER_API_TOKEN=/g)).toHaveLength(1);
    expect(merged).toContain('DATAWRAPPER_API_TOKEN="new"');
  });

  it("preserves lines Splash knows nothing about, and comments", () => {
    const existing = '# my notes\nSOME_OTHER_TOOL="x"\n';
    const merged = mergeEnvFile(existing, { VITE_MAPTILER_KEY: "mt" });
    expect(merged).toContain("# my notes");
    expect(merged).toContain('SOME_OTHER_TOOL="x"');
    expect(merged).toContain('VITE_MAPTILER_KEY="mt"');
  });

  it("appends a key the file did not have", () => {
    expect(mergeEnvFile("", { VITE_MAPTILER_KEY: "mt" })).toBe(
      'VITE_MAPTILER_KEY="mt"\n',
    );
  });

  it("trims, and drops the two characters that would corrupt the file", () => {
    const merged = mergeEnvFile("", {
      VITE_MAPTILER_KEY: "  mt  ",
      SPLASH_EMBED_PROJECT: 'a"b\nc',
    });
    expect(merged).toContain('VITE_MAPTILER_KEY="mt"');
    expect(merged).toContain('SPLASH_EMBED_PROJECT="abc"');
    expect(merged).not.toContain("\nc"); // no injected extra env line
  });

  it("sources cleanly in bash with a spaced token value (the launcher contract)", () => {
    // The macOS/Linux launcher does `set -a && . ./.env`. An unquoted space aborted the source
    // with exit 127 — that is why every value is double-quoted. Proven by sourcing, not by
    // reading the quoting code.
    const merged = mergeEnvFile("", {
      VITE_MAPTILER_KEY: "MTKEY",
      CLOUDFLARE_API_TOKEN: "tok en with spaces",
    });
    const p = join(tmpdir(), `splash-env-merge-${process.pid}.env`);
    writeFileSync(p, merged);
    try {
      const script = `set -a; . '${p}'; set +a; printf '%s|%s' "$VITE_MAPTILER_KEY" "$CLOUDFLARE_API_TOKEN"`;
      const r = Bun.spawnSync(["bash", "-c", script]);
      expect(r.exitCode).toBe(0);
      expect(r.stdout.toString()).toBe("MTKEY|tok en with spaces");
    } finally {
      rmSync(p, { force: true });
    }
  });
});

describe("what a submission writes to .env", () => {
  it("mirrors the MapTiler key onto both names Vite and Remotion read", () => {
    const updates = envUpdates(
      submission({ credentials: { VITE_MAPTILER_KEY: "mt" } }),
    );
    expect(updates.VITE_MAPTILER_KEY).toBe("mt");
    expect(updates.REMOTION_MAPTILER_KEY).toBe("mt");
  });

  it("omits a blank Anthropic key so the runtime falls back to its subscription login", () => {
    expect(envUpdates(submission({ anthropic: "  " }))).not.toHaveProperty(
      "ANTHROPIC_API_KEY",
    );
    expect(
      envUpdates(submission({ anthropic: "sk-ant-X" })).ANTHROPIC_API_KEY,
    ).toBe("sk-ant-X");
  });

  it("routes only the fields the registry reads from the environment", () => {
    const updates = envUpdates(
      submission({
        credentials: {
          CLOUDFLARE_API_TOKEN: "tok",
          CLOUDFLARE_ACCOUNT_ID: "acct",
          endpoint: "https://s3.example.test",
        },
      }),
    );
    expect(updates.CLOUDFLARE_API_TOKEN).toBe("tok");
    expect(updates.CLOUDFLARE_ACCOUNT_ID).toBe("acct");
    expect(updates).not.toHaveProperty("endpoint"); // a settings key, not an env var
  });

  it("refuses a name the registry never declared — the page cannot write arbitrary env vars", () => {
    expect(
      envUpdates(submission({ credentials: { EVIL_INJECTED: "x" } })),
    ).not.toHaveProperty("EVIL_INJECTED");
  });
});

describe("what a submission writes to newsroom.json", () => {
  const previous: NewsroomState = {
    ...DEFAULT_NEWSROOM_STATE,
    capabilities: {},
  };

  it("records the runtime, the interface language and the chosen publisher", () => {
    const s = submittedState(
      submission({ runtime: "goose", uiLang: "fr", publisher: "zip" }),
      previous,
    );
    expect(s.runtime).toBe("goose");
    expect(s.uiLang).toBe("fr");
    expect(s.publisher).toBe("zip");
  });

  it("enables exactly what was ticked, and disables the rest", () => {
    const s = submittedState(
      submission({ enabled: ["dw-chart", "zip"] }),
      previous,
    );
    expect(s.capabilities["dw-chart"]?.enabled).toBe(true);
    expect(s.capabilities["zip"]?.enabled).toBe(true);
    expect(s.capabilities["map-native"]?.enabled).toBe(false);
  });

  it("stamps the verdict of a live check, and leaves an unchecked capability unstamped", () => {
    const s = submittedState(
      submission({
        enabled: ["dw-chart"],
        verified: { "dw-chart": "ok" },
      }),
      previous,
      "2026-07-26T12:00:00.000Z",
    );
    expect(s.capabilities["dw-chart"]?.lastVerified).toEqual({
      at: "2026-07-26T12:00:00.000Z",
      result: "ok",
    });
    expect(s.capabilities["map-native"]?.lastVerified).toBeUndefined();
  });

  it("keeps a verdict recorded earlier when this submission checked nothing", () => {
    const stamped: NewsroomState = {
      ...previous,
      capabilities: {
        "dw-chart": {
          enabled: true,
          lastVerified: { at: "2026-07-01T00:00:00.000Z", result: "ok" },
        },
      },
    };
    const s = submittedState(submission({ enabled: ["dw-chart"] }), stamped);
    expect(s.capabilities["dw-chart"]?.lastVerified?.at).toBe(
      "2026-07-01T00:00:00.000Z",
    );
  });

  it("NEVER lets a credential value into the state — .env is its one home", () => {
    const s = submittedState(
      submission({
        enabled: ["dw-chart", "embed-cloudflare", "embed-s3"],
        anthropic: "sk-ant-secret",
        credentials: {
          DATAWRAPPER_API_TOKEN: "dw-secret-value",
          CLOUDFLARE_API_TOKEN: "cf-secret-value",
          CLOUDFLARE_ACCOUNT_ID: "acct-1234",
          SPLASH_S3_SECRET_ACCESS_KEY: "s3-secret-value",
          bucket: "newsroom-bucket",
        },
      }),
      previous,
    );
    const serialized = JSON.stringify(s);
    expect(serialized).not.toContain("dw-secret-value");
    expect(serialized).not.toContain("cf-secret-value");
    expect(serialized).not.toContain("s3-secret-value");
    expect(serialized).not.toContain("sk-ant-secret");
    // A non-secret settings key the adapter reads from newsroom.json is exactly what
    // `settings` is for, so THAT one is there.
    expect(s.capabilities["embed-s3"]?.settings?.bucket).toBe(
      "newsroom-bucket",
    );
    // …and an env-read identifier is NOT duplicated there: .env is its home.
    expect(serialized).not.toContain("acct-1234");
  });

  it("keeps a settings value the newsroom already had when the field comes back blank", () => {
    const withSettings: NewsroomState = {
      ...previous,
      capabilities: {
        "embed-s3": { enabled: true, settings: { bucket: "kept" } },
      },
    };
    expect(
      settingsUpdates(
        submission({ enabled: ["embed-s3"], credentials: { bucket: "" } }),
        withSettings,
      )["embed-s3"]?.bucket,
    ).toBe("kept");
  });
});

describe("the newsroom profile, created once from the template", () => {
  it("carries the newsroom's name, house colour and content language", () => {
    const md = profileMarkdown({
      name: "Heidi.news",
      url: "https://heidi.news",
      color: "#0A5C36",
      lang: "fr",
    });
    expect(md).toContain('name: "Heidi.news"');
    expect(md).toContain('url: "https://heidi.news"');
    expect(md).toContain('"#0A5C36"');
    expect(md).toContain('lang: "fr"');
    // It must parse as the profile the rest of Splash reads.
    expect(md.startsWith("---\n")).toBe(true);
  });

  it("drops a field the newsroom left empty rather than writing an empty value", () => {
    const md = profileMarkdown({ lang: "en" });
    expect(md).not.toContain("name:");
    expect(md).toContain('lang: "en"');
  });
});
