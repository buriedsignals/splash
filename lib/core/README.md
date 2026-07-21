# `lib/core` — Splash Shared Core Registry

The single source of cross-cutting correctness primitives shared across all Splash engines.

## What lives here

- **Contrast** — WCAG luminance calculations and validation
- **Theme** — color derivation and background theme handling
- **Locale** — internationalization helpers
- **Text-fit** — text measurement and wrapping utilities
- **Video-verify** — frame-gating and video production correctness
- **Conformance-L0** — machine-verifiable rules (no interpretation required)

## Import path

From any engine at `skills/<engine>/src/`, import using:

```ts
import { ... } from "../../../lib/core";
```

## Not a skill

This package is intentionally **outside** the `skills/` root. It is a library, not a Claude Code skill. The plugin loader will not scan `lib/` for `SKILL.md`.

## See also

- `docs/superpowers/specs/2026-07-20-shared-core-registry-contracts-design.md` — the design contracts that every later task extends
