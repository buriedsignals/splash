export const ENGINE_SPLASH_CONTRACT_MIN = 1;
export const CREDENTIAL_IDS = Object.freeze([
  "MAPTILER_KEY",
  "DATAWRAPPER_TOKEN",
  "CLOUDFLARE_API_TOKEN",
]);

const CHECK_STATUSES = new Set(["pass", "declined", "missing", "fail"]);

function text(value, limit = 2048) {
  return typeof value === "string" ? value.slice(0, limit) : "";
}

function publicCheck(value) {
  if (!value || typeof value !== "object" || !CHECK_STATUSES.has(value.status)) return null;
  return { id: text(value.id, 80), status: value.status, detail: text(value.detail) };
}

function publicCredential(value, brokerAvailable) {
  const metadata = value?.metadata && typeof value.metadata === "object" ? value.metadata : {};
  let state = "not-saved";
  if (!brokerAvailable) state = "broker-unavailable";
  else if (value?.ok === false) state = text(value.status, 80) || "status-unavailable";
  else if (value?.stored === true && value?.validation?.status === "verified") state = "ready";
  else if (value?.stored === true && value?.validation?.status === "partially-verified") state = "partially-verified";
  else if (value?.stored === true && value?.validation?.status === "unverified") state = "saved-unverified";
  else if (value?.stored === true) state = "saved";
  const validationStatus = ["verified", "partially-verified", "unverified"].includes(value?.validation?.status)
    ? value.validation.status : "";
  const dimensions = Array.isArray(value?.validation?.dimensions)
    ? value.validation.dimensions.slice(0, 16).flatMap((row) => {
        if (!row || typeof row !== "object" || typeof row.id !== "string" || !["verified", "attested", "unverified"].includes(row.status)) return [];
        return [{ id: text(row.id, 64), status: row.status, reason: text(row.reason, 512) || null }];
      })
    : [];
  const cloudflareAccountId = /^[0-9a-f]{32}$/i.test(value?.validation?.evidence?.cloudflareAccountId ?? "")
    ? value.validation.evidence.cloudflareAccountId.toLowerCase() : null;
  return {
    id: value?.id,
    name: text(metadata.name, 160) || value?.id,
    purpose: text(metadata.purpose),
    acquisitionUrl: text(metadata.acquisitionUrl, 4096) || null,
    state,
    stored: value?.stored === true,
    generation: Number.isSafeInteger(value?.generation) ? value.generation : null,
    validation: validationStatus
      ? {
          status: validationStatus,
          validatedAt: text(value.validation.validatedAt, 100) || null,
          dimensions,
          evidence: cloudflareAccountId ? { cloudflareAccountId } : null,
        }
      : null,
  };
}

export function buildPublicStatus({ preflight, keyList, credentials = [] } = {}) {
  const checks = (preflight?.checks ?? []).map(publicCheck).filter(Boolean);
  const blockers = (preflight?.blockers ?? []).map(publicCheck).filter(Boolean);
  const brokerAvailable = keyList?.ok === true && keyList?.broker?.status !== "unavailable";
  const broker = brokerAvailable
    ? { status: "available", reasonCode: null, message: null }
    : {
        status: "unavailable",
        reasonCode: text(keyList?.broker?.reasonCode, 100) || "engine-unreachable",
        message: text(keyList?.broker?.message) || "Secure credential storage is unavailable. Credential-independent Splash work remains available.",
      };
  const byID = new Map(credentials.map((row) => [row?.id, row]));
  const listed = new Map((keyList?.keys ?? []).map((row) => [row?.id, row]));
  const credentialRows = CREDENTIAL_IDS.map((id) => publicCredential(byID.get(id) ?? listed.get(id) ?? { id }, brokerAvailable));
  const runtimeStatus = preflight
    ? preflight.ready === true ? "ready" : "repair-required"
    : "repair-required";
  return {
    schemaVersion: "splash-status/v1",
    runtime: { status: runtimeStatus },
    readiness: {
      ready: preflight?.ready === true,
      checks,
      blockers,
    },
    broker,
    credentialIndependentPathsAvailable: keyList?.credentialIndependentPathsAvailable !== false,
    credentials: credentialRows,
    story: { status: "unbound", descriptor: null },
  };
}

export function textSummary(status) {
  if (status?.runtime?.status !== "ready") return "Splash needs repair before production work can continue.";
  if (!status?.readiness?.ready) return `Splash has ${status?.readiness?.blockers?.length ?? 0} pre-flight blocker(s).`;
  const availableStates = new Set(["ready", "partially-verified", "saved-unverified"]);
  const unavailable = status.credentials?.filter((row) => !availableStates.has(row.state)).length ?? 0;
  return unavailable > 0
    ? `Splash is ready for credential-independent work; ${unavailable} optional credential capability row(s) are closed.`
    : "Splash pre-flight is ready.";
}
