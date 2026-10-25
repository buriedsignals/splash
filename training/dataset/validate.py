"""Refuse training rows that would teach the wrong thing or never reach the model.

A row is refused when it holds an empty assistant turn (LEARNINGS: never train on one), an image
file that does not exist, a story held out for evaluation, or more tokens than the sequence cap.
Tokens are estimated at 3 characters each until the smoke run (U12) measures the real tokenizer;
the estimate errs long, so a row it passes fits.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

HELDOUT = json.loads((Path(__file__).resolve().parents[1] / "heldout.json").read_text())
CHARS_PER_TOKEN = 3


def estimated_tokens(row: dict) -> int:
    return len(json.dumps(row["messages"], ensure_ascii=False)) // CHARS_PER_TOKEN + len(json.dumps(row.get("tools", []))) // CHARS_PER_TOKEN


def problems(row: dict, seq_cap: int) -> list[str]:
    found = []
    if row.get("meta", {}).get("story") in HELDOUT:
        found.append(f"held-out story {row['meta']['story']}")
    for i, m in enumerate(row["messages"]):
        if m["role"] == "assistant" and not (m.get("content") or "").strip() and not m.get("tool_calls"):
            found.append(f"message {i}: empty assistant turn")
        if isinstance(m.get("content"), list):
            for part in m["content"]:
                if part.get("type") == "image" and not Path(part["image"]).exists():
                    found.append(f"message {i}: image {part['image']} does not exist")
    tokens = estimated_tokens(row)
    if tokens > seq_cap:
        found.append(f"about {tokens} tokens, over the cap of {seq_cap}")
    return found


if __name__ == "__main__":
    # usage: validate.py <rows.jsonl> <seq-cap>
    rows, cap = Path(sys.argv[1]), int(sys.argv[2])
    bad = 0
    for n, line in enumerate(rows.read_text().splitlines(), 1):
        for p in problems(json.loads(line), cap):
            bad += 1
            print(f"row {n}: {p}")
    sys.exit(1 if bad else 0)
