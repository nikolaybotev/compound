#!/usr/bin/env node
/**
 * Fail closed before a full-site Pages upload: every asset linked from the
 * given HTML entry points (and from linked CSS url()) must exist under siteRoot.
 */
import fs from "node:fs";
import path from "node:path";

const siteRoot = path.resolve(process.argv[2] ?? "site");
const entryArgs = process.argv.slice(3);
const entryPoints =
  entryArgs.length > 0
    ? entryArgs.map((p) => path.join(siteRoot, p))
    : discoverFeatEntries(siteRoot);

const missing = [];
const scanned = new Set();

function discoverFeatEntries(root) {
  const entries = ["index.html", "prototype/index.html"];
  const featDir = path.join(root, "feat");
  if (fs.existsSync(featDir)) {
    for (const name of fs.readdirSync(featDir)) {
      const index = path.join(featDir, name, "index.html");
      if (fs.existsSync(index)) entries.push(path.relative(root, index));
    }
  }
  return entries.map((p) => path.join(root, p));
}

function stripQuotes(raw) {
  return raw.trim().replace(/^['"]|['"]$/g, "");
}

function resolveRef(fromFile, ref) {
  const cleaned = stripQuotes(ref);
  if (
    !cleaned ||
    cleaned.startsWith("data:") ||
    cleaned.startsWith("#") ||
    cleaned.startsWith("mailto:")
  ) {
    return null;
  }
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
    const match = cleaned.match(/\/compound\/(.+)$/);
    if (!match) return null;
    return path.join(siteRoot, match[1]);
  }
  if (cleaned.startsWith("/compound/")) {
    return path.join(siteRoot, cleaned.slice("/compound/".length));
  }
  const dir = path.dirname(fromFile);
  return path.normalize(path.join(dir, cleaned));
}

function recordMissing(filePath) {
  if (!missing.includes(filePath)) missing.push(filePath);
}

function scanFile(filePath) {
  const normalized = path.normalize(filePath);
  if (scanned.has(normalized)) return;
  scanned.add(normalized);

  if (!fs.existsSync(normalized)) {
    recordMissing(normalized);
    return;
  }

  const ext = path.extname(normalized).toLowerCase();
  const content = fs.readFileSync(normalized, "utf8");

  if (ext === ".html") {
    const attrRe = /\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;
    let match;
    while ((match = attrRe.exec(content))) {
      const resolved = resolveRef(normalized, match[1]);
      if (resolved) scanFile(resolved);
    }
  } else if (ext === ".css") {
    const urlRe = /url\(\s*([^)]+)\s*\)/gi;
    let match;
    while ((match = urlRe.exec(content))) {
      const resolved = resolveRef(normalized, match[1]);
      if (resolved) scanFile(resolved);
    }
  }
}

for (const entry of entryPoints) {
  if (!fs.existsSync(entry)) {
    recordMissing(entry);
    continue;
  }
  scanFile(entry);
}

if (missing.length > 0) {
  console.error("Pages mirror incomplete; missing files:");
  for (const file of missing.sort()) {
    console.error(`  ${file}`);
  }
  process.exit(1);
}

console.log(
  `Pages mirror OK: ${scanned.size} file(s) reachable from ${entryPoints.length} entry point(s).`,
);
