import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getUserOperationEntry } from '../src/admin/config/userOperations.js'

const root = new URL('../', import.meta.url)
const read = (path) => readFileSync(new URL(path, root), 'utf8')

test('direct and all referral entries are available with dedicated handlers', () => {
  assert.deepEqual(
    ['direct-referrals', 'all-referrals'].map((id) => {
      const entry = getUserOperationEntry(id)
      return { id, status: entry.status, handler: entry.handler }
    }),
    [
      { id: 'direct-referrals', status: 'available', handler: 'direct-referrals' },
      { id: 'all-referrals', status: 'available', handler: 'all-referrals' }
    ]
  )
})

test('relationship member Drawer uses shared layering and one body scroller', () => {
  const source = read('src/admin/components/user/UserRelationshipDrawer.vue')
  assert.match(source, /useDialogLifecycle/)
  assert.match(source, /:style="layerStyle"/)
  assert.match(source, /data-testid="relationship-drawer-body"[^>]*class="[^"]*overflow-y-auto/)
  assert.match(source, /role="dialog"/)
  assert.match(source, /aria-modal="true"/)
  assert.match(source, /aria-label="关闭"/)
  assert.match(source, /getDirectReferrals/)
  assert.match(source, /getDescendants/)
  assert.match(source, /当前没有下级/)
  assert.match(source, /筛选后没有结果/)
})

test('user list orchestrates both relationship modes above the operation Drawer', () => {
  const source = read('src/pages/admin/user/UserListPage.vue')
  assert.match(source, /UserRelationshipDrawer/)
  assert.match(source, /relationshipDrawerMode/)
  assert.match(source, /\['direct-referrals', 'all-referrals'\]/)
  assert.match(source, /:return-focus="relationshipReturnFocus"/)
})
