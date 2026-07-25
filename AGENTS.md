# Project Agent Instructions

These instructions apply to every agent and every change in this repository.

## Dialog interaction constraints

All dialogs, modals, and dialog-like popups must follow these rules:

1. Clicking the backdrop / overlay must never close the dialog. Do not add backdrop-click handlers that change the open state, and disable any UI-library option that closes a dialog when its overlay is clicked. A dialog may close only through an explicit close, cancel, confirm, or other intentional in-dialog action.
2. The dialog frame must never show a scrollbar. Keep the outer dialog container non-scrolling (`overflow: hidden`). When content exceeds the available viewport height, constrain the dialog height and make only the content/body region scroll (`overflow-y: auto`), while headers, footers, and actions remain inside the fixed dialog frame.
3. The backdrop / overlay must cover the entire viewport, including areas outside the dialog's parent layout container. Render or teleport it at the application root when necessary, and use viewport-fixed positioning (`position: fixed; inset: 0`) with an appropriate stacking order. Do not constrain a dialog overlay to a page section, panel, transformed ancestor, or other partial-screen container.

When creating, modifying, reviewing, or testing a dialog, treat all of these rules as required acceptance criteria. Preserve them during refactors and verify them at relevant viewport sizes.
