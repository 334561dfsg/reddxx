// One table per overlay type (review 2026-11-27): everything Overlay.vue needs to know about a type besides its body
// component lives here, instead of being spread over class lists, a focus chain, a footer exclusion list, a primary
// action map and a picker list. Adding an overlay type = one entry here + one body branch in Overlay.vue.
//
// classes        extra classes on the <dialog> (shape and size; see Overlay.vue styles and the domain sheets)
// initialFocus   selector focused after opening (defaults: [data-cancel] for confirmations asking it, else the title)
// backdropClose  pure pickers close on a backdrop tap (user decision 2026-11-27); everything else ignores it
// footer         false hides the shared footer (the body brings its own actions)
// primary        footer submit button bound to a form in the body: {form, label, requiresValid, labelFromFlow, confirm}
const SHEET = ['earn-subscribe-dialog', 'transfer-dialog']
export const overlayTypes = {
  'option-sheet': {classes: ['language-sheet', 'option-sheet-dialog'], backdropClose: true, footer: false},
  'market-picker': {classes: ['market-drawer'], backdropClose: true, footer: false},
  language: {classes: [...SHEET, 'language-sheet'], backdropClose: true, footer: false},
  menu: {classes: ['drawer'], footer: false},
  support: {classes: ['support-drawer'], footer: false},
  'delivery-order': {classes: ['delivery-order-dialog'], footer: false},
  'strategy-detail': {classes: ['strategy-detail-drawer']},
  'quant-fund-order': {classes: ['strategy-detail-drawer'], footer: false},
  'strategy-subscribe': {classes: ['strategy-subscribe-dialog'], initialFocus: '[data-strategy-initial-focus]', primary: {form: 'strategy-subscribe-form', label: 'aiQuant.create.submit'}},
  'quant-fund-subscribe': {classes: ['earn-subscribe-dialog'], initialFocus: '[data-fund-initial-focus]', primary: {form: 'quant-fund-subscribe-form', label: 'aiQuant.quantFund.subscribe.submit'}},
  'earn-subscribe': {classes: ['earn-subscribe-dialog'], initialFocus: '[data-earn-initial-focus]', primary: {form: 'earn-subscribe-form', label: 'earn.subscribe.submit', requiresValid: true}},
  'earn-redeem': {classes: ['earn-subscribe-dialog'], primary: {form: 'earn-redeem-form', label: 'earn.redeem.submit', requiresValid: true, labelFromFlow: true}},
  transfer: {classes: SHEET, footer: false},
  'flash-exchange': {classes: SHEET, footer: false},
  'change-password': {classes: SHEET, footer: false},
  devices: {classes: SHEET, footer: false},
  authenticator: {classes: SHEET, footer: false},
  'fund-password': {classes: SHEET, footer: false},
  'fund-password-verify': {classes: SHEET, initialFocus: '[data-prompt-initial-focus]', footer: false},
  'account-confirm': {primary: {form: 'account-action', confirm: true}},
  'c2c-agreement': {primary: {form: 'account-action', confirm: true}},
  donate: {primary: {form: 'action-form', amountForm: true}},
}
export const overlayConfig = type => overlayTypes[type] || {}
