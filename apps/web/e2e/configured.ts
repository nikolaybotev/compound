import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "@playwright/test";

export function configuredOrigin(): string {
  const baseURL = test.info().project.use.baseURL;
  if (!baseURL) throw new Error("playwright baseURL is unset");
  return new URL(baseURL).origin;
}

const loanSource = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "../src/loan.ts"),
  "utf8",
);

function fallbackStorageKey(): string {
  const match = loanSource.match(/VITE_STORAGE_KEY \?\? "([^"]+)"/);
  if (!match?.[1]) throw new Error("STORAGE_KEY fallback missing from loan.ts");
  return match[1];
}

export const LEGACY_KEY = fallbackStorageKey();

export const SET_KEY = LEGACY_KEY.endsWith("-v1")
  ? `${LEGACY_KEY.slice(0, -3)}-v2`
  : `${LEGACY_KEY}-scenarios`;
