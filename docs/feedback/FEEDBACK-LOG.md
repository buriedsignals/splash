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
