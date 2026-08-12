use crate::models::{DirEntry, EditResult, FileContent, FileInfo};
use crate::utils::path::{path_to_string, resolve_path};
use crate::utils::security::validate_path;
use std::fs;
use std::io::Read;
use std::time::SystemTime;

const MAX_TEXT_BYTES: u64 = 10 * 1024 * 1024;

fn modified_secs(meta: &fs::Metadata) -> u64 {
    meta.modified()
        .ok()
        .and_then(|t| t.duration_since(SystemTime::UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

fn created_secs(meta: &fs::Metadata) -> u64 {
    meta.created()
        .ok()
        .and_then(|t| t.duration_since(SystemTime::UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

fn looks_binary(bytes: &[u8]) -> bool {
    bytes.iter().take(8000).any(|&b| b == 0)
}

#[tauri::command]
pub async fn read_file(path: String) -> Result<FileContent, String> {
    let resolved = resolve_path(&path)?;
    validate_path(&resolved)?;
    let meta = fs::metadata(&resolved).map_err(|e| format!("stat failed: {e}"))?;
    if meta.is_dir() {
        return Err("Path is a directory".into());
    }
    let size = meta.len();
    if size > MAX_TEXT_BYTES {
        return Err(format!("File too large ({size} bytes), max {MAX_TEXT_BYTES}"));
    }
    let mut file = fs::File::open(&resolved).map_err(|e| format!("open failed: {e}"))?;
    let mut buf = Vec::new();
    file.read_to_end(&mut buf)
        .map_err(|e| format!("read failed: {e}"))?;
    let is_binary = looks_binary(&buf);
    let content = if is_binary {
        String::new()
    } else {
        String::from_utf8_lossy(&buf).into_owned()
    };
    Ok(FileContent {
        path: path_to_string(&resolved),
        content,
        size,
        is_binary,
        encoding: if is_binary { "binary".into() } else { "utf-8".into() },
    })
}

#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    let resolved = resolve_path(&path)?;
    validate_path(&resolved)?;
    if let Some(parent) = resolved.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("mkdir parent failed: {e}"))?;
    }
    fs::write(&resolved, content.as_bytes()).map_err(|e| format!("write failed: {e}"))
}

#[tauri::command]
pub async fn edit_file(
    path: String,
    old_string: String,
    new_string: String,
    replace_all: Option<bool>,
) -> Result<EditResult, String> {
    let file = read_file(path.clone()).await?;
    if file.is_binary {
        return Ok(EditResult {
            success: false,
            matches_found: 0,
            message: "Cannot edit binary file".into(),
        });
    }
    let replace_all = replace_all.unwrap_or(false);
    let matches_found = file.content.matches(&old_string).count();
    if matches_found == 0 {
        return Ok(EditResult {
            success: false,
            matches_found: 0,
            message: "old_string not found".into(),
        });
    }
    if !replace_all && matches_found > 1 {
        return Ok(EditResult {
            success: false,
            matches_found,
            message: "old_string is not unique; set replace_all or provide more context".into(),
        });
    }
    let new_content = if replace_all {
        file.content.replace(&old_string, &new_string)
    } else {
        file.content.replacen(&old_string, &new_string, 1)
    };
    write_file(path, new_content).await?;
    Ok(EditResult {
        success: true,
        matches_found,
        message: "ok".into(),
    })
}

#[tauri::command]
pub async fn list_directory(path: String) -> Result<Vec<DirEntry>, String> {
    let resolved = resolve_path(&path)?;
    validate_path(&resolved)?;
    let rd = fs::read_dir(&resolved).map_err(|e| format!("read_dir failed: {e}"))?;
    let mut out = Vec::new();
    for entry in rd {
        let entry = entry.map_err(|e| format!("dir entry failed: {e}"))?;
        let meta = entry.metadata().map_err(|e| format!("metadata failed: {e}"))?;
        let p = entry.path();
        out.push(DirEntry {
            name: entry.file_name().to_string_lossy().into_owned(),
            path: path_to_string(&p),
            is_dir: meta.is_dir(),
            size: meta.len(),
            modified: modified_secs(&meta),
        });
    }
    Ok(out)
}

#[tauri::command]
pub async fn create_directory(path: String) -> Result<(), String> {
    let resolved = resolve_path(&path)?;
    validate_path(&resolved)?;
    fs::create_dir_all(&resolved).map_err(|e| format!("create_dir failed: {e}"))
}

#[tauri::command]
pub async fn delete_path(path: String) -> Result<(), String> {
    let resolved = resolve_path(&path)?;
    validate_path(&resolved)?;
    let meta = fs::metadata(&resolved).map_err(|e| format!("stat failed: {e}"))?;
    if meta.is_dir() {
        fs::remove_dir_all(&resolved).map_err(|e| format!("remove_dir failed: {e}"))
    } else {
        fs::remove_file(&resolved).map_err(|e| format!("remove_file failed: {e}"))
    }
}

#[tauri::command]
pub async fn move_path(from: String, to: String) -> Result<(), String> {
    let from_p = resolve_path(&from)?;
    let to_p = resolve_path(&to)?;
    validate_path(&from_p)?;
    validate_path(&to_p)?;
    fs::rename(&from_p, &to_p).map_err(|e| format!("rename failed: {e}"))
}

#[tauri::command]
pub async fn file_info(path: String) -> Result<FileInfo, String> {
    let resolved = resolve_path(&path)?;
    validate_path(&resolved)?;
    let meta = fs::metadata(&resolved).map_err(|e| format!("stat failed: {e}"))?;
    Ok(FileInfo {
        path: path_to_string(&resolved),
        size: meta.len(),
        is_dir: meta.is_dir(),
        is_readonly: meta.permissions().readonly(),
        modified: modified_secs(&meta),
        created: created_secs(&meta),
    })
}
