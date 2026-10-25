#!/usr/bin/env bash
# Merged Splash 12B -> GGUF f16 -> Q4_K_M, next to the upstream mmproj (on the pod).
#
# Adapted from buriedsignals/fine-tuning scripts/gemma4-12b/gguf.py (CPU-only llama-quantize build,
# text weights via convert_hf_to_gguf.py, /root not /workspace) and scripts/gemma4-26b-a4b/gguf.py
# (upstream mmproj reuse: the vision tower stayed frozen, so upstream's projector is ours; llama.cpp's
# --mmproj conversion did not support Gemma 4 when Tom measured it). Nothing is uploaded: the outputs
# land in OUT_DIR and the launcher copies them off.
#
# usage: export_gguf.sh <merged-dir> <work-dir> <out-dir>
set -euo pipefail

MERGED="${1:?merged dir}"
WORK="${2:?work dir}"
OUT="${3:?out dir}"
QUANT="Q4_K_M"
# TO BE PINNED from the run that succeeds: the llama.cpp commit that converted this model.
LLAMA_CPP_REF="${LLAMA_CPP_REF:-}"
# Upstream GGUF repo and commit measured in U1 (plan: Dependencies / Assumptions).
UPSTREAM_REPO="unsloth/gemma-4-12b-it-GGUF"
UPSTREAM_REV="${UPSTREAM_REV:-fc034cff}"
MMPROJ="mmproj-BF16.gguf"
NAME="gemma-4-12b-splash"

for dir in "$MERGED" "$WORK" "$OUT"; do
  case "$(realpath -m "$dir")" in
    /workspace*) echo "refusing $dir: heavy files go under /root, never /workspace" >&2; exit 1 ;;
  esac
done
ls "$MERGED"/*.safetensors >/dev/null
mkdir -p "$WORK" "$OUT"

LLAMA="$WORK/llama.cpp"
echo "[1/5] llama.cpp (CPU-only llama-quantize)"
if [ ! -d "$LLAMA" ]; then
  if [ -n "$LLAMA_CPP_REF" ]; then
    git clone https://github.com/ggml-org/llama.cpp.git "$LLAMA"
    git -C "$LLAMA" checkout --detach "$LLAMA_CPP_REF"
  else
    echo "WARNING: LLAMA_CPP_REF unset, building llama.cpp HEAD; record the commit below and pin it" >&2
    git clone --depth 1 https://github.com/ggml-org/llama.cpp.git "$LLAMA"
  fi
fi
echo "llama.cpp commit: $(git -C "$LLAMA" rev-parse HEAD)"
cmake -B "$LLAMA/build" -S "$LLAMA" -DGGML_CUDA=OFF -DLLAMA_CURL=OFF
cmake --build "$LLAMA/build" --config Release -j 8 --target llama-quantize
QUANTIZE="$LLAMA/build/bin/llama-quantize"

echo "[2/5] convert merged -> f16 GGUF (text weights)"
uv pip install --python "$(command -v python)" sentencepiece protobuf numpy
F16="$WORK/$NAME-f16.gguf"
python "$LLAMA/convert_hf_to_gguf.py" "$MERGED" --outfile "$F16" --outtype f16

echo "[3/5] quantize -> $QUANT"
Q4="$OUT/$NAME-$QUANT.gguf"
"$QUANTIZE" "$F16" "$Q4" "$QUANT"

echo "[4/5] upstream mmproj ($UPSTREAM_REPO@$UPSTREAM_REV)"
hf download "$UPSTREAM_REPO" "$MMPROJ" --revision "$UPSTREAM_REV" --local-dir "$WORK/upstream"
cp "$WORK/upstream/$MMPROJ" "$OUT/$MMPROJ"

echo "[5/5] sha256"
for f in "$F16" "$Q4" "$OUT/$MMPROJ"; do
  printf '%s  %s bytes\n' "$(basename "$f")" "$(stat -c %s "$f")"
done
(cd "$OUT" && sha256sum "$NAME-$QUANT.gguf" "$MMPROJ" | tee SHA256SUMS)
sha256sum "$F16"
