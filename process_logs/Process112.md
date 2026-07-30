# Process112 - A3 图册 JTS 九色深度分类带

Date: 2026-07-20

Status: `closed / implemented / verified / independently reviewed`

## Goal

- 修复解译图册中密集 JTS 测点被固定像素色块叠成整块绿色的问题，改为按真实深度绘制 Zone 1–9 分类证据。

## Result

- JTS 分类带按相邻测点深度中点分配单元，连续同 Zone、同分类路径自动合并；不再按每行固定 8 px 绘制。
- `null`、未知土类和真实深度间断保持空白；无序深度停止生成；20 m 分页只裁切同一个权威深度单元，不跨页补色。
- SBT 图与成果图册共用唯一 Zone 1–9 九色板；近似 CPT 保持同一 Zone 色义，并以透明度、橙边和按页条件提示区分。
- 分类柱收窄为主图约 9%；栏目明确区分“JTS SBT 分类证据（Z1–Z9）”和“最终地层（工程确认）”。
- 最终地层薄层标签采用排序避让轨道和引线，不再在密集层位重叠；图例统一使用 Z1–Z9。
- 关闭回归发现并修复分层选层延迟重渲染：父级土层同步使用 React transition，避免首屏响应后再次触发秒级主线程长任务。
- 真实成果测试改为页内双帧性能测量，并按“页面修订即时更新 → 三项成果完成后统一验证 IndexedDB 落盘”检查，去除 Playwright 往返和事务竞争造成的假失败，同时保留 200 ms/150 ms 门槛与最终持久化门禁。

## Verification

- `npm.cmd run verify:slice -- --process 112 --mode closure` - passed。
- Build、测试分层、流程脚本、知识门禁全部通过。
- `domain-fast`：194/194 passed。
- `ui-isolated`：76/76 passed。
- `real-serial`：29/29 passed；营口三份真实工作簿、三种成果生成、刷新恢复和坏文件保护通过。
- 关闭级 Playwright 总计 299/299 passed，63/63 spec 全部通过。
- 营口 A3 图册 6 页机器检查均包含多个 Zone，未出现单一绿色块；console/page errors 为 0。

## Review

- Visual Layout Taste Auditor：PASS，无 P0/P1；确认九色窄柱、空白和真实深度分布可读。
- Geotechnical Domain Reviewer：PASS，无 P0/P1；确认 Zone 映射、中点单元、间断、近似路径和最终地层权威边界正确。
- Copy / IA / Performance Reviewer：初审提出 2 个 P1，整改后复审 P0/P1/P2 均为 0；分类证据与工程确认结果已明确区分，薄层标签无重叠。

## Evidence

- `process_logs/playwright-mcp/process112-jts-classification-bands/yingkou-a3-atlas.pdf`
- `process_logs/playwright-mcp/process112-jts-classification-bands/yingkou-a3-page-1.png`
- `process_logs/playwright-mcp/process112-jts-classification-bands/yingkou-a3-page-2.png`
- `process_logs/playwright-mcp/process112-jts-classification-bands/yingkou-a3-page-3.png`
- `process_logs/playwright-mcp/process112-jts-classification-bands/yingkou-a3-page-4.png`
- `process_logs/playwright-mcp/process112-jts-classification-bands/yingkou-a3-page-5.png`
- `process_logs/playwright-mcp/process112-jts-classification-bands/yingkou-a3-page-6.png`
- `process_logs/playwright-mcp/process112-jts-classification-bands/browser-check.json`
- `process_logs/playwright-mcp/process112-jts-classification-bands/render-check.json`
- `process_logs/playwright-mcp/process112-jts-classification-bands/evidence-manifest.json`
- `process_logs/verification/Process112-closure.json`
- `process_logs/knowledge-reviews/Process112.json`

## Known Problems Covered

- KPB-001、KPB-004、KPB-006、KPB-009、KPB-012、KPB-013。

## Professional Conclusion

- 分类色带只表达冻结成果快照中的逐测点 JTS SBT Zone 证据；右侧最终地层仍来自工程师确认的分层修订，两者没有互相替代。
- 缺失、未知和真实深度间断不会被邻近类别填充；近似 CPT 不会被伪装为完整 CPTU。

## Boundaries

- 不修改 JTS 公式、分类结果、原始测量、参数结果、最终地层或成果快照结构。
- A3 末页仍按实际剩余深度范围铺满页面，属于既有版式；后续可单独选择固定 20 m/页留白或明确标注局部放大。
- 不新增云端、后端服务或正式工程采纳语义。
