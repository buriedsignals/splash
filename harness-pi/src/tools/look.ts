// The model has to SEE what it rendered before it may call a beat done (R8). The image travels as a
// tool-result image block; Pi forwards it to a model that declares image input.
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { relative } from "node:path";
import { defineTool } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { type Bases, resolveInStory } from "./fs.ts";

export function lookTool(bases: Bases) {
  return defineTool({
    name: "look",
    label: "Look at image",
    description:
      "Look at a PNG inside the story (a render or a verification screenshot). Use it after every render, before saying the beat is done.",
    parameters: Type.Object({ path: Type.String() }),
    async execute(_id, { path }) {
      let abs = resolveInStory(bases, path);
      // Renders come as an SVG and its PNG twin; the model often names the SVG.
      if (abs.endsWith(".svg") && existsSync(abs.replace(/\.svg$/, ".png"))) abs = abs.replace(/\.svg$/, ".png");
      if (!abs.endsWith(".png")) throw new Error(`${path} is not a PNG`);
      const data = (await readFile(abs)).toString("base64");
      return {
        content: [
          {
            type: "text" as const,
            text: `image ${relative(bases.storyDir, abs)}`,
          },
          { type: "image" as const, data, mimeType: "image/png" },
        ],
        details: { path: relative(bases.storyDir, abs) },
      };
    },
  });
}
