# Splash Flow Orchestrator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A top-level `splash` orchestrator skill that runs the whole pipeline end-to-end — INPUT → ANALYSE → CADRAGE → PROPOSITION → PRODUCTION → EXPORT — sequencing the existing skills and adding the framing questionnaire and the code-vs-embed export.

**Architecture:** The orchestrator is a **skill** (`skills/splash/SKILL.md`) that drives six ordered phases with explicit human gates and invokes `suggest-article`, `suggest-chart`, and the producers. Two small scripts back the EXPORT phase: `export-code.mjs` (bundle the artifacts + an embed snippet) and `deploy-embed.mjs` (fly.io upload, last increment).

**Tech Stack:** Claude Code skill (YAML-frontmatter Markdown, splash convention); Bun/TypeScript for the export scripts; `flyctl` for the embed host.

## Global Constraints

- Dialogue language: detect the journalist's language from their first message and conduct the ENTIRE dialogue (questions, recaps, gate prompts, export) in it. Code/comments/commits stay English.
- Never invent data or claims (inherited from the sub-skills).
- Nothing auto-progresses past a gate — every gate is an explicit human stop.
- The orchestrator sequences + gates; it does NOT re-decide what a sub-skill decides.
- Bun always. No Claude/Anthropic mention in code, comments, or commits.
- splash SKILL.md convention: YAML frontmatter (`name`, `description`) + a Markdown body (`#` title, `##` sections).

---

### Task 1: The orchestrator skill (`skills/splash/SKILL.md`)

**Files:**
- Create: `skills/splash/SKILL.md`

**Interfaces:**
- Consumes (by invocation, documented in the body):
  - `suggest-article` — ANALYSE + PROPOSITION: reads `{article, data}` → a vetoable `ProposalSet` of `{claim, data, intent, provenance}` opportunities.
  - `suggest-chart` — routing + spec + produce: given `(data, intent[, forced element/format])` → picks element/format/producer, emits the validated spec, and runs the producer's `produce`/`produce-from-spec` script.
  - Producers' produce commands (verbatim, from suggest-chart/SKILL.md): chart-native `bun skills/chart-native/scripts/produce-from-spec.mjs <spec.json> <outDir> [all|static]`; map-native / scrolly `bun scripts/produce.mjs <config.json> <outDir> [all|static]` (run from the producer's dir); dw-chart / map-dw via their producer entry.
- Produces: nothing importable — a skill. Its contract is the phase order + gates below.

- [ ] **Step 1: Write the frontmatter + overview**

```markdown
---
name: splash
description: Use to run the whole splash pipeline end-to-end from an article and/or data to a finished, exported visual. Sequences ANALYSE → CADRAGE → PROPOSITION → PRODUCTION → EXPORT with human gates, invoking suggest-article, suggest-chart, and the producers. The single entry point for "make me a visual from this". Keywords splash, flow, pipeline, orchestrate, end-to-end, article to chart, produce a visual, embed, export.
---

# splash — the end-to-end flow

## Overview

The single entry point that turns an article and/or data into a finished, exported visual. It runs
six ordered phases with explicit human gates and never re-decides what a sub-skill already decides —
it sequences and gates. Conduct the ENTIRE dialogue in the journalist's language (detect it from
their first message).
```

- [ ] **Step 2: Write the phase-order body.** Add a `## The flow` section that states the six phases MUST run in order and each gate is a hard stop. Then one `##` section per phase with the exact behaviour:

````markdown
## The flow (run in order; every gate is a hard stop)

### 1. INPUT
Accept: an article (URL / file / pasted text), data (CSV / file / pasted table), both, or a bare
topic. Normalise to `{ article?, data?, topic? }`. Do not proceed until you have at least one.

### 2. ANALYSE (silent)
Invoke `suggest-article` to read silently: identify the data, the quantified claims, and the
narrative structure. Produce NO output to the journalist yet — this primes CADRAGE. For a bare topic
(no article/data), instead NAME the real dataset the topic needs (the honest sans-rien path) and
carry that forward.

### 3. CADRAGE — GATE 1 (questionnaire, journalist's language, ≤4 questions, one at a time)
1. Branch: "Do you already have a visual in mind, or should I guide you?"
2. Takeaway: "What is the one thing a reader should leave with?" → the insight/angle.
3. Audience & channel: "Where does this publish — article embed, social, print?" → the format signal
   (feeds suggest-chart Gates 1–4: static / interactive / video / scrolly).
4. Constraint (only if relevant): mobile-first, deadline, house palette.
Branch:
- DIRECT (journalist names the visual, e.g. "a scrolly map"): skip PROPOSITION. Go to PRODUCTION,
  passing suggest-chart the (data, intent) PLUS the forced element/format — suggest-chart still emits
  a VALIDATED spec and applies its guardrails (obey the choice, but if it violates a hard guardrail,
  surface the warning to the journalist rather than shipping a broken visual).
- GUIDED: go to PROPOSITION.

### 4. PROPOSITION — GATE 2 (guided path only)
Present the `suggest-article` ProposalSet × `suggest-chart` routing as plain-language lines — for each
opportunity: what it shows, which visual, why. The journalist accepts / edits / rejects each. Only
accepted proposals continue.
GATE 2b (data provenance): if an accepted proposal's figures are `provenance:"prose"`, show the
reconstructed table and get an explicit OK before producing. Never fabricate a dataset attribution.

### 5. PRODUCTION
For each validated visual, run the chosen producer with the suggest-chart spec (the produce commands
in suggest-chart/SKILL.md). The producer emits its self-contained artifact(s) and runs its own render
guardrails. Collect the output paths.
GATE 3 (render): show the ACTUAL render (open it / a screenshot) and get an explicit "ship it" before
EXPORT. Verify quality, not just that it built.

### 6. EXPORT — GATE 4 (code vs link)
Ask which the journalist wants:
- CODE (technical): run `bun skills/splash/scripts/export-code.mjs <outDir> <exportDir>` to bundle the
  artifacts + an embed snippet + a short README; hand over the folder.
- EMBED LINK (non-technical): run `bun skills/splash/scripts/deploy-embed.mjs <htmlFile> <slug>` →
  prints an iframe-ready URL. If the fly.io host is not set up yet, offer CODE now + say the embed
  link is pending setup.
````

- [ ] **Step 3: Write the gates summary + red-flags.** Add a `## Gates` table (the 5 gates) and a `## Never` list: never skip a gate, never auto-progress, never produce before the proposition/provenance OK, never export before the render OK, never invent data, never conduct the dialogue in a language other than the journalist's.

- [ ] **Step 4: Verify (dry-run on a real article — GUIDED path).** Invoke the skill on a real fetchable article (e.g. the ROUND9 France-nuclear or unemployment case data). Walk the phases and CONFIRM: ANALYSE produces no user output; CADRAGE asks ≤4 questions one at a time in the journalist's language; PROPOSITION lists opportunities and waits for accept/edit/reject; PRODUCTION runs the right producer and a render appears; GATE 3 stops for "ship it"; EXPORT offers code vs link. Record the walkthrough in `docs/splash/flow-dryrun-guided.md`.

- [ ] **Step 5: Verify (dry-run — DIRECT path).** Re-invoke; at CADRAGE answer "I want a sorted bar chart". CONFIRM PROPOSITION is skipped, suggest-chart is called with the forced element, a valid spec is produced and rendered, and export is offered. Record in `docs/splash/flow-dryrun-direct.md`.

- [ ] **Step 6: Commit**

```bash
git add skills/splash/SKILL.md docs/splash/flow-dryrun-guided.md docs/splash/flow-dryrun-direct.md
git commit -m "feat(splash): end-to-end flow orchestrator skill (6 phases, 5 gates)"
```

---

### Task 2: EXPORT — code handoff (`export-code.mjs`)

**Files:**
- Create: `skills/splash/scripts/export-code.mjs`
- Create: `skills/splash/scripts/export-code.test.ts`

**Interfaces:**
- Consumes: a producer `outDir` (containing e.g. `scrolly.html` / `interactive.html` / `static.png` / `*.mp4`) + an `exportDir` to write the bundle into.
- Produces: `embedSnippet(file: string): string` (pure, exported for the test) → an iframe snippet for an `.html`, an `<img>` for a `.png`, a `<video>` for an `.mp4`. The CLI copies the artifacts to `exportDir` and writes `EMBED.md` (the snippet + a one-line how-to) + a `README.txt`.

- [ ] **Step 1: Write the failing test**

```ts
// skills/splash/scripts/export-code.test.ts
import { describe, it, expect } from "bun:test";
import { embedSnippet } from "./export-code.mjs";

describe("embedSnippet", () => {
  it("wraps an .html file in a responsive iframe", () => {
    const s = embedSnippet("chart.html");
    expect(s).toContain("<iframe");
    expect(s).toContain('src="chart.html"');
  });
  it("wraps a .png in an img and an .mp4 in a video", () => {
    expect(embedSnippet("static.png")).toContain("<img");
    expect(embedSnippet("clip.mp4")).toContain("<video");
  });
  it("throws on an unsupported extension", () => {
    expect(() => embedSnippet("data.csv")).toThrow(/unsupported/i);
  });
});
```

- [ ] **Step 2: Run it — expect FAIL** (`bun test skills/splash/scripts/export-code.test.ts`), module missing.

- [ ] **Step 3: Implement `export-code.mjs`**

```js
// skills/splash/scripts/export-code.mjs
// EXPORT (code path): bundle a producer's artifacts into a hand-over folder with an embed snippet
// and a README, so a technical journalist can drop the visual into their CMS.
//   bun export-code.mjs <outDir> <exportDir>
import { readdirSync, mkdirSync, copyFileSync, writeFileSync } from "node:fs";
import { join, basename, extname } from "node:path";

export function embedSnippet(file) {
  const name = basename(file);
  const ext = extname(file).toLowerCase();
  if (ext === ".html")
    return `<iframe src="${name}" style="width:100%;border:0;aspect-ratio:16/10" loading="lazy" title="visual"></iframe>`;
  if (ext === ".png" || ext === ".jpg")
    return `<img src="${name}" alt="visual" style="max-width:100%;height:auto" />`;
  if (ext === ".mp4")
    return `<video src="${name}" controls playsinline style="max-width:100%"></video>`;
  throw new Error(`unsupported artifact extension: ${ext}`);
}

if (import.meta.main) {
  const [outDir, exportDir] = process.argv.slice(2);
  if (!outDir || !exportDir) {
    console.error("usage: export-code.mjs <outDir> <exportDir>");
    process.exit(1);
  }
  mkdirSync(exportDir, { recursive: true });
  const artifacts = readdirSync(outDir).filter((f) =>
    [".html", ".png", ".jpg", ".mp4"].includes(extname(f).toLowerCase()),
  );
  if (!artifacts.length) {
    console.error(`no exportable artifacts in ${outDir}`);
    process.exit(1);
  }
  // The primary embeddable artifact: prefer an interactive/scrolly HTML, else the first.
  const primary =
    artifacts.find((f) => f.endsWith(".html")) ?? artifacts[0];
  for (const f of artifacts) copyFileSync(join(outDir, f), join(exportDir, f));
  writeFileSync(
    join(exportDir, "EMBED.md"),
    `# Embed\n\nPaste this where the visual should appear:\n\n\`\`\`html\n${embedSnippet(primary)}\n\`\`\`\n\nAll files in this folder must be uploaded together (the embed references them by relative path).\n`,
  );
  writeFileSync(
    join(exportDir, "README.txt"),
    `Splash export — ${artifacts.length} file(s): ${artifacts.join(", ")}.\nPrimary embed: ${primary}. See EMBED.md.\n`,
  );
  console.log("EXPORT_CODE_RESULT " + JSON.stringify({ exportDir, primary, artifacts }));
}
```

- [ ] **Step 4: Run tests — expect PASS.** `bun test skills/splash/scripts/export-code.test.ts`

- [ ] **Step 5: Verify the CLI** on a real producer output (produce any ROUND9 case to `/tmp/x`, then `bun skills/splash/scripts/export-code.mjs /tmp/x /tmp/x-export`): confirm the export folder has the artifacts + `EMBED.md` with a valid snippet, and the `.html` opens standalone.

- [ ] **Step 6: Commit**

```bash
git add skills/splash/scripts/export-code.mjs skills/splash/scripts/export-code.test.ts
git commit -m "feat(splash): export-code — bundle artifacts + embed snippet for the code path"
```

---

### Task 3: EXPORT — fly.io embed link (`deploy-embed.mjs` + host app)

**Files:**
- Create: `skills/splash/scripts/deploy-embed.mjs`
- Create: `skills/splash/embed-host/` (a minimal static file server: `Dockerfile`, `fly.toml`, `server.ts`)
- Create: `skills/splash/scripts/deploy-embed.test.ts`
- Modify: `skills/splash/SKILL.md` (fill in the one-time host-setup note in EXPORT)

**Interfaces:**
- Consumes: an HTML file path + a `slug`.
- Produces: `embedUrl(app: string, slug: string): string` (pure, exported) → `https://<app>.fly.dev/<slug>/`. The CLI uploads the HTML to the persistent host app under `/<slug>/index.html` and prints the URL.

- [ ] **Step 1: Write the failing test**

```ts
// skills/splash/scripts/deploy-embed.test.ts
import { describe, it, expect } from "bun:test";
import { embedUrl, slugify } from "./deploy-embed.mjs";

describe("embedUrl / slugify", () => {
  it("builds the host URL from app + slug", () => {
    expect(embedUrl("splash-embeds", "eu-rents-2025")).toBe(
      "https://splash-embeds.fly.dev/eu-rents-2025/",
    );
  });
  it("slugify lowercases, strips, and dashes", () => {
    expect(slugify("EU Rents (2025)!")).toBe("eu-rents-2025");
  });
});
```

- [ ] **Step 2: Run it — expect FAIL.** `bun test skills/splash/scripts/deploy-embed.test.ts`

- [ ] **Step 3: Implement the host app.** `embed-host/server.ts` — a tiny Bun static server that serves files from `/data/<slug>/...` with permissive CORS + `X-Frame-Options: ALLOWALL` so the URL is iframe-embeddable; `Dockerfile` (bun base, copy server, expose 8080); `fly.toml` (app `splash-embeds`, a mounted volume at `/data`). Include a one-time setup block in the SKILL: `flyctl launch --no-deploy`, `flyctl volumes create data`, `flyctl deploy`.

```ts
// skills/splash/embed-host/server.ts
import { join, normalize } from "node:path";
const ROOT = "/data";
Bun.serve({
  port: 8080,
  async fetch(req) {
    const url = new URL(req.url);
    // prevent path traversal; default to index.html
    let p = normalize(url.pathname).replace(/^(\.\.[/\\])+/, "");
    if (p.endsWith("/")) p += "index.html";
    const file = Bun.file(join(ROOT, p));
    if (!(await file.exists())) return new Response("not found", { status: 404 });
    return new Response(file, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "X-Frame-Options": "ALLOWALL",
        "Content-Security-Policy": "frame-ancestors *",
      },
    });
  },
});
console.log("embed-host on :8080");
```

- [ ] **Step 4: Implement `deploy-embed.mjs`** (the pure helpers + the upload via `flyctl ssh sftp shell` / `flyctl deploy` of the file into the volume). The pure functions:

```js
// skills/splash/scripts/deploy-embed.mjs
// EXPORT (embed-link path): upload a produced HTML to the persistent fly.io host app and print an
// iframe-ready URL. Requires a one-time host setup (see skills/splash/SKILL.md).
//   bun deploy-embed.mjs <htmlFile> <slug>
import { execFileSync } from "node:child_process";
const APP = process.env.SPLASH_EMBED_APP ?? "splash-embeds";

export function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
export function embedUrl(app, slug) {
  return `https://${app}.fly.dev/${slug}/`;
}

if (import.meta.main) {
  const [htmlFile, rawSlug] = process.argv.slice(2);
  if (!htmlFile || !rawSlug) {
    console.error("usage: deploy-embed.mjs <htmlFile> <slug>");
    process.exit(1);
  }
  const slug = slugify(rawSlug);
  // Upload htmlFile → /data/<slug>/index.html on the host app via flyctl sftp.
  try {
    execFileSync(
      "flyctl",
      ["ssh", "sftp", "shell", "-a", APP],
      { input: `put ${htmlFile} /data/${slug}/index.html\n`, stdio: ["pipe", "inherit", "inherit"] },
    );
  } catch (e) {
    console.error("fly upload failed — is the host app set up? see skills/splash/SKILL.md");
    process.exit(1);
  }
  console.log("EMBED_URL " + embedUrl(APP, slug));
}
```

- [ ] **Step 5: Run tests — expect PASS.** `bun test skills/splash/scripts/deploy-embed.test.ts`

- [ ] **Step 6: Live smoke (requires the fly.io app set up once).** After `flyctl deploy` of the host, run `bun skills/splash/scripts/deploy-embed.mjs <a produced .html> smoke-test`, then `curl -sI https://splash-embeds.fly.dev/smoke-test/` and assert HTTP 200 + the CORS/frame headers. If fly.io is not yet configured, mark this step BLOCKED and leave the export offering "code now + embed pending" — the pure helpers + tests still ship.

- [ ] **Step 7: Commit**

```bash
git add skills/splash/scripts/deploy-embed.mjs skills/splash/scripts/deploy-embed.test.ts skills/splash/embed-host skills/splash/SKILL.md
git commit -m "feat(splash): fly.io embed-link export (deploy script + host app)"
```

---

## Self-review notes

- **Spec coverage:** six phases + gates (Task 1); CADRAGE questionnaire + guided/direct branch (Task 1 Steps 2, 4, 5); data-provenance + render gates (Task 1 Step 2); EXPORT code (Task 2) + fly.io link (Task 3); language rule (Global Constraints + Task 1 frontmatter/overview). All covered.
- **Type consistency:** `embedSnippet` (Task 2), `embedUrl`/`slugify` (Task 3) are used exactly as defined; producer produce commands quoted verbatim from suggest-chart/SKILL.md.
- **Sequencing:** Task 1 (the skill) is usable with Task 2's code export immediately; Task 3 (fly.io) is the last increment and may be left BLOCKED on the live smoke without blocking the flow — exactly the spec's staging.
- **No-placeholder check:** every code step has complete code; the skill body (Task 1) gives the exact phase text, gate prompts, and questions to write.
