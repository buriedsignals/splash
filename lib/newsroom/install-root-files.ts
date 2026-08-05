// The files an install keeps at its ROOT — the ones the decor resolves from `installRoot()`, not
// from a project directory.
//
// This list has one consumer, `scripts/pack-skills.mjs`, and one reason to exist: the delivered
// tree at `$DEST/.dist/` is a NEW ROOT, and a dozen shipped scripts resolve the install root as
// "N levels above my own directory". Packing the skills one level down re-points every one of them
// at the delivery, where the configurator has written nothing. The packer links each name here
// back to the real install root so those resolutions keep landing on the real file.
//
// It lives in lib/newsroom rather than in the packer because the fact is the DECOR's, not the
// packaging step's: these are the names lib/newsroom (and the profile loader it delegates to)
// joins to an install root. install-root-files.test.ts reads those modules and fails when one of
// them grows a name this array does not carry — the guard whose absence let `.splash-runtime` and
// `.splash-preflight.json` be missed on the first pass.
export const INSTALL_ROOT_FILES: readonly string[] = [
  // Credentials. The single home of every key; the launcher sources it and every producer's own
  // fallback reads it when the process environment is empty (a Dock-launched session).
  ".env",
  // The decor: runtime, uiLang, capability stamps.
  "newsroom.json",
  // The journalist's house style, and its machine-readable cache.
  "NEWSROOM-PROFILE.md",
  // A CACHE of the profile above, and included for exactly that reason rather than despite it:
  // `loadNewsroomProfile` WRITES it wherever it reads the markdown, so at `installRoot()` it was
  // landing in the delivery — a cache re-derived on every call and deleted by every re-pack. The
  // link puts it back beside the markdown it caches.
  "brand.json",
  // Legacy, pre-newsroom.json, and still live READERS (lib/newsroom/migrate-decor.ts:32-40).
  // An install that predates the setup page re-runs the installer with an existing .env, which
  // SKIPS the configurator (install/bootstrap.sh:70) — so newsroom.json is never written and the
  // migration is the only thing that recovers its runtime, its language and its green preflight
  // stamps. Without these two links it looks for them in the delivery, finds nothing, and the
  // install silently reverts to an English interface with no capability verified.
  ".splash-runtime",
  ".splash-preflight.json",
];
