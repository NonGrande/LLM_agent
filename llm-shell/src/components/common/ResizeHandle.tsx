import { useCallback, useEffect, useRef, useState } from "react";

type Orientation = "horizontal" | "vertical";

interface Props {
  /** horizontal = left|right columns (col-resize); vertical = top|bottom (row-resize) */
  orientation: Orientation;
  value: number;
  onChange: (next: number) => void;
  /**
   * When true, moving the pointer in the positive axis direction decreases `value`
   * (use for the left edge of a right-hand pane).
   */
  reverse?: boolean;
  title?: string;
  className?: string;
}

/**
 * Thin draggable splitter. Parent owns size; no external deps.
 */
export function ResizeHandle({
  orientation,
  value,
  onChange,
  reverse = false,
  title,
  className = "",
}: Props) {
  const valueRef = useRef(value);
  const startPosRef = useRef(0);
  const startValueRef = useRef(value);
  const [dragging, setDragging] = useState(false);
  const horizontal = orientation === "horizontal";

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const el = e.currentTarget;
      el.setPointerCapture(e.pointerId);
      startPosRef.current = horizontal ? e.clientX : e.clientY;
      startValueRef.current = valueRef.current;
      setDragging(true);

      const onMove = (ev: PointerEvent) => {
        const pos = horizontal ? ev.clientX : ev.clientY;
        const delta = pos - startPosRef.current;
        onChange(startValueRef.current + (reverse ? -delta : delta));
      };

      const onUp = (ev: PointerEvent) => {
        try {
          el.releasePointerCapture(ev.pointerId);
        } catch {
          /* already released */
        }
        setDragging(false);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [horizontal, onChange, reverse],
  );

  return (
    <div
      role="separator"
      aria-orientation={horizontal ? "vertical" : "horizontal"}
      aria-label={title}
      title={title}
      onPointerDown={onPointerDown}
      className={[
        "shrink-0 touch-none select-none bg-border-default transition-colors duration-100",
        horizontal
          ? "w-1 cursor-col-resize hover:bg-accent-blue/50"
          : "h-1 cursor-row-resize hover:bg-accent-blue/50",
        dragging ? "bg-accent-blue" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
