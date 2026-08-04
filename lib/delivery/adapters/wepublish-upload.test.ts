// The multipart body a GraphQL file upload needs.
//
// `uploadImage(file: Upload!, …)` is the CMS's own way in for an image — the block that renders
// a picture takes an `imageID` from the media server, never bytes, so a static PNG cannot travel
// inside an article the way an interactive HTML does. That makes this the ONE mechanism by which
// what Splash produces as an image can land in a journalist's piece at all.
//
// The wire format is not JSON: it is the GraphQL multipart request spec — an `operations` part
// holding the query with a null where the file goes, a `map` part saying which part fills that
// null, and the file itself. Getting any of the three wrong yields a 400 with no explanation,
// which is exactly the kind of thing worth a unit test rather than a live retry loop.
import { describe, it, expect } from "bun:test";
import { buildUploadBody } from "./wepublish-upload";

function partsOf(body: Uint8Array, boundary: string): string[] {
  return Buffer.from(body)
    .toString("binary")
    .split(`--${boundary}`)
    .slice(1, -1);
}

describe("buildUploadBody", () => {
  const file = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // a PNG magic number

  it("should put a null where the file goes and map the part onto it", () => {
    const { body, boundary } = buildUploadBody({
      query: "mutation Up($file: Upload!) { uploadImage(file: $file) { id } }",
      variables: { file: null, tags: [] },
      file,
      filename: "static.png",
      contentType: "image/png",
    });
    const parts = partsOf(body, boundary);
    const operations = parts.find((p) => p.includes('name="operations"'))!;
    const map = parts.find((p) => p.includes('name="map"'))!;

    // The variable the server will fill is null in the operation…
    expect(
      JSON.parse(operations.split("\r\n\r\n")[1]!.trim()).variables.file,
    ).toBeNull();
    // …and the map says part "0" is that variable. Without this the server sees no file at all.
    expect(JSON.parse(map.split("\r\n\r\n")[1]!.trim())).toEqual({
      "0": ["variables.file"],
    });
  });

  it("should send the file's own bytes, with its filename and type", () => {
    const { body, boundary } = buildUploadBody({
      query: "mutation Up($file: Upload!) { uploadImage(file: $file) { id } }",
      variables: { file: null },
      file,
      filename: "static.png",
      contentType: "image/png",
    });
    const filePart = partsOf(body, boundary).find((p) =>
      p.includes('name="0"'),
    )!;
    expect(filePart).toContain('filename="static.png"');
    expect(filePart).toContain("content-type: image/png");
    // The bytes survive: a body assembled as a JS string would mangle these.
    expect(filePart).toContain(Buffer.from(file).toString("binary"));
  });

  it("should give a content-type carrying the same boundary the body uses", () => {
    const built = buildUploadBody({
      query: "q",
      variables: { file: null },
      file,
      filename: "a.png",
      contentType: "image/png",
    });
    expect(built.headerContentType).toBe(
      `multipart/form-data; boundary=${built.boundary}`,
    );
  });

  it("should pick a boundary that cannot appear in the payload", () => {
    // A boundary occurring inside the bytes would truncate the upload silently.
    const tricky = Buffer.from("--splash-boundary-0 something");
    const built = buildUploadBody({
      query: "q",
      variables: { file: null },
      file: tricky,
      filename: "a.png",
      contentType: "image/png",
    });
    const payload = Buffer.from(built.body).toString("binary");
    // Exactly the delimiters the parts need — one opening per part, plus the close.
    const occurrences = payload.split(`--${built.boundary}`).length - 1;
    expect(occurrences).toBe(4); // operations, map, file, closing delimiter
  });
});
