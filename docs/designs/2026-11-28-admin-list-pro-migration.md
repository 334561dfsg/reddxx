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
