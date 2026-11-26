import test from 'node:test'
import assert from 'node:assert/strict'
import {configureMock} from '../src/api/transport.js'
import {createWalletApi} from '../src/api/walletService.js'
import {balanceOf, balancesOf} from '../src/mock/ledger.js'

const DEMO = 'common.demo.demo', REAL = 'common.demo.real'
const prices = {BTC: 50000, USDT: 1}
const api = createWalletApi({accountValues: mode => ({'assets.tabs.funding': balancesOf(mode).USDT || 0, 'assets.tabs.trading': 10}), priceOf: symbol => prices[symbol] || 0})

test('overview totals account values and returns requested prices', async () => {
  const overview = await api.getAssetsOverview(DEMO, ['BTC', 'XRP'])
  assert.equal(overview.total, balanceOf(DEMO, 'USDT') + 10)
  assert.deepEqual(overview.prices, {BTC: 50000, XRP: 0})
  overview.balances.USDT = -1
  assert.notEqual(balanceOf(DEMO, 'USDT'), -1, 'snapshot')
})

test('transfer validates and records per mode without moving funds', async () => {
  await assert.rejects(api.transferFunds({mode: DEMO, from: 'a', to: 'a', currency: 'USDT', amount: 1}), {code: 'assets.ui.chooseDifferentSourceAndDestinationAccounts'})
  await assert.rejects(api.transferFunds({mode: DEMO, from: 'a', to: 'b', currency: 'USDT', amount: 0}), {code: 'aiQuant.quantFund.subscribe.errorAmountInvalid'})
  await assert.rejects(api.transferFunds({mode: REAL, from: 'a', to: 'b', currency: 'USDT', amount: 1}), {code: 'assets.ui.insufficientBalanceSwitchToTheDemoAccount'})
  await assert.rejects(api.transferFunds({mode: DEMO, from: 'assets.tabs.trading', to: 'assets.tabs.funding', currency: 'BTC', amount: 1}), {code: 'assets.withdraw.error.insufficientBalance'}, 'trading holds USDT only')
  await api.transferFunds({mode: DEMO, from: 'assets.tabs.trading', to: 'assets.tabs.funding', currency: 'USDT', amount: 10, labels: {}})
  const before = balanceOf(DEMO, 'USDT')
  await api.transferFunds({mode: DEMO, from: 'a', to: 'b', currency: 'USDT', amount: 5, labels: {from: 'A', to: 'B'}})
  assert.equal(balanceOf(DEMO, 'USDT'), before)
  assert.equal((await api.listWalletRecords(DEMO))[0].kind, 'transfer')
  assert.equal((await api.listWalletRecords(REAL)).length, 0)
})

test('withdrawal and deposit voucher stay pending and validate inputs', async () => {
  const ethAddress = '0x' + 'a'.repeat(40)
  await assert.rejects(api.requestWithdrawal({mode: DEMO, coin: 'USDT', network: 'ETH', address: ' ', amount: 1}), {code: 'assets.withdraw.error.addressRequired'})
  await assert.rejects(api.requestWithdrawal({mode: DEMO, coin: 'USDT', network: 'ETH', address: 'demo', amount: 1}), {code: 'assets.withdraw.error.invalidAddress'})
  await assert.rejects(api.requestWithdrawal({mode: DEMO, coin: 'BTC', network: 'ETH', address: ethAddress, amount: 1}), {code: 'assets.withdraw.error.disabled'})
  await assert.rejects(api.requestWithdrawal({mode: REAL, coin: 'USDT', network: 'ETH', address: ethAddress, amount: 1}), {code: 'assets.withdraw.error.insufficientBalance'})
  const before = balanceOf(DEMO, 'USDT')
  const withdrawal = await api.requestWithdrawal({mode: DEMO, coin: 'USDT', network: 'ETH', address: ethAddress, amount: 3})
  assert.equal(withdrawal.status, 'pending')
  assert.equal(withdrawal.received, 3)
  assert.equal(balanceOf(DEMO, 'USDT'), before - 3, 'the requested amount is locked')
  await assert.rejects(api.submitDepositVoucher({mode: DEMO, coin: 'USDT', amount: 1}), {code: 'deposit.voucher.screenshotRequired'})
  await assert.rejects(api.submitDepositVoucher({mode: DEMO, coin: 'USDT', amount: 1, txHash: 'x'.repeat(129), fileName: 'a.png'}), {code: 'deposit.voucher.txHashTooLong'})
  const {voucherId, record} = await api.submitDepositVoucher({mode: DEMO, coin: 'USDT', amount: 1, fileName: 'a.png'})
  assert.match(voucherId, /^DV/)
  assert.equal(record.kind, 'deposit')
})

test('donate debits once; limits use locale codes', async () => {
  const usdt = balanceOf(DEMO, 'USDT'), usdc = balanceOf(DEMO, 'USDC')
  await api.spendFunds({mode: DEMO, kind: 'donate', amount: 50, min: 1})
  assert.equal(balanceOf(DEMO, 'USDT'), usdt - 50)
  assert.equal(balanceOf(DEMO, 'USDC'), usdc, 'donate credits nothing')
  await assert.rejects(api.spendFunds({mode: DEMO, kind: 'donate', amount: 0.5, min: 1}), {code: 'overlay.amountMinimum'})
  await assert.rejects(api.spendFunds({mode: REAL, kind: 'donate', amount: 5}), {code: 'overlay.ui.insufficientBalanceSwitchToDemoToTryThisLocally'})
})

test('flash exchange converts at the price ratio, records once and validates', async () => {
  const assets = await api.listFlashAssets(DEMO)
  assert.deepEqual(assets.map(a => a.asset), ['USDT', 'USDC', 'BTC', 'ETH', 'SOL'])
  const quote = await api.quoteFlashExchange({from: 'BTC', to: 'USDT', amount: 0.01})
  assert.equal(quote.rate, 50000)
  assert.equal(quote.receive, 500)
  assert.equal((await api.quoteFlashExchange({from: 'USDT', to: 'BTC', amount: 1000})).receive, 0.02)
  const btc = balanceOf(DEMO, 'BTC'), usdt = balanceOf(DEMO, 'USDT'), records = (await api.listWalletRecords(DEMO)).length
  const done = await api.flashExchange({mode: DEMO, from: 'BTC', to: 'USDT', amount: 0.01})
  assert.equal(done.receive, 500)
  assert.ok(Math.abs(balanceOf(DEMO, 'BTC') - (btc - 0.01)) < 1e-12)
  assert.equal(balanceOf(DEMO, 'USDT'), usdt + 500)
  const list = await api.listWalletRecords(DEMO)
  assert.equal(list.length, records + 1)
  assert.equal(list[0].kind, 'exchange')
  await assert.rejects(api.flashExchange({mode: DEMO, from: 'BTC', to: 'BTC', amount: 1}), {code: 'assets.convert.sameAsset'})
  await assert.rejects(api.flashExchange({mode: DEMO, from: 'BTC', to: 'USDT', amount: 0}), {code: 'assets.convert.amountRequired'})
  await assert.rejects(api.flashExchange({mode: DEMO, from: 'BTC', to: 'USDT', amount: 1e6}), {code: 'assets.convert.amountExceeds'})
  await assert.rejects(api.flashExchange({mode: REAL, from: 'USDT', to: 'BTC', amount: 10}), {code: 'assets.convert.amountExceeds'})
  await assert.rejects(api.flashExchange({mode: DEMO, from: 'USDT', to: 'BTC', amount: 0.0000001}), {code: 'assets.convert.amountTooSmall'})
})

test('injected outage rejects with network', async () => {
  const previous = configureMock({fail: ['wallet']})
  try { await assert.rejects(api.listWalletRecords(DEMO), {code: 'network'}) } finally { configureMock(previous) }
})

test('withdrawal with a fund-password store: pre-check locks nothing, request needs the right password', async () => {
  const {createFundPasswordStore} = await import('../src/api/fundPasswordStore.js')
  const {createProfileApi} = await import('../src/api/profileService.js')
  const fundPassword = createFundPasswordStore()
  const wallet = createWalletApi({accountValues: () => ({}), priceOf: () => 1, fundPassword})
  const profile = createProfileApi({fundPassword})
  const ethAddress = '0x' + 'a'.repeat(40)
  const request = {mode: DEMO, coin: 'USDT', network: 'ETH', address: ethAddress, amount: 2}
  const before = balanceOf(DEMO, 'USDT')
  const check = await wallet.checkWithdrawal(request)
  assert.equal(check.fundPasswordSet, false)
  assert.equal(balanceOf(DEMO, 'USDT'), before, 'pre-check locks nothing')
  await assert.rejects(wallet.checkWithdrawal({...request, address: 'x'}), {code: 'assets.withdraw.error.invalidAddress'})
  await assert.rejects(wallet.requestWithdrawal({...request, fundPassword: '123456'}), {code: 'assets.withdraw.error.fundPasswordNotSet'})

  await assert.rejects(profile.saveFundPassword({password: '12345', confirm: '12345'}), {code: 'profile.center.fundPassword.sixDigits'})
  await assert.rejects(profile.saveFundPassword({password: '135790', confirm: '135791'}), {code: 'profile.center.fundPassword.mismatch'})
  assert.deepEqual(await profile.saveFundPassword({password: '135790', confirm: '135790'}), {set: true, changed: false})
  assert.equal((await profile.getFundPassword()).set, true)
  assert.equal((await wallet.checkWithdrawal(request)).fundPasswordSet, true)

  await assert.rejects(wallet.requestWithdrawal({...request, fundPassword: ''}), {code: 'assets.withdraw.error.fundPasswordRequired'})
  await assert.rejects(wallet.requestWithdrawal({...request, fundPassword: '000000'}), {code: 'assets.withdraw.error.fundPasswordWrong'})
  assert.equal(balanceOf(DEMO, 'USDT'), before, 'a rejected password locks nothing')
  const done = await wallet.requestWithdrawal({...request, fundPassword: '135790'})
  assert.equal(done.status, 'pending')
  assert.equal(balanceOf(DEMO, 'USDT'), before - 2)

  await assert.rejects(profile.saveFundPassword({password: '246800', confirm: '246800'}), {code: 'profile.center.fundPassword.oldRequired'})
  await assert.rejects(profile.saveFundPassword({oldPassword: '111111', password: '246800', confirm: '246800'}), {code: 'profile.center.fundPassword.oldWrong'})
  await assert.rejects(profile.saveFundPassword({oldPassword: '135790', password: '135790', confirm: '135790'}), {code: 'profile.center.fundPassword.sameAsOld'})
  assert.equal((await profile.saveFundPassword({oldPassword: '135790', password: '246800', confirm: '246800'})).changed, true)
  await assert.rejects(wallet.requestWithdrawal({...request, fundPassword: '135790'}), {code: 'assets.withdraw.error.fundPasswordWrong'})
})
