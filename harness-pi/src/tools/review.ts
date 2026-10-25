// What a reviewer can MEASURE in a render, measured by code. On the 12B the designer passed contrast
// criteria it never measured and did not notice that the chart drawn was not the slot's chart.
// review_facts hands it the drawn text, the colours actually painted and their contrast against the
// ground, beside the slot's own claim, so every verdict can cite an observation.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { defineTool } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { contrast } from "../../../skills/palette/scripts/colour.mjs";
import { parseStoryboard } from "../../../skills/splash/scripts/gate-contract.mjs";
import type { Bases } from "./fs.ts";
import { beatDir } from "./run.ts";

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"');

export function svgFacts(svg: string) {
  const texts = [...svg.matchAll(/<text[^>]*>([^<]*)/g)]
    .map((m) => decode(m[1]).trim())
    .filter(Boolean);
  const rects = [
    ...svg.matchAll(
      /<rect[^>]*?width="([\d.]+)"[^>]*?height="([\d.]+)"[^>]*?fill="(#[0-9A-Fa-f]{6})"/g,
    ),
  ].map((m) => ({
    area: Number(m[1]) * Number(m[2]),
    fill: m[3].toUpperCase(),
  }));
  const ground = rects.sort((a, b) => b.area - a.area)[0]?.fill ?? "#FFFFFF";
  const fills = new Map<string, number>();
  for (const m of svg.matchAll(/fill="(#[0-9A-Fa-f]{6})"/g)) {
    const hex = m[1].toUpperCase();
    if (hex !== ground) fills.set(hex, (fills.get(hex) ?? 0) + 1);
  }
  const painted = [...fills.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([hex, uses]) => ({
      hex,
      uses,
      contrastToGround: Math.round(contrast(hex, ground) * 100) / 100,
    }));
  return { texts, ground, painted };
}

export function reviewTools(bases: Bases) {
  return defineTool({
    name: "review_facts",
    label: "Measure the render",
    description:
      "Measure the beat's newest render: the text it actually draws, the colours it paints with their contrast against the ground, and the storyboard slot's claim to compare it with. Cite these in your verdicts.",
    parameters: Type.Object({ beat: Type.String() }),
    async execute(_id, { beat }) {
      const renders = join(beatDir(bases, beat), "renders");
      if (!existsSync(renders)) throw new Error(`${beat} has no renders/`);
      const svgs = readdirSync(renders)
        .filter((f) => f.endsWith(".svg"))
        .sort(
          (a, b) =>
            statSync(join(renders, b)).mtimeMs -
            statSync(join(renders, a)).mtimeMs,
        );
      if (!svgs.length) throw new Error(`${beat} has no SVG render to measure`);
      const facts = svgFacts(readFileSync(join(renders, svgs[0]), "utf8"));
      const { meta } = parseStoryboard(
        readFileSync(join(bases.storyDir, "STORYBOARD.md"), "utf8"),
      );
      const slotId = basename(beatDir(bases, beat)).split("-")[0];
      const slot =
        (meta.slots ?? []).find(
          (s: { id: unknown }) => String(s.id) === slotId,
        ) ?? {};
      const lines = [
        `render: renders/${svgs[0]}`,
        `slot ${slotId} proves: ${slot.proves ?? "(not recorded)"}`,
        `takeaway: ${(meta as unknown as Record<string, unknown>).takeaway ?? "(not recorded)"}`,
        `ground: ${facts.ground}`,
        `colours painted (uses, contrast to ground; marks need >= 3, text >= 4.5 or 3 when large):`,
        ...facts.painted.map(
          (p) => `  ${p.hex} x${p.uses}: ${p.contrastToGround}:1`,
        ),
        `text drawn, in order:`,
        ...facts.texts.slice(0, 24).map((t) => `  "${t}"`),
      ];
      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
        details: facts,
      };
    },
  });
}
