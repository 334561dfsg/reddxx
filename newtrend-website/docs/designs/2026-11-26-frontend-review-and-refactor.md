# NewQuantCapital front end — review and refactor plan (2026-11-26)

Scope: `newtrend-website/` (public site). Four read-only reviews (mock/state, components, CSS, robustness);
key claims were re-verified in code before inclusion. Tests 77/77 and locale check pass at review time.

## Findings

### A. Rule violations and real bugs
| # | Finding | Where |
|---|---|---|
| A1 | Mock profile (name, KYC, 2FA, devices, joint account) persisted in `localStorage` (`nt-account`) — violates "no mock data in browser storage" | `src/account.js:3-5` |
| A2 | App fails to mount if storage is blocked (unguarded `localStorage/sessionStorage` at import) or the locale chunk fails (`await` without catch) | `i18n.js:30,50`, `session.js:3-8`, `main.js:59` |
| A3 | Fund records page lists `session.orders` (trading fixtures) — trades render as blank "Completed" rows; deposit/withdraw/transfer push untyped rows into the trading store | `Assets.vue:12,14`, `DepositPage.vue:57`, `Content.vue:16` |
| A4 | Earn shows/validates a 100,000 balance in every asset ("100,000 BTC"); per-user quota checked per order, not cumulative; validation toast fires on each keystroke | `EarnSubscription.vue:16-37`, `earnProducts.js:21-22` |
| A5 | Lending network errors surface raw keys (`lending.errors.Failed to fetch`) | `LendingPanel.vue:32`, `LendingOrderDetail.vue:25` |
| A6 | Unknown routes render blank bodies, wrong pages or silently redirect (`/earn/x`, `/ai-quant/x`, `/assets/x`, `/trade/futures/FOO`) | `Finance.vue`, `Quant.vue`, `Assets.vue`, `TradeWorkspace.vue`, `main.js` |
| A7 | C2C fiat filter toggles but never filters | `C2CQuotes.vue:9-23` |
| A8 | Strategy action resolves the account after the 650ms wait (mode switch mid-action hits the other account); repeated identical success toasts don't re-show | `MyStrategies.vue:33`, `TradeRecordsPanel.vue:20` |
| A9 | Pairs without volume render `NaN` turnover | `data.js:10`, `TradeWorkspace.vue` |

### B. Mock data architecture
- Seven independent "wallets" (Earn, trading, Assets, Quant Fund, strategies, C2C, lending) never reconcile; trading never debits cash.
- Real/demo separation exists only in AI Quant; trades, Earn holdings and C2C orders show in both modes.
- Fixed seed date mixed with live `Date.now()` → interest estimates and maturities drift from the next day; a seeded fund order violates its product minimum.
- Different prices per domain (BTC 60742 / 60120 / 59125 / 50000).
- Mock fixtures/logic inside components (C2C sell quote, trade order rules, strategy `mode` set after the factory).
- Missing lifecycles: options never settle, C2C sells lock funds forever.

### C. Components
- `Overlay.vue` (28KB) owns 23 modal types in one v-if chain plus per-flow dirty state and footer buttons; dead `order`/`subscribe`/`loan`/`c2c` paths.
- `Account.vue` (37KB) serves 12 routes with one shared form; `Content.vue` mixes charity/copytrade/withdraw/messages/404 and keeps dead deposit branches.
- Orphaned: `Chart.vue`, `OptionsOrder.vue`, `RecordDatePicker.vue`, `trading/TradeMarketList.vue`, `trading/TradeRecentTrades.vue`.
- Duplicates: 3 coin-icon resolvers, 4 icon systems + many inline SVGs, 7 money formatters, 6 date formatters (timezones differ), 3 summary cards, ~10 status chip variants, ~10 empty states, 6 back links, 3 language switchers, 2 forked Ant Select themes.
- Shared FeedbackToast/lending imported via `../../../src/...` outside the site root.

### D. CSS
- 469 `#site-shell #main-content` prefixes (282 in quant-fidelity.css), 19 doubled-class selectors, 115 `!important`.
- Hundreds of same-file redeclarations from appended "correction blocks"; ~300 dead rules (e.g. old `.qf-summary-*`, `.ms-stats-*`).
- Cascade order depends on navigation (domain sheets imported by lazy pages; quant/strategy sheets become global via Overlay).
- `source-theme.css` (222KB) ~95% unused; includes unused OverlayScrollbars CSS.
- Tokens bypassed: `#05070b` ×129, `#a5ff4a` ×43, font stacks ~120×; near-duplicate greys/reds/greens; three token namespaces.
- Global 2px accent focus ring still in `styles.css` contradicts the no-ring rule (44 local cancellations, several live rings).

## Refactor phases (each independently verifiable and committed)

1. **Rules & bugs** — A1–A9; delete orphaned components and dead branches; mount resiliently. ✅ Done 2026-11-26 (see AGENTS.md "Refactor phase 1 conventions").
2. **Mock layer** — `src/mock/` kernel: single clock, seedable ids, one price snapshot, per-mode/per-currency ledger;
   domain stores with pure commands (validate → mutate, `requestId`, `mode`); seeds replayed through commands; status derived from the clock.
   Lending stays on the shared server mock (also used by admin) but goes through the same mode/clock conventions. ✅ Done 2026-11-26 (see AGENTS.md "Refactor phase 2"; lending intentionally unchanged).
3. **Components** — `components/ui` primitives (CoinIcon, Icon registry, StatusTag, BackLink, EmptyState, SummaryCard, RecordList, NtSelect), `utils/format.js`,
   `useLocaleSwitch`; split Overlay into host + registry; split Account/Content into pages; named routes per page; `@shared` alias.
4. **CSS** — `styles/index.css` with `@layer` order and one tokens file; delete dead rules and unused vendor CSS;
   remove id prefixes and correction blocks domain by domain; single non-ring focus cue.
5. **Tests & docs** — kernel, routing table, seed validity, earn eligibility, mode switch; update AGENTS.md.

Verification per phase: unit tests, locale/feedback checks, build, and before/after screenshots of every affected route at 1440/1917px.
