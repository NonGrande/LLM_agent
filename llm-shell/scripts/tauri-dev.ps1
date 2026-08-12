# Launch LLM Shell with VS Build Tools environment (link.exe in PATH).
# Uses npm run tauri:dev (dev-guard frees port 5173 + cleans up on exit).
$ErrorActionPreference = "Stop"
$vcvars = "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
if (-not (Test-Path $vcvars)) {
  Write-Error "MSVC Build Tools not found at: $vcvars"
}
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
cmd.exe /c "`"$vcvars`" && npm run tauri:dev"
