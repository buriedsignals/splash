// twin/scripts/design-base/resolve-families.mjs
//
// MOVED TO `shared/`, RE-EXPORTED HERE. The design base's readers used to live only in this
// directory, which an installed Splash root does not receive — so a producer following the skills
// could be told to take a beat through a filed direction and have nothing to take it through. The
// canonical is now `shared/design-base/resolve-families.mjs`, which ships with the root; this file keeps the
// path the tree's forty beats and their tests already import.

export * from "#shared/design-base/resolve-families.mjs";
