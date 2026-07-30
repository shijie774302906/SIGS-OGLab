# Process057 - Data Import Mapping, Units, And Multi-Point Design Contract

Date: 2026-07-10

Status: `closed / documented / independently reviewed`

## Theme

Define the complete data-import product model before adding editable mapping, unit, or multi-point controls.

## Scope

- Audit the current CSV parser, read-only mapping display, assumed units, point-decision behavior, project model, snapshot codec, and E2E coverage.
- Define real project points, import batches, field mapping decisions, unit decisions, point split plans, point drafts, dependency revisions, and cancellation semantics.
- Define center-page and right-dock ownership.
- Define deterministic random-file Playwright Flows and machine-readable evidence.
- Reconcile the detailed contract with the existing exception/template contract and long-term plan.

## Result

- Added `docs/prototype/数据导入映射单位与多点合同.md` as the authoritative baseline for this scope.
- Kept `数据导入异常与模板合同.md` as the general exception/template contract and aligned DI-E15.
- Replaced the single-point destination with:

```text
ProjectWorkspace
-> PointWorkspace[]
-> ImportBatchRecord[]
-> PointImportDraft[]
-> per-point check/stratification/parameter/output state
```

- Defined editable mapping, explicit unit confirmation, point attribution, deterministic conversion, multi-point split, duplicate-name decisions, partial selection, and atomic generation.
- Defined full revision vectors and downstream dependency snapshots.
- Defined V1-to-V2 migration, authoritative IndexedDB transactions, non-authoritative localStorage boot pointers, data-block references, and tombstone batch records.
- Defined 10 human Playwright Flows with generated files and execution oracles.

## Independent Review

Three read-only agents reviewed product coverage, architecture/persistence, and Playwright validity.

Review rounds found and resolved:

- conflicting unit gates
- missing non-column point attribution
- incomplete revision sources
- ambiguous partial generation and retry semantics
- single-point runtime coupling
- V1 snapshot deletion risk
- localStorage capacity and cross-store atomicity
- missing per-point validation
- incomplete cancellation oracle
- timing-dependent race tests
- manifest/data-block duplication
- undefined CheckState migration target
- missing import-batch tombstone type

Final result from all three reviewers: no remaining design-level P0.

## Verification

- Documentation was checked for authoritative scope, event crosswalk, stable terminology, stage order, and high-risk Flow coverage.
- No UI or runtime code changed in this process, so build and browser screenshots were not required.
- Existing Playwright tests remain the old implementation and do not yet prove the new contract; executable verification belongs to the implementation stages.

## Next

Start Stage A:

1. Real point/import-batch aggregate types.
2. V1-to-V2 migration with failure-safe startup behavior.
3. IndexedDB manifest and data-block transaction boundary.
4. Compatibility adapter so current UI remains usable while the runtime root changes.

