// The palette as Splash decides it, with the decisions left where Splash leaves them. Most of the
// time paletteDecision derives the colours from NEWSROOM.md and nobody is asked; the harness writes
// PALETTE.md itself. When it does ask (a subject convention competes with the house colours, a
// contrast fails, no house colours exist), the model presents the proposal the CODE computed, and
// record_palette only opens once the journalist has answered: the model can neither invent a
// colour nor answer the gate itself.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defineTool } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import {
  formatPalette,
  paletteDecision,
} from "../../../skills/palette/scripts/palette.mjs";
import { formatProposal } from "../../../skills/palette/scripts/format-proposal.mjs";
import { readNewsroomBasics } from "../../../skills/chart-beat/scripts/static-plumbing.mjs";
import { parseStoryboard } from "../../../skills/splash/scripts/gate-contract.mjs";
import type { Bases } from "./fs.ts";

export interface GateState {
  /** Set by the driver when a journalist message arrives after the question was put. */
  answered: boolean;
  asked: boolean;
}

interface Option {
  id: string;
  origin: string;
  ground: string;
  accent: string;
  contrast: { passes: boolean; ratio: number };
  remedy: { accent: string } | null;
}

function decide(bases: Bases) {
  const storyboard = join(bases.storyDir, "STORYBOARD.md");
  const subject = existsSync(storyboard)
    ? (parseStoryboard(readFileSync(storyboard, "utf8")).meta as { subject?: string }).subject
    : undefined;
  return paletteDecision({
    newsroom: readNewsroomBasics(bases.root) ?? undefined,
    subject,
  });
}

/** Write PALETTE.md when Splash would decide it without asking; report whether a question is due. */
export function closeDerivedPalette(bases: Bases): {
  written: boolean;
  reason: string;
} {
  const path = join(bases.storyDir, "PALETTE.md");
  if (existsSync(path))
    return { written: false, reason: "PALETTE.md already recorded" };
  const decision = decide(bases);
  if (decision.ask || !decision.palette) return { written: false, reason: decision.reason };
  writeFileSync(path, formatPalette(decision.palette as Parameters<typeof formatPalette>[0]));
  return { written: true, reason: decision.reason };
}

const text = (t: string) => ({
  content: [{ type: "text" as const, text: t }],
  details: {},
});

export function paletteTools(bases: Bases, gate: GateState) {
  let options: Option[] = [];

  const propose = defineTool({
    name: "propose_palette",
    label: "Propose palette",
    description:
      "Compute the palette proposal for this story (subject convention, house colours, measured contrast). Show it to the journalist as it is, ask them to choose, and end your turn.",
    parameters: Type.Object({}),
    async execute() {
      const decision = decide(bases);
      options = decision.proposal.options as Option[];
      gate.asked = true;
      gate.answered = false;
      return text(
        `${formatProposal(decision.proposal)}\n\nWhy the journalist is asked: ${decision.reason}`,
      );
    },
  });

  const record = defineTool({
    name: "record_palette",
    label: "Record palette",
    description:
      "Record the option the journalist chose (its number in the proposal, starting at 1). Only after they have answered.",
    parameters: Type.Object({ option: Type.Number() }),
    async execute(_id, { option }) {
      if (!gate.asked)
        throw new Error(
          "no proposal was shown: call propose_palette and ask the journalist first",
        );
      if (!gate.answered)
        throw new Error(
          "the journalist has not answered yet: end your turn and wait for their choice",
        );
      const chosen = options[option - 1];
      if (!chosen)
        throw new Error(
          `there is no option ${option}; the proposal has ${options.length}`,
        );
      if (!chosen.contrast.passes) {
        throw new Error(
          `option ${option} fails the 3:1 contrast floor (${chosen.contrast.ratio}:1)` +
            (chosen.remedy
              ? `; the nearest passing accent is ${chosen.remedy.accent} — ask the journalist`
              : ""),
        );
      }
      const path = join(bases.storyDir, "PALETTE.md");
      writeFileSync(
        path,
        formatPalette({
          ground: chosen.ground,
          accent: chosen.accent,
          origin: chosen.origin,
        }),
      );
      return text(
        `recorded PALETTE.md: ground ${chosen.ground}, accent ${chosen.accent}, origin ${chosen.origin}`,
      );
    },
  });

  return { propose, record };
}
