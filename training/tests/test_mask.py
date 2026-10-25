"""The mask supervises what the model wrote, never what its tools returned."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "dataset"))
from mask import supervised_spans, token_labels, with_final_end  # noqa: E402

RENDERED = with_final_end((Path(__file__).parent / "fixtures" / "gemma4-rendered.txt").read_text())


def supervised(text):
    return "".join(text[a:b] for a, b in supervised_spans(text))


class MaskTest(unittest.TestCase):
    def test_should_supervise_the_tool_call_and_the_text_after_its_response(self):
        self.assertIn('<|tool_call>call:look{path:<|"|>a.png<|"|>}<tool_call|>It is right. DONE<turn|>', supervised(RENDERED))

    def test_should_never_supervise_a_tool_response(self):
        self.assertNotIn("TOOL OUTPUT", supervised(RENDERED))

    def test_should_never_supervise_the_system_or_the_user(self):
        out = supervised(RENDERED)
        self.assertFalse(any(s in out for s in ("SYS", "Render it.", "Again.", "declaration:look")))

    def test_should_skip_the_template_empty_thought_channel_and_close_the_last_turn(self):
        self.assertTrue(supervised(RENDERED).endswith("<turn|>DONE again<turn|>"))
        self.assertNotIn("<|channel>thought", supervised(RENDERED))

    def test_should_label_only_tokens_wholly_inside_a_span(self):
        text = "<|turn>user\nhi<turn|>\n<|turn>model\nok<turn|>"
        start = text.index("ok")
        offsets = [(0, start), (start, start + 2), (start + 2, len(text))]
        self.assertEqual(token_labels(offsets, supervised_spans(text)), [False, True, True])


if __name__ == "__main__":
    unittest.main()
