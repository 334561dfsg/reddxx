// Wallet/assets API used by pages: the service bound to the site's valuation (account values and price snapshot).
// See ./walletService.js for the endpoint each function stands in for.
import {accountValues} from '../server/accountValue.js'
import {priceOf} from '../mock/prices.js'
import {createWalletApi} from './walletService.js'
import {fundPasswordStore} from './fundPassword.js'
import {errorKey} from './transport.js'

export const {getAssetsOverview, listWalletRecords, transferFunds, checkWithdrawal, requestWithdrawal, submitDepositVoucher, claimDemoFunds, spendFunds, listFlashAssets, quoteFlashExchange, flashExchange} = createWalletApi({accountValues, priceOf, fundPassword: fundPasswordStore})

/** Locale key for a wallet rejection (validation codes are keys already; transport failures are generic). */
export const walletErrorKey = error => errorKey(error)
