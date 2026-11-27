import {reactive} from 'vue'
// Per-mode, per-asset mock wallet: the only place balances live. Every domain moves money through
// debit/credit so the Assets page, forms and summaries agree. In memory only; resets on reload.
export const DEMO_FUNDS = Object.freeze({USDT: 100000, USDC: 100000, BTC: 2, ETH: 30, SOL: 500})
export const ledger = reactive({real: {}, demo: {...DEMO_FUNDS}})

import {modeKey} from '../utils/accountMode.js'
/** Accepts the session mode key or 'demo' / 'real' (see utils/accountMode.js). */
export {modeKey}
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
/**
 * Wallet: the one interface domain rules use to move money (review 2026-11-27 — no direct balance writes).
 * `{balance(asset), debit(asset, amount), credit(asset, amount)}` for one account mode; debit returns false and changes
 * nothing when the amount is invalid or not covered. walletOf(mode) is backed by the ledger; memoryWallet() keeps
 * the same guards and rounding over a private map for pure rule tests.
 */
export const walletOf = mode => ({
  balance: asset => balanceOf(mode, asset),
  debit: (asset, amount) => debit(mode, asset, amount),
  credit: (asset, amount) => credit(mode, asset, amount),
})
export function memoryWallet(initial = {}) {
  const map = {...initial}
  const balance = asset => map[asset] || 0
  return {
    balance,
    debit(asset, amount) {
      const value = Number(amount)
      if (!Number.isFinite(value) || value < 0 || value > balance(asset) + 1e-9) return false
      map[asset] = round(balance(asset) - value)
      return true
    },
    credit(asset, amount) {
      const value = Number(amount)
      if (!Number.isFinite(value) || value < 0) return false
      map[asset] = round(balance(asset) + value)
      return true
    },
  }
}
/** Test hook. */
export function resetLedger() {
  ledger.real = {}
  ledger.demo = {...DEMO_FUNDS}
}
