// Wallet/assets service implementation; pages import the bound functions from ./wallet.js. The shared mock ledger
// (mock/ledger.js) and walletRecords.js stand in for the server. Valuation is injected (accountValues, priceOf)
// because the site's price snapshot is not Node-importable; tests pass simple stand-ins.
// Validation failures reject with ApiError whose code is the locale key the form already shows.
import {balancesOf, credit, debit} from '../mock/ledger.js'
import {addWalletRecord, walletRecords, walletMode} from '../server/walletRecords.js'
import {ADDRESS_MAX_LENGTH, networksOf, validAddress, withdrawFee} from '../mock/chains.js'
import {ApiError, mockCall, snapshot} from './transport.js'
import {MODE_DEMO} from '../utils/accountMode.js'
import {clock} from '../mock/clock.js'

const SERVICE = 'wallet'
const DEMO = MODE_DEMO
const insufficient = mode => mode === DEMO ? 'assets.withdraw.error.insufficientBalance' : 'assets.ui.insufficientBalanceSwitchToTheDemoAccount'
const positive = value => Number.isFinite(Number(value)) && Number(value) > 0
// 獲得資產 (user request, 2026-11-28): the demo account has no deposit or withdrawal; it claims simulated USDT instead.
export const DEMO_CLAIM = Object.freeze({symbol: 'USDT', amount: 10000, cap: 1000000})

export function createWalletApi({accountValues, priceOf, fundPassword = null}) {
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

  // Withdrawal validation shared by the pre-check and the request: network, address format, amount, fee, balance.
  function validateWithdrawal({mode, coin, network, address, amount}) {
    const cleanAddress = String(address || '').trim(), value = Number(amount)
    if (!networksOf(coin).includes(network)) throw new ApiError('assets.withdraw.error.disabled')
    if (!cleanAddress) throw new ApiError('assets.withdraw.error.addressRequired')
    if (cleanAddress.length > ADDRESS_MAX_LENGTH) throw new ApiError('assets.withdraw.error.addressTooLong', {max: ADDRESS_MAX_LENGTH})
    if (!validAddress(network, cleanAddress)) throw new ApiError('assets.withdraw.error.invalidAddress')
    if (!positive(amount)) throw new ApiError('assets.withdraw.error.amountPositive')
    const fee = withdrawFee(coin, network)
    if (fee > 0 && fee >= value) throw new ApiError('assets.withdraw.error.feeExceedsAmount')
    if (value > (balancesOf(mode)[coin] || 0)) throw new ApiError('assets.withdraw.error.insufficientBalance')
    return {cleanAddress, value, fee}
  }

  /**
   * POST /assets/withdrawals/check — validates the form without locking funds, so the page can ask for the fund
   * password only when the rest is valid. {fundPasswordSet} tells it whether one exists yet.
   */
  const checkWithdrawal = request => mockCall(SERVICE, () => {
    const {value, fee} = validateWithdrawal(request)
    return {amount: value, fee, received: value - fee, fundPasswordSet: fundPassword ? fundPassword.isSet() : true}
  })

  /**
   * POST /assets/withdrawals {mode, coin, network, address, amount, fundPassword} — validates network, address
   * format, amount, balance and (when the site has a fund-password store) the 6-digit fund password, then locks the
   * amount (it leaves the available balance) and records a pending request; nothing is sent.
   * The fee comes from the chain catalogue and is taken out of the amount (received = amount − fee).
   */
  const requestWithdrawal = ({mode, coin, network, address, amount, fundPassword: password = ''}) => mockCall(SERVICE, () => {
    const {cleanAddress, value, fee} = validateWithdrawal({mode, coin, network, address, amount})
    if (fundPassword) {
      if (!fundPassword.isSet()) throw new ApiError('assets.withdraw.error.fundPasswordNotSet')
      if (!/^\d{6}$/.test(String(password))) throw new ApiError('assets.withdraw.error.fundPasswordRequired')
      if (!fundPassword.verify(password)) throw new ApiError('assets.withdraw.error.fundPasswordWrong')
    }
    if (!debit(mode, coin, value)) throw new ApiError('assets.withdraw.error.insufficientBalance')
    const record = addWalletRecord(mode, 'withdraw', {label: 'content.ui.demoWithdrawalRequest', amount: value, symbol: coin, status: 'pending'})
    return {...snapshot(record), network, address: cleanAddress, fee, received: value - fee}
  })

  /** POST /assets/deposit-vouchers {mode, coin, network, amount, txHash, fileName} — a pending voucher: {voucherId, record}. */
  const submitDepositVoucher = ({mode, coin, amount, txHash = '', fileName}) => mockCall(SERVICE, () => {
    if (!positive(amount)) throw new ApiError('deposit.voucher.amountTooSmall')
    if (String(txHash).trim().length > 128) throw new ApiError('deposit.voucher.txHashTooLong')
    if (!fileName) throw new ApiError('deposit.voucher.screenshotRequired')
    const record = addWalletRecord(mode, 'deposit', {label: 'content.ui.demoDepositRequest', amount, symbol: coin, status: 'pending'})
    return {voucherId: 'DV' + clock.now().toString(36).toUpperCase(), record: snapshot(record)}
  })

  /** POST /assets/demo-claim {mode} — demo only: credits DEMO_CLAIM.amount USDT, refused once the balance reaches the cap. */
  const claimDemoFunds = ({mode}) => mockCall(SERVICE, () => {
    if (mode !== DEMO) throw new ApiError('assets.demoClaim.demoOnly')
    const {symbol, amount, cap} = DEMO_CLAIM
    if ((balancesOf(mode)[symbol] || 0) + amount > cap) throw new ApiError('assets.demoClaim.capReached', {cap: cap.toLocaleString('en-US'), symbol})
    credit(mode, symbol, amount)
    const record = addWalletRecord(mode, 'deposit', {label: 'assets.demoClaim.recordLabel', amount, symbol})
    return {amount, symbol, record: snapshot(record)}
  })

  /**
   * POST /assets/spend {mode, kind: 'donate', symbol, amount, min, max} — debits the ledger once;
   * Rejects with the amount-form locale keys (params for the minimum). (閃兌 is flashExchange below.)
   */
  const spendFunds = ({mode, kind, symbol = 'USDT', amount, min = 0.01, max = 500000}) => mockCall(SERVICE, () => {
    const value = Number(amount)
    if (!Number.isFinite(value) || value < min) throw new ApiError('overlay.amountMinimum', {amount: min})
    if (value > max) throw new ApiError('trade.spotErrorAboveMaxNotional')
    if (value > (balancesOf(mode)[symbol] || 0) || !debit(mode, symbol, value)) {
      throw new ApiError(mode === DEMO ? 'assets.withdraw.error.insufficientBalance' : 'overlay.ui.insufficientBalanceSwitchToDemoToTryThisLocally')
    }
    return {amount: value}
  })

  // 閃兌 (flash exchange): instant conversion between the funding wallet's assets at the server's USDT price
  // snapshot (rate = price(from) / price(to)), no fee. The quote is informational; the exchange re-prices on the server.
  const FLASH_ASSETS = ['USDT', 'USDC', 'BTC', 'ETH', 'SOL']
  const DECIMALS = {USDT: 2, USDC: 2, BTC: 8, ETH: 8, SOL: 6}
  const floorTo = (value, asset) => Math.floor(value * 10 ** DECIMALS[asset]) / 10 ** DECIMALS[asset]
  function flashRate(from, to) {
    if (!FLASH_ASSETS.includes(from) || !FLASH_ASSETS.includes(to)) throw new ApiError('assets.convert.error.generic')
    if (from === to) throw new ApiError('assets.convert.sameAsset')
    const fromPrice = priceOf(from), toPrice = priceOf(to)
    if (!(fromPrice > 0) || !(toPrice > 0)) throw new ApiError('assets.convert.error.generic')
    return fromPrice / toPrice
  }

  /** GET /assets/flash-exchange/assets?mode= — exchangeable assets with the mode's available balance. */
  const listFlashAssets = mode => mockCall(SERVICE, () => FLASH_ASSETS.map(asset => ({asset, available: balancesOf(mode)[asset] || 0})))

  /** GET /assets/flash-exchange/quote?from=&to=&amount= — {rate, receive}; amount is optional. */
  const quoteFlashExchange = ({from, to, amount = 0}) => mockCall(SERVICE, () => {
    const rate = flashRate(from, to)
    return {rate, receive: positive(amount) ? floorTo(Number(amount) * rate, to) : 0}
  })

  /** POST /assets/flash-exchange {mode, from, to, amount} — debits `from`, credits `to` at the current rate, records it. */
  const flashExchange = ({mode, from, to, amount}) => mockCall(SERVICE, () => {
    const rate = flashRate(from, to), value = Number(amount)
    if (!positive(amount)) throw new ApiError('assets.convert.amountRequired')
    const receive = floorTo(value * rate, to)
    if (!(receive > 0)) throw new ApiError('assets.convert.amountTooSmall')
    if (value > (balancesOf(mode)[from] || 0)) throw new ApiError('assets.convert.amountExceeds')
    if (!debit(mode, from, value)) throw new ApiError('assets.convert.amountExceeds')
    credit(mode, to, receive)
    addWalletRecord(mode, 'exchange', {label: {key: 'assets.convert.recordLabel', params: {from, to, receive: String(receive)}}, amount: value, symbol: from})
    return {from, to, amount: value, receive, rate}
  })

  return {getAssetsOverview, listWalletRecords, transferFunds, checkWithdrawal, requestWithdrawal, submitDepositVoucher, claimDemoFunds, spendFunds, listFlashAssets, quoteFlashExchange, flashExchange}
}
