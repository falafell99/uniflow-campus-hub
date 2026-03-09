import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

function renderLatex(text: string): string {
  // Replace display math $$...$$ 
  let result = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, tex) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false });
    } catch { return tex; }
  });
  // Replace inline math $...$
  result = result.replace(/\$([^$\n]+?)\$/g, (_, tex) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false });
    } catch { return tex; }
  });
  // Replace `code` blocks
  result = result.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">$1</code>');
  // Bold
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
  return result;
}

export default function LatexRenderer({ content }: { content: string }) {
  const html = useMemo(() => renderLatex(content), [content]);
  return (
    <div
      className="text-sm leading-relaxed whitespace-pre-wrap [&_.katex-display]:my-3 [&_.katex-display]:text-base [&_.katex]:text-[0.95em]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
