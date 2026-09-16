import { expect, test } from "bun:test";
import { readinessView, selectionView } from "../resources/readiness-view.mjs";
import { capabilitySnapshotFromStatus } from "../selection.mjs";

function status(states: string[], ready = true) {
  return { runtime: { status: "ready" }, readiness: { ready, blockers: [] }, credentials: states.map(state => ({ state })) };
}

test.each([
  [[], "neutral", "Workspace checks passed"],
  [["not-set", "not-set", "not-set", "not-set"], "attention", "4 services need setup"],
  [["ready", "not-saved"], "attention", "1 service needs setup"],
  [["ready", "partially-verified"], "neutral", "Services connected; verification is partial"],
  [["ready", "provided-unverified"], "attention", "1 service connection needs review"],
  [["broker-unavailable"], "attention", "1 service connection could not be verified"],
  [["engine-timeout", "invalid"], "attention", "2 service connections could not be verified"],
  [["ready", "ready"], "success", "Workspace and services are ready"],
])("readiness distinguishes workspace health and connection states: %j", (states, tone, title) => {
  const view = readinessView(status(states as string[]));
  expect(view.tone).toBe(tone);
  expect(view.title).toBe(title);
});

test("workspace blockers take precedence even with verified services", () => {
  const view = readinessView(status(["ready"], false));
  expect(view.title).toBe("Complete workspace setup");
  expect(view.workspaceReady).toBe(false);
});

test.each(["intake", "framing", "production", "delivery", "done"])("non-visual phase %s has a next action without displaying empty controls", phase => {
  const view = selectionView({ phase, gate: null });
  expect(view.choosing).toBe(false);
  expect(view.detail).toContain("agent");
});

test.each(["G2a", "G2b", "G2c", "G2-treatment", "G2-producer"])("visual gate %s explains confirmation and the next decision", id => {
  expect(selectionView({ phase: "storyboard", gate: { id, awaiting: id === "G2a" ? "medium" : "format" } }).choosing).toBe(true);
});

test.each(["slot", "id", "proves"])("early storyboard input %s directs the user to the agent without empty choices", awaiting => {
  const view = selectionView({ phase: "storyboard", gate: { id: "G2a", awaiting }, choices: [] });
  expect(view.choosing).toBe(false);
  expect(view.detail).toContain("agent");
  expect(view.detail).toContain("refresh from story");
});

test.each([
  ["a".repeat(32), "success", true],
  ["A".repeat(32), "success", true],
  ["b".repeat(32), "attention", false],
  [null, "attention", false],
  ["invalid", "attention", false],
])("Cloudflare readiness agrees with hosted delivery for receipt account %s", (receiptAccount, tone, available) => {
  const current = {
    ...status([]), newsroom: { cloudflareAccountId: "a".repeat(32) },
    credentials: [{ id: "CLOUDFLARE_API_TOKEN", state: "ready", validation: { evidence: { cloudflareAccountId: receiptAccount } } }],
  };
  const view = readinessView(current);
  expect(view.tone).toBe(tone);
  expect(capabilitySnapshotFromStatus(current).available.includes("hosted-embed")).toBe(available);
  if (!available) {
    expect(view.title).toContain("Cloudflare");
    expect(view.detail).toContain("account");
  }
});

test.each([null, "invalid"])("Cloudflare requires a valid current account: %s", cloudflareAccountId => {
  const current = { ...status([]), newsroom: { cloudflareAccountId }, credentials: [{
    id: "CLOUDFLARE_API_TOKEN", state: "ready", validation: { evidence: { cloudflareAccountId: "a".repeat(32) } },
  }] };
  expect(readinessView(current).title).toBe("Cloudflare needs an account ID");
  expect(capabilitySnapshotFromStatus(current).available).not.toContain("hosted-embed");
});

test("another service’s receipt cannot validate Cloudflare, and a matching partial receipt stays partial", () => {
  const current = { ...status([]), newsroom: { cloudflareAccountId: "a".repeat(32) }, credentials: [
    { id: "MAPTILER_KEY", state: "ready", validation: { evidence: { cloudflareAccountId: "a".repeat(32) } } },
    { id: "CLOUDFLARE_API_TOKEN", state: "partially-verified", validation: null },
  ] };
  expect(readinessView(current).tone).toBe("attention");
  expect(capabilitySnapshotFromStatus(current).available).not.toContain("hosted-embed");
  const validated = { ...current, credentials: current.credentials.map(row => ({ ...row, validation: { evidence: { cloudflareAccountId: "a".repeat(32) } } })) };
  expect(readinessView(validated).title).toBe("Services connected; verification is partial");
  expect(capabilitySnapshotFromStatus(validated).available).toContain("hosted-embed");
});
