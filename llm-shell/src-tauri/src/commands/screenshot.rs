use crate::models::ScreenshotResult;
use base64::{engine::general_purpose::STANDARD, Engine};
use image::imageops::FilterType;
use image::{DynamicImage, ImageFormat, RgbaImage};
use std::io::Cursor;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use xcap::{Monitor, Window};

const MAX_VISION_WIDTH: u32 = 1280;
const MAX_DATA_URL_CHARS: usize = 1_800_000;

#[tauri::command]
pub async fn take_screenshot(
    app: AppHandle,
    target: Option<String>,
) -> Result<ScreenshotResult, String> {
    let target = normalize_target(target.as_deref());
    let app_title = app
        .get_webview_window("main")
        .and_then(|w| w.title().ok())
        .unwrap_or_else(|| "LLM Shell".into());

    tokio::task::spawn_blocking(move || capture_blocking(&target, &app_title))
        .await
        .map_err(|e| format!("screenshot task failed: {e}"))?
}

fn normalize_target(raw: Option<&str>) -> String {
    match raw.map(|s| s.trim().to_ascii_lowercase()).as_deref() {
        Some("window") | Some("app") | Some("app_window") => "window".into(),
        _ => "primary".into(),
    }
}

/// IPC-free capture for e2e / unit tests (no `AppHandle`).
#[cfg(test)]
pub(crate) fn capture_for_e2e(target: &str) -> Result<ScreenshotResult, String> {
    capture_blocking(target, "LLM Shell")
}

fn capture_blocking(target: &str, app_title: &str) -> Result<ScreenshotResult, String> {
    let (image, label) = if target == "window" {
        capture_app_window(app_title)?
    } else {
        capture_primary_monitor()?
    };

    let width = image.width();
    let height = image.height();

    let dir = screenshot_dir()?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("create screenshot dir: {e}"))?;

    let filename = format!(
        "screenshot-{}-{}.png",
        label,
        chrono::Local::now().format("%Y%m%d-%H%M%S-%3f")
    );
    let path = dir.join(filename);
    image
        .save(&path)
        .map_err(|e| format!("save PNG failed: {e}"))?;

    let size_bytes = std::fs::metadata(&path)
        .map(|m| m.len())
        .unwrap_or(0);

    let data_url = encode_vision_data_url(&image);

    Ok(ScreenshotResult {
        path: path.to_string_lossy().into_owned(),
        width,
        height,
        size_bytes,
        target: target.to_string(),
        mime_type: "image/png".into(),
        data_url,
    })
}

fn screenshot_dir() -> Result<PathBuf, String> {
    let base = dirs::cache_dir()
        .or_else(dirs::data_local_dir)
        .unwrap_or_else(std::env::temp_dir);
    Ok(base.join("llm-shell").join("screenshots"))
}

fn capture_primary_monitor() -> Result<(RgbaImage, String), String> {
    let monitors = Monitor::all().map_err(|e| format!("list monitors: {e}"))?;
    if monitors.is_empty() {
        return Err("No monitors found".into());
    }
    let monitor = monitors
        .iter()
        .find(|m| m.is_primary().unwrap_or(false))
        .or_else(|| monitors.first())
        .ok_or_else(|| "No monitors found".to_string())?;

    let name = monitor
        .name()
        .or_else(|_| monitor.friendly_name())
        .unwrap_or_else(|_| "primary".into());
    let image = monitor
        .capture_image()
        .map_err(|e| format!("capture primary monitor failed: {e}"))?;
    Ok((image, sanitize_label(&name)))
}

fn capture_app_window(app_title: &str) -> Result<(RgbaImage, String), String> {
    let windows = Window::all().map_err(|e| format!("list windows: {e}"))?;
    let needle = app_title.to_ascii_lowercase();
    let fallback_needles = ["llm shell", "llm-shell"];

    let window = windows
        .iter()
        .find(|w| {
            let title = w.title().unwrap_or_default().to_ascii_lowercase();
            (!needle.is_empty() && title.contains(&needle))
                || fallback_needles.iter().any(|n| title.contains(n))
        })
        .or_else(|| {
            windows.iter().find(|w| {
                w.is_focused().unwrap_or(false) && !w.is_minimized().unwrap_or(true)
            })
        });

    let Some(window) = window else {
        // Fall back to primary monitor so the tool still works
        return capture_primary_monitor().map(|(img, _)| (img, "window-fallback-primary".into()));
    };

    if window.is_minimized().unwrap_or(false) {
        return Err("App window is minimized; restore it or use target \"primary\"".into());
    }

    let title = window.title().unwrap_or_else(|_| "window".into());
    let image = window
        .capture_image()
        .map_err(|e| format!("capture app window failed: {e}"))?;
    Ok((image, sanitize_label(&title)))
}

fn sanitize_label(raw: &str) -> String {
    let s: String = raw
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '-'
            }
        })
        .collect();
    let trimmed = s.trim_matches('-');
    if trimmed.is_empty() {
        "shot".into()
    } else {
        trimmed.chars().take(48).collect()
    }
}

/// Downscale + JPEG for multimodal prompts (keeps tool payloads smaller than full PNG).
fn encode_vision_data_url(image: &RgbaImage) -> Option<String> {
    let dyn_img = DynamicImage::ImageRgba8(image.clone());
    let resized = if dyn_img.width() > MAX_VISION_WIDTH {
        let h = ((dyn_img.height() as f64) * (MAX_VISION_WIDTH as f64) / (dyn_img.width() as f64))
            .round()
            .max(1.0) as u32;
        dyn_img.resize(MAX_VISION_WIDTH, h, FilterType::Triangle)
    } else {
        dyn_img
    };

    let mut buf = Cursor::new(Vec::new());
    if resized
        .write_to(&mut buf, ImageFormat::Jpeg)
        .is_err()
    {
        return None;
    }
    let bytes = buf.into_inner();
    let b64 = STANDARD.encode(&bytes);
    let data_url = format!("data:image/jpeg;base64,{b64}");
    if data_url.len() > MAX_DATA_URL_CHARS {
        return None;
    }
    Some(data_url)
}
