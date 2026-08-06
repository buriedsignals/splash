// client.ts — the browser side of the setup page. DOM only: it renders a model the server
// already decided and posts back what the journalist typed. Every judgement (what to ask for,
// what is secret, what is ready) was made in model.ts and is tested there — nothing here decides
// anything a test could not see.
//
// It is bundled by Bun at request time (no build step, no CDN, no dependency), which is what
// lets it be typed TypeScript instead of a string of JavaScript inside an HTML template.
import {
  CONTENT_LANGUAGES,
  MODEL_SCRIPT_ID,
  pageCopy,
  type PageCopy,
} from "./copy.ts";
import { groupEnginesByWant } from "./group-by-want.ts";
import type { PreflightCapability, PreflightModel } from "./model.ts";
import { statusView } from "./status-view.ts";
import type { VerifyOutcome } from "../../lib/newsroom/verify.ts";
// Type-only: charter-endpoint.ts's own imports reach lib/newsroom/charter.ts, and this file is
// bundled for the browser. A value import here would pull that module graph into the bundle;
// `import type` is erased at compile time, so only the shape crosses the boundary.
import type { CharterReadout } from "./charter-endpoint.ts";

type FormState = {
  uiLang: string;
  contentLang: string;
  runtime: string;
  login: string;
  credentials: Record<string, string>;
  enabled: Set<string>;
  publisher: string;
  newsroom: {
    name: string;
    url: string;
    color: string;
    /** "light" | "dark" | "#rrggbb" | "" — NEWSROOM-PROFILE.md's `theme:`. */
    theme: string;
    /** Measured but not (yet) a frontmatter field — typefaces, extractor caveats. Verbatim. */
    notes: string[];
  };
  /** Live verdicts from the last check, per capability id. */
  verified: Record<string, VerifyOutcome>;
};

/** The state of the "read my site" action — a measurement, never a decision (see charter.ts). */
type CharterState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; readout: CharterReadout }
  | { status: "error"; message: string };

let charter: CharterState = { status: "idle" };

const model: PreflightModel = JSON.parse(
  document.getElementById(MODEL_SCRIPT_ID)!.textContent!,
);

const form: FormState = {
  uiLang: model.language.ui,
  contentLang: model.language.content,
  runtime: model.runtime,
  login: "",
  credentials: {},
  enabled: new Set(
    [...model.engines, ...model.delivery]
      .filter((c) => c.enabled)
      .map((c) => c.id),
  ),
  publisher: model.publisher ?? "zip",
  newsroom: {
    name: model.profile?.name ?? "",
    url: model.profile?.url ?? "",
    color: model.profile?.palette?.[0] ?? "#0072b2",
    theme: model.profile?.theme ?? "",
    notes: [],
  },
  verified: {},
};

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  for (const c of children)
    node.append(typeof c === "string" ? document.createTextNode(c) : c);
  return node;
}

function section(id: string): {
  name: HTMLElement;
  hint: HTMLElement;
  body: HTMLElement;
} {
  const root = document.getElementById(`section-${id}`)!;
  return {
    name: root.querySelector(".step-name")!,
    hint: root.querySelector(".hint")!,
    body: root.querySelector(".body")!,
  };
}

function pill(
  status: PreflightCapability["status"],
  lang: string,
): HTMLElement {
  const view = statusView(status, lang);
  return el(
    "span",
    { class: `pill pill-${view.tone}` },
    el("span", { class: "pill-glyph", "aria-hidden": "true" }, view.glyph),
    view.label,
  );
}

/**
 * Turn the registry's help sentence into prose with a real link. The help strings end with a
 * URL ("create a free key at https://…"), which is the one bit of markup worth making live: the
 * point of the page is that a missing key is one click from being obtained.
 */
function helpText(text: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const parts = text.split(/(https?:\/\/[^\s)]+)/g);
  for (const part of parts) {
    if (/^https?:\/\//.test(part)) {
      fragment.append(
        el(
          "a",
          // noopener as well as noreferrer: a new tab that keeps a handle on this page could
          // navigate it away mid-setup, and this page holds the keys the journalist just typed.
          { href: part, target: "_blank", rel: "noreferrer noopener" },
          part,
        ),
      );
    } else if (part) {
      fragment.append(document.createTextNode(part));
    }
  }
  return fragment;
}

function fieldControl(name: string, copy: PageCopy): HTMLElement | null {
  const field = model.fields.find((f) => f.name === name);
  if (!field) return null;
  const inputId = `field-${name}`;
  const wrapper = el("div", { class: "field" });
  wrapper.append(el("label", { for: inputId }, field.label));
  if (field.help)
    wrapper.append(
      el(
        "p",
        { class: "field-help", id: `${inputId}-help` },
        helpText(field.help),
      ),
    );

  const input = el("input", {
    id: inputId,
    type: field.secret ? "password" : "text",
    autocomplete: "off",
    spellcheck: "false",
    ...(field.help ? { "aria-describedby": `${inputId}-help` } : {}),
    ...(field.configured
      ? { placeholder: `${copy.configured} — ${copy.configuredHint}` }
      : {}),
  });
  input.value = form.credentials[name] ?? "";
  input.addEventListener("input", () => {
    form.credentials[name] = input.value;
  });
  wrapper.append(input);

  // The env var name is a debugging aid, never the label (issue #5).
  wrapper.append(
    el(
      "details",
      { class: "tech" },
      el("summary", {}, copy.technicalDetail),
      el(
        "code",
        {},
        `${field.destination === "env" ? ".env" : "newsroom.json"} · ${field.name}`,
      ),
    ),
  );
  return wrapper;
}

function capabilityRow(
  capability: PreflightCapability,
  copy: PageCopy,
  kind: "checkbox" | "radio",
): HTMLElement {
  const row = el("div", {
    class: `capability${capability.available ? "" : " unavailable"}`,
    id: `capability-${capability.id}`,
  });
  const head = el("div", { class: "capability-head" });
  const inputId = `enable-${capability.id}`;
  const input = el("input", {
    id: inputId,
    type: kind,
    ...(kind === "radio" ? { name: "publisher" } : {}),
    ...(capability.available ? {} : { disabled: "disabled" }),
  }) as HTMLInputElement;
  input.checked =
    kind === "radio"
      ? form.publisher === capability.id
      : form.enabled.has(capability.id);

  const label = el("label", { for: inputId });
  // The row's OWN caption when the registry gives it one (an engine, under its want heading) —
  // every other reader of a capability's name wants `label` instead (readiness.ts, the blocker
  // line below, skills/splash's ENGINE_LABELS): reusing a caption there is what broke those
  // sentences (fix round 1, Finding 1).
  label.append(input, capability.choice ?? capability.label);
  head.append(label);
  const status = el("span", { class: "spacer" });
  head.append(status);
  row.append(head);

  // A capability the newsroom did not tick carries NO pill: it is neither ready nor failing, and
  // a column of grey "off" badges buries the two states that actually need reading.
  const paintStatus = (): void => {
    if (!capability.available) {
      status.replaceChildren(
        el("span", { class: "pill pill-off" }, copy.unavailable),
      );
      return;
    }
    const current = liveStatus(capability);
    status.replaceChildren(
      ...(current === "disabled" ? [] : [pill(current, form.uiLang)]),
    );
  };
  paintStatus();

  const fields = el("div", { class: "capability-fields" });
  for (const name of capability.fields) {
    const field = model.fields.find((f) => f.name === name);
    if (!field) continue;
    // A production key (`upfront`) is asked once, above every want group — never nested under a
    // tick, whichever capability owns it first, so it is never doubled and never gated on a tick.
    if (field.upfront || field.capabilities[0] !== capability.id) {
      fields.append(
        el(
          "p",
          { class: "shared-note" },
          `${field.label} — ${copy.askedOnceAbove}`,
        ),
      );
      continue;
    }
    const control = fieldControl(name, copy);
    if (control) fields.append(control);
  }
  if (capability.fields.length) {
    fields.hidden = !input.checked;
    row.append(fields);
  }

  input.addEventListener("change", () => {
    if (kind === "radio") {
      // Choosing where to publish IS enabling it: a publisher recorded as disabled would be
      // reported as neither ready nor blocking, and would never be checked.
      form.publisher = capability.id;
      form.enabled.add(capability.id);
      render();
      return;
    }
    if (input.checked) form.enabled.add(capability.id);
    else form.enabled.delete(capability.id);
    fields.hidden = !input.checked;
    // The pill is the answer to the tick that just happened — repainting only the summary left
    // a freshly enabled capability showing the status it had before anyone touched it.
    paintStatus();
    renderReadiness(pageCopy(form.uiLang));
  });
  return row;
}

/** The status to show: what the last live check said, else what the server computed. */
function liveStatus(
  capability: PreflightCapability,
): PreflightCapability["status"] {
  if (!form.enabled.has(capability.id)) return "disabled";
  const verdict = form.verified[capability.id];
  if (verdict === "ok") return "ready";
  if (verdict === "rejected") return "missing";
  if (verdict === "unreachable") return "unverified";
  // `statusIfEnabled`, not `status`: the saved state may have this capability off, and the
  // journalist just turned it on. The server computed both answers precisely so this line does
  // not have to re-derive readiness in the browser.
  return capability.statusIfEnabled;
}

function textField(
  id: string,
  label: string,
  value: string,
  onInput: (v: string) => void,
  type = "text",
): HTMLElement {
  const wrapper = el("div", { class: "field" });
  wrapper.append(el("label", { for: id }, label));
  const input = el("input", { id, type, autocomplete: "off" });
  input.value = value;
  input.addEventListener("input", () => onInput(input.value));
  wrapper.append(input);
  return wrapper;
}

/**
 * The newsroom section: editable fields, prefilled from an existing profile when there is one,
 * and fillable by measuring the site. A measurement is never a decision (skills/newsroom-charter)
 * — every value it fills in stays editable, and its receipt is shown right beside it so the
 * journalist can tell where it came from and disagree with it.
 */
function renderNewsroom(copy: PageCopy): void {
  const { name, hint, body } = section("newsroom");
  name.textContent = copy.newsroomTitle;
  hint.textContent = copy.newsroomHint;
  body.replaceChildren();

  if (model.profileExists)
    body.append(el("p", { class: "shared-note" }, copy.profileOwned));

  body.append(
    textField("newsroom-name", copy.newsroomName, form.newsroom.name, (v) => {
      form.newsroom.name = v;
    }),
  );
  body.append(
    textField(
      "newsroom-url",
      copy.newsroomUrl,
      form.newsroom.url,
      (v) => {
        form.newsroom.url = v;
      },
      "url",
    ),
  );

  // "Read my site": the one action that turns the address just typed above into a measurement.
  const measureField = el("div", { class: "field" });
  const measureBtn = el(
    "button",
    { type: "button", id: "newsroom-measure", class: "btn" },
    charter.status === "loading" ? copy.measuring : copy.measureAction,
  ) as HTMLButtonElement;
  measureBtn.disabled = charter.status === "loading";
  measureBtn.addEventListener("click", () => void measureSite(copy));
  measureField.append(measureBtn);
  if (charter.status === "error")
    measureField.append(el("p", { class: "field-help" }, charter.message));
  body.append(measureField);

  const palette = charter.status === "done" ? charter.readout.palette : [];

  // House colour — the primary field. Ranked candidates from a measurement are offered as
  // swatches to pick from; the colour input underneath always reflects whichever is current, and
  // stays open to any hex the journalist wants to type or pick instead.
  const colourField = el("div", { class: "field" });
  colourField.append(
    el("label", { for: "newsroom-color" }, copy.newsroomColor),
  );
  if (charter.status === "done" && palette.length === 0) {
    colourField.append(
      el("p", { class: "field-help" }, copy.siteDeclaresNothing),
    );
    for (const note of charter.readout.notes)
      colourField.append(el("p", { class: "charter-receipt" }, note));
  }
  if (palette.length) {
    const swatches = el("div", { class: "charter-candidates" });
    for (const candidate of palette) {
      const swatchBtn = el("button", {
        type: "button",
        class: "swatch swatch-btn",
        title: candidate.hex,
      }) as HTMLButtonElement;
      swatchBtn.style.background = candidate.hex;
      swatchBtn.addEventListener("click", () => {
        form.newsroom.color = candidate.hex;
        renderNewsroom(copy);
      });
      swatches.append(swatchBtn);
    }
    colourField.append(swatches);
  }
  const colourInput = el("input", {
    id: "newsroom-color",
    type: "color",
  }) as HTMLInputElement;
  colourInput.value = form.newsroom.color;
  colourInput.addEventListener("input", () => {
    form.newsroom.color = colourInput.value;
    renderNewsroom(copy); // may reveal/hide the matching candidate's receipt below
  });
  colourField.append(colourInput);
  const chosenCandidate = palette.find(
    (c) => c.hex.toLowerCase() === form.newsroom.color.toLowerCase(),
  );
  if (chosenCandidate)
    colourField.append(
      el(
        "p",
        { class: "charter-receipt" },
        chosenCandidate.confidence === "inferred"
          ? `${chosenCandidate.receipt} ${copy.charterInferred}`
          : chosenCandidate.receipt,
      ),
    );
  body.append(colourField);

  // House ground — a word ("light"/"dark") or a #rrggbb, exactly what NEWSROOM-PROFILE.md's
  // `theme:` accepts. A plain text field: the extractor may measure none at all.
  const groundField = el("div", { class: "field" });
  groundField.append(
    el("label", { for: "newsroom-ground" }, copy.profileGround),
  );
  const groundInput = el("input", {
    id: "newsroom-ground",
    type: "text",
    autocomplete: "off",
  }) as HTMLInputElement;
  groundInput.value = form.newsroom.theme;
  groundInput.addEventListener("input", () => {
    form.newsroom.theme = groundInput.value;
    renderNewsroom(copy);
  });
  groundField.append(groundInput);
  if (
    charter.status === "done" &&
    charter.readout.ground &&
    charter.readout.ground.value.toLowerCase() ===
      form.newsroom.theme.toLowerCase()
  )
    groundField.append(
      el("p", { class: "charter-receipt" }, charter.readout.ground.receipt),
    );
  body.append(groundField);

  // Publication language — a profile field (Task 4 removed the section that re-asked it in a
  // second vocabulary; CONTENT_LANGUAGES is the same list, so "fr" reads as "Français" here too).
  const langField = el("div", { class: "field" });
  langField.append(el("label", { for: "newsroom-lang" }, copy.languageContent));
  const langSelect = el("select", {
    id: "newsroom-lang",
  }) as HTMLSelectElement;
  for (const option of CONTENT_LANGUAGES)
    langSelect.append(el("option", { value: option.id }, option.label));
  langSelect.value = form.contentLang;
  langSelect.addEventListener("change", () => {
    form.contentLang = langSelect.value;
  });
  langField.append(langSelect);
  body.append(langField);
}

/**
 * Read the address just typed into the newsroom section, over `/charter`, and prefill the
 * fields above with what it found. Total on the client's side too: a network failure or a `/charter`
 * `{ error }` answer both render as a plain sentence, never a thrown exception — matching
 * `measureSite` on the server, which never throws either.
 */
async function measureSite(copy: PageCopy): Promise<void> {
  const url = form.newsroom.url.trim();
  if (!url) {
    charter = { status: "error", message: copy.measureNeedsUrl };
    renderNewsroom(copy);
    return;
  }
  charter = { status: "loading" };
  renderNewsroom(copy);
  try {
    const response = await fetch("/charter", {
      method: "POST",
      body: JSON.stringify({ url }),
    });
    const data = (await response.json()) as CharterReadout | { error: string };
    if ("error" in data) {
      charter = { status: "error", message: data.error };
      renderNewsroom(copy);
      return;
    }
    charter = { status: "done", readout: data };
    // Prefill only — never raise the confidence the extractor states, never invent a value it did
    // not return. Every field this touches remains editable afterwards.
    const top = data.palette[0];
    if (top) form.newsroom.color = top.hex;
    if (data.ground) form.newsroom.theme = data.ground.value;
    // The measured typefaces have no frontmatter field of their own (no engine applies them yet)
    // — they, and the extractor's own caveats, go into `notes`: prose `profileMarkdown` appends
    // to the body on a FRESH profile, never a frontmatter key (spec 2026-08-06 §3.1).
    form.newsroom.notes = [
      ...data.notes,
      ...data.typefaces.map((t) => `${t.role}: ${t.family} — ${t.receipt}`),
    ];
    renderNewsroom(copy);
  } catch {
    charter = { status: "error", message: copy.measureFailed };
    renderNewsroom(copy);
  }
}

function renderAssistant(copy: PageCopy): void {
  const { name, hint, body } = section("assistant");
  name.textContent = copy.assistantTitle;
  hint.textContent = copy.assistantHint;
  body.replaceChildren();
  const group = el("div", { class: "field" });
  for (const runtime of model.runtimes) {
    const row = el("div", { class: "capability-head" });
    const id = `runtime-${runtime.id}`;
    const input = el("input", {
      id,
      type: "radio",
      name: "runtime",
      // `selectable`, not `verified`: a runtime can be verified (proof or decision) and still have
      // no module for THIS platform — goose-desktop/claude-desktop ship no .ps1, so Windows must
      // never offer them (I1: the install used to die at bootstrap.ps1's dispatch after the keys
      // were typed and everything else installed).
      ...(runtime.selectable ? {} : { disabled: "disabled" }),
    }) as HTMLInputElement;
    input.checked = form.runtime === runtime.id;
    input.addEventListener("change", () => {
      form.runtime = runtime.id;
      form.login = "";
      renderAssistant(copy);
    });
    const label = el("label", { for: id });
    label.append(input, runtime.label);
    row.append(label);
    group.append(row);
  }
  body.append(group);

  // Every runtime's login carries its OWN `configured` flag (Finding 1 fix): a key configured
  // for a runtime in an earlier session must read as configured the instant that runtime is
  // picked again, even though the page was served with a different runtime selected.
  const login = model.runtimes.find((r) => r.id === form.runtime)?.login;
  if (!login) return; // this runtime owns its own sign-in — nothing to ask
  const field = el("div", { class: "field" });
  field.append(el("label", { for: "login" }, login.label));
  field.append(
    el(
      "p",
      { class: "field-help", id: "login-help" },
      login.optional ? copy.loginOptionalHint : login.help,
    ),
  );
  const key = el("input", {
    id: "login",
    type: "password",
    autocomplete: "off",
    "aria-describedby": "login-help",
    ...(login.configured
      ? { placeholder: `${copy.configured} — ${copy.configuredHint}` }
      : {}),
  });
  key.value = form.login;
  key.addEventListener("input", () => {
    form.login = key.value;
  });
  field.append(key);
  body.append(field);
}

function renderCapabilities(copy: PageCopy): void {
  const engines = section("capabilities");
  engines.name.textContent = copy.capabilitiesTitle;
  engines.hint.textContent = copy.capabilitiesHint;
  const blocks: HTMLElement[] = [];

  // Production keys (`upfront`) sit ABOVE every want group, asked outright — a newsroom should
  // not have to tick a box to be allowed to hand over a token it already has (model.ts's
  // `upfront`, derived from the registry). Publication destinations stay under their own tick,
  // below, unchanged.
  const upfrontFields = model.fields.filter((f) => f.upfront);
  if (upfrontFields.length) {
    const block = el("div", { class: "want production-keys" });
    block.append(el("h3", { class: "want-title" }, copy.productionKeysTitle));
    for (const field of upfrontFields) {
      const control = fieldControl(field.name, copy);
      if (control) block.append(control);
    }
    blocks.push(block);
  }

  // The want leads, the tool underneath stays its own choosable checkbox (the project owner's
  // explicit "do not collapse the two engines of a want into one"). The grouping itself is
  // group-by-want.ts's groupEnginesByWant (pure, tested there — client.ts has no DOM test
  // harness); this only turns its result into DOM nodes. It lives in its own file rather than
  // model.ts because this IS a value import (unlike the type-only ones above), and model.ts's
  // module graph is server-only (readiness.ts's node:url) — pulling it in breaks the browser
  // bundle Bun.build produces for this file.
  for (const { want, capabilities } of groupEnginesByWant(model.engines)) {
    const block = el("div", { class: "want" });
    // `want` is undefined only for a capability the registry never assigns one — no engine does
    // (capabilities.test.ts's "every engine declares the want it serves"). Kept defensive rather
    // than asserted: PreflightCapability#want is optional by type, and a malformed model must
    // still render its rows instead of throwing on a wantless heading.
    if (want)
      block.append(el("h3", { class: "want-title" }, copy.wants[want] ?? want));
    for (const c of capabilities)
      block.append(capabilityRow(c, copy, "checkbox"));
    blocks.push(block);
  }
  engines.body.replaceChildren(...blocks);

  const publishing = section("publishing");
  publishing.name.textContent = copy.publishingTitle;
  publishing.hint.textContent = copy.publishingHint;
  publishing.body.replaceChildren(
    ...model.delivery.map((c) => capabilityRow(c, copy, "radio")),
  );
}

function renderReadiness(copy: PageCopy): void {
  const { name, hint, body } = section("readiness");
  name.textContent = copy.readinessTitle;
  hint.textContent = copy.readinessHint;

  const live = [...model.engines, ...model.delivery].map((c) => ({
    capability: c,
    status: liveStatus(c),
  }));
  const blocking = live.filter((l) => l.status === "missing");
  body.replaceChildren();
  if (!blocking.length) {
    body.append(el("p", { class: "all-clear" }, copy.nothingBlocking));
  } else {
    for (const { capability, status } of blocking) {
      const row = el("div", { class: "blocker" });
      row.append(pill(status, form.uiLang));
      const text = el("div", { class: "blocker-body" });
      // Journalist vocabulary first: the FIELDS that are missing, by their own labels. The env
      // var names live in each field's "technical detail" — putting them in the summary is the
      // habit issue #5 objects to. A blocker with no missing field (an uninstalled dependency)
      // keeps readiness's sentence, which is the only thing that explains it.
      const missing = capability.missingFields
        .map((n) => model.fields.find((f) => f.name === n)?.label)
        .filter((l): l is string => Boolean(l));
      // A live verdict OVERRIDES the saved reason. Without this, a key that the provider just
      // rejected showed whatever the state believed a moment ago — a bare label when it thought
      // the capability was fine, or a stale "could not be reached" from an older check.
      // Order matters: a capability with NO key at all is "still needs X", not "the provider
      // refused it" — a blank credential is reported as rejected without a request ever being
      // made, and telling a journalist their empty field was refused sends them hunting for a
      // problem with a key they never entered.
      const verdict = missing.length ? undefined : form.verified[capability.id];
      const explanation = missing.length
        ? `${capability.label} — ${copy.needs} ${missing.join(", ")}`
        : verdict === "rejected"
          ? `${capability.label} — ${copy.rejectedByProvider}`
          : verdict === "unreachable"
            ? `${capability.label} — ${copy.unreachableProvider}`
            : capability.reason || capability.label;
      text.append(el("p", {}, explanation));
      for (const name of capability.missingFields) {
        const help = model.fields.find((f) => f.name === name)?.help;
        if (help)
          text.append(el("p", { class: "blocker-help" }, helpText(help)));
      }
      row.append(text);
      body.append(row);
    }
  }

  const counts = {
    ready: live.filter((l) => l.status === "ready").length,
    missing: blocking.length,
    degraded: live.filter((l) => l.status === "unverified").length,
  };
  // A zero count gets no pill: "0 missing" in the missing colour reads, at a glance, as a
  // warning about nothing. The ready count always shows, because zero ready IS worth seeing.
  const summary = document.getElementById("summary")!;
  summary.replaceChildren(
    el(
      "span",
      { class: "pill pill-ready" },
      `${counts.ready} ${copy.summaryReady}`,
    ),
    ...(counts.missing
      ? [
          el(
            "span",
            { class: "pill pill-missing" },
            `${counts.missing} ${copy.summaryMissing}`,
          ),
        ]
      : []),
    ...(counts.degraded
      ? [
          el(
            "span",
            { class: "pill pill-degraded" },
            `${counts.degraded} ${copy.summaryDegraded}`,
          ),
        ]
      : []),
  );
}

function render(): void {
  const copy = pageCopy(form.uiLang);
  document.documentElement.lang = form.uiLang;
  document.getElementById("page-title")!.textContent = copy.title;
  document.getElementById("page-lede")!.textContent = copy.lede;
  document.getElementById("privacy")!.textContent = copy.privacy;
  (document.getElementById("check") as HTMLButtonElement).textContent =
    copy.check;
  (document.getElementById("save") as HTMLButtonElement).textContent =
    copy.save;
  renderNewsroom(copy);
  renderAssistant(copy);
  renderCapabilities(copy);
  renderReadiness(copy);
  if (model.focus) {
    const target = document.getElementById(`capability-${model.focus}`);
    const card =
      target?.closest(".card") ??
      document.getElementById(`section-${model.focus}`);
    card?.classList.add("focused");
    card?.scrollIntoView({ block: "start" });
  }
}

function payload() {
  return {
    runtime: form.runtime,
    uiLang: form.uiLang,
    contentLang: form.contentLang,
    login: form.login,
    credentials: form.credentials,
    enabled: [...form.enabled],
    publisher: form.publisher,
    verified: form.verified,
    // Sent on every submission now, edit or first creation alike (Task 3, 2026-08-06) — the
    // section is editable either way, and `sub.newsroom` being present IS the human gesture
    // `persist()` gates the write on (server.ts). `contentLang` above carries the language;
    // `updateProfileMarkdown`/`profileMarkdown` leave `theme`/`notes` out when they are unset.
    newsroom: {
      name: form.newsroom.name,
      url: form.newsroom.url,
      color: form.newsroom.color,
      ...(form.newsroom.theme ? { theme: form.newsroom.theme } : {}),
      ...(form.newsroom.notes.length ? { notes: form.newsroom.notes } : {}),
    },
  };
}

async function check(): Promise<void> {
  const copy = pageCopy(form.uiLang);
  const button = document.getElementById("check") as HTMLButtonElement;
  button.disabled = true;
  button.textContent = copy.checking;
  try {
    const response = await fetch("/verify", {
      method: "POST",
      body: JSON.stringify(payload()),
    });
    form.verified = (await response.json()) as Record<string, VerifyOutcome>;
    render();
  } finally {
    button.disabled = false;
    button.textContent = copy.check;
  }
}

async function save(event: Event): Promise<void> {
  event.preventDefault();
  const copy = pageCopy(form.uiLang);
  const stillMissing = [...model.engines, ...model.delivery].some(
    (c) => liveStatus(c) === "missing",
  );
  if (stillMissing && !confirm(copy.blankRequired)) return;

  const button = document.getElementById("save") as HTMLButtonElement;
  button.disabled = true;
  button.textContent = copy.saving;
  const response = await fetch("/submit", {
    method: "POST",
    body: JSON.stringify(payload()),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    button.disabled = false;
    button.textContent = copy.save;
    alert(`${copy.saveFailed}${detail ? `: ${detail}` : ""}`);
    return;
  }
  const panel = el("div", { class: "page saved-panel" });
  panel.append(
    el("h1", {}, `${copy.saved} ✓`),
    el("p", { class: "lede" }, copy.savedHint),
  );
  document.body.replaceChildren(panel);
}

document.getElementById("check")!.addEventListener("click", () => void check());
document
  .getElementById("preflight")!
  .addEventListener("submit", (e) => void save(e));
render();
