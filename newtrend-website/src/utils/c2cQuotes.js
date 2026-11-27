// Public quote snapshot (same seed as the admin C2C mock). Local renewal does not represent a live price feed.
// Real fiat (user decision, 2026-11-27): each quote is coin + fiat; price and order amount are in that fiat, paid or
// received off-platform. An explicit exception to the site-wide USDT denomination; balances stay in coins/USDT.
export const C2C_FIATS=['USD','EUR','GBP','HKD','SGD','JPY','AUD','CNY']
const BANK_IN='Bank transfer only. Reference your order id in the transfer memo.'
const BANK_OUT='Platform pays out to your bank account after review.'
const quote=(symbol,fiat,price,min,max,ttl,note)=>({id:`${symbol}-${fiat}`,symbol,fiat,price,min,max,ttl,...(note?{note}:{})})
export const c2cQuotes = [
 quote('USDT','USD',1.0012,100,1000000,720,BANK_IN),
 quote('USDT','EUR',0.9235,100,500000,720,BANK_IN),
 quote('BTC','USD',59125.34,0.01,50,60),
 quote('ETH','USD',1656.63,0.1,1000,60),
 quote('USDC','USD',1.0008,100,1000000,60),
 quote('SOL','USD',68.18,1,5000,60),
]
export const formatQuote = value => new Intl.NumberFormat('en-US',{maximumFractionDigits:8}).format(value)
export function quoteAmount(quote, input, mode='asset') {
 const value=Number(input)
 const quantity=mode==='fiat'?value/quote.price:value
 const total=mode==='fiat'?value:value*quote.price
 const params={asset:quote.symbol,min:formatQuote(quote.min),max:formatQuote(quote.max)}
 const error=!Number.isFinite(value)||value<=0?'c2c.order.amountRequired':quantity<quote.min?'c2c.order.amountTooSmall':quantity>quote.max?'c2c.order.amountTooLarge':''
 return {quantity,total,error:error?{key:error,params}:null}
}
// Sell side: the platform buys USDT for USD or EUR.
export const c2cSellQuotes = [
 quote('USDT','USD',0.9965,100,1000000,720,BANK_OUT),
 quote('USDT','EUR',0.9180,100,500000,720,BANK_OUT),
]
