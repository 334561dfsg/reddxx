import test from 'node:test'
import assert from 'node:assert/strict'
import {DEMO_RESET_CODE, MAX_CODE_ATTEMPTS, RESEND_COOLDOWN, RESET_CODE_TTL, createPasswordResetApi, decoyMaskedEmail, maskEmail} from '../src/api/passwordResetService.js'

const setup = () => { let time = 1e12; const api = createPasswordResetApi({now: () => time}); return {api, advance: ms => { time += ms }} }
const reset = (api, ticket, code = DEMO_RESET_CODE) => api.resetPassword({ticket, code, password: 'secret1', confirm: 'secret1'})

test('email, phone and username all send the code to the bound email, masked', async () => {
  const {api} = setup()
  assert.equal(maskEmail('demo.trader@newquant.test'), 'de***@newquant.test')
  assert.equal(maskEmail('ab@x.io'), 'a***@x.io')
  assert.equal((await api.requestResetCode({method: 'email', identifier: 'Demo.Trader@newquant.test'})).maskedEmail, 'de***@newquant.test')
  assert.equal((await api.requestResetCode({method: 'phone', dial: '+886', identifier: '912 345 678'})).maskedEmail, 'al***@newquant.test')
  const byName = await api.requestResetCode({method: 'username', identifier: 'demo_trader'})
  assert.equal(byName.maskedEmail, 'de***@newquant.test', 'username shares the account with the email above but has its own cooldown key')
  assert.equal(byName.resendIn, RESEND_COOLDOWN / 1000)
})

test('validation, missing bound email, unknown accounts and the resend cooldown', async () => {
  const {api, advance} = setup()
  await assert.rejects(api.requestResetCode({method: 'email', identifier: ' '}), {code: 'auth.enterEmail'})
  await assert.rejects(api.requestResetCode({method: 'email', identifier: 'nope'}), {code: 'profile.bindEmailPage.invalidEmail'})
  await assert.rejects(api.requestResetCode({method: 'phone', dial: '+1', identifier: '12a'}), {code: 'auth.reset.invalidPhone'})
  await assert.rejects(api.requestResetCode({method: 'username', identifier: 'nomail'}), {code: 'auth.reset.noBoundEmail'})
  await assert.rejects(api.requestResetCode({method: 'phone', dial: '+852', identifier: '61234567'}), {code: 'auth.reset.noBoundEmail'})
  const unknown = await api.requestResetCode({method: 'username', identifier: 'ghost'})
  assert.match(unknown.maskedEmail, /^[a-z]{2}\*\*\*@[a-z]+\.com$/, 'unknown accounts get a decoy masked address')
  assert.equal(unknown.maskedEmail, decoyMaskedEmail('username:ghost'), 'the decoy is stable for the same input')
  await assert.rejects(reset(api, unknown.ticket), {code: 'auth.reset.invalidCode'}, 'no code works for an unknown account')
  await api.requestResetCode({method: 'username', identifier: 'alice'})
  advance(20000)
  await assert.rejects(api.requestResetCode({method: 'username', identifier: 'ALICE'}), {code: 'auth.reset.tooSoon', params: {count: 40}})
  advance(40000)
  assert.ok((await api.requestResetCode({method: 'username', identifier: 'alice'})).ticket)
})

test('reset checks passwords, then the code; resend replaces the ticket; attempts and expiry are enforced', async () => {
  const {api, advance} = setup()
  const first = await api.requestResetCode({method: 'username', identifier: 'alice'})
  await assert.rejects(api.resetPassword({ticket: first.ticket, code: DEMO_RESET_CODE, password: '123', confirm: '123'}), {code: 'auth.ui.demoPasswordNeedsAtLeast6Characters'})
  await assert.rejects(api.resetPassword({ticket: first.ticket, code: DEMO_RESET_CODE, password: 'secret1', confirm: 'secret2'}), {code: 'auth.reset.mismatch'})
  await assert.rejects(reset(api, first.ticket, '12'), {code: 'auth.reset.codeFormat'})
  advance(RESEND_COOLDOWN)
  const second = await api.requestResetCode({method: 'username', identifier: 'alice'})
  await assert.rejects(reset(api, first.ticket), {code: 'auth.reset.codeExpired'}, 'a resend voids the old ticket')
  for (let i = 1; i < MAX_CODE_ATTEMPTS; i++) await assert.rejects(reset(api, second.ticket, '000000'), {code: 'auth.reset.invalidCode'})
  await assert.rejects(reset(api, second.ticket, '000000'), {code: 'auth.reset.tooManyAttempts'})
  await assert.rejects(reset(api, second.ticket), {code: 'auth.reset.tooManyAttempts'}, 'locked even with the right code')
  advance(RESEND_COOLDOWN)
  const third = await api.requestResetCode({method: 'username', identifier: 'alice'})
  assert.deepEqual(await reset(api, third.ticket), {done: true})
  assert.equal(api.passwordOf('U1002'), 'secret1')
  await assert.rejects(reset(api, third.ticket), {code: 'auth.reset.codeExpired'}, 'a ticket works once')
  advance(RESEND_COOLDOWN)
  const late = await api.requestResetCode({method: 'username', identifier: 'alice'})
  advance(RESET_CODE_TTL)
  await assert.rejects(reset(api, late.ticket), {code: 'auth.reset.codeExpired'})
})
