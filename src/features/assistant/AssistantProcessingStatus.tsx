import { LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

type AssistantProcessingStatusProps = {
  mode: 'import' | 'report';
  phase?: 'reading' | 'building';
  testId?: string;
  action?: ReactNode;
};

export function AssistantProcessingStatus({ mode, phase = 'reading', testId, action }: AssistantProcessingStatusProps) {
  const startedAtRef = useRef(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    startedAtRef.current = Date.now();
    setElapsedSeconds(0);
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000)));
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [mode]);

  const label = mode === 'report'
    ? 'AI 正在分析图册'
    : phase === 'building'
      ? '正在生成导入草稿'
      : 'AI 正在分析文件';

  return (
    <div className="assistant-running assistant-processing-status" data-testid={testId} aria-live="polite">
      <LoaderCircle />
      <div>
        <strong>{label}</strong>
        <span className="assistant-processing-time">
          <em>已等待 {elapsedSeconds} 秒</em>
          <em>{mode === 'import' ? '单次请求最长约 1 分钟' : '最长约 2 分钟'}</em>
        </span>
      </div>
      {action}
    </div>
  );
}
