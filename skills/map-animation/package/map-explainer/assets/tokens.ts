// Water-Wars motion brand tokens.
export const COLORS = {
  bg: "#0e0f12", // charcoal canvas (matches keyframes review surface)
  // Electric water — a near-white icy core with a blue glow and a white-hot draw-head (the "electricity"
  // travels along the river as it draws on). No dark casing.
  river: "#E8F7FF", // bright icy core
  riverGlow: "rgba(73,198,255,0.5)", // electric-blue glow
  riverHead: "#FFFFFF", // white-hot leading head
  riverHeadGlow: "rgba(120,225,255,0.95)",
  border: "#f5f2ed", // neutral cream country borders/labels over the colored fills
  cream: "#f5f0eb",
} as const;

// Progressive country fills (Pilot A). China = brand amber, India = brand steel-teal,
// Bangladesh = clay (a deliberate brand extension — confirmed 2026-06-16). Each fades in as the
// draw-on river reaches it; rendered at FILL_OPACITY over the dark base ≈ the "~55% tint" look.
export const COUNTRY = {
  china: "#D4A853", // brand primary — upstream dam-builder / story focus
  india: "#5B8A8A", // brand secondary
  bangladesh: "#C07B57", // clay — muted terracotta, warm, distinct from gold and teal
} as const;
// Darker shade of each country colour — the settled border line (the bright COUNTRY colour is the
// glowing draw-head that leads the animation).
export const COUNTRY_DARK = {
  china: "#9A7530",
  india: "#3C5C5C",
  bangladesh: "#855239",
} as const;
export const FILL_OPACITY = 0.5;

export const VIDEO = { width: 1920, height: 1080, fps: 30 } as const;

// Beat durations (seconds → frames at VIDEO.fps)
export const DUR = {
  pilotA: 12 * VIDEO.fps, // river reveal + sequential country animate-ins (border draw → fill → label)
  pilotB: 8 * VIDEO.fps, // Great Bend 3D flythrough — straight corridor, stare ahead, fly through
  cesium: 24 * VIDEO.fps, // Cesium helicopter flythrough — slow peaceful glide, smooth curved corridor

} as const;
