# Feature Slice Template

Use this document for substantial Flow, page, feature, import, or acceptance work. Copy only the relevant sections into `plan.md`; do not create a second active plan.

## 1. Confirmation Card

```text
本轮目标：
用户真实动作：
需要做的功能模块：
页面承接方式：
输入数据方式：
验收成果：
不做什么：
关键风险：
是否开始实现：
```

One user confirmation covers all listed inspection, implementation, testing, screenshots, and read-only review until scope changes.

## 2. Known Problem Check

After `plan.md` is confirmed, generate the slice report before implementation:

```text
npm.cmd run knowledge:check -- --context plan.md --report process_logs/knowledge-reviews/ProcessNNN.json
```

Copy relevant `required_checks` from every match into the acceptance contract. Before closure, record `covered` evidence or a specific `not-applicable` reason for every important match, then run `knowledge:gate`. A stale or pending report cannot close the slice.

## 3. Feature Coverage Gate

| User Action | Object Created/Read/Updated/Consumed | Events And States | Page Surface | Missing Function | Acceptance Case |
| --- | --- | --- | --- | --- | --- |
| Example | Example object | normal / problem / cancel / retry / stale | center / dock / dialog | control or state | human flow |

Required questions:

1. What actions will the user take?
2. Which object does each action create, read, update, or consume?
3. How do normal, error, cancel, back, retry, and stale events behave?
4. Which states disable continuation?
5. Which states permit continuation with a notice?
6. How does the user return to the exact correction location?
7. Which controls, interfaces, states, templates, dialogs, dock tools, and data objects are missing?
8. How will Playwright prove the behavior through human operations?

## 4. Event Matrix

| ID | Event | Detection | User-Facing State | Available Actions | Disabled Actions | Recovery Path | Acceptance Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| XXX-E01 | | | | | | | |

## 5. Page Ownership

| Surface | Owns | Must Not Duplicate |
| --- | --- | --- |
| Left navigation | Feature zone and current page | Engineering detail or page tools |
| Center decision area | Current object, state, impact, one primary action | Full configuration form |
| Center evidence | Table, chart, preview, traceable detail | Dock-only controls |
| Right functional dock | Select, filter, configure, locate, review, generate | Center evidence or second navigation |
| Dialog/popover | Short decision or compact option set | Multi-step workflow |
| Feedback | Lightweight confirmation | Persistent result or evidence |

## 6. Data Mode

Choose explicitly:

- Generated data already inside the app.
- Generated CSV/Excel uploaded through the UI.
- User-provided file uploaded through the UI.
- Copied sample data.
- Mock API.
- Backend API or database.

## 7. Acceptance Contract

Define before implementation:

- Human operation path.
- Required labels and forbidden terms.
- Enabled and disabled actions by state.
- Recovery and cross-page handoff.
- Generated input files and deterministic seed.
- Screenshot viewports and names.
- `flow-run.json` or equivalent result.
- Console errors, page errors, overflow, and layout failure conditions.
- Build and test commands.

## 8. Closure Checklist

- [ ] Scope and non-goals remained unchanged or were reconfirmed.
- [ ] Feature Coverage Gate is complete.
- [ ] Known-problem report is current and all important matches have evidence or a specific non-applicable reason.
- [ ] `npm.cmd run knowledge:gate -- --context plan.md --report <report>` passes.
- [ ] Build and relevant tests pass.
- [ ] Human-flow evidence exists.
- [ ] Review findings are resolved or explicitly deferred.
- [ ] `plan.md` is closed and archived to `process_logs/ProcessNNN.md`.
- [ ] `Process.md` current/recent index is updated.
