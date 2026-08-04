// A GraphQL file upload, as the CMS's media server wants it.
//
// WHY THIS EXISTS. An interactive visual travels inside an article as markup, in an HTML block.
// An image cannot: the block that renders a picture takes an `imageID` the media server issued,
// never bytes (measured — `ImageBlockInput` carries `imageID`, `caption`, `linkUrl` and nothing
// resembling a file). So for a static PNG there is exactly one way into a journalist's piece,
// and it starts here: upload the file, get an id, then insert a block that points at it.
//
// The wire format is the GraphQL multipart request spec, not JSON:
//   - part `operations` — the query and its variables, with `null` where the file belongs;
//   - part `map`        — `{"0": ["variables.file"]}`, which part fills which null;
//   - part `0`          — the bytes.
// Assembled as BYTES throughout: building this as a JS string corrupts any file whose bytes are
// not valid UTF-8, which is every PNG.

export type UploadBody = {
  body: Uint8Array;
  boundary: string;
  headerContentType: string;
};

/**
 * A boundary that cannot occur inside the payload.
 *
 * Not decoration: a boundary appearing in the bytes would end the part early and the server
 * would receive a truncated image — a corruption with no error attached to it. Deterministic
 * rather than random, because a random one cannot be reasoned about in a test and this codebase
 * cannot call Math.random in the places that would want to.
 */
function boundaryFor(payload: Uint8Array): string {
  const haystack = Buffer.from(payload).toString("binary");
  let n = 0;
  let candidate = "splash-boundary-0";
  while (haystack.includes(candidate)) candidate = `splash-boundary-${++n}`;
  return candidate;
}

export function buildUploadBody(input: {
  query: string;
  variables: Record<string, unknown>;
  file: Uint8Array;
  filename: string;
  contentType: string;
}): UploadBody {
  const boundary = boundaryFor(input.file);
  const operations = JSON.stringify({
    query: input.query,
    variables: input.variables,
  });
  const map = JSON.stringify({ "0": ["variables.file"] });

  const text = (s: string) => Buffer.from(s, "utf8");
  const chunks: Buffer[] = [
    text(
      `--${boundary}\r\n` +
        `content-disposition: form-data; name="operations"\r\n\r\n${operations}\r\n`,
    ),
    text(
      `--${boundary}\r\n` +
        `content-disposition: form-data; name="map"\r\n\r\n${map}\r\n`,
    ),
    text(
      `--${boundary}\r\n` +
        `content-disposition: form-data; name="0"; filename="${input.filename}"\r\n` +
        `content-type: ${input.contentType}\r\n\r\n`,
    ),
    Buffer.from(input.file),
    text(`\r\n--${boundary}--\r\n`),
  ];

  return {
    body: Buffer.concat(chunks),
    boundary,
    headerContentType: `multipart/form-data; boundary=${boundary}`,
  };
}
