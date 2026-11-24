# Trading record mock verification — 2026-11-24

- Added 21 current synthetic records: six positions, six perpetual orders, six spot orders, three delivery orders. Retained 12 histories per historical bucket (48 total), including new cancelled spot examples.
- All eight product tabs contain independent records. Delivery current records display entry/amount/fee/status without settlement fields; historical cards retain settlement results.
- Browser verified desktop rendering for all three products, both delivery tabs, perpetual positions/orders/both histories, spot orders/history and page 2. Verified a partial ETH spot cancellation: remaining 0.48 confirmed, original 0.8 retained, filled 0.32 preserved in history.
- Unit checks cover partial-cancellation fee arithmetic, duplicate action protection, record isolation, current delivery fields and all-tab coverage.
- Reference inspected in user's Chrome at fex.h456club888.com: perpetual and delivery available balance was zero; no reference orders submitted. Existing reference record schema retained; no claim of newly observed successful-order detail fields.
- This change does not add a settlement clock or persist orders across reloads; fixtures are static session snapshots.
- Not reverified for this data change: phone/tablet/landscape, 200% zoom, virtual keyboard/safe areas, high contrast/reduced motion, full keyboard focus and layered-dialog regression. Check those before production acceptance; desktop click/confirmation and pagination alone do not establish them.
