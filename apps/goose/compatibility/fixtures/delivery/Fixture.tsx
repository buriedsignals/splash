import React from "react";
import rows from "./data.json";

export function Fixture() {
  return React.createElement("p", null, `Deterministic closure rows: ${rows.length}`);
}
