// Delivery through typed tools. On the 12B the deliver step spent eight calls guessing module paths,
// offered the wrong format, then said it had recorded the journalist's declines without writing
// anything and without materialising the chosen form. Here the code knows the beat's identity,
// format, plan binding and hand-over facts (all already recorded in the story); the model presents
// the forms, asks, and acts only on what the journalist actually answered.
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { defineTool } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import {
  materialise,
  offerForms,
} from "../../../skills/deliver/scripts/deliver.mjs";
import {
  formatAnotherFormatOffer,
  otherFormatsFor,
  recordFormatAnswer,
} from "../../../skills/deliver/scripts/another-format.mjs";
import {
  formatSubjectOffer,
  otherSubjectsFor,
  recordSubjectAnswer,
} from "../../../skills/deliver/scripts/other-subjects.mjs";
import { parseStoryboard } from "../../../skills/splash/scripts/gate-contract.mjs";
import type { Bases } from "./fs.ts";
import { beatDir } from "./run.ts";
import { assertJournalistOwns, type Dialogue } from "./storyboard.ts";

const NEGATIVE =
  /\b(no|non|nein|not now|no thanks?|pas maintenant|nothing else|that's all|none)\b/i;

function identity(bases: Bases, beat: string) {
  const dir = beatDir(bases, beat);
  const brief = readFileSync(join(dir, "BRIEF.md"), "utf8");
  const planVersion = Number(/^planVersion:\s*(\d+)/m.exec(brief)?.[1]);
  const findingIds = (/^findingIds:\s*\[(.*)\]/m.exec(brief)?.[1] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const { meta } = parseStoryboard(
    readFileSync(join(bases.storyDir, "STORYBOARD.md"), "utf8"),
  );
  const slotId = basename(dir).split("-")[0];
  const slot = (meta.slots ?? []).find(
    (s: { id: unknown }) => String(s.id) === slotId,
  );
  if (!slot) throw new Error(`no storyboard slot ${slotId} for beat ${beat}`);
  return {
    dir,
    meta: meta as Record<string, any>,
    slot,
    common: {
      storiesRoot: join(bases.root, "stories"),
      storyId: basename(bases.storyDir),
      outputId: basename(dir),
      format: slot.format,
      planVersion,
      findingIds,
    },
  };
}

const text = (t: string) => ({
  content: [{ type: "text" as const, text: t }],
  details: {},
});

export function deliverTools(bases: Bases, dialogue: Dialogue) {
  const offer = defineTool({
    name: "offer_forms",
    label: "Offer delivery forms",
    description:
      "List the delivery forms this approved beat can be given in. Show them to the journalist, ask which one, and end your turn.",
    parameters: Type.Object({ beat: Type.String() }),
    async execute(_id, { beat }) {
      const { slot, common } = identity(bases, beat);
      const forms = offerForms({ ...common, medium: slot.medium });
      return text(
        forms
          .map(
            (f: {
              id: string;
              label: string;
              gives: string;
              available?: boolean;
            }) =>
              `- ${f.id} — ${f.label}: ${f.gives}${f.available === false ? " (not available here)" : ""}`,
          )
          .join("\n"),
      );
    },
  });

  const make = defineTool({
    name: "materialise",
    label: "Materialise the chosen form",
    description:
      "Build the ONE form the journalist chose (its id, e.g. owned-file). alt is the alt text describing the chart. Placement, credit, caveat and language come from the storyboard.",
    parameters: Type.Object({
      beat: Type.String(),
      form: Type.String(),
      alt: Type.String(),
    }),
    async execute(_id, { beat, form, alt }) {
      assertJournalistOwns("form", form.replace(/-/g, " "), {
        ...dialogue,
        lastJournalist: dialogue.lastJournalist.replace(/-/g, " "),
      });
      const { meta, common } = identity(bases, beat);
      const credit = [
        meta.credit,
        meta.effectiveDate ? `as of ${meta.effectiveDate}` : "",
      ]
        .filter(Boolean)
        .join(" · ");
      await materialise({
        ...common,
        form,
        handover: {
          placement: meta.placement,
          alt,
          credit,
          caveat: meta.limits,
          language: meta.language,
        },
      });
      return text(
        `materialised ${form} into export/${common.outputId}/. Now make the closing offers (offer_closing).`,
      );
    },
  });

  const closing = defineTool({
    name: "offer_closing",
    label: "Offer another format and another subject",
    description:
      "After materialising: show the journalist the two closing offers (this beat in another format; another subject from the article), ask, and end your turn.",
    parameters: Type.Object({ beat: Type.String() }),
    async execute(_id, { beat }) {
      const { slot, meta, common } = identity(bases, beat);
      const formats = otherFormatsFor({
        medium: slot.medium,
        deliveredFormat: common.format,
        language: meta.language,
      });
      const subjects = await otherSubjectsFor({ storyDir: bases.storyDir });
      return text(
        `${formatAnotherFormatOffer(formats, { beatName: common.outputId, language: meta.language })}\n\n${formatSubjectOffer(subjects, { language: meta.language })}`,
      );
    },
  });

  const recordClosing = defineTool({
    name: "record_closing",
    label: "Record a closing answer",
    description:
      "Record the journalist's answer to one closing offer: offer is 'format' or 'subject'; answer is 'declined' or 'taken'; value names the format or subject taken.",
    parameters: Type.Object({
      beat: Type.String(),
      offer: Type.String(),
      answer: Type.String(),
      value: Type.Optional(Type.String()),
    }),
    async execute(_id, { beat, offer, answer, value }) {
      if (answer === "declined" && !NEGATIVE.test(dialogue.lastJournalist)) {
        throw new Error(
          `the journalist has not declined: their last message was ${JSON.stringify(dialogue.lastJournalist.slice(0, 160))}. Ask them and end your turn.`,
        );
      }
      if (answer === "taken")
        assertJournalistOwns(offer, value ?? "", dialogue);
      const exportDir = join(
        bases.storyDir,
        "export",
        basename(beatDir(bases, beat)),
      );
      if (offer === "format")
        await recordFormatAnswer({ exportDir, answer, format: value });
      else if (offer === "subject")
        await recordSubjectAnswer({ exportDir, answer, subject: value });
      else
        throw new Error(
          `offer is "format" or "subject", not ${JSON.stringify(offer)}`,
        );
      return text(`recorded the ${offer} offer as ${answer}.`);
    },
  });

  return { offer, make, closing, recordClosing };
}
