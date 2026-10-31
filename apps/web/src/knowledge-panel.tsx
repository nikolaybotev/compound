import { useEffect, useRef } from "preact/hooks";
import { articleMarkdown } from "./knowledge-sources";
import type { KnowledgeFrame } from "./knowledge";
import { MarkdownView } from "./markdown-view";
import { resolveKnowledgeHref } from "./knowledge";

const FOCUSABLE = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function KnowledgePanel(props: {
  stack: KnowledgeFrame[];
  sheet: boolean;
  onPush: (id: string, anchor?: string) => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const frame = props.stack[props.stack.length - 1];
  const markdown = frame ? articleMarkdown(frame.id) : null;

  useEffect(() => {
    if (!props.sheet) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [props.sheet]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (document.querySelector(".month-picker") || document.querySelector(".scenario-confirm")) return;
      props.onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [props.onClose]);

  useEffect(() => {
    const root = bodyRef.current;
    if (!root || !frame) return;
    const anchor = frame.anchor ? root.querySelector<HTMLElement>(`#${CSS.escape(frame.anchor)}`) : null;
    const heading =
      anchor?.nextElementSibling instanceof HTMLElement && /^H[2-4]$/.test(anchor.nextElementSibling.tagName)
        ? anchor.nextElementSibling
        : root.querySelector<HTMLElement>("h2, h3");
    if (anchor) {
      const rootRect = root.getBoundingClientRect();
      const anchorRect = anchor.getBoundingClientRect();
      root.scrollTop += anchorRect.top - rootRect.top - 8;
    } else {
      root.scrollTop = 0;
    }
    const focusTarget = heading ?? panelRef.current?.querySelector<HTMLElement>("button");
    if (focusTarget) {
      focusTarget.tabIndex = -1;
      focusTarget.focus({ preventScroll: true });
    }
  }, [frame?.id, frame?.anchor]);

  useEffect(() => {
    if (!props.sheet) return;
    const panel = panelRef.current;
    if (!panel) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const nodes = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (node) => !node.hasAttribute("disabled"),
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener("keydown", onKey);
    return () => panel.removeEventListener("keydown", onKey);
  }, [props.sheet, frame?.id]);

  function follow(href: string) {
    const resolved = resolveKnowledgeHref(href);
    if (resolved.kind === "anchor" && frame) props.onPush(frame.id, resolved.anchor);
    else if (resolved.kind === "entry") props.onPush(resolved.id, resolved.anchor);
  }

  const presentation = props.sheet ? "sheet" : "side";
  return (
    <aside
      id="knowledge"
      ref={panelRef}
      class="knowledge-panel"
      data-presentation={presentation}
      role={props.sheet ? "dialog" : "complementary"}
      aria-modal={props.sheet ? "true" : undefined}
      aria-labelledby="knowledge-title"
    >
      <div class="knowledge-chrome">
        {props.stack.length > 1 ? (
          <button type="button" onClick={props.onBack}>Back</button>
        ) : (
          <span />
        )}
        <p id="knowledge-title">Knowledge</p>
        <button type="button" aria-label="Close knowledge" onClick={props.onClose}>Close</button>
      </div>
      {frame?.id === "readme" ? (
        <button type="button" class="knowledge-types" onClick={() => props.onPush("types")}>
          ARM types
        </button>
      ) : null}
      <div class="knowledge-body" ref={bodyRef}>
        {markdown ? (
          <MarkdownView source={markdown} onHref={follow} />
        ) : (
          <p>That entry is not in the knowledge base.</p>
        )}
      </div>
    </aside>
  );
}
