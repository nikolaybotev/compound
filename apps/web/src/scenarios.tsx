import { useEffect, useRef, useState } from "preact/hooks";
import type { StoredSet } from "./loan";

type Props = {
  labels: string[];
  active: number;
  saveError: boolean;
  importError: boolean;
  onSelect: (index: number) => void;
  onNew: () => void;
  onRemove: (index: number) => void;
  onExport: () => void;
  onImport: (file: File) => void;
};

export function ScenarioBar({
  labels,
  active,
  saveError,
  importError,
  onSelect,
  onNew,
  onRemove,
  onExport,
  onImport,
}: Props) {
  const [listOpen, setListOpen] = useState(false);
  const [confirmIndex, setConfirmIndex] = useState<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!listOpen && confirmIndex === null) return;
    const onDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (triggerRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      if (confirmRef.current?.contains(target)) return;
      setConfirmIndex(null);
      setListOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [listOpen, confirmIndex]);

  function toggleList() {
    if (confirmIndex !== null) return;
    setListOpen(!listOpen);
  }

  function choose(index: number) {
    onSelect(index);
    setListOpen(false);
    setConfirmIndex(null);
    triggerRef.current?.focus();
  }

  return (
    <div class="scenario-row">
      <button
        id="scenario"
        ref={triggerRef}
        type="button"
        class="scenario-trigger"
        aria-haspopup="dialog"
        aria-expanded={listOpen}
        aria-label={labels[active]}
        onClick={toggleList}
      >
        <span class="scenario-trigger-text">{labels[active]}</span>
      </button>
      <button type="button" class="scenario-action" onClick={onExport}>Export</button>
      <button type="button" class="scenario-action" onClick={() => fileRef.current?.click()}>
        Import
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) onImport(file);
        }}
      />
      {importError ? (
        <p class="scenario-import-error">This file is not a saved set of loan scenarios.</p>
      ) : null}
      {saveError ? (
        <p class="scenario-save-error" role="alert">Could not save this loan.</p>
      ) : null}
      {listOpen ? (
        <div
          ref={listRef}
          class="scenario-dialog"
          role="dialog"
          aria-label="Loan scenarios"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setListOpen(false);
              setConfirmIndex(null);
              triggerRef.current?.focus();
            }
          }}
        >
          <ul class="scenario-list">
            {labels.map((label, index) => (
              <li key={index} class="scenario-list-item">
                <button
                  type="button"
                  class="scenario-row-button"
                  aria-current={index === active ? "true" : undefined}
                  onClick={() => choose(index)}
                >
                  {label}
                </button>
                {labels.length > 1 ? (
                  <button
                    type="button"
                    class="scenario-trash"
                    aria-label={`Remove scenario ${index + 1}`}
                    onClick={() => setConfirmIndex(index)}
                  >
                    <TrashIcon />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          <button type="button" class="scenario-new" aria-label="New scenario" onClick={() => onNew()}>
            +
          </button>
        </div>
      ) : null}
      {confirmIndex !== null ? (
        <div
          ref={confirmRef}
          class="scenario-confirm"
          role="dialog"
          aria-modal="true"
          aria-label={`Remove scenario ${confirmIndex + 1}?`}
        >
          <p>
            Remove scenario {confirmIndex + 1}? {labels[confirmIndex]}
          </p>
          <div class="scenario-confirm-actions">
            <button
              type="button"
              onClick={() => {
                onRemove(confirmIndex);
                setConfirmIndex(null);
                setListOpen(false);
                triggerRef.current?.focus();
              }}
            >
              Remove
            </button>
            <button
              type="button"
              ref={(node) => node?.focus()}
              onClick={() => {
                setConfirmIndex(null);
                const trash = listRef.current?.querySelectorAll<HTMLButtonElement>(".scenario-trash")[
                  confirmIndex
                ];
                trash?.focus();
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9 3h6l1 2h5v2H3V5h5l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z"
      />
    </svg>
  );
}
