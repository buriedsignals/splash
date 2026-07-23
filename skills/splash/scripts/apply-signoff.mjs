import { readFileSync, writeFileSync } from "node:fs";
import { applyEditorialSignoff } from "../src/editorial-signoff.ts";
import { parseNewsroomMarkdown } from "../src/brand-profile.ts";

/** Verify + record an editor's signature into a report (pure). Throws on any verification failure. */
export function recordSignoff(
  report,
  id,
  signerId,
  signature,
  profileMarkdown,
) {
  const profile = parseNewsroomMarkdown(profileMarkdown);
  const signers = profile?.signers ?? [];
  return applyEditorialSignoff(report, id, { signerId, signature }, signers);
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function main() {
  const argv = process.argv.slice(2);
  const [reportPath, id] = argv;
  const flag = (name) => {
    const i = argv.indexOf(name);
    return i !== -1 ? argv[i + 1] : undefined;
  };
  const signerId = flag("--signer");
  const signature = flag("--signature");
  const profilePath = flag("--profile");
  if (!reportPath || !id || !signerId || !signature || !profilePath)
    fail(
      "usage: apply-signoff.mjs <report.json> <proposalId> --signer <id> --signature <base64> --profile <NEWSROOM-PROFILE.md>",
    );
  let report, profileMarkdown;
  try {
    report = JSON.parse(readFileSync(reportPath, "utf8"));
  } catch {
    return fail(`cannot read report ${reportPath}`);
  }
  try {
    profileMarkdown = readFileSync(profilePath, "utf8");
  } catch {
    return fail(`cannot read profile ${profilePath}`);
  }
  let next;
  try {
    next = recordSignoff(report, id, signerId, signature, profileMarkdown);
  } catch (e) {
    return fail(e.message);
  }
  writeFileSync(reportPath, JSON.stringify(next, null, 2));
  console.log(`recorded editorial sign-off from ${signerId} for ${id}`);
}

if (import.meta.main) main();
