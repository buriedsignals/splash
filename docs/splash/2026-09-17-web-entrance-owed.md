# The web entrance is owed

`skills/splash/test/web-entrance-is-an-addition.test.ts` asserted that a delivered web page
enters — that the picture arrives as an addition rather than appearing whole — and it was red on
all 120 delivered web pages (40 beats × 3 directions).

The failure was diagnosed, on 2026-09-17, as a **real gap and not a stale test**: the entrance was
specified but never wired into `chart-web`'s render path, so no delivered page has ever carried
one. Re-rendering the whole web corpus that day did not move the verdict.

The owner chose to remove the test for now rather than hold the corpus red on work that is not
scheduled. The test file was deleted in the same commit as this note; recover it from git history
(`git log -- skills/splash/test/web-entrance-is-an-addition.test.ts`) when the entrance is wired.

What is owed, when the work is picked up:

1. Wire the entrance into `chart-web`'s render path, so a delivered page's picture arrives as an
   addition.
2. Re-render the 40 web beats in their three directions.
3. Restore the test from history and confirm it goes green on the 120 pages without exemptions.

Until then, no guard holds this promise, and a web page may ship with no entrance at all.
