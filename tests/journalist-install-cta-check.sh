#!/usr/bin/env bash
# Journalist install is Indicator Labs / join. Pages must not CTA curl|bash.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
note() { echo "FAIL: $*" >&2; exit 1; }

page="landing/index.html"
[ -f "$page" ] || note "missing $page"
if [ -e landing/install.sh ]; then
  note "landing/install.sh must be deleted; Pages must not ship a curl|bash installer"
fi
grep -q 'https://github.com/buriedsignals/splash' "$page" || note "$page lost the GitHub link"
grep -q 'https://buriedsignals.com/join' "$page" || note "$page Install CTA is not https://buriedsignals.com/join"
if grep -qE 'curl .*landing/install\.sh|curl .*github\.io/splash/install\.sh|curl .*install\.sh' "$page"; then
  note "$page still publishes a curl|bash installer CTA"
fi
if grep -qF 'id="install-cmd"' "$page"; then
  note "$page still exposes a copy-paste installer command"
fi
if grep -qE 'configure\.html|setup\.html' "$page"; then
  note "$page still links a localhost configure or setup page"
fi
echo "journalist install CTA checks passed"
