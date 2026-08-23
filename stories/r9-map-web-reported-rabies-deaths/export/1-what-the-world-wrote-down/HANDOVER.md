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

## The live map, the two copies of this page, and the key one of them carries

This page draws its map live, so a reader can pan and zoom it, and that takes a MapTiler key.
So you have been given the page twice:

- **`keyed/reported-rabies-deaths-2024.html`** — **the copy to publish.** Your MapTiler key was substituted into it when this delivery was made. It sits in a folder version control cannot see, so the key never enters any repository.
- **`reported-rabies-deaths-2024.html`** — the copy kept beside your story, as the record. It does not carry a key: it carries the placeholder `__MAPTILER_KEY__`. Opened on its own it shows the map layer baked into the file, complete and readable, and does not pan or zoom.

The key that was substituted is your development key, which is not restricted to your own
domains, and anyone who opens the published article can read it out of the page.

What that costs you, plainly. The tiles this map draws are billed to your MapTiler account, by
whoever is using the key. And if that account ever reaches 100% of its spending limit, MapTiler
switches off **every** key on it — including the maps in articles you published years ago.

The way to close that, when you want to: create a second MapTiler key restricted to your own
domains, and record it on the setup page as `MAPTILER_DELIVERY_KEY`. Deliveries after that
substitute the restricted key, which is worth nothing to anyone who lifts it out of the page.
