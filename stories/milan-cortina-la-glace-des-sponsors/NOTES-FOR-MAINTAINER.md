# Notes for the maintainer

Defects and rough edges found while running this story. **Not for the journalist** — nothing here
was said to them, and nothing here belongs in `export/`. Each entry names the phase it was found in.

## Found at delivery

The hand-over document is written in English while the whole story -- article, takeaway, hand
fields, titles, alt text, credit line -- is in French. The journalist's own words appear inside
an English scaffold: "## Where it goes in the article" above a French sentence.

The exchange's own discipline says the journalist's language governs the ENTIRE exchange,
recaps included, and this is the one artifact they keep. The scaffold is hard-coded prose in the
hand-over formatter; the language is not among the fields it is given, and NEWSROOM.md's
`languages` is never read at this phase.

Not said to the journalist. Recorded here.
