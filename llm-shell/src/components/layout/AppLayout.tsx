import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import { useChatStore } from "@/stores/chatStore";
import { useFileStore } from "@/stores/fileStore";
import { useApiHealthStore } from "@/stores/apiHealthStore";
import { useGitStore } from "@/stores/gitStore";
import { useLayoutStore, LAYOUT_MIN, type PanelFocus } from "@/stores/layoutStore";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { EditorPane } from "@/components/workspace/EditorPane";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ChatInput } from "@/components/chat/ChatInput";
import { AgentPanel } from "@/components/agent/AgentPanel";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { SettingsLauncher } from "@/components/settings/SettingsLauncher";
import { FirstRunWizard } from "@/components/onboarding/FirstRunWizard";
import { StatusBar } from "@/components/layout/StatusBar";
import { ApiTrafficLight } from "@/components/layout/ApiTrafficLight";
import { ResizeHandle } from "@/components/common/ResizeHandle";
import { AgentModeToggle } from "@/components/agent/AgentModeToggle";
import { TerminalPanel } from "@/components/terminal/TerminalPanel";
import { IdeModals } from "@/components/ide/IdeModals";
import { useTerminalStore } from "@/stores/terminalStore";
import { useIdeHotkeys } from "@/hooks/useIdeHotkeys";
import { useLspDiagnosticsBridge } from "@/hooks/useLspDiagnosticsBridge";
import { APP_NAME } from "@/utils/constants";
import { launchCloudflareOne } from "@/services/network/launchCloudflare";
import { applyFreeModelsToFirstProfile } from "@/services/llm/freeModels";
import { errorMessage } from "@/utils/errors";

function useTheme() {
  const theme = useSettingsStore((s) => s.settings.appearance.theme);
  useEffect(() => {
    const root = document.documentElement;
    const preferDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = theme === "dark" || (theme === "system" && preferDark);
    root.classList.toggle("theme-light", !dark);
    root.dataset.theme = dark ? "dark" : "light";
  }, [theme]);
}

function useStartupApiHealth() {
  const profiles = useSettingsStore((s) => s.settings.apiProfiles);
  const run = useApiHealthStore((s) => s.run);
  useEffect(() => {
    const t = window.setTimeout(() => {
      void run(profiles);
    }, 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function useStartupProjectSession() {
  useEffect(() => {
    const pid = useSettingsStore.getState().settings.activeProjectId;
    if (pid) useChatStore.getState().ensureSessionForProject(pid);
  }, []);
}

function useGitRefresh() {
  const rootPath = useFileStore((s) => s.rootPath);
  const workspacePath = useSettingsStore((s) => s.settings.workspace.path);
  const agentWd = useSettingsStore((s) => s.settings.agent.workingDirectory);
  const refresh = useGitStore((s) => s.refresh);
  const cwd = agentWd || workspacePath || rootPath || null;

  useEffect(() => {
    void refresh(cwd);
  }, [cwd, refresh]);
}

function ChatColumn({ terminalOpen, terminalHeight, setTerminalHeight }: {
  terminalOpen: boolean;
  terminalHeight: number;
  setTerminalHeight: (h: number) => void;
}) {
  return (
    <>
      <div className="min-h-0 flex-1">
        <ChatWindow />
      </div>
      <AgentPanel />
      <ChatInput />
      {terminalOpen && (
        <>
          <ResizeHandle
            orientation="vertical"
            value={terminalHeight}
            onChange={setTerminalHeight}
            reverse
            title="Высота терминала"
          />
          <div className="shrink-0 overflow-hidden" style={{ height: terminalHeight }}>
            <TerminalPanel />
          </div>
        </>
      )}
    </>
  );
}

const FOCUS_LABEL: Record<PanelFocus, string> = {
  split: "Layout: Split",
  chat: "Layout: Chat",
  editor: "Layout: Editor",
};

export function AppLayout() {
  useTheme();
  useStartupApiHealth();
  useStartupProjectSession();
  useGitRefresh();
  useIdeHotkeys();
  useLspDiagnosticsBridge();
  const newSession = useChatStore((s) => s.newSession);
  const fontSize = useSettingsStore((s) => s.settings.appearance.fontSize);
  const healthRunning = useApiHealthStore((s) => s.running);
  const profiles = useSettingsStore((s) => s.settings.apiProfiles);
  const onboardingDone = useSettingsStore((s) => s.settings.onboardingCompleted);
  const healthRun = useApiHealthStore((s) => s.run);
  const addMessage = useChatStore((s) => s.addMessage);
  const [busyFree, setBusyFree] = useState(false);

  const leftWidth = useLayoutStore((s) => s.leftWidth);
  const rightWidth = useLayoutStore((s) => s.rightWidth);
  const terminalHeight = useLayoutStore((s) => s.terminalHeight);
  const panelFocus = useLayoutStore((s) => s.panelFocus);
  const setLeftWidth = useLayoutStore((s) => s.setLeftWidth);
  const setRightWidth = useLayoutStore((s) => s.setRightWidth);
  const setTerminalHeight = useLayoutStore((s) => s.setTerminalHeight);
  const cyclePanelFocus = useLayoutStore((s) => s.cyclePanelFocus);
  const terminalOpen = useTerminalStore((s) => s.open);
  const toggleTerminal = useTerminalStore((s) => s.toggle);

  const onLeftChange = useCallback(
    (next: number) => {
      const max =
        typeof window !== "undefined"
          ? Math.max(LAYOUT_MIN.left, window.innerWidth - rightWidth - LAYOUT_MIN.center - 8)
          : 560;
      setLeftWidth(Math.min(next, max));
    },
    [rightWidth, setLeftWidth],
  );

  const onRightChange = useCallback(
    (next: number) => {
      const max =
        typeof window !== "undefined"
          ? Math.max(LAYOUT_MIN.right, window.innerWidth - leftWidth - LAYOUT_MIN.center - 8)
          : 800;
      setRightWidth(Math.min(next, max));
    },
    [leftWidth, setRightWidth],
  );

  let center: ReactNode;
  let right: ReactNode | null;

  if (panelFocus === "chat") {
    center = (
      <ChatColumn
        terminalOpen={terminalOpen}
        terminalHeight={terminalHeight}
        setTerminalHeight={setTerminalHeight}
      />
    );
    right = null;
  } else if (panelFocus === "editor") {
    center = <EditorPane />;
    right = (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-bg-primary">
        <ChatColumn
          terminalOpen={terminalOpen}
          terminalHeight={terminalHeight}
          setTerminalHeight={setTerminalHeight}
        />
      </div>
    );
  } else {
    center = (
      <ChatColumn
        terminalOpen={terminalOpen}
        terminalHeight={terminalHeight}
        setTerminalHeight={setTerminalHeight}
      />
    );
    right = <EditorPane />;
  }

  return (
    <div className="flex h-full flex-col" style={{ fontSize }}>
      <header className="ui-app-header flex h-8 shrink-0 items-center gap-0.5 border-b border-border-default bg-bg-secondary px-2">
        <span
          className="mr-1 select-none px-1.5 text-[12px] font-semibold tracking-tight text-text-primary text-pretty"
          translate="no"
        >
          {APP_NAME}
        </span>
        <span className="mx-0.5 h-3 w-px bg-border-default" aria-hidden="true" />
        <button
          type="button"
          className="ui-chrome-btn"
          onClick={() => newSession(useSettingsStore.getState().settings.activeProjectId)}
        >
          New Chat
        </button>
        <SettingsLauncher />
        <AgentModeToggle />
        <button
          type="button"
          className="ui-chrome-btn"
          title="Цикл: Split → Chat → Editor"
          onClick={() => cyclePanelFocus()}
        >
          {FOCUS_LABEL[panelFocus]}
        </button>
        <button type="button" className="ui-chrome-btn" onClick={() => toggleTerminal()}>
          {terminalOpen ? "Hide Term" : "Terminal"}
        </button>
        <button
          type="button"
          className="ui-chrome-btn"
          disabled={healthRunning}
          title="Повторить проверку API (без развёрнутой ленты)"
          onClick={() => {
            void healthRun(profiles);
          }}
        >
          {healthRunning ? "…" : "↻ API"}
        </button>
        <button
          type="button"
          className="ui-chrome-btn px-1.5"
          title="Запустить Cloudflare One / WARP (VPN). Если не установлен — откроется страница загрузки."
          aria-label="Cloudflare One"
          onClick={() => {
            void (async () => {
              const r = await launchCloudflareOne();
              if (!r.ok) {
                addMessage({
                  role: "assistant",
                  content: `Cloudflare: ${r.detail}`,
                });
              } else if (r.detail.startsWith("opened_download")) {
                addMessage({
                  role: "assistant",
                  content:
                    "Cloudflare One не найден на диске — открыта страница загрузки (one.one.one.one). После установки нажмите кнопку снова.",
                });
              }
            })();
          }}
        >
          ☁
        </button>
        <button
          type="button"
          className="ui-chrome-btn"
          disabled={busyFree}
          title="Опросить /models у ваших профилей (с учётом прокси и ключей) и записать доступные модели в настройки"
          onClick={() => {
            void (async () => {
              setBusyFree(true);
              try {
                const r = await applyFreeModelsToFirstProfile();
                addMessage({
                  role: "assistant",
                  content: r.message,
                });
                void healthRun(useSettingsStore.getState().settings.apiProfiles);
              } catch (err) {
                addMessage({
                  role: "assistant",
                  content: `Sync models: ${errorMessage(err)}`,
                });
              } finally {
                setBusyFree(false);
              }
            })();
          }}
        >
          {busyFree ? "…" : "Sync models"}
        </button>
        <div className="ml-auto flex items-center">
          <ApiTrafficLight />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div
          className="flex h-full min-h-0 shrink-0 flex-col overflow-hidden"
          style={{ width: leftWidth }}
        >
          <LeftSidebar />
        </div>

        <ResizeHandle
          orientation="horizontal"
          value={leftWidth}
          onChange={onLeftChange}
          title="Ширина левой панели"
        />

        <main className="flex min-w-0 flex-1 flex-col bg-bg-primary" style={{ minWidth: LAYOUT_MIN.center }}>
          {center}
        </main>

        {right != null && (
          <>
            <ResizeHandle
              orientation="horizontal"
              value={rightWidth}
              onChange={onRightChange}
              reverse
              title="Ширина правой панели"
            />
            <div
              className="flex h-full min-h-0 shrink-0 flex-col overflow-hidden"
              style={{ width: rightWidth }}
            >
              {right}
            </div>
          </>
        )}
      </div>

      <StatusBar />
      {!onboardingDone && <FirstRunWizard />}
      <SettingsDialog />
      <IdeModals />
    </div>
  );
}
