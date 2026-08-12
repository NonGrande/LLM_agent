import { resolveWorkspacePath } from "@/services/mentions/filePaths";
import { useWorkspaceUiStore } from "@/stores/workspaceUiStore";
import { useSettingsStore } from "@/stores/settingsStore";

const PATH_TOKEN =
  /([A-Za-z]:\\[^\s`"'<>|]+)|(\/(?:[\w.-]+\/)*[\w.-]+)|((?:[\w.-]+[/\\])[\w./\\-]+\.\w{1,8})/g;

interface Props {
  text: string;
  className?: string;
}

export function PathLinkedText({ text, className }: Props) {
  const openFile = useWorkspaceUiStore((s) => s.openFile);
  const root = useSettingsStore((s) => s.settings.agent.workingDirectory || s.settings.workspace.path);

  const parts: Array<{ kind: "text" | "path"; value: string }> = [];
  let last = 0;
  for (const m of text.matchAll(PATH_TOKEN)) {
    const idx = m.index ?? 0;
    if (idx > last) parts.push({ kind: "text", value: text.slice(last, idx) });
    const raw = (m[1] || m[2] || m[3] || "").replace(/[.,;:!?)]+$/, "");
    parts.push({ kind: "path", value: raw });
    last = idx + m[0].length;
  }
  if (last < text.length) parts.push({ kind: "text", value: text.slice(last) });

  return (
    <div className={className}>
      {parts.map((part, i) =>
        part.kind === "text" ? (
          <span key={i}>{part.value}</span>
        ) : (
          <button
            key={i}
            type="button"
            className="font-mono text-accent-blue underline decoration-accent-blue/50 hover:decoration-accent-blue"
            title={part.value}
            onClick={() => openFile(resolveWorkspacePath(root, part.value))}
          >
            {part.value}
          </button>
        ),
      )}
    </div>
  );
}
