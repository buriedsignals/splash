// The line GESTURE scrolly: the Time-series family's scrolly runner (./gesture-time-run-scrolly.mjs) drawing this
// type's variant. Guard order: applyStoryboard → REQUIRED → the readings → check() and the shared guards → the
// gesture core (validateTime, claim read from STORYBOARD.md) → the scrolly scheduler and every card's words → render,
// verify-scrolly, one screenshot per card. Copied into the beat by the harness with every file of craft/_shared/;
// never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { runTimeScrolly } from "./gesture-time-run-scrolly.mjs";

await runTimeScrolly(import.meta.dirname, "line");
