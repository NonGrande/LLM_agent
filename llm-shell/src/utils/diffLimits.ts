/** Skip inline diff render above this — prevents WebView2 freeze/black screen. */
export const MAX_DIFF_RENDER_CHARS = 48_000;

export function diffTooLarge(oldValue: string, newValue: string): boolean {
  return oldValue.length + newValue.length > MAX_DIFF_RENDER_CHARS;
}
