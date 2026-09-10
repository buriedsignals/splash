import { DESIGN_FIELDS } from "./settings-fields.mjs";

export function createSettingsEditor({ documentRef, api, announce, onSaved }) {
  const fieldsRoot = documentRef.querySelector("#design-fields");
  const designForm = documentRef.querySelector("#design-form");
  const accountForm = documentRef.querySelector("#cloudflare-form");
  const account = documentRef.querySelector("#cloudflare-account-id");
  const saveDesign = documentRef.querySelector("#save-design");
  const saveAccount = documentRef.querySelector("#save-account");
  const proposal = documentRef.querySelector("#design-proposal");
  const reloadDesign = documentRef.querySelector("#reload-design-settings");
  const reloadCredentials = documentRef.querySelector("#reload-credentials-settings");
  const inputs = new Map();
  let state = null;
  let busy = false;

  function text(parent, tag, copy, className = "") {
    const node = documentRef.createElement(tag);
    node.textContent = copy;
    if (className) node.className = className;
    parent.append(node);
    return node;
  }
  const measure = documentRef.createElement("button");
  measure.type = "button";
  measure.textContent = "Use website design";
  measure.className = "measure-design";
  for (const group of ["identity", "appearance"]) {
    const section = documentRef.createElement("fieldset");
    section.className = "design-group";
    text(section, "legend", group === "identity" ? "Newsroom" : "Visual style");
    for (const field of DESIGN_FIELDS.filter(row => row.group === group)) {
      const label = documentRef.createElement("label");
      label.setAttribute("for", `design-${field.id}`);
      text(label, "span", field.label);
      const input = documentRef.createElement("input");
      input.id = `design-${field.id}`;
      input.name = field.id;
      input.type = field.type || "text";
      input.required = Boolean(field.required);
      input.maxLength = 4096;
      input.autocomplete = "off";
      input.disabled = true;
      if (field.placeholder) input.placeholder = field.placeholder;
      if (field.pattern) input.pattern = field.pattern;
      label.append(input);
      if (field.help) {
        const help = text(label, "small", field.help);
        help.id = `${input.id}-help`;
        input.setAttribute("aria-describedby", help.id);
      }
      section.append(label);
      if (field.id === "url") section.append(measure);
      inputs.set(field.id, input);
    }
    fieldsRoot.append(section);
  }

  function enable() {
    saveDesign.disabled = !state || busy;
    saveAccount.disabled = !state || busy || Boolean(state.accountIdFromEnvironment);
    measure.disabled = !state || busy;
    for (const input of inputs.values()) input.disabled = !state || busy;
    account.disabled = !state || busy || Boolean(state.accountIdFromEnvironment);
  }
  function showError(error, destination) {
    announce(error.message || "Settings could not be saved.", true, { destination });
    if (error.body?.code === "settings-conflict" || error.body?.code === "conflict") {
      (destination === "design" ? reloadDesign : reloadCredentials).hidden = false;
    }
  }
  function render() {
    for (const [id, input] of inputs) input.value = state.profile?.[id] || (id === "languages" ? state.profile?.language : "") || "";
    account.value = state.accountIdFromEnvironment || state.profile?.cloudflareAccountId || "";
    const source = documentRef.querySelector("#account-source");
    source.hidden = !state.accountIdFromEnvironment;
    source.textContent = "CLOUDFLARE_ACCOUNT_ID is supplied by your launcher. Change it there and restart Splash.";
    saveAccount.hidden = Boolean(state.accountIdFromEnvironment);
    reloadDesign.hidden = true;
    reloadCredentials.hidden = true;
  }
  async function load() {
    busy = true;
    enable();
    try {
      state = await api("/api/settings/read", {});
      render();
      proposal.hidden = true;
      for (const destination of ["design", "credentials"]) announce("Settings loaded.", false, { destination, visible: false });
    } catch (error) {
      for (const destination of ["design", "credentials"]) showError(error, destination);
      reloadDesign.hidden = false;
      reloadCredentials.hidden = false;
    } finally {
      busy = false;
      enable();
    }
  }
  async function save(destination, path, body) {
    if (!state || busy) return;
    busy = true;
    enable();
    try {
      state = await api(path, { expectedRevision: state.revision, ...body });
      announce(destination === "design" ? "Design saved." : "Cloudflare account saved.", false, { destination });
      reloadDesign.hidden = true;
      reloadCredentials.hidden = true;
      // Refresh service availability without replacing drafts in either form.
      try { await onSaved(); }
      catch { announce("Saved. Connection status could not be refreshed; use Refresh status to retry.", false, { destination }); }
    } catch (error) {
      showError(error, destination);
    } finally {
      busy = false;
      enable();
    }
  }
  designForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!state) return;
    await save("design", "/api/settings/design", {
      changes: Object.fromEntries([...inputs].map(([id, input]) => [id, input.value])),
      confirmReplaceDecline: state.declined === true,
    });
  });
  accountForm.addEventListener("submit", async event => {
    event.preventDefault();
    await save("credentials", "/api/settings/cloudflare", { cloudflareAccountId: account.value.trim() });
  });
  for (const button of [reloadDesign, reloadCredentials]) button.addEventListener("click", load);
  measure.addEventListener("click", async () => {
    if (busy || !inputs.get("url").reportValidity()) return;
    busy = true;
    enable();
    announce("Reading the website’s design…", false, { destination: "design" });
    try {
      const result = await api("/api/settings/derive", { url: inputs.get("url").value.trim() });
      proposal.replaceChildren();
      text(proposal, "strong", "Design found on your website");
      const candidates = DESIGN_FIELDS.flatMap(field => result.fields?.[field.id]?.value ? [{ ...field, ...result.fields[field.id] }] : []);
      for (const row of candidates) {
        text(proposal, "p", `${row.label}: ${row.value}`);
        if (row.source) text(proposal, "small", row.source);
      }
      if (candidates.length) {
        const apply = documentRef.createElement("button");
        apply.type = "button";
        apply.textContent = "Fill empty fields";
        apply.addEventListener("click", () => {
          for (const row of candidates) {
            const input = inputs.get(row.id);
            if (!input.value.trim()) input.value = row.value;
          }
          proposal.hidden = true;
          announce("Draft filled. Review the fields, then save your design.", false, { destination: "design" });
        });
        proposal.append(apply);
      } else text(proposal, "p", "No design values could be identified. Enter them in the form.");
      proposal.hidden = false;
      announce("Website checked. Review the proposal below.", false, { destination: "design" });
    } catch (error) {
      showError(error, "design");
    } finally {
      busy = false;
      enable();
    }
  });
  enable();
  return { load };
}
