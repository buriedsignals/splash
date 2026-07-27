// verify.ts — the live provider checks, and the one function that maps them onto a CAPABILITY.
//
// They lived in install/configurator-core.ts, whose only caller was the legacy configurator. The
// decor is their real home: `readiness` consumes `lastVerified`, and nothing in P1 ever wrote it —
// so "ready" meant "a key is PRESENT", never "the provider accepts it". The setup page is the
// first caller that closes that gap, and it reaches for the check by capability id, not by
// provider name: the page is built from the capability registry, so the verification has to be
// too, or adding a capability would mean editing a switch somewhere.
//
// TRI-STATE, deliberately, and unchanged since the configurator:
//   true  — the credential works
//   false — the provider ACTIVELY rejected it (401/403), or it is blank
//   null  — the provider could not be REACHED (offline, filtering proxy, corporate TLS
//           interception). This must NEVER be shown as invalid: a valid key behind a proxy
//           would be, and the newsroom would be blocked for life.
import { fetchBounded } from "../core/publishers";
import { NEWSROOM_CAPABILITIES } from "./capabilities";

/** The decor's own vocabulary for a check's verdict — what `lastVerified.result` records. */
export type VerifyOutcome = "ok" | "rejected" | "unreachable";

// Bounded time (docs/superpowers/specs/2026-07-26-bounded-time-design.md): these four `fetch`
// calls were the residual the delivery-substrate pass left open — same class (a provider that
// accepts the connection and never answers), different call site. They reuse `fetchBounded`
// rather than DEFAULT_NETWORK_TIMEOUT_MS: that default is sized for a background publish nobody
// is watching. This is the ONE call site in the codebase a human sits in front of — the setup
// page's "Check my keys" button — and a shorter bound serves that human better: a credential
// check round-trips in low hundreds of ms in practice, so 8s is already generous slack for a slow
// or congested connection, while capping how long a non-technical journalist stares at a spinner
// before the honest "couldn't reach it" reads on screen instead of the full 20s control budget.
const VERIFY_TIMEOUT_MS = 8_000;

export async function verifyMapTiler(
  key: string,
  timeoutMs: number = VERIFY_TIMEOUT_MS,
  base: string = "https://api.maptiler.com",
): Promise<boolean | null> {
  if (!key.trim()) return false;
  try {
    const r = await fetchBounded(
      `${base}/maps/streets-v2/style.json?key=${encodeURIComponent(key.trim())}`,
      {},
      timeoutMs,
    );
    return r.ok;
  } catch {
    return null;
  }
}

export async function verifyDatawrapper(
  token: string,
  timeoutMs: number = VERIFY_TIMEOUT_MS,
  base: string = "https://api.datawrapper.de",
): Promise<boolean | null> {
  if (!token.trim()) return false;
  try {
    const r = await fetchBounded(
      `${base}/v3/me`,
      { headers: { Authorization: `Bearer ${token.trim()}` } },
      timeoutMs,
    );
    return r.ok;
  } catch {
    return null;
  }
}

// Listing Pages projects proves BOTH that the token authenticates AND that it carries the
// "Cloudflare Pages: Edit" permission on this account. Measured trap this exists to catch: a
// token with no Pages permission verifies happily against the generic token endpoint while
// failing every Pages call with error 10000 — so verifying the token alone would green-light
// a configuration that cannot deploy a single embed.
export async function verifyCloudflare(
  token: string,
  accountId: string,
  timeoutMs: number = VERIFY_TIMEOUT_MS,
  base: string = "https://api.cloudflare.com",
): Promise<boolean | null> {
  if (!token.trim() || !accountId.trim()) return false;
  try {
    const r = await fetchBounded(
      `${base}/client/v4/accounts/${encodeURIComponent(accountId.trim())}/pages/projects`,
      { headers: { Authorization: `Bearer ${token.trim()}` } },
      timeoutMs,
    );
    if (!r.ok) return false;
    const body = (await r.json()) as { success?: boolean };
    return body.success === true;
  } catch {
    return null;
  }
}

export async function verifyAnthropic(
  key: string,
  timeoutMs: number = VERIFY_TIMEOUT_MS,
  base: string = "https://api.anthropic.com",
): Promise<boolean | null> {
  if (!key.trim()) return false;
  try {
    const r = await fetchBounded(
      `${base}/v1/models`,
      {
        headers: { "x-api-key": key.trim(), "anthropic-version": "2023-06-01" },
      },
      timeoutMs,
    );
    return r.ok;
  } catch {
    return null;
  }
}

type CredentialValues = Record<string, string | undefined>;
// `timeoutMs`/`base` are the same test-only override pair each verify* function takes — threaded
// through so verifyCapability can be proven against a real hung server too, not just the
// functions it delegates to. Undefined in every production call site: each verifier falls back to
// its own default budget and its own provider host.
type CapabilityVerifier = (
  values: CredentialValues,
  timeoutMs?: number,
  base?: string,
) => Promise<boolean | null>;

function first(values: CredentialValues, ...names: string[]): string {
  for (const n of names) {
    const v = values[n];
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
}

// Only capabilities whose readiness a NETWORK call can settle appear here. The others —
// chart-native, image-native, scrolly's own build, zip — are answered by the machine (deps, disk),
// which `readiness` already checks; asking a provider about them would be inventing a question.
// embed-s3 is absent on purpose: a HEAD against an arbitrary S3-compatible endpoint is not a
// credential check, and guessing one would produce a verdict its adapter does not share.
const VERIFIERS: Record<string, CapabilityVerifier> = {
  "dw-chart": (v, timeoutMs, base) =>
    verifyDatawrapper(first(v, "DATAWRAPPER_API_TOKEN"), timeoutMs, base),
  "map-dw": (v, timeoutMs, base) =>
    verifyDatawrapper(first(v, "DATAWRAPPER_API_TOKEN"), timeoutMs, base),
  // Either mirror name answers: the two hold the same MapTiler key (Vite reads one, Remotion the
  // other), which is exactly how the capability declares its env group.
  "map-native": (v, timeoutMs, base) =>
    verifyMapTiler(
      first(v, "VITE_MAPTILER_KEY", "REMOTION_MAPTILER_KEY"),
      timeoutMs,
      base,
    ),
  scrolly: (v, timeoutMs, base) =>
    verifyMapTiler(
      first(v, "VITE_MAPTILER_KEY", "REMOTION_MAPTILER_KEY"),
      timeoutMs,
      base,
    ),
  "embed-cloudflare": (v, timeoutMs, base) =>
    verifyCloudflare(
      first(v, "CLOUDFLARE_API_TOKEN"),
      first(v, "CLOUDFLARE_ACCOUNT_ID"),
      timeoutMs,
      base,
    ),
};

/** Is there a live check for this capability at all? False is not a failure — it is silence. */
export function capabilityVerifiable(id: string): boolean {
  return Boolean(NEWSROOM_CAPABILITIES[id]?.implemented && VERIFIERS[id]);
}

/**
 * Check one capability's credentials against its provider.
 *
 * `undefined` means there is nothing to ask — a capability with no remote credential, or one that
 * is only declared. The caller must record nothing in that case: an absent `lastVerified` reads as
 * "never checked", which is the truth, whereas any of the three outcomes would be a fabricated
 * verdict.
 */
export async function verifyCapability(
  id: string,
  values: CredentialValues,
  timeoutMs?: number,
  base?: string,
): Promise<VerifyOutcome | undefined> {
  if (!capabilityVerifiable(id)) return undefined;
  const result = await VERIFIERS[id]!(values, timeoutMs, base);
  if (result === null) return "unreachable";
  return result ? "ok" : "rejected";
}
