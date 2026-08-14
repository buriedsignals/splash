import { recommendVisualChoice } from "../../skills/storyboard/scripts/propose.mjs";

export const STORYBOARD_CHOICE_SCHEMA_VERSION = "splash-storyboard-choice/v1";

function conflict(message) {
  const error = new Error(message);
  error.code = "RECOMMENDATION_CONFLICT";
  return error;
}

export function createRecommendationService({
  selection,
  profileProvider,
  recommend = recommendVisualChoice,
} = {}) {
  if (
    !selection ||
    typeof selection.read !== "function" ||
    typeof selection.confirm !== "function"
  ) {
    throw new Error("recommendation requires the shared selection service");
  }
  if (typeof profileProvider !== "function") {
    throw new Error("recommendation requires a frozen-profile provider");
  }

  async function read({ bindingContext } = {}) {
    const model = await selection.read({ bindingContext });
    const profile = await profileProvider(model.story);
    const recommendation = recommend({ model, profile });
    return {
      schemaVersion: STORYBOARD_CHOICE_SCHEMA_VERSION,
      selection: model,
      recommendation,
    };
  }

  return Object.freeze({
    read,

    async confirm({
      bindingContext,
      expected,
      recommendationRevision,
      optionId,
    } = {}) {
      if (
        typeof recommendationRevision !== "string" ||
        !recommendationRevision
      ) {
        throw new Error(
          "storyboard confirmation requires a recommendation revision",
        );
      }
      const current = await read({ bindingContext });
      if (current.recommendation.revision !== recommendationRevision) {
        throw conflict(
          "the recommendation evidence changed; refresh before confirming",
        );
      }
      if (
        !current.recommendation.ranking.some((row) => row.optionId === optionId)
      ) {
        throw new Error(
          "the selected alternative is not reachable in the current recommendation",
        );
      }
      await selection.confirm({ bindingContext, expected, optionId });
      return read({ bindingContext });
    },
  });
}
