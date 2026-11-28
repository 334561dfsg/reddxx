// Auth API (password login and reset) bound to one in-memory mock server (resets on reload). See authService.js.
import {createAuthApi} from './authService.js'

export {DEMO_PASSWORD, DEMO_RESET_CODE, MIN_PASSWORD_LENGTH} from './authService.js'
export const {registerAccount, loginWithPassword, requestResetCode, resetPassword} = createAuthApi()
