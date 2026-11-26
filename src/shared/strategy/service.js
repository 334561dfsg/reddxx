import {seedStrategy} from './seed.js'
import {advance, transact} from './domain.js'

// One in-memory instance per dev/preview server (resets on restart). No disk or browser persistence.
export function createStrategyService(now = () => Date.now()) {
  let state = seedStrategy(now())
  return {
    read() { advance(state, now()); return structuredClone(state) },
    command(action, args) { state = transact(state, action, args, now()); return this.read() },
  }
}
