#!/usr/bin/env node
/**
 * Rasterises the web app's logo (../egx-api-fe/public/icons/egx-logo-512.svg)
 * into the native icon set. Run after the logo changes: `npm run icons`.
 * The PNGs are committed, so EAS builds never need the sibling repo.
 *
 *  icon.png                     1024, full-bleed on #0a0a0f (iOS masks corners; no alpha allowed)
 *  android-icon-foreground.png  1024, transparent, mark at 55% to sit in the adaptive safe circle
 *  android-icon-monochrome.png  1024, transparent, white silhouette for Android 13+ themed icons
 *  splash-icon.png              1024, transparent mark (the splash plugin paints #0a0a0f behind it)
 *  favicon.png                  48, for completeness (web target unused)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = resolve(root, "../egx-api-fe/public/icons/egx-logo-512.svg");
const BG = "#0a0a0f";

const svg = readFileSync(SRC, "utf8");
const logo = svg.match(/<g clip-path="url\(#lc\)">([\s\S]*)<\/g>/)?.[1];
if (!logo) throw new Error(`No logo body found in ${SRC} — has the SVG changed shape?`);
// The "by Mark Botros" byline is unreadable at icon size, so the app icons drop it.
const body = logo.replace(/<text[^>]*>by Mark Botros<\/text>/, "");
if (body === logo) throw new Error(`No byline found in ${SRC} — has the SVG changed shape?`);

const wrap = (inner, { background = null, scale = 1 } = {}) => `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
${background ? `<rect width="512" height="512" fill="${background}"/>` : ""}
<g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${inner}</g>
</svg>`;

const mono = body.replace(/(fill|stroke)="#[0-9a-fA-F]{6}"/g, '$1="#ffffff"');

function render(name, source, size) {
  const png = new Resvg(source, {
    fitTo: { mode: "width", value: size },
    font: { loadSystemFonts: true, defaultFontFamily: "DejaVu Sans" },
  })
    .render()
    .asPng();
  writeFileSync(resolve(root, "assets", name), png);
  console.log(`assets/${name} ${size}x${size}`);
}

render("icon.png", wrap(body, { background: BG }), 1024);
render("android-icon-foreground.png", wrap(body, { scale: 0.55 }), 1024);
render("android-icon-monochrome.png", wrap(mono, { scale: 0.55 }), 1024);
render("splash-icon.png", wrap(body), 1024);
render("favicon.png", wrap(body, { background: BG }), 48);
