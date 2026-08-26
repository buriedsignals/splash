#!/usr/bin/env bun

import { startStudioController } from "./controller.mjs";
import { productionDependencies } from "../server.mjs";

const MAX_CONTROL_BYTES = 4096;

function option(argv, name) {
  const at = argv.indexOf(name);
  if (at < 0 || at + 1 >= argv.length) throw new Error(`${name} is required`);
  return argv[at + 1];
}

function optionalNumber(argv, name, fallback) {
  const at = argv.indexOf(name);
  if (at < 0) return fallback;
  const value = Number(argv[at + 1]);
  if (!Number.isFinite(value)) throw new Error(`${name} must be a number`);
  return value;
}

function event(name, data = {}) {
  process.stdout.write(`${JSON.stringify({ event: name, ...data })}\n`);
}

async function monitorControl(controller) {
  let bytes = 0;
  let text = "";
  for await (const chunk of Bun.stdin.stream()) {
    bytes += chunk.byteLength;
    if (bytes > MAX_CONTROL_BYTES) {
      controller.close("invalid-control");
      return;
    }
    text += Buffer.from(chunk).toString("utf8");
    while (text.includes("\n")) {
      const at = text.indexOf("\n");
      const line = text.slice(0, at);
      text = text.slice(at + 1);
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        controller.close("invalid-control");
        return;
      }
      if (
        !message ||
        typeof message !== "object" ||
        Array.isArray(message) ||
        Object.keys(message).length !== 1 ||
        message.command !== "close"
      ) {
        controller.close("invalid-control");
        return;
      }
      controller.close("parent-close");
      return;
    }
  }
  controller.close("parent-eof");
}

if (import.meta.main) {
  try {
    const argv = process.argv.slice(2);
    const allowed = new Set([
      "--bsig",
      "--newsroom-path",
      "--legacy-env-path",
      "--checkout-root",
      "--idle-ms",
      "--overall-ms",
    ]);
    for (let index = 0; index < argv.length; index += 2) {
      if (!allowed.has(argv[index]) || index + 1 >= argv.length)
        throw new Error("studio child received unsupported arguments");
    }
    const checkoutRoot = option(argv, "--checkout-root");
    const dependencies = await productionDependencies({
      checkoutRoot,
      newsroomPath: option(argv, "--newsroom-path"),
      bsigPath: option(argv, "--bsig"),
      legacyEnvPath: option(argv, "--legacy-env-path"),
    });
    const lifecycle = [];
    let announced = false;
    const controller = await startStudioController({
      ...dependencies,
      idleMs: optionalNumber(argv, "--idle-ms", 15 * 60_000),
      overallMs: optionalNumber(argv, "--overall-ms", 60 * 60_000),
      onLifecycle(value) {
        if (value.event === "ready") return;
        if (announced) event(value.event);
        else lifecycle.push(value.event);
      },
    });
    event("ready", { url: controller.url });
    announced = true;
    for (const name of lifecycle.splice(0)) event(name);
    void monitorControl(controller);
    const result = await controller.closed;
    event("closed", { reason: result.reason });
  } catch {
    event("error", { code: "controller-start-failed" });
    process.exitCode = 1;
  }
}
