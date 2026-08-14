import { App } from "@modelcontextprotocol/ext-apps";

function textResult(result) {
  return result?.content?.find((item) => item.type === "text")?.text ?? "No status returned.";
}

function show(status, detail, kind, message) {
  status.dataset.kind = kind;
  status.textContent = kind === "ready" ? "Compatible" : kind === "pending" ? "Checking…" : "Unavailable";
  detail.textContent = message;
}

export async function startCompatibilityApp({ AppClass = App, documentRef = document } = {}) {
  const status = documentRef.querySelector("#status");
  const detail = documentRef.querySelector("#detail");
  const refresh = documentRef.querySelector("#refresh");
  const openLink = documentRef.querySelector("#open-link");
  if (!status || !detail || !refresh || !openLink) throw new Error("compatibility app markup is incomplete");

  const app = new AppClass(
    { name: "Splash Goose compatibility", version: "0.1.0" },
    {},
    { autoResize: true, strict: true },
  );
  let connected = false;
  let userInteracted = false;
  let hostResultDisplayed = false;
  let actionId = 0;

  const enableActions = () => {
    refresh.disabled = !connected || !app.getHostCapabilities()?.serverTools;
    openLink.disabled = !connected || !app.getHostCapabilities()?.openLinks;
  };
  const connectedMessage = () => {
    const messages = ["The MCP App bridge is connected."];
    if (app.getHostCapabilities()?.serverTools) messages.push("Use Refresh to test an app-only server tool.");
    else messages.push("This host did not declare app-to-tool support; use the textual Splash flow to refresh status.");
    if (!app.getHostCapabilities()?.openLinks) {
      messages.push("This host did not declare open-link support; the textual Splash flow remains available.");
    }
    return messages.join(" ");
  };
  const beginAction = (message) => {
    userInteracted = true;
    actionId += 1;
    refresh.disabled = true;
    openLink.disabled = true;
    show(status, detail, "pending", message);
    return actionId;
  };
  const finishAction = (id, kind, message) => {
    if (id !== actionId) return;
    show(status, detail, kind, message);
    enableActions();
  };

  // A Goose tool result may arrive as soon as the view connects. Register first
  // so host-driven result refresh cannot race the handshake. Once the user has
  // acted, an uncorrelated late host result must not erase that action's result.
  app.ontoolresult = (result) => {
    if (!userInteracted) {
      hostResultDisplayed = true;
      show(status, detail, result?.isError ? "error" : "ready", textResult(result));
    }
  };

  refresh.addEventListener("click", async () => {
    if (!connected) return;
    if (!app.getHostCapabilities()?.serverTools) {
      userInteracted = true;
      show(status, detail, "error", "This host did not declare app-to-tool support. Return to the textual Splash flow to refresh status.");
      return;
    }
    const id = beginAction("Requesting current compatibility status from Splash…");
    try {
      const result = await app.callServerTool({
        name: "refresh_splash_compatibility",
        arguments: {},
      });
      finishAction(id, result?.isError ? "error" : "ready", textResult(result));
    } catch (error) {
      finishAction(id, "error", `Manual refresh failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  openLink.addEventListener("click", async () => {
    if (!connected) return;
    if (!app.getHostCapabilities()?.openLinks) {
      userInteracted = true;
      show(status, detail, "error", "This host did not declare open-link support. The textual Splash flow remains available.");
      return;
    }
    const id = beginAction("Waiting for the host to approve the safe loopback link…");
    try {
      const result = await app.openLink({ url: "http://127.0.0.1:65535/splash-compatibility" });
      if (result?.isError) {
        finishAction(id, "error", "The host denied the link request. Nothing was changed; use Refresh or return to the textual flow.");
      } else {
        finishAction(id, "ready", "The host accepted the loopback link request. This fixture carries no credential or pairing secret.");
      }
    } catch (error) {
      finishAction(id, "error", `The host returned an open-link error: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // Keep the compatibility probe operable when an embedded host exposes the
  // iframe but its accessibility bridge cannot target individual descendants.
  documentRef.addEventListener("keydown", (event) => {
    if (!event.altKey || event.repeat) return;
    const key = event.key.toLowerCase();
    if (key !== "r" && key !== "o") return;
    event.preventDefault();
    if (key === "r") refresh.click();
    if (key === "o") openLink.click();
  });

  try {
    await app.connect();
    connected = true;
    enableActions();
    if (!hostResultDisplayed) show(status, detail, "ready", connectedMessage());
  } catch (error) {
    connected = false;
    enableActions();
    show(status, detail, "error", `The MCP App bridge did not initialize: ${error instanceof Error ? error.message : String(error)}`);
  }
  return app;
}

if (typeof document !== "undefined") {
  void startCompatibilityApp();
}
