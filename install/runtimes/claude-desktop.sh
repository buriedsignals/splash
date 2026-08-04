# Claude Desktop runtime module (macOS). Sourced by bootstrap.sh — see ./README.md.
#
# The newsroom-facing sibling of claude.sh. The CLI module launches `claude --plugin-dir .`, which
# carries the skill directory in its own command line; the app has no such flag and is opened plain.
# What makes the skills visible instead was MEASURED in the shipped bundle (1.12603.1) — see
# docs/installer/claude-desktop-findings.md:
#
#   - the app auto-loads every skill directory under ~/.claude/skills/ (its plugin loader reserves
#     the marketplace name `skills-dir` for exactly that scan, and managed settings carry a sentinel
#     to turn it off) — so filling that directory is the whole job of this module;
#   - the SAME directory is mounted read-only into the Cowork VM, so a sandboxed session sees the
#     skills too. Whether our engines can RUN in that VM is a separate, unmeasured question;
#   - ~/.agents/skills — the directory Codex, Gemini and Goose read — is NOT scanned. A module that
#     called the shared helper bare would install a runtime that discovers nothing.
#
# The app owns the account and the model picker, so nothing here touches either.

# The bundle path. Overridable so the hermetic tests can stand up a stub bundle without writing into
# /Applications; production never sets it.
CLAUDE_APP="${CLAUDE_APP:-/Applications/Claude.app}"

runtime_install() {
  if [ ! -d "$CLAUDE_APP" ]; then
    echo "-> Installing Claude Desktop…"
    # Measured: `brew info --cask claude` resolves to Anthropic's official app and auto-updates.
    # (The Goose module was first written against a cask name that does not exist; this one was
    # checked rather than assumed.)
    if command -v brew >/dev/null 2>&1; then
      brew install --cask claude >/dev/null 2>&1 || true
    fi
  fi
  # No direct-download fallback, and that is deliberate: unlike Goose — whose channel is a versioned
  # GitHub release asset — the only direct Claude artefact is an opaque storage-bucket URL carrying
  # no version. Pointing a journalist at the official page beats shipping them an unpinned binary.
  if [ ! -d "$CLAUDE_APP" ]; then
    echo "Claude Desktop could not be installed. Install it from https://claude.com/download, then re-run this installer." >&2
    exit 1
  fi
  # The one door the app actually reads. The shared helper applies the same rules here as anywhere
  # else — dead links swept, and only directories that carry a SKILL.md linked.
  link_agents_skills "$HOME/.claude/skills"
}

# Plain, with no folder argument — and that is a measured limitation rather than an oversight. The
# app declares `public.folder` as an Editor document type, but opening it on a folder left no
# observable trace of that folder in its own state, so unlike `open -a Goose .` there is nothing to
# rely on: the journalist picks the working folder inside the app. Recorded in the findings so the
# next person does not re-derive it.
runtime_launch_cmd() { echo 'open -a Claude'; }
