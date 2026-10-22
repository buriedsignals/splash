// Needs the local model server: bash harness-pi/serve/llama-server.sh
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createAgentSession,
  defineTool,
  SessionManager,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { fixedResources, loadModel, serverIsUp } from "../src/pi.ts";

const PROOF_PNG = resolve(
  import.meta.dirname,
  "../../proof/static-bar-top-emitters-2024/renders/creme.png",
);
const up = await serverIsUp();
if (!up)
  console.warn("SKIPPED: local model server is not running on 127.0.0.1:8090");

describe.skipIf(!up)("local model server", () => {
  it("should let the model read a chart returned as an image by a tool", async () => {
    const { modelRuntime, model } = await loadModel();
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
      thinkingLevel: "off",
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
      console.log(answer);
      expect(answer).toMatch(/Chine/);
      expect(answer).toMatch(/12[,.]3/);
    } finally {
      session.dispose();
    }
  }, 300_000);
});
