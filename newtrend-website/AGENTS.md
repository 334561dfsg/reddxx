# Prototype Instructions

## Site-wide denomination (user decision, 2026-11-25)

Use USDT for public-site account balances, valuation, Earn, Quant, lending, C2C quotes, fees and related dialogs in all six languages. Remove duplicate currency choices when consolidating legacy USD account entries into USDT. Preserve legacy route IDs and actual forex instrument identities, plus attributed news/legal source content; those are not account denomination labels.

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

`/deposit` uses `src/components/deposit/DepositPage.vue`, matching newtrendcapital.com/zh-TW/deposit: 1152px container, coin/network Ant Design Selects (48px pill, coin icon + two-line label, dot network), yellow voucher warning, address card with copy action, amount/TXID fields and a dashed screenshot upload. Coin networks follow the source: USDT ETH/TRX/SOL/BASE, USDC ETH/SOL/BASE, ETH/BTC/SOL single-chain (DAI ETH assumed). The address stays a non-transferable `DEMO-<NETWORK>-ADDRESS-NOT-FOR-TRANSFER` placeholder; never show a realistic on-chain address. Omit the source's lime open-state border per the no-highlight-border rule. Withdraw keeps its separate form in `Content.vue`.

## AI Quant seeded demo holdings (user request, 2026-11-26)

Mirror the reference demo account: My Strategies seeds one running demo record ("Conservative Stock Blue", Blue Chip Index Defender template, 500 capital, 14 days, zero P&L) in `src/strategyPortfolio.js`; Quant Fund positions seed one active demo VIP 0 flexible order (4,999 principal, 0.73% snapshot, no interest paid) in `src/quantFundPortfolio.js`. Real-mode lists stay empty. Seeds reduce the demo balances and reset on reload; keep the pure account factories empty for tests.

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
