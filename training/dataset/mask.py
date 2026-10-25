"""Which characters of a rendered Gemma 4 conversation the loss supervises.

Measured on the template llama.cpp serves for gemma-4-12b-it (fixture tests/fixtures/gemma4-rendered.txt):
a tool's response is rendered INSIDE the model turn that called it —
`<|turn>model\\n<|tool_call>...<tool_call|><|tool_response>...<tool_response|>text<turn|>` — so a
mask that supervises whole model turns trains the model to write its tools' output. The supervised
spans are the model turns minus every tool-response block and minus the template's own empty thought
channel, and each span keeps its closing `<turn|>` so the model learns to stop.
"""

from __future__ import annotations

import re

MODEL_TURN = re.compile(r"<\|turn>model\n(.*?)(<turn\|>|\Z)", re.S)
NOT_GENERATED = re.compile(r"<\|tool_response>.*?<tool_response\|>|<\|channel>thought\n<channel\|>", re.S)
END = "<turn|>"


def supervised_spans(text: str) -> list[tuple[int, int]]:
    """Half-open character ranges the model generated, in order."""
    spans: list[tuple[int, int]] = []
    for turn in MODEL_TURN.finditer(text):
        start, end = turn.start(1), turn.end(2)
        cursor = start
        for skip in NOT_GENERATED.finditer(text, start, turn.end(1)):
            if skip.start() > cursor:
                spans.append((cursor, skip.start()))
            cursor = skip.end()
        if end > cursor:
            spans.append((cursor, end))
    return spans


def with_final_end(text: str) -> str:
    """The template leaves the last model turn open, as a prompt; a training row closes it."""
    return text if text.rstrip().endswith(END) else text + END


def token_labels(offsets: list[tuple[int, int]], spans: list[tuple[int, int]]) -> list[bool]:
    """True for each token whose characters lie wholly inside a supervised span.

    `offsets` are the tokenizer's (start, end) character offsets for each token of `text`.
    """
    labels = []
    i = 0
    for start, end in offsets:
        while i < len(spans) and spans[i][1] <= start:
            i += 1
        labels.append(i < len(spans) and spans[i][0] <= start and end <= spans[i][1] and end > start)
    return labels
