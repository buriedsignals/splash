// Hierarchical narrow choice: a coarse family (the journalist's existing answer, simulated as the family of the
// gold type's best-ranked intent) -> student picks ONE intent inside that family (2-5 options) -> student picks the
// type among that intent's table rows given use-when / not-when. Each step measured on its own.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const H = join(import.meta.dir, "../..");
const [model, reps = "3", out] = process.argv.slice(2);
const md = readFileSync(join(H, "../skills/storyboard/references/chart-choice.md"), "utf8");
type T = { slug: string; name: string; use: string; not: string };
const intents: { title: string; types: T[] }[] = [];
for (const block of md.split(/^## Intent: /m).slice(1)) {
  const title = block.split("\n")[0].trim();
  const types = [...block.matchAll(/^\| \d+ \| \[([^\]]+)\]\([^)]*types\/([a-z-]+)\.md\) \| (.*?) \| (.*?) \|/gm)].map((m) => ({ name: m[1], slug: m[2], use: m[3], not: m[4] }));
  intents.push({ title, types });
}
// coarse families, intent numbers 1-based as listed in chart-choice.md
const FAMILIES: Record<string, number[]> = {
  "compare categories": [1, 2, 3, 12, 13],
  "change over time": [4, 5, 6, 7, 8],
  "distribution": [9, 10],
  "relationship": [7, 11],
  "part-to-whole": [14, 15],
  "sequence or flow": [16, 20],
  "location": [17, 18, 19, 20],
};
const catalogue = new Set(intents.flatMap((i) => i.types.map((t) => t.slug)));
const toSheet = (seed: string) => [...catalogue].sort((a, b) => b.length - a.length).find((s) => seed === s || seed.startsWith(`${s}-`) || seed.replaceAll("-", "") === s);
const fm = (t: string, k: string) => (t.match(new RegExp(`^\\s*${k}: "?(.*?)"?$`, "m")) ?? [])[1] ?? "";
function dataLine(dir: string) {
  const d = JSON.parse(readFileSync(join(dir, "beats/1/data.json"), "utf8"));
  const cols = d.columns.map((c: { name: string; type: string }, i: number) => `${c.name} (${c.type}, ${new Set(d.rows.map((r: unknown[]) => r[i])).size} distinct)`);
  return `${d.rows.length} rows; columns: ${cols.join(", ")}`;
}
async function ask(prompt: string) {
  const body: Record<string, unknown> = { model, messages: [{ role: "user", content: prompt }], max_tokens: 200, temperature: model.includes("qwen") ? 0.7 : 1, top_p: model.includes("qwen") ? 0.8 : 0.95 };
  if (model.includes("qwen")) body.chat_template_kwargs = { enable_thinking: false };
  const r = await fetch("http://127.0.0.1:1337/v1/chat/completions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = (await r.json()) as { choices?: { message: { content: string } }[] };
  return j.choices?.[0]?.message?.content ?? "";
}
const json = (s: string) => { try { return JSON.parse((s.match(/\{[\s\S]*\}/) ?? ["{}"])[0]); } catch { return {}; } };
const rows: unknown[] = [];
for (const seed of readdirSync(join(H, "eval/seeds")).filter((s) => s.startsWith("gx-") && !s.includes("."))) {
  const dir = join(H, "eval/seeds", seed);
  const sb = readFileSync(join(dir, "STORYBOARD.md"), "utf8");
  const gold = toSheet(seed.slice(3))!;
  const goldIntents = intents.map((i, n) => (i.types.some((t) => t.slug === gold) ? n + 1 : 0)).filter(Boolean);
  const rank = (n: number) => intents[n - 1].types.findIndex((t) => t.slug === gold);
  const best = [...goldIntents].sort((a, b) => rank(a) - rank(b))[0];
  const family = Object.entries(FAMILIES).find(([, ns]) => ns.includes(best))!;
  const story = `Takeaway: ${fm(sb, "takeaway")}\nSubject: ${fm(sb, "subject")}\nCompared against: ${fm(sb, "comparison")}\nLimits: ${fm(sb, "limits")}\nData: ${dataLine(dir)}\nThe journalist said the chart is about: ${family[0]}.`;
  const table = intents[best - 1].types;
  for (let k = 0; k < Number(reps); k++) {
    const opts = family[1];
    const a = json(await ask(`${story}\n\nWhat must the reader see? Pick ONE:\n${opts.map((n, i) => `${i + 1}. ${intents[n - 1].title}`).join("\n")}\nAnswer only JSON: {"pick": <number>}`));
    const intent = opts[Number(a.pick) - 1] ?? null;
    const b = json(await ask(`${story}\nThe reader must ${intents[best - 1].title}.\n\nChart types for that (use when / not when):\n${table.map((t, i) => `${i + 1}. ${t.name} — use when: ${t.use} Not when: ${t.not}`).join("\n")}\nWhich fits this takeaway and data best, then second best? Answer only JSON: {"picks": [<number>, <number>]}`));
    const picks = ((b.picks ?? []) as number[]).map((p) => table[Number(p) - 1]?.slug ?? `?${p}`);
    const row = { seed, gold, family: family[0], options: opts.length, best, intent, intentHit: goldIntents.includes(Number(intent)), tableSize: table.length, goldRank: rank(best) + 1, picks, typeTop1: picks[0] === gold, typeTop2: picks.slice(0, 2).includes(gold) };
    rows.push(row);
    console.log(JSON.stringify(row));
  }
}
if (out) writeFileSync(out, JSON.stringify(rows, null, 1));
