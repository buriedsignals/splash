/**
 * A DIRECTION FILES THE LINE ITS REGISTERS SET ON, AS A COEFFICIENT OF THE FACE'S OWN LINE.
 *
 * The leading used to be typed into every component as `fontSize * 1.22`, a number no direction
 * owned and no face moved. It is now a column of the register table, and a row without it is
 * refused rather than defaulted: a default would be the typed number again, hidden one level down.
 */
import { describe, it, expect } from "bun:test";
import { filedDirections } from "#shared/design-base/index.mjs";
import { readDirectionFromMarkdown } from "#shared/design-base/read-direction.mjs";
import { resolveRegister } from "#shared/chart-beat/registers.mjs";

const record = ({
  row,
  source = "- leadingSource: chosen",
}: {
  row: string;
  source?: string;
}) => `# probe

- name: Probe
${source}

| register | family | size | weight | italic | tracking | case | ink | leading |
| --- | --- | ---: | ---: | --- | ---: | --- | --- | ---: |
${row}
`;
const WITH = "| display | serif | 30 | 700 | no | 0 | none | ink | 0.9706 |";
const WITHOUT = "| display | serif | 30 | 700 | no | 0 | none | ink |";

describe("a direction's leading", () => {
  it("should read the leading a register row files", () => {
    expect(
      readDirectionFromMarkdown(record({ row: WITH }), "probe").registers
        .display.leading,
    ).toBe(0.9706);
  });

  it("should refuse a register row that files no leading", () => {
    expect(() =>
      readDirectionFromMarkdown(record({ row: WITHOUT }), "probe"),
    ).toThrow(/leading/);
  });

  it("should refuse a leading outside 0.7 to 2.0", () => {
    expect(() =>
      readDirectionFromMarkdown(
        record({ row: WITH.replace("0.9706", "145") }),
        "probe",
      ),
    ).toThrow(/leading/);
  });

  it("should refuse a record that does not say whether its leading was measured or chosen", () => {
    expect(() =>
      readDirectionFromMarkdown(record({ row: WITH, source: "" }), "probe"),
    ).toThrow(/leadingSource/);
  });

  it("should give every register of every filed direction a leading", () => {
    for (const direction of filedDirections())
      for (const [name, spec] of Object.entries<any>(direction.registers))
        expect([direction.id, name, typeof spec.leading]).toEqual([
          direction.id,
          name,
          "number",
        ]);
  });

  it("should hand the leading through resolveRegister", () => {
    const direction = readDirectionFromMarkdown(record({ row: WITH }), "probe");
    expect(resolveRegister(direction, "display").leading).toBe(0.9706);
  });

  it("should give a derived apparatus register the leading of the voice it derives from", () => {
    const direction = {
      id: "probe",
      registers: {
        annot: {
          family: "Open Sans",
          size: 10,
          weight: 700,
          italic: false,
          tracking: 0,
          transform: "none",
          ink: "ink",
          leading: 1.028,
        },
      },
    };
    expect(resolveRegister(direction, "place", { family: "map" }).leading).toBe(
      1.028,
    );
  });
});
