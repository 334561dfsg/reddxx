# User Operation Audit Log Design

## Goal

Add a `用户操作日志` page under `用户管理` that lets operators query every audit event that materially changes a user. The first version covers changes to user profile, permissions, funds, membership or level, account status, and risk-control result.

## Audit Boundary

The log includes only events that change user state. Ordinary browsing, opening a detail page, list search, login, and orders are excluded unless they modify one of the protected user domains.

Each log record stores:

- `id`
- `occurredAt`
- target user identity: `uid`, display name, email or phone when available
- source type: admin, user, system, risk rule, or scheduled task
- operator identity: admin id/name, user id/name, or system rule/task name
- category: profile, permission, funds, membership, status, or risk
- action key and readable action name
- result: success, failed, partial, or unknown
- reason: required for manual changes; rule/task reason for automatic changes
- summary
- before/after field diffs
- related business id, request id, audit receipt id, rule id, task id, tenant/workspace, permission version

Manual business mutation forms must require a reason before submission. Successful mutations write before/after diffs. Validation failures that send no mutation request do not create audit records. If a request result is unknown, the audit record is stored as `unknown` and is later findable by request id or business id.

Audit records are append-only in the UI. The page provides no edit or delete entry.

## Page And Query Design

Navigation adds `用户管理 / 用户操作日志` with route `/admin/users/operation-logs`. This is separate from the existing `用户点控日志`, which remains focused on point-control module history.

The page is a management-console audit surface with a row-action data table. It supports explicit query submission with separate draft and applied filters:

- target user keyword: UID, username, email, or phone
- operator/source keyword
- category
- action/result
- reason keyword
- related business/request/rule/task id
- time range, defaulting to the latest 7 days

Applying or resetting filters returns pagination to page 1. Applied filters remain visible and individually removable. Filter values that may contain personal data stay in component state and are not written into URLs.

Results sort by `occurredAt desc, id desc` for stable newest-first pagination. The first version uses numbered pagination with 20 rows per page and reliable total count. The table columns are time, target user, operator/source, category/action, change summary, reason, result, and detail action. Row detail expands inline to show before/after diffs and related ids, avoiding a modal Drawer/Dialog for this feature.

Narrow layouts keep the same query, detail, and pagination capabilities. The table can become a card list with the same row identities, summaries, reasons, result state, and expandable details. Core fields are never removed; secondary fields may move into the expanded detail area.

Empty and failure states are distinct: no audit permission, no data, filters with no match, audit service unavailable, and delayed data.

## Architecture

Create a central audit repository and constants module:

- `src/admin/constants/userAuditLog.js` defines categories, sources, result types, action options, reason constraints, and display labels.
- `src/admin/repositories/userAuditLogRepository.js` owns seeded audit records, append helpers, diff normalization, query filtering, stable sorting, and pagination.
- `src/pages/admin/user/UserOperationLogPage.vue` renders the audit query page and inline details.

Existing user mutation entry points call the repository append helper after successful changes. Initial wiring focuses on current admin demo mutation flows that affect profile, funds, membership, status, and risk-control results. Seed data covers all six categories so the page is useful even before a user performs a new mutation in the current session.

The repository stores records in memory for this demo app, following the existing local repository pattern. It keeps a single audit source for the new page instead of building one page per business module.

## Permissions, Risk, And Feedback

The audit page is read-only. Row detail is a row action, not a mutation. Permission-sensitive fields are rendered through labels already present in the audit record, and future backend integration should apply field-level redaction before records reach the page.

Manual mutation dialogs/forms that are wired into audit logging must reject empty reasons. System or rule-driven entries must include a rule name, task name, or matched-rule reason.

Mutation success feedback cannot rely on toast-only audit evidence. The audit record id is returned by repository append helpers so calling flows can surface or test the audit receipt when needed.

## Testing And Verification

Add focused node tests for:

- audit schema normalization and append-only behavior
- required manual reason
- before/after diff generation
- query filtering by target user, operator/source, category, result, reason, related id, and time range
- stable newest-first pagination
- route/nav registration
- page source behavior for explicit apply/reset filters, visible applied filters, inline details, and responsive card/table affordances
- current mutation wiring creating audit records for profile/funds/membership/status/risk categories where the demo app exposes those flows

Run `npm test` and `npm run build`. Browser, assistive technology, touch, 200% zoom, virtual keyboard, high-contrast, safe-area, and real viewport checks must be reported as unverified unless actually executed.
