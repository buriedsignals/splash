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
  UI_LANGUAGES,
  type LanguageOption,
  type PageCopy,
} from "./copy.ts";
import type { PreflightCapability, PreflightModel } from "./model.ts";
import { statusView } from "./status-view.ts";
import type { VerifyOutcome } from "../../lib/newsroom/verify.ts";

type FormState = {
  uiLang: string;
  contentLang: string;
  runtime: string;
  login: string;
  credentials: Record<string, string>;
  enabled: Set<string>;
  publisher: string;
  newsroom: { name: string; url: string; color: string };
  /** Live verdicts from the last check, per capability id. */
  verified: Record<string, VerifyOutcome>;
};

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
  newsroom: { name: "", url: "", color: "#0072b2" },
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
  label.append(input, capability.label);
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
    if (field.capabilities[0] !== capability.id) {
      fields.append(
        el(
          "p",
          { class: "shared-note" },
          `${field.label} — asked once, above.`,
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

function languageSelect(
  id: string,
  label: string,
  value: string,
  disabled: boolean,
  // The two selectors do NOT offer the same list: the page can only be READ in the languages
  // it has copy for, while a newsroom may PUBLISH in any of them (copy.ts).
  options: LanguageOption[],
  onChange: (v: string) => void,
): HTMLElement {
  const wrapper = el("div", { class: "field" });
  wrapper.append(el("label", { for: id }, label));
  const select = el("select", {
    id,
    ...(disabled ? { disabled: "disabled" } : {}),
  }) as HTMLSelectElement;
  for (const lang of options)
    select.append(el("option", { value: lang.id }, lang.label));
  if (!options.some((l) => l.id === value))
    select.append(el("option", { value }, value));
  select.value = value;
  select.addEventListener("change", () => onChange(select.value));
  wrapper.append(select);
  return wrapper;
}

function renderNewsroom(copy: PageCopy): void {
  const { name, hint, body } = section("newsroom");
  name.textContent = copy.newsroomTitle;
  hint.textContent = copy.newsroomHint;
  body.replaceChildren();
  if (model.profileExists) {
    body.append(el("p", { class: "shared-note" }, copy.profileOwned));
    return;
  }
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
  const colour = el("div", { class: "field shrink" });
  colour.append(el("label", { for: "newsroom-color" }, copy.newsroomColor));
  const input = el("input", { id: "newsroom-color", type: "color" });
  input.value = form.newsroom.color;
  input.addEventListener("input", () => {
    form.newsroom.color = input.value;
  });
  colour.append(input);
  body.append(colour);
}

function renderLanguage(copy: PageCopy): void {
  const { name, hint, body } = section("language");
  name.textContent = copy.languageTitle;
  hint.textContent = copy.languageHint;
  body.replaceChildren(
    languageSelect(
      "ui-lang",
      copy.languageUi,
      form.uiLang,
      false,
      UI_LANGUAGES,
      (v) => {
        form.uiLang = v;
        render();
      },
    ),
    languageSelect(
      "content-lang",
      copy.languageContent,
      form.contentLang,
      // Decision 6: an existing profile belongs to the newsroom; the page never rewrites it.
      model.profileExists,
      CONTENT_LANGUAGES,
      (v) => {
        form.contentLang = v;
      },
    ),
  );
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
      ...(runtime.verified ? {} : { disabled: "disabled" }),
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
  engines.body.replaceChildren(
    ...model.engines.map((c) => capabilityRow(c, copy, "checkbox")),
  );

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
  renderLanguage(copy);
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
    ...(model.profileExists
      ? {}
      : {
          newsroom: {
            name: form.newsroom.name,
            url: form.newsroom.url,
            color: form.newsroom.color,
            lang: form.contentLang,
          },
        }),
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
