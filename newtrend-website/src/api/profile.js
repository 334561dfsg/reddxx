// Personal-centre API bound to one in-memory mock server (resets on reload). See profileService.js.
import {createProfileApi} from './profileService.js'

export {DEMO_TOTP, ACCOUNT_TYPES, CHANGE_TYPES, LEDGER_CURRENCIES, NOTIFICATION_CATEGORIES} from './profileService.js'
export const {getAuthenticator, createAuthenticatorSecret, bindAuthenticator, unbindAuthenticator, listSessions, endSession, listAccountChanges, listNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead, getInviteSummary, getPreferences, updatePreferences} = createProfileApi()

/** Locale key for a failed profile call: coded errors keep their key, network/unknown use the generic one. */
export const profileErrorKey = cause => String(cause?.code || '').includes('.') ? cause.code : 'profile.center.loadFailed'
