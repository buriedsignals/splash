# Spec — Coquille d'orchestration + parcours desk + 1ʳᵉ tranche (boucle éditoriale)

> **Statut :** design validé (brainstorming, 2026-07-24). Prêt pour → writing-plans (sur la 1ʳᵉ tranche seulement).
> **Origine :** re-conception issue de l'audit `main @41bfe69`, des 11 issues GitHub de Tom (22/07), du benchmark des exemplaires **Superpowers** & **Spotlight** (lus file:line), et de deux walkthroughs réels (chart + livraison).
> **Portée de CE spec :** la vision (§2–4) cadre ; **seule la §5 (1ʳᵉ tranche) va vers un plan d'implémentation.** Les autres sous-projets auront leur propre spec.
> **Langue :** prose FR, identifiants/fichiers/types en anglais (standard non-négociable).

---

## 1. Problème (ce qu'on répare)

La plainte fondatrice de Rémy — **« le flow n'est jamais clair ni respecté »** — n'est pas un bug à patcher. Le walkthrough #1 (slope Heidi rendu réel) a montré que **le chart est compétent** (emphase, contraste, alt-text imposé, label-fit : tout tient) — seuls 3 défauts *mécaniques* précis subsistent (`.0` sur entiers, identité perdue à droite, affordance d'interaction). **Donc le problème n'est pas les moteurs. C'est la FORME de la coquille d'orchestration.**

Preuves file:line (audit `main`) :
- Orchestrateur = **un `skills/splash/SKILL.md` de 943 lignes** de prose, dont la `description` frontmatter déballe toute la séquence → l'agent suit la description et **saute le corps** (SDO, cf. `writing-skills`).
- État **éparpillé** : conversation + `accepted.json` + `report.json` + « quelle commande a tourné » (issue Tom **#8**, verbatim).
- **Tout en un seul contexte** ; transport **en dur** (`bun` subprocess + import in-process, 2 modèles dans `adapters.ts`).
- Ne tourne **pas dans Goose** (le runtime cible du partenariat Mycroft), qui exige un contrat d'exécution abstrait.

Les deux exemplaires que Rémy admire sont bâtis sur **l'exact inverse** de cette forme (§3).

---

## 2. Vision — le parcours utilisateur re-conçu (le socle)

Ancré sur la promesse publique de la landing : *« Splash is that desk »* (un desk visuel à 6 rôles, pour une rédaction qui n'en a qu'un). **Deux principes gouvernent tout :**

- **P1 — tu joues un instrument.** L'outil **offre** (options + le *pourquoi*) et exécute le craft ; **le journaliste décide.** Jamais « l'outil a décidé, tu approuves ». (La valeur d'un desk, la main d'un auteur.)
- **P2 — tout beat est revisitable.** Le visuel est un **outil de pensée** : le voir peut renvoyer à n'importe quel beat antérieur. On tourne autour d'un « meilleur actuel », pas dans un tuyau.

**Deux parcours** (= la décision verrouillée « install 1× puis boucle ») :

- **SETUP newsroom — une fois (le décor).** Clés API · style maison · config de livraison. C'est le préflight (issue Tom **#5**). Il pose les *capacités* et l'*identité*. Persistant entre articles.
- **DESK journaliste — à chaque article, dans le décor.** Des beats revisitables :
  1. **Apporte** — article/données, même en vrac. *Seulement ce que le journaliste apporte (pas de sourcing autonome — décision verrouillée).*
  2. **Oriente** — le journaliste **pose le point** qu'il veut faire ; l'outil **décrit factuellement** ce que la donnée contient (affordances) + **pousse honnêtement** si le point n'est pas soutenu. *Il ne propose jamais l'histoire* (anti data-fishing).
     → **⑃ Bifurcation** (rapport au texte) : *visuel POUR un article* (data → embed autonome) **ou** *l'article visuel LUI-MÊME* (prose/narratif → scrolly/story/vidéo, où l'outil **compose le texte apporté**, sans écrire le journalisme).
  3. **Histoire** — takeaway/emphase ; le journaliste est l'auteur.
  4. **Chiffres** — extrait/nettoie/vérifie *ce qui est apporté* ; jamais inventer ni chercher.
  5. **Propose** *(le cerveau — sous-projet à part)* — offre comment ça *pourrait* se montrer + **pourquoi**, sur `RAISON × SCOPE × CAPACITÉ × STYLE` ; le journaliste décide/redirige.
  6. **Fabrique & montre** — vrai visuel, taille de publication ; peut renvoyer à *n'importe quel* beat.
  7. **Livre** — selon la branche : embed-CMS *ou* page narrative publiée. Idempotent (même lien).
  8. **Rouvre** — vivant : revenir mettre à jour, même lien.

---

## 3. Vision — la coquille d'orchestration (la forme technique)

**Le changement de forme :** du monolithe-prose/état-conversation/in-context → un **graphe de petites skills autonomes**, à **état-fichier**, sur un **contrat de verbes** (runtime-agnostique), où **seul le craft lourd est délégué** à des agents frais.

**Synthèse des deux exemplaires :** *unités = Superpowers* (skills autonomes, gate propre, `description` = déclencheur seul jamais le workflow) · *navigation = Spotlight* (pilotée par l'état-fichier, ré-entrable ; PAS le chaînage-forward par état terminal, qui ne survit pas au revisitable).

**Les 5 raffinements que le socle force sur la coquille :**

1. **L'état-fichier est le CENTRE** (pas juste la reprise) : un **run manifest** tient le « meilleur actuel » + « quoi de valide ensuite » ; les skills sont des *opérations sur un état partagé*, ré-entrables. C'est la fondation dont tout dépend.
2. **Deux portées d'état** : `newsroom` (décor persistant) + `run` (par article).
3. **Le graphe BIFURQUE** au nœud rapport-au-texte (embed vs article-entier) → `deliver` a deux modes ; les skills aval diffèrent.
4. **Les contrats portent `{options[], rationale}`**, pas un seul spec figé (P1 : les gates sont des points de *décision*, pas d'*approbation*).
5. **Verbes bornés** (pas de « fetch data ») + **`deliver` idempotent/updatable** (artefact vivant).

**Moteurs = fondation intacte** derrière une couture de verbe (42 cores géométriques, `lib/core`, contraintes, composants — des mois render-vérifiés). *À vérifier : la couture est-elle réellement coupable ? L'audit montre encore des reach-in orchestrateur→`src/` (`validate-gate.ts`). Couper la couture fait partie du chantier.*

**Garde-fous honnêtes (risques identifiés) :**
- Le « revisitable » doit être **borné** (quelques back-edges explicites + invalidation par hash de provenance), **pas** un blackboard libre piloté LLM (sinon on troque « flow sauté » contre « flow chaotique »).
- La **conversation éditoriale = un seul contexte continu** (feel instrument, rapide) ; on ne délègue que le **craft lourd** (render/produce/publish). « Déléguer chaque beat » serait faux pour une boucle interactive.

---

## 4. Décomposition en sous-projets + ledger de couverture

Trop gros pour un spec. Chaque pièce a un chez-soi ; **on n'implémente que la §5 maintenant.**

| Sous-projet | Contenu | Issues Tom |
|---|---|---|
| **Boucle éditoriale (1ʳᵉ tranche — §5)** | L'état-centre + orient→propose→produce→revise, data→chart, moteur intact | — |
| CADRAGE multi-livrables | `destination × format × aspect` dé-soudés, plusieurs livrables par run, `print` première classe, aspect différé (`confirm-aspect`) — spec `2026-07-26-cadrage-deliverables-design.md` | #1 |
| Substrat complet | Run manifest complet + `resume` + contrat de verbes + adapters | #8 |
| Préflight (SETUP) | Page brandée clés + style + livraison | #5, #6 |
| Proposal-cerveau | `RAISON×SCOPE×CAPACITÉ×STYLE`, typologie complète, routage prose/data | #2 |
| Bifurcation article | Branche scrolly/story (composer le texte apporté) | — |
| Livraison | embed par défaut + publisher-adapters (CMS-API·Cloudflare·S3·Fly) + ZIP | #4 |
| Verify | preview au vrai viewport · review indépendante · sévérité · voie « needs-human-eye » | #3,#9,#10,#11 |
| Cross-cutting | politique de source | #7 |

---

## 5. La 1ʳᵉ tranche — la boucle éditoriale mince *(le spec actionnable)*

### 5.1 Objectif

Prouver **l'âme du nouveau design** (P1 instrument + P2 revisitable) sur **l'état-centre**, sur la branche **data→chart**, en appelant **chart-native intact** via une couture fine. Construire cette tranche **EST** le de-risk du mécanisme le plus chaos-prone (l'état revisitable) : on la garde si elle tient.

Elle prouve, ensemble, sur du réel :
- l'**état-centre** (un `RunManifest` minimal tient le « meilleur actuel ») ;
- l'**instrument** (le `propose` émet des options + le *pourquoi*, le journaliste tranche) ;
- le **revisitable borné** (un back-edge réel : changer l'emphase/angle → invalidation du visuel périmé → re-dérivation) ;
- **moteurs intacts** (un seul verbe `render` vers chart-native — teste la coupabilité de la couture) ;
- une **conversation continue** (zéro délégation).

### 5.2 Scope

**DANS :** branche data→chart uniquement · les steps `orient`, `propose`, `produce`, `revise` · l'état-centre `RunManifest` + provenance/invalidation · un back-edge (revise-angle/emphase) · appel réel à chart-native.

**HORS (chacun a sa case §4) :** parcours SETUP/préflight (décor **stubbé** en config fixe) · bifurcation article-entier · `deliver`/embed · découverte complète · proposal-cerveau complet (ici : types chart-native + un *pourquoi* minimal groundé) · délégation d'agents · blackboard libre (un seul back-edge explicite).

### 5.3 Architecture (unités, isolées et testables)

Nouveau dossier `lib/loop/` (hors moteurs). Chaque unité = une responsabilité, un fichier focalisé :

- **`manifest.ts` — le CENTRE.** Schéma `RunManifest` (zod) + read/write atomique + `provenanceHash()` + dérivation `stalenessOf(manifest)` et `nextActions(manifest)`. Aucune connaissance d'un moteur.
- **`orient.ts`** — `(dataCsv, statedPoint) → { dataProfile, supportsPoint, note }`. Profil factuel (colonnes/types/cardinalité, réutilise le profiling existant) + verdict d'honnêteté. **N'invente jamais** ; **ne propose pas d'histoire.**
- **`propose.ts`** — `(manifest) → FormOption[]` (chaque option = `{ id, nativeType, why }`, `why` groundé). Émet des options ; **n'en choisit aucune.**
- **`produce.ts` (adapter/couture)** — le **seul verbe** de la tranche : `render(nativeSpec) → artifactPath`, en shell-appelant `skills/chart-native/scripts/produce-from-spec.mjs` (CLI existant, réseau-libre). **Assemble d'abord le `NativeSpec`** depuis le manifest : `nativeType` ← `chosenOption.nativeType` ; `title` ← `angle.confirmedTakeaway` ; `highlight` ← `angle.emphasis` ; `altInsight` ← `angle.altInsight` ; `data` ← `input.dataCsv` ; `source`/`unit` ← champs du profil. Puis écrit `artifact` + `provenanceHash` au manifest.
- **`revise.ts`** — `(manifest, change) → manifest'` : met à jour `angle`, ce qui **change la provenance** → l'`artifact` devient `stale`.
- **`driver.ts`** — mince, **state-driven** : lit le manifest, calcule `nextActions`, exécute le step approprié. PAS un chaînage forward codé en dur.

### 5.4 Contrat typé (le cœur)

```ts
type RunManifest = {
  runId: string;
  schemaVersion: 1;
  input: { dataCsv: string; statedPoint: string }; // seulement ce qui est apporté
  orient?: { dataProfile: DataProfile; supportsPoint: boolean; note?: string };
  angle?: { confirmedTakeaway: string; emphasis?: string; altInsight: string }; // le journaliste, auteur ; altInsight requis (WCAG 1.1.1 — produce refuse sinon)
  proposal?: { options: FormOption[]; chosenId: string };
  artifact?: { path: string; provenanceHash: string };
};
type FormOption = { id: string; nativeType: string; why: string };

// provenance = ce dont dépend l'artefact. Change ⇒ artefact périmé.
provenanceHash(m) = hash(m.input.dataCsv + m.angle + m.proposal?.chosenId)
stalenessOf(m)    = m.artifact != null && m.artifact.provenanceHash !== provenanceHash(m)
```

### 5.5 Flux de données

`input (data + point)` → **orient** → `manifest(orient)` → *le journaliste confirme l'angle* → `manifest(angle)` → **propose** → `manifest(proposal.options)` → *le journaliste choisit* → `manifest(proposal.chosenId)` → **produce** → `manifest(artifact + provenance)` → **MONTRE** → *le journaliste revise l'emphase/angle* → **revise** → `manifest(angle')` + `artifact.stale=true` → **produce** (re-dérive) → **MONTRE'**.

`nextActions` state-driven : pas d'orient→orient ; orient sans angle→confirmer l'angle ; angle sans proposal→propose ; proposal sans artefact **ou** artefact `stale`→produce ; artefact frais→montrer/attendre-revise.

### 5.6 Gestion d'erreur / off-ramps (first-class)

- **orient** : si la donnée ne soutient pas le point → message honnête, **zéro fabrication** (« il n'y a pas de quoi visualiser ceci ici »).
- **produce** : les gardes de conformance existantes de chart-native s'imposent (alt-text WCAG, contraste) — **réutilisées telles quelles** (walkthrough : elles marchent et *refusent de produire* sans alt-text).
- **stale** : le step *montrer* **refuse d'afficher un artefact `stale` comme courant** (garde mécanique).

### 5.7 Tests (`bun:test`, TDD — test rouge d'abord)

- `manifest` : `provenanceHash` (golden), détection de staleness, `nextActions` sur chaque état.
- `orient` : les deux branches d'honnêteté (soutenu / non soutenu).
- **le back-edge (le test-clé)** : changer l'angle → artefact marqué `stale` → re-produce le clear ; jamais un `stale` montré comme courant.
- la **couture** : `render` via chart-native rend un vrai artefact (intégration réseau-libre, comme le walkthrough).
- **end-to-end** : cas réel (primes cantonales) — orient→propose→produce→revise→re-produce, état cohérent de bout en bout.

### 5.8 Critères de succès

1. Un journaliste apporte data + point → reçoit un chart **offert** avec le *pourquoi* → choisit → le voit → **change l'emphase** → obtient un chart mis à jour, l'**état toujours cohérent** (aucun `stale` montré comme courant).
2. L'état-centre + l'invalidation par provenance **tiennent et se lisent proprement** (pas un blackboard).
3. La couture chart-native est **un seul appel adapter** (si elle draine des internes → *finding* qui reforme le §3).

### 5.9 Ce que la tranche teste (le but de-risk)

- Le **revisitable borné + invalidation** est-il constructible/lisible, ou vire-t-il au chaos ? (le risque n°1)
- La couture **moteur intact via un verbe** est-elle réellement propre ?

Si l'un casse, c'est un **finding qui reforme la coquille (§3) avant qu'on l'engage plus loin** — exactement le rôle d'une 1ʳᵉ tranche.

---

## 6. Contraintes globales

- Runtime **Bun**. Tests `bun:test` (`describe`/`it`/`expect`). **TDD** : test qui échoue avant l'implémentation, chaque tâche.
- Code, commentaires, identifiants, noms de fichiers, commits, branches : **anglais**.
- **Aucune mention** vendor (Claude/Anthropic) dans un artefact commité. Pas de `Co-Authored-By`.
- **Pas de nouveau `any`** ; pas d'import cross-moteur de `src/` (la couture passe par le CLI/verbe).
- Gate `bun run check` vert avant chaque commit.
- **Git** : cette tranche se fait sur une **branche dédiée off `main`** (worktree `splash-merge`), **PAS** sur `feat/splash-apertus-sovereign`. À créer au démarrage de l'implémentation.
