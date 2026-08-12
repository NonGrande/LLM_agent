import { invoke } from "@tauri-apps/api/core";

export interface ScreenshotResult {
  path: string;
  width: number;
  height: number;
  size_bytes: number;
  target: string;
  mime_type: string;
  data_url?: string | null;
}

/** Capture primary monitor or the app window. Requires Tauri. */
export async function takeScreenshot(
  target: "primary" | "window" = "primary",
): Promise<ScreenshotResult> {
  return invoke<ScreenshotResult>("take_screenshot", { target });
}
