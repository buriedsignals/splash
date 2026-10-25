"""Turn kept Pi sessions into training rows {meta, tools, messages}.

A row holds exactly the context the model saw: a session is split at each compaction, and every
segment starts from the compacted summary plus the entries Pi kept. Images a tool returned are
placed in a following user message, the way Pi sends them to an OpenAI-compatible server.
Machine-specific paths are rewritten to a neutral root, because Spotlight's v5 data kept 1,423 of
them.
"""

from __future__ import annotations

import base64
import hashlib
import json
import re
import sys
from pathlib import Path

NEUTRAL_ROOT = "/splash"
IMAGE_NOTE = "Attached image(s) from tool result:"
SUMMARY_NOTE = "The conversation before this point was compacted into this summary:"


def load(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def active_branch(entries: list[dict]) -> list[dict]:
    """The path from the root to the last entry, following parentId."""
    by_id = {e["id"]: e for e in entries if "id" in e and e.get("type") != "session"}
    leaf = [e for e in entries if e.get("type") != "session"][-1]
    chain = []
    node = leaf
    while node is not None:
        chain.append(node)
        node = by_id.get(node.get("parentId"))
    return list(reversed(chain))


def neutral(text: str, roots: list[str]) -> str:
    for root in sorted(roots, key=len, reverse=True):
        text = text.replace(root, NEUTRAL_ROOT)
    return text


def system_text(message: dict) -> str:
    sections = message.get("sections") or {}
    parts = [v for k, v in sections.items() if k != "cwd" and isinstance(v, str)]
    return "\n\n".join(parts) if parts else message.get("content", "")


def tools_of(message: dict) -> list[dict]:
    return [
        {"type": "function", "function": {"name": t["name"], "description": t.get("description", ""), "parameters": t.get("parameters", {})}}
        for t in message.get("toolsAdded") or []
    ]


def save_image(block: dict, images: Path) -> str:
    data = base64.b64decode(block["data"])
    name = hashlib.sha256(data).hexdigest()[:16] + ".png"
    images.mkdir(parents=True, exist_ok=True)
    (images / name).write_bytes(data)
    return str(images / name)


def convert(message: dict, images: Path, roots: list[str]) -> list[dict]:
    role = message["role"]
    content = message.get("content")
    if role == "user":
        text = content if isinstance(content, str) else "".join(c.get("text", "") for c in content if c.get("type") == "text")
        return [{"role": "user", "content": neutral(text, roots)}]
    if role == "assistant":
        text = "".join(c.get("text", "") for c in content if c.get("type") == "text")
        calls = [
            {"id": c["id"], "type": "function", "function": {"name": c["name"], "arguments": neutral(json.dumps(c.get("arguments", {}), ensure_ascii=False), roots)}}
            for c in content
            if c.get("type") == "toolCall"
        ]
        out = {"role": "assistant", "content": neutral(text, roots)}
        if calls:
            out["tool_calls"] = calls
        return [out]
    if role == "toolResult":
        text = "".join(c.get("text", "") for c in content if c.get("type") == "text")
        rows = [{"role": "tool", "tool_call_id": message["toolCallId"], "content": neutral(text, roots) or "(see attached image)"}]
        pictures = [c for c in content if c.get("type") == "image"]
        if pictures:
            rows.append(
                {"role": "user", "content": [{"type": "image", "image": save_image(p, images)} for p in pictures] + [{"type": "text", "text": IMAGE_NOTE}]}
            )
        return rows
    return []


def segments(branch: list[dict]) -> list[list[dict]]:
    """Each compaction starts a new segment: its summary, then the entries it kept."""
    cuts = [i for i, e in enumerate(branch) if e.get("type") == "compaction"]
    if not cuts:
        return [branch]
    out = [branch[: cuts[0]]]
    for n, i in enumerate(cuts):
        comp = branch[i]
        end = cuts[n + 1] if n + 1 < len(cuts) else len(branch)
        kept_from = next((k for k, e in enumerate(branch) if e.get("id") == comp["firstKeptEntryId"]), i)
        kept = [e for e in branch[kept_from:i] if e.get("type") == "message" and e["message"]["role"] != "system"]
        out.append([comp] + kept + branch[i + 1 : end])
    return out


def rows_from_session(path: Path, meta: dict, images: Path, roots: list[str]) -> list[dict]:
    branch = active_branch(load(path))
    system, tools, rows = None, [], []
    for seg in segments(branch):
        messages: list[dict] = []
        for e in seg:
            if e.get("type") == "compaction":
                if e.get("systemMessage"):
                    system, tools = system_text(e["systemMessage"]), tools_of(e["systemMessage"]) or tools
                messages.append({"role": "user", "content": f"{SUMMARY_NOTE}\n{neutral(e.get('summary', ''), roots)}"})
            elif e.get("type") == "message":
                m = e["message"]
                if m["role"] == "system":
                    system, tools = system_text(m), tools_of(m)
                else:
                    messages.extend(convert(m, images, roots))
        if any(m["role"] == "assistant" for m in messages):
            rows.append({"meta": {**meta, "session": path.name}, "tools": tools, "messages": [{"role": "system", "content": neutral(system or "", roots)}] + messages})
    return rows


if __name__ == "__main__":
    # usage: build_from_pi.py <manifest.jsonl> <out.jsonl> <images-dir>
    manifest, out, images = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    with out.open("w") as sink:
        for line in manifest.read_text().splitlines():
            item = json.loads(line)
            for row in rows_from_session(Path(item["session"]), item.get("meta", {}), images, item.get("roots", [])):
                sink.write(json.dumps(row, ensure_ascii=False) + "\n")
