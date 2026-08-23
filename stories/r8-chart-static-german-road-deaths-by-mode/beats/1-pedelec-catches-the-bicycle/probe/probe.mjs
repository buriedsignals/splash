import { readFile } from "node:fs/promises";
import { measureText, measureTextBand, contrast, deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { NON_TEXT_CONTRAST_FLOOR, textContrastFloor } from "#shared/chart-beat/annotation-ink.mjs";
const svg = await readFile("/Users/rmdms/Sites/Professional/splash/stories/r8-chart-static-german-road-deaths-by-mode/beats/1-pedelec-catches-the-bicycle/renders/pedelec-catches-the-bicycle-still.svg", "utf8");
// the annotation text element and the accent path
const txt = /<text x="([\d.]+)" y="([\d.]+)" fill="#D4A853" font-size="(\d+)">([^<]*)<\/text>/.exec(svg);
console.log("annotation:", txt && txt.slice(1));
const accent = /<path d="(M[^"]*)" fill="none" stroke="#D4A853"/.exec(svg);
const pts = accent[1].replace(/^M/, "").split("L").map(s => s.split(",").map(Number));
console.log("accent points:", JSON.stringify(pts));
const x = Number(txt[1]), y = Number(txt[2]), fs = Number(txt[3]);
const band = measureTextBand(txt[4], { fontSize: fs, fontWeight: 400 });
console.log("text band:", JSON.stringify(band));
const w = measureText(txt[4], { fontSize: fs, fontWeight: 400 });
const box = { left: x, right: x + w, top: y + (band.top ?? -fs*0.8), bottom: y + (band.bottom ?? fs*0.2) };
console.log("ink box:", JSON.stringify(box));
// does any accent segment pass through the box?
for (let i = 0; i + 1 < pts.length; i++) {
  const [x1,y1] = pts[i], [x2,y2] = pts[i+1];
  // sample
  for (let t = 0; t <= 1; t += 0.02) {
    const px = x1 + (x2-x1)*t, py = y1 + (y2-y1)*t;
    if (px >= box.left && px <= box.right && py >= box.top && py <= box.bottom) {
      console.log(`COLLISION: accent segment ${i} (${x1.toFixed(0)},${y1.toFixed(0)})->(${x2.toFixed(0)},${y2.toFixed(0)}) enters the annotation's ink box at (${px.toFixed(0)},${py.toFixed(0)})`);
      console.log("accent text on accent stroke measures", contrast("#D4A853", "#D4A853").toFixed(2) + ":1, floor", textContrastFloor({fontSize: fs, fontWeight: 400}));
      i = pts.length; break;
    }
  }
}

// The nearest the accent stroke comes to the annotation's ink box, in frame px — printed whether or
// not it collides, so a clearance can be recorded rather than only a failure.
let nearest = Infinity;
for (let i = 0; i + 1 < pts.length; i++) {
  const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
  for (let t = 0; t <= 1; t += 0.005) {
    const px = x1 + (x2 - x1) * t, py = y1 + (y2 - y1) * t;
    if (px < box.left || px > box.right) continue;
    nearest = Math.min(nearest, Math.abs(py - box.bottom), Math.abs(py - box.top));
  }
}
console.log(`nearest approach of the accent stroke to the annotation's ink box: ${Number.isFinite(nearest) ? nearest.toFixed(1) + "px" : "the stroke never passes under it"}`);
