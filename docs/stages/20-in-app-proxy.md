# Шаг 20. Встроенный HTTP/SOCKS5 proxy для LLM API

**Статус:** выполнен  
**Дата:** 2026-08-07

## Зачем

Региональные блокировки (РФ) часто режут OpenAI / Anthropic / Google / Grok. Вместо жёсткого VPN в приложении — **опциональный proxy** только для LLM HTTP: чат, `/models`, автотест API.

## Что сделано

1. **`NetworkConfig`** (`proxyEnabled`, `proxyUrl`, `forceRustHttp`) в settings + merge для старых persist.
2. **Rust** (`src-tauri/src/commands/http.rs`): `probe_api`, `llm_http`, `llm_chat_stream` через reqwest + SOCKS5/HTTP proxy.
3. **`LLMClient`**: в Tauri трафик идёт через Rust; proxy URL из settings.
4. **UI**: вкладка **Настройки → Прокси**; подсказки в «Хранилище API» и ApiHealthPanel.
5. Автотест / «Проверить доступ» / чат передают `settings.network`.

## Как пользоваться

1. Запустить Hiddify / Clash / v2rayN (Mixed или SOCKS порт).
2. Settings → **Прокси** → URL вида `socks5://127.0.0.1:1080` → включить proxy.
3. Кнопка **«Тест API»** в шапке — зелёные = доступны, жёлтые = сеть OK / нужен ключ, красные = сеть/прокси/таймаут → «Повторить».

## Проверки

```powershell
cd C:\Users\UskovAA\Documents\LLM_agent\llm-shell
npm test
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```
