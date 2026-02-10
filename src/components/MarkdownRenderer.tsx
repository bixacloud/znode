import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer = ({ content, className }: MarkdownRendererProps) => {
  return (
    <div className={cn("markdown-content", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold mt-8 mb-4 pb-2 border-b first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-semibold mt-8 mb-4 pb-2 border-b">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-semibold mt-6 mb-3">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-lg font-medium mt-4 mb-2">
              {children}
            </h4>
          ),
          
          // Paragraphs
          p: ({ children }) => (
            <p className="mb-4 leading-7 text-foreground/90">
              {children}
            </p>
          ),
          
          // Lists
          ul: ({ children }) => (
            <ul className="mb-4 ml-6 list-disc space-y-2 marker:text-muted-foreground">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-4 ml-6 list-decimal space-y-2 marker:text-muted-foreground">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-7">
              {children}
            </li>
          ),
          
          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
            >
              {children}
            </a>
          ),
          
          // Code
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code
                  className="relative rounded bg-muted px-[0.4rem] py-[0.2rem] font-mono text-sm font-medium"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className={cn("text-sm", className)} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="mb-4 overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm">
              {children}
            </pre>
          ),
          
          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="mb-4 border-l-4 border-primary/50 pl-4 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          
          // Horizontal Rule
          hr: () => (
            <hr className="my-8 border-border" />
          ),
          
          // Tables
          table: ({ children }) => (
            <div className="mb-4 overflow-x-auto rounded-lg border">
              <table className="w-full border-collapse text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/50">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="border-b transition-colors hover:bg-muted/30">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3">
              {children}
            </td>
          ),
          
          // Strong & Emphasis
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic">
              {children}
            </em>
          ),
          
          // Images
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt || ""}
              className="my-4 rounded-lg border max-w-full h-auto"
              loading="lazy"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
