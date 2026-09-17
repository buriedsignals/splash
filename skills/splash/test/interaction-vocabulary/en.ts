// twin/skills/splash/test/interaction-vocabulary/en.ts
//
// ENGLISH — the promise vocabulary for pages that declare `en`.
//
// No page in `proof/` declares `en` today; this file is here because English is a language the
// newsroom profile can name (`NEWSROOM.md`'s own `languages:` is `en`) and because it is the
// vocabulary the guard was originally written with. See `README.md`.

export default {
  name: "English",

  input: {
    hover: /\bhover(s|ing)?\b|\bpointing at\b/i,
    tap: /\btap(s|ping)?\b|\btouch(es|ing)?\b/i,

    // `\btab\b` is word-bounded on purpose: two map beats ship an accessible TABLE, and an
    // unbounded token would have read every one of them as a keyboard promise.
    keyboard: /\bkeyboard\b|\bfocus(es|ing)?\b|\btab(s|bing)?\b/i,
  },

  reveal:
    /\bavailable\b|\breachable\b|\breveals?\b|\bshows?\b|\bnames\b|\bfor its\b|\bhas its own\b|\bprints\b/i,
};
