# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Source layout fidelity (user decision, 2026-11-24)

This standalone public website is exempt from any inherited requirement to stretch every page to the full screen. Match newtrendcapital.com page-specific centered containers and horizontal gutters. Measured desktop maxima: news/assets 1400px; profile/help/legal 1280px; earn/AI Quant/reward tasks 1440px; referrals 1080px; security/KYC/joint-account forms 768px. Preserve full-width backgrounds where the source uses them, while centering the inner content. Do not apply these exceptions to the existing admin application.

## Brand (user decision, 2026-11-24)

Use NewQuantCapital for the prototype brand, including header/footer wordmark, navigation entry and browser title. Use the local lime monogram `newquantcapital-mark.svg` for its mark and favicon. Keep source-document attribution and provenance intact.

## Localization (user decision, 2026-11-24)

Use module-based packs in `src/locales/<locale>/<namespace>.json` and fixed `t`/`$t` keys. Do not reintroduce source-text reverse lookup, alias tables, regex sentence matching or concatenated translated sentence fragments. Parameterize dynamic values. Keep news/legal content in `src/content/`. Run `npm run check:locales` from this subproject after language changes. See `src/locales/README.md` for maintenance rules.

## Homepage ticker motion (user decision, 2026-11-24)

Use two equal, non-shrinking groups for the homepage quote ticker, with fixed 288px slots so live updates cannot change track width or the loop boundary. User found the source-like ~120px/s too fast; revised speed is 60px/s. Derive loop distance and duration from the same item count; never restore a fixed 90s/225s duration for an arbitrary track width. Both copies must show identical current data and spacing, including the seam.

## Prototype presentation (user decision, 2026-11-24)

Do not show the global local-demo / simulated-market / no-live-trading caption in the prototype UI. Keep implementation and integration limitations in project documentation rather than a persistent page caption.

## Product scope (user decision, 2026-11-24)

Copy trading is temporarily excluded from the prototype. Do not expose its desktop/mobile navigation or trading-terminal entry. Direct copytrade URLs redirect to the same-language homepage. Retain inactive implementation and locale content for possible later restoration.

## Trading terminal width (user decision, 2026-11-24)

Do not apply the 1280px three-column options layout to wide desktops. At >=1600px, place market list, chart, vertical order book and order form in four columns, and keep the records region visible beneath them within normal-height viewports. Preserve form selections and values when moving the book below the chart at narrower widths. The reference screenshots may show futures selected; keep the route's actual order-form semantics when matching the common terminal layout.

## Trading mode navigation (user feedback, 2026-11-24)

Keep the market-list tabs equally sized with a sliding underline; order-form tabs use padded text with active color, without an underline. Shared search, tab, sort-header and panel geometry must remain stable when changing futures/options/spot. Do not restrict shared terminal styling to the options route.

## Trading visual fidelity (user feedback, 2026-11-24)

Match reference typography, line heights, borders, backgrounds, scrollbars and spacing using measured computed styles. Shared terminal rules live in `src/styles/trade-fidelity.css`: list name/price 14px/20px, secondary values 12px/16px, row height 52px, scrollbars 3px, panel gap 4px, divider white 8% mixed with #05070b. Preserve these across modes rather than independently restyling them.

## Trading actions (user feedback, 2026-11-24)

Futures/spot buy and sell actions remain anchored at the bottom of the order panel. Keep the mode tabs and action footer outside the form's scroll container; only form fields scroll. Constrain the panel to available viewport height so short windows retain reachable actions.

## Record filters (user feedback, 2026-11-24)

Use the shared RecordFilter for the trading-record symbol and position-side filters. Symbol selection is an explicit searchable panel with the full market list; side selection is select-only. Match the 224px search popup, fixed search header, scrollable options, checkmark, and dark border. Portal popups outside scrolling records and flip above the trigger when space below (excluding the bottom ticker) is insufficient. Search and keyboard navigation do not commit until explicit selection.

## Per-tab record filters (reference verified, 2026-11-24)

Drive filters from `src/utils/recordFilters.js`, not the trading route mode. Futures positions/current orders use symbol + position side; position history adds opening dates; futures order history adds order dates. Options use all/in-progress/settled + symbol + up/down + order dates. Spot open orders use symbol + buy/sell; spot history adds order dates. Preserve independent filter state per tab and filter records by product and category before applying user filters.

## Trading calendar (reference measured, 2026-11-24)

RecordDatePicker replaces native date inputs. Reference uses a 250px-wide dark single-month popup, 12px padding/radius, 32px cells, 8px week gaps, English month and Sunday-first weekday headers even in zh-TW, lime selected days and a rounded today background. Keep date-range constraints, arrow/Home/End/PageUp/PageDown navigation, Escape cancellation, focus return and viewport flipping. Calendar table cells must reset global table borders.

## Record filters removed (latest user decision, 2026-11-24)

This supersedes the per-tab filter and calendar presentation requirements above: remove the entire filter row from every trading record tab, including option status pills, symbol, direction/position side, and date controls. Keep the seven record tabs and their corresponding record categories; no hidden user-filter state may continue restricting results.

## History reference and mock data (user decision, 2026-11-24)

History records now follow GMXX: delivery history at `/layout/contractTransaction`, perpetual commission/transaction history at `/layout/standardContract`, and spot history at `/layout/spotGoods`. Keep the existing seven tabs and no filters. Use header badges plus labeled value columns and five-record pagination. `mockTradeHistory.js` contains synthetic data, never copied account records. Match fields by product: option open/close/fee/amount/PnL; futures history execution/PnL/value/fee/close/quantity/time; futures order history order time/quantity/price/average/fills/type/status; spot transaction time/order quantity/fills/average. Retain the NewQuantCapital terminal palette.

## Current records and local actions (user decision, 2026-11-24)

Extend the GMXX-style record cards to current futures positions, current futures orders and spot orders. Seed synthetic records in `mockCurrentTrades.js`; never copy private reference-account data or submit reference-site trades. Full-position close and order cancellation use the shared confirmation overlay with cancel focused initially. Confirming moves the record into its corresponding history, preserves original terms, calculates close fees/net P&L, and announces the result. Cancellation/Escape must not mutate records; repeated confirmation must not duplicate history. Fixtures reset on full page reload. Keep all previously removed filters absent.

## Stable record layout (user feedback, 2026-11-24)

Record-tab selection must not change scale, border dimensions, font weight, or flex width. Use an absolutely positioned underline. Current and historical cards share `src/styles/trade-records.css` for padding, header/action height, label/value gaps, scrollbar gutter and footer space. Keep the record panel's height independent of selected category or row count, with body-only scrolling and reachable fixed pagination. Preserve responsive field wrapping.

## Order-form fields reference (user decision, 2026-11-24)

Use GMXX only for order-form fields, product semantics and conditional display; keep the current NewQuantCapital fonts, colors, borders, spacing, controls and anchored action footer. `TradeOrderForm.vue` owns independent futures/options/spot drafts. Futures shows available quantity, limit-only price, leverage, USD notional, percentage shortcuts, max openable, initial margin, fee and optional TP/SL. Delivery/options shows direction, asset, available, minimum, fee, eight reference periods/rates and estimated return. Spot preserves separate buy-USD/sell-base inputs, limit prices, percentages and available-to-buy/sell summaries. All three use body-only scrolling and fixed actions. Reference account balances must never be copied; use local fixture balances and local confirmation/record creation only.

## Order-form funding links removed (user decision, 2026-11-24)

Do not show the deposit, withdraw or transfer shortcut row inside any trading order form. Keep funding access through the existing global Assets navigation.

## Custom trading selects (user decision, 2026-11-24)

Trading order forms must not use native HTML select popups. Use RecordFilter's field variant for leverage and delivery period: trigger-width dark portaled list, lime committed/check state, subtle active highlight, viewport flipping, thin scrollbar and select-only keyboard semantics. Preserve the current value on Escape/outside/Tab; only explicit option or Enter/Space selection commits.

## USDT trading denomination (user decision, 2026-11-24)

Crypto market pairs use /USDT, and trading quote amounts, margin, fees, P&L and confirmation messages use USDT in all six locales. Existing legacy /BTCUSD-style URLs remain supported, along with /BTCUSDT aliases. Spot sell quantity remains denominated in the base asset (e.g. BTC); do not relabel base quantity as quote currency. Preserve actual forex instrument identities.

## Unified order controls (user decision, 2026-11-24)

All order-form text inputs and custom select triggers share `src/styles/trade-form-controls.css`: 40px desktop minimum height, 44px coarse-pointer minimum height, 14px/20px type, 12px radius, 12px horizontal padding and identical background/focus treatment. This narrowly namespaced stylesheet overrides legacy terminal input compaction. Keep validation borders distinct without changing geometry.

- 用户决定（2026-11-24）：三个交易模式均显示顶部收藏星标，与列表收藏状态同步；收藏按本项目 localStorage 键保存，刷新和切换模式后保留。

## Locale-free URLs (user decision, 2026-11-24)

Use `/newtrend/` with no language segment for every page. Language changes update local preference and document language without replacing the URL or remounting the page. Legacy locale-prefixed links redirect to the equivalent locale-free route while retaining query/hash. Asset account routes such as `/newtrend/assets/overview` must not be mistaken for static asset files.
