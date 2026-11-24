# Options page fidelity and verification

Reference: https://newtrendcapital.com/zh-TW/trade/options/BTCUSD (2026-11-24).

- Desktop reference inspected at 1280px: 300px market list, flexible central chart, 340px order panel; chart starts at y=128, book below chart at y=556. Local positions match these measurements. Copy trading remains excluded per user request.
- Added dedicated options order form: 30/60/120/180/300 seconds, payouts 15/20/30/50/70%, initial quantity 100 USD, minimum 100, eight quick amounts, expected return, available balance, transfer and up/down actions.
- Local browser verified 120s/30% × 500 USD = +150 USD; 99 USD rejected; payout explanation opened and closed; demo order confirmation created a 500 USD record in the options-orders tab. No real-site orders were submitted.
- Verified market search for ETH, BTC favorite filtering, and options-specific empty state. MA toggle worked without console errors. Chart redraws per interval and offers pointer/keyboard inspection.
- At 390 × 844: no page horizontal overflow; input 500 and 120s selection survived viewport change. Form actions stayed reachable. Final desktop recheck: no overflow or console errors.
- Six-language key validation passed (3960 keys each); existing 16 tests passed; production build passed with existing chunk warning.
- Screenshots: options-desktop.jpg and options-mobile.jpg.

Limits: prices, order-book depth, OHLC, chart candles and orders remain local illustrative data. The chart implements MA/volume toggles and crosshair inspection, not the original chart engine's full indicator configuration, drawing tools, zoom/pan or remote history. No market-data/order backend or settlement engine is connected.

Not runtime verified: Safari and physical touch devices, virtual keyboard, landscape/low-height viewports, 200% zoom, OS text enlargement, reduced motion, high contrast, safe-area insets, all six languages visually, chart keyboard inspection and all filter/sort combinations. These remain follow-up checks; core desktop and narrow-screen form paths above were actually exercised.

## Wide-screen correction

At widths >=1600px, use 300px market list + flexible chart + 320px depth + 340px order form. Depth becomes vertical and records use the lower viewport region. Measured at 1896 × 949: chart 916px wide, depth x=1228, records y=605 and bottom=921; no horizontal overflow. At 1674 × 900, records bottom=872 with no overflow. At 1280px, the book returns below the chart. The entered 500 amount and selected 120s period survived both breakpoint changes. Futures route also checked at 1674px: 694px chart and no overflow. No browser errors. Build passed. Other device/preference checks remain unverified as listed above.
