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
import { NEWSROOM_CAPABILITIES } from "./capabilities";

/** The decor's own vocabulary for a check's verdict — what `lastVerified.result` records. */
export type VerifyOutcome = "ok" | "rejected" | "unreachable";

export async function verifyMapTiler(key: string): Promise<boolean | null> {
  if (!key.trim()) return false;
  try {
    const r = await fetch(
      `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(key.trim())}`,
    );
    return r.ok;
  } catch {
    return null;
  }
}

export async function verifyDatawrapper(
  token: string,
): Promise<boolean | null> {
  if (!token.trim()) return false;
  try {
    const r = await fetch("https://api.datawrapper.de/v3/me", {
      headers: { Authorization: `Bearer ${token.trim()}` },
    });
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
): Promise<boolean | null> {
  if (!token.trim() || !accountId.trim()) return false;
  try {
    const r = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId.trim())}/pages/projects`,
      { headers: { Authorization: `Bearer ${token.trim()}` } },
    );
    if (!r.ok) return false;
    const body = (await r.json()) as { success?: boolean };
    return body.success === true;
  } catch {
    return null;
  }
}

export async function verifyAnthropic(key: string): Promise<boolean | null> {
  if (!key.trim()) return false;
  try {
    const r = await fetch("https://api.anthropic.com/v1/models", {
      headers: { "x-api-key": key.trim(), "anthropic-version": "2023-06-01" },
    });
    return r.ok;
  } catch {
    return null;
  }
}

type CredentialValues = Record<string, string | undefined>;
type CapabilityVerifier = (values: CredentialValues) => Promise<boolean | null>;

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
  "dw-chart": (v) => verifyDatawrapper(first(v, "DATAWRAPPER_API_TOKEN")),
  "map-dw": (v) => verifyDatawrapper(first(v, "DATAWRAPPER_API_TOKEN")),
  // Either mirror name answers: the two hold the same MapTiler key (Vite reads one, Remotion the
  // other), which is exactly how the capability declares its env group.
  "map-native": (v) =>
    verifyMapTiler(first(v, "VITE_MAPTILER_KEY", "REMOTION_MAPTILER_KEY")),
  scrolly: (v) =>
    verifyMapTiler(first(v, "VITE_MAPTILER_KEY", "REMOTION_MAPTILER_KEY")),
  "embed-cloudflare": (v) =>
    verifyCloudflare(
      first(v, "CLOUDFLARE_API_TOKEN"),
      first(v, "CLOUDFLARE_ACCOUNT_ID"),
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
): Promise<VerifyOutcome | undefined> {
  if (!capabilityVerifiable(id)) return undefined;
  const result = await VERIFIERS[id]!(values);
  if (result === null) return "unreachable";
  return result ? "ok" : "rejected";
}
