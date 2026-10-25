"""Merge the Splash LoRA into the base, check it still writes text, save 16-bit weights (on the pod).

Adapted from buriedsignals/fine-tuning scripts/gemma4-12b/merge.py:
- same Unsloth-native merge (`save_pretrained_merged`, merged_16bit): the transformers+peft path
  corrupted Tom's 12B into `<unused>` tokens;
- same coherence check BEFORE the merge, so a corrupt adapter is blamed on training, not on the
  merge; here it is fatal on any error and also refuses template tokens in the output (plan U12);
- `FastVisionModel`, matching train.py, so the frozen vision tower is carried through;
- no upload: the merged weights stay under /root for export_gguf.sh.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

PROMPT = [
    {"role": "system", "content": "You are Splash, a visual-journalism assistant."},
    {"role": "user", "content": "In two sentences, say what makes a chart honest."},
]
TEMPLATE_TOKENS = ("<|turn>", "<|tool_call>", "<|tool_response>", "<|channel>", "<unused", "<start_of_image>", "<|image")
END_TOKENS = ("<turn|>", "<eos>", "<end_of_turn>")


def coherence_problems(text: str) -> list[str]:
    body = text
    for end in END_TOKENS:
        body = body.split(end)[0]
    found = []
    if not body.strip():
        found.append("empty generation")
    found += [f"template token {t!r} in output" for t in TEMPLATE_TOKENS if t in body]
    return found


def main(argv=None) -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--adapter", required=True, type=Path)
    p.add_argument("--workdir", default=Path("/root/merged"), type=Path)
    p.add_argument("--report", default=Path("/root/out/coherence.json"), type=Path)
    p.add_argument("--max-seq-length", type=int, default=8192)
    args = p.parse_args(argv)
    if str(args.workdir.resolve()).startswith("/workspace"):
        raise SystemExit("merge writes under /root: /workspace (MooseFS) failed large writes for Tom")

    from unsloth import FastVisionModel

    print(f"[1/3] loading base + adapter from {args.adapter}...")
    model, processor = FastVisionModel.from_pretrained(model_name=str(args.adapter), max_seq_length=args.max_seq_length, load_in_4bit=False)
    FastVisionModel.for_inference(model)

    print("[2/3] coherence check...")
    inputs = processor.apply_chat_template(PROMPT, tokenize=True, add_generation_prompt=True, return_dict=True, return_tensors="pt").to(model.device)
    out = model.generate(**inputs, max_new_tokens=80, do_sample=False)
    tokenizer = getattr(processor, "tokenizer", processor)
    text = tokenizer.decode(out[0][inputs["input_ids"].shape[1] :], skip_special_tokens=False)
    problems = coherence_problems(text)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps({"prompt": PROMPT, "generation": text, "problems": problems}, indent=2))
    print(f"[coherence] {text[:300]!r}")
    if problems:
        print(f"[coherence] FAIL ({problems}): the adapter is corrupt; training, not the merge. Aborting.")
        return 2
    print("[coherence] PASS")

    print(f"[3/3] save_pretrained_merged (merged_16bit) -> {args.workdir}")
    model.save_pretrained_merged(str(args.workdir), processor, save_method="merged_16bit")
    if not any(args.workdir.glob("*.safetensors")):
        print("FATAL: no merged safetensors written")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
