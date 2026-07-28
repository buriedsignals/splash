# Router la livraison par GENRE de format

> Sous-projet #5 de la coquille V2 (ordre verrouillé le 2026-07-24). Tranche COURTE, off
> `feat/format-reach`. Branche `feat/delivery-genre-routing`, worktree `splash-route`.
> Spec amont : `2026-07-25-delivery-publishers-design.md` (les publishers), `2026-07-26-format-reach-design.md`
> (vidéo + scrolly devenus offrables — c'est ce qui rend cette tranche nécessaire maintenant).

## 1. Le problème, en faits mesurés

La livraison traite tout artefact comme quelque chose qu'on **héberge puis qu'on iframe**. Ça marche
pour un `interactive`. Ça n'a aucun sens pour un PNG ou un mp4 — et depuis `format-reach`, la vidéo
sort spontanément dans l'offre sur les trois canaux.

Faits relevés dans le code (worktree `splash-reach`, HEAD `d1268fb`), pas déduits :

| Fait | Site |
|---|---|
| `Publisher.kind: "hosted" \| "package"` **existe** mais n'est jamais consulté par la livraison | `lib/core/publishers.ts:46` |
| `deliver()` ne contraint jamais le `kind` — rien n'empêche un run social de demander Cloudflare | `lib/loop/deliver.ts` (aucun check ; `:236` recopie `outcome.kind`) |
| `renderSnippet` ne sait produire qu'un `<iframe>` | `lib/delivery/snippet.ts:17-21` |
| Le README du package dit « uploade ce fichier, puis colle cet iframe » — **même pour un PNG/mp4** | `lib/delivery/adapters/zip.ts:59-60` |
| Cloudflare Pages ne résout que `index.html` à la racine d'un alias → un non-HTML **404 tardivement**, après staging et déploiement | `lib/delivery/adapters/cloudflare-pages.ts:488-498` (KNOWN GAP documenté) |
| **Rien en production n'écrit `el.delivery.requested`** — seulement des tests. `deliver()` refuse donc toujours « no destination requested » | grep `requested` sur `lib/`, `skills/splash/src/` |

Deux canaux sur trois (`social-vertical`, `social-feed`) n'autorisent que `[static, video]`
(`lib/core/channel-policy.ts:26-39`). On n'iframe pas dans Instagram ni TikTok.

## 2. La décision cadre

**L'hébergement est une propriété du FORMAT, pas une étape universelle.**

- `interactive` · `scrolly` → **hébergé** : une URL à iframer. Ça ne peut pas être un fichier collé
  dans un CMS.
- `static` · `video` → **le fichier EST le livrable** : le CMS a un champ image/vidéo natif, avec
  **son propre champ texte alternatif**. L'a11y se résout donc en **remettant le texte `altInsight`
  à coller**, pas en fabriquant un snippet qui le porte. Héberger un PNG pour l'iframer était la
  mauvaise idée dès le départ.

Corollaire de portée : le **canal n'est pas consulté**. Le canal contraint déjà le format
(`social-*` ⇒ `static`/`video`), donc « pas d'hébergement sur 2 canaux sur 3 » tombe tout seul du
format. Une règle au lieu de deux, et un seul endroit où elle peut dériver.

Nuance gardée : héberger un non-HTML reste **possible sur choix explicite S3** (CDN d'actifs d'une
rédaction : un gros mp4 que le CMS refuse, ou un CMS qui n'accepte qu'un code d'intégration). Ce
n'est plus le défaut, ce n'est pas interdit.

## 3. Architecture

### 3.1 Le genre — un fait du format

```ts
// lib/core/publishers.ts, collé à artifactMediaFor
export type DeliveryGenre = "file" | "embed";
export function deliveryGenreFor(format: VisualFormat): DeliveryGenre;
//   static | video        → "file"
//   interactive | scrolly → "embed"
```

Même fichier et même clé qu'`artifactMediaFor` **délibérément** : ce codebase s'est déjà fait mordre
deux fois par deux registres du même fait qui divergent (cf. `docs/splash/proposal-brain-followups.md`).
Une table exhaustive sur l'union `VisualFormat` — un format neuf ne compile pas sans déclarer son
genre.

### 3.2 Ce que déclare un publisher

```ts
export interface Publisher {
  id: string;
  kind: "hosted" | "package";
  /** Les formats que cet adapter sait RÉELLEMENT servir. */
  serves: VisualFormat[];
  implemented: boolean;
  publish(req: PublishRequest): Promise<VerbResult<PublishOutcome>>;
}
```

| Publisher | `serves` | Pourquoi |
|---|---|---|
| `zip` | les 4 | Le repli universel reste universel — il publie sur disque |
| `embed-s3` | les 4 | La nuance CDN d'actifs ; l'adapter nomme déjà l'objet avec la bonne extension et le bon content-type (`s3.ts:212`, via `artifactMediaFor`) |
| `embed-cloudflare` | `interactive`, `scrolly` | Pages ne résout que `index.html` à la racine d'un alias — la contrainte est réelle et vit là où elle s'applique |

`kind` répond « où ça atterrit » (disque / URL), `serves` répond « ce que je sais servir ». Les deux
ne sont pas redondants : `zip` est `package` et sert pourtant le genre `embed` (un HTML auto-contenu
dans une archive), c'est précisément le repli quand aucun hôte n'est configuré.

Les capacités déclarées non implémentées (`embed-cms`, `embed-fly`) n'ont pas d'adapter enregistré :
elles sont refusées en amont par `implemented: false` (`readiness.ts`) et ne portent donc pas de
`serves`. Le jour où leur adapter arrive, il en déclare un — le type l'y oblige.

### 3.3 Le routeur — la politique par défaut

```ts
// lib/delivery/routing.ts — PURE : la liste des ids prêts est passée par l'appelant,
// jamais lue de l'ambiant (invariant I5 du contrat de verbes).
export function defaultDestinationsFor(
  format: VisualFormat,
  readyIds: string[],
): string[];
```

- genre `file` → `["zip"]`, **toujours**, même si Cloudflare est prêt.
- genre `embed` → le premier hébergé prêt dans un ordre stable, sinon `["zip"]`.

Ne rend **jamais** une liste vide : `zip` n'a pas de variable d'environnement (`capabilities.ts:157`,
`env: []`) donc il est toujours prêt — c'est ce qui fait de « aucun hôte configuré » un chemin qui
marche plutôt qu'un cul-de-sac.

L'ordre stable des hébergés est une constante déclarée dans ce module, pas l'ordre d'itération d'un
`Record` : un défaut qui dépend de l'ordre d'enregistrement des adapters serait un défaut qui change
quand on importe un fichier de plus.

### 3.4 `requestDelivery` — le producteur manquant de `requested`

`manifest.ts:268-270` verrouille : *« deliver est un pas qu'une DÉCISION déclenche, jamais une avance
automatique — un artefact frais que personne n'a demandé à publier reste sur `show` »*. Le défaut ne
peut donc pas être « `deliver()` se débrouille quand `requested` est vide » : ce chemin ne
s'exécuterait jamais, et le faire s'exécuter renverserait une règle verrouillée.

D'où une décision explicite, dans `lib/loop/` :

```ts
export function requestDelivery(
  run: RunManifest,
  el: RunElement,
  decor: Decor,
  opts: { destinations?: string[]; env?: Record<string, string | undefined> },
): VerbResult<RunElement>;
```

- Sans `destinations` : le routeur les dérive **et le résultat est écrit dans le manifeste**.
- Avec `destinations` : le choix du journaliste prime, tel quel.
- Refus à la décision (avant toute publication) : élément sans artefact, artefact périmé, id de
  destination inconnu de cet install.

Ce que ça préserve : **la décision de publier reste un acte du journaliste**. Ce qui devient
automatique, c'est seulement *où* — et c'est persisté, donc auditable, et non recalculé à chaque
appel. Un défaut recalculé plus tard (une fois Cloudflare configuré) changerait rétroactivement ce
qui avait été demandé.

### 3.5 `deliver()` — la légalité dure

Un seul contrôle neuf, **avant toute I/O**, dans la boucle des destinations pendantes, juste après la
readiness :

```ts
if (!publisher.serves.includes(format)) → refus orienté
```

Séparation nette, et c'est le cœur du design :

| Module | Responsabilité | Conséquence |
|---|---|---|
| `defaultDestinationsFor` | la **politique par défaut** | un hébergé n'est jamais *choisi* pour un genre `file` |
| `deliver()` | la **légalité dure** | un hébergé explicitement demandé passe **si** il sert ce format |

Donc : `embed-s3` explicitement demandé sur un PNG **passe** (la nuance survit) ; `embed-cloudflare`
explicitement demandé sur un PNG **refuse en orientant** vers le package. `deliver()` n'a pas besoin
de distinguer un défaut d'un choix explicite — cette distinction vit entièrement dans le routeur, ce
qui évite de porter un booléen « c'était un défaut » dans le manifeste.

Le refus rejoint les refusals existants (`deliver.ts:160`) : il n'arrête pas l'appel, il fait passer à
la destination suivante — le comportement qui empêche déjà une destination mal configurée d'affamer
le repli.

### 3.6 Le snippet cesse d'être iframe-only

`renderSnippet` reçoit le `format` et choisit sa forme :

| Format | Forme | Note |
|---|---|---|
| `interactive`, `scrolly` | `DEFAULT_SNIPPET_TEMPLATE` / `RESPONSIVE_TEMPLATE` | **inchangés, octet pour octet** |
| `static` | `<img src alt width style="max-width:100%">` | l'alt survit — c'est le défaut a11y que tout le codebase fail-hard |
| `video` | `<video controls playsinline aria-label>` + texte de repli | l'alt renseigne le nom accessible ; sous-titres/transcription = hors scope (§7) |

Nouveau placeholder `{alt}`, échappé comme les autres (`escapeHtmlAttr`). Ajout pur : jusqu'ici
`{alt}` était un placeholder inconnu, donc refusé.

**Le `snippetTemplate` maison ne s'applique qu'au genre `embed`.** Appliqué à un PNG, un template
maison (forcément en forme d'iframe, c'est sa raison d'être) fabriquerait un iframe vers une image.
Verrouillé par un test.

### 3.7 Le package du genre `file`

Entrées de l'archive :

| Entrée | Genre `file` | Genre `embed` |
|---|---|---|
| `index.<ext>` | `index.png` / `index.mp4` | `index.html` (inchangé) |
| `ALT.txt` | **neuf** — le texte alternatif brut, à coller | absent |
| `EMBED.txt` | **absent** | inchangé |
| `README.md` | réécrit (voir ci-dessous) | inchangé |
| `metadata.json` | inchangé | inchangé |

Le README du genre `file` ne parle plus d'hébergement ni d'iframe : *« ton CMS a un champ image (ou
vidéo) : téléverse ce fichier, et colle le texte d'`ALT.txt` dans son champ texte alternatif. »* Il
garde titre, source, crédit et identifiant.

Le genre `embed` ne bouge pas d'un octet — le test de déterminisme doré existant reste la preuve
qu'aucune régression n'est passée par là.

### 3.8 Un package fichier n'a pas de snippet

`PublishOutcome.snippet` (`publishers.ts:52`) et le champ persisté (`manifest.ts:103`,
`snippet: z.string()`) deviennent **optionnels**. Écrire `""` ferait dire au manifeste « livré avec un
snippet vide » ; y mettre le texte alt mentirait sur la nature du champ.

Aucune migration : les manifestes existants portent le champ, et un champ devenu optionnel valide
toujours. Les lecteurs du champ (affichage, `resume`) traitent l'absence comme « pas de code
d'intégration pour ce genre », pas comme une erreur.

## 4. Les refus, tous avant I/O

| Situation | Réponse |
|---|---|
| `embed-cloudflare` demandé pour un `static`/`video` | `invalid-request` : *« embed-cloudflare ne sert que du HTML — ce PNG se livre en package (zip), ou en hébergé via embed-s3 si ta rédaction l'a configuré. »* Zéro réseau, zéro staging. Remplace le KNOWN GAP `cloudflare-pages.ts:488-498` |
| Destination inconnue de cet install | Refusée à la **décision** (`requestDelivery`), pas au moment de publier |
| Aucun hébergé prêt, genre `embed` | Pas un refus : le routeur rend `["zip"]` |
| Élément sans artefact / artefact périmé | Refus à la décision, inchangé côté `deliver()` |

## 5. Ce qui ne bouge pas

- Un succès n'est jamais perdu, un refus n'est jamais avalé : la forme « un enregistrement par
  appel » de `deliver()` est intacte.
- La décision de publier reste un acte explicite (§3.4).
- Le gate de sign-off, la fraîcheur de provenance, la readiness : intouchés.
- Le genre `embed` livre exactement les mêmes octets qu'aujourd'hui, zip compris.
- Aucune capacité neuve, aucun adapter neuf, aucune clé neuve.

## 6. Tests et preuves

Unitaires / d'assemblage :

1. `deliveryGenreFor` sur les 4 formats (table exhaustive).
2. Routeur : genre `file` → `["zip"]` **même avec Cloudflare prêt** ; genre `embed` → l'hébergé prêt,
   `["zip"]` quand aucun ne l'est ; jamais une liste vide.
3. `deliver()` refuse `embed-cloudflare` + `static` **sans aucune I/O** — l'assertion porte sur le
   fait que `publish()` de l'adapter n'est jamais entré (adapter de test enregistré comptant ses
   appels), pas sur le libellé du message.
4. `deliver()` accepte `embed-s3` + `static` explicitement demandé (la nuance gardée).
5. Snippet : l'`<img>` porte l'alt ; le `<video>` porte son repli ; **l'iframe est byte-identique**
   (test doré).
6. `snippetTemplate` maison ignoré pour le genre `file`, appliqué pour le genre `embed`.
7. Zip genre `file` : jeu d'entrées exact `{index.png, ALT.txt, README.md, metadata.json}`,
   déterminisme d'octets conservé ; zip genre `embed` inchangé.
8. Drift : aucun publisher `hosted` ne peut sortir du routeur pour un genre `file` — quel que soit
   l'ensemble des adapters enregistrés.
9. `requestDelivery` : sans destination → écrit le défaut dans le manifeste ; avec destination → la
   respecte ; destination inconnue → refus.

Preuve live (opt-in, comme les preuves S3/Cloudflare existantes) :

10. **Un vrai PNG produit par la boucle**, publié sur MinIO via `embed-s3`, refetché : octets et
    content-type vérifiés, snippet `<img>` porteur de l'alt.

Le point 10 est explicitement conçu contre la leçon du 2026-07-25 : *une preuve live sur une fixture
`.html` ne prouve pas le chemin réel* — c'est exactement comme ça que « tout artefact servi en
text/html » a survécu à un check. La fixture est interdite ici : l'artefact doit venir de `produce`.

## 7. Hors scope (assumé, avec la raison)

> Registre consolidé : `docs/splash/residuals.md` — statut vérifié contre le code, pile A/B/C.

- **L'URL Cloudflare `${url}/${stagedName}`** : le refus de §4 la rend sans objet. Si un jour
  Cloudflare doit servir des actifs, ça devient une tranche « adressage » à part entière.
- **A11y vidéo complète** (sous-titres, transcription) : `altInsight` renseigne un nom accessible,
  pas une piste de sous-titres. Chantier éditorial distinct.
- **Exposer un pas de boucle à la façade hôte** : résidu B ⇄ #4 déjà parqué (un hôte non-JS peut
  lancer `splash verb publish` et court-circuiter `deliver()`). Cette tranche **augmente l'enjeu** de
  ce résidu : le routage par genre vit dans `deliver()`, donc un hôte qui le contourne contourne
  aussi le routage — mais `serves` étant lu par `deliver()` seul, le contournement ne peut produire
  qu'un échec du provider, pas un artefact corrompu servi silencieusement. Noté ici pour que la
  tranche « façade » le ferme.
- **L3 (We.Publish, Fly)** : toujours en attente d'un accès réel.

## 8. Risques

> Registre consolidé : `docs/splash/residuals.md` — statut vérifié contre le code, pile A/B/C.

- **Une rédaction qui voulait vraiment héberger ses PNG** doit désormais nommer `embed-s3`
  explicitement. Assumé : c'est le sens de la décision cadre, et le refus l'oriente.
- **`serves` peut dériver** de la réalité d'un provider (Cloudflare pourrait un jour résoudre autre
  chose qu'`index.html`). C'est une déclaration, pas une mesure — le test 3 verrouille le
  comportement, pas la vérité du provider.
- **`ALT.txt` est un fichier de plus à traduire** : son contenu est l'`altInsight` (langue du
  contenu), son nom et le README suivent la langue d'interface déjà résolue par le décor.
