# Inspiration 02a — Engine: INFOVIZ_TOKEN as a paste record, and the inspiration-search operation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Engine (`bsig`) registers `INFOVIZ_TOKEN` as an ordinary paste record credential — no email-flow acquisition, no desktop Connect UI — validated against Infoviz `/auth/status`, and hands it to one new sealed Splash operation, `inspiration-search`. Indicator Labs offers it in Splash "Connected services" with the same paste prompt every other record credential already has.

**Architecture:** The registry (`bsig/internal/keys/registry.go`) gains one more `Entry`: `StorageRecord`, `SensitivitySecret`, validated by `ValidateInfovizRecord` through the existing `providerGET`. No new package, no new verb, no new IPC channel, no new UI: the journalist pastes the token exactly as they paste `DATAWRAPPER_TOKEN` or `CLOUDFLARE_API_TOKEN` today (the token itself comes from the Splash inspiration page's "Copy token for Indicator Labs" button, built in Splash, not Engine). `inspiration-search` is one more entry in `splashOperations`, one closed request contract (`{parameters:{query}}`, non-empty, ≤ 1000 code points, no story fields, no Cloudflare account), and one `execpolicy` allowlist line. Desktop picks the credential up through the two id lists it already reads (`RECORD_KEY_IDS`, `SPLASH_KEY_IDS`) and one allowlist entry for the acquisition URL.

**Tech Stack:** Go (bsig), TypeScript/Vitest (desktop lists only)

**Spec:** `docs/superpowers/specs/2026-09-13-inspiration-journey-design.md` (Splash repo, worktree /Users/rmdms/Sites/Professional/splash/feat-inspiration) — Part 2a.

**Supersedes:** `2026-09-14-inspiration-02a-engine-bsig.md` and `2026-09-14-inspiration-02a-engine-desktop.md`.

## Global Constraints

- Repository: `/Users/rmdms/Sites/Professional/engine` (remote `origin` = `https://github.com/buriedsignals/engine`); Go commands run from `/Users/rmdms/Sites/Professional/engine/bsig`, desktop commands from `/Users/rmdms/Sites/Professional/engine/desktop`.
- Branch: `feat/infoviz-token-record`, created from `origin/main` (measured at `30485bc8` on 2026-09-15; a newer head is fine — note its SHA in Task 0).
- Never push, never open a PR, never `jj git push`: pushing to `buriedsignals/engine` requires Rémy's explicit go; review is Tom's, the signed Indicator Labs release is triggered by Tom.
- AGENTS.md says "jj colocated, commit straight to `main`. Push with `jj git push`." — overridden here: `jj` is not installed and the clone has no `.jj`; the spec's delivery is a branch → PR reviewed by Tom. Use plain `git` on the branch.
- Code, comments, commit messages in English. No mention of Claude or Anthropic anywhere; no `Co-Authored-By` and no `Claude-Session` trailer in any commit this plan makes.
- Commit with an explicit pathspec after `git add` (`git commit -m "…" -- <paths>`), never a bare `git commit` — a shared working tree can carry another agent's staged work.
- `AGENTS.md` (root), binding: "Treat Tom's claims, figures, assumptions, framing, and preferred solution as unverified inputs … Never claim completion from intention or code inspection alone." Every task ends on a command's output, not on reading.
- `bsig/AGENTS.md`, binding: "The emitter is the only stdout writer; everything it emits is redacted and teed to `<baseDir>/audit.log`. Secrets enter via stdin or keychain only — never argv, sealed plans, manifests, or config files."
- `bsig/AGENTS.md`, binding: "`internal/execpolicy` is the only path to exec; new invocations are deliberate edits to `DefaultTable()`."
- `bsig/AGENTS.md`, binding: "Exit codes: 0 ok, 1 fail, 2 partial-with-rollback, 3 entitlement-denied, 4 usage — typed errors implement `ExitCode() int`." and "Go module dependency additions are security-review events." (this plan adds none).
- `docs/packages/auth-standard.md`: "It is **not** a shared auth library." — `ValidateInfovizRecord` reuses the existing `providerGET` helper already shared by every record validator; `internal/auth` (Navigator) is not touched.
- Test commands (Go): focused `cd /Users/rmdms/Sites/Professional/engine/bsig && go test -count=1 -run '<Pattern>' ./<pkg>/`; gate `cd /Users/rmdms/Sites/Professional/engine/bsig && gofmt -l . && go vet ./... && go test -race -count=1 ./...`.
- Test commands (desktop, Node 22.x ≥ 22.22.0 per `.nvmrc`): one file `cd /Users/rmdms/Sites/Professional/engine/desktop && npx vitest run <path>`; full suite `npm test` (note: `src/preload.test.ts` is not in `test:unit`'s file list, but this plan does not touch preload); types `npm run typecheck`.
- Never pipe a test run into `tail`/`tee` without capturing the exit code (`…; echo "exit=$?"`): a pipe hides the real status.

---

## Task 0: Branch from origin/main and record the baseline (Go and desktop)

**Files:** none modified.

**Interfaces:** Produces the branch `feat/infoviz-token-record` and two baseline files, `${TMPDIR:-/tmp}/engine-infoviz-baseline-go.txt` and `${TMPDIR:-/tmp}/engine-infoviz-baseline-desktop.txt`, that Task 6 compares against.

- [ ] **Step 1: Confirm the clone is clean, including ignored files**

```bash
git -C /Users/rmdms/Sites/Professional/engine status --porcelain --ignored; echo "exit=$?"
git -C /Users/rmdms/Sites/Professional/engine stash list | head -3
git -C /Users/rmdms/Sites/Professional/engine worktree list
```

Expected: the first command prints nothing but `exit=0`. If it prints any path, STOP and report the paths to Rémy — nothing there may be lost.

- [ ] **Step 2: Fetch and branch**

```bash
git -C /Users/rmdms/Sites/Professional/engine fetch origin
git -C /Users/rmdms/Sites/Professional/engine switch -c feat/infoviz-token-record origin/main
git -C /Users/rmdms/Sites/Professional/engine log --oneline -1
```

Expected: `Switched to a new branch 'feat/infoviz-token-record'`; the log line is `origin/main`'s head (`30485bc8 …` at planning time; a newer head is fine — note its SHA in the task report).

- [ ] **Step 3: Read the binding rules on the branch**

```bash
sed -n '1,80p' /Users/rmdms/Sites/Professional/engine/bsig/AGENTS.md
```

Expected: the "Binding contracts" section quoted in Global Constraints is present unchanged. If it changed, STOP and report the difference.

- [ ] **Step 4: Go baseline**

```bash
cd /Users/rmdms/Sites/Professional/engine/bsig && gofmt -l . ; go vet ./... ; echo "vet exit=$?"
cd /Users/rmdms/Sites/Professional/engine/bsig && go test -race -count=1 ./... > "${TMPDIR:-/tmp}/engine-infoviz-baseline-go.txt" 2>&1; echo "test exit=$?"
grep -E '^(--- FAIL|FAIL|panic:)' "${TMPDIR:-/tmp}/engine-infoviz-baseline-go.txt"
```

Expected: `vet exit=0`. Record `test exit=` and every `--- FAIL`/`FAIL` line verbatim in the task report: those are ambient failures (sibling checkouts such as `/Users/rmdms/Sites/Professional/mycroft` and `/Users/rmdms/Sites/Professional/spotlight` change what some tests compare against instead of skipping). This plan must not add a failure to that list.

- [ ] **Step 5: Desktop baseline**

```bash
cd /Users/rmdms/Sites/Professional/engine/desktop && node --version
cd /Users/rmdms/Sites/Professional/engine/desktop && npm ci
cd /Users/rmdms/Sites/Professional/engine/desktop && npm run typecheck; echo "typecheck exit=$?"
cd /Users/rmdms/Sites/Professional/engine/desktop && npm test > "${TMPDIR:-/tmp}/engine-infoviz-baseline-desktop.txt" 2>&1; echo "test exit=$?"
grep -E '(FAIL|✗|failed)' "${TMPDIR:-/tmp}/engine-infoviz-baseline-desktop.txt" | head -30
```

Expected: `v22.x` with x ≥ 22 (switch with the installed version manager if not; if none is available, STOP and report); `npm ci` completes; `typecheck exit=0`. Record `test exit=` and every failing test name verbatim: those are the baseline this plan's Task 5 must not add to.

No commit.

---

## Task 1: `ValidateInfovizRecord`

**Files:**
- Modify: `bsig/internal/keys/validators.go`
- Test: `bsig/internal/keys/validators_test.go`

**Interfaces:**
- Consumes: `providerGET(ctx, client, rawURL, bearer string) ([]byte, error)`, `ValidationContext.empty()`, `InvalidKeyError`, `RateLimitedError`, `ValidationUnavailableError`, `InsufficientEvidenceError` (all in `internal/keys` on `origin/main`); `roundTripFunc` (already defined in `validators_test.go`).
- Produces: `func ValidateInfovizRecord(ctx context.Context, client *http.Client, baseURL, candidate string, validationContext ValidationContext) (ValidationReceipt, error)` — a `RecordValidator`. Receipt on success: `{Status: "verified", Dimensions: [{ID: "authenticated-account-access", Status: "verified"}]}`. Errors: context supplied → `*InsufficientEvidenceError`; 401/403 or 200 with `authenticated: false` → `*InvalidKeyError`; 429 → `*RateLimitedError`; other status, transport failure, or a 200 body without a boolean `authenticated` → `*ValidationUnavailableError`.

- [ ] **Step 1: Evidence — the deployed host answers a Go client**

`providerGET` sends Go's default `User-Agent`. Confirm the host does not refuse it (anonymous, read-only request; no token involved):

```bash
curl -s -o /dev/null -w '%{http_code}\n' -A 'Go-http-client/1.1' https://infoviz.design/auth/status
```

Expected: `200`. If it prints `403` or any other code, STOP and report: the validator would need a `User-Agent` that `providerGET` cannot set today.

- [ ] **Step 2: Write the failing tests**

Append to `bsig/internal/keys/validators_test.go`:

```go
func TestInfovizRecordValidatorRequiresAnAuthenticatedAccount(t *testing.T) {
	var gotMethod, gotPath, gotAuth string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotMethod, gotPath, gotAuth = r.Method, r.URL.Path, r.Header.Get("Authorization")
		_, _ = w.Write([]byte(`{"authenticated":true,"has_session":false,"email":"editor@example.org","queries_used":0,"queries_remaining":10,"daily_limit":10,"resets_at":"2026-09-15T00:00:00+00:00"}`))
	}))
	defer srv.Close()

	receipt, err := ValidateInfovizRecord(context.Background(), NewValidationClient(), srv.URL+"/", testKey, ValidationContext{})
	if err != nil {
		t.Fatal(err)
	}
	if gotMethod != http.MethodGet || gotPath != "/auth/status" || gotAuth != "Bearer "+testKey {
		t.Fatalf("request = %s %s auth=%q", gotMethod, gotPath, gotAuth)
	}
	want := ValidationDimension{ID: "authenticated-account-access", Status: DimensionVerified}
	if receipt.Status != ValidationVerified || len(receipt.Dimensions) != 1 || receipt.Dimensions[0] != want || receipt.Evidence != nil {
		t.Fatalf("receipt = %+v", receipt)
	}
}

func TestInfovizRecordValidatorRefusesAnonymousRejectedAndUnreadableAnswers(t *testing.T) {
	isInvalid := func(err error) bool {
		var target *InvalidKeyError
		return errors.As(err, &target)
	}
	isRateLimited := func(err error) bool {
		var target *RateLimitedError
		return errors.As(err, &target)
	}
	isUnavailable := func(err error) bool {
		var target *ValidationUnavailableError
		return errors.As(err, &target)
	}
	for _, tc := range []struct {
		name string
		code int
		body string
		want func(error) bool
	}{
		{"anonymous status", http.StatusOK, `{"authenticated":false,"queries_remaining":5,"daily_limit":5}`, isInvalid},
		{"invalid bearer", http.StatusUnauthorized, `{"error":"invalid_token"}`, isInvalid},
		{"forbidden", http.StatusForbidden, `{}`, isInvalid},
		{"rate limited", http.StatusTooManyRequests, `{}`, isRateLimited},
		{"server error", http.StatusInternalServerError, ``, isUnavailable},
		{"no authenticated field", http.StatusOK, `{"daily_limit":10}`, isUnavailable},
		{"authenticated is not a boolean", http.StatusOK, `{"authenticated":"true"}`, isUnavailable},
		{"not json", http.StatusOK, `<html>`, isUnavailable},
	} {
		t.Run(tc.name, func(t *testing.T) {
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(tc.code)
				_, _ = w.Write([]byte(tc.body))
			}))
			defer srv.Close()
			receipt, err := ValidateInfovizRecord(context.Background(), NewValidationClient(), srv.URL, testKey, ValidationContext{})
			if !tc.want(err) || receipt.Status != "" {
				t.Fatalf("ValidateInfovizRecord = (%+v, %v)", receipt, err)
			}
			if strings.Contains(err.Error(), testKey) {
				t.Fatalf("error leaks the candidate: %q", err)
			}
		})
	}
}

func TestInfovizRecordValidatorRefusesValidationContextBeforeNetwork(t *testing.T) {
	client := &http.Client{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
		t.Fatal("Infoviz validation reached the network with validation context")
		return nil, nil
	})}
	for _, validationContext := range []ValidationContext{
		{PagesScopeAttested: true},
		{CloudflareAccountID: "0123456789abcdef0123456789abcdef"},
		{OriginRestrictionsAttested: true},
	} {
		_, err := ValidateInfovizRecord(context.Background(), client, "https://infoviz.invalid", testKey, validationContext)
		var insufficient *InsufficientEvidenceError
		if !errors.As(err, &insufficient) {
			t.Errorf("context %+v: err=%v, want InsufficientEvidenceError", validationContext, err)
		}
	}
}
```

In the same file, extend the map inside `TestRecordValidatorsDoNotAcceptArbitrary200Bodies` — replace:

```go
		"datawrapper": func() error {
			_, err := ValidateDatawrapperRecord(context.Background(), NewValidationClient(), srv.URL, testKey, ValidationContext{})
			return err
		},
	} {
```

with:

```go
		"datawrapper": func() error {
			_, err := ValidateDatawrapperRecord(context.Background(), NewValidationClient(), srv.URL, testKey, ValidationContext{})
			return err
		},
		"infoviz": func() error {
			_, err := ValidateInfovizRecord(context.Background(), NewValidationClient(), srv.URL, testKey, ValidationContext{})
			return err
		},
	} {
```

- [ ] **Step 3: Run and watch it fail**

```bash
cd /Users/rmdms/Sites/Professional/engine/bsig && go test -count=1 -run 'Infoviz|TestRecordValidatorsDoNotAcceptArbitrary200Bodies' ./internal/keys/; echo "exit=$?"
```

Expected: build failure `undefined: ValidateInfovizRecord`, `exit=1`.

- [ ] **Step 4: Implement**

In `bsig/internal/keys/validators.go`, insert after the closing brace of `ValidateDatawrapperRecord`:

```go
// ValidateInfovizRecord asks Infoviz whose Bearer this is. /auth/status also
// answers 200 to anonymous callers, so only an explicit `authenticated: true`
// proves a signed-in account; a rejected or expired token is answered 401
// and providerGET maps it to InvalidKeyError.
func ValidateInfovizRecord(ctx context.Context, client *http.Client, baseURL, candidate string, validationContext ValidationContext) (ValidationReceipt, error) {
	if !validationContext.empty() {
		return ValidationReceipt{}, &InsufficientEvidenceError{Reason: "INFOVIZ_TOKEN does not accept validation context"}
	}
	body, err := providerGET(ctx, client, strings.TrimRight(baseURL, "/")+"/auth/status", candidate)
	if err != nil {
		return ValidationReceipt{}, err
	}
	var status struct {
		Authenticated *bool `json:"authenticated"`
	}
	if err := json.Unmarshal(body, &status); err != nil || status.Authenticated == nil {
		return ValidationReceipt{}, &ValidationUnavailableError{Reason: "Infoviz validation returned an unreadable account status"}
	}
	if !*status.Authenticated {
		return ValidationReceipt{}, &InvalidKeyError{Reason: "Infoviz did not recognise the token as a signed-in account"}
	}
	return ValidationReceipt{
		Status:     ValidationVerified,
		Dimensions: []ValidationDimension{{ID: "authenticated-account-access", Status: DimensionVerified}},
	}, nil
}
```

- [ ] **Step 5: Run and watch it pass**

```bash
cd /Users/rmdms/Sites/Professional/engine/bsig && gofmt -l internal/keys && go test -count=1 -run 'Infoviz|TestRecordValidatorsDoNotAcceptArbitrary200Bodies' ./internal/keys/; echo "exit=$?"
```

Expected: `gofmt -l` prints nothing; `ok  github.com/buriedsignals/engine/internal/keys`, `exit=0`.

- [ ] **Step 6: Mutation check**

In `ValidateInfovizRecord`, replace `if !*status.Authenticated {` with `if false && !*status.Authenticated {`. Run the Step 5 command.
Expected: `TestInfovizRecordValidatorRefusesAnonymousRejectedAndUnreadableAnswers/anonymous_status` FAILS. Revert the line exactly, re-run Step 5, expect `exit=0`.

- [ ] **Step 7: Commit**

```bash
git -C /Users/rmdms/Sites/Professional/engine add bsig/internal/keys/validators.go bsig/internal/keys/validators_test.go
git -C /Users/rmdms/Sites/Professional/engine commit -m "keys: validate an Infoviz token only when /auth/status reports a signed-in account" -- bsig/internal/keys/validators.go bsig/internal/keys/validators_test.go
```

---

## Task 2: The `INFOVIZ_TOKEN` registry entry (an ordinary paste record)

**Files:**
- Modify: `bsig/internal/keys/registry.go`
- Test: `bsig/internal/keys/keys_test.go`, `bsig/cmd/bsig/keys_verb_test.go`

**Interfaces:**
- Consumes: `ValidateInfovizRecord` (Task 1).
- Produces (Go): no new type — `INFOVIZ_TOKEN` is one more `Entry{StorageKind: StorageRecord, …}` in `Registry()`, acquired the same way as `DATAWRAPPER_TOKEN` and `CLOUDFLARE_API_TOKEN` (`bsig keys set|replace INFOVIZ_TOKEN`, the paste path). No `Acquisition` field, no acquisition metadata, no new verb.
- Produces (JSON, `bsig --json keys list` → `data.keys[i].metadata`): `"id":"INFOVIZ_TOKEN","name":"Infoviz account","purpose":"Raises Splash inspiration searches from 5 to 10 a day.","capability":"Splash inspiration search","acquisitionUrl":"https://splash.buriedsignals.com/inspiration.html","requiredPermissions":["A signed-in Infoviz account"],"sensitivity":"secret","storageKind":"record","validatorPolicy":"authenticated-account-request","replacementBehavior":"validate-before-atomic-replacement","validatorAvailable":true,"candidateMaxBytes":1024,"contractVersion":1`.

Why `Capability` and `RequiredPermissions` are set although the spec's Part 2a bullet does not name them: `TestRegistryInventory` fails any record entry whose `Purpose` or `AcquisitionURL` is empty (`keys_test.go`), and the desktop renders both plus `Capability`/`RequiredPermissions` on the credential card. An Infoviz token has no scopes; the one requirement a journalist must meet is a signed-in account, so that is the single permission line — matching the spec's binding registry values verbatim.

- [ ] **Step 1: Write the failing tests**

In `bsig/internal/keys/keys_test.go`, replace:

```go
	recordIDs := []string{"MAPTILER_KEY", "DATAWRAPPER_TOKEN", "CLOUDFLARE_API_TOKEN"}
```

with:

```go
	recordIDs := []string{"MAPTILER_KEY", "DATAWRAPPER_TOKEN", "CLOUDFLARE_API_TOKEN", "INFOVIZ_TOKEN"}
```

Append to `bsig/internal/keys/keys_test.go`:

```go
func TestInfovizTokenIsARecordCredentialValidatedAgainstInfoviz(t *testing.T) {
	e, ok := Lookup(Registry(), "INFOVIZ_TOKEN")
	if !ok {
		t.Fatal("registry missing INFOVIZ_TOKEN")
	}
	if e.Name != "Infoviz account" ||
		e.Purpose != "Raises Splash inspiration searches from 5 to 10 a day." ||
		e.Capability != "Splash inspiration search" ||
		e.AcquisitionURL != "https://splash.buriedsignals.com/inspiration.html" ||
		e.BaseURL != "https://infoviz.design" ||
		e.ValidatorPolicy != "authenticated-account-request" ||
		e.ReplacementBehavior != "validate-before-atomic-replacement" ||
		e.Sensitivity != SensitivitySecret || e.StorageKind != StorageRecord ||
		len(e.RequiredPermissions) != 1 || e.RequiredPermissions[0] != "A signed-in Infoviz account" ||
		len(e.Aliases) != 0 || e.Validate != nil {
		t.Fatalf("INFOVIZ_TOKEN = %+v", e)
	}
	if reflect.ValueOf(e.ValidateRecord).Pointer() != reflect.ValueOf(ValidateInfovizRecord).Pointer() {
		t.Fatal("INFOVIZ_TOKEN must validate through ValidateInfovizRecord")
	}
}
```

In `bsig/cmd/bsig/keys_verb_test.go`, inside `TestLegacyRawVerbsRejectEverySplashRecordIDBeforeStoreAccess`, replace:

```go
	for _, id := range []string{"MAPTILER_KEY", "DATAWRAPPER_TOKEN", "CLOUDFLARE_API_TOKEN"} {
```

with:

```go
	for _, id := range []string{"MAPTILER_KEY", "DATAWRAPPER_TOKEN", "CLOUDFLARE_API_TOKEN", "INFOVIZ_TOKEN"} {
```

- [ ] **Step 2: Run and watch it fail**

```bash
cd /Users/rmdms/Sites/Professional/engine/bsig && go test -count=1 -run 'TestRegistryInventory|TestInfovizTokenIsARecordCredentialValidatedAgainstInfoviz|TestLegacyRawVerbsRejectEverySplashRecordIDBeforeStoreAccess' ./internal/keys/ ./cmd/bsig/; echo "exit=$?"
```

Expected: `TestRegistryInventory` fails on the entry count (`registry has N entries, want N-1`); `TestInfovizTokenIsARecordCredentialValidatedAgainstInfoviz` fails (`registry missing INFOVIZ_TOKEN`); `TestLegacyRawVerbsRejectEverySplashRecordIDBeforeStoreAccess` fails with `t.Fatal(id)` for `INFOVIZ_TOKEN`; `exit=1`.

- [ ] **Step 3: Implement**

In `bsig/internal/keys/registry.go`, in `Registry()`, insert after the `CLOUDFLARE_API_TOKEN` entry (before the closing `}` of the slice):

```go
		{
			// An ordinary paste record: the journalist copies the token from
			// the Splash inspiration page's "Copy token for Indicator Labs"
			// button and pastes it here, like DATAWRAPPER_TOKEN or
			// CLOUDFLARE_API_TOKEN — no email-flow acquisition, no Connect UI.
			ID: "INFOVIZ_TOKEN", Name: "Infoviz account",
			Purpose:             "Raises Splash inspiration searches from 5 to 10 a day.",
			Capability:          "Splash inspiration search",
			AcquisitionURL:      "https://splash.buriedsignals.com/inspiration.html",
			RequiredPermissions: []string{"A signed-in Infoviz account"},
			Sensitivity:         SensitivitySecret, StorageKind: StorageRecord,
			ValidatorPolicy:     "authenticated-account-request",
			ReplacementBehavior: "validate-before-atomic-replacement",
			BaseURL:             "https://infoviz.design", ValidateRecord: ValidateInfovizRecord,
		},
```

- [ ] **Step 4: Run and watch it pass**

```bash
cd /Users/rmdms/Sites/Professional/engine/bsig && gofmt -w internal/keys/registry.go && gofmt -l internal/keys cmd/bsig && go test -count=1 ./internal/keys/ ./cmd/bsig/ ./internal/run/; echo "exit=$?"
```

Expected: `gofmt -l` prints nothing; the three packages `ok`, `exit=0` (`cmd/bsig` may show only the ambient failures recorded in Task 0; no new one).

- [ ] **Step 5: Mutation check**

In the `INFOVIZ_TOKEN` entry, replace `ValidateRecord: ValidateInfovizRecord,` with `ValidateRecord: ValidateDatawrapperRecord,`. Run:

```bash
cd /Users/rmdms/Sites/Professional/engine/bsig && go test -count=1 -run 'TestInfovizTokenIsARecordCredentialValidatedAgainstInfoviz' ./internal/keys/; echo "exit=$?"
```

Expected: FAIL. Revert the line, re-run, expect `exit=0`.

- [ ] **Step 6: Commit**

```bash
git -C /Users/rmdms/Sites/Professional/engine add bsig/internal/keys/registry.go bsig/internal/keys/keys_test.go bsig/cmd/bsig/keys_verb_test.go
git -C /Users/rmdms/Sites/Professional/engine commit -m "keys: register INFOVIZ_TOKEN as an ordinary paste record" -- bsig/internal/keys/registry.go bsig/internal/keys/keys_test.go bsig/cmd/bsig/keys_verb_test.go
```

---

## Task 3: Splash operation `inspiration-search`

**Files:**
- Modify: `bsig/internal/run/splash.go`, `bsig/internal/execpolicy/policy.go`
- Test: `bsig/internal/run/splash_test.go`

**Interfaces:**
- Consumes: `INFOVIZ_TOKEN` in `keys.Registry()` (Task 2 — `AcquireForOperation` resolves IDs against the canonical registry); on `origin/main`: `splashOperation`, `providerSplashTimeout` (45 s), `decodeSplashParameters`, `validateSplashOperationRequest`, `execpolicy.DefaultTable()`.
- Produces: `bsig run splash inspiration-search` with stdin `{"parameters":{"query":"<1–1000 characters>"}}`; credentials `[INFOVIZ_TOKEN]` injected as the env var `INFOVIZ_TOKEN`; child logical args `["inspiration-search"]`; timeout 45 s; request forwarded to Splash's runner on stdin with the Engine-owned `canonicalStoriesRoot`/`canonicalWorkspaceRoot` fields added (as for every story-less operation). A missing record → `*run.MissingKeyError{KeyID: "INFOVIZ_TOKEN"}`. Go: `type splashInspirationParameters struct { Query string `json:"query"` }`, `const maxSplashInspirationQueryRunes = 1000`.

Why runes: Splash's `search.mjs` refuses `subject.length > 1000` (UTF-16 code units) before any call, so every query Splash sends has ≤ 1000 code points; Engine counting code points never refuses a query Splash accepted.

- [ ] **Step 1: Write the failing tests**

In `bsig/internal/run/splash_test.go`, insert after the `mapTilerReceipt` function:

```go
func infovizReceipt() keys.ValidationReceipt {
	return keys.ValidationReceipt{
		Status: keys.ValidationVerified, ValidatedAt: time.Date(2026, 9, 14, 10, 0, 0, 0, time.UTC),
		Dimensions: []keys.ValidationDimension{{ID: "authenticated-account-access", Status: keys.DimensionVerified}},
	}
}
```

In `TestEveryCredentialBearingSplashOperationUsesOnlyItsDeclaredBrokerValues`, replace:

```go
		{"cloudflare-deploy", "CLOUDFLARE_API_TOKEN", "deploy-cloudflare-canary", cloudflareReceipt,
```

with:

```go
		{"inspiration-search", "INFOVIZ_TOKEN", "inspiration-infoviz-canary", infovizReceipt(), `{"parameters":{"query":"flood maps"}}`},
		{"cloudflare-deploy", "CLOUDFLARE_API_TOKEN", "deploy-cloudflare-canary", cloudflareReceipt,
```

Append to `bsig/internal/run/splash_test.go`:

```go
func TestSplashInspirationSearchRequestContract(t *testing.T) {
	decode := func(t *testing.T, fields map[string]any) SplashOperationRequest {
		t.Helper()
		body, err := json.Marshal(fields)
		if err != nil {
			t.Fatal(err)
		}
		request, err := decodeSplashRequest(strings.NewReader(string(body)))
		if err != nil {
			t.Fatalf("decoding %s: %v", body, err)
		}
		return request
	}
	query := func(value any) map[string]any { return map[string]any{"query": value} }

	for name, fields := range map[string]map[string]any{
		"a plain subject":          {"parameters": query("flood maps")},
		"1000 two-byte characters": {"parameters": query(strings.Repeat("é", 1000))},
	} {
		t.Run("accepts "+name, func(t *testing.T) {
			if err := validateSplashOperationRequest("inspiration-search", decode(t, fields)); err != nil {
				t.Fatalf("rejected: %v", err)
			}
		})
	}
	for name, fields := range map[string]map[string]any{
		"no parameters":      {},
		"no query":           {"parameters": map[string]any{}},
		"a blank query":      {"parameters": query("   ")},
		"1001 characters":    {"parameters": query(strings.Repeat("a", 1001))},
		"a NUL":              {"parameters": query("flood\x00maps")},
		"a non-string query": {"parameters": query(42)},
		"an unknown field":   {"parameters": map[string]any{"query": "flood maps", "limit": 5}},
		"a story id":         {"storyId": "fixture", "parameters": query("flood maps")},
		"a path":             {"path": "fixture", "parameters": query("flood maps")},
		"an output id":       {"outputId": "chart", "parameters": query("flood maps")},
		"final delivery":     {"finalDeliveryConfirmed": true, "parameters": query("flood maps")},
		"a Cloudflare id":    {"cloudflareAccountId": "0123456789abcdef0123456789abcdef", "parameters": query("flood maps")},
	} {
		t.Run("refuses "+name, func(t *testing.T) {
			if err := validateSplashOperationRequest("inspiration-search", decode(t, fields)); err == nil {
				t.Fatal("accepted")
			}
		})
	}
}

func TestSplashInspirationSearchSendsOnlyTheQueryWithTheProviderTimeout(t *testing.T) {
	_, _, _, store, record, deps := splashRunFixture(t)
	deps.Environ = append(deps.Environ, "INFOVIZ_TOKEN=ambient-infoviz-token")
	writeSplashCredentialRecord(t, store, "INFOVIZ_TOKEN", "inspiration-token-canary", infovizReceipt())
	result, err := SplashRun(context.Background(), "inspiration-search", strings.NewReader(`{"parameters":{"query":"flood maps"}}`), deps)
	if err != nil {
		t.Fatal(err)
	}
	if result.ExitCode != 0 || !record.called || record.timeout != providerSplashTimeout || !reflect.DeepEqual(record.args, []string{"inspiration-search"}) {
		t.Fatalf("result=%+v called=%v timeout=%s args=%v", result, record.called, record.timeout, record.args)
	}
	var sent SplashOperationRequest
	if err := json.Unmarshal([]byte(record.stdin), &sent); err != nil {
		t.Fatal(err)
	}
	var parameters splashInspirationParameters
	if err := json.Unmarshal(sent.Parameters, &parameters); err != nil || parameters.Query != "flood maps" || sent.StoryID != "" || sent.CanonicalStoryPath != "" {
		t.Fatalf("runner request = %s", record.stdin)
	}
	if env := envValues(t, record.env); env["INFOVIZ_TOKEN"] != "inspiration-token-canary" {
		t.Fatalf("INFOVIZ_TOKEN = %q, want the broker value, never the ambient one", env["INFOVIZ_TOKEN"])
	}
	if strings.Contains(record.stdin, "inspiration-token-canary") {
		t.Fatal("the token leaked into the runner request")
	}
}

func TestSplashInspirationSearchRefusesBeforeCredentialAcquisition(t *testing.T) {
	_, _, _, store, record, deps := splashRunFixture(t)
	writeSplashCredentialRecord(t, store, "INFOVIZ_TOKEN", "inspiration-token-canary", infovizReceipt())
	body, err := json.Marshal(map[string]any{"parameters": map[string]any{"query": strings.Repeat("a", 1001)}})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := SplashRun(context.Background(), "inspiration-search", strings.NewReader(string(body)), deps); err == nil {
		t.Fatal("an over-long query was accepted")
	}
	if store.getCount != 0 || record.called {
		t.Fatalf("an invalid request crossed the credential/exec boundary: gets=%d called=%v", store.getCount, record.called)
	}
}

func TestSplashInspirationSearchRequiresTheInfovizCredential(t *testing.T) {
	_, _, _, _, record, deps := splashRunFixture(t)
	_, err := SplashRun(context.Background(), "inspiration-search", strings.NewReader(`{"parameters":{"query":"flood maps"}}`), deps)
	var missing *MissingKeyError
	if !errors.As(err, &missing) || missing.KeyID != "INFOVIZ_TOKEN" || record.called {
		t.Fatalf("err = %v called=%v, want MissingKeyError for INFOVIZ_TOKEN before exec", err, record.called)
	}
}

func TestEverySplashOperationIsAllowlistedForExec(t *testing.T) {
	allowed := map[string]bool{}
	for _, template := range execpolicy.DefaultTable()["splash-operation"] {
		if len(template) == 1 {
			allowed[template[0]] = true
		}
	}
	for _, id := range SplashOperationIDs() {
		if !allowed[id] {
			t.Errorf("Splash operation %s has no splash-operation template in execpolicy.DefaultTable", id)
		}
	}
}
```

- [ ] **Step 2: Run and watch it fail**

```bash
cd /Users/rmdms/Sites/Professional/engine/bsig && go test -count=1 -run 'Inspiration|TestEveryCredentialBearingSplashOperationUsesOnlyItsDeclaredBrokerValues|TestEverySplashOperationIsAllowlistedForExec' ./internal/run/; echo "exit=$?"
```

Expected: build failure `undefined: splashInspirationParameters`, `exit=1`.

- [ ] **Step 3: Implement the operation**

In `bsig/internal/run/splash.go`, in the import block replace:

```go
	"strings"
	"time"
```

with:

```go
	"strings"
	"time"
	"unicode/utf8"
```

In the `const` block, replace:

```go
	cloudflareSplashTimeout = 30 * time.Minute
)
```

with:

```go
	cloudflareSplashTimeout = 30 * time.Minute
	// maxSplashInspirationQueryRunes matches Splash's MAX_QUERY_LENGTH, which
	// counts UTF-16 units: every query Splash sends fits in this many runes.
	maxSplashInspirationQueryRunes = 1000
)
```

In `splashOperations`, replace:

```go
	"cloudflare-deploy":          splashOperation("cloudflare-deploy", []string{"CLOUDFLARE_API_TOKEN"}, false, cloudflareSplashTimeout),
}
```

with:

```go
	"cloudflare-deploy":          splashOperation("cloudflare-deploy", []string{"CLOUDFLARE_API_TOKEN"}, false, cloudflareSplashTimeout),
	"inspiration-search":         splashOperation("inspiration-search", []string{"INFOVIZ_TOKEN"}, false, providerSplashTimeout),
}
```

Replace:

```go
type splashDatawrapperParameters struct {
```

with:

```go
type splashInspirationParameters struct {
	Query string `json:"query"`
}

type splashDatawrapperParameters struct {
```

In `validateSplashOperationRequest`, replace:

```go
	case "story-inspect":
```

with:

```go
	case "inspiration-search":
		if err := requireNoStoryFields(); err != nil || request.CloudflareAccountID != "" {
			return errors.New("splash: operation request contains fields that are not allowed for this operation")
		}
		var parameters splashInspirationParameters
		if err := decodeSplashParameters(request.Parameters, &parameters); err != nil {
			return err
		}
		if strings.TrimSpace(parameters.Query) == "" || strings.ContainsRune(parameters.Query, 0) ||
			utf8.RuneCountInString(parameters.Query) > maxSplashInspirationQueryRunes {
			return fmt.Errorf("splash: inspiration-search requires a non-empty query of at most %d characters", maxSplashInspirationQueryRunes)
		}
		return nil
	case "story-inspect":
```

- [ ] **Step 4: Run — the operation passes, the allowlist guard stays red**

```bash
cd /Users/rmdms/Sites/Professional/engine/bsig && gofmt -w internal/run/splash.go && go test -count=1 -run 'Inspiration|TestEveryCredentialBearingSplashOperationUsesOnlyItsDeclaredBrokerValues|TestEverySplashOperationIsAllowlistedForExec' ./internal/run/; echo "exit=$?"
```

Expected: only `TestEverySplashOperationIsAllowlistedForExec` FAILS with `Splash operation inspiration-search has no splash-operation template`, `exit=1`. (The fake executor in the other tests bypasses `execpolicy`; production would have refused the exec.)

- [ ] **Step 5: Allowlist the exec**

In `bsig/internal/execpolicy/policy.go`, replace:

```go
			{"cloudflare-deploy"},
		},
```

with:

```go
			{"cloudflare-deploy"},
			{"inspiration-search"},
		},
```

- [ ] **Step 6: Run and watch it pass**

```bash
cd /Users/rmdms/Sites/Professional/engine/bsig && gofmt -l internal/run internal/execpolicy && go test -race -count=1 ./internal/run/ ./internal/execpolicy/ ./internal/plan/; echo "exit=$?"
```

Expected: nothing from `gofmt -l`; three `ok` lines, `exit=0`.

- [ ] **Step 7: Mutation checks**

1. In `validateSplashOperationRequest`, replace `> maxSplashInspirationQueryRunes {` with `> maxSplashInspirationQueryRunes+1 {`. Run Step 6. Expected: `TestSplashInspirationSearchRequestContract/refuses_1001_characters` and `TestSplashInspirationSearchRefusesBeforeCredentialAcquisition` FAIL. Revert.
2. In `validateSplashOperationRequest`, replace `if err := requireNoStoryFields(); err != nil || request.CloudflareAccountID != "" {` (the one inside `case "inspiration-search":`) with `if request.CloudflareAccountID != "" {`. Run Step 6. Expected: `TestSplashInspirationSearchRequestContract/refuses_a_story_id` FAILS. Revert.
3. In `policy.go`, delete `{"inspiration-search"},`. Run Step 6. Expected: `TestEverySplashOperationIsAllowlistedForExec` FAILS. Revert.

Re-run Step 6; expect `exit=0`.

- [ ] **Step 8: Commit**

```bash
git -C /Users/rmdms/Sites/Professional/engine add bsig/internal/run/splash.go bsig/internal/run/splash_test.go bsig/internal/execpolicy/policy.go
git -C /Users/rmdms/Sites/Professional/engine commit -m "run: sealed Splash inspiration-search operation with the Infoviz account credential" -- bsig/internal/run/splash.go bsig/internal/run/splash_test.go bsig/internal/execpolicy/policy.go
```

---

## Task 4: Desktop — Splash Connected services lists and the acquisition allowlist

**Files:**
- Modify: `desktop/src/shared/contracts.ts`, `desktop/src/renderer-journalist.ts`
- Test: `desktop/src/shared/contracts.test.ts`, `desktop/src/renderer-journalist.test.ts`

**Interfaces:**
- Consumes (Task 2): `AcquisitionURL: "https://splash.buriedsignals.com/inspiration.html"` on the `INFOVIZ_TOKEN` registry entry — `contracts.test.ts` already has a test, `accepts the exact acquisition destinations authored by the Engine`, that reads every `AcquisitionURL: "…"` literal out of `bsig/internal/keys/registry.go` from disk and asserts each is `isAllowedDocumentationURL`. Once Task 2 lands, that shared test goes red until this task adds the URL to the allowlist — no new test code is needed to see that particular red, only the allowlist fix.
- Produces: `RECORD_KEY_IDS` gains `'INFOVIZ_TOKEN'` (already `readonly ['MAPTILER_KEY', 'DATAWRAPPER_TOKEN', 'CLOUDFLARE_API_TOKEN']`); `SPLASH_KEY_IDS` gains `'INFOVIZ_TOKEN'`; `documentationExact` gains `'https://splash.buriedsignals.com/inspiration.html': true`. No new exports, no new UI component: the existing paste-credential card renders `INFOVIZ_TOKEN` because it is now a record id in both lists.

- [ ] **Step 1: Confirm the cross-repo red, and write the failing list tests**

```bash
cd /Users/rmdms/Sites/Professional/engine/desktop && npx vitest run src/shared/contracts.test.ts -t 'accepts the exact acquisition destinations authored by the Engine'
```

Expected: FAIL — `isAllowedDocumentationURL('https://splash.buriedsignals.com/inspiration.html')` is `false` (Task 2's registry entry is on this branch; the desktop allowlist has not caught up yet).

In `desktop/src/shared/contracts.test.ts`, replace:

```ts
    expect(isAllowedDocumentationURL('https://openrouter.ai/settings/keys')).toBe(true);
```

with:

```ts
    expect(isAllowedDocumentationURL('https://openrouter.ai/settings/keys')).toBe(true);
    expect(isAllowedDocumentationURL('https://splash.buriedsignals.com/inspiration.html')).toBe(true);
    expect(isAllowedDocumentationURL('https://splash.buriedsignals.com/inspiration.html?next=evil')).toBe(false);
```

Find the exact list assertion for record ids (`describe`/`it` naming `RECORD_KEY_IDS` or an inline `expect([...RECORD_KEY_IDS])`) by running:

```bash
grep -n "RECORD_KEY_IDS" /Users/rmdms/Sites/Professional/engine/desktop/src/shared/contracts.test.ts
```

and replace the `MAPTILER_KEY', 'DATAWRAPPER_TOKEN', 'CLOUDFLARE_API_TOKEN'` array literal it prints with the same list plus `'INFOVIZ_TOKEN'`, matching the surrounding quoting exactly.

In `desktop/src/renderer-journalist.test.ts`, replace:

```ts
    expect(journalistKeyIDs('splash', {})).toEqual([
      'MAPTILER_KEY', 'DATAWRAPPER_TOKEN', 'CLOUDFLARE_API_TOKEN',
    ]);
```

with:

```ts
    expect(journalistKeyIDs('splash', {})).toEqual([
      'MAPTILER_KEY', 'DATAWRAPPER_TOKEN', 'CLOUDFLARE_API_TOKEN', 'INFOVIZ_TOKEN',
    ]);
```

- [ ] **Step 2: Run and watch it fail**

```bash
cd /Users/rmdms/Sites/Professional/engine/desktop && npx vitest run src/shared/contracts.test.ts src/renderer-journalist.test.ts
```

Expected: FAIL — the acquisition-destination test (already red from Task 2), the `RECORD_KEY_IDS` list assertion (received array lacks `'INFOVIZ_TOKEN'`), and the `journalistKeyIDs('splash', …)` assertion.

- [ ] **Step 3: Implement**

In `desktop/src/shared/contracts.ts`, replace:

```ts
export const RECORD_KEY_IDS = [
  'MAPTILER_KEY',
  'DATAWRAPPER_TOKEN',
  'CLOUDFLARE_API_TOKEN',
] as const;
```

with:

```ts
export const RECORD_KEY_IDS = [
  'MAPTILER_KEY',
  'DATAWRAPPER_TOKEN',
  'CLOUDFLARE_API_TOKEN',
  'INFOVIZ_TOKEN',
] as const;
```

In the same file's `documentationExact`, replace:

```ts
  'https://unpaywall.org/products/api': true,
};
```

with:

```ts
  'https://unpaywall.org/products/api': true,
  'https://splash.buriedsignals.com/inspiration.html': true,
};
```

In `desktop/src/renderer-journalist.ts`, replace:

```ts
export const SPLASH_KEY_IDS = [
  'MAPTILER_KEY',
  'DATAWRAPPER_TOKEN',
  'CLOUDFLARE_API_TOKEN',
] as const;
```

with:

```ts
export const SPLASH_KEY_IDS = [
  'MAPTILER_KEY',
  'DATAWRAPPER_TOKEN',
  'CLOUDFLARE_API_TOKEN',
  'INFOVIZ_TOKEN',
] as const;
```

- [ ] **Step 4: Run and watch it pass**

```bash
cd /Users/rmdms/Sites/Professional/engine/desktop && npx vitest run src/shared/contracts.test.ts src/renderer-journalist.test.ts && npm run typecheck
```

Expected: PASS; typecheck clean.

- [ ] **Step 5: Mutation check**

Remove `'INFOVIZ_TOKEN',` from `SPLASH_KEY_IDS` in `renderer-journalist.ts` → the `journalistKeyIDs('splash', …)` assertion is RED. Restore. Then remove the `'https://splash.buriedsignals.com/inspiration.html': true,` line from `documentationExact` → the acquisition-destination test and the new `isAllowedDocumentationURL` assertions are RED. Restore, re-run Step 4; expect PASS.

- [ ] **Step 6: Commit**

```bash
git -C /Users/rmdms/Sites/Professional/engine add desktop/src/shared/contracts.ts desktop/src/shared/contracts.test.ts desktop/src/renderer-journalist.ts desktop/src/renderer-journalist.test.ts
git -C /Users/rmdms/Sites/Professional/engine commit -m "Labs: offer the Infoviz account credential in Splash Connected services" -- desktop/src/shared/contracts.ts desktop/src/shared/contracts.test.ts desktop/src/renderer-journalist.ts desktop/src/renderer-journalist.test.ts
```

---

## Task 5: Catalog pin — GATED (Splash commit with Part 2b-1, Tom's signature)

**Files:**
- Modify (by the signer, not by this plan's executor): `bsig/catalog/catalog.json` (`products.splash.ref` and `products.splash.install_contract.source_commit`), `bsig/catalog/catalog.json.minisig`.

**Interfaces:**
- Consumes: a commit on `buriedsignals/splash` `main` that contains Part 2b-1 (`skills/splash/scripts/run-operation.mjs` knows `inspiration-search`; `skills/inspiration/scripts/sealed-search.mjs` exists).
- Produces: the two-line pin change and its verified SHA, handed to Tom with the branch.

Why the executor does not commit the pin: `catalog.json.minisig` must be re-signed with the production key on Tom's Mac (`bsig/AGENTS.md`: `tools/sign-artifact/macos_prompt.swift`, key under `~/.config/buriedsignals/release-keys/minisign/`, "never put the Minisign password in chat or a command argument"). On this machine the sibling `mycroft` checkout exists, so `TestSkillsVendor_MatchesVendoredManifests` syncs the real catalog with signature verification: an unsigned edit turns the gate red.

- [ ] **Step 1: Fill the gate value**

Ask Rémy for the Splash commit. Record it here before continuing:

`SPLASH_2B1_SHA = ________________________________________ (40 hex, on buriedsignals/splash main)`

If no such commit exists yet, STOP this task; Task 6 still runs.

- [ ] **Step 2: Verify the commit (read-only GitHub calls)**

```bash
SPLASH_2B1_SHA='<paste the 40-hex value from Step 1>'
printf '%s\n' "$SPLASH_2B1_SHA" | grep -Eq '^[0-9a-f]{40}$' && echo "shape ok"
gh api "repos/buriedsignals/splash/commits/$SPLASH_2B1_SHA" --jq .sha
gh api "repos/buriedsignals/splash/compare/$SPLASH_2B1_SHA...main" --jq .status
gh api "repos/buriedsignals/splash/contents/skills/splash/scripts/run-operation.mjs?ref=$SPLASH_2B1_SHA" --jq .content | base64 --decode | grep -c 'inspiration-search'
gh api "repos/buriedsignals/splash/contents/skills/inspiration/scripts/sealed-search.mjs?ref=$SPLASH_2B1_SHA" --jq .path
```

Expected: `shape ok`; the same SHA; `identical` or `ahead` (the commit is on `main`); a count ≥ 1; `skills/inspiration/scripts/sealed-search.mjs`. Any other answer: STOP and report.

- [ ] **Step 3: Hand the pin to Tom**

Write in the task report (for the PR description Rémy will send) exactly:

```text
Catalog pin to apply and sign on the release Mac, in one commit with the minisig:
bsig/catalog/catalog.json  products.splash.ref                          <current ref> -> <SPLASH_2B1_SHA>
bsig/catalog/catalog.json  products.splash.install_contract.source_commit <current source_commit> -> <SPLASH_2B1_SHA>
(install_contract.digest unchanged)
Then: re-sign catalog.json (macos_prompt), `go run ./tools/publish-catalog -dest ../../mycroft/catalog`.
Commit message: "Catalog: pin Splash to <first 8 hex> (inspiration-search operation)"
```

Read the current values first with `git -C /Users/rmdms/Sites/Professional/engine show HEAD:bsig/catalog/catalog.json | grep -n '"ref"\|"source_commit"'` and substitute them into the hand-off text above.

No commit.

---

## Task 6: Final gate — STOP before any push or PR

**Files:** none modified.

- [ ] **Step 1: Full Go gate**

```bash
cd /Users/rmdms/Sites/Professional/engine/bsig && gofmt -l . ; echo "gofmt done"
cd /Users/rmdms/Sites/Professional/engine/bsig && go vet ./... ; echo "vet exit=$?"
cd /Users/rmdms/Sites/Professional/engine/bsig && go test -race -count=1 ./... > "${TMPDIR:-/tmp}/engine-infoviz-final-go.txt" 2>&1; echo "test exit=$?"
grep -E '^(--- FAIL|FAIL|panic:)' "${TMPDIR:-/tmp}/engine-infoviz-final-go.txt"
diff <(grep -E '^(--- FAIL|FAIL)' "${TMPDIR:-/tmp}/engine-infoviz-baseline-go.txt" | sed -E 's/ \([0-9.]+s\)//' | sort) <(grep -E '^(--- FAIL|FAIL)' "${TMPDIR:-/tmp}/engine-infoviz-final-go.txt" | sed -E 's/ \([0-9.]+s\)//' | sort); echo "diff exit=$?"
```

Expected: `gofmt -l` prints no path before `gofmt done`; `vet exit=0`; the failure list equals Task 0's (`diff exit=0`). If `test exit=0` at baseline, it must be `0` now. A new failure: fix it (at most two attempts), then STOP and report the exact failing test and output.

- [ ] **Step 2: Full desktop gate**

```bash
cd /Users/rmdms/Sites/Professional/engine/desktop && npm run typecheck; echo "typecheck exit=$?"
cd /Users/rmdms/Sites/Professional/engine/desktop && npm test > "${TMPDIR:-/tmp}/engine-infoviz-final-desktop.txt" 2>&1; echo "test exit=$?"
grep -E '(FAIL|✗|failed)' "${TMPDIR:-/tmp}/engine-infoviz-final-desktop.txt" | head -30
```

Expected: `typecheck exit=0`; the failing-test list is identical to Task 0's desktop baseline (compare by eye — same names, same count). A new failure: fix it (at most two attempts), then STOP and report the exact failing test and output.

- [ ] **Step 3: Branch state**

```bash
git -C /Users/rmdms/Sites/Professional/engine status --porcelain; echo "status exit=$?"
git -C /Users/rmdms/Sites/Professional/engine log --oneline origin/main..HEAD
git -C /Users/rmdms/Sites/Professional/engine log --format='%B' origin/main..HEAD | grep -ci 'claude\|anthropic\|co-authored-by'
```

Expected: no status lines; exactly four commits (Tasks 1–4; Task 5 commits nothing); the grep count is `0`.

- [ ] **Step 4: STOP**

Report to Rémy: the branch name, the four commit subjects, the gate result against both baselines, the Task 5 hand-off text (or "Splash 2b-1 commit not available yet"), and that the desktop release runbook still owes one manual check once Part 1 is deployed: paste a real Infoviz token into Splash Connected services and confirm `bsig --json keys status INFOVIZ_TOKEN` reports `stored`/`verified`.

Do not push. Do not open a PR. Do not run `jj git push`, `gh pr create`, or any GitHub write. Pushing to `buriedsignals/engine` waits for Rémy's explicit go; review is Tom's; the signed Indicator Labs release is triggered by Tom.

---

## Splash interoperability

Splash reaches this credential and operation through two `bsig --json` calls, both already specified in Part 2b of the spec: `bsig --json keys status INFOVIZ_TOKEN`, whose terminal result's `data.stored` tells the Splash MCP tool (`search_inspiration`, `apps/goose/inspiration.mjs`) whether to route to the account path at all; and, only when `stored` is true, `bsig --json run splash inspiration-search` with stdin `{"parameters":{"query":"…"}}`, whose terminal result's `data.stdout` carries the runner's own JSON line (the search results and quota, in Splash's own shape — Engine does not interpret it). An Engine without this change answers `keys status INFOVIZ_TOKEN` with an `unknown key id` error, and Splash's decision logic (`invokeEngineFn` failing before the run has started) falls back to the direct anonymous search, exactly as it does for a self-install with no `SPLASH_BSIG_PATH` at all.

---

## Self-review

- **Coverage of Part 2a**: Registry entry with every field the spec's binding block names (`StorageRecord`, `SensitivitySecret`, `ValidatorPolicy`, `ReplacementBehavior`, `BaseURL`, `ValidateRecord`, name/purpose/capability/permissions/acquisition URL) — Task 2. Validator with the exact behaviour (rejects validation context; `providerGET` on `/auth/status`; valid only on 200 + `authenticated === true`; one verified dimension) — Task 1. Operation `inspiration-search` with the exact request contract (credentials, provider timeout, `{parameters:{query}}`, 1–1000 code points, no story fields, no Cloudflare account) and the execpolicy allowlist line — Task 3. Desktop `RECORD_KEY_IDS`/`SPLASH_KEY_IDS` and the acquisition-URL allowlist, with pinned tests — Task 4. Catalog pin, gated on Tom's signature — Task 5. Gate before any push — Task 0 and Task 6. Nothing from Part 2a is left uncovered; D9(revised)/D11/D12 together remove every email-flow, Connect-UI, and MCP-server item, none of which this plan touches.
- **Placeholder scan**: every task carries full, copy-ready code (test and implementation) lifted verbatim from the superseded plans' matching tasks, with the acquisition field and all email-flow interfaces removed and anchors re-verified against the current `origin/main` (`30485bc8`, one unrelated commit `ae813f5` touched `renderer-journalist.ts`/`contracts.ts`/`contracts.test.ts` since the plans were written — verified not to collide with this plan's edit points). No "similar to Task N", no `…`, no TODO markers.
- **Naming consistency**: branch `feat/infoviz-token-record` used throughout; commit messages use the same "keys:"/"run:"/"Labs:" prefixes as neighbouring history; `INFOVIZ_TOKEN` spelled identically in Go, TypeScript and the interoperability note; task count is 7 (0–6), inside the 5–7 target.
