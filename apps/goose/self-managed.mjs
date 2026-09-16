import { lstat, mkdir, realpath } from "node:fs/promises";
import { basename, dirname, isAbsolute, join } from "node:path";
import { runPreflight } from "../../skills/splash/scripts/preflight.mjs";
import { resolveEnvKey } from "../../skills/splash/scripts/keys.mjs";
import { buildPublicStatus, CREDENTIAL_IDS } from "./contract.mjs";
import { createStoryBinding } from "./story-binding.mjs";
import { createSelectionService, capabilitySnapshotFromStatus } from "./selection.mjs";
import { createRecommendationService } from "./recommendation.mjs";
import { startStudioController } from "./studio/controller.mjs";
import { startSetupController } from "../../installer/setup/controller.mjs";
import { createLocalSession } from "./studio/local-session.mjs";
import { createSettingsService } from "../../installer/setup/settings-service.mjs";
import { readNewsroom } from "../../installer/setup/newsroom-store.mjs";

const PROVIDERS = {
  MAPTILER_KEY: { name: "MapTiler key", purpose: "Render maps and load live tiles from published maps.", acquisitionUrl: "https://cloud.maptiler.com/account/keys", capability: "map" },
  DATAWRAPPER_TOKEN: { name: "Datawrapper API token", purpose: "Create and publish Datawrapper charts.", acquisitionUrl: "https://app.datawrapper.de/account/api-tokens", capability: "datawrapper" },
  CLOUDFLARE_API_TOKEN: { name: "Cloudflare API token", purpose: "Publish hosted embeds using the account below.", acquisitionUrl: "https://dash.cloudflare.com/profile/api-tokens", capability: "hostedEmbed" },
};

export function createEnvironmentStatusProvider({ checkoutRoot, newsroomPath, env = process.env, fetchFn = fetch }) {
  return {
    async read() {
      // Transport errors can contain a provider URL and its key. Do not expose
      // exception text through either preflight or the browser status response.
      const privateFetch = async (url, init) => {
        try { return await fetchFn(url, { ...init, signal: AbortSignal.timeout(10_000) }); }
        catch { throw new Error("provider request failed"); }
      };
      const newsroom = await readNewsroom(newsroomPath).catch(() => null);
      const accountId = resolveEnvKey(env, "CLOUDFLARE_ACCOUNT_ID") || newsroom?.profile?.cloudflareAccountId || "";
      const effectiveEnv = { ...env, CLOUDFLARE_ACCOUNT_ID: accountId };
      const preflight = await runPreflight({ root: checkoutRoot, newsroomPath, env: effectiveEnv, fetchFn: privateFetch });
      const status = buildPublicStatus({ preflight, keyList: { ok: true, broker: { status: "available" }, keys: [] } });
      status.installation = "self-managed";
      status.broker = { status: "not-used", reasonCode: null, message: null };
      if (/^[0-9a-f]{32}$/i.test(accountId)) status.newsroom.cloudflareAccountId = accountId.toLowerCase();
      status.credentials = CREDENTIAL_IDS.map(id => {
        const { capability, ...metadata } = PROVIDERS[id];
        const present = Boolean(resolveEnvKey(env, id));
        const verified = capability && preflight.capabilities[capability]?.available === true;
        return {
          id, ...metadata,
          state: !present ? "not-set" : verified ? "ready" : capability ? "unavailable" : "provided-unverified",
          stored: false, generation: null,
          reason: !present ? "Not provided in the process environment." : verified ? null : capability ? "Provider check did not pass. Check the value, permissions, and connection." : "Provided; origin restrictions are not verified by Splash.",
          validation: verified ? { status: "verified", dimensions: [], evidence: id === "CLOUDFLARE_API_TOKEN" ? { cloudflareAccountId: accountId.toLowerCase() } : null } : null,
        };
      });
      return status;
    },
  };
}

export async function inspectLocalStory(path) {
  if (!isAbsolute(path)) throw new Error("Use an absolute story directory path.");
  const canonicalPath = await realpath(path);
  if (!(await lstat(canonicalPath)).isDirectory()) throw new Error("Story must be a directory.");
  for (const marker of ["AGENTS.md", "source/article.md"]) {
    const target = join(canonicalPath, marker);
    const info = await lstat(target);
    if (!info.isFile() || info.isSymbolicLink() || await realpath(target) !== target) throw new Error("Story is missing its canonical markers.");
  }
  let hasStoryboard = false;
  try { const info = await lstat(join(canonicalPath, "STORYBOARD.md")); hasStoryboard = info.isFile() && !info.isSymbolicLink(); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  return { storyId: basename(canonicalPath), canonicalPath, articlePath: join(canonicalPath, "source", "article.md"), hasStoryboard };
}

export function selfManagedDependencies({ checkoutRoot, newsroomPath, profileProvider, env = process.env, fetchFn, openUrl }) {
  const statusProvider = createEnvironmentStatusProvider({ checkoutRoot, newsroomPath, env, fetchFn });
  const storyBinding = createStoryBinding({ inspect: inspectLocalStory });
  const selection = createSelectionService({ storyBinding, capabilityProvider: async () => {
    const status = await statusProvider.read();
    if (!status.readiness.ready) {
      const error = new Error("Complete Splash pre-flight before choosing a visual.");
      error.code = "PREFLIGHT_REQUIRED";
      throw error;
    }
    return capabilitySnapshotFromStatus(status);
  } });
  const recommendation = createRecommendationService({ selection, profileProvider });
  const setupManager = createLocalSession({ urlField: "setupUrl", openUrl,
    startController: async () => {
      await mkdir(dirname(newsroomPath), { recursive: true, mode: 0o700 });
      const canonicalNewsroom = join(await realpath(dirname(newsroomPath)), basename(newsroomPath));
      return startSetupController({ installation: "self-managed", credentialStatusProvider: statusProvider, newsroomPath: canonicalNewsroom, accountIdFromEnvironment: resolveEnvKey(env, "CLOUDFLARE_ACCOUNT_ID") });
    },
  });
  const settings = createSettingsService({ newsroomPath, accountIdFromEnvironment: resolveEnvKey(env, "CLOUDFLARE_ACCOUNT_ID") });
  const dependencies = { statusProvider, storyBinding, selection, recommendation, setupManager, settings };
  const studio = createLocalSession({ urlField: "studioUrl", openUrl,
    startController: () => startStudioController(dependencies),
  });
  return { ...dependencies, studio };
}
