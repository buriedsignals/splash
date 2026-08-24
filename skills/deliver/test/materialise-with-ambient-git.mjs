import { materialise } from "../scripts/deliver.mjs";
import {
  TEST_FINDING_IDS,
  TEST_PLAN_VERSION,
} from "./output-review-fixture.ts";

const handover = {
  language: "en",
  placement: "after the paragraph on reported deaths, article web, full width",
  alt: "A world map of what each country reported",
  credit: "Source: World Health Organization, as of 2026-08-23",
  caveat: "reported, not measured",
};

const storiesRoot = process.env.SPLASH_TEST_STORIES_ROOT;
if (!storiesRoot) throw new Error("SPLASH_TEST_STORIES_ROOT is required");

await materialise({
  form: "owned-file",
  format: "web",
  storiesRoot,
  storyId: "story",
  outputId: "1-map",
  env: { MAPTILER_DELIVERY_KEY: process.env.SPLASH_TEST_MAP_KEY ?? "" },
  handover,
  planVersion: TEST_PLAN_VERSION,
  findingIds: TEST_FINDING_IDS,
});
