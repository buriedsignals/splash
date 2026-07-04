import { join, normalize } from "node:path";

const ROOT = process.env.EMBED_HOST_ROOT ?? "/data";

Bun.serve({
  port: 8080,
  async fetch(req) {
    const url = new URL(req.url);
    // prevent path traversal; default to index.html
    let p = normalize(url.pathname).replace(/^(\.\.[/\\])+/, "");
    if (p.endsWith("/")) p += "index.html";
    const file = Bun.file(join(ROOT, p));
    if (!(await file.exists()))
      return new Response("not found", { status: 404 });
    return new Response(file, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "X-Frame-Options": "ALLOWALL",
        "Content-Security-Policy": "frame-ancestors *",
      },
    });
  },
});

console.log("embed-host on :8080");
