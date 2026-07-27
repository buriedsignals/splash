import { test, expect } from "bun:test";
import {
  SOURCE_POLICY_CODES,
  sourceFail,
  sourceOk,
  toVerbResult,
} from "./result";

test("should carry the value on a successful result", () => {
  expect(sourceOk(3)).toEqual({ ok: true, value: 3 });
});

test("should carry the domain code on a refusal", () => {
  const r = sourceFail("missing-url", "no url");
  expect(r).toEqual({ ok: false, code: "missing-url", message: "no url" });
});

test("should map every source policy code to invalid-request through toVerbResult", () => {
  for (const code of SOURCE_POLICY_CODES) {
    const converted = toVerbResult(sourceFail(code, `refused: ${code}`));
    expect(converted.ok).toBe(false);
    if (converted.ok) throw new Error("unreachable");
    expect(converted.code).toBe("invalid-request");
    // The domain code survives in the message — a verb caller must still be able to
    // tell "no url" from "url is a homepage" without a second call.
    expect(converted.message).toContain(code);
  }
});

test("should pass a successful result through toVerbResult unchanged", () => {
  expect(toVerbResult(sourceOk("kept"))).toEqual({ ok: true, value: "kept" });
});
