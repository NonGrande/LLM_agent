import { useId, useRef, useState, type ReactNode } from "react";

type TooltipProps = {
  content: ReactNode;
  /** Accessible name for the tip trigger (default: «Подсказка») */
  label?: string;
  className?: string;
};

/**
 * Dense Cursor-like help tip: small «?» next to a label.
 * Shows a popup on hover and keyboard focus (Escape closes).
 */
export function Tooltip({ content, label = "Подсказка", className = "" }: TooltipProps) {
  const tipId = useId();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    clearClose();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  const show = () => {
    clearClose();
    setOpen(true);
  };

  return (
    <span
      className={`relative inline-flex align-middle ${className}`}
      onMouseEnter={show}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-border-default text-[9px] font-semibold leading-none text-text-muted hover:border-accent-blue hover:text-accent-blue focus-visible:border-accent-blue focus-visible:text-accent-blue"
        aria-label={label}
        aria-describedby={open ? tipId : undefined}
        aria-expanded={open}
        onFocus={show}
        onBlur={scheduleClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            clearClose();
            setOpen(false);
            (e.target as HTMLButtonElement).blur();
          }
        }}
      >
        ?
      </button>
      {open && (
        <span
          id={tipId}
          role="tooltip"
          className="absolute bottom-[calc(100%+6px)] left-1/2 z-[60] w-max max-w-[min(280px,70vw)] -translate-x-1/2 rounded border border-border-default bg-bg-tertiary px-2.5 py-1.5 text-left text-[11px] font-normal normal-case tracking-normal text-text-secondary shadow-lg"
          onMouseEnter={show}
          onMouseLeave={scheduleClose}
        >
          <span className="block whitespace-pre-wrap leading-snug">{content}</span>
        </span>
      )}
    </span>
  );
}

/** Label row with optional help tip — keeps Settings fields dense. */
export function FieldLabel({
  children,
  tip,
  tipLabel,
}: {
  children: ReactNode;
  tip?: ReactNode;
  tipLabel?: string;
}) {
  const hasTip = tip != null && tip !== false && tip !== "";
  return (
    <span className="mb-1 flex items-center gap-1.5 text-text-secondary">
      <span className="min-w-0">{children}</span>
      {hasTip && (
        <Tooltip
          content={tip}
          label={tipLabel ?? (typeof children === "string" ? `Подсказка: ${children}` : "Подсказка")}
        />
      )}
    </span>
  );
}
