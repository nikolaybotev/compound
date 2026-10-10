import { useEffect, useRef, useState } from "preact/hooks";
import type { ScenarioFigures } from "./loan";
import { PrevailingBar } from "./prevailing-bar";

type Props = {
  labels: string[];
  figures: Array<ScenarioFigures | null>;
  active: number;
  saveError: boolean;
  importError: boolean;
  dialogReset: number;
  onSelect: (index: number) => void;
  onNew: () => void;
  onRemove: (index: number) => void;
  onExport: () => void;
  onImport: (file: File) => void;
};

export function ScenarioBar({
  labels,
  figures,
  active,
  saveError,
  importError,
  dialogReset,
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
  const rowButtonsRef = useRef<HTMLButtonElement[]>([]);

  useEffect(() => {
    setListOpen(false);
    setConfirmIndex(null);
  }, [dialogReset]);

  useEffect(() => {
    if (!listOpen || confirmIndex !== null) return;
    const current = rowButtonsRef.current[active];
    current?.focus();
  }, [listOpen, confirmIndex, active]);

  useEffect(() => {
    if (confirmIndex === null) return;
    const dialog = confirmRef.current;
    if (!dialog) return;
    const focusables = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setConfirmIndex(null);
        rowButtonsRef.current[confirmIndex]?.focus();
        return;
      }
      if (event.key !== "Tab" || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener("keydown", onKey);
    return () => dialog.removeEventListener("keydown", onKey);
  }, [confirmIndex]);

  useEffect(() => {
    if (!listOpen && confirmIndex === null) return;
    const onDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (triggerRef.current?.contains(target)) return;
      if (confirmRef.current?.contains(target)) return;
      if (confirmIndex !== null) {
        setConfirmIndex(null);
        setListOpen(false);
        return;
      }
      if (listRef.current?.contains(target)) return;
      setListOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || confirmIndex !== null) return;
      setListOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [listOpen, confirmIndex]);

  function toggleList() {
    if (confirmIndex !== null) return;
    setListOpen(!listOpen);
  }

  function choose(index: number) {
    if (confirmIndex !== null) return;
    onSelect(index);
    setListOpen(false);
    triggerRef.current?.focus();
  }

  function onListKeyDown(event: KeyboardEvent) {
    if (confirmIndex !== null) return;
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const buttons = rowButtonsRef.current.filter(Boolean);
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    const next =
      event.key === "ArrowDown"
        ? buttons[Math.min(index + 1, buttons.length - 1)]
        : buttons[Math.max(index - 1, 0)];
    next?.focus();
  }

  return (
    <div class="scenario-row">
      <div class="scenario-actions">
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
        {figures[active] ? (
          <PrevailingBar
            variant="dropdown"
            modalCents={figures[active]!.modalPaymentCents}
            taxCents={figures[active]!.taxCents}
            insuranceCents={figures[active]!.insuranceCents}
            fhaMipCents={figures[active]!.fhaMipCents}
            pmiCents={figures[active]!.pmiCents}
            prevailingExtraCents={figures[active]!.prevailingExtraCents}
          />
        ) : null}
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
      </div>
      {saveError ? (
        <p class="scenario-save-error" role="alert">Could not save this loan.</p>
      ) : null}
      {listOpen ? (
        <div
          ref={listRef}
          class="scenario-dialog"
          role="dialog"
          aria-label="Loan scenarios"
          inert={confirmIndex !== null ? true : undefined}
          onKeyDown={onListKeyDown}
        >
          <ul class="scenario-list">
            {labels.map((label, index) => (
              <li key={index} class="scenario-list-item">
                <button
                  type="button"
                  class="scenario-row-button"
                  ref={(node) => {
                    if (node) rowButtonsRef.current[index] = node;
                  }}
                  aria-label={label}
                  aria-current={index === active ? "true" : undefined}
                  onClick={() => choose(index)}
                >
                  <span class="scenario-row-text">{label}</span>
                  {figures[index] ? (
                    <PrevailingBar
                      variant="dropdown"
                      modalCents={figures[index]!.modalPaymentCents}
                      taxCents={figures[index]!.taxCents}
                      insuranceCents={figures[index]!.insuranceCents}
                      fhaMipCents={figures[index]!.fhaMipCents}
                      pmiCents={figures[index]!.pmiCents}
                      prevailingExtraCents={figures[index]!.prevailingExtraCents}
                    />
                  ) : null}
                </button>
                {labels.length > 1 ? (
                  <button
                    type="button"
                    class="scenario-trash"
                    aria-label={`Remove scenario ${index + 1}`}
                    tabIndex={confirmIndex !== null ? -1 : undefined}
                    onClick={(event) => {
                      event.stopPropagation();
                      setConfirmIndex(index);
                    }}
                  >
                    <TrashIcon />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          <button
            type="button"
            class="scenario-new"
            aria-label="New scenario"
            tabIndex={confirmIndex !== null ? -1 : undefined}
            onClick={() => {
              onNew();
              setListOpen(false);
              triggerRef.current?.focus();
            }}
          >
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
                const index = confirmIndex;
                setConfirmIndex(null);
                rowButtonsRef.current[index]?.focus();
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
