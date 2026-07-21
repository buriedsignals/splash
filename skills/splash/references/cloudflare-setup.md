# One-time Cloudflare setup (splash EXPORT reference — only when a journalist first picks the embed form)

No app, no container, no volume — three values in `.env`, on the NEWSROOM'S OWN Cloudflare account:

```
CLOUDFLARE_API_TOKEN="…"     # account API token, permission: Cloudflare Pages: Edit
CLOUDFLARE_ACCOUNT_ID="…"    # Workers & Pages page → Account details
SPLASH_EMBED_PROJECT="…"     # e.g. heidi-news-splash — becomes the PUBLIC url
```

Create the token at <https://dash.cloudflare.com> → **Manage Account → API Tokens → Create Token**,
with the **Cloudflare Pages: Edit** permission. The installer collects and verifies all three.

`deploy-embed.mjs` creates the Pages project on first use and deploys over plain HTTPS — **no wrangler
CLI and no Node.js runtime**. Each visual becomes a branch of that project, published at
`https://<visual-slug>.<project>.pages.dev`.

Two rules the platform enforces, encoded in `src/cloudflare-pages.ts` (measured — see
`docs/superpowers/specs/2026-07-19-cloudflare-pages-embed-adapter-design.md`):

- **`SPLASH_EMBED_PROJECT` must identify the newsroom.** It is the public URL, so generic names
  (`splash`, `embeds`, `demo`…) are refused: every newsroom would otherwise share one hostname.
- **The visual slug is normalised before it is sent.** Cloudflare rewrites branch labels lossily —
  it DELETES accented characters (`Élections` → `lections`), turns `_` into `-`, truncates at 28
  chars and appends a random suffix on collision. Splash strips diacritics and appends its own
  deterministic digest so a French title yields a readable, stable URL.

A newsroom's FIRST embed takes ~100 s (Cloudflare provisions the project); later ones take seconds.
The deploy is only reported as delivered once the URL actually serves the artifact's own bytes.
