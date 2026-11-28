// Password-reset API bound to one in-memory mock server (resets on reload). See passwordResetService.js.
import {createPasswordResetApi} from './passwordResetService.js'

export {DEMO_RESET_CODE, MIN_PASSWORD_LENGTH} from './passwordResetService.js'
export const {requestResetCode, resetPassword} = createPasswordResetApi()
