# What you have, and where it goes

This is the web-page form of this beat, delivered. Everything below is what you recorded during
the exchange, read back — nothing here is new.

## The files

- **`reported-rabies-deaths-2024.html`** — the page itself — one self-contained file, nothing else to run

## Where it goes in the article

Follows the paragraph beginning 'Globally there are an estimated 59 000 deaths from rabies annually; however, due to underreporting, documented case numbers often differ from the estimate.' That paragraph gives the estimate, so the visual must give the other half — what was actually filed, country by country, and which countries filed nothing.

## The alt text

Paste this as the image's alternative text. A reader using a screen reader gets the finding,
not a description of a chart.

> A world choropleth of 194 countries shaded by the number of human rabies deaths each reported to WHO for 2024, in 6 classes from 0 to 250 and over. 94 countries filed nothing and are painted in a neutral no-reading fill, including India, China and Pakistan. The darkest countries are Afghanistan, which reported 641, the highest of any country, together with the Philippines, Ghana and South Sudan. The 100 countries that did file reported 3 021 deaths between them, against WHO's standing estimate of about 59 000 a year.

## The credit line

> World Health Organization, Global Health Observatory — indicator NTD_RAB2, \"Reported number of human rabies deaths\" (retrieved 23 August 2026)

## The live map in this file, and the key it carries

This page draws its map live, so a reader can pan and zoom it. The key that lets it draw is
inside the file: anyone who opens the published article can read it, and it is your development
key, which is not restricted to your own domains.

What that costs you, plainly. The tiles this map draws are billed to your MapTiler account, by
whoever is using the key. And if that account ever reaches 100% of its spending limit, MapTiler
switches off **every** key on it — including the maps in articles you published years ago.

The way to close that, when you want to: create a second MapTiler key restricted to your own
domains, and record it on the setup page as `MAPTILER_DELIVERY_KEY`. Deliveries after that carry
the restricted key, which is worth nothing to anyone who lifts it out of the page.

## The one thing this does not show

You named this limit yourself, and it belongs beside the visual — in the caption or the
paragraph next to it — not only in your notes.

> These are REPORTED deaths, not deaths. WHO's own fact sheet says so in one sentence — \"due to underreporting, documented case numbers often differ from the estimate\" — and the arithmetic says how far: 3 021 written down against an estimated 59 000 a year. A blank cell is not a zero: 94 countries filed nothing and are drawn as no-data, never as 0. A reported 0 is a reading and is drawn as one. The counts are RAW counts of people, never a rate: the file carries no population column and dividing an under-report by a population would invent a risk nobody measured. Natural Earth folds some reporting territories into the state that administers them, so a small number of WHO readings land on no shape at all and are named in the caveat.
