# Real/demo mode confirmation

Verified in the local in-app browser:
- Desktop: opening confirmation leaves the selected mode unchanged; cancel and Escape preserve it; confirmation commits it.
- Backdrop click keeps the dialog open. Tab from the last action wraps to the close button. Initial focus is Cancel; closing returns focus to the trigger and releases body scroll lock.
- 390 × 844: menu closes before the confirmation opens, exactly one native modal dialog remains; both directions work; close button cancels. No horizontal overflow.
- Six locale packs validate (3960 keys each), existing 16 tests pass, production build passes. No browser console errors.
- Source screenshot matched with dark rounded dialog, blurred backdrop, grey cancel and lime confirm buttons. Both desktop and mobile screenshots are stored alongside this file.

Not runtime verified: Safari/physical touch devices, Shift+Tab, reduced-motion/high-contrast settings, 200% zoom, enlarged or long translated text, landscape/low-height layouts, safe-area insets, route changes during the closing animation. These require follow-up browser/device checks. No form input or async submission is introduced by this confirmation.
