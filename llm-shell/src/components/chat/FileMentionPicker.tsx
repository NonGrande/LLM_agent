import { useEffect, useRef } from "react";
import type { MentionPickerItem } from "@/services/mentions/docsWeb";

interface Props {
  open: boolean;
  items: MentionPickerItem[];
  activeIndex: number;
  onPick: (item: MentionPickerItem) => void;
}

export function FileMentionPicker({ open, items, activeIndex, onPick }: Props) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  if (!open || items.length === 0) return null;

  return (
    <ul
      ref={listRef}
      className="absolute bottom-full left-0 z-20 mb-1 max-h-48 w-full overflow-y-auto overscroll-contain rounded border border-border-default bg-bg-primary py-1 shadow-lg"
      role="listbox"
    >
      {items.map((item, i) => {
        const key = `${item.kind}:${item.value}`;
        const active = i === activeIndex;
        const badge =
          item.kind === "special"
            ? "спец"
            : item.kind === "docs"
              ? "docs"
              : item.kind === "web"
                ? "web"
                : "файл";
        return (
          <li key={key} role="option" aria-selected={active}>
            <button
              type="button"
              className={`flex w-full items-start gap-2 px-2 py-1 text-left ${
                active ? "bg-bg-tertiary text-text-primary" : "text-text-secondary hover:bg-bg-tertiary"
              }`}
              title={item.hint ?? item.value}
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(item);
              }}
            >
              <span className="mt-0.5 shrink-0 rounded border border-border-muted px-1 font-sans text-[9px] uppercase tracking-wide text-text-muted">
                {badge}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-[11px] ${
                    item.kind === "file" || item.kind === "docs" ? "font-mono" : "font-medium"
                  }`}
                >
                  {item.label}
                </span>
                {item.hint && item.kind === "special" && (
                  <span className="block truncate text-[10px] text-text-muted">{item.hint}</span>
                )}
                {item.hint && item.kind === "web" && (
                  <span className="block truncate text-[10px] text-text-muted">{item.hint}</span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
