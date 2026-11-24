# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Source layout fidelity (user decision, 2026-11-24)

This standalone public website is exempt from any inherited requirement to stretch every page to the full screen. Match newtrendcapital.com page-specific centered containers and horizontal gutters. Measured desktop maxima: news/assets 1400px; profile/help/legal 1280px; earn/AI Quant/reward tasks 1440px; referrals 1080px; security/KYC/joint-account forms 768px. Preserve full-width backgrounds where the source uses them, while centering the inner content. Do not apply these exceptions to the existing admin application.

## Brand (user decision, 2026-11-24)

Use NewQuantCapital for the prototype brand, including header/footer wordmark, navigation entry and browser title. Use the local lime monogram `newquantcapital-mark.svg` for its mark and favicon. Keep source-document attribution and provenance intact.

## Localization (user decision, 2026-11-24)

Use module-based packs in `src/locales/<locale>/<namespace>.json` and fixed `t`/`$t` keys. Do not reintroduce source-text reverse lookup, alias tables, regex sentence matching or concatenated translated sentence fragments. Parameterize dynamic values. Keep news/legal content in `src/content/`. Run `npm run check:locales` from this subproject after language changes. See `src/locales/README.md` for maintenance rules.
