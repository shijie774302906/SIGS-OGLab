# Plan Total - Product Framework And Roadmap

Updated: 2026-07-10

This is the long-term product source of truth for `海上风电岩土勘察解译`. It defines the complete product shape, current maturity, cross-page contracts, open decisions, and milestone order. Current implementation work belongs in `plan.md`.

## 1. Product Goal

Build a complete browser-based interpretation workbench that supports offshore wind geotechnical engineers from project creation and CPT/CPTU preparation through validation, stratification, parameter interpretation, and output readiness.

The browser prototype remains isolated from the desktop runtime. Prototype states and previews do not imply production persistence, official formulas, formal adoption, or formal export.

## 2. Information Architecture

The product has five feature zones and six workflow pages:

| Zone | Workflow Page | Page Job | Primary Handoff |
| --- | --- | --- | --- |
| 数据准备区 | 项目/点位数据 | Establish the active project, point, data situation, and immediate next action. | Active project/point context |
| 数据准备区 | 数据导入 | Create and verify an import draft that can be checked. | Versioned import draft |
| 数据检查区 | 数据检查 | Decide whether the current draft can enter `地层分层` and locate any problem. | Version-bound check result |
| 地层分层区 | 地层分层 | Review schemes, layers, boundaries, and evidence. | Selected/reviewed stratification |
| 参数解译区 | 参数解译 | Configure and inspect parameter trials against the selected stratification. | Parameter trial set |
| 成果输出区 | 成果输出 | Inspect completeness, exclusions, sources, and output preview readiness. | Previewable output package |

Fixed project workflow:

```text
项目集合 -> 选择/新建项目
  -> 项目/点位数据
  -> 数据导入
  -> 数据检查
  -> 地层分层
  -> 参数解译
  -> 成果输出
```

## 3. Current Product Maturity

| Area | Implemented And Verified | Important Missing Work | Maturity |
| --- | --- | --- | --- |
| 项目集合 | Create, list, open, switch, rename, delete, empty state, independent workflow state, versioned local persistence and recovery | Import/export of project workspace state | Functional prototype |
| 项目/点位数据 | Ready/empty states, First Look decision band, real `points[] + activePointId`, point inventory, point switching, and independent per-point workflow state | Rich point metadata and project workspace import/export | Functional prototype |
| 数据导入 | CSV upload, templates, editable mappings, explicit units, normalization, provenance, multi-point planning, per-point conflict decisions, atomic generation, cancellation, stale recovery, and point-bound check handoff | Excel parser and production backend | Functional prototype with declared gaps |
| 数据检查 | Shared First Look states, not-run/notice/problem/stale decisions, filters, evidence rows, history, rerun, version gate, CHK-E11 qc problem, and return-to-import recovery | Broader rule library and production validation contracts | Functional prototype with human recovery flow |
| 地层分层 | Per-point multi-scheme lifecycle, manual editing, formula/rule-generated candidate boundaries, dense full-hole/focus/expanded shared-depth qc/fs/u2-and-layer views, conservative guided thin-layer cleanup, candidate-to-editable conversion, undo/redo/discard, immutable revisions, upstream recovery, exact downstream lineage, and parameter gate | Optional empty-state enrichment and additional versioned rule catalog | Functional prototype with manual, rule-candidate, guided thin-layer and dense-view human flows |
| 参数解译 | V2 scheme/revision lifecycle, exact source lineage, transparent `qt/qnet/Qtn/Ic` derivation, authoritative `φ′p/suc` calculation, independent evidence, row/layer results, immutable runs, append-only persistence, manifest-side corruption detection, and upstream invalidation | Visible depth curves, evidence-bound page recovery, custom formula authoring, and complete page interaction | Verified method domain foundation; visible workbench pending |
| 成果输出 | Readiness, manifest/list, exclusions, source trace, preview-oriented copy | Package versioning, generation lifecycle, preview modes; formal export remains unconfirmed | Preview-oriented sample |

## 4. Cross-Zone Handoff Contract

Each downstream page consumes an explicit upstream object and must explain why continuation is allowed or delayed.

| From | To | Required Object | Invalidated When | Recovery Owner |
| --- | --- | --- | --- | --- |
| 项目/点位数据 | 数据导入 | Active project and point context | Project/point changes | 数据准备区 |
| 数据导入 | 数据检查 | Checkable import draft with version | File, mapping, unit, or point decision changes | 数据导入 |
| 数据检查 | 地层分层 | Current check result with no unresolved problem | Import draft version changes | 数据检查 / 数据导入 |
| 地层分层 | 参数解译 | Current stratification scheme and exact immutable revision | Check input, scheme revision, layer, or boundary changes | 地层分层 |
| 参数解译 | 成果输出 | Current parameter trial set and applicability state | Inputs, method, or stratification changes | Owning upstream zone |

Rules:

- A downstream page never invents missing upstream context.
- Backward recovery names the affected object and returns to the owning module.
- `待复核` is not automatically a data problem.
- `可继续` is a handoff state, not final engineering approval.
- Adopted/confirmed, candidate, trial, and read-only sample results remain distinct.

## 5. Shared UI Model

Use a mature Mixpanel-like workbench grammar while keeping domain-native content.

- Left navigation: five-zone grouping and six-page location.
- Center canvas: page question, decision band, primary evidence, details, and one strongest primary action.
- Right functional dock: page-specific selection, filtering, configuration, location, review, and generation tools.
- Feedback: concise inline state or toast; never a substitute for evidence.

Agreed primary palette:

- Primary lavender: `#bdadff`
- Selection/data blue: `#35b0f5`
- Success teal: `#2abf9a`
- Reserved olive: `#beae58`
- Problem/attention rose: `#fe92a1`

## 6. Milestone Roadmap

### M0 - Governance And Single Source Of Truth

- Slim stable rules.
- Separate total plan, active plan, memory, process index, and evidence policy.
- Preserve history while reducing active-context cost.

### M1 - Engineering Structure

- Completed foundation: workflow types, import selectors, check-domain logic, project collection reducer, shared decision band, Flow metadata, metrics, and the complete data-check center page are extracted from `App.tsx`.
- Completed foundation: generated test fixtures and focused check/project state tests are separated from the main E2E flow.
- Next: continue splitting project/import page modules and centralize the current project workspace transitions.
- Next: extract shared summary, status, table, and functional-dock components only where they remove real duplication.

### M2 - Complete Data Preparation And Check

- Completed foundation: shared Data Check First Look and CHK-E11 qc recovery flow.
- Completed: versioned project collection snapshot codec and `localStorage` persistence with Flow isolation, clear confirmation, damaged-data recovery, and refresh acceptance.
- Active design baseline: `docs/prototype/数据导入映射单位与多点合同.md`.
- Completed foundation: V2 real-point aggregate, V1 migration, IndexedDB authority, reference validation, cross-tab conflict freeze, and real-point switching.
- Completed: batch-owned import domain pipeline for stable source rows/columns, mapping decisions, explicit units, normalization, provenance, point attribution, split planning, operation/revision guards, and authoritative V2 persistence.
- Completed: projects use real point workspaces so every point owns independent import, check, stratification, parameter, and output state.
- Completed Stage C: editable mapping, explicit unit confirmation, source/standard value comparison, provenance inspection, exact stale-state recovery, and page-specific field tooling use the persisted V2 pipeline commands.
- Completed Stage D: multi-point all/selected generation, per-point create/append/replace/rename/skip decisions, atomic and idempotent persistence, source-row ownership, cancellation freeze, stale-plan recovery, and randomized human-flow evidence.
- Completed Stage E: point-bound Data Check state, exact issue-to-source-row recovery, rerun/history semantics, complete dependency validation, and the explicit current-result gate into `地层分层`.
- Completed Process092: shared-axis qc/fs/u2 and layer evidence, a configurable 0.50 m thin-layer screening guide, conservative per-channel decisions, atomic preview/apply, undo/reload recovery, and real Yingkou verification.
- Completed Process093: dense stratification overview/focus/expanded viewing, collision-safe true-height layer rendering, explicit engineering depth-axis binding, list-to-drawing navigation, stable editable JTS source validation, and serialized optimistic parameter persistence.
- Completed Process099: one guided layer-cleanup entry, recommended soft target and automatic lower recommendation, deterministic adjacent recomputation, protected engineering boundaries, explicit merge reasons, atomic apply, undo/redo and real Yingkou verification.
- Completed Process100: replaced target-count simplification with adjacent engineering-major-group merging; preserved explicit engineer boundary locks, ordered detailed-type composition, review-required and curve-difference audit state, atomic apply/undo/reload, and real Yingkou verification.
- Completed Process094: deterministic active/closure process doctor, hash-bound final evidence manifests, Process/KPB bidirectional consistency checks, historical-report handling, and Process091 update-library repair.
- Add Excel parsing later through the same mapping/unit/point pipeline, including Sheet and header-row selection.

### M3 - Stratification Workflow

- Completed Stage F: scheme, layer, boundary, edit-session, and immutable revision lifecycles.
- Completed: synchronized CPT evidence, drag/numeric editing, undo/redo/discard, merge provenance, multi-scheme replacement, save recovery, upstream invalidation, and multi-point isolation.
- Completed: exact current scheme + revision lineage into `参数解译`, with database rejection of damaged live structures, snapshots, and stale downstream revisions.
- Completed: seven randomized human flows, required dual-viewport evidence, full regression, and three independent review tracks at `P0=0 / P1=0`.
- Completed Stage F2: versioned `qc / Fr` change-point rule, immutable candidate runs, source-window evidence, curve preview, candidate-to-editable conversion, manual refinement, explicit revision commit, strict checked-data authority binding, and adversarial persistence verification.
- Rule candidates remain distinct from current boundaries; only an explicit human commit creates a downstream-consumable immutable stratification revision.
- Parameter authority history cannot be removed or re-identified through normal autosave; future project/point deletion after parameter runs requires an explicit destructive operation and persistent tombstone semantics.

### M4 - Parameters And Output

- Completed Stage G0: parameter object lifecycle, source boundary, page ownership, and acceptance contract research.
- Completed Stage G1A/G1C: parameter V2 schemes and immutable revisions, transparent input derivation, exact source lineage, run lifecycle, atomic persistence, corruption rejection, and upstream invalidation.
- Completed Stage G1B: authoritative `φ′p/suc` methods, evidence revisions, applicability and conflict recovery, canonical site-calibration authority, immutable row/layer result runs, append-only persistence, manifest-side corruption detection, and 74 independent golden vectors with 42 stable reason codes.
- Confirmed G2 direction: parameter interpretation must visualize depth curves aligned with stratification boundaries, row evidence, layer statistics, issue locations, and method scope.
- Confirmed G1D direction: users may add interpretation formulas through a constrained, versioned expression language with explicit variables, units, applicability, validation, preview, and immutable runs; arbitrary JavaScript is not accepted.
- Completed F2: formula/rule stratification produces traceable candidates that can be inspected, manually refined, and explicitly committed through the existing revision contract.
- Confirmed G5 acceptance input: import the multi-page Yingkou case through the real visible upload workflow and use it for full human-flow verification after F2/G2/G1D are ready.
- Recommended order: F2 formula/rule stratification -> G2 native parameter curves -> G1D custom formulas -> G5 Yingkou end-to-end acceptance.
- Complete output readiness, preview generation, versioning, exclusions, and upstream recovery.
- Keep unconfirmed formulas, formal adoption, and export outside scope until explicitly confirmed.

### M5 - Product Hardening

- Accessibility, keyboard operation, performance, responsive density, deterministic evidence, and full cross-zone regression.

## 7. Open Product Decisions

These require explicit confirmation before implementation:

1. Exact Excel parser library and delivery stage; the product contract already requires Sheet and header-row selection through the shared import pipeline.
2. Custom formula expression grammar, allowed functions, formula ownership, and approval semantics; formal adoption and export formats remain separate decisions.
3. Whether `项目/点位数据` and `数据导入` remain separate pages long term.

## 8. Definition Of Done For A Feature Slice

A slice is done only when:

- User actions, object lifecycle, events, page ownership, data mode, and acceptance are explicit.
- Normal, problem, warning-only, cancel, return, retry, stale, and recovery paths are addressed where relevant.
- Primary action and downstream handoff are unambiguous.
- Build and relevant tests pass.
- UI work has human-flow evidence at required viewports with no console/page errors or incoherent overflow.
- Closure is recorded in `Process.md` and one detailed `process_logs/ProcessNNN.md` file.
