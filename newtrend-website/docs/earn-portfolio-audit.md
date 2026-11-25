# My Earn comparison and list verification

Reference: https://newtrendcapital.com/zh-TW/earn/my-earnings
Local: /NewQuantCapital/earn/my-earnings
Date: 2026-11-25

The reference account exposes empty holdings, subscriptions, redemptions and rewards tabs. The visible navigation, heading, USD overview, amount visibility control, tab labels and empty states were inspected. Populated source records and their dialogs were unavailable; populated rows are not claimed to be pixel-identical to an observed source state.

Following the user's explicit feedback, holdings and all record tabs use a single continuous table/list, with aligned desktop columns and wrapped labeled fields on narrow screens. Holdings are not a grid of individual cards. Summary retains the reference overview panel.

Local fixtures contain 6 holdings, 8 subscriptions, 4 redemptions and 10 reward records, covering flexible/fixed, active/matured/redeeming, pending/rejected/completed and paid/accrued states. Dates are relative to initialization. Data is in-memory and resets on reload. Subscriptions and simulated redemptions update the same store; no financial request is sent.

## Verified

- Browser desktop 1280 × 720: continuous holding rows, summary, subscription rows and load-more (8 records).
- Browser 390 × 844: wrapped continuous list; document width equals viewport width (no horizontal page overflow).
- Browser 844 × 390: holding details retains fixed title/close/footer and scrollable body; Escape closes.
- Browser mock partial redemption: 3,000 USDT reduces principal from 12,000 to 9,000, proportional accrued reward from 36.9 to 27.675, and inserts a completed redemption with 9.225 reward. Summary updates; success shows no stale validation error.
- Browser details shows updated principal/accrual and subscription/settlement dates. No captured console errors.
- Pure business tests cover fixture isolation, derived totals, partial redemption/idempotency, invalid amounts including excess precision, locked/processing rejection, explicit early-redemption confirmation, forfeited reward, matured payout and valuation removal.

## Unverified acceptance cases

Real devices/touch, virtual keyboard, safe-area hardware, 200% zoom and text enlargement, all six languages with long text, forced colors, reduced-motion runtime, exhaustive Tab/Shift+Tab and focus return, backdrop resistance, nested overlays, and open-form breakpoint state retention require dedicated runtime checks. All four populated tabs and early/matured redemption branches have not received exhaustive browser interaction coverage. Shared overlay behavior is reused; this is not a claim that every shared interaction was retested. Backend/network failures are not applicable to these synchronous local mocks.
