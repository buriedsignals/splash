// twin/skills/map-beat/scripts/inline-asset.mjs
export function toDataUri(bytes, mime) {
  return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
}
