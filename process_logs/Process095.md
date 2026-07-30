# Process095 - Playwright 测试隔离与分层

Date: 2026-07-15

Status: `closed / implemented / verified`

## Goal

将分散的 Playwright 启动清理集中到一个可审计 fixture，并让全部测试唯一归入 `domain-fast`、`ui-isolated`、`real-serial`。自动化只负责隔离、选择和一致性，不改变产品数据库名、持久化语义或工程判断。

## Implemented

- 建立 `tests/e2e/test-tiers.json`，61 个 spec 恰好归属一层：领域 29、普通 UI 24、真实/持久化/性能 8。
- 建立 `scripts/test-tier-runner.mjs` 与 5 个约束测试，检查遗漏、重复、失效文件、错误层级、未使用统一 fixture、直接清存储和 real 层并行配置。
- 建立 `isolatedTest.ts`：使用 Playwright 原生 per-test BrowserContext，自动清除 V3 IndexedDB、LocalStorage 和 SessionStorage。
- 迁移 UI/real 测试使用统一 fixture；移除 spec 中分散的启动 reset。迁移、恢复等场景需要中途清理时使用共享显式 helper。
- 建立三个独立配置和 npm 命令；`domain-fast` 不启动 Vite，`real-serial` 固定 `workers: 1`、`fullyParallel: false`。
- 修正两条故障注入测试的装配顺序：`addInitScript` 后显式 reload，使脚本生效，不恢复重复数据库清理。
- 更新流程工具文档，说明层级职责、命令和安全边界。

## Verification

- Tier runner constraints: `5/5` passed.
- Tier audit: 61 specs, exactly once; `domain-fast=29`, `ui-isolated=24`, `real-serial=8`.
- `domain-fast`: `153/153` passed in 2.2s without Vite.
- `ui-isolated`: `69/69` passed in 1.3m with 12 isolated workers.
- `real-serial`: initial full run `27/29`; both real Yingkou flows passed, and the two fixture-setup failures were corrected. Targeted `workspace-v2-runtime.spec.ts` then passed `9/9`, giving equivalent `29/29` current coverage without rerunning the unchanged 10.3m Yingkou flow.
- Unique total remains `251` tests with no omission or duplication.
- Build passed; process tooling `13/13` passed; knowledge gate passed.

## Known-Problem Dispositions

- Covered: KPB-002, KPB-004, KPB-006, KPB-012, KPB-016.
- Not applicable because no product UI/handoff changed: KPB-011, KPB-013.

## Evidence

- `process_logs/playwright-mcp/process095-test-tiers/test-matrix.json`
- `process_logs/playwright-mcp/process095-test-tiers/doctor-active.json`
- `process_logs/playwright-mcp/process095-test-tiers/evidence-manifest.json`
- `process_logs/knowledge-reviews/Process095.json`

## Closure Checklist

- [x] Scope and non-goals remained unchanged.
- [x] All existing specs are assigned exactly once.
- [x] Startup isolation is centralized and scenario-specific storage semantics are preserved.
- [x] Three test layers run independently and preserve 251 unique tests.
- [x] Build, target tests, knowledge gate and doctor checks pass.
- [x] Final evidence is bound to current implementation and tests.
- [x] Process095 is archived and Process096 is the next confirmed slice.

## Next

Process096 will implement `verify:slice`: select targeted checks from the active plan, knowledge-library `related_tests`, changed files and the tier manifest; closure mode will retain full/real gates.
