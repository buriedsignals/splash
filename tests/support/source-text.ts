// Test support: reading source text as code, without its prose. A guard that scans raw text is
// satisfied or tripped by a comment QUOTING the shape it bans — this corpus quotes its own repairs,
// hexes and greps in comments on purpose — so every such guard strips comments first. Four
// strippers, because they answer different questions; pick by what the guard compares.

/**
 * Regex strip: block comments become `blockAs` (default nothing), then a `//` comment to the end of
 * its line — except a `//` right after `:`, which is a URL (`https://…`), not a comment. Not
 * string-aware: a `//` inside a string literal that is not preceded by `:` is cut.
 */
export function codeOf(text: string, blockAs = ""): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, blockAs)
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/**
 * Whole-line `//` comments and `/* … *\/` blocks only, for guards that compare two copies of code.
 * A copy legitimately carries different explanatory prose, and reporting that as drift is noise;
 * a trailing `//` after code is deliberately kept, because a URL or a divided expression could
 * contain one, and eating code would make the comparison vacuously equal on both sides.
 */
export function stripWholeLineComments(source: string): string {
  return source
    .replace(/^[ \t]*\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * String-aware strip: `//` and block comments removed, string and template literals kept verbatim
 * (a naive strip cuts every `source:` credit in half at the `//` of a URL). A block comment keeps
 * its newlines, so a line number read off the result is the source's own line number.
 */
export function stripCommentsKeepingLines(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`") {
      const q = c;
      out += c;
      i++;
      while (i < src.length) {
        if (src[i] === "\\") {
          out += src[i] + (src[i + 1] ?? "");
          i += 2;
          continue;
        }
        out += src[i];
        if (src[i] === q) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) {
        if (src[i] === "\n") out += "\n";
        i++;
      }
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/**
 * String-aware strip that drops a block comment whole, newlines included — for guards that read
 * what the code says, not where it says it. String literals are preserved untouched.
 */
export function stripComments(src: string): string {
  let out = "";
  const n = src.length;
  let i = 0;
  while (i < n) {
    const c = src[i];
    const next = src[i + 1];
    if (c === "/" && next === "/") {
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      const quote = c;
      out += c;
      i++;
      while (i < n && src[i] !== quote) {
        if (src[i] === "\\") {
          out += src[i] + (src[i + 1] ?? "");
          i += 2;
          continue;
        }
        out += src[i];
        i++;
      }
      out += quote;
      i++;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}
