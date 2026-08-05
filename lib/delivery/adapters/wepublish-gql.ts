// The one network door of the We.Publish adapter. Everything the adapter sends goes through
// gqlCall — never a bare fetch — so the two facts that make this API dangerous are enforced in
// a single place instead of at every call site.
//
// See docs/superpowers/specs/2026-07-27-l3-wepublish-design.md §3 (W4, W11, W14).
import {
  DEFAULT_NETWORK_TIMEOUT_MS,
  fetchBounded,
} from "../../core/publishers";
import { fail, ok, type VerbResult } from "../../core/verbs/types";
import { buildUploadBody } from "./wepublish-upload";

/**
 * The request-body ceiling, MEASURED against the live instance (W14): a body of 1 047 298 bytes
 * was accepted and one of 1 062 923 was rejected with a bare HTTP 413 and no GraphQL error body
 * at all. The boundary is the classic 1 MiB body-parser default, and it sits between those two
 * measurements.
 *
 * Enforced HERE, before the socket, because a 413 with an empty body is the least diagnosable
 * failure this API produces: the newsroom would see a number and nothing else. A real produced
 * interactive artifact measured 491 207 bytes (508 664 as a request body, W16) — under this
 * ceiling with less than 2x of headroom, which is exactly why it is guarded mechanically rather
 * than trusted.
 */
export const MAX_REQUEST_BODY_BYTES = 1_048_576;

export type GqlCallInput = {
  /** The full GraphQL URL, configured by the newsroom — `.../v1`, never derived (W1). */
  endpoint: string;
  query: string;
  variables?: Record<string, unknown>;
  /** Absent ⇒ the call is ANONYMOUS. The verification read depends on that (W13). */
  token?: string;
  timeoutMs?: number;
};

export type GqlOk = { data: Record<string, unknown> };

/**
 * One GraphQL call, bounded, with the response inspected the way this API actually behaves.
 *
 * Never throws: every failure is a typed VerbResult (invariant I1).
 */
/**
 * The same call, carrying a FILE. Used by the one path that needs it: an image has to reach the
 * media server before any block can point at it (wepublish-upload.ts explains why).
 *
 * The size ceiling is deliberately NOT applied here. That check exists because a visual travels
 * inside a request body as escaped markup and a 413 comes back bare (W14); an upload is what the
 * media server is FOR, and refusing a 2 MB photograph against a limit meant for inlined markup
 * would be the wrong instrument on the wrong path.
 */
export async function gqlUpload(
  input: GqlCallInput & {
    file: Uint8Array;
    filename: string;
    contentType: string;
  },
): Promise<VerbResult<GqlOk>> {
  const { body, headerContentType } = buildUploadBody({
    query: input.query,
    variables: input.variables ?? {},
    file: input.file,
    filename: input.filename,
    contentType: input.contentType,
  });
  let res: Response;
  try {
    res = await fetchBounded(
      input.endpoint,
      {
        method: "POST",
        headers: {
          "content-type": headerContentType,
          // Apollo's upload handler rejects a multipart request without this (CSRF prevention),
          // and the refusal names neither the header nor the reason.
          "apollo-require-preflight": "true",
          ...(input.token ? { authorization: `Bearer ${input.token}` } : {}),
        },
        body,
      },
      input.timeoutMs ?? DEFAULT_NETWORK_TIMEOUT_MS,
    );
  } catch (e) {
    return fail(
      "engine-failed",
      `wepublish: ${input.endpoint} did not answer the upload: ${(e as Error).message}`,
    );
  }
  return readEnvelope(res, input.endpoint);
}

export async function gqlCall(input: GqlCallInput): Promise<VerbResult<GqlOk>> {
  const body = JSON.stringify({
    query: input.query,
    ...(input.variables !== undefined ? { variables: input.variables } : {}),
  });

  // W14, before any I/O.
  const bytes = Buffer.byteLength(body);
  if (bytes > MAX_REQUEST_BODY_BYTES)
    return fail(
      "invalid-request",
      `wepublish: the request body is too large — ${bytes} bytes exceeds the server's ${MAX_REQUEST_BODY_BYTES}-byte limit, ` +
        `which answers with a bare HTTP 413 and no explanation. A visual this heavy has to be published to a destination that takes the file itself ` +
        `(the newsroom's object storage), or made lighter before it can travel inside a CMS block.`,
    );

  let res: Response;
  try {
    res = await fetchBounded(
      input.endpoint,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(input.token ? { authorization: `Bearer ${input.token}` } : {}),
        },
        body,
      },
      input.timeoutMs ?? DEFAULT_NETWORK_TIMEOUT_MS,
    );
  } catch (e) {
    // NetworkTimeoutError already names the endpoint and the bound it exceeded.
    return fail(
      "engine-failed",
      `wepublish: ${input.endpoint} did not answer: ${(e as Error).message}`,
    );
  }

  // A 413 never carries a GraphQL body, so it is read before any parsing is attempted (W14).
  if (res.status === 413)
    return fail(
      "engine-failed",
      `wepublish: ${input.endpoint} refused the request as too large (HTTP 413) at ${bytes} bytes — ` +
        `the server's body limit is lower than the ${MAX_REQUEST_BODY_BYTES} bytes this adapter allows; ` +
        `it can be raised on the We.Publish deployment, or the visual delivered to a destination that takes the file itself.`,
    );

  return readEnvelope(res, input.endpoint);
}

/**
 * Reading the answer — shared by the JSON call and the upload, because W4 is the fact that
 * decides both: an authentication failure is HTTP 200 with `errors`, so `errors` is read before
 * `data` and before the status. Two copies of that rule would be two chances to lose it.
 */
async function readEnvelope(
  res: Response,
  endpoint: string,
): Promise<VerbResult<GqlOk>> {
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // A proxy in front of the API, an upstream error page, a truncated body. Degrade into a
    // refusal carrying the status and a slice of what came back, never an exception.
    return fail(
      "engine-failed",
      `wepublish: ${endpoint} answered HTTP ${res.status} with a body that is not JSON: ${text.slice(0, 200)}`,
    );
  }

  const envelope = parsed as {
    data?: Record<string, unknown> | null;
    errors?: { message?: string; extensions?: { code?: string } }[];
  };

  // W4 — THE fact. An authentication failure comes back as HTTP 200 with `errors`, and a
  // missing token is indistinguishable from a garbage one. Checking `errors` before `data` is
  // what stops this adapter from reporting a success it did not get.
  if (envelope.errors?.length) {
    const first = envelope.errors[0]!;
    const code = first.extensions?.code;
    // The message is passed through VERBATIM: the caller distinguishes "was not found" (W11 —
    // the signal to create) from a real failure by reading it, so paraphrasing it here would
    // break that.
    return fail(
      "engine-failed",
      `wepublish: ${first.message ?? "unknown GraphQL error"}${code ? ` (${code})` : ""}`,
    );
  }

  if (!res.ok)
    return fail(
      "engine-failed",
      `wepublish: ${endpoint} answered HTTP ${res.status}`,
    );

  if (!envelope.data)
    return fail(
      "engine-failed",
      `wepublish: ${endpoint} answered with neither data nor errors`,
    );

  return ok({ data: envelope.data });
}

/**
 * Does this refusal mean "no such article"? Measured (W11): a missing slug is HTTP 200 plus a
 * GraphQL error reading `Article with slug X was not found.` — it is the signal to CREATE, not
 * a failure to report.
 *
 * Matched on the stable part of the sentence, deliberately not on the whole string: the slug is
 * interpolated into it by the server.
 */
export function isNotFound(message: string): boolean {
  return /was not found/i.test(message);
}
