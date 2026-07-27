// The delivered image's real pixel size, read from the file itself.
//
// Written here rather than reached for in skills/splash/src/channel.ts (which already reads
// an IHDR): lib/ must not import skills/ — that inversion is exactly what lib/core/
// vocabulary.ts exists to have ended. Twenty lines of file format is a cheaper price than
// re-coupling the core to the legacy orchestrator.
//
// Every path answers null instead of throwing: this module is called from a verb, and a
// verb never throws (contract invariant I1). A missing, truncated, or non-png file is a
// FACT the caller reports, not an exception it must catch.
import { openSync, readSync, closeSync } from "node:fs";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
// signature (8) + chunk length (4) + "IHDR" (4) + width (4) + height (4)
const HEADER_BYTES = 24;

function readHeader(path: string): Buffer | null {
  let fd: number | undefined;
  try {
    fd = openSync(path, "r");
    const buf = Buffer.alloc(HEADER_BYTES);
    const read = readSync(fd, buf, 0, HEADER_BYTES, 0);
    return read === HEADER_BYTES ? buf : null;
  } catch {
    return null;
  } finally {
    if (fd !== undefined) {
      try {
        closeSync(fd);
      } catch {
        /* best-effort close: never turn a size read into a throw */
      }
    }
  }
}

function hasSignature(buf: Buffer): boolean {
  return PNG_SIGNATURE.every((b, i) => buf[i] === b);
}

export function isPng(path: string): boolean {
  const buf = readHeader(path);
  return buf !== null && hasSignature(buf);
}

export function pngSize(
  path: string,
): { width: number; height: number } | null {
  const buf = readHeader(path);
  if (!buf || !hasSignature(buf)) return null;
  if (buf.toString("ascii", 12, 16) !== "IHDR") return null;
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return width > 0 && height > 0 ? { width, height } : null;
}
