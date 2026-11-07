// The harness owns everything Pi would otherwise discover: no ~/.pi settings, no project skills,
// no extensions. A session sees exactly the system prompt and tools the harness gives it.
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import type { Tier } from "./budget.ts";
import {
  createExtensionRuntime,
  ModelRuntime,
  type ResourceLoader,
} from "@earendil-works/pi-coding-agent";

export const SERVE_DIR = resolve(import.meta.dirname, "..", "serve");

/** The local server, on the port serve/llama-server.sh reads from SPLASH_PORT (8090 by default). */
export const LOCAL_SERVER = `http://127.0.0.1:${process.env.SPLASH_PORT ?? "8090"}`;

export function agentDir(): string {
  return (
    process.env.SPLASH_HARNESS_AGENT_DIR ??
    join(homedir(), ".splash-harness", "pi-agent")
  );
}

/** The model arms a run can name with --model: the local student and the OpenRouter teacher. */
export const ARMS: Record<string, { provider: string; id: string; modelsPath: string; tier: Tier }> = {
  stock: { provider: "splash-local", id: "gemma-4-12b", modelsPath: join(SERVE_DIR, "models.json"), tier: "12b" },
  // The 26B-A4B on the local server (T3 run locally first, 2026-11-07: free, and the Mac is the target).
  local26: { provider: "splash-local", id: "gemma-4-26b", modelsPath: join(SERVE_DIR, "models.json"), tier: "26b" },
  // The teacher is Gemma 4 26B-A4B (Tom, REMI §2/§8); the 31B stays for a gate the 26B fails.
  teacher: { provider: "splash-teacher", id: "google/gemma-4-26b-a4b-it", modelsPath: join(SERVE_DIR, "models.teacher.json"), tier: "26b" },
  "teacher-free": { provider: "splash-teacher", id: "google/gemma-4-26b-a4b-it:free", modelsPath: join(SERVE_DIR, "models.teacher.json"), tier: "26b" },
  teacher31: { provider: "splash-teacher", id: "google/gemma-4-31b-it", modelsPath: join(SERVE_DIR, "models.teacher.json"), tier: "31b" },
  "teacher31-free": { provider: "splash-teacher", id: "google/gemma-4-31b-it:free", modelsPath: join(SERVE_DIR, "models.teacher.json"), tier: "31b" },
};

/**
 * The serving route a result was measured on (Tom, REMI §1: label every result by route). The local
 * provider is llama-server unless SPLASH_ROUTE names another (osaurus); the teacher is OpenRouter.
 */
export function routeOf(arm: string): string {
  const a = ARMS[arm];
  if (!a) return "unknown";
  return a.provider === "splash-teacher" ? "openrouter" : process.env.SPLASH_ROUTE ?? "llama-server";
}

export async function loadModel({
  provider = "splash-local",
  id = "gemma-4-12b",
  modelsPath = join(SERVE_DIR, "models.json"),
}: { provider?: string; id?: string; modelsPath?: string } = {}) {
  const modelRuntime = await ModelRuntime.create({
    authPath: join(agentDir(), "auth.json"),
    modelsPath,
    refreshOnCreate: false,
  });
  const model = modelRuntime.getModel(provider, id);
  if (!model)
    throw new Error(`model ${provider}/${id} is not declared in ${modelsPath}`);
  if (provider === "splash-local") model.baseUrl = `${LOCAL_SERVER}/v1`;
  return { modelRuntime, model };
}

export function fixedResources(systemPrompt: string): ResourceLoader {
  return {
    getExtensions: () => ({
      extensions: [],
      errors: [],
      runtime: createExtensionRuntime(),
    }),
    getSkills: () => ({ skills: [], diagnostics: [] }),
    getPrompts: () => ({ prompts: [], diagnostics: [] }),
    getThemes: () => ({ themes: [], diagnostics: [] }),
    getAgentsFiles: () => ({ agentsFiles: [] }),
    getSystemPrompt: () => systemPrompt,
    getSystemPromptSource: () => undefined,
    getAppendSystemPrompt: () => [],
    getAppendSystemPromptSources: () => [],
    extendResources: () => {},
    reload: async () => {},
  };
}

export async function serverIsUp(
  baseUrl = LOCAL_SERVER,
): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
