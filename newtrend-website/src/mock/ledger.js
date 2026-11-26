import {reactive} from 'vue'
// Per-mode, per-asset mock wallet: the only place balances live. Every domain moves money through
// debit/credit so the Assets page, forms and summaries agree. In memory only; resets on reload.
export const DEMO_FUNDS = Object.freeze({USDT: 100000, USDC: 100000, BTC: 2, ETH: 30, SOL: 500})
export const ledger = reactive({real: {}, demo: {...DEMO_FUNDS}})

/** Accepts the session mode key ('common.demo.demo' / 'common.demo.real') or 'demo' / 'real'. */
export const modeKey = mode => mode === 'demo' || mode === 'common.demo.demo' ? 'demo' : 'real'
const round = value => Math.round(value * 1e8) / 1e8

export const balanceOf = (mode, asset) => ledger[modeKey(mode)][asset] || 0
export const balancesOf = mode => ledger[modeKey(mode)]

/** Removes funds; returns false (and changes nothing) when the amount is invalid or not covered. */
export function debit(mode, asset, amount) {
  const value = Number(amount)
  if (!Number.isFinite(value) || value < 0 || value > balanceOf(mode, asset) + 1e-9) return false
  ledger[modeKey(mode)][asset] = round(balanceOf(mode, asset) - value)
  return true
}
export function credit(mode, asset, amount) {
  const value = Number(amount)
  if (!Number.isFinite(value) || value < 0) return false
  ledger[modeKey(mode)][asset] = round(balanceOf(mode, asset) + value)
  return true
}
/** Adapter for single-asset domain functions (Quant Fund, strategies). */
export const walletFor = asset => ({
  balance: mode => balanceOf(mode, asset),
  debit: (mode, amount) => debit(mode, asset, amount),
  credit: (mode, amount) => credit(mode, asset, amount),
})
/** Test hook. */
export function resetLedger() {
  ledger.real = {}
  ledger.demo = {...DEMO_FUNDS}
}

/** `{real, demo}` accessor object over one asset, for domain accounts that store per-mode balances. */
export function boundBalances(asset) {
  return {
    get real() { return balanceOf('real', asset) }, set real(value) { ledger.real[asset] = round(value) },
    get demo() { return balanceOf('demo', asset) }, set demo(value) { ledger.demo[asset] = round(value) },
  }
}
/** Defines `account.balance` as a live view of one mode/asset in the ledger (for single-mode accounts). */
export function bindBalance(account, mode, asset) {
  Object.defineProperty(account, 'balance', {
    enumerable: true, configurable: true,
    get: () => balanceOf(mode, asset), set: value => { ledger[modeKey(mode)][asset] = round(value) },
  })
  return account
}
