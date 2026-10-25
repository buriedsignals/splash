// STORYBOARD.md written through typed tools, one per answer the exchange collects, so the model
// never writes the file and cannot claim a record it did not make. On the 12B the storyboard step
// ran the exchange well but recorded nothing ("I have recorded the takeaway" with no write behind
// it) and filled the journalist's hand itself. The rule that stops both lives here, not in a prompt:
// a journalist field is recorded only if the value is the journalist's own words, or a proposal the
// model made in its previous turn that the journalist then accepted — which is exactly what the
// exchange allows when the answer was "I don't know" (references/exchange.md).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { defineTool } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import {
  mutateStoryboard,
  writeStoryboardAtomic,
} from "../../../skills/storyboard/scripts/storyboard.mjs";
import { recordSurveyedSubjects } from "../../../skills/deliver/scripts/other-subjects.mjs";
import {
  confirmFormatReachable,
  groundingScalar,
  formatCandidateRows,
  resolveGrounding,
  typeSurvey,
} from "../../../skills/storyboard/scripts/propose.mjs";
import { treatmentNames } from "../../../skills/storyboard/scripts/producer-gate.mjs";
import {
  checkStoryboard,
  parseStoryboard,
  RECORDED_CLAIM_SHAPES,
  recordedClaimGaps,
} from "../../../skills/splash/scripts/gate-contract.mjs";
import type { Bases } from "./fs.ts";

/** What the journalist and the model last said, kept by the driver. */
export interface Dialogue {
  lastJournalist: string;
  /** The model's text in the turn the journalist was answering. */
  lastProposal: string;
  /** Every earlier exchange of this session: the 12B often records an answer a turn late. */
  history?: { proposal: string; answer: string }[];
}

const HAND = [
  "subject",
  "comparison",
  "limits",
  "placement",
  "credit",
  "effectiveDate",
] as const;
const JOURNALIST_SLOT_FIELDS = [
  "medium",
  "format",
  "size",
  "intent",
  "chosen",
  "producer",
] as const;
const MODEL_SLOT_FIELDS = ["proves"] as const;
const AFFIRMATIVE =
  /^(yes|yep|ok|okay|sure|fine|agreed|that works|go with (that|it)|oui|d'accord|ça marche|parfait|ja|sì|sim)\b/i;

const words = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);

function overlap(value: string, source: string): number {
  const v = words(value);
  if (v.length === 0) return 0;
  const s = new Set(words(source));
  return v.filter((w) => s.has(w)).length / v.length;
}

/** Throws unless the journalist said it, or said yes to the model having proposed it. */
export function assertJournalistOwns(field: string, value: string, d: Dialogue, { acceptProposal = true } = {}) {
  const exchanges = [{ proposal: d.lastProposal, answer: d.lastJournalist }, ...(d.history ?? [])];
  for (const { proposal, answer } of exchanges) {
    if (overlap(value, answer) >= 0.6) return;
    if (acceptProposal && AFFIRMATIVE.test(answer.trim()) && overlap(value, proposal) >= 0.6) return;
  }
  throw new Error(
    `${field} must be the journalist's own answer, or a proposal you made that they accepted. Their last message was: ${JSON.stringify(d.lastJournalist.slice(0, 200))}. If that message answers this field, record it in their own words, not a rewording; otherwise ask them, end your turn, and record what they say.`,
  );
}

/** "A, B" or a JSON array the model wrote as a string → the candidate names. */
export function candidateList(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map((c) => String(c).trim()).filter(Boolean);
  } catch {}
  return value
    .split(",")
    .map((c) => c.trim().replace(/^[\["']+|[\]"']+$/g, "").trim())
    .filter(Boolean);
}

/** "Bar Chart" → "Bar and column": the type-survey row a spelling names, for the slot's medium. */
export function canonicalTreatment(spelling: string, medium = "chart"): string {
  const rows = typeSurvey().filter((r: { medium: string }) => r.medium === medium);
  const asked = new Set(treatmentNames(spelling));
  const hits = rows.filter((r: { type: string }) => treatmentNames(r.type).some((n: string) => asked.has(n)));
  if (!hits.length)
    throw new Error(`${JSON.stringify(spelling)} is not a ${medium} type of the catalogue. Use one of: ${rows.map((r: { type: string }) => r.type).join(", ")}`);
  return hits[0].type;
}

function sameTreatment(a: string, b: string, medium: string): boolean {
  try {
    return canonicalTreatment(a, medium) === canonicalTreatment(b, medium);
  } catch {
    return false;
  }
}

/** Splash's gap messages, with the ones the harness computes pointed at the tool that fills them. */
export function gapsForModel(gaps: string[]): string[] {
  return gaps.map((g) =>
    /^grounding is missing/.test(g)
      ? "grounding is missing — record_takeaway computes it when you record the journalist's takeaway"
      : /interaction is missing/.test(g)
        ? `${g.split(":")[0]}: interaction is missing — record_slot chosen records it from the journalist's choice`
        : /proves is missing/.test(g)
          ? `${g.split(":")[0]}: proves is missing — it is filled from the takeaway once that is recorded`
          : g,
  );
}

const text = (t: string) => ({
  content: [{ type: "text" as const, text: t }],
  details: {},
});

export function storyboardTools(bases: Bases, dialogue: Dialogue, { slots: allowedSlots = ["1"] }: { slots?: string[] } = {}) {
  const path = join(bases.storyDir, "STORYBOARD.md");

  async function ensureFile() {
    if (!existsSync(path))
      await writeStoryboardAtomic(path, "---\nslots: []\n---\n");
  }

  async function ensureSlot(id: string) {
    await ensureFile();
    const { meta } = parseStoryboard(readFileSync(path, "utf8"));
    if ((meta.slots ?? []).some((s: { id: unknown }) => String(s.id) === id))
      return;
    const body = readFileSync(path, "utf8");
    const withSlot = body.includes("slots: []")
      ? body.replace("slots: []", `slots:\n  - id: ${id}`)
      : body.replace(/\n---\n/, `\n  - id: ${id}\n---\n`);
    await writeStoryboardAtomic(path, withSlot);
    // A single-slot run's slot proves the confirmed takeaway (SKILL.md: "the confirmed claim in proves").
    const takeaway = (meta as unknown as Record<string, unknown>).takeaway;
    if (takeaway && allowedSlots.length === 1) await mutateStoryboard(path, { slot: { id, fields: { proves: String(takeaway) } } });
  }

  const currentSlot = (id: string): Record<string, any> | undefined =>
    existsSync(path)
      ? (parseStoryboard(readFileSync(path, "utf8")).meta.slots ?? []).find((s: { id: unknown }) => String(s.id) === id)
      : undefined;

  const status = async () => {
    const { meta } = parseStoryboard(readFileSync(path, "utf8"));
    const gaps = gapsForModel(checkStoryboard(meta));
    return gaps.length
      ? `Still open (${gaps.length}): ${gaps.slice(0, 4).join(" | ")}`
      : "Gate 2 can close: every field is recorded.";
  };

  const recordTakeaway = defineTool({
    name: "record_takeaway",
    label: "Record takeaway",
    description:
      "Record the journalist's confirmed takeaway (Gate 1), word for word. The code checks it against the data and tells you whether it is supported; a contradicted takeaway must be corrected with the journalist or recorded with their override reason.",
    parameters: Type.Object({
      sentence: Type.String(),
      override: Type.Optional(Type.String()),
    }),
    async execute(_id, { sentence, override }) {
      // G1 records the journalist's sentence verbatim: a paraphrase they nodded at is not their takeaway.
      assertJournalistOwns("takeaway", sentence, dialogue, { acceptProposal: false });
      const profile = JSON.parse(
        readFileSync(join(bases.storyDir, "source", "profile.json"), "utf8"),
      );
      const csv = readFileSync(
        join(bases.storyDir, "source", "data.csv"),
        "utf8",
      );
      const resolved = resolveGrounding(sentence, profile, { csv });
      const grounding = groundingScalar(resolved, { override });
      await ensureFile();
      await mutateStoryboard(path, {
        topLevel: { takeaway: sentence, grounding },
      });
      if (allowedSlots.length === 1) {
        const slot = currentSlot(allowedSlots[0]);
        if (slot && !slot.proves) await mutateStoryboard(path, { slot: { id: allowedSlots[0], fields: { proves: sentence } } });
      }
      return text(
        `recorded takeaway; grounding: ${grounding} (${resolved.detail ?? ""}). ${await status()}`,
      );
    },
  });

  const recordHand = defineTool({
    name: "record_hand",
    label: "Record the journalist's hand",
    description: `Record one answer of the journalist's hand. field is one of: ${HAND.join(", ")}.`,
    parameters: Type.Object({ field: Type.String(), value: Type.String() }),
    async execute(_id, { field, value }) {
      if (!(HAND as readonly string[]).includes(field))
        throw new Error(`field must be one of ${HAND.join(", ")}`);
      if (!(field === "limits" && /^none$/i.test(value.trim())))
        assertJournalistOwns(field, value, dialogue);
      await ensureFile();
      await mutateStoryboard(path, { topLevel: { [field]: value } });
      return text(`recorded ${field}. ${await status()}`);
    },
  });

  const recordLanguage = defineTool({
    name: "record_language",
    label: "Record language",
    description:
      "Record the language the visual is written in (an ISO code such as en, fr, de).",
    parameters: Type.Object({ code: Type.String() }),
    async execute(_id, { code }) {
      if (!/^[a-z]{2}$/.test(code))
        throw new Error(
          `language must be a two-letter code, not ${JSON.stringify(code)}`,
        );
      await ensureFile();
      await mutateStoryboard(path, { topLevel: { language: code } });
      return text(`recorded language ${code}. ${await status()}`);
    },
  });

  const recordSlot = defineTool({
    name: "record_slot",
    label: "Record a slot field",
    description: `Record one field of a storyboard slot (slot is its id, e.g. "1"). The journalist chooses: ${JOURNALIST_SLOT_FIELDS.join(", ")}. You may refine: ${MODEL_SLOT_FIELDS.join(", ")} (the takeaway fills it). Candidates go through show_candidates. Recording format also records whether it is reachable; recording chosen also records the interaction its format promises.`,
    parameters: Type.Object({
      slot: Type.String(),
      field: Type.String(),
      value: Type.String(),
    }),
    async execute(_id, { slot, field, value }) {
      const all = [
        ...JOURNALIST_SLOT_FIELDS,
        ...MODEL_SLOT_FIELDS,
      ] as readonly string[];
      if (!all.includes(field))
        throw new Error(`field must be one of ${all.join(", ")}`);
      if (field === "chosen" && sameTreatment(value, dialogue.lastJournalist, String(currentSlot(slot)?.medium ?? "chart"))) {
        // The journalist named this treatment, in whatever spelling.
      } else if ((JOURNALIST_SLOT_FIELDS as readonly string[]).includes(field))
        assertJournalistOwns(field, value, dialogue);
      if (!allowedSlots.includes(slot)) {
        throw new Error(`this run produces slot(s) ${allowedSlots.join(", ")} only; record the journalist's answers on those`);
      }
      const medium = String(currentSlot(slot)?.medium ?? "chart");
      if (field === "chosen") value = canonicalTreatment(value, medium);
      if (field === "chosen") {
        const { meta } = existsSync(path) ? parseStoryboard(readFileSync(path, "utf8")) : { meta: { slots: [] as any[] } };
        const current = (meta.slots ?? []).find((s: { id: unknown }) => String(s.id) === slot);
        const candidates: string[] = Array.isArray(current?.candidates) ? current.candidates : [];
        if (!candidates.length) throw new Error("record the candidates you showed the journalist first (record_slot field candidates)");
        if (!candidates.some((c) => c.toLowerCase() === value.toLowerCase())) {
          throw new Error(`chosen must be one of the candidates you showed: ${candidates.join(", ")}`);
        }
      }
      await ensureSlot(slot);
      const fields: Record<string, unknown> = {
        [field]:
          field === "candidates"
            ? candidateList(value).map((c) => canonicalTreatment(c, medium))
            : value,
      };
      if (field === "chosen") {
        const format = currentSlot(slot)?.format;
        const [row] = format ? formatCandidateRows({ medium, candidates: [{ type: value, why: "chosen", format }] }) : [];
        if (row?.interaction?.kind) fields.interaction = row.interaction.kind;
      }
      if (field === "format") {
        const { meta } = parseStoryboard(readFileSync(path, "utf8"));
        const current =
          (meta.slots ?? []).find(
            (s: { id: unknown }) => String(s.id) === slot,
          ) ?? {};
        fields.reachable = confirmFormatReachable({
          medium: current.medium,
          format: value,
          treatment: current.chosen,
        });
      }
      await mutateStoryboard(path, { slot: { id: slot, fields } });
      return text(`recorded slot ${slot} ${field}. ${await status()}`);
    },
  });

  const showCandidates = defineTool({
    name: "show_candidates",
    label: "Build the candidates menu",
    description:
      "Build the menu of candidate treatments for a slot, after its medium and format are recorded: give at least two genuinely different chart types, each with why it fits THIS story. The code checks each against the catalogue, refuses two that are the same idea, records them, and returns the menu lines (purpose, what it is not for, the interaction it promises). Show those lines to the journalist and ask which one.",
    parameters: Type.Object({
      slot: Type.String(),
      candidates: Type.Array(Type.Object({ type: Type.String(), why: Type.String() })),
    }),
    async execute(_id, { slot, candidates }) {
      if (!allowedSlots.includes(slot)) throw new Error(`this run produces slot(s) ${allowedSlots.join(", ")} only`);
      const current = currentSlot(slot);
      if (!current?.medium || !current?.format) throw new Error("record the slot's medium and format with the journalist first");
      const medium = String(current.medium);
      const named = candidates.map((c) => ({ type: canonicalTreatment(c.type, medium), why: c.why, format: String(current.format) }));
      const profile = JSON.parse(readFileSync(join(bases.storyDir, "source", "profile.json"), "utf8"));
      const rows = formatCandidateRows({ medium, candidates: named, profile });
      await mutateStoryboard(path, { slot: { id: slot, fields: { candidates: named.map((c) => c.type) } } });
      return text(`recorded ${named.length} candidates for slot ${slot}. Show the journalist this menu, then ask which one:\n${rows.map((r: { line: string }) => r.line).join("\n")}`);
    },
  });

  const recordClaim = defineTool({
    name: "record_claim",
    label: "Record the claim's shape",
    description: `Record the shape of the takeaway's claim, as the journalist answered (the optional G1 question). shape is one of ${RECORDED_CLAIM_SHAPES.join(", ")}; column is the data column; entity the row the claim is about; for a comparison, versus is the other row and direction "greater" or "less".`,
    parameters: Type.Object({
      shape: Type.String(),
      column: Type.Optional(Type.String()),
      entity: Type.Optional(Type.String()),
      versus: Type.Optional(Type.String()),
      direction: Type.Optional(Type.String()),
    }),
    async execute(_id, { shape, column, entity, versus, direction }) {
      assertJournalistOwns("claim shape", shape, dialogue);
      const fields: Record<string, string> = { claimShape: shape };
      if (column) fields.claimColumn = column;
      if (entity) fields.claimEntity = entity;
      if (versus) fields.claimVersus = versus;
      if (direction) fields.claimDirection = direction;
      const gaps = recordedClaimGaps(fields);
      if (gaps.length) throw new Error(gaps.join("; "));
      const csv = readFileSync(join(bases.storyDir, "source", "data.csv"), "utf8");
      const header = csv.split(/\r?\n/)[0].split(",").map((c) => c.trim());
      if (column && !header.includes(column))
        throw new Error(`${JSON.stringify(column)} is not a column of source/data.csv; its columns are ${header.join(", ")}`);
      for (const name of [entity, versus].filter(Boolean) as string[]) {
        if (!csv.includes(name)) throw new Error(`${JSON.stringify(name)} is not a row in source/data.csv`);
      }
      await ensureFile();
      await mutateStoryboard(path, { topLevel: fields });
      return text(`recorded the claim shape (${shape}). ${await status()}`);
    },
  });

  const surveyed: { id: string; learns: string; medium: string; format: string }[] = [];
  const recordSubject = defineTool({
    name: "record_subject",
    label: "Record a surveyed subject",
    description:
      "Record one OTHER subject the data could support (movement 4, the survey): id (lowercase words joined by hyphens), learns (what the reader would learn, one sentence), medium, format. Call once per subject; at least one is needed to close the survey.",
    parameters: Type.Object({ id: Type.String(), learns: Type.String(), medium: Type.String(), format: Type.String() }),
    async execute(_id, subject) {
      const next = [...surveyed.filter((s) => s.id !== subject.id), subject];
      await recordSurveyedSubjects({ storyDir: bases.storyDir, subjects: next });
      surveyed.splice(0, surveyed.length, ...next);
      return text(`recorded ${surveyed.length} surveyed subject(s) in SUBJECTS.md.`);
    },
  });

  return { recordTakeaway, recordClaim, recordHand, recordLanguage, recordSlot, showCandidates, recordSubject };
}
