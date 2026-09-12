// THE STAGE, RECORDED OFF THE REAL PAGE.
//
// The film's picture is not a reconstruction of the landing — it IS the landing,
// driven and filmed. Everything the hero does is WebGL on a shared canvas whose
// choreography is scripted gesture by gesture (`landing/index.html`, `leave()`), and
// none of that survives being rebuilt in React: the loading screen clipped away by the
// rising paper, the webs climbing, the wall settling, the papers lifting off the
// chapter, the field of plates coming at the camera. So the page is opened in a real
// browser with a real GPU, the interface is turned off, the journey is played, and the
// viewport is screencast frame by frame.
//
// What is turned off is the INTERFACE ONLY — the bar, the buttons, the dek, the
// funder, and the page's own headlines, since the film says its own words over them.
// It is turned off with `opacity`, never `display`: the choreography measures these
// elements, and an element that is not laid out is an element whose measurement is
// wrong.
//
// Out: `film/public/stage.mp4`, which `StageFootage.tsx` plays under the type.
//
// Usage:  bun film/capture.mjs [--out <dir>] [--fps 30] [--port 8791]

import { spawn, spawnSync } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

const OUT_DIR = resolve(flag("--out", join(HERE, "public")));
// SIXTY, AND EVERY CAST KEPT. Chrome casts on its compositor's clock, sixty a second,
// and this page holds nearly all of them — measured on a full take: 1199 casts in
// 19.85s, of which 1068 carry a new paint. It does NOT run at twenty-five; that number
// came from counting duplicates in a 30fps resample and reading them backwards.
//
// The resample was the whole problem. Asking ffmpeg for 25 or 30 out of a jittering
// 60 makes it choose, per slot, whichever cast is nearest — so the picture advances by
// two paints, then three, then two. That is the stutter, and it is loudest under the
// push where a paint is a long step. Measured on the take before this one: 13.2, 12.1,
// 12.4, 15.8, 11.0, 13.1, 9.5 … alternating, frame after frame.
//
// So nothing is resampled. Every cast is laid down as one frame of a sixty-a-second
// film, which is exactly what the screen showed.
const FPS = Number(flag("--fps", "60"));
const PORT = Number(flag("--port", "8791"));
const WIDTH = 1920;
const HEIGHT = 1080;
const FRAMES_DIR = join(OUT_DIR, ".frames");

/** A headed browser, because the hero is a raymarched WebGL scene: under a software
 *  rasteriser it renders, but at a frame rate that films as a stutter. */
const CHROME = flag(
  "--chrome",
  "/Users/rmdms/.cache/puppeteer/chrome/mac_arm-151.0.7922.71/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
);

// ---------------------------------------------------------------- the server
// The landing must be SERVED, not opened off the disk: the galley is a canvas read
// back with `toDataURL`, and under `file://` every document is its own opaque origin,
// so the read taints and the reel is lost. (The landing's own `press-assets.js` says
// so at the top.)
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
};
const server = createServer((req, res) => {
  const path = resolve(REPO, "." + decodeURIComponent(req.url.split("?")[0]));
  if (!path.startsWith(REPO) || !existsSync(path)) {
    res.writeHead(404).end("not found");
    return;
  }
  res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" });
  createReadStream(path).pipe(res);
});
await new Promise((ok) => server.listen(PORT, ok));

// ------------------------------------------------------------------ the film
await rm(FRAMES_DIR, { recursive: true, force: true });
await mkdir(FRAMES_DIR, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: false,
  defaultViewport: { width: WIDTH, height: HEIGHT },
  args: [
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
    "--disable-features=CalculateNativeWinOcclusion",
    "--hide-scrollbars",
    `--window-size=${WIDTH},${HEIGHT}`,
  ],
});
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("[page]", e.message));

/** The interface, off. Injected before the document's own scripts run, so no frame is
 *  ever painted with a bar in it. `opacity`, not `display`: see the note at the top. */
await page.evaluateOnNewDocument(() => {
  const style = document.createElement("style");
  style.textContent = `
    header, .menu, #veil,
    .herocore h1, .herodek, .heroacts, .heroft,
    .avline, .csintro, .csdeck,
    /* The loading screen keeps its MECHANISM and loses its face: the ink field
       is still there for the rising paper to clip away — that wipe IS the
       arrival of the newspapers — but the rosette and the wordmark are not, so
       the film opens on the papers and not on a logo. The mark is the film's
       ENDING, and a mark shown twice is a mark that means less the second
       time. */
    #boot .bt-grp { opacity: 0 !important; }
    html { scrollbar-width: none; }
    ::-webkit-scrollbar { width: 0; height: 0; }
  `;
  const put = () => document.head.appendChild(style);
  if (document.head) put();
  else document.addEventListener("DOMContentLoaded", put, { once: true });
});

// `?archives=WORLD` — the shelf that is nobody's country. A reader gets the front pages
// of the country they are standing in, which is the landing's own argument and a good
// one; a film is not addressed to one country, so it stands on the American, British and
// Swiss shelves at once. Nothing reaches that shelf by clock or by language: it has to
// be asked for by name, and this is the only thing that asks.
// And `plates=56` — twice what a reader gets. The room is filmed, not read: nobody has
// to keep up with it, and the machine doing the filming is doing nothing else. The
// redraw budget in the module is per FRAME, not per tile, so twice the tiles is twice
// the transform writes and the same painting; measured after, the take still holds 90%
// of the compositor's casts.
await page.goto(
  `http://localhost:${PORT}/landing/index.html?archives=WORLD&plates=56`,
  { waitUntil: "domcontentloaded" },
);
await page.bringToFront();

const client = await page.createCDPSession();
try {
  await client.send("Emulation.setFocusEmulationEnabled", { enabled: true });
  await client.send("Page.setWebLifecycleState", { state: "active" });
} catch {
  /* not every build exposes these */
}

/* EVERY CAST IS KEPT AND WRITTEN IN ORDER — see the note on `FPS` above for why
 * nothing here is resampled. */
const frames = [];
let index = 0;
let previous = null;
let cast = 0;
let held = 0;
client.on("Page.screencastFrame", async (params) => {
  cast++;
  const bytes = Buffer.from(params.data, "base64");
  // Counted, not dropped. A cast identical to the one before it is a compositor frame
  // the page did not manage to repaint for, and holding it for one sixtieth of a second
  // is what actually happened on the screen. Dropping it would compress real time.
  if (previous && previous.equals(bytes)) held++;
  previous = bytes;
  const name = `f${String(index++).padStart(5, "0")}.jpg`;
  frames.push({ name, t: params.metadata.timestamp });
  await writeFile(join(FRAMES_DIR, name), bytes);
  try {
    await client.send("Page.screencastFrameAck", { sessionId: params.sessionId });
  } catch {
    /* the cast is over */
  }
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** THE MARKS, WRITTEN DOWN RATHER THAN RE-MEASURED. Every stage of the take stamps the
 *  recording's own clock, and they are saved beside the mp4. The cut used to be
 *  recovered afterwards by reading the luminance curve back — which works, but it is a
 *  measurement of a thing this script already knew. `timing.ts` is written against
 *  these. */
const marks = [];
const mark = (label) => {
  // The output frame, not the wall clock: the take is laid down one paint per frame, so
  // the frame count IS the timeline the cut is written against.
  const frame = frames.length ? frames.length - 1 : 0;
  const at = frames.length ? frames[frames.length - 1].t - frames[0].t : 0;
  marks.push({ label, frame, at: Number(at.toFixed(3)) });
  return at;
};
const beat = async (label, ms) => {
  const at = mark(label);
  console.log(`  ${at.toFixed(2)}s  ${label}  (+${ms}ms)`);
  await wait(ms);
};

console.log("recording…");
await client.send("Page.startScreencast", {
  format: "jpeg",
  quality: 94,
  maxWidth: WIDTH,
  maxHeight: HEIGHT,
  everyNthFrame: 1,
});

// 1 · THE LOADING SCREEN, and the paper that takes it off. `__uiIn` turns 1 once the
//     hero has finished settling — the page will not accept the crossing before that,
//     so this is a wait on the page's own signal and not a guessed duration.
await page.waitForFunction(() => window.__uiIn === 1, { timeout: 30000, polling: 100 });
console.log(`  ${mark("the hero has settled").toFixed(2)}s  loading screen done`);

// 2 · THE WALL. Long enough for two lines to be spoken over it — the number is set
//     from the cut, not guessed: `timing.ts` puts the crossing at 12.2s of film, the
//     film opens 1s into the footage, and the hero settles at about 4.6s.
await beat("the wall of text", 6000);

// 3 · THE CROSSING. One gesture, and the page plays it: the papers lift off and the
//     chapter is uncovered under them.
await page.mouse.move(WIDTH / 2, HEIGHT / 2);
await page.mouse.wheel({ deltaY: 600 });
await beat("the papers lift off", 1600);
// And then the gate is crossed AS SOON AS THE PAGE IS FREE, not after a counted pause.
// The crossing holds the page under a lock of its own; waiting on that lock rather than
// on a number means the push starts at the first moment it can, and the field spends as
// little time as possible at the drift it is written to keep for a reader who stopped.
await page.waitForFunction(() => window.__locked === false, {
  timeout: 15000,
  polling: 50,
});
await wait(200);

// 4 · THE FIELD OF PLATES, coming at the camera. NOTHING IS DRIVEN HERE AT ALL.
//
//     The walk runs on a clock, not on the scroll — the module says so itself: "the
//     drawings have to come on their own or the frame sits empty behind the line until
//     a wheel is turned". Left alone it fills the room and then keeps its cruise, and
//     that is a continuous advance with nothing in it to stumble on.
//
//     Both earlier attempts to drive it put a step in the picture, and both were the
//     driving rather than the page. Wheel gestures are jumps — Chrome applies the whole
//     delta on one frame. And a continuous `scrollTo` walks into the chapter's own beat
//     gate: crossing `__csBeats.y1` makes the page snap the scroll back and LOCK it for
//     the length of the beat transition, after which a time-based travel resumes far
//     ahead of where it was left; `travel` then goes backwards for one frame and the
//     module re-deals all twenty-eight tiles at the near wall.
// 5 · AND THEN THE ROOM IS PUSHED — a little, all the way through, and hard under the
//     last line.
//
//     The wheel is the module's own accelerator: "turning the wheel drives them forward
//     faster — two and a half depths of it over the rest of the chapter, which at
//     reading speed is several times the drift". But the push only counts once the
//     chapter has handed the page back (`__csFree`), and the handover is the beat gate
//     that broke an earlier take.
//
//     So the gate is crossed ON PURPOSE and ALONE — one scroll to its far side, then a
//     wait on the page's own two flags until the lock is off and the walk is listening.
//     Nothing is driven during the lock, which is the whole of what went wrong before.
mark("crossing the beat gate");
const gate = await page.evaluate(() => window.__csBeats && window.__csBeats.y1);
if (typeof gate !== "number") throw new Error("the chapter published no beat mark");
await page.evaluate((y) => window.scrollTo(0, y + 3), gate);
await page.waitForFunction(
  () => window.__locked === false && window.__csFree === 1,
  { timeout: 12000, polling: 50 },
);
console.log(`  ${mark("the chapter handed the page back").toFixed(2)}s  ready to push`);

//     ONE CURVE, ONE PROGRESS, NOTHING THAT STARTS.
//
//     There were two accelerations before and each one BEGAN at a moment: the scroll
//     push at 3.3s into the field, the spiral 3.3s after that. Both had been lined up
//     with a line of the film — the push under the fourth, the spiral under the fifth —
//     so what the eye read was not a room speeding up but a room changing gear every
//     time a sentence arrived. Two gear changes, two sentences.
//
//     There is one progress now, `u`, running from the moment the chapter hands the page
//     back to the end of the take, and BOTH the travel and the spiral are functions of
//     it. Nothing begins after anything else; there is no second thing to notice.
//
//     `p(u) = uⁿ`, and the linear term is gone. `c·u + …` was there to match a slope at
//     a junction that no longer exists, and at the START of a push there is no slope to
//     match — the field is on its own drift and nothing is added. A curve leaving at
//     `c·R/T` therefore stepped the room from drift to drift-plus-something on one
//     frame, which is the first of the two gear changes. `uⁿ` leaves at zero: the room
//     picks up out of its own drift with nothing to hear. `n` is 2.6 over six seconds,
//     which arrives at the same terminal speed the old curve did.
//
//     THE TURN, THOUGH, BELONGS TO THE LAST LINE ONLY. It opens at `spinAt` into the
//     push and runs to the end, and the cut puts the fifth line on that exact frame. It
//     is a second thing beginning, and that is deliberate here where it was not before:
//     what could not begin at a sentence was the ACCELERATION — a room changing gear
//     under a line reads as the line causing it. The travel is one unbroken curve across
//     all five; only the rotation is an event, and it is the event the last line names.
//
//     Its own progress `w` is renormalised over what is left of the push, and every tile
//     raises it to its own exponent — so the turn still opens at zero speed for each of
//     them, at its own moment, rather than switching on for all twenty-eight at once.
await page.evaluate(
  ({ ms, n, spinAt }) =>
    new Promise((done) => {
      const chapter = document.querySelector(".chapter");
      const from = window.scrollY;
      // The exit arms at eight tenths of the chapter and carries the page to the next
      // section under a lock. This stops just inside that.
      const to = chapter.offsetTop + chapter.offsetHeight * 0.78;
      const span = to - from;

      const rnd = (i, salt) => {
        let a = (i * 2654435761 + salt * 40503) >>> 0;
        a ^= a << 13;
        a ^= a >>> 17;
        a ^= a << 5;
        return ((a >>> 0) % 1e6) / 1e6;
      };
      const PLACE = /translate3d\(([-\d.]+)px,\s*([-\d.]+)px/;
      /* EVERY TILE ON ITS OWN CURVE. One reach, one sweep and TWO exponents each, drawn
         from a seeded stream: they leave at different moments and gather speed at
         different rates, so the room comes apart rather than being pulled away in one
         piece. Same hand of rotation for all of them — different directions is not a
         spiral, it is a scatter.

         Reach and sweep trade against each other: a tile thrown far covers its whole arc
         off the edge of the frame, where a whirl cannot be seen. */
      const flock = [...document.querySelectorAll(".avfly")].map((el, i) => ({
        el,
        reach: 1.35 + rnd(i, 1) * 1.65, // how far out its arc carries it
        sweep: ((600 + rnd(i, 2) * 1560) * Math.PI) / 180, // and how far round
        // Over the LAST stretch of the push, not the whole of it — so these are the
        // ordinary range again, and each tile still opens its own turn at zero speed.
        pow: 1.6 + rnd(i, 3) * 2.0,
        // And the turn is sharper than the going out — a quarter more, so a tile drifts
        // out first and the rotation builds under it.
        spin: (1.6 + rnd(i, 3) * 2.0) * 1.25,
      }));

      const t0 = performance.now();
      const u0 = spinAt / ms;
      const step = () => {
        const t = performance.now() - t0;
        const u = Math.min(1, t / ms);
        window.scrollTo(0, from + span * Math.pow(u, n));
        const w = Math.max(0, (u - u0) / (1 - u0));
        for (const f of flock) {
          const m = PLACE.exec(f.el.style.transform);
          if (!m) continue;
          const x = +m[1];
          const y = +m[2];
          // A tile sitting all but on the axis has no direction to leave along, so it is
          // given a radius to swing on rather than none.
          const r = Math.max(Math.hypot(x, y), 90);
          const th = Math.atan2(y, x);
          const R = r * (1 + (f.reach - 1) * Math.pow(w, f.pow));
          const a = th + f.sweep * Math.pow(w, f.spin);
          f.el.style.translate =
            `${(R * Math.cos(a) - x).toFixed(1)}px ${(R * Math.sin(a) - y).toFixed(1)}px`;
        }
        if (u < 1) requestAnimationFrame(step);
        else done();
      };
      requestAnimationFrame(step);
    }),
  { ms: 6000, n: 2.6, spinAt: 4300 },
);
mark("the push is over");
console.log("  pushed: 6000ms on one curve; the turn opens at 4300ms, under the last line");

await beat("tail", 700);

mark("end of take");
await client.send("Page.stopScreencast");
await wait(400);
await browser.close();
server.close();

// --------------------------------------------------------------- the encode
if (frames.length < 2) throw new Error("the screencast produced no frames");
const first = frames[0].t;
const seconds = frames[frames.length - 1].t - first;
console.log(
  `${cast} casts over ${seconds.toFixed(2)}s (${(cast / seconds).toFixed(1)}/s), ` +
    `${cast - held} of them a new paint (${(((cast - held) / cast) * 100).toFixed(0)}%), ` +
    `all laid down one per frame at ${FPS} fps`,
);

// One cast, one frame. No `fps` filter and no concat durations — any resampling here
// would put back exactly the unevenness this is here to avoid.
const outPath = join(OUT_DIR, "stage.mp4");
const encode = spawnSync(
  "ffmpeg",
  [
    "-y", "-v", "error",
    "-framerate", String(FPS),
    "-i", join(FRAMES_DIR, "f%05d.jpg"),
    "-vf", `scale=${WIDTH}:${HEIGHT}:flags=lanczos`,
    "-c:v", "libx264", "-preset", "slow", "-crf", "16",
    "-pix_fmt", "yuv420p",
    outPath,
  ],
  { stdio: "inherit" },
);
if (encode.status !== 0) throw new Error(`ffmpeg exited with ${encode.status}`);

const probed = spawnSync(
  "ffprobe",
  ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,nb_frames", "-of", "csv=p=0", outPath],
  { encoding: "utf8" },
);
await writeFile(
  join(OUT_DIR, "stage-marks.json"),
  JSON.stringify({ fps: FPS, seconds: Number(seconds.toFixed(3)), marks }, null, 2),
);
console.log(`stage → ${outPath}  ${probed.stdout.trim()}`);
console.log(marks.map((m) => `  ${m.at.toFixed(2)}s  ${m.label}`).join("\n"));
await rm(FRAMES_DIR, { recursive: true, force: true });
