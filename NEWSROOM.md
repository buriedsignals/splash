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
`en`, …). THE COPY'S LANGUAGE IS DECIDED BY THE FIRST OF THESE THAT ANSWERS: the journalist's own
request, else this field's primary, else the language of the beat's static sibling. So a French
request against an English profile is not a contradiction — the request wins — and a request that
says nothing lands on the newsroom's own primary rather than on a guess. A profile
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
`typefaces` lists the house fonts, most prominent first, and the composer READS IT: the list is a
ladder walked against an art direction's own roles in the direction's prominence order, so the first
face sets the most prominent voice, the next one the next role, and a role the list does not reach
keeps the design base's own ladder. A face enters only when there is a file for it at the weights
and slants those registers ask for and it covers the words they set; one that cannot is named in the
composition's report with the reason, never dropped in silence. Name faces Google Fonts serves
(`Source Serif 4`, not `Source Serif`) — a render draws from files, and a licensed or system face
installed on one machine is not one it can use.
`credit` is OPTIONAL: the newsroom's standing credit convention, written the way it should appear
on a visual, with `{source}` where each story's own source goes. Preflight reads it back so a
journalist is not asked to invent a credit line per story. Leave it out and nothing breaks —
preflight then says plainly that no house convention is recorded and credit is asked per story.
`cloudflareAccountId` is OPTIONAL and non-secret: the 32-character account id used to validate a
separately stored Cloudflare token. The token itself never belongs in this file.
`cmsKind` and `cmsEndpoint` are OPTIONAL and must be recorded together. They describe the newsroom's
Livingdocs or We.Publish service without storing its credential; no CMS token belongs here.
