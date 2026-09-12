# both-dates-in-the-row-label

- kind: imported
- name: Where a bar is a duration, the row label carries the span's own two dates
- applies: the beat draws two or more spans
- draws: annot
- priority: 8
- evidence: aljazeera-com-news-2025-10-1-a-history-of-us-government-shutdowns-ever
- evidence: abc-net-au-news-2018-08-23-malcolm-turnbull-leadership-spills-chart-10
- detect: every row's label in the delivered artifact holds that row's own start and end

## The rule

Print both dates beside the bar. It costs a gutter and it removes the form's characteristic
misreading.

## The misreading it removes

A bar on a date axis is read as a POSITION by a reader who came for "when", and as a LENGTH by one
who came for "how long", and the same mark answers both questions differently. Al Jazeera writes both
dates in the row label — this base's record of it says the cost is a gutter and the gain is that the
misreading is gone. ABC does the same in one line, `Name | start – end`, with no extra column at all.

## Its own corollaries, from the same two records

**Abbreviate the closing year, never the opening one** (ABC): `1990–95` reads; `90–1995` does not.
And a **missing end date written as a trailing dash** is the whole notation for a span still running
— which is the neighbouring treatment, `an-open-span-says-it-is-open`.
