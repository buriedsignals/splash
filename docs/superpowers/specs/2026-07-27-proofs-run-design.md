# Spec — Les preuves opt-in : réparées, lançables, et leur pourriture rendue bruyante

> **Statut :** livré. Branche `feat/proofs-run`, off `main` @ `ae3a1017`.
> **Langue :** prose FR, identifiants/code en anglais (standard non-négociable).
> *(Note rédigée à la clôture : l'agent a décroché — erreur d'infrastructure — pendant qu'il
> l'écrivait. Les quatre réparations et le runner étaient faits ; le reste a été vérifié et
> complété à la main.)*

---

## 1. Ce qui n'allait pas

Ce projet se défend avec des **preuves opt-in** : des tests gardés par une variable
d'environnement, qui montent une vraie infrastructure, produisent un vrai artefact par le vrai
pipeline, et vérifient **la chose livrée** plutôt qu'un rapport à son sujet. Elles existent parce
que les tests ordinaires restaient verts pendant que l'artefact était faux.

**Quatre des six échouaient sur `main`, et personne ne le savait.** Mesuré :

| preuve | état avant |
|---|---|
| `lib/verify/rendered-title-proof.test.ts` | passait |
| `lib/verify/real-artifact-proof.test.ts` | passait |
| `lib/source/wiring-proof.test.ts` | **1 pass / 1 fail** |
| `lib/loop/multi-deliverable-e2e.test.ts` | **échouait** |
| `lib/loop/video-e2e.test.ts` | **échouait** |
| `lib/loop/delivery-genre-e2e.test.ts` | **échouait** |

**La cause n'est pas un bug produit — c'est l'inverse.** Chaque fixture décrivait un monde
antérieur à une porte devenue réelle : une source déclarée obligatoire, un intent nommé sur
l'angle, une approbation avant livraison. Les refus étaient le produit qui **fonctionne**. Les
preuves, elles, avaient cessé d'être vraies sans que rien ne le dise.

**Et la raison pour laquelle personne ne le savait est d'une simplicité gênante :
`scripts/check.mjs` n'en lançait aucune.** C'est la maladie que cette refonte poursuit depuis le
début — un mécanisme existe et rien ne l'invoque — appliquée cette fois à la couche de
vérification elle-même.

---

## 2. Les quatre réparations

Aucune assertion n'a été affaiblie. Le sujet **est** des preuves devenues fausses : les baisser
aurait été le pire résultat possible. Chaque fixture a été amenée au contrat que la boucle
applique aujourd'hui — déclarer sa source, nommer son intent, traverser la chaîne
capture → review → preview → approve avant de livrer.

C'est le message des commits : *« the S3 genre proof declares its source and walks the approval
gate »*, *« the wiring proof walks the approval chain it used to publish around »*.

---

## 3. `bun run proofs` — la moitié « quelqu'un les lance »

Un runner unique (`scripts/proofs.mjs`) : `bun run proofs` · `-- --list` · `-- <substring>`.

Deux contraintes **mesurées**, pas supposées, sont inscrites dans le fichier :

1. **Un fichier par process, en série.** `rendered-title-proof` cale sur son premier lancement de
   navigateur quand il tourne dans le même process après `real-artifact-proof` (reproduit deux
   fois) ; deux preuves en parallèle ont fait passer `real-artifact-proof` de 34 s à un timeout de
   300 s. C'est plus lent **exprès**.
2. **Ici, un skip EST un échec.** `test.skipIf(!RUN)` fait qu'une preuve dont le nom de porte
   dérive rapporte « 0 fail » et sort 0 — **verte, sans rien avoir prouvé**. C'est exactement la
   classe de faux vert que ces preuves existent pour tuer, donc le runner la refuse et nomme la
   porte qui n'a pas pris.

**Vérifié à la clôture : 6/6 en 2 min 21** (41 s · 34 s · 27 s · 20 s · 12 s · 7 s), MinIO monté
sous colima pour la preuve S3, conteneur retiré ensuite.

---

## 4. La moitié « on l'apprend sans les lancer » — et ce qu'elle rate

Les preuves sont opt-in parce qu'elles sont lentes et exigent de l'infrastructure. Les mettre dans
`bun run check` serait payer des minutes à chaque run pour attraper une classe rare. La question
posée était donc : **quelle est la garde la moins chère qui aurait attrapé ces quatre-là ?**

**Réponse : le refus qui les a pourries est décidable depuis la fixture seule.** Chaque fichier de
preuve porte désormais un test **toujours actif, hors de la porte** — la seule partie que
`bun run check` exécute — qui passe la fixture au validateur réel :

```
test("the fixture declares a source the loop will accept, before any render", () => {
  const verdict = validateSourcePolicy(run.sources?.data, { mode: run.sources?.mode });
  expect(verdict.ok ? "accepted" : `${verdict.code}: ${verdict.message}`).toBe("accepted");
});
```

Ni Remotion, ni navigateur, ni endpoint : **3,5 ms**. Vérifié en cassant réellement une fixture
(`kind: "local"` → `"synthetic"`) → rouge, avec le message actionnable du produit
(*« synthetic data cannot ship in a run that calls itself reporting »*).

### Ce que cette garde NE rattrape PAS — dit franchement

- **Elle ne couvre qu'une porte à la fois.** Elle a été écrite contre la politique de source parce
  que c'est ce qui a cassé. Une porte **future** — une nouvelle pré-condition à `deliver`, un
  champ neuf obligatoire — repourrira les preuves exactement pareil, et cette garde ne dira rien.
  Le motif est reproductible (passer la fixture au validateur réel), mais quelqu'un doit y penser
  **à chaque nouvelle porte**.
- **Elle ne vérifie pas que la preuve prouve encore quelque chose.** Une fixture peut être valide
  et l'assertion devenue vacue — c'est arrivé le même jour à la preuve des beats
  (`not.toContain` sur des captions calculées à l'exécution, donc jamais dans le bundle). Aucune
  garde bon marché ne voit ça ; il faut lancer, et regarder.
- **Elle ne remplace pas l'exécution.** Elle transforme « cassée depuis des semaines, découverte
  par hasard » en « cassée, visible au prochain `check` » **pour cette classe de refus**. Rien de
  plus.

---

## 5. Risques assumés

- **Rien ne lance `bun run proofs` automatiquement.** C'est une commande, pas un cron ni un job
  CI. La décision d'en faire une étape périodique (avant un merge dans `main`, ou une fois par
  jour) appartient à Rémy : elle exige une machine avec Docker, une clé MapTiler et un `.env`, ce
  qu'un runner CI public n'a pas.
- **La preuve S3 exige MinIO monté à la main.** Documenté dans le runner et dans le README ; le
  runner ne monte pas l'infrastructure à la place de l'opérateur, délibérément — un runner qui
  démarre et détruit des conteneurs est un runner qui peut détruire le mauvais.
- **`bun run check` ne lance toujours aucune preuve complète.** C'est le compromis assumé du §4,
  pas un oubli.
