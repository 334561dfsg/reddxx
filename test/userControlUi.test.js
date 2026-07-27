import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  buildUserControlPayload,
  getControlMethodOptions,
  getModuleControlOptions,
  isUserControlFormComplete
} from '../src/features/user-control/userControlForm.js'

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
  assert.deepEqual(getControlMethodOptions('positive').map((option) => option.label), ['盈利', '做高盈利', '做低盈利'])
  assert.deepEqual(getControlMethodOptions('negative').map((option) => option.label), ['亏损', '做高亏损', '做低亏损'])
})

test('form helper rejects incomplete values used by the disabled state', () => {
  assert.equal(isUserControlFormComplete({ scope: 'module', family: 'trade', userId: '159', strategy: 'positive', method: 'profit', duration: 'once', note: '   ' }), false)
  assert.equal(isUserControlFormComplete({ scope: 'module', family: 'trade', userId: '159', strategy: '', method: 'profit', duration: 'once', note: '审计备注' }), false)
  assert.equal(isUserControlFormComplete({ scope: 'module', family: 'trade', userId: '159', strategy: 'positive', method: 'highLoss', duration: 'once', note: '审计备注' }), false)
  assert.equal(isUserControlFormComplete({ scope: 'global', userId: '', strategy: 'positive', method: 'highProfit', duration: 'once', note: '审计备注' }), false)
  assert.equal(isUserControlFormComplete({ scope: 'module', family: 'trade', userId: '159', strategy: 'positive', method: 'highProfit', duration: 'once', note: '审计备注' }), true)
})

test('form helper trims notes and builds scope-specific payloads', () => {
  assert.deepEqual(buildUserControlPayload({
    scope: 'module', family: 'trade', userId: '159', strategy: 'negative', method: 'highLoss', duration: 'permanent', note: '  模块备注  '
  }), { userId: '159', strategy: 'negative', method: 'highLoss', value: 'loss', duration: 'permanent', note: '模块备注' })
  assert.deepEqual(buildUserControlPayload({
    scope: 'global', userId: '158', strategy: 'positive', method: 'lowProfit', duration: 'once', note: '  统一备注  '
  }), { userId: '158', strategy: 'positive', method: 'lowProfit', duration: 'once', note: '统一备注' })
})

test('shared modal separates trading outcome from finance yield wording', () => {
  const source = read('../src/admin/components/user-control/UserControlModal.vue')
  const helperSource = read('../src/features/user-control/userControlForm.js')
  assert.match(source, /盈利/)
  assert.match(source, /亏损/)
  assert.match(source, /控盘方式/)
  assert.match(helperSource, /做高盈利/)
  assert.match(helperSource, /做低盈利/)
  assert.match(helperSource, /做高亏损/)
  assert.match(helperSource, /做低亏损/)
  assert.match(source, /高\/默认\/低收益/)
  assert.match(source, /低收益或最低收益/)
  assert.match(source, /一次性控制/)
  assert.match(source, /永久控制/)
  assert.match(source, /点控备注/)
})

test('shared modal exposes note validation on blur while submit stays disabled', () => {
  const source = read('../src/admin/components/user-control/UserControlModal.vue')
  assert.match(source, /@blur="noteTouched = true"/)
  assert.match(source, /noteTouched && !form\.note\.trim\(\)/)
  assert.match(source, /:disabled="phase !== 'open' \|\| !isComplete"/)
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

test('module page explains settlement-only perpetual control and module-only scope', () => {
  const source = read('../src/pages/admin/user-control/ModuleUserControlPage.vue')
  assert.match(source, /不改变K线/)
  assert.match(source, /实时浮盈亏/)
  assert.match(source, /本次操作只影响当前模块/)
  assert.match(source, /规则来源/)
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

  assert.match(source, /是否点控中/)
  assert.match(source, /hasRules\(user\) \? '是' : '否'/)
  assert.doesNotMatch(source, />统一控制</)
  assert.doesNotMatch(source, />生效方式</)
  assert.doesNotMatch(source, />模块状态</)
  assert.doesNotMatch(source, />更新时间</)
  assert.match(actionBar, />\s*详情<\/button>/)
  assert.match(actionBar, />\s*资金<\/button>/)
  assert.match(actionBar, />\s*入金<\/button>/)
  assert.match(actionBar, />\s*更多\s*<\/button>/)
  assert.doesNotMatch(actionBar, />点控<\/button>/)
  assert.doesNotMatch(actionBar, />取消点控<\/button>/)
  assert.match(operationCatalog, /title: '统一点控'/)
  assert.match(operationCatalog, /title: '取消点控'/)
  assert.match(operationCatalog, /title: '点控日志'/)
  assert.doesNotMatch(actionBar, /控制详情|设置控制|修改控制|取消控制|控制日志/)
  assert.match(source, /MfaVerificationModal/)
  assert.match(source, /getUnifiedControlCancelItems/)
  assert.match(source, /v-for="item in cancelControlItems"/)
  assert.match(source, /当前没有可取消的模块/)
  assert.match(source, /:disabled="!cancelControlItems\.length"/)
  assert.doesNotMatch(source, /@mousedown\.self="closeControlCancel"/)
  assert.match(source, /data-testid="unified-user-control-cancel-dialog"[^>]*overflow-hidden/)
  assert.match(source, /data-testid="unified-user-control-cancel-body"[^>]*overflow-y-auto/)
  assert.match(productDocument, /始终同时展示/)
  assert.doesNotMatch(productDocument, /互斥展示/)
})

test('MFA completion rechecks cancellation items before it writes a unified cancellation', () => {
  const source = read('../src/pages/admin/user/UserListPage.vue')

  assert.match(source, /useMfaActionFlow\(\{[\s\S]*?const cancelItems = getUnifiedControlCancelItems\(rulesOf\(controlUser\.value\)\)/)
  assert.match(source, /if \(cancelItems\.length\) await cancelUnifiedUserControl\(action\.payload\)/)
  assert.match(source, /cancelUnifiedUserControl\(action\.payload\)[\s\S]*?controlUser\.value = null/)
  assert.match(source, /const handleMfaVerify = \(code\) => verifyMfa\(code\)/)
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
  assert.match(source, /max-w-\[920px\]/)
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
  assert.match(source, /grid items-start gap-4 lg:grid-cols-\[minmax\(0,1fr\)_360px\]/)
  assert.match(source, /<div ref="leftPanelRef" class="min-w-0 space-y-2\.5">[\s\S]*id-base="user-control-strategy"[\s\S]*id-base="user-control-method"[\s\S]*id-base="user-control-duration"/)
  assert.match(source, /data-testid="user-control-help-panel"[^>]*overflow-y-auto/)
  assert.match(source, /:style="\{ maxHeight: helpPanelMaxHeight \|\| undefined \}"/)
  assert.match(source, /getBoundingClientRect\?\.\(\)\.height/)
  assert.match(source, /matchMedia\('\(min-width: 1024px\)'\)/)
  assert.match(source, /<aside[^>]*aria-label="点控说明备注"[\s\S]*selectedModuleRule\.title[\s\S]*当前选择说明[\s\S]*控盘类型[\s\S]*控盘方式[\s\S]*控制周期[\s\S]*通用结算说明/)
  assert.match(source, /v-if="isGlobalScope"[^>]*>[\s\S]*当前选择说明/)
  assert.match(source, /v-else class="sr-only"[\s\S]*id="user-control-strategy-help"[\s\S]*id="user-control-method-help"[\s\S]*id="user-control-duration-help"/)
  assert.match(source, /v-if="isGlobalScope"[^>]*>[\s\S]*通用结算说明/)
  assert.match(source, /v-if="isGlobalScope && financeRuleHint"/)
  assert.match(source, /v-if="isGlobalScope"[^>]*>[\s\S]*状态规则/)
  assert.match(source, /selectedModuleRule\.title/)
  assert.match(source, /selectedModuleRule\.items/)
  assert.match(source, /六模块统一规则/)
  assert.match(source, /交割点控规则/)
  assert.match(source, /永续点控规则/)
  assert.match(source, /现货点控规则/)
  assert.match(source, /AI量化点控规则/)
  assert.match(source, /流动性挖矿点控规则/)
  assert.match(source, /投资组合点控规则/)
  assert.match(source, /不针对单个用户修改K线或行情/)
  assert.match(source, /不改变大盘行情、盘口价格和真实成交撮合记录/)
  assert.doesNotMatch(source, /grid gap-3 sm:grid-cols-3/)
  assert.match(helperSource, /交易模块盈利；理财模块按收益提高处理/)
  assert.match(helperSource, /交易模块亏损；理财模块按低收益或最低收益处理/)
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
  assert.match(source, /:error="mfaError"/)
  assert.match(source, /:error-attempt="mfaErrorAttempt"/)
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
  assert.match(settingSource, /id-base="user-control-duration"/)
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

test('unified cancellation waits for leave before it opens MFA', () => {
  const source = read('../src/pages/admin/user/UserListPage.vue')
  const confirm = source.slice(
    source.indexOf('const confirmControlCancel = () => {'),
    source.indexOf('const handleMfaVerify =')
  )

  assert.match(confirm, /pendingMfaAction\.value = \{ type: 'cancel', payload \}/)
  assert.doesNotMatch(confirm, /requestMfa\(\{ type: 'cancel', payload \}\)/)
  assert.match(confirm, /const handleUnifiedCancelAfterLeave = async \(\) => \{[\s\S]*?await onUnifiedCancelAfterLeave\(\)[\s\S]*?openPendingMfa\(\)/)
})
