interface Props {
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, description, onConfirm, onCancel }: Props) {
  return (
    <div
      className="ui-modal-scrim fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-md rounded-lg border border-border-default bg-bg-secondary p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-dialog-title" className="mb-2 text-sm font-semibold text-pretty">
          {title}
        </h3>
        <p className="mb-4 text-[13px] leading-relaxed text-text-secondary">{description}</p>
        <div className="flex justify-end gap-2">
          <button type="button" className="ui-chrome-btn bg-bg-tertiary px-3 py-1.5" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="rounded bg-accent-blue px-3 py-1.5 text-[12px] text-white hover:brightness-110"
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
