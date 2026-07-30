# Process041 - Right Functional Dock Product Decision

Date: 2026-07-09

Theme: right side as page-specific functional dock

Status: closed / documented

## Context

After reviewing the proposed `Slice B - Shared Right Panel Contract`, the user rejected the idea of turning the right side into a fixed status checker.

The user clarified that future pages may need many independent feature tools, so the right side should become a page-specific functional area where page tools can be docked.

## Decision

- Left side remains fixed workflow navigation.
- Center remains the current page's primary result, evidence, chart, or table.
- Right side becomes a page-specific functional dock.
- The dock may differ by page.
- The shared contract is behavioral, not content-uniform.

Right dock rules:

- Do not become a second left navigation.
- Do not duplicate the center table.
- Do not hide the primary evidence.
- Every dock module must map to a clear page action.
- State copy can provide context, but status inspection is not the dock's main purpose.

## Updated Documents

- `plan.md`
- `docs/prototype/five-feature-zones-functional-blueprint-2026-07-09.md`

## Replacement

Replaced the previous `Shared Right Panel Contract` direction with:

- `Slice B - Right Functional Dock Contract`

## Next

Provide a confirmation card for `Slice B - Right Functional Dock Contract` before any implementation.
