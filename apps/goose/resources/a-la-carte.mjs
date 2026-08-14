const FACET_ORDER = [
  "medium",
  "format",
  "treatmentFamily",
  "interaction",
  "delivery",
];

const FACET_LABELS = Object.freeze({
  medium: "Medium",
  format: "Publication format",
  treatmentFamily: "Treatment family",
  interaction: "Interaction",
  delivery: "Delivery",
});

const VALUE_LABELS = Object.freeze({
  chart: "Chart",
  map: "Map",
  image: "Photograph",
  static: "Static image",
  web: "Interactive web",
  video: "Video",
  scrolly: "Scroll-driven story",
  none: "No interaction",
  explore: "Reader exploration",
  motion: "Motion",
  scroll: "Scroll",
  "owned-file": "The file itself",
  "cms-insertion": "CMS insertion",
  "source-bundle": "Runnable source",
  embed: "Hosted embed",
});

const GROUP_LABELS = Object.freeze({
  medium: "Visual medium",
  format: "Publication format",
  size: "Export size",
  treatment: "Visual treatment",
  producer: "Production method",
});

const GATE_LABELS = Object.freeze({
  G2a: "Choose the visual medium",
  G2b: "Choose the publication format",
  G2c: "Choose the export size",
  "G2-treatment": "Choose the visual treatment",
  "G2-producer": "Choose how to produce it",
});

const GRAPHICAL_GATES = new Set(Object.keys(GATE_LABELS));

function values(choice, facet) {
  switch (facet) {
    case "medium":
      return choice.kind === "medium"
        ? [choice.value]
        : choice.family
          ? [choice.family]
          : [];
    case "format":
      return choice.kind === "format" ? [choice.value] : [];
    case "treatmentFamily":
      return choice.kind === "treatment" && choice.family
        ? [choice.family]
        : [];
    case "interaction":
      return choice.interaction?.kind ? [choice.interaction.kind] : [];
    case "delivery":
      return Array.isArray(choice.deliveryForms) ? choice.deliveryForms : [];
    default:
      return [];
  }
}

function labelFor(value, choice) {
  if (choice?.value === value && typeof choice.label === "string") {
    return choice.label;
  }
  return VALUE_LABELS[value] ?? String(value).replaceAll("-", " ");
}

function facetRows(choices) {
  return FACET_ORDER.flatMap((id) => {
    const byValue = new Map();
    for (const choice of choices) {
      for (const value of values(choice, id)) {
        if (!byValue.has(value)) byValue.set(value, labelFor(value, choice));
      }
    }
    if (byValue.size < 2) return [];
    return [
      {
        id,
        label: FACET_LABELS[id],
        options: [...byValue].map(([value, label]) => ({ value, label })),
      },
    ];
  });
}

function matchesFilters(choice, filters) {
  return Object.entries(filters).every(
    ([facet, selected]) =>
      !selected || values(choice, facet).includes(selected),
  );
}

function activeFilterLabels(facets, filters) {
  return facets.flatMap((facet) => {
    const selected = filters[facet.id];
    if (!selected) return [];
    const value = facet.options.find((row) => row.value === selected);
    return [`${facet.label}: ${value?.label ?? selected}`];
  });
}

export function expectedSelectionRevisions(model) {
  return {
    storyRevision: model?.revisions?.story,
    catalogRevision: model?.revisions?.catalogue,
    capabilityGeneration: model?.revisions?.capabilities,
  };
}

export function buildAlaCarteView(
  model,
  { filters = {}, showUnavailable = false, selectedOptionId = null } = {},
) {
  const choices = Array.isArray(model?.choices) ? model.choices : [];
  const facets = facetRows(choices);
  const normalizedFilters = Object.fromEntries(
    facets.flatMap((facet) =>
      facet.options.some((row) => row.value === filters[facet.id])
        ? [[facet.id, filters[facet.id]]]
        : [],
    ),
  );
  const matching = choices.filter((choice) =>
    matchesFilters(choice, normalizedFilters),
  );
  const visible = showUnavailable
    ? matching
    : matching.filter((choice) => choice.enabled);
  const selected = visible.find(
    (choice) => choice.id === selectedOptionId && choice.enabled,
  );
  const repairAction =
    visible.length === 0 && matching.length > 0
      ? (matching.find(
          (choice) =>
            !choice.enabled && choice.repairAction === "open-readiness",
        )?.repairAction ?? null)
      : null;
  const kind = choices[0]?.kind ?? "choice";
  return {
    gateLabel: GATE_LABELS[model?.gate?.id] ?? "Current storyboard decision",
    facets,
    filters: normalizedFilters,
    activeFilterLabels: activeFilterLabels(facets, normalizedFilters),
    showUnavailable,
    groups: visible.length
      ? [
          {
            id: kind,
            label: GROUP_LABELS[kind] ?? "Options",
            choices: visible,
          },
        ]
      : [],
    resultCount: visible.length,
    selected: selected ?? null,
    repairAction,
  };
}

export function upstreamSelectionSummary(model) {
  const slot = model?.slot;
  if (!slot) return [];
  return [
    ["Slot", slot.id],
    ["Proves", slot.proves],
    ["Medium", VALUE_LABELS[slot.medium] ?? slot.medium],
    ["Publication format", VALUE_LABELS[slot.format] ?? slot.format],
    ["Size", slot.size],
    ["Treatment", slot.chosen],
    ["Producer", slot.producer],
  ].flatMap(([label, value]) =>
    value === undefined || value === null || value === ""
      ? []
      : [{ label, value: String(value) }],
  );
}

function appendText(documentRef, parent, name, text, className = "") {
  const node = documentRef.createElement(name);
  if (className) node.className = className;
  node.textContent = text;
  parent.append(node);
  return node;
}

function implicationLines(choice) {
  const lines = [];
  for (const evidence of choice.advice?.matchedEvidence ?? []) {
    lines.push(`Why here: ${evidence.fact} (${evidence.source}).`);
  }
  for (const tradeoff of choice.advice?.tradeoffs ?? []) {
    lines.push(`Trade-off: ${tradeoff}`);
  }
  if (choice.advice?.unresolvedRequirements?.length) {
    lines.push(
      `Needs editorial checking: ${choice.advice.unresolvedRequirements
        .map((id) => id.replaceAll("-", " "))
        .join(", ")}.`,
    );
  }
  if (choice.dataShape?.summary) lines.push(choice.dataShape.summary);
  if (choice.interaction?.promise) lines.push(choice.interaction.promise);
  if (Array.isArray(choice.deliveryOptions) && choice.deliveryOptions.length) {
    lines.push(
      `Delivery: ${choice.deliveryOptions
        .map((row) => `${row.label}${row.enabled ? "" : " (setup needed)"}`)
        .join(", ")}.`,
    );
  } else if (
    Array.isArray(choice.deliveryForms) &&
    choice.deliveryForms.length
  ) {
    lines.push(
      `Delivery: ${choice.deliveryForms
        .map((id) => VALUE_LABELS[id] ?? id.replaceAll("-", " "))
        .join(", ")}.`,
    );
  }
  for (const capability of choice.optionalCapabilities ?? []) {
    lines.push(
      capability.enabled
        ? `Optional capability ready: ${capability.label}.`
        : `Optional capability: ${capability.label} — ${capability.reason}`,
    );
  }
  const runtime = [
    ...(choice.runtimePrerequisites ?? []),
    ...(choice.browserPrerequisites ?? []),
  ].map((id) =>
    id === "engine-managed-chromium"
      ? "managed browser"
      : id === "production-dependencies"
        ? "installed capability pack"
        : id === "bun"
          ? "Splash runtime"
          : id.replaceAll("-", " "),
  );
  if (runtime.length)
    lines.push(`Runtime: ${[...new Set(runtime)].join(", ")}.`);
  return lines;
}

function repairableImplications(choice) {
  return [
    ...(choice.optionalCapabilities ?? []),
    ...(choice.deliveryOptions ?? []),
  ].filter((row) => !row.enabled && row.repairAction === "open-readiness");
}

export function createAlaCarteChooser({
  documentRef,
  root,
  announce = () => {},
  onConfirm,
  onConfigure,
  onReopenFormat,
  onReopenTreatment,
} = {}) {
  if (!documentRef || !root || typeof onConfirm !== "function") {
    throw new Error(
      "the à-la-carte chooser requires a document, root, and confirmation handler",
    );
  }
  let model = null;
  let filters = {};
  let showUnavailable = false;
  let selectedOptionId = null;
  let gateKey = "";
  let busy = false;

  function render(nextModel = model) {
    model = nextModel;
    root.replaceChildren();
    if (!model?.gate) {
      appendText(
        documentRef,
        root,
        "p",
        model?.phase === "production" ||
          model?.phase === "delivery" ||
          model?.phase === "done"
          ? "Storyboard choices are complete for this story."
          : "No graphical choice is available at the current story phase.",
        "empty",
      );
      return;
    }
    if (!GRAPHICAL_GATES.has(model.gate.id)) {
      appendText(
        documentRef,
        root,
        "p",
        "The next storyboard decision continues in the conversation. Return here when a visual-choice gate is active.",
        "empty",
      );
      return;
    }
    const nextGateKey = `${model.story?.storyId ?? ""}:${model.gate.id}:${model.gate.awaiting ?? ""}`;
    if (gateKey && nextGateKey !== gateKey) {
      filters = {};
      showUnavailable = false;
      selectedOptionId = null;
    }
    gateKey = nextGateKey;
    const view = buildAlaCarteView(model, {
      filters,
      showUnavailable,
      selectedOptionId,
    });
    filters = view.filters;
    if (!view.selected) selectedOptionId = null;

    const summary = documentRef.createElement("section");
    summary.className = "choice-summary";
    appendText(documentRef, summary, "h4", view.gateLabel);
    const upstream = upstreamSelectionSummary(model);
    if (upstream.length) {
      const list = documentRef.createElement("dl");
      for (const row of upstream) {
        appendText(documentRef, list, "dt", row.label);
        appendText(documentRef, list, "dd", row.value);
      }
      summary.append(list);
    }
    const rewind = documentRef.createElement("div");
    rewind.className = "actions compact";
    if (model.slot?.format && model.gate.id !== "G2b" && onReopenFormat) {
      const button = documentRef.createElement("button");
      button.type = "button";
      button.textContent =
        "Change publication format — clears size and treatment";
      button.disabled = busy;
      button.addEventListener("click", async () => {
        if (busy) return;
        busy = true;
        announce("Reopening the publication-format decision…");
        try {
          const next = await onReopenFormat(expectedSelectionRevisions(model));
          busy = false;
          render(next);
          announce("Publication format reopened. Confirm the new format next.");
        } catch (error) {
          announce(
            error?.message ?? "The publication format could not be reopened.",
            true,
          );
        } finally {
          busy = false;
        }
      });
      rewind.append(button);
    }
    if (
      model.slot?.chosen &&
      model.gate.id === "G2-producer" &&
      onReopenTreatment
    ) {
      const button = documentRef.createElement("button");
      button.type = "button";
      button.textContent = "Change visual treatment — clears producer";
      button.disabled = busy;
      button.addEventListener("click", async () => {
        if (busy) return;
        busy = true;
        announce("Reopening the treatment decision…");
        try {
          const next = await onReopenTreatment(
            expectedSelectionRevisions(model),
          );
          busy = false;
          render(next);
          announce("Treatment reopened. Confirm the new treatment next.");
        } catch (error) {
          announce(
            error?.message ?? "The treatment could not be reopened.",
            true,
          );
        } finally {
          busy = false;
        }
      });
      rewind.append(button);
    }
    if (rewind.childNodes.length) summary.append(rewind);
    root.append(summary);

    if (view.facets.length) {
      const controls = documentRef.createElement("section");
      controls.className = "choice-filters";
      controls.setAttribute("aria-label", "Filter visual options");
      for (const facet of view.facets) {
        const label = documentRef.createElement("label");
        appendText(documentRef, label, "span", facet.label);
        const select = documentRef.createElement("select");
        select.dataset.facet = facet.id;
        const any = documentRef.createElement("option");
        any.value = "";
        any.textContent = `All ${facet.label.toLowerCase()}`;
        select.append(any);
        for (const row of facet.options) {
          const option = documentRef.createElement("option");
          option.value = row.value;
          option.textContent = row.label;
          option.selected = filters[facet.id] === row.value;
          select.append(option);
        }
        select.addEventListener("change", () => {
          filters = { ...filters, [facet.id]: select.value };
          selectedOptionId = null;
          render();
        });
        label.append(select);
        controls.append(label);
      }
      root.append(controls);
    }

    const unavailableLabel = documentRef.createElement("label");
    unavailableLabel.className = "check-control";
    const unavailable = documentRef.createElement("input");
    unavailable.type = "checkbox";
    unavailable.checked = showUnavailable;
    unavailable.addEventListener("change", () => {
      showUnavailable = unavailable.checked;
      selectedOptionId = null;
      render();
    });
    unavailableLabel.append(unavailable);
    appendText(documentRef, unavailableLabel, "span", "Show unavailable");
    root.append(unavailableLabel);

    const count = appendText(
      documentRef,
      root,
      "p",
      `${view.resultCount} option${view.resultCount === 1 ? "" : "s"}`,
      "quiet",
    );
    count.setAttribute("role", "status");
    count.setAttribute("aria-live", "polite");

    if (!view.groups.length) {
      const empty = documentRef.createElement("section");
      empty.className = "empty card";
      appendText(
        documentRef,
        empty,
        "p",
        view.activeFilterLabels.length
          ? `No options match ${view.activeFilterLabels.join("; ")}.`
          : "No reachable options are currently available.",
      );
      if (view.activeFilterLabels.length) {
        const clear = documentRef.createElement("button");
        clear.type = "button";
        clear.textContent = "Clear filters";
        clear.addEventListener("click", () => {
          filters = {};
          selectedOptionId = null;
          render();
        });
        empty.append(clear);
      }
      if (view.repairAction === "open-readiness" && onConfigure) {
        const configure = documentRef.createElement("button");
        configure.type = "button";
        configure.textContent = "Configure this capability";
        configure.addEventListener("click", () => onConfigure());
        empty.append(configure);
      }
      root.append(empty);
      return;
    }

    for (const group of view.groups) {
      const fieldset = documentRef.createElement("fieldset");
      fieldset.className = "choice-group";
      appendText(documentRef, fieldset, "legend", group.label);
      for (const choice of group.choices) {
        const card = documentRef.createElement("label");
        card.className = "choice-card";
        card.dataset.state = choice.enabled ? "available" : "unavailable";
        const input = documentRef.createElement("input");
        input.type = "radio";
        input.name = "splash-current-choice";
        input.value = choice.id;
        input.disabled = !choice.enabled || busy;
        input.checked = selectedOptionId === choice.id;
        const detailId = `choice-${choice.id.replaceAll(/[^a-zA-Z0-9_-]/g, "-")}-detail`;
        input.setAttribute("aria-describedby", detailId);
        input.addEventListener("change", () => {
          selectedOptionId = choice.id;
          render();
        });
        card.append(input);
        const body = documentRef.createElement("span");
        body.className = "choice-body";
        appendText(documentRef, body, "strong", choice.label);
        if (choice.advice) {
          appendText(
            documentRef,
            body,
            "span",
            choice.advice.recommended
              ? choice.advice.tied
                ? "Recommended — tied score, stable order used"
                : "Recommended"
              : `Alternative ${choice.advice.rank}`,
            choice.advice.recommended
              ? "recommendation-badge"
              : "alternative-badge",
          );
        }
        const details = documentRef.createElement("span");
        details.id = detailId;
        details.className = "choice-details";
        appendText(documentRef, details, "span", choice.description ?? "");
        for (const line of implicationLines(choice)) {
          appendText(documentRef, details, "small", line);
        }
        if (!choice.enabled) {
          appendText(
            documentRef,
            details,
            "strong",
            choice.reason ?? "This option is unavailable.",
            "disabled-reason",
          );
        }
        body.append(details);
        card.append(body);
        fieldset.append(card);
        if (
          !choice.enabled &&
          choice.repairAction === "open-readiness" &&
          onConfigure
        ) {
          const configure = documentRef.createElement("button");
          configure.type = "button";
          configure.className = "configure-choice";
          configure.textContent = `Configure ${choice.label}`;
          configure.addEventListener("click", () => onConfigure());
          fieldset.append(configure);
        }
        if (choice.enabled && onConfigure) {
          for (const implication of repairableImplications(choice)) {
            const configure = documentRef.createElement("button");
            configure.type = "button";
            configure.className = "configure-choice";
            configure.textContent = `Configure optional ${implication.label}`;
            configure.addEventListener("click", () => onConfigure());
            fieldset.append(configure);
          }
        }
      }
      root.append(fieldset);
    }

    if (view.selected) {
      const review = documentRef.createElement("section");
      review.className = "choice-review card";
      appendText(documentRef, review, "h4", "Confirm this decision");
      appendText(documentRef, review, "p", view.selected.label);
      appendText(
        documentRef,
        review,
        "p",
        "Only this current storyboard decision will be written. Later decisions remain separate.",
        "quiet",
      );
      const actions = documentRef.createElement("div");
      actions.className = "actions";
      const cancel = documentRef.createElement("button");
      cancel.type = "button";
      cancel.textContent = "Cancel";
      cancel.addEventListener("click", () => {
        selectedOptionId = null;
        render();
        announce("Selection cancelled. Nothing was changed.");
      });
      const confirm = documentRef.createElement("button");
      confirm.type = "button";
      confirm.className = "primary";
      confirm.textContent = `Confirm ${view.selected.label}`;
      confirm.disabled = busy;
      confirm.addEventListener("click", async () => {
        if (busy) return;
        busy = true;
        confirm.disabled = true;
        announce(`Confirming ${view.selected.label}…`);
        try {
          const next = await onConfirm({
            optionId: view.selected.id,
            expected: expectedSelectionRevisions(model),
          });
          busy = false;
          render(next);
          announce("Storyboard decision confirmed.");
        } catch (error) {
          announce(
            error?.message ?? "The storyboard decision was not changed.",
            true,
          );
        } finally {
          busy = false;
        }
      });
      actions.append(cancel, confirm);
      review.append(actions);
      root.append(review);
    }
  }

  return Object.freeze({
    render,
    clear() {
      model = null;
      filters = {};
      showUnavailable = false;
      selectedOptionId = null;
      gateKey = "";
      root.replaceChildren();
    },
  });
}
