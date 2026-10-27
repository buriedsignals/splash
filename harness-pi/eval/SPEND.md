# Spend ledger

Caps: OpenRouter $15.00 · RunPod 50.00 € (billable to Tom).
RunPod draws: smoke ≤ 5 €, first cycle (train + merge + GGUF + evaluation) ≤ 25 €, each later cycle ≤ the remaining balance.
Rate: 1 USD = ? EUR on ? (set both on the day of a pod: pod.py refuses a missing rate or one from another day).

One line per paid action, written by the tool that spent it (`eval/teacher.ts`, `training/pod/pod.py`) before the next
one starts. `total` is that service's running total, in dollars for OpenRouter and in euros for RunPod.

| date | step | service | quantity | usd | eur | total |
|---|---|---|---|---|---|---|
