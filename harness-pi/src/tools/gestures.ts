// The craft step's staging as a typed record, not free code (Spotlight's report-draft pattern: the model sends a
// bounded JSON plan, code writes the file). The 12B declares its gestures through record_gestures; the schema's `do`
// is a closed enum of the gestures the kit draws. Names are a closed set held by code, not by the schema: llama-server
// did not constrain Gemma 4's tool arguments to an enum (measured: "Polska" against ["Poland", …], 3 of 3), and Pi
// copies and compiles a tool's schema once per session, so the names the beat draws — which change with beat.mjs —
// are listed in every beat.mjs write's result and checked here. An unknown name is refused with the closest drawn
// ones; a gesture refused twice for one is dropped and the rest recorded (Spotlight: back once, then marked). The
// list goes to beats/<id>/gestures.json, which the kit's importBeat merges into the beat.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defineTool } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import type { Bases } from "./fs.ts";

const SEP = " · ";
/** How many names a write's result lists (the rest are counted); code checks against all of them. */
export const MAX_LISTED = 80;

const fold = (v: string) => v.normalize("NFKC").trim().toLowerCase();

/** The names data.json can give a drawn row: its text values, its times, and time · entity pairs. */
export function dataNames(table: {
  columns: { name: string; type: string }[];
  rows: unknown[][];
}): string[] {
  const out = new Set<string>();
  const distinct = (i: number) => [
    ...new Set(
      table.rows
        .map((r) => r[i])
        .filter((v) => v !== null && v !== "")
        .map(String),
    ),
  ];
  const time = table.columns.findIndex((c) =>
    /^(year|ann[ée]e|jahr|rok|ano|año|anno|date|t|time|period|month)$/i.test(
      c.name,
    ),
  );
  const texts = table.columns
    .map((c, i) => ({ c, i }))
    .filter(({ c, i }) => i !== time && c.type !== "number");
  for (const { i } of texts)
    for (const v of distinct(i).slice(0, 300)) out.add(v);
  if (time >= 0) {
    for (const v of distinct(time)) out.add(v);
    const entity = texts.find(({ i }) => distinct(i).length > 1) ?? texts[0];
    if (entity)
      for (const r of table.rows)
        if (r[time] != null && r[entity.i] != null)
          out.add(`${r[time]}${SEP}${r[entity.i]}`);
  }
  return [...out];
}

/**
 * The names the beat as written draws, read from beat.mjs in a child process (the model's code never runs in the
 * harness): every name, series, key, label, entity or group its arrays hold, and key · series pairs.
 */
export function beatNames(beatDir: string): string[] | null {
  const script = `const { default: b } = await import(${JSON.stringify(join(beatDir, "beat.mjs"))} + "?t=" + Date.now());
const out = new Set();
const visit = (v, d) => {
  if (d > 4 || !v || typeof v !== "object") return;
  if (Array.isArray(v)) { for (const x of v.slice(0, 3000)) { if (typeof x === "string" || typeof x === "number") out.add(String(x)); else visit(x, d + 1); } return; }
  for (const k of ["name", "series", "key", "label", "entity", "group"]) if (typeof v[k] === "string" || typeof v[k] === "number") out.add(String(v[k]));
  if (v.series != null && (v.key ?? v.t) != null) out.add(String(v.key ?? v.t) + ${JSON.stringify(SEP)} + String(v.series));
  for (const [k, x] of Object.entries(v)) if (k !== "gestures" && typeof x === "object") visit(x, d + 1);
};
for (const [k, v] of Object.entries(b ?? {})) if (k !== "gestures" && typeof v === "object") visit(v, 0);
console.log(JSON.stringify([...out]));`;
  const res = Bun.spawnSync(["bun", "-e", script], {
    cwd: beatDir,
    timeout: 20_000,
  });
  if (res.exitCode !== 0) return null;
  try {
    const names = JSON.parse(
      res.stdout.toString().trim().split("\n").at(-1) ?? "[]",
    );
    return Array.isArray(names) && names.length ? names : null;
  } catch {
    return null;
  }
}

function closest(name: string, names: string[], n = 3): string[] {
  const a = fold(name);
  const score = (b: string) => {
    const f = fold(b);
    if (f.includes(a) || a.includes(f)) return 0;
    const m: number[] = Array.from({ length: f.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      let prev = m[0];
      m[0] = i;
      for (let j = 1; j <= f.length; j++) {
        const t = m[j];
        m[j] = Math.min(
          m[j] + 1,
          m[j - 1] + 1,
          prev + (a[i - 1] === f[j - 1] ? 0 : 1),
        );
        prev = t;
      }
    }
    return m[f.length] / Math.max(a.length, f.length, 1);
  };
  return [...names].sort((x, y) => score(x) - score(y)).slice(0, n);
}

/** The names as a write's result lists them. */
export function listNames(names: string[]): string {
  const shown = names
    .slice(0, MAX_LISTED)
    .map((n) => JSON.stringify(n))
    .join(", ");
  return names.length > MAX_LISTED
    ? `${shown} … and ${names.length - MAX_LISTED} more`
    : shown;
}

export interface GestureToolOptions {
  beat: string;
  /** The gestures this kit draws in this format. */
  gestures: string[];
  /** Renders the beat once the list is recorded (code renders, as Spotlight's finalize does); its text is returned. */
  render?: () => Promise<string>;
}

/** record_gestures, and refresh(): re-reads the names the beat draws (call it after beat.mjs changes). */
export function gestureTools(
  bases: Bases,
  { beat, gestures, render }: GestureToolOptions,
) {
  const beatDir = join(bases.storyDir, "beats", beat);
  const dataFile = join(beatDir, "data.json");
  const names: string[] = existsSync(dataFile)
    ? dataNames(JSON.parse(readFileSync(dataFile, "utf8")))
    : [];
  const refresh = (): string[] | null => {
    const drawn = beatNames(beatDir);
    if (drawn) names.splice(0, names.length, ...new Set([...drawn, "whole"]));
    return drawn;
  };
  // Refusals per gesture (by its position and do): the second for an unknown name drops it.
  const refusedOnce = new Set<string>();
  let last = "";

  const tool = defineTool({
    name: "record_gestures",
    label: "Record gestures",
    description:
      "Record the beat's staging: the ordered gestures list (CONTRACT.md's gestures table). Marks are named only from the names the beat draws — every beat.mjs write lists them. This replaces any gestures in beat.mjs; render with render_beat after.",
    parameters: Type.Object({
      gestures: Type.Array(
        Type.Object({
          do: Type.String({ enum: gestures }),
          mark: Type.Optional(Type.Union([Type.String(), Type.Array(Type.String())])),
          marks: Type.Optional(Type.Array(Type.String())),
          of: Type.Optional(
            Type.Union([Type.String(), Type.Array(Type.String())]),
          ),
          value: Type.Optional(Type.Union([Type.Number(), Type.String()])),
          note: Type.Optional(Type.String()),
          label: Type.Optional(Type.String()),
          card: Type.Optional(
            Type.Union([Type.String(), Type.Array(Type.String())]),
          ),
        }),
      ),
    }),
    async execute(_id, { gestures: list }) {
      if (!Array.isArray(list) || !list.length)
        throw new Error(
          'gestures: give at least one gesture, e.g. [{ do: "highlight", mark: "<a drawn name>" }]',
        );
      const known = new Set(names.map(fold));
      const dropped: string[] = [];
      const kept = list.filter((g, i) => {
        if (!gestures.includes(g.do))
          throw new Error(
            `gestures[${i}].do: "${g.do}" is not a gesture this kit draws — one of ${gestures.join(", ")}`,
          );
        const named = [
          ...(Array.isArray(g.mark) ? g.mark.map((m: string, k: number) => [`mark[${k}]`, m]) : g.mark !== undefined ? [["mark", g.mark]] : []),
          ...(g.marks ?? []).map((m: string, k: number) => [`marks[${k}]`, m]),
          ...(Array.isArray(g.of)
            ? g.of.map((m: string, k: number) => [`of[${k}]`, m])
            : []),
        ] as [string, string][];
        // A composed name ("Pologne · 2024": a row at one of its series) is known when each of its parts is.
        const knownName = (m: string) => known.has(fold(m)) || (m.includes(SEP.trim()) && m.split(SEP.trim()).every((p) => known.has(fold(p))));
        const unknown = named.find(([, m]) => known.size > 0 && !knownName(String(m)));
        if (!unknown) return true;
        const key = `${i}:${g.do}`;
        if (refusedOnce.has(key)) {
          dropped.push(`gestures[${i}] (${g.do} on "${unknown[1]}")`);
          return false;
        }
        refusedOnce.add(key);
        throw new Error(
          `gestures[${i}].${unknown[0]}: "${unknown[1]}" is not a name the beat draws — the closest are ${closest(
            String(unknown[1]),
            names,
          )
            .map((c) => JSON.stringify(c))
            .join(", ")}. A second unknown name drops this gesture.`,
        );
      });
      if (!kept.length)
        throw new Error(
          `every gesture named marks the beat does not draw; the names it draws: ${listNames(names)}`,
        );
      // The same list again changes nothing: a 12B recorded one list twenty times and never rendered.
      const signature = JSON.stringify(kept);
      if (signature === last && !render) throw new Error("this is the list already recorded: render it with render_beat, or change it");
      last = signature;
      writeFileSync(join(beatDir, "gestures.json"), `${JSON.stringify({ gestures: kept }, null, 2)}\n`);
      const rendered = render ? `\n${await render()}` : "";
      return {
        content: [
          {
            type: "text" as const,
            text: `recorded ${kept.length} gestures in beats/${beat}/gestures.json${dropped.length ? `; dropped ${dropped.join(", ")}, refused twice for a name the beat does not draw` : ""}${render ? "; rendered:" : "; render with render_beat"}${rendered}`,
          },
        ],
        details: {},
      };
    },
  });
  return { recordGestures: tool, refresh };
}
