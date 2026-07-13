# Image-scrolly — design

> Statut : **design validé, prêt pour plan**. Écrit après un brainstorming + une vérification
> multi-agents adversariale (26 findings réels repliés dans ce document). Spec-parapluie :
> `2026-06-14-atelier-architecture-design.md`. Décision de scope amont : mémoire Claude Code
> `image-scrolly-scope` (Tom, 2026-07-10 — atelier *formate* les images, ne les génère pas).

## 1. Quoi / pourquoi

**Image-scrolly** = le 4ᵉ moteur d'atelier : une **séquence de photos / images satellite qui avance
au scroll** (« evidence, one frame at a time »). C'est le skill #7 de la vitrine Splash qu'atelier ne
produisait pas encore. On le construit pour fermer le gap côté atelier (l'autre gap, le flythrough 3D
Cesium, reste porté par Buried Signals).

**Principe fondateur préservé** : atelier **n'engendre ni image ni texte éditorial**. Il orchestre.
Pour l'image, ça veut dire : le journaliste fournit un **lot d'images brutes + son article** ; atelier
(1) *formate* les images (crop/canvas-frame au gabarit + compression), (2) *propose* un ordre narratif
et des captions **dérivées de l'article** (vetoable), (3) *rend* les 3 formats possédés.

## 2. Non-buts

- **Pas de génération d'image** (ni d'illustration, ni d'upscale, ni de retouche créative).
- **Pas de génération de texte descriptif** : ni caption inventée, ni **alt** auto-décrit par vision
  (risque d'hallucination / diffamation sur une photo de presse).
- **Pas de format interactif-explore** (pan/zoom/hover) : une image n'a pas de donnée à explorer. La
  grille du moteur est `static + video + scrolly`, jamais `interactive`.
- **Pas** de before/after-slider ni de moving-viewport dans cette tranche — logués comme **formats
  futurs séparés** (ne pas forcer la change-detection satellite dans un crossfade).

## 3. Architecture (Approche A — moteur mince + orchestrateur)

Trois couches, alignées sur ①②③ et sur les 3 moteurs existants.

```
INPUT (journaliste)              ② suggest-image (génératif, vetoable)     ③ image-native (déterministe)
────────────────────             ────────────────────────────────────     ─────────────────────────────
lot d'images brutes  ┐           lit l'article + REGARDE les images        prep-images.mjs
article (texte)      ┼──────────►  (vision = matching + ordre UNIQUEMENT) ► (crop|canvas-frame /canal
canal (CADRAGE Q3)   ┘             → propose ImageStory :                    + EXIF/sRGB + compress)
alt + crédit /image  ┘             {ordre, captions dérivées-article,               │
  (fournis)                         keyFrame}                                        ▼
                                        │  GATE MANDATORY                    ┌ static  → key-frame (a11y: alt)
                                   journaliste confirme/édite  ◄──────────── ├ video   → crossfade.mp4 (Remotion,
                                   ordre+captions+cull sur le                │           burn-in caption+crédit)
                                   visuel                                    └ scrolly → skills/scrolly + ScrollyImage
```

**Découpage des responsabilités (non négociable) :**

- **② `suggest-image`** (nouveau, couche orchestrateur) — la **seule** partie « intelligente ». Vision
  utilisée *exclusivement* pour apparier chaque image à un passage d'article et ordonner les frames ;
  les **mots** des captions viennent du passage apparié (reformulés auto-contenus), jamais de la vision.
  Émet un manifeste `image-story.json`. Proposition **vetoable via un gate mandatory non-skippable**
  (voir §7).
- **③ `skills/image-native/`** (nouveau moteur mince) — **100 % déterministe, zéro vision, zéro
  génération de texte**. Consomme le manifeste + les images brutes → prep → producteurs static/video.
  Expose le pur : `src/image-story.ts` (schéma + conformance + `imageStoryToChapters`),
  `scripts/prep-images.mjs`, les producteurs, `scripts/produce.mjs`, `scripts/snap-a11y.mjs`.
- **`skills/scrolly/`** (existant) — gagne la branche `visual:"image"` dans son dispatcher. Le renderer
  **`ScrollyImage.tsx` vit dans `skills/scrolly/src`** (comme `ScrollyChart`/`ScrollyMap`, seam
  existant), et importe le schéma pur depuis image-native. Le slot type est déjà réservé
  (`chapters.ts:4-13` : `visual:"image"`, `action:"crossfade"`).

**Réutilisé tel quel :** scaffold sticky + `IntersectionObserver` + furniture header/source de
`Scrolly.tsx`, `channel.ts`, la discipline module-auto-contenu, le canon skill-autonome.

## 4. Flux de données

1. **INPUT** : le journaliste dépose un dossier d'images + l'article + le canal (CADRAGE Q3) + par image
   un **`alt`** et un **`credit`** (les deux seuls textes qu'atelier *collecte*, cf. §5/§7).
2. **② suggest-image** : lit l'article, regarde chaque image (vision → « quel paragraphe parle de cette
   photo ? »), propose ordre + captions + `keyFrame`, **et** un *cull* si >6 images (§7). Écrit
   `image-story.json`.
3. **GATE** : le journaliste confirme/édite l'ordre, les captions, la sélection, sur un aperçu ; les
   images non-matchées lui sont surfacées (jamais auto-droppées ni auto-captionnées).
4. **③ prep-images** : normalise **toutes** les frames aux dimensions du canal (identiques → crossfade
   propre), applique `fit`, EXIF/sRGB, compresse, **copie dans le work dir** (bundle auto-contenu).
5. **③ producteurs** (channel-gated) : `static` (key-frame), `video` (crossfade mp4), `scrolly`
   (`ScrollyImage`).
6. **EXPORT** : les 3 formes possédées (§11).

## 5. Schéma `ImageStory` (`skills/image-native/src/image-story.ts`)

```ts
export interface ImageStep {
  id: string;
  frameRef: string;               // fichier image brut, résolu relativement à imageDir
  caption: string;                // dérivée de l'article, auto-contenue, JAMAIS verbatim
  alt: string;                    // REQUIS — texte alternatif (ce qu'on VOIT), fourni par le
                                  //   journaliste. Distinct de caption. Jamais auto-décrit par vision.
  credit: { name: string; url?: string; licence?: string };  // REQUIS — crédit photo de CETTE frame
  sourcePassage: string;          // REQUIS dès que la caption est article-dérivée (traçabilité +
                                  //   c'est la référence du tripwire anti-copie). Non rendu.
  fit?: "crop" | "canvas-frame";  // override PAR FRAME (défaut = ImageStory.fit)
  align?: "left" | "right" | "center";
}

export interface ImageStory {
  title: string;                  // insight — header persistant (jamais une caption)
  description: string;            // intro step (what/when/where)
  source: { name: string; url?: string };   // provenance ARTICLE/DONNÉE (≠ crédit photo par frame)
  frames: ImageStep[];            // ordre = ordre narratif proposé par ②
  keyFrame: number;               // index de la frame-clé → static
  fit: "canvas-frame" | "crop";   // défaut projet (voir §8) — DÉFAUT = "canvas-frame"
  lang?: string;                  // localise la chrome émise par le moteur
  imageDir: string;              // racine de résolution des frameRef (handoff ②→③)
}
```

**Deux axes de texte distincts, tous deux collectés (pas générés) :**
- **`caption`** répond à *« qu'est-ce que cette image prouve dans le récit ? »* — dérivée de l'article.
- **`alt`** répond à *« qu'est-ce qu'on voit ? »* — description factuelle **fournie par le journaliste**.
  La caption **ne peut pas** doubler comme alt (WCAG 1.1.1 : un lecteur d'écran a besoin du contenu
  visible, pas de la glose narrative).

**Pont scrolly :** `imageStoryToChapters(story)` mappe chaque `ImageStep` vers un `ScrollyStep`
(`visual:"image"`, `action:"crossfade"`, `ref = index de frame`, `prose = caption`). La caption est
**passée telle quelle** (contrairement à `mapStoryToChapters` qui la *dérive* de la donnée) — d'où la
nécessité des garde-fous de §6/§7 en amont.

## 6. Conformance (`checkImageConformance` — fail-hard, gravé moteur)

1. `title` + `description` + `source.name` présents (module tient seul hors-contexte).
2. Chaque frame a `alt` **non vide** et **≠ `caption`** (sinon throw). Idem pour `credit.name`.
3. **Plancher de frames scopé par format** — `checkImageConformance(story, { format })` : `static` ≥ 1
   (key-frame), `video` ≥ 2 (un crossfade a besoin de 2 images), `scrolly` **3**–6 (§6.4). Sans `format`,
   le plancher est ≥ 1 : `< 2` n'est PAS une violation mais une décision orchestrateur de **dégrader en
   `static` seul** (spec §13), jamais une erreur de conformance. Plafond embarqué = **6** (universel).
4. Scrolly embarqué : **3–6 frames** (règle courte, alignée sur map/chart). Le cull (§7) garantit ce
   plafond en amont.
5. **Tripwire anti-copie (corrigé)** : pour toute frame article-dérivée, `sourcePassage` est **requis**
   (throw si absent — sinon la garde est contournable par omission), et la caption ne doit pas
   **chevaucher** son `sourcePassage` au-delà d'un seuil : **overlap de tokens normalisé
   (Jaccard/shingles) avec allowlist noms-propres/nombres**, PAS un substring littéral (qui fait des
   faux positifs sur « Annemasse, 2019 » et des faux négatifs sur 4 mots réordonnés). La force de la
   garde vit dans le `sourcePassage` fourni par ② — c'est déterministe côté moteur, mais explicitement
   dépendant de l'honnêteté de l'orchestrateur.
6. `keyFrame` dans les bornes ; chaque `frameRef` résolu et présent sur disque **après** prep.

## 7. `suggest-image` — l'orchestrateur (② génératif, vetoable)

- **Vision = matching + ordre uniquement.** Pour chaque image : identifier ce qu'elle montre → apparier
  au passage d'article correspondant → en tirer l'ordre. Tâche d'appariement (faible risque
  d'hallucination). Les **mots de la caption** sont reformulés depuis le passage apparié
  (auto-contenus), jamais depuis la vision.
- **Discipline `prose-provenance` héritée** (`2026-06-27-prose-extracted-provenance-design.md`) : toute
  prose article-dérivée passe par le contrat transcription + gate de confirmation + eval
  anti-hallucination. Les captions image en héritent — c'est ce qui remplace l'invariant « caption
  déterministe dérivée-donnée » que les autres moteurs ont par construction et que l'image perd.
- **Gate MANDATORY non-skippable** : parce que c'est le **seul** contrôle de correctness qui existe pour
  l'ordre + les captions (rien de déterministe ne les vérifie), le veto devient un gate explicite. Le
  journaliste confirme la séquence ; la proposition **surface le passage apparié par frame** pour qu'il
  attrape un mauvais match avant rendu.
- **Cull vetoable** : si le lot dépasse 6 images, ② **propose** les 3–6 meilleures pour le récit et
  **surface les droppées** (jamais de troncature silencieuse — cf. « no silent caps »).
- **Non-matchées** : une image que la vision ne rattache à aucun passage est **surfacée au journaliste**
  (« captionne-la à la main ou retire-la »), jamais auto-droppée ni auto-inventée. Une frame non résolue
  **halte avec un prompt éditorial clair**, pas une stack trace.
- **`alt` et `credit`** : collectés du journaliste à l'INPUT (pas générés). Si manquants, ② les réclame
  avant de composer le manifeste.

## 8. `prep-images.mjs` — la couche déterministe neuve

Analogue exact de la geo-prep. Entrée : images brutes + `fit` (story + override frame) + canal. Sortie :
frames normalisées **identiques en dimensions** (obligatoire pour un crossfade sans « saut »), écrites
dans le work dir.

**Cible dimensionnelle = canal, source unique `channel.ts`** (zéro nouvelle taxonomie) :
`social-vertical` 1080×1920 · `social-feed` 1080×1080 · `article-web` 1200×675 (static/video) /
responsive (scrolly).

**`fit` — DÉFAUT = `canvas-frame`** (correction groundée) :
- **`canvas-frame`** (*contain* + matte neutre dérivée du thème dark/light) — **défaut**. Zéro perte de
  contenu, préserve le cadrage du photographe/éditeur. Un crop aveugle retire du contenu et distord le
  sens éditorial → traité comme **unsafe-by-default** pour de la photo de presse.
- **`crop`** (*cover*, centre géométrique en MVP) — **opt-in explicite** par image, surfacé sur le
  visuel (colle au modèle vetoable). **Tripwire** : throw/warn si un crop jette plus d'un seuil (ex.
  >30 %) de la frame. Le crop centré-sujet (saliency) est **déféré** en knob — le centre géométrique
  aveugle n'est pas un défaut sûr.

**Formats & correctness d'entrée (décodeur = `sharp`) :** `.rotate()` pour *bake* l'orientation EXIF,
conversion **sRGB**, HEIC via libheif, accepte TIFF/PNG/JPEG/WebP, **garde de dimension max** avec
fail-hard clair sur input non supporté / surdimensionné. Ces checks sont un préflight de prep.

**Compression :** ré-encodage **WebP qualité ~82** (défaut groundé pour du photographique web), fallback
JPEG. Budget de poids par frame = tuning knob (discipline module embarquable).

**Déterminisme (canon) :** même entrée → même sortie bit-à-bit. Pas de `Date.now()` / random.

**Handoff :** prep résout les `frameRef` relativement à `imageDir`, **copie/normalise les frames dans le
work dir** → bundle auto-contenu (requis pour l'export forme 1). `produce.mjs` lit ce work dir, comme
chart-native lit son `config.json`.

## 9. Renderers & producteurs

- **`skills/scrolly/src/ScrollyImage.tsx`** (renderer scrolly) : sticky graphic = la frame courante ;
  `currentStep` pilote un **crossfade d'opacité** entre frame `i` et `i+1`. Furniture (header titre,
  crédit source) réutilisée du scaffold. **`prefers-reduced-motion` → hard-cut** (swap d'opacité, pas de
  fondu). Chaque `<img>` porte son `alt`. Le **crédit photo par frame** s'affiche en overlay (label
  localisé « Photo : » / « Photo: »).
- **Producteur `static`** (`skills/image-native`) : exporte la `keyFrame` dimensionnée au canal, avec
  **l'`alt` de la keyFrame** (jamais le générique `"visual"`). *(Amélioration mineure différée : un
  static small-multiples / contact-sheet des 3–6 frames — knob, pas le défaut.)*
- **Producteur `video`** (Remotion, `skills/image-native`) : crossfade des frames en mp4. **Knobs
  numériques** : `holdFrames` (dwell par image), `crossfadeFrames`, `easing` (ease-in-out), `fps` ;
  `durationInFrames = N*hold + (N-1)*fade`. La vidéo **incruste** caption + crédit + furniture
  titre/source, timés sur le hold de chaque frame. **Valider un still** (caption+crédit visibles) avant
  de rendre le mp4 (discipline vidéo CLAUDE.md). `prefers-reduced-motion` : la *transition* est un knob
  (crossfade | direct-cut) et le direct-cut est le fallback honnête.

## 10. Furniture, a11y, localisation

- **`alt`** : requis par frame (§5/§6), rendu sur chaque `<img>` (scrolly, static, video-source).
- **Crédit photo par frame** : `credit{name,url?,licence?}` rendu par frame (≠ source module).
- **Source name-only** : corriger l'anchor **inconditionnel** de `Scrolly.tsx:590` (`<a href={url}>`) →
  rendre en **texte simple quand pas d'URL** (reprendre `sourceHasAnchor`, `snap-a11y.mjs:66,314-319`).
  Vaut pour image-native ET corrige le bug de classe name-only côté scrolly.
- **`snap-a11y.mjs` image-native** : assert que chaque `<img>` porte un `alt` non vide ≠ générique ;
  assert le hard-cut sous `prefers-reduced-motion` ; reprend le `sourceHasAnchor`.
- **Localisation** : toute chrome émise par le moteur (label source, label crédit, fallback alt) passe
  par le helper locale (`sourceLabel` + un label crédit localisé) ; `lang` threadé comme map/chart.
  Jamais d'anglais en dur.

## 11. Export (3 formes possédées)

- **Forme 1 (bundle)** : copie les **frames normalisées dans `assets/`** à côté de la source ; scrolly-
  image hérite du follow-up « dossier de fichiers, pas bundle React runnable » (comme map-native).
- **Forme 2 (HTML autonome)** : inline les frames en **data-URI avec un seuil de poids explicite +
  warning** (au-delà, dégrade en référence à un dossier `assets/` co-livré).
- **Forme 3 (embed)** : URL fly.io.
- **`export-code.mjs`** : émet **l'`alt` et le crédit par frame**, plus jamais `alt="visual"`
  (`export-code.mjs:77,85`).

## 12. Tuning knobs (chacun = un nombre / enum)

`fit` (défaut `canvas-frame`) · `cropDiscardThreshold` (ex. 0.30) · `webpQuality` (~82) ·
`maxInputDimension` · `holdFrames` · `crossfadeFrames` · `fps` · `captionOverlapThreshold` (tripwire
Jaccard) · plancher/plafond frames scrolly (**3 / 6** — aligné sur §6.4).

## 13. Tests (bun:test, TDD)

- `image-story.test.ts` : `checkImageConformance` (alt vide → throw ; alt == caption → throw ; crédit
  manquant → throw ; `sourcePassage` absent sur caption dérivée → throw ; overlap Jaccard au-delà du
  seuil → throw ; <2 frames → dégrade static ; keyFrame hors-bornes → throw).
- `imageStoryToChapters.test.ts` : mapping ImageStep→ScrollyStep, caption pass-through, ordre préservé.
- `prep-images.test.ts` : dimensions normalisées identiques ; EXIF baké ; `canvas-frame` vs `crop` ;
  tripwire crop-discard ; déterminisme (2 runs identiques) ; input non supporté → fail-hard.
- `snap-a11y` image-native : alt présent ≠ générique ; reduced-motion hard-cut ; source name-only sans
  anchor hrefless.
- Producteur video : still de contrôle (caption+crédit visibles) avant mp4.

## 14. Déféré / logué (pas de silent cap)

- Crop **saliency** (détection de sujet) — knob futur ; MVP = centre géométrique + tripwire.
- Static **small-multiples / contact-sheet** — knob futur ; MVP = key-frame.
- Formats **before/after-slider** et **moving-viewport** — moteurs futurs séparés (ne pas forcer la
  change-detection satellite dans un crossfade).
- Bundle **React runnable** pour image-scrolly (comme map-native/scrolly : dossier de fichiers d'abord).

## 15. Grounding (best-practices vérifiées)

- **Crossfade one-image-per-step** : pattern reconnu mais **pas universel** → défaut MVP + transition en
  knob ; scoper « séquence photo/frame » ; logger les autres formats.
- **WebP q~82** : défaut sain pour du photographique web.
- **WCAG 1.1.1** : texte alternatif requis par image opaque → `alt` requis, distinct de la caption.
  **`prefers-reduced-motion`** (crossfade + scroll = motion) → hard-cut / direct-cut.
- **Crop vs letterbox** éditorial : ne jamais retirer de contenu par défaut → `canvas-frame` par défaut.
