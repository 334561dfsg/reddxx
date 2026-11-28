import {seedCharity} from './seed.js'
import {transact} from './domain.js'

// One in-memory instance per page (resets on reload). No disk or browser persistence, no sync with the public site.
export function createCharityService(now = () => Date.now()) {
  let state = seedCharity(now())
  return {
    read() { return structuredClone(state) },
    command(action, args) { state = transact(state, action, args, now()); return this.read() },
  }
}

let shared = null
export const charityService = () => (shared ||= createCharityService())
