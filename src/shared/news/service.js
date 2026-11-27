import {seedNews} from './seed.js'
import {transact} from './domain.js'

// One in-memory instance per page (resets on reload). No disk or browser persistence.
export function createNewsService(now = () => Date.now()) {
  let state = seedNews(now())
  return {
    read() { return structuredClone(state) },
    command(action, args) { state = transact(state, action, args, now()); return this.read() },
  }
}

let shared = null
/** The page-wide instance: the admin client and the public news API read the same seeded state. */
export const newsService = () => (shared ||= createNewsService())
