//! Bidirectional stdio process sessions (MCP / LSP Content-Length framing).

use std::collections::HashMap;
use std::io::{BufRead, BufReader, Read, Write};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::Mutex;
use std::thread;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

use crate::utils::path::resolve_path;

struct PipedSession {
    child: Child,
    stdin: Option<ChildStdin>,
}

static SESSIONS: Mutex<Option<HashMap<String, PipedSession>>> = Mutex::new(None);

fn sessions_map() -> std::sync::MutexGuard<'static, Option<HashMap<String, PipedSession>>> {
    let mut g = SESSIONS.lock().unwrap();
    if g.is_none() {
        *g = Some(HashMap::new());
    }
    g
}

#[derive(Clone, serde::Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum PipedEvent {
    Frame { body: String },
    Stderr { line: String },
    Exit { code: Option<i32> },
    Error { message: String },
}

fn apply_windows_flags(cmd: &mut Command) {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
}

/// Read one LSP/MCP Content-Length frame from a reader.
fn read_frame<R: Read>(reader: &mut BufReader<R>) -> Result<Option<String>, String> {
    let mut content_length: Option<usize> = None;
    loop {
        let mut line = String::new();
        let n = reader
            .read_line(&mut line)
            .map_err(|e| format!("read header: {e}"))?;
        if n == 0 {
            return Ok(None); // EOF
        }
        let trimmed = line.trim_end_matches(['\r', '\n']);
        if trimmed.is_empty() {
            break;
        }
        if let Some(rest) = trimmed
            .strip_prefix("Content-Length:")
            .or_else(|| trimmed.strip_prefix("content-length:"))
        {
            content_length = Some(
                rest.trim()
                    .parse::<usize>()
                    .map_err(|e| format!("bad Content-Length: {e}"))?,
            );
        }
    }
    let len = content_length.ok_or_else(|| "missing Content-Length".to_string())?;
    let mut buf = vec![0u8; len];
    reader
        .read_exact(&mut buf)
        .map_err(|e| format!("read body: {e}"))?;
    Ok(Some(
        String::from_utf8(buf).map_err(|e| format!("utf8 body: {e}"))?,
    ))
}

fn write_frame(stdin: &mut ChildStdin, body: &str) -> Result<(), String> {
    let bytes = body.as_bytes();
    write!(stdin, "Content-Length: {}\r\n\r\n", bytes.len())
        .map_err(|e| format!("write header: {e}"))?;
    stdin
        .write_all(bytes)
        .map_err(|e| format!("write body: {e}"))?;
    stdin.flush().map_err(|e| format!("flush: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn piped_spawn(
    app: AppHandle,
    program: String,
    args: Vec<String>,
    cwd: Option<String>,
    channel: String,
    env: Option<HashMap<String, String>>,
) -> Result<String, String> {
    let program = program.trim();
    if program.is_empty() {
        return Err("program is empty".into());
    }

    let mut cmd = Command::new(program);
    cmd.args(&args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    apply_windows_flags(&mut cmd);

    if let Some(dir) = cwd {
        let resolved = resolve_path(&dir)?;
        cmd.current_dir(resolved);
    }
    if let Some(vars) = env {
        for (k, v) in vars {
            cmd.env(k, v);
        }
    }

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("failed to spawn `{program}`: {e}"))?;

    let stdin = child.stdin.take();
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let session_id = Uuid::new_v4().to_string();

    {
        let mut guard = sessions_map();
        if let Some(map) = guard.as_mut() {
            map.insert(
                session_id.clone(),
                PipedSession {
                    child,
                    stdin,
                },
            );
        }
    }

    let sid_out = session_id.clone();
    let app_out = app.clone();
    let ch_out = channel.clone();
    thread::spawn(move || {
        if let Some(out) = stdout {
            let mut reader = BufReader::new(out);
            loop {
                match read_frame(&mut reader) {
                    Ok(Some(body)) => {
                        let _ = app_out.emit(&ch_out, PipedEvent::Frame { body });
                    }
                    Ok(None) => break,
                    Err(message) => {
                        let _ = app_out.emit(&ch_out, PipedEvent::Error { message });
                        break;
                    }
                }
            }
        }
        let exit_code = {
            let mut guard = sessions_map();
            if let Some(map) = guard.as_mut() {
                if let Some(mut sess) = map.remove(&sid_out) {
                    sess.child.wait().ok().and_then(|s| s.code())
                } else {
                    None
                }
            } else {
                None
            }
        };
        let _ = app_out.emit(&ch_out, PipedEvent::Exit { code: exit_code });
    });

    let app_err = app.clone();
    let ch_err = channel.clone();
    thread::spawn(move || {
        if let Some(err) = stderr {
            let reader = BufReader::new(err);
            for line in reader.lines().flatten() {
                let _ = app_err.emit(&ch_err, PipedEvent::Stderr { line });
            }
        }
    });

    Ok(session_id)
}

#[tauri::command]
pub async fn piped_write_frame(session_id: String, body: String) -> Result<(), String> {
    let mut guard = sessions_map();
    let map = guard.as_mut().ok_or_else(|| "no sessions".to_string())?;
    let sess = map
        .get_mut(&session_id)
        .ok_or_else(|| format!("unknown session {session_id}"))?;
    let stdin = sess
        .stdin
        .as_mut()
        .ok_or_else(|| "stdin closed".to_string())?;
    write_frame(stdin, &body)
}

#[tauri::command]
pub async fn piped_kill(session_id: String) -> Result<(), String> {
    let mut guard = sessions_map();
    let map = guard.as_mut().ok_or_else(|| "no sessions".to_string())?;
    if let Some(mut sess) = map.remove(&session_id) {
        let _ = sess.child.kill();
        let _ = sess.child.wait();
        return Ok(());
    }
    Err(format!("unknown session {session_id}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;

    #[test]
    fn parses_content_length_frame() {
        let body = "{\"jsonrpc\":\"2.0\"}";
        let raw = format!("Content-Length: {}\r\n\r\n{}", body.len(), body);
        let mut reader = BufReader::new(Cursor::new(raw.into_bytes()));
        let parsed = read_frame(&mut reader).unwrap().unwrap();
        assert_eq!(parsed, body);
    }
}
