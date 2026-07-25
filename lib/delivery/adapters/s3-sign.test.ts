// Golden tests for the SigV4 signer. The two golden strings below (`FULL_CANONICAL_REQUEST`,
// `FULL_STRING_TO_SIGN`) were NOT copied from this module's own output — they were computed by
// an independent script (hand-transcribed from AWS's published spec, using only node:crypto,
// sharing no code with lib/delivery/adapters/s3-sign.ts) and then checked line-by-line against
// the spec text quoted below. A golden generated from the implementation under test and never
// checked against anything external is a tautology; this one is checked.
//
// Spec source: "Create a signed AWS API request" (AWS IAM User Guide),
// https://docs.aws.amazon.com/IAM/latest/UserGuide/create-signed-request.html
// (fetched 2026-07-25; canonical request template, canonical-headers rule, string-to-sign
// template, and the SigV4 signing-key HMAC chain quoted from that page).
import { describe, it, expect } from "bun:test";
import {
  signS3Request,
  canonicalRequest,
  stringToSign,
  canonicalUri,
} from "./s3-sign";

const BASE = {
  method: "PUT",
  path: "/newsroom-bucket/embeds/primes.html",
  body: "<html></html>",
  headers: { "content-type": "text/html; charset=utf-8" },
  host: "s3.eu-west-1.amazonaws.com",
  region: "eu-west-1",
  accessKeyId: "AKIDEXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
  now: new Date("2026-07-25T12:00:00Z"),
};

// SHA-256("<html></html>") in lowercase hex, computed independently via
// `createHash("sha256").update(body).digest("hex")` — the {{HashedPayload}} the spec requires
// ("Hex(SHA256Hash(payload))"), and the same value the canonical request AND the
// x-amz-content-sha256 header must both carry (spec: "the x-amz-content-sha256 header is
// required for Amazon S3 ... it provides a hash of the request payload").
const PAYLOAD_SHA256 =
  "b633a587c652d02386c4f16f8c6f6aab7352d97f16367c3c40576214372dd628";

// Verified by hand, line by line, against the spec's canonical-request template
//   {{HTTPMethod}}\n{{CanonicalURI}}\n{{CanonicalQueryString}}\n{{CanonicalHeaders}}\n
//   {{SignedHeaders}}\n{{HashedPayload}}
// where {{CanonicalHeaders}} is ITSELF "name:trim(value)\n" repeated per header — so its own
// trailing "\n" plus the template's "\n" after it produces the blank line at index 7 below.
// This is not a guess: AWS's own worked example in the same doc (ListUsers) shows the identical
// shape — a blank line between the last canonical header and SignedHeaders.
const FULL_CANONICAL_REQUEST = [
  "PUT", // {{HTTPMethod}} — verbatim, no transform (spec: "GET, PUT, HEAD, DELETE")
  "/newsroom-bucket/embeds/primes.html", // {{CanonicalURI}} — path has no chars outside the
  // unreserved set (A-Z a-z 0-9 - . _ ~) or "/", so UriEncode is the identity here
  "", // {{CanonicalQueryString}} — "If the URI does not include a ?, ... set the canonical
  // query string to an empty string ... You will still need to include the newline character"
  "content-type:text/html; charset=utf-8", // header 1 of 4, sorted alphabetically, name
  // lowercased, value Trim()-med (already had no leading/trailing space here)
  "host:s3.eu-west-1.amazonaws.com", // header 2 — "CanonicalHeaders list must include ... HTTP
  // host header"
  `x-amz-content-sha256:${PAYLOAD_SHA256}`, // header 3 — S3-specific required header
  "x-amz-date:20260725T120000Z", // header 4 — an x-amz-* header, therefore mandatory in the
  // signed set per spec ("Any x-amz-* headers that you plan to include ... must also be added")
  "", // blank line: canonical-headers block's own trailing "\n" + the template's "\n" — see
  // comment above the array
  "content-type;host;x-amz-content-sha256;x-amz-date", // {{SignedHeaders}} — same 4 names,
  // alphabetically sorted, semicolon-joined (spec: "alphabetically sorted, semicolon-separated
  // list of lowercase request header names")
  PAYLOAD_SHA256, // {{HashedPayload}} — last line, NOT terminated by "\n" (join("\n") below
  // adds no trailing newline after the final element)
].join("\n");

// Verified against the spec's string-to-sign template
//   {{Algorithm}}\n{{RequestDateTime}}\n{{CredentialScope}}\n{{HashedCanonicalRequest}}
// with CredentialScope = "YYYYMMDD/region/service/aws4_request" (spec, SigV4 branch).
// HashedCanonicalRequest = Hex(SHA256(FULL_CANONICAL_REQUEST)), computed independently
// (createHash("sha256").update(canonicalRequest).digest("hex")) — this is the one value in this
// file that is NOT hand-checkable digit-by-digit against the spec text (no published test
// vector matches this exact PUT+body+bucket-path combination); it is checked instead by
// recomputing it via a second, code-independent script and confirming it matches. Everything
// upstream of it (the canonical request it hashes) IS hand-verified against the spec above.
const CANONICAL_REQUEST_SHA256 =
  "31eb8296ed54ccd6804683721a51fcaddbfa4042579286836779908df287e213";
const FULL_STRING_TO_SIGN = [
  "AWS4-HMAC-SHA256", // {{Algorithm}} — "Use AWS4-HMAC-SHA256 to specify the HMAC-SHA256 hash
  // algorithm" (SigV4, not SigV4a)
  "20260725T120000Z", // {{RequestDateTime}} — ISO 8601, same value as x-amz-date
  "20260725/eu-west-1/s3/aws4_request", // {{CredentialScope}} — date/region/service/terminator,
  // lowercase region+service+terminator per spec
  CANONICAL_REQUEST_SHA256, // {{HashedCanonicalRequest}} — last line, no trailing newline
].join("\n");

// canonicalUri is exported specifically so lib/delivery/adapters/s3.ts can encode the ACTUAL
// fetch() request path the identical way this module encodes it internally for the signature —
// s3.ts used to keep its own byte-for-byte copy of this logic, which is exactly the drift
// hazard these tests exist to close off (its failure mode is a cryptic signature-mismatch 403
// on a real server, hard to trace back to "two encoders disagree"). Pinned directly here, on
// the exported function itself, rather than only indirectly through canonicalRequest() above.
describe("canonicalUri", () => {
  it("should percent-encode a space and a plus, unlike encodeURIComponent", () => {
    expect(canonicalUri("/bucket/a key+1.html")).toBe(
      "/bucket/a%20key%2B1.html",
    );
  });

  it("should percent-encode non-ASCII bytes as their UTF-8 byte sequence", () => {
    // "é" is 2 UTF-8 bytes (0xC3 0xA9) — this pins byte-level encoding, not code-point encoding.
    expect(canonicalUri("/bucket/élections.html")).toBe(
      "/bucket/%C3%A9lections.html",
    );
  });

  it("should preserve slashes as segment separators, never encoding them", () => {
    expect(canonicalUri("/a/b/c.html")).toBe("/a/b/c.html");
  });

  it("should leave the unreserved set (letters, digits, - . _ ~) untouched", () => {
    expect(canonicalUri("/a-b_c.d~e/F1.html")).toBe("/a-b_c.d~e/F1.html");
  });
});

describe("signS3Request", () => {
  it("should put the payload hash, the amz date and the host in the canonical request", () => {
    const c = canonicalRequest(BASE);
    const lines = c.split("\n");
    expect(lines[0]).toBe("PUT");
    expect(lines[1]).toBe("/newsroom-bucket/embeds/primes.html");
    expect(c).toContain("host:s3.eu-west-1.amazonaws.com");
    expect(c).toContain("x-amz-date:20260725T120000Z");
  });

  it("should list signed headers lowercased and sorted", () => {
    const c = canonicalRequest(BASE);
    const signed = c.split("\n").at(-2);
    expect(signed).toBe("content-type;host;x-amz-content-sha256;x-amz-date");
  });

  it("should scope the string to sign to the region, the s3 service and the request date", () => {
    expect(stringToSign(BASE).split("\n")[2]).toBe(
      "20260725/eu-west-1/s3/aws4_request",
    );
  });

  // The full-string goldens: a stronger check than the structural assertions above, because a
  // bug that shuffles two header lines or drops the blank-line separator would still satisfy
  // every assertion above (it only inspects lines[0], lines[1], the -2 line, and a `toContain`)
  // but would fail this exact-match.
  it("should match the hand-verified canonical request byte for byte", () => {
    expect(canonicalRequest(BASE)).toBe(FULL_CANONICAL_REQUEST);
  });

  it("should match the hand-verified string to sign byte for byte", () => {
    expect(stringToSign(BASE)).toBe(FULL_STRING_TO_SIGN);
  });

  it("should produce the same signature for the same input, and a different one for a changed body", () => {
    const a = signS3Request(BASE).headers.authorization;
    const b = signS3Request(BASE).headers.authorization;
    const c = signS3Request({ ...BASE, body: "<html>x</html>" }).headers
      .authorization;
    expect(a).toBe(b);
    expect(c).not.toBe(a);
  });

  it("should change the signature when only the instant changes, so a stale date cannot be reused", () => {
    const later = signS3Request({
      ...BASE,
      now: new Date("2026-07-26T12:00:00Z"),
    });
    expect(later.headers.authorization).not.toBe(
      signS3Request(BASE).headers.authorization,
    );
    expect(later.headers["x-amz-date"]).toBe("20260726T120000Z");
  });

  it("should never place the secret key in any produced header", () => {
    const h = signS3Request(BASE).headers;
    expect(JSON.stringify(h)).not.toContain(BASE.secretAccessKey);
    expect(h.authorization).toContain("AKIDEXAMPLE");
  });

  it("should percent-encode a key segment containing a space or a plus", () => {
    // UriEncode() rule: percent-encode every byte except the unreserved set (A-Z a-z 0-9 - . _
    // ~); space and "+" are both outside that set, so both get percent-encoded — unlike
    // encodeURIComponent, which leaves "+" untouched because it treats it as already-safe.
    const c = canonicalRequest({ ...BASE, path: "/b/a key+1.html" });
    expect(c.split("\n")[1]).toBe("/b/a%20key%2B1.html");
  });

  // Regression: found by stress-probing, not by the golden strings above (none of them exercise
  // a header value with an internal run of spaces). Spec, canonical-headers values: "trim any
  // leading or trailing spaces" AND, separately, "convert sequential spaces to a single space" —
  // a plain .trim() satisfies only the first rule.
  it("should collapse sequential internal spaces in a header value to one", () => {
    const c = canonicalRequest({
      ...BASE,
      headers: { "content-type": "text/html;    charset=utf-8" },
    });
    expect(c.split("\n")[3]).toBe("content-type:text/html; charset=utf-8");
  });
});
