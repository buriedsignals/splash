import { blake3 } from "@noble/hashes/blake3.js";

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
