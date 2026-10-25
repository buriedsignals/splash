#!/usr/bin/env bash
# Pod-side setup for the Splash LoRA: system packages, uv, one venv on /root, the training stack.
#
# Adapted from the bootstrap in buriedsignals/fine-tuning scripts/gemma4-12b/pod.py and the
# storage lessons of scripts/qwen3.6-27b/pod.py: uv cache, venv and HF cache all on /root (local
# NVMe); /workspace (MooseFS) throttled or failed large writes and filled up on the base download.
#
# VERSIONS ARE NOT PINNED YET. The values below are candidates from the plan (Unsloth 2026.10.7
# accepts transformers up to 5.17; Tom's 12B ran on a forced transformers 5.13.0). An empty value
# installs the resolver's choice. `uv pip freeze` is written to /root/out/versions.txt so the run
# that succeeds can pin training/pyproject.toml mechanically (plan U12 step 5).
set -euo pipefail

UNSLOTH_VERSION="${UNSLOTH_VERSION:-2026.10.7}"      # candidate, TO BE PINNED
UNSLOTH_ZOO_VERSION="${UNSLOTH_ZOO_VERSION:-}"       # TO BE PINNED
TRANSFORMERS_VERSION="${TRANSFORMERS_VERSION:-5.13.0}" # candidate (Tom's forced version), TO BE PINNED
TRL_VERSION="${TRL_VERSION:-}"                       # TO BE PINNED
TORCH_VERSION="${TORCH_VERSION:-}"                   # TO BE PINNED
PYTHON_VERSION="3.11"

export HF_HOME=/root/.hf
export UV_CACHE_DIR=/root/.uv-cache
export UV_LINK_MODE=copy
export PATH="$HOME/.local/bin:$PATH"
mkdir -p /root/.hf /root/.uv-cache /root/out

spec() { if [ -n "$2" ]; then printf '%s==%s' "$1" "$2"; else echo "WARNING: $1 unpinned" >&2; printf '%s' "$1"; fi; }

apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends cmake build-essential git curl ca-certificates
if ! command -v uv >/dev/null; then
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="$HOME/.local/bin:$PATH"
fi

uv venv /root/venv --python "$PYTHON_VERSION"
OVERRIDES=/root/uv-overrides.txt
: > "$OVERRIDES"
# Unsloth pins transformers below the version the 12B needs; an override wins over its pin
# (the same mechanism as Tom's `[tool.uv] override-dependencies`).
[ -n "$TRANSFORMERS_VERSION" ] && echo "transformers==$TRANSFORMERS_VERSION" >> "$OVERRIDES"

uv pip install --python /root/venv/bin/python --override "$OVERRIDES" \
  "$(spec torch "$TORCH_VERSION")" \
  "$(spec unsloth "$UNSLOTH_VERSION")" \
  "$(spec unsloth_zoo "$UNSLOTH_ZOO_VERSION")" \
  "$(spec transformers "$TRANSFORMERS_VERSION")" \
  "$(spec trl "$TRL_VERSION")" \
  datasets safetensors "huggingface_hub[cli]" pillow

uv pip freeze --python /root/venv/bin/python > /root/out/versions.txt
/root/venv/bin/python - <<'PY'
import torch, transformers, trl, unsloth  # noqa: F401
print("torch", torch.__version__, "cuda", torch.cuda.is_available(), torch.cuda.get_device_name(0) if torch.cuda.is_available() else "-")
print("transformers", transformers.__version__, "trl", trl.__version__, "unsloth", unsloth.__version__)
PY
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
df -h /root /workspace || true
