import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Bot, Check, ChevronLeft, ChevronRight, FileSpreadsheet, FileText, FolderOpen, Trash2, Upload } from 'lucide-react';
import { ProjectFeedbackLauncher } from '../../components/ProjectFeedbackLauncher';
import type { ProjectWorkspaceV2 } from '../workspace/workspaceV2';
import { parseCptuExcelWorkbook } from '../import/excelImport';
import type { ExcelSheetProfileV1 } from '../import/excelImport';
import {
  createQuickPlotPdf,
  createQuickPlotRevision,
  createQuickPlotWorkspace,
  deriveQuickPlotRows,
  parseQuickPlotClipboard,
  quickPlotInputHash,
  quickPlotPdfAuthority,
  quickPlotClassificationEvidence,
  quickPlotFormulaAudit,
  quickPlotReadiness,
  quickPlotRoute,
  quickRowsFromTable,
  renderQuickPlotReport,
  type QuickPlotPage,
  type QuickPlotPdfProgress,
  type QuickPlotWorkspaceV1,
} from './quickPlotDomain';
import { createQuickPlotXlsx } from './quickPlotWorkbook';
import { QuickPlotAssistantPanel } from './QuickPlotAssistantPanel';
import {
  createSyntheticCptuDemoRows,
  SYNTHETIC_CPTU_DEMO_NAME,
  SYNTHETIC_CPTU_DEMO_POINT_NAME,
  SYNTHETIC_CPTU_DEMO_WATER_DEPTH_M,
} from '../demo/syntheticCptuDemo';

export function QuickPlotWorkspace({ project, onUpdateProject, onOpenProjectHub, onCommitProject }: {
  project: ProjectWorkspaceV2;
  onUpdateProject: (updater: (project: ProjectWorkspaceV2) => ProjectWorkspaceV2) => void;
  onOpenProjectHub: () => void;
  onCommitProject: (
    expectedWorkspaceRevision: number,
    commitKey: string,
    updater: (project: ProjectWorkspaceV2) => ProjectWorkspaceV2,
  ) => Promise<{ ok: true } | { ok: false; problem: string }>;
}) {
  const workspace = project.quickPlotWorkspace ?? createQuickPlotWorkspace(project.projectName);
  const [pages, setPages] = useState<QuickPlotPage[]>([]);
  const [selectedPage, setSelectedPage] = useState(0);
  const [pageZoom, setPageZoom] = useState<0 | 100 | 150>(0);
  const [view, setView] = useState<'input' | 'report'>(workspace.activeRevisionId ? 'report' : 'input');
  const [generating, setGenerating] = useState(false);
  const [generateFailed, setGenerateFailed] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);
  const [pdfProgress, setPdfProgress] = useState<QuickPlotPdfProgress | null>(null);
  const [pdfExportFailed, setPdfExportFailed] = useState(false);
  const [problem, setProblem] = useState('');
  const [pasteNote, setPasteNote] = useState('');
  const [successNote, setSuccessNote] = useState('');
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [pendingSheet, setPendingSheet] = useState<{ file: File; candidates: ExcelSheetProfileV1[] } | null>(null);
  const [demoReplacePending, setDemoReplacePending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pasteGridRef = useRef<HTMLDivElement>(null);
  const pdfExportControllerRef = useRef<AbortController | null>(null);
  const readiness = quickPlotReadiness(workspace.rows);
  const activeRevision = workspace.revisions.find((revision) => revision.revisionId === workspace.activeRevisionId) ?? null;
  const pdfAuthority = quickPlotPdfAuthority(workspace);
  const pdfAuthorityRef = useRef(pdfAuthority);
  pdfAuthorityRef.current = pdfAuthority;
  const stale = Boolean(activeRevision && activeRevision.inputHash !== quickPlotInputHash(workspace));
  const visibleRows = useMemo(() => workspace.rows.slice(0, 120), [workspace.rows]);
  const route = quickPlotRoute(workspace.rows, workspace.settings);
  const u2Count = workspace.rows.filter((row) => row.u2Kpa !== null && Number.isFinite(row.u2Kpa)).length;
  const hasU2Data = u2Count >= 2;
  const fullCptu = route !== 'approximate_cpt';
  const classificationEvidence = useMemo(() => quickPlotClassificationEvidence(workspace), [workspace]);
  const formulaEvidence = useMemo(() => { const audit = quickPlotFormulaAudit(workspace.settings, deriveQuickPlotRows(workspace.rows, workspace.settings)); return { formulaIds: audit.formulaIds, formulas: audit.groups.flatMap((group) => group.formulas) }; }, [workspace]);
  const pressureBasisConfirmed = !hasU2Data || Boolean(workspace.settings.u2Usage) || Boolean(workspace.settings.pressureBasisConfirmed);
  const canGenerate = readiness.ready && pressureBasisConfirmed;
  const pdfButtonLabel = exporting === 'pdf'
    ? pdfProgress?.phase === 'packaging'
      ? '正在打包 15/15'
      : pdfProgress?.page ? `正在生成 ${pdfProgress.page}/15` : '正在准备 0/15'
    : pdfExportFailed ? '重试导出 PDF' : '导出高清 PDF';

  useEffect(() => {
    if (view !== 'report' || pages.length || !activeRevision || stale) return;
    const handle = window.setTimeout(() => setPages(renderQuickPlotReport(workspace)), 0);
    return () => window.clearTimeout(handle);
  }, [activeRevision, pages.length, stale, view, workspace]);

  useEffect(() => () => pdfExportControllerRef.current?.abort(), []);

  useEffect(() => {
    if (view !== 'report') pdfExportControllerRef.current?.abort();
  }, [view]);

  useEffect(() => {
    if (stale) pdfExportControllerRef.current?.abort();
  }, [pdfAuthority, stale]);

  function updateQuick(updater: (current: QuickPlotWorkspaceV1) => QuickPlotWorkspaceV1) {
    onUpdateProject((currentProject) => ({
      ...currentProject,
      quickPlotWorkspace: updater(currentProject.quickPlotWorkspace ?? createQuickPlotWorkspace(currentProject.projectName)),
      workspaceRevision: currentProject.workspaceRevision + 1,
      updatedAt: new Date().toISOString(),
    }));
  }

  function acceptRows(rows: QuickPlotWorkspaceV1['rows'], sourceName: string, skipped = 0) {
    reflectAcceptedRows(sourceName, skipped);
    setPdfExportFailed(false);
    updateQuick((current) => ({ ...current, rows, sourceName, settings: { ...current.settings, pressureBasisConfirmed: quickPlotRoute(rows) === 'approximate_cpt', u2Usage: undefined } }));
  }

  function reflectAcceptedRows(sourceName: string, skipped = 0) {
    setProblem('');
    setSuccessNote('');
    setPasteNote(skipped ? `${skipped} 行没有深度或 qc，未放入表格。` : '');
    setPages([]);
    setSelectedPage(0);
    setGenerateFailed(false);
    setView('input');
    if (fileRef.current) fileRef.current.value = '';
    void sourceName;
  }

  function clearInputRows() {
    if (!workspace.rows.length) return;
    setProblem(''); setSuccessNote(''); setPasteNote('数据和已生成图册已清空，可以重新粘贴或导入。'); setPendingSheet(null); setPages([]); setSelectedPage(0); setGenerateFailed(false); setPdfExportFailed(false); setView('input');
    if (fileRef.current) fileRef.current.value = '';
    updateQuick((current) => ({
      ...current,
      sourceName: '',
      rows: [],
      revisions: [],
      activeRevisionId: null,
      settings: { ...current.settings, pressureBasisConfirmed: false, u2Usage: undefined },
    }));
    window.setTimeout(() => pasteGridRef.current?.focus({ preventScroll: true }), 0);
  }

  function applyDemoRows() {
    const rows = createSyntheticCptuDemoRows();
    reflectAcceptedRows(SYNTHETIC_CPTU_DEMO_NAME);
    setPendingSheet(null);
    setDemoReplacePending(false);
    setPasteNote('系统生成演示数据，仅用于体验功能。');
    updateQuick((current) => ({
      ...current,
      sourceName: SYNTHETIC_CPTU_DEMO_NAME,
      rows,
      revisions: [],
      activeRevisionId: null,
      settings: {
        ...current.settings,
        pointName: SYNTHETIC_CPTU_DEMO_POINT_NAME,
        waterDepthM: SYNTHETIC_CPTU_DEMO_WATER_DEPTH_M,
        pressureBasisConfirmed: false,
        u2Usage: undefined,
      },
    }));
  }

  function onPaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const text = event.clipboardData.getData('text/plain');
    if (!text.trim()) return;
    event.preventDefault();
    const parsed = parseQuickPlotClipboard(text);
    if (!parsed.rows.length) { setProblem('没有读到数据。请复制“深度”和“qc”两列后再粘贴。'); return; }
    acceptRows(parsed.rows, '粘贴的数据', parsed.skipped);
  }

  async function onFile(file: File | null) {
    if (!file) return;
    setProblem('');
    try {
      const result = await parseCptuExcelWorkbook(file);
      if (result.kind === 'sheet-selection-required') { setPendingSheet({ file, candidates: result.candidates }); return; }
      applyExcelResult(result, file.name);
    } catch {
      setProblem('这个文件里没找到可出图的数据。请改用上面的表格粘贴，或选择另一个 Excel。');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function chooseSheet(sheetName: string) {
    if (!pendingSheet) return;
    try {
      const result = await parseCptuExcelWorkbook(pendingSheet.file, sheetName);
      if (result.kind !== 'ready') throw new Error('sheet');
      applyExcelResult(result, pendingSheet.file.name);
      setPendingSheet(null);
    } catch {
      setProblem('这个数据表不能出图。请选择另一个数据表，或改用上面的表格粘贴。');
    }
  }

  function applyExcelResult(result: Extract<Awaited<ReturnType<typeof parseCptuExcelWorkbook>>, { kind: 'ready' }>, fileName: string) {
    const rows = quickRowsFromTable(result.headers, result.rows);
    if (!rows.length) { setProblem('这个数据表里没有可出图的数据。请至少确认“深度”和“qc”两列。'); return; }
    acceptRows(rows, fileName);
    updateQuick((current) => ({ ...current, rows, sourceName: fileName, settings: { ...current.settings, pointName: result.metadata.pointName || current.settings.pointName, waterDepthM: result.metadata.waterDepthM, effectiveAreaRatio: result.metadata.coneAreaRatio ?? current.settings.effectiveAreaRatio, pressureBasisConfirmed: false, u2Usage: undefined } }));
  }

  async function generate() {
    if (!canGenerate || generating) return;
    setGenerating(true); setGenerateFailed(false); setPdfExportFailed(false); setProblem('');
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const nextPages = renderQuickPlotReport(workspace);
      const revision = createQuickPlotRevision(workspace);
      updateQuick((current) => ({ ...current, revisions: [...current.revisions, revision], activeRevisionId: revision.revisionId }));
      setPages(nextPages); setSelectedPage(0); setView('report');
      window.scrollTo({ top: 0, behavior: 'auto' });
    } catch {
      setGenerateFailed(true);
      setProblem('浏览器这次没有完成绘图。数据没有丢失，请点击“重试生成图册”。');
    } finally { setGenerating(false); }
  }

  async function exportPdf() {
    if (!pages.length || generating || exporting || !activeRevision || stale) return;
    const authority = pdfAuthority;
    const controller = new AbortController();
    pdfExportControllerRef.current = controller;
    setExporting('pdf'); setPdfProgress({ phase: 'rendering', page: 0, total: 15 }); setPdfExportFailed(false); setProblem(''); setSuccessNote('');
    try {
      const blob = await createQuickPlotPdf(workspace, workspace.settings.projectName, workspace.settings.pointName, {
        signal: controller.signal,
        shouldContinue: () => pdfAuthorityRef.current === authority,
        onProgress: setPdfProgress,
      });
      const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = url; link.download = `${safeName(workspace.settings.pointName)}-快捷图册.pdf`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setPdfExportFailed(false);
      setSuccessNote('高清 PDF 已生成，正在下载。');
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      setPdfExportFailed(code !== 'QUICK_PDF_STALE' && code !== 'QUICK_PDF_ABORTED');
      setProblem(code === 'QUICK_PDF_STALE' || code === 'QUICK_PDF_ABORTED'
        ? '图册已更新，本次导出已停止。请重新导出。'
        : 'PDF 未生成，图册仍保留。请点击“重试导出 PDF”。');
    }
    finally {
      if (pdfExportControllerRef.current === controller) {
        pdfExportControllerRef.current = null;
        setPdfProgress(null);
        setExporting(null);
      }
    }
  }

  async function exportExcel() {
    if (!pages.length || generating || exporting || !activeRevision || stale) return;
    setExporting('excel'); setProblem('');
    try {
      const bytes = await createQuickPlotXlsx(workspace, activeRevision);
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = url; link.download = `${safeName(workspace.settings.pointName)}-快捷解译数据.xlsx`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setSuccessNote('已开始下载 Excel。');
    } catch (error) {
      const staleRevision = error instanceof Error && /变化|重新生成/.test(error.message);
      setProblem(staleRevision ? '图册已经变化，请重新生成后再导出数据表。' : 'Excel 没有下载成功，请再试一次；图册仍保留。');
    } finally { setExporting(null); }
  }

  if (view === 'report' && activeRevision && !stale) {
    return <div className={`quick-shell quick-report-shell${assistantOpen ? ' ai-open' : ''}`} data-testid="quick-report-workspace" data-classification-evidence={JSON.stringify(classificationEvidence)} data-formula-evidence={JSON.stringify(formulaEvidence)}>
      <header className="quick-topbar"><div><button type="button" className="quick-back" onClick={onOpenProjectHub}><FolderOpen size={17} />项目</button><span>快捷出图</span></div><div className="quick-topbar-actions"><strong>{project.projectName}</strong><button type="button" className={`quick-assistant-toggle${assistantOpen ? ' active' : ''}`} onClick={() => setAssistantOpen((current) => !current)} data-testid="quick-ai-toggle"><Bot size={16} />图册解读</button></div></header>
      <main className="quick-report-main">
        <section className="quick-report-header">
          <div><span className="quick-eyebrow"><Check size={15} />图册已生成</span><h1>{workspace.settings.pointName} · CPT/CPTU 工程图册</h1><p>共 15 页 · {route === 'full_cptu' ? `u2 有效 ${u2Count}/${workspace.rows.length} 行` : route === 'partial_cptu' ? `u2 有效 ${u2Count}/${workspace.rows.length} 行，孔压方法仅逐行计算` : workspace.settings.u2Usage === 'raw_only' ? `u2 仅展示 ${u2Count}/${workspace.rows.length} 行` : 'CPT 近似（u2 不足）'}。网页为轻量预览；导出为 A3 · 600 DPI · 15 页。Excel 包含原始数据、分类、解译和方法设置。</p></div>
          <div className="quick-report-actions">
            <button type="button" className="quick-secondary" disabled={Boolean(exporting)} onClick={() => setView('input')}>修改输入</button>
            <div className="quick-zoom-controls" aria-label="页面缩放"><button type="button" className={pageZoom === 0 ? 'active' : ''} onClick={() => setPageZoom(0)}>适合页面</button><button type="button" className={pageZoom === 100 ? 'active' : ''} onClick={() => setPageZoom(100)}>100%</button><button type="button" className={pageZoom === 150 ? 'active' : ''} onClick={() => setPageZoom(150)}>150%</button></div>
            <button type="button" className="quick-secondary" disabled={!pages.length || generating || Boolean(exporting)} onClick={() => void exportExcel()} data-testid="quick-export-excel"><FileSpreadsheet size={17} />{exporting === 'excel' ? '正在准备 Excel…' : '导出 Excel'}</button>
            <button type="button" className="quick-primary" disabled={!pages.length || generating || Boolean(exporting)} onClick={() => void exportPdf()} data-testid="quick-export-pdf"><FileText size={17} />{pdfButtonLabel}</button>
          </div>
        </section>
        {exporting === 'pdf' && pdfProgress ? <p className="sr-only" role="status" data-testid="quick-pdf-progress">{pdfProgress.page ? '正在生成' : '正在准备'} A3 600 DPI 高清 PDF：{pdfProgress.page}/{pdfProgress.total}</p> : null}
        {problem ? <p className="quick-problem" role="alert">{problem}</p> : null}
        {successNote ? <p className="quick-note" role="status">{successNote}</p> : null}
        <section className="quick-report-viewer">
          <div className={`quick-page-stage${pageZoom ? ' is-zoomed' : ''}`} data-testid="quick-page-stage">
            {pages[selectedPage] ? <img src={pages[selectedPage].previewUrl} alt={`第 ${selectedPage + 1} 页：${pages[selectedPage].title}`} data-orientation={pages[selectedPage].orientation} data-reference-page={pages[selectedPage].referencePage} style={pageZoom ? { width: `${pageZoom}%` } : undefined} /> : <div className="quick-page-loading">正在准备图册…</div>}
            <button type="button" aria-label="上一页" disabled={selectedPage === 0} onClick={() => setSelectedPage((page) => Math.max(0, page - 1))}><ChevronLeft /></button>
            <button type="button" aria-label="下一页" disabled={selectedPage >= pages.length - 1} onClick={() => setSelectedPage((page) => Math.min(pages.length - 1, page + 1))}><ChevronRight /></button>
          </div>
          <aside className="quick-page-list" aria-label="图册页面">
            {pages.map((page, index) => <button type="button" key={page.title} className={selectedPage === index ? 'active' : ''} onClick={() => setSelectedPage(index)} data-testid={`quick-page-${index + 1}`} data-reference-page={page.referencePage} data-orientation={page.orientation} data-chart-types={page.chartTypes.join(',')}><img src={page.previewUrl} alt="" /><span><b>{String(index + 1).padStart(2, '0')}</b>{page.title}</span></button>)}
          </aside>
        </section>
      </main>
      <QuickPlotAssistantPanel open={assistantOpen} mode="report" project={project} workspace={workspace} pages={pages} selectedPage={selectedPage} onClose={() => setAssistantOpen(false)} onImport={async () => ({ ok: false, problem: '当前图册页不能导入文件。' })} />
      <ProjectFeedbackLauncher pageLabel="快捷出图 · 图册" />
    </div>;
  }

  return <div className={`quick-shell${assistantOpen ? ' ai-open' : ''}`} data-testid="quick-input-workspace">
    <header className="quick-topbar"><div><button type="button" className="quick-back" onClick={onOpenProjectHub}><FolderOpen size={17} />项目</button><span>快捷出图</span></div><div className="quick-topbar-actions"><strong>{project.projectName}</strong><button type="button" className={`quick-assistant-toggle${assistantOpen ? ' active' : ''}`} onClick={() => setAssistantOpen((current) => !current)} data-testid="quick-ai-toggle"><Bot size={16} />AI 整理数据</button></div></header>
    <main className="quick-input-main">
      <header className="quick-intro"><span className="quick-eyebrow">直接生成图册</span><h1>把数据粘贴进来</h1><p>深度、qc 必填；fs、u2 可空。缺少时，相关页面会标明未计算。</p></header>
      <section className="quick-data-card">
        <div className="quick-card-heading"><div><h2>数据</h2><span>{workspace.rows.length ? `${workspace.rows.length.toLocaleString('zh-CN')} 行 · ${workspace.sourceName}` : '等待粘贴'}</span></div><div className="quick-card-actions"><button type="button" className="quick-secondary" disabled={!workspace.rows.length} onClick={clearInputRows} data-testid="quick-clear-input" title="清空当前数据和已生成图册"><Trash2 size={16} />清空数据</button><button type="button" className="quick-secondary" onClick={() => workspace.rows.length ? setDemoReplacePending(true) : applyDemoRows()} data-testid="quick-use-demo-data">试用演示数据</button><input ref={fileRef} type="file" accept=".xlsx,.xls" hidden onChange={(event) => void onFile(event.target.files?.[0] ?? null)} /><button type="button" className="quick-secondary" onClick={() => fileRef.current?.click()} data-testid="quick-import-excel"><Upload size={16} />从 Excel 导入</button></div></div>
        <div ref={pasteGridRef} className={`quick-paste-grid${workspace.rows.length ? ' has-data' : ''}`} tabIndex={0} onPaste={onPaste} data-testid="quick-paste-grid">
          <table><thead><tr><th>深度 <small>m · 必填</small></th><th>qc <small>MPa · 必填</small></th><th>fs <small>kPa · 可空</small></th><th>u2 <small>kPa · 可空</small></th></tr></thead>
          <tbody>{visibleRows.length ? visibleRows.map((row) => <tr key={row.rowId}><td>{row.depthM}</td><td>{row.qcMpa}</td><td>{row.fsKpa ?? ''}</td><td>{row.u2Kpa ?? ''}</td></tr>) : <tr><td colSpan={4}><div className="quick-paste-empty"><FileSpreadsheet /><strong>点击这里，按 Ctrl + V 粘贴</strong><span>第一列深度，第二列 qc，第三列 fs，第四列 u2</span></div></td></tr>}</tbody></table>
          {workspace.rows.length > visibleRows.length ? <div className="quick-row-limit">已显示前 {visibleRows.length} 行，共 {workspace.rows.length.toLocaleString('zh-CN')} 行</div> : null}
        </div>
        {pasteNote ? <p className="quick-note" role="status">{pasteNote}</p> : null}
        {demoReplacePending ? <div className="inline-confirmation quick-demo-confirmation" data-testid="quick-demo-replace-confirmation"><span>将清空当前输入和已生成图册，改用系统生成演示数据。</span><button type="button" className="quick-secondary" onClick={() => setDemoReplacePending(false)}>取消</button><button type="button" className="quick-primary" onClick={applyDemoRows} data-testid="quick-confirm-demo-data">确认载入</button></div> : null}
      </section>
      {pendingSheet ? <section className="quick-sheet-choice" data-testid="quick-sheet-choice"><div><strong>这个文件里有多个数据表</strong><span>请选择要出图的一个。</span></div><div>{pendingSheet.candidates.map((candidate) => <button type="button" className="quick-secondary" key={candidate.sheetName} onClick={() => void chooseSheet(candidate.sheetName)}>{candidate.sheetName} · {candidate.rowCount} 行</button>)}</div></section> : null}
      <section className="quick-settings-card">
        <div className="quick-card-heading"><div><h2>确认图册信息</h2><span>其他设置已按常用值填写</span></div></div>
        <div className="quick-settings-row">
          <label><span>孔位名称</span><input value={workspace.settings.pointName} onChange={(event) => updateQuick((current) => ({ ...current, settings: { ...current.settings, pointName: event.target.value } }))} data-testid="quick-point-name" /></label>
          {hasU2Data ? <label><span>水深 (m)</span><input type="number" min="0" step="0.1" value={workspace.settings.waterDepthM} onChange={(event) => updateQuick((current) => ({ ...current, settings: { ...current.settings, waterDepthM: Number(event.target.value), pressureBasisConfirmed: false, u2Usage: undefined } }))} data-testid="quick-water-depth" /></label> : null}
          <details><summary>高级设置（一般不用改）</summary><label><span>有效面积比</span><input type="number" min="0" max="1" step="0.01" value={workspace.settings.effectiveAreaRatio} onChange={(event) => updateQuick((current) => ({ ...current, settings: { ...current.settings, effectiveAreaRatio: Number(event.target.value) } }))} /></label></details>
        </div>
        {hasU2Data ? <fieldset className="quick-basis-confirm"><legend>u2 怎么使用？</legend><label><input type="radio" name="quick-u2-usage" checked={workspace.settings.u2Usage === 'total' || (!workspace.settings.u2Usage && workspace.settings.pressureBasisConfirmed)} onChange={() => updateQuick((current) => ({ ...current, settings: { ...current.settings, pressureBasisConfirmed: true, u2Usage: 'total' } }))} data-testid="quick-pressure-basis-confirm" /><span><b>按总孔压计算</b>　确认深度从泥面向下，u2 包含静水压力；缺失行只跳过孔压方法。</span></label><label><input type="radio" name="quick-u2-usage" checked={workspace.settings.u2Usage === 'raw_only'} onChange={() => updateQuick((current) => ({ ...current, settings: { ...current.settings, pressureBasisConfirmed: true, u2Usage: 'raw_only' } }))} data-testid="quick-pressure-raw-only" /><span><b>不确定，只展示原始 u2</b>　仍生成图册，但不计算 Schneider、Bq 等孔压方法。</span></label></fieldset> : <p className="quick-cpt-route">u2 少于 2 个有效点，将按 CPT 近似路线出图；Schneider、Bq 和孔压相关结果不生成。</p>}
      </section>
      {problem ? <p className="quick-problem" role="alert">{problem}</p> : null}
      <section className={`quick-ready-bar ${canGenerate && !stale ? 'ready' : ''}${stale ? ' stale' : ''}`}><div><strong>{stale ? '图册需要更新' : activeRevision ? '当前图册仍可查看' : generateFailed ? '图册没有生成' : canGenerate ? '数据已准备好' : readiness.ready && !pressureBasisConfirmed ? '请选择 u2 的使用方式' : '粘贴数据后即可生成'}</strong><span>{stale ? '孔位或数据已改变；当前预览已失效，请重新生成后再预览或导出。' : activeRevision ? '输入没有变化，不需要重复生成。' : generateFailed ? '数据仍在当前页面，可以直接重试。' : readiness.ready ? `${workspace.settings.pointName}${fullCptu ? ` · 水深 ${workspace.settings.waterDepthM.toFixed(1)} m` : ' · CPT 近似'} · 不会改动你粘贴的数据。` : readiness.message}</span></div><button type="button" className="quick-primary" disabled={!canGenerate || generating} onClick={() => activeRevision && !stale ? setView('report') : void generate()} data-testid="quick-generate-report">{generating ? '正在生成图册…' : activeRevision && !stale ? '返回当前图册' : stale ? '重新生成图册' : generateFailed ? '重试生成图册' : '确认并生成图册'}<ArrowLeft className="quick-forward" size={18} /></button></section>
    </main>
    <QuickPlotAssistantPanel
      open={assistantOpen}
      mode="input"
      project={project}
      workspace={workspace}
      pages={pages}
      selectedPage={selectedPage}
      onClose={() => setAssistantOpen(false)}
      onImport={async (result, sourceName, expectedWorkspaceRevision, commitKey) => {
        const committed = await onCommitProject(expectedWorkspaceRevision, commitKey, (currentProject) => {
          const current = currentProject.quickPlotWorkspace ?? createQuickPlotWorkspace(currentProject.projectName);
          return {
            ...currentProject,
            quickPlotWorkspace: {
              ...current,
              rows: result.rows,
              sourceName,
              revisions: [],
              activeRevisionId: null,
              settings: {
                ...current.settings,
                pressureBasisConfirmed: quickPlotRoute(result.rows) === 'approximate_cpt',
                u2Usage: undefined,
              },
            },
            workspaceRevision: currentProject.workspaceRevision + 1,
            updatedAt: new Date().toISOString(),
          };
        });
        if (!committed.ok) return committed;
        reflectAcceptedRows(sourceName, result.skippedRows);
        setSuccessNote(`AI 已判断并保存 ${result.rows.length.toLocaleString('zh-CN')} 行；${result.ignoredColumns.length} 个额外字段未使用。`);
        return { ok: true };
      }}
    />
    <ProjectFeedbackLauncher pageLabel="快捷出图 · 数据输入" />
  </div>;
}

function safeName(value: string) { return value.trim().replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '-') || 'CPT'; }
