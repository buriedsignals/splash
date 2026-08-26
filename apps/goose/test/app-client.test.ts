import { describe, expect, it } from "bun:test";
import { startSplashApp } from "../resources/splash-app.mjs";

class FakeElement {
  dataset: Record<string, string> = {};
  textContent = "";
  disabled = false;
  hidden = false;
  id = "";
  href = "";
  target = "";
  rel = "";
  children: FakeElement[] = [];
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
    ["#announcement", new FakeElement()],
    ["#refresh", new FakeElement()],
    ["#setup", new FakeElement()],
    ["#nominate-story", new FakeElement()],
    ["#story-path", new FakeElement()],
    ["#load-selection", new FakeElement()],
    ["#choice-root", new FakeElement()],
    ["#mode-a-la-carte", new FakeElement()],
    ["#mode-storyboard", new FakeElement()],
    ["#runtime-state", new FakeElement()],
    ["#blockers", new FakeElement()],
    ["#credentials", new FakeElement()],
    ["#story-state", new FakeElement()],
    ["#story-detail", new FakeElement()],
    ["#choice-detail", new FakeElement()],
    ["#pending-story", new FakeElement()],
  ]);
  routes = [new FakeElement(), new FakeElement()];
  panels = [new FakeElement(), new FakeElement()];
  listeners = new Map<string, Array<(event: any) => unknown>>();

  constructor() {
    this.routes[0].dataset.route = "readiness";
    this.routes[1].dataset.route = "choose";
    this.panels[0].id = "readiness";
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
    credentials: [],
    story: { status: "unbound", descriptor: null },
  };
}

describe("Splash studio browser client", () => {
  it("refuses to start without a capability hash", async () => {
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
      "expired",
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
        if (path === "/api/status") return statusFixture();
        throw new Error(`unexpected ${path}`);
      },
    });
    expect(calls).toEqual(["/session", "/api/status"]);
    expect(documentRef.querySelector("#refresh")!.disabled).toBe(false);
    expect(documentRef.querySelector("#announcement")!.textContent).toContain(
      "ready",
    );
    await documentRef.querySelector("#refresh")!.click();
    expect(calls).toEqual(["/session", "/api/status", "/api/status"]);
  });

  it("opens setup through the local page, not an MCP tool name", async () => {
    const calls: string[] = [];
    const documentRef = new FakeDocument();
    const opened: string[] = [];
    await startSplashApp({
      documentRef,
      windowRef: {
        location: { hash: "#studio-capability", pathname: "/" },
        history: { replaceState() {} },
        addEventListener() {},
      } as any,
      openUrl: (url: string) => {
        opened.push(url);
        return { closed: false };
      },
      api: async (path: string) => {
        calls.push(path);
        if (path === "/session") return { ok: true };
        if (path === "/api/status") return statusFixture();
        if (path === "/api/setup/start")
          return { status: "ready", setupUrl: "http://127.0.0.1:9/#setup" };
        throw new Error(`unexpected ${path}`);
      },
    });
    await documentRef.querySelector("#setup")!.click();
    expect(calls).toContain("/api/setup/start");
    expect(calls).not.toContain("start_splash_setup");
    expect(opened).toEqual(["http://127.0.0.1:9/#setup"]);
  });
});
