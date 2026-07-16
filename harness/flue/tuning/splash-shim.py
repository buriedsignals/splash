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
    if name == "write-file":
        return "write", {"file_path": args.get("path"), "content": args.get("content")}
    if name == "execute-shell":
        return "bash", {"command": args.get("cmd")}
    return name, args

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
        messages = body.get("messages", [])
        # Render with the TRAINED tool schema (ignore the caller's tool naming) so the
        # model sees its training-time context and emits; caller's system prompt is kept.
        prompt = TOK.apply_chat_template(messages, tools=TRAINED_TOOLS, add_generation_prompt=True)
        # Floor of 700 so the tool-call JSON + suffix isn't truncated mid-emission.
        max_tokens = max(int(body.get("max_tokens") or 700), 700)
        text = generate(MODEL, TOK, prompt=prompt, max_tokens=max_tokens, verbose=False)
        tool_calls = parse_tool_calls(text)
        msg = {"role": "assistant", "content": None if tool_calls else text}
        if tool_calls:
            msg["tool_calls"] = tool_calls
        self._json(200, {"id": "chatcmpl-shim", "object": "chat.completion", "model": MODEL_ID,
                         "choices": [{"index": 0, "finish_reason": "tool_calls" if tool_calls else "stop",
                                      "message": msg}], "usage": {}})


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="./apertus-8b-splash-v5")
    ap.add_argument("--port", type=int, default=8090)
    a = ap.parse_args()
    MODEL, TOK = load(a.model)
    MODEL_ID = "local/apertus-8b-splash"
    print(f"shim serving {a.model} on http://127.0.0.1:{a.port}/v1")
    HTTPServer(("127.0.0.1", a.port), Handler).serve_forever()
