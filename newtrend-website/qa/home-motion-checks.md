# Homepage motion verification

- Local preview: `/newtrend/zh-TW/`.
- Quote cells showed both green and red fading backgrounds. Direction follows the previous price, independently of 24-hour performance (unit tested).
- Pausing quotes kept all eight displayed prices unchanged across observations; resume control worked.
- Partner transform advanced while running, remained identical across observations while paused, and resumed. All 28 primary/duplicate images loaded.
- Desktop 1280px and narrow 390 × 844px: no document horizontal overflow; pause/resume controls accessible and functional. Browser console reported no errors.
- Six locale catalogs validated; 16 tests passed; production build passed (existing chunk-size warning).
- Screenshots: `home-partners-motion.jpg`, `home-partners-mobile.jpg`.
- Not runtime verified: physical touch devices, Safari, keyboard focus/hover pause, reduced-motion or high-contrast system settings, 200% zoom, landscape, text enlargement, background-tab cleanup and route-unmount cleanup. Motion preference and cleanup paths were inspected in code; these cases still require device/browser checks.
- Quotes are local simulation based on the captured snapshot, not a live market feed.

## Whole-card flash correction

Hot-stock flashes now target the complete rounded card; price text has no separate flashing background. Fade ends at the card's original background color. Observed both red and green card backgrounds on desktop; all eight cards use the full-card target. At 390px there was no horizontal document overflow. No console errors; build passed. Physical-device and preference checks listed above remain unverified.

## Continuous ticker correction

Source inspected again: two complete sibling groups, a linear half-track marquee, duration derived from content width (~120px/s). Local replacement uses equal 288px slots and two non-shrinking groups; price updates cannot change either group width. Requested slower playback is 60px/s, deriving duration from distance (108 × 288 = 31,104px; 518.4s). Previous 225s-only speed adjustment is superseded.

A temporary browser fixture mounted the production component with eight rows, started five seconds before the seam, and changed 999.99 ↔ 1,000.01 and -0.01% ↔ +10.01% every 700ms. Across a real wrap, transform advanced from -2005px to -431.48px in 12.187s with a 2304px loop: 730.48px / 12.187s ≈ 59.94px/s. Both copies retained matching content and 2304px width (subpixel measurement noise <0.001px). Fixture removed after verification.

Actual homepage group widths remained 31,104px across updates, desktop and 390px narrow viewports had no document overflow, and browser logs contained no errors. Production build and all 16 existing tests passed. Screenshot: ticker-continuous.jpg. Reduced-motion, high contrast, browser zoom and physical Safari/touch device checks remain unverified.
