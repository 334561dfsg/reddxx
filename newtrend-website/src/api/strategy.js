// AI strategy service. Pages call only these async functions.
// - 真實: the strategy Mock running in this page (static seed data, same domain as the admin);
//   every read fetches it again, so admin review, force stop and generated daily P&L appear on the next read/poll.
// - 模擬: the local demo account in strategyPortfolio.js.
// Both go through mockCall() so latency and ?mock-fail=strategy apply to either mode.
import {strategyCatalog, strategyAccountFor, subscribeFor, changeStatusFor, refreshStrategies} from '../strategyPortfolio.js'
import {refreshStrategy, strategyError} from '../platform/strategyClient.js'
import {ApiError, mockCall, snapshot} from './transport.js'

const SERVICE = 'strategy'
const isReal = mode => mode !== 'common.demo.demo'

/**
 * Pulls the server state; the shared client keeps failures in strategyError instead of throwing. Concurrent callers
 * share one fetch: the client discards all but its newest refresh, so separate overlapping refreshes could let an
 * earlier caller read the state before any response had been applied.
 */
let pending = null
async function syncServer() {
  pending ||= refreshStrategy().finally(() => { pending = null })
  await pending
  if (strategyError.value) throw new ApiError(strategyError.value)
}
async function account(mode) {
  if (isReal(mode)) await syncServer()
  else refreshStrategies()
  return strategyAccountFor(mode)
}

/** GET /strategy/templates — listed templates in admin order. */
export const listStrategyTemplates = () => mockCall(SERVICE, async () => {
  await syncServer()
  return snapshot(strategyCatalog.value)
})

/** GET /strategy/subscriptions?mode= — {balance, records} with each record's daily stats; expired demo runs settle first. */
export const getMyStrategies = mode => mockCall(SERVICE, async () => snapshot(await account(mode)))

/** POST /strategy/subscriptions — 真實: pending review or initialising per admin policy; 模擬: runs locally. Server codes reject as ApiError. */
export const subscribeStrategy = ({mode, product, draft, requestId}) => mockCall(SERVICE, async () => {
  const record = await subscribeFor(mode, product, draft, requestId)
  return snapshot(record ?? null)
})

/** POST /strategy/subscriptions/:id/{pause|resume|stop}. */
export const changeStrategyStatus = ({mode, record, kind}) => mockCall(SERVICE, async () => {
  const result = await changeStatusFor(mode, record, kind)
  if (result?.error) throw new ApiError(result.error)
  return true
})
