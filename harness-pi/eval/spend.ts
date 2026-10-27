// The spend ledger (plan U2, KTD6, KTD10): eval/SPEND.md, one table row per paid action. A paid step reads its
// service's running total here and refuses to start when its projection would cross the cap.
import { appendFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const CAPS = { OpenRouter: { amount: 15, unit: "usd" }, RunPod: { amount: 50, unit: "eur" } } as const;
export type Service = keyof typeof CAPS;

export const LEDGER = () => process.env.SPLASH_SPEND_LEDGER ?? join(import.meta.dirname, "SPEND.md");

interface Row {
  date: string;
  step: string;
  service: string;
  quantity: string;
  usd: number;
  eur: number;
}

export function rows(file = LEDGER()): Row[] {
  return readFileSync(file, "utf8")
    .split("\n")
    .filter((l) => /^\|\s*\d{4}-\d{2}-\d{2}\s*\|/.test(l))
    .map((l) => {
      const [date, step, service, quantity, usd, eur] = l.split("|").slice(1, -1).map((c) => c.trim());
      return { date, step, service, quantity, usd: Number(usd) || 0, eur: Number(eur) || 0 };
    });
}

/** What a service has cost so far, in its cap's unit. */
export function spent(service: Service, file = LEDGER()): number {
  const unit = CAPS[service].unit;
  return rows(file)
    .filter((r) => r.service === service)
    .reduce((s, r) => s + (unit === "usd" ? r.usd : r.eur), 0);
}

/** Throws before any call when spending `projected` (cap unit) would cross the service's cap. */
export function assertWithinCap(service: Service, projected: number, file = LEDGER()) {
  const { amount, unit } = CAPS[service];
  const done = spent(service, file);
  const sign = unit === "usd" ? "$" : "€";
  if (done + projected > amount)
    throw new Error(`${service} has spent ${sign}${done.toFixed(2)} of its ${sign}${amount} cap; this step's projection ${sign}${projected.toFixed(2)} would cross it — ask Rémy`);
}

/** Appends one paid action with the service's new running total. */
export function record(entry: { step: string; service: Service; quantity: string; usd: number; eur?: number }, file = LEDGER()) {
  const total = spent(entry.service, file) + (CAPS[entry.service].unit === "usd" ? entry.usd : entry.eur ?? 0);
  const cell = (v: number | undefined) => (v === undefined ? "" : v.toFixed(4));
  appendFileSync(
    file,
    `| ${new Date().toISOString().slice(0, 10)} | ${entry.step.replace(/\|/g, "/")} | ${entry.service} | ${entry.quantity.replace(/\|/g, "/")} | ${cell(entry.usd)} | ${cell(entry.eur)} | ${total.toFixed(4)} |\n`,
  );
}
