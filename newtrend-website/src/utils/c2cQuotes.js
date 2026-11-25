// Public quote snapshot. Local renewal does not represent a live price feed.
export const c2cQuotes = [
 {symbol:'ETH',price:1656.6323,min:1,max:1000,ttl:60},
 {symbol:'USDC',price:1.0110605,min:1000,max:1e9,ttl:60},
 {symbol:'BTC',price:59125.3394,min:.1,max:1000,ttl:60},
 {symbol:'USDT',price:1.01,min:3000,max:1e8,ttl:720,note:'Bank transfer only. Reference your order id in the transfer memo.'},
 {symbol:'SOL',price:68.175,min:100,max:5000,ttl:60},
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
