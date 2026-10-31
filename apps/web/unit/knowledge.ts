import { describe, expect, test } from "vitest";
import skill from "../../../.agents/skills/arm-loan-concepts/SKILL.md?raw";
import armRate from "../../../docs/kb/arm-rate.md?raw";
import documents from "../../../docs/kb/documents.md?raw";
import prepaying from "../../../docs/kb/prepaying.md?raw";
import pricing from "../../../docs/kb/pricing.md?raw";
import lenderQuestions from "../../../docs/kb/lender-questions.md?raw";
import {
  armTypesMarkdown,
  knowledgePresentation,
  resolveKnowledgeHref,
} from "../src/knowledge";
import { articleMarkdown } from "../src/knowledge-sources";
import { markdownHrefs, markdownPlain, parseMarkdown } from "../src/markdown";

describe("knowledge sources", () => {
  test("ARM types are the skill Types section", () => {
    const types = armTypesMarkdown(skill);
    expect(types.startsWith("## Types")).toBe(true);
    expect(types).not.toContain("## Parameters");
    expect(types).not.toContain("## How to answer");
    expect(types).not.toContain("fully_indexed_rate = index_at_lookback + margin");
    expect(types).toContain("Traditional ARM");
    expect(types).toContain("Hybrid ARM");
    expect(types).toContain("$600,000");
    expect(articleMarkdown("types")).toBe(types);
    expect(skill.slice(skill.indexOf("## Types\n"), skill.indexOf("\n## Parameters\n")).trim() + "\n").toBe(types);
  });

  test("Closing Disclosure, prepayment, and teaser articles are the knowledge-base files", () => {
    expect(articleMarkdown("documents")).toBe(documents);
    expect(articleMarkdown("prepaying")).toBe(prepaying);
    expect(articleMarkdown("arm-rate")).toBe(armRate);
    expect(documents).toContain("deed of trust");
    expect(documents).toContain("ARM rider");
    expect(documents).toContain('id="cd-vs-note"');
    expect(documents).toContain('id="acceleration"');
    expect(prepaying).toContain('id="extra-principal"');
    expect(prepaying).toContain("partial Prepayment");
    expect(armRate).toContain('id="teaser"');
    expect(armRate).toContain("payment shock");
  });
});

describe("markdown", () => {
  test("keeps a citation href that contains parentheses", () => {
    const hrefs = markdownHrefs(documents);
    expect(hrefs).toContain(
      "https://www.ecfr.gov/current/title-12/chapter-X/subchapter-B/part-1026/subpart-C/section-1026.19#p-1026.19(b)",
    );
    expect(markdownPlain(documents)).toContain("deed of trust");
    expect(markdownPlain(armRate)).toContain("payment shock");
    expect(markdownPlain(prepaying)).toContain("smaller");
    expect(markdownPlain(pricing)).toContain("new pricing from the ARM rate sheet");
  });

  test("keeps later ordered-list numbers", () => {
    const lists = parseMarkdown(lenderQuestions).filter((block) => block.kind === "list");
    const starts = lists.map((block) => (block.kind === "list" ? block.start : 0));
    expect(starts).toContain(1);
    expect(starts).toContain(9);
    expect(starts).toContain(13);
  });
});

describe("knowledge links", () => {
  test("resolves panel entries and leaves other paths on the page", () => {
    expect(resolveKnowledgeHref("https://www.ecfr.gov/current/title-12")).toEqual({
      kind: "external",
      href: "https://www.ecfr.gov/current/title-12",
    });
    expect(resolveKnowledgeHref("#teaser")).toEqual({ kind: "anchor", anchor: "teaser" });
    expect(resolveKnowledgeHref("arm-rate.md#teaser")).toEqual({
      kind: "entry",
      id: "arm-rate",
      anchor: "teaser",
    });
    expect(resolveKnowledgeHref("../../.agents/skills/arm-loan-concepts/SKILL.md")).toEqual({
      kind: "entry",
      id: "types",
    });
    expect(resolveKnowledgeHref("../../intent/mortgage-start-timeline/spec.md")).toEqual({ kind: "stay" });
    expect(resolveKnowledgeHref("../TRID_LOAN_ESTIMATE_COMPLIANCE_CITATIONS.md")).toEqual({ kind: "stay" });
    expect(knowledgePresentation(true)).toBe("sheet");
    expect(knowledgePresentation(false)).toBe("side");
  });
});
