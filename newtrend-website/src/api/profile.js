// Personal-centre API bound to one in-memory mock server (resets on reload). See profileService.js.
import {createProfileApi} from './profileService.js'
import {fundPasswordStore} from './fundPassword.js'
import {errorKey} from './transport.js'

export {DEMO_TOTP, ACCOUNT_TYPES, CHANGE_TYPES, LEDGER_CURRENCIES, NOTIFICATION_CATEGORIES} from './profileService.js'
export const {getFundPassword, saveFundPassword, getAuthenticator, createAuthenticatorSecret, bindAuthenticator, unbindAuthenticator, listSessions, endSession, listAccountChanges, listNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead, getInviteSummary, getPreferences, updatePreferences} = createProfileApi({fundPassword: fundPasswordStore})

/** Locale key for a failed profile call: coded errors keep their key, network/unknown use the generic one. */
export const profileErrorKey = cause => errorKey(cause, {fallback: 'profile.center.loadFailed'})
