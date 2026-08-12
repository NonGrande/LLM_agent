/**
 * Dev process guard: free Vite ports on start, kill the child process tree on exit.
 * Usage: node scripts/dev-guard.mjs <vite|tauri-dev|preview|clean>
 */
import { spawn, execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

/** Keep in sync with vite.config.ts server.port and tauri.conf.json build.devUrl */
const DEV_PORTS = [5173];

const mode = process.argv[2] ?? "vite";
const extraArgs = process.argv.slice(3);

function log(msg) {
  console.log(`[dev-guard] ${msg}`);
}

function pidsOnPort(port) {
  const pids = new Set();
  if (process.platform === "win32") {
    try {
      const out = execSync("netstat -ano -p tcp", { encoding: "utf8" });
      const re = new RegExp(`TCP\\s+\\S+:${port}\\s+\\S+\\s+LISTENING\\s+(\\d+)`, "gi");
      let m;
      while ((m = re.exec(out))) {
        const pid = Number(m[1]);
        if (pid > 0) pids.add(pid);
      }
    } catch {
      /* ignore */
    }
  } else {
    try {
      const out = execSync(`lsof -tiTCP:${port} -sTCP:LISTEN`, { encoding: "utf8" });
      for (const line of out.split(/\s+/)) {
        const pid = Number(line.trim());
        if (pid > 0) pids.add(pid);
      }
    } catch {
      /* nothing listening */
    }
  }
  return [...pids];
}

function killPid(pid, label) {
  if (!pid || pid === process.pid) return;
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
    } else {
      try {
        process.kill(-pid, "SIGTERM");
      } catch {
        process.kill(pid, "SIGTERM");
      }
    }
    log(`killed ${label} pid=${pid}`);
  } catch {
    /* already gone */
  }
}

function freeDevPorts() {
  for (const port of DEV_PORTS) {
    const pids = pidsOnPort(port);
    if (pids.length === 0) {
      log(`port ${port} free`);
      continue;
    }
    log(`port ${port} busy → clearing PIDs: ${pids.join(", ")}`);
    for (const pid of pids) killPid(pid, `port:${port}`);
  }
}

/** Stale debug window left after a crashed tauri:dev (Windows). */
function killStaleApp() {
  if (process.platform !== "win32") return;
  try {
    const out = execSync(
      `powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name='llm-shell.exe'\\" | Select-Object -ExpandProperty ProcessId"`,
      { encoding: "utf8" },
    );
    for (const line of out.split(/\r?\n/)) {
      const pid = Number(line.trim());
      if (pid > 0) killPid(pid, "llm-shell.exe");
    }
  } catch {
    /* none */
  }
}

function cleanupStart() {
  log(`start (${mode}) — cleanup`);
  freeDevPorts();
  if (mode === "tauri-dev" || mode === "clean") killStaleApp();
}

if (mode === "clean") {
  cleanupStart();
  process.exit(0);
}

const isWin = process.platform === "win32";
const node = process.execPath;
const viteJs = path.join(root, "node_modules", "vite", "bin", "vite.js");
const tauriJs = path.join(root, "node_modules", "@tauri-apps", "cli", "tauri.js");

/** Spawn node scripts directly — avoids Windows EINVAL on .cmd without shell. */
const COMMANDS = {
  vite: { cmd: node, args: [viteJs, ...extraArgs] },
  preview: { cmd: node, args: [viteJs, "preview", ...extraArgs] },
  "tauri-dev": { cmd: node, args: [tauriJs, "dev", ...extraArgs] },
};

const spec = COMMANDS[mode];
if (!spec) {
  console.error(`[dev-guard] unknown mode "${mode}". Use: vite | tauri-dev | preview | clean`);
  process.exit(1);
}

cleanupStart();

let child = null;
let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  log("shutdown — stopping child tree and freeing ports");
  if (child?.pid) {
    killPid(child.pid, mode);
    child = null;
  }
  setTimeout(() => {
    freeDevPorts();
    process.exit(code);
  }, isWin ? 500 : 150);
}

child = spawn(spec.cmd, spec.args, {
  cwd: root,
  stdio: "inherit",
  shell: false,
  env: process.env,
  windowsHide: true,
});

child.on("error", (err) => {
  console.error("[dev-guard] spawn failed:", err);
  shutdown(1);
});

child.on("exit", (code, signal) => {
  if (shuttingDown) return;
  log(`child exited code=${code} signal=${signal ?? "-"}`);
  shuttingDown = true;
  freeDevPorts();
  process.exit(code ?? (signal ? 1 : 0));
});

for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(sig, () => shutdown(0));
}
