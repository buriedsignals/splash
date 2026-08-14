---
name: Buried Signals
url: https://buriedsignals.com
languages: en
brandColor: "#D4A853"
accents: "#5B8A8A"
ground: "#16191B"
typefaces: "Space Grotesk, Courier New"
---

`name` is the newsroom's public name, shown in exported credits.
`url` is the newsroom's website, used to derive its house style when needed.
`languages` lists every language this newsroom publishes in, most-used first (`fr`, `de`, `it`,
`en`, …). The language of a visual follows the ARTICLE and is confirmed with the journalist — this
list is what that confirmation chooses among, so a bilingual newsroom is never guessed at. A profile
written before this field existed carries the singular `language: fr` instead, and stays valid;
either name is read back. Giving both is allowed and means "these are our languages, and this one is
the primary" — but a singular naming a language the list does not hold is refused as a contradiction.
`brandColor` is the PRIMARY house accent colour, as `#rrggbb`.
`accents` is OPTIONAL: further house accent colours, as `#rrggbb`, comma-separated. A house palette
is rarely one colour. Every recorded accent is measured against `ground` by palette, which
never recommends one below the 3:1 non-text contrast floor and shows a failing one failing, with
the nearest passing variant beside it — so a longer list is not a way past the floor. Leave it out
and the newsroom simply has one accent.
`ground` is the house background colour, as `#rrggbb`.
`typefaces` lists the house fonts, most prominent first.
`credit` is OPTIONAL: the newsroom's standing credit convention, written the way it should appear
on a visual, with `{source}` where each story's own source goes. Preflight reads it back so a
journalist is not asked to invent a credit line per story. Leave it out and nothing breaks —
preflight then says plainly that no house convention is recorded and credit is asked per story.
`cloudflareAccountId` is OPTIONAL and non-secret: the 32-character account id used to validate a
separately stored Cloudflare token. The token itself never belongs in this file.
`cmsKind` and `cmsEndpoint` are OPTIONAL and must be recorded together. They describe the newsroom's
Livingdocs or We.Publish service without storing its credential; no CMS token belongs here.
