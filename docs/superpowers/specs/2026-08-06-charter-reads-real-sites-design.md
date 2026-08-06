# La charte lit vraiment le site d'une rédaction

**Date** : 2026-08-06 · **Branche** : `feat/charter-reads-real-sites` · **Origine** : Rémy, en
essayant la mesure sur `heidi.news` depuis la page servie par `feat/setup-page-one-screen` —
« ça récupère qu'une couleur », et « ça ne devrait pas être bloqué juste parce que ça exécute du js ».

Le chantier précédent a construit la **plomberie** : la page mesure, montre chaque valeur avec son
reçu, et écrit sans rien perdre. Celui-ci s'attaque à ce que la plomberie transporte — aujourd'hui
presque rien.

---

## 1. Ce qui est mesuré, sur un vrai site

Exécuté le 2026-08-06 contre `https://www.heidi.news`, avec le code de `main` :

```
html: 126 938 octets | feuilles CSS: 0
candidats : #d5121e (theme-color)
typo      : aucune
ground    : -
notes     : "no stylesheet was read — the page may build its styles in JavaScript,
             in which case nothing here is reliable"
```

Une seule couleur, et elle ne vient pas du design system : elle vient de la balise
`<meta name="theme-color">`. Aucune typographie. Aucun fond.

### 1.1 La cause n'est pas le JavaScript — c'est un filtre même-hôte

`lib/newsroom/charter-fetch.ts`, `stylesheetHrefs` :

```ts
// Same host only. A newsroom's own CSS carries its brand; a third-party sheet carries
// somebody else's, and there is no way to tell them apart after the fact.
if (abs.hostname !== base.hostname) continue;
```

Or `heidi.news` sert sa feuille depuis `heidi-17455.kxcdn.com` — **son propre CDN**, dont le nom
porte celui de la rédaction. La règle, écrite pour ne pas aspirer la marque d'un tiers, exclut la
CSS de la rédaction elle-même. C'est le cas normal : une rédaction sérieuse sert ses assets depuis
un CDN.

**Et la note affichée se trompe de cause.** Elle envoie le lecteur sur le JavaScript alors que la
feuille est un fichier statique parfaitement lisible, simplement sur un autre nom d'hôte. Une
mesure qui explique mal son propre échec est pire qu'une mesure muette : elle oriente la
correction dans la mauvaise direction.

### 1.2 Lever le filtre débloque la typographie, pas les couleurs

Même site, en fournissant la feuille du CDN (557 632 octets) :

```
typo      : Roboto)/headings, Sang Bleu Kingdom/webfont
candidats : #d5121e (theme-color)      ← inchangé
ground    : -
```

« Sang Bleu Kingdom » est la vraie fonte de titrage de Heidi. Donc la moitié du problème tombe
avec le filtre. **Les couleurs, non** : 557 Ko de CSS compilée ne rendent aucun candidat de marque.
Les heuristiques cherchent des propriétés nommées (`--brand`, `--primary`), des couleurs de
bandeau, de liens ; un CSS moderne compilé n'expose pas sa marque sous ces formes.

### 1.3 Un bug d'analyse visible dans la sortie

`Roboto)` — avec une parenthèse fermante — vient de `firstFamily` (`lib/newsroom/charter.ts:684`)
appliqué à une déclaration de la forme `var(--font-x, Roboto)`. Le nom de famille rapporté au
journaliste est faux.

### 1.4 Le point de Rémy sur le JS reste entier

Pour `heidi.news`, la CSS est un fichier : le filtre suffit. Pour un site qui **injecte** ses
styles à l'exécution, aucune récupération statique ne verra quoi que ce soit. Playwright est déjà
une dépendance de ce dépôt (les snapshots de rendu s'en servent), donc rendre la page et lire les
styles calculés est atteignable — mais c'est un mécanisme distinct, avec son coût et ses risques.

---

## 2. Ce qu'on décide

| # | Décision | Pourquoi |
|---|---|---|
| D1 | **Une feuille liée par le document de la rédaction est la CSS de la rédaction**, quel que soit son hôte. Le filtre même-hôte tombe. | Un `<link rel="stylesheet">` dans son propre document EST le design system qu'elle a choisi de servir. L'hôte ne dit rien de la propriété. |
| D2 | **Les couleurs se cherchent aussi dans le CSS compilé**, pas seulement dans des propriétés nommées. | C'est la forme que prend un site de rédaction en 2026. Une heuristique qui n'y trouve rien n'est pas prudente, elle est aveugle. |
| D3 | **Le rendu par navigateur est un second mode, explicite**, pas le défaut. | Il coûte un navigateur et du temps ; le mode statique suffit quand la CSS est un fichier. Le mode rendu répond aux sites qui construisent leurs styles en JS. |
| D4 | **Chaque valeur garde son reçu et sa confiance.** | L'invariant du skill : une mesure n'est pas une décision, et un journaliste ne peut contester que ce dont il voit l'origine. Élargir la collecte ne doit pas diluer la traçabilité. |

**Ce qu'on écarte** : deviner une couleur de marque par fréquence seule (le « pixel le moins gris »
que `skills/newsroom-charter` interdit explicitement) ; et rendre le navigateur obligatoire.

---

## 3. Ce qui change

### 3.1 La collecte

`stylesheetHrefs` accepte toute feuille que le document lie. Les feuilles tierces notoires
(polices Google, widgets d'analytics) restent identifiables et **ne sont pas exclues** : une
feuille de polices est précisément ce qui porte la typographie. Ce qui compte est de savoir
**d'où** vient une valeur — c'est le rôle du reçu, pas d'un filtre d'hôte.

La note d'échec cesse d'accuser le JavaScript quand aucune feuille n'a été **tentée** : elle dit ce
qui s'est passé (aucune balise trouvée / la feuille n'a pas répondu / la page ne lie rien).

### 3.2 Les couleurs dans un CSS compilé

Un signal de plus, avec son propre poids et son propre reçu : une couleur **récurrente sur des
rôles de marque** dans la feuille (fonds de boutons, bandeaux, liens, bordures accentuées),
au-dessus d'un plancher de fréquence, et hors neutres (`isNeutral` existe déjà). Elle se classe
**sous** les signaux déclarés (`theme-color`, propriété nommée, masthead) : une couleur déduite
reste `inferred`, et le reçu le dit.

### 3.3 Le mode rendu

Un second collecteur, explicite, derrière le même contrat que `collectSiteSources` : rendre la
page avec le navigateur déjà installé, lire les feuilles effectivement appliquées et les styles
calculés des éléments de marque. La page l'offre en second essai — « votre site construit ses
styles à l'exécution, je peux l'ouvrir pour de vrai » — jamais en premier, et jamais en silence.

### 3.4 Le nom de famille

`firstFamily` cesse de rendre `Roboto)`. Le correctif est petit ; le test qui le tient doit partir
d'une déclaration `var(--x, Y)` réelle, pas d'une chaîne inventée.

---

## 4. Comment on prouve

**Sur des sites réels, capturés.** Aucun appel réseau dans la suite : on capture le HTML et la CSS
de trois sites de rédaction (dont `heidi.news`, dont un qui construit ses styles en JS) sous forme
de fixtures, et on assert ce que la mesure en tire. Une fixture périmée vaut mieux qu'un test qui
dépend d'internet — et elle documente ce que le web servait ce jour-là.

1. **Le filtre** : la feuille du CDN de Heidi est lue, et la typographie remonte — dont « Sang
   Bleu Kingdom ». **Vérification par mutation** : remettre `abs.hostname !== base.hostname` doit
   faire rougir.
2. **Les couleurs** : sur la fixture Heidi, au moins un candidat de marque **autre que**
   `theme-color`, classé `inferred`, avec un reçu qui nomme ce qui a été vu.
3. **La famille** : `Roboto)` ne sort plus ; le test part de la déclaration réelle qui l'a produit.
4. **La note d'échec** : un site sans aucune balise de feuille produit une note qui dit cela, et
   n'accuse pas le JavaScript.
5. **Le mode rendu** : hors gate (il lance un navigateur), prouvé à la main sur un site JS et
   consigné dans `docs/installer/`, avec ce qu'il coûte en temps.
6. `bun run check` reste vert — **23/23**.

---

## 5. Ce que ça ne fait pas

- **Les moteurs n'apprennent toujours pas la typo.** Elle est mesurée et notée dans le corps du
  profil ; l'appliquer au rendu reste un chantier à part (le §7 du spec du 2026-08-06 le nomme).
- **Aucune promesse de deviner une marque que le site ne porte pas.** Un site qui ne déclare rien
  reste une réponse légitime, et la page continue de le dire.
- **Le mode rendu n'entre pas dans la porte** : il ouvre un navigateur, comme les preuves de rendu
  vidéo, et se vérifie de la même façon — à la main, écrit.
