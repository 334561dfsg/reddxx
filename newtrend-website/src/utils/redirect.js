// Mirrors the reference login redirect guard: only same-site absolute paths are allowed.
// eslint-disable-next-line no-control-regex -- rejecting control characters is the point of this check
const CONTROL = /[\u0000-\u001f\u007f]/

export function safeRedirect(value) {
  const target = Array.isArray(value) ? value[0] : value
  if (typeof target !== 'string' || !target.startsWith('/') || target.startsWith('//') || target.includes('\\') || CONTROL.test(target)) return null
  return target
}

/** Login page that returns to `target` (a router path) after login or registration. */
export const loginPath = target => ({path: '/login', query: {redirect: target}})
