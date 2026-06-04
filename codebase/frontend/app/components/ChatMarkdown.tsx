"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const components: Components = {
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 leading-relaxed text-foreground">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed text-foreground">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-[var(--muted-soft)]">{children}</em>
  ),
  h1: ({ children }) => (
    <h3 className="mb-2 mt-3 text-base font-semibold first:mt-0">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="mb-2 mt-3 text-base font-semibold first:mt-0">{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className="mb-1.5 mt-2 text-sm font-semibold first:mt-0">{children}</h4>
  ),
  hr: () => <hr className="my-3 border-border" />,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-accent/40 pl-3 text-[var(--muted-soft)]">
      {children}
    </blockquote>
  ),
  code: ({ className, children }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <pre className="my-2 overflow-x-auto rounded-lg bg-[#f3f4f6] px-3 py-2 text-xs">
          <code>{children}</code>
        </pre>
      );
    }
    return (
      <code className="rounded bg-[#f3f4f6] px-1 py-0.5 text-[0.9em]">
        {children}
      </code>
    );
  },
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent underline underline-offset-2 hover:opacity-80"
    >
      {children}
    </a>
  ),
};

export default function ChatMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
