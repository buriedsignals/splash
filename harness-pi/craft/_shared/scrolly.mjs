// The half every SCROLLY zone kit shares, on top of ./web.mjs (the direction, plain spaces, the
// story's language and the refusal wrapper, which a scrolly page needs exactly as a web page does):
// where the scrolly skill is, and the render → verify → look sequence. A kit's render-beat.mjs builds
// its props and hands one `render({ label, direction, outDir })` to `renderBeatScrolly`; this file
// writes the page into renders/, drives the skill's own verify-scrolly.mjs over it (a CONTINUOUS
// scroll at three widths, reduced motion, JavaScript off, typefaces), then takes one screenshot per
// card, at the scroll position where that card is the one being read, and prints the first as
// `look at:`. A refusal — the kit's, the renderer's or the verification's — leaves renders/ empty and
// exits 1, with the reason as the last lines printed.
//
// Carried in each scrolly kit's folder because the harness copies only the kit and `_shared/` into a
// beat; it belongs in `_shared/scrolly.mjs` (see craft/scrolly/PATTERN.md).
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { pickDirection, plainRegisters } from "./web.mjs";

/** The scrolly skill's own scripts and assets, wherever the root put the skill. */
export const scrollySkill = (here, ...parts) => skillScriptFrom(here, "scrolly", ...parts);

/** The viewport every card's screenshot is taken at (verify-scrolly's own desktop width). */
export const DESKTOP = { width: 1600, height: 900 };
export const PHONE = { width: 375, height: 812 };

function refuse(here, message) {
  rmSync(join(here, "renders"), { recursive: true, force: true });
  console.log(`REFUSED — ${message}`);
  process.exit(1);
}

/**
 * One screenshot per card, at the scroll offset that puts that card's centre on the lane's centre
 * line — where the scaffold's `data-progress` is exactly the card's index and the revealed visual
 * paints that card's state, not a blend. Waits for the painted position to catch the scroll
 * (`reveal.mjs` eases it in, FOLLOW_MS) and reads back the state the visual says it painted, so a
 * screenshot that shows the wrong card is refused rather than looked at. Then the first card at
 * phone width, and the page with JavaScript off (what a reader without a script gets).
 *
 * @returns {{ cards: string[], phone: string, nojs: string, painted: object[] }}
 */
export async function shootCards(here, file, outDir, { states } = {}) {
  const { resolveChrome } = await import(scrollySkill(here, "scripts", "verify-scrolly.mjs"));
  const { default: puppeteer } = await import("puppeteer-core");
  mkdirSync(outDir, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: resolveChrome(),
    headless: true,
    args: ["--allow-file-access-from-files", "--font-render-hinting=none"],
  });
  const out = { cards: [], painted: [], phone: null, nojs: null };
  try {
    const page = await browser.newPage();
    const settleOn = async (index) =>
      page.evaluate(async (i) => {
        const frame = () => new Promise((r) => requestAnimationFrame(r));
        await document.fonts.ready;
        const port = document.querySelector(".scrolly-steps");
        const panels = Array.from(document.querySelectorAll(".step-panel"));
        const p = panels[i].getBoundingClientRect();
        const lane = port.getBoundingClientRect();
        const want = port.scrollTop + (p.top + p.height / 2) - (lane.top + lane.height / 2);
        port.scrollTop = Math.max(0, Math.min(port.scrollHeight - port.clientHeight, want));
        const root = document.querySelector(".scrolly");
        const visual = document.querySelector('[data-reveal="visual"]');
        for (let k = 0; k < 180; k++) {
          await frame();
          const progress = Number(root.getAttribute("data-progress"));
          const position = visual ? Number(visual.dataset.position) : progress;
          if (k > 10 && Math.abs(position - progress) < 0.001) break;
        }
        await frame();
        return {
          progress: Number(root.getAttribute("data-progress")),
          position: visual ? Number(visual.dataset.position) : null,
          state: visual && visual.dataset.state ? JSON.parse(visual.dataset.state) : null,
        };
      }, index);

    await page.setViewport(DESKTOP);
    await page.goto(`file://${file}`, { waitUntil: "load" });
    const count = await page.evaluate(() => document.querySelectorAll(".step-panel").length);
    for (let i = 0; i < count; i++) {
      const painted = await settleOn(i);
      out.painted.push(painted);
      const shot = join(outDir, `card-${i + 1}-${DESKTOP.width}x${DESKTOP.height}.png`);
      await page.screenshot({ path: shot });
      out.cards.push(shot);
    }

    await page.setViewport(PHONE);
    await page.goto(`file://${file}`, { waitUntil: "load" });
    await settleOn(0);
    out.phone = join(outDir, `card-1-${PHONE.width}x${PHONE.height}.png`);
    await page.screenshot({ path: out.phone });
    await page.close();

    const nojs = await browser.newPage();
    await nojs.setJavaScriptEnabled(false);
    await nojs.setViewport(DESKTOP);
    await nojs.goto(`file://${file}`, { waitUntil: "load" });
    out.nojs = join(outDir, `nojs-${DESKTOP.width}x${DESKTOP.height}.png`);
    await nojs.screenshot({ path: out.nojs });
    await nojs.close();
  } finally {
    await browser.close();
  }

  // A card's screenshot must show THAT card's state: the scroll reaches every card, and the visual
  // painted what the card's state says.
  if (states) {
    const off = [];
    out.painted.forEach((p, i) => {
      if (Math.abs(p.progress - i) > 0.02) off.push(`card ${i + 1}: the scroll reached progress ${p.progress}, not ${i}`);
      else if (p.state && Object.keys(states[i]).some((k) => Math.abs(p.state[k] - states[i][k]) > 0.02))
        off.push(`card ${i + 1}: the visual painted ${JSON.stringify(p.state)}, not its state ${JSON.stringify(states[i])}`);
    });
    if (off.length) throw new Error(`the per-card screenshots do not show their cards:\n  ${off.join("\n  ")}`);
  }
  return out;
}

/**
 * Renders the page, verifies it in Chrome (one browser at a time: verify-scrolly's, then the
 * screenshots'), and leaves one screenshot per card in renders/ to LOOK at.
 *
 * @param here     the beat folder
 * @param render   async ({ label, direction, outDir }) => { outPath } — the kit's renderScrolly call
 * @param states   the per-card states the page was rendered with (checked against what was painted)
 * @param textPerRegister / evidenceLevels  what pickDirection needs
 */
export async function renderBeatScrolly({ here, render, states, textPerRegister, evidenceLevels = 2 }) {
  const out = join(here, "renders");
  const shots = join(here, "shots");
  rmSync(out, { recursive: true, force: true });
  rmSync(shots, { recursive: true, force: true });

  let outPath;
  let label;
  try {
    const picked = pickDirection(here, plainRegisters(textPerRegister), evidenceLevels);
    label = picked.label;
    ({ outPath } = await render({ label, direction: picked.direction, outDir: out }));
  } catch (error) {
    refuse(here, error.message);
  }
  console.log(`rendered renders/${label}.html`);

  // The skill's own evidence: a continuous scroll recorded frame by frame at 1600x900, 1280x800 and
  // 375x812 (every card painted in order, the card travelling, centred, opaque; the visual evolving
  // between boundaries), reduced motion, JavaScript off, every word in an embedded face.
  const verify = Bun.spawnSync(["bun", scrollySkill(here, "scripts", "verify-scrolly.mjs"), outPath], { stdout: "pipe", stderr: "pipe" });
  const log = `${verify.stdout.toString()}${verify.stderr.toString()}`;
  const lines = log.split("\n");
  const fails = lines.filter((l) => l.startsWith("FAIL"));
  const summary = lines.find((l) => /^\d+ failures, \d+ notes/.test(l)) ?? lines.slice(-15).join("\n").trim();
  console.log(`\nverify-scrolly (scrolly): ${summary}`);
  for (const f of fails) console.log(`  ${f}`);
  if (verify.exitCode !== 0 && !fails.length) console.log(lines.slice(-20).join("\n"));

  let shot;
  try {
    shot = await shootCards(here, outPath, shots, { states });
  } catch (error) {
    refuse(here, error.message);
  }
  if (verify.exitCode !== 0) {
    if (shot?.cards[0]) console.log(`the refused page, for diagnosis —\nlook at: ${shot.cards[0]}`);
    refuse(here, `the page rendered but the scrolly verification failed (${fails.length || "see above"}): fix the words in beat.mjs that the failures name (a card too long for the frame, a word the face cannot set), then render again`);
  }
  const cards = shot.cards.map((src, i) => {
    const png = join(out, `${label}-card-${i + 1}.png`);
    cpSync(src, png);
    return png;
  });
  console.log(`screenshots (every card at 1600x900, card 1 at 375x812, JavaScript off): ${shots}`);
  console.log(`cards: ${cards.join(", ")}`);
  console.log(`look at: ${cards[0]}`);
}
