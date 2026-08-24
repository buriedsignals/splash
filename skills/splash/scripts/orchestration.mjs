import { whereIs } from "./where.mjs";

export async function invokeResolvedOwner(storyDir, adapters) {
  const resolved = await whereIs(storyDir);
  if (!resolved.owner) return resolved;

  const { kind, id } = resolved.owner;
  const key = `${kind}:${id}`;
  if (resolved.status !== "ready") {
    throw new Error(
      `Splash owner ${JSON.stringify(key)} cannot run for ${JSON.stringify(resolved.phase)}/${JSON.stringify(resolved.status)}`,
    );
  }
  const invoke = adapters?.[kind];
  if (typeof invoke !== "function") {
    throw new Error(`Splash owner adapter is unavailable for ${kind}`);
  }
  return invoke(id, resolved);
}
