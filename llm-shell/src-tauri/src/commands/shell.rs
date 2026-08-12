use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};
use crate::models::CommandResult;
use crate::utils::path::resolve_path;

struct TrackedChild {
    child: std::process::Child,
}

static CHILDREN: Mutex<Option<HashMap<u32, TrackedChild>>> = Mutex::new(None);

fn children_map() -> std::sync::MutexGuard<'static, Option<HashMap<u32, TrackedChild>>> {
    let mut g = CHILDREN.lock().unwrap();
    if g.is_none() {
        *g = Some(HashMap::new());
    }
    g
}

fn build_shell_command(command: &str) -> Command {
    #[cfg(windows)]
    {
        let mut c = Command::new("cmd");
        c.args(["/C", command]);
        c
    }
    #[cfg(not(windows))]
    {
        let mut c = Command::new("sh");
        c.args(["-c", command]);
        c
    }
}

#[tauri::command]
pub async fn execute_command(
    command: String,
    cwd: Option<String>,
    timeout_ms: Option<u64>,
    env: Option<HashMap<String, String>>,
) -> Result<CommandResult, String> {
    let timeout = timeout_ms.unwrap_or(120_000);
    let start = Instant::now();
    let mut cmd = build_shell_command(&command);

    if let Some(dir) = cwd {
        let resolved = resolve_path(&dir)?;
        cmd.current_dir(resolved);
    }
    if let Some(vars) = env {
        for (k, v) in vars {
            cmd.env(k, v);
        }
    }

    let (tx, rx) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        let _ = tx.send(cmd.output());
    });

    let output = match rx.recv_timeout(Duration::from_millis(timeout)) {
        Ok(Ok(o)) => o,
        Ok(Err(e)) => return Err(format!("failed to spawn command: {e}")),
        Err(_) => return Err(format!("command timed out after {timeout}ms")),
    };

    Ok(CommandResult {
        stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
        stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
        exit_code: output.status.code(),
        duration_ms: start.elapsed().as_millis() as u64,
    })
}

#[derive(Clone, serde::Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ShellStreamEvent {
    Stdout { line: String },
    Stderr { line: String },
    Exit { code: Option<i32>, duration_ms: u64 },
    Error { message: String },
}

#[tauri::command]
pub async fn execute_command_streaming(
    app: AppHandle,
    command: String,
    cwd: Option<String>,
    channel: String,
    timeout_ms: Option<u64>,
) -> Result<u32, String> {
    let timeout = timeout_ms.unwrap_or(300_000);
    let start = Instant::now();
    let mut cmd = build_shell_command(&command);

    if let Some(dir) = cwd {
        let resolved = resolve_path(&dir)?;
        cmd.current_dir(resolved);
    }

    let mut child = cmd
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("failed to spawn: {e}"))?;

    let pid = child.id();
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    {
        let mut guard = children_map();
        if let Some(map) = guard.as_mut() {
            map.insert(pid, TrackedChild { child });
        }
    }

    let app_out = app.clone();
    let ch_out = channel.clone();
    std::thread::spawn(move || {
        if let Some(out) = stdout {
            let reader = BufReader::new(out);
            for line in reader.lines().flatten() {
                let _ = app_out.emit(&ch_out, ShellStreamEvent::Stdout { line });
            }
        }
    });

    let app_err = app.clone();
    let ch_err = channel.clone();
    std::thread::spawn(move || {
        if let Some(err) = stderr {
            let reader = BufReader::new(err);
            for line in reader.lines().flatten() {
                let _ = app_err.emit(&ch_err, ShellStreamEvent::Stderr { line });
            }
        }
    });

    let app_wait = app.clone();
    let ch_wait = channel.clone();
    std::thread::spawn(move || {
        let deadline = Duration::from_millis(timeout);
        loop {
            let timed_out = start.elapsed() > deadline;
            let mut guard = children_map();
            let map = guard.as_mut().unwrap();
            if let Some(tracked) = map.get_mut(&pid) {
                match tracked.child.try_wait() {
                    Ok(Some(status)) => {
                        let code = status.code();
                        map.remove(&pid);
                        drop(guard);
                        let _ = app_wait.emit(
                            &ch_wait,
                            ShellStreamEvent::Exit {
                                code,
                                duration_ms: start.elapsed().as_millis() as u64,
                            },
                        );
                        return;
                    }
                    Ok(None) if timed_out => {
                        let _ = tracked.child.kill();
                        let _ = tracked.child.wait();
                        map.remove(&pid);
                        drop(guard);
                        let _ = app_wait.emit(
                            &ch_wait,
                            ShellStreamEvent::Error {
                                message: format!("timed out after {timeout}ms"),
                            },
                        );
                        let _ = app_wait.emit(
                            &ch_wait,
                            ShellStreamEvent::Exit {
                                code: None,
                                duration_ms: start.elapsed().as_millis() as u64,
                            },
                        );
                        return;
                    }
                    Ok(None) => {}
                    Err(e) => {
                        map.remove(&pid);
                        drop(guard);
                        let _ = app_wait.emit(
                            &ch_wait,
                            ShellStreamEvent::Error {
                                message: e.to_string(),
                            },
                        );
                        return;
                    }
                }
            } else {
                drop(guard);
                let _ = app_wait.emit(
                    &ch_wait,
                    ShellStreamEvent::Exit {
                        code: None,
                        duration_ms: start.elapsed().as_millis() as u64,
                    },
                );
                return;
            }
            drop(guard);
            std::thread::sleep(Duration::from_millis(40));
        }
    });

    Ok(pid)
}

#[tauri::command]
pub async fn kill_process(pid: u32) -> Result<(), String> {
    {
        let mut guard = children_map();
        let map = guard.as_mut().unwrap();
        if let Some(mut tracked) = map.remove(&pid) {
            let _ = tracked.child.kill();
            let _ = tracked.child.wait();
            return Ok(());
        }
    }
    #[cfg(windows)]
    {
        let status = Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/F"])
            .status()
            .map_err(|e| e.to_string())?;
        if status.success() {
            return Ok(());
        }
        return Err(format!("taskkill failed for pid {pid}"));
    }
    #[cfg(not(windows))]
    {
        let status = Command::new("kill")
            .args(["-9", &pid.to_string()])
            .status()
            .map_err(|e| e.to_string())?;
        if status.success() {
            return Ok(());
        }
        Err(format!("kill failed for pid {pid}"))
    }
}
