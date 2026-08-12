# Updater signing keys

- `updater.key` — **private**, never commit. Used as `TAURI_SIGNING_PRIVATE_KEY` / `_PATH` when building release artifacts.
- `updater.key.pub` — public key embedded in `llm-shell/src-tauri/tauri.conf.json` → `plugins.updater.pubkey`.

Generate a new pair:

```powershell
cd llm-shell
npx tauri signer generate -w ../keys/updater.key
```

Then replace `plugins.updater.pubkey` and `plugins.updater.endpoints` (point to your GitHub `latest.json`).
