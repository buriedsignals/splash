import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// harness/flue/src/lib -> repo root is four up. Resolved from the source file
// (absolute) so it holds regardless of `flue run` cwd, in dev and installed.
const SELF_DIR = dirname(fileURLToPath(import.meta.url));
export const HARNESS_ROOT = resolve(SELF_DIR, "../../../..");
const SKILLS_DIR = resolve(HARNESS_ROOT, "skills");

/** Load a skill/role body (frontmatter stripped) as agent instructions. */
export function roleBody(name: string): string {
  const raw = readFileSync(resolve(SKILLS_DIR, name, "SKILL.md"), "utf8");
  return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
}

// Maps the skills' abstract verbs to Flue's native tools so the SAME skills run
// here without rewriting. NO spawn-agent: slice 1 is single-orchestrator, and an
// undisciplined 8B that self-delegates would recurse task->task and hard-fail.
export const FLUE_VERB_ADAPTER = `## Runtime adapter (Flue) — abstract verbs → your tools

Your **harness root** is \`${HARNESS_ROOT}\` — the \`skills/\` engines, \`exports/\`, and
case files all live there. One hard rule (breaking it silently fails the run):
- **Use ABSOLUTE paths for every artifact.** Wherever a skill references a script or
  output dir, substitute the absolute path under \`${HARNESS_ROOT}\`. Never use a bare
  relative path — your cwd may differ from the repo root and relative paths break.

Execute the skills' verbs as:
- **execute-shell(cmd)** → your \`bash\` tool. Run the native producer as
  \`cd ${HARNESS_ROOT} && bun skills/chart-native/scripts/produce.mjs <type> <config> <outDir> <format>\`.
- **read-file / write-file / edit-file / list-files / grep-files** → your \`read\` / \`write\` / \`edit\` / \`glob\` / \`grep\` tools.
- **invoke-skill(id)** → the skill of that name is already discoverable from \`skills/\`; follow its instructions (body loads on invoke).

You are a SINGLE orchestrator. You have **no subagents** — never spawn or delegate to another agent.
You own the human gates (cadrage, format veto, a/b/c export choice): pause for the journalist at each.`;
