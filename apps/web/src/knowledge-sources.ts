import skill from "../../../.agents/skills/arm-loan-concepts/SKILL.md?raw";
import armRate from "../../../docs/kb/arm-rate.md?raw";
import documents from "../../../docs/kb/documents.md?raw";
import glossary from "../../../docs/kb/glossary.md?raw";
import lenderQuestions from "../../../docs/kb/lender-questions.md?raw";
import paymentStructures from "../../../docs/kb/payment-structures.md?raw";
import prepaying from "../../../docs/kb/prepaying.md?raw";
import pricing from "../../../docs/kb/pricing.md?raw";
import qualifying from "../../../docs/kb/qualifying.md?raw";
import readme from "../../../docs/kb/README.md?raw";
import sources from "../../../docs/kb/sources.md?raw";
import { armTypesMarkdown } from "./knowledge";

const ARTICLES: Record<string, string> = {
  readme,
  types: armTypesMarkdown(skill),
  "arm-rate": armRate,
  "payment-structures": paymentStructures,
  qualifying,
  pricing,
  prepaying,
  documents,
  "lender-questions": lenderQuestions,
  glossary,
  sources,
};

export function articleMarkdown(id: string): string | null {
  return ARTICLES[id] ?? null;
}
