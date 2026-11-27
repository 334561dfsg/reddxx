import {session} from '../session.js'
import {isDemo} from './accountMode.js'
// The demo account (模擬) has no C2C and no lending (user decision, 2026-11-27): their entries are hidden in navigation
// and on the Finance landing, and their routes redirect to the Finance home while demo is active.
const DEMO_HIDDEN = /^\/(c2c|earn\/loan)(\/|$)/
export const isDemoAccount = () => isDemo(session.mode)
export const demoHiddenPath = path => DEMO_HIDDEN.test(String(path || '').split('?')[0])
export const availableInMode = path => !(isDemoAccount() && demoHiddenPath(path))
