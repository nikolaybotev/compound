import type { Page } from "@playwright/test";

export async function headingText(page: Page): Promise<string> {
  return page.locator(".heading-line").evaluate((element) => {
    const parts: string[] = [];
    const walk = (node: Node) => {
      if (node instanceof HTMLInputElement) {
        parts.push(node.value);
      } else if (node instanceof HTMLSelectElement) {
        parts.push(node.options[node.selectedIndex]?.text ?? "");
      } else if (node instanceof HTMLButtonElement && node.id === "start") {
        parts.push(node.textContent?.trim() ?? "");
      } else if (node.nodeType === Node.TEXT_NODE) {
        parts.push(node.textContent ?? "");
      } else {
        node.childNodes.forEach(walk);
      }
    };
    element.childNodes.forEach(walk);
    return parts.join("").replace(/\s+/g, " ").trim();
  });
}
