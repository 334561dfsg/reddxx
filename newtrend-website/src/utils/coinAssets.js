import {markets,asset} from '../data'
// One coin-icon resolver. Two published styles exist on the reference: market logos (lists, trading, Earn)
// and flat SVG logos (C2C, deposit). `set` picks the style; anything unknown falls back to the other set,
// then to a two-letter badge (null here).
const LOGOS={
 USDT:'/NewQuantCapital/assets/usdt.svg',
 USDC:'/NewQuantCapital/assets/c2c/usdc.svg',
 ETH:'/NewQuantCapital/assets/c2c/eth.svg',
 BTC:'/NewQuantCapital/assets/c2c/btc.svg',
 SOL:'/NewQuantCapital/assets/c2c/sol.svg',
}
export function coinImage(symbol,set='market'){
 if(set==='logo'&&LOGOS[symbol])return LOGOS[symbol]
 const market=markets.find(m=>m.symbol===symbol)
 if(market?.image)return asset(market.image)
 return LOGOS[symbol]||null
}
