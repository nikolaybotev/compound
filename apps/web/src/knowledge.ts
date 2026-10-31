export const KNOWLEDGE_SHEET_QUERY = "(max-width: 52rem)";

export type KnowledgeFrame = {
  id: string;
  anchor?: string;
};

export type KnowledgeEntry = {
  id: string;
  anchor?: string;
};

export const KNOWLEDGE_ENTRIES = {
  types: { id: "types" },
  initialPeriod: { id: "arm-rate", anchor: "initial-period" },
  noteRate: { id: "arm-rate", anchor: "note-rate" },
  caps: { id: "arm-rate", anchor: "caps" },
  notices: { id: "arm-rate", anchor: "notices" },
  teaser: { id: "arm-rate", anchor: "teaser" },
  extraPrincipal: { id: "prepaying", anchor: "extra-principal" },
  pmi: { id: "prepaying", anchor: "pmi-removal" },
  points: { id: "pricing", anchor: "points" },
  closingDisclosure: { id: "documents", anchor: "cd-vs-note" },
  acceleration: { id: "documents", anchor: "acceleration" },
} as const satisfies Record<string, KnowledgeEntry>;

const ARTICLE_FILES: Record<string, string> = {
  "README.md": "readme",
  "arm-rate.md": "arm-rate",
  "payment-structures.md": "payment-structures",
  "qualifying.md": "qualifying",
  "pricing.md": "pricing",
  "prepaying.md": "prepaying",
  "documents.md": "documents",
  "lender-questions.md": "lender-questions",
  "glossary.md": "glossary",
  "sources.md": "sources",
  "SKILL.md": "types",
};

export type KnowledgeHref =
  | { kind: "external"; href: string }
  | { kind: "entry"; id: string; anchor?: string }
  | { kind: "anchor"; anchor: string }
  | { kind: "stay" };

export function armTypesMarkdown(skill: string): string {
  const start = skill.indexOf("## Types\n");
  const end = skill.indexOf("\n## Parameters\n");
  if (start < 0 || end < start) throw new Error("ARM types section missing");
  return skill.slice(start, end).trim() + "\n";
}

export function knowledgePresentation(matchesSheet: boolean): "side" | "sheet" {
  return matchesSheet ? "sheet" : "side";
}

export function resolveKnowledgeHref(href: string): KnowledgeHref {
  if (href.startsWith("https://") || href.startsWith("http://")) {
    return { kind: "external", href };
  }
  if (href.startsWith("#")) {
    const anchor = href.slice(1);
    return anchor ? { kind: "anchor", anchor } : { kind: "stay" };
  }
  const hash = href.indexOf("#");
  const path = hash >= 0 ? href.slice(0, hash) : href;
  const anchor = hash >= 0 ? href.slice(hash + 1) : undefined;
  const file = path.split("/").pop() ?? "";
  const id = ARTICLE_FILES[file];
  if (!id) return { kind: "stay" };
  return anchor ? { kind: "entry", id, anchor } : { kind: "entry", id };
}
