import { describe, expect, it } from "bun:test";
import { startSplashApp } from "../resources/splash-app.mjs";

class FakeElement {
  dataset: Record<string, string> = {};
  textContent = "";
  value = "";
  disabled = false;
  hidden = false;
  id = "";
  href = "";
  target = "";
  rel = "";
  children: FakeElement[] = [];
  get childNodes() { return this.children; }
  listeners = new Map<string, Array<(event: any) => unknown>>();

  addEventListener(name: string, listener: (event: any) => unknown) {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]);
  }

  setAttribute(name: string, value: string) {
    this.dataset[name] = value;
  }

  append(...nodes: FakeElement[]) {
    this.children.push(...nodes);
  }

  replaceChildren(...nodes: FakeElement[]) {
    this.children = nodes;
  }

  focus() {}

  async click() {
    if (this.disabled) return;
    await Promise.all(
      (this.listeners.get("click") ?? []).map((listener) => listener({})),
    );
  }
}

class FakeDocument {
  elements = new Map<string, FakeElement>([
    ["#credentials-announcement", new FakeElement()],
    ["#design-announcement", new FakeElement()],
    ["#choose-announcement", new FakeElement()],
    ["#design-required", new FakeElement()],
    ["#design-fields", new FakeElement()],
    ["#design-form", new FakeElement()],
    ["#cloudflare-form", new FakeElement()],
    ["#cloudflare-account-id", new FakeElement()],
    ["#save-design", new FakeElement()],
    ["#save-account", new FakeElement()],
    ["#design-proposal", new FakeElement()],
    ["#reload-design-settings", new FakeElement()],
    ["#reload-credentials-settings", new FakeElement()],
    ["#account-source", new FakeElement()],
    ["#announcement", new FakeElement()],
    ["#refresh", new FakeElement()],

    ["#nominate-story", new FakeElement()],
    ["#story-path", new FakeElement()],
    ["#load-selection", new FakeElement()],
    ["#choice-root", new FakeElement()],
    ["#mode-a-la-carte", new FakeElement()],
    ["#mode-storyboard", new FakeElement()],
    ["#runtime-state", new FakeElement()],
    ["#blockers", new FakeElement()],
    ["#credentials", new FakeElement()],
    ["#credential-guidance", new FakeElement()],
    ["#browse-story", new FakeElement()],
    ["#story-open", new FakeElement()],
    ["#active-story", new FakeElement()],
    ["#visual-workspace", new FakeElement()],
    ["#choice-modes", new FakeElement()],
    ["#choice-setup-link", new FakeElement()],
    ["#go-to-story", new FakeElement()],
    ["#cancel-story-change", new FakeElement()],
    ["#change-story", new FakeElement()],
    ["#story-name", new FakeElement()],
    ["#readiness-summary", new FakeElement()],
    ["#readiness-detail", new FakeElement()],
    ["#summary-symbol", new FakeElement()],
    ["#story-detail", new FakeElement()],
    ["#choice-detail", new FakeElement()],
    ["#pending-story", new FakeElement()],
  ]);
  routes = [new FakeElement(), new FakeElement(), new FakeElement()];
  panels = [new FakeElement(), new FakeElement(), new FakeElement()];
  listeners = new Map<string, Array<(event: any) => unknown>>();

  constructor() {
    this.routes[0].dataset.route = "credentials";
    this.routes[2].dataset.route = "design";
    this.panels[2].id = "design";
    this.routes[1].dataset.route = "choose";
    this.panels[0].id = "credentials";
    this.panels[1].id = "choose";
    this.elements.set("[data-route]", this.routes[0]);
    this.elements.set("[data-panel]", this.panels[0]);
  }

  querySelector(selector: string) {
    return this.elements.get(selector) ?? null;
  }

  querySelectorAll(selector: string) {
    if (selector === "[data-route]") return this.routes;
    if (selector === "[data-panel]") return this.panels;
    return [];
  }

  createElement(name = "div") {
    const node = new FakeElement();
    node.id = name;
    return node;
  }

  addEventListener(name: string, listener: (event: any) => unknown) {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]);
  }
}

function statusFixture() {
  return {
    schemaVersion: "splash-app/v2",
    runtime: { status: "ready" },
    newsroom: { decision: "missing" },
    readiness: { ready: false, checks: [], blockers: [] },
    credentials: [
      {
        id: "MAPTILER_KEY",
        name: "MapTiler development key",
        state: "not-saved",
        purpose: "Render maps.",
        acquisitionUrl: "https://cloud.maptiler.com/account/keys",
      },
    ],
    story: { status: "unbound", descriptor: null },
  };
}

function allText(node: FakeElement): string {
  return [node.textContent, ...node.children.map(allText)].join(" ");
}

const formatSelection = {
  schemaVersion: "splash-selection/v1", phase: "storyboard",
  gate: { id: "G2b", awaiting: "format" }, slot: { id: "1", medium: "chart" },
  revisions: { story: "story:1", catalogue: "catalog:1", capabilities: "cap:1" },
  choices: [{ id: "format.static", kind: "format", value: "static", label: "Static image", enabled: true }],
};
const formatAdvice = {
  schemaVersion: "splash-storyboard-choice/v1", selection: formatSelection,
  recommendation: {
    schemaVersion: "splash-recommendation/v1", revision: "advice:1",
    selectionRevisions: { storyRevision: "story:1", catalogRevision: "catalog:1", capabilityGeneration: "cap:1" },
    recommendedOptionId: "format.static", ranking: [{ optionId: "format.static", rank: 1 }],
  },
};
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

async function boundClient(read: (path: string) => Promise<any>) {
  const documentRef = new FakeDocument();
  await startSplashApp({
    documentRef,
    windowRef: { location: { hash: "", pathname: "/" }, history: { replaceState() {} }, addEventListener() {} } as any,
    api: async path => {
      if (path === "/api/status") return {
        ...statusFixture(), readiness: { ready: true, blockers: [] },
        story: { status: "bound", descriptor: { storyId: "test", canonicalPath: "/stories/test" } },
      };
      if (path === "/api/settings/read") return { revision: "test", profile: {} };
      return read(path);
    },
  });
  return documentRef;
}

describe("Splash studio browser client", () => {
  it.each(["success", "failure"])("ignores a late recommendation %s after switching to Choose myself", async outcome => {
    let resolve!: (value: any) => void;
    let reject!: (error: Error) => void;
    const pending = new Promise((yes, no) => { resolve = yes; reject = no; });
    const documentRef = await boundClient(async path => path === "/api/recommendation/read" ? pending : formatSelection);
    await documentRef.querySelector("#mode-storyboard")!.click();
    await documentRef.querySelector("#mode-a-la-carte")!.click();
    await settle();
    const root = documentRef.querySelector("#choice-root")!;
    expect(allText(root)).toContain("Static image");
    if (outcome === "success") resolve(formatAdvice);
    else reject(Object.assign(new Error("old request failed"), { body: { status: "preflight-required" } }));
    await settle();
    expect(documentRef.querySelector("#mode-a-la-carte")!.dataset["aria-pressed"]).toBe("true");
    expect(root.hidden).toBe(false);
    expect(allText(root)).toContain("Static image");
    expect(allText(root)).not.toContain("Recommended");
    expect(documentRef.querySelector("#choice-setup-link")!.hidden).toBe(true);
  });

  it("keeps the latest refresh when an earlier read finishes last", async () => {
    let resolve!: (value: any) => void;
    const pending = new Promise(yes => { resolve = yes; });
    let reads = 0;
    const documentRef = await boundClient(async () => ++reads === 1 ? pending : formatSelection);
    const earlier = documentRef.querySelector("#load-selection")!.click();
    await documentRef.querySelector("#load-selection")!.click();
    resolve({ schemaVersion: "splash-selection/v1", phase: "intake", gate: null, choices: [] });
    await earlier;
    expect(documentRef.querySelector("#choice-root")!.hidden).toBe(false);
    expect(documentRef.querySelector("#choice-detail")!.textContent).toContain("Choose an option");
  });

  it("clears an earlier loading message when a quiet tab refresh supersedes it", async () => {
    let resolve!: (value: any) => void;
    const pending = new Promise(yes => { resolve = yes; });
    let reads = 0;
    const documentRef = await boundClient(async () => ++reads === 1 ? pending : formatSelection);
    const earlier = documentRef.querySelector("#load-selection")!.click();
    expect(documentRef.querySelector("#choose-announcement")!.hidden).toBe(false);
    await documentRef.routes[1].click();
    await settle();
    expect(documentRef.querySelector("#choose-announcement")!.hidden).toBe(true);
    resolve(formatSelection);
    await earlier;
  });

  it("marks a connected Cloudflare token for review when its receipt belongs to another account", async () => {
    const documentRef = new FakeDocument();
    await startSplashApp({ documentRef,
      windowRef: { location: { hash: "", pathname: "/" }, history: { replaceState() {} }, addEventListener() {} } as any,
      api: async path => path === "/api/settings/read" ? { revision: "test", profile: {} } : {
        ...statusFixture(), readiness: { ready: true, blockers: [] }, newsroom: { decision: "complete", cloudflareAccountId: "a".repeat(32) },
        credentials: [{ id: "CLOUDFLARE_API_TOKEN", state: "ready", purpose: "Publish hosted visuals.", validation: { evidence: { cloudflareAccountId: "b".repeat(32) } } }],
      },
    });
    expect(documentRef.querySelector("#readiness-summary")!.dataset.tone).toBe("attention");
    const card = documentRef.querySelector("#credentials")!.children[0];
    expect(allText(card)).toContain("Needs review");
    expect(allText(card)).toContain("revalidate");
  });

  it("reports an ended session when both capability and session cookie are unavailable", async () => {
    const documentRef = new FakeDocument();
    await startSplashApp({
      documentRef,
      windowRef: {
        location: { hash: "", pathname: "/" },
        history: { replaceState() {} },
        addEventListener() {},
        open() {
          return null;
        },
      } as any,
      api: async () => {
        throw new Error("api must not run");
      },
    });
    expect(documentRef.querySelector("#announcement")!.textContent).toContain(
      "session is unavailable",
    );
    expect(documentRef.querySelector("#refresh")!.disabled).toBe(true);
  });

  it("opens a studio session over fetch and refreshes status", async () => {
    const calls: string[] = [];
    const documentRef = new FakeDocument();
    const windowRef = {
      location: { hash: "#studio-capability", pathname: "/" },
      history: {
        replaceState() {
          windowRef.location.hash = "";
        },
      },
      addEventListener() {},
      open() {
        return { closed: false };
      },
    };
    await startSplashApp({
      documentRef,
      windowRef: windowRef as any,
      api: async (path: string) => {
        calls.push(path);
        if (path === "/session") return { ok: true };
        if (path === "/api/settings/read") return { revision: "test-revision", profile: {}, declined: false };
        if (path === "/api/status") return { ...statusFixture(), installation: calls.length > 2 ? "self-managed" : "engine", readiness: { ready: calls.length > 2, blockers: [] } };
        throw new Error(`unexpected ${path}`);
      },
    });
    expect(calls).toEqual(["/session", "/api/status", "/api/settings/read"]);
    expect(documentRef.querySelector("#credential-guidance")!.hidden).toBe(true);
    expect(documentRef.querySelector("#blockers")!.children).toHaveLength(0);
    expect(documentRef.querySelector("#blockers")!.hidden).toBe(true);
    expect(documentRef.querySelector("#runtime-state")!.textContent).toBe("Complete your design profile");
    expect(documentRef.querySelector("#refresh")!.disabled).toBe(false);
    expect(documentRef.querySelector("#announcement")!.textContent).toContain(
      "Connected",
    );
    expect(documentRef.querySelector("#announcement")!.hidden).toBe(true);
    const credentialCard = documentRef.querySelector("#credentials")!.children[0];
    expect(credentialCard.children[1].textContent).toContain("MAPTILER_KEY");
    expect(credentialCard.children.at(-1)!.textContent).toBe("Provider instructions");
    await documentRef.querySelector("#refresh")!.click();
    expect(calls).toEqual(["/session", "/api/status", "/api/settings/read", "/api/status"]);
    expect(documentRef.querySelector("#credential-guidance")!.hidden).toBe(false);
    expect(documentRef.querySelector("#runtime-state")!.textContent).toBe("1 service needs setup");
  });

  it("opens Design within the studio and keeps credential feedback inside Credentials", async () => {
    const calls: string[] = [];
    const documentRef = new FakeDocument();
    const windowRef = {
      location: { hash: "#studio-capability", pathname: "/" },
      history: { replaceState() {} }, addEventListener() {},
    };
    await startSplashApp({ documentRef, windowRef: windowRef as any, api: async path => {
      calls.push(path);
      if (path === "/session") return { ok: true };
      if (path === "/api/status") return statusFixture();
      if (path === "/api/settings/read") return { revision: "test-revision", profile: {}, declined: false };
      throw new Error(`unexpected ${path}`);
    } });
    await documentRef.querySelector("#refresh")!.click();
    expect(documentRef.querySelector("#credentials-announcement")!.textContent).toBe("Connections refreshed.");
    expect(documentRef.querySelector("#announcement")!.hidden).toBe(true);
    await documentRef.routes[1].click();
    expect(documentRef.panels[0].hidden).toBe(true);
    expect(documentRef.panels[1].hidden).toBe(false);
    expect(documentRef.querySelector("#choose-announcement")!.textContent).not.toContain("refreshed");
    await documentRef.routes[2].click();
    expect(documentRef.panels[2].hidden).toBe(false);
    expect(windowRef.location.hash).toBe("design");
    expect(calls.some(path => path.includes("/setup/"))).toBe(false);
  });
});
