import {seedC2C} from './seed.js'
import {transact} from './domain.js'

// One in-memory instance per page (resets on reload). No disk or browser persistence.
export function createC2CService(now = () => Date.now()) {
  let state = seedC2C(now())
  return {
    read() { return structuredClone(state) },
    command(action, args) { state = transact(state, action, args, now()); return this.read() },
  }
}
