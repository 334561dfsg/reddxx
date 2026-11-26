// Wallet/assets service implementation; pages import the bound functions from ./wallet.js. The shared mock ledger
// (mock/ledger.js) and walletRecords.js stand in for the server. Valuation is injected (accountValues, priceOf)
// because the site's price snapshot is not Node-importable; tests pass simple stand-ins.
// Validation failures reject with ApiError whose code is the locale key the form already shows.
import {balancesOf, credit, debit} from '../mock/ledger.js'
import {addWalletRecord, walletRecords, walletMode} from '../walletRecords.js'
import {ApiError, mockCall, snapshot} from './transport.js'

const SERVICE = 'wallet'
const DEMO = 'common.demo.demo'
const insufficient = mode => mode === DEMO ? 'assets.withdraw.error.insufficientBalance' : 'assets.ui.insufficientBalanceSwitchToTheDemoAccount'
const positive = value => Number.isFinite(Number(value)) && Number(value) > 0

export function createWalletApi({accountValues, priceOf}) {
  /** GET /assets/overview?mode= — {accounts: {accountKey: USDT value}, total, balances, prices: {symbol: USDT price}}. */
  const getAssetsOverview = (mode, symbols = []) => mockCall(SERVICE, () => {
    const accounts = accountValues(mode)
    return {
      accounts: snapshot(accounts),
      total: Object.values(accounts).reduce((sum, value) => sum + value, 0),
      balances: snapshot(balancesOf(mode)),
      prices: Object.fromEntries(symbols.map(symbol => [symbol, priceOf(symbol)])),
    }
  })

  /** GET /assets/records?mode= — deposits, withdrawals and transfers, newest first. */
  const listWalletRecords = mode => mockCall(SERVICE, () => snapshot(walletRecords[walletMode(mode)]))

  /** POST /assets/transfers {mode, from, to, currency, amount} — records an internal transfer between accounts ('assets.tabs.funding' | 'assets.tabs.trading'). */
  const transferFunds = ({mode, from, to, currency, amount, labels}) => mockCall(SERVICE, () => {
    if (from === to) throw new ApiError('assets.ui.chooseDifferentSourceAndDestinationAccounts')
    if (!positive(amount)) throw new ApiError('aiQuant.quantFund.subscribe.errorAmountInvalid')
    // Funding holds every asset; the trading account holds USDT margin only.
    const available = from === 'assets.tabs.trading' ? (currency === 'USDT' ? accountValues(mode)['assets.tabs.trading'] || 0 : 0) : balancesOf(mode)[currency] || 0
    if (Number(amount) > available) throw new ApiError(insufficient(mode))
    return snapshot(addWalletRecord(mode, 'transfer', {label: {key: 'assets.transferRecord', params: labels}, amount, symbol: currency}))
  })

  /** POST /assets/withdrawals {mode, coin, network, address, amount} — a pending request; nothing is sent. */
  const requestWithdrawal = ({mode, coin, address, amount}) => mockCall(SERVICE, () => {
    if (!positive(amount)) throw new ApiError('aiQuant.quantFund.subscribe.errorAmountInvalid')
    if (!String(address || '').trim()) throw new ApiError('assets.withdraw.error.addressRequired')
    return snapshot(addWalletRecord(mode, 'withdraw', {label: 'content.ui.demoWithdrawalRequest', amount, symbol: coin, status: 'pending'}))
  })

  /** POST /assets/deposit-vouchers {mode, coin, network, amount, txHash, fileName} — a pending voucher: {voucherId, record}. */
  const submitDepositVoucher = ({mode, coin, amount, txHash = '', fileName}) => mockCall(SERVICE, () => {
    if (!positive(amount)) throw new ApiError('deposit.voucher.amountTooSmall')
    if (String(txHash).trim().length > 128) throw new ApiError('deposit.voucher.txHashTooLong')
    if (!fileName) throw new ApiError('deposit.voucher.screenshotRequired')
    const record = addWalletRecord(mode, 'deposit', {label: 'content.ui.demoDepositRequest', amount, symbol: coin, status: 'pending'})
    return {voucherId: 'DV' + Date.now().toString(36).toUpperCase(), record: snapshot(record)}
  })

  /**
   * POST /assets/spend {mode, kind: 'convert'|'donate', symbol, amount, min, max} — debits the ledger once;
   * convert also credits USDC 1:1. Rejects with the amount-form locale keys (params for the minimum).
   */
  const spendFunds = ({mode, kind, symbol = 'USDT', amount, min = 0.01, max = 500000}) => mockCall(SERVICE, () => {
    const value = Number(amount)
    if (!Number.isFinite(value) || value < min) throw new ApiError('overlay.amountMinimum', {amount: min})
    if (value > max) throw new ApiError('trade.spotErrorAboveMaxNotional')
    if (value > (balancesOf(mode)[symbol] || 0) || !debit(mode, symbol, value)) {
      throw new ApiError(mode === DEMO ? 'assets.withdraw.error.insufficientBalance' : 'overlay.ui.insufficientBalanceSwitchToDemoToTryThisLocally')
    }
    if (kind === 'convert') credit(mode, 'USDC', value)
    return {amount: value}
  })

  return {getAssetsOverview, listWalletRecords, transferFunds, requestWithdrawal, submitDepositVoucher, spendFunds}
}
