import { cloudflareAccountStatus } from "../contract.mjs";

function cloudflareSetupIssue(status) {
  const credential = status.credentials?.find(row => row.id === "CLOUDFLARE_API_TOKEN");
  if (!["ready", "partially-verified"].includes(credential?.state)) return null;
  const account = cloudflareAccountStatus(status);
  if (!account.accountId) return {
    title: "Cloudflare needs an account ID",
    detail: "Add the account ID below, then revalidate the token for that account before publishing hosted visuals.",
  };
  if (!account.matches) return {
    title: "Cloudflare needs revalidation",
    detail: status.installation === "engine"
      ? "The token has not been verified for the current account. In Indicator Labs, revalidate the Cloudflare token for this account, then refresh connections."
      : "The token has not been verified for the current account. Ask your agent to revalidate the Cloudflare token for this account, then refresh connections.",
  };
  return null;
}

export function serviceConnectionView(row, status) {
  const issue = row.id === "CLOUDFLARE_API_TOKEN" ? cloudflareSetupIssue(status) : null;
  const state = issue ? "saved-unverified" : row.state;
  return { ...row, state, label: serviceStateLabel(state), reason: issue?.detail || row.reason };
}

// Workspace health and service availability answer different questions.
export function readinessView(status) {
  const credentials = (status.credentials ?? []).map(row => serviceConnectionView(row, status));
  const verified = credentials.filter(row => row.state === "ready").length;
  const partial = credentials.filter(row => row.state === "partially-verified").length;
  const review = credentials.filter(row => ["saved-unverified", "provided-unverified", "saved"].includes(row.state)).length;
  const missing = credentials.length - verified - partial - review;
  const failed = credentials.filter(row => !["ready", "not-set", "not-saved", "partially-verified", "saved-unverified", "provided-unverified", "saved"].includes(row.state)).length;
  const workspaceReady = status.runtime?.status === "ready" && status.readiness?.ready === true && !status.readiness?.blockers?.length;
  if (!workspaceReady && status.runtime?.status === "ready" && ["missing", "invalid", "unknown"].includes(status.newsroom?.decision)) return {
    tone: "attention", title: "Complete your design profile",
    detail: "Add your newsroom’s identity, colours and typefaces in Design before choosing a visual. You can configure service connections below.",
    workspaceReady, verified, review, missing,
  };
  if (!workspaceReady) return {
    tone: "attention", title: "Complete workspace setup",
    detail: "Resolve the checks below before making visual decisions. Service connections are listed separately.",
    workspaceReady, verified, review, missing,
  };
  if (!credentials.length) return {
    tone: "neutral", title: "Workspace checks passed",
    detail: "Service status has not been reported yet. Refresh to check your connections.",
    workspaceReady, verified, review, missing,
  };
  if (failed) return {
    tone: "attention", title: `${failed} service connection${failed === 1 ? " could" : "s could"} not be verified`,
    detail: "Workspace checks passed. Check the connection messages below; an unavailable status does not necessarily mean a key is missing.",
    workspaceReady, verified, review, missing,
  };
  if (missing) return {
    tone: "attention", title: `${missing} service${missing === 1 ? " needs" : "s need"} setup`,
    detail: "Workspace checks passed. You can open a story now; connect each service before using the workflow described on its card.",
    workspaceReady, verified, review, missing,
  };
  const cloudflareIssue = cloudflareSetupIssue(status);
  if (review === 1 && cloudflareIssue) return {
    tone: "attention", ...cloudflareIssue,
    workspaceReady, verified, review, missing,
  };
  if (review) return {
    tone: "attention", title: `${review} service connection${review === 1 ? " needs" : "s need"} review`,
    detail: "Workspace checks passed. Review the permissions or restrictions noted below before using these services.",
    workspaceReady, verified, review, missing,
  };
  if (partial) return {
    tone: "neutral", title: "Services connected; verification is partial",
    detail: "Workspace checks passed. These connections are available, but some permission checks rely on the saved provider setup. See each service’s status below.",
    workspaceReady, verified, review, missing,
  };
  return {
    tone: "success", title: "Workspace and services are ready",
    detail: "Workspace checks passed and every service connection is verified. Open a story to choose its next visual.",
    workspaceReady, verified, review, missing,
  };
}

export function serviceStateLabel(state) {
  return {
    ready: "Connected", "not-set": "Not configured", "not-saved": "Not configured",
    "partially-verified": "Partly verified", "saved-unverified": "Needs review",
    "provided-unverified": "Needs review", saved: "Needs review",
    "engine-timeout": "Could not check", "broker-unavailable": "Could not check",
    "status-unavailable": "Could not check", unavailable: "Connection failed", invalid: "Connection failed",
  }[state] ?? String(state ?? "Unknown").replaceAll("-", " ");
}

export function selectionView(model) {
  const choosing = model?.gate?.id === "G2a"
    ? model.gate.awaiting === "medium"
    : ["G2b", "G2c", "G2-treatment", "G2-producer"].includes(model?.gate?.id);
  if (choosing) return { choosing: true, detail: "Choose an option below, then confirm it to save this decision and see what comes next." };
  if (model?.gate?.id === "G2a") return {
    choosing: false, detail: "First, work with your agent to define the visual and what it should prove. Then refresh from story to choose its medium and format.",
  };
  if (["production", "delivery", "done"].includes(model?.phase)) return {
    choosing: false, detail: "The visual decisions are complete. Continue with your agent to produce, review or deliver the visual.",
  };
  if (model?.phase === "intake") return {
    choosing: false, detail: "The story is open. Your agent needs to finish preparing the article and data before visual choices can appear. Continue there, then refresh from story.",
  };
  return {
    choosing: false, detail: "The story is open. The next decision needs your editorial input with the agent. Continue there, then refresh from story to load the next visual choice.",
  };
}
