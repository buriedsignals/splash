// ui-copy.ts — the interface-copy side of the locale layer. lib/core/locale.ts localises
// NUMBERS and a visual's furniture; this localises what a SCRIPT prints to the journalist.
// The distinction matters: the conversation's prose comes from the orchestrating agent, but
// an emitted block is code, and code cannot be told to "answer in English".
//
// Adding a language = one entry. An unknown language falls back to English, which is also the
// documented default for a fresh install (issue #6).
import { EN_SOURCE_QUESTIONS, type SourceQuestionCopy } from "../source/policy";
import { DEFAULT_UI_LANG } from "./language";

// NOTE: none of these carry their own letter. The letter is the MENU's, and a form's position
// differs per format — the CMS insertion is `d)` for an interactive (after source/html/embed) and
// `c)` for a video (after file/embed). Baking "d)" into the sentence produced exactly that: a
// video menu that read "a) … c) … d) … which form? (a / b / c)".
export type ExportProposalCopy = {
  intro: string;
  formCodeSource: (path: string) => string;
  formHtml: (path: string) => string;
  formEmbedLive: (url: string) => string;
  formEmbedMissingKeys: (keys: string) => string;
  formEmbedAvailable: string;
  /** Form d — the visual goes INTO the journalist's own article, in the newsroom's CMS. */
  formVideoFile: (path: string) => string;
  formCmsAvailable: string;
  formCmsMissingKeys: (keys: string) => string;
  question: (forms: string) => string;
  waitInstruction: string;
  missingEmbedKeysReason: (reason: string) => string;
};

const EN: ExportProposalCopy = {
  intro:
    "The visual is produced. Choose how it should be delivered (nothing is built yet — the form you choose is generated on demand):",
  formCodeSource: (path) =>
    `Source code — a standalone React project you can rebuild and customise (bun install && bun run build): ${path}`,
  formHtml: (path) =>
    `Standalone HTML — one self-contained file you can drop anywhere: ${path}`,
  formEmbedLive: (url) =>
    `Embed (hosted) — a link that is already live and reusable anywhere: ${url}`,
  formEmbedMissingKeys: (keys) =>
    `Embed (hosted) — needs a missing key (${keys}). I can ask you for it, save it, and then deliver it; otherwise take the standalone HTML file, which is equivalent.`,
  formEmbedAvailable:
    "Embed (hosted) — publish to your Cloudflare Pages project to get a reusable link",
  // Says what it needs (the article) and what it will NOT do (publish), because both are the
  // journalist's decision and neither is guessable from the word "insert".
  formVideoFile: (path) =>
    `The video file — the mp4 itself, yours to upload wherever you publish: ${path}`,
  formCmsAvailable:
    "Straight into your article (CMS) — I add the visual to one of your articles in We.Publish. Tell me which article (its slug), and I place it at the end of the DRAFT: nothing goes live until you publish it yourself.",
  formCmsMissingKeys: (keys) =>
    `Straight into your article (CMS) — needs a missing key (${keys}). I can ask you for it and save it, then deliver it; otherwise take the hosted link and paste it into your article.`,
  question: (forms) =>
    `Which form would you like? (${forms})`,
  waitInstruction:
    "WAIT for the journalist's answer to THIS proposal before any --form: never choose for them — even when only one form is possible, the journalist confirms it, and across several elements never assume a shared answer (a grouped answer only counts when THEY give it).",
  missingEmbedKeysReason: (reason) =>
    `Missing key(s) for the hosted embed: ${reason}. Provide them (they will be saved via save-key.mjs) to deliver the hosted form, or choose the standalone file.`,
};

const FR: ExportProposalCopy = {
  intro:
    "Le visuel est produit. Choisissez la forme de livraison (rien n'est encore construit — la forme choisie est générée à la demande) :",
  formCodeSource: (path) =>
    `Code source — projet React autonome à rebuilder/personnaliser (bun install && bun run build) : ${path}`,
  formHtml: (path) =>
    `HTML autonome — un seul fichier autonome à déposer n'importe où : ${path}`,
  formEmbedLive: (url) =>
    `Embed (hébergé) — lien déjà en ligne, réutilisable partout : ${url}`,
  formEmbedMissingKeys: (keys) =>
    `Embed (hébergé) — nécessite une clé manquante (${keys}). Je peux vous la demander et l'enregistrer, puis la livrer ; sinon prenez le fichier HTML autonome, qui est équivalent.`,
  formEmbedAvailable:
    "Embed (hébergé) — publier sur votre projet Cloudflare Pages pour obtenir un lien à réutiliser",
  formVideoFile: (path) =>
    `Le fichier vidéo — le mp4 lui-même, à déposer où vous publiez : ${path}`,
  formCmsAvailable:
    "Directement dans votre article (CMS) — j'ajoute le visuel à l'un de vos articles dans We.Publish. Dites-moi lequel (son slug), et je le place à la fin du BROUILLON : rien n'est mis en ligne tant que vous ne publiez pas vous-même.",
  formCmsMissingKeys: (keys) =>
    `Directement dans votre article (CMS) — nécessite une clé manquante (${keys}). Je peux vous la demander et l'enregistrer, puis la livrer ; sinon prenez le lien hébergé et collez-le dans votre article.`,
  question: (forms) =>
    `Quelle forme souhaitez-vous ? (${forms})`,
  waitInstruction:
    "ATTENDRE la réponse du journaliste à CETTE proposition avant tout --form : ne jamais choisir à sa place — même quand une seule forme est possible, c'est le journaliste qui la confirme, et sur plusieurs éléments jamais de « pour les deux » présumé (une réponse groupée n'est valable que si c'est LUI qui la donne).",
  missingEmbedKeysReason: (reason) =>
    `Clé(s) manquante(s) pour l'embed hébergé : ${reason}. Fournissez-la/les (elles seront enregistrées via save-key.mjs) pour livrer la forme hébergée, ou choisissez le fichier autonome.`,
};

const TABLE: Record<string, ExportProposalCopy> = { en: EN, fr: FR };

export function exportProposalCopy(lang: string): ExportProposalCopy {
  const base = (lang || DEFAULT_UI_LANG).toLowerCase().split("-")[0]!;
  return TABLE[base] ?? EN;
}

// ── Where it goes in the article ─────────────────────────────────────────────────────────────
//
// The hand-over's other sentence. `suggest-article` computes an anchor per opportunity
// ({ paragraphIndex, quote }); until now nothing but the orchestrator's memory carried it to the
// journalist, and memory is exactly what failed. export-code prints these lines from the accepted
// proposal, beside the delivery-form block.
//
// TWO GRAINS, ONE AUTHORITY. Both are kept, and the copy says which one to trust: the QUOTE. A
// paragraph number rots the moment the article is edited between the analysis and the delivery —
// the normal life of a live article — while a quotation survives a reorganisation. So the number
// is offered as an indication and the sentence as the thing to look for.
export type PlacementCopy = {
  /** Header line of the block. */
  intro: string;
  /** Both grains present. */
  anchored: (paragraphIndex: number, quote: string) => string;
  /** A quote but no paragraph number. */
  anchoredQuoteOnly: (quote: string) => string;
  /** A paragraph number but no quote — the weakest case, and it says so. */
  anchoredIndexOnly: (paragraphIndex: number) => string;
  /** The opportunity is bound to no passage. Never a made-up paragraph. */
  freeStanding: string;
  /** Splash says where; the journalist decides. */
  advisory: string;
};

const EN_PLACEMENT: PlacementCopy = {
  intro: "Where this goes in your article:",
  anchored: (paragraphIndex, quote) =>
    `  around §${paragraphIndex} (indicative), next to « ${quote} » — the quote is what to trust: if the article has moved since, look for that sentence, not the number.`,
  anchoredQuoteOnly: (quote) =>
    `  next to « ${quote} » — look for that sentence in your article; the quote is what to trust.`,
  anchoredIndexOnly: (paragraphIndex) =>
    `  around §${paragraphIndex} — a paragraph number from the article as it was read, and nothing quoted to confirm it: check it against your current draft.`,
  freeStanding:
    "  free-standing — this element is not tied to any passage; place it wherever it serves the piece.",
  advisory: "Placement is advisory — you position it.",
};

const FR_PLACEMENT: PlacementCopy = {
  intro: "Où placer cet élément dans votre article :",
  anchored: (paragraphIndex, quote) =>
    `  autour du §${paragraphIndex} (indication), près de « ${quote} » — c'est la citation qui fait foi : si l'article a bougé depuis, cherchez la phrase, pas le numéro.`,
  anchoredQuoteOnly: (quote) =>
    `  près de « ${quote} » — cherchez cette phrase dans votre article ; c'est la citation qui fait foi.`,
  anchoredIndexOnly: (paragraphIndex) =>
    `  autour du §${paragraphIndex} — un numéro de paragraphe issu de l'article tel qu'il a été lu, sans citation pour le confirmer : vérifiez-le sur votre version actuelle.`,
  freeStanding:
    "  élément autonome — il n'est rattaché à aucun passage ; placez-le là où il sert le récit.",
  advisory: "Le placement est indicatif — c'est vous qui positionnez.",
};

const PLACEMENT_TABLE: Record<string, PlacementCopy> = {
  en: EN_PLACEMENT,
  fr: FR_PLACEMENT,
};

export function placementCopy(lang: string): PlacementCopy {
  const base = (lang || DEFAULT_UI_LANG).toLowerCase().split("-")[0]!;
  return PLACEMENT_TABLE[base] ?? EN_PLACEMENT;
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

// ── The house ground that cannot carry text ─────────────────────────────────────────────────
//
// A newsroom declares a house GROUND and every visual inherits it. Some colours cannot hold
// readable text — a mid-grey is the clearest case: nothing, black or white, separates from it
// enough to read. That is not a rule Splash chose, and it is not a reason to stop.
//
// So this is a NOTIFICATION AND A CHOICE. It says what happens to the text — never a ratio,
// never a hex-vs-hex comparison, never a field name — offers two grounds that were MEASURED to
// work (lib/core/ground.ts computes both, and re-measures them before offering), and leaves the
// newsroom's own colour on the table as answer (c). It is their newsroom.
export type GroundChoiceCopy = {
  problem: (declared: string) => string;
  optionNearest: (hex: string) => string;
  optionSubject: (hex: string) => string;
  optionKeep: (declared: string) => string;
  question: string;
};

const EN_GROUND: GroundChoiceCopy = {
  problem: (declared) =>
    `Your house background ${declared} cannot hold readable text: on this colour the title and the source line come out too close to the background to read comfortably — on a small screen, or in print, some readers will not read them at all.`,
  optionNearest: (hex) =>
    `a) ${hex} — your colour, barely moved: the same shade, just far enough from the text for it to read.`,
  optionSubject: (hex) =>
    `b) ${hex} — Splash's own background, on which each visual's colour is chosen to suit the story it tells.`,
  optionKeep: (declared) =>
    `c) keep ${declared} — it is your newsroom. The visual is produced as you asked, and I note that the text will be hard to read.`,
  question:
    "Which do you want? (a / b / c — or give me another colour.) Nothing is produced until you answer.",
};

const FR_GROUND: GroundChoiceCopy = {
  problem: (declared) =>
    `Votre fond maison ${declared} ne peut pas porter un texte lisible : sur cette couleur, le titre et la ligne de source ressortent trop peu du fond pour se lire confortablement — sur un petit écran, ou à l'impression, une partie des lecteurs ne les lira pas du tout.`,
  optionNearest: (hex) =>
    `a) ${hex} — votre couleur, à peine déplacée : la même teinte, juste assez éloignée du texte pour qu'il se lise.`,
  optionSubject: (hex) =>
    `b) ${hex} — le fond de Splash, sur lequel la couleur de chaque visuel est choisie selon le sujet qu'il raconte.`,
  optionKeep: (declared) =>
    `c) garder ${declared} — c'est votre rédaction. Le visuel est produit tel que vous le demandez, et je note que le texte y sera difficile à lire.`,
  question:
    "Que préférez-vous ? (a / b / c — ou donnez-moi une autre couleur.) Rien n'est produit avant votre réponse.",
};

const DE_GROUND: GroundChoiceCopy = {
  problem: (declared) =>
    `Ihr Haus-Hintergrund ${declared} kann keinen lesbaren Text tragen: Auf dieser Farbe heben sich Titel und Quellenzeile zu wenig vom Hintergrund ab — auf einem kleinen Bildschirm oder im Druck werden manche Leserinnen und Leser sie gar nicht lesen.`,
  optionNearest: (hex) =>
    `a) ${hex} — Ihre Farbe, kaum verschoben: derselbe Ton, nur weit genug vom Text entfernt, damit er lesbar wird.`,
  optionSubject: (hex) =>
    `b) ${hex} — der Hintergrund von Splash, auf dem die Farbe jedes Visuals zum jeweiligen Thema gewählt wird.`,
  optionKeep: (declared) =>
    `c) ${declared} behalten — es ist Ihre Redaktion. Das Visual wird wie gewünscht erstellt, und ich halte fest, dass der Text schwer lesbar sein wird.`,
  question:
    "Was möchten Sie? (a / b / c — oder nennen Sie mir eine andere Farbe.) Es wird nichts erstellt, bevor Sie geantwortet haben.",
};

const IT_GROUND: GroundChoiceCopy = {
  problem: (declared) =>
    `Il vostro sfondo di redazione ${declared} non può reggere un testo leggibile: su questo colore il titolo e la riga della fonte si staccano troppo poco dallo sfondo — su uno schermo piccolo, o in stampa, una parte dei lettori non li leggerà affatto.`,
  optionNearest: (hex) =>
    `a) ${hex} — il vostro colore, appena spostato: la stessa tinta, quel tanto che basta perché il testo si legga.`,
  optionSubject: (hex) =>
    `b) ${hex} — lo sfondo di Splash, sul quale il colore di ogni visual è scelto in base al tema che racconta.`,
  optionKeep: (declared) =>
    `c) tenere ${declared} — è la vostra redazione. Il visual viene prodotto come lo chiedete, e annoto che il testo sarà difficile da leggere.`,
  question:
    "Cosa preferite? (a / b / c — oppure indicatemi un altro colore.) Nulla viene prodotto prima della vostra risposta.",
};

const GROUND_TABLE: Record<string, GroundChoiceCopy> = {
  en: EN_GROUND,
  fr: FR_GROUND,
  de: DE_GROUND,
  it: IT_GROUND,
};

export function groundChoiceCopy(lang: string): GroundChoiceCopy {
  const base = (lang || DEFAULT_UI_LANG).toLowerCase().split("-")[0]!;
  return GROUND_TABLE[base] ?? EN_GROUND;
}
