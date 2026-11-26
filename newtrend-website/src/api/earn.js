// Earn API used by pages: the service bound to the site catalogue, whose product `name` getter follows the
// current language. See ./earnService.js for the endpoint each function stands in for.
import {products} from '../data.js'
import {createEarnApi} from './earnService.js'

export const {listEarnProducts, getEarnProduct, getEarnPortfolio, getEarnHolding, getEarnSubscriptionContext, subscribeEarn, redeemEarn} = createEarnApi(products)
