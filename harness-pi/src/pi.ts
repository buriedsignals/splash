// The harness owns everything Pi would otherwise discover: no ~/.pi settings, no project skills,
// no extensions. A session sees exactly the system prompt and tools the harness gives it.
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import {
  createExtensionRuntime,
  ModelRuntime,
  type ResourceLoader,
} from "@earendil-works/pi-coding-agent";

export const SERVE_DIR = resolve(import.meta.dirname, "..", "serve");

export function agentDir(): string {
  return (
    process.env.SPLASH_HARNESS_AGENT_DIR ??
    join(homedir(), ".splash-harness", "pi-agent")
  );
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
  baseUrl = "http://127.0.0.1:8090",
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
