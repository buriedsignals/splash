// Chart-type choice probe: FREE (student names two types from the catalogue) vs NARROW (student names one intent of
// chart-choice.md; code ranks that intent's table). Gold = the type each gx seed story was written for.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const H = join(import.meta.dir, "../..");
const [model, reps = "2", out] = process.argv.slice(2);
const md = readFileSync(join(H, "../skills/storyboard/references/chart-choice.md"), "utf8");
const intents: { title: string; types: { slug: string; name: string }[] }[] = [];
for (const block of md.split(/^## Intent: /m).slice(1)) {
  const title = block.split("\n")[0].trim();
  const types = [...block.matchAll(/^\| \d+ \| \[([^\]]+)\]\([^)]*types\/([a-z-]+)\.md\)/gm)].map((m) => ({ name: m[1], slug: m[2] }));
  intents.push({ title, types });
}
const catalogue = new Map<string, string>();
for (const i of intents) for (const t of i.types) catalogue.set(t.slug, t.name);
const toSheet = (seed: string) => [...catalogue.keys()].sort((a, b) => b.length - a.length).find((s) => seed === s || seed.startsWith(`${s}-`) || seed.replaceAll("-", "") === s);
const fm = (t: string, k: string) => (t.match(new RegExp(`^\\s*${k}: "?(.*?)"?$`, "m")) ?? [])[1] ?? "";
function dataLine(dir: string) {
  const d = JSON.parse(readFileSync(join(dir, "beats/1/data.json"), "utf8"));
  const cols = d.columns.map((c: { name: string; type: string }, i: number) => {
    const distinct = new Set(d.rows.map((r: unknown[]) => r[i])).size;
    return `${c.name} (${c.type}, ${distinct} distinct)`;
  });
  return `${d.rows.length} rows; columns: ${cols.join(", ")}`;
}
async function ask(prompt: string) {
  const body: Record<string, unknown> = { model, messages: [{ role: "user", content: prompt }], max_tokens: 300, temperature: model.includes("qwen") ? 0.7 : 1, top_p: model.includes("qwen") ? 0.8 : 0.95 };
  if (model.includes("qwen")) body.chat_template_kwargs = { enable_thinking: false };
  const r = await fetch("http://127.0.0.1:1337/v1/chat/completions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = (await r.json()) as { choices?: { message: { content: string } }[] };
  return j.choices?.[0]?.message?.content ?? JSON.stringify(j).slice(0, 200);
}
const json = (s: string) => { try { return JSON.parse((s.match(/\{[\s\S]*\}/) ?? ["{}"])[0]); } catch { return {}; } };
const names = [...catalogue.entries()];
const rows: unknown[] = [];
for (const seed of readdirSync(join(H, "eval/seeds")).filter((s) => s.startsWith("gx-") && !s.includes("."))) {
  const dir = join(H, "eval/seeds", seed);
  const sb = readFileSync(join(dir, "STORYBOARD.md"), "utf8");
  const gold = toSheet(seed.slice(3));
  const story = `Takeaway: ${fm(sb, "takeaway")}\nSubject: ${fm(sb, "subject")}\nCompared against: ${fm(sb, "comparison")}\nLimits: ${fm(sb, "limits")}\nData: ${dataLine(dir)}`;
  for (let k = 0; k < Number(reps); k++) {
    const free = json(await ask(`${story}\n\nChart types: ${names.map(([, n]) => n).join("; ")}.\nWhich two chart types from that list best show this takeaway to a newspaper reader, best first? Answer only JSON: {"types": ["<name>", "<name>"]}`));
    const freeSlugs = ((free.types ?? []) as string[]).map((n) => (names.find(([, m]) => m.toLowerCase() === String(n).toLowerCase()) ?? names.find(([, m]) => m.toLowerCase().split(/ and | \/ /).includes(String(n).toLowerCase())))?.[0] ?? `?${n}`);
    const nar = json(await ask(`${story}\n\nWhat does the reader need to see? Pick the ONE intent below that this takeaway expresses.\n${intents.map((i, n) => `${n + 1}. ${i.title}`).join("\n")}\nAnswer only JSON: {"intent": <number>}`));
    const narJ = json(await ask(`${story}\nThe journalist described the intent as: ${fm(sb, "intent")}\n\nWhat does the reader need to see? Pick the ONE intent below that this takeaway expresses.\n${intents.map((i, n) => `${n + 1}. ${i.title}`).join("\n")}\nAnswer only JSON: {"intent": <number>}`));
    const pick = intents[Number(nar.intent) - 1];
    const ranked = pick?.types.map((t) => t.slug) ?? [];
    const goldIntents = intents.map((i, n) => (i.types.some((t) => t.slug === gold) ? n + 1 : 0)).filter(Boolean);
    const row = { seed, gold, rep: k, free: freeSlugs, freeHit: freeSlugs.slice(0, 2).includes(gold!), freeTop: freeSlugs[0] === gold, intent: nar.intent ?? null, goldIntents, intentHit: goldIntents.includes(Number(nar.intent)), narrowTop2: ranked.slice(0, 2).includes(gold!), narrowTop1: ranked[0] === gold, narrowAny: ranked.includes(gold!), intentJ: narJ.intent ?? null, intentJHit: goldIntents.includes(Number(narJ.intent)) };
    rows.push(row);
    console.log(JSON.stringify(row));
  }
}
if (out) writeFileSync(out, JSON.stringify(rows, null, 1));
