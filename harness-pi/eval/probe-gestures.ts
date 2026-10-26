// The composition probe (U10): before any gesture kit renders, does the local 12B compose an admissible,
// claim-serving gesture list? Each story gets the takeaway, the journalist's subject and comparison answers, the
// rows the bar plate draws and the draft static contract, and is asked for the `gestures` field only. The gesture
// core validates; a refusal goes back in the same conversation, within the craft budget (3 attempts, 20 minutes).
// Local server only (SPLASH_PORT); one story at a time.
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  GestureRefusal,
  validateGestures,
} from "../craft/_shared/gesture-core.mjs";
import { admissible } from "../craft/_shared/gesture-registry.mjs";

const CHECKOUT = resolve(import.meta.dirname, "..", "..");
const SERVER = `http://127.0.0.1:${process.env.SPLASH_PORT ?? "8090"}`;
const ATTEMPTS = 3;
const BUDGET_MS = 20 * 60_000;

type Row = { name: string; value: number };
type Gesture = {
  do: string;
  mark?: string;
  marks?: string[];
  of?: string | string[];
  note?: string;
  value?: unknown;
};

function csv(slug: string): string[][] {
  return readFileSync(
    join(CHECKOUT, "stories", slug, "source", "data.csv"),
    "utf8",
  )
    .trim()
    .split(/\r?\n/)
    .map((l) => l.split(","));
}

/** The rows each story's bar plate draws, in the unit it prints, largest first. */
export const STORIES: Record<
  string,
  {
    sheet: string;
    unit: string;
    rows: () => Row[];
    halves: [string, (g: Gesture[]) => boolean][];
  }
> = {
  "stress-p-transport-ridership": {
    sheet: "stress-p-transport-ridership.json",
    unit: "million trips in 2025",
    rows: () =>
      csv("stress-p-transport-ridership")
        .slice(1)
        .map((c) => ({ name: c[0], value: Number(c[1]) }))
        .sort((a, b) => b.value - a.value),
    halves: [
      [
        "share of the whole",
        (g) =>
          g.some(
            (x) =>
              x.do === "bracket" &&
              (x.of === "whole" || /394/.test(x.note ?? "")),
          ),
      ],
      [
        "ratio to Porto",
        (g) =>
          g.some(
            (x) =>
              x.do === "compare" &&
              [x.mark, ...(x.marks ?? [])].includes("Porto"),
          ),
      ],
    ],
  },
  "stress-v-top-emitters": {
    sheet: "stress-v-top-emitters.json",
    unit: "billion tonnes of CO₂ in 2024 (Gt)",
    rows: () =>
      csv("stress-v-top-emitters")
        .slice(1)
        .filter((c) => /^[A-Z]{3}$/.test(c[1]))
        .map((c) => ({
          name: c[0],
          value: Math.round(Number(c[3]) / 1e7) / 100,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10),
    halves: [
      [
        "China against the next five together",
        (g) =>
          g.some(
            (x) =>
              (x.do === "compare" || x.do === "bracket") &&
              [x.marks ?? [], Array.isArray(x.of) ? x.of : []]
                .flat()
                .filter((m) =>
                  [
                    "United States",
                    "India",
                    "Russia",
                    "Japan",
                    "Indonesia",
                  ].includes(m),
                ).length >= 5,
          ),
      ],
    ],
  },
  "stress-q-safety-incidents": {
    sheet: "stress-q-safety-incidents.json",
    unit: "incidents per 100,000 residents",
    rows: () =>
      csv("stress-q-safety-incidents")
        .slice(1)
        .map((c) => ({
          name: c[0],
          value: Math.round((Number(c[1]) / Number(c[2])) * 1e5),
        }))
        .sort((a, b) => b.value - a.value),
    halves: [
      [
        "Sul against Centro",
        (g) =>
          g.some(
            (x) =>
              x.do === "compare" &&
              ["Sul", "Centro"].every((m) =>
                [x.mark, ...(x.marks ?? [])].includes(m),
              ),
          ),
      ],
    ],
  },
  "stress-ad-polish-hospital-beds": {
    sheet: "stress-ad-polish-hospital-beds.json",
    unit: "hospital beds per 1,000 residents",
    rows: () =>
      csv("stress-ad-polish-hospital-beds")
        .slice(1)
        .map((c) => ({
          name: c[0],
          value: Math.round((Number(c[1]) / Number(c[2])) * 1e5) / 100,
        }))
        .sort((a, b) => b.value - a.value),
    halves: [
      [
        "Mazowieckie against the two ahead",
        (g) =>
          g.some((x) =>
            [
              x.mark,
              ...(x.marks ?? []),
              ...(Array.isArray(x.of) ? x.of : []),
            ].includes("Mazowieckie"),
          ) &&
          g.some((x) =>
            [x.mark, ...(x.marks ?? [])].some(
              (m) => m === "Śląskie" || m === "Łódzkie",
            ),
          ),
      ],
    ],
  },
};

const RUNS = [
  "stress-p-transport-ridership",
  "stress-p-transport-ridership",
  "stress-q-safety-incidents",
  "stress-q-safety-incidents",
  "stress-ad-polish-hospital-beds",
  "stress-ad-polish-hospital-beds",
  "stress-ad-polish-hospital-beds",
  "stress-v-top-emitters",
];

function contract(): string {
  const table = admissible("length", "static")
    .map((a: { do: string; meaning: string }) => `| \`${a.do}\` | ${a.meaning} |`)
    .join("\n");
  return readFileSync(
    join(
      CHECKOUT,
      "harness-pi",
      "craft",
      "static",
      "bar-and-column.gestures",
      "CONTRACT.md",
    ),
    "utf8",
  ).replace("{{GESTURES}}", table);
}

/** The list the reply carries: the first JSON array in it, with bare keys quoted. Never evaluated as code. */
function parseList(reply: string): Gesture[] {
  const start = reply.indexOf("[");
  const end = reply.lastIndexOf("]");
  if (start < 0 || end < start) throw new Error("no array");
  const text = reply
    .slice(start, end + 1)
    .replace(/([{,]\s*)([A-Za-z_][\w-]*)\s*:/g, '$1"$2":');
  return JSON.parse(text);
}

async function chat(
  messages: { role: string; content: string }[],
): Promise<string> {
  const res = await fetch(`${SERVER}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages, max_tokens: 2000 }),
    signal: AbortSignal.timeout(10 * 60_000),
  });
  if (!res.ok) throw new Error(`server ${res.status}`);
  const body = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return body.choices[0].message.content ?? "";
}

export async function probe(slug: string) {
  const story = STORIES[slug];
  const sheet = JSON.parse(
    readFileSync(
      join(CHECKOUT, "harness-pi", "eval", "sheets", story.sheet),
      "utf8",
    ),
  );
  const claim = {
    takeaway: sheet.takeaway,
    subject: sheet.subject,
    comparison: sheet.comparison,
  };
  const rows = story.rows();
  const messages = [
    {
      role: "system",
      content: `You write the staging of one bar chart for a newsroom.\n\n${contract()}`,
    },
    {
      role: "user",
      content:
        `The journalist's confirmed takeaway: ${claim.takeaway}\nThe subject, in their words: ${claim.subject}\nThe comparison, in their words: ${claim.comparison}\n\n` +
        `The rows the plate draws (${story.unit}):\n${rows.map((r) => `- ${r.name}: ${r.value}`).join("\n")}\n\n` +
        "Write the `gestures` field for this story. Reply with the JSON array only.",
    },
  ];
  const started = Date.now();
  const chain: string[] = [];
  let final: Gesture[] | null = null;
  let attempts = 0;
  let firstTry = false;
  while (attempts < ATTEMPTS && Date.now() - started < BUDGET_MS) {
    attempts++;
    const reply = await chat(messages);
    messages.push({ role: "assistant", content: reply });
    let list: Gesture[];
    try {
      list = parseList(reply);
    } catch {
      chain.push("not a JSON array");
      messages.push({
        role: "user",
        content:
          "[harness] Reply with the JSON array of gestures only, nothing else.",
      });
      continue;
    }
    try {
      validateGestures({
        gestures: list,
        rows,
        family: "length",
        format: "static",
        claim,
      });
      final = list;
      firstTry = attempts === 1;
      break;
    } catch (error) {
      if (!(error instanceof GestureRefusal)) throw error;
      chain.push(error.field);
      messages.push({
        role: "user",
        content: `[harness] REFUSED — ${error.message} Reply with the corrected JSON array only.`,
      });
    }
  }
  const halves = story.halves.map(
    ([name, test]) => [name, final ? test(final) : false] as const,
  );
  return {
    slug,
    accepted: Boolean(final),
    firstTry,
    attempts,
    chain,
    seconds: Math.round((Date.now() - started) / 1000),
    final,
    halves,
  };
}

if (import.meta.main) {
  const out = join(CHECKOUT, "harness-pi", "eval", "results");
  mkdirSync(out, { recursive: true });
  const file = join(
    out,
    `probe-gestures-${new Date().toISOString().slice(0, 10)}.jsonl`,
  );
  for (const slug of process.argv.slice(2).length
    ? process.argv.slice(2)
    : RUNS) {
    const r = await probe(slug);
    appendFileSync(file, `${JSON.stringify(r)}\n`);
    console.log(
      `${slug}: ${r.accepted ? "accepted" : "REFUSED"} in ${r.attempts} attempt(s), ${r.seconds}s; chain ${r.chain.join(" → ") || "none"}; ${r.halves.map(([n, ok]) => `${n} ${ok ? "✓" : "✗"}`).join(", ")}`,
    );
    if (r.final) console.log(`  ${JSON.stringify(r.final)}`);
  }
}
