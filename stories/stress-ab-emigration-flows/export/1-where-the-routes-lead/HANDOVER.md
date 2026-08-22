# What you have, and where it goes

This is the web-page form of this beat, delivered. Everything below is what you recorded during
the exchange, read back — nothing here is new.

## The files

- **`where-the-routes-lead.html`** — the page itself — one self-contained file, nothing else to run

## Where it goes in the article

In the article body, full width, replacing the paragraph that lists the route figures.

## The alt text

Paste this as the image's alternative text. A reader using a screen reader gets the finding,
not a description of a chart.

> A map of western Europe. Eight gold ribbons leave six Portuguese cities and end, with an arrowhead, at five European ones. Ribbon width is the number of people recorded on that route in 2025: Lisboa to London is by far the widest at 18,400, then Lisboa to Paris at 12,100 and Porto to Paris at 9,600. Each destination is labelled with the total arriving on all its routes — Paris 23,600, London 21,200, Zurich 4,200, Luxembourg 3,100, Brussels 2,400.

## The credit line

> recorded emigration register, 2025 extract

## The live map in this file, and the key it needs

This page draws its map live, so a reader can pan and zoom it. **The file you have does not carry
a key.** Where the key goes, it carries the placeholder `__MAPTILER_KEY__`, once, and the key is
put in when the page is served — never written into the file that is stored or committed. Open the
file as it stands and you get the map's fallback picture, complete and correct, with no panning.

What that means when you publish it, plainly. The key that gets injected is billed to your MapTiler
account, by whoever is using it, because a key inside a public page is readable by anyone who opens
the article. And if that account ever reaches 100% of its spending limit, MapTiler switches off
**every** key on it — including the maps in articles you published years ago.

The way to close that, when you want to: create a second MapTiler key restricted to your own
domains, and record it on the setup page as `MAPTILER_DELIVERY_KEY`. Deliveries after that inject
the restricted key, which is worth nothing to anyone who lifts it out of the page.

## The one thing this does not show

You named this limit yourself, and it belongs beside the visual — in the caption or the
paragraph next to it — not only in your notes.

> Return flows are recorded separately and are not in this extract, so no ribbon is a net figure.
