# Web Prototype AGENTS

## 1. Product And Positioning

Workspace: `D:\CPT-UIQA-WebPrototype`

Desktop reference repo: `D:\CPT-UIQA`

Product: `SIGS-OGLab` / `海上风电岩土勘察解译`

Default stack: `Vite + React + TypeScript`.

The goal is a complete, functional browser interpretation tool for offshore wind geotechnical work. It is not a marketing prototype, a desktop comparison, or an excuse to stop at the smallest MVP.

Think from the complete product shape first, then implement and verify it in slices. Major objects must be considered through their natural lifecycle: create, list, open, switch, update, rename, delete, empty state, error state, recovery, invalidation, and downstream handoff.

Product structure:

```text
项目集合 -> 选择/新建项目 -> 当前项目固定工作流

数据准备区: 项目/点位数据 -> 数据导入
数据检查区: 数据检查
地层分层区: 地层分层
参数解译区: 参数解译
成果输出区: 成果输出
```

Detailed product state and roadmap live in `plan-total.md`.

## 2. Always Active Work Protocol

Before work beyond reading the always-active files, tell the user the rough approach, list todos, and wait for confirmation.

```text
[待办1] ...
[待办2] ...
```

During work, report meaningful completed milestones as `[完成N] ...`.

One confirmation covers the described slice, including its planned inspection, edits, tests, screenshots, and read-only review. Do not ask for confirmation again for every todo unless the goal, product behavior, data source, boundary, or acceptance criteria changes.

For Flow, page, feature, data import, UI workflow, or Playwright work, confirm these four layers before implementation:

- `功能定义`: real user actions and required modules.
- `页面设计`: ownership of left navigation, center canvas, right functional dock, dialogs, and feedback.
- `数据与接口`: generated in-app data, generated upload files, user files, mock/backend APIs, or database data.
- `验收方式`: human operations, failure conditions, screenshots, logs, and machine-readable evidence.

Use the confirmation card and coverage tables in `docs/process/feature-slice-template.md`. The default order is:

```text
用户动作 -> 功能模块 -> 页面承接 -> 数据来源 -> 验收证据 -> 实现
```

Before substantial implementation, pass the Feature Coverage Gate:

```text
用户动作 -> 对象生命周期 -> 可能事件 -> 状态变化 -> 页面承接 -> 功能补齐 -> 验收用例
```

The gate must cover normal, error, cancel, back, retry, stale, disabled, warning-only, recovery, and cross-page handoff states. Playwright is the final proof, not the product definition.

### Known Problem Gate

After the user confirms a slice and `plan.md` is current, but before substantial implementation, run:

```text
npm.cmd run knowledge:check -- --context plan.md --report process_logs/knowledge-reviews/ProcessNNN.json
```

Read every match and add its relevant `required_checks` to the slice acceptance. The report is bound to the exact plan and knowledge-library hashes; rerun it whenever either changes.

Before closing the slice, record each important match as `covered` with concrete verification evidence or `not-applicable` with a specific reason, then run:

```text
npm.cmd run knowledge:gate -- --context plan.md --report process_logs/knowledge-reviews/ProcessNNN.json
```

Do not close while the gate fails. When a reusable new failure pattern is confirmed, update `docs/knowledge/problem-library.json`; when a slice closes, add its lightweight relationship entry to `docs/knowledge/update-library.json`. Keep detailed history in `process_logs/` rather than copying it into the libraries. See `docs/knowledge/README.md`.

## 3. Context Ownership

Always active:

- `AGENTS.md`: stable rules and boundaries.
- `plan.md`: the only current active slice.
- `memory.md`: confirmed recurring mistakes and durable user preferences.

Read when needed:

- `plan-total.md`: five-zone product framework, maturity, dependencies, and roadmap.
- `docs/process/feature-slice-template.md`: confirmation, coverage, event, and acceptance templates.
- `docs/process/evidence-policy.md`: test-artifact and milestone-evidence rules.
- `agents/README.md`: read-only UI review-agent playbook.
- `docs/knowledge/README.md`: problem/update library lifecycle and known-problem gate.
- `Process.md`: lightweight current/recent closure index.
- `process_logs/`: detailed closure notes and curated evidence.

`plan.md` must never become history. Archive a closed slice in `process_logs/ProcessNNN.md`, update `Process.md`, then rewrite `plan.md` for the next active slice or explicitly mark that no slice is active.

## 4. Product Boundaries And Language

- Do not modify `D:\CPT-UIQA` unless the user explicitly asks.
- Treat `docs/`, `sample_data/`, and `public/reference-screenshots/` as references. Do not depend on desktop build outputs, runtime SQLite databases, packaged artifacts, or desktop `app_data/`.
- Do not implement or imply official formulas, production persistence, formal adoption/save behavior, or PDF/DXF/Excel export unless the user explicitly confirms that scope.
- Prototype output is not desktop implementation approval.
- Use `问题`, `无问题`, and `存在问题`; do not use `阻塞` as user-facing terminology.
- Use `地层分层`; `测试解译` is legacy/reference wording only.
- Keep `已确认`, `候选`, `试算`, and `只读样例` visually and semantically distinct.

## 5. UI Contract

Target a Mobbin/Mixpanel-style mature analytics workbench: compact navigation, dense evidence canvas, restrained containers, strong tables/charts, and low-decoration professional styling. Do not copy Mixpanel branding or analytics wording.

- Left navigation shows location and feature grouping.
- Center canvas owns the engineering question, primary evidence, current decision, and one strongest primary action.
- Right side is a default-open, collapsible, page-specific functional dock for selecting, filtering, configuring, locating, reviewing, and generating. It is not a generic status detector or a duplicate center table.
- Surface summary before detail. Repeated objects belong in compact tables, matrices, trees, or lists rather than card grids.
- Avoid VSCode-like chrome, marketing sections, decorative gradients, oversized cards, nested cards, repeated filler, and competing primary actions.

## 6. Verification And Closure

- For code changes, run `npm.cmd run build` and relevant tests.
- For UI changes, verify human interaction flows and capture relevant `1440x900` and `1920x1080` evidence.
- Check required labels, forbidden terms, console/page errors, overflow, stale-state behavior, recovery paths, and cross-page handoff.
- Curate closure evidence according to `docs/process/evidence-policy.md`; ordinary test runs must not grow permanent evidence directories indefinitely.
- For multi-agent review, start from `agents/README.md`; review agents are read-only unless the user explicitly requests implementation agents.
