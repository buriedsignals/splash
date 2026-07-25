// language.ts — one resolution, two languages (issue #6): the INTERFACE language the
// orchestration speaks, and the CONTENT language the deliverables are made in. They have
// separate homes — uiLang in newsroom.json, lang in NEWSROOM-PROFILE.md — so a newsroom can
// work in English and publish in French.
//
// Resolution is pure: an override wins for this run only, and persisting a preference is a
// separate, explicit act by the caller. Nothing here writes.
export const DEFAULT_UI_LANG = "en";

export type ResolvedLanguage = {
  /** prompts, menus, readiness messages, delivery instructions */
  ui: string;
  /** titles, chart furniture, "Source:" — the deliverable's own language */
  content: string;
};

function firstSet(...candidates: (string | undefined)[]): string | undefined {
  for (const c of candidates)
    if (typeof c === "string" && c.trim()) return c.trim();
  return undefined;
}

export function resolveLanguage(input: {
  override?: { ui?: string; content?: string };
  uiLang?: string;
  profileLang?: string;
}): ResolvedLanguage {
  const ui = firstSet(input.override?.ui, input.uiLang) ?? DEFAULT_UI_LANG;
  // A newsroom that set no deliverable language works in the language it reads: falling back
  // to `ui` beats falling back to English for a German newsroom that never filled the profile.
  const content = firstSet(input.override?.content, input.profileLang) ?? ui;
  return { ui, content };
}
