# Admin pages → Ant Design Pro layout (2026-11-28)

Reference implementation: `src/pages/admin/delivery/DeliveryOrderPage.vue` (pilot) and the newer modules
(`src/pages/admin/quantFund/*`, `src/pages/admin/c2c/*`). Shared parts live in `src/pages/admin/earn/`:

- `EarnPageShell.vue` (import as `PageShell`): ConfigProvider with the Ant seed typography, 24px vertical rhythm.
  Pass `title` only for editor/config pages (Ant PageHeader). **List pages pass no title** — they start with the query card.
- `EarnSearchForm.vue` (`SearchForm`): ProTable query card. `fields`: `{ key, label }` text input; `options` → Select
  (`searchable: true` for typed search — required for coin/currency/product selects); `range: true` → date range
  (`[start, end]` 'YYYY-MM-DD' or null); `numberRange: true` → `[min, max]` InputNumbers (`min` optional). One field per
  input; never a combined multi-field keyword box. More than five fields collapse to the first row behind 展开/收起.
  Draft vs applied: the page keeps `filters` (applied), `@search` replaces them (reset page to 1), `@reset` restores blanks.
  Select "all" sentinel is the string `'all'`.
- `EarnAdminTable.vue` (`AdminTable`): table card with `title`, `#toolbar` slot (refresh/export/create buttons on the right),
  10-row client pagination with 共 N 条, `v-model:page`, `columns` (`key`, `title`, `width`, `align: 'right'` for amounts,
  `fixed: 'left'|'right'`), `#cell="{ column, record }"` for every cell, `row-key`, `desktop-only` (the admin is desktop-only).

## Rules for every page

1. Remove the hand-built page header (`<h1>` + description, page-level summary banners and shortcut buttons).
   Create/export buttons move to the table card toolbar. Summary statistics that are business content may stay as a
   `Card` with `Statistic`s below the query card, but not as a decorative banner.
2. Filters: one `SearchForm` field per filter, explicit 查询/重置 (no instant filtering of the draft), labels without colons
   in the source (Ant adds them), keep every existing filter capability (map ranges/dates/amounts to the field kinds above).
3. Table: Ant table via `AdminTable`; amounts right-aligned with the unit in the column title; secondary lines with
   `TypographyText type="secondary"`; status as `Tag` **with text** (never colour or a dot alone); direction/side as Tag;
   operation column = `Button type="link"` (danger for destructive), at most three, put the rest in a 更多 `Dropdown`.
   Remove legacy Tailwind colour/size utilities from cells; keep `font-mono` for ids.
4. Config/settings pages (forms, not lists): `PageShell title="…"` + grouped `Card`s with Ant `Form` (vertical or
   horizontal) and a bottom action bar (primary 保存 + default 重置/取消), like `src/pages/admin/earn/EarnProductEditorPage.vue`.
5. Report/dashboard pages: `PageShell` (no h1) + `Card`s with `Statistic` / tables; keep the data and charts.
6. Guide pages (static docs): `PageShell title` + `Card` content; no layout rewrite needed beyond the shell.
7. Keep business logic, mock data access, dialogs/drawers (already on AdminDialog/AdminDrawer or Ant Modal), validation,
   permissions, toasts (Ant `message`, never `alert()`), routes and `data-testid`s used by tests.
8. AGENTS.md still applies: toast-only feedback, no focus rings or highlighted selection borders, searchable coin selects,
   sort weights descending, desktop-only admin, Ant components instead of native HTML look-alikes.
9. Fix data bugs you find while rewriting a table (wrong field names, typos in constants), and mention them.
10. Tests: source-assertion tests that pin old markup (h1, Tailwind classes, hand-built filters) are updated to the new
    structure; behaviour assertions are never removed. Run the tests that reference your files (`grep -l <FileName> test/*.js`).

## Overlays: dialogs and drawers (2026-11-28, phase 2)

Every admin dialog and drawer uses the shared frames — `src/admin/components/antd/AdminDialog.vue` and
`src/admin/components/antd/AdminDrawer.vue` (read their header comments and props: `title-id`, `plain`, `initial-focus`,
`request-close`, `lifecycle`, `busy`, `testid`, slots `eyebrow`/`subtitle`/`toolbar`/`actions`/`footer`). The small Earn
confirmation `src/pages/admin/earn/EarnAdminModal.vue` stays the confirm dialog. Raw `<a-modal>`, `<a-drawer>`, `<Modal>`,
`<Drawer>` in pages/components are migrated to these frames (keep each one's open state, close paths, busy blocking,
data clearing after close via `@closed`/after-leave, and data-testids).

Body content (inside the frame) follows Ant Design Pro:
1. Forms: Ant `Form` `layout="vertical"` with `FormItem` (label without colon, required asterisk before the label via
   `required`), Ant inputs (`Input`, `InputNumber` full width, `Select` with `show-search` for coins/currencies,
   `Switch`, `RadioGroup`, `Checkbox`, `DatePicker`, `TextArea`, `Upload` or a Button that triggers a hidden file input).
   Two-column layouts via `Row`/`Col` (`:gutter="16"`). Field hints in `extra`; validation errors stay toast + `status="error"`
   + `aria-invalid` (toast-only feedback rule).
2. Read-only details: `Descriptions` (`bordered`, `size="small"`, `:column="2"` or 1 for drawers narrower than 560px),
   status as `Tag` with text, amounts with unit, ids in `TypographyText copyable` / `font-mono` allowed.
3. Lists inside overlays: Ant `Table` (`size="small"`, pagination when > 10 rows) or `List`; empty states `AdminEmpty`.
4. Sections: a heading = `TypographyTitle :level="5"` or a `Card size="small"`/`Divider orientation="left"`; no hand-built
   grey boxes. Static warnings may be `Alert` (`type="warning"|"info"`, `show-icon`), never operation feedback.
5. Footer: a direct `<footer>` child of the slot (plain dialogs) or the `#footer` slot (drawers) with Cancel (default) +
   primary action (`danger` for destructive), `loading` while busy. No Tailwind colour/size/border/rounded/padding utilities
   in overlay markup; use Ant components, `Space`/`Flex`, and minimal scoped layout CSS (grid/flex, widths).
6. No native `alert`/`confirm`/`prompt`; a URL/text prompt becomes a small AdminDialog with an Ant Input.
7. Widths: dialogs 520 (confirm/simple form), 640–720 (form), 880–960 (detail with tables); drawers 560/720/960.

## Backlog: overlays not yet migrated (recorded 2026-11-28, paused by user decision)

The list/config/report layouts are done (commit 55bb16d). The overlay work above was started and then paused because it
is large; nothing of it is applied yet. When resumed, follow the "Overlays" rules above. Remaining, by area:

- Raw `a-modal`/`a-drawer`/`Modal`/`Drawer` still in: user (UserTagRule, VipConfig, VerificationAudit, VerificationLog,
  DepositOrders, WithdrawAudit, UserDepositReport, UserWalletHoldingsDialog), agent (AgentManagement 账号设置/记佣配置/详情,
  AgentCommissionSettlement, AgentReport, ReferralCommission, ReferralStatistics), perpetual (ContractMonitor,
  LeverageTemplate, Management, Order, Report — its 风险评估标准 dialog is dead code), spot (Order, Product, Symbol),
  delivery (Order), aiQuant (ForceRedeemModal, Order, Product, YieldAdjustmentModal), system (Announcements, ContentPages,
  ErrorCode, LocaleSettings, News, SmsChannels, SmtpSettings, SocialLinks), liquidity locked (Adjustments, Module,
  Products — its 编辑产品 dialog has a bordered selected tab, grey Tailwind tier boxes and a hand-built preview column,
  YieldControl), lending (Order, Product, Repayment), records drawers (EarnHoldingRewards, QuantFundRecords,
  StrategyRecords).
- On AdminDialog/AdminDrawer but bodies still Tailwind-built (largest first): PerpetualContractMonitorPage,
  UserDetailDrawer, UserTagRulePage, CreditScoreAuditDrawer, AgentManagementPage, DeliveryManagementPage,
  UserControlDetailDrawer, ContentPagesPage, VipConfigPage, the src/admin/components/user/* dialogs and drawers,
  DeliveryTemplatePage, SpotSymbolPage, AdminSoundGuideDialog, ModuleUserControlPage add-user dialog, MfaVerificationModal,
  AdminChangePasswordDialog, MinimumDepositDialog, DeliveryRuleModal, ControlConfigModal.
- Known rule violations to fix with them: ContentPagesPage link/image buttons use `window.prompt`; ModuleUserControlPage
  add-user dialog shows an inline "没有搜索到匹配用户" message instead of toast; VipConfigPage icon upload is a hand-built
  file area.
