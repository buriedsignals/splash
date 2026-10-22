// One profile per pipeline owner that whereIs can name. A profile says which instructions its
// session starts with (the body is injected, not discovered), which references the skill itself
// tells the model to read before working, and how the session compacts.

export type OwnerId =
  | "persona:editor"
  | "skill:storyboard"
  | "skill:analyst"
  | "skill:chart-beat"
  | "skill:chart-web"
  | "persona:designer"
  | "skill:deliver";

export interface Profile {
  owner: OwnerId;
  /** Repo-relative path of the instructions injected as the session's system prompt. */
  body: string;
  /** Repo-relative references the skill marks as read-first: they enter context in every session. */
  requiredReads: string[];
  /** Craft sessions render and look, so they need a larger working margin and room for images. */
  craft: boolean;
  /** Recent tokens kept verbatim when the session compacts. */
  keepRecentTokens: number;
}

export const PROFILES: Record<OwnerId, Profile> = {
  "persona:editor": {
    owner: "persona:editor",
    body: "agents/editor.md",
    requiredReads: [],
    craft: false,
    keepRecentTokens: 8_000,
  },
  "skill:storyboard": {
    owner: "skill:storyboard",
    body: "skills/storyboard/SKILL.md",
    requiredReads: ["skills/storyboard/references/exchange.md"],
    craft: false,
    keepRecentTokens: 8_000,
  },
  "skill:analyst": {
    owner: "skill:analyst",
    body: "skills/analyst/SKILL.md",
    requiredReads: [],
    craft: false,
    keepRecentTokens: 8_000,
  },
  "skill:chart-beat": {
    owner: "skill:chart-beat",
    body: "skills/chart-beat/SKILL.md",
    requiredReads: ["skills/chart-beat/references/static-discipline.md"],
    craft: true,
    keepRecentTokens: 8_000,
  },
  "skill:chart-web": {
    owner: "skill:chart-web",
    body: "skills/chart-web/SKILL.md",
    requiredReads: ["skills/chart-web/references/web-discipline.md"],
    craft: true,
    keepRecentTokens: 8_000,
  },
  "persona:designer": {
    owner: "persona:designer",
    body: "agents/designer.md",
    requiredReads: ["skills/doctrine/references/design-rubric.md"],
    craft: false,
    keepRecentTokens: 8_000,
  },
  "skill:deliver": {
    owner: "skill:deliver",
    body: "skills/deliver/SKILL.md",
    requiredReads: [],
    craft: false,
    keepRecentTokens: 8_000,
  },
};
