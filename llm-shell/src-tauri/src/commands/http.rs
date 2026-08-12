use futures_util::StreamExt;
use serde::Serialize;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Serialize)]
pub struct ProbeResult {
    pub ok: bool,
    pub status: String,
    pub message: String,
    pub http_status: Option<u16>,
    pub latency_ms: u64,
}

#[derive(Debug, Serialize, Clone)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum LlmStreamEvent {
    Chunk { data: String },
    Done,
    Error { message: String },
}

fn normalize_base(url: &str) -> String {
    url.trim().trim_end_matches('/').to_string()
}

fn build_client(proxy_url: Option<&str>, timeout: Duration) -> Result<reqwest::Client, String> {
    let mut builder = reqwest::Client::builder()
        .timeout(timeout)
        .connect_timeout(Duration::from_secs(15))
        .redirect(reqwest::redirect::Policy::limited(5));

    if let Some(raw) = proxy_url.map(str::trim).filter(|s| !s.is_empty()) {
        let proxy = reqwest::Proxy::all(raw).map_err(|e| format!("invalid proxy URL: {e}"))?;
        builder = builder.proxy(proxy);
    }

    builder.build().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn probe_api(
    base_url: String,
    api_key: Option<String>,
    timeout_ms: Option<u64>,
    proxy_url: Option<String>,
) -> Result<ProbeResult, String> {
    let base = normalize_base(&base_url);
    if base.is_empty() {
        return Ok(ProbeResult {
            ok: false,
            status: "unreachable".into(),
            message: "Empty base URL".into(),
            http_status: None,
            latency_ms: 0,
        });
    }

    let timeout = Duration::from_millis(timeout_ms.unwrap_or(8_000).clamp(1_000, 20_000));
    let client = build_client(proxy_url.as_deref(), timeout)?;

    let url = format!("{}/models", base);
    let started = std::time::Instant::now();
    let mut req = client.get(&url);
    if let Some(key) = api_key.as_ref().filter(|k| !k.is_empty()) {
        req = req.bearer_auth(key);
    }

    match req.send().await {
        Ok(res) => {
            let latency_ms = started.elapsed().as_millis() as u64;
            let code = res.status().as_u16();
            if res.status().is_success() {
                Ok(ProbeResult {
                    ok: true,
                    status: "ok".into(),
                    message: format!("OK HTTP {}", code),
                    http_status: Some(code),
                    latency_ms,
                })
            } else if code == 402 {
                Ok(ProbeResult {
                    ok: false,
                    status: "auth".into(),
                    message: format!(
                        "Недостаточно средств / квота (HTTP {})",
                        code
                    ),
                    http_status: Some(code),
                    latency_ms,
                })
            } else if code == 401 || code == 403 {
                Ok(ProbeResult {
                    ok: false,
                    status: "auth".into(),
                    message: format!(
                        "Сеть OK, доступ запрещён (HTTP {}) — проверьте ключ / регион / proxy",
                        code
                    ),
                    http_status: Some(code),
                    latency_ms,
                })
            } else if code == 404 {
                Ok(ProbeResult {
                    ok: false,
                    status: "auth".into(),
                    message: format!("HTTP {} (/models) — хост отвечает", code),
                    http_status: Some(code),
                    latency_ms,
                })
            } else if code >= 500 {
                Ok(ProbeResult {
                    ok: false,
                    status: "unreachable".into(),
                    message: format!("HTTP {}", code),
                    http_status: Some(code),
                    latency_ms,
                })
            } else {
                Ok(ProbeResult {
                    ok: false,
                    status: "auth".into(),
                    message: format!("HTTP {}", code),
                    http_status: Some(code),
                    latency_ms,
                })
            }
        }
        Err(e) => {
            let latency_ms = started.elapsed().as_millis() as u64;
            Ok(ProbeResult {
                ok: false,
                status: "unreachable".into(),
                message: e.to_string(),
                http_status: None,
                latency_ms,
            })
        }
    }
}

#[tauri::command]
pub async fn llm_http(
    method: String,
    url: String,
    api_key: Option<String>,
    body: Option<String>,
    proxy_url: Option<String>,
    timeout_ms: Option<u64>,
) -> Result<String, String> {
    let timeout = Duration::from_millis(timeout_ms.unwrap_or(60_000).clamp(5_000, 300_000));
    let client = build_client(proxy_url.as_deref(), timeout)?;
    let m = method.to_uppercase();
    let mut req = match m.as_str() {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        _ => return Err(format!("unsupported method {method}")),
    };
    req = req.header("Content-Type", "application/json");
    if let Some(key) = api_key.as_ref().filter(|k| !k.is_empty()) {
        req = req.bearer_auth(key);
    }
    if let Some(b) = body {
        req = req.body(b);
    }
    let res = req.send().await.map_err(|e| e.to_string())?;
    let status = res.status();
    let text = res.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(format!(
            "HTTP {}: {}",
            status.as_u16(),
            text.chars().take(500).collect::<String>()
        ));
    }
    Ok(text)
}

#[derive(Debug, Serialize)]
pub struct HttpTextResult {
    pub status: u16,
    pub content_type: String,
    pub body: String,
}

/// Plain GET for @web preview (no forced JSON Content-Type). Respects optional proxy.
#[tauri::command]
pub async fn http_get_text(
    url: String,
    proxy_url: Option<String>,
    timeout_ms: Option<u64>,
    max_chars: Option<usize>,
) -> Result<HttpTextResult, String> {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return Err("Empty URL".into());
    }
    if !(trimmed.starts_with("http://") || trimmed.starts_with("https://")) {
        return Err("URL must start with http:// or https://".into());
    }
    let timeout = Duration::from_millis(timeout_ms.unwrap_or(20_000).clamp(3_000, 60_000));
    let client = build_client(proxy_url.as_deref(), timeout)?;
    let res = client
        .get(trimmed)
        .header(
            "User-Agent",
            "LLM-Shell/0.3 (+https://github.com/local/llm-shell)",
        )
        .header("Accept", "text/html,application/xhtml+xml,text/plain,application/json;q=0.9,*/*;q=0.8")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let status = res.status().as_u16();
    let content_type = res
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();
    let text = res.text().await.map_err(|e| e.to_string())?;
    let cap = max_chars.unwrap_or(80_000).clamp(4_000, 200_000);
    let body: String = text.chars().take(cap).collect();
    Ok(HttpTextResult {
        status,
        content_type,
        body,
    })
}

#[tauri::command]
pub async fn llm_chat_stream(
    app: AppHandle,
    url: String,
    api_key: Option<String>,
    body: String,
    proxy_url: Option<String>,
    channel: String,
    timeout_ms: Option<u64>,
) -> Result<(), String> {
    let timeout = Duration::from_millis(timeout_ms.unwrap_or(180_000).clamp(10_000, 600_000));
    let client = build_client(proxy_url.as_deref(), timeout)?;

    let mut req = client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("Accept", "text/event-stream")
        .body(body);
    if let Some(key) = api_key.as_ref().filter(|k| !k.is_empty()) {
        req = req.bearer_auth(key);
    }

    let res = match req.send().await {
        Ok(r) => r,
        Err(e) => {
            let _ = app.emit(
                &channel,
                LlmStreamEvent::Error {
                    message: e.to_string(),
                },
            );
            return Err(e.to_string());
        }
    };

    if !res.status().is_success() {
        let code = res.status().as_u16();
        let text = res.text().await.unwrap_or_default();
        let msg = format!(
            "HTTP {}: {}",
            code,
            text.chars().take(500).collect::<String>()
        );
        let _ = app.emit(
            &channel,
            LlmStreamEvent::Error {
                message: msg.clone(),
            },
        );
        return Err(msg);
    }

    let mut stream = res.bytes_stream();
    let mut buffer = String::new();

    while let Some(item) = stream.next().await {
        match item {
            Ok(bytes) => {
                buffer.push_str(&String::from_utf8_lossy(&bytes));
                while let Some(pos) = buffer.find('\n') {
                    let mut line = buffer[..pos].to_string();
                    buffer = buffer[pos + 1..].to_string();
                    if line.ends_with('\r') {
                        line.pop();
                    }
                    // Skip blank SSE keepalives — they would otherwise reset idle timers
                    if line.trim().is_empty() {
                        continue;
                    }
                    let _ = app.emit(&channel, LlmStreamEvent::Chunk { data: line });
                }
            }
            Err(e) => {
                let _ = app.emit(
                    &channel,
                    LlmStreamEvent::Error {
                        message: e.to_string(),
                    },
                );
                return Err(e.to_string());
            }
        }
    }
    if !buffer.trim().is_empty() {
        let _ = app.emit(
            &channel,
            LlmStreamEvent::Chunk {
                data: buffer.trim_end_matches('\r').to_string(),
            },
        );
    }
    let _ = app.emit(&channel, LlmStreamEvent::Done);
    Ok(())
}
