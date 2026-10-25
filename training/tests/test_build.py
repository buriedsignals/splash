"""build_from_pi on a hand-built Pi session: tools, images, paths and compaction segments."""

import base64
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "dataset"))
from build_from_pi import IMAGE_NOTE, NEUTRAL_ROOT, SUMMARY_NOTE, rows_from_session  # noqa: E402

ROOT = "/Users/someone/.splash-harness/runs/e2e"
PNG = base64.b64encode(b"\x89PNG fake").decode()
TOOL = {"name": "look", "description": "Look at a PNG", "parameters": {"type": "object"}}


def entry(i, parent, **kw):
    return {"type": "message", "id": f"e{i}", "parentId": parent, **kw}


def session(extra=()):
    rows = [
        {"type": "session", "version": 3, "id": "s", "cwd": ROOT},
        entry(1, None, message={"role": "system", "content": "", "sections": {"preamble": f"Story at {ROOT}/stories/x", "cwd": ROOT}, "toolsAdded": [TOOL]}),
        entry(2, "e1", message={"role": "user", "content": [{"type": "text", "text": "Render it."}]}),
        entry(3, "e2", message={"role": "assistant", "content": [{"type": "toolCall", "id": "c1", "name": "look", "arguments": {"path": f"{ROOT}/a.png"}}]}),
        entry(4, "e3", message={"role": "toolResult", "toolCallId": "c1", "toolName": "look", "content": [{"type": "image", "data": PNG, "mimeType": "image/png"}]}),
        entry(5, "e4", message={"role": "assistant", "content": [{"type": "text", "text": "DONE"}]}),
        *extra,
    ]
    return "\n".join(json.dumps(r) for r in rows)


class BuildTest(unittest.TestCase):
    def build(self, text):
        tmp = Path(tempfile.mkdtemp())
        path = tmp / "s.jsonl"
        path.write_text(text)
        return rows_from_session(path, {"story": "x"}, tmp / "images", [ROOT]), tmp

    def test_should_declare_the_tools_the_session_added(self):
        rows, _ = self.build(session())
        self.assertEqual(rows[0]["tools"][0]["function"]["name"], "look")

    def test_should_rewrite_machine_paths_to_the_neutral_root(self):
        rows, _ = self.build(session())
        self.assertNotIn(ROOT, json.dumps(rows))
        self.assertIn(f"{NEUTRAL_ROOT}/stories/x", rows[0]["messages"][0]["content"])

    def test_should_answer_a_tool_call_then_attach_its_image_in_a_user_turn(self):
        rows, tmp = self.build(session())
        roles = [m["role"] for m in rows[0]["messages"]]
        self.assertEqual(roles, ["system", "user", "assistant", "tool", "user", "assistant"])
        attached = rows[0]["messages"][4]["content"]
        self.assertTrue(Path(attached[0]["image"]).exists())
        self.assertEqual(attached[-1]["text"], IMAGE_NOTE)

    def test_should_start_a_new_row_at_a_compaction_with_its_summary_and_kept_entries(self):
        compaction = {"type": "compaction", "id": "e6", "parentId": "e5", "summary": "Rendered once.", "firstKeptEntryId": "e5",
                      "systemMessage": {"role": "system", "content": "", "sections": {"preamble": "After compaction"}, "toolsAdded": [TOOL]}}
        after = entry(7, "e6", message={"role": "user", "content": [{"type": "text", "text": "Again."}]})
        reply = entry(8, "e7", message={"role": "assistant", "content": [{"type": "text", "text": "DONE again"}]})
        rows, _ = self.build(session([compaction, after, reply]))
        self.assertEqual(len(rows), 2)
        second = rows[1]["messages"]
        self.assertEqual(second[0]["content"], "After compaction")
        self.assertEqual(second[1]["content"], f"{SUMMARY_NOTE}\nRendered once.")
        self.assertEqual([m["content"] for m in second[2:]], ["DONE", "Again.", "DONE again"])


if __name__ == "__main__":
    unittest.main()
