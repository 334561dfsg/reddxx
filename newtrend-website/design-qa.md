# Visual and interaction QA — 2026-11-24

## Scope and result

**Result: implemented frontend checks passed; complete source parity is not claimed.**

The standalone implementation runs with six locales and expanded account pages. The route matrix checks rendering, horizontal overflow and loaded images; it is not a pixel-perfect comparison of every state. Full third-party news bodies, historical news, source backend behavior, approved-account/merchant states and professional chart tools remain outside the reproduced frontend scope.

## Evidence and normalization

Source: https://newtrendcapital.com/zh-TW/ and directly observed internal navigation. Source authenticated state was inspected read-only. No real financial actions were performed.

Implementation: http://127.0.0.1:4173/zh-TW/ . Mock authenticated state, Traditional Chinese, dark theme. Original account details and deposit address were excluded.

All paths below are relative to this independent project directory:

- Desktop source: `qa/source-home-desktop.jpg`; implementation: `qa/local-home-desktop.jpg`.
- Full-view comparison: `qa/home-comparison.jpg` (source left, implementation right).
- Focused hero typography/control comparison: `qa/hero-focus-comparison.jpg` (source left, implementation right).
- Mobile source/implementation: `qa/source-home-mobile.jpg`, `qa/local-home-mobile.jpg`; combined: `qa/mobile-comparison.jpg`.
- Trading: `qa/source-trade-desktop.jpg`, `qa/local-trade-desktop.jpg`, `qa/trade-comparison.jpg`.
- Earn: `qa/source-earn-desktop.jpg`, `qa/local-earn-desktop.jpg`, `qa/earn-comparison.jpg`.
- Other evidence: `qa/local-home-full.jpg`, `qa/local-charity-desktop.jpg`, `qa/local-trade-mobile.jpg`, `qa/modal-landscape.jpg`.

Desktop CSS viewport and captured pixels: 1440 × 1000, 1 screenshot pixel per CSS pixel. Mobile: 390 × 844, same normalization. Desktop combined images were reduced uniformly to 1728 px wide for comparison; focused comparison remains at 1:1. Mobile combined images are 780 × 844. An initial invalid mobile source capture was discarded after detecting that the viewport capability had affected only the latest tab; the retained mobile capture is verified 390 × 844.

## Iteration history

1. **P1 — landing hero spacing reset.** Initial `qa/home-comparison-before.jpg` showed the heading vertically shifted and subtitle/buttons compressed. Global unlayered heading/paragraph resets overrode the source utility margins. Restored the 24 px heading margin, 40 px subtitle margin and 16 px landing base font. Added correct XML namespaces to downloaded inline SVG assets. Post-fix evidence: final home and focused comparisons.
2. **P2 — authenticated mobile header mismatch.** Initial local mobile header showed an asset pill; source showed support, notifications and profile. Replaced the pill with source-derived SVG icons and retained assets in the navigation drawer. Post-fix evidence: `qa/mobile-comparison.jpg`.
3. **P1 — trading panel density.** Initial chart/order grid was substantially taller, moving records below the first screen. Changed desktop to a four-column grid with instrument header spanning the first two columns, order book and order form spanning both rows, compact controls and a separate records area. The order buttons initially extended past the panel; reduced gaps and added bounded panel scrolling. Post-fix measured button bottom 589 px, panel bottom 632 px, viewport width 1440 with no horizontal overflow. Evidence: final trade comparison.
4. **P2 — earn page vertical rhythm.** Removed an extra 80 px hero padding, corrected summary grid ratio, headline size, card spacing and nav density. Post-fix evidence: `qa/earn-comparison.jpg`. Minor card heights and table typography still differ.

## Required fidelity surfaces

- **Fonts/typography:** Original Exo 2, Syne and IBM Plex Mono WOFF2 assets are local. Source/implementation hero use 72/72 px desktop and 36/36 px narrow-screen heading. Source and implementation use PingFang SC for CJK fallback. Some small card/table text, source icon labels and precise wrapping remain approximate.
- **Spacing/layout:** Hero composition and responsive stacking were compared directly. Trading proportions and earn section rhythm were corrected. Other page layouts were implemented from captures but have not all received matched-state, full-page visual comparisons.
- **Colors/tokens:** Source background #05070b, lime #a5ff4a, dark card surfaces, muted white opacity, red/green market colors and original hero grid/glow were reused. Chart data patterns are intentionally synthetic.
- **Images/assets:** Original phone, feature images, charity imagery, news thumbnails, logos, fonts, video and extracted SVG icons are local. Homepage loaded images reported no failures. The chart is a canvas-generated data visualization, not a screenshot. Asset map: `asset-sources.json`.
- **Copy/content:** Main visible Traditional Chinese marketing copy, product names, strategy data and public policy text are captured. Market data are static snapshots. News details include source titles/summaries, independently written localized digests and original-source links. Six UI locales are implemented. Public legal documents preserve source English fallback where observed.

## Interaction checks performed

- Build completed successfully. Nine tests pass (five localization/validation and four Worker/static-serving tests), including SPA fallback and not returning the application shell for missing APIs/write requests.
- 390 × 844: 10 core routes checked for rendered main content, failed loaded images, and page horizontal overflow. See `qa/mobile-checks.json`; all scroll widths were 390 and no loaded image failures were found.
- 320 × 640 homepage: no page horizontal overflow.
- 768 × 1024 transfer form: entered amount retained after resize; controls remained reachable; insufficient-balance validation displayed.
- 844 × 390 open subscription dialog: one active dialog, amount retained, close button visible, body scrollable, frame within viewport.
- Video dialog: media readyState 4; focus moved to its title, background scrolling locked; backdrop click kept it open; Escape closed it; focus returned to the video trigger and body scroll lock cleared.
- Subscription dialog: insufficient balance kept it open with a textual error; Shift+Tab from close wrapped to the last action.
- Mobile drawer: opened, trading section expanded with all four trading routes, intentional close worked.
- Mock order: switched to simulation, entered 250 USD, confirmed once, success feedback appeared; after close, the matching order row displayed 250 USD.
- Earn filter: Flexible selection displayed four rows.
- Strategy conservative filter displayed three matching results (featured cards remain independent).
- Final preview console: no error or warning entries returned.
- Final local homepage was opened as the deliverable; temporary preview viewport override reset.

## Remaining findings and required checks

- **P1 scope boundary:** Full third-party news bodies/history, professional chart tools, backend services and unavailable approved-account/merchant states are not reproduced. Account forms are local demonstrations. Do not accept this as exact parity with every original service/state.
- **P2 verification gap:** Full visual/state comparisons remain for every secondary route, long content and all source modal types. Read-only source inspection does not validate source server-side business behavior.
- Safari runtime, real iPhone/iPad/Android touch, actual 200% browser zoom, system text enlargement, virtual keyboard, device safe areas, reduced-motion preference and forced-colors mode were **not** tested. CSS accommodations are present; dedicated device/preference checks remain required.
- Non-left drawer directions and multi-layer overlays were not implemented or tested; this app owns a single modal instance and uses only a left navigation drawer.
- Native non-searchable select elements are used. Custom searchable combobox mode/async/virtualization checks are not applicable.
- Refresh clears mock transaction/subscription state. No live balance accounting, live行情/API requests, wallet signing, authentication server, KYC upload or external message transmission exists.

## Follow-up polish

- P3: ticker phase and source market prices differ because the local data are static.
- P3: phone float phase, carousel timing, small typography and some icons/empty-state decorations vary.
- P3: locally displayed legal paragraphs preserve text but not every rich-text emphasis/link.

## Expanded verification — latest pass

- Desktop: 498 route checks (83 routes × 6 locales), 1920 × 1080. Mobile: the same 498 at 390 × 844. Each included rendered main content, horizontal overflow and loaded-image checks. Evidence: `qa/complete/route-checks.json`, `mobile-route-checks.json`.
- Two German news titles overflowed initially; `overflow-wrap:anywhere` fixed both and explicit rechecks passed: `long-title-recheck.json`. These fixes supersede the two initial failures in the mobile report.
- Final profile/referrals/reward/phone changes: 48 targeted checks across six languages at both widths; zero overflow or failed loaded images: `final-account-recheck.json`.
- Source widths measured from rendered DOM: `source-widths.json`, `source-widths-extra.json`. News/assets 1400px; profile/help/legal 1280px; earn/quant/rewards 1440px; referrals 1080px; security/KYC/joint forms 768px. These are outer maxima; page-specific gutters remain inside. Full-width decorative backgrounds are preserved.
- Updated news screenshot comparison: `qa/complete/news-width-comparison.jpg`, source left and implementation right, each uniformly reduced from 1920 × 1080 to 960 × 540. Source CDN thumbnails were blank during capture; local downloaded thumbnails load. Static publication times can differ. Header baseline, container edge and first-row positions were compared visually.
- Local phone verification: invalid code displayed an error; demo code succeeded. Phone draft retained through landscape resize and a switch to German. OTP value retention itself was not verified because the browser redacts field values.
- Device rename succeeded and was restored to the original fictional label. Confirmation cancellation preserved the device. Dialog backdrop did not close; Shift+Tab wrapped, focus returned and body scroll lock cleared. Landscape frame remained within 844 × 390.
- KYC required-field errors and identity-to-upload navigation passed. Resizing to 320 × 640 and navigating back retained the demo identity fields. No upload was submitted; MIME/size validation was unit-tested, not exercised through the file picker.
- Survey empty submission focused the first of 11 required errors; all 11 answered questions submitted locally, then disabled the fields and showed success.
- English news: 10 initial items → 20 after Load more → 5 Market Updates items → matching detail and original-source link.
- Font preference: extra-large produced root 20px / body 17.5px at 390 × 844 without horizontal overflow; restored Standard.
- English login identifier placeholder and Terms of Service footer text checked after localization correction.
- Password mismatch, two-factor enable/disable, QR scan, approved KYC/joint-account states, all attribute translations and every validation branch have not received exhaustive browser interaction checks. These remain required before claiming complete interaction parity.

All local account input used fictional data. Source account inspection was read-only; private source profile values were not copied into this project. The runtime/device limitations above still apply.

## Unified application hosting

The repository now runs all four prototypes with one root `npm run dev` on 5173. New Trends is a separate HTML entry under `/newtrend/`, with namespaced asset URLs and router history. Source remains in `newtrend-website/`. Root build includes both HTML entries and copies public assets. Root preview handles deep-link fallback.

Verified after integration: original admin dashboard, front home and agent login; New Trends news, profile and asset transfer; English language switching followed by page refresh; production-preview English news with 26 image elements and no failed loaded images. Root build and nine New Trends tests passed. Standalone 4173 service was stopped; temporary production verification server was stopped after checks. Device-specific checks were not repeated for this hosting-only change.
