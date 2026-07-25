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
