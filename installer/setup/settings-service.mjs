import { mkdir, realpath } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { DESIGN_FIELDS } from "../../apps/goose/resources/settings-fields.mjs";
import { readNewsroom, updateNewsroom, updateCloudflareAccount } from "./newsroom-store.mjs";
import { deriveNewsroomProposal } from "./derive-proposal.mjs";

const designFields = [...DESIGN_FIELDS.map(field => field.id), "language"];
const readableFields = [...designFields, "cloudflareAccountId"];
function exact(value, fields) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== fields.length || fields.some(field => !Object.hasOwn(value, field))) {
    throw new Error("The settings request has the wrong fields.");
  }
  return value;
}

export function createSettingsService({ newsroomPath, deriveProposal = deriveNewsroomProposal, accountIdFromEnvironment = "" } = {}) {
  async function target() {
    await mkdir(dirname(newsroomPath), { recursive: true, mode: 0o700 });
    return join(await realpath(dirname(newsroomPath)), basename(newsroomPath));
  }
  function snapshot(value) {
    return {
      ...value,
      profile: Object.fromEntries(readableFields.flatMap(field => typeof value.profile?.[field] === "string" ? [[field, value.profile[field]]] : [])),
      accountIdFromEnvironment,
    };
  }
  return {
    async request(path, incoming) {
      const body = await incoming;
      if (path === "/api/settings/read") {
        exact(body, []);
        return snapshot(await readNewsroom(await target()));
      }
      if (path === "/api/settings/design") {
        exact(body, ["expectedRevision", "changes", "confirmReplaceDecline"]);
        exact(body.changes, DESIGN_FIELDS.map(field => field.id));
        const changes = { ...body.changes, language: String(body.changes.languages).split(",")[0].trim() };
        return snapshot(await updateNewsroom(await target(), { ...body, changes }));
      }
      if (path === "/api/settings/cloudflare") {
        exact(body, ["expectedRevision", "cloudflareAccountId"]);
        if (accountIdFromEnvironment) throw new Error("This account ID comes from the launching environment. Change it there and restart Splash.");
        return snapshot(await updateCloudflareAccount(await target(), body));
      }
      if (path === "/api/settings/derive") {
        exact(body, ["url"]);
        if (typeof body.url !== "string" || body.url.length > 4096) throw new Error("Enter a public newsroom website URL.");
        const result = await deriveProposal(body.url);
        if (!result.ok) throw new Error(result.message || "The website could not be read. Enter the design manually.");
        return result;
      }
      throw new Error("This settings route does not exist.");
    },
  };
}
