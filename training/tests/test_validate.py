"""validate.problems refuses what must never be trained on."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "dataset"))
from validate import problems  # noqa: E402


def row(story="stress-p-transport-ridership", messages=None):
    return {"meta": {"story": story}, "tools": [], "messages": messages or [{"role": "system", "content": "s"}, {"role": "assistant", "content": "ok"}]}


class ValidateTest(unittest.TestCase):
    def test_should_pass_a_clean_row(self):
        self.assertEqual(problems(row(), 32768), [])

    def test_should_refuse_a_held_out_story(self):
        self.assertIn("held-out story r8-chart-static-german-road-deaths-by-mode", problems(row("r8-chart-static-german-road-deaths-by-mode"), 32768))

    def test_should_refuse_an_empty_assistant_turn(self):
        self.assertEqual(problems(row(messages=[{"role": "assistant", "content": "  "}]), 32768), ["message 0: empty assistant turn"])

    def test_should_keep_an_assistant_turn_that_only_calls_a_tool(self):
        calls = [{"id": "c", "type": "function", "function": {"name": "look", "arguments": "{}"}}]
        self.assertEqual(problems(row(messages=[{"role": "assistant", "content": "", "tool_calls": calls}]), 32768), [])

    def test_should_refuse_an_image_that_does_not_exist(self):
        msg = {"role": "user", "content": [{"type": "image", "image": "/nowhere/x.png"}]}
        self.assertEqual(problems(row(messages=[msg]), 32768), ["message 0: image /nowhere/x.png does not exist"])

    def test_should_refuse_a_row_over_the_cap(self):
        self.assertTrue(problems(row(messages=[{"role": "assistant", "content": "x" * 400}]), 100)[0].endswith("over the cap of 100"))


if __name__ == "__main__":
    unittest.main()
