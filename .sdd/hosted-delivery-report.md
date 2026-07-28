# Hosted delivery, recorded — `feat/hosted-delivery-record`

The loop could assemble a spec for all six engines but could not RECORD a hosted delivery, so the
"Embed" hand-over form the project publicly promises was unreachable. A Datawrapper `interactive`
(chart or map) publishes and returns `form: "hosted"`, `files: []`, `publicUrl`; `artifactFileFor`
looked for a named file among none and `produce()` answered `engine-failed: no interactive artifact
in the delivery`, discarding a URL `render()` had correctly brought back.

Two branches papered over this differently — `dw-chart` gated its `interactive` pairing as
unbuildable in the assembler table, `map-dw` asserted its URL through `render()` instead of
`produce()`. Both stopgaps are gone.

---

## 1. The shape, and why

**A discriminated union with an OPTIONAL discriminant on the file branch**, in
`lib/loop/manifest.ts`:

```ts
const FileArtifactSchema = z.object({
  kind: z.literal("file").optional(),
  path: z.string(),
  sha256: z.string(),
  provenanceHash: z.string(),
  producedAt: z.string(),
});
const HostedArtifactSchema = z.object({
  kind: z.literal("hosted"),
  url: z.string(),
  provenanceHash: z.string(),
  producedAt: z.string(),
});
export const ArtifactRecordSchema = z.union([FileArtifactSchema, HostedArtifactSchema]);
```

plus two narrowing helpers, `isHostedArtifact(a)` and `fileArtifact(a): FileArtifactRecord |
undefined`.

**Union, not a `path`-optional record with a `url`.** The brief called the union "the honest
reading" and the loose record "smaller". Measured, the loose record is not actually smaller: it
types `path` as `string | undefined`, so every reader that passes it to `join()` or `readFileSync`
breaks at exactly the same call sites — the same ~50 sites `tsc` listed for the union. It costs the
same and buys less: a loose record lets a reader skip the check and reach `join(runDir, undefined)`,
which is the precise silent failure this tranche exists to prevent, and it admits a record with
neither `path` nor `url` as valid. The union makes TypeScript refuse `.path` until the reader has
said which shape it is holding, so the compiler enumerates the readers rather than trusting a grep.

**Why `kind` is optional on the file branch — the on-disk constraint.** I read `lib/loop/migrate.ts`
first, as instructed. It upgrades a manifest whose FIELDS changed meaning (v1 inline CSV → v2 frozen
path+hash, v2 dormant delivery slot dropped, v3 → v4 route+channel), and `readManifest` only calls
`migrate()` when `schemaVersion` differs from the current one — which is why `migrate.ts` itself
documents two fixes (`dropLegacyElementsDelivery`, `materializeDeliverables`) that are deliberately
NOT version-gated, because a version-gated fix would never run for the on-disk v4 manifests carrying
the hazard.

That is the reason this change needs no migration and no `schemaVersion` bump. Every manifest on
disk records a FILE and carries no `kind`; making the file branch's `kind` optional means those
parse unchanged and keep meaning exactly what they meant. Absence reads as "file" — the shape the
slot has always had, and one its required `path` already evidences. A hosted record must say so
explicitly. `produce()` now writes `kind: "file"` explicitly going forward.

Proven, not asserted — `lib/loop/hosted-artifact.test.ts`, always-on:
`"a manifest written before hosted deliveries existed still parses as a file artifact"` builds a
legacy record with no `kind`, round-trips it through `JSON` and `parseManifest`, and reads
`fileArtifact(a)?.path` back.

---

## 2. `produce()` records it

`lib/loop/produce.ts`, before the `artifactFileFor` lookup:

```ts
if (result.value.form === "hosted") {
  const url = result.value.publicUrl;
  if (!isHostedUrl(url)) return fail("engine-failed", …);
  return ok({ ...el, artifact: { kind: "hosted", url: url as string,
    provenanceHash: provenanceHash(run, el), producedAt: new Date().toISOString() } });
}
```

`isHostedUrl` is imported from `lib/core/contract.ts` — the existing definition of "resolvable as a
shape". No second https test was written. It is a belt over `assertDeliveredContract`, which already
ran the same predicate inside the dispatcher; repeating it at the ONE place that writes the record,
in the same words, is what keeps the two stages from drifting.

---

## 3. EVERY reader of the artifact record

Found by changing the shape first and letting `tsc --noEmit` enumerate them — 51 errors across 27
files, before any fix. Production readers first.

| # | Reader | Was | Now |
|---|---|---|---|
| 1 | `lib/loop/produce.ts` (writer) | wrote `{path, sha256, …}` only | writes `kind:"file"` explicitly, or the hosted record above |
| 2 | `lib/loop/preview.ts` `previewStep` (5 sites: `resolve(join(runDir, path))`, genre gate, read, re-hash, 3 messages) | would resolve `<runDir>/undefined` | **explicit refusal**, naming the URL: "delivered as a HOSTED embed (`<url>`) — the newsroom owns no file of it, so there is nothing on disk to present; open the URL to look at it". All four guarantees in this module's header are statements about exact bytes; none can be made about an embed |
| 3 | `lib/loop/verify.ts` `captureStep` (`artifactPath: join(runDir, path)`) | would hand the capture verb `<runDir>/undefined` | **records the gap** — `capture: {images: [], checks: [], unsupported: "…HOSTED embed (<url>) — the run owns no file of it…"}`. This is the SAME third answer `captureStep` already gives a format `lib/verify` cannot cover (video). Refusing would route the element back to `capture` forever and strand it; passing silently would publish it unverified. The recorded gap makes `review` emit its blocking `no-capture` finding, which only a written override can pass |
| 4 | `lib/loop/verify.ts` `reviewStep` | reads `el.artifact` for existence only | **unchanged** — it reads `el.capture`, never a path |
| 5 | `lib/loop/deliver.ts` (`artifactPath: join(runDir, path)` for the publish verb) | would hand a publisher `<runDir>/undefined` | **explicit refusal**: every publisher's payload is a file it copies/zips/uploads, and a hosted delivery is ALREADY published with the URL as the whole hand-over. Placed immediately after the `!el.artifact` guard, before the staleness check, so nothing is staged |
| 6 | `lib/loop/approve.ts` (4 sites: override record, sign-off document ×2, Ed25519 `sha256hex`) | would put `undefined` into a signed document | **explicit refusal** — the whole ceremony binds to `artifactSha256`, and there are no bytes to sign. `verifySignoff` now takes the resolved `FileArtifactRecord` as a parameter rather than re-reading `el.artifact!` |
| 7 | `lib/loop/manifest.ts` `previewCovers` | `el.artifact.sha256` | returns `false` for hosted — the same `false` an unproduced element gets. This is what keeps the approval gate from clearing on an embed nobody looked at |
| 8 | `lib/loop/manifest.ts` `assertReviewRecordInvariants` (preview-vs-artifact sha) | compared against `undefined` ⇒ would throw on EVERY hosted element | reads through `fileArtifact`; with no pair there is nothing to contradict |
| 9 | `lib/loop/manifest.ts` `approveElement` (`artifactSha256: el.artifact?.sha256 ?? ""`) | `undefined` | `fileArtifact(el.artifact)?.sha256 ?? ""` — the decision it reaches is "not previewed", which is the true one |
| 10 | `lib/loop/manifest.ts` `gateStateOf`, `stalenessOf` | `provenanceHash` only | **unchanged** — both branches carry it, so a hosted artifact is `produced` when fresh and `stale` when re-angled (pinned by test) |
| 11 | `lib/loop/resume.ts` `resumeReport` validation | `existsSync` + `hashFile` on an absent path | new `ElementValidation.artifact` value **`"hosted"`**. Staleness is still checked FIRST — a re-angled run's published embed is as stale as a re-angled run's PNG |
| 12 | `lib/loop/resume.ts` `verificationOf` (`artifactSha256`) | `undefined` | `fileArtifact(…)?.sha256 ?? ""` |
| 13 | `lib/loop/request-delivery.ts` | existence + staleness only, no path read | **unchanged, verified** — it never touches `.path`/`.sha256` |
| 14 | `lib/host/drive.ts` `staleWarning` (`before.artifact != null`) | existence only | **unchanged, verified** |
| 15 | `lib/loop/migrate.ts` `dropLegacyElementsDelivery` (`d.artifact.path`) | — | **untouched, and deliberately**: that is `DeliveryRecord.artifact`, a `HashRef` for a published package — a different record that did not change |
| 16 | `lib/verify/**` (`approval.ts`, `preview.ts`) | take `artifactSha256: string` as a plain parameter | **unchanged, verified** — they never see the record |
| 17 | 21 test files (~40 sites) | `x.artifact!.path` / `.sha256` | `fileArtifact(x.artifact)!.…` |

Three sites the mechanical rewrite caught wrongly — `record.artifact` / `packageRec.artifact` in
`host/journey.test.ts`, `loop/driver.test.ts`, `source/wiring-proof.test.ts` — are DELIVERY records
(`HashRef`), not element artifacts; reverted by hand.

**Net effect on the chain:** a hosted element reaches `produced`, records `"hosted"` in the resume
report, gets a capture GAP, gets a review carrying the blocking `no-capture` finding, and then stops
— `preview`, `approve` and `deliver` each refuse it by name with the URL in the sentence. That is a
loud dead end, not a silent one, and it is deliberate (see §6).

---

## 4. Stopgaps removed

**`lib/loop/assemble/index.ts` — the `dw-chart` entry.** Only the format clause was removed:

- `supports`: dropped `(format === undefined || format === "static")` and the now-unused `format`
  parameter.
- `declines`: dropped the `format !== undefined && format !== "static" ? "…HOSTED embed…"` branch
  and the now-unused `format` parameter.
- **`isRowDriven` is untouched, character for character** — `!isRowDriven(t as ChartType)` in
  `supports` and the whole `: isRowDriven(t as ChartType) ? \`a Datawrapper "${t}" grows its
  height…\`` branch in `declines`. The only edit adjacent to it is the trailing `&&` on the
  `supports` line, which is unavoidable: the format clause was the LAST conjunct, so removing it
  necessarily changes the preceding line's terminator. Diff verified by eye (see §5 output).

**`lib/loop/map-dw-e2e.test.ts` — the `render()` detour.** Its interactive proof now drives
`produce()`.

**`map-dw`'s table entry needed nothing.** `supportsMapDwType(nativeType)` (`lib/loop/assemble/map-dw.ts:73`)
takes no format argument and never restricted by format — map-dw's `interactive` was already
reachable through the table, and was blocked one level down in `produce()`. Checked, not assumed.

**Two comment blocks stating the stopgap as fact** were corrected rather than left to rot:
`lib/loop/buildable.ts`'s `isLoopBuildable` `format` doc and `unbuildableEngineReason`'s header (the
latter re-pointed at the unknown-type case, which neither agent is removing).

---

## 5. Every command, with its real output

### RED first (TDD)

`lib/loop/hosted-artifact.test.ts` written before any implementation:

```
$ bun test lib/loop/hosted-artifact.test.ts
SyntaxError: Export named 'isHostedArtifact' not found in module '…/lib/loop/manifest.ts'
 0 pass / 1 fail / 1 error
```

Bun's runtime DID fail as predicted, so `tsc` was not needed as RED evidence here.

(A first attempt failed earlier still, on `Cannot find module '@noble/hashes/sha2.js'` — the
worktree had no `node_modules`; `bun install` fixed that before the real RED.)

### Baseline, taken on the untouched branch before trusting any number

```
$ git stash -u && bun test lib
 1158 pass / 1 skip / 122 fail / 39 errors      Ran 1281 tests across 154 files
$ cd lib && bunx tsc --noEmit | grep -c '^\.\./skills/'
 169
```

Those 122 failures and 169 tsc errors were environmental — the fresh worktree had no engine
dependencies (`d3-scale`, `react`, `@turf/turf`), so every subprocess/CLI test and every
`skills/**` type reference failed. I installed them (`bun install` in `skills/chart-native` and
`skills/map-native`, both gitignored) and re-baselined, which is why the final numbers are clean
rather than "same as baseline".

Mid-way, with the shape changed and the stopgap removed, the diff against that baseline was exactly
2 new failures — both in `lib/loop/assemble/index.test.ts`, both the stopgap's own tests — plus a
2-in/2-out churn inside `lib/verify/capture-html.test.ts`. That file passes 14/14 in isolation on
three consecutive runs (checked), and the baseline failed 2 different tests from the same block:
parallel browser contention, not a regression.

### Verification 1 — `bunx tsc --noEmit`

```
$ cd /Users/rmdms/Sites/Professional/splash-hosted/lib && bunx tsc --noEmit
TSC_EXIT=0
```

(no output — clean, including the previously-failing `../skills/**` references)

### Verification 2 — `bun test lib`

```
$ cd /Users/rmdms/Sites/Professional/splash-hosted && bun test lib
bun test v1.3.5 (1e86cebd)
 1554 pass
   17 skip
    0 fail
 7190 expect() calls
Ran 1571 tests across 155 files. [300.69s]
```

`lib/host/journey.test.ts` passes (the environmental engine-dep failure the brief warned about is
resolved by the two `bun install`s above).

### Verification 3 — the gated Datawrapper proofs

```
$ SPLASH_DW_E2E=1 bun test lib/loop/dw-chart-e2e.test.ts lib/loop/map-dw-e2e.test.ts
bun test v1.3.5 (1e86cebd)

lib/loop/dw-chart-e2e.test.ts:
[dw-chart-e2e] recorded hosted delivery https://datawrapper.dwcdn.net/VNYJx/1/

lib/loop/map-dw-e2e.test.ts:
[map-dw-e2e] IHDR 1200x676 — article-web media box 1200x675
[map-dw-e2e] recorded hosted delivery https://datawrapper.dwcdn.net/955W8/1/

 6 pass
 0 fail
 21 expect() calls
Ran 6 tests across 2 files. [20.45s]
```

`bun run check` was NOT run, as instructed.

---

## 6. The URLs actually fetched

Each proof publishes a fresh chart, so the URL differs per run. From the final verification run:

| Proof | URL recorded on the persisted manifest | Fetched |
|---|---|---|
| `dw-chart` interactive | `https://datawrapper.dwcdn.net/VNYJx/1/` | 200, body contains `<html` |
| `map-dw` interactive | `https://datawrapper.dwcdn.net/955W8/1/` | 200, body > 500 bytes |

From the earlier confirming run: `https://datawrapper.dwcdn.net/bqHNf/1/` and
`https://datawrapper.dwcdn.net/zisKk/1/`, both 200.

**The URL is read off the RUN MANIFEST, not off the in-memory result.** Both proofs now:
`produce()` → assert `fileArtifact(result.value.artifact)` is `undefined` (no file was recorded) →
`writeManifest(join(runDir, "run.json"), …)` → `readManifest(…)` → `isHostedArtifact(recorded)` →
`fetch(recorded.url)`. Going through the file is deliberate: reading the in-memory object would
prove `produce()` composed a record, whereas the round trip proves the manifest can HOLD it —
`writeManifest` runs `assertInvariants` on the way out and `readManifest` parses back through the
schema, so a hosted record that could not survive either fails here rather than at some later
reader's feet.

Each file's always-on fixture-validity half is untouched and still ungated (`assembleDwChart` →
`validateChartSpec`, `assembleMapDw` → `validateMapSpec`).

---

## 7. What I could NOT close

1. **The verification chain dead-ends on a hosted artifact.** `preview` → `approve` → `deliver` each
   refuse it explicitly, so a hosted element can be produced and recorded but never delivered
   through the loop's own publisher path. This is the honest state of the capability, not an
   oversight: presenting, re-hashing, signing and re-publishing a URL the run never downloaded are
   four separate capabilities (a preview record that means something for a URL; a capture that
   fetches a live page from inside a verb, which invariant I5 would have to be revisited for; an
   approval bound to something other than bytes; a publisher that forwards a URL instead of shipping
   a file). Each refusal names the URL so it is actionable. **The natural next tranche.**

2. **`ElementValidation.artifact` gained a `"hosted"` value.** Any host UI switching on that union
   exhaustively will need the new arm. `tsc` is clean across `lib/`, so nothing in this repo is
   affected, but a downstream consumer outside `lib/` would be.

3. **Merge hazard with `../splash-rowdriven`, flagged rather than avoided.** Both branches edit the
   same 3-line `supports` expression and the same `declines` ternary in the `dw-chart` entry — that
   agent removes the `isRowDriven` clause, I removed the format clause. A conflict in that hunk is
   structurally unavoidable (my clause was the last conjunct, so its removal changes the `&&` on
   their line). I kept the `isRowDriven` text byte-identical so the resolution is mechanical: take
   both removals. I also re-pointed two tests that needed a live "declined pairing" case at the
   **unknown-type** branch (`beeswarm`) rather than at the row-driven one, specifically so their
   branch does not have to fix my tests: `lib/loop/assemble/index.test.ts`
   ("the refusal for a declined pairing…") and `lib/brain/eligibility.test.ts`.

4. **Two tests changed meaning** because their subject was the stopgap:
   `lib/loop/assemble/index.test.ts` "an engine wired in one format is not buildable in another" →
   "both of a hosted engine's formats are buildable", and `lib/brain/eligibility.test.ts` "a dw-chart
   chart is marked in the format the loop cannot deliver" → "both of a hosted engine's formats are
   offered clean, while an unbuildable type still marks". Both keep guarding the property that
   mattered (the table's sentence beats the generic fallback; `buildabilityMark` reads more than the
   engine name) on a case that is still live.

5. **Two `bun install` runs were needed** (`skills/chart-native`, `skills/map-native`) for the engine
   registry to import at all. Both write into gitignored `node_modules`; nothing is committed. A
   fresh worktree needs them before `bun test lib` means anything.
