# MIT-Release Hardening (Spotlight B1-B4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.
>
> **Execution timing:** with the existing MIT-release chantier (CLAUDE.md backlog: « release
> MIT — confirmer REPO_URL public + scrub trailers »), NOT before. Written now so the release
> scope is locked while the Spotlight study is fresh. Source:
> `docs/splash/spotlight-learnings.md` B1-B4.

**Goal:** the public repo ships with the same trust surface Spotlight has: an explicit runtime
contract, output schemas treated as public API, a dependency-pinning policy the installer
enforces, and a disclaimer that says exactly what the mechanical guards do and do not
guarantee.

**Architecture:** four independent, doc-heavy tasks + two small code seams (`schemaVersion`
stamping; installer pin-refusal). No behavior change for existing users — additive fields and
docs only.

**Tech Stack:** Markdown, TypeScript, Bun, bun:test.

## Global Constraints

- Code, comments, commits: English. No vendor (Claude/Anthropic) mention anywhere — including
  the runtime contract doc (name runtimes generically + by their public names).
- Additive only: `schemaVersion` lands as a new optional field first; consumers must not break.
- Every doc this plan creates is a PUBLIC artifact — write it for a newsroom dev who has never
  seen this repo.

---

### Task 1 (B1): `AGENTS.md` runtime contract + `llms.txt`

**Files:**
- Create: `AGENTS.md` (repo root)
- Create: `llms.txt` (repo root)
- Test: `docs/installer/agents-contract.test.ts` (create — rides the existing installer TEST_DIR)

- [ ] **Step 1: Failing test** — asserts `AGENTS.md` exists and names the three seams
  (`produce-all.mjs`, `export-code.mjs`, `preflight.mjs`), and `llms.txt` exists, is ≤ 120
  lines, and contains the product one-liner + the skill list.

```ts
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "../..");

describe("runtime contract surface", () => {
  it("AGENTS.md names the minimal contract and the three mechanical seams", () => {
    const t = readFileSync(join(ROOT, "AGENTS.md"), "utf8");
    for (const s of ["produce-all.mjs", "export-code.mjs", "preflight.mjs", "single-select"])
      expect(t).toContain(s);
  });
  it("llms.txt is a compact machine-readable summary", () => {
    const t = readFileSync(join(ROOT, "llms.txt"), "utf8");
    expect(t.split("\n").length).toBeLessThanOrEqual(120);
    expect(t).toContain("Splash");
    expect(t).toContain("suggest-chart");
  });
});
```

- [ ] **Step 2: Write `AGENTS.md`** — the contract Spotlight makes explicit
  (`AGENTS.md:14-33` there). Content skeleton (write it fully, one page):
  - **What a runtime must provide** (the whole contract): read `skills/*/SKILL.md` as
    instructions · execute `bun <script>` shell commands and read their stdout/exit codes ·
    ask the journalist single-select and free-text questions one at a time · pass files.
    No sub-agent primitive, no vision, no MCP required.
  - **The mechanical seams** (the runtime never re-implements these): `produce-all.mjs`
    (validate + dispatch + report.json) · `export-code.mjs` (delivery forms a/b/c) ·
    `preflight.mjs` (engine readiness JSON). Table: script → argv → stdout contract →
    exit codes.
  - **State contract**: `exports/<slug>/` layout + the context-recovery resume table
    (reference SKILL.md's section, don't duplicate).
  - **Versioning**: `runtime_version: 1`; changes to the seams' argv/stdout are breaking and
    bump it (Spotlight's rule).
- [ ] **Step 3: Write `llms.txt`** — ≤ 120 lines: one-liner, the 6-phase flow, the skill list
  with one line each, the seams, install pointer, license.
- [ ] **Step 4: Test green + commit** —
  `feat(release): AGENTS.md runtime contract + llms.txt machine summary`

---

### Task 2 (B2): `schemaVersion` on the output contracts + public CHANGELOG

**Files:**
- Modify: `skills/splash/src/produce-all.ts` (the report assembly, `generatedAt` line ~192)
- Modify: `skills/splash/src/producer-spec.ts` (`ProduceReport` type — locate it; and
  `AcceptedProposal` gains optional `schemaVersion`)
- Create: `CHANGELOG.md` (repo root, public — Keep-a-Changelog; the internal
  `docs/splash/CHANGELOG.md` session journal stays as is, unlinked from this)
- Test: `skills/splash/tests/produce-all.test.ts` (extend)

- [ ] **Step 1: Failing test** — `report.schemaVersion === "1"` on any produceAll result;
  an accepted proposal WITH `schemaVersion: "1"` validates fine (additive).
- [ ] **Step 2: Implement** — stamp `schemaVersion: "1"` in the report object
  (`return { schemaVersion: "1", generatedAt: ..., results };`), add the optional field to the
  types. Grep every `ProduceReport` consumer (`gate-render`, `export-code.mjs`, harness reads
  it too) to confirm additive safety — no consumer may pattern-match on exact key sets.
- [ ] **Step 3: Write the public `CHANGELOG.md`** — Keep-a-Changelog header + an
  `## [Unreleased]` section listing the current public surface (report/accepted schema v1,
  the seams, the flow), and the rule (verbatim, it is the commitment): "Changes to
  `report.json` / `accepted.json` fields or to the seam scripts' argv/stdout are breaking and
  require a major version."
- [ ] **Step 4: Tests green + commit** —
  `feat(release): schemaVersion on output contracts + public Keep-a-Changelog`

---

### Task 3 (B3): dependency-pinning policy + installer refusal

**Files:**
- Create: `docs/installer/VALIDATED-DEPENDENCIES.md`
- Modify: the installer script generator (locate: `install/` — the piece that writes the
  `.command` bootstrap; read `install/configurator-core.ts` and its siblings first)
- Test: `docs/installer/dependency-pins.test.ts` (create)

- [ ] **Step 1: Failing test** — every dependency the bootstrap installs at runtime (parse the
  generated `.command`/install script for `bun install`/`brew`/`curl` targets) appears in
  `VALIDATED-DEPENDENCIES.md` with an exact version/digest; the generator refuses (throws)
  when asked to include a package absent from the list.
- [ ] **Step 2: Write `VALIDATED-DEPENDENCIES.md`** — the human source of truth (Spotlight
  `VALIDATED_DEPENDENCIES.md:5`): exact versions of what the install path pulls (bun version
  floor, the per-skill package.json lockfiles as the pin mechanism, any brew/curl fetches),
  and the policy line: "If a package is not listed here, the installer must stop and report
  that manual review is required."
- [ ] **Step 3: Implement the refusal** in the generator + keep `bun install` runs pointed at
  committed lockfiles (`bun install --frozen-lockfile` in the bootstrap — verify the flag
  against the repo's bun version before relying on it).
- [ ] **Step 4: Tests green + commit** —
  `feat(installer): validated-dependencies policy — refuse to install what review hasn't pinned`

---

### Task 4 (B4): `DISCLAIMER.md` — what the guards guarantee, and don't

**Files:**
- Create: `DISCLAIMER.md` (repo root)
- Modify: `README.md` (one link line; if no public README exists yet, note it for the release
  chantier instead)
- Modify: `skills/splash/SKILL.md` — ONE AI-assistance notice at EXPORT (see decision point)

**Decision point (Rémy):** the notice's placement and tone. Default implemented here = ONE
notice, at EXPORT delivery, short: « Vérifie les chiffres et la source avant publication —
Splash orchestre et garde mécaniquement, mais la responsabilité éditoriale reste au
journaliste. » Spotlight repeats it at every consequential gate; Splash's flow is shorter, one
placement avoids nagging. Confirm or adjust before executing this task.

- [ ] **Step 1: Write `DISCLAIMER.md`** — three sections, concrete (mirror Spotlight's
  honesty: "Treat `verified` as 'our automated pass found 2+ sources', not 'this is true'"):
  - **What the mechanical guards DO check** (with pointers): WCAG contrast on the real render ·
    claim-grounding of title/takeaway numbers against the data domain · channel size/format
    conformance · beat anchors against the data · source-preservation guards.
  - **What they DO NOT guarantee**: the editorial truth of the takeaway · the fitness of the
    source · data accuracy upstream of the CSV · legal right to publish.
  - **The journalist's responsibility line** (the notice text above, FR + EN).
- [ ] **Step 2: Add the EXPORT notice line to SKILL.md** (per the decision point) + extend the
  doc-parity test with one `toContain` for it.
- [ ] **Step 3: Commit** — `docs(release): DISCLAIMER — what the mechanical guards guarantee, and don't`

---

### Task 5: Gate

- [ ] **Step 1:** `bun run check` green; the new test files ride existing TEST_DIRS
  (`docs/installer`, `skills/splash`) — no new gate line.
