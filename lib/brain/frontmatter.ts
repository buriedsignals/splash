// A frontmatter reader for the FLAT subset the KB sheets use: scalars, inline lists
// [a, b], dash lists, inline maps { a: 1 }, and one level of nested `key:` → `sub: value`.
// It THROWS on anything else instead of guessing. The project has no YAML dependency and
// adding one to read five shapes would be the wrong trade; more importantly, a parser that
// silently ignored a construct would silently drop a facet, and a dropped facet is a form
// the journalist never gets offered (spec §10).
export type Frontmatter = { data: Record<string, unknown>; body: string };

export function splitFrontmatter(raw: string): Frontmatter {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!m) throw new Error("frontmatter: sheet has no --- header block");
  return { data: parseBlock(m[1]), body: raw.slice(m[0].length) };
}

function parseBlock(block: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const lines = block.split(/\r?\n/);
  let key: string | null = null;
  let list: string[] | null = null;
  let map: Record<string, unknown> | null = null;

  const flush = () => {
    if (key == null) return;
    if (list) out[key] = list;
    else if (map) out[key] = map;
    key = null;
    list = null;
    map = null;
  };

  for (const line of lines) {
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    const indented = /^\s/.test(line);
    const t = line.trim();

    if (indented && t.startsWith("- ")) {
      if (!key) throw new Error(`frontmatter: list item outside a key: ${t}`);
      if (map) throw new Error(`frontmatter: unsupported construct: ${t}`);
      (list ??= []).push(scalar(t.slice(2)) as string);
      continue;
    }
    if (indented) {
      const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(t);
      if (!kv || kv[2] === "")
        throw new Error(`frontmatter: unsupported construct: ${t}`);
      if (!key)
        throw new Error(`frontmatter: nested value outside a key: ${t}`);
      if (list) throw new Error(`frontmatter: unsupported construct: ${t}`);
      (map ??= {})[kv[1]] = scalar(kv[2]);
      continue;
    }

    flush();
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(t);
    if (!kv) throw new Error(`frontmatter: unsupported construct: ${t}`);
    if (kv[2] === "") key = kv[1];
    else out[kv[1]] = value(kv[2]);
  }
  flush();
  return out;
}

function value(v: string): unknown {
  const s = v.trim();
  if (s.startsWith("[") && s.endsWith("]"))
    return splitTop(s.slice(1, -1)).map(scalar);
  if (s.startsWith("{") && s.endsWith("}")) {
    const out: Record<string, unknown> = {};
    for (const pair of splitTop(s.slice(1, -1))) {
      const kv = /^([A-Za-z0-9_-]+):\s*(.+)$/.exec(pair.trim());
      if (!kv) throw new Error(`frontmatter: unsupported map entry: ${pair}`);
      out[kv[1]] = scalar(kv[2]);
    }
    return out;
  }
  return scalar(s);
}

// Commas inside quotes are content, not separators.
function splitTop(s: string): string[] {
  const parts: string[] = [];
  let buf = "";
  let quote: string | null = null;
  for (const ch of s) {
    if (quote) {
      if (ch === quote) quote = null;
      buf += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      buf += ch;
    } else if (ch === ",") {
      parts.push(buf);
      buf = "";
    } else buf += ch;
  }
  if (buf.trim() !== "") parts.push(buf);
  return parts.map((p) => p.trim()).filter((p) => p !== "");
}

function scalar(v: string): string | number | boolean {
  const s = v.trim().replace(/^["'](.*)["']$/s, "$1");
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (s === "true") return true;
  if (s === "false") return false;
  return s;
}
