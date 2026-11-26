// Wallet/assets API used by pages: the service bound to the site's valuation (account values and price snapshot).
// See ./walletService.js for the endpoint each function stands in for.
import {accountValues} from '../accountValue.js'
import {priceOf} from '../mock/prices.js'
import {createWalletApi} from './walletService.js'
import {fundPasswordStore} from './fundPassword.js'

export const {getAssetsOverview, listWalletRecords, transferFunds, checkWithdrawal, requestWithdrawal, submitDepositVoucher, spendFunds} = createWalletApi({accountValues, priceOf, fundPassword: fundPasswordStore})

/** Locale key for a wallet rejection (validation codes are keys already; transport failures are generic). */
export const walletErrorKey = error => /^[a-z]+\.[\w.]+$/i.test(String(error?.code || '')) && error.code !== 'network' ? error.code : 'common.requestFailed'
