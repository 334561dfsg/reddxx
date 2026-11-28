# Prototype Instructions

## Site-wide denomination (user decision, 2026-11-25)

Use USDT for public-site account balances, valuation, Earn, Quant, lending, C2C quotes, fees and related dialogs in all six languages. Remove duplicate currency choices when consolidating legacy USD account entries into USDT. Preserve legacy route IDs and actual forex instrument identities, plus attributed news/legal source content; those are not account denomination labels.

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## C2C uses real fiat (user decision, 2026-11-27)

Explicit exception to the site-wide USDT denomination above: C2C quotes are per coin + fiat + side (id `${symbol}-${fiat}`), and the quote price, 按金額 amounts, estimates, confirmations and order amounts are in that fiat, paid or received off-platform. Supported fiats (same as the admin): USD, EUR, GBP, HKD, SGD, JPY, AUD, CNY. Seed quotes match the admin C2C mock (buy USDT/USD, USDT/EUR, BTC/USD, ETH/USD, USDC/USD, SOL/USD; sell USDT/USD, USDT/EUR). The 法幣 filter lists the fiats present; selection is by quote id. Fiat is shown as a neutral code chip (`.c2c-fiat-code`), never a flag or logo. Balances, Earn and every other product stay in USDT; ledger effects are unchanged (buy approval credits the coin, a sell locks the coin). Every buy and sell also collects payer details like the reference 創建 C2C 訂單 form: 您的國家 (plain text input, ≤ 64), 匯款人姓名 (≤ 64) and 郵箱 — no 支付方式 row (user decision 2026-11-27); checked on submit with toast + `aria-invalid` (the form is `novalidate`, no browser bubbles) and stored on the order as `payer: {country, name, email}`, shown in the order detail.

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

Match reference typography, line heights, borders, backgrounds, scrollbars and spacing using measured computed styles. Shared terminal rules live in `src/styles/trade-workspace.css` (the former `trade-fidelity.css` was merged into it): list name/price 14px/20px, secondary values 12px/16px, row height 52px, scrollbars 3px, panel gap 4px, divider white 8% mixed with #05070b. Preserve these across modes rather than independently restyling them.

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

## Dedicated trading pages (user decision, 2026-11-24)

Supersedes the combined seven-tab terminal and wide-screen four-column rules for newtrend only. Follow GMXX page composition: perpetual/delivery with chart, book and right-hand order panel; spot with left book, center chart and dual buy/sell form below, right market list. Preserve NewQuantCapital visual language. Each page shows only its own current/history records, including separate current/settled delivery tabs. Preserve per-product draft/view state on route changes, persistent favorites, USDT and existing safeguards. Keep the root shared service and locale-free routes. Trading V2 is unchanged.

## Reference-only trading scope (user decision, 2026-11-24)

Reproduce GMXX trading page structure/content/interaction without unsolicited product additions. Retain the existing visual style and explicit prior requirements (persistent favorites, USDT denomination, no technical indicators, fixed order actions and overlay safeguards). Do not restore the extra product heading/navigation strip, market-disclosure panel, terminal network/ticker footer, one-year chart period, or inert simple-mode/account labels. Spot sidebar is a plain three-column quote list; search remains in the existing instrument picker.

## Unified three-column spot layout (user decision, 2026-11-24)

Spot now follows the same responsive grid as perpetual and delivery: chart left, order book middle, buy/sell form right, records below. Remove the spot market-list/latest-trades sidebar. Keep both buy/sell forms, separate drafts and fixed actions accessible in the narrow form column. This supersedes the prior spot-specific composition; Trading V2 is unchanged.

## Trading record mock coverage (user request, 2026-11-24)

Keep synthetic samples in every current/history tab across perpetual, delivery and spot. Include both directions, pending and partially filled orders, profitable/loss-making positions, settled delivery outcomes and spot cancellations. Current delivery cards must not display invented settlement values. Partial cancellation preserves executed quantity and its fee, and confirms only the remaining quantity. Current fixtures are session-local snapshots; refresh resets them, and they do not auto-settle. The user's later authorization permits test-only reference orders, superseding the earlier blanket prohibition above; never submit actual financial trades or copy account data into fixtures.

## Trading energy category (user decision, 2026-11-24)

The trading pair selector replaces stocks with Energy across all three products. Use the trading-specific catalog with WTI/USDT, BRENT/USDT and NG/USDT synthetic quotes; do not merely relabel stock instruments as energy. Keep the existing terminal styling and USDT quote convention.

## Customer support drawer (user decision, 2026-11-24)

Customer support opens from the right as a 448px maximum, full-height drawer, matching the provided screenshot. Keep a fixed title/close header, scrollable body and three dark rounded channel cards (live chat, WhatsApp, email) with lime icons. Reuse the root native modal owner; backdrop clicks must not close it. WhatsApp has no configured destination; report channel unavailability instead of inventing a number. Chat remains prototype-only.

## Header menu corners (user feedback, 2026-11-24)

Use 12px outer corners and 8px menu-item corners for shared header popovers (Trade, Finance, AI Quant and profile), consistent with the compact terminal panels. Do not restore the oversized 28px popup corners.

## Site-wide corner scale (user decision, 2026-11-24)

NewQuantCapital uses shared radius tokens: `--nt-radius-panel` 12px for cards, menus and dialogs; `--nt-radius-control` 8px for fields and menu items; `--nt-radius-sm` 4px for compact tags and details. Larger source-theme radius utilities resolve to the panel token. Preserve circular avatars/icons, pill actions, intentionally square drawers and chart geometry. Apply this to the public site only, not admin or Trading V2.

## Unified public page widths (latest user decision, 2026-11-24)

This supersedes the earlier page-specific source widths. Public browsing pages (C2C, Earn, assets, AI Quant, news, charity, legal, profile, referrals, rewards, detail pages and home sections) share a 1400px outer container, centered with 24px horizontal padding (16px below 768px), including safe-area insets. Use `styles/site-containers.css` and its tokens. Keep trading full-width and focused account forms at 768px; preserve readable internal prose and authentication form layouts. Header remains full-width; footer content aligns with the shared page content edges.

## Live chat sidebar (user reference, 2026-11-24)

Selecting live chat replaces the support channel list with a chat view in the same drawer. Keep queue status under the fixed header, a centered welcome in the scrollable message area, and a fixed bottom pill composer with emoji, attachment and send controls. Messages/attachment names remain local prototype state, with no network upload or support delivery. Do not reintroduce the previous central message form.

## Shared spacing and typography (user decision, 2026-11-24)

Use `docs/design-system.md` and `styles/site-design-system.css` for site-wide typography, spacing and control dimensions. Page titles, section headings, card headings, body and captions have distinct shared tokens; avoid local inline heading sizes. Normal cards share padding and page grids share gaps, with compact trading and readable marketing/article/form layouts as documented exceptions.

## Public image size (user decision, 2026-11-24)

Compress newly added raster images before shipping. Prefer WebP for photographic/mockup assets, preserve transparency and legible text, and verify image references after conversion. The homepage phone header must read NewQuantCapital. Do not ship the generated PNG when a visually verified compressed WebP is available.

## Public URL prefix (user decision, 2026-11-24)

Serve this site at `/NewQuantCapital/` (case preserved), replacing `/newtrend/`. Keep the source folder `newtrend-website` unchanged. Root Vite dev/preview, build output, router history, asset paths and deployment rewrites use the branded prefix; legacy `/newtrend/` URLs redirect while retaining the subpath.

## Earn source fidelity (latest user request, 2026-11-25)

For `/NewQuantCapital/earn/simple`, its product details and subscription dialog, reproduce the reference's layout, icons, visible product content and interactions. This scoped request supersedes the shared geometry/type/corner simplification for these Earn surfaces: list outer max 1440px, detail content 960px, source rounded cards and pill controls. Keep NewQuantCapital branding, existing safety semantics, the prior removal of separate daily-rate sort buttons, and all other pages' shared design scale. Reference product names/descriptions are English even in zh-TW; preserve that content while keeping interface labels localized. Never submit reference-site financial actions. Product snapshots are public reference data; balances and subscription actions remain local prototype state.

## My Earn records use lists (user feedback, 2026-11-25)

Use compact table/list rows for holdings, subscription orders, redemptions and reward history on `/NewQuantCapital/earn/my-earnings`. Do not display holdings as a grid of independent cards. Preserve comparable columns and row-level actions; narrow layouts may wrap fields within the same contiguous list. Seed synthetic local records for varied statuses; never copy private reference-account records. The overview remains the source-style aggregate panel.

## C2C buy source fidelity (user request, 2026-11-25)

Reproduce `newtrendcapital.com/zh-TW/c2c/buy` at `/NewQuantCapital/c2c/buy`, including the four navigation entries, asset/fiat filter pills, quote grid, timer, empty order panel, selection, amount modes and agreement. This scoped request supersedes generic page geometry/radius/type simplification for this buy surface (1440px outer width, 32px desktop gutters, 24px card corners). Retain NewQuantCapital branding and the prior USDT denomination decision. Public quote snapshots and local mock renewal are not a live feed; never submit reference-site transactions. Keep confirmation and generated orders local, preserve the demo-mode safeguard, and use the shared overlay owner.

## Complete C2C module (user request, 2026-11-25)

Extend the C2C source-fidelity scope to buy, sell, orders and payment accounts. All four share the same navigation and visual scale. Sell quotes currently contain USDT only (public snapshot 0.99); require an active matching payout account. Keep buy/sell drafts and order filters across tab navigation. Accounts support local create/edit/delete; existing order snapshots must not change when an account is edited, and an account used by an in-progress sell order cannot be deleted. Simulated sell creation locks local available quantity once; duplicate processing and insufficient balances must fail without partial mutation. Orders show direction/asset/status filters, pagination and read-only details. Keep all balances, accounts and orders local until backend integration is explicitly requested.

**Superseded 2026-11-27 (user decision): no payment accounts.** The 收款帳戶 section, its routes (`/c2c/payment-accounts`, `/c2c/accounts` now redirect to `/c2c/buy`), the sell payout-account field, platform receiving accounts, proof upload and matching statuses are removed. C2C is three sections (買入 / 賣出 / 我的訂單). Every buy and sell is submitted for back-office review (`pending_review`); a sell locks its coin at submission. The back office approves (buy credits the coin, the sell's locked coin is deducted) or rejects (sell unlocks); the user may cancel a pending order from 我的訂單 (取消 → `account-confirm`, destructive; a sell's lock is refunded once). Statuses are only 待審核 / 已完成 / 已拒絕 / 已取消, and the status filter applies to both sides. The public mock does not share live state with the admin C2C module.

## Lending source fidelity (2026-11-25)

Reproduce the public reference `/zh-TW/earn/loan` at `/NewQuantCapital/earn/loan`: 1440px outer container, 32px desktop / 24px narrow gutters, pill navigation, source hero and daily-rate-first cards, term chips, and dedicated borrow route. Scope exceptions to shared geometry in `styles/lending-fidelity.css`. Preserve NewQuantCapital/USDT naming and Mock API integration. Product count, actual rates, amount limits and allowed term ranges remain controlled by admin data; never hard-code the reference's single USD product or override configured terms merely for a screenshot. The reference borrow detail was KYC-blocked; unseen application fields are the existing Mock flow, not verified reference UI. Never perform reference-site borrowing or identity submission.

## No highlighted selection/focus borders (user decision, 2026-11-25)

Do not add highlighted borders, outlines, outer focus rings, focus shadows or double borders for selected, focused or expanded controls/cards. This includes green accent rings and gray/white replacement rings. Keep ordinary structural borders unchanged across these states. Use background, text weight/color, check marks or underlines to distinguish selection and keyboard focus without an outer ring. Preserve keyboard operation, ARIA, validation messages and a visible non-border focus cue. Apply this convention to subsequent UI work, including library default focus styles; never reintroduce rings as an accessibility substitute when a surface/text cue can serve that purpose.

## Standalone public loan details (2026-11-25)

My Loans opens `/earn/loan/order/:orderId` as a dedicated page, not a dialog or an expanded list row. Match Earn's dark rounded panels and amount hierarchy, group debt, rates/term, timestamps, collateral and repayment records. The top return link restores the list's status group and page. Pending cancellation belongs in the page action area with explicit confirmation; there is no dialog Close action. Keep Mock API ownership, pending/no-interest semantics, toast feedback, duplicate-operation protection and non-border keyboard focus cues.

## Toast-only operation feedback (2026-11-25)

Follow the root AGENTS.md operation-feedback rule across all public pages: success, failure and validation results use toast, never a visible inline error/success paragraph, banner or card. Use Ant Design message or the shared FeedbackToast adapter; never both for the same result. Keep drafts, validation/ARIA, retry and next-step links. Native-dialog toasts must render inside its top layer and clean up on close. Business statuses, record data, static requirements, empty/loading content and intentional confirmations remain page content. Run the root `npm run check:feedback` guard before completing related changes.

## Strategy template source fidelity (2026-11-26)

Reproduce `/zh-TW/ai-quant/strategy` at `/NewQuantCapital/ai-quant/strategy`: public nine-template catalog, hero, featured templates, style/market filters, eight sort options, right-side details and subscription form. Preserve NewQuantCapital branding and USDT denomination. Use the shared overlay owner and custom select, toast feedback, non-border focus cues and original English product descriptions. Strategy subscriptions own independent in-memory mock records and balance; never mix them into Earn or Quant Fund subscriptions. No reference-site transactions, live trading, accrual engine or admin configuration integration is implied. See `docs/designs/2026-11-26-strategy-template-fidelity.md` for scope and verification limits.

## Finance / AI Quant typography re-measure (user request, 2026-11-26)

Finance and AI Quant pages were re-measured against `newtrendcapital.com/zh-TW` at 1440px (computed styles). The source values now win over the earlier unified Finance heading: Earn catalog and Loan market restore the source hero (eyebrow, Syne 48/48 or 36/40 title, description) and 40px gaps between major blocks; the Earn holdings panel shows only when signed in. AI Quant landing, Quant Fund and positions use `styles/quant-fidelity.css` (1440px container, 32px gutters, Syne headings, 24/32px card corners, lime CTA instead of the teal gradient). Corrections are appended as dated blocks at the end of `earn-fidelity.css`, `earn-portfolio.css`, `lending-fidelity.css` and `strategy-fidelity.css`; keep 13px/11px one-off sizes out of these pages. Pages behind the source login (My Earn, My Loans, borrow form, order detail, Quant Fund) follow the public pages' tokens rather than a verified source layout. Strategy catalog cards follow the source anatomy: one-line title and description, a divider footer with the model chip on the left and a compact subscribe pill on the right; clicking the card opens the strategy detail as a right-side drawer (448px, full height, square corners, white full-width subscribe button), not a centered dialog. Overlay.vue's scoped `.nt-dialog` rule outranks single-class variants, so drawer geometry must use the doubled `.nt-dialog.nt-dialog.strategy-detail-drawer` selector. Not changed: the strategy hero chart (source shows a multi-line grid chart) and badge icons.

## AI Quant reference logic (source-code audit, 2026-11-26)

Both AI Quant channels follow the reference front-end logic (read from its public JS; the pages themselves sit behind login). Strategy: featured = best Sharpe per style (conservative, balanced, aggressive) topped up to three; capital sort ties fall back to maximum capital and period ties to maximum days; the hero stat shows running strategies once the current account has one; strategy accounts and records are separate for real/demo; successful subscription closes the dialog with a page toast; signed-out subscribe remembers the template in sessionStorage (`aiquant:pending-subscribe`), goes to `/login?redirect=…` and reopens it after login. My strategies uses the reference summary/table/expandable daily-stats layout and a stop confirmation with name, red notice and destructive confirm. Quant fund: list hero ring mark, pill asset filters and disclaimer footer; detail CTA and calculator from the reference (day slider only for flexible products); positions use ISO dates, interest progress and 30-day trend, and a right-side order drawer. The quant fund CTA uses the reference teal-to-green gradient, superseding the earlier "lime CTA" note above. Login redirects accept only same-site absolute paths. Redeem, top-up and interest records remain unbuilt because local orders never leave pending review.

## Deposit page (reference measured, 2026-11-26)

`/deposit` uses `src/components/deposit/DepositPage.vue`, matching newtrendcapital.com/zh-TW/deposit: 1152px container, coin/network Ant Design Selects (48px pill, coin icon + two-line label, dot network), yellow voucher warning, address card with copy action, amount/TXID fields and a dashed screenshot upload. Coin networks follow the source: USDT ETH/TRX/SOL/BASE, USDC ETH/SOL/BASE, ETH/BTC/SOL single-chain (DAI ETH assumed). The address stays a non-transferable `DEMO-<NETWORK>-ADDRESS-NOT-FOR-TRANSFER` placeholder; never show a realistic on-chain address. Omit the source's lime open-state border per the no-highlight-border rule. Withdraw is `pages/Withdraw.vue` (see below).

## AI Quant seeded demo holdings (user request, 2026-11-26)

Mirror the reference demo account: My Strategies seeds one running demo record ("Conservative Stock Blue", Blue Chip Index Defender template, 500 capital, 14 days, zero P&L) in `src/server/strategyPortfolio.js`; Quant Fund positions seed one active demo VIP 0 flexible order (4,999 principal, 0.73% snapshot, no interest paid) in `src/server/quantFundPortfolio.js`. Real-mode lists stay empty. Seeds reduce the demo balances and reset on reload; keep the pure account factories empty for tests.

## Quant fund redeem and payout records (user request, 2026-11-26)

Supersedes "Redeem … and interest records remain unbuilt" above. Positions rows carry the reference 操作 column: 贖回 (lime outline pill, running flexible orders only) and 派息明細 (active/settled/redeemed), plus a 預估 accrued line under paid interest. Redeem uses the shared `account-confirm` overlay (title, principal, min-hold notice, 取消/確認贖回) and settles locally at once via `redeemFund`: whole held days, no interest below the minimum hold, already-paid interest excluded, credit only the order's own mode, status-guarded against duplicates, toast result. Fixed-term early redemption is not exposed (reference behaviour unverified). 派息明細 is a standalone page at `/ai-quant/quant-fund/positions/:orderId/interest-records` with back link and empty state. Never submit reference-site redemptions.

## AI Quant ambient backgrounds (user request, 2026-11-26)

All AI Quant pages render `QuantAmbient.vue`, reusing the vendored reference `.page-ambient` / `.page-ambient-grid` rules (noise, top lime glow, 56px masked grid) anchored full-bleed to `#main-content`. Quant Fund list and positions add the reference aurora: a 28s sweep and seven pulsing beams (exact left/width/alpha/duration/delay from the source); strategy, my strategies, landing and payout pages use the grid only, as on the reference. Reduced motion stops the animation. The strategy hero chart is now the reference SVG (grid, five grey traces, dots, lime fit line, pulsing endpoint, D-60…NOW), superseding "Not changed: the strategy hero chart" above.

## Finance / AI Quant card glows and ambient (user request, 2026-11-26)

Reference survey: Earn list and My Earnings put the vendored `.page-ambient.page-ambient-grid` on their 1440px container; Earn product detail has no page ambient. Card glows use `styles/ambient.css` (`.nt-glow-host` + `.nt-glow`): Earn summary/holdings cards 240px lime 40% blur 48; hot product cards 192px lime 12% unblurred; Earn detail card 256px coin colour (~33%, USDT #26a17b) blur 56; AI Quant landing channel cards 256px blur 64 at 50% (strategy lime, quant fund #2bc287). The Finance root carries the ambient classes, replacing the earlier approximate Earn/Loan gradients. `/zh-TW/earn/loan` currently redirects to the reference homepage, so Loan reuses the Earn ambient as its Finance sibling (unverified against a source). Quant Fund detail already matched (grid, existing card glows).

## Strategy and loan ambient (user request, 2026-11-26)

User asked for the fainter reference strategy backdrop on strategy pages (templates, my strategies) and the Finance loan pages (catalog, my loans, borrow): full-bleed `QuantAmbient` grid + glow without beams. A brief beam experiment there was rejected; aurora beams stay only on Quant Fund list/positions. Hosts of the layer become transparent and statically positioned so their own background or 1440px box cannot hide or clip it. The standalone loan order page is unchanged.

## Finance sub-navigation per module (user decision, 2026-11-26)

Do not mix Earn and Loan in one Finance bar. Earn pages (`/earn/simple`, `/earn/my-earnings`) show only 理財產品 / 我的理財; Loan pages (`/earn/loan`, `/earn/loan/my`) show only 借貸 / 我的借貸. Cross-module access stays in the header 金融 menu.

## AI Quant 真實-mode mock records (user request, 2026-11-26)

The reference 真實 account has no strategies or fund positions (checked 2026-11-26 with the user's permission and switched back to 模擬). Locally, 模擬 mirrors the reference demo records and 真實 carries synthetic records so each state is visible: strategies running / paused / completed across stock, crypto and forex templates; fund orders pending review, active flexible VIP 0 and fixed VIP 1, redeemed and matured, with daily payout rows (amount = principal × snapshot rate) feeding 派息明細 and the summary. Seeds are fixed at 2026-11-26, never copied from a real account, and reset on reload.

## Quant Fund positions summary (reference code, 2026-11-26)

Mirror the reference PortfolioSummaryCard: 在持本金 label with an eye toggle that masks amounts (order count stays visible), 36px mono value, green 在持已派利息 line, interest progress only when projected interest > 0, an optional middle 近 30 天派息趨勢 sparkline, three bottom-aligned stats on the right, and a divider-separated 按資產明細 expander with per-asset rows. The trend is the cumulative payouts credited over 30 days and, like the source EarningsTrendSparkline, renders nothing for fewer than two points or a flat series; never draw a flat placeholder line.

## No divider under AI Quant pill navigation (user decision, 2026-11-26)

The reference draws a full-width border under the 量化基金 / 我的倉位 band; the user rejected it. Keep the reference spacing (title at the band's position) but never add that divider line. Positions table, tabs and amounts follow the reference measurements (12/18 rows, 41px header, fixed column widths, compact amounts with a small grey unit).
The 近 30 天派息趨勢 sparkline is removed from the positions summary at the user's request (2026-11-26), even though the reference code can render it; do not restore it.
The 派息進度 progress bar is also removed from the positions summary at the user's request (2026-11-26); do not restore it.
The 按資產明細 per-asset expander is removed from the positions summary at the user's request (2026-11-26); do not restore it.
Positions tabs are layout-stable: fixed table layout with reference column proportions, the 歷史 filter matches the 38px tab bar, and no pending-count badge on 處理中 (user request, 2026-11-26).
The positions 歷史 status filter uses the shared select-only `RecordFilter` field variant (no native select popup), styled 144×38 on the dark tab-bar surface. RecordFilter field popups size themselves by their 36px option rows so short lists show every option without scrolling.
Missing dates in Quant Fund positions, the order drawer and records show a single "—"; never show placeholder text such as 核准後確定 (user request, 2026-11-26). The subscription success line shows only the 審核中 status.
My Strategies omits the 盈虧走勢 column (and its 績效曲線即將上線 placeholder) at the user's request (2026-11-26); do not restore it.
My Strategies row actions follow the reference pills (78×32, #05070b, #1e2023 border, 16px pause/play/square icons, grey 查看統計 with chevron; 停止 keeps white text, its dialog stays destructive). Pause/resume/stop show a per-row loading state: the clicked button swaps its icon for a same-size spinner with aria-busy, the row's other actions are disabled, repeat clicks are ignored, and stop starts loading only after dialog confirmation.
Both AI Quant summaries (Quant Fund positions, My Strategies) render the shared `src/components/PortfolioSummaryCard.vue`, a copy of the reference card: label + eye mask, 36px figure, toned accent line, equal-width bottom-aligned stats on the right (counts unmasked), corner glow. My Strategies: 總投入 / 總損益 accent / 運行中 + 策略總數; its page top spacing matches the reference (title y=235 at 1917px).

## No inline prompts in dialogs/forms (user decision, 2026-11-26)

Supersedes "deposit … links remain discoverable after toast dismissal" above for subscription flows: do not insert inline recovery prompts (e.g. 前往充值) into dialogs or forms after a validation error; they reflow the dialog. The toast alone carries the message. Funding stays reachable through the header Assets menu.

## Toast appearance (user decision, 2026-11-26)

Public-site toasts (Ant Design message, incl. the shared FeedbackToast adapter) use `src/styles/toast.css`: dark #14161a surface, 1px #232529 border, 12px panel corners, soft shadow, white 14px Exo 2 text, palette icons (success #a5ff4a, error #ff4466, warning #fcd34d, info #5fa3ff), positioned 76px from the top so they clear the 64px header. Loaded only by the public entry; the admin keeps its own Ant Design theme.

## My Strategies daily stats (reference code, 2026-11-26)

查看統計 opens a standalone page `/ai-quant/strategy/mine/:recordId/stats` (`StrategyStatsPage.vue`, back link + strategy name, same pattern as Quant Fund 派息明細; the user rejected an inline table expander) rendering `StrategyDailyStats.vue`, following the reference: summary box (淨盈虧 with trend arrow, UTC date range of the listed days, 交易次數, 交易天數), header 日期 / 交易次數 / 虧損↔獲利 / 盈虧, one row per trading day newest first with a centred red/green bar scaled to the largest |P&L| (500ms grow, 25ms stagger capped at 250ms; no motion when reduced), latest 14 days plus 顯示最近 N / 共 M 天. Empty records keep 此區間內尚無已平倉交易。 真實 seeds get deterministic synthetic `dailyStats` from `buildDailyStats` that sum exactly to each record's P&L; the 模擬 record stays empty like the reference.

## AI Quant list pagination (user request, 2026-11-26)

Quant Fund positions, 派息明細, My Strategies and the strategy daily stats use the shared `FinancePagination` + `useFinancePagination` at 10 rows per page (like Loan records). Positions return to page 1 when the tab, history status or account mode changes. Daily stats page through every day (superseding the reference's latest-14 note) while the summary, date range and bar scale cover all days. 真實 seeds carry 12 fund orders and 12 strategies (older history incl. rejected/cancelled orders without interest start or maturity) so paging is exercised.

## Unified list pagination (user request, 2026-11-26)

Every Finance and AI Quant list uses `FinancePagination` + `useFinancePagination`, now defaulting to 10 rows per page: Earn products, holdings, subscription/redemption/reward records, My Loans, loan repayment records, Quant Fund positions/payouts, My Strategies and daily stats. Card grids pass a multiple of their column count instead (Loan product cards: 6). Lists that are empty show their empty state without a pager.

## Refactor phase 1 conventions (2026-11-26)

- Browser storage only through `src/utils/storage.js` (guarded; the site must boot when storage is blocked). Allowed keys: `nt-locale`, market favorites, `nt-visitor` (session), `aiquant:pending-subscribe` (session). Never store mock business data; the mock account (`account.js`) is in memory and old `nt-account` values are removed on load.
- Funding records (deposit vouchers, withdrawals, transfers) live in `src/server/walletRecords.js`, per account mode; never push them into `session.orders` (trading only).
- Earn: per-mode, per-asset wallet in `server/earnPortfolio.js`; per-user quota is cumulative over pending orders + live holdings; `recordEarnSubscription` validates and reserves the balance; validation feedback appears only after a submit attempt.
- Unknown routes, sections and ids render `pages/NotFound.vue` (no silent redirect home); unknown trading symbols rewrite the URL to the pair shown.
- Lending errors go through `utils/lendingErrors.js` (unknown/network codes → `unavailable`).

## No video buttons (user decision, 2026-11-26)

Removed the homepage 了解 AI Quant 運作機制 and strategy 運作機制 video buttons, the Overlay video modal and `public/assets/ai-quant.mp4`. Do not reintroduce video players or "how it works" film entries.

## Refactor phase 2 — mock data layer (2026-11-26)

- `src/mock/`: `clock.js` (single `clock.now()`; seeds are placed relative to `bootAt`, never fixed calendar dates), `ids.js`, `prices.js` (one USDT price snapshot from the market list), `ledger.js` (per-mode, per-asset balances; 模擬 starts 100,000 USDT / 100,000 USDC / 2 BTC / 30 ETH / 500 SOL, 真實 starts empty).
- Every domain moves money only through the ledger: Earn subscribe/redeem, Quant Fund subscribe/redeem/maturity (accounts expose ledger-bound `balances`), strategies subscribe/stop/expiry (ledger-bound `balance`), trading (`server/tradingFunds.js`: lock on order, payout on market fill, close returns margin + P&L − fee, cancel refunds the unfilled lock), C2C sell (`server/c2cStore.js`), Overlay donate/convert. Never hard-code a balance in a component.
- Records are per mode: trades (`tradeOrdersFor`), Earn (`earnPortfolioFor`), C2C orders, wallet records, fund orders and strategies.
- Lifecycles derive from the clock: fixed-term fund orders settle at maturity (`refreshQuantFunds`), strategies complete at their end date (`refreshStrategies`); both run at load and when their pages open.
- Seeds must satisfy product rules (Quant Fund seeding throws otherwise); payout rows are never credited in the future.
- Assets page and header totals come from `server/accountValue.js` (funding wallet + trading margin + Earn holdings + active fund principal).
- Lending stays on the shared server mock (also used by the admin) and keeps its own balances by design.

## Refactor phase 3 — component conventions (2026-11-26)

- Formatting comes from `src/utils/format.js` (`money`, `amount`, `signedMoney`, `dateTime`, `isoDateTime`; dates display in Asia/Manila). Do not add local number/date formatters in components.
- Coin icons: `<Coin symbol set="market|logo">` backed by `utils/coinAssets.js`. Back links: `components/ui/BackLink.vue`. Empty states: `components/ui/EmptyState.vue`.
- Language switching goes through `composables/useLocaleSwitch.js` (busy guard + toast on load failure) in the header, mobile menu and profile.
- Code from the repository root (`src/shared/...`) is imported only through `src/platform/` (`FeedbackToast.js`, `lendingRules.js` — pure, test-safe — and `lendingClient.js`); no deep `../../../src/shared` paths in site code.
- Routes map to their own pages: `/charity` → `pages/Charity.vue`, `/deposit` → `DepositPage`, `/withdraw` → `pages/Withdraw.vue`, `/messages` → `pages/Messages.vue` (the unrouted copy-trade mock was removed; it is in git history before this phase).
- `Overlay.vue` is the single dialog/drawer shell (lifecycle, focus, Escape/unsaved guard, footer). Flow bodies are components that emit `state` (`{dirty, valid, done, confirmLabel}`, or legacy `draft`) into one `flow` object; the footer's primary action comes from the `primary` computed table. Inline bodies live in `components/overlay/` (`MenuDrawer`, `LanguageList`, `SupportChannels`, `VipTiers`, `AmountForm`). Add new dialog types as components, not new inline template branches.
- Donate/convert (`AmountForm`) show the real ledger balance of the current mode and report results by toast; there is no reward estimate for them.
- `pages/Account.vue` is a thin shell (header + route → sub-page map). Sub-pages live in `pages/account/`, own their drafts and are remounted per route (`key`), so leaving a route discards its draft. Their feedback is an explicit toast per attempt via `pages/account/accountForm.js`; shared upload, countdown and copy helpers live there too. Account styles live in `pages/account/account.css`, every rule anchored to the account page roots.

## Refactor phase 4 — CSS conventions (2026-11-26)

- Global styles enter through `src/styles/index.css` only (main.js imports nothing else): source theme → `tokens.css` → `styles.css` → site containers/design system → ambient → toast. Domain sheets stay imported by their pages: their overrides rely on loading after lazily loaded component styles, and a global import was measured to change 4 routes.
- `src/styles/tokens.css` is the only place `--nt-*` values are defined (colour, fonts `--nt-font-body|display|mono`, type scale, spacing, layout, radii). Use the tokens instead of literals such as `#05070b`, `#a5ff4a` or font stacks.
- No `@layer`: Ant Design Vue injects unlayered CSS-in-JS, which would beat every layered site rule.
- Cascade tiers use a single id: base/design-system rules are `#main-content …` (formerly `#site-shell #main-content …`) and domain sheets override them with `#main-content .page …`. The only doubled id (`#main-content#main-content`) is the channel tier in `channel-system.css` and `quant-system.css` (see "Finance & AI Quant channel conventions"); do not add it anywhere else or add new id tiers. Domain sheets load in navigation order, so a selector that two domain sheets both style must be decided by specificity (or set the same value), never by which sheet loaded last (re-checked 2026-11-27: every shared selector is).
- Keep CSS lean with `npm run css:dead` (selectors whose classes/ids never appear in the source; runtime-built names are recognised by their string prefixes/suffixes) and `npm run css:overridden` (declarations a later identical selector always overrides; dvh/color-mix fallbacks are kept). Both are dry runs; `--write` applies. Verify visually after applying.
- Focus: one cue defined in `styles.css` — underline + slight brightening for buttons/links/tabs/options, brightening for inputs and `tabindex="0"` containers, a light surface for icon-only buttons (`button[aria-label]`, `.icon-button`), nothing for `tabindex="-1"` targets. No rule may set a focus outline, ring or focus box-shadow.

## Refactor phase 5 — tests and docs (2026-11-26)

- Routes live in `src/routes.js` with a unique `name` per page route; `tests/routing.test.mjs` resolves the table (unknown sections → `not-found`, legacy and trade redirects). Add new pages there with a name and a test case. `/earn` and `/earn/:section/:id?` are separate records so `/earn/x` is not-found.
- Catalogue facts shared by the UI and the stores (Earn products, strategy templates) live in `src/mock/catalog.js`; `data.js` only adds display names. Store modules must stay importable in Node (explicit `.js` extensions, no JSON/i18n/DOM imports) so seeds can be tested.
- `tests/seeds-and-modes.test.mjs` guards seed validity (Earn holdings/orders vs product limits and terms, strategy seeds vs templates and lifecycle, daily-stats sums), Earn eligibility (simulated profile, blocked subscriptions have no side effects, eligibility snapshot) and per-mode isolation (Earn, trading, strategy balances). New seeds or modes must keep these passing.
- The site README describes the current structure, mock boundaries and the check commands; keep it in step with structural changes.

## Shared UI primitives (2026-11-26)

- Line icons come from one registry, `src/icons/lineIcons.js`, rendered by `components/ui/LineIcon.vue` (`<LineIcon set="earn|lending|c2c|ui" name>`). A set carries the SVG attributes its icons were drawn with; caller attributes override them. Do not add inline `<svg>` icons or per-domain icon components; add a registry entry instead (static shapes only, checked by `tests/ui-primitives.test.mjs`). `Icon.vue` remains for the reference site's image icons (`icons.json`); bespoke graphics (Strategy hero chart, order-book layout glyph) stay inline.
- Order/holding statuses render with `components/ui/StatusTag.vue` (`domain` = earn | lending | quant-fund | strategy). The look and translation namespace per domain live in `utils/statusLabels.js`; use `statusLabelKey()` wherever a status is named elsewhere (filters, details).
- Ant Design Selects go through `components/ui/NtSelect.vue` with a theme `variant` (`pill` = deposit, `field` = lending) defined in `components/ui/selectThemes.js`; all Select props, events and slots pass through. Do not wrap a Select in its own ConfigProvider.
- Hide-amount toggles use `composables/useAmountMask.js` (local state per panel, reference glyph per page).
- Not unified on purpose: the summary cards (PortfolioSummaryCard for AI Quant, EarnPortfolioSummary for Earn) and the record tables replicate different reference designs, so they stay separate components.

## Async API layer and loading states (user decision, 2026-11-26)

The prototype keeps mock data, but pages must already behave like they call a server API so real integration only swaps the transport. Migrate module by module (Earn, Quant Fund, AI strategy, C2C, assets/wallet and trading done; next account).

- Pages and components read and write business data only through `src/api/<module>.js` async functions, never by importing the reactive mock stores. Each function documents the HTTP endpoint it stands in for and must be Node-testable: when a catalogue needs the site's locale-aware names (Earn), the service is a factory in `src/api/<module>Service.js` bound in `src/api/<module>.js`; otherwise `src/api/<module>.js` holds it directly (Quant Fund). Route owners load the routed entity (e.g. `components/quant/QuantFundDetail.vue` loads the product and `pages/quant/QuantFundInterestPage.vue` the order, and render not-found) and pass it to detail views as a prop. All calls go through `src/api/transport.js` `mockCall()`: simulated latency (300–800ms), JSON snapshots, `ApiError{code, params}`. Browser switches `?mock-delay=0|<ms>` and `?mock-fail=<service>|all` are read from the URL only (no storage).
- AI strategy: `src/api/strategy.js` covers both modes (真實 = the shared strategy Mock module via `platform/strategyClient.js`, running in-page as static seed data since 2026-11-27, 模擬 = local). Public pages no longer use `useStrategyFeed`; `pages/Strategy.vue` loads the catalogue and the mode's account with `useRequest` `poll` (5s / 3s) so generated daily P&L appears live (admin edits no longer reach the public site: each page has its own in-memory Mock). Concurrent server syncs are coalesced into one fetch (the shared client keeps only its newest refresh).
- C2C: `src/api/c2c.js` over `server/c2cStore.js`, which now takes the account mode explicitly (`c2cStateFor(mode)`, Node-importable). Order prices come from the server-side quote for the side/symbol; `cancelC2COrder({mode,id})` is state-guarded (pending only) and refunds a sell's lock once. Error codes stay locale keys (`c2cErrorKey`).
- Assets/wallet: `src/api/wallet.js` binds `walletService.js` to the site valuation (accountValues, price snapshot). The overview carries every domain's holdings, so it listens to the 'wallet', 'earn', 'quantFund', 'strategy' and 'c2c' tags. Deposit, withdraw, transfer, convert/donate (AmountForm) and the header asset-menu total go through it; validation codes are locale keys (`walletErrorKey`).
- Trading (user decision, 2026-11-26: live prices): market data comes from a simulated WebSocket, `src/api/marketStreamService.js` (bound in `api/market.js`): channels `tickers`, `ticker`, `depth`, `kline` — snapshot per subscription, then pushes every second (random walk); connection status with automatic reconnect and fresh snapshots. Components use `composables/useMarket.js` (`useTicker/useTickers/useDepth/useKline`, resubscribing only when the market/interval value changes). Prices, 24h high/low, order book, OHLC and the chart are skeletons/overlay until their snapshot; open positions' P&L marks to the live price. Orders, close/cancel, balances and records go through `api/trade.js` (`tradeService.js`); market fills and closes use the stream's last price. While the stream is not open the instrument bar shows the connection state and order submission is held with a toast. Debug: `?mock-fail=market`, `?mock-stream=flaky`.
- Home: the ticker strip, hot-stock cards and market table read the same market stream as the trading pages (`useTickers`, catalogue `streamMarkets` in `api/market.js`); rows keep the full catalogue with null figures until the snapshot. No pause/resume control (user decision, 2026-11-26); the ticker strip still pauses on hover. Home insights load through `api/news.js`. `useDemoQuotes` was removed.
- Loads use `composables/useRequest.js` (`status` loading/error/ready, key change resets, `refresh`, stale-response guard, `tags` + `invalidate()` for in-place refresh after a mutation). Writes use `useMutation()` (one in flight). After a successful write, `invalidate('<module>')`.
- Skeletons must not shift the layout (user feedback, 2026-11-26): keep static parts real while loading (titles, labels, units, tabs, filters, table headers, back links) and put skeletons only where data goes, with the loaded components' classes and measured heights (inline `Skeleton inline` inside text lines). Compare skeleton vs loaded positions at desktop width before finishing; small data-dependent wrapping differences are acceptable.
- Render loads with `components/ui/RequestState.vue`: skeletons (`components/ui/Skeleton.vue`) shaped like the real layout for the first load, toast + a neutral 重試 action for failures (no inline error text), data otherwise. Background refreshes keep current data on screen.
- `account-confirm` dialogs may return a promise from `onConfirm`: the confirm action shows busy, close paths are held, and a rejection (message = locale key) keeps the dialog open with a toast. When a refresh removes the dialog's trigger, move focus to the same record's remaining action (see QuantFundPositions).
- Dialog flows report `busy` in their `@state`; Overlay then shows `Spinner` on the primary action (`aria-busy`, `aria-disabled`, focus kept) and holds ×, cancel and Escape until the request settles. Inputs become read-only while submitting.

## AI strategy ↔ admin (2026-11-26)

- The strategy catalogue (both modes) is the strategy Mock's listed templates (in-page static seed, the same templates the admin 「AI 策略」 starts from); take-profit/stop-loss ranges and defaults come from each template.
- 真實 records, balance and subscribe/pause/resume/stop go through `platform/strategyClient.js` (user `USR-DEMO`); new subscriptions follow the admin policy (review on by default → 審核中). Do not keep 真實 strategy data locally. 模擬 stays on the local ledger and local records.
- Pages using strategy data must run `useStrategyFeed()` (Strategy.vue does) and handle loading/error (catalogue shows 載入中 / 載入失敗 + 重試).

## Transfer dialog (user decision, 2026-11-26)

Transfer is a dialog (`components/overlay/AssetTransfer.vue`, Overlay type `transfer`), not a page. Layout follows the user's reference: From / To account selects joined by a green→red rail with a swap button, divider, currency select, quantity with an inline 全部 and the available line, full-width submit; no default footer. Fields start empty; choosing one account sets the other to the opposite. Keep the NewQuantCapital palette (lime submit) and the no-highlight-border rule (Select variant `dialog`). Selects inside native dialogs must portal their popups into the dialog (`getPopupContainer`), never `document.body`. The header asset menu's 劃轉 opens the dialog in place on any page (user decision, 2026-11-26; no navigation to the assets page); old `/assets/transfer` links still land on the assets overview and open it. The trading account holds USDT margin only; the API validates the available amount per source account.

## Withdraw page (reference measured, 2026-11-26)

`/withdraw` matches newtrendcapital.com/zh-TW/withdraw (measured at 1918px, positions identical): shared 1152px `.deposit-page` shell and top links; 可用餘額 card (44px lime icon, 18/28 value); two columns `minmax(0,1fr) 380px` gap 32 — coin and network pill Selects (network shows code + name without the deposit dot), address input with 粘貼 (and a clear ×), amount input with unit + 最大; right: 合計扣除 / 手續費 / 實際到帳 card and the 安全提示 card; full-width lime pill submit. Styles in `styles/withdraw-fidelity.css` (`.wd-` prefix). Coins, networks, withdraw fees (0, as on the reference) and address formats live in `mock/chains.js`, shared with deposit and the wallet service. The API validates network, address format, amount and balance and locks the amount (pending record); feedback is toast-only. Nothing is ever sent on-chain.


## No onboarding banner on Assets (user decision, 2026-11-26)

The assets overview starts with the total-assets card. Do not restore the 「完成帳戶設定 1/3 · 建立帳戶 · 完成身分驗證 · 完成首次充值 · 立即充值」 setup banner (markup and `.setup-banner` styles removed).

## Removed account features (user decision, 2026-11-26)

Joint accounts (聯名帳戶), 我的活動 (promotions/tasks), the investor survey (問卷調查), 資金密碼 (fund password), 雙重認證 (2FA), 裝置管理 (devices) the 字體大小 (font size) preference and the profile username edit (pencil) are removed: pages, routes, header/profile entries, mock account fields, styles and their locale strings. `/joint-account`, `/promotions/*`, `/survey/*`, `/fund-password`, `/2fa` and `/devices` redirect to `/profile`. The security group keeps only 登入密碼; preferences keep only 語言. `data-font-scale` stays fixed at `standard` because the vendored source theme's responsive header rules key on it. The profile header shows three metrics (實名認證, VIP 等級, 信用分); the 安全等級 tile is removed. `promotion.*` strings still used by 邀請好友 and Charity stay. Do not reintroduce these features.


## Personal centre after GMXX (user decision, 2026-11-26)

`/profile` and its sections follow gmxx.io/personal features and interactions, in the new-skin style, with local in-memory mock data only (`src/api/profile.js` → `profileService.js`: account change ledger, notifications, invite summary, preferences; resets on reload, never browser storage). Layout: left sidebar (member card that opens the overview, then 偏好設定 / 安全中心 / 身份認證 / 帳變記錄 | 邀請好友 / 消息通知 / 幫助中心 / 清除快取) beside the section. Interactions from the reference: the language row opens the searchable 請選擇 picker dialog (shared `language` overlay); 修改密碼 opens a dialog (overlay `change-password`; `/change-password` still renders the form for old links); 帳變記錄 is a standalone full-width page with change-type / account / currency filters and pagination; opening an unread notification marks it read and the header bell badge shows the live unread count; 身份認證 shows the four-step progress and the current step card (no 你需要做什麼 list — removed at the user's request) (pending levels have a demo-only approve button). Clear cache confirms, then refetches every live request; logout confirms. Device management is restored as on GMXX (user request, 2026-11-26): 安全中心's 裝置管理 opens the 登入裝置管理 dialog (overlay `devices`, `listSessions`/`endSession` mock; the current device is read from the user agent and cannot be ended; remote sessions end with a toast). Google Authenticator is restored the same way: 安全中心 → 驗證方式 card with status chip; 去綁定 opens the two-step dialog (QR + key/copy → 6-digit code; overlay `authenticator`); bound accounts unbind with a current code; the mock verifies real TOTP (`src/api/totp.js`) or the demo code 123456; withdrawals do not require it yet. The fund password is restored too (user decision, 2026-11-26; GMXX has none, so it follows the same dialog style): 安全中心 資金密碼 card → set (6 digits ×2) / change (current + new) dialog (overlay `fund-password`); 提現 first pre-validates the form (`checkWithdrawal`, no funds locked), then asks for the fund password in the `fund-password-verify` dialog; without one it opens the set dialog. One in-memory store (`src/api/fundPassword.js`) is shared by the profile and wallet services, and `requestWithdrawal` rejects a missing or wrong password server-side. A wrong password keeps the dialog open; other failures close it. Other earlier removals stay removed (joint account, promotions, survey, security level, font size, username edit). Never change state on the reference account beyond reading.

## Personal centre UI after newtrendcapital (user decision, 2026-11-26)

Supersedes the GMXX sidebar layout above; the GMXX features and dialogs stay. `/profile` follows newtrendcapital.com/zh-TW/profile (measured 2026-11-26): 1280px page, Syne 24/32 title, a header card (56px avatar, Syne name, UID + copy) over metric tiles 實名認證 / VIP 等級 / 信用分 (安全等級 stays removed), then two columns — 個人設定 (帳戶: 實名認證, 郵箱, 手機號碼; 安全: 登入密碼, 資金密碼, 雙重認證, 裝置管理; 偏好: 語言, 客服消息提醒 switch, 清除快取, 版本號) and 我的業務 (VIP 等級, 邀請好友, 帳變記錄, 消息通知 with unread count) + 支援 (幫助中心, 聯絡客服, 關於我們), then the 32px 登出 pill. Rows are 48px (18px grey icon, label, grey value with a yellow dot for pending states, chevron); security and preference rows open their existing dialogs. Detail pages (身份認證, 帳變記錄, 邀請好友, 消息通知) are standalone 1280px pages with a 個人中心 back link (forms 768px), using the same 24px cards and Syne titles. No sidebar; `/security`, `/preferences`, `/devices`, `/2fa` redirect to `/profile`. Removed items stay out (聯名帳戶, 我的活動, 問卷調查, 安全等級, 字體大小, username edit).

## Help centre is its own channel (user decision, 2026-11-26)

幫助中心 is not a 個人中心 section. `/help-center` (route `help-center`, `pages/HelpCenter.vue`) is a standalone page without the 個人中心 back link: title + search, category pills, FAQ accordion with a result count, and a contact card (公告 link, 聯絡客服 opens the support drawer). Entries: the footer 幫助中心 column (幫助中心 / 公告列表 / 線上客服; the former 常見問題 link pointed to the same page and was replaced), the profile 支援 row and direct links.

## Flash exchange (user decision, 2026-11-26)

閃兌 follows the GMXX Flash Exchange content in the transfer dialog's look (`components/overlay/FlashExchange.vue`, Overlay type `flash-exchange`, opened from the Assets 閃兌 action): 兌出 / 兌入 coin selects joined by the green→red rail with a swap button (picking the other side's coin swaps them), divider, 閃兌數量 with unit and 全部, 可用, a quote box (參考匯率 1 X ≈ r Y, 兌換所得 ≈), full-width lime submit, no default footer. The wallet API (`listFlashAssets`, `quoteFlashExchange`, `flashExchange`) converts USDT / USDC / BTC / ETH / SOL in the funding wallet at the price snapshot ratio, no fee, rounding the received amount down; it validates pair, amount and balance, debits and credits atomically and records an `exchange` wallet record. Toast-only feedback; success closes the dialog. The former USDT → USDC 1:1 amount form is gone (AmountForm is donate-only).

## Trade records as rows (user decision, 2026-11-26)

Supersedes the GMXX-style record cards above (History reference, Current records, Stable record layout): every trading module (perpetual, delivery, spot) shows its current and history records as one compact line per record in `TradeHistory.vue` / `CurrentTrades.vue` (`styles/trade-records.css`): a table with a sticky 36px header row, 44px rows, the pair + coloured direction + tag (leverage, period, spot status) in the first column, the same fields as before as columns (numbers right-aligned, P&L coloured), and 平倉 / 撤單 in a final 操作 column. Data, fields, actions and confirmations are unchanged. History pages hold 10 rows; the panel scrolls vertically, and horizontally only when the columns do not fit. The loading skeleton uses the same table.

## Header profile menu (user reference, 2026-11-26)

The header profile dropdown follows the GMXX account menu in the current style: avatar, name, KYC + VIP badges and UID copy; a 信用分 pill; a 2×2 grid of the current mode's account balances (資金帳戶, 交易帳戶, 理財帳戶, 量化基金; loaded from `getAssetsOverview` when the menu opens, masked with the assets menu's eye toggle); then 個人中心, 安全中心 (`/profile#security`, scrolls to the 安全 group 80px below the header), 身份認證, 清除快取 (same confirm as the profile row) and 登出. GMXX's Account Role entry is not copied: the header 真實/模擬 toggle already covers it. 邀請好友 is reached from 個人中心 → 我的業務.

## Order book depth bars (reference read, 2026-11-26)

Following newtrendcapital.com/zh-TW/trade (read-only DOM inspection): each order-book row's background bar is the cumulative size from the spread to that level as a share of the visible side (widest at the far end), drawn in opaque dim side colours (asks #230e16, bids #06221a) and redrawn instantly on every depth push; that bar movement is the "background change" on updates. 累計 is the running total (USDT) in the same direction. No row flash animation. The mock depth (`depthBook`) changes a staggered quarter of the levels per tick so the bars move unevenly, like a live book.

## Quant fund redemption review (user decision, 2026-11-27)

Supersedes the immediate local settlement in "Quant fund redeem and payout records" above: 贖回 now submits a review request (`requestRedeemFund`). The confirm dialog shows `redeem.reviewNotice`, the toast uses `redeem.pendingTitle` / `pendingDescription`, and the order becomes 贖回審核中 with 派息明細 still available; nothing is credited until an admin approves in 量化基金 → 赎回审核. The public ledger is separate from the admin mock, so public requests stay pending.

Quant fund orders use the same six statuses as the admin (pending_review, active, redeem_pending_review, redeemed, settled, rejected; user decision 2026-11-27). The reference-derived 已取消 (`cancelled`) and 待補足 (`awaiting_top_up`) statuses, their seed record and the unused top-up / decline / top-up reminder / cancel-reason strings were removed from all six locales; do not reintroduce them without a real flow.

## News centre data (user decision, 2026-11-27)

The news centre and home insights read `src/api/news.js`, backed by the shared admin news module (`../src/shared/news`), instead of the bundled JSON directly (the JSON remains the seed). Category pills come from enabled categories in the current language; the home shows featured articles; old per-language article ids and the home aliases redirect to the canonical article id. Relative times use `Intl.RelativeTimeFormat`; `home.ui.hoursAgo` and `data.news` were removed.

## Quant fund lock period and earnings (client requirements, 2026-11-27)

Supersedes maturity settlement and the immediate-redeem notes above. `termDays` / `maturityDate` now mean the lock period: no automatic settlement at its end, the order keeps earning. Any running order can request redemption (admin review); inside the lock the fee is `earlyRedeemFeeRate`% of principal (snapshot), whatever the days left. Earnings accrue in the order and are paid with principal on close (`closeFundOrder`). Products at 100% progress auto-redeem orders past their lock (`autoRedeemFullFunds`). `restrictedUids` makes a product look full to that UID. Tiers: VIP4 max 9,999,999, VIP5 lock 120 days. Text in all six languages says 累計收益 / 鎖定到期 / 收益明細; obsolete redeem penalty/settlement strings were removed.

## Mobile navigation drawer (user reference, 2026-11-27)

The mobile drawer (`components/overlay/MenuDrawer.vue`) is full screen and follows the GMXX mobile sidebar in the NewQuantCapital style: a user card (name, UID copy, credit score chip), a verification reminder with a 去認證 link while KYC is not approved, icon rows (home, personal centre, deposit in real mode, language — closes the drawer and opens the language picker, a bottom sheet below 600px like GMXX —, the trading / finance / AI Quant groups listing only their pages, without subtitles or an overview entry (user decision), assets, news, charity), then account rows (account-mode toggle, security centre, clear cache, log out). Signed-out users see login/register buttons. Clear cache is shared with the header via `utils/clearCache.js`; the drawer closes before the confirmation opens.

## Mobile bottom tab bar (user reference, 2026-11-27)

Below 900px a fixed bottom tab bar (`components/layout/MobileTabBar.vue`, GMXX layout in the NewQuantCapital style) links 首頁 / 交易 / 金融 / 量化 / 資產 (行情 was replaced by 量化, user decision). It shows only on top-level sections (home, trading, finance and AI Quant lists, assets overview — see `tabRoots` in `App.vue`); detail pages keep their own sticky actions. `#site-shell.has-tabbar` reserves `--nt-tabbar-h` plus the bottom safe area. Desktop is unchanged.

## Mobile trading layout (user reference GMXX, 2026-11-27)

At ≤767px the futures, delivery and spot pages follow the GMXX mobile trade layout in the NewQuantCapital style (`TradeWorkspace` adds `.compact` via `useMediaQuery`): a two-row header: pair picker + account badge (真實帳戶 / 模擬帳戶, tapping asks to switch mode with the usual confirmation; signed-in only) on the left, product switch (a bottom sheet, Overlay type `option-sheet` / `OptionSheet.vue`) + K-line button on the right (the pair name ellipsizes first), then price and change with the favourite star at the row's end; the chart button opens a separate phone chart page (`/trade/:mode/:symbol/chart`, `pages/trading/TradeChart.vue`, GMXX reference): back + pair title (pair drawer), price with 24h high/low/turnover, the shared chart panel, 委託訂單 (bids | asks side by side) / 最新成交 tabs (stream `trades` channel) and fixed buy/sell actions that return to the trade page with that side selected; wider screens are redirected to the trade page and the trade page itself has no inline chart on the phone; the order form sits left beside a price/quantity book (no cumulative column) on the right (no buy/sell/both view switch on the phone; always both sides, a fixed 7 levels each; the two columns keep their own heights and the book never stretches to follow the form, e.g. when TP/SL opens); as in GMXX the form and book share one surface without separate cards, and the futures form puts order type (市價/限價 select) beside leverage, spot uses the same type select; records render as cards below and the page scrolls instead of the panels. On this layout futures picks 买入开多/卖出开空 first and shows one action for that side; tapping a book price fills the futures/spot limit price (switching to limit). Desktop and tablet keep the grid layout, dual futures actions and table records. Draft values, safeguards and confirmations are unchanged. On this layout the site header is hidden (user decision): no menu button is added to the trading header (user decision); the menu stays on other pages. Tapping the pair opens a left pair drawer (`components/overlay/MarketPicker.vue`, overlay type `market-picker`) with search, favourites / all / category tabs, sortable pair·turnover / price·change headers and star + icon + name/turnover + price/change rows; stars share the trading favourites list (`useMarketFavorites` keeps one list per key).

Trading record tabs drop the product name (user decision, 2026-11-27): 倉位 / 當前委託 / 歷史委託 / 歷史倉位 (perpetual), 當前訂單 / 歷史訂單 (delivery), 當前委託 / 歷史委託 (spot), from `trade.recordTabs.*`.

Picker overlays close on a backdrop tap (user decision, 2026-11-27): the mobile product sheet (`option-sheet`), the pair drawer (`market-picker`) and the language sheet hold no unsaved input, so tapping outside closes them like the × button (focus returns to the trigger). This is the only exception to the no-backdrop-close rule; forms, confirmations, detail drawers and every other dialog keep ignoring backdrop taps.

## Desktop trading pair panel (user decision, 2026-11-28)

From 1200px up, the futures (合約交易), delivery (二元期權) and spot pages show a pair list panel on the far left beside the chart (user reference): search, favourites star + 全部 + our trading catalogue categories (加密貨幣, 外匯, 貴金屬, 能源 …), sortable 交易對·成交額 / 價格·漲跌幅 headers and star + icon + name/turnover + price/change rows; the current pair has a background, clicking a row switches pair and keeps the product. The reference's 合約/期權/現貨 tabs are not built; the existing product switch stays. Only the layout follows the reference: every panel keeps our own content. The instrument bar spans only the pair panel and chart; the order book and order form rise to the top of the page beside it (the page is the grid, `.with-pairs`, `workspace-grid` is `display:contents`); records keep the full width below. The list is one shared component, `components/trading/PairList.vue` (variant `panel` here, `drawer` in the phone drawer `overlay/MarketPicker.vue`); its root classes are `pair-list-panel` / `pair-list-drawer` (never a bare `drawer`/`panel`, which collide with global overlay classes). Below 1200px: landscape tablets (1024–1199px, user request 2026-11-28 "横屏平板用三列") use the desktop arrangement without the pair panel (CSS only, `.product-terminal:not(.compact)` grid): full-width instrument bar, chart | order book 230px | order form 30% (min 300px; fields scroll, actions pinned), records full width ≥260px filling the viewport (chart row viewport − 420px, 320–560px), so records are on the first screen; portrait tablets (768–1023px) keep the stacked grid and phones (≤767px) the compact layout (user: do not change mobile). No 最新成交 tab and no phone layout on portrait tablets (not approved). Spot follows the same rules (its separate tablet grid and market list are gone). The instrument-bar pair follows the reference too: from 1200px up it is plain icon + name (not clickable; the panel is the picker), on tablet (768–1199px) it is a button with a caret that opens the same left pair drawer as the phone (`market-picker`), replacing the old dropdown; phones are unchanged. Breakpoint constant: `PAIR_PANEL_QUERY` in `composables/useMediaQuery.js`, mirrored in `styles/trade-workspace.css`. The two spanning panels and the records panel use `contain:size` so content never stretches a row. Row proportions follow the reference (user request 2026-11-28): the chart row is viewport − 452px (400–640px), records get at least 300px and fill the rest of the viewport below the 64px site header (≈312px at 900px tall; the record list scrolls inside); on viewports shorter than about 840px the page scrolls to reach the bottom of the records. The instrument bar is 56px on desktop and tablet, measured read-only on newtrendcapital.com/zh-TW/trade (user request 2026-11-28): 12px side padding, 18/28 pair and price, 28px coin, favourite 28×32 with a 16px star (44px on coarse pointers), each 24h stat a 12/16 label directly over a 12/16 value (32px). Phones keep their header. Sizes per screen: `docs/designs/2026-11-28-trading-responsive-layout.md`. The 24h stats are right-aligned at the end of the instrument bar (auto margin, so their sideways scroll still works). On desktop and tablet the instrument bar reserves fixed widths for the live price (11ch), the change (8ch), 24h high / low (11ch) and volume / turnover (10ch; shown as the figure only, without the coin or USDT unit, user decision 2026-11-28), so the stats never shift as the price ticks or when switching pairs; on tablets (768–1199px) they are right-aligned like the desktop bar, so a longer or shorter pair name does not move them either (user decisions, 2026-11-28). With the pair panel, narrow desktop widths must not wrap (user report 2026-11-28): the category tabs stay on one row (they fit at the panel's 256px minimum; extra categories scroll sideways with wheel support and a right fade), and the instrument bar stays one line: the 24h stats gap is 16px below 1600px and, if they still do not fit (about 1200–1300px), they scroll sideways with wheel support and a right fade instead of wrapping under the pair. On desktop and tablet the order book's cells stay on one line, and 累計 (a USDT running total) shows 2 decimals from 1 up, at most 4 decimals below 1, and `<0.0001` for smaller totals (not the price formatter's 8 decimals).

## Trading page structure (review refactor, 2026-11-28)

- `components/trading/TradeWorkspace.vue` is the page shell only: resolves the pair from the route, picks the layout (`wide` ≥1200 / `tablet` / `compact` ≤767) and wires the panels. The instrument bar is `TradeInstrumentBar.vue` (pair, favourite, live price, 24h stats, stream status; emits open-pairs / open-products / open-chart, routing stays in the shell). Panels: PairList, TradeChartPanel, TradeOrderBook, TradeOrderForm, TradeRecordsPanel.
- Routes: `utils/tradeRoutes.js` (`marketSlug`, `findTradingMarket`, `tradePath`). Every link uses the slug (`/trade/futures/ETHUSDT`); legacy ids (`ETHUSD`) and unknown symbols are replaced by the shown pair's canonical URL. Do not build `/trade/...` strings by hand.
- Live data: `useLivePair(pairGetter)` in `composables/useMarket.js` (live, livePair, tickers, hasVolume) for the workspace and the phone chart page.
- Pure, tested helpers: `utils/pairList.js` (rows, tabs, filter/search/sort cycle), `utils/orderBook.js` (`bookSide` cumulative depth, `formatBookTotal`), `fillLimitPrice` in `composables/tradePageState.js` (book price → futures/spot limit). Page state holds only symbol, interval, record tab and pages.
- Candlestick chart (`components/OptionsChart.vue`): price-axis labels take their decimals from the grid step (`utils/chartAxis.js` `axisDecimals`, 0 for steps ≥ 1, at most 8), so small-price pairs (EUR/USD, DOGE, PEPE) never show repeated rounded labels such as "1"; the current-price tag and hover open/close use `fmt` like the header (user report 2026-11-28).
- One-row strips that may overflow (pair-list tabs, 24h stats) use `composables/useScrollOverflow.js` (right fade via `has-more`, wheel → sideways, ResizeObserver re-measure); do not add per-component resize listeners.
- `styles/trade-workspace.css`: base panel placement is the tablet grid; `.with-pairs` (desktop) and `.compact` (phone) override it. The old spot sidebar rules (`.spot-workspace`, `.market-panel`, `.spot-market-*`) and the instrument-bar RecordFilter rules were removed; the page no longer gets a per-mode class. Verified by a geometry snapshot of all three pages at 1920, 1200, 1024 and 393 (identical before/after).

## No order confirmation dialog (user decision, 2026-11-28)

Futures (合約交易), delivery (二元期權) and spot orders are placed directly when 買入 / 賣出 is clicked and the form passes validation; there is no 確認委託 dialog (`components/trading/order/useOrderSubmit.js`). Each click uses a fresh `requestId`; while the request runs the actions are `aria-busy` / `aria-disabled` and further clicks are ignored, so a double click places one order. Success: futures/spot toast 下單成功 and clear the amount; delivery opens the order dialog (its 下單成功 toast is inside). Failure: the field's toast with the API error, amount kept. Close position / cancel order in the records and the account-mode switch keep their confirmations.

## Delivery order dialog (user request, 2026-11-27)

After a delivery (交割) order is placed, the order dialog from GMXX opens (Overlay type `delivery-order`, `components/trading/DeliveryOrderStatus.vue`): pair title, 買漲/買跌 tag, a countdown ring for the period, then the settled result tag (贏 / 輸 / 平) with 數量, 盈虧, 開倉/平倉價格, 週期, 收益率, short 訂單 ID with copy, 開倉/平倉時間. The 下單成功 toast is shown inside that dialog. Settlement is server-side in the mock (`settleDueOptions` in `server/tradingFunds.js`, run by `getTradeOrder` and `listTradeRecords`): at the end of the period the last price decides; a correct call pays stake × payout rate, a wrong one loses stake × payout rate, an unchanged price returns the stake; the stake plus result is credited once. Closing the dialog early is fine — the records panel refreshes when the earliest open delivery order expires. `account-confirm` accepts `afterDone` to open a follow-up dialog after it closes. Delivery records (current and history) carry a 結果 column after GMXX: a yellow live countdown while the period runs (秒 under a minute, then mm:ss / hh:mm:ss / days, `utils/deliveryCountdown.js`), then a 贏 / 輸 / 平 tag; columns 數量, 開倉價格, (平倉價格), 週期, 收益率, 結果, (盈虧), 開倉時間, (平倉時間). Phone cards show the result top-right in the card head. Seed history follows the same rule (± stake × payout rate, no fee).

## Demo account: no C2C or lending (user decision, 2026-11-27)

The 模擬 account does not offer C2C or lending. `utils/demoAccess.js` (`availableInMode`) hides their entries in the header and side-menu navigation and on the Finance landing (only the 理財 card remains, with the `finance.landing.subtitleDemo` line); the router guard sends `/c2c/*` and `/earn/loan/*` to `/earn` while demo is active, and switching to demo on one of those pages leaves it the same way. The 真實 account is unchanged.

## Refactor phase 1 — correctness fixes (review 2026-11-27)

- Asset totals (`server/accountValue.js`) count money that left the available balance but still belongs to the user: Earn subscriptions waiting for review, Quant Fund orders in review or redemption review, open-order and running delivery locks (unfilled share), C2C sell locks and pending withdrawals. Covered by `tests/account-value.test.mjs` (loaded through Vite SSR because `data.js` is Vite-only).
- Quant Fund funding progress counts approved principal only (a pending order takes no quota); fund order lookup and redemption are scoped to the account mode (`getQuantFundOrder(id, mode)`, `redeemQuantFund(id, mode)`); settlements add the rounded return without re-rounding the shared balance.
- Earn subscribe is idempotent per `requestId` (one id per dialog); the Quant Fund subscribe dialog closes with a 申購成功 toast instead of an in-dialog success view.
- `useFinancePagination` keeps the page across breakpoint changes; RecordFilter's search focus uses a background cue (no ring); Overlay re-announces the unsaved-work warning on every Escape; locale packs build as one chunk per language.

## Refactor phase 2 — data layer (review 2026-11-27)

- Money moves only through a wallet (`mock/ledger.js`): `walletOf(mode)` (ledger-backed) or `memoryWallet()` (pure rule tests), each `{balance, debit, credit}` with the same guards and 1e-8 rounding. Fund, strategy and C2C rules take wallets; `boundBalances` / `bindBalance` / the C2C balance Proxy are gone, and `balances` / `balance` on accounts are read-only views.
- Account modes: compare through `utils/accountMode.js` (`MODE_REAL`, `MODE_DEMO`, `MODES`, `isDemo`, `modeKey`); the session still stores the label key. `walletMode` / `fundMode` are `modeKey`.
- Idempotency: every create call returns the record it already created for a repeated `requestId` (Earn, Quant Fund, C2C, demo strategies, trade orders). Errors: services throw `ApiError`; one `errorKey(error, {prefix, fallback})` in `api/transport.js` backs the per-module mappers.
- Time and ids: the data layer uses `clock.now()` and `nextId()` (`mock/clock.js`, `mock/ids.js`); UI countdowns, TOTP and the market stream keep their own clocks.
- Prices: `mock/prices.js` is the single source — live stream (registered by `api/market.js`), then the page snapshot (registered by `data.js`), then built-in fallbacks for Node tests. Earn's own price table is removed.
- Trade orders: `placeTradeOrder({mode, kind, side, marketName, type, amount, price?, leverage?, duration?, takeProfit?, stopLoss?, requestId})` — the service validates, prices market orders at its last price, sizes, picks bucket and payout rate and locks funds; the form sends parameters only.
- Mock stores live in `src/server/` (accountValue, c2cStore, earnPortfolio, quantFundPortfolio, strategyPortfolio, tradingFunds, walletRecords).

## Refactor phase 3 — components (review 2026-11-27)

- Overlay types are configured in `components/overlay/overlayRegistry.js` (dialog classes, initial focus, backdrop close for pickers, footer, primary action); Overlay.vue keeps one body branch per type. Adding a type = registry entry + body branch.
- Trading order form: `TradeOrderForm.vue` is a shell over `components/trading/order/` (FuturesOrderPanel, OptionsOrderPanel, SpotOrderPanel, OrderAmountField, useOrderSubmit, orderPricing, orderForm.css loaded once and namespaced under `.trade-order-form`).
- AI Quant routes have one component each (`pages/quant/`: QuantLanding, QuantFundLayout, QuantFundPage, QuantFundProductPage, QuantFundInterestPage); route names `strategy` and `quant-fund` replace the shared `ai-quant` name for those paths (URLs unchanged). QuantFundDetail loads its product (prop `productId`) like EarnDetail.
- One section switch component `components/ui/ChannelSectionSwitch.vue` (drag-scroll, active tab into view) for Finance, Quant Fund and Strategy; callers pass the `.subnav` / `.strategy-nav` class.
- Subscribe success: flows close through Overlay `close(afterClose)` and toast after the animation (Earn, Quant Fund, Strategy); the strategy notice store and its 220 ms delay are gone. Strategy subscription MAX and inputs follow the Earn/Fund busy safeguards.
- Shared helpers: `utils/accountBadge.js` (`kycStatus`), `composables/useCopyFeedback.js` (copy toast in the current layer), `utils/clearCache.js`; `styles/asset-transfer.css` holds the rules shared by the transfer and flash-exchange dialogs.
- A stylesheet shared by several SFCs is imported from script, not `<style src>` (the Vue plugin mixes up a shared src block at different block indexes in production builds).
- Not done on purpose: a `confirmAction` wrapper (all confirm call sites already pass the same fields; titles accept a key or text) and a site-wide AmountInput (each dialog's field has its own geometry; safeguards were aligned instead).

## Refactor phase 4 — styles (review 2026-11-27)

- New tokens in `styles/tokens.css`: surfaces `--nt-surface-0|2|raised`, borders `--nt-border-subtle|strong`, greys `--nt-text-soft|dim|quiet`, market colours `--nt-up|down` (trade-workspace maps `--nt-green|red` to them) and radii `--nt-radius-card` (20px) / `--nt-radius-pill`. Exact literal matches were replaced throughout sheets and SFC styles; `.product-terminal`'s own green/red (#5bbb91, #e34a68) stay literal on purpose. Use tokens for new rules.
- Domain sheets stay page-imported (a global import costs every route ~250 KB); overlaps between them must be decided by specificity (see the phase 4 CSS conventions above).
- Breakpoints: phones are ≤767 / ≥768 everywhere, including the trading page (`COMPACT_TRADE_QUERY`, App.vue header rules) which used 760/761; small phones ≤640 (no 639). Measured fidelity pairs (900/901, 1100/1101, 1150/1151, 1199/1200, 1023/1024) are consistent and kept.
- `trade-records.css` loads once from `TradeRecordsPanel.vue`; each rule ends in `:is(.records-panel *)` (same specificity as the former scoped copies, names stay confined to the panel).
- `!important` only for: reduced motion, the Ant message position/animation, visually hidden text, Ant Select overrides, and three phone table cells that beat inline-grid rules (earn table alignment, loan table padding, deposit input padding). Layout rules win by specificity instead. Focus rules no longer restate unchanged borders.
- Verified with a computed-style snapshot diff of 23 routes at 1440 and 393 (only live-price/animation noise remained).

## Refactor phase 5 — tooling and tests (review 2026-11-27)

- `npm run check` is the gate before committing site changes: `eslint .` (`eslint.config.js`, correctness rules only, not formatting), `check:locales`, `css:dead --check` (fails on unreferenced selectors) and `npm test`. Tooling is installed at the repository root like vite; `package.json` declares everything the site imports (ant-design-vue, postcss, postcss-selector-parser, eslint).
- Tests stay on `node --test` (no vitest). `tests/conventions.test.mjs` asserts AGENTS.md rules: `--nt-*` defined only in tokens.css (plus the documented remaps), doubled id only in the two channel sheets, no outline/ring/border highlight on focus or expanded states, shared breakpoints, no `<style src>`, browser storage only via `utils/storage.js`, overlay types opened ⇔ configured, every locale namespace referenced. Extend it when adding a rule of that kind.
- Lint fixes: unused imports removed, missing `v-for` keys added, `TradeRecordsPanel` reports tab/page changes by events (`v-model:record`, `page`) instead of mutating the workspace state prop. Found by the new tests: the order form's focus/expanded border highlight (now a surface cue) and RecordFilter's `<style src>` (now a script import).
- Removed unreferenced locale namespaces copytrade, seo, referral, withdraw and app (272 keys × 6). Unused keys inside used namespaces were not removed: many are built dynamically and a key-level sweep could not be verified safely.

## Finance & AI Quant channel conventions (user decision, 2026-11-27)

The binding standard for every page of the 金融 (`/earn`, `/c2c`, lending) and AI 量化 (`/ai-quant`) channels, and for new pages added to them. Follow it instead of page-specific fidelity tweaks; when a page needs something new, extend the shared files named here.

### 1. Structure
- Each channel has its own home: `/earn` → `components/finance/FinanceLanding.vue`, `/ai-quant` → `pages/quant/QuantLanding.vue` (`.quant-landing`). Both use the same markup and scale (`.quant-landing` block at the end of `styles/quant-fidelity.css`): hero (kicker, title, lead) and one card per product line (icon, kicker, name, value line, two chips, browse action, "mine" footer). Finance cards: 理財 `/earn/simple`, C2C `/c2c/buy`, 借貸 `/earn/loan`; copy under `finance.landing.*`. The finance landing cards have no "mine" footer (user decision 2026-11-28): 我的理財 / 我的訂單 / 我的借貸 are reached from each product's section switch. The AI Quant landing follows the same rule (user decision 2026-11-28): no footer on 策略 / AI 金融 cards; 我的策略 / 我的倉位 come from their section switches. The footer copy went with it, and the then-unreferenced `quant` locale namespace was removed; `.card-footer` styles are gone. Three columns on desktop, one below 1024px. The landings link straight to each product; login is asked inside the channel (user decision 2026-11-29): signed out, the action buttons — 理財 申購, C2C 買入/賣出 submit (kept enabled for guests), 借貸 提交申請, 策略 and 量化基金 申購 — push `loginPath(route.fullPath)`, and login returns to the same page.
- Product lines open list pages with a section switch (策略模板 / 我的策略, 量化基金 / 我的倉位 …); records, details and statistics are secondary pages.

### 2. Type, shape and colour (desktop and phones)
- Page title 30/38 (24/32 on phones), section title 20/28, card title 16/24 (two lines max, no truncation to one line), kicker 12/18, body 14/22, labels 12/18 muted, values 14/20; key figures (rates, Sharpe, win rate, amounts) in the mono face at 28/32 (24/30 on phones).
- Body font everywhere — never Syne; no letter-spacing (it scatters Chinese).
- Cards 20px radius, 20–24px padding (16px on phones); pill switches stay pill-shaped.
- Primary actions 40px, solid accent, no gradients; row actions 32px; phone dialog footers split actions into equal 44px buttons.
- Landings: hero title 36/44, lead 15/24, card copy 14/22, one 40px action (full width on phones). Finance landing (理財中心) follows the same scale; its holdings panel leads with the total.
- Files: `styles/quant-system.css` (AI Quant sub-pages and overlays), `styles/channel-system.css` (global: finance pages — `.finance-page`, `.earn-detail`, `.loan-order-page`, `.c2c-page` — and both landings), the `.quant-landing` block in `styles/quant-fidelity.css`, the finance block at the end of `styles/earn-fidelity.css`. Both system files use a doubled `#main-content` id so they win without `!important`.

### 3. Phones are an app, not a shrunk website (≤767px)
- Trim, don't shrink: marketing heroes, decorative charts, repeated headings and stat strips are dropped on phones (headings stay visually hidden for assistive technology); data and actions must stay reachable.
- Spacing rhythm 12px between blocks, between cards and inside cards; no large section padding.
- Lists of records become cards: head (name + status), two-column label/value fields with units inline, actions in a row at the foot. Never squeeze a wide table. The AI Quant position card is the model for every channel (one bordered 20px card per record, 16px padding, status tag top-right, footer row with compact 32px actions right-aligned and any disabled-reason text on its left); finance uses it for 理財產品 (name + 申購 on top, then 日利率 / 期限 / 起投 — type and quotas stay on the product page), 我的理財 tabs, 我的借貸 (詳情 is a secondary outline button) and C2C 我的訂單 (side + status tag, amounts, time + 查看). Rules live in the phone review block at the end of `channel-system.css`.
- Inner record tabs (持倉/申購單/贖回單/收益明細, 進行中/已結清/其他) fill the row as equal segments. Summary cards keep the key figure at 24–28px with label/value rows; no empty air above them.
- Detail and form pages (理財詳情, 借款詳情, 借款申請) use 16px gutters, 16px card padding, 20px corners and 12px between cards; text inputs are 48px. C2C filter pills scroll sideways in one row; the empty order panel is desktop-only. Tapping a C2C quote on phones opens the order form in a bottom sheet (`components/ui/BottomSheet.vue`, user decision 2026-11-27): a native modal dialog that follows the Drawer rules (no backdrop/drag close, fixed header with ×, body-only scroll, 200/150ms slide, focus to title and back to the quote, scroll lock, closes on route change). Overlay's agreement and confirmation dialogs open later in the top layer and stack above it; toasts attach to the open dialog. `C2CTradePanel` teleports the one form instance into the sheet on phones and into the side column on desktop, so reopening, resizing or switching width keeps the input. Use BottomSheet for other phone forms that open their own dialogs.
- Product rows that compete for attention (today's picks, featured products) are a horizontal swipe row (`scroll-snap`, ~80–86% card width, `overscroll-behavior-x: contain`).
- The section switch (AI Quant, 理財/我的理財, 借貸/我的借貸, C2C) is sticky under the 56px site header as a floating pill (translucent blurred track, no shadow band) with equal-width segments that fill the row (40px: 4px track + 32px tabs, one shared rule in `channel-system.css`); C2C's four segments drop their icons below 420px so labels never clip; page headings it repeats (我的收益, 我的借款, C2C 交易 …) and channel heroes (理財中心, 加密借貸) are visually hidden; actions in a heading (C2C 新增帳戶) stay.
- The site footer appears only on the home page; `#site-shell` uses `overflow-x: clip` so the page never drags sideways.
- Detail pages float their primary action at the bottom of the screen on phones (user decision 2026-11-27; supersedes placing it after the summary): `.nt-float-bar` turns a container (summary + action, confirm rows) into a fixed translucent bar above the bottom safe area, a lone `.nt-float-action` button floats over a bar drawn by `#main-content::after`, and `#main-content` reserves the bar height. Used by 理財詳情 申購, 量化基金詳情 立即申購, 借款申請 提交申請 and 借款詳情 還款 / 取消申請 (incl. its confirm row). 借款詳情 還款 opens the repay form in `BottomSheet` (bottom sheet on phones, centred dialog ≥768px; focus on the amount field, ×/Escape held while the request runs, errors toast inside the sheet's layer, focus moves to the order header when a full repayment removes the trigger); the page card only shows 待還本息 / 可用餘額 and the 還款 button. Rules at the end of `channel-system.css`; desktop keeps the in-flow layout.

### 4. Secondary pages (phones)
- `components/ui/BackLink.vue` is the only back control: desktop shows the in-page "← back" link; phones get a fixed app top bar (back arrow, centred `title`, safe-area aware) and `html.nt-has-page-bar` hides the site header, footer, in-page link and list section tabs. Every secondary page passes a `title`.
- No outer card around the page; one summary card, then the list.
- List pages fill the viewport: bar, summary and column header stay fixed, only the list scrolls (strategy stats `.ds-list`; interest records `.qf-interest-scroll` with a `.qf-ir-head` column row outside the scroller and a `<colgroup>` fixing the column widths so header and rows align — the table's own thead stays for assistive technology only); hide the list scrollbar when it would cover figures.

### 5. Lists and loading
- Phones never page: `useFinancePagination` accumulates pages at ≤767px and `<FinancePagination scroll>` becomes a load-more sentinel (keyed by page so a still-visible sentinel fires again) followed by 沒有更多了. Every client-side list passes `scroll`. Reset the loaded count only when the record changes, not on every refresh.
- Server-paged lists (notifications, account records) keep the compact `‹ 共 X 條，第 n/m 頁 ›` row; a single page shows no pager. Desktop keeps numbered paging.
- Mock data must be long enough to exercise scrolling: 30–90 days on running strategies and active flexible fund orders, and 20+ records in each history list (fund orders, strategies, Earn orders/redemptions/rewards, lending orders, C2C orders). C2C orders use the same `useFinancePagination` + `<FinancePagination scroll>` pair. Tests assert seeds relatively (counts and balances derived from the seed), not as fixed totals.

### 6. Overlays
- Strategy detail drawer, strategy/fund subscription dialogs and fund order drawer use the same type system (20/28 title, body font, two-line product names).
- Pure pickers (bottom option sheet, pair drawer, language sheet) close on backdrop tap; forms, confirmations and detail drawers do not (see the picker rule above).
- Product/option switches on phones open a bottom sheet (`option-sheet`), not a dropdown.

### Asset centre (user decision 2026-11-28)
- 資產總覽 (`/assets`), 資金記錄 (`/assets/records`, `components/assets/AssetRecords.vue`), 充值 and 提現 follow this standard; rules in the asset-centre block at the end of `channel-system.css`. Overview: summary card (total in mono 36/44, 28/34 on phones; 今日盈虧; five actions), accounts card and per-account coin list; phones drop the donut (it repeats the total). 資金記錄: equal kind segments (全部/充值/提現/劃轉/閃兌, sticky under the top bar on phones), a table on desktop, one card per record on phones, `useFinancePagination` + `<FinancePagination scroll>`; statuses use `StatusTag domain="wallet"`. Seeds: 24 records per mode in `server/walletRecords.js` (withdrawals seeded completed only, since pending ones count toward the total). 充值/提現 use BackLink with its `action` slot (歷史記錄 icon in the phone top bar) and float the submit with `.nt-float-action`; desktop keeps the measured reference layout.

### Personal centre on phones (user decision 2026-11-28)
- 個人中心's secondary pages (身份認證, 帳變記錄, 邀請好友, 消息通知, email/phone binding, 修改密碼) use BackLink with the page title (`Account.vue`), so phones get the app top bar and the in-page heading/intro become visually hidden. Phone rules sit in the block at the end of `pages/account/account.css`: 12px rhythm, 20px cards with 16px padding, 48px fields, single-column KYC fields with a floating 提交認證 (`.nt-float-action`), stacked invite card, sideways-scrolling notification tabs and 帳變記錄 filters (labels kept as accessible names), and 帳變記錄 rows as cards (type + signed amount on top, then account / currency / balance / time) with the server-paged compact pager. Desktop keeps the newtrendcapital-measured layout. `/profile` itself stays a top-level page without the bar; its 個人中心 title is visually hidden on phones (the header card names the page) and it shows the bottom tab bar with no tab active.

### 7. Verification
Check every change at 393px and 360px and at 1440px; confirm no horizontal overflow, sticky elements and fixed headers, load-more to 沒有更多了, and that desktop is unchanged. Record new channel decisions in this section.
