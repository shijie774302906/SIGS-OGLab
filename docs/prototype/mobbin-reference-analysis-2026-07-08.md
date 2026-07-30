# Mobbin Reference Analysis

Date: 2026-07-08

Scope: UI screens and flows that can guide the next visual and workflow pass for the isolated web prototype.

Working direction:

```text
TDesign shell discipline + Ant/Pro component semantics + Carbon data density + Mobbin workflow evidence
```

## Selection Criteria

- The reference must support a real workbench, not a marketing page.
- The screen should handle dense data, filters, row selection, state chips, or a right-side inspector.
- The flow should clarify an operational path: import, validation, issue resolution, report/export.
- Borrow structure, hierarchy, density, and interaction rhythm. Do not copy brand colors, illustrations, or domain-specific copy.

## Screen Shortlist

| Reference | Mobbin source | Local screenshot | What to borrow | What to avoid |
| --- | --- | --- | --- | --- |
| Braintrust table workspace | https://mobbin.com/screens/9af2e557-0b59-4720-b45b-4819f119a812 | `../../process_logs/mobbin-research/2026-07-08/screen-braintrust-table.jpg` | Dataset table + top toolbar + selected row inspector. This is the strongest pattern for `地层分层` and future `参数解译`: table/list in the center, structured raw/mapped/metadata detail on the right. | Do not copy AI/evaluation wording or make the right panel too code-like. |
| Sentry analytics workspace | https://mobbin.com/screens/11820743-80a4-4680-be5f-473608bea7c3 | `../../process_logs/mobbin-research/2026-07-08/screen-sentry-analytics.jpg` | Query chips, chart above table, dense event rows, compact left navigation. Good model for `数据检查` evidence: filters first, trend/quality signal second, row-level issues below. | Avoid dark masthead and overly developer-log vocabulary. |
| Cloudflare operations table | https://mobbin.com/screens/cbf28d46-8663-4731-a826-179bc4f0fb16 | `../../process_logs/mobbin-research/2026-07-08/screen-cloudflare-ops.jpg` | Operational event table with time filters, histogram, status columns, and high scan density. Good for quality issue queue and import/check logs. | Do not bring in a heavy product sidebar or security-console language. |
| LangChain trace list | https://mobbin.com/screens/8e8dd404-868c-4de4-b990-86b1a8210f26 | `../../process_logs/mobbin-research/2026-07-08/screen-langchain-ops.jpg` | Minimal table surface, compact filter row, low-noise status chips. Useful for reducing our current visual weight. | Too sparse for the main CPT evidence page if used alone. |
| Juicebox data table | https://mobbin.com/screens/abe28723-31f4-4892-a5c5-6d0be34dd5f8 | `../../process_logs/mobbin-research/2026-07-08/screen-juicebox-data.jpg` | Top-level table actions: import, export, report, review, view switch. Useful for `成果输出` and table action grouping. | Do not copy purple accent or consumer CRM tone. |
| WRITER report workspace | https://mobbin.com/screens/ffbba5ff-34e6-4ff8-953a-9f4b9f67c9bb | `../../process_logs/mobbin-research/2026-07-08/screen-writer-report.jpg` | Split report generation/preview with a completion checklist and deliverable state. Useful for future output preview. | Avoid chat/AI product framing and decorative empty states. |

## Flow Shortlist

| Reference | Mobbin source | Local screenshots | What to borrow | Product mapping |
| --- | --- | --- | --- | --- |
| HubSpot importing a file | https://mobbin.com/flows/76a881cf-e903-4eaf-bb60-f7a779cd06c2 | `flow-hubspot-import-01.jpg`, `05`, `10`, `14` | Stepper, upload state, field mapping table, import summary. The mapping table is especially useful: file column, preview value, target field, issue state. | `数据导入 -> 数据检查` should become a stepper flow rather than a static placeholder. |
| Attio resolving import issues | https://mobbin.com/flows/535a7828-5915-47a2-b782-c6bfd708adc0 | `flow-attio-resolve-01.jpg`, `04`, `11` | Left field list + central raw/mapped values + inline issue repair. Strongest flow reference for validation and review. | `数据检查` should expose an issue queue and repair/review panel before allowing `地层分层`. |
| Airtable importing data | https://mobbin.com/flows/dce9a53c-788e-4821-bd15-08cd2b9c6529 | `flow-airtable-import-01.jpg`, `07`, `13` | Import modal, source picker, file preview, non-blocking import toast. | Use later if file import becomes a real browser interaction. Not needed for Phase 1/2 visual pass. |
| Juicebox generating a report | https://mobbin.com/flows/b6b5e891-bd57-4101-b8b6-3455daf773d3 | `flow-juicebox-report-01.jpg`, `03`, `06` | Keep the user in the table context, open a report configuration modal, then show generated document preview. | `成果输出` should not be a detached marketing-style page; it should start from deliverable rows and preview/export state. |
| Zoho CRM exporting a report | https://mobbin.com/flows/8b49bb83-cb99-42b0-8caa-cf579b7fad2a | `flow-zoho-export-01.jpg`, `03`, `07` | Report list, row action menu, export type dialog, file format/preferences. | Future output flow can use a report list plus export settings dialog. Visual style is secondary. |

## Patterns To Adopt

### 1. Workbench Information Architecture

Use a three-part work surface:

```text
resource/navigation pane -> dense evidence/table canvas -> object inspector
```

The current prototype already has this shape. The next pass should make it feel intentional:

- Explorer becomes a quiet resource pane, not a code-editor tree.
- Center canvas prioritizes layer table, evidence track, filters, and review state.
- Right panel becomes a real object inspector with raw values, mapped values, preflight state, and next actions.

Primary references: Braintrust, Sentry, Cloudflare.

### 2. Data Import And Check Flow

Use stepper-based flow states:

```text
Upload file -> Map fields -> Review values -> Preview/commit boundary
```

For our prototype wording:

```text
选择数据 -> 字段映射 -> 数据检查 -> 分层准备
```

Borrow from HubSpot and Attio:

- A visible top stepper.
- A mapping table with source field, preview value, target field, and status.
- A left issue/field list for fast navigation.
- Inline resolution states, but do not pretend to write official desktop data.

### 3. Layer Review And Parameter Readiness

Treat `地层分层` as a review cockpit:

- Left: candidate/adopted schemes.
- Center: layer track, evidence area, layer table.
- Right: selected layer/selected boundary inspector.
- Bottom: issue queue and preflight logs.

Borrow from Braintrust and Cloudflare:

- Selected row state should drive the inspector.
- Data rows should be compact and tabular.
- State chips should be semantic and subdued.

### 4. Output And Export

Use a report list + settings dialog + preview model:

```text
成果清单 -> 预检/缺失项 -> 导出设置 -> 预览 -> 输出记录
```

Borrow from Juicebox and Zoho:

- Export should start from a selected report row or deliverable item.
- Configuration belongs in a modal/drawer.
- Preview should show what will be delivered and what is blocked.

## Patterns To Reject

- Large dashboard KPI cards that do not answer engineering questions.
- Marketing hero sections, gradient backgrounds, decorative empty states, or oversized brand illustrations.
- Full dark mastheads or IDE-like black rails.
- Brand-specific accent systems such as Juicebox purple, HubSpot orange, or Zoho blue sidebar.
- AI/chat product framing unless the product actually exposes that workflow.
- Any UI that suggests official save/adopt/export behavior before the prototype has that boundary.

## Concrete Landing Path

### Current Slice: Phase 1 + Phase 2

Apply immediately:

- Replace ad hoc color variables with a TDesign/Ant neutral system.
- Use Carbon-like density for tables, depth values, status chips, and issue rows.
- Tighten type scale and numeric/tabular typography.
- Reduce blue and amber saturation.
- Make Explorer, tabs, right panel, table toolbar, and bottom panel visually quieter.

No new dependency is required for this slice.

### Next Slice: Phase 3 + Phase 4

Apply after screenshot review:

- Rework Explorer selected state and row density.
- Convert bottom panel toward a Mobbin-like issue queue/output drawer.
- Strengthen right inspector sections: object metadata, review state, preflight, next action.
- Improve layer table/filter toolbar using Braintrust/Sentry/Cloudflare patterns.

### Later Flow Slice

When the user asks for actual import/check/output screens:

- Use HubSpot + Attio for `数据导入` and `数据检查`.
- Use Juicebox + Zoho for `成果输出`.
- Consider `antd` only when modal, form validation, table settings, or editable mapping rows become real requirements.

## Screenshot Folder

All captured references for this round are stored under:

```text
process_logs/mobbin-research/2026-07-08/
```

These screenshots are reference material for prototype design only. They are not product assets and should not be copied into the app UI.
