export type Inline =
  | { kind: "text"; text: string }
  | { kind: "strong"; children: Inline[] }
  | { kind: "em"; children: Inline[] }
  | { kind: "code"; text: string }
  | { kind: "link"; children: Inline[]; href: string };

export type ListBlock = {
  kind: "list";
  ordered: boolean;
  start: number;
  items: ListItem[];
};

export type ListItem = {
  children: Inline[];
  nested: ListBlock | null;
};

export type Block =
  | { kind: "anchor"; id: string }
  | { kind: "heading"; level: number; children: Inline[] }
  | { kind: "paragraph"; children: Inline[] }
  | { kind: "quote"; blocks: Block[] }
  | ListBlock
  | { kind: "table"; header: Inline[][]; rows: Inline[][][] };

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  return parseBlocks(lines);
}

export function markdownPlain(source: string): string {
  return blocksPlain(parseMarkdown(source));
}

export function markdownHrefs(source: string): string[] {
  const hrefs: string[] = [];
  collectHrefs(parseMarkdown(source), hrefs);
  return hrefs;
}

function parseBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (line.trim() === "") {
      index += 1;
      continue;
    }
    const anchor = /^<a id="([^"]+)"><\/a>\s*$/.exec(line);
    if (anchor?.[1]) {
      blocks.push({ kind: "anchor", id: anchor[1] });
      index += 1;
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading?.[1] && heading[2] !== undefined) {
      blocks.push({
        kind: "heading",
        level: heading[1].length,
        children: parseInlines(heading[2].trim()),
      });
      index += 1;
      continue;
    }
    if (line.startsWith(">")) {
      const quoted: string[] = [];
      while (index < lines.length && (lines[index] ?? "").startsWith(">")) {
        const raw = lines[index] ?? "";
        quoted.push(raw.startsWith("> ") ? raw.slice(2) : raw.slice(1));
        index += 1;
      }
      blocks.push({ kind: "quote", blocks: parseBlocks(quoted) });
      continue;
    }
    if (line.trim().startsWith("|")) {
      const rows: string[] = [];
      while (index < lines.length && (lines[index] ?? "").trim().startsWith("|")) {
        rows.push(lines[index] ?? "");
        index += 1;
      }
      blocks.push(parseTable(rows));
      continue;
    }
    if (listMarker(line)) {
      const list = parseList(lines, index);
      blocks.push(list.block);
      index = list.next;
      continue;
    }
    const paragraph: string[] = [];
    while (index < lines.length && !isSpecial(lines[index] ?? "")) {
      paragraph.push((lines[index] ?? "").trim());
      index += 1;
    }
    const text = paragraph.join(" ").trim();
    if (text) blocks.push({ kind: "paragraph", children: parseInlines(text) });
  }
  return blocks;
}

function parseList(lines: string[], index: number): { block: ListBlock; next: number } {
  const first = listMarker(lines[index] ?? "");
  if (!first) return { block: { kind: "list", ordered: false, start: 1, items: [] }, next: index };
  const items: ListItem[] = [];
  let cursor = index;
  while (cursor < lines.length) {
    const line = lines[cursor] ?? "";
    if (line.trim() === "") break;
    const marker = listMarker(line);
    if (!marker || marker.indent < first.indent) break;
    if (marker.indent > first.indent) {
      const last = items[items.length - 1];
      if (!last) break;
      const nested = parseList(lines, cursor);
      last.nested = nested.block;
      cursor = nested.next;
      continue;
    }
    if (marker.ordered !== first.ordered) break;
    items.push({ children: parseInlines(marker.text), nested: null });
    cursor += 1;
  }
  return {
    block: { kind: "list", ordered: first.ordered, start: first.start, items },
    next: cursor,
  };
}

function listMarker(
  line: string,
): { indent: number; ordered: boolean; start: number; text: string } | null {
  const ordered = /^(\s*)(\d+)\.\s+(.*)$/.exec(line);
  if (ordered?.[1] !== undefined && ordered[2] && ordered[3] !== undefined) {
    return { indent: ordered[1].length, ordered: true, start: Number(ordered[2]), text: ordered[3] };
  }
  const bullet = /^(\s*)[-*]\s+(.*)$/.exec(line);
  if (bullet?.[1] !== undefined && bullet[2] !== undefined) {
    return { indent: bullet[1].length, ordered: false, start: 1, text: bullet[2] };
  }
  return null;
}

function isSpecial(line: string): boolean {
  if (line.trim() === "") return true;
  if (/^<a id="[^"]+"><\/a>\s*$/.test(line)) return true;
  if (/^#{1,6}\s+/.test(line)) return true;
  if (line.startsWith(">")) return true;
  if (line.trim().startsWith("|")) return true;
  return listMarker(line) !== null;
}

function parseTable(rows: string[]): Block {
  const parsed = rows.map(splitRow);
  const separator = parsed[1]?.every((cell) => /^:?-+:?$/.test(cell)) ?? false;
  if (separator) {
    return {
      kind: "table",
      header: (parsed[0] ?? []).map((cell) => parseInlines(cell)),
      rows: parsed.slice(2).map((row) => row.map((cell) => parseInlines(cell))),
    };
  }
  return {
    kind: "table",
    header: [],
    rows: parsed.map((row) => row.map((cell) => parseInlines(cell))),
  };
}

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

export function parseInlines(input: string): Inline[] {
  const out: Inline[] = [];
  let text = "";
  let index = 0;
  const flush = () => {
    if (!text) return;
    out.push({ kind: "text", text });
    text = "";
  };
  while (index < input.length) {
    if (input.startsWith("`", index)) {
      const end = input.indexOf("`", index + 1);
      if (end > index) {
        flush();
        out.push({ kind: "code", text: input.slice(index + 1, end) });
        index = end + 1;
        continue;
      }
    }
    if (input.startsWith("**", index)) {
      const end = input.indexOf("**", index + 2);
      if (end > index) {
        flush();
        out.push({ kind: "strong", children: parseInlines(input.slice(index + 2, end)) });
        index = end + 2;
        continue;
      }
    }
    if (input[index] === "[") {
      const link = readLink(input, index);
      if (link) {
        flush();
        out.push({ kind: "link", children: parseInlines(link.text), href: link.href });
        index = link.end;
        continue;
      }
    }
    if (input[index] === "*" && input[index + 1] !== "*") {
      const end = input.indexOf("*", index + 1);
      if (end > index + 1 && input[end + 1] !== "*") {
        flush();
        out.push({ kind: "em", children: parseInlines(input.slice(index + 1, end)) });
        index = end + 1;
        continue;
      }
    }
    text += input[index];
    index += 1;
  }
  flush();
  return out;
}

function readLink(input: string, start: number): { text: string; href: string; end: number } | null {
  const close = input.indexOf("](", start + 1);
  if (close < 0) return null;
  const text = input.slice(start + 1, close);
  let depth = 0;
  for (let index = close + 2; index < input.length; index += 1) {
    const char = input[index];
    if (char === "(") depth += 1;
    else if (char === ")") {
      if (depth === 0) return { text, href: input.slice(close + 2, index), end: index + 1 };
      depth -= 1;
    }
  }
  return null;
}

function blocksPlain(blocks: Block[]): string {
  return blocks.map(blockPlain).join(" ");
}

function blockPlain(block: Block): string {
  switch (block.kind) {
    case "anchor":
      return "";
    case "heading":
    case "paragraph":
      return inlinesPlain(block.children);
    case "quote":
      return blocksPlain(block.blocks);
    case "list":
      return block.items
        .map((item) =>
          [inlinesPlain(item.children), item.nested ? blockPlain(item.nested) : ""].filter(Boolean).join(" "),
        )
        .join(" ");
    case "table":
      return [block.header, ...block.rows].map((row) => row.map(inlinesPlain).join(" ")).join(" ");
  }
}

function inlinesPlain(nodes: Inline[]): string {
  return nodes.map(inlinePlain).join("");
}

function inlinePlain(node: Inline): string {
  switch (node.kind) {
    case "text":
    case "code":
      return node.text;
    case "strong":
    case "em":
    case "link":
      return inlinesPlain(node.children);
  }
}

function collectHrefs(blocks: Block[], hrefs: string[]) {
  for (const block of blocks) {
    if (block.kind === "heading" || block.kind === "paragraph") collectInlineHrefs(block.children, hrefs);
    else if (block.kind === "quote") collectHrefs(block.blocks, hrefs);
    else if (block.kind === "list") {
      for (const item of block.items) {
        collectInlineHrefs(item.children, hrefs);
        if (item.nested) collectHrefs([item.nested], hrefs);
      }
    } else if (block.kind === "table") {
      for (const row of [block.header, ...block.rows]) {
        for (const cell of row) collectInlineHrefs(cell, hrefs);
      }
    }
  }
}

function collectInlineHrefs(nodes: Inline[], hrefs: string[]) {
  for (const node of nodes) {
    if (node.kind === "link") hrefs.push(node.href);
    if (node.kind === "strong" || node.kind === "em" || node.kind === "link") collectInlineHrefs(node.children, hrefs);
  }
}
