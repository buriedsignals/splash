// The REAL link_agents_skills, extracted from the shipped bootstrap.sh — never re-typed.
//
// Every runtime that reads a skills directory (Codex, Gemini, Goose, Goose Desktop, Claude
// Desktop) goes through this one helper, and its behavioural tests are the only automated
// coverage those doors have. A test that hand-rolls its own copy tests the copy: three of them
// did, and all three still asserted the pre-packaging rule — globbing "$DEST"/skills/*/ and
// expecting a link into the engine checkout. They stayed green while the shipped helper moved to
// .dist/skills, and they would stay green if it moved back, which is the single failure the
// packaging step exists to prevent.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const bootstrapSh = readFileSync(
  join(import.meta.dir, "../../install/bootstrap.sh"),
  "utf8",
);

/** The helper's source text, ready to paste into a bash harness. */
export function realLinkAgentsSkills(): string {
  const m = bootstrapSh.match(/^link_agents_skills\(\)\s*\{[\s\S]*?^\}/m);
  if (!m)
    throw new Error("link_agents_skills helper not found in bootstrap.sh");
  return m[0];
}

/** A complete bash snippet that runs the real helper against a throwaway HOME and DEST. */
export function linkHelperScript(
  home: string,
  dest: string,
  target?: string,
): string {
  return `
  set -euo pipefail
  HOME="${home}"; DEST="${dest}"
  ${realLinkAgentsSkills()}
  link_agents_skills ${target ? `"${target}"` : ""}
`;
}
