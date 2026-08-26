import { createAlaCarteChooser } from "./a-la-carte.mjs";
import { createStoryboardChoice } from "./storyboard-choice.mjs";

function statusText(value) {
  return String(value ?? "").replaceAll("-", " ");
}

function routeName(hash) {
  return hash === "#choose" ? "choose" : "readiness";
}

function isCapabilityHash(hash) {
  const value = String(hash ?? "").replace(/^#/, "");
  return Boolean(value) && value !== "choose" && value !== "readiness";
}

export async function defaultApi(path, body = {}) {
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || "Request refused");
    error.body = payload;
    throw error;
  }
  return payload;
}

export async function startSplashApp({
  documentRef = document,
  windowRef = window,
  api = defaultApi,
  openUrl = (url) => windowRef.open(url, "_blank", "noopener,noreferrer"),
} = {}) {
  const announcement = documentRef.querySelector("#announcement");
  const refresh = documentRef.querySelector("#refresh");
  const setup = documentRef.querySelector("#setup");
  const nominateStory = documentRef.querySelector("#nominate-story");
  const storyPath = documentRef.querySelector("#story-path");
  const loadSelection = documentRef.querySelector("#load-selection");
  const choiceRoot = documentRef.querySelector("#choice-root");
  const modeAlaCarte = documentRef.querySelector("#mode-a-la-carte");
  const modeStoryboard = documentRef.querySelector("#mode-storyboard");
  if (
    !announcement ||
    !refresh ||
    !setup ||
    !nominateStory ||
    !storyPath ||
    !loadSelection ||
    !choiceRoot ||
    !modeAlaCarte ||
    !modeStoryboard
  )
    throw new Error("Splash app markup is incomplete");

  let connected = false;
  let status = null;
  let pendingChallenge = "";
  let choiceMode = "a-la-carte";

  function announce(message, error = false) {
    announcement.textContent = message;
    announcement.dataset.kind = error ? "error" : "status";
    announcement.focus();
  }

  function enableActions() {
    refresh.disabled = !connected;
    setup.disabled = !connected;
    nominateStory.disabled = !connected;
    storyPath.disabled = !connected;
    loadSelection.disabled = !connected || status?.story?.status !== "bound";
    modeAlaCarte.disabled = !connected || status?.story?.status !== "bound";
    modeStoryboard.disabled = !connected || status?.story?.status !== "bound";
  }

  function selectionError(error) {
    const state = error?.body?.status;
    if (state === "preflight-required") windowRef.location.hash = "readiness";
    const message =
      state === "selection-conflict" || state === "recommendation-conflict"
        ? "The story or available capabilities changed. Choices were refreshed; confirm again."
        : state === "preflight-required"
          ? "Complete Splash readiness before choosing a visual."
          : state === "story-unbound"
            ? "Confirm the exact story before choosing a visual."
            : error.message;
    throw new Error(message);
  }

  async function selectionTool(path, body) {
    try {
      const model = await api(path, body);
      if (model?.schemaVersion !== "splash-selection/v1") selectionError(new Error("The current storyboard decision could not be changed."));
      return model;
    } catch (error) {
      selectionError(error);
    }
  }

  async function recommendationTool(path, body) {
    try {
      const model = await api(path, body);
      if (model?.schemaVersion !== "splash-storyboard-choice/v1") {
        selectionError(new Error("The current Storyboard recommendation could not be read."));
      }
      return model;
    } catch (error) {
      selectionError(error);
    }
  }

  async function readSelection({ quiet = false } = {}) {
    if (status?.story?.status !== "bound") {
      alaCarteChooser.clear();
      storyboardChooser.clear();
      return null;
    }
    if (!quiet) announce("Reading the current storyboard decision…");
    try {
      let model;
      if (choiceMode === "storyboard") {
        const advised = await recommendationTool("/api/recommendation/read", {});
        storyboardChooser.render(advised);
        model = advised.selection;
      } else {
        model = await selectionTool("/api/selection/read", {});
        alaCarteChooser.render(model);
      }
      const detail = documentRef.querySelector("#choice-detail");
      detail.textContent =
        model.gate && model.choices?.length
          ? choiceMode === "storyboard"
            ? "Review the recommendation and reachable alternatives. Nothing is written until you confirm."
            : "Choose one option for the current decision. Nothing is written until you confirm."
          : model.gate
            ? "The next storyboard decision continues in the conversation."
            : "This story has no open graphical storyboard decision.";
      if (!quiet) announce("Current visual options loaded.");
      return model;
    } catch (error) {
      alaCarteChooser.clear();
      storyboardChooser.clear();
      documentRef.querySelector("#choice-detail").textContent = error.message;
      announce(error.message, true);
      return null;
    }
  }

  const sharedChooserOptions = {
    documentRef,
    root: choiceRoot,
    announce,
    onConfigure() {
      windowRef.location.hash = "readiness";
    },
    async onReopenFormat(expected) {
      try {
        return await selectionTool("/api/selection/reopen-format", { expected });
      } catch (error) {
        await readSelection({ quiet: true });
        throw error;
      }
    },
    async onReopenTreatment(expected) {
      try {
        return await selectionTool("/api/selection/reopen-treatment", { expected });
      } catch (error) {
        await readSelection({ quiet: true });
        throw error;
      }
    },
  };

  const alaCarteChooser = createAlaCarteChooser({
    ...sharedChooserOptions,
    async onConfirm({ optionId, expected }) {
      try {
        return await selectionTool("/api/selection/confirm", { optionId, expected });
      } catch (error) {
        await readSelection({ quiet: true });
        throw error;
      }
    },
  });

  const storyboardChooser = createStoryboardChoice({
    ...sharedChooserOptions,
    async onConfirm({ optionId, expected, recommendationRevision }) {
      try {
        return await recommendationTool("/api/recommendation/confirm", {
          optionId,
          expected,
          recommendationRevision,
        });
      } catch (error) {
        await readSelection({ quiet: true });
        throw error;
      }
    },
  });

  function setChoiceMode(next) {
    choiceMode = next === "storyboard" ? "storyboard" : "a-la-carte";
    modeAlaCarte.setAttribute("aria-pressed", choiceMode === "a-la-carte" ? "true" : "false");
    modeStoryboard.setAttribute("aria-pressed", choiceMode === "storyboard" ? "true" : "false");
    alaCarteChooser.clear();
    storyboardChooser.clear();
    if (status?.story?.status === "bound") void readSelection();
  }
  modeAlaCarte.addEventListener("click", () => setChoiceMode("a-la-carte"));
  modeStoryboard.addEventListener("click", () => setChoiceMode("storyboard"));

  function card(title, detail, state) {
    const node = documentRef.createElement("article");
    node.className = "card";
    node.dataset.state = state;
    const heading = documentRef.createElement("strong");
    heading.textContent = title;
    const copy = documentRef.createElement("p");
    copy.textContent = detail;
    node.append(heading, copy);
    return node;
  }

  function render(next) {
    if (!next || next.schemaVersion !== "splash-app/v2") return;
    status = next;
    const runtime = documentRef.querySelector("#runtime-state");
    runtime.textContent = statusText(next.runtime?.status);
    const blockers = documentRef.querySelector("#blockers");
    blockers.replaceChildren();
    if (next.readiness?.blockers?.length) {
      for (const blocker of next.readiness.blockers) {
        const item = documentRef.createElement("li");
        item.append(card(blocker.id, blocker.detail, blocker.status));
        blockers.append(item);
      }
    } else {
      const item = documentRef.createElement("li");
      item.textContent = "No hard pre-flight blockers.";
      blockers.append(item);
    }
    const newsroom = next.newsroom ?? {};
    const newsroomItem = documentRef.createElement("li");
    const newsroomLabel = {
      complete: "Newsroom profile complete",
      declined: "Newsroom declined a house profile",
      missing: "Newsroom identity not recorded yet",
      invalid: "Recorded newsroom profile is invalid",
      unknown: "Newsroom identity not read yet",
    }[newsroom.decision] ?? "Newsroom identity not read yet";
    const newsroomCopy = [
      newsroom.name,
      Array.isArray(newsroom.languages) && newsroom.languages.length
        ? newsroom.languages.join(", ")
        : "",
    ]
      .filter(Boolean)
      .join(" · ");
    newsroomItem.append(
      card(
        newsroomLabel,
        newsroomCopy || "Use setup to record it or record an explicit decline.",
        newsroom.decision === "complete" || newsroom.decision === "declined" ? "pass" : "missing",
      ),
    );
    blockers.append(newsroomItem);
    const credentials = documentRef.querySelector("#credentials");
    credentials.replaceChildren();
    for (const row of next.credentials ?? []) {
      const detail = [statusText(row.state), row.purpose].filter(Boolean).join(" — ");
      const node = card(row.name || row.id, detail, row.state);
      if (row.acquisitionUrl) {
        const link = documentRef.createElement("a");
        link.href = row.acquisitionUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Provider instructions";
        node.append(link);
      }
      const hint = documentRef.createElement("p");
      hint.className = "quiet";
      hint.textContent = "Save or replace this key in Indicator Labs.";
      node.append(hint);
      credentials.append(node);
    }
    const storyState = documentRef.querySelector("#story-state");
    const storyDetail = documentRef.querySelector("#story-detail");
    const choiceDetail = documentRef.querySelector("#choice-detail");
    if (next.story?.status === "bound" && next.story.descriptor) {
      storyState.textContent = "Bound";
      storyDetail.textContent = `${next.story.descriptor.storyId} — ${next.story.descriptor.canonicalPath}`;
      choiceDetail.textContent =
        "Refresh choices to read the current canonical storyboard decision.";
    } else {
      storyState.textContent = "Unbound";
      storyDetail.textContent =
        "Inspect a story directory on this computer, then confirm the exact location here. Engine does not change the story until you confirm.";
      choiceDetail.textContent =
        "Options remain unavailable until a story is confirmed in this session.";
      alaCarteChooser.clear();
      storyboardChooser.clear();
    }
    enableActions();
  }

  function route() {
    const name = routeName(windowRef.location.hash);
    for (const button of documentRef.querySelectorAll("[data-route]"))
      button.setAttribute("aria-current", button.dataset.route === name ? "page" : "false");
    for (const panel of documentRef.querySelectorAll("[data-panel]"))
      panel.hidden = panel.id !== name;
    if (name === "choose" && connected && status?.story?.status === "bound")
      void readSelection({ quiet: true });
  }
  for (const button of documentRef.querySelectorAll("[data-route]"))
    button.addEventListener("click", () => {
      windowRef.location.hash = button.dataset.route === "choose" ? "choose" : "readiness";
    });
  windowRef.addEventListener("hashchange", route);

  refresh.addEventListener("click", async () => {
    announce("Refreshing Splash readiness…");
    try {
      render(await api("/api/status", {}));
      if (status?.story?.status === "bound") await readSelection({ quiet: true });
      announce("Splash readiness refreshed.");
    } catch {
      announce("Splash readiness could not be refreshed. The displayed state may be stale.", true);
    } finally {
      refresh.focus();
    }
  });

  setup.addEventListener("click", async () => {
    announce("Starting the protected setup page…");
    try {
      const started = await api("/api/setup/start", {});
      if (started?.setupUrl && openUrl(started.setupUrl)) {
        announce("The protected setup page opened.");
        return;
      }
      const fallback = await api("/api/setup/open", {});
      if (!fallback?.ok) {
        announce("The protected setup page could not open. Nothing was changed.", true);
        return;
      }
      announce("The protected setup page opened with this computer.");
    } catch {
      announce("Splash could not request the setup page. No newsroom value was changed.", true);
    } finally {
      setup.focus();
    }
  });

  function showPending(descriptor, challenge) {
    const root = documentRef.querySelector("#pending-story");
    root.replaceChildren();
    pendingChallenge = challenge;
    const summary = documentRef.createElement("p");
    summary.textContent = `${descriptor.storyId} — ${descriptor.canonicalPath}`;
    const confirm = documentRef.createElement("button");
    confirm.type = "button";
    confirm.textContent = "Confirm this story";
    confirm.addEventListener("click", async () => {
      const token = pendingChallenge;
      pendingChallenge = "";
      try {
        const confirmed = await api("/api/story/confirm", { challenge: token });
        root.replaceChildren();
        render(await api("/api/status", {}));
        await readSelection({ quiet: true });
        announce("The displayed story is bound to this Splash session.");
        void confirmed;
      } catch {
        announce("Story confirmation expired. Inspect and review the story again.", true);
      }
    });
    root.append(summary, confirm);
    announce("Review the exact story location, then confirm it.");
    confirm.focus();
  }

  nominateStory.addEventListener("click", async () => {
    announce("Asking Engine to inspect that story path…");
    try {
      await api("/api/story/nominate", { path: storyPath.value.trim() });
      const pending = await api("/api/story/pending", {});
      if (!pending?.descriptor || !pending?.challenge) {
        announce("Engine refused that story nomination. No story was bound.", true);
        return;
      }
      showPending(pending.descriptor, pending.challenge);
    } catch {
      announce("Engine refused that story nomination. No story was bound or changed.", true);
    } finally {
      nominateStory.focus();
    }
  });

  loadSelection.addEventListener("click", async () => {
    try {
      await readSelection();
    } finally {
      loadSelection.focus();
    }
  });

  try {
    const capability = isCapabilityHash(windowRef.location.hash)
      ? windowRef.location.hash.slice(1)
      : "";
    if (capability) windowRef.history.replaceState(null, "", windowRef.location.pathname);
    if (!capability) throw new Error("This Splash studio link has expired.");
    await api("/session", { capability });
    connected = true;
    render(await api("/api/status", {}));
    route();
    announce("Splash studio is ready.");
  } catch (error) {
    connected = false;
    enableActions();
    announce(error.message, true);
  }
}

if (typeof document !== "undefined") void startSplashApp();
