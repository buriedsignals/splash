// The journalist at the other end of every gate: a person at the terminal, or, for evaluation and
// data generation, a scripted journalist whose answers are a story's sheet. The scripted one uses a
// model only to recognise WHICH question was asked; the answer is the sheet's own text, so it can
// never agree to a paraphrase of its own takeaway.
import { createInterface } from "node:readline/promises";

export interface Journalist {
  answer(said: string): Promise<string>;
}

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
  takeaway: "the one sentence the reader should keep",
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
    "a yes/no confirmation of a summary or proposal the desk already made",
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
    async answer(said) {
      const keys = Object.keys(SHEET_KEYS);
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
      const key = (body.choices?.[0]?.message?.content ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z]/g, "");
      const answer =
        sheet[key as keyof Sheet] ?? sheet.other ?? "I don't know.";
      log.push({ said: said.slice(-300), key, answer });
      return answer;
    },
  };
}
