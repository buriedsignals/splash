# Livraison L2 (S3) — preuve F4 et suites parkées à la sortie de la branche (2026-07-25)

> Branche `feat/delivery-s3` off `feat/delivery-publishers` (L1). Spec :
> `docs/superpowers/specs/2026-07-25-delivery-publishers-design.md` (§5 = L2).
> La revue finale whole-branch a rendu **0 Critical, 5 Important, 7 Minor** ; une vague de fix
> unique a fermé les 5 Important plus 3 Minor co-localisés, et la re-revue scopée a rendu
> *all findings addressed, no new breakage*. Ce qui suit est le résidu — réel, non bloquant,
> parké **avec sa raison** — et la preuve live qu'il ne faut pas perdre avec le workspace.

## La preuve qui manquait : le refus F4, exécuté

Le fait F4 (§5.1) dit que l'adapter **ne doit pas** poser de bucket policy : rendre un bucket public
est une modification de l'infrastructure de la rédaction, dont la portée dépasse l'objet livré.
L'adapter vérifie l'accès anonyme et refuse. C'est la promesse centrale de cet adapter — et la revue
finale a constaté qu'elle n'avait **jamais été exécutée** : inatteignable hors-ligne (il faut un
serveur), et la preuve live avait tourné contre un bucket déjà public, donc happy-path seulement.

Exécutée depuis, contre MinIO `RELEASE.2025-09-07T16-13-09Z` (colima), bucket `splash-embeds` avec
policy `private` vérifiée (`mc anonymous get`) :

```
code    = engine-failed
message = s3: uploaded s3-delivery-proof-19077.html but it is not publicly readable (anonymous GET
          of http://127.0.0.1:9000/splash-embeds/s3-delivery-proof-19077.html returned 403) —
          Splash will not change the bucket's access policy on the newsroom's behalf. Grant public
          read to this object (or its prefix) yourself — for example a bucket policy scoped to
          "s3-delivery-proof-19077.html" — then retry.
```

Le 403 atterrit dans la branche F4 dédiée (`s3.ts:290-299`), **pas** dans le non-2xx générique
(`s3.ts:300-305`, formulé `did not serve it back (HTTP 403)`) — les deux formulations sont
structurellement exclusives, ce que la re-revue a vérifié par lecture de code. `mc ls` confirme
l'objet présent (65 B) : c'est bien la vérification post-upload qui refuse, pas l'upload qui échoue.

Happy path re-prouvé sur le **même** bucket après `mc anonymous set download` :
`DELIVERED http://127.0.0.1:9000/splash-embeds/s3-delivery-proof-19208.html`, curl indépendant
HTTP 200, `content-type=text/html`. Garde `prefix` vérifiée live des deux côtés : `/embeds/2026/`
livre, `../evil` refuse avant upload.

**Leçon à garder** (jumelle de celle de L1) : un refus qu'aucun test et aucun run n'a exécuté n'est
pas un comportement, c'est une intention. Les deux seuls chemins du fichier dans ce cas étaient
exactement les deux faits mesurés qui justifient le plus l'adapter — F4 et le parseur XML F6.
Le hors-ligne ne peut pas les atteindre : il faut soit exporter la fonction pure (F6), soit
provoquer la condition en live (F4). Les deux ont été faits.

## Résidus parkés — minors, avec leur ruling

> Registre consolidé : `docs/splash/residuals.md` — statut vérifié contre le code, pile A/B/C.

- **Aucun `fetch` n'a de timeout** (`s3.ts` PUT + GET de vérification). « Échec borné » est tenu en
  *forme* (un `VerbResult`) mais pas en *temps* : un endpoint qui absorbe sans répondre bloque
  `advance()` indéfiniment, sans message. **Ruling** : réel, mais classe pré-existante —
  `cloudflare-pages.ts` (`cf()`) est identique. Le corriger ici fermerait un site sur deux et
  laisserait la classe ouverte. Relève d'une passe « temps borné » sur tout le substrat.
  *Note d'aggravation* : le chemin S3 est le premier qu'une rédaction pointe vers **sa propre**
  machine, potentiellement injoignable — donc la classe devient plus atteignable qu'avant.
- **`publishedAt` est l'instant de signature, pas l'instant vérifié.** **Ruling** : réel, inoffensif
  — enregistre un moment antérieur à la preuve que l'objet est servi, et aucun consommateur ne le
  lit comme un horodatage de preuve.
- **Le script de preuve live laisse son objet et son dossier temp derrière lui.** **Ruling** : réel,
  et le script est opt-in, hors du gate. Le nettoyage comptera le jour où quelqu'un le pointe sur un
  vrai bucket — le même jour où les faits provider non mesurés de §5.2 devront être fermés. Va avec
  ce chantier.
- **Un `snippetTemplate` par-capacité perd contre le transverse** (`deliver.ts`). **Ruling** :
  contestable et théorique — rien n'écrit de template par-capacité aujourd'hui. À revisiter quand la
  page de setup pourra le poser ; changer la précédence maintenant serait non testable par
  construction. *L'argument contraire est réel* : l'histoire L1-C3 qui motive ce champ (« un CMS qui
  refuse les iframes ») est un problème **par-destination**, donc le réglage étroit devrait
  probablement gagner.

## Ce que L2 change au standing des résidus de L1

Un seul item bouge, et il faut le traiter plutôt que le re-parquer :

- **`lib/loop/driver.ts:83` (`message.slice(200)`)** — le refus F4 fait **371 caractères**.
  L'événement d'échec persisté garde `"…Splash will not change the bucket's a"` et **jette tout le
  remède** (« Grant public read to this object … then retry »). Le message le plus actionnable que
  produit le nouvel adapter est précisément celui qui ne rentre pas. Pas bloquant pour le merge —
  la valeur de retour est intacte, donc un journaliste en session le voit — mais à **relever ou
  supprimer**, pas à parquer une seconde fois.
- **`nextActions` boucle sur une destination définitivement non configurable** : même classe
  qu'avant, désormais plus atteignable — `embed-s3` peut être *enabled + ready + inconfigurable*
  (voir ci-dessous). Deuxième symptôme du même écrivain manquant.

Tous les autres résidus L1 restent parkés, intouchés par ce diff. En particulier
`deliver.ts:87` (`profile` déréférencé sans garde) : L2 ajoute un déréférencement structurellement
identique à `deliver.ts:185`, vérifié sûr pour la même raison plus une — `capabilities` est requis
par le schéma, `neutralDecor()` le pose explicitement, et `capabilityReadiness` le déréférence déjà
quatre lignes plus haut.

## Suites qui appartiennent au sous-projet, pas à cette branche

- **La readiness doit compter les `settingsFields` non-secrets.** Aujourd'hui `defaultCapabilities`
  active une capacité sur la seule présence de ses variables d'env, et `capabilityReadiness` répond
  `ready` dès qu'elles sont posées. Une rédaction qui met ses deux clés S3 dans `.env` obtient donc
  une destination *activée et prête* qui refuse chaque livraison. Le canal `settings` ajouté par L2
  est la bonne moitié ; l'autre moitié — une page de setup qui *lit* `settingsFields` et *écrit*
  `capabilities[id].settings` — n'existe nulle part dans l'arbre. Scope Préflight/L3.
  *Fermé ici, en attendant* : le refus nomme désormais l'emplacement
  (`newsroom.json → capabilities["embed-s3"].settings.<name>`, credentials restent dans `.env`).
- **Deux sources de vérité pour « implémenté »** : `Publisher.implemented` et
  `NEWSROOM_CAPABILITIES[id].implemented`, sans test qui les verrouille d'accord. L2 ajoute un
  troisième publisher où les deux côtés s'accordent par chance. Le coût d'un futur désaccord
  (readiness dit « prêt », le verbe dit `not-implemented`) croît par adapter. Le verrou est un test
  de cinq lignes sur `allPublishers() × NEWSROOM_CAPABILITIES` — à faire en **L3**, où deux adapters
  de plus atterrissent.
- **§5.2 reste vrai** : MinIO est un vrai serveur S3, mais ni AWS ni R2. La politique d'accès public
  par défaut de chaque provider, le style d'URL servi par défaut et le `Content-Type` par défaut de
  R2/AWS restent non mesurés, et **doivent l'être avant qu'une rédaction s'appuie dessus en prod**.
  Ils ne changent pas la forme de l'adapter — ils changent ce qu'une rédaction configure.
  *Correction apportée à §5.2 par cette vague* : l'affirmation « les quirks d'URL par provider
  changent ce qu'on configure, pas la forme de l'adapter » vaut pour l'URL **publique** (F5 la rend
  configurée) mais **pas** pour l'**upload** — celui-ci est construit en path-style
  (`/{bucket}/{key}`), donc une rédaction qui colle l'URL virtual-host de son bucket comme
  `endpoint` obtient `/bucket/bucket/key`. Le libellé du champ le dit désormais.
