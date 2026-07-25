# User Credit and Membership Operations Design

**Date:** 2026-07-25  
**Status:** Proposed for implementation  
**Scope:** The five entries in the user operation Drawer under “信用与会员”

## Goal

Implement “信用分审核”, “修改信用分”, “编辑会员等级”, “会员累计充值”, and “添加返利奖励” as complete user-scoped workflows. Preserve the user operation Drawer as the first modal layer, render every business surface above it, and render review decisions and MFA in sequence above the business surface when both are required.

## Product decisions

1. “修改信用分” changes the score immediately after a dedicated MFA succeeds. It does not create another pending review. “信用分审核” handles applications created by other channels, so the two entries are not duplicate paths.
2. Credit scores use the current user model’s scale and current score as the source of truth. The existing global credit-score demo uses incompatible sample users and a different score scale, so the user-scoped workflow receives a focused repository instead of mutating that unrelated list.
3. “会员累计充值” is read-only. It shows the cumulative qualifying amount, recharge records, current level, and progress toward the next enabled VIP level.
4. “添加返利奖励” credits the user’s available balance. The current user model has one writable available balance and one frozen balance; the UI must not offer invented destination accounts.
5. All write operations require a reason, are atomic, produce an audit record, reject duplicate execution, and run only after MFA. Read-only surfaces do not require MFA.

## Information architecture and modal layers

The operation Drawer remains mounted and open while a child workflow is active.

| Entry | Second layer | Third layer | Fourth layer |
| --- | --- | --- | --- |
| 信用分审核 | User credit review Drawer | Review decision Dialog | MFA Dialog |
| 修改信用分 | Two-stage Dialog | MFA Dialog | None |
| 编辑会员等级 | Two-stage Dialog | MFA Dialog | None |
| 会员累计充值 | Read-only Drawer | None | None |
| 添加返利奖励 | Two-stage Dialog | MFA Dialog | None |

Every layer uses the existing shared `useDialogLifecycle` stack. Only the top layer is interactive; lower layers and the page remain inert. No surface closes from backdrop clicks, drag, or swipe. Closing MFA returns focus to the business submit control, closing a review decision returns focus to its review row, and closing a second layer returns focus to its card in the operation Drawer.

## Domain repository

Create `userCreditMembershipRepository.js` as the single mutation boundary for this batch. It reads and updates the existing `usersList`, but keeps supporting records in private collections and returns detached snapshots.

### Public queries

- `getCreditMembershipSnapshot(userId)` returns user identity, current credit score, current VIP level, enabled VIP levels, cumulative qualifying recharge, next-level progress, and recent audit summary.
- `getUserCreditReviews(userId)` returns pending and historical review applications for the selected user.
- `getUserRechargeSummary(userId)` returns qualifying totals and immutable recharge records.
- `getUserMembershipAuditLog({ userId, type })` returns detached audit rows.

### Public commands

- `adjustUserCredit({ userId, direction, points, reason, operatorId })`
- `setUserVipLevel({ userId, vipLevel, reason, operatorId })`
- `decideUserCreditReview({ userId, reviewId, decision, note, operatorId })`
- `grantUserRebate({ userId, amount, reason, operatorId })`

The repository validates every input before mutation. Credit points are positive integers; the resulting score is constrained to the configured user-score range. VIP targets must exist and be enabled. A review can be decided only once and must belong to the selected user. Rebate amounts are positive and have at most two decimal places. Failed commands leave user state, supporting collections, and audit logs unchanged.

Approving a review applies its exact proposed score delta atomically and marks the review approved in the same operation. Rejecting records the decision without changing the score. Rebate success increases `user.balance` and returns a `REB-*` transaction ID. VIP changes update both `vipLevel` and `isVip` and append a manual VIP-change record.

## Business surfaces

### Credit review Drawer

The Drawer header identifies the user and shows pending count. The scrollable body groups pending records before history and supports compact status filtering. Empty state copy explains that no user-scoped applications are awaiting review.

Selecting a pending record opens a decision Dialog above the Drawer. The Dialog shows the original score, proposed score, delta, reason, applicant, and time. The operator chooses approve or reject and enters a required note. Approval is destructive/sensitive and uses MFA; rejection also uses MFA because it is irreversible. The decision Dialog stays mounted while MFA is open and displays repository errors without closing.

### Credit adjustment Dialog

Stage one contains increase/decrease, positive integer points, and a required reason. Increase/decrease is a two-option native radio group with a visible group label; it is not represented as a Select. Stage two previews current score, exact delta, and resulting score. The least destructive action receives focus on confirmation. “提交并验证” opens a dedicated MFA layer; success refreshes the list row, operation Drawer user, and active snapshot before closing the business Dialog.

### VIP level Dialog

Stage one shows the current level and enabled target levels with names and concise benefits. Because the enabled set is small, stable, and does not need search, targets use a visible native radio-card group rather than an old native `<select>` or a searchable Combobox. The group has a visible label, native disabled/current states, keyboard access, and a textual validation message. If the product later exceeds the small stable option set or requires search, it must migrate to the current Select/Combobox standard with deterministic `searchPlacement`; it must not grow an ad-hoc search field. The current level cannot be selected as a change. Stage two states whether this is an upgrade or downgrade, displays changed benefits, and repeats the required reason. MFA success refreshes `vipLevel`, `isVip`, and every active user snapshot.

### Cumulative recharge Drawer

The fixed header shows the user and current VIP level. The body displays cumulative qualifying recharge, amount counted toward the current level, next-level target and progress, followed by recharge records with time, amount, qualifying amount, source, and transaction ID. This surface is read-only and has no footer confirmation.

### Rebate reward Dialog

Stage one shows the destination as the user’s available balance, accepts an amount with up to two decimals, and requires a reason. Stage two previews the balance before and after and warns that the reward creates a financial transaction. MFA success writes the rebate and audit records atomically, refreshes balances, and then closes the business Dialog.

## Orchestration and error handling

`UserListPage` owns open state, selected user snapshots, return-focus targets, and one dedicated membership MFA flow. `handleOperationDrawerAction` opens second-layer surfaces without changing `operationDrawerOpen`.

The MFA flow dispatches exactly one repository command by action type. During MFA, the originating business surface receives `busy`, disabling header close, footer close, Escape, submission, and duplicate callbacks. Cancelling MFA keeps the completed business form intact. Repository or verification failure keeps the top layer open, exposes a textual error summary, and focuses it. Success refreshes every copy of the affected user before the business layer begins its close animation.

## Dialog, Drawer, and responsive requirements

- Teleport every modal surface to `body` and use the shared dynamic layer stack; do not add local fixed `z-index` values.
- Use a viewport-fixed full overlay. Backdrop, drag, and swipe never close a surface.
- Frames use `overflow: hidden`; only the body uses `overflow-y: auto`. Headers, top-right `aria-label="关闭"` controls, status regions, and footers remain fixed.
- Dialogs open with overlay fade plus `scale(0.96)` over `200ms ease-out` and close over `150ms ease-in`. Right Drawers use the matching right-edge translation. Reduced motion removes scale/translation and uses at most `50ms` fades.
- Use `role="dialog"`, `aria-modal="true"`, visible titles with `aria-labelledby`, initial focus, focus trap, top-layer Escape, focus return after leave, background inertness, and scroll locking through close animation.
- Use dynamic viewport units with `vh` fallbacks and safe-area padding. At narrow widths, forms become one column without removing fields or actions. At 200% zoom, low-height viewports, and with a virtual keyboard, the body remains scrollable and focused controls remain reachable.
- Do not use legacy native `<select>` elements or ad-hoc searchable dropdowns for this batch. The two small stable choices are native radio groups. Any future Select/Combobox must implement the latest `selectedValue`/`query`/`activeOption` state separation, deterministic placement, stable ARIA IDs, committed-value preservation, keyboard behavior, and orphaned-invalid handling.

## Testing and acceptance

1. Repository tests prove successful mutations, review ownership and one-time decisions, score/VIP/rebate validation, exact audit records, transaction IDs, immutable queries, and failure atomicity.
2. Component tests prove each surface’s public event contract, two-stage validation where applicable, fixed-frame scrolling, accessible semantics, dynamic layer style, animation timings, reduced motion, busy guards, and error focus.
3. Orchestration tests prove all five entries become available, every branch lives in `handleOperationDrawerAction`, the parent operation Drawer remains open, each later layer opens above every earlier layer including the four-layer review path, and successful mutations refresh all user copies.
4. Full automated tests, production build, and `git diff --check` must pass.
5. Manual verification must cover operation Drawer → child Drawer/Dialog → MFA or review decision at 1440×900, 1280×720, 390×700, low-height landscape, and 200% zoom. Check backdrop/drag resistance, body-only scrolling, focus entry/trap/return, topmost Escape, background inertness, long text, virtual keyboard, safe areas, rapid duplicate actions, async failures, and reduced motion. Any check not actually executed must be reported as unverified.

## Out of scope

- Reworking the global credit-score audit pages or migrating their legacy demo scale.
- Defining multiple wallet subaccounts that do not exist in the current user model.
- Changing automatic VIP upgrade policy or credit-score configuration.
- Implementing the remaining “链上钱包” entry, which remains a separate funds read-only batch.
