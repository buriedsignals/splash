import { App } from "@modelcontextprotocol/ext-apps";
import { createAlaCarteChooser } from "./a-la-carte.mjs";
import { createStoryboardChoice } from "./storyboard-choice.mjs";

function statusText(value) {
  return String(value ?? "").replaceAll("-", " ");
}

function validSetupURL(raw) {
  try {
    const url = new URL(raw);
    return url.protocol === "http:" &&
      url.hostname === "127.0.0.1" &&
      Boolean(url.port) &&
      url.pathname === "/" &&
      Boolean(url.hash) &&
      !url.search &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export async function startSplashApp({
  AppClass = App,
  documentRef = document,
  windowRef = window,
} = {}) {
  const announcement = documentRef.querySelector("#announcement");
  const refresh = documentRef.querySelector("#refresh");
  const setup = documentRef.querySelector("#setup");
  const reviewStory = documentRef.querySelector("#review-story");
  const loadSelection = documentRef.querySelector("#load-selection");
  const choiceRoot = documentRef.querySelector("#choice-root");
  const modeAlaCarte = documentRef.querySelector("#mode-a-la-carte");
  const modeStoryboard = documentRef.querySelector("#mode-storyboard");
  if (
    !announcement ||
    !refresh ||
    !setup ||
    !reviewStory ||
    !loadSelection ||
    !choiceRoot ||
    !modeAlaCarte ||
    !modeStoryboard
  )
    throw new Error("Splash app markup is incomplete");

  const app = new AppClass(
    { name: "Splash", version: "0.1.0" },
    {},
    { autoResize: true, strict: true },
  );
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
    const serverTools =
      connected && Boolean(app.getHostCapabilities()?.serverTools);
    refresh.disabled = !serverTools;
    setup.disabled = !serverTools;
    reviewStory.disabled = !serverTools;
    loadSelection.disabled = !serverTools || status?.story?.status !== "bound";
    modeAlaCarte.disabled = !serverTools || status?.story?.status !== "bound";
    modeStoryboard.disabled = !serverTools || status?.story?.status !== "bound";
  }

  async function selectionTool(name, argumentsValue) {
    const result = await app.callServerTool({
      name,
      arguments: argumentsValue,
    });
    if (
      result?.isError ||
      result?.structuredContent?.schemaVersion !== "splash-selection/v1"
    ) {
      const state = result?.structuredContent?.status;
      if (state === "preflight-required") windowRef.location.hash = "readiness";
      throw new Error(
        state === "selection-conflict" || state === "recommendation-conflict"
          ? "The story or available capabilities changed. Choices were refreshed; confirm again."
          : state === "preflight-required"
            ? "Complete Splash readiness before choosing a visual."
            : state === "story-unbound"
              ? "Confirm the exact story before choosing a visual."
              : "The current storyboard decision could not be changed.",
      );
    }
    return result.structuredContent;
  }

  async function recommendationTool(name, argumentsValue) {
    const result = await app.callServerTool({
      name,
      arguments: argumentsValue,
    });
    if (
      result?.isError ||
      result?.structuredContent?.schemaVersion !== "splash-storyboard-choice/v1"
    ) {
      const state = result?.structuredContent?.status;
      if (state === "preflight-required") windowRef.location.hash = "readiness";
      throw new Error(
        state === "recommendation-conflict" || state === "selection-conflict"
          ? "The story evidence or available capabilities changed. Recommendation refreshed; confirm again."
          : state === "preflight-required"
            ? "Complete Splash readiness before requesting a recommendation."
            : state === "story-unbound"
              ? "Confirm the exact story before requesting a recommendation."
              : "The current Storyboard recommendation could not be read.",
      );
    }
    return result.structuredContent;
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
        const advised = await recommendationTool(
          "read_splash_storyboard_recommendation",
          {},
        );
        storyboardChooser.render(advised);
        model = advised.selection;
      } else {
        model = await selectionTool("read_splash_selection", {});
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
      setup.click();
    },
    async onReopenFormat(expected) {
      try {
        return await selectionTool("reopen_splash_format", { expected });
      } catch (error) {
        await readSelection({ quiet: true });
        throw error;
      }
    },
    async onReopenTreatment(expected) {
      try {
        return await selectionTool("reopen_splash_treatment", { expected });
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
        return await selectionTool("confirm_splash_selection", {
          optionId,
          expected,
        });
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
        return await recommendationTool("confirm_splash_storyboard_selection", {
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
    modeAlaCarte.setAttribute(
      "aria-pressed",
      choiceMode === "a-la-carte" ? "true" : "false",
    );
    modeStoryboard.setAttribute(
      "aria-pressed",
      choiceMode === "storyboard" ? "true" : "false",
    );
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
    const newsroomCopy = [newsroom.name, Array.isArray(newsroom.languages) && newsroom.languages.length ? newsroom.languages.join(", ") : ""]
      .filter(Boolean)
      .join(" · ");
    newsroomItem.append(card(newsroomLabel, newsroomCopy || "Use setup to record it or record an explicit decline.", newsroom.decision === "complete" || newsroom.decision === "declined" ? "pass" : "missing"));
    blockers.append(newsroomItem);
    const credentials = documentRef.querySelector("#credentials");
    credentials.replaceChildren();
    for (const row of next.credentials ?? []) {
      const detail = [statusText(row.state), row.purpose]
        .filter(Boolean)
        .join(" — ");
      const node = card(row.name || row.id, detail, row.state);
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
        "Ask the model to nominate a story. Engine will inspect it without changing it, then you confirm the exact location here.";
      choiceDetail.textContent =
        "Options remain unavailable until a story is confirmed in this session.";
      alaCarteChooser.clear();
      storyboardChooser.clear();
    }
    enableActions();
  }

  function route() {
    const name = windowRef.location.hash === "#choose" ? "choose" : "readiness";
    for (const button of documentRef.querySelectorAll("[data-route]"))
      button.setAttribute(
        "aria-current",
        button.dataset.route === name ? "page" : "false",
      );
    for (const panel of documentRef.querySelectorAll("[data-panel]"))
      panel.hidden = panel.id !== name;
    if (name === "choose" && connected && status?.story?.status === "bound")
      void readSelection({ quiet: true });
  }
  for (const button of documentRef.querySelectorAll("[data-route]"))
    button.addEventListener("click", () => {
      windowRef.location.hash =
        button.dataset.route === "choose" ? "choose" : "readiness";
    });
  windowRef.addEventListener("hashchange", route);
  route();

  app.ontoolresult = (result) => {
    if (result?.structuredContent?.schemaVersion === "splash-app/v2") {
      render(result.structuredContent);
      announce("Current Splash status loaded.");
    }
  };

  refresh.addEventListener("click", async () => {
    announce("Refreshing Splash readiness…");
    try {
      const result = await app.callServerTool({
        name: "refresh_splash_status",
        arguments: {},
      });
      if (result?.isError) throw new Error("refresh refused");
      render(result.structuredContent);
      if (result.structuredContent?.story?.status === "bound")
        await readSelection({ quiet: true });
      announce("Splash readiness refreshed.");
    } catch {
      announce(
        "Splash readiness could not be refreshed. The displayed state may be stale.",
        true,
      );
    } finally {
      refresh.focus();
    }
  });

  setup.addEventListener("click", async () => {
    announce("Starting the protected setup page…");
    let setupUrl = "";
    try {
      const started = await app.callServerTool({
        name: "start_splash_setup",
        arguments: {},
      });
      setupUrl = validSetupURL(started?.structuredContent?.setupUrl);
      if (started?.isError || !setupUrl) {
        announce(
          "The protected setup controller could not start. Nothing was changed.",
          true,
        );
        return;
      }
      let opened = false;
      let hostOutcome = "unsupported-host";
      if (app.getHostCapabilities()?.openLinks) {
        try {
          const result = await app.openLink({ url: setupUrl });
          opened = !result?.isError;
          hostOutcome = opened ? "host-opened" : "host-denied";
        } catch {
          hostOutcome = "host-error";
        }
      }
      setupUrl = "";
      if (!opened) {
        const fallback = await app.callServerTool({
          name: "open_splash_setup_locally",
          arguments: {},
        });
        if (fallback?.isError || !fallback?.structuredContent?.ok) {
          const cause =
            fallback?.structuredContent?.status === "session-expired"
              ? "The setup session expired before it could open."
              : hostOutcome === "host-error"
                ? "The host returned an error and this computer’s URL opener also failed."
                : hostOutcome === "host-denied"
                  ? "The host denied the page and this computer’s URL opener also failed."
                  : "This host cannot open links and this computer has no working URL opener.";
          announce(`${cause} Nothing was changed.`, true);
          return;
        }
        announce(
          hostOutcome === "host-error"
            ? "The host returned an error, so the protected setup page opened with this computer."
            : hostOutcome === "host-denied"
              ? "The host denied the link; the protected setup page opened with this computer instead."
              : "The protected setup page opened with this computer.",
        );
      } else {
        announce("The host opened the protected setup page.");
      }
    } catch {
      setupUrl = "";
      announce(
        "Splash could not request the setup page. No credential or newsroom value was changed.",
        true,
      );
    } finally {
      setup.focus();
    }
  });

  reviewStory.addEventListener("click", async () => {
    announce("Reading the nominated story for this app session…");
    const root = documentRef.querySelector("#pending-story");
    root.replaceChildren();
    pendingChallenge = "";
    try {
      const result = await app.callServerTool({
        name: "pending_splash_story",
        arguments: {},
      });
      const descriptor = result?.structuredContent?.descriptor;
      pendingChallenge = result?.structuredContent?.challenge ?? "";
      if (!descriptor || !pendingChallenge) {
        announce(
          "No nominated story is waiting. Ask the model to nominate one first.",
          true,
        );
        return;
      }
      const summary = documentRef.createElement("p");
      summary.textContent = `${descriptor.storyId} — ${descriptor.canonicalPath}`;
      const confirm = documentRef.createElement("button");
      confirm.type = "button";
      confirm.textContent = "Confirm this story";
      confirm.addEventListener("click", async () => {
        const challenge = pendingChallenge;
        pendingChallenge = "";
        try {
          const confirmed = await app.callServerTool({
            name: "confirm_splash_story",
            arguments: { challenge },
          });
          if (confirmed?.isError) throw new Error("confirmation refused");
          root.replaceChildren();
          if (status)
            render({
              ...status,
              story: {
                status: "bound",
                descriptor: confirmed.structuredContent.descriptor,
              },
            });
          await readSelection({ quiet: true });
          announce("The displayed story is bound to this Splash session.");
        } catch {
          announce(
            "Story confirmation expired. Nominate and review the story again.",
            true,
          );
        }
      });
      root.append(summary, confirm);
      announce("Review the exact story location, then confirm it.");
      confirm.focus();
    } catch {
      announce(
        "The nominated story could not be read. No story was bound.",
        true,
      );
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
    await app.connect();
    connected = true;
    enableActions();
    if (!app.getHostCapabilities()?.serverTools)
      announce(
        "This host does not prove app-only tools, so embedded setup and confirmation are disabled.",
        true,
      );
    else if (!status)
      announce("Splash is connected. Refresh to read current readiness.");
  } catch {
    connected = false;
    enableActions();
    announce(
      "The Splash app bridge could not initialize. Use the textual pre-flight flow.",
      true,
    );
  }
  return app;
}

if (typeof document !== "undefined") void startSplashApp();
