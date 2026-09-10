import { createSettingsEditor } from "./settings-editor.mjs";
import { readinessView, serviceConnectionView, selectionView } from "./readiness-view.mjs";
import { createAlaCarteChooser } from "./a-la-carte.mjs";
import { createStoryboardChoice } from "./storyboard-choice.mjs";

function routeName(hash) {
  const name = String(hash).replace(/^#/, "");
  return name === "choose" ? "choose" : name === "design" ? "design" : "credentials";
}

function isCapabilityHash(hash) {
  const value = String(hash ?? "").replace(/^#/, "");
  return Boolean(value) && !["choose", "design", "credentials", "readiness"].includes(value);
}

export const API_TIMEOUT_MS = 60_000;

export async function defaultApi(path, body = {}) {
  // The studio must never sit on "Connecting to Splash…" without a verdict:
  // the server bounds its own credential reads, and this bounds the request.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("Splash did not answer within 60 seconds. Check the Splash process, then refresh.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
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
} = {}) {
  const announcement = documentRef.querySelector("#announcement");
  const refresh = documentRef.querySelector("#refresh");
  const nominateStory = documentRef.querySelector("#nominate-story");
  const storyPath = documentRef.querySelector("#story-path");
  const loadSelection = documentRef.querySelector("#load-selection");
  const choiceRoot = documentRef.querySelector("#choice-root");
  const modeAlaCarte = documentRef.querySelector("#mode-a-la-carte");
  const modeStoryboard = documentRef.querySelector("#mode-storyboard");
  const browseStory = documentRef.querySelector("#browse-story");
  const storyOpen = documentRef.querySelector("#story-open");
  const activeStory = documentRef.querySelector("#active-story");
  const visualWorkspace = documentRef.querySelector("#visual-workspace");
  const choiceModes = documentRef.querySelector("#choice-modes");
  const setupLink = documentRef.querySelector("#choice-setup-link");
  if (
    !announcement ||
    !refresh ||
    !nominateStory ||
    !storyPath ||
    !loadSelection ||
    !choiceRoot ||
    !modeAlaCarte ||
    !modeStoryboard
  )
    throw new Error("Splash app markup is incomplete");

  const settingsOnly = documentRef.body?.dataset.settingsOnly === "true";
  const statusPath = settingsOnly ? "/api/studio-status" : "/api/status";
  for (const element of documentRef.querySelectorAll("[data-story-only]")) element.hidden = settingsOnly;
  let connected = false;
  let status = null;
  let pendingChallenge = "";
  let choiceMode = "a-la-carte";
  let openingStory = false;
  // Both modes share one root. Only the latest read may render or report failure.
  let selectionRequest = 0;

  function announce(message, error = false, { visible = true, destination = "choose" } = {}) {
    const node = destination === "global" ? announcement : documentRef.querySelector(`#${destination}-announcement`);
    node.textContent = message;
    node.dataset.kind = error ? "error" : "status";
    node.hidden = !visible;
    if (visible && error && (destination === "global" || routeName(windowRef.location.hash) === destination)) node.focus();
  }

  const settingsEditor = createSettingsEditor({ documentRef, api, announce, onSaved: async () => {
    render(await api(statusPath, {}));
  } });

  function enableActions() {
    refresh.disabled = !connected;
    nominateStory.disabled = !connected || openingStory || !storyPath.value?.trim();
    browseStory.disabled = !connected || openingStory;
    storyPath.disabled = !connected;
    loadSelection.disabled = !connected || status?.story?.status !== "bound";
    modeAlaCarte.disabled = !connected || status?.story?.status !== "bound";
    modeStoryboard.disabled = !connected || status?.story?.status !== "bound";
  }

  function selectionError(error) {
    const state = error?.body?.status;

    const message =
      state === "selection-conflict" || state === "recommendation-conflict"
        ? "The story or available capabilities changed. Choices were refreshed; confirm again."
        : state === "preflight-required"
          ? "Complete Credentials and Design before choosing a visual."
          : state === "story-unbound"
            ? "Confirm the exact story before choosing a visual."
            : error.message;
    const failure = new Error(message);
    failure.body = error?.body;
    throw failure;
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

  function describeSelection(model) {
    const view = selectionView(model);
    documentRef.querySelector("#choice-detail").textContent = view.detail;
    choiceModes.hidden = !view.choosing;
    choiceRoot.hidden = !view.choosing;
    setupLink.hidden = true;
  }

  async function readSelection({ quiet = false } = {}) {
    const request = ++selectionRequest;
    const mode = choiceMode;
    if (status?.story?.status !== "bound") {
      alaCarteChooser.clear();
      storyboardChooser.clear();
      return null;
    }
    if (!quiet) announce("Reading the story’s next decision…");
    try {
      let model;
      if (mode === "storyboard") {
        const advised = await recommendationTool("/api/recommendation/read", {});
        if (request !== selectionRequest) return null;
        model = advised.selection;
        describeSelection(model);
        storyboardChooser.render(advised);
      } else {
        model = await selectionTool("/api/selection/read", {});
        if (request !== selectionRequest) return null;
        describeSelection(model);
        alaCarteChooser.render(model);
      }
      announce("Story choices refreshed.", false, { visible: false });
      return model;
    } catch (error) {
      if (request !== selectionRequest) return null;
      alaCarteChooser.clear();
      storyboardChooser.clear();
      announce("Story choices could not be loaded.", true, { visible: false });
      const setupRequired = error?.body?.status === "preflight-required" || status?.readiness?.ready !== true;
      choiceModes.hidden = setupRequired || choiceMode !== "storyboard";
      choiceRoot.hidden = true;
      setupLink.hidden = !setupRequired;
      documentRef.querySelector("#choice-detail").textContent = !setupLink.hidden
        ? "The story is open. Complete workspace setup before making visual decisions."
        : choiceMode === "storyboard"
          ? "Suggestions could not be loaded. Your agent may need to prepare the story’s data profile. You can still switch to Choose myself."
          : "The story’s next decision could not be loaded. Ask your agent to check its article, data and storyboard, then refresh from story.";
      return null;
    }
  }

  const sharedChooserOptions = {
    documentRef,
    root: choiceRoot,
    announce,
    onConfigure() {
      windowRef.location.hash = "credentials";
    },
    async onReopenFormat(expected) {
      ++selectionRequest;
      try {
        const model = await selectionTool("/api/selection/reopen-format", { expected });
        describeSelection(model);
        return model;
      } catch (error) {
        await readSelection({ quiet: true });
        throw error;
      }
    },
    async onReopenTreatment(expected) {
      ++selectionRequest;
      try {
        const model = await selectionTool("/api/selection/reopen-treatment", { expected });
        describeSelection(model);
        return model;
      } catch (error) {
        await readSelection({ quiet: true });
        throw error;
      }
    },
  };

  const alaCarteChooser = createAlaCarteChooser({
    ...sharedChooserOptions,
    async onConfirm({ optionId, expected }) {
      ++selectionRequest;
      try {
        const model = await selectionTool("/api/selection/confirm", { optionId, expected });
        describeSelection(model);
        return model;
      } catch (error) {
        await readSelection({ quiet: true });
        throw error;
      }
    },
  });

  const storyboardChooser = createStoryboardChoice({
    ...sharedChooserOptions,
    async onConfirm({ optionId, expected, recommendationRevision }) {
      ++selectionRequest;
      try {
        const model = await recommendationTool("/api/recommendation/confirm", {
          optionId,
          expected,
          recommendationRevision,
        });
        describeSelection(model.selection);
        return model;
      } catch (error) {
        await readSelection({ quiet: true });
        throw error;
      }
    },
  });

  function setChoiceMode(next) {
    ++selectionRequest;
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
    if (status?.story?.descriptor?.canonicalPath !== next.story?.descriptor?.canonicalPath || status?.story?.status !== next.story?.status) {
      ++selectionRequest;
      alaCarteChooser.clear();
      storyboardChooser.clear();
    }
    status = next;
    const summary = readinessView(next);
    documentRef.querySelector("#runtime-state").textContent = summary.title;
    documentRef.querySelector("#readiness-detail").textContent = summary.detail;
    documentRef.querySelector("#readiness-summary").dataset.tone = summary.tone;
    documentRef.querySelector("#summary-symbol").textContent = summary.tone === "success" ? "✓" : summary.tone === "attention" ? "!" : "i";
    const needsDesign = ["missing", "invalid", "unknown"].includes(next.newsroom?.decision);
    documentRef.querySelector("#design-required").hidden = !needsDesign;
    setupLink.textContent = needsDesign ? "Open Design" : "Open Credentials";
    setupLink.dataset.destination = needsDesign ? "design" : "credentials";
    const blockers = documentRef.querySelector("#blockers");
    blockers.replaceChildren();
    if (next.readiness?.blockers?.length) {
      for (const blocker of next.readiness.blockers.filter(row => row.id !== "newsroom-profile")) {
        const item = documentRef.createElement("li");
        item.append(card(blocker.id, blocker.detail, blocker.status));
        blockers.append(item);
      }
    }
    blockers.hidden = !next.readiness?.blockers?.some(row => row.id !== "newsroom-profile");
    const guidance = documentRef.querySelector("#credential-guidance");
    if (guidance) guidance.hidden = next.installation !== "self-managed";
    const credentials = documentRef.querySelector("#credentials");
    credentials.replaceChildren();
    for (const credential of next.credentials ?? []) {
      const row = serviceConnectionView(credential, next);
      const node = documentRef.createElement("article");
      node.className = "card service-card";
      node.dataset.state = row.state;
      const header = documentRef.createElement("div");
      header.className = "service-heading";
      const title = documentRef.createElement("strong");
      title.textContent = row.name || row.id;
      const state = documentRef.createElement("span");
      state.className = "service-state";
      state.textContent = row.label;
      header.append(title, state);
      const id = documentRef.createElement("code");
      id.className = "credential-id";
      id.textContent = row.id;
      const detail = documentRef.createElement("p");
      detail.textContent = row.purpose || row.reason || "";
      node.append(header, id, detail);
      if (row.reason && row.purpose && !["not-set", "not-saved"].includes(row.state)) {
        const reason = documentRef.createElement("p");
        reason.className = "service-reason";
        reason.textContent = row.reason;
        node.append(reason);
      }
      if (row.acquisitionUrl) {
        const link = documentRef.createElement("a");
        link.href = row.acquisitionUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Provider instructions";
        node.append(link);
      }
      credentials.append(node);
    }
    const bound = next.story?.status === "bound" && next.story.descriptor;
    storyOpen.hidden = Boolean(bound);
    activeStory.hidden = !bound;
    visualWorkspace.hidden = !bound;
    documentRef.querySelector("#cancel-story-change").hidden = !bound;
    if (bound) {
      documentRef.querySelector("#story-name").textContent = next.story.descriptor.storyId;
      documentRef.querySelector("#story-detail").textContent = next.story.descriptor.canonicalPath;
      storyPath.value = next.story.descriptor.canonicalPath;
    } else {
      alaCarteChooser.clear();
      storyboardChooser.clear();
      choiceModes.hidden = true;
    }
    enableActions();
  }

  function route() {
    const requested = routeName(windowRef.location.hash);
    const name = settingsOnly && requested === "choose" ? "design" : requested;
    for (const button of documentRef.querySelectorAll("[data-route]"))
      button.setAttribute("aria-current", button.dataset.route === name ? "page" : "false");
    for (const panel of documentRef.querySelectorAll("[data-panel]"))
      panel.hidden = (panel.dataset.destination || panel.id) !== name;
    if (name === "choose" && connected && status?.story?.status === "bound")
      void readSelection({ quiet: true });
  }
  for (const button of documentRef.querySelectorAll("[data-route]"))
    button.addEventListener("click", () => {
      windowRef.location.hash = button.dataset.route;
      route();
    });
  windowRef.addEventListener("hashchange", route);

  refresh.addEventListener("click", async () => {
    refresh.disabled = true;
    announce("Refreshing connections…", false, { destination: "credentials" });
    try {
      render(await api(statusPath, {}));
      if (status?.story?.status === "bound") await readSelection({ quiet: true });
      announce("Connections refreshed.", false, { destination: "credentials" });
    } catch {
      announce("Connections could not be refreshed. The displayed status may be out of date.", true, { destination: "credentials" });
    } finally {
      refresh.disabled = !connected;
    }
  });


  function clearPending() {
    pendingChallenge = "";
    documentRef.querySelector("#pending-story").replaceChildren();
  }

  function showPending(descriptor, challenge) {
    const root = documentRef.querySelector("#pending-story");
    root.replaceChildren();
    pendingChallenge = challenge;
    const title = documentRef.createElement("strong");
    title.textContent = descriptor.storyId;
    const location = documentRef.createElement("p");
    location.textContent = descriptor.canonicalPath;
    const confirm = documentRef.createElement("button");
    confirm.type = "button";
    confirm.className = "primary";
    confirm.textContent = "Use this story";
    confirm.addEventListener("click", async () => {
      ++selectionRequest;
      const token = pendingChallenge;
      pendingChallenge = "";
      confirm.disabled = true;
      try {
        await api("/api/story/confirm", { challenge: token });
        clearPending();
        render(await api(statusPath, {}));
        await readSelection({ quiet: true });
        announce("Story opened.", false, { visible: false });
        documentRef.querySelector("#change-story").focus();
      } catch {
        clearPending();
        announce("The folder confirmation expired. Open the folder again to continue.", true);
      }
    });
    const cancel = documentRef.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", clearPending);
    root.append(title, location, confirm, cancel);
    announce("Folder checked. Confirm the story shown below.", false, { visible: false });
    confirm.focus();
  }

  async function checkStory(path) {
    clearPending();
    await api("/api/story/nominate", { path });
    const pending = await api("/api/story/pending", {});
    if (!pending?.descriptor || !pending?.challenge) throw new Error("No story found");
    showPending(pending.descriptor, pending.challenge);
  }

  async function openStory(fromPicker) {
    if (openingStory) return;
    openingStory = true;
    enableActions();
    try {
      if (fromPicker) {
        const picked = await api("/api/story/browse", {});
        if (picked.status === "cancelled") return;
        if (picked.status !== "selected") {
          announce("A folder picker is unavailable on this host. Paste the story folder’s full path below.", true);
          storyPath.focus();
          return;
        }
        storyPath.value = picked.path;
      }
      const path = storyPath.value.trim();
      if (path) await checkStory(path);
    } catch {
      clearPending();
      announce("This folder could not be opened as a Splash story. Choose the story folder prepared by your agent, containing AGENTS.md and source/article.md. If it is a new story, prepare it with your agent first.", true);
    } finally {
      openingStory = false;
      enableActions();
    }
  }

  browseStory.addEventListener("click", () => openStory(true));
  nominateStory.addEventListener("click", () => openStory(false));
  storyPath.addEventListener("input", () => { clearPending(); enableActions(); });
  storyPath.addEventListener("keydown", event => { if (event.key === "Enter" && !nominateStory.disabled) void openStory(false); });
  documentRef.querySelector("#design-required").addEventListener("click", () => { windowRef.location.hash = "design"; route(); });
  setupLink.addEventListener("click", () => { windowRef.location.hash = setupLink.dataset.destination || "credentials"; route(); });
  documentRef.querySelector("#change-story").addEventListener("click", () => {
    clearPending();
    storyOpen.hidden = false;
    activeStory.hidden = true;
    visualWorkspace.hidden = true;
    browseStory.focus();
  });
  documentRef.querySelector("#cancel-story-change").addEventListener("click", () => { clearPending(); render(status); });

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
    if (capability) await api("/session", { capability });
    connected = true;
    render(await api(statusPath, {}));
    await settingsEditor.load();
    route();
    announce("Connected.", false, { visible: false, destination: "global" });
  } catch (error) {
    connected = false;
    enableActions();
    announce("This Splash session is unavailable or has ended. Ask your agent to reopen Splash.", true, { destination: "global" });
  }
}

if (typeof document !== "undefined") void startSplashApp();
