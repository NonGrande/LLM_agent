import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "@/components/common/CodeBlock";

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-chat text-[13px] leading-relaxed text-text-primary">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children: codeChildren, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const text = String(codeChildren).replace(/\n$/, "");
            // Treat multi-line or fenced blocks as collapsible CodeBlock
            const inline = !className && !text.includes("\n") && text.length < 80;
            if (inline) {
              return (
                <code className="rounded bg-bg-tertiary px-1 py-0.5 font-mono text-[12px]" {...props}>
                  {codeChildren}
                </code>
              );
            }
            return <CodeBlock language={match?.[1]} code={text} />;
          },
          a({ href, children: aChildren }) {
            return (
              <a href={href} className="text-accent-blue underline" target="_blank" rel="noreferrer">
                {aChildren}
              </a>
            );
          },
          ul({ children: ulChildren }) {
            return <ul className="my-2 list-disc pl-5">{ulChildren}</ul>;
          },
          ol({ children: olChildren }) {
            return <ol className="my-2 list-decimal pl-5">{olChildren}</ol>;
          },
          p({ children: pChildren }) {
            return <p className="mb-2 last:mb-0">{pChildren}</p>;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
