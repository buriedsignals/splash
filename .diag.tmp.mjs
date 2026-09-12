import { existsSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer";
const env = Object.fromEntries((await readFile(".env","utf8")).split(/\r?\n/)
  .filter(l=>l.includes("=")&&!l.startsWith("#")).map(l=>[l.slice(0,l.indexOf("=")).trim(),l.slice(l.indexOf("=")+1).trim()]));
const KEY = env.MAPTILER_KEY ?? env.MAPTILER_API_KEY;
function chrome(){const c=[];const k=join(homedir(),".cache/puppeteer/chrome");
  if(existsSync(k))for(const b of readdirSync(k).sort().reverse())c.push(join(k,b,"chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"));
  c.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");return c.find(p=>existsSync(p));}
const browser = await puppeteer.launch({headless:"new",executablePath:chrome(),args:["--no-sandbox"]});
const page = await browser.newPage();
await page.setViewport({width:1000,height:760});
await page.setContent(`<!doctype html><html><head>
<link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet">
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<style>html,body,#m{margin:0;width:1000px;height:760px}</style></head><body><div id="m"></div></body></html>`,{waitUntil:"networkidle0"});
const rows = await page.evaluate(async (key) => {
  const map = new maplibregl.Map({container:"m",style:`https://api.maptiler.com/maps/dataviz-light/style.json?key=${key}`,
    bounds:[[-25,34],[42,68]],fitBoundsOptions:{padding:0,animate:false},interactive:false,attributionControl:false});
  await new Promise(r=>map.once("style.load",r));
  return map.getStyle().layers.filter(l=>l.type==="symbol")
    .map(l=>`${l.id}  |  source-layer: ${l["source-layer"]}  |  minzoom ${l.minzoom ?? "-"}  |  filter ${JSON.stringify(l.filter ?? null).slice(0,70)}`);
}, KEY);
console.log(rows.join("\n"));
await browser.close();
