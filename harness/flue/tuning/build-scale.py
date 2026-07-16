#!/usr/bin/env python3
"""Round 5 — SCALE experiment. Test whether data quantity fixes the tool-emission gap.

Diagnosis from rounds 1-4: the first-token decision (emit <|tools_prefix|>) is a single
token that 30 examples couldn't teach against Apertus-Instruct's narration prior, made
worse by prefix collision (same context taught both cadrage AND tool-call).

This build removes BOTH problems:
  - ~220 procedurally-varied (article -> tool-call) pairs (many distinct contexts).
  - ONE example type only: produce-context -> write-file tool-call emission. No cadrage
    mixing -> no prefix collision. System prompt says the journalist already confirmed.
  - Each example ENDS at the tool-call (empty content) so --mask-prompt trains purely the emission.

No real produce runs needed: mask-prompt trains only the emission span (no tool-result turn).
"""
import json, pathlib

OUT = pathlib.Path(__file__).parent / "data"
OUT.mkdir(exist_ok=True)

SYSTEM = (
    "You are Splash. The journalist has already confirmed the chart. PRODUCE it now by "
    "calling tools: emit a `write-file` tool call writing the config JSON. Do not explain, "
    "do not write prose, never hand-write chart HTML — just emit the tool call."
)
TOOLS = [
    {"name": "write-file", "description": "Write text to a file.",
     "parameters": {"type": "object", "properties": {
         "path": {"type": "string"}, "content": {"type": "string"}}, "required": ["path", "content"]}},
    {"name": "execute-shell", "description": "Run a shell command and return its stdout.",
     "parameters": {"type": "object", "properties": {"cmd": {"type": "string"}}, "required": ["cmd"]}},
]

# Procedural variety: topics × category sets × chart types.
TOPICS = [
    ("unemployment", "%", ["North", "South", "East", "West", "Central"], (3.0, 12.0)),
    ("coffee production", "k tonnes", ["Brazil", "Vietnam", "Colombia", "Indonesia", "Ethiopia"], (400, 3800)),
    ("library visits", "k/month", ["Central", "Riverside", "Hilltop", "Eastgate", "Westpark"], (1.5, 11.0)),
    ("CO2 emissions", "Mt", ["Energy", "Transport", "Industry", "Buildings", "Agriculture"], (20, 320)),
    ("rainfall", "mm", ["Jan", "Apr", "Jul", "Oct"], (10, 190)),
    ("startup funding", "M€", ["Fintech", "Health", "Climate", "AI", "Mobility"], (5, 260)),
    ("tourist arrivals", "millions", ["Paris", "Rome", "Madrid", "Berlin", "Lisbon"], (8, 40)),
    ("electricity mix", "TWh", ["Hydro", "Nuclear", "Wind", "Solar", "Gas"], (12, 210)),
    ("housing starts", "k", ["2019", "2020", "2021", "2022", "2023", "2024"], (90, 340)),
    ("wine exports", "M litres", ["France", "Italy", "Spain", "Chile", "Portugal"], (40, 520)),
    ("hospital wait", "min", ["Mon", "Tue", "Wed", "Thu", "Fri"], (18, 140)),
    ("EV share", "%", ["Norway", "Sweden", "Germany", "France", "Italy"], (4, 88)),
]
TYPES = ["bar", "line", "lollipop", "histogram", "scatter", "treemap"]


def pseudo(seed, lo, hi, n):
    """Deterministic pseudo-random values in [lo,hi] (no RNG — reproducible)."""
    vals = []
    x = (seed * 2654435761) & 0xFFFFFFFF
    for _ in range(n):
        x = (x * 1103515245 + 12345) & 0x7FFFFFFF
        vals.append(round(lo + (hi - lo) * (x / 0x7FFFFFFF), 1))
    return vals


def example(idx, topic, unit, cats, rng, t):
    vals = pseudo(idx + 1, rng[0], rng[1], len(cats))
    rows = [{"cat": c, "val": v} for c, v in zip(cats, vals)]
    leader = max(rows, key=lambda r: r["val"])
    article = (f"{topic.capitalize()} 2024 ({unit}): "
               + ", ".join(f"{r['cat']} {r['val']}" for r in rows)
               + f". {leader['cat']} leads.")
    config = {"title": f"{leader['cat']} leads {topic}",
              "source": {"name": "National statistics", "url": "https://example.gov/data"},
              "altInsight": f"{leader['cat']} has the highest {topic}.",
              "unit": unit, "catField": "cat", "valField": "val", "rows": rows}
    out_dir = f"/tmp/gold/{topic.replace(' ', '_')}_{idx}"
    cfg_path = f"{out_dir}/config.json"
    msgs = [
        {"role": "system", "content": SYSTEM},
        {"role": "user", "content": f"Article: \"{article}\" Channel: article-web. Produce a static native {t} chart now."},
        {"role": "assistant", "content": "",
         "tool_calls": [{"type": "function", "function": {"name": "write-file",
             "arguments": json.dumps({"path": cfg_path, "content": json.dumps(config, ensure_ascii=False)})}}]},
    ]
    return {"messages": msgs, "tools": TOOLS}


rows = []
idx = 0
# 12 topics × 6 types × ~3 reseeds ≈ 216 examples
for reseed in range(3):
    for topic, unit, cats, rng in TOPICS:
        for t in TYPES:
            rows.append(example(idx + reseed * 1000, topic, unit, cats, rng, t))
            idx += 1

valid = rows[::12]
train = [r for r in rows if r not in valid]
(OUT / "train.jsonl").write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in train) + "\n")
(OUT / "valid.jsonl").write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in valid) + "\n")
print(f"wrote {len(train)} train + {len(valid)} valid (scale experiment, single example type)")
