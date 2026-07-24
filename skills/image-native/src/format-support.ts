// image-native ships "scrolly" ONLY in v1 (2026-07-16 decision — narrower than the spec's
// static+video+scrolly grid). The refusal a journalist sees lives HERE, once, because two
// callers need the same words: the engine's own CLI (scripts/produce.mjs, which refuses a
// non-scrolly format itself) and the manifest, which hands it to the verb contract's
// pre-dispatch format gate so the contract refuses in the engine's voice instead of a
// generic one.
export const IMAGE_NATIVE_V1_FORMAT_MESSAGE =
  'image-native builds "scrolly" only in v1 — static/video are follow-ups';
