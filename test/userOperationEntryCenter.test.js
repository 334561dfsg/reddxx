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

  const groups = getUserOperationGroups({ status: 'active', role: 'user' })
  assert.deepEqual(groups.map((group) => group.label), [
    '用户资料',
    '裂变关系',
    '代理管理',
    '资金与钱包',
    '信用与会员',
    '风控与控制'
  ])
  const fission = groups.find((group) => group.id === 'fission')
  const agent = groups.find((group) => group.id === 'agent')
  assert.deepEqual(fission.entries.map((entry) => entry.title), [
    '查看直属裂变下级',
    '查看全部裂变下级',
    '重设裂变上级',
    '查看裂变团队报表'
  ])
  assert.deepEqual(agent.entries.map((entry) => entry.title), ['设置为代理'])
  assert.equal(agent.entries.some((entry) => entry.id === 'agent-report'), false)
  const funds = groups.find((group) => group.id === 'funds')
  assert.deepEqual(funds.entries.map((entry) => entry.title), [
    '资金概况',
    '链上钱包',
    '客服入金',
    '账户间划转',
    '冻结资金',
    '解冻资金',
    '扣减资金',
    '出金流水限制'
  ])
  assert.doesNotMatch(JSON.stringify(funds.entries), /调账|后台划扣记录|手动上分地址/)
  assert.match(getUserOperationEntry('transfer', {}).description, /总资产不变/)
  assert.equal(getUserOperationEntry('deduct-funds', {}).description, '永久扣减用户可用资金')

  assert.deepEqual(groups.flatMap((group) => group.entries.map((entry) => entry.title)), [
    '编辑资料',
    '查看直属裂变下级',
    '查看全部裂变下级',
    '重设裂变上级',
    '查看裂变团队报表',
    '设置为代理',
    '资金概况',
    '链上钱包',
    '客服入金',
    '账户间划转',
    '冻结资金',
    '解冻资金',
    '扣减资金',
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

test('operation catalog exposes agent-only reporting and contextual agent actions', () => {
  const agentGroups = getUserOperationGroups({ status: 'active', role: 'agent' })
  const agent = agentGroups.find((group) => group.id === 'agent')

  assert.deepEqual(agent.entries.map((entry) => entry.id), ['reset-agent', 'agent-subordinates', 'agent-report'])
  assert.deepEqual(agent.entries.map((entry) => entry.title), ['取消代理身份', '查看下级用户', '查看代理报表'])
  assert.equal(agent.entries.find((entry) => entry.id === 'agent-subordinates').handler, 'agent-subordinates')
  assert.equal(agent.entries.find((entry) => entry.id === 'agent-subordinates').description, '查看归属于该代理的直属客户')
  assert.equal(agent.entries.find((entry) => entry.id === 'agent-report').handler, 'agent-report')
  assert.equal(getUserOperationEntry('reset-agent', { role: 'user' }).title, '设置为代理')
  assert.equal(getUserOperationEntry('reset-agent', { isAgent: true }).title, '取消代理身份')
  assert.equal(getUserOperationEntry('reset-agent', { isAgent: true }).description, '取消用户代理身份并处理其裂变下级关系')
  assert.equal(getUserOperationEntry('reset-agent', { role: 'user', isAgent: true }).title, '设置为代理')
})

test('operation catalog distinguishes implemented and planned actions', () => {
  assert.equal(getUserOperationEntry('deposit', { status: 'active' }).status, 'available')
  assert.equal(getUserOperationEntry('onchain-wallet', { status: 'active' }).status, 'available')
  assert.equal(getUserOperationEntry('onchain-wallet', { status: 'active' }).handler, 'onchain-wallet')
  assert.equal(getUserOperationEntry('adjust', { status: 'active' }), null)
  assert.equal(getUserOperationEntry('freeze-funds', { status: 'active' }).status, 'available')
  assert.equal(getUserOperationEntry('unfreeze-funds', { status: 'active' }).handler, 'unfreeze-funds')
  assert.equal(getUserOperationEntry('deduct-funds', { status: 'active' }).handler, 'deduct-funds')
  assert.equal(getUserOperationEntry('withdraw-flow-limit', { status: 'active' }).handler, 'withdraw-flow-limit')
  assert.equal(getUserOperationEntry('deduct-funds', { status: 'active' }).risk, 'danger')
  assert.equal(getUserOperationEntry('credit-review', { status: 'active' }).status, 'available')
  assert.equal(getUserOperationEntry('credit-adjust', { status: 'active' }).handler, 'credit-adjust')
  assert.equal(getUserOperationEntry('vip-level', { status: 'active' }).handler, 'vip-level')
  assert.equal(getUserOperationEntry('vip-deposit-total', { status: 'active' }).handler, 'vip-deposit-total')
  assert.equal(getUserOperationEntry('rebate-reward', { status: 'active' }).handler, 'rebate-reward')
})

test('fund freeze entries use concise one-line summaries', () => {
  assert.equal(getUserOperationEntry('freeze-funds', {}).description, '冻结用户全部可用资金')
  assert.equal(getUserOperationEntry('unfreeze-funds', {}).description, '解冻管理员人工冻结资金')
})

test('funds controls keep the operation drawer open and use a separate MFA layer', () => {
  const source = read('../src/pages/admin/user/UserListPage.vue')

  assert.match(source, /UserFundsMutationDialog/)
  assert.match(source, /UserWithdrawFlowLimitDialog/)
  assert.match(source, /getFundsSnapshot/)
  assert.match(source, /getWithdrawFlowLimit/)
  assert.match(source, /requestFundsMfa/)
  assert.match(source, /verifyFundsMfa/)
  assert.match(source, /fundsMfaOpen/)
  assert.match(source, /\['freeze-funds', 'unfreeze-funds', 'deduct-funds'\]\.includes\(id\)/)
  assert.match(source, /if \(id === 'withdraw-flow-limit'\)/)
  assert.match(source, /operationDrawerUser\.value = \{ \.\.\.updated \}/)
  assert.doesNotMatch(source, /freeze-funds[\s\S]{0,400}closeOperationDrawer\(\)/)
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

test('funds overview opens the assets detail layer without closing the operation drawer', () => {
  const source = read('../src/pages/admin/user/UserListPage.vue')
  const assetsBranch = source.match(/if \(id === 'assets'\) \{([\s\S]*?)\n  \}/)?.[1] || ''

  assert.match(assetsBranch, /openUserDetail\(user, 'assets', trigger\)/)
  assert.doesNotMatch(assetsBranch, /closeOperationDrawer\(\)/)
  assert.doesNotMatch(assetsBranch, /deferredDrawerAction/)
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
  assert.match(source, /riskBadgeLabel/)
  assert.match(source, /高风险/)
  assert.match(source, /敏感/)
  assert.match(source, /group\.entries\.length/)
  assert.doesNotMatch(source, /quickOperationEntries|normalOperationGroups|dangerOperationEntries/)
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
  assert.match(source, /rounded-xl border border-slate-100 bg-slate-50\/50 p-2/)
  assert.match(source, /class="text-xs font-semibold/)
  assert.match(source, /ring-1 ring-slate-200/)
  assert.match(source, /grid grid-cols-1 gap-1\.5 sm:grid-cols-2/)
  assert.match(source, /min-h-16[^"\n]*p-2\.5/)
  assert.match(source, /rounded-full border px-1\.5 py-0\.5 text-\[10px\]/)
  assert.match(source, /text-sm font-medium text-slate-900/)
  assert.match(source, /mt-1 block text-xs leading-4/)
  assert.match(source, /min-h-11 min-w-11/)
})
