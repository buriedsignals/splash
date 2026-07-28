#!/usr/bin/env bun
// The PROOFS runner: one documented command for the env-gated proofs this project trusts most.
//
//   bun run proofs                 run every proof
//   bun run proofs -- --list       print the roster and each proof's gate, run nothing
//   bun run proofs -- <substring>  run only the proofs whose path matches
//
// Why these files are not in `bun run check`: each one stands up real infrastructure — a
// bundler, a browser, a Remotion render, an S3 endpoint — and produces a real artifact through
// the real pipeline. Minutes, not seconds. They are opt-in for that reason and no other, which
// is exactly how four of them came to be broken on main with nobody noticing: nothing ran them.
// This script is the "somebody runs them" half. The "you find out without running them" half is
// the always-on fixture guard inside each proof file, and `tsc --noEmit` over lib — both in
// `bun run check`. See docs/superpowers/specs/2026-07-27-proofs-run-design.md.
//
// TWO MEASURED CONSTRAINTS SHAPE THIS FILE, both of them real and both reproduced:
//
//   1. ONE FILE PER PROCESS, RUN SERIALLY. lib/verify/rendered-title-proof.test.ts stalls on its
//      first browser launch when it runs in the same bun-test process after
//      real-artifact-proof.test.ts (that file's own header records it, twice reproduced), and
//      running two proofs concurrently pushed real-artifact-proof from 34s to a 300s timeout on
//      this machine. So: one `bun test <file>` per proof, one at a time. It is slower on purpose.
//
//   2. A SKIP IS A FAILURE HERE. `test.skipIf(!RUN)` means a proof whose gate name drifts
//      reports "0 fail" and exits 0 — green, having proved nothing. That is the same class of
//      false green the proofs exist to prevent, so this runner refuses it: any gated test that
//      skipped is reported FAIL, with the gate that failed to take.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// The roster. This list IS the definition of "the proofs" — a file added here is a file the
// runner runs, and a file not here is a file nobody runs.
const PROOFS = [
  {
    file: "lib/verify/rendered-title-proof.test.ts",
    what: "the rendered title reaches the approval gate, read off a live DOM",
    env: { SPLASH_VERIFY_PROOF: "1" },
  },
  {
    file: "lib/verify/real-artifact-proof.test.ts",
    what: "a real interactive is captured, reviewed and gated on its own bytes",
    env: { SPLASH_VERIFY_PROOF: "1" },
  },
  {
    file: "lib/source/wiring-proof.test.ts",
    what: "the declared source is painted into the raster, and into the delivered package",
    env: { SPLASH_SOURCE_PROOF: "1" },
  },
  {
    file: "lib/loop/multi-deliverable-e2e.test.ts",
    what: "one takeaway, three deliverables, three real geometries",
    env: { SPLASH_E2E_DELIVERABLES: "1" },
  },
  {
    file: "lib/loop/video-e2e.test.ts",
    what: "a chosen motion row produces a real mp4",
    env: { SPLASH_VIDEO_E2E: "1" },
  },
  {
    file: "lib/loop/map-e2e.test.ts",
    what: "a chosen map is assembled by the loop and rendered by the engine",
    env: { SPLASH_MAP_E2E: "1" },
  },
  {
    file: "lib/loop/map-dw-e2e.test.ts",
    what: "a chosen hosted map is assembled by the loop, published by Datawrapper and measured off its own PNG",
    env: { SPLASH_DW_E2E: "1" },
  },
  {
    file: "lib/loop/delivery-genre-e2e.test.ts",
    what: "a produced PNG is published to a real S3 endpoint and served as an image",
    env: { SPLASH_S3_E2E: "1" },
    // Local credentials, applied only when the caller supplied none: the documented MinIO
    // setup below uses exactly these, and a runner that made you retype them would be one more
    // reason not to run the proofs.
    defaultEnv: {
      SPLASH_S3_ACCESS_KEY_ID: "minioadmin",
      SPLASH_S3_SECRET_ACCESS_KEY: "minioadmin",
    },
    infrastructure: {
      name: "an S3-compatible endpoint at 127.0.0.1:9000",
      probe: async () => {
        const res = await fetch("http://127.0.0.1:9000/minio/health/live", {
          signal: AbortSignal.timeout(2000),
        });
        return res.ok;
      },
      how: [
        "docker run -d --name splash-minio -p 9000:9000 \\",
        "  -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin \\",
        "  quay.io/minio/minio server /data",
        "docker exec splash-minio mc alias set local http://127.0.0.1:9000 minioadmin minioadmin",
        "docker exec splash-minio mc mb --ignore-existing local/splash-embeds",
        "docker exec splash-minio mc anonymous set download local/splash-embeds",
        "# the adapter refuses to set a bucket policy itself, by design (lib/delivery/adapters/s3.ts F4)",
      ],
    },
  },
];

/** Per-proof wall clock. Generous: the deliverables proof declares a 20-minute test timeout of
 *  its own, and a runner that killed it earlier would report a product failure that isn't one. */
const TIMEOUT_MS = 30 * 60 * 1000;

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(
    [
      "bun run proofs                 run every proof, serially",
      "bun run proofs -- --list       print the roster and each proof's gate",
      "bun run proofs -- <substring>  run only the proofs whose path matches",
      "",
      "Every proof must PASS with nothing skipped. A skipped gated test is reported as a",
      "failure: it means the env gate did not take, and a gate that does not take is a green",
      "that proves nothing.",
    ].join("\n"),
  );
  process.exit(0);
}
if (args.includes("--list")) {
  for (const p of PROOFS)
    console.log(
      `${Object.keys(p.env).join(",").padEnd(24)}  ${p.file}\n${" ".repeat(26)}${p.what}`,
    );
  process.exit(0);
}

const filters = args.filter((a) => !a.startsWith("-"));
const selected = filters.length
  ? PROOFS.filter((p) => filters.some((f) => p.file.includes(f)))
  : PROOFS;
if (selected.length === 0) {
  console.error(`No proof matches ${filters.join(", ")}. Try --list.`);
  process.exit(2);
}

/** bun test's own tally, read back out of its output. `null` for a count it never printed. */
function tally(output) {
  const one = (re) => {
    const m = output.match(re);
    return m ? Number(m[1]) : null;
  };
  return {
    pass: one(/^\s*(\d+) pass\s*$/m),
    fail: one(/^\s*(\d+) fail\s*$/m),
    skip: one(/^\s*(\d+) skip\s*$/m),
  };
}

function hhmmss(ms) {
  const s = Math.round(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}m${String(s % 60).padStart(2, "0")}s`;
}

const results = [];
console.log(`Proofs — ${selected.length} of ${PROOFS.length}, one process each, serially.\n`);

for (const proof of selected) {
  process.stdout.write(`▸ ${proof.file}\n  ${proof.what}\n`);

  if (proof.infrastructure) {
    let up = false;
    try {
      up = await proof.infrastructure.probe();
    } catch {
      up = false;
    }
    if (!up) {
      // NOT a silent skip. A proof that could not run is reported as such and fails the run:
      // "we did not check" and "we checked and it was fine" must never print the same.
      console.log(`  DID NOT RUN — ${proof.infrastructure.name} is not up\n`);
      results.push({
        proof,
        verdict: "DID NOT RUN",
        detail: `${proof.infrastructure.name} is not up`,
        ms: 0,
      });
      continue;
    }
  }

  const env = { ...process.env, ...proof.env };
  for (const [k, v] of Object.entries(proof.defaultEnv ?? {}))
    if (!env[k]) env[k] = v;

  const started = Date.now();
  const r = spawnSync("bun", ["test", proof.file], {
    cwd: ROOT,
    encoding: "utf8",
    env,
    timeout: TIMEOUT_MS,
  });
  const ms = Date.now() - started;
  const output = (r.stdout ?? "") + (r.stderr ?? "");
  const counts = tally(output);

  let verdict = "PASS";
  let detail = `${counts.pass ?? 0} pass`;
  if (r.error?.code === "ETIMEDOUT" || r.signal) {
    verdict = "FAIL";
    detail = `killed after ${hhmmss(ms)} (${r.signal ?? r.error?.code})`;
  } else if (r.status !== 0) {
    verdict = "FAIL";
    detail = `exit ${r.status}, ${counts.fail ?? "?"} fail`;
  } else if (!counts.pass) {
    verdict = "FAIL";
    detail = "no test ran at all — is the file still there?";
  } else if (counts.skip) {
    // The false-green guard: the gate is set right above, so a skip means the file no longer
    // reads it under that name.
    verdict = "FAIL";
    detail = `${counts.skip} gated test skipped — ${Object.entries(proof.env)
      .map(([k, v]) => `${k}=${v}`)
      .join(" ")} did not take`;
  }

  console.log(`  ${verdict} — ${detail}, ${hhmmss(ms)}\n`);
  results.push({ proof, verdict, detail, ms, output });
}

console.log("─".repeat(78));
for (const r of results)
  console.log(
    `${r.verdict.padEnd(12)} ${hhmmss(r.ms).padStart(6)}  ${r.proof.file}\n${" ".repeat(20)}${r.detail}`,
  );

const broken = results.filter((r) => r.verdict === "FAIL");
const absent = results.filter((r) => r.verdict === "DID NOT RUN");

for (const r of broken) {
  console.log(`\n─── ${r.proof.file} ${"─".repeat(Math.max(0, 60 - r.proof.file.length))}`);
  console.log((r.output ?? "").split("\n").slice(-40).join("\n"));
}
for (const r of absent) {
  console.log(`\n─── ${r.proof.file}: ${r.detail}`);
  console.log(r.proof.infrastructure.how.map((l) => `    ${l}`).join("\n"));
}

const ran = results.length - absent.length;
console.log(
  `\n${ran - broken.length}/${results.length} proofs passed` +
    (absent.length ? `, ${absent.length} could not run` : "") +
    ".",
);
process.exit(broken.length || absent.length ? 1 : 0);
