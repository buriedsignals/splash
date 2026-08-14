import { mutateStoryboardRevisioned } from "../scripts/storyboard.mjs";

const [path, expectedRevision, format] = process.argv.slice(2);
process.stdout.write(`${JSON.stringify({ status: "ready" })}\n`);
await Bun.stdin.text();
try {
  await mutateStoryboardRevisioned(
    path,
    { slot: { id: 1, fields: { format, reachable: "yes" } } },
    { expectedRevision },
  );
  process.stdout.write(`${JSON.stringify({ status: "written", format })}\n`);
} catch (error) {
  process.stderr.write(
    `${JSON.stringify({ status: "refused", code: error?.code ?? "ERROR" })}\n`,
  );
  process.exitCode = 3;
}
