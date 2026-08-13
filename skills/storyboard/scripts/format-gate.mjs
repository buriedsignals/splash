const FORMAT_COPY = {
  static: {
    label: "Static / print",
    tradeoff: "one fixed graphic, suitable for print and non-interactive placement",
  },
  web: {
    label: "Interactive web",
    tradeoff: "a responsive page with exact values available on hover, tap, and keyboard focus",
  },
  video: {
    label: "Video",
    tradeoff: "a timed build for broadcast or social video",
  },
  scrolly: {
    label: "Scrollytelling",
    tradeoff: "a fixed visual whose state changes with the article's scroll sequence",
  },
};

export const PUBLICATION_FORMATS = Object.freeze(Object.keys(FORMAT_COPY));

/** Render the complete G2b decision and nothing from a later storyboard movement. */
export function formatPublicationFormatGate({ recommended, rationale, options }) {
  if (!PUBLICATION_FORMATS.includes(recommended)) {
    throw new Error(`recommended publication format must be one of ${PUBLICATION_FORMATS.join(", ")}`);
  }
  if (!rationale?.trim()) throw new Error("the publication-format recommendation needs a rationale");
  const byFormat = new Map((options ?? []).map((option) => [option.format, option]));
  const recommendation = byFormat.get(recommended);
  if (!recommendation?.reachable) {
    throw new Error(`recommended publication format ${recommended} is not reachable`);
  }

  const lines = [
    "Which publication format should Splash make first?",
    "",
    `Recommended: **${FORMAT_COPY[recommended].label}**, because ${rationale.trim()}`,
    "",
  ];
  for (const format of PUBLICATION_FORMATS) {
    const option = byFormat.get(format);
    const copy = FORMAT_COPY[format];
    if (option?.reachable) {
      lines.push(`- **${copy.label}:** ${copy.tradeoff}.`);
    } else {
      const reason = option?.why?.trim() || "this medium has no producer and delivery path for it";
      lines.push(`- **${copy.label}:** unavailable — ${reason}.`);
    }
  }
  lines.push("", "Which should I produce first?");
  return lines.join("\n");
}
