import { BookOpenText, CheckCircle2, Copy, ExternalLink, MessageSquareText, X } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { VisitorAnalyticsLauncher } from '../features/analytics/VisitorAnalyticsLauncher';
import { SiteComplianceLink } from './SiteComplianceLink';

const PROJECT_FEEDBACK_EMAIL = 'sigsoglab@163.com';
const PROJECT_FEEDBACK_ENDPOINT = `https://formsubmit.co/ajax/${PROJECT_FEEDBACK_EMAIL}`;
const PROJECT_FEEDBACK_MAX_FILE_SIZE = 10 * 1024 * 1024;
const PROJECT_DOCS_ROOT = '/help';

const PAGE_HELP_PATHS: Record<string, string> = {
  '项目集合': '/start/',
  '项目/点位数据': '/professional/import#project',
  '数据导入': '/professional/import#standard-import',
  '数据检查': '/professional/check#current-problem',
  '地层分层': '/professional/stratification#review-layer',
  '参数解译': '/professional/parameters#choose',
  '成果输出': '/professional/output#source',
  '快捷出图 · 数据输入': '/quick/import',
  '快捷出图 · 图册': '/quick/generate-export#read',
};

export function projectHelpLinks(pageLabel: string) {
  return {
    manual: `${PROJECT_DOCS_ROOT}/`,
    page: `${PROJECT_DOCS_ROOT}${PAGE_HELP_PATHS[pageLabel] ?? '/start/'}`,
  };
}

export function ProjectFeedbackLauncher({
  pageLabel,
  placement = 'floating',
  onOpenOnboarding,
  onboardingMobile = false,
}: {
  pageLabel: string;
  placement?: 'floating' | 'sidebar';
  onOpenOnboarding?: () => void;
  onboardingMobile?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'manual'>('idle');
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success' | 'activation' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');
  const [fileError, setFileError] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const helpLinks = projectHelpLinks(pageLabel);
  const mailHref = `mailto:${PROJECT_FEEDBACK_EMAIL}?subject=${encodeURIComponent('SIGS-OGLab 反馈与建议')}&body=${encodeURIComponent(`当前页面：${pageLabel}\n\n请写下问题或建议：\n`)}`;

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeFeedback();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  });

  function closeFeedback() {
    requestRef.current?.abort();
    requestRef.current = null;
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function openFeedback() {
    setCopyState('idle');
    setSubmitState('idle');
    setSubmitMessage('');
    setFileError('');
    setOpen(true);
  }

  function validateFile(file: File | undefined) {
    if (!file) {
      setFileError('');
      return true;
    }
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setFileError('仅支持 PNG 或 JPG 图片。');
      return false;
    }
    if (file.size > PROJECT_FEEDBACK_MAX_FILE_SIZE) {
      setFileError('截图不能超过 10 MB。');
      return false;
    }
    setFileError('');
    return true;
  }

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitState === 'submitting') return;

    const form = event.currentTarget;
    const fileInput = form.elements.namedItem('attachment') as HTMLInputElement | null;
    if (!validateFile(fileInput?.files?.[0])) {
      fileInput?.focus();
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;
    setSubmitState('submitting');
    setSubmitMessage('');

    const formData = new FormData(form);
    formData.set('_subject', 'SIGS-OGLab 新反馈');
    formData.set('_template', 'table');
    formData.set('_captcha', 'false');
    formData.set('来源', 'SIGS-OGLab');
    formData.set('当前页面', pageLabel);

    try {
      const response = await fetch(PROJECT_FEEDBACK_ENDPOINT, {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      const result = await response.json().catch(() => null) as { success?: boolean | string; message?: string } | null;
      const resultMessage = result?.message ?? '';
      if (/activat|confirm|verif/i.test(resultMessage)) {
        setSubmitState('activation');
        setSubmitMessage('请到项目邮箱完成首次确认，然后再提交一次。');
        return;
      }
      const success = response.ok && result?.success !== false && result?.success !== 'false';
      if (!success) throw new Error(resultMessage || '暂时无法提交，请稍后重试。');
      setSubmitState('success');
      setSubmitMessage('已收到，谢谢你的反馈。');
      form.reset();
    } catch (error) {
      if (controller.signal.aborted) return;
      setSubmitState('error');
      setSubmitMessage(error instanceof Error && error.message ? error.message : '暂时无法提交，请稍后重试。');
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  }

  async function copyEmail() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(PROJECT_FEEDBACK_EMAIL);
      setCopyState('copied');
    } catch {
      const fallbackInput = document.createElement('textarea');
      fallbackInput.value = PROJECT_FEEDBACK_EMAIL;
      fallbackInput.setAttribute('readonly', '');
      fallbackInput.style.position = 'fixed';
      fallbackInput.style.opacity = '0';
      document.body.appendChild(fallbackInput);
      fallbackInput.select();
      const copied = document.execCommand('copy');
      fallbackInput.remove();
      setCopyState(copied ? 'copied' : 'manual');
    }
  }

  return (
    <div className={`project-utility-launchers ${placement}`}>
      <a
        className={placement === 'floating' ? 'project-help-floating' : 'sidebar-help-link'}
        href={helpLinks.manual}
        target="_blank"
        rel="noreferrer"
        data-testid="open-project-manual"
      >
        <BookOpenText className="button-icon" />
        <span>使用帮助</span>
      </a>
      <a
        className={placement === 'floating' ? 'project-help-floating contextual' : 'sidebar-help-link contextual'}
        href={helpLinks.page}
        target="_blank"
        rel="noreferrer"
        data-testid="open-current-page-help"
      >
        <ExternalLink className="button-icon" />
        <span>查看本页说明</span>
      </a>
      {onOpenOnboarding ? (
        <button
          type="button"
          className={`${placement === 'floating' ? 'project-help-floating contextual' : 'sidebar-help-link contextual'} onboarding-replay${onboardingMobile ? ' onboarding-mobile' : ''}`}
          onClick={onOpenOnboarding}
          data-testid="open-project-onboarding"
        >
          <BookOpenText className="button-icon" />
          <span>新手指引</span>
        </button>
      ) : null}
      <button
        ref={triggerRef}
        type="button"
        className={placement === 'floating' ? 'project-feedback-floating' : 'sidebar-feedback-button'}
        onClick={openFeedback}
        data-testid="open-project-feedback"
      >
        <MessageSquareText className="button-icon" />
        <span>反馈与建议</span>
      </button>
      <VisitorAnalyticsLauncher placement={placement} />
      <SiteComplianceLink placement={placement} />
      {open ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeFeedback();
        }}>
          <section className="confirmation-dialog feedback-dialog" role="dialog" aria-modal="true" aria-labelledby="project-feedback-title" data-testid="project-feedback-dialog">
            <div className="confirmation-dialog-heading">
              <div>
                <span>联系 SIGS-OGLab</span>
                <h2 id="project-feedback-title">反馈与建议</h2>
              </div>
              <button type="button" className="icon-button" aria-label="关闭反馈窗口" onClick={closeFeedback} autoFocus><X /></button>
            </div>
            {submitState === 'success' ? (
              <div className="feedback-result feedback-result-success" role="status" data-testid="feedback-submit-success">
                <CheckCircle2 />
                <strong>{submitMessage}</strong>
                <span>可以关闭窗口，继续当前工作。</span>
                <button type="button" className="toolbar-button primary" onClick={closeFeedback}>完成</button>
              </div>
            ) : (
              <>
                <p>有问题或建议，欢迎告诉我们。</p>
                <form className="feedback-form" onSubmit={(event) => void submitFeedback(event)} data-testid="project-feedback-form">
                  <input type="text" name="_honey" className="feedback-honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                  <fieldset className="feedback-type-field">
                    <legend>类型</legend>
                    <label><input type="radio" name="类型" value="使用问题" defaultChecked />使用问题</label>
                    <label><input type="radio" name="类型" value="功能建议" />功能建议</label>
                    <label><input type="radio" name="类型" value="其他" />其他</label>
                  </fieldset>
                  <label className="feedback-field">
                    <span>反馈内容 <em>必填</em></span>
                    <textarea name="反馈内容" rows={4} required placeholder="请简单说明遇到的问题或建议" data-testid="feedback-content" />
                  </label>
                  <div className="feedback-form-row">
                    <label className="feedback-field">
                      <span>截图 <small>选填 · PNG/JPG · 10 MB 内</small></span>
                      <input
                        type="file"
                        name="attachment"
                        accept="image/png,image/jpeg"
                        aria-describedby={fileError ? 'feedback-file-error' : undefined}
                        onChange={(event) => {
                          const input = event.currentTarget;
                          if (!validateFile(input.files?.[0])) input.value = '';
                        }}
                        data-testid="feedback-screenshot"
                      />
                      {fileError ? <small id="feedback-file-error" className="feedback-field-error" role="alert">{fileError}</small> : null}
                    </label>
                    <label className="feedback-field">
                      <span>联系方式 <small>选填</small></span>
                      <input type="text" name="联系方式" placeholder="邮箱或其他联系方式" data-testid="feedback-contact" />
                    </label>
                  </div>
                  {submitState === 'activation' ? (
                    <div className="feedback-submit-activation" role="status" data-testid="feedback-submit-activation">
                      <strong>还差一步</strong>
                      <span>{submitMessage}</span>
                      <a className="feedback-email-address" href={mailHref}>{PROJECT_FEEDBACK_EMAIL}</a>
                    </div>
                  ) : null}
                  {submitState === 'error' ? (
                    <div className="feedback-submit-error" role="alert" data-testid="feedback-submit-error">
                      <strong>提交失败</strong>
                      <span>{submitMessage}</span>
                      <span>已填写内容仍在，可直接重试或发送邮件。</span>
                    </div>
                  ) : null}
                  <div className="feedback-form-actions">
                    <span>不会附带项目、点位或测量数据。</span>
                    <button type="submit" className="toolbar-button primary" disabled={submitState === 'submitting'} data-testid="submit-project-feedback">
                      {submitState === 'submitting'
                        ? '正在提交…'
                        : submitState === 'activation'
                          ? '已确认，重新提交'
                          : submitState === 'error'
                            ? '重新提交'
                            : '提交反馈'}
                    </button>
                  </div>
                </form>
                <details className="feedback-email-fallback">
                  <summary>也可以发送邮件</summary>
                  <div>
                    <a className="feedback-email-address" href={mailHref}>{PROJECT_FEEDBACK_EMAIL}</a>
                    <div className="feedback-email-actions">
                      <a className="toolbar-button feedback-channel-action" href={mailHref} data-testid="send-feedback-email">发邮件</a>
                      <button type="button" className="toolbar-button feedback-copy-button" onClick={() => void copyEmail()} data-testid="copy-feedback-email"><Copy />复制</button>
                    </div>
                  </div>
                </details>
              </>
            )}
            <div className="feedback-copy-status" aria-live="polite" data-testid="feedback-copy-status">
              {copyState === 'copied' ? <><CheckCircle2 />邮箱已复制</> : null}
              {copyState === 'manual' ? <>无法自动复制，请手动复制上方邮箱。</> : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
