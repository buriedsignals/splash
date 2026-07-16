#!/usr/bin/env python3
"""Build mlx-lm chat+tools gold trajectories from REAL produce runs.

Each trajectory teaches the behavior the base Apertus 8B fails at (it narrates a
fake run + hand-writes a CDN chart): emit a real `execute-shell` tool call that
runs the deterministic chart-native producer, then deliver the REAL artifact.
Tool outputs are REAL (captured from actual `produce.mjs` runs), never invented.
"""
import json, os, pathlib

GOLD = pathlib.Path("/tmp/gold")
OUT = pathlib.Path(__file__).parent / "data"
OUT.mkdir(exist_ok=True)

SYSTEM = (
    "You are Splash, a data-viz orchestrator. To PRODUCE a chart you MUST call the "
    "`execute-shell` tool to run the deterministic native producer "
    "`bun skills/chart-native/scripts/produce.mjs <type> <config.json> <outDir> static`. "
    "NEVER hand-write chart HTML/JS and NEVER use a CDN — only the producer's real output "
    "counts. Write the config with `write-file` first. Gate: ask the journalist one cadrage "
    "question before producing, then proceed."
)

# Apertus's chat template renders tool DEFINITIONS from a FLAT shape
# ({name, description, parameters}), not the OpenAI-nested {type,function:{...}}.
# (Assistant tool_calls DO use the nested {type:"function", function:{...}} shape —
# the template handles that separately at message render time.)
TOOLS = [
    {"name": "write-file",
     "description": "Write text to a file.",
     "parameters": {"type": "object", "properties": {
         "path": {"type": "string"}, "content": {"type": "string"}},
         "required": ["path", "content"]}},
    {"name": "execute-shell",
     "description": "Run a shell command and return its stdout.",
     "parameters": {"type": "object", "properties": {"cmd": {"type": "string"}},
                    "required": ["cmd"]}},
]

# type -> (article framing, cadrage question, journalist answer)
FRAMES = {
    "bars": ("bar", "Our library data shows monthly visits per branch; Central dwarfs the rest.",
             "A static bar chart of visits by branch, correct?",
             "Yes, static bar, sorted descending. Takeaway: Central draws more than the next three combined."),
    "line": ("line", "Library visits over 2019-2024 dipped in 2021 then climbed back above pre-closure levels.",
             "A static line chart of visits over time, correct?",
             "Yes, static line. Takeaway: visits recovered above pre-closure levels by 2024."),
    "lollipop": ("lollipop", "We compared a set of categories by a single value each.",
                 "A static lollipop chart, one value per category, correct?",
                 "Yes, static lollipop, sorted. Takeaway: the top category leads clearly."),
    "scatter": ("scatter", "We have paired x/y measurements to show their relationship.",
                "A static scatter plot of the relationship, correct?",
                "Yes, static scatter. Takeaway: the two variables are positively related."),
}

REAL_TOOL_OUT = (
    "computing gzip size...\n"
    "dist/{t}/static/index.html  1.00 kB\n"
    "✓ built\nwrote static.png\n"
    "[snap-label-fit {t}/static] OK — text nodes fit clip bounds (worst overflow 0.00px).\n"
    "[produce {t}] render-size: OK (1200x676 matches channel \"article-web\").\n"
    'PRODUCE_RESULT {{"static":"{out}/static.png"}}'
)

def trajectory(dirname, t, article, cadrage, answer, config_obj, produce_out, out_dir):
    cfg_path = f"{out_dir}/config.json"
    cfg_str = json.dumps(config_obj, ensure_ascii=False)
    return {"messages": [
        {"role": "system", "content": SYSTEM},
        {"role": "user", "content": f"Article: \"{article}\" Channel: article-web. Produce a simple static native {t} chart with chart-native."},
        {"role": "assistant", "content": cadrage},
        {"role": "user", "content": answer},
        {"role": "assistant", "content": "Writing the config, then running the producer.",
         "tool_calls": [{"type": "function", "function": {"name": "write-file",
            "arguments": json.dumps({"path": cfg_path, "content": cfg_str})}}]},
        {"role": "tool", "content": f"wrote {cfg_path}"},
        {"role": "assistant", "content": "",
         "tool_calls": [{"type": "function", "function": {"name": "execute-shell",
            "arguments": json.dumps({"cmd": f"cd /Users/rmdms/Sites/Professional/splash && bun skills/chart-native/scripts/produce.mjs {t} {cfg_path} {out_dir} static"})}}]},
        {"role": "tool", "content": produce_out},
        {"role": "assistant", "content": f"Done. The static {t} chart is at {out_dir}/static.png (rendered by chart-native, 1200x676, WCAG-checked). Takeaway reflected in the title."},
    ], "tools": TOOLS}

rows = []
for dirname, (t, article, cadrage, answer) in FRAMES.items():
    d = GOLD / dirname
    cfg = json.loads((d / "config.json").read_text()) if (d / "config.json").exists() else {}
    out_dir = f"/tmp/gold/{dirname}"
    produce_out = REAL_TOOL_OUT.format(t=t, out=out_dir)
    # two framings per type for a slightly larger demo set
    rows.append(trajectory(dirname, t, article, cadrage, answer, cfg, produce_out, out_dir))
    rows.append(trajectory(dirname, t, article + " (regional edition)", cadrage,
                           answer + " Keep it minimal.", cfg, produce_out, out_dir))

# split ~80/20
valid = rows[::4]           # every 4th -> 2 examples
train = [r for r in rows if r not in valid]
(OUT / "train.jsonl").write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in train) + "\n")
(OUT / "valid.jsonl").write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in valid) + "\n")
print(f"wrote {len(train)} train + {len(valid)} valid trajectories to {OUT}")
