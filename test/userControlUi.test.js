import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  buildUserControlPayload,
  defaultControlIntensity,
  getControlMethodOptions,
  getModuleControlOptions,
  isUserControlFormComplete
} from '../src/features/user-control/userControlForm.js'
import {
  applyUnifiedControl,
  createUserControlState
} from '../src/features/user-control/userControl.js'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const openingTag = (source, testId) => source.match(new RegExp(`<[^>]+data-testid="${testId}"[^>]*>`))?.[0] || ''
const elementByTestId = (source, testId) => source.match(
  new RegExp(`<([a-z]+)[^>]*data-testid="${testId}"[^>]*>[\\s\\S]*?<\\/\\1>`)
)?.[0] || ''

test('form helper exposes only trading outcomes for trade modules', () => {
  assert.deepEqual(getModuleControlOptions('trade').map((option) => option.value), ['profit', 'loss'])
})

test('form helper exposes only yield outcomes for finance modules', () => {
  assert.deepEqual(getModuleControlOptions('finance').map((option) => option.value), ['highYield', 'lowYield'])
})

test('form helper exposes customer control methods by control type', () => {
  assert.deepEqual(getControlMethodOptions('positive').map((option) => option.label), ['默认盈利', '做高盈利', '做低盈利'])
  assert.deepEqual(getControlMethodOptions('negative').map((option) => option.label), ['默认亏损', '做高亏损', '做低亏损'])
  assert.deepEqual(getControlMethodOptions('positive', { scope: 'global' }).map((option) => option.label), ['默认盈利', '做高盈利', '做低盈利'])
  assert.deepEqual(getControlMethodOptions('negative', { scope: 'global' }).map((option) => option.label), ['默认亏损', '做高亏损', '做低亏损'])
  assert.match(getControlMethodOptions('positive', { scope: 'global' })[1].description, /仅针对交割合约生效/)
  assert.deepEqual(getControlMethodOptions('positive', { scope: 'module', moduleKey: 'delivery' }).map((option) => option.label), ['默认盈利', '做高盈利', '做低盈利'])
  assert.deepEqual(getControlMethodOptions('negative', { scope: 'module', moduleKey: 'aiQuant' }).map((option) => option.label), ['默认亏损'])
})

test('form helper rejects incomplete values used by the disabled state', () => {
  assert.equal(isUserControlFormComplete({ scope: 'module', family: 'trade', userId: '159', strategy: 'positive', method: 'profit', duration: 'once', note: '   ' }), false)
  assert.equal(isUserControlFormComplete({ scope: 'global', userId: '158', strategy: 'positive', method: 'profit', noteRequired: false, note: '   ' }), true)
  assert.equal(isUserControlFormComplete({ scope: 'global', userId: '158', strategy: 'normal', noteRequired: false, note: '   ' }), true)
  assert.equal(isUserControlFormComplete({ scope: 'module', family: 'trade', userId: '159', strategy: '', method: 'profit', duration: 'once', note: '审计备注' }), false)
  assert.equal(isUserControlFormComplete({ scope: 'module', family: 'trade', userId: '159', strategy: 'positive', method: 'highLoss', duration: 'once', note: '审计备注' }), false)
  assert.equal(isUserControlFormComplete({ scope: 'global', userId: '', strategy: 'positive', method: 'highProfit', duration: 'once', note: '审计备注' }), false)
  assert.equal(isUserControlFormComplete({ scope: 'global', userId: '158', strategy: 'positive', method: 'highProfit', note: '审计备注' }), true)
  assert.equal(isUserControlFormComplete({ scope: 'global', userId: '158', strategy: 'positive', method: 'highProfit', duration: 'once', note: '审计备注' }), true)
  assert.equal(isUserControlFormComplete({ scope: 'module', moduleKey: 'delivery', family: 'trade', userId: '159', strategy: 'positive', method: 'highProfit', intensity: { trade: { min: 8, max: 3 } }, duration: 'once', note: '审计备注' }), false)
  assert.equal(isUserControlFormComplete({ scope: 'module', moduleKey: 'delivery', family: 'trade', userId: '159', strategy: 'positive', method: 'highProfit', intensity: { trade: { min: 3, max: 8 } }, duration: 'once', note: '审计备注' }), true)
  assert.equal(isUserControlFormComplete({ scope: 'module', moduleKey: 'aiQuant', family: 'finance', userId: '159', strategy: 'negative', method: 'lowLoss', intensity: { finance: { min: 1, max: 5 } }, duration: 'once', note: '审计备注' }), false)
})

test('form helper trims notes and builds scope-specific payloads', () => {
  assert.deepEqual(buildUserControlPayload({
    scope: 'module', moduleKey: 'delivery', family: 'trade', userId: '159', strategy: 'negative', method: 'highLoss',
    intensity: { trade: { min: '3%', max: '8%' } }, duration: 'permanent', note: '  模块备注  '
  }), {
    userId: '159',
    strategy: 'negative',
    method: 'highLoss',
    value: 'loss',
    intensity: { trade: { mode: 'percentRange', min: 3, max: 8, unit: '%' } },
    duration: 'permanent',
    note: '模块备注'
  })
  assert.deepEqual(buildUserControlPayload({
    scope: 'global', userId: '158', strategy: 'positive', method: 'lowProfit',
    modules: ['delivery'], note: '  用户点控备注  '
  }), {
    userId: '158',
    strategy: 'positive',
    method: 'lowProfit',
    modules: ['delivery'],
    intensity: {},
    duration: 'permanent',
    note: '用户点控备注'
  })
  assert.deepEqual(buildUserControlPayload({
    scope: 'global', userId: '158', strategy: 'normal', method: '',
    modules: ['delivery'], noteRequired: false, note: '  '
  }), {
    userId: '158',
    strategy: 'normal',
    method: '',
    modules: ['delivery'],
    intensity: {},
    duration: 'permanent',
    note: ''
  })
})

test('global point-control payload can target only delivery without strength', () => {
  const state = createUserControlState()
  const next = applyUnifiedControl(state, {
    userId: '158',
    strategy: 'negative',
    method: 'loss',
    modules: ['delivery'],
    duration: 'permanent',
    note: '',
    batchId: 'demo-global-0001',
    now: '2026-08-29 12:00:00'
  })

  assert.deepEqual(Object.keys(next.rules['158']), ['delivery'])
  assert.equal(next.rules['158'].delivery.value, 'loss')
  assert.equal(next.rules['158'].delivery.intensity, undefined)
  assert.deepEqual(next.operationLogs[0].modules, ['delivery'])
})

test('shared modal presents user-list control as trading-only while module finance wording remains available', () => {
  const source = read('../src/admin/components/user-control/UserControlModal.vue')
  const userListSource = read('../src/pages/admin/user/UserListPage.vue')
  const helperSource = read('../src/features/user-control/userControlForm.js')
  assert.match(source, /盈利/)
  assert.match(source, /亏损/)
  assert.match(source, /永久盈利/)
  assert.match(source, /永久亏损/)
  assert.match(source, /正常/)
  assert.match(source, /控盘类型/)
  assert.match(source, /控盘方式/)
  assert.match(source, /v-if="!isSimplifiedGlobalControl"[\s\S]*label="控盘方式"/)
  assert.match(source, /v-if="intensityFields\.length"/)
  assert.match(source, /if \(isGlobalScope\.value\) \{[\s\S]*return \[\]/)
  assert.match(userListSource, /const USER_LIST_CONTROL_MODULE_KEYS = Object\.freeze\(\['delivery'\]\)/)
  assert.match(userListSource, /:unified-module-keys="USER_LIST_CONTROL_MODULE_KEYS"/)
  assert.match(userListSource, /simplified-global-control-types/)
  assert.match(userListSource, /:show-help-panel="false"/)
  assert.match(userListSource, /:note-required="false"/)
  assert.doesNotMatch(source, /理财类控盘力度范围/)
  assert.match(source, /按订单本金/)
  assert.match(source, /点控方式/)
  assert.match(helperSource, /做高盈利/)
  assert.match(helperSource, /做低盈利/)
  assert.match(helperSource, /做高亏损/)
  assert.match(helperSource, /做低亏损/)
  assert.match(helperSource, /仅针对交割合约生效/)
  assert.match(source, /结算时按方向控制结算价/)
  assert.match(source, /AI量化点控规则/)
  assert.match(source, /收益率提升数值/)
  assert.match(source, /收益率降低数值/)
  assert.doesNotMatch(source, /只生效一次/)
  assert.doesNotMatch(source, /控制周期/)
  assert.doesNotMatch(source, /id-base="user-control-duration"/)
  assert.match(source, /默认长期生效/)
  assert.doesNotMatch(source, /点控目标范围/)
  assert.doesNotMatch(source, /targetRanges/)
  assert.match(source, /globalModules = computed/)
  assert.match(source, /v-if="affectedModules\.length"[\s\S]*影响模块/)
  assert.match(source, /v-for="item in affectedModules"/)
  assert.doesNotMatch(source, /理财模块规则/)
  assert.match(source, /只对点控开始之后产生的订单生效；点控前订单和已完成历史订单不受影响。/)
  assert.match(source, /点控备注/)
})

test('shared modal exposes note validation on blur while submit stays disabled', () => {
  const source = read('../src/admin/components/user-control/UserControlModal.vue')
  assert.match(source, /@blur="noteTouched = true"/)
  assert.match(source, /noteRequired && noteTouched && !form\.note\.trim\(\)/)
  assert.match(source, /选填，最多 200 字/)
  assert.match(source, /:disabled="phase !== 'open' \|\| !isComplete"/)
})

test('shared modal defaults new point-control rules to loss without overriding existing rules', () => {
  const source = read('../src/admin/components/user-control/UserControlModal.vue')

  assert.match(source, /const DEFAULT_CONTROL_STRATEGY = 'negative'/)
  assert.match(source, /const inferredStrategy = \['loss', 'lowYield'\]\.includes\(existing\?\.value\)[\s\S]*\? 'negative'[\s\S]*: DEFAULT_CONTROL_STRATEGY/)
  assert.match(source, /form\.strategy = existing\?\.strategy \|\| inferredStrategy/)
  assert.match(source, /defaultControlMethod\(form\.strategy, methodContext\)/)
})

test('shared modal renders percent range controls for scoped point-control strength', () => {
  const source = read('../src/admin/components/user-control/UserControlModal.vue')

  assert.deepEqual(defaultControlIntensity('trade'), { mode: 'percentRange', min: 1, max: 10, unit: '%' })
  assert.deepEqual(defaultControlIntensity('finance'), { mode: 'percentRange', min: 1, max: 10, unit: '%' })
  assert.equal(isUserControlFormComplete({
    scope: 'module',
    moduleKey: 'delivery',
    family: 'trade',
    userId: '159',
    strategy: 'negative',
    method: 'loss',
    intensity: { trade: { min: 1, max: 10 } },
    duration: 'permanent',
    note: '默认控盘力度'
  }), true)
  assert.equal(isUserControlFormComplete({
    scope: 'module',
    moduleKey: 'delivery',
    family: 'trade',
    userId: '159',
    strategy: 'negative',
    method: 'loss',
    intensity: { trade: { min: 0, max: 10 } },
    duration: 'permanent',
    note: '默认控盘力度'
  }), false)
  assert.match(source, /defaultControlIntensity\('trade'\)/)
  assert.match(source, /defaultControlIntensity\('finance'\)/)
  assert.match(source, /v-for="field in intensityFields"/)
  assert.match(source, /v-model\.trim="form\[field\.minModel\]"/)
  assert.match(source, /v-model\.trim="form\[field\.maxModel\]"/)
  assert.match(source, /最小比例/)
  assert.match(source, /最大比例/)
  assert.match(source, />~<\/span>/)
  assert.match(source, /inputmode="decimal"/)
  assert.match(source, /user-control-\$\{field\.key\}-intensity-help/)
  assert.match(source, /intensity:\s*\{[\s\S]*trade:\s*\{ mode:\s*'percentRange', min:\s*form\.tradeIntensityMin, max:\s*form\.tradeIntensityMax, unit:\s*'%'/)
  assert.match(source, /finance:\s*\{ mode:\s*'percentRange', min:\s*form\.financeIntensityMin, max:\s*form\.financeIntensityMax, unit:\s*'%'/)
})

test('shared modal omits the existing-rule summary and atomic overwrite copy', () => {
  const source = read('../src/admin/components/user-control/UserControlModal.vue')
  assert.doesNotMatch(source, /现有规则/)
  assert.doesNotMatch(source, /六个模块中有.*个当前有效规则/)
  assert.doesNotMatch(source, /保存会覆盖该用户在六个模块中的现有规则/)
  assert.doesNotMatch(source, /任一模块设置失败，六个模块全部保持原状态/)
})

test('shared modal renders the target email in the read-only user identity block', () => {
  const source = read('../src/admin/components/user-control/UserControlModal.vue')
  const targetUser = elementByTestId(source, 'user-control-target-user')

  assert.notEqual(targetUser, '')
  assert.match(targetUser, /selectedUserId/)
  assert.match(targetUser, /selectedUserEmail/)
})

test('shared modal shows the selected user current point-control status', () => {
  const source = read('../src/admin/components/user-control/UserControlModal.vue')
  const currentStatus = elementByTestId(source, 'user-control-current-status')

  assert.notEqual(currentStatus, '')
  assert.match(source, /activeExistingRules/)
  assert.match(source, /\['active', 'processing'\]\.includes\(rule\?\.status\)/)
  assert.match(currentStatus, /当前点控状态/)
  assert.match(currentStatus, /已开启点控/)
  assert.match(currentStatus, /未开启点控/)
  assert.match(currentStatus, /v-if="!isSimplifiedGlobalControl"/)
  assert.match(currentStatus, /border-amber-300 bg-amber-50 ring-1 ring-amber-100/)
  assert.match(currentStatus, /border-sky-200 bg-sky-50 ring-1 ring-sky-100/)
  assert.match(currentStatus, /bg-amber-200 text-amber-900/)
  assert.match(currentStatus, /bg-sky-200 text-sky-900/)
  assert.match(currentStatus, /已开启点控模块/)
  assert.match(currentStatus, /再次确认会覆盖对应点控设置/)
  assert.match(currentStatus, /取消点控/)
  assert.match(currentStatus, /@click="emit\('request-cancel'\)"/)
  assert.match(source, /const emit = defineEmits\(\['close', 'submit', 'request-cancel'\]\)/)
  const userSource = read('../src/pages/admin/user/UserListPage.vue')
  assert.match(userSource, /simplified-global-control-types/)
  assert.match(userSource, /@request-cancel="requestControlCancelFromSetting"/)
  assert.match(userSource, /const requestControlCancelFromSetting = async \(\) =>/)
  assert.match(userSource, /controlModalOpen\.value = false[\s\S]*await nextTick\(\)[\s\S]*openControlCancel\(user\)/)
})

test('module page explains settlement-only delivery control and module-only scope', () => {
  const source = read('../src/pages/admin/user-control/ModuleUserControlPage.vue')
  assert.match(source, /不改变K线/)
  assert.match(source, /实时浮盈亏/)
  assert.match(source, /本次操作只影响当前模块/)
  assert.match(source, /规则来源/)
})

test('module page can add a user by UID email or phone search', () => {
  const source = read('../src/pages/admin/user-control/ModuleUserControlPage.vue')
  const addDialog = elementByTestId(source, 'module-user-control-add-dialog')

  assert.match(source, />添加用户<\/button>/)
  assert.notEqual(addDialog, '')
  assert.match(source, /点控记录和手动添加/)
  assert.match(source, /搜索 UID、用户名、邮箱或手机号/)
  assert.match(addDialog, /UID、邮箱或手机号/)
  assert.match(addDialog, /placeholder="输入 UID、邮箱或手机号"/)
  assert.match(source, /userMatchesAddQuery/)
  assert.match(source, /email === keyword/)
  assert.match(source, /phone === keyword/)
  assert.match(source, /没有搜索到匹配用户/)
  assert.doesNotMatch(addDialog, /请先输入 UID、邮箱或手机号/)
  assert.doesNotMatch(addDialog, /@blur=/)
  assert.doesNotMatch(source, /matchedAddUser/)
  assert.match(source, /const canConfirmAddUser = computed\(\(\) => addDialogPhase\.value === 'open' && Boolean\(normalizedAddUserKeyword\.value\)\)/)
  assert.match(source, /const matchedUser = usersList\.find\(\(user\) => userMatchesAddQuery\(user, normalizedAddUserKeyword\.value\)\) \|\| null/)
  assert.match(addDialog, /@input="clearAddSearchResult"/)
  assert.match(source, /addSearchAttempted && normalizedAddUserKeyword && !addSearchResult/)
  assert.match(source, /addedUserIds\.value = \[userId, \.\.\.addedUserIds\.value\]/)
  assert.match(source, /query\.value = userId/)
  assert.doesNotMatch(source, /demo_user_\$\{addUserEffectiveId\}/)
})

test('module metadata and fallback use the unified point-control label', () => {
  const moduleSource = read('../src/features/user-control/userControl.js')
  const pageSource = read('../src/pages/admin/user-control/ModuleUserControlPage.vue')

  assert.match(moduleSource, /actionLabel:\s*'用户点控'/)
  assert.doesNotMatch(moduleSource, /用户控盘/)
  assert.doesNotMatch(moduleSource, /用户收益调节/)
  assert.doesNotMatch(pageSource, /用户控盘/)
  assert.doesNotMatch(pageSource, /用户级控盘/)
})

test('module page omits rejected demo and finance helper copy', () => {
  const source = read('../src/pages/admin/user-control/ModuleUserControlPage.vue')
  assert.doesNotMatch(source, /Demo 模式/)
  assert.doesNotMatch(source, /仅更新前端 Mock，不接入真实结算/)
  assert.doesNotMatch(source, /用户收益调节只在目标用户实际收益入账或最终结算时生效；预估收益变化不会消费一次性规则。/)
})

test('module page uses the simplified current-state vocabulary', () => {
  const source = read('../src/pages/admin/user-control/ModuleUserControlPage.vue')
  const detailSource = read('../src/admin/components/user-control/UserControlDetailDrawer.vue')
  assert.match(source, /rule\.status === 'active' && rule\.duration === 'once'[\s\S]*待执行/)
  assert.match(source, /rule\.status === 'active'[\s\S]*生效中/)
  assert.doesNotMatch(source, /<option value="processing">/)
  assert.doesNotMatch(source, /processing:\s*\{\s*label:\s*'处理中'/)
  assert.doesNotMatch(detailSource, /processing:\s*\{\s*label:\s*'处理中'/)
  assert.doesNotMatch(detailSource, /@mousedown\.self="emit\('close'\)"/)
  assert.match(detailSource, /max-w-5xl[^"\n]*overflow-hidden/)
})

test('user list moves point-control actions into the complete operation drawer and safeguards empty cancellation', () => {
  const source = read('../src/pages/admin/user/UserListPage.vue')
  const actionBar = elementByTestId(source, 'user-row-action-bar')
  const operationCatalog = read('../src/admin/config/userOperations.js')
  const productDocument = read('../docs/user-point-control-product-requirements.md')

  assert.match(source, />点控<\/th>/)
  assert.match(source, /getUserControlListMeta/)
  assert.match(source, /controlMetaOf\(user\)\.controlLabel/)
  assert.doesNotMatch(source, /controlTypeBadgeClass/)
  assert.doesNotMatch(source, /bg-orange-100 text-orange-700 ring-orange-200/)
  assert.doesNotMatch(source, /bg-emerald-100 text-emerald-700 ring-emerald-200/)
  assert.match(source, /text-sm font-medium text-slate-700/)
  assert.doesNotMatch(source, /是否点控中/)
  assert.doesNotMatch(source, /hasRules\(user\) \? '是' : '否'/)
  assert.doesNotMatch(source, /<th[^>]*>\s*状态\s*<\/th>/)
  assert.doesNotMatch(source, /statusConfig\[user\.status\]/)
  assert.doesNotMatch(source, />用户点控</)
  assert.doesNotMatch(source, />生效方式</)
  assert.doesNotMatch(source, />模块状态</)
  assert.doesNotMatch(source, />更新时间</)
  assert.match(actionBar, />\s*详情<\/button>/)
  assert.match(actionBar, />\s*编辑资料<\/button>/)
  assert.match(actionBar, />\s*入金<\/button>/)
  assert.match(actionBar, /isLocked\(user\) \? '解封' : '封户'/)
  assert.match(actionBar, />\s*点控<\/button>/)
  assert.doesNotMatch(actionBar, />\s*取消点控<\/button>/)
  assert.match(actionBar, />\s*修改信用分<\/button>/)
  assert.match(actionBar, />\s*信用分审核<\/button>/)
  assert.match(actionBar, />\s*更多\s*<\/button>/)
  assert.match(actionBar, /flex-wrap/)
  assert.doesNotMatch(actionBar, /whitespace-nowrap/)
  assert.match(actionBar, /h-8 min-w-10/)
  assert.match(actionBar, /id: 'edit-profile'/)
  assert.match(actionBar, /id: 'freeze-account'/)
  assert.match(actionBar, /id: 'credit-review'/)
  assert.match(actionBar, /id: 'point-control'/)
  assert.doesNotMatch(actionBar, /id: 'cancel-point-control'/)
  assert.match(actionBar, /bg-rose-50\/80 text-rose-700/)
  assert.match(actionBar, /bg-amber-50\/80[\s\S]*text-amber-700/)
  assert.match(actionBar, /bg-emerald-50\/80 text-emerald-700/)
  assert.match(actionBar, /bg-violet-50\/80 font-medium text-violet-700/)
  assert.match(operationCatalog, /title: '用户点控'/)
  assert.doesNotMatch(operationCatalog, /title: '取消点控'/)
  assert.match(operationCatalog, /title: '点控日志'/)
  assert.doesNotMatch(actionBar, /控制详情|设置控制|修改控制|取消控制|控制日志/)
  assert.match(source, /getUnifiedControlCancelItems/)
  assert.match(source, /v-for="item in cancelControlItems"/)
  assert.match(source, /当前没有可取消的模块/)
  assert.match(source, /:disabled="!cancelControlItems\.length"/)
  assert.match(source, /确认后将直接取消点控/)
  assert.match(source, /确认取消点控/)
  assert.doesNotMatch(source, /继续 MFA 验证/)
  assert.doesNotMatch(source, /@mousedown\.self="closeControlCancel"/)
  assert.match(source, /data-testid="unified-user-control-cancel-dialog"[^>]*overflow-hidden/)
  assert.match(source, /data-testid="unified-user-control-cancel-body"[^>]*overflow-y-auto/)
  assert.match(productDocument, /用户列表只展示“点控”入口/)
  assert.doesNotMatch(productDocument, /互斥展示/)
})

test('user point-control setting and cancellation no longer require MFA', () => {
  const source = read('../src/pages/admin/user/UserListPage.vue')

  assert.match(source, /if \(payload\.strategy === 'normal'\) \{[\s\S]*?cancelUnifiedUserControl\(\{[\s\S]*?note: payload\.note \|\| '恢复正常'/)
  assert.match(source, /const submitControlSetting = \(payload\) => \{[\s\S]*?applyControl\(payload\)[\s\S]*?\}/)
  assert.match(source, /const confirmControlCancel = \(\) => \{[\s\S]*?cancelUnifiedUserControl\(payload\)[\s\S]*?closeControlCancel\(\)[\s\S]*?\}/)
  assert.doesNotMatch(source, /requestMfa\(\{ type: 'apply'/)
  assert.doesNotMatch(source, /requestMfa\(\{ type: 'cancel'/)
  assert.doesNotMatch(source, /pendingMfaAction\.value = \{ type: 'cancel'/)
  assert.doesNotMatch(source, /const handleMfaVerify = \(code\) => verifyMfa\(code\)/)
})

test('user operation components expose their existing dialogs to an external unified menu', () => {
  const actionFiles = ['UserFreezeAction', 'UserAdjustAction', 'UserDepositAction', 'UserTransferAction']
  actionFiles.forEach((name) => {
    const source = read(`../src/admin/components/user/${name}.vue`)
    assert.match(source, /showTrigger/)
    assert.match(source, /defineExpose\(\{ open \}\)/)
    assert.match(source, /v-if="showTrigger"/)
  })

  const operations = read('../src/admin/components/user/UserOperations.vue')
  assert.match(operations, /defineExpose\(\{ open \}\)/)
  assert.match(operations, /showTriggers/)
})

test('detail drawer distinguishes progress from configuration divergence', () => {
  const source = read('../src/admin/components/user-control/UserControlDetailDrawer.vue')
  assert.match(source, /已执行/)
  assert.match(source, /存在差异/)
  assert.match(source, /规则来源/)
  assert.match(source, /最近执行/)
  assert.match(source, /businessId/)
  assert.match(source, /getUserControlDivergenceKeys/)
  assert.match(source, /配置差异/)
})

test('detail drawer receives and renders superseded rule history with its timestamp', () => {
  const drawerSource = read('../src/admin/components/user-control/UserControlDetailDrawer.vue')
  const history = elementByTestId(drawerSource, 'user-control-superseded-history')

  assert.notEqual(history, '')
  assert.match(history, /supersededRules/)
  assert.match(history, /supersededAt/)
  assert.match(history, /已覆盖/)
})

test('log content presents operation and execution records in one point-control list', () => {
  const source = read('../src/admin/components/user-control/UserControlLogContent.vue')
  assert.match(source, /用户点控日志/)
  assert.match(source, /unifiedLogs/)
  assert.equal(source.match(/<table/g)?.length, 1)
  assert.doesNotMatch(source, /Demo 演示页/)
  assert.doesNotMatch(source, /所有模拟只在当前浏览器内存中生效/)
  assert.doesNotMatch(source, /role="tablist"/)
  assert.doesNotMatch(source, /activeTab/)
  assert.doesNotMatch(source, /Demo 模拟工具/)
  assert.doesNotMatch(source, /模拟一次性执行/)
  assert.doesNotMatch(source, /模拟写入失败/)
  assert.doesNotMatch(source, /清除失败开关/)
  assert.doesNotMatch(source, /恢复演示数据/)
})

test('user management menu names the unified log as user point-control log', () => {
  const source = read('../src/admin/config/nav.js')
  assert.match(source, /title:\s*'用户点控日志',\s*path:\s*'\/admin\/users\/control-log'/)
  assert.doesNotMatch(source, /title:\s*'用户控制日志',\s*path:\s*'\/admin\/users\/control-log'/)
})

test('log content paginates filtered rows and resets from every filter', () => {
  const source = read('../src/admin/components/user-control/UserControlLogContent.vue')
  assert.match(source, /useAdminListPagination\(unifiedLogs,\s*\{[\s\S]*pageSize:\s*10/)
  assert.match(source, /resetSources:\s*\[[\s\S]*filters\.userId[\s\S]*filters\.module[\s\S]*filters\.source[\s\S]*filters\.action[\s\S]*filters\.dateFrom[\s\S]*filters\.dateTo/)
  assert.match(source, /v-for="log in pagedLogs"/)
  assert.match(source, /<AdminListPaginationBar[\s\S]*:total-count="unifiedLogs\.length"[\s\S]*@update:page-size="onPageSizeChange"/)
})

test('log content displays success and failure status for operation records', () => {
  const source = read('../src/admin/components/user-control/UserControlLogContent.vue')
  assert.match(source, /status:\s*log\.status \|\| ''/)
  assert.match(source, /statusLabel\(log\.status\)/)
})

test('log content exposes audit fields without demo state actions', () => {
  const source = read('../src/admin/components/user-control/UserControlLogContent.vue')
  assert.match(source, /UID/)
  assert.match(source, /模块/)
  assert.match(source, /规则来源/)
  assert.match(source, /操作类型/)
  assert.match(source, /操作时间/)
  assert.match(source, /备注/)
  assert.match(source, /变更前/)
  assert.match(source, /变更后/)
  assert.match(source, /业务\/批次号/)
  assert.match(source, /状态/)
  assert.doesNotMatch(source, /simulateUserControlExecution/)
  assert.doesNotMatch(source, /setUserControlFailureModule/)
  assert.doesNotMatch(source, /resetUserControlDemo/)
  assert.match(source, /executionStatusClasses/)
})

test('log content binds date filters and audit columns to their actual values', () => {
  const source = read('../src/admin/components/user-control/UserControlLogContent.vue')
  const dateFrom = openingTag(source, 'user-control-log-date-from')
  const dateTo = openingTag(source, 'user-control-log-date-to')

  assert.match(dateFrom, /type="date"/)
  assert.match(dateFrom, /v-model="filters\.dateFrom"/)
  assert.match(dateTo, /type="date"/)
  assert.match(dateTo, /v-model="filters\.dateTo"/)
  assert.match(elementByTestId(source, 'user-control-unified-operator-value'), /log\.operator/)
  assert.match(elementByTestId(source, 'user-control-unified-reference-value'), /log\.referenceId/)
  assert.match(elementByTestId(source, 'user-control-unified-duration-value'), /log\.duration/)
})

test('log page wrapper normalizes and forwards route query values to shared content', () => {
  const source = read('../src/pages/admin/user-control/UserControlLogPage.vue')
  assert.match(source, /normalizeUserControlLogQuery/)
  assert.match(source, /route\.query\.userId/)
  assert.match(source, /route\.query\.module/)
  assert.match(source, /UserControlLogContent/)
  assert.match(source, /:initial-user-id="normalizedQuery\.userId"/)
  assert.match(source, /:initial-module="normalizedQuery\.module"/)
  assert.match(source, /@clear-route-filters="router\.replace\(\{ name: route\.name, query: \{\} \}\)"/)
})

test('log page omits the former tab interface', () => {
  const source = read('../src/pages/admin/user-control/UserControlLogPage.vue')
  assert.doesNotMatch(source, /role="tablist"/)
  assert.doesNotMatch(source, /role="tab"/)
  assert.doesNotMatch(source, /role="tabpanel"/)
})

test('user operations open point-control logs in a child Drawer while module rows retain route filters', () => {
  const userSource = read('../src/pages/admin/user/UserListPage.vue')
  const moduleSource = read('../src/pages/admin/user-control/ModuleUserControlPage.vue')

  assert.match(userSource, /import UserControlLogDrawer/)
  assert.match(userSource, /const controlLogOpen = ref\(false\)/)
  assert.match(userSource, /if \(id === 'point-control-log'\) \{[\s\S]*?controlLogUser\.value = user[\s\S]*?controlLogReturnFocus\.value = trigger[\s\S]*?controlLogOpen\.value = true[\s\S]*?return/)
  assert.match(userSource, /<UserControlLogDrawer[\s\S]*?:visible="controlLogOpen"[\s\S]*?:return-focus="controlLogReturnFocus"[\s\S]*?@closed="clearControlLog"/)
  assert.doesNotMatch(userSource, /appRouter|users-control-log/)
  assert.match(moduleSource, /name:\s*'users-control-log'[\s\S]*query:\s*\{\s*userId:[\s\S]*module:/)
})

test('shared setting modal keeps only its body scrollable and keeps result copy compact', () => {
  const source = read('../src/admin/components/user-control/UserControlModal.vue')
  const helperSource = read('../src/features/user-control/userControlForm.js')
  const frame = openingTag(source, 'user-control-dialog-frame')
  assert.match(source, /:class="shouldShowHelpPanel \? 'max-w-\[1080px\]' : 'max-w-\[720px\]'"/)
  assert.doesNotMatch(frame.match(/class="([^"]*)"/)?.[1] || '', /max-w-\[1080px\]/)
  assert.match(source, /<Teleport to="body">/)
  assert.match(source, /fixed inset-0/)
  assert.doesNotMatch(source, /@mousedown\.self|@click\.self/)
  assert.doesNotMatch(source, /fixed inset-0[^"\n]*overflow-auto/)
  assert.match(frame, /max-h-\[calc\(100vh-1\.5rem\)\]/)
  assert.match(frame, /supports-\[height:100dvh\]:max-h-\[calc\(100dvh-1\.5rem\)\]/)
  assert.match(frame, /overflow-hidden/)
  assert.match(source, /data-testid="user-control-dialog-body"[^>]*min-h-0[^>]*flex-1[^>]*overflow-y-auto[^>]*lg:flex-none[^>]*lg:overflow-hidden/)
  assert.match(source, /px-5 py-3/)
  assert.match(source, /rows="2"/)
  assert.match(source, /class="grid items-start gap-4"[\s\S]*:class="shouldShowHelpPanel \? 'lg:grid-cols-\[minmax\(0,1fr\)_400px\]' : ''"/)
  assert.match(source, /<div ref="leftPanelRef" class="min-w-0 space-y-2\.5">[\s\S]*id-base="user-control-strategy"/)
  assert.match(source, /v-if="shouldShowHelpPanel"[\s\S]*data-testid="user-control-help-panel"/)
  assert.match(source, /data-testid="user-control-help-panel"[^>]*overflow-y-auto/)
  assert.match(source, /:style="\{ maxHeight: helpPanelMaxHeight \|\| undefined \}"/)
  assert.match(source, /getBoundingClientRect\?\.\(\)\.height/)
  assert.match(source, /matchMedia\('\(min-width: 1024px\)'\)/)
  assert.match(source, /displayedModuleRules = computed/)
  assert.match(source, /isGlobalScope\.value[\s\S]*\? globalModules\.value[\s\S]*: moduleMeta\.value \? \[moduleMeta\.value\]/)
  assert.match(source, /:hint="selectedControlType\?\.description \|\| '请选择点控类型'"[\s\S]*id-base="user-control-strategy"/)
  assert.match(source, /controlMethodContext = computed/)
  assert.match(source, /controlMethodOptions = computed\(\(\) => form\.strategy === 'normal' \? \[\] : getControlMethodOptions\(form\.strategy, controlMethodContext\.value\)\)/)
  assert.doesNotMatch(source, /v-if="showControlMethodSelect"/)
  assert.match(source, /label="控盘方式"/)
  assert.match(source, /id-base="user-control-method"/)
  assert.doesNotMatch(source, /selectedDuration/)
  assert.doesNotMatch(source, /durationOptions/)
  assert.match(source, /v-for="rule in displayedModuleRules"/)
  assert.match(source, /rule\.title/)
  assert.match(source, /影响范围[\s\S]*rule\.scope/)
  assert.match(source, /点控方式[\s\S]*rule\.pointMethod/)
  assert.match(source, /生效方式[\s\S]*rule\.effect/)
  assert.match(source, /示例[\s\S]*rule\.example/)
  assert.doesNotMatch(source, /class="sr-only"[\s\S]*id="user-control-strategy-help"[\s\S]*id="user-control-method-help"[\s\S]*id="user-control-duration-help"/)
  assert.doesNotMatch(source, />当前选择说明</)
  assert.doesNotMatch(source, />通用结算说明</)
  assert.doesNotMatch(source, /状态规则：/)
  assert.doesNotMatch(source, /六模块用户点控批次说明/)
  assert.match(source, /交割点控规则/)
  assert.doesNotMatch(source, /永续点控规则/)
  assert.doesNotMatch(source, /现货点控规则/)
  assert.match(source, /AI量化点控规则/)
  assert.match(source, /流动性挖矿点控规则/)
  assert.match(source, /投资组合点控规则/)
  assert.doesNotMatch(source, /不单独修改K线、盘口行情和实时浮盈亏/)
  assert.match(source, /只影响目标用户交割合约订单，不改变公共行情、K线、盘口和其他用户订单/)
  assert.match(source, /交割通过结算价偏移处理/)
  assert.match(source, /做高\/做低仅针对交割合约生效/)
  assert.doesNotMatch(source, /通过成交价偏移处理/)
  assert.match(source, /通过收益率调整处理/)
  assert.match(source, /影响当前用户交割合约订单的最终结算价格/)
  assert.doesNotMatch(source, /现货订单成交即结束/)
  assert.match(source, /盈利时替换为点控收益率提升数值/)
  assert.doesNotMatch(source, /grid gap-3 sm:grid-cols-3/)
  assert.match(helperSource, /交割模块按有利价格偏移处理/)
  assert.match(helperSource, /交割模块按不利价格偏移处理/)
  assert.doesNotMatch(source, />交易类效果</)
  assert.doesNotMatch(source, />理财类效果</)
  assert.doesNotMatch(source, /本次操作只影响当前模块，其他五个模块的用户规则保持不变。/)
})

test('MFA modal keeps only its body scrollable', () => {
  const mfaSource = read('../src/admin/components/MfaVerificationModal.vue')
  const frame = openingTag(mfaSource, 'mfa-dialog-frame')

  assert.doesNotMatch(mfaSource, /fixed inset-0[^"\n]*overflow-y-auto/)
  assert.match(frame, /max-h-\[calc\(100vh-2rem\)\]/)
  assert.match(frame, /supports-\[height:100dvh\]:max-h-\[calc\(100dvh-2rem\)\]/)
  assert.match(frame, /overflow-hidden/)
  assert.match(mfaSource, /data-testid="mfa-dialog-body"[^>]*min-h-0[^>]*flex-1[^>]*overflow-y-auto/)
})

test('MFA modal prevents duplicate verification and exposes loading and errors accessibly', () => {
  const mfaSource = read('../src/admin/components/MfaVerificationModal.vue')
  const mfaController = read('../src/admin/composables/useMfaVerification.js')

  assert.match(mfaSource, /useMfaVerification/)
  assert.match(mfaController, /useDialogLifecycle/)
  assert.match(mfaSource, /aria-labelledby="mfa-dialog-title"/)
  assert.match(mfaSource, /:aria-busy="displayedDialog\.loading"/)
  assert.match(mfaSource, /ref="verificationInput"/)
  assert.match(mfaSource, /ref="errorSummary"/)
  assert.match(mfaSource, /role="alert"/)
  assert.match(mfaSource, /aria-live="assertive"/)
  assert.match(mfaController, /if \(props\.loading \|\| verifyRequested\.value\) return false/)
  assert.match(mfaController, /if \(!props\.loading\) verifyRequested\.value = false/)
  assert.match(mfaController, /props\.errorAttempt/)
  assert.match(mfaSource, /:aria-label="displayedDialog\.loading \? '验证并继续，验证中' : '验证并继续'"/)
  assert.match(mfaSource, /name="dialog-overlay"/)
  assert.match(mfaSource, /name="dialog-panel"/)
  assert.match(mfaSource, /v-if="rendered"/)
  assert.doesNotMatch(mfaSource, /v-show="open"/)
  assert.doesNotMatch(mfaSource, /@click\.self|@mousedown\.self|backdrop-click/)
})

test('user management preserves an MFA failure for the open modal to announce', () => {
  const source = read('../src/pages/admin/user/UserListPage.vue')
  const flow = read('../src/admin/composables/useMfaActionFlow.js')

  assert.match(source, /useMfaActionFlow/)
  assert.match(source, /:error="fundsMfaError"/)
  assert.match(source, /:error-attempt="fundsMfaErrorAttempt"/)
  assert.match(flow, /catch \(failure\) \{[\s\S]*?error\.value =/)
  assert.match(flow, /errorAttempt\.value \+= 1/)
})

test('point-control cancellation dialogs and detail drawer keep overlays open and only bodies scrollable', () => {
  const moduleSource = read('../src/pages/admin/user-control/ModuleUserControlPage.vue')
  const userListSource = read('../src/pages/admin/user/UserListPage.vue')
  const detailSource = read('../src/admin/components/user-control/UserControlDetailDrawer.vue')
  const moduleFrame = openingTag(moduleSource, 'module-user-control-cancel-dialog')

  assert.doesNotMatch(moduleSource, /@mousedown\.self="closeCancel"|@click\.self="closeCancel"/)
  assert.match(moduleFrame, /max-h-\[calc\(100vh-2rem\)\]/)
  assert.match(moduleFrame, /supports-\[height:100dvh\]:max-h-\[calc\(100dvh-2rem\)\]/)
  assert.match(moduleFrame, /overflow-hidden/)
  assert.match(moduleSource, /data-testid="module-user-control-cancel-body"[^>]*min-h-0[^>]*flex-1[^>]*overflow-y-auto/)
  assert.doesNotMatch(userListSource, /@mousedown\.self="closeControlCancel"|@click\.self="closeControlCancel"/)
  assert.match(userListSource, /data-testid="unified-user-control-cancel-dialog"[^>]*overflow-hidden/)
  assert.match(userListSource, /data-testid="unified-user-control-cancel-body"[^>]*min-h-0[^>]*flex-1[^>]*overflow-y-auto/)
  assert.doesNotMatch(detailSource, /@mousedown\.self|@click\.self/)
  assert.match(detailSource, /fixed inset-0/)
  assert.match(detailSource, /<aside[^>]*h-full[^>]*overflow-hidden/)
  assert.match(detailSource, /max-w-5xl[^>]*overflow-hidden/)
  assert.match(detailSource, /flex-1[^>]*overflow-y-auto/)
})

test('module and unified cancel dialogs use compact spacing', () => {
  const moduleSource = read('../src/pages/admin/user-control/ModuleUserControlPage.vue')
  const userSource = read('../src/pages/admin/user/UserListPage.vue')
  assert.match(moduleSource, /data-testid="module-user-control-cancel-dialog"[\s\S]*?px-5 py-4/)
  assert.match(userSource, /data-testid="unified-user-control-cancel-dialog"[\s\S]*?px-5 py-4/)
})

test('point-control setting and detail surfaces use the shared dialog lifecycle contracts', () => {
  const settingSource = read('../src/admin/components/user-control/UserControlModal.vue')
  const detailSource = read('../src/admin/components/user-control/UserControlDetailDrawer.vue')

  assert.match(settingSource, /useDialogLifecycle/)
  assert.match(settingSource, /useDialogContentSnapshot/)
  assert.match(settingSource, /handleAfterLeave/)
  assert.match(settingSource, /aria-labelledby="user-control-dialog-title"/)
  assert.match(settingSource, /id="user-control-dialog-title"/)
  assert.match(settingSource, /SelectOnlyCombobox/)
  assert.match(settingSource, /ref="firstControlSelect"/)
  assert.match(settingSource, /id-base="user-control-strategy"/)
  assert.match(settingSource, /id-base="user-control-method"/)
  assert.doesNotMatch(settingSource, /id-base="user-control-duration"/)
  assert.match(settingSource, /duration: 'permanent'/)
  assert.doesNotMatch(settingSource, /type="radio" name="strategy"|type="radio" name="method"|type="radio" name="duration"/)
  assert.match(settingSource, /v-if="rendered"/)
  assert.match(settingSource, /name="dialog-overlay"/)
  assert.match(settingSource, /name="dialog-panel"/)
  assert.doesNotMatch(settingSource, /@click\.self|@mousedown\.self|backdrop-click/)

  assert.match(detailSource, /useDialogLifecycle/)
  assert.match(detailSource, /aria-labelledby="user-control-detail-title"/)
  assert.match(detailSource, /id="user-control-detail-title"[^>]*tabindex="-1"/)
  assert.match(detailSource, /name="dialog-drawer"/)
  assert.doesNotMatch(detailSource, /@click\.self|@mousedown\.self|backdrop-click/)
})

test('point-control cancellation dialogs retain their layer, focus target, and closing content', () => {
  const moduleSource = read('../src/pages/admin/user-control/ModuleUserControlPage.vue')
  const unifiedSource = read('../src/pages/admin/user/UserListPage.vue')

  for (const [source, rendered, dialogRef, returnRef, title] of [
    [moduleSource, 'moduleCancelRendered', 'moduleCancelDialogRef', 'moduleCancelReturnRef', 'module-user-control-cancel-title'],
    [unifiedSource, 'unifiedCancelRendered', 'unifiedCancelDialogRef', 'unifiedCancelReturnRef', 'unified-user-control-cancel-title']
  ]) {
    assert.match(source, /useDialogLifecycle/)
    assert.match(source, /useDialogContentSnapshot/)
    assert.match(source, new RegExp(`v-if="${rendered}"`))
    assert.match(source, /name="dialog-overlay"/)
    assert.match(source, /name="dialog-panel"/)
    assert.match(source, new RegExp(`ref="${dialogRef}"`))
    assert.match(source, new RegExp(`aria-labelledby="${title}"`))
    assert.match(source, new RegExp(`id="${title}"`))
    assert.match(source, new RegExp(`ref="${returnRef}"`))
    assert.doesNotMatch(source, /@mousedown\.self="(?:closeCancel|closeControlCancel)"|@click\.self="(?:closeCancel|closeControlCancel)"/)
  }

  const moduleFrame = openingTag(moduleSource, 'module-user-control-cancel-dialog')
  const unifiedFrame = openingTag(unifiedSource, 'unified-user-control-cancel-dialog')
  assert.match(moduleFrame, /max-h-\[calc\(100vh-2rem\)\]/)
  assert.match(moduleFrame, /supports-\[height:100dvh\]:max-h-\[calc\(100dvh-2rem\)\]/)
  assert.match(moduleFrame, /overflow-hidden/)
  assert.match(moduleSource, /data-testid="module-user-control-cancel-body"[^>]*min-h-0[^>]*flex-1[^>]*overflow-y-auto/)
  assert.match(unifiedFrame, /max-h-\[calc\(100vh-2rem\)\]/)
  assert.match(unifiedFrame, /supports-\[height:100dvh\]:max-h-\[calc\(100dvh-2rem\)\]/)
  assert.match(unifiedFrame, /overflow-hidden/)
  assert.match(unifiedSource, /data-testid="unified-user-control-cancel-body"[^>]*min-h-0[^>]*flex-1[^>]*overflow-y-auto/)
})

test('ordinary point-control dialogs keep a safe close button in the fixed header', () => {
  const moduleSource = read('../src/pages/admin/user-control/ModuleUserControlPage.vue')
  const unifiedSource = read('../src/pages/admin/user/UserListPage.vue')
  const mfaSource = read('../src/admin/components/MfaVerificationModal.vue')

  assert.match(moduleSource, /<header[^>]*>[\s\S]*?<button[^>]*min-h-11[^>]*min-w-11[^>]*aria-label="关闭"[^>]*@click="closeCancel"/)
  assert.match(unifiedSource, /<header[^>]*>[\s\S]*?<button[^>]*min-h-11[^>]*min-w-11[^>]*aria-label="关闭"[^>]*@click="closeControlCancel"/)
  assert.match(mfaSource, /<header[^>]*>[\s\S]*?<button[^>]*min-h-11[^>]*min-w-11[^>]*aria-label="关闭"[^>]*:disabled="displayedDialog\.loading \|\| displayedDialog\.verifyRequested"[^>]*@click="close"/)
})

test('unified cancellation keeps the leaving dialog mounted before clearing user state', () => {
  const source = read('../src/pages/admin/user/UserListPage.vue')
  const confirm = source.slice(
    source.indexOf('const confirmControlCancel = () => {'),
    source.indexOf('const roleConfig =')
  )

  assert.match(confirm, /cancelUnifiedUserControl\(payload\)[\s\S]*?closeControlCancel\(\)/)
  assert.match(confirm, /const handleUnifiedCancelAfterLeave = async \(\) => \{[\s\S]*?await onUnifiedCancelAfterLeave\(\)[\s\S]*?controlUser\.value = null/)
  assert.doesNotMatch(confirm, /openPendingMfa\(\)/)
})

test('user list exposes wallet address search as a distinct applied query field', () => {
  const source = read('../src/pages/admin/user/UserListPage.vue')

  assert.match(source, /const walletAddressKeyword = ref\(''\)/)
  assert.match(source, /walletAddressKeyword:\s*walletAddressKeyword\.value/)
  assert.match(source, /placeholder="搜索钱包地址"/)
  assert.match(source, /watch\(\[userIdKeyword,\s*phoneKeyword,\s*emailKeyword,\s*walletAddressKeyword,\s*\(\) => pagination\.currentPage\]/)
})

test('user list splits id, phone, email, and wallet filters into standalone field components', () => {
  const source = read('../src/pages/admin/user/UserListPage.vue')

  assert.match(source, /import UserListSearchField from/)
  assert.match(source, /const userIdKeyword = ref\(''\)/)
  assert.match(source, /const phoneKeyword = ref\(''\)/)
  assert.match(source, /const emailKeyword = ref\(''\)/)
  assert.match(source, /userIdKeyword:\s*userIdKeyword\.value/)
  assert.match(source, /phoneKeyword:\s*phoneKeyword\.value/)
  assert.match(source, /emailKeyword:\s*emailKeyword\.value/)
  assert.equal((source.match(/<UserListSearchField/g) || []).length, 4)
  assert.match(source, /label="用户 ID"/)
  assert.match(source, /label="手机号"/)
  assert.match(source, /label="邮箱"/)
  assert.match(source, /label="钱包地址"/)
})

test('user list omits the top statistics cards', () => {
  const source = read('../src/pages/admin/user/UserListPage.vue')

  assert.doesNotMatch(source, /const statistics = computed/)
  assert.doesNotMatch(source, /v-for="stat in statistics"/)
  assert.doesNotMatch(source, /总用户数/)
  assert.doesNotMatch(source, /VIP用户/)
  assert.doesNotMatch(source, /代理用户/)
})
