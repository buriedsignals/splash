#!/usr/bin/env python3
"""Build mlx-lm chat+tools gold trajectories from REAL produce runs — round 2.

Three fixes over round 1 (which failed to transfer):
  1. Tool-call assistant turns carry EMPTY content (teach pure emission, not narration).
  2. Each example ENDS at its target turn so `--mask-prompt` (which masks all but the
     last message in mlx-lm's ChatDataset) concentrates ALL loss on that emission.
  3. Scale: 6 real chart types × framings × 3 target turns → ~20+ examples.

Each context yields 3 training examples, ending at:
  (a) the cadrage gate question  (teach: ask before producing)
  (b) the write-file tool call    (teach: emit config write, empty content)
  (c) the execute-shell produce   (teach: emit the real producer call, empty content)
Tool outputs are REAL (captured from actual produce.mjs runs), never invented.
"""
import json, pathlib

GOLD = pathlib.Path("/tmp/gold")
OUT = pathlib.Path(__file__).parent / "data"
OUT.mkdir(exist_ok=True)

SYSTEM = (
    "You are Splash, a data-viz orchestrator. To PRODUCE a chart you call tools: first "
    "`write-file` to write the config, then `execute-shell` to run "
    "`bun skills/chart-native/scripts/produce.mjs <type> <config.json> <outDir> static`. "
    "Only the deterministic producer's real output counts — never hand-write chart HTML/JS, never a CDN."
)

# Apertus template renders tool DEFINITIONS from a FLAT shape {name,description,parameters}.
TOOLS = [
    {"name": "write-file", "description": "Write text to a file.",
     "parameters": {"type": "object", "properties": {
         "path": {"type": "string"}, "content": {"type": "string"}}, "required": ["path", "content"]}},
    {"name": "execute-shell", "description": "Run a shell command and return its stdout.",
     "parameters": {"type": "object", "properties": {"cmd": {"type": "string"}}, "required": ["cmd"]}},
]

# dir -> (produce type, [article framings], cadrage question, journalist answer)
FRAMES = {
    "bars":      ("bar",       ["Library visits per branch: Central dwarfs the rest.",
                                 "Regional libraries by monthly visits, one branch leading."],
                  "A static bar chart of the values by category, correct?",
                  "Yes, static bar, sorted descending. Takeaway: the leader tops the rest combined."),
    "line":      ("line",      ["Library visits 2019-2024 dipped in 2021 then recovered.",
                                 "A time series climbing back above its pre-2021 level."],
                  "A static line chart over time, correct?",
                  "Yes, static line. Takeaway: values recovered above the pre-dip level."),
    "lollipop":  ("lollipop",  ["Categories compared by a single value each.",
                                 "One value per category, ranked."],
                  "A static lollipop chart, one value per category, correct?",
                  "Yes, static lollipop, sorted. Takeaway: the top category leads clearly."),
    "scatter":   ("scatter",   ["Paired x/y measurements showing a relationship.",
                                 "Two variables that move together."],
                  "A static scatter plot of the relationship, correct?",
                  "Yes, static scatter. Takeaway: the two variables are positively related."),
    "histogram": ("histogram", ["The distribution of a single measured variable.",
                                 "How a measured quantity is spread across bins."],
                  "A static histogram of the distribution, correct?",
                  "Yes, static histogram. Takeaway: the distribution is concentrated around its centre."),
    "treemap":   ("treemap",   ["Parts of a whole, sized by share.",
                                 "Nested categories sized by their contribution."],
                  "A static treemap sized by share, correct?",
                  "Yes, static treemap. Takeaway: a few large blocks dominate the whole."),
}

REAL_TOOL_OUT = (
    "computing gzip size...\ndist/{t}/static/index.html  1.00 kB\n"
    "wrote static.png\n[snap-label-fit {t}/static] OK — text nodes fit clip bounds.\n"
    "[produce {t}] render-size: OK (1200x676 matches channel \"article-web\").\n"
    'PRODUCE_RESULT {{"static":"{out}/static.png"}}'
)


def base_messages(t, article, cadrage, answer, cfg_str, out_dir):
    """The full context; we truncate it at each target turn to make 3 examples."""
    cfg_path = f"{out_dir}/config.json"
    cmd = f"cd /Users/rmdms/Sites/Professional/splash && bun skills/chart-native/scripts/produce.mjs {t} {cfg_path} {out_dir} static"
    return [
        {"role": "system", "content": SYSTEM},
        {"role": "user", "content": f"Article: \"{article}\" Channel: article-web. Produce a simple static native {t} chart with chart-native."},
        {"role": "assistant", "content": cadrage},                                   # target (a)
        {"role": "user", "content": answer},
        {"role": "assistant", "content": "",                                          # target (b): pure write-file
         "tool_calls": [{"type": "function", "function": {"name": "write-file",
             "arguments": json.dumps({"path": cfg_path, "content": cfg_str})}}]},
        {"role": "tool", "content": f"wrote {cfg_path}"},
        {"role": "assistant", "content": "",                                          # target (c): pure execute-shell
         "tool_calls": [{"type": "function", "function": {"name": "execute-shell",
             "arguments": json.dumps({"cmd": cmd})}}]},
    ]


rows = []
for dirname, (t, articles, cadrage, answer) in FRAMES.items():
    cfg_file = GOLD / dirname / "config.json"
    cfg_str = cfg_file.read_text().strip() if cfg_file.exists() else "{}"
    out_dir = f"/tmp/gold/{dirname}"
    for article in articles:
        msgs = base_messages(t, article, cadrage, answer, cfg_str, out_dir)
        # 3 examples, each ending at an assistant turn (indices 2, 4, 6)
        for end in (3, 5, 7):
            rows.append({"messages": msgs[:end], "tools": TOOLS})

# split ~85/15
valid = rows[::7]                       # ~5 held out
train = [r for r in rows if r not in valid]
(OUT / "train.jsonl").write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in train) + "\n")
(OUT / "valid.jsonl").write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in valid) + "\n")
print(f"wrote {len(train)} train + {len(valid)} valid (from {len(FRAMES)} real types)")
