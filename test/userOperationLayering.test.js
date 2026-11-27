import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { assertAdminDialogFrame, assertAdminDrawerFrame } from './helpers/adminDrawerFrame.js'
const root = new URL('../', import.meta.url)
const actionFiles = [
  'src/admin/components/user/UserDepositAction.vue',
  'src/admin/components/user/UserAdjustAction.vue',
  'src/admin/components/user/UserTransferAction.vue',
  'src/admin/components/user/UserFreezeAction.vue'
]

test('legacy user action dialogs use the shared Ant dialog frame and its layer lifecycle', () => {
  // Migrated onto AdminDialog (2026-11-27): the frame owns the layer, dialog semantics, close button and motion.
  for (const file of actionFiles) {
    const source = readFileSync(new URL(file, root), 'utf8')
    assertAdminDialogFrame(source)
    assert.match(source, /<AdminDialog\b[^>]*:open="showModal"[^>]*:return-focus="returnFocusRef"/)
    assert.match(source, /if \(phase\.value !== 'closed'\) return false/)
    assert.doesNotMatch(source, /fixed inset-0 z-\[(?:50|60|70)\]|fixed inset-0 z-(?:50|60|70)/)
    // Operation feedback through Ant message, not a hand-built toast.
    assert.doesNotMatch(source, /toast\.visible/)
    assert.match(source, /import \{ message \} from 'ant-design-vue'/)
  }
})

test('operation orchestrator forwards the originating card as child return focus', () => {
  const operations = readFileSync(new URL('src/admin/components/user/UserOperations.vue', root), 'utf8')
  const list = readFileSync(new URL('src/pages/admin/user/UserListPage.vue', root), 'utf8')
  const drawer = readFileSync(new URL('src/admin/components/user/UserOperationDrawer.vue', root), 'utf8')
  assert.match(drawer, /trigger: event\?\.currentTarget/)
  assert.match(operations, /open\(returnFocus\)/)
  assert.match(list, /openRegularAction\(user, regularActions\[id\], trigger\)/)
})

test('user detail drawer uses the shared layer stack and a fixed scrolling frame', () => {
  const source = readFileSync(new URL('src/admin/components/user/UserDetailDrawer.vue', root), 'utf8')

  // Top drawer on the shared Ant frame (AdminDrawer): layer stack, dialog semantics, close button and motion there.
  assertAdminDrawerFrame(source)
  assert.match(source, /<AdminDrawer\b[^>]*title-id="user-detail-drawer-title"[^>]*testid="user-detail-drawer"[^>]*placement="top"/)
  assert.match(source, /@closed="handleClosed"/)
  assert.match(source, /data-testid="user-detail-drawer-body"[^>]*overflow-y-auto/)
})
