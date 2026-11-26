import {reactive} from 'vue'
import {createQuantFundCatalog,createFundAccount} from './utils/quantFund'

// Local mock state only: resets on reload and never contacts the reference site or a backend.
export const quantFunds=reactive(createQuantFundCatalog())
export const quantFundAccount=reactive(createFundAccount())
export const fundMode=mode=>mode==='common.demo.demo'?'demo':'real'
export const findQuantFund=id=>quantFunds.find(product=>product.id===id)||null
