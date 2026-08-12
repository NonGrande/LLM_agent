use std::path::{Path, PathBuf};

/// Normalize and resolve a path string to an absolute PathBuf.
pub fn resolve_path(path: &str) -> Result<PathBuf, String> {
    let p = PathBuf::from(path);
    if p.as_os_str().is_empty() {
        return Err("Path is empty".into());
    }
    if p.is_absolute() {
        return Ok(p);
    }
    std::env::current_dir()
        .map(|cwd| cwd.join(p))
        .map_err(|e| format!("Cannot resolve relative path: {e}"))
}

pub fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}
