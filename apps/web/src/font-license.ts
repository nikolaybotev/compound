import fs from "node:fs";
import path from "node:path";

const FONT_EXTENSIONS = new Set([".ttf", ".otf", ".woff", ".woff2"]);

function collectFonts(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...collectFonts(full));
    } else if (FONT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      found.push(full);
    }
  }
  return found;
}

export function assertSilOpenFontLicenses(fontsDir: string): void {
  const fonts = collectFonts(fontsDir);
  if (fonts.length === 0) {
    throw new Error(`no shipped fonts found in ${fontsDir}`);
  }
  for (const font of fonts) {
    const name = path.basename(font);
    const licensePath = path.join(path.dirname(font), "OFL.txt");
    let text = "";
    try {
      text = fs.readFileSync(licensePath, "utf8");
    } catch {
      throw new Error(`${name} is not licensed under the SIL Open Font License`);
    }
    if (!text.includes("SIL Open Font License")) {
      throw new Error(`${name} is not licensed under the SIL Open Font License`);
    }
  }
}
