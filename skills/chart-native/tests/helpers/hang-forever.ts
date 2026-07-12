// Test fixture: reports its own pid to the file given as argv[2], then hangs
// forever — the shape of a hung render child under the watchdog (see
// tests/video-watchdog.test.ts's signal-forwarding case).
import { writeFileSync } from "node:fs";
import process from "node:process";

writeFileSync(process.argv[2], String(process.pid));
await new Promise(() => {});
