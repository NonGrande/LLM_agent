import { useEffect, useId, useState } from "react";

interface Props {
  code: string;
  language?: string;
}

/**
 * Collapsed-by-default code panel (chat readability).
 * Expand inline or open a focused overlay for long snippets.
 */
export function CodeBlock({ code, language }: Props) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const titleId = useId();
  const lines = code.split("\n").length;
  const preview = code.split("\n")[0]?.slice(0, 72) ?? "";
  const lang = language || "code";

  useEffect(() => {
    if (!open && !modal) {
      setHtml(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { codeToHtml } = await import("shiki");
        const out = await codeToHtml(code, {
          lang: language || "text",
          theme: "github-dark",
        });
        if (!cancelled) setHtml(out);
      } catch {
        if (!cancelled) setHtml(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, language, open, modal]);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const body = html ? (
    <div
      className="max-h-[min(50vh,420px)] overflow-auto overscroll-contain text-[12px] [&_pre]:m-0 [&_pre]:bg-transparent [&_pre]:p-3"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  ) : (
    <pre className="max-h-[min(50vh,420px)] overflow-auto overscroll-contain bg-bg-primary p-3 font-mono text-[12px]">
      {code}
    </pre>
  );

  return (
    <>
      <div className="my-2 overflow-hidden rounded border border-border-default bg-bg-secondary">
        <div className="flex min-w-0 items-center gap-1 border-b border-border-muted/60 bg-bg-tertiary/80 px-1.5 py-0.5">
          <button
            type="button"
            aria-expanded={open}
            className="flex min-w-0 flex-1 items-center gap-1.5 px-1 py-1 text-left text-[11px] text-text-secondary hover:text-text-primary"
            onClick={() => setOpen((v) => !v)}
            title={open ? "Свернуть" : "Развернуть код"}
          >
            <span className="shrink-0 text-text-muted" aria-hidden="true">
              {open ? "▾" : "▸"}
            </span>
            <span className="shrink-0 font-mono text-accent-blue">{lang}</span>
            <span className="shrink-0 tabular-nums text-text-muted">{lines} lines</span>
            {!open && (
              <span className="min-w-0 truncate font-mono text-[10px] text-text-muted">
                {preview}
                {preview.length >= 72 || lines > 1 ? "…" : ""}
              </span>
            )}
          </button>
          <button
            type="button"
            className="ui-chrome-btn shrink-0 px-1.5 text-[10px]"
            onClick={() => void copy()}
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            className="ui-chrome-btn shrink-0 px-1.5 text-[10px]"
            onClick={() => setModal(true)}
            title="Открыть в окне"
          >
            □
          </button>
        </div>
        {open && body}
      </div>

      {modal && (
        <div
          className="ui-modal-scrim fixed inset-0 z-[60] flex items-center justify-center bg-black/65 p-4"
          role="presentation"
          onClick={() => setModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="ui-modal flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-border-default px-3 py-2">
              <span id={titleId} className="font-mono text-[12px] text-accent-blue">
                {lang}
              </span>
              <span className="text-[11px] text-text-muted">{lines} lines</span>
              <button
                type="button"
                className="ui-chrome-btn ml-auto px-2 text-[11px]"
                onClick={() => void copy()}
              >
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                className="ui-icon-close opacity-70 hover:opacity-100"
                aria-label="Закрыть"
                onClick={() => setModal(false)}
              >
                ×
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto overscroll-contain">{body}</div>
          </div>
        </div>
      )}
    </>
  );
}
