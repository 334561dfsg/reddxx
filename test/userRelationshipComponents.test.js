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

test('edit profile entry opens an accessible validated child Dialog', () => {
  const entry = getUserOperationEntry('edit-profile')
  const source = read('src/admin/components/user/UserProfileEditDialog.vue')
  assert.equal(entry.status, 'available')
  assert.equal(entry.handler, 'edit-profile')
  assert.match(source, /编辑用户资料/)
  for (const model of ['username', 'email', 'phone', 'remark']) {
    assert.match(source, new RegExp(`v-model="form\\.${model}"`))
  }
  assert.match(source, /validateProfile/)
  assert.match(source, /updateProfile/)
  assert.match(source, /role="alert"/)
  assert.match(source, /:aria-busy="submitting"/)
  assert.match(source, /useDialogLifecycle/)
  assert.match(source, /:style="layerStyle"/)
  assert.match(source, /aria-label="关闭"/)
})

test('user list keeps the operation Drawer mounted while editing profile', () => {
  const source = read('src/pages/admin/user/UserListPage.vue')
  assert.match(source, /UserProfileEditDialog/)
  assert.match(source, /profileEditOpen/)
  assert.match(source, /profileEditReturnFocus/)
  assert.match(source, /handleProfileSaved/)
})

test('reset parent entry uses a two-phase validated child Dialog', () => {
  const entry = getUserOperationEntry('reset-parent')
  const source = read('src/admin/components/user/UserParentResetDialog.vue')
  assert.equal(entry.status, 'available')
  assert.equal(entry.handler, 'reset-parent')
  assert.match(source, /当前上级/)
  assert.match(source, /新上级/)
  assert.match(source, /变更原因/)
  assert.match(source, /预计影响.*下级/)
  assert.match(source, /确认重设上级/)
  assert.match(source, /getParentCandidates/)
  assert.match(source, /getDescendants/)
  assert.match(source, /resetParent/)
  assert.match(source, /phaseName/)
  assert.match(source, /useDialogLifecycle/)
})

test('user list orchestrates parent reset above the operation Drawer', () => {
  const source = read('src/pages/admin/user/UserListPage.vue')
  assert.match(source, /UserParentResetDialog/)
  assert.match(source, /parentResetOpen/)
  assert.match(source, /parentResetReturnFocus/)
  assert.match(source, /handleParentResetSaved/)
})

test('agent role entry handles promotion and safe demotion in a child Dialog', () => {
  const entry = getUserOperationEntry('reset-agent')
  const source = read('src/admin/components/user/UserAgentRoleDialog.vue')
  assert.equal(entry.status, 'available')
  assert.equal(entry.handler, 'reset-agent')
  assert.match(source, /设置为代理/)
  assert.match(source, /取消代理身份/)
  assert.match(source, /承接上级/)
  assert.match(source, /直属下级/)
  assert.match(source, /变更原因/)
  assert.match(source, /getDirectReferrals/)
  assert.match(source, /getParentCandidates/)
  assert.match(source, /updateAgentRole/)
  assert.match(source, /phaseName/)
  assert.match(source, /useDialogLifecycle/)
})

test('user list orchestrates agent role changes above the operation Drawer', () => {
  const source = read('src/pages/admin/user/UserListPage.vue')
  assert.match(source, /UserAgentRoleDialog/)
  assert.match(source, /agentRoleOpen/)
  assert.match(source, /agentRoleReturnFocus/)
  assert.match(source, /handleAgentRoleSaved/)
})

test('team report entry renders approved metrics and branch details in a child Drawer', () => {
  const entry = getUserOperationEntry('team-report')
  const source = read('src/admin/components/user/UserTeamReportDrawer.vue')
  assert.equal(entry.status, 'available')
  assert.equal(entry.handler, 'team-report')
  for (const label of ['团队总人数', '直属人数', '代理人数', '活跃人数', '总可用余额', '总冻结余额', '总交易量', '团队累计盈亏']) {
    assert.match(source, new RegExp(label))
  }
  assert.match(source, /分支明细/)
  assert.match(source, /getTeamReport/)
  assert.match(source, /data-testid="team-report-drawer-body"[^>]*class="[^"]*overflow-y-auto/)
  assert.match(source, /useDialogLifecycle/)
  assert.match(source, /:style="layerStyle"/)
})

test('all six relationship entries are available after the first batch', () => {
  for (const id of ['edit-profile', 'direct-referrals', 'all-referrals', 'reset-parent', 'reset-agent', 'team-report']) {
    const entry = getUserOperationEntry(id)
    assert.equal(entry.status, 'available', `${id} should be available`)
    assert.notEqual(entry.handler, 'planned', `${id} should have a real handler`)
  }
})

test('user list orchestrates team report above the operation Drawer', () => {
  const source = read('src/pages/admin/user/UserListPage.vue')
  assert.match(source, /UserTeamReportDrawer/)
  assert.match(source, /teamReportOpen/)
  assert.match(source, /teamReportReturnFocus/)
})

test('relationship action branches live inside the operation Drawer handler', () => {
  const source = read('src/pages/admin/user/UserListPage.vue')
  const handlerStart = source.indexOf('const handleOperationDrawerAction')
  const handlerEnd = source.indexOf('const closeRelationshipDrawer', handlerStart)
  const handler = source.slice(handlerStart, handlerEnd)
  for (const id of ['edit-profile', 'reset-parent', 'reset-agent', 'team-report']) {
    assert.match(handler, new RegExp(`id === '${id}'`), `${id} must be handled by handleOperationDrawerAction`)
  }

  const controlStart = source.indexOf('const selectControlSetting')
  const controlEnd = source.indexOf('const selectControlCancel', controlStart)
  const controlSelector = source.slice(controlStart, controlEnd)
  assert.doesNotMatch(controlSelector, /id ===|\btrigger\b/)
})
