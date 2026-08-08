import { describe, it, expect } from "bun:test";
import { specToNativeConfig, type NativeSpec } from "../src/spec-to-config";

// MUTATION-VERIFIED, one break at a time (`git diff --stat` confirmed each edit landed before
// the run; `git checkout --` restored between them):
//   - dropping the per-row OHLC check from the mapper → "checks the acronym reading it just
//     made, naming the period that breaks it" FAILS.
//   - taking the period's date out of that message → the same test FAILS on /2024-03/.
//   - accepting fewer than four numeric columns (padding with the last) → "refuses data that
//     is not OHLC, by name" FAILS.
//   - defaulting `priceLabel` to the unit → "refuses an unlabelled price axis" FAILS.
//   - ignoring `spec.ohlc` and always reading acronym order → "takes an explicit column map
//     when the CSV is in another order" FAILS.

const base: Omit<NativeSpec, "data"> = {
  nativeType: "candlestick",
  title: "Riverton's market clawed back its spring losses by December",
  unit: "Riverton Composite index, monthly open-high-low-close",
  priceLabel: "index level",
  source: { name: "Riverton Composite index" },
} as Omit<NativeSpec, "data">;

const spec = (data: string, extra: Partial<NativeSpec> = {}): NativeSpec =>
  ({ ...base, data, ...extra }) as NativeSpec;

const OK = `date,open,high,low,close
2024-01,5000,5120,4950,5080
2024-02,5080,5150,4980,5010
2024-03,5010,5040,4760,4800`;

describe("the candlestick mapper — the acronym is the order, and the order is checked", () => {
  it("reads the four numeric columns as open, high, low, close", () => {
    const { type, config } = specToNativeConfig(spec(OK));
    expect(type).toBe("candlestick");
    expect((config.periods as Record<string, number>[])[0]).toMatchObject({
      open: 5000,
      high: 5120,
      low: 4950,
      close: 5080,
    });
  });

  it("checks the acronym reading it just made, naming the period that breaks it", () => {
    // The same numbers with high and low swapped — a mis-ordered CSV. Read blindly this
    // inverts nothing visible; checked, it stops on the first row and says which.
    const swapped = `date,open,low,high,close
2024-01,5000,4950,5120,5080
2024-03,5010,4760,5040,4800`;
    expect(() => specToNativeConfig(spec(swapped))).toThrow(/2024-01/);
    expect(() => specToNativeConfig(spec(swapped))).toThrow(/not valid OHLC/);
  });

  it("takes an explicit column map when the CSV is in another order", () => {
    const swapped = `date,open,low,high,close
2024-01,5000,4950,5120,5080
2024-03,5010,4760,5040,4800`;
    const { config } = specToNativeConfig(
      spec(swapped, {
        ohlc: { open: "open", high: "high", low: "low", close: "close" },
      } as Partial<NativeSpec>),
    );
    expect((config.periods as Record<string, number>[])[0]).toMatchObject({
      high: 5120,
      low: 4950,
    });
  });

  it("refuses data that is not OHLC, by name", () => {
    const oneValue = `date,close
2024-01,5000
2024-02,5080
2024-03,5010`;
    // Refused by the SHAPE floor before the mapper — and it says what a candlestick needs.
    expect(() => specToNativeConfig(spec(oneValue))).toThrow(
      /FOUR numeric columns/,
    );
    expect(() => specToNativeConfig(spec(oneValue))).toThrow(/line or a bar/);
  });

  it("refuses an unlabelled price axis", () => {
    expect(() =>
      specToNativeConfig(spec(OK, { priceLabel: "  " } as Partial<NativeSpec>)),
    ).toThrow(/priceLabel/);
  });

  it("refuses a named column that is not in the CSV", () => {
    expect(() =>
      specToNativeConfig(
        spec(OK, {
          ohlc: { open: "o", high: "high", low: "low", close: "close" },
        } as Partial<NativeSpec>),
      ),
    ).toThrow(/"o" is not in the CSV/);
  });

  it("keeps the house hue off the candles", () => {
    // Furniture only: the two direction hues plus their legend are the only thing telling a
    // reader which way a period moved.
    const { config } = specToNativeConfig(spec(OK, { baseColor: "#009E73" }));
    expect(config.baseColor).toBe("#009E73");
  });
});
