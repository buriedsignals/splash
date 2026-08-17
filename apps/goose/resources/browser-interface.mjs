const statusNode = document.querySelector("#status");
const storyNode = document.querySelector("#story");
const controlsNode = document.querySelector("#controls");
const choicesNode = document.querySelector("#choices");
const reviewNode = document.querySelector("#review");
const titleNode = document.querySelector("#title");
const ledeNode = document.querySelector("#lede");
const modeNode = document.querySelector("#mode-label");

let mode = "";
let payload = null;
let selected = null;
let search = "";
let interactionState = "idle";

function announce(message, error = false) {
  statusNode.textContent = message;
  statusNode.classList.toggle("error", error);
  statusNode.focus();
}

async function api(path, body = {}) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.message ?? "Splash refused the request."), { result });
  return result;
}

function svgElement(id) {
  const key = String(id).toLowerCase();
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 240 120");
  svg.setAttribute("aria-hidden", "true");
  const paths = key.includes("slope") || key.includes("line")
    ? [["polyline", "20,92 70,72 120,80 170,34 220,22"], ["polyline", "20,28 70,42 120,48 170,70 220,82"]]
    : key.includes("bar") || key.includes("column") || key.includes("waterfall")
      ? [["rect", "22,55,28,45"], ["rect", "62,34,28,66"], ["rect", "102,68,28,32"], ["rect", "142,20,28,80"], ["rect", "182,44,28,56"]]
      : key.includes("scatter") || key.includes("swarm") || key.includes("dot")
        ? [["circle", "38,83,5"], ["circle", "65,72,6"], ["circle", "93,76,4"], ["circle", "121,49,6"], ["circle", "151,57,5"], ["circle", "181,31,7"], ["circle", "207,23,4"]]
        : key.includes("pie") || key.includes("donut") || key.includes("radar")
          ? [["circle", "120,60,42"], ["path", "M120 60 L120 18 A42 42 0 0 1 158 78 Z"]]
          : key.includes("heat") || key.includes("calendar")
            ? Array.from({ length: 15 }, (_, index) => ["rect", `${38 + (index % 5) * 34},${25 + Math.floor(index / 5) * 28},24,18`])
            : [["path", "M20 92 C55 18 88 104 120 48 S186 20 220 72"], ["line", "20,100,220,100"]];
  for (const [kind, points] of paths) {
    const node = document.createElementNS(svg.namespaceURI, kind);
    if (kind === "polyline") {
      node.setAttribute("points", points);
      node.setAttribute("fill", "none");
      node.setAttribute("stroke", node.previousSibling ? "#72a6a6" : "#d4a853");
      node.setAttribute("stroke-width", "5");
    } else if (kind === "rect") {
      const [x, y, width, height] = points.split(",");
      Object.entries({ x, y, width, height, rx: "3" }).forEach(([name, value]) => node.setAttribute(name, value));
      node.setAttribute("fill", Number(x) % 3 ? "#72a6a6" : "#d4a853");
    } else if (kind === "circle") {
      const [cx, cy, r] = points.split(",");
      Object.entries({ cx, cy, r }).forEach(([name, value]) => node.setAttribute(name, value));
      node.setAttribute("fill", kind === "circle" && paths.length === 2 ? "none" : "#d4a853");
      node.setAttribute("stroke", "#d4a853");
      node.setAttribute("stroke-width", "5");
    } else if (kind === "line") {
      const [x1, y1, x2, y2] = points.split(",");
      Object.entries({ x1, y1, x2, y2 }).forEach(([name, value]) => node.setAttribute(name, value));
      node.setAttribute("stroke", "#667178");
      node.setAttribute("stroke-width", "2");
    } else {
      node.setAttribute("d", points);
      node.setAttribute("fill", paths.length === 2 ? "#d4a853" : "none");
      node.setAttribute("stroke", paths.length === 2 ? "#d4a853" : "#d4a853");
      node.setAttribute("stroke-width", "5");
    }
    svg.append(node);
  }
  return svg;
}

function revisions(selection) {
  return {
    storyRevision: selection.revisions.story,
    catalogRevision: selection.revisions.catalogue,
    capabilityGeneration: selection.revisions.capabilities,
  };
}

function currentRows() {
  const selection = mode === "storyboard" ? payload.selection : payload;
  const enabled = new Map(selection.choices.filter((row) => row.enabled).map((row) => [row.id, row]));
  if (mode === "storyboard") {
    return payload.recommendation.ranking.map((rank) => ({
      ...enabled.get(rank.optionId),
      advice: rank,
      recommended: rank.optionId === payload.recommendation.recommendedOptionId,
    })).filter((row) => row.id);
  }
  return [...enabled.values()].filter((row) => `${row.label} ${row.description ?? ""}`.toLowerCase().includes(search.toLowerCase()));
}

function evidenceFor(row) {
  const evidence = row.advice?.matchedEvidence?.slice(0, 2) ?? [];
  return evidence.map((item) => item.fact).join(" · ");
}

function renderReview() {
  reviewNode.replaceChildren();
  if (!selected) {
    reviewNode.hidden = true;
    return;
  }
  reviewNode.hidden = false;
  const copy = document.createElement("p");
  copy.textContent = `Selected: ${selected.label}`;
  const actions = document.createElement("div");
  actions.className = "review-actions";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "Cancel";
  cancel.disabled = interactionState !== "idle";
  cancel.addEventListener("click", () => {
    if (interactionState !== "idle") return;
    selected = null;
    renderChoices();
  });
  const confirm = document.createElement("button");
  confirm.type = "button";
  confirm.className = "primary";
  confirm.textContent = `Confirm ${selected.label}`;
  confirm.disabled = interactionState !== "idle";
  confirm.addEventListener("click", confirmChoice);
  actions.append(cancel, confirm);
  reviewNode.append(copy, actions);
}

function renderChoices() {
  const rows = currentRows();
  for (const control of controlsNode.querySelectorAll("input, button")) {
    control.disabled = interactionState !== "idle";
  }
  choicesNode.replaceChildren();
  const grid = document.createElement("div");
  grid.className = `choice-grid ${mode === "storyboard" ? "storyboard" : ""}`;
  for (const row of rows) {
    const card = document.createElement("label");
    card.className = "choice-card";
    card.dataset.selected = String(selected?.id === row.id);
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "splash-treatment";
    radio.checked = selected?.id === row.id;
    radio.disabled = interactionState !== "idle";
    radio.addEventListener("change", () => {
      if (interactionState !== "idle") return;
      selected = row;
      renderChoices();
    });
    const preview = document.createElement("span");
    preview.className = "preview";
    preview.append(svgElement(row.id));
    const body = document.createElement("span");
    body.className = "choice-body";
    const heading = document.createElement("span");
    heading.className = "choice-title";
    const label = document.createElement("strong");
    label.textContent = row.label;
    heading.append(label);
    if (mode === "storyboard") {
      const badge = document.createElement("span");
      badge.className = `badge ${row.recommended ? "" : "alternative"}`;
      badge.textContent = row.recommended ? "Recommended" : "Alternative";
      heading.append(badge);
    }
    const description = document.createElement("p");
    description.textContent = row.description ?? row.dataShape?.summary ?? "";
    body.append(heading, description);
    const evidence = evidenceFor(row);
    if (evidence) {
      const line = document.createElement("span");
      line.className = "evidence";
      line.textContent = evidence;
      body.append(line);
    }
    card.append(radio, preview, body);
    grid.append(card);
  }
  choicesNode.append(grid);
  choicesNode.hidden = false;
  if (mode === "a-la-carte") document.querySelector("#result-count").textContent = `${rows.length} treatments`;
  renderReview();
}

async function confirmChoice() {
  if (!selected || interactionState !== "idle") return;
  const submitted = selected;
  const selection = mode === "storyboard" ? payload.selection : payload;
  interactionState = "confirming";
  renderChoices();
  announce(`Confirming ${submitted.label}…`);
  try {
    await api("/api/confirm", {
      optionId: submitted.id,
      expected: revisions(selection),
      ...(mode === "storyboard" ? { recommendationRevision: payload.recommendation.revision } : {}),
    });
    interactionState = "done";
    controlsNode.hidden = true;
    choicesNode.hidden = true;
    reviewNode.hidden = true;
    storyNode.hidden = true;
    const done = document.createElement("section");
    done.className = "done";
    const heading = document.createElement("h2");
    heading.textContent = `${submitted.label} confirmed`;
    const copy = document.createElement("p");
    copy.textContent = "The canonical Splash story has been updated. Goose is continuing from disk. This tab may close automatically; if your browser keeps it open, you can close it.";
    done.append(heading, copy);
    choicesNode.replaceChildren(done);
    choicesNode.hidden = false;
    announce("Treatment saved.");
    setTimeout(() => window.close(), 650);
  } catch (error) {
    interactionState = "idle";
    renderChoices();
    announce(error.message, true);
  }
}

async function loadChoices() {
  payload = await api("/api/model");
  titleNode.textContent = mode === "storyboard" ? "Two ways to tell this story" : "Choose a visual treatment";
  ledeNode.textContent = mode === "storyboard"
    ? "Splash recommends one treatment and keeps one strong alternative visible."
    : "Browse every reachable treatment. Search by chart name or purpose, then confirm one.";
  modeNode.textContent = mode === "storyboard" ? "STORYBOARD" : "À-LA-CARTE";
  if (mode === "a-la-carte") {
    controlsNode.replaceChildren();
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "search";
    input.placeholder = "Search treatments";
    input.setAttribute("aria-label", "Search visual treatments");
    input.disabled = interactionState !== "idle";
    input.addEventListener("input", () => {
      if (interactionState !== "idle") return;
      search = input.value;
      selected = null;
      renderChoices();
    });
    label.append(input);
    const count = document.createElement("span");
    count.id = "result-count";
    count.className = "count";
    controlsNode.append(label, count);
    controlsNode.hidden = false;
  }
  renderChoices();
  announce("Choose one treatment.");
}

async function start() {
  const capability = location.hash.slice(1);
  history.replaceState(null, "", location.pathname);
  if (!capability) throw new Error("This Splash interface link has expired.");
  const opened = await api("/session", { capability });
  mode = opened.mode;
  modeNode.textContent = mode === "storyboard" ? "STORYBOARD" : "À-LA-CARTE";
  titleNode.textContent = "Confirm this story";
  ledeNode.textContent = "Splash will read and update only this Engine-inspected story directory.";
  const pending = await api("/api/pending");
  const card = document.createElement("div");
  card.className = "story-card";
  const heading = document.createElement("h2");
  heading.id = "story-title";
  heading.textContent = pending.descriptor.storyId;
  const path = document.createElement("p");
  path.className = "story-path";
  path.textContent = pending.descriptor.canonicalPath;
  const confirm = document.createElement("button");
  confirm.type = "button";
  confirm.className = "primary";
  confirm.textContent = "Use this story";
  confirm.addEventListener("click", async () => {
    confirm.disabled = true;
    try {
      await api("/api/story/confirm", { challenge: pending.challenge });
      storyNode.hidden = true;
      await loadChoices();
    } catch (error) {
      confirm.disabled = false;
      announce(error.message, true);
    }
  });
  card.append(heading, path, confirm);
  storyNode.replaceChildren(card);
  storyNode.hidden = false;
  announce("Confirm the exact story location.");
}

start().catch((error) => announce(error.message, true));

window.addEventListener("pagehide", () => {
  navigator.sendBeacon("/api/close", new Blob(["{}"], { type: "application/json" }));
});
