import { randomBytes } from "node:crypto";

const MAX_PATH_BYTES = 16 << 10;

function descriptor(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Engine returned no story descriptor");
  if (
    typeof value.storyId !== "string" ||
    !value.storyId ||
    typeof value.canonicalPath !== "string" ||
    !value.canonicalPath
  ) {
    throw new Error("Engine returned an invalid story descriptor");
  }
  if (
    value.storyId.length > 128 ||
    Buffer.byteLength(value.canonicalPath) > MAX_PATH_BYTES ||
    (typeof value.articlePath === "string" &&
      Buffer.byteLength(value.articlePath) > MAX_PATH_BYTES)
  ) {
    throw new Error("Engine returned an overlong story descriptor");
  }
  return Object.freeze({
    storyId: value.storyId,
    canonicalPath: value.canonicalPath,
    articlePath:
      typeof value.articlePath === "string" ? value.articlePath : null,
    hasStoryboard: value.hasStoryboard === true,
  });
}

export function createStoryBinding({
  inspect,
  random = () => randomBytes(24).toString("base64url"),
  sessionId = random(),
  challengeTtlMs = 5 * 60_000,
  now = Date.now,
} = {}) {
  if (typeof inspect !== "function")
    throw new Error("story binding requires Engine inspection");
  if (
    typeof sessionId !== "string" ||
    !sessionId ||
    !Number.isFinite(challengeTtlMs) ||
    challengeTtlMs <= 0
  ) {
    throw new Error("story binding session configuration is invalid");
  }
  let pending = null;
  let bound = null;

  function pendingNow() {
    if (pending && now() - pending.createdAt >= challengeTtlMs) pending = null;
    return pending;
  }

  function authorize(context) {
    if (
      !bound ||
      !context ||
      context.sessionId !== sessionId ||
      typeof context.capability !== "string" ||
      context.capability !== bound.capability
    ) {
      throw new Error(
        "story binding capability is missing, expired, or belongs to another session",
      );
    }
    return bound.descriptor;
  }

  return Object.freeze({
    async nominate(path) {
      if (
        typeof path !== "string" ||
        !path.trim() ||
        Buffer.byteLength(path) > MAX_PATH_BYTES ||
        path.includes("\0")
      ) {
        throw new Error("story nomination requires one bounded path");
      }
      const inspected = descriptor(await inspect(path));
      pending = {
        descriptor: inspected,
        challenge: random(),
        createdAt: now(),
      };
      return inspected;
    },

    pending() {
      const current = pendingNow();
      return current
        ? { descriptor: current.descriptor, challenge: current.challenge }
        : null;
    },

    confirm(challenge) {
      const current = pendingNow();
      if (
        !current ||
        typeof challenge !== "string" ||
        challenge !== current.challenge
      ) {
        throw new Error("story confirmation challenge is missing or expired");
      }
      bound = { descriptor: current.descriptor, capability: random() };
      pending = null;
      return bound.descriptor;
    },

    current() {
      return bound?.descriptor ?? null;
    },

    context() {
      return bound
        ? Object.freeze({ sessionId, capability: bound.capability })
        : null;
    },

    async revalidate(context) {
      const authorized = authorize(context);
      const current = descriptor(await inspect(authorized.canonicalPath));
      if (
        current.storyId !== authorized.storyId ||
        current.canonicalPath !== authorized.canonicalPath
      ) {
        bound = null;
        throw new Error("the bound story changed and must be selected again");
      }
      bound.descriptor = current;
      return current;
    },

    clear() {
      pending = null;
      bound = null;
    },
  });
}
