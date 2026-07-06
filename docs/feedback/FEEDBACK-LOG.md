# Atelier feedback log

Append-only. One entry per feedback: verbatim, diagnostic, action, status.

## 2026-07-06 · locator routed to map-dw renders inland strike offshore

**Feedback** (Rémy, from a real `/atelier:atelier` run on the NYT Lamerd/Iran geolocation investigation):
> Le système a routé une carte régionale (Kuwait → Lamerd) vers map-dw (Datawrapper locator), dont le
> basemap généralise la côte au zoom large → Lamerd (ville à l'intérieur des terres) apparaît dans le
> golfe Persique. Il a brûlé ~5 re-renders à découvrir la limite. Or map-native (MapTiler) existe déjà.

**Diagnostic** :
- Fichiers : `skills/suggest-chart/SKILL.md` (map format ladder), `skills/map-dw/src/map-spec.ts`.
- Root cause : le ladder « Static → map-dw » court-circuitait la HARD RULE existante (map-native pour tout
  point map sous-national). map-dw ET map-native savent faire un locator ; le mauvais était choisi.

**Action** :
- [x] Fix (moyen) :
  1. `suggest-chart/SKILL.md` — le routage carte branche d'abord sur le TYPE de donnée : point/locator/
     symbol sous-national/régional → `map-native` (même statique) ; map-dw locator réservé aux étendues
     nationales/continentales/globales (≥ ~12°). Choroplèthes → ladder statique/interactif inchangé.
  2. `map-dw/src/map-spec.ts` — garde-fou déterministe : `validateMapSpec` calcule l'étendue des marqueurs
     d'un locator ; si le span < `REGIONAL_EXTENT_DEG` (12°), warning « prefer map-native ». GATE 3 impose
     de corriger les warnings → détourne automatiquement de map-dw.
  3. `map-dw/src/tests/map-spec.test.ts` — le warning fire sur Lamerd↔Kuwait (~5°), ne fire pas sur une
     étendue continentale (~40°). Check qui casse à la récidive.

**Commit** : (voir git log — branche de session)
**Verify** : `bun test skills/map-dw/src/tests/map-spec.test.ts` → 22/22 ; map-spec.ts type-clean.
**Status** : fixed

## 2026-07-06 · "Invalid tool parameters" during CADRAGE

**Feedback** (même run) :
> Un "Invalid tool parameters" est survenu pendant la phase CADRAGE (entre deux questions). Glitch réel.

**Diagnostic** :
- Fichier : `skills/atelier/SKILL.md` (CADRAGE décrit les questions en prose, pas d'appel d'outil codé).
- Root cause : PAS de défaut statique dans le code. Le modèle runtime a mal formé UN appel de question,
  puis s'est auto-rattrapé. Erreur transitoire d'appel LLM — non reproductible par un test.

**Action** :
- [x] Mitigation légère : ajout d'une ligne CADRAGE (« une question = un seul prompt à choix simple bien
      formé, jamais batché »). Pas vendu comme un fix déterministe.
- [ ] Monitor : à re-signaler si ça récidive ; si récurrent, envisager de coupler CADRAGE au schéma de
      question du runtime (au prix de l'agnosticisme runtime).

**Status** : mitigated / monitor

## 2026-07-06 · export lands in an ephemeral session scratchpad

**Feedback** (Rémy, from the CO₂-emissions `/atelier:atelier` run):
> Le livrable a atterri dans `/private/tmp/.../scratchpad/co2-export/` — hors repo, dossier de session
> temporaire. J'ai dû demander « où est l'export ? ». Éphémère, introuvable.

**Diagnostic** :
- Fichiers : `skills/atelier/SKILL.md` (EXPORT), `skills/atelier/scripts/export-code.mjs`, `.gitignore`.
- Root cause : la phase EXPORT ne précisait aucune destination stable → l'orchestrateur a écrit dans le
  scratchpad de session (nettoyé, hors repo).

**Action** :
- [x] Fix (moyen) :
  1. `SKILL.md` EXPORT — livrer dans `exports/<slug>/` sous le cwd du journaliste (jamais le scratchpad),
     et imprimer le chemin ABSOLU. Exemple export-code mis à jour.
  2. `export-code.mjs` — garde-fou `isEphemeralPath()` : warning si l'exportDir résout vers /tmp,
     /private/tmp, /var/folders ou scratchpad.
  3. `.gitignore` — `exports/` (les livrables ne polluent pas git).
  4. Test : `isEphemeralPath` true sur temp/scratchpad, false sur `exports/<slug>`.

**Verify** : `bun test skills/atelier/scripts/export-code.test.ts` → 6/6.
**Status** : fixed

## 2026-07-06 · Playwright browser not pre-installed (mid-run download)

**Feedback** (même run) :
> « Playwright's browser isn't installed. Installing the headless shell it needs. » — installé en cours
> de flow. Pour un non-tech ça peut planter/inquiéter.

**Diagnostic** :
- Fichier : `docs/installer/generate.js` (le `.command` d'install).
- Root cause : les producteurs (chart-native, map-native) rendent via Playwright Chromium, jamais
  pré-installé → téléchargement à la première visualisation.

**Action** :
- [x] Fix : le `.command` généré pré-installe le moteur de rendu après le clone
  (`cd skills/chart-native && bun install && bunx playwright install chromium`).
- [x] Garde-fou : `generate.test.ts` assert que le script contient `playwright install chromium`
  (+ `bash -n` valide toujours la syntaxe).

**Verify** : `bun test docs/installer` → 9/9.
**Status** : fixed
