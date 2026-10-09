import type { ComponentChildren } from "preact";

export function Disclosure(props: {
  title: string;
  open: boolean;
  className?: string;
  onToggle: (open: boolean) => void;
  children: ComponentChildren;
}) {
  return (
    <details class={props.className ? `disclosure ${props.className}` : "disclosure"} open={props.open}>
      <summary
        aria-expanded={props.open ? "true" : "false"}
        onClick={(event) => {
          event.preventDefault();
          props.onToggle(!props.open);
        }}
      >
        <span class="summary-label">
          <span class="chevron" aria-hidden="true" />
          {props.title}
        </span>
      </summary>
      <div class="disclosure-panel">{props.children}</div>
    </details>
  );
}
