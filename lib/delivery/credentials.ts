// Projecting an environment down to the variables a destination actually declares.
//
// I5 says the contract never reads ambient state: the caller resolves credentials and hands
// them over. "Hands them over" was doing a lot of work — handing an adapter the WHOLE
// environment satisfies the letter (nothing ambient is read inside the adapter) while giving
// it every other secret on the machine, which is the opposite of the point. lib/loop/deliver.ts
// has always projected (`for (const group of cap.env)`); the opt-in live proof
// skills/splash/scripts/verify-embed-delivery.mjs did not, and passed `decorEnv()` — the
// process environment PLUS the install's .env (registry A8).
//
// One definition, so the proof and the production path cannot mean different things by
// "credentials". PURE: it is handed an environment, it never reaches for one.
//
// `envGroups` is a capability's `env` from lib/newsroom/capabilities.ts — a list of groups,
// each group being the accepted aliases for one credential (SPLASH_S3_ACCESS_KEY_ID or
// AWS_ACCESS_KEY_ID). Taking the groups rather than the capability keeps this module inside
// the lib/core-only import boundary lib/delivery holds.
export function declaredCredentials(
  envGroups: readonly (readonly string[])[],
  env: Record<string, string | undefined>,
): Record<string, string> {
  const credentials: Record<string, string> = {};
  for (const group of envGroups)
    for (const name of group) {
      const value = env[name];
      // Absent stays absent — an adapter's refusal names the variable that is missing, and a
      // key present with "" would answer a different question. A declared-but-empty value IS
      // copied: the newsroom set it, and judging it belongs to the adapter.
      if (value !== undefined) credentials[name] = value;
    }
  return credentials;
}
