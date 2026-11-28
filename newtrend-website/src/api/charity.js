// 公益 service for the public charity channel. Data comes from the shared charity module (src/shared/charity, via
// platform/charity.js), managed in the admin 公益 → 公益项目 / 频道统计. The module runs in this page's memory (static
// mock, user decision 2026-11-28): nothing is persisted, and admin edits in another page or for another viewer do not
// reach this one. Real cross-user publishing needs a backend behind these functions.
import {charityService, checkDonation, publicCharity, userDonations} from '../platform/charity.js'
import {isDemo} from '../utils/accountMode.js'
import {ApiError, mockCall, snapshot} from './transport.js'
import {spendFunds} from './wallet.js'

const SERVICE = 'charity'
/** The signed-in 真實 account's user id in the shared mock (same demo user as the admin ledger). */
export const CHARITY_USER = 'USR-DEMO'
const state = () => charityService().read()

/** GET /charity — listed campaigns (sort weight, larger first) in the request language, and the channel totals. */
export const getCharity = locale => mockCall(SERVICE, () => snapshot(publicCharity(state(), locale)))

/** GET /charity/donations — the signed-in user's 真實 donations, newest first. 模擬 donations are not recorded. */
export const listMyDonations = (mode, locale) => mockCall(SERVICE, () => snapshot(isDemo(mode) ? [] : userDonations(state(), CHARITY_USER, locale)))

// Domain codes → locale keys (the amount form shows them as toasts).
function donationError(code, project) {
  if (code === 'donationMin') return new ApiError('overlay.amountMinimum', {amount: project?.minDonation})
  if (code === 'donationMax') return new ApiError('charity.donate.errors.maxAmount', {amount: project?.maxDonation?.toLocaleString('en-US'), asset: 'USDT'})
  return new ApiError('charity.donate.errors.CHARITY_PROJECT_NOT_AVAILABLE')
}

/**
 * POST /charity/donations {mode, projectId, amount} — checks the campaign (listed, inside its limits), debits the
 * Funding ledger once, then records a completed donation so raised and progress update. 模擬 only debits the demo
 * ledger: simulated money never counts toward a campaign.
 */
export async function donate({mode, projectId, amount}) {
  const project = await mockCall(SERVICE, () => {
    const s = state()
    try { return snapshot(checkDonation(s, {projectId, amount})) } catch (e) { throw donationError(e.message, s.projects.find(p => p.projectId === projectId)) }
  })
  await spendFunds({mode, kind: 'donate', symbol: 'USDT', amount, min: project.minDonation, max: project.maxDonation})
  if (isDemo(mode)) return {amount: Number(amount)}
  try {
    const s = charityService().command('donate', {projectId, amount: Number(amount), userId: CHARITY_USER, requestId: crypto.randomUUID()})
    return snapshot({amount: Number(amount), donation: s.donations[0]})
  } catch (e) { throw donationError(e.message, project) }
}
