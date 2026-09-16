// shared/map-beat/iso-codes.mjs
//
// THE CANONICAL ISO 3166-1 ALPHA-3 → ALPHA-2 TABLE. A live map beat joins MapTiler Countries on its
// `iso_a2` property (`references/types/hex-grid.md` and its siblings), and every worked example that
// needed the join wrote its OWN `const ISO2 = {...}` covering only the countries ITS OWN subject
// used — 32 in the protection beat, 41 in the wind beat. A fresh beat with even one country outside
// that borrowed table failed one missing code at a time (cold run 6, 2026-09-16): three separate
// refusals (GBR, then ALB, …) instead of one message naming every gap. One table here, read by every
// beat, closes the "silently inherited partial table" problem outright; `iso2CodesFor` closes the
// "one at a time" problem by validating a beat's own whole country list before any lookup runs.

export const ISO3_TO_ISO2 = Object.freeze({
  AFG: "AF", ALA: "AX", ALB: "AL", DZA: "DZ", ASM: "AS", AND: "AD", AGO: "AO", AIA: "AI", ATA: "AQ", ATG: "AG",
  ARG: "AR", ARM: "AM", ABW: "AW", AUS: "AU", AUT: "AT", AZE: "AZ", BHS: "BS", BHR: "BH", BGD: "BD", BRB: "BB",
  BLR: "BY", BEL: "BE", BLZ: "BZ", BEN: "BJ", BMU: "BM", BTN: "BT", BOL: "BO", BES: "BQ", BIH: "BA", BWA: "BW",
  BVT: "BV", BRA: "BR", IOT: "IO", BRN: "BN", BGR: "BG", BFA: "BF", BDI: "BI", CPV: "CV", KHM: "KH", CMR: "CM",
  CAN: "CA", CYM: "KY", CAF: "CF", TCD: "TD", CHL: "CL", CHN: "CN", CXR: "CX", CCK: "CC", COL: "CO", COM: "KM",
  COD: "CD", COG: "CG", COK: "CK", CRI: "CR", CIV: "CI", HRV: "HR", CUB: "CU", CUW: "CW", CYP: "CY", CZE: "CZ",
  DNK: "DK", DJI: "DJ", DMA: "DM", DOM: "DO", ECU: "EC", EGY: "EG", SLV: "SV", GNQ: "GQ", ERI: "ER", EST: "EE",
  SWZ: "SZ", ETH: "ET", FLK: "FK", FRO: "FO", FJI: "FJ", FIN: "FI", FRA: "FR", GUF: "GF", PYF: "PF", ATF: "TF",
  GAB: "GA", GMB: "GM", GEO: "GE", DEU: "DE", GHA: "GH", GIB: "GI", GRC: "GR", GRL: "GL", GRD: "GD", GLP: "GP",
  GUM: "GU", GTM: "GT", GGY: "GG", GIN: "GN", GNB: "GW", GUY: "GY", HTI: "HT", HMD: "HM", VAT: "VA", HND: "HN",
  HKG: "HK", HUN: "HU", ISL: "IS", IND: "IN", IDN: "ID", IRN: "IR", IRQ: "IQ", IRL: "IE", IMN: "IM", ISR: "IL",
  ITA: "IT", JAM: "JM", JPN: "JP", JEY: "JE", JOR: "JO", KAZ: "KZ", KEN: "KE", KIR: "KI", PRK: "KP", KOR: "KR",
  KWT: "KW", KGZ: "KG", LAO: "LA", LVA: "LV", LBN: "LB", LSO: "LS", LBR: "LR", LBY: "LY", LIE: "LI", LTU: "LT",
  LUX: "LU", MAC: "MO", MDG: "MG", MWI: "MW", MYS: "MY", MDV: "MV", MLI: "ML", MLT: "MT", MHL: "MH", MTQ: "MQ",
  MRT: "MR", MUS: "MU", MYT: "YT", MEX: "MX", FSM: "FM", MDA: "MD", MCO: "MC", MNG: "MN", MNE: "ME", MSR: "MS",
  MAR: "MA", MOZ: "MZ", MMR: "MM", NAM: "NA", NRU: "NR", NPL: "NP", NLD: "NL", NCL: "NC", NZL: "NZ", NIC: "NI",
  NER: "NE", NGA: "NG", NIU: "NU", NFK: "NF", MKD: "MK", MNP: "MP", NOR: "NO", OMN: "OM", PAK: "PK", PLW: "PW",
  PSE: "PS", PAN: "PA", PNG: "PG", PRY: "PY", PER: "PE", PHL: "PH", PCN: "PN", POL: "PL", PRT: "PT", PRI: "PR",
  QAT: "QA", REU: "RE", ROU: "RO", RUS: "RU", RWA: "RW", BLM: "BL", SHN: "SH", KNA: "KN", LCA: "LC", MAF: "MF",
  SPM: "PM", VCT: "VC", WSM: "WS", SMR: "SM", STP: "ST", SAU: "SA", SEN: "SN", SRB: "RS", SYC: "SC", SLE: "SL",
  SGP: "SG", SXM: "SX", SVK: "SK", SVN: "SI", SLB: "SB", SOM: "SO", ZAF: "ZA", SGS: "GS", SSD: "SS", ESP: "ES",
  LKA: "LK", SDN: "SD", SUR: "SR", SJM: "SJ", SWE: "SE", CHE: "CH", SYR: "SY", TWN: "TW", TJK: "TJ", TZA: "TZ",
  THA: "TH", TLS: "TL", TGO: "TG", TKL: "TK", TON: "TO", TTO: "TT", TUN: "TN", TUR: "TR", TKM: "TM", TCA: "TC",
  TUV: "TV", UGA: "UG", UKR: "UA", ARE: "AE", GBR: "GB", USA: "US", UMI: "UM", URY: "UY", UZB: "UZ", VUT: "VU",
  VEN: "VE", VNM: "VN", VGB: "VG", VIR: "VI", WLF: "WF", ESH: "EH", YEM: "YE", ZMB: "ZM", ZWE: "ZW",
});

export class MissingIso2CodesError extends Error {
  constructor(codes) {
    super(`no ISO A2 code recorded for ${codes.join(", ")} — the live map joins MapTiler Countries on it`);
    this.name = "MissingIso2CodesError";
    this.codes = codes;
  }
}

/** One ISO 3166-1 alpha-3 code's own alpha-2, or a named, single-code `MissingIso2CodesError`. Kept for a
 *  single lookup (an "origin" country, say) — a beat placing several countries should call `iso2CodesFor`
 *  instead, so every gap is reported together rather than one refusal at a time. */
export function iso2Of(iso3) {
  const code = ISO3_TO_ISO2[iso3];
  if (!code) throw new MissingIso2CodesError([iso3]);
  return code;
}

/** Every code in ONE call, validated up front: every ISO3 code a beat's own data names, checked together
 *  before any lookup runs, so a beat with several codes this table does not carry learns all of them in one
 *  message — never one missing code discovered per refusal. Returns the alpha-2 codes in the same order. */
export function iso2CodesFor(iso3Codes) {
  const missing = [...new Set(iso3Codes)].filter((code) => !ISO3_TO_ISO2[code]);
  if (missing.length) throw new MissingIso2CodesError(missing);
  return iso3Codes.map((code) => ISO3_TO_ISO2[code]);
}
