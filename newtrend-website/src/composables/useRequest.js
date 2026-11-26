import {computed, getCurrentScope, onScopeDispose, shallowRef, watch} from 'vue'

// Request state for src/api/* calls.
//
// useRequest(fetcher, {key, tags}) — loads on creation and whenever `key` (a watch source) changes.
//   status: 'loading' (no data yet) | 'error' (no data, last attempt failed) | 'ready'.
//   A key change drops the old data (it belongs to another mode/id) and shows 'loading' again; a tag
//   invalidation or refresh() keeps the current data on screen and only sets `refreshing`.
//   Out-of-order responses are ignored; nothing is written after the owning scope is disposed.
//   poll: ms — background refresh on that interval while data is shown (skipped while a request is in flight or
//   the tab is hidden), for server state others change (admin review, generated P&L).
// useMutation(action) — one call at a time; a repeat while pending resolves to undefined without calling.
// invalidate(tag) — refreshes every live request that declared that tag (e.g. after a subscription).
// invalidateAll() — refreshes every live tagged request once.

const listeners = new Map()

export function invalidate(tag) {
  for (const refresh of listeners.get(tag) || []) refresh()
}

/** Refreshes every live tagged request (the personal centre's "clear cache"). Each refresh runs once. */
export function invalidateAll() {
  for (const refresh of new Set([...listeners.values()].flatMap(set => [...set]))) refresh()
}

function subscribe(tags, refresh) {
  for (const tag of tags) {
    if (!listeners.has(tag)) listeners.set(tag, new Set())
    listeners.get(tag).add(refresh)
  }
  return () => tags.forEach(tag => listeners.get(tag)?.delete(refresh))
}

export function useRequest(fetcher, {key, tags = [], immediate = true, poll = 0} = {}) {
  const data = shallowRef(null), error = shallowRef(null)
  const loading = shallowRef(immediate), refreshing = shallowRef(false)
  let sequence = 0, alive = true, inFlight = 0

  async function run({reset = false} = {}) {
    const id = ++sequence
    inFlight++
    if (reset) data.value = null
    error.value = null
    if (data.value === null) loading.value = true
    else refreshing.value = true
    try {
      const result = await fetcher()
      if (alive && id === sequence) data.value = result
    } catch (cause) {
      if (alive && id === sequence) error.value = cause
    } finally {
      inFlight--
      if (alive && id === sequence) loading.value = refreshing.value = false
    }
  }
  const refresh = () => run()

  if (key) watch(key, () => run({reset: true}), {immediate})
  else if (immediate) run()
  const unsubscribe = subscribe(tags, refresh)
  const timer = poll > 0 ? setInterval(() => {
    const hidden = typeof document !== 'undefined' && document.hidden
    if (alive && !inFlight && !hidden && data.value !== null) run()
  }, poll) : null
  if (getCurrentScope()) onScopeDispose(() => { alive = false; unsubscribe(); if (timer) clearInterval(timer) })

  const status = computed(() => data.value !== null ? 'ready' : error.value ? 'error' : 'loading')
  return {data, error, loading, refreshing, status, refresh}
}

export function useMutation(action) {
  const pending = shallowRef(false), error = shallowRef(null)
  let alive = true
  if (getCurrentScope()) onScopeDispose(() => { alive = false })
  async function run(...args) {
    if (pending.value) return undefined
    pending.value = true
    error.value = null
    try {
      return await action(...args)
    } catch (cause) {
      if (alive) error.value = cause
      throw cause
    } finally {
      if (alive) pending.value = false
    }
  }
  return {run, pending, error}
}
