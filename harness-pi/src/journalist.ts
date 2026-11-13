// The journalist at the other end of every gate: a person at the terminal, or, for evaluation and
// data generation, a scripted journalist whose answers are a story's sheet. The scripted one uses a
// model only to recognise WHICH question was asked; the answer is the sheet's own text, so it can
// never agree to a paraphrase of its own takeaway.
import { createInterface } from "node:readline/promises";
import { LOCAL_SERVER } from "./pi.ts";

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
  { server = LOCAL_SERVER, timeoutMs = 120_000 } = {},
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
      // Osaurus once held this request open with no model loaded (stress-v, 2026-11-13): the run sat ten minutes
      // after its storyboard stopped. A hung classification is asked once more, then read as "other".
      const ask = (): Promise<Response> => fetch(`${server}/v1/chat/completions`, {
        signal: AbortSignal.timeout(timeoutMs),
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          // llama-server ignores the name; Osaurus refuses a request without one ("Invalid request format").
          model: process.env.SPLASH_LOCAL_MODEL ?? "gemma-4-12b",
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
      const body = (await ask()
        .catch(() => ask())
        .then((r) => r.json())
        .catch(() => ({}))) as {
        choices?: { message?: { content?: string } }[];
      };
      // The closing offers name themselves; the classifier read "another format" as the publication
      // format question and answered "Static." to it.
      const closing =
        /\b(another|other) (publication )?format\b|\b(another|other) subjects?\b/i.test(
          said.slice(-1500),
        );
      const classified = (body.choices?.[0]?.message?.content ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z]/g, "");
      // The candidate menu ("- **Name** (format) — …", then "Which one do you keep?") and the survey's offer of
      // additional subjects also name themselves: the classifier read the menu's "keep" as the takeaway question
      // and the survey as the subject question (gx-connected-scatter, 2026-11-11: ten minutes of storyboard lost).
      const tail = said.slice(-1500);
      const menu =
        (tail.match(/^\s*- \*\*[^*\n]+\*\* \(/gm)?.length ?? 0) >= 2 &&
        /\bwhich (one|treatment|chart|candidate)\b/i.test(tail.slice(-200));
      const survey =
        /\b(additional|extra|other) (subjects?|angles?)\b/i.test(tail) && !menu;
      // The format and size questions name their options; the classifier read "Static, interactive web, video or
      // scrollytelling?" after "for a chart" as the medium question and answered "A chart." (stress-ad, 2026-11-13).
      const asked = tail.slice(-300);
      const options = /\bstatic\b[^?]*\bvideo\b[^?]*\bscroll/i.test(asked)
        ? "publication"
        : /\blandscape\b[^?]*\bsquare\b[^?]*\bportrait\b/i.test(asked)
          ? "size"
          : undefined;
      const key =
        closing && !excluded.includes("closing")
          ? "closing"
          : options && keys.includes(options)
            ? options
          : menu && keys.includes("treatment")
            ? "treatment"
            : survey
              ? "survey"
              : keys.includes(classified)
                ? classified
                : "other";
      // A journalist never agrees to a takeaway that is not theirs: asked to confirm one the desk
      // wrote, the sheet's journalist answers with their own sentence.
      // A survey subject the desk proposes is not a takeaway: confirming it with the takeaway rebuttal kept
      // the survey open until the step stopped (stress-v, 2026-11-12).
      const proposesTakeaway =
        key === "confirm" &&
        !/\bsurvey\b/i.test(tail.slice(-300)) &&
        /\btakeaway\b|\bsentence\b|\bframing\b/i.test(said) &&
        sheet.takeaway &&
        !said.includes(sheet.takeaway);
      // A credit the desk proposes is answered the same way: "Yes." to "unattributed" erased the sheet's source
      // (stress-v, 2026-11-13). The sheet's credit is its own when its first words appear in the proposal.
      const creditHead = (sheet.credit ?? "").split(/[,.]/)[0].trim().toLowerCase();
      const proposesCredit =
        key === "confirm" &&
        /\b(credit|source|attribut)/i.test(tail.slice(-400)) &&
        creditHead.length > 0 &&
        !tail.toLowerCase().includes(creditHead);
      const answer = proposesTakeaway
        ? `No. My takeaway is: ${sheet.takeaway}`
        : proposesCredit
          ? `No. ${sheet.credit}`
        : key === "survey"
          ? (sheet.closing ?? "No, thank you.")
          : (sheet[key as keyof Sheet] ?? sheet.other ?? "I don't know.");
      log.push({ said: said.slice(-300), key, answer });
      return answer;
    },
  };
}
