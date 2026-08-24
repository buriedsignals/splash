export const GUARDS = ["duplicatedPayload", "weightAgainstCeiling"];

const PAYLOAD_FLOOR = 1024;

export function duplicatedPayload(artifact) {
  const blobs = new Map();
  for (const match of artifact.matchAll(
    /data:[a-z/+.-]+;base64,([A-Za-z0-9+/=]+)/gi,
  )) {
    const body = match[1];
    if (body.length < PAYLOAD_FLOOR) continue;
    const seen = blobs.get(body) ?? { copies: 0, bytes: body.length };
    seen.copies += 1;
    blobs.set(body, seen);
  }
  return [...blobs.values()]
    .filter((blob) => blob.copies > 1)
    .map((blob) => ({
      copies: blob.copies,
      bytes: blob.bytes,
      wastedBytes: (blob.copies - 1) * blob.bytes,
    }))
    .sort((left, right) => right.wastedBytes - left.wastedBytes);
}

export function weightAgainstCeiling(bytes, ceiling) {
  return { bytes, ceiling, over: bytes > ceiling };
}

export const RAW_PHOTOGRAPH_LIMIT_BYTES = 20 * 1024 * 1024;
export const BASE64_INFLATION = 4 / 3;
export const CEILING_BYTES = Math.ceil(
  RAW_PHOTOGRAPH_LIMIT_BYTES * BASE64_INFLATION,
);
