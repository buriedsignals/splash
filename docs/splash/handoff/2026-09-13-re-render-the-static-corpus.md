# Passation — re-rendre le corpus statique, un beat à la fois

Session dédiée, à valider beat par beat avec Rémy. **Ne pas fusionner sans son accord.**

## Pourquoi ce travail existe

Le design base vient de passer des fontes système macOS aux **Google Fonts**, récupérées à la
demande dans un cache gitignoré (`~/.cache/splash/typefaces`), et resvg rend désormais avec
`loadSystemFonts: false` : un fichier manquant **échoue** au lieu de retomber en silence sur une
face système. Les échelles donnent serif → **Merriweather**, sans → **Open Sans**, geometric sans →
**Montserrat**.

Conséquence : **tous les rendus commités des autres beats sont périmés**, dans des polices que le
code ne résout plus. Ils n'ont pas été re-rendus parce que Rémy voulait voir le choroplèthe d'abord.
C'est fait, c'est validé — le reste du corpus suit.

Deux des trois échecs de suite restants sont ça (ratchet de taille d'export), le troisième est
l'ascendance d'un rendu périmé. Ils doivent tomber avec ce travail.

## L'état de départ

- Branche `maps/sp1-plan-contract`, HEAD `b0fb9188`, 32 commits, **non fusionnée**.
- Le registre de bord fait foi : `.superpowers/sdd/2026-09-12-sp1-map-plan-contract/progress.md`
  (douze rulings, la raison de chaque écart au plan).
- Suite : fast 2805 pass / 3 fail, live 13 pass / 0 fail. Les 3 échecs sont les rendus périmés.
- **80 beats** portent un `render-directions*.mjs` sous `proof/`.

## Le travail

Pour chaque beat, dans l'ordre que tu choisis (grouper par genre est plus rapide qu'alphabétique) :

1. Le re-rendre.
2. **Le REGARDER.** Une suite verte ne prouve aucun des défauts qui comptent. Pour chacun :
   la copie tient-elle dans son panneau à la nouvelle chasse ; un titre a-t-il perdu un cran et
   basculé sur une forme plus courte ; un mot a-t-il perdu un caractère ; un label chevauche-t-il
   un autre label ; la légende tient-elle encore.
3. Le montrer à Rémy et attendre son avis avant de passer au suivant. C'est sa méthode et elle a
   attrapé des choses qu'aucun test n'attrapait.
4. Commiter, **pathspec explicite** (`git add <chemins>` puis `git commit <chemins>`), jamais `-A`,
   jamais nu — l'arbre peut être partagé.

## Ce qui va probablement casser, et c'est prévisible

Montserrat en capitales est **plus large** que la Futura qu'elle remplace. Sur le choroplèthe, ça a
fait tomber le titre de nocturne d'un cran jusqu'à sa forme tronquée. Le correctif générique est déjà
en place — **une taille filée est désormais une hauteur de capitale**, mesurée sur le fichier de
fonte, et l'échelle peut échanger taille contre forme — mais il vit dans
`DirectedChoroplethMap.tsx`, **pas dans le tronc** : la spec avait explicitement mis §1.6 hors
périmètre. Les autres beats n'en héritent donc PAS.

Si tu vois le même symptôme ailleurs, c'est le signal que ce mécanisme doit remonter dans
`shared/design-base/`. **Ne le recopie pas beat par beat** — la recopie du câblage est le défaut que
tout ce chantier a passé son temps à éliminer, démontré six fois par le spike. Remonte-le une fois,
avec ses huit copies portées, et fais-en hériter tout le monde.

## Règles non négociables

- **Bun**, toujours. Jamais npm, jamais node.
- **Aucune mention de Claude ou d'Anthropic** nulle part — commits, code, commentaires, PR.
- Pathspec explicite sur `git add` ET `git commit`.
- Le repo vendorise chaque module du tronc dans `skills/*/scripts/` et
  `skills/splash/assets/root-template/` ; `carried-copies.test.ts` impose l'identité à l'octet. Si tu
  touches un module du tronc, mets ses miroirs à jour.
- resvg tourne en `loadSystemFonts: false` ; une garde dérivée tient chaque site `new Resvg(`. Ne
  l'affaiblis pas.
- Ne fusionne rien sans l'accord explicite de Rémy.

## Ce qui se passe en parallèle

Une autre session continue la passe qualité sur les genres **web, vidéo et scrolly**, en commençant
par le web. Elle touche `skills/chart-web`, `skills/map-web`, `skills/scrolly` et leurs beats.
**Reste sur `proof/` et sur les rendus** ; si tu dois toucher au tronc partagé, dis-le d'abord.
