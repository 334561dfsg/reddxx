# Newtrend Trading Pages Implementation Plan

**Goal:** Implement the selected GMXX page organization with existing Newtrend visuals.
**Architecture:** Three product routes own their mode; shared workspace composes focused market, chart, book and record components. Session-scoped state retains drafts and per-product view context.
**Tech Stack:** Existing Vue 3, Vue Router, CSS; no new dependencies.
**Spec:** docs/superpowers/specs/2026-11-24-newtrend-trading-pages-design.md

## Constraints and review focus
Only newtrend changes. Preserve USDT, favorites, local confirmations, six locales and root build. Verify product-isolated records, option current/history split, independent drafts, unknown legacy routes and narrow/short viewport reachability. Do not restore indicators, funding links or record filters.

## Tasks
- [x] Add product config, records selection and session draft/view state with tests for separation and cancelled/settled cases.
- [x] Add dedicated routes/pages and shared market/chart/book/records components; retain existing order semantics and confirmation owner.
- [x] Implement derivative three-column layout and spot book/chart+form/market layout with CSS-only responsive rearrangement.
- [x] Add matching six-language labels and update project instructions to supersede all-product record tabs.
- [x] Run root build, newtrend tests and locale checks. Browser check each product, records, draft preservation, favorites and narrow layout; document unchecked device interactions.
- [x] Leave changes uncommitted until requested by user.
