import { createAlaCarteChooser } from "./a-la-carte.mjs";

function sameSelectionRevisions(selection, recommendation) {
  return (
    selection?.revisions?.story ===
      recommendation?.selectionRevisions?.storyRevision &&
    selection?.revisions?.catalogue ===
      recommendation?.selectionRevisions?.catalogRevision &&
    selection?.revisions?.capabilities ===
      recommendation?.selectionRevisions?.capabilityGeneration
  );
}

export function decorateStoryboardSelection(selection, recommendation) {
  if (
    selection?.schemaVersion !== "splash-selection/v1" ||
    recommendation?.schemaVersion !== "splash-recommendation/v1" ||
    typeof recommendation.revision !== "string" ||
    !recommendation.revision ||
    !sameSelectionRevisions(selection, recommendation)
  ) {
    throw new Error(
      "the Storyboard recommendation does not match the current selection",
    );
  }
  const enabled = new Map(
    (selection.choices ?? [])
      .filter((choice) => choice.enabled)
      .map((choice) => [choice.id, choice]),
  );
  const ranked = Array.isArray(recommendation.ranking)
    ? recommendation.ranking
    : [];
  const rankedIds = ranked.map((row) => row?.optionId);
  if (
    new Set(rankedIds).size !== rankedIds.length ||
    rankedIds.some((id) => !enabled.has(id)) ||
    (recommendation.recommendedOptionId !== null &&
      rankedIds[0] !== recommendation.recommendedOptionId)
  ) {
    throw new Error(
      "the Storyboard recommendation contains a stale or unreachable option",
    );
  }
  const rankById = new Map(ranked.map((row) => [row.optionId, row]));
  const canonicalIndex = new Map(
    (selection.choices ?? []).map((choice, index) => [choice.id, index]),
  );
  const choices = [...(selection.choices ?? [])]
    .sort((a, b) => {
      const aRank = rankById.get(a.id)?.rank ?? Number.MAX_SAFE_INTEGER;
      const bRank = rankById.get(b.id)?.rank ?? Number.MAX_SAFE_INTEGER;
      return (
        aRank - bRank || canonicalIndex.get(a.id) - canonicalIndex.get(b.id)
      );
    })
    .map((choice) => {
      const ranking = rankById.get(choice.id);
      if (!ranking) return choice;
      return {
        ...choice,
        advice: {
          recommended: choice.id === recommendation.recommendedOptionId,
          tied: recommendation.tied === true && ranking.rank <= 2,
          rank: ranking.rank,
          score: ranking.score,
          matchedEvidence: ranking.matchedEvidence ?? [],
          unresolvedRequirements: ranking.unresolvedRequirements ?? [],
          tradeoffs: ranking.tradeoffs ?? [],
        },
      };
    });
  return { ...selection, choices };
}

export function createStoryboardChoice({
  onConfirm,
  chooserFactory = createAlaCarteChooser,
  ...options
} = {}) {
  if (typeof onConfirm !== "function" || typeof chooserFactory !== "function") {
    throw new Error(
      "the Storyboard chooser requires confirmation and shared chooser handlers",
    );
  }
  let currentRecommendation = null;
  const chooser = chooserFactory({
    ...options,
    async onConfirm(payload) {
      if (!currentRecommendation) {
        throw new Error(
          "refresh the Storyboard recommendation before confirming",
        );
      }
      const next = await onConfirm({
        ...payload,
        recommendationRevision: currentRecommendation.revision,
      });
      if (next?.schemaVersion === "splash-storyboard-choice/v1") {
        currentRecommendation = next.recommendation;
        return decorateStoryboardSelection(next.selection, next.recommendation);
      }
      currentRecommendation = null;
      return next;
    },
  });
  return Object.freeze({
    render({ selection, recommendation } = {}) {
      const decorated = decorateStoryboardSelection(selection, recommendation);
      currentRecommendation = recommendation;
      chooser.render(decorated);
    },
    clear() {
      currentRecommendation = null;
      chooser.clear();
    },
  });
}
