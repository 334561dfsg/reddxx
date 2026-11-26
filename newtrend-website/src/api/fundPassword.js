// The site's single fund-password store, shared by api/profile.js and api/wallet.js.
import {createFundPasswordStore} from './fundPasswordStore.js'

export const fundPasswordStore = createFundPasswordStore()
