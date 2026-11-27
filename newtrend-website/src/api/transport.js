// Simulated network boundary for the prototype. Every src/api/* service goes through mockCall(), so pages
// see the same async shape a real HTTP API will have: latency, a JSON snapshot (no shared mutable state)
// and coded failures. Replacing this file's internals with fetch() must not require page changes.
//
// Browser controls (read once from the URL at load, survive in-app navigation, never persisted):
//   ?mock-delay=0        no latency;  ?mock-delay=1500  fixed 1.5s
//   ?mock-fail=earn      every call of that service fails with code 'network' (comma list; 'all' for every service)
// Node tests run without latency unless configureMock() says otherwise.

/** Coded API failure. `code` maps to a locale key in the calling module; `params` carries interpolation values. */
export class ApiError extends Error {
  constructor(code, params = {}) {
    super(code)
    this.name = 'ApiError'
    this.code = code
    this.params = params
  }
}

/**
 * Locale key for any API failure (review 2026-11-27: one mapper instead of one per module). Codes that already are
 * locale keys (namespace + dotted path) pass through; 'network' and unknown codes become `fallback`. With
 * `prefix`, only keys in that namespace pass through.
 */
export function errorKey(error, {prefix = '', fallback = 'common.requestFailed'} = {}) {
  const code = String(error?.code || '')
  if (code === 'network' || !/^[a-z]\w*\.[\w.]+$/i.test(code)) return fallback
  return prefix && !code.startsWith(prefix) ? fallback : code
}

const browser = typeof window !== 'undefined' && typeof location !== 'undefined'
const config = {delay: browser ? [300, 800] : 0, fail: new Set()}

if (browser) {
  const query = new URLSearchParams(location.search)
  const delay = query.get('mock-delay')
  if (delay !== null && Number.isFinite(Number(delay)) && Number(delay) >= 0) config.delay = Number(delay)
  for (const name of (query.get('mock-fail') || '').split(',')) if (name.trim()) config.fail.add(name.trim())
}

/** Test/dev hook: {delay: ms | [min,max], fail: ['earn']}. Returns the previous config for restoring. */
export function configureMock({delay, fail} = {}) {
  const previous = {delay: config.delay, fail: [...config.fail]}
  if (delay !== undefined) config.delay = delay
  if (fail !== undefined) config.fail = new Set(fail)
  return previous
}

const latency = () => Array.isArray(config.delay)
  ? config.delay[0] + Math.random() * (config.delay[1] - config.delay[0])
  : config.delay
const sleep = ms => ms > 0 ? new Promise(resolve => setTimeout(resolve, ms)) : Promise.resolve()

/** JSON round trip, as an HTTP response would be: callers can never mutate mock state through a result. */
export const snapshot = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value))

/**
 * Runs `handler` behind simulated latency. Thrown errors become ApiError (keeping `code` and `amount`-style
 * fields as params); the resolved value is whatever the handler returns — use snapshot() for state.
 */
export async function mockCall(service, handler) {
  await sleep(latency())
  if (config.fail.has(service) || config.fail.has('all')) throw new ApiError('network')
  try {
    return await handler()
  } catch (error) {
    if (error instanceof ApiError) throw error
    const {code, error: legacyCode, message, ...params} = error || {}
    throw new ApiError(code || legacyCode || message || 'unknown', params)
  }
}
