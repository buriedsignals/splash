#!/usr/bin/env python3
"""2-phase model for the shim-state-machine architecture (last-mile plan).

The model only needs to do the JUDGMENT parts; the shim drives produce+deliver
deterministically. So train ONLY:
  phase-1 cadrage:   [system, user(article)]                 -> assistant cadrage question
  phase-2 write-file:[system, user, cadrage, user(confirm)]  -> assistant write-file{valid config}

No phase-3/4 -> no over-eager execute-shell, no loop. Config content EXACTLY matches
chart-native's produce.mjs schema (catField/valField/rows) so it renders as-is.
"""
import json, pathlib

OUT = pathlib.Path(__file__).parent / "data"
OUT.mkdir(exist_ok=True)

SYSTEM = (
    "You are Splash, a sovereign data-viz orchestrator. Given an article: (1) FIRST ask the journalist "
    "ONE short cadrage question about the chart; (2) after they confirm, emit a `write-file` tool call "
    "writing the chart config JSON (fields: title, source, altInsight, unit, catField, valField, rows). "
    "Never hand-write chart HTML/JS, never a CDN — a deterministic producer renders the config."
)
TOOLS = [
    {"name": "write-file", "description": "Write text to a file.",
     "parameters": {"type": "object", "properties": {
         "path": {"type": "string"}, "content": {"type": "string"}}, "required": ["path", "content"]}},
]

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
    ("air quality", "AQI", ["Delhi", "Beijing", "Cairo", "Paris", "Oslo"], (18, 190)),
    ("book sales", "k copies", ["Fiction", "Sci-fi", "History", "Cooking", "Kids"], (12, 240)),
]
TYPES = ["bar", "line", "lollipop", "histogram"]
CADRAGE = [
    "Should this be a static {t} chart of {topic} by category?",
    "Do you want a static {t} chart, one value per category?",
    "A static {t} chart sorted by value — right for {topic}?",
    "Confirm: static {t} chart, {topic}, article-web embed?",
    "I'll make a static {t} chart — is the takeaway the leader?",
]

def pseudo(seed, lo, hi, n):
    vals, x = [], (seed * 2654435761) & 0xFFFFFFFF
    for _ in range(n):
        x = (x * 1103515245 + 12345) & 0x7FFFFFFF
        vals.append(round(lo + (hi - lo) * (x / 0x7FFFFFFF), 1))
    return vals

rows_out = []
idx = 0
for reseed in range(4):
    for topic, unit, cats, rng in TOPICS:
        for t in TYPES:
            seed = idx + reseed * 1000
            vals = pseudo(seed + 1, rng[0], rng[1], len(cats))
            data = [{"cat": c, "val": v} for c, v in zip(cats, vals)]
            leader = max(data, key=lambda r: r["val"])
            article = (f"{topic.capitalize()} 2024 ({unit}): "
                       + ", ".join(f"{r['cat']} {r['val']}" for r in data) + f". {leader['cat']} leads.")
            cfg = {"title": f"{leader['cat']} leads {topic}",
                   "source": {"name": "National statistics", "url": "https://example.gov/data"},
                   "altInsight": f"{leader['cat']} has the highest {topic}.",
                   "unit": unit, "catField": "cat", "valField": "val", "rows": data}
            cadrage = CADRAGE[seed % len(CADRAGE)].format(t=t, topic=topic)
            confirm = f"Yes, static {t}. Takeaway: {leader['cat']} leads."
            sys_m = {"role": "system", "content": SYSTEM}
            u1 = {"role": "user", "content": f'Article: "{article}" Channel: article-web. Make a static native {t} chart.'}
            a_cad = {"role": "assistant", "content": cadrage}
            u2 = {"role": "user", "content": confirm}
            a_wf = {"role": "assistant", "content": "", "tool_calls": [{"type": "function", "function": {
                "name": "write-file", "arguments": json.dumps({"path": "/tmp/splash-run/config.json",
                    "content": json.dumps(cfg, ensure_ascii=False)})}}]}
            rows_out.append({"messages": [sys_m, u1, a_cad], "tools": TOOLS})            # cadrage
            rows_out.append({"messages": [sys_m, u1, a_cad, u2, a_wf], "tools": TOOLS})   # write-file
            idx += 1

valid = rows_out[::18]
train = [r for r in rows_out if r not in valid]
(OUT / "train.jsonl").write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in train) + "\n")
(OUT / "valid.jsonl").write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in valid) + "\n")
print(f"wrote {len(train)} train + {len(valid)} valid (2-phase: cadrage + write-file, {idx} contexts)")
