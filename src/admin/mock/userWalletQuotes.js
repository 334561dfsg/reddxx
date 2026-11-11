// Demo-only USDT quotes. Seed prices are treated as USDT at a mock USD/USDT
// rate of 1; these values are never a live market feed.
export function valueMockWalletHoldings(holdings, tick = 0) {
  return holdings.map((row, index) => {
    const stablecoin = ['USDT', 'USDC', 'DAI'].includes(row.coin)
    const change = tick === 0 || stablecoin ? 0 : Math.sin(tick * 0.7 + index) * 0.002
    const latestPrice = row.latestPrice * (1 + change)
    return {
      ...row,
      latestPrice,
      valueUsdt: (Number(row.quantity) + Number(row.frozen)) * latestPrice
    }
  })
}
