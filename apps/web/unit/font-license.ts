import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { assertSilOpenFontLicenses } from "../src/font-license";

const fontsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fonts");

describe("font licenses", () => {
  test("the shipped fonts are SIL Open Font License", () => {
    expect(() => assertSilOpenFontLicenses(fontsDir)).not.toThrow();
  });

  test("a font whose license is not the SIL Open Font License fails and names the file", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "font-license-"));
    const font = path.join(dir, "OtherFace-Regular.ttf");
    fs.writeFileSync(font, "not a real font");
    fs.writeFileSync(path.join(dir, "OFL.txt"), "Licensed under the Apache License, Version 2.0.");
    expect(() => assertSilOpenFontLicenses(dir)).toThrow(
      /OtherFace-Regular\.ttf is not licensed under the SIL Open Font License/,
    );
  });
});
