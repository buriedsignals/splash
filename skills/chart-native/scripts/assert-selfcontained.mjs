// assert-selfcontained.mjs: verify that an HTML file contains no local external
// asset references (script src, link href, img src pointing to relative paths or
// /assets). Exits 1 if any are found (build is NOT self-contained), 0 if clean.
//
//   bun scripts/assert-selfcontained.mjs <path/to/interactive.html>
import { readFileSync } from "node:fs";

const htmlPath = process.argv[2];
if (!htmlPath) {
  console.error("usage: assert-selfcontained.mjs <path/to/interactive.html>");
  process.exit(1);
}

const html = readFileSync(htmlPath, "utf8");

const patterns = [
  { re: /<script[^>]+src=["']\.\/[^"']+["']/gi,  label: '<script src="./">' },
  { re: /<script[^>]+src=["']\/assets\//gi,       label: '<script src="/assets/">' },
  { re: /<link[^>]+href=["']\.\/[^"']+["']/gi,    label: '<link href="./">' },
  { re: /<link[^>]+href=["']\/assets\//gi,         label: '<link href="/assets/">' },
  { re: /<img[^>]+src=["']\.\/[^"']+["']/gi,      label: '<img src="./">' },
];

const violations = [];
for (const { re, label } of patterns) {
  const matches = html.match(re);
  if (matches) {
    violations.push(`  ${label}: ${matches.length} occurrence(s)`);
  }
}

if (violations.length > 0) {
  console.error(`[assert-selfcontained] FAIL: ${htmlPath} has local asset references:`);
  for (const v of violations) console.error(v);
  process.exit(1);
}

console.log(`[assert-selfcontained] OK: ${htmlPath} is self-contained`);
