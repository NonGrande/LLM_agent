use crate::models::GrepMatch;
use crate::utils::path::{path_to_string, resolve_path};
use crate::utils::security::validate_path;
use regex::RegexBuilder;
use std::fs;
use walkdir::WalkDir;

const MAX_GREP: usize = 500;
const MAX_GLOB: usize = 1000;

#[tauri::command]
pub async fn glob_search(
    pattern: String,
    path: Option<String>,
    exclude_patterns: Option<Vec<String>>,
) -> Result<Vec<String>, String> {
    let root = resolve_path(path.as_deref().unwrap_or("."))?;
    validate_path(&root)?;
    let excludes = exclude_patterns.unwrap_or_default();
    let mut out = Vec::new();
    for entry in WalkDir::new(&root).into_iter().filter_map(|e| e.ok()) {
        if !entry.file_type().is_file() {
            continue;
        }
        let p = entry.path();
        let rel = p.strip_prefix(&root).unwrap_or(p);
        let rel_s = rel.to_string_lossy();
        if excludes.iter().any(|ex| rel_s.contains(ex)) {
            continue;
        }
        if glob::Pattern::new(&pattern)
            .map(|g| g.matches_path(rel) || g.matches_path(p))
            .unwrap_or(false)
        {
            out.push(path_to_string(p));
            if out.len() >= MAX_GLOB {
                break;
            }
        }
    }
    Ok(out)
}

#[tauri::command]
pub async fn grep_search(
    pattern: String,
    path: Option<String>,
    include: Option<String>,
    case_insensitive: Option<bool>,
) -> Result<Vec<GrepMatch>, String> {
    let root = resolve_path(path.as_deref().unwrap_or("."))?;
    validate_path(&root)?;
    let re = RegexBuilder::new(&pattern)
        .case_insensitive(case_insensitive.unwrap_or(false))
        .build()
        .map_err(|e| format!("invalid regex: {e}"))?;
    let include_pat = include
        .as_ref()
        .and_then(|p| glob::Pattern::new(p).ok());

    let mut out = Vec::new();
    for entry in WalkDir::new(&root).into_iter().filter_map(|e| e.ok()) {
        if !entry.file_type().is_file() {
            continue;
        }
        let p = entry.path();
        if let Some(ref g) = include_pat {
            let name = p.file_name().and_then(|n| n.to_str()).unwrap_or("");
            if !g.matches(name) {
                continue;
            }
        }
        let Ok(content) = fs::read_to_string(p) else {
            continue;
        };
        for (idx, line) in content.lines().enumerate() {
            if let Some(m) = re.find(line) {
                out.push(GrepMatch {
                    file_path: path_to_string(p),
                    line_number: (idx + 1) as u32,
                    line_content: line.to_string(),
                    match_start: m.start() as u32,
                    match_end: m.end() as u32,
                });
                if out.len() >= MAX_GREP {
                    return Ok(out);
                }
            }
        }
    }
    Ok(out)
}
