// decor.ts — the one impure function in lib/newsroom: it reads the install root and hands
// back the decor as data. Everything else in this directory is pure, which is what makes the
// decor testable without a machine.
//
// The install root is resolved from THIS module's location, not from process.cwd(): a
// producer, the loop and the host façade all run from different working directories, and the
// decor must not change depending on which one asked.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadBrandProfile,
  loadNewsroomProfile,
  parseNewsroomMarkdown,
  type BrandProfile,
} from "../../skills/splash/src/brand-profile";
import {
  DEFAULT_UI_LANG,
  resolveLanguage,
  type ResolvedLanguage,
} from "./language";
import {
  migratedDecorState,
  migrateDecor,
  needsDecorMigration,
} from "./migrate-decor";
import { parseEnvFile } from "./probe";
import { decorReadiness, type CapabilityReadiness } from "./readiness";
import {
  DEFAULT_NEWSROOM_STATE,
  defaultCapabilities,
  newsroomStatePath,
  readNewsroomState,
  type NewsroomState,
} from "./state";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * The newsroom facts a DELIVERY carries: the source line and credit printed on the package,
 * the CONTENT language it is written in, and the opt-in sign-off requirement (spec §3.10).
 *
 * It rides on the decor because the decor is what every caller already threads: the driver
 * hands its decor to `deliver`, and without these facts on it the only production caller had
 * no way to supply them — source/credit/lang never reached the delivered artifact, and
 * `requiredSigners` was enforced in tests only. Structurally the same shape as
 * lib/delivery/metadata.ts's `ProfileFacts`, deliberately NOT imported from it: lib/newsroom
 * must not grow a dependency on lib/delivery.
 */
export type DeliveryProfile = {
  source?: string;
  credit?: string;
  /** BCP-47, the CONTENT language — already resolved through language.content. */
  lang?: string;
  /** Signer ids whose editorial sign-off publishing REQUIRES. Absent ⇒ nothing is asked. */
  requiredSigners?: string[];
};

export type Decor = {
  root: string;
  state: NewsroomState;
  language: ResolvedLanguage;
  readiness: CapabilityReadiness[];
  /** What a delivery prints and what it requires. Empty when the install has no profile. */
  profile: DeliveryProfile;
  /** The house ground: "light" | "dark" | "#rrggbb". Absent ⇒ the install declared none.
   *  It is the STYLE axis's only input: a dark ground is what makes a Datawrapper form
   *  physically unrenderable (spec §4.1). */
  theme?: string;
};

export function installRoot(): string {
  return resolve(here, "../..");
}

/**
 * The environment the decor judges against: the install's own .env, with the process
 * environment winning. Bun auto-loads .env from the CWD only, and a producer may run from
 * anywhere — reading the install's file is what keeps a readiness answer from claiming a key
 * is missing while it sits in the file the launcher sources.
 */
export function decorEnv(root: string): Record<string, string | undefined> {
  return { ...parseEnvFile(join(root, ".env")), ...process.env };
}

export type LoadDecorOpts = {
  /** The environment to judge readiness against. Defaults to `decorEnv(root)`. */
  env?: Record<string, string | undefined>;
  /** The language of the article this decor is being loaded FOR, when there is one.
   *  Absent for every decor read that is not about a specific run — which is why it is an
   *  option and not a field of the install's own state. */
  articleLang?: string;
};

/**
 * The decor of an install.
 *
 * `dir` is OPTIONAL, and the difference is not cosmetic: without it the decor resolves from
 * this install's own root, and the one-time legacy migration is allowed to WRITE
 * `newsroom.json` there. With an explicit `dir` — the shape reachable from the host façade,
 * where every argument is untrusted (`lib/host/cli.ts`) — the decor is read and derived but
 * NOTHING is written: no directory is created, no migration is persisted, no legacy file is
 * touched, and no `brand.json` profile cache is left behind. A host asking "what can this
 * newsroom do?" must not be able to make a directory appear wherever it points.
 */
export function loadDecor(dir?: string, opts: LoadDecorOpts = {}): Decor {
  const root = dir ?? installRoot();
  // Only the install's own root may be written to. An explicit dir is a read.
  const mayWrite = dir === undefined;
  const env = opts.env ?? decorEnv(root);
  const state = resolveState(root, env, mayWrite);
  const profile = resolveProfile(root, mayWrite);
  const language = resolveLanguage({
    uiLang: state.uiLang,
    ...(opts.articleLang ? { articleLang: opts.articleLang } : {}),
    profileLang: profile?.lang,
  });
  return {
    root,
    state,
    language,
    readiness: decorReadiness(state, { env }),
    profile: deliveryProfile(profile, language.content),
    ...(profile?.theme ? { theme: profile.theme } : {}),
  };
}

/**
 * The newsroom profile, under the same write rule as the state.
 *
 * `loadNewsroomProfile` caches its parse to `brand.json` on every call — which is right for the
 * install's own root (the cache is inspectable, and the file is the machine-readable half of
 * NEWSROOM-PROFILE.md) and wrong for a directory the host handed in: an entry point documented
 * as read-only was dropping a file into an untrusted path. Under an explicit dir the same
 * profile is DERIVED from the same two sources, in the same order, and simply not written.
 *
 * The parse-failure warning stays on the write path. It exists for the journalist configuring
 * THIS install; a façade query about some other directory is not that moment, and mirroring the
 * message here would be a second copy of it.
 */
function resolveProfile(root: string, mayWrite: boolean): BrandProfile | null {
  if (mayWrite) return loadNewsroomProfile(root);
  const mdPath = join(root, "NEWSROOM-PROFILE.md");
  if (!existsSync(mdPath)) return loadBrandProfile(root);
  try {
    return parseNewsroomMarkdown(readFileSync(mdPath, "utf8"));
  } catch {
    return null;
  }
}

/**
 * The delivery-facing view of a newsroom profile. `lang` is the RESOLVED content language,
 * not the raw profile field: a newsroom that set only `uiLang` still publishes in the
 * language it reads, which is exactly what `resolveLanguage` already decided.
 */
function deliveryProfile(
  profile: BrandProfile | null,
  contentLang: string,
): DeliveryProfile {
  if (!profile) return { lang: contentLang };
  // `{name}` is the documented placeholder of the credit template. Substituting it here means
  // a newsroom that used the documented form never finds a literal "{name}" in its package;
  // a credit without the placeholder is untouched.
  const filled = profile.source?.name
    ? profile.credit?.replaceAll("{name}", profile.source.name)
    : profile.credit;
  // An UNFILLED template is dropped rather than published. Nothing downstream can catch it:
  // lib/delivery/metadata.ts only trims, and lib/delivery/snippet.ts's brace guard reads the
  // TEMPLATE, never the value substituted into it — so `credit: "Graphique : {name}"` on a
  // profile with no `source.name` used to reach the reader as a literal "{name}".
  //
  // `{name}` is this template's ONLY placeholder (brand-profile.ts:27), so a brace that
  // survived substitution belongs to no filling Splash performs — the same ruling snippet.ts
  // makes for delivery templates. Dropping it lands on the documented empty-credit state
  // ("empty = derived from lang by the producer"), which is strictly what a newsroom that
  // declared no credit already gets.
  const credit = filled && /[{}]/.test(filled) ? undefined : filled;
  return {
    lang: contentLang,
    ...(profile.source?.name ? { source: profile.source.name } : {}),
    ...(credit ? { credit } : {}),
    ...(profile.requiredSigners?.length
      ? { requiredSigners: profile.requiredSigners }
      : {}),
  };
}

/**
 * The decor's STATE alone, derived read-only — the migration is applied but never persisted.
 *
 * For a caller that needs one field (the skill path resolves `uiLang` and nothing else) and must
 * not acquire a write side effect. `loadDecor()` without a dir is allowed to persist the legacy
 * migration; a script that merely prints a menu is not, and `readNewsroomState` alone was worse
 * still: it skips the migration entirely, so a legacy French install read as English (P1's
 * parked finding #3).
 */
export function readDecorState(
  root: string,
  env: Record<string, string | undefined> = decorEnv(root),
): NewsroomState {
  return resolveState(root, env, false);
}

function resolveState(
  root: string,
  env: Record<string, string | undefined>,
  mayWrite: boolean,
): NewsroomState {
  if (needsDecorMigration(root)) {
    // The one write on a read path, and the reason an existing install is recognised instead
    // of re-interrogated. It happens once: afterwards newsroom.json exists. Under an explicit
    // dir the same state is DERIVED and simply not persisted — the answer is identical, only
    // the side effect is withheld.
    return mayWrite ? migrateDecor(root, env) : migratedDecorState(root, env);
  }
  if (existsSync(newsroomStatePath(root))) return readNewsroomState(root);
  // No state file and no legacy file: a FRESH install. The default is not "nothing works" —
  // it is "whatever the keys already in .env make possible", exactly as the migration
  // derives it (spec §4.5). Returning bare defaults here is what made a fresh clone report
  // every capability disabled with an empty reason: silently condemned, which §3.4 forbids.
  return {
    ...DEFAULT_NEWSROOM_STATE,
    capabilities: defaultCapabilities(env),
  };
}

/**
 * `loadDecor` that cannot throw. The driver takes its decor as a defaulted parameter, and a
 * default parameter is evaluated BEFORE the function body — so a failure there (a read-only
 * or full install root) escapes `advance()` ahead of every bounded-failure path it owns. The
 * loop never throws; this is what keeps that true when the decor is resolved implicitly.
 * A failure yields the NEUTRAL decor: no capability known, so nothing is annotated — the
 * same answer as calling `propose` without a decor at all, never a false blocker.
 */
export function tryLoadDecor(load: () => Decor = () => loadDecor()): Decor {
  try {
    return load();
  } catch {
    return neutralDecor();
  }
}

export function neutralDecor(): Decor {
  return {
    root: installRoot(),
    state: { ...DEFAULT_NEWSROOM_STATE, capabilities: {} },
    language: { ui: DEFAULT_UI_LANG, content: DEFAULT_UI_LANG },
    readiness: [],
    profile: { lang: DEFAULT_UI_LANG },
  };
}
