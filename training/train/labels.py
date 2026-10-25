"""Carry per-token loss labels from the plain tokenization onto the processor's tokenization.

The mask (`training/dataset/mask.py`) works on character offsets, so labels are first computed on a
plain tokenization of the rendered text, where the tokenizer returns offsets. The multimodal
processor then expands every image placeholder into a run of image tokens, which shifts every index
after it. Image runs only ever sit in user turns, so the expansion may insert or replace tokens only
where the label is False. `align_labels` walks both sequences, marks every inserted token False, and
refuses the row when a supervised token would move or vanish: a wrong alignment would train the model
on text it never wrote.

Stdlib only, so it can be checked off the pod.
"""

from __future__ import annotations

IGNORE = -100
LOOKAHEAD = 8
MAX_PLAIN_SKIP = 4
MAX_INSERTED_RUN = 1 << 16


class MisalignedRow(ValueError):
    pass


def _window_matches(plain: list[int], i: int, full: list[int], j: int) -> bool:
    n = min(LOOKAHEAD, len(plain) - i)
    return n > 0 and full[j : j + n] == plain[i : i + n]


def align_labels(plain_ids: list[int], plain_labels: list[bool], full_ids: list[int]) -> list[bool]:
    if len(plain_ids) != len(plain_labels):
        raise MisalignedRow("plain ids and labels differ in length")
    out: list[bool] = []
    i = j = 0
    while j < len(full_ids):
        if i < len(plain_ids) and full_ids[j] == plain_ids[i]:
            out.append(plain_labels[i])
            i += 1
            j += 1
            continue
        if i >= len(plain_ids):
            out.append(False)
            j += 1
            continue
        resync = None
        for skip in range(MAX_PLAIN_SKIP + 1):
            if any(plain_labels[i : i + skip]):
                break
            stop = min(len(full_ids), j + MAX_INSERTED_RUN)
            for k in range(j, stop):
                if _window_matches(plain_ids, i + skip, full_ids, k):
                    resync = (skip, k)
                    break
            if resync:
                break
        if resync is None:
            if not any(plain_labels[i:]):
                out.extend([False] * (len(full_ids) - j))
                i, j = len(plain_ids), len(full_ids)
                break
            raise MisalignedRow(f"cannot realign at plain token {i}, full token {j}")
        skip, k = resync
        if any(plain_labels[i : i + skip]):
            raise MisalignedRow(f"a supervised token at plain index {i} has no counterpart")
        out.extend([False] * (k - j))
        i += skip
        j = k
    if i < len(plain_ids) and any(plain_labels[i:]):
        raise MisalignedRow("supervised tokens left over after alignment")
    kept_plain = [t for t, keep in zip(plain_ids, plain_labels) if keep]
    kept_full = [t for t, keep in zip(full_ids, out) if keep]
    if kept_plain != kept_full:
        raise MisalignedRow("supervised token sequence changed under the processor")
    return out


def to_label_ids(input_ids: list[int], keep: list[bool]) -> list[int]:
    return [t if k else IGNORE for t, k in zip(input_ids, keep)]
