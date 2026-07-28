// THE TABLE. A key here is a promise the loop can assemble that engine's spec — and, since
// buildable.ts derives LOOP_BUILDABLE_ENGINES from these keys, it is also a promise to the
// brain that the form can be OFFERED unmarked. Add a key only in the commit that adds its
// proof (design spec §4.6).
import type { Assembler } from "../../core/production-brief";
import { assembleChartNative } from "./chart-native";

export type AssemblerEntry = {
  assemble: Assembler;
  /** Absent = every type this engine declares. Present = the types the LOOP can compose a
   *  spec for, which can lag the engine's own catalogue while a family is being wired. */
  supports?: (nativeType: string) => boolean;
};

export const ASSEMBLERS: Record<string, AssemblerEntry> = {
  "chart-native": { assemble: assembleChartNative },
};

export function assemblerFor(
  engine: string,
  nativeType?: string,
): Assembler | undefined {
  const entry = ASSEMBLERS[engine];
  if (!entry) return undefined;
  if (nativeType && entry.supports && !entry.supports(nativeType))
    return undefined;
  return entry.assemble;
}
