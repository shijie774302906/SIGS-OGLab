# Process054 - Project State And Check Page Decomposition

Date: 2026-07-10

Status: `closed / implemented / verified`

## Theme

Continue M1 by centralizing project collection transitions and moving one complete feature page out of the application monolith without changing user-facing behavior.

## Scope

- Add a pure project collection reducer.
- Migrate `App` from separate project-list and active-ID state setters to `useReducer`.
- Preserve project add/open/hub/update/rename/delete behavior and independent workspace state.
- Extract the complete `CheckDocument` feature page.
- Extract genuinely shared Flow banner and metric components.
- Add focused project lifecycle invariant tests.

## Result

- Added `src/features/projects/projectCollection.ts`.
- Added `createProjectCollectionState`, `projectCollectionReducer`, and `selectActiveProject`.
- Centralized active-project validity, add-and-open, hub return, isolated update, nested rename, and active/non-active deletion behavior.
- Added `src/features/check/CheckDocument.tsx`.
- Added `src/components/workbench/FlowCaseBanner.tsx` and `MetricInline.tsx`.
- Removed the local `CheckDocument`, `FlowCaseBanner`, `MetricInline`, and separate project collection setters from `App.tsx`.
- Reduced `App.tsx` from about 185 KB to about 169 KB.
- Added `tests/e2e/project-collection.spec.ts` with three pure reducer tests.

## Verification

- `npm.cmd run build` passed.
- `npm.cmd run test:e2e` passed: 12 tests.
- Reducer tests verify:
  - invalid active ID recovery
  - add/open/return-to-hub
  - isolated project update
  - nested Flow project rename and feedback
  - deletion of active versus non-active projects
- Existing browser tests verify create/open/switch/rename/delete and independent project workflow state.
- Existing CHK-E11 and data-check First Look browser checks remain passing after page extraction.

## Boundary

- No project persistence or storage format was implemented.
- No visible page, copy, test ID, or interaction behavior was intentionally changed.
- No desktop repo, backend, database, Excel parser, formula, save/adoption, or export behavior was changed.
- No curated evidence was deleted.

## Next

Confirm the project persistence model before implementation. Recommended prototype choice: versioned `localStorage` with defensive parsing, reset/recovery, and no implication of backend or formal engineering storage.

