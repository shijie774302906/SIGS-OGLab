# UI Review Agents

This folder defines the reusable review-agent set for `D:\CPT-UIQA-WebPrototype`.

Use these agents whenever the user asks for:

- `agents 审查`
- `多 agent 复查`
- `安排 agent 挑刺`
- `用 agents 看 UI`
- any equivalent request to review the current UI with sub-agents

Default review set:

1. `visual-layout-taste-auditor.md`
2. `geotechnical-domain-reviewer.md`
3. `copy-ia-mobbin-challenger.md`

Primary ownership:

- Visual repetition, overlap, density, and chart readability belong to `visual-layout-taste-auditor.md`.
- Professional correctness and engineering-boundary repetition belong to `geotechnical-domain-reviewer.md`.
- Functional redundancy, duplicate content, repeated UI concepts, repeated controls, and IA/copy duplication belong to `copy-ia-mobbin-challenger.md`.

## Operating Rule

All three agents are read-only by default.

They should inspect current code, screenshots, browser evidence, and relevant documents, then return findings. The main Codex agent decides which findings to implement.

Do not let review agents directly edit files unless the user explicitly asks for implementation agents.

## Evidence Package

Before spawning these agents, prepare or point them to:

- current `src/App.tsx`
- current `src/styles.css`
- current Playwright screenshots at `1440x900`
- current Playwright screenshots at `1920x1080`
- at least one interaction screenshot after selecting a scheme/layer when relevant
- final browser check JSON if available
- console warning/error logs if available

Suggested screenshot directory:

```text
process_logs/playwright-mcp/<slice-name>/
```

## Required Output Format

Each agent must return:

- P0 findings: blockers that must be fixed before closing the slice
- P1 findings: important issues that should be fixed in the current slice
- P2 findings: polish or future-slice issues
- exact evidence: screenshot name, selector, file path, or line reference when possible
- concrete fix suggestion

## How To Use

When the user asks for agent review, spawn all three in parallel:

- Visual Layout Taste Auditor
- Geotechnical Domain Reviewer
- Copy IA Mobbin Challenger

After the agents return:

1. Summarize common themes.
2. Implement P0 and agreed P1 fixes if they are in scope.
3. Re-run build, E2E, and Playwright MCP screenshots when UI changed.
4. Record closure in `Process.md` and `process_logs/`.

## Agent Files

- [Visual Layout Taste Auditor](visual-layout-taste-auditor.md)
- [Geotechnical Domain Reviewer](geotechnical-domain-reviewer.md)
- [Copy IA Mobbin Challenger](copy-ia-mobbin-challenger.md)
