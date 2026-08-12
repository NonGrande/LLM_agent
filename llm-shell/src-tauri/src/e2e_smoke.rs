//! IPC-layer e2e smoke: Open folder → write_file → execute_command → take_screenshot.
//! Run: `cargo test --manifest-path src-tauri/Cargo.toml e2e_smoke -- --nocapture`
//! Or: `npm run test:e2e-ipc`

use crate::commands::{fs, screenshot, shell};
use std::fs as stdfs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

fn temp_workspace() -> PathBuf {
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let dir = std::env::temp_dir().join(format!("llm-shell-e2e-{stamp}"));
    stdfs::create_dir_all(&dir).expect("create e2e workspace");
    dir
}

#[tokio::test]
async fn open_folder_write_file_execute_command() {
    let root = temp_workspace();
    let root_s = root.to_string_lossy().to_string();

    // Open folder ≈ list_directory on workspace root
    let entries = fs::list_directory(root_s.clone())
        .await
        .expect("list_directory (open folder)");
    assert!(
        entries.is_empty() || entries.iter().all(|e| !e.path.is_empty()),
        "unexpected list_directory payload: {entries:?}"
    );

    let file = root.join("e2e-note.txt");
    let file_s = file.to_string_lossy().to_string();
    fs::write_file(file_s.clone(), "hello from e2e\n".into())
        .await
        .expect("write_file");

    let read = fs::read_file(file_s.clone())
        .await
        .expect("read_file after write");
    assert!(
        read.content.contains("hello from e2e"),
        "content mismatch: {}",
        read.content
    );

    let listed = fs::list_directory(root_s.clone())
        .await
        .expect("list after write");
    assert!(
        listed
            .iter()
            .any(|e| e.name == "e2e-note.txt" || e.path.ends_with("e2e-note.txt")),
        "written file not listed: {listed:?}"
    );

    let cmd = "echo e2e-shell-ok".to_string();
    let out = shell::execute_command(cmd, Some(root_s.clone()), Some(15_000), None)
        .await
        .expect("execute_command");
    assert_eq!(out.exit_code, Some(0), "stderr={}", out.stderr);
    assert!(
        out.stdout.to_lowercase().contains("e2e-shell-ok"),
        "stdout={}",
        out.stdout
    );

    let _ = stdfs::remove_dir_all(&root);
}

#[test]
fn take_screenshot_primary_monitor() {
    let shot = screenshot::capture_for_e2e("primary").expect("take_screenshot primary");
    assert!(
        std::path::Path::new(&shot.path).is_file(),
        "png missing: {}",
        shot.path
    );
    assert!(shot.width > 0 && shot.height > 0, "empty image dims");
    assert!(shot.size_bytes > 0, "empty png");
    assert_eq!(shot.target, "primary");
    eprintln!(
        "e2e screenshot OK: {} ({}x{}, {} bytes)",
        shot.path, shot.width, shot.height, shot.size_bytes
    );
}
