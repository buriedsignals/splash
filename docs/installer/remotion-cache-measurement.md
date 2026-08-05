# Where Remotion actually caches the browser — measured 2026-08-05

Task 2 (`.superpowers/sdd/2026-08-05-setup-page-truth/task-2-brief.md`) asked to measure where
Remotion's `chrome-headless-shell` lands on a delivered tree before touching
`remotionExecutablePath`, because the brief's two anticipated outcomes (hoisted to
`.dist/node_modules/.remotion`, or a global cache directory) decide the fix. **A third outcome
happened, and it means the code the brief specifies for Step 4 must NOT be applied** — see
Conclusion.

Run from a dedicated worktree (`task/remotion-cache-probe`, forked from `feat/setup-page-truth` at
`c90097ed`), because the harness placed this agent in an unrelated worktree with none of this
repo's files — not `../splash-setup`, whose tree this measurement is otherwise identical to.

## Commands and verbatim output

```
$ cd /Users/rmdms/Sites/Professional/splash-remotion-probe
$ bun install
bun install v1.3.5 (1e86cebd)

+ @types/geojson@7946.0.16
+ @types/node@26.1.1
+ bun-types@1.3.14
+ playwright@1.61.1
+ @noble/hashes@2.2.0
+ fflate@0.8.3
+ zod@4.4.3

10 packages installed [35.00ms]

$ bun run pack-skills
$ bun scripts/pack-skills.mjs . .dist
note: @types/node pinned twice (26.1.0 vs 26.1.1); keeping 26.1.0
note: @types/node pinned twice (26.1.0 vs 26.1.1); keeping 26.1.0
packed 17 skills into .dist

$ cd .dist && bun install
[0.01ms] ".env"
bun install v1.3.5 (1e86cebd)
Resolving dependencies
Resolved, downloaded and extracted [137]
Saved lockfile

+ @maplibre/maplibre-gl-style-spec@23.3.0 (v26.2.1 available)
+ @maptiler/sdk@3.6.0
+ @remotion/bundler@4.0.482
+ @remotion/cli@4.0.482
+ @remotion/google-fonts@4.0.482
+ @remotion/renderer@4.0.482
+ remotion@4.0.482
... (419 packages installed total)

$ cd skills/chart-native && bunx remotion browser ensure
Downloading Chrome Headless Shell https://www.remotion.dev/chrome-headless-shell
Downloading from: https://storage.googleapis.com/chrome-for-testing-public/149.0.7790.0/mac-arm64/chrome-headless-shell-mac-arm64.zip
Getting Headless Shell - 9.5 Mb/93.5 Mb
...
Got Headless Shell
Has browser at /Users/rmdms/Sites/Professional/splash-remotion-probe/.dist/skills/chart-native/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell

$ cd ../../.. && find .dist -name 'chrome-headless-shell*' -maxdepth 8
.dist/skills/chart-native/node_modules/.remotion/chrome-headless-shell
.dist/skills/chart-native/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64
.dist/skills/chart-native/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell
```

**Result: the cache landed at `.dist/skills/chart-native/node_modules/.remotion/…` — inside the
skill directory itself, the SAME place the current, unmodified `remotionExecutablePath(fromDir)`
already composes.** Neither of the two outcomes the brief named (hoisted with the deps to
`.dist/node_modules/.remotion`, or a global directory) is what happened.

## Why: Remotion does not follow node_modules resolution for this cache

`node_modules/@remotion/renderer/dist/browser/get-download-destination.js` (the function every
browser-cache read/write in `@remotion/renderer` goes through — confirmed both `BrowserFetcher.js`
and `ensure-browser.js`, i.e. both the CLI's `remotion browser ensure` and the `ensureBrowser()`
called internally before every render, resolve through it):

```js
const getDownloadsCacheDir = () => {
  const cwd = process.cwd();
  let dir = cwd;
  for (;;) {
    try {
      if (fs.statSync(path.join(dir, 'package.json')).isFile()) break;
    } catch (e) {}
    const parent = path.dirname(dir);
    if (dir === parent) { dir = undefined; break; }
    dir = parent;
  }
  if (!dir) return path.resolve(cwd, '.remotion');
  ...
  return path.resolve(dir, 'node_modules/.remotion');
};
```

It walks UP from `process.cwd()` to the **nearest ancestor directory that has its own
`package.json`** — it never asks where the `remotion` npm package itself resolves from. `bunx
remotion browser ensure` was run with cwd = `.dist/skills/chart-native`, and that directory HAS
its own `package.json` (verified: `pack-skills.mjs` copies each skill's directory tree verbatim,
package.json included — the ONLY thing hoisted up to `.dist/node_modules` is the actual
dependency install, not the skill's own manifest file). The walk therefore stops immediately at
the skill directory, and the cache stays there — regardless of where `bun install` put the actual
`remotion` package.

This matches the real render invocation, not just the explicit CLI command: `render-video.mjs:37`
(`chart-native`) and `produce.mjs:259,469,472` (`map-native`) both spawn the `remotion`
CLI/subprocess with `cwd: <skill directory>` — the same directory `capabilityReadiness`
(`lib/newsroom/readiness.ts:104-107`) already composes as `fromDir` for these two capabilities.
So the cache the render pipeline actually creates, and the path the readiness probe already reads,
are the same directory in both the dev checkout and the delivered tree.

## Empirical confirmation against the CURRENT, unmodified code

```
$ cd /Users/rmdms/Sites/Professional/splash-remotion-probe
$ bun -e '
import { probeRemotionBrowser } from "./lib/newsroom/probe.ts";
const r = probeRemotionBrowser(".dist/skills/chart-native");
console.log(JSON.stringify(r, null, 2));
'
{
  "status": "ready",
  "executablePath": ".dist/skills/chart-native/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell"
}
```

The unmodified `probeRemotionBrowser`, called with the exact `fromDir` production code computes
for the delivered tree, already reports `"ready"` against the tree this measurement produced.

## Conclusion

The brief's premise — "on the delivered tree, `fromDir` has no `node_modules`, so the two
video-capable engines would read missing forever" — is true of the directory *before* Remotion
ever runs there, but not after: Remotion creates `<fromDir>/node_modules/.remotion` itself, on
first use, in exactly the directory `remotionExecutablePath` already composes. The reason the
brief expected the dependency-hoisting layout to matter is that `remotion` package **resolution**
(`Bun.resolveSync`/node_modules) does follow the hoist — but the browser **cache directory**
follows a completely different algorithm (nearest ancestor `package.json` from `process.cwd()`)
that the hoist does not affect, because each packed skill directory keeps its own `package.json`.

This is neither of the two outcomes the brief anticipated, and per the brief's own instruction
("if the measurement shows something neither branch anticipated, stop and report it rather than
inventing a rule"), **Step 4's proposed `remotionPackageRoot` (resolving via
`Bun.resolveSync("remotion", fromDir)`) is not applied.** Doing so would point the probe at
`.dist/node_modules/.remotion` — a location Remotion's own algorithm never writes to — turning a
probe that already reads correctly on a real install into one that reads "missing" forever
instead. `lib/newsroom/probe.ts` is unchanged by this task.

See the task report for what was still done independently of this finding (the ambient-state test
fix) and what needs a decision.
