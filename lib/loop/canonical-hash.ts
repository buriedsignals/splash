import { blake3 } from "@noble/hashes/blake3.js";

// Deterministic serialization: object keys sorted recursively, arrays left in order.
// Two structurally-equal values with permuted keys serialize identically.
export function canonicalStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

export function canonicalHash(value: unknown): string {
  const bytes = new TextEncoder().encode(canonicalStringify(value));
  return Buffer.from(blake3(bytes)).toString("hex").slice(0, 32);
}
