# Inspiration 02a — Engine bsig: Infoviz email-flow credential and inspiration-search — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Engine (`bsig`) learns a record credential `INFOVIZ_TOKEN` that the journalist connects by email instead of pasting (`bsig keys connect INFOVIZ_TOKEN start|poll`), validates it against Infoviz `/auth/status`, and hands it to one new sealed Splash operation, `inspiration-search`.

**Architecture:** The registry gains a public `acquisition` field (`paste` | `email-flow`) and the `INFOVIZ_TOKEN` record entry, validated by `ValidateInfovizRecord` through the existing `providerGET`. A new package `internal/infoviz` owns Infoviz's own wire contract (POST start, POST poll answered by HTTP status). Because every `bsig` call is a separate process, `internal/keys/emailflow.go` keeps each pending flow in an owner-only file under the Engine directory, behind a random 64-hex handle; the provider's request id (a poll credential) never crosses stdout, events or the audit log. The generic verb `keys connect` refuses any entry that does not declare email-flow, and on delivery writes the token through `RecordBroker.Replace` at the generation `Status` reports, so validation runs before the atomic write. `inspiration-search` is one more entry in `splashOperations`, one closed request contract and one `execpolicy` allowlist line.

**Tech Stack:** Go 1.25 (`bsig/go.mod`: `go 1.25.12`), standard library only (no new module dependency), `go test -race`.

**Spec:** `docs/superpowers/specs/2026-09-13-inspiration-journey-design.md` (in the Splash repo, worktree /Users/rmdms/Sites/Professional/splash/feat-inspiration) — Part 2a.

## Global Constraints

- Repository: `/Users/rmdms/Sites/Professional/engine` (remote `origin` = `https://github.com/buriedsignals/engine`); Go commands run from `/Users/rmdms/Sites/Professional/engine/bsig`.
- Branch: `feat/infoviz-email-flow-credential`, created from `origin/main` (measured at `52fed4f`) in that clone.
- Never push, never open a PR, never `jj git push`: pushing to `buriedsignals/engine` requires Rémy's explicit go; releases and catalog signing are Tom's.
- AGENTS.md says "jj colocated, commit straight to `main`. Push with `jj git push`." — overridden here: `jj` is not installed and the clone has no `.jj`; the spec's delivery is a branch → PR reviewed by Tom. Use plain `git` on the branch.
- Code, comments, commit messages in English. No mention of Claude or Anthropic anywhere; no `Co-Authored-By` and no `Claude-Session` trailer (the repo's recent commits carry them; this branch does not).
- Commit with an explicit pathspec after `git add` (`git commit -m "…" -- <paths>`), never a bare `git commit`.
- AGENTS.md (root), binding: "Treat Tom's claims, figures, assumptions, framing, and preferred solution as unverified inputs … Never claim completion from intention or code inspection alone." Every task ends on a command's output, not on reading.
- `bsig/AGENTS.md`, binding: "The emitter is the only stdout writer; everything it emits is redacted and teed to `<baseDir>/audit.log`. Secrets enter via stdin or keychain only — never argv, sealed plans, manifests, or config files."
- `bsig/AGENTS.md`, binding: "`internal/execpolicy` is the only path to exec; new invocations are deliberate edits to `DefaultTable()`."
- `bsig/AGENTS.md`, binding: "Exit codes: 0 ok, 1 fail, 2 partial-with-rollback, 3 entitlement-denied, 4 usage — typed errors implement `ExitCode() int`." and "Go module dependency additions are security-review events." (this plan adds none).
- `docs/packages/auth-standard.md`: "It is **not** a shared auth library." — the Infoviz client is its own package; `internal/auth` (Navigator) is not modified.
- The Infoviz token never appears on stdout, in events, in error text or in the audit log; it is registered with the redactor the moment it arrives (`infoviz.Poll` → `registerSecret`) and again by `RecordBroker.Replace`.
- Cadence bounds: poll interval 1–60 s (server `poll_interval`, default 3 s); flow lifetime ≤ 30 min from the server's `expires_at` (15 min when the local clock disagrees or the value is unreadable); 30 s per HTTP request.
- `inspiration-search` query: non-empty after trimming, ≤ 1000 characters (Unicode code points), no NUL; no story fields, no Cloudflare account.
- Test commands: focused `cd /Users/rmdms/Sites/Professional/engine/bsig && go test -count=1 -run '<Pattern>' ./<pkg>/`; gate `cd /Users/rmdms/Sites/Professional/engine/bsig && gofmt -l . && go vet ./... && go test -race -count=1 ./...`.
- Never pipe a test run into `tail`/`tee` without capturing the exit code (`…; echo "exit=$?"`): a pipe hides the real status.

---

## Task 0: Branch from origin/main and record the baseline

**Files:** none modified.

**Interfaces:** Produces the branch `feat/infoviz-email-flow-credential` and the baseline file `${TMPDIR:-/tmp}/engine-infoviz-baseline.txt` that Task 8 compares against.

- [ ] **Step 1: Confirm the clone is clean, including ignored files**

```bash
git -C /Users/rmdms/Sites/Professional/engine status --porcelain --ignored; echo "exit=$?"
git -C /Users/rmdms/Sites/Professional/engine stash list | head -3
git -C /Users/rmdms/Sites/Professional/engine worktree list
```

Expected: the first command prints nothing but `exit=0`. If it prints any path, STOP and report the paths to Rémy — the clone currently sits on an old branch (`rd-dev`) whose layout differs from `origin/main`, and nothing there may be lost.

- [ ] **Step 2: Fetch and branch**

```bash
git -C /Users/rmdms/Sites/Professional/engine fetch origin
git -C /Users/rmdms/Sites/Professional/engine switch -c feat/infoviz-email-flow-credential origin/main
git -C /Users/rmdms/Sites/Professional/engine log --oneline -1
```

Expected: `Switched to a new branch 'feat/infoviz-email-flow-credential'`; the log line is `origin/main`'s head (`52fed4f release: Indicator Labs 0.1.34 live …` at planning time; a newer head is fine — note its SHA).

- [ ] **Step 3: Read the binding rules on the branch**

```bash
sed -n '1,80p' /Users/rmdms/Sites/Professional/engine/bsig/AGENTS.md
```

Expected: the "Binding contracts" section quoted in Global Constraints is present unchanged. If it changed, STOP and report the difference.

- [ ] **Step 4: Baseline**

```bash
cd /Users/rmdms/Sites/Professional/engine/bsig && gofmt -l . ; go vet ./... ; echo "vet exit=$?"
cd /Users/rmdms/Sites/Professional/engine/bsig && go test -race -count=1 ./... > "${TMPDIR:-/tmp}/engine-infoviz-baseline.txt" 2>&1; echo "test exit=$?"
grep -E '^(--- FAIL|FAIL|panic:)' "${TMPDIR:-/tmp}/engine-infoviz-baseline.txt"
```

Expected: `vet exit=0`. Record `test exit=` and every `--- FAIL`/`FAIL` line verbatim in the task report: those are ambient failures (the sibling checkouts `/Users/rmdms/Sites/Professional/mycroft` and `/Users/rmdms/Sites/Professional/spotlight` exist, so `TestSkillsVendor_MatchesVendoredManifests` and `TestPublishedCatalogMatchesAuthored` run against them instead of skipping). This plan must not add a failure to that list.

No commit.

---

## Task 1: `ValidateInfovizRecord`

**Files:**
- Modify: `bsig/internal/keys/validators.go`
- Test: `bsig/internal/keys/validators_test.go`

**Interfaces:**
- Consumes: `providerGET(ctx, client, rawURL, bearer string) ([]byte, error)`, `ValidationContext.empty()`, `InvalidKeyError`, `RateLimitedError`, `ValidationUnavailableError`, `InsufficientEvidenceError` (all in `internal/keys` on `origin/main`).
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

## Task 2: Acquisition metadata and the `INFOVIZ_TOKEN` registry entry

**Files:**
- Modify: `bsig/internal/keys/registry.go`
- Test: `bsig/internal/keys/keys_test.go`, `bsig/cmd/bsig/keys_verb_test.go`

**Interfaces:**
- Consumes: `ValidateInfovizRecord` (Task 1).
- Produces (Go): `type Acquisition string`; `const AcquisitionPaste Acquisition = "paste"`; `const AcquisitionEmailFlow Acquisition = "email-flow"`; field `Entry.Acquisition Acquisition`; method `func (e Entry) AcquisitionKind() Acquisition` (zero value → `paste`); field `PublicEntry.Acquisition Acquisition` serialized as `"acquisition"` (always present).
- Produces (JSON, `bsig --json keys list` → `data.keys[i].metadata`): `"acquisition": "paste" | "email-flow"`; for `INFOVIZ_TOKEN`: `"id":"INFOVIZ_TOKEN","name":"Infoviz account","purpose":"Raises Splash inspiration searches from 5 to 10 a day.","capability":"Splash inspiration search","acquisitionUrl":"https://splash.buriedsignals.com/inspiration.html","acquisition":"email-flow","requiredPermissions":["A signed-in Infoviz account"],"sensitivity":"secret","storageKind":"record","validatorPolicy":"authenticated-account-request","replacementBehavior":"validate-before-atomic-replacement","validatorAvailable":true,"candidateMaxBytes":1024,"contractVersion":1`.

Why `Capability` and `RequiredPermissions` are set although the spec does not name them: `TestRegistryInventory` fails any record entry whose `Capability` is empty or whose `RequiredPermissions` is empty (`keys_test.go`, record loop), and the desktop renders both. An Infoviz token has no scopes; the one requirement a journalist must meet is a signed-in account, so that is the single permission line.

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
func TestRegistryAcquisitionIsPasteExceptEmailFlowCredentials(t *testing.T) {
	emailFlow := map[string]bool{"INFOVIZ_TOKEN": true}
	for _, entry := range Registry() {
		want := AcquisitionPaste
		if emailFlow[entry.ID] {
			want = AcquisitionEmailFlow
		}
		if got := entry.Public().Acquisition; got != want {
			t.Errorf("%s acquisition = %q, want %q", entry.ID, got, want)
		}
	}
	if got := (Entry{ID: "INJECTED_TEST_KEY"}).Public().Acquisition; got != AcquisitionPaste {
		t.Errorf("an entry without an acquisition publishes %q, want paste", got)
	}
}

func TestInfovizTokenIsAnEmailFlowAccountRecord(t *testing.T) {
	e, ok := Lookup(Registry(), "INFOVIZ_TOKEN")
	if !ok {
		t.Fatal("registry missing INFOVIZ_TOKEN")
	}
	public := e.Public()
	if e.Name != "Infoviz account" ||
		e.Purpose != "Raises Splash inspiration searches from 5 to 10 a day." ||
		e.AcquisitionURL != "https://splash.buriedsignals.com/inspiration.html" ||
		e.BaseURL != "https://infoviz.design" ||
		public.Acquisition != AcquisitionEmailFlow ||
		public.ValidatorPolicy != "authenticated-account-request" ||
		public.ReplacementBehavior != "validate-before-atomic-replacement" ||
		public.Sensitivity != SensitivitySecret || public.StorageKind != StorageRecord ||
		len(e.Aliases) != 0 || e.Validate != nil {
		t.Fatalf("INFOVIZ_TOKEN = %+v (base %q)", public, e.BaseURL)
	}
	if reflect.ValueOf(e.ValidateRecord).Pointer() != reflect.ValueOf(ValidateInfovizRecord).Pointer() {
		t.Fatal("INFOVIZ_TOKEN must validate through ValidateInfovizRecord")
	}
}
```

In `bsig/cmd/bsig/keys_verb_test.go`, replace:

```go
	for _, id := range []string{"MAPTILER_KEY", "DATAWRAPPER_TOKEN", "CLOUDFLARE_API_TOKEN"} {
```

with:

```go
	for _, id := range []string{"MAPTILER_KEY", "DATAWRAPPER_TOKEN", "CLOUDFLARE_API_TOKEN", "INFOVIZ_TOKEN"} {
```

Append to `bsig/cmd/bsig/keys_verb_test.go`:

```go
func TestKeysListPublishesAcquisitionMetadata(t *testing.T) {
	d, _, out := newKeysDeps(t, "", keys.Registry())
	if err := handleKeys(context.Background(), d, []string{"list"}); err != nil {
		t.Fatalf("keys list: %v", err)
	}
	rows := lastEvent(t, out)["data"].(map[string]any)["keys"].([]any)
	acquisition := map[string]any{}
	for _, r := range rows {
		row := r.(map[string]any)
		acquisition[row["id"].(string)] = row["metadata"].(map[string]any)["acquisition"]
	}
	if acquisition["INFOVIZ_TOKEN"] != "email-flow" || acquisition["DATAWRAPPER_TOKEN"] != "paste" || acquisition["FIRECRAWL_API_KEY"] != "paste" {
		t.Fatalf("acquisition metadata = %v", acquisition)
	}
}
```

- [ ] **Step 2: Run and watch it fail**

```bash
cd /Users/rmdms/Sites/Professional/engine/bsig && go test -count=1 -run 'TestRegistry|TestInfovizTokenIsAnEmailFlowAccountRecord' ./internal/keys/; echo "exit=$?"
```

Expected: build failure `undefined: AcquisitionPaste` (and `AcquisitionEmailFlow`, `Acquisition` field), `exit=1`.

- [ ] **Step 3: Implement**

In `bsig/internal/keys/registry.go`, insert after the `SensitivityClientPublishable` const block:

```go
// Acquisition says how a journalist obtains a credential value. It is public
// catalogue metadata: clients render a paste field or a Connect button from it.
type Acquisition string

const (
	AcquisitionPaste     Acquisition = "paste"
	AcquisitionEmailFlow Acquisition = "email-flow"
)
```

In `type Entry struct`, replace:

```go
	AcquisitionURL      string
	RequiredPermissions []string
```

with:

```go
	AcquisitionURL      string
	Acquisition         Acquisition
	RequiredPermissions []string
```

Insert after the `Kind()` method:

```go
// AcquisitionKind treats the zero value as paste: every entry that predates
// email-flow acquisition is entered by pasting its value.
func (e Entry) AcquisitionKind() Acquisition {
	if e.Acquisition == "" {
		return AcquisitionPaste
	}
	return e.Acquisition
}
```

In `type PublicEntry struct`, replace:

```go
	AcquisitionURL      string      `json:"acquisitionUrl,omitempty"`
```

with:

```go
	AcquisitionURL      string      `json:"acquisitionUrl,omitempty"`
	Acquisition         Acquisition `json:"acquisition"`
```

In `Public()`, replace:

```go
		Capability: e.Capability, AcquisitionURL: e.AcquisitionURL,
```

with:

```go
		Capability: e.Capability, AcquisitionURL: e.AcquisitionURL, Acquisition: e.AcquisitionKind(),
```

In `Registry()`, insert after the `CLOUDFLARE_API_TOKEN` entry (before the closing `}` of the slice):

```go
		{
			// Connected by email, never pasted: `bsig keys connect INFOVIZ_TOKEN
			// start|poll` receives the token from Infoviz and writes it through
			// the record broker, which validates it like any other record.
			ID: "INFOVIZ_TOKEN", Name: "Infoviz account",
			Purpose:             "Raises Splash inspiration searches from 5 to 10 a day.",
			Capability:          "Splash inspiration search",
			AcquisitionURL:      "https://splash.buriedsignals.com/inspiration.html",
			Acquisition:         AcquisitionEmailFlow,
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

Expected: `gofmt -l` prints nothing; the three packages `ok`, `exit=0` (the `cmd/bsig` package may show only the ambient failures recorded in Task 0; no new one).

- [ ] **Step 5: Mutation check**

In the `INFOVIZ_TOKEN` entry, replace `Acquisition:         AcquisitionEmailFlow,` with `Acquisition:         AcquisitionPaste,`. Run:

```bash
cd /Users/rmdms/Sites/Professional/engine/bsig && go test -count=1 -run 'TestRegistryAcquisitionIsPasteExceptEmailFlowCredentials|TestInfovizTokenIsAnEmailFlowAccountRecord|TestKeysListPublishesAcquisitionMetadata' ./internal/keys/ ./cmd/bsig/; echo "exit=$?"
```

Expected: all three tests FAIL. Revert the line, re-run, expect `exit=0`.

- [ ] **Step 6: Commit**

```bash
git -C /Users/rmdms/Sites/Professional/engine add bsig/internal/keys/registry.go bsig/internal/keys/keys_test.go bsig/cmd/bsig/keys_verb_test.go
git -C /Users/rmdms/Sites/Professional/engine commit -m "keys: register INFOVIZ_TOKEN and publish how each credential is acquired" -- bsig/internal/keys/registry.go bsig/internal/keys/keys_test.go bsig/cmd/bsig/keys_verb_test.go
```

---

## Task 3: `internal/infoviz` — the Infoviz email token flow client

**Files:**
- Create: `bsig/internal/infoviz/tokenflow.go`
- Test: `bsig/internal/infoviz/tokenflow_test.go`

**Interfaces:**
- Consumes: the Infoviz HTTP contract as implemented on the Infoviz branch `feat/api-only-token-sign-in` (`backend/app/auth/token_routes.py`): `POST /auth/token/start {email}` → `200 {request_id, poll_interval, expires_at}` | `429 {error}` | `500 {error}` | `422 {detail}`; `POST /auth/token/poll {request_id}` → `202 {status:"pending"}` | `200 {token, email, expires_at}` once | `410 {error:"expired_or_used"}` | `422`. `request_id` is `secrets.token_urlsafe(32)` (43 characters); `expires_at` is Python `datetime.isoformat()` in UTC.
- Produces:
  - `const RequestTimeout = 30 * time.Second`, `DefaultPollInterval = 3 * time.Second`, `MaxPollInterval = 60 * time.Second`, `DefaultFlowLifetime = 15 * time.Minute`, `MaxFlowLifetime = 30 * time.Minute`, `UserAgent = "buriedsignals-engine (+https://github.com/buriedsignals/engine)"`.
  - `type Flow struct { RequestID string; PollInterval time.Duration; ExpiresAt time.Time }`
  - `type PollStatus string` with `PollPending = "pending"`, `PollReady = "ready"`, `PollExpired = "expired"`.
  - `type PollResult struct { Status PollStatus; Token string; Email string }`
  - `func Start(ctx context.Context, client *http.Client, baseURL, email string, now time.Time) (Flow, error)`
  - `func Poll(ctx context.Context, client *http.Client, baseURL, requestID string, registerSecret func(string)) (PollResult, error)` — 202/429/5xx/transport → pending; 410 → expired; 200 with a token → token registered, then ready; 200 without a token, other statuses, malformed request id → error; cancelled context → `ctx.Err()`.

- [ ] **Step 1: Write the failing tests**

Create `bsig/internal/infoviz/tokenflow_test.go`:

```go
package infoviz

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"
)

// Fixture shapes replay infoviz backend/app/auth/token_routes.py
// (branch feat/api-only-token-sign-in): request_id is
// secrets.token_urlsafe(32), expires_at is datetime.isoformat() in UTC.
const (
	fixtureRequestID = "Yp3kQ9rT5vNcXzLmJh9Bd2WgK3yPq8rT5vNcXzLmJh9"
	fixtureToken     = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImVkaXRvckBleGFtcGxlLm9yZyIsInR5cGUiOiJhcGkifQ.Zml4dHVyZS1zaWduYXR1cmU"
)

var fixtureNow = time.Date(2026, 9, 14, 10, 0, 0, 0, time.UTC)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func reply(code int, body string) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(code)
		_, _ = io.WriteString(w, body)
	}
}

func startBody(pollInterval int, expiresAt string) string {
	return `{"request_id":"` + fixtureRequestID + `","poll_interval":` + strconv.Itoa(pollInterval) + `,"expires_at":"` + expiresAt + `"}`
}

func TestStartPostsTheEmailAndReturnsTheServerFlow(t *testing.T) {
	var method, path, contentType, userAgent string
	var sent map[string]string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		method, path, contentType, userAgent = r.Method, r.URL.Path, r.Header.Get("Content-Type"), r.Header.Get("User-Agent")
		_ = json.NewDecoder(r.Body).Decode(&sent)
		reply(http.StatusOK, startBody(3, "2026-09-14T10:15:00.123456+00:00"))(w, r)
	}))
	defer srv.Close()

	flow, err := Start(context.Background(), srv.Client(), srv.URL+"/", "editor@example.org", fixtureNow)
	if err != nil {
		t.Fatal(err)
	}
	if method != http.MethodPost || path != "/auth/token/start" || contentType != "application/json" || userAgent != UserAgent ||
		len(sent) != 1 || sent["email"] != "editor@example.org" {
		t.Fatalf("request = %s %s type=%q ua=%q body=%v", method, path, contentType, userAgent, sent)
	}
	want := time.Date(2026, 9, 14, 10, 15, 0, 123456000, time.UTC)
	if flow.RequestID != fixtureRequestID || flow.PollInterval != 3*time.Second || !flow.ExpiresAt.Equal(want) {
		t.Fatalf("flow = %+v, want the request id, 3s and %s", flow, want)
	}
}

func TestStartBoundsPollIntervalAndLifetime(t *testing.T) {
	for _, tc := range []struct {
		name         string
		pollInterval int
		expiresAt    string
		wantInterval time.Duration
		wantLifetime time.Duration
	}{
		{"server values inside the bounds", 5, "2026-09-14T10:10:00+00:00", 5 * time.Second, 10 * time.Minute},
		{"missing interval", 0, "2026-09-14T10:15:00+00:00", DefaultPollInterval, 15 * time.Minute},
		{"negative interval", -4, "2026-09-14T10:15:00+00:00", DefaultPollInterval, 15 * time.Minute},
		{"one-second interval", 1, "2026-09-14T10:15:00+00:00", time.Second, 15 * time.Minute},
		{"interval above a minute", 120, "2026-09-14T10:15:00+00:00", MaxPollInterval, 15 * time.Minute},
		{"expiry beyond thirty minutes", 3, "2026-09-14T12:00:00+00:00", 3 * time.Second, MaxFlowLifetime},
		{"expiry already past on this clock", 3, "2026-09-14T09:50:00+00:00", 3 * time.Second, DefaultFlowLifetime},
		{"unreadable expiry", 3, "tomorrow", 3 * time.Second, DefaultFlowLifetime},
	} {
		t.Run(tc.name, func(t *testing.T) {
			srv := httptest.NewServer(reply(http.StatusOK, startBody(tc.pollInterval, tc.expiresAt)))
			defer srv.Close()
			flow, err := Start(context.Background(), srv.Client(), srv.URL, "editor@example.org", fixtureNow)
			if err != nil {
				t.Fatal(err)
			}
			if flow.PollInterval != tc.wantInterval || !flow.ExpiresAt.Equal(fixtureNow.Add(tc.wantLifetime)) {
				t.Fatalf("flow = interval %s expires %s, want %s and %s", flow.PollInterval, flow.ExpiresAt, tc.wantInterval, fixtureNow.Add(tc.wantLifetime))
			}
		})
	}
}

func TestStartReportsRefusals(t *testing.T) {
	for _, tc := range []struct {
		name     string
		handler  http.HandlerFunc
		contains string
	}{
		{"send limit", reply(http.StatusTooManyRequests, `{"error":"Too many sign-in emails. Try again later."}`), "Too many sign-in emails"},
		{"email not sent", reply(http.StatusInternalServerError, `{"error":"Failed to send email. Please try again later."}`), "HTTP 500"},
		{"invalid email", reply(http.StatusUnprocessableEntity, `{"detail":[{"msg":"value is not a valid email address"}]}`), "email address"},
		{"malformed request id", reply(http.StatusOK, `{"request_id":"short","poll_interval":3,"expires_at":"2026-09-14T10:15:00+00:00"}`), "unreadable"},
		{"not json", reply(http.StatusOK, `<html>`), "unreadable"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			srv := httptest.NewServer(tc.handler)
			defer srv.Close()
			flow, err := Start(context.Background(), srv.Client(), srv.URL, "editor@example.org", fixtureNow)
			if err == nil || !strings.Contains(err.Error(), tc.contains) || flow.RequestID != "" {
				t.Fatalf("Start = (%+v, %v), want an error containing %q", flow, err, tc.contains)
			}
		})
	}
	closed := httptest.NewServer(reply(http.StatusOK, `{}`))
	closed.Close()
	if _, err := Start(context.Background(), closed.Client(), closed.URL, "editor@example.org", fixtureNow); err == nil {
		t.Fatal("Start against a closed server succeeded")
	}
}

func TestPollMapsTheServerAnswer(t *testing.T) {
	for _, tc := range []struct {
		code int
		body string
		want PollStatus
	}{
		{http.StatusAccepted, `{"status":"pending"}`, PollPending},
		{http.StatusGone, `{"error":"expired_or_used"}`, PollExpired},
		{http.StatusTooManyRequests, `{"error":"slow down"}`, PollPending},
		{http.StatusInternalServerError, ``, PollPending},
		{http.StatusBadGateway, `<html>`, PollPending},
		{http.StatusServiceUnavailable, ``, PollPending},
	} {
		t.Run(http.StatusText(tc.code), func(t *testing.T) {
			var method, path, query, contentType string
			var sent map[string]string
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				method, path, query, contentType = r.Method, r.URL.Path, r.URL.RawQuery, r.Header.Get("Content-Type")
				_ = json.NewDecoder(r.Body).Decode(&sent)
				reply(tc.code, tc.body)(w, r)
			}))
			defer srv.Close()
			registered := []string{}
			result, err := Poll(context.Background(), srv.Client(), srv.URL, fixtureRequestID, func(v string) { registered = append(registered, v) })
			if err != nil {
				t.Fatal(err)
			}
			if result.Status != tc.want || result.Token != "" || len(registered) != 0 {
				t.Fatalf("Poll = %+v registered=%v, want %s", result, registered, tc.want)
			}
			if method != http.MethodPost || path != "/auth/token/poll" || query != "" || contentType != "application/json" ||
				len(sent) != 1 || sent["request_id"] != fixtureRequestID {
				t.Fatalf("request = %s %s?%s type=%q body=%v", method, path, query, contentType, sent)
			}
		})
	}
}

func TestPollUnexpectedAnswerIsAnErrorThatNamesNoRequestID(t *testing.T) {
	for _, code := range []int{http.StatusNotFound, http.StatusUnprocessableEntity, http.StatusUnauthorized} {
		srv := httptest.NewServer(reply(code, `{"detail":"`+fixtureRequestID+`"}`))
		_, err := Poll(context.Background(), srv.Client(), srv.URL, fixtureRequestID, nil)
		srv.Close()
		if err == nil || strings.Contains(err.Error(), fixtureRequestID) {
			t.Fatalf("HTTP %d: err = %v, want an error without the request id", code, err)
		}
	}
}

func TestPollReadyRegistersTheTokenBeforeReturningIt(t *testing.T) {
	srv := httptest.NewServer(reply(http.StatusOK, `{"token":"`+fixtureToken+`","email":"editor@example.org","expires_at":"2026-12-13T10:00:00+00:00"}`))
	defer srv.Close()
	registered := []string{}
	result, err := Poll(context.Background(), srv.Client(), srv.URL, fixtureRequestID, func(v string) { registered = append(registered, v) })
	if err != nil {
		t.Fatal(err)
	}
	if result.Status != PollReady || result.Token != fixtureToken || result.Email != "editor@example.org" {
		t.Fatalf("Poll = %+v", result)
	}
	if len(registered) != 1 || registered[0] != fixtureToken {
		t.Fatalf("registered = %v, want the token", registered)
	}
}

func TestPollReadyWithoutATokenIsAnError(t *testing.T) {
	for _, body := range []string{`{}`, `{"token":""}`, `not json`} {
		srv := httptest.NewServer(reply(http.StatusOK, body))
		registered := 0
		result, err := Poll(context.Background(), srv.Client(), srv.URL, fixtureRequestID, func(string) { registered++ })
		srv.Close()
		if err == nil || result.Status != "" || registered != 0 {
			t.Fatalf("body %q: Poll = (%+v, %v) registered=%d", body, result, err, registered)
		}
	}
}

func TestPollTransportFailureStaysPendingUnlessCancelled(t *testing.T) {
	closed := httptest.NewServer(reply(http.StatusAccepted, `{"status":"pending"}`))
	closed.Close()
	result, err := Poll(context.Background(), closed.Client(), closed.URL, fixtureRequestID, nil)
	if err != nil || result.Status != PollPending {
		t.Fatalf("closed server: Poll = (%+v, %v), want pending", result, err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := Poll(ctx, closed.Client(), closed.URL, fixtureRequestID, nil); !errors.Is(err, context.Canceled) {
		t.Fatalf("cancelled poll err = %v, want context.Canceled", err)
	}
}

func TestPollRefusesAMalformedRequestIDBeforeTheNetwork(t *testing.T) {
	client := &http.Client{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
		t.Fatal("a malformed request id reached the network")
		return nil, nil
	})}
	for _, id := range []string{"", "short", strings.Repeat("a", 129), "has spaces in the request id", "../../../../etc/passwd/xx"} {
		if _, err := Poll(context.Background(), client, "https://infoviz.invalid", id, nil); err == nil {
			t.Errorf("request id %q accepted", id)
		}
	}
}

func TestRequestTimeoutIsThirtySeconds(t *testing.T) {
	if RequestTimeout != 30*time.Second {
		t.Fatalf("RequestTimeout = %s, want 30s per request", RequestTimeout)
	}
}
```

- [ ] **Step 2: Run and watch it fail**

```bash
cd /Users/rmdms/Sites/Professional/engine/bsig && go test -count=1 ./internal/infoviz/; echo "exit=$?"
```

Expected: build failure (`no non-test Go files` or `undefined: Start`, `undefined: Poll`), `exit=1`.

- [ ] **Step 3: Implement**

Create `bsig/internal/infoviz/tokenflow.go`:

```go
// Package infoviz is Engine's client for Infoviz's email token flow. It is its
// own wire contract, not a variant of Navigator's device-code flow
// (internal/auth): Infoviz answers a poll by HTTP status rather than a body
// status, and polls by POST so the request id stays out of access logs.
//
// Wire contract (infoviz backend/app/auth/token_routes.py):
//
//	POST /auth/token/start  body {"email": "<addr>"}
//	  200 {"request_id": "<43-char urlsafe>", "poll_interval": 3, "expires_at": "<ISO-8601>"}
//	  429 {"error": "<sentence>"}  send limits
//	  500 {"error": "<sentence>"}  email not sent
//	  422 {"detail": [...]}        invalid email
//	POST /auth/token/poll   body {"request_id": "<id>"}
//	  202 {"status": "pending"}
//	  200 {"token": "<jwt>", "email": "<addr>", "expires_at": "<ISO-8601>"}  exactly once
//	  410 {"error": "expired_or_used"}
//	  422 request id outside 16-128 characters
package infoviz

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

const (
	// RequestTimeout bounds each start or poll request; the flow itself is
	// bounded by its lifetime.
	RequestTimeout = 30 * time.Second
	// DefaultPollInterval stands in when the server sends no usable interval.
	DefaultPollInterval = 3 * time.Second
	// MaxPollInterval caps a server-provided interval.
	MaxPollInterval = 60 * time.Second
	// DefaultFlowLifetime is the server's documented pending-request expiry.
	DefaultFlowLifetime = 15 * time.Minute
	// MaxFlowLifetime caps how long Engine keeps a flow alive.
	MaxFlowLifetime = 30 * time.Minute
	// UserAgent identifies Engine to Infoviz.
	UserAgent = "buriedsignals-engine (+https://github.com/buriedsignals/engine)"

	maxResponseBytes = 64 << 10
)

// requestIDShape mirrors the server's 16-128 character bound and
// token_urlsafe's alphabet, so a malformed id never reaches the network.
var requestIDShape = regexp.MustCompile(`^[A-Za-z0-9_-]{16,128}$`)

// Flow is one started connection. RequestID is a poll credential: whoever
// holds it receives the token once the journalist presses Connect.
type Flow struct {
	RequestID    string
	PollInterval time.Duration
	ExpiresAt    time.Time
}

type PollStatus string

const (
	PollPending PollStatus = "pending"
	PollReady   PollStatus = "ready"
	PollExpired PollStatus = "expired"
)

// PollResult is one observation of a Flow. Token is set only when Status is
// PollReady, and it has already been passed to registerSecret.
type PollResult struct {
	Status PollStatus
	Token  string
	Email  string
}

// Start asks Infoviz to email the journalist a Connect link.
func Start(ctx context.Context, client *http.Client, baseURL, email string, now time.Time) (Flow, error) {
	body, err := json.Marshal(map[string]string{"email": email})
	if err != nil {
		return Flow{}, fmt.Errorf("encoding the Infoviz connection request: %w", err)
	}
	code, raw, err := post(ctx, client, strings.TrimRight(baseURL, "/")+"/auth/token/start", body)
	if err != nil {
		if ctx.Err() != nil {
			return Flow{}, ctx.Err()
		}
		return Flow{}, errors.New("could not reach Infoviz to start the connection")
	}
	switch {
	case code == http.StatusTooManyRequests:
		return Flow{}, fmt.Errorf("Infoviz is not sending more sign-in emails right now (HTTP 429)%s", errorSentence(raw))
	case code == http.StatusUnprocessableEntity:
		return Flow{}, errors.New("Infoviz did not accept that email address (HTTP 422)")
	case code != http.StatusOK:
		return Flow{}, fmt.Errorf("Infoviz could not start the connection (HTTP %d)%s", code, errorSentence(raw))
	}
	var start struct {
		RequestID    string `json:"request_id"`
		PollInterval int    `json:"poll_interval"`
		ExpiresAt    string `json:"expires_at"`
	}
	if err := json.Unmarshal(raw, &start); err != nil || !requestIDShape.MatchString(start.RequestID) {
		return Flow{}, errors.New("Infoviz returned an unreadable connection start")
	}
	return Flow{
		RequestID:    start.RequestID,
		PollInterval: pollInterval(start.PollInterval),
		ExpiresAt:    now.Add(flowLifetime(start.ExpiresAt, now)),
	}, nil
}

// Poll observes a flow once. Rate limits, server errors and transport failures
// are transient and read as pending; the flow's lifetime bounds the retries.
func Poll(ctx context.Context, client *http.Client, baseURL, requestID string, registerSecret func(string)) (PollResult, error) {
	if registerSecret == nil {
		registerSecret = func(string) {}
	}
	if !requestIDShape.MatchString(requestID) {
		return PollResult{}, errors.New("the Infoviz connection request id is malformed")
	}
	body, err := json.Marshal(map[string]string{"request_id": requestID})
	if err != nil {
		return PollResult{}, fmt.Errorf("encoding the Infoviz poll: %w", err)
	}
	code, raw, err := post(ctx, client, strings.TrimRight(baseURL, "/")+"/auth/token/poll", body)
	if err != nil {
		if ctx.Err() != nil {
			return PollResult{}, ctx.Err()
		}
		return PollResult{Status: PollPending}, nil
	}
	switch {
	case code == http.StatusAccepted, code == http.StatusTooManyRequests, code >= 500:
		return PollResult{Status: PollPending}, nil
	case code == http.StatusGone:
		return PollResult{Status: PollExpired}, nil
	case code == http.StatusOK:
		var ready struct {
			Token string `json:"token"`
			Email string `json:"email"`
		}
		if err := json.Unmarshal(raw, &ready); err != nil || ready.Token == "" {
			return PollResult{}, errors.New("Infoviz reported the connection ready but delivered no token; connect again")
		}
		registerSecret(ready.Token)
		return PollResult{Status: PollReady, Token: ready.Token, Email: ready.Email}, nil
	default:
		return PollResult{}, fmt.Errorf("Infoviz answered the connection poll unexpectedly (HTTP %d)", code)
	}
}

// post sends one bounded JSON POST. The returned error covers only failures
// before a response; its text is never surfaced, because net/http errors can
// reproduce the request URL.
func post(ctx context.Context, client *http.Client, url string, body []byte) (int, []byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return 0, nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", UserAgent)
	resp, err := client.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, maxResponseBytes))
	return resp.StatusCode, raw, nil
}

// pollInterval clamps the server's interval to 1-60 seconds.
func pollInterval(seconds int) time.Duration {
	if seconds <= 0 {
		return DefaultPollInterval
	}
	return time.Duration(min(seconds, int(MaxPollInterval/time.Second))) * time.Second
}

// flowLifetime bounds a flow by the server's absolute expiry. A local clock
// that disagrees with the server (expiry already past, or unreadable) must not
// end a live flow at once: the server's documented 15 minutes stands in, and
// the server's 410 still ends the flow early. Thirty minutes is the ceiling.
func flowLifetime(expiresAt string, now time.Time) time.Duration {
	parsed, err := time.Parse(time.RFC3339, expiresAt)
	if err != nil {
		return DefaultFlowLifetime
	}
	remaining := parsed.Sub(now)
	switch {
	case remaining < time.Second:
		return DefaultFlowLifetime
	case remaining > MaxFlowLifetime:
		return MaxFlowLifetime
	default:
		return remaining
	}
}

// errorSentence returns the server's {"error": "..."} text as a bounded
// suffix. Infoviz error sentences carry no credential.
func errorSentence(raw []byte) string {
	var body struct {
		Error string `json:"error"`
	}
	if json.Unmarshal(raw, &body) != nil {
		return ""
	}
	text := []rune(strings.TrimSpace(body.Error))
	if len(text) == 0 {
		return ""
	}
	if len(text) > 200 {
		return ": " + string(text[:200]) + "…"
	}
	return ": " + string(text)
}
```

- [ ] **Step 4: Run and watch it pass**

```bash
cd /Users/rmdms/Sites/Professional/engine/bsig && gofmt -l internal/infoviz && go vet ./internal/infoviz/ && go test -race -count=1 ./internal/infoviz/; echo "exit=$?"
```

Expected: nothing from `gofmt -l`; `ok  github.com/buriedsignals/engine/internal/infoviz`, `exit=0`.

- [ ] **Step 5: Mutation checks**

1. In `Poll`, replace `case code == http.StatusGone:` with `case code == http.StatusGone && false:`. Run Step 4. Expected: `TestPollMapsTheServerAnswer/Gone` FAILS. Revert.
2. In `Poll`, delete the line `registerSecret(ready.Token)`. Run Step 4. Expected: `TestPollReadyRegistersTheTokenBeforeReturningIt` FAILS. Revert.
3. In `pollInterval`, replace `min(seconds, int(MaxPollInterval/time.Second))` with `seconds`. Run Step 4. Expected: `TestStartBoundsPollIntervalAndLifetime/interval_above_a_minute` FAILS. Revert.

Re-run Step 4 after the last revert; expect `exit=0`.

- [ ] **Step 6: Commit**

```bash
git -C /Users/rmdms/Sites/Professional/engine add bsig/internal/infoviz/tokenflow.go bsig/internal/infoviz/tokenflow_test.go
git -C /Users/rmdms/Sites/Professional/engine commit -m "infoviz: email token flow client with bounded cadence and on-arrival token redaction" -- bsig/internal/infoviz/tokenflow.go bsig/internal/infoviz/tokenflow_test.go
```

---

## Task 4: Engine flow handles (`internal/keys/emailflow.go`)

**Files:**
- Create: `bsig/internal/keys/emailflow.go`
- Test: `bsig/internal/keys/emailflow_test.go`

**Interfaces:**
- Produces:
  - `type EmailFlow struct { SchemaVersion string; ID string; RequestID string; ExpiresAt time.Time }` (JSON `schemaVersion`, `id`, `requestId`, `expiresAt`; schema `bsig-email-flow/v1`).
  - `type EmailFlowStore struct { Dir string }`; `func NewEmailFlowStore(baseDir string) EmailFlowStore` → `Dir = <baseDir>/keys-connect`.
  - `func ValidEmailFlowHandle(handle string) bool` — exactly 64 lowercase hex characters.
  - `func (s EmailFlowStore) Create(flow EmailFlow, now time.Time) (string, error)` — forgets flows whose `ExpiresAt` is not after `now` (and unreadable flow files), then writes `<Dir>/<handle>.json` with mode 0600 (directory 0700) under a fresh `crypto/rand` handle.
  - `func (s EmailFlowStore) Load(handle string) (EmailFlow, bool, error)` — malformed handle → error; missing → `(EmailFlow{}, false, nil)`; unreadable/foreign-schema file → removed, `(EmailFlow{}, false, nil)`.
  - `func (s EmailFlowStore) Forget(handle string) error` — malformed handle → error; absent → nil.

Why a handle and not the raw request id as `flowId` (decision): the emitter tees every result to `<baseDir>/audit.log` forever and the desktop keeps recent events for diagnostics, while the spec calls the request id "a credential [that] must not appear in access logs"; argv (`poll <request-id>`) is visible to `ps`, and `bsig/AGENTS.md` keeps secrets off argv. Every `bsig` call is a separate process, so `poll` must recover the request id from somewhere: an owner-only file under the Engine directory, deleted when the flow ends and swept after its deadline, is the smallest place. It also lets Engine enforce the lifetime and the credential binding itself instead of trusting argv. The base URL comes from the registry entry and the email hint from the provider's ready answer, so `poll` needs no email argument (unlike `auth poll <flow-id> <email>`).

- [ ] **Step 1: Write the failing tests**

Create `bsig/internal/keys/emailflow_test.go`:

```go
package keys

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"
)

const emailFlowTestRequestID = "Yp3kQ9rT5vNcXzLmJh9Bd2WgK3yPq8rT5vNcXzLmJh9"

var emailFlowTestTime = time.Date(2026, 9, 14, 10, 0, 0, 0, time.UTC)

func emailFlowFixture(expiresAt time.Time) EmailFlow {
	return EmailFlow{ID: "INFOVIZ_TOKEN", RequestID: emailFlowTestRequestID, ExpiresAt: expiresAt}
}

func TestEmailFlowStoreRoundTripsBehindAnOpaqueOwnerOnlyHandle(t *testing.T) {
	store := NewEmailFlowStore(t.TempDir())
	expires := emailFlowTestTime.Add(15 * time.Minute)
	handle, err := store.Create(emailFlowFixture(expires), emailFlowTestTime)
	if err != nil {
		t.Fatal(err)
	}
	if !ValidEmailFlowHandle(handle) || strings.Contains(handle, emailFlowTestRequestID) {
		t.Fatalf("handle %q is not an opaque 64-hex handle", handle)
	}
	flow, found, err := store.Load(handle)
	if err != nil || !found || flow.ID != "INFOVIZ_TOKEN" || flow.RequestID != emailFlowTestRequestID || !flow.ExpiresAt.Equal(expires) {
		t.Fatalf("Load = (%+v, %v, %v)", flow, found, err)
	}
	if runtime.GOOS == "windows" {
		return
	}
	for path, want := range map[string]os.FileMode{store.Dir: 0o700, filepath.Join(store.Dir, handle+".json"): 0o600} {
		info, err := os.Stat(path)
		if err != nil {
			t.Fatal(err)
		}
		if info.Mode().Perm() != want {
			t.Fatalf("%s mode = %v, want %v", path, info.Mode().Perm(), want)
		}
	}
}

func TestEmailFlowStoreIssuesADistinctHandlePerFlow(t *testing.T) {
	store := NewEmailFlowStore(t.TempDir())
	first, err := store.Create(emailFlowFixture(emailFlowTestTime.Add(time.Minute)), emailFlowTestTime)
	if err != nil {
		t.Fatal(err)
	}
	second, err := store.Create(emailFlowFixture(emailFlowTestTime.Add(time.Minute)), emailFlowTestTime)
	if err != nil {
		t.Fatal(err)
	}
	if first == second {
		t.Fatal("two flows share a handle")
	}
}

func TestEmailFlowStoreRefusesMalformedHandles(t *testing.T) {
	store := NewEmailFlowStore(t.TempDir())
	for _, handle := range []string{
		"", "../audit", strings.Repeat("g", 64), strings.Repeat("A", 64),
		strings.Repeat("a", 63), strings.Repeat("a", 65), strings.Repeat("a", 60) + "/../",
	} {
		if ValidEmailFlowHandle(handle) {
			t.Errorf("handle %q accepted", handle)
		}
		if _, _, err := store.Load(handle); err == nil {
			t.Errorf("Load(%q) succeeded", handle)
		}
		if err := store.Forget(handle); err == nil {
			t.Errorf("Forget(%q) succeeded", handle)
		}
	}
}

func TestEmailFlowStoreForgottenAndUnknownFlowsReadAsAbsent(t *testing.T) {
	store := NewEmailFlowStore(t.TempDir())
	handle, err := store.Create(emailFlowFixture(emailFlowTestTime.Add(time.Minute)), emailFlowTestTime)
	if err != nil {
		t.Fatal(err)
	}
	if err := store.Forget(handle); err != nil {
		t.Fatal(err)
	}
	if _, found, err := store.Load(handle); err != nil || found {
		t.Fatalf("Load after Forget = (%v, %v), want absent", found, err)
	}
	if err := store.Forget(handle); err != nil {
		t.Fatalf("forgetting twice: %v", err)
	}
	if _, found, err := store.Load(strings.Repeat("0", 64)); err != nil || found {
		t.Fatalf("Load of an unknown handle = (%v, %v), want absent", found, err)
	}
}

func TestEmailFlowStoreRemovesAnUnreadableFlow(t *testing.T) {
	store := NewEmailFlowStore(t.TempDir())
	handle, err := store.Create(emailFlowFixture(emailFlowTestTime.Add(time.Minute)), emailFlowTestTime)
	if err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(store.Dir, handle+".json")
	if err := os.WriteFile(path, []byte(`{"schemaVersion":"something-else"}`), 0o600); err != nil {
		t.Fatal(err)
	}
	if _, found, err := store.Load(handle); err != nil || found {
		t.Fatalf("Load of an unreadable flow = (%v, %v), want absent", found, err)
	}
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatalf("unreadable flow file survived: %v", err)
	}
}

func TestEmailFlowStoreCreateForgetsFlowsPastTheirDeadline(t *testing.T) {
	store := NewEmailFlowStore(t.TempDir())
	expired, err := store.Create(emailFlowFixture(emailFlowTestTime.Add(time.Minute)), emailFlowTestTime)
	if err != nil {
		t.Fatal(err)
	}
	live, err := store.Create(emailFlowFixture(emailFlowTestTime.Add(time.Hour)), emailFlowTestTime)
	if err != nil {
		t.Fatal(err)
	}
	later := emailFlowTestTime.Add(2 * time.Minute)
	if _, err := store.Create(emailFlowFixture(later.Add(15*time.Minute)), later); err != nil {
		t.Fatal(err)
	}
	if _, found, _ := store.Load(expired); found {
		t.Fatal("a flow past its deadline survived the next start")
	}
	if _, found, _ := store.Load(live); !found {
		t.Fatal("a live flow was swept")
	}
}
```

- [ ] **Step 2: Run and watch it fail**

```bash
cd /Users/rmdms/Sites/Professional/engine/bsig && go test -count=1 -run 'TestEmailFlowStore' ./internal/keys/; echo "exit=$?"
```

Expected: build failure `undefined: NewEmailFlowStore` (and `EmailFlow`, `ValidEmailFlowHandle`), `exit=1`.

- [ ] **Step 3: Implement**

Create `bsig/internal/keys/emailflow.go`:

```go
package keys

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

const emailFlowSchemaVersion = "bsig-email-flow/v1"

var emailFlowHandle = regexp.MustCompile(`^[0-9a-f]{64}$`)

// EmailFlow is Engine's record of one email-flow acquisition in progress.
// RequestID is the provider's poll credential: whoever holds it receives the
// token once the journalist confirms. It stays in an owner-only file under
// the Engine directory and never crosses stdout, events, or the audit log;
// clients hold only the opaque handle.
type EmailFlow struct {
	SchemaVersion string    `json:"schemaVersion"`
	ID            string    `json:"id"`
	RequestID     string    `json:"requestId"`
	ExpiresAt     time.Time `json:"expiresAt"`
}

// EmailFlowStore carries pending flows between the short-lived `keys connect`
// processes: `start` and `poll` are separate Engine invocations.
type EmailFlowStore struct{ Dir string }

func NewEmailFlowStore(baseDir string) EmailFlowStore {
	return EmailFlowStore{Dir: filepath.Join(baseDir, "keys-connect")}
}

// ValidEmailFlowHandle reports whether handle has the shape Create issues, so
// a caller-supplied string is never joined into a path.
func ValidEmailFlowHandle(handle string) bool { return emailFlowHandle.MatchString(handle) }

// Create stores flow under a fresh random handle, after forgetting every flow
// whose deadline has passed.
func (s EmailFlowStore) Create(flow EmailFlow, now time.Time) (string, error) {
	if !filepath.IsAbs(s.Dir) {
		return "", errors.New("the email-flow directory must be absolute")
	}
	if err := os.MkdirAll(s.Dir, 0o700); err != nil {
		return "", fmt.Errorf("creating the email-flow directory: %w", err)
	}
	info, err := os.Lstat(s.Dir)
	if err != nil || !info.IsDir() || info.Mode()&os.ModeSymlink != 0 {
		return "", errors.New("the email-flow directory must be a real directory")
	}
	if err := os.Chmod(s.Dir, 0o700); err != nil {
		return "", fmt.Errorf("securing the email-flow directory: %w", err)
	}
	s.sweep(now)

	var random [32]byte
	if _, err := rand.Read(random[:]); err != nil {
		return "", fmt.Errorf("creating an email-flow handle: %w", err)
	}
	handle := hex.EncodeToString(random[:])
	flow.SchemaVersion = emailFlowSchemaVersion
	body, err := json.Marshal(flow)
	if err != nil {
		return "", fmt.Errorf("encoding the email flow: %w", err)
	}
	path := filepath.Join(s.Dir, handle+".json")
	file, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600)
	if err != nil {
		return "", fmt.Errorf("writing the email flow: %w", err)
	}
	if _, err := file.Write(body); err != nil {
		_ = file.Close()
		_ = os.Remove(path)
		return "", fmt.Errorf("writing the email flow: %w", err)
	}
	if err := file.Close(); err != nil {
		_ = os.Remove(path)
		return "", fmt.Errorf("writing the email flow: %w", err)
	}
	return handle, nil
}

// Load returns the flow behind handle. A missing flow and a flow file Engine
// cannot read are both absent: the journalist's remedy is the same (connect
// again), and an unreadable file is removed so it cannot linger.
func (s EmailFlowStore) Load(handle string) (EmailFlow, bool, error) {
	if !ValidEmailFlowHandle(handle) {
		return EmailFlow{}, false, errors.New("the email-flow handle is malformed")
	}
	path := filepath.Join(s.Dir, handle+".json")
	body, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return EmailFlow{}, false, nil
	}
	if err != nil {
		return EmailFlow{}, false, fmt.Errorf("reading the email flow: %w", err)
	}
	var flow EmailFlow
	if err := json.Unmarshal(body, &flow); err != nil || flow.SchemaVersion != emailFlowSchemaVersion ||
		flow.ID == "" || flow.RequestID == "" || flow.ExpiresAt.IsZero() {
		_ = os.Remove(path)
		return EmailFlow{}, false, nil
	}
	return flow, true, nil
}

// Forget removes a flow; forgetting an absent flow succeeds.
func (s EmailFlowStore) Forget(handle string) error {
	if !ValidEmailFlowHandle(handle) {
		return errors.New("the email-flow handle is malformed")
	}
	if err := os.Remove(filepath.Join(s.Dir, handle+".json")); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("forgetting the email flow: %w", err)
	}
	return nil
}

func (s EmailFlowStore) sweep(now time.Time) {
	entries, err := os.ReadDir(s.Dir)
	if err != nil {
		return
	}
	for _, entry := range entries {
		handle, ok := strings.CutSuffix(entry.Name(), ".json")
		if !ok || !ValidEmailFlowHandle(handle) {
			continue
		}
		flow, found, err := s.Load(handle)
		if err == nil && found && now.Before(flow.ExpiresAt) {
			continue
		}
		_ = s.Forget(handle)
	}
}
```

- [ ] **Step 4: Run and watch it pass**

```bash
cd /Users/rmdms/Sites/Professional/engine/bsig && gofmt -l internal/keys && go test -race -count=1 -run 'TestEmailFlowStore' ./internal/keys/; echo "exit=$?"
```

Expected: nothing from `gofmt -l`; `ok`, `exit=0`.

- [ ] **Step 5: Mutation checks**

1. In `sweep`, replace `if err == nil && found && now.Before(flow.ExpiresAt) {` with `if err == nil && found && !flow.ExpiresAt.IsZero() {` (keeps `flow` used so it compiles). Run Step 4. Expected: `TestEmailFlowStoreCreateForgetsFlowsPastTheirDeadline` FAILS. Revert.
2. Replace the regexp literal `` `^[0-9a-f]{64}$` `` with `` `^[0-9a-zA-Z./]{1,65}$` ``. Run Step 4. Expected: `TestEmailFlowStoreRefusesMalformedHandles` FAILS. Revert.

Re-run Step 4; expect `exit=0`.

- [ ] **Step 6: Commit**

```bash
git -C /Users/rmdms/Sites/Professional/engine add bsig/internal/keys/emailflow.go bsig/internal/keys/emailflow_test.go
git -C /Users/rmdms/Sites/Professional/engine commit -m "keys: keep pending email-flow request ids behind opaque owner-only handles" -- bsig/internal/keys/emailflow.go bsig/internal/keys/emailflow_test.go
```

---

## Task 5: `bsig keys connect <ID> start|poll`

**Files:**
- Create: `bsig/cmd/bsig/keys_connect_verb.go`
- Modify: `bsig/cmd/bsig/keys_verb.go` (usage, dispatch, `time` import), `bsig/cmd/bsig/main.go` (`controlStdinAllowed`)
- Test: `bsig/cmd/bsig/keys_connect_verb_test.go` (create), `bsig/cmd/bsig/keys_verb_test.go` (`TestKeysUsageErrors`), `bsig/cmd/bsig/control_stdin_test.go`

**Interfaces:**
- Consumes: `keys.Entry.AcquisitionKind()`, `keys.AcquisitionEmailFlow` (Task 2); `infoviz.Start`, `infoviz.Poll`, `infoviz.RequestTimeout`, `infoviz.PollPending|PollExpired` (Task 3); `keys.NewEmailFlowStore`, `keys.EmailFlow`, `keys.ValidEmailFlowHandle` (Task 4); on `origin/main`: `recordBroker(d)`, `RecordBroker.Status`, `RecordBroker.Replace`, `recordStatusData`, `projectGooseSecrets`, `unknownKeyIDError`, `validateAuthEmail`, `auth.EmailHint`, `usageError`.
- Produces (Go): `func keysConnect(ctx context.Context, d *deps, args []string, now time.Time) error`; `func emailFlowClientFor(entry keys.Entry) (emailFlowClient, bool)`; `const keysConnectUsage`.
- Produces (CLI, `--json`): see "Contract for the desktop plan" at the end — results `pending` / `expired` / `connected`, `flowId` 64-hex, `expiresInSeconds` 1–1800, `pollIntervalSeconds` 1–60, `emailHint`.
- Produces (control stream): `bsig --control-stdin=v1 keys connect …` is accepted (the verb reads nothing from stdin).

Behaviour, in order, per invocation:
- `start`: usage → registry lookup → refuse unless record + email-flow + wire client → `validateAuthEmail` → `RecordBroker.Status` (refuse before an email is sent if the broker is unavailable) → `infoviz.Start` → register the request id with the redactor → `EmailFlowStore.Create` → result `pending`.
- `poll`: usage → lookup → same refusal → handle shape (usage error) → `Load` (absent → `expired`) → credential binding (usage error) → deadline (`now` not before `ExpiresAt` → forget, `expired`, no network) → register the request id → `infoviz.Poll` → `pending` (flow kept) | `expired` (forget) | ready → forget → `Status` → `Replace(ctx, entry, token, ValidationContext{}, status.Generation)` → Goose projection → result `connected`. A `Replace` failure returns its typed error (the token is not kept anywhere; the journalist connects again).
- No `cancel` subcommand: Infoviz has no server-side cancel; a client cancels by no longer polling, and the flow file dies at its deadline (refused by `poll`, swept by the next `start`).

- [ ] **Step 1: Write the failing tests**

Create `bsig/cmd/bsig/keys_connect_verb_test.go`:

```go
package main

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/buriedsignals/engine/internal/keys"
)

const (
	connectRequestID = "Yp3kQ9rT5vNcXzLmJh9Bd2WgK3yPq8rT5vNcXzLmJh9"
	connectToken     = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImVkaXRvckBleGFtcGxlLm9yZyIsInR5cGUiOiJhcGkifQ.Y29ubmVjdC1maXh0dXJl"
	connectEmail     = "editor@example.org"
)

var connectNow = time.Date(2026, 9, 14, 10, 0, 0, 0, time.UTC)

// infovizFixture replays Infoviz's token-flow and status wire shapes
// (infoviz backend/app/auth/token_routes.py and routes.py auth_status).
type infovizFixture struct {
	mu         sync.Mutex
	expiresAt  time.Time
	pollCode   int
	pollBody   string
	statusCode int
	statusBody string
	starts     int
	polls      int
	pollBodies []string
	statusAuth []string
}

func newInfovizFixture(t *testing.T) (*infovizFixture, *httptest.Server) {
	t.Helper()
	f := &infovizFixture{
		expiresAt: connectNow.Add(15 * time.Minute),
		pollCode:  http.StatusAccepted, pollBody: `{"status":"pending"}`,
		statusCode: http.StatusOK, statusBody: `{"authenticated":true,"email":"` + connectEmail + `","daily_limit":10}`,
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		f.mu.Lock()
		defer f.mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		switch {
		case r.Method == http.MethodPost && r.URL.Path == "/auth/token/start":
			f.starts++
			fmt.Fprintf(w, `{"request_id":%q,"poll_interval":3,"expires_at":%q}`, connectRequestID, f.expiresAt.Format(time.RFC3339))
		case r.Method == http.MethodPost && r.URL.Path == "/auth/token/poll":
			f.polls++
			body, _ := io.ReadAll(r.Body)
			f.pollBodies = append(f.pollBodies, string(body))
			w.WriteHeader(f.pollCode)
			_, _ = io.WriteString(w, f.pollBody)
		case r.Method == http.MethodGet && r.URL.Path == "/auth/status":
			f.statusAuth = append(f.statusAuth, r.Header.Get("Authorization"))
			w.WriteHeader(f.statusCode)
			_, _ = io.WriteString(w, f.statusBody)
		default:
			t.Errorf("unexpected Infoviz request %s %s", r.Method, r.URL.Path)
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(srv.Close)
	return f, srv
}

func (f *infovizFixture) set(apply func(*infovizFixture)) {
	f.mu.Lock()
	defer f.mu.Unlock()
	apply(f)
}

func (f *infovizFixture) counts() (starts, polls int) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.starts, f.polls
}

func readyPollBody() string {
	return `{"token":"` + connectToken + `","email":"` + connectEmail + `","expires_at":"2026-12-13T10:00:00+00:00"}`
}

func mustRegistryEntry(t *testing.T, id string) keys.Entry {
	t.Helper()
	entry, ok := keys.Lookup(keys.Registry(), id)
	if !ok {
		t.Fatalf("registry has no %s", id)
	}
	return entry
}

func infovizConnectDeps(t *testing.T, baseURL string) (*deps, *keys.FakeStore, *bytes.Buffer) {
	t.Helper()
	entry := mustRegistryEntry(t, "INFOVIZ_TOKEN")
	entry.BaseURL = baseURL
	return newKeysDeps(t, "", []keys.Entry{entry})
}

func startConnect(t *testing.T, d *deps, out *bytes.Buffer, now time.Time) string {
	t.Helper()
	out.Reset()
	if err := keysConnect(context.Background(), d, []string{"INFOVIZ_TOKEN", "start", connectEmail}, now); err != nil {
		t.Fatalf("connect start: %v", err)
	}
	flowID, _ := lastEvent(t, out)["data"].(map[string]any)["flowId"].(string)
	return flowID
}

func pollConnect(t *testing.T, d *deps, out *bytes.Buffer, flowID string, now time.Time) map[string]any {
	t.Helper()
	out.Reset()
	if err := keysConnect(context.Background(), d, []string{"INFOVIZ_TOKEN", "poll", flowID}, now); err != nil {
		t.Fatalf("connect poll: %v", err)
	}
	return lastEvent(t, out)["data"].(map[string]any)
}

// emittedAndAudited is everything the verb ever showed: the current stdout
// buffer plus the whole audit log (which out.Reset does not clear).
func emittedAndAudited(t *testing.T, d *deps, out *bytes.Buffer) string {
	t.Helper()
	audit, err := os.ReadFile(filepath.Join(d.baseDir, "audit.log"))
	if err != nil {
		t.Fatal(err)
	}
	return out.String() + string(audit)
}

func TestKeysConnectStartReturnsAnOpaqueFlowAndSendsNoSecretOut(t *testing.T) {
	f, srv := newInfovizFixture(t)
	d, store, out := infovizConnectDeps(t, srv.URL)
	flowID := startConnect(t, d, out, connectNow)
	data := lastEvent(t, out)["data"].(map[string]any)
	if data["id"] != "INFOVIZ_TOKEN" || data["status"] != "pending" || !keys.ValidEmailFlowHandle(flowID) ||
		data["expiresInSeconds"] != float64(900) || data["pollIntervalSeconds"] != float64(3) {
		t.Fatalf("start data = %v", data)
	}
	if starts, _ := f.counts(); starts != 1 {
		t.Fatalf("start requests = %d, want 1", starts)
	}
	// The request id is registered with the redactor, so a leak would show as
	// [redacted]: its absence proves the handle, not the id, went out.
	surfaces := emittedAndAudited(t, d, out)
	if strings.Contains(surfaces, connectRequestID) || strings.Contains(surfaces, "[redacted]") || strings.Contains(surfaces, connectEmail) {
		t.Fatalf("start emitted the request id (even redacted) or the email: %q", surfaces)
	}
	if ids, _ := store.List(); len(ids) != 0 {
		t.Fatalf("start stored %v before any token arrived", ids)
	}
}

func TestKeysConnectPollConnectsThroughTheValidatingBrokerWithoutLeakingTheToken(t *testing.T) {
	f, srv := newInfovizFixture(t)
	d, store, out := infovizConnectDeps(t, srv.URL)
	flowID := startConnect(t, d, out, connectNow)

	if data := pollConnect(t, d, out, flowID, connectNow.Add(3*time.Second)); data["status"] != "pending" {
		t.Fatalf("first poll = %v, want pending", data)
	}
	f.set(func(f *infovizFixture) { f.pollCode, f.pollBody = http.StatusOK, readyPollBody() })
	data := pollConnect(t, d, out, flowID, connectNow.Add(6*time.Second))
	validation, _ := data["validation"].(map[string]any)
	if data["status"] != "connected" || data["id"] != "INFOVIZ_TOKEN" || data["stored"] != true || data["generation"] != float64(1) ||
		data["emailHint"] != "e***@example.org" || validation["status"] != "verified" {
		t.Fatalf("connected data = %v", data)
	}

	f.mu.Lock()
	pollBodies := append([]string(nil), f.pollBodies...)
	statusAuth := append([]string(nil), f.statusAuth...)
	f.mu.Unlock()
	if len(pollBodies) != 2 || pollBodies[0] != `{"request_id":"`+connectRequestID+`"}` {
		t.Fatalf("poll bodies = %v", pollBodies)
	}
	if len(statusAuth) != 1 || statusAuth[0] != "Bearer "+connectToken {
		t.Fatalf("validation requests = %v, want one Bearer probe with the delivered token", statusAuth)
	}
	if raw, err := store.Get("INFOVIZ_TOKEN"); err != nil || !strings.Contains(raw, connectToken) {
		t.Fatalf("stored record = (%q, %v)", raw, err)
	}
	if d.redactor.Redact(connectToken) == connectToken {
		t.Fatal("the delivered token was not registered with the redactor")
	}
	if surfaces := emittedAndAudited(t, d, out); strings.Contains(surfaces, connectToken) || strings.Contains(surfaces, "[redacted]") {
		t.Fatalf("connect emitted the token (even redacted): %q", surfaces)
	}

	if data := pollConnect(t, d, out, flowID, connectNow.Add(9*time.Second)); data["status"] != "expired" {
		t.Fatalf("poll after connect = %v, want expired", data)
	}
	if _, polls := f.counts(); polls != 2 {
		t.Fatalf("a finished flow reached Infoviz again: %d polls", polls)
	}
}

func TestKeysConnectReplacesAnExistingRecordAtItsCurrentGeneration(t *testing.T) {
	f, srv := newInfovizFixture(t)
	d, _, out := infovizConnectDeps(t, srv.URL)
	if _, err := recordBroker(d).Replace(context.Background(), d.keyRegistry[0], "previous-infoviz-token-123", keys.ValidationContext{}, 0); err != nil {
		t.Fatalf("seeding the previous record: %v", err)
	}
	flowID := startConnect(t, d, out, connectNow)
	f.set(func(f *infovizFixture) { f.pollCode, f.pollBody = http.StatusOK, readyPollBody() })
	if data := pollConnect(t, d, out, flowID, connectNow.Add(3*time.Second)); data["status"] != "connected" || data["generation"] != float64(2) {
		t.Fatalf("reconnect data = %v, want connected at generation 2", data)
	}
}

func TestKeysConnectPollReportsExpiredOnGoneAndPastTheDeadlineWithoutAsking(t *testing.T) {
	f, srv := newInfovizFixture(t)
	d, store, out := infovizConnectDeps(t, srv.URL)

	gone := startConnect(t, d, out, connectNow)
	f.set(func(f *infovizFixture) { f.pollCode, f.pollBody = http.StatusGone, `{"error":"expired_or_used"}` })
	if data := pollConnect(t, d, out, gone, connectNow.Add(3*time.Second)); data["status"] != "expired" {
		t.Fatalf("410 poll = %v, want expired", data)
	}
	if data := pollConnect(t, d, out, gone, connectNow.Add(6*time.Second)); data["status"] != "expired" {
		t.Fatalf("poll of a gone flow = %v, want expired", data)
	}
	if _, polls := f.counts(); polls != 1 {
		t.Fatalf("a gone flow reached Infoviz again: %d polls", polls)
	}

	late := startConnect(t, d, out, connectNow)
	if data := pollConnect(t, d, out, late, connectNow.Add(15*time.Minute)); data["status"] != "expired" {
		t.Fatalf("poll at the deadline = %v, want expired", data)
	}
	if _, polls := f.counts(); polls != 1 {
		t.Fatalf("a flow at its deadline reached Infoviz: %d polls", polls)
	}
	if ids, _ := store.List(); len(ids) != 0 {
		t.Fatalf("expired flows stored %v", ids)
	}
}

func TestKeysConnectPollStaysPendingThroughTransientFailures(t *testing.T) {
	f, srv := newInfovizFixture(t)
	d, _, out := infovizConnectDeps(t, srv.URL)
	flowID := startConnect(t, d, out, connectNow)
	for i, code := range []int{http.StatusTooManyRequests, http.StatusInternalServerError, http.StatusServiceUnavailable} {
		f.set(func(f *infovizFixture) { f.pollCode, f.pollBody = code, `{"error":"try later"}` })
		if data := pollConnect(t, d, out, flowID, connectNow.Add(time.Duration(i+1)*3*time.Second)); data["status"] != "pending" {
			t.Fatalf("HTTP %d poll = %v, want pending", code, data)
		}
	}
	if _, polls := f.counts(); polls != 3 {
		t.Fatalf("polls = %d, want the flow kept and polled three times", polls)
	}
}

func TestKeysConnectTokenTheValidatorRefusesWritesNothingAndEndsTheFlow(t *testing.T) {
	f, srv := newInfovizFixture(t)
	d, store, out := infovizConnectDeps(t, srv.URL)
	flowID := startConnect(t, d, out, connectNow)
	f.set(func(f *infovizFixture) {
		f.pollCode, f.pollBody = http.StatusOK, readyPollBody()
		f.statusBody = `{"authenticated":false,"daily_limit":5}`
	})
	out.Reset()
	err := keysConnect(context.Background(), d, []string{"INFOVIZ_TOKEN", "poll", flowID}, connectNow.Add(3*time.Second))
	var rejected *keys.MutationRejectedError
	if !errors.As(err, &rejected) || rejected.Outcome != "invalid" {
		t.Fatalf("poll error = %v, want an invalid-token rejection", err)
	}
	if emitErr := d.emitter.ErrorData(err.Error(), rejected.EventData()); emitErr != nil {
		t.Fatal(emitErr)
	}
	if ids, _ := store.List(); len(ids) != 0 {
		t.Fatalf("a refused token was stored: %v", ids)
	}
	if strings.Contains(emittedAndAudited(t, d, out), connectToken) {
		t.Fatal("the refused token reached stdout or the audit log")
	}
	if data := pollConnect(t, d, out, flowID, connectNow.Add(6*time.Second)); data["status"] != "expired" {
		t.Fatalf("poll after a refused token = %v, want expired", data)
	}
}

func TestKeysConnectRefusesPasteCredentialsAndMalformedFlowsBeforeStoreOrNetwork(t *testing.T) {
	f, srv := newInfovizFixture(t)
	d, _, out := infovizConnectDeps(t, srv.URL)
	d.keyRegistry = append(d.keyRegistry, mustRegistryEntry(t, "DATAWRAPPER_TOKEN"), mustRegistryEntry(t, "FIRECRAWL_API_KEY"))
	d.keys = accessTrappingStore{t: t}

	for _, id := range []string{"DATAWRAPPER_TOKEN", "FIRECRAWL_API_KEY"} {
		if err := keysConnect(context.Background(), d, []string{id, "start", connectEmail}, connectNow); err == nil || !strings.Contains(err.Error(), "not connected by email") {
			t.Errorf("%s: connect start err = %v, want a paste-credential refusal", id, err)
		}
	}
	if err := keysConnect(context.Background(), d, []string{"NOT_A_KEY", "start", connectEmail}, connectNow); err == nil || !strings.Contains(err.Error(), `unknown key id "NOT_A_KEY"`) {
		t.Errorf("unknown id err = %v", err)
	}
	if err := keysConnect(context.Background(), d, []string{"INFOVIZ_TOKEN", "start", "not-an-email"}, connectNow); err == nil {
		t.Error("an address without @ started a flow")
	}

	var usage *usageError
	if err := keysConnect(context.Background(), d, []string{"INFOVIZ_TOKEN", "poll", "../../audit.log"}, connectNow); !errors.As(err, &usage) {
		t.Errorf("malformed flow id err = %v, want a usage error", err)
	}
	foreign, err := keys.NewEmailFlowStore(d.baseDir).Create(keys.EmailFlow{ID: "OTHER_TOKEN", RequestID: connectRequestID, ExpiresAt: connectNow.Add(time.Minute)}, connectNow)
	if err != nil {
		t.Fatal(err)
	}
	if err := keysConnect(context.Background(), d, []string{"INFOVIZ_TOKEN", "poll", foreign}, connectNow); !errors.As(err, &usage) {
		t.Errorf("foreign flow err = %v, want a usage error", err)
	}

	out.Reset()
	if err := keysConnect(context.Background(), d, []string{"INFOVIZ_TOKEN", "poll", strings.Repeat("0", 64)}, connectNow); err != nil {
		t.Fatalf("unknown flow: %v", err)
	}
	if data := lastEvent(t, out)["data"].(map[string]any); data["status"] != "expired" {
		t.Fatalf("unknown flow = %v, want expired", data)
	}
	if starts, polls := f.counts(); starts != 0 || polls != 0 {
		t.Fatalf("refused invocations reached Infoviz: starts=%d polls=%d", starts, polls)
	}
}

func TestKeysConnectStartRefusesBeforeEmailingWhenTheBrokerIsUnavailable(t *testing.T) {
	f, srv := newInfovizFixture(t)
	d, _, _ := infovizConnectDeps(t, srv.URL)
	d.keys = unavailableRecordStore{err: errors.New("synthetic store outage")}
	err := keysConnect(context.Background(), d, []string{"INFOVIZ_TOKEN", "start", connectEmail}, connectNow)
	var unavailable *keys.BrokerUnavailableError
	if !errors.As(err, &unavailable) {
		t.Fatalf("start err = %v, want BrokerUnavailableError", err)
	}
	if starts, _ := f.counts(); starts != 0 {
		t.Fatal("Infoviz emailed the journalist although the token could not be stored")
	}
}

func TestKeysDispatchesConnect(t *testing.T) {
	f, srv := newInfovizFixture(t)
	f.set(func(f *infovizFixture) { f.expiresAt = time.Now().Add(15 * time.Minute) })
	d, _, out := infovizConnectDeps(t, srv.URL)
	if err := handleKeys(context.Background(), d, []string{"connect", "INFOVIZ_TOKEN", "start", connectEmail}); err != nil {
		t.Fatalf("keys connect start: %v", err)
	}
	data := lastEvent(t, out)["data"].(map[string]any)
	flowID, _ := data["flowId"].(string)
	if data["status"] != "pending" || !keys.ValidEmailFlowHandle(flowID) {
		t.Fatalf("dispatched start = %v", data)
	}
	if err := handleKeys(context.Background(), d, []string{"connect", "INFOVIZ_TOKEN", "poll", flowID}); err != nil {
		t.Fatalf("keys connect poll: %v", err)
	}
	if data := lastEvent(t, out)["data"].(map[string]any); data["status"] != "pending" {
		t.Fatalf("dispatched poll = %v", data)
	}
	if !strings.Contains(keysUsage, "connect <key-id>") {
		t.Fatalf("keys usage does not name connect: %q", keysUsage)
	}
}

func TestEveryEmailFlowRegistryEntryHasAWireClient(t *testing.T) {
	found := 0
	for _, entry := range keys.Registry() {
		_, hasClient := emailFlowClientFor(entry)
		emailFlow := entry.AcquisitionKind() == keys.AcquisitionEmailFlow
		if emailFlow != hasClient {
			t.Errorf("%s: email-flow=%v but wire client=%v", entry.ID, emailFlow, hasClient)
		}
		if emailFlow {
			found++
			if entry.Kind() != keys.StorageRecord || entry.ValidateRecord == nil {
				t.Errorf("%s is email-flow but not a validated record", entry.ID)
			}
		}
	}
	if found == 0 {
		t.Fatal("no email-flow credential is registered")
	}
}
```

In `bsig/cmd/bsig/keys_verb_test.go`, inside `TestKeysUsageErrors`, replace:

```go
		{"list", "extra"},
		{"frobnicate"},
```

with:

```go
		{"list", "extra"},
		{"frobnicate"},
		{"connect"},
		{"connect", "INFOVIZ_TOKEN"},
		{"connect", "INFOVIZ_TOKEN", "start"},
		{"connect", "INFOVIZ_TOKEN", "cancel", "x"},
		{"connect", "INFOVIZ_TOKEN", "start", "editor@example.org", "extra"},
```

In `bsig/cmd/bsig/control_stdin_test.go`, inside `TestControlStdinIsLimitedToNonSecretCommands`, replace:

```go
		{"keys", "list"}, {"keys", "validate", "FIRECRAWL_API_KEY"},
```

with:

```go
		{"keys", "list"}, {"keys", "validate", "FIRECRAWL_API_KEY"},
		{"keys", "connect", "INFOVIZ_TOKEN", "start", "editor@example.com"},
		{"keys", "connect", "INFOVIZ_TOKEN", "poll", strings.Repeat("0", 64)},
```

and replace:

```go
		{"keys", "set", "FIRECRAWL_API_KEY"}, {"catalog", "sync"}, {"auth", "start", "editor@example.com"},
```

with:

```go
		{"keys", "set", "FIRECRAWL_API_KEY"}, {"catalog", "sync"}, {"auth", "start", "editor@example.com"},
		{"keys", "replace", "INFOVIZ_TOKEN"}, {"keys", "remove", "INFOVIZ_TOKEN"},
```

(`control_stdin_test.go` already imports `strings`.)

- [ ] **Step 2: Run and watch it fail**

```bash
cd /Users/rmdms/Sites/Professional/engine/bsig && go test -count=1 -run 'TestKeysConnect|TestKeysDispatchesConnect|TestEveryEmailFlowRegistryEntryHasAWireClient|TestKeysUsageErrors|TestControlStdinIsLimitedToNonSecretCommands' ./cmd/bsig/; echo "exit=$?"
```

Expected: build failure `undefined: keysConnect` and `undefined: emailFlowClientFor`, `exit=1`.

- [ ] **Step 3: Implement the verb**

Create `bsig/cmd/bsig/keys_connect_verb.go`:

```go
// keys connect: email-flow acquisition for record credentials whose registry
// entry declares it. `start` asks the provider to email the journalist a
// Connect link; `poll` observes the flow once and, when the provider hands the
// token over, writes it through the record broker, which validates it before
// the atomic replacement. The token is registered with the redactor on arrival
// and never reaches stdout, events, or the audit log. The provider's request
// id — itself a poll credential — stays in Engine's flow store; clients hold
// only the opaque handle `start` returns.
package main

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/buriedsignals/engine/internal/auth"
	"github.com/buriedsignals/engine/internal/infoviz"
	"github.com/buriedsignals/engine/internal/keys"
)

const keysConnectUsage = "usage: bsig keys connect <key-id> start <email> | bsig keys connect <key-id> poll <flow-id>"

// emailFlowClient is the seam between the generic verb and one provider's own
// wire package (docs/packages/auth-standard.md forbids a shared auth library).
// Infoviz is the only provider; its Flow and PollResult are the shape a second
// provider maps onto.
type emailFlowClient struct {
	start func(ctx context.Context, email string, now time.Time) (infoviz.Flow, error)
	poll  func(ctx context.Context, requestID string, registerSecret func(string)) (infoviz.PollResult, error)
}

// emailFlowClientFor binds entry to its wire client through the entry's
// BaseURL, so tests reach an httptest server via an injected registry.
func emailFlowClientFor(entry keys.Entry) (emailFlowClient, bool) {
	switch entry.ID {
	case "INFOVIZ_TOKEN":
		client := &http.Client{Timeout: infoviz.RequestTimeout}
		return emailFlowClient{
			start: func(ctx context.Context, email string, now time.Time) (infoviz.Flow, error) {
				return infoviz.Start(ctx, client, entry.BaseURL, email, now)
			},
			poll: func(ctx context.Context, requestID string, registerSecret func(string)) (infoviz.PollResult, error) {
				return infoviz.Poll(ctx, client, entry.BaseURL, requestID, registerSecret)
			},
		}, true
	default:
		return emailFlowClient{}, false
	}
}

func keysConnect(ctx context.Context, d *deps, args []string, now time.Time) error {
	if len(args) != 3 || (args[1] != "start" && args[1] != "poll") {
		return &usageError{Msg: keysConnectUsage}
	}
	id, action, value := args[0], args[1], args[2]
	entry, ok := keys.Lookup(d.keyRegistry, id)
	if !ok {
		return unknownKeyIDError(d, id)
	}
	client, hasClient := emailFlowClientFor(entry)
	if entry.Kind() != keys.StorageRecord || entry.AcquisitionKind() != keys.AcquisitionEmailFlow || !hasClient {
		remedy := "set"
		if entry.Kind() == keys.StorageRecord {
			remedy = "replace"
		}
		return fmt.Errorf("key %s is not connected by email; enter its value with `bsig keys %s %s`", id, remedy, id)
	}
	if action == "start" {
		return keysConnectStart(ctx, d, entry, client, value, now)
	}
	return keysConnectPoll(ctx, d, entry, client, value, now)
}

func keysConnectStart(ctx context.Context, d *deps, entry keys.Entry, client emailFlowClient, email string, now time.Time) error {
	if err := validateAuthEmail(email); err != nil {
		return err
	}
	// Refuse before the provider emails the journalist a link that could not
	// complete: the token must be storable when it arrives.
	if _, err := recordBroker(d).Status(entry); err != nil {
		return fmt.Errorf("connect %s: %w", entry.ID, err)
	}
	flow, err := client.start(ctx, email, now)
	if err != nil {
		return fmt.Errorf("connect %s: %w", entry.ID, err)
	}
	d.redactor.RegisterSecret(flow.RequestID)
	handle, err := keys.NewEmailFlowStore(d.baseDir).Create(keys.EmailFlow{ID: entry.ID, RequestID: flow.RequestID, ExpiresAt: flow.ExpiresAt}, now)
	if err != nil {
		return fmt.Errorf("connect %s: %w", entry.ID, err)
	}
	return d.emitter.Result(fmt.Sprintf("%s: check your email and press Connect", entry.Name), map[string]any{
		"id": entry.ID, "status": "pending", "flowId": handle,
		"expiresInSeconds":    int(flow.ExpiresAt.Sub(now) / time.Second),
		"pollIntervalSeconds": int(flow.PollInterval / time.Second),
	})
}

func keysConnectPoll(ctx context.Context, d *deps, entry keys.Entry, client emailFlowClient, handle string, now time.Time) error {
	if !keys.ValidEmailFlowHandle(handle) {
		return &usageError{Msg: fmt.Sprintf("flow id is not one issued by `bsig keys connect %s start`", entry.ID)}
	}
	store := keys.NewEmailFlowStore(d.baseDir)
	flow, found, err := store.Load(handle)
	if err != nil {
		return fmt.Errorf("connect %s: %w", entry.ID, err)
	}
	if found && flow.ID != entry.ID {
		return &usageError{Msg: fmt.Sprintf("flow was started for another credential, not %s", entry.ID)}
	}
	// A flow that ended is dead whatever happens to its file, so Forget
	// failures below are not reported: the file dies at its deadline anyway.
	if !found || !now.Before(flow.ExpiresAt) {
		_ = store.Forget(handle)
		return connectExpired(d, entry)
	}
	d.redactor.RegisterSecret(flow.RequestID)
	result, err := client.poll(ctx, flow.RequestID, d.redactor.RegisterSecret)
	if err != nil {
		return fmt.Errorf("connect %s: %w", entry.ID, err)
	}
	switch result.Status {
	case infoviz.PollPending:
		return d.emitter.Result(fmt.Sprintf("%s: waiting for Connect in the email", entry.Name), map[string]any{
			"id": entry.ID, "status": "pending",
		})
	case infoviz.PollExpired:
		_ = store.Forget(handle)
		return connectExpired(d, entry)
	}
	// The provider delivers the token exactly once: the flow is over whether
	// or not the replacement below succeeds.
	_ = store.Forget(handle)
	broker := recordBroker(d)
	current, err := broker.Status(entry)
	if err != nil {
		return fmt.Errorf("connect %s: %w", entry.ID, err)
	}
	status, err := broker.Replace(ctx, entry, result.Token, keys.ValidationContext{}, current.Generation)
	if err != nil {
		return fmt.Errorf("connect %s: %w", entry.ID, err)
	}
	projected, err := projectGooseSecrets(d, entry.ID, result.Token, false)
	if err != nil {
		return err
	}
	hint := auth.EmailHint(result.Email)
	data := recordStatusData(status, "connected")
	data["emailHint"] = hint
	data["goose_projection"] = projected
	return d.emitter.Result(fmt.Sprintf("%s connected as %s (generation %d)", entry.Name, hint, status.Generation), data)
}

func connectExpired(d *deps, entry keys.Entry) error {
	return d.emitter.Result(fmt.Sprintf("%s: the link expired; connect again", entry.Name), map[string]any{
		"id": entry.ID, "status": "expired",
	})
}
```

- [ ] **Step 4: Wire dispatch, usage and the control stream**

In `bsig/cmd/bsig/keys_verb.go`, replace:

```go
	keysUsage           = "usage: bsig keys <set|validate|status|replace|remove> <key-id> | bsig keys list"
```

with:

```go
	keysUsage           = "usage: bsig keys <set|validate|status|replace|remove> <key-id> | bsig keys connect <key-id> <start <email>|poll <flow-id>> | bsig keys list"
```

In the import block of `bsig/cmd/bsig/keys_verb.go`, replace:

```go
	"path/filepath"
	"strings"
```

with:

```go
	"path/filepath"
	"strings"
	"time"
```

In `handleKeys`, replace:

```go
	case "list":
		if len(rest) != 0 {
```

with:

```go
	case "connect":
		return keysConnect(ctx, d, rest, time.Now())
	case "list":
		if len(rest) != 0 {
```

In `bsig/cmd/bsig/main.go`, inside `controlStdinAllowed`, replace:

```go
		return len(args) >= 2 && (args[1] == "list" || args[1] == "validate")
```

with:

```go
		return len(args) >= 2 && (args[1] == "list" || args[1] == "validate" || args[1] == "connect")
```

- [ ] **Step 5: Run and watch it pass**

```bash
cd /Users/rmdms/Sites/Professional/engine/bsig && gofmt -l cmd/bsig && go vet ./cmd/bsig/ && go test -race -count=1 -run 'TestKeys|TestEveryEmailFlowRegistryEntryHasAWireClient|TestControlStdin' ./cmd/bsig/; echo "exit=$?"
```

Expected: nothing from `gofmt -l`; `ok  github.com/buriedsignals/engine/cmd/bsig`, `exit=0`.

- [ ] **Step 6: Mutation checks**

Each mutation below still compiles (Go refuses unused variables, so none of them drops a variable's last use).

1. In `keysConnectStart`, replace `"flowId": handle,` with `"flowId": flow.RequestID + handle[:0],`. Run Step 5. Expected: `TestKeysConnectStartReturnsAnOpaqueFlowAndSendsNoSecretOut` and `TestKeysDispatchesConnect` FAIL. Revert.
2. In `keysConnectPoll`, replace `keys.ValidationContext{}, current.Generation)` with `keys.ValidationContext{}, current.Generation*0)`. Run Step 5. Expected: `TestKeysConnectReplacesAnExistingRecordAtItsCurrentGeneration` FAILS (generation conflict). Revert.
3. In `keysConnectPoll`, replace `if !found || !now.Before(flow.ExpiresAt) {` with `if !found {`. Run Step 5. Expected: `TestKeysConnectPollReportsExpiredOnGoneAndPastTheDeadlineWithoutAsking` FAILS (a flow at its deadline reaches Infoviz). Revert.
4. In `emailFlowClientFor`, replace `case "INFOVIZ_TOKEN":` with `case "INFOVIZ_TOKEN", "DATAWRAPPER_TOKEN":`. Run Step 5. Expected: `TestEveryEmailFlowRegistryEntryHasAWireClient` FAILS (a paste credential gained a wire client). Revert.

Re-run Step 5; expect `exit=0`.

- [ ] **Step 7: Smoke the built binary without network or keychain**

```bash
cd /Users/rmdms/Sites/Professional/engine/bsig && go build -o "${TMPDIR:-/tmp}/bsig-infoviz" ./cmd/bsig && echo built
SMOKE_HOME="$(mktemp -d)"; XDG_CONFIG_HOME="$SMOKE_HOME" "${TMPDIR:-/tmp}/bsig-infoviz" --json --allow-file-secrets keys list | grep -o '"id":"INFOVIZ_TOKEN"[^}]*"acquisition":"email-flow"' | head -1
XDG_CONFIG_HOME="$SMOKE_HOME" "${TMPDIR:-/tmp}/bsig-infoviz" --json --allow-file-secrets keys connect INFOVIZ_TOKEN poll 0000000000000000000000000000000000000000000000000000000000000000; echo "exit=$?"
XDG_CONFIG_HOME="$SMOKE_HOME" "${TMPDIR:-/tmp}/bsig-infoviz" --json --allow-file-secrets keys connect DATAWRAPPER_TOKEN start editor@example.org; echo "exit=$?"
XDG_CONFIG_HOME="$SMOKE_HOME" "${TMPDIR:-/tmp}/bsig-infoviz" --json keys connect INFOVIZ_TOKEN; echo "exit=$?"
rm -rf "$SMOKE_HOME" "${TMPDIR:-/tmp}/bsig-infoviz"
```

Expected, in order: `built`; one match containing `"acquisition":"email-flow"`; a `result` line with `"status":"expired"` and `exit=0`; an `error` line containing `not connected by email` and `exit=1`; an `error` line with `keys connect` usage and `exit=4`. Do NOT run `keys connect INFOVIZ_TOKEN start` here: it sends a real email.

- [ ] **Step 8: Commit**

```bash
git -C /Users/rmdms/Sites/Professional/engine add bsig/cmd/bsig/keys_connect_verb.go bsig/cmd/bsig/keys_connect_verb_test.go bsig/cmd/bsig/keys_verb.go bsig/cmd/bsig/keys_verb_test.go bsig/cmd/bsig/main.go bsig/cmd/bsig/control_stdin_test.go
git -C /Users/rmdms/Sites/Professional/engine commit -m "keys: connect email-flow credentials by start and poll, storing the token through the validating broker" -- bsig/cmd/bsig/keys_connect_verb.go bsig/cmd/bsig/keys_connect_verb_test.go bsig/cmd/bsig/keys_verb.go bsig/cmd/bsig/keys_verb_test.go bsig/cmd/bsig/main.go bsig/cmd/bsig/control_stdin_test.go
```

---

## Task 6: Splash operation `inspiration-search`

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

## Task 7: Catalog pin — GATED (Splash commit with Part 2b-1, Tom's signature)

**Files:**
- Modify (by the signer, not by this plan's executor): `bsig/catalog/catalog.json` (`products.splash.ref` and `products.splash.install_contract.source_commit`), `bsig/catalog/catalog.json.minisig`.

**Interfaces:**
- Consumes: a commit on `buriedsignals/splash` `main` that contains Part 2b-1 (`skills/splash/scripts/run-operation.mjs` knows `inspiration-search`; `skills/inspiration/scripts/sealed-search.mjs` exists).
- Produces: the two-line pin change and its verified SHA, handed to Tom with the branch.

Why the executor does not commit the pin: `catalog.json.minisig` must be re-signed with the production key on Tom's Mac (`bsig/AGENTS.md`: `tools/sign-artifact/macos_prompt.swift`, key under `~/.config/buriedsignals/release-keys/minisign/`, "never put the Minisign password in chat or a command argument"). On this machine the sibling `mycroft` checkout exists, so `TestSkillsVendor_MatchesVendoredManifests` syncs the real catalog with signature verification: an unsigned edit turns the gate red.

- [ ] **Step 1: Fill the gate value**

Ask Rémy for the Splash commit. Record it here before continuing:

`SPLASH_2B1_SHA = ________________________________________ (40 hex, on buriedsignals/splash main)`

If no such commit exists yet, STOP this task; Task 8 still runs.

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
bsig/catalog/catalog.json  products.splash.ref                          0c1f316ae059581990b0d451ef1315f34b0c5586 -> <SPLASH_2B1_SHA>
bsig/catalog/catalog.json  products.splash.install_contract.source_commit 0c1f316ae059581990b0d451ef1315f34b0c5586 -> <SPLASH_2B1_SHA>
(install_contract.digest unchanged)
Then: re-sign catalog.json (macos_prompt), `go run ./tools/publish-catalog -dest ../../mycroft/catalog`.
Commit message: "Catalog: pin Splash to <first 8 hex> (inspiration-search operation)"
```

(Values measured on `origin/main` 52fed4f; if Task 0 found a newer head, re-read the current `ref` with `git -C /Users/rmdms/Sites/Professional/engine show HEAD:bsig/catalog/catalog.json | grep -n '"ref"\|"source_commit"'` and write those values instead.)

No commit.

---

## Task 8: Final gate — STOP before any push or PR

**Files:** none modified.

- [ ] **Step 1: Full gate**

```bash
cd /Users/rmdms/Sites/Professional/engine/bsig && gofmt -l . ; echo "gofmt done"
cd /Users/rmdms/Sites/Professional/engine/bsig && go vet ./... ; echo "vet exit=$?"
cd /Users/rmdms/Sites/Professional/engine/bsig && go test -race -count=1 ./... > "${TMPDIR:-/tmp}/engine-infoviz-final.txt" 2>&1; echo "test exit=$?"
grep -E '^(--- FAIL|FAIL|panic:)' "${TMPDIR:-/tmp}/engine-infoviz-final.txt"
diff <(grep -E '^(--- FAIL|FAIL)' "${TMPDIR:-/tmp}/engine-infoviz-baseline.txt" | sed -E 's/ \([0-9.]+s\)//' | sort) <(grep -E '^(--- FAIL|FAIL)' "${TMPDIR:-/tmp}/engine-infoviz-final.txt" | sed -E 's/ \([0-9.]+s\)//' | sort); echo "diff exit=$?"
```

Expected: `gofmt -l` prints no path before `gofmt done`; `vet exit=0`; the failure list equals Task 0's (`diff exit=0`). If `test exit=0` at baseline, it must be `0` now. A new failure: fix it (at most two attempts), then STOP and report the exact failing test and output.

- [ ] **Step 2: Branch state**

```bash
git -C /Users/rmdms/Sites/Professional/engine status --porcelain; echo "status exit=$?"
git -C /Users/rmdms/Sites/Professional/engine log --oneline origin/main..HEAD
git -C /Users/rmdms/Sites/Professional/engine log --format='%B' origin/main..HEAD | grep -ci 'claude\|anthropic\|co-authored-by'
```

Expected: no status lines; exactly six commits (Tasks 1–6; Task 7 commits nothing); the grep count is `0`.

- [ ] **Step 3: STOP**

Report to Rémy: the branch name, the six commit subjects, the gate result against the baseline, the Task 7 hand-off text (or "Splash 2b-1 commit not available yet"), and the manual check still owed by the desktop plan's release runbook ("Infoviz Connect": a real email, a real Connect, then `bsig --json keys status INFOVIZ_TOKEN` stored/verified) — which needs Part 1 deployed.

Do not push. Do not open a PR. Do not run `jj git push`, `gh pr create`, or any GitHub write. Pushing to `buriedsignals/engine` waits for Rémy's explicit go; review is Tom's; the signed Indicator Labs release is triggered by Tom.

---

## Contract for the desktop plan

All commands run as `bsig --json [--control-stdin=v1] …`; each prints NDJSON events (`{"event":"progress"|"result"|"error","message":…,"data":{…}}`); the last line decides. No command reads stdin, so `--control-stdin=v1` is accepted and optional.

**Acquisition metadata** — `bsig --json keys list` → `data.keys[i].metadata.acquisition` is `"paste"` or `"email-flow"` on every row (always present on an Engine with this change; absent on an older Engine → treat as paste and do not render Connect). `INFOVIZ_TOKEN` row: `storageKind: "record"`, `validatable: true`, `metadata.name: "Infoviz account"`, `metadata.purpose: "Raises Splash inspiration searches from 5 to 10 a day."`, `metadata.acquisitionUrl: "https://splash.buriedsignals.com/inspiration.html"`, `metadata.validatorPolicy: "authenticated-account-request"`, `metadata.replacementBehavior: "validate-before-atomic-replacement"`.

**Start** — `bsig --json keys connect INFOVIZ_TOKEN start <email>` → exit 0, last event:

```json
{"event":"result","message":"Infoviz account: check your email and press Connect","data":{"id":"INFOVIZ_TOKEN","status":"pending","flowId":"<64 lowercase hex>","expiresInSeconds":900,"pollIntervalSeconds":3}}
```

`flowId` matches `^[0-9a-f]{64}$`; `expiresInSeconds` is an integer in 1–1800; `pollIntervalSeconds` an integer in 1–60. The main process keeps `flowId` and gives the renderer only its own opaque token.

**Poll** — `bsig --json keys connect INFOVIZ_TOKEN poll <flowId>` → exit 0, last event `data` is one of:

```json
{"id":"INFOVIZ_TOKEN","status":"pending"}
{"id":"INFOVIZ_TOKEN","status":"expired"}
{"id":"INFOVIZ_TOKEN","status":"connected","emailHint":"e***@example.org","contractVersion":1,"broker":{"status":"available"},"credentialIndependentPathsAvailable":true,"metadata":{"id":"INFOVIZ_TOKEN","acquisition":"email-flow","storageKind":"record","…":"…"},"stored":true,"generation":2,"validation":{"status":"verified","validatedAt":"2026-09-14T10:00:06Z","dimensions":[{"id":"authenticated-account-access","status":"verified"}]},"goose_projection":[]}
```

`pending`: keep polling every `pollIntervalSeconds` (Infoviz 429/5xx/network failures also read as pending). `expired`: stop; copy "The link expired. Connect again." (also returned for an unknown flow, a flow past its Engine deadline, and a second poll after `connected`). `connected`: stop; copy "Connected as {emailHint}"; `emailHint` may be `""` if Infoviz sent no email. Cancelling = stop polling; there is no cancel command.

**Errors the desktop must handle** (last event `"event":"error"`):
- exit 4 (usage): wrong arity or subcommand; `flowId` not 64-hex; a flow started for another credential.
- exit 1, start: `key <ID> is not connected by email; …` (paste credential); `"<email>" does not look like an email address`; broker unavailable — `data` = `{"contractVersion":1,"broker":{"status":"unavailable","reasonCode":"secure-store-unavailable"|"topology-unsupported","message":…},"credentialIndependentPathsAvailable":true}` (no email was sent); Infoviz refusals in `message`: `HTTP 429` (send limit, with Infoviz's sentence), `HTTP 422` (email refused), `HTTP 500`, `could not reach Infoviz to start the connection`.
- exit 1, poll — the flow is over, connect again: `data.status:"rejected"` with `data.outcome` `invalid` | `provider-unavailable` | `rate-limited` | `insufficient-evidence`, `"written":false`, `"previousRecord":"unchanged"` (the delivered token failed `/auth/status` validation and was not kept); `data.status:"conflict"` (generation changed during the write); `data.status:"lock-timeout"` / `"lock-failed"`; broker-unavailable `data` as above; message `Infoviz reported the connection ready but delivered no token; connect again`.
- exit 1, poll — the flow is kept, polling may continue until `expiresInSeconds`: message `Infoviz answered the connection poll unexpectedly (HTTP <code>)`.
- An Engine without this change answers `keys connect` with exit 4 `unknown keys subcommand "connect"`.

**Afterwards** — "Check saved token" stays `bsig --json keys status INFOVIZ_TOKEN` (validation receipt dimension `authenticated-account-access`). `keys replace INFOVIZ_TOKEN` still works on stdin (tests, recovery) but is not a desktop path. Splash reaches the token only through `bsig run splash inspiration-search` with stdin `{"parameters":{"query":"…"}}`.
