// AWS Signature Version 4, hand-written over node:crypto. No aws-sdk, no CLI: the S3-compatible
// publisher needs one signed request at a time, and a signing library is a large dependency for
// that. PURE — no process.env, no Date.now(), no `new Date()` with no argument, no I/O. The
// instant is the caller-supplied `now`, which is what makes every call deterministic and lets a
// reviewer recompute canonicalRequest()/stringToSign() by hand against the spec instead of
// trusting the opaque `authorization` header.
//
// Spec: "Create a signed AWS API request" (AWS IAM User Guide),
// https://docs.aws.amazon.com/IAM/latest/UserGuide/create-signed-request.html
// canonicalRequest and stringToSign are exported precisely so that check can be done — see the
// golden tests in s3-sign.test.ts for the line-by-line verification against that page.
import { createHash, createHmac } from "node:crypto";

export type SignInput = {
  method: string; // "PUT" | "GET"
  path: string; // "/bucket/key", already the literal object path
  query?: string; // "" when absent; "policy=" style otherwise
  body: Uint8Array | string;
  headers: Record<string, string>; // caller-supplied, e.g. content-type
  host: string; // "s3.eu-west-1.amazonaws.com"
  region: string;
  service?: string; // defaults to "s3"
  accessKeyId: string;
  secretAccessKey: string;
  now: Date; // INJECTED — the module reads no clock
};

export type SignedRequest = { headers: Record<string, string> };

function sha256Hex(data: Uint8Array | string): string {
  return createHash("sha256").update(data).digest("hex");
}

function hmac(key: Uint8Array | string, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

// YYYYMMDD'T'HHMMSS'Z', the spec's {{RequestDateTime}} format (example in the spec:
// "20130524T000000Z"). `now` is UTC by construction (`Date` is always UTC internally;
// toISOString() renders it as such), so no timezone conversion is needed here.
function amzDate(now: Date): string {
  return now.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

// UriEncode() per the spec: percent-encode every byte EXCEPT the unreserved set
// (A-Z a-z 0-9 - . _ ~). encodeURIComponent gets space right (%20) but leaves "+" untouched
// (it treats "+" as already a valid, unreserved-adjacent character for query strings), so it is
// not used here — every byte outside the unreserved set is encoded by hand instead.
function uriEncodeByte(byte: number): string {
  const ch = String.fromCharCode(byte);
  if (/[A-Za-z0-9\-._~]/.test(ch)) return ch;
  return "%" + byte.toString(16).toUpperCase().padStart(2, "0");
}

function uriEncode(segment: string): string {
  return Buffer.from(segment, "utf8").toJSON().data.map(uriEncodeByte).join("");
}

// Canonical URI: each path SEGMENT is percent-encoded, slashes preserved (spec: "you don't
// encode the / in the absolute path"). Splitting on "/" and re-joining after encoding each
// piece keeps the separators literal while still encoding a "/"-adjacent character inside a
// segment (there are none in practice, since "/" only ever appears as a separator here).
function canonicalUri(path: string): string {
  return path.split("/").map(uriEncode).join("/");
}

function canonicalHeaders(headers: Record<string, string>): {
  block: string;
  signedHeaders: string;
} {
  const lowered = new Map<string, string>();
  for (const [name, value] of Object.entries(headers)) {
    // Spec, canonical-headers values: "trim any leading or trailing spaces" AND "convert
    // sequential spaces to a single space" — two separate rules. Plain .trim() alone (the first
    // draft here) satisfied only the first and left an internal run of spaces untouched, which
    // would sign a DIFFERENT string than what a byte-faithful HTTP client sends once it
    // normalizes the header on the wire — caught by probing a header with internal double
    // spaces, not by the golden tests above (none of them exercise this).
    lowered.set(name.toLowerCase(), value.trim().replace(/ +/g, " "));
  }
  const names = [...lowered.keys()].sort();
  // Each line is "name:trimmed-value\n" — including the LAST one. The blank line that then
  // appears before {{SignedHeaders}} in the full canonical request comes from this trailing
  // newline plus the outer template's own "\n" after {{CanonicalHeaders}} (verified against the
  // spec's own worked ListUsers example, which shows the same blank line).
  const block = names.map((n) => `${n}:${lowered.get(n)}\n`).join("");
  return { block, signedHeaders: names.join(";") };
}

export function canonicalRequest(input: SignInput): string {
  const payloadHash = sha256Hex(input.body);
  const headers = {
    ...input.headers,
    host: input.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate(input.now),
  };
  const { block, signedHeaders } = canonicalHeaders(headers);
  return [
    input.method,
    canonicalUri(input.path),
    input.query ?? "",
    block, // already ends with "\n" — see canonicalHeaders
    signedHeaders,
    payloadHash,
  ].join("\n");
}

export function stringToSign(input: SignInput): string {
  const date = amzDate(input.now);
  const dateStamp = date.slice(0, 8);
  const service = input.service ?? "s3";
  const scope = `${dateStamp}/${input.region}/${service}/aws4_request`;
  return [
    "AWS4-HMAC-SHA256",
    date,
    scope,
    sha256Hex(canonicalRequest(input)),
  ].join("\n");
}

// Signing-key HMAC chain (spec): DateKey -> DateRegionKey -> DateRegionServiceKey -> SigningKey.
// The secret never leaves this function: every downstream value is an HMAC digest, never the
// key itself.
function deriveSigningKey(
  secretAccessKey: string,
  dateStamp: string,
  region: string,
  service: string,
): Buffer {
  const kDate = hmac("AWS4" + secretAccessKey, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

export function signS3Request(input: SignInput): SignedRequest {
  const date = amzDate(input.now);
  const dateStamp = date.slice(0, 8);
  const service = input.service ?? "s3";
  const payloadHash = sha256Hex(input.body);

  const toSign = stringToSign(input);
  const signingKey = deriveSigningKey(
    input.secretAccessKey,
    dateStamp,
    input.region,
    service,
  );
  const signature = hmac(signingKey, toSign).toString("hex");

  const { signedHeaders } = canonicalHeaders({
    ...input.headers,
    host: input.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": date,
  });
  const scope = `${dateStamp}/${input.region}/${service}/aws4_request`;

  return {
    headers: {
      ...input.headers,
      host: input.host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": date,
      // Only the ACCESS KEY id appears here — the secret access key is consumed entirely by
      // deriveSigningKey above and never surfaces in any header.
      authorization:
        `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${scope}, ` +
        `SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  };
}
