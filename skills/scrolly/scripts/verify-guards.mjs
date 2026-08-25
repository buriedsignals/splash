export const GUARDS = ["weightAgainstCeiling"];

export function weightAgainstCeiling(bytes, ceiling) {
  return { bytes, ceiling, over: bytes > ceiling };
}

export const RAW_PHOTOGRAPH_LIMIT_BYTES = 20 * 1024 * 1024;
export const BASE64_INFLATION = 4 / 3;
export const CEILING_BYTES = Math.ceil(
  RAW_PHOTOGRAPH_LIMIT_BYTES * BASE64_INFLATION,
);
