// Needs OPENROUTER_API_KEY. Uses the free tier of the teacher model, so the probe spends nothing.
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  createAgentSession,
  defineTool,
  SessionManager,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { fixedResources, loadModel, SERVE_DIR } from "../src/pi.ts";

const PROOF_PNG = resolve(
  import.meta.dirname,
  "../../proof/static-bar-top-emitters-2024/renders/creme.png",
);
const keyed = Boolean(process.env.OPENROUTER_API_KEY);
if (!keyed) console.warn("SKIPPED: OPENROUTER_API_KEY is not set");

const modelsOf = (file: string) =>
  JSON.parse(readFileSync(join(SERVE_DIR, file), "utf8")).providers;

describe("teacher model entry", () => {
  it("should share the student's context window so gold runs compact as student runs do", () => {
    const local = modelsOf("models.json")["splash-local"].models[0];
    for (const teacher of modelsOf("models.teacher.json")["splash-teacher"]
      .models) {
      expect(teacher.contextWindow).toBe(local.contextWindow);
    }
  });
});

describe.skipIf(!keyed)("teacher probe", () => {
  it("should call a tool and read the image it returns", async () => {
    const { modelRuntime, model } = await loadModel({
      provider: "splash-teacher",
      id: "google/gemma-4-31b-it:free",
      modelsPath: join(SERVE_DIR, "models.teacher.json"),
    });
    const showChart = defineTool({
      name: "show_chart",
      label: "Show chart",
      description: "Return the rendered chart as an image.",
      parameters: Type.Object({}),
      async execute() {
        return {
          content: [
            { type: "text", text: "Rendered chart attached." },
            {
              type: "image",
              data: readFileSync(PROOF_PNG).toString("base64"),
              mimeType: "image/png",
            },
          ],
          details: {},
        };
      },
    });
    const { session } = await createAgentSession({
      cwd: process.cwd(),
      model,
      modelRuntime,
      thinkingLevel: "medium",
      resourceLoader: fixedResources(
        "You are a careful assistant. Use tools when asked.",
      ),
      sessionManager: SessionManager.inMemory(),
      settingsManager: SettingsManager.inMemory({
        compaction: { enabled: false },
      }),
      noTools: "builtin",
      customTools: [showChart],
    });
    try {
      await session.prompt(
        "Call show_chart, then reply with the chart's headline exactly as printed and the largest value shown.",
      );
      const answer = session.getLastAssistantText() ?? "";
      const thinking = session.messages.some(
        (m) =>
          m.role === "assistant" &&
          Array.isArray(m.content) &&
          m.content.some((c) => c.type === "thinking"),
      );
      console.log(JSON.stringify({ answer, reasoningReturned: thinking }));
      expect(answer).toMatch(/Chine/);
      expect(answer).toMatch(/12[,.]3/);
    } finally {
      session.dispose();
    }
  }, 300_000);
});
