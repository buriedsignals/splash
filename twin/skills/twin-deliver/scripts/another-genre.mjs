// AFTER THE DELIVERY, THE OFFER NOBODY WAS MAKING.
//
// From the owner's own run, 2026-08-10: *"À la toute fin il ne me propose pas d'exporter sous un
// autre genre si jamais."* He chose an interactive web chart, received it, and the run ended. Nobody
// asked whether he also wanted the same beat as a still for print or as a video for a feed — which
// is the entire point of a toolchain that can produce four genres from one beat, and the moment a
// newsroom actually wants it: the article goes out, and then someone needs a square for a social
// post.
//
// THIS IS AN OFFER, NOT A QUESTION CHAIN. It names the genres this beat could ALSO be produced in,
// says what each is good for and what it costs in time, and stops. Declining is a recorded answer
// like every other answer in this tool, so the run ends cleanly whether it is taken or not.
//
// AND IT IS NOT A MENU OF EVERYTHING THE TOOLCHAIN CAN DO IN THE ABSTRACT. Three filters run before
// a genre is named, and a genre that fails any of them is either withheld or shown as unavailable
// with what would open it — never offered:
//
//   1. the pair must be PRODUCIBLE for this beat's medium (`PRODUCIBLE_GENRES` below);
//   2. the medium's capability must be OPEN (`capabilityGap`, the same verdict the storyboard's
//      genre gate consults) — a capability shut for want of a key is a legitimate answer, said with
//      how to open it;
//   3. the beat's own data or claim must survive the genre. That one is EDITORIAL, so it is an
//      input: `notSuited` carries the genres this beat should not be offered and the reason each,
//      recorded during the exchange rather than guessed at here.
//
// TAKING ONE MEANS PRODUCING THE BEAT AGAIN, in that genre, with its own size, its own delivery form
// and its own approval. It does not mean quietly emitting every artifact at once — the original
// Splash over-produced in exactly that way and it was deliberately reversed.
//
// A REIMPLEMENTATION, not an import. `twin-storyboard/scripts/genre-catalog.mjs` holds the same
// medium × genre knowledge for the genre GATE; a skill directory has to stay copy-pasteable on its
// own, so this is a second reading of one rule, cross-checked by `test/another-genre.test.ts`
// (a test may import out; runtime code may not).

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Every genre a medium can actually be walked to — a producer that renders it AND a delivery form
// for it. Mirrors `GENRE_CATALOG`'s pairs. `image` reaching only static and scrolly is the point of
// an ABSENT entry: an image beat is never offered a video it has no producer for.
export const PRODUCIBLE_GENRES = {
  chart: ["static", "web", "video", "scrolly"],
  map: ["static", "web", "video", "scrolly"],
  image: ["static", "scrolly"],
};

// What each genre is FOR and what it costs the journalist — their terms, their newsroom, their time.
// Not a capability table: nothing here says which of our skills renders it, because that is not
// their question and never was.
const WHAT_A_GENRE_IS_FOR = {
  static: {
    gives:
      "one image, at the size you pick — print, a newsletter, a PDF, anywhere a page cannot run code",
    costs: "the quickest of the four: the same data redrawn, one review",
  },
  web: {
    gives:
      "a page a reader moves through — hover, keyboard, and it fills whatever column your CMS gives it",
    costs: "quick: one page to look at and approve, nothing to host",
  },
  video: {
    gives:
      "a short film that reveals the finding over a few seconds — social feeds, stories, a screen in a newsroom",
    costs:
      "the slowest: it renders frame by frame, and you review the moving version, not a picture of it",
  },
  scrolly: {
    gives:
      "a scroll-driven piece where the reader walks through several readings of the same visual",
    costs:
      "the largest: it needs its own steps written, one per thing you want said, and a longer review",
  },
};

/**
 * A DUPLICATE of `splash-twin/scripts/preflight.mjs`'s `capabilityGap`, carried rather than
 * imported, for the same reason as everything else in this file. `null` when the medium is open;
 * otherwise the exact line to surface, phrased as an unavailable CAPABILITY.
 */
export function capabilityGap(capabilities, medium) {
  const row = capabilities?.[medium];
  if (!row || row.available) return null;
  return `${row.opens} are unavailable: ${row.reason}`;
}

/**
 * The genres this beat could ALSO be produced in, each with a verdict.
 *
 *   - `offered`   — reachable, and nothing says this beat should not be shown that way.
 *   - `closed`    — the medium's capability is shut. `opens` says what would open it. NOT offered.
 *   - `unsuitable`— the journalist's own reason, from `notSuited`. NOT offered.
 *
 * The delivered genre is never in the list: it is the one they already have.
 */
export function otherGenresFor({ medium, deliveredGenre, capabilities = {}, notSuited = [] }) {
  const producible = PRODUCIBLE_GENRES[medium];
  if (!producible) {
    throw new Error(
      `${JSON.stringify(medium)} is not a medium this toolchain produces — ${Object.keys(PRODUCIBLE_GENRES).join(", ")}`,
    );
  }
  if (!deliveredGenre) {
    throw new Error("otherGenresFor needs the genre that was just delivered, so it is not offered again");
  }

  // A reason is REQUIRED, and it is journalist-facing: "this beat should not be a video" with no
  // reason is not an editorial judgement, it is a silence the journalist cannot argue with.
  const unsuitable = new Map();
  for (const entry of notSuited) {
    const genre = entry?.genre;
    const reason = String(entry?.reason ?? "").trim();
    if (!genre || !reason) {
      throw new Error(
        `notSuited needs a genre AND the reason it does not suit this beat — got ${JSON.stringify(entry)}`,
      );
    }
    if (/\bskills\//.test(reason) || /\.(mjs|mts|cjs|cts|ts|tsx|js|jsx)\b/.test(reason)) {
      throw new Error(
        "a notSuited reason names this toolchain's own code, and this offer is written for the journalist. A defect in our code goes to stories/<slug>/NOTES-FOR-MAINTAINER.md",
      );
    }
    unsuitable.set(genre, reason);
  }

  const gap = capabilityGap(capabilities, medium);

  return producible
    .filter((genre) => genre !== deliveredGenre)
    .map((genre) => {
      const about = WHAT_A_GENRE_IS_FOR[genre];
      if (unsuitable.has(genre)) {
        return { genre, verdict: "unsuitable", because: unsuitable.get(genre) };
      }
      if (gap) {
        return {
          genre,
          verdict: "closed",
          because: gap,
          opens: capabilities[medium]?.fill ?? "",
        };
      }
      return { genre, verdict: "offered", ...about };
    });
}

/**
 * The offer as the journalist reads it. Rendered from the rows above and from nothing else — the
 * same closed-input discipline `format-handover.mjs` documents, and for the same reason: this is
 * journalist-facing text, and a free-text field is how a maintainer sentence reaches them.
 */
export function formatGenreOffer(rows, { beatName } = {}) {
  const offered = rows.filter((row) => row.verdict === "offered");
  const closed = rows.filter((row) => row.verdict === "closed");
  const unsuitable = rows.filter((row) => row.verdict === "unsuitable");

  const lines = [
    `You have this beat${beatName ? ` (${beatName})` : ""} in the form you chose. The same finding can`,
    "be produced in other forms, if you want them — each is a separate piece of work: you pick its",
    "size, you see it, you approve it, and you choose how it is delivered, exactly as you just did.",
    "",
  ];

  if (offered.length > 0) {
    lines.push("**What else this beat could be:**", "");
    for (const row of offered) {
      lines.push(`- **${row.genre}** — ${row.gives}. *${row.costs}.*`);
    }
    lines.push("");
  } else {
    lines.push("There is no other form this beat can take right now.", "");
  }

  if (closed.length > 0) {
    lines.push("**Not available at the moment:**", "");
    for (const row of closed) {
      lines.push(`- **${row.genre}** — ${row.because}${row.opens ? `. To open it: ${row.opens}` : ""}`);
    }
    lines.push("");
  }

  if (unsuitable.length > 0) {
    lines.push("**Not right for this beat:**", "");
    for (const row of unsuitable) {
      lines.push(`- **${row.genre}** — ${row.because}`);
    }
    lines.push("");
  }

  lines.push(
    offered.length > 0
      ? "Name one, or say you are done — both are an answer, and either ends the story cleanly."
      : "Say you are done, and the story is closed.",
    "",
  );

  return lines.join("\n");
}

// THE ANSWER IS A FACT ON DISK, like every other gate in this journey.
//
// A dotfile, because `export/<beat>/` is a directory the journalist opens and the delivered files
// are what belongs in their eye. `materialise` writes it as `pending` the moment a beat is
// delivered, so a delivered beat is PROVABLY unanswered until somebody asks — which is what makes
// "the run never offered another genre" a state that can be seen rather than a habit that can be
// forgotten.
export const GENRE_OFFER_RECEIPT = ".another-genre";
export const PENDING = "pending";

export async function recordGenreAnswer({ exportDir, answer, genre }) {
  if (answer !== "declined" && answer !== "taken") {
    throw new Error(`an answer is "declined" or "taken" — got ${JSON.stringify(answer)}`);
  }
  if (answer === "taken" && !genre) {
    throw new Error('a "taken" answer names the genre the journalist asked for next');
  }
  await writeFile(
    join(exportDir, GENRE_OFFER_RECEIPT),
    answer === "taken" ? `taken ${genre}\n` : "declined\n",
  );
}

/**
 * Has this delivery closed? A delivered beat is not finished until the journalist has been offered
 * the other forms and has ANSWERED — taking one or declining, both clean.
 *
 * Returns `{closed, missing}` in the same shape `whereIs` reports a phase, so the story-level gate
 * can consult it without learning a second vocabulary.
 */
export async function deliveryClosed(exportDir) {
  const receipt = await readFile(join(exportDir, GENRE_OFFER_RECEIPT), "utf8").catch(() => null);
  const answer = receipt?.trim() ?? "";
  if (answer === "" || answer === PENDING) {
    return {
      closed: false,
      missing: ["this beat was delivered and never offered in another genre"],
      answer: answer === PENDING ? PENDING : null,
    };
  }
  return { closed: true, missing: [], answer };
}
