"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@mind-studio/ui";

/*
 * Markdown for pod content (Kai-Antworten, Briefings). GFM, no raw HTML
 * (pod data is multi-author — guests included — so HTML stays escaped).
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cn(
        "space-y-3 text-sm leading-relaxed",
        "[&_h1]:font-display [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:tracking-tight",
        "[&_h2]:font-display [&_h2]:mt-5 [&_h2]:text-base [&_h2]:font-semibold",
        "[&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-semibold",
        "[&_p]:text-foreground/90",
        "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary/80",
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        "[&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5",
        "[&_li>ul]:mt-1 [&_li>ol]:mt-1",
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]",
        "[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:bg-muted/50 [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-primary/50 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
        "[&_hr]:border-border",
        "[&_table]:w-full [&_table]:border-collapse [&_table]:text-left",
        "[&_th]:border-b [&_th]:border-border [&_th]:px-2 [&_th]:py-1.5 [&_th]:font-medium",
        "[&_td]:border-b [&_td]:border-border/50 [&_td]:px-2 [&_td]:py-1.5",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
