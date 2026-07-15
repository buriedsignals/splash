#!/usr/bin/env bash
set -euo pipefail
# Expose Splash's skills to Flue's workspace store. Discovered by name+description;
# bodies load on invoke (Flue D1/D2). Symlink keeps a single source of truth.
#
# Layout note: Flue's workspace-skill discovery (@flue/runtime, discoverLocalSkills in
# context.ts) scans exactly ONE level under `<cwd>/.agents/skills/` for `<name>/SKILL.md` —
# flat, not nested under an extra namespace directory. Each Splash skill's frontmatter
# `name` already matches its directory name, so linking flat is what Flue actually reads.
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
STORE="$ROOT/harness/flue/.agents/skills"
mkdir -p "$STORE"
# image-native has no SKILL.md — it's an internal conformance library (shared by
# chart-native/scrolly's image-story format), not a skill-autonome package. Not linked.
for skill in chart-native dw-chart map-dw map-native scrolly splash suggest-article suggest-chart; do
  ln -sfn "$ROOT/skills/$skill" "$STORE/$skill"
done
echo "linked $(ls "$STORE" | wc -l | tr -d ' ') skills into $STORE"
