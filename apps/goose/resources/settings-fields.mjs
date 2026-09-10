export const DESIGN_FIELDS = Object.freeze([
  { id: "name", label: "Newsroom name", required: true, group: "identity" },
  { id: "url", label: "Website", type: "url", placeholder: "https://your-newsroom.com", required: true, group: "identity" },
  { id: "languages", label: "Publishing languages", placeholder: "en, fr", help: "Language codes, primary language first.", required: true, group: "identity" },
  { id: "credit", label: "Credit line", help: "Optional standing credit for your visuals.", group: "identity" },
  { id: "brandColor", label: "Brand colour", placeholder: "#0057b8", pattern: "#[0-9a-fA-F]{6}", required: true, group: "appearance" },
  { id: "ground", label: "Background colour", placeholder: "#ffffff", pattern: "#[0-9a-fA-F]{6}", required: true, group: "appearance" },
  { id: "accents", label: "Accent colours", placeholder: "#e6ac00, #16826b", help: "Optional additional colours, separated by commas.", group: "appearance" },
  { id: "typefaces", label: "Typefaces", placeholder: "Helvetica, Arial", help: "In preferred order, separated by commas.", required: true, group: "appearance" },
]);
