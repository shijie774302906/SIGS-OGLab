import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ALLOWED_MARKDOWN_ELEMENTS = [
  'p', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4',
  'blockquote', 'code', 'pre', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'a', 'hr', 'br',
] as const;

export function AssistantMarkdown({ content, testId = 'assistant-markdown' }: { content: string; testId?: string }) {
  return (
    <div className="assistant-markdown" data-testid={testId}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        allowedElements={[...ALLOWED_MARKDOWN_ELEMENTS]}
        skipHtml
        components={{
          a: ({ children, ...props }) => <a {...props} target="_blank" rel="noreferrer noopener">{children}</a>,
          table: ({ children, ...props }) => <div className="assistant-markdown-table"><table {...props}>{children}</table></div>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
