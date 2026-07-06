#!/usr/bin/env bash
# Strip the session-URL commit trailers (lines matching `^<name>-Session:`) from ALL
# commit messages before the public MIT release. Publication rule: no AI-assistant or
# vendor attribution in any published artifact.
#
# DESTRUCTIVE: rewrites every commit hash. Run ONCE on the pre-release branch. If a
# remote already has the old history, you must force-push after this.
#
# Usage: scripts/scrub-trailers.sh --yes
set -euo pipefail

PATTERN='^[A-Za-z]+-Session:'

if [ "${1:-}" != "--yes" ]; then
  echo "Refusing to rewrite history without --yes (this rewrites every commit hash)."
  echo "  before:  git log --format=%B | grep -cE '$PATTERN'"
  echo "  run:     scripts/scrub-trailers.sh --yes"
  exit 1
fi

# Safety net: keep the pre-scrub state reachable.
git branch -f backup-pre-scrub

if command -v git-filter-repo >/dev/null 2>&1; then
  git filter-repo --force --message-callback '
    import re
    keep = [l for l in message.split(b"\n") if not re.match(rb"[A-Za-z]+-Session:", l)]
    return b"\n".join(keep)
  '
else
  echo "git-filter-repo not installed; falling back to git filter-branch (slower)."
  FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f \
    --msg-filter "grep -vE '$PATTERN' || true" -- --all
fi

echo "Done. Verify (should print 0):  git log --format=%B | grep -cE '$PATTERN'"
echo "Backup branch: backup-pre-scrub (delete once verified)."
