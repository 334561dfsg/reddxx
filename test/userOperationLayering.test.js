import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const root = new URL('../', import.meta.url)
const actionFiles = [
  'src/admin/components/user/UserDepositAction.vue',
  'src/admin/components/user/UserAdjustAction.vue',
  'src/admin/components/user/UserTransferAction.vue',
  'src/admin/components/user/UserFreezeAction.vue'
]

test('legacy user action dialogs use the shared layer lifecycle', () => {
  for (const file of actionFiles) {
    const source = readFileSync(new URL(file, root), 'utf8')
    assert.match(source, /useDialogLifecycle/)
    assert.match(source, /:style="layerStyle"/)
    assert.match(source, /ref="dialogRef"/)
    assert.match(source, /role="dialog"/)
    assert.match(source, /aria-modal="true"/)
    assert.match(source, /aria-label="关闭"/)
    assert.doesNotMatch(source, /fixed inset-0 z-\[(?:50|60|70)\]|fixed inset-0 z-(?:50|60|70)/)
  }
})

test('legacy user action dialogs retain their shared layer through leave animation', () => {
  for (const file of actionFiles) {
    const source = readFileSync(new URL(file, root), 'utf8')
    assert.match(source, /v-if="rendered"/)
    assert.match(source, /@after-enter="onAfterEnter"/)
    assert.match(source, /@after-leave="onAfterLeave"/)
    assert.match(source, /requestDialogClose/)
    assert.match(source, /200ms ease-out/)
    assert.match(source, /150ms ease-in/)
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

  assert.match(source, /useDialogLifecycle/)
  assert.match(source, /:style="layerStyle"/)
  assert.match(source, /v-if="rendered"/)
  assert.match(source, /@after-enter="onAfterEnter"/)
  assert.match(source, /@after-leave="handleAfterLeave"/)
  assert.match(source, /role="dialog"/)
  assert.match(source, /aria-modal="true"/)
  assert.match(source, /aria-labelledby="user-detail-drawer-title"/)
  assert.match(source, /data-testid="user-detail-drawer"[^>]*overflow-hidden/)
  assert.match(source, /data-testid="user-detail-drawer-body"[^>]*overflow-y-auto/)
  assert.match(source, /aria-label="关闭"/)
  assert.doesNotMatch(source, /fixed inset-0 z-50/)
  assert.match(source, /200ms ease-out/)
  assert.match(source, /150ms ease-in/)
  assert.match(source, /prefers-reduced-motion: reduce/)
})
