import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { useTerminalStore } from "@/stores/terminalStore";
import { useSettingsStore } from "@/stores/settingsStore";

export function TerminalPanel() {
  const open = useTerminalStore((s) => s.open);
  const lines = useTerminalStore((s) => s.lines);
  const runningPid = useTerminalStore((s) => s.runningPid);
  const run = useTerminalStore((s) => s.run);
  const stop = useTerminalStore((s) => s.stop);
  const clear = useTerminalStore((s) => s.clear);
  const setOpen = useTerminalStore((s) => s.setOpen);
  const cwd = useSettingsStore(
    (s) => s.settings.agent.workingDirectory || s.settings.workspace.path,
  );

  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const lineCountRef = useRef(0);
  const [input, setInput] = useState("");

  useEffect(() => {
    if (!open || !hostRef.current) return;
    if (termRef.current) return;

    const term = new Terminal({
      convertEol: true,
      fontSize: 12,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      theme: {
        background: "#0d1117",
        foreground: "#e6edf3",
        cursor: "#58a6ff",
      },
      cursorBlink: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(hostRef.current);
    fit.fit();
    term.writeln("LLM Shell terminal — Enter to run, Stop to kill.");
    termRef.current = term;
    fitRef.current = fit;
    lineCountRef.current = 0;

    const onResize = () => fit.fit();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    const term = termRef.current;
    if (!term || !open) return;
    const next = lines.slice(lineCountRef.current);
    for (const line of next) term.writeln(line);
    lineCountRef.current = lines.length;
  }, [lines, open]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => fitRef.current?.fit());
  }, [open]);

  if (!open) return null;

  return (
    <div className="flex h-full min-h-0 flex-col border-t border-border-default bg-[#0d1117]">
      <div className="flex shrink-0 items-center gap-2 border-b border-border-muted px-2 py-1">
        <span className="ui-section-label">Terminal</span>
        {cwd && (
          <span className="min-w-0 truncate font-mono text-[10px] text-text-muted" title={cwd}>
            {cwd.replace(/\\/g, "/").split("/").slice(-2).join("/")}
          </span>
        )}
        <div className="ml-auto flex gap-1">
          {runningPid != null && (
            <button type="button" className="ui-chrome-btn px-1.5 text-[10px]" onClick={() => void stop()}>
              Stop
            </button>
          )}
          <button type="button" className="ui-chrome-btn px-1.5 text-[10px]" onClick={() => clear()}>
            Clear
          </button>
          <button type="button" className="ui-chrome-btn px-1.5 text-[10px]" onClick={() => setOpen(false)}>
            Hide
          </button>
        </div>
      </div>
      <div ref={hostRef} className="min-h-0 flex-1 overflow-hidden px-1 py-1" />
      <form
        className="flex shrink-0 gap-1 border-t border-border-muted px-2 py-1"
        onSubmit={(e) => {
          e.preventDefault();
          const cmd = input.trim();
          if (!cmd) return;
          setInput("");
          void run(cmd, cwd || undefined);
        }}
      >
        <span className="font-mono text-[11px] text-accent-blue">$</span>
        <input
          className="min-w-0 flex-1 bg-transparent font-mono text-[12px] text-text-primary outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="command…"
          disabled={runningPid != null}
          spellCheck={false}
          autoComplete="off"
        />
        <button
          type="submit"
          className="ui-chrome-btn px-2 text-[11px]"
          disabled={runningPid != null || !input.trim()}
        >
          Run
        </button>
      </form>
    </div>
  );
}
