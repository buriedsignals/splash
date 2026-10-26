// beat.mjs for the worked example proof/web-dot-density-europe-stations — "72 centrales nucléaires
// sur 8 299 — et 36 % de la puissance". The columns, the three treatments and the WORDS are this
// story's; every number in a sentence is taken from the reading the render hands a word function.
// The dot values, the scatter, the camera and the colours are the kit's.

// The page is French; fr-FR's narrow no-break spaces are replaced by the render (plain()).
const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const count = (n) => n.toLocaleString("fr-FR");

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  // THE COLUMNS, by name: where a place is, what it is worth, which country it is in.
  lon: "lon",
  lat: "lat",
  value: "capacity_mw",
  country: "country",
  // The four low-carbon fuels the takeaway counts, minus the rows the file places outside Europe.
  where: { fuel: ["Nuclear", "Hydro", "Wind", "Solar"] },
  exclude: { country: ["Algeria", "Iraq", "Morocco", "Syrian Arab Republic", "Tunisia"] },
  // The three treatments: the subject (the accent), a second group, every other category.
  subject: { fuel: "Nuclear" },
  second: { fuel: ["Hydro"] },
  categoryNames: { Nuclear: "nucléaire", Hydro: "hydraulique", Wind: "éolien", Solar: "solaire" },
  kinds: ["éolien et solaire", "hydraulique", "nucléaire"],
  names: {
    FRA: "France", DEU: "Allemagne", ESP: "Espagne", ITA: "Italie", GBR: "Royaume-Uni", SWE: "Suède",
    NOR: "Norvège", TUR: "Turquie", POL: "Pologne", CHE: "Suisse", AUT: "Autriche", FIN: "Finlande",
    PRT: "Portugal", NLD: "Pays-Bas", BEL: "Belgique", ROU: "Roumanie", UKR: "Ukraine", RUS: "Russie",
    DNK: "Danemark", GRC: "Grèce", CZE: "Tchéquie", IRL: "Irlande", BGR: "Bulgarie", HUN: "Hongrie",
    SVK: "Slovaquie", SVN: "Slovénie", HRV: "Croatie", SRB: "Serbie", ALB: "Albanie", ISL: "Islande",
    LVA: "Lettonie", LTU: "Lituanie", EST: "Estonie", LUX: "Luxembourg", BLR: "Biélorussie",
    MDA: "Moldavie", MNE: "Monténégro", BIH: "Bosnie-Herz.", MKD: "Macédoine du N.", ARM: "Arménie",
    GEO: "Géorgie",
  },
  // THE THREE RULES: one dot per place, and two values the render DERIVES (v).
  placeRule: { label: "Une centrale", announce: "Un point par centrale — le fichier est un registre de lieux", keyLine: "1 point = une centrale" },
  valueRule: {
    label: (v) => `${count(v)} MW`,
    announce: (v) => `Un point pour ${count(v)} mégawatts de puissance installée`,
    keyLine: (v) => `1 point = ${count(v)} MW`,
  },
  unitNote: (r) =>
    `${count(r.dots)} points pour ${count(r.placeDots)} centrales — la même encre, posée ailleurs : le ${r.subjectName} passe de ${fr(r.subjectInkPlaces, 2)} % à ` +
    `${fr(r.subjectInk, 1)} % de l'encre. Prix de la résolution : ${count(r.silent)} des ${count(r.sites)} sites n'atteignent pas un point et quittent la carte.`,
  coarseNote: (r) =>
    `Dix fois plus gros : ${count(r.dots)} points seulement, et ${count(r.silent)} des ${count(r.sites)} sites disparaissent. C'est le piège du genre montré en face — ` +
    "une vraie concentration devient une poignée de points épars, qui se lit « vide ».",
  kindCount: (n) => `${count(n)} points`,
  count,
  // The pieces a pointer's answer is joined from, in the browser.
  unitValue: (v) => `${fr(v, 0)} MW`,
  share: (v) => `${fr(v)} %`,
  countWord: (n) => `${count(n)} point${n > 1 ? "s" : ""} ici`,
  sep: " · ",
  tail: " du parc bas-carbone de ce pays",
  capacity: (v) => `${fr(v / 1000)} GW`,
  countryDetail: (c) =>
    `${c.name} · ${fr(c.sharePc)} % de la puissance bas-carbone dessinée · ${fr(c.perSite, 0)} MW par site · ` +
    (c.subjectSites ? `${count(c.subjectSites)} du parc nucléaire` : "aucune centrale nucléaire"),
  keyLabel: "Clé :",
  controlLabel: "Ce qu'un point vaut",
  tableCaption: ({ countries }) => `Les ${countries} pays, et les points que la règle choisie leur donne`,
  columns: ["Pays", "Sites", "Puissance", "Points"],
  claimNote: (c) =>
    `${fr(c.subject.perSite, 0)} MW par site pour le ${c.subject.name}, contre ` +
    c.categories.filter((k) => k.key !== c.subject.key).map((k) => `${fr(k.perSite, 0)} pour ${k.name}`).join(", ") +
    ". Le classement est calculé, jamais affirmé.",
  // Which countries the Mercator sentence measures (leave out and the kit takes the three most inflated).
  inflated: ["NOR", "SWE", "FIN"],
  mercator: (m) =>
    `Ce qu'un point vaut est le choix du lecteur, et c'est tout l'argument : sous « une centrale » le ${m.subjectName} est ${fr(m.subjectInkPlaces, 2)} % de l'encre, ` +
    `sous « ${count(m.unit)} MW » il en est ${fr(m.subjectInk, 1)} % — même fichier, même quantité d'encre. Carte MapTiler plate, en Web Mercator : le nord est étiré, ` +
    `donc le même semis y paraît ${fr(m.dilution)} fois moins dense qu'il ne l'est.`,
  reading: (r) =>
    `Lecture : changez ce qu'un point vaut. Les points ne bougent pas d'un pays à l'autre — ils se redéposent là où la puissance est. Un point couvre ${fr(r.groundKm)} km de rayon au ` +
    "sol, et sous une règle en mégawatts les points d'un même site sont posés à un diamètre les uns des autres autour de lui : un point n'est alors plus une adresse, c'est une part de puissance. " +
    "Le tableau ci-dessous suit la même règle, avec ou sans JavaScript.",
  hint:
    "La carte est vivante : molette ou boutons pour zoomer, glisser pour déplacer, flèches du clavier une fois la carte au focus. Survolez un point : tous les points du même site s'allument, et il " +
    "dit sa source, ses mégawatts, son pays et combien de points il a obtenus.",
  title: "72 centrales nucléaires sur 8 299 — et 36 % de la puissance",
  limits: "Toutes les centrales bas-carbone recensées en Europe.",
  source: "Source : Global Power Plant Database (WRI) · fond MapTiler (dataviz-light), teinté par la direction",
  alt: (a) =>
    `Une carte d'Europe sur fond MapTiler, semée de points. Sous la règle par défaut, un point est une centrale : ${count(a.placeDots)} points couvrent l'Europe de l'Ouest et alpine d'un semis ` +
    `dense et continu, plus clair à l'est, et les ${a.subjectSites} points du ${a.subjectName} y sont presque invisibles. Une commande à trois positions redéfinit ce qu'un point vaut ; sous ` +
    `« ${count(a.unit)} MW » les mêmes données donnent ${count(a.unitDots)} points dont ${count(a.subjectDotsUnit)} pour le ${a.subjectName}, groupés en amas autour d'une soixantaine de sites. ` +
    "La carte se zoome et se déplace avec les contrôles de MapTiler.",
  evidenceLevels: 3,
  // The claim checked against the drawn data, at the takeaway's precision.
  check(c) {
    if (c.subject.sites !== 72) throw new Error(`the title says 72 nuclear stations; the data holds ${c.subject.sites}`);
    if (c.sites !== 8299) throw new Error(`the title says 8 299 stations; the data holds ${c.sites}`);
    if (Math.round(c.subject.valueShare) !== 36) throw new Error(`the title says 36 % of the capacity; nuclear holds ${c.subject.valueShare.toFixed(1)} %`);
    if (c.densest !== "Nuclear") throw new Error(`the claim note ranks nuclear the most concentrated per site; ${c.densest} is`);
  },
};
