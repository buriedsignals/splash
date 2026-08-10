# The rename, and the move to `rd-dev` — procedure

Decided by the owner, 2026-08-11. Written so this can be executed by whoever is holding the session,
without re-deriving any of it. **Do not start it while agents are committing** — it touches 675 files
and any concurrent write becomes a conflict in the middle of a mechanical change.

## The decisions already taken

- **The twin replaces Splash.** On `rd-dev`, the contents of `twin/` become the repository root and
  the old `skills/` (chart-native, map-native, suggest-*, splash-*) is deleted. The site at the root
  (`index.html`, `docs/`, `demos/`) is untouched — GitHub Pages serves it from `main`, not `rd-dev`.
- **Traces first.** The old Splash is already fully online: local `main` is an ancestor of
  `origin/rd-dev`, both at `c19d7a99`. The twin was pushed to `origin/splash-twin` before the rename
  began. Push the branch again immediately before replacing `rd-dev`, so the pre-replacement tip
  stays reachable.

## What the rename touches — measured, not estimated

**675 files** carry an identifier. Four distinct kinds, and each fails differently if missed:

1. **The 15 skill directories and their front-matter names.** Dropping the prefix gives:
   `chart-beat · chart-video · chart-web · deliver · doctrine · dw-beat · image-beat · intake ·
   map-beat · map-web · newsroom-charter · palette · scrolly · storyboard · splash`.
2. **The doors and the doctor** — 12 occurrences of `splash-twin` and 6 of `splash-twin-doctor`
   across `installer/{install.sh,place-skills.mjs,configure.mjs,doctor.mjs}` and
   `.claude-plugin/plugin.json`. The Claude-family door becomes `~/.claude/skills/splash`; the flat
   links in `~/.agents/skills/` take the new ids; the binary on `~/.local/bin` becomes
   `splash-doctor`.
3. **The shared import specifiers** — `#shared/twin-chart-beat` and `#shared/twin-chart-video`,
   which appear in beat sources *and* in the `imports` map of `package.json` and of the root
   template. Rename both halves or nothing resolves.
4. **`shared/` and the root template's mirror of it**, whose directory names are part of the
   contract two walking guards assert (`size-table-parity`, `root-template-tells-the-truth`).

## Three ids collide with the old product

`splash`, `scrolly`, `newsroom-charter`. The other twelve do not clash with anything the old Splash
installed. Since the old tree is deleted from `rd-dev` this is not a repository problem — it is an
**installed-machine** problem: a developer who still has the old product linked will find those three
names taken. `place-skills.mjs` already refuses to overwrite anything that is not its own symlink and
reports the collision, so the failure is loud rather than silent. Nothing further is required for the
merge; it is worth a line in the release note.

## Order of operations

1. Wait for every agent to finish. Confirm with `git status --short` that the tree is clean.
2. Run the full suite and record the number. This is the baseline the rename must not move.
3. Rename directories, then contents, then the two `imports` maps. Commit as **one** commit — a
   mechanical change is reviewable only if it is not mixed with anything else.
4. Run the full suite again. **Same count, or the rename broke something.** The walking parity
   guards and `no-cross-skill-imports` are the ones that will catch a half-rename.
5. Re-render one beat per genre and open them, because a guard that reads paths can stay green while
   an artifact stops being produced.
6. Push the branch (trace), then replace `rd-dev`, then run the final verification **on the renamed
   tree** — an audit of the old naming is worth nothing for what gets merged.

## What must NOT be swept in

The rename is mechanical. Any behavioural change discovered while doing it goes in its own commit,
before or after, never inside. The one thing this project has repeatedly paid for is a commit whose
message describes less than its diff.
