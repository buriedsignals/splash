import { registerProvider } from "@flue/runtime";
import { registerBuiltInApiProviders } from "@earendil-works/pi-ai/compat";

// Wire the `local/*` model namespace to a local Ollama server's OpenAI-compatible
// endpoint. Two steps: (1) register the built-in API implementations (Flue does NOT
// auto-register them) so the `openai-completions` protocol exists; (2) register a
// named `local` provider pointing at Ollama (which accepts any apiKey).
// Ollama serves the classic chat endpoint (`/v1/chat/completions`) → api
// `openai-completions`, NOT `openai-responses`. Env-overridable so a different local
// server (raw llama.cpp) or a v1.5 swap needs no code change.
let registered = false;
export function registerLocalProvider(): void {
  if (registered) return;
  registerBuiltInApiProviders();
  registerProvider("local", {
    api: "openai-completions",
    baseUrl: process.env.SPLASH_LOCAL_BASE_URL ?? "http://localhost:11434/v1",
    apiKey: process.env.SPLASH_LOCAL_API_KEY ?? "ollama",
  });
  registered = true;
}
