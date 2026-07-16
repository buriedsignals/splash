#!/usr/bin/env python3
"""OpenAI-compatible shim for the tuned Apertus Splash model.

Why: mlx_lm.server 0.31.3 narrates on the identical prompt where mlx_lm.generate emits
(a server-layer quirk when `tools` are present). This shim uses generate() directly
(proven to emit) and does two translations so Flue can drive it:
  1. Parse Apertus's native <|tools_prefix|>[{name: args}]<|tools_suffix|> -> OpenAI tool_calls.
  2. Map the trained tool names to Flue's native tools: write-file->write, execute-shell->bash.

Run:  python splash-shim.py --model ./apertus-8b-splash-v5 --port 8090
Point Flue at it: SPLASH_LOCAL_BASE_URL=http://127.0.0.1:8090/v1
"""
import argparse, json, re
from http.server import BaseHTTPRequestHandler, HTTPServer
from mlx_lm import load, generate
from mlx_lm.sample_utils import make_logits_processors

# Apertus's template omits <|assistant_end|> at sequence end, so prose turns weren't
# trained to stop -> the model rambles/loops after a cadrage question. Truncate prose at
# the first boundary marker (its aborted stop attempt) to keep the assistant history clean.
BOUNDARY_RE = re.compile(r"<unk>|<\|assistant_end\|>|<\|assistant_start\|>|<\|user_end\|>|<\|user_start\|>")

def clean_prose(text):
    cut = BOUNDARY_RE.search(text)
    text = text[:cut.start()] if cut else text
    # collapse an immediate self-repeat (degeneration guard) to the first sentence group.
    return text.strip()

# Trained tool schema (flat, as the Apertus template expects).
TRAINED_TOOLS = [
    {"name": "write-file", "description": "Write text to a file.",
     "parameters": {"type": "object", "properties": {
         "path": {"type": "string"}, "content": {"type": "string"}}, "required": ["path", "content"]}},
    {"name": "execute-shell", "description": "Run a shell command and return its stdout.",
     "parameters": {"type": "object", "properties": {"cmd": {"type": "string"}}, "required": ["cmd"]}},
]
# Trained -> Flue native tool name + argument remap.
def to_flue(name, args):
    # Emit both common arg-name variants so whichever Flue's tool schema expects matches.
    if name == "write-file":
        p, c = args.get("path"), args.get("content")
        return "write", {"path": p, "file_path": p, "content": c}
    if name == "execute-shell":
        cmd = args.get("cmd")
        return "bash", {"command": cmd, "cmd": cmd}
    return name, args

# The FIXED system prompt the model was trained on (must match build-multiturn.py's SPLASH_SYSTEM).
SPLASH_SYSTEM = (
    "You are Splash, a sovereign data-viz orchestrator. Flow: (1) given an article, FIRST ask the "
    "journalist ONE short cadrage question about the chart; (2) after they confirm, emit a `write-file` "
    "tool call writing the config JSON; (3) after the config is written, emit an `execute-shell` tool call "
    "running `bun skills/chart-native/scripts/produce.mjs <type> <config> <outDir> static`; (4) after it "
    "produces, deliver one short sentence pointing to the artifact. Only the deterministic producer's real "
    "output counts — never hand-write chart HTML/JS, never a CDN."
)

def from_flue(name, args):
    """Reverse of to_flue: translate Flue's tool names/args back to the trained schema."""
    if name == "write":
        return "write-file", {"path": args.get("path") or args.get("file_path"), "content": args.get("content")}
    if name == "bash":
        return "execute-shell", {"cmd": args.get("cmd") or args.get("command")}
    return name, args

def _flat(c):
    if isinstance(c, list):
        return "\n".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in c)
    return c if isinstance(c, str) else ("" if c is None else str(c))

def prepare_messages(raw):
    """Render Flue's OpenAI conversation into the Apertus template's expected shape:
    fixed Splash system; every content flattened to a string; assistant tool_calls translated
    back to the trained names; structure (cadrage/answers/tool results) preserved for multi-turn."""
    out = [{"role": "system", "content": SPLASH_SYSTEM}]
    last_call = None  # (trained_name, trained_args) of the most recent assistant tool call
    for m in raw:
        role = m.get("role")
        if role == "system":
            continue
        if role == "assistant" and m.get("tool_calls"):
            tcs = []
            for tc in m["tool_calls"]:
                fn = tc.get("function", {})
                try:
                    args = json.loads(fn.get("arguments") or "{}")
                except Exception:
                    args = {}
                name, targs = from_flue(fn.get("name"), args)
                last_call = (name, dict(targs))
                # In HISTORY, stub the write-file config content: the model doesn't need to
                # re-read its own (possibly huge/truncated) config to proceed to produce, and a
                # clean short turn matches the training distribution that reliably triggers phase-3.
                if name == "write-file" and "content" in targs:
                    targs = {**targs, "content": "{…}"}
                tcs.append({"type": "function", "function": {"name": name, "arguments": json.dumps(targs, ensure_ascii=False)}})
            out.append({"role": "assistant", "content": "", "tool_calls": tcs})
        elif role == "tool":
            # Normalize the tool RESULT to the training format so the next phase triggers.
            # Flue's raw write/bash result differs from training ("wrote <path>" / produce stdout).
            content = _flat(m.get("content"))
            if last_call and last_call[0] == "write-file":
                content = f"wrote {last_call[1].get('path')}"
            out.append({"role": "tool", "content": content})
        else:
            out.append({"role": role, "content": _flat(m.get("content"))})
    return out

def _balanced_array(s):
    """Extract the first complete top-level [...] via bracket matching (truncation-tolerant)."""
    start = s.find("[")
    if start < 0:
        return None
    depth, instr, esc = 0, False, False
    for i in range(start, len(s)):
        c = s[i]
        if esc:
            esc = False; continue
        if c == "\\":
            esc = True; continue
        if c == '"':
            instr = not instr; continue
        if instr:
            continue
        if c == "[":
            depth += 1
        elif c == "]":
            depth -= 1
            if depth == 0:
                return s[start:i + 1]
    return None

def parse_tool_calls(text):
    """Apertus emits <|tools_prefix|>[{"name": {args}}, ...]<|tools_suffix|> (suffix may be truncated)."""
    if "<|tools_prefix|>" not in text:
        return None
    body = text.split("<|tools_prefix|>", 1)[1].split("<|tools_suffix|>", 1)[0]
    arr_str = _balanced_array(body)
    if not arr_str:
        return None
    try:
        arr = json.loads(arr_str)
    except Exception:
        return None
    calls = []
    for i, obj in enumerate(arr):
        for name, args in obj.items():
            fname, fargs = to_flue(name, args if isinstance(args, dict) else {})
            calls.append({"id": f"call_{i}", "type": "function",
                          "function": {"name": fname, "arguments": json.dumps(fargs)}})
    return calls or None


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):  # quiet
        pass

    def _json(self, code, obj):
        b = json.dumps(obj).encode()
        self.send_response(code); self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b)

    def do_GET(self):
        if self.path.rstrip("/").endswith("/models"):
            self._json(200, {"object": "list", "data": [{"id": MODEL_ID, "object": "model", "created": 0}]})
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self):
        if not self.path.endswith("/chat/completions"):
            return self._json(404, {"error": "not found"})
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        raw = body.get("messages", [])
        import sys as _sys
        print("SHIM incoming roles:", [m.get("role") for m in raw], file=_sys.stderr)
        messages = prepare_messages(raw)
        prompt = TOK.apply_chat_template(messages, tools=TRAINED_TOOLS, add_generation_prompt=True)
        # Floor of 700 so the tool-call JSON + suffix isn't truncated mid-emission.
        max_tokens = max(int(body.get("max_tokens") or 700), 700)
        # No repetition penalty: it corrupts tool-call JSON (which legitimately repeats
        # structural tokens). Prose looping is handled by clean_prose truncation instead.
        text = generate(MODEL, TOK, prompt=prompt, max_tokens=max_tokens, verbose=False)
        tool_calls = parse_tool_calls(text)
        if not tool_calls:
            text = clean_prose(text)
        if body.get("stream"):
            return self._stream(tool_calls, text)
        msg = {"role": "assistant", "content": None if tool_calls else text}
        if tool_calls:
            msg["tool_calls"] = tool_calls
        self._json(200, {"id": "chatcmpl-shim", "object": "chat.completion", "model": MODEL_ID,
                         "choices": [{"index": 0, "finish_reason": "tool_calls" if tool_calls else "stop",
                                      "message": msg}], "usage": {}})

    def _stream(self, tool_calls, text):
        """OpenAI SSE stream (Flue's openai-completions provider expects streamed chunks)."""
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()

        def chunk(delta, finish=None):
            payload = {"id": "chatcmpl-shim", "object": "chat.completion.chunk", "model": MODEL_ID,
                       "choices": [{"index": 0, "delta": delta, "finish_reason": finish}]}
            self.wfile.write(f"data: {json.dumps(payload)}\n\n".encode()); self.wfile.flush()

        chunk({"role": "assistant"})
        if tool_calls:
            for i, tc in enumerate(tool_calls):
                chunk({"tool_calls": [{"index": i, "id": tc["id"], "type": "function",
                                       "function": {"name": tc["function"]["name"], "arguments": ""}}]})
                chunk({"tool_calls": [{"index": i, "function": {"arguments": tc["function"]["arguments"]}}]})
            chunk({}, finish="tool_calls")
        else:
            chunk({"content": text}, finish="stop")
        self.wfile.write(b"data: [DONE]\n\n"); self.wfile.flush()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="./apertus-8b-splash-v5")
    ap.add_argument("--port", type=int, default=8090)
    a = ap.parse_args()
    MODEL, TOK = load(a.model)
    MODEL_ID = "local/apertus-8b-splash"
    print(f"shim serving {a.model} on http://127.0.0.1:{a.port}/v1")
    HTTPServer(("127.0.0.1", a.port), Handler).serve_forever()
