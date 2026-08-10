// twin/skills/intake/test/csv.test.ts
import { describe, it, expect } from "bun:test";
import { parseCsv } from "../scripts/csv.mjs";

describe("parseCsv", () => {
  it("should parse a plain table", () => {
    expect(parseCsv("a,b\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("should keep a comma that lives inside quotes", () => {
    expect(parseCsv('name,value\n"Annemasse, Haute-Savoie",42\n')).toEqual([
      ["name", "value"],
      ["Annemasse, Haute-Savoie", "42"],
    ]);
  });

  it("should keep a newline that lives inside quotes", () => {
    expect(parseCsv('a\n"line one\nline two"\n')).toEqual([
      ["a"],
      ["line one\nline two"],
    ]);
  });

  it("should unescape a doubled quote", () => {
    expect(parseCsv('a\n"he said ""no"""\n')).toEqual([
      ["a"],
      ['he said "no"'],
    ]);
  });

  it("should accept CRLF line endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("should not emit a trailing empty row", () => {
    expect(parseCsv("a\n1\n")).toHaveLength(2);
  });

  it("should treat a lone CR (no paired LF) as a row terminator, not field text", () => {
    expect(parseCsv("a,b\r1,2\r")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});
