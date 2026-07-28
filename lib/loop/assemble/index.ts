// THE TABLE. A key here is a promise the loop can assemble that engine's spec — and, since
// buildable.ts derives LOOP_BUILDABLE_ENGINES from these keys, it is also a promise to the
// brain that the form can be OFFERED unmarked. Add a key only in the commit that adds its
// proof (design spec §4.6).
import type { Assembler } from "../../core/production-brief";
import { assembleChartNative } from "./chart-native";

export const ASSEMBLERS: Record<string, Assembler> = {
  "chart-native": assembleChartNative,
};
