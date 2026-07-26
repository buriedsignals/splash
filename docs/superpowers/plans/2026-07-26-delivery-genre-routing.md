# Delivery Genre Routing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Router la livraison par genre de format — `static`/`video` sont un fichier qu'on remet (avec son texte alternatif), `interactive`/`scrolly` sont un embed qu'on héberge — et refuser avant toute I/O une destination qui ne sait pas servir le format qu'on lui donne.

**Architecture :** Une table `deliveryGenreFor(format)` dans `lib/core/publishers.ts` (le jumeau d'`artifactMediaFor`) ; chaque `Publisher` déclare les formats qu'il sert (`serves`) ; un routeur pur `defaultDestinationsFor(format, readyIds)` porte la politique par défaut ; `deliver()` porte la légalité dure ; `renderSnippet` cesse d'être iframe-only ; le package du genre `file` remet le fichier + `ALT.txt` au lieu d'un iframe ; une décision `requestDelivery` écrit enfin `delivery.requested` dans le manifeste.

**Tech Stack :** Bun · TypeScript · `bun:test` · zod (schéma du manifeste) · fflate (zip) — aucune dépendance neuve.

**Spec :** `docs/superpowers/specs/2026-07-26-delivery-genre-routing-design.md`
**Worktree :** `/Users/rmdms/Sites/Professional/splash-route`, branche `feat/delivery-genre-routing` (off `feat/format-reach`).

## Global Constraints

- **Runtime Bun.** Jamais `npm`, jamais `node`. Tests `bun:test`, TDD strict : le test qui échoue d'abord.
- **Code, commentaires, identifiants, messages de commit : anglais.** Cette planification est en français, le code ne l'est pas.
- **Aucune mention Claude/Anthropic** dans un commit, un doc, un commentaire (pas de trailer `*-Session`, pas de `Co-Authored-By`).
- **`lib/delivery` et `lib/core` ne lisent jamais l'environnement ambiant** (invariant I5 du contrat de verbes) : toute valeur d'environnement est passée par l'appelant.
- **`deliver()` ne throw jamais** (invariant I1) : tout échec est un `VerbResult` borné. `lib/loop/driver.ts` l'attend sans garde.
- **Le genre `embed` doit rester byte-identique** à ce qu'il produit aujourd'hui (snippet iframe, archive zip). C'est une contrainte testée, pas une intention.
- **Gate final : `bun run check` vert** (~20 checks) avant de considérer la tranche finie.
- Chaque tâche finit par un commit.

**Rappel de vocabulaire, pour ne pas confondre deux tables voisines :** `DELIVERABLE_KIND` (`lib/core/vocabulary.ts:55`) classe un format en `element | motion | page` pour la **diversité de l'offre** (`lib/brain/offer.ts`). `deliveryGenreFor` classe en `file | embed` pour la **livraison**. Elles ne sont pas redondantes : `static` et `interactive` sont tous deux `element` et tombent dans deux genres différents. Ne pas les fusionner.

---

### Task 1: La table du genre

**Files:**
- Modify: `lib/core/publishers.ts` (après `artifactMediaFor`, ~ligne 68)
- Test: `lib/core/publishers.test.ts`

**Interfaces:**
- Consumes: `VisualFormat`, `VISUAL_FORMATS` (`lib/core/vocabulary.ts:17-23`)
- Produces: `export type DeliveryGenre = "file" | "embed"` · `export function deliveryGenreFor(format: VisualFormat): DeliveryGenre`

- [ ] **Step 1: Write the failing test**

Ajouter à la fin de `lib/core/publishers.test.ts` :

```ts
import { deliveryGenreFor } from "./publishers";
import { VISUAL_FORMATS } from "./vocabulary";

describe("deliveryGenreFor", () => {
  it("should deliver a static image and a video as a file", () => {
    expect(deliveryGenreFor("static")).toBe("file");
    expect(deliveryGenreFor("video")).toBe("file");
  });

  it("should deliver an interactive and a scrolly as an embed", () => {
    expect(deliveryGenreFor("interactive")).toBe("embed");
    expect(deliveryGenreFor("scrolly")).toBe("embed");
  });

  it("should answer for every format in the vocabulary", () => {
    for (const f of VISUAL_FORMATS)
      expect(["file", "embed"]).toContain(deliveryGenreFor(f));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/core/publishers.test.ts`
Expected: FAIL — `deliveryGenreFor` n'est pas exporté (erreur d'import / `is not a function`).

- [ ] **Step 3: Write minimal implementation**

Dans `lib/core/publishers.ts`, juste après `artifactMediaFor` :

```ts
/** Where an artifact of a given format is delivered: handed over as a file, or hosted. */
export type DeliveryGenre = "file" | "embed";

// The genre table — deliberately in the same file and keyed the same way as artifactMediaFor
// above. Two registries of the same fact drifting apart has already bitten this codebase twice
// (docs/splash/proposal-brain-followups.md), and "what a format is delivered as" is exactly
// that kind of fact.
//
// Not to be confused with DELIVERABLE_KIND (lib/core/vocabulary.ts): that one classifies a
// format for the OFFER's diversity (element | motion | page). `static` and `interactive` are
// both "element" there and land in DIFFERENT genres here — the two tables answer different
// questions and must not be merged.
//
// TOTAL over VisualFormat on purpose: a fifth format cannot compile without deciding where it
// is delivered.
const DELIVERY_GENRE: Record<VisualFormat, DeliveryGenre> = {
  static: "file",
  video: "file",
  interactive: "embed",
  scrolly: "embed",
};

export function deliveryGenreFor(format: VisualFormat): DeliveryGenre {
  return DELIVERY_GENRE[format];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test lib/core/publishers.test.ts`
Expected: PASS (toute la suite du fichier, pas seulement les 3 tests neufs).

- [ ] **Step 5: Commit**

```bash
git add lib/core/publishers.ts lib/core/publishers.test.ts
git commit -m "feat(core): a format declares the genre it is delivered as"
```

---

### Task 2: Ce que déclare un publisher

**Files:**
- Modify: `lib/core/publishers.ts` (interface `Publisher`, ~ligne 73)
- Modify: `lib/delivery/adapters/zip.ts` (déclaration finale), `lib/delivery/adapters/s3.ts` (déclaration finale), `lib/delivery/adapters/cloudflare-pages.ts` (déclaration finale)
- Modify (compilation) : `lib/core/publishers.test.ts` (`stub()`), `lib/core/verbs/publish.test.ts`, `lib/delivery/index.test.ts`, `lib/loop/deliver.test.ts` — tout littéral `Publisher` doit gagner `serves`
- Test: `lib/delivery/index.test.ts`

**Interfaces:**
- Consumes: `VisualFormat`, `VISUAL_FORMATS`
- Produces: `Publisher.serves: VisualFormat[]` (champ REQUIS de l'interface)

- [ ] **Step 1: Write the failing test**

Ajouter à `lib/delivery/index.test.ts` :

```ts
import { cloudflarePublisher } from "./adapters/cloudflare-pages";
import { s3Publisher } from "./adapters/s3";
import { zipPublisher } from "./adapters/zip";
import { VISUAL_FORMATS } from "../core/vocabulary";

describe("what each shipped adapter declares it can serve", () => {
  it("should let the portable package serve every format", () => {
    expect([...zipPublisher.serves].sort()).toEqual([...VISUAL_FORMATS].sort());
  });

  it("should let object storage serve every format — the newsroom asset-CDN case", () => {
    expect([...s3Publisher.serves].sort()).toEqual([...VISUAL_FORMATS].sort());
  });

  it("should limit Cloudflare Pages to HTML, which is all it resolves at an alias root", () => {
    expect([...cloudflarePublisher.serves].sort()).toEqual([
      "interactive",
      "scrolly",
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/delivery/index.test.ts`
Expected: FAIL — `serves` est `undefined` (`Cannot read properties of undefined`).

- [ ] **Step 3: Write minimal implementation**

Dans `lib/core/publishers.ts`, ajouter le champ à l'interface :

```ts
export interface Publisher {
  /** Matches the decor's capability id ("embed-cloudflare", "zip", …). */
  id: string;
  kind: "hosted" | "package";
  /** The formats this adapter can actually SERVE. `kind` answers where the artifact lands
   * (disk or URL); this answers what it can carry — and the two are not redundant: `zip` is a
   * package and still serves the embed genre (a self-contained HTML inside an archive), which
   * is what makes "no host configured" a working path. Read by lib/loop/deliver.ts BEFORE the
   * verb runs, so an unservable format is refused with nothing staged, uploaded or deployed. */
  serves: VisualFormat[];
  /** false = declared, no body yet. Refused before any I/O. */
  implemented: boolean;
  publish(req: PublishRequest): Promise<VerbResult<PublishOutcome>>;
}
```

Dans `lib/delivery/adapters/zip.ts` :

```ts
export const zipPublisher: Publisher = {
  id: "zip",
  kind: "package",
  // The universal fallback carries anything: it publishes to disk.
  serves: [...VISUAL_FORMATS],
  implemented: true,
  publish,
};
```

(ajouter `import { VISUAL_FORMATS } from "../../core/vocabulary";`)

Dans `lib/delivery/adapters/s3.ts` :

```ts
export const s3Publisher: Publisher = {
  id: "embed-s3",
  kind: "hosted",
  // Object storage addresses every object by its own key, so it serves any format — the
  // newsroom asset-CDN case the genre routing deliberately keeps reachable (spec §2): a big
  // mp4 the CMS refuses, or a CMS that only accepts an embed code. It is no longer the
  // DEFAULT for a file genre; it is still legal when explicitly chosen.
  serves: [...VISUAL_FORMATS],
  implemented: true,
  publish,
};
```

(ajouter `import { VISUAL_FORMATS } from "../../core/vocabulary";`)

Dans `lib/delivery/adapters/cloudflare-pages.ts` :

```ts
export const cloudflarePublisher: Publisher = {
  id: "embed-cloudflare",
  kind: "hosted",
  // Pages only auto-resolves "index.html" at a deployment's bare alias root, so a PNG or an
  // mp4 lands with the right bytes and content-type and STILL cannot be addressed by the URL
  // this adapter returns. That was a 404 discovered at verifyServed — after a real deploy.
  // Declaring the limit here turns it into a refusal before any network call.
  serves: ["interactive", "scrolly"],
  implemented: true,
  publish: publishToPages,
};
```

Puis faire compiler les littéraux `Publisher` des tests en leur ajoutant `serves: [...VISUAL_FORMATS]` (fichiers listés ci-dessus). Aucun autre changement de comportement dans ces tests.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test lib/delivery lib/core` **puis** `cd lib && bunx tsc --noEmit`
Expected: PASS, aucune erreur de type.

⚠️ **Le typecheck n'est pas facultatif ici.** Bun efface les types à l'exécution : un littéral `Publisher` auquel il manque `serves` passe `bun test` sans broncher et ne casse qu'au moment où quelqu'un lit le champ. `lib` est dans les `TSC_DIRS` du gate (`scripts/check.mjs:7`) — c'est `tsc` qui prouve que tous les littéraux ont été mis à jour, pas la suite de tests. Le lancer à chaque tâche qui touche un type, pas seulement en Task 10.

- [ ] **Step 5: Commit**

```bash
git add lib/core/publishers.ts lib/core/publishers.test.ts lib/core/verbs/publish.test.ts lib/delivery lib/loop/deliver.test.ts
git commit -m "feat(delivery): every publisher declares the formats it can serve"
```

---

### Task 3: Le routeur — la politique par défaut

**Files:**
- Create: `lib/delivery/routing.ts`
- Test: `lib/delivery/routing.test.ts`

**Interfaces:**
- Consumes: `deliveryGenreFor` (Task 1), `VisualFormat`
- Produces: `export const HOSTED_PREFERENCE: readonly string[]` · `export const PORTABLE_PACKAGE = "zip"` · `export function defaultDestinationsFor(format: VisualFormat, readyIds: string[]): string[]`

- [ ] **Step 1: Write the failing test**

Créer `lib/delivery/routing.test.ts` :

```ts
import { describe, it, expect } from "bun:test";
import { defaultDestinationsFor } from "./routing";
import { NEWSROOM_CAPABILITIES } from "../newsroom/capabilities";
import { VISUAL_FORMATS } from "../core/vocabulary";
import { deliveryGenreFor } from "../core/publishers";

const EVERY_DELIVERY_ID = Object.values(NEWSROOM_CAPABILITIES)
  .filter((c) => c.kind === "delivery")
  .map((c) => c.id);

describe("defaultDestinationsFor", () => {
  it("should hand a static image over as a package even when a host is ready", () => {
    expect(defaultDestinationsFor("static", EVERY_DELIVERY_ID)).toEqual(["zip"]);
  });

  it("should hand a video over as a package even when a host is ready", () => {
    expect(defaultDestinationsFor("video", EVERY_DELIVERY_ID)).toEqual(["zip"]);
  });

  it("should host an interactive when a hosted destination is ready", () => {
    expect(defaultDestinationsFor("interactive", ["embed-cloudflare"])).toEqual([
      "embed-cloudflare",
    ]);
  });

  it("should fall back to the portable package when no host is ready", () => {
    expect(defaultDestinationsFor("scrolly", [])).toEqual(["zip"]);
    expect(defaultDestinationsFor("interactive", ["zip"])).toEqual(["zip"]);
  });

  it("should never answer with nothing, for any format", () => {
    for (const f of VISUAL_FORMATS) {
      expect(defaultDestinationsFor(f, []).length).toBeGreaterThan(0);
      expect(defaultDestinationsFor(f, EVERY_DELIVERY_ID).length).toBe(1);
    }
  });

  // The drift guard: whatever the set of ready destinations, a file genre never routes to a
  // hosted one by DEFAULT. An explicit choice still can (that legality lives in deliver()).
  it("should never default a file genre to a hosted destination", () => {
    for (const f of VISUAL_FORMATS) {
      if (deliveryGenreFor(f) !== "file") continue;
      expect(defaultDestinationsFor(f, EVERY_DELIVERY_ID)).toEqual(["zip"]);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/delivery/routing.test.ts`
Expected: FAIL — module `./routing` introuvable.

- [ ] **Step 3: Write minimal implementation**

Créer `lib/delivery/routing.ts` :

```ts
// The DEFAULT half of the genre routing (spec §3.3). It answers "where does this go when the
// journalist did not name a destination" — never "is this destination legal", which is
// lib/loop/deliver.ts's half.
//
// PURE: the ready destination ids are passed in, never read from the environment or from a
// decor (invariant I5). The caller — lib/loop/request-delivery.ts — owns that resolution.
import { deliveryGenreFor } from "../core/publishers";
import type { VisualFormat } from "../core/vocabulary";

/** The portable package: no key, always ready, therefore always a possible answer. */
export const PORTABLE_PACKAGE = "zip";

// A DECLARED order, not the registry's iteration order: a default that depends on which
// adapter file happened to be imported first is a default that moves when an import moves.
export const HOSTED_PREFERENCE: readonly string[] = [
  "embed-cms",
  "embed-cloudflare",
  "embed-s3",
  "embed-fly",
];

export function defaultDestinationsFor(
  format: VisualFormat,
  readyIds: string[],
): string[] {
  // A file IS the deliverable: the CMS has a native image/video field with its own alt-text
  // field. Hosting a PNG in order to iframe it was the wrong idea from the start (spec §2).
  if (deliveryGenreFor(format) === "file") return [PORTABLE_PACKAGE];
  const hosted = HOSTED_PREFERENCE.find((id) => readyIds.includes(id));
  // Never an empty list: `zip` needs no key (lib/newsroom/capabilities.ts, `env: []`), which
  // is what makes "no host configured" a working path rather than a dead end.
  return hosted ? [hosted] : [PORTABLE_PACKAGE];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test lib/delivery/routing.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/delivery/routing.ts lib/delivery/routing.test.ts
git commit -m "feat(delivery): default a destination from the format's genre"
```

---

### Task 4: `deliver()` — la légalité dure

**Files:**
- Modify: `lib/loop/deliver.ts` (boucle des destinations pendantes, après le bloc readiness ~ligne 179)
- Test: `lib/loop/deliver.test.ts`

**Interfaces:**
- Consumes: `Publisher.serves` (Task 2), `lookupPublisher` (`lib/core/publishers.ts:87`), `format` déjà résolu à `deliver.ts:126`
- Produces: rien de neuf — un refus supplémentaire, code `invalid-request`

- [ ] **Step 1: Write the failing test**

Ajouter à `lib/loop/deliver.test.ts`. Le fixture d'élément existant est en `interactive` ; ces deux tests le repinnent en `static` **et recalculent la provenance**, sinon `stalenessOf` refuse avant d'atteindre le contrôle testé (`provenanceHash` inclut le format, `manifest.ts:196`).

```ts
import { provenanceHash } from "./manifest";
import { VISUAL_FORMATS } from "../core/vocabulary";

// The element the existing helper builds, re-pinned to a static format with a provenance that
// matches — anything else refuses on staleness before reaching the check under test.
function staticRunWith(requested: string[]) {
  const { run, el } = runWith({ delivery: { requested, delivered: [] } });
  const repinned = {
    ...el,
    proposal: {
      ...el.proposal!,
      options: el.proposal!.options.map((o) => ({
        ...o,
        format: "static" as const,
      })),
    },
  };
  const fixed = {
    ...repinned,
    artifact: {
      ...repinned.artifact!,
      provenanceHash: provenanceHash(run, repinned),
    },
  };
  return { run: { ...run, elements: [fixed] }, el: fixed };
}

describe("a destination that cannot serve the artifact's format", () => {
  const HOSTED_ID = "test-html-only-host";

  it("should refuse before the publisher is ever entered", async () => {
    let entered = 0;
    NEWSROOM_CAPABILITIES[HOSTED_ID] = {
      id: HOSTED_ID,
      label: "Test HTML-only host (throwaway, this test only)",
      kind: "delivery",
      env: [],
      envHelp: {},
      criticalDeps: null,
      implemented: true,
    };
    registerPublisher({
      id: HOSTED_ID,
      kind: "hosted",
      serves: ["interactive", "scrolly"],
      implemented: true,
      async publish() {
        entered += 1;
        return ok({
          publisherId: HOSTED_ID,
          kind: "hosted" as const,
          url: "https://example.invalid/",
          snippet: "",
          publishedAt: new Date().toISOString(),
        });
      },
    });

    try {
      const { run, el } = staticRunWith([HOSTED_ID]);
      const decor = decorWith({
        state: {
          ...DEFAULT_NEWSROOM_STATE,
          capabilities: { [HOSTED_ID]: { enabled: true } },
        },
      });
      const r = await deliver(run, el, runDir, decor, {}, { env: {} });
      expect(r.ok).toBe(false);
      expect(entered).toBe(0);
      expect((r as { message: string }).message).toContain("interactive");
    } finally {
      delete NEWSROOM_CAPABILITIES[HOSTED_ID];
      resetPublishersForTest();
      registerAllPublishers();
    }
  });

  it("should let a hosted destination that DOES serve the format through", async () => {
    const OPEN_ID = "test-serves-everything-host";
    NEWSROOM_CAPABILITIES[OPEN_ID] = {
      id: OPEN_ID,
      label: "Test asset host (throwaway, this test only)",
      kind: "delivery",
      env: [],
      envHelp: {},
      criticalDeps: null,
      implemented: true,
    };
    registerPublisher({
      id: OPEN_ID,
      kind: "hosted",
      serves: [...VISUAL_FORMATS],
      implemented: true,
      async publish() {
        return ok({
          publisherId: OPEN_ID,
          kind: "hosted" as const,
          url: "https://assets.example.invalid/primes.png",
          snippet: '<img src="https://assets.example.invalid/primes.png" alt="x">',
          publishedAt: new Date().toISOString(),
        });
      },
    });

    try {
      const { run, el } = staticRunWith([OPEN_ID]);
      const decor = decorWith({
        state: {
          ...DEFAULT_NEWSROOM_STATE,
          capabilities: { [OPEN_ID]: { enabled: true } },
        },
      });
      const r = await deliver(run, el, runDir, decor, {}, { env: {} });
      expect(r.ok).toBe(true);
      const value = (r as { value: RunElement }).value;
      expect(value.delivery!.delivered[0]!.publisherId).toBe(OPEN_ID);
    } finally {
      delete NEWSROOM_CAPABILITIES[OPEN_ID];
      resetPublishersForTest();
      registerAllPublishers();
    }
  });
});
```

Note pour l'implémenteur : lire d'abord les helpers `runWith` / `decorWith` en tête de `lib/loop/deliver.test.ts` et les imports déjà présents (`registerPublisher`, `resetPublishersForTest`, `registerAllPublishers`, `NEWSROOM_CAPABILITIES`, `DEFAULT_NEWSROOM_STATE`, `ok`) — le test à ~ligne 178 suit exactement ce motif d'enregistrement/démontage. Ajouter seulement les imports manquants.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/loop/deliver.test.ts`
Expected: FAIL sur le premier test — `entered` vaut 1 et `r.ok` est `true` : rien ne consulte `serves` aujourd'hui.

- [ ] **Step 3: Write minimal implementation**

Dans `lib/loop/deliver.ts`, ajouter `lookupPublisher` à l'import de `../core/publishers` :

```ts
import { lookupPublisher, type PublishOutcome } from "../core/publishers";
```

Puis, dans la boucle `for (const publisherId of pending)`, juste après le bloc `readiness` et AVANT la collecte des credentials :

```ts
    // The hard-legality half of the genre routing (spec §3.5). The default never picks a
    // hosted destination for a file genre — but a journalist may name one explicitly, and this
    // is where "explicitly named" stops being enough. Refused BEFORE the verb runs, so nothing
    // is staged, uploaded or deployed: embed-cloudflare used to discover a PNG only at
    // verifyServed, after a real deployment had already gone out.
    //
    // An unregistered id is NOT refused here — that answer belongs to the publish verb
    // (`unknown-publisher`), and duplicating it would give the same situation two different
    // messages depending on which check ran first.
    const publisher = lookupPublisher(publisherId);
    if (publisher && !publisher.serves.includes(format)) {
      refusals.push({
        code: "invalid-request",
        message:
          `${publisherId}: ${cap.label} only serves ${publisher.serves.join(", ")} — ` +
          `a ${format} is handed over as a file (the portable package), or hosted through a destination that serves it`,
      });
      continue;
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test lib/loop/deliver.test.ts`
Expected: PASS — toute la suite du fichier, y compris les tests de repli et de refus existants.

- [ ] **Step 5: Commit**

```bash
git add lib/loop/deliver.ts lib/loop/deliver.test.ts
git commit -m "fix(loop): refuse a destination that cannot serve the artifact's format, before any I/O"
```

---

### Task 5: Le snippet cesse d'être iframe-only

**Files:**
- Modify: `lib/delivery/snippet.ts`
- Modify: `lib/delivery/adapters/zip.ts` (~ligne 93), `lib/delivery/adapters/s3.ts` (`snippetFor`, ~ligne 105), `lib/delivery/adapters/cloudflare-pages.ts` (`embedSnippet`, ~ligne 426) — chacun passe `format: req.format`
- Test: `lib/delivery/snippet.test.ts`

**Interfaces:**
- Consumes: `deliveryGenreFor` (Task 1)
- Produces: `SnippetInput` gagne `format: VisualFormat` (REQUIS) · `export const IMAGE_SNIPPET_TEMPLATE` · `export const VIDEO_SNIPPET_TEMPLATE` · placeholder `{alt}`

- [ ] **Step 1: Write the failing test**

Dans `lib/delivery/snippet.test.ts`, ajouter `format: "interactive"` à **chaque** appel `renderSnippet` existant (ils décrivent tous le genre embed), puis ajouter :

```ts
import { DEFAULT_SNIPPET_TEMPLATE } from "./snippet";

describe("renderSnippet by genre", () => {
  it("should carry the alt text on an image, where the CMS reads it", () => {
    const r = renderSnippet({
      url: "https://assets.example/primes.png",
      id: "primes",
      metadata: META,
      format: "static",
    });
    expect(r.ok).toBe(true);
    const html = (r as { value: string }).value;
    expect(html.startsWith("<img ")).toBe(true);
    expect(html).toContain('alt="Les primes montent partout"');
    expect(html).not.toContain("<iframe");
  });

  it("should give a video a spoken name and a fallback text", () => {
    const r = renderSnippet({
      url: "https://assets.example/primes.mp4",
      id: "primes",
      metadata: META,
      format: "video",
    });
    expect(r.ok).toBe(true);
    const html = (r as { value: string }).value;
    expect(html.startsWith("<video ")).toBe(true);
    expect(html).toContain('aria-label="Les primes montent partout"');
    expect(html).toContain(">Les primes montent partout</video>");
  });

  it("should leave the embed genre byte-identical", () => {
    const r = renderSnippet({
      url: "https://a.example.pages.dev",
      id: "primes",
      metadata: META,
      format: "interactive",
    });
    expect(r).toEqual({
      ok: true,
      value: DEFAULT_SNIPPET_TEMPLATE.replace(
        "{url}",
        "https://a.example.pages.dev",
      )
        .replace("{title}", "Primes cantonales")
        .replace("{width}", "700")
        .replace("{height}", "420"),
    });
  });

  // A house template is iframe-shaped by definition. Applied to a PNG it would produce an
  // iframe pointing at an image — so it is not applied to the file genre at all.
  it("should ignore the newsroom's own template for the file genre", () => {
    const r = renderSnippet({
      url: "https://assets.example/primes.png",
      id: "primes",
      metadata: META,
      format: "static",
      template: '<iframe src="{url}" title="{title}"></iframe>',
    });
    expect(r.ok).toBe(true);
    expect((r as { value: string }).value.startsWith("<img ")).toBe(true);
  });

  it("should still apply the newsroom's own template for the embed genre", () => {
    const r = renderSnippet({
      url: "https://a.example.pages.dev",
      id: "primes",
      metadata: META,
      format: "scrolly",
      template: '<iframe src="{url}" data-house="1"></iframe>',
    });
    expect(r).toEqual({
      ok: true,
      value: '<iframe src="https://a.example.pages.dev" data-house="1"></iframe>',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/delivery/snippet.test.ts`
Expected: FAIL — les nouveaux tests reçoivent un `<iframe>` pour `static`/`video` (et TypeScript signale `format` inconnu dans `SnippetInput`).

- [ ] **Step 3: Write minimal implementation**

Dans `lib/delivery/snippet.ts` :

```ts
import { deliveryGenreFor, type DeliveryMetadata } from "../core/publishers";
import type { VisualFormat } from "../core/vocabulary";

export type SnippetInput = {
  url: string;
  id: string;
  metadata: DeliveryMetadata;
  /** What the artifact IS. An embed genre gets an iframe; a file genre gets the tag its own
   * media type calls for — an iframe around a PNG loses the alt text this codebase fail-hards
   * everywhere else. */
  format: VisualFormat;
  /** The newsroom's tested template. Absent ⇒ DEFAULT_SNIPPET_TEMPLATE. */
  template?: string;
};

// The file-genre templates. They carry {alt}, not {title}: a CMS field and a screen reader
// both read the alternative text, and it is the artifact's own accessible name — the iframe
// templates' {title} names a frame, which is a different thing.
export const IMAGE_SNIPPET_TEMPLATE =
  '<img src="{url}" alt="{alt}" width="{width}" style="max-width:100%;height:auto">';

export const VIDEO_SNIPPET_TEMPLATE =
  '<video src="{url}" controls playsinline aria-label="{alt}" width="{width}" style="max-width:100%;height:auto">{alt}</video>';
```

Dans `renderSnippet`, remplacer le calcul du template et la garde `responsive` :

```ts
export function renderSnippet(input: SnippetInput): VerbResult<string> {
  const { metadata: m } = input;
  const genre = deliveryGenreFor(input.format);
  const responsive = m.height === "responsive";

  // A house template describes an EMBED — it is iframe-shaped by definition (that is what a
  // CMS's "embed code" field takes). Applied to a PNG it would wrap an image in an iframe, so
  // the file genre uses its own built-in tag and the template is not consulted at all.
  const template =
    genre === "file"
      ? input.format === "video"
        ? VIDEO_SNIPPET_TEMPLATE
        : IMAGE_SNIPPET_TEMPLATE
      : (input.template ?? (responsive ? RESPONSIVE_TEMPLATE : DEFAULT_SNIPPET_TEMPLATE));

  // ... la garde responsive/{height} existante, désormais bornée au genre embed :
  if (
    genre === "embed" &&
    responsive &&
    input.template !== undefined &&
    input.template.includes("{height}")
  )
    return fail(/* message inchangé */);
```

Et ajouter `alt` aux valeurs substituables :

```ts
  const values: Record<string, string> = {
    url: escapeHtmlAttr(input.url),
    id: escapeHtmlAttr(input.id),
    title: escapeHtmlAttr(m.title),
    // Available to the embed templates too: a newsroom template may legitimately want it, and
    // it was previously an "unknown placeholder" refusal.
    alt: escapeHtmlAttr(m.altText),
    source: escapeHtmlAttr(m.source),
    credit: escapeHtmlAttr(m.credit),
    lang: escapeHtmlAttr(m.lang),
    width: String(m.width ?? 700),
    height: responsive ? "" : String(m.height ?? 420),
  };
```

Dans les trois adapters, passer le format. `lib/delivery/adapters/s3.ts` (`snippetFor`) et `lib/delivery/adapters/cloudflare-pages.ts` (`embedSnippet`) :

```ts
  return renderSnippet({
    url,
    id: req.id,
    metadata: req.metadata,
    format: req.format,
    ...(req.settings.snippetTemplate
      ? { template: req.settings.snippetTemplate }
      : {}),
  });
```

`lib/delivery/adapters/zip.ts` : ajouter `format: req.format,` au `renderSnippet` de la ligne ~93 (Task 7 rendra cet appel conditionnel au genre embed).

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test lib/delivery`
Expected: PASS, y compris les tests d'adapter existants (cloudflare/s3/zip) inchangés.

- [ ] **Step 5: Commit**

```bash
git add lib/delivery/snippet.ts lib/delivery/snippet.test.ts lib/delivery/adapters
git commit -m "feat(delivery): a snippet takes the shape its format calls for, not always an iframe"
```

---

### Task 6: Un package fichier n'a pas de snippet

**Files:**
- Modify: `lib/core/publishers.ts` (`PublishOutcome.snippet`)
- Modify: `lib/loop/manifest.ts:103` (schéma zod du `DeliveryRecord`)
- Modify: `lib/loop/deliver.ts:239` (construction de l'enregistrement)
- Test: `lib/loop/manifest.test.ts` et `lib/loop/deliver.test.ts`

**Interfaces:**
- Produces: `PublishOutcome.snippet?: string` · `DeliveryRecord.snippet` optionnel

- [ ] **Step 1: Write the failing test**

Dans `lib/loop/deliver.test.ts` :

```ts
it("should record a delivery that has no embed code without inventing one", async () => {
  const FILE_ID = "test-file-package";
  NEWSROOM_CAPABILITIES[FILE_ID] = {
    id: FILE_ID,
    label: "Test file package (throwaway, this test only)",
    kind: "delivery",
    env: [],
    envHelp: {},
    criticalDeps: null,
    implemented: true,
  };
  registerPublisher({
    id: FILE_ID,
    kind: "package",
    serves: [...VISUAL_FORMATS],
    implemented: true,
    async publish() {
      return ok({
        publisherId: FILE_ID,
        kind: "package" as const,
        publishedAt: new Date().toISOString(),
      });
    },
  });

  try {
    const { run, el } = staticRunWith([FILE_ID]);
    const decor = decorWith({
      state: {
        ...DEFAULT_NEWSROOM_STATE,
        capabilities: { [FILE_ID]: { enabled: true } },
      },
    });
    const r = await deliver(run, el, runDir, decor, {}, { env: {} });
    expect(r.ok).toBe(true);
    const record = (r as { value: RunElement }).value.delivery!.delivered[0]!;
    expect("snippet" in record).toBe(false);
  } finally {
    delete NEWSROOM_CAPABILITIES[FILE_ID];
    resetPublishersForTest();
    registerAllPublishers();
  }
});
```

Et dans `lib/loop/manifest.test.ts` :

```ts
it("should accept a delivered record with no embed code", () => {
  const parsed = RunManifestSchema.safeParse(
    manifestWithDelivered({
      publisherId: "zip",
      kind: "package",
      artifact: { path: "elements/e1/primes.zip", sha256: "a".repeat(64) },
      publishedAt: "1980-01-01T12:00:00.000Z",
      deliveredProvenanceHash: "b".repeat(64),
    }),
  );
  expect(parsed.success).toBe(true);
});
```

Note pour l'implémenteur : `manifestWithDelivered` n'existe pas — construire le manifeste comme les tests voisins du fichier le font déjà (lire les helpers en tête de `lib/loop/manifest.test.ts` et suivre le même motif), avec un `delivery.delivered` contenant exactement l'objet ci-dessus.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/loop/deliver.test.ts lib/loop/manifest.test.ts`
Expected: FAIL — le schéma refuse l'absence de `snippet`, et le type `PublishOutcome` exige le champ (erreur de compilation dans le stub).

- [ ] **Step 3: Write minimal implementation**

`lib/core/publishers.ts` :

```ts
export type PublishOutcome = {
  publisherId: string;
  kind: "hosted" | "package";
  /** Hosted destinations. */
  url?: string;
  /** Owned packages. */
  path?: string;
  /** The embed code, when there IS one. A file-genre package has none: the CMS takes the file
   * in its image/video field and the alt text in the field next to it (spec §3.8). Writing ""
   * would make the manifest say "delivered with an empty embed code", which is a different
   * and false claim. */
  snippet?: string;
  publishedAt: string;
};
```

`lib/loop/manifest.ts:103` :

```ts
          snippet: z.string().optional(),
```

`lib/loop/deliver.ts:239` — remplacer `snippet: outcome.snippet,` par :

```ts
        ...(outcome.snippet ? { snippet: outcome.snippet } : {}),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test lib/loop lib/core`
Expected: PASS. Aucune migration : les manifestes existants portent le champ, un champ devenu optionnel valide toujours.

- [ ] **Step 5: Commit**

```bash
git add lib/core/publishers.ts lib/loop/manifest.ts lib/loop/manifest.test.ts lib/loop/deliver.ts lib/loop/deliver.test.ts
git commit -m "feat(delivery): a delivery without an embed code records none"
```

---

### Task 7: Le package du genre `file`

**Files:**
- Modify: `lib/delivery/adapters/zip.ts`
- Test: `lib/delivery/adapters/zip.test.ts`

**Interfaces:**
- Consumes: `deliveryGenreFor` (Task 1), `PublishOutcome.snippet` optionnel (Task 6)
- Produces: `export function filePackageReadme(m: DeliveryMetadata, id: string, entryName: string, format: VisualFormat): string` (exporté pour être testé directement, comme `zipReadme` l'est déjà)

- [ ] **Step 1: Write the failing test**

Dans `lib/delivery/adapters/zip.test.ts` :

```ts
function staticRequest(): PublishRequest {
  const artifact = join(root, "static.png");
  writeFileSync(artifact, "PNG-BYTES");
  const outDir = join(root, "out");
  mkdirSync(outDir, { recursive: true });
  return {
    artifactPath: artifact,
    id: "primes",
    format: "static",
    metadata: {
      title: "Primes cantonales",
      altText: "Les primes montent",
      source: "OFSP",
      credit: "Heidi.news",
      lang: "fr",
      width: 700,
      height: 420,
    },
    settings: { publisherId: "zip" },
    credentials: {},
    outDir,
  };
}

describe("the zip publisher, file genre", () => {
  it("should package the file and the alt text, and no embed code at all", async () => {
    const r = await zipPublisher.publish(staticRequest());
    expect(r.ok).toBe(true);
    const outcome = (r as { value: { path: string; snippet?: string } }).value;
    expect(outcome.snippet).toBeUndefined();

    const entries = unzipSync(new Uint8Array(readFileSync(outcome.path)));
    expect(Object.keys(entries).sort()).toEqual([
      "ALT.txt",
      "README.md",
      "index.png",
      "metadata.json",
    ]);
    expect(strFromU8(entries["ALT.txt"]!)).toBe("Les primes montent\n");
    const readme = strFromU8(entries["README.md"]!);
    expect(readme).toContain("image field");
    expect(readme).toContain("ALT.txt");
    expect(readme).not.toContain("<iframe");
    expect(readme).not.toContain("Upload `index.png` anywhere");
  });

  it("should name the video field for a video", async () => {
    const req = { ...staticRequest(), format: "video" as const };
    const r = await zipPublisher.publish(req);
    expect(r.ok).toBe(true);
    const entries = unzipSync(
      new Uint8Array(readFileSync((r as { value: { path: string } }).value.path)),
    );
    expect(Object.keys(entries)).toContain("index.mp4");
    expect(strFromU8(entries["README.md"]!)).toContain("video field");
  });

  it("should leave the embed genre's archive byte-identical", async () => {
    const a = await zipPublisher.publish(request());
    const first = readFileSync((a as { value: { path: string } }).value.path);
    const b = await zipPublisher.publish(request());
    const second = readFileSync((b as { value: { path: string } }).value.path);
    expect(Buffer.from(first).equals(Buffer.from(second))).toBe(true);
    const entries = unzipSync(new Uint8Array(first));
    expect(Object.keys(entries).sort()).toEqual([
      "EMBED.txt",
      "README.md",
      "index.html",
      "metadata.json",
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/delivery/adapters/zip.test.ts`
Expected: FAIL — l'archive du genre `file` contient `EMBED.txt`, pas d'`ALT.txt`, et le README parle d'iframe.

- [ ] **Step 3: Write minimal implementation**

Dans `lib/delivery/adapters/zip.ts`, ajouter le README du genre fichier à côté de `zipReadme` (que l'on ne touche PAS) :

```ts
// The file genre's README. It never mentions hosting or an embed code: the CMS has a native
// image/video field, with its own alternative-text field next to it. Splash cannot fill that
// field — handing the text over is the whole a11y answer here (spec §2).
export function filePackageReadme(
  m: DeliveryMetadata,
  id: string,
  entryName: string,
  format: VisualFormat,
): string {
  const field = format === "video" ? "video" : "image";
  return [
    `# ${m.title}`,
    "",
    m.altText,
    "",
    "## How to integrate",
    "",
    `1. Upload \`${entryName}\` through your CMS's ${field} field.`,
    "2. Paste the text from `ALT.txt` into the alternative-text field next to it — that is what",
    "   a screen reader announces, and Splash cannot put it there for you.",
    "",
    `Source: ${m.source}`,
    m.credit ? `Credit: ${m.credit}` : "",
    `Identifier: ${id}`,
    "",
  ]
    .filter((line, i, all) => !(line === "" && all[i - 1] === ""))
    .join("\n");
}
```

Puis, dans `publish`, remplacer le bloc « snippet → archive » par une bifurcation de genre (le reste — garde `isSafeId`, lecture de l'artefact, `FIXED_MTIME`, écriture, gestion d'erreur — est inchangé) :

```ts
  const genre = deliveryGenreFor(req.format);
  const entryName = `index.${artifactMediaFor(req.format).extension}`;

  // The embed genre keeps its snippet — and the newsroom's own template still applies to it,
  // exactly as before (§3.3 of the delivery-publishers spec). The file genre has no snippet
  // at all, so nothing is rendered and nothing can refuse.
  let snippetValue: string | undefined;
  if (genre === "embed") {
    const snippet = renderSnippet({
      url: "YOUR-URL-HERE",
      id: req.id,
      metadata: req.metadata,
      format: req.format,
      ...(req.settings.snippetTemplate
        ? { template: req.settings.snippetTemplate }
        : {}),
    });
    if (!snippet.ok) return snippet;
    snippetValue = snippet.value;
  }
```

… puis la construction des entrées :

```ts
  // Pas d'annotation de type sur `files` : la forme attendue est le `Zippable` de fflate, et
  // une annotation maison entrerait en conflit avec elle.
  const files =
    genre === "embed"
      ? {
          [entryName]: [artifact, opts],
          "EMBED.txt": [strToU8(snippetValue! + "\n"), opts],
          "README.md": [
            strToU8(zipReadme(req.metadata, req.id, snippetValue!, entryName)),
            opts,
          ],
          "metadata.json": [strToU8(JSON.stringify(metadata, null, 2) + "\n"), opts],
        }
      : {
          [entryName]: [artifact, opts],
          "ALT.txt": [strToU8(req.metadata.altText + "\n"), opts],
          "README.md": [
            strToU8(
              filePackageReadme(req.metadata, req.id, entryName, req.format),
            ),
            opts,
          ],
          "metadata.json": [strToU8(JSON.stringify(metadata, null, 2) + "\n"), opts],
        };

  let archive: Uint8Array;
  try {
    archive = zipSync(files, { level: 6 });
  } catch (e) {
```

… et l'issue :

```ts
  return ok({
    publisherId: "zip",
    kind: "package",
    path,
    ...(snippetValue !== undefined ? { snippet: snippetValue } : {}),
    publishedAt: FIXED_PUBLISHED_AT,
  });
```

Imports à ajouter : `deliveryGenreFor` depuis `../../core/publishers`, `type VisualFormat` depuis `../../core/vocabulary`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test lib/delivery`
Expected: PASS — dont le test de déterminisme doré existant, inchangé.

- [ ] **Step 5: Commit**

```bash
git add lib/delivery/adapters/zip.ts lib/delivery/adapters/zip.test.ts
git commit -m "feat(delivery): a file-genre package hands over the file and its alt text"
```

---

### Task 8: `requestDelivery` — le producteur de `requested`

**Files:**
- Create: `lib/loop/request-delivery.ts`
- Test: `lib/loop/request-delivery.test.ts`

**Interfaces:**
- Consumes: `defaultDestinationsFor` (Task 3), `chosenOption`/`stalenessOf` (`lib/loop/manifest.ts:165,200`), `capabilityReadiness` (`lib/newsroom/readiness.ts:39`), `decorEnv`/`Decor` (`lib/newsroom/decor.ts`)
- Produces: `export function requestDelivery(run: RunManifest, el: RunElement, decor: Decor, opts?: RequestDeliveryOpts): VerbResult<RunElement>` avec `RequestDeliveryOpts = { destinations?: string[]; env?: Record<string, string | undefined> }`

- [ ] **Step 1: Write the failing test**

Créer `lib/loop/request-delivery.test.ts`. Réutiliser les helpers de fabrication de run/decor du fichier voisin `lib/loop/deliver.test.ts` (les lire d'abord et les recopier localement — ce sont des fixtures de test, pas du code partagé) :

```ts
import { describe, it, expect } from "bun:test";
import { requestDelivery } from "./request-delivery";
import type { RunElement } from "./manifest";

describe("requestDelivery", () => {
  it("should default a static element to the portable package", () => {
    const { run, el } = staticRunFixture();
    const r = requestDelivery(run, el, decorFixture(), { env: {} });
    expect(r.ok).toBe(true);
    expect((r as { value: RunElement }).value.delivery!.requested).toEqual([
      "zip",
    ]);
  });

  it("should default an interactive element to a ready host", () => {
    const { run, el } = interactiveRunFixture();
    const decor = decorFixture({
      capabilities: { "embed-cloudflare": { enabled: true } },
    });
    const r = requestDelivery(run, el, decor, {
      env: {
        CLOUDFLARE_API_TOKEN: "t",
        CLOUDFLARE_ACCOUNT_ID: "a",
        CLOUDFLARE_PAGES_PROJECT: "p",
      },
    });
    expect(r.ok).toBe(true);
    expect((r as { value: RunElement }).value.delivery!.requested).toEqual([
      "embed-cloudflare",
    ]);
  });

  it("should honour a destination the journalist names, without deriving one", () => {
    const { run, el } = staticRunFixture();
    const r = requestDelivery(run, el, decorFixture(), {
      destinations: ["embed-s3"],
      env: {},
    });
    expect(r.ok).toBe(true);
    expect((r as { value: RunElement }).value.delivery!.requested).toEqual([
      "embed-s3",
    ]);
  });

  it("should refuse a destination this install does not know", () => {
    const { run, el } = staticRunFixture();
    const r = requestDelivery(run, el, decorFixture(), {
      destinations: ["embed-dropbox"],
      env: {},
    });
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain("embed-dropbox");
  });

  it("should refuse before anything is produced", () => {
    const { run, el } = staticRunFixture();
    const { artifact: _none, ...noArtifact } = el;
    const r = requestDelivery(run, noArtifact as RunElement, decorFixture(), {
      env: {},
    });
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
  });

  it("should keep delivered records already on the element", () => {
    const { run, el } = staticRunFixture();
    const withHistory = {
      ...el,
      delivery: {
        requested: [],
        delivered: [
          {
            publisherId: "zip",
            kind: "package" as const,
            publishedAt: "1980-01-01T12:00:00.000Z",
            deliveredProvenanceHash: "old",
          },
        ],
      },
    };
    const r = requestDelivery(run, withHistory, decorFixture(), { env: {} });
    expect(r.ok).toBe(true);
    expect(
      (r as { value: RunElement }).value.delivery!.delivered.length,
    ).toBe(1);
  });
});
```

Les fixtures à écrire dans le fichier de test : `staticRunFixture()` / `interactiveRunFixture()` produisent un run dont l'élément a une `angle`, une `proposal` avec `chosenId` et une option portant `format: "static"` (resp. `"interactive"`), plus un `artifact` dont le `provenanceHash` est calculé par `provenanceHash(run, el)`. `decorFixture(state?)` rend un `Decor` avec `root: "/nowhere"`, `state: { ...DEFAULT_NEWSROOM_STATE, capabilities: {...} }`, `language`, `readiness: []`, `profile: { lang: "fr" }` — copier la forme exacte du `decorWith` de `lib/loop/deliver.test.ts`.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/loop/request-delivery.test.ts`
Expected: FAIL — module `./request-delivery` introuvable.

- [ ] **Step 3: Write minimal implementation**

Créer `lib/loop/request-delivery.ts` :

```ts
// The DECISION that names where an element goes — and the missing producer of
// `delivery.requested`, which until now only tests ever wrote.
//
// Why a decision and not a default inside deliver(): manifest.ts's nextActionsForElement
// locks "deliver is a step a DECISION triggers, never an automatic advance — a fresh artifact
// nobody asked to publish stays on show". An element with no `delivery` slot never routes to
// deliver at all, so a default computed inside deliver() would never run. What becomes
// automatic here is only WHERE it goes, and the answer is written into the manifest rather
// than recomputed later: a default re-derived once Cloudflare is configured would
// retroactively change what had been asked for.
import { fail, ok, type VerbResult } from "../core/verbs/types";
import type { VisualFormat } from "../core/vocabulary";
import { defaultDestinationsFor } from "../delivery/routing";
import { NEWSROOM_CAPABILITIES } from "../newsroom/capabilities";
import { capabilityReadiness } from "../newsroom/readiness";
import { decorEnv, type Decor } from "../newsroom/decor";
import {
  chosenOption,
  stalenessOf,
  type RunElement,
  type RunManifest,
} from "./manifest";

export type RequestDeliveryOpts = {
  /** The journalist's own choice. Absent or empty ⇒ derived from the format's genre. */
  destinations?: string[];
  /** The environment readiness is judged against. Defaults to the decor's (never ambient). */
  env?: Record<string, string | undefined>;
};

export function requestDelivery(
  run: RunManifest,
  el: RunElement,
  decor: Decor,
  opts: RequestDeliveryOpts = {},
): VerbResult<RunElement> {
  if (!el.artifact)
    return fail(
      "invalid-request",
      "request-delivery: nothing produced yet — there is no artifact to send anywhere",
    );
  if (stalenessOf(run, el))
    return fail(
      "invalid-request",
      "request-delivery: the artifact is stale — produce it again before choosing where it goes",
    );
  // The same chosen-option resolution produce.ts and deliver.ts use, never a second lookup.
  const chosen = chosenOption(el);
  if (!chosen)
    return fail(
      "invalid-request",
      `request-delivery: element ${el.id} has an artifact but no resolvable chosen option to read its format from`,
    );
  const format: VisualFormat = chosen.format ?? "static";

  let requested: string[];
  if (opts.destinations && opts.destinations.length > 0) {
    const unknown = opts.destinations.filter(
      (id) => NEWSROOM_CAPABILITIES[id]?.kind !== "delivery",
    );
    if (unknown.length > 0)
      return fail(
        "invalid-request",
        `request-delivery: ${unknown.join(", ")} — not a delivery destination this install knows`,
      );
    requested = opts.destinations;
  } else {
    const env = opts.env ?? decorEnv(decor.root);
    const ready = Object.values(NEWSROOM_CAPABILITIES)
      .filter((cap) => cap.kind === "delivery")
      .filter(
        (cap) =>
          capabilityReadiness(cap, decor.state, { env }).status === "ready",
      )
      .map((cap) => cap.id);
    requested = defaultDestinationsFor(format, ready);
  }

  // `delivered` is carried forward untouched: a destination that already landed for an older
  // provenance stays on the record, and deliver()'s own pending computation decides what that
  // means. Naming a destination is not a reason to forget what was published.
  return ok({
    ...el,
    delivery: { requested, delivered: el.delivery?.delivered ?? [] },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test lib/loop/request-delivery.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/loop/request-delivery.ts lib/loop/request-delivery.test.ts
git commit -m "feat(loop): choosing to publish names a destination derived from the format's genre"
```

---

### Task 9: La preuve live — un vrai PNG servi par S3

**Files:**
- Create: `lib/loop/delivery-genre-e2e.test.ts`
- Test: lui-même (opt-in)

**Interfaces:**
- Consumes: `propose`/`produce` (`lib/loop/`), `deliver` (Task 4), `requestDelivery` (Task 8), l'adapter `embed-s3`
- Produces: rien — c'est une preuve

- [ ] **Step 1: Write the failing test**

Créer `lib/loop/delivery-genre-e2e.test.ts`, sur le modèle exact de `lib/loop/video-e2e.test.ts` (lire ce fichier d'abord : il montre comment fabriquer un run productible avec `freezeInput`, `propose` puis `produce`) :

```ts
// Opt-in live proof: a real static PNG, produced by the loop, published to a real
// S3-compatible endpoint, then FETCHED BACK.
//
// The fixture is forbidden here and that is the point. This project's own lesson (2026-07-25):
// the Cloudflare and S3 live proofs used a `.html` fixture, so "every artifact served as
// text/html" survived a live check. A proof that does not start at produce() proves nothing
// about the real path.
//
// Run it with:
//   docker run -p 9000:9000 -e MINIO_ROOT_USER=minioadmin \
//     -e MINIO_ROOT_PASSWORD=minioadmin quay.io/minio/minio server /data
//   SPLASH_S3_E2E=1 SPLASH_S3_ACCESS_KEY_ID=minioadmin \
//     SPLASH_S3_SECRET_ACCESS_KEY=minioadmin bun test lib/loop/delivery-genre-e2e.test.ts
import { test, expect } from "bun:test";
import "../delivery";
import "./engines";

const RUN = process.env.SPLASH_S3_E2E === "1";

test.skipIf(!RUN)(
  "a produced PNG is published as an image and served as one",
  async () => {
    const { run, el, runDir, decor } = await producedStaticRun();

    const asked = requestDelivery(run, el, decor, {
      destinations: ["embed-s3"],
      env: process.env,
    });
    expect(asked.ok).toBe(true);

    const delivered = await deliver(
      run,
      (asked as { value: RunElement }).value,
      runDir,
      decor,
      {},
      { env: process.env },
    );
    expect(delivered.ok).toBe(true);

    const record = (delivered as { value: RunElement }).value.delivery!
      .delivered[0]!;
    expect(record.url).toBeDefined();
    expect(record.snippet).toContain("<img ");
    expect(record.snippet).toContain("alt=");

    const served = await fetch(record.url!);
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toBe("image/png");
    const bytes = new Uint8Array(await served.arrayBuffer());
    // The PNG magic number: the right bytes landed, not just a 200.
    expect([...bytes.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  },
  600_000,
);
```

`producedStaticRun()` : construire le run comme `video-e2e.test.ts` construit le sien, mais avec `channel: "social-feed"` (qui n'autorise que `static`/`video`) et `requestedFormat: "static"` sur l'élément, puis `propose` → choisir la première option → `produce`. Le decor porte `capabilities["embed-s3"].settings` = `{ endpoint: "http://127.0.0.1:9000", region: "us-east-1", bucket: "splash-embeds", publicBaseUrl: "http://127.0.0.1:9000/splash-embeds" }` (les mêmes valeurs que `lib/loop/deliver.test.ts:284`).

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/loop/delivery-genre-e2e.test.ts` (sans la variable) → le test est **skippé** : c'est le comportement attendu hors preuve.
Puis, MinIO démarré et le bucket `splash-embeds` créé en lecture publique :
Run: `SPLASH_S3_E2E=1 SPLASH_S3_ACCESS_KEY_ID=minioadmin SPLASH_S3_SECRET_ACCESS_KEY=minioadmin bun test lib/loop/delivery-genre-e2e.test.ts`
Expected: le test tourne réellement. S'il échoue, c'est un défaut à corriger, pas une raison de le skipper.

- [ ] **Step 3: Write minimal implementation**

Aucune implémentation neuve n'est attendue : les tâches 1-8 doivent suffire. Si la preuve échoue, le défaut est réel — le corriger dans le module fautif (et non dans le test), puis relancer.

- [ ] **Step 4: Run test to verify it passes**

Run: la commande complète ci-dessus.
Expected: PASS. **Consigner dans le message de commit la sortie observée** (statut HTTP, content-type, taille) — une preuve live non consignée est une intention.

- [ ] **Step 5: Commit**

```bash
git add lib/loop/delivery-genre-e2e.test.ts
git commit -m "test(loop): opt-in live proof that a produced PNG is served as an image"
```

---

### Task 10: Fermer la documentation et le gate

**Files:**
- Modify: `lib/delivery/adapters/cloudflare-pages.ts:488-498` (le commentaire KNOWN GAP)
- Modify: `docs/splash/CHANGELOG.md`
- Modify: `CLAUDE.md` (§ État courant — une entrée de session)
- Modify: `docs/splash/proposal-brain-followups.md` (le résidu Cloudflare, s'il y est nommé)

**Interfaces:**
- Consumes: tout ce qui précède
- Produces: rien de code

- [ ] **Step 1: Réécrire le KNOWN GAP**

Le commentaire décrit un trou qui n'existe plus sous cette forme. Le remplacer par :

```ts
    // Pages only auto-resolves "index.html" at a deployment's bare alias root, so this adapter
    // serves the embed genre only — declared as `serves: ["interactive", "scrolly"]` below, and
    // enforced by lib/loop/deliver.ts BEFORE any staging or deploy. A non-HTML artifact can no
    // longer reach this line, which is why the URL returned here does not need to address a
    // staged filename. If Pages ever has to serve assets, that is an addressing slice of its
    // own (`${url}/${stagedName}` or a `_redirects` rule) — see the genre-routing spec §7.
```

- [ ] **Step 2: Journal**

Ajouter au `docs/splash/CHANGELOG.md` une entrée datée qui dit, en une dizaine de lignes : ce qui a changé (l'hébergement devient une propriété du format), le fait mesuré qui l'a motivé (le README tendait un iframe pour un PNG ; Cloudflare découvrait le problème après un déploiement réel), et la preuve (le test de la Task 9 avec sa sortie observée). Mettre à jour la section « État courant » de `CLAUDE.md` de la même manière — une entrée de session, pas une réécriture.

- [ ] **Step 3: Le gate**

Run: `bun run check`
Expected: tous les checks verts (~20). Si un check échoue deux fois de suite, STOP et reporter l'erreur exacte — ne pas s'acharner.

- [ ] **Step 4: Vérifier au rendu, pas au grep**

Ouvrir l'archive produite par la Task 7 pour un `static` réel (celle générée par la preuve de la Task 9 ou une exécution manuelle du publisher) et LIRE le `README.md` et l'`ALT.txt` — c'est-à-dire faire ce qu'un journaliste ferait. La leçon gravée du projet est que le rendu peut contredire le test.

- [ ] **Step 5: Commit**

```bash
git add lib/delivery/adapters/cloudflare-pages.ts docs/splash/CHANGELOG.md CLAUDE.md docs/splash/proposal-brain-followups.md
git commit -m "docs: record the genre routing and retire the Cloudflare non-HTML gap"
```

---

## Couverture du spec

| Section du spec | Tâche |
|---|---|
| §3.1 la table du genre | 1 |
| §3.2 `Publisher.serves` | 2 |
| §3.3 le routeur | 3 |
| §3.4 `requestDelivery` | 8 |
| §3.5 la légalité dure dans `deliver()` | 4 |
| §3.6 le snippet typé par format | 5 |
| §3.7 le package du genre `file` | 7 |
| §3.8 snippet optionnel | 6 |
| §4 les refus avant I/O | 4 (serves), 8 (destination inconnue), 3 (jamais de liste vide) |
| §5 ce qui ne bouge pas | 5 (iframe doré), 7 (archive embed dorée) |
| §6 tests 1-9 | 1, 3, 4, 5, 6, 7, 8 |
| §6 preuve live 10 | 9 |
| §7 hors scope (gap Cloudflare retiré) | 10 |
