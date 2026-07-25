# Livraison L1 — suites parkées à la sortie de la branche (2026-07-25)

> Branche `feat/delivery-publishers` off `feat/preflight-setup`. Spec :
> `docs/superpowers/specs/2026-07-25-delivery-publishers-design.md` (§4 = L1).
> La revue finale (whole-branch) a rendu 3 Critical + 2 Important, **tous corrigés** ; la re-revue
> scopée de la vague de fix a rendu *all findings addressed*. Ce qui suit est le résidu : réel,
> non bloquant, parké **avec sa raison** plutôt que corrigé dans une seconde vague — la discipline
> du dispositif interdit d'enchaîner les vagues, et un fix hors revue ne vaut pas mieux qu'un bug.

## À corriger en premier si on rouvre le chantier

| Point | Où | Ruling |
|---|---|---|
| `profile` déréférencé sans garde — un décor sans `profile` lève un `TypeError` au lieu d'un refus borné, dans le module qui documente qu'il ne throw jamais | `lib/loop/deliver.ts:87` | **Réel**, une ligne (`= decor.profile ?? {}`). Non atteignable depuis les appelants typés : `Decor` n'est construit qu'en deux endroits de production (`loadDecor`, `neutralDecor`) et les deux posent `profile`, `tsc` couvre désormais `newsroom`, et aucun appelant `.mjs`/`.js` n'existe. Parké faute d'une seconde vague de revue, pas parce que c'est acceptable. |
| Le message de refus agrégé est tronqué avant d'atteindre le journaliste | `lib/loop/driver.ts:83` (slice 200) vs un message mesuré à 318 caractères pour 2 destinations | La valeur de retour de `deliver()` porte bien les deux refus (testé) ; c'est l'événement écrit au manifest qui coupe. Pas une régression — avant le fix I4 la 2ᵉ destination n'était même pas tentée. |
| §3.10 échoue **ouvert** sur un profil malformé | `skills/splash/src/brand-profile.ts:125-129` → `tryLoadDecor` → `neutralDecor()` | Vérifié : le décor neutre met `state.capabilities` à `{}`, donc `capabilityReadiness` répond `disabled` pour **toutes** les destinations et `deliver` refuse — un profil malformé ne publie pas sans signature. Le résidu réel est plus discret : la dégradation est **totalement silencieuse** (le journaliste ne sait pas que son profil est cassé) et le refus porte une `reason` vide. À traiter avec Verify. |
| La façade hôte n'expose aucun pas de boucle : `splash verb publish` court-circuite `deliver()` entièrement | `lib/host/cli.ts:126-176` (commandes `verbs`/`state`/`next`/`verb`/`newsroom`) | **Réel et structurel.** Un hôte non-JS (Goose, la cible de B) peut lire l'état et exécuter un verbe brut, mais ne peut pas exécuter un pas de la boucle. `next` répond `deliver` sans qu'aucune commande ne puisse l'effectuer ; la seule voie hôte, `verb publish`, contourne le gate de sign-off, le contrôle de fraîcheur de provenance, la métadonnée dérivée du profil et la readiness — toutes portées par `deliver()`. Pas un bloquant pour le sous-projet suivant ; à trancher soit en exposant un pas de boucle à la façade, soit en portant le gate dans le verbe. |

## Résidus mineurs

- `nextActions` reste `["deliver"]` pour une destination définitivement non configurée : un runner autonome ré-appendra le même événement d'échec à chaque tour. Pré-existant, identique avant/après le fix I4 et pour une destination unique.
- Une destination qui a un effet de bord **puis** échoue (déploiement OK, `verifyServed` KO) voit son message perdu pour ce tour si une destination suivante réussit — et le déploiement vivant-non-enregistré est recréé au tour d'après.
- `PUBLISHERS_REGISTERED` a changé de sens : « ces ids sont revendiqués par quelqu'un », pas « nos adapters sont enregistrés ». Premier arrivé gagne, intentionnel.
- `{{width}}` dans un gabarit rend `{700}` (accolades résiduelles) au lieu d'un refus propre — la classe même de défaut que `lib/delivery/snippet.ts` existe pour empêcher.
- `README.md` / `EMBED.txt` du ZIP sont en anglais quel que soit `metadata.lang`. Le fix C2 rend enfin la langue disponible ; traduire le texte est une décision séparée. La spec §4.4 liste ce test comme requis — il n'existe pas.
- Deux sources de vérité pour « implémenté » : `Publisher.implemented` et `NEWSROOM_CAPABILITIES[id].implemented`, sans test qui les verrouille d'accord. Un désaccord ferait dire « prêt » à la readiness et `not-implemented` au verbe.
- `assertInvariants` (`lib/loop/manifest.ts`) garde `review`/`approved` sans artefact, mais pas `delivery.delivered`.
- `skills/splash/scripts/deploy-embed.mjs:122` fuit toujours son dossier de staging (corrigé seulement dans le wrapper neuf). Legacy — meurt avec sa coquille (décision 1 de la spec).
- `verify-embed-delivery.mjs:50` passe l'environnement entier comme `credentials`, ce que `lib/loop/deliver.ts` refuse par principe. Script opt-in seulement.
- `cloudflare-pages.ts:134,144` gardent des défauts de paramètre `= process.env` — jamais exercés sur le chemin publish (I5 tient), mais un appel distrait les réveille.
- `lib/core/publishers.test.ts` laisse des publishers stub dans le registry global sans `afterAll` — même classe que le déclencheur C1, sans danger depuis que l'enregistrement est non-fatal.
- `lib/newsroom/decor.ts:129-131` : un crédit contenant `{name}` sans `source.name` ship le littéral `{name}` dans `metadata.json`.
- Le chemin hôte `verb publish` court-circuite `deliver()` et fournit ses propres métadonnées : les faits de profil de la §3.5 ne valent que pour le chemin boucle.

## Le défaut le plus instructif de la session

`bun run check` était **vert par chance d'ordonnancement de fichiers**. `scripts/check.mjs` lance
`bun test` avec `cwd: "lib"` ; depuis la racine du repo, les mêmes 58 fichiers donnaient
**421 pass / 13 fail**. Cause : `lib/core/verbs/publish.test.ts` laissait un stub `zip` dans le
registry global, la composition root throwait sur le doublon, et `PUBLISHERS_REGISTERED` restait
en TDZ — si bien que la garde écrite pour prouver que le registry avait chargé était précisément
ce qui throwait quand il n'avait pas chargé.

**Leçon à garder :** un gate qui ne lance les tests que depuis un seul cwd ne prouve pas
l'indépendance à l'ordre des fichiers. Un registry global partagé entre fichiers de test dans un
même process est un état global — il se traite comme tel (`afterAll`, enregistrement idempotent),
pas comme un détail d'implémentation.
