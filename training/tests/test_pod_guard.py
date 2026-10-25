"""The pod launcher refuses to spend before it can reach the network, and never launches unconfirmed."""

import contextlib
import io
import json
import os
import socket
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

POD_DIR = Path(__file__).resolve().parents[1] / "pod"
sys.path.insert(0, str(POD_DIR))
import pod  # noqa: E402

A100 = pod.GPU_CANDIDATES[0]
FAKE_KEY = "rpa_FAKEKEYNEVERVALID0000"


def no_network(*_args, **_kwargs):
    raise AssertionError("a network call was attempted")


@contextlib.contextmanager
def network_tripwire():
    with mock.patch.object(socket.socket, "connect", no_network), mock.patch.object(socket, "create_connection", no_network), mock.patch.object(socket, "getaddrinfo", no_network):
        yield


def run_main(argv, env):
    out, err = io.StringIO(), io.StringIO()
    with network_tripwire(), mock.patch.dict(os.environ, env, clear=True), contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        code = pod.main(argv)
    return code, out.getvalue() + err.getvalue()


class Inputs:
    def __init__(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.images = root / "images"
        self.images.mkdir()
        (self.images / "a.png").write_bytes(b"\x89PNG")
        self.rows = root / "rows.jsonl"
        row = {
            "meta": {"story": "some-training-story"},
            "tools": [],
            "messages": [
                {"role": "system", "content": "S"},
                {"role": "user", "content": [{"type": "image", "image": "/elsewhere/a.png"}, {"type": "text", "text": "look"}]},
                {"role": "assistant", "content": "DONE"},
            ],
        }
        self.rows.write_text(json.dumps(row) + "\n")
        self.out = root / "out"

    def args(self, job="smoke", *extra):
        return [job, "--rows", str(self.rows), "--images", str(self.images), "--out", str(self.out), *extra]


class OfflineGuardTest(unittest.TestCase):
    def test_should_refuse_when_no_budget_is_given(self):
        with self.assertRaisesRegex(pod.Refusal, "--budget"):
            pod.offline_guard(None, "smoke")

    def test_should_refuse_a_budget_below_the_minimum_smoke_run(self):
        floor = pod.worst_case("smoke", pod.PRICE_CEILING_USD_HR)
        with self.assertRaisesRegex(pod.Refusal, "minimum smoke run"):
            pod.offline_guard(floor - 0.01, "smoke")

    def test_should_refuse_a_non_positive_or_non_finite_budget(self):
        for budget in (0.0, -5.0, float("nan"), float("inf")):
            with self.subTest(budget=budget), self.assertRaises(pod.Refusal):
                pod.offline_guard(budget, "smoke")

    def test_should_refuse_when_the_local_disk_cannot_hold_the_artifacts(self):
        with self.assertRaisesRegex(pod.Refusal, "GB free"):
            pod.offline_guard(50.0, "full", free_bytes=int(7 * pod.GB))

    def test_should_pass_a_budget_that_covers_the_smoke_run(self):
        pod.offline_guard(pod.worst_case("smoke", pod.PRICE_CEILING_USD_HR), "smoke")


class PlanTest(unittest.TestCase):
    def test_should_not_launch_without_confirm(self):
        plan = pod.plan_launch(20.0, "smoke", {A100: 1.89}, 50.0, confirm=False)
        self.assertFalse(plan.launch)

    def test_should_launch_only_with_confirm(self):
        self.assertTrue(pod.plan_launch(20.0, "smoke", {A100: 1.89}, 50.0, confirm=True).launch)

    def test_should_report_the_hours_the_budget_allows_at_the_quoted_price(self):
        plan = pod.plan_launch(20.0, "smoke", {A100: 2.0}, 50.0, confirm=False)
        self.assertAlmostEqual(plan.max_hours, 20.0 / (2.0 * pod.COST_MARGIN))

    def test_should_print_the_gpu_and_the_hourly_price(self):
        text = "\n".join(pod.plan_launch(20.0, "smoke", {A100: 1.89}, 50.0, confirm=False).lines())
        self.assertTrue("A100 80GB" in text and "$1.89/h" in text)

    def test_should_price_the_most_expensive_candidate_it_may_fall_through_to(self):
        plan = pod.plan_launch(20.0, "smoke", {pod.GPU_CANDIDATES[0]: 1.5, pod.GPU_CANDIDATES[1]: 1.9}, 50.0, confirm=False)
        self.assertEqual(plan.price_usd_hr, 1.9)

    def test_should_refuse_when_the_budget_cannot_cover_the_job_at_the_quoted_price(self):
        with self.assertRaisesRegex(pod.Refusal, "may take"):
            pod.plan_launch(6.0, "full", {A100: 1.89}, 50.0, confirm=True)

    def test_should_refuse_a_balance_below_the_worst_case_with_both_numbers(self):
        with self.assertRaisesRegex(pod.Refusal, r"balance \$1\.00 is below the worst case \$\d+\.\d\d"):
            pod.plan_launch(20.0, "smoke", {A100: 1.89}, 1.0, confirm=True)

    def test_should_refuse_an_unknown_balance(self):
        with self.assertRaisesRegex(pod.Refusal, "balance unknown"):
            pod.plan_launch(20.0, "smoke", {A100: 1.89}, None, confirm=True)

    def test_should_refuse_a_price_above_the_ceiling(self):
        with self.assertRaisesRegex(pod.Refusal, "ceiling"):
            pod.plan_launch(50.0, "smoke", {A100: pod.PRICE_CEILING_USD_HR + 0.5}, 100.0, confirm=True)

    def test_should_refuse_when_no_price_is_quoted(self):
        with self.assertRaisesRegex(pod.Refusal, "no SECURE price"):
            pod.plan_launch(20.0, "smoke", {A100: None}, 50.0, confirm=True)


class CliTest(unittest.TestCase):
    def setUp(self):
        self.inputs = Inputs()
        self.addCleanup(self.inputs.tmp.cleanup)

    def test_should_exit_before_any_api_call_without_a_budget(self):
        with mock.patch.object(pod, "RunPodClient", side_effect=AssertionError("client built")):
            code, _ = run_main(self.inputs.args(), {"RUNPOD_API_KEY": FAKE_KEY})
        self.assertNotEqual(code, 0)

    def test_should_say_the_budget_is_required(self):
        _, text = run_main(self.inputs.args(), {"RUNPOD_API_KEY": FAKE_KEY})
        self.assertIn("--budget", text)

    def test_should_refuse_a_budget_too_small_for_the_smoke_run_before_any_api_call(self):
        with mock.patch.object(pod, "RunPodClient", side_effect=AssertionError("client built")):
            code, text = run_main(self.inputs.args("smoke", "--budget", "1", "--confirm"), {"RUNPOD_API_KEY": FAKE_KEY})
        self.assertTrue(code != 0 and "minimum smoke run" in text)

    def test_should_not_launch_with_a_budget_but_no_key(self):
        code, text = run_main(self.inputs.args("smoke", "--budget", "20"), {})
        self.assertTrue(code != 0 and "RUNPOD_API_KEY missing" in text)

    def test_should_refuse_a_row_whose_image_is_not_in_the_images_dir(self):
        (self.inputs.images / "a.png").unlink()
        code, text = run_main(self.inputs.args("smoke", "--budget", "20"), {"RUNPOD_API_KEY": FAKE_KEY})
        self.assertTrue(code != 0 and "a.png is not in" in text)

    def test_should_refuse_a_held_out_story(self):
        heldout = json.loads((Path(__file__).resolve().parents[1] / "heldout.json").read_text())[0]
        row = json.loads(self.inputs.rows.read_text())
        row["meta"]["story"] = heldout
        self.inputs.rows.write_text(json.dumps(row) + "\n")
        code, text = run_main(self.inputs.args("smoke", "--budget", "20"), {"RUNPOD_API_KEY": FAKE_KEY})
        self.assertTrue(code != 0 and "held-out" in text)

    def test_should_never_print_the_api_key(self):
        _, text = run_main(self.inputs.args("smoke", "--budget", "1"), {"RUNPOD_API_KEY": FAKE_KEY})
        self.assertNotIn(FAKE_KEY, text)

    def test_should_refuse_without_a_budget_as_a_real_process(self):
        env = {"PATH": os.environ.get("PATH", ""), "RUNPOD_API_KEY": FAKE_KEY}
        proc = subprocess.run([sys.executable, "-I", str(POD_DIR / "pod.py"), *self.inputs.args()], env=env, capture_output=True, text=True, timeout=60)
        self.assertTrue(proc.returncode == 2 and "--budget" in proc.stderr and FAKE_KEY not in proc.stdout + proc.stderr)


class RemoteScriptTest(unittest.TestCase):
    def test_should_keep_heavy_files_off_workspace(self):
        script = pod.remote_script("full", 65536) + "\n".join(pod.JOBS["full"].commands)
        self.assertNotIn("/workspace", script)

    def test_should_end_with_the_success_marker_after_checksums(self):
        script = pod.remote_script("smoke", None)
        self.assertLess(script.index("sha256sum"), script.index(pod.SUCCESS))


class VerifyCopyTest(unittest.TestCase):
    def test_should_reject_a_copy_whose_hash_does_not_match(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "adapter.bin").write_bytes(b"real")
            (root / "SHA256SUMS").write_text("0" * 64 + "  ./adapter.bin\n")
            self.assertEqual(len(pod.verify_copy(root)), 1)

    def test_should_accept_a_copy_whose_hashes_match(self):
        import hashlib

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "adapter.bin").write_bytes(b"real")
            (root / "SHA256SUMS").write_text(hashlib.sha256(b"real").hexdigest() + "  ./adapter.bin\n")
            self.assertEqual(pod.verify_copy(root), [])


if __name__ == "__main__":
    unittest.main()
