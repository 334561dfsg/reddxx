import {h} from 'vue'
import {coinImage} from '../../utils/coinAssets'
import {CHAIN_COINS} from '../../mock/chains.js'

// Ant Select options for the deposit/withdraw coin and network pickers (classes styled by deposit-fidelity.css).
const coinMark = symbol => coinImage(symbol, 'logo')
  ? h('img', {class: 'deposit-coin', src: coinImage(symbol, 'logo'), alt: ''})
  : h('span', {class: 'deposit-coin deposit-coin-text', 'aria-hidden': 'true'}, symbol.slice(0, 2))

export const coinOptions = () => CHAIN_COINS.map(({symbol}) => ({value: symbol, label: symbol,
  display: h('span', {class: 'deposit-option'}, [coinMark(symbol), h('span', {class: 'deposit-option-text'}, [h('strong', symbol), h('small', symbol)])])}))

/** `dot`: deposit shows a status dot before the code; withdraw shows the bare code + name, as on the reference. */
export const networkOptions = (networks, {dot = true} = {}) => networks.map(code => ({value: code, label: code,
  display: h('span', {class: 'deposit-option deposit-network'}, [dot ? h('span', {class: 'deposit-dot', 'aria-hidden': 'true'}) : null, h('strong', code), h('small', code)])}))
