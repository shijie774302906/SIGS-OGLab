# UI Theme Options - Color And Typography Research

Date: 2026-07-08

Scope: color, typography, and dense workbench visual direction for the isolated web prototype.

## Current Baseline

Screenshot:

![Current baseline](../../process_logs/playwright-mcp/theme-research/00-current-baseline.png)

Current issue:

- The shell is cleaner after removing the black rail and blue status bar, but the remaining palette still feels like a hand-made VS/enterprise hybrid.
- Segoe UI is readable, but the type hierarchy is too flat. Headings, table text, labels, and numeric data do not yet feel intentionally tuned.
- Main blue, warning amber, and soil colors are usable, but the gray system and table states need a mature token source.

## Option A - TDesign Starter Inspired

Screenshot:

![TDesign Starter](../../process_logs/playwright-mcp/theme-research/03-tdesign-starter-react.png)

Source notes:

- TDesign React Starter is built with React and Vite and targets out-of-the-box middle/background projects.
- It supports custom theme colors, dark mode, multiple layouts, and mock data.

Fit:

- Best match for a Chinese enterprise/product workbench.
- Navigation, cards, charts, and data panels feel close to the product category.
- Good candidate if we want a more polished "large Chinese internet company internal system" look.

Suggested tokens:

- Font: system Chinese UI stack, `"Microsoft YaHei UI", "PingFang SC", "Segoe UI", Arial, sans-serif`
- Accent: `#0052D9` or toned down `#1764D9`
- Canvas: `#F3F5F8`
- Sidebar: `#FFFFFF`
- Border: `#E7EAF0`
- Text primary: `#1F2329`
- Text secondary: `#646A73`

Adjustment needed:

- Avoid directly copying its large KPI cards and vivid blue blocks.
- Use its spacing, navigation, and table/button rhythm; keep our evidence area denser and more technical.

Verdict:

- Recommended as the main direction if we want the safest "domestic enterprise product" feel.

## Option B - Ant Design Pro / Ant Design Components Inspired

Screenshot:

![Ant Design Table](../../process_logs/playwright-mcp/theme-research/01b-ant-design-table-demo.png)

Source notes:

- Ant Design Pro is an out-of-box React boilerplate for enterprise applications.
- It includes typical enterprise templates such as dashboard, forms, lists, table list, profile, result, exception, account, and more.
- Ant Design exposes a recognizable primary blue token around `#1677FF`.

Fit:

- Most implementation-friendly with our earlier Ant Design Pro discussion.
- Strong table/form/list language and mature defaults.
- Very safe for a prototype that may later need ProTable, ProDescriptions, and form filters.

Suggested tokens:

- Font: Ant/system stack, `"Segoe UI", "PingFang SC", "Microsoft YaHei", Arial, sans-serif`
- Accent: `#1677FF`, or more engineering-muted `#1E5AA8`
- Canvas: `#F5F7FA`
- Panel: `#FFFFFF`
- Header/table head: `#FAFAFA`
- Border: `#D9D9D9`
- Text primary: `rgba(0, 0, 0, 0.88)`
- Text secondary: `rgba(0, 0, 0, 0.65)`

Adjustment needed:

- Ant's default table examples are visually airy and web-doc-like; we need denser rows and less white gap.
- Keep our engineering soil colors rather than Ant's decorative tag palette.

Verdict:

- Recommended if we want minimum risk and easiest future component adoption.

## Option C - Carbon Inspired Engineering Data UI

Screenshot:

![Carbon Data Table](../../process_logs/playwright-mcp/theme-research/04b-carbon-data-table-demo.png)

Source notes:

- Carbon is IBM's open source design system for products and digital experiences.
- Carbon's data table guidance explicitly targets efficient organization and display of data.

Fit:

- Best for "engineering evidence / technical analysis" seriousness.
- Strong typography discipline and data-table density.
- Could make the CPT/CPTU workbench feel more like a professional analysis instrument.

Suggested tokens:

- Font: `IBM Plex Sans` for UI if installed later; fallback now to `"Segoe UI", "Microsoft YaHei", Arial, sans-serif`
- Data font: `IBM Plex Mono` or `"Cascadia Mono", Consolas, monospace`
- Accent: `#0F62FE`
- Canvas: `#F4F4F4`
- Panel: `#FFFFFF`
- Border: `#C6C6C6`
- Text primary: `#161616`
- Text secondary: `#525252`

Adjustment needed:

- Do not copy Carbon's black masthead into our app; user already rejected heavy chrome.
- Use Carbon's typography, table density, grid, and restrained blue instead of its full shell.

Verdict:

- Strongest visual upgrade for engineering credibility, but requires more custom work than Ant/TDesign.

## Option D - Arco Design Pro Inspired

Screenshot:

![Arco Design Pro](../../process_logs/playwright-mcp/theme-research/02c-arco-react-pro-after-login.png)

Source notes:

- Arco Design Pro is an out-of-the-box enterprise application solution powered by Arco Design React.
- It provides templates for tables, lists, forms, dashboard, visualization, themes, dark mode, mock API, i18n, and flexible configuration.

Fit:

- Modern, clean, and closer to ByteDance internal tooling.
- Nice muted sidebar and soft blue language.
- Good if we want a lighter, more contemporary internet-product feel.

Suggested tokens:

- Font: `"Inter", "PingFang SC", "Microsoft YaHei", "Segoe UI", Arial, sans-serif` if Inter is acceptable, otherwise system stack only.
- Accent: `#165DFF`
- Canvas: `#F7F8FA`
- Sidebar: `#FFFFFF`
- Border: `#E5E6EB`
- Text primary: `#1D2129`
- Text secondary: `#4E5969`

Adjustment needed:

- Arco's demo uses many soft cards and dashboard widgets; our CPT workbench should remain evidence-first.
- Avoid large empty chart/card zones.

Verdict:

- Good secondary candidate. Better than current palette, slightly less domain-serious than Carbon.

## Option E - Semi Design As Typography/Token Reference

Screenshot:

![Semi Table](../../process_logs/playwright-mcp/theme-research/05b-semi-table-demo.png)

Source notes:

- Semi UI is MIT licensed.
- It provides more than 3000 configurable tokens and supports syncing design system decisions between Figma and code.

Fit:

- Strong table/tag details and customizable tokens.
- Good reference for table row treatment, tags, and subtle interaction states.

Suggested tokens:

- Font: system Chinese UI stack.
- Accent: `#0064FA`
- Canvas: `#F7F8FA`
- Border: `#E5E6EB`
- Text primary: `#1C1F23`
- Text secondary: `#60646B`

Adjustment needed:

- Semi's docs/header visual is too product-marketing-like for our shell.
- Use it for tokens and table states only, not as the overall workbench identity.

Verdict:

- Keep as a detail reference, not the main shell direction.

## Shortlist

1. TDesign Starter inspired: best domestic enterprise-product match.
2. Ant Design Pro inspired: safest and easiest to implement.
3. Carbon inspired: strongest engineering/data credibility.
4. Arco Design Pro inspired: modern and clean, but less serious.

## Mobbin Reference Layer

After Mobbin MCP access became available, a second pass checked real production screens and flows for dense workbench patterns.

Detailed reference doc:

- `docs/prototype/mobbin-reference-analysis-2026-07-08.md`

Most relevant screens:

- Braintrust table workspace: strongest table + right inspector pattern.
- Sentry analytics workspace: strongest query/filter + chart + table pattern.
- Cloudflare operations table: strongest event/issue table density pattern.
- LangChain trace list: useful minimal table and status-chip restraint.

Most relevant flows:

- HubSpot import: file upload, mapping table, validation, completion.
- Attio import issue resolution: field list, raw/mapped values, inline issue repair.
- Juicebox report generation: table context, report configuration, document preview.
- Zoho report export: report list, row action menu, export settings.

Design implication:

- Keep the chosen TDesign/Ant/Carbon foundation.
- Use Mobbin as interaction evidence for importer/checker/output workflows.
- Do not copy Mobbin brand palettes or app-specific product language.

## My Recommendation

Use a hybrid:

- Shell and page structure: TDesign Starter / Ant Design Pro.
- Table density and data typography: Carbon.
- Accent and status system: keep one primary blue plus semantic amber/green/error.
- Font: system Chinese UI stack now; consider `IBM Plex Sans` only if we choose the Carbon-heavy direction.

Best concrete direction:

```text
TDesign shell discipline + Ant/Pro component semantics + Carbon data density
```

This should make the interface feel less "VS-like prototype" and more like a mature engineering analysis product.
