use crate::models::SystemInfo;
use crate::utils::path::resolve_path;
use crate::utils::security::validate_path;

#[tauri::command]
pub async fn get_system_info() -> Result<SystemInfo, String> {
    Ok(SystemInfo {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        hostname: hostname(),
        cpu_count: std::thread::available_parallelism()
            .map(|n| n.get())
            .unwrap_or(1),
        memory_total: 0,
        shell: default_shell(),
    })
}

#[tauri::command]
pub async fn open_folder(path: String) -> Result<(), String> {
    let resolved = resolve_path(&path)?;
    validate_path(&resolved)?;

    #[cfg(windows)]
    {
        std::process::Command::new("explorer")
            .arg(&resolved)
            .spawn()
            .map_err(|e| format!("open folder failed: {e}"))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&resolved)
            .spawn()
            .map_err(|e| format!("open folder failed: {e}"))?;
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        std::process::Command::new("xdg-open")
            .arg(&resolved)
            .spawn()
            .map_err(|e| format!("open folder failed: {e}"))?;
    }

    Ok(())
}

/// Launch Cloudflare One / WARP if installed; otherwise open download page.
#[tauri::command]
pub async fn launch_cloudflare_one() -> Result<String, String> {
    #[cfg(windows)]
    {
        let candidates = [
            r"C:\Program Files\Cloudflare\Cloudflare One\Cloudflare WARP.exe",
            r"C:\Program Files\Cloudflare\Cloudflare WARP\Cloudflare WARP.exe",
            r"C:\Program Files (x86)\Cloudflare\Cloudflare WARP\Cloudflare WARP.exe",
            r"C:\Program Files\Cloudflare\CloudflareOne\Cloudflare WARP.exe",
        ];
        for path in candidates {
            if std::path::Path::new(path).is_file() {
                std::process::Command::new(path)
                    .spawn()
                    .map_err(|e| format!("Не удалось запустить Cloudflare: {e}"))?;
                return Ok(format!("launched:{path}"));
            }
        }
        let url = "https://one.one.one.one/";
        std::process::Command::new("cmd")
            .args(["/C", "start", "", url])
            .spawn()
            .map_err(|e| format!("Не найден Cloudflare One. Открыть сайт не удалось: {e}"))?;
        return Ok(format!("opened_download:{url}"));
    }

    #[cfg(target_os = "macos")]
    {
        let app = "/Applications/Cloudflare One.app";
        if std::path::Path::new(app).exists() {
            std::process::Command::new("open")
                .arg(app)
                .spawn()
                .map_err(|e| format!("launch failed: {e}"))?;
            return Ok(format!("launched:{app}"));
        }
        let url = "https://one.one.one.one/";
        std::process::Command::new("open")
            .arg(url)
            .spawn()
            .map_err(|e| format!("open failed: {e}"))?;
        return Ok(format!("opened_download:{url}"));
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        for bin in ["warp-cli", "cloudflare-warp"] {
            if which_bin(bin) {
                let _ = std::process::Command::new(bin).arg("connect").spawn();
                return Ok(format!("launched:{bin}"));
            }
        }
        let url = "https://one.one.one.one/";
        let _ = std::process::Command::new("xdg-open").arg(url).spawn();
        return Ok(format!("opened_download:{url}"));
    }

    #[allow(unreachable_code)]
    Err("Cloudflare launch не поддерживается на этой платформе".into())
}

#[cfg(all(unix, not(target_os = "macos")))]
fn which_bin(name: &str) -> bool {
    std::process::Command::new("which")
        .arg(name)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

fn hostname() -> String {
    hostname_impl().unwrap_or_else(|| "unknown".into())
}

fn hostname_impl() -> Option<String> {
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .ok()
}

fn default_shell() -> String {
    #[cfg(windows)]
    {
        std::env::var("COMSPEC").unwrap_or_else(|_| "cmd.exe".into())
    }
    #[cfg(not(windows))]
    {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".into())
    }
}
