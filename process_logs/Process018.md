# Process018 - Reusable UI Review Agent Playbook

Date: 2026-07-08

Status: `closed / documented`

## Scope

Create reusable review-agent documentation for future UI reviews in this prototype workspace.

The user requested three reusable agent types:

- a visual/layout/taste reviewer
- a geotechnical PhD-level professional reviewer
- a copy/IA challenger with permission to use Mobbin

## Deliverables

- `agents/README.md`
- `agents/visual-layout-taste-auditor.md`
- `agents/geotechnical-domain-reviewer.md`
- `agents/copy-ia-mobbin-challenger.md`

## Root Agent Instruction Update

Updated `AGENTS.md` with a new section:

- `9. Reusable UI Review Agents`

The new rule says that when the user asks for UI review with agents, multi-agent review, rereview, or design critique, the default agent set is:

1. `agents/visual-layout-taste-auditor.md`
2. `agents/geotechnical-domain-reviewer.md`
3. `agents/copy-ia-mobbin-challenger.md`

The three agents are read-only by default. The main Codex agent integrates findings, decides fixes, verifies locally, and records closure.

## Agent Responsibilities

### Visual Layout Taste Auditor

Focus:

- layout structure
- visual hierarchy
- density and crowding
- typography consistency
- chart/image clarity
- overlap, clipping, wrapping
- table and panel readability

### Geotechnical Domain Reviewer

Focus:

- offshore wind geotechnical and CPT/CPTU professional accuracy
- stratification, layer, boundary, review-depth, parameter-trial, output-preflight relationships
- prototype boundary safety
- SBTn evidence correctness
- workflow order preservation

### Copy IA Mobbin Challenger

Focus:

- Chinese UX copy
- IA clarity
- feature naming
- repeated or verbose wording
- English/implementation leakage
- Mobbin MCP reference search and reference-to-product mapping when available

## Verification

- Confirmed `agents/` exists.
- Confirmed all three agent template files exist.
- Confirmed `AGENTS.md` points to the three templates.

No build or E2E was run because this was documentation-only and did not modify application code.

## Boundary

- No UI implementation files were changed.
- No desktop repo files were changed.
- No desktop `app_data`, SQLite schema, official algorithm, persistence, or export behavior was touched.
