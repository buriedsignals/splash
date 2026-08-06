# Splash — the doctrine twin

This is the doctrine twin: a fresh, prose-first rebuild of Splash, built on the
`experiment/doctrine-twin` branch. It is never merged into `main`. It exists to be measured against
`main` — three cases replayed and compared on the render, by eye, at honest cost — and either wins
that comparison or is discarded. Nothing in this branch decides that on its own.

## Isolation from `main`

Rémy's constraint: the two must never meet, mix, or influence each other. Mechanically:

- Build under `twin/` while harvesting seeds, sheets and references from `skills/`; a final commit
  removes `skills/` so the branch tree **is** the twin.
- Harvesting is **read-and-rewrite**, never a copy that keeps a link. No twin import points at
  `skills/` — and once `skills/` is gone that is mechanically impossible.
- The twin never writes into an existing Splash root. Its root is distinct; its `NEWSROOM.md` is its
  own.
- The public product name stays *Splash*. **Skill ids are distinct**, otherwise the two overwrite
  each other in `~/.claude/skills` at install time — which is exactly the entanglement being
  refused. Two entities, two id sets, one public name.

## Running the tests

```bash
cd twin && bun test
```
