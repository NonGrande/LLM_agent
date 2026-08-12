/** True when running inside Tauri WebView (not plain browser `vite` only). */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
