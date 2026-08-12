import { useEffect } from "react";
import { useIdeStore } from "@/stores/ideStore";

function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
}

/** Global IDE hotkeys: palette, quick open, find, inline edit, problems. */
export function useIdeHotkeys() {
  const setModal = useIdeStore((s) => s.setModal);
  const closeModal = useIdeStore((s) => s.closeModal);
  const modal = useIdeStore((s) => s.modal);
  const toggleBottomPanel = useIdeStore((s) => s.toggleBottomPanel);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      if (e.key === "p" && e.shiftKey) {
        e.preventDefault();
        setModal("palette");
        return;
      }
      if (e.key === "p" && !e.shiftKey) {
        e.preventDefault();
        setModal("quickOpen");
        return;
      }
      if (e.key === "f" && e.shiftKey) {
        e.preventDefault();
        setModal("find");
        return;
      }
      if (e.key === "m" && e.shiftKey) {
        e.preventDefault();
        toggleBottomPanel("problems");
        return;
      }
      if (e.key === "k" && !e.shiftKey && !isEditableTarget(e.target)) {
        e.preventDefault();
        setModal("inlineEdit");
        return;
      }
      if (e.key === "Escape" && modal !== "none") {
        e.preventDefault();
        closeModal();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setModal, closeModal, modal, toggleBottomPanel]);
}
