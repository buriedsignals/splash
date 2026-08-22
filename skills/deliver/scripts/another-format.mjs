// AFTER THE DELIVERY, THE OFFER NOBODY WAS MAKING.
//
// From the owner's own run, 2026-08-10: *"À la toute fin il ne me propose pas d'exporter sous un
// autre format si jamais."* He chose an interactive web chart, received it, and the run ended. Nobody
// asked whether he also wanted the same beat as a still for print or as a video for a feed — which
// is the entire point of a toolchain that can produce four formats from one beat, and the moment a
// newsroom actually wants it: the article goes out, and then someone needs a square for a social
// post.
//
// THIS IS AN OFFER, NOT A QUESTION CHAIN. It names the formats this beat could ALSO be produced in,
// says what each is good for and what it costs in time, and stops. Declining is a recorded answer
// like every other answer in this tool, so the run ends cleanly whether it is taken or not.
//
// AND IT IS NOT A MENU OF EVERYTHING THE TOOLCHAIN CAN DO IN THE ABSTRACT. Three filters run before
// a format is named, and a format that fails any of them is either withheld or shown as unavailable
// with what would open it — never offered:
//
//   1. the pair must be PRODUCIBLE for this beat's medium (`PRODUCIBLE_FORMATS` below);
//   2. the medium's capability must be OPEN (`capabilityGap`, the same verdict the storyboard's
//      format gate consults) — a capability shut for want of a key is a legitimate answer, said with
//      how to open it;
//   3. the beat's own data or claim must survive the format. That one is EDITORIAL, so it is an
//      input: `notSuited` carries the formats this beat should not be offered and the reason each,
//      recorded during the exchange rather than guessed at here.
//
// TAKING ONE RECORDS A REQUEST; it does not schedule or start production. If the newsroom later
// starts that work, the resulting output goes through the gates that apply to its format. This
// receipt must not imply an automatic continuation that `whereIs` does not implement.
//
// A REIMPLEMENTATION, not an import. `storyboard/scripts/format-catalog.mjs` holds the same
// medium × format knowledge for the format GATE; a skill directory has to stay copy-pasteable on its
// own, so this is a second reading of one rule, cross-checked by `test/another-format.test.ts`
// (a test may import out; runtime code may not).

// AND IT IS MADE IN THE STORY'S OWN LANGUAGE (A25, ruling R4). This offer is read at the same moment
// as `HANDOVER.md` and by the same person, so it is held to the same rule: the copy below is keyed
// by language and `language` is READ from `STORYBOARD.md`, never detected and never defaulted.

import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveScaffoldLanguage, untranslatedNotice } from "./journalist-language.mjs";

// Every format a medium can actually be walked to — a producer that renders it AND a delivery form
// for it. Mirrors `FORMAT_CATALOG`'s pairs. `image` reaching only static and scrolly is the point of
// an ABSENT entry: an image beat is never offered a video it has no producer for.
export const PRODUCIBLE_FORMATS = {
  chart: ["static", "web", "video", "scrolly"],
  map: ["static", "web", "video", "scrolly"],
  image: ["static", "scrolly"],
};

// What each format is FOR and what it costs the journalist — their terms, their newsroom, their time.
// Not a capability table: nothing here says which of our skills renders it, because that is not
// their question and never was.
const WHAT_A_FORMAT_IS_FOR = {
  en: {
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
  },
  fr: {
    static: {
      gives:
        "une image, à la taille que vous choisissez — le papier, une infolettre, un PDF, partout où une page ne peut pas exécuter de code",
      costs: "la plus rapide des quatre : les mêmes données redessinées, une relecture",
    },
    web: {
      gives:
        "une page dans laquelle le lecteur se déplace — survol, clavier, et elle occupe la colonne que votre CMS lui donne",
      costs: "rapide : une page à regarder et à valider, rien à héberger",
    },
    video: {
      gives:
        "un court film qui révèle le constat en quelques secondes — fils sociaux, stories, un écran dans la rédaction",
      costs:
        "la plus lente : elle se calcule image par image, et vous validez la version animée, pas une photo de celle-ci",
    },
    scrolly: {
      gives:
        "une pièce guidée par le défilement, où le lecteur traverse plusieurs lectures du même visuel",
      costs:
        "la plus lourde : il faut écrire ses étapes, une par chose à dire, et la relecture est plus longue",
    },
  },
};

// The offer's own sentences, in each language it is made in. Nothing a journalist reads here is a
// literal in the body below — the same rule as `format-handover.mjs`, for the same reason.
const COPY = {
  en: {
    opening: (beatName) => [
      `You have this beat${beatName ? ` (${beatName})` : ""} in the publication format you chose. You can record`,
      "a request for the same finding in another format. This receipt records the request only; it",
      "does not schedule production. If that work starts later, it follows the gates for that format.",
    ],
    offeredHeading: "**Other publication formats for this beat:**",
    nothingElse: "There is no other publication format this beat can take right now.",
    closedHeading: "**Not available at the moment:**",
    opensWith: (opens) => `. To open it: ${opens}`,
    unsuitableHeading: "**Not right for this beat:**",
    close: "Name one, or say you are done — both are an answer, and either ends the story cleanly.",
    closeNothing: "Say you are done, and the story is closed.",
  },
  fr: {
    opening: (beatName) => [
      `Vous avez ce visuel${beatName ? ` (${beatName})` : ""} dans le format de publication que vous avez choisi. Vous pouvez`,
      "enregistrer une demande pour le même constat dans un autre format. Ce reçu enregistre seulement",
      "la demande ; il ne lance aucune production. Si ce travail démarre plus tard, il suit les",
      "validations propres à ce format.",
    ],
    offeredHeading: "**Autres formats de publication pour ce visuel :**",
    nothingElse: "Ce visuel ne peut prendre aucun autre format de publication pour le moment.",
    closedHeading: "**Indisponible pour le moment :**",
    opensWith: (opens) => `. Pour l'ouvrir : ${opens}`,
    unsuitableHeading: "**Pas adapté à ce visuel :**",
    close:
      "Nommez-en un, ou dites que vous avez terminé — les deux sont une réponse, et l'un comme l'autre clôt proprement le sujet.",
    closeNothing: "Dites que vous avez terminé, et le sujet est clos.",
  },
};

// A DUPLICATE of `splash/scripts/preflight.mjs`'s `capabilityGap`, carried rather than
// imported, for the same reason as everything else in this file. `null` when the medium is open;
// otherwise the exact line to surface, phrased as an unavailable CAPABILITY.
//
// NAMED, NOT HIDDEN (A25): this one sentence is assembled from `opens` and `reason`, which preflight
// measures and writes in English. A French offer that reaches its "not available" section therefore
// carries one English line inside it. Closing that means translating preflight's capability rows,
// which belong to another skill and another chantier — it is recorded in `FEEDBACK-2026-08-10.md`
// rather than quietly left for someone to find in a delivered document.
/**
 * THE CAPABILITY SEAM, CARRIED BY THREE SKILLS AND REGISTERED AS ONE DECISION.
 *
 * `capabilities` is the `{map, datawrapper, hostedEmbed}` shape `runPreflight` returns, each row
 * `{id, opens, available, reason}`. Returns `null` when `medium` is open — or unrecognised, because
 * this is declarative and not a gate on mediums it has no opinion about; otherwise the exact line to
 * surface to the journalist, phrased as an unavailable CAPABILITY ("map beats are unavailable: …")
 * and never as an environment failure.
 *
 * `?.` rather than a bare index, and the three copies now agree on it. They did not:
 * `deliver`'s read `capabilities?.[medium]` while `splash`'s and `storyboard`'s read
 * `capabilities[medium]`, so `capabilityGap(undefined, "map")` answered `null` in one skill and
 * THREW in the other two. `storyboard/SKILL.md` had said in so many words that its copy was a
 * carried copy of `splash`'s, and the registry that holds carried copies together did not know.
 *
 * ITS STATED LIMIT, since this is the sentence a later phase acts on: an ABSENT row reads as no gap.
 * That is right when a preflight ran and found the medium fine, and it is an assumption when no
 * preflight ran at all — the two are indistinguishable here, and telling them apart would need the
 * caller to say whether it measured, which no caller does today.
 */
export function capabilityGap(capabilities, medium) {
  const row = capabilities?.[medium];
  if (!row || row.available) return null;
  return `${row.opens} are unavailable: ${row.reason}`;
}

/**
 * The formats this beat could ALSO be produced in, each with a verdict.
 *
 *   - `offered`   — reachable, and nothing says this beat should not be shown that way.
 *   - `closed`    — the medium's capability is shut. `opens` says what would open it. NOT offered.
 *   - `unsuitable`— the journalist's own reason, from `notSuited`. NOT offered.
 *
 * The delivered format is never in the list: it is the one they already have.
 */
export function otherFormatsFor({ medium, deliveredFormat, capabilities = {}, notSuited = [], language }) {
  // The rows carry the journalist-facing `gives`/`costs`, so the language is needed HERE and not
  // only at the rendering: a row built in English and printed under a French heading is the exact
  // half-translated document A25 is about.
  const about = WHAT_A_FORMAT_IS_FOR[resolveScaffoldLanguage(language).written];
  const producible = PRODUCIBLE_FORMATS[medium];
  if (!producible) {
    throw new Error(
      `${JSON.stringify(medium)} is not a medium this toolchain produces — ${Object.keys(PRODUCIBLE_FORMATS).join(", ")}`,
    );
  }
  if (!deliveredFormat) {
    throw new Error("otherFormatsFor needs the format that was just delivered, so it is not offered again");
  }

  // A reason is REQUIRED, and it is journalist-facing: "this beat should not be a video" with no
  // reason is not an editorial judgement, it is a silence the journalist cannot argue with.
  const unsuitable = new Map();
  for (const entry of notSuited) {
    const format = entry?.format;
    const reason = String(entry?.reason ?? "").trim();
    if (!format || !reason) {
      throw new Error(
        `notSuited needs a format AND the reason it does not suit this beat — got ${JSON.stringify(entry)}`,
      );
    }
    if (/\bskills\//.test(reason) || /\.(mjs|mts|cjs|cts|ts|tsx|js|jsx)\b/.test(reason)) {
      throw new Error(
        "a notSuited reason names this toolchain's own code, and this offer is written for the journalist. A defect in our code goes to stories/<slug>/NOTES-FOR-MAINTAINER.md",
      );
    }
    unsuitable.set(format, reason);
  }

  const gap = capabilityGap(capabilities, medium);

  return producible
    .filter((format) => format !== deliveredFormat)
    .map((format) => {
      if (unsuitable.has(format)) {
        return { format, verdict: "unsuitable", because: unsuitable.get(format) };
      }
      if (gap) {
        return {
          format,
          verdict: "closed",
          because: gap,
          opens: capabilities[medium]?.fill ?? "",
        };
      }
      return { format, verdict: "offered", ...about[format] };
    });
}

/**
 * The offer as the journalist reads it. Rendered from the rows above and from nothing else — the
 * same closed-input discipline `format-handover.mjs` documents, and for the same reason: this is
 * journalist-facing text, and a free-text field is how a maintainer sentence reaches them.
 */
export function formatAnotherFormatOffer(rows, { beatName, language } = {}) {
  const scaffold = resolveScaffoldLanguage(language);
  const copy = COPY[scaffold.written];
  const offered = rows.filter((row) => row.verdict === "offered");
  const closed = rows.filter((row) => row.verdict === "closed");
  const unsuitable = rows.filter((row) => row.verdict === "unsuitable");

  const lines = [...untranslatedNotice(scaffold), ...copy.opening(beatName), ""];

  if (offered.length > 0) {
    lines.push(copy.offeredHeading, "");
    for (const row of offered) {
      lines.push(`- **${row.format}** — ${row.gives}. *${row.costs}.*`);
    }
    lines.push("");
  } else {
    lines.push(copy.nothingElse, "");
  }

  if (closed.length > 0) {
    lines.push(copy.closedHeading, "");
    for (const row of closed) {
      lines.push(`- **${row.format}** — ${row.because}${row.opens ? copy.opensWith(row.opens) : ""}`);
    }
    lines.push("");
  }

  if (unsuitable.length > 0) {
    lines.push(copy.unsuitableHeading, "");
    for (const row of unsuitable) {
      lines.push(`- **${row.format}** — ${row.because}`);
    }
    lines.push("");
  }

  lines.push(offered.length > 0 ? copy.close : copy.closeNothing, "");

  return lines.join("\n");
}

// THE ANSWER IS A FACT ON DISK, like every other gate in this journey.
//
// A dotfile, because `export/<beat>/` is a directory the journalist opens and the delivered files
// are what belongs in their eye. `materialise` writes it as `pending` the moment a beat is
// delivered, so a delivered beat is PROVABLY unanswered until somebody asks — which is what makes
// "the run never offered another format" a state that can be seen rather than a habit that can be
// forgotten.
export const FORMAT_OFFER_RECEIPT = ".another-format";
export const LEGACY_FORMAT_OFFER_RECEIPT = ".another-genre";
export const PENDING = "pending";

export async function recordFormatAnswer(options) {
  if (Object.prototype.hasOwnProperty.call(options, "genre")) {
    throw new Error("genre is accepted only when reading a legacy receipt; write format instead");
  }
  const { exportDir, answer, format } = options;
  if (answer !== "declined" && answer !== "taken") {
    throw new Error(`an answer is "declined" or "taken" — got ${JSON.stringify(answer)}`);
  }
  if (answer === "taken" && !format) {
    throw new Error('a "taken" answer names the format the journalist asked for next');
  }
  await writeFile(
    join(exportDir, FORMAT_OFFER_RECEIPT),
    answer === "taken" ? `taken ${format}\n` : "declined\n",
  );
  await rm(join(exportDir, LEGACY_FORMAT_OFFER_RECEIPT), { force: true });
}

/**
 * Has this delivery closed? A delivered beat is not finished until BOTH halves of the closing offer
 * have been made and answered:
 *
 *   - the same beat in another format (`.another-format`, or the older `.another-genre`);
 *   - the other subjects in the same article (`.other-subjects`), for which "the article carried
 *     nothing else" is itself an answer (`none`).
 *
 * Both are separate facts — a journalist can want this beat as a video and want nothing else from
 * the article, or the reverse — so both are recorded, and `missing` names whichever never happened.
 * `pending` is what a delivery writes the moment it lands, so an offer nobody ever made is a state
 * on disk rather than an absence that reads like a decision.
 *
 * Returns `{closed, missing}` in the same shape `whereIs` reports a phase, because both read it.
 * This decision is carried, byte for byte, in `deliver/scripts/another-format.mjs` and in
 * `splash/scripts/where.mjs`, and `splash/test/guard-copies-parity.test.ts` walks the pair.
 * It is self-contained — the receipt names and the `pending` sentinel are spelled inside it — for
 * exactly that reason: a copy that had to carry four imported constants with it is a copy the next
 * author gets wrong. The story-level gate did not consult this at all until round-four finding 8,
 * and reported a three-beat story `done` with all three closing offers still `pending`.
 */
export async function deliveryClosed(exportDir) {
  const receipt = async (name) => {
    const text = await readFile(join(exportDir, name), "utf8").catch((error) => {
      if (error?.code === "ENOENT") return null;
      throw error;
    });
    return text === null ? null : text.trim();
  };
  const canonical = await receipt(".another-format");
  const legacy = await receipt(".another-genre");
  if (canonical !== null && legacy !== null && canonical !== legacy) {
    throw new Error(
      `conflicting another-format receipts: .another-format is ${JSON.stringify(canonical)} but legacy .another-genre is ${JSON.stringify(legacy)}`,
    );
  }
  const answered = (value) => (!value || value === "pending" ? null : value);
  const format = answered(canonical === null ? legacy : canonical);
  const subjects = answered(await receipt(".other-subjects"));

  const missing = [];
  if (format === null) missing.push("this beat was delivered and never offered in another format");
  if (subjects === null)
    missing.push("this beat was delivered and the article's other subjects were never offered");

  return { closed: missing.length === 0, missing, answer: format, subjects };
}
