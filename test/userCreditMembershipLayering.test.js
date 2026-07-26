import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/pages/admin/user/UserListPage.vue', import.meta.url), 'utf8')

test('user list wires every credit and membership surface without closing the operation Drawer', () => {
  for (const name of [
    'UserCreditReviewDrawer',
    'UserCreditReviewDecisionDialog',
    'UserMembershipMutationDialog',
    'UserRechargeSummaryDrawer'
  ]) assert.match(source, new RegExp(`import ${name}`))

  for (const id of ['credit-review', 'credit-adjust', 'vip-level', 'vip-deposit-total', 'rebate-reward']) {
    assert.match(source, new RegExp(`(?:id === '${id}'|includes\\(id\\))`))
  }
  assert.doesNotMatch(source, /(?:credit-review|credit-adjust|vip-level|vip-deposit-total|rebate-reward)[\s\S]{0,500}closeOperationDrawer\(\)/)
})

test('membership operations use a separate MFA dispatcher and refresh every live user copy', () => {
  assert.match(source, /requestMembershipMfa/)
  assert.match(source, /verifyMembershipMfa/)
  assert.match(source, /membershipMfaOpen/)
  assert.match(source, /adjustUserCredit/)
  assert.match(source, /setUserVipLevel/)
  assert.match(source, /grantUserRebate/)
  assert.match(source, /decideUserCreditReview/)
  assert.match(source, /users\.value = users\.value\.map/)
  assert.match(source, /operationDrawerUser\.value = \{ \.\.\.updated \}/)
  assert.match(source, /membershipMutationUser\.value = \{ \.\.\.updated \}/)
  assert.match(source, /creditReviewUser\.value = \{ \.\.\.updated \}/)
})

test('four-layer review path renders in deterministic order and preserves lower layers', () => {
  const operationIndex = source.indexOf('<UserOperationDrawer')
  const reviewIndex = source.indexOf('<UserCreditReviewDrawer')
  const decisionIndex = source.indexOf('<UserCreditReviewDecisionDialog')
  const membershipMfaIndex = source.lastIndexOf('<MfaVerificationModal')

  assert.ok(operationIndex >= 0)
  assert.ok(reviewIndex > operationIndex)
  assert.ok(decisionIndex > reviewIndex)
  assert.ok(membershipMfaIndex > decisionIndex)
  assert.match(source, /:busy="membershipMfaOpen \|\| membershipMfaLoading"/)
  assert.match(source, /:return-focus="membershipMfaReturnFocus"/)
  assert.match(source, /reviewDecisionOpen\.value = false/)
  assert.doesNotMatch(source, /onSuccess:[\s\S]{0,500}creditReviewOpen\.value = false/)
})

test('agent report opens above the operation Drawer with the originating trigger and deferred cleanup', () => {
  assert.match(source, /import UserAgentReportDrawer/)
  assert.match(source, /import \{ getUserAgentReport \} from/)
  assert.match(source, /id === 'agent-report'/)
  assert.match(source, /getUserAgentReport\(userIdOf\(user\)\)/)
  assert.match(source, /agentReportReturnFocus\.value = trigger/)
  assert.match(source, /agentReportOpen\.value = true/)
  assert.match(source, /try\s*\{[\s\S]*getUserAgentReport[\s\S]*\}\s*catch/)
  assert.match(source, /agentReportError\.value = error instanceof Error \? error\.message/)

  const operationIndex = source.indexOf('<UserOperationDrawer')
  const agentReportIndex = source.indexOf('<UserAgentReportDrawer')
  assert.ok(operationIndex >= 0)
  assert.ok(agentReportIndex > operationIndex)
  assert.match(source, /<UserAgentReportDrawer[\s\S]*:return-focus="agentReportReturnFocus"/)
  assert.match(source, /<UserAgentReportDrawer[\s\S]*@closed="clearAgentReport"/)
  assert.match(source, /const clearAgentReport = \(\) => \{[\s\S]*agentReportData\.value = null[\s\S]*agentReportError\.value = ''/)

  const handlerStart = source.indexOf('const handleOperationDrawerAction')
  const handlerEnd = source.indexOf('const closeOnchainWallet', handlerStart)
  const handler = source.slice(handlerStart, handlerEnd)
  assert.doesNotMatch(handler.match(/if \(id === 'agent-report'\)[\s\S]*?\n  \}/)?.[0] || '', /closeOperationDrawer\(\)/)
})

test('agent subordinate list opens above the operation Drawer and keeps retryable state isolated', () => {
  assert.match(source, /import UserAgentSubordinateDrawer/)
  assert.match(source, /import \{ getUserAgentSubordinates \} from/)
  assert.match(source, /id === 'agent-subordinates'/)
  assert.match(source, /getUserAgentSubordinates\(userIdOf\(user\)\)/)
  assert.match(source, /agentSubordinateReturnFocus\.value = trigger/)
  assert.match(source, /agentSubordinateOpen\.value = true/)
  assert.match(source, /<UserAgentSubordinateDrawer[\s\S]*@retry="loadAgentSubordinates"/)
  assert.match(source, /<UserAgentSubordinateDrawer[\s\S]*:return-focus="agentSubordinateReturnFocus"/)
  assert.match(source, /<UserAgentSubordinateDrawer[\s\S]*@closed="clearAgentSubordinates"/)
  assert.match(source, /const clearAgentSubordinates = \(\) => \{[\s\S]*agentSubordinateRows\.value = \[\][\s\S]*agentSubordinateError\.value = ''/)

  const operationIndex = source.indexOf('<UserOperationDrawer')
  const subordinateIndex = source.indexOf('<UserAgentSubordinateDrawer')
  assert.ok(operationIndex >= 0)
  assert.ok(subordinateIndex > operationIndex)

  const handlerStart = source.indexOf('const handleOperationDrawerAction')
  const handlerEnd = source.indexOf('const closeOnchainWallet', handlerStart)
  const handler = source.slice(handlerStart, handlerEnd)
  assert.doesNotMatch(handler.match(/if \(id === 'agent-subordinates'\)[\s\S]*?\n  \}/)?.[0] || '', /closeOperationDrawer\(\)/)
})
