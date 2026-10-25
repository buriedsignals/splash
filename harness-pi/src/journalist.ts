// The journalist at the other end of every gate: a person at the terminal, or, for evaluation and
// data generation, a scripted journalist whose answers are a story's sheet. The scripted one uses a
// model only to recognise WHICH question was asked; the answer is the sheet's own text, so it can
// never agree to a paraphrase of its own takeaway.
import { createInterface } from "node:readline/promises";

export interface Journalist {
  answer(said: string): Promise<string>;
  /** The phase the driver is in, so a scripted journalist never answers a later gate early. */
  phase?: string;
}

/** Sheet keys that only make sense after the storyboard: a question in an earlier phase is never one of them. */
const LATER_KEYS: Record<string, string[]> = {
  storyboard: ["approval", "delivery", "closing"],
  framing: ["approval", "delivery", "closing"],
};

export const humanJournalist = (): Journalist => ({
  async answer(said) {
    console.log(`\n${said}\n`);
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    try {
      return (await rl.question("> ")).trim();
    } finally {
      rl.close();
    }
  },
});

/** The keys a sheet may answer, and what each means to the classifier. */
export const SHEET_KEYS: Record<string, string> = {
  restitution: "whether the desk read the article correctly",
  takeaway:
    "the one sentence the reader should keep — also when the desk asks which framing or claim should guide the story, or asks to confirm a takeaway sentence it proposed",
  claim:
    "maximum/minimum/comparison/total shape of the claim, and which column",
  subject: "who or what the piece is about",
  comparison: "what the reader compares it to",
  limits: "what the data does NOT let you conclude",
  placement: "where in the article the graphic goes",
  credit: "who the data comes from, its credit and as-of date",
  language: "which language the visual is written in",
  medium: "chart, map or image",
  publication:
    "which publication format (static, interactive web, video, scrollytelling)",
  size: "landscape, square or portrait",
  intent:
    "the narrow intent (comparison between categories, change over time...)",
  reference: "whether a reference example is wanted",
  palette: "which colours",
  treatment: "which chart type or candidate",
  producer: "Datawrapper or custom",
  approval: "whether the rendered visual is approved",
  delivery:
    "which delivery form of an approved file (owned-file, source bundle, embed, CMS)",
  closing: "another format or another subject at the end",
  confirm:
    "a yes/no confirmation of a summary or proposal the desk already made, other than a takeaway sentence",
  other: "anything else",
};

export type Sheet = Partial<Record<keyof typeof SHEET_KEYS, string>>;

export function scriptedJournalist(
  sheet: Sheet,
  { server = "http://127.0.0.1:8090" } = {},
): Journalist & {
  log: { said: string; key: string; answer: string }[];
} {
  const log: { said: string; key: string; answer: string }[] = [];
  return {
    log,
    phase: undefined as string | undefined,
    async answer(said) {
      const excluded = LATER_KEYS[this.phase ?? ""] ?? [];
      const keys = Object.keys(SHEET_KEYS).filter((k) => !excluded.includes(k));
      const res = await fetch(`${server}/v1/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          temperature: 0,
          seed: 7,
          max_tokens: 8,
          chat_template_kwargs: { enable_thinking: false },
          messages: [
            {
              role: "system",
              content: `Classify the LAST question a visual-desk tool asks a journalist. Reply with exactly one word from this list: ${keys
                .map((k) => `${k} (${SHEET_KEYS[k]})`)
                .join("; ")}.`,
            },
            { role: "user", content: said.slice(-1500) },
          ],
        }),
      });
      const body = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      // The closing offers name themselves; the classifier read "another format" as the publication
      // format question and answered "Static." to it.
      const closing = /\b(another|other) (publication )?format\b|\b(another|other) subjects?\b/i.test(said.slice(-1500));
      const classified = (body.choices?.[0]?.message?.content ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z]/g, "");
      const key = closing && !excluded.includes("closing") ? "closing" : keys.includes(classified) ? classified : "other";
      // A journalist never agrees to a takeaway that is not theirs: asked to confirm one the desk
      // wrote, the sheet's journalist answers with their own sentence.
      const proposesTakeaway =
        key === "confirm" &&
        /\btakeaway\b|\bsentence\b|\bframing\b/i.test(said) &&
        sheet.takeaway &&
        !said.includes(sheet.takeaway);
      const answer = proposesTakeaway
        ? `No. My takeaway is: ${sheet.takeaway}`
        : (sheet[key as keyof Sheet] ?? sheet.other ?? "I don't know.");
      log.push({ said: said.slice(-300), key, answer });
      return answer;
    },
  };
}
