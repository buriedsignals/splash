# Splash story workspace

## Canonical output locations

- `STORYBOARD.md` is the persisted editorial contract. Read it before changing an output.
- `beats/<outputId>/` is the editable source of truth. Custom outputs keep their component, data,
  brief, render script, and `renders/` here. Datawrapper outputs keep `spec.json`,
  `DATAWRAPPER.json`, and `renders/` here.
- `export/<outputId>/` is the latest delivered form. Never edit it to change a visual; delivery
  replaces it from the matching beat after review.
- A hosted output records `DEPLOYMENT.json`, `EMBED_URL.txt`, and `EMBED_CODE.html` under its
  export directory. `DEPLOYMENT.json.editableSource` points back to the beat.

## Editor-feedback revisions

1. Identify the output from `export/<outputId>/DEPLOYMENT.json` or its handover, then work only in
   the matching `beats/<outputId>/` directory.
2. Record the editor's request in `beats/<outputId>/FEEDBACK.md`, edit the canonical component or
   Datawrapper `spec.json`, and rerun that beat's existing renderer/producer. In Datawrapper mode,
   use the receipt-preserving CLI from the Splash root:
   `bun run skills/dw-beat/scripts/produce.mjs stories <slug> <outputId> <static|web> [size] --story-output`.
   It reuses `DATAWRAPPER.json.chartId`; direct edits made only in Datawrapper's web editor are
   not canonical and may be overwritten by the persisted spec.
   Creating or updating `FEEDBACK.md` is the revision trigger: `whereIs` reopens production
   until a valid `OUTPUT-REVIEW.json` binds both the current feedback digest and current render,
   then reopens delivery until its manifest binds that feedback, review, and render.
3. Inspect the new render and obtain a new bound `OUTPUT-REVIEW.json` approval. An approval for the
   previous render digest cannot authorize the revision.
4. Materialise the same delivery form again. The previous export stays intact until replacement is
   complete. Hosted custom outputs redeploy to the same per-output Cloudflare project and keep the
   same public embed URL. Before promising URL continuity, inspect the existing
   `DEPLOYMENT.json`: a legacy receipt with `stableAcrossRevisions: false` must be migrated by the
   next approved deployment, and its CMS iframe must be replaced once with the new stable URL.
   Cloudflare completion and local export replacement are two phases: if local publication fails
   after the remote update, rerun delivery so its hosted-operation receipt reconciles the deployment
   and writes the matching local handover.

Never modify frozen material under `source/` to satisfy visual feedback, and never treat a file in
`export/` as production source.
