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

  it("omits a blank login so the runtime falls back to its subscription login", () => {
    expect(
      envUpdates(submission({ runtime: "claude", login: "  " })),
    ).not.toHaveProperty("ANTHROPIC_API_KEY");
    expect(
      envUpdates(submission({ runtime: "claude", login: "sk-ant-X" }))
        .ANTHROPIC_API_KEY,
    ).toBe("sk-ant-X");
  });

  it("writes the login under the name the CHOSEN runtime declares", () => {
    expect(
      envUpdates(submission({ runtime: "gemini", login: "gk-X" })),
    ).toEqual({ GEMINI_API_KEY: "gk-X" });
  });

  // The payload arrives over a socket. A runtime that declares no login must write nothing —
  // otherwise the page becomes a way to set an arbitrary environment variable.
  it("writes nothing when the chosen runtime declares no login", () => {
    expect(envUpdates(submission({ runtime: "goose", login: "gk-X" }))).toEqual(
      {},
    );
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

  // Task 5 (2026-08-06): the page no longer submits a tick list at all. An ENGINE is always
  // `enabled: true` now — there is no tick left to gate it on, and readiness.ts stopped
  // consulting the flag for one. A DELIVERY destination is enabled by being CHOSEN as the
  // publisher, and only that one.
  it("enables every engine unconditionally, and only the chosen publisher among deliveries", () => {
    const s = submittedState(submission({ publisher: "zip" }), previous);
    expect(s.capabilities["dw-chart"]?.enabled).toBe(true);
    expect(s.capabilities["map-native"]?.enabled).toBe(true);
    expect(s.capabilities["zip"]?.enabled).toBe(true);
    expect(s.capabilities["embed-cloudflare"]?.enabled).toBe(false);
  });

  it("stamps the verdict of a live check regardless of publisher, and leaves an unchecked capability unstamped", () => {
    const s = submittedState(
      submission({ verified: { "dw-chart": "ok" } }),
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
    const s = submittedState(submission(), stamped);
    expect(s.capabilities["dw-chart"]?.lastVerified?.at).toBe(
      "2026-07-01T00:00:00.000Z",
    );
  });

  // An existing newsroom.json written before this change can still carry a ticked-off engine
  // (`enabled: false`) — a submission simply supersedes it with `true` on the next save, rather
  // than crashing or preserving a flag nothing reads any more.
  it("supersedes an engine that a pre-existing decor had ticked off, without crashing", () => {
    const legacy: NewsroomState = {
      ...previous,
      capabilities: { "map-native": { enabled: false } },
    };
    const s = submittedState(submission(), legacy);
    expect(s.capabilities["map-native"]?.enabled).toBe(true);
  });

  it("NEVER lets a credential value into the state — .env is its one home", () => {
    const s = submittedState(
      submission({
        publisher: "embed-s3",
        login: "sk-ant-secret",
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
        submission({ credentials: { bucket: "" } }),
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

// The submission arrives over a socket. It is a LOCAL socket, but "local" is not a validation
// strategy: everything that lands in a persisted file is checked against the registry first.
describe("a submission is never trusted to name things itself", () => {
  it("refuses a publisher that is not a declared delivery capability", () => {
    const previous: NewsroomState = {
      ...DEFAULT_NEWSROOM_STATE,
      capabilities: {},
    };
    expect(
      submittedState(submission({ publisher: "embed-cloudflare" }), previous)
        .publisher,
    ).toBe("embed-cloudflare");
    expect(
      submittedState(submission({ publisher: "dw-chart" }), previous).publisher,
    ).toBeUndefined(); // an engine is not a publisher
    expect(
      submittedState(submission({ publisher: "../../etc" }), previous)
        .publisher,
    ).toBeUndefined();
  });

  it("refuses a runtime that is not one of the shipped modules", () => {
    const previous: NewsroomState = {
      ...DEFAULT_NEWSROOM_STATE,
      capabilities: {},
    };
    expect(
      submittedState(submission({ runtime: "goose" }), previous).runtime,
    ).toBe("goose");
    expect(
      submittedState(submission({ runtime: "goose; rm -rf /" }), previous)
        .runtime,
    ).toBe("claude");
  });

  it("cannot inject a line into the newsroom profile through a name or a colour", () => {
    const md = profileMarkdown({
      name: 'Heidi"\nrequiredSigners: ["nobody"]',
      color: '#fff"\n',
      lang: "en",
    });
    // The hostile text survives as literal characters INSIDE the value — harmless. What must
    // not exist is a new frontmatter line: that is how a forged field would take effect.
    const frontmatter = md.split("---")[1]!.split("\n");
    expect(frontmatter.some((l) => l.startsWith("requiredSigners"))).toBe(
      false,
    );
    expect(frontmatter.filter((l) => l.startsWith("  name:"))).toHaveLength(1);
  });
});
