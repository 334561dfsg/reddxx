// Price-axis label precision for the candlestick chart: enough decimals that two labels one grid step apart differ
// (one more than the step's leading digit), none for steps of 1 or more, at most 8 like the price formatter.
export function axisDecimals(step) {
  if (!(step > 0) || step >= 1) return 0
  return Math.min(8, Math.ceil(-Math.log10(step)) + 1)
}
