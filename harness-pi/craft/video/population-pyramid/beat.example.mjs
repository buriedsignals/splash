// beat.mjs for the worked example proof/video-population-pyramid-swiss-age — « Les femmes passent devant les hommes à
// partir de 60-64 ans », told in time. Every number the video draws is COMPUTED from data.json; the crossing is computed
// here and checked again by render-beat.mjs.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [BAND, MALE, FEMALE, YEAR] = [col("age_band"), col("male"), col("female"), col("year")];

// Switzerland's residents in 2023, youngest band first (the foot of the pyramid).
const bands = data.rows.filter((r) => Number(r[YEAR]) === 2023).map((r) => ({ band: r[BAND], left: Number(r[MALE]), right: Number(r[FEMALE]) }));

// The first band where the two halves change places.
const leads = (b) => Math.sign(b.right - b.left);
const flip = bands.findIndex((b, i) => i > 0 && leads(b) !== 0 && leads(b) !== leads(bands[0]));
const crossing = flip > 0 ? bands[flip].band : null;

export default {
  lang: "fr",
  eyebrow: "Démographie · Suisse, 2023",
  entity: "Suisse",
  bands,
  leftName: "Hommes",
  rightName: "Femmes",
  crossing,
  // An axis tick: 100000 → « 100k ».
  tickFormat: (v) => `${v / 1000}k`,
  // A difference printed at the crossing: thousands grouped with a no-break space.
  format: (v) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, " "),
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: ["Les femmes passent devant les hommes à partir de 60-64 ans", "Les femmes devant les hommes dès 60-64 ans"],
  source: ["Source : ONU, World Population Prospects (2024), via Our World in Data", "Source : ONU, World Population Prospects, via Our World in Data"],
  evidenceLevels: 3,
  check() {
    if (crossing !== "60-64") throw new Error(`the title says the halves cross at 60-64; the data says ${crossing}`);
    const at = bands.findIndex((b) => b.band === crossing);
    const back = bands.filter((b, i) => i > at && !(b.right > b.left));
    if (back.length) throw new Error(`the title says the women stay ahead from 60-64; ${back.map((b) => b.band).join(", ")} do not`);
  },
};
