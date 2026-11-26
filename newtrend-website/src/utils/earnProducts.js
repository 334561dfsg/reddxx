// Public product snapshot verified through the reference UI on 2026-11-25.
// APY is a displayed source value, not recalculated from the rounded daily rate.
export const earnTerms = {
 usdt180:{apy:9.99,max:500000,perUser:100000,subscribed:1000,risk:'The 6-Month Fixed-Term Earn offers an APY of up to 10%. If redeemed early, rewards will be calculated at the Flexible Earn APY. Principal risk details are subject to the product whitepaper.'},
 usdt90:{apy:8.49,max:1000000,perUser:200000,subscribed:100000,hot:true,risk:'USDT 90-Day Fixed-Term Earn does not allow early redemption. Rewards are automatically settled upon maturity, and the APY remains fixed throughout the lock-up period.'},
 usdt30:{apy:5.99,max:500000,perUser:100000,subscribed:10000,risk:'USDT 30-Day Fixed-Term Earn does not allow early redemption. Rewards are automatically settled upon maturity, and the APY remains fixed throughout the lock-up period.'},
 btc60:{apy:4.99,max:100,perUser:null,subscribed:34.4,risk:'BTC 60-Day Fixed-Term Earn does not allow early redemption. Upon maturity, both principal and rewards will be automatically credited to the Spot Account.'},
 usdt:{apy:4.49,max:1000000,perUser:200000,subscribed:352100,hot:true,risk:'APY is variable and calculated on an annualized basis. Rewards accrue daily and are paid out daily. Returns are not guaranteed on the principal. Redemptions are credited on a T+0 basis. USDT Flexible Earn is designed for short-term idle USDT holdings.'},
 usdc:{apy:4.19,max:500000,perUser:100000,subscribed:1000,risk:'The APY for USDC Flexible Earn may fluctuate based on market liquidity. Please refer to the product whitepaper for principal risk details. Redemptions are credited on a T+0 basis, with no lock-up period.'},
 eth:{apy:2.19,max:200,perUser:50,subscribed:50,risk:'ETH Flexible Earn is designed for long-term ETH holders. APY is variable, and principal is denominated in ETH. Users should bear the risks associated with digital asset price fluctuations.'},
 btc:{apy:1.79,max:20,perUser:5,subscribed:.1,hot:true,risk:'BTC Flexible Earn offers a relatively low APY with optimal liquidity, making it suitable for long-term BTC holders seeking additional passive income. Principal is denominated in BTC and remains exposed to crypto asset price fluctuations.'},
}
export const remainingAmount = product => Number(String(product.remaining).replaceAll(',', ''))
export const quotaPercent = product => Number((product.subscribed / (remainingAmount(product) + product.subscribed) * 100).toFixed(1))
/** `committed` = this user's pending orders + live holdings in the product; the per-user quota is cumulative. */
export function subscriptionError(product, raw, balance, committed = 0) {
 const amount=Number(raw)
 if (!Number.isFinite(amount)||amount<=0) return {code:'invalidAmount'}
 if (amount<product.min) return {code:'minAmount',amount:product.min}
 if (amount>product.max) return {code:'maxAmount',amount:product.max}
 if (amount>remainingAmount(product)) return {code:'availableQuota',amount:remainingAmount(product)}
 if (product.perUser!=null&&amount+committed>product.perUser) return {code:'perUserQuota',amount:Math.max(0,product.perUser-committed)}
 if (amount>balance) return {code:'insufficientBalance',amount:balance}
 return null
}
export function maximumSubscription(product,balance,committed=0) {
 return Math.max(0,Math.min(balance,product.max,product.perUser==null?Infinity:product.perUser-committed,remainingAmount(product)))
}
