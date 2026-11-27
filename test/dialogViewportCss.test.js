import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'


test('the shared Ant dialog frame keeps a vh fallback before its dvh viewport limit', () => {
  // UserControlModal moved onto AdminDialog (2026-11-27); the frame's stylesheet owns the viewport limit now.
  const frame = readFileSync(new URL('../src/admin/components/antd/AdminDialog.vue', import.meta.url), 'utf8')
  assert.match(frame, /max-height: calc\(100vh - 24px\); max-height: calc\(100dvh - 24px/)
})
