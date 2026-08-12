import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/utils/env";

/**
 * Launch Cloudflare One / WARP if installed; otherwise open download page.
 */
export async function launchCloudflareOne(): Promise<{ ok: boolean; detail: string }> {
  if (!isTauri()) {
    if (typeof window !== "undefined") {
      window.open("https://one.one.one.one/", "_blank", "noopener,noreferrer");
    }
    return { ok: true, detail: "opened_download:browser" };
  }
  try {
    const detail = await invoke<string>("launch_cloudflare_one");
    return { ok: true, detail };
  } catch (err) {
    return { ok: false, detail: String(err) };
  }
}
