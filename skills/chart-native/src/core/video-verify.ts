// Pure pixel math for the video snap guard (scripts/snap-video.mjs) — canonical
// implementation moved to lib/core/video-verify.ts (shared with map-native, same
// producer discipline, mirror-pattern like snap-a11y/snap-proof). Re-exported here
// so existing local imports (scripts/snap-video.mjs, tests/video-verify.test.ts,
// tests/snap-video.test.ts) keep working unchanged.
export * from "../../../../lib/core/video-verify";
