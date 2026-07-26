import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import test from 'node:test'
import { createSfcHarness, loadVueSfc, loadVueSfcModuleUrl } from './helpers/vueSfcHarness.js'

const projectFile = (path) => resolve(process.cwd(), path)
const rechargeDrawerFile = projectFile('src/admin/components/user/UserRechargeSummaryDrawer.vue')
const mutationDialogFile = projectFile('src/admin/components/user/UserMembershipMutationDialog.vue')
const panelSingleSelectFile = projectFile('src/admin/components/form/PanelSingleSelect.vue')
const reviewDrawerFile = projectFile('src/admin/components/user/UserCreditReviewDrawer.vue')
const reviewDecisionFile = projectFile('src/admin/components/user/UserCreditReviewDecisionDialog.vue')

const user = { id: 'user_1004', username: 'user_chen', vipLevel: 1 }
const summary = {
  cumulativeRecharge: 170000,
  qualifyingRecharge: 160000,
  currentVipLevel: 1,
  nextLevel: { level: 2, name: 'VIP2', displayName: '白银会员', targetRecharge: 300000, remainingRecharge: 140000, progressPercent: 53.33 },
  records: [
    { id: 'r1', amount: 125000, qualifyingAmount: 120000, source: '链上充值', transactionId: 'DEP-001', createdAt: '2026-06-18T08:30:00.000Z' }
  ]
}

test('recharge Drawer opens above its trigger, exposes the complete summary, and closes intentionally', async (t) => {
  const component = await loadVueSfc(rechargeDrawerFile)
  const trigger = {
    isConnected: true,
    focused: false,
    focus() { this.focused = true }
  }
  let closeCount = 0
  let harness
  harness = await createSfcHarness(component, { visible: false, user, summary, returnFocus: trigger }, {
    onClose: () => { closeCount += 1; harness.props.visible = false }
  })
  t.after(harness.cleanup)

  harness.props.visible = true
  await harness.flush()
  const frame = harness.findByTestId('user-recharge-summary-drawer')
  assert.ok(frame)
  assert.equal(frame.getAttribute('role'), 'dialog')
  assert.equal(frame.getAttribute('aria-modal'), 'true')
  assert.match(frame.textContent, /170,000\.00/)
  assert.match(frame.textContent, /160,000\.00/)
  assert.match(frame.textContent, /VIP2/)
  assert.match(frame.textContent, /DEP-001/)
  assert.equal(frame.parent.classList.contains('recharge-drawer-enter-from'), true)

  await harness.finishTransitions()
  frame.parent.click()
  await harness.flush()
  assert.equal(closeCount, 0)

  const close = harness.allNodes().find((node) => frame.contains(node) && node.getAttribute?.('aria-label') === '关闭')
  assert.ok(close)
  close.click()
  await harness.flush()
  assert.equal(closeCount, 1)
  assert.equal(frame.isConnected, true)
  await harness.finishTransitions()
  assert.equal(trigger.focused, true)
})

test('recharge Drawer has one body scroller and responsive motion safeguards', async () => {
  const source = await readFile(rechargeDrawerFile, 'utf8')

  assert.match(source, /data-testid="user-recharge-summary-body"[^>]*overflow-y-auto/)
  assert.equal((source.match(/overflow-y-auto/g) || []).length, 1)
  assert.match(source, /overflow-hidden/)
  assert.match(source, /200ms ease-out/)
  assert.match(source, /150ms ease-in/)
  assert.match(source, /prefers-reduced-motion: reduce/)
  assert.match(source, /transition-duration: 50ms/)
  assert.match(source, /transform: none/)
  assert.match(source, /100vh/)
  assert.match(source, /100dvh/)
  assert.match(source, /safe-area-inset-right/)
  assert.doesNotMatch(source, /@click\.self|@mousedown\.self|@touchend\.self/)
})

const membershipSnapshot = {
  user,
  enabledVipLevels: [
    { level: 0, name: '普通用户', displayName: '普通用户', benefits: ['基础交易'] },
    { level: 1, name: 'VIP1', displayName: '青铜会员', benefits: ['优先客服'] },
    { level: 2, name: 'VIP2', displayName: '白银会员', benefits: ['专属客服', '高级数据分析'] },
    { level: 3, name: 'VIP3', displayName: ' ', benefits: [] },
    { level: 4, name: '钻石会员', displayName: '钻石会员', benefits: [] },
    { level: 5, name: ' ', displayName: '翡翠会员', benefits: ['成长礼包'] },
    { level: 6, name: 'VIP6', benefits: ['优先客服'] },
    { level: 7, displayName: '七级会员', benefits: ['优先客服'] },
    { level: 8, name: 'VIP8', displayName: '八级会员', benefits: ['优先客服'] },
    { level: 9, name: 'VIP9', displayName: '九级会员', benefits: ['优先客服'] },
    { level: 10, name: 'VIP10', displayName: '十级会员', benefits: ['优先客服'] },
    { level: 11, name: 'VIP11', displayName: '十一级会员', benefits: ['优先客服'] },
    { level: 12, name: 'VIP12', displayName: '十二级会员', benefits: ['优先客服'] },
    { level: 13, name: 'VIP13', displayName: '十三级会员', benefits: ['优先客服'] },
    { level: 14, name: 'VIP14', displayName: '十四级会员', benefits: ['优先客服'] },
    { level: 15, name: 'VIP15', displayName: '皇冠会员', benefits: [] }
  ]
}

const loadMembershipMutationDialog = async () => loadVueSfc(mutationDialogFile, {
  vueImports: { [panelSingleSelectFile]: loadVueSfcModuleUrl(panelSingleSelectFile) }
})

const membershipSnapshotCopy = () => ({
  ...membershipSnapshot,
  enabledVipLevels: membershipSnapshot.enabledVipLevels.map((level) => ({
    ...level,
    benefits: level.benefits ? [...level.benefits] : level.benefits
  }))
})

const setInput = async (harness, testId, value) => {
  const input = harness.findByTestId(testId)
  assert.ok(input)
  input.value = value
  input.dispatchEvent({ type: 'input', target: input })
  await harness.flush()
  return input
}

test('membership mutation Dialog validates rebate and emits an exact MFA payload after confirmation', async (t) => {
  const component = await loadVueSfc(mutationDialogFile)
  const requests = []
  const harness = await createSfcHarness(component, {
    visible: true,
    user: { ...user, balance: 56000, creditScore: 680 },
    mode: 'rebate',
    snapshot: membershipSnapshot,
    busy: false
  }, { onRequestMfa: (request) => requests.push(request) })
  t.after(harness.cleanup)
  await harness.finishTransitions()

  await setInput(harness, 'membership-mutation-amount', '25.50')
  await setInput(harness, 'membership-mutation-reason', ' 活动返利 ')
  harness.findByText('下一步', 'button').click()
  await harness.flush()
  assert.match(harness.findByTestId('user-membership-mutation-dialog').textContent, /56,000\.00/)
  assert.match(harness.findByTestId('user-membership-mutation-dialog').textContent, /56,025\.50/)

  harness.findByText('提交并验证', 'button').click()
  assert.equal(requests.length, 1)
  assert.equal(requests[0].type, 'rebate-grant')
  assert.deepEqual(requests[0].payload, { userId: user.id, amount: 25.5, reason: '活动返利' })
  assert.equal(requests[0].returnFocus.tag, 'button')
})

test('membership mutation Dialog keeps credit radios and commits searchable VIP levels with the exact MFA payload', async (t) => {
  const component = await loadMembershipMutationDialog()
  const requests = []
  const harness = await createSfcHarness(component, {
    visible: true,
    user: { ...user, balance: 56000, creditScore: 680, vipLevel: 1 },
    mode: 'credit',
    snapshot: membershipSnapshot,
    busy: false
  }, { onRequestMfa: (request) => requests.push(request) })
  t.after(harness.cleanup)
  await harness.finishTransitions()

  const decrease = harness.allNodes().find((node) => node.tag === 'input' && node.getAttribute?.('name') === 'credit-direction' && node.value === 'decrease')
  assert.ok(decrease)
  decrease.checked = true
  decrease.dispatchEvent({ type: 'change', target: decrease })
  await setInput(harness, 'membership-mutation-points', '20')
  await setInput(harness, 'membership-mutation-reason', ' 风险扣减 ')
  harness.findByText('下一步', 'button').click()
  await harness.flush()
  harness.findByText('提交并验证', 'button').click()
  assert.deepEqual(requests[0].payload, { userId: user.id, direction: 'decrease', points: 20, reason: '风险扣减' })

  harness.props.mode = 'vip'
  await harness.flush()
  const dialog = harness.findByTestId('user-membership-mutation-dialog')
  const vipSelect = harness.findByTestId('membership-vip-level-select')
  assert.ok(vipSelect)
  assert.equal(harness.allNodes().filter((node) => node.getAttribute?.('name') === 'vip-target').length, 0)
  assert.doesNotMatch(dialog.textContent, /标准会员权益/)

  const vipTrigger = harness.findByTestId('panel-single-select-trigger')
  vipTrigger.click()
  await harness.flush()
  const currentLevel = harness.allNodes().find((node) => (
    node.getAttribute?.('role') === 'option' && node.textContent.includes('青铜会员')
  ))
  assert.ok(currentLevel)
  assert.equal(currentLevel.getAttribute('aria-disabled'), 'true')
  for (const label of ['VIP3', '钻石会员', 'VIP6', '七级会员']) {
    const levelWithoutDistinctSubtitle = harness.allNodes().find((node) => (
      node.getAttribute?.('role') === 'option' && node.textContent.includes(label)
    ))
    assert.ok(levelWithoutDistinctSubtitle)
    assert.equal(harness.allNodes().filter((node) => (
      levelWithoutDistinctSubtitle.contains(node) && node.classList?.contains('text-xs')
    )).length, 0)
  }

  const vipSearch = harness.findByTestId('panel-single-select-search')
  vipSearch.value = 'VIP15'
  vipSearch.dispatchEvent({ type: 'input', target: vipSearch })
  await harness.flush()
  const vip15 = harness.allNodes().find((node) => (
    node.getAttribute?.('role') === 'option' && node.textContent.includes('皇冠会员')
  ))
  assert.ok(vip15)
  vip15.click()
  await harness.finishTransitions()
  await setInput(harness, 'membership-mutation-reason', ' 运营升级 ')
  harness.findByText('下一步', 'button').click()
  await harness.flush()
  assert.match(dialog.textContent, /皇冠会员/)
  assert.match(dialog.textContent, /VIP15/)
  assert.doesNotMatch(dialog.textContent, /目标权益/)
  harness.findByText('提交并验证', 'button').click()
  assert.equal(requests[1].type, 'vip-level-set')
  assert.deepEqual(requests[1].payload, { userId: user.id, vipLevel: 15, reason: '运营升级' })
})

test('membership mutation Dialog rejects VIP selections invalidated by refresh before confirmation and MFA submission', async () => {
  const component = await loadMembershipMutationDialog()
  const scenarios = [
    {
      name: 'removed level',
      refresh(harness) {
        harness.props.snapshot = {
          ...membershipSnapshotCopy(),
          enabledVipLevels: membershipSnapshot.enabledVipLevels.filter((level) => level.level !== 15)
        }
      }
    },
    {
      name: 'level that became current',
      refresh(harness) {
        harness.props.user = { ...user, vipLevel: 15 }
      }
    }
  ]

  for (const stage of ['before confirmation', 'during confirmation']) {
    for (const scenario of scenarios) {
      const requests = []
      const harness = await createSfcHarness(component, {
        visible: true,
        user: { ...user, vipLevel: 1 },
        mode: 'vip',
        snapshot: membershipSnapshotCopy(),
        busy: false
      }, { onRequestMfa: (request) => requests.push(request) })
      await harness.finishTransitions()

      harness.findByTestId('panel-single-select-trigger').click()
      await harness.flush()
      const search = harness.findByTestId('panel-single-select-search')
      search.value = 'VIP15'
      search.dispatchEvent({ type: 'input', target: search })
      await harness.flush()
      harness.allNodes().find((node) => (
        node.getAttribute?.('role') === 'option' && node.textContent.includes('皇冠会员')
      )).click()
      await harness.finishTransitions()
      await setInput(harness, 'membership-mutation-reason', ' 刷新后重选 ')

      if (stage === 'during confirmation') {
        harness.findByText('下一步', 'button').click()
        await harness.flush()
        assert.ok(harness.findByText('提交并验证', 'button'))
      }

      scenario.refresh(harness)
      await harness.flush()
      harness.findByText(stage === 'during confirmation' ? '提交并验证' : '下一步', 'button').click()
      await harness.flush()

      const trigger = harness.findByTestId('panel-single-select-trigger')
      assert.equal(requests.length, 0, `${scenario.name} must not emit during ${stage}`)
      assert.match(harness.findByTestId('user-membership-mutation-dialog').textContent, /目标会员等级已不可用，请重新选择/)
      assert.equal(trigger.getAttribute('aria-invalid'), 'true')
      assert.match(trigger.getAttribute('aria-describedby'), /membership-vip-level-error/)
      assert.equal(harness.document.activeElement, trigger)
      assert.match(trigger.textContent, /(?:15|皇冠会员)/)
      harness.cleanup()
    }
  }
})

test('membership mutation Dialog follows modal, select-choice, and responsive contracts', async () => {
  const source = await readFile(mutationDialogFile, 'utf8')

  assert.doesNotMatch(source, /<select\b|role="combobox"/)
  assert.match(source, /aria-labelledby="credit-direction-label"/)
  assert.match(source, /import PanelSingleSelect from '\.\.\/form\/PanelSingleSelect\.vue'/)
  assert.match(source, /data-testid="membership-vip-level-select"/)
  assert.doesNotMatch(source, /name="vip-target"/)
  assert.match(source, /type="radio"/)
  assert.match(source, /data-testid="user-membership-mutation-body"[^>]*overflow-y-auto/)
  assert.equal((source.match(/overflow-y-auto/g) || []).length, 1)
  assert.match(source, /closeDisabled/)
  assert.match(source, /role="alert"/)
  assert.match(source, /200ms ease-out/)
  assert.match(source, /150ms ease-in/)
  assert.match(source, /prefers-reduced-motion: reduce/)
  assert.match(source, /transition-duration: 50ms/)
  assert.match(source, /transform: none/)
})

const reviews = [
  { id: 'r-pending', userId: user.id, beforeScore: 680, proposedScore: 695, delta: 15, reason: '补充核验完成', applicantName: '风控专员', appliedAt: '2026-07-23T09:20:00.000Z', status: 'pending' },
  { id: 'r-approved', userId: user.id, beforeScore: 650, proposedScore: 680, delta: 30, reason: '历史恢复', applicantName: '审核员', appliedAt: '2026-06-01T09:20:00.000Z', status: 'approved', decisionNote: '通过' }
]

test('credit review Drawer keeps pending first and emits the selected review with its trigger', async (t) => {
  const component = await loadVueSfc(reviewDrawerFile)
  const selections = []
  const harness = await createSfcHarness(component, { visible: true, user, reviews: [...reviews].reverse(), busy: false }, {
    onSelectReview: (selection) => selections.push(selection)
  })
  t.after(harness.cleanup)
  await harness.finishTransitions()

  const frame = harness.findByTestId('user-credit-review-drawer')
  assert.ok(frame)
  assert.equal(frame.getAttribute('aria-modal'), 'true')
  assert.match(frame.textContent, /待审核 1/)
  assert.ok(frame.textContent.indexOf('补充核验完成') < frame.textContent.indexOf('历史恢复'))

  const action = harness.findByText('处理审核', 'button')
  assert.ok(action)
  action.click()
  assert.equal(selections.length, 1)
  assert.equal(selections[0].review.id, 'r-pending')
  assert.equal(selections[0].returnFocus, action)
})

test('credit review Drawer filters status without mutating input and follows Drawer safeguards', async (t) => {
  const component = await loadVueSfc(reviewDrawerFile)
  const input = [...reviews]
  const harness = await createSfcHarness(component, { visible: true, user, reviews: input, busy: false })
  t.after(harness.cleanup)
  await harness.finishTransitions()

  harness.findByText('已处理', 'button').click()
  await harness.flush()
  const frame = harness.findByTestId('user-credit-review-drawer')
  assert.doesNotMatch(frame.textContent, /补充核验完成/)
  assert.match(frame.textContent, /历史恢复/)
  assert.deepEqual(input, reviews)

  const source = await readFile(reviewDrawerFile, 'utf8')
  assert.match(source, /data-testid="user-credit-review-body"[^>]*overflow-y-auto/)
  assert.equal((source.match(/overflow-y-auto/g) || []).length, 1)
  assert.match(source, /closeDisabled/)
  assert.match(source, /translateX\(100%\)/)
  assert.match(source, /200ms ease-out/)
  assert.match(source, /150ms ease-in/)
  assert.match(source, /prefers-reduced-motion: reduce/)
  assert.doesNotMatch(source, /@click\.self|@mousedown\.self|@touchend\.self/)
})

test('credit review decision requires an explicit choice and emits exact MFA intent', async (t) => {
  const component = await loadVueSfc(reviewDecisionFile)
  const requests = []
  const harness = await createSfcHarness(component, { visible: true, user, review: reviews[0], busy: false }, {
    onRequestMfa: (request) => requests.push(request)
  })
  t.after(harness.cleanup)
  await harness.finishTransitions()

  harness.findByText('下一步', 'button').click()
  await harness.flush()
  assert.match(harness.findByTestId('user-credit-review-decision-dialog').textContent, /请选择审核决定/)
  assert.equal(requests.length, 0)

  const approve = harness.allNodes().find((node) => node.tag === 'input' && node.getAttribute?.('name') === 'review-decision' && node.value === 'approve')
  assert.ok(approve)
  approve.checked = true
  approve.dispatchEvent({ type: 'change', target: approve })
  await setInput(harness, 'credit-review-decision-note', ' 材料有效 ')
  harness.findByText('下一步', 'button').click()
  await harness.flush()
  assert.match(harness.findByTestId('user-credit-review-decision-dialog').textContent, /信用分将从 680 调整为 695/)
  harness.findByText('提交并验证', 'button').click()

  assert.equal(requests.length, 1)
  assert.equal(requests[0].type, 'credit-review-decide')
  assert.deepEqual(requests[0].payload, { userId: user.id, reviewId: 'r-pending', decision: 'approve', note: '材料有效' })
  assert.equal(requests[0].returnFocus.tag, 'button')
})

test('credit review decision Dialog is a guarded third layer with accessible motion', async () => {
  const source = await readFile(reviewDecisionFile, 'utf8')

  assert.match(source, /useDialogLifecycle/)
  assert.match(source, /:style="layerStyle"/)
  assert.match(source, /aria-labelledby="review-decision-label"/)
  assert.match(source, /type="radio"/)
  assert.doesNotMatch(source, /<select\b|role="combobox"/)
  assert.match(source, /data-testid="user-credit-review-decision-body"[^>]*overflow-y-auto/)
  assert.equal((source.match(/overflow-y-auto/g) || []).length, 1)
  assert.match(source, /closeDisabled/)
  assert.match(source, /role="alert"/)
  assert.match(source, /200ms ease-out/)
  assert.match(source, /150ms ease-in/)
  assert.match(source, /prefers-reduced-motion: reduce/)
  assert.match(source, /transform: none/)
})
