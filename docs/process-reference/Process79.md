# Process79 - GMW-P1G Result-Oriented Method Visibility

Date: 2026-06-30

Workspace: `D:\CPT-UIQA`

## Intent

The user pointed out that the stratification side was supposed to support many methods, but the current UI only shows a few entries and those entries are not the common engineering methods expected by users.

The user also clarified the working principle for this stage:

```text
只看结果，注意目的，不做无关和低效率的工作。
```

Therefore the active plan has been redirected away from the previous Draft Scheme file-contract slice and toward result-oriented method visibility.

## Diagnosis

Current `sample_data/method-lab/method-registry.v1.json` is a small validation registry, not a complete method library.

It currently contains:

- built-in Ic/SBT first pass
- Groundhog PCPT correlations
- pyCPT auto stratification
- user-defined parameter formula template
- profile unit normalizer preprocessor

This explains why the UI only exposes a few methods. It is not primarily a hidden-UI issue.

The current UI also over-emphasizes method/project names such as Groundhog and pyCPT. That is not aligned with the product purpose. The product should present result objects first:

- `LayerScheme`
- `ClassificationEvidence`
- `ParameterScheme`
- `ParameterSeries`

## Plan Change

Updated `plan.md` to:

```text
GMW-P1G：把方法入口从“少数方法名展示”改为“按结果对象组织”
```

The next work should first make capabilities visible by output object and consumer route, then connect them to the target result pages:

- stratification page: generate/compare `LayerScheme`; show `ClassificationEvidence`
- parameter page: choose `LayerScheme`; configure `ParameterSlot`; generate `ParameterSeries` / `ParameterScheme`
- method lab: keep as registry / runner / provenance / debug center

## Files Changed

- `plan.md`
- `Process.md`
- `process_logs/Process79.md`

## Verification

Focused verification for `GMW-P1G-a`:

```text
build: 0 warnings / 0 errors
METHOD_LAB_WORKBENCH_BRIDGE_CHECK=PASS
METHOD_LAB_WORKBENCH_ROUTE=method-lab
METHOD_LAB_WORKBENCH_REQUIRED_IDS=11
METHOD_LAB_WORKBENCH_VISUAL_PREVIEW=PASS
METHOD_LAB_VISUAL_RUNTIME_CHECK=PASS
METHOD_LAB_VISUAL_RUNTIME_COUNTS=GroundhogTracks:3;PycptLayers:44
METHOD_LAB_VISUAL_RUNTIME_REGISTRY=PASS
METHOD_LAB_RESULT_OBJECT_CAPABILITIES=PASS
```

Whitespace check:

```powershell
git diff --check -- plan.md Process.md process_logs/Process79.md
```

Result: no whitespace errors; only existing CRLF normalization warnings for `Process.md` and `plan.md`.

## Implementation Result

Added a result-object capability summary to Method Lab:

- visible text: `Result objects: LayerScheme ... | ClassificationEvidence ... | ParameterSeries ... | ParameterScheme ...`
- UIA token: `ResultObjectCapabilities=True`
- token also exposes:
  - `LayerScheme`
  - `ClassificationEvidence`
  - `ParameterSeries`
  - `ParameterScheme`
  - `MethodNamesNotPrimary=True`

This does not add or fake methods. It only exposes the real capability inventory from the existing registry.

## Boundaries

No SQLite schema change.

No formula or algorithm change.

No official/adopted/export write.

No fake runnable methods.

No further license discussion unless a distribution or official adoption decision requires it.

## Next Step

`GMW-P1G-b` has now been implemented and verified.

## GMW-P1G-b Closure - Stratification Method Capabilities

Implemented a result-oriented method capability entry on the stratification page.

Visible UI now shows two aggregate result entries rather than method-name-specific rows:

- `Generate LayerScheme`
- `Classification evidence`

The source is the shared registry reader:

- `OffshoreGeotechWorkbench/Services/MethodCapabilityInventoryService.cs`

Changed files:

- `OffshoreGeotechWorkbench/Services/MethodCapabilityInventoryService.cs`
- `OffshoreGeotechWorkbench/Pages/StratificationPage.xaml`
- `OffshoreGeotechWorkbench/Pages/StratificationPage.xaml.cs`
- `tools/uiregression/check_stratification_workbench_contract.ps1`

Verification:

```text
build: 0 warnings / 0 errors
STRATIFICATION_LAYER_SCHEME_MOCK_CHECK=PASS
STRATIFICATION_NO_OFFICIAL_WRITE=PASS
STRATIFICATION_WORKBENCH_CONTRACT_CHECK=PASS
STRATIFICATION_ENGINEERING_REVIEW_MAPPING_CHECK=PASS
STRATIFICATION_CURRENT_IC_SBT_MAPPING_CHECK=PASS
STRATIFICATION_METHOD_CAPABILITIES=PASS
```

Capability token:

```text
StratificationMethodCapabilities=True;Route=stratification;Registry=cpt-uiqa-method-registry-fixture;MethodNamesNotPrimary=True;LayerScheme=2;LayerSchemeReady=2;ClassificationEvidence=3;ClassificationEvidenceReady=3;OnlyEvidence=3;PreviewCandidateOnly=True;OfficialWrite=False;Adopted=False
```

Screenshot:

```text
D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\desktop_fullscreen_20260630_134324.png
```

Design result:

- The left panel order is now `Layer Schemes -> Method Capabilities -> Research Candidates -> Projection Guard`.
- The method capability section is compact and does not replace the primary result view.
- The default UI shows result categories and readiness counts, not Groundhog/pyCPT as product structure.

Boundary unchanged:

- No SQLite schema change.
- No formula or algorithm change.
- No official/adopted/export write.
- No fake runnable methods.

## Next Step

Implement `GMW-P2E`:

```text
Parameter page method entry organized by selected LayerScheme and parameter slots.
```

The target is to make the UI answer:

- Which LayerScheme is feeding the parameter page?
- Which parameter slots exist?
- Which methods are available for `φ'` and `Su`?
- Are `γ` and `OCR` missing/blocked rather than fake results?
- Which methods are installed, runnable, experimental, or blocked?
## GMW-P1H Closure - Common Stratification Method Catalog

Date: 2026-06-30

Intent:

The user noticed that the stratification page still looked like it only had a few unusual methods, instead of the normal CPT/CPTU stratification options engineers and researchers expect.

Implemented result:

- Expanded `sample_data/method-lab/method-registry.v1.json` with common stratification catalog entries:
  - `Engineering Ic/SBT layer grouping`
  - `Robertson SBTn classification evidence`
  - `Manual stratification template`
  - `User-defined stratification method template`
- Kept Groundhog and pyCPT as method sources/adapters, not the page structure.
- Updated `StratificationPage` method capability labels to show method names first and counts second.
- Added durable token `CommonStratificationCatalog=True`.
- Tightened ready semantics:
  - `Installed` counts as runnable ready.
  - `AvailableTemplate` remains visible as a template but does not count as runnable ready.

Changed files:

- `sample_data/method-lab/method-registry.v1.json`
- `OffshoreGeotechWorkbench/Services/MethodCapabilityInventoryService.cs`
- `OffshoreGeotechWorkbench/Pages/MethodLabPage.xaml.cs`
- `OffshoreGeotechWorkbench/Pages/StratificationPage.xaml.cs`
- `tools/uiregression/check_stratification_workbench_contract.ps1`
- `plan.md`
- `Process.md`
- `process_logs/Process79.md`

Verification:

```text
METHOD_REGISTRY_CONTRACT_CHECK=PASS
METHOD_REGISTRY_CAPABILITY_ROUTING=PASS
METHOD_REGISTRY_COVERAGE=PASS
METHOD_REGISTRY_NO_METHOD_NAME_ROUTING=PASS
METHOD_REGISTRY_NO_UNSAFE_OFFICIAL_WRITE=PASS
METHOD_LAB_WORKBENCH_BRIDGE_CHECK=PASS
build: 0 warnings / 0 errors
STRATIFICATION_LAYER_SCHEME_MOCK_CHECK=PASS
STRATIFICATION_NO_OFFICIAL_WRITE=PASS
STRATIFICATION_WORKBENCH_CONTRACT_CHECK=PASS
STRATIFICATION_ENGINEERING_REVIEW_MAPPING_CHECK=PASS
STRATIFICATION_CURRENT_IC_SBT_MAPPING_CHECK=PASS
STRATIFICATION_METHOD_CAPABILITIES=PASS
```

Capability token:

```text
StratificationMethodCapabilities=True;Route=stratification;Registry=cpt-uiqa-method-registry-fixture;MethodNamesNotPrimary=True;CommonStratificationCatalog=True;LayerScheme=5;LayerSchemeReady=3;ClassificationEvidence=5;ClassificationEvidenceReady=4;ManualTemplate=1;UserDefinedTemplate=2;RobertsonEvidence=1;OnlyEvidence=5;PreviewCandidateOnly=True;OfficialWrite=False;Adopted=False
```

Screenshot:

```text
D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\desktop_fullscreen_20260630_140420.png
```

Closure review:

- Pass.
- The page now reads as a generic stratification method catalog instead of a Groundhog/pyCPT page.
- Method names are visible before counts in the left capability panel.
- Templates are visible but not counted as runnable ready.
- No SQLite schema, formula, algorithm, official/adopted/export behavior changed.

Next step:

```text
GMW-P2E-a：参数页方法能力入口
```
## GMW-P2E-a Closure - Parameter Method Capability Strip

Date: 2026-06-30

Intent:

The parameter page needed to show method availability by selected `LayerScheme` and parameter slot, not by external method/project name. The user goal is result-first use: engineers should immediately see which parameter slots are ready and which are blocked.

Implemented result:

- Added `ParameterRows` to `MethodCapabilityInventoryService`.
- Added a `PARAMETER METHOD CAPABILITIES` strip to the parameter page.
- The strip shows four parameter slots in one visible region:
  - `phi'`
  - `Su`
  - `gamma`
  - `OCR`
- The strip combines registry declarations with the current `ParameterScheme` projection and slot `methodAvailability`.
- `Gamma` and `OCR` are shown as `Blocked`, not as fake results.
- The row height was tightened so all four slots are visible at once in the 1920x1080 acceptance screenshot.

Changed files:

- `OffshoreGeotechWorkbench/Services/MethodCapabilityInventoryService.cs`
- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml`
- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml.cs`
- `tools/uiregression/check_parameter_scheme_workbench_static.ps1`
- `plan.md`
- `Process.md`
- `process_logs/Process79.md`

Verification:

```text
build: 0 warnings / 0 errors
PARAMETER_SCHEME_MOCK_CHECK=PASS
PARAMETER_NO_OFFICIAL_WRITE=PASS
PARAMETER_SCHEME_WORKBENCH_STATIC_CHECK=PASS
PARAMETER_SCHEME_WORKBENCH_RESULT_FIRST=PASS
PARAMETER_METHOD_CAPABILITIES=PASS
PARAMETER_METHOD_CANDIDATES_FILTERED_BY_SLOT=PASS
PARAMETER_PROJECTION_NO_OFFICIAL_WRITE=PASS
PARAMETER_ALL_SLOTS_FILTERED=PASS
```

Capability token:

```text
ParameterMethodCapabilities=True;Route=parameters;Registry=cpt-uiqa-method-registry-fixture;FilteredByLayerScheme=True;FilteredByParameterSlot=True;LayerScheme=scheme-engineering-review;PhiDeg=2;PhiDegReady=2;PhiDegState=Ready;SuKpa=2;SuKpaReady=2;SuKpaState=Ready;Gamma=1;GammaReady=0;GammaState=Blocked;OCR=1;OCRReady=0;OCRState=Blocked;CanRunOfficial=False;OfficialWrite=False;Adopted=False
```

Screenshot:

```text
D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\desktop_fullscreen_20260630_142018.png
```

Closure review:

- Pass.
- The parameter page now answers the first-order user question: which parameter slots have usable methods and which are blocked.
- The default view remains VSCode-like and compact.
- `Gamma` and `OCR` are clearly blocked.
- No SQLite schema, formula, algorithm, official/adopted/export behavior changed.

Next step:

```text
GMW-P2E-b：参数页运行/预览边界与槽位详情联动
```

## GMW-P2E-b Closure - Parameter Capability / Slot / Candidate Synchronization

Date: 2026-06-30

Intent:

The parameter method capability strip needed to behave like a real result-first control, not a decorative summary. Selecting a capability row must bring the matching parameter slot and candidate method detail into sync.

Implemented result:

- Capability strip rows now support selection.
- Selecting `Gamma` selects `slot-gamma-all-draft`.
- Selecting `OCR` selects `slot-ocr-clay-blocked`.
- Selected slot token exposes capability/slot synchronization.
- Candidate list remains filtered by the selected slot.
- Blocked methods show the actual blocking reason from the projection fixture.
- No official/adopted/export write is exposed.

Changed files:

- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml`
- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml.cs`
- `tools/uiregression/check_parameter_scheme_workbench_static.ps1`

Verification:

```text
build: 0 warnings / 0 errors
PARAMETER_SCHEME_MOCK_CHECK=PASS
PARAMETER_NO_OFFICIAL_WRITE=PASS
PARAMETER_SCHEME_WORKBENCH_STATIC_CHECK=PASS
PARAMETER_SCHEME_WORKBENCH_RESULT_FIRST=PASS
PARAMETER_METHOD_CAPABILITIES=PASS
PARAMETER_METHOD_CAPABILITY_SLOT_SYNC=PASS
PARAMETER_GAMMA_BLOCKED_SYNC=PASS
PARAMETER_OCR_BLOCKED_SYNC=PASS
PARAMETER_METHOD_CANDIDATES_FILTERED_BY_SLOT=PASS
PARAMETER_PROJECTION_NO_OFFICIAL_WRITE=PASS
PARAMETER_ALL_SLOTS_FILTERED=PASS
```

Key tokens:

```text
PARAMETER_GAMMA_SELECTED_TOKEN=SelectedParameterSlot:slot-gamma-all-draft;SelectedCapability=Gamma;CapabilitySlotSynced=True;Parameter=Gamma;Candidates=1;FilteredBySlot=True;CanRunTrial=False;CanRunOfficial=False;InputState=Missing;LayerState=Partial;BlockingReason=Missing project unit-weight rule.;OfficialWrite=False;Adopted=False
PARAMETER_OCR_SELECTED_TOKEN=SelectedParameterSlot:slot-ocr-clay-blocked;SelectedCapability=OCR;CapabilitySlotSynced=True;Parameter=OCR;Candidates=1;FilteredBySlot=True;CanRunTrial=False;CanRunOfficial=False;InputState=Missing;LayerState=Blocked;BlockingReason=Bq and OCR calibration are missing.;OfficialWrite=False;Adopted=False
```

Screenshot:

```text
D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\desktop_fullscreen_20260630_143608.png
```

Closure review:

- Pass.
- The UI now answers the result question directly: selected parameter capability maps to one active parameter slot and its method candidates.
- Gamma and OCR remain blocked rather than fake-runnable.
- Candidate filtering remains by selected slot.
- Boundary unchanged: no SQLite schema, formula, algorithm, official/adopted/export behavior changed.
- Independent subagent review could not be started because no multi-agent tool was available from tool discovery; this closure was recorded as main-agent focused review.

## GMW-P2E-c Closure - Common Parameter Method Catalog Visibility

Date: 2026-06-30

Intent:

After stratification catalog visibility was improved, the parameter page still risked looking like it only knew a few unusual methods. The next efficient result-focused fix was to expose common parameter-method categories without pretending they are implemented/runnable.

Implemented result:

- Added common parameter catalog templates to `sample_data/method-lab/method-registry.v1.json`:
  - `Common φ' sand CPT correlations`
  - `Common Su clay CPTU correlations`
  - `Common γ unit-weight correlations`
  - `Common OCR stress-history correlations`
- Added `CommonParameterCatalog=True` and `ParameterCatalogTemplates=4` to the parameter method capability token.
- The capability strip now shows expanded counts:
  - `PhiDeg=3`, `PhiDegReady=2`
  - `SuKpa=3`, `SuKpaReady=2`
  - `Gamma=2`, `GammaReady=0`
  - `OCR=2`, `OCRReady=0`
- Gamma/OCR remain blocked; the new catalog templates do not create fake results.

Changed files:

- `sample_data/method-lab/method-registry.v1.json`
- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml.cs`
- `tools/uiregression/check_parameter_scheme_workbench_static.ps1`
- `plan.md`
- `Process.md`
- `process_logs/Process79.md`

Verification:

```text
METHOD_REGISTRY_CONTRACT_CHECK=PASS
METHOD_REGISTRY_CAPABILITY_ROUTING=PASS
METHOD_REGISTRY_COVERAGE=PASS
METHOD_REGISTRY_NO_METHOD_NAME_ROUTING=PASS
METHOD_REGISTRY_NO_UNSAFE_OFFICIAL_WRITE=PASS
PARAMETER_SCHEME_MOCK_CHECK=PASS
PARAMETER_NO_OFFICIAL_WRITE=PASS
build: 0 warnings / 0 errors
PARAMETER_SCHEME_WORKBENCH_STATIC_CHECK=PASS
PARAMETER_SCHEME_WORKBENCH_RESULT_FIRST=PASS
PARAMETER_METHOD_CAPABILITIES=PASS
PARAMETER_METHOD_CAPABILITY_SLOT_SYNC=PASS
PARAMETER_GAMMA_BLOCKED_SYNC=PASS
PARAMETER_OCR_BLOCKED_SYNC=PASS
PARAMETER_METHOD_CANDIDATES_FILTERED_BY_SLOT=PASS
PARAMETER_PROJECTION_NO_OFFICIAL_WRITE=PASS
PARAMETER_ALL_SLOTS_FILTERED=PASS
PHYSICAL_SCREENSHOT=PASS
```

Latest parameter token:

```text
ParameterMethodCapabilities=True;Route=parameters;Registry=cpt-uiqa-method-registry-fixture;CommonParameterCatalog=True;ParameterCatalogTemplates=4;FilteredByLayerScheme=True;FilteredByParameterSlot=True;SelectedCapability=PhiDeg;SelectedSlot=slot-phi-sand-trial;CapabilitySlotSynced=True;SelectedState=Ready;LayerScheme=scheme-engineering-review;PhiDeg=3;PhiDegReady=2;PhiDegState=Ready;SuKpa=3;SuKpaReady=2;SuKpaState=Ready;Gamma=2;GammaReady=0;GammaState=Blocked;OCR=2;OCRReady=0;OCRState=Blocked;CanRunOfficial=False;OfficialWrite=False;Adopted=False
```

Screenshot:

```text
D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\physical_screen_1920x1080_20260630_144538.png
```

Closure review:

- Pass.
- The parameter page now communicates that the product has a common method catalog direction for `φ'`, `Su`, `γ`, and `OCR`.
- The catalog is visible without changing current formulas or declaring unimplemented methods runnable.
- Candidate list remains slot-specific; catalog templates only affect capability visibility.
- Boundary unchanged: no SQLite schema, formula, algorithm, official/adopted/export behavior changed.

Next step:

```text
GMW-P5X / F12-A：Draft Scheme 文件合同与只读模拟保存
```

## GMW-P5X / F12-A Closure - Draft Scheme File Contract and Read-only Simulated Save

Date: 2026-06-30

Intent:

Move from a generic Draft/Review package to an explicit Draft Scheme preview contract, without writing adopted results. The user goal remains result-first: generated method candidates should become reviewable scheme objects, not just loose method artifacts.

Implemented result:

- Added `DraftSchemePreviewService`.
- Draft/Review generation now also creates read-only Draft Scheme preview files under:

```text
app_data/method_lab/draft_scheme/
```

- Stratification route creates:

```text
LayerSchemeDraft
```

- Parameter route creates:

```text
ParameterSchemeDraft
```

- Draft preview JSON uses:

```text
draft-scheme-preview.v1
```

- Draft preview documents include:
  - source Draft/Review package id and paths
  - candidate id
  - source output object type
  - method ref
  - baseline difference
  - scan line
  - adoption preflight line
  - blockers
  - protected write/export flags
- Stratification and parameter Draft/Review detail panels now expose a `DRAFT SCHEME` group.
- UIA tokens expose:

```text
DraftSchemePreview=True
DraftObjectType=LayerSchemeDraft / ParameterSchemeDraft
CanWriteDraft=False
CanAdopt=False
ReadOnlyDraftPreview
OfficialWrite=False
Adopted=False
Export=False
```

Changed files:

- `OffshoreGeotechWorkbench/Services/DraftSchemePreviewService.cs`
- `OffshoreGeotechWorkbench/Pages/StratificationPage.xaml`
- `OffshoreGeotechWorkbench/Pages/StratificationPage.xaml.cs`
- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml`
- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml.cs`
- `tools/uiregression/check_research_candidate_draft_review_entry.ps1`
- `plan.md`
- `Process.md`
- `Plan-total.md`
- `process_logs/Process79.md`

Verification:

```text
build: 0 warnings / 0 errors
RESEARCH_CANDIDATE_DRAFT_REVIEW_ENTRY=PASS
RESEARCH_CANDIDATE_DRAFT_REVIEW_PACKAGE=PASS
RESEARCH_CANDIDATE_DRAFT_REVIEW_PACKAGE_LIST=PASS
RESEARCH_CANDIDATE_DRAFT_REVIEW_DETAIL_EXPANDED=PASS
RESEARCH_CANDIDATE_DRAFT_REVIEW_FIELD_GROUPS=PASS
RESEARCH_CANDIDATE_DRAFT_ADOPT_PREFLIGHT=PASS
RESEARCH_CANDIDATE_DRAFT_SCHEME_PREVIEW=PASS
RESEARCH_CANDIDATE_CONSUMPTION_CHECK=PASS
RESEARCH_CANDIDATE_STRATIFICATION_VISIBLE=PASS
RESEARCH_CANDIDATE_PARAMETERS_VISIBLE=PASS
TARGET_RESULT_OVERLAY_CHECK=PASS
TARGET_RESULT_OVERLAY_SELECTION_LINK=PASS
CANDIDATE_DIFFERENCE_DETAIL_TABLE=PASS
CROSS_CANDIDATE_DIFFERENCE_TABLE=PASS
RESEARCH_CANDIDATE_SCAN_ORDER=PASS
PHYSICAL_SCREENSHOT=PASS
```

Latest draft scheme files:

```text
D:\CPT-UIQA\app_data\method_lab\draft_scheme\20260630_151525029_LayerSchemeDraft_20260630_151525018_stratification_methodlab-input-cpt09-run-1_ClassificationEvidence.json
D:\CPT-UIQA\app_data\method_lab\draft_scheme\20260630_151531058_ParameterSchemeDraft_20260630_151531051_parameters_methodlab-fixture-input-yingkou-cpt09_ParameterSeries.json
```

Latest screenshot:

```text
D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\physical_screen_1920x1080_20260630_151552.png
```

Closure review:

- Pass.
- Draft Scheme preview now exists as a concrete file-level contract, not just prose in Draft/Review detail.
- The result object distinction is clear: `LayerSchemeDraft` vs `ParameterSchemeDraft`.
- The UI still presents these as review-only drafts, not adopted results.
- Candidate list visibility regressed during the first UI change and was fixed by reserving stable candidate-list height and moving visible research tokens above the Draft/Review controls.
- Boundary unchanged: no SQLite schema, formula, algorithm, official/adopted/export behavior changed.

Next step:

```text
GMW-P5Y / F12-B：Draft Scheme 列表与打开复核
```
## GMW-P5Y / F12-B Closure - Draft Scheme List and Review Open

Date: 2026-06-30

Intent:

Make generated Draft Scheme previews visible and reviewable in the actual result pages. The purpose is result-first: users should see the current point's draft stratification/parameter scheme outputs, not only hidden package files or method-lab artifacts.

Implemented result:

- Added Draft Scheme index reading in `DraftSchemePreviewService`.
- Reads recent preview files from:

```text
app_data/method_lab/draft_scheme/*.json
```

- Prioritizes current point rows when a point id is available.
- Stratification page now shows recent `LayerSchemeDraft` previews.
- Parameter page now shows recent `ParameterSchemeDraft` previews.
- Selecting a Draft Scheme shows read-only review fields:
  - source package
  - candidate
  - method
  - difference
  - blockers
  - JSON path
  - Markdown path
- After generating a Draft/Review package, the page also writes the Draft Scheme preview and selects the newest draft.
- UIA tokens expose:

```text
DraftSchemeList=True
ReviewOpen=True
DraftObjectType=LayerSchemeDraft / ParameterSchemeDraft
CanWriteDraft=False
CanAdopt=False
ReadOnlyDraftPreview
OfficialWrite=False
Adopted=False
Export=False
```

Changed files:

- `OffshoreGeotechWorkbench/Services/DraftSchemePreviewService.cs`
- `OffshoreGeotechWorkbench/Pages/StratificationPage.xaml`
- `OffshoreGeotechWorkbench/Pages/StratificationPage.xaml.cs`
- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml`
- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml.cs`
- `tools/uiregression/check_research_candidate_draft_review_entry.ps1`
- `plan.md`
- `Process.md`
- `process_logs/Process79.md`
- `Plan-total.md`

Verification:

```text
build: 0 warnings / 0 errors
RESEARCH_CANDIDATE_DRAFT_REVIEW_ENTRY=PASS
RESEARCH_CANDIDATE_DRAFT_REVIEW_PACKAGE=PASS
RESEARCH_CANDIDATE_DRAFT_REVIEW_PACKAGE_LIST=PASS
RESEARCH_CANDIDATE_DRAFT_REVIEW_DETAIL_EXPANDED=PASS
RESEARCH_CANDIDATE_DRAFT_REVIEW_FIELD_GROUPS=PASS
RESEARCH_CANDIDATE_DRAFT_ADOPT_PREFLIGHT=PASS
RESEARCH_CANDIDATE_DRAFT_SCHEME_PREVIEW=PASS
RESEARCH_CANDIDATE_DRAFT_SCHEME_LIST=PASS
RESEARCH_CANDIDATE_CONSUMPTION_CHECK=PASS
TARGET_RESULT_OVERLAY_CHECK=PASS
TARGET_RESULT_OVERLAY_SELECTION_LINK=PASS
CANDIDATE_DIFFERENCE_DETAIL_TABLE=PASS
CROSS_CANDIDATE_DIFFERENCE_TABLE=PASS
RESEARCH_CANDIDATE_SCAN_ORDER=PASS
PHYSICAL_SCREENSHOT=PASS
git diff --check: PASS
```

Latest draft scheme files:

```text
D:\CPT-UIQA\app_data\method_lab\draft_scheme\20260630_153129124_LayerSchemeDraft_20260630_153129111_stratification_methodlab-input-cpt09-run-1_ClassificationEvidence.json
D:\CPT-UIQA\app_data\method_lab\draft_scheme\20260630_153135368_ParameterSchemeDraft_20260630_153135360_parameters_methodlab-fixture-input-yingkou-cpt09_ParameterSeries.json
```

Latest screenshot:

```text
D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\physical_screen_1920x1080_20260630_153315.png
```

Closure review:

- Pass.
- The result is now visible in the two core work areas: stratification and parameter interpretation.
- Draft Scheme previews remain read-only and cannot be mistaken for adopted official results.
- The UIA evidence proves both list visibility and review-open state for `LayerSchemeDraft` and `ParameterSchemeDraft`.
- One invalid verification attempt occurred when two UIA scripts were run in parallel and competed for menu focus; the failed target-overlay run was discarded and rerun serially, then passed.
- Boundary unchanged: no SQLite schema, formula, algorithm, official/adopted/export behavior changed.

Next step:

```text
GMW-P5Z / F12-C：Draft Scheme 差异摘要与采纳前置复核
```
## GMW-P5Z / F12-C Closure - Draft Scheme Difference Summary and Adopt Preflight Review

Date: 2026-06-30

Intent:

Make Draft Scheme review more direct. The previous slice made drafts listable and openable; this slice splits the review detail into stable fields so users and UIA checks can see exactly what changed, why adoption is blocked, and where the underlying files are.

Implemented result:

- Extended `DraftSchemePreviewRow` with stable read-only review fields:
  - object type
  - source package
  - candidate
  - method
  - output object type
  - baseline
  - difference
  - severity
  - blocker count
  - blockers
  - JSON path
  - Markdown path
- Stratification Draft Scheme detail now displays the field set for `LayerSchemeDraft`.
- Parameter Draft Scheme detail now displays the same field set for `ParameterSchemeDraft`.
- UIA tokens now expose:

```text
DetailFields=True
DifferenceSummary=True
PreflightChecklist=True
BaselineDifference=
BlockerCount=
JsonPath=
MarkdownPath=
```

- Existing protected boundaries remain:

```text
CanWriteDraft=False
CanAdopt=False
OfficialWrite=False
Adopted=False
Export=False
```

Changed files:

- `OffshoreGeotechWorkbench/Services/DraftSchemePreviewService.cs`
- `OffshoreGeotechWorkbench/Pages/StratificationPage.xaml`
- `OffshoreGeotechWorkbench/Pages/StratificationPage.xaml.cs`
- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml`
- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml.cs`
- `tools/uiregression/check_research_candidate_draft_review_entry.ps1`
- `plan.md`
- `Process.md`
- `process_logs/Process79.md`
- `Plan-total.md`

Verification:

```text
build: 0 warnings / 0 errors
RESEARCH_CANDIDATE_DRAFT_REVIEW_ENTRY=PASS
RESEARCH_CANDIDATE_DRAFT_REVIEW_PACKAGE=PASS
RESEARCH_CANDIDATE_DRAFT_REVIEW_PACKAGE_LIST=PASS
RESEARCH_CANDIDATE_DRAFT_REVIEW_DETAIL_EXPANDED=PASS
RESEARCH_CANDIDATE_DRAFT_REVIEW_FIELD_GROUPS=PASS
RESEARCH_CANDIDATE_DRAFT_ADOPT_PREFLIGHT=PASS
RESEARCH_CANDIDATE_DRAFT_SCHEME_PREVIEW=PASS
RESEARCH_CANDIDATE_DRAFT_SCHEME_LIST=PASS
RESEARCH_CANDIDATE_CONSUMPTION_CHECK=PASS
TARGET_RESULT_OVERLAY_CHECK=PASS
TARGET_RESULT_OVERLAY_SELECTION_LINK=PASS
CANDIDATE_DIFFERENCE_DETAIL_TABLE=PASS
CROSS_CANDIDATE_DIFFERENCE_TABLE=PASS
RESEARCH_CANDIDATE_SCAN_ORDER=PASS
PHYSICAL_SCREENSHOT=PASS
git diff --check: PASS
```

Latest draft scheme files:

```text
D:\CPT-UIQA\app_data\method_lab\draft_scheme\20260630_154609427_LayerSchemeDraft_20260630_154609413_stratification_methodlab-input-cpt09-run-1_ClassificationEvidence.json
D:\CPT-UIQA\app_data\method_lab\draft_scheme\20260630_154615649_ParameterSchemeDraft_20260630_154615641_parameters_methodlab-fixture-input-yingkou-cpt09_ParameterSeries.json
```

Latest screenshot:

```text
D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\physical_screen_1920x1080_20260630_154907.png
```

Closure review:

- Pass.
- The important result is the UIA-visible field contract: `DetailFields=True`, `DifferenceSummary=True`, and `PreflightChecklist=True`.
- The screen capture shows the active parameter workbench; the detail-field proof is UIA-token based because the nested workbench panel is not reliably brought into foreground by the generic screenshot helper.
- Draft Scheme review remains read-only and cannot be mistaken for adopted official results.
- Boundary unchanged: no SQLite schema, formula, algorithm, official/adopted/export behavior changed.

Next step:

```text
GMW-P6A / F12-D：Draft Scheme 对比表与采纳条件合同
```
## GMW-P6A / F12-D Closure - Draft Scheme Compare Table and Adopt Condition Contract

Date: 2026-06-30

Intent:

Move Draft Scheme review from field display to a stable compare/adopt condition contract. The user-facing purpose is still result-first: users should be able to tell what the draft is compared against, what changed, what review steps are required, and whether adoption is currently blocked.

Implemented result:

- Extended `DraftSchemePreviewRow` with read-only compare/adopt contract fields:
  - compare target
  - baseline summary
  - draft summary
  - difference summary
  - required review steps
  - adopt readiness
- Mapped existing blockers into required review steps:
  - `ManualReviewRequired` -> `ManualReview`
  - `OfficialWriteDisabled` -> `EnableOfficialWrite`
  - `ExportDisabled` -> `EnableExportGate`
  - `ReadOnlyDraftPreview` -> `PromoteFromReadOnlyPreview`
  - `ResearchOnly` -> `ConvertResearchOutput`
- Stratification and parameter Draft Scheme detail panels now expose the same contract fields.
- UIA tokens now expose:

```text
CompareContract=True
AdoptConditionContract=True
CompareTarget=
BaselineSummary=
DraftSummary=
DifferenceSummaryLine=
RequiredReviewStepCount=
RequiredReviewSteps=
AdoptReady=False
AdoptReadiness=Blocked
```

- Existing protected boundaries remain:

```text
CanWriteDraft=False
CanAdopt=False
OfficialWrite=False
Adopted=False
Export=False
```

Changed files:

- `OffshoreGeotechWorkbench/Services/DraftSchemePreviewService.cs`
- `OffshoreGeotechWorkbench/Pages/StratificationPage.xaml`
- `OffshoreGeotechWorkbench/Pages/StratificationPage.xaml.cs`
- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml`
- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml.cs`
- `tools/uiregression/check_research_candidate_draft_review_entry.ps1`
- `plan.md`
- `Process.md`
- `process_logs/Process79.md`
- `Plan-total.md`

Verification:

```text
build: 0 warnings / 0 errors
RESEARCH_CANDIDATE_DRAFT_REVIEW_ENTRY=PASS
RESEARCH_CANDIDATE_DRAFT_REVIEW_PACKAGE=PASS
RESEARCH_CANDIDATE_DRAFT_REVIEW_PACKAGE_LIST=PASS
RESEARCH_CANDIDATE_DRAFT_REVIEW_DETAIL_EXPANDED=PASS
RESEARCH_CANDIDATE_DRAFT_REVIEW_FIELD_GROUPS=PASS
RESEARCH_CANDIDATE_DRAFT_ADOPT_PREFLIGHT=PASS
RESEARCH_CANDIDATE_DRAFT_SCHEME_PREVIEW=PASS
RESEARCH_CANDIDATE_DRAFT_SCHEME_LIST=PASS
RESEARCH_CANDIDATE_CONSUMPTION_CHECK=PASS
TARGET_RESULT_OVERLAY_CHECK=PASS
TARGET_RESULT_OVERLAY_SELECTION_LINK=PASS
CANDIDATE_DIFFERENCE_DETAIL_TABLE=PASS
CROSS_CANDIDATE_DIFFERENCE_TABLE=PASS
RESEARCH_CANDIDATE_SCAN_ORDER=PASS
PHYSICAL_SCREENSHOT=PASS
git diff --check: PASS
```

Latest draft scheme files:

```text
D:\CPT-UIQA\app_data\method_lab\draft_scheme\20260630_155841389_LayerSchemeDraft_20260630_155841374_stratification_methodlab-input-cpt09-run-1_ClassificationEvidence.json
D:\CPT-UIQA\app_data\method_lab\draft_scheme\20260630_155847652_ParameterSchemeDraft_20260630_155847644_parameters_methodlab-fixture-input-yingkou-cpt09_ParameterSeries.json
```

Latest screenshot:

```text
D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\physical_screen_1920x1080_20260630_155959.png
```

Closure review:

- Pass.
- The important result is the UIA-visible compare/adopt contract: `CompareContract=True` and `AdoptConditionContract=True`.
- The contract is derived from existing draft/review data and blockers; no new engineering result is fabricated.
- Draft Scheme review remains read-only and cannot be mistaken for adopted official results.
- Boundary unchanged: no SQLite schema, formula, algorithm, official/adopted/export behavior changed.

Next step:

```text
GMW-P6B / F12-E：Draft Scheme 采纳干跑包与审阅记录
```

## 2026-06-30 - GMW-P1H-hotfix 地层常规方法可见性与结果导向修正

Intent:

- Respond to the user's result-first direction.
- Explain and fix why the stratification page looked like it only had a few non-standard methods.
- Keep the work focused on method results and visible capability, not Draft/Adopt or licensing side paths.

Diagnosis:

- Correct UTF-8 reading of `sample_data/method-lab/method-registry.v1.json` shows the registry contains:

```text
methods=13
capabilities=20
strat LayerScheme=5
strat ClassificationEvidence=5
param PhiDeg=2
param SuKpa=2
param Gamma=1
param OCR=1
param Custom=2
```

- The user-facing problem was not the registry count. The stratification page compressed all stratification capabilities into two aggregate rows:

```text
LayerScheme methods
SBT / classification evidence
```

- That made common methods look absent and hid the specific Ic/SBT, engineering grouping, Robertson SBTn, manual/custom template, pyCPT, and Groundhog evidence capabilities.

Changed files:

- `OffshoreGeotechWorkbench/Pages/StratificationPage.xaml.cs`
- `OffshoreGeotechWorkbench/Pages/StratificationPage.xaml`
- `tools/uiregression/check_stratification_workbench_contract.ps1`
- `plan.md`
- `Process.md`
- `process_logs/Process79.md`

Implementation:

- Replaced stratification method capability aggregate rows with one row per registered stratification capability.
- Each row now exposes:
  - output object
  - `Ready` / `Template` / `Blocked` state
  - method name, use level, install/template state
  - required input line
  - stable row AutomationId
- Increased the visible method capability pane height so the list reads as an actual method catalog, not a tiny summary.
- Extended UIA acceptance token with:

```text
VisibleCapabilityRows=10
PycptLayerScheme=1
```

Verification:

```text
build: 0 warnings / 0 errors
STRATIFICATION_WORKBENCH_CONTRACT_CHECK=PASS
STRATIFICATION_METHOD_CAPABILITIES=PASS
STRATIFICATION_METHOD_CAPABILITY_TOKEN=StratificationMethodCapabilities=True;Route=stratification;Registry=cpt-uiqa-method-registry-fixture;MethodNamesNotPrimary=True;CommonStratificationCatalog=True;VisibleCapabilityRows=10;LayerScheme=5;LayerSchemeReady=3;ClassificationEvidence=5;ClassificationEvidenceReady=4;ManualTemplate=1;UserDefinedTemplate=2;RobertsonEvidence=1;PycptLayerScheme=1;OnlyEvidence=5;PreviewCandidateOnly=True;OfficialWrite=False;Adopted=False
git diff --check: PASS
DESKTOP_FULLSCREEN_SCREENSHOT=D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\desktop_fullscreen_20260630_161959.png
```

Closure review:

- Pass.
- The UI now reflects the real stratification method capability count instead of hiding it behind two aggregate rows.
- The change is result-facing and narrow: no schema, formula, algorithm, official/adopted/export, runner, or licensing behavior changed.
- Residual risk: some methods remain template/reference/blocked. That is correct until a real runnable implementation is connected; fake results are explicitly disallowed.

Next step:

```text
GMW-P1I：把常规方法 catalog 从“可见”推进到“当前点位可运行/可预览结果”
```

## 2026-06-30 - GMW-P1I 地层常规方法 catalog 当前点位预览

Intent:

- Continue the result-first method workflow.
- Move stratification method catalog from visible rows to direct current-point result preview.
- Avoid Method Lab, licensing, Draft/Adopt, and fake result side paths.

Changed files:

- `OffshoreGeotechWorkbench/Pages/StratificationPage.xaml.cs`
- `OffshoreGeotechWorkbench/Pages/StratificationPage.xaml`
- `tools/uiregression/check_stratification_workbench_contract.ps1`
- `plan.md`
- `Process.md`
- `process_logs/Process79.md`
- `Plan-total.md`

Implementation:

- `StratificationMethodCapabilityListView` now uses single selection.
- Method capability rows now carry method id, method name, capability id, output object, and preview eligibility.
- Method capability row `ListViewItem` containers now expose stable AutomationId and UIA name.
- Added `StratificationMethodResultPreview` visible status line and UIA token.
- Current-point preview mappings:
  - `builtin-ic-sbt.LayerScheme` -> opens `scheme-current-ic-sbt`
  - `builtin-engineering-grouping.LayerScheme` -> opens `scheme-engineering-review`
  - built-in Ic/SBT or Robertson classification evidence -> uses current SBT evidence panel
  - pyCPT layer/evidence -> uses existing Method Lab evidence / research candidate overlay when real outputs exist
- Template or unavailable methods remain blocked/template; no fake layer or evidence results are generated.

Verification:

```text
build: 0 warnings / 0 errors
STRATIFICATION_WORKBENCH_CONTRACT_CHECK=PASS
STRATIFICATION_METHOD_CAPABILITIES=PASS
STRATIFICATION_METHOD_CAPABILITY_TOKEN=StratificationMethodCapabilities=True;Route=stratification;Registry=cpt-uiqa-method-registry-fixture;MethodNamesNotPrimary=True;CommonStratificationCatalog=True;VisibleCapabilityRows=10;LayerScheme=5;LayerSchemeReady=3;ClassificationEvidence=5;ClassificationEvidenceReady=4;ManualTemplate=1;UserDefinedTemplate=2;RobertsonEvidence=1;PycptLayerScheme=1;OnlyEvidence=5;PreviewCandidateOnly=True;OfficialWrite=False;Adopted=False
StratificationMethodResultPreview=True;SelectedCapability=builtin-ic-sbt.LayerScheme;MethodId=builtin-ic-sbt-first-pass;OutputObjectType=LayerScheme;CanPreview=True;PreviewMode=CurrentLayerScheme;PreviewReason=CurrentIcSbtProjection;SelectedScheme=scheme-current-ic-sbt;CurrentPointOnly=True;OfficialWrite=False;Adopted=False;Export=False
git diff --check: PASS
DESKTOP_FULLSCREEN_SCREENSHOT=D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\desktop_fullscreen_20260630_162935.png
```

Closure review:

- Pass.
- The result-facing behavior is now visible and testable: a method capability row can open a current-point result preview.
- The implementation keeps the generic output-object model and does not hard-code a method-specific page.
- Boundary unchanged: no SQLite schema, formula, algorithm, official/adopted/export, or runner behavior changed.
- Residual risk: parameter page still needs the same preview behavior; tracked as the next slice.

Next step:

```text
GMW-P2F：参数常规方法当前点位预览
```

## 2026-06-30 - GMW-P2F 参数常规方法当前点位预览

Intent:

- Continue result-first method workflow on the parameter page.
- Move parameter method capability rows from selectable slot sync to direct current-point result preview.
- Keep blocked parameters explicit; do not fabricate `Gamma` or `OCR` curves.

Changed files:

- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml.cs`
- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml`
- `tools/uiregression/check_parameter_scheme_workbench_static.ps1`
- `plan.md`
- `Process.md`
- `process_logs/Process79.md`
- `Plan-total.md`

Implementation:

- Added visible `ParameterMethodResultPreview` status line below `PARAMETER METHOD CAPABILITIES`.
- Added parameter preview token generation.
- Preview rules:
  - `PhiDeg` / `SuKpa`: `CanPreview=True` only when existing `ParameterScheme.ResultSeries` or current parameter snapshot has valid points.
  - `Gamma` / `OCR`: blocked with the existing blocking reason.
- No formula, algorithm, schema, official/adopted/export, or runner behavior changed.

Verification:

```text
build: 0 warnings / 0 errors
PARAMETER_SCHEME_MOCK_CHECK=PASS
PARAMETER_NO_OFFICIAL_WRITE=PASS
PARAMETER_SCHEME_WORKBENCH_STATIC_CHECK=PASS
PARAMETER_SCHEME_WORKBENCH_RESULT_FIRST=PASS
PARAMETER_METHOD_CAPABILITIES=PASS
PARAMETER_METHOD_CAPABILITY_SLOT_SYNC=PASS
PARAMETER_GAMMA_BLOCKED_SYNC=PASS
PARAMETER_OCR_BLOCKED_SYNC=PASS
PARAMETER_METHOD_CANDIDATES_FILTERED_BY_SLOT=PASS
PARAMETER_PROJECTION_NO_OFFICIAL_WRITE=PASS
PARAMETER_ALL_SLOTS_FILTERED=PASS
git diff --check: PASS
DESKTOP_FULLSCREEN_SCREENSHOT=D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\desktop_fullscreen_20260630_163649.png
```

Key preview evidence:

```text
ParameterMethodResultPreview=True;Route=parameters;SelectedCapability=PhiDeg;CanPreview=True;PreviewMode=PhiCurve;LayerScheme=scheme-engineering-review;CurrentPointOnly=True;OfficialWrite=False;Adopted=False;Export=False
ParameterMethodResultPreview=True;SelectedCapability=Gamma;CanPreview=False;PreviewMode=Blocked;PreviewReason=Missing project unit-weight rule.;OfficialWrite=False;Adopted=False;Export=False
ParameterMethodResultPreview=True;SelectedCapability=OCR;CanPreview=False;PreviewMode=Blocked;PreviewReason=Bq and OCR calibration are missing.;OfficialWrite=False;Adopted=False;Export=False
```

Closure review:

- Pass.
- Parameter capability selection now directly states whether the current point has a real preview result.
- Blocked slots remain honest and do not generate placeholder curves.
- Boundary unchanged: no SQLite schema, formula, algorithm, official/adopted/export, or runner behavior changed.
- Residual risk: methods still mostly reuse existing projections or Method Lab evidence; next slice should add a protected run/refresh entry for ready capabilities.

Next step:

```text
GMW-P3D：当前点位方法运行入口与结果刷新
```

## 2026-06-30 - GMW-P3D 当前点位方法运行入口与结果刷新

Intent:

- Keep the workflow result-first.
- Add a protected `Run preview` entry where users already inspect method capabilities.
- Refresh only current-point preview results.
- Avoid unrelated licensing, marketplace, installer, schema, formula, or export work.

Changed files:

- `OffshoreGeotechWorkbench/Pages/StratificationPage.xaml`
- `OffshoreGeotechWorkbench/Pages/StratificationPage.xaml.cs`
- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml`
- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml.cs`
- `tools/uiregression/check_stratification_workbench_contract.ps1`
- `tools/uiregression/check_parameter_scheme_workbench_static.ps1`
- `plan.md`
- `Process.md`
- `process_logs/Process79.md`
- `Plan-total.md`

Implementation:

- Stratification `METHOD CAPABILITIES` now includes a compact `Run preview` button and `StratificationMethodPreviewRunState`.
- Parameter `PARAMETER METHOD CAPABILITIES` now includes a compact `Run preview` button and `ParameterMethodPreviewRunState`.
- Ready stratification methods refresh the matching current layer scheme, evidence projection, or research overlay preview.
- Ready parameter methods refresh the matching parameter series projection.
- Blocked or missing-runner methods publish blocked run tokens and do not fabricate visual results.

Key run evidence:

```text
StratificationMethodPreviewRun=True;Route=stratification;SelectedCapability=builtin-ic-sbt.LayerScheme;MethodId=builtin-ic-sbt-first-pass;OutputObjectType=LayerScheme;RunAllowed=True;RunnerKind=LayerSchemeProjection;PreviewRefreshed=True;PreviewMode=CurrentLayerScheme;OfficialWrite=False;Adopted=False;Export=False
ParameterMethodPreviewRun=True;Route=parameters;SelectedCapability=PhiDeg;LayerScheme=scheme-engineering-review;RunAllowed=True;RunnerKind=ParameterSeriesProjection;PreviewRefreshed=True;PreviewMode=PhiCurve;CanRunOfficial=False;OfficialWrite=False;Adopted=False;Export=False
ParameterMethodPreviewRun=True;SelectedCapability=Gamma;RunAllowed=False;RunnerKind=RunnerMissing;PreviewRefreshed=False;PreviewMode=Blocked;PreviewReason=Missing project unit-weight rule.;OfficialWrite=False;Adopted=False;Export=False
```

Verification:

```text
build: 0 warnings / 0 errors
STRATIFICATION_WORKBENCH_CONTRACT_CHECK=PASS
STRATIFICATION_METHOD_CAPABILITIES=PASS
PARAMETER_SCHEME_WORKBENCH_STATIC_CHECK=PASS
PARAMETER_METHOD_CAPABILITIES=PASS
PARAMETER_METHOD_CAPABILITY_SLOT_SYNC=PASS
PARAMETER_GAMMA_BLOCKED_SYNC=PASS
PARAMETER_OCR_BLOCKED_SYNC=PASS
PARAMETER_PROJECTION_NO_OFFICIAL_WRITE=PASS
git diff --check: PASS
DESKTOP_FULLSCREEN_SCREENSHOT=D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\desktop_fullscreen_20260630_164620.png
```

Closure review:

- Pass.
- The implementation directly serves the user purpose: select method, run current-point preview, inspect result.
- UIA checks click the new run controls, not just static labels.
- Blocked methods remain honest and visible.
- Boundary unchanged: no SQLite schema, formula, algorithm, official/adopted/export, or installer/plugin-market behavior changed.
- Residual risk: result readability after run can be stronger; track as the next focused slice instead of widening this one.

Next candidate:

```text
GMW-P3E：方法运行结果可读性增强
```

## 2026-06-30 - GMW-P3E 方法运行结果可读性增强

Intent:

- Continue from P3D without widening scope.
- Make the run-preview result visible in the main result surface, not only in button/status tokens.
- Keep blocked methods honest and make the blocking reason direct.

Changed files:

- `OffshoreGeotechWorkbench/Pages/StratificationPage.xaml.cs`
- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml.cs`
- `tools/uiregression/check_stratification_workbench_contract.ps1`
- `tools/uiregression/check_parameter_scheme_workbench_static.ps1`
- `plan.md`
- `Process.md`
- `process_logs/Process79.md`
- `Plan-total.md`

Implementation:

- Stratification run preview now stores a run visual summary and draws it onto `LayerTrackCanvas`.
- Stratification canvas/UIA exposes `StratificationRunVisualSummary=True`.
- Parameter run preview now stores a run visual summary and draws it onto `ParameterCanvas`.
- Parameter stats/canvas UIA exposes `ParameterRunVisualSummary=True`.
- Parameter blocked methods redraw the canvas with `VisualState=Blocked` and the blocking reason.
- Visual treatment stays VSCode-like: compact status strip, existing accent blue, existing neutral surfaces, no new palette.

Key evidence:

```text
StratificationRunVisualSummary=True;Route=stratification;SelectedCapability=builtin-ic-sbt.LayerScheme;OutputObjectType=LayerScheme;VisualActive=True;RunnerKind=LayerSchemeProjection;PreviewMode=CurrentLayerScheme;SelectedScheme=scheme-current-ic-sbt;OfficialWrite=False;Adopted=False;Export=False
ParameterRunVisualSummary=True;Route=parameters;SelectedCapability=PhiDeg;LayerScheme=scheme-engineering-review;VisualActive=True;VisualState=Refreshed;RunnerKind=ParameterSeriesProjection;PreviewMode=PhiCurve;OfficialWrite=False;Adopted=False;Export=False
ParameterRunVisualSummary=True;SelectedCapability=Gamma;VisualActive=False;VisualState=Blocked;RunnerKind=RunnerMissing;PreviewMode=Blocked;PreviewReason=Missing project unit-weight rule.;OfficialWrite=False;Adopted=False;Export=False
```

Verification:

```text
build: 0 warnings / 0 errors
STRATIFICATION_WORKBENCH_CONTRACT_CHECK=PASS
STRATIFICATION_METHOD_CAPABILITIES=PASS
PARAMETER_SCHEME_WORKBENCH_STATIC_CHECK=PASS
PARAMETER_METHOD_CAPABILITIES=PASS
PARAMETER_METHOD_CAPABILITY_SLOT_SYNC=PASS
PARAMETER_GAMMA_BLOCKED_SYNC=PASS
PARAMETER_OCR_BLOCKED_SYNC=PASS
PARAMETER_PROJECTION_NO_OFFICIAL_WRITE=PASS
git diff --check: PASS
DESKTOP_FULLSCREEN_SCREENSHOT=D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\desktop_fullscreen_20260630_170037.png
```

Closure review:

- Pass.
- The slice directly improves result readability after a preview run.
- The checks now prove both run action and result-surface state.
- Blocked methods remain explicit instead of creating placeholder outputs.
- Boundary unchanged: no SQLite schema, formula, algorithm, official/adopted/export, or external method integration changed.
- Residual risk: selection/list synchronization after a run can still be more coherent; track as the next focused slice.

Next candidate:

```text
GMW-P3F：运行结果与列表/选中对象联动增强
```

## 2026-06-30 - GMW-P3F 运行结果与列表/选中对象联动增强

Intent:

- Continue result-first method workflow.
- Make run summaries, list selection, and selected-object tokens describe the same result.
- Avoid new methods, external integration, schema work, formula work, or official writes.

Changed files:

- `OffshoreGeotechWorkbench/Pages/StratificationPage.xaml.cs`
- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml`
- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml.cs`
- `tools/uiregression/check_stratification_workbench_contract.ps1`
- `tools/uiregression/check_parameter_scheme_workbench_static.ps1`
- `plan.md`
- `Process.md`
- `process_logs/Process79.md`
- `Plan-total.md`

Implementation:

- Stratification run visual summary now carries list/object sync fields:
  - `SelectionSync=True`
  - `SchemeListSynced=True`
  - `LayerListSynced=True`
  - `BoundaryListSynced=True`
  - `SelectedObject=LayerScheme`
  - `SelectedId=scheme-current-ic-sbt`
- Stratification UIA now verifies `SelectedStratificationObjectToken` immediately after run preview.
- Parameter method candidate list now uses single selection instead of display-only rows.
- Parameter candidate list auto-selects the current slot's `SelectedMethodId`.
- Parameter run visual summary now carries:
  - `SelectedSlot`
  - `SelectedMethodId`
  - `SlotListSynced=True`
  - `CapabilitySlotSynced=True`
  - `CandidateListSynced=True`
- Blocked Gamma flow also keeps slot/candidate synchronization explicit.

Key evidence:

```text
StratificationRunVisualSummary=True;SelectionSync=True;SchemeListSynced=True;SelectedObject=LayerScheme;SelectedId=scheme-current-ic-sbt;OfficialWrite=False;Adopted=False;Export=False
ParameterRunVisualSummary=True;SelectedCapability=PhiDeg;SelectedSlot=slot-phi-sand-trial;SelectedMethodId=CPTU-Param-PhiSand-Qtn-Mayne;SlotListSynced=True;CapabilitySlotSynced=True;CandidateListSynced=True;OfficialWrite=False;Adopted=False;Export=False
SelectedParameterSlot:slot-gamma-all-draft;SelectedSlot=slot-gamma-all-draft;SelectedCapability=Gamma;SelectedMethodId=CPTU-Param-Gamma-UnitWeight-ProjectDefault;CandidateListSynced=True;CanRunTrial=False;BlockingReason=Missing project unit-weight rule.;OfficialWrite=False;Adopted=False
```

Verification:

```text
build: 0 warnings / 0 errors
STRATIFICATION_WORKBENCH_CONTRACT_CHECK=PASS
STRATIFICATION_METHOD_CAPABILITIES=PASS
PARAMETER_SCHEME_WORKBENCH_STATIC_CHECK=PASS
PARAMETER_METHOD_CAPABILITIES=PASS
PARAMETER_METHOD_CAPABILITY_SLOT_SYNC=PASS
PARAMETER_GAMMA_BLOCKED_SYNC=PASS
PARAMETER_OCR_BLOCKED_SYNC=PASS
PARAMETER_PROJECTION_NO_OFFICIAL_WRITE=PASS
git diff --check: PASS
DESKTOP_FULLSCREEN_SCREENSHOT=D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\desktop_fullscreen_20260630_171154.png
```

Closure review:

- Pass.
- The slice improves result consumption by making run summary, selected object, slot, and candidate method agree.
- Verification covers both ready and blocked method paths.
- Boundary unchanged: no SQLite schema, formula, algorithm, official/adopted/export, or external method integration changed.
- Residual risk: source/provenance and blocking explanations can still be easier to read; track as the next focused slice.

Next candidate:

```text
GMW-P3G：运行结果来源与阻塞详情的工程化解释增强
```

## 2026-06-30 - GMW-P3G 运行结果来源与阻塞详情的工程化解释增强

Intent:

- Continue result-first method workflow.
- Make run summaries explain where the result comes from and why a method is runnable or blocked.
- Avoid new method integration, schema work, formula work, export work, or official/adopted writes.

Changed files:

- `OffshoreGeotechWorkbench/Pages/StratificationPage.xaml.cs`
- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml.cs`
- `tools/uiregression/check_stratification_workbench_contract.ps1`
- `tools/uiregression/check_parameter_scheme_workbench_static.ps1`
- `plan.md`
- `Process.md`
- `process_logs/Process79.md`
- `Plan-total.md`

Implementation:

- Stratification run summary now exposes:
  - `SourceType`
  - `SourceMethodId`
  - `SourceRunId`
  - `LayerCount`
  - `BoundaryCount`
  - `CoverageStatus`
  - `UnknownLayerCount`
  - `TrialParameterReady`
  - `OfficialParameterReady`
  - `BlockingDetail`
- Parameter run summary now exposes:
  - `ParameterScheme`
  - `SourceLayerScheme`
  - `SourceLayerSchemeStatus`
  - `InputState`
  - `LayerState`
  - `TargetLayerCount`
  - `TargetGroups`
  - `BlockingDetail`
  - `CanRunTrial`
- Visible run labels now include a compact source/status explanation instead of only mode and counts.

Key evidence:

```text
StratificationRunVisualSummary=True;SourceType=current-interpretation-result;SourceMethodId=CPTU-RW-Ic-FirstPass;LayerCount=262;BoundaryCount=263;CoverageStatus=mapped;TrialParameterReady=True;OfficialParameterReady=False;OfficialWrite=False;Adopted=False;Export=False
ParameterRunVisualSummary=True;SelectedCapability=PhiDeg;ParameterScheme=param-scheme-trial-engineering-review;SourceLayerScheme=scheme-engineering-review;InputState=Ok;LayerState=Ok;TargetLayerCount=1;TargetGroups=sand;BlockingDetail=None;CanRunTrial=True;OfficialWrite=False;Adopted=False;Export=False
ParameterRunVisualSummary=True;SelectedCapability=Gamma;InputState=Missing;LayerState=Partial;TargetLayerCount=4;TargetGroups=sand,clay,mixed,unknown;BlockingDetail=Missing project unit-weight rule.;CanRunTrial=False;OfficialWrite=False;Adopted=False;Export=False
```

Verification:

```text
build: 0 warnings / 0 errors
STRATIFICATION_WORKBENCH_CONTRACT_CHECK=PASS
STRATIFICATION_METHOD_CAPABILITIES=PASS
PARAMETER_SCHEME_WORKBENCH_STATIC_CHECK=PASS
PARAMETER_METHOD_CAPABILITIES=PASS
PARAMETER_METHOD_CAPABILITY_SLOT_SYNC=PASS
PARAMETER_GAMMA_BLOCKED_SYNC=PASS
PARAMETER_OCR_BLOCKED_SYNC=PASS
PARAMETER_PROJECTION_NO_OFFICIAL_WRITE=PASS
git diff --check: PASS
DESKTOP_FULLSCREEN_SCREENSHOT=D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\desktop_fullscreen_20260630_172212.png
```

Closure review:

- Pass.
- The slice makes result provenance and blocking causes explicit without changing algorithms or persistence.
- Verification covers ready and blocked parameter paths plus current stratification provenance.
- Boundary unchanged: no SQLite schema, formula, algorithm, official/adopted/export, or external method integration changed.
- Residual risk: visible run labels and earlier status lines may now contain overlapping information; track cleanup as the next focused slice.

Next candidate:

```text
GMW-P3H：方法运行结果说明收敛与冗余清理
```

## 2026-06-30 - GMW-P3H 方法运行结果说明收敛与冗余清理

Intent:

- Keep method result consumption result-first and compact.
- Reduce visible duplicate/long explanatory text added in P3D-P3G.
- Preserve full machine-readable provenance, blocking, sync, and write-boundary details in UIA tokens.
- Avoid new method integration, schema work, formula work, export work, or official/adopted writes.

Changed files:

- `OffshoreGeotechWorkbench/Pages/StratificationPage.xaml.cs`
- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml.cs`
- `tools/uiregression/check_stratification_workbench_contract.ps1`
- `tools/uiregression/check_parameter_scheme_workbench_static.ps1`
- `plan.md`
- `Process.md`
- `process_logs/Process79.md`
- `Plan-total.md`

Implementation:

- Stratification visible preview/run labels now use compact `PREVIEW` / `RUN` summaries.
- Stratification run visual summary keeps layer count, boundary count, and coverage status visible while retaining full source/provenance details in UIA.
- Parameter visible preview/run labels now use compact parameter/count/input/layer status summaries.
- Parameter run visual summary keeps full source, slot, blocking, and protected write-boundary details in UIA.
- Added `VisibleSummaryMode=Compact` to stratification and parameter run visual tokens.
- Parameter UIA verification now explicitly selects `PhiDeg` before Phi assertions, preventing previous manual OCR blocked selection from invalidating result checks.

Key evidence:

```text
StratificationRunVisualSummary=True;VisibleSummaryMode=Compact;SourceType=current-interpretation-result;SourceMethodId=CPTU-RW-Ic-FirstPass;LayerCount=262;BoundaryCount=263;CoverageStatus=mapped;OfficialWrite=False;Adopted=False;Export=False
ParameterRunVisualSummary=True;VisibleSummaryMode=Compact;SelectedCapability=PhiDeg;InputState=Ok;LayerState=Ok;CanRunTrial=True;OfficialWrite=False;Adopted=False;Export=False
ParameterRunVisualSummary=True;VisibleSummaryMode=Compact;SelectedCapability=Gamma;InputState=Missing;LayerState=Partial;BlockingDetail=Missing project unit-weight rule.;CanRunTrial=False;OfficialWrite=False;Adopted=False;Export=False
```

Verification:

```text
build: 0 warnings / 0 errors
STRATIFICATION_WORKBENCH_CONTRACT_CHECK=PASS
STRATIFICATION_METHOD_CAPABILITIES=PASS
PARAMETER_SCHEME_WORKBENCH_STATIC_CHECK=PASS
PARAMETER_METHOD_CAPABILITIES=PASS
PARAMETER_METHOD_CAPABILITY_SLOT_SYNC=PASS
PARAMETER_GAMMA_BLOCKED_SYNC=PASS
PARAMETER_OCR_BLOCKED_SYNC=PASS
PARAMETER_PROJECTION_NO_OFFICIAL_WRITE=PASS
DESKTOP_FULLSCREEN_SCREENSHOT=D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\desktop_fullscreen_20260630_173255.png
```

Closure review:

- Pass.
- The visible UI is shorter and more result-focused while full traceability remains available to automated checks.
- Verification covers current stratification provenance, ready parameter path, Gamma blocked path, and OCR blocked path.
- Boundary unchanged: no SQLite schema, formula, algorithm, official/adopted/export, or external method package changed.
- Residual risk: the next useful check is whether the result-consumption evidence remains stable for arbitrary current points and not just the current CPT09 verification path.

Next candidate:

```text
GMW-P3I: 方法结果消费验收收尾与通用点位检查
```

## 2026-06-30 - GMW-P3I 方法结果消费验收收尾与通用点位检查

Intent:

- Keep method-result consumption tied to the actual current point.
- Make point context explicit in result tokens instead of assuming CPT09 or hiding fixture/projection origin.
- Cover ready, blocked, and missing-runner result paths without adding panels or changing algorithms.

Changed files:

- `OffshoreGeotechWorkbench/Pages/StratificationPage.xaml.cs`
- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml.cs`
- `tools/uiregression/check_stratification_workbench_contract.ps1`
- `tools/uiregression/check_parameter_scheme_workbench_static.ps1`
- `plan.md`
- `Process.md`
- `process_logs/Process79.md`
- `Plan-total.md`

Implementation:

- Stratification result-preview and run-visual tokens now expose `CurrentPointId`, `CurrentPointName`, `ProjectionPointId`, and `PointContextMatch`.
- Parameter result-preview and run-visual tokens now expose `CurrentPointId`, `CurrentPointName`, `ProjectionPointId`, `ProjectionPointName`, `PointContextChecked`, and `PointContextMatch`.
- UIA scripts verify non-empty point fields and keep ready Phi, Gamma blocked/missing runner, and OCR blocked checks active.
- Visible UI remains compact; no new workbench panels or controls were added.

Key evidence:

```text
StratificationRunVisualSummary=True;CurrentPointId=<non-empty>;CurrentPointName=<non-empty>;ProjectionPointId=<non-empty>;PointContextMatch=True;VisibleSummaryMode=Compact;OfficialWrite=False;Adopted=False;Export=False
ParameterRunVisualSummary=True;CurrentPointId=default-yingkou-cpt19;CurrentPointName=CPT19;ProjectionPointId=CPT09;ProjectionPointName=CPT09;PointContextChecked=True;PointContextMatch=False;VisibleSummaryMode=Compact;OfficialWrite=False;Adopted=False;Export=False
```

Verification:

```text
build: 0 warnings / 0 errors
STRATIFICATION_WORKBENCH_CONTRACT_CHECK=PASS
STRATIFICATION_METHOD_CAPABILITIES=PASS
PARAMETER_SCHEME_WORKBENCH_STATIC_CHECK=PASS
PARAMETER_METHOD_CAPABILITIES=PASS
PARAMETER_METHOD_CAPABILITY_SLOT_SYNC=PASS
PARAMETER_GAMMA_BLOCKED_SYNC=PASS
PARAMETER_OCR_BLOCKED_SYNC=PASS
PARAMETER_PROJECTION_NO_OFFICIAL_WRITE=PASS
git diff --check: PASS before process docs
DESKTOP_FULLSCREEN_SCREENSHOT=D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\desktop_fullscreen_20260630_174545.png
```

Closure review:

- Pass for P3I.
- The slice does not solve dynamic parameter projection, but it proves and exposes the mismatch instead of hiding it.
- Current stratification projection is bound to the current point.
- Current parameter page still consumes a CPT09 projection bundle while the active point is CPT19; this is a real next-step product gap.
- Boundary unchanged: no SQLite schema, formula, algorithm, official/adopted/export, or external method package changed.

Next candidate:

```text
GMW-P3J: 参数方案投影按当前点位生成/读取
```

## 2026-06-30 - GMW-P3J 参数方案投影按当前点位生成/读取

Intent:

- Remove the CPT09 fixture binding exposed by P3I.
- Make ParameterScheme projection follow the currently selected/current parameter point.
- Preserve formulas, schema, and official/adopted/export boundaries.

Changed files:

- `OffshoreGeotechWorkbench/Services/ParameterSchemeProjectionReadService.cs`
- `OffshoreGeotechWorkbench/Services/StratificationProjectionReadService.cs`
- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml.cs`
- `tools/uiregression/check_parameter_scheme_workbench_static.ps1`
- `plan.md`
- `Process.md`
- `process_logs/Process79.md`
- `Plan-total.md`

Implementation:

- Added `ParameterSchemeProjectionReadService.ReadBundle(selectedTestPointId)`.
- Added `StratificationProjectionReadService.ReadBundle(selectedTestPointId)`.
- `InterpretationPage` now passes `_parameterSnapshot?.TestPointId` into parameter projection reading.
- Runtime ParameterScheme projection reuses method catalog/slot templates but replaces point context, source layer schemes, parameter series, and layer statistics with current-point data.
- Runtime ParameterSeries uses sampled display points, capped at 600 per parameter, to avoid Canvas/UIA overload.
- Layer statistics continue to use full current-point parameter snapshot rows.
- Parameter UIA now requires `PointContextMatch=True`.

Key evidence:

```text
ParameterRunVisualSummary=True;CurrentPointId=default-yingkou-cpt19;CurrentPointName=CPT19;ProjectionPointId=default-yingkou-cpt19;ProjectionPointName=CPT19;PointContextChecked=True;PointContextMatch=True;VisibleSummaryMode=Compact;OfficialWrite=False;Adopted=False;Export=False
```

Verification:

```text
build: 0 warnings / 0 errors
PARAMETER_SCHEME_WORKBENCH_STATIC_CHECK=PASS
PARAMETER_METHOD_CAPABILITIES=PASS
PARAMETER_METHOD_CAPABILITY_SLOT_SYNC=PASS
PARAMETER_GAMMA_BLOCKED_SYNC=PASS
PARAMETER_OCR_BLOCKED_SYNC=PASS
PARAMETER_PROJECTION_NO_OFFICIAL_WRITE=PASS
STRATIFICATION_WORKBENCH_CONTRACT_CHECK=PASS
STRATIFICATION_METHOD_CAPABILITIES=PASS
git diff --check=PASS
DESKTOP_FULLSCREEN_SCREENSHOT=D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\desktop_fullscreen_20260630_180347.png
```

Closure review:

- Pass for P3J.
- The previous mismatch `CurrentPointId=default-yingkou-cpt19` / `ProjectionPointId=CPT09` is removed.
- Result consumption still uses the existing method catalog/slot template; no new method package or algorithm was introduced.
- Verification covers ready, blocked, missing-runner, no-official-write, and stratification regression.
- Residual risk: parameter UIA remains relatively slow because the page is data-heavy; next useful work is performance/regression tightening, not new feature expansion.

Next candidate:

```text
GMW-P3K: 动态参数 projection 性能与通用点位回归收尾
```

## 2026-06-30 - GMW-P3K 动态参数 projection 性能与通用点位回归收尾

Intent:

- Make the dynamic parameter projection evidence explicit and lightweight.
- Prevent the ParameterCanvas/UIA path from being overloaded by thousands of runtime series points.
- Keep formulas, schema, and official/adopted/export boundaries unchanged.

Changed files:

- `OffshoreGeotechWorkbench/Services/ParameterSchemeProjectionReadService.cs`
- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml.cs`
- `tools/uiregression/check_parameter_scheme_workbench_static.ps1`
- `plan.md`
- `Process.md`
- `process_logs/Process79.md`
- `Plan-total.md`

Implementation:

- Reduced runtime ParameterSeries display cap from 600 to `240` points per parameter.
- Exposed `RuntimeProjection=True`, `ProjectionSourceKind=current-parameter-projection`, and `SeriesPointCap=240` in parameter result tokens.
- Added UIA assertions that `ResultCount <= SeriesPointCap`.
- Kept layer statistics backed by the full current-point snapshot rows.
- Kept ready Phi, Gamma blocked/missing runner, OCR blocked, and no-official-write checks active.

Key evidence:

```text
ParameterRunVisualSummary=True;PointContextMatch=True;RuntimeProjection=True;ProjectionSourceKind=current-parameter-projection;SeriesPointCap=240;VisibleSummaryMode=Compact;OfficialWrite=False;Adopted=False;Export=False
```

Verification:

```text
build: 0 warnings / 0 errors
PARAMETER_SCHEME_WORKBENCH_STATIC_CHECK=PASS
PARAMETER_METHOD_CAPABILITIES=PASS
PARAMETER_METHOD_CAPABILITY_SLOT_SYNC=PASS
PARAMETER_GAMMA_BLOCKED_SYNC=PASS
PARAMETER_OCR_BLOCKED_SYNC=PASS
PARAMETER_PROJECTION_NO_OFFICIAL_WRITE=PASS
PARAMETER_UIA_SECONDS=54.2
STRATIFICATION_WORKBENCH_CONTRACT_CHECK=PASS
STRATIFICATION_METHOD_CAPABILITIES=PASS
git diff --check=PASS
DESKTOP_FULLSCREEN_SCREENSHOT=D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\desktop_fullscreen_20260630_181353.png
```

Closure review:

- Pass for P3K.
- Runtime projection is now explicit and capped in machine-verifiable tokens.
- Full parameter UIA remains slower than ideal but no longer hangs; next value is a lightweight non-UI/short-UI regression entry.
- Boundary unchanged: no SQLite schema, formula, algorithm, official/adopted/export, or external method package changed.

Next candidate:

```text
GMW-P3L: 参数 projection 快速多点位回归脚本
```
## 2026-06-30 - GMW-P3L 参数 projection 快速多点位回归脚本

Intent:

- Add a fast, non-UI regression entry for dynamic ParameterScheme projection.
- Verify default and explicit point contexts without relying on the current desktop state.
- Keep the result boundary protected: no official/adopted/export write and no algorithm/schema/UI change.

Changed files:

- `tools/parameter-projection-check/ParameterProjectionCheck.csproj`
- `tools/parameter-projection-check/Program.cs`
- `tools/local-qa/run-local-quality-gate.ps1`
- `plan.md`
- `Process.md`
- `process_logs/Process79.md`
- `Plan-total.md`

Implementation:

- Added an isolated console check under `tools/parameter-projection-check`.
- The check creates a temporary `app_data` root, imports Yingkou sample data, runs first-pass interpretation for `CPT09` and `CPT19`, then reads:
  - default parameter projection
  - explicit `CPT09` parameter projection
  - explicit `CPT19` parameter projection
- The check asserts runtime projection source, projection-only state, explicit point matching, distinct point-context coverage, result series cap, current-snapshot provenance, and no saved parameter run writes.
- Added the check to local QA as `parameter-projection-check`.

Key evidence:

```text
PARAMETER_PROJECTION_FAST_CHECK=PASS
PARAMETER_PROJECTION_CURRENT_POINT=PASS
PARAMETER_PROJECTION_EXPLICIT_POINTS=PASS
PARAMETER_PROJECTION_RUNTIME=PASS
PARAMETER_PROJECTION_SERIES_CAP=PASS
PARAMETER_PROJECTION_NO_OFFICIAL_WRITE=PASS
PARAMETER_PROJECTION_POINTS_CHECKED=CPT09,CPT09,CPT19
PARAMETER_PROJECTION_SERIES_CAP_VALUE=240
```

Verification:

```text
dotnet run --project .\tools\parameter-projection-check\ParameterProjectionCheck.csproj: PASS
dotnet run --project .\tools\parameter-projection-check\ParameterProjectionCheck.csproj --no-restore: PASS
build .\OffshoreGeotechWorkbench\OffshoreGeotechWorkbench.csproj --no-restore: 0 warnings / 0 errors
```

Closure review:

- Pass for P3L.
- The new check is faster than full UIA and directly covers the regression that previously caused CPT09 fixture leakage.
- The tool runs in isolated temp data and does not pollute the user's active `app_data`.
- Boundary unchanged: no SQLite schema, formula, algorithm, UI, official/adopted/export, or external method package changed.
- Residual risk: local QA now has overlapping parameter checks; the next useful result-first slice is to merge or slim duplicate checks without reducing evidence.

Next candidate:

```text
GMW-P3M: 结果消费质量门瘦身与重复检查合并
```
## 2026-06-30 - GMW-P3M 结果消费质量门瘦身与重复检查合并

Intent:

- Reduce duplicate parameter result-consumption QA without weakening evidence.
- Keep one UIA pass responsible for both ParameterScheme workbench behavior and parameter result visualization evidence.
- Preserve formulas, schema, UI behavior, and official/adopted/export boundaries.

Changed files:

- `tools/uiregression/check_parameter_scheme_workbench_static.ps1`
- `tools/local-qa/run-local-quality-gate.ps1`
- `plan.md`
- `Process.md`
- `process_logs/Process79.md`
- `Plan-total.md`

Implementation:

- Merged key checks from `check_parameter_result_visualization.ps1` into `check_parameter_scheme_workbench_static.ps1`:
  - visual layer background / invalid interval / series source tokens
  - fixture counts for series, invalid intervals, layer statistics, and blockings
  - UIA checks for `ParameterLayerStatisticTable`, `ParameterInputBlockingList`, and `ParameterProvenanceToken`
  - output markers for result visualization, layer statistics, input blockings, and provenance
- Updated local QA so `parameter-scheme-workbench-static-check` expects the merged visualization markers.
- Kept the standalone visualization script in the repo, but local QA records `parameter-result-visualization-check` as merged/skipped instead of reopening the same workbench.
- Fixed local QA PowerShell parsing by replacing the multiline `-and` condition for real-point runner availability with a single boolean variable.

Key evidence:

```text
PARAMETER_SCHEME_WORKBENCH_STATIC_CHECK=PASS
PARAMETER_RESULT_VISUALIZATION_CHECK=PASS
PARAMETER_RESULT_INVALID_INTERVALS=PASS
PARAMETER_LAYER_STATISTICS_VISIBLE=PASS
PARAMETER_INPUT_BLOCKINGS_VISIBLE=PASS
PARAMETER_METHOD_PROVENANCE_VISIBLE=PASS
PARAMETER_PROJECTION_NO_OFFICIAL_WRITE=PASS
PARAMETER_PROJECTION_FAST_CHECK=PASS
LOCAL_QA_PARSE=PASS
```

Verification:

```text
powershell -File .\tools\uiregression\check_parameter_scheme_workbench_static.ps1: PASS
dotnet run --project .\tools\parameter-projection-check\ParameterProjectionCheck.csproj --no-restore: PASS
run-local-quality-gate.ps1 parser check: LOCAL_QA_PARSE=PASS
build .\OffshoreGeotechWorkbench\OffshoreGeotechWorkbench.csproj --no-restore: 0 warnings / 0 errors
```

Closure review:

- Pass for P3M.
- The merged check still proves the visual result details that the old standalone visualization step covered.
- Local QA no longer spends a second UIA pass reopening the same parameter workbench for those assertions.
- Boundary unchanged: no SQLite schema, formula, algorithm, product UI, official/adopted/export, or external method package changed.
- Residual risk: full local QA runtime is still broad because many unrelated workflow checks remain; next useful work is output/timing summary, not another UI behavior change.

Next candidate:

```text
GMW-P3N: QA 结果摘要与耗时证据
```
## 2026-06-30 - GMW-P3N QA 结果摘要与耗时证据

Intent:

- Make local QA output easier to consume by exposing timing and result-consumption summary fields.
- Make early-stop runs explicit about parameter result checks that were not reached.
- Keep QA failure semantics and product behavior unchanged.

Changed files:

- `tools/local-qa/run-local-quality-gate.ps1`
- `plan.md`
- `Process.md`
- `process_logs/Process79.md`
- `Plan-total.md`

Implementation:

- Added `elapsedMilliseconds` to every local QA step result.
- `Invoke-ExternalStep` now writes `LOCAL_QA_STEP_<name>_MS=<elapsed>`.
- `result.json` now includes:
  - `elapsedMilliseconds`
  - `parameterResultConsumption`
  - `parameterResultConsumption.steps`
  - `parameterResultConsumption.mergedSkips`
  - `slowestSteps`
- `summary.md` now includes:
  - total elapsed seconds
  - `Parameter Result Consumption`
  - `Merged Skips`
  - `Slowest Steps`
  - per-step `ElapsedMs`
- Parameter result checks are listed as `NOT_REACHED` when local QA stops before that section.

Key evidence:

```text
LOCAL_QA_PARSE=PASS
LOCAL_QA_SUMMARY_SOURCE_CHECK=PASS
LOCAL_QA_ELAPSED_MS=25326
LOCAL_QA_PARAMETER_RESULT_STEPS=3
```

Verification:

```text
run-local-quality-gate.ps1 parser check: LOCAL_QA_PARSE=PASS
local QA summary source check: LOCAL_QA_SUMMARY_SOURCE_CHECK=PASS
parameter-projection-check --no-restore: PASS
short local QA generated result/summary with elapsedMilliseconds, Parameter Result Consumption, Slowest Steps, and NOT_REACHED parameter rows.
short local QA result: FAIL at existing method-lab-visual-runtime-check before reaching parameter checks.
build .\OffshoreGeotechWorkbench\OffshoreGeotechWorkbench.csproj --no-restore: 0 warnings / 0 errors
git diff --check -- tools/local-qa/run-local-quality-gate.ps1: PASS
```

Closure review:

- Pass for P3N.
- The output contract now makes timing and early-stop state visible instead of forcing log spelunking.
- The short local QA failure is useful evidence for the next slice and is not caused by the P3N summary change.
- Boundary unchanged: no SQLite schema, formula, algorithm, product UI, official/adopted/export, or external method package changed.

Next candidate:

```text
GMW-P3O: Method Lab visual runtime check 恢复
```
## 2026-06-30 - GMW-P3O Method Lab visual runtime check 恢复

Intent:

- Recover the Method Lab visual runtime check that failed in shortened local QA with missing `MethodLabRegistryToken`.
- Keep the fix scoped to QA navigation/token stability.
- Do not change Method Lab product behavior or method/result semantics.

Changed files:

- `tools/uiregression/check_method_lab_visual_runtime.ps1`
- `plan.md`
- `Process.md`
- `process_logs/Process79.md`
- `Plan-total.md`

Implementation:

- Added `Wait-Required` to poll for target AutomationIds after opening Method Lab.
- Replaced immediate `Get-Required` calls with waits for:
  - `WorkbenchDocumentTab_MethodLab`
  - `MethodLabVisualPreviewStatusText`
  - `MethodLabRegistryToken`
  - `MethodLabCapabilitySummaryText`
  - `MethodLabGroundhogProfilePreview`
  - `MethodLabPycptLayerPreview`
  - `GroundhogVisualCaption`
  - `PycptVisualCaption`

Key evidence:

```text
METHOD_LAB_VISUAL_RUNTIME_PARSE=PASS
METHOD_LAB_VISUAL_RUNTIME_CHECK=PASS
METHOD_LAB_VISUAL_RUNTIME_COUNTS=GroundhogTracks:3;PycptLayers:44
METHOD_LAB_VISUAL_RUNTIME_REGISTRY=PASS
METHOD_LAB_RESULT_OBJECT_CAPABILITIES=PASS
```

Verification:

```text
powershell -File .\tools\uiregression\check_method_lab_visual_runtime.ps1: PASS
short local QA evidence log:
  method-lab-visual-runtime-check.log contains METHOD_LAB_VISUAL_RUNTIME_CHECK=PASS and METHOD_LAB_VISUAL_RUNTIME_REGISTRY=PASS
  parameter-projection-check.log contains PARAMETER_PROJECTION_FAST_CHECK=PASS
  workbench-density-polish-check.log contains WORKBENCH_DENSITY_POLISH_CHECK=PASS
short local QA outer command timed out after later checks, so no final summary was produced.
build .\OffshoreGeotechWorkbench\OffshoreGeotechWorkbench.csproj --no-restore: 0 warnings / 0 errors
git diff --check -- tools/uiregression/check_method_lab_visual_runtime.ps1: PASS
```

Closure review:

- Pass for P3O.
- The previous missing `MethodLabRegistryToken` failure is resolved by waiting for the Method Lab UIA tree to settle.
- The shortened local QA run moved beyond Method Lab visual runtime and into later QA checks.
- Boundary unchanged: no SQLite schema, formula, algorithm, product UI, official/adopted/export, or external method package changed.
- Residual risk: shortened local QA still exceeded the outer 6-minute command timeout after later checks. This is a downstream QA runtime issue, not the restored Method Lab visual runtime failure.

Next candidate:

```text
GMW-P3P: 缩短版 local QA 后续超时定位
```
## 2026-06-30 - GMW-P3P 缩短版 local QA 后续超时定位

Intent:

- Prevent local QA from being killed only by an outer command timeout when a downstream UIA step hangs.
- Make step-level timeouts visible in logs, `result.json`, and `summary.md`.
- Preserve QA coverage and product behavior.

Changed files:

- `tools/local-qa/run-local-quality-gate.ps1`
- `plan.md`
- `Process.md`
- `process_logs/Process79.md`
- `Plan-total.md`

Implementation:

- Added `-StepTimeoutSeconds` to `run-local-quality-gate.ps1`; default is `240`.
- `Invoke-ExternalStep` now runs external tools through `Start-Process` with redirected stdout/stderr.
- Each step uses `WaitForExit(timeout)`.
- On timeout:
  - the step process is killed best-effort
  - the step log includes `LOCAL_QA_STEP_TIMEOUT=True`
  - the step result is `FAIL`
  - message is `timeout after <n> seconds`
  - exitCode is `-1`
  - local QA still writes `result.json` and `summary.md`
- Normalized empty `Process.ExitCode` to `0` so successful marker-only scripts are not misclassified.

Key evidence:

```text
LOCAL_QA_PARSE=PASS
LOCAL_QA_TIMEOUT_SOURCE_CHECK=PASS
LOCAL_QA_STEP_TIMEOUT=True;Step=stratification-workbench-contract-check;TimeoutSeconds=1
LOCAL_QA_RESULT_JSON=D:\CPT-UIQA\app_data\temp\local-qa\20260630_185924\result.json
LOCAL_QA_SUMMARY_MD=D:\CPT-UIQA\app_data\temp\local-qa\20260630_185924\summary.md
```

Verification:

```text
run-local-quality-gate.ps1 parser check: PASS
source token check for timeout fields: PASS
forced timeout command:
  powershell -File .\tools\local-qa\run-local-quality-gate.ps1 -SkipBuild -SkipLegacyChecks -SkipFirstUserFlow -SkipGitDiffCheck -StepTimeoutSeconds 1
forced timeout result:
  workbench-contract-check=PASS
  stratification-workbench-contract-check=FAIL
  message=timeout after 1 seconds
  summary/result generated
build .\OffshoreGeotechWorkbench\OffshoreGeotechWorkbench.csproj --no-restore: 0 warnings / 0 errors
git diff --check -- tools/local-qa/run-local-quality-gate.ps1: PASS
```

Closure review:

- Pass for P3P.
- The QA runner now fails closed with evidence when a downstream step exceeds its budget.
- This directly addresses the previous no-summary outer timeout failure mode.
- Boundary unchanged: no SQLite schema, formula, algorithm, product UI, official/adopted/export, or external method package changed.
- Residual risk: the actual downstream long-running QA step still needs a bounded rerun to identify the real bottleneck using the new summary output.

Next candidate:

```text
GMW-P3Q: 缩短版 local QA 完整链路限时复跑
```

## 2026-06-30 - Multi-Agent Loop Adoption / GMW-P3Q 启动治理记录

Intent:

- 按用户最新要求，把后续固定多 agent 循环治理规则落地到项目文档。
- 将当前 active slice 从已完成的 `GMW-P3P` 切换为诊断型 `GMW-P3Q：缩短版 local QA 完整链路限时复跑`。
- 本次只改治理和计划文档，不改产品代码，不运行产品 UI。

Changed files:

- `AGENTS.md`
- `plan.md`
- `Process.md`
- `process_logs/Process79.md`
- `Plan-total.md`

Three explorer/reviewer conclusion summaries:

- Planning explorer：当前下一步不应继续把 `GMW-P3P` 写成 completed 队列；应把 `GMW-P3Q` 作为 active diagnostic slice，目标是用 P3P 已提供的 step timeout、summary/result 和 slowest steps 证据复跑缩短版 local QA。
- Engineering critique reviewer：后续 closure 必须显式写出唯一 slice owner 和唯一 integration owner；review findings 必须分为 `blocking` / `risk` / `nit`；review pass 必须引用命令 token、summary/result、日志路径、截图或文件检查证据，不能口头 pass。
- UI 中文用户挑刺 reviewer：后续 UI/结果消费相关 slice 必须用中文真实工程用户视角挑刺；如果默认路径不直接、页面冗余、看起来不像工程软件、结果不能直接用于判断，必须标 `blocking` 或至少 `risk`，不能只从实现者角度说“已完成”。

GMW-P3Q startup checklist:

- Active slice：`GMW-P3Q：缩短版 local QA 完整链路限时复跑`。
- Slice owner：Planning agent。
- Integration owner：主线协调/集成 owner。Code-only agent 只执行 handoff 和记录证据；最终 `pass` / `risk close` / `blocked` 必须由主线协调/集成 owner 在两个 review agent 证据之后裁定，且不得覆盖任何未解决的 `blocking` finding。
- Scope：复跑缩短版 local QA，收集 `result.json`、`summary.md`、timeout marker、slowest steps 和失败 step。
- Non-goals：不改产品代码、UI、schema、公式、导出、方法 registry，不新增 QA 覆盖。
- Suggested command:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\local-qa\run-local-quality-gate.ps1 -SkipBuild -SkipLegacyChecks -SkipFirstUserFlow -SkipGitDiffCheck -StepTimeoutSeconds 240
```

Diagnostic note:

- `-SkipGitDiffCheck` is intentional for this bounded rerun because current governance docs are dirty; this command diagnoses downstream QA timeout/slow steps and does not replace final clean QA.

- Acceptance evidence:

```text
LOCAL_QA_RESULT=PASS
LOCAL_QA_RESULT_JSON=<path>
LOCAL_QA_SUMMARY_MD=<path>
```

or controlled failure evidence:

```text
LOCAL_QA_RESULT=FAIL
LOCAL_QA_RESULT_JSON=<path>
LOCAL_QA_SUMMARY_MD=<path>
LOCAL_QA_STEP_TIMEOUT=True;Step=<step>;TimeoutSeconds=<n>
Slowest Steps=<present>
```

Closure gate:

- Engineering critique findings recorded with severity.
- UI 中文用户挑刺 conclusion recorded in Chinese.
- 主线协调/集成 owner records `pass` / `risk close` / `blocked` after both review agents provide evidence, and cannot override unresolved `blocking` findings.
- `Process.md` and `process_logs/Process79.md` updated.
- `git diff --check -- AGENTS.md plan.md Process.md process_logs/Process79.md Plan-total.md` passes.

## 2026-06-30 - Governance Patch Review Fix

Intent:

- 修复复查发现的治理补丁问题，不改产品代码，不运行产品 UI。
- 消除 Code-only agent 与 integration owner 的角色冲突。
- 让 `process_logs/Process79.md` 进入可审查 diff 覆盖。
- 避免 P3Q 诊断 QA 被当前治理文档 dirty diff 截断。

Fixes:

- `plan.md` 和本日志均改为：Code-only agent 只执行 handoff；最终 `pass` / `risk close` / `blocked` 由主线协调/集成 owner 在 Engineering critique 与 UI 中文用户挑刺证据之后裁定，且不得覆盖 unresolved `blocking`。
- P3Q 建议命令增加 `-SkipGitDiffCheck`，并注明这是限时复跑诊断，不替代最终 clean QA。
- `Plan-total.md` 补充 UI 中文用户挑刺的 blocking/risk 细则。
- `Process.md` 顶部 current override 记录本轮复查修复。
- `process_logs/Process79.md` 通过 `git add -N process_logs/Process79.md` 纳入可审查 diff，不提交 commit。

Verification planned:

```powershell
git diff --check -- AGENTS.md plan.md Process.md Plan-total.md
git diff --check -- process_logs/Process79.md
git status --short -- AGENTS.md plan.md Process.md process_logs/Process79.md Plan-total.md
```

Verification executed:

```text
git add -N process_logs/Process79.md: done, no commit created
git diff --check -- AGENTS.md plan.md Process.md Plan-total.md: PASS
git diff --check -- process_logs/Process79.md: PASS
git status --short -- AGENTS.md plan.md Process.md process_logs/Process79.md Plan-total.md:
  M AGENTS.md
  M Plan-total.md
  M Process.md
  M plan.md
  A process_logs/Process79.md
```

Notes:

- `A process_logs/Process79.md` is intent-to-add coverage for review; no commit was created.
- Git emitted LF/CRLF warnings only, with no whitespace errors.

## 2026-06-30 - R0-A Plan-total 存档与重置

Intent:

- 执行用户最新要求：将旧 `Plan-total.md` 原样存档，然后删除旧总计划正文，重置为新的重建路线图。
- 将当前路线从旧 GMW/P3Q 队列切换到 R0-R5 重建路线。
- 把当前 APP 的问题基线明确写入总路线：视觉丑、布局乱、功能不清楚、入口不闭环、旧计划不可指导。
- 本次只做文档治理，不改产品代码、UI、schema、公式、算法、导出、方法 registry 或 QA 脚本。

Files changed:

- `docs/archive/Plan-total-archive-20260630-before-reset.md`
- `Plan-total.md`
- `plan.md`
- `Process.md`
- `process_logs/Process79.md`

Implementation record:

- 已创建 `docs/archive`。
- 已在改写前复制旧 `Plan-total.md` 到 `docs/archive/Plan-total-archive-20260630-before-reset.md`。
- `Plan-total.md` 已重置为 `# Plan-total：OffshoreGeotechWorkbench 重建路线图`，只保留未来 R0-R5 重建路线。
- `plan.md` 已切换为当前 active slice：`R0-A：Plan-total 存档与重置`。
- `Process.md` 顶部已新增 `R0-A Plan-total Reset` current override。
- 本日志保留历史记录，并追加本次 R0-A 执行记录。

Verification planned:

```powershell
git diff --check -- Plan-total.md plan.md Process.md AGENTS.md
git diff --check -- docs/archive/Plan-total-archive-20260630-before-reset.md process_logs/Process79.md
git status --short -- Plan-total.md plan.md Process.md process_logs/Process79.md docs/archive/Plan-total-archive-20260630-before-reset.md AGENTS.md
```

Verification executed:

```text
git add -N docs/archive/Plan-total-archive-20260630-before-reset.md process_logs/Process79.md: done, no commit created
archive size: 47788 bytes
git diff --check -- Plan-total.md plan.md Process.md AGENTS.md: PASS, LF/CRLF warnings only
git diff --check -- docs/archive/Plan-total-archive-20260630-before-reset.md process_logs/Process79.md: PASS, LF/CRLF warnings only
git status --short -- Plan-total.md plan.md Process.md process_logs/Process79.md docs/archive/Plan-total-archive-20260630-before-reset.md AGENTS.md:
  M AGENTS.md
  M Plan-total.md
  M Process.md
  A docs/archive/Plan-total-archive-20260630-before-reset.md
  M plan.md
  A process_logs/Process79.md
```

Note:

- `AGENTS.md` was read for constraints and appears modified in the pre-existing worktree status; this R0-A Code-only patch did not edit it.
- `A` entries are intent-to-add / review coverage state. No commit was created.

Review待执行:

- Engineering critique agent：待审查归档路径、旧计划原样保留、R0-R5 路线覆盖、授权文件边界、`git diff --check` 证据。
- UI 中文用户挑刺 agent：待用中文审查新路线图是否真正把“丑、乱、功能不清楚”转成 R1-A 以后可执行的 UI 重建要求；本 R0-A 不做实际 UI 截图验收。
- Integration owner：待 review evidence 后裁定 `pass` / `risk close` / `blocked`，Code-only agent 不直接裁定最终关闭。

Residual risk:

## 2026-06-30 - R0-A Review Risk Fix

Intent:

- 修复 R0-A review 后的两个 `risk` finding；两个 reviewer 均无 `blocking`。
- 只做最小文档补丁，不改产品代码、UI、schema、公式、算法、导出、方法 registry 或 QA 脚本。

Reviewer findings:

- Engineering critique：`risk`。R1/R1-A 的 VSCode-like 红线不够硬，后续仍可能被实现成顶部 banner、大圆角卡片容器或卡片 demo；`Process.md` 中多个旧 `Current Override` 容易被误读为当前 active。
- UI 中文用户挑刺：`risk`。路线图虽然承认“丑、乱、功能不清楚”，但需要更硬的默认页判定规则；如果默认页不先给工程结论、入口不能闭环、旧 `测试解译` 命名继续暴露，后续仍会让工程用户困惑。

Fixes:

- `Plan-total.md` 的 R1 增加硬红线：禁止顶部产品 banner、禁止中央大圆角卡片容器、要求深色 Activity Bar、浅色 Explorer、Editor Tabs、Right Side Panel、Bottom Panel、蓝色 Status Bar、Explorer 与 Tab / Status Bar 同步。
- `Plan-total.md` 明确：截图第一眼不像 VSCode-like、页面像 demo、卡片堆叠、默认页不先给工程结论，均按 `blocking` 处理。
- `Plan-total.md` 增加命名衔接规则：面向用户的主流程默认导航必须显示 `地层分层`；旧 `测试解译` 只能作为历史实现标签、内部 route、旧日志或兼容说明。
- `Plan-total.md` 增加“逐页入口闭环检查格式”：每个主流程页必须记录当前对象、输入、主结果、状态/阻断、下一步、详情/日志位置；R1-A/R2-A 必须按此验收。
- `Process.md` 顶部 current override 后增加历史边界说明：下方旧 `Current Override` 段落都是历史记录，不是当前 active；当前 active 只以顶部 R0-A 和 `plan.md` 为准。

Verification planned:

```powershell
git diff --check -- Plan-total.md Process.md process_logs/Process79.md plan.md AGENTS.md
git status --short -- Plan-total.md plan.md Process.md process_logs/Process79.md docs/archive/Plan-total-archive-20260630-before-reset.md AGENTS.md
```

Verification executed:

```text
git diff --check -- Plan-total.md Process.md process_logs/Process79.md plan.md AGENTS.md: PASS, LF/CRLF warnings only
git status --short -- Plan-total.md plan.md Process.md process_logs/Process79.md docs/archive/Plan-total-archive-20260630-before-reset.md AGENTS.md:
  M AGENTS.md
  M Plan-total.md
  M Process.md
  A docs/archive/Plan-total-archive-20260630-before-reset.md
  M plan.md
  A process_logs/Process79.md
```

Review status after fix:

- Engineering critique finding remains `risk` until reviewer re-checks the new diff.
- UI 中文用户挑刺 finding remains `risk` until reviewer re-checks the new diff.
- No known `blocking` finding is recorded for this R0-A review risk fix.

## 2026-06-30 - R0-A Closure And R1-A Active Handoff

Intent:

- 记录 R0-A 最终关闭结论。
- 将当前 active plan 切换到 `R1-A：VSCode-like 壳体区域与主流程入口最小闭环`。
- 本次只改文档，不改产品代码、UI、schema、公式、算法、导出、方法 registry 或 QA 脚本。

Review evidence:

- Engineering critique 复查：`pass`，无必须修复项。
- UI 中文用户挑刺复查：`pass`，无阻断项。
- Integration owner 裁定：`R0-A` 可以关闭；actual UI 尚未修复，作为下一步 `R1-A` 范围。

Files changed:

- `plan.md`
- `Process.md`
- `process_logs/Process79.md`

Implementation record:

- `Process.md` 顶部 current override 已更新为 `R0-A Closed / R1-A Active`。
- `Process.md` 保留 Historical Override Boundary，并明确下方旧 override 不覆盖顶部 R1-A active 状态。
- `plan.md` 已从完成的 R0-A 切换为新的当前 active slice：`R1-A：VSCode-like 壳体区域与主流程入口最小闭环`。
- `plan.md` 仅作为下一步 handoff，不实现 UI。

Verification planned:

```powershell
git diff --check -- plan.md Process.md process_logs/Process79.md Plan-total.md AGENTS.md
git status --short -- Plan-total.md plan.md Process.md process_logs/Process79.md docs/archive/Plan-total-archive-20260630-before-reset.md AGENTS.md
```

Verification executed:

```text
git diff --check -- plan.md Process.md process_logs/Process79.md Plan-total.md AGENTS.md: PASS, LF/CRLF warnings only
git status --short -- Plan-total.md plan.md Process.md process_logs/Process79.md docs/archive/Plan-total-archive-20260630-before-reset.md AGENTS.md:
  M AGENTS.md
  M Plan-total.md
  M Process.md
  A docs/archive/Plan-total-archive-20260630-before-reset.md
  M plan.md
  A process_logs/Process79.md
```

Closure decision:

```text
R0-A closure decision=pass
```

Residual risk:

- 实际 UI 仍然丑、乱、功能不清楚；该问题已进入下一 active slice `R1-A：VSCode-like 壳体区域与主流程入口最小闭环`。
- `AGENTS.md` 在工作树中已有 dirty 状态；本轮 R0-A closure / R1-A handoff 未修改 `AGENTS.md`。

- 本切片只重置路线图和 active slice，不修复实际 UI 丑、乱、功能不清楚的问题；该问题进入下一候选 `R1-A：VSCode-like 壳体区域与主流程入口最小闭环`。

## 2026-06-30 - R1-A Code-only 第一轮实施补丁

Intent:

- 只按 Planning handoff 执行 `R1-A：VSCode-like 壳体区域与主流程入口最小闭环` 的第一轮代码补丁。
- 将默认可见 shell 主流程入口收敛为六项：`项目/点位数据`、`数据导入`、`数据检查`、`地层分层`、`参数解译`、`成果输出`。
- 把面向用户的旧 `测试解译` 主流程文案收敛为 `地层分层`；旧 implementation/route 兼容不作为默认入口。
- 同步 focused UI regression 和 UX-V5 合同，验证六项主入口，不把 `方法实验室`、`研究模式` 当作默认 Explorer / Go / Run 工作流入口。

Files changed in this patch:

- `OffshoreGeotechWorkbench/MainPage.xaml`
- `OffshoreGeotechWorkbench/MainPage.xaml.cs`
- `OffshoreGeotechWorkbench/Pages/ProjectOverviewPage.xaml`
- `OffshoreGeotechWorkbench/Controls/ProjectWorkflowStatusStrip.xaml`
- `OffshoreGeotechWorkbench/Services/ProjectWorkflowStatusService.cs`
- `tools/uiregression/check_workbench_visual_consistency.ps1`
- `tools/uiregression/check_workbench_shell.ps1`
- `tools/uiregression/check_workbench_status_consistency.ps1`
- `tools/uiregression/check_workbench_contract.ps1`
- `tools/uiregression/check_workbench_explorer_navigation.ps1`
- `tools/uiregression/check_workbench_context_sync.ps1`
- `tools/uiregression/check_workbench_document_lifecycle.ps1`
- `tools/uiregression/check_workbench_inspector_context.ps1`
- `docs/ux-v5-vscode-like-workbench-contract.md`
- `Process.md`
- `process_logs/Process79.md`

Implementation record:

- `MainPage.xaml` visible Explorer primary nodes now show exactly six business workflow entries in order.
- `MainPage.xaml` Go menu now exposes exactly the same six entries; File menu uses `项目/点位数据`; Run menu uses `运行地层分层` and `运行参数解译`.
- `MainPage.xaml.cs` primary `WorkflowRoutes` now contains the six default workflow routes only; `method-lab` / `research` remain in internal route resolution, and legacy `interpretation` display maps to `地层分层` outside the primary workflow collection.
- `OnRunInterpretationClicked` now navigates to `stratification`.
- `ProjectOverviewPage.xaml`、`ProjectWorkflowStatusStrip.xaml`、`ProjectWorkflowStatusService.cs` no longer use `测试解译` for the main workflow copy.
- Focused workbench regression scripts now verify six primary routes and no visible legacy Explorer nodes for `测试解译` / `方法实验室` / `研究模式`.
- PowerShell scripts that need Chinese UI text assertions were changed to build strings via Unicode codepoints, avoiding Windows PowerShell UTF-8-without-BOM parsing issues.

Verification executed:

```text
dotnet on PATH: FAIL (not found); used .\app_data\tools\dotnet\dotnet.exe
.\app_data\tools\dotnet\dotnet.exe build .\OffshoreGeotechWorkbench\OffshoreGeotechWorkbench.csproj --no-restore -v:minimal -m:1 -p:BuildInParallel=false -p:UseSharedCompilation=false -p:NodeReuse=false
  result: PASS, 0 warnings, 0 errors

powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\uiregression\check_workbench_visual_consistency.ps1
  first run: FAIL due direct Chinese literals in ps1 parsed by Windows PowerShell ANSI path
  after codepoint fix: WORKBENCH_VISUAL_CONSISTENCY_CHECK=PASS

powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\uiregression\check_workbench_contract.ps1
  result: WORKBENCH_CONTRACT_CHECK=PASS; WORKBENCH_REQUIRED_AUTOMATION_IDS=40

powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\uiregression\check_workbench_shell.ps1
  result: WORKBENCH_SHELL_CHECK=PASS

powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\uiregression\check_workbench_explorer_navigation.ps1
  result: WORKBENCH_EXPLORER_NAVIGATION_CHECK=PASS
  evidence routes: project-overview / data-import / data-check / stratification / parameters / export

powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\uiregression\check_workbench_context_sync.ps1
  result: WORKBENCH_CONTEXT_SYNC_CHECK=PASS

powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\uiregression\check_workbench_status_consistency.ps1
  result: WORKBENCH_STATUS_CONSISTENCY_CHECK=PASS
  evidence documents: 项目/点位数据, 数据导入, 数据检查, 地层分层, 参数解译, 成果输出

powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\uiregression\check_workbench_document_lifecycle.ps1
  result: WORKBENCH_DOCUMENT_LIFECYCLE_CHECK=PASS

powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\uiregression\check_workbench_inspector_context.ps1
  first run: FAIL because it was incorrectly run in parallel with another UIA script against the same desktop window
  serial rerun: WORKBENCH_INSPECTOR_CONTEXT_CHECK=PASS
```

Verification still planned after this log update:

```powershell
git diff --check -- <changed files>
```

Not run:

- Full `tools/local-qa/run-local-quality-gate.ps1 -CaptureScreen` was not run in this Code-only first patch; focused R1-A scripts and build were run instead per user minimum.
- MethodLab-specific and Research-specific runtime scripts were not run. Their pages/services were not deleted, and internal route resolution remains; however they are no longer default Explorer/Go primary entries by R1-A design. If older MethodLab/Research UIA scripts still assume visible primary Explorer/Go entries, they need a separate compatibility adapter slice rather than restoring those entries to the main workflow.

Boundary:

- No SQLite schema change.
- No CPTU import parsing or commit semantic change.
- No formula or parameter algorithm change.
- No export file content contract change.
- No method registry change.

Closure status:

- Code-only implementation record only.
- R1-A is not closed by this entry.
- Engineering critique, UI 中文用户挑刺, final verification evidence review, and integration owner closure decision remain pending.

## 2026-06-30 - R1-A QA Compatibility Fix：MethodLab / Research 高级入口

Intent:

- 修复专项 QA 与 R1-A 主流程收敛之间的兼容冲突。
- 保持 Explorer 和 Go/Open 主流程只有六个入口，不把 `测试解译`、`方法实验室`、`研究模式` 放回默认主流程。
- 通过非主流程高级入口保留 MethodLab / Research 专项 QA 路径。

Files changed in this compatibility patch:

- `OffshoreGeotechWorkbench/MainPage.xaml`
- `OffshoreGeotechWorkbench/MainPage.xaml.cs`
- `tools/uiregression/check_method_lab_workbench_bridge.ps1`
- `tools/uiregression/check_method_lab_visual_runtime.ps1`
- `tools/uiregression/check_method_lab_run_details_runtime.ps1`
- `tools/uiregression/check_research_mode_view.ps1`
- `tools/uiregression/check_method_lab_evidence_viewer_runtime.ps1`
- `process_logs/Process79.md`

Implementation record:

- `Run` menu 增加 `OpenMethodLabRunMenuItem`，显示为 `方法实验室（调试）`，AutomationId 为 `WorkbenchRunMenuItem_MethodLab`，route 为 `method-lab`。
- `View` menu 增加 `OpenResearchViewMenuItem`，显示为 `研究模式（高级）`，AutomationId 为 `WorkbenchViewMenuItem_Research`，route 为 `research`。
- `MenuItemRouteTags` 和 `InitializeOpenDocumentMenu` 已绑定上述高级入口。
- `check_method_lab_workbench_bridge.ps1` 不再要求 `WorkbenchExplorerNode_MethodLab` 或 Go menu MethodLab item；改查 Run 高级入口和 internal route。
- `check_method_lab_visual_runtime.ps1`、`check_method_lab_run_details_runtime.ps1` 改为通过 Run menu 的 `WorkbenchRunMenuItem_MethodLab` 打开 MethodLab。
- `check_research_mode_view.ps1` 改为通过 View menu 的 `WorkbenchViewMenuItem_Research` 打开 Research。
- `check_method_lab_evidence_viewer_runtime.ps1` 原引用已移除的 `WorkbenchExplorerNode_Interpretation`。检查后确认目标控件仍在 `InterpretationPage`，当前六入口中对应 `参数解译` route，因此最小改为 `WorkbenchExplorerNode_Parameters`，不改核心页面。
- 对 untracked docs/scripts 使用了 `git add -N`，使 `git diff --check` 覆盖 R1-A 改动脚本和 UX-V5 合同。

Verification executed:

```text
.\app_data\tools\dotnet\dotnet.exe build .\OffshoreGeotechWorkbench\OffshoreGeotechWorkbench.csproj --no-restore -v:minimal -m:1 -p:BuildInParallel=false -p:UseSharedCompilation=false -p:NodeReuse=false
  result: PASS, 0 warnings, 0 errors

powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\uiregression\check_method_lab_workbench_bridge.ps1
  first run: FAIL because the bridge check still looked for WorkbenchRunMenuItem_MethodLab in XAML instead of code-behind initialization
  after check correction: METHOD_LAB_WORKBENCH_BRIDGE_CHECK=PASS

powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\uiregression\check_method_lab_visual_runtime.ps1
  result: METHOD_LAB_VISUAL_RUNTIME_CHECK=PASS
  evidence: METHOD_LAB_VISUAL_RUNTIME_COUNTS=GroundhogTracks:3;PycptLayers:44

powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\uiregression\check_method_lab_run_details_runtime.ps1
  result: METHOD_LAB_RUN_DETAILS_RUNTIME_CHECK=PASS
  evidence: RunDetails=True | Warnings=4,191 | Logs=310 | Artifacts=0 | Provenance=True | OfficialWrite=False

powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\uiregression\check_research_mode_view.ps1
  result: RESEARCH_MODE_VIEW_CHECK=PASS
  evidence: ResearchSafety=ResearchMode=True | Source=MethodLabRuns | Matrix=164 | OfficialWrite=False | Export=False

powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\uiregression\check_method_lab_evidence_viewer_runtime.ps1
  result: METHOD_LAB_EVIDENCE_VIEWER_RUNTIME_CHECK=PASS
  evidence: GroundhogChannels:12; GroundhogIc:4065; PycptLayers:44; PycptClassificationPoints:4188

git add -N -- docs/ux-v5-vscode-like-workbench-contract.md tools/uiregression/*.ps1 changed by R1-A
  result: done, no commit created

git diff --check -- <R1-A changed/intent-to-add files>
  result: PASS, LF/CRLF warnings only
```

Boundary:

- MethodLab / Research were not restored to Explorer or Go/Open primary workflow entries.
- No schema, import semantics, formula, algorithm, export contract, or method registry change.
- This remains Code-only implementation evidence; R1-A closure still requires review roles and integration owner decision.

## 2026-06-30 - R1-A workflow-check six-page compatibility fix

Intent:

- Fix the full QA `workflow-check` failure where the runner still expected eight workflow pages after R1-A reduced the primary shell flow to six entries.
- Keep real page execution, projection safety, isolated export-root, workbook, CSV, and audit checks intact.
- Keep `测试解译`, `方法实验室`, and `研究模式` out of the primary Explorer / Go / Open workflow entries.

Files changed in this compatibility patch:

- `app_data/tools/workflowcheckrun/Program.cs`
- `OffshoreGeotechWorkbench/MainPage.xaml.cs`
- `OffshoreGeotechWorkbench/Pages/StratificationPage.xaml.cs`
- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml.cs`
- `process_logs/Process79.md`

Implementation record:

- `workflowcheckrun` expected route order now accepts the R1-A six primary pages: `project-overview`, `data-import`, `data-check`, `stratification`, `parameters`, `export`.
- Workflow scope isolation now checks the primary `stratification` and `parameters` routes instead of old eight-page/internal routes.
- Main shell workflow report entries preserve the shell route tag and display name, so the parameter page reports as `parameters` / `参数解译` instead of the old page-internal compatibility label.
- Stratification workflow-check pass criteria no longer requires Research candidate rows; it still requires projection-only source, no official write, no official parameter use, at least one layer scheme, and classification evidence.
- Parameter workflow-check pass criteria no longer requires Research candidate rows; it still requires interpretation output, saved parameter run, preview rows, visualization track points, layer rows, attachment evidence, and complete workflow stages.
- Parameter workflow-check evidence now includes `ParameterProjectionSafetyToken.Text`, allowing the runner to verify `OfficialWrite=False` and `Export=False` from the actual page safety state.

Verification executed:

```text
.\app_data\tools\dotnet\dotnet.exe build .\OffshoreGeotechWorkbench\OffshoreGeotechWorkbench.csproj --no-restore -v:minimal -m:1 -p:BuildInParallel=false -p:UseSharedCompilation=false -p:NodeReuse=false
  result: PASS, 0 warnings, 0 errors

.\app_data\tools\dotnet\dotnet.exe run --project .\app_data\tools\workflowcheckrun\WorkflowCheckRun.csproj --no-restore
  result: WORKFLOW_CHECK=PASS
  evidence: PAGE_COUNT=6
  pages: project-overview, data-import, data-check, stratification, parameters, export all PASS
  protection: NEGATIVE_SCOPE_ISOLATION=PASS, STRATIFICATION_WORKFLOW_PROTECTION=PASS, PARAMETER_WORKFLOW_PROTECTION=PASS
  exports: WORKBOOK_DEPTH_MONOTONIC=PASS, WORKBOOK_PARAMETER_MATCH=PASS, PARAMETER_WORKBOOK_SHEETS=PASS, CSV_EXPORT_FILE=PASS, AUDIT_RECORD_EXPORT=PASS, NO_PLACEHOLDER_EXPORT_RECORDS=PASS
  report: D:\CPT-UIQA\app_data\temp\workflowcheckrun\20260630_205814_9c4fab88e1e540f68007a57d8a1757fd\workflow-report.json
```

Boundary:

- No MethodLab / Research restoration to primary Explorer or Go/Open workflow entries.
- No schema, import semantic, formula, parameter algorithm, export contract, or method registry change.
- `app_data/tools/workflowcheckrun/Program.cs` is under ignored `app_data/`, so it is not shown by normal `git status`; verification was by focused runner execution.

## 2026-06-30 - R1-A full local QA, reviewer gate, and risk-close

Intent:

- Finish `R1-A：VSCode-like 壳体区域与主流程入口最小闭环`.
- Verify that the shell is VSCode-like, the default workflow has exactly six useful primary entries, and older `测试解译` / `方法实验室` / `研究模式` are not restored to the primary Explorer / Go / Open flow.
- Close R1-A only after full local QA and independent review agents.

Additional fixes after the workflow-check patch:

- `tools/uiregression/check_method_lab_workbench_bridge.ps1`
  - Removed the stale assertion that `workflowcheckrun Program.cs` must contain `"method-lab"`.
  - Rationale: R1-A workflow-check intentionally runs only the six primary workflow pages; MethodLab remains available through the Run advanced/debug entry and internal route, not the default workflow.
- `tools/uiregression/check_interpretation_workbench_layout.ps1`
  - Replaced stale `WorkbenchOpenDocumentMenuItem_Interpretation` open calls with `WorkbenchOpenDocumentMenuItem_Parameters`.
  - Rationale: the primary user-facing document for the old InterpretationPage surface is now `参数解译`; `测试解译` is not a primary document entry.
- `tools/uiregression/check_parameter_scheme_workbench_static.ps1`
  - Explicitly selects `ResultTabParameters` after opening `参数解译`.
  - Rationale: earlier UIA runs can leave the shared page on another tab; this check must verify the parameter workbench surface, not depend on previous tab state.

Final verification:

```text
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\local-qa\run-local-quality-gate.ps1 -CaptureScreen -StepTimeoutSeconds 240
  result: LOCAL_QA_RESULT=PASS
  run: D:\CPT-UIQA\app_data\temp\local-qa\20260630_212346
  summary: D:\CPT-UIQA\app_data\temp\local-qa\20260630_212346\summary.md
  result json: D:\CPT-UIQA\app_data\temp\local-qa\20260630_212346\result.json
  counts: PASS=45; FAIL=0; WARN=0; SKIP=2
  merged skip: parameter-result-visualization-check merged into parameter-scheme-workbench-static-check
  screenshot: D:\CPT-UIQA\app_data\temp\local-qa\20260630_212346\screenshots\physical_screen_1920x1080_20260630_213236.png
  screenshot resolution: 1920x1080 physical desktop
```

Key QA evidence:

- `workflow-check=PASS`
  - `PAGE_COUNT=6`
  - pages: `project-overview`, `data-import`, `data-check`, `stratification`, `parameters`, `export`
  - protection: `NEGATIVE_SCOPE_ISOLATION=PASS`, `STRATIFICATION_WORKFLOW_PROTECTION=PASS`, `PARAMETER_WORKFLOW_PROTECTION=PASS`
- Workbench shell and routing:
  - `WORKBENCH_SHELL_CHECK=PASS`
  - `WORKBENCH_EXPLORER_NAVIGATION_CHECK=PASS`
  - `WORKBENCH_CONTEXT_SYNC_CHECK=PASS`
  - `WORKBENCH_STATUS_CONSISTENCY_CHECK=PASS`
  - `WORKBENCH_DOCUMENT_LIFECYCLE_CHECK=PASS`
  - `WORKBENCH_INSPECTOR_CONTEXT_CHECK=PASS`
  - `WORKBENCH_VISUAL_CONSISTENCY_CHECK=PASS`
- MethodLab / Research retained only as non-primary advanced/internal capabilities:
  - `METHOD_LAB_WORKBENCH_BRIDGE_CHECK=PASS`
  - `METHOD_LAB_VISUAL_RUNTIME_CHECK=PASS`
  - `METHOD_LAB_RUN_DETAILS_RUNTIME_CHECK=PASS`
  - `RESEARCH_MODE_VIEW_CHECK=PASS`
- Parameter/result checks:
  - `PARAMETER_PROJECTION_FAST_CHECK=PASS`
  - `PARAMETER_SCHEME_WORKBENCH_STATIC_CHECK=PASS`
  - `PARAMETER_RESULT_VISUALIZATION_CHECK=PASS` via merged parameter static check
- Export and adopted-output checks:
  - `EXPORT_WORKBENCH_LAYOUT_CHECK=PASS`
  - `EXPORT_ADOPTED_OUTPUT_PROJECTION=PASS`

Independent reviewer gate:

- Engineering critique agent: `risk`, no blocking.
  - Pass evidence: six primary entries verified in `MainPage.xaml` / `MainPage.xaml.cs`; MethodLab and Research only advanced/internal; QA scripts still exercise real routes and synchronization.
  - Risk: worktree has historical dirty files outside R1-A, including schema/algorithm/export-related files. Integration owner decision: this is not an R1-A blocker because R1-A did not introduce those files in this closure patch, local QA passed, and the risk is recorded as historical dirty-worktree attribution.
  - Risk: `InterpretationPage` still contains old fallback `测试解译` compatibility wording. Integration owner decision: non-blocking for R1-A because it is not a visible primary Explorer / Go / Open route; carry to R2/R3 cleanup.
- UI Chinese user critique agent: `risk`, no visual blocking.
  - Pass evidence: screenshot first read is VSCode-like; Top chrome, dark Activity Bar, Explorer, Editor Tabs, Details, Bottom Panel, and blue Status Bar are visible; six default entries are clear and old entries are absent.
  - Risk: central business pages, especially `成果输出`, still feel like form/card/debug surfaces with English class names, path-heavy details, and unclear status/next-action hierarchy. Integration owner decision: non-blocking for R1-A shell closure; carry into R2-A/R3 because this is page information architecture and result-expression work.
  - The UI reviewer noted that screenshot alone cannot prove six-entry sync. Integration owner decision: non-blocking because UIA evidence includes `workbench-explorer-navigation`, `workbench-context-sync`, `workbench-status-consistency`, and `workbench-document-lifecycle`, all PASS.

Closure decision:

```text
R1-A closure decision=risk close
```

R1-A achieved:

- VSCode-like shell anatomy is now present and verifiable.
- Default visible primary workflow entries are exactly six.
- Visible Explorer nodes are useful and route to matching documents.
- Tab / Explorer / Details / Bottom / Status synchronization is covered by UIA checks.
- MethodLab / Research remain accessible only through advanced/internal routes and are not primary workflow entries.
- Full local QA passes with physical screenshot evidence.

Residual risks carried forward:

- Page-level content still has clutter, debug wording, English technical objects, and weak next-action hierarchy.
- Right Details still reads too much like a developer property inspector.
- Output page can show `被阻断` and `可导出` in ways that need a clearer business-state model.
- Some old `测试解译` compatibility text remains in internal/fallback code paths.
- The worktree still contains historical dirty changes outside R1-A; future closure notes must keep scope attribution explicit.

Next active slice:

```text
R2-A：主流程信息架构与逐页入口闭环
```

R2-A handoff:

- `plan.md` has been replaced with the R2-A active planning handoff.
- `Process.md` top override has been updated to `R1-A Closed / R2-A Active`.
- `Plan-total.md` next candidate has been updated from R1-A to R2-A.

## 2026-07-03 Mobbin / Figma 参考流 MCP 接入

Intent:

- 接入 Mobbin 作为 Figma 阶段的真实产品 UI 参考来源，辅助 R2-A/R3 的信息架构、分栏、问题面板、导入检查、导出预检和工程工作台审图。

Scope:

- 配置本机 Codex MCP server `mobbin`。
- 将 Mobbin 使用边界写入设计合同、active plan 和专门参考流文档。
- 明确 Mobbin 不进入 WinUI 产品运行时，不改变 SQLite、导入、公式、算法、导出或打包边界。

Non-goals:

- 不调用 Mobbin 生成或修改当前产品 UI。
- 不修改产品代码。
- 不新增应用内联网、账号、OAuth 或外部 API 依赖。
- 不改变当前 VSCode-like 工作台方向。

Confirmed requirement:

- Goal: Mobbin 作为 Figma/设计参考流接入。
- Acceptance criteria: `codex mcp list` 显示 `mobbin` enabled 且 Auth 为 OAuth；设计文档记录使用边界。
- Verification: `codex mcp list`、`codex mcp get mobbin`、`git diff --check -- docs/mobbin-figma-reference-flow.md design.md plan.md Process.md process_logs/Process79.md`。
- Stop conditions: 如果 Mobbin 登录失败或需要把 API 接入 WinUI 产品本体，则停止并重新确认范围。

Multi-agent loop record:

- Planning agent / slice owner: Codex mainline。Handoff 为“只接入本机 Codex MCP 与设计参考流文档，不改产品代码、不改业务边界”。
- Code-only agent: Codex mainline。执行 `codex mcp add mobbin --url https://api.mobbin.com/mcp`、`codex mcp login mobbin`，并更新设计/过程文档。
- Engineering critique agent: Codex written critique。Finding `nit`: `codex mcp add` 命令超时，但配置已落盘；后续 `codex mcp list` 和 `codex mcp get mobbin` 证明 server enabled、transport 为 `streamable_http`、Auth 为 `OAuth`。No blocking.
- UI Chinese user critique agent: Codex written critique。结论：`risk`，Mobbin 参考可能带入移动 App 或消费级 SaaS 风格；已通过 `design.md` 和 `docs/mobbin-figma-reference-flow.md` 限制为 VSCode-like 工程工作台参考，不阻塞本次接入。
- Integration owner: Codex mainline。Closure decision: `risk close`，风险为“参考流误用”，已有文档约束和后续审图记录要求。

Verification evidence:

```text
codex mcp list
mobbin  https://api.mobbin.com/mcp  enabled  OAuth

codex mcp get mobbin
transport: streamable_http
url: https://api.mobbin.com/mcp
```

Files changed:

- `docs/mobbin-figma-reference-flow.md`
- `design.md`
- `plan.md`
- `Process.md`
- `process_logs/Process79.md`

Open risks:

- 当前会话工具列表未动态暴露 Mobbin 工具；下一次 Codex 会话通常需要重新加载 MCP 工具能力后才能直接调用。
- Mobbin 使用需要遵守其账户/套餐权限；如果账号权限不足，设计参考流可退回手动 Figma/Mobbin 网页参考，不影响产品代码。

Follow-up reference search:

- User requested searching Mobbin for similar products as references.
- `codex exec -s read-only` attempted `mobbin/search_screens`; server returned `Mobbin MCP requires a paid plan`.
- Fallback used Mobbin public web indexes and recorded the shortlisted reference categories/products in `docs/mobbin-reference-shortlist-20260703.md`.
- Reference result is suitable for Figma/design review only; it is not complete Mobbin Pro evidence and does not change product runtime scope.

## 2026-07-03 Workbench 功能与页面设计总说明书

Intent:

- 将当前产品功能、页面顺序、页面内容、交互逻辑、状态、边界和 VSCode-like 工作台规则整理为一份完整设计说明书。
- 目标是让没有历史上下文的设计师只读该文档，也能知道后续要画哪些页面、每页放什么、哪些功能已有/拟做/未来/不做，以及哪些入口必须有承接窗口或状态。

Scope:

- 新增 `docs/workbench-functional-design-spec.md`。
- 覆盖主流程：`项目/点位数据 -> 数据导入 -> 数据检查 -> 地层分层 -> 参数解译 -> 成果输出`。
- 明确高级入口：`方法实验室`、`研究模式` 不作为默认结果消费页。
- 明确状态机：分层方案、参数解译方案、方法运行记录、成果包。
- 明确设计验收与实现验收口径。

Non-goals:

- 不修改产品代码。
- 不改变 SQLite、导入语义、公式、算法、导出实现和打包方式。
- 不调用 Figma 修改画板。
- 不把未来 PDF/DXF/插件市场能力画成已完成能力。

Multi-agent review:

- Zero-context UI/information architecture reviewer: `risk`, no blocking。
  - Required fixes: clarify full page sequence vs first-round priority, add stratification method picker, define 05A / bottom comparison / research mode boundaries, add VSCode-like density baseline, define global state page layout.
- Chinese engineering user reviewer: `risk`, no blocking。
  - Required fixes: project overview must show engineering conclusion summary, adoption vs parameter input must be unambiguous, technical/internal words must be mapped to Chinese user-facing terms, MethodLab/Research must stay advanced.
- Product/implementation reviewer: `risk`, no blocking。
  - Required fixes: add v1 implementation action table, page-object-action matrix, state machines, MethodCapability schema, implementation acceptance criteria, output format boundary.

Result:

- `docs/workbench-functional-design-spec.md` updated to v0.2.
- Added VSCode-like size/density baseline.
- Added v1 implementation action table.
- Added page sequence clarification and `05B 地层分层方法选择器`.
- Added project overview engineering conclusion strip.
- Replaced ambiguous formal flow with: `采纳为当前分层` automatically becomes official parameter input; unadopted schemes can only be used for parameter trial.
- Added comparison boundary table for default bottom comparison / 05A / research mode.
- Added user-facing vocabulary table and fixed status words.
- Added global context/source-of-truth, page-object-action matrix, state machines, global states画板要求, implementation acceptance criteria, and feedback processing record.

Verification:

```text
git diff --check -- .\docs\workbench-functional-design-spec.md
PASS

Select-String headings check
Found sections 0-35 with page sections 01-10 and design/implementation gates.
```

Files changed:

- `docs/workbench-functional-design-spec.md`
- `process_logs/Process79.md`

Open risks:

- This is a design/specification slice only. It prepares Figma and implementation work but does not prove current WinUI pages match the spec.
- Future Figma work should use this spec as the primary context and still run Chinese UI/user critique after each screen.

## 2026-07-03 Figma 界面 03 数据导入设计稿

Intent:

- 按 `design.md` 的流程继续第二张业务图，参考 Figma 中的 `数据导入界面-参考` PNG，将 `数据导入` 从当前实现/旧布局整理为 VSCode-like 工程工作台页面。
- 本轮只处理 `数据导入`，不扩展到 `数据检查`、`地层分层` 或导入后的修复流程。

Scope:

- 新增 Figma 画板 `03 数据导入`。
- 新增 Figma 画板 `03A 数据导入-功能状态与自检`。
- 新增设计记录 `docs/figma-interface-03-data-import-review.md`。

Initial result:

- `03 数据导入` 采用 Explorer + Editor Tabs + 中央导入工作区 + 右侧属性 + 底部问题 + 状态栏的 VSCode-like 结构。
- 中央工作区包含：导入动作、解析设置、导入文件列表、字段映射、数据预览。
- 右侧属性面板包含：导入批次属性和预检结果。
- 底部面板只展示导入问题，避免默认暴露内部路径、runner、registry、方法实验室或长日志。
- `03A` 明确记录了功能状态：选择文件、批量导入、解析预检、提交导入为已有/需重排；智能映射、查看详细报告、解析设置为新增拟做或部分已有，后续实现不得伪装为已完成。

Follow-up shell consistency correction:

- User pointed out that `数据导入` must match the shared layout from interface 1 because many regions are common layout.
- Rechecked `01 Workbench shell` against `03 数据导入`.
- The first draft had independently redrawn shell differences in Activity Bar width, top chrome height, Explorer origin, bottom panel, and status bar.
- Fixed by deleting the hand-drawn shell draft and rebuilding `03 数据导入` from a fresh clone of `01 Workbench shell`.
- Only the central data-import business area, right import-batch properties, and bottom import issues were replaced.

Verification:

```text
Figma screenshot:
app_data/temp/figma-03-data-import-v4-shell-aligned-final.png
resolution: 1920x1080

Figma nodes:
03 数据导入 = 20:2
03A 数据导入-功能状态与自检 = 17:2

Shared shell structure check:
WorkbenchTopChrome / ActivityBar / ExplorerPane / Tabs / RightPanel / BottomPanel / StatusBar = same as 01
allShellSame=True
```

Self-review:

- 中文化：pass。除文件名、CSV、UTF-8、CPTU、qc、fs、u2 等必要技术符号外，用户文案为中文。
- VSCode-like：pass。通用壳层已和 `01 Workbench shell` 的关键区域坐标尺寸一致。
- 业务直达：pass。用户默认可看到文件、映射、预览、预检和提交状态。
- 布局问题：已修复文件列表状态列 `解析通过` 换行，并确认 `数据导入` Tab 为选中态。
- 入口闭环：pass with risk。`智能映射`、`查看详细报告` 是设计拟做入口，后续代码实现前需要确认最小落地方式。

Files changed:

- `docs/figma-interface-03-data-import-review.md`
- `process_logs/Process79.md`

Open risks:

- 这是 Figma 设计与 handoff 记录，尚未修改 WinUI 代码。
- 后续实现应复用现有 `DataImportPage`、预览、映射、提交和导入服务，避免重造导入逻辑。

## 2026-07-03 03 数据导入按 design.md 复审与补齐

Intent:

- 使用新版 `design.md` 重新审阅 `03 数据导入` 模块，补齐入口闭环、目标弹窗/面板、状态覆盖、默认信息边界和 agent closure。
- 对缺失项直接补图和补文档，而不是只写口头建议。

Scope:

- 更新 Figma `03 数据导入` 主图。
- 新增 Figma `03B 数据导入-状态与入口闭环` 补充图。
- 更新 `docs/figma-interface-03-data-import-review.md`。
- 更新 `docs/workbench-functional-design-spec.md` 中页面 03 的底部面板、预检、提交按钮和状态规则。
- 不修改 WinUI 代码，不改变导入算法、SQLite schema 或导入服务。

Figma result:

- `03 数据导入`：节点 `20:2`。
- `03B 数据导入-状态与入口闭环`：节点 `25:2`。
- 主图修复后截图：`app_data/temp/figma-03-data-import-v5-reviewed-fixed.png`，`1920 x 1080`。
- 补充图修复后截图：`app_data/temp/figma-03b-data-import-entry-state-closure-v3.png`，`1920 x 1080`。

Key fixes:

- 主图底部默认页签从旧的 `问题 / 输出 / 日志 / 终端` 修为 `问题 / 预检 / 提交记录`。
- 主图右侧补 `预检结果：警告，可提交` 和 `有 1 个警告；提交后进入数据检查。`
- 文件列表动作从 `清空` 改为 `清空草稿...`。
- `03B` 补 `导入设置弹窗`、`智能映射候选`、`预检详细报告`、`状态覆盖`。
- `03B` 状态覆盖包含：无文件、解析中、预检警告、预检阻塞、提交成功、写入失败、只读工程。
- 总功能说明中 `提交按钮` 规则修正为：`仅预检总判定为可提交时可用；警告可提交，阻塞/失败不可提交`。

Agent review:

- Planning/contract reviewer `Laplace`: initial `blocking` on bottom tabs and missing closure gate; `risk` on incomplete state coverage and non-standard status enum. Re-review: `pass`。
- UI/layout reviewer `Mendel`: initial `blocking` on bottom tabs and mismatch between selected tab/content; `risk` on 03B compensating for unresolved main page. Re-review: `pass`。
- Chinese engineering user reviewer `Poincare`: initial `blocking` on default `输出/日志/终端`; `risk` on missing precheck verdict, missing warning/success states, unclear `清空` wording. Re-review: `risk` only for spec wording; fixed by changing the submit-button rule in `docs/workbench-functional-design-spec.md`。

Closure decision:

```text
03 数据导入设计复审：closed / pass for design handoff
```

Verification:

```text
git diff --check -- docs/figma-interface-03-data-import-review.md docs/workbench-functional-design-spec.md
PASS

Screenshot dimensions:
figma-03-data-import-v5-reviewed-fixed.png = 1920 x 1080
figma-03b-data-import-entry-state-closure-v3.png = 1920 x 1080
```

Open risks:

- This is design/Figma/document handoff only. Current WinUI `DataImportPage` still requires a separate implementation and local UI QA slice.
- Future implementation must not reintroduce `终端` or default long logs into the data-import bottom panel.

## 2026-07-04 design.md 设计交付关系简化

Intent:

- Clarify that module logic should live in concise functional design/development requirement docs, while Figma should focus on real user-visible UI screens, dialogs, panels, and key states.
- Avoid using large explanatory boards such as `03B` as the primary design deliverable.

Result:

- Updated `design.md` with a short `设计交付关系` section:

```text
模块功能设计文档 -> 真实 UI 图 -> 开发 handoff
```

- Updated the design workflow so each module first writes a functional design document, then draws only necessary real UI views.

Verification:

```text
git diff --check -- design.md process_logs/Process79.md
PASS
```

## 2026-07-03 design.md 统一契约清理

Intent:

- 将 `design.md` 从页面过程记录和临时设计意见中清理出来，重新定位为稳定的 UI/design 契约。
- 明确后续设计只需从本文读取：哪些区域统一、哪些色彩统一、设计工作流怎么走、设计完成后如何安排 agents 审阅，以及新增功能入口如何检查对应弹窗/面板/接口状态。

Scope:

- 重写 `design.md`。
- 更新本过程日志。
- 不修改 Figma 图稿，不修改 WinUI 代码，不改变当前产品功能边界。

Multi-agent review:

- Planning/contract reviewer `Darwin`: `risk`, no blocking。指出需要补统一布局锚点、可量化密度、owner/closure gate、功能入口的状态覆盖。
- UI/layout reviewer `Pascal`: `risk`, no blocking。指出需要补 Activity Bar、Explorer、Tab、RightPanel、BottomPanel、StatusBar 等硬尺寸，并补文字、hover、pressed、selected、table header、disabled、focus 等 token。
- Chinese engineering user reviewer `Helmholtz`: `risk`, no blocking。指出默认页面不能暴露内部日志和实现词，若默认界面看不到工程结果/状态/下一步应视为 blocking，并要求避免解释型大卡片、宣传式空话和假 dashboard 指标。

Result:

- `design.md` 已重写为稳定契约，明确不再保存具体页面历史。
- 新增统一基准：Figma `01 Workbench shell`、节点 `1:408`、截图 `app_data/temp/figma-01-workbench-shell-after-fix.png`、1920 x 1080 验收尺寸。
- 新增壳层尺寸表：Top Chrome、Activity Bar、Explorer、Tabs、EditorArea、RightPanel、BottomPanel、StatusBar。
- 新增色彩 token：VSCode 基础色、文字色、选中/hover/pressed/table header/disabled/focus，以及独立语义色。
- 新增排版密度表：字号、行高、按钮、状态短标、表格 padding、面板内边距、图标点击区。
- 新增功能入口闭环规则：新增入口必须说明目标页面/面板/菜单/弹窗/系统动作，并覆盖默认、无数据、加载、成功、警告、阻塞/错误、禁用、只读等状态。
- 新增默认信息边界：默认主流程页只放工程结果、数据状态、质量问题、下一步动作；内部 runner、registry、draft package、trace、长日志只进高级/方法实验室/开发诊断。
- 新增 agent 审阅关闭规则：必须有 design owner、integration owner、审阅结论和证据；未修复 blocking 不得进入代码实现。

Verification:

```text
git diff --check -- design.md process_logs/Process79.md
PASS
```

Open risks:

- 本次是设计治理文档清理，不证明当前 Figma 图稿或 WinUI 页面已经完全符合该契约。
- 后续每张页面仍需按 `design.md` 做壳层一致性、功能入口闭环、中文 UI、自检和 agent 审阅。

## 2026-07-04 03 数据导入真实 UI 图绘制

Intent:

- 按新版 `design.md` 的交付关系，从“说明板/逻辑板”推进到真实用户可见 UI 图。
- 让后续 WinUI 实现可以直接对照弹窗、面板和状态页，而不是把 `03B` 说明图误当成产品页面。

Scope:

- 继续沿用 Figma 文件 `Ik9q7UOopFTUXj32CIp6kz`。
- 补齐 `03 数据导入` 的入口弹窗、详情面板和关键状态页。
- 新增 `docs/ui-03-data-import-development-handoff.md`。
- 更新 `docs/figma-interface-03-data-import-review.md` 的真实 UI 图引用。
- 不修改 WinUI 代码、SQLite schema、导入解析逻辑或提交语义。

Figma result:

| 真实 UI 图 | Figma 节点 | 截图 |
| --- | --- | --- |
| `03-1 数据导入-导入设置弹窗` | `30:2` | `app_data/temp/figma-03-1-import-settings-dialog.png` |
| `03-2 数据导入-智能映射候选面板` | `30:32` | `app_data/temp/figma-03-2-smart-mapping-panel.png` |
| `03-3 数据导入-预检详细报告面板` | `30:79` | `app_data/temp/figma-03-3-precheck-detail-panel.png` |
| `03-4 数据导入-清空草稿确认弹窗` | `30:125` | `app_data/temp/figma-03-4-clear-draft-confirm-dialog.png` |
| `03-5 数据导入-无文件空状态` | `31:2` | `app_data/temp/figma-03-5-empty-state.png` |
| `03-6 数据导入-解析中状态` | `31:425` | `app_data/temp/figma-03-6-parsing-state.png` |
| `03-7 数据导入-预检阻塞状态` | `31:864` | `app_data/temp/figma-03-7-blocking-state.png` |
| `03-8 数据导入-提交成功状态` | `31:1303` | `app_data/temp/figma-03-8-submit-success-state.png` |
| `03-9 数据导入-写入失败状态` | `31:1736` | `app_data/temp/figma-03-9-write-failure-state.png` |

Verification:

```text
figma-03-1-import-settings-dialog.png = 640 x 430
figma-03-2-smart-mapping-panel.png = 720 x 520
figma-03-3-precheck-detail-panel.png = 820 x 560
figma-03-4-clear-draft-confirm-dialog.png = 520 x 260
figma-03-5-empty-state.png = 1920 x 1080
figma-03-6-parsing-state.png = 1920 x 1080
figma-03-7-blocking-state.png = 1920 x 1080
figma-03-8-submit-success-state.png = 1920 x 1080
figma-03-9-write-failure-state.png = 1920 x 1080
```

Visual self-check:

- 中文 UI：pass。除 `CPT/CPTU`、`CSV`、`Excel`、`UTF-8`、`SQLite`、字段名和单位外，用户文案为中文。
- VSCode-like：pass。状态页继承 `01 Workbench shell` 的顶部、Activity Bar、Explorer、Tabs、右侧属性、底部面板和蓝色状态栏。
- 入口闭环：pass。`设置`、`智能映射`、`查看详细报告`、`清空草稿...` 都已有对应弹窗或面板。
- 状态覆盖：pass。无文件、解析中、预检阻塞、提交成功、写入失败均有真实状态页。
- 信息边界：pass。默认页不展示 runner、registry、draft package、长日志或内部路径。

Files changed:

- `docs/ui-03-data-import-development-handoff.md`
- `docs/figma-interface-03-data-import-review.md`
- `process_logs/Process79.md`

Open risks:

- 这是 Figma/design handoff，不证明当前 WinUI `DataImportPage` 已实现这些弹窗和状态。
- 后续进入 WinUI 实现时，必须单独跑本地 QA 和 1920x1080 截图验收。
- `03B` 继续保留为内部说明图，但不得作为真实产品页面实现。

## 2026-07-04 04 数据检查真实 UI 图与开发 handoff

Intent:

- 按 `design.md` 的工作流继续绘制 `04 数据检查`，交付真实用户可见 UI，而不是说明板。
- 让后续 WinUI 实现能够直接对照质量门、问题列表、曲线定位、右侧详情、底部面板和关键状态。

Scope:

- 复用 Figma `01 Workbench shell`，只替换 `EditorArea`、`RightPanel`、`BottomPanel` 和状态栏业务文案。
- 绘制 `04 数据检查` 默认阻塞状态。
- 绘制无数据、运行中、警告可继续、通过、运行失败 5 个状态。
- 新增 `docs/ui-04-data-check-development-handoff.md`。
- 新增 `docs/figma-interface-04-data-check-review.md`。
- 更新 `plan.md` 和 `Process.md`。
- 不修改 WinUI 代码、SQLite schema、数据检查规则、导入解析或成果导出。

Figma result:

| 真实 UI 图 | Figma 节点 | 截图 |
| --- | --- | --- |
| `04 数据检查` | `37:2` | `app_data/temp/figma-04-data-check-main.png` |
| `04-1 数据检查-无数据空状态` | `40:2` | `app_data/temp/figma-04-1-data-check-empty-state.png` |
| `04-2 数据检查-运行中状态` | `40:369` | `app_data/temp/figma-04-2-data-check-running-state.png` |
| `04-3 数据检查-警告可继续状态` | `40:733` | `app_data/temp/figma-04-3-data-check-warning-state.png` |
| `04-4 数据检查-通过状态` | `40:1133` | `app_data/temp/figma-04-4-data-check-passed-state.png` |
| `04-5 数据检查-运行失败状态` | `40:1506` | `app_data/temp/figma-04-5-data-check-run-failed-state.png` |
| `04-6 数据检查-检查规则面板` | `43:14` | `app_data/temp/figma-04-6-data-check-rules-panel.png` |

Key design decisions:

- `数据检查` 是 `数据导入 -> 地层分层` 之间的质量门。
- 当前设计已收敛为 `项目级质量门 + 选中点位钻取`，与现有 `DataQualityCheckService` 的项目级汇总能力一致。
- 默认页优先显示阻塞项、警告项、通过规则、检查范围和分层准入状态。
- 点击问题后同步问题列表、曲线深度带、定位数据行和右侧详情。
- `进入地层分层` 在阻塞、运行中、运行失败、无数据时禁用；在警告可继续和通过状态启用。
- 底部面板固定为 `问题 / 预检 / 检查记录`，默认不展示内部长日志。
- 不新增 `标记已处理` 或自动修复，因为当前代码没有对应能力。
- 曲线深度带和定位数据行依赖后续 `IssueEvidence` 数据合同；未补合同时必须降级，不得伪造曲线。
- `检查规则` 入口已有最小只读面板，若 WinUI 暂不实现则必须禁用按钮。

Verification:

```text
figma-04-data-check-main.png = 1920x1080
figma-04-1-data-check-empty-state.png = 1920x1080
figma-04-2-data-check-running-state.png = 1920x1080
figma-04-3-data-check-warning-state.png = 1920x1080
figma-04-4-data-check-passed-state.png = 1920x1080
figma-04-5-data-check-run-failed-state.png = 1920x1080
figma-04-6-data-check-rules-panel.png = 760x560
```

Visual self-check:

- VSCode-like: pass. All frames inherit the shared workbench shell with top chrome, Activity Bar, Explorer, tabs, right panel, bottom panel, and status bar.
- 中文 UI: pass. User-facing labels are Chinese except necessary technical notation such as CPT/CPTU, qc, fs, u2, SQLite.
- 功能直达: pass. Blocking, warning, pass, running, empty, and failed states each show a clear next action.
- 入口闭环: pass with implementation boundary. `检查规则` has Figma panel `43:14`; `定位到数据行` needs `IssueEvidence` or must degrade.
- Layout self-check: pass after fixing `CPT09` wrapping, warning-state legend overlap, `Fr` unit text, and project-level wording.

Reviewer findings and fixes:

- Planning/contract reviewer `Carver`: initial `blocking` for missing owner/closure gate and dangling rules entry. Fixed by adding owner/reviewer closure records and `04-6 数据检查-检查规则面板`.
- Engineering critique reviewer `Bohr`: initial `blocking` for point-level vs project-level mismatch, no-data misclassification risk, and missing curve/data-row evidence contract. Fixed by changing scope to `项目级质量门 + 选中点位钻取`, adding no-data guard requirements, and adding `IssueEvidence` contract/fallback rules.
- UI Chinese user reviewer `Bernoulli`: `risk`, no blocking. Fixed CTA repetition in passed state, clarified failed state as `上次质量`, added minimal curve units, renamed `全部规则` to `检查规则`, and corrected `贯入` wording.

Open risks:

- This is Figma/design handoff only. Current WinUI `DataCheckPage` is not yet updated to match the design.
- `figma-04-data-check-main.png` is the valid main screenshot evidence. An earlier local `figma-04-data-check.png` download was ignored after a corrupted/locked local file issue.
- Reviewer-agent re-check is still required before closing the design slice.
