# Admin Voice Alert Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an independent admin system settings page for global and per-event voice alert switches.

**Architecture:** Extend the existing site configuration mock with a normalized `voiceAlerts` object, then add a focused Vue settings page that loads a draft, edits switches locally, and saves through `siteConfigApi.updateSiteConfig`. Register the page in both `consoleRoutes` and the admin sidebar `navTree`.

**Tech Stack:** Vue 3 SFC, Vue Router route config, Tailwind utility classes, Node `node:test`

## Global Constraints

- Page route must be `/admin/system/voice-alerts`.
- Menu title must be `语音提醒` under `系统设置`.
- The global and all per-event switches default to enabled.
- Editing switches is draft-only until the operator clicks `保存配置`.
- The page must expose all requested alert events and not remove any capability on narrow screens.

---

### Task 1: Add configuration and navigation coverage

**Files:**
- Test: `test/adminVoiceAlertSettings.test.js`
- Modify: `src/admin/mock/siteConfig.js`
- Modify: `src/router/modules/console.js`
- Modify: `src/admin/config/nav.js`
- Create: `src/pages/admin/system/VoiceAlertSettingsPage.vue`

**Interfaces:**
- Consumes: `normalizeSiteConfig(raw)`, `DEFAULT_SITE_CONFIG`, `consoleRoutes`, and `navTree`.
- Produces: `DEFAULT_VOICE_ALERT_EVENTS`, `normalizeVoiceAlerts(raw)`, `voiceAlerts` config, route name `system-voice-alerts`, and page source containing every event label.

- [ ] **Step 1: Write the failing test**

Create `test/adminVoiceAlertSettings.test.js` with assertions for default enabled switches, normalization of invalid raw values, route/menu registration, and page source labels.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/adminVoiceAlertSettings.test.js`

Expected: FAIL because the test imports missing `DEFAULT_VOICE_ALERT_EVENTS` and `normalizeVoiceAlerts`.

- [ ] **Step 3: Implement configuration normalization**

Add `DEFAULT_VOICE_ALERT_EVENTS`, `DEFAULT_VOICE_ALERTS`, and `normalizeVoiceAlerts(raw)` to `src/admin/mock/siteConfig.js`; include `voiceAlerts` in `DEFAULT_SITE_CONFIG`, `normalizeSiteConfig`, and `siteConfigApi.updateSiteConfig`.

- [ ] **Step 4: Register the route and menu**

Add route `system/voice-alerts` with name `system-voice-alerts` and add `{ title: '语音提醒', path: '/admin/system/voice-alerts' }` under `系统设置`.

- [ ] **Step 5: Build the page**

Create `VoiceAlertSettingsPage.vue` with a loading state, global switch, per-event switches, explicit save, restore-saved, and restore-default actions.

- [ ] **Step 6: Run focused test and build**

Run:

```bash
npm test -- test/adminVoiceAlertSettings.test.js
npm run build
```

Expected: both pass.
