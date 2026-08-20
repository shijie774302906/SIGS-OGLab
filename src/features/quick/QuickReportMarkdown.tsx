import { AssistantMarkdown } from '../assistant/AssistantMarkdown';

export function QuickReportMarkdown({ content }: { content: string }) {
  return <AssistantMarkdown content={content} testId="quick-ai-markdown" />;
}
