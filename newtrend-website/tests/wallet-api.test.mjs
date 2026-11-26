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
  await assert.rejects(api.requestWithdrawal({mode: DEMO, coin: 'USDT', address: ' ', amount: 1}), {code: 'assets.withdraw.error.addressRequired'})
  const withdrawal = await api.requestWithdrawal({mode: DEMO, coin: 'USDT', address: 'demo', amount: 3})
  assert.equal(withdrawal.status, 'pending')
  await assert.rejects(api.submitDepositVoucher({mode: DEMO, coin: 'USDT', amount: 1}), {code: 'deposit.voucher.screenshotRequired'})
  await assert.rejects(api.submitDepositVoucher({mode: DEMO, coin: 'USDT', amount: 1, txHash: 'x'.repeat(129), fileName: 'a.png'}), {code: 'deposit.voucher.txHashTooLong'})
  const {voucherId, record} = await api.submitDepositVoucher({mode: DEMO, coin: 'USDT', amount: 1, fileName: 'a.png'})
  assert.match(voucherId, /^DV/)
  assert.equal(record.kind, 'deposit')
})

test('convert debits once and credits USDC; donate only debits; limits use locale codes', async () => {
  const usdt = balanceOf(DEMO, 'USDT'), usdc = balanceOf(DEMO, 'USDC')
  await api.spendFunds({mode: DEMO, kind: 'convert', amount: 100, min: 1})
  assert.equal(balanceOf(DEMO, 'USDT'), usdt - 100)
  assert.equal(balanceOf(DEMO, 'USDC'), usdc + 100)
  await api.spendFunds({mode: DEMO, kind: 'donate', amount: 50, min: 1})
  assert.equal(balanceOf(DEMO, 'USDC'), usdc + 100)
  await assert.rejects(api.spendFunds({mode: DEMO, kind: 'convert', amount: 0.5, min: 1}), {code: 'overlay.amountMinimum'})
  await assert.rejects(api.spendFunds({mode: REAL, kind: 'donate', amount: 5}), {code: 'overlay.ui.insufficientBalanceSwitchToDemoToTryThisLocally'})
})

test('injected outage rejects with network', async () => {
  const previous = configureMock({fail: ['wallet']})
  try { await assert.rejects(api.listWalletRecords(DEMO), {code: 'network'}) } finally { configureMock(previous) }
})
