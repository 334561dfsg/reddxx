import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  buildUserControlPayload,
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

test('form helper rejects incomplete values used by the disabled state', () => {
  assert.equal(isUserControlFormComplete({ scope: 'module', family: 'trade', userId: '159', value: 'profit', duration: 'once', note: '   ' }), false)
  assert.equal(isUserControlFormComplete({ scope: 'module', family: 'trade', userId: '159', value: '', duration: 'once', note: '审计备注' }), false)
  assert.equal(isUserControlFormComplete({ scope: 'module', family: 'trade', userId: '159', value: 'highYield', duration: 'once', note: '审计备注' }), false)
  assert.equal(isUserControlFormComplete({ scope: 'global', userId: '', strategy: 'positive', duration: 'once', note: '审计备注' }), false)
  assert.equal(isUserControlFormComplete({ scope: 'module', family: 'trade', userId: '159', value: 'profit', duration: 'once', note: '审计备注' }), true)
})

test('form helper trims notes and builds scope-specific payloads', () => {
  assert.deepEqual(buildUserControlPayload({
    scope: 'module', family: 'trade', userId: '159', strategy: 'negative', value: 'loss', duration: 'permanent', note: '  模块备注  '
  }), { userId: '159', value: 'loss', duration: 'permanent', note: '模块备注' })
  assert.deepEqual(buildUserControlPayload({
    scope: 'global', userId: '158', strategy: 'positive', value: 'lowYield', duration: 'once', note: '  统一备注  '
  }), { userId: '158', strategy: 'positive', duration: 'once', note: '统一备注' })
})

test('shared modal separates trading outcome from finance yield wording', () => {
  const source = read('../src/admin/components/user-control/UserControlModal.vue')
  assert.match(source, /正向控制/)
  assert.match(source, /负向控制/)
  assert.match(source, /盈利/)
  assert.match(source, /亏损/)
  assert.match(source, /高收益/)
  assert.match(source, /低收益/)
  assert.match(source, /一次性/)
  assert.match(source, /永久/)
  assert.match(source, /操作备注/)
})

test('shared modal exposes note validation on blur while submit stays disabled', () => {
  const source = read('../src/admin/components/user-control/UserControlModal.vue')
  assert.match(source, /@blur="noteTouched = true"/)
  assert.match(source, /noteTouched && !form\.note\.trim\(\)/)
  assert.match(source, /:disabled="!isComplete"/)
})

test('shared modal keeps the atomic failure warning inside the global-only summary', () => {
  const source = read('../src/admin/components/user-control/UserControlModal.vue')
  const globalWarning = source.match(
    /<p\s+v-if="displayScope === 'global'"\s+data-testid="user-control-global-atomic-warning"[\s\S]*?<\/p>/
  )?.[0] || ''

  assert.notEqual(globalWarning, '')
  assert.match(globalWarning, /保存会覆盖该用户在六个模块中的现有规则/)
  assert.match(globalWarning, /任一模块设置失败，六个模块全部保持原状态/)
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

  assert.doesNotMatch(moduleSource, /用户控盘/)
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

test('user list keeps both point-control shortcuts available and safeguards empty cancellation', () => {
  const source = read('../src/pages/admin/user/UserListPage.vue')
  const menu = elementByTestId(source, 'user-point-control-action-menu')
  const productDocument = read('../docs/user-point-control-product-requirements.md')

  assert.match(source, /是否点控中/)
  assert.match(source, /hasRules\(user\) \? '是' : '否'/)
  assert.doesNotMatch(source, />统一控制</)
  assert.doesNotMatch(source, />生效方式</)
  assert.doesNotMatch(source, />模块状态</)
  assert.doesNotMatch(source, />更新时间</)
  assert.match(menu, />用户详情</)
  assert.match(menu, /封户.*解封|解封.*封户/)
  assert.match(menu, />调账</)
  assert.match(menu, />入金</)
  assert.match(menu, />划转</)
  assert.match(menu, /@click="selectControlSetting\(user\)"[^>]*>点控<\/button>/)
  assert.match(menu, /@click="selectControlCancel\(user\)"[^>]*>取消点控<\/button>/)
  assert.doesNotMatch(menu, /v-if="!hasRules\(user\)"/)
  assert.doesNotMatch(menu, /v-else/)
  assert.match(menu, />点控日志</)
  assert.doesNotMatch(menu, /控制详情|设置控制|修改控制|取消控制|控制日志/)
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
  const mfaVerify = source.slice(
    source.indexOf('const handleMfaVerify ='),
    source.indexOf('const handleMfaCancel = () => {')
  )

  assert.match(mfaVerify, /const cancelItems = getUnifiedControlCancelItems\(rulesOf\(controlUser\.value\)\)/)
  assert.match(mfaVerify, /if \(cancelItems\.length\) \{\s*await cancelUnifiedUserControl\(action\.payload\)\s*\}/)
  assert.match(mfaVerify, /cancelUnifiedUserControl\(action\.payload\)[\s\S]*?\}\s*controlUser\.value = null/)
  assert.match(mfaVerify, /pendingMfaAction\.value = null/)
  assert.match(mfaVerify, /mfaOpen\.value = false/)
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

test('log page presents operation and execution records in one point-control list', () => {
  const source = read('../src/pages/admin/user-control/UserControlLogPage.vue')
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

test('log page paginates filtered rows and resets from every filter', () => {
  const source = read('../src/pages/admin/user-control/UserControlLogPage.vue')
  assert.match(source, /useAdminListPagination\(unifiedLogs,\s*\{[\s\S]*pageSize:\s*10/)
  assert.match(source, /resetSources:\s*\[[\s\S]*filters\.userId[\s\S]*filters\.module[\s\S]*filters\.source[\s\S]*filters\.action[\s\S]*filters\.dateFrom[\s\S]*filters\.dateTo/)
  assert.match(source, /v-for="log in pagedLogs"/)
  assert.match(source, /<AdminListPaginationBar[\s\S]*:total-count="unifiedLogs\.length"[\s\S]*@update:page-size="onPageSizeChange"/)
})

test('log page displays success and failure status for operation records', () => {
  const source = read('../src/pages/admin/user-control/UserControlLogPage.vue')
  assert.match(source, /status:\s*log\.status \|\| ''/)
  assert.match(source, /statusLabel\(log\.status\)/)
})

test('log page exposes audit fields without demo state actions', () => {
  const source = read('../src/pages/admin/user-control/UserControlLogPage.vue')
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

test('log page binds date filters and audit columns to their actual values', () => {
  const source = read('../src/pages/admin/user-control/UserControlLogPage.vue')
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

test('log page immediately normalizes module values and follows route query changes', () => {
  const source = read('../src/pages/admin/user-control/UserControlLogPage.vue')
  assert.match(source, /normalizeUserControlLogQuery/)
  assert.match(source, /route\.query\.userId/)
  assert.match(source, /route\.query\.module/)
  assert.match(source, /immediate:\s*true/)
})

test('log page omits the former tab interface', () => {
  const source = read('../src/pages/admin/user-control/UserControlLogPage.vue')
  assert.doesNotMatch(source, /role="tablist"/)
  assert.doesNotMatch(source, /role="tab"/)
  assert.doesNotMatch(source, /role="tabpanel"/)
})

test('user and module rows link to the named log route with query filters', () => {
  const userSource = read('../src/pages/admin/user/UserListPage.vue')
  const moduleSource = read('../src/pages/admin/user-control/ModuleUserControlPage.vue')
  assert.match(userSource, /name:\s*'users-control-log'[\s\S]*query:\s*\{\s*userId:/)
  assert.match(moduleSource, /name:\s*'users-control-log'[\s\S]*query:\s*\{\s*userId:[\s\S]*module:/)
})

test('shared setting modal keeps only its body scrollable and keeps result copy compact', () => {
  const source = read('../src/admin/components/user-control/UserControlModal.vue')
  assert.match(source, /max-w-\[680px\]/)
  assert.match(source, /<Teleport to="body">/)
  assert.match(source, /fixed inset-0/)
  assert.doesNotMatch(source, /@mousedown\.self|@click\.self/)
  assert.doesNotMatch(source, /fixed inset-0[^"\n]*overflow-auto/)
  assert.match(source, /data-testid="user-control-dialog-frame"[^>]*max-h-\[calc\(100dvh-1\.5rem\)\][^>]*overflow-hidden/)
  assert.match(source, /data-testid="user-control-dialog-body"[^>]*min-h-0[^>]*flex-1[^>]*overflow-y-auto/)
  assert.match(source, /space-y-2\.5 px-5 py-3/)
  assert.match(source, /rows="2"/)
  assert.match(source, /交易盈利、理财高收益/)
  assert.match(source, /交易亏损、理财低收益/)
  assert.doesNotMatch(source, />交易类效果</)
  assert.doesNotMatch(source, />理财类效果</)
  assert.doesNotMatch(source, /本次操作只影响当前模块，其他五个模块的用户规则保持不变。/)
})

test('MFA modal keeps only its body scrollable', () => {
  const mfaSource = read('../src/admin/components/MfaVerificationModal.vue')

  assert.doesNotMatch(mfaSource, /fixed inset-0[^"\n]*overflow-y-auto/)
  assert.match(mfaSource, /data-testid="mfa-dialog-frame"[^>]*max-h-\[calc\(100dvh-2rem\)\][^>]*overflow-hidden/)
  assert.match(mfaSource, /data-testid="mfa-dialog-body"[^>]*min-h-0[^>]*flex-1[^>]*overflow-y-auto/)
})

test('MFA modal prevents duplicate verification and exposes loading and errors accessibly', () => {
  const mfaSource = read('../src/admin/components/MfaVerificationModal.vue')

  assert.match(mfaSource, /useDialogLifecycle/)
  assert.match(mfaSource, /aria-labelledby="mfa-dialog-title"/)
  assert.match(mfaSource, /:aria-busy="loading"/)
  assert.match(mfaSource, /ref="verificationInput"/)
  assert.match(mfaSource, /ref="errorSummary"/)
  assert.match(mfaSource, /role="alert"/)
  assert.match(mfaSource, /aria-live="assertive"/)
  assert.match(mfaSource, /if \(props\.loading \|\| verifyRequested\.value\) return/)
  assert.match(mfaSource, /:aria-label="loading \? '验证并继续，验证中' : '验证并继续'"/)
  assert.match(mfaSource, /name="dialog-overlay"/)
  assert.match(mfaSource, /name="dialog-panel"/)
  assert.match(mfaSource, /v-if="rendered"/)
  assert.doesNotMatch(mfaSource, /v-show="open"/)
  assert.doesNotMatch(mfaSource, /@click\.self|@mousedown\.self|backdrop-click/)
})

test('user management preserves an MFA failure for the open modal to announce', () => {
  const source = read('../src/pages/admin/user/UserListPage.vue')
  const mfaVerify = source.slice(
    source.indexOf('const handleMfaVerify ='),
    source.indexOf('const handleMfaCancel =')
  )

  assert.match(source, /const mfaError = ref\(''\)/)
  assert.match(source, /:error="mfaError"/)
  assert.match(mfaVerify, /try \{[\s\S]*?mfaOpen\.value = false[\s\S]*?\} catch \(error\) \{[\s\S]*?mfaError\.value =/)
  assert.doesNotMatch(mfaVerify, /catch \(error\) \{[\s\S]*?mfaOpen\.value = false/)
})

test('point-control cancellation dialogs and detail drawer keep overlays open and only bodies scrollable', () => {
  const moduleSource = read('../src/pages/admin/user-control/ModuleUserControlPage.vue')
  const userListSource = read('../src/pages/admin/user/UserListPage.vue')
  const detailSource = read('../src/admin/components/user-control/UserControlDetailDrawer.vue')

  assert.doesNotMatch(moduleSource, /@mousedown\.self="closeCancel"|@click\.self="closeCancel"/)
  assert.match(moduleSource, /data-testid="module-user-control-cancel-dialog"[^>]*max-h-\[calc\(100vh-2rem\)\][^>]*max-h-\[calc\(100dvh-2rem\)\][^>]*overflow-hidden/)
  assert.match(moduleSource, /data-testid="module-user-control-cancel-body"[^>]*min-h-0[^>]*flex-1[^>]*overflow-y-auto/)
  assert.doesNotMatch(userListSource, /@mousedown\.self="closeControlCancel"|@click\.self="closeControlCancel"/)
  assert.match(userListSource, /data-testid="unified-user-control-cancel-dialog"[^>]*overflow-hidden/)
  assert.match(userListSource, /data-testid="unified-user-control-cancel-body"[^>]*min-h-0[^>]*flex-1[^>]*overflow-y-auto/)
  assert.doesNotMatch(detailSource, /@mousedown\.self|@click\.self/)
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
  assert.match(settingSource, /ref="firstControlOption"/)
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

  assert.match(moduleSource, /data-testid="module-user-control-cancel-dialog"[^>]*max-h-\[calc\(100dvh-2rem\)\][^>]*overflow-hidden/)
  assert.match(moduleSource, /data-testid="module-user-control-cancel-body"[^>]*min-h-0[^>]*flex-1[^>]*overflow-y-auto/)
  assert.match(unifiedSource, /data-testid="unified-user-control-cancel-dialog"[^>]*max-h-\[calc\(100vh-2rem\)\][^>]*max-h-\[calc\(100dvh-2rem\)\][^>]*overflow-hidden/)
  assert.match(unifiedSource, /data-testid="unified-user-control-cancel-body"[^>]*min-h-0[^>]*flex-1[^>]*overflow-y-auto/)
})

test('unified cancellation waits for leave before it opens MFA', () => {
  const source = read('../src/pages/admin/user/UserListPage.vue')
  const confirm = source.slice(
    source.indexOf('const confirmControlCancel = () => {'),
    source.indexOf('const handleMfaVerify =')
  )

  assert.match(confirm, /pendingMfaAction\.value = \{ type: 'cancel', payload \}/)
  assert.doesNotMatch(confirm, /requestMfa\(\{ type: 'cancel', payload \}\)/)
  assert.match(confirm, /const handleUnifiedCancelAfterLeave = \(\) => \{[\s\S]*?onUnifiedCancelAfterLeave\(\)[\s\S]*?mfaOpen\.value = true/)
})
