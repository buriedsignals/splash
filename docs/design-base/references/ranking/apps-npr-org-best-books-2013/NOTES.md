# NPR — "Book Concierge: Our Guide To 2013's Great Reads"

- url: http://apps.npr.org/best-books-2013/
- archive: url-list
- type: a long list that **refuses to rank**, navigated by combinable filters
- export: web
- readAs: the app's own page, rendered live and read at rest in the 1440×900 screenshot. The list is
  HTML, so the style route reached its type. Filed for its list-navigation apparatus and for its
  editorial refusal; it is **not** a positional encoding and nothing here evidences one.

## What it is

Over two hundred books NPR staff and critics picked in 2013, shown as a grid of covers with a rail
of category tabs down the left. The page is the annual "best books" slot, and the standfirst says
what it did with it: "(But wait! No best-of lists this year? Here's why we decided to try something
new.)"

## What it does with information

**A desk that publishes a ranking every year declines to order it, and says so above the fold.** The
refusal is the piece's first editorial act and it is stated as a link to its own reasoning, not
buried. For the ranking family this is the negative case worth holding: ordering is a claim, and a
list that cannot honestly support the claim can publish the set and say why.

**The way in is combinable categories, and the piece says that too.** `Gotham SSm | 14 | 400`:
"Choose your own adventure! Use the categories below to search through more than 200 standout titles
selected by NPR staff and critics. (You can also combine categories!) Then click on the books'
covers to find out why we love them." Three separate affordances — filter, combine, drill — named in
one line, in the body register, immediately under the byline and immediately above the rail.

**The current state of the list is louder than the controls that set it.** "Showing all books" is
set at `Gotham SSm | 24 | 500` in `rgb(51, 51, 51)` — a 24 px register, against the 26 category
labels at `Gotham SSm | 15 | 400` in the accent. The filter you have applied is displayed larger
than the filters you might apply. A reader can never be looking at a filtered subset and think it is
the whole.

**Two views of one list, toggled where the list begins.** `Covers` | `List` sits as a paired button
at the top right of the result region, on the same baseline as the status line — a grid of jackets
for browsing, a text list for scanning. The toggle is beside the thing it changes, not in a settings
menu.

**Identity is the object itself.** The mark for a book is its cover. As with a portrait or a flag,
the reader recognises the entry without a lookup — and, unlike a bar, an unfamiliar entry still
gives them something to judge.

## What it does with style

The page is **banded** and the two routes report the two bands: the pixel route's dominant is
`#F2ECE2` at 31.57 % (the warm header field) with `#FFFFFF` at 25.72 % (the list field below it),
while the style route reports the body ground as `rgb(255, 255, 255)`.

Accent `#CD4932`, and both routes agree on it: it is the pixel palette's largest chromatic at
1.43 %, and it is the style route's ink on the 26 category labels (`rgb(205, 73, 50)`). It is the
only chromatic the piece spends — on the rail, and on nothing else.

*The purple family in the pixel palette — `#49227C` at 0.68 %, `#8B5DC5` at 0.36 % and four more
around hue 266° — is the sponsor advertisement in the top right corner, not the piece. Checked
against the capture.*

One family throughout, Gotham SSm, working entirely by size and weight: 44/700 title, 32/400
subtitle, 24/500 status line, 18/700 rail header reversed out of the accent tab, 15/400 categories,
14/400 prose (217 runs) and 14/700 in `rgb(153, 153, 153)` for the grid's own labels (205 runs).

## What is transferable

- **Say the current filter state in a register larger than the filter controls.**
- **Name the interaction, all of it, in one body-register line above the list.**
- **Put a view toggle on the list's own top edge**, beside the status line.
- **Publishing the set and declining to order it is an available editorial move**, and it belongs
  above the fold with its reasoning attached.

## What is this piece's own

Book covers as marks. The rail of 26 categories is sized to a curated set of two hundred; a ranking
of a thousand would need search rather than tabs.

## What was not verified

Every interaction: nothing was clicked, and neither the combining of categories, the `List` view nor
the cover drill-down was exercised. Whether the grid carries any implicit order at all. Whether the
page has a search field further down. The layout of the rail below the fold — only the first eight
of the 26 categories were in frame.
