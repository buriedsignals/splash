// The bump-ranking-over-time GESTURE web page: the Time-series family's web runner (./gesture-time-run-web.mjs) drawing this type's
// variant. Guard order: applyStoryboard → REQUIRED → the readings → check() and the shared guards → the gesture core
// (validateTime, format "web", claim read from STORYBOARD.md) → the web scheduler and the generated interaction
// declaration → render, verify-web, look. Copied into the beat by the harness with every file of craft/_shared/;
// never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { runTimeWeb } from "./gesture-time-run-web.mjs";

await runTimeWeb(import.meta.dirname, "bump-ranking-over-time");
