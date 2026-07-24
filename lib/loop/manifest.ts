import { blake3 } from "@noble/hashes/blake3.js";
import { readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type FormOption = { id: string; nativeType: string; why: string };
export type DataProfile = {
  columns: string[];
  numericColumns: string[];
  rowCount: number;
};

export type RunManifest = {
  runId: string;
  schemaVersion: 1;
  input: { dataCsv: string; statedPoint: string };
  orient?: { profile: DataProfile; supportsPoint: boolean; note?: string };
  angle?: {
    confirmedTakeaway: string;
    emphasis?: string;
    altInsight: string;
    unit: string;
  };
  proposal?: { options: FormOption[]; chosenId?: string };
  artifact?: { path: string; provenanceHash: string };
};

// The artifact depends on exactly these. Any change ⇒ the produced artifact is stale.
export function provenanceHash(m: RunManifest): string {
  const material = JSON.stringify({
    dataCsv: m.input.dataCsv,
    angle: m.angle ?? null,
    chosenId: m.proposal?.chosenId ?? null,
  });
  return Buffer.from(blake3(new TextEncoder().encode(material)))
    .toString("hex")
    .slice(0, 32);
}

export function stalenessOf(m: RunManifest): boolean {
  return m.artifact != null && m.artifact.provenanceHash !== provenanceHash(m);
}

export function writeManifest(path: string, m: RunManifest): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(m, null, 2));
  renameSync(tmp, path); // atomic replace
}

export function readManifest(path: string): RunManifest {
  return JSON.parse(readFileSync(path, "utf8")) as RunManifest;
}

export type NextAction =
  "orient" | "confirm-angle" | "propose" | "choose-form" | "produce" | "show";

export function nextActions(m: RunManifest): NextAction[] {
  if (!m.orient) return ["orient"];
  if (!m.orient.supportsPoint) return []; // honest off-ramp: nothing to visualise
  if (!m.angle) return ["confirm-angle"];
  if (!m.proposal) return ["propose"];
  if (m.proposal.options.length === 0) return []; // no legal form for this data — honest off-ramp
  if (!m.proposal.chosenId) return ["choose-form"];
  if (!m.artifact || stalenessOf(m)) return ["produce"];
  return ["show"];
}
