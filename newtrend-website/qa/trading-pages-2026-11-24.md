# Dedicated trading page validation — 2026-11-24

Scope: newtrend only. Trading V2 remains unchanged. Reference read in the user's Chrome session: GMXX standardContract, contractTransaction, spotGoods. Reference inspection was read-only; no account values copied and no reference orders submitted.

Implemented:
- Explicit perpetual, delivery/options and spot routes and page components, keeping existing URLs and legacy locale redirects.
- Derivatives: chart, book, right form; spot: left book, center chart and two-column order form below, right market browser.
- Product-isolated record tabs; delivery current/settled history split.
- Session-scoped per-product drafts, symbols, chart interval, market search/category/sort, record tab and page; existing localStorage favorites retained.
- Shared six-language labels, root server/build, NewQuantCapital dark palette, USDT, fixed form actions and original confirmation owner.

Checks performed:
- Root production build; newtrend complete tests (38); six locale packs (3969 keys each); git diff --check.
- Browser at 1280×720: product navigation, distinct record tabs, form visuals.
- Futures amount 321 and history page 2 restored after navigating to options and back.
- Symbol popup keyboard search ETH + Enter commits ETH while retaining the amount draft.
- Cancel order confirmation leaves draft intact; cancel initially focused.
- Local delivery order confirmation creates exactly one current record; settled history separately lists fixtures (five cards per page).
- Favorites persist across reload; test favorite restored to its original value.
- Spot at 1600×1000: left book, center chart, below-chart two-column form, right market list verified through rendered geometry.
- Spot at 768×1024 and 390×844: no document horizontal overflow; form draft survives viewport change; narrow layout retains all areas.
- Futures at 1280×540: no document horizontal overflow and form has a bounded 540px frame.
- Browser console clean at end of checks.

Not verified:
- Physical phones/tablets, touch-only interaction, virtual keyboard and dynamic mobile chrome.
- 200% browser zoom, system text scaling, all safe-area directions, forced colors and OS reduced-motion mode.
- Full keyboard/screen-reader, backdrop resistance, layer stacking, route-cleanup and asynchronous-failure regression matrices.
- All languages at every breakpoint, every instrument and all current record close/cancel paths.

Required follow-up: exercise the unverified cases against the root AGENTS.md criteria before declaring full cross-platform acceptance. No new backend or external trading integration is included.

## Spot content correction
- Added bid/ask/both book controls (7+7 or 14 levels) and corrected each row's price × quantity total.
- Replaced spot market cards with aligned symbol/price/change columns, descending change default; retained search, favorites, category and turnover sorting.
- Added separate latest-trades tape (time, side, price USDT, base quantity), sourced from local fixtures rather than account orders.
- Removed derivative account-mode row from spot; paired each buy/sell action with its balance and capacity summary, added input unit suffixes, retained fixed actions and scrollable inputs.
- Separated instrument base volume and USDT turnover.
- Verified local browser at 1280px and 390px: no document horizontal overflow, buy-only 14 levels, both sides 14 levels, 18 trade prints, limit price inputs, sell quantity retained across resize.
- This correction does not claim full GMXX parity: original order-record cards remain; reference authenticated empty orders did not expose populated record details. Chart retains candlesticks and volume without technical indicators by prior request.
- Unverified for this correction: actual touch/virtual keyboard, landscape phone, 200% browser zoom/system text enlargement, safe-area devices, high contrast/reduced-motion runtime, all six language layouts, full keyboard navigation and submission/overlay regression. Required follow-up is manual testing of these input and viewport cases.

## Final cleanup and market picker
- Removed extra product navigation strip, market disclosure, network/ticker footer, one-year timeframe, inert account-mode labels and extra book heading per user feedback.
- Market picker uses category tabs, local search, price/change columns, existing dark/lime palette and no green selection outline. The currency icon now sits inside its trigger.
- Desktop verified: category switching does not commit; ETH search + Enter changes route; Escape retains selection; selected row outline is absent and search border is neutral.
- Final icon placement was build-checked but not visually rechecked. Mobile picker, 200% zoom, actual touch/virtual keyboard, high contrast and full keyboard traversal remain unverified.
- Final checks: root build passed; 38 tests passed; six locales have 3979 keys; git diff --check passed.
