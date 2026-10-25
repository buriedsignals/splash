#!/usr/bin/env python3
"""RunPod launcher for the Splash Gemma 4 12B LoRA: smoke, then full (train, merge, export).

Adapted from buriedsignals/fine-tuning scripts/gemma4-12b/pod.py (one pod per job, inner work over
SSH, logs streamed) with the guards of scripts/qwen3.6-27b/pod.py: wallet balance checked against
the worst-case cost, SECURE cloud only, a persistent /root/run.log, and auto-termination only on
success. Two changes of our own:

- Spend is opt-in twice. `--budget <usd>` is required before anything else happens, and nothing
  launches without `--confirm`. Without it the launcher prints the GPU, the hourly price it would
  pay and the hours the budget allows, then stops.
- Nothing goes to Hugging Face. The pod is terminated only after its artifacts are copied off and
  their sha256 values match; on any failure it is kept alive so the work can be recovered.

Guards that decide whether to spend are pure functions (`offline_guard`, `plan_launch`); the
RunPod client is constructed only after the offline guard passes, so a refusal makes no call.

Examples:
  python3 training/pod/pod.py smoke --budget 6 --rows rows.jsonl --images images/
  python3 training/pod/pod.py smoke --budget 6 --rows rows.jsonl --images images/ --confirm
  python3 training/pod/pod.py full --budget 15 --seq-cap 65536 --rows rows.jsonl --images images/ --confirm
  python3 training/pod/pod.py kill <pod-id>

Required env: RUNPOD_API_KEY (never printed).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path

HERE = Path(__file__).resolve().parent
TRAINING = HERE.parent

GPU_CANDIDATES = ("NVIDIA A100-SXM4-80GB", "NVIDIA A100 80GB PCIe")
GPU_LABEL = "A100 80GB"
CLOUD_TYPE = "SECURE"
# Refuse any A100 offer above this; also the price the offline guard assumes before asking RunPod.
PRICE_CEILING_USD_HR = 2.50
# Container disk, boot and copy-off are billed too; Tom's 27B guard used 1.3 on the timeout.
COST_MARGIN = 1.3
IMAGE = "runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04"  # Tom's image; TO BE PINNED by digest
REMOTE = "/root/splash-train"
REMOTE_OUT = "/root/out"
SUCCESS = "=== splash job complete ==="
GB = 1_000_000_000


@dataclass(frozen=True)
class Job:
    timeout_h: float
    container_disk_gb: int
    copy_gb: float
    commands: tuple[str, ...]


# Every code path of the full run is exercised by the smoke run (plan U12 step 2); smoke copies
# off only its reports, the adapter and the GGUF checksums, not the GGUF itself.
JOBS = {
    "smoke": Job(
        timeout_h=1.5,
        container_disk_gb=200,
        copy_gb=1.0,
        commands=(
            f"python training/train/train.py --rows {REMOTE}/data/rows.jsonl --image-dir {REMOTE}/data/images --out {REMOTE_OUT} --smoke",
            f"python training/train/merge.py --adapter {REMOTE_OUT}/adapter --workdir /root/merged --report {REMOTE_OUT}/coherence.json",
            f"bash training/train/export_gguf.sh /root/merged /root/gguf-work /root/gguf-out && cp /root/gguf-out/SHA256SUMS {REMOTE_OUT}/gguf.SHA256SUMS",
        ),
    ),
    "full": Job(
        timeout_h=6.0,
        container_disk_gb=200,
        copy_gb=9.0,
        commands=(
            f"python training/train/train.py --rows {REMOTE}/data/rows.jsonl --image-dir {REMOTE}/data/images --out {REMOTE_OUT} --seq-cap {{seq_cap}}",
            f"python training/train/merge.py --adapter {REMOTE_OUT}/adapter --workdir /root/merged --report {REMOTE_OUT}/coherence.json",
            f"bash training/train/export_gguf.sh /root/merged /root/gguf-work {REMOTE_OUT}/gguf",
        ),
    ),
}
MIN_JOB = "smoke"
BUNDLED = ("dataset/mask.py", "train/train.py", "train/labels.py", "train/merge.py", "train/export_gguf.sh", "pod/setup.sh")


class Refusal(Exception):
    pass


@dataclass(frozen=True)
class Plan:
    job: str
    gpu: str
    price_usd_hr: float
    max_hours: float
    worst_case_usd: float
    balance_usd: float
    launch: bool

    def lines(self) -> list[str]:
        return [
            f"GPU:            {GPU_LABEL} ({self.gpu}), {CLOUD_TYPE} cloud, 1 GPU",
            f"Hourly price:   ${self.price_usd_hr:.2f}/h (x{COST_MARGIN} margin for disk and boot)",
            f"Budget allows:  {self.max_hours:.2f} h",
            f"Job '{self.job}':     up to {JOBS[self.job].timeout_h:.1f} h, worst case ${self.worst_case_usd:.2f}",
            f"RunPod balance: ${self.balance_usd:.2f}",
        ]


def worst_case(job: str, price_usd_hr: float) -> float:
    return JOBS[job].timeout_h * price_usd_hr * COST_MARGIN


def offline_guard(budget: float | None, job: str, free_bytes: int | None = None) -> None:
    """Refuse before any network call: no budget, a nonsense budget, or one below the smallest run."""
    if job not in JOBS:
        raise Refusal(f"unknown job {job!r}")
    if budget is None:
        raise Refusal("--budget <usd> is required; nothing is launched or queried without it")
    if not math.isfinite(budget) or budget <= 0:
        raise Refusal(f"--budget must be a positive number of USD, got {budget}")
    floor = worst_case(MIN_JOB, PRICE_CEILING_USD_HR)
    if budget < floor:
        raise Refusal(f"budget ${budget:.2f} is below the minimum smoke run (${floor:.2f} at the ${PRICE_CEILING_USD_HR:.2f}/h ceiling)")
    need = JOBS[job].copy_gb * GB
    if free_bytes is not None and free_bytes < need:
        raise Refusal(f"the local output disk has {free_bytes / GB:.1f} GB free; copying '{job}' off needs {need / GB:.1f} GB")


def plan_launch(budget: float | None, job: str, prices: dict[str, float | None], balance: float | None, confirm: bool, free_bytes: int | None = None) -> Plan:
    """Decide from the budget, RunPod's quoted prices and balance whether this run may launch.

    The plan prices the most expensive candidate the launcher might fall through to, so the
    printed price is never below what it pays.
    """
    offline_guard(budget, job, free_bytes)
    offered = {gpu: p for gpu, p in prices.items() if gpu in GPU_CANDIDATES and p is not None and p > 0}
    if not offered:
        raise Refusal(f"RunPod quotes no {CLOUD_TYPE} price for {', '.join(GPU_CANDIDATES)}")
    gpu, price = max(offered.items(), key=lambda kv: kv[1])
    if price > PRICE_CEILING_USD_HR:
        raise Refusal(f"{gpu} costs ${price:.2f}/h, above the ${PRICE_CEILING_USD_HR:.2f}/h ceiling")
    cost = worst_case(job, price)
    max_hours = budget / (price * COST_MARGIN)
    if cost > budget:
        raise Refusal(f"budget ${budget:.2f} allows {max_hours:.2f} h; job '{job}' may take {JOBS[job].timeout_h:.1f} h (${cost:.2f})")
    if balance is None:
        raise Refusal("RunPod balance unknown; refusing rather than guessing")
    if balance < cost:
        raise Refusal(f"balance ${balance:.2f} is below the worst case ${cost:.2f}")
    return Plan(job, gpu, price, max_hours, cost, balance, launch=bool(confirm))


def check_inputs(rows: Path | None, images: Path | None) -> int:
    """Local, offline: the rows exist, each image they name is in --images, none is held out."""
    if rows is None or not rows.is_file():
        raise Refusal(f"--rows {rows} is not a file")
    if images is None or not images.is_dir():
        raise Refusal(f"--images {images} is not a directory")
    sys.path.insert(0, str(TRAINING / "dataset"))
    from validate import problems

    lines = [line for line in rows.read_text().splitlines() if line.strip()]
    if not lines:
        raise Refusal(f"{rows} holds no row")
    for n, line in enumerate(lines, 1):
        row = json.loads(line)
        found = [p for p in problems(row, seq_cap=1 << 62) if "does not exist" not in p]
        for m in row["messages"]:
            for part in m.get("content") if isinstance(m.get("content"), list) else []:
                if part.get("type") == "image" and not (images / Path(part["image"]).name).is_file():
                    found.append(f"image {Path(part['image']).name} is not in {images}")
        if found:
            raise Refusal(f"row {n}: {'; '.join(found)}")
    return len(lines)


def remote_script(job: str, seq_cap: int | None) -> str:
    commands = [c.format(seq_cap=int(seq_cap or 0)) for c in JOBS[job].commands]
    body = "\n".join(commands)
    return f"""set -euo pipefail
exec > >(tee -a /root/run.log) 2>&1
mkdir -p {REMOTE} {REMOTE_OUT}
tar -xzf /root/bundle.tgz -C {REMOTE}
cd {REMOTE}
bash training/pod/setup.sh
source /root/venv/bin/activate
export HF_HOME=/root/.hf UV_CACHE_DIR=/root/.uv-cache UV_LINK_MODE=copy
echo "=== starting {job} ==="
{body}
cd {REMOTE_OUT} && find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS
echo "{SUCCESS}"
"""


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


class RunPodClient:
    """The only object that talks to RunPod. Built after the offline guard; never logs the key."""

    def __init__(self, api_key: str):
        import runpod

        self._runpod = runpod
        self._key = api_key
        runpod.api_key = api_key

    def prices(self) -> dict[str, float | None]:
        out: dict[str, float | None] = {}
        for gpu in GPU_CANDIDATES:
            try:
                info = self._runpod.get_gpu(gpu) or {}
                out[gpu] = float(info["securePrice"]) if info.get("securePrice") else None
            except Exception as e:  # an unknown GPU id or an API error leaves the price unknown
                log(f"price query for {gpu} failed: {type(e).__name__}")
                out[gpu] = None
        return out

    def balance(self) -> float | None:
        import urllib.request

        req = urllib.request.Request(
            "https://api.runpod.io/graphql",
            data=json.dumps({"query": "query { myself { clientBalance } }"}).encode(),
            headers={"Authorization": f"Bearer {self._key}", "Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as r:
                return float(json.loads(r.read())["data"]["myself"]["clientBalance"])
        except Exception as e:
            log(f"balance query failed: {type(e).__name__}")
            return None

    def create(self, plan: Plan, public_key: str) -> tuple[str, str]:
        job = JOBS[plan.job]
        for gpu in GPU_CANDIDATES:
            log(f"Trying {gpu} ({CLOUD_TYPE})...")
            try:
                pod = self._runpod.create_pod(
                    name=f"splash-12b-{plan.job}",
                    image_name=IMAGE,
                    gpu_type_id=gpu,
                    cloud_type=CLOUD_TYPE,
                    gpu_count=1,
                    container_disk_in_gb=job.container_disk_gb,
                    volume_in_gb=20,
                    volume_mount_path="/workspace",
                    ports="22/tcp",
                    env={"PUBLIC_KEY": public_key},
                    support_public_ip=True,
                )
                return pod["id"], gpu
            except Exception as e:
                if "no longer any instances available" in str(e):
                    log("  unavailable, trying next.")
                    continue
                raise
        raise Refusal("no A100 80GB available in SECURE cloud; try later")

    def ssh_endpoint(self, pod_id: str, wait_s: int = 300) -> tuple[str, int] | None:
        deadline = time.time() + wait_s
        while time.time() < deadline:
            info = self._runpod.get_pod(pod_id) or {}
            for port in (info.get("runtime") or {}).get("ports") or []:
                if port.get("privatePort") == 22 and port.get("isIpPublic"):
                    host, public = str(port.get("ip")), int(port.get("publicPort"))
                    if re.fullmatch(r"[0-9.]+", host):
                        return host, public
            time.sleep(5)
        return None

    def terminate(self, pod_id: str) -> None:
        self._runpod.terminate_pod(pod_id)


def ssh_options() -> list[str]:
    return [
        "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null", "-o", "LogLevel=ERROR",
        "-o", "ServerAliveInterval=30", "-o", "ServerAliveCountMax=120", "-o", "TCPKeepAlive=yes",
    ]


def make_bundle(rows: Path, images: Path, dest: Path) -> None:
    with tarfile.open(dest, "w:gz") as tar:
        for rel in BUNDLED:
            tar.add(TRAINING / rel, arcname=f"training/{rel}")
        tar.add(rows, arcname="data/rows.jsonl")
        tar.add(images, arcname="data/images")


def verify_copy(local: Path) -> list[str]:
    """Every file named in each SHA256SUMS under `local` exists and hashes to its recorded value."""
    bad = []
    sums = list(local.rglob("SHA256SUMS"))
    if not sums:
        return ["no SHA256SUMS copied off"]
    for listing in sums:
        for line in listing.read_text().splitlines():
            digest, _, name = line.partition("  ")
            path = listing.parent / name
            if not path.is_file():
                bad.append(f"{path} missing")
                continue
            h = hashlib.sha256()
            with path.open("rb") as f:
                for chunk in iter(lambda: f.read(1 << 20), b""):
                    h.update(chunk)
            if h.hexdigest() != digest:
                bad.append(f"{path} sha256 mismatch")
    return bad


def copy_off(opts: list[str], host: str, port: int, out: Path) -> list[str]:
    """Stream /root/out off the pod as a tar, then check every recorded sha256. Empty means verified."""
    sender = subprocess.Popen(["ssh", *opts, "-p", str(port), f"root@{host}", "tar", "-C", REMOTE_OUT, "-cf", "-", "."], stdout=subprocess.PIPE)
    receiver = subprocess.run(["tar", "-xf", "-", "-C", str(out)], stdin=sender.stdout)
    sender.stdout.close()
    if sender.wait() != 0 or receiver.returncode != 0:
        return [f"copy failed (ssh {sender.returncode}, tar {receiver.returncode})"]
    return verify_copy(out)


def run(client: RunPodClient, plan: Plan, rows: Path, images: Path, out: Path, seq_cap: int | None) -> int:
    public_key = Path(os.path.expanduser("~/.ssh/id_ed25519.pub")).read_text().strip()
    pod_id, gpu = client.create(plan, public_key)
    started = time.time()
    log(f"Pod {pod_id} on {gpu}. Kill it any time: python3 training/pod/pod.py kill {pod_id}")
    endpoint = client.ssh_endpoint(pod_id)
    if not endpoint:
        log("SSH endpoint never appeared; nothing ran, so the pod is terminated.")
        client.terminate(pod_id)
        return 1
    host, port = endpoint
    opts = ssh_options()
    log(f"SSH up: root@{host}:{port}. Waiting 30s for container boot...")
    time.sleep(30)

    with tempfile.TemporaryDirectory() as tmp:
        bundle = Path(tmp) / "bundle.tgz"
        make_bundle(rows, images, bundle)
        subprocess.run(["scp", *opts, "-P", str(port), str(bundle), f"root@{host}:/root/bundle.tgz"], check=True)

    log(f"Running {plan.job}. Reattach: ssh -p {port} root@{host} 'tail -f /root/run.log'")
    saw_success, timed_out, exit_code = False, False, 2
    try:
        proc = subprocess.Popen(["ssh", *opts, "-p", str(port), f"root@{host}", "bash", "-s"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
        proc.stdin.write(remote_script(plan.job, seq_cap))
        proc.stdin.close()
        for line in proc.stdout:
            print(line, end="", flush=True)
            saw_success = saw_success or SUCCESS in line
            if time.time() - started > JOBS[plan.job].timeout_h * 3600:
                proc.kill()
                timed_out = True
                break
        proc.wait()
        exit_code = proc.returncode
    except Exception as e:
        log(f"SSH/exec failed: {type(e).__name__}: {e}")

    copied: list[str] = ["not attempted"]
    if exit_code == 0 and saw_success:
        out.mkdir(parents=True, exist_ok=True)
        copied = copy_off(opts, host, port, out)

    hours = (time.time() - started) / 3600
    cost = {"pod": pod_id, "gpu": gpu, "price_usd_hr": plan.price_usd_hr, "hours": round(hours, 3), "estimated_usd": round(hours * plan.price_usd_hr, 2)}
    out.mkdir(parents=True, exist_ok=True)
    (out / "cost.json").write_text(json.dumps(cost, indent=2))
    log(f"Wall {hours:.2f} h, about ${cost['estimated_usd']:.2f} so far.")

    if exit_code == 0 and saw_success and not copied:
        log(f"Artifacts copied to {out} and verified. Terminating pod {pod_id}.")
        client.terminate(pod_id)
        return 0
    log(f"NOT terminated (exit={exit_code}, success={saw_success}, timed_out={timed_out}, copy={copied}).")
    log(f"Pod {pod_id} keeps billing ${plan.price_usd_hr:.2f}/h until killed.")
    log(f"  Inspect: ssh -p {port} root@{host} 'tail -100 /root/run.log'")
    log(f"  Recover: ssh -p {port} root@{host} tar -C {REMOTE_OUT} -cf - . | tar -xf - -C {out}")
    log(f"  Kill:    python3 training/pod/pod.py kill {pod_id}")
    return 1


def parse_cli(argv=None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="job", required=True)
    for name in JOBS:
        sp = sub.add_parser(name)
        sp.add_argument("--budget", type=float, default=None, help="USD this run may cost at most (required)")
        sp.add_argument("--confirm", action="store_true", help="actually launch; without it the plan is only printed")
        sp.add_argument("--rows", type=Path, help="build_from_pi.py output")
        sp.add_argument("--images", type=Path, help="images directory build_from_pi.py wrote")
        sp.add_argument("--out", type=Path, default=TRAINING / "runs" / time.strftime("%Y%m%d-%H%M%S"))
        if name == "full":
            sp.add_argument("--seq-cap", type=int, required=True, help="from the smoke report")
    kill = sub.add_parser("kill", help="terminate a pod (reduces spend, so no budget is needed)")
    kill.add_argument("pod_id")
    return p.parse_args(argv)


def free_bytes_at(path: Path) -> int:
    probe = path
    while not probe.exists():
        probe = probe.parent
    return shutil.disk_usage(probe).free


def main(argv=None) -> int:
    cli = parse_cli(argv)
    if cli.job == "kill":
        key = os.environ.get("RUNPOD_API_KEY")
        if not key:
            print("RUNPOD_API_KEY missing", file=sys.stderr)
            return 2
        if not re.fullmatch(r"[A-Za-z0-9]+", cli.pod_id):
            print("pod id must be alphanumeric", file=sys.stderr)
            return 2
        RunPodClient(key).terminate(cli.pod_id)
        log(f"Terminated {cli.pod_id}.")
        return 0

    try:
        offline_guard(cli.budget, cli.job, free_bytes_at(cli.out))
        n = check_inputs(cli.rows, cli.images)
    except Refusal as e:
        print(f"REFUSED: {e}", file=sys.stderr)
        return 2
    log(f"{n} rows checked locally.")
    key = os.environ.get("RUNPOD_API_KEY")
    if not key:
        print("REFUSED: RUNPOD_API_KEY missing from the environment", file=sys.stderr)
        return 2
    if not Path(os.path.expanduser("~/.ssh/id_ed25519.pub")).is_file():
        print("REFUSED: ~/.ssh/id_ed25519.pub missing (the pod is reached over SSH)", file=sys.stderr)
        return 2

    client = RunPodClient(key)
    try:
        plan = plan_launch(cli.budget, cli.job, client.prices(), client.balance(), cli.confirm, free_bytes_at(cli.out))
    except Refusal as e:
        print(f"REFUSED: {e}", file=sys.stderr)
        return 2
    for line in plan.lines():
        print(line)
    if not plan.launch:
        print("Not launched. Re-run with --confirm to start the pod at this price.")
        return 3
    return run(client, plan, cli.rows, cli.images, cli.out, getattr(cli, "seq_cap", None))


if __name__ == "__main__":
    sys.exit(main())
