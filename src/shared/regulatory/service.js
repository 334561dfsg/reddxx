import {seedRegulatory} from './seed.js'
import {transact} from './domain.js'

// One in-memory instance per page (resets on reload). No disk or browser persistence.
export function createRegulatoryService(now = () => Date.now()) {
  let state = seedRegulatory(now())
  return {
    read() { return structuredClone(state) },
    command(action, args) { state = transact(state, action, args, now()); return this.read() },
  }
}

let shared = null
/** The page-wide instance read by the admin client. */
export const regulatoryService = () => (shared ||= createRegulatoryService())
