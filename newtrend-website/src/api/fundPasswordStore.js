// Server-side fund password state for the mock (資金密碼): one store is shared by the profile service (set / change)
// and the wallet service (checked on withdrawal), as one backend would. In memory only; resets on reload.
// The value never leaves the store: callers can only ask whether it is set or whether a guess matches.
export const FUND_PASSWORD_PATTERN = /^\d{6}$/

export function createFundPasswordStore() {
  let value = ''
  return {
    isSet: () => Boolean(value),
    verify: guess => Boolean(value) && String(guess) === value,
    /** Sets or replaces the password; the caller has already validated format and the old password. */
    write: next => { value = String(next) },
  }
}
