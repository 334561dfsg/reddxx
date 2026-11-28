// Sign-in methods shared by the login/register page, the embedded login dialog and password reset.
import {readLoginSettings} from './siteLoginConfig.js'

/** Tab label key → auth API method. */
export const AUTH_METHODS = {'common.email': 'email', 'auth.phone': 'phone', 'auth.username': 'username'}

/** Tab label keys in order; the admin 用户名登录 switch (off) hides the username tab. */
export function authTabs(settings = readLoginSettings()) {
  return Object.keys(AUTH_METHODS).filter(key => key !== 'auth.username' || settings.usernameLoginEnabled)
}
