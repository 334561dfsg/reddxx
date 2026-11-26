import {clock} from './clock.js'
// Readable, collision-free mock ids (prefix-time-sequence) without randomness, so flows stay reproducible.
let sequence = 0
export const nextId = prefix => `${prefix}-${clock.now()}-${++sequence}`
export function resetIds() { sequence = 0 }
