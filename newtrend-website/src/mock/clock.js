// Single mock clock. Seeds are placed relative to `bootAt` (page load), and every lifecycle check uses
// `clock.now()`, so seeded dates never go stale on a later day and tests can pin time with `setClock`.
export const clock = { now: () => Date.now() }
export let bootAt = clock.now()
export const DAY = 86400000
export const HOUR = 3600000

/** Test hook: freeze or replace the clock (and the boot anchor). */
export function setClock(now) {
  clock.now = typeof now === 'function' ? now : () => now
  bootAt = clock.now()
}
