import { validateChartSpec } from "../../dw-chart/src/chart-spec";
import { dataShape } from "../../dw-chart/src/csv";

export interface VisualProposal {
  anchor: { paragraphIndex: number; quote: string };
  claim: string;
  intent: string;
  data: string; // CSV subset
  dataSource: { table: string; columns: string[] };
  confidence: "high" | "medium" | "low";
  rationale: string;
}

export interface ProposalSet {
  proposals: VisualProposal[];
  notes: string;
}

export interface Opportunity {
  claimMatches: string[];
  dataTable: string;
  dataColumns: string[];
}

export interface CaseExpect {
  opportunities: Opportunity[];
  minProposals: number;
  maxProposals: number;
  noChartClaims: string[];
}

export interface ProposalScore {
  countOk: boolean;
  dataValid: boolean;
  provenanceOk: boolean;
  noChartRespected: boolean;
  recall: number;
  precision: number;
  pass: boolean;
  notes: string[];
}

const DEFAULT_TAU = { r: 0.7, p: 0.5 };

// A gold opportunity is matched by a proposal iff same source table AND every
// keyword appears (case-insensitive substring) in the proposal's claim+quote.
function matches(p: VisualProposal, o: Opportunity): boolean {
  if (p.dataSource.table !== o.dataTable) return false;
  const hay = (p.claim + " " + p.anchor.quote).toLowerCase();
  return o.claimMatches.every((k) => hay.includes(k.toLowerCase()));
}

export function scoreProposalSet(
  set: unknown,
  expect: CaseExpect,
  sourceTables: Record<string, string>,
  tau: { r: number; p: number } = DEFAULT_TAU,
): ProposalScore {
  const notes: string[] = [];
  const proposals =
    set &&
    typeof set === "object" &&
    Array.isArray((set as ProposalSet).proposals)
      ? (set as ProposalSet).proposals
      : [];
  const n = proposals.length;

  // countOk
  const countOk = n >= expect.minProposals && n <= expect.maxProposals;
  if (!countOk)
    notes.push(
      `count ${n} outside [${expect.minProposals},${expect.maxProposals}]`,
    );

  // dataValid — neutral data-shape probe via the prior cut's validator.
  // Wrap each subset in the simplest valid type (column-chart); this is a
  // data-shape probe, NOT a chart-type choice (the prior cut owns type).
  let dataValid = n > 0;
  for (const p of proposals) {
    const probe = {
      type: "column-chart",
      title: "probe",
      data: p.data,
      altInsight: "probe",
    };
    const v = validateChartSpec(probe);
    if (!v.ok) {
      dataValid = false;
      notes.push(
        `dataValid: proposal "${p.claim}" not producible: ${v.errors.join("; ")}`,
      );
    }
  }

  // provenanceOk — proposal columns ⊆ cited source table columns (no invented data).
  let provenanceOk = true;
  for (const p of proposals) {
    const tableCsv = sourceTables[p.dataSource.table];
    if (!tableCsv) {
      provenanceOk = false;
      notes.push(
        `provenance: cited table "${p.dataSource.table}" not in source set`,
      );
      continue;
    }
    const tableCols = dataShape(tableCsv).columns.map((c) => c.toLowerCase());
    const declared = p.dataSource.columns.map((c) => c.toLowerCase());
    const subsetCols =
      typeof p.data === "string" && p.data.includes(",")
        ? dataShape(p.data).columns.map((c) => c.toLowerCase())
        : [];
    for (const c of [...declared, ...subsetCols]) {
      if (!tableCols.includes(c)) {
        provenanceOk = false;
        notes.push(
          `provenance: column "${c}" not in source table "${p.dataSource.table}"`,
        );
      }
    }
  }

  // noChartRespected — no proposal anchors onto a forbidden claim.
  let noChartRespected = true;
  for (const p of proposals) {
    const hay = (p.claim + " " + p.anchor.quote).toLowerCase();
    for (const nc of expect.noChartClaims) {
      if (hay.includes(nc.toLowerCase())) {
        noChartRespected = false;
        notes.push(`noChart: proposal touches a no-chart claim "${nc}"`);
      }
    }
  }

  // recall / precision vs gold
  const gold = expect.opportunities;
  const matchedGold = gold.filter((o) =>
    proposals.some((p) => matches(p, o)),
  ).length;
  const recall = gold.length === 0 ? 1 : matchedGold / gold.length;
  const goodProposals = proposals.filter((p) =>
    gold.some((o) => matches(p, o)),
  ).length;
  const precision = n === 0 ? (gold.length === 0 ? 1 : 0) : goodProposals / n;

  const pass =
    countOk &&
    dataValid &&
    provenanceOk &&
    noChartRespected &&
    recall >= tau.r &&
    precision >= tau.p;

  return {
    countOk,
    dataValid,
    provenanceOk,
    noChartRespected,
    recall,
    precision,
    pass,
    notes,
  };
}
