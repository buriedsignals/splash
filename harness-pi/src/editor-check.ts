// The editor's framing proposals, checked by code before anyone reads them. On the 12B the editor
// returned valid JSON whose evidence quoted a number the sources do not hold (Aveiro 14.7 for 14).
// Every proposal's takeaway is grounded against the frozen data with Splash's own resolveGrounding,
// and every number its takeaway or evidence states is looked for in the frozen sources; what the
// code finds travels with the proposal, so the storyboard step shows the journalist a verdict, not
// the model's confidence.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveGrounding } from "../../skills/storyboard/scripts/propose.mjs";

export interface CheckedProposal {
  takeaway: string;
  evidence: string[];
  limits: string[];
  grounding: string;
  groundingDetail: string;
  /** Numbers the proposal states that appear in neither source/data.csv nor source/article.md. */
  unsourcedNumbers: string[];
}

const NUMBER = /\d+(?:[.,]\d+)?/g;

function numbersIn(text: string): string[] {
  return [...new Set(text.match(NUMBER) ?? [])];
}

/** Each numeric column's total, the one derived figure a framing routinely states ("394 million"). */
function columnTotals(csv: string): string[] {
  const [head, ...rows] = csv.trim().split(/\r?\n/).map((l) => l.split(","));
  return head.flatMap((_, i) => {
    const values = rows.map((r) => Number(r[i]));
    return values.every((v) => Number.isFinite(v))
      ? [String(Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100)]
      : [];
  });
}

/** The proposals of the editor's reply, or null when it holds no parseable proposals. */
export function checkEditorProposals(
  reply: string,
  storyDir: string,
): CheckedProposal[] | null {
  const json = reply.match(/\{[\s\S]*\}/)?.[0];
  if (!json) return null;
  let parsed: {
    proposals?: { takeaway?: string; evidence?: string[]; limits?: string[] }[];
  };
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed.proposals)) return null;
  const source = join(storyDir, "source");
  const csv = readFileSync(join(source, "data.csv"), "utf8");
  const article = readFileSync(join(source, "article.md"), "utf8");
  const profile = JSON.parse(
    readFileSync(join(source, "profile.json"), "utf8"),
  );
  const known = new Set(
    [...numbersIn(csv), ...numbersIn(article), ...columnTotals(csv)].map((n) =>
      n.replace(",", "."),
    ),
  );
  return parsed.proposals
    .filter((p) => typeof p.takeaway === "string")
    .map((p) => {
      const takeaway = p.takeaway as string;
      const evidence = (p.evidence ?? []).map(String);
      const resolved = resolveGrounding(takeaway, profile, { csv });
      const stated = numbersIn([takeaway, ...evidence].join(" "));
      return {
        takeaway,
        evidence,
        limits: (p.limits ?? []).map(String),
        grounding: resolved.verdict,
        groundingDetail: resolved.detail ?? "",
        unsourcedNumbers: stated.filter((n) => !known.has(n.replace(",", "."))),
      };
    });
}

/** The proposals as the storyboard step reads them: each with the code's verdict beside it. */
export function describeProposals(checked: CheckedProposal[]): string {
  return checked
    .map((p, i) => {
      const flags = [
        `grounding against the data: ${p.grounding}${p.groundingDetail ? ` (${p.groundingDetail.slice(0, 300)})` : ""}`,
        ...(p.unsourcedNumbers.length
          ? [
              `numbers found in neither data.csv nor article.md: ${p.unsourcedNumbers.join(", ")} — a figure derived from the data must be computed from it before anyone repeats it`,
            ]
          : []),
      ];
      return `${i + 1}. ${p.takeaway}\n   evidence: ${p.evidence.join(" | ")}\n   limits: ${p.limits.join(" | ")}\n   ${flags.join("\n   ")}`;
    })
    .join("\n");
}
