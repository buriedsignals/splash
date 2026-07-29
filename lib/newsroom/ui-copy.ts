// ui-copy.ts — the interface-copy side of the locale layer. lib/core/locale.ts localises
// NUMBERS and a visual's furniture; this localises what a SCRIPT prints to the journalist.
// The distinction matters: the conversation's prose comes from the orchestrating agent, but
// an emitted block is code, and code cannot be told to "answer in English".
//
// Adding a language = one entry. An unknown language falls back to English, which is also the
// documented default for a fresh install (issue #6).
import { EN_SOURCE_QUESTIONS, type SourceQuestionCopy } from "../source/policy";
import { DEFAULT_UI_LANG } from "./language";

export type ExportProposalCopy = {
  intro: string;
  formCodeSource: (path: string) => string;
  formHtml: (path: string) => string;
  formEmbedLive: (url: string) => string;
  formEmbedMissingKeys: (keys: string) => string;
  formEmbedAvailable: string;
  question: (forms: string) => string;
  waitInstruction: string;
  missingEmbedKeysReason: (reason: string) => string;
};

const EN: ExportProposalCopy = {
  intro:
    "The visual is produced. Choose how it should be delivered (nothing is built yet — the form you choose is generated on demand):",
  formCodeSource: (path) =>
    `  a) Source code — a standalone React project you can rebuild and customise (bun install && bun run build): ${path}`,
  formHtml: (path) =>
    `  b) Standalone HTML — one self-contained file you can drop anywhere: ${path}`,
  formEmbedLive: (url) =>
    `  c) Embed (hosted) — a link that is already live and reusable anywhere: ${url}`,
  formEmbedMissingKeys: (keys) =>
    `  c) Embed (hosted) — needs a missing key (${keys}). I can ask you for it, save it, and then deliver c); otherwise take b) (an equivalent standalone HTML file).`,
  formEmbedAvailable:
    "  c) Embed (hosted) — publish to your Cloudflare Pages project to get a reusable link",
  question: (forms) =>
    `Which form would you like? (${forms}) — then re-run export-code with --form <html|code-source|embed>.`,
  waitInstruction:
    "WAIT for the journalist's answer to THIS proposal before any --form: never choose for them — even when only one form is possible, the journalist confirms it, and across several elements never assume a shared answer (a grouped answer only counts when THEY give it).",
  missingEmbedKeysReason: (reason) =>
    `Missing key(s) for the hosted embed: ${reason}. Provide them (they will be saved via save-key.mjs) to deliver c), or choose b) (standalone HTML).`,
};

const FR: ExportProposalCopy = {
  intro:
    "Le visuel est produit. Choisissez la forme de livraison (rien n'est encore construit — la forme choisie est générée à la demande) :",
  formCodeSource: (path) =>
    `  a) Code source — projet React autonome à rebuilder/personnaliser (bun install && bun run build) : ${path}`,
  formHtml: (path) =>
    `  b) HTML autonome — un seul fichier autonome à déposer n'importe où : ${path}`,
  formEmbedLive: (url) =>
    `  c) Embed (hébergé) — lien déjà en ligne, réutilisable partout : ${url}`,
  formEmbedMissingKeys: (keys) =>
    `  c) Embed (hébergé) — nécessite une clé manquante (${keys}). Je peux vous la demander et l'enregistrer, puis livrer en c) ; sinon prenez b) (fichier HTML autonome équivalent).`,
  formEmbedAvailable:
    "  c) Embed (hébergé) — publier sur votre projet Cloudflare Pages pour obtenir un lien à réutiliser",
  question: (forms) =>
    `Quelle forme souhaitez-vous ? (${forms}) — puis relancer export-code avec --form <html|code-source|embed>.`,
  waitInstruction:
    "ATTENDRE la réponse du journaliste à CETTE proposition avant tout --form : ne jamais choisir à sa place — même quand une seule forme est possible, c'est le journaliste qui la confirme, et sur plusieurs éléments jamais de « pour les deux » présumé (une réponse groupée n'est valable que si c'est LUI qui la donne).",
  missingEmbedKeysReason: (reason) =>
    `Clé(s) manquante(s) pour l'embed hébergé : ${reason}. Fournissez-la/les (elles seront enregistrées via save-key.mjs) pour livrer en c), ou choisissez b) (HTML autonome).`,
};

const TABLE: Record<string, ExportProposalCopy> = { en: EN, fr: FR };

export function exportProposalCopy(lang: string): ExportProposalCopy {
  const base = (lang || DEFAULT_UI_LANG).toLowerCase().split("-")[0]!;
  return TABLE[base] ?? EN;
}

// ── The source question ─────────────────────────────────────────────────────────────────────
//
// The question a run cannot BEGIN without an answer to: `sources` is written once, by initRun,
// and no later step can add it. lib/source/policy.ts decides WHICH of the four is owed and
// ships the English (it is the policy's own default — design spec R7); the other three
// languages are copy a journalist reads, which is this file's subject.
//
// The five kinds are NOT translated inside the sentence: they are the ids that go back into the
// declaration, and the schema refuses anything else.

const FR_SOURCE_QUESTIONS: SourceQuestionCopy = {
  kind: "D'où viennent ces données ? Un jeu de données publié (public), un fichier qu'on vous a remis ou que vous avez constitué (local), un jeu de données interne à la rédaction (private), des chiffres cités dans votre article (prose), ou des données de démonstration (synthetic) ?",
  label: (kind) =>
    `Comment cette source ${kind} doit-elle être créditée auprès du lecteur ?`,
  url: "Quelle est l'URL exacte de la page ou du jeu de données de cette source ? (le document lui-même, pas la page d'accueil du site)",
  urlNotSpecific: (url) =>
    `« ${url} » pointe vers un site, pas vers un document — quelle est la page exacte de cette source, ou faut-il retirer le lien ?`,
};

const DE_SOURCE_QUESTIONS: SourceQuestionCopy = {
  kind: "Woher stammen diese Daten? Ein veröffentlichter Datensatz (public), eine Datei, die Sie erhalten oder selbst erstellt haben (local), ein redaktionsinterner Datensatz (private), Zahlen aus Ihrem Artikel (prose) oder Demodaten (synthetic)?",
  label: (kind) =>
    `Wie soll diese ${kind}-Quelle für die Leserinnen und Leser ausgewiesen werden?`,
  url: "Wie lautet die genaue Seiten- oder Datensatz-URL dieser Quelle? (das Dokument selbst, nicht die Startseite der Website)",
  urlNotSpecific: (url) =>
    `„${url}“ verweist auf eine Website, nicht auf ein Dokument — wie lautet die genaue Seite dieser Quelle, oder soll der Link entfallen?`,
};

const IT_SOURCE_QUESTIONS: SourceQuestionCopy = {
  kind: "Da dove provengono questi dati? Un set di dati pubblicato (public), un file che le è stato fornito o che ha creato (local), un set di dati interno alla redazione (private), cifre citate nel suo articolo (prose) oppure dati dimostrativi (synthetic)?",
  label: (kind) =>
    `Come deve essere accreditata al lettore questa fonte ${kind}?`,
  url: "Qual è l'URL esatto della pagina o del set di dati di questa fonte? (il documento stesso, non la home page del sito)",
  urlNotSpecific: (url) =>
    `«${url}» rimanda a un sito, non a un documento — qual è la pagina esatta di questa fonte, oppure il collegamento va tolto?`,
};

const SOURCE_QUESTION_TABLE: Record<string, SourceQuestionCopy> = {
  en: EN_SOURCE_QUESTIONS,
  fr: FR_SOURCE_QUESTIONS,
  de: DE_SOURCE_QUESTIONS,
  it: IT_SOURCE_QUESTIONS,
};

export function sourceQuestionCopy(lang: string): SourceQuestionCopy {
  const base = (lang || DEFAULT_UI_LANG).toLowerCase().split("-")[0]!;
  return SOURCE_QUESTION_TABLE[base] ?? EN_SOURCE_QUESTIONS;
}

// ── The sign-off state, said to a person ────────────────────────────────────────────────────
//
// The export scripts print a machine line — `EDITORIAL: unsigned — LLM render-approval only` —
// and a real run relayed it to the journalist verbatim. The INFORMATION is the one that matters
// most at hand-over (nobody human signed this off), but "LLM render-approval only" is the
// machine talking to itself: it names the mechanism, not the fact, and it is untranslated.
//
// So the same state is emitted TWICE: the machine line stays byte-identical (the guards, the
// export transcript and the QA checks key on it), and this copy is printed beside it as the
// sentence meant for a person. SKILL.md's voice rule then says which one is relayed.
export type SignoffCopy = {
  /** Nobody human signed off: the automatic checks passed, that is all. */
  unsigned: string;
  /** A human editor signed off, by name. */
  signed: (names: string) => string;
  /** There was no single artifact to bind a sign-off to (a folder delivery). */
  skipped: string;
  /**
   * The OTHER reason a sign-off could not be bound: a hosted embed, whose bytes live on the
   * provider's servers and which the newsroom therefore owns none of. A separate line, not a
   * reuse of `skipped`: that one says "this delivery is a folder", which is FALSE of a hosted
   * embed (there is no folder) — and since SKILL.md relays the SIGNOFF line and never the
   * machine one, a wrong reason here is the only thing the journalist would be told, on the
   * routine hosted-DW interactive path.
   */
  skippedHosted: string;
};

const EN_SIGNOFF: SignoffCopy = {
  unsigned:
    "SIGNOFF: nobody in the newsroom has signed this off — it passed the automatic checks, and that is all that stands behind it.",
  signed: (names) => `SIGNOFF: signed off by ${names}.`,
  skipped:
    "SIGNOFF: this delivery is a folder, not one file, so there is nothing to bind a sign-off to — nobody has signed it off.",
  skippedHosted:
    "SIGNOFF: this visual is hosted by the provider, so the newsroom owns no file to bind a sign-off to — nobody has signed it off.",
};

const FR_SIGNOFF: SignoffCopy = {
  unsigned:
    "SIGNOFF: personne dans la rédaction n'a validé ce visuel — il a passé les contrôles automatiques, et c'est tout ce qui le garantit.",
  signed: (names) => `SIGNOFF: validé par ${names}.`,
  skipped:
    "SIGNOFF: cette livraison est un dossier, pas un fichier unique : il n'y a rien à quoi rattacher une validation — personne ne l'a validée.",
  skippedHosted:
    "SIGNOFF: ce visuel est hébergé chez le prestataire : la rédaction ne possède aucun fichier auquel rattacher une validation — personne ne l'a validé.",
};

const DE_SIGNOFF: SignoffCopy = {
  unsigned:
    "SIGNOFF: niemand in der Redaktion hat dies freigegeben — es hat die automatischen Prüfungen bestanden, mehr steht nicht dahinter.",
  signed: (names) => `SIGNOFF: freigegeben von ${names}.`,
  skipped:
    "SIGNOFF: diese Lieferung ist ein Ordner, keine einzelne Datei — es gibt nichts, woran eine Freigabe gebunden werden könnte; niemand hat sie freigegeben.",
  skippedHosted:
    "SIGNOFF: dieses Visual liegt beim Anbieter — die Redaktion besitzt keine Datei, an die eine Freigabe gebunden werden könnte; niemand hat es freigegeben.",
};

const IT_SIGNOFF: SignoffCopy = {
  unsigned:
    "SIGNOFF: nessuno in redazione ha convalidato questo visual — ha superato i controlli automatici, e questo è tutto ciò che lo garantisce.",
  signed: (names) => `SIGNOFF: convalidato da ${names}.`,
  skipped:
    "SIGNOFF: questa consegna è una cartella, non un singolo file: non c'è nulla a cui legare una convalida — nessuno l'ha convalidata.",
  skippedHosted:
    "SIGNOFF: questo visual è ospitato dal fornitore: la redazione non possiede alcun file a cui legare una convalida — nessuno l'ha convalidato.",
};

const SIGNOFF_TABLE: Record<string, SignoffCopy> = {
  en: EN_SIGNOFF,
  fr: FR_SIGNOFF,
  de: DE_SIGNOFF,
  it: IT_SIGNOFF,
};

export function signoffCopy(lang: string): SignoffCopy {
  const base = (lang || DEFAULT_UI_LANG).toLowerCase().split("-")[0]!;
  return SIGNOFF_TABLE[base] ?? EN_SIGNOFF;
}
