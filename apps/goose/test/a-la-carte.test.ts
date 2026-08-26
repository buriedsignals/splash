import { describe, expect, it } from "bun:test";
import {
  buildAlaCarteView,
  createAlaCarteChooser,
  expectedSelectionRevisions,
  upstreamSelectionSummary,
} from "../resources/a-la-carte.mjs";
import { capabilitySnapshotFromStatus } from "../selection.mjs";

function model(choices: any[]) {
  return {
    schemaVersion: "splash-selection/v1",
    story: { storyId: "story-one", canonicalPath: "/stories/story-one" },
    phase: "storyboard",
    gate: { id: "G2b", awaiting: "format" },
    slot: { id: "1", proves: "Adoption rose.", medium: "chart" },
    revisions: {
      story: "sha256:story",
      catalogue: "sha256:catalogue",
      capabilities: "sha256:capabilities",
    },
    choices,
  };
}

const formats = [
  {
    id: "format.static",
    kind: "format",
    value: "static",
    label: "Static image",
    description: "Read at rest.",
    interaction: { kind: "none", promise: "No reader interaction." },
    deliveryForms: ["owned-file", "cms-insertion"],
    enabled: true,
    reason: null,
    repairAction: null,
  },
  {
    id: "format.web",
    kind: "format",
    value: "web",
    label: "Interactive web",
    description: "Explore exact values.",
    interaction: { kind: "explore", promise: "Pointer, touch, and keyboard." },
    deliveryForms: ["owned-file", "embed"],
    enabled: false,
    reason: "Map production needs a verified MapTiler key.",
    repairAction: "open-readiness",
  },
  {
    id: "format.video",
    kind: "format",
    value: "video",
    label: "Video",
    description: "A controlled reveal.",
    interaction: { kind: "motion", promise: "Fixed-duration motion." },
    deliveryForms: ["owned-file", "cms-insertion"],
    enabled: true,
    reason: null,
    repairAction: null,
  },
];

class FakeNode {
  tagName: string;
  children: FakeNode[] = [];
  dataset: Record<string, string> = {};
  attributes = new Map<string, string>();
  listeners = new Map<string, Array<() => unknown>>();
  textContent = "";
  className = "";
  id = "";
  type = "";
  name = "";
  value = "";
  disabled = false;
  checked = false;
  selected = false;

  constructor(tagName: string) {
    this.tagName = tagName;
  }

  get childNodes() {
    return this.children;
  }

  append(...nodes: FakeNode[]) {
    this.children.push(...nodes);
  }

  replaceChildren(...nodes: FakeNode[]) {
    this.children = [...nodes];
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  addEventListener(name: string, listener: () => unknown) {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]);
  }

  async dispatch(name: string) {
    for (const listener of this.listeners.get(name) ?? []) await listener();
  }

  async click() {
    if (!this.disabled) await this.dispatch("click");
  }
}

class FakeDocument {
  createElement(name: string) {
    return new FakeNode(name);
  }
}

function find(
  root: FakeNode,
  predicate: (node: FakeNode) => boolean,
): FakeNode {
  if (predicate(root)) return root;
  for (const child of root.children) {
    const result = findOptional(child, predicate);
    if (result) return result;
  }
  throw new Error("fake node was not found");
}

function findOptional(
  root: FakeNode,
  predicate: (node: FakeNode) => boolean,
): FakeNode | null {
  if (predicate(root)) return root;
  for (const child of root.children) {
    const result = findOptional(child, predicate);
    if (result) return result;
  }
  return null;
}

describe("à-la-carte chooser state", () => {
  it("keeps canonical order, hides unavailable rows by default, and never ranks", () => {
    const view = buildAlaCarteView(model(formats));
    expect(view.groups[0].choices.map((row: any) => row.id)).toEqual([
      "format.static",
      "format.video",
    ]);
    expect(view.facets.map((row: any) => row.id)).toEqual([
      "format",
      "interaction",
      "delivery",
    ]);
    expect(view.selected).toBeNull();

    const expanded = buildAlaCarteView(model(formats), {
      showUnavailable: true,
      selectedOptionId: "format.web",
    });
    expect(expanded.groups[0].choices.map((row: any) => row.id)).toEqual(
      formats.map((row) => row.id),
    );
    expect(expanded.selected).toBeNull();
  });

  it("names zero-result filters and offers setup only for a repairable capability", () => {
    const repairable = buildAlaCarteView(model(formats), {
      filters: { format: "web" },
    });
    expect(repairable.resultCount).toBe(0);
    expect(repairable.activeFilterLabels).toEqual([
      "Publication format: Interactive web",
    ]);
    expect(repairable.repairAction).toBe("open-readiness");

    const proofOnly = buildAlaCarteView({
      ...model([
        {
          id: "chart.contour",
          kind: "treatment",
          value: "Contour / isoline",
          label: "Contour / isoline",
          family: "chart",
          enabled: false,
          proofOnly: true,
          reason: "No production implementation exists.",
          repairAction: null,
        },
      ]),
      gate: { id: "G2-treatment", awaiting: "treatment" },
    });
    expect(proofOnly.resultCount).toBe(0);
    expect(proofOnly.repairAction).toBeNull();
  });

  it("carries only the current revision set and confirmed upstream fields into review", () => {
    const current = model(formats);
    expect(expectedSelectionRevisions(current)).toEqual({
      storyRevision: "sha256:story",
      catalogRevision: "sha256:catalogue",
      capabilityGeneration: "sha256:capabilities",
    });
    expect(upstreamSelectionSummary(current)).toEqual([
      { label: "Slot", value: "1" },
      { label: "Proves", value: "Adoption rose." },
      { label: "Medium", value: "Chart" },
    ]);
  });

  it("uses native controls and calls the writer only after the separate Confirm action", async () => {
    const documentRef = new FakeDocument();
    const root = new FakeNode("div");
    let confirms = 0;
    let configurations = 0;
    const current = model([
      formats[0],
      {
        ...formats[1],
        enabled: true,
        reason: null,
        repairAction: null,
        deliveryOptions: [
          {
            id: "embed",
            label: "Deploy and receive embed code",
            enabled: false,
            reason: "Cloudflare is not configured.",
            repairAction: "open-readiness",
          },
        ],
      },
    ]);
    const chooser = createAlaCarteChooser({
      documentRef: documentRef as any,
      root: root as any,
      onConfigure() {
        configurations += 1;
      },
      async onConfirm() {
        confirms += 1;
        return { ...current, phase: "production", gate: null, choices: [] };
      },
    });
    chooser.render(current);
    expect(find(root, (node) => node.tagName === "select")).toBeTruthy();
    expect(find(root, (node) => node.type === "radio")).toBeTruthy();
    await find(root, (node) =>
      node.textContent.startsWith("Open Readiness for optional"),
    ).click();
    expect(configurations).toBe(1);
    expect(confirms).toBe(0);

    let radio = find(
      root,
      (node) => node.type === "radio" && node.value === "format.static",
    );
    await radio.dispatch("change");
    await find(root, (node) => node.textContent === "Cancel").click();
    expect(confirms).toBe(0);

    radio = find(
      root,
      (node) => node.type === "radio" && node.value === "format.static",
    );
    await radio.dispatch("change");
    await find(
      root,
      (node) => node.textContent === "Confirm Static image",
    ).click();
    expect(confirms).toBe(1);
    expect(root.textContent).not.toContain("candidate");
  });
});

describe("public readiness to selection capability adapter", () => {
  it("accepts saved-unverified capabilities honestly and changes generation with public state", () => {
    const base = {
      runtime: { status: "ready" },
      readiness: { ready: true },
      newsroom: {
        decision: "complete",
        cloudflareAccountId: "0123456789abcdef0123456789abcdef",
      },
      credentials: [
        { id: "MAPTILER_KEY", state: "ready", generation: 2 },
        {
          id: "MAPTILER_DELIVERY_KEY",
          state: "saved-unverified",
          generation: 3,
        },
        { id: "DATAWRAPPER_TOKEN", state: "not-saved", generation: 0 },
        {
          id: "CLOUDFLARE_API_TOKEN",
          state: "partially-verified",
          generation: 4,
          validation: {
            evidence: {
              cloudflareAccountId: "0123456789abcdef0123456789abcdef",
            },
          },
        },
      ],
    };
    const first = capabilitySnapshotFromStatus(base);
    expect(first.available).toEqual(["map", "map-delivery", "hosted-embed"]);
    expect(first.reasons.datawrapper).toContain("Datawrapper");
    expect(first.generation).toMatch(/^sha256:[0-9a-f]{64}$/);

    // A receipt validated against a DIFFERENT account than the current newsroom profile closes
    // hosted delivery until the token is revalidated against the recorded account.
    const mismatched = capabilitySnapshotFromStatus({
      ...base,
      newsroom: {
        decision: "complete",
        cloudflareAccountId: "ffffffffffffffffffffffffffffffff",
      },
    });
    expect(mismatched.available).toEqual(["map", "map-delivery"]);
    expect(mismatched.generation).not.toBe(first.generation);

    // An unanswered newsroom leaves no current account to match against.
    const unanswered = capabilitySnapshotFromStatus({
      ...base,
      newsroom: { decision: "missing", cloudflareAccountId: null },
    });
    expect(unanswered.available).toEqual(["map", "map-delivery"]);
    expect(unanswered.generation).not.toBe(first.generation);

    // Datawrapper opening still moves the generation.
    const changed = capabilitySnapshotFromStatus({
      ...base,
      credentials: base.credentials.map((row) =>
        row.id === "DATAWRAPPER_TOKEN"
          ? { ...row, state: "ready", generation: 1 }
          : row,
      ),
    });
    expect(changed.available).toContain("datawrapper");
    expect(changed.generation).not.toBe(first.generation);
  });
});
