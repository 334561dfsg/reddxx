import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  USER_OPERATION_QUICK_IDS,
  getUserOperationEntry,
  getUserOperationGroups,
  resolveUserOperationReturnFocus
} from '../src/admin/config/userOperations.js'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('operation catalog keeps the approved quick actions and grouped entries', () => {
  assert.deepEqual(USER_OPERATION_QUICK_IDS, [
    'detail',
    'assets',
    'deposit',
    'freeze-account',
    'all'
  ])

  const groups = getUserOperationGroups({ status: 'active' })
  assert.deepEqual(groups.map((group) => group.label), [
    '用户与关系',
    '资金与钱包',
    '信用与会员',
    '风控与控制'
  ])
  const funds = groups.find((group) => group.id === 'funds')
  assert.deepEqual(funds.entries.map((entry) => entry.title), [
    '资金概况',
    '链上钱包',
    '客服入金',
    '账户间划转',
    '冻结全部资金',
    '解冻后台冻结',
    '划扣可用资金',
    '出金流水限制'
  ])
  assert.doesNotMatch(JSON.stringify(funds.entries), /调账|后台划扣记录|手动上分地址/)
  assert.match(getUserOperationEntry('transfer', {}).description, /总资产不变/)
  assert.match(getUserOperationEntry('deduct-funds', {}).description, /减少用户可用资产/)

  assert.deepEqual(groups.flatMap((group) => group.entries.map((entry) => entry.title)), [
    '编辑资料',
    '查看直属下级',
    '查看全部下级',
    '重设上级',
    '设置／重设代理',
    '查看团队报表',
    '资金概况',
    '链上钱包',
    '客服入金',
    '账户间划转',
    '冻结全部资金',
    '解冻后台冻结',
    '划扣可用资金',
    '出金流水限制',
    '信用分审核',
    '修改信用分',
    '编辑会员等级',
    '会员累计充值',
    '添加返利奖励',
    '封户',
    '统一点控',
    '取消点控',
    '点控日志'
  ])
})

test('operation catalog distinguishes implemented and planned actions', () => {
  assert.equal(getUserOperationEntry('deposit', { status: 'active' }).status, 'available')
  assert.equal(getUserOperationEntry('adjust', { status: 'active' }), null)
  assert.equal(getUserOperationEntry('freeze-funds', { status: 'active' }).status, 'planned')
  assert.equal(getUserOperationEntry('deduct-funds', { status: 'active' }).risk, 'danger')
  assert.equal(getUserOperationEntry('vip-level', { status: 'active' }).status, 'planned')
  assert.equal(getUserOperationEntry('credit-adjust', { status: 'active' }).status, 'planned')
})

test('combined VIP and credit adjustment is removed from active operation paths', () => {
  const operationsSource = read('../src/admin/components/user/UserOperations.vue')
  const listSource = read('../src/pages/admin/user/UserListPage.vue')

  assert.doesNotMatch(operationsSource, /UserAdjustAction/)
  assert.doesNotMatch(operationsSource, /adjustAction/)
  assert.doesNotMatch(listSource, /adjust:\s*'adjust'/)
})

test('detail and funds shortcuts target explicit overview and assets views', () => {
  const detailSource = read('../src/admin/components/user/UserDetailDrawer.vue')
  const listSource = read('../src/pages/admin/user/UserListPage.vue')

  assert.match(detailSource, /initialTab:\s*\{[^}]*default:\s*'overview'/s)
  assert.match(detailSource, /\{ id: 'overview', label: '概览' \}/)
  assert.match(detailSource, /activeTab === 'overview'/)
  assert.match(listSource, /openUserDetail\(user, 'overview'/)
  assert.match(listSource, /openUserDetail\(user, 'assets'/)
  assert.match(listSource, /:initial-tab="detailInitialTab"/)
})

test('account lock wording changes without moving the action', () => {
  const activeGroups = getUserOperationGroups({ status: 'active' })
  const lockedGroups = getUserOperationGroups({ status: 'suspended' })
  const activeRiskActions = activeGroups.at(-1).entries
  const lockedRiskActions = lockedGroups.at(-1).entries

  assert.equal(activeRiskActions[0].id, 'freeze-account')
  assert.equal(activeRiskActions[0].title, '封户')
  assert.equal(lockedRiskActions[0].id, 'freeze-account')
  assert.equal(lockedRiskActions[0].title, '解封')
})

test('operation focus falls back to the row trigger when no action card is available', () => {
  const rowTrigger = { isConnected: true, focus() {} }
  const actionCard = { isConnected: true, focus() {} }

  assert.equal(resolveUserOperationReturnFocus(actionCard, rowTrigger), actionCard)
  assert.equal(resolveUserOperationReturnFocus(null, rowTrigger), rowTrigger)
  assert.equal(resolveUserOperationReturnFocus({ ...actionCard, isConnected: false }, rowTrigger), rowTrigger)
})

test('operation drawer uses the shared modal lifecycle and a fixed scrolling frame', () => {
  const source = read('../src/admin/components/user/UserOperationDrawer.vue')

  assert.match(source, /<Teleport to="body">/)
  assert.match(source, /useDialogLifecycle/)
  assert.match(source, /role="dialog"/)
  assert.match(source, /aria-modal="true"/)
  assert.match(source, /aria-labelledby="user-operation-drawer-title"/)
  assert.match(source, /fixed inset-0/)
  assert.match(source, /data-testid="user-operation-drawer"[^>]*overflow-hidden/)
  assert.match(source, /data-testid="user-operation-drawer-body"[^>]*overflow-y-auto/)
  assert.match(source, /aria-label="关闭"/)
  assert.doesNotMatch(source, /@click\.self|@mousedown\.self/)
  assert.match(source, /drawer-overlay-enter-active[^}]*200ms ease-out/)
  assert.match(source, /drawer-overlay-leave-active[^}]*150ms ease-in/)
  assert.match(source, /drawer-panel-enter-active[^}]*200ms ease-out/)
  assert.match(source, /drawer-panel-leave-active[^}]*150ms ease-in/)
  assert.match(source, /prefers-reduced-motion: reduce/)
  assert.match(source, /transition-duration: 50ms/)
})

test('operation drawer renders grouped actions and explains planned entries without mutation', () => {
  const source = read('../src/admin/components/user/UserOperationDrawer.vue')

  assert.match(source, /getUserOperationGroups/)
  assert.match(source, /v-for="group in operationGroups"/)
  assert.match(source, /v-for="entry in group\.entries"/)
  assert.match(source, /待接入/)
  assert.match(source, /该功能入口已预留，业务能力待接入/)
  assert.match(source, /aria-live="polite"/)
  assert.match(source, /sm:grid-cols-2/)
})

test('user list exposes one-click row actions and coordinates the complete operation drawer', () => {
  const source = read('../src/pages/admin/user/UserListPage.vue')

  assert.match(source, /import UserOperationDrawer/)
  assert.doesNotMatch(source, /useRouter/)
  assert.match(source, /openOperationDrawer/)
  assert.match(source, /handleOperationDrawerAction/)
  assert.match(source, /executeDeferredDrawerAction/)
  assert.match(source, /<UserOperationDrawer/)
  assert.match(source, /@action="handleOperationDrawerAction"/)
  assert.match(source, /@closed="executeDeferredDrawerAction"/)
  assert.match(source, /data-testid="user-row-action-bar"/)
  assert.match(source, />\s*详情<\/button>/)
  assert.match(source, />\s*资金<\/button>/)
  assert.match(source, />\s*入金<\/button>/)
  assert.match(source, />\s*更多\s*<\/button>/)
  assert.match(source, /data-testid="user-row-action-bar"[^>]*gap-2/)
  assert.equal((source.match(/class="inline-flex h-9 min-w-12 items-center justify-center rounded-lg px-3 text-sm/g) || []).length, 4)
  assert.doesNotMatch(source, /data-testid="user-point-control-action-menu"/)
  assert.doesNotMatch(source, /toggleActionMenu/)
})

test('operation drawer uses compact, balanced action tiles without shrinking close target', () => {
  const source = read('../src/admin/components/user/UserOperationDrawer.vue')

  assert.match(source, /data-testid="user-operation-drawer-body"[^>]*space-y-4[^>]*px-3[^>]*py-3[^>]*sm:px-4/)
  assert.match(source, /class="mb-1\.5 text-xs font-semibold/)
  assert.match(source, /grid grid-cols-1 gap-1\.5 sm:grid-cols-2/)
  assert.match(source, /min-h-16[^"\n]*p-2\.5/)
  assert.match(source, /text-sm font-medium text-slate-900/)
  assert.match(source, /mt-1 block text-xs leading-4/)
  assert.match(source, /min-h-11 min-w-11/)
})
