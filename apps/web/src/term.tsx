import type { ComponentChildren } from "preact";
import { createContext } from "preact";
import { useContext } from "preact/hooks";

export type OpenKnowledge = (id: string, anchor?: string) => void;

export const KnowledgeOpen = createContext<OpenKnowledge>(() => {});

export function TermButton(props: {
  id?: string;
  entry: string;
  anchor?: string;
  children: ComponentChildren;
}) {
  const open = useContext(KnowledgeOpen);
  return (
    <button
      id={props.id}
      type="button"
      class="term"
      onClick={() => open(props.entry, props.anchor)}
    >
      {props.children}
    </button>
  );
}
