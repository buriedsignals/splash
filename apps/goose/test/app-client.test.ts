import { describe, expect, it } from "bun:test";
import { startCompatibilityApp } from "../compatibility/app-client.mjs";

class FakeElement {
  dataset: Record<string, string> = {};
  textContent = "";
  disabled = false;
  listeners = new Map<string, Array<(event: any) => unknown>>();

  addEventListener(name: string, listener: (event: any) => unknown) {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]);
  }

  async dispatch(name: string, event: any = {}) {
    await Promise.all((this.listeners.get(name) ?? []).map((listener) => listener(event)));
  }

  async click() {
    if (this.disabled) return;
    await this.dispatch("click");
  }
}

class FakeDocument {
  elements = new Map([
    ["#status", new FakeElement()],
    ["#detail", new FakeElement()],
    ["#refresh", new FakeElement()],
    ["#open-link", new FakeElement()],
  ]);
  listeners = new Map<string, Array<(event: any) => unknown>>();

  querySelector(selector: string) {
    return this.elements.get(selector) ?? null;
  }

  addEventListener(name: string, listener: (event: any) => unknown) {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]);
  }

  async keydown(key: string, { altKey = true, repeat = false } = {}) {
    let prevented = false;
    const event = { altKey, key, repeat, preventDefault: () => { prevented = true; } };
    await Promise.all((this.listeners.get("keydown") ?? []).map((listener) => listener(event)));
    return prevented;
  }
}

type FakeOptions = {
  hostCapabilities?: Record<string, unknown>;
  connectError?: Error;
  connectResult?: unknown;
  refresh?: unknown | Error;
  openLink?: unknown | Error;
};

function appClass(options: FakeOptions = {}) {
  return class FakeApp {
    static instance: FakeApp;
    ontoolresult?: (result: any) => void;
    refreshCalls = 0;
    openLinkCalls = 0;

    constructor() {
      FakeApp.instance = this;
    }

    async connect() {
      if (options.connectError) throw options.connectError;
      if (options.connectResult) this.ontoolresult?.(options.connectResult);
    }

    getHostCapabilities() {
      return options.hostCapabilities ?? { openLinks: {}, serverTools: {} };
    }

    async callServerTool() {
      this.refreshCalls += 1;
      if (options.refresh instanceof Error) throw options.refresh;
      return options.refresh ?? { content: [{ type: "text", text: "Fresh status" }] };
    }

    async openLink() {
      this.openLinkCalls += 1;
      if (options.openLink instanceof Error) throw options.openLink;
      return options.openLink ?? {};
    }
  };
}

function text(documentRef: FakeDocument, selector: string) {
  return documentRef.querySelector(selector)!.textContent;
}

describe("compatibility app client behavior", () => {
  it("handles host results and manual refresh success and error", async () => {
    const documentRef = new FakeDocument();
    const AppClass = appClass();
    const app = await startCompatibilityApp({ AppClass, documentRef } as any) as InstanceType<typeof AppClass>;
    app.ontoolresult?.({ content: [{ type: "text", text: "Host result" }] });
    expect(text(documentRef, "#detail")).toBe("Host result");
    await documentRef.querySelector("#refresh")!.click();
    expect(text(documentRef, "#detail")).toBe("Fresh status");

    const failedDocument = new FakeDocument();
    const FailedApp = appClass({ refresh: new Error("broker unavailable") });
    await startCompatibilityApp({ AppClass: FailedApp, documentRef: failedDocument } as any);
    await failedDocument.querySelector("#refresh")!.click();
    expect(text(failedDocument, "#detail")).toBe("Manual refresh failed: broker unavailable");
  });

  it("does not overwrite a host result delivered during connect", async () => {
    const documentRef = new FakeDocument();
    const AppClass = appClass({ connectResult: { content: [{ type: "text", text: "Initial tool result" }] } });
    await startCompatibilityApp({ AppClass, documentRef } as any);
    expect(text(documentRef, "#detail")).toBe("Initial tool result");
  });

  it("keeps textual refresh available when app-to-tool support is missing", async () => {
    const documentRef = new FakeDocument();
    const AppClass = appClass({ hostCapabilities: { openLinks: {} } });
    await startCompatibilityApp({ AppClass, documentRef } as any);
    expect(documentRef.querySelector("#refresh")!.disabled).toBe(true);
    expect(text(documentRef, "#detail")).toContain("did not declare app-to-tool support");
  });

  it("keeps missing capability, denial, and host error distinct", async () => {
    const missingDocument = new FakeDocument();
    const MissingApp = appClass({ hostCapabilities: {} });
    await startCompatibilityApp({ AppClass: MissingApp, documentRef: missingDocument } as any);
    expect(missingDocument.querySelector("#open-link")!.disabled).toBe(true);
    expect(text(missingDocument, "#detail")).toContain("did not declare open-link support");

    const acceptedDocument = new FakeDocument();
    const AcceptedApp = appClass();
    await startCompatibilityApp({ AppClass: AcceptedApp, documentRef: acceptedDocument } as any);
    await acceptedDocument.querySelector("#open-link")!.click();
    expect(text(acceptedDocument, "#detail")).toContain("accepted the loopback link request");

    const deniedDocument = new FakeDocument();
    const DeniedApp = appClass({ openLink: { isError: true } });
    await startCompatibilityApp({ AppClass: DeniedApp, documentRef: deniedDocument } as any);
    await deniedDocument.querySelector("#open-link")!.click();
    expect(text(deniedDocument, "#detail")).toContain("denied the link request");

    const errorDocument = new FakeDocument();
    const ErrorApp = appClass({ openLink: new Error("transport lost") });
    await startCompatibilityApp({ AppClass: ErrorApp, documentRef: errorDocument } as any);
    await errorDocument.querySelector("#open-link")!.click();
    expect(text(errorDocument, "#detail")).toBe("The host returned an open-link error: transport lost");
  });

  it("does not let late host results erase a user action", async () => {
    const documentRef = new FakeDocument();
    const AppClass = appClass({ openLink: { isError: true } });
    const app = await startCompatibilityApp({ AppClass, documentRef } as any) as InstanceType<typeof AppClass>;
    await documentRef.querySelector("#open-link")!.click();
    app.ontoolresult?.({ content: [{ type: "text", text: "Late host result" }] });
    expect(text(documentRef, "#detail")).toContain("denied the link request");
  });

  it("disables actions after connect failure", async () => {
    const documentRef = new FakeDocument();
    const AppClass = appClass({ connectError: new Error("handshake failed") });
    await startCompatibilityApp({ AppClass, documentRef } as any);
    expect(text(documentRef, "#detail")).toBe("The MCP App bridge did not initialize: handshake failed");
    expect(documentRef.querySelector("#refresh")!.disabled).toBe(true);
    expect(documentRef.querySelector("#open-link")!.disabled).toBe(true);
  });

  it("runs each Alt shortcut once and ignores key repeat", async () => {
    const documentRef = new FakeDocument();
    const AppClass = appClass();
    const app = await startCompatibilityApp({ AppClass, documentRef } as any) as InstanceType<typeof AppClass>;
    expect(await documentRef.keydown("r")).toBe(true);
    expect(app.refreshCalls).toBe(1);
    expect(await documentRef.keydown("r", { repeat: true })).toBe(false);
    expect(app.refreshCalls).toBe(1);
  });
});
