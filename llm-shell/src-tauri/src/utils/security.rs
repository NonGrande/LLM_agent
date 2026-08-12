use std::path::Path;

/// Block obvious path-traversal and sensitive system roots (MVP heuristics).
pub fn validate_path(path: &Path) -> Result<(), String> {
    let s = path.to_string_lossy();
    if s.contains('\0') {
        return Err("Path contains NUL".into());
    }

    #[cfg(windows)]
    {
        let lower = s.to_lowercase();
        let blocked = [
            "\\windows\\system32",
            "\\windows\\syswow64",
            "c:\\windows\\system32",
        ];
        for b in blocked {
            if lower.contains(b) {
                return Err(format!("Access to system path is blocked: {s}"));
            }
        }
    }

    #[cfg(unix)]
    {
        let blocked = ["/etc/shadow", "/etc/sudoers", "/root"];
        for b in blocked {
            if s.starts_with(b) {
                return Err(format!("Access to system path is blocked: {s}"));
            }
        }
    }

    Ok(())
}
