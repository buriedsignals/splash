#!/usr/bin/env python3
"""Round 6 — MULTI-TURN scaled data (cadrage -> write config -> run produce -> deliver).

Uses the proven round-5 recipe (scale + no prefix collision + tool-terminal + mask-prompt),
extended to 4 phases. A FIXED system prompt (the shim presents the same one at inference)
describes the whole flow; each example ENDS at one phase's target turn so mask-prompt trains
exactly that emission. Phases keyed off conversation STATE (how far the dialogue has gone).
"""
import json, pathlib

OUT = pathlib.Path(__file__).parent / "data"
OUT.mkdir(exist_ok=True)

SPLASH_SYSTEM = (
    "You are Splash, a sovereign data-viz orchestrator. Flow: (1) given an article, FIRST ask the "
    "journalist ONE short cadrage question about the chart; (2) after they confirm, emit a `write-file` "
    "tool call writing the config JSON; (3) after the config is written, emit an `execute-shell` tool call "
    "running `bun skills/chart-native/scripts/produce.mjs <type> <config> <outDir> static`; (4) after it "
    "produces, deliver one short sentence pointing to the artifact. Only the deterministic producer's real "
    "output counts — never hand-write chart HTML/JS, never a CDN."
)
TOOLS = [
    {"name": "write-file", "description": "Write text to a file.",
     "parameters": {"type": "object", "properties": {
         "path": {"type": "string"}, "content": {"type": "string"}}, "required": ["path", "content"]}},
    {"name": "execute-shell", "description": "Run a shell command and return its stdout.",
     "parameters": {"type": "object", "properties": {"cmd": {"type": "string"}}, "required": ["cmd"]}},
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
]
TYPES = ["bar", "line", "lollipop", "histogram", "scatter", "treemap"]
# Varied cadrage openings so the model does NOT collapse to one first token.
CADRAGE = [
    "Should this be a static {t} chart of {topic} by category?",
    "Do you want a static {t} chart, one value per category?",
    "I'll make a static {t} chart of {topic} — confirm the takeaway is the leader?",
    "A static {t} chart sorted by value — is that right for {topic}?",
    "Confirm: static {t} chart, {topic}, article-web embed?",
]

def pseudo(seed, lo, hi, n):
    vals, x = [], (seed * 2654435761) & 0xFFFFFFFF
    for _ in range(n):
        x = (x * 1103515245 + 12345) & 0x7FFFFFFF
        vals.append(round(lo + (hi - lo) * (x / 0x7FFFFFFF), 1))
    return vals

def produce_out(t, out_dir):
    return (f"dist/{t}/static/index.html 1.0kB\nwrote static.png\n"
            f"[snap-label-fit {t}/static] OK\n[produce {t}] render-size: OK (1200x676, article-web).\n"
            f'PRODUCE_RESULT {{"static":"{out_dir}/static.png"}}')

rows = []
idx = 0
for reseed in range(3):
    for topic, unit, cats, rng in TOPICS:
        for t in TYPES:
            seed = idx + reseed * 1000
            vals = pseudo(seed + 1, rng[0], rng[1], len(cats))
            data = [{"cat": c, "val": v} for c, v in zip(cats, vals)]
            leader = max(data, key=lambda r: r["val"])
            article = (f"{topic.capitalize()} 2024 ({unit}): "
                       + ", ".join(f"{r['cat']} {r['val']}" for r in data) + f". {leader['cat']} leads.")
            cfg = {"title": f"{leader['cat']} leads {topic}", "source": {"name": "National statistics",
                   "url": "https://example.gov/data"}, "altInsight": f"{leader['cat']} has the highest {topic}.",
                   "unit": unit, "catField": "cat", "valField": "val", "rows": data}
            out_dir = f"/tmp/gold/{topic.replace(' ', '_')}_{seed}"
            cfg_path = f"{out_dir}/config.json"
            cmd = f"cd /Users/rmdms/Sites/Professional/splash && bun skills/chart-native/scripts/produce.mjs {t} {cfg_path} {out_dir} static"
            cadrage = CADRAGE[seed % len(CADRAGE)].format(t=t, topic=topic)
            answer = f"Yes, static {t}. Takeaway: {leader['cat']} leads."
            sys_m = {"role": "system", "content": SPLASH_SYSTEM}
            u1 = {"role": "user", "content": f'Article: "{article}" Channel: article-web. Make a static native {t} chart.'}
            a_cad = {"role": "assistant", "content": cadrage}
            u2 = {"role": "user", "content": answer}
            a_wf = {"role": "assistant", "content": "", "tool_calls": [{"type": "function", "function": {
                "name": "write-file", "arguments": json.dumps({"path": cfg_path, "content": json.dumps(cfg, ensure_ascii=False)})}}]}
            t_wf = {"role": "tool", "content": f"wrote {cfg_path}"}
            a_es = {"role": "assistant", "content": "", "tool_calls": [{"type": "function", "function": {
                "name": "execute-shell", "arguments": json.dumps({"cmd": cmd})}}]}
            t_es = {"role": "tool", "content": produce_out(t, out_dir)}
            a_del = {"role": "assistant", "content": f"Done — the static {t} chart is at {out_dir}/static.png (rendered by chart-native)."}
            # 4 phase examples, each ending at its target assistant turn
            rows.append({"messages": [sys_m, u1, a_cad], "tools": TOOLS})                                   # cadrage
            rows.append({"messages": [sys_m, u1, a_cad, u2, a_wf], "tools": TOOLS})                          # write-file
            rows.append({"messages": [sys_m, u1, a_cad, u2, a_wf, t_wf, a_es], "tools": TOOLS})              # execute-shell
            rows.append({"messages": [sys_m, u1, a_cad, u2, a_wf, t_wf, a_es, t_es, a_del], "tools": TOOLS}) # deliver
            idx += 1

valid = rows[::20]
train = [r for r in rows if r not in valid]
(OUT / "train.jsonl").write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in train) + "\n")
(OUT / "valid.jsonl").write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in valid) + "\n")
print(f"wrote {len(train)} train + {len(valid)} valid (4 phases x {idx} contexts)")
