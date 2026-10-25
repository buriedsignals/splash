"""LoRA-tune Gemma 4 12B on Splash gold trajectories (runs on the pod, driven by training/pod/pod.py).

Adapted from buriedsignals/fine-tuning scripts/gemma4-12b/train.py, with three changes:
- `FastVisionModel` instead of `FastModel`: rows carry images a tool returned, so the processor
  must see them; the vision layers stay frozen, which keeps the upstream mmproj valid.
- Labels come from our own mask (training/dataset/mask.py) on the tokenizer's offset mapping, not
  from `train_on_responses_only`. On Gemma 4 the tool response is rendered inside the model turn,
  so a turn-level mask would teach the model to write its tools' output (plan KTD9).
- Rows come from a local build_from_pi.py JSONL, not a Hugging Face dataset, and nothing is
  uploaded: the adapter is written under /root/out and copied off by the launcher.

Rows over the sequence cap are dropped and counted, never truncated (plan KTD10): a truncated row
would lose the skill body it runs under.

`--smoke` trains two steps, one on the longest row and one on an image row, and writes
smoke_report.json with their token lengths and peak GPU memory. That report decides `--seq-cap`
for the full run.
"""

from __future__ import annotations

import argparse
import copy
import json
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "dataset"))
sys.path.insert(0, str(HERE))
from labels import MisalignedRow, align_labels, to_label_ids  # noqa: E402
from mask import supervised_spans, token_labels, with_final_end  # noqa: E402

TEMPLATE_MARKERS = ("<|turn>model\n", "<turn|>")
NEVER_SUPERVISED = ("<|tool_response>", "<tool_response|>", "<|turn>user", "<|turn>system")


def parse_cli(argv=None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--model", default="unsloth/gemma-4-12b-it")
    p.add_argument("--rows", required=True, type=Path, help="build_from_pi.py output (JSONL)")
    p.add_argument("--image-dir", required=True, type=Path, help="where the rows' images were copied on the pod")
    p.add_argument("--out", required=True, type=Path)
    p.add_argument("--seq-cap", type=int, default=None, help="drop rows longer than this (required unless --smoke)")
    p.add_argument("--smoke", action="store_true")
    p.add_argument("--lora-r", type=int, default=16)
    p.add_argument("--lora-alpha", type=int, default=16)
    p.add_argument("--epochs", type=int, default=3)
    p.add_argument("--lr", type=float, default=2e-4)
    p.add_argument("--grad-accum", type=int, default=4)
    p.add_argument("--dry-run", action="store_true", help="encode every row and report lengths, no training")
    args = p.parse_args(argv)
    if not args.smoke and not args.dry_run and not args.seq_cap:
        p.error("--seq-cap is required for a full run; take it from the smoke report")
    return args


def load_rows(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def for_template(row: dict, image_dir: Path) -> tuple[list[dict], list[Path]]:
    """Messages the chat template expects, plus the image files in the order they appear.

    Tool-call arguments are stored as JSON strings (OpenAI style); the template renders them as
    objects, the way llama.cpp does before rendering. A tool message gets the name of the call it
    answers, which the template prints as `response:<name>`.
    """
    messages = copy.deepcopy(row["messages"])
    images: list[Path] = []
    names: dict[str, str] = {}
    for m in messages:
        for call in m.get("tool_calls") or []:
            fn = call["function"]
            names[call["id"]] = fn["name"]
            if isinstance(fn.get("arguments"), str):
                fn["arguments"] = json.loads(fn["arguments"] or "{}")
        if m["role"] == "tool" and m.get("tool_call_id") in names:
            m.setdefault("name", names[m["tool_call_id"]])
        if isinstance(m.get("content"), list):
            for part in m["content"]:
                if part.get("type") == "image":
                    local = image_dir / Path(part["image"]).name
                    if not local.exists():
                        raise FileNotFoundError(f"image {local} is missing on the pod")
                    part["image"] = str(local)
                    images.append(local)
    return messages, images


class Encoder:
    def __init__(self, processor, image_dir: Path):
        self.processor = processor
        self.tokenizer = getattr(processor, "tokenizer", processor)
        self.image_dir = image_dir

    def render(self, row: dict) -> tuple[str, list[Path]]:
        messages, images = for_template(row, self.image_dir)
        text = self.processor.apply_chat_template(messages, tools=row.get("tools") or None, tokenize=False, add_generation_prompt=False)
        if not all(marker in text for marker in TEMPLATE_MARKERS):
            raise RuntimeError("the chat template does not use the Gemma 4 markers mask.py was measured on")
        return with_final_end(text), images

    def encode(self, row: dict, with_pixels: bool = True) -> dict:
        text, images = self.render(row)
        spans = supervised_spans(text)
        if not spans:
            raise MisalignedRow("no supervised span in the rendered row")
        plain = self.tokenizer(text, add_special_tokens=False, return_offsets_mapping=True)
        plain_ids = list(plain["input_ids"])
        plain_keep = token_labels([tuple(o) for o in plain["offset_mapping"]], spans)
        if images:
            from PIL import Image

            pictures = [Image.open(p).convert("RGB") for p in images]
            full = self.processor(text=[text], images=[pictures], add_special_tokens=False, return_tensors="pt")
            full_ids = full["input_ids"][0].tolist()
            keep = align_labels(plain_ids, plain_keep, full_ids)
        else:
            full = self.tokenizer(text, add_special_tokens=False, return_tensors="pt")
            full_ids, keep = plain_ids, plain_keep
        supervised_text = self.tokenizer.decode([t for t, k in zip(full_ids, keep) if k], skip_special_tokens=False)
        leaked = [s for s in NEVER_SUPERVISED if s in supervised_text]
        if leaked:
            raise MisalignedRow(f"supervised text contains {leaked}")
        out = {"length": len(full_ids), "supervised": sum(keep), "images": len(images)}
        if with_pixels:
            import torch

            batch = {k: v for k, v in full.items() if k != "offset_mapping"}
            batch["labels"] = torch.tensor([to_label_ids(full_ids, keep)], dtype=torch.long)
            out["batch"] = batch
        return out


def survey(rows: list[dict], encoder: Encoder, cap: int | None) -> tuple[list[int], list[dict], list[dict]]:
    """Encode every row once: lengths for the report, and the rows dropped with their reason."""
    kept, stats, dropped = [], [], []
    for i, row in enumerate(rows):
        story = row.get("meta", {}).get("story")
        try:
            info = encoder.encode(row, with_pixels=False)
        except (MisalignedRow, FileNotFoundError, json.JSONDecodeError) as e:
            dropped.append({"row": i, "story": story, "reason": str(e)})
            continue
        stats.append({"row": i, "story": story, **info})
        if cap and info["length"] > cap:
            dropped.append({"row": i, "story": story, "reason": f"{info['length']} tokens, over the cap of {cap}"})
            continue
        kept.append(i)
    return kept, stats, dropped


def smoke_selection(stats: list[dict]) -> list[int]:
    """The longest row, then an image row (another one when the longest already has images)."""
    longest = max(stats, key=lambda s: s["length"])
    image_rows = sorted((s for s in stats if s["images"] and s["row"] != longest["row"]), key=lambda s: -s["length"])
    picks = [longest["row"]]
    if image_rows:
        picks.append(image_rows[0]["row"])
    elif not longest["images"]:
        raise SystemExit("smoke needs an image row and the dataset has none")
    return picks


def main(argv=None) -> int:
    args = parse_cli(argv)
    args.out.mkdir(parents=True, exist_ok=True)
    print("=== Splash Gemma 4 12B LoRA (Unsloth FastVisionModel, own label mask) ===")
    for k, v in vars(args).items():
        print(f"  {k}: {v}")

    rows = load_rows(args.rows)
    if not rows:
        raise SystemExit(f"no rows in {args.rows}")

    from unsloth import FastVisionModel  # noqa: I001  (unsloth must be imported before transformers)

    load_len = args.seq_cap or 131072
    model, processor = FastVisionModel.from_pretrained(model_name=args.model, max_seq_length=load_len, load_in_4bit=True)
    encoder = Encoder(processor, args.image_dir)

    kept, stats, dropped = survey(rows, encoder, None if args.smoke else args.seq_cap)
    report = {"rows": len(rows), "kept": len(kept), "dropped": dropped, "lengths": stats}
    print(f"rows {len(rows)}, kept {len(kept)}, dropped {len(dropped)}")
    for d in dropped:
        print(f"  dropped row {d['row']} ({d['story']}): {d['reason']}")
    if args.dry_run:
        (args.out / "train_report.json").write_text(json.dumps(report, indent=2))
        return 0
    if not kept:
        raise SystemExit("no trainable row left")

    order = smoke_selection([s for s in stats if s["row"] in kept]) if args.smoke else kept
    cap = max(s["length"] for s in stats if s["row"] in order) if args.smoke else args.seq_cap
    print(f"training on rows {order} (sequence cap {cap})")

    model = FastVisionModel.get_peft_model(
        model,
        finetune_vision_layers=False,
        finetune_language_layers=True,
        finetune_attention_modules=True,
        finetune_mlp_modules=True,
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=0,
        bias="none",
        random_state=3407,
        use_gradient_checkpointing="unsloth",
    )
    FastVisionModel.for_training(model)

    import torch
    from datasets import Dataset
    from transformers import TrainerCallback
    from trl import SFTConfig, SFTTrainer

    def collate(features):
        if len(features) != 1:
            raise ValueError("rows are whole trajectories; the batch size must be 1")
        return encoder.encode(rows[features[0]["idx"]])["batch"]

    steps: list[dict] = []

    class Measure(TrainerCallback):
        def on_step_begin(self, *_, **__):
            torch.cuda.reset_peak_memory_stats()

        def on_step_end(self, _args, state, *_, **__):
            steps.append({"step": state.global_step, "peak_gb": round(torch.cuda.max_memory_allocated() / 1e9, 2)})

        def on_log(self, _args, state, _control, logs=None, **__):
            if logs and "loss" in logs and steps:
                steps[-1]["loss"] = logs["loss"]

    config = SFTConfig(
        output_dir=str(args.out / "trainer"),
        per_device_train_batch_size=1,
        gradient_accumulation_steps=1 if args.smoke else args.grad_accum,
        num_train_epochs=1 if args.smoke else args.epochs,
        max_steps=len(order) if args.smoke else -1,
        learning_rate=args.lr,
        warmup_ratio=0.0 if args.smoke else 0.05,
        lr_scheduler_type="linear",
        optim="adamw_8bit",
        bf16=True,
        logging_steps=1,
        save_strategy="no",
        seed=3407,
        report_to="none",
        remove_unused_columns=False,
        dataset_text_field="",
        dataset_kwargs={"skip_prepare_dataset": True},
        max_length=cap,
    )
    trainer = SFTTrainer(
        model=model,
        processing_class=processor,
        train_dataset=Dataset.from_list([{"idx": i} for i in order]),
        data_collator=collate,
        args=config,
        callbacks=[Measure()],
    )
    started = time.time()
    result = trainer.train()
    report.update({"order": order, "cap": cap, "steps": steps, "loss": result.training_loss, "wall_s": int(time.time() - started)})
    print(f"Done. Loss: {result.training_loss:.4f}")

    adapter = args.out / "adapter"
    model.save_pretrained(str(adapter))
    processor.save_pretrained(str(adapter))
    weights = adapter / "adapter_model.safetensors"
    if not weights.exists():
        print("FATAL: adapter missing")
        return 1
    from safetensors import safe_open

    with safe_open(str(weights), framework="pt") as f:
        report["adapter_tensors"] = len(list(f.keys()))
    print(f"Adapter verified: {report['adapter_tensors']} tensors")
    (args.out / ("smoke_report.json" if args.smoke else "train_report.json")).write_text(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
