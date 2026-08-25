import { toDataUri } from "./inline-asset.mjs";

export function witnessInlinedAssets() {
  return [toDataUri(Uint8Array.of(1, 2, 3), "image/png")];
}
