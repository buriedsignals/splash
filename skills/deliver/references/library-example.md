# Library and compatibility example

The example below documents the pure offer/materialisation API used by tests and older textual
flows. In a managed installation, keep the offer and human gate, then send the confirmed structured
request through Engine for any key-bearing form; never populate `env` from a checkout `.env`.

```js
import { offerForms, materialise, exportDirFor } from "./scripts/deliver.mjs";

// Read these from the current production plan. OUTPUT-REVIEW.json and its passing QA run must
// match them and the exact current renders/ digest: Gate 3 closes before Gate 4 opens.
const planVersion = 3;
const findingIds = ["finding-rainfall-change"];
const identity = {
  storiesRoot: "stories",
  storyId: "water-wars",
  outputId: "1-rainfall",
};
const forms = offerForms({
  ...identity,
  medium: "chart",
  format: "web",
  planVersion,
  findingIds,
});
// present `forms` (id, label, gives, available, reason) to the journalist here, and wait for an
// available choice. "embed" remains visible with available:false and setup guidance until Engine
// reports that the Cloudflare account and broker-backed token are ready.

const written = await materialise({
  ...identity,
  form: chosenId, // must be one of forms[*].id
  format: "web", // the same format offerForms was called with
  planVersion,
  findingIds,
  handover: {
    language: "en",
    placement: "After the paragraph that introduces the rainfall trend",
    alt: "Annual rainfall falls across the four measured winters",
    credit: "Source: newsroom rainfall analysis",
    caveat: "Four winters are a short comparison window",
  },
});
const exportDir = exportDirFor(identity); // informational; materialise derives this itself
// `written` names exactly what left the beat directory — nothing more. For "embed" this includes
// `EMBED_URL.txt`, `EMBED_CODE.html`, `DEPLOYMENT.json`, and `HANDOVER.md`; for
// "cms-insertion" it is `CMS-INSERTION.md` plus the hand-over.
```
