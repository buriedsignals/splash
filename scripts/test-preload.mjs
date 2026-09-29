// Preloaded into every `bun test` process by bunfig.toml. It exports the pinned Chrome as
// `CHROME_PATH` for the resolvers that run in the test's own process, and prints one warning per run
// when the pin is missing or shadowed. Scripts a test SPAWNS do not see this export (Bun passes a
// child the environment it started with); they find the pinned build in the puppeteer cache instead.
// An explicit `CHROME_PATH` is left alone. See scripts/chrome-for-testing.mjs.
import { testChrome } from "./chrome-for-testing.mjs";

if (!process.env.CHROME_PATH) {
  const chrome = testChrome();
  if (chrome) process.env.CHROME_PATH = chrome;
}
